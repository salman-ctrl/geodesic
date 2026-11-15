# GEODESIC — Build your own rocket and mission

> A browser game where you design a rocket, a spacecraft and a gravity-assist route, then fly it yourself, using real orbital mechanics and real NASA/JPL planet positions.

**NASA Space Apps Challenge 2026 · Challenge: Space Mission Design Game**

🔗 **Play:** `<https://geodesic-game.vercel.app/>`🎬 **Demo video:** `<https://youtu.be/ksskKUELBc8>`

---

## Why Geodesic?

Most students only *read* about how a gravity assist works. They never get to try it, miss the planet, and find out why. Space mission engineering feels abstract and far away, especially for students in Indonesia.

Geodesic lets anyone design a real mission in the browser. There is nothing to install and no account to create. It uses the same basic methods mission designers use: the rocket equation, patched conics and Lambert transfers. Planet positions come from JPL's published orbital elements.

**The name.** In Einstein's general relativity, a spacecraft coasting past a planet is not being "pulled". It follows the straightest possible path through curved spacetime, which is called a *geodesic*. Our flight engine uses Newtonian mechanics, because at these speeds the difference is below one part in a million. Our physics lab shows what Einstein adds.

## How it plays

1. **Pick a mission:** Moon, Mars, Jupiter, Saturn or Neptune. Play alone, or as a crew of 1–4 players sharing one device.
2. **Build the rocket.** Add tank segments, engines, side boosters, an upper stage and a fairing. The rocket assembles live in 3D. You can switch to an exploded view or an X-ray cutaway to see every part and what it does.
3. **Build the spacecraft.** Choose the bus size, power (solar or RTG), antenna and science instruments.
4. **Plan the route.** Click planets on the real solar system to chain flybys. One big number shows how much **propellant the slingshots save** compared with the best direct route.
5. **Go / No-Go poll.** Each console (Propulsion, Power & Comms, Science, Route, Budget) calls GO or NO-GO, with the reason and a link to fix it.
6. **Fly it as flight director.** You start the gravity turn and separate the stages. During cruise you correct course. You aim each flyby and time the capture burn. For the Moon and Mars, you can land.
7. **Mission report.** You see the propellant used and saved, the science returned, the cost and a burn timeline. A physics breakdown explains why the mission worked or failed, and you get a generated mission patch.

Failure is honest. A rocket that runs out of propellant before orbit falls back and explodes. A spacecraft whose tank runs dry in space does **not** explode. It misses its target, drifts away, or crashes into a planet.

## Learn the physics

- **Two Minds, One Universe.** An interactive 3D lab on the landing page.
  - **Newton:** change the planet's mass, the distance and the launch speed, and watch the orbit change. It uses the same Kepler propagator as the game.
  - **Einstein:** a curved-spacetime view and two clocks that show gravitational time dilation, √(1 − 2GM/rc²).
- **Physics Insights** during the route planner, cruise, flyby and arrival show the equations behind each decision.
- **Classroom mode.** A teacher creates a room code, teams join from their own devices, and a live leaderboard ranks them by Mission Score, Fuel Saver, Most Science, Cheapest Success and Fastest Arrival. There is also a "Best failure lesson" tab.

## Validation: our engine against missions that flew

We feed the real launch and encounter dates into the same solver the game uses, and compare the results with flight records:

| Mission | Quantity | Flight record | Geodesic engine | Difference |
|---|---|---|---|---|
| Voyager 1 | Jupiter flyby distance | 348,890 km | 338,601 km | −2.9 % |
| Voyager 2 | Saturn flyby distance | 161,000 km | 157,980 km | −1.9 % |
| New Horizons | Launch energy C3 | ≈158 km²/s² | 158.6 km²/s² | +0.4 % |
| New Horizons | Jupiter flyby distance | 2,300,000 km | 2,336,577 km | +1.6 % |

The game computes these values live in the browser, in the Validation section.

## Data and methods

**Real data**
- Planet positions: JPL Solar System Dynamics, *Approximate Positions of the Planets*, Table 1 — <https://ssd.jpl.nasa.gov/planets/approx_pos.html>
- Planetary GM and radii: JPL SSD planetary physical parameters — <https://ssd.jpl.nasa.gov/planets/phys_par.html>
- Pluto aim point (validation only): JPL Horizons.

**Real methods:** the rocket equation, vis-viva, patched conics, a universal-variable Lambert solver, and Kepler propagation.

**Game model (simplified on purpose):** rocket and spacecraft parts, costs and budgets; a 2-D ascent with an exponential atmosphere; a circular, coplanar Moon orbit; 1-D powered landing; and data-rate and scoring formulas. Every simplification is listed in the game's **Sources** section.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Three.js |
| Backend | Node.js, Express |
| Database | MySQL-compatible (TiDB Cloud Serverless) |

The game is fully playable without the backend. Classroom features fall back to local storage if the API is unreachable.

```
frontend/   React app (src/core = physics, src/three = 3D, src/screens = game screens)
backend/    Express API (rooms, teams, runs, leaderboard) + schema.sql
index.html  original single-file prototype (reference)
```

## Run locally

**Backend**
```bash
cd backend
cp .env.example .env      # set DATABASE_URL, DB_SSL=true, FRONTEND_URL
npm install
npm run dev               # http://localhost:3001/api/health
```
Create the database tables by running `backend/schema.sql` on your MySQL or TiDB database.

**Frontend**
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

### API
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Server and database status |
| POST | `/api/rooms` | Teacher creates a room |
| POST | `/api/rooms/:code/join` | Team joins a room |
| POST | `/api/runs` | Submit a mission result |
| GET | `/api/rooms/:code/leaderboard` | Class leaderboard |

## Use of AI

We used AI coding assistants (Anthropic Claude and OpenAI Codex) to help write and refactor code, to port the prototype to React and Express, and to test it. Our team set the game design, the physics approach and the validation targets, and reviewed the output. No AI-generated images or data are presented as NASA data.

## Team

**GEODESIC** NASA Space Apps Challenge 2026, Yogyakarta

- **(Rafi Geovazi)** — *Team Lead & Science*
  - **Coding:** Landing page & *"Two Minds. One Universe."* (Newton × Einstein interactive lab), contextual *Physics Insights* & *Physics Breakdown* in Mission Report, and NASA Validation Panel (*Voyager 2* & *New Horizons*).
  - **Leadership & Science:** Project direction, task coordination, physics research & NASA/JPL data sourcing, README & *Use of AI* documentation, and final project submission.
- **(Salman Rizky)** — *Tech Lead & 3D/Physics Engine*
  - **Coding:** Core astrodynamics & physics engine (Lambert solver, patched conics, ascent & landing simulation), Three.js 3D scenes (rocket builder, X-Ray/exploded view, launchpad, planetary flyby), prototype migration to React + Vite, and deployment.
  - **Architecture:** Technical architecture, code review & merge management, and AI coding workflow direction.
- **(Muhammad Rifki Fadillah)** *Backend & Classroom Systems*
  - **Coding:** Express REST API (`/api/rooms`, `/api/teams`, `/api/runs`, `/api/leaderboard`), TiDB Cloud database integration (`schema.sql` & TLS connection), and classroom multiplayer features (room codes, team join flow, 6-tab leaderboard, and mission scoring).
  - **QA & Media:** End-to-end playtesting, 30-second project demo video production, and submission assets.


## Disclaimer

Geodesic is an educational project made for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
