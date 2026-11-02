# admin-rest plan

- **Slice:** `admin-rest`, the rest of pass 5 after `tidy-lists` and `tool-gates`, cut forward from the run
  sheet's order. Class `ordinary`, plus `runner` for T6's two files under `scripts/checks/` and
  `.github/workflows/`.
- **Base:** `main` at `16a081668`, which holds PR #178 (`auth-data`) and PR #180 (`tool-gates`). The plan was
  written and reviewed at `6762c2db3`, then replayed here and rechecked. **Branch:** `worktree-admin-rest`
  (plan), `worktree-admin-rest-run` (executor). **Push target:** `glw907/cairn-cms`.
- **Design note:** `docs/internal/plans/2026-11-01-admin-rest-design.md`.
- **Estimate:** design 190, ceiling 380, this plan's path 310 at the observed rate (see "Order"). It is
  over the design's estimate and under the ceiling, so no item is cut.
- **Review:** `standards:plan-reviewer` plus one fold, per `standards:spec-plan-review` for a plan on an
  `ordinary` pass. The fold record is `2026-11-01-admin-rest-fold.md`.
- **Merge:** the conductor, session `cairn-cms-9b`, under Geoff's merge word, with a record packet. The
  executor stops at PR-ready and merges `main` only when told. T6's `runner` paths require this route, so
  the merge word's conditions apply, and nothing else is owed: no path on the `auth-data` map, so no live
  smoke.
- **Executor:** Opus at `high`. The launch prompt says Sonnet medium unless the sheet names otherwise, and
  the sheet does: "Opus high, because shape 20 and #145 change public types. Pair tasks stay Sonnet,
  since the rest is mechanical." `tidy-lists` took #145 and shape 20 stays here. Every task goes to
  `cairn-implementer` (Sonnet, medium) with `model: opus` on T2 only. A `BLOCKED` implementer on T1 or T5
  may be re-dispatched once at `model: opus` with the outcome unchanged.

## Sweep verdicts

Fresh scoped sweep at `6762c2db3`. The sweep's `BACKLOG.md` edits land in this plan's commit.

| Item | Verdict | Note |
|---|---|---|
| #237 | fold, T1 | High. May not be set aside. |
| #238 | fold, part, T7 | Bound hints, the kept mark, and the two-invalid-controls fix land. The server-refusal half goes to pass 7 with the cluster, and paste and trim go to pass 7 as a product question. |
| #216 | fold, T7 | |
| #215, #214, #242 | fold, T4 | #214 is Delete only. Discard and Rename have the same gap: T4 files it. |
| #209, #210 | fold, T4 | #209 reproduces on every load. Read from the code by this sweep, and T4's test must show it. |
| #136 | fold, T3 | `docs/reference/log-events.md` no longer exists. The table is `skills/cairn-extending-a-site/references/log-events.md`. |
| #143 | fold, T7 | May be set aside. |
| #172, #193 | fold, T5 | #193 may not be set aside. |
| #173 | fold, T8 | May not be set aside. |
| #180 | fold, part, T5 | Claims 1 to 4. Claim 5 goes to pass 7. |
| #24 | fold, narrowed, T6 | Reworded here. "Owner and editor" stays true for a site with no `roles` (`guard.ts:53`). Only the claim that an unwired guard falls back is false. |
| #122 | fold, T3 | Sits under `## Done` as "duplicate of #115", and #115 drops. Reopened here. |
| #190 | fold, ordering half, T3 | Reworded here. The skill and judge half stays in the cleanup round. |
| #103 | reword (line only), keep | `admin-nav.ts:220` is now `:284`. Pass 3 owns it through ergonomics 16. |
| #115, #116 | drop | `cleanup-custom-recipes` retired the code they improve. Geoff approved these drops in `design.md`, "5. Admin and tidy". The code itself goes in pass 3 (E9). |
| #199, #200 | reword (lines only), keep | `EditPage.svelte:1962` is now `:1970`; `content-routes-entry-destructive.ts:197` is now `:331` and `:357`. |
| #179, #181, #164, #187, #201 | keep | `content-rest` and other slices own them, and their stamps are from today. Stale lines (#179, #181) wait for their owner so this commit doesn't touch lines they're rewriting. |
| #178 | not here | `tool-gates` holds it. |

The full sweep is due by the skill's rule (29 unstamped items against a bar of 15). This run doesn't run
it: the prompt asks for a scoped sweep, most of those items are days old, and the sheet reads triage at the
release sitting. `## Tooling` records the trigger firing on freshly filed items.

## Pre-flight

No step needs Geoff. Every item here either falls under the `autoMode.allow` lines workstation#192 added,
or is plain repo work. A refusal is a stop: write it to STATUS and wait. Never route around one.

| Step | Task | Cover |
|---|---|---|
| Edit `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`, where it names renamed labels | T5 | "edits and commits ... to files under .claude/skills/ and .claude/rules/ are allowed when they implement a task of a plan under that sheet". This is the only such edit. No task edits a CLAUDE.md or a `.claude/rules/` file. |
| `gh workflow run e2e.yml --ref worktree-admin-rest-run -f update_snapshots=true`, only if a visual baseline goes red | T9 | Sheet standing answer. |
| Edit `scripts/checks/tool-check-ids.mjs` and the `paths` lists in `.github/workflows/tool.yml` | T6 | `runner` paths, plain repo work under the merge word. The session's `gh` token carries `workflow`, so the push is covered. No other workflow changes. |
| `git mv` of two tracked PNGs under `src/lib/reproductions/fixtures/` | T8 | Plain repo work. |
| Local Playwright run on the heavy lane, stopping any test server the session started | T1 | `autoMode.allow` covers stopping a test process the session started. |
| Conductor merge | close | Geoff's merge word. |

Nothing here runs a `wrangler d1` command, touches a credential, or reads a secret. No path on the
`auth-data` map changes. If ergonomics 15's security read needs one, the conductor merges with the smoke, per the sheet.

## Standing answers

The sheet's answers stand, and each applies in place of stopping:

- A test pins the old behavior: change the test and list it in `## Decisions`.
- An item breaks a site: a `Consumers must:` line, no shim.
- A retried test: flake evidence in the PR.
- CI red that's traced: fix it. A returning cause gets one structural fix, then set it aside.
- A review `fix`: fix forward.
- A `docs-fact-checker` wrong claim: fix it, list a dispute under `## Decisions`, send no docs review.
- A stale transcript block: leave it and list it for recapture.
- An intended visual change: regenerate through `e2e.yml` `update_snapshots` on the branch, read the
  render, list it.
- A reversed ruling: update `engine-rulings.md` in the pass.
- New work: file through `standards:log-issue` and list it in the PR. Its number is the next free on `main`
  at merge.
- A new product or taste question: the recommended reading if it's reversible, listed in `## Decisions`.
  Otherwise set it aside.
- A real dependency this plan missed: set the item aside for its home pass, list it under `## Decisions`,
  go on.
- A cause that can't be traced, or that returns after one structural fix: "Set aside if the plan allows,
  otherwise a stop. Never a retry loop." This plan allows it for ergonomics 19, #24, #143, and #238's part.
- A task that passes its clock: it "gets twice its estimate once if its cause is traced, and otherwise it
  is set aside if the pass allows that." Past twice its estimate, it follows the row above.
- Every pass: no bump, no publish, finalize `## Unreleased`, docs in the same PR.

**Over-ceiling cuts.** Path past 380: cut ergonomics 19, then #143, then the rest of #238. Past that, stop
and write one question to `docs/STATUS.md`. #237, #173, and #193 are never cut.

**Conflicts.** A conflicting PR fires no `pull_request` CI. At the first conflict, the executor merges
`origin/main` on the conductor's word: keep both `## Unreleased` entries, run `npm run emit:template` and
`npm run check:surface -- --update`, regenerate doctor goldens with
`go test ./internal/doctor -run TestGolden -update` from `tool/`, and rerun the fast lane.
`templates/waymark`, `scripts/checks/api-surface.md`, and `CHANGELOG.md` are merge chores.

## Shared hunks

PR #178 and PR #180 are on this base, so their hunks are no longer shared. Open work that could touch these
files:

- PR #181 (`p1-p8`) changes `CairnAdminShell.svelte` at `:31` and `:83`. T5 edits `:18`, `:375`, `:885`, `:1030`,
  `:1038`, and `:1047`, all distant. `BACKLOG.md` is a merge chore.
- `content-rest` (BACKLOG #179, #181) shares `EditPage.svelte:1951` and `:1956`, `CairnMediaLibrary.svelte`,
  `content-routes-entry-write.ts`, and `MediaHeroField.svelte:607`, and had no plan on disk at this writing. The
  conductor sets the merge order, and T5 keeps its string edits to the lines it names.

`Consumers must:` lines follow PR #180's grammar, enforced by `check:consumers-must`: one bare line at column 0
or two spaces, whose body is `nothing.` or an action ending in a period.

## Order

| Step | Tasks | Minutes on the path |
|---|---|---|
| 1 | T1 #237, solo, first | 40 |
| 2 | T2 shape 20, solo | 35 |
| 3 | pair T3 engine, T4 client | 50 |
| 4 | pair T5 words, T6 tool | 90 |
| 5 | pair T7 forms, T8 fixtures | 55 |
| 6 | T9 close | 40 |

Path 310. Each pair's files are disjoint, generated outputs included, except `scripts/checks/api-surface.md`:
T3, T5, and T7 each regenerate it with `npm run check:surface -- --update` so their own lane stays green, no
partner in a pair touches it, and the session regenerates it again after it merges each pair. T5 follows T3 because both edit
`content-routes-entry-destructive.ts`. Pair worktrees branch from the session's latest commit, so T8 sees
T5's stories.

Every dispatch to `cairn-implementer` carries:

- The task's text, and this plan's path.
- For a task under `src/lib/admin`, the skill `cairn-following-admin-design`.
- For a task under `tool/`, `standards:go-conventions`.
- For a task that changes behavior a page describes, `cairn-writing-docs` case A. Docs change with the code.

## Tasks

### T1: Keep a collapsed repeatable row on save (#237)

- **Class:** `ordinary`. **Minutes:** 40. Solo, first.
- **Outcome:** A save keeps every repeatable row, collapsed or expanded, top level or inside Details, with
  each value intact. A collapse never discards a typed edit. A required control in a collapsed row opens its
  row and reports, in place of a silent no-op.
- **Files:** `src/lib/admin/RepeatableField.svelte`, `examples/showcase/e2e/container-fields.spec.ts`,
  `src/tests/component/repeatable-field.test.ts`, and any test that pins the unmounted body
  (`field-input.test.ts:297`, `edit-page-v2-fields.test.ts:125-130`). Possibly
  `docs/editors/write-in-the-editor.md`: search `docs/editors` and `docs/admin` for `repeat`, `row`, and
  `collaps`.
- **Current source:**
  - `RepeatableField.svelte:98`: `let expanded = $state<Record<number, boolean>>({});`
  - `RepeatableField.svelte:264`: `{#if expanded[row.id]}`
  - `RepeatableField.svelte:265`: `<div data-cairn-row-body class="flex flex-col gap-3 border-t border-[var(--color-base-300)] p-3">`
  - `frontmatter.ts:162-163`: `const rows = decodeRows(field.name, field.item, form); if (rows.length > 0) data[field.name] = rows;`
  - `content-routes-entry-write.ts`, in the undeclared-key merge: `if (!declared.has(key) && !(key in merged)) merged[key] = value;`
- **Mechanism:** The mount gate goes. A bare wrapper around the body carries
  `hidden={!expanded[row.id]}`, and the body keeps its classes and `data-cairn-row-body`. `hidden` on the
  body itself would do nothing: its `flex` class wins, since the admin sheet has no Preflight
  (`EditPage.svelte:1731-1737`). The `<li>` at `:214` takes `oninvalidcapture`, which sets
  `expanded[row.id]` inside `flushSync`, the way `EditPage.svelte:341-349` reveals its panes. Add's focus
  selector at `:171` still works.
- **Failing test first.** Commit the tests alone, run them, and record the failing assertion and that SHA in
  the PR. Push nothing until the fix is on top, so CI never sees the red commit alone. This brief overrides
  `cairn-implementer`'s rule for that one commit: it may be red, and it isn't reported BLOCKED.
  Before the run, confirm with `ss -ltn sport = :4391` that nothing listens. `reuseExistingServer` is on
  locally, so a leftover server would pass silently against the wrong engine. A server this session owns is
  stopped, and the proof runs once more. A server it doesn't own moves the run to the next free port.
  Run: `CAIRN_GATE_LANE=heavy cairn-run-gate 'E2E_PORT=4391 npm --prefix examples/showcase run test:e2e -- e2e/container-fields.spec.ts --grep collapsed'`.
  `pretest:e2e` repackages the engine, and the setup's `npm ci --prefix examples/showcase` keeps this
  worktree off the main checkout's engine (`durable-gotchas.md:104`).
- **Test:** In `container-fields.spec.ts`, each with a fresh post and the word `collapsed` in its title, so
  the `--grep` selects it:
  1. A post with two FAQ rows is saved. A fresh `page.goto` leaves every row collapsed and Details closed,
     and Save is asleep. Change only the title, Save, wait for `saved=1`, and reload. Open Details:
     `[data-cairn-row]` counts 2, and expanding each shows its question and answer.
  2. The same round for one gallery image: `gallery.0.src` and `gallery.0.alt` survive.
  3. Expand a saved row, change its answer, collapse it, Save, and reload: the new answer stands.
  In the component suite:
  4. A collapsed row's values reach `frontmatterFromForm` through a real `FormData`, for a text leaf and an
     object item. It repeats tests 1 and 2 on purpose, since the fast lane runs no e2e.
  5. A required empty control in a collapsed row expands the row on `form.reportValidity()`.
  6. The body's wrapper computes as hidden while collapsed, by `toBeHidden`. The wrapper is classless, so
     the test imports `cairn-admin.css`, which the component project redirects to the compiled sheet, or a
     CSS regression can't fail it.
  7. Removing every row still drops the key.
- **Acceptance:** Tests 1 and 2 fail on the old code with a row count of 0, and pass after the fix. An entry
  with rows opens clean: Save stays asleep until an edit.
  `## Decisions` records that an existing invalid collapsed row now blocks the save, where it used to be
  deleted.
- **Also fix** the stale comments `container-fields.spec.ts:7` and `:57`: the aside stays mounted, so the
  fields are in the DOM before Details opens.

### T2: One flash field and a required `error` (shape 20)

- **Class:** `ordinary`, public type change. **Minutes:** 35. Solo. `model: opus`.
- **Outcome:** `EditData` carries `flash: 'saved' | 'renamed' | 'published' | 'discarded' | null` in place of
  four booleans. `ContentFormFailure.error` is required.
- **Files:** `src/lib/sveltekit/content-routes-entry-read.ts`, `content-routes-shared.ts`,
  `src/lib/admin/EditPage.svelte`, `src/lib/reproductions/stories/support.ts`, `src/lib/admin/CairnAdmin.svelte`,
  about 14 test files, `CairnAdmin.test.ts`, `scripts/checks/api-surface.md`, `skills/` references that name
  the booleans, `CHANGELOG.md`, `MIGRATION-NOTES.md`. `src/lib/reproductions/fixtures.ts` only if it holds an
  edit shape: `saved: false` at `:260` is the vocabulary's, so it stays.
- **Current source:**
  - `content-routes-entry-read.ts:69`: `saved: boolean;`, `:71` `renamed: boolean;`, `:114` `publishedFlash: boolean;`, `:123` `discardedFlash: boolean;`
  - `:477`: `saved: event.url.searchParams.get('saved') === '1',`
  - `content-routes-shared.ts:41-42`: `/** The one-line human summary every content action failure carries. */` then `error?: string;`
  - `CairnAdmin.svelte:42-43`: `| (ContentFormFailure & {` then `outcome?: 'sent' | 'send-error' | 'throttled' | RevertOutcome['outcome'];`
- **Mechanism:** Each success redirect sets exactly one of the four parameters
  (`content-routes-entry-write.ts:353-354,448,607`, `content-routes-entry-destructive.ts:489`), so one field
  holds all of them. The settings and nav `saved` flags are a separate shape and stay. `form` in
  `CairnAdmin.svelte:41-48` has one arm, and it also carries success shapes with no `error`
  (`{ ok: true }`, a `RevertOutcome`). So that prop's type moves to
  `Partial<ContentFormFailure> & { ... }`, and each view mount typed `ContentFormFailure | null` narrows with a
  cast, the way the login and history mounts already do: ConceptList, EditPage, NavTree, CairnMediaLibrary,
  CairnTidySettings, VocabularyAdmin. Rewrite the doc comments at `content-routes-shared.ts:31-37` ("every field optional") and
  `CairnAdmin.svelte:34-40`. If a real `fail()` carries no `error`, give it one.
- **Test:** Update the tests that pin the booleans. Add a load test for each parameter and for none, asserting
  the union value.
- **Acceptance:** `npm run check` is clean. `grep -rn 'publishedFlash\|discardedFlash' src skills docs --exclude-dir=plans` prints nothing.
  `npm run check:surface -- --update` shows the type change.
  `CHANGELOG.md` carries `Consumers must: read data.flash in place of saved, renamed, publishedFlash, and discardedFlash.`

### T3: Engine fixes (#136, #190's ordering, #122, ergonomics 15)

- **Class:** `ordinary`. **Minutes:** 50. Pair with T4.
- **Files:** `src/lib/sveltekit/content-routes-entry-destructive.ts`, `preview.ts`, `content-routes-preview.ts`,
  `guard.ts`, `section-action.ts`, `src/lib/dev-flag.ts`, `src/lib/log/events.ts`, `src/lib/log/events-list.ts`,
  `tool/internal/logs/events.go`, `skills/cairn-extending-a-site/references/log-events.md`,
  `skills/cairn-building-admin-screens/references/sidebar-and-access.md`, `scripts/checks/api-surface.md`,
  `docs/internal/engine-rulings.md`, `examples/showcase/src/routes/admin/+error.svelte`,
  `examples/showcase/src/routes/admin/error-fixture/+page.server.ts`, `examples/showcase/e2e/admin-error-page.spec.ts`,
  what `npm run emit:template` changes under `templates/waymark`, tests in
  `src/tests/unit/guard.test.ts`, `section-action.test.ts`, `packages/cairn-cms-dev/src/handle.test.ts`,
  `src/tests/integration/content-routes-preview.test.ts`, `content-routes-reference-delete.test.ts`,
  `content-routes-reference-rename.test.ts`, `content-routes-fragments-delete.test.ts`,
  `content-routes-fragments-rename.test.ts`, `preview-load.test.ts`. Docs: `docs/admin/troubleshooting.md` and
  `docs/admin/is-it-working.md` if they describe the 403.

**#136.** A refused entry delete or rename leaves a log record.

- **Current source:** `content-routes-entry-destructive.ts:135`: `error: \`Cannot delete ${id}: ${inbound.length} ${inbound.length === 1 ? 'page links' : 'pages link'} to ...`;
  `content-routes-media-delete.ts:181` logs `log.warn('media.delete_refused', { editor: editor.email, hash, foundIn })`.
- **Mechanism:** Each refusal site below logs one record, shared by `deleteAction` and `listDeleteAction` through
  `deleteEntry`. A policy refusal is `entry.delete_refused` or `entry.rename_refused`, with
  `{ editor, concept, id, reason, count }`. `count` is absent where the site counts nothing. A fail-closed
  read fault is `entry.reference_check_failed`, with `{ editor, concept, id, action, error }`, whatever status the
  site answers, per the `refused`/`failed` split at `events.ts:12-16`.

  | Site | Event | `reason` or `action` |
  |---|---|---|
  | `:134` | `entry.delete_refused` | `inbound_links` |
  | `:148` | `entry.delete_refused` | `inbound_includes` |
  | `:166` | `entry.delete_refused` | `pending_includes` |
  | `:201` | `entry.delete_refused` | `inbound_references` |
  | `:159`, `:184` (503) | `entry.reference_check_failed` | `delete` |
  | `:291` | `entry.rename_refused` | `pending_edits` |
  | `:315` | `entry.rename_refused` | `address_taken` |
  | `:346` | `entry.rename_refused` | `branch_references` |
  | `:361` | `entry.rename_refused` | `branch_includes` |
  | `:331`, `:357` (409) | `entry.reference_check_failed` | `rename` |

  Not logged here: the 400s for a bad address, since they're form validation; `:402`, which
  `rename.address_collided` at `:396` already logs; and `:233` and `:481`, where `commitFailure` logs
  `commit.*`. `log-events.md` lists the reasons.
- **Test:** One refusal of each reason asserts the record. One fault of each action asserts the `failed` record. A
  commit conflict asserts no refused record.
- **Acceptance:** `make -C tool check` passes, run by hand, because the fast lane doesn't select it for an events
  change (#241). `TestEventVocabularyMatchesEngine` covers the three names.

**#190's ordering.** `requireEngineAccess` runs before the concept lookup.

- **Current source:** `preview.ts:139-143` and `:208-212`:
  `const editor = requireEditor(event);`, `const concept = findConcept(runtime.concepts, target.concept);`,
  `if (!concept) return { outcome: 'unknown-concept' };`, `requireEngineAccess(runtime.access, editor, concept.id);`
- **Mechanism:** Call `requireEngineAccess(runtime.access, editor, target.concept)` directly after
  `requireEditor` in both verbs, and update the sequence in the doc comments at `:113-116` and `:189-193`.
- **Test:** A role denied a mapped concept key that names no concept gets the access refusal, in both verbs.
  The old code answers `unknown-concept`, so this fails first. An unmapped nonexistent id still answers
  `unknown-concept`, and the test pins that as known.
- **Acceptance:** `## Decisions` states the limit from the design note in one sentence.

**#122.** No token row is written when the site has no public origin.

- **Current source:** `content-routes-preview.ts:61-67`, the trade comment that opens
  `// mintPreview runs its authorization sequence first`, and `:89`: `const origin = requireOrigin(env);`
- **Mechanism:** Move `requireOrigin` ahead of `mintPreview`, and rewrite the trade comment to the new order and
  its cost: a refused editor on a misconfigured site now sees the misconfiguration.
- **Test:** With no `PUBLIC_ORIGIN`, the mint writes no `preview_tokens` row.

**Ergonomics 15.** A local 403 names the fix.

- **Current source:** `guard.ts:551-557`: `const ruled = hasAccessRule(access, resolvedTarget);`, then
  `const reason: AccessRefusedReason = ruled ? 'role' : noRuleReason(access, resolvedTarget);`, then
  `throw error(403, 'Access denied');`. `section-action.ts`, in `deny`: `return fail(403, { error: opts.deniedMessage ?? DENIED_MESSAGE });`.
  `examples/showcase/src/routes/admin/+error.svelte:15-20`: a 403 always shows the fixed copy
  `Your role doesn't include this page. Ask the site owner if you need access.`, so a thrown message never
  reaches the page.
- **Mechanism:** The signal is `event.locals.cairnBackend`. Only the dev handle sets it, on every `/admin`
  request and in both content modes (`handle.ts:176`), and `ambient.ts:61` states "a production request leaves it
  unset". Neither the flag nor `isDeployedHost` can witness here: under `npm run dev` the flag reaches only
  `process.env` (`dev-gate.ts:30`), and a real site's `PUBLIC_ORIGIN` forces the deployed verdict on localhost
  (`handle.ts:155-157`). `cairnBackend?.ephemeral` is the wrong test, since the fixtures backend leaves it unset.
  So `handle.ts` and `App.Locals` don't change.

  One exported-from-module helper in `src/lib/dev-flag.ts` (not a package entry), so no `auth-data` path changes,
  returns `No access rule for ${target}. Add it to the adapter's access map.` when the reason is `no_rule` and the
  caller passes a set `event.locals.cairnBackend`. Otherwise it returns null. The log record is unchanged. `guard.ts`
  throws it in place of `'Access denied'`. `section-action.ts` puts it ahead of `opts.deniedMessage ?? DENIED_MESSAGE`,
  since a site's custom denial wouldn't name the fix.

  `+error.svelte`'s 403 branch shows `page.error.message` when it starts `No access rule`, and keeps its fixed copy
  otherwise, so `error-fixture`'s `forbidden fixture` still reads as the role message. Update that file's header
  comment. `error-fixture` also serves `?case=no-rule`, which calls `requireAccess` for a target no rule matches, and
  its comment stops saying no refusal is reachable. It's excluded from the template, so the case stays in the
  showcase. `npm run emit:template` carries the `+error.svelte` change.

  Add one line to `sidebar-and-access.md:32`. Under the `dev-flag-strict-read` entry in `engine-rulings.md`, add a
  line: `scripts/dev.mjs` delivers the flag through a shell, so the reopen condition has fired, and the ruling stands
  because the strict read is unchanged: this text reads `locals.cairnBackend`, not the flag.
- **Test:** In `handle.test.ts`, the audit's scenario: `setFakeEnv` a deployed `PUBLIC_ORIGIN` and no flag, run a
  request through `devBackendHandle`, and call `requireAccess` inside `resolve` for an unmapped target: the 403
  carries the new text. In `guard.test.ts` and `section-action.test.ts`: no `cairnBackend` gives generic text;
  `cairnBackend` with `no_rule` gives the new text; `cairnBackend` with `shadowed` or `role` gives generic text;
  a `deniedMessage` loses to the new text and wins otherwise. In `admin-error-page.spec.ts`, `?case=no-rule` shows the
  new text, and the existing 403 test still passes unchanged.
- **Acceptance:** `## Decisions` records the departure from the audit's "reuse that helper" and why. CI's e2e job
  carries the page proof, since the fast lane runs no e2e. `standards:web-auth-security-reviewer` reads this at
  close, by judgment.

### T4: Small client fixes (#209, #210, #214, #215, #242)

- **Class:** `ordinary`. **Minutes:** 35. Pair with T3.
- **Files:** `src/lib/admin/spellcheck-worker.ts`, `spellcheck.ts`, `DeleteDialog.svelte`, `NavTree.svelte`,
  `CairnTidySettings.svelte`, `src/tests/unit/spellcheck-worker.test.ts`, and the matching component tests.

**#209.** The site dictionary seeds on every load.

- **Current source:** `spellcheck-worker.ts`: `} else if (!handler) {` then `post({ type: 'error', detail: 'spellchecker not ready' });`.
  `spellcheck.ts:658-660`: `// Seed the personal layer from the committed site dictionary. The Worker merges addWord into its`.
- **Mechanism:** Move the `message` listener's body into an exported, testable function. A message arriving
  before the handler exists is queued, and the queue drains into the handler before `post({ type: 'ready' })`.
  Only `addWord` and `ignoreWord` queue. A `check` before ready keeps its error. Rewrite the false comment.
- **Test:** Drive the extracted function with `init`, then `addWord`, with an engine promise the test resolves
  after both. Assert the word answers correct on the first check. A fake that assumes ready can't catch this.
  The same test fails on the old order.

**#210.** A failed asset fetch reports an error.

- **Current source:** `spellcheck-worker.ts`: `const [wasmResponse, dictionaryResponse] = await Promise.all([`.
- **Mechanism:** Throw on `!response.ok` for each response, before `prepareSpellchecker`. The `.catch` already
  posts `error`, and the main thread degrades.
- **Test:** A 404 dictionary posts `error`, never `ready`.

**#214.** A double click on Delete sends one POST.

- **Current source:** `DeleteDialog.svelte:129`: `<button type="submit" class="btn btn-sm btn-error">Delete this {noun}</button>`.
- **Mechanism:** A `deleting` state set in `onsubmit` disables the button and shows the spinner, as `creating` does in
  `ConceptList.svelte:218`. It resets in `open()` and on `pageshow`, the way `EditPage.svelte:457-462` handles a back
  navigation.
- **Test:** After submit the button is disabled. A reopened dialog has it enabled.
- **File** Discard (`EditPage.svelte:2773`) and Rename (`RenameDialog.svelte:100`) through `standards:log-issue`.

**#215.** **Navigation saved.** announces after a full document load.

- **Current source:** `NavTree.svelte:134-139`: `<div role="status">` then `{#if data.saved}`.
- **Mechanism:** Copy `VocabularyAdmin.svelte:160-164,185`: `mounted`, a `$derived` message that's empty until mount,
  an sr-only always-mounted status, and a visible alert with no role.
- **Test:** The status region's text is empty before mount and filled after.

**#242.** The Style conventions copy reads at 320.

- **Current source:** `CairnTidySettings.svelte:464`: `<div class="mb-3 flex items-end gap-3 px-0.5">`.
- **Mechanism:** Stack the row below `sm`, keeping `sm:flex-row sm:items-end`. Let the links wrap.
- **Test:** The showcase's width matrix carries it. T9's render read covers 320.

### T5: The ruled words (#193, #172, #180 claims 1 to 4)

- **Class:** `ordinary`. **Minutes:** 90. Pair with T6. May not be set aside.
- **Outcome:** Every string below reads as ruled, and the editors pages follow in the same task.
- **Files:** `src/lib/admin/{ConceptList,EditPage,RenameDialog,CairnMediaLibrary,MediaAltFillDialog,MediaHeroField,MediaReplaceDialog,MediaInsertPopover,MediaUploadDialog,VocabularyAdmin,CairnAdminShell,CairnHistory}.svelte`,
  `src/lib/sveltekit/content-routes-entry-destructive.ts`, `content-routes-entry-write.ts`, `content-routes-shell.ts`,
  `src/lib/reproductions/index.ts`, `stories/publish.ts`, `ReproContext.svelte`,
  `src/lib/content/types.ts` (a comment at `:111`), `scripts/checks/api-surface.md`,
  `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`,
  `docs/editors/{publish-and-history,when-something-goes-wrong,write-in-the-editor,manage-the-media-library,add-an-image}.md`,
  `docs/admin/troubleshooting.md`, and the tests that pin the strings: `CairnAdminShell.test.ts`, `ConceptList.test.ts`,
  `ListToolbar.test.ts`, `CairnHistory.test.ts`, `CairnMediaLibrary.test.ts`, `EditPage.test.ts`,
  `reproductions-stories.test.ts`, `content-routes-layout.test.ts`, `content-routes-revert.test.ts`, and
  `examples/showcase/e2e/{golden-path,media-library,media-insert,media-figure}.spec.ts`.

A code comment that names an old label follows the rename, including `content-routes-shell.ts:154,167`,
`CairnMediaLibrary.svelte:1126`, `stories/publish.ts:80,96`, and `content/types.ts:111`.

| Rule | Lines (current text) | New text |
|---|---|---|
| page to entry | `ConceptList.svelte:282`, `EditPage.svelte:1288`: `` `${count} ${count === 1 ? 'page links' : 'pages link'} to it.` `` | `entry links`, `entries link` |
| | `EditPage.svelte:1277`: `` `Saved. This page links to unpublished pages: ${draftWarning}.` ``; `:1278`: `` `Saved. This page references unpublished entries: ...` `` | "This entry" and the #180 claim 1 wording below |
| | `EditPage.svelte:1293`: `` `This page links to ${count} missing ${count === 1 ? 'page' : 'pages'}.` ``; `content-routes-entry-write.ts:282`: `` error: `This page links to ${absent.length} missing ${noun}.` `` | entry and entries |
| | `EditPage.svelte:1857`: `This page links to {... 'a page' : 'pages'} that no longer {... 'exists' : 'exist'}` | `This entry links to {... 'an entry' : 'entries'} that {... "doesn't" : "don't"} exist.` Fixes #180 claim 2. The announcer at `:1293` already says "missing". |
| | `EditPage.svelte:1956`: `Saved. Note: this page references ...`; `RenameDialog.svelte:91`: `Links from other pages update automatically`; `content-routes-entry-write.ts:297`: `This page includes a fragment that does not exist`; `content-routes-entry-destructive.ts:135`: `'page links' : 'pages link'` | entry and entries |
| | `EditPage.svelte:1844`, `ConceptList.svelte:359`: `{... 'page' : 'pages'} now link to it.` | `{... 'entry' : 'entries'} now link to it.` |
| | `CairnMediaLibrary.svelte:1030`, `EditPage.svelte:2084,2089` | Read each. Replace where it counts or names an entry. "Link to page" stays if it means the page of a site. |
| Tags | `VocabularyAdmin.svelte:237`: `editors see the name, entries keep the slug`; `:240`: `Editors see the name; entries keep a short slug.` | Drop "slug". Keep "Stored as" at `:235,272`. |
| Filters | `ConceptList.svelte:105`: `{ value: 'pending', label: 'Pending edits', count: () => counts.pending }` | `Unpublished changes` |
| Published includes Edited | `ConceptList.svelte:97`: `published: data.entries.filter((e) => e.status === 'published').length,`; `:114`: `return entry.status === 'published';` | Each becomes `!== 'new'`. Status is `'published' \| 'edited' \| 'new'` (`content-routes-list.ts:26`). Pending stays `!== 'published'`, so an edited live entry counts in both, and the comment at `:92` already says the axes overlap. |
| Publish all | `CairnAdminShell.svelte:885`: `Publish site ({pending.length})`; `:1047`: `Publish site`; doc comment `:18`; `reproductions/index.ts:56` | `Publish all` |
| Confirmation titles | `CairnAdminShell.svelte:1038`: `<li>{id}</li>`, `groupPending` at `:375` | See below. |
| Lead image | `CairnMediaLibrary.svelte:668`: `Upload an image and it shows up here, ready to drop into a post or set as a hero.`; `MediaAltFillDialog.svelte:283`, `:356`; `MediaHeroField.svelte:459`, `:587`; `MediaReplaceDialog.svelte:330`: `parts.push(hero === 1 ? 'Hero' : \`${hero} heroes\`)` | `lead image`. At `:668` only "a hero" changes: the sentence's verb stays, since #193 renames labels. `{row.kind}` chips at `MediaAltFillDialog.svelte:254,327,364` get a display map, and the wire value `'hero'` stays. Read `content-routes-media*.ts` and `media-rewrite.ts` for a server string. |
| Push alt | `CairnMediaLibrary.svelte:1149`; `MediaAltFillDialog.svelte:204`: `Push alt is on hold`; `:227` | `Apply default alt to entries`. The hold heading follows. |
| Change address | `EditPage.svelte:2467`: `{data.routable ? 'Change URL' : 'Rename'}`; `:1267`: `` `The URL is now ${data.slug}.` ``; `RenameDialog.svelte:69,77,100` | `Change address`; `The address is now`. Doc comments at `RenameDialog.svelte:3,31`, `EditPage.svelte:8` follow. |
| Restore as draft | `CairnHistory.svelte:142`, `:54`, `:140`: `` `Revert to the version from ...` `` | `Restore as draft`; the label becomes `` `Restore the version from ${...} by ${...} as a draft` `` |
| Upload image | `CairnMediaLibrary.svelte:634,661`, `MediaInsertPopover.svelte:407`, `MediaUploadDialog.svelte:222,244`: `Upload an image` | `Upload image`. `:279` already matches. |
| #172 | `CairnMediaLibrary.svelte:1183`: `Type the name to delete it anyway.` | `Type the address to delete it anyway.` |
| #180 claim 1 | `EditPage.svelte:1951`: `Saved. Note: this page links to unpublished {...} ({draftWarning}), which will 404 until published.` | `Saved. Note: this entry links to {...} that visitors can't reach yet ({draftWarning}).` covers a never-published entry and a published Hidden one. `:1277` matches. |
| #180 claim 3 | `ConceptList.svelte:164`: `{ value: 'all', label: 'Shown' }` | `All` |
| #180 claim 4 | `CairnMediaLibrary.svelte:439`: `const submittedAlt = $derived(altMode === 'describe' ? altText : '');`, radios `:1041-1044`, comment `:422-423`, reseed `:433` | Remove the radios and `altMode`. One Default alt text box posts its value. Fix `docs/editors/manage-the-media-library.md:31,69,76`, which warns about this. Remove the #180 caveat from any page that carries it. |

**Confirmation titles.** The list shows titles.

- **Current source:** `content-routes-shell.ts:75`: `pendingEntries: Promise<{ concept: string; id: string }[] | null>;`,
  and in the stream: `return [{ concept: entry.concept.id, id: entry.id }];`. `manifestRow(manifest, conceptId, id)` is at
  `content-routes-shared.ts:123`.
- **Mechanism:** After `listBranches`, when any row survives, the same chain reads `ctx.readManifest(backend)` once on the
  backend it resolved, and each row gains `title: manifestRow(...)?.title ?? id`. That read alone has its own catch: it logs
  `github.unreachable` with `scope: 'shell'`, as `:176` does, and every row falls back to its id, because the branch list
  succeeded and Publish all still works. The outer `.catch` keeps the degrade the comment at `:156-159` names. Help's list
  at `:275-281` has a different shape and stays. In `CairnAdminShell.svelte`, `groupPending` returns rows, the key stays the
  id, and the `<li>` shows the title. Stories and `CairnAdminShell.test.ts` fixtures take a title. The `listBranches` call
  stays off the blocking path.
- **Test:** A pending entry with a manifest row shows its title, a never-published one shows its id, the shell load
  makes one manifest read, and a failed manifest read keeps the rows with their ids. Nothing else changes for a
  none-capability session.

**Search for acceptance.**
`grep -rn -E "Publish site|Change URL|Pending edits|Push alt|Upload an image|Type the name|Revert to the version|label: 'Shown'|\*\*Shown\*\*|\*\*Revert\*\*|Revert button|^\s+Revert$" src/lib docs/editors docs/admin` prints only `CairnMediaLibrary.svelte:668`, the sentence kept above.
`grep -rn -E "pages? (now )?links?" src/lib/admin src/lib/sveltekit` prints only code comments.
`grep -rn -i -E "\bheroes?\b" src/lib/admin --include=*.svelte` shows only identifiers, wire values, and comments. `npm run check:docs-gate` passes.

**Screenshots and captions.** Reproductions regenerate from strings. A hand-written caption in `docs/editors` that repeats a
renamed word follows, including `add-an-image.md:77`.

### T6: Doctor migrations check and #24's wording (ergonomics 19, #24)

- **Class:** `ordinary`, plus `runner` for `scripts/checks/tool-check-ids.mjs` and `.github/workflows/tool.yml`. A
  hand edit there isn't the sheet's `api-surface.md` exemption. **Minutes:** 60, inside the pair's 90. Pair with T5.
  Ergonomics 19 and #24 may be set aside.
- **Files:** new `tool/internal/doctor/check_migrations.go` and test, `check.go`, `wrangler.go`, `jsonc.go`, `fileread.go`,
  `report_test.go`, `tool/internal/spine/condition.go`, `src/lib/diagnostics/conditions.ts`,
  `tool/internal/spine/conditions.json` (generated), `check_roles.go`, `check_roles_test.go`, the goldens,
  `tool/cmd/cairn/messages.go`, `tool/cmd/cairn/doctor.go`, `tool/cmd/cairn/doctor_test.go`,
  `tool/testdata/copy.golden.md` (generated), `src/tests/unit/conditions.test.ts`,
  `scripts/checks/tool-check-ids.mjs`, `.github/workflows/tool.yml`, `docs/admin/is-it-working.md`, `tool/CHANGELOG.md`.

**Ergonomics 19.** `cairn doctor` reports an uncopied package migration.

- **Current source:** `conditions.ts:142`: `'auth.store-unmigrated': {`, with remediation
  `'Copy migrations/0004_login_nonce.sql from the package into the site\'s migrations directory and run \`wrangler d1 migrations apply <auth-db> --remote\`.'`.
  `wrangler.go:14`: `// HasAuthDB reports whether a d1_databases binding named AUTH_DB is declared.`
  `jsonc.go:51-55` matches `entry["binding"] == "AUTH_DB"`. `wrangler.go:112`: `case section == "[[d1_databases]]" && key == "binding":`.
  `templates/waymark/wrangler.jsonc:33`: `"migrations_dir": "migrations"`. `package.json:199` ships `migrations`.
  `fileread.go:25`: `func readUnder(dir, relPath string) (body []byte, ok bool, err error) {`.
- **Mechanism:**
  1. `WranglerFacts` gains `AuthDBMigrationsDir`, set by both parsers on the `AUTH_DB` entry. The TOML parser buffers `migrations_dir` for
     its `[[d1_databases]]` block, since the key may precede `binding`, and resolves it in `flushD1`. Empty means the default: "By default,
     migrations are created in the `migrations/` folder in your Worker project directory."
     (<https://developers.cloudflare.com/d1/reference/migrations/>).
  2. `fileread.go` gains `listUnder(dir, relPath)`, with `readUnder`'s containment, returning the entry names.
  3. New condition `config.migrations-missing`, severity `warning`, added to `conditions.ts`, then
     `node scripts/build/emit-tool-conditions.mjs`, and the `ConditionConfigMigrationsMissing` constant plus its entry in the `conditions` slice in
     `condition.go`. Remediation:
     `Copy each listed file from the package's migrations folder into the site's migrations directory and run \`wrangler d1 migrations apply <auth-db> --remote\`.`
     `docsAnchor` is `is-it-working.md#provision-the-auth-store`, already in `shipped-anchors.json`.
  4. `check_migrations.go`, shaped like `check_media.go`: the check has `ID` `config.migrations` and a `PassTitle`. A one-line constant
     names the opt-in files, `0001_roles.sql`, `0002_audit.sql`, and `0003_preview.sql`, per `adopt-cairn.md:98-99`. The check lists
     `node_modules/@glw907/cairn-cms/migrations`, as the audit says, and every `.sql` name there outside that constant is required, today
     `0000_auth.sql` and `0004_login_nonce.sql`. So a future package migration is required by default, and an opt-in one has to be named.

     | State | Report |
     |---|---|
     | No wrangler config, or no `AUTH_DB` | Skip |
     | `wrangler.jsonc` doesn't parse | Unchecked, as `check_media.go` does |
     | Package folder absent, or refused by containment | Unchecked. A `file:` install's symlink escapes the directory. |
     | `migrations_dir` escapes the directory | Unchecked |
     | Site folder absent or empty | Fail naming every required file |
     | A required file missing | Fail naming the missing files |
     | All present | Pass, saying files were copied, not proved applied |

     Its strings join the list in `check.go`.
  5. Add it after `adminMountShape` in `checks`, change the "eight file-only checks" comment to nine, and regenerate goldens with
     `go test ./internal/doctor -run TestGolden -update` from `tool/`, which also cuts `internal/render/testdata/json/doctor.json`. Then `make -C tool copy-list`: the `-update` flag doesn't cut
     `tool/testdata/copy.golden.md`, and `TestRenderMatchesCommittedGolden` fails without it.
  6. Add the required files and matching `migrations/` entries to `cleanSiteFiles` (`report_test.go:33`) and `doctorCleanSiteFiles`
     (`doctor_test.go:44`) before regenerating, or `all-clean.txt` stops being clean and `-update` cuts the wrong golden in silence.
  7. Registrations: the check list in `messages.go:315-318`, with its severity; "eleven" becomes "twelve" in `messages.go:348`, `doctor.go:85`,
     `doctor_test.go:41,163`, and `tool-check-ids.mjs:12`, whose list gains the id; `toHaveLength(23)` becomes 24 at `conditions.test.ts:124`.
     In `is-it-working.md`, add a row to "Find a check by its title", give the condition its paragraph under "Provision the auth store", and
     rewrite the false sentence at `:186`: seven conditions, and `cairn doctor` reports two of them.
  8. `tool.yml`'s two `paths` lists gain `migrations/**` and `templates/waymark/migrations/**`. The workflow's header says a change to a path a
     Go check depends on always triggers it, and without these the test below never runs on the change it guards.
  9. The new check declares `SkipTitle`, the subject alone: `tool/internal/doctor/check.go:18-20` holds the field, and
     `TestEveryCheckDeclaresASkipTitle` fails without it.
- **Test:** Table test, one row per state above, plus: an opt-in file absent from the site passes; custom `migrations_dir` in TOML and JSONC
  reads that folder, with TOML's key before `binding`; absent key reads `migrations`. One test reads the repo's real `../../../migrations` and
  `../../../templates/waymark/migrations`, the way `permissions_test.go:14` reads a repo file: each name in the opt-in constant exists in the
  package, and each required name is in the template, so a new required file can't be forgotten and a fresh site can't warn.
- **Acceptance:** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` passes. `npm run check:tool-conditions` passes. Each golden
  shows one new line plus its totals line, and `all-clean` stays clean and exits 0.

**#24.** The roles text stops claiming an unwired guard falls back.

- **Current source:** `conditions.ts:173`, `conditions.json:57`, `check_roles.go:30` (`tmplRoleWiringUnwired`), the comments at `:70-71`,
  and `check_roles_test.go:62,115`. `skipNoCustomRoles` at `:16` stays: `guard.ts:53` holds the default for a site with no `roles`.
- **Mechanism:** Reword only the "unwired, so falls back" text. An engine at this version raises a `TypeError` on a missing runtime
  (`guard.ts:225-226`), and the text says the guard can't read the site's roles. `check_roles_test.go:65-71` passes
  `createAuthGuard({ roles })`, which raises now, and the wording says so.
- **Test:** Update the pinned strings. Regenerate the mirror.
- **Acceptance:** `npm run check:tool-conditions` passes, and `#24` closes with no claim about older engines.

### T7: Form help and bounds (#143, #238 part, #216)

- **Class:** `ordinary`. **Minutes:** 55. Pair with T8. #143 and #238 may be set aside, in the cut order above.
- **Files:** `src/lib/render/registry.ts`, `src/lib/admin/ComponentForm.svelte`, `FieldInput.svelte`, `EditPage.svelte`, tests,
  `skills/` and `docs/admin/` pages on slots, `scripts/checks/api-surface.md`.

**#143.** A slot's help shows under its control.

- **Current source:** `registry.ts:31`: `help?: string;`. `ComponentForm.svelte:328,345`:
  `aria-describedby={errors[slot.name] ? \`err-${slot.name}\` : undefined}`. `FieldInput.svelte:202-206`, the `fieldHint` snippet.
- **Mechanism:** `SlotDef.help` gains a doc comment. Flat slots at `:320-356` and repeatable slots at `:358-379` render a hint under the
  control, styled like `fieldHint`. `aria-describedby` composes the error and hint ids, with neither dropped when both exist.
- **Test:** A slot with help shows it and is described by it. With an error too, both ids are in `aria-describedby`. No help means no
  `aria-describedby` and no empty hint element.
- **File** the same gap for `AttributeDef`'s `help` at `ComponentForm.svelte:256-317` through `standards:log-issue`.

**#238, this slice's part.** An editor sees a field's bounds, and the control stays marked.

- **Current source:** `FieldInput.svelte:212`: `<textarea ... aria-describedby={f.help ? ...} ... minlength={f.length ?? f.min} maxlength={f.length ?? f.max}>`.
  `:371` is the same for a text input, through `bounds`. `min`, `max` at `:227-228` are the number field's. `EditPage.svelte:341-349`, `onFormInvalid`:
  `if (target?.closest('aside')) { if (!detailsOpen) flushSync(() => (detailsOpen = true)); return; }`.
- **Mechanism:** A small private function in `FieldInput.svelte` turns a field's bounds into hint text: `At least 3 characters.`, `At most 80 characters.`,
  `3 to 80 characters.`, or `Exactly 5 characters.` for text and textarea, and the same shape with no unit for a number. `stringLengthError` can't produce
  it, since it takes a value and returns null when satisfied, and `field-rules.ts` doesn't change. The one `fieldHint` paragraph shows the help, then the bound,
  so `aria-describedby` stays one id, set whenever any hint shows. Add DaisyUI's `validator` class to those controls, so the mark stays after
  the bubble fades. Read the DaisyUI skill for `validator` first, and confirm the class compiles: `cairn-admin.css:1540-1544` and
  `src/tests/unit/fixtures/admin-sheet-inventory.txt`.

  T1 makes a collapsed row validate, so a title and a row can both be invalid, and `onFormInvalid` would then open the aside over the focused title at 320 and
  390. The aside branch opens only when `target` is the first invalid control in the form, which is the one the browser focuses. `:invalid` alone matches a
  `fieldset` too, so the query names `input:invalid, textarea:invalid, select:invalid`. Details comes after the title in the form, and a save with the title
  fixed then opens it as before.
- **Test:** Each bound shape renders its hint and links it. A control with `help` and a bound shows both in the linked hint. A bound-free control renders neither.
  An empty required title plus an invalid control in Details leaves Details closed with focus on the title; with the title filled, Details opens.
- **Acceptance:** At close, #238 stays open, cut to what's left, with `Placement: Pass 7`.

**#216.** Focus returns after the Discard window closes.

- **Current source:** `EditPage.svelte:1713`: `pickAction(() => discardDialog?.showModal())`. `:2759`:
  `<dialog class="modal" aria-labelledby="cairn-discard-dialog-title" bind:this={discardDialog}>`. `DeleteDialog.svelte:61,68-71,92`.
- **Mechanism:** A plain `let discardOrigin: HTMLElement | null = null`, set from `resolveDialogOrigin(actionsTrigger)` before
  `showModal`. The dialog's `onclose` calls `refocusDialogOrigin`. Plain `let`, so `RESET_EXEMPT` doesn't change.
- **Test:** In Chromium through the component suite: open from the More actions button, press Escape, and assert focus is on that
  button. This item was inferred, not run, so run the probe before the fix and record what it shows.

### T8: Generic reproduction fixtures (#173)

- **Class:** `ordinary`. **Minutes:** 25. Pair with T7. May not be set aside.
- **Files:** `src/lib/reproductions/fixtures.ts`, `manifest.ts`, `stories/support.ts`, `stories/media.ts`, `stories/editor.ts`, the two renamed PNGs under
  `src/lib/reproductions/fixtures/` (`trailhead-view`, `trail-map`), `ReproContext.svelte` if it names one,
  `src/tests/component/reproductions-stories.test.ts`, `docs/editors/manage-your-tag-vocabulary.md`, and the other docs captions.

| From | To |
|---|---|
| `fixtureSiteName = 'Trailhead'` (`fixtures.ts:50`) | `Field Notes` |
| `2026-06-02-trailhead-guide`, `A Guide to the North Ridge Trailhead` (`:105-106`) | `2026-06-02-visitor-guide`, `A Guide for First-Time Visitors` |
| `2026-06-10-welcome-to-trailhead`, `Welcome to Trailhead` (`:114-115`) | `2026-06-10-welcome-to-field-notes`, `Welcome to Field Notes` |
| `This month's trail conditions and volunteer calls.` (`:129`) | `This month's news and open calls.` |
| `trailheadView`, `trailhead-view`, `Trailhead View`, alt `A gravel trailhead parking area ...` (`:158-164`) | `morningView`, `morning-view`, `Morning View`, alt with no "trailhead" |
| `trailMap`, `trail-map`, `Trail Map`, and its alt (`:212-216`) | `areaMap`, `area-map`, `Area Map`, alt `A hand-drawn map of the three most-used entrances.` |
| `{ value: 'trail-guide', label: 'Trail Guide' }` (`:254`) | `{ value: 'how-to', label: 'How-To' }` |
| `volunteer-spotlight` (`:259`) | `member-spotlight` |
| Body and spellcheck text at `:333,344`, `gear` if it reads outdoor | Follow the table. |

`cabin-porch`, `lake-sunrise`, and `community-news` stay.

- **Mechanism:** `git mv` each renamed PNG, keeping the 16-hex hash in the name: the hash comes from the bytes, which don't change
  (`manifest.ts:320-324`). Fix the stale citation at `fixtures.ts:145`: `CairnAdminShell.svelte:431-434` is now `:532-535`.
- **Test:** `reproductions-stories.test.ts` passes on the new names.
- **Acceptance:** `grep -rn -i -E "trailhead|trail[- ]?(guide|map)|trail conditions|volunteer|north ridge" src/lib/reproductions src/tests/component/reproductions-stories.test.ts docs/editors`
  prints nothing. `docs/editors/manage-your-tag-vocabulary.md:14`'s caption matches the new tags. `## Decisions` lists the table, and notes
  that `ReproContext.svelte:75-79` says cairn.pub serves these files at `/repro-assets`, so its next pin bump picks up the new names.

### T9: Close

- **Class:** `ordinary`. **Minutes:** 40.

1. Fresh `docs-fact-checker` over the `docs/editors` and `docs/admin` diff. Fix each wrong claim.
2. `cairn-register-editor` isn't owed: the changes are string swaps and short sentences, and the page rewrite in T5 stays
   a small edit. `check:docs-gate` carries the prose floor.
3. Whole-branch `standards:diff-reviewer`, loading `standards:svelte-reviewer`, `standards:daisyui-a11y-reviewer`, and
   `standards:go-conventions`. `standards:web-auth-security-reviewer` reads ergonomics 15 by judgment, and also reads T3's `requireEngineAccess`
   move: `target.concept` from a route param now reaches the `auth.access.refused` log unvalidated. One batched fix chain follows.
4. Render read in the main loop. Run `npm run package`, confirm port 4391 is free as in T1, then from `examples/showcase` start in the background
   `VITE_CAIRN_E2E=1 npm run build && npx wrangler dev --port 4391 --inspector-port 4392 --var CAIRN_DEV_BACKEND:1 --var PUBLIC_ORIGIN:http://localhost:4391`.
   Read `/admin/posts` (filters, a Details pane with rows), an entry's edit page, `/admin/media`, the Publish all confirmation with a title,
   `/admin/history`, and `/admin/settings` at 320. Dispatch `standards:visual-verifier` on anything that moved. Stop the server.
5. A red visual baseline: `gh workflow run e2e.yml --ref worktree-admin-rest-run -f update_snapshots=true`. Pull the bot's commit, read the
   render, and list it. A held run on that commit: `ci-green` exit 4 and the approve command it prints, when the actor is `github-actions[bot]`.
6. `CHANGELOG.md` `## Unreleased` finalized, `MIGRATION-NOTES.md`, `tool/CHANGELOG.md`.
7. `BACKLOG.md`: close each folded item. #180 stays open, cut to claim 5, with `Placement: Pass 7`, and #238 stays open with its remainder. New
   items take the next free number on `main` at merge.
8. After every docs and code edit above: `npm run emit:template`, then `git status`, and commit only what it changed. `npm run check:surface -- --update`.
   `npm run check:docs-gate`.
9. Delete `docs/internal/plans/2026-11-01-admin-rest-*` in the final commit. Check the conductor's prompt needs nothing from them first: it's
    committed on `worktree-admin-rest`, so it survives.
10. Confirm CI is green on the head, its e2e job included, which carries T1's and T3's end-to-end proofs. Mark the PR ready. It carries the brief, what
    landed, `## Decisions`, `## Planning misses`, `## Tooling`, and the score. Stop.

**`## Decisions` must carry:** the #190 limit, #237's blocking side effect, each design-note call, ergonomics 15's departure from the audit's "reuse
that helper", the #180 claim 5 and #238 server halves set aside to pass 7 as real dependencies the map missed, #238's paste and trim set aside under the
sheet's "new product or taste question" row, the #173 table, the executor model reading, each test changed by a standing answer, that the conductor
merges where the sheet's `ordinary` row says the executor does, and the #193 fallback: a never-published entry shows its id, the reversible
recommended reading. The options not taken: (b) read each pending branch's file, one subrequest per entry on the stream; (c) humanize the slug, a
guessed title rather than a real one.

**`## Tooling` starts with these, from planning:**

- The worktree guard refused `cd` to the main checkout, compound git forms, a shell function around `sed`, and a `grep` with process substitution
  over `git branch`. Noted by #176 and `tool-gates`; add this session's forms.
- `gh pr diff 180` refused escape sequences and wrote an empty file. `git diff origin/main...origin/<branch> -- <paths>` works.
- `standards:backlog-sweep`'s full-sweep trigger fires on items filed days ago.
- #241: the fast lane doesn't select the tool gate on an events change.
- The `Explore` sweep agent had no Grep or Glob in this run.
- PRs #178 and #180 merged during the plan's review, so its base moved and `BACKLOG.md` conflicted. The plan's commits
  were unpushed, so they replayed on `main`, and the citations were rechecked. A planner's guard against this is
  fetching `main` once more before the fold.
