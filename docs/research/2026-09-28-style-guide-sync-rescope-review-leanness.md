# Style-guide sync re-scope: leanness review

Date: 2026-09-28. Lens: leanness (what to cut, what is invented). Targets at `e0d5f954`: the spec
`docs/superpowers/specs/2026-09-28-style-guide-sync-design.md` and the plan
`docs/superpowers/plans/2026-09-28-style-guide-sync.md`. Ruling 16 (the register's voice,
specimens, Names, anatomies, and deviations) is out of this lens's reach; every finding below
touches machinery only.

**Verdict.** The re-scope is mostly lean. It cut the first design's worst machinery and kept the
real-page measurement. Four mechanisms still cost more than they catch, one spec claim is false in
a way that forces new code, and two acceptance bars need rewording before they can be met.

Counts: 0 blockers, 6 major, 5 minor, 2 owner forks (inside the counts). Estimated saving: about
1.5M to 2.3M of the 6M ceiling.

## Verified evidence this review rests on

- **`vale test` exists in Vale 3.23.0.** `vale --version` prints `3.23.0` (Homebrew bottle, the
  CI pin's version). `vale --help` lists `--coverage` as "With `vale test`", and `vale test --help`
  prints "Run the test cases kept beside a configuration's rules." A scratch style proved it end
  to end: `Rule.test.yml` beside `Rule.yml`, each case a `name`, an `input`, and `contains:`
  (string) or `absent:` (list). Two passing cases exit 0; a case edited to fail prints the alert
  and exits 1. The command is absent from the `Commands:` list in `--help` and from vale.sh's docs
  (upstream issue vale-cli/vale#1122 still discusses the design), so treat it as undocumented but
  shipped.
- **Stock markdownlint on the published arms** (`markdownlint-cli2` defaults, over `docs/admin`,
  `docs/editors`, `docs/extend`, `docs/reference`, `docs/why-cairn.md`, `README.md`): MD013 7,203;
  MD060 130; MD033 40; MD040 20; MD004 3; MD038 2; MD024 2; MD034 1; MD032 1. Zero hits on MD001,
  MD025, MD055, MD056, MD058, the rules the audit (S7, S10) named.
- **Sources fetched.** GitLab's Vale page says "add the rule at a `warning` level ... When the
  issues are fixed, promote the rule to an `error`" and says nothing about rule tests. Elastic's
  `vale-rules` repo runs `rule-tests/run_rule_tests.py` over every rule. Spectro Cloud: "a pass and
  failure scenario test case" per rule, for shared packages. Elastic's contributor Vale page says
  only "Issues are reported in the form of errors, warnings, and suggestions"; no tier policy and
  no demotion-with-rationale. GitLab's markdownlint page describes inline disable tags only, no
  disable-then-re-enable ratchet. Anthropic's prompting page: "Include 3–5 examples for best
  results." Grafana's Writers' Toolkit extends Google and keeps a short "AI quick reference" page,
  a direct precedent for R1t's short supplement.
- **Costs.** `docs/HISTORY.md:676`: "A contract page costs about 900K tokens through the page
  chain", and "Three rounds per page was the shape that converged." The developer brief today is
  2,300 words (register lines 60-266, 26 `q:` markers); the editor brief is 1,240.

## Findings

### M1. Use `vale test`; cut `vale-rule-examples.mjs` (major)

- **Location:** spec :94-95, :153-156, :254; plan :122-130.
- **Cut:** the new script, its docs-gate wiring, its unit test, and the "edited clean" failure
  demonstration. If rule examples stay, they are two `.test.yml` files beside the two rules and one
  `vale test .vale/styles/Cairn/Headings.test.yml ...` line in the docs gate (no `--coverage`: the
  seven existing Cairn rules have no cases).
- **Evidence:** the spec's correction ("Vale 3.23.0 has no `vale test` command") is itself wrong;
  see the verified evidence above. The script re-implements a native command, which ruling 15
  forbids.
- **Knock-on:** with no `.mjs` change, R2 touches only `.vale.ini`, YAML, and the vocabulary. It can
  drop from `engine-logic` on the heavy `SCRIPTS_GATE` lane to the `docs` class, which removes one
  full `npm run check && npm test` run.
- **Leaner still (optional):** GitLab, the closest single-repo analogue, keeps no rule tests. The
  two fail examples are real pages, so the R2 report can show the alerts once on
  `choose-an-ai-posture.md:99-103` and `rotate-the-github-app-key.md:99-102`, and J1's criterion 7
  already proves the pass side on the rewritten page.
- **Saving:** about 0.25M to 0.35M.

### M2. Defer R3, markdownlint, to the arm stages (major, OWNER FORK)

- **Location:** spec :105-107, :158-161, criterion 4 (:256-257); plan :88-91 (P3), :132-137 (R3),
  close :263-265.
- **Cut:** R3 and P3 from this pass. Keep the ROADMAP item so the first arm stage that rewrites
  pages adopts stock markdownlint with a clean start.
- **Evidence:** the design disables every rule with hits on today's tree. The stock run above puts
  nine rules in that set. Every rule left enabled has zero hits, so the gate catches nothing on any
  page this pass touches. The audit's measured structural defects (heading after heading, 18;
  table with no introductory sentence, 25) are not stock rules and the re-scope rightly cut their
  custom forms. The "same ratchet applied to markdownlint" source bullet (:105-107) is an
  extrapolation: GitLab's markdownlint page describes no such ratchet. GitLab does run markdownlint,
  so a named team uses the tool; nothing names a team adopting it disabled-to-zero on a frozen tree.
- **Why a fork:** STATUS listed "stock markdownlint" in the ruled stack. If Geoff meant it as a
  stack member rather than a this-pass task, deferral honours the ruling.
- **Recommendation:** defer. The ruling asks for a proven system, and this setup catches nothing
  until a stage fixes pages anyway.
- **Saving:** about 0.35M to 0.45M (P3, an `engine-logic` task on the heavy lane, a new
  dependency's `dependency-upgrade` survey, one diff read).

### M3. "Every quotation byte for byte" contradicts the trim (major)

- **Location:** spec :129-132 and criterion 2 (:250-252); plan :116.
- **Simplify:** reword to "every quotation that remains is verbatim," and let the base-guide
  quotations go with the restating prose they support. The plain sources list keeps the links.
- **Evidence:** ruling 16 and R1t both say prose restating the base guide shrinks. The developer
  brief's 26 guide quotations are that restatement. Read literally, "every quotation byte for byte"
  keeps all of them. The rule then fights the 1,000-word cap and leaves the brief restating the
  guide. An implementer who reads it literally ships a brief that fails the trim's purpose; one
  who reads it loosely fails criterion 2. Either way, R1t (an `opus` task) re-dispatches.
- **Saving:** one R1t re-dispatch avoided, about 0.2M.

### M4. Criterion 8 asks J2 for zero blocking register-editor findings (major)

- **Location:** spec criterion 8 (:264-265); plan :240.
- **Simplify:** J2 passes when the chain completes and the draft passes the docs gate on its
  branch. The register editor's open findings go in the report, and Geoff's read is the verdict.
- **Evidence:** `HISTORY.md:676-679` records that the register editor's bar "rises on each read"
  and that pages converged at three rounds. The chain allows one scoped redraft. A bar the one-run
  chain has not reached before invites extra rounds under the ceiling. That is the reset's failure
  mode: a bar set before checking it is reachable (`HISTORY.md:283-288`). The measurement the pass
  wants is Geoff's side-by-side read, which this bar does not add to.
- **Saving:** 0.5M to 1M of unplanned extra rounds avoided.

### M5. Fold J4 into R1t's diff read (major)

- **Location:** spec :233-234, criterion 9 (:266); plan :246-250.
- **Cut:** J4's separate `claude-opus-5-5` grader of the disposition list, and the
  `cairn-register-editor` read of the register itself. Criterion 2 becomes an R1t acceptance item
  that R1t's `diff-reviewer` (already `claude-opus-5-5`, already reading the diff against the
  task's criteria) grades.
- **Evidence:** the disposition list is Geoff's constraint and stays. Grading it twice with the
  same model at the same bar adds no independent signal. The register editor is built to grade
  published prose against the register. Pointing it at the register grades the rulebook against
  itself, and no source names that practice. J2's draft and Geoff's sitting already test whether
  the trimmed register lands, which is the measured form of the same question.
- **Saving:** about 0.4M to 0.5M (two fresh reads of an 11,000-word document, one fold dispatch, one
  re-read).

### M6. Replace J5, the W7 infra read, with a grep at close (major)

- **Location:** spec W7 (:217-220), criterion 10 (:267); plan J5 (:252-257).
- **Simplify:** close step 2 runs one `grep` over the dotfiles and repo for `docs-chain-render`,
  `q:` ids, `source: guide`, and the W6 phrases (review focus 3's check, already in the plan at
  :75-76), plus the existing retired-phrase scanner. Drop the fresh-reader verdict per file.
- **Evidence:** W7 is marked "Unchanged" from the first design. Its judgment half ("restates no rule
  of its own") is the sanctioned-copy parity concern that the re-scope cut (:238-243). Its
  mechanical half is what the grep and the scanner already catch. No named team runs a
  per-file LLM routing audit at pass end.
- **Saving:** about 0.3M to 0.5M (one Opus read across 15 to 25 files, plus one fix dispatch per
  repo).

### m1. Move W4's infra-sweep hygiene to the infra sweep (minor)

- **Location:** spec :202-207; plan :182-198.
- **Cut from W4:** DC-28's edits to `technical-doc-go.md`, `commit-and-pr.md`, and
  `agent-facing.md` (a missing Go repo, a linter line, measures sections) and AW-24's tell and
  em-dash dedup across the output style, the skill, and `CLAUDE.md`. Keep ruling 12, the
  cairn-docs routing, the numbered-procedure exemplars, PS-07, and DC-27, which this pass needs.
- **Evidence:** the infra audit (`~/.claude/docs/record/2026-09-28-claude-infra-audit.md:243-245,
  280`) files DC-28 and AW-24 under its own sweep and its parity work. They reached W4 by adjacency,
  since W4 already opened those files. That is the "accretion by adjacency" failure mode in the
  global rules.
- **Saving:** about 0.15M to 0.25M, and a smaller W4 diff and evals delta.

### m2. Fold W6 into W5 (minor)

- **Location:** plan :209-216.
- **Simplify:** the nine-line append to `retired-phrases.txt` rides W5's commit and chain turn.
  The scanner and its test already exist, as the spec says.
- **Saving:** about 0.08M (one implementer, reviewer, and gate turn).

### m3. Correct or drop three source bullets (minor)

- **Location:** spec :89-90, :103-107, :145-146.
- **Simplify:** drop the Elastic tiers bullet. The fetched page does not say it, and no kept
  mechanism uses tiers or demotion (GitLab's warning-then-error covers the one that does). The
  CC BY 4.0 bullet is a license, not a practice; label it a license note. Call the 77 and 52 counts
  "heuristic, uncalibrated" as the audit does (`...-audit.md:231`), not "measured hits";
  criterion 3's `WATCH` count records the real number.
- **Saving:** none in tokens; it keeps G4 honest.

### m4. Bound the J2 reopen loop (minor)

- **Location:** plan :243-244.
- **Simplify:** a rejected J2 draft reopens R1t's voice section and exemplar list once. A second
  rejection stops the pass and writes STATUS.
- **Evidence:** as written, the loop has no exit short of the ceiling.
- **Saving:** caps the downside rather than saving expected tokens.

### m5. Lower the ceiling to about 4.5M (minor, OWNER FORK)

- **Location:** spec ruling 20 (:81); plan :27-29.
- **Evidence:** the per-task estimate below puts the plan as written at about 5.3M to 6.1M. With
  M1, M2, and M4 to M6 applied, it drops to about 3.6M to 4.2M. A 6M ceiling for that scope is
  headroom, and "a grant is not headroom."
- **Recommendation:** 4.5M, with 80% (3.6M) as the checkpoint.

## Lean as written (no change)

- **Runner and segments.** Eleven tasks across two repos with disjoint files meet the global
  CLAUDE.md trigger for the workflow runner (six or more tasks, or tasks marked independent). The
  gate block (plan :31-44) is the runner's required configuration, not ritual.
- **Pre-flight P0, P1, P2.** P0 is the one-executor rule. P1 finishes R2p's unfinished review in
  about 0.05M. P2 is a cheap `haiku` check on a plan that cites many line numbers. P3 goes with M2.
- **R9 captures.** The Microsoft capture is ruling 18. The two Google captures bring the developer
  brief to four exemplars, inside Anthropic's 3-to-5 range; without them it would hold two.
- **R1t's 1,000-word cap.** Reachable: the brief is 2,300 words today, most of it quotations and
  restating prose. Grafana's AI quick reference is the precedent.
- **The two custom rules at warning, the vocabulary entries, and the `WATCH` counts.** Each rule
  answers a defect the audit found on real pages. The vocabulary entries matter because W1r hands
  Vale's output to the register editor, and false positives would pollute that checklist input.
- **W1r, W2r, W3r, W5.** Reverts and small rewordings, each the direct walk-back of invented
  machinery.
- **J1, J2 itself, and Geoff's one sitting.** J2 is the only measurement that the system writes a
  better page, and it runs once on a throwaway branch.

## Per-task cost (rough, subagent tokens)

| Task | As planned | After cuts | Note |
|---|---|---|---|
| P0-P2 | 0.1M | 0.1M | |
| P3 | 0.05M | 0 | M2 |
| R9 | 0.15M | 0.15M | |
| R1t (opus) | 0.45M | 0.5M | absorbs criterion 2's grade (M5) |
| R2 | 0.5M | 0.2M | M1; `docs` lane |
| R3 | 0.35M | 0 | M2 |
| R6 | 0.15M | 0.15M | |
| W1r | 0.3M | 0.3M | |
| W2r, W3r | 0.2M | 0.2M | |
| W4 | 0.5M | 0.3M | m1 |
| W5 + W6 | 0.2M | 0.12M | m2 |
| Boundaries, conductor | 0.3M | 0.25M | |
| J1 (opus) | 0.3M | 0.3M | |
| J2 | 0.9M-1.5M+ | 0.9M-1.2M | M4 removes the extra-rounds tail |
| J4 | 0.45M | 0 | M5 |
| J5 | 0.4M | 0.03M | M6: a grep |
| Close | 0.3M | 0.25M | |
| **Total** | **about 5.3M-6.1M** | **about 3.6M-4.2M** | |

The tasks whose cost exceeds what they catch are R3 (catches zero hits by construction), J4's
second grader (duplicates the diff read), J5 (duplicates a grep), and the R2 script (duplicates a
native command).

## Question 2: the conventional version, and the deltas

The conventional adoption (GitLab, Grafana) runs one `.vale.ini` on the stock package, keeps a
short house page that names the base guide and lists departures, and adds a custom rule at warning
that is promoted once its hits are fixed. Page fixes happen in ordinary merge requests. Deltas in
the re-scope:

1. **Rule tests.** Elastic and Spectro Cloud keep them for shared packages; GitLab keeps none. If
   kept, `vale test` is the native form (M1).
2. **markdownlint.** Conventional teams run it, but they do not adopt it with every hit-bearing rule
   off on a frozen tree (M2).
3. **Agent chain, exemplars, and register editor.** No docs team's style-guide adoption includes
   these. They exist because cairn drafts with agents, and the re-scope sources each to Anthropic's
   guidance and the checklist-critique papers. This is the one justified delta.
4. **Review ritual.** J4 and J5 have no counterpart in the conventional method (M5, M6).
5. **Proof run.** J2 has no direct counterpart either. It is the real-page check the reset's lesson
   demands, so it earns its place.
