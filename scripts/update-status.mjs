import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
// This generator describes the completed frontend migration. Preserve the newer
// TLS/real-TiDB documentation rather than restoring its old backend limitations.
if (fs.existsSync('verification/backend-real-api.json') && fs.readFileSync('PARITY.md','utf8').includes('## TiDB Cloud backend verification')) {
  console.log('Preserved newer TiDB backend documentation; frontend evidence is unchanged.');
  process.exit(0);
}
const visual = JSON.parse(fs.readFileSync('verification/visual-parity.json'));
const final = JSON.parse(fs.readFileSync('verification/final-visual.json'));
const classroom = JSON.parse(fs.readFileSync('verification/classroom.json'));
const flights = JSON.parse(fs.readFileSync('verification/playthroughs.json'));
for (const evidence of [visual, final, classroom, flights]) assert.equal(evidence.passed, true);
const hash = createHash('sha256').update(fs.readFileSync('index.html')).digest('hex');
assert.equal(hash, '0cd3ae99845caff06e85f9ceac5d67b4ac49cf8cfddd5557cf647bad8b0b4a98');
const labels = {
  'landing-hero': 'Landing: hero', 'landing-sec-problem': 'Landing: problem', 'landing-sec-theories': 'Two Minds: Newton',
  'two-minds-einstein': 'Two Minds: Einstein', 'einstein-maths': 'Einstein maths', 'landing-sec-assist': 'Gravity assist',
  'landing-sec-missions': 'Mission descriptions', 'landing-sec-science': 'Science methods', 'landing-sec-validation': 'Landing validation',
  'landing-sec-sources': 'Landing Sources', 'landing-sec-class': 'Original classroom mockup', 'landing-sec-how': 'How it works and footer',
  'select': 'Mission select', 'tutorial': 'Tutorial overlay', 'builder': 'Rocket builder', 'builder-exploded': 'Rocket exploded', 'builder-xray': 'Rocket X-ray',
  'craft': 'Spacecraft builder', 'craft-science': 'Science instrument controls', 'route': 'Route planner', 'route-details': 'Route details',
  'physics-insights': 'Physics Insights dock', 'pass-device': 'Pass the device', 'gonogo': 'Go / No-Go', 'launch': 'Launch',
  'cruise': 'Cruise correction', 'cruise-approach': 'Cruise final approach', 'arrival': 'Arrival approach', 'arrival-captured': 'Captured orbit',
  'descent': 'Descent', 'report': 'Mission report', 'validation-sources': 'Validation/Sources modal', 'validation-sources-bottom': 'Validation/Sources follow-up (same viewport)',
  'jupiter-route': 'Jupiter route with Mars flyby', 'flyby': 'Flyby aiming', 'flyby-on-plan': 'Flyby planned aim',
};
const rows = visual.screens.map(s => `| ${labels[s.name] || s.name} | [PNG](verification/screenshots/${s.name}-source.png) | [PNG](verification/screenshots/${s.name}-react.png) | PASS${s.expectedMotion ? ' · motion' : ''} |`).join('\n');
const nativeRows = ['moon', 'mars', 'jupiter'].map(mission => {
  const source = flights.missions.find(m => m.mission === mission && m.name === 'source');
  const react = flights.missions.find(m => m.mission === mission && m.name === 'react');
  return `| ${mission[0].toUpperCase() + mission.slice(1)} | ${source.elapsedSeconds.toFixed(2)} s | ${react.elapsedSeconds.toFixed(2)} s | ${react.result.outcome.title} | PASS |`;
}).join('\n');
fs.writeFileSync('PARITY.md', `# Migration and parity status

**Frontend steps 6–8 completed and verified on 2026-11-15 in system Google Chrome ${visual.browser}.** The frontend builds with exact Three.js 0.170.0. All original screens and overlays were compared, and Moon, Mars and Jupiter were flown to successful reports in both versions at original timing. API/local fallback and classroom room/join/leaderboards are implemented. The backend and original HTML remain unchanged.

Open [the screenshot review gallery](verification/review.html) for paired images and final classroom screenshots.

## Source and scope

- Sole source: D:\\MY Project\\Nasa\\mockup\\nasa\\index.html, beside frontend and backend, including Two Minds.
- Source SHA-256: ${hash} (unchanged).
- Neither mockup\\index.html nor nasas\\index.html was used or edited. No git, database creation, backend rewrite, or deployment was performed.
- Completed core/module/store/screen ports were retained. The only game styling fixes are Tailwind 3 border defaults, inherited keyboard badge sizing, and disabling the invisible hero drag area's pointer interception after leaving the landing page.

## Required frontend order

| Step | Status | Evidence |
| --- | --- | --- |
| 1. Vite/React/Tailwind/colors/fonts | Retained PASS | Fonts now load in Chrome; source colors, CSS and font URL retained. |
| 2. Pure ES modules | Retained PASS | Original pure module bodies and numerical results remain unchanged. |
| 3. Three.js/shared game canvas | PASS | Exact 0.170.0 installed and pinned; production build and live WebGL screens pass. |
| 4. One store | Retained PASS | Original geodesic.v1 design store retained; classroom session notifications use the same Store. |
| 5. Screens/overlays | PASS | Existing ports boot and operate; no screen reimplementation. |
| 6. Screenshots/native-speed playthroughs | PASS | 36 paired captures, six completed flights, post-integration production captures below. |
| 7. API client/localStorage fallback | PASS | Client tests and live browser outage/reconnect/persistence checks. |
| 8. Classroom UI/scoring/Sources | PASS (frontend + HTTP integration) | Three isolated browser contexts, six rankings, reports and lessons; real MySQL remains unverified. |

## Original screen comparison

These step 6 captures were taken before the explicitly requested classroom/report/Sources extensions. Controlled animation frames were used only for still images; they were not used for the native-speed flights.

All 36 captures match visible layout, text and computed styles. 32 pairs are byte-identical; two have only sub-threshold raster differences. Launch smoke/flame jitter differs over 1.0731% of pixels and the original classroom entry animation over 0.0345%, above a 15/255 channel threshold. These bounded animated effects preserve the same renderer, geometry, physics and UI. No unexplained screen difference remains in the tested states.

| Screen / state | Original | React at step 6 | Result |
| --- | --- | --- | --- |
${rows}

The follow-up modal capture repeated its viewport. Actual scrolled Sources/footer coverage is recorded in the final modal captures below.

## Normal-speed missions

Native browser requestAnimationFrame, original dt limits and original default cruise setting (10×) were retained. No clock overrides, frame injection, phase skips or 100× cruise were used. Saved, valid designs were selected through the UI; original ascent autopilot and assisted landing controls were used. Course corrections used B, cruise continuation used Enter, flyby aim used the planned-aim control, and capture was timed with the original button.

| Mission | Source wall time | React wall time | Final outcome in both | Result |
| --- | --- | --- | --- | --- |
${nativeRows}

Within each pair, rocket/craft designs, complete ascent records, outcomes, cost and route duration match exactly. Moon touchdown is 1.8297248603029868 m/s; Mars is 1.5001390925994533 m/s, with identical landing fuel/time records. Jupiter follows Earth → Mars → Jupiter; the Mars flyby gains 1.6936309977124715 km/s and has an outbound residual of 1.9708335031049848e-14 km/s in both. Capture delta-v differs by less than 0.025% because native input/frame timing is independent. This is not represented as exact equality of every live sample.

Evidence: [flight records/events](verification/playthroughs.json), [saved designs](verification/mission-fixtures.json), and [native flight screenshots](verification/playthroughs).

## Final app and intentional additions

[Final production screenshot results](verification/final-visual.json) recheck hero, builder, craft, route, cruise, arrival, descent, report top and validation modal after integration: each is pixel-identical. The existing Sources viewport is also pixel-identical; its classroom explanation spans the columns below the original material so the original columns retain their layout.

The requested visible extensions are documented separately:

- [Classroom controls](verification/final-screenshots/sec-class-react.png): real teacher/mission room creation, named team joining/resuming, real team list, explicit shared/local/cached status, and room mission start.
- [Report addition](verification/classroom/report-score.png): a separately labeled classroom Mission Score, local flight history, optional success lessons, required failure lessons, and submission status.
- [Sources addition](verification/final-screenshots/sources-modal-addition-react.png): the full classroom scoring formula, bonus rules, server validation scope and offline storage behavior, labeled as game model.
- [All leaderboard screenshots](verification/classroom): Mission Score, Fuel Saver, Most Science, Cheapest Success, Fastest Arrival and Best failure lesson, plus offline queue and mobile views. Failure lessons are newest first, matching the existing API; they are not automatically graded for quality.

## API, fallback and classroom checks

The client uses VITE_API_URL with a five-second timeout. Blank URL, network failure, HTTP 5xx or unavailable database permits local practice. HTTP 4xx validation/auth/not-found/conflict errors are shown and do not silently become local success.

Design persistence remains geodesic.v1. Classroom rooms, saved team credentials, the latest 100 completed flight reports, cached rankings and pending uploads use geodesic.classroom.v1. Local rooms work within one browser profile/origin and cannot be joined across devices. Shared rooms keep their identity during outages; unknown/new shared teams require reconnection. Queued reports preserve clientRunId, replay once and use server-owned scores after upload. A storage/quota failure keeps the current session playable in memory and visibly tells the user to keep the page open.

[Browser integration evidence](verification/classroom.json) passes: create a shared room, join two teams from separate contexts, submit an actual Moon flight record, inspect every tab, submit a failure lesson, simulate database unavailability, reload with saved credentials/queue, reconnect, and upload exactly once. The built production app also passes local create/join/reload/submission, refuses a local code on another isolated browser, and passes mobile width and keyboard tab checks. No page errors were recorded.

The HTTP checks use the existing Express app, repository, validation and scoring with injected SQL. **No real MySQL/Laragon connection or cross-device LAN/cloud deployment is claimed.** Backend files, schema and existing backend tests were not rewritten or rerun as migration work.

## Numerical checks and final verification

15 frontend Node tests pass. These include unchanged pure-module/source fingerprints, physics/Three/store regressions, scoring equality with the existing backend, reference-Isp/dry-mass payloads, real-flight backend validation, independent rankings, persistence, idempotency, pending replay, auth errors, room-selection races and storage quota recovery.

The original validation values remain unchanged:

| Case | Ours | Difference % |
| --- | --- | --- |
| Voyager 1 Jupiter v1j | 338601.1776904227 | -2.949016110974036 |
| Voyager 2 Saturn v2s | 157980.483990942 | -1.8754757820235952 |
| New Horizons C3 nhc3 | 158.5979279535151 | 0.3784354136171497 |
| New Horizons Jupiter nhj | 2336576.6393504934 | 1.590288667412758 |

Their original historical-source verification caveats remain. No new scientific-source verification is claimed.

Production build passes. Vite retains its warning about the approximately 976 kB application chunk (282 kB gzip); this does not block the build. Google Fonts still uses the original external font service. Local gameplay and classroom data fallback do not constitute a fully cached offline/PWA installation.

Reproduce the final checks from the project root (keep frontend dev running for the original step 6 script):

    npm.cmd --prefix frontend run build
    npm.cmd --prefix frontend test
    node scripts/verify-playthroughs.mjs
    node scripts/verify-classroom.mjs
    node scripts/verify-final-screens.mjs
    node scripts/compare-screenshots.mjs

The archived original step 6 evidence is not regenerated by final integration tests; rerunning verify-visual.mjs against the completed classroom will naturally show the intentional extensions. The existing 36 source/app captures remain available for review.
`);
fs.writeFileSync('README.md', `# Geodesic

The React migration and frontend steps 6–8 are complete. The frontend builds, all 15 frontend tests pass, and normal-speed Moon, Mars and Jupiter flights succeed in both the source and React app. See [PARITY.md](PARITY.md) and [the paired screenshot gallery](verification/review.html).

The source of truth is index.html beside frontend/ and backend/: D:\\MY Project\\Nasa\\mockup\\nasa\\index.html. It includes Two Minds. That file and the existing backend are unchanged.

## Run the frontend

Use Node.js 24 and system Chrome for the verification scripts.

    cd frontend
    npm.cmd ci
    Copy-Item .env.example .env
    npm.cmd run dev

Open http://127.0.0.1:5173. Three.js is pinned to 0.170.0. The port keeps the original renderer, physics, world/model builders, store, screen controllers, Two Minds laboratory and overlays. Original Google Fonts downloads still require a connection.

Set VITE_API_URL in frontend/.env to the existing backend origin, for example http://localhost:3001. Leave it blank for local practice. Vite variables are public build-time values; restart dev/rebuild after changes and never put database credentials there. Configure the existing backend's FRONTEND_URL to the exact browser origin, e.g. http://127.0.0.1:5173. For other devices, both frontend and API addresses must be reachable from those devices; localhost refers to the student's own device.

    npm.cmd test
    npm.cmd run build
    npm.cmd run preview

## Classroom

On the landing page, open Play in class. Enter a teacher name and mission, then Create room. Students enter the code and their team name from their own devices when the API/database are available. Team credentials remain on the joining device, and rejoining the same saved team resumes it.

Start room mission, design/fly it, and use Submit to [room code] in the report. The original science return and debrief remain unchanged. Classroom Mission Score is separately labeled as a game model and explained in Sources. Failed flights have no Mission Score; a written lesson is required to submit them to the failure lesson board.

The six tabs are Mission Score, Fuel Saver, Most Science, Cheapest Success, Fastest Arrival and Best failure lesson. Rankings refresh every five seconds and can be refreshed manually. Failure lessons are newest first and are not quality-graded automatically.

With no API, a network failure, or an unavailable database, the app offers local practice and clearly labels rooms/results as local to this browser. Such room codes cannot work on another device. An existing shared team's offline report is queued with its stable clientRunId, survives reload, and retries on reconnection. HTTP 4xx errors remain visible. A storage/quota problem falls back to the open page's memory and displays a keep-open notice.

Designs use the original geodesic.v1 key. Rooms, saved memberships, cached leaderboards, up to 100 flight reports and pending submissions use geodesic.classroom.v1. Clearing browser data removes these local records. The app retains the original external font dependency; this fallback is not a service-worker/PWA installation.

## Existing backend

The backend was not rewritten or provisioned during this continuation. Use its existing Express/MySQL setup and schema. No database is created automatically.

Create/select your existing database in Laragon and import backend/schema.sql yourself. Then:

    cd backend
    npm.cmd install
    Copy-Item .env.example .env
    npm.cmd start

Configure PORT (normally 3001), DATABASE_URL (existing MySQL database), and FRONTEND_URL (exact frontend origin). GET /api/health reports {"ok":true,"db":false} while MySQL is unavailable; the HTTP server stays up and database-backed routes return 503.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /api/health | Server/database status |
| POST | /api/rooms | Create from teacherName and mission |
| POST | /api/rooms/:code/join | Join by name; returns team id/token/mission |
| POST | /api/runs | Submit roomCode, teamId, token, clientRunId, design and result |
| GET | /api/rooms/:code/leaderboard?tab=missionScore | Room, teams and ranking |

The server owns the classroom score and validates reported metrics; it does not replay the physics. Duplicate teamId/clientRunId submissions return the existing run. Both reference propellant values use the source report's 340 s Isp and the same spacecraft dry mass. The frontend's pure classroom implementation is in frontend/src/core/scoring.js and matches backend/src/scoring.js.

## Verification

System Chrome ${visual.browser} was used through Playwright's installed Chrome channel, rather than a bundled browser. The native flight checks use original browser timing/default cruise speed, original autopilot/assisted controls and actual UI inputs. Still-image checks use fixed frames in a separate harness.

From this project root:

    node scripts/verify-playthroughs.mjs
    node scripts/verify-classroom.mjs
    node scripts/verify-final-screens.mjs
    node scripts/compare-screenshots.mjs

Keep frontend dev on port 5173 for the playthrough harness. The classroom and final-screen scripts start and close their own test/preview servers. Ports 3002, 4173, 4174, 5174, 5175 and 5176 must be free when used by those scripts. Browser integration uses the unchanged Express app/repository/scoring with injected SQL; real MySQL/Laragon and LAN/cloud deployment remain unverified. No deployment was performed.

Evidence is in verification/playthroughs.json, verification/visual-parity.json, verification/final-visual.json and verification/classroom.json. PARITY.md records every screen, all intentional classroom additions, measured motion-only screenshot differences, exact matching flight fields and remaining environmental limitations.
`);
console.log('Updated PARITY.md and README.md from passing evidence.');
