export interface GeneratedDraftMatch {
  round: string;
  roundLevel: number;
  bracketIndex: number;
  player1Id: string;
  player2Id: string | null;
  winnerId: string | null;
  status: 'Pending' | 'Scheduled' | 'Completed';
  meta: {
    format: 'Single Elimination' | 'Round Robin' | 'Double Round Robin' | 'Double Elimination';
    location: string;
    bracket_index: number;
    round_level: number;
    half?: 'Upper Half' | 'Lower Half';
    is_bye?: boolean;
    bye_player?: string | null;
    round_number?: number;
    match_number?: number;
    [key: string]: unknown;
  };
}

export interface TournamentSummaryStats {
  totalPlayers: number;
  format: 'Single Elimination' | 'Round Robin' | 'Double Round Robin' | 'Double Elimination';
  totalRounds: number;
  totalMatches: number;
  byesCount: number;
  byePlayers?: string[];
  upperHalfCount?: number;
  lowerHalfCount?: number;
}

export function normalizeParticipantIds(players: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      players
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .map((value) => value.trim())
    )
  );
}

export function shufflePlayers<T extends string>(players: T[]): T[] {
  const result = players.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getBracketSlotCount(participantCount: number): number {
  if (participantCount <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(participantCount));
}

export function getRoundNames(totalRounds: number): string[] {
  if (totalRounds <= 1) return ['Final'];
  if (totalRounds === 2) return ['Semi Final', 'Final'];
  if (totalRounds === 3) return ['Quarter Final', 'Semi Final', 'Final'];
  if (totalRounds === 4) return ['Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  if (totalRounds === 5) return ['Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  
  const names: string[] = [];
  for (let i = 0; i < totalRounds - 3; i++) {
    names.push(`Round ${i + 1}`);
  }
  names.push('Quarter Final', 'Semi Final', 'Final');
  return names;
}

/**
 * Generates Single Elimination Knockout Fixtures
 * Logic:
 * - Calculates next power of 2 (P)
 * - Number of BYEs = P - N
 * - Number of Round 1 matches to play = N - P/2
 * - Splits bracket into Upper Half and Lower Half
 * - Awards BYEs to top seeds in Round 1 and auto-advances them directly to Round 2!
 */
export function buildSingleEliminationMatches(
  eventId: string,
  location: string,
  participantIds: string[]
): GeneratedDraftMatch[] {
  const participants = normalizeParticipantIds(participantIds);
  if (participants.length === 0) return [];
  if (participants.length === 1) {
    return [
      {
        round: 'Final',
        roundLevel: 0,
        bracketIndex: 0,
        player1Id: participants[0],
        player2Id: null,
        winnerId: participants[0],
        status: 'Completed',
        meta: {
          format: 'Single Elimination',
          location,
          bracket_index: 0,
          round_level: 0,
          half: 'Upper Half',
          is_bye: true,
          bye_player: participants[0],
          winner_name: participants[0]
        }
      }
    ];
  }

  const N = participants.length;
  const P = getBracketSlotCount(N);
  const totalRounds = Math.max(1, Math.ceil(Math.log2(P)));
  const roundNames = getRoundNames(totalRounds);
  const byesCount = P - N;
  const matchSlotsCount = P / 2;

  // Determine standard bracket slots of size P
  // Priority order for awarding BYEs across bracket slots:
  // 1. Slot 0 (Upper Half top - Seed 1)
  // 2. Slot matchSlotsCount - 1 (Lower Half bottom - Seed 2)
  // 3. Slot Math.floor(matchSlotsCount / 2) - 1 (Upper Half bottom)
  // 4. Slot Math.floor(matchSlotsCount / 2) (Lower Half top)
  // 5. Other slots evenly
  const seededMatches: Array<{ p1: string | null; p2: string | null; isBye: boolean; byePlayer?: string }> = [];

  const byeSlotOrder: number[] = [];
  if (matchSlotsCount >= 1) byeSlotOrder.push(0);
  if (matchSlotsCount >= 2) byeSlotOrder.push(matchSlotsCount - 1);
  if (matchSlotsCount >= 4) {
    byeSlotOrder.push(Math.floor(matchSlotsCount / 2) - 1);
    byeSlotOrder.push(Math.floor(matchSlotsCount / 2));
  }
  for (let i = 0; i < matchSlotsCount; i++) {
    if (!byeSlotOrder.includes(i)) byeSlotOrder.push(i);
  }

  const byeSlotsSet = new Set(byeSlotOrder.slice(0, byesCount));

  let playerCursor = 0;
  for (let slot = 0; slot < matchSlotsCount; slot++) {
    if (byeSlotsSet.has(slot)) {
      // This slot gets a BYE
      const player = participants[playerCursor++] || null;
      seededMatches.push({
        p1: player,
        p2: null,
        isBye: true,
        byePlayer: player || undefined
      });
    } else {
      // Regular matchup with 2 players
      const p1 = participants[playerCursor++] || null;
      const p2 = participants[playerCursor++] || null;
      seededMatches.push({
        p1,
        p2,
        isBye: false
      });
    }
  }

  const allDraftMatches: GeneratedDraftMatch[] = [];
  let matchCounter = 1;

  // Build Round 1 Matches
  for (let slot = 0; slot < matchSlotsCount; slot++) {
    const item = seededMatches[slot];
    const half: 'Upper Half' | 'Lower Half' = slot < Math.ceil(matchSlotsCount / 2) ? 'Upper Half' : 'Lower Half';
    const isCompletedBye = item.isBye && item.p1 !== null;

    allDraftMatches.push({
      round: roundNames[0],
      roundLevel: 0,
      bracketIndex: slot,
      player1Id: item.p1 || '',
      player2Id: item.p2,
      winnerId: isCompletedBye ? item.p1 : null,
      status: isCompletedBye ? 'Completed' : 'Pending',
      meta: {
        format: 'Single Elimination',
        location,
        bracket_index: slot,
        round_level: 0,
        half,
        is_bye: item.isBye,
        bye_player: item.byePlayer || null,
        match_number: matchCounter++
      }
    });
  }

  // Build Subsequent Rounds (Round 2 ... Final)
  let currentRoundMatchCount = matchSlotsCount / 2;
  for (let roundLevel = 1; roundLevel < totalRounds; roundLevel++) {
    const roundName = roundNames[roundLevel];
    for (let index = 0; index < currentRoundMatchCount; index++) {
      const half: 'Upper Half' | 'Lower Half' = index < Math.ceil(currentRoundMatchCount / 2) ? 'Upper Half' : 'Lower Half';
      allDraftMatches.push({
        round: roundName,
        roundLevel,
        bracketIndex: index,
        player1Id: '',
        player2Id: null,
        winnerId: null,
        status: 'Pending',
        meta: {
          format: 'Single Elimination',
          location,
          bracket_index: index,
          round_level: roundLevel,
          half,
          match_number: matchCounter++
        }
      });
    }
    currentRoundMatchCount = Math.max(1, currentRoundMatchCount / 2);
  }

  // Auto-propagate Round 1 BYE winners to Round 2!
  for (const r1Match of allDraftMatches.filter(m => m.roundLevel === 0 && m.meta.is_bye && m.winnerId)) {
    const targetBracketIndex = Math.floor(r1Match.bracketIndex / 2);
    const targetMatch = allDraftMatches.find(m => m.roundLevel === 1 && m.bracketIndex === targetBracketIndex);
    if (targetMatch) {
      if (r1Match.bracketIndex % 2 === 0) {
        targetMatch.player1Id = r1Match.winnerId!;
      } else {
        targetMatch.player2Id = r1Match.winnerId!;
      }
    }
  }

  return allDraftMatches;
}

/**
 * Generates Round-Robin Fixtures
 * Logic:
 * - If N is ODD:
 *   - Uses the Cyclic Method
 *   - Number of rounds = N
 *   - Matches per round = (N - 1) / 2
 *   - Total matches = N * (N - 1) / 2
 *   - In each round, exactly 1 player receives a BYE (rest day)
 *   - Every player plays every other player exactly once
 * - If N is EVEN:
 *   - Uses the Berger/Cyclic Method
 *   - Number of rounds = N - 1
 *   - Matches per round = N / 2
 *   - Total matches = N * (N - 1) / 2
 *   - 0 BYEs (everyone plays in every round)
 *   - Every player plays every other player exactly once
 */
export function buildRoundRobinMatches(
  eventId: string,
  location: string,
  participantIds: string[]
): GeneratedDraftMatch[] {
  const rawParticipants = normalizeParticipantIds(participantIds);
  if (rawParticipants.length <= 1) return [];

  const N = rawParticipants.length;
  const isOdd = N % 2 !== 0;
  const playersList = rawParticipants.slice();

  // If odd, add a dummy '___BYE___' player so total is even (N + 1)
  const DUMMY_BYE = '___BYE___';
  if (isOdd) {
    playersList.push(DUMMY_BYE);
  }

  const numSlots = playersList.length;
  const totalRounds = isOdd ? N : N - 1;
  const matchesPerRound = Math.floor(numSlots / 2);

  const draftMatches: GeneratedDraftMatch[] = [];
  let matchCounter = 1;

  // Cyclic Rotation Method:
  // Fix playersList[0] at index 0, and rotate the remaining (numSlots - 1) players
  const fixed = playersList[0];
  let rotating = playersList.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const roundNumber = r + 1;
    const roundName = `Round ${roundNumber}`;
    const currentLineup = [fixed, ...rotating];

    let roundByePlayer: string | null = null;
    const roundMatchups: Array<{ p1: string; p2: string }> = [];

    for (let i = 0; i < matchesPerRound; i++) {
      const p1 = currentLineup[i];
      const p2 = currentLineup[numSlots - 1 - i];

      if (p1 === DUMMY_BYE) {
        roundByePlayer = p2;
      } else if (p2 === DUMMY_BYE) {
        roundByePlayer = p1;
      } else {
        roundMatchups.push({ p1, p2 });
      }
    }

    for (let mIdx = 0; mIdx < roundMatchups.length; mIdx++) {
      const matchup = roundMatchups[mIdx];
      draftMatches.push({
        round: roundName,
        roundLevel: r,
        bracketIndex: mIdx,
        player1Id: matchup.p1,
        player2Id: matchup.p2,
        winnerId: null,
        status: 'Pending',
        meta: {
          format: 'Round Robin',
          location,
          round_number: roundNumber,
          round_level: r,
          bracket_index: mIdx,
          match_number: matchCounter++,
          bye_player: roundByePlayer
        }
      });
    }

    // Rotate rotating array clockwise: last element moves to the front
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  return draftMatches;
}

/**
 * Generates Double Round-Robin Fixtures
 * Logic:
 * - Runs single round robin for Leg 1
 * - Reverses home/away (p1 <-> p2) for Leg 2
 * - Total matches = N * (N - 1)
 * - Each pair plays exactly twice: A vs B and B vs A
 */
export function buildDoubleRoundRobinMatches(
  eventId: string,
  location: string,
  participantIds: string[]
): GeneratedDraftMatch[] {
  const leg1Matches = buildRoundRobinMatches(eventId, location, participantIds);
  if (leg1Matches.length === 0) return [];

  const rawParticipants = normalizeParticipantIds(participantIds);
  const N = rawParticipants.length;
  const isOdd = N % 2 !== 0;
  const leg1Rounds = isOdd ? N : N - 1;

  const leg2Matches: GeneratedDraftMatch[] = leg1Matches.map((m, index) => {
    const leg2RoundNum = (m.meta.round_number || m.roundLevel + 1) + leg1Rounds;
    return {
      round: `Round ${leg2RoundNum}`,
      roundLevel: m.roundLevel + leg1Rounds,
      bracketIndex: m.bracketIndex,
      player1Id: m.player2Id || '',
      player2Id: m.player1Id,
      winnerId: null,
      status: 'Pending',
      meta: {
        ...m.meta,
        format: 'Double Round Robin',
        round_number: leg2RoundNum,
        round_level: m.roundLevel + leg1Rounds,
        leg: 2,
        match_number: leg1Matches.length + index + 1
      }
    };
  });

  return [...leg1Matches, ...leg2Matches];
}

/**
 * Dispatcher to build matches based on requested tournament format
 */
export function buildTournamentMatches(
  eventId: string,
  location: string,
  participantIds: string[],
  format: 'Single Elimination' | 'Round Robin' | 'Double Round Robin' | 'Double Elimination' = 'Single Elimination',
  shouldShuffle: boolean = true
): GeneratedDraftMatch[] {
  const normalized = normalizeParticipantIds(participantIds);
  const shuffled = shouldShuffle ? shufflePlayers(normalized) : normalized;

  if (format === 'Double Round Robin') {
    return buildDoubleRoundRobinMatches(eventId, location, shuffled);
  }
  if (format === 'Round Robin') {
    return buildRoundRobinMatches(eventId, location, shuffled);
  }
  return buildSingleEliminationMatches(eventId, location, shuffled);
}

/**
 * Helper to calculate stats summary for tournament/event
 */
export function getTournamentSummary(
  participantCount: number,
  format: 'Single Elimination' | 'Round Robin' | 'Double Round Robin' | 'Double Elimination' = 'Single Elimination'
): TournamentSummaryStats {
  const N = participantCount;

  if (format === 'Double Round Robin') {
    const isOdd = N % 2 !== 0;
    const totalRounds = (isOdd ? N : Math.max(1, N - 1)) * 2;
    const totalMatches = N * (N - 1);
    const byesCount = isOdd ? N * 2 : 0;
    return {
      totalPlayers: N,
      format: 'Round Robin',
      totalRounds,
      totalMatches,
      byesCount
    };
  }

  if (format === 'Round Robin') {
    const isOdd = N % 2 !== 0;
    const totalRounds = isOdd ? N : Math.max(1, N - 1);
    const totalMatches = Math.floor((N * (N - 1)) / 2);
    const byesCount = isOdd ? N : 0; // 1 per round
    return {
      totalPlayers: N,
      format: 'Round Robin',
      totalRounds,
      totalMatches,
      byesCount
    };
  }

  // Default: Single Elimination
  const P = getBracketSlotCount(N);
  const totalRounds = Math.max(1, Math.ceil(Math.log2(P)));
  const totalMatches = Math.max(0, N - 1);
  const byesCount = P - N;

  return {
    totalPlayers: N,
    format: 'Single Elimination',
    totalRounds,
    totalMatches,
    byesCount,
    upperHalfCount: Math.ceil(N / 2),
    lowerHalfCount: Math.floor(N / 2)
  };
}
