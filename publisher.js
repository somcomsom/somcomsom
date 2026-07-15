import {buildGedcom,utf8Base64} from './data-loader.js';

const $=selector=>document.querySelector(selector);
const apiBase='https://api.github.com/repos/somcomsom/somcomsom/contents/';

async function currentFile(path,token){
  const response=await fetch(`${apiBase}${path}?ref=main`,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'}});
  if(response.status===404) return null;
  if(!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function putFile(path,text,token,message){
  const current=await currentFile(path,token);
  const body={message,content:utf8Base64(text),branch:'main'};
  if(current?.sha) body.sha=current.sha;
  const response=await fetch(`${apiBase}${path}`,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
}

export async function publishChanges(family,layout){
  const token=$('#github-token').value.trim();
  const status=$('#publish-status');
  if(!token){status.textContent='Enganxa primer un token nou.';return}
  try{
    status.textContent='Publicant les dades familiars…';
    await putFile('data/family.json',JSON.stringify(family,null,2)+'\n',token,'Actualitza les dades familiars');
    status.textContent='Publicant la disposició…';
    await putFile('data/layout.json',JSON.stringify(layout,null,2)+'\n',token,'Actualitza la disposició de l’arbre');
    status.textContent='Publicant el GEDCOM…';
    await putFile('data/somcomsom.ged',buildGedcom(family),token,'Actualitza la còpia GEDCOM');
    status.textContent='Publicat. GitHub Pages s’actualitzarà automàticament.';
    $('#github-token').value='';
  }catch(error){
    console.error(error);
    status.textContent=`Error: ${error.message}`;
  }
}
