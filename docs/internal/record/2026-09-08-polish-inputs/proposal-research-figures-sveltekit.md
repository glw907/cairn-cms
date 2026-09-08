# Proposal research, lens 7d: figures in the Svelte and SvelteKit docs

Survey of 21 pages across svelte.dev (Sonnet, 2026-09-08). Folded into revision 2.

---

## Findings: figures in the Svelte / SvelteKit docs and tutorial

**Method note (caveat on the tool):** all pages were fetched via WebFetch, which converts HTML to markdown and summarizes it through a small model before it reaches me. This is reliable for standard `<img>`/`<figure>` markup but could in principle miss a custom-rendered inline SVG component that doesn't survive HTML→markdown conversion cleanly. I did not independently verify raw HTML/DOM for every page. Treat "zero figures" as high-confidence, not absolute, for pages I didn't cross-check against source.

### Table of pages fetched

| # | Page | URL | Figure count | Kind |
|---|------|-----|---|---|
| 1 | SvelteKit Introduction | svelte.dev/docs/kit/introduction | 0 | — |
| 2 | Project structure | svelte.dev/docs/kit/project-structure | 1 | ASCII directory tree, code block |
| 3 | Routing | svelte.dev/docs/kit/routing | 0 | — |
| 4 | Loading data | svelte.dev/docs/kit/load | 0 | — |
| 5 | Form actions | svelte.dev/docs/kit/form-actions | 0 | — |
| 6 | Page options | svelte.dev/docs/kit/page-options | 0 | — |
| 7 | Adapters | svelte.dev/docs/kit/adapters | 0 | — |
| 8 | Hooks | svelte.dev/docs/kit/hooks | 0 | — |
| 9 | State management | svelte.dev/docs/kit/state-management | 0 | — |
| 10 | Auth | svelte.dev/docs/kit/auth | 0 | — |
| 11 | Images (best practices) | svelte.dev/docs/kit/images | 0 | (discusses images, shows none) |
| 12 | Accessibility | svelte.dev/docs/kit/accessibility | 0 | — |
| 13 | Glossary (CSR/SSR/hydration/etc.) | svelte.dev/docs/kit/glossary | 0 | — |
| 14 | `@sveltejs/kit` reference | svelte.dev/docs/kit/@sveltejs-kit | 0 | — (auto-generated from TS types/JSDoc) |
| 15 | Svelte overview | svelte.dev/docs/svelte/overview | 0 | — |
| 16 | What are runes | svelte.dev/docs/svelte/what-are-runes | 0 | — |
| 17 | `$state` reference | svelte.dev/docs/svelte/$state | 0 | — |
| 18 | Tutorial: Welcome to Svelte | svelte.dev/tutorial/svelte/welcome-to-svelte | 0 | interactive REPL only |
| 19 | Tutorial: Your first component | svelte.dev/tutorial/svelte/your-first-component | 0 | interactive REPL only |
| 20 | Tutorial: Introducing SvelteKit | svelte.dev/tutorial/kit/introducing-sveltekit | 0 | interactive REPL only |
| 21 | Tutorial: general TOC | svelte.dev/tutorial | 0 | — |

**Could not fetch:** `svelte.dev/tutorial/svelte/reactive-state` — 404 (wrong/outdated slug guess; not chased further since the surveyed pattern was already unambiguous).

### Alt text, captions, lead-ins — verbatim

There is none to quote. Across all 21 pages, not one `<img>`, screenshot, diagram, or video was found, so there is no alt text, no caption, and no lead-in sentence for a figure anywhere in the sample. The single non-prose visual element in the whole set is the ASCII directory tree on the Project Structure page (quoted in full below), which is a code block, not an image, and carries no alt text or caption — only the preceding sentence "A typical SvelteKit project looks like this:" and it sits directly inline in the body text.

```
my-project/
├ src/
│ ├ lib/
│ │ ├ server/
│ │ │ └ [your server-only lib files]
│ │ └ [your lib files]
│ ├ params/
│ │ └ [your param matchers]
│ ├ routes/
│ │ └ [your routes]
│ ├ app.html
│ ├ error.html
│ ├ hooks.client.js
│ ├ hooks.server.js
│ ├ service-worker.js
│ └ instrumentation.server.js
├ static/
│ └ [your static assets]
├ tests/
│ └ [your tests]
├ package.json
├ svelte.config.js
├ tsconfig.json
└ vite.config.js
```

### House rule on images (sveltejs/svelte CONTRIBUTING.md)

No documentation-content rule about images exists. The only mention of visual media in `CONTRIBUTING.md` is in the Testing section, about pull requests, not docs prose:

> "A good test plan has the exact commands you ran and their output, provides screenshots or videos if the pull request changes UI."

I checked the `documentation/docs/` directory tree (numbered folders: `01-introduction`, `02-runes`, `03-template-syntax`, `04-styling`, `05-special-elements`, `06-runtime`, `07-misc`, …) for a house README or style guide on images; none exists at that path (404 on `documentation/README.md`), and grepping the full `CONTRIBUTING.md` text for `image|screenshot|diagram|figure|.png|.svg` returns only the one testing-section line above.

### Summary

SvelteKit and Svelte's docs reach for a figure essentially nowhere. Every conceptual page I surveyed — routing, load functions, form actions, page options, adapters, hooks, state management, auth, accessibility, the CSR/SSR/hydration glossary — explains its mechanism entirely in prose plus runnable code blocks, with no diagram of a request/response cycle, no rendering-lifecycle flowchart, no screenshot of a resulting UI, and no video anywhere in the set. The one exception is a plain-text ASCII directory tree on the Project Structure page, itself a code block rather than a rendered image. Even the page literally about image handling (`kit/images`) contains zero example images. Reference pages are auto-generated from TypeScript types and JSDoc and inherit the same all-text convention. There is also no stated house rule anywhere in the sveltejs/svelte repo requiring or discussing images in docs content; the sole image-adjacent line in `CONTRIBUTING.md` is about attaching screenshots/videos to a pull request's test plan when it changes UI, unrelated to what ships in `docs/`.

Where a figure would conventionally appear — illustrating hydration, the request/response flow for `load`, the relationship between hooks and adapters, or the SSR/CSR/prerender interplay covered abstractly in the glossary — the docs instead lean on two substitutes: runnable, heavily-annotated code blocks (the default explanatory unit throughout), and, in the tutorial specifically, the interactive editor/preview pane. Every tutorial step I checked pairs the instructional text with a live-editable code pane and an immediately-rendered output, which does the demonstrative work a static screenshot or flow diagram would otherwise do, at the cost of being unusable in a non-interactive medium (a printed page, a search-indexed doc, a non-JS reader). For a SvelteKit-based CMS's own docs, this implies the reference and concept tracks can likely follow Svelte's all-prose-and-code convention faithfully (it is the family's norm, not an oversight to fix), but any track aimed at a non-technical audience — cairn's `editors/` track in particular, where the reader has no REPL and no code literacy to fall back on — cannot borrow this pattern uncritically, since Svelte's own docs never solve for that audience at all; screenshots of the actual admin UI would be doing work the upstream precedent simply never had to do.

Sources:
- [SvelteKit Introduction](https://svelte.dev/docs/kit/introduction)
- [Project structure](https://svelte.dev/docs/kit/project-structure)
- [Routing](https://svelte.dev/docs/kit/routing)
- [Loading data](https://svelte.dev/docs/kit/load)
- [Form actions](https://svelte.dev/docs/kit/form-actions)
- [Page options](https://svelte.dev/docs/kit/page-options)
- [Adapters](https://svelte.dev/docs/kit/adapters)
- [Hooks](https://svelte.dev/docs/kit/hooks)
- [State management](https://svelte.dev/docs/kit/state-management)
- [Auth](https://svelte.dev/docs/kit/auth)
- [Images](https://svelte.dev/docs/kit/images)
- [Accessibility](https://svelte.dev/docs/kit/accessibility)
- [Glossary](https://svelte.dev/docs/kit/glossary)
- [@sveltejs/kit reference](https://svelte.dev/docs/kit/@sveltejs-kit)
- [Svelte overview](https://svelte.dev/docs/svelte/overview)
- [What are runes](https://svelte.dev/docs/svelte/what-are-runes)
- [$state](https://svelte.dev/docs/svelte/$state)
- [Tutorial: Welcome to Svelte](https://svelte.dev/tutorial/svelte/welcome-to-svelte)
- [Tutorial: Your first component](https://svelte.dev/tutorial/svelte/your-first-component)
- [Tutorial: Introducing SvelteKit](https://svelte.dev/tutorial/kit/introducing-sveltekit)
- [Tutorial index](https://svelte.dev/tutorial)
- [sveltejs/svelte CONTRIBUTING.md](https://github.com/sveltejs/svelte/blob/main/CONTRIBUTING.md)
- [sveltejs/svelte documentation/docs directory listing](https://github.com/sveltejs/svelte/tree/main/documentation/docs)
