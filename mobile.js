import './pinch-zoom.js?v=20260716-1';

const portraitQuery=matchMedia('(max-width: 820px) and (orientation: portrait)');
const sidebar=document.querySelector('#sidebar');
const toggle=document.querySelector('#sidebar-toggle');
const closeButton=document.querySelector('#sidebar-close');
const backdrop=document.querySelector('#mobile-backdrop');
const sheetHead=document.querySelector('.mobile-sheet-head');
const search=document.querySelector('#search');
const tree=document.querySelector('#tree');

function isPortrait(){
  return portraitQuery.matches;
}

function sync(open=sidebar?.classList.contains('open')){
  const active=Boolean(open);
  document.body.classList.toggle('sheet-open',active);
  backdrop?.classList.toggle('visible',active);
  toggle?.setAttribute('aria-expanded',String(active));
  toggle?.setAttribute('aria-label',active?'Tanca el menú':'Obre el menú');
  sidebar?.setAttribute('aria-hidden',String(!active));
  backdrop?.setAttribute('aria-hidden',String(!active));
  if(sidebar)sidebar.inert=!active;
}

function openPanel({focusSearch=false}={}){
  if(!sidebar)return;
  sidebar.classList.add('open');
  sync(true);
  if(focusSearch)setTimeout(()=>search?.focus({preventScroll:true}),180);
}

function closePanel({restoreFocus=false}={}){
  if(!sidebar)return;
  sidebar.classList.remove('open');
  sidebar.style.removeProperty('transform');
  sync(false);
  if(restoreFocus)setTimeout(()=>toggle?.focus({preventScroll:true}),40);
}

function togglePanel(){
  sidebar?.classList.contains('open')?closePanel():openPanel({focusSearch:true});
}

if(toggle){
  toggle.setAttribute('aria-controls','sidebar');
  toggle.setAttribute('aria-expanded','false');
  toggle.addEventListener('click',event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    togglePanel();
  },true);
}

closeButton?.addEventListener('click',()=>closePanel({restoreFocus:true}));
backdrop?.addEventListener('click',()=>closePanel({restoreFocus:true}));

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&sidebar?.classList.contains('open'))closePanel({restoreFocus:true});
});

if(sidebar){
  new MutationObserver(()=>sync()).observe(sidebar,{attributes:true,attributeFilter:['class']});
  sidebar.addEventListener('click',event=>{
    if(event.target.closest('.result'))setTimeout(()=>closePanel(),0);
  });
}

tree?.addEventListener('click',event=>{
  if(event.target.closest('.person-node'))setTimeout(()=>closePanel(),0);
});

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
  if(delta>72)closePanel({restoreFocus:true});
}

sheetHead?.addEventListener('pointerup',finishGesture);
sheetHead?.addEventListener('pointercancel',finishGesture);

function handleViewportChange(){
  closePanel();
  setTimeout(()=>document.querySelector('#fit')?.click(),180);
}

portraitQuery.addEventListener?.('change',handleViewportChange);
addEventListener('orientationchange',handleViewportChange);

sync(false);
