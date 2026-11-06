import {defineArrayMember, defineField, defineType} from 'sanity'

export const unit = defineType({
  name: 'unit',
  title: 'Unit',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'localizedString'}),
    defineField({
      name: 'subject',
      type: 'string',
      options: {list: ['Math', 'ELA', 'Science', 'Social Studies']},
    }),
    defineField({name: 'grade', type: 'number', validation: (r) => r.min(0).max(12)}),
    defineField({
      name: 'lessons',
      description: 'Drag to reorder. Lessons are shared documents and can be reused across units.',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'lesson'}]})],
    }),
  ],
  preview: {
    select: {title: 'title.en', subject: 'subject', grade: 'grade'},
    prepare: ({title, subject, grade}) => ({title, subtitle: `${subject} · Grade ${grade}`}),
  },
})
