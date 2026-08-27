# Fresh-context verification: admin-toolkit-internals

Verifier: independent, did not produce the findings. Repo `main`, 2026-08-26.
Method: every quoted line re-read at source; every claim tested against
`docs/internal/code-idioms.md`, `docs/internal/admin-design-system.md`,
`scripts/build/admin-css.input.css`, `scripts/build/build-admin-css.mjs`, the component test
suite, and the standing rulings in `docs/internal/record/2026-08-26-any-site-audit/`.

---

## atk-01 — ListToolbar: three dismissal mechanisms, string-built DOM selectors — **STANDS, tier revised to `refactor`**

### What verified clean

Every line citation is accurate.

- 735 lines confirmed (`wc -l`).
- `$effect` + `el.addEventListener('keydown', ...)` at `:199-204` — confirmed verbatim.
- `<svelte:window onpointerdown={...} onkeydown={onFacetWindowKeydown} />` at `:340` — confirmed.
- `bind:this={overflowTriggerEl}` at `:451`, `bind:this={overflowContainerEl}` at `:444` — confirmed.
- Three `document.querySelector` string lookups at `:214`, `:276-278`, `:286-288` — confirmed,
  and `:277` does embed the scoped class name `.toolkit-toolbar-facet-menu` in the selector.
- `data-facet-id={`${uid}-${filter.id}`}` at `:381` — confirmed.
- `svelte: ^5.56.10` (`package.json:193`, and `node_modules/svelte` resolves 5.56.10) — confirmed.
- `{@attach}` used **zero** times anywhere in `src/`, `examples/`, or the idiom charter —
  confirmed by grep. Attachments shipped in Svelte 5.29, so the feature is available and unused.

### Where the finding overstates

**"Three keyboard mechanisms" conflates two different jobs.** The `$effect`-attached container
listener (`:199-204`) and the window listener (`:340`) are two mechanisms for **one** job
(Escape dismissal) — that half is real. But the two declarative handlers the finding counts as
the third mechanism are not dismissal at all: `:367` is `onSegmentedKeydown` (radiogroup arrow
keys) and `:418` is `onFacetMenuKeydown` (menu arrow keys). A declarative `onkeydown` on an
interactive element is the correct Svelte idiom, and `code-idioms.md`'s **"Deliberately not
standardized"** section rules explicitly: *"Radiogroup vs plain-list arrow-key navigation —
semantically different widgets, not a fork."* Counting those two as a defect pattern-matches a
lint instinct against a standing repo ruling. The real count is **two dismissal idioms for one
job**, not three keyboard mechanisms.

**"Silently breaks ... no failing compile" is falsified by the test suite.**
`src/tests/component/ListToolbar.test.ts` is 1,119 lines and asserts open-focus directly:
`await expect.poll(() => document.activeElement).toBe(firstOption.element())` (`:249`), plus
focus-return at `:288`, `:304`, `:618`, `:1098`, `:1114`. Renaming the class or the
`data-facet-id` attribute fails those tests loudly. The coupling is real (an untyped string
selector doing a job a ref should do) but it is not silent, and the finding's stated failure
scenario is wrong.

### The decisive counter-check: a standing ruling already covers this

`docs/internal/record/2026-08-26-any-site-audit/rank-admin-shell-toolkit.md:724-742` rules
`ListToolbar` **RESHAPE**, and its verification pass
(`verify-admin-shell-toolkit.md:248-260`) records the *identical* evidence under "New evidence
for the extraction": *"the overflow disclosure (`:174-205`) and the per-facet menus
(`:292-312`) each carry their own Escape-and-return and outside-pointerdown handlers ... A
component that implements the same pattern twice internally is the clearest case for lifting it
to a primitive."*

This corroborates the finding's substance independently. It also constrains it two ways:

1. **The prescribed form differs.** The standing ruling's `reshapeNote` asks for a
   `ToolbarDisclosure` **primitive** `ListToolbar` composes, reachable by a consumer who needs a
   disclosure elsewhere. atk-01's remediation invents a different shape (split into
   `ToolbarFacet.svelte` / `ToolbarSegmented.svelte` plus a private `dismissable()` attachment).
   The attachment is the right *mechanism* for the wiring; it should live inside the ratified
   `ToolbarDisclosure` primitive rather than replacing it. Executing atk-01 as written would
   fork the standing ruling.
2. **The ruling says "The component itself stays."** That is a direct counter to `rewrite` and
   to the three-way split. `code-idioms.md` adds a second counter-precedent: *"`CairnMediaLibrary.svelte`
   is NOT split this pass. Component splits couple template, state, and focus behavior (the
   phase-3a lesson)."* ListToolbar's focus behavior is exactly the coupled kind the repo has
   previously declined to split.

### Verdict

Stands. The public contract, props, ARIA model, markup semantics, and 1,119 lines of passing
tests all survive the change; what moves is the dismissal wiring and one extracted primitive.
That is a `refactor`, not a re-derivation from first principles. **Revised tier: `refactor`**,
and the work must be executed against the standing `ToolbarDisclosure` ruling, not the
remediation as written.

---

## atk-02 — Doc blocks written for the pass that wrote them — **STANDS as written (`rewrite`)**

### Every quote verified at source

- `ListToolbar.svelte:22` — "Members-refinement-round-1 retired it" ✓
- `StatusChip.svelte:16` — "design infrastructure Pass 3, corpus C" ✓
- `StatusChip.svelte:31` and `PageHeader.svelte:35` — the raw commit sha `c21ac3b8`, in two
  public doc blocks ✓
- `OfficeList.svelte:3` — "Part C item 2 of the phase-2 design suite" ✓
- `FieldLabel.svelte:57` — "fix A2, item 2" ✓
- `PageHeader.svelte:3` — "ruling 3 of the 2026-07-20 admin-toolkit organization pass's adoption
  map"; `EmptyState.svelte:3` — "ruling 2 of the ..." ✓
- Self-referential blocks: `PageHeader:32-36` ("A scan-scope note this comment used to state the
  other way round"), `EmptyState:26-28` ("why an older version of this comment framed that as a
  compile constraint"), `StatusChip:29-33` ✓
- `FieldRow:21-23` — "No measured defect drove this component" ✓

Comment-block line counts re-measured: ListToolbar 98, ExpandableRow 64, StatusChip 42,
PageHeader 41, FieldLabel 31 (of a 65-line file), FieldRow 32 (of 57). The ~425-line total and
the "55% of FieldRow/FieldLabel" claim both hold.

### Counter-case tested: is any of this sanctioned?

No. Searched `code-idioms.md`, `admin-design-system.md`, and CLAUDE.md's Authoring section for a
ruling permitting provenance in a doc block. None exists. `code-idioms.md` carries a ruling in
the **opposite** direction — **T3**: *"titles are present-tense sentences with no plan-task
numbers."* The repo has already ruled that plan-task vocabulary does not belong in test names;
the `.svelte` doc blocks are the un-swept sibling of that same rule. Nothing gates them, because
CLAUDE.md records that `check:comments` ESLint does not parse `.svelte` yet.

### Where the remediation needs tempering

The blanket "10-20 lines each" target is the contestable half. `ExpandableRow:35-43` (the
`<td colspan>`-not-`display:block` reasoning, verified empirically) and its three refuted
alternatives (`base-200` is the zebra stripe's own color; a `base-200/60` hover wash is invisible
on a striped row) are exactly the *"what a later pass would be wrong to rediscover from
scratch"* knowledge the global ledger rule wants preserved — and moving it to `docs/HISTORY.md`
puts it where nobody reads it at the point of edit, which cuts against Geoff's bar 3 (easy for
an agent to extend). The finding already carves this out ("keep the mechanism, drop the
provenance"), which is the correct split; the line target should not be allowed to override it.
`OfficeList.svelte`'s `<!-- WATCH: -->` comment is separately sanctioned by CLAUDE.md's
watch-items rule and must survive the sweep.

### Verdict

Stands, tier holds. The defect — unresolvable pass vocabulary, ruling numbers, commit shas, and
comments documenting prior versions of themselves — is real, ungated, unsanctioned, and directly
against bars 2 and 3. Every block does need rewriting. Execute the mechanism/provenance split,
not the line count.

---

## atk-03 — Two contradictory CSS strategies, one documented as measured-broken — **STANDS, and is stronger than filed; tier holds at `refactor`**

### The mechanism verified

`scripts/build/build-admin-css.mjs:19` sets
`const SCOPE = ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])"` and prefixes
**every** compiled rule under it. FieldRow's measured claim is therefore mechanically true: no
class from the shipped sheet — grammar token or plain `flex` — resolves outside the theme root.

### The contradiction is real, and it is a violation of a ratified rule, not a tie

`docs/internal/admin-design-system.md:302-307` carries an explicit ruling the finding did not
cite:

> **The one scoped-style exception: `src/lib/admin-toolkit`.** Those components ship on a public
> subpath and a consumer can mount one outside the admin theme root, where the grammar tokens are
> undefined. Their scoped styles carry the measured literal as a `var()` fallback,
> `font-size: var(--cairn-type-meta, 0.8125rem)`, so the component still renders correctly outside
> `CairnAdminShell`.

This reframes the finding in its favor. It is not "one subpath, two defensible strategies, pick
one." The rule is **already ratified** and `FieldRow` is the conforming exemplar; the four
siblings are defectors from it:

- `FieldLabel.svelte:52` — `'flex flex-col gap-label cairn-field-stacked'`. The stacked register
  — the component's entire default contract — evaporates outside the root.
- `PageHeader.svelte:63` — `class="mb-10 flex flex-col gap-3 sm:flex-row ..."`
- `OfficeList.svelte:37` — `class="mb-6 flex flex-col gap-3 sm:flex-row ..."`
- `EmptyState.svelte:57` — `class="flex min-h-[56vh] flex-col items-center justify-center ..."`

All four confirmed verbatim. All four ship on the `/admin-toolkit` public barrel
(`index.ts:39-52`). The remediation's "ratify one rule in `index.ts`'s header" is therefore
redundant — the rule exists and is ratified in the design system doc. The correct remediation is
**conform the four defectors to the standing rule and cite it**, which is a smaller, better-anchored
ask than the one filed.

### One evidence error

"Three components still state the superseded rationale as live (ListToolbar:78, Pagination:14,
StatusChip:29)" is right for two and wrong for one:

- `ListToolbar.svelte:77-79` — "per the compiled-CSS constraint documented on
  `StatusChip`/`Pagination`: an unverified Tailwind utility string never reaches an `/admin/**`
  route." Stated as live. **Stale** — `admin-css.input.css:22` now scans
  `src/lib/admin-toolkit/**`.
- `Pagination.svelte:20-23` — "since `/admin/**` routes load only the precompiled bundle and an
  unverified Tailwind utility string never reaches it there." Stated as live. **Stale**, same
  reason.
- `StatusChip.svelte:29-33` — **misattributed.** This block explicitly states the constraint as
  *superseded*: "That was a hard constraint when this component was written ... The directory
  joined those roots in `c21ac3b8`, so an arbitrary utility written here does compile now." It is
  guilty of atk-02's self-referential-history defect, not of stating a stale constraint as live.
  Two stale paragraphs, not three.

### Verdict

Stands, tier holds at `refactor` (four components, layout declarations only, no contract change).
Re-anchor the remediation on `admin-design-system.md:302-307` rather than minting a new rule, and
correct the count from three stale paragraphs to two.
