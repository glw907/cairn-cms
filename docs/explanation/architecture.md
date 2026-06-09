# Architecture

cairn is a CMS that lives inside your SvelteKit site and commits to git. An editor logs in by
email, writes markdown next to a live preview, and hits Save; the save becomes a commit on
`main`, and your deploy does the rest. cairn is design-agnostic. The engine ships the
machinery; your site supplies an adapter declaring its content concepts, its frontmatter
schema, its slug codec, and its `render` method. Two sites can run the same engine version
and look nothing alike.

This page draws the picture: what the engine owns, what your site owns, and what happens
between Save and the redeployed page.

## The layered model

```mermaid
flowchart TB
  subgraph site["Consumer site (SvelteKit on Cloudflare)"]
    adapter["adapter: concepts, schema, slug codec, render"]
    shims["admin + delivery route shims"]
  end
  subgraph engine["@glw907/cairn-cms (the engine)"]
    core["core (.): runtime, render, content graph, auth, GitHub App"]
    components["/components: admin UI"]
    sk["/sveltekit: route factories"]
    delivery["/delivery: public read model"]
  end
  store["content in git + the manifest"]
  d1[("D1: sessions, tokens, editors")]
  site --> engine
  engine --> store
  engine --> d1
```

Three things sit in the picture. The engine is the `@glw907/cairn-cms` npm package, exposing
its surface through subpath exports: the root `.`, `/components`, `/sveltekit`, `/delivery`,
and a few narrower entries. Your site is a full SvelteKit app on Cloudflare: you own the
code, you import the engine, you supply the adapter, and you mount the route shims SvelteKit
requires. In return the engine hands you two surfaces: `/admin`, the editing app, and the
delivery surface, the public read model your own pages call.

The engine is fat and your site is thin. That's deliberate: anything security-critical or
fix-prone (auth, the commit path, the admin shell, the render machinery) lives in the engine,
so when something needs fixing you bump a version instead of patching sites. What you own is
presentation: the adapter, the component registry data, the CSS, and the thin route shims.

## The engine and site line

The engine owns the runtime: the magic-link auth on D1, the `/admin` guard, the GitHub-App
commit path, the admin shell and components, the SvelteKit route factories, and the render
pipeline machinery. You own the adapter and the presentation.

The seams are where your code plugs in:

- The adapter contract, the single `CairnAdapter` object the engine consumes.
- The slug codec, which maps a content id to a public URL and back.
- The frontmatter schema, one `defineFields` declaration per concept that drives the editor
  form, the validator, and the inferred frontmatter type at once.
- The `render` method, your one markdown-to-HTML function, which the editor preview and every
  public page call.
- The `CairnExtension` seam, the typed, build-time-composed way you add nav entries, admin
  routes, components, field types, or commit hooks without forking the engine.

See [the content model](./content-model.md) for the schema and concept detail, and
[the core reference](../reference/core.md) for the seam signatures.

## The commit and publish flow

A save is a commit. When an editor hits Save, the admin app sends the edited file to the
GitHub App, which commits it to `main`. The committer is `cairn-cms[bot]` and the author is
the editor, so the git history records who wrote each change while the machine identity does
the writing. The push triggers your existing Cloudflare build, which redeploys. Commit is
publish. No separate publish step, no review queue.

```mermaid
sequenceDiagram
  actor Editor
  participant Admin as Admin (/admin)
  participant App as GitHub App
  participant Repo as GitHub repo (main)
  participant CI as Cloudflare build
  Editor->>Admin: edit markdown, save
  Admin->>App: request commit (author = editor)
  App->>Repo: commit as cairn-cms[bot]
  Repo->>CI: push triggers build
  CI-->>Editor: site redeploys
```

The GitHub App holds a machine identity separate from the editor's magic-link session. See
[the security model](./security-model.md) for the commit trust model and how the two
identities relate.

## The render pipeline shape

Author markdown runs through one render pipeline. It parses the markdown with the unified
toolchain, dispatches any directive components through your component registry, and passes
the result through a sanitize floor before emitting HTML, which your site delivers with
`{@html}`. The same `render` runs in the editor preview and on the public page, so the author
sees the live design while editing.

The sanitize floor is the primary XSS control. It runs on every render by default. A second
post-dispatch guard covers a component's `build()` output, which the floor runs too early to
see. See [the security model](./security-model.md) for the floor, the allowlist
extension point, and the guard.

## Distribution and versioning

The engine ships to public npm as `@glw907/cairn-cms` under MIT. It is in `0.x`, where a
minor bump can carry a breaking change, so pin a version range and read the changelog before
upgrading. The subpath exports (`.`, `/components`, `/sveltekit`, `/delivery`, and the
narrower entries) are the supported surface; importing from a deep path inside `dist` is not.
Your site tracks the engine by semver and regenerates its lockfile, so an engine fix
propagates on your next bump.

See [the core reference](../reference/core.md) for the engine API and the
[reference index](../reference/README.md) for one page per export subpath.
