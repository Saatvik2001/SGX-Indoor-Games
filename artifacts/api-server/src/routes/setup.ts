import { Router } from 'express';
import { logger } from '../lib/logger';
import { pool } from '@workspace/db';

const router = Router();

// POST /api/setup/createTables
router.post('/createTables', async (_req, res) => {
  const sql = `
  CREATE TABLE IF NOT EXISTS events (
    id varchar(64) primary key,
    tournament_id varchar(32) not null,
    name varchar(256) not null,
    type varchar(32) not null,
    game varchar(64) not null,
    meta jsonb default '{}'
  );

  ALTER TABLE registrations ADD COLUMN IF NOT EXISTS department varchar(128);

  CREATE TABLE IF NOT EXISTS tournaments (
    id varchar(32) primary key,
    name varchar(256) not null,
    description varchar(1024) not null,
    location varchar(128) not null,
    registration_start_date timestamp not null,
    registration_end_date timestamp not null,
    tournament_start_date timestamp not null,
    tournament_end_date timestamp not null,
    status varchar(64) not null
  );
  `;

  try {
    await pool.query(sql);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'Error creating tables via setup');
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
