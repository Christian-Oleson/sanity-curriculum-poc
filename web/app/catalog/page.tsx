import Link from 'next/link'
import {stegaClean} from 'next-sanity'
import {sanityFetch, readEdition, UI} from '@/lib/sanity'
import {Header} from '../Header'

export const instant = false

type UnitRow = {_id: string; grade: number; title: string; lessonCount: number}

const UNITS_QUERY = `*[_type == "unit"] | order(grade asc, _id asc){
  _id,
  grade,
  "title": coalesce(title[$lang], title.en),
  "lessonCount": count(lessons)
}`

export default async function CatalogPage({searchParams}: {searchParams: Promise<{state?: string; lang?: string}>}) {
  const {state, lang} = readEdition(await searchParams)
  const t = UI[lang]
  const units = await sanityFetch<UnitRow[]>(UNITS_QUERY, {lang})

  const byGrade = new Map<number, typeof units>()
  for (const u of units) {
    const g = stegaClean(u.grade)
    byGrade.set(g, [...(byGrade.get(g) ?? []), u])
  }
  const totalLessons = units.reduce((n, u) => n + u.lessonCount, 0)

  return (
    <main lang={lang}>
      <Header path="/catalog" state={state} lang={lang} />
      <h1>{t.nav.catalog}</h1>
      <p className="meta">
        {units.length} {t.units} · {totalLessons} {t.lessons.toLowerCase()}
      </p>
      {[...byGrade.entries()].map(([grade, list]) => (
        <section key={grade}>
          <h2>
            {t.grade} {grade === 0 ? 'K' : grade}
          </h2>
          <ul className="unit-grid">
            {list.map((u) => (
              <li key={u._id}>
                <Link href={`/units/${stegaClean(u._id)}?state=${state}&lang=${lang}`}>{u.title}</Link>
                <span className="meta">
                  {u.lessonCount} {t.lessons.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

