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


## Immediate next action (2026-07-19, latest: DEV-BACKEND SHIPPED as v0.88.1; next = the Topo design pass)

**THE DEV-BACKEND PASS SHIPPED 2026-07-19 (PR #7 merged, v0.88.1 published, registry
verified).** The window: the dev backend seeds two published fragments (picker, include-chip
title resolution, and preview splice all work under `vite dev`), the seeded R2 objects are
real decodable 240x160 PNGs (the Media Library shows real thumbnails; the only "Image
missing" tile is the deliberate `PASS_C_MISSING` broken-reference fixture), the
`getPlatformProxy` media-delivery smoke, the two CI-dark gates wired into `test.yml`, the
media-chip fence gap and `figureRoleAtLine` anchor fixes, mermaid fence passthrough in the
highlighter, and the theme-import and preview-iframe docs. The friction log is cleared to
ZERO open findings (14 triaged: 7 shipped, 2 already resolved, 5 moved to ROADMAP with
triggers; the `menus:` entry closed on a recorded wire-at-template-scope decision, not
removal). All three riders closed: `cairn-register-editor` loads
`docs/internal/docs-register.md` as canonical; the monthly SvelteKit routine watches
kit#12533 beside checkOrigin; the Cloudflare token gained Zone Workers Routes (verified
live on cairn.pub, recorded in the estate inventory). Method: T1 as a plain dispatch, then
a Geoff-authorized Workflow ran T2-T8 serially with per-task verifiers (zero repair rounds),
simplifier declined changes with accepted reasoning, eight gates green, two-reviewer fan-out
returned one accepted nit (seedFragments writes bodies before its manifest-exists check;
harmless while the handle orders the seeds). Admin-media visual baselines regenerated on CI
(intended drift from real thumbnails); note the regen commit's workflows need a manual
approval (`action_required`) because the Actions bot authored it. Record: the post-mortem in
`docs/superpowers/plans/2026-07-19-dev-backend.md`. Sizing lesson re-proven: the authorized
"minor" derived as a patch at the cut and Geoff confirmed `0.88.1`.

**ASC hand-off remains open:** v0.88.x carries everything the admin-sidebar-2 consumer brief
(`aksailingclub-org/docs/2026-07-18-cairn-sidebar-seams-consumer-brief.md`) waits on.
ASC work runs in aksailingclub-org's own sessions; its sites must apply `0001_roles.sql`
before custom role names insert.

**NEXT (immediate): execute the chassis-nav pass plan
(`docs/superpowers/plans/2026-07-19-chassis-nav.md`).** Two friction-derived items pulled
forward because Topo is their consumer (Geoff, 2026-07-19): the showcase public chrome
reads `menus.primary` through the engine's `extractMenu` (the `/admin/nav` editor is
already wired; the header hardcodes, so editor nav edits currently publish into a void),
and the arm-index coverage gate. Method: `cairn-implementer` per task, test-first, on a
`chassis-nav` worktree off `main`; release at pass end (Geoff authorized "a minor bump";
the plan's Release section carries the derive-at-the-cut rule and the 0.88.1 precedent).
Resume prompt: "Execute the chassis-nav pass plan (STATUS names it)." Launch in
~/Projects/cairn-cms.

**QUEUED after it: the Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md` (four-system synthesis, devices
table, Starlight anatomy checklist, section 5's open questions for Geoff; mockup
candidates go to Geoff BEFORE any build). After Topo: the scaffolder (step 6). Check the
Fable window state at session start (post-Fable doctrine: Opus conducts after it closes;
verify online).

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
