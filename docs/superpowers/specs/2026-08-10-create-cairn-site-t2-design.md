# create-cairn-site Pass T2: the GitHub chapter

Fable sitting, 2026-08-10. Child spec of the umbrella
(`2026-08-09-admin-setup-and-docs-reset-design.md`, Part 1 step 4 and Part 3 pass 2), planned
against the verified premises in `docs/internal/2026-08-09-tool-passes-platform-spikes.md` and
the two T2 items filed by T1 in `docs/internal/docs-friction-log.md`. Status: approved by Geoff
this sitting. Three forks were put to him and locked: the OAuth shape (the admin's own App), the
dev-script mechanism (a shipped shim), and the live-verification target (personal account plus a
scratch org). The whole design, including the Administration:write consequence and the fallback
ranking below, was approved as presented.

## The one design change against the umbrella: manifest-first

The umbrella's step 4 ordered the chapter OAuth → repo → push → App, and treated the GitHub
OAuth client as standing infrastructure: an app Geoff owns forever, a published client id,
publisher-verification and revocation worries. That shape has a structural cost the umbrella
itself flags: GitHub's web-flow token exchange requires a client secret, a public CLI cannot
keep one confidential (the `gh` precedent is to ship it embedded and public), and every admin
would meet a consent screen for an unverified third-party app asking for broad `repo` scope.

T2 inverts the order instead. **The manifest flow runs first, and the App it creates is the
OAuth client.** The manifest exchange needs no credential at all, and its response hands the
tool the new App's `client_id`, `client_secret`, PEM, and `webhook_secret` — an App the admin
themselves owns. The tool then runs the loopback web-flow against that App to get the user
token for repo creation and the push. No shared OAuth app exists, no secret ships in the CLI,
no third-party consent screen appears, and the permissions are exactly as narrow as the
manifest specifies. The umbrella's "OAuth-client standing infrastructure" work item dissolves;
what remains of it is the per-site App's own lifecycle, which the admin owns.

### The spike this rests on, and the fallback order

The one unverified premise: **can a user access token from a fine-grained GitHub App call
`POST /user/repos`?** Repo creation is not scoped to an existing repo, so it may sit outside
what App user tokens can reach. This is the plan's first task, run against real GitHub before
any flow code is written, bundled into the same Geoff browser sitting as the live e2e below.

- If yes: the design above stands.
- If no: the fallback is the **guided browser repo-create** — the tool walks the admin through
  GitHub's own new-repo form, then pushes the scaffold via the App installation token once the
  App is installed on it. Zero standing infrastructure survives the fallback too; it costs one
  manual browser form and bends the umbrella's "no hand-typed identifier" line by one typed
  repo name. The shared embedded-secret OAuth app is explicitly **not** the fallback.
- The fine-grained PAT path stays a documented escape hatch only. No pass builds it out until a
  real failure mode demands it (spike G confirmed the Administration permission covers it, so
  the door is known to open).

### The permission consequence, accepted

For the admin's user token to create a repo, the App's manifest must carry
**Administration:write**, and the App keeps it for life on its installed repo: GitHub exposes
no API to shrink an App's permissions, so removal would be a manual UI step the tool will not
demand. Accepted because the increase is marginal — a leaked PEM already holds contents:write,
which can wreck the content history; Administration adds repo settings and deletion, and GitHub
soft-deletes repos with a 90-day restore window — and because it buys deleting the entire
standing-infrastructure surface. The docs state it plainly rather than hiding it.

## The chapter's flow

1. **Consent gate.** After T1's local value moment, the tool offers the GitHub chapter, states
   exactly what will be created (an App the admin owns, a content repo, one browser sign-in),
   and runs the authenticated pre-flight checks the umbrella deferred to this point (2FA state,
   org policy) immediately after consent, failing fast with the right remedy.
2. **Manifest flow.** The tool builds the App manifest (permissions pre-specified:
   contents:write, Administration:write, metadata; loopback `redirect_url`), opens the browser,
   receives the temporary code on the loopback server, exchanges it inside the one-hour window,
   and lands the App credentials in the 0600 state store. The App name defaults to a
   site-derived slug; a name collision is a first-class error with `--app-name` as the recovery
   (App names are globally unique). The organization branch targets
   `organizations/<org>/settings/apps/new`.
3. **Loopback web-flow OAuth against the admin's own App.** Yields a short-lived user access
   token, held in memory only and never written to state.
4. **Repo create and push.** `POST /user/repos` (or the org endpoint) with the user token, then
   one commit via the Git Data API: blobs → tree → commit → update ref. No git binary is a
   prerequisite anywhere in the journey. The user token is discarded after the push.
5. **Installation.** One guided browser session; the tool discovers the installation id by
   polling with App JWT auth. The organization "Install and request" owner-approval state is
   detected, names who to ask and for what, and parks as a first-class resumable state.
6. **Hand-over.** An honest stub: repo live, App installed, deploy arrives with the next
   chapter. The tool is unpublished until release one, so the stub needs no flag-gating and T3
   replaces it before any admin sees it.

## What T2 ships beyond the flow

- **The resume frame.** Re-running the tool detects parked state and re-enters at the right
  step. The plan carries the umbrella's resume table scoped to this chapter's rows: the
  manifest exchange window (one hour), the OAuth authorization code (minutes), org approval
  pending (an external state machine, re-detected on resume rather than waited on), created
  resource ids (permanent), a partial push (re-pushable idempotently; the Git Data commit is
  atomic at the ref update).
- **The check-then-copy fix comes due.** T1 filed the empty-directory guard's non-atomicity
  "for when the tool grows a resume path"; T2 is that pass. The guard becomes an atomic claim
  on the target directory (exclusive-create sentinel or `mkdir` claim).
- **The dev-script shim** (T1 friction-log item, fork locked this sitting). The template
  carries a ~10-line `scripts/dev.mjs` that sets `CAIRN_DEV_BACKEND=1` and spawns `vite dev`,
  passing arguments and exit code through, with a comment saying why the variable exists (the
  opt-in is deliberately runtime so no build can fold the dev backend into a deployed Worker).
  The printed hand-over command becomes plain `npm run dev` on every platform, with no
  PowerShell branch; T1's copy-locking test moves to lock the shim's presence and wiring
  instead of the flag text. No `cross-env` dependency enters the template.
- **Token opacity as code** (spike F made this a requirement, not a caution). Installation and
  user tokens are never parsed, measured, or pattern-matched; nothing assumes a length or
  shape; the state store holds them as opaque strings.
- **Error catalogue rows for this chapter**, each with literal message text, each classified
  wait / act / ask-someone, each ending in the one next command: consent denied, authorization
  code expired, manifest exchange window expired (App exists, key unrecoverable: regenerate or
  re-run with `--app-name`), App-name collision, repo-name collision, org approval pending,
  2FA/SAML refusal, partial push. No run exits without printing a next step.

## Security rules carried and extended

The umbrella's rules hold: no secret is ever written under the project directory; the runtime
library never touches provisioning credentials. T2 adds: the user access token lives in memory
only for the minutes between OAuth and push, and is never persisted; the PEM sits in the 0600
state store until T3's Worker exists, at which point the umbrella's "moves to a Worker secret
and leaves local state" rule executes (a T3 deliverable, named here so the plan does not
reinvent it).

## Testing and verification

- **A local fake GitHub server** backs the node:test suite. The tool's flows already talk to
  `127.0.0.1` for the manifest and OAuth redirects, so the fake slots in naturally: it
  implements the manifest exchange, the token endpoints, repo create, the Git Data endpoints,
  and installation listing, and its consent pages are driven directly by the tests. Every
  error-catalogue row is **triggered** against it, not read.
- **The fake encodes our reading of GitHub, so the live layer checks the reading** (fork
  locked: personal plus scratch org). One recorded end-to-end on glw907 personal — App and
  repo created, verified, deleted — plus a free scratch org to live-prove the org-owned
  manifest path. The "Install and request" parked state proves against the fake only, since
  triggering it needs a non-owner member account. The spike, the personal run, and the org run
  bundle into a single Geoff browser sitting early in execution, per the one-prompt discipline.
- **CI**: the fake-server suite joins the package suite in `test.yml`. `create-site.yml` is
  unchanged except the scaffolded site it builds now carries the shim, which its existing
  build gate exercises for free.

## Out of scope, named

Worker-secret PEM migration, `wrangler.jsonc` emission, deploy, the bootstrap session, the
localhost console polish, and the agent-brief skill (all T3). The PAT path build-out (escape
hatch only, above). The `SiteConfig` doc-comment and index-signature finding stays in the
friction log: dropping an index signature is a public-surface change with extender
implications, not a T2 rider. All docs-track work is Pass D.

## Acceptance criteria

A cold run on a clean machine with a fresh GitHub account reaches, at the chapter's end, a
pushed content repo and an installed App the admin owns, with no git binary, no hand-typed
identifier (spike-contingent: the fallback bends this by one typed repo name and says so), no
shared OAuth client, and no secret under the project directory. The scaffolded site's
`npm run dev` reaches the local admin bare, on every platform, with no printed flag. Every
interruption point is either idempotent or prints its named recovery; the org approval state
parks and resumes; the error catalogue is triggered in tests, not read. The check-then-copy
guard is atomic. Tokens are treated as opaque everywhere. The live e2e is recorded with
evidence, and the fake-server suite plus all nine repo gates are green, including the four
CI-only ones.
