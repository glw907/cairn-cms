# Pre-B3 engine/DX slot: clear the warts B3 would bake in

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` (or
> `superpowers:subagent-driven-development`) to run this plan task-by-task. Steps use checkbox
> (`- [ ]`) syntax. Each task is a `cairn-implementer` dispatch (pinned Sonnet), test-first against
> the suite; the main loop reviews each diff and confirms the full gate before the next dispatch.
> Two tasks carry novel correctness-critical logic and name an `model: opus` upshift inline. The
> tasks are mostly independent, so the orchestration is workflow-parallelizable (see "Execution").

**Goal:** clear the small set of engine, dev-package, and first-hour DX warts that B3 would otherwise
bake into the shipped template, so B3 starts from a correct demo surface and a developer's first hour
works. This is not B3: no template content, no visual polish, no new feature surface. It is the
fix-before-bake tier from the pre-B3 dogfood plus the two owed engine carry-forwards.

**Provenance:** the task list is the fix-before-bake tier of a read-based dogfood sweep run 2026-06-25
(workflow `cairn-engine-dx-slot-dogfood`: a developer first-hour walkthrough, an editor first-post
walkthrough, and a carry-forward backlog audit). Every mechanism below was confirmed in the worktree
code, not inferred. The deferred tiers (editor-UX polish, maintainer gate hygiene, the docs rewrite,
Part C publishing prerequisites) are listed under "Explicitly deferred" so the slot stays small.

**Architecture:** three engine/dev-package fixes carry regression tests (the render pipeline, the admin
keyboard layer, the dev backend's media seed); one is a new CI gate; the rest are docs and showcase
config that make the first deploy and the first `npm run dev` actually work. The through-line is that
the showcase is the deployable starter and the dev package is what a developer runs locally, so a
defect in either is a defect every scaffolded site inherits.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, the `@glw907/cairn-cms` engine (`file:../..`),
`@glw907/cairn-cms-dev` (raw-TS dev backend), unified/remark/rehype render pipeline, Playwright,
GitHub Actions, Node 22.

**Version target:** `0.66.0`. The slot makes a public-observable render-behavior change in
`remark-figure`, adds a CI gate and a dev-package seed, and fixes an admin keyboard bug, with no
breaking change. A `0.65.1` patch bump is also defensible. Settle the bump at pass-end against
`cairn-release-process-and-versioning`.

## Global constraints

- **Worktree edits target the worktree path.** Every Edit/Write uses the worktree checkout, never the
  `main` checkout. See the `worktree-edits-target-worktree-path` memory.
- **Build the dist before testing.** Run `npm run package` (root) before any `npm test` or showcase
  build, so the dist the showcase consumes is current. See `cairn-worktree-needs-dist-build`.
- **Lockfile discipline.** A graph-changing `package.json` edit (a new script alone is not graph-changing;
  a new dependency is) regenerates and commits its lockfile in the same commit; CI installs with `npm ci`.
  See `cairn-root-lockfile-drift-npm-ci`.
- **No bare em dash in code comments** (the `house/no-em-dash-in-comments` ESLint rule over `src/lib`,
  run by `check:comments`). Engine TSDoc follows the TSDoc standard. Vale advisory findings on `docs/**`
  do not gate.
- **The emitted template must still build (the B1 rot gate).** `scaffold.yml` emits the showcase and runs
  its `check` and `build`. Any showcase change must survive emit; treat a green local emit dry-run as the
  gate (`node scripts/emit-template.mjs` to a temp dir, then its `npm run check` and `npm run build`).
- **Build-time only in the engine render path.** No client highlighter, no new client dependency in the
  reading bundle; the render changes here are mdast/hast steps that run at render/build.
- **The full gate per task.** `npm run check` (0/0), `npm test` (EXIT 0, not just a passing count),
  `check:comments`, and the new `check:dev-package` once Task 7 lands. The showcase e2e
  (`npm --prefix examples/showcase run test:e2e`) is the consumer-build gate; run it at pass-end.

## Setup before Task 1

This slot builds on Part B2 (it fixes the `/calendar` link B2 added and the Waymark sample content's
hero). **Precondition: B2 is on `main`.** Merge `feat/scaffolder-b2-design-foundation` to `main` first
(it is verified and ritual-complete), then branch this slot off `main`. If B2 is still held, branch off
the B2 branch instead and the two merge together.

Run once from the main checkout at `/home/glw907/Projects/cairn-cms` (assuming B2 is merged):

```bash
git worktree add ../cairn-cms-dx-slot -b feat/pre-b3-engine-dx-slot main
cd ../cairn-cms-dx-slot
ln -s /home/glw907/Projects/cairn-cms/node_modules node_modules
npm run package
npm ci --prefix examples/showcase
```

Baseline the gate before changing anything (all must pass): `npm run check` (0/0), `npm test` (EXIT 0),
`check:comments`, and the showcase e2e (35/35). If a baseline is not green, stop and report. All paths
below are relative to the worktree root.

---

## Task 1: lift a plain-URL figure into a semantic `<figcaption>` (engine)

The reserved `figure` directive renders a real `<figure><img><figcaption>` only when the image is a
`media:` token. A figure wrapping a plain `https://` URL gets `hName: 'figure'` but no figcaption, so
its caption stays a sibling `<p>`. B2's sample content (`the-reading-surface.md`) uses three plain-URL
`:::figure` blocks, so B3's demo surface ships figures with no caption semantics, and any consumer
using plain-URL figures hits the same gap.

**Confirmed mechanism:** `src/lib/render/remark-figure.ts`. `findMediaImage` (lines 45-56) matches an
image only when `parseMediaToken(n.url) !== null` (line 52). For a plain URL it returns `null`, so the
plugin takes the early return at line 92 (`if (!found) return;`) after setting `hName: 'figure'`, and
never reaches the figcaption stamp at line 131 (`setData(captionNode, { hName: 'figcaption' })`). The
test `src/tests/unit/remark-figure.test.ts` (around lines 85-90) asserts `<figure>` only, never a
figcaption, so the gap is unpinned.

**The fix:** generalize the caption promotion so a figure holding any image plus a following text block
stamps `hName: 'figcaption'` on that block, whether or not the image is a `media:` token. Keep the
`media:`-gated image-unwrap/rewrite logic as-is if rewriting external URLs is risky; the high-value,
low-risk half is the figcaption stamp, which should run for any image. Decide in the diff whether to
generalize `findMediaImage` to match any `image` node (and rename it) or to add a parallel
caption-find that does not require a media image. Preserve the no-image degraded state (a `:::figure`
with no image at all stays a bare `<figure>`, invents nothing, never throws).

- [ ] Add a failing test: a `:::figure` wrapping a plain-URL `![alt](https://…)` plus a caption line
      renders `<figure><img><figcaption>…</figcaption></figure>` (the caption is a `<figcaption>`, not a
      sibling `<p>`). Keep the existing `media:` figure assertions green.
- [ ] Generalize the figcaption promotion to fire for any image. Hold the `media:` unwrap behavior.
- [ ] Confirm the no-image degraded case still renders a bare `<figure>` and the reserved-name collision
      error is unchanged.
- [ ] Full gate green. Note the public-observable behavior change for the changelog and the
      `core` (or render) reference page.

**Files:** `src/lib/render/remark-figure.ts`, `src/tests/unit/remark-figure.test.ts`.

---

## Task 2: stop Ctrl+K / Ctrl+B from double-firing in the editor (engine admin)

With the cursor in the editor, Ctrl+K opens the web-link dialog and also stacks the command palette on
top; Ctrl+B bolds and also toggles the nav drawer. The two universal authoring chords both double-fire,
and the shortcuts sheet even lists Ctrl+K twice.

**Confirmed mechanism:** the card-level handler `onEditorKeydown` in `EditPage.svelte` (lines 1170-1187)
handles `b` → `format('bold')` (1179-1181) and `k` → `webLinkDialog?.open()` (1185-1187), each calling
`e.preventDefault()` but never `e.stopPropagation()`. The handler is bound to the editor card
(`card.addEventListener('keydown', …)`, line 1167) and the event bubbles to `AdminLayout.svelte`'s
`<svelte:window onkeydown={onKeydown} />` (line 251), whose handler toggles `drawerOpen` on Ctrl/Cmd+B
(lines 115-117) and calls `openPalette()` on Ctrl/Cmd+K (lines 119-121). Nothing stops the second fire.

**The fix:** add `e.stopPropagation()` in `onEditorKeydown` for every chord the editor card claims (at
least `b` and `k`, and any other Ctrl/Cmd chord it intercepts), so the more-specific editor context wins
and the window handler does not re-fire. The card handler is the correct owner of these chords while the
editor is focused. As belt-and-suspenders, consider gating `AdminLayout`'s Ctrl+K/Ctrl+B on
`!isDeskRoute` (the `$derived` already exists at line 238), but the card-level `stopPropagation` is the
primary fix and should stand on its own. Reconcile the shortcuts sheet so Ctrl+K is not listed for two
actions in the editor context.

- [ ] Add a failing regression: a Ctrl+K (and Ctrl+B) keydown dispatched on the editor card does not
      reach the window handler (the palette does not open / the drawer does not toggle). A component test
      that spies the propagation, or an e2e that asserts Ctrl+K opens only the web-link dialog, either is
      acceptable; pick the cheaper one that actually exercises the bubble.
- [ ] Add `stopPropagation` for the claimed chords; verify the editor's own bold/link still work.
- [ ] Fix the shortcuts sheet's duplicate Ctrl+K listing.
- [ ] Full gate green. This touches `/admin`, so the pass-end live admin smoke applies (a manual
      keystroke check of Ctrl+K/Ctrl+B in `wrangler dev` is the honest verification beyond the test).

**Files:** `src/lib/components/EditPage.svelte`, `src/lib/components/AdminLayout.svelte`, the shortcuts
sheet copy (`MarkdownHelpDialog` or the shortcuts data module).

---

## Task 3: seed the `hello-hero` media bytes (dev package)

The flagship sample post `2026-01-15-hello.md` declares `image: { src: media:hello-hero.00112233445566aa }`,
but the dev backend never seeds those R2 bytes, so the hero 404s in the editor preview and on the local
home. A developer's first opened post shows a broken hero.

**Confirmed mechanism:** `packages/cairn-cms-dev/src/fake-github.ts`. `SEED_MEDIA_KEYS` (lines ~225-227)
derives R2 keys from `SEED_MEDIA`, `PASS_B_MEDIA`, `PASS_C_UNREF`, and `PASS_C_ORPHAN_BYTE`. The
committed hero hash `00112233445566aa` is in none of them, and `handle.ts` seeds R2 only for
`SEED_MEDIA_KEYS`, so `GET /media/00/00112233445566aa.png` finds no object and 404s. The e2e asserts the
hero's resolved DOM and URL but never fetches its bytes, so the gate is blind to it.

**The fix:** add a `hello-hero` entry (slug `hello-hero`, hash `00112233445566aa`, ext `png`) to the seed
surface so its key (`media/00/00112233445566aa.png`) joins `SEED_MEDIA_KEYS`. The bytes are the shared
`SEED_PNG` placeholder from `fake-r2.ts`, which is enough for a 200. Keep the seed-media structure and
naming consistent with the existing `SEED_MEDIA` entries.

- [ ] Add a failing test: the dev backend serves `200` for the `hello-hero` key
      (`media/00/00112233445566aa.png`), or `SEED_MEDIA_KEYS` includes it.
- [ ] Add the `hello-hero` seed so the key resolves.
- [ ] Full gate green; the showcase e2e still passes (the existing hero DOM/URL assertions are unaffected).

**Files:** `packages/cairn-cms-dev/src/fake-github.ts` (the seed-media block), and a dev-package test.

---

## Task 4: remove the calendar (showcase)

The starter does not need a calendar. It is a demo route added to prove Mode 1 (a feature built
entirely outside cairn, beside `/admin`), but the emitted template excludes the route while the B2
chrome still links to it, so the shipped nav points at a missing page. Remove it whole: the route, the
nav links, the exclude entry, and its e2e.

**Confirmed mechanism:** the route is `examples/showcase/src/routes/(site)/calendar/+page.svelte` plus
`Calendar.svelte` (a feature that imports nothing from the engine). `.cairn-template.json:5` excludes
`src/routes/(site)/calendar`, so the emitted template drops the route. The chrome links to it
(`SiteHeader.svelte:18`, `SiteFooter.svelte:14`), and the golden-path e2e
`'a non-cairn feature coexists with the admin (Mode 1)'` (lines 456-460) navigates to `/calendar` and
asserts a Calendar heading and an Events list.

**The fix:** delete the calendar entirely.

- [ ] Delete `(site)/calendar/+page.svelte` and `Calendar.svelte`.
- [ ] Remove the `Calendar` nav item from `SiteHeader` and `SiteFooter`.
- [ ] Remove the `src/routes/(site)/calendar` entry from `.cairn-template.json`.
- [ ] Remove the `'a non-cairn feature coexists with the admin (Mode 1)'` e2e test.
- [ ] Full gate green; the emit dry-run builds clean and the emitted nav has no `/calendar`.

**Carry-forward for B3:** that e2e was the only proof of Mode 1 (build-outside-the-admin; see the
`cairn-two-extension-modes` property). B3's defaults surface adds real site-owned pages, so
re-establish the Mode-1 coexistence assertion there against real content, not a calendar.

**Files:** `examples/showcase/src/routes/(site)/calendar/` (deleted),
`examples/showcase/src/lib/components/SiteHeader.svelte`,
`examples/showcase/src/lib/components/SiteFooter.svelte`, `examples/showcase/.cairn-template.json`,
`examples/showcase/e2e/golden-path.spec.ts`.

---

## Task 5: the showcase README, a dev-flag script, and `.dev.vars.example` (first-hour DX)

A developer who clones the starter and runs plain `npm run dev`, then opens `/admin`, hits the
`config.bindings-missing` page with no signal that the fix is `CAIRN_DEV_BACKEND=1`. This is the single
biggest first-hour failure mode. The starter also ships no README and no `.dev.vars` template.

**Confirmed mechanism:** `examples/showcase/package.json` line 6 is a bare `"dev": "vite dev"`.
`hooks.server.ts:13` falls through to the real auth guard unless `CAIRN_DEV_BACKEND=1`, and `guard.ts`
renders `config.bindings-missing` on any `/admin` path when `env.AUTH_DB` is absent (the localhost
https-exemption does not extend to the bindings check). The flag is documented only in the tutorial and
the dev-package README, not where a starter developer is looking. There is no `examples/showcase/README.md`
and no `.dev.vars.example`.

**The fix:** make the obvious command work and tell the developer how it works.

- [ ] Add a `package.json` dev script that sets the flag so the dev backend just comes up. Keep the bare
      `vite dev` available too (for the production-shaped path). Name the flagged one clearly (for
      example `"dev": "CAIRN_DEV_BACKEND=1 vite dev"` with a `"dev:prod-shape": "vite dev"`, or a
      `"dev:cairn"` variant; pick the form that reads best). Add a comment that production must never set
      `CAIRN_DEV_BACKEND`.
- [ ] Write `examples/showcase/README.md`: lead with the one-command local start (the flagged dev
      script) and what `/admin` needs; name the must-edit `cairn.config.ts` fields (`backend.owner`,
      `backend.repo`, `backend.appId`, `backend.installationId`, `sender.from`) before deploy; point at
      the deploy and readiness guides; note that this is the deployable starter. Editor-facing, plain,
      Microsoft-style; keep it short.
- [ ] Add `examples/showcase/.dev.vars.example` listing the local-dev vars (`PUBLIC_ORIGIN`, a commented
      `ANTHROPIC_API_KEY` for tidy) with placeholder values, and reference it from the README. `.dev.vars`
      stays gitignored; the `.example` is committed.
- [ ] Emit dry-run builds clean. Note: the `.gitignore` → `_gitignore` emit rename (so npm pack does not
      strip it) is a Part C emit-template concern, not this slot.

**Files:** `examples/showcase/package.json`, `examples/showcase/README.md` (new),
`examples/showcase/.dev.vars.example` (new).

---

## Task 6: close the GitHub App identity trap (docs, config, and the doctor)

The deploy and readiness guides tell a developer to `wrangler secret put GITHUB_APP_ID` and
`GITHUB_APP_INSTALLATION_ID`, but the runtime commit path never reads those secrets: it reads `appId`
and `installationId` from the adapter `backend` config (cairn.config.ts). Only the private key is a
secret. Worse, the `cairn-doctor` signing self-test reads all three from env, so the doctor can go green
while a real deploy fails to sign. The pre-launch gate the design leans on is lying.

**Confirmed mechanism:**
- Runtime: `appCredentials(runtime.backend, env)` reads `appId`/`installationId` from `backend`
  (`src/lib/github/credentials.ts:29`) and only `GITHUB_APP_PRIVATE_KEY_B64` from env (line 23). The
  call sites thread the adapter backend: `content-routes.ts:660`, `nav-routes.ts:44`.
- Showcase: `cairn.config.ts:138` ships literal placeholders `appId: '1', installationId: '2'`.
- Doctor: `doctor/index.ts:77-90` reads `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and
  `GITHUB_APP_PRIVATE_KEY_B64` all from `env`, so its self-test exercises env values the runtime ignores.
- Docs: `deploy-to-cloudflare.md:68-70` and `cloudflare-readiness.md:113-115` instruct
  `wrangler secret put GITHUB_APP_ID` / `…INSTALLATION_ID`, and the binding snippets are in `wrangler.toml`
  syntax while the starter ships `wrangler.jsonc`.

**Decision (locked):** the adapter `backend` config is the single source of truth for `appId` and
`installationId`. They are not secret; they sit with `owner`/`repo`/`branch` as "which GitHub target,"
committed in `cairn.config.ts` (a site that prefers to keep them out of git threads them from a Worker
`var`/env into `backend` at config composition, which is the site's choice, not the engine's). Only
`GITHUB_APP_PRIVATE_KEY_B64` is a Worker secret. The doctor must self-test against the same source the
runtime uses, so a green doctor implies a working sign. (Alternative considered and rejected: moving the
engine read to env to match the docs. It changes `BackendConfig`, the runtime composition, and both
sites, for no gain. The docs are wrong, not the engine.)

**6a (docs + config, small):**
- [ ] Correct `deploy-to-cloudflare.md` and `cloudflare-readiness.md`: `appId`/`installationId` are
      `backend` config in `cairn.config.ts`, not Worker secrets; the only `wrangler secret put` is
      `GITHUB_APP_PRIVATE_KEY_B64`. Lead the binding snippets with `wrangler.jsonc` (matching the starter)
      and keep TOML as a secondary note if at all.
- [ ] Make the showcase `backend` placeholders obviously must-edit: a comment on `cairn.config.ts:138`
      naming where to find the App ID and installation ID and that `'1'`/`'2'` must be replaced. Pairs
      with the README must-edit list (Task 5).
- [ ] Run `check:docs` (the link/anchor gate) and the Vale advisory pass.

**6b (the doctor, `model: opus` upshift):** novel correctness logic the plan does not fully specify;
the implementer traces the doctor's manifest path.
- [ ] Make the doctor's signing self-test use the `appId`/`installationId` the runtime commit path uses
      (the adapter `backend`, via the manifest the doctor already reads for from-address/repo), keeping
      the private key from env. A green doctor must then imply a working sign. If the manifest does not
      already carry `backend.appId`/`installationId`, thread them through the `cairnManifest()` plugin
      and the doctor's manifest read.
- [ ] Add or update a doctor test that the self-test reads `appId` from the adapter source, not env.
- [ ] If 6b proves larger than a contained change, land 6a (the high-value first-hour fix) and split 6b
      to its own follow-up with a STATUS note. Do not let 6b block 6a.

**Files:** `docs/guides/deploy-to-cloudflare.md`, `docs/guides/cloudflare-readiness.md`,
`examples/showcase/src/lib/cairn.config.ts`, `src/lib/doctor/index.ts` (and the manifest plugin
`src/lib/vite/` if threading is needed), the doctor reference page, a doctor test.

---

## Task 7: add the `check:dev-package` gate

The dev package ships raw TypeScript (its `exports` point at `./src/index.ts`, no build), so a consumer
type-checks it during their own `npm run check`. The repo's own gates (`check:comments`,
`check:reference`, `check:reference:signatures`) all scope to `src/lib`, so `packages/**` is ungated
here except indirectly through `scaffold.yml`'s emit-and-check. The B1 post-mortem and the Part A and B1
STATUS carry-forwards all record this gate as owed before Part C publishes the package, and B3/B4 will
grow the dev package's content-seeding seam, so a direct gate now keeps its raw TS honest.

**Confirmed mechanism:** no `check:dev-package` script exists (absent from `package.json`, `scripts/`,
and `.github/workflows/`). `packages/cairn-cms-dev/tsconfig.json` already exists and extends the root, so
the gate is a thin wrapper.

**The fix:**
- [ ] Add `"check:dev-package": "tsc -p packages/cairn-cms-dev --noEmit"` to `package.json`.
- [ ] Extend `check:comments` (the TSDoc + em-dash ESLint gate) to cover `packages/**` if it is cheap and
      the dev package's comments pass; otherwise note it as a follow-up rather than expand scope here.
- [ ] Wire `check:dev-package` into CI (a step in `test.yml`, or the existing `scaffold.yml` job).
- [ ] Confirm the gate currently passes (the dev package type-checks clean), then prove it bites: a
      deliberate type error in `packages/cairn-cms-dev/src` fails it; revert.

**Files:** `package.json`, a CI workflow (`test.yml` or `scaffold.yml`), optionally `eslint.config.js`.

---

## Task 8: rewrite tutorial Milestone 8 around the dev package

The canonical "build your first site" tutorial's Milestone 8 predates `@glw907/cairn-cms-dev`. It tells a
developer to copy `packages/cairn-cms-dev/src/fake-github.ts` into their project, delete a `SEED_POST`
constant, hand-write a `branches` Map seed, and wire a bespoke `hooks.server.ts` that calls
`installFakeGitHub()` directly. Part A superseded all of this: the dev backend ships as an installable
package with one `devBackendHandle()` entry point, and the showcase's real `hooks.server.ts` is a
~21-line dynamic import. A developer following the published tutorial builds a fragile hand-copied fake
that diverges from the maintained package.

**Confirmed mechanism:** `docs/tutorial/build-your-first-cairn-site.md` Milestone 8 (around lines
573-672) carries the hand-copy flow and the old single-line `createCairnAdmin(runtime, { mintToken: async
() => 'dev-token' })` form, not the current dev-gated `anthropic`/`mintToken` composition.

**The fix:** rewrite Milestone 8 to match the shipped showcase: install `@glw907/cairn-cms-dev`, wire the
dev-gated `hooks.server.ts` and `cairn.server.ts` exactly as the showcase does, and drop every hand-copy
instruction. Keep the scope to Milestone 8; the broader tutorial re-reproduction and the
`create-cairn-site` "forthcoming" line (tutorial line ~19) ride with the docs-rewrite initiative, not
this slot.

- [ ] Rewrite Milestone 8 against the showcase's `hooks.server.ts` and `cairn.server.ts`.
- [ ] Drop the `fake-github.ts` hand-copy, the `SEED_POST` edit, and the manual `installFakeGitHub()`
      wiring.
- [ ] Run `check:docs`; confirm no code block references a removed symbol or a hand-copied file.

**Files:** `docs/tutorial/build-your-first-cairn-site.md`.

---

## Execution

The tasks are mostly independent: 1 (render), 2 (admin), 3 (dev seed), 4 (chrome), 7 (gate), and 8 (docs)
touch disjoint surfaces; 5 and 6 both touch `cairn.config.ts`/README copy and should land in sequence to
avoid a trivial conflict, and 6b depends on 6a's decision. The default is sequential `cairn-implementer`
dispatch with a diff review and full-gate check between each. Because most tasks are independent, this
slot is a good candidate to orchestrate with a workflow (a fan-out of the independent tasks, each on its
own `cairn-implementer`, with the main loop reviewing diffs and running the gate between merges); that is
the user's opt-in, not the default. Land Task 1 first (highest blast radius, the render pipeline every
site uses), and Task 7 early (the gate protects the Task 3 dev-package change).

## Pass-end ritual (cairn-pass)

1. **Simplify:** `code-simplifier:code-simplifier` over the changed code (skip for the docs-only tasks).
2. **Check and test:** `npm run check` (0/0), `npm test` (EXIT 0), `check:comments`, `check:dev-package`.
3. **Review gate:** fan out the relevant reviewers, `svelte-reviewer` (Task 2, Task 4),
   `web-auth-security-reviewer` (Task 6, the App-identity path), `cloudflare-workers-reviewer` (Task 6,
   bindings/secrets docs), `daisyui-a11y-reviewer` if the chrome change touches focus/contrast. An
   adversarial find-and-verify workflow is the stronger gate if the user opts in.
4. **Live admin smoke:** Task 2 touches `/admin`; verify Ctrl+K/Ctrl+B by hand in `wrangler dev` per
   `docs/internal/admin-smoke-test.md` (the keyboard double-fire is the thing to confirm gone).
5. **Docs:** update `CHANGELOG.md` and the upgrade guide for the `remark-figure` behavior change and the
   doctor change; update the affected reference pages (render/`core`, the doctor); run all four doc gates
   (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`). Append the friction
   this surfaced to `docs/internal/docs-friction-log.md`.
6. **Tracking:** append the post-mortem here; update `docs/STATUS.md` to point at B3 as the next action
   and move the now-resolved carry-forwards out of the open list.
7. **Commit** specific files per task; merge/push only on the user's go-ahead.
8. **Consumer build:** prove the showcase e2e from a clean install (or push for CI) before calling the
   slot releasable, per `cairn-0-60-e2e-dist-build-failure`.

## Explicitly deferred (keep the slot small)

These came up in the dogfood and are deliberately out of scope:

- **Editor-UX polish → a dedicated editor pass:** the list-delete one-click footgun (a real data-loss
  risk: route the `ConceptList` row delete through the `DeleteDialog` the desk uses), the blank-editor
  CodeMirror `placeholder()`, the "Pending edits" → "Needs publishing" rename, the single-entry Publish
  confirm, the Tidy label, the footer-toggle tooltips, the media-capture Name field copy, the resend
  countdown. The list-delete footgun is the top item for that pass.
- **Preview-unstyled default → B3:** wire the showcase `preview` knob at the Waymark stylesheets so the
  first preview an editor opens is styled, not bare markup.
- **Maintainer gate hygiene → a later slot:** the admin prose gate skips `docs/internal/` and
  `<script>`-level/`.ts` copy modules; audit that `check:reference:signatures` actually compares declared
  reference types against real exports.
- **Docs rewrite → the docs-rewrite initiative** (`docs/superpowers/specs/2026-06-23-docs-rewrite-content-outline.md`):
  the quickstart, the positioning/fit page, the symptom→event→fix lookup, the tutorial re-reproduction,
  the `create-cairn-site` "forthcoming" line.
- **Part C publishing prerequisites → Part C:** the emitted template's `.gitignore` → `_gitignore`
  rename, `remote: true` on the `EMAIL` binding, `compatibility_date` to the scaffold moment.
- **Site work → the per-site cutover passes:** arming `media.resolver_absent` at ecxc/907, the live D1
  admin smoke for the Part A tripwire.
- **The `csrf.checkOrigin` deprecation:** name the expected build warning in the deploy guide and the
  template comments (a one-line interim that can ride Task 6a if cheap); the real removal tracks
  sveltejs/kit#15992 and is a larger effort.
