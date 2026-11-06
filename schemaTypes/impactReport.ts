import {defineArrayMember, defineField, defineType} from 'sanity'

// Written by scripts/impact-watcher.ts when a published standard changes.
// Everything except `status` and `resolutionNote` is read-only: it's a record of what happened.
export const impactReport = defineType({
  name: 'impactReport',
  title: 'Impact report',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      type: 'string',
      options: {list: ['open', 'in review', 'resolved'], layout: 'radio'},
      initialValue: 'open',
    }),
    defineField({name: 'resolutionNote', type: 'text', rows: 2}),
    defineField({name: 'standard', type: 'reference', to: [{type: 'standard'}], readOnly: true}),
    defineField({name: 'standardLabel', type: 'string', readOnly: true}),
    defineField({name: 'changedAt', type: 'datetime', readOnly: true}),
    defineField({name: 'changedBy', type: 'string', readOnly: true}),
    defineField({
      name: 'changes',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'fieldChange',
          fields: [
            defineField({name: 'field', type: 'string'}),
            defineField({name: 'before', type: 'text', rows: 2}),
            defineField({name: 'after', type: 'text', rows: 2}),
          ],
          preview: {select: {title: 'field', subtitle: 'after'}},
        }),
      ],
    }),
    defineField({
      name: 'affectedLessons',
      type: 'array',
      readOnly: true,
      of: [defineArrayMember({type: 'reference', to: [{type: 'lesson'}]})],
    }),
    defineField({name: 'affectedUnitCount', type: 'number', readOnly: true}),
    defineField({
      name: 'needsSpanishReview',
      description: 'True when the English changed but the Spanish did not, so the translation may be stale.',
      type: 'boolean',
      readOnly: true,
    }),
  ],
  orderings: [{title: 'Newest first', name: 'changedAtDesc', by: [{field: 'changedAt', direction: 'desc'}]}],
  preview: {
    select: {label: 'standardLabel', status: 'status', count: 'affectedLessons.length', at: 'changedAt'},
    prepare: ({label, status, count, at}) => ({
      title: `${label} changed → ${count ?? 0} lesson(s)`,
      subtitle: `${(status ?? 'open').toUpperCase()} · ${at ? new Date(at).toLocaleString() : ''}`,
    }),
  },
})
