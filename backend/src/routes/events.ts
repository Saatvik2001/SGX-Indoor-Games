// Use raw SQL via `pool` to avoid depending on schema exports here
import { Router } from 'express';
import { logger } from '../lib/logger';
import { db, pool } from '../db';
import { fallbackStore } from '../lib/fallback-store';
import { withDatabaseFallback } from '../lib/db-fallback';

const router = Router();

// GET /api/events
router.get('/', async (_req, res) => {
  try {
    if (!pool || !db) {
      const rows = await fallbackStore.getEvents();
      return res.json(rows);
    }
    const result = await pool.query('SELECT * FROM events');
    return res.json(result.rows || []);
  } catch (err) {
    logger.error({ err }, 'Error fetching events');
    return res.status(500).json({ error: 'internal' });
  }
});

// POST /api/events
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || `E${Date.now()}`;
    const tournamentId = body.tournamentId || body.tournament_id || 'T001';
    const name = body.name || 'Tournament Event';
    const type = body.type || 'Singles';
    const game = body.game || 'Indoor Game';
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

    if (!db || !pool) {
      await fallbackStore.addEvent({ id, tournamentId, name, type, game, meta });
      return res.status(201).json({ ok: true, id });
    }

    await pool.query(
      'INSERT INTO events(id, tournament_id, name, type, game, meta) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET name = $3, type = $4, game = $5, meta = $6 RETURNING *',
      [id, tournamentId, name, type, game, JSON.stringify(meta)]
    );
    return res.status(201).json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, 'Error creating event');
    return res.status(500).json({ error: 'internal' });
  }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;
    await withDatabaseFallback(
      async () => {
        if (!pool) throw new Error('no_pool');
        await pool.query(
          'UPDATE events SET name = $1, type = $2, game = $3, meta = $4 WHERE id = $5',
          [b.name, b.type, b.game, JSON.stringify(b.meta || {}), id]
        );
      },
      async () => {
        await fallbackStore.updateEvent(id, b);
      }
    );
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error updating event');
    return res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!db || !pool) {
      await fallbackStore.deleteEvent(req.params.id);
      return res.status(200).json({ ok: true });
    }

    const p = pool;
    const deleted = await withDatabaseFallback(async () => {
      const id = req.params.id;
      await p.query('DELETE FROM matches WHERE event_id = $1', [id]);
      await p.query('DELETE FROM registrations WHERE event_id = $1', [id]);
      await p.query('DELETE FROM events WHERE id = $1', [id]);
      return true;
    }, async () => {
      await fallbackStore.deleteEvent(req.params.id);
      return true;
    });

    return res.status(200).json({ ok: true, deleted });
  } catch (err) {
    logger.error({ err }, 'Error deleting event');
    return res.json({ error: 'internal' });
  }
});

export default router;
