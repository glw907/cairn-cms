# Any-site audit: the `reproductions` subsystem

Subpaths `@glw907/cairn-cms/reproductions` and `@glw907/cairn-cms/reproductions/manifest`.
Twelve unique exported symbols, ranked weakest-to-strongest anonymous-consumer case.
**No item in this bucket carries `collision: true`** — every one of the twelve is flagged
`"collision": false` in `bucket-reproductions.json`, so nothing here shares a name with a
differing signature elsewhere on the surface.

## Subsystem-level provenance (applies to all twelve)

Family-originated by construction, and the record is explicit about which family member asked.
`docs/internal/record/2026-08-15-live-reproduction-seam-requirements.md:3` names the origin:
"The consolidated input for the seam's design sitting in cairn-pub, pulled forward on Geoff's
2026-08-15 sequencing call". The demand side is enumerated as a list of cairn-pub docs pages
(`:22-33`), and the id inventory is owned by a spec in the *other* repo:
`manifest.ts:14-16` — "The ids, their order, and the flags come from the story inventory in
cairn-pub docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md".

**No consumer outside the family exists.** The subsystem shipped in `0.95.0` and its sole
importer is cairn-pub. I checked `~/Projects/cairn-pub` at `f0a24c3` directly. Seven of the
twelve names are imported somewhere in that tree; **five are imported nowhere by the only
consumer that exists**: `stories`, `ReproInstance`, `ReproHeights`, `ReproFenceValidation`,
`fixtureMediaBase`. That fact does not decide a verdict on its own (a type referenced by an
exported signature is used without being imported), but it is the sharpest available evidence
about which exports are load-bearing and which are surface.

**The gate's first clause is squarely met for the subsystem's core.** The audit record is
unusually clear that a site cannot reach what a story mounts:
`docs/internal/record/repro-story-audit.md:405-407` — "**No story needs a new public export.**
Six of the mounted components are absent from the `/components` barrel...
`EditorToolbar`, `TidyReview`, `MediaFigureControl`, `MediaCaptureCard`, `MediaInsertPopover`,
`MediaHeroField`", and :413 — "Exporting them would be net harmful, not merely unnecessary".
So the anonymous-consumer scenario for the core is real: a cairn site that ships an editor
handbook to its own authors, wanting renders of the admin that cannot go stale, cannot build
this itself at any price. It cannot import six of the components, cannot reach the admin
stylesheet or the internal context keys, and cannot implement the containment. cairn-pub is
one instance of that shape, not the shape itself.

Where the subsystem is weakest is not membership but **shape at the edges**: two items carry
cairn-pub's own conventions into the engine (a URL path segment, a docs prose register), which
is the transplant failure the standard's constraint 3 names.

Every export here is self-declared Unstable API (`docs/reference/reproductions.md:35-36`:
"Every export on both subpaths is Unstable API: the registry is new, coupled to one consumer's
build (cairn-pub's docs), and its shape is not yet committed across minor versions"). Churn is
free, so no verdict below is softened by migration cost.

---

## Rank 1 — `stories` — RETIRE

- **surfacedAt:** `/reproductions`
- **Signature:** `ReproStory[]`

**Provenance.** Engine-internal. Its documented justification is a test in this repo, not a
consumer need: `index.ts:99-101` — "The registered stories, in manifest order: the full 25.
`src/tests/component/reproductions-stories.test.ts` binds this array against `manifest.ts`."
The reference page repeats the same and only that justification
(`docs/reference/reproductions.md:123-125`).

**Anonymous-consumer case.** The weakest in the bucket, and it is weak in two directions. First,
it is unused: grep across cairn-pub's `src/` finds no import of `stories`; the only hits are two
prose comments naming the *engine's* test file. Second, and worse, it points a consumer at the
wrong half of a deliberately split seam. The whole reason two subpaths exist is that build-time
work must not touch Svelte — `manifest.ts:5-7`: "the engine's check:visuals gate and cairn-pub's
fence validation both read this module from a bare `node` process, so a single Svelte-carrying
specifier anywhere in the graph would break both gates at once." Enumerating the registry is
build-time work, and `manifest` already answers it node-safely. A consumer who reaches for
`stories` to list the registry has just pulled Svelte into a node process. Every legitimate
consumer need is served by `manifest` (enumerate) plus `getStory` (resolve one).

**Verdict: retire.** Un-export it; keep it module-internal, where `getStory` and the engine's own
test still reach it. An export whose sole stated purpose is binding an in-repo test is not a
public surface. Retiring it also raises `getStory`'s standing (rank 10) from "a `.find()` a
consumer could write" to the only door into the Svelte half, which is the shape the split seam
wants.

---

## Rank 2 — `fixtureMediaBase` — RESHAPE

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `"/repro-assets"`

**Provenance.** cairn-pub's route layout, named as such in the engine's own doc comment.
`manifest.ts:309-311`: "The path segment every fixture media URL mounts under on `/repro` pages,
**cairn-pub's own asset route** (never `/media`, the real admin's default)". The reference page
softens the wording to "a `/repro` page" but the mechanism is unchanged.

**Anonymous-consumer case.** This is the clearest transplant in the bucket. The value is not a
suggestion a site may take; `ReproContext.svelte:209` sets it unconditionally
(`setContext(MEDIA_BASE_CONTEXT_KEY, fixtureMediaBase)`), with no prop to override it, and the
reference page confirms the keys are reserved and shadow a story's own context
(`docs/reference/reproductions.md:185-188`). So the engine dictates an absolute URL inside the
consumer's own route namespace. An anonymous site that deploys its docs under a SvelteKit
`paths.base` (GitHub Pages at `/docs`, a docs section mounted under a prefix) has no way to
comply: every fixture image resolves to a root-absolute `/repro-assets/...` that does not exist
on that origin, and the failure mode is the silent one the ROADMAP already records for the
engine's own test project (ROADMAP.md:410-418, images 404ing into an "Image missing" block).

The exported constant does not even mitigate the hardcode it names. cairn-pub cannot use it for
the thing that matters: a SvelteKit route path is a directory name, so the base is spelled out
in `src/routes/repro-assets/[...file]/+server.ts` and the constant survives only as a comment —
"at the base the engine's own manifest names (fixtureMediaBase, '/repro-assets')" (that file,
:1-2). The constant is imported nowhere in cairn-pub. It is a name for a hardcode, not the
single source of truth it was justified as.

**Verdict: reshape.** Right membership (the media base must be settable, and the fixture bytes
must resolve), wrong form. `reshapeNote`: make the media base a `ReproContext` prop that a
mounting site passes, defaulting internally to `/repro-assets`; then the site owns its own URL
space and the exported constant can go with the export map entry. Argued the other way: the
constant is harmless and documents a convention. That is exactly the accept-by-default the
standard forbids, and it does not answer the `paths.base` site.

---

## Rank 3 — `ReproInstance` — KEEP (thinnest)

- **surfacedAt:** `/reproductions`
- **Signature:** `{ [x: string]: unknown }`

**Provenance.** Engine-internal, forced by one story. `index.ts:83-85`: "`media/insert-panel` is
the case that forced it: the real editor mounts the popover headless and opens it from the
toolbar's icon button, so a click-only pose had to render a trigger button that exists nowhere
in `/admin`." Family-originated with the rest of the seam.

**Anonymous-consumer case.** Thin, and honestly so. The type is `Record<string, unknown>`, a
one-line hand-roll, and cairn-pub imports it nowhere. The concrete scenario that keeps it is a
declaration site rather than a call site: a host that mounts and later poses must store the
instance between the two (`oninstance` fires during mount, `pose` runs after), so it writes
`let instance: ReproInstance | undefined`. cairn-pub gets away without naming it because its
lifecycle helper takes `Pick<ReproStory, 'settle' | 'pose'>` instead.

**Verdict: keep**, on the narrow ground that un-exporting a type that appears in two exported
signatures (`ReproStory.pose` and `ReproContext`'s `oninstance`) makes those signatures carry an
unnameable type, which is a worse surface than a thin alias. I am recording this as a keep that
rests on the absence of an objection rather than on demand: nothing breaks, and the alternative
is worse. `absenceOfObjection: true`.

---

## Rank 4 — `ReproFenceValidation` — KEEP (thin)

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `{ issues: string[] }`

**Provenance.** Engine-internal, created alongside the shared validator.
`validate.ts:1-2`: "the repro fence validator, shared by the engine's check:visuals gate
(gate 1) and cairn-pub's docsReproBlocks build-time throw (gate 3, Pass 2)". Both named gates
are family.

**Anonymous-consumer case.** A single-field result object, and the one real consumer never names
it: `src/lib/docs/repro-marker.ts:40` imports `validateReproFence` and `ReproManifestEntry` and
destructures the result inline. The concrete scenario is one step removed — a site wrapping the
validator in its own build plugin, whose wrapper function needs a declared return type, or one
mapping issues into its own diagnostic shape.

**Verdict: keep.** Same reasoning as rank 3: it is the declared return of an exported function,
so it is already in the `.d.ts` whether or not it has a name, and a named return is the more even
surface. Argued against: a `{ issues: string[] }` return could be inlined and the export dropped
with no consumer noticing. That is true, and it is why this sits at rank 4. The keep leans on
coherence rather than demand, so `absenceOfObjection: true`.

---

## Rank 5 — `ReproHeights` — KEEP

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `{ column?: number; wide?: number; desktop?: number; narrow?: number }`

**Provenance.** Family: the widths come from cairn-pub's page contracts, and the requirements
brief made two-width rendering a named requirement — requirements brief :44-46, "**Two-width
rendering** where a contract states a narrow-screen variant. `publish-and-history.md`'s header
band is the decider."

**Anonymous-consumer case.** Concrete and demonstrated. Any site embedding a story in an iframe
must size it before it loads, and the read is exactly the indexed access this type describes:
cairn-pub `src/lib/docs/repro-marker.ts:114` — `const height = width ? entry.heights[width] :
entry.heights.column;`. An anonymous docs site doing the same embed makes the same read. The type
is also load-bearing in the schema, not decorative: `validate.ts:39-41` — "`ReproHeights` is the
schema for that last rule: nothing here enumerates width names, so a story that later declares a
new pinned width needs no matching edit here."

**Verdict: keep**, in its current shape. The optional-per-width shape is the right one; it is what
lets a story refuse a width it cannot show ("A width with no declared height is a width the fence
schema refuses", `manifest.ts:21-22`). Argued against: the names `wide`/`desktop`/`narrow` encode
cairn-pub's three pinned widths and their pixel values live only in prose, which is a mild
transplant. It is mild enough to leave: the names are opaque tokens the manifest defines, not a
site's layout leaking into the engine.

---

## Rank 6 — `validateReproFence` — RESHAPE

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `(body: string, manifest: ReproManifestEntry[]) => ReproFenceValidation`

**Provenance.** Written to keep two family gates from drifting. `validate.ts:1-3`: "shared by the
engine's check:visuals gate (gate 1) and cairn-pub's docsReproBlocks build-time throw (gate 3,
Pass 2). One implementation checks a `repro` fence body against the manifest so the two gates
cannot silently drift apart." The reference page states the same rationale
(`docs/reference/reproductions.md:291-292`). cairn-pub imports it at `repro-marker.ts:40`.

**Anonymous-consumer case.** Split down the middle, which is what makes this a reshape rather than
a keep or a retire. Half the function checks things only the engine can know: does this story id
resolve against the installed manifest (`validate.ts:91-92`), and does this story declare a height
for the width the fence pins (`:104-108`). That half is squarely the engine's — a site cannot
check it without the manifest, and getting it wrong is the stale-embed failure the whole seam
exists to prevent.

The other half is cairn-pub's docs register, transplanted. `validate.ts:83-85` hardcodes
`if (!/^reproduction\b/i.test(alt.trim()))` — "alt text must name the kind, starting with
'Reproduction'" — and `:31` fixes `MAX_ALT_LENGTH = 150`. Both trace to the family's own prose
standard (requirements brief :56-59, "**Alt and caption per the register.** The Visuals section
of docs-register.md governs reproductions too"). An anonymous consumer whose docs are not in
English, or whose accessible-name convention is not an English kind-prefix, or who has decided
150 characters is too short — and the engine's own ROADMAP already argues it is: ROADMAP.md:386-388,
"a 150-character accessible name is thin for the three locate-many-controls screens" — gets a hard
refusal from a build gate with no way to configure it. The key allowlist is equally the site's:
`ALLOWED_KEYS` fixes `story`/`alt`/`caption`/`width` (`:29-30`), so a site wanting a `lang` or a
`figure-id` key on its own fence fails validation for a rule the engine has no stake in.

**Verdict: reshape.** `reshapeNote`: split the checks. The engine keeps and exports the half only
it can answer — story resolves against the installed manifest, width has a declared height — and
the prose-register rules (the `Reproduction` prefix, the 150-character ceiling, the closed key
set) move behind caller-supplied options or back to the site that owns its register. Argued the
other way: one implementation is what stops gate 1 and gate 3 diverging, and splitting risks that.
It does not — both gates would still call the same engine half; they would simply stop sharing a
rule that was never the engine's.

---

## Rank 7 — `ReproManifestEntry` — KEEP

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `{ id: string; heights: ReproHeights; markerKeys: string[]; pose: boolean; host: "shell" | "bare"; ownThemeRoot: boolean }`

**Provenance.** Family; the field set is the flag list from cairn-pub's spec
(`manifest.ts:14-16`). Imported by the real consumer at `repro-marker.ts:40`.

**Anonymous-consumer case.** Concrete. It is the element type of `manifest` and the second
parameter of `validateReproFence`, so any site that iterates the registry at build time — to
prerender one route per story, to size an embed, to count callout chips against its prose list —
types that iteration through this. cairn-pub does exactly this in its `/repro/[...story]` route
loader and its styleguide loader. The fields are engine facts a site cannot derive: whether a
story needs a pose, whether it hosts in the shell, whether it resolves its own theme root
(`manifest.ts:52-58` explains the last one turns on `CairnAdminShell` being an own-theme-root
component, which is engine-internal knowledge).

**Verdict: keep**, current shape. It is a data description of engine internals, which is the
cleanest thing an engine can hand a site. Argued against: `markerKeys` arguably encodes a docs
convention (numbered callouts) the way the alt rule does. It differs in kind — a marker key names
an anchor *in the engine's own markup*, which only the engine can enumerate, so it stays.

---

## Rank 8 — `fixtureMediaFiles` — KEEP

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `string[]`

**Provenance.** Family; written for cairn-pub's asset route by name. `manifest.ts:316-318`: "so
cairn-pub's asset route (`src/routes/repro-assets/[...file]/+server.ts`) can enumerate them for
`entries()` without importing the Svelte-carrying `./index.js` half of this module."

**Anonymous-consumer case.** Concrete, and it survives the transplant test that sank
`fixtureMediaBase` at rank 2. The filenames are content-hashed build output —
`'trailhead-view.4dcfd814c4ebd018.png'` (`manifest.ts:321`) — so a site cannot know them, cannot
guess them, and cannot read the package directory from a prerender or a Worker. Any site serving
these bytes needs two things at build time: the list, to generate one prerendered entry per file,
and an allowlist, to keep a `[...file]` route from being walked into the rest of the installed
package. The real consumer uses it for both, and calls the second the security boundary
(cairn-pub `repro-assets/[...file]/+server.ts:26-28`: "membership in fixtureMediaFiles, not a path
shape a filename might satisfy by accident, is what keeps this route from being walked into the
rest of the installed package tree"). An anonymous site hits both needs identically.

**Verdict: keep.** A flat `string[]` is the leanest form that answers both needs; nothing about it
is shaped by cairn-pub. Argued against: it exposes a build-output detail. That is the point — the
detail is precisely what the site cannot compute.

---

## Rank 9 — `ReproStory` — KEEP

- **surfacedAt:** `/reproductions`
- **Signature:** `{ id: string; component: Component<...>; host: "shell" | "bare"; shellData?: ...; props; context?; settle?; pose?; markers? }`

**Provenance.** Family; the posing requirement is requirement 2 of the brief
(requirements brief :39-43: "**Posed state, not just defaults.** ... The seam must be able to pose
component state, which is a harder requirement than rendering."). Imported by the real consumer in
three modules (`repro-chips.ts:26`, `repro-story-lifecycle.ts:6`, `repro-chips.test.ts:12`).

**Anonymous-consumer case.** Concrete: a capture or embed pipeline must run `settle` then `pose`
in order against the mounted root before it screenshots or measures, and typing that driver needs
the story's shape. cairn-pub's is `repro-story-lifecycle.ts:18` — `story: Pick<ReproStory,
'settle' | 'pose'>`. Any site that renders a story to an image, or that waits for a client-only
surface before measuring an iframe, writes the same driver. The type also carries knowledge no
site can reconstruct: which stories need a settle at all, and why (`index.ts:69-73` — the editor
"renders a hidden input, an empty div, and a fallback textarea until CodeMirror arrives through
dynamic imports in `onMount`").

**Verdict: keep**, current shape. The one thing I would flag rather than fix: `shellData` is typed
`Partial<Extract<AdminShellData, { public: false }>>`, which reaches into a
`sveltekit/content-routes-core` type and drags a chunk of unrelated shell surface into this
subsystem's public signature. It is the right data (a shell story must override desk pathname and
pending set) reached by a wide handle. Not enough to move it off keep, and worth a look if this
subsystem is ever re-cut.

---

## Rank 10 — `getStory` — KEEP

- **surfacedAt:** `/reproductions`
- **Signature:** `(id: string) => ReproStory`

**Provenance.** Family; the fence's resolution step. `docs/reference/reproductions.md:135-137`: "A
`repro` fence resolves its `story` key through this function (or the equivalent manifest lookup,
for a gate that never needs the Svelte half)." Used by the real consumer at
`src/routes/repro/[...story]/+page.svelte:46`.

**Anonymous-consumer case.** Concrete: a `/repro/[id]`-shaped route resolves a URL param to the
one story it mounts, and throws a real 404 when the id is unknown rather than rendering a blank
frame. That is the exact use in the only built consumer, and it is the general shape of the
scenario — a site embedding stories by id needs one door from id to mountable story.

**Verdict: keep.** Its case rises if rank 1 is acted on: with `stories` retired, this is the only
route into the Svelte half, and a consumer can no longer hand-roll the lookup by mistake on the
wrong side of the node-safe split. Argued against: as the surface stands today it is a
three-line `.find()` over an array the same subpath exports, which by itself is the "small
hand-roll" the standard fails an item for. That objection is an argument for retiring `stories`,
not for retiring this. The throwing behavior (`index.ts:118`) is also the part a hand-roll
routinely omits.

---

## Rank 11 — `manifest` — KEEP

- **surfacedAt:** `/reproductions/manifest`
- **Signature:** `ReproManifestEntry[]`

**Provenance.** Family; the id inventory is cairn-pub's spec (`manifest.ts:14-16`). It is the most
imported name in the bucket: five call sites across cairn-pub (`repro-marker.ts`,
`repro-build-artifacts.test.ts`, `styleguide/+page.server.ts`, `repro/[...story]/+page.server.ts`,
`repro/repro-routes.test.ts`), and the engine's own gate loads it from the built artifact
(`scripts/checks/check-visuals.mjs:343-344`).

**Anonymous-consumer case.** Concrete and structural. A site embedding reproductions needs, at
build time and from a bare node process, the list of what exists and how each one must be framed.
It cannot hand-write that list: the entries describe engine internals (`ownThemeRoot` turns on
`CairnAdminShell`'s own theme resolution; `pose` turns on whether a state lives in internal
component state), and a hand-written copy is precisely the staleness the seam was built to
eliminate — requirements brief :18-20, "The anti-staleness mechanism is identity: the reproduction
IS the component from the installed engine, pinned to the engine version the docs ship with, so it
cannot drift from the product the way a captured image does." Shipping the manifest with the
engine is what makes a fence naming a removed story fail the consumer's build instead of rendering
nothing.

**Verdict: keep**, current shape, including the node-safe split that gives it its own subpath. The
split is the thing an anonymous consumer most benefits from and would least likely invent:
`manifest.ts:5-7` states the constraint, and two tests hold it (source graph and a bare-`node`
dist spawn). Argued against: the array is 25 rows tuned to one site's pages, so an anonymous
consumer inherits a fixed catalogue it cannot extend. True, and it is the real ceiling on this
subsystem — but a site cannot extend it in any shape, because the stories mount components the
package does not export, so this is a property of the seam rather than a defect in this export.

---

## Rank 12 — `ReproContext` — KEEP (strongest)

- **surfacedAt:** `/reproductions`
- **Signature:** `Component<Props, {}, "">` (props: `story`, `theme?`, `oninstance?`)

**Provenance.** Family; the mounting wrapper the seam pass built (commit `10d71ae5`, "Add the
stories module, the mount wrapper, and the auth pair"), hardened by a later containment pass
(`f252bf71`, "Contain what the reproduction seam mounts"). Used by the real consumer at
`src/routes/repro/[...story]/+page.svelte:46`.

**Anonymous-consumer case.** The one item in the bucket that meets the gate's first clause with no
argument needed: the site cannot legally reach or patch this surface. Concretely, a site that
wants a live render of the cairn editor in its own editor handbook would have to import
`EditorToolbar`, `TidyReview`, `MediaInsertPopover` and three more components the package
deliberately does not export (`repro-story-audit.md:405-407`), set two internal Svelte context
keys it has no access to (`ReproContext.svelte:208-209`), carry the engine's admin stylesheet, and
then re-implement containment: the reference page describes taking over `keydown`, `pointerdown`,
`dragover`, `drop`, and `beforeunload` for the whole document and marking the mounted subtree
inert (`docs/reference/reproductions.md:167-174`). None of that is available to a site at any
effort. The second half of the same clause holds too: the containment exists because the mounted
admin components misbehave when they do not own the page — ROADMAP.md:1840-1845 records
`TidyReview` calling `showModal()` at mount and pulling the host page's focus, "fine for a
component that owns its page and hostile to one that does not."

**Verdict: keep.** One shape caveat, already carried as rank 2's reshape: `ReproContext` hardcodes
the fixture media base rather than taking it as a prop, which is the single place this otherwise
well-shaped component reaches into the consumer's URL namespace. Fixing that is the rank 2
reshape and it lands here. Argued against the keep: the component is one consumer's mount wrapper
and the docs page itself says the registry is "coupled to one consumer's build". Coupled it is —
but the coupling that would matter is a shape one, and the shape (a story in, a contained mount
out) is the general one. The requesting site's own concerns that *did* try to ride along, the alt
register and the asset path, are called out at ranks 6 and 2 rather than defended here.
