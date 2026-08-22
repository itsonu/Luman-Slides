<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LuminaSlides AI (Luman-Slides)

> **Archived — no longer actively maintained.**
> This repository is kept for reference only. See [Project Status](#project-status) before using any of it.

An experimental, browser-only AI presentation builder. You paste a topic plus rough notes; Google Gemini turns them into a structured deck of 5–8 slides, and Imagen / Veo generate the background imagery or video for each slide.

The repository is a prototype exported from **Google AI Studio**. All of its feature work was committed over a single afternoon (19 November 2025). The app builds and renders locally; generating an actual deck needs your own Gemini API key. Read [Known limitations](#known-limitations) before doing anything with it.

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

## Running it locally

**Prerequisites:** Node.js (verified on v22) and a Google Gemini API key.

1. Install dependencies: `npm install`
2. Create a `.env.local` file at the repository root containing `GEMINI_API_KEY=your-key-here`. This file is not committed and is not present in the repository.
3. Run the dev server: `npm run dev` — serves on port 3000.

`npm run build` produces a static bundle in `dist/`; `npm run preview` serves it.

`vite.config.ts` reads `GEMINI_API_KEY` and injects it into the bundle as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`. **That means the key ends up readable inside the shipped JavaScript** — see limitation 1. Keep this local.

Without a key the app still loads and renders its input form; deck generation fails at the first API call.

### Origin

The project was created in Google AI Studio and was originally intended to be opened there:
`https://ai.studio/apps/drive/1HvUnQ_IC4UvvsXAARsWe4RVKhSshSIqF`
(External link, outside this repository — it may no longer resolve, and access depends on the original owner's Drive permissions.)

### One fix applied during archival

The AI Studio export was missing its entry point: `index.html` had `<div id="root"></div>` but no `<script type="module" src="/index.tsx">`, so nothing ever imported `index.tsx` and `ReactDOM.createRoot` was never called. The page rendered blank, and `npm run build` transformed only 2 modules — emitting `dist/index.html` with zero application JavaScript. AI Studio evidently injected that script tag in its own hosted harness.

That one line was added during this archival pass so the historical code is actually runnable. It is the only functional change made; everything else is the November 2025 snapshot untouched.

The redundant `<script type="importmap">` block in `index.html` — a leftover from AI Studio's CDN-based module loading — was deliberately left in place. Vite bundles these dependencies from `node_modules` and ignores the import map during the build.

## Known limitations

These were verified against the code in this repository on 22 August 2026.

1. **The API key is exposed to the client.** `vite.config.ts` inlines `GEMINI_API_KEY` into the bundle, and `generateSlideVideo` puts the key in a URL query string (`${videoUri}&key=${apiKey}`). Anyone loading a deployed build can read the key. This design is acceptable only for local, single-user experimentation — never deploy it publicly. This is the single biggest reason not to put this code on the internet as-is.
2. **One TypeScript error.** `npx tsc --noEmit` reports `components/SlideView.tsx(304,37): error TS2322` — a `key` prop passed to a component whose props type does not declare it. Vite's build does not typecheck, so it does not block the build. Left unfixed to keep the snapshot intact.
3. **Preview-channel and pinned AI models.** `veo-3.1-fast-generate-preview` is an explicitly preview model; `imagen-4.0-generate-001` and `gemini-2.5-flash` are pinned identifiers. Google retires preview and pinned model IDs, so these calls are likely to fail over time regardless of anything in this code. If generation fails for you, check the model IDs in `services/gemini.ts` first.
4. **Undo/redo history indexing looks unsound.** `pushToHistory` in `App.tsx` computes the next index from a stale `history` closure and hard-codes `29` on overflow. Flagged from reading the code; not exercised at runtime during this pass.
5. **No tests, no CI, no linter.** There is no `.github/` directory, no workflow, no test runner, and no lint configuration. Any CI badge you may see elsewhere referring to this project is not backed by anything in this repository.
6. **No `LICENSE` file.** No license was ever committed, so no usage rights are granted. Default copyright applies. Ask the repository owner if you need permission.
7. **No export.** See the Features table.
8. **Deck generation was never verified.** See the next section.

## Validation performed

Run on Node.js v22.22.3 / npm 10.9.8 on 22 August 2026:

| Check | Result |
|---|---|
| `npm install` | Passed — 106 packages, one deprecation warning (`node-domexception@1.0.0`, transitive) |
| `npm run build` | Passed — 1695 modules, `dist/assets/index-*.js` at 289 kB (88 kB gzipped) |
| `npm run preview` + browser load | Passed — app mounts, landing form renders, no console errors |
| `npx tsc --noEmit` | 1 error — see limitation 2 |
| End-to-end deck generation | **Not tested.** Requires a live Gemini API key and billable Imagen/Veo calls |

What this does and does not establish: the app builds, boots, and renders its first screen. Every path past the "Generate Presentation" button — deck structuring, image generation, video generation and polling, the slide editor, undo/redo, persistence — was **never executed**. Those parts are read-but-unverified. No claim is made that AI generation works.

## Project Status

**Archived. Read-only. Not maintained.**

- **Final maintenance state:** the last feature commit, `d429a42 "improvement"`, is dated **19 November 2025**. All three original commits land on that same day, within roughly 18 minutes of each other. Nothing changed between then and this archival pass in August 2026, which added this documentation and the one-line entry-point fix.
- **Reason for archival:** not documented anywhere in the repository. There are no issue references, notes, or commit messages explaining it. The commit history is consistent with a one-session prototype that was set aside rather than a project that was deliberately wound down — but that is an inference, not a documented fact.
- **Issues and pull requests:** should not be expected to receive a response.
- **Should you use it for a new project?** Not in production, and not as a foundation. It leaks its API key to the browser (limitation 1), targets AI model IDs that will be retired (limitation 3), has no tests, and cannot export a deck. It is a demo you can run, not a base to build on.
- **Should you fork it?** Fork it if you want the *ideas* — the layout taxonomy in `types.ts`, the JSON-schema-constrained deck-structuring prompt in `services/gemini.ts`, and the Veo polling-plus-retry loop are the parts worth reading. Before building on it: move the Gemini calls behind a server so the key stays secret, re-check every model ID against current Google documentation, and verify the generation paths yourself.
- **Dependencies:** unaudited and frozen as of November 2025. Deliberately left unchanged so the snapshot stays historically accurate. Run your own `npm audit` before installing.

## Contributing

The repository is archived, so contributions are not expected and pull requests are not being reviewed. Fork it instead.

## Repository layout

```
index.html              Page shell: Tailwind CDN, fonts, vestigial import map, #root, entry script
index.tsx               React entry point — mounts App into #root
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
