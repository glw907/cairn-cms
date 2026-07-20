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


## Immediate next action (2026-07-20, latest: v0.88.3 published; next = the Topo design pass)

**v0.88.3 SHIPPED 2026-07-20 (ASC-triggered, out-of-band single-task publish; `latest`
verified).** A new documented safelist source, `src/lib/components/admin-css-safelist.ts`,
makes the admin CSS build compile a curated blessed set of daisyUI 5 classes no shipped
admin component references yet: `stats`/`stat-*`, `table-zebra`/`table-xs`, `toast` with
its placement modifiers, the `indicator`/`status`/`join` placement and orientation
modifiers, and `badge-soft`/`badge-outline`/`badge-dash`. This is T1 of ASC's Members pass
(`aksailingclub-org/docs/plans/2026-07-20-members-pass.md`), the engine change its
admin-toolkit design survey's "daisyUI-first assembly" ruling needed before that site could
build the toolkit's StatBand/StatusChip/TagChip/Pagination components. Full gate green
(`check` 0/0, 3776 tests, `check:custom-surface`, `check:comments`, the four doc gates, a
from-scratch showcase build); patch by the sizing rule (no new subsystem or public surface,
only internal build output). No `Consumers must:` action.

**THE CHASSIS-NAV PASS SHIPPED 2026-07-19 (PR #8 merged, v0.88.2 published, `latest`
verified).** The window: the showcase public header renders `menus.primary` through the
engine's `extractMenu` via the ROOT layout server load (the root placement also feeds the
`+error.svelte` mount; `App.PageData` types it app-wide), a lean `src/theme/site-config.ts`
owns the template's single `parseSiteConfig` call with `cairn.config.ts` re-exporting
`siteConfig`, content reconciled first so no visual drift (CI baselines held), a two-test
e2e locks the config-to-render wiring and the error-page nav contract, tutorial Milestone 7
rewritten off the client-side adapter import onto the same server-load shape, and the
`check:arm-indexes` CI gate (set difference per arm; the tutorial arm's index is the front
door, encoded explicitly; it caught and fixed the orphaned `build-a-theme.md`). The footer
stays hardcoded deliberately (different content). Both ROADMAP items removed; one new
finding filed (guides/add-an-island.md teaches a root-layout client import of the full
adapter; ROADMAP Next with the registry-split fix named). Method: two serial
`cairn-implementer` dispatches, zero repair rounds, simplifier one accepted change,
`svelte-reviewer` sound-no-blockers with three suggestions applied and one declined with
reasoning; full gate green locally and on CI. One human interaction point (the release-size
confirmation). Record: the post-mortem in
`docs/superpowers/plans/2026-07-19-chassis-nav.md`. Sizing lesson proven a third time:
authorized "minor" derived and confirmed as patch `0.88.2`.

**ASC hand-off remains open:** v0.88.x carries everything the admin-sidebar-2 consumer brief
(`aksailingclub-org/docs/2026-07-18-cairn-sidebar-seams-consumer-brief.md`) waits on.
ASC work runs in aksailingclub-org's own sessions; its sites must apply `0001_roles.sql`
before custom role names insert.

**NEXT: two queued passes, Geoff sequences.** (1) **Principle pages + LLM ingestion**,
planned 2026-07-19 and awaiting his approval:
`docs/superpowers/plans/2026-07-19-principle-pages-and-llm-ingestion.md` (five standalone
explanation pages for the core design principles, the ASC extended-admin figure with its
naming question flagged as his call, and cairn.pub's llms.txt / llms-full.txt / per-page
markdown endpoints; ends with a release cut so the site can render the new pages).
(2) **The Topo design pass.** Open with
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
smoke (Geoff's magic link + publish round-trip) is owed.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`, and
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries).
