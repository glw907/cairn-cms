# Newest Toolchain Before Beta (floors, majors, and the admin upgrade map)

> **For agentic workers:** execute via `~/.claude/workflows/pass-execute.js` (seven tasks, the
> first six independent of each other, the seventh a docs task that reads the others' results).
> `cairn-implementer` per task, `diff-reviewer` per diff, the full gate inside the chain. Steps use
> checkbox (`- [ ]`) syntax. No task needs a model upshift.

**Token ceiling:** 1.5M. **Checkpoint interval:** four tasks. **Worktree:** `newest-toolchain` off
`main` at `13726d57`.

**Goal (Geoff, 2026-08-21):** before the beta, push every dependency and tool a cairn site carries
to the newest stable it can run on, and set the version floors on current tooling rather than the
oldest thing that still works. The reason is the admin, not the engine: a site scaffolded on a fresh
floor stays inside its support window longer, so the person running it upgrades less often and later.
The same ruling asks for a page that tells that admin what their site depends on, when each part
moves, and what to do about it.

**What "as new as it can be" means here.** A floor is the newest line a library can ask of a
consumer today: Node 24 (Active LTS; 26 is Current until October 2026 and becomes the floor at beta
if beta lands after that). A pin is the newest stable release. Two items stay held with a trigger
rather than a date: TypeScript 7 (the ROADMAP Now entry carries the hold, the holders, and the
`svelte-check --tsgo` trigger) and nothing else after this pass.

**Evidence base (verified on `main` 2026-08-21):** `npm outdated` across the root, the showcase,
and both sub-packages lists exactly `typescript` 6.0.3 (7.0.2), `vitest-browser-svelte` 2.2.1
(3.0.0), `@types/node` 22.20 (26.2), and `@anthropic-ai/sdk` 0.105 (0.120). `engines.node` is
`>=22` in the root and `create-cairn-site`, `>=22.13.0` in `cairn-cms-dev`. Six workflow steps pin
`node-version: 22` and two pin 24. All eight `actions/checkout` and `actions/setup-node` uses are
`@v5`; the latest majors are `checkout` v7.0.1 and `setup-node` v7.0.0. The showcase and the
`templates/waymark` `wrangler.jsonc` carry `compatibility_date: 2026-05-28`. `vitest-browser-svelte`
3 peers on `vitest ^4` (installed 4.1.11) and makes `render` async; 68 test files, about 1,048
`render(` call sites. Verify each at the task that touches it.

## Task 1: Raise the Node floor to 24

- [ ] `engines.node` becomes `>=24` in the root `package.json`, `packages/create-cairn-site/package.json`,
      and `packages/cairn-cms-dev/package.json`. Every `node-version: 22` in `.github/workflows/` becomes
      `24`. `@types/node` moves to `^24` in the root, `examples/showcase`, and `templates/waymark`
      (regenerate any lockfile the repo commits; the template is emitted by
      `packages/create-cairn-site/scripts/emit-template-dir.mjs`, so change the source it emits from and
      run `npm run check:template`).
- [ ] The preflight test strings in `packages/create-cairn-site/src/preflight.test.mjs` that assert a
      `>=22` floor read the floor from the package (they already say they do) or move to 24; the test
      must still prove a below-floor Node fails.
- [ ] Docs: `docs/extend/build-a-site-by-hand.md` says Node 24 or later. `grep -rn "Node 22"` across
      `docs/`, `README.md`, and `packages/create-cairn-site` finds nothing stale.
- [ ] Acceptance: `npm run check` 0/0, `npm test` exit 0, `npm run check:template`,
      `npm run check:dev-package`, and `npm run check:docs` pass. Any `Buffer`-shaped scar from the
      `@types/node` change is fixed the way `scripts/build/emit-template.mjs` already is (see its `WATCH`).

## Task 2: Move the GitHub Actions to their current majors

- [ ] Every `actions/checkout@v5` becomes `@v7` and every `actions/setup-node@v5` becomes `@v7`, across
      all workflows including the reusable `norms.yml`. Read each action's v6 and v7 release notes for
      a breaking input or a changed default (the runner Node version, cache behavior, credential
      persistence) and keep the workflows' behavior unchanged; name what changed in the commit body.
- [ ] Acceptance: `actionlint` clean if installed, otherwise a YAML parse of every workflow; the
      `test` workflow is the proof and runs on push.

## Task 3: Take `@anthropic-ai/sdk` 0.120 and widen the optional peer range

- [ ] The root devDependency moves to `^0.120.0`. The optional peer range becomes one that today's SDK
      satisfies (`>=0.105.0 <1` or equivalent), since a `0.x` caret never crosses a minor and a consumer
      installing the current SDK for Tidy fails the peer check today.
- [ ] `src/lib/sveltekit/content-routes-tidy.ts` and its tests still pass against the new SDK's
      `messages.create` shape; if the SDK renamed anything the test fake mirrors, update the fake to the
      real shape, never the other way round.
- [ ] `docs/extend/enable-tidy.md` and `docs/reference` name the range the way the package does.
- [ ] Acceptance: `npm run check`, `npm test`, `npm run check:package`, `npm run check:reference`.

## Task 4: Move `compatibility_date` to today

- [ ] `examples/showcase/wrangler.jsonc` and the template source that emits `templates/waymark/wrangler.jsonc`
      carry `2026-08-21`. Read Cloudflare's compatibility-flags page for every flag that turned on between
      `2026-05-28` and today and name each in the commit body with whether it touches cairn.
- [ ] Acceptance: `npm --prefix examples/showcase run build` succeeds, `npm run check:template` passes,
      the integration project (workerd) under `npm test` stays green.

## Task 5: The advisory `check:tsgo` job

- [ ] A new job in `.github/workflows/test.yml` (or its own workflow) that installs
      `@typescript/native@npm:typescript@7` beside the pinned `typescript@~6`, runs
      `npx svelte-check --tsconfig ./tsconfig.json --tsgo`, and is marked `continue-on-error: true` so a
      red run never blocks. Its name says it is advisory. A green run is the signal that TypeScript 7 has
      become a bump, per the ROADMAP Now entry.
- [ ] Do not add the alias to `package.json`; install it only inside the job, so the committed lockfile
      and every other job stay on TypeScript 6.
- [ ] Acceptance: the job runs on push and its result, red or green, is recorded in the post-mortem with
      the first few lines of its output. The ROADMAP entry's "open call" sentence becomes "built, advisory,
      in `test.yml`".

## Task 6: `vitest-browser-svelte` 3 and the async `render` sweep

- [ ] Bump to `^3`. Read its 3.0 changelog first and list every breaking change in the commit body.
      Convert every `render(` call site in `src/tests/component` and any other browser-project test to the
      async form the changelog prescribes. This is mechanical across about 1,048 sites in 68 files; prefer a
      scripted codemod checked by hand over hand edits, and say which in the report.
- [ ] No test is weakened to pass: an assertion that waited on a sync render now awaits the render, and
      nothing else changes. Any test that becomes flaky under the async form is reported, not retried
      into green.
- [ ] Acceptance: `npm run check` 0/0, `npm test` exit 0 twice in a row.

## Task 7: The admin upgrade map

- [ ] A new page in `docs/admin/`, linked from `docs/admin/README.md`'s ordered list after "Is it
      working?", for the admin audience (no code, Microsoft register; read
      `docs/internal/docs-register.md` and the admin pages beside it first). It tells an admin what
      their site depends on, how often each part moves, what signal means "act now", and what to do,
      with the developer-track page (`docs/extend/upgrade-cairn.md`) linked for the how.
- [ ] The shape follows the research report the conductor supplies with the dispatch (a survey of how
      Ghost, Django, Node.js, Laravel, and similar projects document supported versions and upgrade
      cadence). The page states cairn's own promise plainly: floors sit on current tooling at beta and
      move only at a cairn major; a `Consumers must:` line in the changelog is the one signal that an
      engine upgrade needs a developer.
- [ ] The parts, at minimum: the cairn package itself, SvelteKit and Svelte, Node on the admin's
      machine, Wrangler and the Cloudflare adapter, the Workers `compatibility_date`, and the GitHub App
      key (link `docs/extend/rotate-the-github-app-key.md`).
- [ ] Acceptance: `npm run check:docs`, Vale error-free on the page, and the `cairn-register-editor`
      agent's findings folded before the task reports done.

## Out of scope

TypeScript 7 itself (held on its trigger). Node 26 as a floor (at beta, if 26 is LTS by then). A
`docs/HISTORY.md` migration of STATUS (a close-out chore for this pass per the 2026-08-21 ledger rule,
run at pass end, not a task).
