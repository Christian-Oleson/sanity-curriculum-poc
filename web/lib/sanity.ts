import 'server-only'
import {createClient, type ClientPerspective, type QueryParams} from 'next-sanity'
import {draftMode, cookies} from 'next/headers'
import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'

export const STUDIO_URL = 'http://localhost:3333'
const token = process.env.SANITY_API_READ_TOKEN

// Server-side only. The dataset is private, so every read uses the viewer token from .env.local
// (never sent to the browser). Normal visitors get the published perspective.
export const sanity = createClient({
  projectId: '4epy89g7',
  dataset: 'production',
  apiVersion: '2025-02-19',
  useCdn: false, // fresh reads, so Studio edits show up on reload
  perspective: 'published',
  stega: {studioUrl: STUDIO_URL},
})

/**
 * Fetch for pages. Normal visitors get published content.
 * Inside the Presentation tool (draft mode), fetch whatever perspective the Studio has selected
 * (drafts, or a Release stacked on top of drafts/published) and add invisible stega markers
 * so clicking text in the preview opens the matching field in the Studio.
 */
export async function sanityFetch<T>(query: string, params: QueryParams): Promise<T> {
  const {isEnabled} = await draftMode()
  // Dataset is private: even published reads need the (server-only) read token.
  if (!isEnabled || !token) return sanity.fetch<T>(query, params, {token})

  const raw = (await cookies()).get(perspectiveCookieName)?.value
  let perspective: ClientPerspective = 'drafts'
  if (raw) {
    try {
      perspective = raw.startsWith('[') ? JSON.parse(raw) : (raw as ClientPerspective)
    } catch {
      // keep 'drafts'
    }
  }
  return sanity.fetch<T>(query, params, {perspective, token, stega: true, useCdn: false})
}

/** Published-only fetch that also returns the Content Lake's server-side query time (for the dashboard). */
export async function sanityQueryWithTiming<T>(query: string, params: QueryParams): Promise<{result: T; ms: number}> {
  const res = await sanity.fetch<T>(query, params, {token, filterResponse: false, stega: false})
  return {result: res.result, ms: res.ms}
}

export const STUDIO_EDIT_URL = (id: string, type: string) => `${STUDIO_URL}/intent/edit/id=${id};type=${type}`

export const STATES = ['TX', 'FL', 'CA'] as const
export const LANGS = ['en', 'es'] as const
export type State = (typeof STATES)[number]
export type Lang = (typeof LANGS)[number]

// Which standards framework each state edition aligns to.
export const FRAMEWORK: Record<State, string> = {TX: 'TEKS', FL: 'BEST', CA: 'CCSS'}

export function readEdition(sp: {state?: string; lang?: string}): {state: State; lang: Lang} {
  const state = (STATES as readonly string[]).includes(sp.state ?? '') ? (sp.state as State) : 'TX'
  const lang = (LANGS as readonly string[]).includes(sp.lang ?? '') ? (sp.lang as Lang) : 'en'
  return {state, lang}
}

// UI strings (the content itself comes from Sanity).
export const UI = {
  en: {grade: 'Grade', lessons: 'Lessons', objective: 'Objective', standards: 'Standards', activities: 'Activities', minutes: 'min', teacherNote: 'Teacher note', back: '← Back to unit', total: 'Total time', edition: (s: State) => `${s} edition`, units: 'units', check: 'Check for understanding', noAlignment: (s: State) => `No ${s} alignment`, nav: {featured: 'Featured unit', catalog: 'Catalog', dashboard: 'Dashboard'}},
  es: {grade: 'Grado', lessons: 'Lecciones', objective: 'Objetivo', standards: 'Estándares', activities: 'Actividades', minutes: 'min', teacherNote: 'Nota para docentes', back: '← Volver a la unidad', total: 'Tiempo total', edition: (s: State) => `Edición de ${s}`, units: 'unidades', check: 'Comprobación de la comprensión', noAlignment: (s: State) => `Sin alineación de ${s}`, nav: {featured: 'Unidad destacada', catalog: 'Catálogo', dashboard: 'Panel'}},
}

// Fixed option lists in the schema (activity kind, subject) are stored as stable English values,
// so they're translated here as UI labels rather than as content. Unknown values fall back to the raw value.
// Values arrive with stega markers in preview, so callers must stegaClean() before looking them up.
const LABELS: Record<Lang, Record<string, string>> = {
  en: {},
  es: {
    'warm-up': 'calentamiento',
    'direct instruction': 'instrucción directa',
    'guided practice': 'práctica guiada',
    'independent practice': 'práctica independiente',
    'check for understanding': 'comprobación de la comprensión',
    Math: 'Matemáticas',
    ELA: 'Lengua y literatura',
    Science: 'Ciencias',
    'Social Studies': 'Estudios sociales',
  },
}
export const label = (lang: Lang, value: string) => LABELS[lang][value] ?? value
