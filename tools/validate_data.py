#!/usr/bin/env python3
from pathlib import Path
import json, sys, re, subprocess
root=Path(__file__).resolve().parents[1]

def load(path): return json.loads(path.read_text(encoding='utf-8'))

def apply_overrides(people):
    path=root/'data/family-overrides.json'
    if not path.exists(): return people
    updates=load(path).get('people',{})
    merged=[]
    for person in people:
        patch=updates.get(person['id'])
        if not patch:
            merged.append(person); continue
        item={**person,**patch}
        item['birth']={**person.get('birth',{}),**patch.get('birth',{})}
        item['death']={**person.get('death',{}),**patch.get('death',{})}
        merged.append(item)
    return merged

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
    family['people']=apply_overrides(family.get('people',[]))
    return family

def layout_data():
    mono=root/'data/layout.json'
    if mono.exists(): return load(mono)
    m=load(root/'data/layout-manifest.json')
    people={}; relationships={}
    for p in m.get('peopleParts',[]): people.update(load(root/'data'/p.replace('./','')))
    for p in m.get('relationshipParts',[]): relationships.update(load(root/'data'/p.replace('./','')))
    return {'people':people,'relationships':relationships}

family=family_data(); layout=layout_data()
ids={p['id'] for p in family['people']}
errors=[]
if len(ids)!=len(family['people']): errors.append('duplicate person IDs')
for rel in family['relationships']:
    for pid in rel.get('partners',[])+rel.get('children',[]):
        if pid not in ids: errors.append(f"{rel['id']}: unknown {pid}")
for link in family.get('directParentLinks',[]):
    if link.get('parent') not in ids or link.get('child') not in ids: errors.append(f'bad direct link {link}')
missing=ids-set(layout['people'])
if missing: errors.append('missing layout: '+', '.join(sorted(missing)))
if len(family['people'])!=200: errors.append(f"expected 200 people, found {len(family['people'])}")
if len(family['relationships'])!=54: errors.append(f"expected 54 relationships, found {len(family['relationships'])}")

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
