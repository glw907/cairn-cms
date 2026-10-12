# Draft docs stage 2b, part 2: the page plans (plan format v1)

**Goal.** Write 11 page plans in drafter's plan format v1, ready for drafter to draft from once its
Pass 0 merges. Ten plans cover the extend pages engine pass B re-armed. The eleventh covers "Using
Claude Code with cairn", the first page of the new `claude-code` arm. No page prose is written.

**Design.** Approved by Geoff in chat on 2026-10-12, with unattended execution approved. There is no
separate spec, since the design fits on a page. It is restated here in the "Rulings" section.

**Review.** Mechanics lens: `docs/superpowers/research/2026-10-12-2b-part2-plans-review-mechanics.md`.
The fold record is at its end. Every correctness finding is folded below.

**Pass class.** `ordinary`, since every path is under `docs/`. The pass merges its own PR once the
whole-branch review accepts and the "Found, not done" list is empty. Otherwise the PR goes to Geoff's
desk.

**Launch state.** The plan, the executor prompt, and the conductor prompt land on `main` as a
hand-over before launch. The executor's worktree branches from `main`'s HEAD, so it holds all three.

## Rulings (Geoff, 2026-10-12)

- Scope is the 11 plans. Out of scope:
  - drafting any page
  - registering the `claude-code` arm in the gates (`ARM_NAMES` and the rest; that lands with the
    page's drafting, along with the arm's track entry in `docs-register.md`)
  - the relink and `LEGACY_PATH_MAP` repoints
  - reference-arm corrections
  - the final arm index
  - outline deletion
  - the outline crossLinks item
  - the consistency read
  - the boundary test
  - 2b's close, including the `docs-friction-log.md` triage
  - every edit to `docs-page-chain.js` or `scripts/docs-review/embed.mjs`
- Each plan is rebuilt fresh from its inputs, never converted from the old `.plan.md` (the
  rebuild-not-edit rule). The old `.plan.md` stays on disk, because the chain and the docs review
  page still read it. After Pass 0 merges, the chain's YAML mode reads the `.plan.md` as its prior
  plan and deletes it once the `.plan.yaml` is written.
- Plans follow `~/.local/share/drafter/plan-format-v1.md` exactly. When Pass 0 merges, the
  reference becomes `~/Projects/drafter/docs/plan-format.md`. Read the sheet whole before any task.
  - Every prose field is a `|` block or a quoted string, and every fact id is quoted.
  - A `link` target and a disposition `reference` resolve from the directory of `page.path`, never
    from the plan file's directory, so write each target the way the page's own link would be
    written.
  - `page.type` is the outline's `pageType`, verbatim.
- Format feedback goes to the `drafter-conductor` session. Geoff: "any direct experience you have
  with the format will be helpful"; "This is live collaborative development, so provide liberal
  input. In balance, more input is better than less."
  - Send freely: friction, a workaround you used, a field that would have helped, or a rule that's
    merely unclear. drafter-conductor filters, and findings that hold up go into Pass 0 itself.
  - Each finding names the page, quotes the plan excerpt it hit, and says what was needed.
  - The session sends one batched message as each pair returns, and logs it in the pass record. A
    finding that would change a plan still in flight goes out immediately.
  - Until drafter-conductor confirms a change, a missing field becomes a `constraints` entry in the
    plan.
- Settled before launch (don't resend):
  - The planning session's first batch was folded into the sheet (Geoff approved). The sheet now
    has section `level`, a `failure` with no `from` plus `cause`, the `code` and `figure` kinds,
    `use` on `fact`, and `facts` on `sentence`. It states that items run in prose order, that
    `preconditions` holds the tokens while "Before you begin" describes them (a reader action there
    is a `step`), and that exemplars and crossLinks stay out of the plan.
  - Two findings were rejected: no unused-`produces` warning, and no `rework` block. Carry each
    re-arm change set as a `constraints` entry.
  - The `page.type` vocabulary and the empty-file refusal were sent at review time.
- The sheet changes mid-run as amendments land. A pair already in flight can't be edited, so the
  session re-syncs after each pair returns:
  1. Re-read the sheet.
  2. Update `check-plan-lite`.
  3. Bring every merged plan into line before dispatching the next pair.

  T13 re-checks all 11 plans against the sheet as it stands then.
- Standing answers:
  - An estimate overrun up to 1,000 task-minutes proceeds without stopping.
  - A plan that needs a fact the container lacks or cannot place (wrong tag) gets a `friction`
    entry and proceeds. It never invents the fact.
- `drafter check-plan` is not installed. T0's script stands in until Pass 0 merges. Then the
  conductor runs the real validator on all 11 plans.

**Deviations from pass-core, stated.**
- Pair worktrees skip the cairn-pass setup command. They write only YAML and load `yaml` and
  `loadFactIndex` from the session worktree by absolute path.
- The session merges each pair without pushing and pushes once at T15, so CI runs once. That's
  enough for a docs-only diff.

## Inputs every page task reads

Pre-extract these for each author dispatch. Agents start with zero context.

- The format sheet, as it stands at dispatch.
- `$SCRATCH/method.md`, rendered at T0: the planning method and the plan-read criteria.
- The page's outline entry: `docs/internal/outlines/extend.json`, `pages[]` by `slug`. Read `job`,
  `pageType`, `covers`, `outOfScope`, `exemplars`, `factIds`, `figure`, `figureNote`, and
  `absorbs`, plus the top-level `crossLinks` entries whose `from` is the slug. The page's own
  `rearms` field is inbound-link work owned by other files and is not this input. For the Claude
  Code page, read `docs/internal/outlines/claude-code.json` (lane F).
- The page's re-arm entry: `docs/internal/record/harvest/relink.json`, the one `"stage": "2b"` entry
  whose `file` is the page and that carries `facts` (`context`, `done`, `facts`). Its fact ids join
  the outline's.
- From `docs/internal/docs-register.md`, found by heading, never by line number:
  - "## The page anatomies", for the page type
  - "## Drafting brief: developer docs", whole (Structure, Voice, The introduction, Exemplars,
    Tells)
  - "## Names"
  - "### The extend track", the reader profile. The Claude Code page uses it as its baseline too
    (see lane F).
- Each fact bullet, read from the index that `loadFactIndex` builds (T0), never by hand-parsing tags.
  Only a fact tagged `[verified]`, `[external]`, or `[vendor]` may be placed. The review counted
  three that must be cut: one `[rejected]` in scaffolded-site-files, one `[rejected]` in
  rotate-the-github-app-key, and one `[docs-drift]` in debug-your-site.
- The outline's exemplars, each at `~/.local/share/cairn/exemplars/<source>page.md`, read for anatomy
  only.
- Context only, never copied: the current page under `docs/extend/`, the old
  `docs/internal/briefs/extend/<slug>.plan.md`, and `<slug>.framing.md` where it exists.

Every planning dispatch carries pass-core's two prompting samples verbatim.

## Tasks

Each page task writes one file and nothing else. Page agents never edit `docs/internal/facts/` or
`docs/internal/docs-friction-log.md`. Each reports any fact correction it needs (the id, what is
wrong, and the evidence with `path:line`), and T13 applies them all serially. Friction goes only into
the plan's YAML `friction` field. That keeps every pair's files disjoint.

### T0. Setup, the stand-in check, and the method file (ordinary, 30 min)

Run `EnterWorktree` on branch `draft-docs-2b-part2-plans`, then the cairn-pass setup command. Set
`SCRATCH=$HOME/.cache/cairn-2b-part2`, an absolute path every pair can read. Nothing in it is
committed.

Write `$SCRATCH/check-plan-lite.mjs`. It loads `yaml` with
`createRequire('<session worktree>/package.json')('yaml')`, since an ESM bare import from the
scratch directory fails. It imports `loadFactIndex` from
`<session worktree>/scripts/checks/check-provenance.mjs` by absolute path and passes it the absolute
facts directory. It reports every fault, not just the first:
- `YAML.parseDocument`: refuse any `doc.errors` (`DUPLICATE_KEY`, `MULTIPLE_DOCS`) and null contents
  (an empty file)
- only the known top-level and per-kind fields, with the required ones present
- unique item ids
- each `from`, when present, names a step, and each `handledBy` names an item
- no fact both placed and disposed
- each `canFail: true` step is the `from` of some `failure` item
- `requires` reader state
- each placed or disposed fact, including `sentence.facts`, resolves to one bullet, and each placed
  fact carries an allowed tag
- relative `link` and `code.source` targets exist, resolved from `page.path`'s directory. A target
  listed as a `pages[].path` in any `docs/internal/outlines/*.json` (the pattern of
  `scripts/checks/docs-links.mjs` `outlinePagePaths`) gets a warning instead.
- no `Scalar.type === 'PLAIN'` on a prose field, list items in `constraints` and `friction`
  included (walk with `YAML.visit`). Also flag an unquoted `fact:` value.

Anchor checks are skipped.

Render `$SCRATCH/method.md` from the chain (`~/.dotfiles/claude/.claude/workflows/docs-page-chain.js`).
Take the static method text of `function planPrompt` and the plan-mode criteria of
`function structurePrompt`, with the constants (`GOOGLE_LARGE_DOCS`, `PRIOR_ART`, `common`, and the
rest) substituted as literal text. Add an explicit list of the chain-only instructions to ignore:
- writing `<slug>.plan.md`
- `check-provenance --extract`
- returning a claim inventory
- "Commit nothing"
- the friction-log edit `frictionLine` asks for

Keep the core: the plan is Google's outline written down, the plan argues its order
(`orderReason`), and it never follows `covers` as an inventory.

**Acceptance:**
- The script passes on the sheet's own example, with the fact check and the link check both stubbed.
- It fails on each seeded fault: a duplicate id, an unquoted ` # ` inside a `constraints` list item,
  a bad `handledBy`, an empty file, a placed `[rejected]` fact (one of rotate-the-github-app-key's
  ids), and a made-up fact id.
- `method.md` contains no `${`.

### Lane F: the Claude Code outline and plan (ordinary, 40 + 60 min)

Lane F starts alongside pair A. It has two steps, in order.

**T1. The outline.** Write `docs/internal/outlines/claude-code.json`:
- top-level `"arm": "claude-code"`, `"track": "claude-code"`, and `pages`, with no `index`
  (`cairn-docs-outline link` then skips it, harmlessly)
- one page: slug `using-claude-code-with-cairn`, path
  `docs/claude-code/using-claude-code-with-cairn.md`, title "Using Claude Code with cairn",
  `figure: false`
- `job`: name the reader as the extend track's developer working with Claude Code
- `pageType`: one of the register's anatomies
- `covers`, `outOfScope`, and `exemplars`, picked from `~/.local/share/cairn/exemplars/` with a
  `take` line each

Sources are the ROADMAP entry "The Claude Code arm: a small docs stage right after 2b" and its facts:
`f:0ygumq`, `f:pmmtrm`, `f:7ozknm`, `f:o7bkm0`, `f:6ro1n9`, `f:dy5cfj`, `f:4ax489`, `f:jd54ph`,
`f:4h9fz4`, `f:5ohm23`, `f:4nccq6`. Add any further placeable fact on the review agent or the
guidance tree to `factIds`. The page documents Claude Code only (`f:pmmtrm`).

**Acceptance:**
- valid JSON
- every fact id resolves to one bullet
- `covers` includes the guidance tree, the four skills and when each loads, the review agent, the
  `Stop` hook snippet, and `cairn-guidance install` and `check` with their exit codes and the CI
  step

**T12. The plan.** The plan goes to `docs/internal/briefs/claude-code/using-claude-code-with-cairn.plan.yaml`,
written as one page task (below). The missing claude-code track entry in the register goes into the
plan's `friction` field.

### T2 to T11. One plan per extend page (ordinary, 60 min each)

Each page task runs these steps:
1. One author dispatch (Opus 5.5, `high`) writes the plan.
2. One plan-read dispatch (Opus 5.5, `medium`, using `method.md`'s plan-read criteria) returns
   blocking and non-blocking findings.
3. One fold by the author addresses the blocking findings.
4. `check-plan-lite` runs until clean.
5. `node scripts/checks/check-leaks.mjs` runs, since it scans `briefs/` and `outlines/`.

The author returns its fact corrections and format findings.

| Task | Page | Plan file (under `docs/internal/`) | Pair |
|---|---|---|---|
| T2 | architecture | `briefs/extend/architecture.plan.yaml` | A |
| T3 | scaffolded-site-files | `briefs/extend/scaffolded-site-files.plan.yaml` | A |
| T4 | add-cairn-to-a-sveltekit-app | `briefs/extend/add-cairn-to-a-sveltekit-app.plan.yaml` | B |
| T5 | add-a-custom-admin-screen | `briefs/extend/add-a-custom-admin-screen.plan.yaml` | B |
| T6 | security-model | `briefs/extend/security-model.plan.yaml` | C |
| T7 | restrict-admin-access | `briefs/extend/restrict-admin-access.plan.yaml` | C |
| T8 | replace-magic-links-with-cloudflare-access | `briefs/extend/replace-magic-links-with-cloudflare-access.plan.yaml` | D |
| T9 | add-a-second-sign-in-group | `briefs/extend/add-a-second-sign-in-group.plan.yaml` | D |
| T10 | debug-your-site | `briefs/extend/debug-your-site.plan.yaml` | E |
| T11 | rotate-the-github-app-key | `briefs/extend/rotate-the-github-app-key.plan.yaml` | E |

How a pair runs:
- Run its two tasks as two Agent-tool subagents (`sonnet`, `medium`) with `isolation: "worktree"`
  after the session commits, per pass-core "Pairs".
- Each pair subagent makes the author, read, and fold dispatches itself, in the foreground, since a
  background nested subagent isn't waited on. It commits and never pushes.
- Lane F runs as a third subagent beside pair A.

Page-specific constraints for authors:
- Every page: the re-arm entry's `done` text names what changed. Carry it as a `constraints` entry,
  and make sure the sections place its facts.
- The general docs assume no coding assistant (`docs-register.md`, the "never assume Claude" rule).
  No extend plan teaches working with Claude Code. The register allows one exception: a page may
  name an agent-specific file in one line that labels the tool and links the dedicated doc.
- scaffolded-site-files: the guidance-tree section it once had moves to the Claude Code page. Under
  that exception, plan at most one `link` item to `../claude-code/using-claude-code-with-cairn.md`,
  with no facts.
- add-cairn-to-a-sveltekit-app: part 1 carried two items here. The tutorial imports `#lib/...`
  without a `package.json` subpath import, and it never mentions the root `+layout.svelte`. Fold
  both into the plan if the facts support them. Otherwise file a `friction` entry.
- `step` items (with `requires`, `produces`, and `canFail`) and step-linked `failure` items apply
  to task guides and the tutorial. debug-your-site's symptom rows are `failure` items with no
  `from`, each with `cause`. Concept pages use steps only where the page walks a sequence. Use H3
  sections (`level: 3`) wherever the page needs them.
- The large pages (security-model, add-a-custom-admin-screen, add-cairn: 100 or more dispositions
  each) may run past 60 minutes. The standing ceiling covers that.

**Acceptance (each, T12 included):**
- `check-plan-lite` is clean.
- `check-leaks` is clean.
- The plan read has no open blocking finding.
- Every outline and re-arm fact id is placed or disposed, with a `reason` on each disposition.

### T13. Fact corrections and the re-check (ordinary, 30 min)

Apply every correction T2 to T12 reported. If any plan places one of the part 1 drift items, fix it
too: `f:hsk70g` (quoted line), `f:x84fah` (range), and `f:smbsa6` and `f:zyjzeg` (line numbers). Fix
a Source pointer only against the code. Re-sync to the current sheet, or to
`~/Projects/drafter/docs/plan-format.md` if Pass 0 has merged. Re-run `check-plan-lite` over all 11
plans.

**Acceptance:** the fast lane passes, including `check:facts`, and all 11 plans are clean.

### T15. Record and close (ordinary, 60 min)

1. Write `docs/superpowers/research/2026-10-12-2b-part2-plans-record.md`:
   - for each plan: its file, section count, placed and disposed fact counts, and the plan read's
     verdict
   - every format finding, with the date it was sent to drafter-conductor
   - any amendment applied mid-run

   Send anything unsent.
2. Push to `glw907/cairn-cms` and open a draft PR. Run `ci-green` in the background.
3. Run the whole-branch `diff-reviewer`, then one batched fix chain if needed.
4. Update `docs/STATUS.md` in the present tense:
   - the plans exist
   - they await `drafter check-plan` after Pass 0 merges, which the conductor runs
   - the drafting run retires the `.plan.md` files, registers the `claude-code` arm, and adds its
     register track entry
   - 2b's close still owns the friction-log triage
5. Add a ROADMAP entry under "Stage 2b part 2" for teaching `embed.mjs` `planPathFor` to read
   `.plan.yaml`.
6. Write the PR body: what landed, the score, and "Found, not done" with a disposition on each item.
7. If that list is empty and CI is green, merge with `gh pr merge <n> --merge` and pull the main
   checkout per pass-core. Otherwise hand the PR to the desk with
   `review-desk pr glw907/cairn-cms "<title>" <n>`, wait, and merge only on Geoff's approve with
   `--match-head-commit`.

**Acceptance:** the record exists with every finding shown as sent, the PR is merged or on the desk,
and STATUS is current.

**Total:** 30 + 40 + 11 × 60 + 30 + 60 = 820 task-minutes, against a design estimate of about 700
and a standing ceiling of 1,000.
