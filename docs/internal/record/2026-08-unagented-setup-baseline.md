# The un-agented setup baseline (recorded 2026-08-09)

Walker: **a fan-out of five persona agents**, each run fresh and blind to the others. Geoff first
ruled (2026-08-09, at Pass T1 start) that he would walk it himself. He revised that ruling the same
day, before any walk ran: "a well-tuned persona agent run several times fresh from several vantage
points is probably more effective than I'll be." The plan's Task 1 allows exactly this, on the
condition it is labeled as agent-performed, which this document does.

The revision is worth stating plainly, because it changes what this record is. A single human walk
produces one path through the docs and one person's tolerance for friction. Five independent walks
produce something a single walk cannot: **agreement**. When five readers who were told to care about
different things all stop at the same line, that line is not a matter of taste.

Why it exists: the ROADMAP's standing requirement, and the umbrella spec's before-UX-lock condition
([`2026-08-09-admin-setup-and-docs-reset-design.md`](../../superpowers/specs/2026-08-09-admin-setup-and-docs-reset-design.md)).
Pass T1 Task 8 (the `create-cairn-site` UX wiring) was blocked on this record and is unblocked by it.

## Protocol

Environment: no prior cairn checkout, no wrangler login, no gh login. Each walker started from the
root README as a stranger would and followed
[`docs/tutorial/build-your-first-cairn-site.md`](../../extend/build-a-site-by-hand.md) and the
setup guides it links, toward a deployed site with a signed-in owner. Every finding required a
`file:line` quote; a finding that could not be evidenced was not a finding. Walkers were barred from
reading `docs/superpowers/`, since the specs and plans would have told them the answers. Each drag
point was classified:

- **wait**: blocked on an external system (DNS, a verification email, a deploy, a plan upgrade)
- **act**: must do something outside the docs (make an account, paste a key, hand-edit a file)
- **ask**: would have to ask a developer, because the doc assumes knowledge they lack

The five vantages:

| Vantage | Persona |
| --- | --- |
| owner-nondev | A technically comfortable non-developer site owner. Follows exact terminal instructions, no npm/SvelteKit/Cloudflare/GitHub fluency. |
| dev-new-to-stack | A working JS/TS developer, fluent with npm and git, no SvelteKit and no Cloudflare. Evaluating cairn for a client and willing to bail. |
| going-live | The second half only: from a working local site to a real deployed site on their own domain, with the owner signed in. |
| recovery | Not "can they follow the happy path" but "when a step fails, can they get unstuck alone?" |
| wayfinding | Can a stranger find the path at all, before any question of following it? |

Two walkers went beyond reading and reproduced steps live, running `npx sv create` and `npm install`
against the real registry and the real current toolchain. Findings 1 and 11 below come from that,
and neither is visible to a reader who only reads.

## Where it dragged (ranked)

Ranked by walker agreement first, then by cost to the reader. "Agreement" counts how many of the five
independent walks raised it; a sixth, earlier single-vantage walk ran before this fan-out and is
counted separately where it agrees.

1. **`@glw907/cairn-cms-dev` is not on npm, and the tutorial's payoff depends on it.** (5/5 walks,
   plus the earlier walk: unanimous.) Milestone 8 instructs `npm install -D @glw907/cairn-cms-dev`,
   and that package 404s today. This is the milestone that delivers the entire promised experience,
   a working local `/admin` with sign-in, save, and publish, with no GitHub App, no database, and no
   email. The failure text ("could not be found or you do not have permission to access it") reads
   like a permissions problem rather than "not released yet," and no troubleshooting entry covers it.
   *Evidence:* `docs/tutorial/build-your-first-cairn-site.md:566-570`; `npm view
   @glw907/cairn-cms-dev version` returns E404; `packages/cairn-cms-dev/package.json` is at `0.0.0`.
2. **Arbitrary-recipient email needs the Workers Paid plan, and the reader learns it last.** (4/5.)
   The tutorial promises "a free Cloudflare account." The paid-plan requirement appears once, in a
   subordinate clause, two guides deep, at exactly the step where inviting a second editor becomes
   possible. A reader who took "free" literally meets an unbudgeted decision at the worst moment.
   *Evidence:* `docs/tutorial/build-your-first-cairn-site.md:7` against
   `docs/guides/configure-auth-and-d1.md:173-174`.
3. **No document ever says `wrangler login`, or warns that the first wrangler command opens a
   browser.** (3/6.) A `grep` for `wrangler login` and `wrangler whoami` across the tutorial, the
   guides, and the reference returns nothing. The persona meets an interactive OAuth flow cold.
4. **Nothing tells the reader they need to own a domain and add it to Cloudflare as a zone.** (2/5,
   ranked first by the vantage positioned to see it.) The guides say "go to your zone's SSL/TLS >
   Edge Certificates" and "onboard your sending domain" as though a zone already exists. A reader
   following the docs cold arrives holding a `*.workers.dev` URL and no domain, and no page tells
   them what to go acquire, or that nameservers and propagation are involved.
   *Evidence:* `docs/guides/deploy-to-cloudflare.md:136`; no hit anywhere for "add a domain to
   Cloudflare".
5. **`base64 -w0 your-key.pem` fails on macOS.** (3/6.) `-w` is GNU coreutils. BSD `base64`, which is
   what a Mac ships, errors immediately. The guide offers no branch, and a laptop-owning
   non-developer is more likely than not to be on a Mac. *Evidence:*
   `docs/guides/set-up-the-github-app.md:83`.
6. **The tutorial is hand-authoring, not instruction-following.** (owner-nondev's first finding, and
   the earlier walk's second, third, and fourth.) Every milestone after project creation asks for
   real TypeScript, YAML frontmatter, Svelte components, a Vite `define` block, an ambient global
   declaration, and folders whose names are literal framework syntax (`(site)`, `[...path]`) where a
   typo fails silently. The tutorial's own first line concedes the point: "A `create-cairn-site`
   scaffolder that produces the same result in one command is planned; today, this page is the path."
7. **No `CLOUDFLARE_API_TOKEN` guidance anywhere, and the doctor checks that need it skip silently.**
   (2/5.) The token is env-only and never derived, but no guide walks creating one or names the
   scopes. At true zero-config the majority of doctor's Cloudflare and GitHub checks report SKIP
   rather than FAIL, so a reader with nothing set up sees a mostly-quiet report.
   *Evidence:* `docs/reference/doctor.md:43`, `:75-97`; `src/lib/doctor/cloudflare-api.ts:10`.
8. **No step installs Node or checks `node --version`.** (2/6.) The prerequisite line links a version
   matrix, never an install path. *Evidence:* `docs/tutorial/build-your-first-cairn-site.md:7`.
9. **The placeholder `database_id` is never marked as a placeholder**, and a second full
   `wrangler.jsonc` example arrives nine milestones later to be reconciled by hand against the one
   the reader has already customized. *Evidence:* `docs/tutorial/build-your-first-cairn-site.md:58`;
   `docs/guides/deploy-to-cloudflare.md:171-193`.
10. **`troubleshooting.md` is scoped to live sites, so the setup phase has no recovery surface at
    all.** The guides index says so outright ("for the day a site is already live"), and every entry
    in the symptom table keys on a runtime log event. Nothing covers a failed install, a failed
    build, or a dev server that starts but has no admin. *Evidence:* `docs/guides/README.md:72`.
11. **The tutorial's `svelte.config.js` adapter edit is stale, and `adapter-auto` silently wins.**
    (2/5, both reproduced live.) Current `sv create` configures the adapter inside `vite.config.ts`'s
    `sveltekit()` call, so the file the tutorial says to edit either does not exist or is a no-op
    until Milestone 8 replaces the Vite config. `wrangler deploy` then fails with "entry-point file
    was not found," several milestones removed from the cause. The same drift breaks doctor's
    `config.csrf-disable` check, a text heuristic over a file that may not be there.
12. **Front-door wayfinding.** The first copyable command sits at line 38 of a 49-line README, behind
    five sections of positioning. `docs/README.md` tells the reader to keep `examples/showcase` open
    beside the tutorial, which a reader who arrived through the README's own quickstart does not
    have. The guides index promises "the first eight guides build a site in roughly the order the
    tutorial follows," then includes an optional second-audience feature and omits two milestones.
    And because the tutorial calls the scaffolder "planned," a reader who knows the `create-*`
    convention will try `npx create-cairn-site`, which 404s.
13. **Two unexplained localhost origins.** `PUBLIC_ORIGIN` is `http://localhost:4173` (preview's
    port); `ORIGIN` in `content.ts` is `http://localhost:5173` (dev's port). Nothing ties them
    together, so a careful reader cannot tell which is a typo. The same ambiguity returns at the real
    deploy, where every example hardcodes a custom domain as `PUBLIC_ORIGIN` while the first deploy
    produces a `workers.dev` URL, and a wrong `PUBLIC_ORIGIN` is documented to misdirect email.
14. **Smaller, single-walker, still real.** `.dev.vars` is not in the scaffold's `.gitignore`, so a
    reader who follows the tidy guide can commit an API key. Creating the GitHub App needs owner
    access on the target repo, stated only at the end of the chain, and the guide's three visual aids
    are unfilled `<!-- SCREENSHOT: -->` comments. `wrangler secret put ANTHROPIC_API_KEY # only if
    tidy.enabled` asks the reader to remember a setting from milestones earlier. One walker hit a
    non-deterministic `spellchecker-wasm` postinstall crash on a first install and could not
    reproduce it; recorded here as a known possibility, not a finding.

## Hard walls hit

1. **Milestone 8.** `@glw907/cairn-cms-dev` cannot be installed, so no walker reached a working local
   `/admin`. Every walk stopped here or routed around it.
2. **Bare `npm run dev` does not reach the admin, even once that package publishes.** The dev backend
   activates only behind the build-time `__CAIRN_DEV_BUILD__` define *and* `CAIRN_DEV_BACKEND=1` at
   runtime. The scaffolded `dev` script is bare `vite dev`. Verified directly against
   `examples/showcase/src/chassis/dev-gate.ts:26` and `examples/showcase/src/hooks.server.ts:18`,
   not only from the docs. Without the variable the guard falls through to the production branch,
   which needs bindings a fresh local project does not have.
3. **The adapter override.** Once hit, `wrangler deploy`'s error names an entry-point file and gives
   no path back to the real cause, a Vite config option set several milestones earlier.

## What the tool must therefore absorb (walkers' own words, consolidated)

- **Never print a command that does not work.** The value moment must carry whatever actually starts
  a working admin, or the scaffold must make the bare command true.
- **Never name an internal flag to a reader who may not be a developer.** If `CAIRN_DEV_BACKEND=1` is
  what makes the admin run, the scaffolded `dev` script should carry it, cross-platform, so the
  printed command stays `npm run dev`.
- **Say what the local admin is.** It runs against a stand-in: nothing there touches a GitHub repo or
  sends real email. A reader who does not know that is confused later when the real App shows no
  matching commits.
- **Never reference anything that only exists inside this monorepo.** A scaffolded user has no
  `examples/showcase` and no guides directory.
- **Surface the money and the domain early**, as facts rather than as a deferred "arrives later."
  Real editor sign-in needs a domain, a Cloudflare zone, and, for arbitrary recipients, the Workers
  Paid plan.
- **Own the pre-deploy failure surface**, because the published troubleshooting guide is scoped to
  live sites and structurally cannot cover setup.
- **Branch on the platform before printing any shell command** the docs also hand-author, `base64`
  being the live example.
- **Prefer provisioning over placeholders**, or mark a placeholder as one that will break a real
  deploy.
- **Check that a dependency actually resolves before depending on it**, and fail with a cairn-specific
  message rather than letting a bare npm E404 reach the reader.

## What this changed in Pass T1

Task 8's printed hand-over block, which the plan had specified as `cd <dir> && npm install && npm run
dev` pointing at `http://localhost:5173/admin`, plus a doctor line and one line deferring "going
live." The walk changed it on three counts, all from hard wall 2 and drag points 1 and 2:

- The dev command is printed in the form that actually starts an admin, branched per platform.
- The admin line says the backend is a local stand-in, in those terms.
- The deferral splits into two facts, since a domain plus a Cloudflare zone and a paid plan for email
  is a different kind of news from "more setup exists."

`npx cairn-doctor` survived verification and stays: it is a real bin of `@glw907/cairn-cms`, so it
resolves in any scaffolded site.

Everything else above belongs to other passes. Drag points 4, 7, 9, 11, 12, 13, and 14 are
documentation defects for Pass D; 3, 5, and 8 are candidates for the tool's pre-flight and printed
remedies in T2 and T3; 1 is the release-one blocker STATUS already carries, and the bake's own
refusal to run against `^0.0.0` enforces it.
