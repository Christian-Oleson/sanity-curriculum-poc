import Link from 'next/link'
import {sanityQueryWithTiming, readEdition, FRAMEWORK, STATES, STUDIO_EDIT_URL, type State} from '@/lib/sanity'
import {Header} from '../Header'
import {ImpactFeed} from './ImpactFeed'

export const instant = false

// ---------------------------------------------------------------------------------------------
// Queries. Each runs server-side against the Content Lake; the page shows their reported timings.
// ---------------------------------------------------------------------------------------------

// Every standard with how many lessons reference it (a join: one sub-query per standard).
const COVERAGE_QUERY = `*[_type == "standard"]{
  _id, framework, code, grade,
  "description": coalesce(description.en, description),
  "lessons": count(*[_type == "lesson" && references(^._id)])
}`

// Lessons with no standard from the given framework.
const UNALIGNED_QUERY = `*[_type == "lesson" && count(standards[@->framework == $fw]) == 0]{
  _id,
  "title": title.en,
  "slug": slug.current,
  "unit": *[_type == "unit" && references(^._id)][0]{_id, "title": title.en, grade}
} | order(unit.grade asc, title asc)`

// Every place a lesson or standard has English but no Spanish, listed per document.
const SPANISH_QUERY = `{
  "lessons": *[_type == "lesson"]{
    _id,
    "title": title.en,
    "slug": slug.current,
    "unit": *[_type == "unit" && references(^._id)][0]{"title": title.en, grade},
    "fields": 2 + count(activities) + count(stateEditions[defined(teacherNote.en)]),
    "gaps": [
      ...select(defined(title.es) => [], ["title"]),
      ...select(defined(objective.es) => [], ["objective"]),
      ...activities[count(coalesce(instructions.es, [])) == 0]{"l": "activity: " + title.en}.l,
      ...stateEditions[defined(teacherNote.en) && !defined(teacherNote.es)]{"l": "teacher note (" + state + ")"}.l
    ]
  },
  "standards": *[_type == "standard"]{_id, code, framework, "missing": !defined(description.es)}
}`

type StandardRow = {_id: string; framework: string; code: string; grade: number; description: string; lessons: number}
type LessonRef = {_id: string; title: string; slug: string; unit: {_id: string; title: string; grade: number} | null}
type SpanishRow = {_id: string; title: string; slug: string; unit: {title: string; grade: number} | null; fields: number; gaps: string[]}

const GRADES = [0, 1, 2, 3, 4, 5]
const gradeLabel = (g: number) => (g === 0 ? 'K' : String(g))
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10)

// Sequential blue ramp (light -> dark) for coverage. Domain 80%..100%: below 80% clamps to the lightest step.
const RAMP = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95']
const rampIndex = (p: number) => Math.min(RAMP.length - 1, Math.max(0, Math.floor(((p - 80) / 20) * RAMP.length)))

export default async function DashboardPage({searchParams}: {searchParams: Promise<{state?: string; lang?: string}>}) {
  const {state, lang} = readEdition(await searchParams)
  const fw = FRAMEWORK[state]

  const started = Date.now()
  const [coverage, unaligned, spanish] = await Promise.all([
    sanityQueryWithTiming<StandardRow[]>(COVERAGE_QUERY, {}),
    sanityQueryWithTiming<LessonRef[]>(UNALIGNED_QUERY, {fw}),
    sanityQueryWithTiming<{lessons: SpanishRow[]; standards: {_id: string; code: string; framework: string; missing: boolean}[]}>(SPANISH_QUERY, {}),
  ])
  const wallMs = Date.now() - started

  const standards = coverage.result
  const lessons = spanish.result.lessons

  // Coverage grid: grade x state -> % of that state's standards taught by >= 1 lesson.
  const cell = (g: number, s: State) => {
    const set = standards.filter((x) => x.grade === g && x.framework === FRAMEWORK[s])
    const covered = set.filter((x) => x.lessons > 0).length
    return {total: set.length, covered, pct: pct(covered, set.length)}
  }
  const stateTotals = (s: State) => {
    const set = standards.filter((x) => x.framework === FRAMEWORK[s])
    return pct(set.filter((x) => x.lessons > 0).length, set.length)
  }

  const neverTaught = standards
    .filter((x) => x.framework === fw && x.lessons === 0)
    .sort((a, b) => a.grade - b.grade || a.code.localeCompare(b.code))

  const totalFields = lessons.reduce((n, l) => n + l.fields, 0) + spanish.result.standards.length
  const missingFields = lessons.reduce((n, l) => n + l.gaps.length, 0) + spanish.result.standards.filter((s) => s.missing).length
  const spanishPct = pct(totalFields - missingFields, totalFields)
  const lessonsWithGaps = lessons
    .filter((l) => l.gaps.length > 0)
    .sort((a, b) => b.gaps.length - a.gaps.length || (a.unit?.grade ?? 0) - (b.unit?.grade ?? 0))

  const lessonHref = (slug: string, l = lang) => `/lessons/${slug}?state=${state}&lang=${l}`

  return (
    <main className="wide" lang="en">
      <Header path="/dashboard" state={state} lang={lang} />
      <p className="eyebrow">Curriculum health · live from the Content Lake</p>
      <h1>Alignment &amp; translation dashboard</h1>

      {/* --- stat tiles --- */}
      <section className="tiles" aria-label="Summary">
        <Tile value={lessons.length.toLocaleString()} label="Lessons" />
        <Tile value={standards.length.toLocaleString()} label="Standards (TEKS · B.E.S.T. · CCSS)" />
        <Tile value={`${stateTotals(state)}%`} label={`${state} standards taught`} status={neverTaught.length ? 'warning' : 'good'}
          note={neverTaught.length ? `${neverTaught.length} never taught` : 'Full coverage'} />
        <Tile value={unaligned.result.length.toString()} label={`Lessons with no ${state} alignment`}
          status={unaligned.result.length ? 'serious' : 'good'} note={unaligned.result.length ? 'Needs alignment' : 'All aligned'} />
        <Tile value={`${spanishPct}%`} label="Spanish completeness" status={missingFields ? 'warning' : 'good'}
          note={`${missingFields} fields missing`} />
      </section>

      {/* --- coverage heatmap (an HTML table, so it is also the accessible table view) --- */}
      <section>
        <h2>Standards coverage by grade and state</h2>
        <p className="meta">Share of each state&apos;s standards that at least one lesson teaches. Hover a cell for counts.</p>
        <table className="heatmap">
          <thead>
            <tr>
              <th scope="col">Grade</th>
              {STATES.map((s) => (
                <th scope="col" key={s}>
                  <Link href={`/dashboard?state=${s}&lang=${lang}`} aria-current={s === state ? 'true' : undefined}>
                    {s} <span className="meta">({FRAMEWORK[s]})</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRADES.map((g) => (
              <tr key={g}>
                <th scope="row">{gradeLabel(g)}</th>
                {STATES.map((s) => {
                  const c = cell(g, s)
                  const i = rampIndex(c.pct)
                  return (
                    <td key={s} style={{background: RAMP[i]}} className={i >= 3 ? 'on-dark' : undefined}
                      title={`Grade ${gradeLabel(g)} · ${s}: ${c.covered} of ${c.total} standards taught`}>
                      {c.pct}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ramp-legend" aria-hidden="true">
          <span>≤80%</span>
          {RAMP.map((c) => <i key={c} style={{background: c}} />)}
          <span>100%</span>
        </div>
      </section>

      <ImpactFeed />

      <div className="columns">
        {/* --- never-taught standards --- */}
        <section>
          <h2>{state} standards never taught <span className="count">{neverTaught.length}</span></h2>
          {neverTaught.length === 0 ? <p className="meta">None, every {fw} standard has a lesson.</p> : (
            <ul className="gap-list">
              {neverTaught.map((s) => (
                <li key={s._id}>
                  <span className="chip">{s.framework} {s.code}</span> <span className="meta">Grade {gradeLabel(s.grade)}</span>
                  <div>{s.description}</div>
                  <a className="fix" href={STUDIO_EDIT_URL(s._id, 'standard')} target="_blank" rel="noreferrer">Open in Studio ↗</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --- lessons without this state's alignment --- */}
        <section>
          <h2>Lessons with no {state} alignment <span className="count">{unaligned.result.length}</span></h2>
          {unaligned.result.length === 0 ? <p className="meta">None.</p> : (
            <ul className="gap-list">
              {unaligned.result.map((l) => (
                <li key={l._id}>
                  <Link href={lessonHref(l.slug)}>{l.title}</Link>
                  <div className="meta">{l.unit?.title ?? 'Not in a unit'}</div>
                  <a className="fix" href={STUDIO_EDIT_URL(l._id, 'lesson')} target="_blank" rel="noreferrer">Fix in Studio ↗</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* --- Spanish gaps --- */}
      <section>
        <h2>Lessons missing Spanish <span className="count">{lessonsWithGaps.length}</span></h2>
        <table className="data-table">
          <thead>
            <tr><th scope="col">Lesson</th><th scope="col">Unit</th><th scope="col">Missing in Spanish</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {lessonsWithGaps.slice(0, 25).map((l) => (
              <tr key={l._id}>
                <td><Link href={lessonHref(l.slug, 'es')}>{l.title}</Link></td>
                <td className="meta">{l.unit?.title ?? '-'}</td>
                <td>{l.gaps.join(', ')}</td>
                <td><a className="fix" href={STUDIO_EDIT_URL(l._id, 'lesson')} target="_blank" rel="noreferrer">Translate ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {lessonsWithGaps.length > 25 && <p className="meta">Showing 25 of {lessonsWithGaps.length}. Run <code>npm run audit</code> for the full list.</p>}
      </section>

      {/* --- performance footer (the scale test) --- */}
      <footer className="perf">
        <strong>Query performance</strong> · {standards.length + lessons.length} standards + lessons scanned ·
        coverage join {coverage.ms} ms · alignment {unaligned.ms} ms · Spanish audit {spanish.ms} ms (server time) ·
        {' '}{wallMs} ms total page fetch incl. network
      </footer>
    </main>
  )
}

function Tile({value, label, status, note}: {value: string; label: string; status?: 'good' | 'warning' | 'serious'; note?: string}) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
      {status && note && (
        <div className={`tile-status status-${status}`}>
          <span aria-hidden="true">{status === 'good' ? '✓' : '!'}</span> {note}
        </div>
      )}
    </div>
  )
}
