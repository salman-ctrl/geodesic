import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import config from '../tailwind.config.js';

const sourcePath=new URL('../../index.html',import.meta.url);
const source=fs.readFileSync(sourcePath,'utf8').replaceAll('\r\n','\n');
test('original source HTML is untouched',()=>{
  const hash=crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
  assert.equal(hash,'0cd3ae99845caff06e85f9ceac5d67b4ac49cf8cfddd5557cf647bad8b0b4a98');
});
test('Vite keeps the complete original CSS, colors and font imports',()=>{
  const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8').replaceAll('\r\n','\n');
  assert.ok(css.endsWith(source.split('<style>')[1].split('</style>')[0]));
  assert.deepEqual(config.theme.extend.colors,{paper:'#fbf6ec',ink:'#2b2622',accent:'#1f6f6a',flame:'#e2772e',night:'#141b3a'});
  const head=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const sourceFont=source.match(/<link href="(https:\/\/fonts.googleapis.com[^\"]+)"/)[1];
  assert.ok(head.includes(sourceFont));
});
