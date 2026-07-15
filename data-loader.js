async function json(path){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function text(path){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

function resolveFrom(manifestPath,part){
  return new URL(part,new URL(manifestPath,location.href)).href;
}

export async function loadFamily(manifestPath='./data/family-manifest.json'){
  const manifest=await json(manifestPath);
  const people=(await Promise.all((manifest.peopleParts||[]).map(path=>json(resolveFrom(manifestPath,path))))).flat();
  const relationships=(await Promise.all((manifest.relationshipParts||[]).map(path=>json(resolveFrom(manifestPath,path))))).flat();
  return {
    version:manifest.version||1,
    meta:manifest.meta||{},
    people,
    relationships,
    directParentLinks:manifest.directParentLinks||[]
  };
}

export async function loadLayout(manifestPath='./data/layout-manifest.json'){
  const manifest=await json(manifestPath);
  const peopleParts=await Promise.all((manifest.peopleParts||[]).map(path=>json(resolveFrom(manifestPath,path))));
  const relationshipParts=await Promise.all((manifest.relationshipParts||[]).map(path=>json(resolveFrom(manifestPath,path))));
  return {
    version:manifest.version||1,
    canvas:manifest.canvas||{},
    people:Object.assign({},...peopleParts),
    relationships:Object.assign({},...relationshipParts)
  };
}

export async function loadBackground(manifestPath='./assets/background-manifest.json'){
  const manifest=await json(manifestPath);
  const svgText=(await Promise.all((manifest.parts||[]).map(path=>text(resolveFrom(manifestPath,path))))).join('');
  const url=URL.createObjectURL(new Blob([svgText],{type:'image/svg+xml;charset=utf-8'}));
  return {svgText,url};
}

function chunks(items,size){
  const result=[];
  for(let index=0;index<items.length;index+=size)result.push(items.slice(index,index+size));
  return result;
}

function stringify(value){return JSON.stringify(value,null,2)+'\n'}

export function familyFiles(family){
  const files=new Map();
  const peopleParts=chunks(family.people||[],25);
  const relationshipParts=chunks(family.relationships||[],20);
  const peopleNames=peopleParts.map((_,index)=>`./family/people-${String(index+1).padStart(2,'0')}.json`);
  const relationNames=relationshipParts.map((_,index)=>`./family/relationships-${String(index+1).padStart(2,'0')}.json`);
  files.set('data/family-manifest.json',stringify({
    version:family.version||1,
    meta:family.meta||{},
    peopleParts:peopleNames,
    relationshipParts:relationNames,
    directParentLinks:family.directParentLinks||[]
  }));
  peopleParts.forEach((part,index)=>files.set(`data/family/people-${String(index+1).padStart(2,'0')}.json`,stringify(part)));
  relationshipParts.forEach((part,index)=>files.set(`data/family/relationships-${String(index+1).padStart(2,'0')}.json`,stringify(part)));
  return files;
}

export function layoutFiles(layout){
  const files=new Map();
  const peopleEntries=Object.entries(layout.people||{});
  const relationEntries=Object.entries(layout.relationships||{});
  const peopleParts=chunks(peopleEntries,20).map(Object.fromEntries);
  const relationshipParts=chunks(relationEntries,20).map(Object.fromEntries);
  const peopleNames=peopleParts.map((_,index)=>`./layout/people-${String(index+1).padStart(2,'0')}.json`);
  const relationNames=relationshipParts.map((_,index)=>`./layout/relationships-${String(index+1).padStart(2,'0')}.json`);
  files.set('data/layout-manifest.json',stringify({
    version:layout.version||1,
    canvas:layout.canvas||{},
    peopleParts:peopleNames,
    relationshipParts:relationNames
  }));
  peopleParts.forEach((part,index)=>files.set(`data/layout/people-${String(index+1).padStart(2,'0')}.json`,stringify(part)));
  relationshipParts.forEach((part,index)=>files.set(`data/layout/relationships-${String(index+1).padStart(2,'0')}.json`,stringify(part)));
  return files;
}
