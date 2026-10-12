# Overnight run: pre-2b docs tooling, then stage 2b's new pages

Design for Geoff's approval, 2026-10-11. Risk class: `runner` (the tooling task touches
`scripts/checks/**` and the dotfiles chain), so neither PR merges without Geoff's read.

## Outcome

By morning, two things are ready for Geoff's read:

1. **The pre-2b tooling pass** (ROADMAP "Docs tooling before stage 2b", items 1 to 9 and 12),
   as a cairn-cms PR (the `check:*` scripts and `docs-register.md`) and a workstation PR (the
   `docs-page-chain.js` plan, structural, and register prompts). Items 10 (tellgrader in CI) and
   11 (the unreproduced "gate vanished") move to Later.
2. **Stage 2b part 1**: the committed 2b plan, plus the 14 new extend pages drafted through
   `docs-page-chain` and closed per 2a's precedent (targeted close, hand-run seats for plan-read
   escalations). They go on a branch stacked on the tooling branch, as a draft PR.

## Out of scope tonight

The 10 fact re-arms of drafted pages, the 32 link restorations and `LEGACY_PATH_MAP` repoints,
the reference-arm corrections, the final arm index, the outline deletion, the boundary test, and
2b's close all go to part 2, the next run. Also out: any merge, any release, and the claude-code
arm.

## Method calls (mine, flagged where contestable)

- **Sequence.** One planning session (this one, Opus at high) writes the tooling plan and the 2b
  plan, then runs the tooling pass, and launches the 2b executor only once the tooling PRs are
  green. 2b drafts against the fixed tools, which is the point of fixing them first.
- **Framing A/B** (ROADMAP item (c)). Run it on the first page only, with both intros kept in the
  stage record. The run proceeds on `xhigh`; Geoff judges "matches" at the morning read.
  *Contestable*: Geoff may prefer to skip the A/B.
- **Guards.** `/loop` wake-up, `claude-wf-guard` at the writer tier, `TMPDIR` under `~/.cache`,
  and the lid-switch hold if the lid may close.
- **Stop rule.** The session stops at the token ceiling, at a clock stop, or on a CI red, and
  STATUS carries the exact resume line. It notifies at normal urgency.

## End-to-end check

`npm run check:docs-gate` passes on every drafted page, `ci-green` is green on both PR heads, and
the tooling PR's fixtures show each listed defect caught.

## Estimate

Tooling pass about 180 minutes. 2b part 1 about 360 minutes: 2a's R5 took about 4 hours for 5
pages including the closes, and the fixed tools should cut the escalations. Tokens about 40M:
14 pages at 2a's 2.3M, plus about 8M for the tooling.
