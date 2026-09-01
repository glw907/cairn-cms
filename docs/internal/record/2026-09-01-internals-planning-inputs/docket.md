# Internals pass — planning-inputs docket

Compiled read-only from `docs/HISTORY.md`, `docs/STATUS.md`, `ROADMAP.md`,
`docs/internal/docs-friction-log.md`, `docs/internal/engine-rulings.md`, the
2026-08-26 any-site audit records (`docs/internal/record/2026-08-26-any-site-audit/`), the
2026-08-29/30 foundations and retires records, and `docs/superpowers/plans/2026-09-01-conformance-pass.md`
(the 4b plan). Every item is checked against **current `main`** (HEAD at compile time,
`ea45e182`), not against what a prior record says happened — the discipline this docket
exists to enforce, after a prior docket (`2026-09-01-4b-planning-inputs`) transcribed a
2026-08-26 verdict a later pass had already executed.

**4b is in flight**, executing on worktree `.claude/worktrees/conformance` (branch
`conformance`, off `main` at `6621245f`); this docket does not read that worktree, only
`main`. Per the 4b plan's own "What this pass hands forward" section (`:960-970`), the
internals routing list is stated **unchanged** by 4b except for one addition (the
engine-wide access-semantics question, item 14 below, new from 4b's round-1 security
review). But 4b's fourteen tasks touch `src/lib/sveltekit/{content-routes-context,
content-routes-core, preview, admin-action}.ts` and others among the files this docket
cites, and its Task 1 depends on the indexed-access convention (item 7). **Re-verify any
`content-routes-*`/`preview.ts`/`admin-action.ts` citation below against `main` after 4b
merges**, since line numbers and even the two-clause "built once by createContentRoutes"
wording (item 4) may shift under 4b's own edits.

---

## 1. The F-1 leak-class `check:surface` rider

**Source:** `docs/internal/record/2026-08-30-retires-move-record.md` (written by the
retires pass, Task 2), in full; also `docs/HISTORY.md`'s 2026-08-30 "retires" entry.

**Prescribed shape:** a permanent `check:surface` rider, owned by the internals pass per
the F-1 hybrid ruling's own instruction ("The sanction arrives with an owner"), that
derives the leak set — a retire-verdicted-or-absent name still named inside a surviving
rendered public shape — and fails on any **unrecorded** leak (the fail-unless-recorded
form the canonical-home rule already uses). Three stated limits the rider must not
rediscover as gaps:

1. **Derive against the TypeScript type checker, not the rendered markdown.**
   `check-surface.mjs`'s `buildSurfaceModel()` expands a named type only one hop from its
   own top-level entry, so `AdvisoryAction` (reachable only two hops in, through
   `AdvisoryNotice.actions`) is invisible to a grep over `api-surface.md` (17 of 18
   sanctioned leaks render; 18 are real against the checker). The move record's own
   compile-only fixture is the model to follow.
2. **Widen the predicate back to F-1's own wording.** The move record's own predicate
   narrows F-1's "retire-**or-absent**" wording to "retire-verdicted" alone, which is what
   put `NavIcon`/`EngineScreenId` and the never-verdicted `DictionaryAddFailure`/
   `TidyFailure`/`RemoveIndex`/`ValueOf`/`StandardResult` outside the move record's own
   count. The rider should re-widen to catch both classes.
3. **Add a per-subpath clause.** `NavIcon` and `EngineScreenId` each carry their own
   top-level export row on `/sveltekit` but render EXPANDED (not by name) on root inside
   `NavLayoutEntry`/`NavLayoutEngineRef`; a whole-surface "named somewhere" test (what both
   this predicate and R4's own closure-leak test use) cannot see "named on one subpath,
   expanded on another." `SlotKind` is the one genuinely absent-everywhere member of the
   original three-name group.

**CURRENT-STATE VERIFICATION:** open, unbuilt. `grep -n "leak\|F-1\|f1-return-position"
scripts/checks/check-surface.mjs` returns nothing — no rider exists on `main`. The manual
ledger (18 individual `engine-rulings.md` closes plus this move record) is still the leak
set's only record. **Ledger:** no dedicated ledger row for the rider itself; the 18
sanctioned-leak rows each close individually (e.g. `audit-sveltekit-advisorynotice` and
siblings), each stating the rider is still owed.

---

## 2. `staleNames` per-subpath rescope

**Source:** `docs/HISTORY.md`'s 2026-08-29 "foundations A" entry; restated verbatim as
inheritance note 1 in `docs/internal/record/2026-08-29-foundations-a-move-set.md:18-25`.

**Prescribed shape:** `scripts/checks/reference-coverage.mjs`'s `staleNames` check flags a
reference-page name only if **no subpath anywhere** exports it, so a page listing a name
its own subpath does not export still passes as long as some other subpath exports that
name anywhere — exactly how 14 dead rows survived undetected in `delivery-data.md`.
Foundations A's note: scope it per-subpath **before** `/sveltekit` narrows (narrowing turns
a ~2000-line reference page into ~30 leaves, and a per-subpath check is far cheaper to land
against the smaller pages).

**CURRENT-STATE VERIFICATION:** open, unchanged. Confirmed directly in
`scripts/checks/reference-coverage.mjs`: `globalKnownNames()` (`:328-336`) is explicitly
"Built from all of CONFIG regardless of the `--only` filter, so a single-subpath run sees
the same pool a full run does," and `checkOne()` (`:342-361`) calls
`staleNames([...knownNames], pageText)` against that global pool at `:360`. The module's own
comment (`:320-326`) states this is deliberate for its current purpose ("a lock against a
renamed or removed name," not "is this name exported here"), which is exactly the design
the rescope needs to change without breaking the renamed/removed-name guarantee. **Ledger:**
not a ledger item — an inheritance note only, in the move-set record and echoed in
`docs/internal/record/2026-08-30-r4-rederivation.md`.

---

## 3. R-0's second direction

**Source:** `docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md:839-842` (R-0's
two clauses); `docs/internal/record/2026-08-29-foundations-a-move-set.md:39-43`
(inheritance note 4, the authoritative "not yet discharged" statement);
`docs/superpowers/plans/2026-08-28-foundations-a-pass.md:242` ("R-0's second direction
(ratified, not yet discharged; no owning slice)").

**Prescribed shape:** R-0 reads *"A fact with one source is read from that source, never
copied [the first direction, executed via R-1's canonical-home rule / C3 work]; an export
the engine could use and does not is a shape defect until argued otherwise [the second
direction]."* The second direction is ratified in the rulings ledger
(`read-from-the-source-rule`, closed) but "no instance work, no gate, and no owning slice
exist for it." Its C13 evidence names four instances: `checkRateLimit` (reimplemented by
`createSectionAction`), `formatTimestamp` (hand-rolled by `CairnHistory` — now routed to
4b, Task 3), `normalizeAssets` (docs teach a re-typed-literal double-normalize — now routed
to 4b, Task 8), and `feedView` (zero engine or site callers; six independent hand-rolls).

**This item and item 10 (the dogfood tripwire) are the same underlying work, not two
separate ones.** R-0's second direction is the *principle*; `scripts/checks/check-dogfood.mjs`
(item 10) is the *mechanism* coherence-v2's own R-8 names to discharge it: "Ratify the rule
in the CLI's words... and write `scripts/checks/check-dogfood.mjs` to detect the mechanical
half." The internals plan should treat these as one task, not two.

**CURRENT-STATE VERIFICATION: open as a standing principle/gate, but — correcting this
docket's own first draft — all four of C13's originally-named instances are ALREADY
discharged or in flight, none is a live example to fix.** Checked each of the four directly:

- `checkRateLimit` — **already retired**, before this docket was even written. Ledger
  `audit-cloudflare-checkratelimit` (`engine-rulings.md:3238-3247`): "closed. Executed by
  Task 4 of the conventions pass [4a, merged], folded... into the same
  `resolveRateLimit(binding, keys)` export... `createSectionAction`'s inline reimplementation
  now calls it." Confirmed live: `src/lib/sveltekit/section-action.ts:27,251` imports and
  calls `resolveRateLimit` directly.
- `feedView` — **already retired and deleted**, also before this docket. Ledger
  `audit-delivery-feedview` (`engine-rulings.md:3345-3350`): "closed. Executed by the retires
  pass, batch 1c: `feedView` deleted outright from `views.ts`... `FeedItem` stays and is what
  makes the retirement costless." This was not a "the engine adopts its own export" fix — it
  retired the export instead — but it is a genuine closure of that C13 row regardless.
- `formatTimestamp`, `normalizeAssets` — executing in 4b right now (Tasks 3 and 8).

**So no instance-level work remains for R-0's second direction at all** — every one of C13's
four named examples is closed or closing. What is genuinely still open is only the STANDING,
FORWARD-LOOKING gate: nothing on `main` today would catch a FIFTH instance the next pass
introduces, since `check-dogfood.mjs` (item 10) does not exist. This makes the items-3-and-10
merge (Decision 5 below) an even stronger call than it first reads: there is no separable
"patch the named instances" task left to split from "build the gate" — only the gate remains.
**Ledger:** `read-from-the-source-rule` (engine-rulings.md:38) is closed (the ratification
only, not the enforcement); `checkRateLimit` and `feedView` each carry their own closed ledger
rows as cited above, unrelated in scope to the still-open standing-gate ask.

---

## 4. The six stale `content-routes-*` header wordings

**Source:** `docs/superpowers/plans/2026-08-28-foundations-b-pass.md:528-536` (the
foundations B post-mortem's "Carried follow-ups" §2) — **not** the any-site audit; STATUS's
`content-routes-context.ts:272` anchor traces here, not to the audit records.

**Prescribed shape:** foundations B's T1 narrowed the public `createContentRoutes` into a
thin wrapper around the new, unexported `createContentRoutesInternal` (the wide shape the
composer needs). Six sibling `content-routes-{core,media,settings,context,tidy,dictionary}.ts`
module headers still say the shared `ContentRoutesContext` is "built once by
`createContentRoutes`" — imprecise since the rename; the precise caller is
`createContentRoutesInternal`. `content-routes-context.ts:272`'s own TSDoc ("Build the
shared closure context for one `createContentRoutes` call...") is "the one that matters."
Routed to the internals pass "alongside its other comment work."

**CURRENT-STATE VERIFICATION:** open, confirmed exactly as described, all six sites still
present on `main`:
- `content-routes-core.ts:4` — "once by createContentRoutes, so a shim stays one line"
- `content-routes-media.ts:4` — "built once by createContentRoutes."
- `content-routes-settings.ts:3` — "built once by createContentRoutes."
- `content-routes-context.ts:2,272` — "once per createContentRoutes call" / "for one
  createContentRoutes call"
- `content-routes-tidy.ts:2` — "built once by createContentRoutes, reusing its..."
- `content-routes-dictionary.ts:3` — "createContentRoutes."

And the rename is confirmed live: `content-routes.ts:181-182`'s public `createContentRoutes`
is a two-line wrapper (`return createContentRoutesInternal(runtime, config);`) around
`content-routes.ts:77`'s `createContentRoutesInternal`, which is what actually calls
`createContentRoutesContext` (`content-routes.ts:78`). **Ledger:** none — a pass
post-mortem carry-forward, not an audit-ledgered item.

---

## 5. The `list-role` descendant-selector re-grounding

**Source:** `docs/internal/docs-friction-log.md:98-115` (`extender`, 2026-08-29, fix
round); echoed in `docs/HISTORY.md`'s 2026-08-29 "harvest-detection" entry.

**Prescribed shape:** `list-role` resolves an item's rendered display from the item's OWN
classes only, but daisyUI styles list items through descendant selectors scoped to the
LIST's own class (`.menu :where(li) { display: flex }`, `.breadcrumbs > li`), so a `<ul
class="menu">` whose `<li>` carries no class of its own never registers as re-grounded even
though its rendered display is not `list-item`. Nine engine lists sit in the gap:
`CairnAdminShell.svelte:646`, `:740`, `:832`; `EditPage.svelte:1778`; `EditorToolbar.svelte:372`,
`:449`; `ComponentInsertDialog.svelte:447`; `EntryPicker.svelte:141`; `DeleteDialog.svelte:88`.
The robust fix needs a rendered-mode check of the item's actual computed `display`, not a
second class-source lookup, plus possibly `role="listitem"` per item (ARIA's owned-elements
rule) and VoiceOver verification. Two adjacent diagnostic-message defects are named in the
same entry: `sheet.ts:544`'s cause-string lookup mis-attributes among several declarations
on a shared selector, and drops an at-rule's own condition from the message.

**CURRENT-STATE VERIFICATION:** open, confirmed. `src/lib/audit/rules/static/list-role.ts`
tests only `ownMarkerSuppressor` (the LIST's own classes, `:35-43`) and `itemDisplayChange`
(the ITEM's own classes, `:53-66`) — no descendant-selector or computed-display check
exists. **Ledger:** none — friction-log only, "routed to the any-site audit remediation
initiative."

---

## 6. The `panel-width` closed-select painted-width follow-up

**Source:** `docs/internal/docs-friction-log.md:117-123` (`extender`, 2026-08-29, fix
round); echoed in `docs/HISTORY.md`'s 2026-08-29 "harvest-detection" entry.

**Prescribed shape:** a closed native `<select>` never grows `scrollWidth` past its own
`clientWidth` even when its visible option text is truncated (measured in Chromium), so
`panel-width`'s `scrollWidth > clientWidth` comparison reads clean on a genuinely clipped
select label. Catching it needs a painted text-width measurement — the same approach
`resolveColors` already takes for a computation the DOM's own layout boxes can't answer —
not a `scrollWidth` comparison.

**CURRENT-STATE VERIFICATION:** open, confirmed in the rule's own code comment.
`src/lib/audit/rules/rendered/panel-width.ts:82-92` documents the exact gap live: `select`
is deliberately not exempted, but "a closed single-value `select`'s rendered label never
grows its own `scrollWidth` past its box no matter how long the option text is, so that
shape's clipped value stays outside what `scrollWidth > clientWidth` can see here... that
needs a different measurement (rendered text width against the box, the way `resolveColors`
paints rather than parses) and is filed for a later pass, not built here." **Ledger:** none
— friction-log only.

---

## 7. The reference-page indexed-access convention

**Source:** `docs/internal/record/2026-08-30-retires-move-record.md` (the 18-row leak table,
`:17-36`, whose "Replacement expression" column is the indexed-access forms in question);
`docs/HISTORY.md`'s 2026-08-30 "retires" entry ("a reference-page convention for naming the
indexed-access form beside shapes that print un-importable members (18 sites)").

**Prescribed shape:** no convention is stated in the move record beyond the replacement
expressions themselves (e.g. `EditData['advisories'][number]`,
`NonNullable<EditData['advisories'][number]['actions']>[number]`); the ask is for the
internals pass to decide and document HOW a reference page should print, beside a name that
no longer has its own subpath row, the indexed-access expression a consumer now reads the
value through.

**This item has a live consumer already landing under it.** 4b's Task 1
(`docs/superpowers/plans/2026-09-01-conformance-pass.md:130-199`) ships a
`NonNullable<ContentFormFailure['usage']>[number]` recovery line for the retired
`UsageEntry`, explicitly depending on this convention (per the plan's own hands-forward
note, `:965`, "which Task 1's recovery line depends on, noted in its ledger close"). The
internals task must land a convention that this 4b-authored line already conforms to, or
amend it.

**CURRENT-STATE VERIFICATION:** open, unbuilt. `docs/reference/sveltekit.md` and
`docs/reference/core.md` currently document the retired 18 names' replacement via prose in
each name's own row/entry (matching the ledger text), not through any stated,
reader-facing convention for the indexed-access form as a category. No dedicated
"indexed-access" section or rule exists in any `docs/reference/*.md` page.

---

## 8. The factory per-call `CAIRN_DEV_BACKEND` refusal design question

**Source:** `docs/internal/engine-rulings.md:2877-2883` (`audit-auth-devdelivery`, the
ledger row's own "Shape" field carries the design question directly);
`docs/internal/record/2026-08-26-any-site-audit/rank-auth-family.md:108-132`.

**Prescribed shape:** `devDelivery`'s stated purpose (guarding a dev transport from
reaching production) is a discoverability problem an export cannot fix; the ledger's own
words: *"a factory-side `CAIRN_DEV_BACKEND` refusal is a design question for a later pass
(`createAuthChannel` reads no env at construction time, so it cannot observe a per-request
value), and until then the refusal lives in the site's own transport body."* I.e.: should
the `CAIRN_DEV_BACKEND` guard move from a per-call check inside a hand-rolled dev transport
(today's shape) to a one-time check the `createAuthChannel` factory performs at
construction — and if so, how, given the factory currently has no access to `env` until a
per-request call arrives?

**CURRENT-STATE VERIFICATION:** open, confirmed by both halves. `devDelivery` itself IS
retired and gone (`src/lib/auth-channel/dev.ts` no longer exists; ledger:
"Executed by the retires pass, batch 1b... deleted outright"). The factory-side design
question remains genuinely unaddressed: `createAuthChannel<Env>(config:
AuthChannelConfig<Env>): AuthChannel<Env>` (`src/lib/auth-channel/factory.ts:516`) still
takes no `env` or per-request argument at construction time — the premise that makes the
question hard is unchanged. **Ledger:** the design question lives inside the closed
`audit-auth-devdelivery` row's own "Shape" field (not a separate open row); this is the
whole ledger citation.

---

## 9. `MarkdownEditor`'s seam collapse

**Source:** `docs/superpowers/plans/2026-08-30-conventions-pass.md:836-838` (the routing
sentence: *"`MarkdownEditor`'s seam collapse... (internals)"*);
`docs/internal/record/2026-08-26-any-site-audit/int-rank-components-editor.md:162-229`
(the full prescription); `docs/internal/record/2026-08-26-any-site-audit/int-verify-components-editor.md:117-154`
(CE-03, verified, tier revised).

**Prescribed shape (int-rank, verified):** `MarkdownEditor.svelte`'s `interface Props`
declares 33 props, 13 of them imperative `register*` callbacks
(`registerInsert`, `registerInsertLink`, `registerInsertImage`, `registerCaretCoords`,
`registerFocusEditor`, `registerImagePlaceholders`, `registerGetSelection`,
`registerGetSelectionRange`, `registerTidy`, `registerUndo`, `registerFormat`,
`registerReplaceRange`, `registerSelectRange`). Remediation: (a) collapse the eleven
remaining `register*` props (excluding the two — `registerTidy`, `registerImagePlaceholders`
— that already hand over an object, `TidyApi`/`ImagePlaceholderApi`) into one
`registerEditor?: (api: EditorApi) => void`; (b) express the stable/unstable split in the
types (`interface Props extends StableEditorProps, EditPageWiringProps`), since the doc's
stable list (11) and unstable table (19) already total only 30 of 33, leaving
`fragmentTitles`, `onDiagnosticsCounts`, and `registry` documented nowhere; (c) extend
`check:reference` (or add `check:component-props`) to diff each exported component's
`Props` keys against its reference page.

**Discrepancy worth flagging.** The engine-rulings ledger's own entry
(`audit-admin-markdowneditor`, `docs/internal/engine-rulings.md:2817-2823`, source
`rank-admin-shell-toolkit.md` rank 55, a *different* audit record from the one above)
states the shape as *"Collapse the roughly twenty Unstable EditPage wiring props into one
non-exported internal composition object, publishing only the eleven stable bare-surface
props"* — a materially different scope (collapsing ~20 unstable props, not specifically the
13 `register*` ones, into an unpublished internal object rather than one
`registerEditor(api)` prop) from the int-rank-components-editor.md prescription above.
`ROADMAP.md:306-310` states a third, closer-to-int-rank phrasing: *"the `MarkdownEditor`
33-prop seam collapsing onto one `registerEditor(api)`."* The internals plan author must
pick one shape, not silently follow whichever record it reads first.

**CURRENT-STATE VERIFICATION:** open, unchanged since the audit. `MarkdownEditor.svelte`
still declares exactly 13 `register*` props (confirmed by direct grep of `interface Props`,
lines 29-152 per both audit records) and the reference page's stable/unstable split is
unchanged (`docs/reference/components.md`, stable block + unstable table = 30 of 33; the
same three — `fragmentTitles`, `onDiagnosticsCounts`, `registry` — remain undocumented).
**Ledger:** `audit-admin-markdowneditor` (reshape), `docs/internal/engine-rulings.md:2817`:
*"Reopens on: open until executed; the remediation pass closes it."* Also cross-referenced
at `:397-398` from a different (kept) item's ledger row: *"Reopens on: the `MarkdownEditor`
seam collapse, the same reshape tracked at `audit-admin-markdowneditor`, which is where this
component's own wiring props are due to be re-examined."*

---

## 10. The dogfood tripwire

**Source:** `docs/superpowers/plans/2026-08-30-conventions-pass.md:836-838` (routing
sentence); `docs/internal/record/2026-08-26-any-site-audit/rank-cli-surface.md:48-73`
(Rank 1, "retire the proposal"); `docs/internal/record/2026-08-26-any-site-audit/verify-cli-surface.md:86-90`
(verified); `docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md:602-654` (C13,
Amendment 2) and `:879-885` (R-8).

**Prescribed shape:** an engine-hygiene tripwire — *"a public export with zero `src/lib`
call sites outside its own module and zero showcase call sites"* — with an allowlist for
legitimately consumer-only exports. `cairn-audit` is explicitly the WRONG home (three
independent reasons: it's a design-language audit, it ships to consumers who'd carry an
inert rule, and its own registry gate would force it to register and therefore ship).
**Correct home: `scripts/checks/check-dogfood.mjs`**, beside the 24+ sibling `check:*`
scripts. R-8 pairs this with `SITE_CONFIG_PATHS` (item 11): "fix `SITE_CONFIG_PATHS`
beside it (C3)."

**See item 3 above: this is the same work as R-0's second direction**, mechanism to that
item's principle.

**CURRENT-STATE VERIFICATION:** open, unbuilt. `ls scripts/checks/ | grep -i dogfood`
returns nothing; `verify-cli-surface.md:86-90` had already confirmed at audit time that
"30 sibling gates and **no** `check-dogfood.mjs`" existed, and that remains true today.
**Ledger:** `docs/internal/record/2026-08-30-r4-rederivation.md:196` lists the ledger row
id `audit-cli-check-dogfood-tripwire-proposed-into-cairn-audit-coherence-c` (not separately
read here, but confirms a ledger entry exists recording the "decline `cairn-audit`, home is
`scripts/checks/`" verdict — check that row directly before writing the internals task, its
full text was not re-quoted in this docket).

---

## 11. The `SITE_CONFIG_PATHS`-from-bake-constant derivation

**Source:** `docs/superpowers/plans/2026-08-30-conventions-pass.md:836-838` (routing
sentence); `docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md:189-233` (C3, in
full) and `:879-885` (R-8); ledger `audit-cli-config-site-config-check`
(`docs/internal/engine-rulings.md:4735-4741`).

**Prescribed shape:** *"a fact with one source is read from that source, never copied"* —
`src/lib/doctor/checks-local.ts`'s `SITE_CONFIG_PATHS` hard-codes candidate paths by hand,
while `packages/create-cairn-site/template/src/theme/site.config.yaml` and the showcase's
own template are the paths the engine's own scaffolder actually bakes. Derive
`SITE_CONFIG_PATHS` from the same constant the template bake uses (`substitute.mjs`'s
`SITE_CONFIG_RELATIVE`), so the checker and the scaffolder cannot disagree again.

**Partially discharged already — split status, not fully open.** The ledger row
(`audit-cli-config-site-config-check`) is CLOSED for one half: *"Executed by the
conventions pass, Task 10: `src/theme/site.config.yaml` joins `SITE_CONFIG_PATHS` in
`checks-local.ts`, and the not-found branch returns `unchecked` rather than `skip`."* The
one-source derivation itself is explicitly left open: *"The one-source derivation off the
template bake's own constant is left as a `// WATCH:` comment beside the list, routed to
the internals pass's dogfood work rather than executed here."*

**Open design call not resolved by any source read:** `SITE_CONFIG_RELATIVE =
'src/theme/site.config.yaml'` (`packages/create-cairn-site/src/substitute.mjs:13`) is a
module-local, unexported constant in a **separate npm package** (`create-cairn-site`) from
the one `checks-local.ts` ships in (the core `@glw907/cairn-cms` engine). "Derive from the
bake constant" therefore requires either exporting `SITE_CONFIG_RELATIVE` from
`create-cairn-site` and having the core engine depend on a scaffolding-tool package (an
unusual dependency direction), or relocating the single source of truth somewhere both
packages already depend on. No record read for this docket states which.

**CURRENT-STATE VERIFICATION:** confirmed exactly. `src/lib/doctor/checks-local.ts:150-158`
carries the `// WATCH:` comment verbatim: *"derive this list from the same constant the
template bake uses, so the scaffolder and the checker cannot diverge again; routed to the
internals pass's one-source dogfood work (`docs/internal/engine-rulings.md`,
`audit-cli-config-site-config-check`)."* `SITE_CONFIG_PATHS` (`:153-158`) is still a
hand-written four-entry array. `packages/create-cairn-site/test/fixtures/transcripts/02-doctor-bare.txt:7`
still shows the doctor's current SKIP-turned-`unchecked` message quoting all four paths by
hand. **Ledger:** `audit-cli-config-site-config-check`, `docs/internal/engine-rulings.md:4735`,
half-closed as described above.

---

## 12. The editors-page quote-drift tripwire

**Source:** `docs/internal/docs-friction-log.md:161-166` (`contributor`, open finding);
`docs/superpowers/plans/2026-08-30-conventions-pass.md:938,951` (post-mortem + hands-forward,
"the quote-drift tripwire" routed to internals).

**Prescribed shape:** the bolded copy quotes in `docs/editors/when-something-goes-wrong.md`
duplicate component strings (e.g. from `LoginPage.svelte`) with no gate comparing them —
`check:prose` scans components, `check:docs` scans links, neither notices a copy edit
stranding the quote (caught once only via an Opus diff-review during 4a). Prescribed
tripwire: extract the page's bolded quoted sentences and grep them against the shipped
component strings.

**CURRENT-STATE VERIFICATION:** open, confirmed by mechanism gap. `check:transcripts`
(`scripts/checks/transcript-blocks.mjs`) is a DIFFERENT gate — its own header states it
checks only fenced blocks explicitly marked `<!-- transcript: <fixture path> -->` against
recorded pty-capture fixtures under `packages/create-cairn-site/test/fixtures/transcripts/`,
and its header explicitly disclaims "prose correctness, or whether a page's surrounding
narrative matches what its block shows" — it does not, and structurally cannot, cover
bolded inline copy-quote drift. `check:prose` (`scripts/checks/check-admin-prose.mjs`)
scans components; `check:docs` (`scripts/checks/docs-links.mjs`) scans links. No script
does what this item asks. **Ledger:** none — friction-log and plan post-mortem only.

---

## 13. The local-vale reconciliation

**Source:** `docs/HISTORY.md`'s 2026-09-01 "conventions pass" entry (*"Local `check:vale`
reports 18 errors in three docs main's CI passes; reconcile before trusting local vale as a
gate."*); `docs/superpowers/plans/2026-08-30-conventions-pass.md:939,951`.

**Prescribed shape:** reconcile the local Vale install against CI's before treating a local
`npm run check:vale` result as trustworthy.

**CURRENT-STATE VERIFICATION: still true today, confirmed by running the command.**
`npm run check:vale` on `main` at `ea45e182` returns **17 errors** (not 18 — close but not
identical to the recorded count, worth noting as possible additional minor drift) across
the same three files the record names: `docs/admin/README.md` (8×`Google.EmDash`),
`docs/editors/when-something-goes-wrong.md` (1×`Microsoft.Quotes`), and
`docs/extend/README.md` (8×`Google.EmDash`). Root cause confirmed: local `vale --version`
reports **3.19.0** (Homebrew); CI's `test.yml:96-100` explicitly pins and installs
**Vale 3.15.1** via direct GitHub release download. The `Google.EmDash` findings are almost
certainly a rule-behavior change between 3.15.1 and 3.19.0 (Google's own style permits an
unspaced em dash, per this repo's CLAUDE.md, so a version-specific `EmDash` regression
firing on docs that pass CI is consistent with a local/CI Vale-version mismatch, not a
prose regression). No reconciliation (a pinned local Vale, a documented "trust CI only"
note, or an actual prose fix) has landed. **Ledger:** none — HISTORY and plan post-mortem
only, not an audit-ledgered item.

---

## 14. The engine-wide access-semantics question

**Source:** `docs/superpowers/plans/2026-09-01-conformance-pass.md:407-414` (Task 5's
design note, in full) and `:960-970` (hands-forward, "NEW from this plan's review"). This
item did not exist before 4b's round-1 security review; it is new, not inherited from the
any-site audit.

**Prescribed framing (quoted from the plan):** *"the security round proposed
`authorizeAdminTarget`'s fail-closed no-rule posture instead of `canReach`'s nav-semantics.
This plan deliberately reuses the ENGINE'S OWN mint sequence: both paths sit behind an
editor session, and a helper stricter than the engine's own `previewMintAction` protects
nothing while the engine route keeps the permissive reading — a stricter floor is an
engine-wide access-semantics question and is routed to the internals pass as a filed
question, not decided asymmetrically here."* Precisely: should a POST-relied concept check
keep `canReach`'s permissive unmapped-target reading (a target absent from the access map,
or no map at all, always admits), or harden engine-wide to `authorizeAdminTarget`'s
fail-closed posture (`hasAccessRule` gates first: a target the map has no key for refuses
as a misconfiguration, distinct from `canReach`'s own unmapped-target reading)?

**CURRENT-STATE VERIFICATION (main, pre-4b):** both postures coexist today, exactly as the
plan frames it, confirmed by call-site grep. **The permissive (`canReach`-only) posture** is
the majority pattern: `requireEngineAccess` (`src/lib/sveltekit/guard.ts:267-268`, `if
(canReach(access, editor, target)) return;` else 403) backs every concept/media/settings/
nav/vocabulary/tidy/dictionary route action across `content-routes-core.ts`,
`content-routes-media.ts` (11 call sites), `content-routes-settings.ts`,
`content-routes-tidy.ts`, `content-routes-dictionary.ts`, and `nav-routes.ts` — none of
these first check `hasAccessRule`. **The fail-closed (`hasAccessRule`-first) posture**
exists in exactly two places: `requireAccess` (`guard.ts:305`, `if (!hasAccessRule(...) ||
!canReach(...))`) and `authorizeAdminTarget` (`admin-action.ts:120-126`, `hasAccessRule`
then `canReach`, two distinct outcomes: `'no-rule'` vs `'not-admitted'`), consumed by
`section-action.ts:293` and `admin-action.ts:303`. `admin-nav.ts` (nav-visibility
resolution, not a POST guard) also mixes both: `canView` (`:428`) is `canReach`-only;
`resolveHref` (`:464-465`) checks `hasAccessRule` first. The question is genuinely open and
unresolved on `main` — no internals-pass work exists yet to read.

---

## 15. The vacuous per-story assertion — **still open, correcting this docket's own first draft**

**Source:** `docs/HISTORY.md`'s 2026-08-30 "retires" entry (*"the per-story `has a matching
manifest entry` assertion in `reproductions-stories.test.ts` is vacuous now that the
aggregate test carries the guarantee"*).

**CURRENT-STATE VERIFICATION: confirmed still present and still vacuous — an earlier pass at
this docket wrongly marked this item discharged, which is exactly the kind of error this
docket's own compile discipline exists to catch, so it is corrected here rather than left
standing.** `src/tests/component/reproductions-stories.test.ts` contains TWO distinct tests
naming "manifest entry," easy to conflate:

- `:178-211`, `describe('the manifest-to-story inventory', ...)`: the AGGREGATE
  reverse-direction test, `it('registers no story under an id absent from the manifest', ...)`
  at `:206-210`. This is the fix the retires pass landed, per its own comment at `:202-205`
  ("this aggregate assertion... restores the same guarantee" the old per-story test used to
  carry). This test is real and not vacuous.
- `:961-970`, inside the per-story loop (`for (const story of registeredStories) { ... }`,
  `describe(\`${story.id}: the universal story contract\`, ...)`): `it('has a matching
  manifest entry', () => { expect(entry).toBeDefined(); })` at `:969`. **This is the ORIGINAL
  assertion HISTORY names, and it is still there, unremoved.** `registeredStories` (`:961-963`)
  is derived by FILTERING `manifest` itself (`manifest.filter((c) => isRegistered(c.id)).map(...)`),
  so every `story.id` in the loop is, by construction, a `manifest` id; `entry =
  manifest.find((c) => c.id === story.id)` at `:966` can never be `undefined`, and
  `expect(entry).toBeDefined()` cannot fail. The two tests are independent — the aggregate
  test's existence does not remove the per-story one, it only makes it redundant, exactly as
  HISTORY states. **This item is genuinely open**, unchanged since the retires pass landed;
  it should stay routed to internals as a one-line test deletion.

---

## 16. ROADMAP / friction-log sweep for other internals-tagged items

Swept `ROADMAP.md`'s Now (`:282-866`), Next (`:866-1909`), Later, and Considering tiers,
plus the full `docs/internal/docs-friction-log.md` (248 lines), for anything explicitly
naming "internals" or the audit-remediation internals slice. Only Now carries a hit; Next/
Later/Considering carry none (`grep -n -i "internals\b"` over each range: zero for Next
onward besides an unrelated OfficeList-internals mention at `:1429` about CSS internals,
not the pass).

**`ROADMAP.md:282-321`, "The any-site audit remediation" (Now tier), is the authoritative
internals-scope statement**, and it names substantially MORE scope than STATUS's own
routing list carries. Quoted in full (`:306-317`), all NEW, none overlapping the 16
items above:

> **The internals half** (Task 8b, trustworthy verdict; the audit record's internals
> section itemizes): the ten rewrite-tier findings, led by the five untracked monolith
> files (`EditPage` 2920 lines, `CairnMediaLibrary` 3159, `content-routes-core` 1690,
> `audit/rendered.ts` 1015, plus the `MarkdownEditor` 33-prop seam collapsing onto one
> `registerEditor(api)`); the exhaustiveness idiom (`FieldDescriptor`'s ten
> permissive-default dispatch sites, proven exploitable by the walk's mutation
> experiment); the coherence thirteen (enforce the idiom charter with a gate; purge the
> pass-scoped comment register, 179 process references and 18 consumer-site names; the
> `ec-*` prefix out of engine-emitted markup; the 827 `as never` test casts; a formatter
> decision); the newcomer walk's `src/lib` internals map; and the custom-screen content
> read-seam boundary decision. Mostly consumer-invisible, riding outside the `Consumers
> must:` window except emitted-markup and rename items.

Breaking this into discoverable sub-items (none previously covered above, except the
`MarkdownEditor` mention, which is item 9 and gives a THIRD phrasing of its shape — see
item 9's discrepancy note):

- **The five untracked monolith files.** `EditPage.svelte` (2920 lines), `CairnMediaLibrary.svelte`
  (3159, the only one already on ROADMAP as its own filed item elsewhere), `content-routes-core.ts`
  (per `int-coherence.md:134`, one 1,690-line closure), `audit/rendered.ts` (1015, "6
  concerns the static half splits into 5 modules"). None but `CairnMediaLibrary` is filed
  as its own ROADMAP item today (per `int-coherence.md:142-144`: "none of the three is
  filed").
- **The `FieldDescriptor` exhaustiveness idiom.** No `assertNever`/`: never =`/
  `satisfies never` idiom exists anywhere in `src/lib` (`int-coherence.md:211-223`,
  `grep -rn` returns 0); ten hand-maintained dispatch lists stand in for one, proven
  exploitable by the audit's own mutation experiment (a `RatingField` half-add passed
  `svelte-check` clean and 3,976 tests with a wrong error message, and committed
  `'4000 potatoes'` to frontmatter for a `max: 5` field).
- **The coherence thirteen.** Sourced from `int-coherence.md`'s numbered findings 1-7+
  (`:70-238` and beyond): enforcing the M1/M4/S3/S4/E1/E7/T3/T5 charter rules with actual
  gates (currently "nothing" enforces any of the eight, per the table at `:77-86`); purging
  179 pass/plan/ruling references and 18 named private-consumer mentions from `src/lib`
  comments (`:189-193`); the `ec-*` prefix question (not located in the excerpt read for
  this docket — grep `int-coherence.md` for "ec-" before scoping); the 827 `as never` test
  casts; a repo-wide formatter decision (M4 tabs vs. 2-space, currently advisory-only via
  `.editorconfig`, unenforced).
- **The newcomer walk's `src/lib` internals map.** From `int-walk-newcomer.md` — a map for
  a stranger navigating `src/lib`, distinct from the published docs tracks.
- **The custom-screen content read-seam boundary decision.** Not located in the records
  read for this docket; grep `int-*.md` for "custom-screen" and "read-seam" before scoping
  into the internals plan.

**Friction-log items checked for overlap, all already accounted for:** the quote-drift
entry (`:161-166`) is item 12, no new information. The `variants`-field entry (`:168-172`,
*"The retire-or-re-expose decision belongs to 4b/internals"*) is **NOT an internals item**
— it was routed to and IS being executed in 4b (Task 14, "The `variants` evidence sweep,"
per the plan's own brainstorm ruling 4: "Inert variants field: 4B, EVIDENCE-FIRST"). The
`ROADMAP.md` heading-as-machine-key note (`:173-176`) is unrelated maintenance trivia, not
tagged internals. No other friction-log entry names "internals" or the remediation
initiative by name.

---

## Decisions for the brainstorm

Only the genuinely open calls — where sources disagree, are silent, or a design choice was
explicitly deferred.

1. **`MarkdownEditor`'s collapse shape (item 9).** Three sources give three different
   shapes: int-rank-components-editor.md's "collapse the eleven remaining `register*` props
   into one `registerEditor?: (api: EditorApi) => void`, keep the two already-object props
   as-is" (int-verify confirms this, tier `refactor`); the ledger's own
   `audit-admin-markdowneditor` row's "collapse the roughly twenty Unstable EditPage wiring
   props into one non-exported internal composition object, publishing only the eleven
   stable bare-surface props"; and `ROADMAP.md`'s shorthand "collapsing onto one
   `registerEditor(api)`," which reads as the int-rank shape but doesn't settle the
   ledger's differing scope (13 vs. ~20 props; exported prop vs. non-exported internal
   object). The plan author must pick one and reconcile the ledger row's text to match.

2. **The `CAIRN_DEV_BACKEND` refusal question (item 8).** Genuinely unresolved in every
   source: per-call refusal inside a hand-rolled transport body (today's shape, self-admittedly
   a discoverability problem) vs. a factory-side check `createAuthChannel` cannot currently
   perform (it reads no `env` at construction). No source proposes a third option (e.g.
   threading env through a first-request hook), which the plan author may want to consider
   the leanest fix given the charter's disposition toward the developer owning
   domain-specific env access.

3. **The `SITE_CONFIG_PATHS` bake-constant's package boundary (item 11).** The prescribed
   fix ("derive from the same constant the template bake uses") crosses an npm package
   boundary no source addresses: `SITE_CONFIG_RELATIVE` lives unexported in
   `create-cairn-site`, `SITE_CONFIG_PATHS` lives in the core engine. Either the constant
   moves somewhere both depend on, or `create-cairn-site` exports it and the core engine
   takes on a dependency in a direction it does not currently have. Needs a decision before
   the task can be written as anything but "investigate the package graph first."

4. **The four `content-routes-*` module-header rewrite's exact wording (item 4).** Every
   source agrees the current text is imprecise and names the precise fix target
   (`createContentRoutesInternal`), but none proposes replacement prose for the six
   headers. Cheap, but needs six sentences written, not just "fix them."

5. **The R-0-second-direction / dogfood-tripwire merge (items 3 and 10).** Not a
   disagreement, but a scoping call: should the internals plan carry this as one task
   (write `check:dogfood`, which discharges both the ledger's `read-from-the-source-rule`
   second clause and the STATUS-routed "dogfood tripwire" line), or does keeping them
   separate in the plan give a cleaner acceptance-criteria story? No source states a
   preference either way.

6. **The engine-wide access-semantics question (item 14).** Fully open, as the 4b plan
   itself states: `canReach`'s permissive-unmapped-target posture (majority pattern today)
   vs. `authorizeAdminTarget`'s fail-closed `hasAccessRule`-first posture (used only in
   `admin-action`/`section-action`). A blanket harden would be a breaking change across
   every concept/media/settings/nav/vocabulary/tidy/dictionary route action currently
   guarded by bare `requireEngineAccess`; the plan author needs Geoff's read on whether
   that scale of break belongs in this pass at all, or whether the finding should instead
   become a documented, permanent divergence (the same "deliberate, documented divergence"
   pattern foundations A used for the canonical-home rule's own literal-ask gap).

7. **The indexed-access reference-page convention's exact form (item 7).** No source states
   HOW a reference page should print the indexed-access expression beside a name that no
   longer has its own subpath row — a callout, an inline parenthetical after the bare name, a
   dedicated glossary entry cross-referenced from each of the 18 (soon 19, with `UsageEntry`)
   sites, or a change to `check:reference`'s own rendering. 4b's Task 1 already ships one ad
   hoc instance, `NonNullable<ContentFormFailure['usage']>[number]`, explicitly marked
   provisional pending this pass's ruling (plan `:965`), so the internals task is retrofitting
   a convention onto an already-shipped example, not designing one from a blank page. The plan
   author must decide the form before writing the task, and then decide whether 4b's line
   conforms or needs amending.

8. **Item 16's newly surfaced ROADMAP scope.** The five monolith files, the exhaustiveness
   idiom, the coherence thirteen, the internals map, and the custom-screen read-seam
   decision are all named as internals scope in `ROADMAP.md` but not in STATUS's own
   routing list or the 4b plan's hands-forward section. The plan author needs to decide
   whether this pass absorbs all of it (likely too large for one pass, given the sizing
   signals below), splits it into a follow-on slice, or the internals pass proper stays
   scoped to STATUS's narrower list (items 1-14 above) and ROADMAP's broader list becomes
   its own later slice.

---

## Sizing signals

For the plan author's ordering and batching, roughly grouped by what kind of work each is:

**Gate / tooling work (build a check, once, that then runs forever):**
- Item 1, the F-1 leak-class `check:surface` rider (largest of this group — needs the
  type-checker-derivation design, not just a script).
- Item 2, `staleNames` per-subpath rescope (small, mechanical, in one file).
- Items 3+10 combined, `scripts/checks/check-dogfood.mjs` (medium — new script plus an
  allowlist design).
- Item 12, the editors-page quote-drift tripwire (small, one script).
- Item 9's remediation clause (c), extending `check:reference`/new `check:component-props`
  (medium, rides with item 9's collapse).

**Design questions (need a decision before any code, likely Geoff-facing):**
- Item 8, `CAIRN_DEV_BACKEND` factory-vs-per-call.
- Item 11's package-boundary sub-question.
- Item 14, the engine-wide access-semantics posture (highest-stakes — touches auth
  behavior across the whole route surface if hardened).
- Item 9's three-way shape discrepancy (needs resolving before implementation, not during).

**Mechanical fixes (shape is settled, just needs doing):**
- Item 4, the six module-header rewrites (six sentences).
- Item 11's `SITE_CONFIG_PATHS` derivation itself, once item 11's package-boundary question
  resolves.
- Item 5 and item 6's rendered-mode/painted-width measurements (each self-contained inside
  one rule file, though both are genuinely nontrivial DOM-measurement work, not "mechanical"
  in the trivial sense — sized here as "shape known" rather than "small").
- Item 13, the vale reconciliation (pin a version, or document CI-is-the-arbiter; no design
  question, just a decision to record).
- Item 15, delete the vacuous per-story `it('has a matching manifest entry', ...)` block at
  `reproductions-stories.test.ts:969` (one line; the real guarantee already lives in the
  aggregate test at `:206-210`).

**Already discharged, drop from scope:**
- Item 11's "add the path to the list" half (already executed in 4a; only the derivation
  half remains, tracked above as mechanical).

Item 15 (the vacuous per-story assertion) is genuinely open, not discharged — see its own
section above, which corrects an earlier drafting error in this docket. It belongs with the
other mechanical fixes above (a one-line test deletion).

**Unscoped, needs its own sizing pass before it can be batched:**
- Item 16's ROADMAP-sourced findings (the five monoliths, the exhaustiveness idiom, the
  coherence thirteen, the internals map, the read-seam decision) — each is plausibly its
  own multi-task slice on its own; bundling all of it into "the internals pass" alongside
  items 1-14 risks the same accretion-by-adjacency failure mode `~/.claude/CLAUDE.md`'s
  "Pass sizing" section warns about.
