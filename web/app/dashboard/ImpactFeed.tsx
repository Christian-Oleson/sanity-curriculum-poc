import {sanityQueryWithTiming, STUDIO_EDIT_URL} from '@/lib/sanity'

type Report = {
  _id: string
  standardLabel: string
  status: string
  changedAt: string
  changedBy?: string
  needsSpanishReview?: boolean
  affectedUnitCount?: number
  changes: {field: string; before: string; after: string}[]
  lessons: {_id: string; title: string}[]
}

const QUERY = `*[_type == "impactReport"] | order(changedAt desc)[0...5]{
  _id, standardLabel, status, changedAt, changedBy, needsSpanishReview, affectedUnitCount,
  changes[]{field, before, after},
  "lessons": affectedLessons[]->{_id, "title": title.en}
}`

// Latest standard-change impact reports, written by scripts/impact-watcher.ts.
export async function ImpactFeed() {
  const {result: reports} = await sanityQueryWithTiming<Report[]>(QUERY, {})
  return (
    <section>
      <h2>Standard changes &amp; impact <span className="count">{reports.length}</span></h2>
      {reports.length === 0 ? (
        <p className="meta">No standard changes yet. Run <code>npm run watch:impact</code>, then edit a standard in the Studio.</p>
      ) : (
        <ul className="impact-list">
          {reports.map((r) => (
            <li key={r._id} className={`impact impact-${r.status.replace(' ', '-')}`}>
              <div className="impact-head">
                <strong>{r.standardLabel}</strong> changed → <strong>{r.lessons.length}</strong> lesson(s) in{' '}
                {r.affectedUnitCount ?? 0} unit(s)
                <span className={`pill pill-${r.status.replace(' ', '-')}`}>{r.status}</span>
                {r.needsSpanishReview && <span className="pill pill-warn">! Spanish may be stale</span>}
              </div>
              <div className="meta">{new Date(r.changedAt).toLocaleString('en-US')}</div>
              {r.changes.map((c) => (
                <div key={c.field} className="change">
                  <span className="meta">{c.field}</span>
                  <del>{c.before || '(empty)'}</del>
                  <ins>{c.after || '(empty)'}</ins>
                </div>
              ))}
              <div className="meta">Affected: {r.lessons.slice(0, 6).map((l) => l.title).join(' · ')}{r.lessons.length > 6 ? ` · +${r.lessons.length - 6} more` : ''}</div>
              <a className="fix" href={STUDIO_EDIT_URL(r._id, 'impactReport')} target="_blank" rel="noreferrer">Triage in Studio ↗</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
