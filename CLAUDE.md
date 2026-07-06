# cairn-cms

An embedded, **magic-link**, GitHub-committing CMS for SvelteKit/Cloudflare sites. Non-technical
authors log in by email (no GitHub account, no password), edit raw markdown in a CodeMirror 6
editor (client-only, behind the `MarkdownEditor` seam) with a live preview. Saving holds the edit
on a per-entry `cairn/<concept>/<id>` branch, and a deliberate Publish copies it to `main` via a
**GitHub App** (committer = `cairn-cms[bot]`, author = the editor), which auto-deploys. The library is design-agnostic. Each site supplies an adapter: its GitHub and email
config, the frontmatter field schema for each concept, and its own `render(md)`, the one renderer the
editor preview and every public page call. Content is a
fixed set of first-class concepts (Posts and Pages), not open-ended collections.

This is a standalone repo at `~/Projects/cairn-cms`. It publishes to public npm as
`@glw907/cairn-cms` (MIT), and consumer sites install it from the registry by version range. The
library's own development proves changes against `examples/showcase`, a self-contained SvelteKit
site that consumes the package through the relative `file:../..` path.

## What cairn is (canonical scope — read before any scope-affecting change)

cairn is a lean, opinionated markdown CMS for SvelteKit + Cloudflare: magic-link editor login,
raw-markdown editing with live preview, and GitHub-App publishing, over a fixed set of content concepts
(Posts, Pages). Its admin skeleton and getting-started scaffold are built with **DaisyUI + Tailwind**,
the idiom a developer extends the admin in, while public output stays design-agnostic (each site brings
its own `render`). cairn does its one job well and gets out of the way.

The governing boundary, which adjudicates any scope question:

**cairn owns its core job, managing markdown content and the editor/admin frame, and little else.
Everything a site needs beyond that, its own functionality, actors, auth, data, and domain logic, belongs
to the developer, and cairn serves it with a thin seam, not a built-in feature.** The seams are a narrow,
versioned, enforced contract, so a developer's work survives engine updates; breaking it is a deliberate
major-version event, not an everyday one, and the surface stays narrow precisely to keep that promise
cheap to keep. Owner/editor and magic-link are the zero-config defaults, not ceilings: a developer can
replace the auth and override the authorization through documented seams.

Leanness is the point, not an accident. "Out of scope" and "we don't accommodate that universe" are
valid, often correct, answers; add to the engine only when it demonstrably serves the core job, and
prefer the leanest seam over a general feature. Before adding an abstraction, a subsystem, an actor, or
new surface, ask whether it is cairn's job or the developer's domain, then read
`docs/internal/what-cairn-is-and-is-not.md` and the full stack list in the `cairn-scope-opinionated-stack`
memory.

## How to run this project

The work is a clean, test-first **rebuild** that began 2026-05-28. The canonical source of truth is
the functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`. It
supersedes the older plan and architecture writeups (now under `docs/internal/history/`), which
remain only as history. Read the spec at the start of a rebuild session.

The rebuild ran as a numbered plan series, 00 (foundation) through 08 (cutover), each plan
written just-in-time after the prior one landed, under `docs/superpowers/plans/`. Plans 00 through
08 have landed and merged to `main`, and the package publishes to npm under `@glw907/cairn-cms`.
Later engine work continues on feature worktrees off `main`, one worktree per pass, so `main` stays
releasable. The current published version, the unpublished window on `main`, and the next action all
live in `docs/STATUS.md`; read it for where the work is now.

Execute a plan task-by-task by dispatching each well-specified task to `cairn-implementer`
(pinned Sonnet), test-first against the suite; the main loop reviews each diff and confirms the
full gate before the next dispatch, and implements inline (or upshifts the dispatch model) only
for novel correctness-critical logic the plan does not fully specify. The **`cairn-pass`** skill
marks pass start and the pass-end ritual for this
initiative. Honor this repo's own skills and conventions while working in it. Do not human-scale
time-estimate; describe relative complexity.

The rolling status lives in `docs/STATUS.md` (read and written by `cairn-pass`, canonical on
`main`). Per-plan post-mortems live with the plans in `docs/superpowers/plans/`. This file stays
durable orientation only.

### Tooling for the rebuild

- **Implementer subagent** (user-scoped): `cairn-implementer` drives one plan task test-first and
  clears the full gate before reporting done (targeted test + `npm run check` 0/0 + `npm test` exit
  0), with the cairn conventions baked in. It is the default executor for plan tasks and is pinned
  to Sonnet for token economy; the main loop orchestrates, reviews each diff, and verifies the gate
  between dispatches. Pass `model: opus` or `model: fable` to upshift a single
  correctness-critical task.
- **Review subagents** (user-scoped, read-only): `svelte-reviewer`, `cloudflare-workers-reviewer`,
  `web-auth-security-reviewer`, `daisyui-a11y-reviewer`. Fan them out in parallel at a review gate to
  complement `/code-review`.
- **Subagent models:** the workstation `.bashrc` sets `CLAUDE_CODE_SUBAGENT_MODEL=inherit`, so each
  agent's frontmatter `model:` wins, and a per-dispatch `model` beats the frontmatter. Token
  economy governs the assignments: `cairn-implementer` pins Sonnet (upshift per dispatch only for
  novel correctness-critical logic), the four reviewer agents pin Opus deliberately (Sonnet
  implements, Opus reviews, and the model diversity is part of the gate), and the
  `code-simplifier` plugin agent pins Opus in its own frontmatter. The frontier main model keeps
  the thinking work: brainstorms, specs, plans, review triage, post-mortems, and final prose.
- **Cloudflare MCP** (account `glw907`, `120c269ad6d3dfbe6d63a0bb53758ca0`) provisions and queries D1
  for the auth store. Prefer it over the dashboard.

## Documentation is a pass dimension

Documentation is a standing dimension of every cairn-cms pass, not a separate project. A pass updates
the relevant `docs/` arm for whatever it changed, and a public-API change is not done until its
reference page matches. The `cairn-pass` pass-end ritual carries this step, and two automated gates
back it: `npm run check:reference` fails on an undocumented export, and `npm run check:package` checks
the entry points.

The public docs follow a Diátaxis structure under `docs/`: [`reference/`](docs/reference/README.md)
(one page per export subpath), [`guides/`](docs/guides/README.md) (task how-tos),
[`explanation/`](docs/explanation/README.md) (the why), and
[`tutorial/`](docs/tutorial/build-your-first-cairn-site.md) (the first-site build).
[`docs/internal/docs-friction-log.md`](docs/internal/docs-friction-log.md) collects the design
friction that writing a doc surfaces, from the developer and editor perspectives, triaged into
[`ROADMAP.md`](ROADMAP.md) and [`docs/STATUS.md`](docs/STATUS.md). This repo keeps no separate backlog
file.

[`ROADMAP.md`](ROADMAP.md) is itself a pass dimension, not a write-once file. A pass that ships a
roadmap item marks it done and removes it from the live tiers, and a pass that surfaces a new direction
files it into the right tier, the same way the pass updates its reference docs. The friction log and the
roadmap both drift heavy when work is only ever added, never pruned (the engine-hardening initiative had
to prune a stale friction log that resurfaced a killed feature), so a pass that removes or renames a
backlog item is not done until the roadmap stops listing it. Shipped history lives in `docs/STATUS.md`
and the per-plan post-mortems, not in the roadmap.

Two production sites depend on the package, so a stale doc costs real users. Treat the docs update as
part of the work, not a chore after it. See the `docs-is-a-pass-dimension` memory.

## Releases (cadence and scheme)

**A pass does not end with a version bump or a publish.** That is the default, and it is the opposite of
what the ritual used to imply. A finished pass finalizes its `CHANGELOG.md` entry under `## Unreleased`,
leaves `package.json` untouched, and stops. No `npm version`, no `gh release create`, no publish, unless a
release is independently warranted. New versions are meaningful, not a per-pass reflex; churning out a
release for every small change is exactly what to avoid.

**Publishing is a separate, deliberate act with two triggers, never a calendar or a finished pass.** Cut a
release only when (1) a consumer site needs the change now (which also resolves the publish-before-push
ordering), or (2) a coherent capability or initiative has landed and is worth making available, at its
natural boundary. Default to holding: `main` is always releasable, so completed passes accumulate
unpublished, and breaking changes batch so a site upgrades across one `Consumers must:` list, not five. The
admin re-expression sweep is the live example: it changes the admin's internal CSS and components, which a
consumer never imports, so it holds unpublished until consumer-facing work accumulates with it, and may
warrant no release of its own.

**When a release is cut, the number tracks the publish, not the passes.** One publish, one increment, sized
to what the window actually contains. Keep the work under `## Unreleased` and set the number only at the cut
(pre-numbering a held pass produces phantoms, as `0.77.0` did when it rolled into `0.78.0`). The scheme is
SemVer, not CalVer; in `0.x` a minor is a new subsystem or public surface and everything else is a patch,
and the number signals scale, not compatibility (the changelog carries compatibility via `Consumers must:`).
Published numbers are immutable and every sub-`0.68` number is taken, so verify the next number is free with
`npm view @glw907/cairn-cms versions --json` before promising it. The release body is the changelog window
since the last published tag, carrying every `Consumers must:` line, cut with `gh release create v<x.y.z>
--target main` (which fires the OIDC publish workflow).

The path to `1.0` and its readiness checklist live in [`ROADMAP.md`](ROADMAP.md) ("Toward 1.0"); the full
scheme, the 0.x-vs-1.0 reasoning, and the comparables are in the `cairn-release-process-and-versioning`
memory.

## The extending-developer lens (subordinate to the charter)

The charter is the governing lens: the premise check, "is this cairn's job, and is it the leanest form?",
runs before the correctness checks on every spec. The extending-developer persona sits under it as a
forward diagnostic for the lean extensibility redesign (the next pass), not a co-equal standing dimension
and not a license to build a platform. The persona: a developer who launches a content-managed site fast on
cairn, then builds their own functionality on top, and keeps pulling cairn updates without rework. Per the
charter, cairn serves that developer with thin seams, owner/editor identity they read through a defined
hand-off, an admin skeleton they extend in the DaisyUI + Tailwind idiom, while they bring their own auth,
data, and domain logic. The redesign answers four diagnostic questions against that boundary: can a developer
(1) extend the admin skeleton through a thin supported seam, (2) read the owner/editor identity on their own
routes without reaching into engine internals, (3) depend on a narrow enforced (not merely documented)
public boundary, and (4) upgrade across versions without hand-applied steps or silent failures? The persona,
the questions, and the redesign inputs are in
[`docs/internal/extending-developer-lens.md`](docs/internal/extending-developer-lens.md); read the charter
first. The earlier register-components scaffolding (`CairnExtension`/`AdminPanel`/`FieldTypeDef`) was removed
in the principle-adherence pass, so the redesign starts from a clean engine.

## Watch items (conditional follow-ups)

A watch item is a follow-up defined by its trigger, not its action, so manage it by what can detect that
trigger, and promote it to an automated tripwire whenever the trigger is machine-detectable. Claude cannot
self-trigger between sessions; only a gate, a hook, or a scheduled routine can, so prose in a backlog is the
weakest form and the fallback, never the default. Match the mechanism to the trigger:

- A **code condition** ("a banned API reappears", "a structure grows past a bound") becomes a gate or test
  (this repo already runs many: `check:reference`, `check:version`) or a `settings.json` hook. Converting a
  watch into a failing test is the gold standard: it cannot be forgotten.
- An **external or time trigger** (an upstream deprecation lands, a dependency majors) becomes a scheduled
  cloud agent through the `schedule` skill, which pings only when the condition trips. The standing example
  is the SvelteKit `checkOrigin` removal (kit#15992): a routine watches it rather than a ROADMAP line
  betting someone re-reads it in time.
- A **next-time-you-touch-X** note becomes a co-located `// WATCH:` comment on the code itself, so the next
  editor sees it in context; mirror it to a memory only when it must survive a file move.
- A **trend tied to a milestone** becomes a ROADMAP entry in the tier where it bites, arriving with the work
  rather than floating in "someday".

STATUS carry-forwards hold only the active initiative's watches and must churn, not accumulate (the
append-only-backlog rot this file warns about elsewhere).

## The polish and fidelity standards (family-wide, Geoff 2026-07-05)

A rebuild or port is licensed to diverge from its original, never to be less polished than
it. For typography-forward work the details ARE the design: wordmark treatments, flow
spacing, blockquote scale, inline-code weight, link and italic conventions all verify at
the detail level, not the layout level — side-by-side crops of real sections, read, before
a deploy is called done.

**The one-check rule (Geoff, 2026-07-05, after the ecxc failure): nothing deploys to
production without at least one full-page render READ by the main loop's own eyes, and a
member-facing site additionally gets Geoff's before/after approval. Mechanical gates
(crawls, gates, token greps) measure correctness, never resemblance; only a read screenshot
measures what a visitor sees. The same rule applies at plan time: no design plan is
authored from a verbal inventory alone — look at the actual site first.**

Two fidelity tiers: the SITE REBUILDS (ecxc.ski, 907.life) are quite-close-and-improved —
divergence is allowed where it improves. THEME PORTS of existing external themes are
GLANCE-INDISTINGUISHABLE: a casual viewer should not be able to tell the port from the
original at a glance; the licensed differences are behavioral (the family responsive
standard at the extremes) and structural (cairn underneath), never the visible design
language at normal viewing.

## Visual work runs the visual-fidelity method (2026-07-05)

Any rebuild, theme port, or design migration invokes the `visual-fidelity` skill at the
START (reference capture before any plan; device catalogue; build with the
screenshot-compare loop; the fresh-context verifier gate; the one-check deploy gate; the
pixel-diff CI rider). The `visual-verifier` agent is the standing fresh-context grader:
it did not build the work, receives reference and render as separate labeled images, and
verdicts per visual device. The builder's own "matches" is never accepted — Anthropic's
Fable guidance (fresh-context verifiers outperform self-critique) plus two production
misses (2026-07-05) are the why. The official frontend-design skill is for ORIGINAL
aesthetics and carries no reference comparison; never use it alone for a port.

## Waymark iterates after every use (Geoff, 2026-07-05)

Every theme or site built on the Waymark template ends with a mandatory harvest step:
the frictions, missing seams, structural-variant needs, and component gaps that build
surfaced fold back as landed improvements or pre-beta-harvest ledger entries — into the
CHASSIS above all (the canonical showcase copy is the starting chassis every next theme
receives: a seam a theme fought, a recipe it needed, a coupling its subtraction exposed,
a removal note that lied — each lands in the chassis before the pass closes), and into
the engine where the lesson runs deeper. A port or rebuild is not done until its harvest is
banked. The template improves with every consumer, and the next port starts from the
improved base; the `visual-fidelity` skill carries this as its step 7.

## The responsive standard (family-wide, Geoff 2026-07-05)

Every cairn-family artifact — the Waymark template, every theme (including ports of
external themes), the showcase, consumer-site rebuilds, cairn.pub, and Topo — meets the
five-viewport bar: 320, 390, 768, 1440, and 2560, composed at the extremes (a deliberate
posture at ultrawide, a wrapped-and-reachable masthead at 320), never merely unbroken. The
gate is the CI width matrix in the showcase's visual suite; work that changes rendering
regenerates its baselines on CI (the canonical renderer) via the e2e regen dispatch. A
ported theme's bar is beating its original at 320 and 2560. The design reasoning lives in
docs/internal/public-design-system.md.

## Admin interface design

Before any work on the `/admin` interface (the `src/lib/components/*.svelte` admin components or
`cairn-admin.css`), read and follow [`docs/internal/admin-design-system.md`](docs/internal/admin-design-system.md).
It is the agent-facing design system: the Warm Stone tokens, the Bricolage/Figtree type, the component
recipes (cards, eyebrow groups, the brand tile, the CTA, empty states, the command palette), the voice,
and the load-bearing rules that are not visible in the markup (most importantly: `data-theme` goes on a
bare wrapper, never on a styled element, and scoped overrides go in `@layer components`). Keep the doc
current when the design language changes, the same as any other doc.

## Diagnosing a running site (look to the logs first)

When troubleshooting a deployed or local cairn site's runtime behavior, read the structured logs
before reaching for `console.log` or guesswork. The engine emits a JSON record for every operationally
meaningful event through one internal chokepoint, `src/lib/log/`. Each record carries an envelope
(`level`, `event`, `timestamp`) and event-specific fields. The vocabulary covers the auth flow
(`auth.link.requested`, `auth.token.minted`, `auth.link.send_failed`, `auth.token.confirmed`,
`auth.session.created`, `auth.session.destroyed`), the commit pipeline (`commit.succeeded`,
`commit.failed`), and the admin guard's pre-resolve refusals (`guard.rejected` with a `reason` of
`csrf`, `origin`, `https`, or `bindings`). The full table, with each event's trigger and fields, is
[`docs/reference/log-events.md`](docs/reference/log-events.md).

Map the symptom to its event. An admin who cannot sign in points at `auth.link.send_failed` or a
`guard.rejected` with its `reason`. A save that does nothing points at `commit.failed`: a `reason` of
`conflict` is a stale-edit collision, and an `error` field is the GitHub failure to act on. On
Cloudflare the query surface is Workers Logs, which a site turns on with `observability.enabled = true`
in `wrangler.jsonc`; filter by `event` or by `editor`. The operator how-to is
[`docs/guides/read-cairn-logs.md`](docs/guides/read-cairn-logs.md). The records carry an editor's email
for attribution and never a token or a session id, so a log is safe to read and paste.

When a pass adds a diagnosable code path, give it an event in the vocabulary rather than a bare
`console` call, and update the reference table in the same pass. The logger is internal (exported from
no package subpath), so its API is free to grow; the event names are the public-observable contract.

## Durable gotcha (Cloudflare email)

Email *Sending* to arbitrary recipients is `env.EMAIL.send({ to, from, subject, html, text })`. The
real gate is the per-zone sending subdomain: onboard the `from` domain with `wrangler email sending
enable <domain>` (or the API, which works with an account token) and the binding reaches any
recipient. An un-onboarded sender throws `E_SENDER_NOT_VERIFIED`, the same string Routing uses for
an unverified destination, which is how the ecxc outage hid. The `cloudflare:email`
`EmailMessage`/mimetext MIME form is Email *Routing*'s forward call and reaches only **verified**
destinations; do not confuse the two. Email Sending also needs Workers Paid plus dashboard
onboarding.

## Durable gotcha (Vite 8 ships TypeScript in dist `.svelte`)

`svelte-package` ships `.svelte` with `<script lang="ts">` and the TypeScript intact. On Vite 8 /
Rolldown, the builtin `dynamic-import-vars` parses that `<script>` as JavaScript before the consumer's
Svelte plugin compiles the file, and it chokes on a TS optional parameter (`registry?: T` becomes invalid
`registry?`), failing the consumer build. The fix is a post-package step,
`scripts/transpile-dist-svelte.mjs` (wired into the `package` script), that transpiles each dist `.svelte`
`<script>` body to plain JavaScript with esbuild `verbatimModuleSyntax` (which keeps value imports used
only in the markup; the default elision breaks the component) and KEEPS the `lang="ts"` tag, because the
markup still carries TypeScript the Svelte compiler must parse (typed `{#snippet}` parameters and
`{@const x = y as T}` casts). Do not remove this step or strip `lang="ts"`. The showcase
`package-lock.json` is committed and CI uses `npm ci` so the Vite 8 toolchain is reproducible; a
gitignored lockfile once let CI float onto a build no local run could reproduce. Full post-mortem:
[`docs/internal/2026-06-21-e2e-dist-svelte-build-failure.md`](docs/internal/2026-06-21-e2e-dist-svelte-build-failure.md).

## Credentials (machine-local, intentionally not in git)

- **GITHUB_APP_ID:** `3847496`, in the encrypted registry (`~/.dotfiles/secrets/values.age`) and
  `~/.local/secrets` as `GITHUB_APP_ID`.
- **GITHUB_APP_INSTALLATION_ID:** `135372268`, a single installation on glw907 covering both
  ecxc-ski (renamed from ecnordic-ski 2026-06-09) and 907-life (verified via API). In `values.age`
  and `~/.local/secrets`.
- **Private key:** stored as `GITHUB_APP_PRIVATE_KEY_B64` (base64 of the PEM, single-line) in
  `values.age` and `~/.local/secrets`. The loose `.pem` was shredded. Documented in
  `~/.dotfiles/secrets/registry.md`. A consumer site pushes it to its Worker via `sync.sh`
  (`atob()` in-Worker before `@octokit/auth-app`).
- **D1 AUTH_DB (self-owned magic-link auth store):** ecxc = `cairn-ecxc-auth`
  `a47c56d2-25ef-4131-a505-8c9fd5a92f1f` (replaced `cairn-ecnordic-auth`
  `83178db3-0aae-4c1d-b6ad-1626193ebefd` at the 2026-06-09 rename; the old DB still exists pending
  deletion). 907 = `cairn-907-auth`
  `93aa929d-0228-4f8b-8d1e-5e7e0d755617`. Bound as `AUTH_DB` per site. The rebuilt auth uses opaque
  D1-backed session rows, so a signing secret is needed only if the auth design calls for one. Set
  any such per-site secret (worker-only) at cutover.

## Authoring

Claude's drafting on this repo follows the workstation authoring charter at
`~/.claude/docs/authoring-charter.md`: every audience writes to a published external standard, with no
house voice. Code comments follow TSDoc, enforced by ESLint (`eslint.config.js`, run by `npm run
check:comments` over `src/lib`): `eslint-plugin-tsdoc` validates TSDoc syntax, `eslint-plugin-jsdoc`
holds the doc-block shape and forbids `{type}` tags, `jsdoc/informative-docs` flags a comment that only
restates the symbol name (the paraphrase tell), and a local `house/no-em-dash-in-comments` rule bans
the em dash in comments (a keyboard, grep, and monospace hygiene rule TSDoc does not carry). Write the
contract and the why, never the type the signature already states, and never a paraphrase of the code.

Developer documentation follows the Google Developer Documentation Style Guide, enforced by Vale's
vendored Google package over the published doc arms only (the in-tree `.vale.ini` scopes Google to
`reference`/`guides`/`explanation`/`tutorial` plus the docs index, and excludes the internal planning
docs, since the Google standard governs published documentation, not write-once specs, plans,
post-mortems, the rolling STATUS, or the friction log); the global `vale-hook` surfaces its findings on
save and itself skips any `superpowers/` path, and the em dash is allowed there, since Google recommends
it with no surrounding spaces. This is separate from cairn's product prose tooling (`check:prose`, spellcheck, tidy), which
serves editors, not Claude.

Svelte components follow the same TSDoc standard for their `<script>` comments and the Svelte
`@component` convention for the component block. ESLint does not parse `.svelte` yet (the TypeScript
sub-parser is unwired), so Svelte comments rely on the standard and a fresh-context review rather than
a deterministic linter.

One calibration holds: `check:reference` and `jsdoc/require-jsdoc` want every export documented, so an
exported symbol keeps its minimal one-line doc even when self-evident; the write-only-when-it-helps
judgment applies to internal symbols.
