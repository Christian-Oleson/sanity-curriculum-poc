// Watches published standards and, when one changes, files an impactReport listing every affected lesson.
// Run: npm run watch:impact   (keeps running; Ctrl+C to stop)
//
// Locally this uses the real-time listener API. In production the same logic would be triggered by a
// GROQ-powered webhook or a Sanity Function on document update, filter:
//   _type == "standard" && delta::changedAny((code, description))
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19', useCdn: false})

type Standard = {
  _id: string
  _rev: string
  framework?: string
  code?: string
  grade?: number
  description?: {en?: string; es?: string} | string
}

const text = (d: Standard['description'], lang: 'en' | 'es') =>
  typeof d === 'string' ? (lang === 'en' ? d : undefined) : d?.[lang]

function diff(prev: Standard, next: Standard) {
  const fields: [string, unknown, unknown][] = [
    ['code', prev.code, next.code],
    ['framework', prev.framework, next.framework],
    ['grade', prev.grade, next.grade],
    ['description (English)', text(prev.description, 'en'), text(next.description, 'en')],
    ['description (Spanish)', text(prev.description, 'es'), text(next.description, 'es')],
  ]
  return fields
    .filter(([, a, b]) => (a ?? '') !== (b ?? ''))
    .map(([field, before, after]) => ({field, before: String(before ?? ''), after: String(after ?? '')}))
}

async function fileReport(prev: Standard, next: Standard, identity?: string) {
  const changes = diff(prev, next)
  if (!changes.length) return

  const affected = await client.fetch<{_id: string; title: string; unitIds: string[]}[]>(
    `*[_type == "lesson" && references($id)]{_id, "title": title.en, "unitIds": *[_type == "unit" && references(^._id)]._id}`,
    {id: next._id},
  )
  const label = `${next.framework} ${next.code}`
  const enChanged = changes.some((c) => c.field === 'description (English)')
  const esChanged = changes.some((c) => c.field === 'description (Spanish)')

  const report = await client.create({
    _type: 'impactReport',
    status: 'open',
    standard: {_type: 'reference', _ref: next._id},
    standardLabel: label,
    changedAt: new Date().toISOString(),
    changedBy: identity ?? 'unknown',
    changes: changes.map((c, i) => ({_type: 'fieldChange', _key: `c${i}`, ...c})),
    affectedLessons: affected.map((l, i) => ({_type: 'reference', _ref: l._id, _key: `l${i}`})),
    affectedUnitCount: new Set(affected.flatMap((l) => l.unitIds)).size, // distinct units, not per-lesson sum
    needsSpanishReview: enChanged && !esChanged,
  })

  console.log(`\n⚠  ${label} changed (${changes.map((c) => c.field).join(', ')})`)
  for (const c of changes) console.log(`   ${c.field}:\n     before: ${c.before}\n     after:  ${c.after}`)
  console.log(`   → ${affected.length} lesson(s) affected:`)
  for (const l of affected.slice(0, 10)) console.log(`     - ${l.title}`)
  if (affected.length > 10) console.log(`     … and ${affected.length - 10} more`)
  if (enChanged && !esChanged) console.log('   → Spanish translation may now be stale')
  console.log(`   Filed ${report._id}`)
}

console.log('Watching published standards for changes… (Ctrl+C to stop)')
// The server closes long-lived listener connections periodically. Without handling `complete`,
// the subscription just ends and the process exits silently, so reconnect on close and on error.
const RECONNECT_MS = 2000
function listen() {
  client
    .listen<Standard>(
      '*[_type == "standard" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]',
      {},
      {includeResult: true, includePreviousRevision: true, visibility: 'query', events: ['welcome', 'mutation']},
    )
    .subscribe({
      next: (event) => {
        if (event.type === 'welcome') return console.log(`Connected. (${new Date().toLocaleTimeString()})`)
        if (event.type !== 'mutation' || !event.previous || !event.result) return
        fileReport(event.previous as Standard, event.result as Standard, event.identity).catch((err) =>
          console.error('Failed to file report:', err.message),
        )
      },
      error: (err) => {
        console.error(`Listener error, reconnecting in ${RECONNECT_MS / 1000}s:`, err.message ?? err)
        setTimeout(listen, RECONNECT_MS)
      },
      complete: () => {
        console.log(`Connection closed by server, reconnecting in ${RECONNECT_MS / 1000}s…`)
        setTimeout(listen, RECONNECT_MS)
      },
    })
}
listen()
