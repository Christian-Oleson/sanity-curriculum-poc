// Uses String.raw for LaTeX: in a normal string literal, backslash-f becomes a form-feed character, which silently corrupts commands like frac.
// Puts an inline math formula into the featured lesson's "Common Denominator Steps" instructions (en + es).
import {getCliClient} from 'sanity/cli'
const client = getCliClient({apiVersion: '2025-02-19', useCdn: false})

const doc = await client.getDocument('lesson-adding-unlike')
const act = doc?.activities?.find((a: {title?: {en?: string}}) => a.title?.en === 'Common Denominator Steps')
if (!act) throw new Error('activity not found')

const math = (key: string) => ({_type: 'mathFormula', _key: key, latex: String.raw`\frac{1}{3} + \frac{1}{4} = \frac{4}{12} + \frac{3}{12} = \frac{7}{12}`})
const block = (key: string, before: string, after: string) => [{
  _type: 'block', _key: key, style: 'normal', markDefs: [],
  children: [
    {_type: 'span', _key: `${key}a`, text: before, marks: []},
    math(`${key}m`),
    {_type: 'span', _key: `${key}b`, text: after, marks: []},
  ],
}]

await client
  .patch('lesson-adding-unlike')
  .set({
    [`activities[_key=="${act._key}"].instructions.en`]: block('mathen', 'Model rewriting the sum with a common denominator: ', ' Then ask: why twelfths?'),
    [`activities[_key=="${act._key}"].instructions.es`]: block('mathes', 'Modelen cómo reescribir la suma con un denominador común: ', ' Luego pregunten: ¿por qué doceavos?'),
  })
  .commit()
console.log(`Added inline math to activity ${act._key}`)
