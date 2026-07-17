# SOM COM SOM

Arbre familiar interactiu **Escorihuela · Magriñà**, reconstruït en SVG amb la distribució i les coordenades extretes del PDF original.

## Arquitectura mantenible

- `data/family-manifest.json` i `data/family/`: 202 persones, naixements, defuncions, pares, fills i 55 relacions.
- `data/family-overrides.json`: correccions i actualitzacions puntuals aplicades sobre les dades originals sense reescriure fitxers grans.
- `data/layout-manifest.json` i `data/layout/`: coordenades i mides de cada persona i relació.
- `app.js`: genera l’SVG, les connexions, la cerca, el zoom i la navegació.
- `mobile.js`: controla el menú plegable i els gestos responsive.
- `export.js`: genera una còpia completa en SVG vectorial o PNG d’alta resolució.
- `admin.html`: editor visual per afegir o modificar persones, relacions i posicions.
- `data/somcomsom.ged`: exportació portable GEDCOM.

L’ordre no depèn de Mermaid ni d’un motor de distribució automàtica. Quan neix una persona o canvia una relació, només cal afegir la dada i col·locar el nou element; la resta de l’arbre manté la seva posició.

## Consulta i exportació

La web utilitza tot l’espai disponible i manté la cerca i la fitxa dins d’un menú plegable. Des d’aquest menú es pot descarregar:

- **SVG complet**, recomanat per imprimir, ampliar o editar sense pèrdua de qualitat;
- **PNG complet**, recomanat per compartir en aplicacions i dispositius que no obren SVG.

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
node --check export.js
node --check mobile.js
node --check admin.js
```

Web: `https://somcomsom.github.io/somcomsom/`
