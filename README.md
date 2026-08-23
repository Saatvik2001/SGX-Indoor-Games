# Solugenix — Corporate Indoor Championship & Tournament Arena

A modern tournament management and live scorecard platform for Solugenix Corporate Indoor Sports across **Irrum Manzil** and **Hitech City** arenas.

---

## 📁 Project Overview

- **`artifacts/tournament-app/`**: React + Vite + Tailwind CSS Solugenix UI Application.
- **`artifacts/api-server/`**: Node.js + Express API Server with dynamic bracket engines.
- **`lib/db/`**: Drizzle ORM Schema & PostgreSQL connection pool.

---

## 🚀 Quick Start Guide

### 1. Install Workspace Dependencies
```bash
pnpm install
```

### 2. Run Applications
- **Start Web Application**:
  ```bash
  pnpm --filter @workspace/tournament-app run dev
  ```
  App runs at `http://localhost:5173`

- **Start API Server**:
  ```bash
  pnpm --filter @workspace/api-server run dev
  ```
  API server runs at `http://127.0.0.1:4001`

- **Push Database Schema**:
  ```bash
  pnpm --filter @workspace/db run push
  ```

---

## 🌐 Features

- **Brand Design**: Solugenix Royal Blue (`#2563EB`) and Electric Sky Cyan (`#0EA5E9`) theme with luminous ambient background mesh.
- **Single Viewport Overview**: Hero page fitted to 100vh with zero scrollbar.
- **Multi-Location Arenas**: Venues across *Irrum Manzil* & *Hitech City*.
- **Fixtures & Interactive Brackets**: Knockout brackets, rest days, and live scorecards.
- **Hall of Fame**: Champion podiums, winner laurels, and medal counts.
- **Admin Console**: Real-time management for matches, participant rosters, and tournament statuses.

---

## 📜 License
MIT License. Solugenix 2026.
