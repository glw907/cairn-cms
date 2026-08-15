# Pass D mining sweep: the admin audience

Read on 2026-08-14, before the old arms are deleted. This is the safety-net record for the site-admin
slice of the deletion audit.

## Summary and judgment

I read the seven old pages whose reader runs a site rather than writes code
(`guides/cloudflare-readiness.md`, `deploy-to-cloudflare.md`, `set-up-the-github-app.md`,
`configure-auth-and-d1.md`, `rotate-the-github-app-key.md`, `troubleshooting.md`,
`read-cairn-logs.md`, plus `guides/README.md` for the audience map) against the eight new
`docs/admin/` pages, and verified every candidate against the current source tree. **Very little was
lost.** Two structural facts explain why. First, the old corpus had no admin audience at all: its
index splits into "For developers" and "For editors" only, so what an admin now needs was written for
a developer, and most of it moved intact into `docs/extend/`. Second, `docs/reference/` is not being
deleted, and it is thorough: `reference/log-events.md` and `reference/doctor.md` already carry the
event vocabulary, the doctor's flags, its credential inputs, and its skip semantics in more detail
than the old guides did. So the real loss is narrow and of one kind: **a handful of operational facts
that survive somewhere in the tree, but no longer sit anywhere an admin would look**, plus one
statement on a new page that the code contradicts.

Six finds are worth folding, and only the first is more than a sentence or two. Two more are
cross-track (they belong to `extend/`, not to me, and I flag them for whoever owns that slice). I
declined twenty-odd candidates; that list is below and is the part that makes the deletion auditable.

## Finds, ranked

The "Survives?" column matters: a fact still carried by `docs/reference/` or `docs/extend/` is not
being deleted, only left out of the admin's own path. Ranked by what an admin loses in practice.

| # | Old source | The fact | Code proof | Survives? | Goes on | Proposed addition |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `guides/troubleshooting.md:24-28`; `configure-auth-and-d1.md:226-228` | Two of the three sign-in outcomes are visible **only** to someone already on the roster. A non-editor's request returns the neutral "check your inbox" before either branch can run, so "We're having trouble sending sign-in links right now" and "You requested a link recently. Check your inbox, or wait a minute and try again" both prove the person *is* on the roster. The second also fixes the timing: one send per address per minute. | `src/lib/sveltekit/auth-routes.ts:124` returns `{status:'sent'}` for a non-editor *before* the throttle branch (`:128-130`) and the send-failure branch (`:146-150`); `src/lib/auth/crypto.ts:65` `SEND_COOLDOWN_MS = 60 * 1000`; `src/lib/components/LoginPage.svelte:95-102` renders the two strings. The code comment at `auth-routes.ts:127` names this deliberately: "This reveals editor membership, the deliberate relaxed-non-leak posture." | Editor-facing halves survive in `editors/when-something-goes-wrong.md:9-15`; the admin's diagnostic reading survives nowhere | `admin/troubleshooting.md`, "Nobody can sign in" | Add: what your person quotes back tells you which case you are in, and correct `troubleshooting.md:35-37`, which currently says the sign-in page "never reveals whether an address is allow-listed... and neither can you from the page itself." That is true of the ordinary send, and false of these two messages. |
| 2 | `guides/troubleshooting.md:43-63` | A failed publish logs `publish.failed`, not `commit.failed`, so an admin filtering on the event the new page names finds nothing. Separately, the **"Publish site (N)" control disappearing** is not a failed publish: it means the admin could not read GitHub at all, and the shell hides the control rather than showing a count it cannot know. | `src/lib/sveltekit/content-routes-core.ts:1505` and `:1600` emit `publish.failed`; `:584` logs `github.unreachable` with `scope: 'shell'` and resolves the pending list to `null`; `src/lib/components/CairnAdminShell.svelte:644-648` renders the control only under `{#if pending && pending.length > 0}` | `reference/log-events.md:36-38` | `admin/troubleshooting.md`, "A save or publish reports a conflict" | Name `publish.failed` alongside `commit.failed` in that section's log line, and add a one-row symptom: the Publish site button vanishing means `github.unreachable`, which points at the GitHub App, not at a publish. |
| 3 | `guides/troubleshooting.md:114-116`; `cloudflare-readiness.md:190-199` | The live admin probe runs **only** on `--probe`; it is never part of a bare `npx cairn-doctor`. A second opt-in, `--send-test <address>`, sends one real email through the configured sender. | `src/lib/doctor/bin.ts:76` (`if (args.sendTest)`) and `:79-81` (`if (args.probe !== undefined)`), with the comment at `:77-78` naming it opt-in | `reference/doctor.md:38-39, 99-100, 119-127` | `admin/is-it-working.md`, "Probe the deployed admin"; the email path in `admin/troubleshooting.md` | The probe section reads as though the check runs by default, so an admin cannot act on it. Add the flag to that section, and point the "nobody can sign in" path at `--send-test` as the way to prove sending without waiting on a real editor. |
| 4 | `guides/set-up-the-github-app.md:109-111` | The credential-bearing checks **skip** when their credentials are not in the shell that runs the doctor, and a skip does not read as a failure. The GitHub App check needs `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_B64`; the sending-domain, zone HTTPS, zone HSTS, and D1 auth-store checks need `CLOUDFLARE_API_TOKEN`, which is env-only and never derived from the repo. On a site set up by `create-cairn-site`, the App's key lives in a Worker secret, so none of the three is in the admin's shell by default. | `src/lib/doctor/checks-github.ts:20-21` skips with that exact remediation; `src/lib/doctor/assemble.ts:104` reads `cfToken` from env only, and the comment at `:145-146` states "The API token is never derived; it stays env-only"; `src/lib/doctor/cloudflare-api.ts:10` `NO_TOKEN`; `src/lib/doctor/checks-cloudflare.ts:87, 120, 151` return it | `reference/doctor.md:46-49, 64-67` | `admin/is-it-working.md`, "Running the check" | The page already teaches this trap once, for `config.csrf-disable-missing`. Generalize it in the intro: a skip means the check did not run, and the most common reason is a credential absent from your shell, not a step you have not reached yet. |
| 5 | `guides/cloudflare-readiness.md:33-39` | `config.bindings-missing` is shared by three checks, not one: the `EMAIL`/`AUTH_DB` pair, the adapter's R2 media bucket, and the tidy key. An admin whose doctor flags this id for a missing media bucket reads a section that describes neither their failure nor their fix. | `src/lib/doctor/checks-local.ts:14-27` (bindings), `:33-49` (media bucket, same `conditionId`), `:223+` (tidy key, same id), with the comment at `:29-32` explaining the shared id | `reference/doctor.md:74-75, 80-86` | `admin/is-it-working.md`, "Deploy the Worker with its bindings" | One sentence: this id also covers a media bucket the adapter declares but wrangler does not, and the tidy key; the check's own detail line names which. |
| 6 | `guides/troubleshooting.md:19, 65-73` | `guard.rejected` carries five reasons, not three. `bindings` (a missing `AUTH_DB`) is a distinct, whole-admin symptom: every admin path including the login screen serves the same branded page, at 500, before any sign-in code runs. `dev_backend_in_prod` answers a bare 503. | `src/lib/sveltekit/guard.ts:93` (`dev_backend_in_prod`), `:104` (`origin`), `:115` (`https`), `:125-131` (`bindings`, on every admin path by design per the comment at `:119-122`), `:145` (`csrf`) | `reference/log-events.md:39` | `admin/troubleshooting.md`, "A form gets refused" | `troubleshooting.md:53` says the `reason` field "names which of those three it was." Widen it, and add the distinct symptom: if *every* admin page including sign-in shows the same error, that is `reason: "bindings"`, and `config.bindings-missing` is the fix. |

### Cross-track, flagged for the `extend/` sweeper

Neither is mine to fold, and both are marginal. Recorded so they are not lost by falling between slices.

| Old source | The fact | Code proof | Survives? |
| --- | --- | --- | --- |
| `guides/rotate-the-github-app-key.md:44-49, 66-67` | Two things the new `extend/rotate-the-github-app-key.md` drops: `.dev.vars` needs the same new value or local `wrangler dev` keeps signing with the retired key; and `/healthz` runs the real signing self-test against the deployed Worker's own copy of the secret, which is a lighter proof than the new page's step 5 (a real save). | `src/lib/sveltekit/health.ts:28-36` signs through the real path and returns `{ok, checks:{githubAppSigning}}` | `/healthz` survives in `reference/sveltekit.md:1330-1343, 1884`; the `.dev.vars` half survives nowhere |
| `guides/deploy-to-cloudflare.md:69-72` | Workers Builds deploys code on every push and has **no** equivalent for D1 migrations; a schema change from an engine update still needs `wrangler d1 migrations apply` run by hand. | Four shipped migrations exist (`migrations/0000_auth.sql` … `0003_preview.sql`), and only the feature pages that introduce one tell you to apply it (`extend/share-a-draft-preview.md:13-15`) | Absent: `extend/upgrade-cairn.md` has five steps and none mentions migrations |

## Checked and declined

Every candidate I raised and rejected, with the reason. The first two groups are the bulk of it.

### Declined: the fact survives in the reference or extend arm, which is not being deleted

- **Magic-link TTL (10 min), session TTL (30 days), the per-address cooldown as a constant.**
  `extend/security-model.md:24-25`; the admin-visible halves are already on
  `admin/create-your-site.md:83-95`.
- **Removing an editor cuts their live session and pending token; a role change takes effect on the
  next request with no logout.** `reference/auth-store.md:106, 128`; proven live by the role join in
  `src/lib/auth/store.ts:97-110` and the comment on `setEditorRole` at `:232`. Worth a future
  one-liner on `admin/invite-editors.md`, but nothing is being deleted.
- **`media.delete_blocked` / `media.replace_blocked` and their `foundIn` count.**
  `reference/log-events.md:49-51`; the editor-facing behavior is in
  `editors/manage-the-media-library.md`.
- **`publish.address_collision` as a warning, not a failure.** `reference/log-events.md:37`.
- **Doctor exit codes; a warning-severity condition still exits 1.** `reference/doctor.md:111-115`;
  `src/lib/doctor/bin.ts:5-6`, `run.ts:24`.
- **`admin.mount-shape` and `skill.admin-screens` never fail, only skip.** `reference/doctor.md:87-88`.
- **The GitHub App's permission scope (Contents: read and write, webhook Active cleared).**
  `extend/add-cairn-to-a-sveltekit-app.md:23-24`.
- **The `0000_auth` / `0001_roles` / `0002_audit` / `0003_preview` migration set and how to copy
  them.** Split across the extend pages that introduce each one.
- **`PUBLIC_ORIGIN` never derives from a request header, so a forged Host cannot redirect a sign-in
  link.** `extend/security-model.md`; `admin/is-it-working.md:141-147` carries the admin's half.
- **The DMARC `p=reject` record persisting after Email Sending is turned off.** Already on
  `admin/own-your-domain.md:95-98`, and better written there than in the old guide.
- **Bootstrap owner via config rather than a D1 insert.** Developer surface; `reference/sveltekit.md`
  (`CairnAdminOptions.auth.bootstrapOwner`). Correctly out of the admin track's scope.

### Declined: the new pages say it differently but equivalently

- **"Onboard the sending subdomain that matches your from-address exactly."** The old
  `deploy-to-cloudflare.md:230-233` frames it as apex-versus-subdomain mechanics;
  `admin/is-it-working.md:89-91` says "The domain has to match your site's configured sign-in
  sender," which is exactly what the check enforces
  (`src/lib/doctor/checks-cloudflare.ts:89, 100-108` requires an enabled entry whose `name` equals the
  from-address domain). Equivalent, and the new wording is the one an admin can act on.
- **HSTS.** Old text says "at least 30 days" (which is still the check's floor,
  `checks-cloudflare.ts:25`, `MIN_HSTS_MAX_AGE = 2592000`); the new page advises six months or more.
  Stricter advice against the same floor, not a lost fact.
- **The admin's own responses carry HSTS regardless of the zone setting.** Both pages say it.
- **Always Use HTTPS, observability, `site.config.yaml` validation, dependency floors, the CSRF
  hand-off.** All present on `admin/is-it-working.md`, and the CSRF section is *better*: it carries
  the `svelte.config.js`-absent skip trap the old page never noticed.
- **A conflict on save is expected last-writer-wins behavior, not a bug.** Both pages say it.

### Declined: out of scope for the admin audience by design

- **The five-file admin mount, the `vite.config.ts` `ssr.noExternal` line, `app.d.ts` binding types,
  `sequence(yourHook, createAuthGuard())`, the `ssr.target: 'webworker'` trap, the `SendMagicLink`
  seam for a non-Cloudflare sender, `createAuthGuard({ includeSubDomains: true })`.** Every one is a
  code change; the admin track bans this vocabulary deliberately and routes to `extend/`.
- **The `wrangler dev` `remote: true` end-to-end sign-in walkthrough** (`configure-auth-and-d1.md:230-272`).
  Developer workflow.
- **The `--connect` reconcile's hash gate reading only your machine, so a commit made directly on
  GitHub goes unnoticed; the roughly fifteen-minute build watch.**
  (`deploy-to-cloudflare.md:31-44`.) Tool internals; `admin/setup-recovery.md:72-80` gives the admin
  the actionable half.
- **The Cloudflare deploy-button note ("cairn publishes no template repository").** Answers a
  question about a thing that does not exist.

### Declined: vendor facts, better linked than restated

- **Workers Logs retention ("up to seven days"), the dashboard's field-query syntax, the
  `$metadata.` prefix, `wrangler tail --search` matching raw text rather than fields.**
  (`read-cairn-logs.md:37-63`.) Cloudflare's contract, not cairn's; unverifiable from this tree, and
  the retention figure differs by plan, so restating it is how a doc goes stale.
  `admin/troubleshooting.md:19-24` correctly gives the two entry points and links the event reference.
- **Email Routing's free-tier verified-destination path, its per-account cap, and its takeover of the
  domain's root MX** (`configure-auth-and-d1.md:174-178`). Real, and a genuine footgun for an admin
  hunting a way around the $5, but it is Cloudflare behavior about a path cairn does not use, and the
  new track's answer (pay the $5, or stay the only signer) is the one an admin can act on.

### Declined: the old page is wrong or stale

- **"The tidy key check is a presence heuristic, not a definitive read"**
  (`cloudflare-readiness.md:36-39`). The code now actively probes Anthropic with a zero-token call
  when a literal value is readable, and reports valid or invalid distinctly
  (`src/lib/doctor/checks-local.ts:216-222`). The old advice to eyeball the value is obsolete.
- **Check ids `auth.role-vocabulary`, `auth.email-normalization`, `auth.role-wiring`**
  (`cloudflare-readiness.md:171-180`). Superseded by the condition ids the new page uses
  (`auth.unknown-role`, `auth.email-not-normalized`, `auth.role-wiring-missing`).
- **"`cairn-doctor --from ... --repo ...`" as the invocation an admin types.** Both are derived from
  the repo when absent (`src/lib/doctor/assemble.ts:148-160`), so `admin/is-it-working.md`'s bare
  `npx cairn-doctor` is correct and the old flags were noise for this reader.
- **`/healthz` as living at `/admin/healthz`.** The source comment in `src/lib/sveltekit/health.ts:1`
  says `/admin/healthz`; `reference/sveltekit.md:1330-1331` says to mount it at the site root,
  outside the guard. The reference is right for a working deployment. Not a mining find, but the
  stale comment is worth someone's minute.

## Adjacent observations, found while verifying rather than mined

Neither comes from the old corpus, so neither is a deletion loss. Recorded because they touch pages
this pass is already editing.

- The doctor takes the registrable domain as the last two labels of the from-domain, which is wrong
  for a multi-part suffix such as `.co.uk` (`src/lib/doctor/checks-cloudflare.ts:31-37`, where the
  comment says so). A UK admin's zone lookup can fail for a reason no page explains.
- `guard.rejected` `reason: 'dev_backend_in_prod'` answers a bare 503 with no branded page
  (`src/lib/sveltekit/guard.ts:92-98`). It is a developer-caused state that an admin experiences as a
  total outage with an unexplained message.
