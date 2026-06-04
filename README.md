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

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands. See the [ROADMAP](./ROADMAP.md) for what is planned and the
[CHANGELOG](./CHANGELOG.md) for what changed.

Editor auth is self-owned: an atomic single-use magic-link token, a POST-confirm flow, opaque
D1-backed session rows, and two-tier `owner`/`editor` roles. There is no better-auth, Drizzle,
or ORM. Pin a caret range and read the CHANGELOG before bumping; every breaking entry carries a
"Consumers must" line.

A contributor who feels inspired is welcome to open an issue or a discussion to start a
conversation. There is no formal contribution process yet, so this is not an open call for
pull requests.

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

## Documentation

The [`docs/`](./docs/README.md) tree is organized in four arms: a tutorial that builds a first
site end to end, how-to guides for each setup task, a reference for every package export, and
explanation pages for the architecture and design rules. Start at the
[documentation index](./docs/README.md). The [security policy](./SECURITY.md) covers reporting
and the security posture.

## How it's developed

This is a standalone repo. Consumer sites install the published package from the npm registry by
version range. The library's own development proves changes against `examples/showcase`, a
self-contained SvelteKit site that consumes the package through the relative `file:../..` path, so a
change is exercised end to end before it publishes.

The historical rebuild plan and the early architecture writeups live under `docs/internal/`.
They are kept for history and are not current.
