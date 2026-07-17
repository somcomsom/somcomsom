import {relationGeometry as baseRelationGeometry} from './relation-router.js';

const centerX=box=>box.x+box.width/2;

function curve(x1,y1,x2,y2){
  const direction=y2>=y1?1:-1;
  const bend=Math.max(24,Math.abs(y2-y1)*.42);
  return `M ${x1} ${y1} C ${x1} ${y1+direction*bend} ${x2} ${y2-direction*bend} ${x2} ${y2}`;
}

export function relationGeometry(relation,point,people,options={}){
  const geometry=baseRelationGeometry(relation,point,people,options);
  if(!relation.individualChildLinks)return geometry;

  const partnerPaths=geometry.paths.filter(path=>path.kind==='partner');
  const childPaths=(relation.children||[])
    .map(id=>people[id])
    .filter(Boolean)
    .map(box=>({d:curve(geometry.label.x,point.y,centerX(box),box.y),kind:'family'}));

  return {...geometry,paths:[...partnerPaths,...childPaths]};
}
