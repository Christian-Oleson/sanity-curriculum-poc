import Link from 'next/link'
import {UI, type Lang, type State} from '@/lib/sanity'
import {EditionSwitcher} from './EditionSwitcher'

// Site navigation + edition switcher. Nav links keep the current state/language.
export function Header({path, state, lang}: {path: string; state: State; lang: Lang}) {
  const t = UI[lang]
  const q = `?state=${state}&lang=${lang}`
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Site">
        <Link href={`/${q}`}>{t.nav.featured}</Link>
        <Link href={`/catalog${q}`}>{t.nav.catalog}</Link>
        <Link href={`/dashboard${q}`}>{t.nav.dashboard}</Link>
      </nav>
      <EditionSwitcher path={path} state={state} lang={lang} />
    </header>
  )
}
