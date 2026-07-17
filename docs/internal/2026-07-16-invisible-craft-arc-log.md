# Invisible-craft polish pass: the arc record and post-mortem (2026-07-16 to 2026-07-17)

The pass record for the admin design-arc queue's item 4, distilled at settle from the live arc
log (the numbered iterations below are that log, kept as the decision record). Rubric:
`2026-07-15-admin-resolved-polish-brief.md`. Branch: `design/invisible-craft-polish`, merged via
PR #3; published in 0.87.1's window. The rolling summary lives in `docs/STATUS.md`.

1. Fragments nav glyph: probe slate (puzzle / layers / files / file-stack / combine) at real
   sidebar size — KEPT `layers` (Geoff: "layers is perfect"). Puzzle rejected for the component-
   block collision; layers reads "one thing present in many places" and is the one distinct
   silhouette at 16px. Landed as `ENGINE_NAV_ICONS.fragments` (the reserved concept id), the
   dated/undated kind-glyph precedent extended.
2. Entrance stagger (audit motion finding: no entrance treatment exists to stagger) — SKIPPED by
   ruling (Geoff: "calm is right"). No entrance motion enters the admin; the finding closes as
   deliberate restraint, not debt.
3. Round 1, the mechanical batch (~30 audit findings, one implementer dispatch) — KEPT after diff
   review and a four-render read (dark login composed, office 1440 clean, media 320 names restored
   from "M." to full, desk 390 unbroken). Commit 1fe400d7. Judgment calls ridden along: pagination
   margin mb-4 (trailing space, not a zone boundary), unconditional 44px on the two desk-band
   controls, checkbox hit-slop as one :has() rule with the layer cap raised 14→16.
4. FRICTION (file at settle): the dev backend seeds R2 bytes per SEED_MEDIA_KEYS yet every library
   tile renders the "Image missing" state in `vite dev`; pre-existing, not a round-1 regression
   (visible in the pre-round audit renders). Optical review of real thumbnails is blocked on it.
5. Vocabulary 320: probe slate (current / stacked / column-drop) — KEPT A, the stacked row (Geoff:
   "stacked row (A) looks good"). Verified at 320 live: no collision, meta line self-labels.
   Commit 0991b8a9.
6. Verdicts 6 and 7B landed and verified live (commit 8719b115): the folded chip reads
   "Callout · “Trail alert” · 3 lines" (the em dash from the probe mock corrected to the pill
   grammar's middle dot, since the admin voice bans the em dash in UI strings and check:prose
   cannot see a .ts-built string); the include chip is content-width, atomic, and falls back to
   the id. TWO MORE DEV-BACKEND FRICTIONS (file at settle with the thumbnails one): the fake
   backend ships `fragmentTargets: []`, so local dev cannot exercise the picker or title
   resolution at all (the on-disk showcase fragment never reaches the fake manifest), and the
   band snippet can appear empty to an automation script that types before hydration settles.
7. Final probe sitting, six verdicts, ALL RECOMMENDATIONS RATIFIED (Geoff: "Your recommendations
   are all on point"): 1B settings card stacks below sm (badge under the grid, label-over-value);
   2C pressed cue = the 10% wash plus a 35% primary inset hairline on every check-and-tint pressed
   control (closes the weight-only advisory); 3 nested radius corrected in the picker preview
   (inner = outer minus padding); 4B preview-only boundary cue on spliced fragment content (2px
   directive-accent hairline + "From <title>" eyebrow, always on in preview); 5 publish
   blast-radius line on a fragment's confirm ("Publishing updates N entries that include this
   fragment", only when N > 0); 6 include-line atomic delete = YES (media-chip precedent; no
   salvageable prose inside); 7B folded chip absorbs the container opener while folded (registry
   label, own title, count; includes render their fragment's human title, never the id).
   Snippet-preview and phone affordance explicitly deferred, not part of 7B.

## Post-mortem (settle, 2026-07-17)

**What was built.** The two-track audit (nine mechanical scan agents with file:line evidence +
three optical lenses over 80 renders at the five-viewport bar, both themes) produced ~40
findings against ~35 confirmed already-right claims; the look-preserving batch of ~30 landed as
one implementer dispatch. Six taste verdicts were ratified from probe pages and landed (the
settings-card stack, the pressed-cue inset hairline in each family's own ink, nested radii, the
preview-only fragment boundary cue, the publish blast-radius line in the notice region, the
include atomic chip and the folded-container chip). The fragments sidebar glyph (layers) landed
from the first probe. The auth pages honor the theme cookie before sign-in. The
`check:invisible-craft` gate banks the transition band, the spacing-bracket allowlist, and the
no-achromatic-color rule with budgeted exceptions.

**What was verified, with evidence.** check 0/0 (1385 files); 3646 tests exit 0 after the
review fold-in; every check:* gate green locally; the pass-end 44-agent adversarial review
(five lenses, three refuters per finding) confirmed 11 findings, refuted 2, and all 11 folded
in-window with tests, including two majors (the include chip's grammar over-match, which a
pre-existing test turned out to pin as behavior, and the preview cue's dark-ground contrast);
CI on PR #3 green with the canonical baseline regen recording the intended visual drift.

**Decisions locked.** Entrance motion stays out of the admin by ruling ("calm is right"). The
folded chip's snippet preview and phone affordance are deferred by ruling, not debt. Puzzle
stays reserved for component blocks; layers is Fragments. The pill grammar's separator is the
middle dot; the admin voice keeps the em dash out of UI strings even when built in .ts (a gap
check:prose cannot see; caught by review here).

**Process notes.** The blast-radius verdict was ratified against a mock of a publish confirm
dialog that does not exist (single-entry Publish is one-click by design); the implementer
caught the false premise and the fix moved the line to the notice region, where the intent
survives at every width. Two dispatched agents raced one file zero times: parallel dispatches
were kept to disjoint file sets, with EditPage serialized (A, then B, with C's title threading
adjudicated between them). Version discipline: this window is a patch by the 0.x scale rule;
the launch phrase "minor point release" briefly became 0.88.0 in planning before Geoff caught
it, and the derive-at-the-cut rule is now baked into the cairn-release skill and the
release-process memory.

**Budgets.** Tokens: the audit workflow ~1.3M, the review workflow ~3.3M, the four implementer
dispatches + simplifier ~1.2M, plus the main loop. Geoff interaction points: the launch, one
icon verdict, one entrance-stagger ruling, one vocabulary verdict, the six-verdict probe
sitting, the version correction (a defect on my side, now gated), and the two prep notes; no
mid-execution check-ins.
