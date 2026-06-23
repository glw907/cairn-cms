# cairn-cms

An embedded, **magic-link**, GitHub-committing CMS for SvelteKit/Cloudflare sites. Non-technical
authors log in by email (no GitHub account, no password), edit raw markdown in a CodeMirror 6
editor (client-only, behind the `MarkdownEditor` seam) with a live preview. Saving holds the edit
on a per-entry `cairn/<concept>/<id>` branch, and a deliberate Publish copies it to `main` via a
**GitHub App** (committer = `cairn-cms[bot]`, author = the editor), which auto-deploys. The library is design-agnostic. Each site supplies an adapter: the content
contract, the slug codec, the frontmatter schema, and its own `renderPreview(md)`. Content is a
fixed set of first-class concepts (Posts and Pages), not open-ended collections.

This is a standalone repo at `~/Projects/cairn-cms`. It publishes to public npm as
`@glw907/cairn-cms` (MIT), and consumer sites install it from the registry by version range. The
library's own development proves changes against `examples/showcase`, a self-contained SvelteKit
site that consumes the package through the relative `file:../..` path.

## How to run this project

The work is a clean, test-first **rebuild** that began 2026-05-28. The canonical source of truth is
the functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`. It
supersedes the older plan and architecture writeups (now under `docs/internal/history/`), which
remain only as history. Read the spec at the start of a rebuild session.

The rebuild ran as a numbered plan series, 00 (foundation) through 08 (scaffolder), each plan
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

Two production sites depend on the package, so a stale doc costs real users. Treat the docs update as
part of the work, not a chore after it. See the `docs-is-a-pass-dimension` memory.

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
`~/.claude/docs/authoring-charter.md`. The TypeScript comment audience is wired through three
layers: ESLint (`eslint.config.js`, `npm run lint`) enforces TSDoc structure on `src/lib`,
forbidding `{type}` tags and invalid TSDoc and holding the canonical doc-block shape; Vale lints
`.ts` comment prose through the vendored `glw907` overlay in `.vale/styles/glw907` (the in-tree
`.vale.ini`), catching the em dash and the banned lexicon; the `ts-conventions` skill and the
`ts-svelte-comments` register carry the semantic TS1 through TS15 tells. `npm run check:comments`
runs the deterministic two, and CI installs the pinned Vale binary before it. Re-sync the overlay
after a canonical change with `~/.dotfiles/scripts/glw907-vendor.sh ~/Projects/cairn-cms --sync`.
This is separate from cairn's product prose tooling (`check:prose`, spellcheck, tidy), which
serves editors, not Claude. The docs prose mapping arrives with the charter's prose arm.
