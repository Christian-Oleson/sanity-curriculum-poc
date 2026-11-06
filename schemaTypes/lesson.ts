import {defineArrayMember, defineField, defineType} from 'sanity'

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'alignment', title: 'Alignment'},
    {name: 'editions', title: 'State editions'},
  ],
  fields: [
    defineField({name: 'title', type: 'localizedString', group: 'content'}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title.en'},
      group: 'content',
    }),
    defineField({name: 'objective', type: 'localizedString', group: 'content'}),
    defineField({
      name: 'activities',
      type: 'array',
      of: [defineArrayMember({type: 'activity'})],
      group: 'content',
    }),
    defineField({
      name: 'standards',
      title: 'Aligned standards',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'standard'}]})],
      group: 'alignment',
    }),
    defineField({
      name: 'stateEditions',
      title: 'State edition overrides',
      description: 'Only fill in what differs for a state. Anything left blank falls back to the base lesson.',
      type: 'array',
      group: 'editions',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stateEdition',
          fields: [
            defineField({
              name: 'state',
              type: 'string',
              options: {list: ['TX', 'FL', 'CA', 'NY']},
              validation: (r) => r.required(),
            }),
            defineField({name: 'objective', type: 'localizedString'}),
            defineField({name: 'teacherNote', type: 'localizedText'}),
          ],
          preview: {
            select: {state: 'state', note: 'teacherNote.en'},
            prepare: ({state, note}) => ({title: `${state} edition`, subtitle: note}),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'title.en', es: 'title.es'},
    prepare: ({title, es}) => ({title, subtitle: es}),
  },
})
