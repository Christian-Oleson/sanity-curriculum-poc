import {readEdition} from '@/lib/sanity'
import {UnitView} from '../../UnitView'

export const instant = false

export default async function UnitPage({
  params,
  searchParams,
}: {
  params: Promise<{id: string}>
  searchParams: Promise<{state?: string; lang?: string}>
}) {
  const {id} = await params
  const {state, lang} = readEdition(await searchParams)
  return <UnitView id={id} path={`/units/${id}`} state={state} lang={lang} />
}
