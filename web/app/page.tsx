import {readEdition} from '@/lib/sanity'
import {UnitView} from './UnitView'

// Always fetch fresh content so Studio edits appear on reload (no prerender).
export const instant = false

// The hand-built demo unit, featured on the home page.
export default async function FeaturedUnitPage({searchParams}: {searchParams: Promise<{state?: string; lang?: string}>}) {
  const {state, lang} = readEdition(await searchParams)
  return <UnitView id="unit-g5-fractions" path="/" state={state} lang={lang} />
}
