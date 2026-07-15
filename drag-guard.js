const canvases=[...document.querySelectorAll('#tree,#preview-svg')];

function clearSelection(){
  const selection=document.getSelection();
  if(selection?.rangeCount)selection.removeAllRanges();
}

for(const canvas of canvases){
  canvas.addEventListener('selectstart',event=>event.preventDefault());
  canvas.addEventListener('dragstart',event=>event.preventDefault());
  canvas.addEventListener('pointerdown',event=>{
    if(event.button===0)clearSelection();
  },{capture:true});
  canvas.addEventListener('pointermove',event=>{
    if((event.buttons&1)!==1)return;
    clearSelection();
    if(event.cancelable)event.preventDefault();
  },{capture:true});
}
