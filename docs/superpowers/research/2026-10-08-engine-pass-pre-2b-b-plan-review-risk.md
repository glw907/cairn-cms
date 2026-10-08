# Pass B plan review: domain risk

**Target:** `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` at `57baf01b` (re-targeted
from `a9fa3436`; every finding below was checked against `57baf01b`, and line numbers are its own).
**Spec:** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`.
**Lens:** domain risk. The lens covers the scaffold, the dev backend, the published packages, and
security.
**Code read on:** `main` at `57baf01b` (pass A not yet merged; findings that depend on pass A's
seams say so).

Scope rule applied: only correctness, security, and data-loss gaps, plus over-ceremony. Findings
are ranked by consequence within each severity.

**Counts:** 0 blocker, 4 major (one marked OWNER FORK), 6 minor (two marked OWNER FORK).

---

## Major

### M1. The C5 floor is bypassed when the callback returns no `tagNames` array

- **Where:** plan `:711-715` (C5 outcome), `:722-726` (C5 acceptance).
- **Defect:** the floor is specified as "remove `script` from `tagNames`, union `strip`". In
  `hast-util-sanitize` (`node_modules/hast-util-sanitize/lib/index.js:367-370`), an element is safe
  when `!state.schema.tagNames || state.schema.tagNames.includes(name)`. The `strip` list is read
  only for an element that is not safe (`:390-393`). A callback that returns
  `{ ...defaults, tagNames: undefined }` (or `null`) admits every tag. That includes `script`, and
  `strip` never runs. A natural implementation (`tagNames?.filter(t => t !== 'script')`) leaves
  `undefined` in place, and the three acceptance cases all pass.
- **Failure scenario:** a site loosens its schema by dropping the allowlist and keeps everything
  else. Author `<script>` in raw markdown reaches every public page. That breaks the promise
  `render.md` and the `Consumers must:` line will state: "a `sanitizeSchema` callback can no longer
  allow `<script>`".
- **Fold:** add to C5's outcome: "When the callback's result carries no `tagNames` array, the
  engine throws at renderer construction with a message naming `sanitizeSchema`. An absent
  allowlist admits every tag, and no floor holds over it." Add one acceptance case: a callback
  returning `tagNames: undefined` throws. Leave `unsafeDisableSanitize` as the documented way to
  turn the floor off.

### M2. Ruling 5's "no fixture reaches a real site" and "nothing writes to disk" are proven only for the entry list and a save

- **Where:** plan `:799-802` (outcome), `:827-845` (acceptance).
- **Defect, part 1 (fixtures leak):** the outcome moves only "the module-level seed post"
  (`fake-github.ts:42-47`) into `'fixtures'`. `devBackendHandle` also calls four seed functions
  and one R2 seed at construction (`packages/cairn-cms-dev/src/handle.ts:83-109`). Those write the
  fixture `src/content/.cairn/media.json` (`fake-github.ts:282`), the fixture manifest (`:370`), and
  the fixture site config at `src/theme/site.config.yaml` (`seedVocabulary`, `:494`, `:539`). They
  also write a preview-twin post (`:658`) and two seeded branches. The acceptance checks only the
  manifest-driven entry list. Suppose a seed lands in the `main` overlay in `'repository'` mode. The
  list test catches the manifest. It does not catch the site config or `media.json`, which then
  shadow the developer's real files in Settings, Tags, the nav editor, and the Library.
- **Defect, part 2 (no-write proof):** "leaves the file's bytes and mtime untouched" (`:830`)
  covers only a save. A delete, a rename, a publish, a Settings or nav save, and a media upload are
  never checked against disk.
- **Failure scenario:** under fork 1 "Yes", the dev admin shows fixture tags and fixture media over
  a real site, and a Settings save carries fixture vocabulary into the overlay. Under "No"
  (`:847-858`), the same publish writes fixture config and fixture `media.json` over the
  developer's real files. That is data loss in the working tree.
- **Fold:** one sentence in the outcome: "Every seed (`seedMediaLibrary`, `seedFragments`,
  `seedVocabulary`, `seedPreviewTwin`, the seeded branches, and the R2 `SEED_MEDIA_KEYS` bytes)
  runs only in `'fixtures'`." Add one acceptance case: at construction in `'repository'`, reads of
  the site config and `media.json` return the disk bytes, and no `cairn/*` branch exists. Add
  another: a snapshot of the temp tree (paths, bytes, mtimes) is identical before and after a
  sequence of save, delete, rename, branch create, publish, Settings save, nav save, and upload.

### M3. The stop rules let a security-floor gap, or a defect that survives its fix round, through unattended

- **Where:** plan `:278-279` (conductor accepts a second `fix` with all-`coverageOnly` findings on
  a non-`auth-data` task), `:292` (stop only on an `auth-data` second `fix` "with a behavior
  defect"), `:96-97` (an Opus upshift on a second `fix` for C5 or Task 10).
- **Defect:** C5 is the pass's one public-page XSS floor, but Task 8 is `engine-logic`. A second
  `fix` on C5 whose findings are `coverageOnly` falls under `:278`. That covers a missing mutation
  proof, or a missing case like M1's. The conductor can then accept it alone, with the notes
  batched. On Tasks 2 and 5, a second `fix` whose findings are only coverage (for example, the
  mutation proof not run) is in neither the accept list nor the stop list. On any task, a behavior
  defect that survives one fix round gets a third round (`:96`) rather than a stop.
- **Failure scenario:** the C5 floor merges with a coverage hole on its security case, and no one
  reads it before the close's reviewer fan-out. If that reviewer misses it too, it ships.
- **Fold:** replace `:292` with: "a second `fix` with any blocking finding, coverage included, on
  Task 2, Task 5, or Task 8's C5 item; a second `fix` carrying a behavior defect on any task; or a
  third `fix` on any task." Narrow `:278` to exclude Task 8's C5 item. Recast `:96-97` so the Opus
  upshift is the resume path Geoff approves after the stop, not an unattended third round.

### M4. Fork 1's "No" branch is under-constrained for the developer's disk (OWNER FORK)

- **Where:** plan `:847-858`, and fork 1's question at `:262-267`.
- **Defect:** the "No" rewrite lets dev-admin publishes write the working tree. It names atomic
  per-file writes and the R2 broken-asset problem. It misses three data and security hazards that
  arrive with disk writes:
  1. **Stale overwrite.** The commit's `expectedHead` is the in-memory head. The developer's own
     edits in their editor never move it. A dev-admin publish built from an earlier read overwrites
     an on-disk edit made since, with no conflict.
  2. **Unauthenticated LAN write.** The dev handle's host tripwire fires only when
     `CAIRN_DEV_BACKEND` is on the Worker env (`handle.ts:39-42`, `:131`). Under `vite dev` the
     opt-in lives in `process.env` (`examples/showcase/src/chassis/dev-gate.ts:31-36`), so
     `npm run dev -- --host` serves the owner-session admin to the LAN with no host check. Under
     "Yes" that exposes an in-memory toy. Under "No" it is an unauthenticated write into the
     developer's working tree.
  3. **Orphaned media rows.** A dev upload's bytes stay in the fake R2, but its `media.json` row
     publishes to disk. That row then gets committed and deployed, so the production site
     references an asset that was never uploaded.
- **Failure scenario:** a developer under "No" loses an editor-side edit, or deploys broken image
  references.
- **Fold:** a risk-acceptance call for Geoff, so it is marked OWNER FORK. Add the three hazards to
  fork 1's question as the cost of "No". If Geoff rules "No", the rewrite carries three
  constraints. Each disk write compares the target's current bytes with the bytes the commit was
  built from and refuses on a mismatch. The host refusal applies under `vite dev` whenever the
  handle is mounted. A dev upload is refused under the dev backend, or its bytes go to local R2.
  The rewritten Task 10 also takes `auth-data`'s mutation proof and stop rule, since it writes user
  data.

---

## Minor

### m1. Nothing at the package level stops an empty `@glw907/cairn-cms-dev` publish

- **Where:** plan `:559-587` (Task 4), Decision 2 (`:214-218`).
- **Defect:** Task 4 fixes `publish.yml`'s `publish-dev` job and proves it with a dry-run replay,
  which closes the CI path. The package itself still publishes whatever `dist/` holds. With
  `files: ['dist', 'README.md']` and no `dist/`, a hand publish from `packages/cairn-cms-dev`
  publishes an `exports` map pointing at missing files. The first dev publish was a hand publish
  (`publish.yml:88-93`), and the `cairn-release` skill has no tarball check for this package.
  Published versions are immutable.
- **Fold:** a `prepack` script in the dev package that exits non-zero when `dist/index.js` or
  `dist/index.d.ts` is missing. It checks and never builds, so npm's workspace-`prepare` ordering
  problem does not apply. Add one `check-dev-package` test case for it.

### m2. C5's acceptance can pass while script text or a shared nested array leaks

- **Where:** plan `:722-726`.
- **Defect, part 1:** in `hast-util-sanitize`, an unsafe element not in `strip` keeps its children
  (`index.js:391`). Suppose `script` leaves `tagNames` but the `strip` union is dropped. The
  `<script>` element goes, and its JavaScript source renders as visible page text. "Output with the
  script stripped" can pass on an element-only assertion, and the mutation proof covers only the
  `tagNames` removal.
- **Defect, part 2:** the isolation case mutates only `strip`. A shallow copy of `strip` alone
  passes it, while a callback that mutates a nested array of the base (for example
  `protocols.src`) still reaches the module default. The post-dispatch sink guard catches that case
  today, but the outcome promises "no module default is reachable".
- **Fold:** assert that the script's body text is absent from the output, and add a second mutation
  proof that drops the `strip` union. Make the isolation case mutate a nested non-`strip` array.

### m3. B7's "both plugin orders" case needs Vite's real config merge

- **Where:** plan `:618-621`.
- **Defect:** a unit test that calls the `config` hook directly sees only an already-merged
  config, which proves only the order where the site's define comes first. In the other order
  (engine first, site plugin second), the site wins only through Vite's `mergeConfig`, and a
  direct-call test never exercises that. A wrong guard could flip a site's hardened `false` to
  `true`.
- **Fold:** run the order cases through `resolveConfig` with both plugin arrays. That starts no
  server, so the nested-server gotcha does not apply. Assert the resolved `define`.

### m4. A cross-version resume leaves an older scaffold's `APP_DB` unmigrated

- **Where:** plan `:456-489` (Task 2).
- **Defect:** suppose a site was scaffolded by the current `create-cairn-site`, so its
  `wrangler.jsonc` carries a named, id-less `APP_DB`. If its owner then resumes with the new
  version (`npx` fetches the newest one), `applyMigrations` runs `AUTH_DB` only
  (`deploy.mjs:175`). The deploy still auto-provisions the `APP_DB` database, and the shipped
  Signups route then reads a database with no table.
- **Fold:** the leanest proof is for `MIGRATION_DATABASES` to come from the site's own
  `wrangler.jsonc` D1 bindings that carry a `migrations_dir`. Otherwise, accept the window and
  file it in the friction log with the stale transcripts. That second option is a risk-acceptance
  call (OWNER FORK, low stakes).

### m5. The close smoke claims a Settings save "on a site without `editor.nav`", but the showcase has one

- **Where:** plan `:1016-1018`.
- **Defect:** the smoke runs on the showcase, whose adapter declares `editor.nav`
  (`examples/showcase/src/theme/cairn.config.ts:182` at plan time). So D5's no-nav case is not the
  path the smoke exercises, and the evidence line would overstate what was proven. Task 9's
  integration test is the real proof.
- **Fold:** reword to "a Settings save reaches the commit path through `editor.siteConfigPath`".
  Alternatively, run that one leg on the close's fresh bake, if its adapter carries no nav.

### m6. Over-ceremony: the Firefox magic-link click proves nothing pass B changed (OWNER FORK)

- **Where:** plan `:303`, `:1019-1020`.
- **Defect:** no pass B task touches the magic-link path. Task 2 changes provisioning, which runs
  without a live Cloudflare run. Task 5 is proven by the unauthenticated `/admin` redirect at
  `:1014-1015` and by the bundle grep. The click spends one attended owner step to re-prove pass A's
  surface.
- **Fold:** drop the click and record why in the close evidence. Keeping it because the
  `auth-data` class mandates a live smoke is a process call for Geoff.

---

## Checked, no finding

- **The dev backend reaching production.** The three-layer fence is unchanged. It holds the define
  at each call site, the devDependency boundary, and the host tripwire with its 503. Task 5 keeps
  the expression, and the `wrangler deploy --dry-run` grep both ways stays in Tasks 4 and 5 and on
  CI `e2e` and `scaffold`. A workerd throw at construction in `'repository'` fails closed. An
  absent define (a broken hook) is a `ReferenceError` at module load, also closed.
  `navigator.userAgent` detection only refuses. A miss falls through to a request-time
  `node:fs` failure, which is loud.
- **The notice and the CI baselines.** Decision 3 limits the notice to `'repository'`. The showcase
  pins `'fixtures'` in both `npm run dev` and the e2e build. The final F `test:e2e` runs
  `admin-visual` after `check:package` rebuilds `dist/`, so the baselines are proven against
  current code.
- **Stranded `APP_DB` on an existing site.** The engine, `tool/`, and `scripts/` never reference
  `APP_DB`, and Ruling 2 is template-only.
- **CI coverage of Task 2's naming rewrite.** `nameWranglerResources` runs at scaffold time
  (`scaffold.mjs:171`), and CI `create-site` scaffolds from the real baked template. A mismatch
  with Task 1's `wrangler.jsonc` goes red at the S1 boundary, even though `config.test.mjs`'s
  "verbatim" copy has already drifted (it lacks the `dev` block).
- **D5 silently dropping a menu.** All five consumer sites keep `editor.nav.configPath` at the
  canonical `src/theme/site.config.yaml`, and they declare it as an inline literal, so TypeScript's
  excess-property check flags the removed member. A wrong path makes the save return a loud 404
  (`nav-routes.ts:152`).
- **B7's security relevance.** The `auth-data` class is right: the define decides whether the
  owner-session mint compiles into the Worker. The mutation proof, the dry-run grep, the security
  reviewer, and the unauthenticated-redirect smoke cover it.
