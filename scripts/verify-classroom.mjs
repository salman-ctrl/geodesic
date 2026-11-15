import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { require, chromium, launchOptions } from './browser-harness.mjs';
import { classroomFixture } from './classroom-fixture.mjs';
const { createServer, preview } = await import(pathToFileURL(require.resolve('vite')).href);
const fixture = classroomFixture('http://127.0.0.1:5176');
const apiServer = fixture.app.listen(3002, '127.0.0.1'); await new Promise(r => apiServer.once('listening', r));
const vite = await createServer({ root: path.resolve('frontend'), cacheDir: 'node_modules/.vite-classroom', define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:3002') }, server: { port: 5176, host: '127.0.0.1', strictPort: true } }); await vite.listen();
const production = await preview({ root: path.resolve('frontend'), preview: { port: 4173, host: '127.0.0.1', strictPort: true } });
const browser = await chromium.launch(launchOptions);
const evidence = { browser: await browser.version(), backend: 'Existing Express app, repository, validation and scoring; injected SQL fixture, not real MySQL.', checks: [], errors: [] };
const flight = JSON.parse(fs.readFileSync('verification/playthroughs.json')).missions.find(m => m.mission === 'moon' && m.name === 'react').result;
fs.mkdirSync('verification/classroom', { recursive: true });
const contexts = [];
async function device(origin = 'http://127.0.0.1:5176') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
  const page = await context.newPage(); page.on('pageerror', e => evidence.errors.push(e.stack));
  await page.goto(origin); await page.waitForFunction(() => !!window.GEO); await page.locator('#sec-class').scrollIntoViewIfNeeded();
  await page.locator('#teacherName').waitFor(); return page;
}
async function snapshot(page, name) { await page.mouse.move(0, 0); await page.screenshot({ path: `verification/classroom/${name}.png`, animations: 'disabled' }); }
async function join(page, code, name) {
  await page.locator('#cmInput').fill(code); await page.locator('#teamName').fill(name); await page.locator('#cmJoin').click();
  await page.waitForFunction(name => GEO.store.session.classroom.team?.name === name, name);
}
async function report(page, success, lesson = '') {
  const next = structuredClone(flight);
  if (!success) next.outcome = { ok: false, phase: 'arrival', title: 'Flew past the Moon', why: 'Classroom submission test fixture.' };
  await page.evaluate(F => { GEO.S.mission = F.mission; GEO.S.rocket = F.rocket; GEO.S.craft = F.craft; GEO.store.set('flight', F); GEO.go('report'); }, next);
  await page.locator('#classroomReport').scrollIntoViewIfNeeded();
  await page.locator('#flightLesson').fill(lesson);
}
async function refresh(page) {
  await page.locator('#leaderboardRefresh').click(); await page.waitForFunction(() => document.querySelector('#leaderboardRefresh')?.textContent === 'Refresh');
}
try {
  const teacher = await device();
  await teacher.locator('#teacherName').fill('Bu Sari'); await teacher.locator('#roomMission').selectOption('moon'); await teacher.locator('#cmNew').click();
  await teacher.waitForFunction(() => GEO.store.session.classroom.room?.code);
  const code = await teacher.locator('#cmCode').innerText(); assert.match(code, /^[A-Z2-9]{8}$/);
  const student = await device(), second = await device();
  await join(student, code, 'Team Garuda'); await join(second, code, 'Team Komodo');
  await refresh(teacher); await teacher.waitForFunction(() => document.querySelectorAll('#cmTeams .cm-team').length === 2); assert.equal(await teacher.locator('#cmTeams .cm-team').count(), 2);
  evidence.checks.push('Room creation and two teams joining from three isolated browser contexts');
  await snapshot(teacher, 'shared-room-two-teams');
  await report(student, true); await snapshot(student, 'report-score');
  await student.locator('#submitClassroomRun').click(); await student.locator('#runSubmissionStatus').filter({ hasText: 'shared classroom' }).waitFor();
  assert.equal(fixture.runs.length, 1); assert.equal(fixture.runs[0].result.science.got, 65);
  assert.equal(await student.locator('#submitClassroomRun').isDisabled(), true);
  for (const tab of ['missionScore', 'fuelSaver', 'mostScience', 'cheapestSuccess', 'fastestArrival', 'bestFailureLesson']) {
    await teacher.locator('#tab-' + tab).click(); await refresh(teacher);
    await teacher.waitForFunction(expected => document.querySelector('#classroomRankings')?.textContent.includes(expected), tab === 'bestFailureLesson' ? 'No failure lessons yet' : 'Team Garuda');
    const text = await teacher.locator('#classroomRankings').innerText();
    assert.ok(text.includes(tab === 'bestFailureLesson' ? 'No failure lessons yet' : 'Team Garuda'));
    await teacher.locator('.classroom-board').scrollIntoViewIfNeeded(); await snapshot(teacher, 'leaderboard-' + tab);
  }
  evidence.checks.push('Native Moon flight report submitted; all six leaderboard tabs and server-owned score displayed');
  await report(second, false); await second.locator('#submitClassroomRun').click(); assert.equal(fixture.runs.length, 1);
  await second.locator('#flightLesson').fill('Correct the course at the first window.'); await second.locator('#submitClassroomRun').click();
  await second.locator('#runSubmissionStatus').filter({ hasText: 'shared classroom' }).waitFor();
  await refresh(teacher); await teacher.waitForFunction(() => document.querySelector('#classroomRankings')?.textContent.includes('first window')); assert.match(await teacher.locator('#classroomRankings').innerText(), /first window/);
  await snapshot(teacher, 'failure-lesson'); assert.equal(fixture.runs[1].mission_score, null);
  evidence.checks.push('Failed flights require a lesson, have no Mission Score, and appear in the failure tab');
  fixture.db.available = false;
  await report(student, true, 'An offline retry keeps its original run id.'); await student.locator('#submitClassroomRun').click();
  await student.locator('#runSubmissionStatus').filter({ hasText: 'retry' }).waitFor();
  assert.equal(await student.evaluate(() => GEO.store.session.classroom.pending), 1);
  await student.reload(); await student.waitForFunction(() => GEO.store.session.classroom?.pending === 1);
  await student.locator('#sec-class').scrollIntoViewIfNeeded(); await snapshot(student, 'offline-queued-resumed');
  await refresh(teacher); await teacher.waitForFunction(() => document.querySelector('.classroom-board')?.textContent.includes('Offline')); assert.match(await teacher.locator('.classroom-board').innerText(), /Offline/);
  fixture.db.available = true; await refresh(student); await student.waitForFunction(() => GEO.store.session.classroom.pending === 0);
  assert.equal(fixture.runs.length, 3); await refresh(student); assert.equal(fixture.runs.length, 3);
  evidence.checks.push('Database-down fallback, cached leaderboard, persisted team and queued report after reload, one idempotent upload after reconnect');
  const local = await device('http://127.0.0.1:4173');
  await local.locator('#teacherName').fill('Local Teacher'); await local.locator('#roomMission').selectOption('moon'); await local.locator('#cmNew').click();
  await local.waitForFunction(() => GEO.store.session.classroom.room?.code); const localCode = await local.locator('#cmCode').innerText();
  await join(local, localCode, 'Local Garuda'); await snapshot(local, 'local-room');
  await local.reload(); await local.waitForFunction(() => GEO.store.session.classroom?.team?.name === 'Local Garuda');
  await report(local, true); await local.locator('#submitClassroomRun').click(); await local.locator('#runSubmissionStatus').filter({ hasText: 'local leaderboard' }).waitFor();
  await local.locator('#classroomReport .link').click(); await local.locator('#sec-class').scrollIntoViewIfNeeded();
  await refresh(local); await local.waitForFunction(() => document.querySelector('#classroomRankings')?.textContent.includes('Local Garuda')); assert.match(await local.locator('#classroomRankings').innerText(), /Local Garuda/);
  const outsider = await device('http://127.0.0.1:4173'); await outsider.locator('#cmInput').fill(localCode); await outsider.locator('#teamName').fill('Other browser'); await outsider.locator('#cmJoin').click();
  await outsider.locator('[role="alert"]').waitFor(); assert.match(await outsider.locator('[role="alert"]').innerText(), /not saved on this device/);
  evidence.checks.push('Built production app: local create/join, reload persistence, report submission, and explicit refusal to imply cross-device local rooms');
  await local.setViewportSize({ width: 390, height: 844 }); await local.locator('#sec-class').scrollIntoViewIfNeeded(); await snapshot(local, 'mobile-local-room');
  assert.equal(await local.locator('#sec-class').evaluate(e => e.scrollWidth <= innerWidth), true);
  await local.locator('#tab-missionScore').focus(); await local.keyboard.press('ArrowRight'); assert.equal(await local.locator('#tab-fuelSaver').getAttribute('aria-selected'), 'true');
  evidence.checks.push('Mobile classroom width and accessible keyboard tab navigation');
  assert.deepEqual(evidence.errors, []); evidence.passed = true;
} catch (e) { evidence.error = e.stack; throw e; }
finally {
  fs.writeFileSync('verification/classroom.json', JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence, null, 2));
  await browser.close(); await vite.close(); await production.httpServer.close(); await new Promise(r => apiServer.close(r));
}
