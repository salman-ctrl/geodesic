// Step 1 only. This is not a game parity screenshot or playthrough.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless:true,args:['--no-sandbox','--disable-gpu-sandbox'],
});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],failedRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),reason:r.failure()?.errorText}));
  await page.goto(url);
  await page.waitForSelector('#root .font-display');
  const style=await page.locator('#root .font-display').evaluate(e=>{
    const s=getComputedStyle(e);return {font:s.fontFamily,bg:s.backgroundColor,fg:s.color};
  });
  assert.ok(style.font.includes('Fraunces'));
  assert.equal(style.bg,'rgb(20, 27, 58)');
  assert.equal(style.fg,'rgb(251, 246, 236)');
  assert.deepEqual(errors,[]);
  const output=path.join(root,'verification');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'step1-scaffold.png')});
  const result={step:1,passed:true,style,errors,failedRequests,limitation:'Font downloads require network. This verifies the scaffold only, not game parity.'};
  fs.writeFileSync(path.join(output,'step1.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await browser.close();}
