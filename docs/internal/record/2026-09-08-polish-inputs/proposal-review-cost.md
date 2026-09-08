# Proposal review, lens 5: implementation cost and measurement validity

Adversarial review of `docs-standard-proposal.md` revision 1 (Opus, fresh context, 2026-09-08), with Vale rule mechanics tested on both the CI-pinned 3.15.1 and the workstation 3.20.0. The main report, then the reviewer's own correction after testing a sibling agent's claim. Folded into revision 2.

---

I have what I need. The second research agent is still running, but I covered its ground empirically (and more authoritatively — I tested Vale on the CI-pinned binary and measured the packages against this corpus rather than reading issue trackers).

---

# Lens 5: Implementation cost and measurement validity

## Ranked findings

### F1 — BLOCKING. The standard's own ratified-good specimen fails the standard.

- **Line:** "The tell scanner holds the cadence… A page whose measures fall outside its band fails the gate."
- **Problem:** `docs/internal/docs-register.md:397` names one ratified-good specimen: the why-cairn opener, re-ratified 2026-09-08. I measured it under all three splitters: **100% two-beat, 67% coordinated-independent clauses, mean 27 words, longest 31.** The proposal's bands are two-beat 19–44 (best under 30) and average 15–20. The single piece of prose Geoff has ratified as good fails every proposed numeric gate, by a wide margin, under every splitter.
- **Evidence:** `front-door-prose-comparison.md` §4 says this itself — "It measures 3/3 two-beat, which confirms the metric is a locator and not a verdict. Do not touch it." The proposal then promotes the locator to a verdict without addressing the contradiction.
- **Fix:** The cadence measures ship as **advisory locators only** (warning level, never a gate exit code). Gate on the two things that are construct-valid and page-local: the per-sentence word ceiling, and the existing tell checks. If a cadence band is wanted later, it needs the sample size in F4 first.

### F2 — BLOCKING. Four incompatible sentence counters; the headline number does not reproduce under the documented method.

- **Line:** "Measured today, the extend track builds 48 percent of its sentences as comma-hinged pairs… A dozen extend pages sit between 53 and 67 percent."
- **Problem:** I re-implemented the record's documented method (`front-door-prose-comparison.md` §2: "segmented after `.!?;`", the stated two-beat regex) and ran it over all 31 extend pages. It does not reproduce.

| Splitter | pooled n | extend two-beat | pages in 53–67 | median page |
|---|---|---|---|---|
| **S1 — the record's documented method** (`.!?;`) | 1613 | **32%** | **0** | 32% |
| S2 — tellgrader's actual splitter (`.!?`, lists merged) | 1370 | **49%** | **8** | 47% |
| S3 — abbreviation-aware, list-aware | 1369 | 48% | 8 | 48% |

  The "48 percent" and "twelve pages at 53 to 67" only appear under a splitter the record does not document. Splitting on the semicolon or not moves the track number by **17 points**, larger than the entire specimen band's width.
- **Compounding:** there are now four segmenters in the proposed system, and they disagree. Vale's own `scope: sentence` (which the per-sentence ceiling would use) counts **151** over-40 sentences in extend; my S1 counts **101**, my S2 counts **153**. So a page can pass the tell-scanner gate and fail the Vale gate on the same measure. Add the human read and it is four.
- **Also:** the two-beat regex counts `;` as a pair marker, but the documented splitter has already consumed every `;` as a sentence boundary. The term is dead code under its own method. There are **830 semicolons** in the 79 published markdown files, so this is not academic.
- **Fix:** One segmenter, defined once, in one place — tellgrader — with Vale's ceiling rule declared as approximate and warning-level. Publish the segmenter's exact behavior in `docs-register.md`. Re-derive every number in the proposal against it before any of these figures drives a pass.

### F3 — BLOCKING. "Two-beat" does not measure the construct the diagnosis named.

- **Line:** "More than half its sentences were two clauses hinged on a comma."
- **Problem:** The regex `, and|, but|, so|, which|, where|, while|, then|;` fires on serial lists ("Hosting, data, media, and deploy come from one account"), on non-restrictive relative clauses, and on any semicolon. The round-2 record already admits this ("it also fires on serial-list commas, so I hand-classified a second column, **coord.**"), then the proposal reverts to the unclassified column for its headline. Measured across all 31 extend pages:

| definition | pooled | median page | max page | pages above the 44 band top |
|---|---|---|---|---|
| P1 (the record's regex) | 32% (S1) / 49% (S2) | 32 / 47 | 51 / 78 | 4 / 20 |
| **P2 (comma-coordinated independent clauses only)** | **15%** | **15%** | **29%** | **0** |
| P3 (P1 plus `because`/`since`/`although`/`that`-coordination) | 37% / 52% | — | — | — |

  On the only definition that measures "two clauses hinged on a comma," **every extend page is inside or below the human specimen band**, and the whole track sits at 15%. The 2–3x inflation is the metric, not the prose. Conversely P3 shows the regex also *misses* subordination, so it is neither specific nor sensitive.
- **Fix:** Either implement the hand-classified coordinated-independent-clause definition in code (needs a POS tagger or a finite-verb heuristic — real work, see the cost table), or drop the metric. Do not ship the regex as a gate.

### F4 — BLOCKING. The bands rest on 107 sentences and are an artifact of which five pages were fetched.

- **Line:** "Human technical writing we measured for comparison runs 19 to 44 percent, and the best of it runs under 30."
- **Evidence:** Round 1's four specimens total **45 sentences** and produce the band **23–31%**. Round 2's five specimens total **107 sentences** and produce **19–44%**. Two specimens overlap. The band's width nearly doubled from a specimen swap. 95% Wilson intervals on the round-2 specimens:

| specimen | n | share | 95% CI | width |
|---|---|---|---|---|
| RFC 9110 §1.1 | 9 | 44% | 19–73% | 54 pts |
| PostgreSQL About | 15 | 27% | 11–52% | 41 pts |
| GFS §1 | 25 | 20% | 9–39% | 30 pts |
| SQLite about | 26 | 19% | 9–38% | 29 pts |
| SQLite whentouse | 32 | 28% | 16–45% | 30 pts |

  RFC 9110, which sets the band's *entire upper bound* at 44%, has a 54-point confidence interval from nine sentences. The extend track's alleged 48% is one specimen swap away from being in-band.
- **Sample size for a defensible band:**
  - Within-register precision at p≈0.30: **n = 323 sentences per register** for a ±5-point 95% CI; n = 81 for ±10 points. The current 107 buys roughly ±9 points on the pooled estimate and nothing per-specimen.
  - That is only half the requirement. A *band* is a tolerance interval over documents, so it needs between-document variance too: with k documents the SD estimate carries about `SD/√(2(k−1))` error — **k ≥ 20 documents** before the band's endpoints stop moving on a specimen swap. So: **20+ human specimens, ≥300 sentences, per register.** Five short pages is not a band; it is five points.
- **Fix:** Report the metric as a per-page number beside the specimen scatter, with the CI printed. Do not draw a pass/fail line until the sample above exists.

### F5 — MAJOR. The short-sentence share penalizes exactly the list-heavy pages the standard wants.

- **Line:** "the share under eight words. Each register gets a band… A page whose measures fall outside its band fails the gate." Band: 0–16%.
- **Evidence:** `docs/extend/README.md`, a legitimate index page. Short share: **16% (S1) → 13% (S2) → 43% (S3, list-aware)**. Same page, same day, three splitters, a 30-point spread that straddles the band boundary three times over. The proposal's own measurement table hedges this by adding a "prose only, lists excluded" column, which is an admission that the metric is undefined until list handling is specified — and no rule in the proposal specifies it.
- I confirmed the tellgrader artifact empirically. A file with five bullets and two prose lines reports `"sentences": 3` — the entire list collapses into one blob, because `splitSentences` joins each `\n\n`-delimited paragraph with `strings.Fields` before splitting on `[.!?]` (`internal/tellscan/cadence.go:41-56`). Bullets without terminal periods become one 40-word "sentence."
- **Fix:** Define list handling in the standard before the metric exists. My recommendation: exclude list items from the cadence measures entirely and gate them on the ceiling only.

### F6 — MAJOR. There is no headroom in either `CLAUDE.md`, and both already violate two separate limits.

- **Line:** "Instructions: the global and project `CLAUDE.md`" — three new rules across both files.
- **Evidence:**

| file | words | bytes | ≈tokens | lines |
|---|---|---|---|---|
| `~/.claude/CLAUDE.md` | 3,494 | 23,995 | **5,998** | **368** |
| `cairn-cms/CLAUDE.md` | 3,418 | 24,136 | **6,034** | **341** |

  The workstation's own `claude-context-budget` hook sets `CLAUDE_MD_BUDGET=6000`. Running it now: the project file **already exits 2** ("~6034 tokens, over its 6000-token budget"). The global file has **2 tokens of headroom**. The proposal's three new rules are roughly 200 words each; adding them trips the hook on the very save that adds them.
- Anthropic's guidance, independently: "**Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence." (https://code.claude.com/docs/en/memory). Both files are **1.7–1.8×** that. And: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!" plus "If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost." (https://code.claude.com/docs/en/best-practices).
- **This is the proposal's own diagnosis turned on itself.** The front door failed despite a 368-line global CLAUDE.md containing a 400-word "Writing voice" section that already says "One idea per sentence" and "No reflexive three-item lists." Adding a fourth restatement of the same rule to a file Anthropic says is already past the dilution point is the intervention least likely to work. Anthropic's stated alternative is explicit: "For domain knowledge or workflows that are only relevant sometimes, use skills instead. Claude loads them on demand without bloating every conversation." Also note "Splitting into `@path` imports helps organization but doesn't reduce context, since imported files load at launch" — so the `@`-import escape does not exist.
- **Fix:** Put **zero** new rules in either `CLAUDE.md`. The plain-language numbers, the author-brief rule, and the co-writing protocol belong in the `writing-voice` skill and its register files under `~/.claude/docs/voice/` (3,470 words total today, on-demand, unbudgeted). If any of it must be always-on, it goes in the `writing-voice` output style (588 words), and something else comes out of `CLAUDE.md` to pay for it.

### F7 — MAJOR. Hook mode cannot fail a save. The docs are unambiguous.

- **Line:** "In hook mode the scanner reports a page outside its band as a finding, the same as any other tell. In gate mode it exits non-zero."
- **Evidence:** https://docs.claude.com/en/docs/claude-code/hooks, "Exit code 2 behavior per event": `PostToolUse` — **Can block? No** — "Shows stderr to Claude; the tool already ran." `PreToolUse` — **Yes** — "Blocks the tool call." Also: "To surface a warning to Claude from a `PostToolUse` or `PostToolUseFailure` hook, exit 2 instead so Claude sees the stderr even though the tool already ran." tellgrader's own code already knows this: `internal/posthook/posthook.go:47` — "It never asks to block."
- The proposal's phrasing is technically consistent with this (hook = report, gate = exit non-zero), so the finding is not that it is wrong but that **the enforcement it describes doesn't exist until something runs gate mode**, and nothing in the repo gate currently does. `check:vale` and `check:comments` run in CI; there is no `check:cadence`.
- A `PreToolUse` hook *can* block a save and does receive `file_path` plus `content` before the write. But whole-document measures are computable only on `Write`; an `Edit` delivers `new_string` alone, so a per-page average or band share cannot be evaluated pre-write on an edit. tellgrader already codes around exactly this (`wholeDocChecks` survive "only on a Write").
- **Fix:** Say plainly that the hook advises and CI gates. Add `check:cadence` to `package.json` and to the CI workflow beside `check:vale`, at error tier, on the ceiling only (per F1/F3). Do not attempt a `PreToolUse` blocking prose gate; it would refuse drafts mid-composition.

### F8 — MAJOR. `proselint` and `write-good` deliver 21 usable findings per 144,000 words, and neither has the rule the proposal cites as the reason to add them.

- **Line:** "The `proselint` and `write-good` packages, which Vale can vendor, catch hidden verbs, hedges, and weasel words."
- **Method:** downloaded both errata-ai/vale-cli Vale packages, ran them at `MinAlertLevel = suggestion` over all 73 published pages (144,000 words) of `docs/{admin,editors,extend,reference}`.

| rule | findings |
|---|---|
| `write-good.E-Prime` | **2,430** |
| `write-good.Passive` | 410 |
| `write-good.TooWordy` | 183 |
| `write-good.Weasel` | 37 |
| `proselint.Diacritical` | 14 |
| `write-good.ThereIs` / `proselint.Typography` / `proselint.Needless` | 7 each |
| `write-good.So` | 6 |
| `proselint.Cliches` | 6 |
| `proselint.Very` | 3 |
| `write-good.Cliches` | 2 |
| **total** | **3,112** |
| **proselint alone** | **37** |

- **Hidden verbs: not delivered.** Neither package ships a nominalization rule; I grepped both style directories. proselint's `Hedging.yml` fired **zero** times across the corpus. So the two stated justifications produce 0 and 0.
- **False positives are the majority.** `proselint.Diacritical` demands "façade" for "facade" — 14 hits, all on the design-pattern term. `proselint.Cliches` flags "for free" and "on the spot." `write-good.Weasel` flags "usually" and "several," the honest qualifications the register standard explicitly wants. `write-good.So` fired at column 87–97, i.e. mid-line, not sentence-initial. The two packages also duplicate each other (both fire `Cliches` on "on the spot" at the same offset).
- **Disable list for code-heavy docs (empirical, not guessed):** `write-good.E-Prime`, `write-good.Passive`, `write-good.TooWordy`, `write-good.Weasel`, `write-good.So`, `write-good.Cliches`, `proselint.Cliches`, `proselint.Diacritical`, `proselint.Very`. After those, **21 findings remain across 144,000 words** — `Needless` (7), `Typography` (7), `ThereIs` (7).
- **Maintenance:** the Vale ports are stale. `errata-ai/proselint` → `vale-cli/proselint`, last release **v0.3.4, 2024-06-09**; last push 2025-09-08; 2 open issues. `errata-ai/write-good` → `vale-cli/write-good`, last release **v0.4.1, 2024-06-09**; last push 2025-05-23; 2 open issues. proselint's own `meta.json` declares `"coverage": 0.0` against upstream; write-good's `meta.json` carries no name, version, author, or license at all. Upstream `amperser/proselint` is alive (v0.16.0, Nov 2025, 236 open issues); `btford/write-good` last pushed 2025-03-10, effectively dormant.
- Note the repo vendors styles and CI runs offline (`.vale.ini`, `test.yml:102-110`). Adding these means committing 220 KB and 42 rule files for 21 findings.
- **Fix:** Drop both packages. Write the three rules that matter as Cairn rules (they are `existence` one-liners) if they matter at all.

### F9 — MODERATE. Fetched specimens are non-reproducible and cost 12–25k tokens per review.

- **Line:** "The review agents grade against those same specimens… A grade with no specimen beside it does not count."
- **Cost:** the five round-1 specimen URLs extract to **8,887 words ≈ 12k tokens**; round 2 adds the GFS PDF, pushing a full set to ~20–25k tokens. At two reviewer agents per page over 73 pages that is **1.8M–3.6M tokens of pure re-fetch** — 40–80% of chassis-A's entire 4.4M subagent spend, spent on downloading the same five pages repeatedly.
- **Reproducibility is the stronger argument.** The same SQLite page, `whentouse.html`, was measured as **n=13, two-beat 23.1%** in round 1 and **n=32, two-beat 28%** in round 2, both claiming the same method. That 2.5× discrepancy in n is the fetch-and-extract step, not the prose. A band derived from re-fetched HTML is not a fixed reference.
- **Fix:** **Yes, vendor them as text files.** Commit the exact graded excerpts (the blocks already quoted in the two comparison records total ~1,200 words ≈ 1.6k tokens) to `~/.claude/docs/voice/specimens/<register>/`, each with its URL, fetch date, and precomputed measurements. A reviewer reads 1.6k tokens instead of 20k — a **12× reduction** — and every grade is against byte-identical text.

### F10 — MODERATE. The docs pass is sized by attended time, not tokens, and the proposal does not price that.

- **Line:** "It runs one page per read, the way the front door will."
- **Scope:** 73 published pages, **144,000 words** — admin 9 pages/11.4k words, editors 8/6.8k, extend 31/40.5k, reference 25/85.3k. Ceiling violations under the STE and plain-language numbers the proposal adopts:

| track | ceiling | sentences over | pages avg > 22w |
|---|---|---|---|
| admin | 20 | 164 of 523 (31%) | 0 |
| editors | 20 | 92 of 419 (22%) | 0 |
| extend | 40 | 101 of 1,613 (6%) | 6 |
| reference | 40 | 181 of 2,707 (7%) | 0 |
| **total** | | **538 sentences** | 6 |

- **Token estimate against chassis-A.** chassis-A: 4.4M subagent tokens / 12 tasks = **367k per task**, for multi-file structural code with a full build gate. A docs task is cheaper per task (no build, no e2e) but the reviewer must read the whole page plus specimens: realistically 80–120k for an implementer + `diff-reviewer` + `cairn-register-editor` chain.
  - **Extend only (31 pages, the proposal's stated first slice): ~2.5–3.7M tokens.**
  - All four tracks (73 pages): **6–9M**, i.e. above chassis-A's 7.5M ceiling.
  - Scoped to the 12 worst pages: ~1.0–1.4M.
- **The real constraint is the other budget.** chassis-A cost **zero execution sittings** — every escalate was ruled under standing authorization. "One page per read" with a human read structurally converts a 31-page slice into **31 attended sittings**, and 73 pages into 73. That is not a variant of chassis-A's cost profile; it is a different budget entirely, and it is the one the workstation rules call scarce. The proposal never names it.
- **Fix:** Split. Slice 1: the mechanical ceiling fixes (538 sentences), fully autonomous, no human read, gated by Vale — cheap in both budgets. Slice 2: human-read rewrites, capped at the 8–12 pages that fail on the *read*, not on the metric. State the attended-sitting count in the plan header beside the token ceiling.

### F11 — CONFIRMED FEASIBLE. Vale can express all three numbers, on the CI-pinned version.

I did not take this from docs; I built the rules and ran them, first on Homebrew's 3.20.0 and then on a downloaded **3.15.1**, the version `test.yml:102` pins. Both produce identical output.

- **Per-sentence ceiling** — `extends: occurrence`, which does support `scope: sentence`:
  ```yaml
  extends: occurrence
  message: "Sentence over 40 words."
  level: error
  scope: sentence
  max: 40
  token: '\b\w+\b'
  ```
- **Per-document average** — `extends: metric`, in the free OSS CLI:
  ```yaml
  extends: metric
  message: "Average sentence length is too high."
  level: warning
  formula: (words / sentences)
  condition: "> 22"
  ```
- **Readability** — `extends: readability` with `grade:` and `metrics:` (Flesch-Kincaid, Gunning Fog, and the rest). Fired correctly: `T.FK:Grade level too high (12.57).`
- **Per-track thresholds: the one wrinkle.** A `.vale.ini` section can set a rule's level or turn it off (`Rule = NO`) but **cannot override its numeric `max`**. Per-track ceilings therefore need **separate rule files** — `Cairn.Sentence20`, `Cairn.Sentence40` — with each section disabling the other. I verified this works: admin-track files produced 197 `S20` errors and 0 `S40`; extend-track files produced 151 `S40` and 0 `S20`.
- **Caveat:** Vale's segmenter is a fourth counter (see F2). Its 151 over-40 in extend against my S1's 101 is a 50% disagreement.

### F12 — MODERATE. A hook cannot know a file's destination. Feasible only with an explicit key.

- **Line:** "the Vale hook grades a draft by its destination: a file under a record directory whose name or header marks it as a draft for a published path is graded with that path's styles."
- **Evidence:** A `PostToolUse` hook receives exactly `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, `tool_name`, `tool_input`, `tool_response` (https://docs.claude.com/en/docs/claude-code/hooks, PostToolUse input). No destination. `vale-hook` selects styles purely by walking up to the nearest `.vale.ini` and matching section globs against the path relative to that root (`vale-hook:58-80`). Vale's CLI offers no "lint this content as if it were at path X."
- **Mechanism, feasible:** a front-matter key. `vale-hook` reads the first ~10 lines for `vale-as: docs/why-cairn.md`, copies the body to a temp file at that relative path under the config root, lints there, and rewrites the reported path back. ~20 lines of Python. Same shape for tellgrader with a `register:` key.
- **Better fix, zero tooling:** a draft of a published page is drafted **at its published path on a branch**, not in `docs/internal/record/`. The whole problem is self-inflicted by drafting somewhere the linter is deliberately switched off (`.vale.ini`: `[docs/internal/**] BasedOnStyles =`). Move the draft; delete the requirement.

### F13 — MINOR. Cost of the tellgrader change (the cheapest item in the proposal).

Concrete Go estimate against the current 1,251-line tree:

| file | change | lines |
|---|---|---|
| `internal/tellscan/cadence.go` | add `commaHingedShare`, `shortShare`, `meanLength`, `maxLength` | ~60 |
| `internal/tellscan/scan.go` | 5 new `Report` fields, wire into `Scan` | ~20 |
| `internal/tellscan/bands.go` (new) | band load + compare | ~80 |
| `internal/tellscan/bands.json` (new) | band file; use JSON + `go:embed`, since `go.sum` carries only cobra and adding a YAML dep for one config file is not worth it | ~30 |
| `cmd/tellgrader/root.go` | `--gate` flag, non-zero exit on out-of-band | ~15 |
| `internal/tellscan/scan_test.go` | table cases | ~80 |

**~285 lines, 2 new files, no new dependency. Small.** Then `make install` and the binary at `~/.local/bin/tellgrader` is live for the hook. Hidden-verb counting is *not* in this estimate — it needs a nominalization lexicon or a tagger and is a separate, larger piece. The Go work is the least of the proposal's problems; the bands it would enforce are the problem.

### F14 — MINOR. The decision list is numbered 1, 2, 3, **5, 4**.

In a document whose thesis is that mechanical gates miss what a read catches, and which invites the reader to test the standard on the page itself.

---

## Cost table

| # | Change | File(s) | Size | Note |
|---|---|---|---|---|
| 1 | Per-track sentence ceilings | `.vale/styles/Cairn/Sentence{20,25,40}.yml` (3 new), `.vale.ini` | **Small** | Verified working on pinned 3.15.1. Needs one file per threshold, not a config override |
| 2 | Page-average warning | `.vale/styles/Cairn/AvgSentence.yml`, `.vale.ini` | **Small** | `extends: metric`, OSS, verified |
| 3 | Vendor proselint + write-good | `.vale/styles/{proselint,write-good}/` (42 files, 220 KB), `.vale.ini` | **Medium** | Small to add, medium to tune: 9 explicit disables or 3,112 findings. **Recommend: don't** (F8) |
| 4 | tellgrader cadence measures + bands + `--gate` | `cadence.go`, `scan.go`, `root.go`, `bands.go` +`bands.json` (new), `scan_test.go` | **Small** | ~285 lines, no new dep |
| 5 | tellgrader hidden-verb count | new lexicon or tagger | **Large** | Not costed in the proposal; neither Vale package supplies it |
| 6 | Construct-valid pair metric (coordinated independent clauses) | `cadence.go` + finite-verb heuristic | **Large** | The hand-classification the record did manually |
| 7 | tellgrader "fails a save" | `~/.claude/settings.json` PreToolUse entry, new `internal/prehook/` | **Large / don't** | PostToolUse cannot block; PreToolUse can but sees no whole file on Edit (F7) |
| 8 | `check:cadence` in the repo gate | `package.json`, `.github/workflows/test.yml` | **Small** | The missing piece that makes "gate mode" real |
| 9 | vale-hook grade-by-destination | `~/.local/bin/vale-hook` + front-matter convention | **Medium** | ~20 lines; or **Zero** if drafts live at their destination path (F12) |
| 10 | First-person-claim warning hook | new `~/.local/bin/claude-claim-guard`, `settings.json` | **Small** | Advisory only |
| 11 | CLAUDE.md rule additions | `~/.claude/CLAUDE.md`, `cairn-cms/CLAUDE.md` | **Blocked** | Both at/over the 6,000-token budget hook; both 1.7× Anthropic's 200-line guidance (F6) |
| 12 | Register files gain standard + bands | `~/.claude/docs/voice/*.md` (5 files) | **Small** | On-demand, unbudgeted — the right home for #11's content |
| 13 | Vendored specimen corpus | `~/.claude/docs/voice/specimens/` (new) | **Small** | 12× token reduction per review, and makes grades reproducible (F9) |
| 14 | Review-agent dispatch + report shape | `prose-voice-reviewer.md`, `cairn-register-editor.md`, `diff-reviewer.md` | **Small** | Cheap to edit; expensive to run if specimens stay fetched |
| 15 | Skill and workflow gate strings | `writing-voice/SKILL.md`, `cairn-pass/SKILL.md`, `pass-execute.js` | **Small** | |
| 16 | Feedback memory | one memory file | **Small** | |
| 17 | **The docs pass** | 73 pages / 144k words / 538 ceiling violations | **Large** | 2.5–3.7M tokens for extend alone, 6–9M for all four tracks; **and 31–73 attended sittings against chassis-A's zero** (F10) |

---

## Verdict

The infrastructure half is mostly cheap and partly sound — Vale can express every number the proposal wants, on the exact version CI pins, and the Go change is under 300 lines — but the two numbers it would enforce do not survive contact with their own method: the extend track's headline 48% is 32% under the documented splitter and 15% under the only pair definition that measures the construct the diagnosis named, the bands rest on 107 specimen sentences with confidence intervals up to 54 points wide, and the register's single ratified-good specimen fails every proposed gate at 100% two-beat and 27 words a sentence. Three changes are not merely costly but blocked or counterproductive as written: the `CLAUDE.md` additions cannot land because both files are already at or over the workstation's own 6,000-token budget hook and nearly double Anthropic's documented 200-line ceiling, where more rules reduce adherence rather than add it; the proselint and write-good packages yield 21 usable findings per 144,000 words behind 3,112 raw ones and ship neither the hidden-verb nor the hedging detection cited as their justification; and a PostToolUse hook cannot fail a save, so "the tell scanner holds the cadence" holds nothing until a `check:cadence` exists in CI, which the proposal does not add. Ship the per-sentence ceiling as an error, the page average as a warning, the cadence measures as advisory locators printed with their confidence intervals, and vendor the specimens as text; then re-derive every number in the proposal against one named segmenter before the docs pass is scoped, and price that pass in attended sittings, because at one human read per page it costs 31 to 73 of them against chassis-A's zero.

---

The second agent's report has arrived. Most of it independently confirms what I measured, but it makes one claim that would have made my F11 wrong, so I tested it. **The claim is false on this repo's Vale, and the failure mode is worse than the limitation I originally reported.**

## Correction and strengthening of F11

The agent read Vale's docs as supporting per-section parameter overrides — `T.Long[max] = 30` — which would let one rule carry `[max] = 20` under `[docs/admin/**]` and `[max] = 40` under `[docs/extend/**]`, "no duplicate rule files needed." That is a doc reading, not a test. I ran it on both binaries, with a positive control (a 39-word sentence against a YAML `max: 30`, in two sections set to `[max] = 10` and `[max] = 60`):

| | control (no bracket keys) | with `Rule[max]` overrides |
|---|---|---|
| **Vale 3.15.1 (the CI pin)** | fires in both sections at YAML max=30 | fires in both sections at **YAML max=30** — overrides **silently ignored** |
| Vale 3.20.0 (workstation) | fires in both sections at YAML max=30 | **zero findings, exit 0** — rule **silently disabled** |

Neither version honors it. On the pinned 3.15.1 a per-track ceiling written this way applies one number everywhere and says nothing. On 3.20.0 the bracket key takes the rule out of service entirely, and the gate reports **green while enforcing nothing** — a false pass with no warning, in the one part of the proposal I had graded as sound and cheap.

Two consequences for the report I gave you:

- **F11 stands and hardens.** Separate rule files per threshold (`Cairn.Sentence20`, `Cairn.Sentence40`) with `Rule = NO` in the opposing sections is not merely the tidier route, it is the only one that works. I verified it: 197 `S20` errors on the admin track and 0 `S40`; 151 `S40` on extend and 0 `S20`.
- **It adds a new instance of F2's pattern.** Both the docs-derived shortcut here and the two-beat regex fail the same way — they produce a plausible number that nobody checks against a control. A standard whose whole premise is that ungated rules drift should not adopt a gate mechanism from a doc paragraph. Every rule in this proposal needs a positive control committed beside it: a fixture that must fire, so a silently disabled rule shows up as a failing test rather than a clean run.

Also worth noting: the agent's own answer contradicts my empirical result on the ceiling mechanism, claiming `occurrence` cannot express a word count and that `metric` with `scope: sentence` (v3.21.0+) is required. I demonstrated `occurrence` with `scope: sentence` and `token: '\b\w+\b'` working on 3.15.1. My tested result governs; and the agent's route would additionally require moving CI off its pinned version.

## Three smaller corrections to F8

The agent's maintenance data refines my numbers, and one of its predictions does not survive measurement:

- **proselint's issue tracker is disabled.** `has_issues: false`, confirmed. My "236 open issues" was a frozen historical count, not a live queue — the repo is pushed-to but has no venue to report a false positive against. That makes the package *less* maintained than I reported, not more.
- **`btford/write-good` has no GitHub release object at all** (404 on `/releases/latest`), alongside its 2025-03-10 last push.
- **`proselint.Annotations` is a latent landmine, not a current one.** The agent predicted it would "hard-misfire on this very repo's conventions docs." It ships at `level: error` on `XXX|FIXME|TODO|NOTE`, but it fired **0 times** on the corpus, and I found **zero** occurrences of those tokens across all 73 published pages. The repo's `NOTE` and six `WATCH:` markers live in `src/lib`, which Vale never sees, and the conventions docs live under `docs/internal/**`, where `BasedOnStyles` is empty. It would only bite if a future extend page quoted a code comment — real, but a future risk, and it does not add to the 21-findings-per-144k-words verdict against the packages.

The verdict is unchanged, except that its middle sentence now understates the problem: the per-track ceiling, which I called the cheap sound part, fails silently as the proposal would most naturally write it, and needs a committed must-fire fixture before it can be trusted in CI.
