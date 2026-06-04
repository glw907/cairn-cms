# DX backlog from the ecnordic 0.21 migration

The ecnordic-ski migration from `^0.10.0` to `^0.21.0` (the first full-surface consumer migration)
doubled as a DX audit of the cairn-cms consumer surface. The evidence and the full per-task detail
live in the site repo at `ecnordic-ski/docs/cairn-dx-findings.md`. This file is the engine-side
backlog: each item names the symptom, the consumer-facing surface, and the suggested fix, ranked by
what it costs a SvelteKit developer who has never seen cairn.

**Verdict.** A cairn site mostly feels native to a SvelteKit developer once it is on the idiomatic
surface. The public routes are the high point (`createPublicRoutes` returns a plain `load`/`entries`,
`CairnHead` is an ordinary `<svelte:head>` component, the `*Response` helpers collapse a feed
`+server.ts` to one call). Where cairn still surprises a SvelteKit developer, it is mostly defaults
the scaffolder should own and two pieces of data the engine already holds but does not surface.

## High: a correct SvelteKit instinct produces a surprise

1. **The delivery surface splits across the package root and `/delivery` with no signpost, and the
   `/delivery` barrel drags a `.svelte` component into a node test.** Some symbols
   (`parseSiteConfig`, `createSiteIndexes`, `verifyManifest`, `FeedItem`) resolve from the root; the
   route loaders, `CairnHead`, and the `*Response` helpers resolve only from `/delivery`. A wrong
   guess fails with a bare "not exported", and importing any delivery data helper pulls
   `CairnHead.svelte` into the module graph, so a node-environment unit test needs the Svelte vitest
   plugin to parse an engine file. Fix: document the root-versus-`/delivery` split with a one-line
   rule, or re-export the `/delivery`-only public symbols from root; and split the head component out
   of the data barrel (a `/delivery/head` entry) so a data import stays component-free.
   Evidence: SvelteKit-fit findings 4 and 8.

2. **`EntryData` carries no concept, so the catch-all `load` re-derives it.** `entryLoad` resolves
   any concept through `byPermalink` but returns an `EntryData` with no concept field, so a template
   that branches per concept reconstructs it (`data.entry.date ? 'posts' : 'pages'`), which breaks for
   a second dated concept or a dateless post. Fix: `EntryData` should carry the resolved concept id
   the descriptor matched. Evidence: SvelteKit-fit finding 6.

3. **`ContentSummary` omits the authored summary field, so a list that shows it re-reads the entry.**
   The summary carries a derived `excerpt`, not the authored `description`. A list that prints the
   authored summary does a per-entry `byId` detail read over a list the index already built. Fix: let
   a descriptor nominate a frontmatter field to surface on `ContentSummary` (a `summaryField` knob).
   Evidence: SvelteKit-fit finding 7.

4. **The dangling-token build backstop goes silent under an inherited
   `prerender.handleHttpError: 'warn'`.** A dangling `cairn:` token throws at prerender, but a site
   that inherited `handleHttpError: 'warn'` (the 907.life scaffold default) downgrades the 500 to a
   warning, so `npm run build` exits 0 and the "a dangling token fails the build" guarantee is lost.
   The link still fails closed (the page 500s), so nothing broken ships, but the build does not go red.
   Fix: the scaffolder must not emit `handleHttpError: 'warn'`, or must pair it with a targeted handler
   that re-throws the cairn link error; and the internal-links doc should state the guarantee depends
   on `handleHttpError` staying `'fail'` for that error. Evidence: ecnordic finding 16.

5. **A `cairn:` token resolves content concepts only, not arbitrary SvelteKit routes, and nothing
   says so.** `cairn:pages/crewlab` works, but a link to a hand-built `+page.svelte` route (ecnordic's
   `/waiver`) has no manifest id and dangles. The grammar spanning only content concepts is correct,
   but a SvelteKit developer reads both internal links the same way. Fix: state the constraint in the
   internal-links doc, and have the editor link picker offer only real content targets so a token
   cannot be minted for a route. Evidence: ecnordic finding 15.

## Medium: friction the first port hit, fixable with docs or a small helper

6. **Coupled breaking changes force a big-bang migration.** The 0.12 build signature and the 0.13
   adapter contract both gate compilation, so a consumer repo does not compile until the adapter and
   every component are ported together. Fix: a per-version `MIGRATION.md`, a codemod, or a deprecation
   window. Evidence: general finding 1.

7. **`splitHead` removed with no migration note, and its head markup is now the site's to rebuild.**
   The "first `##` is the title" helper is gone with no changelog pointer, and each titled component
   rebuilds the icon-plus-heading head by hand. Fix: a changelog entry naming the `title`-slot
   replacement, and an engine head helper (`ctx` plus a site `makeIcon`) the way `cardShell` and
   `iconSpan` already factor common shapes. Evidence: general finding 2.

8. **A build reads an attribute only when the component declares it, with no compile signal.** A build
   can call `ctx.attributes.icon` and get `undefined` at runtime if the component def omits the
   attribute declaration, with no type error. Fix: document that a build may read only declared
   attributes, or surface a dev warning when a build reads an undeclared key. Evidence: general
   finding 3.

9. **The alert role default falls in a gap between the two icon paths.** The stamper applies
   `defaultIconByRole` to its `dataIcon` marker, but a build reads the declared `dataAttr<icon>` path,
   where the default is never copied, so a `role=caution` alert with no explicit icon loses its glyph
   unless the build hardcodes the default. Fix: have the stamper also write the role default to
   `dataAttr<iconKey>` so `defineFields`/`defaultIconByRole` stays the single source. Evidence:
   general finding 4.

10. **The schema contract drops four validation rules with no per-field validator hook to restore
    them.** Versus the old hand-written validator, validate-once no longer checks a real calendar date,
    a date format, the closed `tags` vocabulary, or an at-least-one-tag requirement. The only escape is
    a `refine` block that puts the site back to owning a validator. Fix: add declarative, serializable
    field options (a real-date check on `date`, a `pattern` on `date`, an `enforced` flag on a `tags`
    field's `options`) so the closed vocabulary is validated, not just suggested. Evidence: general
    finding 5.

11. **`rehypeAnchorRel` forces `rel="noopener noreferrer"` and a `sanitizeSchema` extender cannot opt
    out.** The hardening runs last in the rehype chain, outside the one extension point a site is given,
    so adopting the engine render means inheriting it. Fix: make the `rel` policy a `createRenderer`
    option, or run it inside the reachable schema. Evidence: general finding 10.

12. **`AttributeField.options` is a mutable `string[]`, so a site cannot share one frozen option list
    across components.** Fix: accept a `readonly string[]` so a site can factor a shared `as const`
    vocabulary. Evidence: general finding 11.

13. **The manifest regenerate and the build backstop read the corpus through two different paths.**
    The build reads via Vite `import.meta.glob`; the regenerate script reads via `fs` and the loader
    shim, so a divergence could pass the build while the script writes a different file. Fix: a single
    engine-owned regenerate that shares the build's resolver. Evidence: general findings 12 and 13.

14. **Delete and rename are a one-line registration with no discovery signal.** The runtime exposes
    all four handlers, but a site that copied only `{ save }` from the 0.10 surface has a working
    delete and rename sitting unused with no type error or warning. Fix: the migration guide and the
    scaffolder route stub register all four actions by default. Evidence: general finding 14.

## Low: sequencing and authoring traps, fixable with docs

15. **A no-title panel must drop the inline label entirely, not write an empty `[]`.** The showcase
    and the `panel` insert template write `:::panel[]{...}`, and the empty `[]` parks a stray
    `<p></p>` ahead of the panel because `panel` has no title slot. Fix: show the no-title form without
    `[]`, and have the engine drop an empty label slot instead of parking it in the body. Evidence:
    general finding 6.

16. **The sanitize floor and the content rewrite produce one combined green gate, not two.** A site
    that ports content before reconciling its sanitize floor sees a red characterization gate for
    `rel`/`aria-label` deltas unrelated to the content, which reads as a content bug. The engine floor
    runs before the dispatch, so a site's allowlist only ever needs to cover its authored raw HTML, not
    the built directive output (ecnordic's reconciled extender shrank to a single `ariaLabel`). Fix: the
    migration guide should frame the floor as a replacement for any site-owned sanitize pass, state the
    pipeline ordering, and note the combined gate. Evidence: general findings 7, 8, and 9.

## Scaffolder checklist

The `create-cairn-site` work inherits these so a fresh site starts correct: emit the manifest wiring
whole (the script, the package script, the committed manifest, the verify backstop); emit a build
that fails closed on a dangling link (no `handleHttpError: 'warn'`); register all four admin actions
by default; import the whole public surface from one obvious place and keep the node-test path
component-free; teach the single engine sanitize floor with no site-owned second pass; and state the
`cairn:` link constraint (posts and pages, not routes) in the scaffolded content README.
