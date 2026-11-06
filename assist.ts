import {assist} from '@sanity/assist'

// Our bilingual field types: every one is an object {en, es}.
const LOCALIZED_TYPES = new Set(['localizedString', 'localizedText', 'localizedBlock'])

// AI Assist field-level translation: for every {en, es} object, translate the source language's
// member (e.g. `objective.en`) into its sibling (`objective.es`). Everything else is left alone.
export const aiAssist = assist({
  translate: {
    field: {
      documentTypes: ['lesson', 'unit', 'standard'],
      languages: [
        {id: 'en', title: 'English'},
        {id: 'es', title: 'Spanish'},
      ],
      translationOutputs: (member, enclosingType, fromId, toIds) =>
        LOCALIZED_TYPES.has(enclosingType.name) && member.name === fromId
          ? toIds.map((id) => ({id, outputPath: [...member.path.slice(0, -1), id]}))
          : undefined,
    },
    styleguide: [
      'Translate into Latin American Spanish for US K-12 classrooms (Texas, Florida, California).',
      'Student-facing text (titles, objectives, activity instructions): clear, age-appropriate; plural imperatives ("Resuelvan", "Expliquen").',
      'Teacher notes: formal "usted". Refer to teachers as "docentes".',
      'Never translate standard codes (TEKS 5.3H, MA.5.FR.2.1, 5.NF.A.1), assessment names (STAAR, B.E.S.T.), numbers, or math notation.',
      'Use standard US Spanish math vocabulary: "denominador común", "recta numérica", "fracciones equivalentes", "números mixtos".',
    ].join('\n'),
  },
})
