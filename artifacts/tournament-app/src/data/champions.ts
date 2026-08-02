export interface ChampionRecord {
  eventId: string;
  championId: string;
  runnerId?: string;
  declaredAt: string;
}

export const champions: ChampionRecord[] = [];
