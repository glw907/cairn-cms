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


## Immediate next action (2026-07-23, latest: v0.90.0 published; next = the principle-pages pass)

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
