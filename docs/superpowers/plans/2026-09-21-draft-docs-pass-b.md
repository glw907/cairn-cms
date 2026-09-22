# Draft docs pass B: the admin arm

**Goal:** Twelve admin pages drafted fresh, with `cairn` woven into the admin reader's existing
jobs and three new task guides (install, credentials, schedule), each page through the chain and
the admin efficacy tests, the tool's two interim admin pages moved in the same merge, so the site
round starts against an admin arm that a reader working alone can follow.

**Spec:** `docs/superpowers/specs/2026-09-21-draft-docs-design.md` ("Pass B", "How a page gets
made", "Testing per audience", "Pinned pages", "Boundaries", "Pass duties"). Executors read both.
Where this plan and the spec disagree, stop and report. Where the spec and `ROADMAP.md`'s "Three
docs items for the draft-docs pass" entry disagree (that entry says the tool gets no page of its
own; the spec's "admin reader works alone" ruling gives it three task guides), the spec governs
and task 14 rewrites the entry.

**Approach:** Readiness first (the profile amendment, the gates, the scratch site, the transcript
captures), because every page chain consumes them. Mining per page into one file, ratified once.
`is-it-working.md` goes through the chain alone first, for the pin and anatomy calibration, then
`check-your-credentials.md` alone with its cold reader, because that page is the owner sitting
and the accepted page is every later task guide's exemplar. The other ten pages run through the
page-chain workflow three at a time. The tool-side move lands last on the same branch, then the
literal walk, the pass-end read, and the close.

**Execution mode:** the page tasks (7, 8, 9, 10) run `~/.claude/workflows/docs-page-chain.js`
(copied to the session scratchpad; the Workflow tool refuses that path), which runs the spec's
chain per page with three pages in flight. The plan header's naming of that workflow is the
opt-in (Geoff, 2026-09-21). Each page's workflow entry carries a `toolGate` argument, set for a
page the tool pins (task 7's), which adds `make -C <worktree>/tool check` to that page's gate,
and a `drafterType` argument, which defaults to `cairn-implementer` and no task changes.
Every other task is an Agent-tool chain: `cairn-implementer`, then
`diff-reviewer`, with the gate inside. Cold readers, the literal walk, and the anchor landing
test are separate Agent dispatches named in their tasks. The conductor stays thin: it reads agent
reports and workflow records, never a diff, a page, or a gate log.

**Token ceiling:** 7M, flag at 5.6M. **Segments and checkpoints:** fourteen tasks in five
segments, 1 to 5, 6 to 8, 9, 10, 11 to 14; a checkpoint at each boundary, five in all, written to
the ledger at the foot of this file. Segment 1 runs five tasks rather than the standard three or
four because tasks 1 to 5 are one readiness seam and share no page, so no boundary inside them
would sit on work a later task could contest. The one attended stop is the owner sitting at the
end of task 8, which coincides with the second checkpoint; every other question batches there or
at a boundary.

**Pre-decided cut:** if the 5.6M flag trips, defer `own-your-domain.md`, `invite-editors.md`,
`setup-recovery.md`, and `what-to-run-and-when.md` to pass C's merge, in that order, and say so
in the checkpoint. The cold readers are never the cut.

**Worktree:** `.claude/worktrees/draft-docs-b`, branch `draft-docs-b`, off `main`, `npm ci` once
before task 2. One executor. Merged by one PR. A stop at any task leaves `main` untouched, and a
stop after task 4 also runs task 4's teardown list.

**Models:** Sonnet drafts and implements at `medium` effort. `claude-opus-5` runs every read
(register editor, profile grader, fact read, dispositions, cold reader, anchor landing, the
platform reasoning, `diff-reviewer`), and task 11's Go edits, which change tests that
guard frozen contracts.

## Preconditions, verified by task 1 before anything else

1. The whole doctor retirement is merged on `origin/main`: `src/lib/doctor` is gone,
   `docs/reference/doctor.md` is gone with its `LEGACY_PATH_MAP` row present, the `cairn-doctor`
   bin is gone from `package.json`, the `package` script no longer chmods `dist/doctor/bin.js`,
   and `cairn doctor` exists in the cobra tree. The register's condition-entry and symptom-row
   anatomies name no doctor; if either still does, task 2 carries that fix as well.
2. `0.97.0` is published (`npm view @glw907/cairn-cms version`), and a `tool/v1.1.0` tag exists
   and is released, so a transcript can come from released `cairn`.
3. The docs chore has landed: the `site-pass` skill carries a "Tool friction" section and the two
   report items the spec names; `CLAUDE.md`'s sentence about the rebuild after the round has
   been updated by that chore.
4. The docs-infra currency pass has landed: `.claude/rules/` exists in this repo and carries the
   docs-governing sections that left `CLAUDE.md`; `.vale/styles/Google/` carries the five added
   rules (Anthropomorphism, ExcessiveClaims, Jargon, Timeless, WordListCase) and `.vale.ini`
   records the package versions. If it has not landed, stop: the spec orders it before this
   pass.
5. `tool/` is quiet: `ListAgents`, `pgrep -f cairn-cms`, and `git status` in every worktree that
   touches `tool/` show no live executor, or the tool's conductor confirms it.
6. The inventory matches the day: the unique `docsAnchor` count in
   `src/lib/diagnostics/conditions.ts` (20 unique values across 26 `docsAnchor` entries at plan
   time, after `declare-the-media-bucket-binding` joined; the spec's "19 unique across 24" is
   stale and this count governs), the three anchors in `tool/internal/health/fixes.go`, the
   readers of `tool/docs/credentials.md` and `tool/docs/tripwire.md` under `tool/` (listed in
   task 11), and `PAGE_FLOORS` in `scripts/checks/transcript-blocks.mjs`. A different count or
   reader list is recorded in the ledger and the affected task text amended before dispatch.
7. `CAIRN_GH_READ_TOKEN` is unexpired (it expires 2026-10-19) and `cairn health` answers from
   this workstation with the stored `CAIRN_*` values for the sites it knows. The ledger records a
   count and a pass or fail per site, never a site or worker name; a failure here is a credential
   task for Geoff, not a docs finding.
8. No session has asked for a quiet `main`.
9. Pass A is merged on `origin/main`: `docs/reference/cli-cairn-exit-codes.md`,
   `docs/reference/cli-cairn-json-output.md`, and `docs/reference/cli-cairn-doctor.md` exist,
   `docs/reference/README.md` links all three, and `tool/docs/reference/README.md` is the stub
   pass A left. If any is missing, stop: tasks 9 and 11 link and read those pages.

If any fails, stop with one combined report.

## Global constraints

- The register is `docs/internal/docs-register.md`: the universal contract, "The admin track",
  the page anatomies (task guide, condition entry, symptom row), and "Names". Google floor.
  Outcome-first headers; money, prerequisites, and the free-until boundary before the step that
  incurs them; every failure ends in a named next step classified wait, act, or ask a developer.
- A drafter never opens the old page, `tool/docs/credentials.md`, `tool/docs/tripwire.md`, or
  `tool/README.md`. Only the mining read (task 6) does. A drafter copies every command from the
  command manifest and every transcript from the fixture manifest, and never composes one.
- The drafts do not hard-wire a scaffold-first order: `install-cairn.md` precedes
  `create-your-site.md` in the arm's order, and `create-your-site.md` names the install page as
  a prerequisite in its "Before you run it" section rather than assuming it.
- The scaffolder prints `cairn doctor` with an install pointer and never detects the binary
  (retirement design, item 10). `install-cairn.md` and `create-your-site.md` say exactly that.
- Linux, macOS, and Windows get equal sections on `install-cairn.md`,
  `check-your-credentials.md`, and `schedule-a-check.md`. The macOS and Windows sections each
  carry the note that the path is tested in CI and not yet verified by a person (Geoff,
  2026-09-21, extending the spec's Windows-only note; the literal walk runs on Linux alone).
- The terminal ceiling from task 2's amendment governs every step: a page always names the exact
  file per platform, and the fallback past the ceiling is "ask a developer".
- Exit codes and `--json` stay out of the admin arm. A page that needs them links to
  `docs/reference/cli-cairn-exit-codes.md` or `cli-cairn-json-output.md` and says no more.
- Every example and transcript uses the substitutes `example.org`, `example-org/site`, and
  `<account-id>`; no page, fixture, ledger entry, stall log, or record this branch adds carries
  the owner's site names, repositories, worker names, or Cloudflare account id. The fixture
  manifest applies the substitution at capture (task 5), and task 13 sweeps the branch for it.
- A vendor's own scope, permission, and setting names stay verbatim on the page, because the
  reader matches them against a vendor screen. A multi-step vendor click-path does not: an
  `[external]` bullet carries the label, the link, and the checked-on date, and the page prints
  those three, so a vendor's navigation change ages one bullet rather than a page of steps.
- Every throwaway token this pass mints is minted with the shortest expiry its issuer allows, and
  its id and expiry go in the ledger at mint. Task 14 revokes each one and records the revocation.
- A page links only inside the shipped tree (`docs/`) or to an absolute URL, in the shape
  `https://cairn.pub/docs/<arm>/<page>`.
- A rebuilt page keeps its file path and every heading slug that code, a gate, or the tool
  resolves (the spec's "Pinned pages"). The pinned slugs are printed verbatim in each brief.
- The exit codes, the schemas, and the wire words froze at `tool/v1.0.0`; no task changes one.
  `go-conventions` is mandatory for every edit under `tool/`, `golang-spf13-cobra` for
  `tool/cmd/cairn`. A Go test that reads a file at the repository root resolves it through
  `providers.RepoRoot()`.
- `tool/docs/release-candidate-notes.md`, `tool/docs/adr/`, `tool/docs/design/`, and
  `tool/CHANGELOG.md`'s released entries are not touched. `tool/docs/reference/README.md` (the
  pass A stub) is not touched.
- No edit to `CLAUDE.md`, `ROADMAP.md`, or `docs/STATUS.md` before task 14.
- `docs/editors/**` (`when-something-goes-wrong.md` above all, which `check:editor-quotes`
  reads), `docs/why-cairn.md`, and the root `README.md` are not edited. A link from one of them
  into the admin arm is kept resolvable by the arm's own paths, never by editing the linking page.
- Gates run as `cairn-run-gate '<string>'`, re-issued on exit 75 until it prints `gate exit:`.
  The docs gate, light lane (`CAIRN_GATE_LANE=light`):
  `npm run check:docs && npm run check:vale && npm run check:arm-indexes && npm run check:symbols && npm run check:facts && npm run check:transcripts && npm run check:snippets && npm run check:visuals && node scripts/checks/check-readiness.mjs`.
  The tool gate, light lane, by absolute worktree path: `make -C <worktree>/tool check`. The
  full gate, heavy lane, once, in task 14: `npm run check && npm test`.
- `npm run check:readiness` runs `npm run package` first, which is a heavy build no per-page gate
  should repeat, so the docs gate calls `node scripts/checks/check-readiness.mjs` directly.
  Before each workflow run, and before task 7's gate, one `cairn-implementer` dispatch runs
  `npm run package` once in the worktree so the readiness check reads a current build. The full
  `npm run check:readiness` runs once, inside task 14's full gate.
- Cloud resources the pass creates are listed in the ledger with their ids the moment they
  exist, and task 14's teardown list is run before the PR merges.

## File map

| Path | Task | Change |
| --- | --- | --- |
| `docs/internal/docs-register.md` | 2 | the admin profile amended; the terminal ceiling; the exemplar rule |
| `docs/internal/record/2026-08-14-audience-profiles.md` | 2 | one dated note appended |
| `docs/internal/docs-friction-log.md` | 2, 14 | the amendment noted; triage |
| `scripts/checks/transcript-blocks.mjs`, its test | 3 | a second fixture root; `PAGE_FLOORS` |
| `scripts/checks/check-facts.mjs`, its test | 3 | the `vendor-figure` tag |
| `docs/internal/facts/README.md` | 3 | the tag documented |
| `packages/create-cairn-site/test/fixtures/transcripts/README.md` | 3 | retired fixtures declared |
| `tool/testdata/transcripts/README.md`, `*.txt` | 5, 12 | the tool captures and their manifest; the timer captures |
| `docs/superpowers/plans/2026-09-21-draft-docs-pass-b.mining.md` | 6 | skeletons, manifests, dispositions; deleted in 14 |
| `docs/internal/facts/admin.md` | 6 | three new `##` sections; sourced bullets; vendor figures |
| `docs/admin/is-it-working.md` | 7 | rebuilt |
| `docs/admin/check-your-credentials.md` | 8 | new |
| `docs/admin/install-cairn.md`, `schedule-a-check.md` | 9 | new |
| `docs/admin/create-your-site.md`, `own-your-domain.md`, `invite-editors.md`, `setup-recovery.md` | 9 | rebuilt |
| `docs/admin/troubleshooting.md`, `what-to-run-and-when.md`, `before-you-start.md`, `README.md` | 10 | rebuilt |
| `tool/docs/credentials.md`, `tool/docs/tripwire.md` | 11 | deleted |
| `tool/cmd/cairn/permissions_test.go`, `messages_test.go`, `permissions.go`, `messages.go`, `health_quiet_test.go` | 11 | paths and comments repointed |
| `tool/README.md` | 11 | two links repointed |
| `tool/docs/README.md` | 11 | new stub saying where the two pages went |
| `.github/workflows/tool.yml` | 11 | the two admin pages in both `paths` lists |
| `CHANGELOG.md`, `docs/HISTORY.md`, `docs/STATUS.md`, `ROADMAP.md` | 14 | close |
| `docs/internal/record/<date>-cairn-pub-docs-handoff.md` | 14 | the admin pages appended |
| `docs/internal/record/<date>-pass-b-stall-log.md` | 8, 14 | the credentials page's stall log and Geoff's rulings |

---

### Task 1: Pre-flight and the current-state record

One read-only `claude-opus-5` agent. It changes no file; the conductor writes its findings into
the ledger.

**Outcome:** the preconditions are verified, and the ledger records, each with a `file:line` on
`main` that day:

- the unique `docsAnchor` list from `conditions.ts` and the three `fixes.go` anchors, verbatim;
- every reader of `tool/docs/credentials.md` and `tool/docs/tripwire.md` under `tool/` and
  `.github/workflows/`, checked against task 11's list;
- the assertions the drift tests make about page content, verbatim: in `permissions_test.go`,
  the `## Token scopes` and `### GitHub` headings it finds, how it matches a `permissionTable`
  row's label to a bullet, and the seven Cloudflare labels and two GitHub labels themselves,
  copied verbatim from `permissionTable` for task 8's brief; in `messages_test.go`'s budget-docs
  test, the wire value and the cap it asserts and which files it reads;
- `PAGE_FLOORS` and `FIXTURES_ROOT_REL` in `transcript-blocks.mjs`, and the `TAG_VOCABULARY` in
  `check-facts.mjs`;
- what the retirement changed on the admin arm: the `is-it-working.md` section it added, the
  scaffolder's three print sites' current text, and `docs/reference/site-facts.md`'s H1;
- the Vale package versions and the Google rule count;
- how many sites `cairn health` reaches with the stored values, as a count and a pass or fail
  each, with no site or worker name recorded;
- that `package.json`'s `package` script no longer chmods `dist/doctor/bin.js`. If it does, the
  retirement is not fully merged and the pass stops.

**Acceptance:** each list is complete against `git grep`; every disagreement with this plan is
named. A disagreement stops the pass for a plan amendment.

### Task 2: The admin profile amendment

`cairn-implementer`. **Files:** the register, the 2026-08-14 record, the friction log.

**Outcome:** the register's admin-track section says (Geoff, 2026-09-21) that the setup spine
gains `cairn`; that the ranked jobs gain installing the `cairn` CLI, setting up its credentials,
checking the site, and scheduling a run; that token, permission, credential, and scheduled run
are defined-on-use terms; that exit code and `--json` stay out of the track; and it states the
terminal ceiling as a can-and-cannot list a reviewer grades against. The list says the reader
may edit a named file, place a systemd unit or a launchd plist, enable a timer, read a unit's
failure output, create a Task Scheduler task, set a persistent environment variable, and store a
token, and may not write a script, debug a unit, or diagnose a permission beyond the page's
named next step; that a page always names the exact file per platform; and that the fallback
past the ceiling is the profile's "ask a developer". It also states the exemplar rule for this
pass: `is-it-working.md` drafts against the condition-entry anatomy with no page exemplar; the
accepted `check-your-credentials.md`, after the owner sitting, is the task-guide exemplar; the
accepted `troubleshooting.md` is the symptom-row exemplar. The rule carries its own dated line
(2026-09-21) recording that the register names no calibration specimen for the condition-entry
and task-guide anatomies, and that this rule supersedes the spec's sentence that a pass's first
page takes "a calibration specimen the register names". The dated record gains one appended
note pointing at the register. The friction log's open section notes the amendment in one line.
If precondition 1 found the doctor still named in an anatomy, this task also removes it.

**Acceptance:** the admin section is the only track section changed, and if precondition 1
carried the anatomy fix, the condition-entry anatomy as well; the amended section names the
seven permitted actions and the three prohibitions verbatim as the outcome states them, the four
defined-on-use terms, and the three exemplar assignments; the record's body above the note is
unchanged; the docs gate is green; `diff-reviewer` accepts.

### Task 3: Gate readiness

`cairn-implementer`, its Go-free half; test-first in `src/tests/unit/`. Docs gate.

**Outcome:**

- `transcript-blocks.mjs` resolves a marker against two roots: the scaffolder's, unchanged, and
  `tool/testdata/transcripts/`; a marker names which by its leading path segment. Markers are
  already repo-relative, so the change is at the resolve step, which rejects anything outside
  the single root today. The uncited-fixture sweep and the "Deliberately unconsumed" read
  iterate both roots, each against its own README;
- `PAGE_FLOORS` is unchanged by this task. The three new pages' floors land in task 9, the task
  that creates the last of those pages, because a floor for a page that does not yet exist
  reports `page-below-floor` and turns the docs gate red for every task between;
- `check-facts.mjs` accepts `[vendor-figure: as of YYYY-MM-DD]` as a distinct tag. That takes
  four edits: `vendor-figure` placed before `vendor` in `TAG_VOCABULARY`, since the tag pattern
  is an ordered alternation and `vendor` would otherwise match first; a `'vendor-figure': 0` key
  in `emptyCounts()`; validation that the tag carries a date; and validation that the bullet's
  `Source:` is an absolute vendor URL, rejecting a repo path. `docs/internal/facts/README.md`'s
  tag vocabulary documents it with the rule that a page prints the figure with its as-of date;
- the scaffolder fixtures README's "Deliberately unconsumed" heading declares the fixtures the
  retirement retired (task 1 names them), with the reason.

**Acceptance:** a fixture page with a `tool/testdata/transcripts/` marker passes
`check:transcripts` and one naming a missing file fails naming the root; an uncited fixture under
either root is reported; a bullet `[vendor-figure: as of 2026-09-21]` with a vendor URL passes
`check:facts`, one with no date fails, and one whose `Source:` is a repo path fails; `PAGE_FLOORS`
is byte-identical to `main`; the docs gate is green; `diff-reviewer` accepts.

### Task 4: The scratch site

`cairn-implementer` with the stored credentials sourced from `~/.local/secrets`; the conductor
records every resource id in the ledger from the report.

**Outcome:** a throwaway site exists for the literal walk, the failure-state transcripts, and the
cold readers: a GitHub repository `glw907/cairn-scratch-b` created by `create-cairn-site` as the
released `0.97.0` scaffolds it, a Worker named `cairn-scratch-b` on account `glw907`, its D1
`AUTH_DB`, and Workers Builds connected, on the `workers.dev` origin with no custom domain and no
sending domain. `gh` and the Cloudflare API cover repository creation and teardown. Two legs
have no API path: the scaffolder's GitHub App manifest OAuth leg and the Builds GitHub-App
authorization. Both run through `claude-in-chrome` in the dev Chromium with Geoff already signed
in, under his standing approval, which the ledger records with its date; absent that approval
they are an attended step raised at the first checkpoint, never a dashboard session an agent
improvises. The ledger lists: the repository, the Worker, the D1 id, the Builds connection, and
the teardown commands for each.

**Acceptance:** `cairn adopt` then `cairn health` against it exits non-zero with the sending
domain and origin checks failing and every other check reporting a status other than `unknown`;
the resource list is in the ledger; nothing under `docs/` changed. Task 14 tears it down.

### Task 5: Transcript capture

`cairn-implementer`, on this workstation, against released `cairn` (`tool/v1.1.0` or later, the
version recorded in the manifest). Docs gate.

**Outcome:** `tool/testdata/transcripts/` holds one fixture per invocation the briefs need, each
captured by the procedure in the scaffolder fixtures README's "Capture method" (the secret sweep
included) and then substituted (`example.org`, `example-org/site`, `<account-id>`), with a
README whose manifest lists per fixture: the command verbatim, the `cairn` version, the site
class (a healthy site, the scratch site), the date, and which page consumes it. The README also
carries a `## Deliberately unconsumed` heading, the same shape the scaffolder's README uses,
because task 3 makes that read iterate both roots; a fixture no page consumes is declared there
with its reason, never left silent. The set covers:
`cairn --version`; `cairn auth set` for each of the three tokens with the prompt text; `cairn
auth check` green and with one token missing; `cairn adopt` on the scratch site; `cairn health`
green on a healthy site, red on the scratch site, and `--quiet` on both; `cairn health` with a
credential missing; `cairn logs` and `cairn holds` on a healthy site; `cairn doctor` on the
scratch checkout; the systemd user timer's `systemctl --user status` and `list-timers` output
after task 12's unit is enabled here (captured then, filed under this task's manifest); and the
install verification line each platform's install ends on. A kind the released binary cannot
produce (a macOS or Windows capture) is a manifest entry marked "reasoned, not captured", never
a composed transcript.

**Acceptance:** `check:transcripts` is green with every fixture consumed or declared
unconsumed; `git grep` over the fixtures for the owner's site names, repositories, and account
id returns nothing; the manifest names a page for every fixture; `diff-reviewer` accepts.

### Task 6: Mining

One Sonnet read per page (twelve, dispatched in parallel, files disjoint by section), then the
`claude-opus-5` dispositions read as three dispatches of four pages each, so no one read carries
twelve pages of sources. For the nine rebuilt pages the old page is the
source; for `check-your-credentials.md` it is `tool/docs/credentials.md`; for
`schedule-a-check.md` it is `tool/docs/tripwire.md`; for `install-cairn.md` it is
`tool/README.md`'s install section and the `tool/v1.1.0` release page's asset list.

**Outcome, in `...pass-b.mining.md`, one section per destination page:**

- an ordered step skeleton: each step's precondition, the cost or irreversible consequence
  disclosed before it, the move between browser and terminal, the prompt text, and the step's
  own success signal;
- a command manifest, every fenced command verbatim with its source (the cobra tree, the
  scaffolder, or a vendor CLI);
- a fixture manifest, every transcript block's fixture path from task 5;
- a dispositions diff: every claim on the old page the container lacks, each with one
  disposition: file as a sourced bullet, restate as `[external: cloudflare-ui]` or
  `[external: github-ui]` (label, URL, checked-on date) or `[vendor-figure: as of <date>]`, or
  cut with a reason;
- a bullet index for the destination page: the ids of the `facts/admin.md` bullets that page
  draws on, grouped under the new page and in the new page's order, carrying none of the old
  page's headings. This is the "bullets re-keyed" artifact the spec's brief calls for, and tasks
  7 to 10 pass this section's anchor to the drafter in the workflow's `inputs`.

**Outcome, in `docs/internal/facts/admin.md`:** three new `##` sections for the new pages,
their bullets `[verified]` against code on `main` with a `path:line` source (the cobra tree,
`tool/internal/`, the scaffolder), the dashboard steps as `[external]` bullets, and each cost
`before-you-start.md` states as a `[vendor-figure]` bullet with the vendor URL.

**Acceptance:** `check:facts` is green; no bullet's source is a `tool/docs/` page; the Opus read
lists every claim in each source and names the bullet or ratified disposition that carries it,
none unaccounted for, every cut with a reason it ratified. Its ratification is final within the
task; an overturn it cannot resolve stops the pass.

### Task 7: `docs/admin/is-it-working.md`, the calibration page

The page-chain workflow with one page, its `toolGate` argument set, since the tool's
`TestFixLineAnchorsResolveInDocs` reads this page. Then the anchor landing test.

**The brief.** The reader's job: a check failed, or a fix line sent them here with an anchor,
and they need to know what the condition means, whether to act, wait, or ask, and the next step,
without reading upward. Anatomy: the register's condition entry for every condition, under a
short "Running the check" section that names `cairn health` as the check, `cairn adopt` as the
step before it on a site the reader did not scaffold here, and the machine surface by one link
to the reference arm. Every one of the pinned slugs is printed in the brief verbatim (task 1's
list, 20 unique at plan time; the three `fixes.go` anchors, each already in that list) and each
keeps its heading text. Each pinned slug is a level-two `##` heading and nothing deeper, because
`fixes_test.go` matches `^##\s+`, and the brief prints each heading's text verbatim for the
drafter to copy. The B2 harvest's health, adopt, and machine-surface bullets are the tool
content; the doctor is not named. It links to `troubleshooting.md` and
`what-to-run-and-when.md` only where a condition's next step is on those pages.

**Inputs the drafter receives:** the brief; the task 2 profile with the ceiling; the register's
universal contract, admin section, condition-entry anatomy, and Names; the mining section and
manifests for this page; the anchor of that section's bullet index (task 6), which is how the
bullets arrive re-keyed; no page exemplar (task 2's rule); the error-tier Vale rule list.

**The anchor landing test, after the chain accepts:** one structural check by a Sonnet agent over
every anchored section (states the meaning, the wait-act-ask class, and its own next step, with
no reference to "above"); then six cold reads by `claude-opus-5` agents, each given one section
alone with its anchor and nothing else, asked what they would do next. A stranded read is a
finding; findings go through one redraft by the chain from the fact read onward.

**Acceptance:** the docs gate is green, the readiness check included; `make -C tool check`
(`TestFixLineAnchorsResolveInDocs`) is green by absolute worktree path; the workflow record says
accepted; each of the six cold reads names its next step and cites no text outside its own
section; no second `fix`, or it is with the conductor.

### Task 8: `docs/admin/check-your-credentials.md`, the owner sitting

The page-chain workflow with one page. Then the cold reader, the stall log, and the sitting.

**The brief.** The reader's job: put the three read tokens where `cairn` finds them, on their
platform, and prove it with `cairn auth check`. Anatomy: task guide. Sections: what the three
credentials are and what each may read, with the cost line (all three are free) before any step;
the mint steps for the Cloudflare token and the GitHub token as `[external]` click-paths with
the exact scope names; storing them with `cairn auth set` on Linux, macOS, and Windows as equal
sections, the environment-first resolution order stated once; where the keyring stores them and
where the site registry lives, per platform, exact paths; the token-scopes section, whose shape
the drift test dictates and the brief therefore pins verbatim; the success signal (`cairn auth
check` green, its transcript); and each failure the reader can hit ending in a wait, act, or ask
step, the keyring-unavailable case among them, with its own wait, act, or ask class. The macOS
and Windows sections carry the not-verified-by-a-person note. It does not cover scheduling or
health.

**The token-scopes shape, pinned verbatim in the brief.** `permissions_test.go` takes the span
from `## Token scopes` to `### GitHub` as the Cloudflare section, asserts every Cloudflare label
there, and sweeps that span in reverse, erroring on any bullet in it that is not a label. So the
page carries, in this order: a `## Token scopes` heading; a `### Cloudflare` subsection before
`### GitHub`; the seven Cloudflare labels task 1 recorded as the only bullets anywhere between
`## Token scopes` and `### GitHub`, one per line, bare, with no trailing period, no bold, and no
gloss; and the two GitHub labels at or after `### GitHub`. Any prose those subsections need sits
outside a bullet.

**Inputs the drafter receives:** as task 7, plus the task-guide anatomy and no page exemplar.

**The cold reader, after the chain accepts:** one `claude-opus-5` agent on this workstation, not
in a container, under a fresh `HOME` on the real session bus, because `cairn auth set` writes to
the login keyring and a container has no keyring to write to. It gets the page and a terminal
only, is held to task 2's ceiling, and works with a throwaway pair of tokens minted for it. It
follows the page literally, runs every command as printed, and logs every point where it had to
infer, ask, or stop. Every keyring entry it creates is listed in the ledger as it is created and
deleted at the task's end, and the tokens are revoked there too. The log is written to
`docs/internal/record/<date>-pass-b-stall-log.md`.

**The sitting:** the conductor writes the checkpoint, then presents Geoff the page and the stall
log together, one question: which stalls are docs defects. Each defect goes through one redraft
by the chain from the fact read onward; each acceptable gap is recorded in the log with his
ruling. The accepted page becomes the task-guide exemplar for tasks 9 and 10.

**Acceptance:** the docs gate is green; the workflow record says accepted; every stall carries a
ruling; the stall log is committed; the cold reader's keyring entries are deleted and the ledger
says so.

### Task 9: The task guides

The page-chain workflow over six pages, three in flight, then one cold reader per page in
parallel. Exemplar: the accepted `check-your-credentials.md`. This task also adds the three new
pages' floors to `PAGE_FLOORS` in `scripts/checks/transcript-blocks.mjs`, keyed repo-relative,
`docs/admin/install-cairn.md: 1`, `docs/admin/check-your-credentials.md: 1`, and
`docs/admin/schedule-a-check.md: 1`, keeping the two existing floors; the addition lands with
the last of those pages, in the same commit, so the gate never sees a floor without its page.

- `install-cairn.md` (new). The reader's job: get `cairn` onto their machine and prove it. Per
  platform, the release page's asset for that platform, the checksum step, where to put the
  binary, and the verification line from the fixture; the note that the setup command prints
  `cairn doctor` with a pointer here and never detects the binary; the cost line (free). Linux,
  macOS, and Windows equal, the note on the last two. Precedes `create-your-site.md` in the
  index.
- `schedule-a-check.md` (new). The reader's job: run `cairn health --quiet` on a schedule and be
  told only when something is wrong. Per platform: systemd user timer (the unit and timer files
  by exact path, enabling, reading a failure), launchd plist (exact path), Task Scheduler (the
  task's action and trigger), each with the credentials rule that a scheduler starts with no
  shell profile and the environment-first order. It carries the task 5 fixture of `cairn health
  --quiet` as its transcript, which is what satisfies its floor; task 12 adds the timer captures
  as a second block once the unit is enabled. The page carries no wire word and no cap literal:
  it says in plain words that a sweep cut short leaves some checks unrun, and links to
  `docs/reference/cli-cairn-exit-codes.md` for the machine surface, which is where task 11's
  narrowed budget test asserts the wire value and the cap. Alerting is one paragraph, not a
  section: the timer's own failure output is the alert the reader gets, and wiring a mail relay
  or a pager is past the ceiling and belongs to a developer. macOS and Windows carry the note.
- `create-your-site.md` (rebuilt). Keeps its path and its three transcript blocks' floor; names
  `install-cairn.md` as a prerequisite in "Before you run it"; its closing "You know it worked
  when" ends on `cairn adopt` then `cairn health`, not the doctor; the GitHub and Cloudflare
  steps are `[external]` click-paths with checked-on dates.
- `own-your-domain.md`, `invite-editors.md`, `setup-recovery.md` (rebuilt). Each keeps its path;
  `setup-recovery.md`'s resume sections gain the `cairn health` step where the old page's next
  step was the doctor.

Each brief prints the page's pinned slugs, the inbound links task 1 recorded for it (which its
headings must keep resolvable), the cost lines, and what the page does not cover. Every rebuilt
page keeps its path, so no brief names a `LEGACY_PATH_MAP` row.

**The cold readers:** one `claude-opus-5` agent per page, page and terminal only, the ceiling in
the prompt; local and read-only commands run for real, cloud steps run against the scratch site
only where the command reads (health, logs, holds), vendor steps reasoned aloud. Where the page
is read-only about the machine, the reader runs in a fresh distrobox container:
`distrobox create --yes -n <name> -i <image>`, then `distrobox enter <name> -- <cmd>`. The first
create pulls the image, and the container needs `curl` and `tar` before the install steps run;
`gh attestation verify` either is skipped inside the container or needs an authenticated `gh`,
and the brief says which. The release assets the install page names follow `tool/README.md`'s
shape, `cairn_<ver>_linux_amd64.tar.gz` beside `SHA256SUMS`. `install-cairn.md`'s cold reader
runs in a container on that basis. `schedule-a-check.md`'s runs on this workstation under a fresh
`HOME` on the real session bus, because it enables a user timer and reads its failure output,
and its keyring and unit artifacts go in the ledger and are removed at the task's end. Each stall
is a finding through one redraft from the fact read onward.

**Acceptance:** the docs gate is green apart from `check:arm-indexes` for the two new pages,
which task 10's README closes; `PAGE_FLOORS` carries the three new keys and the two existing
ones; every workflow record says accepted; every cold-reader stall is resolved or with the
conductor; every container and machine artifact the readers created is gone.

### Task 10: The catalogs and the index

The page-chain workflow over four pages, three in flight; `README.md` last, since it links the
others. Exemplar: `check-your-credentials.md` for `before-you-start.md`; the condition-entry
page for the two symptom-row pages.

- `troubleshooting.md` (rebuilt, symptom rows). The B2 harvest's holds and error bullets are
  the tool content; each row ends in wait, act, or ask; the log-reading section names `cairn
  logs` before the dashboard.
- `what-to-run-and-when.md` (rebuilt). The scheduled run bullets from the harvest. Its
  target-stack section has no gate behind it: `check:target-stack` reads
  `docs/reference/supported-toolchain.md` and never this page. So task 6 files the stack facts
  as a sourced bullet in `docs/internal/facts/admin.md` against that reference page, and this
  brief pins the stack facts verbatim from that bullet for the drafter to copy.
- `before-you-start.md` (rebuilt). A catalog of what the reader needs before starting, not a
  task guide; its register exemplar is the accepted `check-your-credentials.md`, and it gets no
  cold reader, because there is no procedure to follow literally. The install and credentials
  bullets; every cost from a `[vendor-figure]` bullet with its as-of date, before the step that
  incurs it; the free-until boundary stated once.
- `README.md` (rebuilt). The pages in the arm's order: before-you-start, install-cairn,
  create-your-site, own-your-domain, invite-editors, check-your-credentials, is-it-working,
  schedule-a-check, troubleshooting, setup-recovery, what-to-run-and-when. One line each.

**Acceptance:** the docs gate is fully green, `check:arm-indexes` included; every workflow
record says accepted; `docs/extend/README.md`, `docs/why-cairn.md`, and the root `README.md`
still resolve every link into the arm (task 1's inbound list), with none of those three files
edited, since every rebuilt page keeps its path.

### Task 11: The tool-side move

After tasks 7 to 10 are accepted. One implementer, `model: opus`. Both gates.

**Outcome:**

- `tool/docs/credentials.md` and `tool/docs/tripwire.md` are deleted;
- `permissions_test.go` reads `docs/admin/check-your-credentials.md` through
  `providers.RepoRoot()`, since `readToolFile` joins to the tool root and the page now sits at
  the repository root. Nothing else in that file changes;
- `messages_test.go`'s `TestBudgetDocsNameTheCutShortSiteAndTheCap` narrows to read
  `docs/reference/cli-cairn-exit-codes.md` alone, through `providers.RepoRoot()`, dropping the
  `tripwire.md` half of its loop; the admin page carries no wire word and no cap for it to read;
- the comments in `permissions.go`, `messages.go`, and `health_quiet_test.go` name the new paths;
- `tool/README.md`'s two links point at the cairn.pub URLs of the two pages, with the repository
  path in parentheses;
- `tool.yml`'s two `paths` lists each gain both admin pages, beside the
  `docs/admin/is-it-working.md` entry both already carry;
- `tool/docs/README.md` (new, short) says where the two pages went, beside the pass A stub under
  `reference/`.

**Acceptance:** both gates are green, the tool gate by absolute worktree path; the only change to
`permissions_test.go` is its path resolution and that path's comment, with every assertion body
byte-identical to `main`; deleting one `permissionTable` label from the new page makes that test
fail, checked and reverted; `git grep -n "docs/credentials.md\|docs/tripwire.md" -- tool/ .github/`
returns only `tool/docs/release-candidate-notes.md`, `tool/docs/design/`, `tool/CHANGELOG.md`'s
released entries, and the new stub; `diff-reviewer` accepts against this list.

### Task 12: The literal walk and the platform reasoning

Two dispatches, independent.

**The literal walk:** one `claude-opus-5` agent on this workstation, under a fresh `HOME` on the
real session bus, not in a container, because the walk stores credentials in the login keyring
and enables a user timer, neither of which a container can do. It gets the four pages
`install-cairn.md`, `check-your-credentials.md`, `is-it-working.md`, and `schedule-a-check.md`, a
throwaway token pair, and the scratch site's name; nothing else. It installs, stores credentials,
adopts and checks the scratch site, and enables the systemd user timer, every command as printed,
every success signal asserted as the page states it, and it logs each deviation. It asserts the
timer's run twice, once with the keyring unlocked and once with it locked, since a scheduled run
meets a locked keyring on a real machine and the page's credentials rule is what that tests. The
timer captures from task 5 are taken here. Every keyring entry, unit file, and timer it creates
is listed in the ledger as it is created and removed at the task's end, the fresh `HOME` with
them, and the tokens are revoked.

**The platform reasoning:** one `claude-opus-5` agent reads the macOS and Windows sections of
the three platform pages against the vendor documentation (launchd plist format and
`launchctl`, Task Scheduler's `schtasks` and the GUI, Windows environment variables, macOS
Keychain), and returns per section: would this run as printed, and what a reader would have to
know that the page does not say. Each finding is a docs defect through one redraft.

**Acceptance:** the walk reports every command ran and every signal appeared, both keyring
states included, or each deviation is resolved by one redraft and one re-walk; the reasoning
returns no unresolved finding; every artifact the walk created is removed and the ledger says so.

### Task 13: The pass-end read

One fresh `claude-opus-5` `diff-reviewer` over the whole branch against this plan's global
constraints: the substitution rule, the link rule, the pinned slugs, the untouched files, the
frozen contracts, and the exit-code and `--json` exclusion from the arm. It runs the secret
sweep and the substitution `git grep` over every file the branch adds, the records under
`docs/internal/record/` and this plan's ledger included, not the pages and fixtures alone.

**Acceptance:** accept, or findings fixed by one implementer dispatch and re-read once; the
sweep returns nothing anywhere on the branch.

### Task 14: Close

One fold agent drafts and commits; one independent `diff-reviewer` reads the fold.

**Outcome:**

- the scratch site torn down by the ledger's list (repository deleted, Worker and D1 removed,
  the Builds connection gone), the throwaway tokens revoked, and the ledger says so;
- `CHANGELOG.md`, under `## Unreleased`: the admin arm redrafted with three new pages, the
  tool's credentials and scheduling pages moved under `docs/admin/`, with a plain statement of
  what someone who linked to the old paths does. The old paths appear there as code spans,
  never as links, since the files are gone and a link gate would resolve them;
- the friction log triaged, complete-or-move;
- `ROADMAP.md`: the "Three docs items" entry rewritten as shipped (the pages moved, the order
  not hard-wired, the tool woven in and given its three task guides per the spec); two entries
  filed per the spec's pass duties, the full docs standard's toolset as the rebuild's
  precondition and the evaluator profile; the claims-verification audit entry and the
  re-sourcing entry each gain a line saying how far this pass's fact reads discharged them;
- `docs/HISTORY.md` gains the pass entry, with what a later pass would be wrong to rediscover:
  the Go drift test that pins headings on `check-your-credentials.md` and the narrowing of the
  budget-docs test to the reference arm, the fixture root split, the vendor-figure tag, the
  stall-log rulings, the mining measurements, and the cold reader method, with which readers run
  on the workstation and why. It states in one line that `install-cairn.md` narrows the spec's
  "no separate tool section exists anywhere" sentence: the tool gets task guides inside the admin
  arm's own order, not a section of its own;
- the admin half of the spec's "good enough to start the site round" determination is recorded
  with its evidence: the literal walk green, no cold-reader stall unresolved, and every
  profile-grader verdict accepted, each pointing at the record or workflow record that shows it;
- the mining file is deleted; the stall log stays;
- the cairn-pub handoff record gains the arm's new order and the three new pages for its nav;
- the full gate is green, `npm run check:readiness` with its own `npm run package` included, the
  PR is open, and the `tool` workflow is green on its head;
- after the PR merges, `docs/STATUS.md` says pass B is merged, names the merge SHA, and says the
  next step is pass C's plan completed from its stub
  (`docs/superpowers/plans/2026-09-21-draft-docs-pass-c.md`);
- the pass is scored: tokens against 7M, planning misses, execution sittings (the owner sitting
  is planned and does not count).

**Acceptance:** `diff-reviewer` accepts the fold; the PR's checks are green; no file outside the
file map changed, or each extra file is named with its reason; STATUS is edited only after the
merge; the scratch resources are gone.

---

## Ledger

Written by the conductor at each segment boundary: tasks done, decisions taken, spend, next
task, and the cloud resources that exist.
