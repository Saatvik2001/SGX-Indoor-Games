import fs from 'fs/promises';
import path from 'path';

const storePath = path.resolve('artifacts/api-server/.store.json');

async function load() {
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { registrations: [], matches: [], events: [], tournaments: [] };
  }
}

async function save(state) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(state, null, 2), 'utf8');
}

function makeRegistration(id, employeeId, name, eventId, location) {
  return {
    id,
    employee_id: employeeId,
    provided_employee_id: employeeId,
    employee_name: name,
    department: null,
    tournament_id: 'T001',
    event_id: eventId,
    partner_id: null,
    location,
    registration_date: new Date().toISOString()
  };
}

function createFixtures(state, eventId, perLocation) {
  // remove existing matches for event
  state.matches = state.matches.filter(m => m.event_id !== eventId);
  const roundNames = ['Round 1', 'Quarter Final', 'Semi Final', 'Final'];
  const generated = [];
  let nextId = state.matches.reduce((m, r) => Math.max(m, r.id), 0) + 1;

  const createRoundMatches = (roundName, playerIds, location) => {
    const round = [];
    for (let i = 0; i < playerIds.length; i += 2) {
      const p1 = playerIds[i] ?? '';
      const p2 = playerIds[i+1] ?? null;
      const match = {
        id: nextId++,
        event_id: eventId,
        round: roundName,
        player1_id: p1,
        player2_id: p2,
        winner_id: null,
        status: 'Pending',
        scheduled_date: null,
        meta: { location, bracket_index: Math.floor(i/2) }
      };
      round.push(match);
      generated.push(match);
    }
    return round;
  };

  for (const [location, players] of Object.entries(perLocation)) {
    const round1 = createRoundMatches('Round 1', players.filter(Boolean), location);
    let current = round1;
    let idx = 1;
    // Always create placeholder matches up to the final so next-round slots exist
    while (idx < roundNames.length) {
      const placeholders = Array.from({length: Math.ceil(current.length/2)}, () => null);
      current = createRoundMatches(roundNames[idx], placeholders, location);
      idx++;
    }
  }

  state.matches.push(...generated);
  return state;
}

function propagateWinner(state, matchId, winnerId) {
  const existing = state.matches.find(m => m.id === matchId);
  if (!existing) return state;
  existing.winner_id = winnerId;
  existing.status = 'Completed';
  const reg = state.registrations.find(r => r.event_id === existing.event_id && r.employee_id === winnerId);
  if (reg) {
    existing.meta = { ...existing.meta, winner_name: reg.employee_name, winner_location: reg.location };
  }

  const roundNames = ['Round 1', 'Quarter Final', 'Semi Final', 'Final'];
  const idx = roundNames.indexOf(existing.round);
  if (idx < 0 || idx >= roundNames.length -1) return state;
  const nextRound = roundNames[idx+1];
  const location = String(existing.meta?.location ?? '');
  const bracket = Number(existing.meta?.bracket_index ?? 0);
  const nextMatches = state.matches.filter(m => m.event_id === existing.event_id && m.round === nextRound && String(m.meta?.location ?? '') === location).sort((a,b)=>Number(a.meta?.bracket_index||0)-Number(b.meta?.bracket_index||0));
  const target = nextMatches[Math.floor(bracket/2)];
  if (!target) return state;
  const slot = bracket %2 ===0 ? 'player1_id' : 'player2_id';
  target[slot] = winnerId;
  return state;
}

(async function main(){
  const state = await load();
  console.log('Initial counts:', state.registrations.length, 'regs,', state.matches.length, 'matches');

  // add registrations
  const startId = state.registrations.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  state.registrations.push(makeRegistration(startId, 'U1', 'Alice', 'E001', 'Hyderabad'));
  state.registrations.push(makeRegistration(startId+1, 'U2', 'Bob', 'E001', 'Hyderabad'));
  state.registrations.push(makeRegistration(startId+2, 'U3', 'Carol', 'E001', 'Bangalore'));
  state.registrations.push(makeRegistration(startId+3, 'U4', 'Dave', 'E001', 'Bangalore'));

  console.log('Added 4 registrations.');

  createFixtures(state, 'E001', { Hyderabad: ['U1','U2'], Bangalore: ['U3','U4'] });

  console.log('Generated matches count now:', state.matches.length);

  // find a Round 1 match in Hyderabad
  const r1 = state.matches.find(m => m.event_id==='E001' && m.round==='Round 1' && m.meta.location==='Hyderabad');
  if (!r1) { console.error('No Round1 match found'); await save(state); return; }
  console.log('Round1 match:', r1.id, r1.player1_id, 'vs', r1.player2_id);

  propagateWinner(state, r1.id, r1.player1_id);
  console.log('Propagated winner', r1.player1_id, 'from match', r1.id);

  // find corresponding quarter match in Hyderabad
  const qMatches = state.matches.filter(m => m.event_id==='E001' && m.round==='Quarter Final' && m.meta.location==='Hyderabad').sort((a,b)=>Number(a.meta.bracket_index)-Number(b.meta.bracket_index));
  console.log('Quarter matches in Hyderabad:', qMatches.map(m=>({id:m.id, p1:m.player1_id, p2:m.player2_id, meta:m.meta}))); 

  // schedule a quarter match
  const q = qMatches[0];
  const scheduled_date = new Date().toISOString();
  q.scheduled_date = scheduled_date;
  q.meta = { ...q.meta, scheduled_time: '10:00', venue: 'Court A' };
  q.status = 'Scheduled';

  await save(state);
  console.log('Saved state. Wrote to', storePath);
  console.log('Final quarter match:', q.id, 'players:', q.player1_id, q.player2_id, 'scheduled:', q.scheduled_date, q.meta);
})();
