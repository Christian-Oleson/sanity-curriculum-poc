import {useMemo} from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {Box, Button, Card, Flex, Stack, Text, TextArea} from '@sanity/ui'
import {set, unset, type ObjectInputProps, type BlockProps} from 'sanity'

// Renders LaTeX to HTML. Returns the error message instead of throwing, so the editor shows it inline.
// Safe to inject: KaTeX escapes all text, and with `trust` left off (the default) it refuses \href,
// \htmlClass, \url and other commands that could emit links, styles or raw HTML.
function render(latex: string, displayMode = false): {html?: string; error?: string} {
  try {
    return {html: katex.renderToString(latex, {throwOnError: true, displayMode, strict: 'ignore'})}
  } catch (err) {
    return {error: err instanceof Error ? err.message.replace(/^KaTeX parse error: /, '') : String(err)}
  }
}

// One-click templates for the notation curriculum writers use most.
const SNIPPETS: {label: string; latex: string}[] = [
  {label: 'a/b', latex: '\\frac{a}{b}'},
  {label: 'mixed', latex: '2\\tfrac{1}{3}'},
  {label: '+ fractions', latex: '\\frac{1}{3} + \\frac{1}{4} = \\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}'},
  {label: '×', latex: '\\times'},
  {label: '÷', latex: '\\div'},
  {label: '≠', latex: '\\neq'},
  {label: 'x²', latex: 'x^{2}'},
]

type MathValue = {_type: 'mathFormula'; latex?: string}

/** Studio input: LaTeX textarea + quick-insert buttons + live KaTeX preview + inline parse errors. */
export function MathInput(props: ObjectInputProps) {
  const {onChange, readOnly} = props
  const latex = (props.value as MathValue | undefined)?.latex ?? ''
  const preview = useMemo(() => (latex.trim() ? render(latex, true) : null), [latex])

  const update = (next: string) => onChange(next ? set(next, ['latex']) : unset(['latex']))

  return (
    <Stack gap={3}>
      <Flex gap={1} wrap="wrap">
        {SNIPPETS.map((s) => (
          <Button key={s.label} text={s.label} mode="ghost" fontSize={1} padding={2} disabled={readOnly}
            onClick={() => update(latex ? `${latex} ${s.latex}` : s.latex)} />
        ))}
      </Flex>
      <TextArea
        value={latex}
        readOnly={readOnly}
        placeholder="LaTeX, e.g. \frac{1}{3} + \frac{1}{4}"
        onChange={(e) => update(e.currentTarget.value)}
        style={{fontFamily: 'ui-monospace, Consolas, monospace', minHeight: 72}}
      />
      <Card padding={4} radius={2} border tone={preview?.error ? 'critical' : 'default'}>
        {!preview && <Text size={1} muted>Preview appears here.</Text>}
        {preview?.html && <Box style={{fontSize: '1.25rem', overflowX: 'auto'}} dangerouslySetInnerHTML={{__html: preview.html}} />}
        {preview?.error && <Text size={1}>⚠ {preview.error}</Text>}
      </Card>
    </Stack>
  )
}

/**
 * How the formula looks inside the rich-text editor: rendered math, not raw LaTeX.
 * Keeps Sanity's default inline wrapper (renderDefault), which provides selection, the edit popover
 * and validation markers, and only swaps the preview.
 */
export function MathInline(props: BlockProps) {
  const latex = (props.value as MathValue | undefined)?.latex ?? ''
  const out = latex ? render(latex) : {error: 'empty'}
  return props.renderDefault({
    ...props,
    renderPreview: () =>
      out.html ? (
        <span style={{padding: '0 2px'}} title="Click to edit formula" dangerouslySetInnerHTML={{__html: out.html}} />
      ) : (
        <span style={{color: 'red'}}>[invalid math]</span>
      ),
  })
}

/** Shared by schema validation (blocks bad LaTeX before publish). */
export const latexError = (latex: string | undefined) => (latex ? render(latex).error : 'Formula is empty')
