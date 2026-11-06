import Link from 'next/link'
import {stegaClean} from 'next-sanity'
import {sanityFetch, FRAMEWORK, UI, label, type Lang, type State} from '@/lib/sanity'
import {Header} from './Header'

type Unit = {
  title: string
  subject: string
  grade: number
  lessons: {title: string; slug: string; objective: string; minutes: number; standards: string[]}[]
}

const UNIT_QUERY = `*[_type == "unit" && _id == $id][0]{
  "title": coalesce(title[$lang], title.en),
  subject,
  grade,
  "lessons": lessons[]->{
    "title": coalesce(title[$lang], title.en),
    "slug": slug.current,
    "objective": coalesce(
      stateEditions[state == $state][0].objective[$lang],
      objective[$lang],
      objective.en
    ),
    "minutes": math::sum(activities[].minutes),
    "standards": standards[@->framework == $fw]->code
  }
}`

// Shared by the featured unit (/) and every catalog unit (/units/[id]).
export async function UnitView({id, path, state, lang}: {id: string; path: string; state: State; lang: Lang}) {
  const unit = await sanityFetch<Unit | null>(UNIT_QUERY, {id, state, lang, fw: FRAMEWORK[state]})
  const t = UI[lang]

  if (!unit) return <main><p>Unit not found. Run <code>npm run seed</code> in the Studio folder.</p></main>

  return (
    <main lang={lang}>
      <Header path={path} state={state} lang={lang} />
      <p className="eyebrow">
        {label(lang, stegaClean(unit.subject))} · {t.grade} {stegaClean(unit.grade) === 0 ? 'K' : unit.grade} · {t.edition(state)}
      </p>
      <h1>{unit.title}</h1>

      <h2>{t.lessons}</h2>
      <ol className="lessons">
        {unit.lessons.map((l) => (
          <li key={stegaClean(l.slug)}>
            <Link href={`/lessons/${stegaClean(l.slug)}?state=${state}&lang=${lang}`}>{l.title}</Link>
            <p>{l.objective}</p>
            <p className="meta">
              {l.minutes} {t.minutes}
              {l.standards.length === 0 && <span className="chip chip-warn">{t.noAlignment(state)}</span>}
              {l.standards.map((code) => (
                <span key={code} className="chip">
                  {FRAMEWORK[state]} {code}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ol>
    </main>
  )
}
