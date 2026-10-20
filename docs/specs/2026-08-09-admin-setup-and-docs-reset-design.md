# Admin setup and the docs reset: the umbrella design

Fable sitting, 2026-08-09. Input: the pre-brainstorm brief
(`2026-08-09-docs-refactor-brief.md`) with its same-day amendment, the guide-text classification
run in this sitting, two current-docs research sweeps (Cloudflare and GitHub), and a three-agent
adversarial review (admin-UX, leverage, coherence) whose verified findings are folded in below.
Findings that amended a previously-approved section are marked. Status: revised after the fold,
awaiting Geoff's review. This spec is the umbrella for four passes; each gets its own plan.

## The premise

cairn serves four audiences, and the largest is the one the docs and tooling serve worst.

- **The editor** writes on a cairn site. Served: six guides, delivered through cairn.pub `/help`
  and the admin's Get help link.
- **The admin** (Geoff, 2026-08-09) sets up and runs the default CMS. Pinned persona band, one
  sentence: comfortable copy-pasting a command, clicking through dashboards, and following
  written steps exactly; has never configured a development environment; never authors code.
  The un-agented baseline walk (below) is run against this band, ideally by a real person who
  matches it, before the tool's UX is locked.
- **The extender** is Svelte-fluent and builds on the seams: adapters, custom admin screens,
  islands, a render.
- **The engine contributor** works on cairn itself. Front door `CONTRIBUTING.md`; zone
  `docs/internal/`, currently conflating ~14 live documents with ~35 dated artifacts.

The sitting's re-derivation from the guide texts splits the 28 "developer" guides into 7 admin
setup, 4 admin operations, and 17 extender. One honesty note the review forced: the 7/4 admin
buckets are a **post-tool** classification. Today five of the seven setup guides ask the reader
to author or edit source files (`deploy-to-cloudflare` alone walks through five); they read as
no-code only once the tool writes those files. Pass D therefore **rewrites** the setup guides to
the tool's output rather than relocating them, and the admin track ships only when the tool is
installable (sequencing, Part 3). The "operator" of the friction log's tag vocabulary is the
admin on day 2, not a fifth audience. `make-waymark-your-own` moves to the extender (it edits
source and rebuilds); the admin's branding need is met by the tool's brand prompts, with an
admin Brand screen filed as a ROADMAP candidate, not this initiative's scope.

The brief's conclusion that "the site developer has neither a structural nor a routing problem"
is dead. The admin has both, plus the tooling gap. Geoff's ruling: build the tool and the docs
concurrently, starting from "what is the best and easiest setup method we can create," bound by
nothing in the existing structure.

## Part 1: the admin journey

### Standing rulings carried forward

- One tool: scaffolder and provisioner merged (Geoff, 2026-08-04); ships as a published
  `create-*` package.
- Prompts on first run, answers written to a reviewable config; re-runs read state.
- **Dry-run before it acts** (ROADMAP hard requirement, restored after the fold dropped it):
  a mode that prints every resource the run would create, with no side effects, is a gate.
- The tool names what it cannot do, exactly, with links; it never papers over a manual step.
- The charter boundary: the runtime library never touches provisioning credentials.
- The template emitter **already exists** (`scripts/build/emit-template.mjs`, Reversal 2: the
  showcase is the single source; `.cairn-template.json`; the `scaffold.yml` CI gate). The tool
  consumes the emitter's manifest and transform; the plan's first decision is packaging it into
  a `create-*` bin, not where the template lives.
- Site identity is ~10 substituted scalars plus an owned starter adapter (scaffolder design
  2026-06-24, Reversal 3); there is no per-site code generation at prompt time.
- The scaffolder ships an agent brief (Geoff, 2026-08-01, restored after the fold dropped it);
  see "the assistant path" below.
- The pass opens with the un-agented manual walk, cold, recorded (never yet done), run before
  the tool's UX is locked rather than as a pass-open formality.

### Two doors, one house

- **The CLI door**: `npx create-cairn-site`, the spine, specified below. For the admin with a
  machine that can run Node, and for every extender.
- **The browser door**: a public **`cairn-waymark-template`** repo carrying a
  Deploy-to-Cloudflare button. The button clones the template into the admin's own GitHub
  account, auto-provisions the D1/R2 bindings from `wrangler.jsonc`, prompts for secrets, and
  wires Workers Builds with push-to-deploy, all without Node, git, or a terminal. The CLI then
  finishes what the button cannot (the GitHub App, the domain, email, the owner), running
  against the existing repo, or the admin follows the printed checklist. The same template repo
  satisfies C3's `--template` contract (`npm create cloudflare -- --template
  glw907/cairn-waymark-template`) for the extender, and is shaped from the start for a later
  `cloudflare/templates` gallery submission (metadata, preview images, Playwright e2e).

The two doors are not rival spines: the template repo is one artifact serving three entry
points, and the docs present the button as the zero-prerequisite start with the CLI as the
complete experience.

### The journey, re-cut in two chapters (amends the approved single-sequence journey)

The adversarial UX review's strongest finding: the approved journey put a working site behind
the flow's two slowest, least controllable steps (email onboarding, DNS), and its only door
into the finished product was a magic-link email whose delivery failure is silent by design.
The re-cut puts a live, signed-in site first and moves money, domain, and email into an
optional second chapter. This also restores the ROADMAP's zero-credential quickstart ruling
(P7: "nothing lowers adoption friction more").

**Chapter 1: live and signed in, no money, no domain, no email.**

1. **Pre-flight, credential-free half.** Node version, network and loopback reachability,
   proxy env vars, platform quirks (PowerShell execution policy on Windows). Checks that
   need an authenticated account (GitHub 2FA/org policy, Workers plan) run immediately after
   their respective consents instead, failing fast with the right remedy. git is **not** a
   prerequisite: the tool performs the initial commit and push through the GitHub API, so no
   git binary and no `user.email` identity exist as failure modes.
2. **Prompts.** Personal or organization account (this branches the whole GitHub chapter);
   site name, tagline, brand color (written into `site.config.yaml` and the token block, so
   the first render is already theirs, not a Waymark demo); content-repo name. Answers land
   in the tool's state store, never in the scaffold.
3. **The local value moment.** Scaffold, `npm run dev`, and the admin is looking at their own
   styled site and a working `/admin` through the dev backend, zero accounts, inside the
   first minutes.
4. **GitHub.** Browser web-flow OAuth on the tool's loopback server (no hand-typed device
   code; the loopback server already exists for the manifest flow). Repo created and the
   scaffold pushed via API; the user credential is discarded. App creation by the manifest
   flow (permissions pre-specified, the PEM returned inline, encoded and stored as a Worker
   secret by the tool; one-hour exchange window). Installation is one guided browser session;
   the tool discovers the installation id by polling. The organization branch detects the
   "Install and request" owner-approval state, names who to ask and for what, and parks as a
   first-class resumable state.
5. **Deploy to the free hostname.** The tool emits a complete `wrangler.jsonc` and shells out
   to `wrangler deploy`, riding wrangler's own login and its automatic resource provisioning
   (id-less D1/R2 bindings are created on deploy and written back; custom domain, observability,
   and the Workers `RateLimit` binding are declarative config — the spec's earlier "Rulesets
   API" claim was wrong). Ordering constraint the plan inherits: deploy first (creates the D1,
   writes the id), then `d1 migrations apply`; fallback `wrangler d1 list`.
6. **Signed in.** The tool seeds the owner row and mints one short-TTL bootstrap session
   directly in D1 (setup tooling legitimately holds D1 access; this is never a runtime
   feature), then opens `https://<name>.<subdomain>.workers.dev/admin` with that session
   valid. **First sign-in does not depend on email.** Email delivery demotes to a doctor
   check plus a test-send from inside the admin, where its failure is visible.

Chapter 1's finish line: the admin is inside their own admin, on a free hostname, having spent
no money and configured no DNS.

**Chapter 2: your domain, your email, your independence. Optional, resumable, closable.**

7. **The money, stated up front.** Workers Paid and a payment method on file are this
   chapter's admission price (Email Sending to arbitrary recipients requires the plan; a
   Registrar purchase charges the default payment method). Both are dashboard steps; the tool
   deep-links and says so plainly.
8. **The domain.** New domain: Registrar API purchase behind a two-step confirmation showing
   exact name and exact price, with the unsupported-TLD error (`the beta covers a curated
   subset; verify it covers what cairn admins buy — .ski and .life are exactly the shape a
   subset excludes`) as a first-class "buy it elsewhere, then come back" branch, and the WHOIS
   verification email printed as an explicit to-do with a doctor check behind it. Existing
   domain (the modal case): before creating the zone the tool queries the current authoritative
   records, shows what it found, **carries MX and existing records over**, and requires
   explicit confirmation, because a botched delegation takes the organization's email down;
   then registrar-specific nameserver instructions for the top registrars, and delegation
   re-detected on resume rather than waited on.
9. **Email Sending onboarding.** Still the one step with no API (confirmed current). Deep
   link, poll, resume; bounded by a doctor check rather than a parked terminal.
10. **Push-to-deploy, the default ending.** The Workers Builds API shipped January 2026
    (connections and triggers endpoints; the spec's `#12058`-based "no API" claim was stale).
    The tool connects the repo and trigger via API; the one manual part is the one-time
    Cloudflare GitHub App authorization consent. After this the admin's laptop is disposable.

**The interface.** The terminal bootstraps; a localhost console carries the experience. The
tool already runs a local server for the manifest and OAuth redirects, so every consent, wait
(DNS, email onboarding), error, and resume renders on a `127.0.0.1` page with visible progress,
and the terminal is reduced to "keep this window open." No credential leaves the machine; the
hosted-wizard alternative was argued and rejected (it would put a repo-write GitHub token, an
account-wide Cloudflare grant, and a fresh App private key in transit through a service, against
the spirit of the charter's credential line, and would make the install path an availability
dependency).

**Failure and state model** (replaces "idempotent throughout," which three non-resumable steps
falsified). The plan carries, as deliverables:

- A **resume table**: one row per step, naming the persisted key, its expiry (device/web-flow
  codes in minutes, the manifest exchange one hour, resource ids permanent, email onboarding
  an external state machine), the detection of partial state, and the exact re-entry.
- A **state store outside the scaffold** (`~/.config/cairn/sites/<id>.json`, mode 0600), with
  a hard rule that no secret is ever written under the project directory (the manifest
  response arrives one `git add -A` from a published private key otherwise); the PEM moves to
  a Worker secret and leaves local state as soon as the Worker exists.
- A **non-resumable checkpoint list** with printed recovery per checkpoint: the manifest
  exchange (App exists, key unrecoverable: regenerate, or re-run with `--app-name`; App names
  are globally unique), the Registrar purchase (irreversible, real money), email onboarding
  (rejection parks the run).
- An **error catalogue**: literal message text per failure (consent denied, code expired,
  polling backoff, name collision, org approval pending, plan absent, card declined, WHOIS
  unverified, onboarding stalled), each classified wait / act / ask-someone, each ending in
  the one next command. No run ever terminates without printing a next step. The catalogue is
  tested by triggering each failure, not by reading it.

**The assistant path.** The agent is the repair-and-day-2 surface, not the setup spine
(determinism: the admin track quotes stable transcripts, CI regression-tests them, and doctor
green stays the finish line). The tool ships a second packaged skill derived from the doctor's
condition-to-remediation table (`skills/` already ships in `files`; `cairn-doctor --fix`
already installs skills), and the docs name "connect the Cloudflare and GitHub connectors,
point your assistant at the installed skill" as the secondary path for the manual steps. A
cairn MCP server is explicitly out of scope; the seam is machine-readable doctor output. IaC
frameworks (Alchemy, SST, Terraform, Pulumi) are rejected for this persona — an admin who
never authors code must not own a state file — recorded here so no plan relitigates; the
extender track gets one line pointing IaC users at the doctor's resource list.

### Open items and spikes for the tool passes

- Residual API surface after the wrangler reframe: zone creation, Registrar, email-onboarding
  polling, Builds connect. Spike whether wrangler's OAuth session covers them; else the
  narrow self-managed OAuth client (loopback support and public-app domain verification both
  unconfirmed) or the token-prefill fallback, which costs one copied identifier and says so.
- The GitHub OAuth client is **standing infrastructure, not a task detail**: owner, published
  client id, web-flow redirect registration, publisher verification (an unverified publisher
  on the consent screen costs trust), rate-limit behavior, revocation story.
- Fine-grained PAT as a repo-creation fallback: smoke-test net-new repo creation.
- Installation tokens migrate to a JWT-shaped format through mid-2026; nothing may assume
  `ghs_` length or shape.
- Every platform claim above carries a date and rots; each plan re-verifies its own at
  implementation time.

## Part 2: the docs reset

Four tracks at the top level, audience-first; the Diátaxis forms survive inside each track
where they earn their place (Diátaxis's complex-hierarchies guidance permits the partition;
re-verify the citation's URL before it lands anywhere published).

```
docs/
  README.md          front door: routes four audiences by name, first screenful
  admin/             the admin's track (shipped)
  editors/           the editor's track (shipped)
  extend/            the extender's track (shipped)
  reference/         shared dictionary (shipped, stays put, one deliberate exception below)
  internal/          the contributor's zone (unshipped), live docs split from record
```

- **`admin/`**: "Create your site" (tool-led, both doors, zero code), the setup guides
  **rewritten to the tool's output** (not moved; five of seven currently teach hand-authoring),
  consolidated around the tool's printed checklist plus a doctor-organized readiness page; the
  four operations guides as day 2, with a short default-site upgrade page.
- **`editors/`**: the six guides plus the editor-facing half of `authoring-syntax` — the one
  deliberate exception to `reference/` staying put, named as such.
- **`extend/`**: the seventeen extender guides plus `make-waymark-your-own`, the hand-build
  tutorial retitled as the extender's deep path, the changelog-ceremony upgrade material, and
  most of today's `explanation/`. `why-cairn` moves to the front door's orbit. `build-a-theme`
  moves to `internal/` as a draft (TODO skeleton; its `chassis-template/` does not exist).
- **`reference/`**: 23 content pages, 15 of them export pages wired by `check:reference` (the
  earlier "24 export pages" claim was wrong); stays one shared arm.
- **`internal/`**: curated contributor set (~14 live documents, indexed, routed from
  `CONTRIBUTING.md`) split from the record (dated artifacts join `history/`), with a filing
  rule so sediment does not reaccumulate.
- **Pruning**: the redundancy harvest (duplicated log tables, AI-posture pages,
  `fields.reference` and glob-wiring snippets, three-way gating overlap) collapses to canonical
  homes. Full-corpus scope (Geoff): pages merge or die where they do not earn their place.

**The bill** (verified against the repo by the coherence review; the plan derives exact counts
before committing to a move budget):

- Gates: `check:reference` CONFIG + signatures allowlist; `check:arm-indexes` ARMS;
  `check:snippets` DOC_DIRS; `check:docs` inbound links (~143 gate-checked edits, 43 inside
  `CHANGELOG.md`).
- **`check:readiness` is a shipped three-way contract, not a docs gate**: `DOC` hardcodes
  `docs/guides/cloudflare-readiness.md`, and `src/lib/diagnostics/conditions.ts` bakes 20
  `docsAnchor` heading slugs relative to `docs/guides/` into library source. Reorganizing the
  readiness page is its own Pass D task with the anchors enumerated and the `docsAnchor`
  semantics made track-aware.
- **Packaging is the delivery mechanism**: `package.json` `files`, and
  `check-package-files.mjs`'s fail-closed `DOCS_ALLOWED_ARM_PREFIXES` + `DOCS_INDEX_PATHS`
  (written to reject "a future tree nobody has named yet" — exactly this reset) + the unit
  test's fixtures. The `files` change sequences **before** the cairn-pub loader change.
- **cairn-pub is pass-sized work, not a "repoint"**: the typed `ARMS` union, the `/help`
  route derived by parsing the guides README's "For editors" heading (the mechanism, not just
  the path, dissolves), `TUTORIAL_STEMS` (moving `build-a-theme` is a hard build failure),
  `link-policy.ts`'s arm pattern (an unknown `docs/*` prefix silently rewrites to a GitHub
  blob URL — make it fail loud), the loader tests' ~20 route strings, the hardcoded tutorial
  URL in `GettingStartedPanel.svelte`, and a **redirect map** for the old `/docs/<arm>/<stem>`
  URLs, currently budgeted nowhere.
- **`CHANGELOG.md` is an immutable record**: historical entries are not rewritten. Ruling:
  `docs-links.mjs` learns a legacy-path map (old arm path → new track path) applied to
  `CHANGELOG.md` only, preserving both the record and the gate. Its hardcoded
  `upgrade-cairn.md` `## Unreleased` pairing moves to whichever split half carries the window
  (the extend-track ceremony page).
- The github-slugger anchor gate's fixture corpus is scoped to `docs/reference/` and
  `docs/tutorial/`; re-scope it to the new track set or the "anchors ride the gate" claim is
  false exactly where the moved pages live.
- **The monthly drift routine is outside the repo**: routine `trig_015UPQostYVisXuExTHTH2vu`
  samples published pages by path and fails silently (a clean "no drift" report) after a move.
  Updating its sampling scope is an explicit Pass D deliverable, with `docs-maintenance.md`'s
  machine-layer table in the same task.
- **`docs-register.md`'s arm-register section is rewritten as track registers** (three of four
  registers lose their path; "gains a line" understated it), with an explicit ruling on
  whether `editors/` moves to Vale's Microsoft package (the workstation standard routes editor
  copy to Microsoft; `.vale.ini` currently applies Google to all of `docs/**`, which the new
  tracks inherit automatically). Friction-log tags become the four audience names; `operator:`
  retires into `admin:`; the stale "62 pages" count is fixed.
- Prose path chasing: `CLAUDE.md`, `docs-maintenance.md`, the `cairn-pass` ritual, agent
  memories.

## Part 3: sequencing

The tool is three passes, split at the credential boundaries (the 20-deliverable single pass
was the accretion shape the workstation doctrine names):

1. **Pass T1, local.** The un-agented baseline walk (before UX lock, ideally by a real
   persona-band human); pre-flight; prompts and the state store; scaffold via the existing
   emitter; the local value moment; doctor integration; the dry-run frame.
2. **Pass T2, GitHub.** Web-flow OAuth; API-driven repo create and push; manifest flow;
   installation discovery; the organization branch; the OAuth-client standing infrastructure.
3. **Pass T3, Cloudflare and the doors.** wrangler-driven deploy and provisioning; chapter 2
   (money, domain, email); Builds connect; the localhost console polish; the public
   `cairn-waymark-template` repo with button and C3 compatibility; the error catalogue
   completed across passes.
4. **Pass D, the docs reset.** After T3: the admin track quotes the tool's real UX.
5. **Release one cuts after Pass D** and **`create-cairn-site` and the template repo publish
   with it, same cut** (amends the earlier tool-after-release ordering, which would have had
   the front door documenting a command that resolves to nothing; the tool's dependency range,
   not publish order, keeps it scaffolding against the released engine). cairn-pub repoints
   its loaders behind the same `Consumers must:` line; the three-site walk proceeds as queued.

Gallery submission (`cloudflare/templates`) rides after T3 as its own small item.

## Decisions log

Geoff, this sitting: four audiences, admin first-class and likely largest; admins are likely
not developers; docs and tooling designed concurrently from the best-and-easiest setup method;
full-corpus prune; shape 1 (journey as spine, coordinated specs, tool first); manifest flow
folded in; sequencing approved (amended by the fold: tool publishes with release one; Pass T
split into T1–T3). Adopted from the adversarial fold, flagged for Geoff's review since they
amend approved sections: the two-chapter journey re-cut (workers.dev first, email off the
critical path, bootstrap session instead of first-magic-link), the two-doors ruling (public
template + Deploy button beside the CLI), the localhost-console interface, wrangler-as-
provisioner (deleting most of the custom OAuth surface), and the assistant path as doctor
remediation with MCP out of scope.

## Acceptance criteria

**T1–T3:** the baseline walk is recorded before UX lock. A cold run on a clean machine and
fresh accounts reaches, at chapter 1's end, the admin signed into their own admin on
`workers.dev` — no payment, no domain, no email, no git binary, no hand-typed identifier —
with the site already carrying their name and brand color. Chapter 2 is optional, resumable,
and closable at every step; the domain path never cuts over without showing and carrying the
existing records; the Registrar purchase is never a silent side effect. `--dry-run` prints
every resource with no side effects. Every interruption point is either idempotent or prints
its named recovery; no run exits without a next command; the error catalogue is triggered,
not read. No secret is ever written under the project directory. The runtime library never
touches provisioning credentials. Browser-moment counts are stated per door and per chapter
in the docs, derived from the real flow, not promised in advance.

**Pass D:** the four tracks ship with the dispositions above; every gate in the bill passes,
including the readiness contract, the packaging allowlist, and the re-scoped anchor corpus;
the cairn-pub work lands with its redirect map and a fail-loud link policy; the CHANGELOG
keeps its history via the legacy-path map; the drift routine's sampling scope is updated; the
front doors route four audiences by name; no published page describes tooling that is not
installable in the same cut.
