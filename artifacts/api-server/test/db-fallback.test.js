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
      employeeId: 'SG-DEL-1',
      providedEmployeeId: 'SG-DEL-1',
      employeeName: 'Delete Me',
      project: 'Ops',
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
    { employeeId: 'SG-P1', providedEmployeeId: 'SG-P1', employeeName: 'Player 1', project: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-P2', providedEmployeeId: 'SG-P2', employeeName: 'Player 2', project: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-P3', providedEmployeeId: 'SG-P3', employeeName: 'Player 3', project: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-P4', providedEmployeeId: 'SG-P4', employeeName: 'Player 4', project: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-P5', providedEmployeeId: 'SG-P5', employeeName: 'Player 5', project: 'Ops', tournamentId: 't-bracket-test', eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' }
  ]);

  await fallbackStore.generateFixtures(eventId, { Hyderabad: ['SG-P1', 'SG-P2', 'SG-P3', 'SG-P4', 'SG-P5'] });

  const matches = await fallbackStore.getMatches(eventId);
  const round1Matches = matches.filter((row) => Number(row.meta?.round_level ?? -1) === 0);
  assert.equal(round1Matches.length, 4);

  const firstRoundParticipants = round1Matches.flatMap((row) => [row.player1_id, row.player2_id].filter(Boolean));
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-P1').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-P2').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-P3').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-P4').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-P5').length, 1);

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
    { employeeId: 'SG-R1', providedEmployeeId: 'SG-R1', employeeName: 'Reg 1', project: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-R2', providedEmployeeId: 'SG-R2', employeeName: 'Reg 2', project: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-R3', providedEmployeeId: 'SG-R3', employeeName: 'Reg 3', project: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' },
    { employeeId: 'SG-R4', providedEmployeeId: 'SG-R4', employeeName: 'Reg 4', project: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' }
  ]);

  const firstRun = await fallbackStore.generateFixtures(eventId, { Hyderabad: ['SG-R1', 'SG-R2', 'SG-R2', 'SG-R3', 'SG-R4'] });
  const firstRoundParticipants = firstRun.filter((row) => Number(row.meta?.round_level ?? -1) === 0).flatMap((row) => [row.player1_id, row.player2_id].filter(Boolean));
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-R2').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-R1').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-R3').length, 1);
  assert.equal(firstRoundParticipants.filter((id) => id === 'SG-R4').length, 1);
  assert.equal(new Set(firstRoundParticipants).size, firstRoundParticipants.length);

  const secondRun = await fallbackStore.generateFixtures(eventId, { Hyderabad: ['SG-R1', 'SG-R2', 'SG-R3', 'SG-R4'] });
  const secondRoundParticipants = secondRun.filter((row) => Number(row.meta?.round_level ?? -1) === 0).flatMap((row) => [row.player1_id, row.player2_id].filter(Boolean));
  assert.equal(secondRoundParticipants.length, 4);
  assert.equal(new Set(secondRoundParticipants).size, secondRoundParticipants.length);
});

test('deleteTournament removes related fixtures and bracket data from the fallback store', async () => {
  const eventId = 'delete-tournament-test-1';
  const tournamentId = 't-delete-tournament-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId, name: 'Delete Tournament Event', type: 'Singles', game: 'Badminton', meta: {} });
  await fallbackStore.addTournament({ id: tournamentId, name: 'Delete Tournament', description: 'Delete me', location: 'Hyderabad', registrationStartDate: '2026-08-01T00:00:00.000Z', registrationEndDate: '2026-08-10T00:00:00.000Z', tournamentStartDate: '2026-08-12T00:00:00.000Z', tournamentEndDate: '2026-08-14T00:00:00.000Z', status: 'Draft' });
  await fallbackStore.addRegistrations([{ employeeId: 'SG-DT1', providedEmployeeId: 'SG-DT1', employeeName: 'Delete Tournament Player', project: 'Ops', tournamentId, eventId, eventType: 'Singles', location: 'Hyderabad', registrationDate: '2026-08-03T00:00:00.000Z' }]);
  await fallbackStore.generateFixtures(eventId, { Hyderabad: ['SG-DT1'] });

  await fallbackStore.deleteTournament(tournamentId);

  assert.equal((await fallbackStore.getTournaments()).some((row) => row.id === tournamentId), false);
  assert.equal((await fallbackStore.getEvents()).some((row) => row.id === eventId), false);
  assert.equal((await fallbackStore.getRegistrations(eventId)).length, 0);
  assert.equal((await fallbackStore.getMatches(eventId)).length, 0);
});

test('Case-insensitive SG prefix validation: accepts SG, Sg, sG, sg and rejects other prefixes', async () => {
  const eventId = 'sg-prefix-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'SG Prefix Test Event', type: 'Singles', game: 'Tennis', meta: {} });

  // Valid variations: SG, Sg, sG, sg
  const regSG = await fallbackStore.addRegistrations([{ employeeId: 'SG101', employeeName: 'P1', eventId, eventType: 'Singles', project: 'Eng' }]);
  const regSg = await fallbackStore.addRegistrations([{ employeeId: 'Sg102', employeeName: 'P2', eventId, eventType: 'Singles', project: 'Eng' }]);
  const reg_sG = await fallbackStore.addRegistrations([{ employeeId: 'sG103', employeeName: 'P3', eventId, eventType: 'Singles', project: 'Eng' }]);
  const reg_sg = await fallbackStore.addRegistrations([{ employeeId: 'sg104', employeeName: 'P4', eventId, eventType: 'Singles', project: 'Eng' }]);

  assert.equal(regSG.length, 1);
  assert.equal(regSg.length, 1);
  assert.equal(reg_sG.length, 1);
  assert.equal(reg_sg.length, 1);

  // Invalid: EMP-101
  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{ employeeId: 'EMP-101', employeeName: 'Invalid Prefix', eventId, eventType: 'Singles' }]);
    },
    { message: 'Employee ID must start with SG prefix (e.g. SG123, sg101).' }
  );
});

test('Singles registration prevents same player from registering more than once for same event', async () => {
  const eventId = 'singles-dup-test';
  await fallbackStore.addEvent({ id: eventId, tournamentId: 't1', name: 'Singles Event', type: 'Singles', game: 'Tennis', meta: {} });
  await fallbackStore.addRegistrations([{ employeeId: 'SG-SMP1', providedEmployeeId: 'SG-SMP1', employeeName: 'Player 1', eventId, eventType: 'Singles' }]);

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{ employeeId: 'SG-SMP1', providedEmployeeId: 'SG-SMP1', employeeName: 'Player 1', eventId, eventType: 'Singles' }]);
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
        employeeId: 'SG-EMP-1',
        partnerId: 'SG-EMP-1',
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
    employeeId: 'SG-TEAM-A',
    partnerId: 'SG-TEAM-B',
    employeeName: 'Player A',
    partnerName: 'Player B',
    eventId,
    eventType: 'Doubles'
  }]);

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'SG-TEAM-B',
        partnerId: 'SG-TEAM-A',
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
    employeeId: 'SG-CONF-A',
    partnerId: 'SG-CONF-B',
    employeeName: 'Player A',
    partnerName: 'Player B',
    eventId,
    eventType: 'Doubles'
  }]);

  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'SG-CONF-A',
        partnerId: 'SG-CONF-C',
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
    employeeId: 'SG-PA',
    partnerId: 'SG-PB',
    employeeName: 'Player A',
    partnerName: 'Player B',
    location: 'Irrum Manzil',
    eventId,
    eventType: 'Doubles'
  }]);

  // Register partial entry C (no partner)
  const partial = await fallbackStore.addRegistrations([{
    employeeId: 'SG-PC',
    employeeName: 'Player C',
    location: 'Irrum Manzil',
    eventId,
    eventType: 'Doubles'
  }]);

  assert.equal(partial[0].partner_id, null);

  // Generate fixtures: only complete team PA:PB should participate
  const matches = await fallbackStore.generateFixtures(eventId);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].player1_id, 'TEAM:SG-PA:SG-PB');

  // Now assign partner PD to PC
  await fallbackStore.assignPartner(partial[0].id, 'SG-PD', 'Player D');
  const regs = await fallbackStore.getRegistrations(eventId);
  const updatedC = regs.find(r => r.employee_id === 'SG-PC');
  assert.equal(updatedC?.partner_id, 'SG-PD');

  // Now regenerate fixtures: both teams should participate
  const matchesAfterPair = await fallbackStore.generateFixtures(eventId);
  assert.equal(matchesAfterPair.length, 1);
  const players = [matchesAfterPair[0].player1_id, matchesAfterPair[0].player2_id];
  assert.ok(players.includes('TEAM:SG-PA:SG-PB'));
  assert.ok(players.includes('TEAM:SG-PC:SG-PD'));
});

test('Fresh Tournament Match Numbering resets to Match 1 for new tournament sessions', async () => {
  // Tournament A with 4 players (3 matches total)
  const eventIdA = 't-a-event-1';
  await fallbackStore.addEvent({ id: eventIdA, tournamentId: 'tourn-a', name: 'Tourn A Event', type: 'Singles', game: 'Badminton', meta: {} });
  await fallbackStore.addRegistrations([
    { employeeId: 'SG-TA1', providedEmployeeId: 'SG-TA1', employeeName: 'Player A1', eventId: eventIdA, eventType: 'Singles', location: 'Irrum Manzil' },
    { employeeId: 'SG-TA2', providedEmployeeId: 'SG-TA2', employeeName: 'Player A2', eventId: eventIdA, eventType: 'Singles', location: 'Irrum Manzil' },
    { employeeId: 'SG-TA3', providedEmployeeId: 'SG-TA3', employeeName: 'Player A3', eventId: eventIdA, eventType: 'Singles', location: 'Irrum Manzil' },
    { employeeId: 'SG-TA4', providedEmployeeId: 'SG-TA4', employeeName: 'Player A4', eventId: eventIdA, eventType: 'Singles', location: 'Irrum Manzil' },
  ]);

  const matchesA = await fallbackStore.generateFixtures(eventIdA);
  assert.equal(matchesA.length, 3);
  assert.equal(matchesA[0].meta.match_number, 1);
  assert.equal(matchesA[1].meta.match_number, 2);
  assert.equal(matchesA[2].meta.match_number, 3);

  // Tournament B created after Tournament A
  const eventIdB = 't-b-event-1';
  await fallbackStore.addEvent({ id: eventIdB, tournamentId: 'tourn-b', name: 'Tourn B Event', type: 'Singles', game: 'Table Tennis', meta: {} });
  await fallbackStore.addRegistrations([
    { employeeId: 'SG-TB1', providedEmployeeId: 'SG-TB1', employeeName: 'Player B1', eventId: eventIdB, eventType: 'Singles', location: 'Hitech City' },
    { employeeId: 'SG-TB2', providedEmployeeId: 'SG-TB2', employeeName: 'Player B2', eventId: eventIdB, eventType: 'Singles', location: 'Hitech City' },
  ]);

  const matchesB = await fallbackStore.generateFixtures(eventIdB);
  assert.equal(matchesB.length, 1);
  // Tournament B must start at Match 1, not continue from Tournament A's Match 3 or 4
  assert.equal(matchesB[0].meta.match_number, 1);
});

test('Doubles multi-event rules: allows Player X in Double A (X+Y) and Double B (X+Z) with different partners', async () => {
  const eventDoubleA = 'event-double-a';
  const eventDoubleB = 'event-double-b';

  await fallbackStore.addEvent({ id: eventDoubleA, tournamentId: 't-multi-doubles', name: 'Double A', type: 'Doubles', game: 'Badminton', meta: {} });
  await fallbackStore.addEvent({ id: eventDoubleB, tournamentId: 't-multi-doubles', name: 'Double B', type: 'Doubles', game: 'Table Tennis', meta: {} });

  // 1. Register X + Y in Double A (Allowed)
  const regA = await fallbackStore.addRegistrations([{
    employeeId: 'SG-X',
    partnerId: 'SG-Y',
    employeeName: 'Player X',
    partnerName: 'Player Y',
    eventId: eventDoubleA,
    eventType: 'Doubles'
  }]);
  assert.equal(regA.length, 2);

  // 2. Register X + Z in Double B (Allowed because different partner in different doubles event)
  const regB = await fallbackStore.addRegistrations([{
    employeeId: 'SG-X',
    partnerId: 'SG-Z',
    employeeName: 'Player X',
    partnerName: 'Player Z',
    eventId: eventDoubleB,
    eventType: 'Doubles'
  }]);
  assert.equal(regB.length, 2);

  // 3. Attempt Double A -> X + Y duplicate (Rejected)
  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'SG-X',
        partnerId: 'SG-Y',
        employeeName: 'Player X',
        partnerName: 'Player Y',
        eventId: eventDoubleA,
        eventType: 'Doubles'
      }]);
    },
    { message: 'This player is already part of another Doubles team for this event.' }
  );

  // 4. Attempt Double A -> Y + X reversed duplicate (Rejected)
  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'SG-Y',
        partnerId: 'SG-X',
        employeeName: 'Player Y',
        partnerName: 'Player X',
        eventId: eventDoubleA,
        eventType: 'Doubles'
      }]);
    },
    { message: 'This player is already part of another Doubles team for this event.' }
  );

  // 5. Attempt Double B -> X + Y (Rejected because X already registered in Double B with Z)
  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'SG-X',
        partnerId: 'SG-Y',
        employeeName: 'Player X',
        partnerName: 'Player Y',
        eventId: eventDoubleB,
        eventType: 'Doubles'
      }]);
    },
    { message: 'This player is already part of another Doubles team for this event.' }
  );

  // 6. Attempt Double C -> X + Y (Rejected because X+Y exact team already registered in Double A)
  const eventDoubleC = 'event-double-c';
  await fallbackStore.addEvent({ id: eventDoubleC, tournamentId: 't-multi-doubles', name: 'Double C', type: 'Doubles', game: 'Carrom', meta: {} });
  await assert.rejects(
    async () => {
      await fallbackStore.addRegistrations([{
        employeeId: 'SG-X',
        partnerId: 'SG-Y',
        employeeName: 'Player X',
        partnerName: 'Player Y',
        eventId: eventDoubleC,
        eventType: 'Doubles'
      }]);
    },
    { message: 'A player must have a different partner in each Doubles event.' }
  );
});
