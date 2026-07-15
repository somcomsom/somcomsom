import {loadAll,normalize,personText,composeDetails} from './data-loader.js';
import {relationGeometry} from './relation-router.js?v=20260715-1';

const NS='http://www.w3.org/2000/svg';
const $=s=>document.querySelector(s);
const ui={svg:$('#tree'),viewer:$('#viewer'),status:$('#status'),search:$('#search'),clear:$('#clear-search'),results:$('#results'),summary:$('#summary'),name:$('#person-name'),details:$('#person-details'),copy:$('#copy-link'),sidebar:$('#sidebar'),sidebarToggle:$('#sidebar-toggle'),theme:$('#theme-button'),zoom:$('#zoom-label')};
const state={family:null,layout:null,people:[],view:null,original:null,selected:null,dragging:false,last:null,moved:false};

function E(name,attrs={}){
  const node=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
  return node;
}

function setTheme(value){
  document.documentElement.dataset.theme=value;
  localStorage.setItem('somcomsom-theme',value);
  ui.theme.textContent=value==='dark'?'Clar':'Fosc';
}

setTheme(localStorage.getItem('somcomsom-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

function displayLines(person){
  const event=value=>value&&(value.place||value.date)?[value.place,value.date&&`(${value.date})`].filter(Boolean).join(' '):'';
  const birth=event(person.birth),death=event(person.death);
  return [person.name,...((birth||death)?[[birth,death].filter(Boolean).join(' - ')]:person.details||[])].filter(Boolean).slice(0,3);
}

function center(box){return{x:box.x+box.width/2,y:box.y+box.height/2}}

function path(layer,d,cls='relation-line'){
  layer.append(E('path',{d,class:cls}));
}

function drawDecorations(){
  const {width,height}=state.layout.canvas;
  const group=E('g',{class:'decorations'});
  group.append(E('rect',{x:0,y:0,width,height,class:'paper'}));
  group.append(E('rect',{x:300,y:160,width:width-500,height:height-300,rx:2,class:'paper-border'}));
  group.append(E('line',{x1:350,y1:260,x2:350,y2:height-290,class:'timeline-line'}));

  for(const item of state.layout.timeline||[]){
    const text=E('text',{x:item.x,y:item.y,class:'timeline-label'});
    text.textContent=item.label;
    group.append(text);
  }

  const title=state.layout.title||{x:850,y:1820,width:900,height:300};
  group.append(E('rect',{x:title.x,y:title.y,width:title.width,height:title.height,class:'title-box'}));
  const heading=E('text',{x:title.x+title.width/2,y:title.y+title.height*.47,class:'title-main','text-anchor':'middle'});
  heading.textContent='SOM COM SOM';
  group.append(heading);
  const subtitle=E('text',{x:title.x+title.width/2,y:title.y+title.height*.66,class:'title-sub','text-anchor':'middle'});
  subtitle.textContent='venim del Nord · venim del Sud';
  group.append(subtitle);
  ui.svg.append(group);
}

function drawRelations(){
  const lines=E('g',{class:'relations-layer'});
  const labels=E('g',{class:'relation-labels'});
  ui.svg.append(lines);
  ui.svg.append(labels);
  const people=state.layout.people;

  for(const relation of state.family.relationships){
    const point=state.layout.relationships[relation.id];
    if(!point)continue;

    const geometry=relationGeometry(relation,point,people);
    for(const segment of geometry.paths){
      const classes=['relation-line'];
      if(segment.kind==='partner' && relation.type==='partner')classes.push('partner-line');
      if(geometry.wide)classes.push('wide-relation');
      path(lines,segment.d,classes.join(' '));
    }

    const symbol=relation.type==='partner'?'♡':relation.type==='separated'?'○ ○':'⚭';
    const text=E('text',{
      x:geometry.label.x,
      y:geometry.label.y+3,
      class:`relation-label ${relation.type}`,
      'text-anchor':'middle'
    });
    const detail=String(relation.label||'').replace(/[⚭♡○\s]+$/g,'').trim();
    if(detail){
      const first=E('tspan',{x:geometry.label.x,dy:-8,class:'relation-detail'});
      first.textContent=detail.replace(/\n/g,' · ');
      text.append(first);
      const second=E('tspan',{x:geometry.label.x,dy:11});
      second.textContent=symbol;
      text.append(second);
    }else{
      text.textContent=symbol;
    }
    labels.append(text);
  }

  for(const link of state.family.directParentLinks||[]){
    const from=people[link.parent],to=people[link.child];
    if(!from||!to)continue;
    const a=center(from),b=center(to),mid=(from.y+from.height+to.y)/2;
    path(lines,`M ${a.x} ${from.y+from.height} V ${mid} H ${b.x} V ${to.y}`,'relation-line direct-line');
  }
}

function drawPeople(){
  const layer=E('g',{class:'people-layer'});
  ui.svg.append(layer);
  state.people=state.family.people.map(person=>{
    const box=state.layout.people[person.id];
    const node=E('g',{class:`person-node${person.focus?' focus':''}`,'data-id':person.id,tabindex:0,role:'button'});
    node.append(E('rect',{x:box.x,y:box.y,width:box.width,height:box.height,rx:4,class:'person-hit'}));
    const text=E('text',{x:box.x+box.width/2,y:box.y+11,class:'person-label','text-anchor':'middle'});
    displayLines(person).forEach((line,index)=>{
      const span=E('tspan',{x:box.x+box.width/2,dy:index?10.5:0,class:index?'person-detail':'person-name'});
      span.textContent=line;
      text.append(span);
    });
    node.append(text);
    const record={...person,node,searchable:normalize(personText(person))};
    node.addEventListener('click',()=>{if(!state.moved)focus(record)});
    node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')focus(record)});
    layer.append(node);
    return record;
  });
}

function setView(value){
  state.view={...value};
  ui.svg.setAttribute('viewBox',`${value.x} ${value.y} ${value.width} ${value.height}`);
  ui.zoom.textContent=`${Math.round(state.original.width/value.width*100)}%`;
}

function fit(){setView(state.original)}

function zoom(factor,cx=null,cy=null){
  const rect=ui.svg.getBoundingClientRect();
  const px=cx==null?.5:(cx-rect.left)/rect.width;
  const py=cy==null?.5:(cy-rect.top)/rect.height;
  const anchorX=state.view.x+state.view.width*px;
  const anchorY=state.view.y+state.view.height*py;
  const width=Math.max(state.layout.canvas.width/140,Math.min(state.layout.canvas.width*3,state.view.width*factor));
  const height=width/(rect.width/Math.max(1,rect.height));
  setView({x:anchorX-width*px,y:anchorY-height*py,width,height});
}

function focus(person,updateHash=true){
  if(!person)return;
  state.people.forEach(item=>item.node.classList.toggle('selected',item===person));
  state.selected=person;
  ui.name.textContent=person.name;
  ui.details.replaceChildren();
  for(const line of composeDetails(person)){
    const paragraph=document.createElement('p');
    paragraph.textContent=line;
    ui.details.append(paragraph);
  }
  ui.copy.disabled=false;
  const box=state.layout.people[person.id],rect=ui.svg.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);
  let width=Math.max(box.width*9,520),height=width/aspect;
  if(height<box.height*9){height=box.height*9;width=height*aspect}
  setView({x:box.x+box.width/2-width/2,y:box.y+box.height/2-height/2,width,height});
  if(updateHash)history.replaceState(null,'',`#${encodeURIComponent(person.name)}`);
  if(innerWidth<=820)ui.sidebar.classList.remove('open');
}

function search(){
  const query=normalize(ui.search.value);
  ui.results.replaceChildren();
  state.people.forEach(person=>person.node.classList.remove('match'));
  if(!query){
    ui.summary.textContent=`${state.people.length} persones`;
    return;
  }
  const matches=state.people.filter(person=>person.searchable.includes(query));
  for(const person of matches)person.node.classList.add('match');
  ui.summary.textContent=matches.length===1?'1 coincidència':`${matches.length} coincidències`;
  for(const person of matches.slice(0,80)){
    const button=document.createElement('button');
    button.className='result';
    button.innerHTML='<strong></strong><span></span>';
    button.querySelector('strong').textContent=person.name;
    button.querySelector('span').textContent=(person.details||[]).join(' · ');
    button.onclick=()=>focus(person);
    ui.results.append(button);
  }
}

function restoreHash(){
  if(!location.hash)return;
  let name;
  try{name=decodeURIComponent(location.hash.slice(1))}catch{name=location.hash.slice(1)}
  const person=state.people.find(item=>normalize(item.name)===normalize(name));
  if(person){
    ui.search.value=person.name;
    search();
    focus(person,false);
  }
}

function bind(){
  ui.svg.addEventListener('wheel',event=>{
    event.preventDefault();
    zoom(Math.exp(event.deltaY*.00135),event.clientX,event.clientY);
  },{passive:false});

  ui.svg.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    state.dragging=true;
    state.moved=false;
    state.last={x:event.clientX,y:event.clientY};
    ui.svg.classList.add('dragging');
    ui.svg.setPointerCapture(event.pointerId);
  });

  ui.svg.addEventListener('pointermove',event=>{
    if(!state.dragging)return;
    const rect=ui.svg.getBoundingClientRect();
    const dx=(event.clientX-state.last.x)*state.view.width/rect.width;
    const dy=(event.clientY-state.last.y)*state.view.height/rect.height;
    if(Math.abs(dx)+Math.abs(dy)>.5)state.moved=true;
    setView({...state.view,x:state.view.x-dx,y:state.view.y-dy});
    state.last={x:event.clientX,y:event.clientY};
  });

  const end=event=>{
    state.dragging=false;
    ui.svg.classList.remove('dragging');
    try{ui.svg.releasePointerCapture(event.pointerId)}catch{}
    setTimeout(()=>state.moved=false,0);
  };

  ui.svg.addEventListener('pointerup',end);
  ui.svg.addEventListener('pointercancel',end);
  $('#zoom-in').onclick=()=>zoom(.72);
  $('#zoom-out').onclick=()=>zoom(1.38);
  $('#fit').onclick=fit;
  $('#fullscreen').onclick=async()=>document.fullscreenElement?document.exitFullscreen():ui.viewer.requestFullscreen();
  document.addEventListener('fullscreenchange',()=>setTimeout(fit,50));
  ui.search.oninput=search;
  ui.clear.onclick=()=>{ui.search.value='';search();ui.search.focus()};
  ui.sidebarToggle.onclick=()=>ui.sidebar.classList.toggle('open');
  ui.theme.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  ui.copy.onclick=async()=>{
    if(!state.selected)return;
    const url=new URL(location.href);
    url.hash=encodeURIComponent(state.selected.name);
    await navigator.clipboard.writeText(url.href);
    ui.copy.textContent='Enllaç copiat';
    setTimeout(()=>ui.copy.textContent='Copia l’enllaç',1100);
  };
  addEventListener('hashchange',restoreHash);
}

async function boot(){
  try{
    const data=await loadAll();
    state.family=data.family;
    state.layout=data.layout;
    const {width,height}=state.layout.canvas;
    ui.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    drawDecorations();
    drawRelations();
    drawPeople();
    const rect=ui.svg.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height),canvasAspect=width/height;
    if(aspect>canvasAspect){
      const expanded=height*aspect;
      state.original={x:-(expanded-width)/2,y:0,width:expanded,height};
    }else{
      const expanded=width/aspect;
      state.original={x:0,y:-(expanded-height)/2,width,height:expanded};
    }
    fit();
    bind();
    ui.status.hidden=true;
    ui.summary.textContent=`${state.people.length} persones`;
    restoreHash();
  }catch(error){
    console.error(error);
    ui.status.textContent=`No s’ha pogut carregar: ${error.message}`;
  }
}

boot();
