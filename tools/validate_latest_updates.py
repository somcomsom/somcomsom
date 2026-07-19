#!/usr/bin/env python3
from pathlib import Path
import json
import math

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
for relation_id, patch in relation_updates.items():
    if relation_id not in relations:
        relations[relation_id] = {'id': relation_id, **patch}

layout_people = {
    **layout.get('people', {}),
    **layout_overrides.get('people', {}),
}
layout_relationships = {
    **layout.get('relationships', {}),
    **layout_overrides.get('relationships', {}),
}

errors = []

def expect(condition, message):
    if not condition:
        errors.append(message)

def finite_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))

expect(bool(people), 'the effective family must contain people')
expect(bool(relations), 'the effective family must contain relationships')

judith = people.get('p195', {})
expect(judith.get('name') == 'Judith Albaladejo de la Torre', 'p195 must remain Judith Albaladejo de la Torre')
expect(judith.get('birth', {}).get('place') == 'Barcelona', 'Judith birthplace must remain Barcelona')
expect(judith.get('birth', {}).get('date') == '28/02/1994', 'Judith birth date must be 28/02/1994')
expect(judith.get('details') == ['Barcelona (28/02/1994)'], 'Judith display details must match the corrected birth data')

bruna = people.get('p198', {})
expect(bruna.get('name') == 'Bruna Escorihuela del Paso', 'p198 must remain Bruna Escorihuela del Paso')
expect(bruna.get('birth', {}).get('place') == 'Sabadell', 'Bruna birthplace must be Sabadell')
expect(bruna.get('birth', {}).get('date') == '03/10/2021', 'Bruna birth date must be 03/10/2021')
expect(bruna.get('details') == ['Sabadell (03/10/2021)'], 'Bruna display details must match the corrected birth data')

roc = people.get('p199', {})
expect(roc.get('name') == 'Roc Escorihuela del Paso', 'p199 must remain Roc Escorihuela del Paso')
expect(roc.get('birth', {}).get('place') == 'Sabadell', 'Roc birthplace must be Sabadell')
expect(roc.get('birth', {}).get('date') == '27/02/2024', 'Roc birth date must remain 27/02/2024')
expect(roc.get('details') == ['Sabadell (27/02/2024)'], 'Roc display details must match the corrected birth data')

marc_laura = relations.get('r48', {})
expect(marc_laura.get('type') == 'married', 'r48 must remain a marriage')
expect(marc_laura.get('partners') == ['p178', 'p183'], 'r48 must connect Marc Escorihuela Sánchez and Laura del Paso Martínez')
expect(marc_laura.get('date') == '16/10/2020', 'Marc and Laura marriage date must be 16/10/2020')
expect(marc_laura.get('label') == '(16/10/2020)\n⚭', 'Marc and Laura marriage label must show 16/10/2020')

for person_id, person in people.items():
    expect(bool(str(person.get('name', '')).strip()), f'{person_id} must have a name')
    box = layout_people.get(person_id)
    expect(box is not None, f'{person_id} must have a layout box')
    if box is not None:
        for key in ('x', 'y', 'width', 'height'):
            expect(finite_number(box.get(key)), f'{person_id}.{key} must be a finite number')
        if finite_number(box.get('width')):
            expect(float(box['width']) > 0, f'{person_id}.width must be positive')
        if finite_number(box.get('height')):
            expect(float(box['height']) > 0, f'{person_id}.height must be positive')

for relation_id, relation in relations.items():
    point = layout_relationships.get(relation_id)
    expect(point is not None, f'{relation_id} must have a layout point')
    if point is not None:
        expect(finite_number(point.get('x')), f'{relation_id}.x must be a finite number')
        expect(finite_number(point.get('y')), f'{relation_id}.y must be a finite number')

    for partner_id in relation.get('partners', []):
        expect(partner_id in people, f'{relation_id} references missing partner {partner_id}')
    for child_id in relation.get('children', []):
        expect(child_id in people, f'{relation_id} references missing child {child_id}')

for link in family.get('directParentLinks', []):
    parent_id = link.get('parent')
    child_id = link.get('child')
    expect(parent_id in people, f'direct parent link references missing parent {parent_id}')
    expect(child_id in people, f'direct parent link references missing child {child_id}')

# This is a visual relationship requested explicitly: both marriages must stay
# on the same horizontal row, regardless of where that row is moved later.
r53_point = layout_relationships.get('r53')
r54_point = layout_relationships.get('r54')
if r53_point is not None and r54_point is not None:
    if finite_number(r53_point.get('y')) and finite_number(r54_point.get('y')):
        expect(
            abs(float(r53_point['y']) - float(r54_point['y'])) < 0.001,
            'r53 and r54 must share the same alliance row',
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

print('OK: effective family and layout are structurally valid, Judith, Marc/Laura, Bruna and Roc corrections are preserved, editable coordinates are accepted, and r53/r54 remain aligned')
