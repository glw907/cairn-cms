# The draft docs: design

Geoff ruled each point below on 2026-09-21, in one brainstorm with the docs conductor. The draft
docs are working drafts of the admin arm, the Go `cairn` tool's contract pages, and the extend
arm, written fresh from the facts container before the site round. The site round tests and edits
them. The full 2026-09-08 docs standard waits for the rebuild that follows the round.

This spec covers the whole initiative. The plan beside it
(`docs/superpowers/plans/2026-09-21-draft-docs-pass-1.md`) covers pass 1 only. Pass 2's plan is
written after pass 1 closes.

## Where this sits

The order of work, as ruled:

1. The Go tool's 1.0: the `tool/v1.0.0` tag, the release, and B2's merge.
2. The doctor retirement, its own pass, conducted by a fresh tool session.
3. The one engine cut, `0.97.0`.
4. The docs chore that updates the narrative-arm freeze and the site-agent rule.
5. The docs-infra currency pass, whole
   (`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`).
6. Draft docs pass 1, then pass 2.
7. The site round, then one improvement release, then the docs rebuild.

Docs-infra precedes the drafts because its Task 3 re-syncs the Vale packages, which adds five
Google rules, and its Task 1b moves the docs-governing sections of `CLAUDE.md` into
`.claude/rules/`. Drafting first would mean a second Vale triage on every new page.

Geoff is the only reader today. A page on `main` may describe `cairn` ahead of what has shipped.
Publication to cairn.pub is what stays bound to released versions, and it happens at the
improvement release. One practical constraint remains: the retirement lands before the site
round, because site agents run the commands a page prints.

## Rulings this design rests on

- **Working drafts.** Pages are written fresh under the gates that exist today, plus a register
  read and a fact read. No brief files, no page-type templates, no `check:anatomy`, no
  `check:provenance`, no reader sittings. The 2026-09-08 toolset pass never ran, and this
  initiative does not build it.
- **The CLI is assumed.** Docs may assume the operator has `cairn` installed. The tool is woven
  into the admin track's existing jobs. No separate tool section exists anywhere.
- **The doctor retires into `cairn` before `0.97.0`.** The drafts are written once, around
  `cairn` alone, and never teach `npx cairn-doctor`.
- **The admin reader works alone.** That reader installs the binary, mints and stores the read
  tokens, and schedules the run, each from written per-platform steps.
- **A scripter-or-agent reader exists.** The contract pages in `docs/reference/` are graded
  against a short profile of their own. No agent track is added, and `cairn help agents` stays
  the agent's primary surface.
- **Schemas stay beside the code.** The JSON Schema files move to `tool/schema/`. The reference
  page links to their `$id` URLs under `https://cairn.pub/schema/`, which freeze with the 1.0
  tag. `tool/README.md` stays as a short landing page for pkg.go.dev and GitHub.
- **One calibration read.** Geoff reads the first page through the chain and no other.

## Scope

### Pass 1

1. **Profiles.** Amend the admin profile in
   `docs/internal/record/2026-08-14-audience-profiles.md` and its summary in
   `docs/internal/docs-register.md`. The setup spine gains `cairn`. The ranked jobs gain
   installing the tool, setting up its credentials, checking the site, and scheduling a run.
   Token, permission, credential, and scheduled run become defined-on-use terms. Exit code and
   `--json` stay out of the admin track. Add the scripter-or-agent profile: anyone automating
   against `cairn`, arriving from `cairn help agents`, a `--json` help line, or an admin page's
   link; full technical vocabulary; success is branching on every exit code and parsing every
   payload without running the tool to find out.
2. **The admin arm**, drafted fresh, about ten pages. Install precedes scaffold in the
   getting-started pages, because `create-cairn-site` calls `cairn` once the doctor is gone.
   Credentials with `cairn auth check`, and the scheduled run, are new pages woven into the
   arm's order. `is-it-working.md` is written around the one tool. The scheduled run is framed as
   optional, with its outcome stated first. Pages say plainly that the Windows path is tested in
   CI and not yet verified by a person in a terminal.
3. **The tool's contract pages** in `docs/reference/`: exit codes and JSON output. They follow
   the reference arm's register and the new profile. The engine's `docs/reference/log-events.md`
   stays the one log vocabulary page. Links run from admin pages to reference pages and never
   back.
4. **The tool-docs handoff.** The public `tool/docs/` originals are deleted: `credentials.md`,
   `tripwire.md`, and `reference/exit-codes.md`, `reference/json-output.md`, and
   `reference/log-events.md`. The schemas move to `tool/schema/`.
   `tool/docs/release-candidate-notes.md`, `tool/docs/adr/`, and `tool/docs/design/` stay. The Go
   half belongs to the tool session: a docs base URL constant, the help strings and fix lines
   repointed at cairn.pub, the drift tests' paths moved, the help goldens recut, and the README
   trimmed. It ships in whichever tool tag follows the drafts' merge.
5. **Facts.** Every claim on a drafted page traces to a bullet in `docs/internal/facts/`. A claim
   with no bullet is filed with its source or cut.

### Pass 2

The extend arm, drafted fresh by the same method. `docs/extend/migration-notes.md` and
`docs/extend/upgrade-cairn.md` are per-version records and are maintained in place.

### Out of scope

The editors arm, the front door, and `docs/why-cairn.md` stay as they are until the rebuild. The
site round cannot test them, since a site agent never acts as an editor or an evaluator. The
reference arm's engine pages stay maintained in place. The evaluator's full profile waits for the
front-door stage of the rebuild.

## Boundaries with the doctor retirement

The retirement is not this initiative's work. Its inputs are
`docs/internal/record/2026-09-21-doctor-retirement-inventory.md` and
`~/.cache/cairn-tool-b2/doctor-retirement-sizing.md`. Its close is the only writer of "the
`0.97.0` cut is unblocked".

This initiative hands that session three things.

- **The published pages must stay true at the cut.** `0.97.0` ships before any draft exists, so
  its tarball publishes today's arms with the doctor bin removed. The retirement pass fixes every
  page that prints a doctor command, as mechanical fixes in place. Pass 1 later replaces the
  admin pages wholesale.
- **Install precedes scaffold.** The scaffolder's behaviour when `cairn` is absent decides what
  `before-you-start.md` and `create-your-site.md` say.
- **The admin arm is briefed from the retirement's spec.** Pass 1 needs the local action's name,
  its result words, and its credential story. It needs the spec committed, not the pass merged.

## Pinned pages

A rebuilt page keeps its file path and every heading slug that code, a gate, or the tool resolves.
A rename adds a row to the redirect map in `scripts/checks/docs-links.mjs` and updates whatever
read the old path, named in the plan. The known pins:

- `docs/admin/is-it-working.md`: about twenty `docsAnchor` values in
  `src/lib/diagnostics/conditions.ts`, the tool's fix-line anchors in
  `tool/internal/health/fixes.go` (a Go test resolves each against the file), the runtime URL base
  in `tool/internal/render/layout.go`, and `check:readiness`.
- Each arm's `README.md`, read by `check:arm-indexes`. A new page must be linked from its index.
- `docs/editors/when-something-goes-wrong.md`, read by `check:editor-quotes`. Out of scope, named
  so nobody moves it.
- The tool's drift tests read `exit-codes.md` and `json-output.md` by relative path, which is why
  the Go half of the handoff moves with the pages.

## How a page gets made

**Mining, once per arm.** Before any brief is final, one read compares each old page against the
arm's container file and lists every claim the container lacks. Each is filed as a sourced bullet
or dropped with a reason. This is the control against fact loss.

**The brief.** Briefs live in the plan. Each names the reader's job, the page anatomy from the
register, the container bullets it draws on, the pinned path and slugs, the pages it links to, and
what it must not cover.

**The drafter** receives the brief, the track's profile, the register's universal contract and
track section, one exemplar page, and the named bullets. It never opens the old page. It never
sources a claim from `tool/docs/` prose. A hole it finds is filed as a bullet against code on
`main`.

**Commands and transcripts.** Every command is copyable as printed and traces to a recorded run.
`cairn` output is captured once, from real runs against real sites, as transcript fixtures.
Drafters embed fixtures and never type output by hand.

**The chain, per page.**

1. A Sonnet drafter writes the page at its final path.
2. The existing gates run: `check:vale`, `check:docs`, `check:arm-indexes`, `check:snippets`,
   `check:transcripts`, `check:facts`, and `check:readiness` where they apply.
3. `cairn-register-editor` on `claude-opus-5` returns ranked findings with rewrites.
4. A separate `claude-opus-5` fact read traces every claim to a bullet, and flags both a claim
   with no bullet and a named bullet the page dropped.
5. One redraft round. A second `fix` verdict goes to the conductor.

**Calibration.** `docs/admin/is-it-working.md` goes first and alone, since it carries the most
pins and the whole one-tool story. The conductor renders it in Chromium beside the old page for
Geoff's read. His findings fold into the brief shape and the drafter prompt, and then the
remaining pages fan out in parallel.

**Done, for a draft:** the gates are green, the register read is accepted, the fact read is clean,
the arm index links the page, and every retired path has its redirect row.

## What the site round inherits

Site agents may edit the drafts when they find an issue. The write path and the rule's wording
belong to the docs chore, not to this initiative. The drafts are built to be cheap to edit: no
receipts, no per-page ledger, and gates a site agent can run with one command.

## Handoffs this initiative files

- To the tool session: the Go half of the tool-docs handoff, described under Scope.
- To `cairn-pub`: a `/schema/` route serving the tool tag's schema files at their `$id` URLs.
- To `ROADMAP.md`, at pass 1's close: the full docs standard's toolset as the rebuild's
  precondition, and the evaluator profile.

## Open at the time of writing

- The retirement's design forks (the verdict for a site with no registry record, the GitHub App
  and D1 checks, the opt-in send test, the parsers, the scaffolder without the binary) are that
  session's to settle. Pass 1's briefs for the getting-started pages and `is-it-working.md` are
  finalized only after its spec commits.
- B2's close harvests the tool's operator facts into `docs/internal/facts/admin.md`. Until it
  merges, the container holds nothing about the tool.
