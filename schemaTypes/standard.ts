import {defineField, defineType} from 'sanity'

// A state (or national) learning standard, e.g. TEKS 5.3A.
// Lessons *reference* standards, so editing one here updates every lesson aligned to it.
export const standard = defineType({
  name: 'standard',
  title: 'Standard',
  type: 'document',
  fields: [
    defineField({
      name: 'code',
      type: 'string',
      validation: (r) => r.required(),
      description: 'e.g. 5.3A',
    }),
    defineField({
      name: 'framework',
      type: 'string',
      options: {
        list: [
          {title: 'Texas TEKS', value: 'TEKS'},
          {title: 'Florida B.E.S.T.', value: 'BEST'},
          {title: 'Common Core', value: 'CCSS'},
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({name: 'grade', type: 'number', validation: (r) => r.min(0).max(12)}),
    defineField({name: 'description', type: 'localizedText'}),
  ],
  preview: {
    select: {framework: 'framework', code: 'code', description: 'description.en'},
    prepare: ({framework, code, description}) => ({
      title: `${framework} ${code}`,
      subtitle: description,
    }),
  },
})
