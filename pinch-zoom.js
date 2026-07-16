const svg=document.querySelector('#tree');

if(svg){
  const pointers=new Map();
  let pinch=null;
  let consumed=false;
  let suppressClickUntil=0;

  const point=event=>({x:event.clientX,y:event.clientY});

  function metrics(){
    const [first,second]=[...pointers.values()];
    if(!first||!second)return null;
    return {
      x:(first.x+second.x)/2,
      y:(first.y+second.y)/2,
      distance:Math.hypot(second.x-first.x,second.y-first.y)
    };
  }

  svg.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    pointers.set(event.pointerId,point(event));
    try{svg.setPointerCapture(event.pointerId)}catch{}

    if(pointers.size>=2){
      const current=metrics();
      pinch=current?{distance:Math.max(1,current.distance)}:null;
      consumed=true;
      suppressClickUntil=performance.now()+650;
      if(event.cancelable)event.preventDefault();
      event.stopImmediatePropagation();
    }
  },{capture:true,passive:false});

  svg.addEventListener('pointermove',event=>{
    if(event.pointerType!=='touch'||!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,point(event));

    if(pointers.size>=2){
      const current=metrics();
      if(current&&pinch){
        const ratio=current.distance/Math.max(1,pinch.distance);
        if(Number.isFinite(ratio)&&Math.abs(ratio-1)>.002){
          const deltaY=Math.log(1/ratio)/.00135;
          svg.dispatchEvent(new WheelEvent('wheel',{
            bubbles:true,
            cancelable:true,
            clientX:current.x,
            clientY:current.y,
            deltaY,
            deltaMode:0
          }));
          pinch.distance=current.distance;
        }
      }
      consumed=true;
      suppressClickUntil=performance.now()+650;
    }

    if(consumed){
      if(event.cancelable)event.preventDefault();
      event.stopImmediatePropagation();
    }
  },{capture:true,passive:false});

  const finish=event=>{
    if(event.pointerType!=='touch'||!pointers.has(event.pointerId))return;
    pointers.delete(event.pointerId);
    const hadPinch=consumed;

    if(pointers.size<2)pinch=null;
    if(hadPinch)suppressClickUntil=performance.now()+650;

    if(hadPinch&&pointers.size>0){
      if(event.cancelable)event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if(pointers.size===0)consumed=false;
  };

  svg.addEventListener('pointerup',finish,{capture:true,passive:false});
  svg.addEventListener('pointercancel',finish,{capture:true,passive:false});

  svg.addEventListener('click',event=>{
    if(performance.now()<suppressClickUntil){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },{capture:true});
}
