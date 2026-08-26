# Fresh-context verification: `reproductions` (12 items)

Verifier read `src/lib/reproductions/{index,manifest,validate}.ts`, `ReproContext.svelte`,
`docs/reference/reproductions.md`, `scripts/checks/check-visuals.mjs`, `ROADMAP.md:380-420`, and
`~/Projects/cairn-pub` at `f0a24c3` including its installed engine tarball
(`0.95.0-rc.1`, via a `file:` pin to `cairn-scratch/glw907-cairn-cms-0.95.0-rc.1.tgz`).

**Eleven of twelve verdicts stand. One flips: rank 4 `ReproFenceValidation`, keep -> retire.**

Three subsystem-level facts the ranking did not have, each of which moved at least one argument:

1. **The engine's own gate validates zero fences today.** `check-visuals.mjs:159` states in its own
   comment that "no shipped docs page carries a `repro`" fence. The gate machinery exists and
   `validateReproFence` is threaded through `scanDocument`/`scanTree` as a parameter, but the
   engine corpus it scans contains no `repro` fence. The "one implementation, two gates" rationale
   at `validate.ts:1-3` is therefore one live caller (cairn-pub) and one vacuous one.
2. **The `ReproInstance` / `oninstance` mechanism has never been exercised by any consumer.** The
   engine tarball cairn-pub actually installs ships `pose?: (root: HTMLElement) => Promise<void>` —
   one argument, no instance — and its `.d.ts` carries no `ReproInstance` at all. The two-argument
   pose is newer than the only consumer. cairn-pub's `repro-story-lifecycle.ts:25` calls
   `story.pose?.(element)` and will not type-check against the current signature on upgrade.
3. **A second host already has to comply with the hardcoded media base.** `ROADMAP.md:410-418`
   records that the *engine's own* browser test project serves nothing at `/repro-assets`, so every
   fixture image 404s during the engine's story-mount run. Two hosts, both family, both forced onto
   one root-absolute path with no override.

---

## Rank 1 — `stories` — RETIRE — **stands**

Confirmed unimported by cairn-pub (`grep` over `src/` finds only prose mentions of the engine's own
test file). Confirmed the sole stated justification is an in-repo test, at `index.ts:99-101` and
repeated verbatim on the reference page. Confirmed `manifest` + `getStory` cover enumerate and
resolve with nothing left over.

Tested the other way and found **one leg of the argument is weak**: "a consumer who reaches for
`stories` has just pulled Svelte into a node process" overstates it. `stories` lives on the
`/reproductions` subpath, which is the Svelte half by construction — a node process importing it
fails loudly at the first `.svelte` specifier rather than silently doing the wrong thing. The
retire does not need that leg. The first leg (an export whose only purpose is binding an in-repo
test is not a public surface) carries it alone.

**Execution note the reshapeNote understates.** `stories` is declared *in* `index.ts`, which IS the
subpath entry module, and the engine's own test imports it from
`../../lib/reproductions/index.js:12`. "Keep module-internal" therefore means moving the array to a
new internal sibling (`./registry.ts`) that `index.ts` and the test both import; it is not a
one-word deletion of `export`. Also touches `docs/reference/reproductions.md` and whatever
`check:reference` snapshots.

## Rank 2 — `fixtureMediaBase` — RESHAPE — **stands**

Verified the hardcode has no escape hatch: `ReproContext.svelte:209` sets
`setContext(MEDIA_BASE_CONTEXT_KEY, fixtureMediaBase)` unconditionally, `:256` writes the same value
into `shellData.mediaBase` for the shell branch, and the reference page (`:186-188`) states the key
is reserved and shadows a story's own `context`. There is no prop. The `paths.base` consumer cannot
comply at any effort.

Verified the reshape is mechanically viable: fixture asset URLs are composed at render time from
context plus the asset's slug/hash/ext (`src/tests/unit/reproductions-fixtures.test.ts:62-67` builds
them with `publicPath(..., fixtureMediaBase)`), not baked into the fixture data, so a prop
threads through cleanly.

Tested the counter-argument that the constant should survive as the documented default a lazy site
mounts its route at. It does not survive it: a SvelteKit route path is a directory name, so a site
spells `/repro-assets` in its filesystem regardless, which is exactly why cairn-pub's asset route
hardcodes the segment and imports the constant nowhere. The constant is a name for a hardcode.

One honest label caveat: the reshape's action is *un-export the constant* plus *add a prop to
`ReproContext`*. The export itself survives in no form; "reshape" names the membership (a settable
media base) rather than the symbol.

## Rank 3 — `ReproInstance` — KEEP — **stands, on different evidence**

**The ranking's stated ground is factually wrong.** Un-exporting does not leave the two signatures
"carrying an unnameable type": `Record<string, unknown>` is trivially writable by any consumer, and
declaration emit inlines an un-exported alias rather than failing. The alias is a label, not a
constraint, and the reference page says so outright ("Untyped by design", "The type stays open").

The keep survives on a ground the ranking did not name: **the engine's own design forces a
declaration site at every posing host.** `index.ts:89` makes `instance` a *required* second
parameter, deliberately ("It is a required parameter so a host that cannot supply it fails to
type-check rather than posing half the story", `:87-88`), and `oninstance` fires during mount while
`pose` runs after it, so every host that renders any of the eight `pose: true` stories must store
the value across the two. That is a real, universal, anonymous-consumer declaration site, and the
name it will reach for is the one in the signature it is implementing against.

Recorded against the keep: the mechanism is **unexercised**. The installed 0.95.0-rc.1 has a
one-argument `pose` and no `ReproInstance`; cairn-pub's `runStoryLifecycle` calls `pose` with one
argument and will break on upgrade. This is the weakest keep in the bucket, and it should be
re-tested the next time the `pose` signature moves: if the instance ever stops being a required
positional parameter, the alias goes with it.

## Rank 4 — `ReproFenceValidation` — KEEP — **DOES NOT STAND -> RETIRE**

Applied the same blade as rank 3 and it cuts the other way, on one evidenced distinction: **there is
no forced declaration site.** The result is consumed at the call, not carried across calls. The only
consumer imports `validateReproFence` and `ReproManifestEntry` at `repro-marker.ts:40` and never the
result type, destructuring `{ issues }` inline; the engine's own gate does the same
(`check-visuals.mjs:194-200` iterates issues directly), and its eleven unit-test call sites all
destructure inline (`src/tests/unit/reproductions-validate.test.ts:34` onward).

Against both gate clauses: a site can reach and write `{ issues: string[] }` (clause 1 fails), and
no ratified grammar has diverged (clause 2 fails). Against the failure test: a one-field result
object is the maximally small hand-roll. Zero demand, zero constraint carried, zero imports.

The keep's stated ground is evenness. Tested, evenness argues the other way here: the even rule this
surface can state is that a type carrying engine facts a site cannot derive stays
(`ReproManifestEntry`, `ReproHeights`, `ReproStory`, and `ReproInstance` on the forced-declaration
ground above), and a type that only labels a shape the caller already has does not. Keeping this one
is the accept-by-default the standard forbids.

**Replacement verdict: retire.** Inline the return as `{ issues: string[] }` on
`validateReproFence`. This lands naturally with rank 6, which re-cuts that function anyway; churn is
free (Unstable API, and the sole consumer never names the type), and if the reshaped validator ever
returns more than one field, exporting a name *then* costs nothing.

## Rank 5 — `ReproHeights` — KEEP — **stands**

The indexed read is real and demonstrated (`repro-marker.ts:114`), and the type is load-bearing in
the validator rather than decorative: `validate.ts:104-108` derives the pinnable set from the
story's own declared keys, so the optional-per-width shape is what lets a story refuse a width it
cannot show.

Tested the transplant objection harder than the ranking did and it is **worse than "mild", though
not at the type's altitude**. It is the *values*, not the key names, that carry cairn-pub's layout:
`manifest.ts:264-270` sizes `tags/screen` to 940 because its chips "land at roughly 814 and 900 **at
the docs measure**", and `ROADMAP.md:396-403` records that the crop gate hardcodes that measure as
704px "from cairn-pub's `--container-measure`", with the phone case ungated. An anonymous docs site
with a different column inherits heights calibrated to one site's measure.

That is a defect in the shipped data and in the gate, not in this export: the heights belong to
engine-owned stories a site cannot author, and hydration refines the shipped height against measured
content (`manifest.ts:22-23`). Keep stands; the measure-coupling is worth a ROADMAP line rather than
a verdict here.

## Rank 6 — `validateReproFence` — RESHAPE — **stands, strengthened**

The split is exactly where the ranking puts it. Verified the engine half at `validate.ts:88-93`
(story resolves against the installed manifest) and `:95-119` (width names a declared height, read
off `ReproHeights` rather than a list kept in the validator). Verified the transplanted half at
`:83-85` (`/^reproduction\b/i` — an English kind-prefix), `:31` (`MAX_ALT_LENGTH = 150`), and
`:29-30` (`ALLOWED_KEYS` closed to story/alt/caption/width).

**The reshape is stronger than argued**, on fact 1 above: the engine's own corpus carries no `repro`
fence (`check-visuals.mjs:159`), so the "two gates cannot silently drift apart" justification rests
on one live caller, cairn-pub, whose docs register wrote all three transplanted rules. The engine is
enforcing a prose standard it does not itself use, on a syntax (the fence) that belongs to the
consumer's own markdown plugin.

The engine's own ROADMAP argues against its own ceiling (`:386-388`: 150 characters "is thin for the
three locate-many-controls screens"), which is a rule the engine cannot fix for a site because the
site cannot configure it. Requiring an `alt` key at all is defensible as accessibility; requiring it
to start with an English word is register. Reshape as written.

## Rank 7 — `ReproManifestEntry` — KEEP — **stands**

Imported by the real consumer (`repro-marker.ts:40`), the element type of `manifest`, and the second
parameter of the validator, so it is unavoidable on the surface. Every field is an engine fact a
site cannot derive: `ownThemeRoot` encodes that `CairnAdminShell` resolves its own theme root
(`manifest.ts:52-59`, confirmed against `ReproContext.svelte:331,344`), and `pose` encodes whether
the contracted state lives in internal component state. Tested the `markerKeys` objection and it
holds as the ranking states — a marker key names an anchor in the engine's own markup, which only
the engine can enumerate. No reshape found.

## Rank 8 — `fixtureMediaFiles` — KEEP — **stands**

Survives the transplant test that sank rank 2, for the reason given: the names are content-hashed
build output (`manifest.ts:320-326`) a site cannot know or guess, and both needs — `entries()` for
prerender and an allowlist for a `[...file]` route — are structural rather than cairn-pub-shaped.
Tested the "the site could enumerate the directory itself" counter: a prerender or Worker cannot
`fs`-read the installed package, and an `import.meta.glob` into `node_modules` is a
resolution-dependent hack. Imported by cairn-pub twice, including as the security boundary of its
asset route. A flat `string[]` is the leanest form.

## Rank 9 — `ReproStory` — KEEP — **stands, with a shape flag**

Demand is real: three cairn-pub modules import it, and the settle-then-pose driver
(`repro-story-lifecycle.ts:17-27`) is the general shape any capture or embed pipeline writes.

Flagged, not enough to move it: the type publishes **engine-authoring fields no consumer can ever
author** — `component`, `props`, `context`, and `shellData` exist for story modules inside the
engine, while a consumer only ever reads `id`, `host`, `settle`, and `pose` off a value `getStory`
handed it. `shellData`'s `Partial<Extract<AdminShellData, { public: false }>>` additionally drags a
`sveltekit/content-routes-core` type into this subsystem's public signature, which the ranking also
caught. The honest reading is that this is one type serving two audiences; splitting it would be a
subsystem re-cut, not an item-level reshape. Keep, and re-examine if the subsystem is ever re-cut.

## Rank 10 — `getStory` — KEEP — **stands, conditionally**

The conditionality is worth stating explicitly because it is a dependency between two verdicts in
this bucket: as the surface stands *today*, `getStory` is a three-line `.find()` over an array the
same subpath exports, which is precisely the "small hand-roll" the standard fails an item for. Its
keep is only sound **if rank 1 is executed**. With `stories` retired it becomes the single door into
the Svelte half, which is the shape the node-safe split wants, and the throwing behavior
(`index.ts:118`) is the part a hand-roll routinely omits. Used by the real consumer at
`repro/[...story]/+page.svelte:46`. If rank 1 is declined, this one should be re-argued rather than
inherited.

## Rank 11 — `manifest` — KEEP — **stands**

The strongest membership case in the bucket after rank 12, and the split that gives it its own
subpath is the part an anonymous consumer would least likely invent. Verified the constraint is
enforced rather than merely documented: `manifest.ts:8-9` names two tests, a source-graph rule and a
bare-`node` dist spawn. Five cairn-pub call sites, plus `check-visuals.mjs` loading it from the
built artifact. The "fixed catalogue" objection is a property of the seam (the stories mount
components the package deliberately does not export), not a defect in this export.

## Rank 12 — `ReproContext` — KEEP — **stands**

The only item that meets the gate's first clause with nothing left to argue, and reading the
component confirms every element of the claim. Six mounted components are off the `/components`
barrel; two context keys are internal (`MEDIA_BASE_CONTEXT_KEY`, `CSRF_CONTEXT_KEY`, set at
`:209-210`); containment is five window capture listeners plus a document `focusin` handler
registered from the instance body for ordering reasons (`:119-183`), a dialog-inerting workaround
for the HTML inert algorithm's topmost-modal exemption (`:120-124`), and a `display: contents`
`inert` wrapper (`:342`, `:376-378`). None of that is reachable by a site at any effort, and the
ordering constraint alone (instance body, not `onMount`, so `TidyReview`'s mount-time `showModal()`
is already covered) is the kind of thing a site would rediscover only by shipping the bug.

Second clause holds too: the containment exists because mounted admin components misbehave when they
do not own the page, which is engine-internal behavior a site cannot patch.

Caveat carried from rank 2 and no further: the fixture media base is hardcoded here rather than
taken as a prop. That is the one place this otherwise well-shaped component reaches into the
consumer's URL namespace, and rank 2's reshape lands in this file.

---

# Second verification pass (independent, fresh context)

Read the four source modules and `docs/reference/reproductions.md` before reading the pass above,
so the verdicts below were formed independently and then tested against it. Sources checked:
`src/lib/reproductions/{index,manifest,validate}.ts`, `ReproContext.svelte`,
`scripts/checks/check-visuals.mjs`, `package.json` exports + deps, every in-repo import of the
subsystem, and `~/Projects/cairn-pub` at `f0a24c3` with its installed `0.95.0-rc.1` tarball.

**Ten stand. Two flip: rank 3 `ReproInstance` and rank 4 `ReproFenceValidation`, both keep -> retire.**
I agree with pass one on rank 4 and disagree with it on rank 3; the reasoning is below.

## Three facts this pass adds

1. **Un-exporting a type does not make a signature unnameable.** Measured, not assumed: compiled a
   minimal case with `tsc --declaration`. A non-exported same-file alias is emitted into the `.d.ts`
   verbatim (`type Inst = Record<string, unknown>;`) and the exported signature keeps referring to
   it. Rank 3's entire stated ground ("makes those signatures carry an unnameable type") is false as
   a TypeScript fact, and the cross-file half (ReproContext importing the alias) is an authoring
   choice, not a constraint.
2. **`ReproFenceValidation` is named at zero call sites in the whole world.** `grep` over `src/`,
   `scripts/`, and cairn-pub finds its declaration (`validate.ts:13`), its use as the function's own
   return annotation (`:48`), the re-export line (`manifest.ts:331`), and the reference page. Nothing
   else. Retiring it is one clause off `manifest.ts:331`; the interface stays where it is, on an
   internal module that no export-map entry reaches.
3. **The engine never validates the responsive default's height, so `manifest.ts:174-177` is wrong
   about its own gate.** That comment claims "a responsive fence against this story fails gate 1 for
   want of a declared height". `validate.ts:95-119` checks a height only when `width` is present; a
   fence that omits `width` (which is exactly how a fence asks for `column`) is never checked against
   `heights.column`. cairn-pub absorbs the consequence: `repro-marker.ts:113-121` throws an "internal
   error" it documents as "Unreachable when validateReproFence returned no issues", and that guard is
   reachable today for `publish/header-band`. Worth filing regardless of any verdict here.

## Rank 3 — `ReproInstance` — KEEP — **DOES NOT STAND -> RETIRE**

I formed this before reading pass one, which keeps it. Both passes agree the ranking's stated ground
is false (fact 1). Pass one then rescues the keep on "the engine forces a declaration site at every
posing host". Tested, that ground does not carry it:

- The declaration is forced; the *name* is not. A host writes `let instance: Record<string, unknown>
  | undefined` and is finished. That is the maximally small hand-roll, and no import is needed for it.
- The alias carries no engine fact. Every other type this subsystem exports describes something a
  site cannot derive (`ReproManifestEntry`'s flag set, `ReproHeights`' declared widths, `ReproStory`'s
  mount description). This one is `Record<string, unknown>`, and its own doc says so twice: "Untyped
  by design" (`index.ts:26`) and "The type stays open" (reference `:71`). Pass one states the even
  rule correctly — a type carrying engine facts stays, a type labelling a shape the caller already
  has does not — and then exempts the one item its rule was written to catch.
- It costs a reader a lookup for zero information: `pose(root, instance: ReproInstance)` sends them
  to a page that says `Record<string, unknown>`, where the inlined form would have told them at the
  call site.
- Demand is not merely thin, it is nil in a stronger sense than the ranking knew. The engine tarball
  cairn-pub installs (`0.95.0-rc.1`) ships `pose?: (root: HTMLElement) => Promise<void>` and no
  `ReproInstance` at all; `repro-story-lifecycle.ts:25` calls `story.pose?.(element)` with one
  argument. No consumer has ever had this parameter, let alone needed to name its type.

**Replacement verdict: retire.** Inline `Record<string, unknown>` at the two signatures. Execution
note, same shape as rank 1's: the alias is declared in `index.ts`, which *is* the subpath entry, and
`ReproContext.svelte:60` and `src/tests/component/_repro-mount.ts:10` import it cross-file, so
retiring means inlining at those sites (or moving the alias to an internal sibling), not deleting a
keyword. If a later pass ever gives the instance a real constraint, exporting a name then is free.

## Rank 4 — `ReproFenceValidation` — KEEP — **DOES NOT STAND -> RETIRE**

Reached independently and it matches pass one. The discriminator I applied is the same even rule:
this type carries no engine fact. Fact 2 above adds the measurement pass one gestured at — zero
naming call sites anywhere, including eleven in-repo test call sites and the engine's own gate
(`check-visuals.mjs:194-200`), all of which destructure `{ issues }` inline.

The counter I tested and rejected: a named result object is the conventional extension point, so
keeping it costs nothing against the day a second field appears. Churn is free before beta and every
export here is self-declared Unstable API, so "name it when it needs a name" is strictly cheaper than
carrying a name nothing uses. Keeping it is accept-by-default.

Retiring it is one edit: drop `type ReproFenceValidation` from the re-export at `manifest.ts:331`.
The interface stays exported from `validate.ts`, which no export-map entry reaches.

## Rank 11 — `manifest` — KEEP — **stands, after a flip I tried and could not sustain**

Recording the failed attempt, since it is the one place I nearly diverged from both prior documents.

The case for reshaping: `heights` is derived from one consumer's page contracts rather than from
engine constraints, which is constraint 3's transplant test. `manifest.ts:174-177` is explicit for
`publish/header-band` — it declares no `column` height "on purpose", because "a responsive band
render is not a thing that page asks for". Several other omissions are engine-justified (the `sm:`
640 toolbar gate, the shell's 1024/1280 sidebar breakpoint); that one is not. If it hard-blocked an
anonymous site's build, it would be the same failure class as rank 2's 404 and would deserve the same
verdict.

It does not hard-block. Fact 3: the validator never checks `heights.column`, so a responsive fence
against that story passes gate 1. The consequence lands in the embedding site's own height
resolution, where the site can decide what an undeclared height means. With no engine-side refusal,
what is left is a miscalibrated first-paint number that hydration refines (`manifest.ts:22-23`) —
which is pass one's read at rank 5, and it is right. Keep stands; the measure-coupling and fact 3 are
ROADMAP or bug-fix material, not an item verdict.

## Rank 6 — `validateReproFence` — RESHAPE — **stands; the reshapeNote is incomplete**

Agreed on the split and on both passes' evidence. One addition neither names: the reshaped function
should also shed **the fence format itself**. Its input is a raw YAML body (`validate.ts:45`, `parse`
from `yaml`), which presupposes cairn-pub's ```repro fenced-code authoring convention; a site
embedding stories through a component, MDX, or frontmatter has no fence body to hand it. The
required-key rule (`REQUIRED_KEYS = ['story','alt','caption']`) is the same transplant one level down:
requiring `alt` is accessibility, requiring `caption` is that site's register.

What survives as engine-owned is a data-level check over two already-exported values — the story id
resolves against `manifest`, and a pinned width has a declared height on that entry. I tested whether
that residue is itself too small to export (three lines over exported data, which is the standard's
own failure clause) and concluded reshape still beats retire: the width rule reads the pinnable set
off `ReproHeights` rather than a list (`:104-108`), and its "declared: wide, desktop" hint is the part
a hand-roll omits. But the reshape must produce a function taking `(storyId, width, manifest)`, not
one taking a YAML string.

## The eight I confirmed without amendment

Rank 1 `stories` (retire), rank 2 `fixtureMediaBase` (reshape), rank 5 `ReproHeights` (keep), rank 7
`ReproManifestEntry` (keep), rank 8 `fixtureMediaFiles` (keep), rank 9 `ReproStory` (keep), rank 10
`getStory` (keep, conditional on rank 1 executing), rank 12 `ReproContext` (keep). Independent checks
worth recording:

- **Rank 1.** Every in-repo importer of `stories` uses a relative source path
  (`reproductions-stories.test.ts:12`), so retiring the *export* costs the engine's own test nothing.
  cairn-pub imports it nowhere. `manifest` + `getStory` cover enumerate and resolve.
- **Rank 2.** Confirmed there is no override path at all: `ReproContext.svelte:209` sets the context
  key unconditionally and `:256` writes the same constant into `shellData.mediaBase`, whose only
  override (`story.shellData`) belongs to the story, not the mounting site. A `paths.base` site
  cannot comply.
- **Rank 8.** One flag pass one did not raise: the export is half a seam. cairn-pub still hardcodes
  `dist/reproductions/fixtures` to find the bytes (`repro-assets/[...file]/+server.ts:21`), an
  internal layout path the engine documents nowhere. Shipping the filenames but not their location
  is uneven. Not enough to move the verdict — retiring it makes a site strictly worse off — but the
  location half is the missing piece if this subsystem is ever re-cut.
- **Rank 10.** Confirmed the dependency: with `stories` exported, `getStory` is a `.find()` a site
  can write; the keep is sound only if rank 1 executes.
