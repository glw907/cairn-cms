# create-cairn-site Pass T5: the browser door (template repo plus Deploy button)

> **For agentic workers:** each implementable task is dispatched to `cairn-implementer`
> (pinned Sonnet), test-first. The main loop reviews each diff and confirms the full gate
> (targeted test, `npm run check` 0/0 at the root, `npm test` exit 0 in
> `packages/create-cairn-site`) before the next dispatch. Tasks marked **[main loop]** run in
> the orchestrating session because they are live, browser-bound, or credential-bearing.
> Tasks marked **[spike]** must not be dispatched before Task 1 has answered their question; a
> spike answer of "no" or "unknown" re-plans its dependent task rather than implementing
> against the closest guess. A task instruction naming a concrete code shape, file path, or
> document state is a claim to verify at the first task that touches it, never an instruction
> to follow blind (the T4a/T4b/T4b.1/T4c lesson, four times now).

**Goal:** ship the browser door: the public `glw907/cairn-waymark-template` repo with the
Deploy-to-Cloudflare button, generated wholesale from the bake plus an overlay, synced by a
release-time workflow, finished by a printed checklist, plus the live CLI e2e T4c left unrun.

**Architecture:** no new CLI surface and no engine change. One new script
(`sync-template-repo.mjs`) composes the existing bake with a small overlay directory and
pushes the result to the template repo; one new GitHub Actions workflow drives it; the
checklist is prose in two places; the rest of the pass is live verification with evidence.

**Spec:** `docs/superpowers/specs/2026-08-12-create-cairn-site-t5-design.md`. Its one central
platform claim (the umbrella's button behavior, dated 2026-08-09) has never been observed;
Task 1 exists to observe it, and every downstream copy claim waits for it.

**Prerequisite:** T4c is merged to `main` and this pass runs in a fresh worktree off `main`.
The live e2e proves chapter 3, which exists only post-merge.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, the existing `bake-template.mjs` /
`emitTemplate` pipeline, git over HTTPS with a fine-grained PAT, GitHub Actions.

## Global Constraints

- The runtime library (`src/lib`) is untouched; `package.json` (root and package) versions are
  untouched. No engine reference page changes.
- No secret lands in any repo. The sync PAT is scoped to the single template repo, minted by
  Geoff, stored via the age-store flow (`secret-set.sh`, registry entry), and reaches CI only
  as a GitHub Actions secret. It never appears in argv, logs, or fixture text.
- **Never a force push, anywhere.** The sync replaces the generated tree via a normal commit
  on the template repo's `main`; history accumulates.
- The single source is enforced: no file in the template repo is ever hand-edited; the sync
  regenerates the whole tree. A second sync on an unchanged tree makes no commit, asserted by
  test, not by reading.
- The sync script reuses the existing bake (`packages/create-cairn-site/scripts/`
  `bake-template.mjs` / the repo-root `emitTemplate`); it never forks or re-implements the
  emit or prune logic. Verify the bake's actual invocation shape before wiring it.
- Sync-script tests run against a local bare-repo fixture: zero network, no GitHub, no PAT.
  No suite may touch the operator's desktop (`test/no-desktop.mjs` stays loaded).
- Gallery conventions are read from Cloudflare's current `cloudflare/templates` contribution
  docs at execution time and **linked, never restated** in our files; if the conventions put
  metadata inside `package.json`, the overlay applies a keyed merge, not a file replace.
- Every platform claim written this pass carries a date. Every fixture or copy claim about
  the button flow cites the spike doc.
- Owner-facing copy claims what the spike observed, in the T4b admission-copy register: each
  checklist item names its surface (dashboard page or CLI command) and its cost.
- Production domains, production repos, and the account's existing Builds wiring are
  untouchable. The spike and the e2e use scratch repos, a scratch site, and the scratch
  domain only. The "Cloudflare Workers and Pages" App install for glw907 is not cycled
  (T4c spike step 2 censused it; 907-life depends on it).
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`); the em dash is
  banned in comments.
- Root `CLAUDE.md` is at its context ceiling; if any step must add there, it trims first.
- Hand steps for Geoff are batched and named per task; every one lands in the pass ledger.

### Task 1: The button spike **[main loop]** (gates Tasks 2, 4, 5, 6, and the T5b brief)

**Files:** Create `docs/internal/<run-date>-t5-button-spike.md` (dated the day it runs).

The live observation of the umbrella's claim, Geoff in the browser, findings captured
verbatim as the pass's copy and fixture source. Record amendments to this plan in a "Spike
amendments" section above Task 2, superseding task text where they conflict, exactly as T4c
did.

- [ ] **Step 1: Build the spike copy.** Run the bake into a scratch directory; strip the
  `@glw907/cairn-cms-dev` devDependency and the dev-server shim it serves (spec ruling 6;
  the copy never runs `npm run dev`). Confirm the engine dependency spec resolves on the
  public registry (`npm view @glw907/cairn-cms@<spec> version`); if it does not, stop and
  take ruling 6's fallback (a `next`-tagged prerelease) before proceeding.
- [ ] **Step 2: Publish the scratch repo.** Push the spike copy to a new public scratch repo
  (`glw907/cairn-t5-spike`; public because the deploy flow must read it anonymously, and
  record whether that assumption is even true). Verify `npm install && npm run build` passes
  from a clean clone first: a broken build would make every button observation ambiguous.
- [ ] **Step 3: The button run.** Construct the deploy URL against the scratch repo, record
  the URL format actually honored, and hand Geoff the browser. Capture, with screenshots or
  transcribed dashboard text: the prompts shown (names, secrets, plan gates), whether the
  two D1 databases and the R2 bucket are provisioned from placeholder ids and what ids and
  names result, what happens to the `send_email` binding, what is written back into the
  created repo (diff it against the spike copy: names, ids, `account_id`, anything), where
  prompted secrets land, and the Builds wiring left behind (connection, trigger, build
  token), read back through the same Builds API reads T4c's spike used.
- [ ] **Step 4: The serving check.** Does the deployed site build and serve on `workers.dev`?
  If the build dies, capture the log tail and where it died (T4c's probe died at the first
  D1 binding; same shape or new?). A dead build is a finding, not a failure of the spike.
- [ ] **Step 5: The ledger entries.** Record the flow's plan requirement, the GitHub
  authorization moment, and the browser-moment count for STATUS carry-forward 4. Record
  every scratch artifact created, in a teardown table (the T4c standard: verified later by
  re-listing, not by trusting deletes).
- [ ] **Step 6: Bank and amend.** Commit the spike doc; write the amendments section; state
  which dependent tasks are cleared, which checklist items the button run proved necessary,
  and whether the T5b brief's premise (the button leaves real work undone) held.

### Task 2: The overlay and the sync script **[spike]**

**Files:** Create `packages/create-cairn-site/template-repo/README.md`,
`packages/create-cairn-site/template-repo/LICENSE`, gallery metadata per verified
conventions; create `packages/create-cairn-site/scripts/sync-template-repo.mjs` and
`packages/create-cairn-site/scripts/sync-template-repo.test.mjs`.

**Interfaces:** Produces a CLI-invocable script:
`node scripts/sync-template-repo.mjs --remote <url-or-path> [--dry-run]`, exit 0 on success
and on no-op, exit 1 with a printed reason otherwise. Task 3's workflow and Task 4's first
dispatch consume exactly this invocation.

- [ ] **Step 1: Failing tests first.** Against a local bare-repo fixture: (a) a first sync
  produces one commit whose tree is bake output plus overlay, with the overlay README
  replacing the bake's; (b) a second sync with nothing changed makes no commit; (c) a hand
  edit planted in the remote is gone after the next sync; (d) `--dry-run` prints the plan
  and pushes nothing (assert the remote's ref is unmoved); (e) if conventions required a
  `package.json` merge, the merged keys are present and the bake's own keys are intact.
- [ ] **Step 2: Implement.** Reuse the bake; apply the overlay; clone, compare, commit, push.
  Plain git subprocess or isomorphic approach, whichever the existing scripts idiom uses;
  verify what `bake-template.mjs` does before choosing.
- [ ] **Step 3: The README content.** The Deploy button (URL format from the spike), what
  the button does and does not do (from the spike, cited), the completion checklist (each
  item: surface plus cost), the C3 invocation for extenders, the pre-release notice (spec
  ruling 6; removed at release one by editing the overlay, not the repo). License matches
  the engine's (MIT).
- [ ] **Step 4: Gate and commit.** Targeted tests, root `npm run check` 0/0, package
  `npm test` exit 0. Commit.

### Task 3: The sync workflow

**Files:** Create `.github/workflows/sync-template-repo.yml`. Verify the existing create-site
CI workflow's name and glob first (`grep -rl create-cairn-site .github/workflows/`) and
follow its idiom.

**Interfaces:** Consumes Task 2's script invocation verbatim. Fires on `release: published`
and on `workflow_dispatch`; reads the PAT from a GitHub Actions secret named in the workflow
and documented in the age registry.

- [ ] **Step 1: The workflow.** Checkout, Node setup pinned to the repo's engines floor,
  `npm ci`, run the sync script against `glw907/cairn-waymark-template` with the PAT in env,
  never in argv. No force-push flag exists anywhere in it.
- [ ] **Step 2: The secret's paper trail.** Hand step for Geoff, batched with Task 4's:
  mint the fine-grained PAT (single repo, contents read/write), run `secret-set.sh`, add the
  registry entry, set the Actions secret. The plan step is the checklist for it; the token
  value never transits this repo or this transcript.
- [ ] **Step 3: Lint and commit.** `npm run check` 0/0 at root (workflow files ride the
  repo's YAML hygiene), commit. The workflow cannot be end-to-end tested until Task 4; say
  so in the commit body rather than claiming green.

### Task 4: The template repo, created and first-synced **[main loop]** **[spike]**

**Files:** none in this repo. Creates `glw907/cairn-waymark-template` on GitHub.

- [ ] **Step 1: Create the repo** (public, description, no initial commit) with `gh`.
- [ ] **Step 2: First sync by manual dispatch.** Run the Task 3 workflow via
  `gh workflow run`; verify the repo's tree equals bake plus overlay by clone and diff, not
  by reading the Actions log.
- [ ] **Step 3: Idempotence live.** Dispatch again; verify no second commit landed.
- [ ] **Step 4: The button URL.** Verify the README's rendered button resolves (the URL
  format the spike recorded). Do not click through to a second live deploy; the spike
  already owns that evidence.

### Task 5: The checklist in the guide **[spike]**

**Files:** Modify `docs/guides/deploy-to-cloudflare.md`.

- [ ] **Step 1: The button door section.** The guide gains the button as its second door:
  when to choose it, the deploy URL, and the completion checklist, same steps as the README
  with the guide carrying the detail. Copy cites only spike-observed behavior; the
  Workers-plan cost framing follows `configure-auth-and-d1.md`'s existing "Choose a Workers
  plan" section rather than restating it.
- [ ] **Step 2: Register and gates.** The docs register standard applies
  (`docs/internal/docs-register.md`); Vale's Google package must pass (`guides/` is in
  scope); `npm run check` 0/0. Verify the tutorial and readiness guide only if their current
  copy contradicts the two-door story; do not add pointers for symmetry.
- [ ] **Step 3: Commit.**

### Task 6: The C3 contract, verified live **[main loop]** **[spike]**

**Files:** evidence into the pass post-mortem; no code expected.

- [ ] **Step 1:** `npm create cloudflare -- --template glw907/cairn-waymark-template` into a
  scratch directory, against the real synced repo. Record the exact invocation, what C3
  prompts for, and whether the resulting tree installs and builds. The known caveat: until
  release one, `npm install` fails on the unpublished dev backend; record the exact failure
  and verify the README's pre-release notice names it. If C3 itself refuses the repo shape,
  that is a Task 2 amendment (overlay structure), not a documentation note.

### Task 7: The live CLI e2e **[main loop]** (the T4c fold; needs Geoff's browser)

**Files:** evidence per hop into the pass post-mortem; teardown additions to the spike doc's
table.

- [ ] **Step 1: Preconditions.** Confirm `~/.config/cairn/sites` is empty (a cold run is the
  point), T4c is merged, and the tarball path is exercised: `npm pack` the tool package and
  run `npm create` from the tarball, not from the worktree source.
- [ ] **Step 2: Chapters 1 through 3, cold.** A scratch site on the scratch domain: scaffold,
  GitHub chapter (this mints the **fifth** GitHub App; the App creation and the OAuth trips
  are Geoff's browser moments, batched), chapter 2 to a terminal step, chapter 3 through
  connect, trigger, reconcile (the `reauthorize` trip, the one surface no fake has proven),
  and the build watch to `builds-live` with the marker checks passing.
- [ ] **Step 3: Evidence per hop.** Each hop's outcome recorded with the T4a acceptance
  idiom: state-record transitions, invocation-log assertions where fakes ran, raw API reads
  where live. A hop that parks records the park, the printed re-entry command, and the
  resume.
- [ ] **Step 4: Preserve, do not tear down.** The site, App, and saved state persist for T4d
  (spec ruling 1). Add every new artifact to the teardown table marked "after T4d". The
  App-count ledger in STATUS ticks to five.

### Task 8: T5b brief, records, and pass close **[main loop]**

**Files:** Modify `docs/superpowers/specs/2026-08-12-create-cairn-site-t5-design.md` (the T5b
brief lands as a dated addition), `ROADMAP.md`, `docs/STATUS.md`, this file (post-mortem).

- [ ] **Step 1: The T5b brief.** Written from the spike's findings into the spec's T5b
  section: what the button actually leaves undone, the admission states a button site can be
  in, the dedupe obligations, the park shapes, and its queue slot (after T4d unless argued
  otherwise). If the spike proved the button leaves nothing material undone, the brief says
  so and T5b dies; that outcome is legitimate.
- [ ] **Step 2: ROADMAP and STATUS.** T5's line moves to done; the gallery submission and
  T5b are filed into the tiers where they bite; STATUS's next action points at T4d with the
  estate-reuse note; the browser-moment counts and the App ledger update.
- [ ] **Step 3: The pass-end ritual** (`cairn-pass`): `code-simplifier` over the changed
  code, the reviewer fan-out sized to the pass, changelog entry under `## Unreleased` (the
  sync workflow and template repo are consumer-visible at release one), the CI gate list
  re-derived with `grep -l pull_request .github/workflows/*`, post-mortem in this file,
  budgets scored, cold-start test for the context clear.
