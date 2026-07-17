#!/usr/bin/env python3
from pathlib import Path
import json, sys, re, subprocess
root=Path(__file__).resolve().parents[1]

def load(path): return json.loads(path.read_text(encoding='utf-8'))

def apply_family_overrides(family):
    path=root/'data/family-overrides.json'
    if not path.exists(): return family
    overrides=load(path)
    people_updates=overrides.get('people',{})
    merged=[]
    for person in family.get('people',[]):
        patch=people_updates.get(person['id'])
        if not patch:
            merged.append(person); continue
        item={**person,**patch}
        item['birth']={**person.get('birth',{}),**patch.get('birth',{})}
        item['death']={**person.get('death',{}),**patch.get('death',{})}
        merged.append(item)
    family['people']=merged

    relation_updates=overrides.get('relationships',{})
    relations=[]; seen=set()
    for relation in family.get('relationships',[]):
        patch=relation_updates.get(relation['id'])
        relations.append({**relation,**patch} if patch else relation)
        seen.add(relation['id'])
    for relation_id,patch in relation_updates.items():
        if relation_id not in seen: relations.append({'id':relation_id,**patch})
    family['relationships']=relations
    family['meta']={**family.get('meta',{}),**overrides.get('meta',{})}
    if isinstance(overrides.get('directParentLinks'),list):
        family['directParentLinks']=overrides['directParentLinks']
    return family

def family_data():
    mono=root/'data/family.json'
    if mono.exists():
        family=load(mono)
    else:
        m=load(root/'data/family-manifest.json')
        people=[]; relationships=[]
        for p in m.get('peopleParts',[]): people += load(root/'data'/p.replace('./',''))
        for p in m.get('relationshipParts',[]): relationships += load(root/'data'/p.replace('./',''))
        family={'version':m.get('version',1),'meta':m.get('meta',{}),'people':people,'relationships':relationships,'directParentLinks':m.get('directParentLinks',[])}
    return apply_family_overrides(family)

def layout_data():
    mono=root/'data/layout.json'
    if mono.exists():
        layout=load(mono)
    else:
        m=load(root/'data/layout-manifest.json')
        people={}; relationships={}
        for p in m.get('peopleParts',[]): people.update(load(root/'data'/p.replace('./','')))
        for p in m.get('relationshipParts',[]): relationships.update(load(root/'data'/p.replace('./','')))
        layout={'people':people,'relationships':relationships}
    path=root/'data/layout-overrides.json'
    if path.exists():
        overrides=load(path)
        layout['people']={**layout.get('people',{}),**overrides.get('people',{})}
        layout['relationships']={**layout.get('relationships',{}),**overrides.get('relationships',{})}
        if overrides.get('canvas'): layout['canvas']={**layout.get('canvas',{}),**overrides['canvas']}
    return layout

family=family_data(); layout=layout_data()
ids={p['id'] for p in family['people']}
errors=[]
if len(ids)!=len(family['people']): errors.append('duplicate person IDs')
for person in family['people']:
    for pid in person.get('parents',[]):
        if pid not in ids: errors.append(f"{person['id']}: unknown parent {pid}")
for rel in family['relationships']:
    for pid in rel.get('partners',[])+rel.get('children',[]):
        if pid not in ids: errors.append(f"{rel['id']}: unknown {pid}")
for link in family.get('directParentLinks',[]):
    if link.get('parent') not in ids or link.get('child') not in ids: errors.append(f'bad direct link {link}')
missing=ids-set(layout['people'])
if missing: errors.append('missing layout: '+', '.join(sorted(missing)))
if len(family['people'])!=202: errors.append(f"expected 202 people, found {len(family['people'])}")
if len(family['relationships'])!=56: errors.append(f"expected 56 relationships, found {len(family['relationships'])}")

relations={relation['id']:relation for relation in family['relationships']}
people={person['id']:person for person in family['people']}
expected_types={'r34':'separated','r35':'married','r36':'married','r55':'partner','r56':'separated'}
for relation_id,relation_type in expected_types.items():
    if relations.get(relation_id,{}).get('type')!=relation_type:
        errors.append(f'{relation_id}: expected type {relation_type}')
if relations.get('r34',{}).get('place')!='Sabadell':
    errors.append('r34 must use Sabadell as the 1981 partnership place')
if relations.get('r34',{}).get('date')!='1981':
    errors.append('r34 must preserve 1981 as the partnership year')
if relations.get('r34',{}).get('label')!='Sabadell (1981)\n○ ○':
    errors.append('r34 label must be Sabadell (1981)')
if relations.get('r35',{}).get('date')!='16/06/2026':
    errors.append('r35 must use 16/06/2026 as marriage date')
if relations.get('r35',{}).get('place')!='':
    errors.append('r35 marriage place must remain unspecified')
if relations.get('r36',{}).get('place')!='Montoliu de Segarra':
    errors.append('r36 must use Montoliu de Segarra as marriage place')
if relations.get('r36',{}).get('date')!='12/06/2021':
    errors.append('r36 must use 12/06/2021 as marriage date')
if relations.get('r56',{}).get('place')!='Sabadell':
    errors.append('r56 must use Sabadell as separation place')
if people.get('p197',{}).get('birth',{}).get('place')!='Montoliu de Segarra':
    errors.append('p197 must use Montoliu de Segarra as birthplace')
if people.get('p197',{}).get('birth',{}).get('date')!='30/07/2023':
    errors.append('p197 must preserve the birth date 30/07/2023')
if people.get('p201',{}).get('birth',{}).get('place')!='Escaldes-Engordany':
    errors.append('p201 must use Escaldes-Engordany as birthplace')
if relations.get('r56',{}).get('children')!=['p152']:
    errors.append('r56 must connect Irene Armengol Martí as child')
if any(link.get('child')=='p152' for link in family.get('directParentLinks',[])):
    errors.append('Irene must be connected through r56, not directParentLinks')

levels={
    1830.53:['p202','p149'],
    1998.13:['p153','p152','p201','p150','p151','p155','p148'],
    2154.94:['p154','p197']
}
for expected_y,person_ids in levels.items():
    for person_id in person_ids:
        actual=layout['people'].get(person_id,{}).get('y')
        if actual is None or abs(actual-expected_y)>0.05:
            errors.append(f'{person_id}: expected y {expected_y}, found {actual}')
for relation_id in ('r34','r35','r36','r55','r56'):
    if relation_id not in layout.get('relationships',{}):
        errors.append(f'missing relationship layout: {relation_id}')

required=[root/'admin.html',root/'admin.css',root/'admin.js',root/'admin-editor.js',root/'admin-preview.js',root/'publisher.js']
for path in required:
    if not path.is_file() or path.stat().st_size==0: errors.append(f'missing editor file: {path.name}')
if not errors:
    html=(root/'admin.html').read_text(encoding='utf-8')
    ids_in_html=set(re.findall(r'id="([^"]+)"',html))
    refs=set()
    for name in ('admin.js','admin-editor.js','admin-preview.js','publisher.js'):
        text=(root/name).read_text(encoding='utf-8')
        refs.update(re.findall(r"\$\('#([^']+)'\)",text))
    missing_refs=refs-ids_in_html
    if missing_refs: errors.append('editor IDs missing from HTML: '+', '.join(sorted(missing_refs)))
    for name in ('admin.js','admin-editor.js','admin-preview.js','publisher.js'):
        result=subprocess.run(['node','--check',str(root/name)],capture_output=True,text=True)
        if result.returncode: errors.append(f'{name}: {result.stderr.strip()}')

if errors:
    print('\n'.join(errors),file=sys.stderr); raise SystemExit(1)
print(f"OK: {len(family['people'])} people and {len(family['relationships'])} relationships")
