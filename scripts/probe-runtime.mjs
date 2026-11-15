import fs from 'node:fs';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {chromium}=require('playwright');
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(new URL('../index.html',import.meta.url)));}).listen(5174,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{
for(const [name,url] of [['source','http://127.0.0.1:5174'],['react','http://127.0.0.1:5173']]){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
 await page.goto(url);await page.waitForTimeout(7000);
 console.log(name,await page.evaluate(()=>({geo:!!window.GEO,screen:window.GEO?.screen(),fonts:document.fonts.status})),errors);
 await page.screenshot({path:`verification/${name}-boot.png`});await page.close();
}
}finally{await browser.close();server.close();}
