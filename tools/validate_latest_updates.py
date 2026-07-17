#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
family = json.loads((root / 'data/family.json').read_text(encoding='utf-8'))
overrides = json.loads((root / 'data/family-overrides.json').read_text(encoding='utf-8'))
layout = json.loads((root / 'data/layout.json').read_text(encoding='utf-8'))
layout_overrides = json.loads((root / 'data/layout-overrides.json').read_text(encoding='utf-8'))

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

layout_people = {
    **layout.get('people', {}),
    **layout_overrides.get('people', {}),
}

errors = []

def expect(condition, message):
    if not condition:
        errors.append(message)

expect(people.get('p170', {}).get('name') == 'Laia Escorihuela Cercuns', 'p170 name is incorrect')
expect(people.get('p171', {}).get('name') == 'Clara Escorihuela Cercuns', 'p171 name is incorrect')
expect(people.get('p195', {}).get('birth', {}).get('place') == 'Barcelona', 'p195 birthplace must be Barcelona')
expect(people.get('p195', {}).get('birth', {}).get('date') == '24/02/1994', 'p195 birth date must remain 24/02/1994')
expect(people.get('p202', {}).get('name') == 'Esteve Armengol Esteva', 'p202 full name is incorrect')
expect(people.get('p202', {}).get('birth', {}).get('place') == 'Sabadell', 'p202 birthplace must be Sabadell')
expect(people.get('p202', {}).get('birth', {}).get('date') == '19/03/1953', 'p202 birth date must be 19/03/1953')

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
expect(r49.get('type') == 'partner', 'r49 must be a partnership, not a marriage')
expect(r49.get('partners') == ['p179', 'p184'], 'r49 must connect Clara and Roger')
expect(r49.get('date') == '19/08/2012', 'r49 date must remain 19/08/2012')
expect(r49.get('label') == '(19/08/2012)\n♡', 'r49 must use the partnership symbol')

r56 = relations.get('r56', {})
expect(r56.get('type') == 'separated', 'r56 must remain separated')
expect(r56.get('partners') == ['p202', 'p149'], 'r56 must connect Esteve and Dolors')
expect(r56.get('place') == 'Sabadell', 'r56 must preserve Sabadell')
expect(r56.get('date') == '18/10/1978', 'r56 marriage date must be 18/10/1978')
expect(r56.get('label') == 'Sabadell (18/10/1978)\n○ ○', 'r56 label must show the date and separated status')

same_level_ids = [
    'p154', 'p160', 'p161', 'p163', 'p164', 'p170', 'p171',
    'p174', 'p175', 'p196', 'p197', 'p198', 'p199', 'p200',
]
target_level = 2154.94
for person_id in same_level_ids:
    expect(person_id in layout_people, f'{person_id} must exist in the effective layout')
    expect(
        abs(float(layout_people.get(person_id, {}).get('y', -1)) - target_level) < 0.001,
        f'{person_id} must be aligned at y={target_level}',
    )

colors = (root / 'relation-colors.css').read_text(encoding='utf-8')
expect('.partner-line' in colors and '.preview-partner' in colors, 'unified relation line color selectors are missing')
expect('#d99a7b' in colors, 'partner lines must use the standard relation color')
expect('.relation-label.partner' in colors and '.preview-relation-label.partner' in colors, 'unified partner label color selectors are missing')
expect('#9c7c5c' in colors, 'partner heart and text must use the standard relation label color')
expect('relation-colors.css' in (root / 'index.html').read_text(encoding='utf-8'), 'public tree must load relation-colors.css')
expect('relation-colors.css' in (root / 'admin.html').read_text(encoding='utf-8'), 'editor must load relation-colors.css')

if errors:
    raise SystemExit('\n'.join(errors))

print('OK: latest family corrections, unified relation colors and aligned descendant level')
