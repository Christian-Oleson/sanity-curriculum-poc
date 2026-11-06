import Link from 'next/link'
import {notFound} from 'next/navigation'
import type {PortableTextBlock} from '@portabletext/react'
import {RichText} from '../../RichText'
import {stegaClean} from 'next-sanity'
import {sanityFetch, readEdition, FRAMEWORK, UI, label} from '@/lib/sanity'
import {Header} from '../../Header'

// Always fetch fresh content so Studio edits appear on reload (no prerender).
export const instant = false

type Item = {id: string; prompt: string; choices: {text: string}[]}

type LessonView = {
  unitId: string | null
  items: Item[]
  title: string
  objective: string
  teacherNote: string | null
  standards: {code: string; description: string}[]
  activities: {key: string; title: string; kind: string; minutes: number; instructions: PortableTextBlock[] | null}[]
}

// One query resolves the whole edition: language fallback, state override, standards for that state's framework.
const LESSON_QUERY = `*[_type == "lesson" && slug.current == $slug][0]{
  "unitId": *[_type == "unit" && references(^._id)][0]._id,
  // Check-for-understanding items attached to this lesson (answers are not sent to the page).
  "items": *[_type == "assessmentItem" && lesson._ref == ^._id]{
    "id": identifier.current,
    "prompt": coalesce(prompt[$lang], prompt.en),
    "choices": choices[]{"text": coalesce(text[$lang], text.en)}
  },
  "title": coalesce(title[$lang], title.en),
  "objective": coalesce(
    stateEditions[state == $state][0].objective[$lang],
    objective[$lang],
    objective.en
  ),
  // Localized {en, es} objects; the trailing plain-field fallback keeps pre-migration string data working.
  "teacherNote": coalesce(
    stateEditions[state == $state][0].teacherNote[$lang],
    stateEditions[state == $state][0].teacherNote.en,
    stateEditions[state == $state][0].teacherNote
  ),
  "standards": standards[@->framework == $fw]->{
    code,
    "description": coalesce(description[$lang], description.en, description)
  },
  "activities": activities[]{
    "key": _key,
    "title": coalesce(title[$lang], title.en),
    kind,
    minutes,
    "instructions": coalesce(instructions[$lang], instructions.en)
  }
}`

// The featured demo unit lives at /, every other unit at /units/[id].
const unitHref = (id: string | null) => {
  const clean = id ? stegaClean(id) : null
  return !clean || clean === 'unit-g5-fractions' ? '/' : `/units/${clean}`
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{slug: string}>
  searchParams: Promise<{state?: string; lang?: string}>
}) {
  const {slug} = await params
  const {state, lang} = readEdition(await searchParams)
  const lesson = await sanityFetch<LessonView | null>(LESSON_QUERY, {slug, state, lang, fw: FRAMEWORK[state]})
  if (!lesson) notFound()
  const t = UI[lang]
  const total = lesson.activities.reduce((sum, a) => sum + (a.minutes ?? 0), 0)

  return (
    <main lang={lang}>
      <Header path={`/lessons/${slug}`} state={state} lang={lang} />
      <Link className="back" href={`${unitHref(lesson.unitId)}?state=${state}&lang=${lang}`}>
        {t.back}
      </Link>
      <h1>{lesson.title}</h1>

      <section className="objective">
        <h2>{t.objective}</h2>
        <p>{lesson.objective}</p>
      </section>

      {lesson.teacherNote && (
        <aside className="note">
          <strong>{t.teacherNote} ({state}):</strong> {lesson.teacherNote}
        </aside>
      )}

      <h2>
        {t.activities} <span className="meta">· {t.total}: {total} {t.minutes}</span>
      </h2>
      <ol className="activities">
        {lesson.activities.map((a) => (
          <li key={a.key}>
            <h3>
              {a.title} <span className="meta">{label(lang, stegaClean(a.kind))} · {a.minutes} {t.minutes}</span>
            </h3>
            {a.instructions && <RichText value={a.instructions} />}
          </li>
        ))}
      </ol>

      {lesson.items.length > 0 && (
        <section>
          <h2>{t.check}</h2>
          <ol className="items">
            {lesson.items.map((item) => (
              <li key={stegaClean(item.id)}>
                <p>{item.prompt}</p>
                <ol className="choices" type="A">
                  {item.choices.map((c, i) => <li key={i}>{c.text}</li>)}
                </ol>
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2>{t.standards}</h2>
      <ul className="standards">
        {lesson.standards.map((s) => (
          <li key={s.code}>
            <span className="chip">
              {FRAMEWORK[state]} {s.code}
            </span>{' '}
            {s.description}
          </li>
        ))}
      </ul>
    </main>
  )
}
