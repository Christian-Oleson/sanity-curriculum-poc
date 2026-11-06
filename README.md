# Sanity CMS for K-12 curriculum: a working evaluation

A hands-on proof of concept answering one question: **could [Sanity](https://www.sanity.io) manage multi-state, bilingual K-12 curriculum?**

It models standards-aligned math lessons with **state editions** (Texas TEKS, Florida B.E.S.T., Common Core) and **English/Spanish** content. Around that model it builds the workflows a curriculum team would actually need: coverage reporting, change-impact alerts, AI-assisted translation, editorial review, QTI 3.0 assessment export and a custom math editor.

> **All curriculum content here is synthetic or hand-written sample content.** Standard *codes* follow each framework's real format; generated descriptions are labeled `[Synthetic]`. No proprietary curriculum is included.

![Alignment & translation dashboard](docs/screenshots/01-dashboard.png)

---

## The demo story

*"A Texas standard changes. What breaks, who fixes it, and how fast does it ship, in English and Spanish?"*

| # | Capability | What it shows |
|---|---|---|
| 1 | **Structured, linked content** | Standards are documents; lessons *reference* them. Fix a standard once and every lesson that uses it changes. |
| 2 | **State editions** | One lesson, per-state overrides (objective, teacher note) that fall back to the base lesson, and only that state's standards are shown. |
| 3 | **Bilingual by design** | Every text field is `{en, es}`. The Studio warns on missing Spanish; `npm run audit` reports gaps in CI-friendly form. |
| 4 | **Coverage dashboard** | Grade × state heatmap, never-taught standards, lessons missing a state's alignment, Spanish gaps, each with a deep link to fix it in the Studio. |
| 5 | **Change-impact alerts** | Editing a published standard files an *impact report* within seconds: field diff, affected lessons/units, "Spanish may be stale". |
| 6 | **AI translation** | Sanity AI Assist translates EN → ES with a K-12 style guide; warnings clear and the dashboard updates. |
| 7 | **Editorial workflow** | Live co-editing and presence, field-level comments, drafts vs. published, revision history, scheduled publishing. |
| 8 | **Click-to-edit preview** | The Studio's Presentation tool embeds the real student page; clicking text opens the exact field, including state overrides. |
| 9 | **QTI 3.0 export** | Assessment items export as QTI 3.0 (EN or ES) and **validate against the official 1EdTech XSD**. |
| 10 | **Custom math input** | Inline LaTeX in rich text with a live KaTeX preview; malformed math blocks publishing. |
| 11 | **Scale** | A generated K-5 catalog (360 standards, 60 units, 600 lessons) imports in ~8 s; dashboard queries run in roughly 100–500 ms server time. |

---

## Screenshots

### Student-facing site (Next.js)

| Florida edition, Spanish | Texas edition, English |
|---|---|
| ![Lesson, FL, Spanish](docs/screenshots/02-lesson-fl-spanish.png) | ![Unit, TX, English](docs/screenshots/03-unit-tx-english.png) |
| Florida's teacher note and B.E.S.T. standard, typeset math, and a check-for-understanding item (answers are never sent to the page). | The Texas edition shows its TEKS-specific objective and only TEKS standards. |

| Alignment gaps surface on the page | Catalog (Spanish) |
|---|---|
| ![Unit with missing FL alignment](docs/screenshots/04-unit-missing-fl-alignment.png) | ![Catalog](docs/screenshots/05-catalog-spanish.png) |

### Sanity Studio (editors)

| State edition overrides | Standards as references |
|---|---|
| ![State editions](docs/screenshots/10-studio-state-editions.png) | ![Alignment](docs/screenshots/11-studio-alignment-references.png) |

| Missing-Spanish warning | Revision history (field diff) |
|---|---|
| ![Validation warning](docs/screenshots/12-studio-missing-spanish-warning.png) | ![History](docs/screenshots/13-studio-revision-history.png) |

| Presentation: click text → exact field | Scheduled drafts |
|---|---|
| ![Presentation](docs/screenshots/14-presentation-click-to-edit.png) | ![Scheduled drafts](docs/screenshots/15-scheduled-drafts.png) |

| AI Assist: translate EN → ES | After translation: warnings cleared |
|---|---|
| ![AI Assist](docs/screenshots/16-ai-assist-translate.png) | ![Warnings cleared](docs/screenshots/17-ai-assist-warnings-cleared.png) |

| Live co-editing (two sessions) | Field-level review comment |
|---|---|
| ![Co-editing](docs/screenshots/18-live-co-editing.png) | ![Comment](docs/screenshots/19-field-comment.png) |

| Custom math input: live preview | Invalid math blocks publishing |
|---|---|
| ![Math input](docs/screenshots/20-math-input-preview.png) | ![Math validation](docs/screenshots/21-math-input-validation.png) |

### Terminal

Impact watcher, after an editor changes a standard in the Studio:

```text
⚠  TEKS 3.7A changed (description (English))
   description (English):
     before: [Synthetic] Grade 3 Fractions: understand core concepts.
     after:  [Synthetic] Grade 3 Fractions: understand core concepts. REVISED 2027: include fractions on a number line.
   → 10 lesson(s) affected:
     - Fractions 1: Foundations
     …
   → Spanish translation may now be stale
   Filed l326m66BRC3WVB323k3zS9
```

QTI export validated against the official schema:

```text
$ npm run validate:qti
Compiled QTI 3.0 schema set (5 schemas incl. imports)
VALID    add-unlike-1-en.xml
VALID    add-unlike-1-es.xml
VALID    equiv-1-en.xml
VALID    equiv-1-es.xml
```

---

## Architecture

```mermaid
flowchart LR
  subgraph Sanity["Sanity (hosted)"]
    CL[(Content Lake<br/>private dataset)]
    CM[(production-comments)]
  end
  subgraph Studio["Sanity Studio :3333"]
    S1[Structure editor]
    S2[Presentation tool]
    S3[AI Assist]
    S4[Custom math input]
  end
  subgraph Web["Next.js :3000"]
    W1[Lesson / unit / catalog pages]
    W2[Coverage dashboard]
    W3["/api/qti (staff-only)"]
    W4[Draft-mode routes]
  end
  W[Impact watcher<br/>scripts/impact-watcher.ts]

  Studio <-->|edits, real-time| CL
  Studio --- CM
  Web -->|GROQ, server-side,<br/>viewer token| CL
  S2 -->|iframe + draft mode| Web
  CL -->|listener events| W
  W -->|impactReport docs| CL
```

- **Studio** (repo root): schema, editing UI, plugins (Presentation, AI Assist, Vision).
- **Frontend** (`web/`): Next.js 16 App Router, server components, GROQ queries resolve language and state edition in a single query per page.
- **The dataset is private.** The frontend reads server-side with a viewer token; the browser never sees it. Preview (drafts) only works inside the Studio's Presentation tool.

### Content model

```
standard   { framework: TEKS|BEST|CCSS, code, grade, description: {en, es} }
lesson     { title/objective: {en, es}, activities[], standards[] → standard,
             stateEditions[] { state, objective?: {en, es}, teacherNote?: {en, es} } }
unit       { title: {en, es}, subject, grade, lessons[] → lesson }
assessmentItem { identifier, prompt: {en, es}, choices[] { text: {en, es}, correct }, lesson → lesson, standards[] }
impactReport   { standard →, changes[], affectedLessons[] →, needsSpanishReview, status }
activity.instructions: {en, es} rich text with inline mathFormula { latex }
```

The key query pattern, a lesson rendered for a state and language with fallbacks:

```groq
*[_type == "lesson" && slug.current == $slug][0]{
  "title": coalesce(title[$lang], title.en),
  "objective": coalesce(stateEditions[state == $state][0].objective[$lang], objective[$lang], objective.en),
  "standards": standards[@->framework == $fw]->{code, "description": coalesce(description[$lang], description.en)}
}
```

---

## Running it locally

**Prerequisites:** Node 20+, a free [Sanity](https://www.sanity.io) account, and PowerShell 7 (only for the QTI validator).

```bash
# 1. Studio
npm install
npx sanity login
```

2. **Point it at your own Sanity project.** Replace the project ID `4epy89g7` in `sanity.config.ts`, `sanity.cli.ts` and `web/lib/sanity.ts`. Then make the dataset private and allow the frontend's origin:

   ```bash
   npx sanity dataset visibility set production private
   npx sanity cors add http://localhost:3000 --credentials
   ```

3. **Load content:**

   ```bash
   npm run seed      # hand-written demo unit (Grade 5 fractions, EN/ES, TX/FL editions)
   npm run items     # two assessment items
   npm run catalog   # optional: synthetic K-5 catalog (~1,000 docs) for scale + dashboard
   ```

4. **Frontend env:**

   ```bash
   cd web
   cp .env.example .env.local   # add a Viewer token + a random QTI export secret
   npm install
   cd ..
   ```

5. **Run:**

   ```bash
   npm run dev            # Studio → http://localhost:3333
   npm run web            # Site   → http://localhost:3000  (dashboard at /dashboard)
   npm run watch:impact   # optional: standard-change impact reports
   ```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `npm run web` | Studio / frontend dev servers |
| `npm run seed` | Reset the hand-written demo unit |
| `npm run items` | Import the sample assessment items |
| `npm run catalog` / `npm run catalog:remove` | Generate + import / delete the synthetic K-5 catalog (`gen-*` ids) |
| `npm run queries` | Example GROQ queries (Spanish TOC, alignment lookup, state editions) |
| `npm run audit` | List every field with English but no Spanish; exits 1 on gaps |
| `npm run watch:impact` | Watch published standards; file impact reports on change (auto-reconnects) |
| `npm run validate:qti` | Export items as QTI 3.0 (EN/ES) and validate against the official XSD |

> The audit is **expected to fail** once the synthetic catalog is loaded, because it contains deliberate translation gaps for the dashboard to find.

---

## Findings

**Strengths**
- **References + GROQ** handle state editions and bilingual content cleanly. One query per page resolves language, state overrides and the state's framework.
- **The editor experience** is strong: field-level validation, comments, presence, history, and Presentation's click-to-edit (it correctly resolves state-override fields).
- **Extensibility**: custom inputs (the math editor), custom document types (impact reports) and plugins took small amounts of code.
- **Performance** at catalog scale (~1,000 docs) was a non-issue in this test.

**Gaps and cautions**
- **Content Releases** (grouping many edits, e.g. a state adoption, into one publish) **requires a paid plan.** The free tier's Scheduled Drafts work, but only one document per schedule.
- **AI Assist translates every field**, not only the missing ones. In testing it overwrote existing Spanish and changed established terminology. It needs a glossary in the style guide plus human review.
- **API writes bypass Studio validation.** A migration script can store data the Studio would reject (it happened here with a LaTeX escaping bug). Scripts need their own validation.
- **Webhooks need a public URL.** Locally, a real-time listener stands in. Production would use a GROQ-powered webhook or a Sanity Function (filter: `_type == "standard" && delta::changedAny((code, description))`).
- **QTI alignment metadata** belongs in a content-package manifest (e.g. CASE ids), not item XML. Packaging is not built.
- **Private datasets keep documents private, but uploaded files/images are still public.**

**Engineering gotchas hit along the way**
- **Next.js root detection:** the Studio's `package-lock.json` one level up made Next treat the whole repo as its root, and unrelated file writes caused a reload loop. Fixed with `turbopack.root` in `web/next.config.ts`.
- **Listener connections** are closed by the server periodically. Long-running listeners must reconnect on `complete`, not just `error`.
- **`next-sanity`** auto-refreshes preview on edits only with its `SanityLive` setup; this project passes a `refresh` handler to `<VisualEditing>` instead.
- **.NET can't compile the official MathML 3 / SSML 1.1 XSDs** used by QTI. The validator substitutes lax stand-ins for those two imports only; everything QTI defines is fully validated.

## Security notes

- The **dataset is private**; all reads happen server-side with a Viewer-role token kept in `web/.env.local` (git-ignored).
- **QTI export is staff-only.** QTI contains the answer key, so `/api/qti/*` requires the Studio's preview mode or `Authorization: Bearer $QTI_EXPORT_TOKEN`, and returns 403 otherwise. (An earlier version linked it from the student page, which leaked answers; this was caught in a security review and fixed.)
- Rendered math uses KaTeX with `trust` off, so formulas can't emit links or raw HTML.

## Project layout

```
.
├── sanity.config.ts, presentation.ts, assist.ts   Studio config + plugins
├── schemaTypes/                                    Content model (+ components/MathInput.tsx)
├── scripts/                                        Queries, audit, migration, impact watcher, QTI validator
├── seed/                                           Demo content + synthetic catalog generator
├── qti-check/xsd/                                  MathML/SSML stand-in schemas (official XSD downloaded separately)
├── web/                                            Next.js frontend
│   ├── app/                                        Pages, dashboard, draft-mode + QTI routes
│   └── lib/sanity.ts                               Client, perspective-aware fetch, UI strings
└── docs/screenshots/
```

The QTI validator expects the official schema at `qti-check/xsd/imsqti_asiv3p0_v1p0.xsd`. Download it from `https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd` (18 MB, not committed).
