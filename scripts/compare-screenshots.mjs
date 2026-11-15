import fs from 'node:fs';
import assert from 'node:assert/strict';
import { require } from './browser-harness.mjs';
const { PNG } = require('./node_modules/playwright-core/lib/utilsBundle.js');
const evidence = JSON.parse(fs.readFileSync('verification/visual-parity.json'));
let exact = 0;
for (const row of evidence.screens) {
  const [a, b] = ['source', 'react'].map(name => PNG.sync.read(fs.readFileSync(`verification/screenshots/${row.name}-${name}.png`)));
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let count = 0, total = 0, maximum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    let delta = 0; for (let j = 0; j < 3; j++) delta = Math.max(delta, Math.abs(a.data[i + j] - b.data[i + j]));
    if (delta > 15) count++; total += delta; maximum = Math.max(maximum, delta);
  }
  row.pixels = { differentPercent: count / (a.width * a.height) * 100, meanError: total / (a.width * a.height), maximumChannelDifference: maximum };
  if (!maximum) exact++;
  row.expectedMotion = ['launch', 'landing-sec-class'].includes(row.name);
  row.passed = row.differences.length === 0 && row.pixels.differentPercent <= (row.name === 'launch' ? 1.5 : row.name === 'landing-sec-class' ? .1 : 0);
}
evidence.byteIdenticalPairs = exact;
evidence.passed = evidence.screens.every(s => s.passed) && evidence.errors.every(g => !g.errors.length);
fs.writeFileSync('verification/visual-parity.json', JSON.stringify(evidence, null, 2));
const pairs = evidence.screens.map(row => `<section><h2>${row.name} — ${row.passed ? 'PASS' : 'FAIL'}</h2><p>${row.pixels.differentPercent.toFixed(4)}% differing pixels above 15/255 channel tolerance${row.expectedMotion ? ' (animated effect)' : ''}</p><div class="pair"><figure><figcaption>Source index.html</figcaption><a href="screenshots/${row.name}-source.png"><img loading="lazy" src="screenshots/${row.name}-source.png"></a></figure><figure><figcaption>React · step 6, before classroom additions</figcaption><a href="screenshots/${row.name}-react.png"><img loading="lazy" src="screenshots/${row.name}-react.png"></a></figure></div></section>`).join('\n');
const final = JSON.parse(fs.readFileSync('verification/final-visual.json'));
const finalPairs = final.screens.map(row => `<section><h2>${row.name}${row.expectedAddition ? ' · requested addition' : ' · final parity'}</h2><div class="pair">${['source', 'react'].map(name => `<figure><figcaption>${name}</figcaption><a href="final-screenshots/${row.name}-${name}.png"><img loading="lazy" src="final-screenshots/${row.name}-${name}.png"></a></figure>`).join('')}</div></section>`).join('\n');
const classrooms = fs.readdirSync('verification/classroom').filter(n => n.endsWith('.png')).map(name => `<section><h2>${name.replace('.png', '')}</h2><a href="classroom/${name}"><img loading="lazy" style="max-width:100%" src="classroom/${name}"></a></section>`).join('\n');
fs.writeFileSync('verification/review.html', `<!doctype html><meta charset="utf-8"><title>Geodesic parity evidence</title><style>body{font:15px system-ui;background:#141b3a;color:#fbf6ec;margin:0;padding:30px}h1,h2{font-weight:600}h2{font-size:18px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0}img{width:100%;height:auto}figcaption,p{color:#b9c2cf;margin:8px 0}section{padding:20px 0;border-bottom:1px solid #45516b}a{color:#7fd6cd}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><h1>Geodesic parity evidence</h1><p>System Chrome ${evidence.browser}. Step 6: every source screen/overlay, 36 paired captures. Separate native-speed playthrough evidence is in playthroughs.json. Final captures document the requested classroom/report/Sources additions.</p><h1>Source vs React · step 6</h1>${pairs}<h1>Final production app after integration</h1>${finalPairs}<h1>Classroom integration</h1>${classrooms}`);
console.log(JSON.stringify({ passed: evidence.passed, pairs: evidence.screens.length, byteIdentical: exact, gallery: 'verification/review.html' }, null, 2));
assert.equal(evidence.passed, true);
