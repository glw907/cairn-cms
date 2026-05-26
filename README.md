# cairn-cms

An embedded, **magic-link**, GitHub-committing CMS for SvelteKit + Cloudflare sites.
Non-technical authors log in by email (no GitHub account, no password), edit **raw
markdown** in a [Carta](https://github.com/BearToCode/carta) editor, and save — which
commits to `main` via a **GitHub App** (committer = `cairn-cms[bot]`, author = the editor)
and auto-deploys.

It is **design-agnostic**: each consumer site supplies an adapter (collections, slug
convention, frontmatter schema, and its own `renderPreview(md)`), so the same engine drives
sites with completely different markdown pipelines — e.g. [ecnordic.ski](https://ecnordic.ski)
(remark→rehype directive pipeline) and [907.life](https://907.life) (plain `remark-html`).

## Status

**Early (`0.1.x`) — works, API not yet frozen.** The core was built *inside ecnordic.ski first*
(the richer proving ground) with the cairn-core ↔ site-adapter seams designed in from day one,
then extracted into this package and validated on a second design (907.life). The auth, GitHub
commit path, Carta preview, the adapter contract, and the shared admin shell (`/sveltekit`
server logic + `/components` Svelte UI) all run on both sites. The adapter API may still change
before `1.0` (pending a forward-compatibility review) — pin a caret range and expect 0.x churn.

## Install

```sh
npm install cairn-cms
```

Peers: `svelte@^5`, `@sveltejs/kit@^2`, and `carta-md@^4.11` (the editor component). Each site
implements a `CairnAdapter` (see `docs/PLAN.md`) and mounts thin `/admin` route shims around
`cairn-cms/sveltekit` (server logic) and `cairn-cms/components` (the admin UI).

## How it's developed

This repo lives in a dev meta-workspace alongside its consumer sites:

```
~/Projects/cairn/                 # npm workspace root (not a git repo)
  cairn-cms/        ← this repo
  ecnordic-ski/     ← consumer (first proving ground)
  907-life/         ← consumer (second design, validates the abstraction)
```

npm workspaces symlink `cairn-cms` into each site's `node_modules` for zero-publish local
dev. In CI, each site pins a published version so deploys stay reproducible.

See **`docs/PLAN.md`** for the full architecture, locked decisions, phased passes, and
risk register.
