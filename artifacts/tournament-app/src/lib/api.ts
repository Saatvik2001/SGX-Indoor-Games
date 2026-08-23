export interface AppEvent {
  id: string;
  tournamentId: string;
  name: string;
  type: 'Singles' | 'Doubles';
  game: string;
  format?: 'Single Elimination' | 'Round Robin' | 'Double Elimination';
  meta?: Record<string, unknown>;
}

export interface AppTournament {
  id: string;
  name: string;
  description: string;
  location: string;
  registrationStartDate: string;
  registrationEndDate: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  status: string;
}

export interface AppRegistration {
  id: string;
  employeeId: string;
  providedEmployeeId: string;
  employeeName: string;
  department?: string | null;
  tournamentId: string;
  eventId: string;
  partnerId?: string | null;
  location: string;
  registrationDate: string;
}

export interface AppMatch {
  id: string; // "M123"
  numericId: number;
  eventId: string;
  round: string;
  roundLevel: number;
  player1Id: string;
  player2Id?: string | null;
  winnerId?: string | null;
  status: 'Pending' | 'Scheduled' | 'Completed';
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  venue?: string | null;
  score?: string | null;
  location?: string | null;
  meta: {
    format?: 'Single Elimination' | 'Round Robin' | 'Double Elimination';
    half?: 'Upper Half' | 'Lower Half';
    bracket_index?: number;
    round_level?: number;
    round_number?: number;
    match_number?: number;
    is_bye?: boolean;
    bye_player?: string | null;
    winner_name?: string;
    champion_name?: string;
    runner_up_name?: string;
    [key: string]: any;
  };
}

export interface TournamentSummaryStats {
  totalPlayers: number;
  format: 'Single Elimination' | 'Round Robin' | 'Double Elimination';
  totalRounds: number;
  totalMatches: number;
  byesCount: number;
  upperHalfCount?: number;
  lowerHalfCount?: number;
}

const RAW_API_BASE = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_API_URL || '') : '';
export const API_BASE = RAW_API_BASE.replace(/\/$/, '');

export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith('http')) return endpoint;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE) {
    return `${API_BASE}${cleanEndpoint}`;
  }
  return cleanEndpoint;
}

export async function fetchEvents(): Promise<AppEvent[]> {
  try {
    const res = await fetch(apiUrl('/api/events'));
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any) => {
      const meta = typeof r.meta === 'string' ? JSON.parse(r.meta || '{}') : (r.meta || {});
      return {
        id: r.id,
        tournamentId: r.tournament_id || r.tournamentId || 'T001',
        name: r.name,
        type: r.type || 'Singles',
        game: r.game || 'Indoor Game',
        format: meta.format || 'Single Elimination',
        meta
      };
    });
  } catch {
    return [];
  }
}

export async function fetchFixtureSummary(eventId: string): Promise<TournamentSummaryStats | null> {
  try {
    const res = await fetch(apiUrl(`/api/fixtures/summary/${eventId}`));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchTournaments(): Promise<AppTournament[]> {
  try {
    const res = await fetch(apiUrl('/api/tournaments'));
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || 'Corporate championship tournament',
      location: r.location || 'Irrum Manzil & Hitech City',
      registrationStartDate: r.registration_start_date || r.registrationStartDate || new Date().toISOString(),
      registrationEndDate: r.registration_end_date || r.registrationEndDate || new Date().toISOString(),
      tournamentStartDate: r.tournament_start_date || r.tournamentStartDate || new Date().toISOString(),
      tournamentEndDate: r.tournament_end_date || r.tournamentEndDate || new Date().toISOString(),
      status: r.status || 'In Progress'
    }));
  } catch {
    return [];
  }
}

export async function fetchRegistrations(eventId?: string, location?: string): Promise<AppRegistration[]> {
  try {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    if (location && location !== 'All') params.set('location', location);
    const url = `/api/registrations${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(apiUrl(url));
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any) => ({
      id: String(r.id),
      employeeId: r.employee_id || String(r.id),
      providedEmployeeId: r.provided_employee_id || r.employee_id || String(r.id),
      employeeName: r.employee_name || 'Participant',
      department: r.department,
      tournamentId: r.tournament_id || 'T001',
      eventId: r.event_id,
      partnerId: r.partner_id,
      location: r.location || 'Unknown',
      registrationDate: r.registration_date || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchMatches(eventId?: string): Promise<AppMatch[]> {
  try {
    const url = eventId ? `/api/matches?eventId=${eventId}` : '/api/matches';
    const res = await fetch(apiUrl(url));
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((r: any) => {
      let meta = r.meta;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { meta = {}; }
      }
      meta = typeof meta === 'object' && meta !== null ? meta : {};

      return {
        id: `M${r.id}`,
        numericId: Number(r.id),
        eventId: r.event_id,
        round: r.round,
        roundLevel: Number(meta.round_level ?? 0),
        player1Id: r.player1_id || '',
        player2Id: r.player2_id || null,
        winnerId: r.winner_id || null,
        status: (r.status as any) || 'Pending',
        scheduledDate: r.scheduled_date || null,
        scheduledTime: meta.scheduled_time || null,
        venue: meta.venue || null,
        score: meta.score || null,
        location: meta.location || null,
        meta
      };
    });
  } catch {
    return [];
  }
}

export function getParticipantDisplay(
  playerId: string | null | undefined,
  registrations: AppRegistration[]
): { name: string; id: string; display: string; hasPlayer: boolean } {
  if (!playerId || playerId.trim() === '' || playerId.startsWith('BYE_')) {
    return { name: 'TBD', id: '', display: 'TBD', hasPlayer: false };
  }

  const reg = registrations.find(
    r => r.employeeId === playerId || r.providedEmployeeId === playerId || r.id === playerId
  );

  if (reg) {
    const empId = reg.providedEmployeeId || reg.employeeId;
    return {
      name: reg.employeeName,
      id: empId,
      display: `${reg.employeeName} (${empId})`,
      hasPlayer: true
    };
  }

  return {
    name: playerId,
    id: playerId,
    display: playerId,
    hasPlayer: true
  };
}

export async function saveMatchWinner(numericId: number, winnerId: string): Promise<boolean> {
  const res = await fetch(`/api/matches/${numericId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      winner_id: winnerId,
      status: 'Completed'
    })
  });
  return res.ok;
}

export async function saveMatchSchedule(
  numericId: number,
  scheduledDate: string,
  scheduledTime: string,
  venue: string
): Promise<boolean> {
  const res = await fetch(`/api/matches/${numericId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduled_date: scheduledDate ? new Date(`${scheduledDate}T${scheduledTime || '00:00'}`).toISOString() : null,
      scheduled_time: scheduledTime,
      venue,
      status: 'Scheduled',
      meta: {
        scheduled_time: scheduledTime,
        venue
      }
    })
  });
  return res.ok;
}
