import { Router } from "express";
import { logger } from "../lib/logger";
import { db, pool } from "@workspace/db";
import { fallbackStore, buildBracketDraftMatches } from "../lib/fallback-store";
import { getTournamentSummary } from "../lib/fixture-engine";
import { withDatabaseFallback } from "../lib/db-fallback";
import sse from "../lib/sse";

const router = Router();

// GET /api/fixtures/summary/:eventId
router.get("/summary/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params as { eventId: string };
    if (!eventId) return res.status(400).json({ error: "eventId_required" });

    let count = 0;
    let format: 'Single Elimination' | 'Round Robin' | 'Double Elimination' = 'Single Elimination';

    if (pool) {
      const regRes = await pool.query('SELECT COUNT(DISTINCT employee_id) as count FROM registrations WHERE event_id = $1', [eventId]);
      count = Number(regRes.rows[0]?.count || 0);

      // Check format from existing matches first
      const matchRes = await pool.query('SELECT meta FROM matches WHERE event_id = $1 LIMIT 1', [eventId]);
      if (matchRes.rows.length > 0) {
        const mMeta = typeof matchRes.rows[0].meta === 'string' ? JSON.parse(matchRes.rows[0].meta || '{}') : (matchRes.rows[0].meta || {});
        if (mMeta.format) format = mMeta.format;
      } else {
        const evRes = await pool.query('SELECT meta FROM events WHERE id = $1', [eventId]);
        const evMeta = evRes.rows[0]?.meta;
        const parsedMeta = typeof evMeta === 'string' ? JSON.parse(evMeta || '{}') : (evMeta || {});
        if (parsedMeta.format) format = parsedMeta.format;
      }
    } else {
      const regs = await fallbackStore.getRegistrations(eventId);
      const unique = new Set(regs.map(r => r.employee_id));
      count = unique.size;

      const matches = await fallbackStore.getMatches(eventId);
      if (matches.length > 0 && matches[0].meta?.format) {
        format = matches[0].meta.format as any;
      }
    }

    const summary = getTournamentSummary(count, format);
    return res.json(summary);
  } catch (err) {
    logger.error({ err }, "Error fetching fixture summary");
    return res.status(500).json({ error: "internal" });
  }
});

// POST /api/fixtures/generate
router.post("/generate", async (req, res) => {
  try {
    const { eventId, perLocationPlayerIds, format: reqFormat } = req.body as {
      eventId: string;
      perLocationPlayerIds?: Record<string, string[]>;
      format?: 'Single Elimination' | 'Round Robin' | 'Double Elimination';
    };

    if (!eventId) {
      return res.status(400).json({ error: "eventId_required" });
    }

    let format = reqFormat || 'Single Elimination';

    let locationMap = perLocationPlayerIds;
    if (!locationMap || Object.keys(locationMap).length === 0) {
      locationMap = {};
      if (pool) {
        const evRes = await pool.query('SELECT type, meta FROM events WHERE id = $1', [eventId]);
        const ev = evRes.rows[0];
        const isDoubles = ev?.type === 'Doubles';
        if (!reqFormat && ev?.meta) {
          const parsedMeta = typeof ev.meta === 'string' ? JSON.parse(ev.meta || '{}') : (ev.meta || {});
          if (parsedMeta.format) format = parsedMeta.format;
        }

        const regRes = await pool.query('SELECT employee_id, partner_id, location FROM registrations WHERE event_id = $1 ORDER BY id ASC', [eventId]);
        if (isDoubles) {
          const locTeams: Record<string, Set<string>> = {};
          for (const row of regRes.rows) {
            const loc = row.location || 'All';
            if (row.partner_id) {
              locTeams[loc] = locTeams[loc] || new Set();
              const sorted = [row.employee_id, row.partner_id].sort();
              locTeams[loc].add(`TEAM:${sorted[0]}:${sorted[1]}`);
            }
          }
          for (const [loc, teams] of Object.entries(locTeams)) {
            locationMap[loc] = Array.from(teams);
          }
        } else {
          for (const row of regRes.rows) {
            const loc = row.location || 'All';
            locationMap[loc] = locationMap[loc] || [];
            locationMap[loc].push(row.employee_id);
          }
        }
      } else {
        const evs = await fallbackStore.getEvents();
        const ev = evs.find(e => e.id === eventId);
        const isDoubles = ev?.type === 'Doubles';
        const regRows = await fallbackStore.getRegistrations(eventId);

        if (isDoubles) {
          const locTeams: Record<string, Set<string>> = {};
          for (const row of regRows) {
            const loc = row.location || 'All';
            if (row.partner_id) {
              locTeams[loc] = locTeams[loc] || new Set();
              const sorted = [row.employee_id, row.partner_id].sort();
              locTeams[loc].add(`TEAM:${sorted[0]}:${sorted[1]}`);
            }
          }
          for (const [loc, teams] of Object.entries(locTeams)) {
            locationMap[loc] = Array.from(teams);
          }
        } else {
          for (const row of regRows) {
            const loc = row.location || 'All';
            locationMap[loc] = locationMap[loc] || [];
            locationMap[loc].push(row.employee_id);
          }
        }
      }
    }

    if (!pool) {
      const matches = await fallbackStore.generateFixtures(eventId, locationMap || {}, format);
      return res.status(201).json({ ok: true, matches });
    }
    const p = pool;
    logger.info({ eventId, locationMap, format }, "Generate fixtures request");

    const generated = await withDatabaseFallback(async () => {
      await p.query('DELETE FROM matches WHERE event_id = $1', [eventId]);

      // Update event meta to record chosen format
      try {
        const evRes = await p.query('SELECT meta FROM events WHERE id = $1', [eventId]);
        let meta = evRes.rows[0]?.meta || {};
        if (typeof meta === 'string') meta = JSON.parse(meta);
        meta = { ...meta, format };
        await p.query('UPDATE events SET meta = $1 WHERE id = $2', [JSON.stringify(meta), eventId]);
      } catch {}

      const generatedMatches: any[] = [];
      for (const [location, players] of Object.entries(locationMap || {})) {
        const locationMatches = buildBracketDraftMatches(eventId, location, players, format);
        for (const match of locationMatches) {
          const result = await p.query(
            'INSERT INTO matches(event_id, round, player1_id, player2_id, winner_id, status, scheduled_date, meta) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [eventId, match.round, match.player1_id, match.player2_id, match.winner_id, match.status, null, JSON.stringify(match.meta)]
          );
          generatedMatches.push(result.rows[0]);
        }
      }

      return generatedMatches;
    }, async () => {
      const matches = await fallbackStore.generateFixtures(eventId, locationMap || {}, format);
      return matches;
    });

    try { sse.emitEvent(eventId, 'fixtures:generate', { eventId, count: generated.length, format }); } catch (e) {}
    return res.status(201).json({ ok: true, matches: generated });
  } catch (err) {
    logger.error({ err }, "Error generating fixtures");
    return res.status(500).json({ error: "internal" });
  }
});

// SSE subscribe to event updates
router.get('/stream/:eventId', (req, res) => {
  const { eventId } = req.params as { eventId: string };
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.write('\n');
  const clientId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  const client = { id: clientId, res };
  sse.addClient(eventId, client);
  req.on('close', () => {
    sse.removeClient(eventId, clientId);
  });
});

export default router;
