import katex from 'katex'
import 'katex/dist/katex.min.css'
import {PortableText, type PortableTextBlock, type PortableTextComponents} from '@portabletext/react'
import {stegaClean} from 'next-sanity'

// Server-rendered KaTeX: the page ships HTML + CSS, no math JavaScript.
// Safe to inject: KaTeX escapes all text and, with `trust` off (default), refuses \href/\url/\html* commands.
function MathFormula({value}: {value: {latex?: string}}) {
  const latex = stegaClean(value?.latex ?? '')
  try {
    const html = katex.renderToString(latex, {throwOnError: true, strict: 'ignore'})
    return <span className="math" dangerouslySetInnerHTML={{__html: html}} />
  } catch (err) {
    // Never break the page over a bad formula (the Studio blocks publishing these); show the source instead.
    return <code title={err instanceof Error ? err.message : String(err)}>{latex}</code>
  }
}

const components: PortableTextComponents = {
  types: {mathFormula: MathFormula},
}

export function RichText({value}: {value: PortableTextBlock[]}) {
  return <PortableText value={value} components={components} />
}
