import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { modules } from '../../scripts/extract-core.mjs';

test('Three modules preserve every function, class, initializer and setup statement',()=>{
  const three=modules.filter(m=>m.name.startsWith('src/three/'));
  for(const m of three){
    const port=fs.readFileSync(new URL('../'+m.name,import.meta.url),'utf8');
    for(const n of m.ast.body){
      if(n.type==='VariableDeclaration'){
        for(const d of n.declarations)if(d.init)assert.ok(port.includes('('+m.body.slice(d.id.start,d.id.end)+' = '+m.body.slice(d.init.start,d.init.end)+');'),m.name);
      }else assert.ok(port.includes(m.body.slice(n.start,n.end)),m.name+' '+n.type);
    }
  }
  const renderer=fs.readFileSync(new URL('../src/three/renderer.js',import.meta.url),'utf8');
  assert.equal((renderer.match(/new THREE.WebGLRenderer/g)||[]).length,1);
  assert.ok(renderer.includes("canvas:$('#gl')"));
});
