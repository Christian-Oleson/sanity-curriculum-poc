import {defineField, defineType} from 'sanity'
import {MathInput, MathInline, latexError} from './components/MathInput'

// Inline math inside rich text (activity instructions). Stored as LaTeX, rendered with KaTeX
// in the Studio (live preview) and on the student page.
export const mathFormula = defineType({
  name: 'mathFormula',
  title: 'Math formula',
  type: 'object',
  fields: [defineField({name: 'latex', title: 'LaTeX', type: 'string'})],
  validation: (r) =>
    r.custom<{latex?: string}>((v) => {
      const err = latexError(v?.latex)
      return err ? `Invalid math: ${err}` : true
    }),
  components: {input: MathInput, inlineBlock: MathInline},
  preview: {select: {title: 'latex'}},
})
