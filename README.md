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

**`0.4.x` — auth on [better-auth](https://better-auth.com); API not yet frozen.** The core was
built *inside ecnordic.ski first* (the richer proving ground) with the cairn-core ↔ site-adapter
seams designed in from day one, then extracted into this package and validated on a second design
(907.life). Editor auth runs on **better-auth (Cloudflare D1 + magic-link)** behind a scanner-safe
**POST-confirm** flow, with two-tier `owner`/`editor` roles; the GitHub-App commit signer stays
bespoke. The GitHub commit path, Carta preview, the adapter contract, and the shared admin shell
(`/sveltekit` server logic + `/components` Svelte UI + `/auth`) all run on both sites. Pin a caret
range and expect 0.x churn.

> **Breaking in `0.4.0`** (from `0.3.x`): editor auth moved off the hand-rolled magic-link/KV/
> signed-cookie stack onto better-auth. Each site now needs a **D1 binding** (`AUTH_DB`) +
> committed migrations, an `AUTH_SECRET`, a `/api/auth/[...all]` catch-all + `/admin/auth/confirm`
> shims, and the new `better-auth` + `drizzle-orm` peer deps. Magic links are now POST-confirm
> (a confirm page, not a GET link).

## Install

```sh
npm install @glw907/cairn-cms
```

Peers: `svelte@^5`, `@sveltejs/kit@^2`, and `carta-md@^4.11` (the editor component). Each site
implements a `CairnAdapter` (see `docs/PLAN.md`) and mounts thin `/admin` route shims around
`@glw907/cairn-cms/sveltekit` (server logic) and `@glw907/cairn-cms/components` (the admin UI).

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
