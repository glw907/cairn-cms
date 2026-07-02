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

## Immediate next action (2026-07-01, LATEST): surface-pruning pass MERGED (the contract freeze); NEXT = the code polish pass, then the docs rewrite

**The surface-pruning pass is merged to `main`** (merge `4136cb2`, branch `surface-pruning-1`;
plan and post-mortem at `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md`, audit
evidence beside it). The window: ~106 exports demoted to the audited contract (the
`api-surface.md` diff is the authoritative list), the five reshapes (routing union closed with a
runtime guard, loud `parseSiteConfig` boundary, `createMediaRoute(runtime)`, the `auth`/`tidy`
deps regroup, `CairnPlatformBindings`/`CairnMediaBindings`), `MarkdownEditor` narrowed to eleven
stable props by documentation, the three-tier stability vocabulary (`Unstable API` joins
Extension/Scaffold, every export tier-gated, plus the stale-name reverse check), and `src/lib`
out of the tarball with the deep-import lock. Holds unpublished under `## Unreleased` with a full
`Consumers must:` list mirrored in `upgrade-cairn.md`. Review gate: simplifier no-changes, three
reviewers zero blockers; the bindings-fidelity warning and the dev-package fallout were fixed
in-pass (`46af986`, `42d2346`).

**NEXT: the code polish pass (ROADMAP `## Now`), Geoff's call 2026-07-01, before the docs
rewrite.** Method in the ROADMAP entry: idiom charter (`docs/internal/code-idioms.md`) first,
deterministic bloat measurement, then a behavior-preserving sweep with `check:surface` as the
frozen invariant; surface-change wants get filed, never done in the sweep. The polish plan and
the docs-rewrite plan are both being drafted warm (one combined brainstorm); execution order:
polish first.

**Carried follow-ups (churn, do not accumulate):**
- The owed `check:dev-package`/showcase-check root gate: the Task 6 regroup broke the dev
  package silently; friction log carries the incident. Strong candidate to land IN the polish
  pass as a gate rider.
- `settingsSave`/`vocabularySave` unguarded `SiteConfigError` (bare 500; friction log,
  candidate `fail(400)`).
- `VocabularyLoadData`/`SettingsData` barrel-export inconsistency (additive; decide when a
  consumer needs to name them).
- Prior carries: the three deferred media review findings, the popover backtick `aria-label`
  polish, the three editor-a11y items (friction log), the live admin smoke at the site
  cutovers.
- CI on `main` after this push is the final from-scratch consumer proof (the two
  `admin-visual` pixel flakes are known and pre-existing).
