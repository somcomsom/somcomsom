import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';

mermaid.registerLayoutLoaders(elkLayouts);
const $ = (s) => document.querySelector(s);
const el = {
  viewer: $('#viewer'), diagram: $('#diagram'), status: $('#viewer-status'), sidebar: $('#sidebar'),
  sidebarToggle: $('#sidebar-toggle'), search: $('#search-input'), clearSearch: $('#clear-search'),
  searchSummary: $('#search-summary'), searchResults: $('#search-results'), detailsName: $('#details-name'),
  detailsLines: $('#details-lines'), copyLink: $('#copy-link'), zoomIn: $('#zoom-in'), zoomOut: $('#zoom-out'),
  fitView: $('#fit-view'), fullscreen: $('#fullscreen'), downloadSvg: $('#download-svg'),
  zoomLabel: $('#zoom-label'), themeButton: $('#theme-button')
};
const state = { svg:null, people:[], original:null, view:null, selected:null, dragging:false, moved:false, pointer:null, last:null, animation:null };

const savedTheme = localStorage.getItem('somcomsom-theme');
document.documentElement.dataset.theme = savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
updateThemeButton();

function updateThemeButton(){
  const dark = document.documentElement.dataset.theme === 'dark';
  el.themeButton.textContent = dark ? 'Clar' : 'Fosc';
  el.themeButton.setAttribute('aria-label', dark ? 'Activa el tema clar' : 'Activa el tema fosc');
}
function setStatus(message,error=false){
  el.status.hidden=false; el.status.classList.toggle('is-error',error);
  el.status.innerHTML=error?`<p><strong>No s’ha pogut carregar l’arbre.</strong><br>${escapeHtml(message)}</p>`:`<div class="spinner"></div><p>${escapeHtml(message)}</p>`;
}
function escapeHtml(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function normalize(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/\s+/g,' ').trim()}
function extractMermaid(md){const m=md.match(/```mermaid\s*([\s\S]*?)```/i);if(!m)throw new Error('No s’ha trobat el diagrama Mermaid.');return m[1].trim()}
function elkSource(source){return source.replace(/^%%\{init:[^\n]*\}%%\s*/m,'').replace(/^flowchart\s+TB/m,'flowchart-elk TB')}
function fallbackSource(source){return source.replace(/^%%\{init:[^\n]*\}%%\s*/m,'%%{init:{"flowchart":{"curve":"linear","nodeSpacing":32,"rankSpacing":70},"themeVariables":{"fontSize":"12px"}}}%%\n')}
async function render(source){try{return await mermaid.render('family-tree-elk',elkSource(source))}catch(err){console.warn('ELK fallback',err);return mermaid.render('family-tree-dagre',fallbackSource(source))}}
function nodeLines(node){
  const f=node.querySelector('foreignObject');
  if(f){const c=f.cloneNode(true);c.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));const lines=c.textContent.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);if(lines.length)return lines}
  const t=[...node.querySelectorAll('tspan')].map(x=>x.textContent.trim()).filter(Boolean);return t.length?t:[node.textContent.replace(/\s+/g,' ').trim()].filter(Boolean)
}
function indexPeople(){
  state.people=[...state.svg.querySelectorAll('g.node')].filter(n=>n.classList.contains('person')||n.classList.contains('focus')||/(?:^|-)p\d+(?:-|$)/.test(n.id)).map((node,order)=>{const lines=nodeLines(node);return{node,order,name:lines[0]||`Persona ${order+1}`,lines,searchable:normalize(lines.join(' '))}});
  el.searchSummary.textContent=`${state.people.length} persones a l’arbre`;
}
function cleanDiagram(){
  state.svg.querySelectorAll('.flowchart-link').forEach(p=>{p.removeAttribute('marker-start');p.removeAttribute('marker-mid');p.removeAttribute('marker-end')});
  state.svg.querySelectorAll('marker').forEach(m=>m.remove());
  state.svg.querySelectorAll('g.node.person,g.node.focus').forEach(n=>{n.setAttribute('tabindex','0');n.setAttribute('role','button')});
}
function readBox(){const b=state.svg.getBBox();const p=Math.max(30,Math.min(b.width,b.height)*.015);return{x:b.x-p,y:b.y-p,width:b.width+p*2,height:b.height+p*2}}
function setView(v,label=true){state.view={...v};state.svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.width} ${v.height}`);if(label&&state.original)el.zoomLabel.textContent=`${Math.round(state.original.width/v.width*100)}%`}
function animateView(target,duration=280){if(!state.view)return setView(target);if(state.animation)cancelAnimationFrame(state.animation);const start={...state.view},t0=performance.now();const frame=(now)=>{const p=Math.min(1,(now-t0)/duration),e=1-Math.pow(1-p,3);setView({x:start.x+(target.x-start.x)*e,y:start.y+(target.y-start.y)*e,width:start.width+(target.width-start.width)*e,height:start.height+(target.height-start.height)*e});if(p<1)state.animation=requestAnimationFrame(frame);else state.animation=null};state.animation=requestAnimationFrame(frame)}
function fitView(animate=true){if(!state.original)return;animate?animateView(state.original):setView(state.original)}
function clampSize(width,height){const ratio=width/height,minW=state.original.width/120,maxW=state.original.width*4;let w=Math.max(minW,Math.min(maxW,width)),h=w/ratio;return{width:w,height:h}}
function zoomAt(factor,cx=null,cy=null,animate=false){if(!state.view)return;const r=state.svg.getBoundingClientRect(),px=cx==null?.5:(cx-r.left)/r.width,py=cy==null?.5:(cy-r.top)/r.height,ax=state.view.x+state.view.width*px,ay=state.view.y+state.view.height*py,s=clampSize(state.view.width*factor,state.view.height*factor),v={x:ax-s.width*px,y:ay-s.height*py,width:s.width,height:s.height};animate?animateView(v):setView(v)}
function focusPerson(person,hash=true){
  if(!person)return;state.people.forEach(p=>p.node.classList.toggle('is-selected',p===person));state.selected=person;showDetails(person);
  const b=person.node.getBBox(),r=el.viewer.getBoundingClientRect(),aspect=Math.max(.6,r.width/Math.max(1,r.height));let w=Math.max(b.width*9,state.original.width/17,280),h=w/aspect;if(h<b.height*10){h=b.height*10;w=h*aspect}const s=clampSize(w,h);animateView({x:b.x+b.width/2-s.width/2,y:b.y+b.height/2-s.height/2,width:s.width,height:s.height},340);
  if(hash)history.replaceState(null,'',`#${encodeURIComponent(person.name)}`);if(innerWidth<=820)el.sidebar.classList.remove('is-open')
}
function showDetails(person){el.detailsName.textContent=person.name;el.detailsLines.replaceChildren();const lines=person.lines.slice(1);(lines.length?lines:['L’original no mostra més dades per a aquesta persona.']).forEach(x=>{const p=document.createElement('p');p.textContent=x;el.detailsLines.append(p)});el.copyLink.disabled=false}
function clearHighlights(){state.people.forEach(p=>p.node.classList.remove('is-match'))}
function runSearch(){
  const q=normalize(el.search.value);clearHighlights();el.searchResults.replaceChildren();if(!q){el.searchSummary.textContent=`${state.people.length} persones a l’arbre`;return}
  const matches=state.people.filter(p=>p.searchable.includes(q));matches.forEach(p=>p.node.classList.add('is-match'));el.searchSummary.textContent=matches.length===1?'1 coincidència ressaltada':`${matches.length} coincidències ressaltades`;
  matches.slice(0,80).forEach(person=>{const b=document.createElement('button');b.type='button';b.className='result-button';const strong=document.createElement('strong');strong.textContent=person.name;b.append(strong);if(person.lines.length>1){const span=document.createElement('span');span.textContent=person.lines.slice(1).join(' · ');b.append(span)}b.addEventListener('click',()=>focusPerson(person));el.searchResults.append(b)});
}
function initialView(){
  const p=state.people.find(x=>normalize(x.name)==='joan escorihuela lloveras')||state.people[Math.floor(state.people.length*.67)];
  if(!p)return fitView(false);const b=p.node.getBBox(),r=el.viewer.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),w=state.original.width/2.35,h=w/aspect;setView({x:b.x+b.width/2-w/2,y:b.y+b.height/2-h/2,width:w,height:h})
}
function restoreHash(){if(!location.hash)return;let name;try{name=decodeURIComponent(location.hash.slice(1))}catch{name=location.hash.slice(1)}const p=state.people.find(x=>normalize(x.name)===normalize(name));if(p){el.search.value=p.name;runSearch();requestAnimationFrame(()=>focusPerson(p,false))}}
function delta(dx,dy){const r=state.svg.getBoundingClientRect();return{x:dx*state.view.width/r.width,y:dy*state.view.height/r.height}}
function bind(){
  el.diagram.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(e.deltaY*.00135),e.clientX,e.clientY)},{passive:false});
  el.diagram.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.dragging=true;state.moved=false;state.pointer=e.pointerId;state.last={x:e.clientX,y:e.clientY};el.diagram.classList.add('is-dragging');el.diagram.setPointerCapture(e.pointerId)});
  el.diagram.addEventListener('pointermove',e=>{if(!state.dragging||e.pointerId!==state.pointer)return;const dx=e.clientX-state.last.x,dy=e.clientY-state.last.y;if(Math.abs(dx)+Math.abs(dy)>2)state.moved=true;const d=delta(dx,dy);setView({...state.view,x:state.view.x-d.x,y:state.view.y-d.y});state.last={x:e.clientX,y:e.clientY}});
  const end=e=>{if(!state.dragging)return;state.dragging=false;el.diagram.classList.remove('is-dragging');if(state.pointer!=null&&el.diagram.hasPointerCapture(state.pointer))el.diagram.releasePointerCapture(state.pointer);state.pointer=null;setTimeout(()=>state.moved=false,0)};el.diagram.addEventListener('pointerup',end);el.diagram.addEventListener('pointercancel',end);
  el.diagram.addEventListener('click',e=>{if(state.moved)return;const n=e.target.closest?.('g.node'),p=state.people.find(x=>x.node===n);if(p)focusPerson(p)});
  el.diagram.addEventListener('dblclick',e=>{e.preventDefault();zoomAt(.55,e.clientX,e.clientY,true)});
  el.zoomIn.addEventListener('click',()=>zoomAt(.72,null,null,true));el.zoomOut.addEventListener('click',()=>zoomAt(1.38,null,null,true));el.fitView.addEventListener('click',()=>fitView(true));
  el.search.addEventListener('input',runSearch);el.clearSearch.addEventListener('click',()=>{el.search.value='';runSearch();el.search.focus()});
  el.sidebarToggle.addEventListener('click',()=>el.sidebar.classList.toggle('is-open'));
  el.themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('somcomsom-theme',next);updateThemeButton()});
  el.copyLink.addEventListener('click',async()=>{if(!state.selected)return;const u=new URL(location.href);u.hash=encodeURIComponent(state.selected.name);try{await navigator.clipboard.writeText(u.href);const old=el.copyLink.textContent;el.copyLink.textContent='Enllaç copiat';setTimeout(()=>el.copyLink.textContent=old,1200)}catch{prompt('Copia aquest enllaç:',u.href)}});
  el.fullscreen.addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await el.viewer.requestFullscreen?.()});document.addEventListener('fullscreenchange',()=>setTimeout(()=>fitView(false),100));
  el.downloadSvg.addEventListener('click',()=>{const c=state.svg.cloneNode(true);c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('viewBox',`${state.original.x} ${state.original.y} ${state.original.width} ${state.original.height}`);const url=URL.createObjectURL(new Blob([c.outerHTML],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='arbre-familiar-somcomsom.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
  addEventListener('keydown',e=>{const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement;if(e.key==='/'&&!typing){e.preventDefault();el.search.focus()}else if((e.key==='+'||e.key==='=')&&!typing)zoomAt(.72,null,null,true);else if(e.key==='-'&&!typing)zoomAt(1.38,null,null,true);else if(e.key==='0'&&!typing)fitView(true);else if(e.key==='Escape')el.sidebar.classList.remove('is-open')});addEventListener('hashchange',restoreHash)
}
async function boot(){
  try{setStatus('Llegint les dades genealògiques…');const response=await fetch(`./README.md?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`README.md ha respost ${response.status}`);const source=extractMermaid(await response.text());setStatus('Ordenant les 193 persones…');mermaid.initialize({startOnLoad:false,securityLevel:'loose',theme:'base',flowchart:{htmlLabels:true,useMaxWidth:false},fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'});const rendered=await render(source);el.diagram.innerHTML=rendered.svg;rendered.bindFunctions?.(el.diagram);state.svg=el.diagram.querySelector('svg');if(!state.svg)throw new Error('Mermaid no ha retornat cap SVG.');state.svg.removeAttribute('width');state.svg.removeAttribute('height');state.svg.setAttribute('preserveAspectRatio','xMidYMid meet');cleanDiagram();await new Promise(r=>requestAnimationFrame(r));state.original=readBox();setView(state.original);indexPeople();bind();initialView();restoreHash();el.status.hidden=true}catch(err){console.error(err);setStatus(err instanceof Error?err.message:String(err),true)}}
boot();
