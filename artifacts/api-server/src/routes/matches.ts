import { Router } from 'express';
import { logger } from '../lib/logger';
import { db, pool } from '@workspace/db';
import { fallbackStore, getNextRoundName, getBracketSlotCount } from '../lib/fallback-store';
import sse from '../lib/sse';

const router = Router();

const getNextRoundLevel = (currentLevel: number) => currentLevel + 1;

// GET /api/matches?eventId=
router.get('/', async (req, res) => {
  try {
    if (!pool || !db) {
      const { eventId } = req.query as Record<string, string>;
      const rows = await fallbackStore.getMatches(eventId);
      return res.json(rows);
    }
    const { eventId } = req.query as Record<string, string>;
    let q = 'SELECT * FROM matches';
    const params: any[] = [];
    if (eventId) { params.push(eventId); q += ` WHERE event_id = $${params.length}`; }
    const result = await pool.query(q, params);
    const rows = (result.rows || []).map((r: any) => {
      if (r && typeof r.meta === 'string') {
        try { r.meta = JSON.parse(r.meta); } catch {}
      }
      return r;
    });
    return res.json(rows);
  } catch (err) {
    logger.error({ err }, 'Error fetching matches');
    return res.status(500).json({ error: 'internal' });
  }
});

// PUT /api/matches/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;

    if (!pool || !db) {
      const updated = await fallbackStore.updateMatch(id, body as Record<string, unknown>);
      if (!updated) return res.status(404).json({ error: 'not_found' });
      return res.json({ ok: true, updated });
    }

    // fetch existing row via pool
    const existingRes = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    const existingRow = existingRes.rows[0];
    if (!existingRow) return res.status(404).json({ error: 'not_found' });

    const winnerId = body.winner_id !== undefined ? body.winner_id : existingRow.winner_id;
    const status = body.status !== undefined ? body.status : existingRow.status;
    let existingMeta = existingRow.meta;
    if (typeof existingMeta === 'string') {
      try { existingMeta = JSON.parse(existingMeta); } catch { existingMeta = {}; }
    }
    existingMeta = typeof existingMeta === 'object' && existingMeta !== null ? existingMeta : {};

    const updates: string[] = [];
    const params: any[] = [];
    const pushParam = (val: any) => { params.push(val); return `$${params.length}`; };

    if (body.winner_id !== undefined) updates.push(`winner_id = ${pushParam(body.winner_id)}`);
    if (body.player1_id !== undefined) updates.push(`player1_id = ${pushParam(body.player1_id)}`);
    if (body.player2_id !== undefined) updates.push(`player2_id = ${pushParam(body.player2_id)}`);
    if (body.status !== undefined) updates.push(`status = ${pushParam(body.status)}`);
    if (body.scheduled_date !== undefined) updates.push(`scheduled_date = ${pushParam(body.scheduled_date)}`);

    let newMeta = { ...existingMeta };
    if (body.meta && typeof body.meta === 'object') newMeta = { ...newMeta, ...body.meta };
    if (body.score !== undefined) newMeta.score = body.score;
    if (body.scheduled_time !== undefined) newMeta.scheduled_time = body.scheduled_time;
    if (body.venue !== undefined) newMeta.venue = body.venue;

    if (winnerId && String(status) === 'Completed') {
      try {
        const regRes = await pool.query(
          'SELECT * FROM registrations WHERE event_id = $1 AND (employee_id = $2 OR provided_employee_id = $2 OR id::text = $2) LIMIT 1',
          [existingRow.event_id, winnerId]
        );
        const winnerReg = regRes.rows[0];
        if (winnerReg) {
          newMeta = {
            ...newMeta,
            winner_name: winnerReg.employee_name,
            winner_department: winnerReg.department || undefined,
            winner_location: winnerReg.location,
          };
        }
      } catch {
        // ignore registration lookup failures
      }
    }

    updates.push(`meta = ${pushParam(JSON.stringify(newMeta))}`);

    const sql = `UPDATE matches SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);
    const upd = await pool.query(sql, params);
    const updatedMatch = upd.rows[0];

    if (winnerId && String(status) === 'Completed') {
      const matchFormat = existingMeta?.format ?? newMeta.format ?? 'Single Elimination';

      if (matchFormat === 'Round Robin') {
        // In Round Robin, check if all matches are completed to declare the League Champion
        try {
          const allMatchesRes = await pool.query('SELECT * FROM matches WHERE event_id = $1', [existingRow.event_id]);
          const allMatches = allMatchesRes.rows;
          const remainingPending = allMatches.filter(m => m.id !== id && m.status !== 'Completed');

          if (remainingPending.length === 0) {
            // All matches finished! Compute standings
            const winsMap: Record<string, number> = {};
            for (const m of allMatches) {
              const w = m.id === id ? winnerId : m.winner_id;
              if (w) winsMap[w] = (winsMap[w] || 0) + 1;
            }

            let topPlayer = winnerId;
            let maxWins = -1;
            for (const [pId, wins] of Object.entries(winsMap)) {
              if (wins > maxWins) {
                maxWins = wins;
                topPlayer = pId;
              }
            }

            const championRegRes = await pool.query(
              'SELECT employee_name FROM registrations WHERE event_id = $1 AND (employee_id = $2 OR provided_employee_id = $2 OR id::text = $2) LIMIT 1',
              [existingRow.event_id, topPlayer]
            );
            const championName = championRegRes.rows[0]?.employee_name || topPlayer;

            const evRes = await pool.query('SELECT * FROM events WHERE id = $1', [existingRow.event_id]);
            const ev = evRes.rows[0];
            if (ev && ev.tournament_id) {
              await pool.query(`UPDATE tournaments SET status = 'Completed' WHERE id = $1`, [ev.tournament_id]);
              sse.emitEvent(existingRow.event_id, 'tournament:completed', {
                eventId: existingRow.event_id,
                tournamentId: ev.tournament_id,
                championId: topPlayer,
                championName,
                format: 'Round Robin'
              });
            }
          }
        } catch (e) {
          logger.error({ e }, 'Error calculating Round Robin champion');
        }
      } else {
        // Single Elimination / Knockout Tree Propagation
        const location = existingMeta?.location ?? newMeta.location;
        const bracketIndex = Number(existingMeta?.bracket_index ?? newMeta.bracket_index ?? 0);
        const roundLevel = Number(existingMeta?.round_level ?? newMeta.round_level ?? 0);
        const nextRoundLevel = getNextRoundLevel(roundLevel);

        // Query all event matches to find the target next round match reliably
        const allEventMatchesRes = await pool.query('SELECT * FROM matches WHERE event_id = $1', [existingRow.event_id]);
        const nextRoundMatches = allEventMatchesRes.rows.filter(m => {
          let mMeta = m.meta;
          if (typeof mMeta === 'string') {
            try { mMeta = JSON.parse(mMeta); } catch { mMeta = {}; }
          }
          const mRoundLevel = Number(mMeta?.round_level ?? 0);
          const mLocation = mMeta?.location;
          const matchesLoc = !location || !mLocation || mLocation === location;
          return mRoundLevel === nextRoundLevel && matchesLoc;
        }).sort((a, b) => {
          const aIndex = Number((typeof a.meta === 'object' ? a.meta : JSON.parse(a.meta || '{}'))?.bracket_index ?? 0);
          const bIndex = Number((typeof b.meta === 'object' ? b.meta : JSON.parse(b.meta || '{}'))?.bracket_index ?? 0);
          return aIndex - bIndex;
        });

        const targetBracketIndex = Math.floor(bracketIndex / 2);
        const targetMatch = nextRoundMatches.find(m => {
          const mMeta = typeof m.meta === 'object' ? m.meta : JSON.parse(m.meta || '{}');
          return Number(mMeta?.bracket_index ?? 0) === targetBracketIndex;
        }) || nextRoundMatches[targetBracketIndex];

        if (targetMatch) {
          const slot = bracketIndex % 2 === 0 ? 'player1_id' : 'player2_id';
          await pool.query(`UPDATE matches SET ${slot} = $1 WHERE id = $2`, [winnerId, targetMatch.id]);
        } else {
          // This was the final match of the bracket!
          try {
            const loserId = updatedMatch.player1_id === winnerId ? updatedMatch.player2_id : updatedMatch.player1_id;
            let runnerUpName = null;
            if (loserId) {
              const loserRes = await pool.query(
                'SELECT employee_name FROM registrations WHERE event_id = $1 AND (employee_id = $2 OR provided_employee_id = $2 OR id::text = $2) LIMIT 1',
                [existingRow.event_id, loserId]
              );
              runnerUpName = loserRes.rows[0]?.employee_name || loserId;
            }

            const championMeta = {
              ...newMeta,
              champion_name: newMeta.winner_name || winnerId,
              champion_employee_id: winnerId,
              runner_up_name: runnerUpName,
              runner_up_employee_id: loserId,
            };
            await pool.query('UPDATE matches SET meta = $1 WHERE id = $2', [JSON.stringify(championMeta), id]);

            const evRes = await pool.query('SELECT * FROM events WHERE id = $1', [existingRow.event_id]);
            const ev = evRes.rows[0];
            if (ev && ev.tournament_id) {
              await pool.query(`UPDATE tournaments SET status = 'Completed' WHERE id = $1`, [ev.tournament_id]);
              sse.emitEvent(existingRow.event_id, 'tournament:completed', {
                eventId: existingRow.event_id,
                tournamentId: ev.tournament_id,
                championId: winnerId,
                championName: championMeta.champion_name,
                runnerUpId: loserId,
                runnerUpName
              });
            }
          } catch (e) {
            logger.error({ e }, 'Error marking champion');
          }
        }
      }

      try { sse.emitEvent(existingRow.event_id, 'match:update', { matchId: updatedMatch.id, eventId: existingRow.event_id }); } catch (e) {}
    }

    const finalRes = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    const finalRow = finalRes.rows[0];
    if (finalRow && typeof finalRow.meta === 'string') {
      try { finalRow.meta = JSON.parse(finalRow.meta); } catch {}
    }
    return res.json({ ok: true, updated: finalRow });
  } catch (err) {
    logger.error({ err }, 'Error updating match');
    return res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/matches?eventId=&completedOnly=true
router.delete('/', async (req, res) => {
  try {
    if (!pool || !db) {
      const { eventId, completedOnly } = req.query as Record<string, string>;
      const rowCount = await fallbackStore.deleteMatches(eventId, completedOnly === 'true');
      return res.json({ ok: true, rowCount });
    }
    const { eventId, completedOnly } = req.query as Record<string, string>;
    let q = 'DELETE FROM matches';
    const params: any[] = [];
    const clauses: string[] = [];
    if (eventId) { params.push(eventId); clauses.push(`event_id = $${params.length}`); }
    if (completedOnly === 'true') { clauses.push(`status = 'Completed'`); }
    if (clauses.length) q += ' WHERE ' + clauses.join(' AND ');
    const result = await pool.query(q, params);
    return res.json({ ok: true, rowCount: result.rowCount });
  } catch (err) {
    logger.error({ err }, 'Error deleting matches');
    return res.status(500).json({ error: 'internal' });
  }
});

export default router;
