import {defineField, defineType, type PortableTextBlock} from 'sanity'

// Field-level localization: one object holding English + Spanish side by side,
// so editors see both versions in the same form.
//
// Every localized type warns (yellow, does not block publishing) when English exists but Spanish
// doesn't, so translation gaps show up in the Studio's validation panel instead of in front of students.
const missingSpanish = (hasEn: boolean, hasEs: boolean) =>
  hasEn && !hasEs ? 'Spanish translation missing' : true

const hasBlocks = (v: unknown) => Array.isArray(v) && v.length > 0

export const localizedString = defineType({
  name: 'localizedString',
  title: 'Localized string',
  type: 'object',
  fields: [
    defineField({name: 'en', title: 'English', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'es', title: 'Spanish', type: 'string'}),
  ],
  validation: (r) =>
    r.custom<{en?: string; es?: string}>((v) => missingSpanish(!!v?.en, !!v?.es)).warning(),
})

// Multi-line plain text (teacher notes, standard descriptions).
export const localizedText = defineType({
  name: 'localizedText',
  title: 'Localized text',
  type: 'object',
  fields: [
    defineField({name: 'en', title: 'English', type: 'text', rows: 3}),
    defineField({name: 'es', title: 'Spanish', type: 'text', rows: 3}),
  ],
  validation: (r) =>
    r.custom<{en?: string; es?: string}>((v) => missingSpanish(!!v?.en, !!v?.es)).warning(),
})

export const localizedBlock = defineType({
  name: 'localizedBlock',
  title: 'Localized rich text',
  type: 'object',
  fields: [
    // Rich text allows inline math formulas (see mathFormula.ts).
    defineField({name: 'en', title: 'English', type: 'array', of: [{type: 'block', of: [{type: 'mathFormula'}]}]}),
    defineField({name: 'es', title: 'Spanish', type: 'array', of: [{type: 'block', of: [{type: 'mathFormula'}]}]}),
  ],
  validation: (r) =>
    r
      .custom<{en?: PortableTextBlock[]; es?: PortableTextBlock[]}>((v) =>
        missingSpanish(hasBlocks(v?.en), hasBlocks(v?.es)),
      )
      .warning(),
})
