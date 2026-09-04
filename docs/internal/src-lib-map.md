# The `src/lib` map

`src/lib` is the shipped library: 23 directories plus six loose root files, about 60k lines.
`CONTRIBUTING.md`'s Repository map gives it one line ("the shipped library. Public entry points
are package subpaths"), which is the right amount of detail for a repository map and not enough
to orient a contributor or an agent who has never opened this tree. This page is that
orientation. It is a maintainer document, not a package artifact: `svelte-package` copies every
non-source file under `src/lib` into `dist`, so a map living there would ship inside the npm
tarball. This one lives under `docs/internal/` instead and ships nowhere.

Individual files move faster than this page can track. When the map and the tree disagree, trust
the tree and fix the map, the same rule `CONTRIBUTING.md`'s Repository map states for itself.

## 1. Public or internal, and how to tell

A directory is public exactly when `package.json`'s `exports` map points a subpath into it. Every
public directory has a matching page in `docs/reference/`, gated by `check:reference`; a directory
with no reference page is internal, per `CONTRIBUTING.md`'s own rule. Do not guess from a
directory's name or its neighbors: two of the four `auth*` directories below are internal, two are
public, and nothing about the alphabetical listing signals which.

**Public (13 directories, each a package subpath):**

- `sveltekit` (`/sveltekit`): everything a SvelteKit site wires into its routes; factories,
  wrappers, guards, and the data types they exchange. Section 2 below traces the request through
  four of its files.
- `components` (`/components`): the admin's Svelte UI, the shell, the per-view screens, and the
  composed dialogs and fields those screens mount.
- `admin-toolkit` (`/admin-toolkit`): general-purpose primitives a site builds its own admin
  screens from, distinct from `/components`, which is cairn's own screens.
- `islands` (`/islands`): the client runtime that mounts a site's live Svelte components over the
  static fallbacks the render pipeline emits.
- `render` (`/render`): the component-authoring toolkit a site's `build(ctx)` calls. Section 5
  below separates what this subpath defines from what it only re-exports.
- `delivery` (`/delivery`, plus `/delivery/head` and `/delivery/data`): the node-safe data surface
  and the SvelteKit catch-all route loaders a public page reads content through.
- `media` (`/media`): node-safe media config, manifest reads, and the `media:` reference codec;
  pulls in neither `@sveltejs/kit` nor `@cloudflare/workers-types`.
- `reproductions` (`/reproductions`, plus `/reproductions/manifest`): the Svelte-importing half of
  the live-reproduction seam, the story registry a docs route and the engine's own tests render
  through.
- `auth-store` (`/auth-store`): a pure re-export of the D1 editor-provisioning functions from
  `auth/store.ts`, for a site managing its own editor roster outside the `ManageEditors` screen.
- `auth-channel` (`/auth-channel`): a second, generic login factory, not the engine's own magic
  link, for a site that needs a second authenticated audience.
- `auth-crypto` (`/auth-crypto`): a re-export of stateless Web Crypto primitives from
  `auth/crypto.ts` (tokens, hashes, cookie names), for a second-audience flow that would otherwise
  hand-copy them.
- `cloudflare` (`/cloudflare`): Cloudflare-native platform primitives, Turnstile and `RateLimit`,
  that two sites already copied by hand.
- `vite` (`/vite`): the `cairnManifest` Vite plugin and its options type, the only two symbols a
  consumer site's `vite.config.ts` imports from here.

**Internal (10 directories, no reference page, reachable from no package subpath):**

- `content`: the content model. `adapter.ts`, `concepts.ts`, `fields.ts`, `fieldset.ts`,
  `frontmatter.ts`, `manifest.ts`, `ids.ts`, `links.ts`, `references.ts`, `taxonomy.ts`.
- `auth`: the engine's own magic-link implementation (crypto, session store, roles, access), 841
  lines, distinct from the two re-export shims below and from `auth-channel`'s separate factory.
- `github`: the Backend seam. Read, commit, and branch operations over files, deliberately no
  `query()`, so a store stays swappable and a database stays out.
- `nav`: the navigation tree and its YAML site-config, pure parse, validate, and rewrite; a site's
  own layout and `/admin/nav` do the reading and the committing.
- `audit`: `cairn-audit`'s implementation (the static-analysis runner the `cairn-doctor` bin
  drives), a barrel with no logic of its own.
- `doctor`: `cairn-doctor`'s implementation (the runner, report formatter, and default check
  registry), same barrel pattern as `audit`.
- `media-seed`: `cairn-media-seed`'s implementation (flag parsing, manifest and bucket resolution,
  the sync loop), same barrel pattern again.
- `diagnostics`: the shared error and condition model (`CairnError`, `CairnCondition`), imported
  by both public and internal modules but exported from neither package subpath.
- `log`: the structured event emitter (`log()`), the internal chokepoint every operationally
  meaningful record flows through; see `docs/reference/log-events.md` for the emitted vocabulary,
  which is the public-observable half of an otherwise internal module.
- `design`: the admin's grammar-token inventory (CSS custom property names), consumed by
  `cairn-admin.css`, not by a site.

The auth cluster is the sharpest instance of the public/internal split cutting across a naming
family: `auth` (internal, the real implementation) sits beside `auth-channel` (public, a separate
second-audience factory), `auth-crypto` (public, a 13-line re-export of `auth/crypto.ts`), and
`auth-store` (public, a 17-line re-export of `auth/store.ts`). Two of the four are export shims
over the first, one is the engine's own auth, and one is an unrelated subsystem.

## 2. Where a request enters

Traced from a site's own wiring, which is the right proving ground; `examples/showcase` shows it
end to end.

1. `hooks.server.ts` sets `export const handle = createAuthGuard()`, from `sveltekit/guard.ts`.
   This runs first, on every request: the dev-flag tripwire, the non-admin origin check, HTTPS,
   platform bindings, CSRF, session, and capability, then resolves and applies security headers.
2. The site's `/admin/[...path]` catch-all calls `sveltekit/cairn-admin.ts`'s `createCairnAdmin`,
   the single-mount admin facade: one factory, one `load`, one `actions` record.
3. `cairn-admin.ts`'s `load` and `actions` both open by asking `sveltekit/admin-dispatch.ts`'s
   `parseAdminPath` which view a raw pathname names. This parser is the single path authority: it
   is pure, and every admin URL shape is decided here and nowhere else.
4. Once the view is resolved, `cairn-admin.ts` delegates to the matching factory from
   `sveltekit/content-routes.ts` (or `auth-routes.ts`, `editors-routes.ts`, `nav-routes.ts` for the
   non-content views). Each content-routes action or load opens with a second, per-load capability
   check back into `guard.ts` (`requireEditor`, `requireEngineAccess`), so `guard.ts` is consulted
   twice on a content request: once as the coarse-grained `Handle` before routing, once as the
   fine-grained capability gate the specific action requires.

## 3. The six loose root files

Six files sit beside the 23 directories, each with a stated reason to sit outside one:

- `index.ts`: the root barrel, `.`. Every export carries a comment stating why it is public; the
  pattern of naming the specific type that references a symbol (so an agent can tell whether
  removing the export is safe) is worth imitating when adding to it.
- `ambient.ts`: the public `/ambient` barrel, the one-line `App.Locals` augmentation a site imports
  for its side effect (`import '@glw907/cairn-cms/ambient'`) and nothing else.
- `dev-flag.ts`: the `CAIRN_DEV_BACKEND` flag and its local-host predicate. Three sites read it
  rather than each hand-writing the same check: `sveltekit/guard.ts`, `auth-channel/factory.ts`,
  and `sveltekit/csrf.ts`. Internal; not re-exported from any subpath.
- `email.ts`: the magic-link email boundary, `SendMagicLink`/`EmailSender`/`AuthBranding`. The file
  sits at the root, not inside `auth/`, but its types are re-exported from the root barrel as auth
  surface, so a consumer never notices the file boundary.
- `env.ts`: the platform-binding guards (`CairnEnv`), turning a missing or malformed binding into a
  named `CairnError`. `CairnEnv` itself is re-exported from the root barrel; the guard functions are
  not.
- `escape.ts`: the one HTML text escape, a leaf module with no imports, shared by the email builder
  and the edge-served admin pages so neither arm reaches into the other.

Only `index.ts` and `ambient.ts` are directly public (they are package subpaths in their own
right); `dev-flag.ts` and `escape.ts` are fully internal; `email.ts` and `env.ts` are internal
files whose specific types ride out through the root barrel.

## 4. The `content-routes-*` sibling pattern

`sveltekit/content-routes.ts` is the composition root: it builds one shared
`ContentRoutesContext` (`content-routes-context.ts`), then merges eight per-domain sibling
factories into the one object `cairn-admin.ts` consumes. The pattern is a shared filename prefix
standing in for a directory, ten files sharing `content-routes-` instead of one `content-routes/`
directory:

- `content-routes-context.ts`: the shared context every domain factory closes over.
- `content-routes-shared.ts`: not a domain factory, only the primitives several domains import
  (concept and entry-id resolution, the flattened action-failure shape).
- `content-routes-shell.ts`, `-list.ts`, `-entry.ts`, `-preview.ts`, `-media.ts`, `-tidy.ts`,
  `-settings.ts`, `-dictionary.ts`: the eight domain factories, each named for what it does rather
  than the earlier single `content-routes-core.ts` this pass's predecessor split it out of.
  `content-routes-entry.ts` (entry CRUD, publish, rename, revert) and `content-routes-media.ts`
  (the media library actions) are by far the largest, at well over a thousand lines each; the
  other six are two to five hundred lines apiece.

Every type `content-routes.ts` used to declare inline now lives with the domain that owns it and
is re-exported from `content-routes.ts`, so an existing importer sees the same names at the same
path regardless of which sibling actually defines them.

The same shared-prefix-instead-of-directory pattern recurs in `components/` (92 flat files:
`editor-*.ts` CodeMirror extensions, `tidy-*.ts`, `media-*.ts`, the admin screens, and the field
widgets, all in one directory) and in `src/tests/unit/` (also flat, by file count the largest
directory in the tree). Neither is in scope for this page; `grep` by prefix is the practical way
to find a family inside either.

## 5. `/render`: definition versus re-export

The `/render` public subpath is `render/authoring.ts`, and it is deliberately thin: a curated
re-export, not the file the hast builders are defined in.

- `render/authoring.ts` re-exports `iconSpan`, `cardShell`, `headRow` (all three defined in
  `render/rehype-dispatch.ts`) and the `ComponentContext` type (defined in `render/registry.ts`).
  Its own header states the membership rule: a proposed addition must be a helper a component's
  `build(ctx)` calls to construct or read hast.
- `createRenderer`, the one public render pipeline entry point, is defined in `render/pipeline.ts`
  and exported from the root barrel (`index.ts`), not from `/render`. A site calls it once to build
  its renderer, never from inside a component, which is the stated reason it does not sit beside
  the authoring toolkit.
- `rehype-dispatch.ts` is deliberately never re-exported wholesale: `render/authoring.ts` names
  exactly the three builders above, not the module. Looking for `cardShell`'s definition by opening
  `authoring.ts` finds a re-export line; the definition is one file over.

## 6. Where would I add a field type

`content/fields.ts` declares the `FieldDescriptor` union at `content/fields.ts:122-137`, 15 arms
(`text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`,
`boolean`, `icon`, `image`, `object`, `reference`, `array`). Every site that renders, validates, or
serializes a field switches over this union, so a new arm touches every one of these dispatch
sites and the guard now enforces that none is missed:

1. `content/fields.ts`: the interface and the `fields.*` builder namespace.
2. `content/frontmatter.ts`: `decodeField` and `frontmatterFromForm`, the read and write coders.
3. `content/fieldset.ts`: `validateField`, the validator arm.
4. `components/FieldInput.svelte`: the field-widget `{#if field.type === …}` chain.
5. `components/ComponentForm.svelte`: a second, narrower chain over the same union for a
   component's directive attributes.
6. `render/registry.ts`: `ATTRIBUTE_TYPES`, the set of descriptor types that serialize to a single
   directive-attribute string; this one stays a fail-closed input-validation check (an unlisted
   type is rejected, not defaulted), a different posture from the five dispatchers above, which
   already hold a validated value.

`content/unreachable.ts` exports the shared `unreachable(value: never, context: string): never`
guard every one of the five dispatchers' `default:` arm calls, so the compiler enumerates every
arm the moment a sixteenth one is added and `npm run check` fails at all five sites until it is
handled. Four sites carry a deliberate note instead of a full arm (`content/references.ts`,
`delivery/site-resolver.ts`, `components/ReferenceField.svelte`, and the `required || boolean`
carve-outs) because they only ever need a partial slice of the union; each states why in place.

Past the dispatch sites: `index.ts` re-exports the new arm's type, and `docs/reference/core.md`
documents it, or `check:reference` fails the build.

## Related docs

- `CONTRIBUTING.md`'s Repository map for the rest of the tree (`src/tests/`, `scripts/`,
  `examples/`, `docs/`, and the rest).
- `docs/extend/architecture.md` for the export-subpath view a consuming site reads, as opposed to
  this page's contributor view of the same tree.
- `docs/internal/code-idioms.md` for the standing idiom rules this map does not restate.
