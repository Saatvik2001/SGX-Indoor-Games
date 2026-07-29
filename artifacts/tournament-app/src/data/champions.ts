export interface Champion {
  eventId: string;
  tournamentId: string;
  championId: string;
  runnerId?: string;
  declaredAt: string;
}

export let champions: Champion[] = [
  {
    eventId: "E001",
    tournamentId: "T001",
    championId: "EMP001",
    runnerId: "EMP003",
    declaredAt: "2026-03-26T15:30:00Z"
  }
];

export const addChampion = (champion: Champion) => {
  champions.push(champion);
  return champion;
};

export const getChampionsByTournament = (tournamentId: string) =>
  champions.filter(c => c.tournamentId === tournamentId);
