import { Router } from "express";
import { logger } from "../lib/logger";
import { db, pool } from "@workspace/db";
import { fallbackStore } from "../lib/fallback-store";
import { withDatabaseFallback } from "../lib/db-fallback";

const router = Router();

// POST /api/fixtures/generate
router.post("/generate", async (req, res) => {
  try {
    const { eventId, perLocationPlayerIds } = req.body as { eventId: string; perLocationPlayerIds: Record<string, string[]> };
    if (!pool) {
      const matches = await fallbackStore.generateFixtures(eventId, perLocationPlayerIds || {});
      return res.status(201).json({ ok: true, matches });
    }
    logger.info({ eventId, perLocationPlayerIds }, "Generate fixtures request");

    const generated = await withDatabaseFallback(async () => {
      await pool.query('DELETE FROM matches WHERE event_id = $1', [eventId]);

      const generatedMatches: any[] = [];

      const createRoundMatches = async (roundName: string, playerIds: Array<string | null>, location: string, roundLevel: number) => {
        const insertedRound: any[] = [];
        for (let i = 0; i < playerIds.length; i += 2) {
          const p1 = playerIds[i] ?? '';
          const p2 = playerIds[i + 1] ?? null;
          const result = await pool.query(
            'INSERT INTO matches(event_id, round, player1_id, player2_id, winner_id, status, scheduled_date, meta) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [eventId, roundName, p1, p2, null, 'Pending', null, JSON.stringify({ location, bracket_index: Math.floor(i / 2), round_level: roundLevel })]
          );
          insertedRound.push(result.rows[0]);
        }
        return insertedRound;
      };

      for (const [location, players] of Object.entries(perLocationPlayerIds || {})) {
        const round1Players = players.filter(Boolean) as string[];
        // compute match counts per round dynamically
        const roundsCounts: number[] = [];
        let matchesCount = Math.ceil(round1Players.length / 2);
        roundsCounts.push(matchesCount);
        while (matchesCount > 1) {
          matchesCount = Math.ceil(matchesCount / 2);
          roundsCounts.push(matchesCount);
        }

        const totalRounds = roundsCounts.length;
        const roundNames = roundsCounts.map((_, idx) => {
          const roundIdx = idx;
          const fromEnd = totalRounds - 1 - roundIdx;
          if (fromEnd === 0) return 'Final';
          if (fromEnd === 1) return 'Semi Final';
          if (fromEnd === 2) return 'Quarter Final';
          return `Round ${roundIdx + 1}`;
        });

        // create Round 1 matches with players
        const round1Matches = await createRoundMatches(roundNames[0], round1Players, location, 0);
        generatedMatches.push(...round1Matches);

        // create placeholders for subsequent rounds
        for (let r = 1; r < roundNames.length; r++) {
          const placeholderPlayers = Array.from({ length: roundsCounts[r] }, () => null as string | null);
          const nextRoundMatches = await createRoundMatches(roundNames[r], placeholderPlayers, location, r);
          generatedMatches.push(...nextRoundMatches);
        }
      }

      return generatedMatches;
    }, async () => {
      const matches = await fallbackStore.generateFixtures(eventId, perLocationPlayerIds || {});
      return matches;
    });

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
  // add
  const sseModule = require('../lib/sse').default;
  sseModule.addClient(eventId, client);
  req.on('close', () => {
    sseModule.removeClient(eventId, clientId);
  });
});

export default router;
