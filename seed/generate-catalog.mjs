// Generates a synthetic K-5 math catalog for scale testing and the coverage dashboard.
//   node seed/generate-catalog.mjs  ->  seed/catalog.ndjson
//   npx sanity dataset import seed/catalog.ndjson production --replace
// Remove later with:  npm run catalog:remove
//
// Everything is deterministic (seeded RNG) and uses a `gen-` id prefix.
// Standard CODES follow each framework's real format; DESCRIPTIONS are marked [Synthetic].
// Deliberate gaps are injected so the dashboard has real findings:
//   - some standards are never taught (coverage gaps)
//   - some lessons have no Florida (B.E.S.T.) alignment
//   - some Spanish fields are missing
import {writeFileSync} from 'node:fs'

// --- deterministic RNG (mulberry32) ---
let seed = 20261105
const rand = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const chance = (p) => rand() < p

let k = 0
const key = () => `g${(++k).toString(36)}`
const ref = (id) => ({_type: 'reference', _ref: id, _key: key()})
const loc = (en, es) => (es ? {_type: 'localizedString', en, es} : {_type: 'localizedString', en})
const txt = (en, es) => (es ? {_type: 'localizedText', en, es} : {_type: 'localizedText', en})
const block = (text) => [{_type: 'block', _key: key(), style: 'normal', markDefs: [],
  children: [{_type: 'span', _key: key(), text, marks: []}]}]

const GRADES = [0, 1, 2, 3, 4, 5]
const gradeLabel = (g) => (g === 0 ? 'K' : String(g))
const TOPICS = [
  ['Counting & Cardinality', 'Conteo y cardinalidad', 'CC', 'NSO'],
  ['Place Value', 'Valor posicional', 'NBT', 'NSO'],
  ['Addition & Subtraction', 'Suma y resta', 'OA', 'AR'],
  ['Multiplication', 'Multiplicación', 'OA', 'AR'],
  ['Division', 'División', 'OA', 'AR'],
  ['Fractions', 'Fracciones', 'NF', 'FR'],
  ['Decimals', 'Decimales', 'NBT', 'NSO'],
  ['Measurement', 'Medición', 'MD', 'M'],
  ['Geometry', 'Geometría', 'G', 'GR'],
  ['Data & Graphs', 'Datos y gráficas', 'MD', 'DP'],
]
const LETTERS = 'ABCDEFGHIJKL'

const docs = []
const standardIds = {} // [grade][framework][topic] -> [id, id]

// --- standards: 2 per topic per framework per grade ---
for (const g of GRADES) {
  standardIds[g] = {TEKS: [], BEST: [], CCSS: []}
  TOPICS.forEach(([topicEn, topicEs, ccssDomain, bestDomain], t) => {
    for (const fw of ['TEKS', 'BEST', 'CCSS']) {
      const pair = []
      for (let i = 0; i < 2; i++) {
        const code =
          fw === 'TEKS' ? `${gradeLabel(g)}.${t + 2}${LETTERS[i]}`
          : fw === 'BEST' ? `MA.${gradeLabel(g)}.${bestDomain}.${t + 1}.${i + 1}`
          : `${gradeLabel(g)}.${ccssDomain}.${LETTERS[Math.floor(t / 4)]}.${t * 2 + i + 1}`
        const id = `gen-std-${fw.toLowerCase()}-${gradeLabel(g)}-${t}-${i}`.toLowerCase()
        docs.push({
          _id: id, _type: 'standard', framework: fw, code, grade: g,
          description: txt(
            `[Synthetic] Grade ${gradeLabel(g)} ${topicEn}: ${i === 0 ? 'understand core concepts' : 'apply to multi-step problems'}.`,
            `[Sintético] Grado ${gradeLabel(g)} ${topicEs}: ${i === 0 ? 'comprender los conceptos básicos' : 'aplicar a problemas de varios pasos'}.`,
          ),
        })
        pair.push(id)
      }
      standardIds[g][fw][t] = pair
    }
  })
}

// --- units + lessons: 10 units per grade x 10 lessons ---
const stats = {lessons: 0, noFL: 0, missingEsObjective: 0, missingEsActivity: 0, uncoveredPairs: 0}
for (const g of GRADES) {
  TOPICS.forEach(([topicEn, topicEs], t) => {
    // ~8% of (grade, topic, framework) combos never teach their 2nd standard -> coverage gap
    const skipSecond = {TEKS: chance(0.08), BEST: chance(0.08), CCSS: chance(0.08)}
    stats.uncoveredPairs += Object.values(skipSecond).filter(Boolean).length
    const unitId = `gen-unit-g${gradeLabel(g)}-u${String(t + 1).padStart(2, '0')}`.toLowerCase()
    const lessonIds = []

    for (let n = 1; n <= 10; n++) {
      const id = `${unitId.replace('gen-unit', 'gen-lesson')}-l${String(n).padStart(2, '0')}`
      const advanced = n > 5
      const standards = []
      for (const fw of ['TEKS', 'BEST', 'CCSS']) {
        if (fw === 'BEST' && chance(0.05)) continue // lesson missing Florida alignment
        const [a, b] = standardIds[g][fw][t]
        standards.push(ref(a))
        if (advanced && !skipSecond[fw]) standards.push(ref(b))
      }
      if (!standards.some((s) => s._ref.includes('-best-'))) stats.noFL++

      const esObjective = !chance(0.07)
      if (!esObjective) stats.missingEsObjective++
      const activities = [
        ['Warm-Up', 'Calentamiento', 'warm-up', 5],
        ['Guided Practice', 'Práctica guiada', 'guided practice', 15],
        ['Exit Ticket', 'Boleto de salida', 'check for understanding', 5],
      ].map(([en, es, kind, minutes]) => {
        const esIns = !chance(0.04)
        if (!esIns) stats.missingEsActivity++
        return {
          _type: 'activity', _key: key(), title: loc(en, es), kind, minutes,
          instructions: {
            _type: 'localizedBlock',
            en: block(`${en}: ${topicEn.toLowerCase()} practice, part ${n}.`),
            ...(esIns ? {es: block(`${es}: práctica de ${topicEs.toLowerCase()}, parte ${n}.`)} : {}),
          },
        }
      })

      const lesson = {
        _id: id, _type: 'lesson',
        title: loc(`${topicEn} ${n}: ${advanced ? 'Problem Solving' : 'Foundations'}`,
                   `${topicEs} ${n}: ${advanced ? 'Resolución de problemas' : 'Fundamentos'}`),
        slug: {_type: 'slug', current: `g${gradeLabel(g)}-${topicEn.toLowerCase().replace(/[^a-z]+/g, '-')}-${n}`.toLowerCase()},
        objective: loc(
          `Students ${advanced ? 'solve multi-step problems involving' : 'build understanding of'} ${topicEn.toLowerCase()}.`,
          esObjective ? `Los estudiantes ${advanced ? 'resuelven problemas de varios pasos sobre' : 'desarrollan la comprensión de'} ${topicEs.toLowerCase()}.` : undefined,
        ),
        activities,
        standards,
      }
      if (chance(0.15)) {
        lesson.stateEditions = [{
          _type: 'stateEdition', _key: key(), state: 'TX',
          teacherNote: txt('STAAR item types: include one griddable response.', 'Tipos de preguntas STAAR: incluya una respuesta de cuadrícula.'),
        }]
      }
      docs.push(lesson)
      lessonIds.push(id)
      stats.lessons++
    }

    docs.push({
      _id: unitId, _type: 'unit', subject: 'Math', grade: g,
      title: loc(`Grade ${gradeLabel(g)} Unit ${t + 1}: ${topicEn}`, `Grado ${gradeLabel(g)} Unidad ${t + 1}: ${topicEs}`),
      lessons: lessonIds.map(ref),
    })
  })
}

writeFileSync(new URL('./catalog.ndjson', import.meta.url), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
const count = (t) => docs.filter((d) => d._type === t).length
console.log(`Wrote ${docs.length} documents: ${count('standard')} standards, ${count('unit')} units, ${count('lesson')} lessons`)
console.log(`Injected gaps: ${stats.uncoveredPairs} never-taught standards, ${stats.noFL} lessons without FL alignment, ` +
  `${stats.missingEsObjective} lessons missing ES objective, ${stats.missingEsActivity} activities missing ES instructions`)
