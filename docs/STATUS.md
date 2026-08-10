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

## Immediate next action (2026-08-10: Pass T1 is COMPLETE on `create-cairn-site`, PR #25 open; next is Pass T2)

**Pass T1 is done, all ten tasks.** The work sits on the `create-cairn-site` branch (worktree at
`.claude/worktrees/create-cairn-site`), pushed, with **[PR #25](https://github.com/glw907/cairn-cms/pull/25)
open and not merged**. Opening the PR is what first ran CI against this branch: every gating
workflow fires on `push` only for `main` and `rebuild`, plus `pull_request`, so the whole window had
been CI-unproven. All five checks passed on the tasks 1-7 window, including the two `test.yml` steps
and the `.cairn-template.json` exclusions that change what `scaffold.yml` emits.

**Resume prompt** (fresh Opus session, launch directory `~/Projects/cairn-cms`): "Plan and execute
Pass T2 of the create-cairn-site umbrella, the GitHub chapter. Pass T1 is complete on the
`create-cairn-site` branch (PR #25, unmerged); read its post-mortem in
`docs/superpowers/plans/2026-08-09-create-cairn-site-t1.md` and the recorded baseline walk at
`docs/internal/2026-08-unagented-setup-baseline.md` first. Start with the cairn-pass skill."
**Decide the merge first**: T2 either branches from `main` after merging #25, or continues on this
branch. A cold session branches from `main` by default and would build against an engine that has
none of T1.

**The baseline walk is recorded, and Geoff changed how it was run.** He first ruled he would walk it
himself, then revised the same day: "a well-tuned persona agent run several times fresh from several
vantage points is probably more effective than I'll be." Five blind persona walks ran (owner-nondev,
dev-new-to-stack, going-live, recovery, wayfinding), every finding carrying a `file:line` quote,
ranked by how many independent walks raised it. The record is
[`2026-08-unagented-setup-baseline.md`](internal/2026-08-unagented-setup-baseline.md). Its
documentation half is Pass D's work list and is filed in the friction log; nothing there is lost.

**The walk changed the product, not just the docs.** Unanimously, all five walks stopped at the same
place: the tutorial's payoff milestone installs `@glw907/cairn-cms-dev`, which is not on npm. Two
walks caught something the plan had wrong, and it was then verified directly in code rather than
taken on trust: a bare `npm run dev` never reaches the admin, because the dev backend needs
`CAIRN_DEV_BACKEND=1` at runtime on top of its build-time define
(`examples/showcase/src/chassis/dev-gate.ts:26`) while the scaffolded script is bare `vite dev`. The
plan's specified hand-over block would have printed a command that does not work. Task 8 prints the
working form instead, branches to PowerShell on Windows, says plainly that the local admin is a
stand-in touching no GitHub repo and sending no real email, and names the Workers Paid plan that
real sign-in email needs. A test locks the switch into the copy so it cannot be simplified away.
**Filed for T2**: the fix belongs in the scaffolded `dev` script, not the printed copy, and it needs
a cross-platform mechanism the template does not carry yet (friction log).

**What landed:** a new `packages/create-cairn-site` (unscoped npm name `create-cairn-site`,
verified free), plain ESM `.mjs` on `node:test`, 52 tests green. The wired command; a
`create-site.yml` CI gate that packs the CLI, installs that tarball into a scratch directory, runs
it, and then installs, typechecks, and builds the site it produced, passing a brand color so the run
exercises the four-declaration rot gate against the real theme file. Argument parsing; the action
runner that makes `--dry-run` a property of the frame; the out-of-scaffold state store
(`~/.config/cairn/sites/<id>.json`, mode `0600`, chmod'd after every write so an overwrite cannot
leave it loose); credential-free pre-flight; the pack-time template bake; and the fail-loud
substitution pass.

**Four plan assumptions were wrong and are corrected in the code, not just noted.** The
`site.config.yaml` target lives at `src/theme/site.config.yaml`, not the scaffold root, and
carries no `tagline:` key. `--color-primary` is **four** declarations (light and dark, primary and
primary-content), so the brand substitution rotates the hue and holds each declaration's own
lightness and chroma, per the theme file's own re-skin recipe; substituting one literal color, as
the plan implied, would have destroyed dark-mode contrast. The Node floor is `>=22`, not the
plan's `>=20.19` fallback. And `@clack/prompts` is at `1.x`, not the plan's `^0.11.0`.

**The release-one blocker this pass found: `@glw907/cairn-cms-dev` is unpublished** (npm 404,
version `0.0.0`). A scaffolded site needs it for the local `/admin` value moment, and the
ROADMAP's own 2026-07-02 scaffolder finding says a standalone scaffold without it fails the
**build**, since Rolldown cannot resolve the absent specifier even behind the dev gate. So release
one must publish the dev backend alongside the engine, `create-cairn-site`, and the template repo.
The bake refuses to run while the spec resolves to `^0.0.0`, naming the package and the fix, so
this cannot be forgotten at the cut.

**A second defect, in the shared emitter, is fixed here:** the template carried showcase-only
material into every scaffolded site, including seven tracked `.claude/agent-memory` notes, the
showcase README whose relative links point back into the engine repo, a design-lab script, and the
Playwright scripts and devDependencies. `.cairn-template.json` now excludes the three paths, and
the bake prunes the package.json lines a path exclusion cannot reach, behind a rot gate that throws
when an expected key has already been renamed away.

**The spec's open platform spikes are RESOLVED and written up** in
[`2026-08-09-tool-passes-platform-spikes.md`](internal/2026-08-09-tool-passes-platform-spikes.md),
so T2 and T3 are planned against verified premises. The two that move a plan: **wrangler's OAuth
session carries `zone:read` only and no registrar scope at all**, so chapter 2's domain half
requires the self-managed OAuth client or token prefill rather than riding wrangler (chapter 1
stays fully inside wrangler's scopes, so the zero-credential quickstart holds); and the **GitHub
installation-token format migration already completed** in late June 2026, so treating tokens as
opaque is a T2 requirement, not a watch item. Workers Builds turns out fully API-driven, including
repo connections and a `config_autofill` endpoint, so T3's step 10 is cheaper than budgeted.

**One Geoff action is queued, and it gates nothing until T3 plans chapter 2:** mint a
Registrar-scoped Cloudflare API token. The standing `CLOUDFLARE_API_TOKEN` is valid but refuses
every Registrar endpoint, including the read-only ones, so whether the Registrar API's curated TLD
subset covers `.ski` and `.life` cannot be answered without one. With that token it is a single
no-cost `domain-check` call. Worth recording in the estate inventory as a gap.

**Also wired: two node:test suites CI never ran.** `npm run test:emit` (nine tests over the
emitter) existed in `package.json` but appeared in no workflow, and the new package's suite is new.
Both now run in `test.yml`.

## Superseded: the pass-start entry (2026-08-09, evening)

**The docs-refactor brainstorm ran with Fable at the helm and became a larger, approved
initiative.** The umbrella design is
[`2026-08-09-admin-setup-and-docs-reset-design.md`](superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md)
(adversarially reviewed by three agents, findings folded, Geoff approved). Four audiences with
the **admin** (technical non-developer) first-class; a two-chapter `create-cairn-site` journey
(live and signed in on free workers.dev before any money, domain, or email); wrangler as the
provisioner; a public template repo as a second door; a four-track docs reset (`admin/`,
`editors/`, `extend/`, shared `reference/`, split `internal/`) with a full-corpus prune.

**The queue after T1 finishes** is unchanged: T2 (the GitHub chapter), T3 (Cloudflare plus the two
doors), Pass D (the docs reset, planned just-in-time against the tool's real UX), then release one.
T2's plan is not written; that session opens with brainstorming against Part 1 step 4 of the
umbrella spec, not with execution.

**The cleanup pass landed on `cleanup` and holds under `## Unreleased`.** All seven tasks plus one
scope addition Geoff made mid-pass. The plan, with its full post-mortem, is
[`2026-08-08-cleanup-pass.md`](superpowers/plans/2026-08-08-cleanup-pass.md); the spec, with an
appended revision explaining why its dead-test criteria produced a worthless first result, is
[`2026-08-08-cleanup-pass-design.md`](superpowers/specs/2026-08-08-cleanup-pass-design.md).

What changed: `scripts/` regrouped into `checks/`/`build/`/`lab/`; `legacy/` deleted; the
unregistered `vertical-metrics` lab module evicted from `src/lib` to `src/tests/lab/` behind a new
`check:package` reachability gate so no unregistered module under the packed rule directories can
ship again; `@anthropic-ai/sdk` converted to an OPTIONAL PEER reached by dynamic import; the three
example theme ports relocated to **https://github.com/glw907/cairn-themes (public)**; 84 binary
artifacts pruned; seven redundant or non-behavioral tests removed; and `CONTRIBUTING.md` added.

**Measured, and the honest read: the packed tarball barely moved.** 2.5 MB / 7.0 MB / 741 files to
2.5 MB / 6.9 MB / 739 files, because only the eviction touches the tarball. `docs/superpowers` plus
`docs/internal` went 29.6 MB to 11.3 MB. **The real consumer win is the SDK peer move: about 13 MB
and 1,980 files off a production install that never enables tidy**, which is the pass's one
`Consumers must:` line. Suite: 5,273 tests / 412 files.

**cairn is MOVING TO BETA (Geoff, 2026-08-08).** That unblocked the public themes repo and a real
contributor guide. It has consequences this pass deliberately did NOT take: the version scheme, the
"closely held"/pre-beta language across `ROADMAP.md`, `CLAUDE.md`, and the docs register, and the
front-door positioning. Those belong to their own initiative.

**The brainstorm's paper trail:** the pre-brainstorm brief
([`2026-08-09-docs-refactor-brief.md`](superpowers/specs/2026-08-09-docs-refactor-brief.md)) is
superseded by the umbrella spec above, which carries the re-derived guide classification (7 admin
setup / 4 admin operations / 17 extender, a **post-tool** truth: five of the seven setup guides
today teach hand-authoring and get rewritten, not moved), the two current-docs research sweeps,
and the three-agent adversarial fold.

**THEN release one, AFTER Pass D** (amended ordering, Geoff 2026-08-09): it rolls this window
plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs reset, and
**`create-cairn-site` and the template repo publish in the same cut** so no shipped page
describes an uninstallable tool. Invoke `cairn-release`; verify the next number is free first.

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
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window (migration ran against `rc.1`; the `Consumers must:` work is done, blocked only on the GitHub App item above) |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site**, a docs shell six minors behind the engine it
documents.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); mermaid diagrams near-illegible at 320/390;
section-index breadcrumbs duplicating the arm name; the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock.

## Archives

Superseded entries live under `docs/internal/history/`:
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
vertical-alignment pass as STATUS carried them are in `STATUS-archive-2026-08-08.md`. The rc.2 cut, the ASC end-to-end verification, and
the RC window as STATUS carried them to the stable `0.94.0` cut are in
`STATUS-archive-2026-08-06-to-2026-08-07.md`.
