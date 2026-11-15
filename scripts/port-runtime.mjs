// Mechanical port of the source fences. Pure modules are never rewritten here.
// Explicit initialization preserves the single-file execution order across ESM cycles.
import fs from 'node:fs';
import path from 'node:path';
import { modules, bindings, importsFor } from './extract-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const external={THREE:"import * as THREE from 'three';",OrbitControls:"import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",CSS2DRenderer:"import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';",CSS2DObject:"import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';"};
const stage=process.argv[2];
const chosen=modules.filter(m=>stage==='three'?m.name.startsWith('src/three/')||m.name.startsWith('src/ui/')&&m.name!=='src/ui/tutorial.js'&&m.name!=='src/ui/physicsDock.js':stage==='state'?m.name.startsWith('src/state/'):!m.name.startsWith('src/core/')&&!m.name.startsWith('src/three/')&&!m.name.startsWith('src/state/')&&!m.name.startsWith('src/ui/'));
const runtime=modules.filter(m=>!m.name.startsWith('src/core/'));
if(stage==='screens')chosen.push(...modules.filter(m=>['src/ui/tutorial.js','src/ui/physicsDock.js'].includes(m.name)));
for(const m of chosen){
  const declarations=[],setup=[],variables=[];
  for(const n of m.ast.body){
    if(n.type==='ImportDeclaration'||n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')declarations.push(m.body.slice(n.start,n.end));
    else if(n.type==='VariableDeclaration'){
      for(const d of n.declarations){variables.push(...bindings(d.id));if(d.init)setup.push('('+m.body.slice(d.id.start,d.id.end)+' = '+m.body.slice(d.init.start,d.init.end)+');');}
    }else setup.push(m.body.slice(n.start,n.end));
  }
  const extra=m.free.filter(n=>external[n]).map(n=>external[n]);
  const header=m.body.slice(0,m.ast.body[0]?.start||0);
  let text=[importsFor(m.name==='src/main.js'?{...m,name:'src/app/boot.js'}:m),...extra,header,variables.length?'let '+variables.join(', ')+';':'',...declarations,'export function initialize(){',...setup,'}',m.names.length?'export { '+m.names.join(', ')+' };':'',''].join('\n');
  // ESM imports are read-only. Keep the single mutable particle cursor in its owner.
  if(m.name==='src/three/launchSite.js')text+='\nexport function nextSmoke(){ return smokeI=(smokeI+1)%SMOKE_N; }\n';
  if(m.name==='src/screens/launch.js')text=text.replace('smokeI, SMOKE_N','nextSmoke, SMOKE_N').replace('smokeP[smokeI=(smokeI+1)%SMOKE_N]','smokeP[nextSmoke()]');
  const target=path.join(root,'frontend',m.name==='src/main.js'?'src/app/boot.js':m.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);
}
if(stage==='screens'){
  let imports='',calls='';
  for(const [i,m]of runtime.entries()){
    let name=m.name==='src/main.js'?'src/app/boot.js':m.name;
    let relative=path.posix.relative('src/app',name);if(!relative.startsWith('.'))relative='./'+relative;
    imports+=`import { initialize as init${i} } from '${relative}';\n`;calls+=`  init${i}(); // ${name}\n`;
  }
  fs.writeFileSync(path.join(root,'frontend/src/app/start.js'),imports+'\nlet started=false;\nexport function startGame(){\n  if(started)return;\n  started=true;\n'+calls+'}\n');
}
console.log(`Ported ${chosen.length} ${stage} modules; core and source HTML untouched.`);
