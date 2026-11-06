import Link from 'next/link'
import {LANGS, STATES, type Lang, type State} from '@/lib/sanity'

// Plain links that change ?state= and ?lang=. The page re-renders on the server, so no client JS is needed.
export function EditionSwitcher({path, state, lang}: {path: string; state: State; lang: Lang}) {
  const href = (s: State, l: Lang) => `${path}?state=${s}&lang=${l}`
  return (
    <nav className="switcher" aria-label="Edition">
      <div role="group" aria-label="State edition">
        {STATES.map((s) => (
          <Link key={s} href={href(s, lang)} aria-current={s === state ? 'true' : undefined}>
            {s}
          </Link>
        ))}
      </div>
      <div role="group" aria-label="Language">
        {LANGS.map((l) => (
          <Link key={l} href={href(state, l)} aria-current={l === lang ? 'true' : undefined}>
            {l === 'en' ? 'English' : 'Español'}
          </Link>
        ))}
      </div>
    </nav>
  )
}
