// Use raw SQL via `pool` to avoid depending on schema exports here
import { Router } from 'express';
import { logger } from '../lib/logger';
import { db, pool } from '@workspace/db';
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
    if (!db) {
      await fallbackStore.addEvent(req.body);
      return res.json({ ok: true });
    }
    const body = req.body;
    await pool.query(
      'INSERT INTO events(id, tournament_id, name, type, game, meta) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [body.id, body.tournamentId, body.name, body.type, body.game, JSON.stringify({})]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error creating event');
    return res.json({ error: 'internal' });
  }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'database_unavailable' });
    }
    const id = req.params.id;
    const b = req.body;
    await pool.query(
      'UPDATE events SET name = $1, type = $2, game = $3, meta = $4 WHERE id = $5',
      [b.name, b.type, b.game, JSON.stringify(b.meta || {}), id]
    );
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error updating event');
    return res.json({ error: 'internal' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!db) {
      await fallbackStore.deleteEvent(req.params.id);
      return res.status(200).json({ ok: true });
    }

    const deleted = await withDatabaseFallback(async () => {
      const id = req.params.id;
      await pool.query('DELETE FROM events WHERE id = $1', [id]);
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
