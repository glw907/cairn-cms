# setup-fix plan review: fold record

The fold step of `standards:spec-plan-review` over the three lens reviews of
`2026-11-02-setup-fix-plan.md` at `d67f3bdb1`: mechanics (`-review-mechanics.md`, "Mech"), contract
(`-review-contract.md`, "Con"), and failure (`-review-failure.md`, "Fail"). Each finding was checked
against this worktree's source before it was acted on. The planning session's rulings were applied as
method calls, except one, whose premise Cloudflare's docs contradict (Mech 1, below).

## Result

- 65 findings: 59 folded, 2 refused, 4 forked (3 owner forks; Mech 1 and Fail M9 share one root).
  Several folds are partial, and their refused halves are marked below.
- Path: **655** minutes after the verification fold and the planner's m10 correction (620 after the review fold, 455 before),
  against the design's 540 and the 1,080 ceiling. Under the ceiling, so no outcome was trimmed.
- One design change, listed under "Design changes", now settled by design revision 2
  (`34ac945f3`).
- The two owner items the design did not foresee, the machine account's API token (plan finding 5)
  and the Workers Builds GitHub connection (Mech 8), sit in `## Pre-flight` marked "added by the
  plan", and design revision 2 now carries both in its own pre-flight.
  Neither blocks an executor task. No task needs either one: the T6a smoke skips its GitHub-token
  checks when the token is absent, and nothing in the pass connects Builds. The smoke does call the
  live Cloudflare account with the gate token, as the approved plan already had it do.

## Dispositions

Convergent findings fold once, at the root named first.

### Roots that several lenses found

| Root | Findings | Disposition |
|---|---|---|
| The stable check's allowlist | Con B1, Mech 4, Fail M6 | Folded into T4 part 3. The allowlist is built from the files the cut actually touches (`git show --stat 1ae692ae1`: 9 files). `guidance-hashes.json` is checked by `node scripts/build/build-guidance-hashes.mjs --check` (its usage line, `scripts/build/build-guidance-hashes.mjs:8`), not by its lines. The file set comes from `git diff --raw`, so a binary, rename, or mode change fails (the mode half added by verification m4). The script refuses unless `HEAD` equals a fetched `origin/main`, prints that sha, and the skill passes it literally to `--target` (verification major 2). The `1ae692ae1` diff, rewritten from rc-to-rc into rc-to-stable, is a fixture that must pass. |
| The acceptance greps | Mech 3, Con M1 | Folded. T2's grep is scoped to `packages/create-cairn-site skills`, and its docs half moves to T5. T3's grep is scoped to `src examples docs/admin docs/editors skills`. T2 renames the test id `'builds-skipped-site-abc123'` (`chapter3.test.mjs:1603`). |
| The sign-in link and the publish origin | Mech 7, Con M6 | Folded into T6b. `browser.mjs` opens each sign-in link as soon as the shim logs it, while the CLI runs, and keeps that install's admin session. Every leg signs in and publishes on the workers.dev admin, since every link the CLI opens names that host (`chapter.mjs:276`, `bin.mjs:351`). It fetches from the leg's live address. A publish there needs no `PUBLIC_ORIGIN` match: `requireOrigin` is called only by the login request and the preview route (`auth-routes.ts:236`, `content-routes-preview.ts:65`). When the session is gone, the driver runs `--sign-in`. |
| The reconcile's re-run kick | Mech 13, Fail M1, Fail m1 (part) | Folded into T2. A new field, `cloudflare.buildsDeployedHash`, is written only after a watched `success`. On `changed: false`, the run kicks a build when that field differs from the disk hash. Three crash-point tests follow from it. Chapter 2's watch writes no chapter 3 build field. The in-flight build uuid half of Fail m1 is refused: a re-run during a `build-running` park kicks one more build of the same commit, which is harmless and cheaper than tracking. |
| Install names over 34 characters | Mech 14, Fail m6 | Folded into T6b. The name is `cairn-e2e-gate-<v>-<a\|b>-<ddhhmm>`, where `<v>` is the version with every non-alphanumeric character removed (`0990rc3`). That's 31 characters, and a test runs it against `0.99.0-rc.3`. |
| Teardown's re-run states and a dead run | Mech 21, Fail M7 | Folded into T6b (ruling). `run-gate.sh --teardown-stale` removes installs recorded in earlier run directories before a leg takes the domain, and an exit trap runs teardown for this run's installs. Teardown counts a 404 as done, attempts every delete, and reports what is left. The gate uploads no media, so it expects the R2 bucket to be empty, and a refused delete is reported, never forced. |
| Re-run branches at a chapter 3 terminal step, and the settle order | Con M4, Fail M5 | Folded into T1 and T2. `continueIntoChapter2` checks in a fixed order (T2): Builds went live, then the `buildsDeclinedAt` restore, then "the record is still at a chapter 3 terminal step". T1 sends `admission-declined` into the terminal branch at `bin.mjs:292`. The first write chapter 2 makes on a record entered at `builds-connect-declined` carries `buildsDeclinedAt`, under the existing `buildsDeclineStands` rule (`chapter2.mjs:491-498`). Four tests cover it. |
| Credentials on disk and in logs | Con m7, Fail m7 | Folded into T6a and T6b: the run directory sits under `~/.local/state/cairn-gate/runs/<ts>` with mode 0700, the session file has mode 0600, and the smoke's HTTP calls go through Node `fetch`. `totp.mjs` reads its secret from the environment, tracing and video stay off, the capture, URL log, and state records are deleted at teardown, and `record.mjs` refuses a `token=` URL. |
| The effective-step table | Fail M4, Con m2, Fail m8 | Folded into T2, reduced. `--connect` on a Builds-connected record at a chapter 2 step resumes chapter 2 (`bin.mjs:468`). Row 2 splits on `cloudflare.carryOver`, since `readCurrentRecords` throws on a delegated domain (`records.mjs:181-190`). Routing at a chapter 3 terminal step also enters chapter 2 for a domain with no `domainLiveAt` and no email field. Row 4 is unreachable, so it goes with its test. Each remaining row names its observable. |
| The account-owned gate token and `/user/tokens/verify` | Mech 1, Fail M9 | Forked as fork 1 (a design change), since settled by design revision 2: the token is user-owned through `tmp-token-setup`. See below. |

### Mechanics

| # | Disposition |
|---|---|
| 1 | Forked (fork 1). The ruling's option (a), a `verifyToken` fallback in T1, was **not applied**. Cloudflare's Builds docs say "The Builds API requires a **user-scoped** API token. Account-scoped tokens are not supported and will return 'Invalid token' errors" (<https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/>, "Create an API token"). Its build-token section says "Currently, only user tokens are supported, with account-owned token support coming soon" (<https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>, "API token"). A verify fallback would carry an account-owned token one call further, to `getBuildTokens` and `createBuildTrigger`, where it fails. A user-owned token never needs the fallback. The fallback is dead code in an `auth-data` path under either answer. The account route does return `result.id` (<https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/>), so the ruling's mechanism was sound; only its premise fails. The T6a smoke keeps the ruling's write probe, which settles the question live. |
| 2 | Folded (ruling). The watched paths are proved at module level with the injected `fetchImpl`, `openBrowser`, `confirm`, and `sleepFn` (`chapter3.test.mjs:189-219`, `chapter2.mjs`'s options typedef). Bin-level tests stop at a no-network stop (`resume-chapter3.test.mjs:7-14`). T6a's integration test proves the answer table against the CLI's prompt strings and ends at the chapter 3 token hop. |
| 3 | Root, above. |
| 4 | Root, above. |
| 5 | Folded into T6a. Each answer-table entry names a kind: confirm (`y` or `n`, no CR, since `@clack/core` 1.5.1 submits on the key), select, text, and password. The driver reads rendered text with ANSI stripped. |
| 6 | Folded into T6a. On `Watch progress at` (`hold-loop.mjs:172`), the idle limit rises to `PROPAGATION_BUDGET_MS` (40 minutes, `hold-loop.mjs:35`) plus 5. |
| 7 | Root, above. |
| 8 | Folded. Added to `## Pre-flight` as a `[you]` item marked "added by the plan", with its check. It doesn't block an executor task. |
| 9 | Folded into the pre-flight token row: mint from `CHAPTER3_PERMISSION_KEYS` (`prefill.mjs:44-50`, `:79`, the eight keys), with the zone-level groups limited to `carin-test.org`. |
| 10 | Folded into T6a's smoke: the CLI's own routes, `whoami` and `whoami --json` through the template's wrangler (`^4.156.2`, `templates/waymark/package.json:55`), one D1 and R2 create-and-delete, a build-token create-and-delete (ruling), and `X-OAuth-Scopes`. The GitHub-token checks skip when the token is absent from the store. |
| 11 | Folded (ruling a). The pre-flight check now claims only the settings page. The first real promotion of `rc.3` is the probe, with the `npm dist-tag add` fallback ready. |
| 12 | Folded in part into T6b: a URL classifier, under which the `dash.cloudflare.com` prefill URL (`prefill.mjs:282`) is logged and skipped. **Refused:** captured live fixtures, since no executor task signs in to GitHub. Hand-built fixtures test the classifier and the flow, and the first gate run proves the selectors under the design's standing answer for a page the harness can't pass. A `fixtures-hygiene` check doesn't exist (`grep -rn hygiene package.json scripts .github` finds only a comment), so there's nothing to extend. |
| 13 | Root, above. |
| 14 | Root, above. |
| 15 | Folded. T4 writes no `CHANGELOG.md` line, and T5 writes its line. |
| 16 | Folded into the standing answers' pin list: added `resume-chapter2.test.mjs:279` and `:695`, `resume-chapter3.test.mjs:259`, and the `chapter3.test.mjs:1603` id. Dropped `chapter2.test.mjs:407` and `:641`, which assert the module outcome that T1 keeps. The `Workers Builds is not connected` assertions must now assert `does not change`. |
| 17 | Folded into T1, with a MIGRATION-NOTES line. |
| 18 | Folded in part: `create-your-site.md:108-114`, and `README.md:266-272` and `:305-316`. **Refused:** `chapter2.mjs:527-534` is correct. Line 527 is `if (args.yes && !args.domain) {` and line 534 closes the block. |
| 19 | Folded (ruling). This PR merges only on an approval-queue packet verdict, under `autoMode` allow 7 in `~/.claude/settings.json` ("after an `approval-queue packet` call naming that PR returned a decision whose part for it has verdict approve and that head"). Allow 11 requires "a PR on an `auth-data` path also has its security read and live smoke", and the smoke isn't run here. The run sheet's merge word (`~/.local/state/cairn-agent-first/design-audit/run-sheet.md:27`) adds "the security read and the live smoke" for `auth-data`. The plan records the smoke as not run, with the reason. |
| 20 | Folded. No token can read the plan (`cloudflare-estate-inventory.md:4-6`: `GET /accounts/{id}/subscriptions` answers code 10000), so the Workers Paid check reads that inventory line. Email Sending is read through the gate token's zone route (`api.mjs:528`). |
| 21 | Root, above. |
| 22 | Folded as a standing answer: read CI on the head after each pair, and list any red check. The executor prompt is not this fold's file, so the conductor carries the line into it. |
| 23 | Folded as a standing answer: after a smoke stop, the other tasks continue and the PR opens with the harness listed as blocked. |
| 24 | Folded: the smoke prints `hostname`, and the gate runs on the host the conductor names, with the age store synced and `npx playwright install chromium` done. |
| 25 | Folded into T6b: `record.mjs` runs in `run-gate.sh`'s own environment, as glw907's `gh`, never in a child allowlist. |
| 26 | Folded (optional, cheap): the tests assert that the token string never appears. |
| 27 | Folded (ruling): T7 goes into T4. Its content needs only `run-gate.sh --all --version <v>` and `--smoke`, which the plan names. T3 runs after T5 in Pair C. **Refused:** dropping T3's fact-check. Under `cairn-writing-docs`, every case "ends the same way: gate, fact-check, review" (`SKILL.md:19`). |
| 28 | Folded, with a corrected mechanism. `gate-table.json` has no risk classes: its `scripts` bucket already holds `scripts/`. The class map is the prose line at `cairn-running-passes/SKILL.md:31`, so T6a adds `scripts/gate/**` there and drops the `gate-table.json` edit. The plan header no longer claims `.claude/skills/**` as `runner`. |

### Contract

| # | Disposition |
|---|---|
| B1 | Root (stable check). Also folded: a code line in a template file must fail. A CHANGELOG or MIGRATION-NOTES body change fails too, so step 5's scrub runs at the candidate cut, and a stable whose diff needs a scrub cuts a new candidate. |
| M1 | Root (greps). |
| M2 | Folded into T6b. A2 and B2 read the prerendered `/robots.txt` on the domain, which carries `siteMeta.origin + '/sitemap.xml'` (`templates/waymark/src/routes/robots.txt/+server.ts:10`, built from `publicOrigin`, `content.ts:32`), and assert `https://carin-test.org/sitemap.xml`. B2 reads its closing block. |
| M3 | Folded into T1: the outcome is restated as "connects and parks at the reconcile" (`chapter3.mjs:247-250`), with a bin-level test on the fake-backed pattern at `resume-chapter3.test.mjs:267`. |
| M4 | Root (settle order). |
| M5 | Folded into T6b: `--plan` is dropped, and each leg's evaluator is unit-tested against stubbed results. |
| M6 | Root (sign-in). |
| M7 | Folded into T6a and T6b: `--absent` needs a 200 and a positive control string on every poll, the entry path comes from the entry the browser opened, and a 404 fails. |
| F1 | Forked (fork 2). |
| m1 | Folded: "holds the connected sentence", not "ends with". |
| m2 | Root (effective-step table). |
| m3 | Folded into T2: one module-level test of B2's shape. |
| m4 | Folded into T1: the sentence prints only when `cloudflare.url` is set (`bin.mjs:113`), and `admission-declined` prints the repo-and-doctor block that precedes chapter 3. |
| m5 | Folded: T7 is now in T4, so the placeholder is gone, and T4's acceptance carries the mechanical greps. |
| m6 | Folded: a close line has the conductor repoint run-sheet steps 11 and 12, recorded under `## Decisions`. |
| m7 | Root (credentials). |
| m8 | Folded into T6a: prompt detection keys on clack's active-prompt symbol, `S_STEP_ACTIVE = unicodeOr("◆", ...)` (`@clack/prompts` `dist/index.mjs`), plus the prompt's text. Each leg gets its own table. |
| m9 | Folded (optional, removes work): T1 leaves the `builds-connect-declined` catalogue row as it is. |

### Failure

| # | Disposition |
|---|---|
| B1 | Folded (ruling), as applied to each resource. Teardown deletes only resources whose ids or exact names the gate recorded in its run directory: the uuids in the site's state record under the run's `CAIRN_STATE_DIR`, and the D1 and R2 names in that install's own `wrangler.jsonc`, which carry its unique slug. Wrangler binds them by name and never writes an id back (`config.mjs:78-81`). The prefix check is a second guard. The build token registration is **never deleted**. Its uuid isn't on the record, its name has no prefix (`chapter3.mjs:95`), installs share it (`:1090-1092`), and it holds only the gate token's own value, which dies when that token is revoked. A test proves that teardown issues no `builds/tokens` DELETE. |
| M1 | Root (re-run kick). |
| M2 | Folded into T2. The `cutover-deploy-failed` row (`catalogue.mjs:506-540`) gains a `buildsCommitted` variant. The origin on disk is restored exactly when the reconcile commit didn't land, and the acceptance asserts no `restored` in stdout once it did. |
| M3 | Folded into T2. Before committing, chapter 2's hop compares the repository's copies with the local ones, with the three tool-owned values masked (`PUBLIC_ORIGIN_PATTERN`, `PUBLIC_ORIGIN_EXPORT_PATTERN`, and `EMAIL_FROM_PATTERN`, `config.mjs:122`, `:131`, `:206`). On any other difference it stops with a new act row that names the file and `git pull`. Chapter 3's `--connect` reconcile is unchanged. |
| M4 | Root (effective-step table). |
| M5 | Root (settle order). |
| M6 | Root (stable check). |
| M7 | Root (teardown), as ruled: `--teardown-stale` plus an exit trap. |
| M8 | Folded (ruling) into T6a: the CLI child's environment never carries a `GITHUB_TEST_*` name, and a test dumps it. |
| M9 | Same root as Mech 1: forked (fork 1). |
| M10 | Forked (fork 3); its exact-version half is folded into T6b: every gate leg invokes `create-cairn-site@<exact version>`, never `@gate` or a bare name. |
| m1 | Root (re-run kick), in part. |
| m2 | **Refused.** The state stays recoverable under the new deployed-hash rule, and the `token-scope-missing` row names the fix. A pre-reconcile probe costs one more API route and test in T2 for a one-time owner inconvenience. |
| m3 | **Refused** (optional). The PATCH isn't forced, so no data is lost. A publish that races the reconcile is rare, and the gate observes whether it happens. |
| m4 | Folded into T4: `create-cairn-site` moves last, the tag state prints on failure, the skill says a re-dispatch recovers, and the guard is explicit, `github.event_name == 'workflow_dispatch' && inputs.promote != ''`, pinned in `workflow-yaml.test.ts`. |
| m5 | Folded into T6b: a failed or empty read aborts the write, the gate records after each leg, and a test covers it. |
| m6 | Root (names). |
| m7 | Root (credentials). |
| m8 | Root (effective-step table). |

## Verification

A fresh read of the folded plan (`2026-11-02-setup-fix-fold-verification.md`) found 0 blockers, 4
majors, and 15 minors (5 optional), and was folded with the conductor's calls: all 4 majors folded,
all 10 correctness minors folded, all 5 optional minors folded (each one line and clearly right),
none refused. Its one surfaced owner fork (inside major 1) was ruled not a fork by the conductor.

| # | Disposition |
|---|---|
| Major 1 | Folded (conductor: not a fork). T4's skill text puts the recapture and every quoted docs block it updates before the final candidate's cut, so the gated tree carries it, and a recapture after the final candidate means one more candidate. A Close line has the conductor reorder run-sheet steps 14 and 15 (`run-sheet.md:476-477`), quoting each. The #185 and #274 sweep rows now say "for the recapture before the final candidate". |
| Major 2 | Folded. The check prints the sha it read; the stable's `gh release create` passes it literally as `--target <sha>`, never a `$( )` substitution, and a candidate keeps `--target main --prerelease`. The pre-launch permission row adds `Bash(gh release create v* --target * --title *)`, since the existing `--target main *` and `--prerelease *` rules match neither. T4's acceptance greps that no `rev-parse HEAD)` remains. |
| Major 3 | Folded into T2. On a connected record the shared hop runs on every pass through the sender step, whatever `writeEmailFrom` returned (`chapter2.mjs:918-919`), and `emailFrom` is saved only after the hop's watched success or hash-equal no-op. A module test crashes between the write and the commit and proves the re-run commits and watches. T2 rises 10 minutes. |
| Major 4 | Folded into T6b. `browser.mjs` runs headed; an unrecognised page is held for the step's 10 minutes with a screenshot path and `notify-send` at normal urgency; a click resumes the leg; only the timeout fails it, and the exit trap fires only after the timeout or a later failure. A test proves a held page makes no teardown call. T6b rises 15 minutes with m2's test. |
| m1 | Folded into T1: both seeded records carry `emailOnboardedAt`. |
| m2 | Folded into T6b (FORK 2): match a message received after the request time, to the owner, with the subject `Sign in to <site name>` (`src/lib/email.ts:62`), in any mailbox, within 10 minutes; never "the newest". A stub-JMAP test covers the monitor probe and an earlier run's message. |
| m3 | Folded: allow 7, 10, and 11, each cited by a quoted phrase, and the run sheet by its full path, in the plan and here. |
| m4 | Folded into T4: `git diff --raw`, a mode change refused, and its test. |
| m5 | Folded: the "Cloudflare's Workers and Pages App install" classifier entry is deleted; no `openBrowser` call site opens one. |
| m6 | Folded into T6a: the integration test points `CAIRN_CLOUDFLARE_API_BASE` at the fake, arms `failNext('zone_list', 403, ...)` for both tries (`prefill.mjs:218`), and its table answers both pastes. |
| m7 | Folded into the Builds-connection pre-flight row: the check signs with the user-owned `ws-cairn-gate`, after the mint. |
| m8 | Folded into T2: the restore rule names the `--yes` park as its one exception. |
| m9 | Folded into T4: the stable cut commit carries only version fields and headings, STATUS lands after the release, and a STATUS change fails the check's test. |
| m10 | Folded by the planner: the sweep commit already landed as `6ec019cb7`, so the plan cites it and the 10-minute Path row is gone. |
| m11 (optional) | Folded into T1: the fake is started and records no Builds route. |
| m12 (optional) | Folded: `standards:svelte-reviewer` is dropped; the whole-branch review covers the one string. |
| m13 (optional) | Folded into T4: `ROADMAP.md:30`, `:34`, and `:36`. |
| m14 (optional) | Folded: the Fail M10 row reads "Forked (fork 3); its exact-version half is folded into T6b". |
| m15 (optional) | Folded into T5: its search excludes T3's two pages. |

Path: Pair A 150 (T4 150, +10 for majors 1 and 2, m4, m9), Pair B 275 (T2 275, +10 for major 3),
Pair C 180 (T6b 180, +15 for major 4 and m2), Close 50: **655**.

## Probes behind the new mechanisms

- `@clack/core` 1.5.1 (`package-lock.json:261-262`) submits a confirm on the key alone:
  `t && (t.toLowerCase() === "y" || t.toLowerCase() === "n") && this.emit("confirm", ...)` and
  `this.on("confirm", (i) => { ... this.state = "submit", this.close(); })` (`dist/index.mjs:300`,
  `:463-464`).
- Hold budget: `export const PROPAGATION_BUDGET_MS = 40 * 60 * 1000;` (`hold-loop.mjs:35`). The
  Builds watch logs a heartbeat every 10 polls (`chapter3.mjs:107`, `:536`), so only the propagation
  hold is silent.
- Builds deletes, from Cloudflare's API reference: `DELETE /accounts/{account_id}/builds/triggers/{trigger_uuid}`,
  `DELETE /accounts/{account_id}/builds/repos/connections/{repo_connection_uuid}`, and
  `DELETE /accounts/{account_id}/builds/tokens/{build_token_uuid}` (the last only for the smoke's own
  probe registration).
- The record holds `buildsConnectionUuid` (`chapter3.mjs:1066`), `buildsTriggerUuid` (`:1117`),
  `workerName` and `url` (`cloudflare/chapter.mjs:257`), and `github.appId` and `appSlug`
  (`github/chapter.mjs:310-311`). It holds no build-token uuid.
- The gate's owner mailbox: `probe@probe.907.life`, whose password is `STALWART_PASSWORD_TEST`
  (`~/Projects/servers/docs/addresses.md:60`). JMAP is reached through `/.well-known/jmap` on
  907.life (`~/Projects/servers/docs/decisions.md:104`). Fork 2's read uses these, over `fetch`, with
  no new dependency.
- `autoMode` allow 7, 10, and 11 were read from `~/.claude/settings.json` (counted 1-indexed; the
  first fold miscounted them as 6, 9, and 10, verification m3), and the merge word from
  `~/.local/state/cairn-agent-first/design-audit/run-sheet.md:27`.
- `permissions.allow` holds `Bash(gh release create v* --target main *)` and
  `Bash(gh release create v* --prerelease *)`; neither matches a stable's `--target <sha>`, so the
  pre-launch row adds `Bash(gh release create v* --target * --title *)` (verification major 2).
- The sender step returns early on an unchanged address: `addressChanged = await writeEmailFrom(dir, from);`
  then `if (!addressChanged) return;` (`chapter2.mjs:918-919`), with `emailFrom` saved at `:925`.
- The sign-in email's subject is `` `Sign in to ${siteName}` `` (`src/lib/email.ts:62`), the
  marker FORK 2's mail read matches.
- `ensureApiToken` gives an underscoped paste "exactly one more try" (`prefill.mjs:218`), and the
  fake's zone list route is `zone_list` (`test/fake-cloudflare.mjs:121`), which T6a's integration
  test arms twice.
- The CLI opens URLs at `prefill.mjs:282`, `cloudflare/chapter.mjs:276`, `install.mjs:239`,
  `manifest.mjs:165`, `oauth.mjs:108`, and `bin.mjs:351`; none opens a Cloudflare GitHub App install,
  so the classifier entry for one was deleted (verification m5).
- `notify-send` is at `/usr/bin/notify-send` on this host.

## Design changes

1. **The gate's Cloudflare credential.** The design's decision "Which Cloudflare credential the gate
   uses" chose one account-owned token. Cloudflare documents that the Builds API, and a build token,
   accept only user-owned tokens (sources under Mech 1). With an account-owned `ws-cairn-gate`, legs
   A2, B1, and B2 fail at chapter 3's trigger hop. **Settled by design revision 2** (`34ac945f3`):
   the gate token is user-owned, minted through `tmp-token-setup`, recorded in the inventory as an
   exception to rule 2. The plan's pre-flight token row now mints it that way by default (fork 1,
   the conductor's word pending Geoff's), and the Builds-connection check signs with it after the
   mint. No executor task changes; the T6a smoke's Builds probe gives the live verdict. No design
   change stays open.

## Owner forks

1. **Should `ws-cairn-gate` be a user-owned token, as a recorded exception to scheme rule 2?**
   Recommendation: yes. Cloudflare's Builds API and build tokens accept only user tokens today, and
   the CLI's own users paste user tokens from `dash.cloudflare.com/profile/api-tokens`
   (`prefill.mjs:282`). Yes: the conductor mints `ws-cairn-gate` through `tmp-token-setup` with the
   same scopes, records the exception and a re-own-when-supported note in the inventory, and the
   smoke reads `/user/tokens/verify`. No: the gate keeps the account-owned token, and the three
   Builds legs can't pass until Cloudflare ships support. Tasks changed: none (the pre-flight token
   row only). Design revision 2 adopts yes; the plan's default is yes, the conductor's word pending
   Geoff's, and the smoke's verdict is the evidence the conductor carries to him.
2. **Should the gate read the From address of a sign-in email on the domain after B2's publish
   (Con F1)?** Recommendation: yes. Without it, B2 passes with broken sign-in email, and the mailbox
   and credential are already in pre-flight. Yes: T6b requests a sign-in link for `GATE_OWNER_EMAIL`
   on `https://carin-test.org/admin/login`, reads over JMAP the message received after the request
   with the sign-in subject (never "the newest", verification m2), and asserts its From is
   `no-reply@carin-test.org`, about 20 path minutes. No: the bar stays at the fetch and the
   origin read. Tasks changed: T6b (and T4's gate step names the read). The plan's default is yes.
3. **Should promotion also move `create-cairn-site`'s `latest` to the passed candidate until the
   stable supersedes it (Fail M10)?** Recommendation: yes. `latest` is `0.99.0-rc.1`, so every
   printed re-run line (`npx create-cairn-site --dir ...`) serves rc.1, which can redeploy a Builds
   site from a stale checkout. Yes: the promote job adds one `npm dist-tag add create-cairn-site@$V
   latest`, about 5 minutes in T4, and the skill says so. The engine packages' `latest` never moves
   to a candidate. No: the tester notes for each candidate name the exposure. Tasks changed: T4.
   The plan's default is yes.
