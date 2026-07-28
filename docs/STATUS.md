# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-28: RESUME design-infrastructure Pass 2 at Phase 2)

**Phase 1 of Pass 2 is COMPLETE. Phases 2 through 5 (Tasks 7 to 18) are untouched.** Plan:
`docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md`, whose Phase 2
header carries the three Phase 1 findings that constrain the remaining work. Tasks 0 to 6 are
ticked in the plan.

**Resume prompt for a fresh session**, from `~/Projects/cairn-cms`: "Resume the
design-infrastructure Pass 2 plan at Phase 2 (Task 7), task by task per cairn-pass. Phase 1 is
complete on the `design-infra-pass-2-enforcement` worktree." The worktree already exists at
`.claude/worktrees/design-infra-pass-2` with its showcase deps installed against it, so no
setup is owed. Do NOT re-run Phase 1.

**Where the work sits.** Task 0 merged to `main` (`640b48d2`). Tasks 1 to 6 are on
`design-infra-pass-2-enforcement`, pushed and unmerged, eight commits. The branch is green:
`e2e` passes by `workflow_dispatch` (the workflows only auto-run on `main` and pull requests, so
a branch run needs the dispatch or a PR).

**What Phase 1 closed.** The admin type scale is complete and every font size resolves to a
role. Seven roles, each carrying a ruled leading token behind a `--tw-leading` override; 119
twelve-pixel sites resolved per-site onto meta and label; 129 named Tailwind steps migrated
pixel-identically; the heading role ratified at 18px, weight 700, Bricolage, leading 28px; five
counted exceptions (three wordmark sites, two editor-canvas sites); one baseline regeneration
read by eye. `admin-visual` is green again on the new baselines.

**Three findings that bind Phase 2**, all recorded in the plan and the docs:

1. **The suppression idiom is amended.** "Disable next line" must resolve to the next AST node,
   not the next physical line. Cairn's own tree already has a multi-line-element exception that a
   line-literal parser would score as a dead directive PLUS an unsuppressed finding. Task 8's
   fixtures must cover it.
2. **`type-scale` must not confuse `text-base` with `text-base-content`.** A plain word boundary
   matches the size token inside the daisyUI COLOR utilities. This has caused two miscounts in
   this initiative already.
3. **The static scan scope must include `src/lib/admin-fields`.** It is the third public surface
   rendering inside the admin theme, and it was in neither the stylesheet scan roots nor
   `check:admin-css-classes` until Phase 1 added it. The omission had already silently broken a
   shipped class.

**Still owed at pass end (Task 18), do not lose:** the `## Unreleased` changelog window carries
NO `<!-- release-size: minor -->` marker, so `check:version` currently sizes it as a patch. Pass
1 added new public surface, so that is wrong and Task 18 must fix it. No release is due until the
initiative boundary after Pass 3 (spec section 10).

**Two lessons Phase 1 earned, worth carrying into any migration pass.** A bracketed arbitrary size
(`text-[1.875rem]`) sets `font-size` alone while a named step (`text-3xl`) also sets `line-height`,
so converting between them silently changes leading; that bit the editor's document title while the
visual gate was deliberately red and could not catch it. And a migration can break a surface it
never edits: removing the last scanned `text-sm` stopped Tailwind compiling that rule, and
`src/lib/admin-fields`, a public export subpath outside the scan roots, still used it. Both were
found by a fresh context reading for meaning, not by a gate, which is the same pattern the Pass 1
post-mortem recorded.

**PASS 1 (GRAMMAR TOKENS) LANDED 2026-07-27, unpublished on `main`.** Seven commits
(`ddf0afbd`..`6b3a5138`): ten grammar tokens (`--cairn-type-*` x6, `--cairn-gap-*` x4) declared once
outside the theme blocks, ten role utilities that set exactly one property each, 25 admin components
migrated pixel-identically (the 18 `admin-visual` snapshots do not move), the deviations ledger, and
the public contract page `docs/reference/admin-grammar-tokens.md`. Full gate green, plus a
from-scratch showcase `npm ci` + e2e (107 passed; the 6 `admin-visual` failures are the stale
baselines described below, which predate the pass). Method, the five locked
decisions, and the three defects the mechanical gates missed are in the post-mortem appended to
`docs/superpowers/plans/2026-07-27-design-infrastructure-pass-1-grammar-tokens.md`. Read it before
planning Pass 2.

Pass 3 (capture) follows, then ONE release at the initiative boundary (spec section 10), then the ASC
Assets trial. The principle-pages pass queues behind the initiative. When that release is cut it is a
MINOR, not a patch: Pass 1 added a new public surface (the grammar layer and its reference page), so
its entry needs the `<!-- release-size: minor -->` marker `check:version` looks for.

**RED CI CLOSED 2026-07-28 (Pass 2 Task 0).** The six stale `admin-visual` baselines (office shell,
media library, media detail panel, each in both schemes) regenerated on the CI renderer via `e2e.yml`'s
`update_snapshots` dispatch and landed on `main` as `84abe955`. They had been stale since 2026-07-21
(`bff6ee46`): `0.90.0` (ExpandableRow graduation, the ListToolbar menu facet and its flex-row
recomposition, StatusChip's border, OfficeList) and `0.90.1` (ListToolbar select sizing) changed exactly
those screens without regenerating, and `e2e` had been red on `main` since 2026-07-24, through both cuts.

Regeneration blesses whatever renders, so all six got a main-loop eyes-on read against the `0.90.x`
design intent before landing. The only delta is the intended one: the `ListToolbar` recomposes onto a
single flex row, the search input grows to fill it, the facet groups right-align, and the content below
settles up about 2px. No regression in either scheme. One observation carried, not a defect: with a
single facet group the media library's search input stretches to roughly 630px, which is wide for a
search field, and it is a register question for the Task 12 toolbar work rather than a `0.90.x` bug.

**v0.90.1 published 2026-07-24 (`latest` verified).** Patch cut for the Members-refinement
coherence round: `ListToolbar`'s `'select'` facets un-pin from daisyUI's fixed 320px clamp and
size to content, sharing the `'menu'` facet's border family; both dropdown disclosures now show
only on `dropdown-open` so `aria-expanded` stays truthful; the menu options carry
`role="menuitemradio"`/`aria-checked` with a roving-tabindex keyboard model. Window in the
CHANGELOG's `0.90.1` entry. OPEN DESIGN QUESTION for Geoff (measured at the cut, report-only):
`--cairn-card-border` as the facet controls' only boundary measures 1.11:1 light / 1.43:1 dark
against `base-200` — well under WCAG 1.4.11's 3:1 — a deliberate ratified hairline, but a one-token
ruling could clear it in a follow-up patch.

**v0.90.0 published 2026-07-23 (`latest` verified).** Cut for the Members-refinement round-1
cairn phase (C1-C6): `ExpandableRow` graduates into `admin-toolkit` (its second consumer,
aksailingclub-org's own copy, carrying three hover/zebra/panel-depth fixes), `ListToolbar`
gains a `display: 'menu'` filter facet plus a flex-row recomposition of its controls,
`StatusChip`'s border demotes to a 35% currentColor hairline, `OfficeList`'s header-stack
margin leak and mobile action stretch are fixed, `formatPhone` joins the toolkit formatters,
and `ConceptList`'s create-button label now reads through `itemNoun`. Minor per the 0.x scheme
(a new component export plus a new `ListToolbar` display variant). Full window in the
CHANGELOG's `0.90.0` entry. ASC's own pickup (the plan's Phase A) rides this publish.

**v0.89.1 published 2026-07-21 (`latest` verified).** The one-item window: `itemNoun`/`ItemLabel`
graduated from ASC's toolkit into the `admin-toolkit` subpath, with `Pagination`'s and
`ListToolbar`'s `itemLabel` widened to `string | ItemLabel` (plain strings unchanged; no
consumer action). Cut mid-classes-pass because ASC's toolkit swap (its Task 2) needs the export
on the registry; a blind swap onto 0.89.0 would have regressed the "1 households" coherence
fix. The cut also stamped the api-surface snapshot and renamed the upgrade guide's stale
`Unreleased` heading to 0.89.0 (missed at the prior cut). ASC's range bump to `^0.89.1` rides
its classes pass.

**THE ADMIN-TOOLKIT ORGANIZATION PASS SHIPPED 2026-07-21 (PR #9 merged, v0.89.0 published,
`latest` verified).** The window: the new public subpath `@glw907/cairn-cms/admin-toolkit`
(PageHeader, ListToolbar, AdminTable, StatusChip, Pagination, EmptyState, and the four
formatters, graduated from the ASC-born contracts with the additive ruling-6 extensions;
`formatTimestamp` defaults UTC; ExpandableRow held ASC-local per ruling 1), the adoption
sweep re-expressing every engine admin screen on the toolkit (finding 11 closed: one header
idiom, one count device, one search-placement rule; the showcase Signups screen is the
packaged-subpath consumer proof), T8's daisy absorption ritual + Dependabot watch, and the
reviewer-fix round (live-region count lines, disclosure dismissal, 24px targets, EmptyState
heading levels, the AdminTable empty contract). Late catch worth knowing: the admin CSS
build's `@source` scan had never included `src/lib/admin-toolkit`, so classes used only
there silently never compiled (ListToolbar's segmented filters rendered stacked; the first
CI baseline regen swallowed it; the main-loop crop read caught it). Fixed at the root plus
a new CI gate, `check:admin-css-classes`, that fails on any referenced-but-never-compiled
class. Record: the post-mortem in
`docs/superpowers/plans/2026-07-20-admin-toolkit-organization.md` (method, cost, the
five-gate miss, and the two evidence-backed finding refutations).

**ASC hand-off now fully unblocked:** v0.89.0 carries the toolkit subpath ASC's next screen
pass swaps onto (deleting its local `src/admin-club/toolkit/` copies; `formatTimestamp` now
needs an explicit `America/Anchorage`), plus everything the admin-sidebar-2 consumer brief
waited on. ASC work runs in aksailingclub-org's own sessions; its sites must apply
`0001_roles.sql` before custom role names insert.

**NEXT (immediate): the principle-pages + LLM-ingestion pass, APPROVED 2026-07-20.**
`docs/superpowers/plans/2026-07-19-principle-pages-and-llm-ingestion.md` (a disposition
survey that integrates the five core principles into the docs and reorganizes as needed,
a STAGED DEMO extended-admin figure, and cairn.pub's llms.txt / llms-full.txt / per-page
markdown endpoints plus the /docs-landing and footer surfacing; ends with a release cut so
the site can render the reorganized docs). Docs-prose work that reuses the register
machinery; execute in a FRESH session (the plan is the cold-start handoff).

**THEN (2) The Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md` (four-system synthesis, devices
table, Starlight anatomy checklist, section 5's open questions for Geoff; mockup
candidates go to Geoff BEFORE any build); the cairn.pub design arc (its Passes 2 through 4)
ratified seed vocabulary for it: the four-door landing, the docs rail on /help, the
step-down doc heading scale, and the micro-cta device. After Topo: the scaffolder (step 6).
Check the Fable window state at session start (post-Fable doctrine: Opus conducts after it
closes; verify online).

**Carry-forwards (live):** admin error statuses flatten to HTTP 200 under the shell's
streamed pending count (upstream sveltejs/kit#12533; guide caveat published, ROADMAP watch
filed, scheduled routine now watches it); mermaid diagrams near-illegible at 320/390
(candidate: tap-to-expand in the Topo pass, which the engine's new mermaid passthrough
unblocks); section-index breadcrumbs duplicate the arm name; the cairn.pub live admin
smoke (Geoff's magic link + publish round-trip) is owed; the `/admin/help` first-steps
card overlap (pre-existing, found 2026-07-21 during the toolkit pass's render read) is
filed in ROADMAP Now with a baseline-coverage rider.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), and `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav
pass and the v0.88.3 safelist publish).
