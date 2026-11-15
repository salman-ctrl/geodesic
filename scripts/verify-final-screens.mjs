// Post-integration checks: original game screens plus the explicitly requested additions.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { baselineServer, chromium, openGame, frames, go, launchOptions, require } from './browser-harness.mjs';
const { PNG } = require('./node_modules/playwright-core/lib/utilsBundle.js');
const { preview } = await import(pathToFileURL(require.resolve('vite')).href);
const production = await preview({ root: path.resolve('frontend'), preview: { port: 4174, host: '127.0.0.1', strictPort: true } });
process.env.REACT_URL = 'http://127.0.0.1:4174';
const fixtures = JSON.parse(fs.readFileSync('verification/mission-fixtures.json'));
const flights = JSON.parse(fs.readFileSync('verification/playthroughs.json')).missions;
const server = await baselineServer(), browser = await chromium.launch(launchOptions);
const evidence = { browser: await browser.version(), scope: 'Final app after API/classroom integration; source served unchanged.', screens: [] };
fs.mkdirSync('verification/final-screenshots', { recursive: true });
const games = [];
try {
  for (const name of ['source', 'react']) games.push(await openGame(browser, name, fixtures.moon, { controlled: true }));
  const both = async fn => { for (const g of games) await fn(g.page); };
  async function capture(name, expectedAddition = false) {
    const buffers = [];
    for (const g of games) { await g.page.mouse.move(0, 0); buffers.push(await g.page.screenshot({ path: `verification/final-screenshots/${name}-${g.name}.png`, animations: 'disabled' })); }
    const [a, b] = buffers.map(buffer => PNG.sync.read(buffer)); let count = 0, maximum = 0;
    for (let i = 0; i < a.data.length; i += 4) { let delta = 0; for (let j = 0; j < 3; j++) delta = Math.max(delta, Math.abs(a.data[i + j] - b.data[i + j])); if (delta > 15) count++; maximum = Math.max(maximum, delta); }
    const row = { name, expectedAddition, differentPercent: count / (a.width * a.height) * 100, maximumChannelDifference: maximum };
    evidence.screens.push(row); console.log(row); fs.writeFileSync('verification/final-visual.json', JSON.stringify(evidence, null, 2));
  }
  await both(p => frames(p)); await capture('hero');
  for (const screen of ['builder', 'craft', 'route']) { await both(p => go(p, screen)); await capture(screen); }
  const F = flights.find(f => f.name === 'source' && f.mission === 'moon').result;
  await both(async p => { await p.evaluate(F => GEO.store.set('flight', structuredClone(F)), F); });
  await both(p => go(p, 'cruise', { err: [.003, 0, 0] })); await capture('cruise');
  await both(p => go(p, 'arrival')); await capture('arrival');
  await both(p => go(p, 'descent', { assist: true })); await capture('descent');
  await both(async p => { await p.evaluate(F => GEO.store.set('flight', structuredClone(F)), F); });
  await both(p => go(p, 'report')); await capture('report-top');
  await both(async p => { await p.locator('#repScroll').evaluate(e => e.scrollTop = e.scrollHeight); }); await capture('report-addition', true);
  await both(async p => { await p.locator('#repScroll').evaluate(e => e.scrollTop = 0); await p.locator('#rpVal').evaluate(e => e.click()); }); await capture('sources-modal');
  await both(async p => { await p.locator('#modal .card').evaluate(e => e.scrollTop = e.scrollHeight); }); await capture('sources-modal-addition', true);
  await both(async p => { await p.locator('#modal .card').evaluate(e => e.scrollTop = 0); await p.locator('#modalX').click(); await go(p, 'landing'); });
  for (const id of ['sec-sources', 'sec-class']) { await both(async p => { await p.locator('#' + id).evaluate(e => e.scrollIntoView({ block: 'start' })); await frames(p, 90); }); await capture(id, true); }
  evidence.errors = games.map(g => ({ name: g.name, errors: g.errors }));
  evidence.passed = evidence.screens.every(s => s.expectedAddition || s.differentPercent < .01) && games.every(g => !g.errors.length);
  fs.writeFileSync('verification/final-visual.json', JSON.stringify(evidence, null, 2));
  if (!evidence.passed) throw new Error('Unexpected final screen difference');
} finally { await browser.close(); server.close(); await production.httpServer.close(); }
