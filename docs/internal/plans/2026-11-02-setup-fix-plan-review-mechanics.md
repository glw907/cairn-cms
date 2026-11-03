# setup-fix plan review: mechanics and feasibility, with the workstation lens

Reviewer: `standards:plan-reviewer` (Opus, medium), at plan commit d67f3bdb1. Saved verbatim by the
planning session.

## Summary

The plan can't be approved as written. Three blockers: the gate token can't get through chapter 3,
so every Builds leg fails; several acceptance tests can't be built, because nothing at the bin
level stands in for the host probe or the browser; and two acceptance greps can never pass. 11
majors and 13 minors besides.

What checks out: path sum 80 + 200 + 100 + 25 + 50 = 455, under the 540 estimate and the 1,080
ceiling; every task carries a clock estimate; task order works (T5 after Pair B, T6b after T6a, T7
after T6b); every named fixture exists (`test/fake-github.mjs`, `fake-cloudflare.mjs`,
`fake-bin.mjs`, `resume-chapter2/3.test.mjs`, `resume-cloudflare.test.mjs`, and `no-desktop.mjs`,
which already shims `xdg-open`); the npm facts are right ("Allow npm dist-tag" off by default, needs
11.21.0 or later, `npm trust` has no dist-tag flag); most citations are right (wrong ones in 18).

## Blockers

**1. Blocker, correctness, OWNER FORK. An account-owned gate token fails chapter 3's token check.**
Plan :110, :480-484; `src/cloudflare/api.mjs:557-561`; `chapter3.mjs:1088`. Chapter 3 calls
`api.verifyToken()` on `GET /user/tokens/verify` to get the `cloudflare_token_id` for
`createBuildToken`. Wrangler's `getTokenType` (`workers-sdk/packages/wrangler/src/user/whoami.ts:319-335`)
shows that route answering error 1000 "Invalid API Token" for an account-scoped token. The estate
inventory records the mirror case (:125): `accounts/{id}/tokens/verify` answers 1000 for a
user-owned token. So with `ws-cairn-gate` pasted, chapter 3 throws at the trigger hop and A2, B1,
B2 fail; the pre-flight check and the T6a smoke use the account route and miss it. Options: (a) on
code 1000, `verifyToken` falls back to `/accounts/:id/tokens/verify`, which also fixes a real user
who pastes an account token, a setup-tool change and not a harness seam, in T2's files; (b) mint
`ws-cairn-gate` user-owned, against scheme rule 2; (c) leave it and the gate fails. Recommend (a),
plus a probe that Builds accepts an account-owned token as a build token (`POST builds/tokens`)
before T6a's smoke is done.

**2. Blocker, correctness. The bin-level acceptance runs to `builds-live` can't be built.** T1
acceptance :216-225; T6a integration :489-493; T2 acceptance :316-332. No bin-level stand-in for the
host probe: `watchAndComplete` ends with `confirmHostname(currentOrigin, fetchImpl, dns)`
(`chapter3.mjs:625-627`), and the cutover runs `confirmBeforeRedeploy` (`hostname.mjs:373`); at the
bin level both use real `fetch` and DNS, and `bin.mjs` reads no override for `fetchImpl`
(`resume-chapter3.test.mjs:7-14`: "there is no DNS or HTTPS probe seam here either"; every bin test
stops at the token hop on purpose). No browser: `performReconcile` runs `reauthorize`, an OAuth trip
to the loopback (`chapter3.mjs:254-260`), and chapter 1's manifest and install trips need a browser
to POST the manifest form and follow redirects; the shim only logs URLs, so the CLI waits on the
loopback until it times out. No prompt answers: the harness runs with `input: ''`, and nothing
answers clack prompts without a pty. Order: T1's test needs T6a's driver, one pair later. Fold:
prove the watched paths (`builds-live`, the cutover, the email hop, the build failure and re-run)
at module level, where `fetchImpl`, `openBrowser`, `confirm`, and `sleepFn` are injected
(`chapter3.test.mjs:189-219` has `alwaysMatchingFetch` and `smartOpenBrowser`). Keep bin-level
tests for routing to stops that need no network: the token hop, and for T2's settle a `builds-live`
record with no domain under `--yes` (gives `admission-declined`, then the settle). End T6a's
integration test at a no-network stop, or replace it with a test of the answer table against the
prompt strings; the first gate run proves the full table.

**3. Blocker, correctness. The T2 and T3 acceptance greps can never print nothing.** Plan :337,
:361. Both match the plan file itself, and the design and review files will too (deleted only at
close). T2's grep also matches `docs/admin/setup-recovery.md`, which only T5 edits, and the id
`'builds-skipped-site-abc123'` at `src/cloudflare/chapter3.test.mjs:1603`. Fold: add
`--exclude-dir=internal` or scope to `packages/create-cairn-site src examples docs/admin
docs/editors skills`; move the docs half of T2's grep into T5; rename the test id in T2.

## Major

**4. Major, correctness. `check-stable-source` would reject every real stable cut.** Plan :389-395.
The rc.2 cut commit `1ae692ae1` also changes `templates/waymark/package.json` (dependency lines
`"@glw907/cairn-cms": "^0.99.0-rc.2"` and `cairn-cms-dev`, not `"version":` lines),
`templates/waymark/.claude/cairn/VERSION`, `guidance-hashes.json`, and `MIGRATION-NOTES.md` (its
heading and the `CHANGELOG.md#0990-rc2` anchor). Fold: build the allowlist from the files
`cairn-releasing`'s cut touches, and use `git show 1ae692ae1` (with rc-to-stable renames) as a
fixture that must pass.

**5. Major, correctness. Answering by text needs a keystroke rule for each prompt type.** Plan
:465-472. `@clack/core` 1.5.1 submits a confirm on the `y` or `n` keypress alone
(`dist/index.mjs:463-464`). `ptycapture.py` sends `reply + "\r"`, so the stray CR can answer the
next prompt. Select prompts need arrows: "Where should the GitHub App and repository live?"
(`github/chapter.mjs:247`), the AI crawlers select (`prompts.mjs:138`), possibly the account picker
(`account.mjs:87`). Text prompts with defaults need a value or a bare CR. Fold: each answer-table
entry names a kind (confirm: `y`/`n`, no CR; select: arrow to the label, CR; text: value, CR;
password: token, CR), and the driver answers from rendered text with ANSI stripped, since clack
redraws.

**6. Major, correctness. The driver's 10-minute idle failure fires during normal holds.** Plan
:470-471. On a TTY `shouldHold` is true (`hold-loop.mjs:184-189`; the env sets no `CI`). The hold
prints `Watch progress at ...` once (`hold-loop.mjs:313`), then polls silently; the propagation
budget is 40 minutes, the measured lag 27; the Builds watch can run 15 minutes (180 polls of 5 s).
Fold: on `Watch progress at`, the idle limit rises to that hold's budget plus a margin; name both.

**7. Major, correctness. No sign-in source is named for each leg's publish.** Plan :517-534. The
chapter 1 link lasts 10 minutes (`bootstrap.mjs:18`), is single-use, and points at workers.dev
(`chapter.mjs:276`). A1 publishes after the domain and email hops, possibly after a hold. A2 and B2
mint no link. `--sign-in` reseeds onto `state.cloudflare.url` (`bin.mjs:351`), workers.dev even
after the cutover. Fold: `browser.mjs` opens the sign-in URL when the shim logs it and keeps the
session; each leg's publish names its origin and runs `--sign-in` first when the session is gone;
one unit check that the admin accepts a workers.dev session for a publish once `PUBLIC_ORIGIN`
names the domain, or publish on the domain.

**8. Major, correctness. Connecting the machine account to Workers Builds needs Geoff's Cloudflare
dashboard session.** Pre-flight :115. The park row says "open
https://dash.cloudflare.com/?to=/:account/workers-and-pages, connect your GitHub account"
(`catalogue.mjs:703`); Playwright has no Cloudflare session, so the first unattended gate run stops
for Geoff. If Cloudflare's App is installed for selected repositories only, every new gate
repository parks at `builds-repo-not-selected` (`chapter3.mjs:1053`). Fold: a `[you]` item before
the first gate run, Geoff connects the machine account in the dashboard with All repositories,
checked by a `putBuildConnection` on a throwaway machine-account repository that returns 200, then
teardown.

**9. Major, correctness. The gate token's scopes don't match the CLI's eight keys.** Pre-flight
:110. The CLI's set is zone, dns, workers_scripts, ssl_and_certificates, email_sending, workers_ci,
d1, workers_r2, each edit, over accounts `*` and zones `all` (`prefill.mjs:44-50`, :67-71, :97-98).
The plan drops SSL and Certificates, adds Workers Routes, and puts Email Sending on the account
only, but the CLI calls the zone routes `/zones/:id/email/sending/subdomains` (`api.mjs:528`, :534)
as well as the account send. Fold: mint from `CHAPTER3_PERMISSION_KEYS` at both levels, the zone
side limited to `carin-test.org`; item 10 proves it.

**10. Major, correctness. The credential checks prove reads only.** Plan :108-110, :480-484.
`tokens/verify` and `gh api user` are reads; the smoke checks `wrangler whoami` text, but a fresh run
reads `wrangler whoami --json` accounts (`account.mjs:61-79`, `account-lookup-failed` on an empty
list); the smoke doesn't name which wrangler (sites run the template's `^4.156.2` through `npx
--no-install`; the root carries `^4.148.0`). Fold: the smoke drives the CLI's `makeApi` routes with
the gate token (`/user/tokens/verify`, `listZones`, `GET builds/tokens`, the email subdomain list),
`whoami` and `whoami --json` on the template's wrangler, one create-and-delete of a throwaway
`cairn-e2e-gate-probe` D1 database and R2 bucket, and `gh api -i user` reading `X-OAuth-Scopes` for
`repo` and `delete_repo`.

**11. Major, correctness, mild OWNER FORK. The no-op promotion check can pass with the box off.**
Pre-flight :112. `npm dist-tag add` returns early with "is already set to version" before the
authenticated PUT when the tag already points there (`npm/cli lib/commands/dist-tag.js`, after
`#oidc` and `fetchTags`), so `promote=0.99.0-rc.2` writes nothing. The design also said to probe
"before any task depends on it". Options: (a) the first real promotion of rc.3 is the probe, with
the fallback ready, and say so; (b) Geoff ticks the box before launch and the session dispatches
from the branch moving `next` to rc.1 and back. Recommend (a); reword the check so it doesn't claim
to prove the permission.

**12. Major, correctness. T6b's browser routing and page fixtures are unspecified.** Plan :509-516,
:545-547. "Opens each URL the shim logged" also opens the Cloudflare prefill page
`dash.cloudflare.com/profile/api-tokens?...` (`prefill.mjs:282`), and an unrecognized page stops the
run, so every leg stops. Hand-written fixtures make the selector tests vacuous; captured ones carry
`authenticity_token` and the login into a public repo. Fold: a URL classifier (act on the loopback
manifest page, the GitHub install page, the OAuth authorize page, the sign-in link; log and skip
`dash.cloudflare.com` prefill URLs); fixtures captured once from the machine account in T6b and
scrubbed by a named step, with `fixtures-hygiene` extended to cover them.

**13. Major, correctness. T2's rebuild trigger is stated two ways.** Plan :262-269. "Kick a build
when the reconcile finds nothing and the hash differs from the last deploy's", but the failure path
says a re-run "finds the hash equal, kicks a build". No last-deploy hash is recorded; only
`buildsReconciledHash`, written when the commit lands. Fold: one rule in record fields: on
`changed: false`, kick when `buildsLastBuildOutcome !== 'success'`, or when the reconcile ran its
diff (the hash differed) and found the repository already matching.

**14. Major, correctness. Install names can't fit the 34-character App name limit.** Plan
:520-521. `cairn-e2e-gate-` (15) + `-a-` (3) + `yymmddhhmm` (10) = 28, leaving 6 for the version
slug; any natural slug of `0.99.0-rc.3` is longer. Fold: define the slug (`rc3`, `s0990`) or shorten
the timestamp.

## Minor

15. Pair A's files overlap: T1 and T4 both edit `CHANGELOG.md` `## Unreleased`. Fold: T4 writes its
line at the close, or T1 owns both.

16. The tests-that-pin list (:132) is incomplete and partly wrong. Missing:
`resume-chapter2.test.mjs:279-334` and :695-731 (under `--yes` with no domain these now enter
chapter 3 and exit 1 at the token hop, where they assert exit 0, `step: live`, zero Cloudflare
requests), `resume-chapter3.test.mjs:259-299`, and the id at `chapter3.test.mjs:1603`. Wrong:
`chapter2.test.mjs:407` and :641 don't change; `resume-chapter3.test.mjs:220`, :457, :507, :802 match
the substring `Workers Builds is not connected`, which the new sentence still starts with, so they
pass unchanged and must assert `does not change` to prove the new copy.

17. A `--yes` run at `live` with no token changes exit code: before, exit 0; after T1, exit 1 at
chapter 3's token hop. Fold: name it in T1 and add a MIGRATION-NOTES line for unattended scripts.

18. Citation errors: `create-your-site.md:108-115` is :108-114 (113 is the end-to-end line, 114 the
fence); `README.md:262-270` runs :266-272; `chapter2.mjs:527-534` starts at :526.

19. Calling the live admin smoke "not owed" (:158) breaks the run sheet's merge rule, whose autoMode
merge line requires "security read and live smoke" for an `auth-data` PR. Fold: say this PR merges
only through the approval-queue verdict route, or run the smoke.

20. The Workers Paid check (:113) can't run with the gate token, which holds no billing read. Fold:
name the token and the route.

21. Teardown doesn't name its re-run states (:536-540). Fold: a 404 counts as done; R2 has no REST
list-objects route, so state the bucket is expected empty and stop if it isn't.

22. The executor prompt doesn't ask for the CI verdict on each accepted task's head; only T4 asks.

23. No standing answer for an unreachable bar: after a T6a smoke stop, T2, T3, T4, T5, and T6b's
unit work continue, the PR opens, and the harness is listed as blocked.

24. No host is named for the smoke and the gate (age-store sync of the new secrets, Playwright
browser install).

25. `record.mjs`'s identity is unstated: `gh release edit` must run as glw907; the allowlist env
never sets `GH_TOKEN`.

26. (optional) "The masked prompt shows no characters" (:471) is wrong: clack prints one mask
character per typed character. Assert the token string never appears.

27. (optional) Over-ceremony: fold T7 into T4 and drop the placeholder (saves 25 path minutes); T3
runs after T5 inside Pair C (60 + 20 under 100); drop T3's fresh fact-check on a one-sentence change.

28. (optional) The adapter's runner list (`cairn-running-passes/SKILL.md:31`) lists
`scripts/checks/**`, `.github/workflows/**`, `.github/ci-green.json`; the plan classes
`scripts/gate/**` and `.claude/skills/**` as runner. Fold: T6a updates the adapter line with
`gate-table.json`.

## Workstation lens

Pre-flight `[you]` items each carry a check, except the Workers Builds GitHub connection (8). The
scope check is read-only (10) and the dist-tag check can pass with the box off (11). Auto-mode reads
hold: both new allow rules cover every live action in `run-gate.sh`, and `gh release create` is
already allowed; the gap is the auth-data merge rule (19). The escalation list is present and sound.
The clock and smoke stops lack a remaining-work answer (23). Hosts are not named (24).
