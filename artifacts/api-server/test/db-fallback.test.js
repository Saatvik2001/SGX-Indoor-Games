import test from 'node:test';
import assert from 'node:assert/strict';
import { isDatabaseUnavailableError, withDatabaseFallback } from '../src/lib/db-fallback.ts';
import { fallbackStore } from '../src/lib/fallback-store.ts';

test('detects common database connection errors', () => {
  assert.equal(isDatabaseUnavailableError(new Error('connect ECONNREFUSED 127.0.0.1:5432')), true);
  assert.equal(isDatabaseUnavailableError(new Error('getaddrinfo ENOTFOUND neon.tech')), true);
  assert.equal(isDatabaseUnavailableError(new Error('unexpected payload')), false);
});

test('falls back when the database operation throws a connection error', async () => {
  const result = await withDatabaseFallback(
    async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    },
    async () => ({ ok: true, source: 'fallback' })
  );

  assert.deepEqual(result, { ok: true, source: 'fallback' });
});

test('deletes an event from the fallback store and removes related data', async () => {
  const eventId = 'delete-event-test-1';
  await fallbackStore.addEvent({
    id: eventId,
    tournamentId: 't-delete-test',
    name: 'Delete Test Event',
    type: 'Singles',
    game: 'Badminton',
    meta: {}
  });
  await fallbackStore.addTournament({
    id: 't-delete-test',
    name: 'Delete Test Tournament',
    description: 'For delete tests',
    location: 'Hyderabad',
    registrationStartDate: '2026-08-01T00:00:00.000Z',
    registrationEndDate: '2026-08-10T00:00:00.000Z',
    tournamentStartDate: '2026-08-12T00:00:00.000Z',
    tournamentEndDate: '2026-08-14T00:00:00.000Z',
    status: 'Draft'
  });
  await fallbackStore.addRegistrations([
    {
      employeeId: 'DEL-1',
      providedEmployeeId: 'DEL-1',
      employeeName: 'Delete Me',
      department: 'Ops',
      tournamentId: 't-delete-test',
      eventId,
      eventType: 'Singles',
      location: 'Hyderabad',
      registrationDate: '2026-08-03T00:00:00.000Z'
    }
  ]);

  const deleted = await fallbackStore.deleteEvent(eventId);

  assert.equal(deleted, true);
  assert.equal((await fallbackStore.getEvents()).some((event) => event.id === eventId), false);
  assert.equal((await fallbackStore.getRegistrations(eventId)).length, 0);
});

test('generates a valid bracket for an odd number of participants with BYEs and progresses winners automatically', async () => {
  const eventId = 'bracket-progression-test-1';
  await fallbackStore.addEvent({
    id: eventId,
    tournamentId: 't-bracket-test',
    name: 'Bracket Progression Event',
    type: 'Singles',
    game: 'Badminton',
    meta: {}
  });
  await fallbackStore.addTournament({
    id: 't-bracket-test',
    name: 'Bracket Progression Tournament',
    description: 'For bracket tests',
    location: 'Hyderabad',
    registrationStartDate: '2026-08-01T00:00:00.000Z',
    registrationEndDate: '2026-08-10T00:00:00.000Z',
    tournamentStartDate: '2026-08-12T00:00:00.000Z',
    tournamentEndDate: '2026-08-14T00:00:00.000Z',
    status: 'Draft'
  });
  await fallbackStore.addRegistrations([
    { employeeId: 'P1', providedEmployeeId: 'P1', employeeName: 'Player 1', department: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'P2', providedEmployeeId: 'P2', employeeName: 'Player 2', department: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'P3', providedEmployeeId: 'P3', employeeName: 'Player 3', department: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'P4', providedEmployeeId: 'P4', employeeName: 'Player 4', department: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'P5', providedEmployeeId: 'P5', employeeName: 'Player 5', department: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' }
  ]);

  await fallbackStore.generateFixtures(eventId, { Hyderabad: ['P1', 'P2', 'P3', 'P4', 'P5'] });

  const matches = await fallbackStore.getMatches(eventId);
  const round1Matches = matches.filter((row) => Number(row.meta?.round_level ?? -1) === 0);
  assert.equal(round1Matches.length, 4);

  const firstRoundParticipants = round1Matches.flatMap((row) => [row.player1_id, row.player2_id].filter(Boolean));
  assert.equal(firstRoundParticipants.filter((id) => id === 'P1').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'P2').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'P3').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'P4').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'P5').length, 1);

  const byeMatch = round1Matches.find((row) => row.meta?.is_bye === true);
  assert.ok(byeMatch);
  assert.equal(byeMatch?.status, 'Completed');
  const byePlayerId = byeMatch?.player1_id;
  assert.ok(byePlayerId);
  assert.equal(byeMatch?.winner_id, byePlayerId);

  const updated = await fallbackStore.updateMatch(byeMatch.id, { winner_id: byePlayerId, status: 'Completed' });
  assert.equal(updated?.winner_id, byePlayerId);

  const nextRoundMatch = matches.find((row) => row.round === 'Semi Final' && (row.player1_id === byePlayerId || row.player2_id === byePlayerId));
  assert.ok(nextRoundMatch);
  assert.equal(nextRoundMatch?.player1_id === byePlayerId || nextRoundMatch?.player2_id === byePlayerId, true);
});

test('regenerating fixtures clears old bracket state and removes duplicates', async () => {
  const eventId = 'regeneration-test-1';
  const tournamentId = 't-regeneration-test';
  await fallbackStore.addEvent({
    id: eventId,
    tournamentId,
    name: 'Regeneration Event',
    type: 'Singles',
    game: 'Badminton',
    meta: {}
  });
  await fallbackStore.addTournament({
    id: tournamentId,
    name: 'Regeneration Tournament',
    description: 'For regeneration tests',
    location: 'Hyderabad',
    registrationStartDate: '2026-08-01T00:00:00.000Z',
    registrationEndDate: '2026-08-10T00:00:00.000Z',
    tournamentStartDate: '2026-08-12T00:00:00.000Z',
    tournamentEndDate: '2026-08-14T00:00:00.000Z',
    status: 'Draft'
  });
  await fallbackStore.addRegistrations([
    { employeeId: 'R1', providedEmployeeId: 'R1', employeeName: 'Reg 1', department: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'R2', providedEmployeeId: 'R2', employeeName: 'Reg 2', department: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'R3', providedEmployeeId: 'R3', employeeName: 'Reg 3', department: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'R4', providedEmployeeId: 'R4', employeeName: 'Reg 4', department: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' }
  ]);

  const firstRun = await fallbackStore.generateFixtures(eventId, { Hyderabad: ['R1', 'R2', 'R2', 'R3', 'R4'] });
  const firstRoundParticipants = firstRun.filter((row) => Number(row.meta?.round_level ?? -1) === 0).flatMap((row) => [row.player1_id, row.player2_id].filter(Boolean));
  assert.equal(firstRoundParticipants.filter((id) => id === 'R2').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'R1').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'R3').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'R4').length, 1);
  assert.equal(new Set(firstRoundParticipants).size, firstRoundParticipants.length);

  const secondRun = await fallbackStore.generateFixtures(eventId, { Hyderabad: ['R1', 'R2', 'R3', 'R4'] });
  const secondRoundParticipants = secondRun.filter((row) => Number(row.meta?.round_level ?? -1) === 0).flatMap((row) => [row.player1_id, row.player2_id].filter(Boolean));
  assert.equal(secondRoundParticipants.length, 4);
  assert.equal(new Set(secondRoundParticipants).size, secondRoundParticipants.length);
  assert.equal(secondRun.some((row) => row.player1_id === 'R2' && row.player2_id === 'R2'), false);
  assert.equal(secondRun.some((row) => row.player1_id === 'R2' && row.player2_id === 'R2'), false);
});

test('deleteTournament removes related fixtures and bracket data from the fallback store', async () => {
  const eventId = 'delete-tournament-test-1';
  const tournamentId = 't-delete-tournament-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId, name: 'Delete Tournament Event', type: 'Singles', game: 'Badminton', meta: {} });
  await fallbackStore.addTournament({ id: tournamentId, name: 'Delete Tournament', description: 'Delete me', location: 'Hyderabad', registrationStartDate: '2026-08-01T00:00:00.000Z', registrationEndDate: '2026-08-10T00:00:00.000Z', tournamentStartDate: '2026-08-12T00:00:00.000Z', tournamentEndDate: '2026-08-14T00:00:00.000Z', status: 'Draft' });
  await fallbackStore.addRegistrations([{ employeeId: 'DT1', providedEmployeeId: 'DT1', employeeName: 'Delete Tournament Player', department: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' }]);
  await fallbackStore.generateFixtures(eventId, { Hyderabad: ['DT1'] });

  await fallbackStore.deleteTournament(tournamentId);

  assert.equal((await fallbackStore.getTournaments()).some((row) => row.id === tournamentId), false);
  assert.equal((await fallbackStore.getEvents()).some((row) => row.id === eventId), false);
  assert.equal((await fallbackStore.getRegistrations(eventId)).length, 0);
  assert.equal((await fallbackStore.getMatches(eventId)).length, 0);
});
