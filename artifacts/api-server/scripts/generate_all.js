(async()=>{
  const regsRes = await fetch('http://127.0.0.1:4003/api/registrations?eventId=E001');
  const regs = await regsRes.json();
  const ids = regs.map(r=>String(r.id));
  console.log('ids', ids);
  const res = await fetch('http://127.0.0.1:4004/api/fixtures/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:'E001', perLocationPlayerIds: { All: ids }})});
  console.log('status',res.status);
  console.log(await res.text());
})();
