# Draft docs pass C: the extend arm (stub)

**Status:** a stub. The spec says this plan is written after pass B closes and inherits what
pass B learned (`docs/superpowers/specs/2026-09-21-draft-docs-design.md`, "Pass C"). Geoff ruled
on 2026-09-21 that the stub is written now and pass B's close fills it. The sections marked
**Filled at pass B's close** are empty on purpose; a session that finds them empty does not
execute this plan.

**Goal:** The extend arm drafted fresh by pass B's method, so the site round's extender test (a
site agent logging every read of engine source made to finish a docs-described task) runs
against pages written to the extend profile, and no site agent edits a page a drafter holds.

**Spec:** the same design spec; executors read both. Where this plan and the spec disagree, stop
and report.

**Execution mode:** the page-chain workflow `~/.claude/workflows/docs-page-chain.js` for the
page tasks, three pages in flight, as pass B ran it; Agent-tool chains for everything else.

**Token ceiling:** set at pass B's close from pass B's measured per-page cost times the page
count below, plus the readiness and close tasks. **Filled at pass B's close.**

**Worktree:** `.claude/worktrees/draft-docs-c`, branch `draft-docs-c`, off `main`. One
executor. Merged by one PR before the site round starts.

## Preconditions, verified by task 1

1. Pass B is merged on `origin/main` and `docs/STATUS.md` names its merge SHA.
2. This plan's filled sections are present and dated.
3. The site round has not started: no `site-docs/<site>-<pass>` branch exists on any consumer
   repo and no site pass plan carries a consultation line dated after pass B's merge.
4. `tool/` is quiet, and no session has asked for a quiet `main`.

## Page inventory (as of 2026-09-21; recount on the day)

Thirty-two files under `docs/extend/`. Two are per-version records maintained in place and are
not drafted: `migration-notes.md` and `upgrade-cairn.md`. `README.md` is the arm's index, read
by `check:arm-indexes`, and is drafted last. The remaining twenty-nine are drafted fresh:

`add-a-custom-admin-screen.md`, `add-an-island.md`, `add-a-second-audience.md`,
`add-cairn-to-a-sveltekit-app.md`, `animate-a-custom-screen.md`, `announce-on-publish.md`,
`architecture.md`, `auth-channel-security-model.md`, `build-a-site-by-hand.md`,
`choose-an-ai-posture.md`, `configure-rendering.md`, `content-model.md`, `data-tiers.md`,
`debug-your-site.md`, `declare-your-own-concept.md`, `define-an-adapter-and-schema.md`,
`design-your-site.md`, `enable-tidy.md`, `link-content-with-references.md`,
`migrate-existing-content.md`, `organize-your-admin-nav.md`, `render-safety.md`,
`restrict-admin-access.md`, `reuse-content-across-entries.md`, `rotate-the-github-app-key.md`,
`security-model.md`, `share-a-draft-preview.md`, `sign-in-through-your-organization.md`,
`what-the-scaffold-wrote.md`, `wire-the-delivery-surface.md`.

Anatomies from the register: task guide for most; tutorial milestone for the getting-started
pages (`add-cairn-to-a-sveltekit-app.md`, `build-a-site-by-hand.md`, `what-the-scaffold-wrote.md`);
symptom row for `debug-your-site.md`; the explanatory pages (`architecture.md`,
`content-model.md`, `data-tiers.md`, `security-model.md`, `auth-channel-security-model.md`,
`render-safety.md`) take the anatomy pass B's close assigns them. **Filled at pass B's close:**
the anatomy per page.

## Pinned pages and gates that read the arm

- `docs/extend/README.md`: `check:arm-indexes`.
- Every fenced `ts` block in the arm: `check:snippets` typechecks it against the built package;
  a site-local helper is `declare`d in the block, never skip-marked.
- Inbound links from the admin arm, the reference arm, `why-cairn.md`, and the root `README.md`
  into `docs/extend/`: task 1 lists them; a rename adds a `LEGACY_PATH_MAP` row.
- `docs/extend/what-the-scaffold-wrote.md` is linked from the scaffolder's output; task 1
  records the print site.
- **Filled at pass B's close:** any further reader found during pass B.

## Global constraints

Those of pass B's plan, with the extend profile from the register's "The extend track" section
in place of the admin profile, the tutorial-milestone anatomy allowed, and no terminal ceiling
(the extender has full tool use). A drafter never opens the old page; only the mining read does.
Commands and code blocks come from the manifests; a code block the manifest lacks is written
against the built package and proved by `check:snippets`.

## Tasks

1. Pre-flight and the current-state record (as pass B's task 1, for this arm).
2. The extend profile check: does the register's extend section need an amendment after pass B
   (**Filled at pass B's close**: yes or no, and what).
3. Mining, per page, one file, one Opus ratification.
4 to N. The page chains, grouped by dependency (the getting-started pages first, `README.md`
   last), three in flight. **Filled at pass B's close:** the groups and each page's brief.
N+1. The pass-end read.
N+2. Close: changelog, friction triage, ROADMAP, HISTORY, STATUS naming the site round as the
   next step, the cairn-pub handoff, and the score.

## What pass B's close must write here

- The measured per-page cost and the ceiling.
- The exemplar for the arm's first page (a calibration specimen the register names, or the
  ruling that none exists and the first accepted page becomes it).
- The anatomy per page and the page groups.
- Any drafter, grader, or fact-read prompt change pass B made to the workflow's args.
- Every stall-log ruling from pass B that generalizes past the admin ceiling.

## Ledger

Written by the conductor at each segment boundary.
