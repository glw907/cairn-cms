# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-08-21, evening): the newest-toolchain pass is EXECUTING

Geoff ruled 2026-08-21: push every dependency and floor to the newest stable before beta so admins
upgrade less later, and give admins a dependency map. Plan:
`docs/superpowers/plans/2026-08-21-newest-toolchain-before-beta.md`, seven tasks, workflow mode, on
worktree `newest-toolchain` off `13726d57`. Resume prompt if this session is lost: "Continue the
newest-toolchain pass via cairn-pass; read the plan, check the worktree's git log for which tasks
landed, and run the rest." Two rulings added mid-pass (Geoff, 2026-08-21 evening), to run as tasks after the seven-task chain
returns: (a) **the floors are the versions just installed** (peer ranges and template pins move to
the current SvelteKit, Svelte, adapter, and Wrangler, and the engine may use their full capabilities
with no guards for older minors); (b) **a ranked survey of improvement opportunities the new
toolchain offers** (running as a read-only agent) is triaged into this pass where small and safe,
and into ROADMAP where it changes behavior or public surface. **After the pass (Geoff, 2026-08-21): cut a release carrying the new floors** (via `cairn-release`;
the floors are breaking, so the changelog entry carries one `Consumers must:` line per floor: Node 24,
SvelteKit and Svelte at the new peer ranges, and `migration-notes.md` gets the entry), **then write
the update instructions for all four consumer sites** against that release. Close-out chore for this pass: migrate this file's history to
`docs/HISTORY.md` per the 2026-08-21 ledger rule (STATUS present tense, under 60 lines).

## Session handoff (2026-08-21, earlier: dependency upgrade landed, e2e baselines regenerated)

`main` is at `8c9de10f` plus whatever the e2e regeneration bot commits on top. The upgrade is in
three commits (`9b30e756`, `d633ad5f`, `8c9de10f`): DaisyUI 5.7.20, Tailwind 4.3.3, SvelteKit
2.70.3, Svelte 5.56.10, Vite 8.2.2, Wrangler 4.125, ESLint 10, `@cloudflare/workers-types` 5,
`@cloudflare/vitest-pool-workers` 0.22. Every local gate and the `test`, `scaffold`, `design`, and
`create-site` workflows are green on `d633ad5f`. The `e2e` workflow was red only on visual
baselines: DaisyUI 5.7.19's `.alert` grid fix lets the alert body take its full column, so the
paragraph drops a line and the page shortens 20px at 320. Read side by side on the styleguide and
the article; an upstream improvement, not a regression. The regeneration dispatch
(`gh workflow run e2e.yml --ref main -f update_snapshots=true`, run 32523096119) was in progress at
handoff and commits the new PNGs straight to `main`.

**Resume prompt.** (1) Done 2026-08-21: the first regeneration dispatch (run 32523096119) lost a
push race to the STATUS handoff commit (non-fast-forward); the re-dispatch landed the baselines as
`25dae7ad`, and `e2e.yml` now rebases before the bot push so the race cannot recur. (2) Ask Geoff one question: build the advisory `check:tsgo` CI job (side-by-side
`typescript@~6` plus `@typescript/native@npm:typescript@7`, `svelte-check --tsgo`, non-blocking,
green meaning TypeScript 7 is a bump)? He wants the 7.x edges resolved before beta; the spike
findings are in the `typescript-7-readiness-spike` memory and the watch entry below. (3) Done
2026-08-21: the one implicit `any` the Go compiler flagged in `scripts/checks/check-snippets.mjs`
was a JSDoc comment whose triple backticks hid the `@param` from `tsgo`; reworded. The full
TypeScript 7 posture (holders, spike evidence, trigger, crossing plan) is the ROADMAP Now entry.

## Immediate next action (2026-08-20: the release is CUT and PUBLISHED)

**`0.95.0` is on npm.** Both packages serve it on the `latest` dist-tag: `@glw907/cairn-cms@0.95.0`
and `@glw907/cairn-cms-dev@0.95.0`. GitHub release `v0.95.0` is cut against `main` at `e0033063`,
and its body carries every `Consumers must:` line in the window since `0.94.0`. The window promotes
`0.95.0-rc.1`, which only ever reached the `next` tag, so a site coming from `0.94.0` crosses both
changelog sections; `docs/extend/migration-notes.md` says so at the top of its `0.95.0` entry.

All five CI workflows were green at the release commit before the tag (`test`, `e2e`, `design`,
`scaffold`, `create-site`), and the four doc gates plus Vale were re-run locally after the heading
rename.

**Immediate next action: Geoff updates the consumer sites** to `^0.95.0`, per his 2026-08-19
sequencing (release-debt pass -> release -> site updates -> live site work with the docs updated in
parallel). Publish precedes any site code importing new exports, which is now satisfied. After the
sites, the editors rewrite runs in `~/Projects/cairn-pub` on `pass-d-docs-tracks`; its launch prompt
is unchanged and sits further down this file. That branch's `file:` tarball pin is now un-pinnable
against the registry: `0.95.0` carries the `reproductions` subpath the pin existed to supply.

**Parallel track opened 2026-08-20: the Go `cairn` tool, sub-project 1.** Design approved by
Geoff in a Fable brainstorm and written to
`docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`, then revised the same day
after a five-vantage adversarial review and a 24-agent verify pass (chapter spine as Go types,
read-only health HUD with adopt-to-watch and a log view, poplar's root-model-plus-registry shape
and design language, split credential model, `tool/` in-repo with a three-platform matrix; the
fixture corpus is extracted as a first task, since it did not exist as the pre-design claimed). Plan written: `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`, three passes (A foundation, B checks and CLI, C the HUD), 29 tasks. **Next step on that track: execute Pass A in this session or a fresh Fable session** from `~/Projects/cairn-cms` with the prompt "Start Pass A of `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md` via cairn-pass; read the spec it names first." Task 10 needs Geoff to mint two tokens. It
does not block the site updates or the editors rewrite.

### Three things the cut decided, and one it could not

**`create-cairn-site` HELD, not shipped.** It has never published (`npm view` 404s), so holding
breaks nobody, and shipping it would strand a reader: a first run cannot succeed with the App on
"Only select repositories", and a failed run's resume refuses to continue because the repository the
tool itself created already exists, with recovery needing a `delete_repo` permission the reader may
not have. Its cost-narrative plan is drafted and NOT approved
(`docs/superpowers/plans/2026-08-20-cli-cost-narrative-pass.md`, two open questions that are Geoff's
calls). A first publish of a new package name also cannot bootstrap over OIDC, so it needs Geoff's
npm login regardless. The engine's own docs payload ships the admin track that names the tool; the
release body states plainly that the tool is not on the registry and why.

**The dev backend failed its first OIDC publish, and the cause is now gated.** npm validates a
provenance bundle against the manifest's own `repository.url` and answered `422` because
`packages/cairn-cms-dev/package.json` carried no `repository` field at all. The dev backend's first
publish (`0.95.0-rc.1`) was done by hand, so the OIDC path had never run against that manifest and no
gate read the field. Fixed in `48961469`: the field is added, `check:dev-package` now asserts it
(proven red by removing it), and the engine's publish job gained the same already-published guard
`publish-dev` already carried, so re-running a release to recover one half no longer dies on the half
that already landed. The recovery ran as a `workflow_dispatch` rather than by moving the `v0.95.0`
tag, so the published engine's provenance still points at the commit the tag names.

**The `--strip-dev-backend` watch FIRED and is discharged** (`ae839697`). `0.95.0` published the dev
backend through the release path, which never strips, so the weekly drift compare had to stop
stripping or measure a stripped bake against an unstripped repo and go red every Monday. The flag is
off in the cron and in the dispatch default, and the `WATCH` comment is replaced by the rule it
leaves behind. Its sibling obligation, retiring the template repo's pre-release notice, was
deliberately NOT done: the notice defers the Deploy button and completion checklist to a live
verification that has not run, and the tool they belong to is held, so dropping it would promise a
button that does not exist. It is refiled onto its real trigger, a `WATCH` on the notice itself plus
a ROADMAP entry beside the defects holding the tool.

**What the cut could not do, and what replaced it: the public template repo.** At the cut,
`glw907/cairn-waymark-template` did not exist and `TEMPLATE_REPO_TOKEN` was unset, so the sync
failed on `TEMPLATE_REPO_TOKEN is required to push to an https remote` (the 2026-08-17 scheduled run
had already failed the same way). **Geoff ruled the fix 2026-08-20: move the template into this repo
and delete the sync.** It now lives at `templates/waymark/`, emitted by
`packages/create-cairn-site/scripts/emit-template-dir.mjs` and gated by `npm run check:template` in
`test.yml`. Cloudflare's deploy-buttons doc allows a subdirectory in a button URL and their own
gallery is a monorepo, and C3's `--template` takes `owner/repo/subdir`, so the second repo bought
nothing the subdirectory does not. Deleted with it: `sync-template.yml` and its weekly cron,
`publish.yml`'s `sync-template-repo` job, and `sync-template-repo.mjs` plus its test. No push
credential, no second copy, and drift now fails on the change that caused it.

### What consumers owe on this window

Five type-level changes, all compile errors rather than runtime failures, plus one operational fact.
`docs/extend/migration-notes.md`'s `## 0.95.0` section carries the full list; the short form:
`SiteConfig` lost its index signature, `AdminShellData.mediaBase` and `EditData.singular` are new
required fields, and `DeleteDialog` and `RenameDialog` renamed `label` to `singular`. **And a cairn
site runs on Cloudflare's Workers Paid plan, $5 a month, from its first deploy** (Geoff, 2026-08-19:
Paid is the expectation, stated plainly, no hedge and no pitch). That supersedes the 2026-08-18 B0
ruling that the cost copy should hedge; the friction log records the supersession.

### Watches this pass changed

- **The SvelteKit `checkOrigin` watch has FIRED.** A real build now prints the deprecation. It is no
  longer a future bet, and `CLAUDE.md`'s standing scheduled-agent example is now describing a
  tripped watch. ROADMAP Now.
- **`check:surface` is blind to an index signature.** Removing one from an exported interface is a
  real breaking change and produced zero snapshot diff. ROADMAP Now.

- **Two dependency majors held on 2026-08-21, each with a trigger.** TypeScript 7.0 (stable 2026-07-08)
  shipped with no public programmatic compiler API, so `svelte-check`, this repo's type gate, has
  nothing to call; the API is scheduled for 7.1 (targeted October 2026), and the Svelte tooling
  follows it. `vitest-browser-svelte` 3 makes `render` async-only across about a thousand call
  sites; a mechanical pass of its own. One landed with a scar: `@cloudflare/workers-types` 5's
  global `Buffer: any` shadows `Buffer.toString(encoding)` in any program that also loads
  `@types/node`; the two sites here use `TextDecoder` now, and a `WATCH` comment on
  `scripts/build/emit-template.mjs` marks it for the day upstream drops the global.
  Also imminent: `@cloudflare/vitest-pool-workers` 0.22 is the last version under that name, and
  1.0 renames it to `@cloudflare/vitest-plugin` with a codemod
  (`npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin`).

### The reproduction seam is BUILT, both halves (2026-08-19, earlier)

**The live-reproduction seam is complete end to end.** A `repro` fence in a docs source renders as a
live, themed, contained reproduction of a real admin component. Plan and all five post-mortems:
`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`.

The delivery half shipped in **cairn-pub** on `pass-d-docs-tracks`, eight commits, `8bef4f0` through
`e182f36`. That repo's own `docs/STATUS.md` holds the site-side detail and the queued Pass 7. Two
engine commits landed here alongside it, neither planned and both load-bearing: `42b9d105` lets a
prerendered route mount `EditPage` (four of the 25 story pages emitted no HTML at all without it),
and `a5a069a8` binds a story's chip numbers rather than only its marker keys.

**The editors rewrite** is the pass this seam was built to unblock, and it is now the track AFTER
the release rather than before it (see the reordering at the top of this file). It runs in
`~/Projects/cairn-pub` on the SAME branch `pass-d-docs-tracks`, not here and not off a fresh branch.
Launch prompt for a fresh session from `~/Projects/cairn-pub`: "Execute the editors rewrite against
the built live-reproduction seam. Read cairn-pub `docs/STATUS.md` Pass 6 and 7, and the seam spec at
`docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md` including its 2026-08-18 and
2026-08-19 amendments." Run the one-executor check there first (`pgrep -f cairn-pub`, warm
`git status`). This is taste-and-prose work against a frozen contract, so it is a Fable sitting
rather than an execution session.

**What the rewrite inherits.** The 25 story ids and the fence schema are frozen; gate 3 fails the
build on a fence naming a story the installed manifest does not carry. Alt and caption text is
authored against the live `/repro` pages, which now exist and render. Three pages owe keyed prose
lists matching the numbered chips: `editor/entry-screen`, `media/library`, and `tags/screen`.

**Two of the three things owed before a docs page embeds a story are now closed** (2026-08-19, this
repo, engine-side). One remains, and it belongs to the rewrite rather than to the engine.

1. **`media/insert-panel` pictured a control the real admin never renders. CLOSED.** `ReproStory.pose`
   now receives the mounted component's own exports as a second argument, which `ReproContext` hands
   its host through a new `oninstance` prop. The story mounts headless, exactly as the real editor
   mounts it, and poses through the exported `open('chooser')`, so the "Insert image" text button is
   gone. The handoff runs synchronously inside the mount rather than from an effect, since a host
   that mounts and immediately poses would otherwise read `undefined`. The second parameter is
   required on purpose: a host that cannot supply an instance fails to compile.
2. **`tags/screen` cropped away its own callouts. CLOSED.** Its declared column height went from 700
   to 940. What makes it stay closed is a new geometric gate,
   `src/tests/component/reproductions-marker-crop.test.ts`: it mounts every markered story at the
   width its embed renders at, resolves each anchor against the posed DOM, and fails when the chip
   centred on that anchor falls outside the declared box. Run against the old height it names the two
   offenders and their positions (chip 4 at 814px, chip 5 at 900px), which is the falsification
   proof. Its one blind spot is filed in ROADMAP Now: a `column` story is proven at the docs measure
   only, and the same content reflows taller on a phone against the same fixed height.
3. **A 150-character accessible name is thin for the three locate-many-controls screens**, so a
   reproduction whose surrounding prose does not already describe the screen needs a longer
   description than its name. ROADMAP Now tier. **Still owed; the rewrite authors it.**

**What cairn-pub owes on its next engine install.** Widening `pose` is a compile-time break for a
host that calls it. `src/lib/docs/repro-story-lifecycle.ts` calls `story.pose?.(element)` and
`src/routes/repro/[...story]/+page.svelte` mounts `ReproContext` without `oninstance`, so both need
the instance threaded through. Nothing breaks until that repo re-packs the engine, since it is pinned
to the `0.95.0-rc.1` tarball, and the break is a type error rather than a silent misrender.

**BRANCH TOPOLOGY AND THE PIN, the things a cold session gets wrong by default.** cairn-pub consumes
the engine through `"@glw907/cairn-cms": "file:/home/glw907/Projects/cairn-scratch/glw907-cairn-cms-0.95.0-rc.1.tgz"`,
an absolute local path recorded as such in the lockfile, because the published `0.95.0-rc.1` predates
all of this and carries no `reproductions` subpath. **That branch must not merge while the pin
stands**; `0.95.0` on the registry is the un-pin, and it carries the `reproductions` subpath the pin
existed to supply.

**Do both halves with `npm run link:consumer` (2026-08-20) rather than by hand.**
`npm run link:consumer -- ~/Projects/cairn-pub` builds, packs, installs, and then verifies every
file in the consumer's installed copy against the tarball; `--restore` puts it back on `^<version>`
from the registry and refuses to report success unless the lockfile resolves to an `https://` URL.
The verification is the point. `npm pack` names a tarball from the version, so re-packing changed
code at one version reuses the filename, and a later plain `npm install` restores the OLD build out
of npm's content-addressed cache. Reproduced 2026-08-20: a tarball with the change removed still
installed the changed build, with npm printing "up to date". The script names each pack with a hash
of its own contents, so a filename cannot outlive its bytes, and it fails loud if the installed tree
ever disagrees with the tarball.

**Gate state at the close.** In cairn-pub: `npm run check` 0 errors across 850 files, `npm test`
exit 0, `npm run build` exit 0, 25 of 25 story pages emitting HTML, and the probe reporting 21 checks
exit 0 against a built preview with every check proven able to fail. Here: `npm run check` 0/0 across
1634 files, the full suite exit 0, `check:comments` clean. `CHANGELOG.md`'s `## Unreleased` window
carries the `EditPage` fix in consumer terms. No version bump, no publish.

**Gate state after the two owed engine items landed (2026-08-19).** `npm run check` 0 errors, 0
warnings across 1636 files; `npm test` 426 files and 5656 tests, exit 0; `check:comments`, `lint`,
`check:reference`, `check:reference:signatures`, `check:visuals`, and `check:vale` all clean. Both
new assertions were proven able to fail before the fix went in. The changelog folds both into the
existing unreleased reproduction-seam entry rather than opening a new one, since the seam itself has
never published: no consumer can be broken by a signature it has never had. Still no version bump and
no publish.

**A four-lens review gate found 54 findings.** Five were folded into the pass; the rest are cairn-pub
Pass 7, which is coherent enough to be a pass rather than a punch list: the seam's gates prove a
hand-transcribed mock rather than the shipping path, and no `repro` fence exists in the installed
corpus for the delivery path to run against.


**The `repro-containment` worktree is merged and pruned.** Nothing branches from it.

### The visual layer runs before release one (Geoff, 2026-08-15)

**The editors-track read is deferred, not skipped (Geoff, 2026-08-15).** On first contact with the
finished track he asked why the docs carry no images or diagrams, and the answer changes the pages
themselves rather than adding to them: the corpus ships zero visuals, the screenshot half was a
real ruling whose live-reproduction replacement was never built, and the diagram half was never
decided at all (eight diagrams went out with the deleted arms). **Prose written to stand alone
without a picture is substantially different prose**, so pages like
`write-in-the-editor.md`'s `## The screen`, which is a screenshot rendered in words, get rewritten
and shortened rather than illustrated. Reading the track closely now would grade prose that is
expected to change. The full finding, the evidence, and what the decision owes are the
visual-layer entry at the top of `ROADMAP.md`'s Now tier.

**The sitting's research is done and banked (2026-08-15, Opus 5 session).** Eight readers ran
the three-tier brief; the findings, with the cross-cutting synthesis and Geoff's added
polish constraint (diagrams carry understated professional polish, never stock-theme output),
are at `docs/internal/record/2026-08-15-docs-visual-practice-research.md`. Headlines: the
live-reproduction and transcript vocabularies are strongly confirmed; the extend track's
"mermaid-first at density" default is pressured (Astro ships one diagram in 418 pages and
zero mermaid; only Kubernetes is diagram-rich, with a caption mandate); no standard,
platform, or style guide binds diagram legibility at 320px, and WCAG explicitly exempts
diagrams from reflow. The Fable sitting now rules rather than researches.

**The Fable sitting ran and ruled (2026-08-15).** The rulings are banked at
`docs/internal/record/2026-08-15-docs-visual-layer-rulings.md` and the ROADMAP Now entry
summarizes them: the 320/390 bar released for authored diagrams (containment plus a complexity
budget plus a two-part text alternative replace it), themed mermaid with a designed cairn diagram
theme built first, the diagram inventory re-tested from seventeen down to twelve, a gated
alt-and-caption standard, motion out by decision (trigger filed in Later), and numbered
callouts with keyed lists for the three locate-many-controls screens. The per-page contracts in
`2026-08-15-docs-outlines-with-visuals.md` stand as amended by those rulings.

**The diagram-pages pass is MERGED (2026-08-16, merge `817d155a`).** Branch
`docs-diagram-pages`: the eleven mermaid diagrams across ten pages, the nine page rewrites
(plus `configure-rendering.md`'s link), and the `check:visuals` gate, all reviewed on the
branch by the eleven `cairn-register-editor` fan-outs and the must-survive sweep. The merge
gate ran in full in themed cairn-pub: tarball-installed branch payload, full-page reads of all
ten diagram pages in both schemes, the end-to-end accessibility proof (the SVG's computed name
is the authored `accTitle`, its description the authored `accDescr`), the containment probe
green with the gantt holding its date axis at 320/390 (so its caption's placeholder-axis
clause stays), and Geoff's before/after on the two marquee diagrams (approved; his one
finding, cluster-title spacing, fixed as cairn-pub `d4e7575`). Merge hygiene re-verified the
full must-survive set and the four code-derived diagrams against current `main`, and
regenerated the scaffold tree from a fresh bake (the `.gitignore` packlist fix has landed, so
the page's kept dotfile entries are real). Post-merge full gate green on `main`: svelte-check
0/0, every doc gate including the four CI-only checks, 5322 tests exit 0. Post-mortem in the
plan file: `docs/superpowers/plans/2026-08-15-docs-diagram-pages-pass.md`. The theme-side
mechanic the gate surfaced (post-measurement metric drift in mermaid HTML labels) is filed at
`docs/internal/record/2026-08-16-diagram-theme-harvest-findings.md`; its fixes live in
cairn-pub (`eae4033`, `d4e7575`).

**The transcript-fixtures question, carried here since 2026-08-15 as resolved in the negative,
is now resolved in the positive (2026-08-17).** The capture pass ran; the fixtures exist and both
admin pages quote them. The editors track stays blocked on the live-reproduction seam, unchanged:
reproduction content is decided by the render (fixture data, crop, widths), not by an authorable
source, so writing it now would mean writing it twice.

**The admin-screen reference capture is banked (2026-08-15).** The sitting ended by capturing
the real admin screens as writer-facing reference material for the editors rewrite and the seam
work. The run was cut short twice, first by a transient connection error and then by the laptop
losing power, and the recovery session re-ran it clean. The set is 44 captures under
`docs/internal/reference-captures/2026-08-15-admin-screens/` (1440 and 390, light plus two dark
states, one capture per editors-track visual contract), with `.capture-state.json` recording
each capture's page contract and posed state, zero gaps. The one-off driver is
`examples/showcase/scripts/reference-capture.mjs`; it stays in-tree until the editors rewrite
consumes the set, then gets deleted per its own header. This is internal reference only: the
npm `files` whitelist excludes `docs/internal`, so none of it ships.

**SUPERSEDED 2026-08-19 by the reordering at the top of this file: the release now comes after the
release-debt engine pass, ahead of the rewrite and the read. The paragraph below is kept as the
record of what it replaced, and its same-cut obligations still stand.**

**Geoff ruled the sequencing (2026-08-15): release one waits for the visual layer.** There is no
hurry to release, and the docs go out at best quality with the beta release. The visual work runs
first, in the rulings record's order (the cairn diagram theme in cairn-pub, then the extend and
admin diagrams with their gates, then the live-reproduction seam, then the editors rewrite), then
the deferred editors-track read happens against the rewritten pages, then release one is cut. The
same-cut obligations and the `.gitignore` defect are unchanged and wait with the cut. **The beta
framing carries two standing items if release one is that beta:** the `Consumers must:`
parseable-changelog API is filed to land before the beta (Geoff's own call, per the ROADMAP), and
the churn-free-until-beta era closes with it; confirm both ride the release-one bill when the cut
is planned.

**When the read does happen**, record it here as a line reading `Editors-track read: done <date>`,
immediately below this paragraph, before `cairn-release` is invoked. No agent pass substitutes for
it; a cold session that finds no such line treats the read as outstanding and stops, rather than
re-asking or standing in for it.

**Release one is cut directly from `main`**, which is where this doc and the whole window now
live; the `cairn-release` skill needs no worktree of its own, unlike a development pass. **Then
invoke `cairn-release`**, verifying the next number is free first
(`npm view @glw907/cairn-cms versions --json`; numbers are immutable). Release one rolls this
window plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs
reset. **Its same-cut obligations, all four in one publish**, so no shipped page describes
tooling that is not installable: the engine window, `create-cairn-site`,
`@glw907/cairn-cms-dev`, and the template repo, plus T5a' (the public repo, the first sync, the
button spike, the C3 check). Task 7's staged button block consumes the button spike.

**The `.gitignore` scaffold defect is FIXED (2026-08-15).** npm's packlist strips any file
literally named `.gitignore` from a tarball wherever it sits, so the bake now stores it dot-free
(`gitignore`) via a new `bakeForPacking()` (the `prepack` entry point; plain `bake()` stays
dotted for `sync-template-repo.mjs`'s git-publish overlay), and `scaffold.mjs` renames it back
in the scaffolded site, fail-loud in both directions. Red-then-green tests plus an end-to-end
`npm pack` proof; changelog entry under Unreleased. This also clears the capture pass's tool
prerequisite.

Queue (reordered on Geoff's 2026-08-15 parallelization call): **the diagram-pages pass and the
cairn-pub theme both LANDED: the pass merged here 2026-08-16 (`817d155a`), and the theme holds
on cairn-pub's `pass-d-docs-tracks` for the site walk after release one. The seam DESIGN
sitting ran 2026-08-15 and is DONE:** the spec is ratified at cairn-pub
`docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md` (branch
`pass-d-docs-tracks`, pushed) and the two-pass implementation plan at
`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md` (this repo, `main`). Both
survived a 20-plus-agent adversarial review each (spec: 16 verified findings folded, 0 refuted,
which moved fence delivery to the rehype stage past the sanitize floor and made posing the rule;
plan: 16 verified folded, 0 refuted, which relocated the mount tests to the browser vitest
project, added the fixture-asset route, and declared the pass split). **The capture pass ran
2026-08-17 and is history** (plan and post-mortems:
`docs/superpowers/plans/2026-08-16-capture-pass.md`; the brief it ran from is
`docs/internal/record/2026-08-15-capture-pass-brief.md`). What remains: the seam build (two
passes, plan above) -> the editors rewrite -> the editors read -> release one -> the three-site
walk -> P.** The seam build Pass 1 is the immediate next action; its launch prompt and its
warm-worktree precondition are at the top of this doc.

### cairn-pub is PREPARED and deliberately not merged

Branch `pass-d-docs-tracks` in `~/Projects/cairn-pub`, **pushed to origin as of 2026-08-15**
(Geoff's push instruction at the seam sitting close supersedes plan ruling 3's never-push;
the branch now also carries the seam spec, and the merge gate below is unchanged). Proven against a packed tarball: 81 prerendered pages, zero broken links, a
clean rebuild. **The site walk merges it after release one**, and the ordering is forced rather
than a preference: that branch reads the docs payload out of its installed
`@glw907/cairn-cms`, and the published `0.94.0-rc.1` predates the restructure, so a build against
the registry fails on the pages the restructure added until release one ships the new payload. It also fixed a defect the rebuild
introduced there: the reference index's new "also for site admins" grouping relists three pages
and the loader walked every bullet list, so the second occurrence won the prev/next map. Its
link policy is a build-time throw.

### Hand steps for Geoff, independent of the queue above

These are not gated on release one, the site walk, or each other. Item (1) in particular should be
actioned now rather than batched with the rest; it is listed first because it is a live credential
exposure, not because it is first in any sequence.

**NINE outstanding, none urgent.** Two closed 2026-08-18, both by Geoff's ruling rather than by
action: the browser glance at the Advanced Certificate Manager line item (the copy hedges instead,
so `money.mjs` and two admin pages scope the total to the two confirmed figures and disclose the
open item, with a test pinning the hedge; the friction log now holds no live finding), and the
estate Cloudflare token (`Cloudflare Admin 2026-07`), which he closed outright: the screen was
secured, so the transcript exposure reached nobody. **That token is off this list by decision, not
by oversight, and is not to be re-raised on the old "URGENT, leaked and still active" framing.**

(1) Delete the GitHub App `cairn-t4b-live-03cd31`. (2) Revoke the T4c spike API token
`d07b2a25f05151591830c45053186979`, then `rm -f ~/.config/cairn/t4c-spike-token
~/.config/cairn/store-t4c-token.sh`. (3) 907-life's push-to-deploy has been broken since
2026-07-14. (4) `TEMPLATE_REPO_TOKEN` is no longer owed: the 2026-08-20 template move deleted the cross-repo sync that needed it. (5) The button
spike's browser moment, owed at release one with T5a'. (6) Delete the GitHub App
`cairn-t5-scratch` (id 4585219), which uninstalls installation 153531337 with it; with (1) and
(9) the ledger stands at three Apps awaiting deletion. (7) Revoke three Cloudflare API tokens at
dash.cloudflare.com/profile/api-tokens, all named for `create-cairn-site`: T5 run 1's five-key
token, T5 run 2's eight-key token, and the eight-key token minted 2026-08-13 for T4d's live proof
and teardown. (8) Check the Workers Paid opt-in taken at T5 run 2's prompt, in case the account
was not already on it via 907-life. (9) Delete the GitHub App `cairn-cairn-capture-scratch`,
created 2026-08-17 by the capture pass on the personal account, which uninstalls its
installation with it; this is the THIRD App awaiting hand-deletion.

**Capture-pass scratch estate (2026-08-17), torn down in-session at Task A6, not by hand.** The
GitHub repository `glw907/cairn-capture-scratch`; the worker `cairn-capture-scratch`; D1
`cairn-capture-scratch-auth` (`e8e4e453-25bc-4f26-a427-680211fa7623`) and
`cairn-capture-scratch-app` (`7acae31b-366a-496c-a8e1-38c352770b1d`); R2 bucket
`cairn-capture-scratch-media`; the local state record
`~/.config/cairn/sites/cairn-capture-scratch-e9ad36.json`; and the wrangler OAuth session.
**TORN DOWN AND VERIFIED BY LISTING, 2026-08-17.** Worker, both databases, bucket, and
repository all confirmed gone; the state record is deleted and wrangler is logged out
(`wrangler whoami` reports not authenticated). Only the App above needs Geoff. **No doctor
token was minted**, so none is owed: the credentialed report's output is identical under any
token (its zone checks fail because `showcase.test` exists nowhere, and its D1 checks skip
structurally), so the run reused the existing account token rather than minting and revoking
one for no change in bytes.

**Carry-forwards (the tool initiative). AUDITED ONE BY ONE 2026-08-18 against the code, not against
these sentences.** Three are hereby dropped rather than carried a sixth window, each checked and
judged not worth filing: (3) `packages/create-cairn-site` having neither a comment nor a type gate
(the package is plain JS by design, its own suite is the real gate, and no pass has reported a defect
slipping through), (4) the `paid-plan-missing` mapping keyed on entitlement wording (the call site's
docstring and its test name both already state the risk and the reason), and (6) the root `CLAUDE.md`
context-headroom note (housekeeping, outside any tracking doc's charter). Of the rest, (1) and (2)
moved to `ROADMAP.md` with real triggers, and (2) grew: four published assertions across two extend
pages state a commit attribution that live commits disprove, which the carry-forward's source-comment
scope never covered. **The dropped three are gone from the list below, which the 2026-08-18 entry declared and then
contradicted by relisting them** (found and fixed at the B0 close; the friction log's own closing
paragraph had asked for exactly this). The remainder stand as written, renumbered:
(1) An externally registered domain still owes the branches the scratch domain cannot reach.
(2) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts` versus spec 7.4).
(3) The deferred defect list per the T4a spec's ruling 2. (4) `--yes` with `CAIRN_CF_API_TOKEN`
equal to a saved token that fails validation throws rather than re-validating, a deliberate
narrowing. (5) `runStep` exists as an identical one-liner in four modules; the hoist is right but
is a cross-cutting refactor of pre-existing code. (6) A first `--yes` run cannot reach
`builds-live`, since the reconcile hash gate has no prior hash. (7) The bake couples the template's
installability to the publish window. (8) No gate proves a scaffold against the registry. (9) The
console scenario is mirrored in `test/console-hold.test.mjs` and
`.github/workflows/create-site.yml` with nothing linking them. (10) No spawned-child test covers
the pre-first-probe interrupt window. **CLOSED by
Pass D:** the browser-moment counts (the admin track's domain page states them) and the
umbrella's resume table (now `docs/admin/setup-recovery.md`).

## Standing state (release ordering, consumers, open items, carry-forwards)

**The whole `create-cairn-site` initiative is shipped history**, T4a through T4d plus T5: the
detail lives in each plan's post-mortem and the archived entries. The T4c live spike at
`docs/internal/record/2026-08-12-t4c-builds-spike.md` stays the fixture source for every Builds
fake body and carries its teardown table. Pass D is now history too, on the same terms; the
entry above holds what release one still needs from it.

**Release one is the next cut, now waiting behind the visual layer** (Geoff, 2026-08-15; the
2026-08-09 ordering otherwise stands). The entry above carries the same-cut obligations and the
one human read still owed.

**cairn-pub's open item, not yet resolved:** the `cairn-cms` GitHub App installation does not
carry `glw907/cairn-pub`, so a save or publish on that site cannot commit. Adding a repository to
an App installation needs a token that can modify the App (the `gh` OAuth token and the stored bot
PAT both refuse), which needs Geoff, in a browser, at the App's own installation settings.

**One registry loose end, not acted on.** A stale `rc` dist-tag still points at `0.6.0-rc.1` from
the pre-rebuild era, so `npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses
`next`, so `rc` should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an
outward-facing registry change nobody asked for.

**A watch routine is live** for the two external AI-crawler triggers: `trig_01SLdXarWCJX2LD2FB8b3Dqk`,
monthly on the 1st, first run 2026-09-01, emailing only when a condition trips. It watches Cloudflare's
2026-09-15 crawler-default change and the crawler table's staleness. **It carries a correction to the
plan:** whether that change reaches backward into zones with an existing configuration is genuinely
ambiguous in Cloudflare's own post, which the ROADMAP had asserted as settled fact.

**FOUR consumer sites.** ASC is current on `^0.94.0`; the other three sit on their own `0.x`
carets and move only by migration (a caret admits only its own minor in `0.x`), which waits for
release one per the ordering above:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `0.94.0-rc.1` (pinned exact) | this window only. **Corrected 2026-08-14 at Pass D Task 12**, which found this row claiming `^0.87.4`: a prior pass already landed the full upgrade, so the six-minor gap this table asserted does not exist. The `Consumers must:` work is done, blocked only on the GitHub App item above |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site.** It is current on the engine, pinned at
`0.94.0-rc.1`; what it is behind on is the docs restructure, which its prepared
`pass-d-docs-tracks` branch carries and the site walk merges.

**The seam worktree `.claude/worktrees/repro-seam` is MERGED (`bd716ac7`) and can be pruned.**
Nothing branches from it. Pass 2 does not run here at all; it runs in `~/Projects/cairn-pub` on
`pass-d-docs-tracks`.

**Two further worktrees survive the Pass D cleanup, and neither is live work.**
`.claude/worktrees/wayfinder-retheme-lab` and `.claude/worktrees/wayfinder-fixtures` hold
token-layer design experiments from 2026-07-02, left unmerged on purpose as a reference for a
later retheme. Nothing branches from them and no executor runs in them; the one-executor-per-worktree
check clears against them trivially. Every other worktree and every merged branch was pruned at the
Pass D close, so `main` plus these two is the whole local picture.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock. **One docs-rendering carry-forward retired here:** the section-index
breadcrumb duplication rode the old arm structure, so it re-verifies against the rebuilt cairn-pub
loader at the site walk rather than standing as a known defect. **The mermaid-legibility item is
moot for the wrong reason, and the reason is now the open item** (see the visual-layer entry in
`ROADMAP.md`): no published page carries a diagram because the rebuild deleted all eight along
with the arms that held them, not because anything was fixed.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-08-09-to-2026-08-11.md` (the T1 completion, docs-refactor pass-start, and T3-built entries),
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass), and `STATUS-archive-2026-07-29-to-2026-08-01.md` (the `0.91.0` publish, the
`0.91.1` hotfix and ASC harvest fold, the `0.92.0` design-ratchet minor, and the xcathletes seams
pass as planned).
The C1 seam-shape pass, the refusal-channel convergence, and the C2 window as it stood before
merging are in `STATUS-archive-2026-08-02-to-2026-08-03.md`. The auth-channel window and the
AI-posture pass, as STATUS carried them up to the `0.94.0-rc.1` cut, are in
`STATUS-archive-2026-08-04-to-2026-08-05.md`. The stable `0.94.0` window, ASC's adoption, and the
vertical-alignment pass as STATUS carried them are in `STATUS-archive-2026-08-08.md`. The T4b.1
close, T4b's delivery-unproven standing note, and the pre-merge urgency it carried are in
`STATUS-archive-2026-08-12-t4b1-close.md`. The rc.2 cut, the ASC end-to-end verification, and
the RC window as STATUS carried them to the stable `0.94.0` cut are in
`STATUS-archive-2026-08-06-to-2026-08-07.md`. The T4c-planned entry, the state its execution
session started from, is in `STATUS-archive-2026-08-12-t4c-planned.md`. The T5 Task 8 live-e2e
close, the T5a split record, and the state T4d's execution session started from are in
`STATUS-archive-2026-08-13-t5-task8-close.md`. The T4d close entry, with the live-proof and
teardown record as STATUS carried them to the Pass D planning sitting, is in
`STATUS-archive-2026-08-13-t4d-close.md`. The four entries Pass D itself ran through, the
planning entry, the Phase 1 close, the Phase 3 start, and the production-gate failure that
blocked Phase 3 until its fold landed, are in `STATUS-archive-2026-08-14-pass-d.md`.
