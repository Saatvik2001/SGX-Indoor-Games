const API_BASE = 'http://127.0.0.1:4001/api';


async function runTest() {
  console.log('--- Starting Complete Tournament Workflow Verification ---');

  // Step 1: Create an Event
  const testTournamentId = `T-WF-${Date.now()}`;
  const testEventId = `EV-BADMINTON-8P-${Date.now()}`;

  console.log(`\n1. Creating Tournament and Event: ${testEventId}...`);
  const tournRes = await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testTournamentId,
      name: 'Corporate Annual Tournament 2026',
      description: 'End-to-End Tournament Workflow Test',
      location: 'Hyderabad',
      registrationStartDate: new Date().toISOString(),
      registrationEndDate: new Date().toISOString(),
      tournamentStartDate: new Date().toISOString(),
      tournamentEndDate: new Date().toISOString(),
      status: 'In Progress'
    })
  });
  if (!tournRes.ok) throw new Error('Failed to create tournament');

  const evRes = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testEventId,
      tournamentId: testTournamentId,
      name: 'Badminton Championship (8 Players)',
      type: 'Singles',
      game: 'Badminton'
    })
  });
  if (!evRes.ok) throw new Error('Failed to create event');
  console.log('✓ Step 1 Passed: Event created successfully.');

  // Step 2: Register 8 participants
  console.log('\n2. Registering 8 distinct participants with real names and Employee IDs...');
  const participants = [
    { id: 'EMP-001', name: 'Alice Smith', dept: 'Engineering' },
    { id: 'EMP-002', name: 'Bob Jones', dept: 'Design' },
    { id: 'EMP-003', name: 'Charlie Brown', dept: 'Marketing' },
    { id: 'EMP-004', name: 'Diana Prince', dept: 'Finance' },
    { id: 'EMP-005', name: 'Ethan Hunt', dept: 'Operations' },
    { id: 'EMP-006', name: 'Fiona Gallagher', dept: 'HR' },
    { id: 'EMP-007', name: 'George Clark', dept: 'Sales' },
    { id: 'EMP-008', name: 'Hannah Abbott', dept: 'Legal' },
  ];

  const regPayloads = participants.map(p => ({
    employeeId: p.id,
    providedEmployeeId: p.id,
    employeeName: p.name,
    department: p.dept,
    tournamentId: testTournamentId,
    eventId: testEventId,
    eventType: 'Singles',
    location: 'Hyderabad',
    registrationDate: new Date().toISOString()
  }));

  const regRes = await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrations: regPayloads })
  });
  if (!regRes.ok) throw new Error('Failed to register participants');

  const regListRes = await fetch(`${API_BASE}/registrations?eventId=${testEventId}`);
  const registeredRows = await regListRes.json();
  if (registeredRows.length !== 8) {
    throw new Error(`Expected 8 registrations, got ${registeredRows.length}`);
  }
  console.log(`✓ Step 2 Passed: ${registeredRows.length} participants registered in database.`);

  // Step 3: Generate Fixtures
  console.log('\n3. Generating Fixtures for event...');
  const genRes = await fetch(`${API_BASE}/fixtures/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: testEventId,
      perLocationPlayerIds: {
        Hyderabad: participants.map(p => p.id)
      }
    })
  });
  if (!genRes.ok) throw new Error('Failed to generate fixtures');
  const genData = await genRes.json();
  console.log(`✓ Step 3 Passed: Fixtures generated. Total matches: ${genData.matches?.length}`);

  // Step 4: Verify all 8 participants appear in Round 1 and next rounds are empty
  console.log('\n4. Verifying Round 1 matches and empty next rounds...');
  const matRes = await fetch(`${API_BASE}/matches?eventId=${testEventId}`);
  const matches = await matRes.json();

  const round1Matches = matches.filter((m: any) => Number(m.meta?.round_level ?? 0) === 0);
  const semiMatches = matches.filter((m: any) => Number(m.meta?.round_level ?? 0) === 1);
  const finalMatches = matches.filter((m: any) => Number(m.meta?.round_level ?? 0) === 2);

  if (round1Matches.length !== 4) throw new Error(`Expected 4 Round 1 matches, got ${round1Matches.length}`);
  if (semiMatches.length !== 2) throw new Error(`Expected 2 Semi Final matches, got ${semiMatches.length}`);
  if (finalMatches.length !== 1) throw new Error(`Expected 1 Final match, got ${finalMatches.length}`);

  const round1PlayerIds = new Set<string>();
  for (const m of round1Matches) {
    if (!m.player1_id || !m.player2_id) throw new Error(`Round 1 match #${m.id} is missing a player`);
    if (m.winner_id) throw new Error(`Round 1 match #${m.id} should NOT have a winner yet`);
    if (m.status === 'Completed') throw new Error(`Round 1 match #${m.id} should NOT be completed`);
    round1PlayerIds.add(m.player1_id);
    round1PlayerIds.add(m.player2_id);
  }

  if (round1PlayerIds.size !== 8) {
    throw new Error(`Expected all 8 distinct participants in Round 1, found ${round1PlayerIds.size}`);
  }

  for (const m of semiMatches) {
    if (m.player1_id || m.player2_id || m.winner_id) {
      throw new Error(`Semi Final match #${m.id} must be empty initially`);
    }
  }
  for (const m of finalMatches) {
    if (m.player1_id || m.player2_id || m.winner_id) {
      throw new Error(`Final match #${m.id} must be empty initially`);
    }
  }
  console.log('✓ Step 4 Passed: All 8 participants placed in Round 1 matches, next rounds are strictly empty.');

  // Step 5: Manually schedule matches
  console.log('\n5. Manually scheduling Round 1 Match #1...');
  const matchToSchedule = round1Matches[0];
  const schedDate = '2026-08-25';
  const schedTime = '14:30';
  const schedVenue = 'Court A - Main Badminton Hall';

  const schedRes = await fetch(`${API_BASE}/matches/${matchToSchedule.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduled_date: new Date(`${schedDate}T${schedTime}`).toISOString(),
      scheduled_time: schedTime,
      venue: schedVenue,
      status: 'Scheduled'
    })
  });
  if (!schedRes.ok) throw new Error('Failed to save schedule');
  const schedData = await schedRes.json();
  if (schedData.updated.status !== 'Scheduled') throw new Error('Match status was not updated to Scheduled');
  if (schedData.updated.meta.venue !== schedVenue) throw new Error('Venue not saved in match meta');
  console.log(`✓ Step 5 Passed: Match #${matchToSchedule.id} scheduled for ${schedDate} at ${schedTime} in ${schedVenue}.`);

  // Step 6: Manually select winner of each Round 1 match
  console.log('\n6. Manually selecting winners for all 4 Round 1 matches...');
  const round1Winners: string[] = [];

  // Sort Round 1 matches by bracket_index
  const sortedR1 = round1Matches.slice().sort((a: any, b: any) => Number(a.meta?.bracket_index ?? 0) - Number(b.meta?.bracket_index ?? 0));

  for (let i = 0; i < sortedR1.length; i++) {
    const m = sortedR1[i];
    const chosenWinner = m.player1_id; // Pick player 1 as winner
    round1Winners.push(chosenWinner);

    const winRes = await fetch(`${API_BASE}/matches/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner_id: chosenWinner,
        status: 'Completed',
        score: '21-18, 21-15'
      })
    });
    if (!winRes.ok) throw new Error(`Failed to save winner for match #${m.id}`);
  }
  console.log(`✓ Step 6 Passed: Round 1 winners selected and saved: ${round1Winners.join(', ')}`);

  // Step 7: Verify selected winners advance to Semi Finals
  console.log('\n7. Verifying Semi Final matchups after Round 1 advancement...');
  const semiAfterRes = await fetch(`${API_BASE}/matches?eventId=${testEventId}`);
  const semiAfterMatches = (await semiAfterRes.json())
    .filter((m: any) => Number(m.meta?.round_level ?? 0) === 1)
    .sort((a: any, b: any) => Number(a.meta?.bracket_index ?? 0) - Number(b.meta?.bracket_index ?? 0));

  if (semiAfterMatches[0].player1_id !== round1Winners[0] || semiAfterMatches[0].player2_id !== round1Winners[1]) {
    throw new Error(`Semi Final 1 mismatch: expected ${round1Winners[0]} vs ${round1Winners[1]}, got ${semiAfterMatches[0].player1_id} vs ${semiAfterMatches[0].player2_id}`);
  }
  if (semiAfterMatches[1].player1_id !== round1Winners[2] || semiAfterMatches[1].player2_id !== round1Winners[3]) {
    throw new Error(`Semi Final 2 mismatch: expected ${round1Winners[2]} vs ${round1Winners[3]}, got ${semiAfterMatches[1].player1_id} vs ${semiAfterMatches[1].player2_id}`);
  }
  console.log(`✓ Step 7 Passed: Semi Finals properly populated with ${round1Winners[0]} vs ${round1Winners[1]} and ${round1Winners[2]} vs ${round1Winners[3]}`);

  // Step 8: Select winners in Semi Finals and verify advancement to Final match
  console.log('\n8. Selecting Semi Final winners...');
  const semiWinners = [semiAfterMatches[0].player1_id, semiAfterMatches[1].player1_id];

  for (let i = 0; i < semiAfterMatches.length; i++) {
    const sm = semiAfterMatches[i];
    const winRes = await fetch(`${API_BASE}/matches/${sm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner_id: semiWinners[i],
        status: 'Completed',
        score: '21-14, 21-19'
      })
    });
    if (!winRes.ok) throw new Error(`Failed to save winner for Semi Final #${sm.id}`);
  }

  const finalAfterRes = await fetch(`${API_BASE}/matches?eventId=${testEventId}`);
  const finalAfterMatch = (await finalAfterRes.json()).find((m: any) => Number(m.meta?.round_level ?? 0) === 2);

  if (finalAfterMatch.player1_id !== semiWinners[0] || finalAfterMatch.player2_id !== semiWinners[1]) {
    throw new Error(`Final match mismatch: expected ${semiWinners[0]} vs ${semiWinners[1]}, got ${finalAfterMatch.player1_id} vs ${finalAfterMatch.player2_id}`);
  }
  console.log(`✓ Step 8 Passed: Final match created with finalists ${semiWinners[0]} vs ${semiWinners[1]}`);

  // Step 9: Final Winner Selection and Champion Declaration
  console.log('\n9. Selecting Final match winner and declaring Champion...');
  const championWinnerId = semiWinners[0];
  const runnerUpId = semiWinners[1];

  const finalWinRes = await fetch(`${API_BASE}/matches/${finalAfterMatch.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      winner_id: championWinnerId,
      status: 'Completed',
      score: '21-19, 18-21, 21-17'
    })
  });
  if (!finalWinRes.ok) throw new Error('Failed to save Final match winner');

  const completedFinalRes = await fetch(`${API_BASE}/matches?eventId=${testEventId}`);
  const completedFinalMatch = (await completedFinalRes.json()).find((m: any) => Number(m.meta?.round_level ?? 0) === 2);

  if (completedFinalMatch.winner_id !== championWinnerId) {
    throw new Error(`Final match winner is ${completedFinalMatch.winner_id}, expected ${championWinnerId}`);
  }

  const tournStatusRes = await fetch(`${API_BASE}/tournaments`);
  const tournaments = await tournStatusRes.json();
  const testTournament = tournaments.find((t: any) => t.id === testTournamentId);
  if (testTournament?.status !== 'Completed') {
    throw new Error(`Tournament status is ${testTournament?.status}, expected Completed`);
  }

  console.log(`✓ Step 9 Passed: Champion declared as ${completedFinalMatch.meta?.champion_name || championWinnerId}!`);
  console.log(`✓ Runner-Up: ${completedFinalMatch.meta?.runner_up_name || runnerUpId}`);
  console.log(`✓ Tournament Status: ${testTournament?.status}`);

  console.log('\n🎉 ALL 9 VERIFICATION STEPS PASSED SUCCESSFULLY! Real DB integration verified.');
}

runTest().catch((err) => {
  console.error('\n❌ Workflow test failed:', err);
  process.exit(1);
});
