import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RegistrationRecord {
  id: number;
  employee_id: string;
  provided_employee_id: string;
  employee_name: string;
  department: string | null;
  tournament_id: string;
  event_id: string;
  partner_id: string | null;
  location: string;
  registration_date: string;
}

export interface MatchRecord {
  id: number;
  event_id: string;
  round: string;
  player1_id: string;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
  scheduled_date: string | null;
  meta: Record<string, unknown>;
}

interface EventRecord {
  id: string;
  tournament_id: string;
  name: string;
  type: string;
  game: string;
  meta: Record<string, unknown>;
}

interface TournamentRecord {
  id: string;
  name: string;
  description: string;
  location: string;
  registration_start_date: string;
  registration_end_date: string;
  tournament_start_date: string;
  tournament_end_date: string;
  status: string;
}

interface PersistedState {
  registrations: RegistrationRecord[];
  matches: MatchRecord[];
  events: EventRecord[];
  tournaments: TournamentRecord[];
}

class FileFallbackStore {
  private readonly filePath: string;
  private state: PersistedState = { registrations: [], matches: [], events: [], tournaments: [] };
  private initialized = false;

  constructor() {
    const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    this.filePath = path.join(baseDir, '.store.json');
  }

  private async ensureLoaded() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        this.state = {
          registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
          matches: Array.isArray(parsed.matches) ? parsed.matches : [],
          events: Array.isArray(parsed.events) ? parsed.events : [],
          tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : [],
        };
      }
    } catch {
      this.state = { registrations: [], matches: [], events: [], tournaments: [] };
    }
  }

  private async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2));
  }

  async getRegistrations(eventId?: string, location?: string) {
    await this.ensureLoaded();
    return this.state.registrations.filter((row) => {
      const matchesEvent = !eventId || row.event_id === eventId;
      const matchesLocation = !location || row.location === location;
      return matchesEvent && matchesLocation;
    });
  }

  async addRegistrations(payloads: Array<Record<string, unknown>>) {
    await this.ensureLoaded();
    const inserted: RegistrationRecord[] = [];
    const nextId = this.state.registrations.reduce((max, row) => Math.max(max, row.id), 0) + 1;

    for (const payload of payloads) {
      const record: RegistrationRecord = {
        id: nextId + inserted.length,
        employee_id: String(payload.employeeId ?? ''),
        provided_employee_id: String(payload.providedEmployeeId ?? payload.employeeId ?? ''),
        employee_name: String(payload.employeeName ?? ''),
        department: payload.department ? String(payload.department) : null,
        tournament_id: String(payload.tournamentId ?? 'T001'),
        event_id: String(payload.eventId ?? ''),
        partner_id: payload.partnerId ? String(payload.partnerId) : null,
        location: String(payload.location ?? ''),
        registration_date: String(payload.registrationDate ?? new Date().toISOString()),
      };

      this.state.registrations.push(record);
      inserted.push(record);

      const isDoubles = payload.eventType === 'Doubles';
      if (isDoubles && !record.partner_id) {
        const candidate = this.state.registrations.find((existing) => {
          return existing.id !== record.id
            && existing.event_id === record.event_id
            && existing.location === record.location
            && existing.partner_id === null
            && existing.employee_id !== record.employee_id;
        });
        if (candidate) {
          record.partner_id = candidate.employee_id;
          candidate.partner_id = record.employee_id;
        }
      }
    }

    await this.save();
    return inserted;
  }

  async getEvents() {
    await this.ensureLoaded();
    return this.state.events;
  }

  async addEvent(payload: Record<string, unknown>) {
    await this.ensureLoaded();
    const existing = this.state.events.find((event) => event.id === String(payload.id ?? ''));
    if (existing) return existing;
    const record: EventRecord = {
      id: String(payload.id ?? ''),
      tournament_id: String(payload.tournamentId ?? ''),
      name: String(payload.name ?? ''),
      type: String(payload.type ?? ''),
      game: String(payload.game ?? ''),
      meta: payload.meta && typeof payload.meta === 'object' ? (payload.meta as Record<string, unknown>) : {},
    };
    this.state.events.push(record);
    await this.save();
    return record;
  }

  async deleteEvent(eventId: string) {
    await this.ensureLoaded();
    this.state.events = this.state.events.filter((event) => event.id !== eventId);
    this.state.registrations = this.state.registrations.filter((row) => row.event_id !== eventId);
    this.state.matches = this.state.matches.filter((row) => row.event_id !== eventId);
    await this.save();
    return true;
  }

  async getTournaments() {
    await this.ensureLoaded();
    return this.state.tournaments;
  }

  async addTournament(payload: Record<string, unknown>) {
    await this.ensureLoaded();
    const existing = this.state.tournaments.find((tournament) => tournament.id === String(payload.id ?? ''));
    if (existing) return existing;
    const record: TournamentRecord = {
      id: String(payload.id ?? ''),
      name: String(payload.name ?? ''),
      description: String(payload.description ?? ''),
      location: String(payload.location ?? ''),
      registration_start_date: String(payload.registrationStartDate ?? new Date().toISOString()),
      registration_end_date: String(payload.registrationEndDate ?? new Date().toISOString()),
      tournament_start_date: String(payload.tournamentStartDate ?? new Date().toISOString()),
      tournament_end_date: String(payload.tournamentEndDate ?? new Date().toISOString()),
      status: String(payload.status ?? 'Draft'),
    };
    this.state.tournaments.push(record);
    await this.save();
    return record;
  }

  async deleteTournament(tournamentId: string) {
    await this.ensureLoaded();
    this.state.tournaments = this.state.tournaments.filter((tournament) => tournament.id !== tournamentId);
    this.state.events = this.state.events.filter((event) => event.tournament_id !== tournamentId);
    this.state.registrations = this.state.registrations.filter((row) => row.tournament_id !== tournamentId);
    this.state.matches = this.state.matches.filter((row) => !this.state.events.some((event) => event.id === row.event_id));
    await this.save();
    return true;
  }

  async getMatches(eventId?: string) {
    await this.ensureLoaded();
    if (!eventId) return this.state.matches;
    return this.state.matches.filter((row) => row.event_id === eventId);
  }

  private getNextRoundName(roundName: string) {
    const roundNames = ['Round 1', 'Quarter Final', 'Semi Final', 'Final'];
    const index = roundNames.indexOf(roundName);
    if (index < 0 || index >= roundNames.length - 1) return null;
    return roundNames[index + 1];
  }

  private propagateWinnerToNextRound(existing: MatchRecord, winnerId: string) {
    const nextRound = this.getNextRoundName(existing.round);
    if (!nextRound) return;

    const location = String(existing.meta?.location ?? '');
    const bracketIndex = Number(existing.meta?.bracket_index ?? 0);
    const nextRoundMatches = this.state.matches
      .filter((row) => row.event_id === existing.event_id && row.round === nextRound && String(row.meta?.location ?? '') === location)
      .sort((a, b) => Number(a.meta?.bracket_index ?? 0) - Number(b.meta?.bracket_index ?? 0));

    const targetMatch = nextRoundMatches[Math.floor(bracketIndex / 2)];
    if (!targetMatch) return;

    const slot = bracketIndex % 2 === 0 ? 'player1_id' : 'player2_id';
    if (slot === 'player1_id') {
      targetMatch.player1_id = winnerId;
    } else {
      targetMatch.player2_id = winnerId;
    }
  }

  async generateFixtures(eventId: string, perLocationPlayerIds: Record<string, string[]>) {
    await this.ensureLoaded();
    this.state.matches = this.state.matches.filter((row) => row.event_id !== eventId);

    const generated: MatchRecord[] = [];
    let nextId = this.state.matches.reduce((max, row) => Math.max(max, row.id), 0) + 1;

    const createRoundMatches = (roundName: string, playerIds: Array<string | null>, location: string, roundLevel: number) => {
      const roundMatches: MatchRecord[] = [];
      for (let index = 0; index < playerIds.length; index += 2) {
        const player1Id = playerIds[index] ?? '';
        const player2Id = playerIds[index + 1] ?? null;
        const match: MatchRecord = {
          id: nextId++,
          event_id: eventId,
          round: roundName,
          player1_id: player1Id,
          player2_id: player2Id,
          winner_id: null,
          status: 'Pending',
          scheduled_date: null,
          meta: { location, bracket_index: Math.floor(index / 2), round_level: roundLevel },
        };
        roundMatches.push(match);
        generated.push(match);
      }
      return roundMatches;
    };

    for (const [location, players] of Object.entries(perLocationPlayerIds || {})) {
      const round1Players = players.filter(Boolean) as string[];
      // compute match counts per round dynamically
      const roundsCounts: number[] = [];
      let matchesCount = Math.ceil(round1Players.length / 2);
      roundsCounts.push(matchesCount);
      while (matchesCount > 1) {
        matchesCount = Math.ceil(matchesCount / 2);
        roundsCounts.push(matchesCount);
      }

      // build round names mapping: last -> Final, last-1 -> Semi Final, last-2 -> Quarter Final, others Round N
      const totalRounds = roundsCounts.length;
      const roundNames = roundsCounts.map((_, idx) => {
        const roundIdx = idx;
        const fromEnd = totalRounds - 1 - roundIdx;
        if (fromEnd === 0) return 'Final';
        if (fromEnd === 1) return 'Semi Final';
        if (fromEnd === 2) return 'Quarter Final';
        return `Round ${roundIdx + 1}`;
      });

      // create Round 1 matches with players
      let currentRoundMatches = createRoundMatches(roundNames[0], round1Players, location, 0);

      // create placeholders for subsequent rounds
      for (let r = 1; r < roundNames.length; r++) {
        const placeholderPlayers = Array.from({ length: roundsCounts[r] }, () => null as string | null);
        currentRoundMatches = createRoundMatches(roundNames[r], placeholderPlayers, location, r);
      }
    }

    this.state.matches.push(...generated);
    await this.save();
    return generated;
  }

  async updateMatch(matchId: number, updates: Record<string, unknown>) {
    await this.ensureLoaded();
    const existing = this.state.matches.find((row) => row.id === matchId);
    if (!existing) return null;

    const previousWinner = existing.winner_id;
    const winnerId = updates.winner_id !== undefined ? (updates.winner_id as string | null) : existing.winner_id;

    if (updates.winner_id !== undefined) existing.winner_id = winnerId;
    if (updates.player1_id !== undefined) existing.player1_id = String(updates.player1_id ?? '');
    if (updates.player2_id !== undefined) existing.player2_id = updates.player2_id ? String(updates.player2_id) : null;
    if (updates.status !== undefined) existing.status = String(updates.status);
    if (updates.scheduled_date !== undefined) existing.scheduled_date = updates.scheduled_date ? String(updates.scheduled_date) : null;

    if (updates.meta && typeof updates.meta === 'object') {
      existing.meta = { ...existing.meta, ...(updates.meta as Record<string, unknown>) };
    }

    if (winnerId && String(updates.status || existing.status) === 'Completed' && previousWinner !== winnerId) {
      const winnerRegistration = this.state.registrations.find((row) => row.event_id === existing.event_id && row.employee_id === winnerId);
      if (winnerRegistration) {
        // Preserve registration rows so champion data remains available.
        existing.meta = {
          ...existing.meta,
          winner_name: winnerRegistration.employee_name,
          winner_department: winnerRegistration.department || undefined,
          winner_location: winnerRegistration.location,
        };
      }
      this.propagateWinnerToNextRound(existing, winnerId);
    }

    await this.save();
    return existing;
  }

  async deleteMatches(eventId?: string, completedOnly?: boolean) {
    await this.ensureLoaded();
    this.state.matches = this.state.matches.filter((row) => {
      if (eventId && row.event_id !== eventId) return true;
      if (completedOnly && row.status === 'Completed') return false;
      return !(eventId ? row.event_id === eventId : false);
    });
    await this.save();
    return this.state.matches.length;
  }
}

export const fallbackStore = new FileFallbackStore();
