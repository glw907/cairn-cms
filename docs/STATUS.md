# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(currently `STATUS-archive-2026-05-to-2026-07.md` and `STATUS-archive-2026-07-02-to-2026-07-16.md`),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-17, latest: the invisible-craft polish pass SHIPPED as 0.87.1; next = the Waymark FINAL design review, fresh session)

**0.87.1 [set at cut; verify against the release] rolls the invisible-craft polish pass**, the
admin design-arc queue's item 4, run Geoff-in-the-loop as a design arc (the full record and
post-mortem: `docs/internal/2026-07-16-invisible-craft-arc-log.md`). The window: a two-track
audit (nine mechanical scan agents + three optical lenses over 80 renders) yielding ~30
look-preserving fixes; six ratified verdicts (settings-card stacking, the pressed-cue inset
hairline closing the weight-only advisory, nested radii, the preview-only fragment boundary cue,
the publish blast-radius line, the include atomic chip + folded-container chip); the fragments
nav glyph (layers); the auth-page theme fix (the cookie resolves before sign-in;
`AdminShellData`'s public variant carries `theme` — the one public-surface tick, type-level
only); and the `check:invisible-craft` standing gate (transition band, spacing brackets,
no-achromatic colors, budgeted exceptions). The pass-end 44-agent review workflow (five lenses,
three refuters per finding) confirmed 11 findings, all folded in the same window, including two
majors (the include chip's grammar over-match, the preview cue's dark-ground contrast).

**Gates at close:** check 0/0 (1385 files), 3646 tests exit 0, every check:* green, PR #3 CI
green after the canonical baseline regen (the arc's intended visual drift), consumer build
proven by the CI e2e's real checkout.

**NEXT (fresh session): the WAYMARK FINAL DESIGN REVIEW.** The pre-beta ladder's step 4, now
unblocked: both production rebuilds are live (907.life "no pending work"; ecxc.ski deployed with
its six locked picks), so the review grades TODAY'S post-chassis, post-harvest Waymark, then
cairn.pub (step 5) becomes a short deploy. Calibration (Geoff, 2026-07-16): the same rigor as
the admin polish sessions — a two-track opening audit as a workflow (mechanical scans + optical
lenses over real renders at the five-viewport bar), adversarial verify, probe pages for taste
forks, Geoff-in-the-loop verdicts, settle-once ceremony. The DESIGN-DNA RIDER (Geoff,
2026-07-16): re-run the polish rubric's universal dimensions over the template tree (chassis +
cairn theme + prose.css) and weigh extending `check:invisible-craft`'s scan family-wide. The
five lenses and their briefs live in the ROADMAP's "Waymark final design review" entry; the
CTA-contrast lesson (computed color-vs-background equality as a standard numeric check) rides
the mechanical track. Full prep: the `cairn-template-effort` memory's NEXT block. Resume
prompt: "Run the Waymark final design review: read the ROADMAP's 'Waymark final design review'
entry, the cairn-template-effort memory's NEXT block, and
docs/internal/2026-07-15-admin-resolved-polish-brief.md (the rubric whose universal dimensions
the mechanical track re-runs over the template tree); open with the two-track audit as a
workflow against the live-rendered showcase at the five-viewport bar, both color modes, with
the stress fixtures." Launch inside ~/Projects/cairn-cms.

**PARALLEL, in ASC's own session:** the ASC consolidation consumes fragments (its
docs/fragment-candidates.md holds nine ready cases).

**Carry-forwards (this pass's watches):** the dev backend cannot exercise fragments
(`fragmentTargets: []`) and renders every media tile as "Image missing" — both filed in the
friction log and ROADMAP Now (the seed item); the media chip and `figureRoleAtLine` share the
fence/brace gaps the include chip was cured of (friction log; fix when the media decorations
open); `check:custom-surface`/`check:chassis-boundary` are CI-dark (friction log); the
folded-chip snippet-preview and phone affordance are deferred by ruling (ROADMAP Next).

## The archived 0.87.0 entry (superseded 2026-07-17)

Moved to `docs/internal/history/STATUS-archive-2026-07-02-to-2026-07-16.md` per the archive
rule.

