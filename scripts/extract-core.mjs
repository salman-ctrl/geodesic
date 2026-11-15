// Read-only extraction of the source's existing module fences. Never writes source HTML.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { parse } = require('acorn');
const { analyze } = require('eslint-scope');
const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replaceAll('\r\n','\n');
const script = html.slice(html.lastIndexOf('<script type="module">')+'<script type="module">'.length).split('</script>')[0];
const fences = [...script.matchAll(/^\/\/ ={20,}\n\/\/ MODULE  (.+)\n/gm)];
export function bindings(node) {
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'ObjectPattern') return node.properties.flatMap(p=>bindings(p.value || p.argument));
  if (node.type === 'ArrayPattern') return node.elements.filter(Boolean).flatMap(bindings);
  if (node.type === 'RestElement') return bindings(node.argument);
  if (node.type === 'AssignmentPattern') return bindings(node.left);
  return [];
}
export const modules = fences.map((f,i)=>{
  const name=f[1], start=f.index;
  let body=script.slice(start, fences[i+1]?.index ?? script.length);
  body=body.split('// [PURE:END]')[0];
  const ast=parse(body,{ecmaVersion:'latest',sourceType:'module',ranges:true});
  const names=ast.body.flatMap(n=>n.type==='VariableDeclaration'?n.declarations.flatMap(d=>bindings(d.id)):(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')?[n.id.name]:[]);
  const free=[...new Set(analyze(ast,{ecmaVersion:2024,sourceType:'module',optimistic:true}).globalScope.through.map(r=>r.identifier.name))];
  return {name,body,ast,names,free};
});
export const owners = new Map(modules.flatMap(m=>m.names.map(n=>[n,m])));
export function importsFor(m) {
  const groups=new Map();
  for(const n of m.free){const owner=owners.get(n);if(owner && owner!==m){if(!groups.has(owner.name))groups.set(owner.name,[]);groups.get(owner.name).push(n);}}
  let out='';
  for(const [name,names]of groups){let rel=path.posix.relative(path.posix.dirname(m.name),name);if(!rel.startsWith('.'))rel='./'+rel;out+=`import { ${names.join(', ')} } from '${rel}';\n`;}
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1])===import.meta.filename) {
  const pure=modules.filter(m=>m.name.startsWith('src/core/'));
  for(const m of pure){const file=path.join(root,'frontend',m.name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,importsFor(m)+'\n// ORIGINAL MODULE BEGIN\n'+m.body+'// ORIGINAL MODULE END\n'+`export { ${m.names.join(', ')} };\n`);}
  fs.writeFileSync(path.join(root,'frontend/src/core/index.js'),pure.map(m=>`export * from './${m.name.slice('src/core/'.length)}';`).join('\n')+'\n');
  console.log(`Extracted ${pure.length} pure modules without changing their bodies.`);
}
