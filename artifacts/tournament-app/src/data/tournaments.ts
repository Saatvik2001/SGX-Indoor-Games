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
    id: "solugenix-indoor-2026",
    name: "Solugenix Corporate Indoor Championship 2026",
    description: "Annual corporate sports championship featuring Table Tennis, Badminton, Chess, and Carrom across Irrum Manzil and Hitech City campuses.",
    location: "Irrum Manzil & Hitech City",
    registrationStartDate: "2026-01-15",
    registrationEndDate: "2026-02-15",
    tournamentStartDate: "2026-03-01",
    tournamentEndDate: "2026-03-31",
    status: "In Progress"
  }
];

export const getActiveTournament = () => tournaments.find(t => t.status === "In Progress" || t.status === "Registration Open");
