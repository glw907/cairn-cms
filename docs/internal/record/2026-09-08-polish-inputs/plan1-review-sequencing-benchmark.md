# Plan one review: sequencing, blast radius, benchmark

Adversarial review of `~/.dotfiles/docs/superpowers/plans/2026-09-08-docs-standard-claude-infra.md`
(the Claude infrastructure pass, plan one of three). Three lenses only: sequencing against plan
two's preflight, blast radius into `~/.claude` while other repos' sessions are live, and the
cadence measures against published readability and style instruments. Read-only; nothing was
edited. Every state claim below was checked against the live tree on 2026-09-08.

## State verified at review time

| Claim | Verified |
|---|---|
| `~/.dotfiles` working tree clean | yes, `git status --short` empty |
| Plan one already committed | yes, `6fbc776`, so task 0's second deliverable is already done |
| tellgrader home and gate | confirmed: `claude/.claude/skills/writing-voice/evals/tellgrader/`, `check: vet lint test` |
| `scripts/check.sh` does not run it | confirmed: five `run` lines, none Go |
| `~/.dotfiles/claude/.claude/CLAUDE.md` | 23,995 bytes |
| `~/Projects/cairn-cms/CLAUDE.md` | 24,136 bytes |
| cairn-cms `main` | `4888b720`, not the `d565ab77` plan two anchored to |
| cairn-cms live executors | yes: `npm test` in `identity-seam`, `npm run check` in `chassis-b`, workerd under `chassis-a` and `chassis-b` |
| tellgrader callers | `settings.json` PostToolUse hook, `prose-voice-reviewer.md`, `register-check/SKILL.md`, `writing-voice/SKILL.md`, `evals/README.md`. No Makefile in `~/Projects` calls it |

---

## Ranked findings

### 1. Task 4 breaks live agent dispatches in every repo the moment it lands (blast radius, blocking)

`claude/.claude/agents/` is a stow package reaching `~/.claude/agents/` by symlink, so an edit to
the stow source is live in every session on the machine at the next dispatch. Task 4 adds to
`prose-voice-reviewer` and `cairn-register-editor` that each **"must refuse to grade without a
corpus entry"**, and to `diff-reviewer` that it runs the scanner on `docs/**/*.md` diffs.

Three of those four are dispatched by other passes today. `diff-reviewer` is the per-task reviewer
in every repo's chain, named in cairn-cms's `CLAUDE.md` and in the workstation "Conducting a pass"
rule. `cairn-register-editor` is invoked by the `register-check` skill. `prose-voice-reviewer` is
invoked by the `writing-voice` skill. Right now cairn-cms has three worktrees with two live gate
runs in them; dubplate has its own lanes. Every one of those dispatches passes no corpus entry,
because the corpus does not exist yet: plan two's chain C builds it and C5 approves it. A refusal
rule shipped before the corpus exists turns a working reviewer into a reviewer that refuses.

The plan states no risk here at all. Its risk list covers the hinged-pair definition, the two-repo
crossing, the placeholder bands, and stow invisibility. The live-agent surface is absent.

**Fix (task 4).** Make the refusal conditional on the corpus existing, not unconditional: "when the
dispatch names a corpus entry, grade against it and cite it; when it names none and
`docs/internal/corpus/manifest.md` exists with an approved row for the page's type, name the missing
entry as a blocker; otherwise grade as today." Add an acceptance criterion that a dispatch carrying
no corpus entry still returns a report today, and re-tighten the rule to unconditional refusal in
plan two's chain C, in the same task that lands the approved manifest. Same treatment for
`diff-reviewer`'s scanner step: it must degrade to today's behavior when `tellgrader` is absent or
the profile does not resolve, not error.

### 2. Nothing creates `.tellgrader.json` in cairn-cms, so the profile never turns on (sequencing, blocking)

Plan one's handoff item 3 asserts: "Plan two's first task adds that file to `~/Projects/cairn-cms`
and proves both halves of item 2 against the real repo." It does not. A grep for `tellgrader` across
plan two returns four hits, all prose: the header, the ruled-inputs decision-7 line, the global
constraint, and P1 step 1. **No task in plan two creates `.tellgrader.json`, and P1 only verifies.**
The opt-in file is the sole mechanism by which the profile ever fires without an explicit flag, so
as the two plans stand the docs-register profile is dead on arrival in the repo it was built for.

**Fix (task 8, and plan two P1).** Delete the false claim from plan one's handoff item 3 and replace
it with the file's exact content and path, `~/Projects/cairn-cms/.tellgrader.json`. Add a step 4 to
plan two's P1 that creates it and proves both halves of item 2 against the real repo, or hand it to
plan one's task 6 as the one other cairn-cms file it already crosses into.

### 3. The handoff document has no path in plan two, so P1 cannot open it (sequencing)

Plan one task 8 creates
`~/.dotfiles/docs/superpowers/plans/2026-09-08-docs-standard-claude-infra-handoff.md` and calls it
"the pass's product for plan two." Plan two's P1 Interfaces says only "Consumes: plan one's own
record of what it landed," naming no path, and P1's acceptance criteria demand "the command or path
that proved it present" for each of three items. P1 therefore has to rediscover nine commands that
already exist, written down, one directory away.

**Fix (plan two P1, and plan one task 8 acceptance criterion 3).** Name the absolute path in plan
two's Global constraints and in P1's Consumes list, and change P1 step 1 to "run every command in
that document's items 1 through 8 and record each result." Plan one task 8's third criterion should
require the same path be pasted into `docs/STATUS.md`, which it already does.

### 4. P1 checks three of plan one's eight shipped outputs; five ship unverified (sequencing)

P1 verifies the profile flag plus a readable bands file, the Vale hook change, and the two skills.
Plan one's own handoff enumerates nine items. The five P1 does not check are: the four review agents
(item 6), the gate wiring in `check.sh` (item 8), the fixtures proving off-on-site-content (item 2's
second half, against cairn's real tree rather than testdata), the three band files as a set
(P1 says "its per-audience bands file" singular; three ship), and item 9's outstanding CLAUDE.md
debt. Item 6 matters most, because finding 1 makes the agents the highest-risk half of plan one and
plan two dispatches `diff-reviewer` on every task in every chain.

By name, the three P1 does check are all genuinely delivered, so this is under-coverage rather than
a mismatch. One wording slip: P1 calls them "the two changed skills," but `cairn-figure` is created,
not changed.

**Fix (plan two P1).** Fold plan one's nine items in wholesale rather than restating three. It costs
P1 nothing; the commands are pre-run and pasted.

### 5. Task 6's own stand-down guard is unsatisfiable, so its blocked half can never run (sequencing)

Task 6's note says: check `pgrep -f /var/home/glw907/Projects/cairn-cms` for a live executor, and
"if one is live, stand down and report." That pattern matches every workerd process, every vitest
fork, and every `npm run check` in every worktree under `.claude/worktrees/`. It matched sixteen
processes at review time, including a `workerd` under `.claude/worktrees/chassis-a`, a worktree
`git worktree list` no longer reports. The guard as written is permanently tripped.

The collision the guard is aimed at does not exist: cairn-cms's warm uncommitted set is
`.github/workflows/test.yml`, `package.json`, `docs/extend/assets/`, `scripts/figures/`,
`docs/internal/site-figures.{md,svg}`, and two record files. `CLAUDE.md` is in none of them, and no
worktree branch modifies it either, so the edit conflicts with nothing on merge.

**Fix (task 6 notes).** Replace the coarse pgrep with the specific test: `git -C
~/Projects/cairn-cms status --short CLAUDE.md` is empty, and no worktree branch's `git diff
main --name-only` names `CLAUDE.md`. Both pass today. Keep the one-executor rule for anything
touching source; `CLAUDE.md` is not contended.

### 6. Half-landed plan one leaves three live surfaces changed with no flag and no rollback (blast radius)

`~/.claude` is live, so a pass that stops between tasks leaves partial state in every project on the
machine. Ranked by reach:

- **Task 2's output style is always on.** `output-styles/writing-voice.md` loads into every session
  in every repo. Three added prohibitions land globally the instant the file is written. This is
  low-harm (three bullets in an existing list) but it is the fastest-reaching change in the pass and
  the plan never says so.
- **Task 4's agents,** finding 1.
- **The `tellgrader --hook` PostToolUse entry fires on every file save in every project**
  (`settings.json` line 81, `timeout: 10`). Task 7 reinstalls the binary. The plan says "do not
  touch `posthook.go`'s register routing" and asserts nothing "blocks a hook," but it never states
  whether hook-mode output is byte-identical, and it adds no test for it. If profile resolution ever
  reaches `posthook.Run`, every save in an opted-in repo starts walking the tree for
  `.tellgrader.json` inside a 10-second advisory hook.

There is no feature flag and no per-task rollback note anywhere in the plan.

**Fix (Global constraints).** Add one constraint: "Every task that writes under `claude/.claude/`
changes live behavior in every project on this machine at the moment of the write. Name in the task
report what a session in another repo sees differently, and state the one-line revert." Add to task
1's acceptance criteria a criterion 9: a golden test asserting `tellgrader --hook` output is
byte-identical before and after, over a fixture in an opted-in tree.

A related trap worth one line in task 1's notes: `~/.claude/...` is a symlink path, so an upward
walk from a file opened through it terminates at `$HOME` without ever entering `~/.dotfiles`. A
`.tellgrader.json` committed in the dotfiles repo will not apply to files edited via `~/.claude`.

### 7. The two measures land in three files with two definitions and two unit conventions (benchmark, correctness)

Plan one's band file uses fractions: `"hinged_pair_share": { "low": 0.20, "high": 0.45 }`, and its
new `Report` fields are floats "in `[0,1]`". The reference implementation it names,
`cairn-cms/scripts/checks/measure-prose.mjs`, emits **integer percentages**: `hingePct: n ?
Math.round((100 * hinge) / n) : 0`. Plan two's corpus manifest (C1, C4) is filled from
`measure-prose.mjs --json`, so its `hinged pairs` column carries `31`, while `docs.json` carries
`0.20`. A reviewer's measurement table (plan two line 1514) sits between them.

The definitions differ too, in three ways that move the number:

1. **Sentence splitters.** `measure-prose.mjs` splits on `(?<=[.!?])\s+(?=[A-Z"'(\`])` and **drops
   sentences under three words**. tellgrader's `splitSentences` splits on `[.!?]+(?:\s+|$)` and drops
   nothing. Plan one instructs reuse of tellgrader's splitter "so the sentence denominator matches
   the cadence CV," which is right for tellgrader and guarantees a different denominator from the
   manifest. The spec's own evidence says a splitter change moves a track figure by 17 points.
2. **Selector.** `measure-prose.mjs` reports two sets, `all` and `prose` (list items excluded), with
   materially different numbers. Plan one specifies neither.
3. **Hinge rule.** `measure-prose.mjs` carries a serial-list exclusion: a `, and` preceded by
   another comma is a list item, not a hinge. Plan one's prose definition ("a comma plus a
   coordinator") omits it.

**Fix (task 1).** Pick one unit and state it in the interface block; fractions are the better choice
for JSON. Then add an acceptance criterion 10: over three shared fixtures, the Go implementation and
`measure-prose.mjs` agree within a stated tolerance, with the selector (`prose`) and the serial-list
exclusion named. If they cannot be made to agree, say so in the doc comment and give the two numbers
different names, so no manifest row is ever compared against a band computed differently.

### 8. Recording the bands in a committed file is the one thing the banked benchmark told this program not to do (benchmark)

The banked report's finding 6 is direct: keep the corpus, keep the report-only posture, and **"drop
the hinged-pair share from the corpus manifest's recorded numbers and keep it in the scanner's
report only. Recording an unsound number in a manifest that later units draft against gives it an
authority the spec elsewhere denies it."** Plan one goes the other way three times over: `docs.json`
records `low`/`high` bands, task 2 writes the same numbers into four voice files under a stable
heading plan three's drafters open, and plan two's manifest adds a `hinged pairs` column. The
measure whose definition the spec records as having "moved twice," each move "changed the numbers by
more than the width of the human band," gets a committed band with a floor and a ceiling.

Owner decision 7 ratified only the **home** for the measures, not finding 6's manifest
recommendation, so this is an unresolved review recommendation rather than a violated ruling. It is
still the largest unforced deviation in the pass, and it is cheap to avoid: everything the standard
needs works with the measure reported and unbanded.

**Fix (tasks 1 and 2).** Ship `hinged_pair_share` and `short_sentence_share` as report fields with
no band. Keep `avg_sentence_words` banded if a band is wanted at all, since that one has fifty years
of published instruments behind it. If the bands stay, add the sentence the plan already promises
for the voice files to the band JSON itself, as a `"gating": "never"` key, so the file cannot be read
as a threshold by a later tool.

### 9. The measures are correctly bespoke; the surrounding scaffolding is not (benchmark)

The field's instruments and whether one should be adopted instead:

| Instrument | What it measures | Can it carry the two measures |
|---|---|---|
| `Microsoft.SentenceLength` (Vale) | Sentences over 30 words, at warning | No. Length only, no clause structure |
| `Vale.Readability` | Flesch-Kincaid, Gunning Fog, Coleman-Liau, SMOG, ARI, LIX | No. Vale's readability extension point takes a fixed metric set and a grade threshold; there is no user-defined metric |
| Vale `existence`/`occurrence` styles | Regex counts per file | Partly. A hinge regex is expressible; a **share over a sentence denominator** is not, since Vale has no per-file ratio primitive |
| textstat (Python) | The same classical readability formulas plus syllable and word statistics | No. Same family, no clause-joining measure |
| Hemingway | Sentences flagged long or very long, adverbs, passives, hard words | No, and it is a hosted product with no scriptable gate |
| proselint | ~30 opinionated usage checks from named style manuals | No. Match-based, no cadence measurement, unmaintained since 2020 |

**Nothing in the field measures clause-joining share.** The banked report says the same ("No program
in the survey measures clause-joining cadence at all"). So the bespoke scanner is the right home for
the two measures, and finding 8 above is about the band file, not about the scanner.

Where the plan does diverge from the field without needing to is the **band file**. Vale's readability
threshold is one line in `.vale.ini`; Red Hat and GitLab each carry their advisory number as a
single value in the config that already exists. Plan one adds a new directory
(`~/.claude/docs/voice/bands/`), a per-register JSON file, a schema, a `--bands-dir` override flag, a
loader, and a missing-file tolerance path, to hold six numbers that no gate reads. That is heavier
than any comparable, and the numbers are placeholders until plan two's C4 measures them.

**Fix (tasks 1 and 2).** Collapse the band directory into the voice files, which task 2 already
edits and which are the artifact a drafter opens. If the scanner must echo a band, read it from a
single `~/.claude/docs/voice/bands.json` keyed by register: one file, one loader, no `--bands-dir`
flag, three fewer files, and task 2 loses a deliverable. Keep `--profile`; drop `--bands-dir`.

### 10. `.tellgrader.json` discovery is conventional; its `paths` array is not (benchmark)

The discovery half is right and matches the field. EditorConfig walks up from the file until a
`root = true`; markdownlint walks up from the linted file to the nearest `.markdownlint.json`; Vale
walks up to the nearest `.vale.ini`, which is exactly what this repo's own `vale-hook` does in
`config_root()`. Plan one's "walk up from the scanned file's directory to the nearest
`.tellgrader.json`, stopping at `$HOME` or `/`" is that convention, and a dotfile at the repo root is
the right shape.

The `paths` array is not conventional. All three comparables scope by **glob sections inside the
config** (`[docs/**/*.md]`, `[*.md]`), never by a prefix-list field, and every one of them supports
multiple configs down the tree with nearest-wins. Two consequences: a prefix list cannot express
"docs but not `docs/internal`," which cairn's own `.vale.ini` needs and already has as five override
sections; and there is no `root = true` terminator, so a `.tellgrader.json` anywhere above a repo
silently governs it.

**Fix (task 1).** Keep the walk. Replace `"paths": ["docs/"]` with glob sections in the shape
`.vale.ini` already uses, or at minimum accept globs rather than prefixes in the array and add a
`"root": true` key with the EditorConfig semantics. State in the interface block that the nearest
file wins and higher ones are not merged.

### 11. Task 1 acceptance criterion 7 cannot be run as written (correctness, minor)

"Prove it: `tellgrader --register docs <any existing fixture>` produces the same `findings` array
and the same exit code **as before the change**." There is no captured baseline, and by the time the
criterion runs the binary has changed. As stated it is unfalsifiable.

**Fix (task 1).** Capture the baseline first: `git stash` is wrong here, so have the task's first
step run the pre-change binary over `internal/tellscan/testdata` and commit the output as
`testdata/golden/pre-profile.json`, then assert byte equality of the `findings` and `counts` keys
after. That also gives finding 6's hook-mode golden a home.

### 12. Task 0 is already done (sequencing, trivial)

Plan one is committed at `6fbc776`, whose `--name-only` is the plan file alone, so task 0's
acceptance criterion is satisfied and its second deliverable is spent. Its first deliverable, the
coordination check, is real and still worth running. Restate task 0 as the coordination check alone,
deliverables 1.

---

## Where the pass splits if it runs past 1.2M

The plan names no cut point. It should, because the ceiling is tight: eight dispatched tasks, one of
them a Go change with four fixtures and a golden, one a Python test suite, and one a hand-off
document requiring every command to be run and its output pasted.

**The cut is task 6, whole, and it is a clean one.** Task 6 is already blocked on the owner, its
blocked half is already deferred past this pass, and nothing in plan two touches either `CLAUDE.md`.
Cutting it removes a two-repo crossing, a blocked half, an owner sitting, and the byte-budget
arithmetic from a pass whose product is a hand-off. Its natural home is the same sitting that
carries plan two's C5 corpus approval and H12's unverified list; decision 7 already batches the
CLAUDE.md pick with the corpus approval, so the sitting exists.

Task 7's dependency line reads "tasks 1 through 6 accepted (task 6's unblocked half is enough)," so
task 7 already runs without task 6's edits. Removing task 6 leaves 0, 1, 2, 3, 4, 5, 7, 8 with no
other edge to repair, and task 7's HISTORY entry carries the byte-budget finding either way.

Second cut, if one is still needed: tasks 2 and 5 are the two lowest-risk, lowest-coupling tasks
(three bullets in the output style, three JSON files, one new skill, one skill section). Neither is
verified by plan two's P1 beyond the skill's existence. They can follow in a small pass without
blocking plan two, provided task 5's `cairn-figure` still lands, since P1 gates on it.

---

## Verdict

**Revise before dispatch.** The pass is well researched, its three pre-writing findings are real and
correctly corrected, and its scanner design is the right answer to a measure no published instrument
carries. Two findings are blocking and neither is expensive to fix:

- **Finding 1**, the unconditional refusal rule in `prose-voice-reviewer` and `cairn-register-editor`,
  which ships into `~/.claude` live and breaks concurrent dispatches in cairn-cms and dubplate before
  the corpus that satisfies it exists.
- **Finding 2**, the missing `.tellgrader.json`, which neither plan creates, leaving the profile
  unreachable in the repo it was built for.

Three more should be taken before task 1 dispatches, since they are cheap now and structural later:
the unit and definition split between the Go measures and `measure-prose.mjs` (finding 7), the band
file the banked benchmark advised against and that is heavier than any comparable (findings 8 and 9),
and the unrunnable no-regression criterion (finding 11). The sequencing gaps (findings 3, 4) are
edits to plan two's P1 and cost nothing. Name task 6 as the cut point in the plan header.
