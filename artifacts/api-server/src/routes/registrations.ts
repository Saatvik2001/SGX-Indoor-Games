import { Router } from "express";
import { logger } from "../lib/logger";
import { db, pool } from "@workspace/db";
import { fallbackStore } from "../lib/fallback-store";
import { withDatabaseFallback } from "../lib/db-fallback";

const router = Router();

// POST /api/registrations
router.post("/", async (req, res) => {
  try {
    logger.info({ body: req.body }, 'Incoming registration payload');
    // Accept either { registrations: [...] } or a single registration object
    let registrations = (req.body && req.body.registrations) as any[] | undefined;
    if (!Array.isArray(registrations)) {
      // If payload looks like a single registration, wrap it
      const possible = req.body as any;
      if (possible && (possible.employeeId || possible.employee_id) && (possible.eventId || possible.event_id)) {
        registrations = [possible];
      }
    }
    if (!Array.isArray(registrations) || registrations.length === 0) {
      return res.status(400).json({ error: 'invalid_payload' });
    }

    if (!pool || !db) {
      const inserted = await fallbackStore.addRegistrations(registrations);
      logger.info({ count: inserted.length }, 'Inserted registrations into fallback store');
      return res.status(201).json({ ok: true, insertedCount: inserted.length, inserted });
    }

    const inserted = await withDatabaseFallback(async () => {
      await pool.query("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS department varchar(128)");

      const insertedRows = [];
      for (const r of registrations) {
        const insertRes = await pool.query(
          `INSERT INTO registrations(employee_id, provided_employee_id, employee_name, department, tournament_id, event_id, partner_id, location, registration_date)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [r.employeeId, r.providedEmployeeId, r.employeeName, r.department || null, r.tournamentId, r.eventId, r.partnerId || null, r.location, new Date(r.registrationDate)]
        );
        const row = insertRes.rows[0];
        insertedRows.push(row);
        try {
          let isDoubles = false;
          if (r.eventType === 'Doubles') isDoubles = true;
          else {
            const evRes = await pool.query('SELECT type FROM events WHERE id = $1 LIMIT 1', [r.eventId]);
            const ev = evRes.rows[0];
            if (ev?.type === 'Doubles') isDoubles = true;
          }
          if (isDoubles && !r.partnerId) {
            const newReg = row;
            const otherRes = await pool.query(
              'SELECT * FROM registrations WHERE event_id = $1 AND location = $2 AND partner_id IS NULL AND id <> $3 ORDER BY registration_date ASC LIMIT 1',
              [r.eventId, r.location, newReg.id]
            );
            const other = otherRes.rows[0];
            if (other) {
              await pool.query('UPDATE registrations SET partner_id = $1 WHERE id = $2', [other.employee_id, newReg.id]);
              await pool.query('UPDATE registrations SET partner_id = $1 WHERE id = $2', [newReg.employee_id, other.id]);
              const idx = insertedRows.findIndex(x => x.id === newReg.id);
              if (idx >= 0) insertedRows[idx].partner_id = other.employee_id;
            }
          }
        } catch (pairErr) {
          logger.error({ pairErr }, 'Error attempting to auto-pair registration');
        }
      }

      logger.info({ count: insertedRows.length }, 'Inserted registrations');
      return insertedRows;
    }, async () => {
      const inserted = await fallbackStore.addRegistrations(registrations);
      logger.info({ count: inserted.length }, 'Inserted registrations into fallback store after DB error');
      return inserted;
    });

    return res.status(201).json({ ok: true, insertedCount: inserted.length, inserted });
  } catch (err) {
    logger.error({ err }, "Error handling registration");
    return res.status(500).json({ error: "internal" });
  }
});

// GET /api/registrations?eventId=&location=
router.get("/", async (req, res) => {
  try {
    if (!pool || !db) {
      const { eventId, location } = req.query as Record<string, string>;
      const rows = await fallbackStore.getRegistrations(eventId, location);
      return res.json(rows);
    }
    // Simple, safe implementation: return all registrations or filter by query params safely
    const { eventId, location } = req.query as Record<string, string>;
    let q = 'SELECT * FROM registrations';
    const params: any[] = [];
    const clauses: string[] = [];
    if (eventId) { params.push(eventId); clauses.push(`event_id = $${params.length}`); }
    if (location) { params.push(location); clauses.push(`location = $${params.length}`); }
    if (clauses.length) q += ' WHERE ' + clauses.join(' AND ');
    const result = await pool.query(q, params);
    return res.json(result.rows || []);
  } catch (err) {
    logger.error({ err }, 'Error fetching registrations');
    return res.status(500).json({ error: 'internal' });
  }
});

export default router;
