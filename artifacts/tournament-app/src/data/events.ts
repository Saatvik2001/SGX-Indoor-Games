export type EventType = "Singles" | "Doubles";
export type GameType = "Table Tennis" | "Carrom" | "Chess";

export interface Event {
  id: string;
  tournamentId: string;
  name: string;
  type: EventType;
  game: GameType;
}

export const events: Event[] = [
  {
    id: "E001",
    tournamentId: "T001",
    name: "Table Tennis Singles",
    type: "Singles",
    game: "Table Tennis"
  },
  {
    id: "E002",
    tournamentId: "T001",
    name: "Table Tennis Doubles",
    type: "Doubles",
    game: "Table Tennis"
  },
  {
    id: "E003",
    tournamentId: "T001",
    name: "Carrom Singles",
    type: "Singles",
    game: "Carrom"
  },
  {
    id: "E004",
    tournamentId: "T001",
    name: "Carrom Doubles",
    type: "Doubles",
    game: "Carrom"
  },
  {
    id: "E005",
    tournamentId: "T001",
    name: "Chess",
    type: "Singles",
    game: "Chess"
  }
];

export const getEventsByTournament = (tournamentId: string) => 
  events.filter(e => e.tournamentId === tournamentId);

export const getEventById = (id: string) => events.find(e => e.id === id);
