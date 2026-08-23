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
      const possible = req.body as any;
      if (possible && (possible.employeeId || possible.employee_id) && (possible.eventId || possible.event_id)) {
        registrations = [possible];
      }
    }
    if (!Array.isArray(registrations) || registrations.length === 0) {
      return res.status(400).json({ error: 'invalid_payload' });
    }

    if (!pool || !db) {
      try {
        const inserted = await fallbackStore.addRegistrations(registrations);
        logger.info({ count: inserted.length }, 'Inserted registrations into fallback store');
        return res.status(201).json({ ok: true, insertedCount: inserted.length, inserted });
      } catch (valErr: any) {
        return res.status(400).json({ error: valErr?.message || 'Registration validation failed' });
      }
    }

    const p = pool;
    const inserted = await withDatabaseFallback(async () => {
      await p.query("ALTER TABLE registrations ADD COLUMN IF NOT EXISTS department varchar(128)");

      const insertedRows = [];
      for (const r of registrations) {
        const evId = String(r.eventId || r.event_id || '');
        const evRes = await p.query('SELECT type, tournament_id FROM events WHERE id = $1 LIMIT 1', [evId]);
        const ev = evRes.rows[0];
        const isDoubles = r.eventType === 'Doubles' || ev?.type === 'Doubles';
        const tournId = r.tournamentId || r.tournament_id || ev?.tournament_id || 'T001';
        const loc = r.location || 'Irrum Manzil';
        const rawDate = r.registrationDate || r.registration_date;
        const regDate = rawDate ? new Date(rawDate) : new Date();

        const p1 = String(r.employeeId || r.providedEmployeeId || r.employee_id || '').trim();
        const p1Provided = String(r.providedEmployeeId || p1).trim();
        const p1Name = String(r.employeeName || r.employee_name || p1).trim();
        const p1Dept = r.department ? String(r.department).trim() : null;

        if (!p1) {
          throw new Error('Employee ID is required.');
        }

        if (!isDoubles) {
          // SINGLES VALIDATION:
          const existing = await p.query(
            'SELECT id FROM registrations WHERE event_id = $1 AND (LOWER(employee_id) = LOWER($2) OR LOWER(provided_employee_id) = LOWER($2)) LIMIT 1',
            [evId, p1]
          );
          if (existing.rows.length > 0) {
            throw new Error('This player is already registered for this event.');
          }

          const insertRes = await p.query(
            `INSERT INTO registrations(employee_id, provided_employee_id, employee_name, department, tournament_id, event_id, partner_id, location, registration_date)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [p1, p1Provided, p1Name, p1Dept, tournId, evId, null, loc, isNaN(regDate.getTime()) ? new Date() : regDate]
          );
          insertedRows.push(insertRes.rows[0]);
        } else {
          // DOUBLES VALIDATION:
          const p2Raw = r.partnerId || r.partner_id;
          const p2 = p2Raw ? String(p2Raw).trim() : null;
          const p2Name = r.partnerName || r.partner_name ? String(r.partnerName || r.partner_name).trim() : (p2 || '');
          const p2Dept = r.partnerDepartment || r.partner_department ? String(r.partnerDepartment || r.partner_department).trim() : p1Dept;

          if (p2) {
            if (p1.toLowerCase() === p2.toLowerCase()) {
              throw new Error('A player cannot be their own Doubles partner.');
            }

            // Check if player 1 is already in a team for this event
            const p1InEvent = await p.query(
              'SELECT id FROM registrations WHERE event_id = $1 AND (LOWER(employee_id) = LOWER($2) OR LOWER(partner_id) = LOWER($2)) LIMIT 1',
              [evId, p1]
            );
            if (p1InEvent.rows.length > 0) {
              throw new Error('This player is already part of another Doubles team for this event.');
            }

            // Check if player 2 is already in a team for this event
            const p2InEvent = await p.query(
              'SELECT id FROM registrations WHERE event_id = $1 AND (LOWER(employee_id) = LOWER($2) OR LOWER(partner_id) = LOWER($2)) LIMIT 1',
              [evId, p2]
            );
            if (p2InEvent.rows.length > 0) {
              throw new Error('This player is already part of another Doubles team for this event.');
            }

            // Check normalized team in this event
            const teamInEvent = await p.query(
              `SELECT id FROM registrations WHERE event_id = $1 AND (
                (LOWER(employee_id) = LOWER($2) AND LOWER(partner_id) = LOWER($3)) OR
                (LOWER(employee_id) = LOWER($3) AND LOWER(partner_id) = LOWER($2))
              ) LIMIT 1`,
              [evId, p1, p2]
            );
            if (teamInEvent.rows.length > 0) {
              throw new Error('This Doubles team is already registered.');
            }

            // Insert Player 1
            const ins1 = await p.query(
              `INSERT INTO registrations(employee_id, provided_employee_id, employee_name, department, tournament_id, event_id, partner_id, location, registration_date)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
              [p1, p1Provided, p1Name, p1Dept, tournId, evId, p2, loc, isNaN(regDate.getTime()) ? new Date() : regDate]
            );
            insertedRows.push(ins1.rows[0]);

            // Insert Player 2
            const ins2 = await p.query(
              `INSERT INTO registrations(employee_id, provided_employee_id, employee_name, department, tournament_id, event_id, partner_id, location, registration_date)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
              [p2, p2, p2Name || p2, p2Dept, tournId, evId, p1, loc, isNaN(regDate.getTime()) ? new Date() : regDate]
            );
            insertedRows.push(ins2.rows[0]);
          } else {
            // Partial Doubles registration without partner
            const p1InEvent = await p.query(
              'SELECT id FROM registrations WHERE event_id = $1 AND (LOWER(employee_id) = LOWER($2) OR LOWER(partner_id) = LOWER($2)) LIMIT 1',
              [evId, p1]
            );
            if (p1InEvent.rows.length > 0) {
              throw new Error('This player is already registered for this event.');
            }

            const ins1 = await p.query(
              `INSERT INTO registrations(employee_id, provided_employee_id, employee_name, department, tournament_id, event_id, partner_id, location, registration_date)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
              [p1, p1Provided, p1Name, p1Dept, tournId, evId, null, loc, isNaN(regDate.getTime()) ? new Date() : regDate]
            );
            insertedRows.push(ins1.rows[0]);
          }
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
  } catch (err: any) {
    logger.error({ err }, "Error handling registration");
    return res.status(400).json({ error: err?.message || "Registration failed" });
  }
});

// PUT /api/registrations/:id/partner
router.put("/:id/partner", async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerId, partnerName, partnerDepartment } = req.body;
    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId is required' });
    }

    if (!pool || !db) {
      const updated = await fallbackStore.assignPartner(Number(id), partnerId, partnerName, partnerDepartment);
      return res.json({ ok: true, registration: updated });
    }

    const p = pool;
    const result = await withDatabaseFallback(async () => {
      const regRes = await p.query('SELECT * FROM registrations WHERE id = $1 LIMIT 1', [id]);
      const reg = regRes.rows[0];
      if (!reg) throw new Error('Registration not found');

      const p1 = reg.employee_id;
      const p2 = String(partnerId).trim();
      if (p1.toLowerCase() === p2.toLowerCase()) {
        throw new Error('A player cannot be their own Doubles partner.');
      }

      const p2InEvent = await p.query(
        'SELECT * FROM registrations WHERE event_id = $1 AND id <> $2 AND (LOWER(employee_id) = LOWER($3) OR LOWER(partner_id) = LOWER($3)) LIMIT 1',
        [reg.event_id, reg.id, p2]
      );
      if (p2InEvent.rows.length > 0 && p2InEvent.rows[0].partner_id) {
        throw new Error('This player is already part of another Doubles team for this event.');
      }

      await p.query('UPDATE registrations SET partner_id = $1 WHERE id = $2', [p2, reg.id]);
      if (p2InEvent.rows.length > 0) {
        await p.query('UPDATE registrations SET partner_id = $1 WHERE id = $2', [p1, p2InEvent.rows[0].id]);
      } else {
        await p.query(
          `INSERT INTO registrations(employee_id, provided_employee_id, employee_name, department, tournament_id, event_id, partner_id, location, registration_date)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [p2, p2, partnerName || p2, partnerDepartment || reg.department, reg.tournament_id, reg.event_id, p1, reg.location, new Date()]
        );
      }
      return { ...reg, partner_id: p2 };
    }, async () => {
      return await fallbackStore.assignPartner(Number(id), partnerId, partnerName, partnerDepartment);
    });

    return res.json({ ok: true, registration: result });
  } catch (err: any) {
    logger.error({ err }, 'Error assigning partner');
    return res.status(400).json({ error: err?.message || 'Failed to assign partner' });
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
