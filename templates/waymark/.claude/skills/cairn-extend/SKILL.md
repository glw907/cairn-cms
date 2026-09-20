---
name: cairn-extend
description: Build or change anything in a cairn site that touches /admin, a form action, logging, or one of the engine's seams. Load before writing a custom admin screen, a new login channel, a form action with more than two outcomes, or any code that imports from @glw907/cairn-cms. Routes to the matching seam and its showcase exemplar rather than inventing a pattern from scratch.
---

# cairn extend

This skill teaches an agent building on top of a cairn site where to reach for an existing seam
instead of hand-rolling one. It never edits the engine itself.

## The DaisyUI question

Ask this before writing any admin markup, not after: does DaisyUI already ship this component,
and if a home-grown one is the answer instead, is there a dated ruling in
`docs/internal/engine-rulings.md` recording the DaisyUI defect that forces it? A home-grown
component the ledger does not explain is a finding to raise, not a pattern to copy.
`references/daisyui-first.md` carries the current answer for every place cairn's own admin
already diverges from stock DaisyUI, and why.

## The router

Each row names a pattern, the atom that builds it, the seam it lives behind, a worked example in
the engine's own `examples/showcase`, and the fact and ruling that back the choice. The
`docs/internal/facts/extend.md`, `docs/internal/engine-rulings.md`, and
`docs/internal/admin-design-system.md` paths this skill and its references cite live in the
cairn-cms source repository (https://github.com/glw907/cairn-cms), not in the installed package;
look them up there.

| Building | Atom | Seam | Exemplar |
|---|---|---|---|
| A custom admin screen over your own data | `createSectionAction` + `requireAccess` | `@glw907/cairn-cms/sveltekit`'s admin-scoped `locals.cairnEditor` | `examples/showcase/src/routes/admin/signups/+page.server.ts` |
| A second audience's own login channel | `createAuthChannel` (the exemplar's own `memberChannel`) | `/auth-channel`'s factory, on its own D1 binding, never `AUTH_DB` | `examples/showcase/src/routes/members/login/+page.server.ts` |

**A custom admin screen over your own data.** `createSectionAction<Env, Db>({ resolveDb })`
builds a reusable per-section action wrapper that resolves the site's own `App.Platform['env']`
binding; it and `requireAccess` in the route's `load` share one fail-closed predicate, so a
session the access map does not admit is refused on both the read and the write. Source fact:
`docs/internal/facts/extend.md`, under `docs/extend/add-a-custom-admin-screen.md`, the
`createSectionAction<Env, Db>({ resolveDb })` bullet. Why: `docs/internal/engine-rulings.md`,
ruling `audit-sveltekit-createsectionaction` (kept: a matched SvelteKit action dispatches
directly and never re-runs an ancestor load, so a page that looks gated is not the same as a POST
that is).

**A second audience's own login channel.** `createAuthChannel` builds request, confirm, and
logout actions over a numeric code (8 digits by default, configurable to 10), each action taking
the raw SvelteKit `RequestEvent` and switching on its own outcome, never a boolean. Source fact:
`docs/internal/facts/extend.md`, under `docs/extend/add-a-second-audience.md`, the
`createAuthChannel` request/confirm/logout bullet. Why: `docs/internal/engine-rulings.md`, ruling
`audit-auth-createauthchannel` (kept on adoption evidence: a consumer site had already built its
own member login on the factory before the alternative, shrinking it to a recipe, could ship).

Both exemplar files open with the same header shape: an `Archetype:` line naming the pattern, an
`Atoms:` line naming the engine calls it proves, and a `Recipe:` line pointing at the narrative
page that will document it once written. Read that header before reading the rest of the file; a
route added later that opens the same way belongs in this table too.

## Two habits that hold across every row

- **Switch on `outcome`, never a boolean.** Every seam above returns a discriminated result
  (`ChannelRequestOutcome`, `ChannelConfirmOutcome`, and the like) instead of a `success: boolean`
  flag. A form action with more than two outcomes follows the same shape: name each branch, do
  not collapse them into `ok`/`not ok`.
- **Log through `createLogger`, never a bare `console` call.** The `/log` subpath exports the
  same factory cairn's own logger is built from: `area.subject.verb_phrase` event names, three
  levels of key-based redaction, and a record that never throws out of the call site. A site
  wiring its own admin screen or channel gets the same structured, safe-to-paste record the
  engine's own events already are.

## Before you call it done

`references/preflight.md` is the checklist: the boundary question, the gates a site's own
`cairn-guidance` install wires up, and when a second workaround is the signal to reach for
`cairn-consult` instead of a third one.
