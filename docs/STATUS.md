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

## Immediate next action (2026-08-09, night: Pass T1 tasks 1-7 LANDED on `create-cairn-site`; tasks 8-10 are BLOCKED on Geoff's baseline walk)

**Pass T1's local half is built and green, and the pass deliberately stops short of its own
finish line.** Tasks 1 through 7 are landed on the `create-cairn-site` branch (worktree at
`.claude/worktrees/create-cairn-site`), **pushed to `origin` and tracking, not merged, and with no
PR open**. No CI has ever run against this branch: every gating workflow (`test`, `scaffold`,
`e2e`, `design`) fires on `push` only for `main` and `rebuild`, plus `pull_request`. Two changes in
this window are therefore CI-unproven, and both are the kind CI exists to catch: the
`.cairn-template.json` exclusions change what `scaffold.yml` emits, installs, typechecks, and
builds, and the two steps added to `test.yml` have never executed there. Opening a PR runs all
four, and Task 9 needs one anyway. Tasks 8, 9's workflow half, and 10
remain, and **Task 8 is blocked by design**: the plan makes it wait on the un-agented baseline
walk, whose ranked drag points are supposed to reorder and reword the command's printed next
steps. Geoff ruled at pass start that he walks it himself. The protocol shell is committed at
[`2026-08-unagented-setup-baseline.md`](internal/2026-08-unagented-setup-baseline.md); it needs
his log filled in and committed before Task 8 is dispatched.

**Resume prompt** (fresh Opus session, launch directory `~/Projects/cairn-cms`): "Finish the
create-cairn-site T1 plan at `docs/superpowers/plans/2026-08-09-create-cairn-site-t1.md`. Tasks
1-7 are landed on the `create-cairn-site` branch; Tasks 8, 9, and 10 remain. The recorded baseline
walk is at `docs/internal/2026-08-unagented-setup-baseline.md`; fold its ranked drag points into
Task 8's printed next steps before dispatching. Task 9's `test.yml` half is done; its
`create-site.yml` half remains. Work on the existing `create-cairn-site` worktree, not a new one.
Start with the cairn-pass skill."

**What landed:** a new `packages/create-cairn-site` (unscoped npm name `create-cairn-site`,
verified free), plain ESM `.mjs` on `node:test`, 43 tests green. Argument parsing; the action
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
