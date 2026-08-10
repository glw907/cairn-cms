# create-cairn-site Pass T3: the Cloudflare chapter (design)

Fable sitting, 2026-08-10 night. Inputs: Part 1 of the umbrella spec
(`2026-08-09-admin-setup-and-docs-reset-design.md`), the platform-spikes doc
(`../../internal/2026-08-09-tool-passes-platform-spikes.md`), the T2 post-mortem
(`../plans/2026-08-10-create-cairn-site-t2.md`), and engine reads made this sitting
(`src/lib/auth/crypto.ts`, `src/lib/auth/store.ts`, `src/lib/sveltekit/auth-routes.ts`,
`src/lib/env.ts`, `examples/showcase/wrangler.jsonc`). Status: design approved by Geoff in
the sitting; this document is the approved record.

## Rulings made this sitting (amend the umbrella's Part 3)

1. **The T3 charge splits into three passes.** STATUS's "Cloudflare plus the two doors" is
   roughly ten deliverables, more than twice T2's plate, which is the accretion shape the
   sizing doctrine names. The cuts sit on real boundaries: **T3** is the Cloudflare chapter
   through chapter 1's finish line (the admin signed into their own admin on `workers.dev`);
   **T4** is chapter 2 (money, domain, email) plus Builds connect, the first work that needs
   a credential wrangler cannot mint; **T5** is the browser door (the public
   `cairn-waymark-template` repo, the Deploy button, C3 `--template` compatibility). Pass D
   follows T5. Each of T4 and T5 gets its own just-in-time plan; their dated briefs are at
   the end of this spec.
2. **The localhost console grows where the waits live.** T3 keeps T2's terminal-primary
   shape, with loopback pages as landing and progress pages. The console takes its full form
   in T4, whose long external waits (DNS delegation, email onboarding) are what it exists
   for; the GitHub chapter is retrofitted only if it comes free.
3. **T4 plans around token-prefill** for the residual API surface (zone creation, DNS
   writes; spike A made the choice required). A deep-linked, URL-prefilled token template
   costs one copied identifier and says so; the self-managed OAuth client is rejected
   without a spike, since Cloudflare has no public OAuth-app registration program (wrangler's
   client id is Cloudflare's own).

Standing rulings carried forward unchanged: the Registrar is retired (Geoff, T2 close);
no secret under the project directory; every exit prints a next step; every wait prints a
heartbeat; tokens opaque; `--dry-run` prints the whole chapter and performs none of it; the
desktop-side-effect constraint (no suite may spawn a browser; the PATH-controlled pattern).

## Scope

T3 takes a site from the `pushed` state to chapter 1's finish line: deployed on the free
`workers.dev` hostname, D1 provisioned and migrated, the App key a Worker secret, and the
admin signed in — no money, no domain, no email, no new engine surface. Out of scope:
chapter 2 in its entirety (T4), Builds connect (T4), the template repo and button (T5), the
full console (T4), the Registrar (retired), and any change to the engine's public API.

## The chapter's flow

Each numbered piece is an Action through the T1 runner, so `--dry-run` prints every title
and detail and executes nothing.

1. **Consent.** What will be created, plainly: one Cloudflare Worker, two D1 databases
   (the auth store and the site's own), one R2 bucket, all on the admin's Cloudflare
   account; the free plan suffices; one browser trip (Cloudflare's own sign-in) plus one
   sign-in click at the end. Declining is a normal return, not a catalogue row.
2. **Wrangler.** The tool shells out to the scaffold's own wrangler devDependency
   (`npm exec` in the scaffold dir), falling back to `npx --yes wrangler@<major pinned to
   the template's devDependency>` when `node_modules` is absent. `wrangler whoami` detects
   an existing session; otherwise `wrangler login` rides wrangler's own browser flow. The
   chapter holds no Cloudflare credential of its own: the zero-credential quickstart is
   exactly wrangler's session (spike A: chapter 1 lives inside `workers:write`,
   `workers_scripts:write`, `d1:write`).
3. **The owner prompt.** One new prompt: the email address the admin will sign in with.
   Written to the state record (it is the owner row's identity and day-2 attribution),
   never into the scaffold.
4. **Config finalization.** The bake already emits the showcase's `wrangler.jsonc` minus
   the `cairn-template:exclude` blocks. The scaffold substitution grows to rewrite the
   worker name and the database and bucket names to the site slug, and to **drop the
   placeholder `database_id`s** so deploy auto-provisions the resources and writes the real
   ids back (the umbrella's id-less claim, re-verified by this pass's spike). The App's
   non-secret identity lands as `vars`: `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID`
   (the engine's env contract, `src/lib/env.ts`; the doctor reads the same names). The plan
   verifies how the template's adapter sources that identity and amends the substitution if
   it is source-carried rather than env-read.
5. **Deploy, then migrate.** `wrangler deploy` first (creates the D1s and the bucket),
   then `wrangler d1 migrations apply --remote` for **both** databases (each has its own
   `migrations_dir`; the deploy-first ordering is the umbrella's). The live URL comes from
   the deploy; `PUBLIC_ORIGIN` must end up carrying it, which likely forces a second
   deploy — whether the `workers.dev` subdomain is knowable before the first deploy is a
   spike question, and the two-deploy shape is the assumed fallback.
6. **The key move.** `wrangler secret put GITHUB_APP_PRIVATE_KEY_B64` from the 0600 state
   store, and on success the PEM is **deleted from local state** — the umbrella's rule
   ("the PEM moves to a Worker secret and leaves local state as soon as the Worker
   exists"), closing T2's carry-forward. After this hop the state record holds no key
   material; the Worker is the PEM's only home, and regeneration at the App's settings page
   is the recovery if it is ever lost.
7. **Bootstrap sign-in, no engine change.** The engine stores magic-link tokens as SHA-256
   hashes in D1 and the allowlist is the D1 `editor` table, so the tool seeds the owner row
   and one short-TTL hashed token via `wrangler d1 execute --remote`, then opens the site's
   own `/admin/auth/confirm?token=…`. The confirm page is a GET plus one POST click by
   design (anti-prefetch), so the admin clicks Sign in once and the engine mints a real
   session through its own code path. First sign-in never touches email; email demotes to a
   doctor check and T4's test-send. An expired bootstrap token is reseeded by re-running,
   never a dead end.
8. **Hand-over.** The live URL, signed in; what exists now and where (Worker, databases,
   bucket, secret); "your domain and email arrive with the next chapter" as the T4 stub;
   the doctor line.

## State and resume

The record's `step` grows `deployed` and `live` (after `pushed`; `live` is the chapter's
completed state). Each hop persists through `updateSite` (the T2 deep-merge writer). A new
`cloudflare` section carries what the run learns: the `workers.dev` URL, the written-back
database ids, the account id if surfaced. `ownerEmail` joins the top level. Resume
re-enters by `step`: deploy and migrations are naturally re-runnable, the secret put is
idempotent, and the bootstrap reseeds. `--start-over` and the T1/T2 resume frame are
unchanged.

## The error catalogue, extended

New rows, each with literal text ending in one next step, each triggered by a test:
wrangler missing or too old; login declined or timed out; deploy failed (with the
subdomain-not-registered case first-classed if the spike shows new accounts hit it);
migrations failed; secret put failed; `d1 execute` failed; bootstrap token expired
(kind: act, the re-run reseeds). The T2 rows are untouched.

## Testing

The T2 fake-server pattern adapts to shell-outs: a **fake wrangler shim** on a controlled
`PATH` records every invocation (argv, cwd, stdin) to a log the tests read, and plays
canned stdout per subcommand. The suite proves ordering (deploy before migrations before
seed), the dry-run zero-invocation instrument, resume skipping completed hops, the
PEM-deleted-after-secret-put rule (state read back), the no-secret-under-the-scaffold scan
extended to the Cloudflare hops, and every catalogue row — no network, no real wrangler, no
browser. The desktop-side-effect constraint from T2 stands as a global rule.

**The spike (Task 1 shape, main-loop, no Geoff browser needed).** Run against the glw907
account with the estate's standing auth: (a) does wrangler 4.x deploy auto-provision
id-less `d1_databases`/`r2_buckets` entries and write the ids back, and in what form; (b)
does a `send_email` binding deploy on an account with no onboarded sending domain (chapter
1 must deploy with email unconfigured); (c) is the `workers.dev` subdomain knowable before
the first deploy, and what a subdomain-less account experiences; (d) `d1 execute --remote`
quoting and size limits for the seed statements; (e) the deploy output's URL parseability.
Verdicts land in a dated internal doc and amend the plan's task briefs before dispatch,
the T2 pattern.

**The live e2e** is one sitting on the glw907 account: bake with packed tarballs (the CI
pattern), run the full chapter from `pushed`, verify the deployed admin signs in through
the bootstrap and the state record ends at `live` with no key material, then tear down
(worker, databases, bucket delete). Geoff's only live moments are at most `wrangler login`
and the one confirm click; the interrupted-resume check re-runs from `deployed`.

## Documentation (a pass dimension)

The package README gains the Cloudflare chapter (what gets created, the free-plan framing,
the flags, resume). `CHANGELOG.md` extends the `## Unreleased` create-cairn-site entry;
`Consumers must: nothing` (the tool is unpublished; no engine surface changes). The
friction log's hardening entry triages complete-or-move if T3 touches the files it names.
ROADMAP marks the T3 slice in place and records the three-pass split so T4/T5 have homes.
No engine reference page changes (no public-API change); the doc gates run by name at
pass close per the ritual.

## Acceptance criteria

A cold run on a machine with Node and a Cloudflare account (free plan, signed out) goes
from `pushed` to signed into its own `/admin` on `workers.dev` with: no payment, no domain,
no email, no hand-typed identifier beyond the owner email; the PEM absent from local state
and present as a Worker secret; both databases migrated; `--dry-run` printing the whole
chapter with zero shell-outs and zero network; every interruption point resuming or
printing its named recovery; no run exiting without a next step; the catalogue rows
triggered, not read. The runtime library is untouched.

## The T4 brief (dated 2026-08-10, for its own sitting)

Chapter 2 (money, domain, email) plus Builds connect, planned around **token-prefill**
(ruling 3): the tool deep-links the dashboard's create-token page with a URL-prefilled
template (Zone:Edit + DNS:Edit at minimum), the admin pastes one token, stored 0600 in the
state store, never under the project. Wrangler's session still covers
`email_sending:write`. The localhost console takes its full form here (ruling 2). Open for
that sitting: whether Builds connect rides `workers:write` or needs the prefilled token
too (spike B left it unconfirmed); the domain half's live-e2e strategy (the production
domains are untouchable; a scratch domain or fake-only proof is the fork); the prefill
URL's exact parameter shape; the existing-records carry-over UX (the umbrella's
MX-preserving confirmation gate). The Registrar stays retired unless a real admin asks.

## The T5 brief (dated 2026-08-10, for its own sitting)

The browser door: a public `cairn-waymark-template` repo carrying the Deploy-to-Cloudflare
button, generated from the same emitter output (single source holds), synced by a
release-time workflow, satisfying C3's `--template` contract, shaped for a later
`cloudflare/templates` gallery submission. Open for that sitting: the button's actual
behavior against a cairn-shaped `wrangler.jsonc` (a live spike; the auto-provision claim
is the umbrella's, dated 2026-08-09); how a button-deployed site meets the bootstrap (the
CLI "finishes what the button cannot" against an existing repo, which is an
adopt-existing-repo path the CLI does not have yet); where the button flow leaves secrets
and whether that respects the no-secret rules. T5 lands before Pass D so the admin track
documents both doors; the tool and template publish with release one, same cut.
