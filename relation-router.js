const DEFAULTS={
  maxPartnerSpan:1000,
  maxChildSpan:1700,
  maxChildGap:520,
  busOffset:13,
  minDrop:10
};

const centerX=box=>box.x+box.width/2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function curve(x1,y1,x2,y2){
  const direction=y2>=y1?1:-1;
  const bend=Math.max(24,Math.abs(y2-y1)*.42);
  return `M ${x1} ${y1} C ${x1} ${y1+direction*bend} ${x2} ${y2-direction*bend} ${x2} ${y2}`;
}

function clustersFor(boxes,maxGap){
  const sorted=[...boxes].sort((a,b)=>centerX(a)-centerX(b));
  const clusters=[];
  for(const box of sorted){
    const current=clusters.at(-1);
    if(!current || centerX(box)-centerX(current.at(-1))>maxGap)clusters.push([box]);
    else current.push(box);
  }
  return clusters;
}

export function relationGeometry(relation,point,people,options={}){
  const config={...DEFAULTS,...options};
  const partners=(relation.partners||[]).map(id=>people[id]).filter(Boolean);
  const children=(relation.children||[]).map(id=>people[id]).filter(Boolean);
  const partnerXs=partners.map(centerX);
  const childXs=children.map(centerX);
  const allXs=[...partnerXs,...childXs];
  if(!allXs.length)return {paths:[],label:{x:point.x,y:point.y},wide:false};

  const partnerSpan=partnerXs.length>1?Math.max(...partnerXs)-Math.min(...partnerXs):0;
  const childSpan=childXs.length>1?Math.max(...childXs)-Math.min(...childXs):0;
  const sortedChildXs=[...childXs].sort((a,b)=>a-b);
  const maxChildGap=sortedChildXs.slice(1).reduce((max,x,index)=>Math.max(max,x-sortedChildXs[index]),0);
  const wide=children.length>0 && (
    partnerSpan>config.maxPartnerSpan ||
    childSpan>config.maxChildSpan ||
    maxChildGap>config.maxChildGap
  );

  const anchorRange=children.length?childXs:partnerXs;
  const anchorX=anchorRange.length
    ? clamp(point.x,Math.min(...anchorRange),Math.max(...anchorRange))
    : point.x;
  const paths=[];

  if(wide){
    for(const box of partners){
      paths.push({d:curve(centerX(box),box.y+box.height,anchorX,point.y),kind:'partner'});
    }

    for(const cluster of clustersFor(children,config.maxChildGap)){
      const xs=cluster.map(centerX);
      const top=Math.min(...cluster.map(box=>box.y));
      const busY=Math.max(point.y+config.minDrop,top-config.busOffset);
      const left=Math.min(...xs),right=Math.max(...xs);
      const attachX=(left+right)/2;

      if(cluster.length===1){
        const box=cluster[0];
        paths.push({d:curve(anchorX,point.y,centerX(box),box.y),kind:'family'});
      }else{
        paths.push({d:curve(anchorX,point.y,attachX,busY),kind:'family'});
        paths.push({d:`M ${left} ${busY} H ${right}`,kind:'family'});
        for(const box of cluster){
          paths.push({d:`M ${centerX(box)} ${busY} V ${box.y}`,kind:'family'});
        }
      }
    }
  }else{
    for(const box of partners){
      const x=centerX(box);
      paths.push({d:`M ${x} ${box.y+box.height} V ${point.y} H ${anchorX}`,kind:'partner'});
    }

    if(children.length===1){
      const box=children[0],x=centerX(box);
      const trunk=Math.max(point.y+config.minDrop,box.y-config.busOffset);
      paths.push({d:`M ${anchorX} ${point.y} V ${trunk} H ${x} V ${box.y}`,kind:'family'});
    }else if(children.length>1){
      const top=Math.min(...children.map(box=>box.y));
      const trunk=Math.max(point.y+config.minDrop,top-config.busOffset);
      const left=Math.min(...childXs),right=Math.max(...childXs);
      paths.push({d:`M ${anchorX} ${point.y} V ${trunk}`,kind:'family'});
      paths.push({d:`M ${left} ${trunk} H ${right}`,kind:'family'});
      for(const box of children){
        paths.push({d:`M ${centerX(box)} ${trunk} V ${box.y}`,kind:'family'});
      }
    }
  }

  return {paths,label:{x:anchorX,y:point.y},wide};
}
