# cairn-cms

An embedded, **magic-link**, GitHub-committing CMS for SvelteKit + Cloudflare sites.
Non-technical authors log in by email (no GitHub account, no password), edit **raw markdown**
in a client-only CodeMirror editor with a live preview, and save. Each save commits to `main`
via a **GitHub App** (committer = `cairn-cms[bot]`, author = the editor) and auto-deploys.

It is **design-agnostic**. Each consumer site supplies an adapter (the content contract through
`defineAdapter`/`defineFields`, the slug and permalink rules, and its render configuration), so the
same engine drives sites with completely different markdown pipelines. Two run in production today:
[ecnordic.ski](https://ecnordic.ski) (a remark-to-rehype directive pipeline) and
[907.life](https://907.life) (the engine's own `createRenderer`). Content is a fixed set of
first-class concepts (Posts and Pages), not open-ended collections.

## Status

`0.x`, published to public npm as `@glw907/cairn-cms` (MIT). The API still churns between minor
versions, so pin a caret range and read the [CHANGELOG](./CHANGELOG.md) and `docs/upgrading.md`
before bumping. Editor auth is self-owned: an atomic single-use magic-link token, a POST-confirm
flow, opaque D1-backed session rows, and two-tier `owner`/`editor` roles. There is no better-auth,
Drizzle, or ORM. The current version, the published-versus-unpublished window, and the next action
live in [`docs/STATUS.md`](./docs/STATUS.md).

## Install

```sh
npm install @glw907/cairn-cms
```

Peer dependencies: `svelte@^5` and `@sveltejs/kit@^2`. A consumer site implements a `CairnAdapter`
and mounts thin `/admin` route shims around the package subpaths:

- `@glw907/cairn-cms`: the core engine and adapter contract.
- `@glw907/cairn-cms/sveltekit`: the server load and action logic.
- `@glw907/cairn-cms/components`: the admin Svelte UI.
- `@glw907/cairn-cms/delivery` and `/delivery/data`: the public read model (indexes, feeds,
  sitemap, SEO head). The `/delivery/data` barrel is node-safe, with no `@sveltejs/kit` in its graph.
- `@glw907/cairn-cms/vite`: the `cairnManifest()` Vite plugin, paired with the `cairn-manifest` bin,
  that builds and verifies the committed content manifest at build time.

Each site binds a Cloudflare D1 database as `AUTH_DB` (the editor allowlist, sessions, and single-use
magic tokens) and a `[[send_email]]` binding named `EMAIL`. The worked reference for every shape is
`examples/showcase`.

## How it's developed

This is a standalone repo. Consumer sites install the published package from the npm registry by
version range. The library's own development proves changes against `examples/showcase`, a
self-contained SvelteKit site that consumes the package through the relative `file:../..` path, so a
change is exercised end to end before it publishes.

See the functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md` for
the locked architecture and the test plan, and `docs/STATUS.md` for where the work is now. The older
`docs/PLAN.md` and `docs/ARCHITECTURE.md` remain only as history.
