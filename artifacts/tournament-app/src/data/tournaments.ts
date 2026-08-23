export type TournamentStatus = "Draft" | "Registration Open" | "Registration Closed" | "In Progress" | "Completed";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  registrationStartDate: string;
  registrationEndDate: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  status: TournamentStatus;
}

export const tournaments: Tournament[] = [
  {
    id: "T001",
    name: "Office Indoor Games 2026",
    description: "Annual company-wide indoor sports tournament featuring Table Tennis, Carrom, and Chess across both office locations.",
    location: "Hyderabad & Bangalore",
    registrationStartDate: "2026-01-15",
    registrationEndDate: "2026-02-15",
    tournamentStartDate: "2026-03-01",
    tournamentEndDate: "2026-03-31",
    status: "In Progress"
  }
];

export const getActiveTournament = () => tournaments.find(t => t.status === "In Progress" || t.status === "Registration Open");
