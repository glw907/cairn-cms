# Verify: core / adapter / content internals findings

Fresh-context verification, 2026-08-26, repo at `main` (clean tree). Each finding tested in both
directions against the code, `docs/internal/code-idioms.md`, `docs/internal/engine-rulings.md`,
`docs/extend/content-model.md`, and the `record/` docs.

**Summary: all four stand. Three carry inflated sub-counts in their evidence; none of the
inflations touches the load-bearing claim, and no repo ruling sanctions any of the four patterns.**

---

## 1. `field-type-union-unguarded` — STANDS (tier: refactor, unchanged)

### What I could confirm

- `FieldDescriptor` is a fifteen-arm union at `src/lib/content/fields.ts:121-136`. Confirmed.
- `grep -rn "never\|assertNever\|exhaustive" src/lib` returns **only prose comments**. There is no
  `assertNever`, no `satisfies never`, no `const _: never` tail anywhere in `src/lib`. Confirmed.
- There are exactly five `switch` statements on a field type in the library
  (`frontmatter.ts:27`, `frontmatter.ts:89`, `fieldset.ts:254`, `FieldInput.svelte:129`,
  `ComponentForm.svelte:132`) and **every one ends in a permissive `default:`**. Confirmed by grep,
  not by sampling.
- There is **no exhaustive `Record<FieldDescriptor['type'], …>` anywhere**: the only occurrence of
  the indexed type in all of `src/lib` is the parameter of `coerceToText`
  (`fieldset.ts:111`), which is itself a fall-through `if` chain ending `return ''`.
- Therefore the finding's falsification claim is structurally guaranteed, not merely observed: a
  sixteenth arm added to the union produces **no type error at any site**, because no site is
  written in a shape TypeScript can fail. I did not need to run `svelte-check` to establish this;
  the absence of both an exhaustive map and a `never` tail is dispositive.
- The consequence is real and specific: the new type falls to `fieldset.ts:289` (validated as a
  trimmed string with no constraints), `frontmatter.ts:53` and `:152` (decoded as a raw string),
  `frontmatter.ts:307` (`String(value)` on read), and `FieldInput.svelte`'s final `{:else}`, which
  renders `<input type={inputType(field.type)}>` — and `inputType` (`:128`) itself returns
  `undefined` in its default arm, so the control is a plain text box.

### Where I argued against it

- **Is the permissive default deliberate?** `code-idioms.md` has no rule on exhaustiveness or
  `default:` arms (I read all 195 lines; E/V/F/M/N/A/L/T/S sections are silent on it), and
  `engine-rulings.md` carries nothing. The "Deliberately not standardized" section names five
  exemptions; this is not among them. **No sanctioning ruling exists.**
- **Is the union really an extension point?** `docs/extend/content-model.md:17-19` says a field type
  the fifteen builders don't cover "is a gap to raise, not a workaround to invent locally" — i.e.
  adding a field type is an *engine* change, not a site-developer one. This mildly deflates the
  finding's phrase "the documented extension point for the whole content model." It does **not**
  defeat the finding: bar clause 3 is that the *engine* be easy for an *AI agent* to extend, and an
  agent adding a field type is exactly the engine-side case the doc routes work into.
- **Is the site count right?** No. The finding lists `references.ts`, `media-refs.ts`, and
  `delivery/content-index.ts` among the dispatch sites, but those are single-type *filters*
  (`references.ts:55` `field.type === 'reference'`, `media-refs.ts:46` `if (field.type !== 'image')
  continue`, `content-index.ts:99` `f.type === 'multiselect'`). A `never` guard is neither
  applicable nor desirable at a filter: a new field type correctly is not an image or a reference.
  **The real exhaustive-dispatch surface is five switches plus `coerceToText` plus
  `FieldInput.svelte`'s `{#if}` chain** — smaller than "ten sites", still unguarded at every one.

**Verdict: stands at `refactor`.** The remediation should be scoped to the exhaustive dispatchers;
the filter sites need the doc checklist, not a `never` tail.

---

## 2. `frontmatter-three-dispatchers` — STANDS (tier: refactor, unchanged)

### What I could confirm

- Three dispatchers over one union in 326 lines: `decodeField` `switch` (`:27`),
  `frontmatterFromForm` `switch` (`:89`), `formValues` `else if` chain (`:269`). Two syntactic
  styles for one job in one file. Confirmed.
- The divergence is real and self-documented (`:23-25`): nested returns `undefined` on empty,
  top-level preserves `''` / `[]` "for back-compat". Boolean nested (`:29`) vs top-level (`:90-91`)
  confirmed verbatim as quoted.
- **The `image` arm duplication is worse than the finding says, in the finding's favor.** I compared
  `:36-44` against `:109-127` line by line: the src trim, the `alt` verbatim read, the caption
  drop-when-blank, and the `decorative === 'true'` persist rule are *semantically identical*, and
  both omit the key entirely when `src` is empty. The two copies do **not** diverge at all, so this
  copy exists for no contract reason. A decode fix genuinely lands in one of two identical copies.
- `multiselectFormValue` (`:264-266`) is a one-line pass-through to `coerceStringList` with no
  behavior of its own. Confirmed.

### Where I argued against it

- **Is the fork load-bearing?** Partly, and the finding says so itself, so it is not overstated.
  Boolean, multiselect, and the text default genuinely differ between nested and top-level.
- **Is the remediation as thin as claimed?** No. `decodeField` has **no `array` arm** — an array
  inside a container is forbidden at declaration (`content-model.md:22-25`), so the nested decoder
  never needs one, while the top-level loop handles `array` with a `reference`-array special case
  plus `decodeRows`. A unified `decodeField(…, { emptyAs })` therefore needs an `array` arm it
  does not have today, and `frontmatterFromForm` cannot be a purely thin loop. This is a caveat on
  the remediation's cost estimate, not on the finding.
- No idiom rule sanctions two dispatch styles in one file; `code-idioms.md`'s premise is the
  opposite ("one obvious way per pattern"), and nothing in "Deliberately not standardized" covers
  it.

**Verdict: stands at `refactor`.** Strengthen the evidence with the image-arm finding: the two
copies are semantically identical, so at least that arm is pure duplication with no contract behind
it.

---

## 3. `runtime-optionals-multiply-defaults` — STANDS, evidence partly inflated (tier: refactor, unchanged)

### What I could confirm

- `types.ts:398-406` documents `dictionaryPath?: string` exactly as quoted, "composeRuntime always
  fills it". Confirmed.
- `compose.ts:14` `const DICTIONARY_PATH = 'src/content/.cairn/dictionary.txt'` and
  `content-routes-context.ts:346` `return runtime.dictionaryPath ?? 'src/content/.cairn/dictionary.txt'`.
  The literal genuinely appears twice. Confirmed.
- **A corroboration the finding missed, and it is the strongest evidence for it:**
  `composeRuntime` defaults *three* internal artifact paths in one object literal from one comment
  block (`compose.ts:11-14`): `manifestPath`, `mediaManifestPath`, `dictionaryPath`. On
  `CairnRuntime`, `manifestPath` (`types.ts:395`) and `mediaManifestPath` (`:396`) are **required**
  and `dictionaryPath` is **optional**. Three siblings, identical provenance, inconsistent
  optionality. That is an internal contradiction inside the area, not a lint preference.
- `content-routes-core.ts:259` types `spellcheckDictionary: string` as required on the edit data, so
  the `??` at `:1105` exists only because the runtime member is optional.
- An adjacent open ruling records the same defect class: `audit-media-normalizeassets` (reshape,
  `engine-rulings.md:2546-2551`) — "composeRuntime already computes resolvedAssets and CairnRuntime
  exposes it publicly, yet the reference example and all six sites re-normalize". Precedent supports
  the finding rather than opposing it.

### Where I argued against it

- **"spellcheckDictionary is defaulted four times" is inflated.** Of the four sites:
  `compose.ts:60` is the **origin**, not a duplicated default; `content-routes-core.ts:1105` is the
  one removable `??`; `MarkdownEditor.svelte:180` is a **public component's own prop default**,
  which is a standalone-use contract that survives any runtime type change and should not be
  deleted; `reproductions/stories/support.ts:199` is a story fixture, likewise unaffected. The real
  payload is two type members made required, **two** removable `??` defaults, and one duplicated
  literal.
- **Does making them required break a public type?** Yes — `CairnRuntime` is exported from the root
  entry (`index.ts:36`), so a hand-built runtime breaks. Under the standing "churn is free until
  beta" ruling this does not discount the finding. `_content-harness.ts:41` `runtime(overrides)` is
  the one in-repo hand-builder and absorbs it in one edit.
- The `Raw<>` marker half of the remediation is a design suggestion with no idiom rule behind it,
  and it overlaps `audit-adapter-publishactionsconfig` (reshape, already open). Treat it as
  secondary to the required-field correction.

**Verdict: stands at `refactor`.** Restate the evidence around the three-sibling-paths
inconsistency, which is dispositive, and drop the "four defaults" count to two.

---

## 4. `manifest-five-modules-eight-copies` — STANDS, one count wrong (tier: refactor, unchanged)

### What I could confirm

- 561 lines. Confirmed by `wc -l`.
- **Eight additive-field blocks, exactly as the title says.** `grep -n "additive"` returns lines
  197, 207, 219, 229 (in `parseManifest`) and 311, 329, 337, 345 (in `verifyManifest`) — four and
  four, for `mediaRefs`, `references`, `tags`, `includes`, in the same order both times.
- The four `verifyManifest` drops are **structurally identical** (`if (entry.X && c && c.X ===
  undefined) { const { X: _dropped, ...rest } = entry; entry = rest; }`), each preceded by a
  near-verbatim four-line rationale that differs only in the field name. Confirmed verbatim.
- `keyOf` (`:266`) is an arrow const among function declarations. Confirmed.
- `upsertEntry` (`:412-418`) re-derives the identity by hand: `const sameKey = (e) => e.concept ===
  entry.concept && e.id === entry.id`, while its own TSDoc says "the same identity upsertEntry and
  removeEntry use" and `keyOf` sits 146 lines above it. Confirmed.
- Public surface: `index.ts:93` exports `serializeManifest`, `verifyManifest`, `verifyReferences`;
  `delivery/data.ts:83` additionally re-exports `parseManifest`; `sveltekit/index.ts:174` exports
  the `InboundLink`/`LinkTarget` types. So **four** functions are public, not three — the spirit
  (most of the file is internal) holds.

### Where I argued against it

- **"The same rationale paragraph appears twelve times" is wrong.** It appears **eight** times, once
  per block. The title's count (eight) is right; the evidence line's count is inflated by half.
- **The four `parseManifest` blocks are not uniform.** `mediaRefs`, `tags`, and `includes` validate
  string elements; `references` (`:207-217`) validates a `{field, concept, id}` object shape. A flat
  `ADDITIVE_ARRAY_KEYS` loop covers three of the four there and needs a per-key element validator
  for the fourth. All four `verifyManifest` drops *are* uniform, so the loop is clean on that half.
  The remediation is right in shape and slightly optimistic in cost.
- **`keyOf`-as-arrow is a generic lint instinct with no repo rule behind it.** `code-idioms.md`'s N
  section covers naming, not declaration style, and nothing else in the charter speaks to
  `const fn = () =>` vs `function fn()`. That sub-claim should be dropped; the `upsertEntry`
  identity duplication is the real one and survives on its own.
- The five-concerns-in-one-file claim rests on comprehension (bar clause 2), not on an idiom rule;
  `code-idioms.md`'s M section sets no size or cohesion bound. It is a defensible judgment, not a
  charter violation, and the split should be argued on the public-codec / internal-graph-reader
  boundary the finding itself names, which is the strongest form of it.

**Verdict: stands at `refactor`.** Correct "twelve times" to "eight times", drop the arrow-const
nit, keep the eight-block dedup and the module split.
