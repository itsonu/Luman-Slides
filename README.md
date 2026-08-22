<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LuminaSlides AI (Luman-Slides)

> **Archived — no longer actively maintained.**
> This repository is kept for reference only. See [Project Status](#project-status) before using any of it.

An experimental, browser-only AI presentation builder. You paste a topic plus rough notes; Google Gemini turns them into a structured deck of 5–8 slides, and Imagen / Veo generate the background imagery or video for each slide.

The repository is a prototype exported from **Google AI Studio**. It was committed over a single afternoon (19 November 2025) and has received no changes since. **It does not run standalone in its current state** — see [Known limitations](#known-limitations).

---

## What it was for

Turning unstructured text (notes, an article, a rough brain-dump) into a presentable slide deck without manually laying out slides or sourcing images. The AI handles three jobs at once: deciding the slide structure, writing the bullet copy and speaker notes, and writing the image prompts used to generate each slide's visual.

## Features

Established by reading the source, not by aspiration:

| Feature | Where |
|---|---|
| Topic + raw-notes input form | `components/InputForm.tsx` |
| AI deck structuring (5–8 slides, JSON-schema constrained) | `services/gemini.ts` → `generatePresentationStructure` |
| 7 slide layouts (title, split-left, split-right, center, image-heavy, data, conclusion) | `types.ts`, `components/SlideView.tsx` |
| AI-generated speaker notes per slide | part of the structuring schema |
| Per-slide background **image** generation (Imagen, 16:9) | `generateSlideImage` |
| Per-slide background **video** generation (Veo, 720p, with polling) | `generateSlideVideo` |
| Automatic image-prompt refinement for short/weak prompts | `refineImagePrompt` |
| Inline editing of titles, bullets, and image prompts | `components/SlideView.tsx` |
| Slide add / delete / reorder | `App.tsx` |
| Undo / redo (30-step history) | `App.tsx` |
| Autosave to `localStorage` | `App.tsx`, key `lumina-project-data` |
| Fullscreen present mode | `App.tsx` |

**Not implemented:** deck export. The Export button shows `"Export feature coming soon!"` and does nothing (`App.tsx:412`). There is no PPTX/PDF/JSON export path anywhere in the codebase.

## Technology stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS via the `cdn.tailwindcss.com` script tag (no build-time Tailwind) |
| Icons | `lucide-react` |
| AI SDK | `@google/genai` |
| Text model | `gemini-2.5-flash` |
| Image model | `imagen-4.0-generate-001` |
| Video model | `veo-3.1-fast-generate-preview` |
| Storage | Browser `localStorage` — no backend, no database, no server |

There is **no backend**. Gemini is called directly from the browser using an API key inlined at build time by `vite.config.ts`.

## Historical setup instructions

> ⚠️ **Historical — preserved from the original README. These instructions are incomplete: following them yields a blank page.** See [Known limitations](#known-limitations) for why.

The project was created in Google AI Studio and was intended to be opened there:
`https://ai.studio/apps/drive/1HvUnQ_IC4UvvsXAARsWe4RVKhSshSIqF`
(External link, outside this repository — it may no longer resolve, and access depends on the original owner's Drive permissions.)

The original local instructions were:

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in a `.env.local` file at the repository root (this file was never committed, correctly, and is not present).
3. Run the app: `npm run dev`

`vite.config.ts` reads `GEMINI_API_KEY` and injects it into the bundle as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

## Known limitations

These were verified against the code in this repository on 22 August 2026.

1. **The app never mounts — this is the blocking issue.** `index.html` contains `<div id="root"></div>` but no `<script type="module" src="/index.tsx">`. Nothing ever imports `index.tsx`, so `ReactDOM.createRoot` is never called. Verified two ways: `npm run build` succeeds but transforms only **2 modules** and emits `dist/index.html` alone — zero application JavaScript; and the Vite dev server serves the page with no entry script. Both produce a blank page. Google AI Studio evidently injected the entry point in its own hosted harness, and that step is missing from the exported repository. A fork would need to add that one script tag before anything else can be evaluated.
2. **The API key is exposed to the client.** `vite.config.ts` inlines `GEMINI_API_KEY` into the bundle, and `generateSlideVideo` puts the key in a URL query string (`${videoUri}&key=${apiKey}`). Anyone loading a deployed build can read the key. This design is acceptable only for local, single-user experimentation — never deploy it publicly.
3. **One TypeScript error.** `npx tsc --noEmit` reports `components/SlideView.tsx(304,37): error TS2322` — a `key` prop passed to a component whose props type does not declare it. Vite's build does not typecheck, so it does not block the build.
4. **Preview-channel and pinned AI models.** `veo-3.1-fast-generate-preview` is an explicitly preview model; `imagen-4.0-generate-001` and `gemini-2.5-flash` are pinned identifiers. Google retires preview and pinned model IDs, so these calls are likely to fail over time regardless of anything in this code.
5. **Undo/redo history indexing looks unsound.** `pushToHistory` in `App.tsx` computes the next index from a stale `history` closure and hard-codes `29` on overflow. Not verified at runtime (the app does not mount), but flagged as suspect for anyone reading the code.
6. **No tests, no CI, no linter.** There is no `.github/` directory, no workflow, no test runner, and no lint configuration. Any CI badge you may see elsewhere referring to this project is not backed by anything in this repository.
7. **No `LICENSE` file.** No license was ever committed, so no usage rights are granted. Default copyright applies. Ask the repository owner if you need permission.
8. **No export.** See the Features table.

## Validation performed

Run on Node.js v22.22.3 / npm 10.9.8 on 22 August 2026:

| Check | Result |
|---|---|
| `npm install` | Passed — 106 packages, one deprecation warning (`node-domexception@1.0.0`, transitive) |
| `npm run build` | Exits 0, but emits only `dist/index.html` with no app bundle — see limitation 1 |
| `npx tsc --noEmit` | 1 error — see limitation 3 |
| Vite dev server | Starts and serves, but injects no application entry script — blank page |
| End-to-end generation | **Not tested.** Requires a live Gemini API key and billable Imagen/Veo calls |

No claim is made that AI generation works. The code paths look coherent, but they were never executed during this archival pass.

## Project Status

**Archived. Read-only. Not maintained.**

- **Final maintenance state:** the last commit, `d429a42 "improvement"`, is dated **19 November 2025**. All three commits in the repository's history land on that same day, within roughly 18 minutes of each other. Nothing was changed between then and this archival pass.
- **Reason for archival:** not documented anywhere in the repository. There are no issue references, notes, or commit messages explaining it. The commit history is consistent with a one-session prototype that was set aside rather than a project that was deliberately wound down — but that is an inference, not a documented fact.
- **Issues and pull requests:** should not be expected to receive a response.
- **Should you use it for a new project?** No. Not as a starting point and not in production. It does not run as-is (limitation 1), it leaks its API key to the browser (limitation 2), and it targets AI model IDs that will be retired.
- **Should you fork it?** Fork it if you want the *ideas* — the layout taxonomy in `types.ts`, the JSON-schema-constrained deck-structuring prompt in `services/gemini.ts`, and the Veo polling-plus-retry loop are the parts worth reading. Expect to fix the missing entry point, move the Gemini calls behind a server so the key stays secret, and re-check every model ID against current Google documentation.
- **Dependencies:** unaudited and frozen as of November 2025. Deliberately left unchanged so the snapshot stays historically accurate. Run your own `npm audit` before installing.

## Contributing

The repository is archived, so contributions are not expected and pull requests are not being reviewed. Fork it instead.

## Repository layout

```
index.html              Page shell: Tailwind CDN, fonts, import map, #root  (missing the app entry script)
index.tsx               React entry point — never referenced by index.html
App.tsx                 Editor shell: state, history, persistence, toolbar, sidebar
types.ts                Slide / Presentation models, layout and media enums
components/
  InputForm.tsx         Landing view: topic + raw-notes form
  SlideView.tsx         Renders and inline-edits a single slide, per layout
services/
  gemini.ts             All Gemini / Imagen / Veo calls
vite.config.ts          Dev server, path alias, API-key injection
metadata.json           AI Studio app manifest
```
