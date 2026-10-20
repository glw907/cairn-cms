# Draft docs pass 0+1 plan: prose and claims review

Reviewer: `prose-voice-reviewer` (Opus 5.5), plan at `f334a30a`. Not register-graded (plan).
Citations spot-checked and accurate (pass-execute, flags_test, check-provenance lines, package.json,
docs-register, facts README, ROADMAP, memories, task 5's 20 anchors, task 10's 29 pages and word
counts, artifact.d.ts and comments.d.ts quotes, CI triggers).

- **B1 (plan:450).** Task 11 records cost against "8M"; the header ceiling is about 9.6M. Fold:
  "against the about 9.6M ceiling and the about 7.7M planned spend".
- **W1 (plan:8-9).** "Stop on disagreement" trips on task 10's intended departures (read-only
  readers with per-batch apply, section splits, report-only contract content). Fold: name the
  intended departures in the header.
- **W2 (plan:192-204).** "Subcommand position" undefined; `cairn help agents` fails the stated
  rule; positional arguments ambiguous. Fold: define it as the first word after the matched path,
  only when that command has subcommands; `help` takes a command path or root help topic.
- **W3 (plan:54-55).** "Never STATUS until task 11" contradicts tasks 1 and 9. Fold: the ledger
  rule governs conductor writes; tasks 1 and 9 make their named STATUS edits.
- **W4 (plan:48-50, 284-285, 454-455).** Segment B CI check names no commit and no push. Fold:
  conductor pushes and records `gh pr checks` for the head SHA; name who pushes before the merge.
- **W5 (plan:122-128).** Task 1 could delete the `[candidate]` rule at `facts/README.md:86`. Fold:
  drop only the frozen-prose reason.
- **W6 (plan:305, 331).** Drafter's profile input and v2 description unaddressed. Fold: drop the
  reset profile-file input and v2 description; a register track profile arrives only inside
  page-inputs output.
- **W7 (plan:304).** `args.gate` placeholders lack a substitution rule. Fold: the runner
  substitutes `{page}` and `{brief}` per page; the derivation test covers it.
- **W8 (plan:420-426).** Section split and batch size read two ways. Fold: chunks of whole H2
  sections near 5K words (about 37 agents); a batch is up to six pages with a split page's chunks
  together.
- S1: cite the fold record for the 4.5M stage 1 figure. S2: headroom about 1.3M. S3: correct the
  CI trigger wording. S4: task 3 not accepted until `check:symbols` is green. S5: define
  `<pre-proof>` and name step 3's apply target (the proof branch). S6: name the derivation
  function's return shape. S7: each task 10 apply batch gets a `diff-reviewer` read.
