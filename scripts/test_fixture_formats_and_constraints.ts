const API_BASE = 'http://127.0.0.1:4001/api';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING TOURNAMENT FIXTURE FORMATS & MATHEMATICAL LOGIC');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: 7-PLAYER ROUND ROBIN (ODD - CYCLIC METHOD)
  // --------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 1: 7 Players Round-Robin (Cyclic Method with BYEs)');
  console.log('----------------------------------------------------------------');

  const rr7TournamentId = `T-RR7-${Date.now()}`;
  const rr7EventId = `EV-RR7-${Date.now()}`;

  // Create Event
  await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: rr7TournamentId,
      name: '7-Player Round Robin Championship',
      description: 'Odd player count cyclic test',
      location: 'Hyderabad',
      registrationStartDate: new Date().toISOString(),
      registrationEndDate: new Date().toISOString(),
      tournamentStartDate: new Date().toISOString(),
      tournamentEndDate: new Date().toISOString(),
      status: 'In Progress'
    })
  });

  await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: rr7EventId,
      tournamentId: rr7TournamentId,
      name: 'Table Tennis Singles (7 Players)',
      type: 'Singles',
      game: 'Table Tennis',
      meta: { format: 'Round Robin' }
    })
  });

  const players7 = [
    { id: 'P1', name: 'Alice' },
    { id: 'P2', name: 'Bob' },
    { id: 'P3', name: 'Charlie' },
    { id: 'P4', name: 'Diana' },
    { id: 'P5', name: 'Ethan' },
    { id: 'P6', name: 'Fiona' },
    { id: 'P7', name: 'George' }
  ];

  await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registrations: players7.map(p => ({
        employeeId: p.id,
        providedEmployeeId: p.id,
        employeeName: p.name,
        tournamentId: rr7TournamentId,
        eventId: rr7EventId,
        eventType: 'Singles',
        location: 'Hyderabad',
        registrationDate: new Date().toISOString()
      }))
    })
  });

  // Generate Fixtures as Round Robin
  const genRR7 = await fetch(`${API_BASE}/fixtures/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: rr7EventId,
      format: 'Round Robin',
      perLocationPlayerIds: { Hyderabad: players7.map(p => p.id) }
    })
  });
  const rr7Data = await genRR7.json();

  console.log(`✓ Fixtures generated: ${rr7Data.matches?.length} matches.`);

  // Validation: Total matches must be N * (N - 1) / 2 = 21
  if (rr7Data.matches?.length !== 21) {
    throw new Error(`Expected exactly 21 matches for 7 players, got ${rr7Data.matches?.length}`);
  }

  // Group by round
  const matchesByRound: Record<number, any[]> = {};
  const byePlayersPerRound: string[] = [];

  for (const m of rr7Data.matches) {
    const r = m.meta?.round_number || m.roundLevel + 1;
    matchesByRound[r] = matchesByRound[r] || [];
    matchesByRound[r].push(m);
    if (m.meta?.bye_player && !byePlayersPerRound.includes(m.meta.bye_player)) {
      byePlayersPerRound.push(m.meta.bye_player);
    }
  }

  const roundsCount = Object.keys(matchesByRound).length;
  console.log(`✓ Total Rounds: ${roundsCount} (Expected: 7)`);
  if (roundsCount !== 7) throw new Error(`Expected 7 rounds, got ${roundsCount}`);

  for (let r = 1; r <= 7; r++) {
    const roundMatches = matchesByRound[r] || [];
    if (roundMatches.length !== 3) {
      throw new Error(`Round ${r} expected 3 matches, got ${roundMatches.length}`);
    }
    const byeP = roundMatches[0]?.meta?.bye_player;
    console.log(`  - Round ${r}: 3 matches | Rest Day (BYE): ${byeP}`);
  }

  // Check that all 7 players received exactly 1 BYE across the 7 rounds
  if (byePlayersPerRound.length !== 7) {
    throw new Error(`Expected all 7 players to receive 1 BYE, found ${byePlayersPerRound.length}`);
  }
  console.log(`✓ All 7 players receive exactly 1 cyclic BYE: ${byePlayersPerRound.join(', ')}`);

  // Verify pair occurrences: every pair (u, v) must meet exactly once
  const pairCounts = new Map<string, number>();
  for (const m of rr7Data.matches) {
    const p1 = m.player1_id;
    const p2 = m.player2_id;
    const key = [p1, p2].sort().join(' vs ');
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  if (pairCounts.size !== 21) {
    throw new Error(`Expected 21 unique pairings, got ${pairCounts.size}`);
  }
  for (const [pair, count] of pairCounts.entries()) {
    if (count !== 1) throw new Error(`Pair ${pair} played ${count} times instead of 1`);
  }
  console.log('✓ Every participant plays every other participant exactly once (21 unique matchups).');

  // --------------------------------------------------------------------------
  // TEST 2: 7-PLAYER SINGLE ELIMINATION (KNOCKOUT WITH 1 BYE)
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('TEST 2: 7 Players Single Elimination (Upper/Lower Half + BYE Math)');
  console.log('----------------------------------------------------------------');

  const ko7TournamentId = `T-KO7-${Date.now()}`;
  const ko7EventId = `EV-KO7-${Date.now()}`;

  await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ko7TournamentId,
      name: '7-Player Knockout Championship',
      description: 'Single elimination odd count test',
      location: 'Hyderabad',
      registrationStartDate: new Date().toISOString(),
      registrationEndDate: new Date().toISOString(),
      tournamentStartDate: new Date().toISOString(),
      tournamentEndDate: new Date().toISOString(),
      status: 'In Progress'
    })
  });

  await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ko7EventId,
      tournamentId: ko7TournamentId,
      name: 'Badminton Knockout (7 Players)',
      type: 'Singles',
      game: 'Badminton',
      meta: { format: 'Single Elimination' }
    })
  });

  await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registrations: players7.map(p => ({
        employeeId: p.id,
        providedEmployeeId: p.id,
        employeeName: p.name,
        tournamentId: ko7TournamentId,
        eventId: ko7EventId,
        eventType: 'Singles',
        location: 'Hyderabad',
        registrationDate: new Date().toISOString()
      }))
    })
  });

  const genKO7 = await fetch(`${API_BASE}/fixtures/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: ko7EventId,
      format: 'Single Elimination',
      perLocationPlayerIds: { Hyderabad: players7.map(p => p.id) }
    })
  });
  const ko7Data = await genKO7.json();

  console.log(`✓ Fixtures generated: ${ko7Data.matches?.length} bracket match slots.`);

  // Validation: Bracket slot count is 4 (R1) + 2 (Semis) + 1 (Final) = 7 match records (including the completed BYE slot)
  const r1Matches = ko7Data.matches.filter((m: any) => Number(m.meta?.round_level ?? 0) === 0);
  const semiMatches = ko7Data.matches.filter((m: any) => Number(m.meta?.round_level ?? 0) === 1);
  const finalMatches = ko7Data.matches.filter((m: any) => Number(m.meta?.round_level ?? 0) === 2);

  if (r1Matches.length !== 4) throw new Error(`Expected 4 Round 1 slots, got ${r1Matches.length}`);
  if (semiMatches.length !== 2) throw new Error(`Expected 2 Semi Final slots, got ${semiMatches.length}`);
  if (finalMatches.length !== 1) throw new Error(`Expected 1 Final slot, got ${finalMatches.length}`);

  // Check BYE in Round 1
  const byeMatch = r1Matches.find((m: any) => m.meta?.is_bye);
  if (!byeMatch) throw new Error('Expected 1 BYE match in Round 1');
  console.log(`✓ 1 BYE awarded in Round 1 to: ${byeMatch.player1_id} (${byeMatch.meta?.half})`);

  // Check auto-advancement of BYE recipient to Round 2 (Semi-Final)
  const semiWithByePlayer = semiMatches.find((m: any) => m.player1_id === byeMatch.player1_id || m.player2_id === byeMatch.player1_id);
  if (!semiWithByePlayer) {
    throw new Error(`Expected BYE recipient ${byeMatch.player1_id} to be auto-advanced to Semi-Final`);
  }
  console.log(`✓ BYE recipient ${byeMatch.player1_id} was automatically placed into Semi-Final #${semiWithByePlayer.id}!`);

  // Check Upper Half and Lower Half labels
  const upperHalfMatches = r1Matches.filter((m: any) => m.meta?.half === 'Upper Half');
  const lowerHalfMatches = r1Matches.filter((m: any) => m.meta?.half === 'Lower Half');
  console.log(`✓ Upper Half matches: ${upperHalfMatches.length}, Lower Half matches: ${lowerHalfMatches.length}`);
  if (upperHalfMatches.length !== 2 || lowerHalfMatches.length !== 2) {
    throw new Error('Expected 2 Upper Half and 2 Lower Half Round 1 slots');
  }

  // --------------------------------------------------------------------------
  // TEST 3: SUMMARY ENDPOINT TEST
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('TEST 3: Summary Endpoint Statistics');
  console.log('----------------------------------------------------------------');

  const summaryRes = await fetch(`${API_BASE}/fixtures/summary/${rr7EventId}`);
  const summary = await summaryRes.json();
  console.log('✓ Summary stats for 7-Player Round Robin:', summary);

  if (summary.totalPlayers !== 7 || summary.totalRounds !== 7 || summary.totalMatches !== 21 || summary.byesCount !== 7) {
    throw new Error('Summary stats mismatch for 7-Player Round Robin');
  }

  const summaryKO = await (await fetch(`${API_BASE}/fixtures/summary/${ko7EventId}`)).json();
  console.log('✓ Summary stats for 7-Player Knockout:', summaryKO);
  if (summaryKO.totalPlayers !== 7 || summaryKO.totalRounds !== 3 || summaryKO.totalMatches !== 6 || summaryKO.byesCount !== 1) {
    throw new Error('Summary stats mismatch for 7-Player Knockout');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL FIXTURE FORMAT & MATHEMATICAL CONSTRAINT TESTS PASSED!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
