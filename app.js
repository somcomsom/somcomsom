import {loadFamily,loadLayout,loadBackground} from './data-loader.js?v=20260715-1';
const NS='http://www.w3.org/2000/svg';
const $=(s)=>document.querySelector(s);
const el={
  viewer:$('#viewer'),svg:$('#tree-svg'),status:$('#viewer-status'),sidebar:$('#sidebar'),sidebarToggle:$('#sidebar-toggle'),
  search:$('#search-input'),clearSearch:$('#clear-search'),searchSummary:$('#search-summary'),searchResults:$('#search-results'),
  detailsName:$('#details-name'),detailsLines:$('#details-lines'),detailsRelations:$('#details-relations'),copyLink:$('#copy-link'),
  zoomIn:$('#zoom-in'),zoomOut:$('#zoom-out'),fitView:$('#fit-view'),centerView:$('#center-view'),fullscreen:$('#fullscreen'),
  downloadSvg:$('#download-svg'),zoomLabel:$('#zoom-label'),themeButton:$('#theme-button')
};
const state={family:null,layout:null,background:null,people:new Map(),relations:new Map(),nodes:new Map(),original:null,view:null,selected:null,dragging:false,moved:false,pointer:null,last:null,animation:null};

const savedTheme=localStorage.getItem('somcomsom-theme');
document.documentElement.dataset.theme=savedTheme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
updateThemeButton();

function svgNode(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs)){if(v!==null&&v!==undefined)n.setAttribute(k,String(v))}return n}
function normalize(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/\s+/g,' ').trim()}
function escapeHtml(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function setStatus(message,error=false){el.status.hidden=false;el.status.classList.toggle('is-error',error);el.status.innerHTML=error?`<p><strong>No s’ha pogut carregar l’arbre.</strong><br>${escapeHtml(message)}</p>`:`<div class="spinner"></div><p>${escapeHtml(message)}</p>`}
function updateThemeButton(){const dark=document.documentElement.dataset.theme==='dark';el.themeButton.textContent=dark?'Tema clar':'Tema fosc'}

function eventLine(person){
  const b=person.events?.birth||{},d=person.events?.death||{};
  const fmt=(e)=>[e.place||'',e.date?`(${e.date})`:'' ].filter(Boolean).join(' ').trim();
  const birth=fmt(b),death=fmt(d);
  if(birth||death)return [birth,death].filter(Boolean).join(' - ');
  return person.details?.join(' · ')||'';
}
function personLines(person){const generated=eventLine(person);return [person.name,...(generated?[generated]:person.details||[])]}
function relationSymbol(type){return type==='partner'?'♡':type==='separated'?'○ ○':'⚭'}
function relationDisplay(relation){
  const e=relation.event||{};const first=[e.place||'',e.date?`(${e.date})`:'' ].filter(Boolean).join(' ').trim();
  if(first)return [first,relationSymbol(relation.type)];
  return relation.labelLines?.length?relation.labelLines:[relationSymbol(relation.type)];
}

function buildTree(){
  const {width,height}=state.layout.canvas;
  el.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);el.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const bg=svgNode('image',{href:state.background.url,x:0,y:0,width,height,class:'sheet-background',preserveAspectRatio:'none'});el.svg.append(bg);
  const links=svgNode('g',{id:'dynamic-links'});el.svg.append(links);
  const relations=svgNode('g',{id:'relation-overlays'});el.svg.append(relations);
  const peopleLayer=svgNode('g',{id:'people-overlays'});el.svg.append(peopleLayer);

  for(const relation of state.family.relationships){
    if(relation.source!=='original'||relation.drawConnections){drawDynamicRelationship(links,relation)}
    drawRelationOverlay(relations,relation)
  }
  for(const link of state.family.directParentLinks||[]){if(link.source!=='original')drawDirectLink(links,link)}
  for(const person of state.family.people)drawPerson(peopleLayer,person);
}

function drawDynamicRelationship(layer,relation){
  const rl=state.layout.relationships[relation.id];if(!rl)return;
  const x=rl.x,y=rl.y;const klass=relation.id==='r32'?'dynamic-link strong':'dynamic-link';
  for(const pid of relation.partners||[]){const p=state.layout.people[pid];if(!p)continue;const b=p.coverBox;const sx=(b[0]+b[2])/2,sy=b[3];layer.append(pathEl(`M ${sx} ${sy} V ${y-8} H ${x}`,klass))}
  for(const pid of relation.children||[]){const p=state.layout.people[pid];if(!p)continue;const b=p.coverBox;const tx=(b[0]+b[2])/2,ty=b[1];const mid=y+18;layer.append(pathEl(`M ${x} ${y+8} V ${mid} H ${tx} V ${ty}`,klass))}
}
function drawDirectLink(layer,link){const a=state.layout.people[link.parent],b=state.layout.people[link.child];if(!a||!b)return;const ab=a.coverBox,bb=b.coverBox;const x1=(ab[0]+ab[2])/2,y1=ab[3],x2=(bb[0]+bb[2])/2,y2=bb[1],m=(y1+y2)/2;layer.append(pathEl(`M ${x1} ${y1} V ${m} H ${x2} V ${y2}`,'dynamic-link'))}
function pathEl(d,klass){return svgNode('path',{d,class:klass})}

function drawRelationOverlay(layer,relation){
  const rl=state.layout.relationships[relation.id];if(!rl)return;const lines=relationDisplay(relation);const g=svgNode('g',{class:`relation-overlay ${relation.type}`,'data-id':relation.id});
  const width=Math.max(48,...lines.map(x=>x.length*4.4));const height=lines.length*11+6;g.append(svgNode('rect',{x:rl.x-width/2,y:rl.y-9,width,height,rx:3,class:'relation-cover'}));
  lines.forEach((line,i)=>{const t=svgNode('text',{x:rl.x,y:rl.y+i*10,class:i===lines.length-1?'relation-symbol':''});t.textContent=line;g.append(t)});layer.append(g)
}

function drawPerson(layer,person){
  const l=state.layout.people[person.id];if(!l)return;const g=svgNode('g',{class:'person','data-id':person.id,tabindex:0,role:'button'});const c=l.coverBox;
  g.append(svgNode('rect',{x:c[0],y:c[1],width:c[2]-c[0],height:c[3]-c[1],rx:2,class:'person-cover'}));
  const unchanged=person.source==='original'&&!person.visualOverride;
  if(unchanged&&l.nameSegments?.length){appendSegments(g,l.nameSegments);appendSegments(g,l.detailSegments||[])}else{appendFallback(g,person,l)}
  g.append(svgNode('rect',{x:c[0]-3,y:c[1]-3,width:c[2]-c[0]+6,height:c[3]-c[1]+6,rx:4,class:'person-hit'}));
  g.addEventListener('click',()=>focusPerson(person));g.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusPerson(person)}});
  layer.append(g);state.nodes.set(person.id,g)
}
function appendSegments(g,segs){for(const s of segs){const t=svgNode('text',{x:s.x,y:s.y,'font-size':s.size,'font-weight':s.weight});t.textContent=s.text;g.append(t)}}
function appendFallback(g,person,l){const c=l.coverBox,lines=personLines(person),cx=(c[0]+c[2])/2;const base=l.nameSegments?.[0]?.y||c[1]+12;const n=svgNode('text',{x:cx,y:base,'text-anchor':'middle','font-size':9.6,class:'fallback-name'});n.textContent=lines[0];g.append(n);lines.slice(1).forEach((line,i)=>{const t=svgNode('text',{x:cx,y:base+13+i*10,'text-anchor':'middle','font-size':7.2,class:'fallback-detail'});t.textContent=line;g.append(t)})}

function readView(){return{x:0,y:0,width:state.layout.canvas.width,height:state.layout.canvas.height}}
function setView(v,label=true){state.view={...v};el.svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.width} ${v.height}`);if(label&&state.original)el.zoomLabel.textContent=`${Math.round(state.original.width/v.width*100)}%`}
function animateView(target,duration=280){if(!state.view)return setView(target);if(state.animation)cancelAnimationFrame(state.animation);const start={...state.view},t0=performance.now();const frame=(now)=>{const p=Math.min(1,(now-t0)/duration),e=1-Math.pow(1-p,3);setView({x:start.x+(target.x-start.x)*e,y:start.y+(target.y-start.y)*e,width:start.width+(target.width-start.width)*e,height:start.height+(target.height-start.height)*e});if(p<1)state.animation=requestAnimationFrame(frame);else state.animation=null};state.animation=requestAnimationFrame(frame)}
function fitView(animate=true){animate?animateView(state.original):setView(state.original)}
function centralView(animate=true){const ids=['p129','p118','p141','p142','p143','p144','p145','p146'];const boxes=ids.map(id=>state.layout.people[id]?.coverBox).filter(Boolean);if(!boxes.length)return fitView(animate);const x0=Math.min(...boxes.map(b=>b[0]))-500,x1=Math.max(...boxes.map(b=>b[2]))+500,y0=Math.min(...boxes.map(b=>b[1]))-300,y1=Math.max(...boxes.map(b=>b[3]))+600;const target={x:x0,y:y0,width:x1-x0,height:y1-y0};animate?animateView(target):setView(target)}
function clampSize(width,height){const ratio=width/height,minW=state.original.width/160,maxW=state.original.width*4;let w=Math.max(minW,Math.min(maxW,width)),h=w/ratio;return{width:w,height:h}}
function zoomAt(factor,cx=null,cy=null,animate=false){const r=el.svg.getBoundingClientRect(),px=cx==null?.5:(cx-r.left)/r.width,py=cy==null?.5:(cy-r.top)/r.height,ax=state.view.x+state.view.width*px,ay=state.view.y+state.view.height*py,s=clampSize(state.view.width*factor,state.view.height*factor),v={x:ax-s.width*px,y:ay-s.height*py,width:s.width,height:s.height};animate?animateView(v):setView(v)}
function focusPerson(person,hash=true){const l=state.layout.people[person.id];if(!l)return;for(const [id,node] of state.nodes)node.classList.toggle('is-selected',id===person.id);state.selected=person;showDetails(person);const b=l.coverBox,r=el.viewer.getBoundingClientRect(),aspect=Math.max(.6,r.width/Math.max(1,r.height));let w=Math.max((b[2]-b[0])*12,850),h=w/aspect;if(h<(b[3]-b[1])*12){h=(b[3]-b[1])*12;w=h*aspect}const s=clampSize(w,h);animateView({x:(b[0]+b[2])/2-s.width/2,y:(b[1]+b[3])/2-s.height/2,width:s.width,height:s.height},340);if(hash)history.replaceState(null,'',`#${encodeURIComponent(person.name)}`);if(innerWidth<=900)el.sidebar.classList.remove('is-open')}

function showDetails(person){el.detailsName.textContent=person.name;el.detailsLines.replaceChildren();const lines=personLines(person).slice(1);(lines.length?lines:['L’original no mostra més dades per a aquesta persona.']).forEach(line=>{const p=document.createElement('p');p.textContent=line;el.detailsLines.append(p)});el.detailsRelations.replaceChildren();const relationIds=person.relationships||[];for(const rid of relationIds){const r=state.relations.get(rid);if(!r)continue;const others=(r.partners||[]).filter(id=>id!==person.id).map(id=>state.people.get(id)?.name).filter(Boolean);const div=document.createElement('div');div.textContent=`${relationSymbol(r.type)} ${others.join(' · ')||'Relació'}${relationDisplay(r)[0]&&!['⚭','○ ○','♡'].includes(relationDisplay(r)[0])?` — ${relationDisplay(r)[0]}`:''}`;el.detailsRelations.append(div)}el.copyLink.disabled=false}

function runSearch(){const q=normalize(el.search.value);for(const node of state.nodes.values())node.classList.remove('is-match');el.searchResults.replaceChildren();if(!q){el.searchSummary.textContent=`${state.family.people.length} persones a l’arbre`;return}const matches=state.family.people.filter(p=>normalize(personLines(p).join(' ')).includes(q));matches.forEach(p=>state.nodes.get(p.id)?.classList.add('is-match'));el.searchSummary.textContent=matches.length===1?'1 coincidència ressaltada':`${matches.length} coincidències ressaltades`;matches.slice(0,100).forEach(person=>{const b=document.createElement('button');b.type='button';b.className='result-button';const strong=document.createElement('strong');strong.textContent=person.name;b.append(strong);const detail=personLines(person).slice(1).join(' · ');if(detail){const span=document.createElement('span');span.textContent=detail;b.append(span)}b.addEventListener('click',()=>focusPerson(person));el.searchResults.append(b)})}
function restoreHash(){if(!location.hash)return;let name;try{name=decodeURIComponent(location.hash.slice(1))}catch{name=location.hash.slice(1)}const p=state.family.people.find(x=>normalize(x.name)===normalize(name));if(p){el.search.value=p.name;runSearch();requestAnimationFrame(()=>focusPerson(p,false))}}

function bind(){
  el.svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(e.deltaY*.00135),e.clientX,e.clientY)},{passive:false});
  el.svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.dragging=true;state.moved=false;state.pointer=e.pointerId;state.last={x:e.clientX,y:e.clientY};el.svg.classList.add('is-dragging');el.svg.setPointerCapture(e.pointerId)});
  el.svg.addEventListener('pointermove',e=>{if(!state.dragging||e.pointerId!==state.pointer)return;const dx=e.clientX-state.last.x,dy=e.clientY-state.last.y;if(Math.abs(dx)+Math.abs(dy)>2)state.moved=true;const r=el.svg.getBoundingClientRect(),sx=dx*state.view.width/r.width,sy=dy*state.view.height/r.height;setView({...state.view,x:state.view.x-sx,y:state.view.y-sy});state.last={x:e.clientX,y:e.clientY}});
  const end=e=>{if(!state.dragging)return;state.dragging=false;el.svg.classList.remove('is-dragging');if(state.pointer!=null&&el.svg.hasPointerCapture(state.pointer))el.svg.releasePointerCapture(state.pointer);state.pointer=null;setTimeout(()=>state.moved=false,0)};el.svg.addEventListener('pointerup',end);el.svg.addEventListener('pointercancel',end);
  el.svg.addEventListener('dblclick',e=>{e.preventDefault();zoomAt(.55,e.clientX,e.clientY,true)});
  el.search.addEventListener('input',runSearch);el.clearSearch.addEventListener('click',()=>{el.search.value='';runSearch();el.search.focus()});el.sidebarToggle.addEventListener('click',()=>el.sidebar.classList.toggle('is-open'));
  el.zoomIn.addEventListener('click',()=>zoomAt(.72,null,null,true));el.zoomOut.addEventListener('click',()=>zoomAt(1.38,null,null,true));el.fitView.addEventListener('click',()=>fitView(true));el.centerView.addEventListener('click',()=>centralView(true));
  el.themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('somcomsom-theme',next);updateThemeButton()});
  el.copyLink.addEventListener('click',async()=>{if(!state.selected)return;const u=new URL(location.href);u.hash=encodeURIComponent(state.selected.name);try{await navigator.clipboard.writeText(u.href);const old=el.copyLink.textContent;el.copyLink.textContent='Enllaç copiat';setTimeout(()=>el.copyLink.textContent=old,1200)}catch{prompt('Copia aquest enllaç:',u.href)}});
  el.fullscreen.addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await el.viewer.requestFullscreen?.()});
  el.downloadSvg.addEventListener('click',downloadSvg);
  addEventListener('keydown',e=>{const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement;if(e.key==='/'&&!typing){e.preventDefault();el.search.focus()}else if((e.key==='+'||e.key==='=')&&!typing)zoomAt(.72,null,null,true);else if(e.key==='-'&&!typing)zoomAt(1.38,null,null,true);else if(e.key==='0'&&!typing)fitView(true);else if(e.key==='Escape')el.sidebar.classList.remove('is-open')});addEventListener('hashchange',restoreHash)
}
async function downloadSvg(){const clone=el.svg.cloneNode(true);clone.setAttribute('xmlns',NS);clone.setAttribute('width',state.layout.canvas.width);clone.setAttribute('height',state.layout.canvas.height);clone.setAttribute('viewBox',`0 0 ${state.layout.canvas.width} ${state.layout.canvas.height}`);if(state.background?.svgText){const bytes=new TextEncoder().encode(state.background.svgText);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));clone.querySelector('.sheet-background')?.setAttribute('href',`data:image/svg+xml;base64,${btoa(binary)}`)}const blob=new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='som-com-som-arbre.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

async function boot(){try{setStatus('Llegint les dades i la disposició original…');const [family,layout]=await Promise.all([loadFamily(),loadLayout()]);state.family=family;state.layout=layout;state.background=await loadBackground(state.layout.canvas.backgroundManifest||'./assets/background-manifest.json');state.family.people.forEach(p=>state.people.set(p.id,p));state.family.relationships.forEach(r=>state.relations.set(r.id,r));buildTree();state.original=readView();setView(state.original);bind();runSearch();restoreHash();el.status.hidden=true}catch(err){console.error(err);setStatus(err instanceof Error?err.message:String(err),true)}}
boot();
