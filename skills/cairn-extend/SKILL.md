---
name: cairn-extend
description: Build or change anything in a cairn site that touches /admin, a form action, logging, or one of the engine's seams. Load before writing a custom admin screen, a new login channel, a form action with more than two outcomes, or any code that imports from @glw907/cairn-cms. Routes to the matching seam and its shipped recipe rather than inventing a pattern from scratch.
---

# cairn extend

## The DaisyUI question

Ask this before writing any admin markup, not after: does DaisyUI already ship this component,
and if a home-grown one is the answer instead, is there a dated ruling in
`docs/internal/engine-rulings.md` recording the DaisyUI defect that forces it? A home-grown
component the ledger does not explain is a finding to raise, not a pattern to copy.
`references/daisyui-first.md` carries the current answer for every place cairn's own admin
already diverges from stock DaisyUI, and why.

## The router

Each row names a pattern, the atom that builds it, the seam it lives behind, and the shipped
recipe that documents it end to end. The `docs/internal/facts/extend.md`,
`docs/internal/engine-rulings.md`, and `docs/internal/admin-design-system.md` paths this skill
and its references cite live in the cairn-cms source repository
(https://github.com/glw907/cairn-cms), not in the installed package; look them up there. So does
`examples/showcase`, whose routes back each recipe below and open with an `Archetype:`/`Atoms:`/
`Recipe:` header naming the pattern and the engine calls it proves.

| Building | Atom | Seam | Recipe |
|---|---|---|---|
| A custom admin screen over your own data | `createSectionAction` + `requireAccess` | `@glw907/cairn-cms/sveltekit`'s admin-scoped `locals.cairnEditor` | `node_modules/@glw907/cairn-cms/docs/extend/add-a-custom-admin-screen.md` |
| A second audience's own login channel | `createAuthChannel` (the exemplar's own `memberChannel`) | `/auth-channel`'s factory, on its own D1 binding, never `AUTH_DB` | `node_modules/@glw907/cairn-cms/docs/extend/add-a-second-audience.md` |

**A custom admin screen over your own data.** `createSectionAction<Env, Db>({ resolveDb })`
builds a reusable per-section action wrapper that resolves the site's own `App.Platform['env']`
binding; it and `requireAccess` in the route's `load` share one fail-closed predicate, so a
session the access map does not admit is refused on both the read and the write. A matched
SvelteKit form action dispatches directly and never re-runs an ancestor `load`, so a page that
looks gated is not a gated POST: wire both `createSectionAction` and `requireAccess`, never one
alone.

**A second audience's own login channel.** `createAuthChannel` builds request, confirm, and
logout actions over a numeric code (8 digits by default, configurable to 10), each action taking
the raw SvelteKit `RequestEvent` and switching on its own outcome, never a boolean.

## Two habits that hold across both rows

- **Switch on `outcome`, never a boolean.** Every seam above returns a discriminated result
  (`ChannelRequestOutcome`, `ChannelConfirmOutcome`, and the like) instead of a `success: boolean`
  flag. A form action with more than two outcomes follows the same shape: name each branch, do
  not collapse them into `ok`/`not ok`.
- **Log through `createLogger`, never a bare `console` call.** The `/log` subpath exports the
  same factory cairn's own logger is built from: `area.subject.verb_phrase` event names,
  redaction that walks three levels into a record's values, and a record that never throws out of
  the call site. A site wiring its own admin screen or channel gets the same structured,
  safe-to-paste record the engine's own events already are.

## Before you call it done

`references/preflight.md` is the checklist: the boundary question, what `cairn-guidance check`
reports about a site's own gate wiring, and when a second workaround is the signal to reach for
`cairn-consult` instead of a third one.

## Adding a new archetype

Do not add a row to this table: `cairn-guidance install` overwrites this file on every upgrade.
Record a new archetype in your own site's docs instead.
