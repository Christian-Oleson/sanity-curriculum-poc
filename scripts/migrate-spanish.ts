// One-off migration: plain-English teacher notes and standard descriptions -> {en, es} objects.
// Run: npx sanity exec scripts/migrate-spanish.ts --with-user-token   (add -- --dry to preview)
//
// Safe to re-run: only touches fields that are still plain strings, and only attaches a Spanish
// translation if the English still matches the text it was translated from.
// NOTE: these translations are drafts for the test. Real curriculum needs a qualified translator,
// and standards should use the state's official Spanish wording where one exists (e.g. TEA's Spanish TEKS).
import process from 'node:process'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19', useCdn: false, perspective: 'raw'})
const dryRun = process.argv.includes('--dry')

const STANDARD_ES: Record<string, {en: string; es: string}> = {
  'std-teks-5-3h': {
    en: 'Represent and solve addition and subtraction of fractions with unequal denominators using objects and pictorial models. (revised 2026)',
    es: 'Representar y resolver sumas y restas de fracciones con denominadores diferentes usando objetos y modelos pictóricos. (revisado 2026)',
  },
  'std-teks-5-3k': {
    en: 'Add and subtract positive rational numbers fluently.',
    es: 'Sumar y restar números racionales positivos con fluidez.',
  },
  'std-best-5-fr-2-1': {
    en: 'Add and subtract fractions with unlike denominators, including mixed numbers and fractions greater than 1.',
    es: 'Sumar y restar fracciones con denominadores diferentes, incluidos números mixtos y fracciones mayores que 1.',
  },
  'std-ccss-5-nf-a-1': {
    en: 'Add and subtract fractions with unlike denominators by replacing given fractions with equivalent fractions.',
    es: 'Sumar y restar fracciones con denominadores diferentes reemplazando las fracciones dadas por fracciones equivalentes.',
  },
}

// Teacher-facing, so formal "usted".
const NOTE_ES: Record<string, {en: string; es: string}> = {
  'lesson-adding-unlike/k32': {
    en: 'STAAR emphasizes pictorial models. Keep the area-model visuals on screen. NEW for 2027 TEKS: add a number-line model. Live preview works!',
    es: 'STAAR da prioridad a los modelos pictóricos. Mantenga los modelos de área visibles en pantalla. NUEVO para los TEKS 2027: agregue un modelo de recta numérica. ¡La vista previa en vivo funciona!',
  },
  'lesson-adding-unlike/k33': {
    en: 'B.E.S.T. includes mixed numbers here. Add one mixed-number example to the exit ticket.',
    es: 'B.E.S.T. incluye números mixtos en esta lección. Agregue un ejemplo con números mixtos al boleto de salida.',
  },
}

type Doc = {_id: string; _rev: string}
const toLocalized = (en: string, known?: {en: string; es: string}) => {
  if (known && known.en === en) return {value: {_type: 'localizedText', en, es: known.es}, translated: true}
  return {value: {_type: 'localizedText', en}, translated: false} // Studio will warn "Spanish translation missing"
}

async function main() {
  // Published docs and any drafts (the same shape change applies to both).
  const standards = await client.fetch<(Doc & {description: unknown})[]>(
    `*[_type == "standard" && defined(description)]{_id, _rev, description}`,
  )
  const lessons = await client.fetch<(Doc & {stateEditions?: {_key: string; teacherNote?: unknown}[]})[]>(
    `*[_type == "lesson" && defined(stateEditions)]{_id, _rev, stateEditions[]{_key, teacherNote}}`,
  )

  const tx = client.transaction()
  const report: string[] = []

  for (const s of standards) {
    if (typeof s.description !== 'string') continue // already migrated
    const baseId = s._id.replace(/^drafts\./, '')
    const {value, translated} = toLocalized(s.description, STANDARD_ES[baseId])
    tx.patch(s._id, (p) => p.ifRevisionId(s._rev).set({description: value}))
    report.push(`${s._id}.description -> ${translated ? 'en + es' : 'en only (English changed, needs translation)'}`)
  }

  for (const l of lessons) {
    const baseId = l._id.replace(/^drafts\./, '')
    const sets: Record<string, unknown> = {}
    for (const ed of l.stateEditions ?? []) {
      if (typeof ed.teacherNote !== 'string') continue
      const {value, translated} = toLocalized(ed.teacherNote, NOTE_ES[`${baseId}/${ed._key}`])
      sets[`stateEditions[_key=="${ed._key}"].teacherNote`] = value
      report.push(`${l._id} edition ${ed._key} teacherNote -> ${translated ? 'en + es' : 'en only (English changed, needs translation)'}`)
    }
    if (Object.keys(sets).length) tx.patch(l._id, (p) => p.ifRevisionId(l._rev).set(sets))
  }

  console.log(report.length ? report.join('\n') : 'Nothing to migrate (already done).')
  if (!report.length) return
  if (dryRun) return console.log('\n--dry: no changes written')
  const res = await tx.commit({visibility: 'sync'})
  console.log(`\nCommitted transaction ${res.transactionId} (${res.documentIds.length} documents)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
