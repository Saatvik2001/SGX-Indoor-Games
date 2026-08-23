#!/usr/bin/env node
(async()=>{
  const fetch = global.fetch;
  const regs = [];
  for(let i=1;i<=8;i++){
    regs.push({
      employeeId: `EMP${String(i).padStart(2,'0')}`,
      employeeName: `Player ${i}`,
      providedEmployeeId: `PEMP${String(i).padStart(2,'0')}`,
      tournamentId: 'T001',
      eventId: 'E001',
      location: (i%2===0)?'Bangalore':'Hyderabad',
      registrationDate: new Date().toISOString()
    });
  }
  const BASE = process.env.BASE_URL || 'http://127.0.0.1:4003';
  try{
    const r = await fetch(BASE + '/api/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrations: regs }) });
    console.log('status', r.status);
    console.log(await r.text());
  }catch(e){
    console.error('err', e && e.message);
    process.exit(1);
  }
})();
