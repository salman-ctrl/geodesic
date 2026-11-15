"""Convert the source DOM shells to React components without wrapper elements."""
from pathlib import Path
from html.parser import HTMLParser
import json,re

root=Path(__file__).resolve().parent.parent
source=(root/'index.html').read_text(encoding='utf-8')
body=source.split('<body>',1)[1].split('<script type="module">',1)[0]
void={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Node:
    def __init__(self,tag='',attrs=()):self.tag=tag;self.attrs=dict(attrs);self.children=[]
class Parser(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root]
    def handle_starttag(self,tag,attrs):
        n=Node(tag,attrs);self.stack[-1].children.append(n)
        if tag not in void:self.stack.append(n)
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag) if tag not in void else None
    def handle_endtag(self,tag):
        if tag in void:return
        assert self.stack[-1].tag==tag,(self.stack[-1].tag,tag)
        self.stack.pop()
    def handle_data(self,s):self.stack[-1].children.append(s)

components={'landing':'Landing','s-select':'Select','s-builder':'Builder','s-craft':'Craft','s-route':'Route','s-gonogo':'GoNoGo','s-launch':'Launch','s-cruise':'Cruise','s-flyby':'Flyby','s-arrival':'Arrival','s-descent':'Descent','s-report':'Report','physicsDock':'PhysicsInsights','pass':'PassDevice','modal':'Modal','coach':'Tutorial'}
attrs={'class':'className','for':'htmlFor','tabindex':'tabIndex','maxlength':'maxLength','autocomplete':'autoComplete','stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin','viewbox':'viewBox','fill-rule':'fillRule','clip-rule':'clipRule','readonly':'readOnly','value':'defaultValue','checked':'defaultChecked'}
boolean={'hidden','disabled','readOnly','defaultChecked','multiple','required','autoFocus'}
def camel(v):return re.sub(r'-([a-z])',lambda m:m[1].upper(),v)
def render(n,current=None):
    if isinstance(n,str):return '{'+json.dumps(n,ensure_ascii=False)+'}' if n else ''
    name=components.get(n.attrs.get('id'))
    if name and name!=current:return '<'+name+' />'
    a=[]
    for k,v in n.attrs.items():
        key=attrs.get(k,k)
        if key=='style':
            style={}
            for item in v.split(';'):
                if ':' in item:
                    prop,val=item.split(':',1);style[prop if prop.startswith('--') else camel(prop.strip())]=val.strip()
            a.append('style={'+json.dumps(style,ensure_ascii=False)+'}')
        elif key in boolean:a.append(key+'={true}')
        else:a.append(key+'='+json.dumps(v or '',ensure_ascii=False))
    start='<'+n.tag+(' '+' '.join(a) if a else '')
    if n.tag in void:return start+' />'
    return start+'>'+''.join(render(c,current) for c in n.children)+'</'+n.tag+'>'

p=Parser();p.feed(body);assert len(p.stack)==1
out=root/'frontend/src/screens';out.mkdir(exist_ok=True)
def walk(n):
    if isinstance(n,str):return
    name=components.get(n.attrs.get('id'))
    if name:
        imports=''
        # Landing currently contains all original sections, including Two Minds.
        (out/(name+'.jsx')).write_text('// Original DOM shell. Existing controllers own its live DOM/telemetry.\n'+imports+'export default function '+name+'(){return ('+render(n,name)+');}\n',encoding='utf-8')
    for child in n.children:walk(child)
walk(p.root)
imports='\n'.join('import '+name+" from './screens/"+name+".jsx';" for name in components.values())
(root/'frontend/src/App.jsx').write_text("import { useEffect } from 'react';\nimport { startGame } from './app/start.js';\n"+imports+'\nexport default function App(){\nuseEffect(()=>{ startGame(); },[]);\nreturn <>'+''.join(render(c) for c in p.root.children)+'</>;\n}\n',encoding='utf-8')
print('Ported',len(components),'React screen and overlay components with original element hierarchy.')
