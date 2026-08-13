# create-cairn-site Pass T5: the browser door (template repo plus Deploy button) (design)

The seventh tool pass, planned in its own sitting, and **re-sequenced in that sitting (Geoff,
2026-08-12): T5 jumps ahead of T4d**, so the queue is now T5, T4d, Pass D, release one. Parent
docs: the umbrella design (`2026-08-09-admin-setup-and-docs-reset-design.md`, "Two doors, one
house"), the T3 spec's T5 brief (`2026-08-10-create-cairn-site-t3-design.md`), and the T4c
post-mortem, which hands this pass the unrun live CLI e2e. The central platform claim this pass
rests on, that the Deploy-to-Cloudflare button clones the template into the admin's account,
auto-provisions the D1 and R2 bindings from `wrangler.jsonc`, prompts for secrets, and wires
Workers Builds, is the umbrella's, dated 2026-08-09, and has never been observed live. This
spec therefore names its assumptions and puts the spike early in execution; expect amendments
the way T4c's spike produced thirteen.

**This spec and its plan were amended at the adversarial gate** (2026-08-12, three-agent
review: wrong-premise, conformance, and deletion-test lenses). The review's findings are
folded into the text below rather than carried as a separate list; the text as written
supersedes the pre-review draft. The gate's largest catch: the pre-review draft proved the
button on a stripped spike copy while shipping an unstripped, uninstallable template repo,
the T4c failure shape exactly.

**Prerequisite: T4c merges to `main` before T5 execution cuts its worktree.** T4c is built and
green on `worktree-t4c-builds-connect` (draft PR #29) but unmerged, and this pass's live e2e
proves chapter 3, which exists only post-merge.

## Rulings made this sitting

1. **T5 precedes T4d** (Geoff, this sitting). No dependency runs in either direction; the
   ordering is value and risk. Three grounds. First, the same value ordering that put the
   console behind Builds: T4d improves a flow whose parks are already terminal, exit 0, and
   self-resuming, while T5 closes capability gaps (no public door exists, C3's `--template`
   contract is unmet, and the button is the only entry for an admin without a terminal).
   Second, information flows one way: the spike's findings can amend chapter 3's role and the
   admin-track story, while nothing T5 can find reshapes the console, whose delegation wait
   and build watch survive every outcome. Running T5 first means the folded live e2e proves
   chapter 3's final shape once. Third, the e2e economics are order-neutral only if the passes
   share one estate, and the T5-first order gets the proof-once benefit on top. **The live CLI
   e2e (T4c plan Task 10) folds into this pass**, and the scratch site, the minted GitHub
   App, and `~/.config/cairn/sites` persist across T5 and T4d, with the e2e estate's teardown
   after T4d. The spike's own estate does not share that deferral: it is torn down at this
   pass's end (ruling 7).
2. **The bootstrap answer is the checklist; the adopt path is T5b** (answers the brief's
   second open question). What the button cannot do becomes a printed checklist in the
   template README and the deploy guide, presented as the button door's completion story. The
   CLI's adopt-existing-repo path, real new surface with its own admission, dedupe, and
   park-and-resume semantics, is deferred to a **T5b brief written at this pass's end from the
   spike's findings**, because its right shape depends on what the button actually leaves
   undone. The spike buys the brief one direct observation cheaply: it runs chapter 3's
   `--connect` against the button-created site and records whether the chapter adopts or
   recreates the button's wiring, the one probe that can falsify T5b's premise before the
   brief is written. The umbrella's "the CLI then finishes what the button cannot" stays a
   stated intention with a named home, not a T5 deliverable.
3. **The brief's other two open questions close by live spike, not by ruling.** The button's
   actual behavior against a cairn-shaped `wrangler.jsonc` and where the flow leaves secrets
   are observable facts, and the T4b and T4c pattern (evidence before design lock) is the
   proven way to get them. The spike runs early in execution and is a gate: no checklist copy
   or README claim is finalized until its findings land. Its question list is below, and each
   question names its evidence instrument; a dashboard's say-so is not an observation.
4. **Gallery shape only** (Geoff, this sitting). The repo's layout, metadata, and README
   follow the current `cloudflare/templates` contribution conventions from the start, since
   restructuring a published repo later churns the button URL and every C3 invocation. The
   submission assets, preview images and the gallery Playwright e2e, serve only the submission
   itself and wait for that moment; the submission is filed on the roadmap, not here. The
   conventions are read from Cloudflare's own contribution docs at execution time, recorded
   with URL and date read, and linked, never restated.
5. **The single source is enforced, not aspired to.** The template repo is generated
   wholesale: the sync regenerates the entire tree from the bake plus the overlay and commits
   the result as a normal commit (never a force push, per the standing git rule), so a hand
   edit to the template repo survives at most one sync. Running the sync twice in a row
   produces no second commit. Both properties are proven at two altitudes: fixture tests
   (with positive controls: a planted change is first proven present, and an overlay change
   is proven to land) and one live plant against the real repo. A working sync and a no-op
   sync print distinct, asserted outputs, so a permanently inert sync cannot pass as a
   healthy one.
6. **The strip lives in the sync, so the shipped repo is installable** (rewritten at the
   adversarial gate; the pre-review draft stripped only the spike copy, which proved one tree
   and shipped a different one). The baked template's `@glw907/cairn-cms-dev` devDependency
   is unpublished (`0.0.0`), which makes the bake's default invocation throw; both existing
   CI workflows already bake with explicit `--engine-spec`/`--dev-spec` and pack with
   `--ignore-scripts` for exactly this reason. The bake's `assertInstallableSpec` catches
   shape (`file:`, `0.0.0`), not publication, so a substituted dev spec passes it while
   resolving nowhere. The sync therefore takes a tested `--strip-dev-backend` flag that
   removes the dev devDependency, the `dev` script, and the dev shim, and it **asserts before
   pushing that every dependency spec it emits for a package this repo owns resolves on the
   registry** (`npm view`), exiting 1 with no commit otherwise. Until release one the sync
   runs stripped and the README carries a pre-release notice; at release one the invocation
   drops the flag and the overlay drops the notice, both filed as release-checklist
   obligations in the changelog entry. The spike publishes its scratch repo **through the
   sync script itself**, so the tree the button is proven on is the tree that ships, by
   construction rather than by claim. The pre-review draft's `next`-tagged-prerelease
   fallback is deleted: it contradicted the pass's own "package.json untouched" criterion
   and the release doctrine, and the strip removes its reason to exist.
7. **The spike estate is torn down at pass end; only the e2e estate defers to T4d.** The
   spike creates a scratch repo, whatever the button provisions (Workers, D1, R2, Builds
   wiring, a build token), and a repository entry in the account's "Cloudflare Workers and
   Pages" GitHub App selection that only a browser can remove (T4c's residue proves it).
   Every artifact lands in a teardown table at creation time; the pass-end teardown verifies
   by re-listing, never by trusting deletes; the App-selection removal is anticipated as a
   named Geoff hand step in STATUS, not discovered after.
8. **The template's binding-id shape is a choice, and the zero-UUID shape is chosen.**
   Three shapes exist: the bake's zero-UUID placeholders, the id-less shape the CLI's
   `config.mjs` deliberately produces (and T4c's live spike proved deploys), and real ids.
   Cloudflare's deploy-buttons doc asks templates to include default resource names and ids,
   so the repo keeps the bake's zero-UUID shape; this is a deliberate divergence from the
   CLI's own scaffold behavior, not an inheritance. It is also a spike variable: if the
   button chokes on placeholder ids, the fallback is the id-less shape T4c already proved.
9. **The README collision is resolved deliberately.** The button clones the repo wholesale
   into the admin's account, so whatever README the template carries becomes the new site's
   README. The overlay README (button, checklist, gallery face) stays the repo's root
   README, and the checklist's first item is replacing it with the site README the bake
   otherwise provides. If the verified gallery conventions let the button and gallery point
   at a non-root document, the overlay task may invert this (site README at root, button
   page beside it), recorded by amendment; the outcome is named either way, never an
   accident of the single-source rule.

Standing rulings carried forward unchanged: no secret under the project directory; every exit
prints a next step; every wait prints a heartbeat; tokens opaque; `--dry-run` prints and
performs nothing; no suite may touch the operator's desktop; every platform claim carries a
date and the plan re-verifies its own at implementation time; read before write for every
non-idempotent Cloudflare call.

## Scope

T5 ships the browser door: the public **`glw907/cairn-waymark-template`** repo carrying the
Deploy-to-Cloudflare button, generated from the same emitter output the CLI scaffolds from
(single source holds), synced by a post-publish workflow, satisfying C3's `--template`
contract (`npm create cloudflare -- --template glw907/cairn-waymark-template`), shaped to
gallery conventions, and finished by a printed checklist. The pass also runs the live CLI e2e
T4c deliberately left unrun, and ends by writing the T5b brief. The runtime library is
untouched.

Out of scope: the adopt-existing-repo CLI path (T5b; the spike's `--connect` probe observes,
it does not build); the localhost console (T4d, which now follows this pass); preview images
and the gallery e2e (roadmap, at submission time); the `cloudflare/templates` submission
itself; any change to the engine's public API; the fake-server plumbing extraction (still
T4d's); build-time environment variables, deploy hooks, and preview-branch triggers
(unchanged from T4c's exclusions).

## The template repo

Content is the bake's output (`emitTemplate` over the showcase, pruned exactly as
`bake-template.mjs` prunes for the tarball, invoked with explicit specs per ruling 6) plus a
repo-only overlay:

- **README** (per ruling 9 the repo's root face unless conventions invert it): the Deploy
  button at the top, what the button does and does not do (spike-cited), the completion
  checklist, the C3 invocation for extenders, and, until release one, a pre-release notice.
- **`.dev.vars.example`**: Cloudflare's deploy-buttons doc names this file as how a template
  declares the secrets the flow prompts for, and the baked template has none. The overlay
  adds it, listing the site's secret names with placeholder values, and the overlay must
  carry a `.gitignore` negation (`!.dev.vars.example`), because the baked `.gitignore`
  ignores `.dev.vars.*` and would otherwise silently swallow the file; a test asserts the
  file survives into the synced tree.
- **Gallery metadata** per the conventions read and dated at execution time (ruling 4); if
  they require keys inside `package.json`, the overlay applies a keyed merge, not a file
  replace.
- **A license** matching the engine's (MIT).

The overlay lives in `packages/create-cairn-site/` beside the bake, versioned with the tool.
The repo keeps the bake's default identity (`cairn-showcase` names; the zero-UUID id shape
per ruling 8): the CLI substitutes identity at scaffold time, C3's flow prompts for a
directory name, and whether the button flow renames anything is a spike question. The
template's `PUBLIC_ORIGIN` stays the bake's localhost default; correcting it is a checklist
item (and chapter 3's reconcile fixes it for any site the CLI later touches).

## The sync workflow

A cairn-cms GitHub Actions workflow with three triggers and one ordering rule. (1) The
release path runs **after the npm publish succeeds, never merely on the same event**:
`publish.yml` already gates its `publish` job behind `norms` on `release: published`, so a
sibling workflow on that event would race it and push a tree referencing a version npm does
not serve yet; the sync runs downstream of the publish job (as a `needs:` job in
`publish.yml` or an equivalent `workflow_run` chain, chosen at implementation after reading
`publish.yml`), with checkout pinned to the release tag. (2) Manual dispatch, which this
pass's first sync and the spike use, with the strip flag as an input. (3) A weekly cron
running the sync in `--dry-run` compare mode that **fails on drift**, which is the
machine-detectable tripwire for a hand edit, an expired credential, or a silently inert
sync; a red run reaches Geoff through GitHub's own failure notification.

The sync script asserts registry resolvability before any push (ruling 6) and refuses a
remote that is not the expected template repo unless an explicit override flag is passed, so
a mistyped remote cannot receive generated content. Write access rides a fine-grained PAT
scoped to the single template repo, reaching the script only through a named environment
variable (never argv; the printed plan redacts it, and a test asserts no token substring in
any output). The PAT is minted by Geoff after a recorded store check: the registry already
holds `CMS_BOT_PAT`, and the entry must record why it is not reused (a broad bot credential
against the standing narrow-token rule) or reuse it if the check finds it acceptable. The
registry entry carries the token's expiry and a rotation date; the cron tripwire is what
detects silent expiry (the 907-life build-token outage is the documented production instance
of exactly this failure class).

## The spike (early in execution, a gate)

A live button run against a scratch repo **published through the sync script** (ruling 6),
Geoff in the browser, findings recorded in a dated internal doc that becomes the fixture and
copy source for the pass. Each question names its instrument. Must answer, at minimum:

1. Does the button provision the **two** D1 databases and the R2 bucket, from the zero-UUID
   id shape (ruling 8)? With what names and ids, and written back where? Instrument: diff
   the created repo against the pushed tree; read the account's D1/R2 listings.
2. What does it do with the `send_email` binding? Cloudflare's deploy-buttons doc enumerates
   the auto-provisioned resource kinds and `send_email` is not among them (read and dated at
   execution), so the expected answer is skip-or-fail; observe which, and capture the exact
   surface.
3. Does it prompt for repo and Worker names, and does it rewrite `wrangler.jsonc` (names,
   ids, `account_id`) in the created repo? Instrument: the repo diff.
4. Does the flow read `.dev.vars.example` and prompt for the declared secrets, and where do
   they land? Instruments: a names-only Worker-secrets API read for where they landed, and a
   full-history sweep of the created repo (`git log -p` grepped for each pasted value's
   distinctive prefix) for the no-secret rule. A key-presence check is not a sweep; T4c
   shipped that defect and its review caught it.
5. What Builds wiring does it leave (connection, trigger, build token), read back through
   the same Builds API reads T4c's spike used? Then the adopt probe (ruling 2): run chapter
   3's `--connect` against the button-created site and record whether it adopts or
   recreates.
6. Does the deployed site build and serve on `workers.dev`, and if the build dies, where?
   Calibration from T4c, stated precisely: the id-less-binding probe proved a Builds
   container resolves cairn's bindings non-interactively, and its one dead build was a
   token-scope refusal, a flow the button does not use; no SvelteKit tree has ever built on
   Builds, so this is genuinely open.
7. What build command and deploy command does the button configure, and does it derive them
   from `package.json` scripts? (T4c's captured trigger carried an empty `build_command`
   with `npx wrangler deploy`, which against this template's gitignored `main` artifact is a
   deterministic deploy failure; `config_autofill`'s observed `scripts.build` is the
   cross-check.)
8. What does the flow cost and require: plan, the GitHub authorization moment, and the
   browser-moment count for the STATUS carry-forward ledger.

The spike's floor, which is what makes an observational task falsifiable: every question
above ends with a recorded answer or an explicit "unanswered", every scratch artifact lands
in the teardown table at creation time, and every gated task is marked cleared or re-planned
by name. A dead build or a divergence from the umbrella's claim is a finding, never a
failure of the spike; an unanswered question without the word "unanswered" is a defect.

## The checklist

The gap between what the button leaves and a finished site, written from the spike's answers
rather than the umbrella's claim, expected to cover: replacing the template README with the
site's own (ruling 9), the GitHub App (sign-in and publishing), the owner, email onboarding
and its Workers Paid cost (the T4b framing), the domain, and a real `PUBLIC_ORIGIN`. It
appears twice, once in the template README and once in `docs/guides/deploy-to-cloudflare.md`;
the two copies state the same steps, the guide carries the detail, and a mechanical test
asserts the two step lists match, so the copies cannot drift apart silently. Each item names
its surface (dashboard page or CLI command) and its cost, in the admission-copy register T4b
set.

The guide today documents only the manual door, and T4c filed the friction-log entry naming
that gap. This pass, which opens the file anyway, triages that entry: the guide ends up
naming all **three** doors (manual, `create-cairn-site --connect`, the button) and when to
choose each, and the friction-log entry is deleted as resolved (complete-or-move).

## The folded live CLI e2e

The full cold CLI run against real services that T4c named as its one gap: chapters 1 through
3 on a scratch site, proving the tool's own orchestration and the `reauthorize` OAuth trip,
reaching `builds-live` with the marker checks passing. It mints the **fifth** GitHub App;
`~/.config/cairn/sites` is empty, so nothing is reused going in, and the e2e estate (site,
App, saved state) persists for T4d per ruling 1. Evidence discipline, tightened at the
adversarial gate: the run first records that no fake is in the loop (the fake-server
environment absent, the resolved API base URLs logged), every hop's evidence is a raw read
from the real service, and a hop that cannot run live is named as a gap in T4c's "Not
verified" register, never counted proven. Two mechanical honesty notes: the tool tarball is
packed `--ignore-scripts` after an explicit bake (the default `prepack` path throws until
the dev backend publishes), with the tarball's freshness verified against the just-baked
tree before the run; and the scaffolded site's dev-backend dependency is satisfied the way
`create-site.yml` does it (a locally packed tarball substituted by `file:` rewrite),
recorded in the post-mortem as the pre-release-one workaround it is.

## Testing

What runs without a browser is tested mechanically, in `packages/create-cairn-site`'s suite
(the glob `scripts/*.test.mjs` picks the new file up; the suite is executed by **`test.yml`**,
which bakes explicitly before running it — the create-site workflow packs and scaffolds but
runs no unit tests, a distinction the pre-review draft got wrong). The tests, each with the
independent-oracle discipline the falsifiability review demanded: the synced tree equals a
`bake()` called directly by the test plus the overlay, with content anchors (named files
present, the engine spec matching a caret-version shape, a file-count floor), never the
script's own composition helper as its own oracle; a positive control (an overlay change
lands as a second commit); the hand-edit trio (a modified generated file, an added stray
file, a deleted generated file, each first proven present in the remote's `main`, all three
corrected, history grown by exactly one commit with the prior sha an ancestor); idempotence
(second run, no commit); distinct sync/no-op output strings; `--dry-run` naming the files it
would change and pushing nothing; the strip (dev devDependency, `dev` script, and shim
absent; everything else byte-identical); the resolvability gate (an injected resolver
returning "unpublished" makes the sync exit 1 with no commit); the `.dev.vars.example`
survival test (the `.gitignore` negation holds); the checklist-match test (README and guide
step lists agree); and the no-token-in-output test. The button flow itself and the C3 clone
are live verifications with evidence in the post-mortem, not suite members; the gallery e2e
is explicitly deferred.

## Docs

`docs/guides/deploy-to-cloudflare.md` gains the button door, the three-door framing, and the
checklist (see The checklist above, including the friction-log triage).
`docs/tutorial/build-your-first-cairn-site.md` and the readiness guide get one-line pointers
only if their current copy contradicts the story (verify, do not assume). ROADMAP: the T5
line moves to done at pass end; the gallery submission and T5b are filed into the tiers
where they bite. STATUS records the reorder (done this sitting), the pass state at pass end,
and every new hand step the moment it is created. The T3 spec's T5 brief and the T4a spec's
T4d brief carry their one-line dated amendments already (committed this sitting, `1ef59bc2`).

## Acceptance criteria

The template repo exists, is public, and **`npm install && npm run build` succeeds from a
clean clone of it today**, before release one (ruling 6 makes this reachable; it was not in
the pre-review draft). The repo is byte-identical to what the sync generates, asserted by an
external `diff -r` against a locally baked tree at a recorded sha and specs, not by the
sync's own comparison logic; a live-planted hand edit is eradicated by the next dispatch
with history intact (prior sha an ancestor, count grown by one). The button, run live
against the spike repo that the sync script itself generated, reaches a serving
`workers.dev` site or every divergence from the umbrella's claim is recorded with evidence;
the deploy-URL format the spike recorded is embedded verbatim in the README, and a GET on
the README's button href is recorded (status and landing page) when the repo goes live.
`npm create cloudflare -- --template glw907/cairn-waymark-template` against the real repo
produces a tree that installs and builds. The checklist in README and guide states every
step the spike proved the button cannot do, each with surface and cost, and the two copies'
step lists match by test. The spike meets its floor (every question answered or explicitly
unanswered; teardown table complete). The live CLI e2e reaches `builds-live` cold with
per-hop raw-read evidence and the no-fake preflight recorded, and the e2e estate survives
for T4d while the spike estate is torn down and verified by re-listing. The T5b brief
exists, written from spike findings including the adopt probe. The sync workflow is green on
manual dispatch, its cron drift check is live, and the release-path ordering is encoded
(the `release: published` end-to-end run stays unproven until release one, a named gap).
The runtime library is untouched, and `package.json` versions are untouched.

## The T5b brief (a deliverable, not yet written)

T5b is the adopt-existing-repo path: the CLI running against a button-created repo it did not
scaffold, finishing what the button cannot. Its brief is written at this pass's end from the
spike's findings, including the adopt probe's direct observation (ruling 2), because its
admission rules (what states a button site can be in), its dedupe obligations (what the
button already provisioned), and its park shapes all depend on observed button behavior. The
brief lands in this file as a dated addition, the queue slot is after T4d unless the sitting
that writes it argues otherwise, and until it ships the checklist is the completion story.
If the spike proves the button leaves nothing material undone, the brief says so and T5b
dies; that outcome is legitimate.

## T4d, unchanged but re-anchored

T4d's brief stays as the T4a spec wrote it (plus its two T4c inputs, the build watch and the
grown fake surface); only its position changes. It now follows T5, inherits a live site, a
minted App, and saved state instead of minting its own, and owns the e2e estate's teardown.
