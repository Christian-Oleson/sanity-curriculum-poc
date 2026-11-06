import {defineLocations, presentationTool} from 'sanity/presentation'

const FRONTEND = 'http://localhost:3000'
const EDITIONS = ['TX', 'FL', 'CA'] as const

// Presentation shows the Next.js frontend inside the Studio, with click-to-edit.
// `locations` lists "Used on these pages" links at the top of each document.
export const presentation = presentationTool({
  previewUrl: {
    origin: FRONTEND,
    preview: '/?state=TX&lang=en',
    previewMode: {enable: '/api/draft-mode/enable', disable: '/api/draft-mode/disable'},
  },
  allowOrigins: [FRONTEND],
  resolve: {
    locations: {
      lesson: defineLocations({
        select: {title: 'title.en', slug: 'slug.current'},
        resolve: (doc) => ({
          locations: EDITIONS.map((state) => ({
            title: `${doc?.title} (${state} edition)`,
            href: `/lessons/${doc?.slug}?state=${state}&lang=en`,
          })),
        }),
      }),
      unit: defineLocations({
        select: {title: 'title.en'},
        resolve: (doc) => ({
          locations: EDITIONS.map((state) => ({
            title: `${doc?.title} (${state} edition)`,
            href: `/?state=${state}&lang=en`,
          })),
        }),
      }),
    },
  },
})
