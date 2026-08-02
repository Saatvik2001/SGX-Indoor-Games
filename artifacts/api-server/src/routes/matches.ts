import { Router } from 'express';
import { logger } from '../lib/logger';
import { db, pool } from '@workspace/db';
import { fallbackStore } from '../lib/fallback-store';
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
    return res.json(result.rows || []);
  } catch (err) {
    logger.error({ err }, 'Error fetching matches');
    return res.status(500).json({ error: 'internal' });
  }
});

// PUT /api/matches/:id
router.put('/:id', async (req, res) => {
  try {
    if (!pool || !db) {
      const id = Number(req.params.id);
      const updated = await fallbackStore.updateMatch(id, req.body as Record<string, unknown>);
      if (!updated) return res.status(404).json({ error: 'not_found' });
      return res.json({ ok: true, updated });
    }
    const id = Number(req.params.id);
    const body = req.body as any;

    // fetch existing row via pool
    const existingRes = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    const existingRow = existingRes.rows[0];
    if (!existingRow) return res.status(404).json({ error: 'not_found' });

    const winnerId = body.winner_id !== undefined ? body.winner_id : existingRow.winner_id;
    const status = body.status !== undefined ? body.status : existingRow.status;
    const existingMeta = existingRow.meta || {};

    const updates: string[] = [];
    const params: any[] = [];
    const pushParam = (val: any) => { params.push(val); return `$${params.length}`; };

    if (body.winner_id !== undefined) updates.push(`winner_id = ${pushParam(body.winner_id)}`);
    if (body.player1_id !== undefined) updates.push(`player1_id = ${pushParam(body.player1_id)}`);
    if (body.player2_id !== undefined) updates.push(`player2_id = ${pushParam(body.player2_id)}`);
    if (body.status !== undefined) updates.push(`status = ${pushParam(body.status)}`);
    if (body.scheduled_date !== undefined) updates.push(`scheduled_date = ${pushParam(body.scheduled_date)}`);

    let newMeta = typeof existingMeta === 'object' && existingMeta !== null ? { ...existingMeta } : {};
    if (body.meta && typeof body.meta === 'object') newMeta = { ...newMeta, ...body.meta };
    if (body.score !== undefined) newMeta = { ...newMeta, score: body.score };
    if (body.scheduled_time !== undefined) newMeta = { ...newMeta, scheduled_time: body.scheduled_time };

    if (winnerId && String(status) === 'Completed') {
      try {
        const regRes = await pool.query('SELECT * FROM registrations WHERE event_id = $1 AND employee_id = $2 LIMIT 1', [existingRow.event_id, winnerId]);
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

    if (Object.keys(newMeta).length > 0) updates.push(`meta = ${pushParam(JSON.stringify(newMeta))}`);

    if (updates.length === 0) return res.json({ ok: true, updated: existingRow });

    const sql = `UPDATE matches SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);
    const upd = await pool.query(sql, params);
    const updatedMatch = upd.rows[0];

    if (winnerId && String(status) === 'Completed') {
      const location = existingMeta?.location ?? newMeta.location;
      const bracketIndex = Number(existingMeta?.bracket_index ?? newMeta.bracket_index ?? 0);
      const roundLevel = Number(existingMeta?.round_level ?? newMeta.round_level ?? 0);
      const nextRoundLevel = getNextRoundLevel(roundLevel);
      if (location && !Number.isNaN(bracketIndex) && !Number.isNaN(roundLevel)) {
        const nextMatchesRes = await pool.query(
          `SELECT * FROM matches WHERE event_id = $1 AND (meta ->> 'round_level')::int = $2 AND meta ->> 'location' = $3 ORDER BY (meta ->> 'bracket_index')::int ASC`,
          [existingRow.event_id, nextRoundLevel, location]
        );
        const nextMatch = nextMatchesRes.rows[Math.floor(bracketIndex / 2)];
        if (nextMatch) {
          const slot = bracketIndex % 2 === 0 ? 'player1_id' : 'player2_id';
          if (!nextMatch[slot] || nextMatch[slot] !== winnerId) {
            await pool.query(`UPDATE matches SET ${slot} = $1 WHERE id = $2`, [winnerId, nextMatch.id]);
          }
        }
      }
      // emit SSE update for this event
      try { sse.emitEvent(existingRow.event_id, 'match:update', { matchId: updatedMatch.id, eventId: existingRow.event_id }); } catch (e) {}
    }

    const finalRes = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
    return res.json({ ok: true, updated: finalRes.rows[0] });
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
