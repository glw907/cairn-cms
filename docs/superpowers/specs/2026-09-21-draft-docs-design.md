# The draft docs: design

Geoff ruled each point below on 2026-09-21, in one brainstorm with the docs conductor, and
accepted the recommendations of a four-lens adversarial review of the first draft the same day
(mechanics, method, charter, and efficacy per audience). The draft docs are working drafts of the
Go `cairn` tool's contract pages, the admin arm, and the extend arm, written fresh before the
site round. The full 2026-09-08 docs standard waits for the rebuild that follows the round.

This spec covers the whole initiative, three passes. Each pass gets its own plan, written when
its preconditions hold. The first plan is `docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`.

## Where this sits

The order of work, as ruled:

1. The Go tool's 1.0: the `tool/v1.0.0` tag, the release, and B2's merge.
2. The doctor retirement's Go half (`cairn doctor`), merged without a tool tag.
3. **Pass A**, the tool's contract pages, so the `0.97.0` tarball carries them. Then one
   `tool/v1.1.0`, tagged and released carrying the Go half and pass A's repointed links, so the
   binary the release announces never names a deleted path.
4. The retirement's engine half, which removes the `cairn-doctor` bin only once that release
   exists. Its close is the only writer of "the `0.97.0` cut is unblocked", since it lands
   last. Then the one engine cut, `0.97.0`.
5. The docs chore that updates the narrative-arm freeze and the site-agent rule.
6. The docs-infra currency pass, whole
   (`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`).
7. **Pass B**, the admin arm.
8. **Pass C**, the extend arm. It closes before the site round starts, so no site agent edits a
   page a drafter holds.
9. The site round, then one improvement release, then the docs rebuild.

Docs-infra precedes passes B and C because its Task 3 re-syncs the Vale packages, which adds five
Google rules, and its Task 1b moves the docs-governing sections of `CLAUDE.md` into
`.claude/rules/`. Pass A runs before it on purpose and accepts a second Vale triage on its two or
three pages.

Pass A runs before the cut because `0.97.0` announces the CLI, and cairn.pub renders docs only
from the npm tarball. `tool/` has never been in the tarball, so without pass A the release would
announce a tool with no contract pages behind it.

Geoff is the only reader today. A page on `main` may describe `cairn` ahead of what has shipped.
Publication to cairn.pub is what stays bound to released versions.

Pass A depends on the retirement's Go half **merged**, and passes B and C on the whole
retirement merged, never on a spec. A `[verified]` fact needs the
code on `main`, and a transcript needs a real run of the released behaviour.

## Rulings this design rests on

- **Working drafts.** Pages are written fresh under the gates that exist today, plus the reads
  and tests this spec names. No brief files, no page-type templates, no `check:anatomy`, no
  `check:provenance`, no reader sittings. The 2026-09-08 toolset pass never ran, and this
  initiative does not build it.
- **The CLI is assumed.** Docs may assume the operator has `cairn` installed. The tool is woven
  into the admin track's existing jobs. No separate tool section exists anywhere.
- **The doctor retires into `cairn` before `0.97.0`.** The drafts are written once, around
  `cairn` alone, and never teach `npx cairn-doctor`.
- **The admin reader works alone.** That reader installs the binary, mints and stores the read
  tokens, and schedules the run, each from written per-platform steps. Linux, macOS, and Windows
  get equal sections. The note that the Windows path is tested in CI and not yet verified by a
  person sits on the Windows section only.
- **A scripter-or-agent reader exists.** This overturns the 2026-08-14 ruling that every track
  serves one profile and the reference arm has none (`docs/internal/docs-register.md`, "The four
  tracks" and "The reference"). The tool's contract pages in `docs/reference/` are graded against
  a short profile of their own. No agent track is added, and `cairn help agents` stays the
  agent's primary surface. The overturn is recorded in the register, in a dated note appended to
  `docs/internal/record/2026-08-14-audience-profiles.md`, and in the friction log's list of
  perspectives.
- **Schemas ship with the docs.** The JSON Schema files move to `docs/reference/schema/`, which
  the npm tarball carries, so cairn.pub can serve them verbatim at their `$id` URLs under
  `https://cairn.pub/schema/`. This reverses the same day's first ruling for `tool/schema/`:
  cairn.pub renders only the tarball and `tool/` is kept out of it. The Go tests read the
  schemas at the repository root, as they already read `docs/admin/is-it-working.md`; nothing
  embeds them. Each `$id` freezes with the 1.0 tag and need not resolve until cairn.pub serves
  the route, and the page says so. `tool/README.md` stays as a short landing page.
- **A vendor figure may be stated.** The container gains one tag, `[vendor-figure: as of <date>]`,
  whose `Source:` is the vendor's URL, accepted by `check:facts`. A page prints the figure with
  its as-of date. The admin register requires a cost before the step that incurs it, and a
  link-only bullet cannot supply one.
- **One owner sitting.** Geoff reads the new credentials page beside its cold-reader stall log
  and rules each stall a docs defect or an acceptable reader gap.

## The three passes

### Pass A: the tool's contract pages (before the cut)

1. The scripter-or-agent profile and the three records of the overturn named above. The reader
   is anyone automating against `cairn`. They arrive from `cairn help agents`, a `--json` help
   line, or an admin page's link. Vocabulary is fully technical. Success is branching on every
   exit code and parsing every payload without running the tool to find out.
2. Gate readiness for these pages: `scripts/checks/check-symbols.mjs` learns the Go tool's
   flags, since it resolves a `--flag` in a shell fence only against the scaffolder's parser and
   a one-by-one allowlist, and the contract pages are made of `cairn ... --json` fences.
3. Three new pages, `docs/reference/cli-cairn-exit-codes.md`,
   `docs/reference/cli-cairn-json-output.md`, and `docs/reference/cli-cairn-doctor.md` (the
   command page the Go half writes at `tool/docs/reference/cli-cairn-doctor.md`), named like the arm's existing `cli-<binary>` pages
   and linked from `docs/reference/README.md`. `check:reference` visits only export subpaths and
   does not cover them. They document the contracts as `main` has them after the retirement,
   including the local action's payload and any reason code it added. Their facts get new `##`
   sections in `docs/internal/facts/reference.md`. They carry no transcripts; each JSON example
   is derived from a golden under `tool/internal/render/testdata/`, named in the brief's
   manifest, with the owner's site names, repository, and Cloudflare account id replaced by
   example values, since these pages ship in every consumer's `node_modules`. The JSON page
   keeps the structure `tool/internal/render/json_schema_test.go` asserts. Each page carries a
   line naming the `cairn` version it describes, and a Go test guards that line and the
   exit-code table against `internal/spine`. Their exemplar is
   `docs/reference/cli-cairn-manifest.md`.
4. The tool's log-event content folded into `docs/reference/log-events.md`, which stays the one
   log vocabulary page.
5. The tool-side move, **in the same merge**: `tool/docs/reference/exit-codes.md`,
   `json-output.md`, `log-events.md`, and `cli-cairn-doctor.md` deleted, with a short README left in that directory
   saying where the pages and schemas went; every `*.schema.json` beside them (seven with the
   `cairn doctor` payload) moved to `docs/reference/schema/`; a real docs base URL constant beside the
   anchor prefix `tool/internal/render/layout.go` calls `docsBase` today, following the URL
   shape the 1.0 fix lines froze, `https://cairn.pub/docs/<arm>/<page>`; the two new pages added
   to `.github/workflows/tool.yml`'s path filters; the `--json` help text and `cairn help agents` repointed;
   the drift tests' paths moved (`usage_test.go`, `json_schema_test.go`, `help_agents_test.go`);
   `messages_test.go`'s budget-docs test, which reads `exit-codes.md` and `tripwire.md` in one
   loop, split so the half that stays still passes; `tool/README.md`'s exit-codes link
   repointed; the help goldens recut. Four Go tests read these files at test time, so a deletion merged apart from the Go
   edits turns `main` red. The pass's gate includes `make -C tool check`, and `go-conventions`
   governs every Go edit. The tool's conductor confirms `tool/` is quiet before the pass starts.
6. `tool/.vale.ini` grades Go comments only, so this content meets Vale's Google and Cairn set
   for the first time and gets a first triage. A Vale finding is
   fixed on the page; a wrong one gets the scoped suppression the register's "When a Vale finding
   is wrong" section prescribes.

`tool/docs/credentials.md` and `tool/docs/tripwire.md` stay as the interim copy until pass B,
because their destinations are admin pages. `tool/docs/release-candidate-notes.md`,
`tool/docs/adr/`, and `tool/docs/design/` stay for good, and so does `tool/docs/friction.md` once
the after-1.0 framing's site round creates it, since it is a working record and no public page.

The link repoint reaches operators in `tool/v1.1.0`, cut by the tool's conductor after pass A
merges. This supersedes the line in
`docs/internal/record/2026-09-21-doctor-retirement-tool-sizing.md` that folds the repoint into
`tool/v1.1.0` at the retirement's close, before these pages exist.

### Pass B: the admin arm (after docs-infra)

1. **The admin profile amendment**, in the register's admin-track section with a dated note
   appended to the 2026-08-14 record. The setup spine gains `cairn`. The ranked jobs gain
   installing the tool, setting up its credentials, checking the site, and scheduling a run.
   Token, permission, credential, and scheduled run become defined-on-use terms. Exit code and
   `--json` stay out of the admin track. The amendment states the terminal ceiling as a
   can-and-cannot list a reviewer grades against: which of editing a file, placing a unit or a
   plist, enabling a timer, reading a unit's failure output, using Task Scheduler, setting a
   persistent environment variable, and storing a token the reader may be asked to do, that a
   page always names the exact file per platform, and that the fallback past the ceiling is the
   profile's existing "ask a developer".
2. **Gate readiness**, before any drafter runs. `scripts/checks/transcript-blocks.mjs` gains a
   fixture root for tool captures and updated `PAGE_FLOORS`. `scripts/checks/check-facts.mjs` accepts the vendor-figure tag,
   and `docs/internal/facts/README.md` documents it. A retired scaffolder fixture is declared
   under the fixtures README's "Deliberately unconsumed" heading.
3. **Twelve pages, drafted fresh.** Rebuilt: `README.md`, `before-you-start.md`,
   `create-your-site.md`, `own-your-domain.md`, `invite-editors.md`, `is-it-working.md`,
   `setup-recovery.md`, `troubleshooting.md`, `what-to-run-and-when.md`. New: `install-cairn.md`,
   `check-your-credentials.md`, `schedule-a-check.md`. Install is its own page and precedes
   scaffold in the arm's order, because `create-cairn-site` calls `cairn` once the doctor is gone
   and a prerequisite buried in another page fails the profile's grading question.
4. **The second tool-side move, in the same merge as its pages:** `tool/docs/credentials.md` and
   `tool/docs/tripwire.md` deleted, with the rest of `messages_test.go`'s budget-docs test, the
   credentials drift test in `permissions_test.go`, and `tool/README.md`'s remaining links
   repointed. Same gate and same quiet-`tool/`
   rule as pass A.
5. **Facts.** New `##` sections in `docs/internal/facts/admin.md` for the three new pages.

### Pass C: the extend arm

The extend arm, drafted fresh by the same method. `docs/extend/migration-notes.md` and
`docs/extend/upgrade-cairn.md` are per-version records and are maintained in place. Its plan is
written after pass B closes and inherits what pass B learned.

### Out of scope

The editors arm, the front door, and `docs/why-cairn.md` stay as they are until the rebuild. No
tester this initiative has can stand in for an editor or an evaluator. The reference arm's engine
pages stay maintained in place; `docs/reference/admin-grammar-tokens.md` and `admin-toolkit.md`
are printed by audit rules and do not move. `https://cairn.pub/help` renders the editors arm
alone, and no admin draft is linked from it.

## How a page gets made

**Mining, per page.** A Sonnet read of the old page (for a tool page, the `tool/docs/` original)
produces three things: an ordered step
skeleton, a command manifest with a fixture manifest, and a dispositions diff. The skeleton gives
each step its precondition, the cost or irreversible consequence disclosed before it, the move
between browser and terminal, the prompt text, and the step's own success signal. The manifests
give every fenced command verbatim with its source, and every transcript block's fixture path.
The diff lists every claim on the old page the container lacks, each with a disposition: file it
as a sourced bullet, restate it as `[external]` or `[vendor-figure]`, or cut it with a reason. An
Opus read ratifies the dispositions. The review measured the container at 40 percent of the
actionable claims on two admin pages, with step order, success signals, warnings, and prompt
strings the usual casualties, so the skeleton and the diff are the control against fact loss.
Dashboard labels and click-paths become `[external: cloudflare-ui]` or `[external: github-ui]`
bullets carrying the label, the URL, and a checked-on date.

**The brief.** Briefs live in the plan. Each carries the reader's job, the page anatomy from the
register, the ordered skeleton with each cell pointing at a bullet or a manifest entry, the
arrival states (including arrival mid-failure from a tool fix line), the anxieties the page
answers before its mechanics, the pinned path and slugs verbatim, the pages it links to, and what
it must not cover. Bullets are handed over re-keyed to the new page, without the old page's
headings.

**The drafter** receives the brief, the track's profile, the register's universal contract and
track section, an exemplar, and the error-tier Vale rule list. The exemplar for a pass's first
page is a calibration specimen the register names; after the owner sitting, the accepted page is
the exemplar. The drafter never opens the old page, a `tool/docs/` original included; only the mining
read does. It copies commands and transcripts from the manifests and never composes them. A hole it
finds is filed as a bullet against code on `main`; something it needed that no source records
goes to the friction log.

**Transcripts** come from the conductor's real runs of released `cairn` against Geoff's four
sites and a scratch site, with the stored `CAIRN_*` values, captured once as fixtures. The GitHub
read token expires 2026-10-19. Capture and the literal walk cost wall-clock time and a little
Cloudflare usage, budgeted apart from tokens.

**The chain, per page.**

1. A Sonnet drafter writes the page at its final path.
2. The gates run: `check:vale`, `check:docs`, `check:arm-indexes`, `check:snippets`,
   `check:transcripts`, `check:symbols`, `check:facts`, and `check:readiness` where they apply,
   plus `make -C tool check` on the light lane for any page the tool pins.
3. `cairn-register-editor` on `claude-opus-5`, its dispatch prompt requiring a profile section.
4. A fresh-context `claude-opus-5` profile grader, with the track's profile printed in its
   prompt, returns a verdict per grading question: the reader, the vocabulary contract, the
   arrival state, the success criterion, the counterpart question, and the anxieties answered
   before the mechanics.
5. A separate `claude-opus-5` fact read traces every claim to a bullet or a ratified
   disposition, and flags a claim with neither and a named bullet the page dropped.
6. One redraft round. A second `fix` verdict goes to the conductor.

## Testing per audience

Fact-correct and register-correct are not effective. Each test below is here for a failure only
it catches.

| Reader | Test | When | Catches |
| --- | --- | --- | --- |
| Admin | Cold reader: an agent with the page and a terminal only, held to the profile's ceiling, logging every point where it had to infer | each task guide in pass B | an unstated step, an unclassified error |
| Admin | Literal walk: install, credentials, health, schedule on a clean machine, every command as printed, every success signal asserted | once, at pass B's end | a command that does not run, a signal that never appears |
| Admin | Anchor landing: each anchored section of `is-it-working.md` states what the condition means, whether to act, wait, or ask, and its own next step, with no upward reading; a structural check over all, cold reads on six | that page's acceptance | a fix-line arrival that strands the reader |
| Admin | The owner sitting on `check-your-credentials.md` and its stall log | after that page's chain | which stalls are defects; it calibrates every later brief |
| Scripter or agent | A fresh agent given only the two contract pages writes a wrapper branching on every code and a parser for every payload, run against `docs/reference/schema/` and the goldens under `tool/internal/render/testdata/` | pass A's end | a contract page that under-specifies |
| Extender | Each site agent logs every read of engine source or the cairn-cms checkout made to finish a docs-described task, as a docs failure with the page and the unanswered question | site round | a page that needs engine source |
| Extender and admin | One report line per page per site: followed verbatim, deviated where, knew what the page did not say | site round | evidence an in-place edit would erase |

The site round cannot certify the admin arm. A site agent upgrades an existing repo with full
tool use and never sets up a site under the admin's ceiling, so admin efficacy is tested inside
pass B. The round is the extender's test. Its results return through the friction log, by the
route the docs chore defines. The `site-pass` skill owes the two report items before the round
starts; this initiative hands the docs chore that wording.

`docs/admin/is-it-working.md` goes through the chain first in pass B, for the mechanical
calibration of pins and anatomy. The owner's sitting is on a task guide, because every other
admin page is one and the catalog is where an expert's read transfers least.

**Good enough to start the site round:** the literal walk is green, no cold-reader stall is
unresolved, the scripter test passes, and every profile-grader verdict is accepted. **The drafts
worked:** the round records no engine-source read on an extend page and no deviation traced to a
missing step.

## Pinned pages

A rebuilt page keeps its file path and every heading slug that code, a gate, or the tool
resolves. A rename adds a row to `LEGACY_PATH_MAP` in `scripts/checks/docs-links.mjs` and updates
whatever read the old path, named in the plan.

- `docs/admin/is-it-working.md`: 19 unique anchors across the 24 `docsAnchor` values in
  `src/lib/diagnostics/conditions.ts`; three anchors in `tool/internal/health/fixes.go`, resolved
  by a Go test that runs only in `make -C tool check`; the `docsBase` URL in
  `tool/internal/render/layout.go`; `check:readiness`; and ten inbound links from
  `troubleshooting.md` and `what-to-run-and-when.md`. The `tool` workflow runs when this file
  changes. The brief carries the slugs verbatim.
- Each arm's `README.md`, read by `check:arm-indexes`. A new page must be linked from its index.
- `docs/editors/when-something-goes-wrong.md`, read by `check:editor-quotes`. Out of scope, named
  so nobody moves it.

## Boundaries with other passes

**The doctor retirement** owns, and this initiative hands it the list: every published page that
prints a doctor command, fixed in place so the `0.97.0` tarball is true; the deletion of
`docs/reference/doctor.md` with its index edit and redirect row; the register's anatomies and
reference grouping that name the doctor; the doctor section of
`docs/internal/record/2026-09-21-site-upgrade-brief.md`; and the re-base of `check-symbols.mjs`'s
dotted-id registry, which reads `src/lib/doctor`. Its scaffolder decision, what `create-cairn-site`
does when `cairn` is absent, sets what `install-cairn.md` and `create-your-site.md` say.

**The docs chore** owns the rule homes this initiative makes stale: `CLAUDE.md`'s sentence that
the rebuild after the round rebuilds the narrative arms, `docs/internal/facts/README.md`'s "How
this container grows", the `cairn-pass` ritual's docs step, the site-agent write path, and the two
`site-pass` report items above.

**`cairn-pub`** owes a pass before the improvement release. STATUS records it un-pinnable against
the registry since `0.95.0`, so nothing publishes until that is fixed. The handoff this initiative
files also lists the nav and redirects for the new and renamed pages and the `/schema/` route.

## Pass duties

Each pass finalizes its `CHANGELOG.md` entry under `## Unreleased`. Pass A's entry names the moved
tool pages and schemas for tool users. Each pass triages the friction log, files its bullets, and
writes HISTORY and STATUS at its close. Pass B's close files two `ROADMAP.md` entries, the full
docs standard's toolset as the rebuild's precondition and the evaluator profile, and records how
far its fact reads discharge the roadmap's claims-verification audit and its entry on re-sourcing
page-only `[candidate]` bullets.

## Budgets

Pass A: a 3.5M token ceiling, flag at 2.8M. Pass B: 7M, with the 80 percent flag at 5.6M. Pass C's ceiling is
set in its own plan. Checkpoints fall every four tasks, and pass B has one attended stop, the
owner sitting.
