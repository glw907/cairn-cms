# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.

## Immediate next action (2026-06-25, latest): Part B2 (Waymark) is COMPLETE; next is the pre-B3 engine/DX slot, then B3

**Part B2 is done on the `feat/scaffolder-b2-design-foundation` worktree** (held, unmerged, unpushed). The
showcase is now Waymark, the public reading theme: a DaisyUI 5 oklch token layer (warm-stone paper, warm
slate ink, a deep ink-blue accent; Fraunces + Source Sans 3 + Source Code Pro, self-hosted via
Fontsource), a bespoke token-bound reading surface (`prose.css`), owned chrome components, a composed
Home, a `/styleguide` proof route, and build-time Shiki highlighting moved into the engine render
pipeline (the one published engine change: role-bound `.cairn-tok-*` classes, no client highlighter). The
engine bumps to `0.65.0`. The design-system reference is `docs/internal/public-design-system.md`.

**Both gates ran.** GATE 1 settled the direction from four rendered options against a 13-reference bar.
GATE 2, a multi-agent adversarial workflow, caught two real blockers the CI gates missed (12 dangling
`--color-*-ink` references that flattened the callout/alert surface, and the re-skin gate's prefix-match
blindness to a dangling token); both folded, plus a token-resolution gate added. The decisive re-skin
proof passed: rotating only `--color-primary` recolors chrome and article together, AA holds in both
gamuts. Three CI gates back it (`check:public-tokens` no-literals + dual-gamut + resolution, `test:reskin`,
the `design.yml` workflow).

**Verified.** `npm test` EXIT 0 (2486); `check` 0/0; `check:comments`, `check:public-tokens`,
`test:reskin`, `check:docs` clean; the showcase check 0-in-`src`; the showcase e2e green (golden-path 10/10
+ the styleguide a11y spec); the emitted-template rot gate builds clean. Plan and post-mortem:
`docs/superpowers/plans/2026-06-25-cairn-scaffolder-part-b2-design-foundation.md`. Merged to `main`
2026-06-25 (fast-forward to `b098984`); local `main` is 17 commits ahead of `origin/main`, not pushed
(no npm publish yet).

**Carry-forwards.** The `hello-hero` hero-byte seed and the plain-URL `<figcaption>` lift are now Tasks 3
and 1 of the engine/DX slot below. Still open past the slot: B4's manual dark toggle adds a `[data-theme]`
scope for the `--cairn-*` customs, and minor a11y/perf polish (styleguide heading nesting, APG Home/End on
the tablist, hero-image CLS dimensions, a font/sheet preload, the sticky-header translucent-background
contrast spot-check).

**NEXT: the pre-B3 engine/DX slot**, then B3. Plan:
`docs/superpowers/plans/2026-06-25-cairn-pre-b3-engine-dx-slot.md` (8 tasks, target `0.66.0`). It clears
the engine, dev-package, and first-hour DX warts a read-based dogfood found before B3 bakes the template:
the `remark-figure` plain-URL `<figcaption>` gap (Task 1), the Ctrl+K/Ctrl+B editor double-fire (Task 2),
the `hello-hero` hero-byte seed (Task 3), removing the calendar entirely (Task 4: route, nav, exclude
entry, and the Mode-1 e2e), the showcase README plus a `CAIRN_DEV_BACKEND=1` dev script (Task 5), the
GitHub-App identity trap (Task 6: appId/installationId are `backend` config, not Worker secrets, and the
doctor must self-test the runtime source), the owed `check:dev-package` gate (Task 7), and the tutorial
Milestone 8 rewrite around the dev package (Task 8). B2 is merged to `main`, so branch the slot off
`main` directly (`git worktree add ../cairn-cms-dx-slot -b feat/pre-b3-engine-dx-slot main`). Method:
main-loop orchestrate-and-verify, `cairn-implementer` per task, full gate between dispatches; the tasks
are mostly independent, so the slot is workflow-parallelizable on opt-in.

**After the slot: Part B3, the defaults surface.** The production Home, the paginated archive, tag pages,
Pagefind search, the SEO kit, the styled error page, and the self-documenting sample content, on the
Waymark foundation. The B3/B4 split is the CI-matrix axis (defaults vs options). B3 also re-establishes
the Mode-1 coexistence e2e (lost with the calendar) against a real site-owned page. See the scaffolder
spec's "Sub-pass sequencing".

---

## Immediate next action (2026-06-25): Part B2 (the design foundation) is PLANNED and ready to execute; B1 is MERGED to `main`

**Part B1 merged to `main` and pushed** (origin at `85b3f5b`; the `feat/scaffolder-b1-factoring` worktree
and branch are removed). **Part B2 (the design foundation) is planned:**
`docs/superpowers/plans/2026-06-25-cairn-scaffolder-part-b2-design-foundation.md`, anchored on the design
bar `docs/superpowers/specs/2026-06-25-cairn-b2-design-bar.md` (distilled from a 13-reference best-of
review).

**Settled direction:** a distinct editorial display face over a legibility-grade humanist sans body (mono
only for code), and a warm paper-and-ink oklch ground with one restrained accent. The exact faces and
values are the frontend-design loop's output. **Non-negotiable principles:** the shipped default is the
product (most users keep it), 2026-modern not trendy, evidence-grounded UI/UX, the prose is the
documentation and shows every markdown element, and the template anticipates the common site-building UI
components and demos every one on a growing `/styleguide` (B2 ships the system and core set; B3 and B4 add
the feature and option components to the same demo).

**What B2 builds:** the DaisyUI 5 oklch token layer (the re-skin surface, the public analog of the admin's
Warm Stone), the restyled chrome, a bespoke token-bound reading surface (every element reads the same
roles, so one edit re-skins chrome and article together), build-time Shiki highlighting moved into the
engine render pipeline (the one engine change), a `/styleguide` proof route, and Home mocked against the
tokens (implemented in B3). Five differentiators and two ordered gates (the visual-design critique, then
the token-layer adversarial review). The public side gets Tailwind + DaisyUI for the first time.

**NEXT: execute B2** in a worktree off `main`
(`git worktree add ../cairn-cms-part-b2 -b feat/scaffolder-b2-design-foundation main`, symlink
`node_modules`, `npm run package`, `npm ci --prefix examples/showcase`), running Phase A (the
frontend-design loop, main-loop) and GATE 1 first, then the `cairn-implementer` tasks, then GATE 2. B2 is
the natural context-clear boundary; this session's brainstorm produced the plan and the bar.

---

## Prior next action (2026-06-25): Part B1 (the factoring) COMPLETE and merged to `main`

**Part B1 (the factoring) is done on the `feat/scaffolder-b1-factoring` worktree.** The showcase is now
the single deployable `cairn-starter` reference: it builds on `@sveltejs/adapter-cloudflare` ^7 with a
real `wrangler.jsonc` (D1 `AUTH_DB`, `EMAIL`, R2 `MEDIA_BUCKET`, observability) and the `0000_auth`
migration, `app.d.ts` carries the real `AuthEnv` `Platform.env`, `npm run dev` serves `/admin` again
(vite `dedupe` + `fs.allow`), and a `.cairn-template.json` emission manifest names the `test`/`spike`/
`calendar` demo routes and the e2e harness it drops. A new `scaffold.yml` CI job packs the engine and
dev package, emits the template against the tarballs, and installs, type-checks, and builds it every
commit (the rot gate); the e2e elimination grep retargets to the deployable `.svelte-kit/cloudflare/`
Worker. Plan and post-mortem:
`docs/superpowers/plans/2026-06-25-cairn-scaffolder-part-b1-factoring.md`.

**Verified.** `npm test` 2482 EXIT 0; `check` 1147 0/0; `check:comments`, `check:docs`, and `test:emit`
(2/2) clean; the showcase check has 0 errors in `src/` and the showcase e2e is 30/30 on adapter-cloudflare;
the local emitted-template dry-run installs, checks 0/0 (443 files), and builds a clean Worker. The
`cloudflare-workers-reviewer` gate approved; its `.dev.vars` gitignore finding is fixed.

**Carry-forwards (Part C and later B-series).** Part C should set `remote: true` on the `EMAIL` binding
(the template ships it off, correct for the test harness) and template `compatibility_date` to the scaffold
moment; a dedicated `check:dev-package` is still owed before Part C publishes `@glw907/cairn-cms-dev` (the
new emitted-template check gives indirect type coverage). The merge of `feat/scaffolder-b1-factoring` to
`main` and the push of the held window await the user's go-ahead.

**NEXT: Part B2, the design foundation.** The first and largest `frontend-design` run establishes the
visual language on the chrome and the article reading surface, and the first-class tokens/theme layer
codifies it on DaisyUI 5's theme system. Home is mocked against the tokens here, then implemented in B3.
Two gates run in order: the visual-design critique, then the tokens adversarial review. B2 is the natural
context-clear boundary. See the scaffolder spec's "Sub-pass sequencing" (B2).

## Immediate next action (2026-06-25, latest): Part B decomposed into four sub-passes; B1 (the factoring) is planned and ready to execute

**Part B is sequenced into four linear sub-passes** in the scaffolder spec
(`docs/superpowers/specs/2026-06-24-cairn-scaffolder-design.md`, "Sub-pass sequencing"): B1 the factoring,
B2 the design foundation (the first-class tokens layer), B3 the defaults surface, B4 the options and first
run. The split between the last two follows the CI matrix axis (the always-present defaults versus the
configurable options). The `frontend-design` loop researches against best-in-class starters from other
systems (Astro, Ghost, shadcn's Taxonomy, Tailwind Plus, Next) and against Svelte/SvelteKit and DaisyUI
templates, and the tokens layer is authored on DaisyUI 5's oklch theme system. The ecxc and 907 sites are
demoted to a requirements cross-check, not the design source.

**B1 (the factoring) is planned:**
`docs/superpowers/plans/2026-06-25-cairn-scaffolder-part-b1-factoring.md`. It swaps the showcase from
`adapter-node` to `adapter-cloudflare` with a real `wrangler.jsonc` (modeled on the live 907-life site),
keeps the e2e green through the dev backend's fabricated `platform.env` (retargeting the elimination grep
to `.svelte-kit/cloudflare/`), gives `app.d.ts` the real `AuthEnv` `Platform.env` type, fixes the broken
`npm run dev`, separates the `test`/`spike`/`calendar` demo routes via a `.cairn-template.json` emission
manifest, and adds a CI job that emits and builds the scaffolded output every commit. Six tasks; the
`cloudflare-workers-reviewer` gate covers the wrangler config and bindings.

**NEXT: execute the B1 plan** in a worktree off `main`
(`git worktree add ../cairn-cms-part-b1 -b feat/scaffolder-b1-factoring main`, symlink `node_modules`,
`npm run package` before `npm test`), dispatching `cairn-implementer` per task with the main loop reviewing
each diff and verifying the gate. B2 (the design-led foundation) is the natural context-clear boundary
after B1.

---

## Immediate next action (2026-06-24): Part A + the pre-Part-B DX slot MERGED to `main` (`0.64.0`, held); next is Part B

**Part A (`@glw907/cairn-cms-dev`, `0.63.0`) and the pre-Part-B DX slot (`0.64.0`) are both MERGED to
`main` (the `feat/cairn-cms-dev` and `feat/pre-part-b-dx` branches and worktrees are removed).** Both are
unpublished; `main` is ahead of `origin` by both windows and not yet pushed. Post-mortem for the slot:
`docs/superpowers/plans/2026-06-24-cairn-pre-part-b-dx-slot.md`.

**The DX slot reshaped all three spec items.** (1) The `AuthEnv` root re-export was already done
(2026-06-13); the stale friction-log bullet is retired. (2) The `media.json` build crash is fixed by
`readCommittedManifest` (exported from `/media`): the showcase reads the manifest through
`import.meta.glob`, so a missing file degrades to `{}` instead of failing the build (a manifest-less
build now verifiably succeeds), removing the seed-empty-file workaround the template would have baked.
(3) **`runtime.publicMediaResolver` was dropped** after an adversarial review (verified first-hand)
showed it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount (two,
already sharing one `cairn.config` export). The real wart, silent broken images (the ecxc 0.57.0 HIGH
finding), is fixed instead by a `media.resolver_absent` warn event, armed in the showcase via a new
`assetsEnabled` dep. All additive, no consumer action.

**Verified:** `check` 1147 files 0/0, `npm test` 2482 EXIT 0, all doc gates; the manifest-less showcase
build succeeds; the default `build/` carries no dev-backend bypass (Part A non-regression).

**NEXT: Part B,** the showcase-to-deployable-template factoring, with the `frontend-design` pass and the
first-class tokens layer (its own adversarial review). It is the large, design-led heart of the
scaffolder; a context clear before it is the natural boundary. See the scaffolder spec's Part B section.

**Carry-forwards:** merge both feature branches and push `main` when ready (origin is behind by the Part
A + DX windows); the real sites (ecxc-ski, 907-life) thread `assetsEnabled` to arm the
`media.resolver_absent` diagnostic at their next cutover; the owed live D1 admin smoke for the Part A
tripwire (no D1 Worker in the showcase); and the dev-package gate coverage (`check:dev-package`) Part C
needs before it publishes `@glw907/cairn-cms-dev`. All in `docs/internal/docs-friction-log.md`.

---

## Prior next action (2026-06-24): scaffolder Part A is COMPLETE and merge-ready (`0.63.0`, held); next is the pre-Part-B DX slot

**Part A (the `@glw907/cairn-cms-dev` dev package) is done on `feat/cairn-cms-dev`, all gates green,
security-reviewed, and ready to fast-forward to `main` as `0.63.0` (held, unpublished).** It extracts the
fake GitHub/D1/R2/Anthropic doubles and the magic-link auth bypass out of the engine and the showcase
into a fenced, fail-closed dev-only package consumed as a `devDependency` (the
dev-backend-out-of-the-engine reversal). The engine gained a `dev_backend_in_prod` tripwire (503, reads
both `platform.env` and `process.env`); the showcase activates the backend behind a build-foldable
`(dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1'` gate, and its
e2e stays on `build && preview` with `VITE_CAIRN_E2E=1` opting the backend in. Eight commits on the
branch; plan and post-mortem at
`docs/superpowers/plans/2026-06-24-cairn-scaffolder-part-a-dev-package.md`.

**Verified.** A default `npm run build` leaves `examples/showcase/build/` free of every dev-backend symbol
across both risk tiers (a ten-needle grep, empty: the Reversal 1 security property). The e2e is 30/30.
The engine gate is green (`check` 1147 files 0/0, `npm test` 2477 EXIT 0, `check:comments` and the four
doc gates clean). The `web-auth-security-reviewer` exit gate found no Critical (the auth-bypass tier is
contained) and its five findings are folded and re-verified.

**NEXT: the pre-Part-B DX slot, then Part B.** The slot lands the `AuthEnv` root re-export (so a generated
`app.d.ts` imports cleanly), the `media.json` graceful-degrade (so the template ships no
seed-an-empty-file workaround), and the `runtime.publicMediaResolver` ergonomic (wire the resolver once,
not three times). See the spec's "Sequencing and the pre-Part-B DX slot" section. Brainstorm the slot's
open calls, then plan it.

**Carry-forwards:** the owed live D1 admin smoke (the tripwire's `platform.env` path and the bypass
against a real Worker, riding the first per-site cutover); the dev-package gate-coverage gap (`check:*`
scope to `src/lib`, so the package is ungated, and Part C, which publishes it, needs a
`check:dev-package`); the broken showcase `npm run dev` (the `file:../..` dist needs vite `dedupe` and a
wider `fs.allow`, for Part B). All in `docs/internal/docs-friction-log.md` under "Scaffolder Part A pass."

---

## Prior next action (2026-06-24): execute the scaffolder Part A plan (the `@glw907/cairn-cms-dev` package)

**The `create-cairn-site` scaffolder initiative is DESIGNED and PLANNED; Part A is ready to execute.** The
design spec is `docs/superpowers/specs/2026-06-24-cairn-scaffolder-design.md` (a three-part initiative,
written after a four-lens adversarial review: Part A the dev package, Part B the showcase-as-deployable
template with a `frontend-design` pass and a first-class tokens layer, Part C the generator). The Part A
plan is `docs/superpowers/plans/2026-06-24-cairn-scaffolder-part-a-dev-package.md`.

**Execute Part A now.** It extracts the fake GitHub/D1/R2/Anthropic doubles and the magic-link auth
bypass out of the engine and the showcase into a separate, fenced, fail-closed `@glw907/cairn-cms-dev`
dev-only package (the dev-backend-out-of-the-engine reversal). Method: a fresh git worktree off `main`
(`git worktree add ../cairn-cms-part-a -b feat/cairn-cms-dev main`, symlink node_modules), one
`cairn-implementer` per task with the main loop reviewing each diff and verifying the gate; a real
`npm install` after adding the workspace, `npm run package` before `npm test`. The mandatory exit gate is
the `web-auth-security-reviewer` pass over the fence and the tripwire (Task 5). After Part A merges, the
small pre-Part-B DX slot lands (the `AuthEnv` root re-export, the `media.json` graceful-degrade, the
`runtime.publicMediaResolver` ergonomic) before Part B begins. See the spec's "Sequencing" section.

**Held context:** the scaffolder design was settled in a long brainstorm (the
`cairn-scaffolder-initiative` memory carries the decisions); this session cleared context after writing
the Part A plan. The engine/DX/docs findings the design surfaced are logged in
`docs/internal/docs-friction-log.md` under "Scaffolder design pass."

---

## Prior next action (2026-06-24): the address-check scope pass is RELEASED as `0.62.2` (npm `latest`); next is the per-site cutover and the open engine tracks

**The editor-help fan-out optimization is RELEASED.** GitHub release `v0.62.2` fired the OIDC
trusted-publishing workflow, and npm `latest` moved `0.62.1` to `0.62.2`. The pass narrowed the editor's
cross-branch address check to the main arm at edit-load (zero extra GitHub reads per editor open, down
from `1 + N`) while keeping the full cross-branch re-check at publish. It resolves the Pass 3 cloudflare
MEDIUM-HIGH carry-forward. Spec and plan:
[`docs/superpowers/specs/2026-06-24-cairn-address-check-scope-design.md`](superpowers/specs/2026-06-24-cairn-address-check-scope-design.md),
[`docs/superpowers/plans/2026-06-24-cairn-address-check-scope.md`](superpowers/plans/2026-06-24-cairn-address-check-scope.md)
(post-mortem in the plan). Geoff settled Option A (main-arm at edit-load, full at publish), backed by
cairn's build-time duplicate-permalink resolver as the hard backstop and the ecosystem norm of checking
the published source. A patch bump, no public export change, no consumer action. A Workflow drove the
three tasks; the main loop verified the gate first-hand (`check` 1146 0/0, full `npm test` 2466 EXIT=0,
all doc gates, from-scratch consumer build) before the fast-forward merge to `main`.

**NEXT (Geoff's calls):**
- **Per-site cutover** to `^0.62.2` (ecxc-ski, 907-life), one site-pass each. This carries the owed live
  D1 admin smoke for the address advisory (the showcase has no D1 Worker).
- **`create-cairn-site` scaffolder** and **media Pass D** (needs-alt at scale, dedupe/merge, AI auto-alt)
  remain open.
- **Option C** (drop the address branch arm entirely) stays the cleaner end state if the publish-path
  branch warning proves to be noise.

---

## Prior next action (2026-06-24): the editor-help window is RELEASED as `0.62.1` (npm `latest`); next is the per-site cutover and the open engine tracks

**The editor-help initiative is RELEASED.** GitHub release `v0.62.1` (tag on `c20731c`, target `main`)
fired the OIDC trusted-publishing workflow (`publish.yml` run `28125474920`, success), and npm `latest`
moved `0.60.1` to `0.62.1`. The single release rolls up the whole window since `v0.60.1`: `0.61.0`
(foundation: `FieldBase.description`, the `date` publish-clarity hint, `supportContact`), `0.62.0` (the
`/admin/help` Help home, exporting `HelpHome` and `HelpData`), and `0.62.1` (the advisory channel plus the
address-collision notice, exporting `AdvisoryNotice` and `AdvisoryAction`). The two intermediate versions
were never published on their own; sites pin by range and resolve to `0.62.1`. `main` and `origin/main`
are aligned at `c20731c`. The release notes follow the commit/PR register (plain prose, no em dash) and
the per-version detail lives in `CHANGELOG.md`.

**NEXT (Geoff's calls):**
- **Per-site cutover** to `^0.62.1` (ecxc-ski, 907-life), one site-pass each. This carries the canonical
  live admin smoke the showcase cannot run (a real Worker plus D1, a colliding entry on a sibling branch
  showing the address advisory), owed since the Help home and Pass 3 landed.
- **Editor-help fan-out optimization** (MEDIUM-HIGH carry-forward from the Pass 3 cloudflare review):
  `buildAddressIndex` runs a full cross-branch fan-out on every editor open, not just the Media Library
  load. The cheapest fix that keeps the locked behavior gates edit-load on the cheap main-arm check first
  and defers the full fan-out to the publish re-check; the alternative parallelizes the fan-out into the
  edit-load stage-1 batch and adds a `branches?` reuse option. This touches the spec's
  full-cross-branch-at-edit-load rule, so it is a deliberate decision. In the friction log and the Pass 3
  post-mortem.
- **`create-cairn-site` scaffolder** and **media Pass D** (needs-alt at scale, dedupe/merge, AI auto-alt)
  remain open.

---

## Prior next action (2026-06-23): Pass 2 (the Help home) MERGED to `main` (`0.62.0`, held); Pass 3 (advisory validation) is DESIGNED and PLANNED; next is to execute the Pass 3 plan

**Pass 2 of the editor-help initiative, the Help home, is COMPLETE and MERGED to `main`** (fast-forwarded
to `ae6fb33` on 2026-06-23, keeping the per-task history; the `feat/editor-help-home` branch and its
worktree are removed). Ten commits (`e8a0356` through `ae6fb33`), versioned `0.62.0` (minor: a new admin
screen, the new `HelpHome` and `HelpData` exports, an additive `/admin/help` route; no consumer action).
UNRELEASED and UNPUSHED (`main` is ahead of `origin/main`), held for the combined release.

All five tasks landed test-first (one `cairn-implementer` per task, the main loop reviewing each diff and
verifying the gate): the shared `markdown-reference.ts`, the pure `deriveGettingStarted`, the `help` view
plus `helpLoad` plus `HelpData`, the `HelpHome` screen, and the pinned Help nav home. The Help home renders
the masthead, the derived getting-started checklist (recede-and-omit, the three-way done cue, a per-device
`localStorage` dismiss), the promoted formatting reference, and the support hand-off shaped to the contact.

**Gate green at the tip (first-hand from the worktree):** `npm run check` 1143 files 0/0; `npm test` 221
files / 2450 tests exit 0; `check:prose`, `check:reference`, `check:docs`, `check:package`, `check:version`
(minor) all exit 0. The from-scratch consumer build passed (fresh showcase `npm install` plus `npm run
build`), and the showcase Playwright e2e ran 30 passed (`CI=1`, fresh server). The code-simplifier
collapsed the duplicated reference tables into one snippet. The svelte and a11y reviewers caught two real
defects the green gate had missed, both folded in: a functional blocker (`'help'` was missing from the
action allow-lists, so Publish-site and Sign-out 404'd from `/admin/help`) and an a11y blocker (a nested
`<main>` landmark, plus a sub-3:1 step-box ring). A third find: `check:prose` reported "clean" while
scanning zero of `HelpHome`'s strings (an extractor strip-order bug, now fixed; a `prose-voice-reviewer`
pass covered the still-unscanned script-array copy and caught two real tells). Full post-mortem in the plan
(`docs/superpowers/plans/2026-06-23-cairn-help-home.md`).

**NEXT: execute Pass 3, advisory validation** (`docs/superpowers/plans/2026-06-23-cairn-advisory-validation.md`,
from the approved spec `docs/superpowers/specs/2026-06-23-cairn-advisory-validation-design.md`). Four
test-first tasks: the advisory-notice shape plus the cross-branch address index (`content/advisories.ts`),
the edit-load `address-collision` notice on `EditData` (plus the new `AdvisoryNotice`/`AdvisoryAction`
exports), the publish-time re-check plus the `publish.address_collision` log event, and the unified
`EditPage` advisory region that carries both the new notice and the existing needs-alt (regression-pinned).
Method: main-loop orchestrate-and-verify, one `cairn-implementer` per task, the full gate between
dispatches, on a fresh worktree off `main`, `npm run package` before `npm test`. Settled: warn-and-allow,
last-write-wins, fail-open, a specific internal channel (no adapter seam), the check at edit-load (full
cross-branch) with a publish re-check, full needs-alt unification. A patch bump.

**Also held (Geoff's call):** roll `0.62.0` into the combined release with the held `0.61.0` and `0.60.1`
site-cutover work, then push and cut the GitHub release (the changelog window since the last published
tag; the release fires the OIDC trusted-publishing workflow). The canonical live admin smoke (a real
Worker plus D1) for both the Help home and Pass 3's address advisory rides the first site cutover; the
showcase has no D1 Worker. Carry-forwards: the prose-gate script-data coverage gap and the
`supportContact`-bare-string personalization limit (both in the friction log), and the deferred
editor-help slices (the recede-on-desk slide-over, the command-palette help, the corpus, starter-content)
per the spec.

**Pass 3 (SKETCHED, not planned):** advisory editor-time validation (warn and allow) plus a cross-branch
address check, per the foundation plan's Pass 3 sketch. Detail and execute it next, off `main` (a fresh
worktree, `npm run package` before `npm test`). The `cairn-editor-help-initiative` memory carries the
sketch.

---

## Prior next action (2026-06-23): Pass 1 MERGED to main (`0.61.0`, unreleased)

**Pass 1 of the editor-help foundation is COMPLETE and MERGED to `main`** (fast-forwarded to `6fc17c9`
on 2026-06-23, keeping the per-task history; the `feat/editor-help-foundation` branch and its worktree are
now redundant and can be removed). It is versioned `0.61.0` (minor, additive, no consumer action), and is
UNRELEASED and UNPUSHED (`main` is ahead of `origin/main`), held for the combined release. The merge
landed all four tasks test-first,
plus a simplifier refinement and the svelte and a11y review fold-ins:

- `FieldBase.description` (`a6187f3`): a per-field author-facing hint, rendered in the Details panel and
  wired to `aria-describedby`.
- `CairnAdapter.supportContact` and `CairnRuntime.supportContact` (`f139d66`): carried through
  `composeRuntime`; the help renders the hand-off only when set.
- the five `### Help surfaces` recipes in `admin-design-system.md` (`c3ff043`).
- the built-in, overridable `DATE_PUBLISH_HINT` default on the date field (`00e85f4`), non-suppressible
  by design (a `description` replaces it).
- the `fieldHint` snippet refactor (`32c87e8`) and the a11y review fold-ins (`f05c0cf`, `8dd5996`).

**Gate green at the tip:** `npm run check` 1133 files 0/0; `npm test` 216 files / 2433 tests exit 0;
`check:docs`, `check:prose`, `check:version` (minor), `check:reference`, `check:reference:signatures`,
and `check:package` all exit 0. Svelte reviewer clean; a11y reviewer ship-ready (contrast AA in both
themes). The from-scratch showcase e2e was deferred to release; `check:package`'s dist-`.svelte`
transpile over the new typed snippet stood in. Full post-mortem in the plan
(`docs/superpowers/plans/2026-06-23-cairn-editor-help-foundation.md`).

**HELD for the combined release (Geoff's call):** `0.61.0` is merged to `main`, not released or pushed.
Roll it into the next published release (with the held `0.60.1` site-cutover work, Pass 2, and any other
held passes); push at release; run the from-scratch showcase e2e then.

**Pass 2 PIVOTED, then was DESIGNED and PLANNED (2026-06-23).** Three prior-art adversarial passes
discarded the "point-of-typing coach" (Clippy and coachmark banner-blindness), then a
selection-bar-plus-placeholder detour (the iA Writer minimalism and the placeholder anti-pattern), and
landed on the Help shell the foundation was built for (WordPress's contextual Help tab, the command
palette, progressive disclosure). A mockup-first design treatment ran as a Workflow: three frontend-design
Help-home prototypes, a six-dimension adversarial critique, a rev.2 synthesis, and a Warm Stone
consistency polish. The design record (`docs/internal/design/2026-06-23-help-shell-mockup-*.html`, the
polished rev.2 canonical) and the spec (`docs/superpowers/specs/2026-06-23-help-shell-design.md`) are
committed.

**NEXT: execute Pass 2, the Help home** (`docs/superpowers/plans/2026-06-23-cairn-help-home.md`). Five
test-first tasks: the shared markdown-reference module, the getting-started derive function, the help
admin view plus load plus `HelpData` contract, the `HelpHome` component, and the pinned Help nav home. Run
on a fresh worktree off `main` (Pass 1's `supportContact` and field-hint seams are merged there now), with
`npm run package` before `npm test`. Method: main-loop orchestrate-and-verify, one
`cairn-implementer` per task, the full gate between dispatches. Settled decisions: progress derives from
observable content and publish state (no D1, no store; `localStorage` only for the per-device dismiss);
the Get-help unset state is the canonical default; the dismiss hides until un-hidden. Deferred: the
wikilink-highlight rider (the `[[` autocomplete wrinkle) and the later slices (the screen-contextual
slide-over with the keyed manifest, the command-palette help, the corpus, the starter-content seed on the
scaffolder). See the `cairn-editor-help-initiative` and `cairn-ui-design-pass-methodology` memories.

**Other open tracks (Geoff's call on order):** the per-site cutover to `^0.60.1` (site-passes, below),
the `create-cairn-site` scaffolder, and media Pass D.

## Prior next action (2026-06-22): `0.60.1` is RELEASED; next is the per-site cutover to `^0.60.1`.

**`0.60.1` RELEASED** (npm `latest`; PR #1 squash-merged to `main` as `735ea4c`; e2e + test green; the
published tarball carries the fix). It fixes the `0.60.0` consumer-build failure: Vite 8 / Rolldown
parsed the TypeScript in the shipped `dist/*.svelte` and failed on a TS optional parameter
(`registry?: T` became invalid `registry?`), an upstream Vite 8 / Rolldown incompatibility rather than a
cairn bug. The fix is a post-package step, `scripts/transpile-dist-svelte.mjs`, that transpiles each
shipped `.svelte` `<script>` body to plain JavaScript (esbuild `verbatimModuleSyntax`, so markup-only
value imports survive) while keeping the `lang="ts"` tag, because the markup still carries TypeScript the
Svelte compiler reads. The showcase lockfile is committed and CI uses `npm ci` so the toolchain is
reproducible, and the spellcheck e2e specs got a larger CI test budget. The full post-mortem and the dead
ends are [`internal/2026-06-21-e2e-dist-svelte-build-failure.md`](internal/2026-06-21-e2e-dist-svelte-build-failure.md);
the `cairn-pass` ritual now carries a consumer-build gate so this class of failure is caught before
release.

**NEXT: migrate both sites to `^0.60.1`** (a site-pass per site, not a cairn-cms pass). `0.60.1` carries
the full spellcheck + tidy work AND the held 907-life media cutover. Per site: bump `@glw907/cairn-cms`
to `^0.60.1`, deploy, and run the owed LIVE ADMIN SMOKE the showcase cannot prove (the first real
spellcheck Worker in a production consumer build, the first dictionary commit, and, where tidy is
enabled, the first real Anthropic Worker call after setting the `ANTHROPIC_API_KEY` Worker secret). Log
any cutover DX friction to each site's friction surface and cairn's `ROADMAP.md`. After the cutover: the
`create-cairn-site` scaffolder and media Pass D.

`0.60.0` is superseded but still on npm; deprecating it needs Geoff's npm 2FA (`npm deprecate
'@glw907/cairn-cms@0.60.0' "superseded by 0.60.1; the 0.60.0 consumer build fails on Vite 8"`).

## Prior next action (2026-06-21): the editor copy-edit + spellcheck pass (`0.60.0`) is COMPLETE on `feat/editor-copyedit`; HELD for merge, release, and push

**`0.60.0` is COMPLETE and unreleased on `feat/editor-copyedit`** (worktree
`.claude/worktrees/editor-copyedit`). All 17 plan tasks landed test-first, the pass-end simplifier ran,
an adversarial review Workflow gated it, and the docs arm is done. This was resumed from a mid-Task-16
power loss: Tasks 1 through 15 were committed, Task 16's files were recovered intact and committed after
one test-harness fix, then Task 17 (docs, version bump, ritual) completed.

**Two editor features.** Spellcheck (default, local): a CodeMirror `@codemirror/lint` source over a Web
Worker that streams a 1.5MB en-US dictionary into spellchecker-wasm, markdown-aware and dialect-aware
(`spellcheck.dialect`), with a correction popover, an objective-error layer, and a personal dictionary
committed to git. Tidy (opt-in, developer-tier `tidy.enabled` plus the `ANTHROPIC_API_KEY` secret): a
Worker action calls the Anthropic SDK with abort/timeout/deadline, the client diffs the result (LCS over
tokens), a validation backstop holds it to a proofread (frontmatter byte-for-byte, bounded divergence),
and a native-dialog step-in review applies only the hunks the author keeps. A config style normalization
is a judgment hunk (defaults to undecided, never swept); only an objective error is pre-kept.

**Gate green at the tip, run first-hand from the worktree:** `npm run check` 1132 files 0/0; `npm test`
215 files / 2429 tests exit 0; `npm run package` exit 0; the showcase Playwright E2E 30 passed (the new
spellcheck + tidy round-trips and the standing spike, plus 27 existing); `check:reference`,
`check:reference:signatures`, `check:package`, `check:docs`, `check:version` (minor) all exit 0.

**Review gate (adversarial Workflow, Geoff's opt-in).** Five dimensions raised 14 findings; the
adversarial verifier confirmed 11 and refuted 3. All 11 folded in test-first. The four high catches: a
`body.indexOf(selected)` selection-offset bug that silently corrupted an entry when the selection text
repeated earlier (fixed with a real `{from,to}` selection seam); number/measurement/time normalizations
swept without confirmation (fixed by adding the missing `matchNormalization` branches); a dead tidy
abort signal passed in the SDK body, not the options arg; and a dark-theme diff contrast failure
(2.70:1) now locked to 5.89:1. Post-mortem with the full detail in
`docs/superpowers/plans/2026-06-20-cairn-editor-copyedit.md`.

**HELD for Geoff (his call):** merge `feat/editor-copyedit` to `main`; cut the `0.60.0` release
(`gh release create v0.60.0 --target main`, fires the OIDC trusted-publishing workflow, npm `latest`);
push; then the per-site cutover. Per the version policy, `0.60.0` bundles the FULL spellcheck + tidy
work and BOTH the still-prepared 907-life media cutover (`feat/media-cutover` `c1c3c45`, already bumped
to `^0.59.0`, rebump to `^0.60.0`) and any ecxc-ski bump ride this one release. The **live admin smoke
is owed** this pass and rides the first site cutover (no real Worker/GitHub/Anthropic in the showcase):
the first real Anthropic Worker call, the first dictionary commit, the first spellcheck Worker in a real
consumer build. Enable tidy per site only after setting the `ANTHROPIC_API_KEY` Worker secret.

**Then (next initiatives, Geoff's call on order):** the `create-cairn-site` scaffolder (needs its own
brainstorm) and media Pass D (needs-alt at scale, dedupe/merge, AI auto-alt, the broken-references
deep-link). Three tidy normalization sub-cases are deliberately unmatched (compound spelled numbers, a
split-hunk time reshape, units outside the curated set) and stay safe judgment hunks; widen the matchers
in Pass D only if real content shows the gap. The `runtime.publicMediaResolver` ergonomic stays a
carry-forward needing its own brainstorm.

## Prior next action (2026-06-20): `0.59.0` SHIPPED + ecxc-ski DEPLOYED and live-smoked; NEXT was the editor copy-edit + spellcheck build

**`0.59.0` is SHIPPED and the ecxc-ski canary is DEPLOYED.** The engine merged to `main`, `gh release
create v0.59.0` published it (npm `latest` is `0.59.0`), main CI green. ecxc-ski's `feat/media-cutover`
(fast-forwarded onto its `main`, `0f27672`) is DEPLOYED to ecxc.ski via CI. The first live admin smoke of
the whole media stack (six passes deferred to this cutover) passed: home 200, the `/media` route mounted
(clean 404 for a missing asset), admin login 200, `/admin/media` 200 rendering the Media Library off a
minted D1 session (the manifest read and the cross-branch usage index work live), and the IRREVERSIBLE
byte purge smoked end to end on a throwaway orphaned byte (the action reported purged and the Worker's
reconcile confirmed the orphan gone). One observation (logged): after a successful purge the Worker's R2
`list` reflected the delete at once but `wrangler r2 object get` lagged briefly, so verify a purge via the
scan, not a direct get. Three DX findings are in `docs/internal/docs-friction-log.md`.

**907-life is prepared and HELD (Geoff's call).** Its `feat/media-cutover` (`c1c3c45`) is bumped to
`^0.59.0`, green (check 487 0/0, build, 15 tests), committed, NOT deployed. Geoff is batching the 907-life
cutover with the spellcheck/tidy (editor) release so it bumps once to the combined feature set.

**NEXT (the next initiative): execute the editor copy-edit + spellcheck build.** Plan:
`docs/superpowers/plans/2026-06-20-cairn-editor-copyedit.md` (spec
`docs/superpowers/specs/2026-06-20-cairn-editor-copyedit-design.md`; design and mockups under
`docs/internal/design/2026-06-20-editor-copyedit-*`, with the conventions research and the design brief
authoritative). Two features for the admin CodeMirror editor: a spellcheck (default, local, CM6
`@codemirror/lint` plus a WASM dictionary, markdown-aware, dialect-aware) and tidy (opt-in, LLM, a
voice-preserving light copy-edit with config-driven style normalization and a diff-review safety
contract). This work IS `0.60.0`, and `0.60.0` is the next release: per Geoff it bundles the FULL
spellcheck and prose-tidy work and ships only when that whole body of work is complete. Nothing ships to
npm in the meantime, so the passes land on `main` unreleased and accumulate under `0.60.0`, and 907-life
plus any other site cutovers ride that one `0.60.0` release once it cuts. Main-loop orchestrate-and-verify,
test-first, one
`cairn-implementer` per task, the full gate between dispatches, on a FRESH worktree off `main`. PHASE 1 is
the worker-plus-wasm-plus-dictionary delivery spike as a go/no-go gate (nspell fallback) before the
spellcheck engine is locked; the tidy apply state machine, the Worker action, the prompt, and the diff are
the closest-review tasks (`model: opus`). The plan, spec, and design were verified by a three-lens
adversarial pass and folded (the key fix closed a voice leak where harmonize-to-author had survived in the
review surface's because-line). See the `cairn-editor-copyedit-initiative` memory.

**Pass C was COMPLETE** on a fresh worktree off `main` (`feat/media-pass-c`, worktree
`.claude/worktrees/media-pass-c`), 11 plan tasks plus one safety hardening, all test-first, the
code-simplifier pass, a four-reviewer gate, and the docs arm. It adds the destructive media cluster to
the admin Media Library: **multi-select bulk delete** (skip-and-report, usage-gated, reversible, one
commit per batch) and **orphan collection** (an on-demand scan, the one irreversible R2 byte purge, and
a read-only broken-references readout), plus the "Unused" -> "No references found" rename. Ships as
`0.59.0` (minor, additive, NO consumer action). Plan + post-mortem at
`docs/superpowers/plans/2026-06-18-cairn-media-pass-c.md`.

Gate green at the tip, run first-hand from the worktree: `npm run check` 1011 files 0/0; `npm test` 198
files / 2208 tests exit 0; the showcase Playwright E2E 27 passed (the two new round-trips + 25 existing);
`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`, `check:readiness`,
`check:version` (minor) all exit 0. The review gate folded in one CRITICAL (the purge re-checks the
strict usage index at action time, closing a scan-to-purge TOCTOU on the irreversible path), one real
E2E-found bug (the orphan scan's body-less form POST 415'd; fixed with an empty FormData), and the a11y
findings (table dropped its `role="grid"` over-reach for the native selectable-checkbox-table pattern;
`aria-modal` added to three dialogs; the fake orphan listbox demoted to a plain checkbox list).

**Safety floor (locked).** Every destructive batch builds ONE shared strict cross-branch usage index
and fails closed if usage cannot be verified; the bulk delete skips in-use assets (never force-deletes)
and commits the manifest rows before deleting R2 bytes; the byte purge is the one irreversible action,
gated by a typed-count confirm, and at action time it re-derives fresh AND re-checks the strict usage
index, so a branch-only upload's live bytes are never purged (orphaned = no manifest row AND referenced
nowhere).

**HELD for Geoff (his call):** merge `feat/media-pass-c` to `main`; cut the `0.59.0` release
(`gh release create v0.59.0 --target main`, fires the OIDC trusted-publishing workflow); push; then the
per-site cutover with the LIVE ADMIN SMOKE (the first bulk R2 delete and the first byte purge; deferred
to cutover per the Pass B/3c precedent, since the showcase has no real Worker/GitHub). At cutover, run
the READ-ONLY `Find orphaned files` scan against the real bucket first (after a `cairn-manifest`
regenerate) to size the orphan state before any purge.

**Then:** the `create-cairn-site` scaffolder (needs its own brainstorm) and Pass D (needs-alt at scale,
dedupe/merge, AI auto-alt, a deep-link from the broken-references readout). The
`runtime.publicMediaResolver` ergonomic stays a carry-forward needing its own brainstorm.

## Prior next action (2026-06-18): Pass B (replace + alt propagation) SHIPPED as `0.58.0` (merged, released, npm `latest`)

**Pass B SHIPPED 2026-06-18:** `feat/media-pass-b` fast-forward merged to `main` (`3ca2a98`) and pushed;
`gh release create v0.58.0` fired the OIDC publish workflow (success); `npm view @glw907/cairn-cms
version` is `0.58.0` (registry `latest`); CI on `main` (test + e2e) green; the worktree and the merged
`feat/media-*` branches were cleaned up; `package-lock.json` version drift synced (`b01a538`). The one
flagged decision (replace keeps the asset slug) shipped as-is. No consumer action.

**Pass B was COMPLETE** on a fresh worktree off `main` (`feat/media-pass-b`), all ten tasks test-first,
the code-simplifier pass, a four-reviewer gate, and the docs arm. It adds two admin Media Library
operations that rewrite published content for every placement of one asset in one atomic commit to
`main`, behind a preview the editor confirms: **replace-in-place** (upload a corrected file; cairn is
content-addressed, so the new file has a new hash and every reference is repointed; the slug/name is
kept, only the hash changes; typed-slug confirm; old asset kept; fail-closed) and **alt propagation**
(push the asset default alt into empty placements, opt-in overwrite of custom alts, decorative hero
skipped, no typed gate). The pure transforms (`media-rewrite.ts`), the fail-closed planner over
`buildUsageIndex` (`rewrite-plan.ts`), the four actions on `createContentRoutes` plus their composer
registration in `cairn-admin.ts`, the two review modals on `CairnMediaLibrary.svelte`, the showcase
E2E, and the docs all landed. Post-mortem with the full carry-forwards in
`docs/superpowers/plans/2026-06-18-cairn-media-pass-b.md`.

Gate green at the tip, run first-hand from the worktree: `npm run check` 1004 files 0/0; `npm test` 194
files / 2153 tests exit 0; `npm run package` exit 0; the showcase Playwright E2E 25 passed (the two new
round-trips plus 23 existing); the `version` (0.58.0 minor + `release-size: minor`), `docs`,
`reference`, `reference:signatures`, `package`, `readiness`, `prose` gates all exit 0. The review gate
(svelte, daisyui-a11y, web-auth-security, Opus correctness) was clean on security and folded in three
real transform bugs (the canonical-YAML fixtures had missed non-canonical-frontmatter cases) and four
component a11y/reactivity fixes, all test-first.

**HELD for Geoff (his call):** merge `feat/media-pass-b` to `main`; cut the `0.58.0` release
(`gh release create v0.58.0 --target main`, fires the OIDC trusted-publishing workflow); push; then
the per-site cutover with the live admin smoke. The smoke is DEFERRED to that cutover (the 3c
precedent): the showcase has no real Worker/GitHub (it runs `vite preview` with fakes), so a real
commit needs a real site repo; the workerd deps are proven via the admin load and the behavior is
covered by the unit + integration + real-browser E2E suites. **One decision flagged for Geoff:**
replace KEEPS the asset's slug (only the hash changes), a spec-compliance fix the E2E surfaced (the
approved spec/mockup promise "the name stays the same"); the plan's Task 1/5 wording had said the new
file's slug wins. One-line revert if Geoff prefers new-slug. See the post-mortem.

**Then: Pass C** (bulk multi-select + orphan collection of superseded assets, mockup-first, in design)
and the `create-cairn-site` scaffolder. The `runtime.publicMediaResolver` ergonomic stays a
carry-forward needing its own brainstorm.

## Prior next action (2026-06-18): Pass A SHIPPED as `0.57.1`; Pass B SPEC + PLAN authored and approved; EXECUTE Pass B next

**Execute Pass B**, planned at `docs/superpowers/plans/2026-06-18-cairn-media-pass-b.md` (spec
`docs/superpowers/specs/2026-06-18-cairn-media-pass-b-design.md`), a `0.58.0` minor. Main-loop
orchestrate-and-verify, test-first, one `cairn-implementer` per task, the full gate between dispatches,
on a FRESH worktree off `main`. Review Tasks 5 and 6 most closely (they rewrite published body content
atomically with the typed-slug and fail-closed gates; consider `model: opus`). The approved rev.2 design
target is `docs/internal/design/2026-06-18-media-pass-b-rev2-mockup.html` (the three source mockups and
the two adversarial critiques produced it via a Workflow). Ten tasks: the pure repoint and alt-fill
transforms, the fail-closed planner over `buildUsageIndex`, the flash/types, the replace actions, the
alt-propagation actions, the two review modals, the showcase E2E, and the docs plus the `0.58.0` bump. A
live admin smoke IS owed this pass (the first media action that rewrites entry content, not just the
manifest). Pass C (bulk + orphan collection, mockup-first) and the scaffolder follow; the
`runtime.publicMediaResolver` ergonomic stays a carry-forward needing its own brainstorm.

## Prior next action (2026-06-18): Pass A SHIPPED as `0.57.1` (merged to `main`, released, npm `latest`); Pass B is next, mockup-first and in design

**`0.57.1` is published.** `feat/media-polish` fast-forward merged to `main` (`c31a8ba`) and pushed;
`gh release create v0.57.1` fired the OIDC trusted-publishing workflow (`publish.yml` run `27739007263`
green, `npm publish --access public`); `npm view @glw907/cairn-cms version` is `0.57.1` (the registry
`latest`). No consumer action: the `decorative` key is additive, the rest is admin or build-time.

**Pass A LANDED on `feat/media-polish`** (a fresh worktree off `main` at `c87ee9f`), `0.57.1`, six
tasks test-first, the code-simplifier pass, a two-reviewer gate, and the docs arm. It cleared the 3c review carry-forwards (the
`/admin/media` action feedback strip with a distinct `flashError` slot; the slide-over Escape edge,
which now yields to the search box), the 3b decorative-hero alt persistence (an additive
`ImageValue.decorative` round-tripped through form/validate/read-back so a decorative hero stops reading
as needs-alt on reload; the body-image case stays needs-alt by design), the reserved-`figure` throw
(now names the colliding component), the six cutover doc findings (two HIGH: the public media resolver
wiring moved into the required media steps, and the figure-collision raised to a prominent breaking
callout; plus the `wrangler.toml` dialect, the `/media` import path, the empty-`media.json` bootstrap,
the `.site-main` re-scope, a new `docs/reference/authoring-syntax.md`, a "Writing an admin fetch action"
note, and a tests-path note), and the ROADMAP refresh (the shipped `0.56.0` pass and the shipped
gallery retired; the post-media Pass A/B/C-then-scaffolder series recorded).

Gate green at the tip, run first-hand from the worktree: `npm run check` 994 files 0/0; `npm test` 190
files / 2055 tests exit 0 (no teardown flake); the `version`, `docs`, `reference`, `reference:signatures`,
`package`, `readiness`, and `prose` gates all exit 0; `prose-guard` clean on every changed doc (advisory
tells only, all pre-existing body). Two reviewers (svelte, daisyui-a11y) converged on the success
live-region pattern; no code change followed, deliberately, since the implementer matched the office
flash grammar the plan mandated (`ConceptList`'s `sr-only`-polite-plus-visible-alert, the codebase's
announce-on-mutation pattern) and the residual repeated-flash edge maps to an existing ROADMAP item.
Post-mortem with the carry-forwards in the plan
(`docs/superpowers/plans/2026-06-17-cairn-media-polish-and-dx.md`). No live admin smoke owed (covered by
the component and unit suites), matching the plan.

**Next: Pass B, replace-in-place plus alt propagation**, the next media pass, now in design. The pass
lets an author upload a new file and repoint an existing reference (a `main`-only repoint with a
branch-delta report), and propagate an alt fix across every placement of an image. It is high blast
(cross-branch rewrites) and mockup-first (the Replace control), so it runs the design-and-approval
gate before a plan: a brainstorm to settle the open decisions, then a frontend-design mockup, then the
spec and the plan. The open design questions are being worked with Geoff now. Pass C (bulk plus orphan
collection, also mockup-first) and the scaffolder follow. The `runtime.publicMediaResolver` ergonomic
stays a carry-forward needing its own brainstorm (see the Pass A plan and the ROADMAP).

## Prior next action (2026-06-17): `0.57.0` RELEASED; both sites cut over on held branches; execute Pass A (media polish + the cutover DX debt)

**`0.57.0` is published** (the whole media stack 1 through 3c). `feat/media-3c` merged to `main` and
pushed; `gh release create v0.57.0` fired the OIDC trusted-publishing workflow; `npm view
@glw907/cairn-cms version` is `0.57.0` (the registry `latest`).

**Both production sites are cut over to 0.57.0 media on `feat/media-cutover` branches, held for the
live smoke and deploy.** ecxc-ski (`64e8965`, off `main`) and 907-life (`25fe32a`, off `main`) each
bound a `MEDIA_BUCKET` R2 bucket (`ecxc-media`, `907-life-media`, both created live), mounted the
`/media` route, declared the `assets` block, and threaded a `publicMediaResolver` into `render` and
`createPublicRoutes`; both build green. ecxc additionally removed its custom `:::figure` component
(it collided with 0.57's reserved figure directive); 907 had no collision (empty registry). HELD for
Geoff: the live admin smoke (the magic-link click is manual), the optional frontmatter hero field,
and the push + deploy on each branch. Note: 907's `main` carries a pre-existing uncommitted edit
(`docs/superpowers/archive/plans/2026-06-12-cairn-0.51-crossing.md`, a DONE marker) left untouched.

**Immediate next: execute Pass A**, planned at
`docs/superpowers/plans/2026-06-17-cairn-media-polish-and-dx.md`, a `0.57.1` patch. Main-loop
execution, test-first, one `cairn-implementer` per task, the full gate between dispatches, on a fresh
worktree off `main`. It clears the 3c review carry-forwards (the `/admin/media` action feedback strip,
the slide-over Escape edge), the 3b decorative-hero alt persistence, the reserved-`figure` error
message, the six cutover doc findings (two HIGH: the resolver wiring belongs in the required media
steps, and the figure-collision callout), and the ROADMAP refresh. The cutover DX findings are logged
in `docs/internal/docs-friction-log.md`. Then Pass B (replace-in-place + alt propagation) and Pass C
(bulk + orphan collection) follow, then the scaffolder; the `runtime.publicMediaResolver` ergonomic is
a carry-forward needing a brainstorm (see the plan).

## Prior next action (2026-06-17): Phase 3c the Media Library LANDED on `feat/media-3c`; Phase 3 is complete; the single bundled `0.57.0` release plus the per-site cutover are next (Geoff's call); the merge and push are held

**Phase 3c of the media gallery (the admin Media Library) LANDED on `feat/media-3c`** (off `main` at
`f865c7b`). Ten plan tasks test-first, the code-simplifier pass, a four-reviewer gate with its fold-in,
the frontend-design polish, and the docs arm. **No release is cut (Geoff's call): the whole image work
ships in one `0.57.0` release now that Phase 3 is complete. The merge and the push are held for Geoff.**

The Media Library is a first-class admin screen at `/admin/media`, a peer of Posts and Pages: a
contact-sheet grid with a list-density toggle, a non-modal detail slide-over, where-used grouped
published-vs-edit-branch (computed by content hash across `main` and every open `cairn/*` branch), a
two-faced safe-delete (in-use names what breaks and needs a typed slug; orphan is a calm confirm), a
triage radiogroup (All/Needs alt/Unused), client pagination, and rename/default-alt edits. The
correctness core landed first and alone: the additive content-manifest `mediaRefs` field + the
`extractMediaRefs` extractor (reads the frontmatter hero plus body images, hash-keyed), the cross-branch
`buildUsageIndex`, the shared `mediaLibraryEntry` projection + `removeMediaEntry`, then the union
`mediaLibraryLoad` and the `media` view across the single-mount dispatch, then the actions and the
screen. Safe-delete commits the manifest row removal before the R2 delete and fails closed when it
cannot verify usage; rename/default-alt is display-layer only (the route keys on the hash).

Gate green at the tip, run first-hand: `npm run check` 994 files 0/0, `npm test` 190 files / 2037 tests
exit 0 (the first run hit the documented `@vitest/browser` rpc-closed teardown flake; a clean re-run
confirmed exit 0), the showcase Playwright E2E 23 passed in a real browser (the new
`media-library.spec.ts` adds 7 cases), the reference/signature/package/docs/prose/version and
editor-boundary gates green. Four reviewers (svelte, daisyui-a11y, cloudflare-workers, an Opus
correctness pass): the fold-in moved a `flushSync` out of an effect (forward-compat crash), made the
delete gate fail closed on an unverifiable branch read, parallelized + de-duplicated the branch
enumeration, gave the triage the ARIA roving-tabindex pattern, surfaced the update/404 failures, and
added the missing `--cairn-error-*` danger token family to both theme roots. The Opus reviewer's
"Critical" (the delete gate trusting a stale manifest) was triaged down: save/publish keep `mediaRefs`
fresh via `manifestEntryFromFile`, media is unreleased so no stale-manifest installed base exists, and
the gate matches the engine's existing manifest-trust model; documented, not re-architected. Live admin
smoke deferred to the first site cutover (covered by the E2E + the suites), matching 2b/3a/3b.
Post-mortem with the carry-forwards in the plan
(`docs/superpowers/plans/2026-06-17-cairn-media-3c-library.md`).

**Next actions, in order:**
1. **Merge `feat/media-3c` to `main`** DONE 2026-06-17 (fast-forward, local; the whole media stack 1,
   2a, 2b, 3a, 3b, 3c is on `main`, unreleased at `0.57.0`). The push is held for Geoff.
2. **Cut the single bundled `0.57.0` release** (`gh release create v0.57.0 --target main`, after the
   push): the release body is the changelog window since the last published tag, carrying the one
   `Consumers must:` line (bind `MEDIA_BUCKET`, mount the `/media` route, declare the `assets` block)
   plus the recommended content-manifest regenerate. This fires the OIDC trusted-publishing workflow.
3. **Per-site cutover** (rides the published package): bind the R2 bucket, mount the route, bump the
   range, run the live guard + upload + delivery + Library smoke, copy the `.cairn-place-*` CSS, adopt
   the hero field, and regenerate the content manifest so the Library's `main` where-used is accurate.
4. **Then execute Pass A** (media polish, the decorative-hero alt fix, and DX docs), planned at
   `docs/superpowers/plans/2026-06-17-cairn-media-polish-and-dx.md`, a `0.57.1` patch. It clears the
   3c review carry-forwards (the `/admin/media` action feedback strip, the slide-over Escape edge), the
   3b decorative-hero alt persistence, three DX doc gaps, and the ROADMAP refresh. Mostly independent
   tasks, a good Workflow candidate. The cutover comes first so live use filters the priorities.

## Prior next action (2026-06-17): Phase 3b the hero field LANDED on `feat/media-3b`; the release stays deferred until the whole image work is complete; Phase 3c is the next build

**Phase 3b of the media gallery (the hero frontmatter image field) LANDED on `feat/media-3b`** (a fresh
worktree off `main` at `dc442ca`). Nine plan tasks, the code-simplifier pass, a three-reviewer gate with
its fold-in, and the docs arm. **No release is cut (Geoff's call): the whole image work ships in one
release when Phase 3 is complete.** The version stays `0.57.0` as the in-progress media window, so 3b
(and 3c) land on `main` unreleased, with the single bundled release once the image work is done.

A Post or Page now carries a hero image in frontmatter as a nested `image: { src, alt, caption }` object,
set in the editor's details panel through the 2b picker and capture flow, resolved at delivery into a
derived `heroImage` projection, and unified with the SEO social card (one image, both uses). Built: the
built-in `image` `FrontmatterField` variant threaded through every arm (union + `seo?` flag, the
`FieldValue`/`InferFields` type map to `ImageValue`, the `frontmatterFromForm` decode, the `formValues`
read-back, the `validateFields` normalize + required-on-`src`, the at-most-one-SEO-image guard); the
delivery `deriveHeroImage` projection over an injected `resolveMedia` that never mutates the canonical
`media:` token; the SEO unify (`og:image` + `twitter:image:alt`) with `resolveImageUrl` hardened to
reject a non-http(s) result; `MediaHeroField.svelte` (a one-row resting state, an empty dropzone, a
native-`<dialog>` chooser + 16:9 placement view reusing `MediaPicker` and the `MediaCaptureCard` alt
model); the needs-alt notice extended to the hero from form state; and the showcase slice (the declared
field, the wired resolver, the rendered hero, the migrated hello post, a new `media-hero.spec.ts`).

Gate green at the tip, run first-hand: `npm run check` 975 files 0/0, `npm test` 185 files / 1957 tests
exit 0 (the first run hit the documented `@vitest/browser` rpc-closed teardown flake; a clean re-run
confirmed 1957/1957 exit 0), the showcase Playwright E2E 16 passed in a real browser (the new
`media-hero.spec.ts` proves the field round-trip + the public render + the `og:image`; the 2b/3a/golden
specs stay green), the reference/package/docs/prose and editor-boundary gates green. Three reviewers
(svelte, daisyui-a11y, an Opus delivery/data-contract correctness pass): one CRITICAL (the Described
chip's `--color-positive-ink` token lived only in the mockup, never in `cairn-admin.css`, so the chip
fell back to body ink; fixed as a locked-pair token, light ~4.9:1 / dark ~7:1 on base-100), two
IMPORTANTs (the alt radiogroup had no `name` so arrow-key nav was broken, fixed with a decode-ignored
unique name; `required` was unenforced on the image arm, fixed to enforce on `src`), the delivery
resolves-only-`image`-key limitation documented + carried, and Minors folded. The E2E itself caught a
real reactive loop in the needs-alt `$effect` (fixed via `untrack`). Live admin smoke deferred to the
first site cutover (presentation + a delivery read, covered by the E2E), matching 2b/3a. Post-mortem with
the carry-forwards in the plan (`docs/superpowers/plans/2026-06-16-cairn-media-3b-hero-field.md`).

**Next actions, in order:**
1. **Merge `feat/media-3b` to `main`** (fast-forward; the whole media stack 1, 2a, 2b, 3a, 3b is then on
   `main`, unreleased at `0.57.0`). Geoff's call on the push.
2. **Release DEFERRED (Geoff's call):** no interim release. The whole image work ships in one release once
   Phase 3 is complete, so there is no `gh release create` between 3a, 3b, and 3c.
3. **Per-site cutover rides that single release** (it needs the published package): bind a `MEDIA_BUCKET`
   R2 bucket, mount the `/media` route, bump to the published range, run the real guard + upload + delivery
   live smoke (the deferred proof), copy the `.cairn-place-*` CSS, and (to adopt the hero) declare the
   `image` field, inject `resolveMedia` into `createPublicRoutes`, render `heroImage`, and migrate any
   string `image` SEO field to the structured object.
4. **NEXT: build Phase 3c** (the admin **Media Library** screen), **DESIGNED + PLANNED 2026-06-17 on
   `feat/media-3c`** (off `main` at `f865c7b`), ready to execute. **Scope correction (Geoff):** 3c is the
   admin media-management screen ("the gallery should just be default UI ... it's only for the admin
   interface"; he prefers the term "library"), NOT a forward-facing content gallery component, which is
   dropped (a developer builds their own; core stays lean). This supersedes the umbrella spec's
   gallery-component framing. The full mockup-first methodology ran: competitor + user-feedback research
   (the design reference), three divergent UI mockups, an adversarial UI critique, an adversarial
   backend-feasibility review, a frontend-design polish (the consolidated mockup), and an adversarial spec
   review. Artifacts on `feat/media-3c`: design reference
   `docs/internal/design/2026-06-17-media-library-design-reference.md`, the consolidated mockup
   `docs/internal/design/2026-06-17-media-library-mockup.html` (three explorations beside it), spec
   `docs/superpowers/specs/2026-06-17-cairn-media-3c-library-design.md`, plan (10 tasks)
   `docs/superpowers/plans/2026-06-17-cairn-media-3c-library.md`. The Library is a peer of Posts/Pages at
   `/admin/media`: a visual grid + a list-density toggle, a non-modal detail slide-over, where-used grouped
   published-vs-edit-branch (cairn's git-substrate advantage, the universally-missing feature), a two-faced
   safe-delete, a triage radiogroup, client-side pagination; no multi-select/bulk/tags/dashboard. Locked
   backend hardening (the reviews): the usage index keys by HASH and reads the FRONTMATTER hero (not just
   body images); `main` rides a new ADDITIVE content-manifest `mediaRefs` field (no build break), the
   branch arm parses each open branch's edited entry markdown; the loader UNIONS main + open branches so
   not-yet-published assets show; safe-delete commits-then-deletes-R2 on a FRESH gate; rename/alt is
   display-layer only. Replace/bulk/tags/propagating-alt deferred. High-blast tasks: 1, 2, 4, 5, 6. **Then
   the single bundled `0.57.0` release plus the per-site cutover**, since 3c completes Phase 3.

**Resume prompt for the 3c build (fresh session, effort high):**
"Execute Phase 3c of the cairn media gallery: the admin Media Library screen, plan at
`docs/superpowers/plans/2026-06-17-cairn-media-3c-library.md` (spec
`docs/superpowers/specs/2026-06-17-cairn-media-3c-library-design.md`). Invoke the `cairn-pass` skill.
Launch in `cairn-cms`; the design + plan are on the `feat/media-3c` worktree (off `main`). Confirm the
baseline (`npm test` exit 0), then run the 10 tasks test-first: one `cairn-implementer` per task, review
each diff, clear the full gate between dispatches, at high effort. Tasks 1, 2, 4, 5, 6 are high-blast:
review closely and upshift to `model: opus` if warranted. The correctness core (Task 1 the
content-manifest `mediaRefs` field + extractor, Task 2 the cross-branch usage index) lands first and
alone. Tasks 9 (frontend-design polish) and 10 (pass-end, whose review-gate workflow needs my 'use a
workflow' opt-in) run in the main loop. 3c completes Phase 3; version stays 0.57.0; the single bundled
release + per-site cutover follow at pass-end."

## Prior next action (2026-06-16): media is author-usable; Phase 2b insert UI LANDED on `feat/media-2b`, the whole media stack is release-ready as `0.57.0`

**Phase 2b of the media gallery (the insert UI) LANDED on `feat/media-2b`** (branched off `main` at
`a4c1aaf`, which already carried the Phase 1 foundation and the Phase 2a infra, so this branch is the whole
media stack). Eleven plan tasks, a Task 6 hardening, a frontend-design polish, the code-simplifier pass, the
three-reviewer fold-in, and the docs arm. Commits `60b6cfb..6ed533d`. **The version bumps `0.56.2 -> 0.57.0`
and the whole stack (foundation + ingest/delivery + insert UI) ships as one bundled release**, additive to
the public API with one per-site consumer action.

An editor now pastes, drags, or clicks Insert image and it lands in the post as `![alt](media:slug.hash)`,
rendering a thumbnail in the live preview and committing with the entry on Publish. Built: the `mediaLibrary`
projection on `editLoad`; the preview `manifestMediaResolver` and the `resolveMedia` render-prop wiring; the
paste/drop editor seam and the atomic `media:` source chip; the one-step capture card (alt as debt, never a
block); the WAI-ARIA combobox picker; the at-caret insert popover with the optimistic upload loop (dedup,
typed failures, session-expired) and the widget-only optimistic placeholder; the needs-alt scanner plus the
non-blocking publish-time notice; the toolbar entry and the EditPage integration (merged library, editor
seams, the hidden `media` save field); and the showcase UI-driven E2E.

Gate green at the tip `6ed533d`, run first-hand: `npm run check` 968 files 0/0, `npm test` 182 files / 1863
tests exit 0, the showcase Playwright E2E 13 passed in a real browser (the new `media-insert.spec.ts` drives
toolbar -> popover -> capture card -> optimistic placeholder -> preview thumbnail -> save commits body +
`media.json`), the reference, signature, package, docs, readiness, prose, and version gates green, the
editor-boundary test green (the two new CodeMirror modules stay dynamically-imported-only). Two new CodeMirror
decorations (the atomic source chip, the widget-only placeholder), open risk 2 held (a failed or expired
upload leaves the source byte-for-byte unchanged). Three reviewers: the a11y review found one Critical (the
needs-alt warning ink at ~2.2:1 in light, fixed with a new `--cairn-warning-ink` token at 5.98:1) plus three
Important live-region/focus gaps; the svelte review found the `createObjectURL`-in-`$derived` anti-pattern;
the security review was clean with one defense-in-depth fold-in (the client re-derives the `media:` reference
from the validated record). All folded in at `dabbf9e`. The E2E surfaced a real engine gap (the preview
resolver ignored in-session uploads), fixed at `85b3315a`. The live admin smoke rides the first site cutover
(no site carries the media binding yet; the flow is proven by the E2E and the 2a workerd integration suite),
matching the 2a deferral. Post-mortem with the carry-forwards in the plan
(`docs/superpowers/plans/2026-06-16-cairn-media-2b-insert-ui.md`).

**Next actions, in order:**
1. **Merge `feat/media-2b` to `main`** (needs the push, so it is Geoff's call). The branch is the whole media
   stack on main, release-ready at `0.57.0`. The Phase 1 (`feat/media-foundation`) and Phase 2a
   (`feat/media-2a`) merges fold into this one if not already on local main.
2. **Cut the bundled `0.57.0` release** (Geoff's separate call): push `main`, then
   `gh release create v0.57.0 --target main` with the `0.57.0` changelog entry as the body (it carries the
   `Consumers must:` line). The release fires the OIDC trusted-publishing workflow. The `0.56.2`
   picker/round-trip release, if not yet cut, folds into this window.
3. **Per-site cutover** (each a site-pass, the live proof of the whole media stack): bind a `MEDIA_BUCKET` R2
   bucket (`r2_buckets` in `wrangler.jsonc`), mount the `/media` delivery route (`createMediaRoute`) at
   `src/routes/media/[...path]/+server.ts`, bump to `^0.57.0`, and run the real guard + upload + delivery
   live smoke (the deferred proof). Media stays behind `transformations: false` until a site opts in.
4. Then **Phase 3, placements, cut into 3a/3b/3c, with 3a DESIGNED + PLANNED 2026-06-16 and ready to
   execute** (after the bundled release, on a fresh worktree off `main`). **Phase 3a (the inline figure):
   captions and placement for an inline body image through a cairn-reserved `:::figure` container directive
   that wraps the image as a child node** (so the `media:` resolver resolves it untouched), the caption as
   the directive's body text rendered to `<figcaption>`, and a closed role set (`center`/`wide`/`full` plus
   the measure default) riding the directive's class. A five-lens-style adversarial critique REVERSED the
   first carrier (it empirically broke caption-in-title on a literal `"` and showed the `{.token}` brace is
   a fragile sibling-text parser that degrades to junk in other tools); the figure directive dodges all of
   it. Spec `docs/superpowers/specs/2026-06-16-cairn-media-3a-inline-figure-design.md`, plan (9 tasks)
   `docs/superpowers/plans/2026-06-16-cairn-media-3a-inline-figure.md`. Method: one `cairn-implementer` per
   task, test-first, full gate between dispatches; Task 1 (the `remarkFigure` render step) and Task 5 (the
   editor figure control) are high-blast (review closely, upshift if needed); Tasks 3 (the mockup), 8 (the
   polish), 9 (the pass-end) run in the main loop. The layer charter is owned as a bounded, theme-owned
   exception. **Then 3b** (the hero frontmatter image field) and **3c** (the gallery component), reusing the
   caption+alt+role model 3a designs once. Then Phase 4 (management: the Media screen, the branch-spanning
   usage index, safe-delete) and Phase 5 (embeds + icons + the unified insert entry point and slash
   trigger). See [[cairn-image-gallery-initiative-placement]].

## Prior next action (2026-06-16): Phase 2a media ingest+delivery LANDED on `feat/media-2a`

**Phase 2a of the media gallery (the ingest and delivery infrastructure under the insert UI) LANDED on
the feature worktree `feat/media-2a` (branched off `main` at `cdc011d`), ready to merge to `main`.** Ten
plan tasks plus a simplifier touch and the review fold-in, commits `12b28ac..82272ea`. It is unreleased
engine substrate: the version stays `0.56.2`, no `CHANGELOG` entry, and the only consumer action (wire
the `MEDIA_BUCKET` r2_buckets binding and mount the `/media` route) rides the bundled release at 2b.

Built: the locked-down `/media` delivery route (`createMediaRoute` on `/sveltekit`: validate-before-R2,
304/206/200, the security headers as the served-bytes XSS control, the `Via: image-resizing` self-loop
guard, a drained 503 on a missing binding); the upload admin action (`uploadAction`, a raw-body
`text/plain` form action: the gate order, the server owning every committed field, put-first R2-head
dedup with full-sha256 collision refusal, commit-nothing); the save-time `media.json` merge into the
branch and Publish commits; the `editLoad` `mediaTargets` projection; the client ingest helper
(`heic-to` lazy-loaded for HEIC); the reconcile read, the conditional doctor check, and the `media.*`
events; the node-safe `@glw907/cairn-cms/media` subpath plus its reference page; and the showcase
vertical slice with an E2E. Two design corrections the build forced: the upload posts `text/plain`
(SvelteKit form actions 415 a non-form content type) with CSRF in the `X-Cairn-CSRF` header (the guard
now clears a valid header before the body-cloning form-field check), and a form action delivers
`fail(status)` inside a 200 JSON envelope, not as the HTTP status.

Gate green at the tip `82272ea`, run first-hand: `npm run check` 955 files 0/0, `npm test` 178 files /
1788 tests exit 0, the reference (with `/media`), signature, package, docs, readiness, and version gates
green, the showcase Playwright E2E 12 passed including the media slice. Three reviewers
(cloudflare-workers, web-auth-security, svelte), no Critical; five fold-ins in `82272ea` (the wrong-type
binding 503, the default `Content-Type`, the short-hash-collision 409, the corrected result/session
docstrings, and the guard body-intact test). The live admin smoke was judged not proportionate (the
upload and the guard CSRF change are proven in workerd against real miniflare R2 and real D1, the slice
in a real browser; no auth-store change), so the real guard+upload+delivery live proof rides the first
site cutover. Post-mortem with the spike findings and carry-forwards in the plan
(`docs/superpowers/plans/2026-06-15-cairn-media-2a-ingest-delivery.md`).

**Next actions, in order:**
1. **Merge `feat/media-2a` to `main`** (needs the push, so it is Geoff's call). It is unreleased
   substrate, so no release is cut for it on its own; the bundled release that carries the whole media
   stack rides Phase 2b, when media becomes author-usable. The `feat/media-foundation` Phase 1 merge and
   the `0.56.2` picker/round-trip release stay their own separate pending calls.
2. **Phase 2b, the insert UI, is DESIGNED, PLANNED, and ready to execute** (2026-06-16). Spec
   `docs/superpowers/specs/2026-06-16-cairn-media-2b-insert-ui-design.md`, plan (13 tasks)
   `docs/superpowers/plans/2026-06-16-cairn-media-2b-insert-ui.md`, both committed on `feat/media-2a`. A
   five-lens adversarial design review (run pre-spec at Geoff's request) reshaped it: the `:::image`
   figure directive for per-image alignment was DROPPED (three independent lenses converged: it breaks
   the `media:` resolver since the ref is a directive attribute not an image node, it bakes presentation
   into content against cairn's class-driven render, and the caret-driven contextual toolbar is an a11y
   anti-pattern). 2b now ships the plain `![alt](media:hash)` inline insert done to a class-A bar: the
   at-caret popover, the combobox picker, the capture card, **paste and drag as primary ingest**, the
   optimistic loop and dedup, inline placement, the `media:` source decoration, and the preview render
   wiring. **Alt is a debt, not a hard block** (insert proceeds; missing alt is a persistent flag plus a
   non-blocking publish-time count). Per-image presentation (captions via the standard image title,
   alignment as theme-resolved intent classes) moves to Phase 3 "placements" with a layer charter
   (directives carry identity/decorative-wrapping, never presentation parameters). **The plan skips the
   upfront mockup-first loop** (Geoff's call, 2026-06-16): the adversarial review settled the direction
   onto existing patterns (the component-picker combobox, the dialog chrome, the directive treatment) and
   the umbrella rev.2 insert mockup already exists, so a fresh mockup earns nothing; the two novel
   CodeMirror decorations (the `media:` source token, the optimistic placeholder) get a focused
   `frontend-design` treatment in their build tasks, and the end-of-pass `frontend-design` polish plus the
   adversarial review-gate hold the class-A bar. **The IMMEDIATE next action is executing the 11-task 2b
   plan:** one `cairn-implementer` per task, test-first, full gate between dispatches; Tasks 1-2 are the
   library projection and the preview render wiring, Task 3 (high-blast-radius) the editor paste/drop seam
   and `media:` source decoration, Tasks 4-6 the capture card / picker / popover with the optimistic loop,
   Tasks 7-9 inline placement + needs-alt + the toolbar entry + the showcase E2E, Task 10 the polish, Task
   11 the pass-end. cairn stays markdown-first, not WYSIWYG (see [[cairn-not-wysiwyg-best-markdown]]).
   **2b constraints carried from 2a:** the client parses the 200 JSON envelope (`{ type, status, data }`),
   not `Response.status`, and treats an opaque/status-0 response as session-expired; no multi-select
   drag-drop until a batch-coalesced ingest is designed (open risk 5). Then Phase 3 (placements), Phase 4
   (management, the branch-spanning usage index, safe-delete), Phase 5 (embeds and icon routing).

## Prior next action (2026-06-15): Phase 2a media ingest+delivery DESIGNED, ready to build (build deferred to a fresh session)

**Phase 2a of the media gallery (the ingest and delivery infrastructure under the insert UI) is DESIGNED
and APPROVED, ready to build on a feature worktree off `main`.** The design ran long (an adversarial
design-hardening workflow plus the context exploration), so the build was deliberately deferred to a
fresh session per the context-handoff discipline; this section is the pre-baked brief.

Spec: `docs/superpowers/specs/2026-06-15-cairn-media-2a-ingest-delivery-design.md`. Plan (ten tasks):
`docs/superpowers/plans/2026-06-15-cairn-media-2a-ingest-delivery.md`. Both committed on `main`.

The Phase 2 insert experience is cut into **2a (this infrastructure)** and **2b (the insert UI)**, two
verification surfaces (Geoff's call). 2a delivers the locked-down `/media` delivery route (streams
content-addressed bytes from R2 with the security headers, 304/206 support, the `Via: image-resizing`
self-loop guard), the upload admin action (a JSON/fetch endpoint: Content-Length-before-read,
CSRF-from-header, JSON-aware 401, the server owns every committed field, SVG/HTML denied engine-level),
the client-side ingest helper (three-tier: web-native passthrough, HEIC via a lazy WASM decoder, a typed
failure card), the cross-cutting render-resolver wiring (the additive trailing `resolveMedia` opt), the
node-safe `/media` export subpath split from the kit-coupled `/sveltekit` route factory, and a reconcile
read. **An adversarial find-and-verify workflow hardened the design: five lenses, 51 findings, 14
blockers**, which rejected a commit-to-main-per-upload draft for the branch-scoped pipeline (the upload
stores bytes and returns the record; the record commits WITH the entry on the per-entry branch at Save,
promoted to main at Publish, folded into the existing `commitFiles` change set). Two product decisions
settled with Geoff: media is public-by-hash with gating kept addable (the logical-reference design keeps
the door open via a future `visibility` field plus a signed-URL route variant); transform-abuse
hardening is documented as the scale path, not built (both sites sit under the 5,000/month free cap).

**Immediate next action: execute the 2a plan.** Method: invoke `cairn-pass`, create a feature worktree
off `main` (one worktree per pass), one `cairn-implementer` per task test-first, the main loop reviews
each diff and clears the full gate between dispatches, at HIGH effort. Tasks 3, 4, 5, and 10 are
high-blast-radius (careful main-loop review, upshift if needed); Task 8 carries a short WASM-HEIC-decoder
library spike that runs in the main loop. It is unreleased engine substrate plus one per-site consumer
action (wire the R2 bucket and the `/media` route), shipped behind the `transformations: false` default;
the bundled release happens when Phase 2b makes media author-usable.

**Resume prompt (fresh session, launched in `~/Projects/cairn-cms` so its hooks and memory load):**
"Execute Phase 2a of the cairn media gallery: the ingest and delivery infrastructure plan at
`docs/superpowers/plans/2026-06-15-cairn-media-2a-ingest-delivery.md` (spec:
`docs/superpowers/specs/2026-06-15-cairn-media-2a-ingest-delivery-design.md`). Invoke the `cairn-pass`
skill, create a feature worktree off `main` for the pass, then run the ten tasks test-first: one
`cairn-implementer` (Sonnet) per task, review each diff, and clear the full gate between dispatches.
Task 8 carries the WASM HEIC decoder library spike; run that in the main loop. It is unreleased engine
substrate with one per-site consumer action. Then Phase 2b (the insert UI) follows, mockup-first with a
frontend-design polish and an adversarial review-gate workflow."

**Phase 1 status:** the foundation merged to `main` (a local fast-forward to `1d46e49`, unpushed). The
`0.56.2` picker/round-trip release and the push remain Geoff's separate pending call; the media substrate
is unreleased and rides a later bundled release.

## Prior next action (2026-06-15): Phase 1 media foundation LANDED on `feat/media-foundation`

**Phase 1 of the media gallery (the engine substrate, no admin UI) LANDED on the feature worktree
`feat/media-foundation` (branched off `main` at `df7ed21`), ready to merge to `main`.** Nine plan tasks
plus the review fold-in, commits `a58847a..cb8c890`. It is unreleased substrate (the version stays
`0.56.2`, no CHANGELOG entry) with no consumer action: `AssetConfig` grew from its reserved, unused
seam. The whole subsystem is under `src/lib/media/` plus the one render hook
`src/lib/render/resolve-media.ts`.

Built: the `media:<slug>.<hash>` reference codec, content-hash and slug naming, the git-committed media
manifest, the Cloudflare Images transform-URL builder, the grown `AssetConfig` plus `normalizeAssets`
(with the built-in `thumb/inline/card/hero` presets), the render-time `media:` resolution wired into the
shared pipeline, the R2 store wrapper, and the four `media.*` log events. All engine-internal (nothing
added to `src/lib/index.ts`); `AssetConfig` references `VariantSpec` via an inline `import type`, so the
public surface adds no new export name.

Gate green at the tip `cb8c890`, run first-hand: `npm run check` 940 files 0/0, `npm test` 170 files /
1666 tests exit 0, the reference, signature, package, docs, readiness, and version gates all green. The
spike (task 8) ran live against the `glw907` account: an R2 put/get round-trip proven byte-identical
against a throwaway bucket (provisioned and removed via the Cloudflare MCP); the delivery route decided
as a Worker route that resolves the hash and streams from R2 (recorded in the spec's "Foundation spike:
findings"); cost within the Cloudflare Images Free tier for both sites. Three reviewers
(cloudflare-workers, svelte/render, an adversarial correctness pass), no Critical or Important; five
fold-ins in `cb8c890` (the load-bearing one threaded the ignored `publicBase` through `publicPath`).
Post-mortem with the carry-forwards in the plan
(`docs/superpowers/plans/2026-06-15-cairn-media-foundation.md`).

**Next actions, in order:**
1. **Merge `feat/media-foundation` to `main`** (needs the push, so it is Geoff's call). It is unreleased
   substrate, so no release is cut for it on its own; the next release that carries it is whenever a
   later phase makes media author-usable, or a bundled release. The `0.56.2` picker/round-trip release
   stays its own separate action.
2. **Phase 2, the insert experience**, is the next pass, MOCKUP-FIRST per the
   [[cairn-ui-design-pass-methodology]] against the rev.2 design target
   (`docs/internal/design/2026-06-15-media-gallery-mockup.html`): the at-caret popover, the combobox
   picker, the capture card (name and alt model), the upload admin action, the optimistic upload loop,
   dedup, and inline placement. It needs a brainstorm and a just-in-time plan; the engine substrate is
   ready under it. Then Phase 3 (placements), Phase 4 (management plus the branch-spanning usage index
   and safe-delete), Phase 5 (embeds and icon routing).

## Prior next action (2026-06-15): the media gallery design landed; the foundation plan is ready

The media/gallery initiative (ROADMAP "Next") ran its full design pass and is ready to build. The
research, the unified strategy, and the direction verdict are in
`docs/internal/design/2026-06-15-media-management-design-reference.md`; the approved design target is
the rev.2 synthesized mockup `docs/internal/design/2026-06-15-media-gallery-mockup.html` (the three
divergent direction mockups sit beside it as history). The spec is
`docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`; the first plan is
`docs/superpowers/plans/2026-06-15-cairn-media-foundation.md`.

The model splits media by lifecycle: stored files (images, documents, the gallery, the build target),
referenced external media (video and embeds, the existing directive system), and design-system tokens
(icons, the existing picker), all reached through one insert entry point. Locked architecture: bytes in
R2, a logical `media:` reference committed to git (the `cairn:` link pattern), Cloudflare Images
transforms on demand, content-hash identity with a slug display name, and a usage index that spans the
open `cairn/*` edit branches so safe-delete never breaks an unpublished edit. Focal point is deferred
(Cloudflare Images smart crop is the default); usage tracking and safe-delete stay in the first surface;
the build carries a `frontend-design` polish pass against the gold standard.

The series ships in phases, each its own just-in-time plan. Phase 1 (the foundation: the `media:` codec,
content-hash naming, the media manifest, the Cloudflare Images URL builder, the grown `AssetConfig`, the
render-time resolver, and the `media.*` log events, no admin UI) is planned and ready. Execute it on a
feature worktree off `main` (one worktree per pass), `cairn-implementer` per task with the full gate
between dispatches, Tasks 8 and 9 in the main loop. It is unreleased substrate with no consumer action.
Sequence it after the `0.56.2` release below.

Two component-picker follow-ups were filed to ROADMAP the same day from a live look: the picker dialog
fills the viewport height (it should inset over a backdrop with a capped max-height, a full-height sheet
only on a narrow viewport; the rule now lives in `admin-design-system.md`), and the `ComponentDef.icon`
developer spec should require a logically representative icon (re-choosing ecxc's icons is a separate
site-pass).

## Immediate next action (2026-06-15): merge and release the picker + round-trip bundle (0.56.2)

**The component insert picker live-preview and round-trip editing both LANDED on branch
`feat/component-picker-live-preview`, ready to merge to `main` and release together as `0.56.2` (a
patch: both refine the existing component-editing surface and are additive, so existing
defs compile unchanged with no consumer action).** Both ran mockup-first / spike-first per the
methodology in [[cairn-ui-design-pass-methodology]].

The picker gains a live preview: a one-column grouped catalog (glyph, description, intended-use;
search past eight), and a configure step that opens two panes (the form plus the configured component
rendered through the site pipeline into a sandboxed iframe, debounced, with honest
settling/incomplete/render-failed states) when a component declares a `preview`. The `ComponentDef`
contract gains optional `icon`, `group`, `hidden`, `preview`; `AttributeField` gains
`pattern`/`validate`; `SlotDef` gains `itemLabel`. Spec
`docs/superpowers/specs/2026-06-15-cairn-component-picker-design.md`, plan (post-mortem)
`docs/superpowers/plans/2026-06-15-cairn-component-picker.md`, mockup
`docs/internal/design/2026-06-15-component-picker-mockup.html` (rev. 2).

Round-trip editing: with the caret in a placed component, an "Edit block" toolbar control opens it
back into the same guided form, pre-filled, and Update rewrites the block in place. It is gated by
`componentRoundTripSafety`, so a block carrying an attribute or child the component does not declare
is left for hand-editing rather than silently rewritten (the Decap/Tina corruption class). The
substrate was already there: `caretContainerRange` for the range, the reversible
`serializeComponent`/`parseComponent` pair. Spec
`docs/superpowers/specs/2026-06-15-cairn-component-round-trip-design.md`, plan (post-mortem)
`docs/superpowers/plans/2026-06-15-cairn-component-round-trip.md`.

Gate green at the branch tip `8a3f4b1`, run first-hand: `npm run check` 924 files 0/0, `npm test` 162
files / 1598 tests exit 0, the reference/signature/docs gates exit 0, `check:prose` clean, showcase
E2E 11 passed in a real browser (the picker two-pane preview and the round-trip edit-in-place both
asserted). Reviews: the picker reviewers folded a `resetPreview()`, focus and live-region fixes; the
round-trip adversarial + svelte + a11y gate caught two CRITICAL data-loss paths (a markdown title
truncated by `readLabel`, and an equal-length edit dropped by the caret-reporter dedupe) plus the
async-snapshot mismatch and the unreachable disabled-button reason, all fixed with regression tests in
`8a3f4b1`.

**Next actions, in order:**
1. **Merge the branch to `main` and release `0.56.2`** (Geoff: push, then `gh release create v0.56.2`
   with the changelog entry as the body); no consumer action.
2. The next pass is the **gallery** (mockup-first per the methodology, with the storage-fork spike and
   divergent directions mandatory given its difficulty), then the **scaffolder**. The master-detail
   catalog rail and a `/` slash-trigger remain deferred (noted in the picker spec's out-of-scope list).

## Prior next action (2026-06-14): release 0.56.0 (gates/DX + fold-gutter, bundled)

Two passes land on `main` over the published `0.55.0`, bundled into `0.56.0`. The gates/tooling/DX
pass (its own plan, below) and the editor fold-gutter pass both merged; `package.json` is `0.56.0` and
the changelog covers both. Releasing via `gh release create v0.56.0`, which fires OIDC
trusted-publishing.

The fold-gutter pass (spec `docs/superpowers/specs/2026-06-14-fold-gutter-design.md`, mockup
`2026-06-14-fold-gutter-mockup.html`, plan `2026-06-14-editor-fold-gutter.md`) moved the
directive-container fold control out of an in-text chevron band into a real CodeMirror `gutter()`
column: nothing at rest, gutter-hover reveal, a focusable button so folding (not just unfolding) is
keyboard- and SR-reachable, the opener rail bar restored, the pill/wash/flash/safety/keymap kept. The
fold scope and engine are unchanged. Three UI/UX critiques (two rendered) plus the svelte and a11y
reviewer gate cleared it; review fold-ins added the pill focus ring, reduced-motion gating, a 24px
gutter, and the touch-state ordering fix. Watch items deferred in the spec: fold-all, a first-run
discoverability nudge, whole-line-hover-via-JS. Next after the release: the two site bumps to
`^0.56.0` if desired, then the gallery brainstorm, then P4.

## Prior next action (2026-06-13): execute the gates/tooling/DX plan (now part of 0.56.0)

**`0.55.0` is PUBLISHED and both sites run it.** The `v0.55.0` release fired OIDC trusted-publishing
(run `27478706097` green, registry `latest`); ecxc-ski (`854cac4`) and 907-life (`97827da`) both
crossed to `^0.55.0`, regenerated the manifest, and deployed green (907's broken hand-rolled
`build-manifest.mjs` was swapped for the `cairn-manifest` bin).

**Next: the gates, tooling, and DX-hardening pass (`0.56.0`).** Plan
`docs/superpowers/plans/2026-06-13-cairn-gates-tooling-dx.md`. It clears the live, non-scaffolder
friction-log backlog. A parallel verify sweep (2026-06-13) re-checked the whole log against the tree:
most was already addressed (the public-surface narrowing keystone, the ambient type, `mintToken`,
the `fail` types, the composer alignment, E2E-in-CI, the `PUBLIC_ORIGIN` condition, the render
attribute-sink hardening via `rehypeSinkGuard`), leaving 11 live/partial tasks, mostly trivial/small
with one medium. Eleven tasks: `AuthEnv` on `/sveltekit` + the deploy-guide block (1-2), the optional
concept `singular` label (3), the manifest-bin root fix (4), the dist-spawn node-safety test (5), the
admin-shell DOM check (6), the signature-currency reference gate (7), and a four-item docs sweep (8).
Method: `cairn-implementer` (Sonnet) for the code/test tasks with the gate and a diff review between
dispatches; the docs tasks in the main loop. Additive (`singular` is optional), so `0.56.0` carries
no consumer action. The friction-log triage and the ROADMAP "Now" both point here. After it: the
gallery brainstorm, then P4.

## Prior next action (2026-06-13): publish `0.55.0`, then the queue (DONE)

**The office-list pass LANDED on `main` 2026-06-13 as `0.55.0`, unpublished.** The post and page
list now extends the editor/desk gold standard: a publish-state triage filter (All / Pending edits /
Published, with live counts, plus an orthogonal Hidden toggle) and self-describing rows (a summary
line under the title), fed by one additive data-layer change. The pass ran mockup-first, then the
adversarial UI review, then implementation, with no approval stop (Geoff's reorder: the review is a
UI critique, so it judged a concrete mockup). Commits `c0bd097..cba576e` (the bump and tracking at
the tip). Locked decisions: Hidden is orthogonal to the partition (a published-but-hidden entry
counts in both, the toggle composes; a two-axis `partition` + `hiddenOnly` model); the row is an
enriched sortable table with a title sub-line; the Edited badge tints primary as the action signal;
Hidden is a row treatment (dimmed title + eye-off tag), not a competing badge. The manifest and
`EntrySummary` gain a `summary` string fed by `deriveExcerpt` (moved down to `content/`).

Gate green at the tip, run first-hand: `npm run check` 916 files 0/0, `npm test` 157 files / 1500
tests exit 0, the five doc/readiness gates exit 0, showcase E2E 9 passed in a real browser (the new
triage assertions included). Reviewers (`svelte-reviewer`, `daisyui-a11y-reviewer`, both Opus): the
a11y review found one Critical (a draft-row summary stacked opacity on muted text, 2.09:1 light,
WCAG 1.4.3) and an Important (the zero-count dim), both fixed in `cba576e`; the svelte review's two
Minor `''`-vs-`null` contract drifts also folded in. The live `wrangler dev` smoke was judged not
proportionate (additive `summary` plus client-side filtering, no server/auth/action/SSR change; the
E2E and both-theme captures cover it). Post-mortem with the carry-forwards in the plan
(`docs/superpowers/plans/2026-06-13-cairn-office-list.md`).

**Next actions, in order:**
1. **Publish `0.55.0`** (needs the push, so it is Geoff's call): push `main`, then
   `gh release create v0.55.0 --target main` with the `0.55.0` changelog entry as the body (carrying
   the `Consumers must: regenerate the content manifest` line); the release fires the OIDC
   trusted-publishing workflow.
2. **Both sites pick up `^0.55.0`** when convenient, each with the one consumer action: regenerate
   the content manifest (`npm run cairn:manifest` or `npx cairn-manifest`) and commit it. The
   `cairnManifest` build fails closed until they do, the intended fail-on-drift posture (both sites
   have the plugin wired).
3. **The queue resumes:** the gates-and-tooling pass (draft its plan next session; scope in the
   2026-06-11 single-mount entry below: E2E-in-CI, the admin DOM render check, the plain-Node
   dist-spawn test, the manifest-bin `cwd`-vs-`config.root` fix), then the gallery brainstorm
   (git-vs-R2), then P4.

**Carry-forward (office-list):** the create affordances read `New {label}` (plural: "New Posts"),
where the mockup idealized the singular; needs an optional `singular` on the concept descriptor
(logged in the friction log, a ROADMAP candidate). The mockup stays aspirational on that one string
until it lands.

## Prior next action (2026-06-13): execute the office-list plan (0.55.0), mockup-first

**`0.54.0` PUBLISHED 2026-06-13, and both consumer sites are on it.** The `v0.54.0` release fired the
OIDC trusted-publishing workflow (run `27472879535` green), `0.54.0` is the registry `latest`, and
both sites crossed and verified live the same day: ecxc-ski `^0.53.0 → ^0.54.0` (deploy `27473025539`
green, `cairn-doctor --probe` 11/0/1), 907-life `^0.51.0 → ^0.54.0` (deploy green, doctor 8/0/4, then
wired the `cairnManifest` plugin so its doctor self-derives to 12/0/0). The editor-takes-the-shell
post-mortem is in `docs/superpowers/plans/2026-06-12-cairn-editor-takes-the-shell.md`.

**Next: the office-list pass as `0.55.0`** (the post/pages list rises to the gold standard). Spec
`docs/superpowers/specs/2026-06-13-cairn-office-list-design.md` (Direction B, approved after a
Ghost/WordPress/Sveltia precedent survey); plan
`docs/superpowers/plans/2026-06-13-cairn-office-list.md`. The list gains a triage filter layer driven
by publish state (All / Pending edits / Published / Hidden, with counts, client-side) and
self-describing rows with a summary line, the office finally extending the editor/desk gold standard.
One data-layer change: the manifest and `EntrySummary` gain a `summary` string fed by the existing
`deriveExcerpt` helper (moved down to `content/`); because the manifest verification is whole-string,
`0.55.0` carries one `Consumers must: regenerate the content manifest` line. **The plan is
mockup-first: Task 1 builds the office-list gold-standard mockup extending
`docs/internal/design/2026-06-12-editor-shell-gold-standard.html`, Task 2 runs an adversarial UI
review of that mockup (the competition's list views, add Contentful/Sanity) and refines it, then the
implementation follows straight on (no approval stop, per Geoff 2026-06-13).** Then the data-layer
(Tasks 3-5), the triage and rows (6-7), E2E (8), the post-build critique (9), docs (10). Method:
main loop for 1/2/9, `cairn-implementer` (explicit `model`) for the rest, full gate between
dispatches. After it: the gates-and-tooling pass, the gallery brainstorm, P4.

## Prior next action (2026-06-13): publish `0.54.0`, then the queue (DONE)

**The editor-takes-the-shell pass LANDED on `main` 2026-06-13 as `0.54.0`, unpublished.** Thirteen
plan tasks plus a simplifier touch and the review fold-in, commits `7e2aedb..46d55c5` (plan and
STATUS pre-bake at `0fc1bbe`), the bump at the tip. An open document now takes the shell: the edit
page's sticky header dissolves into the single topbar through a new context portal
(`topbar-context.ts`), the nav drawer opens closed on a desk route (SSR-resolved, no flash), the
frontmatter fields move to a focus-managed right slide-over region, and zen fades the chrome to the
manuscript with a floating chip that keeps the save state and the way out. The editor ergonomics
round out: an 8px directive rail pitch with a strength-only caret rail, hanging indents on wrapped
quote/list lines, container folding from the rail band (`editor-folding.ts`, safety invariant in one
`transactionExtender`), the completed format keymap plus page-level keys and the `Ctrl+/` sheet, the
`####` heading step, the strip promotion, and the footer redress. The gold-standard sweep's headline
find was systemic: one scoped `button:not(.btn)` reset in `cairn-admin.css` levels every bare admin
button (the footer toggles, the list sort headers, the zen chip) that had silently kept UA chrome
since the self-styling work.

Gate green at the tip, run first-hand: `npm run check` 915 files 0/0, `npm test` 157 files / 1483
tests exit 0, the five doc/readiness gates clean, showcase E2E 8/8 in a real browser (golden path
plus the new zen round trip). Reviewers (`svelte-reviewer`, `daisyui-a11y-reviewer`, both Opus): no
Critical or Important from Svelte; the a11y review resolved both adjudications in favor of the built
patterns (region-with-focus-management for Details, zen exit always reachable) and folded in one
Important (zen could strand focus when entered from a band control, WCAG 2.4.3, fixed at `46d55c5`).
The live `wrangler dev` smoke was judged not proportionate (presentation-only, no server/auth/action/
SSR change; the showcase E2E and first-hand both-theme captures cover the flows). Post-mortem with
four carry-forwards in the plan
(`docs/superpowers/plans/2026-06-12-cairn-editor-takes-the-shell.md`).

**Next actions, in order:**
1. **Publish `0.54.0`** (needs the push, so it is Geoff's call): push `main`, then
   `gh release create v0.54.0 --target main` with the `0.54.0` changelog entry as the body
   (additive, no consumer action); the release fires the OIDC trusted-publishing workflow.
2. **The queue resumes:** the gates-and-tooling pass, then the gallery brainstorm (git-vs-R2),
   then P4. Both sites pick up `^0.54.0` whenever convenient (additive; the editor and the new
   chrome upgrade in place).

**Session note (2026-06-12/13):** Anthropic suspended Claude Fable 5 and Mythos 5 access mid-session
(status.claude.com incident, ~Jun 13 00:50 UTC), and Opus 4.8 had elevated errors. The pass was
orchestrated on Opus 4.8 with every implementer dispatch pinned to an explicit `model` (sonnet, with
Task 3 on opus), which sidesteps the `CLAUDE_CODE_SUBAGENT_MODEL=inherit` resolution that fails when
the main loop is on a suspended model. The `inherit` env var is unchanged; explicit per-dispatch
models are the durable workaround.

## Prior next action (2026-06-12): the editor-takes-the-shell pass (spec then unread)

**The editor-as-home design session SHIPPED 2026-06-12 as `0.52.1` and `0.53.0`, both published
(registry latest 0.53.0) and live on ecxc (`^0.53.0`, deploy green).** An iterative session with
Geoff against a live showcase: 0.52.1 hugged the Write-mode card and spaced the nested rails;
0.53.0 swapped the UI face to IBM Plex Sans (one superfamily with the editor's iA Writer Mono),
added persisted Prose/Markup surface postures, made the card footer the writing-environment
strip (count, postures, focus, typewriter, help), turned the insert actions into toolbar icons,
narrowed both sidebars behind a wider gutter, quieted the details card, and pinned the topbar to
the brand band's height (the seam fix). The review gate folded in an active-rail focus-dim gap
and a WCAG 1.4.1 pressed-state fix (the check glyph as the non-color cue). Gates green at the
tip (906 files 0/0, 1407 tests exit 0, five doc gates).

**Next: plan and execute the editor-takes-the-shell pass as `0.54.0`** (spec
`docs/superpowers/specs/2026-06-12-cairn-editor-takes-the-shell-design.md`, APPROVED 2026-06-12
after a full mockup design session; the approved mockup is committed as
`docs/internal/design/2026-06-12-editor-shell-gold-standard.html` and is the declared cairn UI
gold standard, with the folding fine grain in the companion notes beside it). The pass: the four
shell rungs (one header band, receding nav, details slide-over, zen), the editor ergonomics set
(rail pitch 8px with strength-only active, hanging indents, the keyboard system with the Ctrl+/
sheet, adjudicated container folding), and the gold-standard sweep across the entire admin.
Write the plan from the spec, then execute task-by-task with `cairn-implementer`, full gate
between dispatches. After it: the gates-and-tooling pass, the gallery brainstorm, P4. 907-life
can pick up `^0.53.0` any time (additive).

## Prior next action (2026-06-12): publish `0.52.0`, then the queue

**The editor-experience pass LANDED on `main` 2026-06-12 as `0.52.0`.** Seven plan tasks plus a
simplifier touch and a converged review fold-in, commits `98472bb..4c4b3b9` and the docs arm. The
editor is now a quiet writing surface: self-hosted iA Writer Mono (picked by a six-candidate
trial on the real surface) on a centered 70ch measure, stepped heading sizes, muted markers, a
code chip, GFM parsing, directive machinery as nested bracket rails with meaning-over-machinery
fences and caret-container emphasis, and persisted focus/typewriter modes. The design loop's
measured critique drove the load-bearing fixes (the collapsed gray economy; quote text to full
ink; the sub-AA focus dim; nested rails). The review gate's Blocker (menuitemcheckbox in a
non-menu popover) landed as aria-pressed toggles. Gate at the tip, run first-hand: `npm run
check` 904 files 0/0, `npm test` 157 files / 1404 tests exit 0, five doc gates, showcase E2E 7/7.
Post-mortem with five carry-forwards in the plan
(`docs/superpowers/plans/2026-06-12-cairn-editor-experience.md`).

**Next actions, in order:**
1. **Publish `0.52.0`**: push `main`, then `gh release create v0.52.0 --target main` with the
   changelog entry as the body (additive, no consumer action).
2. **The queue resumes:** the gates-and-tooling pass, then the gallery brainstorm (git-vs-R2),
   then P4. The two sites pick up `^0.52.0` whenever convenient (additive; the editor upgrades
   in place).

## Prior next action (2026-06-12): the editor-experience pass, then the queue

**The 907-life retrofit LANDED and DEPLOYED 2026-06-12 (Pass 16.2 in `907-life/docs/STATUS.md`),
closing the single-mount initiative: both consumer sites now run `^0.51.0` on the three-file
seam.** The crossing covered the whole `0.36.0..0.51.0` window in one pass (shim tree deleted,
composer + catch-all mount, ambient types, floors, preview knob). Its review gate found two
engine-relevant DX issues, logged in the friction log: `AuthEnv` is not exported from the
`/sveltekit` subpath (both sites had copied a subpath import that `skipLibCheck` silently
swallowed), and doctor self-derivation silently depends on the `cairnManifest` Vite plugin.
Live proofs all green: doctor 12/12 with flags, `sent` then `throttled` on back-to-back POSTs,
the `auth.link.requested` trail in Workers Logs.

**Next: execute the editor-experience plan
(`docs/superpowers/plans/2026-06-12-cairn-editor-experience.md`, spec approved by Geoff
2026-06-12).** Seven tasks toward `0.52.0`: GFM base + markdown keymap (the two defects), the
quiet surface (hierarchy, marker discipline, 70ch measure), the directive treatment as a focus
arm (rails not bands, meaning-over-machinery fences, cursor-aware emphasis), focus mode +
typewriter scroll as persisted toggles, then the frontend-design loop (general, directive-heavy,
and the monospace-face mission) and the standard pass end. Method: one `cairn-implementer` per
task on `main`, test-first, full gate between dispatches; Task 6 runs in the main loop. After
it: the gates-and-tooling pass, the gallery brainstorm (git-vs-R2), then P4.

**`0.51.0` PUBLISHED 2026-06-12.** The `v0.51.0` GitHub Release fired the OIDC trusted-publishing
workflow (run `27429523595` green), and `0.51.0` is the registry `latest`. The ecxc bump shipped
the same hour: pin to `^0.51.0` (commit `827bc74` atop the held preview wiring `47f82dc`), gate
green after the reinstall (check 509 files 0/0, 59 tests, vite build exit 0), deploy run
`27429659432` green. The doctor's first live `--probe` run against `https://ecxc.ski` passed 11
checks with 0 failures, including the new probe (sign-in envelope verified, the request action
answered `sent` for a non-editor address) and the floors check against svelte 5.56.3. The one
skip is the D1 auth-store check, the designed degrade: ecxc's `wrangler.toml` carries no
`account_id` and `CLOUDFLARE_ACCOUNT_ID` was unset; adding the one-line `account_id` would let it
run, a cheap site follow-up.

**Next actions, in order:**
1. **907-life, the last retrofit**, crossing straight to `^0.51.0`: delete the admin shim tree,
   add the composer plus the two-file mount, swap `app.d.ts` for
   `import '@glw907/cairn-cms/ambient'`, raise the svelte range to `^5.56.3` (and kit to `^2.12`),
   wire the `preview` knob, run `cairn-doctor --probe`, and live-prove the publish workflow plus
   the `send_error`/`throttled` states owed since `0.38.0`.
2. **The queue resumes:** the gates-and-tooling pass, then the gallery brainstorm (git-vs-R2),
   then P4.

## Prior next action (2026-06-12): publish `0.51.0`, then the two site bumps

**The doctor-DX-and-preview pass LANDED on `main` 2026-06-12 as `0.51.0`.** Eight tasks, commits
`ca117e5..257d752` plus the bump: `cairn-doctor` derives its missing inputs from the repo it runs
in and gains the zero-side-effect `--probe <url>` live sign-in check; the svelte peer floor rises
to `^5.56.3` with a lockfile-vs-floors doctor check (a `Consumers must:` line rides the
changelog); the edit page's preview renders in a sandboxed iframe linking the site's own
stylesheets through the new adapter `preview` knob (with `byConcept` per-concept wrappers, the
collapsing sidebar, and the device-width menu); and the directive highlighting recognizes labeled,
attributed, and four-plus-colon openers with per-depth bands. The condition registry holds fifteen
entries (`config.dependency-floors-unmet` and `admin.login-probe-failed` are new) and
`check:readiness` pins fifteen. The pass answers the DX gaps the ecxc `^0.50.0` crossing
(2026-06-12, recorded in `ecxc-ski/docs/STATUS.md`) surfaced live.

The authoring session crashed mid-release; the resume session re-verified the gate first-hand at
the tip (`npm run check` 902 files 0/0, `npm test` 156 files / 1369 tests exit 0, all five
doc/readiness gates exit 0, simplifier folded in as `257d752`). The ecxc fidelity proof (task 7)
ran pre-crash and drove the `byConcept` override; its site-side wiring sits committed in the
ecxc-ski checkout (`47f82dc`), held unpushed until the publish. The review fold-in (`32ade6b`,
twelve findings, one Critical on invisible popover keyboard focus) and the `.menu` Preflight
substitute (`b7cf172`) are in the window. The post-mortem with three carry-forwards is in the plan
(`docs/superpowers/plans/2026-06-12-cairn-doctor-dx-and-preview.md`).

**Next actions, in order:**
1. **Publish `0.51.0`**: push `main`, then `gh release create v0.51.0 --target main` with the
   0.51.0 changelog entry as the body (the svelte-floor `Consumers must:` line included); the
   release fires the OIDC trusted-publishing workflow.
2. **ecxc's one-line `^0.51.0` bump**: the preview-knob wiring is already committed in its
   checkout; bump the pin, reinstall, push, and run `npx cairn-doctor --probe https://ecxc.ski`
   against the deploy as the probe's first live proof.
3. **907-life, the last retrofit**, crossing straight to `^0.51.0` (the single-mount migration
   plus the svelte `^5.56.3` floor).
4. **The queue resumes:** the gates-and-tooling pass, then the gallery brainstorm (git-vs-R2),
   then P4.

## Prior next action (2026-06-11): the site retrofits to `0.50.0`

**The `0.41.0`+`0.50.0` window PUBLISHED 2026-06-11.** The `v0.50.0` GitHub Release fired the
OIDC trusted-publishing workflow (run `27393207915` green), and `0.50.0` is the registry
`latest`. The post-mortem's carry-forwards 1 through 6 were then handled the same day, commits
`8d2acc7..` plus a docs batch: the thirteenth registry condition
(`config.public-origin-invalid`) with `requireOrigin` on `CairnError`, a tenth doctor check, and
the checklist anchor (`check:readiness` now pins 13); `requireSession` widened as the one
session helper; the showcase's `/admin/editors` now works against an in-memory AUTH_DB double
with an E2E case (6/6); the confirm-token residual and the bindings-page disclosure recorded as
deliberate postures in `docs/explanation/security-model.md`; and the factories-stay-public call
resolved in the plan. Only carry-forward 7 remains: the retrofits below.

**Next actions, in order:**
1. **Site retrofits, one per site** (ecxc-ski, then 907-life), each crossing straight to
   `^0.50.0`: delete the admin shim tree, add the composer plus the two-file mount, swap
   `app.d.ts` for `import '@glw907/cairn-cms/ambient'`, pick up the `createSiteResolver` rename
   where used, run `cairn-doctor` (now ten checks), and live-prove the publish workflow plus the
   `send_error`/`throttled` states owed since `0.38.0`.
2. **The queue resumes:** the gates-and-tooling pass, then the gallery brainstorm (git-vs-R2),
   then P4.

## Prior next action (2026-06-11): publish the `0.41.0`+`0.50.0` window, then the site retrofits

**The single-mount admin pass LANDED on `main` 2026-06-11 as `0.50.0`, opening the 0.50.x
series.** Thirteen plan tasks plus a simplifier touch, a converged review fold-in, and two
changelog accuracy fixes, commits `4e72582..08bc85e` (and the bump). A site's whole `/admin`
surface is now three files: the `$lib/cairn.server.ts` composer plus the `/admin/[...path]`
route pair (`createCairnAdmin` serves one `load` and one static `actions` record;
`CairnAdmin.svelte` switches the views; `parseAdminPath` is the one path authority). The riders
landed in the same window: diagnostics conditions reach their remaining runtime sites (a missing
`AUTH_DB` renders a branded page on every admin path), `listLoad` is manifest-first,
the `fail()` payloads unify on `error`, the layering and dedupe batch, `createSiteResolver` and
the delivery trim, the `/ambient` App.Locals subpath, and the docs arm (admin-routes rewritten,
tutorial milestone rebuilt, the wrong `default:` action examples fixed).

Gate green at the tip, run first-hand: `npm run check` 895 files 0/0, `npm test` 152 files /
1242 tests exit 0, all five doc/package gates exit 0, showcase E2E 5/5 in a real browser. Both
reviewers converged on one Critical (the `ManageEditors` form names), fixed in the fold-in
`08bc85e` with a new form-action contract test across all six views. The post-mortem with seven
carry-forwards is in the plan
(`docs/superpowers/plans/2026-06-11-cairn-single-mount-admin.md`).

**Next actions, in order:**
1. **Publish the held window** (`0.41.0` diagnostics + `0.50.0` single-mount): push `main`, then
   `gh release create v0.50.0 --target main` with the changelog window since `v0.40.0` as the
   body, carrying `0.41.0`'s kit `^2.12` `Consumers must:` line and `0.50.0`'s migration block.
2. **Site retrofits, one per site** (ecxc-ski, then 907-life), each crossing straight to
   `0.50.0`: delete the admin shim tree, add the composer plus the two-file mount, swap
   `app.d.ts` for `import '@glw907/cairn-cms/ambient'`, pick up the `createSiteResolver` rename
   where used, run `cairn-doctor`, and live-prove the publish workflow plus the
   `send_error`/`throttled` states owed since `0.38.0`.
3. **The queue resumes:** the gates-and-tooling pass (smaller now: the showcase composer
   alignment and `mintToken` widening landed here; E2E-in-CI, the admin DOM check, the
   dist-spawn test, and the manifest-bin cwd fix remain), then the gallery brainstorm
   (git-vs-R2), then P4.

## Prior next action (2026-06-11): execute the single-mount-admin plan (0.50.0)

**A foundation review of the engine (2026-06-11, run before the next feature round) redirected
the queue.** The engine internals reviewed strong; the weak joint is the consumer seam: ~18
string-coupled route shims per site that every action-adding release forces each site to
hand-edit, with silent failure when a key is missed (the 0.39 lesson). Geoff accepted breaking
work for better future-site DX, waived the heavy ritual, and retargeted the version to open the
**0.50.x series**.

**The plan is `docs/superpowers/plans/2026-06-11-cairn-single-mount-admin.md`, in progress.**
Thirteen tasks: a `createCairnAdmin(runtime, deps)` dispatcher returning one `load` plus one
static `actions` record, a `CairnAdmin.svelte` view switcher, the showcase converted to the
two-file mount, and the review's completion-debt riders (diagnostics conditions finished,
manifest-first `listLoad`, unified `fail()` vocabulary, the layering/dedupe batch, delivery
renames, the `/ambient` types subpath, the docs arm). Execution is the standard loop: one
`cairn-implementer` per task on `main`, full gate between dispatches.

**Sequencing consequences, decided 2026-06-11:**
- Work lands on `main` atop the **unpublished `0.41.0`**; the window (`0.41.0` + `0.50.0`)
  publishes together, the 0.39/0.40 precedent.
- **The site retrofits are held.** Retrofitting to 0.41.0 would hand-wire the 0.39 shim actions
  that 0.50.0 deletes; each site instead crosses once, straight onto the single mount.
- The review's remaining small findings stay with the gates-and-tooling pass (see the plan's
  out-of-scope list). The gallery and P4 follow as before, now shim-free.

## Prior next action (2026-06-11): publish `0.41.0`, then the queue resumes

**Diagnostics Pass 3 + the debt batch LANDED on `main` 2026-06-11 as `0.41.0`, closing the
diagnostics initiative.** Eleven plan tasks plus a simplifier pass, a review fold-in, and a
live-run fix, commits `dce3925..95a7061`. The `cairn-doctor` bin runs nine checks (local config,
Cloudflare, GitHub App) into one accumulate-all report keyed to the now twelve-entry frozen
condition registry; the readiness checklist guide pins to the registry via the new
`check:readiness` CI gate; `github.unreachable` covers the admin layout degrade. The debt batch
cleared eleven 0.39/0.40 carry-forwards (the SSR boundary leak, editLoad waterfall, mint
coalescing, publish-all polish, draftWarning via page.url, willUnload, roving sync, word count,
the LoginPage regression test, flash convergence; popover sweep found nothing).

**The doctor proved itself live on day one.** Run against the ecxc-ski checkout with real
credentials, it found that the `ecxc.ski` zone (new at the rename) never received Always Use
HTTPS or HSTS; verified against the zone-settings API, fixed in place (HTTPS on, HSTS two
years), re-run 9/9 green. One DX gap it surfaced (site.config.yaml at the adapter-configured
`src/lib/` path) was fixed as the conventional-locations probe.

Gate green at the tip `95a7061`, run first-hand: `npm run check` 887 files 0/0, `npm test` 148
files / 1146 tests exit 0, all five doc/readiness gates clean. Three reviewers, no Critical; the
fold-in raised the kit peer floor to `^2.12` (the `$app/state` import; a `Consumers must:` line
rides the changelog) and paired the doctor's CSRF check (an uncommented `checkOrigin: false` AND
a cairn-wired hooks file, closing a false-assurance gap). The post-mortem with seven
carry-forwards is in the plan
(`docs/superpowers/plans/2026-06-11-cairn-diagnostics-03-doctor-and-debt.md`).

**Next actions, in order:**
1. **Publish `0.41.0`**: push `main`, then `gh release create v0.41.0 --target main` with the
   0.41.0 changelog entry as the body (the kit `^2.12` `Consumers must:` line included).
2. **The queue resumes:** the gates-and-tooling pass (spec it first), then the gallery
   initiative (brainstorm first: git-vs-R2), then P4. The site retrofits to `^0.41.0` can run
   any time after the publish; each wires the 0.39 shim actions, checks its lockfile for svelte
   5.56.1 and kit >= 2.12, runs `cairn-doctor` as part of the retrofit, and is the live proof of
   the publish workflow, the `%2F` ref routes, and the redesigned editor.

## Prior next action (2026-06-11): publish the `0.39.0`+`0.40.0` window, then diagnostics Pass 3

**The edit-page redesign LANDED on `main` 2026-06-11 as `0.40.0`.** Twelve plan tasks plus a
simplifier pass and a review fold-in, commits `16c0a12..39c1f65`. The edit page has the four
zones (sticky glass header with status badges and the save-state indicator, the editor column
with the hoisted Bricolage document title and the instrument-strip toolbar with the full GFM set,
Write/Preview tabs, the grouped Details/Visibility/Address sidebar, one feedback strip), the Warm
Stone highlight theme with first-class remark-directive machinery styling and tooltips, native
spell check, dirty tracking with the leave guard and Ctrl/Cmd+S, and a new Web link dialog
(Ctrl/Cmd+K). Additive for consumer sites (no shim, action, or load change); the changelog
carries the conditional MarkdownEditor-direct-embed note and the svelte `5.56.1` compiler
advisory (floor `^5.56.3`).

Gate green at the tip `39c1f65`, run first-hand: `npm run check` 868 files 0/0, `npm test` 142
files / 1019 tests exit 0, all three doc gates and `check:prose` clean, showcase E2E 5/5 in a real
browser. Task 10 ran as the frontend-design pass with a fresh-agent critique (3 Criticals folded
in: the missing web-link control, the postage-stamp manuscript, the loud focus ring). The review
gate then caught three more Criticals, all fixed in the Opus fold-in `39c1f65`: Enter in a text
field implicitly submitted Publish (an sr-only default Save submitter now precedes the header in
tree order); the toolbar dialogs nested forms inside the edit form, breaking SSR and hydration
(all dialogs mount headless outside the form, now a design-system rule); and same-route
navigation carried entry A's body into entry B over an armed Save (`{#key}` plus an entry-key
reset effect). The a11y reviewer's computed-contrast pass drove the focus hairline to 70% alpha
(3.23:1), added the sticky-stack `scroll-margin-top` rule (WCAG 2.4.11), and moved both new
dropdowns to DaisyUI v5's Popover API pattern. The post-mortem with nine carry-forwards is in the
plan (`docs/superpowers/plans/2026-06-10-cairn-edit-page-redesign.md`).

**Next actions, in order:**
1. **Publish the held window** (`0.39.0` publish workflow + `0.40.0` edit page): push `main`, then
   `gh release create v0.40.0 --target main` with the changelog window since `v0.38.0` as the
   body, carrying `0.39.0`'s `Consumers must:` shim-actions line and `0.40.0`'s conditional notes.
   The release fires the OIDC trusted-publishing workflow.
2. **The queue resumes: diagnostics Pass 3** (doctor + the gated readiness checklist), spec
   `docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md`;
   no plan yet (write it just-in-time at pass start). Then the gates-and-tooling pass, the
   gallery (which replaces the editor's disabled Image placeholder), P4.
3. **Site track:** the ecxc `^0.38.0` bump stays queued; each site's `^0.40.0` retrofit wires the
   three publish-workflow shim actions, checks its lockfile for svelte `5.56.1`, and doubles as
   the live proof of the publish workflow, the `%2F` ref routes, and the redesigned editor.

## Prior next action (2026-06-10): publish `0.39.0`, then diagnostics Pass 3

**The publish workflow LANDED on `main` 2026-06-10 as `0.39.0`, unpublished.** Eleven plan tasks
plus a stale-prose sweep, a simplifier pass, two review fold-ins, and a docs fold-in, commits
`36bddc3..780c631`. Edits now hold on per-entry `cairn/<conceptKey>/<id>` branches until a
deliberate Publish; the ref's existence is the only pending state. The per-page Publish is
publish-what-you-see (it validates and holds the posted form like a save, then copies that
markdown to `main` with the manifest upsert in one commit), the branch delete is sha-guarded so a
concurrent save survives as a still-pending entry, publish-all ships every pending entry's last
saved version in one atomic commit, discard deletes the branch, and the `draft:` flag is
re-presented as the Hidden badge. The admin carries the status badges (New/Edited/Published), the
pending banner, the outline Publish beside the solid Save, and the topbar "Publish site (N)".
Breaking for consumers: the shims must add `publish`/`discard` (edit) and `publishAll` (list), and
saves no longer deploy the site. Three new log events: `entry.published`, `entry.discarded`,
`publish.failed`.

Gate green at the tip `780c631`, run first-hand: `npm run check` 862 files 0/0, `npm test` 141
files / 923 tests exit 0, all three doc gates exit 0, `check:prose` clean, showcase E2E 4 passed
including the full publish round trip in a real browser. Four reviewers (auth-security, svelte,
workers, a11y) found one Critical (publish dropped unsaved edits) and a converged Important (the
unconditional branch delete destroyed concurrent saves); both are fixed in the engine fold-in
`998cc30` (Opus-upshifted, the pass's one upshift) with the UI fold-in `941cf98` closing three
light-theme WCAG token failures and the twin-primary Save/Publish stack. The wrangler-dev D1
smoke was satisfied in substance by the showcase E2E (no auth code changed; the consumer-site
smoke rides each `^0.39.0` retrofit). The post-mortem with eight carry-forwards (the live `%2F`
ref-route proof, the layoutLoad degrade event for Pass 3, dialog titles, the flash-pattern
convergence, the token-mint coalescing, the editLoad probe waterfall, the "1 entries" plural, the
empty-batch flash) is in the plan (`docs/superpowers/plans/2026-06-10-cairn-publish-workflow.md`).

**Next actions, in order:**
1. **Publish `0.39.0`** (needs the push, so it is Geoff's call): push `main`, then
   `gh release create v0.39.0 --target main` with the changelog window as the body; the release
   fires the OIDC trusted-publishing workflow. The `Consumers must:` line for the shim actions
   must reach the release notes.
2. **The queue resumes: diagnostics Pass 3** (doctor + the gated readiness checklist), designed in
   `docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md`;
   no plan written yet (write it just-in-time at pass start). It picks up two queued conditions
   (the missing-binding condition from Pass 2, the layoutLoad GitHub-degrade event from this
   pass). Then the gates-and-tooling pass, the gallery, P4.
3. **Site track:** the ecxc bump to `^0.38.0` (Pass 2's live proof) stays queued as its own
   `site-pass`. Each site's eventual `^0.39.0` retrofit must wire the three new shim actions and
   doubles as the live proof of the publish workflow and the `%2F`-encoded ref routes.

**Diagnostics Pass 2 (email-delivery) LANDED on `main` 2026-06-10 as `0.38.0` (published).** Seven
plan tasks plus the simplifier (`6c5ea1e`) and the review fold-in (`3f1d8f8`), commits
`5d5c865..3f1d8f8`. The send is awaited, `requestAction` returns the `RequestResult` discriminant,
`LoginPage` renders the `send_error`/`throttled` states, and `auth.link.send_failed` carries
`code` plus `conditionId`. The post-mortem with six carry-forwards is in the plan
(`docs/superpowers/plans/2026-06-09-cairn-diagnostics-02-email-delivery.md`).

**The publish-workflow initiative (context, complete):** the approved spec is
`docs/superpowers/specs/2026-06-10-cairn-publish-workflow-design.md`, now carrying two plan-time
reconciliations (consumer shims must add the actions; branches hold no manifest copy) and two
review-time ones (publish-what-you-see; the sha-guarded delete). The plan executed as eleven
Sonnet `cairn-implementer` dispatches verified by the main loop, with the engine review fold-in as
the one Opus upshift.

## Backlog resequenced (2026-06-09): five engine passes instead of six

The queued work was re-cut on 2026-06-09, recorded here and in `ROADMAP.md`. The engine order is now
diagnostics Pass 2 (landed above), then diagnostics Pass 3, then one
consolidated gates-and-tooling pass, then the gallery initiative, then the P4 scaffolder. Three
changes from the prior sequence:

- **The site track is already clear, so Pass 2's live proof rides a small ecxc bump.** The second
  retrofit happened the same day as this re-cut: ecnordic-ski rebranded and renamed to ecxc-ski
  (repo `glw907/ecxc-ski`, domain `ecxc.ski`, auth D1 `cairn-ecxc-auth`
  `a47c56d2-25ef-4131-a505-8c9fd5a92f1f`) and bumped to `^0.37.1` with observability on; a live
  login POST logged `auth.link.requested` and `auth.token.minted` with no send failure. After Pass
  2 publishes, a bump-and-deploy to `^0.38.0` on ecxc.ski puts the `send_error`/`throttled` states
  live where the originating finding was filed, the same proof role the 907.life retrofit played
  for CSRF ownership.
- **DX-sweep Passes B and C collapse into one gates-and-tooling pass.** Pass B's scope (the
  manifest-bin `cwd` versus Vite `config.root` fix, the plain-Node dist-spawn test, the E2E gate
  wiring) and Pass C's gate-shaped remnants (the admin DOM render check, the showcase composer
  alignment, the link-picker narrowing, the `mintToken` widening) share one verification surface
  (scripts and gates run in CI), and each item is small and mechanical. One spec, plan, review
  gate, and publish replaces two of each. Pass C's non-gate remnants (the action `fail` payload
  types, the `App.Locals.editor` ambient type) move to P4 and the extension seam, where they are
  naturally exercised.
- **Pass 3 stays ahead of the gates pass.** It closes the diagnostics initiative while the
  registry and spec are warm, and its `check:readiness` gate is part of its own design. The gates
  pass still lands before the gallery and P4, which is where the protection matters.

## Immediate next action (2026-06-09): execute the diagnostics Pass 2 plan (the email-delivery runtime arm)

The **cairn diagnostics initiative** is a 1:1:1 model where one condition registry is the single source
of truth for the readiness checklist, the `cairn doctor` probe, and the runtime error. It answers the
ecxc magic-link-swallowed finding (`docs/cairn-dx-feedback-2026-06-08-ecxc-magic-link-send-swallowed.md`)
and the recurring class of silent Cloudflare setup failures behind it (email not onboarded, HTTPS not
forced, `checkOrigin: false` missing, observability off). It is decomposed foundation first across three
passes, designed in `docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md` (umbrella
plus the Pass 1 detail) and
`docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md` (Passes 2 and 3).

**Pass 1 (foundation) LANDED on `main` 2026-06-09, published in `0.37.1` (2026-06-09; the
patch also carried the docs reorganization and voice rewrite, with no consumer action).** It stood up the internal
`src/lib/diagnostics/` module (the `CairnCondition` registry with three guard conditions, the `CairnError`
throw primitive, the internal barrel) plus `src/lib/sveltekit/admin-response.ts` (extracted
`applySecurityHeaders`/`brandedAdminPage`) and `src/lib/sveltekit/condition-response.ts`
(`renderConditionResponse` + `REASON_CONDITION`), then routed the auth guard's three rejection responses
through the renderer with no behavior change. The two CSRF reasons are two conditions
(`auth.csrf-token-invalid`, `auth.csrf-origin-mismatch`) alongside `edge.https-not-forced`. The module is
internal (no public subpath), so the docs dimension was "nothing public to document" and
`check:reference`/`check:package`/`check:docs` stayed green with no edit. It ran subagent-driven, one
`cairn-implementer` per task (Tasks 1-6 each a fresh implementer, Task 7 verification inline), seven task
commits `35825cb..8cbeacb`. Gate green at the tip `8cbeacb`, run first-hand: `npm run check` 853 files 0/0,
`npm test` 135 files / 832 tests exit 0. The pre-existing `auth-guard.test.ts` is the regression proof the
guard migration changed no behavior: 20/20 before and after, unchanged. The simplifier made no change and
both reviewers (`web-auth-security-reviewer`, `cloudflare-workers-reviewer`) returned no Critical/Important.
The live admin smoke was judged not proportionate (behavior-preserving re-home, no rendering change, the
workerd integration suite already pins the responses). Post-mortem with the three carry-forwards (freeze
`REGISTRY`; tie the renderer/registry 1:1 with one coverage test; the pre-existing untested
https-vs-csrf branch ordering) is in the plan
(`docs/superpowers/plans/2026-06-08-cairn-diagnostics-01-foundation.md`).

**Pass 2 (the email-delivery runtime arm) HAS A WRITTEN PLAN, ready to execute:**
`docs/superpowers/plans/2026-06-09-cairn-diagnostics-02-email-delivery.md`. Execute with
`superpowers:subagent-driven-development`, one `cairn-implementer` per task, on `main` directly (the
established precedent for this initiative). Seven tasks, each ending on the full gate (`npm run check`
0/0, `npm test` exit 0). It consumes the Pass 1 model: await the send (remove the `waitUntil`
backgrounding), a typed `status` result (`sent`/`send_error`/`throttled`) additive over the existing
`sent` boolean, the logged binding `code` plus a new `conditionId` on `auth.link.send_failed`, and the
`LoginPage` `send_error` and `throttled` states on top of the `0.37.0` confirmation polish. The non-leak
posture is deliberately relaxed for editor feedback (the neutral and send-ok paths stay byte-identical;
`send_error`/`throttled` reveal editor membership by design), and the await-the-send timing side-channel
is noted not mitigated (flagged to `web-auth-security-reviewer`). Two email conditions
(`email.sender-not-onboarded`, `email.send-failed`) join the Pass 1 registry, seeding Pass 3's doctor.
The minor bumps `0.38.0` (additive). **Scope/reconciliation calls baked into the plan (settled with
Geoff 2026-06-09):** Pass 2 also corrects the stale `CLAUDE.md` Cloudflare-email gotcha (a known-wrong
durable gotcha should not wait), while the readiness checklist and the deploy-guide onboarding section
stay Pass 3; and `CairnError`'s first use here is as the *carrier* of the mapped condition (Arm A has no
rendered-error boundary), with its first thrown-and-rendered site moving to the Pass 3 doctor. The
throwaway `examples/showcase/src/routes/_login-preview/` route (still untracked) is the eyeballing
surface; Pass 2's last task deletes it.

**Pass 1 docs split reconciled in the spec (2026-06-09).** The email-delivery design spec now records the
Pass 2/3 docs split and the timing side-channel decision, committed as `370488e`.

**The ecxc production outage is already fixed.** The `ecxc.ski` sending domain was onboarded to
Cloudflare Email Sending live on 2026-06-08 (subdomain `ecxc.ski`, return path `cf-bounce.ecxc.ski`,
status `ready`), so login there is unblocked. The renamed-domain gap (`ecnordic.ski` was onboarded,
`ecxc.ski` was not) was the surface fault. Email Sending reaches arbitrary recipients once the per-zone
sending subdomain is onboarded; cairn stays Cloudflare-native with `cloudflareSend`, no second provider.

**Pass 3 (after Pass 2).** `cairn doctor` and the generated, gated (`check:readiness`) Cloudflare
readiness checklist that starts a developer from a default 2026 Cloudflare setup and links out to
Cloudflare for the generic steps. The 0.37.0 login-confirmation polish was committed standalone as
`d2cf014` (the brand snippet and the inset help note), so Pass 2 builds its `send_error`/`throttled`
states on top of it.

## Login-confirmation UX shipped as `0.37.0` (2026-06-08)

The magic-link sign-in confirmation became a branded panel in place of the flat DaisyUI success bar:
a mail icon in a soft success tile (the Warm Stone `--color-success` token, not stock green), a "Check
your email" heading, the ten-minute expiry note, and, below a divider, guidance for the link that never
arrives (spam folder, then confirm the address matches the one the site owner added). This answers the
fat-finger case, where a mistyped or unlisted email gets the same neutral confirmation and no email. A
"Use a different email" action flips a client-only `dismissed` state back to the form. The confirmation
copy stays identical whether or not the email is on the allowlist, so the page still never leaks
membership. The change is internal to the `LoginPage` component, additive, and needs no consumer action.

It landed on `main` directly (not a numbered plan): the `LoginPage.svelte` rebuild plus two new
component tests (the help copy renders, and "Use a different email" returns to the form). Gate green at
the source tip: `npm run check` 0/0, `npm test` 130 files / 816 tests exit 0, `check:prose` clean, and
the visual was verified on the showcase against the compiled admin sheet in both states. The `v0.37.0`
GitHub Release fires the OIDC trusted-publishing workflow over the prior `0.36.0` `latest`. The next
engine action below (resume the queued backlog) is unchanged.

## Engine next action (2026-06-08): the engine-logging pass LANDED and PUBLISHED as `0.36.0` (registry `latest`)

cairn's first logging infrastructure LANDED on `main` 2026-06-08 as `0.36.0`, and PUBLISHED the same day
as the registry `latest`. The `v0.36.0` GitHub Release fired the OIDC trusted-publishing workflow (run
`27175127215` green, `check:package` plus `npm publish` both passed) over the prior `0.35.0` `latest`;
`main` is clean at the `v0.36.0` tag with nothing unpublished. An internal
`src/lib/log/` module owns one logger that assembles a structured JSON record
(`{ level, event, timestamp, ...fields }`) and writes it to `console`, where Workers Logs ingests and
indexes it when a site sets `observability.enabled`. Nine events route through it: the auth flow
(`auth.link.requested`, `auth.token.minted`, `auth.link.send_failed`, `auth.token.confirmed`,
`auth.session.created`, `auth.session.destroyed`), the commit pipeline (`commit.succeeded`,
`commit.failed`), and the guard's three pre-resolve refusals (`guard.rejected` with `reason`
`csrf`/`origin`/`https`). The module is exported from no package subpath, so its API stays free to
grow; the event names are the public-observable contract. The forward-compat invariants (structured
records from the first call, one chokepoint) keep the deferred admin-extension affordances additive.

It ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 2/3/4 on Opus and
1/5/6 on Sonnet. Six task commits `231476a..f87af99`, a simplifier `2be2105`, a review fold-in
`6be795b`, the release commit `f699ea7` (the `0.36.0` bump, changelog, upgrade-guide, reference note),
and an infra commit `941cfa2` (a CLAUDE.md "Diagnosing a running site" section pointing troubleshooting
at the logs first). Gate green at the source tip `6be795b`, run first-hand: `npm run check` 841 files
0/0, `npm test` 130 files / 814 tests exit 0, and `check:docs`/`check:reference`/`check:package` exit 0.
The post-mortem (the four-not-five commit-site plan gap, the three-reviewer-converged email-bounding
fold-in, and the carry-forwards) is in the plan
(`docs/superpowers/plans/2026-06-08-cairn-engine-logging.md`); the design spec is
`docs/superpowers/specs/2026-06-08-cairn-engine-logging-design.md`.

**The review gate ran clean.** Three reviewers, no Critical or Important. `web-auth-security-reviewer`
confirmed no token, session id, or magic-link content reaches a field, and that `String(err)` cannot
transitively carry the GitHub token or the link. `cloudflare-workers-reviewer` confirmed
`console.log(object)` is the right shape for Workers Logs field indexing and that the send-failed
`.catch` log lands on the existing `ctx.waitUntil`. `svelte-reviewer` confirmed every log sits correctly
around the throw/return boundaries with no action or hook contract change. All three flagged the
unvalidated `auth.link.requested` email; the fold-in bounds it to 320 chars and documents it, and a
mint-path redaction test was added and proven a real guard.

**Carry-forwards.** (1) The `auth.link.requested` route is unauthenticated and unrate-limited, so a
flood of distinct emails inflates Workers Logs volume; the length cap bounds record size, not volume.
Bounding volume needs edge rate-limiting, a broader change. (2) `render.failed` stays deferred until a
server-side render path exists. (3) The three admin-extension affordances (`event.locals.cairn.log`,
`onEvent`, per-extension namespacing) stay deferred to the undesigned `CairnExtension` seam. (4) Each
site retrofit gets a site-side "check Workers Logs" pointer when it runs.

**Next engine action: resume the queued engine backlog.** `0.36.0` is published and `main` is clean at
the `v0.36.0` tag with nothing held. The queued engine backlog (the DX-sweep tooling/CI robustness work
and the scaffolder track) is unchanged by this pass. The two prod-site retrofits stay the separate
`site-pass` track and now pick up `0.36.0` (additive) alongside the `0.35.0` CSRF action.

The two site retrofits below stay the separate `site-pass` track and are unaffected by this engine pass.

## Site track (2026-06-09): both retrofits DONE (907.life `^0.36.0`; ecnordic-ski renamed ecxc-ski, `^0.37.1`)

**907.life was retrofitted to `^0.36.0` and deployed 2026-06-09, and its live site verified cairn's CSRF
ownership end to end. The second retrofit is also DONE: ecnordic-ski rebranded and renamed to ecxc-ski
the same day (repo `glw907/ecxc-ski`, domain `ecxc.ski`), bumped to `^0.37.1` with observability on,
and a live login POST logged `auth.link.requested` and `auth.token.minted` with no send failure
(details in `ecxc-ski/docs/STATUS.md`). The remaining site action is a small ecxc bump to `^0.38.0`
after Pass 2 publishes; see the resequencing entry at the top.** 907 crossed the
`0.24.0` → `0.36.0` window in one pass (`composeRuntime` object form, a `(site)` route group for
chrome-free admin, `csrf: { checkOrigin: false }`, and `[observability]`); the commit and post-mortem are
in `907-life/docs/STATUS.md` and `907-life/docs/architecture.md`. The deployed `https://907.life/admin/login`
returns `200`, renders chrome-free with the `cairn-admin` shell, sets the `__Host-cairn_csrf` cookie, and
carries the `name="csrf"` field, so the real-runtime CSRF loop the engine deferred to the first retrofit is
now proven live (only the magic-link email click stays manual). The retrofit filed two engine DX findings,
`docs/cairn-dx-feedback-2026-06-09-907-0.36-retrofit.md`: the `csrf.checkOrigin` deprecation in SvelteKit
2.61 (cairn documents a spelling on a removal path), and the `custom_domain` local-smoke gap (`wrangler
dev` presents `event.url` as the production https origin, so the documented local http admin smoke hits the
`0.34.0` HTTPS-required page). Both sites have now crossed; the ecxc-ski upgrade landed 2026-06-09
at `^0.37.1`.

**Window context (historical; both sites have crossed).** The login-CSRF-ownership plan PUBLISHED 2026-06-08 as
`0.35.0`, and the engine-logging pass PUBLISHED 2026-06-09 as `0.36.0` (now `latest`). A retrofit pins
`^0.36.0` and adds `csrf: { checkOrigin: false }` to `kit` in `svelte.config.js`, along with the other
breaking-window actions noted below.

**What `0.35.0` did.** It moved login-CSRF ownership from SvelteKit's global `checkOrigin` to cairn's auth
guard, closing the second source of the admin lockout that `0.34.0`'s force-HTTPS work did not reach: a
privacy browser that sends no `Origin` header tripped the same opaque SvelteKit 403. A consuming site now
disables the framework's global check, and the guard enforces two rules: every unsafe `/admin` form POST
carries a valid `__Host-cairn_csrf` double-submit token (lazy and stable, HttpOnly, SameSite=Strict,
session-scoped, bare `cairn_csrf` on local http), and every non-admin unsafe form POST keeps a strict `Origin`
check, so disabling the global check is not a net loss. The token is issued by the login, confirm, and
admin-shell loads, rendered by a new public `CsrfField` component, validated centrally with a constant-time
compare, and a failed admin check serves a branded 403 page (not the raw framework text) built through a
shared static-page shell extracted from the HTTPS-required page. Spec:
`docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md`. Plan with the full post-mortem:
`docs/superpowers/plans/2026-06-08-cairn-login-csrf-ownership.md`.

It ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 5 and 10 on Opus and the
rest on Sonnet. Thirteen commits `93774a6..b165df3`: eleven task commits, a simplifier commit `cbd8b31` (a
shared branded-page response builder in the guard), and a svelte-review fold-in `b165df3` (the context hands a
live token getter instead of a once-captured value, so a future mid-session rotation cannot leave a stale
field). Gate green at the tip `b165df3`, run first-hand: `npm run check` 836 files 0/0, `npm test` 128 files /
796 tests exit 0, `check:docs`/`check:reference`/`check:package` exit 0, and the `examples/showcase`
production build exit 0. The new `CsrfField` export carries a `0.35.0` reference entry, and the deploy guide,
upgrade guide, changelog, and security-model docs document cairn-owned CSRF.

**The execution caught one plan gap, now closed.** The plan's Task 10 list missed two real admin mutation
forms, `DeleteDialog.svelte` (`?/delete`) and `RenameDialog.svelte` (`?/rename`), which render as descendants
of `EditPage` and `ConceptList`; both now carry a `CsrfField`. Without that, those two mutations would have
failed closed at runtime (the branded 403) the moment a site enabled cairn's CSRF ownership. The implementer
found them by surveying the real markup, the intended discipline for a broad task.

**The review gate ran clean.** `web-auth-security-reviewer`: no Critical or Important (it confirmed the
`__Host-` cookie fixation resistance, the constant-time compare with empty-token rejection, the body clone
that leaves the action's body readable, and the guard ordering that gates every unsafe `/admin` POST before
`resolve()`). `daisyui-a11y-reviewer`: both branded pages clear WCAG 2.2 AA in light and dark with margin.
`svelte-reviewer`: one Important on the once-captured context token, folded in as `b165df3`.

**Three `0.35.0` carry-forwards (recorded, not fixed).** (1) Bare `<CsrfField />` depends on an ancestor
`setContext`, an undiscoverable coupling: a new admin form rendered outside `AdminLayout` (the coming
`CairnExtension` seam) would ship an empty field and surface only as a submit-time 403; a dev-time warning
when both the prop and the context getter are absent would make it loud. (2) The branded-page CTA hover has an
ungated `transform` transition; a `prefers-reduced-motion` guard is optional polish (AAA, not required for AA).
(3) `LayoutData.csrf` admits `''` for non-route callers; fail-closed either way, a clarity nit only.

**`0.34.0` PUBLISHED 2026-06-08, now the registry `latest`.** The `v0.34.0` GitHub Release fired the OIDC
trusted-publishing workflow (run `27156079198` green, `check:package` plus `npm publish` both passed),
putting the login-CSRF hardening over the prior `0.33.0` `latest`. The held window had published earlier
the same day as `0.33.0` (run `27117496588` green), folding `0.30.0` (DX-A render-authoring), `0.31.0`
(self-styling foundation), `0.32.0` (UX rebuild plus the polish and design-identity arc), and `0.33.0`
(chrome isolation) over the prior `0.29.0`. `main` is now clean at the `v0.34.0` tag with nothing
unpublished. The next action is the two production-site retrofits (907.life, ecnordic.ski), each a
separate `site-pass`.

**Login-CSRF hardening LANDED on `main` 2026-06-07 as `0.34.0`, PUBLISHED 2026-06-08 (over the `0.33.0`
`latest`).**
Filed from the first real ecnordic admin login: a magic-link sign-in over http failed with SvelteKit's
opaque CSRF 403, because the JS-free form POST needs a matching https origin
(`docs/cairn-dx-feedback-2026-06-07-ecnordic-0.33-login-csrf.md`). Two commits on `main`, `5ef1d73` then
`69a67f3` (plus the version bump). The auth guard now detects a deployed, non-local admin request over
http and serves a self-contained, design-system-matched help page (status 400, light and dark) that names
the problem, links to the https version for one-click recovery, and gives the Cloudflare fix, returned
before `resolve()` runs the CSRF check; `wrangler dev` over http is exempt
(`src/lib/sveltekit/https-required-page.ts`, wired in `guard.ts`). The login copy lost a tacked-on
closer, and a new `npm run check:prose` (`scripts/check-admin-prose.mjs`, now in CI) scans the admin
components' user-facing strings for AI tells, since the component copy ships compiled and a consuming
site's `prose-guard` never sees it. The deploy guide now requires forcing HTTPS, the admin design system
records the brand-prose standard, and the `web-auth-security-reviewer` cleared the guard change (no XSS in
the escaped href, no session-gate bypass, no redirect primitive). Gate green, run first-hand: `npm run
check` 825 files 0/0, `npm test` 122 files / 765 tests exit 0, `check:docs` and `check:prose` clean.

The two production zones were set to force the scheme at the edge as the immediate site-side fix: **Always
Use HTTPS and HSTS (`max-age` two years, `includeSubDomains`, preload off) are now on for ecnordic.ski and
907.life** (via the Cloudflare API). The HSTS header the feedback saw earlier came from cairn's own
`/admin` responses; the zone-level setting was off until now. `0.34.0` is additive (the help page only
triggers on a misconfigured http request), so it published with no required consumer action beyond forcing
HTTPS: `0.34.0` is now the registry `latest`.

**Site-retrofit gotchas the published window carries (for each `site-pass`).** Both sites pin an older
range and cross several breaking minors at once, so an upgrade reads the actions off the `Consumers must:`
lines. The two breaking minors in this window: `0.30.0` moved the render-authoring helpers (`iconSpan`,
`cardShell`, `headRow`, `isElement`, `strAttr`) to the `@glw907/cairn-cms/render` subpath and removed
`rehypeDispatch` (use `createRenderer`), and a component with `defaultIconByRole` and no `type:'icon'`
attribute now fails `defineRegistry`; `0.33.0` requires a chrome-free root layout with the public chrome
plus `app.css` moved into a `(site)` route group. Both sites also still carry the pre-existing
`composeRuntime` positional-call break against their `^0.24.0` pin (the `0.24.0` object form), to fix at
the same retrofit. `0.31.0` and `0.32.0` are additive.

**Plan 3 LANDED on `main` 2026-06-07 as `0.33.0`, unpublished.** It ran subagent-driven, one
`cairn-implementer` per task on `main` directly, all seven tasks on Sonnet (mechanical, well-specified).
Ten commits `c0280e9..b87cfd3`: seven task commits, a pre-existing-defect fix `89abb78`, a simplifier pass
`373f24a`, and a review fold-in `b87cfd3`. A dev-only `chrome-guard.ts` (`detectChromeWrap` plus the
`import.meta.env.DEV`-gated `warnIfChromeWrapped`) walks the admin root's ancestor chain on mount and logs
one `console.error` when a width-constraining ancestor wraps the admin; both admin roots call it against a
`bind:this`-bound `data-theme` wrapper. A boundary test pins that `cairn-admin.css` is imported only by the
admin roots, so its document-global `@keyframes`/`@property` rules load only on `/admin`. The showcase
gained a `(site)` route group with plain-CSS chrome, proving the admin self-styles on a framework-free
site. The route pattern is documented (`docs/admin-route-structure.md`) and taught in the tutorial. Gate
green at the tip `b87cfd3`, run first-hand: `npm run check` 823 files 0/0, `npm test` 121 files / 758 tests
exit 0, `check:reference`/`check:package`/`check:docs` exit 0. The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-07-cairn-admin-chrome-isolation.md`).

**This closes the plan-1 global at-rule carry-forward** by isolation rather than name-mangling: the sheet
is code-split to the admin roots, so it loads only on `/admin`, and the route pattern keeps host CSS off
`/admin` from the other side. **Two reconciliations the execution surfaced.** (1) `cairn-admin.css` is
imported by THREE roots, not two: `ConfirmPage.svelte` also imports it, so the boundary test asserts all
three (the guard wiring stays on `AdminLayout` and `LoginPage` per the plan; the confirm page is a brief
interstitial). (2) `main` carried two pre-existing `svelte-check` errors in `AdminLayout.test.ts`
(`dialog.modal` `.open` typed as `Element`) from the design-identity arc fold-in `a76aa8b`; the arc's
reported "0/0 at a76aa8b" was inaccurate. They blocked the plan's 0/0 gate and were fixed first as
`89abb78` (a typed `querySelector<HTMLDialogElement>`).

The review gate ran the simplifier plus the `svelte-reviewer` (no Critical/Important; confirmed the
runes/SSR pattern and `(site)` routing) and the `daisyui-a11y-reviewer` (one Important: the showcase header
links lacked a `<nav>` landmark). The fold-in `b87cfd3` added the `<nav aria-label="Site">` landmark, a
skip of non-constraining `max-width` values (`100%`, `100vw`) so a host's defensive wrapper does not trip
the dev guard, and a fixture-only note on the test marker. The live `wrangler dev` admin smoke was judged
not proportionate (the only runtime change is a dev-only `console.error` that compiles out of production
and changes no rendering; the showcase preview smoke already proved `/admin` renders outside the chrome),
the same call plan 1 made.

The admin-stands-alone initiative spec is `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md`.
Plans 1, 2, and 3 have all landed; the polish and design-identity arc ran between plans 2 and 3. The
remaining initiative work is the two site retrofits, after the held window publishes.

**The polish pass LANDED 2026-06-07 (commit `97ff069`), folded into `0.32.0` (no version bump, the window
is unpublished).** It refined the look with the Playwright render-and-compare loop, direction warm
editorial utility: refined Warm Stone light and dark tokens for clearer surface layering, a soft
`bg-primary/10` active-nav state, the site name instead of a redundant single breadcrumb on a bare list
page, a refined list table (uppercase muted column labels, row hover, cleaner title links, card
elevation), a newest-first default sort, and a scoped `prefers-reduced-motion` guard. A scoped anchor
reset in `@layer components` restores the no-underline inherit-color default the omitted Preflight used to
provide. The a11y review's contrast pass cleared AA in both themes; the dark active-nav at 4.53:1 is the
one locked margin, so dark `--color-primary` and the `/10` tint opacity must not move without re-checking.
A real cascade-layer lesson landed: an unlayered reset beats every layered utility because layers resolve
before specificity, so the reset had to go in the `components` layer (below `utilities`). The pass-end
post-mortem is in the plan file.

**The design-identity arc LANDED 2026-06-07 (final fold-in `a76aa8b`), folded into `0.32.0` (no version
bump, still unpublished).** A long user-driven sequence after the polish gave the admin a distinct
identity: a Bricolage Grotesque wordmark over a Figtree body, both self-hosted as variable woff2 under
the SIL OFL (the `@font-face` is appended after the Tailwind compile so the `url()` is not rebased); an
app-icon brand tile with the CC0 Temaki cairn glyph; softer radii and floating cards; a flat opaque
sidebar-plus-topbar header strip; nav grouped into a core group and custom-named developer-extension
groups, each a collapsible `<details>` whose state persists through a `cairn-admin-nav-collapsed` cookie
that `layoutLoad` reads for a no-flash first paint; and a Cmd/Ctrl+K command palette in the topbar. The
login and confirm screens were rebranded to match, with the favicon from `cairn-favicon.ts`. Two latent
rendering bugs were fixed in the window: the auth screens centered on the `data-theme` element instead of
a wrapper (the same defect class as the plan-2 drawer), and the command palette cancelled its own
navigation by closing the dialog from a result link's `onclick` (internal links now navigate and the
pathname effect closes the palette; a regression test pins it). The pass wrote an agent-facing design
system at `docs/internal/admin-design-system.md`, with a `CLAUDE.md` "Admin interface design" pointer and
the `cairn-admin-design-system` memory, so continued interface work stays consistent. Gate green at
`a76aa8b`: `npm run check` 821 files 0/0, `npm test` 120 files / 751 tests exit 0, and
`check:reference`/`check:package`/`check:docs` exit 0. The full post-mortem is in the plan file.

**Carry-forwards still open (for a later touch).** (3) `use:enhance` with `applyAction` for the list
delete, deferred because `$app/forms` does not resolve in the component test project. (4) The
first-ever-visit dark-OS first-paint flash, which needs an inline head script in the host `app.html` and so
suits a showcase or scaffolder touch. (6) The plan-1 global at-rule leak is CLOSED by plan 3's chrome
isolation (the sheet is code-split to the admin roots, so it loads only on `/admin`, and the route pattern
keeps host CSS off `/admin`; a boundary test pins the import side). The held window PUBLISHED 2026-06-08 as
`0.33.0`, now the registry `latest` over the prior `0.29.0` (`0.30.0` through `0.33.0` folded in).

**Plan 2 LANDED on `main` 2026-06-07 as `0.32.0`, unpublished.** It ran subagent-driven, one
`cairn-implementer` per task on `main` directly, Tasks 4, 6, 8, and 10 on Opus and the rest on Sonnet.
Eleven task commits `01751ae..1929b21` plus three fold-ins: the self-styling render fix `ed0d50a`, the
simplifier `129ba6d`, and the review fold-in `73cf8a7`. The admin list is now a searchable, sortable
DaisyUI data-table (status badges, formatted dates, per-row delete reusing the inbound-link guard,
pagination, a header create dialog), the sidebar has Lucide nav icons and a footer user menu, the topbar is
sticky with breadcrumbs, and the admin has a dark mode persisted through a `cairn-admin-theme` cookie that
`layoutLoad` reads for a no-flash first paint. `@lucide/svelte` is a new runtime dependency; `lightningcss`
is a new build-only devDependency. The minor bumps `0.32.0` with a "Consumers may:" line (additive;
`listDeleteAction` is the one new opt-in action). Gate green at the tip `73cf8a7`, run first-hand: `npm run
check` 816 files 0/0, `npm test` 120 files / 745 tests exit 0 (one re-run cleared the known
`delivery-*-split` parallel-load flake), and `check:reference`/`check:package`/`check:docs` exit 0. The
post-mortem is in the plan (`docs/superpowers/plans/2026-06-07-cairn-admin-ux-rebuild.md`).

**The verification gate caught a latent plan-1 defect, fixed as `ed0d50a`.** Task 10's light-and-dark
showcase proof found the admin sidebar never rendered at desktop width and the root background never
filled. Two causes, both in the plan-1 self-styling foundation and unscrutinized until this pass rendered
the full shell. First, `postcss-prefix-selector` prepended the scope to the front of every rule including
the nested rules Tailwind v4 and DaisyUI emit, so a nested selector starting with a combinator became
`:where(scope) > .x`, which native nesting composed as `& :where(scope) > .x` and severed the
`lg:drawer-open` reveal from its parent. The fix flattens the nesting with lightningcss before scoping.
Second, the admin root carried `data-theme` and the drawer classes on the same element, but every rule
scopes as a descendant of the theme root, so `.drawer` on the theme element never matched; moving
`data-theme` onto a bare wrapper makes the drawer a scoped descendant. A regression test in
`admin-css-build.test.ts` pins both. The fix is proven on the showcase in both themes.

**The review gate caught one Critical and two Important issues, folded in as `73cf8a7`.** The per-row
delete-refusal UI was dead: the action returns a flat `fail(409, { inboundLinks, id })`, but `ConceptList`
read a nested `form.deleteRefused` the action never produces, and the showcase shim never forwarded the
`form` prop. The server still refused the unsafe delete, so data was safe, but the author saw no reason.
The fold-in reads the flat shape, forwards `form` from the shim, and surfaces the refusal as a visible
`role="alert"` banner for editor parity, with a new component test. The two a11y fixes add `aria-sort` to
the sortable headers and a load-present `role="status"` live region for the filter result count and the
empty state. Two cheap minors rode along: the breadcrumb `{#each}` key and a `btn-sm` delete target.

The admin-stands-alone initiative spec is `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md`.
It decomposes into three engine plans by verification surface (self-styling foundation, the UX rebuild plus
dark mode, chrome isolation plus the route-structure pattern and dev guard), then two site retrofits. Plans
1 and 2 have landed; the polish pass runs between plan 2 and plan 3.

**Plan 1 (self-styling CSS foundation) LANDED on `main` 2026-06-07 as `0.31.0`, unpublished.** The admin
now ships its own stylesheet from the engine. A new `scripts/build-admin-css.mjs` compiles the admin's
Tailwind utilities and DaisyUI components (built-in themes off, no global Preflight) plus the Warm Stone
variables, scopes every rule under `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])`
with `postcss-prefix-selector`, and writes the sheet to `dist/components/cairn-admin.css`, where the admin
components already import it. The `package` script runs the compile after `svelte-package`; the theme
partial gained a box-sizing reset scoped to the admin roots in place of the omitted global Preflight. It
ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 5 and 7 on Opus and the
rest on Sonnet. Six task commits `2e7cf0d..968999f`, a review fold-in `fda004e`, and the upgrade-guide doc
`bb6d1bd`. Gate green at Task 8, run first-hand: `npm run check` 797 files 0/0, `npm test` 119 files / 723
tests exit 0, `check:reference`/`check:package`/`check:docs` exit 0. The compiled sheet is 168,236 bytes
(23 `.btn`, 0 surviving raw directives, 623 scoped selectors). The minor bumps `0.31.0` with a "Consumers
may:" line (the change is additive, no required action). The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-07-cairn-admin-self-styling-foundation.md`).

**The review gate caught one real defect, folded in as `fda004e`.** The run-as-script guard that compared
`import.meta.url` against a `file://`-prefixed `process.argv[1]` was fragile: `import.meta.url`
percent-encodes path characters and resolves symlinks while `process.argv[1]` does neither, so on a
checkout path with a space or reached through a symlink the guard is false, `npm run package` exits 0
having shipped only the 2KB variables-only partial, and the admin renders unstyled with no error. The fix
uses the standard `pathToFileURL(process.argv[1]).href` idiom with an `argv[1]` presence guard. The
simplifier made no change; the `svelte-reviewer`, `daisyui-a11y-reviewer`, Worker, and auth reviewers and
the live `/admin` smoke did not apply (no component markup, auth, or Worker change).

**Plan-1 carry-forwards (recorded, not fixed).** (1) Global at-rule leaks: the review confirmed every
style rule (621+) is correctly scoped, but `postcss-prefix-selector` rewrites rule selectors only, never
at-rule identifiers, so DaisyUI's global `@keyframes` (the common name `spin`, plus `progress`, `toast`,
`menu`, `dropdown`, `skeleton`) and its `@property` registrations (the unprefixed `--radialprogress` with
`inherits:true`, and 41 prefixed `--tw-*` ones) stay document-global. The realistic collision is a host
that defines `@keyframes spin` while the admin sheet loads document-wide. The risk is bounded today (the
sheet is route-scoped to `/admin`, and plan 3 isolates the chrome), and a fix is keyframe and property
name-mangling, a different mechanism from the selector scoping plan 1 locked; it belongs with plan 2 (the
UX rebuild adds the bulk of DaisyUI keyframes) or plan 3. (2) The showcase mounts no `/admin/login` route,
so the Task 7 visual proof ran against `/admin/posts` (the same `AdminLayout.svelte` self-styling path);
wiring the login route into the showcase is a showcase gap, a candidate for a later showcase touch.

## Deferred behind the admin initiative: DX-sweep Pass B (tooling and CI robustness)

**DX-sweep Pass A (render authoring) LANDED on `main` 2026-06-06 as `0.30.0`, unpublished.** It carved the
public `@glw907/cairn-cms/render` authoring subpath (`iconSpan`, `cardShell`, `headRow`, the re-homed
`isElement`, and the new `strAttr`), added a configurable `headRow` heading level (default 2), a
`registry.iconField(name)` accessor, and a `defineRegistry` guard that fails a component declaring
`defaultIconByRole` with no `type:'icon'` attribute, and dropped `rehypeDispatch` from the public surface
(`createRenderer` is the one public render pipeline). It ran subagent-driven, one `cairn-implementer` per
task on `main` directly (no worktree), Tasks 3, 4, 5 on Opus and Tasks 1, 2, 6, 7 on Sonnet. Seven task
commits `e219335..48b83d8`, a simplifier commit `7ee7c7b` (a shared `findIconField` helper), and a review
fold-in `c69079e`. The minor bumps `0.30.0` with a `Consumers must:` line (the render-authoring imports
moved and `rehypeDispatch` is gone). Gate green at the source tip `7ee7c7b`, run first-hand: `npm run check`
793 files 0/0, `npm test` 118 files / 720 tests exit 0, `check:reference` and `check:package` exit 0; the
render-pipeline snapshot stayed byte-identical; the showcase `check` 0 errors in `src/` and a production
build exit 0. The post-mortem (with the three carry-forwards and the review triage) is in the plan
(`docs/superpowers/plans/2026-06-05-cairn-render-authoring-surface.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md`.

**The review gate caught one real doc-framing issue, folded in as `c69079e`.** The `defineRegistry` icon
guard was filed under "additive (non-breaking)" in the upgrade guide, but it converts a previously silent
no-op into a hard throw at registry construction: a component with `defaultIconByRole` and no icon attribute
never rendered its default icon before (the default only stamps through an icon attribute), so a consumer
build that succeeded before can now fail. The fold-in moved the guard out of the non-breaking heading and
states the conditional consumer action in both `CHANGELOG.md` and `docs/guides/upgrade-cairn.md`.

**Three Pass A carry-forwards (recorded, not fixed).** (1) `headRow`'s `level` is a plain `number` with no
1..6 validation, so an explicit `headRow(title, icon, 0)` or `7` emits an invalid `<h0>`/`<h7>` (the
default fires only for `undefined`); no current caller passes a non-default level, so it is a latent
robustness gap on the new authoring helper, to clamp in a future render touch. (2) The icon guard checks an
icon field exists, not that every `defaultIconByRole` role is a reachable `role` option. (3) The guard
iterates every `components` entry while `byName` is last-wins, so on a duplicate component name it can throw
on a shadowed def the engine would never dispatch (duplicate names are already an authoring error).

**Immediate next action: DX-sweep Pass B (tooling and CI robustness).** Brainstorm and spec it first (it has
no plan yet), then execute subagent-driven on `main`. Its scope is sketched in the "Sequence to the
scaffolder" split below (the DX-B-engine manifest-bin `cwd`-versus-Vite-`config.root` fix, a plain-Node
dist-spawn test for the `/delivery/data` node-safety guarantee, wiring the showcase golden-path E2E into a
gate). After Pass B comes Pass C (admin and consumer alignments), then the gallery initiative, then P4.
Publishing stays held: `0.29.0` is the registry `latest`, and `main` now carries the unpublished `0.30.0`;
the window publishes before any site or the scaffolder consumes the `/render` subpath.

The **engine-hardening series is COMPLETE and PUBLISHED.** All three release-gate improvements landed and
the held window published together as `0.29.0`: pass 1 (surface-narrowing, `0.27.0`), pass 2 (render
attribute-sink hardening, `0.28.0`), and pass 3 (URL-identity consolidation, `0.29.0`). The `v0.29.0` GitHub
Release fired the OIDC trusted-publishing workflow (run `27057249585` green), and `0.29.0` is now the
registry `latest` over the prior `0.26.0`. The pre-publish gate was green: both production sites'
`site.config.yaml` `content:` blocks pass pass 3's new URL-policy validation (verified by running the real
`parseSiteConfig` to `urlPolicyFrom` to `normalizeConcepts` chain against each site's config). The series
ran before P4 so the scaffolder templates the clean surface.

**A docs anti-drift gate landed alongside the publish (2026-06-06).** Verifying docs currency for the
published window found five drifts passes 1 and 2 had shipped (the upgrade guide missed `0.28.0`/`0.29.0`,
`security-model.md` and `architecture.md` still called the render attribute-sink an open residual that
`0.28.0` closed, and four reference anchors that `0.27.0` moved or removed were still linked across three
pages and a guide), all now fixed. A new `npm run check:docs` link gate (`scripts/docs-links.mjs` plus a
unit test) fails on any dead relative link or stale `#anchor` under `docs/`, and CI now runs both
`check:reference` and `check:docs`. The `cairn-pass` step-5 ritual was hardened (the three doc gates, a
whole-`docs/` drift-grep on a removed or renamed symbol, an upgrade-guide entry for any behavior change, and
a release-notes convention); that edit is in `~/.dotfiles` (`091e33f`). See the
`docs-is-a-pass-dimension` memory.

**Pass 3 (URL-identity consolidation) LANDED on `main` 2026-06-05 as `0.29.0`, unpublished.** It ran
subagent-driven, one `cairn-implementer` per task on `main` directly (no worktree), Tasks 1 and 5 on Opus and
Tasks 2, 3, 4, 6 on Sonnet, plus a simplifier pass and a review fold-in. Six task commits `6554673..ababec2`,
a simplifier commit `8c57c52`, and a review fold-in `b9f025c`. `entryIdentity` (in the new
`src/lib/content/identity.ts`) is the one home for an entry's id, slug, date, and permalink, and
`createContentIndex` and `manifestEntryFromFile` both derive through it, with a `content-permalink-parity`
test pinning that they agree. `resolveConcepts(content, siteConfig)` is the one concept-resolution path
`composeRuntime` and `siteDescriptors` share. `normalizeConcepts` now validates the YAML URL policy at build
(root-relative permalink, known tokens only, a date token requires a dated concept, an in-range `datePrefix`,
and a declared concept key). No public surface changed, so `check:reference`/`check:package` stayed green with
no reference edit. The minor bumps `0.29.0`, no `Consumers must:` line (a valid config needs no action). Gate
green at the tip `b9f025c`, run first-hand: `npm run check` 790 files 0/0, `npm test` 117 files / 701 tests
exit 0, `check:reference` and `check:package` exit 0. The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-05-cairn-url-identity-consolidation.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-url-identity-consolidation-design.md`.

**The review gate caught one real regression, folded in as `b9f025c`.** Routing `createContentIndex` through
`entryIdentity` moved the throwing `permalink()` call before the `descriptor.validate` gate. For a dated
concept that declares `date` required and uses a date-token permalink (the shape both production sites use),
an entry missing its `date` previously degraded to a recorded `ContentProblem` and the build continued, but
the reorder made that one bad entry abort the whole index build. The fold-in restored the
validate-before-permalink ordering (id via the new `entryId` before the gate, the rest from `entryIdentity`
after it) with a regression test, and tightened the unknown-concept guard to treat a declared-but-undefined
content key as undeclared.

**Two pass-3 carry-forwards (recorded, not fixed).** (1) `siteDescriptors` resolves concepts from
`adapter.content` with no extension-content merge, while `composeRuntime` merges extensions first, so an
extension concept keyed in the YAML URL policy would throw in the delivery build under the new
unknown-concept guard while the admin runtime accepts it. The combination is unused today; fixing it means
deciding whether the delivery layer should see extension concepts at all. (2) The validator and the
`permalink()` resolver each restate the permalink token vocabulary, and the validator and `ids.ts` each
restate the date-prefix granularity set; the duplication is small and left separate by intent, derivable from
one source in a future touch.

The previous "engine-hardening before P4" framing is preserved below for history.

The documentation initiative is COMPLETE. The work now is the **engine-hardening series**, the three
release-gate improvements the docs initiative surfaced, sequenced **before P4** so the scaffolder templates
the clean surface. Geoff settled the scope and sequence: the three run as a just-in-time series,
**surface-narrowing first, then render attribute-sink hardening, then URL-identity consolidation**, with
the small engine-side DX riders handled separately (`mintToken` type widening as a trivial standalone, the
`App.Locals.editor` type deferred to P4). Bucket C (the scaffolder-bound install findings) stays in P4.

**Pass 1 (surface-narrowing) LANDED on `main` 2026-06-05.** It ran subagent-driven, one
`cairn-implementer` per task on `main` directly (no worktree, Geoff's call), Tasks 1 and 4 on Opus and
Tasks 2-3 on Sonnet. Four task commits `15035b5..04ce38b` plus a simplifier comment `8bbbf6a`. The root
barrel dropped 34 names (90 to 56 runtime exports): the delivery read surface, the GitHub signing and repo
plumbing, and three internal hast helpers (`isElement`, `strProp`, `markFirstList`). `/sveltekit` stopped
re-exporting the public route surface (the `PublicListData` alias is gone, its `ListData` is now the admin
type), and `GithubKeyEnv` relocated to `/sveltekit`. The two reference pages were pruned to match. The
minor bumps `0.27.0`. Gate green at the tip: `npm run check` 786 files 0/0, `npm test` 114 files / 661
tests exit 0, `check:reference` and `check:package` exit 0. Both production sites build green against the
`0.27.0` `npm pack` tarball (ecnordic and 907 each `check` 0/0 and `build` exit 0). The review gate was the
simplifier (one comment edit) plus a high-effort `/code-review` (no finding). The post-mortem is in the
plan (`docs/superpowers/plans/2026-06-05-cairn-surface-narrowing.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-surface-narrowing-design.md`.

**Three carry-forwards from pass 1.** (1) The import audit had one miss, now fixed in the site:
ecnordic-ski root-imported `isElement` and `markFirstList`, so the fix inlined local copies in the site
(both are pure hast helpers, so the barrel was not weakened), committed in ecnordic as `5183b3f`; 907-life
imported neither. (2) An open design question for pass 2 or P4: `isElement` is a general hast type guard in
the same category as the kept `iconSpan`/`cardShell`/`headRow`/`rehypeDispatch`, and the approved spec drew
it on the internal side, so `0.27.0` ships as designed; whether to add a small public component-authoring
render helper surface (a `/render` authoring subpath) is worth settling where that surface is next in
scope, not widened reflexively now. (3) Both sites carry a pre-existing `composeRuntime` break against their
own `^0.24.0` pin (the positional call predates the `0.24.0` object form), unrelated to this narrowing; a
site-migration pass must update both call sites before either site builds against `0.24.0` or later.

**Pass 2 (render attribute-sink hardening) LANDED on `main` 2026-06-05 as `0.28.0`, unpublished.** It ran
subagent-driven, one `cairn-implementer` per task on `main` directly (no worktree), Tasks 1 and 2 on Opus
and Task 3 on Sonnet, plus a simplifier pass and a review fold-in. Five commits: `dcd3c5a` (the
`rehypeSinkGuard` transform and its 14-case unit suite), `310a85c` (the guard wired last in
`createRenderer`, gated with the floor, three integration tests), `cde9e27` (the `0.28.0` bump, the
changelog, the sanitize-floor doc), `f176e9a` (simplifier: extracted `isSafeUrlProp`), and `701ddab`
(review fold-in). The guard walks the fully-built hast tree and neutralizes the sinks a component `build()`
can route a raw author attribute value into: it scheme-checks the URL-bearing properties (`href`, `src`,
`srcSet`, `xLinkHref`, `poster`, `formAction`, `action`, `data`, `background`), removes every inline `on*`
handler, and strips inline `style` wholesale. The safe-scheme set is derived from `defaultSchema.protocols`
plus `cairn`, so the floor and the guard cannot drift. It runs last, gated by the same `unsafeDisableSanitize`
switch as the floor, and is added to no public barrel. Gate green at the tip `701ddab`: `npm run check` 787
files 0/0, `npm test` 115 files / 684 tests exit 0, `check:reference` and `check:package` exit 0. The
render-pipeline snapshot stayed byte-identical across the pass. The post-mortem is in the plan
(`docs/superpowers/plans/2026-06-05-cairn-render-sink-hardening.md`); the design spec is
`docs/superpowers/specs/2026-06-05-cairn-render-sink-hardening-design.md`.

**The review gate caught one real bug, folded in as `701ddab`.** The `URL_PROPS` set first listed
`xlinkHref`, but `property-information` camelCases `xlink:href` to `xLinkHref` with a capital L, so the SVG
xlink entry was dead code that never matched a real tree, and an SVG anchor carrying a `javascript:`
`xlink:href` from a `build()` would have survived. The high-effort `/code-review` found it, the fold-in
corrected the casing, and the same review surfaced that the set covered `formAction` but not the form-level
`action` and missed `<object>`'s `data` and `background`, all URL sinks the existing scheme check handles, so
those three were added with regression tests. The fold-in confirmed empirically that `data-*` attributes
camelCase to `dataFoo`, so adding `data` catches only the genuine `<object data>` and leaves cairn's
`data-attr-*` dispatch routing untouched, pinned by a test.

**Two pass-2 carry-forwards (the guard's documented boundary).** (1) The guard scheme-checks URL attributes
and strips `on*` and inline `style`. It does not remove a `build()`-emitted raw `<script>`, `<style>`, or
`<iframe srcdoc>` element node, since a `build()` that emits those is running site-developer code and author
markdown is cleaned by the pre-dispatch floor; this is recorded in `docs/render-sanitize-floor.md`. A future
pass that wants parity with the floor for `build()`-emitted element nodes would strip such nodes wholesale,
a different mechanism from the scheme check. (2) The anchor `ping` beacon attribute is left out as a
lower-severity exfiltration sink rather than a script vector; revisit it if a site surfaces a need.

**Pass 3 (URL-identity consolidation) LANDED on `main` 2026-06-05 as `0.29.0`, unpublished.** See the
top entry "Immediate next action" for the landed result, the review fold-in, the carry-forwards, and the
gate evidence. The design spec is `docs/superpowers/specs/2026-06-05-cairn-url-identity-consolidation-design.md`
and the plan with its post-mortem is `docs/superpowers/plans/2026-06-05-cairn-url-identity-consolidation.md`.
This was the last of the three-pass engine-hardening series, so the series is now complete. Publishing stays
held; `main` carries the unpublished `0.27.0`, `0.28.0`, and `0.29.0` over the `0.26.0` `latest`, and the
window publishes together before any site or the scaffolder consumes the new surface.

The engine-adjacent showcase E2E regression the Phase 5 reproduction flagged is confirmed and FIXED
(`ba25359`): the golden-path E2E had drifted on two fronts (a Carta-era editor selector and the single-file
`fake-github` double), both now updated for CodeMirror and the atomic `commitFiles` path, both tests green.
The open follow-up is to wire that E2E into a gate so it stops rotting silently (ROADMAP Later). P4 framing
stays in the "Queued engine capstone" section below; it now follows the three hardening passes.

**The documentation initiative landed across six phases (2026-06-04 through 2026-06-05).** It built a
self-contained docs set for external adopters plus the project-legibility files, and it made
documentation a standing pass dimension. The design spec is
`docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`. The six phases: 1 legibility and
split, 2 reference, 3 explanation, 4 guides, 5 tutorial, 6 process and infra. It published nothing and
touched no engine code.

**Phase 6 (process and infra) landed 2026-06-05.** It baked the docs-as-a-pass-dimension rule into the
process surfaces, executed inline (cross-repo, process-doc editing, no test-first code). Four edits: the
`cairn-pass` pass-end ritual gained a Documentation step (new step 5, leaning on `npm run check:reference`
and `check:package` for the public-API-matches-reference rule, the rest renumbered to 9); `cairn-cms/CLAUDE.md`
gained a "Documentation is a pass dimension" section; `site-pass` gained a one-line docs-currency note; and
the `docs-is-a-pass-dimension` memory was updated to past tense. The initiative spec's friction-triage line
was reconciled to ROADMAP and STATUS (no backlog). The two skill edits committed in the dotfiles repo
(`~/.dotfiles`, `7b4194e` and `05031e7`); the in-repo edits committed in cairn-cms. The plan is
`docs/superpowers/plans/2026-06-04-cairn-docs-phase-6-process.md` (post-mortem appended there); the design
spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-6-process-design.md`. Gate: prose-guard clean on
all four authored files, the CLAUDE.md links resolve, the ritual reads 1 through 9.

**Phase 5 (Tutorial) landed on `main` 2026-06-04.** It built the learning-oriented arm: one page,
`docs/tutorial/build-your-first-cairn-site.md`, milestones 0 through 10, carrying a newcomer from an
empty directory to a working `Field Notes` site running locally and touching the full feature set
(adapter and schema, rendering, a custom `callout` component, the delivery surface, feeds, the nav
menu, the local admin loop through a fenced `CAIRN_DEV_BACKEND` dev backend, and the rot-proof
`cairn:` internal link). It ran subagent-driven, one `cairn-implementer` per task (Tasks 1-4 and 6 on
Opus, Tasks 5 and 7 on Sonnet), ten commits `b46bbeb..cd64cff` on `main`, with `docs/README.md`
flipped to the live tutorial. The plan is
`docs/superpowers/plans/2026-06-04-cairn-docs-phase-5-tutorial.md` (post-mortem appended there); the
design spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-5-tutorial-design.md`.

The docs gate ran per writing task and at phase end: no blocking prose tell on the page or the flipped
index, every relative link resolves, each worked example cross-checked against `examples/showcase`. The
capstone (Task 6) is the proof that matters: it followed the finished page literally in a throwaway
`/tmp/field-notes` on the published `@glw907/cairn-cms@0.26.0` (no `main` tarball fallback), and `npm run
cairn:manifest` plus `npm run build` exit 0, the home prerenders both post summaries, the packing-list
page renders the callout and the resolved internal link `/2026/05/01/first-trail`, `npm run check` is
0/0, and the admin loop drives headless (the editor and nav serve, a save commits through the dev
GitHub). The reproduction folded back real page defects as `1eef926` so a newcomer succeeds (`async`
`mintToken`, a dev-GitHub fixture grown to answer the atomic `commitFiles` Git Data API path, and the
project-setup pieces a registry consumer needs that the symlinked showcase hides). Two friction entries
landed: the missing first-class local admin dev mode and the reproduction note, both pointing at P4.

**Carry-forward (engine-adjacent, found by the Phase 5 reproduction), RESOLVED 2026-06-05 (`ba25359`).**
The showcase golden-path E2E (`examples/showcase/e2e/golden-path.spec.ts`) was confirmed broken against the
current engine on two fronts, both masked because Playwright E2E is not in `npm test`. The proximate failure
was a Carta-era editor selector (the editor swapped to CodeMirror at 0.9.0, which removes the SSR textarea).
Behind it, `fake-github.ts` answered only single-file `PUT /contents` while content saves now commit through
the atomic `commitFiles` Git Data API. The fix drives `.cm-content` in the E2E and grows the double to model
the atomic endpoints, recording the `.md` content entry. Both golden-path tests pass. Open follow-up: wire
the showcase E2E into a gate so it stops rotting silently (ROADMAP Later). Detail in the friction log.

Phase 6 (the process phase) then landed and closed the initiative; see the top entry. The canonical next
action is P4.

**The rolled version window is PUBLISHED.** `0.26.0` is now the registry `latest` (the `v0.26.0`
GitHub Release triggered the OIDC trusted-publishing workflow, run `26978850083` green), folding the
unpublished `0.25.0` (DX-A) and `0.26.0` (DX-B) over the prior `0.24.0`. Provenance was disabled in
the publish workflow for this release because the repo is now private and provenance attestation
requires a public repo; restore it when the repo goes public. P4 (the scaffolder) stays queued behind
the docs initiative.

**Phase 1 (legibility and split) landed on `main` 2026-06-04.** It rewrote the README as the adopter
hub, added `SECURITY.md` and `ROADMAP.md`, fixed the npm packaging metadata (ships `CHANGELOG.md`,
adds `homepage`/`bugs`), relocated the historical docs under `docs/internal/` with a banner, added the
`docs/README.md` index, and seeded `docs/internal/docs-friction-log.md`. Eight commits `3323eb8..` on
`main`. Post-mortem at the end of the Phase 1 plan
(`docs/superpowers/plans/2026-06-04-cairn-docs-phase-1-legibility.md`). One carry-forward: private
vulnerability reporting could not be enabled because the repo is private (the API 404s); `SECURITY.md`
describes the intended public-state channel, and the gap is logged in the friction log.

**Phase 2 (Reference) landed on `main` 2026-06-04.** It added an export-coverage gate plus seven
hand-curated reference pages, one per package export subpath, behind an automated check. Nine commits
`47092f8..03c1c3d` on `main`. The gate (`scripts/reference-coverage.mjs`) enumerates each subpath's
real exports from the built `.d.ts` through the TypeScript compiler API and fails when a page omits a
name; `npm run check:reference` builds `dist` first, then checks all seven subpaths. The pages live
under `docs/reference/`: `core.md` (the `.` root, 174 exports tiered Stable / Low-level / Types),
`sveltekit.md`, `components.md`, `delivery.md` (with `/delivery/head` folded in), `delivery-data.md`,
`vite.md`, and the `cli-cairn-manifest.md` bin page, plus a reference index that flips the docs-index
Reference line. Task 1 added the gate and its unit test and cleared the full engine gate (`npm run
check` 786 files 0/0, `npm test` 658 tests exit 0); the seven page tasks each cleared the docs gate
(coverage `OK`, no blocking prose tell, links resolve). The gate was verified fail-closed at the
phase end. Post-mortem at the end of the Phase 2 plan
(`docs/superpowers/plans/2026-06-04-cairn-docs-phase-2-reference.md`).

The pass surfaced three design-friction findings, all in `docs/internal/docs-friction-log.md` and all
pointing at one future surface-narrowing engine pass: the `.` root over-exports 174 names with
internal helpers leaked through `export *`; the `.` root re-exports the whole delivery builder set, so
those symbols document on two pages; and `/sveltekit` re-exports the public route-data types whose
home is `/delivery`, forcing a `PublicListData` alias off a `ListData` collision.

**Phase 3 (Explanation) landed on `main` 2026-06-04.** It built the understanding-oriented arm under
`docs/explanation/`: four pages plus an index, with the functional spec reconciled to point at the arm.
It ran subagent-driven, one `cairn-implementer` per page (Opus for the three synthesis pages, Sonnet
for the relocate and the wiring), five task commits `eab6c61..69ba190` on `main` directly. The plan is
`docs/superpowers/plans/2026-06-04-cairn-docs-phase-3-explanation.md` (post-mortem appended there); the
design spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-3-explanation-design.md`. The pages:
`data-tiers.md` (relocated from `docs/data-architecture.md`, `git mv` with history preserved, light
refresh, no drift found), `architecture.md` (the layered model and the commit/publish flow, two Mermaid
diagrams), `security-model.md` (auth, GitHub-App commit trust, render safety, origin and CSRF, with
`SECURITY.md` repointed to the new hub), `content-model.md` (fixed concepts, URL identity, schema as the
source of truth, the content graph, one Mermaid diagram), and `explanation/README.md` (the arm index,
flipping the `docs/README.md` Explanation line). Three Mermaid diagrams total across the arm, inside the
two-to-three budget.

The arm corrected the stale source docs against the current engine where it drew on them: CodeMirror not
Carta, the `render` adapter method not `renderPreview`, self-owned D1 magic-link not better-auth, fixed
concepts not `collections[]`. The render-sink honesty check confirmed the documented residual stays
site-developer-controlled (a component `build()` reaching a URL or style sink), not reachable by an author
through markdown alone, so no escalation; the existing friction entry stands. Phase 3 added one friction
entry (the URL-identity spread, corroborated firsthand while writing `content-model.md`).

The page gate ran per page and again at the phase end: `prose-guard` shows no blocking tell on any of the
seven authored files (advisory tells only: tricolon, low burstiness, anaphora, passive), every relative
link across the arm and the flipped `docs/README.md` and the repointed `SECURITY.md` resolves, and
`grep -rn data-architecture docs/README.md SECURITY.md` is clean (the old path is retired from the live
public docs; historical references under `docs/superpowers/` and dated `docs/STATUS.md` entries stay as
records). No `npm run check`, `npm test`, review subagent, or `/admin` smoke applied, because the arm
changes no engine code and adds no test.

The three release-gated engine improvements the brainstorm surfaced stand unchanged (see `ROADMAP.md`
"Engine hardening before the next release", the friction log, and the `cairn-engine-hardening-release-gate`
memory): narrow the public export surface, harden render attribute sinks, consolidate the URL-identity
model. They must land before the next `0.x` publish. The docs initiative publishes nothing, so it does not
trip the gate.

**Phase 4 (Guides) landed on `main` 2026-06-04.** It built the task-oriented arm under `docs/guides/`:
seven how-to guides plus an index, with the docs-index How-to-guides line flipped to point at the arm. It
ran subagent-driven, one `cairn-implementer` per task (Opus for the three full engine-surface guides,
Sonnet for the three lean guides, the relocate, and the index), eight task commits `f11b370..455b356` on
`main` directly. The plan is `docs/superpowers/plans/2026-06-04-cairn-docs-phase-4-guides.md`
(post-mortem appended there); the design spec is
`docs/superpowers/specs/2026-06-04-cairn-docs-phase-4-guides-design.md`.

The three-tier split held. The three lean setup guides (`set-up-the-github-app.md`,
`configure-auth-and-d1.md`, `deploy-to-cloudflare.md`) state goal, steps, and verify, then link the
authoritative ops docs (`github-app-key-rotation`, `admin-smoke-test`, `admin-route-structure`) and draw
their facts from the engine source and `CLAUDE.md`, because `examples/showcase` runs `adapter-node` and
cannot validate the Cloudflare/D1/GitHub-App loop. The three full guides (`define-an-adapter-and-schema.md`,
`configure-rendering.md`, `wire-the-delivery-surface.md`) carry a worked example copied from the real
showcase config, content, routes, and Vite plugin. `upgrade-cairn.md` relocated from `docs/upgrading.md`
with `git mv` (history preserved, no CHANGELOG drift, no content edit). The arm index groups the seven by
reading sequence (set up the backend, build the site, maintain).

The page gate ran per task and again at the phase end: `prose-guard` shows no blocking tell on any of the
eight authored files (advisory tells only: tricolon and anaphora on two of them), every relative link
across the arm and the flipped `docs/README.md` resolves, and `grep -n upgrading.md docs/README.md` is
clean (the old path is retired from the live public docs; historical references under `docs/superpowers/`
and dated `docs/STATUS.md` entries stay as records). No `npm run check`, `npm test`, review subagent, or
`/admin` smoke applied, because the arm changes no engine code and adds no test.

The arm surfaced one design-friction finding (in `docs/internal/docs-friction-log.md`): the adapter guide
asked for an adapter step setting the slug codec and `datePrefix`, but the real showcase adapter carries
neither, because the URL policy and `datePrefix` live in the YAML site config. The implementer wrote the
guide to the real showcase shape rather than invent adapter fields. This corroborates the URL-spread
finding already release-gated under the surface-narrowing pass; it extends no backlog. The three
release-gated engine improvements stand unchanged (`ROADMAP.md`, the friction log, the
`cairn-engine-hardening-release-gate` memory).

**Phase 5 (Tutorial) planning record (2026-06-04), executed; see the top entry for the landed result.** The
design spec is `docs/superpowers/specs/2026-06-04-cairn-docs-phase-5-tutorial-design.md` (`a0d5a27`); the
plan is `docs/superpowers/plans/2026-06-04-cairn-docs-phase-5-tutorial.md` (`5e34d5a`). Seven tasks build one page,
`docs/tutorial/build-your-first-cairn-site.md`, a teach-once Diátaxis tutorial that carries a newcomer from
an empty directory to a first working `Field Notes` site running locally. The forks settled with Geoff: the
spine is a minimal-slice local loop widened to touch the full feature set (custom components, the
link-picker search, feeds, the admin loop); the admin-only features run locally through a fenced, copy-paste
dev-backend fixture (a fake-GitHub double plus a fake-editor hook behind `CAIRN_DEV_BACKEND=1`, mirroring
the showcase's `SHOWCASE_FAKE_BACKEND` and handed to the deploy guides for the real App and D1); the start is
build-from-scratch with copy-paste blocks for the scaffolder-bound route boilerplate; and the capstone is a
build-and-run reproduction (Task 6 scaffolds the target site in a throwaway directory and runs a real build).
The missing first-class local admin dev mode is logged as friction for P4.

This plan executed as written on `main` (Tasks 1-4 and 6 on Opus, Tasks 5 and 7 on Sonnet, the docs-gate
override honored, Task 6 the one real `vite build`). The landed result, the verification evidence, and the
engine-adjacent carry-forward are in the top entry; the post-mortem is in the plan file.

## Sequence to the scaffolder (resequenced 2026-06-05): cleanup, then gallery, then P4 last

Geoff resequenced the run to the scaffolder on 2026-06-05: clear all the cleanup, then build the image
and gallery initiative, then the `create-cairn-site` scaffolder (P4) last. The driving rule is that P4
is the true capstone, so it must template a surface that is already hardened, DX-complete, and
image-aware. The scaffolder runs after the gallery so the template ships image support baked in, and
after the pre-scaffold DX is cleared so it does not bake a stale surface.

**The split that makes "all the DX before the scaffold" concrete.** Most of the ecnordic DX backlog
(`docs/internal/dx-backlog-ecnordic-migration.md`) is the scaffolder's OWN output, so those items land
in P4, not ahead of it: item 4 (do not emit `prerender.handleHttpError: 'warn'`, so a dangling link
fails the build), item 14 (the route stub registers all four admin actions by default), item 16 and the
backlog's "Scaffolder checklist" (emit the manifest wiring whole, one obvious import surface with a
component-free node path, teach the single sanitize floor, state the `cairn:` link constraint in the
scaffolded README), plus the tutorial-reproduction worklist (a fenced local dev backend, the
`App.Locals.editor` type augmentation, omit `static/robots.txt`, declare `@types/node`). These are done
BY P4.

**The pre-scaffold engine DX, to clear during cleanup so P4 templates the final shape:**
- P3 ergonomics carry-forwards the scaffolder seed and components use: a `strAttr(ctx, key)` context
  helper, a `registry.iconField(name)` hoist, a `defineRegistry` guard for `defaultIconByRole` without an
  icon attribute, a configurable `headRow` heading level, and multiple `type:'icon'` fields resolving to
  first-wins.
- DX-B engine carry-forwards: the manifest-bin `cwd` versus Vite `config.root` principled fix (separate
  the config-file location from the Vite root), and a plain-Node dist-spawn test that rot-proofs the
  `/delivery/data` node-safety guarantee.
- The `mintToken` async signature alignment in the docs and the showcase composer, a small fix.
- Item 5's engine half: the editor link picker offers only real content targets, so a `cairn:` token
  cannot be minted for a hand-built route (the doc half rides along).
- The open `/render` public component-authoring surface question (pass-1 carry-forward): decide it before
  the scaffolder templates component authoring, since the answer changes what the template imports.
- Infra: wire the showcase golden-path E2E into a gate (ROADMAP Later) so a surface-growing change cannot
  rot it silently; best done before the surface grows under the gallery and P4.

**The cleanup phase, in order:** execute pass 3 (URL-identity consolidation, the immediate next action
above), publish the held window (`0.27.0` + `0.28.0` + `0.29.0` over the `0.26.0` `latest`), then the
DX-completeness sweep. The sweep is decomposed (2026-06-05) into three passes by verification surface, run
A then B then C: **Pass A (render authoring)**, **Pass B (tooling and CI robustness)**, **Pass C (admin and
consumer alignments)**. Then the gallery initiative (a `superpowers:brainstorming` first for the
git-versus-R2 storage fork). Then P4, authored just-in-time once the surface it templates is final.

**DX-sweep Pass A is EXECUTED (landed 2026-06-06 as `0.30.0`, unpublished); see the top entry for the
landed result, the review fold-in, and the carry-forwards.** The design spec
is `docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md`; the plan is
`docs/superpowers/plans/2026-06-05-cairn-render-authoring-surface.md`. It carves a public
`@glw907/cairn-cms/render` authoring subpath (relocating `iconSpan`/`cardShell`/`headRow`, re-homing
`isElement`, adding `strAttr`, with a reference page), lands the P3 render ergonomics (`strAttr`, a
configurable `headRow` level, a `registry.iconField` hoist, a `defineRegistry` icon guard, first-wins icon
resolution), and drops `rehypeDispatch` from the public surface (reasoning recorded in the spec:
`createRenderer` is the one public render pipeline). Seven tasks, a breaking minor (`0.30.0`), with a
`Consumers must:` line. The keystone fork (carve `/render` over keeping authoring helpers on root) was
settled against cairn's own coupling-boundary splits and the ecosystem norm. Passes B and C are scoped in
the "Sequence to the scaffolder" split above and get their own specs when their turn comes. Pass A executes
only after pass 3 ships and the window publishes, so its version step bumps the next minor above the
published baseline.

The workspace-flatten infra task is DONE (executed inline 2026-06-04, post-mortem in
`docs/superpowers/plans/2026-06-04-workspace-flatten-and-claude-infra.md`). cairn-cms is a standalone
repo at `~/Projects/cairn-cms`, both sites resolve the published package from the registry, and the
per-project memory moved to the new working-directory keys.

## Absorbed into the docs initiative: docs-refresh items (documented 2026-06-04)

A docs-accuracy sweep during the workspace flatten found cairn-cms documentation that predates later
engine passes. The two consumer sites and the durable front-door docs (README, CLAUDE.md) were fixed in
that pass. The items below are now scheduled within the documentation initiative's later phases
(reference, explanation, guides, tutorial) rather than a separate pass.

- **Functional spec** (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`): accurate on
  auth and the fixed-concepts model, but it predates the `0.9.0` editor swap, so it describes a Carta
  editor throughout (lines 30, 51, 57, 89, 101, 144, 196, 267, 310, 338) when the `MarkdownEditor` seam
  is now CodeMirror 6, and it names the old `renderPreview` adapter method (lines 168, 268, 374) that the
  public-delivery pass renamed to `render`. Planned action: a targeted update of the Carta-to-CodeMirror
  references and `renderPreview`-to-`render`, plus a dated note that the editor swapped at `0.9.0`. Keep
  the rest as the locked design record.
- **`docs/creating-a-cairn-site.md`** (537 lines): broadly pre-rebuild (better-auth, a generic
  `collections[]` array, `renderPreview`, `AUTH_SECRET`, a pointer to the superseded ARCHITECTURE.md
  section 4). Decision (Geoff): MARK SUPERSEDED. Add a header pointing at the functional spec,
  `examples/showcase`, and the forthcoming P4 create-cairn-site scaffolder, and leave the body as history
  rather than rewriting a doc the scaffolder will replace.
- **`cairn-implementer` agent** (`~/.dotfiles/claude/.claude/agents/cairn-implementer.md`): the body
  still carries a `carta-md` client-only note (now CodeMirror) and a `rebuild`-branch assumption (the
  branch merged; later work runs on feature worktrees off `main`). Refresh both in the dotfiles checkout.
- `docs/PLAN.md` and `docs/ARCHITECTURE.md` stay as labeled history (CLAUDE.md and README mark them so);
  no rewrite intended.

## Where the work is (2026-06-04, DX-B manifest Vite plugin executed; 0.26.0 unpublished)

**DX-B is executed and review-gated, landed on local `main`.** It ran subagent-driven, one
`cairn-implementer` per task (Opus for the Task 1 spike, the Task 4 package entry, the Task 5 bin, and the
Task 6 showcase finalize; Sonnet for the barrel split, the diff, and the version bump), on a feature
worktree off `main` (`dx-b-manifest-plugin`). Seven task commits `26fee41..bb4823b`, a review fold-in
`fce30ab`, and the post-mortem `8403981`, fast-forward merged to `main` at `8403981`, worktree removed.
**Local only, not pushed, not published.** The minor bumps to `0.26.0`.

The pass replaces the per-consumer manifest boilerplate with a `cairnManifest()` Vite plugin from a new
`@glw907/cairn-cms/vite` entry. The plugin owns a `virtual:cairn-manifest` module that runs
`import.meta.glob` over the configured content globs inside the app's own Vite graph, builds the manifest,
and verifies it against the committed file in `buildStart` through a nested Vite SSR load, so a drift fails
the build as a hard error outside the prerender lifecycle (ecnordic #4 closed by construction, even under
`handleHttpError: 'warn'`). A shipped `cairn-manifest` bin evaluates the same virtual module in write mode
to regenerate (907 #2). A node-safe `@glw907/cairn-cms/delivery/data` barrel re-exports the pure
projections with no `@sveltejs/kit` in the graph, so the plugin and the bin import the builder from plain
Node (907 #3). `verifyManifest` now names the added, removed, and changed entries through a pure
`diffManifests` (907 #7). The in-graph virtual module is the one shared resolver the build and the
regenerate both use (ecnordic #13). The showcase drops `scripts/build-manifest.mjs`, wires the plugin, and
removes its in-`content.ts` verify.

Gate at the fold-in tip `fce30ab`, run first-hand: `npm run check` 781 files 0/0, `npm test` 113 files /
655 tests exit 0, `npm run check:package` all entries green including the new `./vite` and `./delivery/data`
subpaths. The headline end-to-end proof is the showcase production build with `handleHttpError: 'warn'` set:
clean build exit 0, a deliberately stale manifest fails the build exit 1 in `buildStart` at `0 modules
transformed` with the structured diff printed, and a regenerate goes green. The Task 1 spike proved the
nested-SSR verify mechanism against the real showcase toolchain before the public surface was built. The
review gate was the simplifier (no change) plus a high-effort three-angle `/code-review` (no critical bug;
node-safety verified empirically by importing the built `dist/delivery/data.js` from plain Node). Two
confirmed findings folded in as `fce30ab`: the diff now canonicalizes the built side so a links reorder no
longer reports a false `links` drift, and the recursion-avoidance plugin strip is now recursive so a nested
`cairnManifest()` cannot survive into the nested verify server. The Worker, auth, Svelte, and a11y reviewers
and the live `/admin` smoke did not apply. The full post-mortem is in
`docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md`.

**Migration gotchas this pass lands** (all in the `0.26.0` changelog with `Consumers must:` lines). A
consumer adds `cairnManifest({ configModule, content, manifestPath })` to its Vite config, switches the
regenerate script to `"cairn:manifest": "cairn-manifest"` and deletes the hand-written
`scripts/build-manifest.mjs`, and moves any plain-Node import of a delivery data helper (such as
`buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

**Carry-forwards (for P4 or a later touch).** The `cairn-manifest` bin resolves its paths against
`process.cwd()` while the plugin verifies against the resolved Vite `config.root`; they agree for every
SvelteKit consumer run from its project root, and diverge only under a custom Vite `root` (the principled
fix separates the config-file location from the Vite root, deferred). The node-safety guarantee is proven
empirically this pass, so a plain-Node dist-spawn test would rot-proof it. A first build before
`cairn:manifest` has ever run (a freshly scaffolded site with no manifest file) fails with a cryptic Vite
resolve error rather than a "run cairn:manifest" message, which P4 should address since it emits the wiring.
The DX-A showcase-install carry-forward (pin or dedupe the SvelteKit toolchain against the linked package)
now also covers a symlink-dev artifact this pass surfaced: the showcase `npm run check` reports about 24
type errors in a dev worktree, all in `node_modules` or the `vite.config.ts` plugin-type line and none in
showcase `src/`, because the worktree-root install carries a second physical SvelteKit toolchain that
`svelte-check` reaches through the package symlink. The proven `main` checkout has no root vite, so its
showcase check is clean, and a published consumer is unaffected. The acceptance proof for the showcase
tasks is the production build, which is green.

**Immediate next action: brainstorm and write P4, the `create-cairn-site` scaffolder, in a fresh session.**
P4 is the capstone of the DX sequence, authored just-in-time now that DX-A and DX-B have corrected the
engine surface. Run `superpowers:brainstorming` first to settle the scaffolder's open design decisions with
the user (the template contract, the two reference templates, what defaults and docs it emits), since the
spec leaves the scaffolder open; do not auto-write the plan without the user's design calls. P4 consumes the
DX-B plugin and emits the `cairnManifest()` wiring plus the `cairn:manifest` script, and it carries the
remaining ecnordic items (5, 6, 14), the DX-A showcase-install carry-forward, and the DX-B carry-forwards
above. Publishing stays held: `0.24.0` is the registry `latest`, and `main` carries the unpublished `0.25.0`
(DX-A) and `0.26.0` (DX-B); publish the rolled window before any site or the scaffolder consumes
`@glw907/cairn-cms/vite`, `@glw907/cairn-cms/delivery/data`, or the `cairn-manifest` bin.

## Where the work is (2026-06-04, DX-A engine-surface ergonomics executed; 0.25.0 unpublished)

**DX-A is executed and review-gated, landed on local `main`.** It ran subagent-driven, one
`cairn-implementer` per task (Sonnet throughout, the tasks were mechanical), on a feature worktree off
`main` (`dx-a-ergonomics`). Six task commits `38499ef..e867ab5` plus a review-gate fold-in `3cb5860`,
fast-forward merged to `main` at `3cb5860`, worktree removed. **Local only, not pushed, not published.**
The minor bumps to `0.25.0`.

The pass closes five small 907-migration findings. `createRenderer()` now defaults its registry to the
empty registry, so a plain-prose blog calls it with no argument (907 #1). `composeRuntime` takes one
`ComposeInput` object, `composeRuntime({ adapter, siteConfig, extensions? })`, and derives the per-concept
URL policy from `siteConfig` through the same `urlPolicyFrom` call the delivery path uses, so the runtime
and delivery permalinks cannot diverge and a missing `siteConfig` throws (907 #6); the showcase wires the
single shared `siteConfig` at every call, the pattern the scaffolder will emit. The `freetags` two-layer
invariant is pinned with regression tests and named in the type and validator comments, no behavior change
(907 #4). `docs/render-sanitize-floor.md` documents what the floor keeps, strips, and rewrites (907 #8).
`docs/upgrading.md` plus a "Consumers must:" `CHANGELOG.md` convention collect the `0.x` renames with a
consumer action each (907 #5).

Gate at the merge tip `3cb5860`, run first-hand: `npm run check` 775 files 0/0, `npm test` 110 files /
643 tests exit 0; the showcase carries its own gate (Task 3), `check` 405 files 0 errors and a production
build exit 0. The review gate was the simplifier (no change, the compose rewrite mirrors the delivery path
by construction) plus a high-effort Opus `/code-review` that returned SHIP with no Critical and no
Important; two minor accuracy nits folded in as `3cb5860` (the sanitize-floor doc scopes the `data:` strip
to `href` since an image `src` still admits a `data:` URI under `defaultSchema`, and the validator comment
names `freetags` alongside `tags`). The Svelte, a11y, Worker, and auth reviewers and the live `/admin`
smoke did not apply. The full post-mortem is in the plan file
`docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md`.

**One carry-forward for the scaffolder (from Task 3).** A naive `npm install` inside `examples/showcase`
pulls a newer `@sveltejs/kit`/`vite` than the linked root pins, and `svelte-check` then reports
duplicate-identifier errors inside `node_modules` (two physical kit/vite copies), none in showcase `src/`.
The scaffolder or a showcase install doc should pin or dedupe the SvelteKit toolchain against the linked
package so the gate stays reproducible.

**The `cairn-pass` ritual gained the "Consumers must:" step.** The pass-end consolidation now enforces a
"Consumers must:" line on any breaking change in `CHANGELOG.md`. That skill file lives outside this repo,
so it was edited at pass-end (the DX-A handoff item), not committed here.

**DX-B is brainstormed, specced, and planned on `main` (2026-06-04), not yet executed.** The design spec is
`docs/superpowers/specs/2026-06-04-cairn-dx-b-manifest-plugin-design.md` (`9690537`), sharpening the DX-B
section of the combined hardening spec; the plan is
`docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md` (`44e1990`). Seven tasks, bumps `0.26.0`.
Four forks settled in the brainstorm: the build-time verify reads the corpus through a plugin-owned
**in-graph virtual module** (uses the build's exact `import.meta.glob` resolution, closing ecnordic #13 by
construction, at the cost that regenerate must also run in a Vite context); the node-safe entry is the
**`@glw907/cairn-cms/delivery/data` barrel** (chosen on architecture merit over a narrow `/manifest` entry,
since it isolates the kit coupling generally, matches the P1 `/delivery/head` split run deeper, and removes
the dual-barrel drift); a pure **`diffManifests`** names what drifted (907 #7); and regenerate is a shipped
**`cairn-manifest` bin** (907 #2). Task 1 is a toolchain spike that proves the Vite evaluation mechanism (the
verify as a build error outside prerender, and the bin's write evaluation) against a real SvelteKit build
before the rest leans on it, the Plan-07 locked-build-assumption lesson applied first.

**Immediate next action: execute DX-B,
`docs/superpowers/plans/2026-06-04-cairn-dx-b-manifest-plugin.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task), on a feature worktree off
`main`. Start at Task 1.** Dispatch Task 1 (the spike), Task 5 (the bin), and Task 6 (showcase finalize)
`model: opus` (judgment-heavy); the rest fit the Sonnet default. The design is settled and approved, so skip
brainstorming. The pass-end review gate is the simplifier plus a high-effort `/code-review` (attention to the
Vite mechanism and the node-safety guarantee); `cloudflare-workers-reviewer` and `web-auth-security-reviewer`
do not apply, `svelte-reviewer` only if a `.svelte` file changes, and the live `/admin` smoke does not apply
(no auth, Worker, or admin-UI surface change). After DX-B lands, P4 (the `create-cairn-site` scaffolder) is
the capstone, carrying the remaining ecnordic items (5, 6, 14) and the DX-A showcase-install carry-forward
above. Publishing stays held: `0.24.0` is the registry `latest`, and `main` carries the unpublished `0.25.0`
(DX-A) and will carry `0.26.0` (DX-B) until the window publishes together before a site consumes the new
entries.

## Where the work is (2026-06-04, 907 migration landed; DX-A spec + plan written, not executed)

**The 907-life migration shipped** (907 Pass 16, 2026-06-04) on `^0.24.0` with `datePrefix: 'day'`, the
second proving ground on the corrected surface. It produced a DX feedback doc at the workspace root,
`cairn-dx-feedback-2026-06-04.md`, eight findings from the `0.6` to `0.24` jump.

**The 907 feedback is triaged into two engine passes before the scaffolder.** Most of it sharpens the
existing ecnordic backlog; three items are new to the engine surface. The design spec covering both
passes is `docs/superpowers/specs/2026-06-04-cairn-dx-907-hardening-design.md` (`7c44eae`). Two locked
forks settled with the user: the manifest toolchain is rebuilt as a Vite plugin (verify-on-build, fail
the build red with a real diff, one resolver shared with the build), and the work splits into two passes
rather than one.

- **DX-A (engine-surface ergonomics and docs)** is the immediate next action. The plan is
  `docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md` (`ee4a124`), six tasks closing 907 #1
  (`createRenderer` defaults to the empty registry), #6 (`composeRuntime` takes one object input and
  derives the URL policy from the site config, the loose third argument gone, a missing config throws),
  #4 (the `freetags` two-layer invariant pinned and documented, no behavior change), #8 (a sanitize-floor
  reference doc), and #5 (a "Consumers must:" changelog convention plus `docs/upgrading.md`). It bumps
  `0.25.0`. The `composeRuntime` object form breaks every caller; Task 2 updates the engine and the
  compose tests, Task 3 the showcase. The root `npm run check` does not cover the showcase, so Task 3
  carries its own check and build.
- **DX-B (the manifest Vite plugin)** is scoped in the spec and its detailed plan is authored
  just-in-time after DX-A lands, because the plugin design sharpens once the node-safe subpath (907 #3)
  is real. It folds 907 #2/#3/#7 and ecnordic #13/#4.
- **P4 (the scaffolder)** stays the capstone after DX-B, carrying the remaining ecnordic items (5, 6, 14).

**Immediate next action: execute DX-A, `docs/superpowers/plans/2026-06-04-cairn-dx-a-ergonomics.md`,
`subagent-driven` (`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet
default; the tasks are mechanical, no Opus dispatch needed), on a feature worktree off `main`. Start at
Task 1.** The design is settled and approved, so skip brainstorming. The pass-end review gate is the
simplifier plus a `/code-review`; `svelte-reviewer`, `daisyui-a11y-reviewer`, the Worker/auth reviewers,
and the live `/admin` smoke do not apply (no auth, Worker, or admin-UI surface changes; the showcase
admin routes change only their `composeRuntime` call shape). One handoff item lands with this pass: the
`cairn-pass` pass-end ritual gains a step enforcing the "Consumers must:" changelog line on any breaking
change, a skill edit outside this repo, applied at pass-end. After DX-A lands, draft and execute DX-B.

## Where the work is (2026-06-03, DX pass P3 / render and component authoring executed; 0.24.0 unpublished)

**P3, the render and component-authoring touch-ups, is executed and review-gated on `main`.** It ran
subagent-driven, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for Task 2's
byte-identical snapshot migration and Task 6's showcase build gate), seven task commits
`4a9cf55..7afb031` plus a review-gate fold-in `c6ecdbc`. **Local only, not pushed, not published.** The
minor bumps to `0.24.0`.

The pass closes five render and component-authoring findings from the ecnordic DX backlog (items 7, 8,
9, 11, 15). The unifying correction (item 9) routes a component's resolved icon through the declared
`type: 'icon'` attribute: the stamper reads the author value, falls back to `defaultIconByRole`, and
folds the result into that field's `data-attr-<key>`, so a role default now reaches the build through
the one declared path. The dead `dataIcon` marker is gone (dropped from the stamp, `FIXED_MARKERS`, and
the doc comment; `grep -rn "dataIcon" src/` is empty). The new `headRow(title, icon?)` helper builds the
icon-plus-heading head and is exported beside `cardShell`/`iconSpan`. `createRenderer` gained an
`anchorRel` option (`string | false`) over the `target="_blank"` rel policy (default `noopener
noreferrer`). The engine drops an unclaimed directive `[label]` on a title-less component. The site
guide states the declared-attribute contract, the icon-attribute requirement, `headRow`, `anchorRel`,
and the no-`[]` template rule. The showcase wires an `alert` proving items 7 and 9 through a real build.

Gate at the fold-in tip (`c6ecdbc`), run first-hand: `npm run check` 779 files 0/0, `npm test`
110 files / 638 tests exit 0, `npm run check:package` exit 0. The render-pipeline snapshot stayed
byte-identical across the pass (no `-u`). The showcase production build exits 0, the home still lists
its post summaries, and the hello post carries `class="ec-head"` and the `caution` role-default
`leaf` glyph (`class="ec-icon"`). The review gate was the simplifier (no change) plus a high-effort
seven-angle `/code-review`, which found one actionable defect, folded in as `c6ecdbc`: a blank
`icon=""` was kept and defeated the resolved role default (`?? icon` preserved the empty string), while
a missing `icon` resolved it. The fix writes the already-resolved `icon` directly, so blank and missing
behave alike, and it collapsed the icon double-read the simplification angle flagged. A regression test
locks it. The Svelte, a11y, Worker, and auth reviewers and the live `/admin` smoke did not apply. The
full post-mortem with the review triage and the carried follow-ups is in
`docs/superpowers/plans/2026-06-03-cairn-render-authoring.md`.

**The rolled window is PUBLISHED.** `main` is pushed (`d9bf1b6..7e9d49f`) and the
`0.22.0`/`0.23.0`/`0.24.0` window published together as `0.24.0`, now `latest` on npm (OIDC
trusted-publishing workflow off the `v0.24.0` GitHub Release, run `26916856627` green, build provenance
attached), rolling over the prior `0.21.0`. P1 (delivery read-model), P2 (schema validation), and P3
(render and component authoring) are all live.

**Immediate next action: the 907-life migration.** Run it as a `site-pass` in the 907-life repo, pinning
`^0.24.0`, with `datePrefix: 'day'`. It is the second proving ground on the corrected surface (the first
was the ecnordic `0.21` migration that produced this DX backlog). After 907 lands, draft and execute
**P4, the `create-cairn-site` scaffolder** (the capstone, DX items 4, 5, 6, 13, 14, 16), authored
just-in-time once 907 has exercised the corrected surface. There is no new cairn-cms engine plan to draft
right now: the 907 migration is a site pass authored in the 907 repo, not a cairn-cms plan. The migration
gotchas in the entries below still apply (pass every declared concept's glob, declare every read
frontmatter key, the P2 strict-date and closed-tags failures, resolve `cairn:` links wherever a body
renders to HTML).

The carried P3 follow-ups (a `strAttr(ctx, key)` context helper, a `registry.iconField(name)` hoist, a
`defineRegistry` guard for `defaultIconByRole` without an icon attribute, a configurable `headRow` heading
level) feed P4 and later DX touches.

## Where the work is (2026-06-03, DX pass P2 / schema validation executed; 0.23.0 unpublished)

**P2, the schema-validation touch-ups, is executed and review-gated on `main`.** It ran
subagent-driven, one `cairn-implementer` per task (Sonnet throughout, the tasks were mechanical),
seven task commits `a3015a0..2160c42` plus a simplifier commit `4add8d7`. **Local only, not pushed,
not published.** The minor bumps to `0.23.0`.

The pass restores the four validations the schema cutover dropped and tightens two declaration-time
contracts. A `date` field now validates a real `YYYY-MM-DD` calendar date through the new pure
`isCalendarDate` helper in `frontmatter.ts`, rejecting an impossible date such as `2026-02-30`, an
unpadded value, or a value carrying a time, while still coercing a parsed YAML `Date`. A `tags` field
enforces its declared `options` as a closed vocabulary (`freetags` stays open). `normalizeConcepts`
throws at config load on a `summaryFields` key that names no declared field. `AttributeField.options`
widened to `readonly string[]`, so a site can share one frozen `as const` vocabulary with no call-site
change. At-least-one-tag was already covered by `required: true` and needed no code.

Gate at the simplifier tip (`4add8d7`), run first-hand: `npm run check` 779 files 0/0, `npm test`
110 files / 631 tests exit 0, `npm run check:package` exit 0. The package and showcase builds exit 0
and the prerendered home still renders all three posts, proving the stricter checks dropped no
showcase entry. The review gate was the simplifier (one consistency fix folding the `summaryFields`
guard onto the same `.find()` shape as the tags check) plus a high-effort four-angle `/code-review`,
which surfaced no actionable defect within cairn's content domain. The Svelte, Worker, auth, and a11y
reviewers and the live `/admin` smoke did not apply. The full post-mortem with the review triage and
the carried follow-ups is in `docs/superpowers/plans/2026-06-03-cairn-schema-validation.md`.

**Two migration gotchas land with this pass** (both intended, documented in the `0.23.0` changelog).
A migrating site whose committed content holds a non-canonical string `date` (an ISO datetime, an
unpadded value) will see that entry fail validation on its next `/admin` save; the save path
canonicalizes a `Date` instance, so the exposure is a hand-edited or migrated string date. A post
carrying a `tags` value the site has since removed or renamed from its `options` fails the same way.
Both are the loud failure P2 restores. One recorded known limitation: `isCalendarDate` rejects years
0000 through 0099 because of JavaScript's two-digit-year `Date` coercion, outside the cairn date
domain and left unfixed by design.

**P3 is brainstormed, specified, and planned on `main` (2026-06-03), not yet executed.** The design
spec is `docs/superpowers/specs/2026-06-03-cairn-render-authoring-design.md` (`abdb6ef`); the plan is
`docs/superpowers/plans/2026-06-03-cairn-render-authoring.md` (`a9a627c`). Seven test-first tasks
covering DX items 7, 8, 9, 11, 15: the `headRow` head helper (item 7), routing the `defaultIconByRole`
default through the declared `type: 'icon'` attribute and dropping the dead `dataIcon` marker (item 9,
the unifying correction), the `anchorRel` `createRenderer` option (item 11), dropping an unclaimed
directive label (item 15), and the declared-attribute contract in docs (item 8, docs-only). The pass
bumps `0.24.0`, runs on `main`, and is additive plus two output bugfixes. One design call settled with
the user: item 8 is resolved by documentation, not a runtime dev warning (the item-9 fix removes the
concrete footgun, and a build is site-developer code with immediate feedback). Tasks 2 and 6 are
judgment-heavy (the byte-identical snapshot-fixture migration; the showcase build gate), so dispatch
them `model: opus`; the rest fit the Sonnet default.

**Immediate next action: execute P3,
`docs/superpowers/plans/2026-06-03-cairn-render-authoring.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task; Sonnet default, `model: opus`
for Tasks 2 and 6), from the cairn-cms directory on `main`. Start at Task 1.** The design is settled and
approved, so skip brainstorming. It runs on `main` directly (no site deploys). The pass-end review gate
is the simplifier plus a high-effort `/code-review` (attention to the icon-resolution edge cases and the
snapshot migration); `svelte-reviewer`, `daisyui-a11y-reviewer`, the Worker/auth reviewers, and the live
`/admin` smoke do not apply. After P3 lands, **publish** the rolled `0.22.0`/`0.23.0`/`0.24.0` window
together, then run the **907-life migration** (the second proving ground, `site-pass` in that repo,
`datePrefix: 'day'`), then **P4, the `create-cairn-site` scaffolder** (the capstone).

**Publishing stays held.** `0.21.0` is the registry `latest`. `main` carries the unpublished `0.22.0`
(P1) and `0.23.0` (P2), and will carry the P3 bump, until the window publishes together before the
907 migration. A site pins a range only after the publish.

## Where the work is (2026-06-03, DX pass P1 / delivery read-model executed; 0.22.0 unpublished)

The DX backlog triaged into the P1 through P4 engine-pass sequence (the entry below has the full triage and
the P2 through P4 scope). **P1, the delivery read-model touch-ups, is now executed and review-gated on
`main`.** It ran subagent-driven, one `cairn-implementer` per task (Sonnet throughout, the tasks were
mechanical), nine task commits `4ff9f56..c85c9d9` plus a simplifier commit `b2a1b19` and a review fold-in
`36d92a7`. **Local only, not pushed, not published.** The minor bumps to `0.22.0` (additive read-model
surface plus one breaking import move).

The pass delivers DX items 1, 2, 3: `ContentSummary.concept` and `EntryData.concept` (the read model carries
its resolved concept id, so a list or page branches per concept without sniffing `entry.date`); the
`summaryFields` descriptor knob feeding `ContentSummary.fields` (a list card reads an authored frontmatter
key with no per-entry detail read); the package root re-exporting the delivery route loaders and response
helpers; and `CairnHead` moved to its own `@glw907/cairn-cms/delivery/head` entry so the `/delivery` data
barrel loads in node with no Svelte plugin (the one breaking import move). The showcase wires the whole
surface end to end (a prerendered home listing summaries from `summary.fields` and `data.concept`).

Gate at the tip: `npm run check` 779 files 0/0, `npm test` 110 files / 616 tests exit 0, `npm run
check:package` all entries green including the new `./delivery/head` subpath. End-to-end, the showcase
production build exits 0 and the prerendered home carries `class="summary"` and `data-concept="posts"`. The
review gate (simplifier, `svelte-reviewer` Opus, a high-effort four-angle `/code-review`) found no Critical,
no Important, and no confirmed correctness bug; the one convergent finding (a `fields` doc comment overselling
"Namespaced") folded in as `36d92a7`. The full post-mortem with the four carried follow-ups (the
`makeDescriptor` test factory, the per-entry empty-`{}` allocation, the dual-barrel export-list drift, and
`summaryFields` failing open on an undeclared key) is in
`docs/superpowers/plans/2026-06-03-cairn-delivery-readmodel.md`.

**Immediate next action: execute P2,
`docs/superpowers/plans/2026-06-03-cairn-schema-validation.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default; the tasks are
mechanical and well-specified, so Opus is not needed), from the cairn-cms directory on `main`. Start at
Task 1.** The design is settled and approved (spec
`docs/superpowers/specs/2026-06-03-cairn-schema-validation-design.md`), so skip brainstorming. P2 covers DX
items 10 and 12 plus the folded-in P1 `summaryFields` follow-up. The three design calls are locked: date
validation is strict by default (a real `YYYY-MM-DD` calendar date, no flag, no custom `pattern`); closed
`tags` membership is enforced by default (no `enforced` flag, since `freetags` is the open escape hatch);
and no tag count bounds (at-least-one is `required: true`, already working). Seven test-first tasks: the
`isCalendarDate` helper, the date check and the tags membership check in `validateFields`, the
`summaryFields` declaration guard in `normalizeConcepts`, the `readonly` widening of `AttributeField.options`,
the docs, and the `0.23.0` bump. It runs on `main` directly (no site deploys). The pass-end review gate is
the simplifier plus a high-effort `/code-review` (attention to the `isCalendarDate` round-trip and the tags
edge cases); `svelte-reviewer` runs only if a form component changes, and the Worker/auth/a11y reviewers and
the live `/admin` smoke do not apply. After P2, brainstorm and write P3 (render and component authoring),
then publish the rolled `0.22.0`/`0.23.0`/P3 window, then the 907-life migration, then P4 (the scaffolder).

**Publishing is held** (consistent with the held window the entry below describes): `0.21.0` is the registry
`latest`, and `main` will carry `0.22.0` (P1) plus the later P2/P3 bumps until the window publishes together
before the 907 migration. A site pins a range only after the publish.

## Where the work is (2026-06-03, DX backlog triaged into engine passes; P1 spec and plan written)

The content-graph initiative is COMPLETE and `0.21.0` is the registry `latest` (see the entry below). This
session triaged the DX backlog from the ecnordic `0.21` migration
(`docs/dx-backlog-ecnordic-migration.md`, 16 findings) into a sequenced set of engine passes, with the
`create-cairn-site` scaffolder as the organizing goal:

- **P1, delivery read-model** (DX items 1, 2, 3): the `concept` stamp on `ContentSummary`/`EntryData`, the
  `summaryFields` knob, the root superset and the `CairnHead` `/delivery/head` split. Spec and plan written
  this session.
- **P2, schema validation** (items 10, 12): declarative serializable field options to restore the four
  validations the cutover dropped; `readonly` options.
- **P3, render and component authoring** (items 7, 8, 9, 11, 15): the `splitHead` replacement head helper
  (moved here from P1 during design, since it lives beside `cardShell`/`iconSpan`), the `rel` policy option,
  the alert role default, the empty-slot drop, the declared-attribute read signal.
- Then **publish** the rolled window, then the **907-life migration** as the second proving ground on the
  corrected surface (user's call: P1 through P3 first, then 907, then the scaffolder).
- **P4, create-cairn-site scaffolder** (items 4, 5, 6, 13, 14, 16): the capstone, emitting the corrected
  defaults and the canonical setup and migration docs.

P1 is specified and planned. The spec is
`docs/superpowers/specs/2026-06-02-cairn-delivery-readmodel-design.md`; the plan is
`docs/superpowers/plans/2026-06-03-cairn-delivery-readmodel.md` (nine test-first tasks, additive surface
plus one breaking import path, bumps `0.22.0`). Two design calls made and recorded: `CairnHead` stays off
the root barrel so root stays node-importable for the unit suite (it resolves from `/delivery/head`), and
`ConceptDescriptor.summaryFields` is non-optional (matching `datePrefix`/`permalink`), so Task 3 adds the
field to all 13 hand-built descriptor literals in the unit tests (churn accepted under aggressive
development; the recurring-literal smell is logged as a test-factory follow-up in the plan).

**Immediate next action: execute P1,
`docs/superpowers/plans/2026-06-03-cairn-delivery-readmodel.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default; Opus is not
needed, the tasks are mechanical and well-specified), from the cairn-cms directory on `main`. Start at
Task 1.** The design is settled (skip brainstorming). It runs on `main` directly (additive, no site
deploys) and bumps `0.22.0`. The pass-end review gate is the simplifier plus `svelte-reviewer` (the
`EntryData` change and the showcase `+page.svelte`) and a high-effort `/code-review`;
`cloudflare-workers-reviewer`, `web-auth-security-reviewer`, and the live `/admin` smoke do not apply. After
P1 lands, brainstorm and write P2 (schema validation).

## Where the work is (2026-06-02, content-graph Plan 5 / slug-only rename executed and review-remediated; the content-graph initiative is COMPLETE)

Content-graph Plan 5 (slug-only rename plus the atomic inbound-link rewrite) executed subagent-driven on `main`, one
`cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the judgment-heavy `renameAction` and the
review fold-ins), commits `7b31e2c..eda6340` (the ten plan tasks), then a simplifier commit `9ab890a` and a review-gate
fold-in `80fd6ff`. **`main` is pushed and the window is PUBLISHED as `0.21.0`, now `latest` on npm** (OIDC
trusted-publishing workflow off the `v0.21.0` GitHub Release, build provenance attached), rolling the `0.19.0` (picker),
`0.20.0` (delete and the guards), and `0.21.0` (rename) window over the registry's prior `0.18.0`. It bumps the minor to
`0.21.0` (additive route surface, a new `RenameDialog`, the `EditData` `slug`/`renamed` fields, the pure helpers).
**Plan 5 is the last plan of the
content-graph initiative, so the initiative is now complete:** the atomic commit primitive, the committed manifest and
the `cairn:` resolver, the editor link picker, content delete with the integrity guards, and now content rename all
landed.

**Recovered after a battery interruption.** The prior session lost battery mid-Task-6, with the `EditPage` rename wiring
and its two tests written but uncommitted. The recovered diff was complete and correct (targeted test 16/16, full gate
green), so it committed as `f75a234` with no rework; Tasks 1 through 5 had already committed. No work was lost. The
remaining Tasks 7 through 10 and the full review gate then ran this session.

The pass delivers: slug-only rename (a page renames its whole id; a dated post keeps its date prefix and swaps the
date-stripped slug), the file move plus the self-token rewrite plus every inbound linker's body rewrite plus each touched
manifest row, all in one atomic `commitFiles` commit, so no internal link breaks. New code: `renameId` (`ids.ts`),
`rewriteCairnLink` (`markdown-format.ts`), `renameAction` plus the `editLoad` `slug` field, the `renamed` field, and the
parallel reads (`content-routes.ts`), the `commitFiles` tree-create 422-to-`CommitConflictError` hardening (`repo.ts`),
`RenameDialog.svelte`, the `EditPage` rename wiring, and the persistent polite/assertive `aria-live` regions that replace
the per-banner roles so each alert announces once.

Gate at the tip (`80fd6ff`): `npm run check` 777 files 0/0, `npm test` 109 files / 606 tests exit 0, `check:package`
all-green with no export-condition change. The showcase production build exits 0 with the rename action registered. The
five `renameAction` unit cases pass (no-inbound rename, inbound-linker rewrite with its manifest edge, self-token rewrite,
collision refused with no commit, no-op slug refused with no commit), and the `commitFiles` tree-create 422 throws
`CommitConflictError`.

**Review gate.** The simplifier replaced the Task 7 nested-ternary live-region derivations with `$derived.by` if-chains
(`9ab890a`, behavior identical). Three Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`,
`cloudflare-workers-reviewer`); the workers reviewer returned clean on the atomicity, token rewriting, path safety, and
the 422 fail-safe, and no reviewer found a Critical bug. Four findings folded in as `80fd6ff`: the successful rename was
silent because `editLoad` never read the `?renamed=1` redirect (now read and confirmed visibly and through the polite
region); `RenameDialog` now seeds focus into the slug input on open (WCAG 2.4.3) instead of the Close button; the
redundant `aria-label` on the labelled slug input was dropped; and the 409 collision branch carries a comment that it also
covers the concurrent-rename race. The separate high-effort `/code-review` was not run this pass: the three scoped Opus
reviewers covered exactly this pass's surface, and a `/code-review` would diff the whole unpushed branch (the
`0.19`/`0.20`/`0.21` window) and re-surface landed work. `web-auth-security-reviewer` did not apply.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin Worker.
The browser component tests cover the dialog, the focus seeding, the live region, and the collision banner; the
content-route unit tests cover the rewrite-and-commit path. The interactive smoke (rename an entry with an inbound link,
confirm the link still resolves on the linking page, confirm a collision is refused) is best run during the ecnordic
migration.

**Carried follow-ups (from the review gate).** The persistent assertive region does not re-announce an identical repeat
error (a colliding slug typed twice), since the derived string is unchanged; a nonce keyed off the action-result identity
would force it, and the fix spans the whole Task 7 live-region design. The `RenameDialog` slug echo shows the raw typed
value, so it can preview a slug the action rejects; running it through the shared `slugify` would match the create form,
and tying it with `aria-describedby` would carry it to assistive tech. The collision read is a third sequential
round-trip before the parallel pair; folding it into the `Promise.all` shaves one edge latency hop at the cost of one
wasted read on the no-collision path. The manifest last-writer-wins races stay the documented posture, caught by the
build's fail-closed backstop.

**Immediate next action: the content-graph initiative is complete and `0.21.0` is published, so the next work is the
site migrations.** Publishing is DONE: the registry's `latest` is `0.21.0` (the `v0.21.0` GitHub Release published via the
OIDC workflow, build provenance attached), rolling the `0.19.0`/`0.20.0`/`0.21.0` window over the prior `0.18.0`, and
`main` is pushed. The site migrations run per-site (`site-pass`, ecnordic then 907, from each site's own repo), pinning
`^0.21.0`, where each site
wires its complete content layer (delivery, resolver, manifest, the editor link surface) in one site-pass and the
scaffolder template captures the full picture. The migration gotchas in the entries below still apply (pass every
declared concept's glob, declare every read frontmatter key, coerce an unquoted YAML date, resolve `cairn:` links
wherever a body renders to HTML). There is no new cairn-cms engine plan to draft: the initiative roadmap is exhausted, so
the next plan is a site's own migration pass, authored in that site's repo.

**DX backlog from the first site migration.** The ecnordic `^0.10` to `^0.21` migration (the first full-surface
consumer migration) ran as a DX audit. The ranked engine backlog it produced is `docs/dx-backlog-ecnordic-migration.md`
(evidence in `ecnordic-ski/docs/cairn-dx-findings.md`). The high-cost items, ranked by what they cost a SvelteKit
developer new to cairn: the delivery root-versus-`/delivery` import split (and the `/delivery` barrel pulling
`CairnHead.svelte` into a node test), `EntryData` carrying no resolved concept, `ContentSummary` omitting the authored
summary field, and two build-time guarantees that lean on scaffold defaults a real SvelteKit site overrides (a `cairn:`
token resolves content concepts only, not routes; the dangling-token backstop goes silent under an inherited
`handleHttpError: 'warn'`). The file also carries the `create-cairn-site` scaffolder checklist. Fold these into the
scaffolder pass and the next engine touch-ups.

## Where the work is (2026-06-02, content-graph Plan 4 / content delete and the integrity guards executed and review-remediated)

Content-graph Plan 4 (content delete, the delete and save integrity guards, and four carried link-integrity
fixes) executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet, Opus for the
judgment-heavy save guard, `deleteAction`, and `EditPage` wiring), commits `19e8c0b..b63ac2e` (the fifteen
plan tasks), then a simplifier commit `30d363d` and a review-gate fold-in `afbf08b`. **Local only, not pushed,
not published.** It bumps the minor to `0.20.0` (additive route surface, a new `DeleteDialog`, the pure
helpers). The pass delivers: a Delete control that blocks until clean and names the inbound links, a save guard
that hard-blocks a dangling `cairn:` link with a one-click unwrap-to-text fix and warns a draft target, and the
four fold-ins (`escapeLinkText`, the hardened `parseManifest`, the manifest/site-index validation-exclusion
reconciliation in `buildSiteManifest`, and the three Plan 3 editor nits: the `insertLink` pre-mount fallback,
the `[[` code-block skip, the `LinkPicker` heading tiebreak).

New code: `escapeLinkText` (`links.ts`), `unwrapCairnLink` (`markdown-format.ts`), `inboundLinks`/`InboundLink`
(`manifest.ts`), `deleteAction` plus the `saveAction` guard and `editLoad` inbound field
(`content-routes.ts`), and `DeleteDialog.svelte`. Gate at the fold-in tip (`afbf08b`): `npm run check` 774
files 0/0, `npm test` 570 tests exit 0, `check:package` all-green.

**The review gate found real bugs, all now fixed (commits `2cf82ee`, `5bd8718`, `64ffdc4`, `2640e71`).** Three
Opus reviewers ran (`svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer`; the workers one
returned ship-it). The svelte and a11y reviewers converged on a broken post-action feedback flow, folded in as
`afbf08b` (surface the `deleteAction` 409, clear a fixed broken-link row, kill the double "Saved" banner). A
high-effort seven-angle `/code-review` then surfaced a cluster of CONFIRMED bugs that meant the save-guard
recovery flow, the pass's headline feature, did not actually work. The remediation batch:

- `2cf82ee` the keystone. A blocked save re-seeded the editor from the committed body and discarded the
  author's edits (and the broken link to fix); `EditPage` now seeds from the returned `form.body`.
  `unwrapCairnLink` was a raw regex that no-opped on the escaped-bracket and titled links the picker produces
  and could rewrite a link inside a code span; it is now an mdast-located offset splice that unescapes the
  display text and leaves code and the rest of the document exact. The banner row hides only on a real change,
  and the refused-delete banner names the linkers itself instead of pointing at a stale dialog.
- `5bd8718` `parseManifest` validated entry scalars but only that `links` was an array; a malformed link
  element (a missing id, a string, or null) passed and `inboundLinks` silently dropped a real inbound linker,
  letting the delete guard strand a link. It now validates each link element as a `{ concept, id }` string pair
  and type-checks an optional `date`.
- `64ffdc4` the save guard draft-warned a self-link on a draft entry; it now skips the entry being saved before
  classifying, mirroring `inboundLinks`.
- `2640e71` the showcase admin edit route registered only the `save` action, so the shipped delete 404'd in the
  reference consumer and any site scaffolded from it; it now registers `delete: routes.deleteAction`. Showcase
  production build exits 0.

Gate at the remediation tip (`2640e71`): `npm run check` 774 files 0/0, `npm test` 579 tests exit 0, showcase
build exit 0.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev`
admin Worker to smoke. The browser component tests cover the dialogs, the banner, and the unwrap fix; the
interactive smoke (block a delete on a linked-to page, delete an unlinked page, recover a blocked save via the
unwrap fix) is best run during the ecnordic migration against that site's real Worker.

**Carried follow-ups (from the review gate, for Plan 5 or a later pass).** Folded into the Plan 5 design where
noted: the `commitFiles` 422-on-absent-path delete edge (a delete of a path already absent from the tree
surfaces as a raw 500, not the friendly conflict redirect; rename deletes the old path, so it folds into Plan
5). Recorded as known limitations: the manifest concurrency races (a concurrent save adding an inbound link can
be missed by a delete gate, and a concurrent delete of a target can be missed by a save guard; both are
last-writer-wins on the git-committed manifest with no compare-and-swap, caught by the build's fail-closed
`verifyManifest`/resolver backstop, which is the designed safety net for cairn's tiny write volume; rename
shares the race). Smaller follow-ups: `buildSiteManifest` silently drops an invalid draft (a linked-to invalid
draft reds the build far from root cause, since the site gate skips drafts but the manifest validate has no
draft exception), a persistent always-present live region for the page alerts (the success/error/broken/draft
banners are `{#if}`-gated and announced inconsistently), and a perf-and-reuse cleanup (double `extractCairnLinks`
per save, double `parseMarkdown` per file at build, sequential `editLoad` reads, the `byKey`/resolver
key-shape duplication).

**Immediate next action: execute content-graph Plan 5,
`docs/superpowers/plans/2026-06-02-cairn-content-graph-05-rename.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the cairn-cms
directory on `main`. Start at Task 1.** The design is settled and approved (spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-05-rename-design.md`), so skip brainstorming. It runs on
`main` directly (additive, no site deploys) and bumps `0.21.0`. The pass is slug-only rename (a page renames its
id=slug; a dated post renames the date-stripped slug, keeping its date prefix) with the atomic inbound-link
rewrite through `commitFiles`, and no cascade-unwrap-on-delete. Ten test-first tasks: `renameId` and the mdast
`rewriteCairnLink` helpers, the `commitFiles` tree-create 422 hardening, `renameAction` plus the `editLoad` slug
field and parallel reads, the `RenameDialog` and `EditPage` wiring, a persistent edit-page live region, the
showcase rename action, and the version bump. Two Plan 4 review carries fold in (the absent-path delete edge in
Task 3, the alert live region in Task 7), and Task 9 wires the action into the showcase, the Plan 4 lesson. The
pass-end review gate is the simplifier plus `svelte-reviewer` (the dialog and the live region),
`daisyui-a11y-reviewer` (the dialog, the live region, the keyboard path), and `cloudflare-workers-reviewer` (the
`renameAction` read-rewrite-commit path and the `commitFiles` hardening), all Opus, plus a high-effort
`/code-review`; the live `/admin` smoke is a carried fast-follow for the ecnordic migration.

**Deferred (user's call 2026-06-02): publishing is held.** The registry's `latest` is `0.18.0`; `main` carries
the unpublished `0.19.0` (picker) and `0.20.0` (this lifecycle pass with its remediation). Publish the rolled
window before the site migrations, since a site pins a range only after the publish. The whole content-graph
initiative still precedes the site migrations.

## Where the work is (2026-06-02, content-graph Plan 3 / the editor link picker executed)

Content-graph Plan 3 (the editor link picker) executed subagent-driven on `main`, one `cairn-implementer` per
task (Sonnet), commits `9614b0a..d6aad7e` (the ten plan tasks), plus a simplifier commit `0c43fb0` and a
test-hardening commit `6485e37`, then the post-mortem `ac31a32`. **Local only, not pushed, not published.** It bumps
the minor to `0.19.0` (additive). The pass delivers the editor link picker end to end: an author inserts a `cairn:`
internal link two ways, a "Link to page" dialog and a `[[` autocomplete, both reading the `linkTargets` Plan 2 ships
to the editor and both writing `[Display](cairn:<concept>/<id>)`.

New code: `formatCairnToken(ref)` in `src/lib/content/links.ts` (the inverse of `parseCairnToken`).
`insertInlineLink(doc, from, to, href, title)` in `src/lib/components/markdown-format.ts` (a pure inline transform,
selection-wrap or title-insert, no block padding). `src/lib/components/link-completion.ts` holds the pure
`matchCairnTrigger` (the `[[query` matcher) and `linkCompletions` (title substring filter, grouped by concept,
drafts marked, the full link as the apply text), plus `cairnLinkCompletionSource(targets)`, a thin CodeMirror
`CompletionSource` adapter. `MarkdownEditor` gained two seams, `registerInsertLink` (an inline, selection-aware
insert) and a generic `completionSources` prop wired through `autocompletion({ override, interactionDelay: 0 })`.
`src/lib/components/LinkPicker.svelte` is the "Link to page" dialog, mirroring `ComponentInsertDialog`'s
native-`<dialog>` a11y. `EditPage` registers the completion source and the inline insert and renders the picker
beside the component dialog. `formatCairnToken` and `LinkPicker` are exported from the package.

Final gate at the tip (`6485e37`): `npm run check` 771 files 0/0, `npm test` 105 files / 537 tests exit 0 (green
across three consecutive full-suite runs after the flake fix), `check:package` all-green across all five entries with
no export-condition change. The simplifier made one cosmetic fix (`0c43fb0`) and reasoned against extracting the
concept-section logic shared across two layers. `svelte-reviewer` (Opus) and `daisyui-a11y-reviewer` (Opus) both
returned ship-it, no Critical or Important: the runes seams are correct, and the dialog plus the autocomplete popup
match or extend the `ComponentInsertDialog` a11y baseline (native `<dialog>` focus trap and Escape, the searchbox
label, the draft conveyed as text, CodeMirror's built-in combobox ARIA). A high-effort seven-angle `/code-review`
surfaced no Critical or Important; its two convergent findings are the carried bracket-escaping and pre-mount items
below. `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply.

**Flake fixed at the gate.** The Task 6 autocomplete end-to-end test accepted the completion with Enter, which under
full parallel browser load races CodeMirror's accept handler and falls through to a newline (green in isolation, red
under load, about half the time). The fix (`6485e37`) accepts by clicking the option, which drives CodeMirror's
mousedown-apply deterministically and proves the same seam without the keystroke race; the Enter contract is
CodeMirror's own built-in. Three consecutive full-suite runs are green after the change.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, so there is no `wrangler dev` admin
Worker to smoke. The browser component tests cover the dialog and the autocomplete; the interactive smoke (open the
dialog, pick a target, type `[[` and accept, confirm the inserted link in a real browser) is best run during the
ecnordic migration.

**Carried follow-ups for Plan 4 (recorded in the Plan 3 post-mortem):** unescaped brackets in an author title flowing
into the link display text (CommonMark tolerates balanced brackets, so only an unbalanced `[`/`]` breaks it, and it
self-corrects in the preview; the fix escapes title-derived text but not a live selection, so it wants its own
test-first task); `insertLink` no-ops before the editor mounts (matches `applyFormat`, only the block-insert path has
a raw-value fallback); `matchCairnTrigger` has no syntax-tree awareness, so `[[` triggers inside a code block; and the
section-order tiebreak uses the raw concept id, cosmetic past the two built-in concepts.

**Content-graph Plan 4 is WRITTEN (brainstormed and authored 2026-06-02): content delete and the integrity guards,**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-04-lifecycle.md` (design spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-04-lifecycle-design.md`, approved). The brainstorm split the
spec's single lifecycle plan: **Plan 4 takes delete plus the two guards, and rename plus the multi-file inbound rewrite
move to Plan 5** (the highest-blast-radius op, isolated). Decisions locked, each grounded against the field (Sanity,
Contentful, Hugo, Docusaurus, WordPress, Notion): the delete guard is block-until-clean (refuse while inbound links
exist, name them), and the save guard hard-blocks a dangling link (one-click unwrap-to-text fix) and warns a draft
target. The posture is "keep `main` always deployable", since a cairn save is a deploy and a non-technical author will
not see a failed build. Cascade-unwrap-on-delete defers to Plan 5 with rename. Four carried follow-ups fold in
(bracket-escaping in link text, the `parseManifest` guard, validation-failing-entry consistency, the three minor Plan 3
editor nits). Fifteen test-first tasks, additive, bumps `0.20.0`. The plan corrects the spec's test-layer note: the
content-route guards are unit-tested against a `fetch` double, since the routes have no D1.

**Plan 4 is DONE (executed and review-remediated 2026-06-02).** See the top entry for the landing detail, the
review remediation, and the authoritative next action (write Plan 5). The description below stays as the pass's
design record.

**Deferred (user's call 2026-06-02): publishing `0.19.0` is held.** The user chose to brainstorm Plan 4 rather than
publish the picker pass. The registry's `latest` is `0.18.0`; `main` carries the unpublished `0.19.0` (picker) and will
carry `0.20.0` (this lifecycle pass) on top. Publish the rolled window (`0.20.0`) before the site migrations, since a
site pins a range only after the publish. Plan 5 is rename plus the multi-file inbound rewrite (and cascade-unwrap-on-
delete), where the remaining content-graph follow-ups land. The whole content-graph initiative still precedes the site
migrations.

## Where the work is (2026-06-02, content-graph Plan 2 / the committed manifest and link resolution executed)

Content-graph Plan 2 (the committed manifest plus the `cairn:` link resolver) executed subagent-driven on
`main`, one `cairn-implementer` per task (Sonnet for the mechanical tasks, Opus for the atomic-save Task 10 and
the showcase end-to-end Task 11), commits `cdabeef..c50fc47` (fifteen: thirteen plan tasks plus two review-gate
commits). **`main` is pushed and the window is PUBLISHED as `0.18.0`, now `latest` on npm** (OIDC trusted-publishing
workflow off the `v0.18.0` GitHub Release, build provenance attached), rolling the content-graph manifest work over the
registry's prior `0.17.0`. It bumps the minor to `0.18.0` (additive surface). The pass
delivers internal links end to end: an author writes `[guide](cairn:posts/<id>)`, it renders as the live
permalink on the public page, a dangling target fails the build, and the editor preview marks a broken target.

New pure modules carry the work. `src/lib/content/links.ts` owns the `cairn:<concept>/<id>` token grammar
(`parseCairnToken`, `extractCairnLinks`, the latter parsing the body as mdast so a token in a code span is never
matched). `src/lib/content/manifest.ts` holds the manifest types, `manifestEntryFromFile` (one row per file,
identity plus outbound cairn edges, drafts flagged), the canonical serialize/parse (sorted, fixed key order,
trailing newline so the committed file diffs cleanly), `verifyManifest` (the build backstop, a canonical-form
comparison that throws on drift), the `upsertEntry`/`removeEntry` patch helpers, and `manifestLinkResolver` (the
preview lookup, undefined on a miss). `src/lib/delivery/manifest.ts` adds `buildSiteManifest` (the whole-corpus
projection mirroring `createSiteIndexes`) and `buildLinkResolver` (site-index-backed, throws on a miss).
`src/lib/render/resolve-links.ts` is the `remarkResolveCairnLinks` mdast step, before remark-rehype, so a rewritten
href passes the sanitize floor like any anchor; the per-call resolver rides on a VFile so the processor is still
built once. `entryLoad` resolves cairn links at build against the site index (the throw-on-miss backstop).
`saveAction` moved off `commitFile` onto the Plan 1 `commitFiles`: it reads the manifest, upserts the saved row,
and commits content and manifest in one commit. `editLoad` ships the manifest `linkTargets` to the client, and
`EditPage` builds a manifest resolver from them to resolve and mark links in the preview. The sanitize floor now
admits the inert `cairn:` href scheme (extend-only, the `javascript:`/`data:` strip preserved). The showcase wires
the whole path: a regenerate script (`npm run cairn:manifest`), a build-time `verifyManifest`, a real
`cairn:pages/about` link in the hello post, and both feeds resolving links to absolute URLs.

Final gate at the tip (`c50fc47`): `npm run check` 762 files 0/0, `npm test` 103 files / 519 tests exit 0,
`check:package` all-green across all five entries with no export-condition change. The end-to-end gate is the
showcase production build: the prerendered hello post renders `<a href="/about">about page</a>` with no
unresolved token, the feeds render `href="https://showcase.test/about"`, and the committed manifest matched the
corpus. The backstop was proven: pointing the link at `cairn:pages/does-not-exist` and rebuilding failed with
`cairn link target not found` (exit 1); reverting went green. The simplifier found nothing. Three Opus reviewers
ran (`cloudflare-workers-reviewer` ship-it on the atomic save, `svelte-reviewer` clean on the preview resolver,
`daisyui-a11y-reviewer` on the broken-link cue); three findings folded in as `81ec429` (the corrected stale-manifest
comment, the tracked `resolveLink` effect read, the `title="Broken internal link"` text cue). A high-effort
`/code-review` surfaced one real regression folded in as `c50fc47`: the floor now admits `cairn:`, so the showcase
feeds shipped dead `cairn:` links until threaded a resolver. Plan and full post-mortem (with the carried
follow-ups): `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`.

- Design: `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md` (approved). This plan implemented its
  Plan 2 (the committed manifest) and Plan 3 (the token, resolver, build backstop, preview cue) together.

**One key correction locked in: the manifest slug rule matches `content-index.ts` exactly**
(`slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null)`), so the manifest permalink equals the
content-index permalink by construction and the preview resolver and the build resolver never disagree. An early
hardcoded `'day'` granularity (to pass a malformed fixture) was reverted; the Task 2 and Task 4 fixtures were fixed
to pair a day-prefixed filename with `datePrefix: 'day'`.

**Live admin smoke: carried fast-follow.** The showcase runs `adapter-node`, not a Worker, so there is no
`wrangler dev` admin Worker to smoke. The `integration` project exercises the save path in workerd against a real
miniflare D1. The browser smoke (an editor saving an entry, confirming the commit carries both files) is best run
during the ecnordic migration against that site's real Worker.

**Content-graph Plan 3 is WRITTEN (brainstormed and authored 2026-06-02): the editor link picker,**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-03-picker.md` (design spec
`docs/superpowers/specs/2026-06-02-cairn-content-graph-03-picker-design.md`, approved). It builds the "Link to page"
dialog and the `[[` autocomplete, both writing the `cairn:` token through two new `MarkdownEditor` seams (a generic
`completionSources` prop wired through `@codemirror/autocomplete`, and a `registerInsertLink` inline insert), reading
the `linkTargets` Plan 2 ships. Brainstorm decisions locked: drafts shown flagged, the completion seam is generic, and
substring (not fuzzy) search. Ten test-first tasks, additive, bumps `0.19.0`.

**Immediate next action: execute content-graph Plan 3,
`docs/superpowers/plans/2026-06-02-cairn-content-graph-03-picker.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the cairn-cms
directory on `main`. Start at Task 1.** The design is settled (skip brainstorming). It runs on `main` directly
(additive, no site deploys). Task 1 adds the `@codemirror/autocomplete` dependency (this plan does change a
dependency, unlike Plan 2). The pass-end review gate is the simplifier plus `svelte-reviewer` (the completion-source
`$derived` and the picker reactivity) and `daisyui-a11y-reviewer` (the dialog, the search box, the keyboard and focus
path, the autocomplete popup), both Opus, plus a high-effort `/code-review`; the live `/admin` interactive smoke is a
carried fast-follow for the ecnordic migration (the showcase runs `adapter-node`).

After the picker, Plan 4 is the lifecycle guards (delete/rename with inbound-link rewriting), which is where several
Plan 2 carried follow-ups land (a link to a draft or invalid target, the resolver-vs-index divergence). The other
carried follow-ups, in the Plan 2 post-mortem, include a render-without-resolver contract caveat for the site
migrations (resolve cairn links wherever a body renders to HTML), a `parseManifest` per-entry/version guard, and an
`editLoad` two-read parallelize. The whole content-graph initiative still precedes the site migrations.

## Where the work is (2026-06-02, content-graph Plan 1 / the atomic commit primitive executed)

Content-graph Plan 1 (the atomic multi-file commit primitive) executed subagent-driven on `main`, one
`cairn-implementer` per task (Sonnet), commits `51f36de..2e4cfde`, plus one review-gate fold-in `3ba73af`. Local
only, not pushed. No version bump (additive and internal, `commitFiles` is unexported from the package entry). It
is the foundation of the content-graph initiative and the highest-stakes code in it (it writes to `main` and a
later caller will trigger site deploys), so it landed and was verified in isolation before anything builds on it.

`commitFiles(repo, changes, opts, token)` lives in `src/lib/github/repo.ts` beside the single-file `commitFile`.
It commits several path changes in one commit over the Git Data API: read the branch head, read its base tree,
POST a new tree on `base_tree` (so an unnamed path is preserved, including a concurrent commit's on a retry), POST
one commit parented on the head with the editor as author and the committer omitted, then PATCH the ref with
`force: false`. The exported `FileChange` is `{ path, content: string | null }`, where a null content encodes a
delete as a `sha: null` tree entry, so one commit mixes writes and deletes (what a rename needs). A `422`
non-fast-forward retries the whole sequence on the re-read head up to three times, rebuilding the tree on the new
base, and exhaustion throws the existing `CommitConflictError` so the caller fails safe. A non-422 ref failure
throws immediately. An empty change set is rejected before any network call (the review-gate fold-in).

Final gate at the tip (`3ba73af`): `npm run check` 754 files 0/0, `npm test` 99 files / 489 tests exit 0. The
eight-case `github-atomic-commit.test.ts` pins the URL sequence (GET singular `ref/`, PATCH plural `refs/`), the
`base_tree`/parent wiring, the write and delete tree shapes, the retry-then-succeed, the
exhaustion-to-`CommitConflictError`, the non-422 immediate throw, and the empty-set guard. The simplifier found
nothing to change. `cloudflare-workers-reviewer` (Opus) returned a ship-it verdict, no Critical or Important. A
high-effort seven-angle `/code-review` confirmed the diff is cleanly additive with no caller, collision, or barrel
leak; its one folded finding is the empty-set guard. The `svelte-reviewer`, `web-auth-security-reviewer`,
`daisyui-a11y-reviewer`, and the live admin smoke did not apply (no Svelte, auth, session, cookie, or DaisyUI code,
and no route calls `commitFiles` yet). Plan and full post-mortem (with the locked decisions and the latent
follow-ups): `docs/superpowers/plans/2026-06-02-cairn-content-graph-01-atomic-commit.md`.

**Content-graph Plan 2 is WRITTEN (brainstormed and authored 2026-06-02), merging the design's old Plan 2 and Plan
3 into one pass:** `docs/superpowers/plans/2026-06-02-cairn-content-graph-02-manifest-and-resolution.md`. The
manifest (build-verified projection, committed) and the `cairn:` link resolver land together, since they share the
token parser and a manifest-only pass would ship infrastructure nothing reads yet; together they resolve internal
links end to end (build resolves against the site index and fails closed on a dangling token, the preview marks a
broken target). Thirteen test-first tasks. Brainstorm decisions locked into the plan: the outbound edge list is
populated now (the shared `extractCairnLinks`), drafts are included and flagged, the build reads the site index
while the preview reads the manifest shipped to the client (one render with an injected resolver), drift fails the
build with a `npm run cairn:manifest` regenerate command, and the `commitFiles` 422 retry re-sends the manifest
blob last-writer-wins (accepted: the build reconciles). The picker is now Plan 3, the lifecycle guards Plan 4 (the
design spec's plan list is annotated with the resequence). The pass is additive and bumps `0.18.0`.

**Plan 2 is DONE (executed 2026-06-02).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 3, the picker). The description below remains as the pass's design record: it ran
`subagent-driven` on `main` (additive, no site deploys), and its review gate was the simplifier plus
`cloudflare-workers-reviewer`, `svelte-reviewer`, `daisyui-a11y-reviewer`, and a high-effort `/code-review`.

**Latent follow-ups carried from Plan 1** (unreachable under current conventions, recorded in the post-mortem): the
file-wide `encodeURIComponent(repo.branch)` in a ref path position would break a slashed branch name (cairn commits
only to `main`); the retry treats every ref-PATCH `422` as a non-fast-forward; the GET helpers throw with the
status alone and do not read the error body.

### The content-graph initiative (design)

The content-graph initiative is the active engine work, sequenced **before** the site migrations (decided this
session, migration is unhurried so the slot ahead of it is the accepted trade). It gives cairn a committed,
build-verified manifest projection of the corpus that request-time admin code reads without an N+1 GitHub crawl,
and it powers rot-proof internal links between posts and pages, a link-aware editor picker, and safe
delete/rename with inbound-link rewriting. It absorbs and supersedes the retired internal-links design and the
dated-slug deferred lifecycle items.

The spec is written and approved: `docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md`. The spine is
"files are truth, the manifest is a build-verified projection, every content mutation commits content and manifest
atomically." Two rationales are recorded in it so they are not re-litigated: why a stable-id `cairn:<concept>/<id>`
token rather than the Obsidian `[[wikilink]]` format (grounded in a verified 2026 competitive survey: not a
portable standard, name-based rot, literal-text degradation; the `[[` trigger is kept only as an insert gesture
that writes the id token), and why the link graph is a git-committed manifest rather than D1 (the resolver and
build-fail backstop run at build, where a runtime D1 binding is unreachable). The git-versus-D1 placement rule is
now its own canonical reference, `docs/data-architecture.md` (the build-versus-runtime test plus the three worked
precedents: config/nav to git, the manifest to git, the editor allowlist staying in D1).

The initiative is five foundation-first plans, each written just-in-time after the prior lands: (1) the atomic
multi-file commit primitive, (2) the committed manifest, (3) the token + build-time resolver + build backstop +
preview broken-link flag, (4) the picker (toolbar dialog + `[[` autocomplete), (5) content delete/rename + the
save and delete integrity guards. **Plan 1 is written and committed:**
`docs/superpowers/plans/2026-06-02-cairn-content-graph-01-atomic-commit.md` (three test-first tasks adding
`commitFiles` to `src/lib/github/repo.ts`: the write-only Git Data API sequence, delete encoding, and the
non-fast-forward retry with a `CommitConflictError` backstop). It is the highest-stakes code in the initiative
(it writes to `main` and triggers site deploys), so it lands and is verified in isolation before anything builds
on it. Plan 1 is internal and additive (no package export, no version bump). One spec correction baked into the
plan: the GitHub layer is unit-tested by stubbing `fetch` (the `github-commit.test.ts` pattern), not in the
integration project, which has no GitHub double.

**Plan 1 is DONE (executed 2026-06-02).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 2, the committed manifest). The plan series detail below remains as the
initiative's roadmap.

The site migrations (ecnordic then 907, `^0.17.0`) follow the whole initiative, so each site wires its complete
content layer (delivery, resolver, manifest) in one site-pass and the scaffolder template captures the full
picture. The migration gotchas in the entries below still apply.

## Where the work is (2026-06-02, render-safety pass executed, PUBLISHED 0.17.0)

The render-safety pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet), commits
`ae69a50..d86788a`. **`main` is pushed (`dbbef00..5074476`) and the window is PUBLISHED as `0.17.0`, now `latest`
on npm** (OIDC trusted-publishing workflow off the `v0.17.0` GitHub Release, build provenance attached). The single
publish rolled the unpublished `0.15.0` (delivery robustness), `0.16.0` (auth hardening), and `0.17.0`
(render safety) window into one release over the registry's prior `0.14.0`. That is the five plan-task commits, one review-gate doc fold-in (`8aee8a7`), and the
post-mortem (`d86788a`). Local only, not pushed, not published. It closes the escalated render-safety gap: the
engine render pipeline now sanitizes author content by default. `createRenderer` inserts `rehype-sanitize` after
`rehype-raw` and before the component dispatch, so author markdown (raw HTML, link URLs, slot bodies) is cleaned
while the site's trusted `build()` output and its inline SVG icons run after the floor untouched. The new
`src/lib/render/sanitize-schema.ts` builds the schema from `hast-util-sanitize`'s `defaultSchema` plus the
directive markers (so the dispatch still reads its stamps), the benign tags real content uses (`nav`, `details`,
`summary`), and free-form `className`/`target`/`rel` on anchors; `rehypeAnchorRel` forces `rel="noopener
noreferrer"` on every `target="_blank"` anchor. Two `RendererOptions` members carry the posture: `sanitizeSchema`
extends the allowlist from the safe base (extend-only, cannot weaken the core strip), and `unsafeDisableSanitize`
is the developer-only off switch. The admin preview collapsed onto the one floor, dropping the redundant DOMPurify
pass and the `dompurify` dependency, so the preview mirrors the published page. The additive surface bumps the
minor to `0.17.0`.

Final gate at the tip (`d86788a`): `npm run check` 753 files 0/0, `npm test` 98 files / 482 tests exit 0,
`check:package` all-green with no export-condition change. The new `render-sanitize.test.ts` (ten cases) proves
the strip and the preserve behavior, and the showcase production build (exit 0) prerenders the `callout` to
`<aside class="callout callout-warning">` through the floor with no `onerror`/`<script>` in the output, the proof
the before-dispatch placement preserves the directive markers. A `code-simplifier` pass found nothing to change.
`svelte-reviewer` (Opus) returned clean on the `EditPage` change (the `$effect` debounce and `previewRun`
latest-wins guard correct, no new race, `{@html}` safe under the single-floor model). A high-effort `/code-review`
with a security angle surfaced one Important finding, folded in as `8aee8a7`: the floor runs before the dispatch,
so a component `build()` that routes a directive **attribute value** (raw author input) into an `href`, `src`,
`style`, or event-handler position re-opens the `javascript:` vector. The build code is trusted, its inputs are
not. Not a regression (delivery had no sanitization before this pass), and the planned sites route attribute
values into class positions, so the fix is a documented `build()` contract caveat in the render-safety section,
not engine code. A possible URL-coercing build helper is a carried follow-up. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-02-cairn-render-sanitize.md`.

- Spec: `docs/superpowers/specs/2026-06-02-cairn-render-sanitize-design.md` (approved).

**Live admin smoke:** no `/admin` server surface changed, so it does not apply. The editor preview is covered by
the browser component tests, and the showcase prerender covers the delivery path.

**Superseded next action (see the top entry):** the site migrations now follow the content-graph initiative, which
was sequenced ahead of them this session. The migration detail below stays accurate for when that time comes.

The site migrations (per-site `site-pass`, ecnordic then 907, from each site's own
repo), pinning `^0.17.0`. Publishing is DONE (`0.17.0` is `latest`), so a site can pin the range now. Each site
imports from `@glw907/cairn-cms/delivery`, applies the `renderPreview`-to-`render` rename, builds its content layer
with `siteDescriptors` + `createSiteIndexes`, adopts the `responses.ts` feed/sitemap/robots helpers and the
`<CairnHead>` head, wires the catch-all `[...path]` route, and sets its per-concept URL policy in the YAML. The
migration gotchas apply: every declared concept must pass its `import.meta.glob` to `createSiteIndexes` (an empty
`{}` for an intentionally empty concept), every frontmatter key a site reads must be declared in its concept
schema, and a hand-rolled `validate` must coerce an unquoted YAML `date` (a JS `Date`). A site that needs a benign
tag the default sanitize allowlist omits extends it through `createRenderer(registry, { sanitizeSchema })`. The
render-safety gap is closed, so the delivery surface is now safe for a site to adopt. Breaking notes a consuming
site honors at the bump: the `MarkdownEditor` `preview` prop is gone (since `0.9.0`), `ComponentDef.build` is
`build(ctx)` (since `0.12.0`), and the adapter takes one `schema` member via `defineFields`/`defineAdapter` (since
`0.13.0`).

## Where the work is (2026-06-02, auth-hardening pass executed, unpublished 0.16.0)

The auth-hardening pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet for the seven
mechanical tasks, Opus for Task 7's prose-and-memory rewrite), commits `ad19f0e..443ab01`. That is the eight
plan-task commits, one simplifier refinement (`9f9d5f5`), and one review-gate fold-in (`443ab01`). Local only, not
pushed, not published. Six units landed: the `__Host-` session cookie name derived from the request protocol
(`__Host-cairn_session` with `Secure` on https, plain `cairn_session` on local http, derived identically at set,
read, and clear); six baseline security headers on every admin response through `resolve()` (`nosniff`,
`X-Frame-Options: DENY`, a matching `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: no-referrer`,
HSTS, a conservative `Permissions-Policy`), with non-admin responses untouched; a per-isolate `Map` memo of the GitHub
installation token (55-minute TTL under the one-hour lifetime, keyed by `installationId`, injected mint and clock);
a per-email magic-link cooldown (60 seconds, response unchanged so non-enumeration holds) plus a `platform.ctx.waitUntil`
background send with an inline fallback; lazy expired-row sweeps folded into `issueToken` and `createSession`; and an
https `requireOrigin` guard that allows http only for an exact `localhost` or `127.0.0.1` hostname. The smoke doc was
rewritten for the self-owned D1 model. The additive surface bumps the minor to `0.16.0`.

Final gate at the tip (`443ab01`): `npm run check` 753 files 0/0, `npm test` 98 files / 477 tests exit 0,
`check:package` all-green with no export-condition change. A simplifier pass made one cosmetic doc-comment fix
(`9f9d5f5`). Both applicable Opus reviewers ran: `web-auth-security-reviewer` (no Critical, no in-scope Important;
CSRF verification item PASS) and `cloudflare-workers-reviewer` (no Critical or Important; confirmed `db.batch`
atomicity, the per-isolate memo, the TTL margin, the `waitUntil` keep-alive). Two minor findings in this pass's own new
code folded in as `443ab01`: prefer the supported `platform.ctx` over the deprecated `platform.context` alias, and
match the localhost origin hostname exactly so `localhost.evil.com` cannot skip the https requirement. Plan and full
post-mortem: `docs/superpowers/plans/2026-06-02-cairn-auth-hardening.md`.

- Spec: `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md` (approved).

**Render-safety verification item: FAIL, escalated to its own pass (the plan's intended handling, not a blocker for
this pass).** The auth reviewer confirmed the reference delivery render path in `src/lib/render/pipeline.ts` composes
`remarkRehype({ allowDangerousHtml: true })` with `rehypeRaw` and no `rehype-sanitize`, and the showcase delivers its
output through `{@html}`, so author markdown carrying a `<script>`, an `onerror`, or a `javascript:` URI reaches the
published page verbatim. The deferred-CSP decision rested on render safety being the real XSS control, and that control
is absent on the reference path. Cairn's trusted-editor model lowers the likelihood (an owner-curated allowlist
committing through the GitHub App with history), so this is a malicious-or-compromised-editor and paste-mistake
exposure, not anonymous input. See the `cairn-render-sanitize-gap` memory.

**Live admin smoke:** the showcase runs on `@sveltejs/adapter-node`, not a Worker with a `wrangler` config, so there is
no `wrangler dev` admin Worker to smoke here. Real-Worker coverage for every changed behavior is the `integration` test
project (workerd against a real miniflare D1), green across `auth-guard`, `auth-confirm`, `auth-request`, and
`auth-cleanup`. The deployed-https browser smoke (a real browser round-tripping the `__Host-` cookie, an editor clicking
a real magic link) stays a human fast-follow, consistent with this project's precedent.

The render-safety pass was brainstormed and planned on 2026-06-02. The brainstorm settled the design forks, grounded in
a competitive survey (WordPress, GitHub, Hugo, Decap, Astro, and others): cairn belongs to the authors-but-filtered
camp, where the dominant override posture is an extend-only allowlist. Locked: the floor is `rehype-sanitize` inside
`createRenderer`, on by default, placed after `rehype-raw` and before the component dispatch so it cleans the untrusted
author content while the site's trusted `build()` output and its inline SVG icons are never sanitized; the schema is
`hast-util-sanitize`'s `defaultSchema` extended with the registry-derived directive markers and the benign tags real
content uses; the posture is extend-only with a developer-only `unsafeDisableSanitize` hatch; the admin preview collapses
onto the one floor, dropping the redundant DOMPurify pass and the `dompurify` dependency; and CSP stays a documented
site-level recommendation, not engine code.

**The render-safety pass is DONE (executed 2026-06-02).** See the top entry for the landing detail and the
authoritative next action (publish the `0.16.0`/`0.17.0` window, then the site migrations). The summary below
remains as the pass's design record.

## Where the work is (2026-06-02, delivery-robustness pass executed, unpublished 0.15.0)

The delivery-robustness pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet),
commits `aefabc6..40eb4d1` (the five plan-task commits, one simplifier refinement, one review fold-in). Local
only, not pushed, not published. It hardens the delivery surface against the misconfigurations and edge inputs
a migrating site can trip: `createContentIndex` excludes a validation-failed entry from the typed read (records
it in `problems()`, serves only `result.data`, the `raw as F` cast gone); `createSiteIndexes` throws at build
on an absent glob key for a declared concept and on a concept named `site`; `FeedItem.date` is optional and
the feed builders omit the date rather than emit `Invalid Date` (RSS) or throw a `RangeError` (JSON); and
`entryLoad` passes `feeds` to the head builder only for a dated entry, so an undated Page stops advertising the
post feed. The additive surface bumps the minor to `0.15.0`.

Final gate at the tip (`40eb4d1`): `npm run check` 751 files 0/0, `npm test` 96 files / 461 tests exit 0,
`check:package` all-green across the existing entries with no export-condition change. The end-to-end gate is
the showcase production prerender: the dated `hello` post carries both feed `rel="alternate"` links, the
`about` page carries none, and the feeds still render dated items (3 `<pubDate>`, 3 `date_published`). A
`code-simplifier` pass extracted a shared `parseFeedDate` (`022a0e1`). A `svelte-reviewer` (Opus) confirmed the
`entryLoad` spread is prerender-safe and the invalid-entry exclusion cannot serve raw frontmatter or break the
catch-all, no Critical or Important findings; the other three reviewers did not apply. A high-effort
`/code-review` (four angles) surfaced no confirmed bug: its two most-cited findings (the `validate:false`
exclusion and the `entry.date` feed gate) are both the plan's locked design, and `problems()` still records
every dropped entry. One review finding folded in as `40eb4d1`: the showcase feed routes now pass `p.date`
directly instead of the stale `?? ''` empty-string fallback, so the reference teaches the optional-date
contract a migrating site copies. No `/admin` surface changed, so the live admin smoke does not apply. Plan and
full post-mortem: `docs/superpowers/plans/2026-06-01-cairn-delivery-robustness.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md` (approved).

**Migration gotcha to honor (Task 2's intended behavior):** `createSiteIndexes` now hard-fails when a declared
concept has no glob key. The ecnordic and 907 migrations must pass every declared concept's `import.meta.glob`
(an empty `{}` for an intentionally empty concept). A conditionally-omitted glob that used to default to an
empty index now throws at build. This is the loud-failure the guard exists for, a migration step to honor.

**Decision (2026-06-02): hold the `0.15.0` publish, and do the auth-hardening pass next.** The user chose to
keep `0.15.0` local and unpushed for now (engine work needs no publish; a publish can batch with the
auth-hardening landing later), and to sequence auth-hardening ahead of the site migrations.

The auth-hardening pass was brainstormed and planned on 2026-06-02. The brainstorm settled the design forks,
each grounded rather than defaulted. Install-token caching is an in-isolate memo, mirroring the
`@octokit/auth-app` default, with no new binding and no pluggable seam, since cross-isolate stores (KV, D1)
solve a sharing problem cairn's tiny write volume does not have. CSP is deferred: a correct admin CSP would
thread a SvelteKit nonce into CodeMirror's runtime styles and spans the library/site boundary, and the threat
it mitigates on `/admin` is weak, so the pass ships the five zero-cost enforcing headers and records the
render-path sanitization invariant as the real XSS control. The magic-link rate limit is a per-email cooldown
on the existing `magic_token` row, zero-migration, since the endpoint only sends to allowlisted editors. The
pass grew one unit during brainstorming, a lazy expired-row sweep, the single auth-adjacent backlog item.

**Immediate next action: execute the auth-hardening plan,
`docs/superpowers/plans/2026-06-02-cairn-auth-hardening.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the
cairn-cms directory on `main`. Start at Task 1.** The plan is fully written (eight test-first tasks) and the
design is settled (spec `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md`, approved), so skip
brainstorming. It runs on `main` directly (additive or internal, no site deploys on a cairn-cms push) and bumps
`0.16.0`. The eight tasks: the `__Host-` cookie prefix (protocol-derived name), the five `/admin` security
headers in the guard, the in-isolate install-token memo, the magic-link per-email cooldown plus `waitUntil`
send, the lazy expired-row sweep, the https `PUBLIC_ORIGIN` guard, the admin smoke-doc rewrite, and the version
bump. The pass touches auth, session, cookie, and Worker code, so the pass-end review gate adds
`web-auth-security-reviewer` and `cloudflare-workers-reviewer` (both Opus), and the live admin smoke runs
against the rewritten doc (mint a D1 session row, send `Cookie: __Host-cairn_session=<id>`). Two verification
items run at the gate rather than as tasks: the SvelteKit CSRF origin check stays on, and the showcase
reference `render(md)` is confirmed not to emit raw author HTML.

After auth-hardening lands, the site migrations follow (per-site `site-pass`, ecnordic then 907, from each
site's own repo), which need `0.16.0` published first so a site can pin the range. The migration gotcha above
(pass every declared concept's glob) applies there.

## Where the work is (2026-06-02, schema Plan 3 / the SEO head consumer executed, PUBLISHED 0.14.0)

Schema-source-of-truth Plan 3 (the per-entry SEO head consumer) executed subagent-driven on `main`,
one `cairn-implementer` per task (Sonnet), commits `60e2d0c..bfeca52` (four plan-task commits plus one
review-gate hardening commit). **Pushed to origin and PUBLISHED as `0.14.0` (`latest` on npm via the OIDC
release `v0.14.0`, 2026-06-02), covering the whole unpublished `0.12.0`/`0.13.0`/`0.14.0` window in one
release.** **The schema-source-of-truth
initiative is now complete:** one `defineFields` declaration drives the editor form, the validator, the
inferred frontmatter type, and now the SEO head end to end. The additive surface bumped the version to
`0.14.0`, rolling on the unpublished window over `0.13.0`.

A new pure `src/lib/delivery/seo-fields.ts` holds `readSeoFields` (reads the four known head fields,
`description`/`image`/`robots`/`author`, off an entry's normalized frontmatter, keeping a present string
trimmed and omitting an absent, empty, or non-string value) and `resolveImageUrl` (turns an
author-supplied path absolute against the origin, returning `undefined` for a malformed string rather
than throwing at build), both re-exported from the delivery and root entries. `entryLoad` reads the SEO
fields once, applies the description fallback (`fields.description || entry.excerpt || description`) and
the default-image fallback (`fields.image ?? defaultImage`), resolves the chosen image absolute, and
spreads `image`/`robots`/`author` into the unchanged `buildSeoMeta`. `PublicRoutesDeps` gained an
optional `defaultImage`, the one site-wide OG image. The showcase declares the SEO fields, sets values on
the hello post and the about page, and passes a `defaultImage`.

Final gate at the tip (`bfeca52`): `npm run check` 751 files 0/0, `npm test` 96 files / 450 tests exit 0,
`check:package` all-green across the existing entries with no export-condition change. The end-to-end gate
is the showcase production prerender: the hello post carries its own `og:image`
`https://showcase.test/og/hello.png` and `article:author` `Showcase Author`, the second post (no declared
image) carries the default `og:image` `https://showcase.test/og/default.png`, and the about page carries
`robots` `noindex`. A code-simplifier pass found nothing to change. A `svelte-reviewer` (Opus) confirmed
the load is prerender-safe with correct fallback precedence and non-throwing error handling, no Critical or
Important findings; the other three reviewers did not apply (no Worker, D1, auth, session, cookie, or
DaisyUI code). Three reviewer findings folded in as `bfeca52`: `readSeoFields` now stores the trimmed
value (a stray `robots: "  noindex  "` had reached the head with surrounding whitespace), and two
docstrings now state the scope (`author` renders only for a dated entry's `article:author`, and the
bare-path image anchoring holds for the sites' bare-domain origin). No `/admin` surface changed, so the
live admin smoke does not apply. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-01-cairn-schema-03-seo.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md` (initiative), design
  reference `docs/superpowers/specs/2026-06-01-cairn-schema-03-seo-design.md` (this plan).

**Immediate next action: execute the delivery-robustness plan,
`docs/superpowers/plans/2026-06-01-cairn-delivery-robustness.md`, `subagent-driven`
(`superpowers:subagent-driven-development`, one `cairn-implementer` per task, Sonnet default), from the
cairn-cms directory on `main`.** The plan is fully written (five test-first tasks) and the design is settled
(spec `docs/superpowers/specs/2026-06-01-cairn-delivery-robustness-design.md`, approved), so skip
brainstorming and start at Task 1. It runs on `main` directly (additive, no site deploys on a cairn-cms
push). The five tasks: keep invalid entries out of the typed read (`content-index.ts`, the Astro/Velite
model, delete the `raw as F` cast), guard a missing or reserved-`site`-key glob at build
(`site-indexes.ts`), omit a feed date rather than throw on a bad one (`feeds.ts`), scope feed autodiscovery
to dated entries (`public-routes.ts`), then bump to `0.15.0` with the showcase production prerender as the
end-to-end gate. Two items are deferred to the backlog (the permalink impossible-date and the excerpt CJK
counting), near-unreachable for the English sites.

After this pass lands, the remaining engine-backlog item is the auth-hardening pass (`__Host-` cookie
prefix, `/admin` security headers, rate-limit + `waitUntil` on the request endpoint, install-token KV
caching), independent and schedulable anytime. Then the site migrations onto the delivery surface, unblocked
on the registry side (the `0.13.0`/`0.14.0` window is published as `0.14.0`, `latest`, so a site pins
`^0.15.0` once this pass publishes).

## Where the work is (2026-06-01, schema Plan 2 / the contract cutover executed, unpublished)

Schema-source-of-truth Plan 2 (the adapter-contract cutover) executed and landed on `main`, commits
`a49c928..526b5b0` (six: five plan-task commits plus one review-gate hardening commit), local only and
not yet pushed or published. It is breaking on the adapter contract, so the version bumped to `0.13.0`,
rolling together with the unpublished `0.12.0` slot-render bump. One `defineFields` declaration is now the
single source of truth end to end: `ConceptConfig` dropped `fields`/`validate` for one generic `schema: S`
member, `defineAdapter<const A>` preserves each concept's concrete schema type, and `normalizeConcepts`
unpacks the schema onto the unchanged `ConceptDescriptor`, so the admin form, the save path, and
`siteDescriptors` needed no change. `validateFields` now omits empty optional values from a successful
result, so committed frontmatter stays minimal and the inferred optional-key type reads back accurate.
`createContentIndex` validates each entry once at build, keeps the cheap summary raw-derived, stores the
normalized `result.data` on the typed `frontmatter` detail field, and records a `ContentProblem` verdict via
`problems()` instead of throwing. `createSiteIndex` reads those verdicts, skips drafts, and throws one
combined report, so a half-finished draft no longer fails the build. The new `createSiteIndexes(adapter,
config, globs)` maps over a `defineAdapter`-typed adapter for one typed index per concept (`frontmatter`
typed as the concept's inferred schema) plus a `site` resolver; the showcase content layer migrated to it.
`validateFields` is no longer re-exported from the package entry.

Final gate at the tip: `npm run check` 749 files 0/0, `npm test` 95 files / 440 tests exit 0, `check:package`
all-green across all five entries (no export-condition change), and the showcase production build prerenders
the catch-all, feeds, sitemap, and robots. The `defineAdapter` type proof held with no constraint relaxation,
and Task 4's `expectTypeOf` (compile-checked by the 0/0 check) confirms the concrete schema type survives into
typed reads. A simplifier pass (no changes) and a high-effort seven-angle `/code-review` ran at the gate; none
of the four specialized reviewers applied (no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code). The
review found one confirmed regression, folded in as `526b5b0`: the migrated showcase `posts` schema declared
only `title`/`date`, but the post files carry a `description` the SEO head reads, so validate-once dropped it
and the prerendered meta description silently fell back to the excerpt. Declaring the field restored it
(verified in the prerendered HTML). Plan and full post-mortem (with the carried follow-ups and the type-proof
detail): `docs/superpowers/plans/2026-06-01-cairn-schema-02-cutover.md`.

**The lesson for the site migrations: every frontmatter key a site reads must be declared in its concept
schema.** Validate-once serves only declared fields on `.frontmatter`, so a migrating site reading an
undeclared key gets `undefined` and a silent degrade, not an error. The ecnordic and 907 migrations each audit
their content for every read key before declaring the schema.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

**Plan 3 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the authoritative
next action (a sequencing fork: the residual delivery follow-up, auth hardening, or the site migrations,
each design-bearing). The design record below remains as the initiative's history.

Design settled (2026-06-01 brainstorm): the site-level default is the OG image only (`deps.defaultImage`), per
the absence-is-meaningful test and the convention across comparable tools; `robots` and `author` stay strictly
per-entry, with a `defaultAuthor` knob as a cheap symmetric addition later only if a real site asks. The
cross-concept catch-all reads the SEO fields by name off the normalized `.frontmatter` through a small typed
reader; the typed payoff is the full schema-to-head loop, not a statically typed catch-all.

After Plan 3 lands, the schema initiative is complete. The residual delivery items (the feed/excerpt/permalink
guards, the failure-path `frontmatter` typing, the reserved-`site`-key guard, the silent-empty-glob warning) stay
a small separate follow-up pass, after the schema initiative and before the site migrations. Publishing the
`0.13.0`/`0.14.0` window stays a separate release step, not urgent until the backlog clears.

## Where the work is (2026-06-01, schema Plan 1 / the schema primitive executed, unpublished)

Schema-source-of-truth Plan 1 (the additive `defineFields` primitive) executed and landed on `main`,
commits `80d2b84..c5ab533` (seven: five plan-task commits, one simplifier pass, one review-gate
hardening commit), local only and not yet pushed. It is additive and zero-blast, so it bumps no version;
the breaking `ConceptConfig` cutover is Plan 2. The new `src/lib/content/schema.ts` turns one `const`
field tuple into three faces from a single declaration: a plain `fields` array for the editor form, a
generated `validate` that delegates to the existing `validateFields` baseline and then layers the
declarative per-field rules (`min`/`max`/`length`/`pattern` on text and textarea, `min`/`max` on date)
and an optional validation-only `refine(data, body)` cross-field hook, and an inferred frontmatter type
via `InferFields`/`Infer`. A `~standard` Standard Schema v1 property gives ecosystem interop as a thin
adapter over `validate`, with a local types-only copy of the interface and no runtime dependency. The
primitive is re-exported from the package main entry; no consumer wires it yet (that is Plan 2).

Final gate at the tip: `npm run check` 745 files 0/0, `npm test` 93 files / 430 tests exit 0,
`check:package` all-green for the existing main entry (no new export condition). A simplifier pass (which
dropped the redundant field-variant casts in `applyRules`, since the discriminated union narrows on the
type guard) and a high-effort `/code-review` ran at the gate. None of the four specialized reviewers
applied, since the pass touched no Svelte, Worker, D1, auth, session, cookie, or DaisyUI code. Two
correctness findings were folded in test-first as the hardening commit: a malformed `pattern` now compiles
once in `defineFields` and fails fast there with a config error naming the field, instead of throwing an
uncaught `SyntaxError` from inside `validate()`; and `~standard.validate` coerces a null frontmatter or body
to the empty form, so it returns issues rather than dereferencing null. Plan and full post-mortem:
`docs/superpowers/plans/2026-06-01-cairn-schema-01-primitive.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`.

**Plan 2 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the authoritative next
action (brainstorm then write Plan 3, the SEO head consumer). The brainstorm record below remains as the
initiative's design history.

Brainstorm settled (2026-06-01): keep `Infer`'s optional-key shape, and change the absorbed validator to omit
empty optional values (empty string, `false`, empty array), so committed frontmatter stays minimal and the
optional-key type reads back accurate. The SEO consumer stays a separate Plan 3. Drafts are skipped at the
build gate. The emission decision is recorded in the spec's "The schema primitive" section. Plan 3 (the
per-entry SEO head consumer) is written just-in-time after Plan 2 lands.

## Where the work is (2026-06-01, component-completion Pass 1 / slot render executed, unpublished)

Component-completion Pass 1 (the slot render path) executed and landed on `main`, commits `2bca500..d0c3e0a`
(eleven: nine plan-task commits, one simplifier pass, one review-gate hardening commit), local only and not
yet published. It builds the component named-slot render path end to end. `remarkDirectiveStamp` now stamps a
registered component's declared attributes, marks its `[label]` title paragraph, and stamps each nested slot
directive so they survive to hast. The rehype dispatch partitions those into named slots and hands `build` a
`ComponentContext` (`attributes`, `slot(name)`, `items(name)`, `node`), replacing the old `build(node)`
signature. That is the breaking change, so the version bumped to `0.12.0`. The showcase `callout` proves the
path, and the production build prerenders it to `<aside class="callout callout-warning">` with title, body, and
points. The folded hardening all landed: the `glyph` unknown-icon guard, the `validateComponent` single-parse
seam, the `splitHead` retirement, the repeatable-form stable identity, and the form a11y polish.

Final gate at the tip: `npm run check` 742 files 0/0, `npm test` 91 files / 410 tests exit 0, `check:package`
all-green for `0.12.0`. A simplifier pass (which extracted a shared `dataAttrProp` so the stamp/read casing
contract is one source of truth), plus `svelte-reviewer` and `daisyui-a11y-reviewer` (both Opus), ran at the
gate. The `cloudflare-workers-reviewer` and `web-auth-security-reviewer` did not apply, since the pass touched
no Worker, D1, auth, session, or cookie code. Both reviewers converged on one Important finding, the `IconPicker`
roving-tabindex pattern not moving DOM focus on arrow keys; it was folded in test-first (focus follows selection
via `tick()` then the live tab stop, the arrow origin derives from the tab stop, and the group label threads from
the field). Plan and full post-mortem: `docs/superpowers/plans/2026-06-01-cairn-components-03-slot-render.md`.

- Design: `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`.

**Carried fast-follow: the live `/admin` guided-insert smoke (Task 10) is unrun.** It needs a human clicking
through the insert dialog in a browser against a real Worker. The render path is proven by the showcase
production build and the form-to-editor flow by the browser component tests, so it is a fast-follow, best run
during the ecnordic component migration against that site's real Worker.

**Pass 2 was reframed (2026-06-01).** Brainstorming the typed-reads item escalated it into a foundational
**schema-source-of-truth** initiative, run before the site migrations while the adapter contract is still
pre-scaffolder and pre-adoption. One per-concept declaration (`defineFields`) becomes the single source of
truth, yielding a plain-data field projection for the editor form, a generated validator, and an inferred
frontmatter type. The design was pressure-tested against nine comparable systems (Keystatic, Tina, Astro,
Velite, Contentlayer, Nuxt Content, Sanity, Payload, Decap), which confirmed the single-declaration unification
and the no-codegen runtime inference, and drove four revisions: a corrected anti-Zod rationale, declarative
per-field rules (`min`/`max`/`length`/`pattern`), Standard Schema (`~standard`) conformance, and the
load-bearing invariants. Decision locked: **own the primitive** (not Zod/Valibot), conform to Standard Schema
for interop. Spec: `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`. The initiative is
three plans: Plan 1 the additive primitive, Plan 2 the contract cutover (`ConceptConfig` to a `schema` member,
`defineAdapter`, `createSiteIndexes`, validate-once normalized reads, skip-drafts), Plan 3 the per-entry SEO
head consumer. The residual delivery items (feed/excerpt/permalink guards) become a small follow-up; Pass 3
(auth hardening) and the site migrations follow.

**Schema Plan 1 is DONE (executed 2026-06-01).** See the top entry for the landing detail and the
authoritative next action (brainstorm then write Plan 2, the contract cutover). Publishing `0.12.0` stays a
separate release step, not urgent until the backlog clears.

## Where the work is (2026-06-01, delivery-surface DX executed, unpublished)

The delivery-surface developer-experience pass executed and landed on `main`, commits `d606676..27deb16`
(thirteen: ten plan tasks plus three review-gate fixes), local only and not yet published. The delivery
layer is now the blessed, backend-free public path a SvelteKit site wires in a few lines. It adds the
fourth package entry `@glw907/cairn-cms/delivery` (imports no auth, github, or email, enforced by a
boundary test), build-time validation safe-by-default in `createSiteIndex` (`{ validate: false }` opt-out),
a ready `seo: SeoMeta` from the catch-all `entryLoad`, the `responses.ts` feed/sitemap/robots `Response`
helpers, `json-ld.ts` with breakout-safe escaping, the `<CairnHead>` head component (`title={false}` to let
a site own its `<title>`), the `siteDescriptors(adapter, config)` one-liner, `buildSeoMeta` `robots` and
`article:*` tags, and generic-over-frontmatter content reads (`createContentIndex<F>`) for a later
typed-reads pass. The showcase wires every surface (`content.ts`, the `[...path]` route, feed.xml,
feed.json, sitemap.xml, robots.txt) and the production build prerenders them as the end-to-end gate.

Final gate on `main`: `npm run check` 739 files 0/0, `npm test` 88 files / 398 tests exit 0,
`check:package` green (attw all-green for `/delivery`), showcase build prerenders all feeds and the
catch-all. A simplifier pass, a `svelte-reviewer`, a `daisyui-a11y-reviewer` (both Opus), and a
two-angle `/code-review` ran at the gate; three findings were folded in (the U+2028/U+2029 JSON-LD
escape gap, the missing showcase `feed.json` route the head advertised, a repeated concept lookup).
Plan and full post-mortem with the carried open decisions: `docs/superpowers/plans/2026-06-01-cairn-delivery-dx.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-dx-design.md`.

**Published as `0.11.0` (`latest` on npm, OIDC release `v0.11.0`, 2026-06-01); `main` pushed (commits
`d522dfd..41b7a42`).** The delivery surface is now consumable as `@glw907/cairn-cms/delivery`.

**Decision (2026-06-01): clear the engine backlog before any site migration, as three
surface-focused passes; hold the roadmap initiatives out.** Brainstormed and scoped with the user.
The sites (ecnordic component migration + delivery Pass 1c, 907 catch-up) wait until these land. The
three passes:
1. **Component completion** (next, design written). The component slot render path end to end plus the
   render/grammar hardening, the Plan 2 form fixes, and the live `/admin` smoke. Design:
   `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`. The render half
   of the component initiative was never built: `remarkDirectiveStamp` only stamps registered component
   directives, so nested `:::title`/`:::actions` slots are dropped on the way to hast and the Plan 2 form
   can insert markup that renders to nothing. Pass 1 stamps slots at remark, partitions them at dispatch,
   and changes `ComponentDef.build` from `build(node)` to `build(ctx)` (`{ attributes, slots, node }`,
   rendered hast per slot) so a site `build()` arranges hast and never walks the tree. Breaking on
   `ComponentDef.build`, so it bumps the version. Folded hardening: `splitHead` heading-sniffing retires
   (its crash with it), the `glyph` unknown-icon guard, the `validateComponent` double-parse, the form
   repeatable-id + a11y fixes.
2. **Delivery/SEO hardening.** Skip-drafts-at-build, per-entry `image`/`robots`/`author` in the SEO head,
   the feed/excerpt/permalink edge cases, and typed reads (infer `F` from concept fields, apply the
   validator's normalized `data` on read).
3. **Auth hardening.** `__Host-` cookie prefix, `/admin` security headers, rate-limit + `waitUntil` on the
   request endpoint, install-token KV caching.

**Pass 1 status: DONE (executed 2026-06-01).** See the top entry for the landing detail; the authoritative
next action now lives there. The summary below remains as the pass's scope record. It bumped to `0.12.0`
(Task 9) for the breaking `build` change; publishing stays a separate release step after the pass. After Pass 1
lands and publishes, the ecnordic
component migration becomes a site-pass that refactors ecnordic's `build()` to `build(ctx)`. 907-life has
no directive components (plain remark-html, still on `0.6.0`), so it is out of the component initiative;
its only pending work is the version catch-up. Carried for the later delivery migration: the
build-validation date gotcha (an unquoted YAML `date` arrives as a JS `Date`, so a site's hand-rolled
`validate` must route it through `validateFields` or coerce).

Carried out-of-scope follow-ons: typed reads, OpenGraph image generation, redirects, i18n, and the two
delivery-validation refinements in the post-mortem (skip-drafts-at-build and apply-normalized-`data`-on-read).

## Where the work is (2026-05-31, post-component-form)

- Component registry Plan 2 of 3 (admin guided-insert form) executed, landed on `main`, pushed, and
  published as `0.10.0` (`latest` on npm via the OIDC release `v0.10.0`; commits `a3b38a3..008fc33`
  plus the docs and release-bump commits). `0.10.0` is additive over `0.9.0`: it bundles both
  component plans (Plan 1 grammar and Plan 2 form), and `ComponentPalette` was born and removed inside
  the unpublished window so no published export was dropped. It builds the guided-insert flow on
  Plan 1's grammar: `buildComponentInsert(def, values)` (the one pure serialize-then-validate step,
  exported from the main entry), `ComponentForm.svelte` (schema-driven fields, a repeatable
  add-and-remove list, inline validation errors), `ComponentInsertDialog.svelte` (the Insert trigger
  and a native `<dialog>` picker with the schema-vs-template dual path), and `IconPicker.svelte` over
  a site `IconSet` that now threads from the adapter through `composeRuntime` to `EditPage` to the
  form. `ComponentPalette` is removed; the dialog's dual path closes the Plan 1 no-op-def finding.
  The render `build()` path is untouched (that is Plan 3). Green at close: `npm run check` scan 0/0
  over 725 files, `npm test` 375 tests exit 0, `check:package` green, showcase builds. Execution
  deviations locked in: the unions are narrowed with typed accessors (no `any`) and `slotItems`
  returns the live `$state` proxy; `ComponentForm` is `{#key picked}`-wrapped so its `untrack` seed
  cannot go stale; the Insert trigger gets `aria-label="Insert component"` to avoid colliding with the
  form's submit. A review gate (simplifier plus svelte and daisyui-a11y reviewers, both Opus) ran;
  its findings were folded in test-first as the `008fc33` hardening commit (dropped the
  listbox/option roles for a plain button list, named the dialog, `role="alert"` plus `aria-invalid`/
  `aria-describedby` on the validation errors, the `{#key}` guard, the 24px remove-button floor).
  Plan and full post-mortem: `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`.
  **Queued (sequence against the delivery-surface DX pass above): brainstorm then write Plan 3
  (per-site migration: each site declares its UI components and `build()` reads named slots instead of
  the old heading convention, ecnordic then 907). It is the last of the three-plan component initiative. This is a design-bearing pass, so run
  `superpowers:brainstorming` with the user on the open decisions before `superpowers:writing-plans`;
  do not auto-write it. Parent design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`.
  Before Plan 3 ships, the live interactive `/admin` smoke for the guided-insert flow is the one
  unverified Plan 2 surface (see the carried follow-up).** Plan 3 is where the sites pin `^0.10.0` and
  the symlink dev link can engage.

## Earlier state (2026-05-31, post-component-grammar)

- Component registry Plan 1 of 3 (engine grammar and schema) executed and landed on `main`
  (commits `dbc1b69..174e02c`, not pushed, not published). It extends `ComponentDef` with a
  typed schema (`attributes` + named `slots`, plus `use`), adds the three grammar machines
  (`serializeComponent`, `parseComponent`, `validateComponent`) over one canonical
  `remark-directive` grammar, and `generateComponentReference` for the llms-full author/AI
  reference. Pure node `unit` code; `build()`, the render dispatch, and `insertTemplate` are
  untouched (`insertTemplate` only moved to optional). Green at close: `npm run check` scan 0/0
  over `src/`, `npm test` 360 tests exit 0, `check:package` green. Three corrections locked in
  during execution: `insertTemplate` became optional with a one-line palette guard;
  `remark-stringify` was an undeclared dependency (added and the committed lock relocked);
  and the plan's backslash-escaping premise was wrong (the directive grammar decodes HTML
  entities, so attribute quotes entity-encode instead). A svelte review plus a correctness
  review ran at the gate; the correctness findings were folded in test-first as a Task 9
  hardening pass (entity-encode quotes, escape title brackets, quote-aware unknown-attribute
  detection, repeatable-slot array guard, pinned `bullet: '-'`). Plan and full post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. **Immediate next action:
  execute Plan 2 (the admin guided-insert form),
  `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`, via `cairn-pass` +
  `subagent-driven-development`, dispatching the `cairn-implementer` per task (Sonnet default fits
  these well-specified tasks). Ten tasks, test-first, building on Plan 1's `serializeComponent`/
  `validateComponent`/`emptyValues` and the editor's `registerInsert` seam. It is engine + admin-UI,
  no site migration; run it on `main` directly (additive, no site deploys on a cairn-cms push) or a
  worktree off `main`. Design: `docs/superpowers/specs/2026-05-31-cairn-components-02-form-design.md`.
  The brainstorm settled a modal dialog that folds in the palette, a visual icon picker fed by a site
  `IconSet` threaded through the adapter (with a None choice when the icon field is optional), reuse
  of `validateComponent` as the form validator, a schema-vs-template dual path (which also resolves
  the Plan 1 no-op-def finding), and body validation deferred.**

## Earlier state (2026-06-01, post-editor-swap-publish)

- The editor foundation swap (Carta to CodeMirror 6) MERGED to `main`, pushed to origin, and PUBLISHED
  as `0.9.0` (now `latest` on npm via the OIDC release `v0.9.0`). It replaces Carta with a
  client-only CodeMirror 6 edit surface behind the unchanged `MarkdownEditor` seam
  (`value`/`name`/`registerInsert`), gives cairn its own house-icon `EditorToolbar.svelte` and a pure
  node-testable `markdown-format.ts`, drops the dead Carta `preview` adapter prop from `EditPage`, and is
  breaking (the `preview` prop and the carta-md peer both left). Green on `main` after the merge: `npm run
  check` 0/0 over 707 files, `npm test` 331 passed exit 0. The showcase production build code-splits
  CodeMirror to client chunks with no `@codemirror/view` in the server bundle. Two review subagents
  (svelte, daisyui-a11y) plus a simplifier pass were folded in (the `$bindable` seam reconciles an external
  value change into the mounted view, a focus ring was restored, toolbar targets reach the 24px floor, and
  the toolbar uses the admin's stroke SVG icon set). Plan and post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-editor-codemirror-swap.md`. The `feat/editor-codemirror-swap`
  worktree and branch were removed after the merge. Carried follow-up: the interactive browser smoke (live
  typing, the focus ring, toolbar formatting) is the one unverified surface; the automated gate and the prod
  build cover the rest.
- The site UI component registry is designed; Plan 1 of 3 (engine grammar and schema) is now executed
  and landed (see the top entry). Each site will declare its UI components once (typed attributes, named
  slots, description, intended-use, render). One canonical directive grammar drives a guided insert form
  for non-technical editors, save+build validation, and a generated `llms-full`-shaped reference file an
  author points claude.ai at. Research grounded three choices: explicit named slots over an implicit
  heading, a parse-ready grammar for later round-trip editing, and schema validation. Insert-only in v1.
  Design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`; Plan 1 (engine grammar and
  schema, no UI): `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. Plans 2 (admin guided
  form) and 3 (per-site migration, ecnordic then 907) are written just-in-time after each lands. Builds on
  the editor swap's `registerInsert` seam, now published.
- The dated-slug identity pass landed on `main` (commits `dd2a265..77d9bf2`), bumping the local
  version to `0.8.0` (published to npm). It gives dated concepts a split id/slug identity (id is the
  filename stem, slug is the date-stripped id), adds a per-concept `datePrefix` granularity knob,
  moves per-concept URL policy (`permalink`, `datePrefix`) into the admin-editable YAML site-config
  under an SSG model, and unifies public delivery behind a site-level `byPermalink` resolver one
  catch-all `[...path]` route serves. Green at close: `npm run check` 0/0 over `src/`, 315 tests exit
  0, `npm run check:package` clean. Three review subagents returned no blockers; four small findings
  were folded in. Design: `docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`; plan and
  post-mortem: `docs/superpowers/plans/2026-05-31-cairn-dated-slug.md`. The pass ran directly on
  `main` (user-authorized), not a worktree. Not yet published to npm and not yet smoke-tested against
  a live Worker.
- Rebuild plans 00 through 08 landed earlier. The public content delivery layer landed too. It merged
  to `main` (merge `6080496`) and published as `0.7.0`, the `latest` tag on npm. The delivery layer is
  additive over the 0.6.0 admin and auth surfaces, so it shipped as a minor. Green at that merge:
  `npm run check` 0/0, 285 tests exit 0, `npm run check:package` passing. The publish ran through the
  OIDC trusted-publishing workflow off the `v0.7.0` GitHub Release.
- Both consumer sites (907-life, ecnordic-ski) still run `0.6.0`. They cut over to it, merged to
  their mains, deploy via CI, and passed a full live magic-link smoke. The dormant better-auth
  tables and AUTH_KV are deleted. Neither site has migrated onto the delivery surface yet.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical, and the only worktree. STATUS.md
  is canonical here.
- The two merged feature worktrees are gone. `cairn-public-delivery` (`feat/public-delivery`) was
  pruned at the 0.7.0 landing; `cairn-cms-rebuild` (`feat/rise-data-attr`) was removed and its branch
  deleted in the teardown pass (2026-05-30).
- Structural decision (settled): keep the `~/Projects/cairn` meta-workspace through the site
  co-evolution phase. The sites are about to migrate onto the `0.7.0` delivery surface, which is the
  strongest case for zero-publish symlink dev. Dissolving the workspace to standalone top-level
  repos is deferred until cairn-cms stabilizes after the scaffolder (Plan 10).
- Symlink dev is documented and proven, currently off. The runbook is
  `docs/runbooks/symlink-dev.md`. npm links a member only when its version satisfies the consumer's
  range, so the link engages per-site at first migration, when a site moves to `^0.7.0` (which also
  forces the `renderPreview`-to-`render` adapter rename and a deploy). The teardown pass proved the
  end-to-end link against 907-life and found two conditions the original plan missed, both now in the
  runbook: the local cairn-cms version must run a proper patch *ahead* of the published one (an exact
  `0.7.0 == registry 0.7.0` makes npm prefer the tarball; a prerelease like `0.7.1-dev` fails to
  satisfy `^0.7.0`), and the root `package-lock.json` must be deleted after the bump so npm
  re-resolves instead of honoring the stale registry pin. A member-local `node_modules` copy also
  shadows the link and must be removed. A root-level `npm install` was verified not to drift either
  site's committed lock, and standalone `npm ci` stayed green for both. See
  [[workspace-symlink-and-next-pass]].

## Open decisions and next steps

Do these in order.

0. Editor swap is merged, pushed, and published as `0.9.0` (`latest` on npm), `0.8.0` published earlier
   (done). The interactive browser smoke remains a fast-follow: live keyboard behavior in the showcase admin
   editor (typing, the focus ring, toolbar formatting, the palette insert, the preview toggle). Pushing
   cairn-cms `main` does not deploy a site (only the site repos deploy on push).
0a. Publishing: the registry carries `0.17.0` (`latest`, published 2026-06-02), which rolled the `0.15.0`
   (delivery robustness), `0.16.0` (auth hardening), and `0.17.0` (render safety) window into one release
   over the prior `0.14.0`. A migrating site can import `@glw907/cairn-cms/delivery` and pin `^0.17.0`.
   Breaking notes a consuming site must honor at the bump: the `MarkdownEditor` `preview` prop is gone
   (since `0.9.0`), `ComponentDef.build` is now `build(ctx)` (since `0.12.0`), and the adapter contract
   takes one `schema` member via `defineFields`/`defineAdapter` (since `0.13.0`).
1. Migrate each site onto the published delivery surface (`^0.17.0`), one per-site
   `site-pass`, from that site's own directory. Each imports from `@glw907/cairn-cms/delivery`, applies
   the `renderPreview`-to-`render` rename, builds the content layer with `siteDescriptors` +
   `createSiteIndex` (which now validates frontmatter at build), adopts the `responses.ts` feed/sitemap/
   robots helpers and the `<CairnHead>` SEO head, wires the catch-all `[...path]` route, sets its
   per-concept URL policy in the YAML (`907`: `datePrefix: day`, `/:year/:month/:day/:slug`; `ecnordic`:
   `datePrefix: month`, `/:year/:month/:slug`), and drops its hand-rolled `posts.ts`/`feed.ts`.
   `examples/showcase` is the complete working reference. **Gotcha to honor (from the delivery DX review):
   the build-time validation feeds `parseMarkdown` frontmatter to the site's `validate`, where an unquoted
   YAML `date:` is a JS `Date`, not a string. A hand-rolled `validate` that string-checks `date` must route
   it through `validateFields` or coerce it, or the build rejects valid dated posts.** Existing filenames and
   URLs are preserved with zero redirects. This is where the symlink engages
   (`docs/runbooks/symlink-dev.md`) and where the production deploys happen. The live `/admin` smoke
   for the dated create flow is best run here, against the real Worker.
2. The internal-link picker is the next editor pass (post-to-post linking via a `cairn:<concept>/<id>`
   token resolved at build). It builds directly on the new CodeMirror surface and the `registerInsert`
   seam, which is why the seam's two-way `value` flow was made correct in this pass.
3. Next cairn engine passes, each its own brainstorm-then-plan: a content-lifecycle pass (atomic
   Git Data API move primitive, delete, rename, internal-link rewriting; external redirects stay the
   site's job) and a settings-editor pass (the admin web UI to edit the YAML URL policy and other
   settings). Then the still-pending CairnExtension dispatch and the `create-cairn-site` scaffolder.
   Both deferred passes are scoped in the dated-slug design doc's future-work section.

Launch directory: start Claude inside the repo a pass targets (cairn-cms or a site), so that repo's
own `.claude/` hooks and per-project memory stay active. The workspace `CLAUDE.md` still loads as a
parent. Reserve `~/Projects/cairn` for cross-repo or workspace-config chores. The launch-directory
table also lives in `docs/runbooks/symlink-dev.md`.

The teardown pass settled the carried loose ends: the content-concepts design doc is committed as
history (`5c10058`), and the stale in-progress breadcrumb in `docs/PLAN.md` was discarded (its
outcome is in the functional spec).

## Carried follow-ups (latent, not bugs under current conventions)

- Delivery DX (mostly RESOLVED across schema Plan 2 and the delivery-robustness pass): the schema Plan 2
  cutover added skip-drafts at the `createSiteIndex` gate and validate-once storing `result.data` on the typed
  read, so the build-over-drafts and serve-raw-frontmatter items are closed. The delivery-robustness pass closed
  the rest: a validation-failed entry is excluded from the typed read (Task 1), `entryLoad` no longer attaches
  feed autodiscovery to undated Pages (Task 4), and the feed builders omit an absent or `Invalid Date` pubDate
  rather than emit it (Task 3). The remaining note is the build-validation date-shape gotcha (an unquoted YAML
  `date` arrives as a JS `Date`), recorded in the site-migration step above, since that is where a hand-rolled
  validator would meet it.
- Component registry (Plan 1, RESOLVED by Plan 2): the old palette rendered a no-op item for a def
  lacking `insertTemplate`. The Plan 2 dialog replaces the palette with a dual path (schema def opens
  the form, template-only inserts directly, a def with neither is omitted), so the no-op is gone.
- Component form (Plan 2): the live interactive `/admin` smoke against a real Worker (open the
  dialog, fill the form, insert into the editor) is unverified; the browser-layer component tests and
  the untouched auth/save flow make it a fast-follow, not a blocker. Repeatable items are bare strings
  keyed by index, so a mid-list removal reuses DOM nodes by position (values stay correct, focus
  identity does not follow an item); a stable per-item id is the fix once multi-field repeatable items
  arrive. Minor a11y polish left: the flat fields carry a redundant `aria-label` alongside their
  visible `<label>`, the per-item input label is generic rather than indexed, and `IconPicker` is an
  `aria-pressed` toggle group that could move to radiogroup semantics.
- Component grammar (latent, low likelihood for the planned sites): an attribute value with a literal
  newline is unsupported (single-line form fields make it unreachable); `validateComponent` parses the
  markdown twice (fine, validation is not hot). Multi-field repeatable items stay deferred by design, and
  `build()` reads the old heading convention until Plan 3 refactors each site to read slots.
- Dated slug: the admin create date-in-slug guard rejects any slug opening with `^\d{4}-` on a dated
  concept, broader than the `datePrefix` strip (a `day` concept strips only a full `YYYY-MM-DD-`). A
  post deliberately slugged `2026-recap` is refused with the "leave the date out" hint. Acceptable
  since the date is captured separately; revisit if a real title trips it.
- Public delivery: the feed date throw is RESOLVED (the robustness pass made `rfc822`/`iso` total, omitting an
  absent or unparseable date). Still latent: a dateless entry sorts last in a dated concept; `deriveExcerpt`/
  `wordCount` assume whitespace-delimited words (the deferred excerpt-CJK item); the permalink date parse
  accepts a shape-valid but impossible date (the other deferred item).
- Render hardening: `splitHead` dereferences a missing `<h2>`; `glyph` serializes `d="undefined"`
  for an unknown icon. Both inherited from legacy, unreachable under the sites' content.
- Auth hardening: RESOLVED by the 2026-06-02 pass (the `__Host-` cookie prefix, `/admin` security headers, the
  install-token in-isolate memo, the magic-link cooldown plus `waitUntil`, the lazy expired-row sweep, the https
  `requireOrigin` guard). Two latent items remain. The guard's own 303 login-redirect skips the security headers,
  since `throw redirect(...)` unwinds before the post-resolve header step (low impact: a bare redirect with a
  `Location` and `Set-Cookie`, and the `/admin/login` page itself does get the headers). The render-safety FAIL is the
  escalated security item, now the immediate next pass (see the top entry and `cairn-render-sanitize-gap`).

## Durable operational traps

- Both sites deploy on push to `main`. An editor SAVE commits content to `main` and triggers a
  redeploy, so a cutover must merge to `main` rather than run from an unmerged branch.
- The npm workspace root makes `npm install` from a member update the root lock, leaving the
  member's committed lock stale and failing CI `npm ci`. Relock standalone: temp-move the root
  `package.json` and lock, `rm -rf node_modules package-lock.json`, `npm install`, restore the
  root, commit the lock.
- npm 11 does not apply `publishConfig.exports` on pack, so `exports` point at `dist/` always with
  a `prepare` build.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports
  `@sveltejs/adapter-node`) unless the showcase deps are installed (`cd examples/showcase &&
  npm install`). CI checks out cairn-cms standalone and stays green. The svelte-check scan itself
  is 0 errors 0 warnings either way.
- Durable cross-cutting gotchas are the focused `cairn-*` memories (email send vs routing, the
  GitHub App PKCS#1 to PKCS#8 wrap, DaisyUI v5 form classes, carta-md NodeNext typing, the
  subagent model assignment, prose-guard tiers, dispatch discipline, the code-simplifier rule).
