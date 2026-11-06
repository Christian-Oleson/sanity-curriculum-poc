// Lists every localized field that has English but no Spanish, across all curriculum documents.
// Run: npm run audit   (exits 1 if gaps are found, so it can gate CI or a publishing checklist)
//
// Generic: walks each document and flags any object shaped like {en, es?}, so new localized
// fields are covered automatically.
import process from 'node:process'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19', useCdn: false, perspective: 'published'})

type Gap = {doc: string; path: string; en: string}

const isEmpty = (v: unknown) =>
  v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

const preview = (v: unknown): string => {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.flatMap((b) => b?.children?.map((c: {text?: string}) => c.text) ?? []).join(' ')
  return JSON.stringify(v)
}

function walk(node: unknown, path: string, doc: string, gaps: Gap[]) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${item?._key ? `_key=="${item._key}"` : i}]`, doc, gaps))
    return
  }
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  if ('en' in obj && !isEmpty(obj.en) && isEmpty(obj.es)) {
    gaps.push({doc, path, en: preview(obj.en).slice(0, 70)})
    return
  }
  for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_')) walk(v, path ? `${path}.${k}` : k, doc, gaps)
}

async function main() {
  const docs = await client.fetch<Record<string, unknown>[]>(`*[_type in ["unit", "lesson", "standard"]]`)
  const gaps: Gap[] = []
  for (const d of docs) walk(d, '', `${d._type}:${d._id}`, gaps)

  console.log(`Checked ${docs.length} documents.`)
  if (!gaps.length) {
    console.log('No missing Spanish translations.')
    return
  }
  console.log(`${gaps.length} missing Spanish translation(s):`)
  for (const g of gaps) console.log(`  ${g.doc}  ${g.path}\n      en: "${g.en}"`)
  process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
