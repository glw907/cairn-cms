# Render-authoring surface design (DX-completeness pass A)

Part of the DX-completeness sweep, the cleanup phase that runs after the engine-hardening series and
before the gallery and the `create-cairn-site` scaffolder (see `docs/STATUS.md`, "Sequence to the
scaffolder"). The sweep decomposes into three independent passes by verification surface. This is Pass A,
the render-authoring surface. Passes B (tooling and CI robustness) and C (admin and consumer alignments)
get their own specs when their turn comes.

## Goal

Carve a public `@glw907/cairn-cms/render` authoring subpath, relocate the component-authoring helpers off
the root barrel onto it, re-home `isElement`, and land the render-authoring ergonomics the P3 pass carried
forward. Drop `rehypeDispatch` from the public surface. The result is one cohesive import a component
author and the scaffolder template both reach for, and a root barrel that stays lean.

## Why now, and the prior art

Pass 1 narrowed the root barrel but left the component-authoring helpers (`iconSpan`, `cardShell`,
`headRow`, `rehypeDispatch`) on root, dropped `isElement` entirely (ecnordic inlined a copy), and its
carry-forward deferred the dedicated-subpath decision to "where that surface is next in scope." The
scaffolder templates component authoring next, so this is that moment, and the unpublished window with two
sites we own is the cheapest time to relocate.

The shape follows cairn's own architecture and the wider ecosystem. cairn already splits its surface at
coupling boundaries: `/delivery/data` for node-safety, `/delivery/head` for the one Svelte component,
`/sveltekit` for the framework glue, `/components` for the admin UI, `/vite` for the build plugin. The
render-authoring helpers are the one coupling cluster still on root: they pull in the hast and hastscript
surface and only a site that authors components through `build(ctx)` needs them. The same role-named
subpath pattern is the norm elsewhere, including Node's `node:fs`, SvelteKit's `$app/*`, Keystone's
`@keystone-6/core/fields`, and the focused hast utility packages cairn renders with.

## The `/render` surface

A new public subpath built as a curated single-file entry, mirroring the `delivery/head` pattern. A new
`src/lib/render/authoring.ts` re-exports only the authoring toolkit, and a `./render` stanza in
`package.json` `exports` points at `dist/render/authoring.{d.ts,js}`. The entry is curated, so the
internal-only helpers (`strProp`, `markFirstList`, `dataAttrProp`) stay internal even though they live in
the same source modules.

`/render` exports:

- `iconSpan`, `cardShell`, `headRow` (relocated from the root barrel)
- `isElement` (re-homed from internal; ecnordic can drop its inlined copy)
- `strAttr` (new, see the ergonomics section)
- types `MakeIcon` (relocated from root) and `ComponentContext` (re-homed from internal, needed for the
  `strAttr` signature)

Dropped from the root barrel: `iconSpan`, `cardShell`, `headRow`, `rehypeDispatch`, and the `MakeIcon`
type. `isElement`, `strAttr`, and `ComponentContext` are net-new to the public surface and reachable only
through `/render`.

Stays on root: `createRenderer` and `RendererOptions` (the render entry every site calls), `defineRegistry`
and the registry and component types, `glyph` and `IconSet`, the component-grammar, component-validate,
component-insert, and component-reference helpers, and `remarkDirectiveStamp`. These are core config and
admin surface, not the component-authoring toolkit.

## `rehypeDispatch`: dropped from the public surface

`rehypeDispatch` is the rehype transformer that turns stamped component directives into rendered markup. It
walks the hast tree, looks each stamped primitive up in the registry, and runs its `build(ctx)` to replace
the placeholder, stamping inert `data-rise` ordinals when `stagger` is on. `createRenderer` wires it into
the rehype chain at one specific position, after the sanitize floor and `rehype-raw` and before slug,
anchorRel, and the sink guard.

It is dropped from the public surface in this pass (removed from the root barrel, not added to `/render`).
The reasoning, recorded so a later reader does not re-litigate it:

- It is not authoring. The `/render` subpath is the toolkit a `build()` reaches for. `rehypeDispatch` is
  pipeline plumbing, a different role, and including it would blur the subpath's identity.
- No consumer needs it. The blessed entry is `createRenderer`. Using `rehypeDispatch` directly means
  hand-assembling the whole chain in the correct order, including the sanitize floor and the sink guard
  the render-safety and sink-hardening passes added. A public transformer invites a hand-rolled pipeline
  that drops sanitization, so keeping `createRenderer` the single public path keeps the safe ordering the
  only public path.
- Pass 1 narrowing plus YAGNI. Nothing imports it (the showcase does not; the package's own tests import
  it directly from its module, not the barrel, so they are unaffected). Re-exposing it later is additive
  and non-breaking, so if a real custom-pipeline need appears it can be exposed deliberately as part of an
  advanced-rendering surface, with the required plugin ordering documented.

Internal code keeps importing `rehypeDispatch` from its module (`./rehype-dispatch.js`), so the pipeline is
unaffected. This pass adds a short comment at the export site recording that the omission is deliberate.

## The render-authoring ergonomics

The P3 pass carried these forward; they belong on the render-authoring surface, so they land here.

`strAttr(ctx, key)` is new, exported from `/render`. It reads `ctx.attributes[key]` and returns
`string | undefined`, narrowing the `string | boolean` attribute value. It replaces the hand-rolled
`typeof ctx.attributes.x === 'string' ? ctx.attributes.x : undefined` boilerplate that recurs in every
string-reading `build()`, including the showcase config today.

`registry.iconField(name)` is a new method on the registry object beside `get` and `defaultIcon`. It hoists
the inline `def.attributes.find((f) => f.type === 'icon')` lookup that lives in `remark-directives.ts`. The
directive stamp calls the method instead of the inline find. Behavior is unchanged; the lookup moves to one
place.

The `defineRegistry` guard throws at declaration when a component sets `defaultIconByRole` but declares no
`type:'icon'` attribute, because the resolved default would have no field to render through and would
silently never appear. This is a loud-fail declaration-time check, matching the `normalizeConcepts` guards.
The showcase `alert` declares both a `defaultIconByRole` and a `type:'icon'` attribute, so it passes.

`headRow(title, icon?, level?)` takes a new `level` parameter defaulting to `2`, so the current `h2` output
and the render-pipeline snapshot stay byte-identical and a site can pass `3` for an `h3` head.

`iconField` returns the first declared icon field, which is already the behavior, so multiple `type:'icon'`
fields resolve first-wins. This pass locks that with a test and a doc line rather than a throw, since more
than one icon field is unusual but not invalid.

## Breaking-change handling, docs, and testing

The in-repo break is the showcase. Update `examples/showcase/src/lib/cairn.config.ts` to import
`cardShell`, `headRow`, and `iconSpan` from `@glw907/cairn-cms/render`, and adopt `strAttr` there to prove
the new helper through a real build. Update the root-barrel export test that pins the public surface.

For reference and packaging, add `docs/reference/render.md` mentioning every `/render` export, a `CONFIG`
entry in `scripts/reference-coverage.mjs` mapping `./render` to that page, and a `docs/reference/README.md`
index line, so `npm run check:reference` and `npm run check:package` pass. Add a `CHANGELOG.md` entry with a
`Consumers must:` line (move the render-authoring imports to `/render`) and a `docs/upgrading.md` line, since
this is a breaking public-surface change.

Testing is test-first per unit. Add unit tests for `strAttr`, `registry.iconField`, the `defineRegistry`
guard (the throw plus the valid both-declared case), the `headRow` level parameter, and the first-wins
resolution. The render-pipeline snapshot stays byte-identical (no `-u`), because the ergonomics are
additive or behavior-preserving and `headRow` keeps its default level.

## Versioning and release

A breaking minor, concretely `0.30.0`, assuming the engine-hardening series shipped `0.29.0` and the held
window published before this pass runs. The two production sites update their render-authoring imports when
they consume it, captured as one `upgrading.md` line. Publishing follows the cleanup-phase release cadence;
the exact batching is a release-step decision, not part of this pass.

## Scope boundaries

Out of scope: Pass B (the manifest-bin `cwd`-versus-`config.root` fix, the node-safety dist-spawn test, and
wiring the showcase E2E into a gate), Pass C (the `mintToken` async alignment and the link-picker
content-targets-only fix), the gallery initiative, and the scaffolder. The render internals that are not
part of the authoring toolkit stay internal, and `createRenderer` stays the one public render pipeline.

## Execution

Subagent-driven, one `cairn-implementer` per task, on `main` directly, the same as the hardening series. The
high-blast-radius work is the surface relocation, so the gate is the full suite plus the byte-identical
render-pipeline snapshot, `check:reference`, and `check:package`. The pass-end review gate is the simplifier
over the changed `src/lib/render` files plus a high-effort `/code-review` with attention to the curated
export set and the `defineRegistry` guard edges. The Worker, auth, and a11y reviewers and the live `/admin`
smoke do not apply; `svelte-reviewer` applies only if a `.svelte` file changes.
