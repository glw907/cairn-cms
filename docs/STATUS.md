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

## Immediate next action (2026-07-01, LATEST): 0.78.2 PUBLISHED; NEXT = the surface-pruning pass (plan written, pre-beta), then the site cutovers

**`0.78.2` is on the registry as `latest`.** The cut rolled the four held passes since `0.78.1`: the
CM-native suggestion popover, the editor accessibility hardening, the Media Library direct upload, and
the starter-template native re-expression (branch `starter-template-1` renamed to
`admin-reexpr-starter-template`, merged `--no-ff` as `0273c96`). No entry in the window carries a
`Consumers must:` line. Release notes: the `v0.78.2` GitHub release; changelog under `## 0.78.2`.

**Two CI-only gate failures surfaced and were fixed during the cut**, both misses by earlier passes:

- `e2e` (spellcheck.spec.ts) still drove the retired built-in lint tooltip (`.cm-diagnosticAction`,
  hover-opened); the popover pass replaced that DOM with `.cairn-cm-suggest` on caret-in-range but
  never updated the CI-only spec. Fixed in `8fa4e01`; the spike spec's CI failure was the known slow
  dictionary-load flake (passed on retry) and needed nothing.
- `check:surface` failed because the media pass added `mediaLibraryUpload` and the `uploaded` flash to
  the public surface without regenerating `docs/internal/api-surface.md`. Snapshot updated in `b58cc05`.
  The lesson for every pass: the CI-only gates (`check:surface`, the e2e) are part of the pass gate
  whenever the pass touches the public surface or the editor/admin DOM an e2e drives.

**Routine created at push (the deferred CM follow-up):** `cairn-cm-upgrade-watch`
(`trig_01FUvcfteDNUe1dwP7MVumNE`, monthly on the 1st, Sonnet, read-and-report) bumps `@codemirror/*`
in a cloud checkout and runs `check` + `test` + `check:cm-internals`, pinging on failure.

**NEXT: the surface-pruning pass (pre-beta contract freeze).** An adversarial 19-agent audit of
the public surface (2026-07-01) convicted ~106 of 305 exported names as engine plumbing leaked
onto the contract, plus five reshapes and two shape blockers (the open `routing` union, the
hand-declared `Platform.env`). The plan is
`docs/superpowers/plans/2026-07-01-surface-pruning-pass.md` (evidence:
`2026-07-01-surface-pruning-audit-verdicts.md` beside it); it lands the prune, the shape fixes,
the three-tier stability vocabulary (`Unstable API` joins `Extension API`/`Scaffold API`,
gate-enforced per export), and the packaging boundary, all batched under one `## Unreleased`
window. Run it BEFORE the site cutovers so the pruned contract is what gets production miles.
The docs rewrite (tutorial `mintToken` and admin-mount fixes included) follows the freeze;
code is the guide until then.

**Then: the site cutovers (ROADMAP `## Now`).** Cross ecxc-ski and 907-life onto `0.78.2` with their
v2-adapter cutovers: mount the shared `/admin/+layout`, read `page.data.shell`, transcribe each site's
URL policy into `defineConcept` (the phase-3b hard error catches a miss), and run the **owed live admin
smoke** against a real Worker (the standing deferral from the tag-management and media passes). Use
`site-pass` per site.

**Then the next engine pass: body-link cross-branch delete protection** (ROADMAP `## Next`, the
recommendation carried from the media pass): extend the strict fail-closed cross-branch reference
index to the body-link delete gate, closing locked decision 9's deliberate asymmetry.

**Carried follow-ups (churn, do not accumulate):**
- Three deferred media review findings in `docs/internal/docs-friction-log.md` (the generic `fail(409)`
  card, the failed-state focus move, non-image-drop feedback).
- The popover backtick-in-`aria-label` polish (friction log; parse to `<code>` in `spellcheck.ts`).
- Three pre-existing editor a11y items from the Pass 2 review: fold-control target size (WCAG 2.5.8),
  gutter fold-button tab order (2.4.3), a real-screen-reader verbosity check of the two live regions.
- Housekeeping: the three merged worktrees under `.claude/worktrees/` and the merged feature branches
  (`admin-reexpr-*`, `contract-v2-*`, `worktree-tag*`, `admin-reexpr-starter-template`) can be pruned.
