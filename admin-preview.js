import {relationGeometry} from './relation-router-six-links.js?v=20260717-1';

const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{
  const node=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
  return node;
};

const linesFor=person=>{
  const event=value=>value&&(value.place||value.date)?[value.place,value.date&&`(${value.date})`].filter(Boolean).join(' '):'';
  const birth=event(person.birth),death=event(person.death);
  return [person.name,...((birth||death)?[[birth,death].filter(Boolean).join(' - ')]:person.details||[])].filter(Boolean).slice(0,3);
};

const relationPath=(layer,d,cls='preview-relation-line')=>layer.append(el('path',{d,class:cls}));

export function createPreview(svg,state,onSelect,positionFields){
  function render(){
    svg.replaceChildren();
    const {width,height}=state.layout.canvas;
    if(!svg.getAttribute('viewBox'))svg.setAttribute('viewBox',`0 0 ${width} ${height}`);

    const decor=el('g',{class:'preview-decor'});
    decor.append(el('rect',{x:0,y:0,width,height,class:'preview-paper'}));
    decor.append(el('rect',{x:300,y:160,width:width-500,height:height-300,class:'preview-border'}));
    decor.append(el('line',{x1:350,y1:260,x2:350,y2:height-290,class:'preview-timeline-line'}));

    for(const item of state.layout.timeline||[]){
      const text=el('text',{x:item.x,y:item.y,class:'preview-timeline-label'});
      text.textContent=item.label;
      decor.append(text);
    }

    const title=state.layout.title||{x:850,y:1820,width:900,height:300};
    decor.append(el('rect',{x:title.x,y:title.y,width:title.width,height:title.height,class:'preview-title-box'}));
    const titleText=el('text',{x:title.x+title.width/2,y:title.y+title.height*.48,class:'preview-title','text-anchor':'middle'});
    titleText.textContent='SOM COM SOM';
    decor.append(titleText);
    svg.append(decor);

    const relations=el('g');
    svg.append(relations);
    const peopleLayout=state.layout.people;

    for(const relation of state.family.relationships){
      const point=state.layout.relationships[relation.id];
      if(!point)continue;

      const geometry=relationGeometry(relation,point,peopleLayout);
      for(const segment of geometry.paths){
        const classes=['preview-relation-line'];
        if(segment.kind==='partner' && relation.type==='partner')classes.push('preview-partner');
        if(geometry.wide)classes.push('preview-wide-relation');
        relationPath(relations,segment.d,classes.join(' '));
      }

      const symbol=relation.type==='partner'?'♡':relation.type==='separated'?'○ ○':'⚭';
      const text=el('text',{
        x:geometry.label.x,
        y:geometry.label.y+3,
        class:`preview-relation-label ${relation.type}`,
        'text-anchor':'middle'
      });
      text.textContent=symbol;
      relations.append(text);
    }

    for(const link of state.family.directParentLinks||[]){
      const from=peopleLayout[link.parent],to=peopleLayout[link.child];
      if(!from||!to)continue;
      const fromX=from.x+from.width/2,toX=to.x+to.width/2,mid=(from.y+from.height+to.y)/2;
      relationPath(relations,`M ${fromX} ${from.y+from.height} V ${mid} H ${toX} V ${to.y}`,'preview-relation-line preview-direct');
    }

    const peopleLayer=el('g');
    svg.append(peopleLayer);

    for(const person of state.family.people){
      const box=state.layout.people[person.id]||{x:100,y:100,width:120,height:36};
      const group=el('g',{'data-id':person.id,class:person.focus?'preview-node focus':'preview-node'});
      const rect=el('rect',{class:'preview-person',x:box.x,y:box.y,width:box.width,height:box.height,rx:4});
      if(person.id===state.selectedPerson?.id)rect.classList.add('selected');
      rect.onclick=()=>onSelect(person.id);
      rect.onpointerdown=event=>{
        if(person.id!==state.selectedPerson?.id)return;
        state.drag={id:person.id,pointer:event.pointerId,last:{x:event.clientX,y:event.clientY}};
        svg.setPointerCapture(event.pointerId);
        event.preventDefault();
      };
      group.append(rect);

      const text=el('text',{x:box.x+box.width/2,y:box.y+11,class:'preview-person-label','text-anchor':'middle'});
      linesFor(person).forEach((line,index)=>{
        const span=el('tspan',{x:box.x+box.width/2,dy:index?10.5:0,class:index?'preview-person-detail':'preview-person-name'});
        span.textContent=line;
        text.append(span);
      });
      group.append(text);
      peopleLayer.append(group);
    }
  }

  function bindDrag(){
    svg.onpointermove=event=>{
      if(!state.drag)return;
      const rect=svg.getBoundingClientRect(),box=svg.viewBox.baseVal;
      const dx=(event.clientX-state.drag.last.x)*box.width/rect.width;
      const dy=(event.clientY-state.drag.last.y)*box.height/rect.height;
      const position=state.layout.people[state.drag.id];
      position.x+=dx;
      position.y+=dy;
      state.drag.last={x:event.clientX,y:event.clientY};
      positionFields.x.value=position.x.toFixed(1);
      positionFields.y.value=position.y.toFixed(1);
      render();
    };
    const end=event=>{
      if(!state.drag)return;
      try{svg.releasePointerCapture(event.pointerId)}catch{}
      state.drag=null;
    };
    svg.onpointerup=end;
    svg.onpointercancel=end;
  }

  function center(box){
    const rect=svg.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);
    const width=Math.max(box.width*8,500),height=width/aspect;
    svg.setAttribute('viewBox',`${box.x+box.width/2-width/2} ${box.y+box.height/2-height/2} ${width} ${height}`);
  }

  function fit(){
    const canvas=state.layout.canvas;
    svg.setAttribute('viewBox',`0 0 ${canvas.width} ${canvas.height}`);
  }

  return {render,bindDrag,center,fit};
}
