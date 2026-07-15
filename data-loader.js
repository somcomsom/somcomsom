export async function getJson(path){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function optionalJson(path){
  const response=await fetch(path,{cache:'no-store'});
  if(response.status===404) return null;
  if(!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

function resolvePart(manifestPath,part){
  return new URL(part,new URL(manifestPath,location.href)).href;
}

async function loadFamily(){
  const monolith=await optionalJson('./data/family.json');
  if(monolith) return monolith;
  const path='./data/family-manifest.json';
  const manifest=await getJson(path);
  const people=(await Promise.all((manifest.peopleParts||[]).map(part=>getJson(resolvePart(path,part))))).flat();
  const relationships=(await Promise.all((manifest.relationshipParts||[]).map(part=>getJson(resolvePart(path,part))))).flat();
  return {version:manifest.version||1,meta:manifest.meta||{},people,relationships,directParentLinks:manifest.directParentLinks||[]};
}

async function loadLayout(){
  const monolith=await optionalJson('./data/layout.json');
  if(monolith) return monolith;
  const path='./data/layout-manifest.json';
  const manifest=await getJson(path);
  const peopleParts=await Promise.all((manifest.peopleParts||[]).map(part=>getJson(resolvePart(path,part))));
  const relationshipParts=await Promise.all((manifest.relationshipParts||[]).map(part=>getJson(resolvePart(path,part))));
  return {
    version:manifest.version||1,
    canvas:manifest.canvas||{},
    timeline:manifest.timeline||[],
    title:manifest.title||{},
    people:Object.assign({},...peopleParts),
    relationships:Object.assign({},...relationshipParts)
  };
}

export async function loadAll(){
  const [family,layout]=await Promise.all([loadFamily(),loadLayout()]);
  return {family,layout};
}

export function normalize(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/\s+/g,' ').trim();
}

export function personText(person){
  const parts=[person.name,...(person.details||[])];
  if(person.birth?.place) parts.push(person.birth.place);
  if(person.birth?.date) parts.push(person.birth.date);
  if(person.death?.place) parts.push(person.death.place);
  if(person.death?.date) parts.push(person.death.date);
  return parts.filter(Boolean).join(' · ');
}

export function composeDetails(person){
  const items=[];
  if(person.birth?.place||person.birth?.date) items.push(`Naixement: ${[person.birth.place,person.birth.date].filter(Boolean).join(' · ')}`);
  if(person.death?.place||person.death?.date) items.push(`Defunció: ${[person.death.place,person.death.date].filter(Boolean).join(' · ')}`);
  if(person.parents?.length) items.push(`Pares: ${person.parents.join(', ')}`);
  if(person.notes) items.push(person.notes);
  if(!items.length) items.push(...(person.details||[]));
  return items.filter(Boolean);
}

export function buildGedcom(family){
  const lines=['0 HEAD','1 SOUR SOMCOMSOM','1 GEDC','2 VERS 5.5.1','1 CHAR UTF-8'];
  for(const person of family.people||[]){
    lines.push(`0 @${person.id.toUpperCase()}@ INDI`,`1 NAME ${person.name||person.id}`);
    if(person.birth?.date||person.birth?.place){
      lines.push('1 BIRT');
      if(person.birth.date) lines.push(`2 DATE ${person.birth.date}`);
      if(person.birth.place) lines.push(`2 PLAC ${person.birth.place}`);
    }
    if(person.death?.date||person.death?.place){
      lines.push('1 DEAT');
      if(person.death.date) lines.push(`2 DATE ${person.death.date}`);
      if(person.death.place) lines.push(`2 PLAC ${person.death.place}`);
    }
  }
  for(const relation of family.relationships||[]){
    lines.push(`0 @${relation.id.toUpperCase()}@ FAM`);
    if(relation.partners?.[0]) lines.push(`1 HUSB @${relation.partners[0].toUpperCase()}@`);
    if(relation.partners?.[1]) lines.push(`1 WIFE @${relation.partners[1].toUpperCase()}@`);
    for(const child of relation.children||[]) lines.push(`1 CHIL @${child.toUpperCase()}@`);
    if(relation.date||relation.place||relation.label){
      lines.push('1 MARR');
      if(relation.date) lines.push(`2 DATE ${relation.date}`);
      if(relation.place) lines.push(`2 PLAC ${relation.place}`);
      if(relation.label) lines.push(`2 NOTE ${String(relation.label).replace(/\n/g,' / ')}`);
    }
  }
  lines.push('0 TRLR','');
  return lines.join('\n');
}

export function downloadText(filename,text,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type:`${type};charset=utf-8`}));
  const link=document.createElement('a');
  link.href=url; link.download=filename; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function utf8Base64(text){
  const bytes=new TextEncoder().encode(text);
  let binary='';
  const size=0x8000;
  for(let i=0;i<bytes.length;i+=size) binary+=String.fromCharCode(...bytes.subarray(i,i+size));
  return btoa(binary);
}
