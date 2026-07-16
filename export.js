const SVG_NS='http://www.w3.org/2000/svg';
const svg=document.querySelector('#tree');
const svgButton=document.querySelector('#export-svg');
const pngButton=document.querySelector('#export-png');
const status=document.querySelector('#export-status');
const STYLE_PROPERTIES=[
  'fill','fill-opacity','stroke','stroke-opacity','stroke-width','stroke-dasharray',
  'stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight',
  'font-style','letter-spacing','text-anchor','dominant-baseline','vector-effect'
];

function setStatus(message){
  if(status)status.textContent=message;
}

function dimensions(){
  const paper=svg?.querySelector('.paper');
  const width=Number(paper?.getAttribute('width'));
  const height=Number(paper?.getAttribute('height'));
  if(!width||!height)throw new Error('La làmina encara no està preparada.');
  return {width,height};
}

function download(blob,filename){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function exportMarkup(){
  if(!svg||!svg.children.length)throw new Error('La làmina encara no està preparada.');
  const {width,height}=dimensions();
  const transient=[...svg.querySelectorAll('.selected,.match')].map(node=>({
    node,
    selected:node.classList.contains('selected'),
    match:node.classList.contains('match')
  }));

  for(const item of transient)item.node.classList.remove('selected','match');

  try{
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns',SVG_NS);
    clone.setAttribute('width',String(width));
    clone.setAttribute('height',String(height));
    clone.setAttribute('viewBox',`0 0 ${width} ${height}`);
    clone.setAttribute('preserveAspectRatio','xMidYMid meet');
    clone.removeAttribute('id');
    clone.classList.remove('dragging');

    const originals=[svg,...svg.querySelectorAll('*')];
    const copies=[clone,...clone.querySelectorAll('*')];
    originals.forEach((source,index)=>{
      const target=copies[index];
      if(!target)return;
      const computed=getComputedStyle(source);
      for(const property of STYLE_PROPERTIES){
        const value=computed.getPropertyValue(property);
        if(value)target.style.setProperty(property,value);
      }
    });

    clone.querySelectorAll('[tabindex]').forEach(node=>node.removeAttribute('tabindex'));
    clone.querySelectorAll('[role]').forEach(node=>node.removeAttribute('role'));
    clone.querySelectorAll('[data-id]').forEach(node=>node.removeAttribute('data-id'));

    const title=document.createElementNS(SVG_NS,'title');
    title.textContent='SOM COM SOM · Arbre familiar Escorihuela · Magrinyà';
    clone.insertBefore(title,clone.firstChild);

    const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
    return {xml,width,height};
  }finally{
    for(const item of transient){
      item.node.classList.toggle('selected',item.selected);
      item.node.classList.toggle('match',item.match);
    }
  }
}

async function asPng(xml,width,height){
  const source=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(source);
  try{
    const image=new Image();
    image.src=url;
    if(image.decode)await image.decode();
    else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});

    const maxSide=8192;
    const scale=Math.min(1,maxSide/width,maxSide/height);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d');
    if(!context)throw new Error('El navegador no pot generar la imatge PNG.');
    context.fillStyle='#fffdf9';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('No s’ha pogut crear el fitxer PNG.');
    return {blob,width:canvas.width,height:canvas.height};
  }finally{
    URL.revokeObjectURL(url);
  }
}

async function run(button,task){
  svgButton.disabled=true;
  pngButton.disabled=true;
  const previous=button.textContent;
  button.textContent='Preparant…';
  setStatus('Preparant l’arbre complet…');
  try{
    await task();
  }catch(error){
    console.error(error);
    setStatus(`Error: ${error.message}`);
  }finally{
    button.textContent=previous;
    svgButton.disabled=false;
    pngButton.disabled=false;
  }
}

svgButton?.addEventListener('click',()=>run(svgButton,async()=>{
  const {xml}=exportMarkup();
  download(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}),'som-com-som-arbre-complet.svg');
  setStatus('SVG exportat amb qualitat vectorial completa.');
}));

pngButton?.addEventListener('click',()=>run(pngButton,async()=>{
  const {xml,width,height}=exportMarkup();
  const png=await asPng(xml,width,height);
  download(png.blob,'som-com-som-arbre-complet.png');
  setStatus(`PNG exportat a ${png.width} × ${png.height} píxels.`);
}));
