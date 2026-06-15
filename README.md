# cairn-cms

A CMS that lives inside your SvelteKit site and commits to git. Your editors log in with an
email link (no GitHub account, no password), write raw markdown in a CodeMirror editor with a
live preview, and hit Save.

When they hit Save, cairn doesn't write to a database. It commits the markdown to a holding
branch in the repo, one branch per entry, where the edit waits until the editor hits Publish.
Publish copies the held content to `main`, and from there your normal Cloudflare deploy takes
over, the same as if you'd pushed from a terminal. Every commit goes through a GitHub App, so
the editor never touches GitHub; they still show up as the commit author, and `cairn-cms[bot]`
does the signing. If someone else changed the file mid-edit, cairn refuses the save instead
of guessing how to merge.

## How it fits your site

cairn is an engine your site imports, not a platform you deploy to. The engine owns the
machinery that has to be right: the magic-link auth, the commit path, the admin app, the
render pipeline and its sanitize floor. Your site owns everything a visitor sees: the adapter
(your content concepts, frontmatter schema, and slug rules through
`defineAdapter`/`defineFields`), your markdown pipeline, your CSS. Two production sites run
the same engine today and look nothing alike: [ecnordic.ski](https://ecnordic.ski) renders
through its own remark directive pipeline, [907.life](https://907.life) through the engine's
`createRenderer`.

## What cairn is not

- Not a hosted platform. There is no cairn server; the admin ships inside your site's Worker
  and your repo is the source of truth.
- Not a database CMS. Content is markdown files in your repo, so it outlives the tool and
  never needs an export.
- Not an open-ended collection builder. Content is a fixed set of first-class concepts (Posts
  and Pages today), each with its own behavior, because the engine should have an opinion
  about what a Post is.

## The stack is chosen for you

SvelteKit on Cloudflare Workers, D1 for the auth store, GitHub for content. cairn is
deliberately opinionated: if that stack matches yours, the pieces click together, and if it
doesn't, cairn is the wrong tool and will not try to meet you halfway.

## Start here

1. **[Build your first cairn site](./docs/tutorial/build-your-first-cairn-site.md)**, the
   tutorial, takes you from an empty directory to a deployed site with a working `/admin`.
2. **[`examples/showcase`](./examples/showcase)** is a complete consumer site wired to the
   engine, and the worked reference for every shape in the docs. When a guide says "mount the
   admin," the showcase shows the mounted result.
3. **[The docs](./docs/README.md)** are organized in four arms: the tutorial, task guides,
   one reference page per export, and explanation pages for the architecture and design
   rules.

## Status

cairn-cms runs the two production sites above. It is `0.x`, and the version position signals scale.
A minor bump (`0.X.0`) is reserved for a new subsystem or public surface that did not exist before,
such as a new entry point, a new content concept, or the scaffolder, and it may break. Everything
that refines, extends, or adds an affordance to a surface that already exists (the editor, the admin,
auth, delivery) is a patch (`0.X.Y`), even when it gives an editor a new thing to do; a redesign, a
round-trip edit on an existing surface, or a new optional config field is a patch. When the call is
unclear, it is a patch. A minor release carries a `<!-- release-size: minor -->` marker in its
CHANGELOG entry, which the `check:version` gate requires, so a minor is always a deliberate,
documented choice. Pin a caret range and read the [CHANGELOG](./CHANGELOG.md) before taking a minor;
every breaking entry carries a "Consumers must" line. The author is still working through the core-feature
[ROADMAP](./ROADMAP.md), and the project stays closely held until that core lands. A
contributor who feels inspired is welcome to open an issue or a discussion; there is no
formal contribution process yet, so this is not an open call for pull requests.

## Install

```sh
npm install @glw907/cairn-cms
```

Peer dependencies: `svelte@^5` and `@sveltejs/kit@^2.12`. A consumer site implements a
`CairnAdapter` and mounts the whole `/admin` with one catch-all route over the package subpaths:

- `@glw907/cairn-cms`: the core engine and adapter contract.
- `@glw907/cairn-cms/sveltekit`: the server load and action logic.
- `@glw907/cairn-cms/components`: the admin Svelte UI.
- `@glw907/cairn-cms/delivery` and `/delivery/data`: the public read model (indexes, feeds,
  sitemap, SEO head). The `/delivery/data` barrel is node-safe, with no `@sveltejs/kit` in
  its graph.
- `@glw907/cairn-cms/vite`: the `cairnManifest()` Vite plugin, paired with the
  `cairn-manifest` bin, that builds and verifies the committed content manifest at build
  time.

Each site binds a Cloudflare D1 database as `AUTH_DB` (the editor allowlist, sessions, and
single-use magic tokens) and a `[[send_email]]` binding named `EMAIL`. The
[security policy](./SECURITY.md) covers reporting and the security posture.

## How it's developed

This is a standalone repo. Consumer sites install the published package from the npm registry
by version range. The library's own development proves changes against `examples/showcase`,
which consumes the package through the relative `file:../..` path, so a change is exercised
end to end before it publishes. The historical rebuild plan and the early architecture
writeups live under `docs/internal/history/` and are not current.
