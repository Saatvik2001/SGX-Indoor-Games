import test from 'node:test';
import assert from 'node:assert/strict';
import { isDatabaseUnavailableError, withDatabaseFallback } from '../src/lib/db-fallback.ts';
import { fallbackStore } from '../src/lib/fallback-store.ts';

test.beforeEach(async () => {
  await fallbackStore.reset();
});

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

test('Singles registration prevents same player from registering more than once for same event', async () => {
  const eventId = 'singles-dup-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'Singles Event', type: 'Singles', game: 'Tennis', meta: {} });
  await fallbackStore.addRegistrations([{ employeeId: 'SMP1', providedEmployeeId: 'SMP1', employeeName: 'Player 1', eventId, eventType: 'Singles' }]);

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{ employeeId: 'SMP1', providedEmployeeId: 'SMP1', employeeName: 'Player 1', eventId, eventType: 'Singles' }]);
    },
    { message: 'This player is already registered for this event.' }
  );
});

test('Doubles registration rejects self as partner', async () => {
  const eventId = 'doubles-self-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'Doubles Event', type: 'Doubles', game: 'Badminton', meta: {} });

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'EMP-1',
        partnerId: 'EMP-1',
        employeeName: 'Self Partner',
        eventId,
        eventType: 'Doubles'
      }]);
    },
    { message: 'A player cannot be their own Doubles partner.' }
  );
});

test('Doubles registration prevents duplicate teams regardless of player order (A+B vs B+A)', async () => {
  const eventId = 'doubles-dup-team-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'Doubles Event 2', type: 'Doubles', game: 'Badminton', meta: {} });
  await fallbackStore.addRegistrations([{
    employeeId: 'TEAM-A',
    partnerId: 'TEAM-B',
    employeeName: 'Player A',
    partnerName: 'Player B',
    eventId,
    eventType: 'Doubles'
  }]);

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'TEAM-B',
        partnerId: 'TEAM-A',
        employeeName: 'Player B',
        partnerName: 'Player A',
        eventId,
        eventType: 'Doubles'
      }]);
    },
    { message: 'This player is already part of another Doubles team for this event.' }
  );
});

test('Doubles registration prevents conflicting player reuse in another team for same event', async () => {
  const eventId = 'doubles-conflict-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'Doubles Event 3', type: 'Doubles', game: 'Badminton', meta: {} });
  await fallbackStore.addRegistrations([{
    employeeId: 'CONF-A',
    partnerId: 'CONF-B',
    employeeName: 'Player A',
    partnerName: 'Player B',
    eventId,
    eventType: 'Doubles'
  }]);

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'CONF-A',
        partnerId: 'CONF-C',
        employeeName: 'Player A',
        partnerName: 'Player C',
        eventId,
        eventType: 'Doubles'
      }]);
    },
    { message: 'This player is already part of another Doubles team for this event.' }
  );
});

test('Doubles partial registration saves single player without partner and excludes from fixtures until completed', async () => {
  const eventId = 'doubles-partial-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'Doubles Partial Event', type: 'Doubles', game: 'Badminton', meta: {} });
  
  // Register complete team A + B
  await fallbackStore.addRegistrations([{
    employeeId: 'PA',
    partnerId: 'PB',
    employeeName: 'Player A',
    partnerName: 'Player B',
    location: 'Irrum Manzil',
    eventId,
    eventType: 'Doubles'
  }]);

  // Register partial entry C (no partner)
  const partial = await fallbackStore.addRegistrations([{
    employeeId: 'PC',
    employeeName: 'Player C',
    location: 'Irrum Manzil',
    eventId,
    eventType: 'Doubles'
  }]);

  assert.equal(partial[0].partner_id, null);

  // Generate fixtures: only complete team PA:PB should participate
  const matches = await fallbackStore.generateFixtures(eventId);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].player1_id, 'TEAM:PA:PB');

  // Now assign partner PD to PC
  await fallbackStore.assignPartner(partial[0].id, 'PD', 'Player D');
  const regs = await fallbackStore.getRegistrations(eventId);
  const updatedC = regs.find(r => r.employee_id === 'PC');
  assert.equal(updatedC?.partner_id, 'PD');

  // Now regenerate fixtures: both teams should participate
  const matchesAfterPair = await fallbackStore.generateFixtures(eventId);
  assert.equal(matchesAfterPair.length, 1);
  const players = [matchesAfterPair[0].player1_id, matchesAfterPair[0].player2_id];
  assert.ok(players.includes('TEAM:PA:PB'));
  assert.ok(players.includes('TEAM:PC:PD'));
});
