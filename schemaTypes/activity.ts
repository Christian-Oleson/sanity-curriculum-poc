import {defineField, defineType} from 'sanity'

// An activity embedded inside a lesson (not its own document).
export const activity = defineType({
  name: 'activity',
  title: 'Activity',
  type: 'object',
  fields: [
    defineField({name: 'title', type: 'localizedString'}),
    defineField({
      name: 'kind',
      type: 'string',
      options: {
        list: ['warm-up', 'direct instruction', 'guided practice', 'independent practice', 'check for understanding'],
        layout: 'radio',
      },
    }),
    defineField({name: 'minutes', type: 'number', validation: (r) => r.min(1).max(120)}),
    defineField({name: 'instructions', type: 'localizedBlock'}),
  ],
  preview: {
    select: {title: 'title.en', kind: 'kind', minutes: 'minutes'},
    prepare: ({title, kind, minutes}) => ({
      title,
      subtitle: [kind, minutes && `${minutes} min`].filter(Boolean).join(' · '),
    }),
  },
})
