# Solugenix — Corporate Indoor Championship & Tournament Arena

A modern tournament management and live scorecard platform for Solugenix Corporate Indoor Sports across **Irrum Manzil** and **Hitech City** arenas.

---

## 📁 Repository Structure

```
SGX-Indoor-Games/
├── frontend/               # React + Vite + TailwindCSS UI Application
│   ├── src/
│   │   ├── components/     # SolugenixLogo, PublicLayout, AdminLayout, StatCard, UI
│   │   ├── pages/          # Landing (Single Viewport), Fixtures, Results, Champions, Register, Admin
│   │   ├── lib/            # Self-contained API Client & Utilities
│   │   └── index.css       # Solugenix Brand Theme & Ambient Mesh Gradients
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # Express + Node.js API Server
│   ├── src/
│   │   ├── db/             # Drizzle ORM Schema & PostgreSQL Connection
│   │   ├── routes/         # Tournaments, Events, Fixtures, Matches, Registrations
│   │   └── lib/            # Knockout & Round-Robin Fixture Engine, Fallback Store
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Open browser at `http://localhost:5173`

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
- API server runs at `http://127.0.0.1:4001`

---

## 🌐 Features

- **Brand Design**: Solugenix Royal Blue (`#2563EB`) and Electric Sky Cyan (`#0EA5E9`) theme with luminous ambient background mesh.
- **Single Viewport Overview**: Hero page fitted to 100vh with no scrollbar.
- **Dynamic Tournaments**: Multi-venue support for *Irrum Manzil* & *Hitech City*.
- **Fixtures & Brackets**: Knockout brackets, schedules, and live scorecards.
- **Hall of Fame**: Champion podiums, winner laurels, and medal counters.
- **Admin Console**: Full management for matches, participant rosters, and tournament statuses.

---

## 📜 License
MIT License. Solugenix 2026.
