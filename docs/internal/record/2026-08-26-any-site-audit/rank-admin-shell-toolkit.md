# admin-shell-toolkit: retroactive any-site audit

Subsystem: `/components` + `/admin-toolkit`. 59 items, ranked weakest (1) to strongest (59)
anonymous-consumer case. Repo `main` at HEAD, 2026-08-26.

**Collisions:** the bucket file flags `"collision": false` on all 59 items. No item in this
subsystem shares a name with a differing signature elsewhere. The near-miss is deliberate and
already resolved: `TextInput`/`SelectInput` are named for the element they wrap precisely
because the root barrel's field *descriptor* arm owns `TextField`/`SelectField`
(`src/lib/index.ts:58`: "so no subpath exports two different things"). Nothing to flag.

**Standing evidence used throughout.** Every `/admin-toolkit` export traces to one site.
`src/lib/admin-toolkit/index.ts:8` — "Born in aksailingclub-org's theme layer and graduated
here by re-expression, not a file copy". The graduation trigger was itself family-shaped:
`296f93fb` — "second real consumer landed, the graduation trigger the admin-toolkit
organization pass deferred it on". Consumer inventory: three admin-extension consumers exist,
all family (ASC, xcathletes, the showcase); no consumer outside the family was found.

**The measured-usage table** (grep over `src/lib`, `examples/showcase/src`, `docs/`, excluding
`src/lib/admin-toolkit/` itself and `src/tests`), which drives much of the ranking:

| Export | Engine screens using it | Showcase/docs |
|---|---|---|
| `PageHeader` | many | yes |
| `StatusChip`, `AdminTable`, `ListToolbar`, `EmptyState` | 4–11 | yes |
| `Pagination` | 3 | yes |
| `formatCivilDate` | 2 (ConceptList, CairnMediaLibrary) | no |
| `itemNoun` | 1 (ConceptList) | no |
| `FieldLabel`/`TextInput`/`SelectInput` | 0 | docs only |
| `OfficeList` | 0 (one reproduction story) | doc snippet |
| `ExpandableRow` | 0 | no |
| `formatTimestamp`, `formatMoney`, `formatPhone`, `ageFromBirthdate` | **0** | no |
| `computePageWindow`/`computeItemRange`/`computeAppliedFilters`/`computeCountLine` | **0** | no |
| `STATUS_CHIP_DOT_CLASS` | **0** | no |

Tests import the internal module paths (`../../lib/admin-toolkit/format.js`), never the public
barrel, so no compute/format export is held up by a test.

---

## 1. `formatPhone` — `/admin-toolkit` — RETIRE

**Provenance.** ASC member-directory domain, graduated in `24b30c50` ("re-expressed from
aksailingclub-org's toolkit seed"). Source comment names its origin shape: "the one shape a
phone normalized at write time (a member-normalize style parse) produces"
(`format.ts:123`). Family-originated. Zero consumers: not one engine screen, showcase route,
extend guide, or reproduction story calls it.

**Anonymous-consumer case.** A cairn CMS manages markdown Posts and Pages. It stores no phone
numbers. The scenario requires a consumer to (a) build a custom `/admin/` screen over its own
D1, (b) store phones, (c) store them E.164, and (d) be NANP-only — a US-club shape. The
implementation is one regex and a template string.

**Verdict: retire.** This is the `siteToday(timeZone)` case verbatim, already ruled out at the
2026-08-26 triage: "a few lines of `Intl`; the same repo failed to reuse its own first copy, so
the failure is discoverability, which an npm export solves no better." The hand-roll is small
and domain-shaped: both failing halves of the gate. Counter-argument considered: it is already
shipped and free to keep. Migration cost never discounts a verdict, and a dead export on a
lean engine's public surface costs evenness, which the gate protects explicitly.

## 2. `FormatPhoneOptions` — `/admin-toolkit` — RETIRE

**Provenance.** Same commit, exists only to name `formatPhone`'s `fallback?: string`
(`format.ts:127`). Family-originated.

**Anonymous-consumer case.** None independent of `formatPhone`. A single-optional-string
interface exported as public API is the thinnest possible surface.

**Verdict: retire** with its function. Nothing else references it.

## 3. `ageFromBirthdate` — `/admin-toolkit` — RETIRE

**Provenance.** ASC's member roster. Graduated `24b30c50` alongside the other formatters.
Family-originated, zero consumers.

**Anonymous-consumer case.** A markdown CMS has no birthdates. The reference page itself has to
except it from the subpath's own uniform rule: "`ageFromBirthdate` isn't a display formatter …
so it sits outside this rule" (`admin-toolkit.md:44`). An export that needs a carve-out from
its own file's stated charter is a sign it does not belong to that file.

**Verdict: retire.** Whole-years age arithmetic is domain-shaped (rosters, waivers, junior
programs) and hand-rolls in eight lines. Argued the other way: the birthday-turnover-on-the-day
edge is a real off-by-one trap. It is a trap for a site that computes ages, and that is the
developer's domain, not cairn's core job.

## 4. `formatMoney` — `/admin-toolkit` — RETIRE

**Provenance.** ASC's payments ledger; the doc comment cites the exact ASC column shape: "a
ledger's `amount_total_cents`/`amount_cents` shape" (`format.ts:29`). Family-originated, zero
consumers.

**Anonymous-consumer case.** cairn takes no payments and has no charter path to one ("no
sends, no scheduler", and money is site domain throughout the ASC brief). The body is a
single `Intl.NumberFormat` call over `cents / 100`.

**Verdict: retire.** Small and domain-shaped. The one general point it encodes — never render
raw cents — is a lesson, not a library.

## 5. `FormatMoneyOptions` — `/admin-toolkit` — RETIRE

**Provenance.** Names `formatMoney`'s three options. Family-originated.

**Anonymous-consumer case.** None independent of `formatMoney`.

**Verdict: retire** with its function.

## 6. `STATUS_CHIP_DOT_CLASS` — `/admin-toolkit` — RETIRE

**Provenance.** Graduated with `StatusChip` in `65cbc916` ("the exported `STATUS_CHIP_DOT_CLASS`
map"). Family-originated. Zero consumers anywhere, including cairn's own tests-through-barrel.

**Anonymous-consumer case.** The reference page states the case in the future conditional: "so
a future legend or key component reuses the identical dot color without duplicating the
mapping" (`admin-toolkit.md:385`). That is a speculative export by its own documentation. The
value is a five-entry `Record<StatusChipTone, string>` of daisyUI suffixes a consumer can
derive from the tone name.

**Verdict: retire.** No accept-by-default: no scenario, no consumer, and no measured grammar
divergence. If the "future legend component" arrives, it lives in the toolkit beside
`StatusChip` and imports the map by relative path, exactly as the engine's own internals do.

## 7. `FieldRow` — `/admin-toolkit` — RETIRE

**Provenance.** Merged from the retired `admin-fields` subpath in `b36fd15c`; the field tier
descends from "the aksailingclub-org club-admin scaffold" (`SelectInput.svelte` header).
Family-originated. Zero consumers: not one engine screen, only a mention in
`docs/extend/add-a-custom-admin-screen.md:93`.

**Anonymous-consumer case.** Its own header comment disqualifies it against this audit's second
gate, in writing: "**No measured defect drove this component.** The 2026-08 vertical-alignment
inventory measured the admin's rendered rows and found no misaligned field row to fix; this
ships as the named composition for the shape." No ratified grammar diverged. The whole
component is three CSS declarations (`display: flex; align-items: flex-end; gap:
var(--cairn-gap-control, 0.5rem)`).

**Verdict: retire.** Argued the other way, and this is the strongest counter in the retire tier:
the header notes the class-only form "computed `display: block` outside the root", so the
engine token genuinely does not survive outside the admin theme — a real can't-reach fact.
But the component's own style block ships the literal fallback `0.5rem` right beside the
token, which is precisely what a consumer would write by hand. A three-declaration flex row is
the definition of a small hand-roll. Retire; the shape belongs in the design system prose
(`admin-design-system.md`), where a recipe with no code costs nothing.

## 8. `computeCountLine` — `/admin-toolkit` — RETIRE

**Provenance.** Graduated with `ListToolbar` in `1cc8e4b1`: "moved to a plain `list-toolbar.ts`
module the same way Pagination's windowing math is, **so the unit project can test them without
a Svelte plugin**". Family-originated, and the stated reason for the split is testability, not
a consumer need. Zero consumers.

**Anonymous-consumer case.** It returns one string: `"<count> <itemLabel>"` joined with applied
labels by a middle dot. `ListToolbar` already renders that line for any site that mounts it. A
site rendering its own toolbar chrome is designing its own copy anyway.

**Verdict: retire from the public barrel** (keep the internal module unchanged). The evenness
argument is decisive: `list-toolbar.ts` also holds `computeFacetLabel`, which is deliberately
**not** exported. Four of five pure helpers across two modules are public, one is not, and none
is consumed — an incoherent surface by the whole-surface test the gate names.

## 9. `computeAppliedFilters` — `/admin-toolkit` — RETIRE

**Provenance.** Same commit, same module, same testability rationale. Family-originated, zero
consumers.

**Anonymous-consumer case.** It maps `ListToolbarFilter[]` to `{id,label}[]` by comparing each
filter to its own `defaultValue`. Its input type only exists to feed `ListToolbar`. A site not
mounting `ListToolbar` has no `ListToolbarFilter[]` to pass it.

**Verdict: retire from the public barrel.** The function is load-bearing inside the component
and stays exactly where it is; only the public name goes.

## 10. `AppliedFilterPill` — `/admin-toolkit` — RETIRE

**Provenance.** Names `computeAppliedFilters`'s return shape (`admin-toolkit.md:852`).
Family-originated.

**Anonymous-consumer case.** None independent of the function it names. It appears in no
component's prop signature.

**Verdict: retire** with `computeAppliedFilters`.

## 11. `computeItemRange` — `/admin-toolkit` — RETIRE

**Provenance.** Graduated with `Pagination` in `65cbc916`: "the pure
`computePageWindow`/`computeItemRange` logic moves to a plain `pagination-window.ts` module …
so the node-environment unit project can test it without a Svelte plugin". Family-originated,
zero consumers.

**Anonymous-consumer case.** `(page-1)*pageSize+1` to `min(page*pageSize, total)`, with a null
for out-of-range. `Pagination` already renders the line for anyone who mounts it.

**Verdict: retire from the public barrel.** Same reasoning as items 8 and 9.

## 12. `ItemRange` — `/admin-toolkit` — RETIRE

**Provenance.** Names `computeItemRange`'s return (`{first,last,total}`). Family-originated.

**Anonymous-consumer case.** None independent of the function. Not in any component's props.

**Verdict: retire** with `computeItemRange`.

## 13. `computePageWindow` — `/admin-toolkit` — RETIRE

**Provenance.** Same `65cbc916` split, same testability rationale. Family-originated, zero
consumers.

**Anonymous-consumer case.** This is the strongest of the four pure helpers and deserves the
counter-argument in full: page-window elision (first, last, a run around current, ellipsis
markers) is fiddly, genuinely general, and a site rendering its own pager in its own visual
language could want cairn's exact windowing so the two pagers agree. That is a real story.
What it is not is a *measured* one: no site has asked, no site has hand-rolled it, and cairn
ships the component that renders it.

**Verdict: retire from the public barrel,** on evenness with its three siblings rather than on
its own merits. If a consumer asks, it returns as a documented export with a named scenario
behind it, which is the right way for it to arrive.

## 14. `PageWindowItem` — `/admin-toolkit` — RETIRE

**Provenance.** `number | 'ellipsis'`, naming one entry of `computePageWindow`'s return.
Family-originated.

**Anonymous-consumer case.** None independent. Not in any component's props.

**Verdict: retire** with `computePageWindow`.

## 15. `WelcomeView` — `/components` — KEEP (weak; `absenceOfObjection`)

**Provenance.** Engine-internal: the none-capability landing view, added to complete the
barrel's own membership rule. `src/lib/components/index.ts:3` — "every view `CairnAdmin` can
render is individually mountable here, so a site on the advanced per-route mounting reaches the
same component the single-mount facade would have rendered."

**Anonymous-consumer case.** 24 lines wrapping `EmptyState` with `headingLevel="h1"`. The
concrete scenario is narrow: a consumer that hand-mounts `/admin/**` per route (for per-route
`prerender`/`config` SvelteKit needs the catch-all cannot express) needs an
`/admin/+page.svelte` for a none-capability session, and without this export renders nothing
there. Real, but nobody has done it: grep across the showcase and every extend guide finds
`CairnAdmin`, `CairnAdminShell`, `CsrfField`, `PreviewBanner` and nothing else.

**Verdict: keep,** and I record it honestly: the keep rests on the barrel's ratified evenness
rule rather than on a demonstrated need, so `absenceOfObjection` is true. Retiring this one
export while keeping its thirteen siblings would break a stated contract to save 24 lines,
which is the wrong trade. The per-route tier as a whole is a `/sveltekit` question (the four
route factories), not a per-component one here.

## 16. `ConfirmPage` — `/components` — KEEP

**Provenance.** Engine-internal, Plan 05 admin UI. Pairs with `createAuthRoutes`'s confirm load
and the `?/confirm` named action (`sveltekit.md:831`, "per-route mounting"). Not
family-originated.

**Anonymous-consumer case.** 65 lines, but the surface it renders is cairn's magic-link token
POST: the field names, the action name, and the invalid/expired copy are the engine's auth
contract, and a consumer that re-typed them would silently 403 or, worse, mis-handle an expired
token. A per-route mounter that has replaced its login styling still must not re-implement this
form.

**Verdict: keep.** The site cannot legally reach the confirm action's contract from outside.
Low rank only because the per-route tier that needs it is unexercised.

## 17. `OfficeList` — `/admin-toolkit` — RESHAPE

**Provenance.** ASC's `ConceptList` header lifted out; moved from `/components` to
`/admin-toolkit` in `b36fd15c`. Family-originated. Zero engine consumers: the only in-repo use
is the docs reproduction story `src/lib/reproductions/stories/CustomScreen.svelte`.

**Anonymous-consumer case.** The card frame half is genuine: it encodes two measured defects a
consumer would rediscover — "The UA default h1/p margins do not collapse inside a flex column,
so they leaked past this stack's own gap-0.5 intent into a ~32px rendered gap", and "The flex
row default (stretch) pulls the action full-width below `sm`". The header half is not: cairn's
own audit rule calls this component "`OfficeList.svelte`'s own pre-toolkit twin of it"
(`weight-budget.ts:58`), and the reference page concedes the duplication — "A new build reaches
for `PageHeader` first; `OfficeList` stays correct where it already ships"
(`admin-toolkit.md:688`).

**Verdict: reshape.** Right membership (a screen scaffold is toolkit work), wrong form: two
header recipes ship side by side, and a `WATCH:` comment in the file itself parks a
"ROADMAP spacing-convergence entry between this component and PageHeader". The right form is
one header (`PageHeader`) plus a thin card-frame primitive this component composes, so the
eyebrow/title/subtitle/action grammar has exactly one implementation. Churn is free before beta,
so the duplicate should not survive to the freeze.

**reshapeNote:** collapse to a card-frame wrapper that composes `PageHeader` for its header
band, retiring the second eyebrow/title/subtitle/action implementation.

## 18. `formatTimestamp` — `/admin-toolkit` — RESHAPE

**Provenance.** ASC's `format.ts`, graduated `24b30c50` with one deliberate change: "its
`timeZone` default is `'UTC'`, not ASC's own `'America/Anchorage'`". Family-originated. Zero
consumers.

**Anonymous-consumer case.** The mechanic is real and any-site: pinning a zone so a Worker's
SSR and a browser's hydration cannot render two different strings. But the shipped shape misses
it. The parameter is `sqliteDatetime`, and the body does
`new Date(\`${sqliteDatetime.replace(' ', 'T')}Z\`)` — a D1-shaped input, ASC's storage
assumption baked into the signature. The proof is inside cairn: `CairnHistory.svelte:47` writes
its own `formatVersionDate` and documents why — it "keeps the time rather than routing through
the admin toolkit's civil-date-only formatter" and "Pins `timeZone: 'UTC'`, matching the admin
toolkit's own `formatTimestamp` default". The engine's own screen needed this formatter's
behavior, could not use this formatter, and hand-rolled it.

**Verdict: reshape.** Membership is right (the SSR/hydration zone trap is exactly a mechanic a
site cannot be expected to rediscover), the form is wrong. Re-derive it for any site rather
than transplanting ASC's column shape.

**reshapeNote:** take any `Date`-parseable timestamp (ISO with offset included), not a
SQLite-shaped string; then delete `CairnHistory`'s `formatVersionDate` and route it through
this, proving the shape on cairn's own screen.

## 19. `FormatTimestampOptions` — `/admin-toolkit` — KEEP

**Provenance.** Names `formatTimestamp`'s `timeZone`/`locale`/`fallback`. Family-originated.

**Anonymous-consumer case.** The `timeZone` option is the load-bearing half of the hydration
mechanic above: it is what lets a site state its own zone instead of inheriting one consumer's.
It survives the reshape unchanged.

**Verdict: keep,** riding item 18's reshape.

## 20. `CairnHistory` — `/components` — KEEP

**Provenance.** Engine-internal: the per-entry publish-history screen, `HistoryData` from
`historyLoad`. Not family-originated.

**Anonymous-consumer case.** It renders cairn's own git publish history and posts `?/revert`
with `ref` plus `head`, the stale-page guard: "carrying two hidden fields: `ref`, the row's full
commit sha, and `head`, `data.head`, the default branch's head sha this page rendered against"
(`components.md:352`). A consumer cannot reproduce the revert contract without re-deriving
cairn's git model.

**Verdict: keep.** Engine-owned surface, unreachable and unpatchable from a site. Ranked low
only because, like every view-tier export, its standalone mount is unexercised.

## 21. `RenameDialog` — `/components` — KEEP

**Provenance.** Engine-internal, composed by `EditPage`; exported "for a site that builds its
own per-route admin surface" (`components.md:592`). Not family-originated.

**Anonymous-consumer case.** A slug rename in cairn is not a text edit: it moves the entry's
branch and repoints inbound links, and the dialog's copy names the non-routable "Entries that
include this X" consequence. A custom list screen offering rename must post cairn's field names
to cairn's action.

**Verdict: keep.** Argued the other way: it is a `<dialog>` plus a form, and everything
dangerous lives server-side, so the export is convenience. What tips it is that the field names
and the consequence copy are engine contract, and a consumer retyping them gets a silent
mismatch rather than a compile error.

## 22. `DeleteDialog` — `/components` — KEEP

**Provenance.** Engine-internal, same tier and same rationale as `RenameDialog`. Not
family-originated.

**Anonymous-consumer case.** Stronger than its sibling: the dialog carries the inbound-link
guard that blocks a delete while other entries link to the target, and the cascade warning for
an entry with a pending branch ("the confirm copy then warns that those edits are discarded
too, since the delete cascades to the entry's pending branch", `components.md:702`). A custom
screen that hand-rolled a delete button would break the link graph silently.

**Verdict: keep.**

## 23. `SelectInputOption` — `/admin-toolkit` — KEEP

**Provenance.** Merged from `admin-fields` in `b36fd15c`; the field tier is "proven by the
aksailingclub-org club-admin scaffold" (`SelectInput.svelte` header). Family-originated.

**Anonymous-consumer case.** It names `SelectInput`'s `options` prop. Any site mounting
`SelectInput` in TypeScript needs the name to type its option array.

**Verdict: keep,** riding `SelectInput`.

## 24. `SelectInput` — `/admin-toolkit` — KEEP

**Provenance.** Same merge. Family-originated. Zero engine consumers; referenced only in
`docs/extend/add-a-custom-admin-screen.md:93`.

**Anonymous-consumer case.** A consumer building a custom admin screen inside `CairnAdminShell`
needs its controls to sit in the same label-and-control rhythm as the built-in editor, or the
screen reads as bolted on. The component is thin (`select select-sm` inside `FieldLabel`), but
the thinness is the point: the daisyUI-modifier choice ("DaisyUI v5's default-bordered `select`,
with no `-bordered` modifier") is an engine-owned decision that changes on a daisyUI bump, and
`admin-toolkit.md` pins each component's exact class inventory as the bump's grep surface.

**Verdict: keep.** Argued the other way: it is a 45-line wrapper with no engine consumer, and
zero consumers is a fair objection. The counter is that the register grammar and the daisyUI
class inventory are engine-owned and versioned; a site writing `select select-sm` by hand takes
the daisyUI upgrade risk cairn exists to absorb.

## 25. `TextInput` — `/admin-toolkit` — KEEP

**Provenance.** Same merge, same ASC scaffold origin. Family-originated. Zero engine consumers.

**Anonymous-consumer case.** Identical to `SelectInput`'s, and slightly stronger for the
`type` narrowing (`search`/`email`/`url`) a filter box needs.

**Verdict: keep,** on the same reasoning. The pair is the smallest coherent field set; splitting
the verdict between them would be incoherent.

## 26. `FieldLabel` — `/admin-toolkit` — KEEP

**Provenance.** Same merge. `f66921c7` — "Export the stacked field register on admin-fields,
default it (breaking)". Family-originated. One engine reference, and it is an audit rule
(`field-edge-alignment.ts`) reading the component as its subject rather than mounting it.

**Anonymous-consumer case.** The strongest of the three field primitives, because it carries
two things a consumer cannot derive from markup. First, a measured layout rule the engine had
to scope by hand (`a0e4e785`, "scope the stacked width hook"): "A control that's a direct child
of a stacked `FieldLabel` fills the label's own width. A control nested one level deeper …
keeps its own width instead." Second, a documented accessibility trap: a wrapping `<label>`
names only its first labelable descendant, so "every control after it has none"
(`admin-toolkit.md:258`). A site that hand-rolls the label wrapper hits both.

**Verdict: keep.**

## 27. `VocabularyAdmin` — `/components` — KEEP

**Provenance.** Engine-internal, from the tag-management plan series. Not family-originated.

**Anonymous-consumer case.** It edits cairn's committed tag vocabulary against cross-branch
usage counts, with an immutable-slug rule and a guarded remove for in-use values. The counts
come from cairn's own branch model; nothing about it is reproducible site-side.

**Verdict: keep.** Engine-owned content surface.

## 28. `CairnTidySettings` — `/components` — KEEP

**Provenance.** Engine-internal, the tidy subsystem's settings screen. Not family-originated.

**Anonymous-consumer case.** Two-tier settings over the read-only developer facts (tidy
enabled, key configured, model) and the editor-tier conventions, saving into the same committed
site-config YAML the nav editor writes. A site cannot write that YAML through any export.

**Verdict: keep.**

## 29. `HelpHome` — `/components` — KEEP

**Provenance.** Engine-internal. Not family-originated.

**Anonymous-consumer case.** Its getting-started progress is "derived from the committed
manifest and the open edit branches" (`components.md:517`) — engine state with no public
accessor. The `supportContact` seam (adapter override, empty string suppresses) is the
documented site hook, which is the correct thin shape.

**Verdict: keep.**

## 30. `NavTree` — `/components` — KEEP

**Provenance.** Engine-internal, Plan 05. Pairs with `createNavRoutes` and the `?/save` action
(`sveltekit.md:1313`). Not family-originated.

**Anonymous-consumer case.** Drag-to-reorder over cairn's nav tree, committing the rebuilt nav
to site config. The commit path is engine-only.

**Verdict: keep.**

## 31. `ManageEditors` — `/components` — KEEP

**Provenance.** Engine-internal, pairs with `createEditorRoutes` and the
`?/editorAdd`/`?/editorRemove`/`?/editorSetRole` actions. Not family-originated.

**Anonymous-consumer case.** Owner-only allowlist management, including the anti-lockout guard
that reads `data.self`, and role rendering that adapts to a site's declared role vocabulary. A
consumer's own roster screen provisioning cairn editors uses `/auth-store` (the xcathletes seam
1 ask, shipped `0.93.0`); this component is the screen behind it.

**Verdict: keep.**

## 32. `LoginPage` — `/components` — KEEP

**Provenance.** Engine-internal. Pairs with `requestAction` at `?/request`
(`sveltekit.md:831`). Not family-originated.

**Anonymous-consumer case.** The magic-link request form, including the three-state outcome
(`sent` / `send_error` / `throttled`) a hand-rolled form would collapse to "something went
wrong". Throttle and send-failure vocabularies are engine-owned.

**Verdict: keep.**

## 33. `EmptyStateHeadingLevel` — `/admin-toolkit` — KEEP

**Provenance.** Cairn-born with `EmptyState` (`3d9a3bd0`, "ruling 2"), widened later for
`WelcomeView`. Not family-originated.

**Anonymous-consumer case.** It names `EmptyState`'s `headingLevel` prop. A consumer whose
empty state is a page's only content passes `'h1'` so the page has a real heading in its
accessible tree — a concrete a11y need with a typed vocabulary.

**Verdict: keep,** riding `EmptyState`.

## 34. `AdminTableDensity` — `/admin-toolkit` — KEEP

**Provenance.** Graduated with `AdminTable` (`1cc8e4b1`). Family-originated.

**Anonymous-consumer case.** Names `AdminTable`'s `density` prop; a consumer holding density in
its own state needs the type. Deliberately aligned with `StatusChipSize`'s `'xs' | 'sm'`
vocabulary, which is the evenness the whole-surface test wants.

**Verdict: keep,** riding `AdminTable`.

## 35. `StatusChipSize` — `/admin-toolkit` — KEEP

**Provenance.** Graduated with `StatusChip` (`65cbc916`). Family-originated.

**Anonymous-consumer case.** Names the two sizes, and the distinction is measured, not
cosmetic: `sm` reserves a `5rem` minimum width, `xs` carries none "so a dense table column …
budgets the chip's width against its own short vocabulary rather than a floor sized for a
longer label" (`admin-toolkit.md:337`). A consumer with a narrow status column needs `xs`.

**Verdict: keep,** riding `StatusChip`.

## 36. `StatusChipRegister` — `/admin-toolkit` — KEEP

**Provenance.** Later than the graduation; the two registers are ratified against a measured
probe (`StatusChip.svelte`: "BOUNDED (Task 1 ratified,
docs/internal/probes/2026-07-28-chip-registers)"). Family-originated by lineage.

**Anonymous-consumer case.** The registers carry canvas-measured contrast numbers a consumer
cannot re-derive without its own probe rig — bounded at 3.586/3.513/4.959/5.263 across four
grounds, quiet at 1.804/1.684/1.703/2.026. This is the audit's second gate met head-on: a
ratified, measured grammar.

**Verdict: keep,** riding `StatusChip`'s reshape.

## 37. `StatusChipTone` — `/admin-toolkit` — KEEP

**Provenance.** Graduated `65cbc916` ("keeps the five-tone vocabulary"). Family-originated.

**Anonymous-consumer case.** The tone-to-standing mapping is deliberately left to the consumer
— "the same chip serves a publish-state pill on one screen and a household-standing pill on
another with no shared domain knowledge baked in" (`admin-toolkit.md:332`). That is the correct
any-site shape: the engine ships the vocabulary, the site assigns meaning.

**Verdict: keep.**

## 38. `ListToolbarAction` — `/admin-toolkit` — KEEP

**Provenance.** Graduated with `ListToolbar` (`1cc8e4b1`). Family-originated.

**Anonymous-consumer case.** `{ label, onClick }`, and the type is where the toolbar's
one-action rule is enforced: "the toolbar's one right-aligned action; the contract never accepts
more than one" (`admin-toolkit.md:547`). Constraining a screen to a single primary action is an
engine opinion, expressed in the type rather than in prose.

**Verdict: keep,** riding `ListToolbar`.

## 39. `ListToolbarFilterOption` — `/admin-toolkit` — KEEP

**Provenance.** Same commit; the optional per-option `count` arrived as "ruling 6's additive
graduation extensions". Family-originated.

**Anonymous-consumer case.** Names one option in a filter's vocabulary, including the count
that segmented display renders as "`All 6`, never a parenthesized `All(6)`" — a copy rule
carried in the component rather than left to each site.

**Verdict: keep,** riding `ListToolbar`.

## 40. `ListToolbarFilter` — `/admin-toolkit` — KEEP

**Provenance.** Same commit. Family-originated.

**Anonymous-consumer case.** The largest type in the subpath and the one a consumer actually
writes: `id`/`label`/`options`/`value`/`onChange` plus `defaultValue`, `promoted`, `display`.
It encodes the fully controlled convention (the site owns every value) and the promoted-versus-
overflow decision. A site with more filters than band width faces exactly this choice.

**Verdict: keep.**

## 41. `ItemLabel` — `/admin-toolkit` — KEEP

**Provenance.** Cairn-side widening of an ASC-born contract; `format.ts:148` — "graduated from
aksailingclub-org's own `format.ts` (the 'l households' defect: a bare plural noun reads wrong
at exactly one)". Family-originated.

**Anonymous-consumer case.** It is in the public prop signature of both `Pagination` and
`ListToolbar` (`itemLabel?: string | ItemLabel`), so any consumer wanting correct grammatical
number at a count of one needs it. The defect it fixes ("1 households") is universal to count
lines, not domain-shaped.

**Verdict: keep.**

## 42. `itemNoun` — `/admin-toolkit` — KEEP

**Provenance.** Same lineage; one engine consumer (`ConceptList.svelte:211`,
`itemNoun(1, data.singular ?? data.label)`). Family-originated.

**Anonymous-consumer case.** A custom screen rendering a count line outside `ListToolbar` — a
`PageHeader` `meta` line, say — needs the same one/many selector the toolbar uses, or the two
count lines on one screen disagree at exactly one item. `PageHeader`'s `meta` is documented as
precisely that home ("the toolkit's one home for a page-level count outside a toolbar").

**Verdict: keep,** with the tension named: it is three lines, which is the same smallness
objection that retires `formatPhone`. It survives where `formatPhone` does not because it is
the behavioral contract of `ItemLabel`, a type two kept components take as a prop, and because
it is "the single fix point" for a defect class the engine's own screens hit.

## 43. `formatCivilDate` — `/admin-toolkit` — KEEP

**Provenance.** ASC `format.ts`, graduated `24b30c50` with an `Intl`-options passthrough added
"per the adoption map's ruling 6". Family-originated, but the only formatter the engine
dogfoods twice: `ConceptList.svelte:415` and `CairnMediaLibrary.svelte:1685`.

**Anonymous-consumer case.** It encodes a genuine any-site trap in code rather than prose:
"Parses at local midnight so the calendar day never shifts a day west of Greenwich the way a
bare `new Date(iso)` UTC parse would, and never routes a civil date through a time-of-day
formatter (the '4:00 PM' artifact …)". Any cairn site with a dated concept renders a
frontmatter `YYYY-MM-DD` in a list; the naive `new Date(iso)` renders yesterday for every
visitor west of UTC. cairn's own `ConceptList` renders exactly that cell.

**Verdict: keep.** This is what the rest of `format.ts` should have looked like: a measured
mechanic, dogfooded, domain-free.

## 44. `FormatCivilDateOptions` — `/admin-toolkit` — KEEP

**Provenance.** Same commit; `intlOptions` added at graduation for a partial-date render.
Family-originated.

**Anonymous-consumer case.** `CairnMediaLibrary` uses the passthrough for a month/day cell
(`intlOptions: { month: 'short', day: 'numeric' }`), proving the option is not speculative. A
consumer wanting a longer or shorter date shape needs it.

**Verdict: keep,** riding `formatCivilDate`.

## 45. `ConceptList` — `/components` — KEEP

**Provenance.** Engine-internal, Plan 05; pairs with `createContentRoutes`'s list load
(`sveltekit.md:1117`). Not family-originated.

**Anonymous-consumer case.** The list screen for one content concept, carrying cairn's
publish-state vocabulary directly: "Each row carries a status badge from `entry.status` (New,
Edited, or Published), and an entry with `draft: true` carries a separate Hidden badge beside
it." New/Edited/Published is the branch model made visible; no site can compute it.

**Verdict: keep.**

## 46. `EmptyState` — `/admin-toolkit` — KEEP

**Provenance.** Cairn-born, `3d9a3bd0`: "EmptyState mints the centered first-run idiom
ConceptList, CairnMediaLibrary, and WelcomeView each currently hand-roll (ruling 2)". Not
family-originated — measured internal repetition, three ways, drove it.

**Anonymous-consumer case.** Every admin screen has a nothing-here state, and the component
carries a distinction most sites get wrong: whole-concept-empty is this centered fill, while
filtered-to-zero is "a smaller, in-card notice inside `AdminTable`'s own `empty` snippet
instead, never this component". A consumer that used one treatment for both would tell an
author their content was gone when a filter was merely narrow.

**Verdict: keep.** The provenance is the model the rest of the subpath should have followed:
minted from counted repetition, not transplanted.

## 47. `Pagination` — `/admin-toolkit` — KEEP

**Provenance.** ASC-born, graduated `65cbc916`, with `pageSizeOptions`/`onPageSizeChange` added
at graduation because "ConceptList's rows-per-page select is the first engine consumer".
Family-originated, three engine consumers.

**Anonymous-consumer case.** A consumer's long admin list needs a pager, and the component
carries two things a hand-roll misses: the windowing that stops a 40-page list from rendering
40 buttons, and `role="status"` on the range line "so a page or page-size change announces the
new range to assistive technology even though nothing moves focus". The live-region detail is
the kind an anonymous consumer would not know to add.

**Verdict: keep.** The public compute helpers behind it retire (items 11 and 13); the component
keeps them internally.

## 48. `ExpandableRow` — `/admin-toolkit` — KEEP

**Provenance.** ASC's `src/admin-club/toolkit/ExpandableRow.svelte`, graduated `296f93fb` on an
explicit second-consumer trigger. Family-originated, and — uniquely among the kept components
— **zero engine consumers**: no cairn admin screen mounts it.

**Anonymous-consumer case.** Strong despite the zero. Expand-in-place over a wide admin table
is a generic shape, and the component encodes four things a hand-roll gets wrong, each recorded
with its refutation: the sticky trigger cell so horizontal scroll "never strands it off-screen";
the trigger background following daisyUI's own `tr:nth-child(2n)` zebra parity so the pinned
column does not seam; the panel kept as a genuine `<td colspan>` rather than `display: block`,
because a spanning cell removed from table layout resolves width through the browser's anonymous
fixup row; and a `base-300` recess after "adversarial review refuted" `base-200` as the zebra
stripe's own color. The 2026-08-26 triage adds two more contract fixes "inside a component
whose event contract consumers cannot patch" — the audit's first gate, stated exactly.

**Verdict: keep.** Argued the other way: no engine screen dogfoods it, and the design spec had
already deferred it once for exactly that reason ("a wrong contract published in cairn is a
breaking change everywhere"). It survives because the failure modes are measured and
platform-shaped rather than domain-shaped. The absent dogfooding is a real gap and should be
closed, not waived.

## 49. `AdminTable` — `/admin-toolkit` — KEEP

**Provenance.** ASC-born, graduated `1cc8e4b1`. Family-originated, eight engine consumers.

**Anonymous-consumer case.** The membership test it passes is the shape rule: it "owns the
table's own chrome and never a row shape or a data contract: it carries no `rows: T[]` prop,
and a caller's row markup is entirely its own template". That is functionality re-derived in
the form easiest for any site rather than transplanted from the requesting site's row model.
The `white-space: nowrap` floor plus `overflow-x: auto` wrapper is the measured
single-line-table grammar a consumer would otherwise rediscover by shipping a wrapped table.

**Verdict: keep.**

## 50. `StatusChip` — `/admin-toolkit` — RESHAPE

**Provenance.** ASC-born, graduated `65cbc916`. Family-originated, eleven engine consumers —
the most dogfooded item in the subpath.

**Anonymous-consumer case.** Unambiguous. It solves an engine-owned CSS problem a site cannot
patch: "`badge-error`/`badge-success` do not compile into the packaged `cairn-admin.css`, while
every `status-<tone>` modifier does, which is why the dot, not the badge fill, carries color".
A consumer writing `badge badge-success` inside the admin theme gets nothing, and cannot fix it
without overriding the engine's own sheet.

**Verdict: reshape,** on evidence already ratified and not yet absorbed. The 2026-08-26 triage
(item 2, three independent ASC findings) records that the 6px tone dot at `StatusChip.svelte:106`
was "ruled illegible toolkit-wide" by Geoff's 2026-08-24 owner probe, and that ASC's
three-register grammar "survived three consumer screens unmodified with 26 canvas-readback
measurements". That is precisely this audit's second gate: a ratified, measured grammar has
diverged from what the engine ships. Membership stays; the color signal and the register set
change.

**reshapeNote:** replace the illegible 6px dot as the color carrier and complete the register
set (warning-tint, outline) against cairn's own themes, re-measuring rather than copying ASC's
tuning.

## 51. `ListToolbar` — `/admin-toolkit` — RESHAPE

**Provenance.** ASC-born, graduated `1cc8e4b1` with segmented display and the `trailing` snippet
added at graduation. Family-originated, ten engine consumers.

**Anonymous-consumer case.** Very strong on membership. It carries three things a consumer
provably gets wrong: a real ARIA radiogroup for segmented filters ("each option is `role="radio"`
with `aria-checked`, never `aria-pressed`", with the full arrow/Home/End model), the
`role="status"` count line, and the full disclosure pattern for overflow (Escape from trigger or
panel, focus return, outside-pointerdown close). The measured proof is in the triage: "the one
consumer that hand-copied them missed all four on the first pass."

**Verdict: reshape.** The disclosure mechanics are correct and buried. Triage item 4 asks for
them as their own primitive, and that is the right form under the shape rule: a consumer needing
a disclosure elsewhere in its screen should not have to mount a whole toolbar or re-copy four
mechanics. The component itself stays.

**reshapeNote:** extract the four disclosure mechanics (`aria-expanded`/`aria-controls`,
focus-in, Escape-plus-return, outside close) as a `ToolbarDisclosure` primitive `ListToolbar`
composes, so a consumer reaches them without re-copying them.

## 52. `PageHeader` — `/admin-toolkit` — KEEP

**Provenance.** Cairn-born, not graduated: `3d9a3bd0` — "the finding-11 convergence component:
the canonical admin page-header recipe … the OfficeList shape generalized", answering the
2026-07-15 admin UX audit's counted finding of "page-header idiom five ways". Not
family-originated. Thirteen engine consumers, the most-adopted component in the subpath.

**Anonymous-consumer case.** A consumer adding a screen to `CairnAdminShell` needs its header
band to match the engine's own or the screen reads as foreign. The component encodes the
eyebrow/title/meta/action recipe plus the ratified placement rule that keeps screens coherent —
"search never lives in this band, since `ListToolbar` owns it". Its provenance is the model the
gate wants: minted from counted internal repetition, generalized, then adopted thirteen times.

**Verdict: keep.** Strongest toolkit item. Its one open issue is the `OfficeList` duplication,
resolved on `OfficeList`'s side (item 17), not here.

## 53. `CairnMediaLibrary` — `/components` — KEEP

**Provenance.** Engine-internal, the admin media screen (3,159 lines). Not family-originated.

**Anonymous-consumer case.** It renders the unioned asset set plus the per-hash usage overlay,
and its safe-delete flow gates on cairn's own link graph: an in-use face naming the breaking
entries behind a typed-slug confirmation, an orphan face that is a calm confirm. A consumer
cannot compute where-used across published and branch state. It is also the one screen where a
naive replacement silently breaks live pages.

**Verdict: keep.** Unreachable, unpatchable, and enormous.

## 54. `EditPage` — `/components` — KEEP

**Provenance.** Engine-internal, Plan 05; pairs with `createContentRoutes`'s edit load. Not
family-originated.

**Anonymous-consumer case.** cairn's core job made visible: the save/publish lifecycle, the
pending-branch state, the sandboxed preview frame, the dirtiness guard across body and sidebar.
Its `previewMint` prop is documented with the right boundary — "presentational only … Hiding the
group is a product choice about what an editor sees on this screen, never an access-control
decision" — which is the seam discipline the charter asks for.

**Verdict: keep.**

## 55. `MarkdownEditor` — `/components` — RESHAPE

**Provenance.** Engine-internal and charter-named: `CLAUDE.md` calls it "the `MarkdownEditor`
seam". Not family-originated. Sole internal caller is `EditPage`, by relative import.

**Anonymous-consumer case.** The eleven stable props are cairn's authoring seam and a real
promise: a site mounting the bare CodeMirror surface with its own chrome, supplying controls
through `registerFormat`. The surface carries markdown-aware lint, GFM parsing, the directive
rails, and the self-hosted editor face — none of it reachable otherwise.

**Verdict: reshape,** and this one is overdue. The 2026-07-01 surface-pruning audit reached the
same finding and its recommendation was only half-applied: the ~20 `EditPage` wiring callbacks
were re-tiered from "Extension API" to "Unstable API" but not collapsed. The audit's own words:
"the reshape (collapse the wiring callbacks into a single non-exported internal composition
object; keep value/name/registerInsert/registerFormat/completionSources/focusMode/typewriter/
surface as the beta-frozen bare-surface contract) is entirely internal, breaks no consumer …
The charter's leanness principle favors it and the migration cost is nil". That is still true:
`EditPage` imports by relative path and is the only caller. A documented public component whose
reference page carries a 20-row table of "expect it to move" plumbing is not a comprehensible
seam.

**reshapeNote:** collapse the ~20 Unstable `EditPage` wiring props into one non-exported
internal composition object; publish only the eleven stable bare-surface props.

## 56. `PreviewBanner` — `/components` — KEEP

**Provenance.** Engine-internal, pairs with `previewLoad`. The barrel names it the deliberate
exception to its own membership rule (`index.ts:29`). Not family-originated. Real consumer:
`examples/showcase/src/routes/(site)/preview/[token]/+page.svelte`.

**Anonymous-consumer case.** It encodes a correctness rule a site would get wrong: "`state:
'published'` reports only that the preview has ended, since a discarded edit and a published
entry both reach this state and the copy must never claim the draft went live (false for the
discard case)". It also fixes a hydration hazard by rendering a fixed
`YYYY-MM-DD HH:MM UTC` string so "a Worker whose runtime locale or timezone differs from the
browser's own cannot render two different strings". Both are engine-model facts.

**Verdict: keep.** Its four CSS custom properties are the correct thin override seam, and the
docs are explicit that "A site may ignore this component entirely" — cairn serving a need
without owning the site's design.

## 57. `CsrfField` — `/components` — KEEP

**Provenance.** Engine-internal. Not family-originated. Real consumer in the showcase's own
custom admin screen (`examples/showcase/src/routes/admin/signups/+page.svelte`), the only view
of the barrel a custom screen actually imports.

**Anonymous-consumer case.** The clearest keep in the subsystem. Every form inside
`CairnAdminShell` must carry cairn's double-submit token, and the component reads it from shell
context so "a custom `/admin/` screen's forms get the token the same way". Without it a
consumer's own form 403s against cairn's guard, and "A form that renders no `CsrfField` fails
the guard's token check, which is the intended fail-closed signal". A site cannot mint the
token itself.

**Verdict: keep.** Noting the triage's item 5 as a defect to fix inside the kept shape, not a
shape change: the field renders an unbound hidden input, so a successful `use:enhance` submit
resets it blank and the next submit 403s — "One repo hit it twice."

## 58. `CairnAdminShell` — `/components` — KEEP

**Provenance.** Engine-internal, from the extensibility-1 plan; shipped as the custom-route seam
in `0.77.0`. Not family-originated. Consumed by the showcase layout and by every family site,
and named in the xcathletes brief's scope check as already-sufficient: "`CairnAdminShell` +
`admin-toolkit` for coach surfaces".

**Anonymous-consumer case.** It is the mounting seam the whole extending-developer lens rests
on: one chrome for the engine's views and any custom screen, with the sidebar resolving a
site's declared `navLayout`, the attention pills, the streamed publish-all count, the command
palette, and CSRF context. Every one of those depends on engine state a site cannot compute.
The `themeOverride` prop is a well-shaped narrow seam (reactive, suppresses the cookie and
media-query reads, and renders no toggle that would flip the theme out from under the host).

**Verdict: keep.**

## 59. `CairnAdmin` — `/components` — KEEP

**Provenance.** Engine-internal, the single-mount facade from the single-mount-admin plan. Not
family-originated. The documented canonical mount, used by the showcase and by
`docs/extend/build-a-site-by-hand.md:301`.

**Anonymous-consumer case.** The strongest item in the subsystem and the one every getting-
started site mounts: one component from the catch-all `/admin/[...path]` route, switching
`data.view` across every engine screen. It is the whole zero-config admin. Its props are the
adapter's own three rendering knobs plus `form` passthrough — exactly the thin seam shape the
charter asks for.

**Verdict: keep.**

---

## Subsystem observations

**Fourteen retires, all in one place.** Every retire falls in `/admin-toolkit`, and every one
is either an ASC-domain formatter (phone, money, age) with zero consumers or a pure helper
split out of a component **for testability** and then exported by reflex. Neither group has a
consumer, and the tests import the internal module paths, so nothing depends on the public
names. The five surviving formatters/helpers (`formatCivilDate`, `formatTimestamp` reshaped,
`itemNoun`, plus their option types) are the ones that encode a measured trap rather than a
storage shape.

**The provenance split predicts the verdict.** Cairn-born items (`PageHeader`, `EmptyState`)
were minted from counted internal repetition and rank at the top; the four ASC formatters were
transplanted wholesale and rank at the bottom. `formatTimestamp` is the diagnostic case: the
transplant kept ASC's SQLite column shape in the signature, and the engine's own `CairnHistory`
then hand-rolled the same formatter rather than use it.

**Zero-dogfood items to watch.** `ExpandableRow`, `OfficeList`, and the three field primitives
have no engine consumer. `OfficeList` also duplicates `PageHeader`, which cairn's own audit rule
already calls out. The toolkit's founding design spec made engine dogfooding the graduation
shakedown ("The engine becomes the toolkit's second consumer, which is the shakedown the
wave-by-graduation ruling wants before a contract publishes"); these five shipped without it.

**`/components` is coherent.** Its membership rule is exact and stated, its exports carry
engine-model state no site can compute, and the one exception (`PreviewBanner`) is documented as
an exception. Its only shape defect is `MarkdownEditor`'s uncollapsed wiring props, a finding
a prior audit already reached and only half-applied.
