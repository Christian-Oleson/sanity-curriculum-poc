// QTI 3.0 export: GET /api/qti/<item identifier>?lang=en|es  ->  qti-assessment-item XML
//
// Content lives in Sanity as structured data; QTI is just one rendering of it, the same way the
// lesson page is. The same item can be exported in either language from one source.
// Standards alignment is not part of item XML in QTI; it belongs in the content-package manifest
// metadata (e.g. CASE identifiers), which would be generated alongside this.
import {timingSafeEqual} from 'node:crypto'
import {draftMode} from 'next/headers'
import {sanityQueryWithTiming} from '@/lib/sanity'

// QTI includes the answer key (qti-correct-response), so this is a staff-only endpoint:
// allowed inside the Studio's Presentation preview (draft mode) or with the export token
// (`Authorization: Bearer $QTI_EXPORT_TOKEN`, from web/.env.local). Never linked from student pages.
async function isAuthorized(request: Request) {
  if ((await draftMode()).isEnabled) return true
  const expected = process.env.QTI_EXPORT_TOKEN
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!expected || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

type Item = {
  identifier: string
  prompt: {en?: string; es?: string}
  shuffle?: boolean
  choices: {text: {en?: string; es?: string}; correct?: boolean}[]
  standards: string[]
}

const QUERY = `*[_type == "assessmentItem" && identifier.current == $id][0]{
  "identifier": identifier.current,
  prompt, shuffle,
  choices[]{text, correct},
  "standards": standards[]->{"s": framework + " " + code}.s
}`

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!(await isAuthorized(request))) return new Response('Forbidden', {status: 403})
  const {id} = await params
  const lang = new URL(request.url).searchParams.get('lang') === 'es' ? 'es' : 'en'
  const {result: item} = await sanityQueryWithTiming<Item | null>(QUERY, {id})
  if (!item) return new Response('Item not found', {status: 404})

  const pick = (l: {en?: string; es?: string}) => l?.[lang] ?? l?.en ?? ''
  const ids = item.choices.map((_, i) => `CHOICE_${String.fromCharCode(65 + i)}`) // CHOICE_A, CHOICE_B, …
  const correct = ids[item.choices.findIndex((c) => c.correct)]
  if (!correct) return new Response('Item has no correct choice', {status: 422})

  const prompt = pick(item.prompt)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Exported from Sanity (${esc(item.identifier)}, ${lang}). Aligned standards: ${esc(item.standards.join(', '))} -->
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd"
    identifier="${esc(item.identifier)}-${lang}" title="${esc(prompt.slice(0, 80))}"
    adaptive="false" time-dependent="false" xml:lang="${lang}">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>${correct}</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="${item.shuffle ? 'true' : 'false'}" max-choices="1">
      <qti-prompt>${esc(prompt)}</qti-prompt>
${item.choices.map((c, i) => `      <qti-simple-choice identifier="${ids[i]}">${esc(pick(c.text))}</qti-simple-choice>`).join('\n')}
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml"/>
</qti-assessment-item>
`
  const download = new URL(request.url).searchParams.has('download')
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      ...(download ? {'content-disposition': `attachment; filename="${item.identifier}-${lang}.qti.xml"`} : {}),
    },
  })
}
