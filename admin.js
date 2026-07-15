import {loadAll} from './data-loader.js';
import {startEditor} from './admin-editor.js?v=20260715-6';

try{
  const {family,layout}=await loadAll();
  startEditor(structuredClone(family),structuredClone(layout));
}catch(error){
  console.error(error);
  alert(`No s’ha pogut carregar l’editor: ${error.message}`);
}
