// Compare React's DOM shells with the untouched HTML before either runtime starts.
// This complements (and does not replace) WebGL screenshot/playthrough verification.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {chromium}=require('playwright');
const vite=await createServer({root:path.join(root,'frontend'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},plugins:[{
  name:'verify-shells-without-runtime',enforce:'pre',
  transform(code,id){if(id.endsWith('/src/App.jsx'))return code.replace("import { startGame } from './app/start.js';","const startGame=()=>{};");},
}]});
let browser;
try{
  const {default:App}=await vite.ssrLoadModule('/src/App.jsx');
  const html=renderToStaticMarkup(React.createElement(App));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--disable-gpu-sandbox']});
  const page=await browser.newPage();
  const normalize=()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_COMMENT);const comments=[];while(walker.nextNode())comments.push(walker.currentNode);comments.forEach(n=>n.remove());document.body.normalize();
    function node(n){
      if(n.nodeType===3)return {text:n.data};
      if(n.nodeType!==1)return null;
      return {tag:n.localName,attrs:[...n.attributes].map(a=>[a.name,a.name==='style'?n.style.cssText:a.value]).sort((a,b)=>a[0].localeCompare(b[0])),children:[...n.childNodes].map(node).filter(Boolean)};
    }
    return [...document.body.childNodes].map(node).filter(Boolean);
  };
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const body=source.split('<body>')[1].slice(0,source.split('<body>')[1].indexOf('<script type="module">'));
  await page.setContent('<body>'+body+'</body>');const original=await page.evaluate(normalize);
  await page.setContent('<body>'+html+'</body>');const migrated=await page.evaluate(normalize);
  fs.mkdirSync(path.join(root,'verification'),{recursive:true});
  fs.writeFileSync(path.join(root,'verification/react-shell.html'),html);
  assert.deepEqual(migrated,original);
  const result={passed:true,scope:'All original DOM shells, attributes, text and styles; runtime disabled for this structural check only',components:16};
  fs.writeFileSync(path.join(root,'verification/shells.json'),JSON.stringify(result,null,2));console.log(result);
}finally{await browser?.close();await vite.close();}
