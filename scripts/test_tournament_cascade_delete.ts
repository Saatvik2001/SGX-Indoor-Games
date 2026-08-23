const API_BASE = 'http://127.0.0.1:4001/api';

async function testCascadeDelete() {
  console.log('================================================================');
  console.log('🧪 VERIFYING TOURNAMENT CASCADING DELETION');
  console.log('================================================================\n');

  const tId = `T-CASCADE-${Date.now()}`;
  const ev1Id = `EV-C1-${Date.now()}`;
  const ev2Id = `EV-C2-${Date.now()}`;

  // 1. Create Tournament
  console.log('1. Creating Tournament:', tId);
  const tRes = await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: tId,
      name: 'Cascading Delete Test Tournament',
      description: 'Testing full deletion of events, matches, and registrations',
      location: 'Hyderabad & Bangalore',
      registrationStartDate: new Date().toISOString(),
      registrationEndDate: new Date().toISOString(),
      tournamentStartDate: new Date().toISOString(),
      tournamentEndDate: new Date().toISOString(),
      status: 'Completed'
    })
  });
  if (!tRes.ok) throw new Error('Failed to create tournament');
  console.log('✓ Tournament created.');

  // 2. Create 2 Events under this Tournament
  console.log('2. Creating 2 Events under this Tournament...');
  await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ev1Id,
      tournamentId: tId,
      name: 'Table Tennis - Hyderabad',
      type: 'Singles',
      game: 'Table Tennis',
      meta: { location: 'Hyderabad' }
    })
  });

  await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ev2Id,
      tournamentId: tId,
      name: 'Table Tennis - Bangalore',
      type: 'Singles',
      game: 'Table Tennis',
      meta: { location: 'Bangalore' }
    })
  });
  console.log('✓ Both events created.');

  // 3. Register participants for both events
  console.log('3. Registering participants...');
  await fetch(`${API_BASE}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registrations: [
        {
          employeeId: 'TEST-P1',
          providedEmployeeId: 'TEST-P1',
          employeeName: 'Player One',
          tournamentId: tId,
          eventId: ev1Id,
          eventType: 'Singles',
          location: 'Hyderabad',
          registrationDate: new Date().toISOString()
        },
        {
          employeeId: 'TEST-P2',
          providedEmployeeId: 'TEST-P2',
          employeeName: 'Player Two',
          tournamentId: tId,
          eventId: ev1Id,
          eventType: 'Singles',
          location: 'Hyderabad',
          registrationDate: new Date().toISOString()
        },
        {
          employeeId: 'TEST-P3',
          providedEmployeeId: 'TEST-P3',
          employeeName: 'Player Three',
          tournamentId: tId,
          eventId: ev2Id,
          eventType: 'Singles',
          location: 'Bangalore',
          registrationDate: new Date().toISOString()
        },
        {
          employeeId: 'TEST-P4',
          providedEmployeeId: 'TEST-P4',
          employeeName: 'Player Four',
          tournamentId: tId,
          eventId: ev2Id,
          eventType: 'Singles',
          location: 'Bangalore',
          registrationDate: new Date().toISOString()
        }
      ]
    })
  });
  console.log('✓ Participants registered.');

  // 4. Generate fixtures for both events
  console.log('4. Generating fixtures for both events...');
  await fetch(`${API_BASE}/fixtures/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: ev1Id,
      format: 'Single Elimination',
      perLocationPlayerIds: { Hyderabad: ['TEST-P1', 'TEST-P2'] }
    })
  });

  await fetch(`${API_BASE}/fixtures/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId: ev2Id,
      format: 'Single Elimination',
      perLocationPlayerIds: { Bangalore: ['TEST-P3', 'TEST-P4'] }
    })
  });
  console.log('✓ Fixtures generated.');

  // 5. Verify before delete
  const tournsBefore = await (await fetch(`${API_BASE}/tournaments`)).json();
  const evsBefore = await (await fetch(`${API_BASE}/events`)).json();
  const regsBefore = await (await fetch(`${API_BASE}/registrations`)).json();
  const mat1Before = await (await fetch(`${API_BASE}/matches?eventId=${ev1Id}`)).json();

  console.log(`Before delete: Tournament exists: ${tournsBefore.some((t: any) => t.id === tId)}, Events count: ${evsBefore.filter((e: any) => e.tournament_id === tId || e.tournamentId === tId).length}, Matches for ev1: ${mat1Before.length}`);

  // 6. Delete Tournament
  console.log(`\n5. Calling DELETE /api/tournaments/${tId}...`);
  const delRes = await fetch(`${API_BASE}/tournaments/${tId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  console.log('✓ DELETE response:', delData);

  // 7. Verify after delete
  console.log('\n6. Verifying database state after tournament deletion...');
  const tournsAfter = await (await fetch(`${API_BASE}/tournaments`)).json();
  const evsAfter = await (await fetch(`${API_BASE}/events`)).json();
  const regs1After = await (await fetch(`${API_BASE}/registrations?eventId=${ev1Id}`)).json();
  const regs2After = await (await fetch(`${API_BASE}/registrations?eventId=${ev2Id}`)).json();
  const mat1After = await (await fetch(`${API_BASE}/matches?eventId=${ev1Id}`)).json();
  const mat2After = await (await fetch(`${API_BASE}/matches?eventId=${ev2Id}`)).json();

  const tournStillExists = tournsAfter.some((t: any) => t.id === tId);
  const ev1StillExists = evsAfter.some((e: any) => e.id === ev1Id);
  const ev2StillExists = evsAfter.some((e: any) => e.id === ev2Id);

  console.log(`- Tournament exists: ${tournStillExists} (Expected: false)`);
  console.log(`- Event 1 exists: ${ev1StillExists} (Expected: false)`);
  console.log(`- Event 2 exists: ${ev2StillExists} (Expected: false)`);
  console.log(`- Registrations for ev1: ${regs1After.length} (Expected: 0)`);
  console.log(`- Registrations for ev2: ${regs2After.length} (Expected: 0)`);
  console.log(`- Matches for ev1: ${mat1After.length} (Expected: 0)`);
  console.log(`- Matches for ev2: ${mat2After.length} (Expected: 0)`);

  if (tournStillExists || ev1StillExists || ev2StillExists || regs1After.length > 0 || regs2After.length > 0 || mat1After.length > 0 || mat2After.length > 0) {
    throw new Error('Cascading deletion failed! Residual records found.');
  }

  console.log('\n================================================================');
  console.log('🎉 CASCADING DELETION VERIFICATION PASSED 100%!');
  console.log('================================================================\n');
}

testCascadeDelete().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
