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


## Immediate next action (2026-07-28: RESUME design-infrastructure Pass 2 at Phase 3)

**Phases 1 and 2 of Pass 2 are COMPLETE. Phases 3 through 5 (Tasks 11 to 18) are untouched.**
Plan: `docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md`. Tasks 0
to 10 are ticked, and the Phase 2 post-mortem is appended to that file. Read it before Phase 3;
it carries the four items below with their evidence.

**Resume prompt for a fresh session**, from `~/Projects/cairn-cms`: "Resume the
design-infrastructure Pass 2 plan at Phase 3 (Task 11), task by task per cairn-pass. Phases 1
and 2 are complete on the `design-infra-pass-2-enforcement` worktree." The worktree already
exists at `.claude/worktrees/design-infra-pass-2` with its showcase deps installed against it,
so no setup is owed. Do NOT re-run Phase 1 or Phase 2.

**Where the work sits.** Task 0 merged to `main` (`640b48d2`). Tasks 1 to 10 are on
`design-infra-pass-2-enforcement`, unmerged, sixteen commits, tree clean at `ecb7194c`. The
Phase 2 commits are NOT yet pushed. Branch CI needs a `workflow_dispatch` or a PR, since the
workflows only auto-run on `main` and pull requests.

**What Phase 2 closed.** `cairn-audit` ships as a packaged bin (`"cairn-audit":
"./dist/audit/bin.js"`) with nine static rules, a counted suppression idiom, and the two static
repo gates graduated into it as thin wrappers. The substrates are `svelte/compiler` markup
parsing and built-sheet resolution, never regexes. The engine's own-tree run is the acceptance
evidence: `1 error, 0 advisories, 5 suppressed`, where the five are exactly the ratified
`type-scale` exceptions and the one error is a real design defect (carry-forward 1).

An adversarial verify pass (three read-only lenses, each required to demonstrate a miss with a
runnable input) returned 13 findings against the finished engine, several live in cairn's own
tree rather than synthetic: class strings built in a component's `<script>` were unreachable in
principle, every rule prefilter anchored at the start of the raw token so `2xl:text-sm` escaped,
`gap-scale` never consulted the sheet at all, CSS nesting hid whole rules, and a typo in a
configured scan path produced a clean exit-0 audit. Eleven were fixed at the substrate with the
demonstrated input as the regression fixture. That the audit engine had reproduced the very
fail-open failure it exists to prevent is the pass's headline lesson.

**Four items carried into Phase 3 and Task 17**, full detail in the post-mortem:

1. **FOR GEOFF, a design call: `badge-ghost` on EditPage's Published pill**
   (`EditPage.svelte:989`). cairn's tree patched around its own refuted alternative with a
   PINNED unlayered CSS rule to stop the pill vanishing in dark, while `StatusChip.svelte:15`
   records `badge-ghost` as refuted. A naive swap to `badge-outline` is wrong on its own, moves
   pixels, and leaves the pinned rule dead. This is why `npx cairn-audit` exits 1 on cairn's own
   tree, honestly.
2. **Suppression range semantics.** A directive covers the next construct AND its children. The
   only non-arbitrary alternative would make a directive above an `@media` or `{#if}` dead. Both
   satisfy cairn's five live exceptions, so it wants Task 17's evidence, not a guess.
3. **`.ts`-embedded styles are unaudited.** The old gate walked `.ts`; the new CSS-family rules
   do not, so `preview-doc.ts`'s RATIFIED `#fff` budget entry did not migrate to a directive, it
   stopped being seen. `WATCH:` note co-located at `preview-doc.ts:99`.
4. **`stock-default-hazards` reads raw token values** while `type-scale` and `gap-scale` read
   `utilityBase()`, so `sm:badge-ghost` slips past. Routing it through widens the rule, so it is
   a rule-design call. `WATCH:` note at the rule.

**Still owed at pass end (Task 18), do not lose:** the `## Unreleased` changelog window carries
NO `<!-- release-size: minor -->` marker, so `check:version` currently sizes it as a patch. Pass
1 added new public surface and Pass 2 adds a new bin, so that is wrong and Task 18 must fix it.
No release is due until the initiative boundary after Pass 3 (spec section 10).

**A lesson Phase 1 earned, still binding on any migration pass.** A bracketed arbitrary size
(`text-[1.875rem]`) sets `font-size` alone while a named step (`text-3xl`) also sets
`line-height`, so converting between them silently changes leading. And a migration can break a
surface it never edits: removing the last scanned `text-sm` stopped Tailwind compiling that
rule, and `src/lib/admin-fields`, a public export subpath outside the scan roots, still used it.
Both were found by a fresh context reading for meaning, not by a gate. Phase 2 repeated the
pattern exactly: every one of its 13 fail-opens came from an adversarial reader, none from the
green gates.

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

**A SIXTH DESIGN PRINCIPLE, ruled 2026-07-28 (Geoff).** The front-page ledger goes from five to six.
The new claim is that cairn's design language is ENFORCED, not merely documented (the grammar tokens,
the toolkit primitives, `cairn-audit`, the norms manifest, the standard shipped as a loadable skill),
and the payoff is that a developer spends their effort on their own business logic rather than on
building an admin interface. The honest form is LESS burdened, not free. "Build for agentic coding"
was considered and rejected as the phrasing: it is an imperative where the other five are flat
declaratives, and it keys the principle to a vocabulary that will move. Agentic coding is the payoff,
not the premise; the acute case is that an enforced language keeps an agent from drifting off the
rails when it implements or adds UI, which helps a human developer identically.

This touches two queued passes. The principle-pages plan is AMENDED in place (six pages, `T1a`
through `T1f`; full reasoning at the top of that file), and Pass 3 owns the README and front-page
positioning that lands it. **The blocking dependency: the page will want to say cairn ships a Claude
skill, and that is not true today.** There is no `skills/` directory and the package `files` array
does not carry one; Pass 3 ships it. Do not publish the skills claim before it lands. The copy itself
is unwritten by design, since front-page voice is a brainstorm sitting with Geoff, not execution work.

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
