import './pinch-zoom.js?v=20260716-1';

const portraitQuery=matchMedia('(max-width: 820px) and (orientation: portrait)');
const sidebar=document.querySelector('#sidebar');
const toggle=document.querySelector('#sidebar-toggle');
const closeButton=document.querySelector('#sidebar-close');
const backdrop=document.querySelector('#mobile-backdrop');
const sheetHead=document.querySelector('.mobile-sheet-head');
const search=document.querySelector('#search');

function isPortrait(){
  return portraitQuery.matches;
}

function sync(open=sidebar?.classList.contains('open')){
  const active=isPortrait()&&Boolean(open);
  document.body.classList.toggle('sheet-open',active);
  backdrop?.classList.toggle('visible',active);
  toggle?.setAttribute('aria-expanded',String(active));
  backdrop?.setAttribute('aria-hidden',String(!active));
}

function openSheet({focusSearch=false}={}){
  if(!sidebar||!isPortrait())return;
  sidebar.classList.add('open');
  sync(true);
  if(focusSearch)setTimeout(()=>search?.focus({preventScroll:true}),180);
}

function closeSheet({restoreFocus=false}={}){
  if(!sidebar)return;
  sidebar.classList.remove('open');
  sync(false);
  if(restoreFocus)setTimeout(()=>toggle?.focus({preventScroll:true}),40);
}

if(toggle){
  toggle.setAttribute('aria-controls','sidebar');
  toggle.setAttribute('aria-expanded','false');
  toggle.onclick=()=>sidebar?.classList.contains('open')?closeSheet():openSheet({focusSearch:true});
}

closeButton?.addEventListener('click',()=>closeSheet({restoreFocus:true}));
backdrop?.addEventListener('click',()=>closeSheet({restoreFocus:true}));

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&sidebar?.classList.contains('open'))closeSheet({restoreFocus:true});
});

if(sidebar){
  new MutationObserver(()=>sync()).observe(sidebar,{attributes:true,attributeFilter:['class']});
}

let gesture=null;
sheetHead?.addEventListener('pointerdown',event=>{
  if(!isPortrait()||event.button!==0)return;
  gesture={pointerId:event.pointerId,startY:event.clientY,lastY:event.clientY};
  sheetHead.setPointerCapture(event.pointerId);
});

sheetHead?.addEventListener('pointermove',event=>{
  if(!gesture||gesture.pointerId!==event.pointerId)return;
  gesture.lastY=event.clientY;
  const delta=Math.max(0,event.clientY-gesture.startY);
  if(delta>0)sidebar.style.transform=`translateY(${Math.min(delta,180)}px)`;
});

function finishGesture(event){
  if(!gesture||gesture.pointerId!==event.pointerId)return;
  const delta=gesture.lastY-gesture.startY;
  sidebar.style.removeProperty('transform');
  try{sheetHead.releasePointerCapture(event.pointerId)}catch{}
  gesture=null;
  if(delta>72)closeSheet({restoreFocus:true});
}

sheetHead?.addEventListener('pointerup',finishGesture);
sheetHead?.addEventListener('pointercancel',finishGesture);

function handleViewportChange(){
  if(!isPortrait())closeSheet();
  setTimeout(()=>document.querySelector('#fit')?.click(),180);
}

portraitQuery.addEventListener?.('change',handleViewportChange);
addEventListener('orientationchange',handleViewportChange);
addEventListener('resize',()=>{
  if(!isPortrait())sync(false);
},{passive:true});

sync(false);
