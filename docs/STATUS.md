# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to
`docs/internal/history/STATUS-archive-2026-05-to-2026-07.md` (and successors), never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-03)

The docs rewrite Stage 2 fan-out is executing on `docs-rewrite-1` (the proven four-gate
per-page pipeline; the editor arm is done and ratified). Task 1 (snippet gate) is dispatched;
Tasks 3-7 (tutorial, guides, explanation, reference, repo health) follow per
`docs/superpowers/plans/2026-07-01-docs-rewrite-stage-2.md`. Resume prompt: "Continue the
docs Stage 2 fan-out on the docs-rewrite-1 worktree; read the plan and the
cairn-docs-rewrite-initiative memory."

## Immediate next action (2026-07-02, LATEST): cairn.pub LIVE (vanilla Wayfinder); README polish loop with Geoff underway

**cairn.pub serves the vanilla Wayfinder scaffold** (repo `glw907/cairn-pub`, worker
`cairn-pub`, D1 `cairn-pub-auth`/`-app`, R2 `cairn-pub-media`, sender enabled, owner row
seeded, first standalone registry consumer of 0.79.0). Geoff's two actions: add `cairn-pub`
to the GitHub App installation (owner-only; save/publish blocked until then) and a live
sign-in test. The reviewed Wayfinder replaces this at ladder step 5. Scaffolder findings
(dev-wiring strip; self-documenting placeholder) filed in ROADMAP.

**The code polish pass is merged to `main`** (merge `0d72870`; plan + post-mortem at
`docs/superpowers/plans/2026-07-01-code-polish-pass.md`). The window: the idiom charter
(`docs/internal/code-idioms.md`, a standing pass dimension), the 61-agent adversarially-verified
sweep (content-routes 3,435→128 lines; knip 61→15; jscpd 86→64), the `check:consumers` root gate,
the admin-css content scope (shipped sheet −31%), the form-renderer merge's revert-and-record
(ROADMAP Later entry corrected; 23 guard tests banked), the two ruled surface changes (action
renames + editor-mutation log events), and the security review + simplifier backstop, all green.
Holds unpublished under `## Unreleased` with the pruning window.

**The pre-beta ladder (ROADMAP `## Now`) is the plan; steps 1-2 done.** `v0.79.0` is on the
registry as `latest` (release `f6523ee`; the pruning + polish window, two `Consumers must:`
sections; the rebuilds consume it at step 7). Step 3 runs in parallel: the docs rewrite Stage 2 (plan written; twelve outlines drafted,
adversarially reviewed, thirteen findings folded — `2026-07-02-docs-rewrite-outlines.md`; gate:
Geoff reads the front-door drafts) and the Wayfinder starter component set (list DECIDED by Geoff:
figure, gallery, video embed, pull quote, CTA, FAQ/details + existing callout/alert; converter
island replaced by a useful exemplar; the aksailingclub/Blowfish survey informing the plan is
in flight).

**Front-loaded and settled (2026-07-02):** the beta gate is DECIDED (all four rulings in ROADMAP);
cairn.pub REGISTERED (zone active); the rebuild-from-Wayfinder program supersedes the cutovers;
the retheme-lab evidence and the stress-fixture harness (`wayfinder-review-fixtures` branch) are
banked for the design review.

**Carried follow-ups (churn):**
- npm placeholder publish for unscoped `cairn-cms` — Geoff's interactive act, remind before beta.
- `CairnMediaLibrary` html self-duplication + component split (ROADMAP, deliberate deferrals).
- Awareness note: a no-op accepted editor mutation emits a success-shaped log event (matches
  action semantics; matters only if the log is read as a mutation counter).
- The `code-polish-1` worktree/branch pruned at this roll.
