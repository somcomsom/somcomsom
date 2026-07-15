import {loadAll} from './data-loader.js';
import {startEditor} from './admin-editor.js';

try{
  const {family,layout}=await loadAll();
  startEditor(structuredClone(family),structuredClone(layout));
}catch(error){
  console.error(error);
  alert(`No s’ha pogut carregar l’editor: ${error.message}`);
}
