#!/usr/bin/env node
(async function(){
  const BASE = process.env.BASE_URL || 'http://127.0.0.1:4001';
  const wait = ms => new Promise(r=>setTimeout(r,ms));
  const tryFetch = async (url, opts) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; } catch(e) { return { ok: res.ok, status: res.status, text }; }
  };

  console.log('Waiting for API at', BASE);
  for(let i=0;i<30;i++){
    try{
      try{
        const r = await fetch(BASE + '/api/healthz');
        console.log('health attempt', i, 'status', r.status);
        if(r && r.ok){ console.log('API healthy'); break; }
      }catch(err){
        console.log('health attempt', i, 'error', err && err.message);
      }
    }catch(e){}
    await wait(1000);
    if(i===29){ console.error('API did not respond in time'); process.exit(1); }
  }

  const registrations = [];
  const count = Number(process.env.PARTICIPANT_COUNT || 8);
  for(let i=1;i<=count;i++){
    const payload = {
      employeeId: `EMP${String(i).padStart(2,'0')}`,
      employeeName: `Player ${i}`,
      providedEmployeeId: `PEMP${String(i).padStart(2,'0')}`,
      tournamentId: 'T001',
      eventId: 'E001',
      location: (i%2===0)?'Bangalore':'Hyderabad',
      registrationDate: new Date().toISOString()
    };
    console.log('Creating registration', payload.employeeId, payload.location);
    const res = await tryFetch(BASE + '/api/registrations', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    if(!res.ok){ console.error('Failed to create registration', res.status, res.json || res.text); process.exit(1); }
    const created = res.json || res;
    // try common shapes
    const id = (created && (created.id || created.registration?.id || created.registration_id || created.data?.id)) || null;
    registrations.push({ raw: created, id, payload });
    await wait(200);
  }

  console.log('Fetching registrations for event E001');
  const listRes = await tryFetch(BASE + '/api/registrations?eventId=E001');
  if(!listRes.ok){ console.error('Failed to list registrations', listRes); process.exit(1); }
  const list = listRes.json || [];
  const regMap = new Map();
  for(const r of list){ if(r.id) regMap.set(r.id, r); }

  // build perLocationPlayerIds using ids from list if available, else from created responses
  const perLocation = {};
  for(const r of list){ const loc = r.location || r.meta?.location || r.location_name || 'Unknown'; if(!perLocation[loc]) perLocation[loc]=[]; perLocation[loc].push(r.id); }
  if(Object.keys(perLocation).length===0){
    // fallback to created responses
    for(const r of registrations){ const loc = r.payload.location || 'Unknown'; if(!perLocation[loc]) perLocation[loc]=[]; if(r.id) perLocation[loc].push(r.id); }
  }

  console.log('Per-location players:', perLocation);
  console.log('Generating fixtures for event E001');
  const genRes = await tryFetch(BASE + '/api/fixtures/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ eventId: 'E001', perLocationPlayerIds: perLocation }) });
  if(!genRes.ok){ console.error('Failed to generate fixtures', genRes); process.exit(1); }
  console.log('Fixtures generated:', genRes.json || genRes.text);

  await wait(500);
  const matchesRes = await tryFetch(BASE + '/api/matches?eventId=E001');
  if(!matchesRes.ok){ console.error('Failed to fetch matches', matchesRes); process.exit(1); }
  const matches = matchesRes.json || [];
  console.log('Created matches count:', matches.length);
  if(matches.length===0){ console.error('No matches created'); process.exit(1); }

  const matchToSchedule = matches.find(m=>m.status!=='Completed') || matches[0];
  console.log('Scheduling match id', matchToSchedule.id || matchToSchedule.match_id || matchToSchedule._id);
  const matchId = matchToSchedule.id || matchToSchedule.match_id || matchToSchedule._id;
  const scheduled_date = new Date(Date.now()+3600*1000).toISOString();
  const scheduleRes = await tryFetch(BASE + `/api/matches/${matchId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ scheduled_date, meta: { scheduled_time: '10:00', venue: 'Main Court' }, status: 'Scheduled' })});
  if(!scheduleRes.ok){ console.error('Failed to schedule match', scheduleRes); process.exit(1); }
  console.log('Match scheduled');

  // Enter result: pick player1 or playerA
  const p1 = matchToSchedule.player1_id || matchToSchedule.playerA_id || matchToSchedule.player1;
  const p2 = matchToSchedule.player2_id || matchToSchedule.playerB_id || matchToSchedule.player2;
  const winner = p1 || p2;
  console.log('Submitting result, winner:', winner);
  const resultRes = await tryFetch(BASE + `/api/matches/${matchId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ winner_id: winner, score: '11-5,11-7', status: 'Completed' })});
  if(!resultRes.ok){ console.error('Failed to submit result', resultRes); process.exit(1); }
  console.log('Result submitted');

  // wait a bit for advancement
  await wait(800);
  const finalMatches = await tryFetch(BASE + '/api/matches?eventId=E001');
  const fm = finalMatches.json || [];
  // try to find final round by max round_number
  let championId = null;
  if(fm.length){
    let maxRound = -Infinity;
    for(const m of fm){ if(typeof m.round_number === 'number' && m.round_number>maxRound) maxRound = m.round_number; }
    const finals = fm.filter(m=>m.round_number===maxRound && m.status==='Completed');
    if(finals.length>0){ championId = finals[0].winner_id || finals[0].winner; }
  }
  if(!championId){
    // fallback to most recent completed match winner
    const completed = (fm||[]).filter(m=>m.status==='Completed' && (m.winner_id||m.winner));
    if(completed.length) championId = completed[completed.length-1].winner_id || completed[completed.length-1].winner;
  }

  if(championId){
    console.log('Champion registration id:', championId);
    const regs = await tryFetch(BASE + '/api/registrations?eventId=E001');
    const rr = regs.json || [];
    const champ = rr.find(r=>String(r.id)===String(championId) || String(r.registration_id)===String(championId));
    console.log('Champion details:', champ || 'not found in registrations list');
  } else {
    console.log('Champion could not be determined from matches');
  }
  console.log('E2E flow completed');
  process.exit(0);
})();
