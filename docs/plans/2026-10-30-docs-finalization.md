# Docs finalization plan

Initiative: none (`docs/specs/2026-10-30-docs-finalization-design.md`, approved by Geoff 2026-10-30,
Approval Queue item `20261030T184230-531750`, with unattended planning).
Risk class: `runner`. The capture task is `live-account`, attended, and needs Geoff's browser.
Repo: glw907/cairn-cms, main checkout `/var/home/glw907/Projects/cairn-cms`. Push target
`glw907/cairn-cms`. No other repo is touched.
Conductor: `conductor-cairn-cms`, started by a timer at 2026-10-31 00:01 AKDT.
Executors, Sonnet at medium, one at a time: `cairn-cms-docs-final-1` to `-5`. Capture operator:
`cairn-cms-docs-capture`, Opus at medium.
Path estimate: 1,710 minutes (a pair counted once). The design's 2,100 sums both halves of each
pair and stays the launch line. Ceiling 4,200.
Review: mechanics and failure-risk lenses, folded by the planning session
(`docs/research/2026-10-30-docs-finalization-review-*.md`).

## Rulings

Geoff, 2026-10-30, on the design's packet: the capture runs Saturday when notified; the run keeps
going on stacked branches while reviews wait; BACKLOG #46 and #47 fold into Content model. Engine
friction is logged along the way, as usual. On the revision packet (item `20261030T185727-536747`):
the capture scaffolds from a `--tag next` prerelease cut from pass 2's head, published by the conductor
when the sitting starts.

## Pre-flight

None from Geoff before the launch. The first eight hours are pass 1 and need nothing from him. A
transient unit, `cairn-docs-final-awake`, holds suspend until 09:00 Saturday, since this host
suspends after 15 idle minutes even on AC.

Launch checks, on the conductor's first start only: on `main`, `rev-list --count HEAD..origin/main`
prints 0, no live `cairn-cms-docs-final-*`, PR #155 closed. A failed check writes one STATUS line in
the ledger, runs `notify-send -u normal`, retries on each tick, and launches once it passes. A later
start resumes from the ledger and runs no launch check. Later pass launches need no clean main,
because each pass's first act merges the branch under it, so another session's warm main (the Sunday
docs cycle) costs nothing. An unrelated dirty file in main is left alone.

## The ledger

`~/.local/state/cairn-docs-final/ledger.md`, outside the stack, written only by the conductor: each
pass's state, executor, branch, PR, head, queue item ids, and the capture's state and resources. A
relaunched conductor reads it, re-arms its Monitor and wake-up, runs `approval-queue collect <id>`
under `setsid -f` for each open item, and goes on. A relaunched executor keeps its name, resumes its
branch, and rereads the plan. The wake-up is `/loop` with this explicit prompt: "Read the ledger,
check each session and PR, act on what changed, re-arm the Monitor. Do nothing else." A `/loop`
expires at seven days; re-arm it at day six.

## Branches, PRs, reviews

One branch and one PR per pass: `docs-final-<n>`, base the branch under it (`main` for pass 1). Each
pass's first act merges the branch under it.

- Passes 1, 3, 4, and 5 go as `approval-queue docs` reviews, whose view shows the code diff beside
  the pages. Root `README.md` shows only in that code diff, so pass 5's description says so.
- Pass 2 is engine work and goes in a packet, with its figure page edit named in the row.
- The executor hands over a description file, a `notes.json` that passes `approval-queue notes
  --check`, and a clean pushed worktree, and leaves that worktree in place until the decision. The
  conductor queues under `setsid -f` and records the id.
- No packet step merges a PR that sits on an unmerged one. Merges run bottom-up. After each merge the
  next PR's base retargets to `main`. A retarget reruns no CI, so the conductor reads mergeability and
  merges `main` in only when no review waits on that branch.
- A send-back or Geoff's edit stays on its own branch. Git's merge keeps a lower fix when the branches
  above merge later. A fix merges up only on a real conflict, only into a branch with no waiting item
  and no live executor; otherwise it waits for that item's decision. The conductor edits no branch a
  live executor holds.

## The capture sitting

Set point: pass 2 reaches PR-ready. Pass 3 launches anyway. Pass 4 launches when the capture is done
and pass 3 is PR-ready.

The conductor sends one packet with no merge step, holding pass 2's runbook as `[you]` steps. Geoff
attaches to `cairn-cms-docs-capture` with `claude attach`. The operator works `docs-final-capture`
cut from pass 2's head, follows the runbook (task 2.5), and records every resource in the ledger.

A `--tag next` prerelease, published from that branch, is the source: the
version commit lives on the capture branch only, a GitHub release with `--prerelease --target <sha>`
fires `publish.yml`, and `main`, `latest`, and the stacked `## Unreleased` entries stay untouched.
Fixtures are recaptured whole, never edited, and each records its source commit. The fixtures merge
into pass 4's branch.

Failure answers: a half-done run tears down what the ledger lists and reruns once; a bug in the engine
is fixed on the stack, published as the next `-rc.N`, and rerun whole; a second failure escalates and
pass 4 writes `create-your-site` from what is proven. Teardown covers worker, D1, R2, GitHub repo,
`~/.config/cairn/sites` record, and `wrangler logout`; App deletion is a Geoff step.

own-your-domain takes the DNS-admin branch if the sitting has no domain to use, and carries the exact
heading `### You know it worked when` either way (`src/tests/unit/github-slug-contract.test.ts`).

## Standing answers

| Stop | Answer |
| --- | --- |
| A task or pass past twice its estimate | The conductor lifts the clock with a reason in the PR, up to the 4,200 ceiling. Past that it stops and asks |
| A count cap, retry, or rerun | A loop guard: go on while each retry fixes a traced cause (`pass-core` step 1) |
| A cause that returns after its fix | One structural fix, then escalate the item in the PR and go on |
| Items that can be escalated | Any single page outside the gate list, and any single BACKLOG fold |
| A page that can't be verified from code or a recorded run | Held out and listed in the PR. A gate-list page ships with only what is verified, plus an escalation |
| A boundary-test item | Applied in pass 2 if reversible and in the ceiling. A product design, or an `auth-data` path, stays batched |
| `norms` Playwright apt failure (#86) | Rerun once; a second red on that job alone is recorded and does not stop the line |
| Any other CI red | The line stops, a traced fix goes forward |
| A held CI run | Per `cairn-pass`'s CI watch |
| Usage limit or API drop | The wake-up resumes; no notification |
| Pair merge conflict | The executor resolves it when it is a ledger or index file, otherwise it redoes the later task on the merged tree |
| Packet rejected or deferred | Fix forward from the note; a defer records the id and `collect`s it |
| A stacked PR approved before the one under it | It waits for the bottom-up merge |
| The capture hasn't run when pass 3 ends | The run waits, with one `notify-send -u normal` |

Gate list: admin `README`, `is-it-working`, `create-your-site`, `own-your-domain`,
`troubleshooting`; editors `README`, `when-something-goes-wrong`, `write-in-the-editor`,
`publish-and-history`, `add-an-image`, `manage-the-media-library`; front door `docs/README.md`,
`docs/why-cairn.md`.

## Global constraints

- Page work follows `cairn-docs` (case C and `references/new-page.md`) and the register brief for
  its track. Every page gets a fresh `docs-fact-checker`, and `figure-verifier` when it carries a
  figure, before its review. `register-check` runs on each arm.
- Every pass files engine friction in `BACKLOG.md` through `/log-issue` (the friction log was retired
  by agent-first pass 2), verified first, and its close runs the boundary test and states the verdict in STATUS.
- A pass never bumps the version or publishes. The capture's prerelease is the one exception, on its
  own branch.
- No pass touches cairn-pub.
- An arm is gated whole. A pair's tasks run page-scoped checks (Vale, the fact-check), and the arm gate
  runs once on the merged tree. Relinks that target new pages run after the pages exist.
- Pass 3 names the admin arm in words only, since those pages don't exist; 4.4 adds the links. Pass 4
  links `docs/README.md` the same way, and 5.1 adds them.
- A retired condition id appears in words only on `is-it-working`, so `check:symbols` stays green.
- Admin pages must not hard-wire a scaffold-first order (ROADMAP, near line 1716). Editors pages must
  not repeat the `address-collision` last-write-wins claim (BACKLOG #31).
- The button fork stays CLI-first. maintain-your-site, read-your-logs, and links-images-and-includes
  stay dropped. `what-to-run-and-when` stays deleted, so its legacy links repoint.
- Heavy gate legs use `RUN_GATE_IF_BUSY=defer`, since `phonebook-pass-5` shares the lanes.

## Pass 1: 2b close (450 path)

A relink entry is closed when `restoredIn` is set or it is recorded moot. Nine entries naming the
deleted `docs/internal/briefs/` or `docs/internal/facts/README.md` close as moot.

| Task | Outcome and files | Acceptance | Min |
| --- | --- | --- | --- |
| 1.1 | Fold #46, #47: Content model gains Reference fields and Fragments sections, keeping the `#resolve-the-targets-on-the-entry-route` target; diagnosis rows move to Debug your site; two pages retire; the two `docs/guides/...` `LEGACY_PATH_MAP` keys repoint to `content-model.md`, ignoring their stale `repointedBy` | `check:docs`; both pages gone; `git grep` of the old paths empty outside history | 120 |
| 1.2 | The 43 stage-2b relinks and 10 fact re-arms | A script run in the task prints 0 open 2b entries, and the output goes in the PR | 150 |
| 1.3 | Reference corrections, #78 (27 rows), #81, #33, #22's `log-events` line | `pendingCount` 0 with no new `exclude` row; `check:options`, `check:reference` | 150 |
| 1.4 | Extend fixes: #1, #6, #43, #62, #79, #80, #82, the consistency read, the add-cairn `#lib` and root layout notes, the `buildNewlyPublished` registry check | Fact-check clean on changed lines | 90 |
| 1.5 | Final extend arm index, part 1's outline deletion, friction triage complete-or-move, boundary test over the 94 engine entries and ROADMAP's friction entries | `check:arm-indexes`; every entry placed; pass 2's scope list committed to this plan | 90 |

1.3 and 1.4 are a pair (1.3 owns `docs/reference/` and `option-map.json`, 1.4 owns `docs/extend/`).

## Pass 2: engine (300)

Scope the boundary test can pull in stops at `auth-data` paths.

| Task | Outcome and files | Acceptance | Min |
| --- | --- | --- | --- |
| 2.1 | Sidebar fixture relabels nothing to its own default (`src/lib/reproductions/stories/site.ts`, `fixtures.ts`); the arrange page shows a real relabel | Story validates; `figure-verifier` verdict pass | 40 |
| 2.2 | Doctor PASS lines print the pass title. Build a committed pty recorder at 100x40 (`packages/create-cairn-site/test/fixtures/transcripts/`; `script -q` pollutes), and recapture the doctor fixture from a local build after `npx cairn-manifest` in a built showcase | The diff of `04-doctor-report.txt` shows PASS titles and no degraded `unknown`; Go gate | 90 |
| 2.3 | Retire `config.tidy-key-missing` and `admin.login-probe-failed`, including `guard.ts:86,97` and `tool/internal/spine/condition.go`; anchors stay on the shipped list | `check:tool-conditions`; `check:readiness` run on a scratch tree holding a stub `is-it-working`, since the arm is absent | 50 |
| 2.4 | Each item the boundary test pulled, plus `address-collision` copy where no design is needed, nav suggestions, and dispatch during an in-flight save | Each named in the PR with the page it changes, a test per behavior | 90 |
| 2.5 | Capture runbook at `docs/plans/2026-10-30-capture-runbook.md`, from the brief and Part A of the capture plan, against today's `create-cairn-site`: exact commands, each browser moment (GitHub App, "All repositories", repository, Cloudflare consent), the teardown list | A dry read by a fresh agent finds no step missing against `create-cairn-site`'s code | 30 |

Each engine change takes `CHANGELOG.md` under `## Unreleased`.

### Pass 2 scope (from pass 1's boundary test, 2026-10-31)

Verdicts and evidence: `docs/internal/record/2026-10-31-engine-friction-2b-close.md`. None touches
an `auth-data` path. Task 2.4 takes these seven in order, about 90 minutes in all, each with a test,
each named in the PR with the page it changes. Numbers are the record's.

| # | Fix | Code | Page it changes | Min |
| --- | --- | --- | --- | --- |
| 46 | Annotate the scaffold's media constant as `AssetConfig` in the showcase, then run `npm run emit:template` | `templates/waymark/src/theme/cairn.config.ts:50`, `examples/showcase/src/theme/cairn.config.ts:53` | none (the `configure-media` step then works as written) | 10 |
| 19 | Catch a throwing `attention` in the engine, log `admin.attention_failed`, render no badges | `src/lib/sveltekit/content-routes-shell.ts:204` | `arrange-the-admin-sidebar` (drop the wrapper step and caution), `docs/reference/log-events.md` | 20 |
| 93 | With `validate: false`, warn once per invalid entry | `src/lib/delivery/site-resolver.ts:65-72` | `migrate-existing-content`, `log-events.md` | 15 |
| 94 | Warn once per entry `buildSiteManifest` skips as invalid | `src/lib/delivery/manifest.ts:32` | `migrate-existing-content` | 10 |
| 62 | A site with no `fragments` concept gets a distinct `cairn:` error | `src/lib/delivery/site-resolver.ts:207-212` | `debug-your-site`, `content-model` | 10 |
| 54 | `resolveReferences` skips a draft target, as its comment promises | `src/lib/delivery/site-resolver.ts:173-174` | `content-model`, `docs/reference/delivery-data.md:436-437` | 15 |
| 16 | `slugify` strips accents before it removes other characters | `src/lib/content/ids.ts:32-38` | `content-model` | 10 |

If time is left, the order is 55, 65, 77, 14, 15, 4, 52, 42, 1 (record numbers). BACKLOG #48 already
holds the live-preview `publicBase` defect that `configure-media` works around.

## Pass 3: editors arm (330 path)

| Task | Outcome and files | Acceptance | Min |
| --- | --- | --- | --- |
| 3.1 | Outline all 8 pages in the PR description from the track outlines and visuals record; re-key `.capture-state.json` | Each page's job and figures named | 60 |
| 3.2 | Draft welcome, write-in-the-editor, publish-and-history, README | Vale and fact-check on these pages | 150 |
| 3.3 | Draft when-something-goes-wrong, add-an-image, manage-the-media-library, manage-your-tag-vocabulary | Same | 150 |
| 3.4 | `repro` fences; each story rendered in an uncommitted scratch route for `figure-verifier`; the 14 stage-4 relinks | Every figure passes or is cut; 0 open stage-4 entries | 60 |
| 3.5 | Arm gate, register check, folds, friction and boundary test, STATUS | `check:docs-gate`, with `check:editor-quotes` counting more than 0 quotes; 8 pages present | 60 |

3.2 and 3.3 are a pair. Geoff's 2026-10-08 ruling prefers live components; a screenshot is only for
what no component renders.

## Pass 4: admin arm (330 path)

| Task | Outcome and files | Acceptance | Min |
| --- | --- | --- | --- |
| 4.1 | Fixture consumption map; outline all 8 pages | Fixtures 01, 01d, 04 cited or declared unconsumed | 30 |
| 4.2 | Draft before-you-start, create-your-site, own-your-domain, README | Vale and fact-check on these pages | 150 |
| 4.3 | Draft is-it-working, setup-recovery, invite-editors, troubleshooting | Same | 150 |
| 4.4 | Move `tool/docs/credentials.md` and `tripwire.md` in, repointing the tool; the 33 stage-3 relinks; add pass 3's admin links; Email Sending price; `create-cairn-site/README.md:359`; arm gate; register check; friction, boundary test, STATUS | `check:readiness` (21 shipped anchors), `check:transcripts` floors, Go gate including `TestFixLineAnchorsResolveInDocs`; 8 pages present | 150 |

4.2 and 4.3 are a pair. The conductor widens the drift routine to all tracks after this pass merges.

## Pass 5: front door (240)

| Task | Outcome and files | Acceptance | Min |
| --- | --- | --- | --- |
| 5.1 | `docs/why-cairn.md` with the docs-stay-true promise and the markdown-why answer, drafted by an Opus-upshifted subagent; `docs/README.md`, root `README.md`; add pass 4's links; the 26 stage-5 relinks | `check:package`, `check:arm-indexes`, register check | 150 |
| 5.2 | #70's route audit; series close: ROADMAP sequence, STATUS naming the final engine batch | Every packaged route cites a page that exists; `check:docs-gate`, `check:close`; `arm-state` prints rebuilt for admin, editors, and the front door; no relink entry open | 90 |

## Close of each pass

CI green on the head, one whole-branch `diff-reviewer`, one batched fix chain, the `cairn-pass` close
checklist, the score in the PR, then PR-ready to the conductor with the review inputs. The executor
sends no packet and asks Geoff nothing.

## Later

Filed, not built: the final engine batch, the release, site migrations, the cycle's human gate.
