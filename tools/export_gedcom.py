#!/usr/bin/env python3
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
def load(path): return json.loads(path.read_text(encoding='utf-8'))
mono=root/'data/family.json'
if mono.exists(): family=load(mono)
else:
    m=load(root/'data/family-manifest.json'); people=[]; relationships=[]
    for p in m.get('peopleParts',[]): people += load(root/'data'/p.replace('./',''))
    for p in m.get('relationshipParts',[]): relationships += load(root/'data'/p.replace('./',''))
    family={'people':people,'relationships':relationships}
lines=['0 HEAD','1 SOUR SOMCOMSOM','1 GEDC','2 VERS 5.5.1','1 CHAR UTF-8']
for p in family['people']:
    lines += [f"0 @{p['id'].upper()}@ INDI",f"1 NAME {p.get('name',p['id'])}"]
    if p.get('birth',{}).get('date') or p.get('birth',{}).get('place'):
        lines += ['1 BIRT']
        if p['birth'].get('date'): lines += [f"2 DATE {p['birth']['date']}"]
        if p['birth'].get('place'): lines += [f"2 PLAC {p['birth']['place']}"]
    if p.get('death',{}).get('date') or p.get('death',{}).get('place'):
        lines += ['1 DEAT']
        if p['death'].get('date'): lines += [f"2 DATE {p['death']['date']}"]
        if p['death'].get('place'): lines += [f"2 PLAC {p['death']['place']}"]
for r in family['relationships']:
    lines += [f"0 @{r['id'].upper()}@ FAM"]
    for tag,pid in zip(('HUSB','WIFE'),r.get('partners',[])[:2]): lines += [f"1 {tag} @{pid.upper()}@"]
    for child in r.get('children',[]): lines += [f"1 CHIL @{child.upper()}@"]
lines += ['0 TRLR','']
(root/'data/somcomsom.ged').write_text('\n'.join(lines),encoding='utf-8')
print(root/'data/somcomsom.ged')
