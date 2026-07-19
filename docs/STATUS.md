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


## Immediate next action (2026-07-19, latest: ACCESS-AND-ATTENTION SHIPPED as v0.88.0; next = the Topo design pass)

**THE ADMIN ACCESS-AND-ATTENTION PASS SHIPPED 2026-07-19 (PR #6 merged, v0.88.0
published, registry verified; Geoff authorized workflow orchestration and release in one
directive).** The window: the access map (`defineAccess`, `canReach` as the one
authority, `requireAccess`, 403 enforcement at every engine gate, `auth.access.denied`),
nav derivation from the same authority, declared collapse defaults with cookie-wins,
the 27-name icon vocabulary with engine-ref overrides, and the attention seam with
leak-proof pills and collapsed-header sums. Method: one Workflow ran T1-T9 serially via
`cairn-implementer` with per-task Sonnet verifiers (two real catches: publishAllAction
unfiltered, empty-cookie precedence), then simplifier + three Opus reviewers in-flight;
the review fan-out's one major (shell payload streamed unreachable pending-draft ids)
and three minors were fixed; the spec's showcase consumer matrix test was added (the
plan had omitted it). Live smoke on the showcase Worker proved zero-config parity and
the restricted-role story end to end (door absent, 403 page, denial event logged).
Record: the post-mortem in `docs/superpowers/plans/2026-07-18-admin-access-and-attention.md`.

**ASC hand-off is open:** v0.88.0 carries everything the admin-sidebar-2 consumer brief
(`aksailingclub-org/docs/2026-07-18-cairn-sidebar-seams-consumer-brief.md`) waits on.
ASC work runs in aksailingclub-org's own sessions; its sites must apply `0001_roles.sql`
before custom role names insert (the smoke re-proved the CHECK constraint path).

**NEXT (immediate): the Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md` (four-system synthesis, devices
table, Starlight anatomy checklist, section 5's open questions for Geoff; mockup
candidates go to Geoff BEFORE any build). After Topo: the scaffolder (step 6). Check the
Fable window state at session start (post-Fable doctrine: Opus conducts after it closes;
verify online).

**Carry-forwards (live):** NEW from this pass: admin error statuses flatten to HTTP 200
under the shell's streamed pending count (upstream sveltejs/kit#12533; ROADMAP watch
filed, guide caveat published, candidate rider for the scheduled kit-watch routine).
STANDING: mermaid diagrams near-illegible at 320/390 (candidate: tap-to-expand in the
Topo pass); section-index breadcrumbs duplicate the arm name; the Cloudflare API token
lacks zone-route write on the cairn.pub zone (scripted deploys read as failures); the
dev backend still cannot exercise fragments and renders media tiles as "Image missing"
(ROADMAP Now seed item); nine friction-log entries await the next clearing (the eight
prior plus this pass's status-flattening probe lesson); `check:chassis-boundary` remains
CI-dark (`check:custom-surface` ran green at this release); the cairn.pub live admin
smoke (Geoff's magic link + publish round-trip) is owed; point `cairn-register-editor`
at the banked register standard.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`, and
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries).
