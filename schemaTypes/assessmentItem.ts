import {defineArrayMember, defineField, defineType} from 'sanity'

// A single-response multiple-choice item, exportable as QTI 3.0 (see web/app/api/qti/[id]/route.ts).
// Bilingual like everything else, aligned to standards, and attached to a lesson.
export const assessmentItem = defineType({
  name: 'assessmentItem',
  title: 'Assessment item',
  type: 'document',
  fields: [
    defineField({name: 'identifier', type: 'slug', description: 'Stable QTI identifier (letters, digits, - and _).',
      validation: (r) => r.required().custom((v) => (v?.current && /^[A-Za-z_][\w.-]*$/.test(v.current)) || 'Must start with a letter or _ and contain only letters, digits, -, _ or .')}),
    defineField({name: 'prompt', type: 'localizedText', validation: (r) => r.required()}),
    defineField({
      name: 'choices',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'choice',
          fields: [
            defineField({name: 'text', type: 'localizedString'}),
            defineField({name: 'correct', type: 'boolean', initialValue: false}),
          ],
          preview: {
            select: {title: 'text.en', correct: 'correct'},
            prepare: ({title, correct}) => ({title: `${correct ? '✓ ' : ''}${title ?? ''}`}),
          },
        }),
      ],
      validation: (r) => [
        r.min(2).max(6),
        r.custom<{correct?: boolean}[]>((choices) =>
          (choices ?? []).filter((c) => c.correct).length === 1 || 'Mark exactly one choice as correct',
        ),
      ],
    }),
    defineField({name: 'shuffle', type: 'boolean', initialValue: true, description: 'Let the delivery platform shuffle choices.'}),
    defineField({name: 'lesson', type: 'reference', to: [{type: 'lesson'}]}),
    defineField({name: 'standards', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'standard'}]})]}),
  ],
  preview: {
    select: {title: 'prompt.en', id: 'identifier.current'},
    prepare: ({title, id}) => ({title, subtitle: id}),
  },
})
