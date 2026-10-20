# Engine pass B plan review: mechanics and feasibility

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` at `57baf01b` (re-targeted from
`a9fa3436`; the working copy matches `57baf01b`, and every line number below is `57baf01b`'s).
Lens: whether each task builds and gates as written, and whether pass B matches the seams pass A's
plan (`2026-10-08-engine-pass-pre-2b-a.md`) settles. Evidence is quoted from the source on `main`
and from probes run in the session scratchpad.

**Counts:** 0 blockers, 5 majors, 13 minors.

**Seam verdicts:** seams 1 to 5 match. Seam 6 matches in Task 2 and leaves one remnant in the close
(m6). Seam 7 does not match (M1). Seam 1 matches in intent, and its marker mechanics need one
sentence (m3).

## Majors

### M1. The live smoke keeps an owner click; pass A's Decision 14 and the spec need none (seam 7)

- **Where:** `:303` (owner-gated step 2), `:976` ("Step 6's last click"), `:1019-1020` (Close
  step 6, "Owner step, batched").
- **Defect:** pass A's Decision 14 (`pass-A:221-224`) drives the magic-link round trip in headless
  Chromium: request the link, read it from wrangler's local `send_email` file, open it, and post the
  confirm. Pass A's owner-gated list holds only fork 2, the charter phrase, and the merge. The spec
  says "neither pass needs an owner sitting" (`spec:918`). Pass B keeps Geoff's Firefox click, the
  `cairn-pass` default (`cairn-pass/SKILL.md:80-84`, `admin-smoke-test.md:112-116`). Pass A had
  already overridden that default.
- **Fold:** replace the owner bullet at `:1019-1020` with pass A's wording. The smoke agent requests
  a link, reads it from wrangler's local `send_email` message file, opens it in headless Chromium,
  posts the confirm, and lands in `/admin`. Cite pass A's Decision 14. Drop item 2 from `:300-304`,
  and change `:976` to "Step 11's merge is the one batched owner step".

### M2. The runner cannot hold a gate "floor", and the light-lane S and D gates collide with the computed tiers

- **Where:** `:88-91` (Execution mode), `:118` (S), `:119` (D), `:458-459` and `:489` (Task 2),
  `:966` (Task 11).
- **Defect:** `pass-execute.js` uses a task's `gate` only as a fallback. When
  `scripts/checks/gate-tier.mjs` exists and the task has no `gateTier` pin, the implementer runs the
  classifier's printed string (`pass-execute.js:418-421`), and `resolveGate` checks it against that
  same string (`:684-709`). Nothing enforces a floor. Two failures follow:
  - **Task 2:** a diff touching only `packages/create-cairn-site/**` classifies as `scripts`
    (`gate-tier.mjs:137-142`). That tier runs `test:component`, which is real Chromium
    (`gate-tier.mjs:58-65`). S carries `CAIRN_GATE_LANE=light`, and `gateLane` reaches every gate
    call (`pass-execute.js:404,545`). The conductor would then run a browser suite on the light lane
    and its 3G cap, which `pass-gate-economy.md` forbids.
  - **Task 11:** `packages/create-cairn-site/README.md` classifies as `scripts`, because the scripts
    rule is tested before `.md`. Any non-`.md` file under `claude/` is unclassified and defaults to
    `full`. Whichever tier results also runs on a light lane. If the diff stays docs-only, the
    computed `docs` tier is `npm run check:docs-gate` alone, and it lacks the `check:surface` and
    `check:rulings-format` that D names.
  - A `--pin` accepts only tier names (`gate-tier.mjs:173-178`). S and D are not tiers, so neither
    can be pinned.
  - The F tasks are unaffected. Each one's Files includes a path that classifies `full`:
    `wrangler.jsonc`, `+error.svelte` under `admin/`, `publish.yml`, `vite.config.ts`, and
    `hooks.server.ts` are unclassified. Tasks 6, 7, and 9 compute `engine` or higher.
- **Fold:** rewrite `:88-91` to say the computed tier rules, a task that needs a floor pins
  `gateTier`, and `gateLane` is never set on a task whose diff can reach `scripts` or above. Task 2
  and Task 11 run their computed tier on the heavy lane. Move S's extra legs (`test:emit`,
  `check:template`) into Task 2's acceptance as commands the report quotes. Move D's extra legs
  (`check:surface`, `check:rulings-format`, `check:facts`) into Task 11's acceptance the same way.
  The S4 boundary's `check:close` re-proves all of them.

### M3. Task 2's Files miss two test files, so its grep post-condition cannot pass and `scaffold.test.mjs` turns red

- **Where:** `:462-464` (Files), `:478-480` (grep), `:376-381` (S1 pre-flight list).
- **Defect:** on `main`, the narrowed pattern also hits
  `packages/create-cairn-site/src/scaffold.test.mjs:23-26` and
  `packages/create-cairn-site/src/github/repo.test.mjs:67-70`. Both are `WRANGLER_JSONC_FIXTURE`
  literals carrying `APP_DB`, `cairn-showcase-app`, and `migrations-app`. `scaffold.test.mjs:268`
  asserts `"database_name": "alpine-club-app"`, and `:270` asserts that no `database_id` survives.
  Both fail once `config.mjs:115-116` stops renaming and stripping the app database's lines. Neither
  file is in Task 2's Files or in the pre-flight list. On an `auth-data` task, an edit outside Files
  invites a reviewer `fix`, and a second `fix` stops the run (`:292`).
- **Fold:** add `src/scaffold.test.mjs` and `src/github/repo.test.mjs` to `:462` with "(their
  `WRANGLER_JSONC_FIXTURE` and the `-app` assertions)". Add both to the pre-flight bullet at
  `:376-381`.

### M4. The fork-1-open order (Task 11 before Task 10) has no defined split of ruling 5's records

- **Where:** `:209-213` (Decision 1, "Task 11 can run before it if fork 1 is still open"), `:297`
  (the stop rule), `:794-796` (Task 10's own delta), `:899-912` and `:950-955` (Task 11's
  CHANGELOG and grep acceptance), `:924-925` (ruling 5 in the re-arm items).
- **Defect:** Task 10 and Task 11 both claim the `seedContent` `Consumers must:` and migration-notes
  lines. Run Task 11 first and its acceptance demands a CHANGELOG clause for a removal that has not
  shipped. Its repoint grep for `seedContent` then hits the still-live `packages/cairn-cms-dev/README.md`
  and `docs/reference`. Its re-arm entries also name ruling 5 for two pages before ruling 5 lands.
  Either Task 11 fails its own acceptance or it records unshipped behavior. Decision 1 itself is
  sound: no S1 to S3 task needs ruling 5, S1 to S3 stay fork-free, and `pretest:e2e` rebuilds the
  dev `dist/` (`examples/showcase/package.json`, `"pretest:e2e": "npm --prefix ../.. run package"`).
  Only this reorder path is unspecified.
- **Fold:** give the records one owner each. Task 10 owns every ruling-5 record: the `seedContent`
  CHANGELOG and migration-notes lines, its facts bullets, the README and doc comment, and the ruling-5
  item on the `add-cairn-to-a-sveltekit-app` and `scaffolded-site-files` re-arm entries. Task 11
  owns the rest, excludes `seedContent` from its grep and its clause list, and only re-reads Task 10's
  lines when Task 10 ran first. State this at `:213`, and mark the `seedContent` clause at `:901-902`
  "(written by Task 10)".

### M5. Close step 2 re-runs the stock `npm test`, the known local stall, with nothing gained

- **Where:** `:980-981`.
- **Defect:** `docs/internal/durable-gotchas.md:80-100` ("The component project stalls under file
  parallelism") says the stock `npm test` hangs on this workstation while it holds the heavy gate
  lock, "do not retry the stock gate", and `cairn-run-gate` has no watchdog. `gate-tier.mjs:55-61`
  records the same stall and serializes the component project in every tier for that reason. The S4
  boundary already ran F, which runs the same projects serialized. `pass-gate-economy.md` (heavy-lock
  rule 2) forbids a second full run on an unchanged commit. On an unattended close, this step is the
  likeliest hang.
- **Fold:** "Full gate: if close step 1 changed code, F again; otherwise the S4 boundary's F
  stands. Then `cairn-run-gate 'npm run check:close'`." Pass A's close step 2 (`pass-A:1013-1015`)
  already carries the reuse clause, but it also names the stock `npm test` and carries the same risk.

## Minors

### m1. Task 0's gate-string print exits empty on a fresh branch

`:348-349`, `:111-112`. `gate-tier.mjs` diffs `--range` before it reads `--pin`, so an empty range
fails before the pin applies. Probe: `node scripts/checks/gate-tier.mjs --range HEAD..HEAD --pin
full` printed `range "HEAD..HEAD" carries no changed paths` with exit 1. At Task 0 the branch equals
`main`. **Fold:** print with `--range HEAD~1..HEAD --pin full` (any non-empty range), or with `node
-e "import('./scripts/checks/gate-tier.mjs').then(m => console.log(m.TIER_GATES.full))"`.

### m2. Task 0 opens the draft PR before the branch has a commit

`:353-354`. Item 6 pushes and opens the PR before item 7's amendment or any Ledger commit. GitHub
refuses a pull request with no commits between base and head. **Fold:** commit the Task 0 Ledger
entry on the branch first, then push and open the draft PR.

### m3. Seam 1: excluding the whole `access` member means replacing pass A's inner markers, since nested markers throw

`:171-175`, `:415-420`, `:430-431`. The emitter throws on a nested
`cairn-template:exclude-start` (`scripts/build/emit-template.mjs:12,45`). Pass A leaves the
`theme-kit` rule inside its own marker block within `access`. Wrapping only the `/admin/signups`
rule emits `access: {}`, which fails Task 1's "no `access` member" acceptance. Wrapping the whole
member nests the markers. The same task meets two more line-granular traps:
`SiteLogEvent` sits on one line (`examples/showcase/src/lib/log.ts:8`), and the `APP_DB` object's
leading comma must sit inside the block (`examples/showcase/wrangler.jsonc:34-55`). **Fold:** add to
`:430-431`: "One marker block wraps the whole `access` member and replaces pass A's inner `theme-kit`
block, since the emitter refuses nested markers. Split `SiteLogEvent` onto one line per member.
Place the comma before `APP_DB` inside its block."

### m4. No check reads `relink.json`, so its acceptance and probe prove nothing

`:198-200`, `:917-920`, `:956-958`. `git grep -l relink.json -- scripts src packages .github`
returns only a comment at `scripts/checks/docs-links.mjs:168`. Nothing parses the file, so "rejects
the extra field" cannot happen and "docs-links green" proves nothing about the file. The file already
carries `"stage": "2b"` link-repair entries, which are not page re-arm entries. The "expected: none"
probe must tell the two kinds apart. **Fold:** drop the `docs-links.mjs` clause at `:198-200` and
`:919-920`. Make acceptance one node one-liner that parses the file and asserts two things: every
hand-off page and every pass B page has a `stage: "2b"` entry with a `facts` array, and no entry has
lost a field.

### m5. Seam 4: a checkpoint STATUS rewrite can drop pass A's hand-off list before Task 11 reads it

`:52-53`, `:193-195`. STATUS is written at Task 0 and at each of S1 to S3. The hand-off list lives
only in STATUS's carry-forwards, and Task 11 reads it in S4. **Fold:** Task 0 copies the hand-off
list verbatim into this plan's Ledger, and Task 11 reads it from there.

### m6. Seam 6 remnant: close step 6 cites the stale transcripts as proof

`:1021`: "proven by its suite, its transcripts, and CI `create-site`." Decision 10 keeps the
transcripts unedited and stale, so they still show two databases and prove the opposite. **Fold:**
"proven by its unit tests (Task 2) and CI `create-site`; the transcripts are stale until the next
live capture."

### m7. Tasks 1 and 2 are disjoint in Files but not independent

`:65-67`, `:412`, `:459`. `nameWranglerResources` runs `replaceExact` on
`"database_name": "cairn-showcase-app"` and throws when that target is missing
(`config.mjs:71-79,115`). Task 1 alone makes every real scaffold throw. Task 2 alone leaves an
unrenamed app database with a placeholder id. Sequential execution in one segment hides this, and
CI `create-site` at the S1 boundary catches it. **Fold:** at `:65-67`, "Tasks 1 and 2 must land
together; neither is shippable alone (`config.mjs:115`'s `replaceExact`)." Drop **Independent**
from both tasks.

### m8. The `publish-dev` replay stops at the version guard before `npm publish --dry-run`

`:581-582`. `@glw907/cairn-cms-dev@0.98.0` is on the registry (`npm view` returned `0.98.0`), so
the job's guard exits 0 before publishing. A replay that follows the steps never reaches the dry
run. Probe: `npm publish --dry-run --provenance` runs locally on npm 11.19, so provenance is no
obstacle. **Fold:** "replay the install and build steps, then run `npm publish --dry-run --access
public` in `packages/cairn-cms-dev`, bypassing the version guard."

### m9. Task 4 does not name the `svelte` export condition

`:564`. The manifest today has `"svelte": "./src/index.ts"` beside `types` and `default`. Vite
resolves the `svelte` condition first, so a left-over `svelte` entry would resolve source that
`files` no longer ships. **Fold:** "`exports` drops the `svelte` condition (or points it at
`dist/`), and `check:dev-package` asserts every condition resolves under `dist/`."

### m10. Decision 6 adds a second copy, not one source

`:237-240`. The engine cannot read `packages/create-cairn-site/src/site-config-path.json` at
runtime. Under `read-from-the-source-rule` (`engine-rulings.md:42-50`) the copy carries the burden.
A third copy, `DEFAULT_SITE_CONFIG_PATH = 'src/lib/site.config.yaml'`, already exists at
`content-routes-settings.ts:124`. **Fold:** retitle the decision "D5's default is a pinned twin".
Cite `audit-cli-config-site-config-check`'s 2026-09-02 amendment, the sanctioned committed twin
plus sync test. Name the deletion of `:124`'s constant in the outcome.

### m11. Repeated packs at 0.98.0 into reused probe directories meet the stale-cache trap

`:443-446`, `:576-578`, `:986`. `durable-gotchas.md:21-30` says a re-pack reuses the tarball name,
and a later install can serve the old build. Tasks 1, 4, and 10 and the close all pack 0.98.0 under
`$HOME/.cache/engine-pre-2b-b/`. **Fold:** each probe gets a fresh directory and
`npm install --prefer-online`, or uses `npm run link:consumer`, which content-hashes the install.

### m12. Two small wording defects that mislead an implementer

- `:502-503`: B3 offers to add `cf-typegen` to the showcase's `package.json`. The showcase has no
  `.dev.vars.example` at its root, because its own types come from
  `--env-file=../../packages/create-cairn-site/template-repo/.dev.vars.example`. The template's
  command would therefore fail in the showcase. **Fold:** do it in `transformPackageJson` only.
- `:1016-1018`: "a Settings save on a site without `editor.nav`". The showcase declares
  `editor.nav` (`cairn.config.ts:182`). **Fold:** "a Settings save on the showcase, whose adapter
  names no site-config path after Task 9, reaches the commit path."

### m13. Decision 5's pattern misses the README line and the two comments it is meant to clear

`:478`. On `main` the narrowed pattern does not match `README.md:138` (`` `<site>-app` ``),
`config.mjs:36` (`-app,`), or `config.mjs:48` (`` `-app` ``). The task's outcome removes all three,
but the post-condition guards none of them. **Fold:** extend the pattern with
``|<site>-app|-app,|`-app` ``. Probe: on `main` it adds exactly those three hits, and nothing from
`--app-name`, `builds-app-not-authorized`, or `@octokit/auth-app`.

## Checked and clean

- **Seams 1 to 5.** Precondition 3 and Task 1 match Decision 2's inline map. Precondition 5,
  Decision 7, and Task 11 match pass A's Decisions 8 to 11: navmenuconfig, the ROADMAP narrowing
  and removal, the relink list, and the friction split. Task 2 matches seam 6.
- **Pre-flight claims at `main` HEAD.** These hold: `deploy.mjs:175`, `chapter.mjs:119`,
  `config.mjs:36,48,115`, their test lines, `README.md:138`, `cairn.config.ts:194,214`,
  `emit-template-tree.test.ts:125-130`, `manifest.ts:376`, `transformPackageJson`,
  `worker-configuration.d.ts:2`, `feed.ts:20`, `createFragmentResolver` (`delivery/data.ts:53`), no
  admin `+error.svelte`, `internal.ts:183-186,254`, `judgeSourceExclusion:73`, `concepts.ts:135`,
  `admin-dispatch.ts:33`, `fieldset.ts:21,28`, `types.ts:132`, `content-routes-settings.ts:124,200`,
  `nav-routes.ts:93,151,158`, `sanitize-schema.ts:62`, `exitCodeFor:55`, `AdminShellData:44`, and
  the functional spec `:390`. `checkSiteFacts` sits at `:577`, not `:580`, which the pre-flight
  amends.
- **B1 and the workflows.** Every workflow that consumes the dev package runs root `npm ci`, whose
  `prepare` runs `npm run package`, before it packs or installs: `test`, `e2e`, `scaffold`,
  `create-site`, `design`, `norms`, and `tsgo`. Only `publish-dev` lacks it, as Decision 2 says.
  `.gitignore`'s `dist/` covers `packages/cairn-cms-dev/dist`. The dev package's source imports
  only package names, so `dist/` resolves cleanly. `npm pack --dry-run` lists `src/*.ts` today, as
  Task 4's acceptance says.
- **Worktree trap.** Task 0, Task 4, and the close each do a from-scratch showcase install with a
  `realpath` check. `pretest:e2e` rebuilds `dist/` before every e2e.
- **The `pass-execute` args.** `t.model`, `t.gateLane`, and `t.passClass` are honored. The defaults
  `maxFix: 1` and `stopOnEscalate: true` enforce "a second fix stops" automatically. The
  ceiling arithmetic sums to 10.80M.
