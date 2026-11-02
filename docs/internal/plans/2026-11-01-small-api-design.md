# small-api design note

## Brief

Just-in-time note for run sheet pass 3, cut forward as a slice, with pass 2's shape 8 added as the
first task. Initiative: none applies; the run is recorded at
`~/.local/state/cairn-agent-first/design-audit/`. Geoff approved the scope in `design.md`, "3. Small API
with P9", and the run sheet, so this note decides only what those left to the plan. No separate spec.

Approving it takes about 40 names, three subpaths, and every re-export off the public surface, renames
the markdown component concept to block, and removes the options no site sets. The surface drops from
501 entries to a set where one name has one import path, enforced by `check:surface`.

## Outcome

A developer imports each public name from one subpath. `/delivery` loads under plain Node, `/public`
holds both public components, and `/admin` holds `CairnAdmin`, `CairnAdminShell`, and `CsrfField`. Internals
leave the barrels, the code stays behind `createCairnAdmin`, and `check-surface-reexports.json` is gone.

## Calls the design left to this plan

**The internal entry point.** Add one package export, `./internal`, from a new `src/lib/internal.ts`.
It carries the four names `virtualSource` needs (`buildSiteManifest`, `formatManifest`, `verifyManifest`,
`verifyReferences`) and the four the moved seed bin needs (`parseMediaManifest`, `HASH_RE`, `R2_EXT_RE`,
`r2Key`). `@sveltejs/kit` 3.0.1, the version this repo installs, exports `./internal`, so the name follows
the framework this package is built on. `surfaceSubpaths()` skips the key, so the entry has no tier, no
surface row, and no semver promise. Its header comment says that. One entry beats a copy of the media
helpers in the dev package, since `r2Key` validates with the regexes it would have to duplicate.

Probed on a copy of `dist` at `f89fe83be`, with a key named `./internal/manifest`. Plain Node imported the
entry and printed `function 4`. `publint --strict` printed `All good!`. `attw`, with the rules
`check:package` ignores, printed `No problems found`.

**`/delivery` free of kit at load.** Resolve `error` with `(await import('@sveltejs/kit')).error` on the two
404 paths, as `shape.md` 5 proposes. Both sit in async functions (`public-routes.ts:223`, and `markdownLoad`).
Probed: the two rewrites applied to `dist/delivery/public-routes.js`, and plain Node run from `/tmp` imported
`dist/delivery/index.js` with `createPublicRoutes` a function. The sheet's `/delivery/data` set-aside is
therefore not expected to fire.

**The leak gate.** `deriveTypeCheckerLeaks` is global already: `exportedAnywhere` at
`check-surface-leaks.mjs:247-248` admits a type exported from any subpath. `deriveRendererLeaks` is the
per-subpath model, and its `:396` line, `if (other === home || name in model[other]) continue;`, would flag
every type that loses a re-export. Retire the renderer model and its registry rows. This also answers the
`cleanup-one-import-path` reopen condition: the gate follows a type across subpaths.

**`createAdminAction`'s file.** The export goes from `sveltekit/index.ts`, and `AdminActionOptions` loses
`isDev` and `access`. `section-action.ts:232` passes neither, as `design.md`'s E4 correction expects, so
`admin-action.ts` keeps the handler argument and its one internal caller. `UnauditedActionError` and the
`AdminAction*` audit types stay public, per the design's "What stays".

**Internal `Component*` files keep their names.** `ROADMAP.md`'s rename lists the public API, UI strings,
docs, and the scaffold file. It doesn't list `ComponentForm.svelte`, `ComponentInsertDialog.svelte`, or
`component-grammar.ts`. Leaving them keeps the rename off admin-rest's `ComponentForm.svelte` hunks.

**`EntryData` (#230).** `EntryData<S extends SiteResolver = SiteResolver>` is a conditional over the resolver
type: for `TypedSiteResolver<A>`, a union over `A['content']`, and otherwise today's interface shape. The
generic sits on the resolver because TypeScript can't infer `A` through the `SiteResolver<A>` conditional.
Probed with `tsc --strict`: inference from `createPublicRoutes({ site })`, narrowing on `data.concept`
including a `@ts-expect-error` on the other arm, the untyped default, widening a typed value to the
default, and `PreviewData` as an intersection all compile. The sheet's wiring section listed it as may-set-aside,
and pass 3's "May not" doesn't list it, so it may be set aside here.

**`preview.bodyClass`.** It's a W1 row and `design.md` says "a few path options" without naming it. The ruling
`cleanup-unset-options` covers it ("options and field kinds no site sets are removed"), and no site sets it, so
it goes. `siteConfigPath` goes from the adapter; `runtime.siteConfigPath` stays, set from
`DEFAULT_SITE_CONFIG_PATH`.

**`createNavRoutes`.** It's outside E9's list. It stays public, and T5 files a backlog item.

## Class

The sheet says `ordinary` plus `runner`. The path map disagrees for three edits: `auth-routes.ts:240` (shape 8),
the `(site)/preview/[token]/+page.server.ts` route and its template copy (shape 10), and the comments naming
`createAdminAction` in `hooks.server.ts` and `admin/signups/`. So T1 and T5 are `auth-data`. The sheet's merge word
already covers this: an `auth-data` path adds the security read and the live smoke. No design change, and it's
recorded in `## Decisions`. The plan review runs three lenses, the fold, and a verification read for the same reason.

## Out of scope

P9 and everything else PR #180 took. Shape 10's mint and revoke half and `PreviewMintOutcome`'s date type, since
both fall with E9. `tokensMatch`, which is pass 1a's. #200, whose files this pass doesn't rewrite. #190's ordering and
#122's reorder, which admin-rest T3 owns in `preview.ts`.

## End-to-end check

The showcase builds and its suite passes on the new names. A scaffolded site installs from the packed tarball through
`check:template`. `check:surface` fails on a name added to a second subpath, proved by a fixture in `check-surface.test.ts`.

## Steps only Geoff can do

None. Every credential the live smoke needs is local (`wrangler dev`, a D1 row).
