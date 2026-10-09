# Engine pass B before stage 2b: scaffold, dev, and schema

**Goal:** Land pass B of the engine pass that runs before draft docs stage 2b. The signups demo
leaves the scaffold, `create-cairn-site` stops provisioning `APP_DB`, and the dev backend reads the
site's real content. The dev package ships built `dist/`, and the engine supplies the dev-build
define. The scaffold gains an admin error page, a types script, and a correct feed. Composition
refuses three bad declarations, the sanitize floor holds, two silent degradations warn, the
site-config path is declared once, and `cairn-audit` can fail on advisories. The pass closes under
`## Unreleased`.

**Architecture:** Four segments on one worktree. S1 changes the scaffold and its provisioning. S2
moves the dev package to `dist/`, moves the dev-build define into the engine's Vite plugin, and fixes
`cairn-guidance check`. S3 adds the composition and build-time checks. S4 runs ruling 5's dev
backend (fork 1 ruled: in-memory saves with a persistent notice), and then the docs and records task.

**Tech stack:** SvelteKit 3, `@sveltejs/adapter-cloudflare` 8, svelte 5 runes, Vite 8, wrangler 4,
vitest (unit, component, and workerd integration projects), Playwright, Node `node:test` for
`create-cairn-site`. No Go change: the doctor is pass A's.

**Spec:** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `0c476887`, "Pass B"
under "Sizing and the split", plus each item's section. Owner rulings:
`docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`. Fold record and owed errata:
`docs/superpowers/research/2026-10-07-engine-pass-pre-2b-spec-fold.md`. Line numbers in the spec and
in this plan are `draft-docs-2a`'s at `2b37ae78`; Task 0 re-reads every one on `main`. Where this
plan and the spec disagree, stop and report, except under "Decisions this plan takes".

**Pass class:** `engine-logic`. Overrides: Task 1 (the bake) is `sweep`; Task 2 (`create-cairn-site`
provisioning) Task 5 (B7), and Task 8 (C5's security floor) are `auth-data`; Task 11 is `docs`. Task 3 mixes two `sweep` items (A5,
B3) with two `engine-logic` items (B2, D2) and runs as `engine-logic`, the stricter class (fold
record V-m5's precedent); its A5 and B3 items keep their grep post-conditions, and A5 keeps its close
capture read. Task 8 runs as `auth-data` (`passClass: "auth-data"` in its args), not `engine-logic`, because the
runner's `engine-logic` bar sets `coverageBlocks: false` and demotes a `coverageOnly` finding to
`nonBlocking` (`~/.claude/workflows/pass-execute.js:264-267,345-360`), which would accept a missing
C5 mutation proof on the first review. `web-auth-security-reviewer` is named on its C5 item. The
close runs the union: `auth-data`'s security review and live auth smoke, and `sweep`'s capture.

**Token ceiling:** 14.0M for the whole pass, chains plus close (fork 3, ruled by Geoff on
2026-10-08). The basis below sums to 12.1M; the remaining 1.9M is unallocated reserve. Basis:

| Item | Budget |
| --- | --- |
| Task 0 pre-flight and baseline gate | 0.30M |
| Nine Sonnet chains (Tasks 1 to 9): 0.55M each, the full-tier rate pass A and the SvelteKit 3 pass use, plus 0.10M for each `auth-data` chain (2, 5, 8) and 0.10M for Task 3's four items | 5.35M |
| Task 10, ruling 5 (overlay, workerd guard, notice, bake marker, its records) | 0.90M |
| Task 11, docs and records | 1.20M |
| Three segment pre-flights after Task 0, at 0.10M | 0.30M |
| One fix round per segment in reserve | 1.10M |
| Close: simplifier, gates, consumer proof, four reviewer seats and the `visual-verifier` read, one fix chain, smoke, ledgers | 2.95M |
| **Total** | **12.10M** |

At 80 percent (11.2M) the conductor finishes the task in flight, writes STATUS, and asks one
combined question at the next segment boundary. It starts no new segment past 11.2M without an
answer. The SvelteKit 3 close's fix chain alone cost about 1.95M against about 1.45M budgeted for
the whole close (`2026-10-03-sveltekit-3-upgrade.md:1562`), and that pass ended at about 14.7M
against 12.4M. The close line carries that record.

**Checkpoint interval:** one segment (three tasks or fewer). STATUS is written at the end of Task 0
and of S1, S2, S3, and S4, at any split, before any question to Geoff, and before any stop.

**Segments** (each ends on a green commit):

| Segment | Tasks | Boundary proof |
| --- | --- | --- |
| S0, pre-flight | 0 | the Ledger entry; preconditions hold; baseline F green |
| S1, scaffold | 1, 2, 3 | F green on the head; pushed; CI `scaffold`, `create-site`, and `e2e` green |
| S2, dev package and build | 4, 5, 6 | F green; pushed; CI `scaffold`, `create-site`, `e2e`, and `test` green |
| S3, schema and composition | 7, 8, 9 | F green; `check:close` green |
| S4, dev backend and records | 10, 11 | F green; `check:close` green; pushed; every CI workflow green |

**Disjoint Files seams:** Tasks 1 and 2 have disjoint Files (the showcase, the exemplars, and
`.cairn-template.json`, against `packages/create-cairn-site/src` and `test`), but they must land
together. Neither is shippable alone: `nameWranglerResources` runs `replaceExact` on
`"database_name": "cairn-showcase-app"` and throws when that target is missing
(`packages/create-cairn-site/src/cloudflare/config.mjs:71-79,115`). Task 6
(`src/lib/guidance/**`) is disjoint from Tasks 4 and 5. Task 8 is disjoint from Tasks 7 and 9 if the
S3 pre-flight finds that D6's manifest build touches no file Task 7 or 9 names; otherwise S3 runs as
a chain. All tasks still run in sequence: one worktree, one index, one gate key. A seam matters only
if the conductor splits the pass.

**Split rule:** the pass carries no planned cut. If the ceiling forces one, cut at the S3 boundary.
Tasks 10 and 11 become a follow-up pass on the same branch, and stage 2b waits for both, since the
add-cairn caveat changes with ruling 5. A third task split inside this pass is the prompt to propose
that cut (fold record: three splits came from the fold).

**Branch and worktree:** `.claude/worktrees/engine-pre-2b-b`, branch `engine-pre-2b-b`, off `main`
after pass A merges (Task 0 checks this). **Worktree e2e gotcha**
(`docs/internal/durable-gotchas.md`, "A worktree showcase e2e proves MAIN's engine"): Task 0, Task 4,
and the close each do a from-scratch showcase install in the worktree and confirm with `realpath`
that both `examples/showcase/node_modules/@glw907/cairn-cms` and `.../@glw907/cairn-cms-dev` resolve
into the worktree.

**Execution mode:** `pass-execute` by name, one invocation per segment for S1 to S4, sequential
(`parallel` unset). Args: `repo` the worktree's absolute path, `implementer: "cairn-implementer"`,
`reviewer: "diff-reviewer"`, `passClass: "engine-logic"`, `gate` the F string, `maxFix: 1`,
`stopOnEscalate: true`, `commonNotes` carrying "Global constraints" and the pre-flight checklist from
`~/.claude/docs/pass-gate-economy.md`, and each task's own `passClass` where this plan sets one (Tasks 1, 2, 5, 8, and 11). `commonNotes`
reaches the implementer only, so a Global constraint no gate checks (no plan, pass, or task numbers
in shipped comments) binds the implementer and the close's reviewers, who read the whole diff, not
the per-task reviewer.
Each task maps as follows, because neither agent reads this plan (`cairn-implementer.md:12`,
`diff-reviewer.md:11`), and the reviewer's prompt carries `criteria` alone, never `notes`
(`pass-execute.js:602-615`):

- `criteria`: the task's **Outcome** block, then its **Acceptance** block, then the full text of
  every Decision the task cites, each verbatim.
- `files`: the **Files** block.
- `notes`: the task's own notes and mutation proofs, if any.

The computed tier rules every task's gate. The runner sizes it from the committed diff with
`scripts/checks/gate-tier.mjs`, and the runner's fallback is F. No task pins `gateTier` or sets
`gateLane`. A browser-bearing tier on the light lane would break `pass-gate-economy.md`'s lane rule,
and S and D are not tiers the script can pin. A task's **Gate** line names the tier its Files are
expected to compute. The conductor uses it as a cross-check, never as a floor. Where a task needs a
check its tier lacks, its Acceptance quotes the command. Task 0 is conductor-led, outside the
runner. `auth-data` fix rounds always run the full gate.

**Amended from pass A's S1 (2026-10-08; supersedes the paragraph above where they differ).** Each
task's gate is its blast radius: the tier its Files compute, plus the showcase e2e specs its change
reaches, with F once at each segment boundary and before merge. A computed string carries no
`E2E_PORT` export, so a task whose change reaches an e2e spec pins `gateTier` to its computed tier
and sets its own `gate`: `export E2E_PORT=4392 && <that tier's string> && npm --prefix
examples/showcase run test:e2e -- <specs>`. A task that reaches no spec keeps the computed tier.
Each segment's pre-flight names every task's reachable specs, and the conductor writes them into
that task's `gate`. The runner now runs a pinned task's own string unchanged on both sides (dotfiles
`492f584`); before that fix, pass A's Task 3 escalated on a gate-string mismatch alone. Fix rounds
take the runner's validated reduced gate: under `auth-data`, only a comment-only round reduces.

The local boundary F replaces its last step with `npm --prefix examples/showcase run test:e2e --
--grep-invert "site home|archive page 2"`. Those are the 20 `site-visual.spec.ts` tests that this
workstation's Chromium renders off its CI baselines (`durable-gotchas.md`); CI runs them on every
push. A boundary F is skipped when `cairn-run-gate --receipt '<F>'` matches the tree. Task 0's
baseline F uses the same local string.

**Models:** implementers `sonnet` (agent pin); `diff-reviewer` on `claude-opus-5-5` at `medium`; the
close's `web-auth-security-reviewer` at `high`. No task is upshifted at plan time. Each task is
specified to its acceptance criteria, and ruling 5's overlay semantics are spelled out in the spec.
No unattended re-dispatch upshifts. After a stop under "Unattended run", the resume path Geoff
approves may re-dispatch the stopped task on `model: opus`.

**Pre-flight (every segment):** before each segment's first dispatch, one `haiku` or `sonnet`
pre-flight lists every checkable claim the segment's tasks make about existing code at the worktree
`HEAD` and checks each. Claims include paths, line numbers, counts, symbol names, script names, and
workflow steps. The conductor amends this plan and commits the amendment before dispatching. Task 0
carries S1's list.

## Gates

Every gate runs through `cairn-run-gate '<string>'`; on exit 75, re-issue until it prints
`gate exit:`, and never poll a log. `CAIRN_GATE_LANE=light` only for a gate that launches no
browser. The engine's root `npm test` drives Chromium and is never light.

- **Full (F):** the `full` tier, printed by `node scripts/checks/gate-tier.mjs --range <base>..HEAD
  --pin full` and quoted in Task 0's Ledger entry. It is the engine tier plus the admin-visual run,
  `check:comments`, `check:surface`, CI's check list, and the whole showcase e2e. The showcase e2e
  runs on the port convention the pre-flight reads from `examples/showcase/playwright.config.ts` and
  `durable-gotchas.md`, after `ss -ltnp` shows no listener on that port.
- **Engine (E):** the `engine` tier of the same script: the docs gate, `npm run check`, the node
  projects, the serialized component project, and the `create-cairn-site` workspace suite.

The script's `--range` must name a non-empty range, so Task 0 prints both strings from the module
itself: `node -e "import('./scripts/checks/gate-tier.mjs').then(m => console.log(m.TIER_GATES.full))"`,
and the same with `engine`.

A lone unrelated test-file failure, or a component run printing `Cannot connect to the server in 60
seconds`, follows the rerun rule in `docs/internal/durable-gotchas.md` before it counts as red.

## Global constraints

- **The template is generated.** Every task that edits an emitted showcase file runs
  `npm run emit:template` in the same task, and `check:template` stays green at every commit.
- **The dev package is consumed built from Task 4 on.** After Task 4, any task that edits
  `packages/cairn-cms-dev/src` runs the root `npm run package` before a showcase build or e2e, and
  the report says so.
- **Reference and surface at every commit.** A task that changes a typed export, removes a
  documented symbol, or adds a public member makes the minimal reference edit and runs
  `npm run check:surface -- --update` in the same task. Task 11 writes the prose.
  `check:reference`, `check:reference:signatures`, and `check:surface` stay green at every commit.
- **The 2a extend pages are re-armed, never redrafted.** Their redraft is stage 2b's job, from
  corrected facts. A task whose change turns a docs gate red on a written 2a page
  (`check:snippets`, `check:symbols`, `check:facts`, a link) makes the minimal fix on that page in
  the same task, held to Vale's error tier, and names the page and line in its report for Task 11's
  re-arm list.
- **No new public surface** beyond what a task names. An implementer who finds a task needs another
  export, option, or `App.Locals` member stops and reports it.
- **Scratch work** lives under `$HOME/.cache/engine-pre-2b-b/`, never `/tmp` and never inside the
  repo. Fresh scaffolds and fixture consumers are built there. Every probe that installs a packed
  tarball uses a fresh directory and `npm install --prefer-online`, because a re-pack at the same
  version reuses the tarball name and a later install can serve the old build
  (`docs/internal/durable-gotchas.md`, "Pointing a consumer at unreleased engine work").
- **Servers** a task starts outside Playwright run on a port from an environment variable, never the
  showcase e2e's port, and stop on exit; the report says so.
- **No release.** No version bump (engine, dev package, or `tool/`), no tag, no publish, no
  `gh release create`. Engine passes land on `main` and never release (spec, "Settled decisions").
- **No edits outside this worktree** except the conductor's checkpoint commits of STATUS and the
  friction log on `main`, staged hunk by hunk per `cairn-pass`.
- **Comments.** TSDoc, no em dash in comments, no comment that claims what its assertion does not
  prove, and no plan, pass, or task numbers in shipped comments. The chassis is held to the engine's
  bar (`cairn-pass`, "The chassis").
- **Admin UI** follows `docs/internal/admin-design-system.md`: `data-theme` on a bare wrapper, a
  stock DaisyUI component before a home-grown one, and the admin voice for copy.
- **Commits.** Never `git add -A`; commit named paths; imperative mood; the attribution trailer the
  session names.
- **Friction.** Every dispatch reports cairn friction (docs gaps, engine improvements, DX snags);
  `pass-execute` asks for it and returns it in `outOfScope` tagged `cairn: true`.

## Preconditions on pass A (Task 0 verifies each on `main`)

Pass B branches from the `main` that pass A's merge produced. Task 0 checks each item below, and a
failed item stops the run before any dispatch.

1. **Merges.** `main` contains the `draft-docs-2a` merge and pass A's merge commit. Pass A's plan
   Ledger records its close, and `docs/STATUS.md` names pass B as the next action.
2. **The lead landed (pass A task 1).** `createAuthGuard`, `devBackendHandle`, and
   `createEditorRoutes` each take one required bag with a `runtime` member. `DevBackendConfig` has no
   `access` or `roles` member, and the dev handle attaches `runtime.access ?? {}`. The showcase and
   template hooks pass `{ runtime }` from `#chassis/cairn.server.js`. Tasks 1 and 10 build on this.
3. **The access map is inline on the adapter (pass A Decision 2).** The showcase and the template
   declare `access` as a member of the adapter in `src/theme/cairn.config.ts`, and `src/access.ts`
   is gone from both. The showcase-only `theme-kit` rule sits inside
   `cairn-template:exclude-start/-end` markers in that member. The emitted adapter's `access` holds
   only the `/admin/signups` rule. Task 1 removes that rule with markers alone.
4. **Pass A's edits to files pass B also edits.** D1's `verifyManifest` change in
   `src/lib/content/manifest.ts` landed, and the stale-manifest message still names
   `npm run cairn:manifest` (Task 3's B2). B9's `.dev.vars.example` and B11a's `secret.mjs` edits
   landed in `create-cairn-site` (Task 2 edits the same package). A6's `EditPage.svelte` change
   landed, and `{#each data.publishActions as action (action.label)}` is still the keying (Task 7's
   A13 premise). B5's 503 landed in the template's `/healthz` route.
5. **The records split with pass A landed as pass A's plan states** (its Decisions 8 to 11). On
   `main`, confirm each:
   - the seven new ledger entries and eight of the nine annotations, every one but
     `audit-adapter-navmenuconfig`, which is pass B's;
   - the `admin-toolkit.md` shell-only sentence and the functional-spec C7 and media-design
     amendments;
   - the ROADMAP rewrite (boundary-test amendment, batched rows with page tags, the Claude Code
     stage, the one-release path), with the "Engine pass before stage 2b" Now entry narrowed to
     pass B's scope; pass B removes that entry at its close;
   - every friction-log entry for a pass A fix, and every declined or batched entry, gone from the
     log; the entries for pass B's fixes still present;
   - `docs/STATUS.md`'s carry-forwards hold pass A's hand-off list: each 2a page pass A changed, with
     the fact ids that changed. Task 0 copies the list verbatim into this plan's Ledger, since a
     checkpoint STATUS rewrite can drop it before S4. Task 11 reads it from the Ledger for the
     `relink.json` re-arm list, which is pass B's alone.

   A missing item is a precondition failure: the conductor reports it, never back-fills it silently.
   Also record whether `docs/internal/record/harvest/relink.json` has any stage-2b page re-arm entry
   yet (expected: none). The file already holds `"stage": "2b"` link-repair entries, so the probe
   counts only entries that carry a `facts` array. No check parses the file
   (`scripts/checks/docs-links.mjs:168` names it in a comment only). Task 11 defines the entry shape.
6. **Fork 2** (anonymous `/healthz?live=1`) is ruled and landed in pass A. Pass B does not depend on
   it; Task 0 records the ruling.
7. **Fork 1** (where a dev-admin save lands) is ruled yes (Geoff, 2026-10-08). Task 10 builds as
   written.

## Decisions this plan takes

1. **Ruling 5 runs in S4, not third.** The spec's pass B list is an order, not a dependency chain,
   and nothing in it needs ruling 5 early. B1's `dist/` build lands
   first, so ruling 5's code is proven through the built package. Task 10 owns every ruling-5
   record. Those records are the `seedContent`
   and `content: 'fixtures'` lines in `CHANGELOG.md` and `migration-notes.md`, ruling 5's facts
   bullets, the README and the `DevBackendConfig` doc comment, and the ruling-5 items on the
   `add-cairn-to-a-sveltekit-app` and `scaffolded-site-files` re-arm entries. They also include
   ROADMAP's B12 removal and the `MEDIA_BUCKET` watch verdict. Task 11 owns the rest. It leaves
   `seedContent` out of its grep and its clause list, and it re-reads Task 10's lines only when
   Task 10 ran first.
2. **B1 covers the publish path.** The spec says every path that resolves the dev package by name
   already runs the root `package` script. The `publish-dev` job in `.github/workflows/publish.yml`
   does not. It publishes straight from the checkout, with no install and no build, so
   `files: ['dist']` would publish an empty package at the release. Task 4 adds the build to that job
   and proves it with `npm publish --dry-run`.
3. **The dev-admin notice (fork 1, "Yes") shows only when the dev backend serves real content**
   (`content: 'repository'`). The risk the notice answers is real writing that a restart drops, which
   fixtures mode does not carry. The showcase e2e runs in fixtures mode, and a notice there would
   change every CI-canonical admin-visual baseline. The notice describes the content store, so the
   signal is one optional read-only member on `Backend` (`src/lib/github/backend.ts`), named
   `ephemeral` and typed `true`. The dev package's `'repository'` backend sets it, and
   `createGithubApp`'s backend never does, so a production request never carries it by
   construction. The dev handle already injects its store as `locals.cairnBackend`, which
   `CairnEvent.locals` already types (`src/lib/sveltekit/types.ts:66-72`). The shell load reads
   `event.locals.cairnBackend?.ephemeral` directly, never through the provider resolve: the notice
   describes the dev store, a production request carries no `cairnBackend`, and the shell load needs
   no backend call at all (resolving the provider is lazy, `src/lib/github/backend.ts:176-178`, and
   the token mints only inside a backend method). It maps the member to one optional `AdminShellData` member, and
   `CairnAdminShell` renders one DaisyUI `alert`. That is two public members, with no sixth
   `App.Locals` key and no change to `CairnEvent.locals`. Geoff's fork 1 ruling accepted this scope
   with the recommendation.
4. **A5's e2e reaches a 403 through a showcase-only fixture route.** The dev backend always mints an
   owner session (`packages/cairn-cms-dev/src/handle.ts:160-166`), so no access-map refusal is
   reachable in the showcase e2e. A route under `src/routes/admin/` whose load throws `error(403)`,
   listed in `.cairn-template.json`'s `exclude`, is the fixture. An unknown `/admin/<path>` 404 is the
   second case, since it renders through the same page.
5. **The provisioning grep is narrowed.** The spec's post-condition ("no `APP_DB` or `-app` in
   `create-cairn-site`'s sources and transcripts") over-matches legitimate names: `--app-name`,
   `builds-app-not-authorized`, and the test slug `alpine-club-resume-app`. It also reaches the
   transcript fixtures, which Decision 10 keeps unedited. Task 2 uses the pattern below over sources
   and tests, excludes the transcripts directory, and names each remaining hit as unrelated.
6. **D5's default is a pinned twin.** `packages/create-cairn-site/src/site-config-path.json` already
   holds the canonical site-config path that the scaffold bakes and the Go doctor embeds
   (`scripts/build/emit-tool-conditions.mjs:19-22`). The engine cannot read that file at runtime, so
   its new `editor.siteConfigPath` default is a committed twin, and a unit test pins the two
   together. This is the sanctioned form under `read-from-the-source-rule`, per
   `audit-cli-config-site-config-check`'s 2026-09-02 amendment (a committed twin plus a sync test).
   The third copy, `DEFAULT_SITE_CONFIG_PATH = 'src/lib/site.config.yaml'` at
   `src/lib/sveltekit/content-routes-settings.ts:124`, is deleted.
7. **The records split follows pass A's plan.** Pass A writes the seven new ledger entries, eight
   of the nine annotations, the ROADMAP rewrite, and the C7 and media-design amendments, and clears
   every declined and batched friction entry. Pass B writes the `audit-adapter-navmenuconfig`
   annotation, D5's functional-spec amendment, the whole `relink.json` re-arm list (pass A's pages
   from its STATUS hand-off list, plus pass B's own), and removes ROADMAP's narrowed engine-pass
   entry. Each pass clears the friction entries for its own fixes.
8. **ROADMAP watches pass B trips get a verdict in Task 11.** Pass B changes `DevBackendConfig`, which
   is the trigger three ROADMAP watches name. They are the `APP_DB` overwrite, the media-seed
   `MEDIA_BUCKET` double, and the custom-screen skill traps with the missing `cairnAccess`. The spec
   rules on none of them, so each gets a verdict: the `MEDIA_BUCKET` double in Task 10 (it is ruling
   5's R2 read-through), the other two in Task 11.
9. **`form-anatomy.md` is edited only if the S1 pre-flight finds a Signups claim in it.** The spec
   names it among the three exemplars, but at `2b37ae78` it carries no Signups or scaffold claim; the
   claims sit in `exemplar-list.md` and `exemplar-detail.md`.
10. **Transcript fixtures are never edited.** The directory
    `packages/create-cairn-site/test/fixtures/transcripts/` holds recorded captures, and only a live
    re-capture changes one. Task 2 carries its acceptance in unit tests over the step's output and
    files the stale fixtures (`01c-resume.txt`, `01d-resume.txt` at plan time) in the friction log for
    the next capture, as pass A did for B11a (its Decision 5).
11. **The live smoke needs no owner click** (pass A's Decision 14). The smoke agent drives the
    magic-link round trip in headless Chromium: it requests a link, reads it from wrangler's local
    `send_email` message file, opens it, posts the confirm, and lands in `/admin`. No pass B task
    touches the magic-link path, and the spec needs no owner sitting (spec, "neither pass needs an
    owner sitting").
12. **A cross-version resume window is accepted.** A site scaffolded before this pass, whose setup
    stopped before its migrations ran, and which is then resumed by the new `create-cairn-site`,
    gets an `APP_DB` the deploy provisions but never migrates. Its Signups route then reads a
    database with no table. Only a setup interrupted across the one release after stage 5 reaches
    this case. Deriving the migration set from the site's own `wrangler.jsonc` would add new
    mechanism to `auth-data` provisioning code to cover it. The close's HISTORY entry records the
    window.

## Rulings for Geoff

**Fork 1, ruled yes (Geoff, 2026-10-08: "Recomendations accepted for Fork 1 and 2."):** a
dev-admin save stays in memory, plus one persistent DaisyUI `alert` in the admin shell. The notice
says edits are held in memory and discarded when the dev server stops. It shows when the dev
backend serves the site's real content, not in fixtures mode (Decision 3). The "No" alternative
(dev publishes written to disk) was not taken.

Fork 2 belongs to pass A.

**Fork 3, ruled (Geoff, 2026-10-08: "For Fork 3, ceiling at 14M."):** the pass ceiling is 14.0M,
with the 80 percent stop at 11.2M. The planned basis is 12.1M, priced from the chain rate pass A
and the SvelteKit 3 pass use (0.55M for a full-tier chain) and that pass's close record (its fix
chain alone cost about 1.95M against 1.45M for the whole close).

No other open ruling. Method calls this plan made are under "Decisions this plan takes". The
review's two low-stakes forks are decided there: the Firefox click goes (Decision 11), and the
cross-version resume window is accepted (Decision 12).

## Unattended run

Geoff wants this pass to survive a 10-hour unattended run, so every stop is planned here.

**The conductor rules alone on:**

- a `diff-reviewer` accept, and one re-dispatch on a `fix`;
- a second `fix` whose findings are all `commentOnly`, `testOnly`, or `coverageOnly`, on any task
  but Task 2, Task 5, and Task 8: accept with the notes batched to the boundary, or run
  one more round;
- a `cairn-run-gate` exit 75 (re-issue), a flake the durable-gotchas rerun rule covers, and a
  gate-string mismatch the runner raises (re-run the gate on the runner's resolved string);
- a pre-flight finding that a plan line number, count, or path moved (amend, commit, dispatch);
- an implementer's unspecified decision inside the task's constraints (recorded in the Ledger);
- an out-of-scope finding (verified, then filed to `docs/internal/docs-friction-log.md` at the next
  checkpoint, or dropped with a one-line reason);
- a CI red that matches Task 0's inherited expected-red set.

**These stop the run** (write STATUS with the resume prompt, then stop):

- a failed precondition at Task 0, or a red baseline gate;
- a second `fix` with any blocking finding, coverage included, on Task 2, Task 5, or Task 8;
- a behavior defect still standing after its one fix round, on any task;
- a third `fix` on any task;
- an `escalate` verdict naming an architectural question the spec did not settle, or an implementer
  report that a task needs public surface this plan does not name;
- a CI red outside the inherited set that one fix round does not clear;
- the 80 percent ceiling (finish the task in flight first);
- the battery stand-down at 11 percent (`~/.claude/docs/unattended-work-guards.md`).

**Owner-gated steps, batched at the end:**

1. The merge to `main` (Geoff's go; the PR leaves draft once CI is green).

Nothing else waits on Geoff. The live smoke is Claude's (Decision 11). Neither the A5 capture nor
the notice needs an owner sitting: the main loop reads both captures, and a fresh-context
`visual-verifier` grades them.

**Guards armed at launch** (`~/.claude/docs/unattended-work-guards.md`):

- the `/loop` fallback wake-up, dynamic pacing, with a 1200 to 1800 second fallback tick that checks
  the runner's journal and relaunches a dead run with `resumeFromRunId`;
- `claude-wf-guard <transcript-dir> implementer <run-id>` for each `pass-execute` run;
- the lid-switch hold, `systemd-inhibit --what=handle-lid-switch --who=engine-pre-2b-b sleep <seconds>`;
- a check that `systemd-inhibit --list` shows the `claude-awake` lease holder;
- after any harness restart, the full set re-armed, never only the guard for the relaunched run.

## Review focus

The inputs most likely to bite a real user that per-task tests would not exercise unprompted:

1. **A registry-installed dev package.** A consumer resolves `dist/`, never source, and the release
   job publishes `dist/` (Task 4, Decision 2, the close's consumer proof).
2. **A deployed Worker from a default build.** The engine's define resolves `false`, and no dev
   marker reaches the bundle (Task 5, the close's smoke).
3. **The dev backend under `wrangler dev`.** `'repository'` throws a message naming
   `content: 'fixtures'`, and the showcase e2e stays on fixtures (Task 10).
4. **A sanitize callback that mutates `strip` in place or allows `<script>`** (Task 8, C5).
5. **A site with no `editor.nav`** saving Settings and Tags (Task 9, D5).
6. **A fresh scaffold** that builds, reads `fresh` under `cairn-guidance check`, and carries no
   `APP_DB`, Signups route, or `content:` option (Tasks 1, 6, 10; CI `scaffold` and `create-site`).

---

### Task 0: Pre-flight (conductor, no gate)

**Outcome:** the start conditions hold and are recorded in this plan's Ledger.

1. **No live executor.** `pgrep -af` on the worktree path and the branch name finds nothing (never a
   pattern in the command's own text). No `engine-pre-2b-b` branch or worktree exists. The `main`
   checkout's `git status --porcelain` shows no warm edits pass B would collide with.
2. **Preconditions 1 to 7** above, each recorded with its evidence (`git log`, `git grep` output,
   file paths). Pass A's hand-off list is copied verbatim into the Ledger (precondition 5).
3. **Worktree.** Create `.claude/worktrees/engine-pre-2b-b` on `engine-pre-2b-b` from `main`'s
   head. Run `npm ci`, then a from-scratch showcase install (`rm -rf examples/showcase/node_modules`,
   then `npm ci --prefix examples/showcase`). `realpath` confirms the engine and the dev package
   resolve into the worktree. Then make CI's three preparation steps, which a fresh worktree lacks
   and without which the baseline F goes red on setup alone (pass A's Task 0, 2026-10-08): `npm run
   package`; bake the `create-cairn-site` template as `.github/workflows/test.yml` does (in
   `packages/create-cairn-site`, `node scripts/bake-template.mjs --to template --engine-spec
   "^$VERSION" --dev-spec "^$VERSION"`, with `VERSION` the root `package.json` version); and `npx
   svelte-kit sync` in `examples/showcase` (`check-public-skill.test.ts` fails on
   `$app/tsconfig` without it).
4. **Gate strings.** Print F and E from the module's `TIER_GATES` (under "Gates"; a `--range` on a
   branch equal to `main` is empty, and the script exits 1 before it reads `--pin`) and record both.
5. **Baseline.** One gate agent runs F in the worktree and returns the `gate exit:` line and its
   tail. The conductor quotes it to Task 1's reviewer as Task 0's gate evidence. A red stops the run
   with one message to Geoff.
6. **Draft PR and inherited CI.** Commit Task 0's Ledger entry (and any item 7 amendment) on
   `engine-pre-2b-b` first, since GitHub refuses a pull request with no commits between base and
   head. Then push, open a draft PR against `main` (so CI runs on every later push), and record
   that SHA's CI result as the inherited expected-red set.
7. **S1 pre-flight**, checked at `HEAD`, with the plan amended where a fact moved:
   - `examples/showcase/.cairn-template.json` lists `exclude` paths and does not yet list
     `src/routes/admin/signups` or `migrations-app`.
   - `examples/showcase/src/routes/admin/signups/` holds `+page.server.ts`, `+page.svelte`, and
     `actions.test.ts`. `examples/showcase/migrations-app/0000_signups.sql` exists.
   - The Signups `navLayout` entry sits at `examples/showcase/src/theme/cairn.config.ts:214`, with
     its comment at `:194`.
   - `examples/showcase/src/lib/log.ts` declares `admin.signups.misconfigured` in its site event
     union.
   - `examples/showcase/src/theme/components/admin-link.test.ts` has an `/admin/signups` case.
   - `examples/showcase/wrangler.jsonc` binds `APP_DB`. Its existing exclude markers (`:44`, `:55`
     at `2b37ae78`) wrap which bindings.
   - `src/tests/unit/emit-template-tree.test.ts:125-130` asserts the emitted bindings equal
     `['APP_DB', 'AUTH_DB']`.
   - `skills/cairn-admin-screens/references/exemplar-list.md:6-7` and `exemplar-detail.md:6-11` say
     "the Signups screen every scaffolded site ships", and the baked copies under
     `templates/waymark/.claude/skills/cairn-admin-screens/references/` match. Whether
     `form-anatomy.md` makes any such claim (Decision 9).
   - How the bake writes `.claude/` from `skills/` and `claude/`
     (`packages/create-cairn-site/scripts/bake-template.mjs:184-233`), so the exemplar edit lands in
     the source tree.
   - `packages/create-cairn-site/src/cloudflare/deploy.mjs:175` (`MIGRATION_DATABASES`),
     `chapter.mjs:119` (the two-database announcement), and `config.mjs:115` (the `-app` rename, with
     its comments at `:36` and `:48`). Their tests (`deploy.test.mjs:243,319-336`,
     `chapter.test.mjs:283`, `config.test.mjs:54-57,105-114`) and `README.md:138`. The two
     `WRANGLER_JSONC_FIXTURE` literals that carry `APP_DB` (`src/scaffold.test.mjs:23-26`, with the
     `alpine-club-app` assertion at `:268`, and `src/github/repo.test.mjs:67-70`). Which transcript
     fixtures show the two-database lines (`01c-resume.txt`, `01d-resume.txt` at plan time), for the
     friction filing; they are not edited.
   - That the template's `src/theme/cairn.config.ts` `access` member holds only the
     `/admin/signups` rule, and that no `src/access.ts` exists (precondition 3).
   - `src/lib/content/manifest.ts` stale message (`:373-377` at `2b37ae78`) names
     `npm run cairn:manifest`.
   - The bake's `package.json` transform is `transformPackageJson` in `scripts/build/emit-template.mjs`.
     `templates/waymark/worker-configuration.d.ts:2` records
     `wrangler types --env-file=.dev.vars.example --include-runtime=false`.
     No `cf-typegen` script exists in the showcase or template `package.json`.
   - `examples/showcase/src/chassis/feed.ts:20` renders through `cairn.rendering.render({ body,
     resolve })` with no fragment resolver and a root-relative media resolver.
     `createFragmentResolver` is exported from the path the feed can import.
   - No `src/routes/admin/+error.svelte` exists in the showcase or the template. The root
     `src/routes/+error.svelte` exists.
   - The facts candidate set for Task 11 (ids under Task 11), re-grepped over all of
     `docs/internal/facts/` for `signups`, `APP_DB`, `seedContent`, `devBuildDefine`, `configPath`,
     `cairn:manifest`, `itemLabel`, `two (D1 )?databases`, and `-app\b`.
8. **Dependency state.** `npm outdated` at the root, the showcase, and each `packages/*` manifest,
   recorded. Pass B takes no bump. A bump it would need goes through `dependency-upgrade` as its own
   question.
9. **Guards** armed per "Unattended run", and the spend through Task 0 recorded.

**Acceptance:** the Ledger carries items 1 to 9, and the plan is amended and committed where item 7
moved a fact.

---

## S1: scaffold

### Task 1: The signups demo leaves the scaffold (ruling 2, the bake)

**Pass class:** `sweep`. Disjoint Files from Task 2, but the two land together (see "Disjoint Files
seams"). **Decision 9.** **Spec:** "Ruling 2", whole-file and marked-span exclusions and the skill exemplars; pass B
task 1.

**Files:** `examples/showcase/.cairn-template.json`; the marked spans in
`examples/showcase/src/theme/cairn.config.ts` (the Signups `navLayout` entry and its comment, and
the `/admin/signups` rule in the adapter's inline `access` member, so the emitted adapter carries no
`access` member at all), `examples/showcase/wrangler.jsonc` (`APP_DB`),
`examples/showcase/src/lib/log.ts`, and `examples/showcase/src/theme/components/admin-link.test.ts`.
No `src/access.ts` exists to touch (precondition 3). In the exemplars:
`skills/cairn-admin-screens/references/{exemplar-list,exemplar-detail}.md` (and `form-anatomy.md`
only per Decision 9). Plus `src/tests/unit/emit-template-tree.test.ts`,
`src/tests/unit/skill-references-compile.test.ts` only if its extraction needs a fixture change, and
`templates/waymark/**` through `npm run emit:template`.

**Outcome:**
- The emitted template carries no `src/routes/admin/signups/`, no `migrations-app/`, no `APP_DB`
  binding, no Signups sidebar entry, no `admin.signups.misconfigured` event, and no `/admin/signups`
  test case. The showcase keeps all of them as the worked custom-screen example.
- The scaffold declares no `access`, the zero-config floor. The showcase keeps its full map inline
  on its adapter. The change uses markers only, under the emitter's line-granular rules
  (`scripts/build/emit-template.mjs:36` throws on a nested start):
  - One marker block wraps the whole `access` member, its doc comment included, and replaces
    pass A's inner `theme-kit` block.
  - `SiteLogEvent` (`examples/showcase/src/lib/log.ts:7`, one line today) is split onto one line
    per member, so the `admin.signups.misconfigured` member can sit in its own block.
  - In `examples/showcase/wrangler.jsonc`, the comma before the `APP_DB` object sits inside its
    block, so the emitted array stays valid JSONC.
- The exemplars stop saying every scaffold ships the screen. Each carries the shipped source inline
  and names `examples/showcase` as provenance. The baked `.claude/` copies match after re-emit.
- `@glw907/cairn-cms-dev` keeps `fake-app-db.ts` and its `APP_DB` layering; this task does not touch
  the dev package.

**Acceptance:**
- `emit-template-tree.test.ts` asserts `AUTH_DB` is the only D1 binding in the emitted
  `wrangler.jsonc`, and that no `src/routes/admin/signups/` and no `migrations-app/` exist in the
  emission. Fails today: the test asserts `['APP_DB', 'AUTH_DB']` and both paths are emitted.
- `git grep -nE "signups|Signups|APP_DB|migrations-app" -- templates/waymark ':!templates/waymark/.claude'`
  prints nothing. The `.claude/` tree prints only lines naming the showcase as provenance.
- A fresh bake (`packages/create-cairn-site/scripts/bake-template.mjs --to <dir>` under
  `$HOME/.cache/engine-pre-2b-b/`) installs from the worktree's packed tarballs and passes `npm run
  check` and `npm run build`. Its adapter has no `/admin/signups` href and no `access` member. The
  report quotes both exit lines.
- `skill-references-compile.test.ts` green; `check:template` and `test:emit` green.
- The showcase e2e, which still covers Signups, stays green as part of F.
- The computed gate green.

**Interfaces produced:** a scaffold with no access declaration and one D1 binding, consumed by Task 2
(provisioning one database) and Task 11 (facts).

**Gate:** computed; expected F (`examples/showcase/src/theme/` and `wrangler.jsonc` compute `full`).

### Task 2: `create-cairn-site` stops provisioning `APP_DB` (ruling 2, provisioning)

**Pass class:** `auth-data` (it edits D1 provisioning beside `AUTH_DB`). Lands with Task 1 (see
"Disjoint Files seams"). **Spec:** "Ruling 2", the `create-cairn-site` bullet; pass B task 2.
**Decisions 5 and 10.**

**Files:** `packages/create-cairn-site/src/cloudflare/{deploy,chapter,config}.mjs` and their tests;
`packages/create-cairn-site/src/scaffold.test.mjs` and `src/github/repo.test.mjs` (their
`WRANGLER_JSONC_FIXTURE` literals and the `-app` assertions);
`packages/create-cairn-site/README.md` (`:138`). The transcript fixtures under
`packages/create-cairn-site/test/fixtures/transcripts/` are not edited (Decision 10).

**Outcome:** the setup command provisions and migrates `AUTH_DB` only. `MIGRATION_DATABASES` holds
`AUTH_DB` alone, the announcement names one database, and the `-app` rename and its comments go. An
`AUTH_DB` migration failure still surfaces through its existing named path, and the resume flow still
works.

**Acceptance:**
- Test-first: a deploy test asserts exactly one `d1 migrations apply AUTH_DB --remote` invocation
  (fails today: two). A config test asserts the rewritten `wrangler.jsonc` carries one D1 database
  (fails today: two). A chapter test asserts the provisioning announcement names one database,
  `<worker>-auth`, and no `-app` name (fails today: it names both). These unit tests carry the
  acceptance the spec gave the transcripts. A mutation proof: re-adding `'APP_DB'` to `MIGRATION_DATABASES` turns the
  deploy test red (quoted, then reverted).
- ``git grep -nE 'APP_DB|migrations-app|showcase-app|\}-app\b|-app"|<site>-app|-app,|`-app`' -- packages/create-cairn-site ':!packages/create-cairn-site/test/fixtures/transcripts'``
  prints nothing. On `main` the last three alternatives match exactly `README.md:138` and
  `config.mjs:36,48`. A wider `git grep -n -- "-app"` hit is named in the report as unrelated
  (`--app-name`, `builds-app-not-authorized`, a test slug) (Decision 5).
- `git diff --stat main -- packages/create-cairn-site/test/fixtures/transcripts` is empty. The
  report names each fixture that still shows the two-database lines, and the conductor files them in
  the friction log at the S1 checkpoint as stale until the next live capture.
- `check:transcripts` stays green on the unedited fixtures.
- `cairn-run-gate 'npm run test:emit && npm run check:template'` exits 0; the report quotes the
  `gate exit:` line.
- The computed gate green; CI `create-site` on the segment push green.

**Interfaces produced:** none consumed later.

**Gate:** computed; expected `scripts` (the `create-cairn-site` suite, `npm run check`, and the
serialized component project), on the heavy lane.

### Task 3: The admin error page, the manifest message, the types script, and the feed (A5, B2, B3, D2)

**Pass class:** `engine-logic` (the stricter of its items). A5 and B3 are `sweep` items: grep
post-conditions, no test-first mandate. B2 and D2 are test-first. **Spec:** A5, B2, B3, D2; pass B
task 5. **Decision 4.**

**Files:**
- A5: `examples/showcase/src/routes/admin/+error.svelte` (new), a showcase-only fixture route under
  `examples/showcase/src/routes/admin/` (new, Decision 4) with its `.cairn-template.json` exclusion,
  and a new showcase e2e spec under `examples/showcase/e2e/`.
- B2: `src/lib/content/manifest.ts` and its unit test.
- B3: `scripts/build/emit-template.mjs` (`transformPackageJson`) only, never the showcase
  `package.json`: the showcase has no `.dev.vars.example` at its root, so the template's command
  would fail there. Plus `src/tests/unit/emit-template-tree.test.ts` (the B3 assertion).
- D2: `examples/showcase/src/chassis/feed.ts` and a feed unit test beside it.
- `templates/waymark/**` through `npm run emit:template`.

**Outcome:**
- **A5.** An error inside `/admin` renders inside the admin shell and its theme wrapper, with calm
  admin copy per the admin design system. A 403 and a 404 each read as the admin's own page. A
  layout-level failure still falls to the root error page, which SvelteKit requires, and the page's
  doc comment states that limit. It is a template file, not an engine export.
- **B2.** The stale-manifest error tells the reader to run `npx cairn-manifest`, the shipped bin.
- **B3.** The scaffold's `package.json` carries a `cf-typegen` script, the name Cloudflare's
  create-cloudflare templates use. Its command is exactly the one `worker-configuration.d.ts:2`
  records.
- **D2.** The scaffold's feed resolves `::include{...}` fragments through
  `createFragmentResolver(site)` and emits absolute `https://<origin>/media/...` image URLs.

**Acceptance:**
- **A5:** a showcase e2e visits the fixture route and asserts the 403 renders inside the admin theme
  wrapper (the shell's `data-theme` wrapper is an ancestor of the error copy) with the admin copy,
  not the public chrome. A second case does the same for an unknown `/admin/<path>`. Fails today: the
  root error page renders in public chrome. `emit-template-tree.test.ts` asserts the emission carries
  `src/routes/admin/+error.svelte` and not the fixture route. `check:template` green.
- **A5 capture:** the report attaches a capture of the 403 page under each admin theme (light and
  dark) from the e2e run, for the close's `visual-verifier` read.
- **B2:** the unit test asserts the stale-manifest error names `npx cairn-manifest`. Fails today: it
  names `npm run cairn:manifest`.
- **B3:** `emit-template-tree.test.ts` asserts the emitted `package.json`'s `cf-typegen` script
  equals the command on line 2 of the emitted `worker-configuration.d.ts`. Fails today: no script.
- **D2:** a feed unit test over an entry with an `::include{...}` and a media image yields the
  fragment's rendered text and an absolute `https://<origin>/media/...` URL. Fails today: literal
  include text and a root-relative URL.
- The computed gate green.

**Interfaces produced:** the admin error page, named in Task 11's facts and the re-arm list
(restrict-admin-access, scaffolded-site-files); the A5 captures, read at the close.

**Gate:** computed; expected F (an unclassified `admin/+error.svelte` computes `full`).

**S1 boundary:** F green on the segment head; pushed; CI `scaffold`, `create-site`, and `e2e` green;
STATUS written; S2 pre-flight dispatched.

---

## S2: dev package and build

### Task 4: The dev package ships `dist/` (B1)

**Pass class:** `engine-logic`. **Spec:** B1; pass B task 4. **Decision 2.**

**Files:** `packages/cairn-cms-dev/package.json` (`exports`, `files`, no `prepare`); a build config
for the package (a `tsconfig` for emit, beside the existing `tsconfig.json`); the root `package.json`
`package` script; `.github/workflows/publish.yml` (`publish-dev` job);
`scripts/checks/check-dev-package.mjs` and `src/tests/unit/check-dev-package.test.ts`;
`.gitignore` if `packages/cairn-cms-dev/dist` is not already ignored; `packages/cairn-cms-dev/README.md`
only where it names the source export.

**Outcome:**
- The package builds `.js` and `.d.ts` into `packages/cairn-cms-dev/dist/` from the root `package`
  script, after `svelte-package`, because its declarations import `@glw907/cairn-cms` types from the
  root `dist/`. It carries no `prepare` of its own: npm runs a workspace's `prepare` before the
  root's (spec, the review's npm 11.19 probe).
- Every `exports` condition points into `dist/`. The `svelte` condition
  (`packages/cairn-cms-dev/package.json:23`, `./src/index.ts` today) is dropped, since the package
  ships no `.svelte` file, or points into `dist/`. Vite resolves `svelte` first, so a leftover source
  path breaks every registry install while the monorepo symlink hides it. `files` is
  `['dist', 'README.md']`, with no `src` and no test file.
- `check:dev-package` asserts that every `exports` condition string and every `files` entry points
  into `dist/` (or is `README.md`), beside its four existing checks.
- The `publish-dev` job installs and builds before `npm publish`, so a release publishes `dist/`
  (Decision 2).
- No runtime behavior changes; the built output is the source's behavior.

**Acceptance:**
- On a clean clone under `$HOME/.cache/engine-pre-2b-b/`, after `npm ci`,
  `npm pack --dry-run --json ./packages/cairn-cms-dev` lists `dist/index.js` and `dist/index.d.ts`
  and no `src/**/*.ts`. Fails today: it lists source.
- A fixture consumer under `$HOME/.cache/engine-pre-2b-b/` declares neither `cloudflare:workers` nor
  `node:sqlite` ambiently. It installs the packed engine and dev package and imports
  `devBackendHandle`, and `svelte-check` reports 0 errors and 0 warnings. Fails today: errors on
  both modules.
- From a clean clone, replay the `publish-dev` job's install and build steps, then run
  `npm publish --dry-run --access public` in `packages/cairn-cms-dev`. The job's version guard is
  bypassed, since `0.98.0` is already on the registry and the guard exits before publishing. The
  listing shows `dist/index.js`, and the report quotes it.
- A table-driven `check-dev-package` test fails on a manifest with any one `exports` condition
  (`types`, `svelte`, `default`) pointing outside `dist/`, one row per condition.
- After a from-scratch showcase install, `realpath` resolves the dev package into the worktree, and
  the showcase e2e build resolves `dist/` (the report shows the resolved file). The `wrangler deploy
  --dry-run` grep steps of `e2e.yml` and `scaffold.yml` still pass: no marker in a default build, and
  markers present in a flagged build. Replay both locally, and confirm on CI at the boundary.
- The computed gate green.

**Interfaces produced:** the built dev package, consumed by Tasks 5 and 10 and by the close's
consumer proof.

**Gate:** computed; expected F (`publish.yml` computes `full`).

### Task 5: The engine supplies the dev-build define (B7)

**Pass class:** `auth-data`: the define decides whether a handle that mints owner sessions compiles
into a deployed Worker. **Spec:** B7; pass B task 7.

**Files:** `src/lib/vite/internal.ts` (the `cairnManifest` plugin, `name: 'cairn-manifest'` at
`:254`) and its unit tests; `src/lib/ambient.ts`; `examples/showcase/vite.config.ts` and
`examples/showcase/src/app.d.ts`; `templates/waymark/**` through `npm run emit:template`;
`docs/reference/vite.md` and `docs/reference/ambient.md` (minimal rows), with
`check:surface -- --update`.

**Outcome:**
- `cairnManifest` gains a `config` hook that defines `__CAIRN_DEV_BUILD__` as
  `command === 'serve' || loadEnv(mode, process.cwd(), 'VITE_').VITE_CAIRN_E2E === '1'`, the
  template's current expression (`templates/waymark/vite.config.ts:29`). The flag's channels stay
  the template's: the process env, and the `.env`, `.env.local`, `.env.<mode>`, and
  `.env.<mode>.local` files in `process.cwd()`. A define the site already set wins, in either plugin
  order.
- `@glw907/cairn-cms/ambient` declares the global. The showcase and the template drop their
  `devBuildDefine()` plugin and their `app.d.ts` declaration, since with `skipLibCheck` off the two
  declarations collide (`TS2451`).
- A `WATCH:` comment at the nested verify server's stripped-plugin set
  (`src/lib/vite/internal.ts:183-186`) notes that the nested server drops the define. That is
  harmless while nothing in `cairn.config.ts`'s graph reads the global.
- The hook starts no nested Vite server (`durable-gotchas.md`, "A plugin must never start and close a
  nested Vite server under `vite dev`").

**Acceptance:**
- Test-first unit tests over the hook: `true` under `serve`, `false` under `build`, `true` under
  `build` with `VITE_CAIRN_E2E=1` in the process env, and `true` under `build` when only a
  `.env.production` file sets the flag. Fails today: no hook. Mutation proof: flipping the `serve`
  comparison turns the first case red (quoted, reverted).
- A site-set `false` define is kept in both plugin orders, proven through Vite's `resolveConfig`
  with both plugin arrays, which starts no server. A direct call of the hook sees only an
  already-merged config and cannot prove the order where the engine's plugin runs first.
- `git grep -n "devBuildDefine\|const __CAIRN_DEV_BUILD__" -- examples/showcase templates/waymark`
  prints nothing.
- Under a default `npm run build` of the showcase, `npx wrangler deploy --dry-run` output carries no
  line of `scripts/checks/dev-fold-markers.txt` (excluding `*.map`). A `VITE_CAIRN_E2E=1` build
  carries at least one. Replay both e2e.yml steps locally; the report quotes each result line.
- A fresh emission's `npm run check` reports 0 errors and 0 warnings, which proves the template's
  reads of the global resolve through `/ambient`. It cannot show `TS2451`: the template sets
  `skipLibCheck` (`templates/waymark/tsconfig.json:14`).
- The computed gate green.

**Interfaces produced:** the engine-supplied define, named in Task 11's `Consumers may:` line and
the close's smoke.

**Gate:** computed; expected F (`vite.config.ts` computes `full`).

### Task 6: `cairn-guidance check` reads a fresh scaffold as fresh (B6)

**Pass class:** `engine-logic`. **Independent** of Tasks 4 and 5. **Spec:** B6; pass B task 6.

**Files:** `src/lib/guidance/**` (`check.ts`'s `judgeSourceExclusion` at `:73-88`, and the tree-hash
module) and their unit tests; `docs/reference/guidance.md` (`:30`, `:136`, minimal edits).

**Outcome:** the check counts an admin stylesheet whose Tailwind import uses `source(none)` as
excluding `.claude/`, beside the literal `@source not "./.claude";` line. The guidance tree hash
leaves out `VERSION`, which the bake and `install` stamp differently.

**Acceptance:**
- On a fresh emission (the emitted `src/admin.css` as written), the source-exclusion item reports
  `excluded`. Fails today: `not-excluded`, which reads as scanned.
- With the installed and packaged `VERSION` files differing and every other guidance file equal,
  the freshness verdict is `fresh`. Fails today: `stale`.
- A stylesheet with neither form still reports `not-excluded`, and a tree differing in a real
  guidance file still reads `stale`.
- The computed gate green.

**Interfaces produced:** none consumed later; the Claude Code arm's facts (Task 11).

**Gate:** computed; expected E.

**S2 boundary:** F green on the segment head; pushed; CI `scaffold`, `create-site`, `e2e`, and
`test` green; STATUS written; S3 pre-flight dispatched (including the Task 8 seam check).

---

## S3: schema and composition

### Task 7: Composition refuses duplicate labels and reserved ids, and `itemLabel` goes (A13, A14, D4)

**Pass class:** `engine-logic`. **Spec:** A13, A14, D4; pass B task 8.

**Files:** the module holding `normalizePublishActions` (the S3 pre-flight names it);
`src/lib/content/concepts.ts` (`normalizeConcepts`, `:135`); `src/lib/sveltekit/admin-dispatch.ts`
(`RESERVED_SEGMENTS`, `:33`) and wherever the fixed screen ids live; `src/lib/content/fieldset.ts`
(`FieldBehavior.itemLabel`, `:21`, `:28`); unit tests; `docs/reference/core.md` (minimal edit for D4),
with `check:surface -- --update`.

**Outcome:**
- **A13.** Composition throws, with a message naming the label, when two publish actions share a
  label.
- **A14.** Composition throws on a concept id that names an engine view. The set is one shared set
  built from `admin-dispatch.ts`'s reserved segments plus the fixed screens, read by both the
  dispatcher and the validator.
- **D4.** `FieldBehavior.itemLabel` is removed. `ArrayField.itemLabel` is untouched. Ledger
  `audit-adapter-fieldbehavior` keeps the type for `validate`.

**Acceptance:**
- Two `'Announce'` labels throw at composition. Fails today: accepted.
- A table-driven test throws for every member of the shared reserved set, and one test proves the
  dispatcher reads the same set (a member added to the set is refused by both). Fails today:
  accepted.
- `// @ts-expect-error` on a `FieldBehavior` carrying `itemLabel`, and `check:surface` shows the
  removal. Fails today: it compiles.
- The showcase and template adapters still compose (F's e2e, or E plus a composition smoke over both
  adapters).
- The computed gate green.

**Interfaces produced:** the shared reserved-id set; three `Consumers must:` clauses for Task 11.

**Gate:** computed; expected E.

### Task 8: The sanitize floor and two build warnings (C5, C13, D6)

**Pass class:** `auth-data` (runner `passClass: "auth-data"`, so a coverage finding on C5 blocks),
with `web-auth-security-reviewer` named on C5 at the close. **Spec:**
C5, C13, D6; pass B task 9.

**Files:** `src/lib/render/sanitize-schema.ts` (`buildSanitizeSchema`, the comment at `:18-24` and
the return at `:62`) and its tests; `src/lib/vite/internal.ts` (`checkSiteFacts`, `:580-595`) and
its tests; the manifest build that reads concept frontmatter (the S3 pre-flight names the file) and
its tests; `docs/reference/render.md` (minimal edit stating the floor).

**Outcome:**
- **C5.** The site callback receives a fresh deep copy of the safe base. After it returns, the
  engine removes `script` from `tagNames` and sets `strip` to the union of the core list and the
  callback's. The floor is exactly `script` plus the core `strip` entries. Attributes and protocols
  stay the callback's responsibility, and the comment says so. No module default is reachable for
  mutation by a callback.
- **C5, the absent allowlist.** When the callback's result carries no `tagNames` array, the engine
  throws at renderer construction (`buildSanitizeSchema`, called from `src/lib/render/pipeline.ts:113`)
  with a message naming `sanitizeSchema`. The measured defect: `hast-util-sanitize` treats an
  absent `tagNames` as "every element is safe"
  (`node_modules/hast-util-sanitize/lib/index.js:367-370`) and reads `strip` only for an unsafe
  element (`:390-393`), so no floor holds over a missing allowlist. `unsafeDisableSanitize` stays
  the documented way to turn the floor off.
- **C13.** When the facts derivation throws, `checkSiteFacts` emits one build-log warning naming the
  skip, and still does not fail the build.
- **D6.** The manifest build warns once per concept, naming each frontmatter key it found on that
  concept's entries that the concept's schema does not declare.

**Acceptance:**
- **C5:** a callback that adds `script` and mutates `strip` in place still yields output with no
  `<script>` element and none of the script's body text. A callback that mutates a nested
  non-`strip` array of its argument (for example `protocols.src`) leaves a second
  `buildSanitizeSchema` call in the same module instance with the untouched default. A callback that
  adds to `strip` keeps its additions. A callback returning `tagNames: undefined` throws at
  construction, naming `sanitizeSchema`. Fails today: the script survives, the default is mutated,
  and the undefined allowlist admits every tag. Two mutation proofs, each quoted and reverted:
  dropping the post-callback `script` removal turns the first case red, and dropping the `strip`
  union turns the body-text assertion red.
- **C13:** a throwing derivation yields exactly one warning naming the skip, and the status stays
  non-failing. Fails today: silent `ok`.
- **D6:** a concept without a `robots` field, with two entries carrying `robots: noindex`, yields one
  warning naming `robots` for that concept. A concept with no undeclared keys yields none. Fails
  today: silent.
- The computed gate green.

**Interfaces produced:** one `Consumers must:` clause (C5) for Task 11.

**Gate:** computed; expected F (`src/lib/render/` computes `full`).

### Task 9: The site-config path is declared once, and `cairn-audit --fail-on advisory` (D5, D8a)

**Pass class:** `engine-logic`. **Spec:** D5, D8a; pass B task 10. **Decision 6.**

**Files:**
- D5: `src/lib/content/types.ts` (`NavMenuConfig.configPath`, `:131-132`, and the editor config
  type); the composition that defaults the new member; `src/lib/sveltekit/content-routes-settings.ts`
  (`:124`, `:198-200`); `src/lib/sveltekit/nav-routes.ts` (`:93`, `:151`, `:158`); unit and
  integration tests; `examples/showcase/src/theme/cairn.config.ts` (`:182`) and the template through
  `npm run emit:template`; the minimal `docs/reference/sveltekit.md` (`:1217`) and `core.md`
  (`:249`, `:257`) edits, with `check:surface -- --update`.
- D8a: `src/lib/audit/report.ts` (`exitCodeFor`, `:55`), the `cairn-audit` bin's argument parsing,
  their tests, and `docs/reference/cairn-audit.md` (minimal edit).

**Outcome:**
- **D5.** The adapter's `editor.siteConfigPath` names the site-config file once. Its default equals
  the canonical path in `packages/create-cairn-site/src/site-config-path.json`
  (`src/theme/site.config.yaml` at plan time). The nav editor, Settings, and Tags all read it.
  `editor.nav.configPath` is removed, and so is `DEFAULT_SITE_CONFIG_PATH` at
  `content-routes-settings.ts:124` (Decision 6).
- **D8a.** `cairn-audit --fail-on advisory` exits non-zero when any unsuppressed advisory survives.
  The bare call keeps today's exit rule. The `--json` report is batched, not built.

**Acceptance:**
- **D5:** an adapter with no `editor.nav` saves Settings, and reads Tags, from
  `src/theme/site.config.yaml`. Fails today: a 404, "Site config not found". An adapter with
  `editor.siteConfigPath` set elsewhere routes all three screens to it. A unit test asserts the
  engine default equals `site-config-path.json`'s `path`. `// @ts-expect-error` on
  `editor.nav.configPath`.
- **D8a:** an advisory-only report exits 0 bare and non-zero with `--fail-on advisory`. An
  error-tier report exits non-zero either way. An unknown `--fail-on` value is a usage error. Fails
  today: always 0 on advisories.
- The computed gate green.

**Interfaces produced:** two `Consumers must:` clauses (D5) for Task 11.

**Gate:** computed; expected F (`examples/showcase/src/theme/` computes `full`).

**S3 boundary:** F green on the segment head; `check:close` green; STATUS written; S4 pre-flight
dispatched.

---

## S4: dev backend and records

### Task 10: The dev backend over the site's real content (ruling 5)

**Pass class:** `engine-logic`. **Spec:** "Ruling 5" in full; "Rulings for Geoff", item 1; pass B
task 3. **Decisions 1 and 3.** Built on fork 1's ruling (yes): in memory, plus a persistent notice.

**Files:** `packages/cairn-cms-dev/src/{handle,fake-github}.ts` and their tests (plus a new overlay
module if the implementer splits one out); `packages/cairn-cms-dev/README.md`;
`src/lib/github/backend.ts` (one optional `Backend` member, Decision 3); the engine's shell load
(`src/lib/sveltekit/content-routes-shell.ts`, `AdminShellData` at `:44`) and
`src/lib/admin/CairnAdminShell.svelte`, with their tests; `examples/showcase/src/hooks.server.ts`
(the marked `content: 'fixtures'` line); `src/tests/unit/emit-template-tree.test.ts`;
`templates/waymark/**` through `npm run emit:template`; minimal `docs/reference/{core,sveltekit}.md`
edits with `check:surface -- --update`. This task owns every ruling-5 record (Decision 1), in the
same task:
- the `DevBackendConfig` doc comment, and the README's option table and its overlay limits;
- one facts bullet per behavior change;
- the `CHANGELOG.md` and `migration-notes.md` lines: the `Consumers must:` clause "drop
  `seedContent`, and pass `content: 'fixtures'` when the dev backend runs under `wrangler dev`",
  and the `Consumers may:` clause "pass `content: 'fixtures'` to keep the seeded dev content". The
  second reaches a site that runs the dev backend without ever naming `seedContent`
  (`xcathletes-org/src/hooks.server.ts:62-63`);
- the ruling-5 items, with their fact ids, on the `add-cairn-to-a-sveltekit-app` and
  `scaffolded-site-files` entries in `docs/internal/record/harvest/relink.json`, created if absent
  and extended if present;
- ROADMAP's B12 row removed, and the `MEDIA_BUCKET` watch's verdict (batched as ruling 5's R2
  read-through, tagged add-cairn).

**Outcome:**
- `DevBackendConfig.seedContent` is removed. `devBackendHandle({ runtime, content })` takes
  `content: 'repository' | 'fixtures'`, default `'repository'`. `'fixtures'` is today's seeded
  in-memory repo, unchanged. Every seed runs only in `'fixtures'`, so no fixture reaches a real
  site's admin: the module-level seed post (`fake-github.ts:42-47`), `seedMediaLibrary`,
  `seedFragments`, `seedVocabulary`, `seedPreviewTwin`, the seeded branches, and the R2
  `SEED_MEDIA_KEYS` bytes (`handle.ts:100-132` on `main` at `7a777e5e`). Otherwise the fixture `media.json`,
  manifest, and `src/theme/site.config.yaml` would shadow the developer's real files in Settings,
  Tags, the nav editor, and the Library.
- In `'repository'`, each branch is an overlay over the working tree: a map from path to content or
  to a tombstone. Nothing writes to disk.
  - `readFile` answers the overlay, then the disk; a tombstone reads `null`.
  - `readEntries` is the union of disk and overlay, minus tombstones.
  - A commit writes content, or a tombstone for a delete or a rename's old path.
  - `createBranch` copies the source overlay, tombstones included.
  - An overlay entry wins until restart. A disk edit to a file the dev admin has not written shows on
    the next request.
  - The list reads `src/content/.cairn/index.json` from `main`: the disk manifest until a dev publish
    commits an overlay copy.
  - Paths resolve against `process.cwd()`, and `node:fs` is imported dynamically inside the read, as
    `channel-db.ts` does for `node:sqlite`.
- Under workerd (`navigator.userAgent === 'Cloudflare-Workers'`, detected synchronously), the handle
  throws in `'repository'` mode with a message naming `content: 'fixtures'`.
- The showcase's hooks pass `content: 'fixtures'` inside `cairn-template:exclude-start/-end` markers,
  so new sites get `'repository'`. The showcase and the scaffold hooks stay a byte copy otherwise.
- **The notice (fork 1, "Yes").** While the dev backend serves `'repository'`, the admin shell shows
  one persistent DaisyUI `alert` saying edits are held in memory and discarded when the dev server
  stops. The copy is in the admin voice. The signal is `Backend.ephemeral`, which only the dev
  package's `'repository'` backend sets (Decision 3). The shell load reads it from
  `event.locals.cairnBackend` and maps it to one optional `AdminShellData` member. A production
  backend never carries it.
- Media bytes stay in the in-memory R2 double. This task states the limit in the README; reading
  local R2 through is batched.

**Acceptance** (against a temp directory under `$HOME/.cache/engine-pre-2b-b/` holding entries and a
committed manifest; each fails today, where the dev admin shows only fixtures):
- The list equals the disk set exactly, with no fixture id, read through the manifest.
- At construction in `'repository'`, reads of `src/theme/site.config.yaml` and
  `src/content/.cairn/media.json` return the disk bytes, and no `cairn/*` branch exists.
- A save shows in the next read. A disk edit to an unwritten file shows without a restart. After a
  save, a disk edit to that same file does not show until restart.
- A deleted or renamed on-disk entry stays gone. A `cairn/*` branch read of an untouched disk file
  returns its content.
- A snapshot of the temp tree (every path, its bytes, and its mtime) is identical before and after
  this sequence: save, delete, rename, branch create, publish, Settings save, nav save, and media
  upload.
- The handle throws under a stubbed `Cloudflare-Workers` user agent and not under Node.
- `emit-template-tree.test.ts` asserts the emitted hooks carry no `content:` option and no exclude
  marker.
- Under `'repository'`, the shell payload carries the notice member and a component test renders the
  `alert`. Under `'fixtures'` and with no dev backend (the production provider), the member is
  absent and no alert renders. Mutation proof: setting `ephemeral` on the `'fixtures'` backend turns
  the fixtures test red (quoted, reverted).
- `check:surface` shows exactly two new public members: `Backend.ephemeral` and the
  `AdminShellData` member. `App.Locals` and `CairnEvent.locals` are unchanged.
- The showcase e2e suite stays green on `'fixtures'`, admin-visual baselines unchanged.
- A fresh emission under `npm run dev` (port from an environment variable) lists the scaffold's two
  seed entries in the dev admin and shows the notice. The report attaches the capture for the close.
- `git grep -n "seedContent" -- src packages templates examples docs/reference README.md` prints
  nothing.
- `CHANGELOG.md` and `migration-notes.md` carry the two ruling-5 clauses above, and the two
  re-arm entries carry the ruling-5 items with their fact ids.
- The computed gate green.

The "No" alternative (publishes written to disk) was not taken.

**Interfaces produced:** the `content` option and the notice members, with their own facts,
version records, and re-arm items (above). Task 11 re-reads them when Task 10 ran first.

**Gate:** computed; expected F (`hooks.server.ts` computes `full`).

### Task 11: Docs and records for pass B

**Pass class:** `docs`. **Spec:** "Docs and records", "Consumers must (draft, finalized at the
close)", "Declined, with proposed ledger entries", "Ledger entries this pass falsifies"; the fold
record's "Owed errata"; pass B task 11. **Decisions 1, 7, and 8.** Drafts to the developer brief in
`docs/internal/docs-register.md`; Vale's error tier is the floor.

**Files:** `docs/reference/{sveltekit,core,render,vite,ambient,guidance,cairn-audit}.md` and every
other page the repoint greps name; `docs/internal/facts/*.md`; `docs/internal/api-surface.md`
(regenerated if not current); `CHANGELOG.md`; `docs/extend/migration-notes.md`;
`docs/extend/upgrade-cairn.md`; `docs/internal/engine-rulings.md`;
`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md` (`:390`);
`docs/internal/record/harvest/relink.json`; `docs/internal/docs-friction-log.md`; `ROADMAP.md`;
`packages/cairn-cms-dev/README.md` (beyond Task 10's delta); `packages/create-cairn-site/README.md`
(beyond Task 2's line); `skills/**` and `claude/**` wherever a repoint grep hits.

**Outcome:**
- **Reference pages** state pass B's surface: the engine define and its `Consumers may:` path
  (`vite.md`, `ambient.md`); `editor.siteConfigPath` and the removed `configPath` (`sveltekit.md`,
  `core.md`); the removed `FieldBehavior.itemLabel` and the two composition refusals (`core.md`); the
  sanitize floor (`render.md`); `--fail-on advisory` (`cairn-audit.md`); the guidance check
  (`guidance.md`). Ruling 5's rows, the `content` option and the notice members, are Task 10's
  (Decision 1). Each page Tasks 1 to 10 touched minimally is re-read and finished.
- **Repoint greps:** every hit for `devBuildDefine`, `cairn:manifest` in a message
  context, `nav.configPath`, `FieldBehavior.itemLabel`, `APP_DB`, `migrations-app`, and "every
  scaffold ships" Signups wording across `docs/`, `README.md`, `skills/`, and `claude/` is repointed
  or named as intentional.
- **Facts:** a bullet for every pass B public-behavior change and a correction to every bullet a fix
  falsifies. Plan-time candidate set, triaged each to corrected, retired, or unchanged with a
  one-line reason: `docs/internal/facts/extend.md` `f:pyt58u` `f:onqm6k` `f:qtm9y2` `f:b0kf86`
  `f:thnbyp` `f:7ji7x0` `f:n7t4bn` `f:nv0ok0` `f:3z1uxv` `f:tycp7k` `f:s5pdrz` `f:wnsv5x` `f:c7nyan`.
  `docs/internal/facts/admin.md` `f:vfpai6` (`:10`, "two D1 databases"), `f:gcuj1j` (`:40`,
  `APP_DB`), `f:xw0bit` (`:51`, the closing summary's two databases), and `f:l3cxgc` (`:116`,
  "beside `APP_DB`"), which Tasks 1 and 2 falsify. `f:xw0bit` cites `01d-resume.txt`, so its
  correction notes the capture is stale until the next live capture. `front-door.md` `f:9xthnq` and
  `f:dpbswc` are checked for a scaffold claim. The task re-runs Task 0's keyword grep over all of
  `docs/internal/facts/` and amends the set. Ruling 5's facts are Task 10's. The Claude Code arm's
  facts in `extend.md` take B6's two corrections.
- **Per-version records:** `CHANGELOG.md` `## Unreleased` carries pass B's entry and its
  `Consumers must:` lines, finalized against what shipped. Ruling 5's two clauses are Task 10's
  (Decision 1); this task re-reads them when Task 10 ran first.
  - move `editor.nav.configPath` to `editor.siteConfigPath`, and set `editor.siteConfigPath` when
    the site config lives anywhere but the canonical path;
  - remove any `itemLabel` from a `FieldBehavior`, rename a concept whose id names an engine view,
    and make publish-action labels unique;
  - a `sanitizeSchema` callback can no longer allow `<script>`, and must return a `tagNames`
    array; use a registered component or island.

  Plus the `Consumers may:` line: delete the site's own `devBuildDefine` plugin and
  `__CAIRN_DEV_BUILD__` declaration. A stale content manifest's message now names
  `npx cairn-manifest`. `migration-notes.md` and `upgrade-cairn.md` carry the same version record.
- **Ledger:** a dated annotation on `audit-adapter-navmenuconfig` (`configPath` moves to
  `editor.siteConfigPath`), pass B's one ledger item (Decision 7). `check:rulings-format` green.
- **Functional spec:** a dated amendment to the adapter contract line (`:390` at plan time) for D5's
  site-config default.
- **The 2b re-arm list** is pass B's alone (Decision 7). Each entry follows the file's existing
  fields: `file` (the page), `context` (a grep-able line from it), `done` (what changed), `stage`
  `"2b"`, plus a `facts` array of the changed fact ids. It holds two sets of pages. First, every
  page on pass A's hand-off list, read from this plan's Ledger (Task 0), with its fact ids. Second, each 2a page pass B changed, with the facts that
  changed. When one page is on both lists, the two merge into one entry, and an entry Task 10
  already wrote is extended, never replaced. Pass B's pages and their items (ruling 5's items are
  Task 10's):
  - `add-cairn-to-a-sveltekit-app`: B1, B2, B3, B7;
  - `scaffolded-site-files`: ruling 2, A5, B3, B6, B7;
  - `add-a-custom-admin-screen`: ruling 2;
  - `restrict-admin-access`: ruling 2, A5;
  - `security-model`: C5;
  - `debug-your-site`: C13.

  Plus any page a task's minimal gate fix touched. The 2b outlined pages draft from corrected facts
  and need no entry: define-an-adapter-and-schema (A14, D4, D6), act-on-newly-published-entries
  (A13), build-the-public-routes (D2, D6), turn-on-tidy and arrange-the-admin-sidebar (D5), and
  run-cairn-audit-on-your-site (D8a).
- **ROADMAP:** the pass B items leave every live tier (B1, B2, B3, B6, B7, B8 via ruling 2, A5,
  A13, A14, C5, C13, D2, D4, D5, D6, D8a). B12 is Task 10's, and the "Engine pass before stage 2b"
  Now entry leaves at the close (step 9), since Task 11 can run before Task 10. Pass A's ROADMAP
  rewrite is not touched. Two of the three tripped dev-package watches get their verdict here,
  verified against the code first (Decision 8); the `MEDIA_BUCKET` double is Task 10's:
  - the `APP_DB` overwrite: batched with its page tag, since only the showcase now ships a D1
    screen, or fixed if the code shows a one-line answer;
  - the custom-screen skill traps: the `cairnAccess` defect closed if pass A's lead fixed it, and the
    rest re-armed to the extend stage that outlines the custom-screen page.
- **Friction log:** every entry for a pass B fix is deleted after a check against the code. The
  declined and batched entries already left with pass A (Decision 7). Every entry the S1 to S4
  checkpoints filed is triaged complete-or-move, verified against the code first. The one exception
  is Task 2's stale-transcript entry, which stays until a live capture.

**Acceptance:**
- `git grep -nE "devBuildDefine|nav\.configPath|FieldBehavior\.itemLabel|npm run cairn:manifest" -- docs/reference docs/extend/migration-notes.md docs/extend/upgrade-cairn.md README.md skills claude packages/*/README.md`
  prints only lines the report names as intentional (a version record, a removal note).
- The facts triage covers every id in the candidate set; `check:facts` green.
- `CHANGELOG.md` carries one `Consumers must:` line per clause above and the `Consumers may:` line;
  `migration-notes.md` matches it clause for clause.
- A `node -e` one-liner, quoted in the report, parses `relink.json` and asserts two things. Every
  page on pass A's hand-off list and every pass B page above has a `stage: "2b"` entry with a
  `facts` array. Every entry on `main` before this task still carries all its fields. No other check
  reads the file.
- `check:rulings-format` green, and `audit-adapter-navmenuconfig` carries a 2026-10 dated note.
- The ROADMAP diff removes every pass B item but B12 from the live tiers, and the two watches above
  carry their verdicts.
- `cairn-run-gate 'npm run check:surface && npm run check:rulings-format'` exits 0, and the report
  quotes the `gate exit:` line. The `docs` tier's `check:docs-gate` carries `check:facts` but
  neither of these.
- The computed gate green; `check:close` green.

**Interfaces produced:** none consumed later; the close finalizes STATUS and HISTORY.

**Gate:** computed; expected `docs`, or higher if a `claude/**` or `packages/create-cairn-site/`
path lands; then `check:close` at the boundary.

**S4 boundary:** F green on the segment head; `check:close` green; pushed; every CI workflow green;
STATUS written.

---

## Close

Run `pass-core`'s ritual with the `cairn-pass` specifics, in order. Steps 1 to 10 run unattended.
Step 11's merge is the one batched owner step.

1. **Simplify, once.** `code-simplifier:code-simplifier` over the pass's changed TypeScript,
   JavaScript, and Svelte, then the full gate again if it changed code.
2. **Full gate.** If step 1 changed code, F again; otherwise the S4 boundary's F stands, since a
   second full run on an unchanged commit is barred (`pass-gate-economy.md`, heavy-lock rule 2).
   Never the stock `npm test`: its parallel component project hangs on this workstation while it
   holds the heavy gate lock (`docs/internal/durable-gotchas.md`, "The component project stalls
   under file parallelism"), and F runs the same projects serialized. Then
   `cairn-run-gate 'npm run check:close'` (0 errors, 0 warnings).
3. **Consumer proof**, since the dev package moves to `dist/` and the scaffold changes:
   - A from-scratch showcase build in the worktree (`rm -rf examples/showcase/{node_modules,package-lock.json}`,
     fresh install, `npm run build`), with `realpath` showing both packages resolve into the
     worktree.
   - A fresh bake from packed tarballs under `$HOME/.cache/engine-pre-2b-b/`: `npm install` exits 0,
     `npm run check` reports 0 and 0, and `npm run build` exits 0. `cairn-guidance check` reads
     `fresh` with `.claude/` excluded, and `npm run cf-typegen` leaves `worker-configuration.d.ts`
     unchanged.
   - The pushed head's CI `e2e`, `scaffold`, and `create-site` runs green.

   Evidence is quoted.
4. **Review fan-out, in parallel**, over the pass's whole diff against `main`:
   - `web-auth-security-reviewer` at `high`: Task 2's provisioning; Task 5's define (the
     owner-session bypass's compile-out) and its flag channels, the process env and the `.env*`
     files in `process.cwd()`; Task 8's C5 sanitize floor and its absent-allowlist throw; Task 10's
     `Backend.ephemeral` member, its fixtures-only seeds, and its workerd guard; and Task 3's
     fixture route exclusion;
   - `svelte-reviewer`: the admin error page, the shell's notice, and the shell load;
   - `cloudflare-workers-reviewer`: the workerd detection, the dynamic `node:fs` import, the
     dev-fold bundle, and `wrangler.jsonc`;
   - `daisyui-a11y-reviewer`: the error page and the notice `alert` (admin markup).

   Blocking findings go through one fix chain. Out-of-scope findings are verified and go to
   `docs/internal/docs-friction-log.md`.
5. **Capture read (A5 and the notice).** The main loop reads the Task 3 error-page captures (light
   and dark) and the Task 10 notice capture with its own eyes. A fresh-context `visual-verifier`
   grades them against `docs/internal/admin-design-system.md`'s recipes. A STRUCTURAL verdict goes
   through the fix chain.
6. **Live auth smoke** (`auth-data`: Tasks 2 and 5), per `docs/internal/admin-smoke-test.md`, on the
   showcase under local `wrangler dev`:
   - A default `npm run build` (no `VITE_CAIRN_E2E`), and no `CAIRN_DEV_BACKEND` in `--var` or any
     `.dev.vars`, checked first. `wrangler dev` runs on a port from an environment variable, with
     `--var PUBLIC_ORIGIN:http://localhost:$PORT` and a local `AUTH_DB` migrated with the scaffold's
     migration set.
   - Unauthenticated `GET /admin` redirects to `/admin/login`: no owner-session bypass compiled in
     (Task 5).
   - A session minted by inserting a D1 session row reaches `/admin`. A Settings save on the
     showcase, whose adapter names no site-config path after Task 9, reaches the commit path through
     the engine default. The expected `commit.failed` record from the placeholder GitHub App is
     quoted from the logs.
   - The magic-link round trip, driven in headless Chromium (Decision 11): the smoke agent requests
     a link, reads it from wrangler's local `send_email` message file, opens it, posts the confirm,
     and lands in `/admin`.
   - Task 2's provisioning is proven by its unit tests and CI `create-site`. The transcripts are
     stale until the next live capture (Decision 10). No live Cloudflare provisioning runs, since it
     creates real resources; the evidence says so.
7. **Docs check.** Task 11's pages are re-read against any close-time fix.
   `check:surface -- --update` is re-run if a reviewer fix moved a typed export. The friction log is
   triaged complete-or-move.
8. **The 2b re-arm list** is confirmed against the final diff: every 2a page a close-time fix touched
   is on it.
9. **Ledgers.**
   - `docs/STATUS.md` is rewritten present tense (60 lines or fewer). The engine pass before stage 2b
     is closed unreleased, and stage 2b is next, starting from the re-arm list.
   - `docs/HISTORY.md` takes the pass entry: what landed, what the gates caught, and what a later
     pass would be wrong to rediscover, including Decision 12's accepted resume window. It names
     whether any refused fold finding turned real.
   - `ROADMAP.md`'s "Engine pass before stage 2b" Now entry, which pass A narrowed to pass B's
     scope, is removed, now that Tasks 10 and 11 have both landed.
   - The plan takes its post-mortem with the budget score: tokens against the ruled ceiling (14.0M)
     via `/cost`, planning misses, and execution sittings.
10. **Pre-bake.** Plan, STATUS, and ROADMAP committed; tree clean; the resume prompt names stage 2b
    as the next action and its launch directory.
11. **Merge** (owner step): the PR leaves draft once CI is green, and the merge to `main` waits for
    Geoff's go. No version bump, no tag, no publish. The worktree is removed after the merge.

## Ledger

(Checkpoint entries go here: Task 0's record, then one entry per segment boundary with the task
ledger, verdicts, decisions taken, spend against the ceiling, and the next task.)

## Post-mortem

(Written at the close.)
