#!/usr/bin/env node
(async ()=>{
  const baseRegsUrl = process.env.REG_BASE || 'http://127.0.0.1:4003';
  const targetBase = process.env.BASE_URL || 'http://127.0.0.1:4004';
  try {
    const regsRes = await fetch(baseRegsUrl + '/api/registrations?eventId=E001');
    const regs = await regsRes.json();
    const perLocation = {};
    for (const r of regs) {
      if (!perLocation[r.location]) perLocation[r.location] = [];
      perLocation[r.location].push(r.id);
    }
    console.log('perLocation', perLocation);
    const res = await fetch(targetBase + '/api/fixtures/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: 'E001', perLocationPlayerIds: perLocation })
    });
    console.log('status', res.status);
    console.log(await res.text());
  } catch (e) {
    console.error('err', e && e.stack);
    process.exit(1);
  }
})();
