// Generates seed.ndjson for `sanity dataset import`.
import {writeFileSync} from 'node:fs'

let k = 0
const key = () => `k${++k}`
const block = (text) => [{_type: 'block', _key: key(), style: 'normal', markDefs: [],
  children: [{_type: 'span', _key: key(), text, marks: []}]}]
const ref = (id) => ({_type: 'reference', _ref: id, _key: key()})
const loc = (en, es) => ({_type: 'localizedString', en, es})
const txt = (en, es) => ({_type: 'localizedText', en, es})
const act = (en, es, kind, minutes, insEn, insEs) => ({_type: 'activity', _key: key(),
  title: loc(en, es), kind, minutes,
  instructions: {_type: 'localizedBlock', en: block(insEn), es: block(insEs)}})

const docs = [
  {_id: 'std-teks-5-3h', _type: 'standard', framework: 'TEKS', code: '5.3H', grade: 5,
   description: txt('Represent and solve addition and subtraction of fractions with unequal denominators using objects and pictorial models.', 'Representar y resolver sumas y restas de fracciones con denominadores diferentes usando objetos y modelos pictóricos.')},
  {_id: 'std-teks-5-3k', _type: 'standard', framework: 'TEKS', code: '5.3K', grade: 5,
   description: txt('Add and subtract positive rational numbers fluently.', 'Sumar y restar números racionales positivos con fluidez.')},
  {_id: 'std-best-5-fr-2-1', _type: 'standard', framework: 'BEST', code: 'MA.5.FR.2.1', grade: 5,
   description: txt('Add and subtract fractions with unlike denominators, including mixed numbers and fractions greater than 1.', 'Sumar y restar fracciones con denominadores diferentes, incluidos números mixtos y fracciones mayores que 1.')},
  {_id: 'std-ccss-5-nf-a-1', _type: 'standard', framework: 'CCSS', code: '5.NF.A.1', grade: 5,
   description: txt('Add and subtract fractions with unlike denominators by replacing given fractions with equivalent fractions.', 'Sumar y restar fracciones con denominadores diferentes reemplazando las fracciones dadas por fracciones equivalentes.')},

  {_id: 'lesson-equivalent-fractions', _type: 'lesson',
   title: loc('Finding Equivalent Fractions', 'Encontrar fracciones equivalentes'),
   slug: {_type: 'slug', current: 'finding-equivalent-fractions'},
   objective: loc('Students generate equivalent fractions using area models.', 'Los estudiantes generan fracciones equivalentes usando modelos de área.'),
   activities: [
     act('Fraction Strip Warm-Up', 'Calentamiento con tiras de fracciones', 'warm-up', 5,
       'Fold paper strips into halves, fourths, and eighths. Which strips line up?',
       'Doblen tiras de papel en mitades, cuartos y octavos. ¿Qué tiras coinciden?'),
     act('Area Model Practice', 'Práctica con modelos de área', 'guided practice', 15,
       'Shade 2/3 of a rectangle, then split each part in half. What fraction is shaded now?',
       'Sombreen 2/3 de un rectángulo y luego dividan cada parte a la mitad. ¿Qué fracción está sombreada ahora?'),
   ],
   standards: [ref('std-teks-5-3h'), ref('std-ccss-5-nf-a-1')],
  },

  {_id: 'lesson-adding-unlike', _type: 'lesson',
   title: loc('Adding Fractions with Unlike Denominators', 'Sumar fracciones con denominadores diferentes'),
   slug: {_type: 'slug', current: 'adding-fractions-unlike-denominators'},
   objective: loc('Students add fractions with unlike denominators by finding a common denominator.', 'Los estudiantes suman fracciones con denominadores diferentes encontrando un denominador común.'),
   activities: [
     act('Pizza Problem', 'El problema de la pizza', 'warm-up', 5,
       'Maya ate 1/3 of a pizza and Leo ate 1/4. How much did they eat together?',
       'Maya comió 1/3 de una pizza y Leo comió 1/4. ¿Cuánto comieron juntos?'),
     act('Common Denominator Steps', 'Pasos del denominador común', 'direct instruction', 10,
       'Model rewriting 1/3 + 1/4 as 4/12 + 3/12.',
       'Modelen cómo reescribir 1/3 + 1/4 como 4/12 + 3/12.'),
     act('Exit Ticket', 'Boleto de salida', 'check for understanding', 5,
       'Solve 2/5 + 1/2 and explain your common denominator.',
       'Resuelvan 2/5 + 1/2 y expliquen su denominador común.'),
   ],
   standards: [ref('std-teks-5-3h'), ref('std-teks-5-3k'), ref('std-best-5-fr-2-1'), ref('std-ccss-5-nf-a-1')],
   stateEditions: [
     {_type: 'stateEdition', _key: key(), state: 'TX',
      objective: loc('Students represent and solve fraction addition with unequal denominators using pictorial models (TEKS 5.3H).',
                     'Los estudiantes representan y resuelven sumas de fracciones con denominadores diferentes usando modelos pictóricos (TEKS 5.3H).'),
      teacherNote: txt('STAAR emphasizes pictorial models. Keep the area-model visuals on screen.', 'STAAR da prioridad a los modelos pictóricos. Mantenga los modelos de área visibles en pantalla.')},
     {_type: 'stateEdition', _key: key(), state: 'FL',
      teacherNote: txt('B.E.S.T. includes mixed numbers here. Add one mixed-number example to the exit ticket.', 'B.E.S.T. incluye números mixtos en esta lección. Agregue un ejemplo con números mixtos al boleto de salida.')},
   ],
  },

  {_id: 'unit-g5-fractions', _type: 'unit',
   title: loc('Unit 3: Adding and Subtracting Fractions', 'Unidad 3: Sumar y restar fracciones'),
   subject: 'Math', grade: 5,
   lessons: [ref('lesson-equivalent-fractions'), ref('lesson-adding-unlike')]},
]

writeFileSync(new URL('./seed.ndjson', import.meta.url), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`Wrote ${docs.length} documents`)
