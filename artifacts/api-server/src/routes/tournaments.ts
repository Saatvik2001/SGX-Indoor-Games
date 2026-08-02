import { Router } from 'express';
import { logger } from '../lib/logger';
import { db, pool } from '@workspace/db';
import { fallbackStore } from '../lib/fallback-store';
import { withDatabaseFallback } from '../lib/db-fallback';

const router = Router();

// GET /api/tournaments
router.get('/', async (_req, res) => {
  try {
    if (!db) {
      const rows = await fallbackStore.getTournaments();
      return res.json(rows);
    }
    const result = await pool.query('SELECT * FROM tournaments');
    return res.json(result.rows || []);
  } catch (err) {
    logger.error({ err }, 'Error fetching tournaments');
    return res.json([]);
  }
});

// POST /api/tournaments
router.post('/', async (req, res) => {
  try {
    if (!db) {
      await fallbackStore.addTournament(req.body);
      return res.status(201).json({ ok: true });
    }
    const b = req.body;
    await pool.query(
      `INSERT INTO tournaments(id, name, description, location, registration_start_date, registration_end_date, tournament_start_date, tournament_end_date, status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        b.id,
        b.name,
        b.description,
        b.location,
        b.registrationStartDate ? new Date(b.registrationStartDate) : new Date(),
        b.registrationEndDate ? new Date(b.registrationEndDate) : new Date(),
        b.tournamentStartDate ? new Date(b.tournamentStartDate) : new Date(),
        b.tournamentEndDate ? new Date(b.tournamentEndDate) : new Date(),
        b.status || 'Draft'
      ]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error creating tournament');
    return res.status(500).json({ error: 'internal' });
  }
});

// PUT /api/tournaments/:id
router.put('/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'database_unavailable' });
    }
    const id = req.params.id;
    const b = req.body;
    await pool.query(
      `UPDATE tournaments SET name=$1, description=$2, location=$3, registration_start_date=$4, registration_end_date=$5, tournament_start_date=$6, tournament_end_date=$7, status=$8 WHERE id = $9`,
      [
        b.name,
        b.description,
        b.location,
        b.registrationStartDate ? new Date(b.registrationStartDate) : undefined,
        b.registrationEndDate ? new Date(b.registrationEndDate) : undefined,
        b.tournamentStartDate ? new Date(b.tournamentStartDate) : undefined,
        b.tournamentEndDate ? new Date(b.tournamentEndDate) : undefined,
        b.status,
        id
      ]
    );
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error updating tournament');
    return res.status(500).json({ error: 'internal' });
  }
});

// DELETE /api/tournaments/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!db) {
      await fallbackStore.deleteTournament(req.params.id);
      return res.json({ ok: true });
    }

    const deleted = await withDatabaseFallback(async () => {
      const id = req.params.id;
      await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
      return true;
    }, async () => {
      await fallbackStore.deleteTournament(req.params.id);
      return true;
    });

    return res.json({ ok: true, deleted });
  } catch (err) {
    logger.error({ err }, 'Error deleting tournament');
    return res.status(500).json({ error: 'internal' });
  }
});

export default router;
