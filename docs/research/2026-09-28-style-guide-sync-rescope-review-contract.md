# Style-guide sync re-scope review: contract and criteria lens

Date: 2026-09-28. Targets at `e0d5f954`: the re-scoped spec
(`docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`) and plan
(`docs/superpowers/plans/2026-09-28-style-guide-sync.md`). Lens: is every promise testable, can
any criterion pass vacuously, does each task's acceptance map to a spec criterion, does ruling 16
have a real check, and is the ceremony proportionate. Governing ruling 15: no finding below asks
for new machinery. Every fold is a sentence in the spec or plan, or a reordering.

Evidence gathered for this read (not from the targets' own claims):

- `scripts/checks/docs-gate.mjs:61` and `package.json` `check:vale` run Vale at
  `--minAlertLevel=error`. A rule at `warning` is invisible to the docs gate.
- The register at `feca3348` carries the ratified rules as "The keystone", the 13-bullet
  "Universal contract", "Calibration specimens" (five killed specimens), and the track, front-door,
  Names, anatomies, and reviewer sections. R1 moved most of these into the briefs.
- The developer brief today measures about 2,300 words (Structure 1,155, Voice 688, Tells 407).
  The feca3348 vendor-link rule alone runs about 200 words.
- The register's current deviation tables hold four Google rows (measured tone, qualified claims,
  first person dated 2026-07-02, and a dormant README exclamation row), each with an Evidence
  column.
- The pre-W1 `docs-page-chain.js` (`79c5e23^`) tells the drafter and editor to read "the universal
  contract and the track section", a heading R1 removed. W1 routed brief, Names, Visuals, track
  section, and anatomies, and threw on an unknown track (`docs-page-chain.js:209-221`). The
  revert removes all of that.
- The dotfiles `retired-phrases.txt` header names "the cairn-cms twin (the style-guide-sync
  plan's R8)", which the re-scope cuts.

## Verdict

Sound in shape. The re-scope is proportionate and mostly testable, and the owner time sits where
the only unmeasurable criteria live (the R5 voice and the J2 comparison). Four majors need a
sentence each before execution: the ruling-16 check can pass by omission and runs too late, one
spec sentence inverts ruling 2, the warning-level rules are invisible to every check that names
them, and the revert silently stops routing the preserved sections to the drafter. No blocker.

Counts: 0 blocker, 5 major, 8 minor (correctness); 2 minor (over-ceremony). No owner fork.

## Correctness findings, ranked by consequence

### M1. Major: the ruling-16 check can pass by omission, and it runs after everything that depends on it

Location: spec lines 136-137, 233-234, 250-252; plan lines 117-118, 246-250.

Defect. Criterion 2 is graded by a fresh read "grading R1t's disposition list against
`feca3348`". The list is authored by the same implementer that did the trim. A grader that checks
the listed rows cannot see a rule the list omits, so a dropped rule that is also left off the list
passes. "Reworded" is also ungraded for meaning, so a rule can be hollowed and still be called
kept. The list lives only in a transient implementer report, which the thin conductor must carry
across a segment boundary and a possible resume. Last, J4 runs after J1, J2, and Geoff's sitting,
so a voice loss surfaces after the drafter has already imitated the trimmed register and after
Geoff has spent his one sitting on output drawn from it.

Fold. Two sentences, no new artifact:

1. The grader enumerates the ratified rules itself from the register at `feca3348` (every bullet
   of the keystone, the universal contract, and the calibration specimens, plus the track,
   front-door, Names, anatomy, and reviewer sections) and locates each in the trimmed register.
   A "reworded" rule must forbid or require the same form; otherwise it is "changed by ruling N"
   and must name N. The implementer's list becomes a convenience, not the evidence.
2. Move that disposition grade to the end of segment A, right after R1t, as one conductor
   dispatch. J4 keeps only the register-editor read. A drop then folds before W1r's prompts,
   J1, J2, and Geoff's sitting build on it.

### M2. Major: W3r's rule inverts ruling 2 and makes the register editor flag every tightening

Location: spec lines 199-200 ("a register rule stricter than the guide that has no row in the
deviations section is a finding").

Defect. Ruling 2 (spec lines 36-38) and the register's own tightening test say a rule stricter than
the guide is a tightening and needs no row. Only an override (forbidding what the guide prescribes
or recommends) needs one. As written, W3r directs the register editor to raise a finding on the
imperative restriction, the heading bans, and every tell, on every page it grades. That is
the over-firing the register's "For reviewers" section calls a defect equal to missing, and it
would contaminate criterion 8 (J2 "draws no blocking register-editor finding").

Fold. Replace with: "a register rule that overrides the guide, forbidding a form the guide
prescribes or recommends, and has no row in the deviations section is a finding." W3r's plan
acceptance (plan line 162-164) adds: the definition states ruling 2's test in these terms.

### M3. Major: the two new rules are invisible to every check that names them

Location: spec lines 141, 166-168, 188-189, 261-265; plan lines 129-130, 149-150.

Defect. Both rules ship at `warning`, and the docs gate runs Vale at `--minAlertLevel=error`.
Criterion 7 ("raises no alert from either new rule") passes vacuously if J1's implementer proves it
with `check:docs-gate -- --page`, since the gate cannot show a warning. The W1r editor prompt's
"run Vale on the page" has the same exposure if the editor reaches for the gate or `check:vale`.
The `WATCH` counts in criterion 3 need a named command for the same reason. The fixture pair in R2
does prove each rule fires, so the rules themselves are sound; only the proofs that cite them are
at risk.

Fold. Name the command once in the spec's R2 section and reference it from criteria 3 and 7 and
from W1r: `vale --filter='.Name matches "Cairn.(Headings|ProseProcedure)"' <path>` (or plain
`vale <path>`, which takes the config's `MinAlertLevel = suggestion`). Criterion 7 names it
explicitly. The W1r editor prompt runs plain `vale <page>`, never the gate.

### M4. Major: the revert stops routing the preserved sections to the drafter and restores a dead heading

Location: spec lines 184-190; plan lines 143-151, review focus 3 at plan lines 75-76.

Defect. Reverting `79c5e23` restores prompts that read "the universal contract and the track
section", a heading that no longer exists. W1r then names only the brief section. Names, Visuals,
the track section, and the page anatomies, all preserved by ruling 16, would sit in the file with
no prompt telling the drafter to read them. That breaks the global "a rule lives where it
executes" rule and makes ruling 16's preservation nominal. Review focus 3 greps for
`docs-chain-render.mjs`, `q:` ids, and `source: guide`, and would miss the dead heading. The
revert also drops the unknown-track throw, so a misspelled `editor` for `editors` silently routes
an editor page to the developer brief.

Fold. W1r's outcome names every section each prompt reads by exact heading: the drafter reads the
track's brief, `## Names`, `## Visuals (every page that carries one)`, the track section, and
`## The page anatomies`; the editor reads those plus the deviations section. Keep W1's
unknown-track throw. W1r acceptance: each named heading exists verbatim in the register at the
time of the check, and the test covers all six track values (`editors`, `admin`, `extend`,
`reference`, `front-door`, `readme`) plus one unknown value that throws. Add "universal contract"
to review focus 3's grep list.

### M5. Major: criterion 1's "seed rows" reads as two rows, and the trim drops the Evidence column

Location: spec lines 50-51, 126-128, 247-249; plan line 61.

Defect. Ruling 10 names "two seed deviation rows (tone, sentence length)", criterion 1 checks for
"the seed rows", and the plan says "the seed rows are the spec's". The register holds four rows:
the two seeds, the 2026-07-02 first-person row, and the dormant README exclamation row. A literal
implementer satisfies criterion 1 with two rows and drops two recorded deviations, which ruling 16
forbids. Separately, R1t's new row shape (base rule, what cairn does instead, ruling, date) drops
the Evidence column. The tightening test, which R1t keeps, says a row names its evidence. The
spec contradicts itself.

Fold. Criterion 1 names the four rows by base rule. R1t's row shape keeps the Evidence column,
which GitLab's and Grafana's deviation lists do not forbid.

### m1. Minor: the 1,000-word cap can collide with ruling 16, and the spec names no precedence

Location: spec lines 122-124, 247-248.

Defect. The drafter reads only its brief section, so every ratified rule the drafter must follow
has to live inside it. The voice and tells already come to about 800 words net of specimens. The
feca3348 vendor-link rule is about 200 words, and the keystone, heading, and Diátaxis rules follow
it. The cap has no published source. When it binds, the implementer's cheapest path to green is to
compress a ratified rule, which is the defect ruling 16 exists to stop.

Fold. One sentence: "Ruling 16 governs the cap. A brief that cannot reach 1,000 words without
dropping or hollowing a ratified rule reports its count and the rules holding it there." Also
state the counting method: the brief's heading to the next `##`, less blockquotes and the exemplar
list.

### m2. Minor: the AI posture paragraph has no presence check

Location: spec lines 67-72, 250-252.

Defect. Ruling 16 names the `choose-an-ai-posture.md` lines 23-26 paragraph verbatim, but criterion
2 compares against `feca3348`, which predates the paragraph's addition. Nothing checks it
survives.

Fold. Criterion 2 adds: the paragraph appears byte-identical to `8bbe78f5` lines 23-26, whitespace
collapsed. R1t reports the `grep`.

### m3. Minor: `vale-rule-examples.mjs` has no stated behavior when it finds nothing

Location: spec lines 153-155; plan lines 129-130.

Defect. The script fails when a fail example stays clean. It does not say what happens when the
examples directory is empty, a rule has no pair, or `vale` is not on the path. An empty glob or a
missing binary exits 0 and reports a pass.

Fold. One clause: the script fails naming the cause when it finds no pair for either rule, or when
`vale` is absent or exits with an error. This is the ordinary behavior of any test runner, not a
new mechanism.

### m4. Minor: R9 cannot confirm what R3 adds later

Location: spec lines 178-179; plan lines 103-105.

Defect. R9 must confirm `docs/internal/exemplars/` is skipped "by every docs check the gate runs",
but R3 adds markdownlint afterward. R9's confirmation cannot cover it.

Fold. Move the markdownlint half into R3's acceptance: the config excludes `docs/internal/**`, and
the exemplar captures raise nothing.

### m5. Minor: criterion 8 does not say which editor read counts, and skips the new rules

Location: spec lines 264-265; plan line 240.

Defect. `docs-page-chain` runs an editor read, then one scoped redraft, then a re-read. "Draws no
blocking register-editor finding" does not say which read counts. The J2 draft is also not checked
against the two new rules, though criterion 7 checks R5 against them.

Fold. Criterion 8 reads "the chain's final editor verdict is not `fix`, and the draft raises no
alert from either new rule (M3's command)".

### m6. Minor: a rejected J1 leaves J2 built on the rejected exemplar

Location: plan lines 242-244; spec ruling 14 at line 59.

Defect. Ruling 17 makes the AI posture page J2's primary exemplar, and J2 runs before Geoff reads
J1. The plan routes a rejected J2 back to R1t, and a rejected J1 back to J1, but does not say that
a rejected J1 invalidates the J2 draft.

Fold. One clause: a rejected J1 reruns J2 after J1's fix, without a second sitting unless the J2
draft changes materially.

### m7. Minor: R6's acceptance grep omits two of the three phrases its outcome retires

Location: plan lines 174-178.

Defect. The outcome removes "friendly-but-professional" and "Lean on the cairn/stacking metaphor",
but the acceptance grep checks only "slightly academic", "no house voice", and "On top of the
Google floor".

Fold. Add both phrases to the grep.

### m8. Minor: two stale references survive the re-scope

Location: plan lines 209-216 (W6); the dotfiles `retired-phrases.txt` header.

Defect. The retired-phrase list's header names "the cairn-cms twin (the style-guide-sync plan's
R8)", which is cut. W4's acceptance "no regression, or each delta named" (plan line 197) passes on
any named regression.

Fold. W6 deletes the R8 sentence from the header. W4's acceptance reads "each named delta gets
the conductor's accept or fix ruling".

## Over-ceremony findings, ranked by cost

### c1. Minor: R2 and R3 run the full heavy-lane scripts gate

Location: plan lines 32-34.

Cost. `SCRIPTS_GATE` runs `npm run check` (svelte-check), all of `npm test`, and the
`create-cairn-site` suite for a change confined to `.vale.ini`, two YAML rules, one script, a
dev dependency, and `docs-gate.mjs`. Two heavy-lane runs per task, plus any `fix` rerun, buy no
coverage the close's full gate does not already give.

Fold. Set R2 and R3's `gate` to `npm run check:docs-gate && node --test <docs-gate unit test>`,
light lane, and let the close's full repo gate carry the rest. Low priority: correctness is
unaffected either way.

### c2. Minor: markdownlint's source is an analogy, and its yield is unmeasured

Location: spec lines 105-107, 158-161.

Cost. The source line cites "the same warning-first ratchet as GitLab's Vale rollout, applied to
markdownlint". GitLab does run `markdownlint-cli2` on its docs
(https://docs.gitlab.com/development/documentation/testing/markdownlint/), so a direct source
exists and should be cited. The spec gives no hit count for markdownlint, unlike the Vale rules. If
most stock rules have hits today, R3 lands a config that is mostly disabled. It would cost a
dependency and a gate step and enforce little.

Fold. Cite GitLab's markdownlint page directly. P3's package note adds one line: the count of
stock rules with hits today, so the conductor can see R3's yield before dispatch. No
new check.

## What holds up

- Each plan task's acceptance maps to a spec criterion or to a named review focus. R9, R6, W2r,
  W3r, W5, and W6 carry task-local greps instead, which is proportionate for their size.
- The R2 fail examples copy the exact R5 passages the rules must fire on, and criterion 7 requires
  R5 to clear them. That is a real before-and-after pairing, with no planted control.
- Owner time sits on the two criteria no script can grade: the R5 voice and the J2 comparison.
  Nothing else waits on Geoff.
- The walked-back list (spec lines 238-243) matches the leanness record's verdict table row for
  row.
