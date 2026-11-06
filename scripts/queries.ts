// Run with: npx sanity exec scripts/queries.ts --with-user-token
// Shows how a frontend (player, courseware app) would read curriculum content via GROQ.
import process from 'node:process'
import {getCliClient} from 'sanity/cli'

// Which standards framework each state edition aligns to.
const FRAMEWORK: Record<string, string> = {TX: 'TEKS', FL: 'BEST', CA: 'CCSS'}

const client = getCliClient({apiVersion: '2025-01-01', useCdn: false})

const show = (label: string, data: unknown) =>
  console.log(`\n=== ${label} ===\n${JSON.stringify(data, null, 2)}`)

async function main() {
  // 1. A unit's table of contents in Spanish. References are followed inline with ->
  show(
    'Unit TOC (Spanish)',
    await client.fetch(
      `*[_type == "unit" && _id == $id][0]{
        "title": title[$lang],
        grade,
        "lessons": lessons[]->{ "title": title[$lang], "slug": slug.current }
      }`,
      {id: 'unit-g5-fractions', lang: 'es'},
    ),
  )

  // 2. Reverse lookup: which lessons align to a given standard?
  show(
    'Lessons aligned to TEKS 5.3K',
    await client.fetch(
      `*[_type == "lesson" && references(*[_type == "standard" && framework == $fw && code == $code]._id)]{
        "title": title.en
      }`,
      {fw: 'TEKS', code: '5.3K'},
    ),
  )

  // 3. State edition resolution: base lesson merged with the state override (coalesce = fallback).
  for (const state of ['TX', 'FL', 'CA']) {
    show(
      `Lesson rendered for ${state}`,
      await client.fetch(
        `*[_type == "lesson" && slug.current == $slug][0]{
          "title": title.en,
          "edition": $state,
          "objective": coalesce(stateEditions[state == $state][0].objective.en, objective.en),
          "teacherNote": stateEditions[state == $state][0].teacherNote,
          "standards": standards[@->framework == $fw]->code,
          "totalMinutes": math::sum(activities[].minutes)
        }`,
        {slug: 'adding-fractions-unlike-denominators', state, fw: FRAMEWORK[state]},
      ),
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
