# create-cairn-site Pass T2: the GitHub chapter

Fable sitting, 2026-08-10. Child spec of the umbrella
(`2026-08-09-admin-setup-and-docs-reset-design.md`, Part 1 step 4 and Part 3 pass 2), planned
against the verified premises in `docs/internal/2026-08-09-tool-passes-platform-spikes.md` and
the two T2 items filed by T1 in `docs/internal/docs-friction-log.md`. Status: approved by Geoff
this sitting, then **amended by a three-agent adversarial fold** (admin-journey, platform
correctness, plan integrity) the same day; the amendments below are marked and await Geoff's
read. Three forks were put to him and locked before the fold: the OAuth shape (the admin's own
App), the dev-script mechanism (a shipped shim), and the live-verification target (personal
account plus a scratch org).

## The one design change against the umbrella: manifest-first

The umbrella's step 4 ordered the chapter OAuth → repo → push → App, and treated the GitHub
OAuth client as standing infrastructure: an app Geoff owns forever, a published client id,
publisher-verification and revocation worries. That shape has a structural cost the umbrella
itself flags: GitHub's web-flow token exchange requires a client secret, a public CLI cannot
keep one confidential (the `gh` precedent is to ship it embedded and public), and every admin
would meet a consent screen for an unverified third-party app asking for broad `repo` scope.

T2 inverts the order instead. **The manifest flow runs first, and the App it creates is the
OAuth client.** The manifest exchange needs no credential and its response hands the tool the
new App's `client_id`, `client_secret`, PEM, and `webhook_secret` — an App the admin
themselves owns. The tool then obtains a user token against that App for repo creation and
the push. No shared OAuth app exists, no secret ships in the CLI, no third-party consent
screen appears. The umbrella's "OAuth-client standing infrastructure" work item dissolves;
what remains of it is the per-site App's own lifecycle, which the admin owns.

### Amended by the fold: install rides the manifest redirect, and the chapter is two browser trips

The approved draft put installation last. The platform review refuted that: a user access
token only reaches resources in accounts where the App is **installed**, and a
manifest-created App has zero installations, so the repo create and push would have failed at
runtime. The corrected shape is better than the broken one:

- The manifest sets **`request_oauth_on_install: true`**, so GitHub's install page doubles as
  the authorize page, and its redirect to the loopback carries **both** the OAuth code and
  the `installation_id`. Install-then-authorize is one browser trip, not two.
- The manifest registers the **portless** loopback callback (`http://127.0.0.1/callback`):
  GitHub's exact-match rule for callback URLs has a documented loopback exception only when
  the registered URL omits the port, and the App's callback is frozen at manifest time with
  no API to change it. A port-bearing registration would have broken every run whose resume
  bound a fresh ephemeral port. (The exception is documented for OAuth Apps; the spike
  confirms it holds for GitHub Apps.)
- The repo is created **after** installation (user token, Administration permission), then
  explicitly **added to the installation** (`PUT
  /user/installations/{installation_id}/repositories/{repository_id}`), so a
  "selected repositories" install can never silently exclude the repo it exists for. The
  tool verifies coverage instead of assuming it; the T1-era failure mode this kills is a
  publish 404 weeks later that no admin could connect to a browser choice.
- The repo is created with **`auto_init: true`**: the Git Data API returns 409 on an empty
  repository, so the push reads the seed ref, writes blobs and one full tree (no
  `base_tree`), commits with the seed as parent, and **`PATCH`es** the ref. The parentless
  commit + `POST refs` shape in the approved draft does not work on real GitHub.

The chapter's browser-moment count is therefore **two** (the manifest form, the
install-and-authorize page), stated as two in the consent copy, with a printed line before
each open naming the page about to appear and the button to press, and a per-step loopback
landing page ("Step 1 of 2 done — return to the terminal").

### The spike this rests on, and the fallback order

The premise the whole shape rests on: **a user access token from a fine-grained GitHub App,
installed on the user's account, can call `POST /user/repos`** (the permissions table says
yes: Administration write, token type UAT; the spike proves it end to end). The spike is the
plan's first task, run against real GitHub in one Geoff browser sitting, and — amended by the
fold — it must exercise the **final** shape, or its verdict is about a flow the tool does not
use: portless callback registration, `request_oauth_on_install`, install before repo create,
the `PUT` repo-link call, and the `auto_init` push. A 403 on an **uninstalled** App proves
nothing (that is the ordering bug, not the permission), which is exactly the conflation the
approved draft's spike had.

- If the spike passes: the design stands.
- If repo creation via user token is refused even when installed: the fallback is the
  **guided browser repo-create** — the tool walks the admin through GitHub's own new-repo
  form, then pushes via the **installation token** once the repo is linked. Zero standing
  infrastructure survives the fallback too; it costs one manual browser form and one typed
  repo name. The shared embedded-secret OAuth app is explicitly **not** the fallback. Under
  the fallback the OAuth module survives only if the repo-link `PUT` still works with a user
  token; if not, the link is a printed step on the install page's "select repositories"
  screen. The state machine's step order is unchanged either way.
- The fine-grained PAT path stays a documented escape hatch only. No pass builds it out
  until a real failure mode demands it.

### The permission consequence, accepted (amended: one org-only widening)

For the admin's user token to create a repo, the App's manifest must carry
**Administration:write**, and the App keeps it for life on its installed repos: GitHub
exposes no API to shrink an App's permissions, so removal would be a manual UI step the tool
will not demand. Accepted because the increase is marginal — a leaked PEM already holds
contents:write, which can wreck the content history; Administration adds repo settings and
deletion, and GitHub soft-deletes repos with a 90-day restore window — and because it buys
deleting the entire standing-infrastructure surface.

The fold adds two conditions. **The consent prompt itself states the cost plainly** — that
the App can also delete the repository, and that GitHub does not allow an App's permissions
to be reduced later — not only the README (the admin decides at the prompt, not in a file
they will never open). And **the organization branch's manifest additionally requests
organization Members: read** (the org-existence and membership checks, and any owner-naming
in the parked copy, are impossible without it; the personal branch requests no organization
permission at all). The "exactly as narrow as the manifest specifies" line stays true; the
manifest just specifies per branch.

## The chapter's flow (amended ordering)

1. **Consent gate.** After T1's local value moment, the tool offers the GitHub chapter,
   states exactly what will be created (an App the admin owns, a private repository, **two**
   browser trips), and names the Administration cost per the paragraph above. Declining is a
   normal, printed outcome, not an error. For the org branch, the org login is validated
   with an **unauthenticated `GET /orgs/{org}`** immediately after it is typed, re-prompting
   on 404 with copy pointing at the login in the org's URL (a wrong org must fail at the
   prompt, not as a 404 browser page ten minutes later).
2. **Manifest flow** (browser trip 1). Permissions pre-specified: contents write,
   administration write, plus Members read on the org branch; `request_oauth_on_install:
   true`; portless loopback callback; loopback `redirect_url` for the manifest code. The App
   name defaults to a site-derived slug; the wait's printed copy explains that a
   "name already taken" page on GitHub's side means re-running with `--app-name` (the tool
   cannot see that page, so this is printed guidance, not a detected error). Exchange within
   the one-hour window; credentials land in the 0600 state store.
3. **Install and authorize** (browser trip 2). The tool opens the install URL. Before
   opening, it polls once — a resume must re-detect an already-completed install rather
   than bounce the admin back to GitHub. The redirect delivers the OAuth code and
   `installation_id` together; the code becomes a user token, held in memory only, never
   persisted. The organization "Install and request" owner-approval state parks as a
   first-class resumable state: the message names the org and the App, says GitHub has
   already notified the owners, and gives the re-run; re-running re-detects rather than
   waits.
4. **Repo create, link, push.** `POST /user/repos` (or the org endpoint) with
   `auto_init: true`; `PUT` the repo into the installation and verify coverage; then blobs →
   tree → commit-with-parent → `PATCH refs/heads/main`. No git binary is a prerequisite
   anywhere in the journey. The user token is discarded after the push.
5. **Hand-over.** An honest stub: repo live, App installed, deploy arrives with the next
   chapter. The tool is unpublished until release one, so the stub needs no flag-gating and
   T3 replaces it before any admin sees it.

## What T2 ships beyond the flow

- **The resume frame.** Re-running the tool detects parked state and re-enters at the right
  step. Amended by the fold, resume is a first-class UX, not a code path: detection runs
  **before** any prompt (a resuming admin is never re-asked the site's name), the printed
  line names the site and the step, an explicit `--org`, `--repo-name`, or `--app-name` on
  a resume **overrides** the saved answer (a wrong saved org must not be a permanent
  dead-end), and a `--start-over` flag retires the saved record (renaming it aside, never
  deleting) so a stuck state always has a printed way out. The resume table's rows: the
  manifest exchange window (one hour), the OAuth authorization code (minutes), org approval
  pending (external, re-detected), created resource ids (permanent), a partial push
  (re-runnable; re-push detects the tool's own commit at the ref rather than pushing
  blind).
- **State-store semantics that cannot orphan an App.** The chapter's state writer
  creates-or-updates (a missing record is recreated from what the run knows, never thrown
  on), and merges the `github` section deeply (a shallow merge would destroy the
  unrecoverable PEM at the second hop). T1's deliberate warn-don't-abort on a failed state
  save survives for the local scaffold, but the chapter checks the store is writable
  **before** creating any remote resource: a tool that cannot save progress must fail before
  the App exists, not after.
- **The check-then-copy fix comes due.** T1 filed the empty-directory guard's non-atomicity
  "for when the tool grows a resume path"; T2 is that pass. The claim is an exclusive-create
  sentinel inside the target; the early read-only guard learns to name a sentinel-only
  directory as an interrupted or concurrent run, with its own recovery line.
- **The dev-script shim** (T1 friction-log item, fork locked this sitting). The template
  carries a ~10-line `scripts/dev.mjs` that sets `CAIRN_DEV_BACKEND=1` and spawns `vite
  dev`, passing arguments and exit code through, with a comment saying why the variable
  exists. The printed hand-over command becomes plain `npm run dev` on every platform; T1's
  copy-locking test inverts (the flag string must appear nowhere in the hand-over). The
  fold's addition: **every baked copy surface moves together** — the site README the bake
  writes and the CI leftover assertions that currently prove `scripts/` absent are part of
  the same change, named in the plan, because T1 shipped exactly this defect three files
  wide.
- **Token opacity as code.** Installation and user tokens are never parsed, measured, or
  pattern-matched; nothing assumes a length or shape; the state store holds only what must
  persist, as opaque strings.
- **`--dry-run` reaches the chapter** (fold; the approved draft wired it off). The dry run
  prints the chapter's resource actions — the App with its permissions, the private repo,
  the install — with zero network calls, because the umbrella's hard gate is "prints every
  resource the run would create," and the App and repo are the two most consequential
  resources in the whole tool.
- **Error catalogue rows for this chapter** (amended set), each with literal message text,
  each classified wait / act / ask-someone, each ending in the one next command:
  `browser-step-abandoned` (a loopback wait timed out; parameterized by step, since the
  right recovery differs), `manifest-window-expired` (App may exist, key unrecoverable:
  regenerate or `--app-name`), `code-expired`, `repo-name-collision`, `sso-blocked`,
  `org-approval-pending`, `installation-not-covering-repo`, `push-interrupted`. A declined
  consent is a normal return, not a catalogue row; an App-name collision is printed
  guidance (the tool cannot observe GitHub's re-rendered form). Waits print a heartbeat
  line so a ten-minute browser step never looks like a hang. No run exits without printing
  a next step.

## Security rules carried and extended

The umbrella's rules hold: no secret is ever written under the project directory; the runtime
library never touches provisioning credentials. T2 adds: the user access token lives in
memory only for the minutes between authorize and push, and is never persisted; the PEM sits
in the 0600 state store until T3's Worker exists, at which point the umbrella's "moves to a
Worker secret and leaves local state" rule executes (a T3 deliverable, named here so the plan
does not reinvent it). The fold adds the gates: the store test carries a positive control
(the record must contain the PEM, so "the token string is absent" cannot pass vacuously
against an empty store), and an automated scan asserts no PEM, client secret, or token
material under the scaffold directory.

## Testing and verification

- **A local fake GitHub server** backs the node:test suite. It logs every request (the
  instrument the dry-run and re-push assertions need), echoes auth headers where a test must
  see them, and — fold-added fidelity, because the fake encodes our reading of GitHub and
  three readings in the approved draft were wrong — validates `redirect_uri` against the
  registered portless callback, models the empty-repository 409 until the repo is seeded,
  and refuses user-token resource calls when the App has no installation. Every catalogue
  row is **triggered** against it, not read; the spike corrects the fake wherever real
  GitHub disagrees (duplicate-ref status included), and the live e2e is the final check on
  the reading.
- **Two Geoff browser sittings, not one** (the approved draft claimed one; the sequencing
  makes that false): the spike early (it gates the architecture), and the live e2e late —
  one recorded end-to-end on glw907 personal plus a free scratch org, Apps and repos
  deleted in the same sitting. The "Install and request" parked state proves against the
  fake only, since triggering it needs a non-owner member account.
- **CI**: the fake-server suite joins the package suite in `test.yml`. The scaffolded-site
  workflow gains a falsifiable admin probe: start the scaffolded site's own `npm run dev`
  and require HTTP 200 from `/admin` (the dev-gate's redirect makes a broken shim a 303,
  a dead server a 000, so the probe cannot pass vacuously).

## Out of scope, named

Worker-secret PEM migration, `wrangler.jsonc` emission, deploy, the bootstrap session, the
localhost console polish, and the agent-brief skill (all T3). The PAT path build-out (escape
hatch only, above). The `SiteConfig` doc-comment and index-signature finding stays in the
friction log: dropping an index signature is a public-surface change with extender
implications, not a T2 rider. All docs-track work is Pass D.

## Acceptance criteria

A cold run on a clean machine with a fresh GitHub account reaches, at the chapter's end, a
pushed content repo covered by an installed App the admin owns, in **two browser trips**,
with no git binary, no shared OAuth client, and no secret under the project directory. The
"no hand-typed identifier" line is honest about its two bends and says so in the docs: the
org branch types the org's login (validated at the prompt), and the spike-contingent
fallback types one repo name. The scaffolded site's `npm run dev` reaches the local admin
bare, on every platform, with no printed flag, proven by the CI probe. `--dry-run` prints
the App, the repo, and the install with zero network effects. Every interruption point is
either idempotent or prints its named recovery; resume never re-asks an answered question,
never re-opens a browser for a completed step, and always has `--start-over` as the printed
escape; the org approval state parks and resumes; the error catalogue is triggered in
tests, not read. The check-then-copy guard is atomic. Tokens are treated as opaque
everywhere. The live e2e is recorded with evidence, and the fake-server suite plus all nine
repo gates are green, including the four CI-only ones.
