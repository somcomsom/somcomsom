# SOM COM SOM

Arbre familiar interactiu **Escorihuela · Magrinyà**, construït sobre la composició vectorial de la làmina original.

## Arquitectura mantenible

La informació i la presentació estan separades:

- `data/family-manifest.json` i `data/family/`: persones, naixements, defuncions, pares, fills i relacions.
- `data/layout-manifest.json` i `data/layout/`: coordenades visuals i mides de cada element.
- `assets/background-manifest.json` i `assets/background-*.svgpart`: composició vectorial original, sense les etiquetes editables.
- `app.js`: genera la capa SVG interactiva mantenint les coordenades originals.
- `admin.html`: editor visual per afegir o modificar persones i relacions.
- `data/somcomsom.ged`: còpia portable en format GEDCOM.

Aquesta separació evita que tot l’arbre es reorganitzi quan neix una persona, algú es casa o s’afegeix una defunció.

## Actualització

Obre `admin.html` des de la web publicada. L’editor permet:

- editar nom, naixement, defunció i notes;
- crear persones i relacions;
- assignar pares i fills;
- moure visualment una persona sense alterar la resta de la làmina;
- descarregar les dades completes i el GEDCOM;
- publicar els fragments de dades directament al repositori amb un token fi de GitHub que només tingui `Contents: Read and write` sobre aquest repositori.

El token s’utilitza només en memòria i no es desa al navegador.

## Validació local

```bash
python tools/validate_data.py
python tools/export_gedcom.py
node --check data-loader.js
node --check app.js
node --check admin.js
```

## Web

`https://somcomsom.github.io/somcomsom/`
