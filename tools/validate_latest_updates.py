#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
family = json.loads((root / 'data/family.json').read_text(encoding='utf-8'))
overrides = json.loads((root / 'data/family-overrides.json').read_text(encoding='utf-8'))

people_updates = overrides.get('people', {})
people = {}
for person in family.get('people', []):
    patch = people_updates.get(person['id'], {})
    merged = {**person, **patch}
    merged['birth'] = {**person.get('birth', {}), **patch.get('birth', {})}
    merged['death'] = {**person.get('death', {}), **patch.get('death', {})}
    people[person['id']] = merged

relation_updates = overrides.get('relationships', {})
relations = {}
for relation in family.get('relationships', []):
    relations[relation['id']] = {**relation, **relation_updates.get(relation['id'], {})}

errors = []

def expect(condition, message):
    if not condition:
        errors.append(message)

expect(people.get('p170', {}).get('name') == 'Laia Escorihuela Cercuns', 'p170 name is incorrect')
expect(people.get('p171', {}).get('name') == 'Clara Escorihuela Cercuns', 'p171 name is incorrect')
expect(people.get('p195', {}).get('birth', {}).get('place') == 'Barcelona', 'p195 birthplace must be Barcelona')
expect(people.get('p195', {}).get('birth', {}).get('date') == '24/02/1994', 'p195 birth date must remain 24/02/1994')

r37 = relations.get('r37', {})
expect(r37.get('type') == 'married', 'r37 must be married')
expect(r37.get('partners') == ['p142', 'p156'], 'r37 must connect Sisco and Montse')
expect(r37.get('place') == 'La Salut', 'r37 marriage place must be La Salut')
expect(r37.get('date') == '18/04/1979', 'r37 marriage date must remain 18/04/1979')

r48 = relations.get('r48', {})
expect(r48.get('type') == 'married', 'r48 must be married')
expect(r48.get('partners') == ['p178', 'p183'], 'r48 must connect Marc and Laura')
expect(r48.get('date') == '15/04/2010', 'r48 date must remain 15/04/2010')

r49 = relations.get('r49', {})
expect(r49.get('type') == 'married', 'r49 must be married')
expect(r49.get('partners') == ['p179', 'p184'], 'r49 must connect Clara and Roger')
expect(r49.get('date') == '19/08/2012', 'r49 date must remain 19/08/2012')

colors = (root / 'relation-colors.css').read_text(encoding='utf-8')
expect('.partner-line' in colors and '.preview-partner' in colors, 'unified relation color selectors are missing')
expect('#d99a7b' in colors, 'partner lines must use the standard relation color')
expect('relation-colors.css' in (root / 'index.html').read_text(encoding='utf-8'), 'public tree must load relation-colors.css')
expect('relation-colors.css' in (root / 'admin.html').read_text(encoding='utf-8'), 'editor must load relation-colors.css')

if errors:
    raise SystemExit('\n'.join(errors))

print('OK: latest family corrections and unified relation colors')
