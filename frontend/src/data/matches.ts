export type MatchRound = "Round 1" | "Round 2" | "Quarter Final" | "Semi Final" | "Final";
export type MatchStatus = "Pending" | "Scheduled" | "Completed";

export interface Match {
  id: string;
  eventId: string;
  round: MatchRound;
  player1Id: string;
  player2Id?: string;
  status: MatchStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  venue?: string;
  winnerId?: string;
  score?: string;
  isBye: boolean;
}

export const generateBracket = (eventId: string, playerIds: string[]): Match[] => {
  const matches: Match[] = [];
  let matchId = 1;
  
  // Round 1 (16 players -> 8 matches)
  const round1Players = playerIds.slice(0, 16);
  for (let i = 0; i < round1Players.length; i += 2) {
    const isCompleted = i < 8; // First 4 matches completed
    matches.push({
      id: `M${eventId}_${matchId++}`,
      eventId,
      round: "Round 1",
      player1Id: round1Players[i],
      player2Id: round1Players[i + 1],
      status: isCompleted ? "Completed" : "Scheduled",
      scheduledDate: "2026-03-05",
      scheduledTime: `${10 + i}:00`,
      venue: i % 2 === 0 ? "Court A" : "Court B",
      winnerId: isCompleted ? (i % 4 === 0 ? round1Players[i] : round1Players[i + 1]) : undefined,
      score: isCompleted ? "21-18, 21-15" : undefined,
      isBye: false
    });
  }
  
  // Quarter Finals (8 -> 4)
  const qfWinners = [round1Players[0], round1Players[3], round1Players[4], round1Players[7]];
  for (let i = 0; i < 4; i++) {
    const isCompleted = i < 2;
    matches.push({
      id: `M${eventId}_${matchId++}`,
      eventId,
      round: "Quarter Final",
      player1Id: i < qfWinners.length ? qfWinners[i] : round1Players[8 + i * 2],
      player2Id: i < 2 ? round1Players[9 + i * 2] : undefined,
      status: isCompleted ? "Completed" : "Pending",
      scheduledDate: isCompleted ? "2026-03-12" : undefined,
      scheduledTime: isCompleted ? `${14 + i * 2}:00` : undefined,
      venue: isCompleted ? "Court A" : undefined,
      winnerId: isCompleted ? (i === 0 ? qfWinners[0] : qfWinners[1]) : undefined,
      score: isCompleted ? "21-16, 21-19" : undefined,
      isBye: false
    });
  }
  
  // Semi Finals (4 -> 2)
  const sfWinners = [qfWinners[0], qfWinners[1]];
  for (let i = 0; i < 2; i++) {
    const isCompleted = i === 0;
    matches.push({
      id: `M${eventId}_${matchId++}`,
      eventId,
      round: "Semi Final",
      player1Id: sfWinners[i],
      player2Id: i === 0 ? qfWinners[2] : undefined,
      status: isCompleted ? "Completed" : "Pending",
      scheduledDate: isCompleted ? "2026-03-19" : undefined,
      scheduledTime: isCompleted ? "15:00" : undefined,
      venue: isCompleted ? "Main Court" : undefined,
      winnerId: isCompleted ? sfWinners[0] : undefined,
      score: isCompleted ? "21-14, 18-21, 21-17" : undefined,
      isBye: false
    });
  }
  
  // Final
  matches.push({
    id: `M${eventId}_${matchId++}`,
    eventId,
    round: "Final",
    player1Id: sfWinners[0],
    player2Id: undefined,
    status: "Pending",
    isBye: false
  });
  
  return matches;
};

// Start with no matches so the tournament can be started fresh.
export let matches: Match[] = [];

const persistMatches = () => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('matches', JSON.stringify(matches));
    }
  } catch (e) {
    // ignore
  }
};

export const getMatchesByEvent = (eventId: string) =>
  matches.filter(m => m.eventId === eventId);

export const updateMatch = (matchId: string, updates: Partial<Match>) => {
  const index = matches.findIndex(m => m.id === matchId);
  if (index !== -1) {
    matches[index] = { ...matches[index], ...updates };
    persistMatches();
    return matches[index];
  }
  return null;
};

export const setMatchesForEvent = (eventId: string, newMatches: Match[]) => {
  // Remove existing matches for the event and append new ones
  matches = matches.filter(m => m.eventId !== eventId).concat(newMatches);
  persistMatches();
};

// Try to hydrate matches from backend when running in browser
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const raw = window.localStorage.getItem('matches');
      if (raw) {
        const parsed = JSON.parse(raw) as Match[];
        if (Array.isArray(parsed)) matches = parsed;
      }
      const res = await fetch('/api/matches');
      if (!res.ok) return;
      const rows = await res.json();
      const serverMatches: Match[] = rows.map((r: any) => ({
        id: `M${r.id}`,
        eventId: r.event_id,
        round: r.round,
        player1Id: r.player1_id,
        player2Id: r.player2_id || undefined,
        status: r.status,
        scheduledDate: r.scheduled_date || undefined,
        scheduledTime: undefined,
        venue: undefined,
        winnerId: r.winner_id || undefined,
        score: r.meta?.score || undefined,
        isBye: false
      }));
      matches = serverMatches;
      persistMatches();
    } catch (e) {
      // ignore - keep empty mock
    }
  })();
}
