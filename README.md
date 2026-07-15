# SOM COM SOM

Arbre familiar interactiu **Escorihuela · Magrinyà**, reconstruït en SVG amb la distribució i les coordenades extretes del PDF original.

## Arquitectura mantenible

- `data/family-manifest.json` i `data/family/`: 193 persones, naixements, defuncions, pares, fills i 52 relacions.
- `data/layout-manifest.json` i `data/layout/`: coordenades i mides de cada persona i relació.
- `app.js`: genera l’SVG, les connexions, la cerca, el zoom i la navegació.
- `admin.html`: editor visual per afegir o modificar persones, relacions i posicions.
- `data/somcomsom.ged`: exportació portable GEDCOM.

L’ordre no depèn de Mermaid ni d’un motor de distribució automàtica. Quan neix una persona o canvia una relació, només cal afegir la dada i col·locar el nou element; la resta de l’arbre manté la seva posició.

## Actualització

Des de `admin.html` es pot:

- editar nom, naixement, defunció i notes;
- crear persones i relacions;
- assignar pares, parelles i fills;
- arrossegar una persona a la posició desitjada;
- descarregar JSON i GEDCOM;
- publicar directament a GitHub amb un token fi limitat a aquest repositori.

El token només es conserva en memòria mentre s’utilitza l’editor.

## Validació local

```bash
python3 tools/validate_data.py
python3 tools/export_gedcom.py
node --check data-loader.js
node --check app.js
node --check admin.js
```

Web: `https://somcomsom.github.io/somcomsom/`
