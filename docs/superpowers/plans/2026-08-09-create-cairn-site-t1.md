# create-cairn-site Pass T1 (local half) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The local half of `create-cairn-site`: a published-shape CLI that pre-flights the
machine, prompts for the site's identity, scaffolds a branded Waymark site from the existing
template emitter, and lands the admin at the local value moment (`npm run dev`, a styled site,
a working `/admin` on the dev backend), with the dry-run frame and the out-of-scaffold state
store the spec requires. No GitHub, no Cloudflare, no network credentials: those are T2 and T3.

**Architecture:** A new standalone package at `packages/create-cairn-site/`, plain ESM `.mjs`
with `node:test` (the `scripts/` idiom, no build step). The template is baked into the package
at pack time by the existing `scripts/build/emit-template.mjs` (Reversal 2: the showcase is the
single source), then personalized at scaffold time by an exact-string substitution pass that
fails loud on showcase drift. Every side effect flows through a tiny action runner so `--dry-run`
is a property of the frame, not a per-feature flag.

**Tech Stack:** Node (floor copied from the showcase's `engines`), `@clack/prompts` for the
prompt UI (the `sv create`/C3 ecosystem standard), `node:test`, the existing emitter.

**Spec:** `docs/superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md` (Part 1
chapter 1 steps 1-3, the failure-and-state model, the dry-run ruling; Part 3 Pass T1).

## Global Constraints

- The runtime library never touches provisioning credentials; T1 touches no credentials at all.
- No secret and no tool state is ever written under the scaffold directory. State lives at
  `~/.config/cairn/sites/<id>.json`, mode `0600`.
- `--dry-run` prints every action and performs none; it is a gate, not a feature.
- git is not a prerequisite and no T1 code may shell out to it.
- Every run exit path prints a next step; no bare stack-trace terminations in the bin.
- Comments follow the repo's TSDoc-in-JSDoc `.mjs` idiom (see `scripts/build/emit-template.mjs`);
  the em dash is banned in comments (linter-enforced).
- The engine repo's full gate must stay green: `npm run check` 0/0, `npm test` exit 0, plus the
  new package's own `npm test` run from `packages/create-cairn-site/`.
- The package publishes separately and ships nothing into the engine tarball: the engine's
  `files` array is untouched, and `check:package` must stay green.

---

### Task 1: The un-agented baseline walk protocol and record

**Files:**
- Create: `docs/internal/2026-08-unagented-setup-baseline.md`

**Interfaces:**
- Produces: the recorded baseline document later tasks and Pass D cite; no code.

This task is the ROADMAP's standing requirement ("walk the tutorial's wrangler-plus-dashboard
setup cold, no agent, and record where it drags") and the spec's "before UX lock" condition.
It needs a decision only Geoff can make: whether he walks it himself (matching the persona
band is ideal), nominates someone, or explicitly downgrades to an agent-performed walk labeled
as such. **The executing session asks Geoff this one question at pass start, then proceeds
with the rest of the plan while the walk is pending; the walk must be recorded before Task 8
(the UX wiring) is dispatched.**

- [ ] **Step 1: Write the protocol into the record document**

```markdown
# The un-agented setup baseline (recorded 2026-08-__)

Walker: ____ (Geoff / nominee / agent, labeled). Environment: a machine or container with no
prior cairn checkout, no wrangler login, no gh login. Protocol: start from the root README as
a stranger would; follow docs/tutorial/build-your-first-cairn-site.md and the setup guides it
links toward a deployed site with a signed-in owner. Log every drag point as a timestamped
row: (elapsed, step, what happened, wait/act/ask classification). Stop either at success or
at the first hard wall, and say which. Do not consult the spec or this plan mid-walk.

## Log

| Elapsed | Step | What happened | wait/act/ask |
| --- | --- | --- | --- |

## Where it dragged (ranked)

## Hard walls hit

## What the tool must therefore absorb (walker's own words)
```

- [ ] **Step 2: Commit the protocol shell**

```bash
git add docs/internal/2026-08-unagented-setup-baseline.md
git commit -m "docs: add the un-agented setup baseline protocol"
```

- [ ] **Step 3: Ask Geoff the walker question (one sentence), record his ruling in the doc, and schedule the walk. The doc's log section is filled by the walker, then committed; Task 8 is blocked until it is.**

---

### Task 2: Package skeleton and bin smoke

**Files:**
- Create: `packages/create-cairn-site/package.json`
- Create: `packages/create-cairn-site/bin.mjs`
- Create: `packages/create-cairn-site/README.md`
- Create: `packages/create-cairn-site/src/args.mjs`
- Test: `packages/create-cairn-site/src/args.test.mjs`

**Interfaces:**
- Produces: `parseArgs(argv): { dryRun: boolean, yes: boolean, name?: string, tagline?: string, brandColor?: string, dir?: string, version: boolean }` from `src/args.mjs`; the `create-cairn-site` bin entry.

- [ ] **Step 1: Check the unscoped name is free**

Run: `npm view create-cairn-site version; npm view create-cairn-site-cli version`
Expected: 404 for `create-cairn-site` (name free). If taken, use `@glw907/create-cairn-site`
and record in the README that the invocation is `npm create @glw907/cairn-site`; carry the
chosen name through every later task.

- [ ] **Step 2: Write the failing test**

```js
// packages/create-cairn-site/src/args.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from './args.mjs';

test('parses flags and defaults', () => {
  const a = parseArgs(['--dry-run', '--name', 'Alpine Club', '--dir', './alpine']);
  assert.equal(a.dryRun, true);
  assert.equal(a.name, 'Alpine Club');
  assert.equal(a.dir, './alpine');
  assert.equal(a.yes, false);
});

test('unknown flag throws with the flag named', () => {
  assert.throws(() => parseArgs(['--frob']), /--frob/);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd packages/create-cairn-site && node --test src/args.test.mjs`
Expected: FAIL, cannot find module `./args.mjs`

- [ ] **Step 4: Implement**

`package.json` (versions: copy the `engines` floor from `examples/showcase/package.json`; if
it carries none, use `>=20.19`):

```json
{
  "name": "create-cairn-site",
  "version": "0.0.0",
  "description": "Create a cairn CMS site: scaffold a branded Waymark starter and run it locally.",
  "license": "MIT",
  "type": "module",
  "bin": { "create-cairn-site": "./bin.mjs" },
  "files": ["bin.mjs", "src", "template", "README.md"],
  "scripts": {
    "test": "node --test src/",
    "prepack": "node ../../scripts/build/emit-template.mjs template PLACEHOLDER PLACEHOLDER"
  },
  "dependencies": { "@clack/prompts": "^0.11.0" }
}
```

(The `prepack` line is corrected to the real bake call in Task 6; leave it as above so pack
fails loudly rather than silently shipping no template.)

`src/args.mjs` uses `node:util` `parseArgs` with `strict: true`, mapping `--dry-run`, `--yes`,
`--name`, `--tagline`, `--brand-color`, `--dir`, `--version`; wrap the util error so the
message names the offending flag. `bin.mjs` for now: parse args; on `--version` print the
package version from its own `package.json`; otherwise print `create-cairn-site: scaffolding
arrives in Task 8` and exit 0.

- [ ] **Step 5: Run tests and the smoke**

Run: `cd packages/create-cairn-site && node --test src/ && node bin.mjs --version`
Expected: PASS; the version prints.

- [ ] **Step 6: Commit**

```bash
git add packages/create-cairn-site
git commit -m "feat: add the create-cairn-site package skeleton"
```

---

### Task 3: The action runner and the dry-run frame

**Files:**
- Create: `packages/create-cairn-site/src/runner.mjs`
- Test: `packages/create-cairn-site/src/runner.test.mjs`

**Interfaces:**
- Produces: `defineAction({ title, detail, execute }): Action` and
  `runActions(actions, { dryRun, log }): Promise<{ executed: number, skipped: number }>`.
  `title` is one line ("Create directory ./alpine"); `detail` is the exact effect for the
  dry-run listing; `execute` is an async thunk. Later tasks express every side effect as an
  Action.

- [ ] **Step 1: Write the failing test**

```js
// packages/create-cairn-site/src/runner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { defineAction, runActions } from './runner.mjs';

test('dry run prints every action and executes none', async () => {
  const lines = [];
  let ran = false;
  const actions = [
    defineAction({ title: 'Write a file', detail: 'writes ./x', execute: async () => { ran = true; } }),
  ];
  const result = await runActions(actions, { dryRun: true, log: (l) => lines.push(l) });
  assert.equal(ran, false);
  assert.equal(result.skipped, 1);
  assert.ok(lines.some((l) => l.includes('Write a file')));
  assert.ok(lines.some((l) => l.includes('writes ./x')));
});

test('real run executes in order', async () => {
  const order = [];
  const actions = [
    defineAction({ title: 'a', detail: 'a', execute: async () => order.push('a') }),
    defineAction({ title: 'b', detail: 'b', execute: async () => order.push('b') }),
  ];
  const result = await runActions(actions, { dryRun: false, log: () => {} });
  assert.deepEqual(order, ['a', 'b']);
  assert.equal(result.executed, 2);
});

test('a throwing action stops the run and rethrows with its title', async () => {
  const actions = [
    defineAction({ title: 'boom', detail: 'boom', execute: async () => { throw new Error('nope'); } }),
    defineAction({ title: 'after', detail: 'after', execute: async () => {} }),
  ];
  await assert.rejects(() => runActions(actions, { dryRun: false, log: () => {} }), /boom/);
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test src/runner.test.mjs`, FAIL (module missing).

- [ ] **Step 3: Implement** `runner.mjs`: `defineAction` validates the three fields and returns
the object frozen; `runActions` iterates, logging `title` (and `detail` under dry-run), awaiting
`execute` only when `dryRun` is false, wrapping a throw as
`new Error(\`\${action.title}: \${cause.message}\`, { cause })`.

- [ ] **Step 4: Run tests** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: add the action runner and dry-run frame"`.

---

### Task 4: The state store

**Files:**
- Create: `packages/create-cairn-site/src/state.mjs`
- Test: `packages/create-cairn-site/src/state.test.mjs`

**Interfaces:**
- Produces: `siteStateDir(): string` (respects `CAIRN_STATE_DIR` for tests, else
  `~/.config/cairn/sites`), `newSiteId(name): string` (slug plus a short random suffix),
  `saveSite(id, data): Promise<void>` (writes `<dir>/<id>.json` mode `0600`, creating the dir
  `0700`), `loadSite(id): Promise<object|null>`.

- [ ] **Step 1: Write the failing test**

```js
// packages/create-cairn-site/src/state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('saves under the state dir with 0600 and round-trips', async () => {
  process.env.CAIRN_STATE_DIR = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  const { saveSite, loadSite, newSiteId } = await import('./state.mjs');
  const id = newSiteId('Alpine Club');
  assert.match(id, /^alpine-club-[a-z0-9]{6}$/);
  await saveSite(id, { name: 'Alpine Club', step: 'scaffolded' });
  const mode = (await stat(path.join(process.env.CAIRN_STATE_DIR, `${id}.json`))).mode & 0o777;
  assert.equal(mode, 0o600);
  assert.deepEqual(await loadSite(id), { name: 'Alpine Club', step: 'scaffolded' });
  assert.equal(await loadSite('missing-000000'), null);
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL (module missing).

- [ ] **Step 3: Implement** `state.mjs`. The doc comment carries the spec's rule verbatim: state
never lives under the scaffold, and no secret is ever written under the project directory.

- [ ] **Step 4: Run tests** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: add the out-of-scaffold state store"`.

---

### Task 5: Pre-flight, the credential-free half

**Files:**
- Create: `packages/create-cairn-site/src/preflight.mjs`
- Test: `packages/create-cairn-site/src/preflight.test.mjs`

**Interfaces:**
- Produces: `runPreflight({ nodeVersion, platform }): Finding[]` where a `Finding` is
  `{ check: string, ok: boolean, remedy: string }`; every failing finding's `remedy` is a
  literal per-OS instruction, never a URL alone. Checks: Node floor (compare against the same
  floor as `package.json` `engines`), loopback bindability (bind `127.0.0.1:0`, close it),
  proxy env detection (`HTTPS_PROXY`/`https_proxy` present: an informational finding naming
  the value, `ok: true`), and on `win32` an informational PowerShell execution-policy note.
  git is deliberately absent from the checks; nothing in the tool needs it.

- [ ] **Step 1: Write the failing test**

```js
// packages/create-cairn-site/src/preflight.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runPreflight } from './preflight.mjs';

test('old node fails with an upgrade remedy naming the floor', async () => {
  const findings = await runPreflight({ nodeVersion: '18.0.0', platform: 'linux' });
  const node = findings.find((f) => f.check === 'node');
  assert.equal(node.ok, false);
  assert.match(node.remedy, /nodejs\.org|upgrade/i);
});

test('current node passes and loopback binds', async () => {
  const findings = await runPreflight({ nodeVersion: process.versions.node, platform: 'linux' });
  assert.equal(findings.find((f) => f.check === 'node').ok, true);
  assert.equal(findings.find((f) => f.check === 'loopback').ok, true);
});

test('no finding ever lacks a remedy', async () => {
  const findings = await runPreflight({ nodeVersion: '18.0.0', platform: 'win32' });
  for (const f of findings) assert.ok(f.remedy.length > 0, f.check);
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL. **Step 3: Implement.** **Step 4: PASS.**

- [ ] **Step 5: Commit** — `git commit -m "feat: add credential-free pre-flight checks"`.

---

### Task 6: Bake the template at pack time

**Files:**
- Create: `packages/create-cairn-site/scripts/bake-template.mjs`
- Modify: `packages/create-cairn-site/package.json` (the `prepack` script)
- Test: `packages/create-cairn-site/scripts/bake-template.test.mjs`

**Interfaces:**
- Consumes: `emitTemplate({ from, to, engineSpec, devSpec, name })` from
  `scripts/build/emit-template.mjs` (repo root).
- Produces: `packages/create-cairn-site/template/` in the packed tarball, with `package.json`
  dependency specs pointing at the published engine (`^<version from the root package.json>`),
  and the template's name left as the emitter default (`cairn-site`; the scaffold step renames
  per site).

- [ ] **Step 1: Write the failing test**

```js
// packages/create-cairn-site/scripts/bake-template.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { bake } from './bake-template.mjs';

test('bake emits the template with published-engine specs', async () => {
  const to = new URL('../template-test/', import.meta.url).pathname;
  await bake({ to });
  const pkg = JSON.parse(await readFile(`${to}/package.json`, 'utf8'));
  assert.match(pkg.dependencies['@glw907/cairn-cms'], /^\^\d+\.\d+\.\d+$/);
  assert.ok(!JSON.stringify(pkg).includes('file:'), 'no workspace-relative specs survive');
  await rm(to, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement** `bake-template.mjs`: read the engine version from the repo root
`package.json`, call `emitTemplate` with `from: examples/showcase`, `engineSpec: '^' + version`,
`devSpec` likewise from `@glw907/cairn-cms-dev`'s current published line (read the showcase's
devDependency spec; if it is a `file:` path, resolve the version from `packages`' own metadata
the same way the scaffold CI does; fail loud if unresolvable). Export `bake({ to })`; the CLI
entry calls it with `template/`. Point `prepack` at it, replacing Task 2's placeholder line.

- [ ] **Step 4: Run tests, then prove `npm pack --dry-run` lists `template/package.json`** — PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: bake the Waymark template at pack time"`.

---

### Task 7: Prompts and the scalar substitution pass

**Files:**
- Create: `packages/create-cairn-site/src/prompts.mjs`
- Create: `packages/create-cairn-site/src/substitute.mjs`
- Test: `packages/create-cairn-site/src/substitute.test.mjs`

**Interfaces:**
- Produces: `collectAnswers(flags): Promise<{ name, tagline, brandColor, dir }>` (each flag
  short-circuits its prompt; `--yes` accepts defaults; validation: `name` nonempty, `brandColor`
  a CSS color or empty for the Waymark default); and
  `applySubstitutions(dir, { name, tagline, brandColor }): Promise<string[]>` returning the
  list of files it changed.
- Substitution is exact-string and fail-loud: each target below must be found, or the pass
  throws naming the file and the missing string (the rot gate against showcase drift). The
  implementer verifies the exact current strings against the baked template before coding and
  updates them here if the showcase has moved:
  - `site.config.yaml`: the `siteName:` line, the `tagline:` line (add the key if the template
    carries none and the answer is nonempty).
  - the theme token file (`src/theme/theme.css` in the template): the `--color-primary:` line,
    substituted only when `brandColor` was given.

- [ ] **Step 1: Write the failing test**

```js
// packages/create-cairn-site/src/substitute.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applySubstitutions } from './substitute.mjs';

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-sub-'));
  await writeFile(path.join(dir, 'site.config.yaml'), 'siteName: Waymark\n');
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, 'src/theme/theme.css'), ':root {\n  --color-primary: oklch(45% 0.15 30);\n}\n');
  return dir;
}

test('substitutes the name and brand color', async () => {
  const dir = await fixture();
  const changed = await applySubstitutions(dir, { name: 'Alpine Club', tagline: '', brandColor: 'oklch(50% 0.2 250)' });
  assert.match(await readFile(path.join(dir, 'site.config.yaml'), 'utf8'), /siteName: Alpine Club/);
  assert.match(await readFile(path.join(dir, 'src/theme/theme.css'), 'utf8'), /--color-primary: oklch\(50% 0\.2 250\)/);
  assert.equal(changed.length, 2);
});

test('a missing target string throws naming the file', async () => {
  const dir = await fixture();
  await writeFile(path.join(dir, 'site.config.yaml'), 'title: nope\n');
  await assert.rejects(
    () => applySubstitutions(dir, { name: 'X', tagline: '', brandColor: '' }),
    /site\.config\.yaml/,
  );
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL. **Step 3: Implement both modules** (`prompts.mjs`
is a thin `@clack/prompts` wrapper honoring the flag short-circuits; keep all validation in it).
**Step 4: PASS.** Also verify the real targets: `grep -n "siteName\|--color-primary" ` over the
baked template, and correct the target table above if drifted.

- [ ] **Step 5: Commit** — `git commit -m "feat: add prompts and fail-loud scalar substitution"`.

---

### Task 8: Wire the scaffold command end to end

**Files:**
- Modify: `packages/create-cairn-site/bin.mjs`
- Create: `packages/create-cairn-site/src/scaffold.mjs`
- Test: `packages/create-cairn-site/src/scaffold.test.mjs`

**Blocked by:** Task 1's recorded walk (its ranked drag points may reorder or reword the
printed next steps; fold them before dispatch, and note in the PR what the walk changed).

**Interfaces:**
- Consumes: every module above.
- Produces: the working command. Flow: parse args → pre-flight (print findings; a failing
  hard check exits with its remedy as the next step) → `collectAnswers` → build the action
  list (create dir from the packed `template/` via `cp`, rename in `package.json` to the
  slugged site name, `applySubstitutions`, `saveSite` with `{ name, dir, step: 'scaffolded' }`)
  → `runActions` honoring `--dry-run` → print the hand-over block.
- The hand-over block prints, in order: the `cd <dir> && npm install && npm run dev` value
  moment, the admin URL on the dev backend (`http://localhost:5173/admin`), the doctor line
  (`npx cairn-doctor` once installed), and one line naming what T1 does not do yet ("Going
  live, your domain, and email arrive with the next release; this scaffold is fully local.").
  Every exit path, including failure, ends with a printed next step.

- [ ] **Step 1: Write the failing test**

```js
// packages/create-cairn-site/src/scaffold.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffold } from './scaffold.mjs';

async function templateFixture() {
  const t = await mkdtemp(path.join(tmpdir(), 'cairn-tpl-'));
  await writeFile(path.join(t, 'package.json'), JSON.stringify({ name: 'cairn-site', dependencies: { '@glw907/cairn-cms': '^0.94.0' } }));
  await writeFile(path.join(t, 'site.config.yaml'), 'siteName: Waymark\n');
  await mkdir(path.join(t, 'src/theme'), { recursive: true });
  await writeFile(path.join(t, 'src/theme/theme.css'), '--color-primary: oklch(45% 0.15 30);\n');
  return t;
}

test('dry run creates nothing and lists every action', async () => {
  process.env.CAIRN_STATE_DIR = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  const dir = path.join(await mkdtemp(path.join(tmpdir(), 'cairn-out-')), 'site');
  const lines = [];
  await scaffold({ templateDir: await templateFixture(), answers: { name: 'Alpine Club', tagline: '', brandColor: '' }, dir, dryRun: true, log: (l) => lines.push(l) });
  await assert.rejects(() => access(dir));
  assert.ok(lines.length >= 3);
});

test('real run scaffolds, renames, substitutes, and saves state outside the scaffold', async () => {
  process.env.CAIRN_STATE_DIR = await mkdtemp(path.join(tmpdir(), 'cairn-state-'));
  const dir = path.join(await mkdtemp(path.join(tmpdir(), 'cairn-out-')), 'site');
  await scaffold({ templateDir: await templateFixture(), answers: { name: 'Alpine Club', tagline: '', brandColor: '' }, dir, dryRun: false, log: () => {} });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
  assert.match(await readFile(path.join(dir, 'site.config.yaml'), 'utf8'), /Alpine Club/);
  await assert.rejects(() => access(path.join(dir, '.cairn-state.json')), undefined, 'no state under the scaffold');
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL. **Step 3: Implement** `scaffold.mjs` (the
composable core the test drives) and rewrite `bin.mjs` to the full flow around it, replacing the
Task 2 stub. **Step 4: PASS**, then a real local smoke: `node bin.mjs --dry-run --yes --name
"Alpine Club" --dir /tmp/alpine-dry` prints the plan and creates nothing.

- [ ] **Step 5: Commit** — `git commit -m "feat: wire the create-cairn-site scaffold command"`.

---

### Task 9: The CI rot gate

**Files:**
- Create: `.github/workflows/create-site.yml` (mirror `scaffold.yml`'s job shape)
- Modify: `packages/create-cairn-site/README.md` (the honest install/run section)

**Interfaces:**
- Consumes: the packed engine tarballs the existing `scaffold.yml` already builds; the bin.

The gate proves the CLI's output builds, from packed artifacts, on a clean checkout: pack the
engine and dev packages, `npm pack` `create-cairn-site` (running `prepack`'s bake), install the
create tarball into a scratch dir, run
`create-cairn-site --yes --name "CI Site" --dir ./ci-site`, point the scaffold's engine specs at
the packed tarballs (the same rewrite `scaffold.yml` performs), `npm install`, `npm run build`,
and run the site's `check` if it defines one. Also run the package's own `node --test` suite in
the engine's `test.yml` alongside the existing unit jobs.

- [ ] **Step 1: Write the workflow, copying `scaffold.yml`'s checkout/pack/rewrite steps verbatim where they apply.**
- [ ] **Step 2: Push the branch and watch the run to green; a red run is worked here, not deferred.**
- [ ] **Step 3: Commit any fixes** — `git commit -m "ci: gate create-cairn-site output on a clean build"`.

---

### Task 10: Close the pass

**Files:**
- Modify: `CHANGELOG.md` (`## Unreleased`: the new package, one line, with a `Consumers must:`
  only if any engine-side change occurred; none is expected in T1)
- Modify: `ROADMAP.md` (the `create-cairn-site` item: mark the local half landed, T2/T3 next,
  per the umbrella spec)
- Modify: `docs/STATUS.md` (per the `cairn-pass` ritual: this pass's entry, next action = Pass
  T2, the walk's findings linked)

- [ ] **Step 1: Update the three documents; run `npm run check` at the repo root (the docs link gate covers the new internal doc).**
- [ ] **Step 2: Full gate: root `npm run check` 0/0, root `npm test` exit 0, `cd packages/create-cairn-site && npm test` exit 0.**
- [ ] **Step 3: Run the code-simplifier over the new package before the final commit.**
- [ ] **Step 4: Commit** — `git commit -m "docs: close the create-cairn-site T1 pass"`.

---

## Self-review notes

Spec coverage: chapter 1 steps 1-3 (pre-flight Task 5, prompts Task 7, scaffold and value
moment Task 8), the dry-run ruling (Task 3, exercised in Task 8's tests), the state-store rule
(Task 4, asserted again in Task 8), the baseline walk (Task 1, blocking Task 8), the emitter
consumption ruling (Task 6), the rot gate (Task 9). Deliberately out of T1, per the spec's
pass split: everything requiring a credential (GitHub chapter, deploy, doctor's remote checks),
the localhost console (T3 polish; T1's UX is the terminal and that is acceptable for the local
half), the agent-brief skill (rides T3 with the assistant-path work), and all docs-track work
(Pass D). Type consistency: `Finding`, `Action`, `scaffold`'s options object, and the state
shape are each defined once above and consumed by name.

---

## Post-mortem, part 1 (2026-08-09, Tasks 1-7)

**Status: partial by design.** Tasks 1 through 7 landed on `create-cairn-site`. Task 8 is blocked
on the recorded baseline walk exactly as the plan specified, and Tasks 9 and 10 follow it. Geoff
ruled at pass start that he walks the baseline himself; the protocol shell is committed and waits
for his log.

### What was built

A new `packages/create-cairn-site` (unscoped npm name verified free), plain ESM `.mjs` on
`node:test`, 43 tests. Argument parsing; the action runner that keeps `--dry-run` a property of the
frame; the out-of-scaffold state store at mode `0600`; credential-free pre-flight; the pack-time
template bake; and the fail-loud substitution pass. Task 9's `test.yml` half landed early, since it
does not depend on Task 8.

### Four plan assumptions were wrong

All four were caught by reading the code before dispatching, and all four are corrected in the
implementation rather than only noted.

1. `site.config.yaml` is at `src/theme/site.config.yaml`, not the scaffold root, and carries no
   `tagline:` key, so a tagline is an insertion.
2. `--color-primary` is **four** declarations, a light and a dark block each with a primary and a
   primary-content token. The plan's literal substitution would have written one color into both
   blocks and destroyed dark-mode contrast in every scaffolded site, with every test still green.
   The corrected pass rotates the hue and holds each declaration's own lightness and chroma,
   following the theme file's own documented re-skin recipe.
3. The Node floor is `>=22` (the engine's own), not the plan's `>=20.19` fallback.
4. `@clack/prompts` is at `1.x`, not the plan's `^0.11.0`.

The lesson generalizes past this plan: a plan's concrete paths and versions rot on the same clock
as its build mechanisms, and the existing "verify a plan's locked build assumptions" rule should be
read to cover them.

### Two defects found outside the plan's scope

**The shared emitter shipped showcase-only material into every scaffolded site**: seven tracked
`.claude/agent-memory` notes, the showcase README (whose relative links point back into the engine
repo), a design-lab script, and the Playwright scripts and devDependencies. Fixed as Task 6b
(a split of the plan's Task 6): three path exclusions in `.cairn-template.json`, plus package.json
pruning in the bake behind a rot gate, since a path exclusion cannot reach a line inside a kept
file. This affected `scaffold.yml`'s output too, so it predates this pass.

**`npm run test:emit` ran in no CI workflow.** Nine tests over the emitter existed and were never
gated. Wired into `test.yml` alongside the new package's suite.

### The release-one blocker

`@glw907/cairn-cms-dev` is unpublished (npm 404, version `0.0.0`). A scaffolded site needs it for
the local `/admin` value moment, and the ROADMAP's own 2026-07-02 scaffolder finding records that a
standalone scaffold without it fails the **build**, since Rolldown cannot resolve the absent
specifier even behind the dev gate. Release one must therefore publish the dev backend alongside
the engine, the tool, and the template repo. The bake refuses to run while the spec resolves to
`^0.0.0`, naming the package and the fix, so the cut cannot silently skip it.

### Review findings folded

The main loop caught and fixed four defects in dispatched work before committing: `parseArgs`
naming the first dash-token rather than the offending flag; a pre-flight remedy rendering as
"Node.js >=22 or later is required"; `assertInstallableSpec` matching `0.0.0` as a substring, so
`^10.0.0` and `^20.0.0` failed a gate they should pass; and the brand substitution throwing only
when *zero* declarations matched, so half-drift would have rotated the light block alone. The
`code-simplifier` pass caught a fifth: the bake CLI resolved `--to template` to `packages/template`,
outside the package that must ship it, unobservable only because `prepack` dies earlier on the
unpublished dev backend.

### Gate

Package suite 43 passing, exit 0. Root `npm run check` 0 errors 0 warnings. Root `npm test` 412
files / 5273 tests. `test:emit` 9 passing. All nine repo gates green, including the four CI-only
ones the local ritual skips (`check:comments`, `check:reference:signatures`, `check:surface`,
`check:snippets`).

### Sizing note

One task split (Task 6 into 6a and 6b), which is the first of the pass and below the threshold that
would argue for splitting the pass. The pass stopping at Task 7 is the plan's own design, not
accretion.

---

## Post-mortem, part 2 (2026-08-10, Tasks 8-10)

**Status: the pass is complete.** All ten tasks landed on `create-cairn-site`, PR #25 open and
unmerged. The pass ran on the existing worktree, per its resume prompt, and never branched again.

### The baseline walk, and the ruling that changed it

Task 1's record was still an empty protocol shell at resume: `git log --all` showed one commit ever
touching the path, and the Log, ranked, and hard-walls sections were blank. The resume prompt
assumed a recorded walk, so this was the pass's one genuine unknown. Rather than block with nothing
delivered, the session ran a labeled provisional agent walk as a substitute input and said so.

Geoff then made the ruling that mattered: "a well-tuned persona agent run several times fresh from
several vantage points is probably more effective than I'll be." Task 1's own third option allows
exactly this, on the condition it is labeled. Five blind persona walks ran (owner-nondev,
dev-new-to-stack, going-live, recovery, wayfinding), each required to evidence every finding with a
`file:line` quote and barred from reading `docs/superpowers/`. Two of them went beyond reading and
reproduced steps live against the real registry and the current toolchain.

**The method earned its keep in a way one walk could not.** Ranking by agreement, not by any one
reader's taste, is what made the record actionable: five of five stopped at the unpublished
`@glw907/cairn-cms-dev`, four of five raised the Workers Paid plan surfacing three guides deep, and
three of six raised `base64 -w0` failing on macOS. The two live reproductions found a defect
invisible to a reader: current `sv create` sets the adapter in `vite.config.ts`, so the tutorial's
`svelte.config.js` edit is a no-op that `adapter-auto` silently overrides. That belongs to Pass D,
and it would not have surfaced from a careful read at all.

### The walk changed the plan, which is what it was for

The plan specified Task 8's hand-over block as `cd <dir> && npm install && npm run dev` pointing at
`/admin`. Two walks flagged that the tutorial itself never runs bare `npm run dev`. Verified in code
rather than taken on trust: the dev backend needs `CAIRN_DEV_BACKEND=1` at runtime
(`examples/showcase/src/chassis/dev-gate.ts:26`) on top of the build-time define
(`examples/showcase/src/hooks.server.ts:18`), and the emitted `dev` script is bare `vite dev`. **The
plan's own copy would have shipped a command that does not work.** Corrected on three counts: the
working command, branched to the PowerShell form on Windows; the local admin named as a stand-in
that touches no GitHub repo and sends no real email; and the deferral split, since a domain, a
Cloudflare zone, and a paid plan for email is different news from "more setup exists." A test locks
the switch into the copy, so a later simplification back to the bare command fails loudly.

The cleaner fix, setting the variable inside the scaffolded `dev` script, is deliberately NOT in
this pass. It belongs to the template rather than the printed copy, needs a cross-platform mechanism
the template does not carry, and the opt-in is a runtime variable precisely so no build can fold it,
which is what keeps the dev package out of a deployed Worker. Filed to the friction log for T2.

### Defects found in dispatched work

One, caught in main-loop diff review: after a `--dry-run` the CLI still printed "Your site is
scaffolded at ...", having created nothing. It was visible in the implementer's own pasted smoke
output and reported as a pass. The same class of lie the walk had just corrected in the block's
other lines, so it got the same treatment: a `dryRunNotice` that says what actually happened, and a
test asserting it never claims otherwise.

The implementer also corrected two things on its own initiative, both right: the plan's Task 8 test
fixture wrote `site.config.yaml` at the fixture root, where `applySubstitutions` reads
`src/theme/site.config.yaml`, and it fixed the fixture rather than bending the code to it. And an
absolute `--dir` would have printed `.//tmp/alpine-dry` through the literal `./<dir>` form.

### Task 9's shape was not what the plan assumed

The plan said to pack `create-cairn-site` with `npm pack`, running `prepack`'s bake. That cannot
work today and the reason is by design: the bake refuses a `file:` spec and refuses a `0.0.0`
version, both of which name something no registry can install, and `@glw907/cairn-cms-dev` is still
unpublished. So `prepack`'s default path is unrunnable until the dev backend publishes, and CI bakes
explicitly with the engine's real version standing in for both specs, packs with `--ignore-scripts`,
and rewrites the scaffolded site's specs to the packed tarballs afterward. The gate proves what it
is for, that the CLI's output builds; the specs a published bake writes are covered by the bake's
own unit tests. One risk was checked before writing the workflow rather than after: the package's
`.gitignore` lists `template`, and `files` wins, so the baked template does ship (90 entries).

### The new gate caught a real defect on its first run

`create-site.yml` went red immediately, and on something no other gate in this repo could have
found. **Every scaffolded site given a tagline failed to build.** The substitution pass, landed in
this pass's first half, inserted a `tagline:` key into `src/theme/site.config.yaml`; the engine
validates its top-level keys and throws on unknown ones (`src/lib/nav/site-config.ts:293`, `:337`),
so `cairn-manifest` refused the config at build time.

**Why every other gate missed it is the lesson.** The substitution pass has thorough unit tests, and
they pass, because they substitute into synthetic fixtures and never build. The plan's own Task 7
specified the behavior ("add the key if the template carries none"), so the implementer built what
was asked. The real-template smoke this pass ran by hand checked that the key appeared, not that the
result compiled. A fixture proves a string was written; only a build proves the string was allowed.

Fixed by using the key the engine already has rather than adding one for the CLI's benefit: the flag
is `--description`, the prompt asks for a description, and the value lands in the site config's
existing `description` field. Adding `tagline` to the engine schema would have been engine surface
grown to serve a prompt, which the charter rules out. The rename cost nothing because the package is
unpublished.

### Verification

Beyond the suites, a real end-to-end scaffold ran against the actual baked template, which no test
covers, since the fixtures are synthetic. It renamed the package, inserted the site name and
description, and rotated all four `--color-primary` declarations to the requested hue while each
held its own lightness (45% light, 74% dark), so the dark-mode contrast trap the first half of this
pass fixed stays fixed. State landed in the store, nothing under the scaffold. After the fix, a
scaffolded site was installed against locally packed engine and dev tarballs and **built clean**,
which is the check whose absence let the `tagline` defect ship in the first place.

Package suite 55 passing, exit 0. Root `npm run check` 1601 files, 0 errors, 0 warnings. Root
`npm test` 412 files / 5274 tests, exit 0. All nine repo gates green, including the four CI-only
ones the local ritual skips (`check:comments`, `check:reference:signatures`, `check:surface`,
`check:snippets`). On CI, `test`, `e2e`, `design`, and `scaffold` passed; `create-site` failed on
the defect above and is green after the fix.

### The review gate found the same defect a third time

None of the four standing reviewer agents fits a Node CLI, so the gate ran as an adversarial
find-and-verify over three lenses: correctness and failure modes, "does it lie?", and "can the CI
gate pass vacuously?". Seven findings, five confirmed after a skeptical verification pass that
defaulted to refuting.

**The "does it lie?" lens was aimed at this pass's own record, and it paid.** Its single finding was
that `SITE_README`, the README baked into every scaffolded site, still told the reader `npm run dev`
would give them a working `/admin`. The CLI's printed block and the package's own README had both
been corrected; the copy that ships inside the product had not. Three instances of one defect in one
pass, each in a different file, is the argument for running a lens at the class rather than
re-reading the diff.

**The gate lens caught an assertion that could never fail.** Both the new CI job and one of Task 8's
tests asserted that `.cairn-state.json` does not exist inside the scaffold. `state.mjs` writes
`<state dir>/<slug>-<random>.json` and can never produce that name, so the check passed regardless,
including if state really had landed in the scaffold. This is the second time this repo has shipped
a check that cannot match; `scaffold.yml` carries a "Gate self-test" step and a comment about the
first. Both are replaced with an assertion that pins `CAIRN_STATE_DIR`, then proves both halves: the
record exists there, and no file of that name exists anywhere under the scaffold. The implementer
confirmed it is not vacuous by deliberately leaking a state file into the scaffold and watching the
new assertion fail.

Also folded: a failing state save aborted a scaffold that had actually succeeded, and the retry then
hit the non-empty-directory guard and told the user to delete a working site. The record is
bookkeeping, so its failure is now a warning and the run completes. And a `--dir` pointing at a file
leaked a raw `ENOTDIR` instead of the crafted guidance its sibling guards give.

One verified finding is deliberately not fixed: the check-then-copy between the empty-directory
guard and the copy is not atomic, so two concurrent invocations against one `--dir` can both pass
the guard and collide. Real, exotic, and filed rather than fixed.

### Sizing note

Two task splits across the whole pass (Task 6 into 6a/6b in part 1, none in part 2), below the
threshold that would argue for splitting the pass. The pass carried one addition its plan did not
name, the friction-log and ROADMAP entries for what the walk found, which is Task 10's own
documentation dimension rather than new scope.
