# Admin setup and the docs reset: the umbrella design

Fable sitting, 2026-08-09. Input: the pre-brainstorm brief
(`2026-08-09-docs-refactor-brief.md`) with its same-day amendment, the guide-text classification
run in this sitting, and two current-docs research sweeps (Cloudflare and GitHub, cited inline).
Status: drafted for Geoff's review after an adversarial review fold. This spec is the umbrella
for two passes; each pass gets its own plan (Pass T's at approval, Pass D's just-in-time after T
lands).

## The premise

cairn serves four audiences, and the largest is the one the docs and tooling serve worst.

- **The editor** writes on a cairn site. Served: six guides, delivered through cairn.pub `/help`
  and the admin's Get help link.
- **The admin** (Geoff, 2026-08-09) sets up and runs the default CMS. Technical but not a
  developer: comfortable following written steps, running commands, and clicking through
  dashboards; never authoring code. Geoff judges this the most significant audience, and it is
  the one cairn's product story already centres (Waymark as the finish line for many sites).
- **The extender** is Svelte-fluent and builds on the seams: adapters, custom admin screens,
  islands, a render.
- **The engine contributor** works on cairn itself. Front door `CONTRIBUTING.md`; zone
  `docs/internal/`, currently conflating ~14 live documents with ~35 dated artifacts.

The sitting's commissioned re-derivation, from the guide texts rather than filenames, splits the
28 "developer" guides: **7 admin setup** (no code authored: `set-up-the-github-app`,
`configure-auth-and-d1`, `deploy-to-cloudflare`, `enable-tidy`, `make-waymark-your-own`,
`choose-an-ai-posture`, `cloudflare-readiness`), **4 admin operations** (no code authored:
`read-cairn-logs`, `troubleshooting`, `rotate-the-github-app-key`, `upgrade-cairn`), and **17
extender** (author TypeScript or Svelte: the adapter/rendering/delivery core, the admin-extension
set, islands, authors, previews, publish hooks, migration, local design iteration). The
"operator" of the friction log's tag vocabulary is the admin on day 2, not a fifth audience.

The brief's conclusion that "the site developer has neither a structural nor a routing problem"
is dead. The admin has both, plus a tooling gap: their eleven guides are interleaved unlabeled
among seventeen extender guides, neither front door routes them anywhere, the only tutorial
requires hand-authoring five `.svelte` files, and the setup guides are written for a scaffolder
(`create-cairn-site`) that is an unchecked ROADMAP item. Geoff's ruling: build the tool and the
docs concurrently, starting from "what is the best and easiest setup method we can create,"
with the docs reset bound by nothing in the existing structure.

## Part 1: the admin journey (`create-cairn-site`)

### Standing rulings carried forward unchanged

- One tool: scaffolder and provisioner merged, a single create-a-site experience (Geoff,
  2026-08-04).
- Ships as a published `create-*` package; `npx create-cairn-site` works for someone who has
  cloned nothing.
- Prompts on first run, answers written to a reviewable config the tool re-reads; re-runs read
  state rather than re-asking. Idempotent and resumable throughout.
- The tool names what it cannot do, exactly, with links; it never papers over a manual step.
- The charter boundary: the runtime library never touches provisioning credentials. Setup
  tooling may provision; the engine may not.
- The pass opens by measuring the un-agented manual path cold and recording where it drags
  (ROADMAP requirement, never yet done). The measurement is both the tool's UX baseline and raw
  material for the admin track's fallback prose.

### The journey

Prerequisites the admin brings: a GitHub account (2FA enabled), a Cloudflare account, Node, and
either a domain or the willingness to buy one. One command from there:

1. **Pre-flight.** Node version, `gh` presence (optional fast path), GitHub 2FA status
   (mandatory-2FA enforcement can silently block app authorization on flagged accounts; the
   tool checks and says so plainly), Workers Paid (Email Sending to arbitrary recipients
   requires it).
2. **Prompts, then scaffolds.** Site name, domain, content-repo name. The tool writes a
   complete Waymark site with a real adapter, admin mount, and `wrangler.jsonc`, and commits
   it locally.
3. **GitHub, three short browser moments, zero copied identifiers.**
   - *Repo creation* needs a user credential, because a GitHub App cannot create a repo under
     a personal account at all (`POST /user/repos` accepts OAuth/PAT only). Default: OAuth
     device flow (an 8-character code typed into a browser tab); fast path: `gh` when present
     and authenticated. The credential is throwaway, discarded once the scaffold is pushed.
   - *App creation* by the manifest flow: the tool form-POSTs the manifest (permissions,
     events, webhook config all pre-specified), the admin clicks Create, and the exchange
     (`POST /app-manifests/{code}/conversions`, one-hour window) returns the app id, client
     credentials, webhook secret, and the private key PEM inline. No key download, no base64
     ceremony; the tool encodes and stores the key as a Worker secret itself.
   - *Installation* is one guided browser session at `/apps/{name}/installations/new` (no
     documented preselect parameter exists; the internal `select_target` route is explicitly
     warned against). The tool then discovers the installation id by polling
     `GET /user/installations` rather than trusting the spoofable `setup_url` redirect.
4. **Cloudflare, one consent screen.** The tool registers as a self-managed public OAuth
   client (GA to all developers 2026-06-03; Authorization Code + PKCE, loopback redirect, the
   pattern wrangler itself uses). No hand-carved API token; the `permissionGroupKeys` prefill
   URL survives only as documented fallback. Then, headlessly: D1 created and the auth schema
   applied, the R2 media bucket, Worker bindings and custom domain, observability
   (`observability.enabled`), rate limits (Rulesets API). Nothing on the provisioning list
   forces a dashboard visit.
5. **The domain.** Golden path for a new domain: purchase through the Registrar API (beta
   2026-04-15); Registrar domains sit on Cloudflare nameservers automatically, so delegation
   is zero steps. Bringing an existing domain: the tool creates the zone and prints the one
   nameserver change to make at the old registrar.
6. **Email Sending, the one true dashboard ceremony.** Onboarding the sending domain has no
   API (confirmed current). The tool deep-links the dashboard step, polls until the domain
   reports onboarded, and resumes.
7. **Deploy, seed, hand over.** The tool deploys, seeds the bootstrap owner, and prints the
   admin URL. The admin signs in by magic link and adds editors to the roster.
8. **The recommended ending: push-to-deploy.** One guided dashboard step connects Workers
   Builds to the repo (no API connects Builds to an existing Worker yet;
   `cloudflare/workers-sdk#12058`), after which every publish deploys with no local build.
   Optional; the tool's own deploy covers the admin either way.

`cairn-doctor` is the loop and the day-2 companion: "am I done" is doctor green, and every
failing check names its fix and links its doc page. Five short browser moments total, plus the
optional Builds connect; zero code, zero copied identifiers, zero config editing.

### Design notes and open items for Pass T's plan

- Verify at registration time that Cloudflare's OAuth client registration accepts loopback
  redirect URIs (the research could not confirm from docs alone).
- Smoke-test fine-grained PATs for net-new repo creation before offering them as a fallback.
- Weigh the free-tier email path (verified destination addresses need no Workers Paid) for
  roster-only sites; likely not worth the ceremony, but price it.
- The Deploy-to-Cloudflare button (auto-provisions from `wrangler` config, wires Builds, now
  prompts for secrets) is the turnkey alternative architecture. Rejected as the spine because
  it requires a public source repo, cannot carry per-site adapter code the tool writes at
  prompt time, and forfeits the one-tool CLI experience; noted here so the plan revisits it
  only if the CLI spine hits a wall.
- Installation tokens are migrating to a stateless JWT-shaped format through mid-2026; nothing
  in cairn may assume `ghs_` token length or shape.
- Where the Waymark template lives and how the tool consumes it (packed template vs generated
  from the showcase) is the plan's first structural decision.
- Whether the tool lives in this repo or its own is a plan decision; it publishes separately
  either way.

## Part 2: the docs reset

Four tracks at the top level, audience-first; the Diátaxis forms survive inside each track
where they earn their place (the crossed matrix is mostly empty, and Diátaxis's
complex-hierarchies guidance permits exactly this partition; re-verify the citation's URL
before it lands anywhere published).

```
docs/
  README.md          front door: routes four audiences by name, first screenful
  admin/             the admin's track (shipped)
  editors/           the editor's track (shipped)
  extend/            the extender's track (shipped)
  reference/         shared dictionary, one page per export (shipped, stays put)
  internal/          the contributor's zone (unshipped), live docs split from record
```

- **`admin/`**: "Create your site," the tool-led tutorial (short, zero code), replaces the
  hand-build tutorial as the front door's default path. The seven setup guides consolidate
  around the tool: the three-way Cloudflare overlap (`deploy-to-cloudflare`,
  `cloudflare-readiness`, `configure-auth-and-d1`) merges into the tool's printed checklist
  plus a doctor-organized readiness page. The four operations guides move in as day 2, with a
  short default-site upgrade page; the 1,127-line changelog ceremony belongs to `extend/`.
  `make-waymark-your-own` (CSS tokens, no code) is theirs.
- **`editors/`**: the six guides plus the editor-facing half of `authoring-syntax`, own index,
  own register line. cairn.pub `/help` reads this track's index instead of a subsection of
  another audience's.
- **`extend/`**: the seventeen extender guides, the hand-build tutorial retitled as the
  extender's deep path ("Build a site by hand"), and most of today's `explanation/`
  (architecture, security model, seams). `why-cairn` moves to the front door's orbit; it
  serves the pre-decision reader of any stripe.
- **`reference/`** stays one shared arm. It is a dictionary; splitting a dictionary by
  audience is wrong, and its 24 export pages are gate-wired. Cheapest correct move: none.
- **`internal/`** splits into the curated contributor set (~14 live documents, indexed, routed
  from `CONTRIBUTING.md`) and the record (dated artifacts join `history/`), with a filing rule
  so sediment does not reaccumulate. `build-a-theme.md` moves here as a draft: it is a TODO
  skeleton whose first command copies a `chassis-template/` that neither exists in the repo
  nor ships in `files`, and it does not ship broken.
- **Pruning** applies the sitting's redundancy harvest: the duplicated log-event tables
  (`read-cairn-logs` / `troubleshooting`), AI-posture pages, `fields.reference` snippets,
  glob-wiring snippets, and the three-way admin gating overlap each collapse to one canonical
  home with cross-links. Prune scope is the full corpus (Geoff): published pages merge or die
  where they do not earn their place.
- **Registers and tags**: `docs/internal/docs-register.md` gains a per-track register line
  (the admin track assumes a CLI-competent non-developer); the friction log's tags become the
  four audience names, `operator:` retiring into `admin:`. The register standard's stale
  "62 pages" count gets fixed in passing.

**The bill, priced:** every path-encoding gate rewires (`check:reference` CONFIG and the
signatures allowlist, `check:arm-indexes` ARMS including the tutorial-index mapping,
`check:snippets` paths, `.vale.ini` scopes, `check:docs` inbound links through `CHANGELOG.md`
and `ROADMAP.md`; derive actual inbound counts from `check:docs` before committing to a move
budget). The cairn.pub loaders (`/docs`, `/help`) repoint: a breaking change, publish-first,
with a `Consumers must:` line. Anchor-fragment stability rides the github-slugger gate.
`CLAUDE.md`, `docs-maintenance.md`, the register doc, the `cairn-pass` ritual, and the agent
memories name arm paths in prose a move must chase. All of it lands inside the churn-free
window; this is the cheapest the reset will ever be.

## Part 3: sequencing

1. **Pass T, `create-cairn-site`.** First. Opens with the un-agented manual walk, then builds
   the tool per Part 1. Plan written from this spec at approval.
2. **Pass D, the docs reset.** Second, deliberately: the admin track quotes the tool's real
   prompts and printed checklist, so it needs the tool's UX to exist. Plan written
   just-in-time after T lands.
3. **Release one cuts after Pass D** (amends the prior STATUS ordering, which had the docs
   pass ahead of release one; Geoff approved the move). It carries the held window
   (history/revert/preview, vertical-alignment, cleanup) plus the docs reset in one
   `Consumers must:` list; cairn-pub repoints its loaders on upgrade.
4. **The tool publishes after release one**, so the first public `npx create-cairn-site`
   scaffolds against the released engine. The three-site walk proceeds as queued.

## Decisions log (Geoff, this sitting)

- Four audiences; the admin is first-class and likely the largest; admins are likely not
  developers.
- Docs and tooling are designed concurrently, starting from the best-and-easiest setup method;
  this is a documentation reset, bound by nothing in the existing structure.
- Prune scope: the full corpus.
- Initiative shape 1: journey as spine; two coordinated specs, two passes, tool first.
- The GitHub App manifest flow folds into the tool's spec.
- The revised journey (research-updated), the four-track tree, and the sequencing were each
  approved in the sitting; the Registrar golden path and the Builds-connect ending ride as
  recommendations, cheap to revert in the plan.

## Acceptance criteria

**Pass T:** the un-agented baseline is recorded; a cold `npx create-cairn-site` run on a clean
account reaches a deployed site with a signed-in owner in the five browser moments Part 1
names, with every manual step printed, linked, and resumable; `cairn-doctor` green is the
finish line; re-running is idempotent at every interruption point; the runtime library still
never touches provisioning credentials.

**Pass D:** the four tracks ship with the dispositions above; every gate in the bill passes;
the front doors route four audiences by name; the pruned pages' inbound links are chased, not
broken; cairn.pub renders `/docs` and `/help` from the new tree behind one `Consumers must:`
line; the friction-log tags and register lines match the audience taxonomy; no published page
describes tooling that does not exist.
