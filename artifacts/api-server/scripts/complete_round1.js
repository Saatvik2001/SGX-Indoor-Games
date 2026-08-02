(async ()=>{
  const res = await fetch('http://127.0.0.1:4004/api/matches?eventId=E001');
  const matches = await res.json();
  const round1 = matches.filter(m=>m.round==='Round 1');
  for(const m of round1){
    const winner = m.player1_id || m.player1;
    if(!winner) continue;
    const r = await fetch(`http://127.0.0.1:4004/api/matches/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winner_id: winner, score: '11-5', status: 'Completed' }) });
    console.log('updated', m.id, 'status', r.status);
    console.log(await r.text());
  }
})();
