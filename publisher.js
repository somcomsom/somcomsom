import {buildGedcom} from './data-loader.js';

const $=selector=>document.querySelector(selector);
const apiBase='https://api.github.com/repos/somcomsom/somcomsom';

function headers(token){
  return {
    Accept:'application/vnd.github+json',
    Authorization:`Bearer ${token}`,
    'X-GitHub-Api-Version':'2022-11-28',
    'Content-Type':'application/json'
  };
}

async function github(path,token,options={}){
  const response=await fetch(`${apiBase}${path}`,{
    ...options,
    headers:{...headers(token),...(options.headers||{})}
  });
  if(!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.status===204?null:response.json();
}

async function createBlob(content,token){
  return github('/git/blobs',token,{
    method:'POST',
    body:JSON.stringify({content,encoding:'utf-8'})
  });
}

export async function publishChanges(family,layout){
  const token=$('#github-token').value.trim();
  const status=$('#publish-status');
  if(!token){status.textContent='Enganxa primer un token nou.';return}

  try{
    status.textContent='Preparant una publicació única…';

    const ref=await github('/git/ref/heads/main',token);
    const headSha=ref.object.sha;
    const headCommit=await github(`/git/commits/${headSha}`,token);

    const files=[
      ['data/family.json',JSON.stringify(family,null,2)+'\n'],
      ['data/layout.json',JSON.stringify(layout,null,2)+'\n'],
      ['data/family-overrides.json','{"people":{},"relationships":{}}\n'],
      ['data/layout-overrides.json','{"people":{},"relationships":{}}\n'],
      ['data/somcomsom.ged',buildGedcom(family)]
    ];

    status.textContent='Pujant dades, disposició i GEDCOM…';
    const blobs=await Promise.all(files.map(([,content])=>createBlob(content,token)));
    const tree=await github('/git/trees',token,{
      method:'POST',
      body:JSON.stringify({
        base_tree:headCommit.tree.sha,
        tree:files.map(([path],index)=>({
          path,
          mode:'100644',
          type:'blob',
          sha:blobs[index].sha
        }))
      })
    });

    const commit=await github('/git/commits',token,{
      method:'POST',
      body:JSON.stringify({
        message:'Publica els canvis de l’arbre familiar',
        tree:tree.sha,
        parents:[headSha]
      })
    });

    status.textContent='Activant la publicació de la web…';
    await github('/git/refs/heads/main',token,{
      method:'PATCH',
      body:JSON.stringify({sha:commit.sha,force:false})
    });

    status.textContent='Publicat en un únic commit. GitHub Pages s’actualitzarà automàticament.';
    $('#github-token').value='';
  }catch(error){
    console.error(error);
    status.textContent=`Error: ${error.message}`;
  }
}
