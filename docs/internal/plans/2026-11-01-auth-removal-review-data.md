# Auth removal plan review: data integrity and failure risk

Target: `2026-11-01-auth-removal-plan.md` and `-design.md` at `31611653b`. Lens: crash, concurrency,
partial write, upgrade, restore, silent corruption, security weakening. GitHub's docs were read, and no
credential was used.

Result: 0 blockers, 4 major, 6 minor. Findings run in order of consequence. Line numbers are at
`31611653b`. Nothing here can lose or corrupt content, and no path admits an unknown address. The major
findings are a wrong recovery step, a wrong standing answer, recipe facts lost with the deleted section,
and a silent first-owner lockout.

## Findings

### 1. A 422 means more than an uncovered repository, and the recovery path says to replace the key

- **Severity:** major
- **Tag:** `correctness`
- **Location:** plan T2, `:143-149`; `design.md` "Calls made here", first bullet; `docs/admin/rotate-the-github-app-key.md:114-116`; `src/lib/sveltekit/health.ts:80-85`; plan T8 `:385-388`
- **Defect:** the T2 body adds a second reason for a 422 that the design doesn't name. GitHub's page says
  "The installation access token cannot be granted permissions that the app was not granted", and its
  one validation status is 422. So an App with Contents read-only would also reach this class, which is
  an inference from the docs, like the design's own. That App reads content today, and after T2 every
  read fails too, because every token now comes from the failing mint.

  A renamed repository is a third case. `repo` is a bare name, and `/repos/{owner}/{old}` follows GitHub's
  redirect today, so a site with a stale `repo` value works now. After T2 that stale name goes in a
  validated body, so an outage at upgrade or at a later rename is likely. Both cases read as "no longer
  includes the site's repository".

  The failure a plain `/healthz` can't see is worse. It reports `ok: true` while a `scope: 'shell'` record
  carries `failed: 422`, and step 3 of Recover then sends the owner to roll back the key or generate a
  third one. Rotating a key is the wrong and riskier fix. T2 adds its sentence at line 74, which never
  reaches that step.
- **Proposed fold:**
  - Rename the class to `token_scope_refused`, whose doc comment says GitHub refused the mint's
    repository or permission request.
  - Give Recover a new step ahead of step 3: on status 422, compare the adapter's `repo` with the
    repository's current name, confirm the installation includes it, and confirm the App holds Contents
    read and write. State that the key is not at fault.
  - Update the "anything that is not a 401, 403, or 404" comment at `health.ts:80`.
  - Name the rename and permission cases in T8's `Consumers must:` line.

### 2. The workflows standing answer would break every Contents-only App. **OWNER FORK**

- **Severity:** major
- **Tag:** `correctness`
- **Location:** `design.md:85-88`; plan T8 `:392-394`; `packages/create-cairn-site/src/github/manifest.mjs:59-62`; `skills/cairn-extending-a-site/references/adopt-cairn.md:96`
- **Defect:** the design calls adding `workflows: 'write'` to the mint "a one-line change". There are two
  kinds of App. A scaffolded App holds `contents`, `administration`, and `workflows`. The App that
  `adopt-cairn.md` teaches holds Contents alone. Asking for a permission the App lacks is refused, as in
  finding 1, so the one-line fix would stop every mint on an adopted site. The rc.2 install proves only
  the scaffold's App, so nothing would show this.

  The regression the design guards against is also specific to scaffolded Apps, which hold `workflows`
  today and lose it at T2. An adopted App sees no change. The design's reassurance that `createBranch`
  points at "a commit already in the repository" is also narrower than it reads. It's safest when
  `branch` is the default branch. A site whose content branch differs from it by a workflow file is
  unproved, by inference from the "additional permissions" mark.
- **Options:**
  - A: a refusal at rc.2 stops for Geoff, who is at that sitting, with the cause in hand. No fallback is
    written now.
  - B: the fallback drops `permissions` and keeps `repositories`. This works for both kinds of App, but
    the token regains `administration: write` on that repository.
  - C: add `workflows: 'write'` behind a new option. This adds surface to a contract meant to stay narrow.
- **Recommendation:** A. It costs a sentence, and the owner is present when it could fire. Under any
  option, replace the design's standing answer and T8's backlog text, and say that the install proves
  only the scaffold's App.

### 3. T1's carry-over list loses security facts that T3 then deletes

- **Severity:** major
- **Tag:** `correctness`
- **Location:** plan T1 `:99-102`, `:111-113`; plan T3 `:231-232`; `second-sign-in-group.md:21,65,69,72,74-75`; `src/lib/sveltekit/guard.ts:395,416,459`; `src/lib/auth-crypto/index.ts:11`
- **Defect:** the design promises "a recipe with no known gap", and T3 deletes the section whole. These
  facts hold for any second store, and neither the carry-over list nor the eight-point acceptance has them:
  - `prerender = false` on login and member routes (`:69`, `:72`). A prerendered member page ships to
    everyone as static output.
  - Ending a removed person's sessions at removal (`:74-75`). Deleting the row at logout doesn't cover this.
  - Normalizing the contact the same way on every path (`:65`). A lookup that differs from the write
    misses, or splits one person into two.
  - Never setting `locals.cairnEditor` (`:21`). The guard writes it only on guarded admin paths, and T1
    now teaches site handles to run first, so a value a site handle sets survives on every other path, and
    `requireSession` (`guard.ts:459`) trusts it.

  Two of T1's bullets also need correcting. "A fresh, random session id" cites `generateSessionId`, which
  `/auth-crypto` doesn't export, so the recipe must name `generateToken`. "Byte-identical" must cover
  `Set-Cookie` as well as the body, since the engine's own comment calls a cookie emitted only on the
  editor path "a one-request allowlist oracle".
- **Proposed fold:** add the four facts and the two corrections to T1, and extend the acceptance searches
  with `prerender`, `locals.cairnEditor`, `Set-Cookie`, and "removal". This adds a few lines and no minutes
  to speak of.

### 4. A first sign-in with no owner row looks like success, and nothing diagnoses it

- **Severity:** major
- **Tag:** `correctness`
- **Location:** plan T5 `:281-283`, `:303-305`; plan T8 `:385-388`; `adopt-cairn.md:112`; `src/lib/auth/store.ts:78-85`; `tool/internal/spine/condition.go:38,65`
- **Defect:** no path admits an unknown address, and T5's test proves that. The failure is the other way:
  after T5, an empty or mis-seeded `editor` table shows every requester "sent", sends nothing, and logs only
  `auth.link.requested`. Four things leave the adopter without a way out:
  - The SQL is elided as `VALUES (...)`. `display_name` and `created_at` are `NOT NULL` with no default, so
    an executor must invent them. `created_at` must be epoch milliseconds.
  - "Lowercased and trimmed" is left to the person typing. `findEditor` compares exactly on the normalized
    value, so a row holding `Owner@Example.com` never matches, with no error. The net that seems to cover
    this doesn't exist: `auth.email-not-normalized` is registered and documented, but no code emits it.
  - The symptom table's "No sign-in email | Onboard the domain for Email Sending" sends this case to the
    wrong fix.
  - A leftover `auth: { bootstrapOwner }` fails only at type-check. `vite build` strips types, so a site
    that skips `npm run check` drops the option at runtime with no signal.
- **Proposed fold:** no new check is needed, and three edits cover it.
  - Teach one complete statement that normalizes in the SQL, placed after the migrations step and before
    first sign-in, with a note to double any `'`:

    ```sh
    npx wrangler d1 execute <auth-db> --remote --command "INSERT INTO editor (email, display_name, role, created_at) VALUES (lower(trim('you@example.com')), 'Your Name', 'owner', unixepoch() * 1000)"
    ```

    Add `--local` for `wrangler dev`. The role `owner` passes both the `0000_auth.sql` `CHECK` and
    `0001_roles.sql`, and `defineRoles` requires that key.
  - Split the symptom row: "No email and no send-failure record: no row for that address. Run
    `SELECT email FROM editor`."
  - Make T8's `bootstrapOwner` `Consumers must:` line say to seed the row before deploying if the table may
    be empty.

### 5. A security fix after the smoke merges unsmoked, and the seed can't run twice

- **Severity:** minor
- **Tag:** `correctness`
- **Location:** plan T9 `:403`, `:409-417`; plan T4 `:254-256`
- **Defect:** step 4 is the smoke, and step 6's fix chain reruns only the lane, CI, and the security reader.
  An `auth-routes.ts` fix found at step 5 therefore merges on a smoke of older code, which falls short of
  the merge condition in spirit. A rerun on the same local D1 also hits the `editor` primary key.
- **Proposed fold:** add to step 6 that a fix on an `auth-data` path reruns step 4, and have T4 teach
  `INSERT OR REPLACE` for the two smoke rows.

### 6. Log vocabulary lists are missing from T3 and T5

- **Severity:** minor
- **Tag:** `correctness`
- **Location:** plan T3 `:177-178`, `:235`; plan T5 `:292`, `:311`; `src/lib/log/events-list.ts:61,84-96`; `tool/internal/logs/events.go:55,78-90`
- **Defect:** both tasks edit `events.ts` and `log-events.md` only. `CAIRN_LOG_EVENTS` and the Go
  `eventVocabulary` carry the same 14 names, and `TestEventVocabularyMatchesEngine` and the type-level
  lockstep will fail. Neither acceptance search catches them: T3's pattern has `auth-channel`, not
  `auth.channel`, and T5's scope leaves out `tool`. The gates stop this, so the cost is a failed lane and
  a fix cycle, with `tool/` work loading `standards:go-conventions` in T5, which doesn't list it.
- **Proposed fold:** add both files to each task, and add `auth\.channel` and `tool` to the searches.

### 7. T5's acceptance can't pass as written

- **Severity:** minor
- **Tag:** `correctness`
- **Location:** plan T5 `:291`, `:311-312`; `src/lib/auth/store.ts:574`; `src/tests/integration/auth-store.test.ts:445`; `src/tests/unit/check-package-files.test.ts:245-247`; `src/tests/unit/check-self-use.test.ts:28`
- **Defect:** the search spans `src` and allows only the docs anchor, but these lines keep the string.
  The first is a production comment T5 doesn't list, and it still calls the removed entry public.
- **Proposed fold:** add `store.ts:574` to T5, and narrow the search to `src/lib` plus the named exceptions,
  or list the test fixtures as allowed.

### 8. `branding.from` survives in a remediation an owner reads

- **Severity:** minor
- **Tag:** `correctness`
- **Location:** `src/lib/diagnostics/conditions.ts:57`; `tool/internal/spine/conditions.json:182`; plan T6 `:360`
- **Defect:** the `email.sender-not-onboarded` text says "The domain must match branding.from", which names
  a removed option. T6's search matches only `config\.branding`.
- **Proposed fold:** add both files to T6, change the text to `email.from`, and regenerate as T3 does.

### 9. `isDeployedHost` is left dead and untested

- **Severity:** minor
- **Tag:** `optional`
- **Location:** `src/lib/dev-flag.ts:23,38-39,58,71-96`; `src/lib/sveltekit/csrf.ts:31`; plan T3 `:186`
- **Defect:** the guard's refusal doesn't depend on anything T3 removes, since it reads the flag name,
  message, and truthiness rule, which stay. But `auth-channel/factory.ts:123` is the only caller of
  `isDeployedHost`, and no surviving test covers it. A leftover security-looking predicate is an invitation
  to reuse. The design removes `originMatches` on this same ground. T3's `:3-13` edit also leaves lines 23,
  39, 58, and 81 describing the channel factory and a "two refusals" section that `docs/architecture.md`
  doesn't have.
- **Proposed fold:** delete `isDeployedHost` and those references in T3. `isLocalHost` and
  `readPublicOrigin` stay, because `csrf.ts` and `guard.ts` read them.

### 10. Over-ceremony: T7's review and a settled design bullet

- **Severity:** minor
- **Tag:** `optional`
- **Location:** plan `:74`, T7; `design.md:82-83`
- **Defect:** T7 is a pure rename that the compiler, `auth-crypto-exports.test.ts`, and the whole-branch
  security read all cover, so its task-scope `standards:diff-reviewer` dispatch costs an agent run for no
  added proof. The Metadata bullet asks an open question the design already answers: GitHub's table lists
  all eleven engine routes under Contents, so a dropped Metadata grant has no reader.
- **Proposed fold:** exempt T7 from the per-task review, and cut the Metadata bullet.

## Checked and clean

- **`config.repo`:** it holds the bare name. Every URL builds `/repos/${owner}/${repo}`, so `owner/name`
  could not work today, and `createGithubApp`'s doc and `TEMPLATE_GITHUB_APP_LITERAL` agree. The mint body
  is correct.
- **Engine routes:** all eleven in `repo.ts` and `branches.ts` are Contents on GitHub's page. No engine path
  reads another repository: `guidance/check.ts` makes no network call, and `media-seed` is a local tool.
  `signing.ts:87` is the only mint in the repo.
- **Token cache:** keying on installation and repo can't collide, since the id is numeric and repo names
  have no `/`. Permissions are a constant, so no key serves a wrong scope. The map stays at one entry per
  adapter, so eviction doesn't arise. The cache lives in the isolate, so a deploy starts empty, and a token
  minted before the upgrade is never read. Keying on repo also fixes the case where one isolate would hand
  repository A's scoped token to repository B.
- **`/healthz`:** the new `detail` is a fixed string on the same footing as `installation_not_found`. It
  carries no repo name, owner, or GitHub text. The per-isolate mint bound is unchanged.
- **T1 hook flip:** `guard.ts` never reads `cairnAuditSink`. Only `admin-action.ts:310` calls the sink, so a
  request the guard answers itself writes no audit record in either order. The `building` guard still holds.
- **T3 on a live site:** a site importing `/auth-channel` fails at build, not silently. `CHANNEL_DB` and its
  data stay untouched, since nothing drops a table. Removing the `createChannelDb` fold marker removes
  nothing still guarded.
- **`bootstrap.mjs`:** its SQL is unchanged and keeps both guards. `create-cairn-site --sign-in` still heals
  an empty table on a scaffolded site. `docs/admin` never taught `bootstrapOwner`.
- **T6 mail:** with no `auth.branding` override, `from`, `replyTo`, and `siteName` match today's values.
  `runtime.sender` is `adapter.email`, and an absent `replyTo` stays `undefined` as it does now. No site or
  fixture sets the override.
- **T6 outcome and T7:** only `LoginPage.svelte` reads `sent`, and the neutral and sent exits stay identical.
  `tokensMatch` has no caller outside the plan's list, no gate names it, and behavior doesn't change.
