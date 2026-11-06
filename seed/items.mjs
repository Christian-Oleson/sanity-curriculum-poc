// Two hand-written check-for-understanding items for the featured fractions unit.
//   node seed/items.mjs && npx sanity dataset import seed/items.ndjson production --replace
import {writeFileSync} from 'node:fs'
let k = 0
const key = () => `i${++k}`
const s = (en, es) => ({_type: 'localizedString', en, es})
const t = (en, es) => ({_type: 'localizedText', en, es})
const choice = (en, es, correct = false) => ({_type: 'choice', _key: key(), text: s(en, es), correct})
const ref = (id) => ({_type: 'reference', _ref: id, _key: key()})
const docs = [
  {_id: 'item-add-unlike-1', _type: 'assessmentItem', identifier: {_type: 'slug', current: 'add-unlike-1'}, shuffle: true,
   prompt: t('Maya ate 1/3 of a pizza and Leo ate 1/4. How much of the pizza did they eat together?',
             'Maya comió 1/3 de una pizza y Leo comió 1/4. ¿Cuánto de la pizza comieron juntos?'),
   choices: [choice('7/12', '7/12', true), choice('2/7', '2/7'), choice('1/7', '1/7'), choice('5/12', '5/12')],
   lesson: {_type: 'reference', _ref: 'lesson-adding-unlike'},
   standards: [ref('std-teks-5-3h'), ref('std-best-5-fr-2-1'), ref('std-ccss-5-nf-a-1')]},
  {_id: 'item-equiv-1', _type: 'assessmentItem', identifier: {_type: 'slug', current: 'equiv-1'}, shuffle: true,
   prompt: t('Which fraction is equivalent to 2/3?', '¿Qué fracción es equivalente a 2/3?'),
   choices: [choice('4/6', '4/6', true), choice('3/4', '3/4'), choice('2/6', '2/6'), choice('5/6', '5/6')],
   lesson: {_type: 'reference', _ref: 'lesson-equivalent-fractions'},
   standards: [ref('std-teks-5-3h'), ref('std-ccss-5-nf-a-1')]},
]
writeFileSync(new URL('./items.ndjson', import.meta.url), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`Wrote ${docs.length} items`)
