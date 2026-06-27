# Changelog

All notable changes to this project are recorded here, most recent first.

## 0.73.0

<!-- release-size: minor -->

The field-system unification (Contract v2 phase 3c). A directive component's attributes adopt the same
`fields.*` vocabulary a concept schema uses, so the two parallel field systems collapse into one.
`defineComponent` supersedes the bare `ComponentDef` object literal: it builds the attribute validator from
the `fields.*` descriptors and validates the component at declaration, the component-level companion to
`defineConcept`. A component attribute and a concept field now validate through identical `fieldset` code, so
a component reaches the full leaf vocabulary it never had, including `number` bounds and `url`, `email`, and
`date` formats. The `AttributeField` and `FieldType` types are removed.

A new `fields.icon()` descriptor is first-class for both concepts and components. Its value is a glyph name
from the adapter's icon set, and the editor renders the icon picker for it in a concept form as well as a
component form. Most components and concepts declare no icon field; it is the exception, not a field every
block carries.

Function-valued attribute behavior moves off the descriptor into a co-bundled `behavior` table, keyed by
attribute name, the same `BehaviorTable` a concept fieldset accepts. A cross-field rule is
`behavior.validate(value, siblings)`, where `siblings` is the raw attribute record.

This is breaking within the `0.x` window. Consumers must: declare each component's `attributes` as a
`fields.*` record (was an `AttributeField[]` array), and a repeatable slot's `itemFields` the same way.
Consumers must: wrap each component in `defineComponent({ ... })` so it carries the `attributeSchema` that
`validateComponent` runs. Consumers must: move any cross-field attribute `validate` into the component's
`behavior` table with the `validate(value, siblings)` signature, reading `siblings.min` rather than the old
`all.attributes.min`. Consumers must: replace a `pattern: { source, message }` attribute with
`fields.text({ pattern })` plus a `behavior.validate` for a custom message. Attribute validation now
format-checks every value, so a hand-authored directive that previously saved with a malformed value (a
non-numeric `number` attribute, say) now fails the save-path `validateComponent`. See [Upgrading
cairn](docs/guides/upgrade-cairn.md) for the per-change actions.

## 0.72.0

<!-- release-size: minor -->

The adapter restructure and the open concept model (Contract v2 phase 3b). `CairnAdapter` moves from 17
flat keys into six subsystem groups: `content`, `backend`, `email` (was `sender`), `rendering` (the one
`render`, plus `components` (was `registry`) and `icons`), `media` (was `assets`), and `editor` (the
`preview`, the `nav` (was `navMenu`), and the `supportContact`). `content` opens to an arbitrary
`Record<string, ConceptConfig>`, so a site declares any concept by adding one key. `CairnRuntime` stays
flat; `composeRuntime` is the one place that maps the adapter groups onto it.

A concept now owns its URL policy. `defineConcept` is a typed concept factory, the concept-level companion
to `defineAdapter`, that preserves the fieldset type and validates the concept's `permalink` and
`datePrefix` at declaration, so a bad shape throws at module load. Each concept declares its `routing` (the
`'feed'`, `'page'`, or `'embedded'` shorthand, or an explicit rule), `permalink`, and `datePrefix` on the
concept itself, and `ConceptConfig.schema` is renamed to `fields`. The engine drops the `CONCEPT_ROUTING`
table (routing is concept-declared) and the `urlPolicyFrom` helper (URL policy left the YAML).

The YAML site-config no longer carries a per-concept `content:` URL-policy block. `parseSiteConfig`
hard-errors on a leftover `content:` block, pointing to `defineConcept`, so a half-migrated site cannot
silently default-corrupt its permalinks. `siteName` moves out of the adapter and stays in the YAML, the one
home for it; `composeRuntime` reads it from there. The dead `SiteConfig.url` field is removed.

This is breaking within the `0.x` window. Consumers must: regroup the adapter into
`content`/`backend`/`email`/`rendering`/`media`/`editor` (`sender`→`email`,
`render`/`registry`/`icons`→`rendering.{render,components,icons}`, `assets`→`media`,
`navMenu`/`preview`/`supportContact`→`editor.{nav,preview,supportContact}`). Consumers must: rename each
concept's `schema:` to `fields:` and declare it through `defineConcept`. Consumers must: move
`permalink`/`datePrefix` from the YAML `content:` block onto the concept via `defineConcept` (a leftover
YAML `content:` block now throws), and declare each concept's routing with the routing shorthand. Consumers
must: move `siteName` out of the adapter into the YAML site-config. See [Upgrading
cairn](docs/guides/upgrade-cairn.md) for the per-change actions, and [Define an adapter and
schema](docs/guides/define-an-adapter-and-schema.md) for the six-group shape.

## 0.71.0

<!-- release-size: minor -->

Structured fields. A concept can now declare an `object` group and a generalized `array` list beside its
leaf fields. `fields.object({ fields })` groups leaf fields under one frontmatter key, stored as a nested
object, with an optional `label`. `fields.array(item, options?)` now repeats any leaf (a scalar, an
`image`, or a `reference`) or a flat `object` of leaves, where it previously accepted only a reference
item. Together they cover a labeled meta group, a repeatable gallery, and a list of small records such as
an FAQ.

The editor renders an `object` as a labeled group and a non-reference `array` as a repeatable-row editor
with add, remove, and reorder, keyed so an in-progress edit survives a reorder or a remove. The optional
`itemLabel` names each row from one leaf field key. An `array` of references keeps the reference picker
unchanged. The save round-trips the whole structure: a clean row persists in order, an all-empty row is
pruned.

Validation and inference recurse exactly one level. `InferFieldset` infers an `object` as a record of its
leaf value types and an `array` as a list of its item type. The validator reports a nested failure through
the additive `issues` array on `ValidationResult`, each a `ValidationIssue` located by a multi-segment
path (a row index, a leaf sub-key), while the flat `errors` map stays keyed by the top-level field for
back-compat.

Containers nest one level only, enforced loudly at the `fieldset()` call. An `object` holds only leaves,
an `array` holds a leaf or a flat `object`, no field key may contain a dot, and a `reference` inside an
`object` and an `seo` image inside any container are deferred. Model a row that wants its own structure as
its own concept and link to it with a reference.

The barrel adds the `ObjectField` and `ValidationIssue` interfaces; `fields.object` joins the `fields`
namespace and `fields.array` relaxes its item rule.

This release is additive. No consumer action is required: the container shapes sit beside the existing
vocabulary, the shipped `array(reference)` and reference editor are unchanged, and a site that declares no
container field is unchanged. To adopt them, see [Structured
fields](docs/guides/structured-fields.md).

## 0.70.0

<!-- release-size: minor -->

Reference fields. A concept can now declare a typed frontmatter edge to another entry with the new
`fields.reference({ concept })` constructor, and a repeatable list of edges with
`fields.array(fields.reference({ concept }))`. The stored value is the target's permanent id, so a
target rename or slug change never breaks the link. The editor renders a picker over the target
concept's entries in the Details panel, single as a combobox and many as a removable chip list.

The graph stays correct end to end. Renaming a target repoints every inbound reference on `main` in
one commit and refuses when a third-party open branch holds an inbound reference. Deleting a target
refuses, fail-closed across every open branch, when anything still references it. The build's new
`verifyReferences` gate fails on a dangling edge, naming the source entry, the field, and the missing
target; references carry no prerender backstop, so this build gate is their only integrity authority.
A save to a draft or absent target warns but never blocks. The public read model resolves an edge to
its target's identity through the new `resolveReferences` on `/delivery`, so a route renders a
reference as a link.

The barrel adds `fields.reference`, `fields.array`, the `ReferenceField` and `ArrayField` interfaces,
`ReferenceEdge`, `InboundReference`, `ResolvedReference`, and `verifyReferences`; `/delivery`
re-exports `resolveReferences`.

This release is additive. No consumer action is required: the new field types sit beside the existing
vocabulary, and a site that declares no reference field is unchanged. To adopt references, see
[Link content with references](docs/guides/link-content-with-references.md).

## 0.69.0

<!-- release-size: minor -->

**Breaking.** The Contract v2 `fieldset` field system is now the one live field system. A concept's
`schema` is a `fieldset({...})` record built from the `fields.*` constructors, replacing the v1
`defineFields([...])` array. The two prior systems no longer coexist: v1 is removed.

A concept declares its fields with `fieldset` and the `fields.*` constructors. The record key is the
frontmatter key, so the per-field `name` property is gone. The eleven scalar constructors are `text`,
`textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, and
`image`. A `select` takes a closed `options` list. A `multiselect` with an `options` list renders as
checkboxes, and a `multiselect` with `creatable: true` renders as an open tag input that accepts an
optional `placeholder`. A `datetime` field is naive-local, minute-precision (`YYYY-MM-DDTHH:mm`). The
editor renders an arm per scalar, a fresh entry opens prefilled from each field's `default` (a `date`
field's `'today'` resolves against a request-time clock), and the save path round-trips every arm.

The barrel reclaims its v2 names. It exports the eleven `*Field` interfaces, `NamedField`, `fields`,
`fieldset`, `initialValues`, `Fieldset`, `InferFieldset`, `FieldsetOptions`, and `BehaviorTable`, and
drops `defineFields`, `ConceptSchema`, `Infer`, `InferFields`, `DefineFieldsOptions`,
`FrontmatterField`, `TagsField`, and `FreeTagsField`.

Consumers must:

1. Move `schema` from `defineFields([...])` (an array) to `fieldset({...})` (a record).
2. Drop the per-field `name` property. The record key is now the frontmatter key.
3. Rename field help from `description` to `help`.
4. Move a closed `tags` field to `fields.multiselect({ options: [...] })`.
5. Move an open `freetags` field to `fields.multiselect({ creatable: true })`. Its `placeholder`
   is preserved through the new optional `placeholder`.
6. Preserve each field's frontmatter key, especially `tags`, or tag pages and feeds read empty.
7. Extract a frontmatter type with `InferFieldset` (the v1 `Infer` is gone). The v2 `*Field`
   interfaces carry the v2 shape: no `name`, and `help` not `description`.
8. ecxc-ski and 907-life stay pinned to the prior version range until they cut over.

## 0.68.0

<!-- release-size: minor -->

The second pre-cutover engine-hardening pass clears eight engine-misc items: two admin accessibility
fixes, an engine default-icon fallback, and gate, doc, and tooling hygiene.

The component picker dialog now caps its height at 85vh and scrolls its catalog within a held header
and footer, so a long catalog no longer takes the page over. A repeated content-lifecycle error in the
concept list now re-announces to a screen reader: the errors route through one polite live region that
re-speaks an identical message through an invisible nonce, and the visible alerts drop their redundant
`role` so the message announces once.

The component registry ships a default role-to-glyph fallback for the conventional admonition roles
(`note`, `tip`, `important`, `warning`, `caution`, `info`, `danger`). A component that declares an icon
field but no `defaultIconByRole` entry for a role now resolves the engine default, which a site's icon
set styles; a component's own `defaultIconByRole` still wins. The `ComponentDef.icon` and
`defaultIconByRole` guidance now states the "logically representative, prefer distinct" rule.

Three gates and one doc tightened: the admin-prose gate now scans the `.ts` copy modules it skipped, a
new `check:dev-package` gate type-checks and comment-lints `packages/**` in CI, the two
`rehype-dispatch` helpers gained real doc contracts, and the friction log marks its killed and shipped
items resolved so it stops resurfacing dead work.

No consumer action is required. The accessibility fixes and the icon fallback are additive; a site using
the registry's `defaultIcon` may now see an engine default glyph where it previously saw none.

## 0.67.0

<!-- release-size: minor -->

The Contract v2 `fieldset` validator reaches constraint parity with `defineFields`, the first of two
pre-cutover engine-hardening passes. Both validators now call one shared constraint module, so they
cannot drift, and a v1-vs-v2 parity matrix proves they agree on the overlapping field types.

The `fieldset` validator gains the checks it lacked. A `text` or `textarea` field now enforces its
`min`, `max`, `length`, and `pattern`, and a `date` field enforces its `min` and `max`, with the same
messages `defineFields` produces. A malformed `pattern` now fails at `fieldset()` call time, not on
every save, the way `defineFields` already compiled patterns at declaration. The validator also reads a
parsed value, not only a form string: a numeric `number` (a finite `0` included), a `Date` on a
`datetime` field, the way the `date` field already coerced a parsed `Date`. A `multiselect` given a lone
scalar (a single hand-edited `tags: news`) coerces it to a single-element list rather than dropping it
or reporting a misleading "required".

No consumer action is required. The `fieldset` surface is still additive and not yet wired into the
adapter or editor, and the new behavior brings it in line with the long-standing `defineFields` checks.

## 0.66.0

<!-- release-size: minor -->

Contract v2 begins with an additive `fields.*` field vocabulary, exported beside the existing
`defineFields` model. The new surface is opt-in and does not yet wire into the adapter or editor, so a
site on the current field model is unaffected.

A concept can declare its fields as a record of `fields.*` constructors, each returning a plain-data
descriptor. The scalars are `text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`,
`date`, `datetime`, and `boolean`, with `image` as the rich leaf. `fieldset(record)` derives a
server-side validator from those descriptors, returning field-keyed errors or normalized data, and
exposes Standard Schema v1 at its boundary. `InferFieldset` reads the inferred frontmatter type from a
fieldset, and `initialValues` resolves each field's `default` for the editor form, including the
`'today'` sentinel on a date field through an injected clock. The new root-barrel exports are `fields`,
`fieldset`, `initialValues`, and the types `FieldDescriptor`, `Fieldset`, `InferFieldset`,
`FieldsetOptions`, and `BehaviorTable`.

No consumer action is required. The vocabulary is a foundation; the contract-v2 cutover, a later
breaking release, migrates concepts off `defineFields` and carries the "Consumers must:" line then.

## 0.65.0

<!-- release-size: minor -->

Build-time syntax highlighting moves into the engine render pipeline, and the public side gains the
Waymark design foundation in the showcase template (the scaffolder's Part B2).

Fenced code is now highlighted at build time. The render pipeline runs Shiki at build and SSR and
emits role-bound `.cairn-tok-*` token classes with no inline style and no client highlighter, so the
reading route ships no highlighter JavaScript and the colors come from the site's theme. The engine
owns the `.cairn-tok-*` class contract (the way it owns `.cairn-place-*` for figures); a site styles
the classes from its own `--cairn-code-*` variables. Adds `shiki` and `hast-util-to-string` to the
engine's dependencies.

GFM task-list checkboxes now carry an `aria-label` from their item text, so a screen reader names the
read-only control. This clears an axe `label` violation on every site while keeping the real disabled
input the design calls for.

No consumer action is required. A site gets highlighting automatically; to color the tokens, style the
`.cairn-tok-*` classes from a `--cairn-code-*` ramp (the Waymark showcase template does this, bound to
the DaisyUI roles). The broader Waymark design foundation (the oklch token layer, the bespoke reading
surface, the chrome, the `/styleguide` route, and the dual-gamut contrast, token-resolution, and
re-skin CI gates) ships in `examples/showcase`, the deployable starter, not the published engine.

## 0.64.0

<!-- release-size: minor -->

A small pre-Part-B DX pass fixes two engine warts the scaffolder's template would otherwise bake in,
and retires a third item that was already resolved.

`readCommittedManifest`, exported from `/media`, reads a committed media manifest from an
`import.meta.glob` result and degrades a missing file to an empty manifest. A fresh site with no
`src/content/.cairn/media.json` no longer fails its build: the static import that crashed gives way to
the glob, which returns `{}` for no match. The showcase reads its manifest this way.

A new `media.resolver_absent` log event (level `warn`) makes a silently-broken public-image setup
diagnosable. The public route emits it once, at construction, when media is configured on but no
`resolveMedia` reached it, so a forgotten resolver wiring becomes a queryable Workers Logs event
instead of a bare `media:` token on every hero image. `PublicRoutesDeps` gains an optional
`assetsEnabled` flag a site threads from its resolved asset config.

No consumer action is required. A site that wants the no-crash manifest read can adopt
`readCommittedManifest`, and a site that wants the resolver diagnostic threads `assetsEnabled` into
`createPublicRoutes`.

## 0.63.0

<!-- release-size: minor -->

The local-development fake backend moves out of the engine and the showcase into a separate, dev-only
package, `@glw907/cairn-cms-dev`, the first part of the `create-cairn-site` scaffolder. The package
holds the in-memory GitHub, R2, D1, and Anthropic doubles and a blessed `devBackendHandle()` that
installs them and an owner-session bypass, so a site runs `/admin` locally with no cloud accounts. A
consumer installs it as a `devDependency` and activates it from `hooks.server.ts` behind a
build-foldable `dev` gate, so a production build eliminates it from the bundle.

The auth guard gains a fail-closed tripwire. If `CAIRN_DEV_BACKEND` is set in a deployed runtime, the
guard refuses the request with a 503 and logs `guard.rejected` with `reason: "dev_backend_in_prod"`.
It reads the flag from both the Worker `platform.env` and `process.env`, so it fires on Cloudflare and
adapter-node alike. `AuthEnv` carries a new optional `CAIRN_DEV_BACKEND?: string | boolean` field for
it.

No consumer action is required. The tripwire fires only when the flag is set, and the new package is
opt-in for sites that want the local dev backend.

## 0.62.2

The edit-load address-collision advisory now checks the published corpus only. It fires when an entry
you are editing collides with an entry already published on `main`, and it no longer reads sibling
`cairn/<concept>/<id>` branches when an editor opens an entry, so opening the editor adds no GitHub
reads. The publish-time re-check is unchanged: it stays full cross-branch and still emits the
`publish.address_collision` log event when a publish overrides another entry's address. No consumer
action is required.

## 0.62.1

The entry editor gains an advisory channel and its first notice: a cross-branch address-collision
warning. When another entry already resolves to the same public address, the editor shows a
non-blocking warning that names that entry and links to it. The warning never blocks Publish. It makes
the last-write-wins outcome visible instead of silent, since publishing replaces whatever currently
lives at that address.

The check runs at edit-load across `main` and every open `cairn/<concept>/<id>` branch. A publish
re-checks the address and emits a `publish.address_collision` log event (level `warn`, fields `editor`,
`address`, `displacedConcept`, `displacedId`) when it overrides one. The existing needs-alt notice now
renders through the same advisory region, with its live count and per-row actions unchanged.

This adds two exported types on `/sveltekit`, `AdvisoryNotice` and `AdvisoryAction`, the shape
`EditData.advisories` carries. No consumer action is required.

## 0.62.0

<!-- release-size: minor -->

The admin gains a Help home, the pull half of the in-admin editor help. It is a standing screen at
`/admin/help`, reached from a labeled Help home pinned at the foot of the office sidebar (and from the
Ctrl+K command palette).

The screen carries three sections. A getting-started checklist derives its progress from what is
really on the site: writing a post, publishing one, and creating a page. The count is never stored, so
it always reflects the corpus, and the whole section drops away once all three steps are done. A hide
control tucks it away per device. A formatting reference promotes the editor's Ctrl+/ cheat sheet to a
standing two-column table. A support hand-off points a stuck author at the site's `supportContact`,
shaped to the contact (an email opens a `mailto`, a URL opens a link, anything else shows as a note),
and it renders only when the adapter sets one.

This adds two exports: the `HelpHome` component on the `/components` subpath and the `HelpData` type on
`/sveltekit`. The new `/admin/help` route is additive.

No consumer action is required. A site that sets no `supportContact` sees the Help home with a
self-serve line in place of the contact hand-off.

This release also fixes the admin-copy prose gate (`check:prose`): a component whose `@component` doc
comment wrote the literal `<style>` tag had its whole markup silently skipped, so its copy was never
scanned. The gate now strips comments before the script and style blocks.

## 0.61.0

<!-- release-size: minor -->

The editor gains the groundwork for in-admin help. This pass adds the engine seams and one built-in
clarity default the help layer will build on.

A frontmatter field can now carry a `description`: one author-facing sentence shown under the field in
the editor's Details panel and tied to the input with `aria-describedby`. Set it on any field in a
concept's `defineFields` schema.

The `date` field ships a built-in publish-clarity hint ("Sets the date for this post. Publishing is a
separate step you choose.") when the field sets no `description`, so a new site gets the reassurance
without writing per-field copy. A field-level `description` overrides it; the hint cannot be turned
off, only replaced.

The adapter gains an optional `supportContact`: an email, a URL, or a name and instruction the
in-admin help points a stuck editor to. It passes through to the runtime untouched, and the help
renders the hand-off only when it is set, so there is never a button to a blank contact.

The admin design system documents the recipes the help shell will follow, including the non-modal help
region, the single right-slide-over slot, the disclosure-button ARIA contract, the getting-started
progress checklist, and the empty-state starter slot.

No consumer action is required. Every change is additive: the new field and adapter members are
optional, and a site that sets neither sees only the date field's new default hint.

## 0.60.1

A packaging fix so the library bundles cleanly in a Vite 8 consumer. It supersedes `0.60.0`, whose
consumer build failed on Vite 8 / Rolldown. `svelte-package` ships `.svelte` with `<script lang="ts">`
and the TypeScript intact, and Rolldown parses that `<script>` as JavaScript before the Svelte plugin
compiles the file, failing on a TypeScript optional parameter (`registry?: T` loses its type but keeps
the `?`). The shipped `.svelte` now carry a plain-JavaScript `<script>` body. The `lang="ts"` tag
stays, because the component markup still uses TypeScript that the Svelte compiler reads (typed
`{#snippet}` parameters and `{@const x = y as T}` casts).

No consumer action is required. The change is to the published `dist` only; the public API and the
types are unchanged.

## 0.60.0

<!-- release-size: minor -->

The editor learns to copy-edit. Two features land together on the markdown source: a spellcheck that
runs as you write, and an opt-in tidy that reads a draft once with a language model and proposes a
light copy-edit you review before any of it lands.

Spellcheck is on by default. Misspelled words pick up a quiet amber underline, and the correction
popover offers ranked suggestions, an add-to-dictionary action, and an ignore-for-this-session
action, all keyboard-reachable. It runs locally on a Web Worker, so no text leaves the browser, and
it reads the markdown structure: code, links, frontmatter, layout-block machinery, and `media:`
tokens are never flagged. A second quiet layer catches the objective slips spellcheck misses: a
doubled word, a double space inside a line, a stray run of punctuation. The dialect is declared once
per site under `spellcheck.dialect` (default `en-us`), so a British site loads the British word list
and "colour" reads as correct. The personal dictionary is a git-committed file at
`src/content/.cairn/dictionary.txt`, so a word one editor adds is shared with the rest through the
same commit pipeline the content uses.

Tidy is opt-in and off until a developer enables it. When on, an editor runs it over the whole
document or a selection, and cairn reads the draft once through the Anthropic API and computes the
diff locally. The review is a step-in diff dialog: insertions show in green, deletions struck through
in red, and the author's original stays in the buffer until they apply. Objective fixes come pre-kept;
a judgment edit (a configured style normalization, a grammar reword) carries a review-this treatment
and a plain-language reason, and it is not swept by Accept fixes until confirmed. The prompt is built
from the site's own convention config and never harmonizes to the author's habits or guesses an
undeclared style, so an author's voice is preserved. Output is validated as a proofread, not a
restructure: a result that changes the heading structure, the frontmatter, a `media:` token, a code
block, or more than a bounded fraction of the wording is discarded with an honest message and the
document is left untouched. Conventions are edited in a two-tier settings screen and stored in the
committed site config under `tidy.conventions`.

New dependencies: `@codemirror/lint` (the surfacing layer for both spellcheck and the objective-error
underlines), `@anthropic-ai/sdk` (the Worker-side tidy model call, guarded off the client), and
`spellchecker-wasm` plus its bundled English dictionary asset (the spellcheck engine, delivered from
the packaged `dist` so the Worker and the word list reach a consumer build).

No consumer action is required for an existing site. Both features are additive. Spellcheck replaces
the browser's native spell checking with cairn's own, so an upgrading editor sees the new amber
underline and the in-editor correction popover in place of the browser's right-click menu, with no
config change needed. Tidy gives a site nothing until a developer turns it on: set `tidy.enabled: true`
in the site config, add the `ANTHROPIC_API_KEY` Worker secret, and optionally pick a model and
conventions. `cairn doctor` checks that the key is configured once tidy is enabled. The editor
walkthrough is in [write in the editor](docs/guides/write-in-the-editor.md), the developer setup is in
[enable tidy and the editor copy-edit](docs/guides/enable-tidy.md), and the design rationale is in
[the editor copy-edit](docs/explanation/editor-copyedit.md).

## 0.59.0

<!-- release-size: minor -->

The Media Library learns to clear out images in bulk and to collect the files nothing uses any more.
Two surfaces ship together, sharing one safety floor: a strict cross-branch usage index built fresh
per action, and a refusal that commits nothing when usage cannot be verified.

Multi-select lands in both the grid and the table. Tick the images you mean, a sticky bar shows the
count, and one Delete runs the single safe-delete gate across the whole selection. cairn deletes the
assets nothing references and skips any still in use, reporting them rather than force-deleting one.
The batch is one commit that removes the manifest rows before the R2 objects, so a bulk delete is
recoverable from git history the same way a single safe-delete is. The dialog is a plain confirm with
the count, since nothing in use can be removed this way.

Find orphaned files collects stored bytes that drifted loose from content. It pairs a storage
reconcile with a strict usage read and reports two populations. Orphaned files are stored R2 bytes
with no manifest row and no reference anywhere across `main` and every open branch; a branch-only
upload is excluded, because the branch that uploaded it still references it. Broken references are the
reverse, a manifest row whose bytes are gone, shown as a read-only data-integrity readout with no
delete. The scan fails closed at detection: a branch it cannot read produces no result and an offer
to check again, rather than a half-answer that might call an in-use file orphaned.

The byte purge is the one irreversible media action. Everything else in the Library edits git-tracked
state and can be walked back from history, but raw R2 bytes carry no git record, so a purge cannot be
undone. It gates on a typed-count confirm, and at action time it re-derives the orphan set and
re-checks the strict usage index, so a key claimed by a new manifest row or referenced on a branch
since the scan is skipped, never purged. The shipped "Unused" triage facet is renamed to "No
references found", with the raw-HTML caveat stated where an editor acts: absence of a found reference
is not proof of disuse, since cairn cannot see an image hidden in raw HTML or a URL hardcoded in a
template.

No consumer action is required. The whole surface is admin-side and additive, with no public surface
change and no content-format change. An editor walkthrough is in
[manage the media library](docs/guides/manage-the-media-library.md), and the design rationale is in
[media storage](docs/explanation/media-storage.md).

## 0.58.0

<!-- release-size: minor -->

The Media Library learns to fix an image everywhere it is used. Two new operations rewrite every
placement of one asset in a single commit to `main`, each behind a preview an editor confirms before
anything changes. Both read usage across `main` and every open edit branch, both report the held edits
they will not touch, and both fail closed when usage cannot be verified.

Replace swaps the file behind an image without revisiting the pages that use it. cairn is
content-addressed, so a corrected upload is a new object with a new content hash; replace repoints
every published reference from the old hash to the new one and keeps the slug, so `media:first-light.<old>`
becomes `media:first-light.<new>` and the name an author sees is unchanged. The old row and its R2 bytes
are kept, recoverable from git history, rather than erased. A typed-slug confirm gates the apply, since
it rewrites published content and can break a draft, and the preview names the open edit branches still
on the old file. Those branches keep the old file until they republish; they are never rewritten.

Push alt fills missing descriptions from one place. An image's default alt copies into every placement
that has none, in one atomic commit. An explicit opt-in, off by default, also overwrites placements
that already carry a custom alt, since that replaces an author's words. A frontmatter hero marked
decorative is skipped, because its empty alt is deliberate. The media manifest is not changed: the
default alt is read from the row, never rewritten there. Alt fill is reversible and frequent, so it
carries no typed-slug gate.

No consumer action is required. Both operations are admin-side and additive, with no public surface
change and no content-format change. An editor walkthrough is in
[manage the media library](docs/guides/manage-the-media-library.md), and the design rationale is in
[media storage](docs/explanation/media-storage.md).

## 0.57.1

Media polish and cutover DX, the first follow-on after the `0.57.0` media stack. The Media Library
gains the action feedback it lacked: a delete, a rename, and a commit conflict now land on a strip
that confirms the result or shows the error, instead of a silent page. With the detail slide-over open
and focus in the search box, Escape now clears the search and leaves the panel open, rather than doing
both at once. A frontmatter hero marked decorative persists that choice as an additive `decorative` key
on the `image` object, so a deliberately decorative hero stops reading as needs-alt after a reload (a
decorative body image still cannot persist the choice, since markdown alt text has no slot for it). The
reserved-`figure` build error now names the colliding component and points at the fix.

The rest is documentation. The public media resolver wiring moved into the required media setup steps
in both the upgrade guide and the wire-the-delivery guide, since a published `media:` token ships bare
without it. The reserved-`figure` collision is now a prominent breaking callout. A new
[content authoring syntax reference](docs/reference/authoring-syntax.md) documents the `cairn:` and
`media:` token schemes together. The guides now show the `wrangler.toml` binding dialect, the
`@glw907/cairn-cms/media` import path, the empty-`media.json` bootstrap, and the `.site-main` re-scope
for the figure placement CSS.

No consumer action is required. The `decorative` key is additive and optional, so existing content
parses and builds unchanged, and the feedback strip, the Escape fix, and the registry error message
are admin or build-time with no public surface change.

## 0.57.0

Images become first-class. An editor can paste, drag, or insert an image straight into a post, and
cairn stores it, names it by its content, commits it with the entry, and serves it from the site's
own R2 bucket. This is the whole media stack landing together: the foundation that models a stored
image, the infrastructure that ingests and delivers the bytes, and the insert UI that puts it in an
editor's hands. It is additive to the public API, but it needs per-site wiring, so it is a minor.

The foundation models an image as a logical reference, not a path. Content commits a `media:` token
keyed to the first 16 hex characters of the bytes' sha256, so the same image resolves no matter where
it is stored or what it is named, and identical bytes always land at one key. A small git-committed
manifest (`media.json`) carries the human layer the bytes cannot: the display name, the alt text, the
original filename, and the pixel facts. A render-time resolver reads that manifest and rewrites each
`media:` token to its delivery URL, optionally through a Cloudflare Images transform URL when a site
turns transforms on. The adapter's `AssetConfig` grew to declare the R2 bucket binding, the URL form,
the upload limits, and the named variants.

The infrastructure ingests and serves the bytes. A locked-down `/media` delivery route, built from
`createMediaRoute`, streams content-addressed bytes from R2: it validates the hash and extension
before any read, derives the object key from the validated values alone, carries the load-bearing
security headers (nosniff, inline disposition, a `default-src 'none'; sandbox` CSP, a one-year
immutable cache), and forwards `If-None-Match` and `Range` for 304 and 206 responses. An admin
`uploadAction` takes the editor's bytes, hashes them, dedups against the manifest with a put-first
head check, and rejects a hash collision with a 409. A client ingest helper normalizes a HEIC to a
web format before upload. A save merges the editor's optimistic records into `media.json` at commit
time, and the edit load hands the admin preview a lean `mediaTargets` projection so an in-session
image renders before it is committed.

The insert UI puts it in an editor's hands. Three gestures start an insert: paste from the clipboard,
drag a file onto the editor, or the toolbar's Insert image button. A paste or drag opens an at-caret
popover on the capture card with the dropped file; the button opens a chooser with upload first and a
combobox picker below it for reusing an image already on the site. The capture card pre-fills the name
from the filename and never blocks on alt text, so an editor can insert now and describe later. The
inserted reference renders in the editor as an atomic chip (thumbnail, name, and a needs-alt marker),
and an upload still in flight shows a widget-only placeholder with a determinate progress bar that
writes no document text until it resolves. A non-blocking needs-alt notice on the edit page counts the
images still waiting for a description and jumps to each one, never blocking a save or a Publish. The
edit-page preview renders inserted images through the same resolver the live site uses.

Figures land in the same release. An inline image can carry a caption and a placement through a
cairn-reserved `:::figure` directive that wraps the image as a child node. The caption is the
directive's body text, rendered to a real `<figcaption>`, and the placement is a closed role set
(`center`, `wide`, `full`, plus the bare measure default) carried as a class on the `<figure>`. A
persistent editor control wraps a bare image, edits an existing figure's caption and role, or unwraps
it, writing the markdown source the author can read and hand-edit, and the source chip shows the
figure's role so the decoration agrees with the source. `figure` and `figcaption` join the base
sanitize floor, so a captioned figure survives on every site, and `figure` is a reserved directive
name the registry refuses to let a site component shadow. cairn ships default `.cairn-place-*` CSS in
the showcase reference, and a site restyles those classes to own the placement pixels. A guide section
covers it in [add an image](docs/guides/add-an-image.md).

Hero images land in the same release. A Post or Page carries a lead image in frontmatter as a nested
`image: { src, alt, caption }` object, where `src` is a `media:` reference, `alt` is the screen-reader
description, and `caption` is an optional line the template may show. `image` is a new built-in field
type declared through `defineFields` like `text` or `date`. The editor renders it in the details panel
as a one-row resting field that opens the same picker and capture flow the body insert uses. Alt stays
debt, and the needs-alt notice now counts a hero with an empty alt alongside the body images. One
image serves two jobs: the delivery read path resolves the frontmatter reference into a derived
`heroImage` projection the template lays out, and the SEO head reads the same resolved image as the
`og:image` and `twitter:image`. The on-disk `media:` token stays canonical, since resolution is a
separate projection that is never written back. `resolveImageUrl` now rejects a non-http(s) result, so
an unresolved `media:` token degrades to no social image rather than shipping a broken tag. The site
template owns the hero layout: cairn ships the resolved data and the social-card wiring, not a hero
render step. A required `image` field is enforced on the presence of its `src`, never on its alt.

The Media Library lands in the same release. A first-class admin screen at `/admin/media`, a peer of
Posts and Pages, browses every committed asset, shows where each one is used, edits its name and
default alt, and deletes it safely. The resting surface is a contact-sheet grid with a list-density
toggle; a non-modal detail slide-over carries the preview, the alt editor, the grouped where-used
list, and the actions. The Library computes where-used by content hash across `main` and every open
edit branch, so a not-yet-published upload still shows and a renamed slug still resolves. The content
manifest gained an additive `mediaRefs` field per entry to feed the `main` side of that index; an
existing manifest without it still parses and builds. Safe-delete rechecks usage server-side against
a fresh read at delete time, refuses an in-use asset (the in-use face names what would break and
requires typing the slug), commits the manifest row removal before deleting the R2 object, and fails
closed if it cannot verify usage. Rename and default-alt are a single `media.json` row commit with no
reference rewrite, since the resolver and route key on the hash; the default alt is the value
prefilled into the next placement, not a rewrite of alt already committed. Replace, bulk actions, and
tags are deferred.

Consumers must: bind an R2 bucket and mount the delivery route before media works. Add an
`r2_buckets` binding named `MEDIA_BUCKET` in `wrangler.jsonc`, and mount the delivery route at
`src/routes/media/[...path]/+server.ts` with `createMediaRoute(runtime.resolvedAssets)`. Declare the
adapter's `assets` block naming that binding, and regenerate nothing else; media stays off until the
`assets` block is present. Cloudflare Images transforms stay behind the `transformations: false`
default, so a site serves full-size bytes until it opts in. The wiring steps are in
[the upgrade guide](docs/guides/upgrade-cairn.md) and the
[wire the delivery surface guide](docs/guides/wire-the-delivery-surface.md); the surface is documented
in [the media reference](docs/reference/media.md) and
[the sveltekit reference](docs/reference/sveltekit.md).

Consumers must also wire the public media resolver for any public image. The bucket, route, and
`assets` block make media work for the editor, but a published `![](media:...)` (a body image or a
frontmatter hero) ships a bare token to the live page unless the site threads a resolver into the
render path and `createPublicRoutes`. Build one with
`makeMediaResolver(mediaManifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }))` from
`@glw907/cairn-cms/media`, where `mediaManifest` is the committed `src/content/.cairn/media.json`
(create it as `{}` on a fresh site so the import resolves). The
[upgrade guide](docs/guides/upgrade-cairn.md) gives the full snippet.

Breaking: `figure` is now a reserved directive name. `defineRegistry` throws if a site registers a
component named `figure`, which hard-fails both `cairn-manifest` and the build. A custom `figure` that
the engine's built-in figure now covers should be removed so the site adopts the engine's; a `figure`
that does something else should be renamed. Check too for any hand-authored `:::figure` block in your
content, which now renders as an engine figure.

Recommended, not required: regenerate the content manifest (`cairn-manifest`) and commit it so the
Media Library's `main` where-used is accurate. The `mediaRefs` field is additive, so a site builds
without it, but an un-regenerated manifest reads every published media reference as absent until it
is regenerated. Save and publish keep the field current from then on.

## 0.56.2

The component insert picker gains a live preview and round-trip editing, and the component contract
grows the optional fields that make a good picker possible. These refine the existing
component-editing surface and are all additive, so it is a patch; existing definitions compile
unchanged with no action required.

How the design was reached. Two research arms ran first. One surveyed how comparable systems build
their insert pickers (Gutenberg, Sanity, Wagtail, Payload, Contentful, Builder, and the git-backed and
document tools). The other hunted documented complaints from both the editor and the developer, then
paired each with a correction. Five pains recur across systems that share no code, and cairn already
beats four of them by its existing architecture: a single `ComponentDef` co-locates render and schema
(no schema-render drift), content is markdown in git (no database-migration tax), and the parser reads
real directives (lossless re-edit stays reachable). The fifth pain, configuring a block without seeing
the result, no system has solved. An adversarial critique of the first mockup then caught the preview
faked with static HTML and an ironic "Untitled" placeholder, which the shipped design corrects.

What an editor gets. The picker lists components in one column, grouped under headings, each row a
glyph, a description, and a line on when to reach for it; a search box appears once a site declares
more than eight. Picking a component that declares a `preview` opens a two-pane configure step: the
fill form on the left, and on the right the configured component rendered through the site's own
pipeline, the same machinery the edit page preview uses. This is the part no comparable CMS offers,
and cairn can offer it because it already owns the render path. The preview settles on a debounce
rather than re-rendering on every keystroke, and it stays honest: a still-empty required field shows
the skeleton with the empty region called out rather than a fabricated result, and a render that
throws shows a failed-to-render surface and keeps the form. A component that declares no `preview`
keeps the single-column form. Required fields are marked and block Insert with inline messages, and
the modal collapses to one column on a narrow screen.

Round-trip editing closes the loop. With the cursor in a placed component, an Edit block control opens
it back into the same guided form, pre-filled, and Update rewrites that block in place. It is offered
only when the round-trip is provably lossless for that block: one that carries an attribute or a child
the component does not declare is left for hand-editing rather than silently rewritten, the failure
that corrupts content in the git-backed editors the research surveyed. A guided edit that does run
preserves content and normalizes formatting to the canonical serialization. A consumer site that
mounts `CairnAdmin` gets this with no change.

For consumers, the `ComponentDef` contract gains optional fields, so existing definitions compile
unchanged with no action required:

- `icon` shows a glyph from the site icon set beside the label in the picker.
- `group` puts a component under a category heading, in declaration order.
- `hidden` keeps a component out of the top-level picker (for a nested-only component).
- `preview` is a structured sample (`attributes` and `slots`) the picker seeds the form with and
  renders. Declaring it is what opts a component into the two-pane preview layout.
- `pattern` and `validate` on an attribute field add inline validation, the regex case and a pure
  cross-field escape hatch.
- `itemLabel` on a repeatable slot derives a row's label, so a list of items is not a column of blanks.

Round-trip editing of a placed component, a persistent catalog rail, and a slash-trigger are designed
for but deferred to a later pass.

## 0.56.1

Test and CI reliability only; the published library is unchanged from 0.56.0. The component test job
flaked in CI on the editor's heavier pages because the editor's per-browser preferences live in
localStorage and nothing cleared it between tests, so a leaked zen preference could hide the toolbar a
later test waited for. localStorage is now isolated before each component test, with a regression
guard, plus a retry on the browser test project and steadier waits in the insert-dialog tests. No
consumer action.

## 0.56.0

Two passes ship together: the markdown editor's folding gets a proper home, and the engine's gates,
tooling, and docs harden.

The editor folds directive containers (`:::name` blocks), and the fold control now lives in a real
gutter column to the left of the text rather than a chevron hidden in the line. At rest the gutter is
empty; the chevron reveals when you hover the gutter cell, stays while a block is folded, and shows
while the caret is inside a block. The control is a real button now, so folding is reachable by
keyboard and screen reader, where before only unfolding was. The folded-row tint and the "N lines"
pill carry over unchanged, and the fold scope is the same: directive containers only.

For consumers, two additive surface touches from the tooling pass. A concept can now set an optional
`singular` label, so the create affordances read "New post" instead of "New Posts"; it defaults to the
concept's `label`, so a concept that sets nothing is unchanged. And `AuthEnv` is now exported from
`@glw907/cairn-cms/sveltekit` as well as the root, so the `app.d.ts` Platform block can import it from
the subpath the auth helpers live on (the deploy guide now shows that block verbatim).

The rest hardens the engine's own gates and docs. A new `check:reference:signatures` gate compares
each reference page's declared type signature against the export's real type, so a stale signature in
an existing page is caught (it found and fixed two on its first run). A plain-Node dist-spawn test
rot-proofs the `/delivery/data` node-safety guarantee, an admin-shell DOM check guards the drawer
layout against a silent scoping regression, and the `cairn-manifest` bin now resolves the Vite root
from the loaded config rather than the current directory. A docs sweep documents the preview frame's
dual stylesheet emission, the `cairnManifest`-derived `cairn-doctor` inputs, the prerender policy for
the feed routes, and an interim security contact.

No consumer action: every change is additive, the `singular` field is optional, and the folding
redesign is internal to the admin editor.

## 0.55.0

The office list rises to the gold standard. The post and page list gains a triage filter layer and
self-describing rows, so a concept with a handful of entries reads as content rather than a few bare
titles.

Above the list, a triage bar filters by publish state in the admin's segmented check-and-tint
grammar: All, Pending edits (the entries on a `cairn/` branch, whether branch-only or live with held
edits), and Published, each with a live count, plus an orthogonal Hidden toggle for the draft
entries. The counts come from the loaded set, so they are exact, and the filtering runs client-side
over the entries already in hand. Search composes with the active filter.

Each row now describes itself. A summary line sits under the title, drawn from the entry's
description or, lacking one, a short excerpt of its body. The Edited badge tints in the brand violet
as the one state to act on, mirroring the "Publish site (N)" count; Hidden reads as a de-emphasized
row with an eye-off tag rather than a competing badge; and the foot of the list carries a quiet
"New" row so a short list always shows its next step. A concept with no entries centers its empty
state on the page.

One data change feeds the rows: the content manifest now indexes a per-entry `summary`, built by the
same excerpt helper the public delivery already uses. Because the manifest is verified whole-string,
a site's committed manifest is stale until it is regenerated once.

Consumers must: regenerate the content manifest (`npm run cairn:manifest` or `npx cairn-manifest`,
then commit). The `cairnManifest` build fails closed until the regenerated manifest with the new
`summary` keys is committed.

## 0.54.0

The editor takes the shell. On an edit route the page is now one context, the desk: the edit page's
sticky header dissolves into the single topbar (one band in three clusters, the way back and the
status and the lifecycle actions), the nav drawer opens closed and the breadcrumb is the way out,
the frontmatter fields move behind a right slide-over panel, and a zen toggle (and `Ctrl+Shift+.`)
fades the remaining chrome to leave the manuscript alone, with a floating chip carrying the save
state and the way out. List and settings pages keep the office chrome unchanged.

The editor ergonomics round out alongside it: the directive rail pitch widens to 8px and the
caret-active rail reads by strength alone (no width step), wrapped quote and list lines hang under
their content, directive containers fold from the rail band (a chevron on the opener row, a folded
row with an `N lines` pill, the safety invariant that an edit or selection never hides text), the
format keymap completes (inline code, quote, both lists, the heading pair) and the page-level
actions get keys, a `Ctrl+/` sheet lists every shortcut, and `####` gains a real heading size step.
The everyday formats (inline code, strikethrough, table) promote onto the strip, and the footer
controls dress as what they are: a segmented posture control, check-and-tint mode toggles, and a
plain Markdown-help link. The whole admin picks up the same grade of polish, including a scoped
reset so every bare admin button sheds its native chrome.

Consumers may: nothing is required, the new chrome and the editor behaviors apply in place. A site
that embeds `MarkdownEditor` directly gets the rail, hang, fold, and keymap changes automatically;
the editor's public props are unchanged.

## 0.53.0

An iterative design session on the editor-as-home direction, shipped as one window.

The admin's UI face is now IBM Plex Sans (self-hosted, SIL OFL), replacing Figtree: the editor
writes in iA Writer Mono, which descends from IBM Plex Mono, so the chrome and the manuscript
share one type skeleton. The brand display face (Bricolage Grotesque) is unchanged.

The editor gains two surface postures, persisted and toggled from the card footer: Prose (the
default) is the writing instrument, a 72ch centered measure at a larger type step; Markup is the
working surface, a wide dense fill for tables, attributed directives, and long URLs. The footer
is now the writing-environment strip (word count, postures, focus mode, typewriter, help), the
insert actions joined the toolbar as icons, and the document title sits on the manuscript's left
edge. Focus mode now also eases the directive rails and the title back with the dimmed field.

The chrome cedes the stage: a narrower nav sidebar and details column, a wider gutter around the
editor, a quieter details card, rebalanced surface margins, and the topbar pinned to the brand
band's height so the header hairline meets across the seam.

Consumers may: pass the new optional `surface` prop ('prose' | 'markup') when embedding
`MarkdownEditor` directly. No action required; the release is additive.

## 0.52.1

Two field reports from the first 0.52.0 session, both in-editor polish with no consumer action.
In Write mode the editor card now hugs the manuscript (the column caps at 48rem and centers), so
a wide window no longer frames empty space inside the card; Preview keeps the full column for
its device widths. The directive rails take a 4px gap between nested bars (twice the bar
weight, so two rails read as two lines), and directive text gains a matching step of gutter.

## 0.52.0

The editor became a quiet writing surface. The manuscript renders in self-hosted iA Writer Mono
(SIL OFL) at a centered 70-character measure, heading sizes step by level, every syntax marker
and URL recedes to the muted ink while the content keeps full strength, inline code sits on a
soft chip, and quote text reads in full ink with only the `>` dimmed. The editor also parses
GFM now, so the toolbar's strikethrough, tables, and task lists highlight as you type.

Directive machinery trades its row bands for bracket rails: a container draws a depth-stepped
rail from opener to closer, nested containers draw nested rails, the fence line's name and label
keep the accent while the colons and braces fade, and the block holding your caret reads one
step stronger. The treatment is AA-checked in both themes.

Two writing modes join the toolbar's overflow menu, each persisted per browser: focus mode fades
every paragraph but the caret's (a deliberate, documented sub-AA dim with chip backgrounds
flattened), and typewriter scrolling holds the caret line at vertical center.

Consumers may: pass the new optional `focusMode` and `typewriter` booleans when embedding
`MarkdownEditor` directly; sites on the stock `EditPage` get the toggles and persistence for
free. No action required; the release is additive.

## 0.51.0

The `svelte` peer dependency floor rises from `^5.0.0` to `^5.56.3`, turning the 0.40.0 advisory
into an enforced range: consumer sites compile the shipped `.svelte` sources, and svelte `5.56.1`
miscompiles parenthesized boolean groupings. `cairn-doctor` gains a `config.dependency-floors`
check in its default set, which compares the lockfile's resolved `svelte` and `@sveltejs/kit`
versions against the peer ranges the installed engine declares.

Consumers must: raise the `svelte` devDependency range to at least `^5.56.3` (and `@sveltejs/kit`
to `^2.12` where it sits lower) and reinstall so the lockfile re-resolves. A site pinning svelte
below the floor now draws an npm peer warning or resolution failure on install, and the doctor
reports the below-floor version as a blocker.

The edit page's preview now renders inside a sandboxed iframe whose document links the site's own
stylesheets, so an entry proofs in the site's real styling without that CSS ever touching the
admin document. The adapter gains an optional `preview` member naming the compiled CSS URLs (a
Vite `?url` import resolves the hashed asset) plus `bodyClass` and `containerClass` for the site's
body classes and content wrapper, and a `byConcept` map overrides either class per concept for a
site whose posts and pages wrap content differently. While Preview shows, the sidebar steps aside
so the document takes the full width, and a width menu on the Preview tab sizes the frame to
Desktop, Tablet, Phone, or Small phone, persisted per browser.

Consumers should: wire `preview` in the adapter, referencing the sheet only through `?url` and
linking the same URL from the site layout, the way
[the adapter guide](docs/guides/define-an-adapter-and-schema.md) shows. Without the knob the
preview renders unstyled markup behind a one-line hint.

The editor's directive highlighting now recognizes labeled and attributed `:::` openers and fences
of four or more colons, where before only bare closers matched, and nested containers step their
band and rail tint by depth. No consumer action.

`cairn-doctor` derives its missing inputs from the repo it runs in: the backend owner and repo
plus the sender address come from evaluating the site's config module through the manifest bin's
Vite machinery, and the Cloudflare account id comes from the wrangler config, with flags and
environment variables taking precedence. A new `--probe <url>` flag runs a zero-side-effect live
check against the deployed admin's sign-in surface: the login envelope, the CSRF cookie and field,
and the uniform non-leak answer to a stranger's sign-in request. Consumers may: drop the `--from`
and `--repo` flags from doctor invocations and run `npx cairn-doctor --probe <url>` after a
deploy.

## 0.50.0

The admin now mounts as one catch-all route. A new `createCairnAdmin(runtime, deps)` facade
serves every admin view through a single `load` and a single `actions` record, the new
`CairnAdmin` component switches the views on the discriminated `AdminData`, and `parseAdminPath`
is the one path authority behind both. A site's whole `/admin` surface is now three files (the
`$lib/cairn.server.ts` composer plus the `/admin/[...path]` route pair) instead of a per-route
tree of shims whose action names coupled to engine components by bare string. The admin URLs are
unchanged. The per-surface factories (`createContentRoutes` and friends) stay public as the
advanced seam.

Consumers must: delete the admin route tree and replace it with the two-file mount plus the
composer; the exact files are in
[the canonical admin mount](docs/reference/admin-routes.md) and the migration is the `0.50.0`
section of [the upgrade guide](docs/guides/upgrade-cairn.md). The engine's auth and shell forms
now post named actions (`?/request`, `?/confirm`, `?/logout`, `?/publishAll`), so a site that
mounts `LoginPage`, `ConfirmPage`, or `AdminLayout` directly must register those names, and the
`/admin/auth/logout` server route leaves the contract.

Consumers must: rename `createSiteIndex` to `createSiteResolver` and `SiteIndex` to
`SiteResolver` where imported from `/delivery/data`; the `paginate` helper is deleted.

Consumers must: read `form.error` where they read `form.renameError`. Every action failure now
carries `error: string` as its one-line summary; the structured extras (`brokenLinks`,
`inboundLinks`) keep their keys beside it.

Consumers must: replace the hand-written `App.Locals` block in `src/app.d.ts` with
`import '@glw907/cairn-cms/ambient';`, the new type-only subpath that ships the
`App.Locals.editor` augmentation.

The diagnostics registry reaches its remaining runtime sites. A missing `AUTH_DB` on a gated
admin request renders a branded condition page instead of a silent login redirect, and a missing
email binding, missing GitHub App credentials, and an invalid site config now carry their
registered condition ids through the error chain and the logs.
`deps.mintToken` widens to accept a plain string return. The concept list reads published rows
from the committed manifest in one call, falling back to the per-file crawl only on a repo with
no manifest yet. Internal layering rides along (one home each for the link rewriter, the escape
helpers, and the conflict check) with no consumer surface change.

This release publishes together with `0.41.0`, so a site crossing from `0.40.0` takes both
windows in one upgrade.

## 0.41.0

`cairn-doctor` ships as a second bin: a setup preflight that runs nine checks over the local config
files (the wrangler bindings, observability, the CSRF handoff, the site config), the Cloudflare
account (the onboarded sending domain, Always Use HTTPS, HSTS, the D1 auth store with its schema
and an owner row), and the GitHub App's full reachability chain. Every check reports into one
plain-text report, a failure prints its condition's why and remediation from the diagnostics
registry, and the exit code is 1 on any failure, so the command slots into a deploy script as a
gate. A missing credential makes the affected checks skip rather than fail, and
`--send-test <address>` opts into one real email through the Email Sending API. The new
[Cloudflare readiness guide](docs/guides/cloudflare-readiness.md) walks the same conditions
manually, a `check:readiness` gate pins that guide to the condition registry, and
[the doctor reference](docs/reference/doctor.md) covers the flags, the checks, and the CI wiring.

The admin layout's GitHub degrade gains a signal. When the pending-entries read fails, the layout
logs a warn-level `github.unreachable` record and the topbar's Publish site button hides instead
of showing a count it cannot know.

Consumers may: run `npx cairn-doctor --from <address> --repo <owner/name>` as a pre-launch gate,
work through the readiness guide when standing up a fresh account, and filter Workers Logs on
`github.unreachable` when the publish button goes missing.

A debt batch rides along. The editor's link autocomplete no longer
pulls CodeMirror into the server bundle, the edit page's load reads its GitHub probes in parallel,
concurrent cold-start token mints coalesce into one, publish-all pluralizes its commit message and
an empty publish-all explains itself instead of redirecting silently, the unsaved-changes warning
tracks client-side navigation and no longer double-fires on a full page unload, the toolbar's
keyboard tab stop holds across Preview round trips, the word count ignores markdown and directive
syntax, and the list's publish flash announces reliably to screen readers.

Consumers must: be on `@sveltejs/kit` 2.12 or later before taking this release. The edit page now
reads `$app/state`, which shipped in kit 2.12.0, and the peer range says so (`^2.12`); a site on
an older kit must upgrade kit first.

## 0.40.0

The edit page is redesigned around the manuscript. A sticky translucent header carries the
breadcrumb, the status badge (New, Edited, or Published, with Hidden beside it when the `draft`
flag is set), an unsaved-changes indicator, Publish and Save, and an overflow menu holding Discard
changes and Delete. The editor sits in one card frame: a full GFM toolbar (bold, italic, two
heading levels, lists, quote, and a More menu with strikethrough, inline code, code block, a table
starter, horizontal rule, and task list), the writing surface, and a footer with a word count and
a Markdown help cheat sheet. Write/Preview tabs replace the stacked preview. When the schema
declares a `title` field, the document title hoists above the card, and the sidebar groups into
Details, Visibility (the `draft` flag as the Hidden toggle), and Address (the slug beside a Change
URL button). On the surface itself: markdown syntax highlighting in the admin palette, a soft
accent band with a plain-language tooltip on `:::` directive machinery, and native browser spell
check.
Ctrl/Cmd+B and Ctrl/Cmd+I format the selection, Ctrl/Cmd+K opens a new web-link dialog,
Ctrl/Cmd+S saves, and leaving the page with unsaved edits asks first.

The component surface grows additively. `MarkdownEditor` gains `registerFormat` and
`registerGetSelection`, and it no longer renders its own toolbar or card chrome; the host frames
it, and `EditPage` does. `DeleteDialog` and `RenameDialog` gain an exported `open()` and a
`trigger` prop, `LinkPicker` gains an exported `open()` and a `disabled` prop, and
`ComponentInsertDialog` gains `disabled`. The light theme's `--color-accent` darkened to
`oklch(54% 0.16 300)` so the editor's directive ink holds AA contrast.

Consumers must: nothing for a site mounting the admin through the route factories and `EditPage`;
no shim, action, or load changes. A site that renders `MarkdownEditor` directly, outside
`EditPage`, no longer gets an embedded toolbar or card frame; it may host its own controls through
the new `registerFormat` seam or accept the plain surface. One advisory for every consumer: sites
compile the shipped `.svelte` sources, and svelte `5.56.1` has a compiler bug that misprints
parenthesized boolean groupings, so use svelte `5.56.3` or newer. The editor-facing walkthrough is
[the write-in-the-editor guide](docs/guides/write-in-the-editor.md).

## 0.39.0

Content edits are now held until a deliberate Publish. A save commits to the entry's pending
branch, `cairn/<concept>/<id>`, cut lazily from the default branch's head, and the live site does
not change. The per-page Publish validates and holds the posted form like a save, then commits
that markdown to the default branch, with its manifest row upserted, in one commit; that commit
triggers the deploy. The pending branch is then deleted, guarded by a head-sha check so a save
landing mid-publish is never destroyed. A
site-wide "Publish site (N)" action in the admin topbar ships every pending entry in one atomic
commit. Discard deletes the pending branch, restoring the live version of a published entry or
removing a never-published one entirely. The ref's existence is the only pending state; there is
no metadata file and no database row.

The admin shows the new state everywhere. List rows carry a status badge (New, Edited, or
Published), with the `draft:` flag re-presented as a separate Hidden badge whose mechanics are
unchanged. The edit page gains a pending banner, a Publish button, and a Discard changes confirm.
Deleting an entry cascades to its pending branch, and renaming is refused while one exists.
`EntrySummary`, `ListData`, `EditData`, and `LayoutData` widen accordingly, `createContentRoutes`
returns the three new actions, and three log events join the vocabulary (`entry.published`,
`entry.discarded`, `publish.failed`), with `commit.succeeded`/`commit.failed` carrying a `branch`
field on the save path.

Consumers must: add publish/discard to the edit shim's actions and publishAll to the list shim's actions; saves no longer deploy the site, Publish does.
The exact lines are in
[the upgrade guide](docs/guides/upgrade-cairn.md) and
[the admin route structure](docs/reference/admin-routes.md). The editor-facing walkthrough is
[the publish and discard guide](docs/guides/publish-and-discard.md).

## 0.38.0

The magic-link send is now awaited rather than fire-and-forget, so a delivery failure reaches the
login response instead of being swallowed. `requestAction` returns a `status` discriminant
(`sent` | `send_error` | `throttled`) alongside the existing `sent` boolean, and `LoginPage` renders
a send-error and a throttled state. The `auth.link.send_failed` log record gains a `code` (the
Cloudflare binding error code) and a `conditionId` (the mapped diagnostic condition).

Consumers may: read `form.status` to render the new states. A site rendering against `form.sent` is
unaffected, since `sent` is unchanged.

## 0.37.1

Internal groundwork and a docs overhaul; nothing in the public surface or runtime behavior
changes, and no consumer action is needed.

The diagnostics foundation lands as an internal module: a condition registry
(`CairnCondition`), a `CairnError` throw primitive, and a shared condition-response renderer
that the admin guard's three rejection responses (the two CSRF reasons and the HTTPS check) now
route through. Those responses are unchanged and regression-pinned, and the module exports from
no package subpath. This is Pass 1 of the diagnostics initiative, the base the upcoming
`cairn doctor` and readiness checks build on.

Docs are reorganized and rewritten. A new README front door tells the save-flow story, says
what cairn is not, names the chosen stack, and then opens three doors: the tutorial, the
showcase, and the docs map. Stray top-level pages joined their Diátaxis arms (the admin route
contract is `docs/reference/admin-routes.md`, the sanitize floor is
`docs/explanation/render-safety.md`, key rotation is
`docs/guides/rotate-the-github-app-key.md`), and every adopter-facing page is rewritten in a
second-person, example-first voice with its technical content intact.

The magic-link sign-in confirmation is now a branded panel in place of the flat success bar. After an
editor requests a link, the page shows a mail icon in a soft success tile, a "Check your email"
heading, and the ten-minute expiry note, all in the admin's Warm Stone styling. Below a divider it
adds guidance for the link that never arrives: check the spam folder first, then confirm the address
matches the one the site owner added. This covers the common fat-finger case, where a mistyped address
gets the same neutral confirmation and no email. A "Use a different email" action returns to the form
so the address gets corrected without a reload. The confirmation copy stays identical whether or not
the email is on the allowlist, so the page still never leaks membership.

The change is internal to the `LoginPage` component and needs no action.

## 0.36.0

cairn now emits structured diagnostic events. The engine had three bare `console.error` calls and no
queryable diagnostics. An internal logger assembles a JSON record for each event, with an envelope
(`level`, `event`, `timestamp`) and event-specific fields, and writes it to `console`. Cloudflare
Workers Logs ingests and indexes those records when a site sets `observability.enabled = true`, so
each field filters. The event vocabulary covers the auth flow, the commit pipeline, and the admin
guard's pre-resolve refusals. The records carry an editor's email for attribution and never carry a
magic-link token, a session id, or a magic-link's contents; a standing redaction test pins that.

The event names are a stable contract, so renaming one is a breaking change later. The full list, with
each event's level, trigger, and fields, is in the new [log events reference](docs/reference/log-events.md),
and the [read cairn's logs guide](docs/guides/read-cairn-logs.md) covers the one setup line and the
dashboard query.

Consumers may: set `observability.enabled = true` in `wrangler.jsonc` to read the events in Workers
Logs. The change is otherwise additive and needs no action.

## 0.35.0

cairn now owns CSRF for the admin. A consuming site disables SvelteKit's global `checkOrigin`, and
cairn's guard becomes the single authority. Every unsafe admin form POST must carry a valid
`__Host-cairn_csrf` double-submit token (the cookie name is `cairn_csrf` bare on local http). The
token is issued lazily and stably by the login, confirm, and admin shell loads, rendered as a hidden
`csrf` field by the new `CsrfField` export, and validated centrally in the guard. A failed check
serves a branded 403 page in place of the framework's raw text. The session cookie stays a second
layer. The token tolerates a missing `Origin`, so the JS-free magic-link sign-in works from a
browser that omits the header. The guard restores the strict `Origin === url.origin` check for the
site's own non-admin form POSTs, so handing cairn the admin authority is not a net loss elsewhere.

The `CsrfField` component is a new export from `@glw907/cairn-cms/components`. The `LoginPage` and
`ConfirmPage` data now carries `csrf`, and `AdminLayout`'s `LayoutData` now carries `csrf`, which the
shell provides to its descendant forms through context.

Consumers must: set `csrf: { checkOrigin: false }` in `kit` in `svelte.config.js`. Without it the
framework's global check rejects the JS-free auth POST and the admin sign-in fails.

## 0.34.0

A deployed admin request that arrives over http now gets a clear, branded help page instead of the
framework's opaque CSRF 403. The magic-link sign-in posts a JS-free form, and the framework rejects a
form POST unless the request carries a matching https origin, so an admin reached over http cannot sign
in. The auth guard detects that case on a deployed host and serves a self-contained page that names the
problem, links to the https version for one-click recovery, and gives the exact Cloudflare fix (Always
Use HTTPS). The page matches the admin design system in light and dark. Local `wrangler dev` over http
is exempt.

The release also adds a `check:prose` gate (`scripts/check-admin-prose.mjs`, in CI) that scans the admin
components' user-facing strings for AI-writing tells, since the component copy ships compiled and a
consuming site's prose tooling never sees it.

Consumers may: force HTTPS at the edge (Always Use HTTPS plus HSTS), which the deploy guide now requires.
The help page is a fallback for the window before that is set, not a substitute.

## 0.33.0

The admin isolates itself from host chrome. A dev-only guard in the admin and login roots walks the
ancestor chain on mount and logs one `console.error` when a width-constraining ancestor sits between the
admin root and `<body>`, the sign that a site's root layout is wrapping the admin in its own nav, footer,
or container. The guard compiles out of production and changes no rendering. The canonical route pattern
is documented and demonstrated: a chrome-free root layout plus a URL-transparent `(site)` group that
holds the public chrome and `app.css`, so the host chrome never wraps `/admin`. The showcase gains a
`(site)` group with plain-CSS chrome, which proves the admin renders fully styled on a site that uses
neither Tailwind nor DaisyUI.

This closes the global at-rule note carried since the self-styling foundation. The compiled admin sheet
holds DaisyUI `@keyframes` and Tailwind `@property` rules that are document-global by CSS spec, but the
sheet is code-split to the admin roots that import it, so it loads only on `/admin`, and the route pattern
keeps the host's CSS off `/admin` from the other side. A boundary test pins that the admin sheet is
imported only by the admin roots.

Consumers must: keep the host root layout chrome-free and move the public chrome plus `app.css` into a
`(site)` route group, so the host chrome never wraps `/admin`. A site already on this structure needs no
change. The dev guard names the problem in the console if a root layout still wraps the admin.

## 0.32.0

The admin gets a real CMS UX. The concept list is now a searchable, sortable data-table with status
badges, formatted dates, per-row delete, and pagination. The sidebar carries an icon per nav item and
a user menu with sign-out. The topbar is sticky and shows breadcrumbs. The admin has a dark mode, with
a topbar toggle that persists through a cookie and follows the OS preference on a first visit. The admin
icons are Lucide, added as a runtime dependency.

This release also fixes the self-styled admin so its drawer sidebar renders: the stylesheet build now
flattens CSS nesting before scoping (so DaisyUI's `lg:drawer-open` reveal is not severed from its
parent), and the admin layout carries `data-theme` on a wrapper so the drawer's own classes are scoped
descendants. The build gained `lightningcss` as a build-only devDependency for the flatten step; this
does not affect a consumer's runtime.

A frontend-design polish pass then refined the look. The Warm Stone light and dark palettes gained
clearer surface layering and crisper borders, the sidebar an active state in a soft primary tint, and
the list table refined column labels, row hover, and cleaner entry-title links. The list now defaults
to newest-first. A reduced-motion preference is honored inside the admin. A scoped anchor reset
restores the no-underline, inherit-color default the omitted Preflight used to provide.

A design-identity pass then gave the admin its own look. Cairn has a wordmark set in Bricolage
Grotesque over a body face of Figtree, both self-hosted as variable woff2 under the SIL Open Font
License, so the admin makes no webfont network call. An app-icon brand tile sits at the top of the
sidebar with the Cairn cairn-stack mark, a CC0 public-domain glyph, beside a CMS chip. The surfaces
moved to softer radii and floating cards over a calm warm-neutral ground, with a soft violet lift on
the primary button. The sidebar and the topbar share one flat header strip, so their intersection
reads as a single plane.

The nav now groups its entries. The core Cairn functions live in one collapsible group, and a
developer's own admin extensions sit in their own custom-named groups at the same level. Each group's
open or collapsed state persists through a `cairn-admin-nav-collapsed` cookie that the layout load
reads for a no-flash first paint, the way the theme cookie already works. A command palette opens with
Cmd/Ctrl+K or the topbar search box, jumps to any admin destination, and runs a couple of actions like
the theme toggle. The login and confirm screens carry the same wordmark, voice, and favicon.

Two more rendering fixes landed in this window. The login and confirm screens centered on a wrapper
rather than the themed element, so they now fill the viewport like the rest of the admin. The command
palette closed its dialog from a result link's own click handler, and closing a native dialog mid-click
cancelled the navigation, so a destination did nothing; a destination now navigates and the palette
closes once the new route lands.

This is additive for a consumer that mounts the admin through the documented routes. The engine now
depends on `@lucide/svelte`, which installs transitively, so no consumer action is required. A new
`listDeleteAction` is available on the content routes for wiring per-row delete on the list page; the
showcase wires it as the list `?/delete` action.

## 0.31.0

The admin now ships its own stylesheet. The engine compiles the admin's Tailwind utilities and
DaisyUI component classes, scoped under the admin `data-theme`, and the admin styles itself on any
host with no Tailwind or DaisyUI of its own. The compiled sheet leaks no global rule, so it never
touches the host's pages.

Consumers may: remove any Tailwind `@source` entry that existed only to generate the admin's classes;
the admin no longer depends on the host's Tailwind or DaisyUI build. A host that already provides
DaisyUI globally keeps working, since the engine's scoped rules are low-specificity (`:where`) and
the class names match; a later pass moves the admin out of the host's chrome entirely.

## 0.30.0

Carved a `@glw907/cairn-cms/render` authoring subpath for the component-authoring toolkit. `iconSpan`,
`cardShell`, `headRow`, the re-homed `isElement`, and the new `strAttr` now live there, so the root barrel
stays lean and a component `build()` imports its helpers from one obvious place. Added `strAttr(ctx, key)`,
a string-attribute reader, a configurable `headRow` heading level that defaults to 2, a
`registry.iconField(name)` accessor, and a `defineRegistry` guard that fails a component declaring
`defaultIconByRole` with no `type:'icon'` attribute. Dropped `rehypeDispatch` from the public surface, so
`createRenderer` is the one public render pipeline.

Consumers must: import `iconSpan`, `cardShell`, `headRow`, `isElement`, and `strAttr` from
`@glw907/cairn-cms/render` instead of the package root, and replace any direct `rehypeDispatch` use with
`createRenderer`. A component that sets `defaultIconByRole` with no `type:'icon'` attribute now fails
`defineRegistry`; give it an icon attribute or drop `defaultIconByRole`.

## 0.29.0

Consolidated the URL-identity model. A content entry's id, slug, date, and permalink are now derived in
one place (`entryIdentity`), so the content index and the manifest cannot drift on an entry's URL, and a
site's concept descriptors are resolved through one path shared by the admin runtime and the delivery
layer. No public surface changed.

The YAML URL policy is now validated at build. A permalink pattern must be root-relative and use only the
tokens `:slug`, `:year`, `:month`, and `:day`, a date token is valid only on a dated concept, a
`datePrefix` must be `year`, `month`, or `day`, and a policy keyed to an undeclared concept fails the
build.

Behavior note: a site whose `content:` URL policy was malformed and silently defaulted will now fail the
build with a named error. A valid policy is unaffected.

## 0.28.0

### Security
Closed the render attribute-sink residual by construction. A new post-dispatch guard runs last in
`createRenderer` and neutralizes the sinks a component `build()` could route a raw author attribute
value into, including the unsafe URL schemes `javascript:`, `data:`, and `vbscript:` in `href`,
`src`, `srcset`, `xlink:href`, `poster`, `formaction`, `action`, `object`'s `data`, and
`background`, the inline `on*` event handlers, and inline `style`, which is stripped wholesale. Safe
schemes, relative URLs, anchors, and the `cairn:` token are preserved. The guard is gated by the
existing `unsafeDisableSanitize` switch.

Behavior note: a site whose component `build()` emits a non-standard URL scheme, an `on*` handler,
or inline `style` will see that output neutralized. Route dynamic styling through a class or an
inert `data-*` attribute instead.

## 0.27.0

### Changed (breaking)
Narrowed the public export surface so each symbol has one canonical home. The `.` root and
`/sveltekit` no longer re-export another subpath's symbols, and the internal GitHub, signing, and
hast helpers left the public API. No symbol changed behavior; only where it exports from.

- Consumers must: import the delivery read helpers (`createContentIndex`, `createSiteIndexes`, the
  feed, sitemap, robots, SEO, and pagination builders, `permalink`) from `@glw907/cairn-cms/delivery/data`
  instead of the `.` root.
- Consumers must: import the public route loaders and the `*Response` helpers (`createPublicRoutes`,
  `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`) and the public route types
  (`PublicRoutesDeps`, the public `ListData`, `TagData`, `TagIndexData`, `EntryData`) from
  `@glw907/cairn-cms/delivery` instead of the `.` root or `/sveltekit`.
- Consumers must: stop importing the internal helpers that left the public API (`appJwt`,
  `installationToken`, `signingSelfTest`, `appCredentials`, `treeUrl`, `contentsUrl`, `readRaw`,
  `fileSha`, `listMarkdown`, `markdownFilesIn`, `commitFile`, `isElement`, `strProp`, `markFirstList`);
  the engine wires GitHub token minting and the render pipeline internally, so no consumer needs them.

## 0.26.0

### Added
- A `cairnManifest()` Vite plugin (`@glw907/cairn-cms/vite`) verifies the committed content manifest on
  every build and fails the build with a diff naming what drifted. The check runs outside the prerender
  lifecycle, so `handleHttpError` cannot mask it. Consumers must: add `cairnManifest({ configModule,
  content, manifestPath })` to the Vite config.
- A `cairn-manifest` bin regenerates the committed manifest from a Vite context. Consumers must: set the
  regenerate script to `"cairn:manifest": "cairn-manifest"` and delete the hand-written
  `scripts/build-manifest.mjs`.
- A node-safe `@glw907/cairn-cms/delivery/data` entry exposes the pure delivery projections with no
  `@sveltejs/kit` in the graph. Consumers must: move any plain-Node import of a delivery data helper
  (such as `buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

### Changed
- `verifyManifest` now throws an error that names the added, removed, and changed entries. Consumers
  must: nothing. The message is strictly more informative.

## 0.25.0

### Changed (breaking)
- `composeRuntime` now takes a single object, `composeRuntime({ adapter, siteConfig, extensions? })`,
  and derives the per-concept URL policy from `siteConfig`. The loose third `urlPolicy` argument is
  gone, and a missing `siteConfig` throws. Consumers must: pass the parsed site config to every
  `composeRuntime` call and drop any hand-passed URL policy.

### Changed
- `createRenderer()` now defaults its registry to the empty registry, so a plain-prose site calls
  `createRenderer()` with no argument. Consumers must: nothing; passing a built registry is unchanged.

### Docs
- A render sanitize-floor reference (`docs/render-sanitize-floor.md`) states what the floor keeps,
  strips, and rewrites, including the `target="_blank"` rel policy.
- An upgrade guide (`docs/upgrading.md`) collects the `0.x` renames with a consumer action each.

## 0.24.0

### Added
- `headRow(title, icon?)` builds the icon-plus-heading component head, exported beside `cardShell` and
  `iconSpan`.
- A `createRenderer` `anchorRel` option sets the `rel` value forced on `target="_blank"` anchors
  (default `'noopener noreferrer'`), or disables the injection when set to `false`.

### Changed
- A component's `defaultIconByRole` default now reaches the build through the declared `type: 'icon'`
  attribute (`ctx.attributes`), so a role default no longer needs a hardcoded fallback in the build. A
  component using `defaultIconByRole` must declare a `type: 'icon'` attribute.
- The engine drops an unclaimed directive `[label]` when a component has no `title` slot, so a stray
  `[]` no longer renders an empty paragraph.

### Removed
- The internal `data-icon` marker, which no build read. The resolved icon now travels on the declared
  attribute path.

## 0.23.0

### Changed (breaking)
- A `date` field now validates a real `YYYY-MM-DD` calendar date. A site adopting this version whose
  committed content holds a malformed or impossible date will see it fail validation, which is the loud
  failure this restores.
- A `tags` field now enforces its declared `options` as a closed vocabulary. A committed value outside
  the list fails validation. Use a `freetags` field for free-form tags.
- `normalizeConcepts` now throws when a `summaryFields` key names no declared field, so a typo fails at
  config load instead of silently producing an empty list card.

### Changed
- `AttributeField.options` is now `readonly string[]`, so a site can share one frozen `as const`
  vocabulary across components. Read-only by use, so no call site changes.

## 0.22.0

### Added
- `ContentSummary.concept` and `EntryData.concept`: the read model carries its resolved concept id, so a
  list or page branches per concept without re-deriving it from `entry.date`.
- A `summaryFields` knob on a concept config surfaces named frontmatter keys on `ContentSummary.fields`,
  so a list card reads an authored field with no per-entry detail read.
- The package root re-exports the delivery route loaders (`createPublicRoutes`) and the response helpers
  (`rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`).

### Changed (breaking)
- `CairnHead` moved off the `@glw907/cairn-cms/delivery` barrel to its own `@glw907/cairn-cms/delivery/head`
  entry, so a node-environment data import from `/delivery` stays component-free. Update the import:
  `import { CairnHead } from '@glw907/cairn-cms/delivery/head'`.
