# cairn-cms

An embedded, **magic-link**, GitHub-committing CMS for SvelteKit/Cloudflare sites. Non-technical
authors log in by email (no GitHub account, no password), edit raw markdown in a CodeMirror 6
editor (client-only, behind the `MarkdownEditor` seam) with a live preview. Saving holds the edit
on a per-entry `cairn/<concept>/<id>` branch, and a deliberate Publish copies it to `main` via a
**GitHub App** (committer = `cairn-cms[bot]`, author = the editor), which auto-deploys. The library
is design-agnostic. Each site supplies an adapter: its GitHub and email config, the frontmatter
field schema for each concept, and its own `render(md)`, the one renderer the editor preview and
every public page call. Content has one fixed concept shape; the set is the site's to declare
(Posts and Pages out of the box), never an open-ended collection model.

This is a standalone repo at `~/Projects/cairn-cms`. It publishes to public npm as
`@glw907/cairn-cms` (MIT), and consumer sites install it from the registry by version range. The
library's own development proves changes against `examples/showcase`, a self-contained SvelteKit
site that consumes the package through the relative `file:../..` path.

## What cairn is (canonical scope: read before any scope-affecting change)

cairn is a lean, opinionated markdown CMS for SvelteKit + Cloudflare: magic-link editor login,
raw-markdown editing with live preview, and GitHub-App publishing, over site-declared content
concepts of one fixed shape. Its admin skeleton and getting-started scaffold are built with
**DaisyUI + Tailwind**, the idiom a developer extends the admin in, while public output stays
design-agnostic (each site brings its own `render`). cairn does its one job well and gets out of
the way.

The governing boundary, which adjudicates any scope question:

**cairn owns its core job, managing markdown content and the editor/admin frame, and little else.
Everything a site needs beyond that, its own functionality, actors, auth, data, and domain logic,
belongs to the developer, and cairn serves it with a thin seam, not a built-in feature.** The
seams are a narrow, versioned contract with every break disclosed, so a developer's work survives
engine updates with the changes named; from 1.0, breaking it is a deliberate major-version event.
Owner/editor and magic-link are the zero-config defaults, not ceilings: a developer can replace
the auth and override the authorization through documented seams.

Leanness is the point. "Out of scope" and "we don't accommodate that universe" are valid, often
correct, answers; add to the engine only when it demonstrably serves the core job, and prefer the
leanest seam over a general feature. Before adding an abstraction, a subsystem, an actor, or new
surface, ask whether it is cairn's job or the developer's domain, then read
`docs/internal/what-cairn-is-and-is-not.md`.

## Engine consultation (from consuming sites)

Consuming sites consult the engine before a pass builds against it (the `engine-consult` skill is
the protocol; briefs arrive at `docs/internal/consultations/`). Rulings live in
`docs/internal/engine-rulings.md`; read it before re-arguing a settled item, never in place of the
charter's own test.

## How to run this project

The canonical source of truth is the functional spec at
`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`; the older writeups under
`docs/internal/history/` are history only. Engine work runs on feature worktrees off `main`, one
per pass, so `main` stays releasable. The published version, the unpublished window, and the next
action live in `docs/STATUS.md` (rolling, canonical on `main`); shipped history lives in git,
`docs/STATUS.md`, and `ROADMAP.md`, and `docs/HISTORY.md` is a frozen record, not updated.

Pass mechanics live in the `cairn-pass` and `pass-core` skills, not here.

### Tooling

- **Review subagents** (user-scoped, read-only): `svelte-reviewer`, `cloudflare-workers-reviewer`,
  `web-auth-security-reviewer`, `daisyui-a11y-reviewer`.
- **User-scoped tooling:** the official DaisyUI skill (prefer a stock component over a home-grown
  one unless `docs/internal/engine-rulings.md` records the defect; the admin design system wins
  over the skill), the licensed daisyUI Blueprint server (the pre-cut admin audit), the Svelte and
  Playwright servers. Inventory: `~/.claude/docs/claude-tooling.md`.
- **Cloudflare MCP** (account `glw907`, `120c269ad6d3dfbe6d63a0bb53758ca0`) provisions and queries
  D1 for the auth store. Prefer it over the dashboard.
- **The Go `cairn` tool** (`tool/`) is a separate module with its own gate; `go-conventions`
  applies to every file under `tool/`, and `golang-spf13-cobra` loads once a Go file under
  `tool/cmd/cairn` is open. Architecture: `tool/docs/adr/0001-the-spine-is-the-product.md`.

## Documentation is a pass dimension

Every pass updates the docs for what it changed, and a public-API change is not done until its
reference page matches. `check:reference` fails on an undocumented export, `check:options` is its
option counterpart (every member of a public option type needs a row in the committed option map),
and `check:package` checks the entry points.

The public docs are four audience tracks under `docs/`, one reader each: `admin/` (running the
default site, no code), `editors/` (writing in `/admin`, no terminal), `extend/` (building on the
seams), and [`reference/`](docs/reference/README.md) (one page per export subpath, gated), plus
`why-cairn.md` for an evaluator. A page serves one track or it is two pages. The admin, editors,
and extend arms and the front door hold no page until their stages rebuild them; `extend/` keeps
only the per-version records and `choose-an-ai-posture.md`. No pass drafts an arm's prose ahead of
its stage.

- **Facts container.** A pass that changes a public behavior files a bullet in
  [`docs/internal/facts/`](docs/internal/facts/README.md), gated by `check:facts`; each arm's stage
  rebuilds from it.
- **Fix rule.** A deficiency found on a published page is fixed on the page in the same pass,
  except a site edit to an arm whose stage is in flight, which is filed for that stage. A site
  pass's docs edits land on a `site-docs/<site>-<pass>` branch off `main`, merged by PR first.
- **Per-version records** (`docs/extend/migration-notes.md`, `docs/extend/upgrade-cairn.md`) are
  maintained every pass like the reference arm.
- **Friction and roadmap.** [`docs/internal/docs-friction-log.md`](docs/internal/docs-friction-log.md)
  is a staging area, never a backlog: fixed, promoted to [`ROADMAP.md`](ROADMAP.md), or deleted.
  A pass that ships a roadmap item removes it from the live tiers.
- **Docs versioning.** cairn.pub renders the doc arms from its installed engine version, so docs on
  `main` go public at the next release and pin bump.

Consumer sites depend on the package by version range, so a stale doc costs the developers who
build on it.

## Releases (cadence and scheme)

**A pass does not end with a version bump or a publish.** A finished pass finalizes its
`CHANGELOG.md` entry under `## Unreleased`, leaves `package.json` untouched, and stops. Publishing
is a separate, deliberate act with two triggers: (1) a consumer site needs the change now, or (2)
a coherent capability has landed and is worth making available. Default to holding; breaking
changes batch into one `Consumers must:` list. The procedure and numbering rules live in the
`cairn-release` skill; the path to `1.0` lives in [`ROADMAP.md`](ROADMAP.md) ("Toward 1.0").

## The extending-developer lens (subordinate to the charter)

The premise check, "is this cairn's job, and is it the leanest form?", runs before correctness
checks on every spec. The persona beneath it: a developer who launches a content-managed site fast,
builds their own functionality on top, and keeps pulling engine updates without rework. The seams
are the `CairnAdminShell` custom-route seam, `navLayout`, admin-scoped `locals.cairnEditor`, and
the `check:surface`-enforced boundary. Diagnostic questions:
[`docs/internal/extending-developer-lens.md`](docs/internal/extending-developer-lens.md), a
point-in-time brief; verify its baseline before acting on it.

## Watch items (conditional follow-ups)

Manage a follow-up by what can detect its trigger. A code condition becomes a gate, test, or hook;
an external or time trigger becomes a scheduled agent (`schedule` skill); a next-time-you-touch-X
note becomes a co-located `// WATCH:` comment; a milestone trend becomes a `ROADMAP.md` entry.
Prose in a backlog is the weakest form.

## Visual work (family-wide; the method lives in the `visual-fidelity` skill)

Any rebuild, theme port, or design migration invokes the `visual-fidelity` skill at the start. What
is cairn-specific: site rebuilds are quite-close-and-improved, theme ports glance-indistinguishable
(the licensed differences behavioral and structural, never the visible design language); nothing
deploys without a full-page render read by the main loop's own eyes; every family artifact meets
the five-viewport bar (320, 390, 768, 1440, 2560), gated by the showcase's CI width matrix
(baselines regenerate on CI); every theme or site banks its chassis harvest before the pass closes.

## Admin interface design

Before any work on the `/admin` interface (the `src/lib/admin/*.svelte` components or
`cairn-admin.css`), read and follow
[`docs/internal/admin-design-system.md`](docs/internal/admin-design-system.md): the Warm Stone
tokens, the type, the component recipes, the voice, and the load-bearing rules the markup does not
show (most importantly: `data-theme` goes on a bare wrapper, never on a styled element). Keep the
doc current when the design language changes.

## Diagnosing a running site (look to the logs first)

Read the structured logs before reaching for `console.log`. The engine emits a JSON record for
every operationally meaningful event through one internal chokepoint, `src/lib/log/` (envelope
`level`/`event`/`timestamp` plus event-specific fields). Full table:
[`docs/reference/log-events.md`](docs/reference/log-events.md).

Map the symptom to its event: a sign-in failure points at a send-failure or guard rejection (check
`reason`); a save that does nothing points at a commit failure (`conflict` is a stale-edit
collision, `error` is the GitHub failure). On Cloudflare, Workers Logs is the query surface
(filter by `event` or `editor`). Records carry an editor's email, never a token or session id;
check a record before pasting it in public.

A pass adding a diagnosable code path gives it an event in the vocabulary, not a bare `console`
call, and updates the reference table in the same pass. `createLogger` is public from the `/log`
subpath; `docs/reference/log.md` states its narrowed promise.

## Durable gotchas (quick index)

Full detail per anchor in [`docs/internal/durable-gotchas.md`](docs/internal/durable-gotchas.md):
Cloudflare email (`E_SENDER_NOT_VERIFIED` also means an unverified destination), the consumer
engine pin (`link:consumer`), a worktree showcase e2e proving MAIN's engine until reinstalled, CI
baselines this workstation's Chromium cannot reproduce, and Vite 8 parsing dist `.svelte`
TypeScript as JS.

## Credentials (machine-local, not in git)

GitHub App and D1 `AUTH_DB` credentials: `docs/internal/credentials.md` (gitignored, maintainer's
workstation only).

## Authoring

Claude's drafting on this repo follows the workstation authoring charter at
`~/.claude/docs/authoring-charter.md`. Code comments follow TSDoc, enforced by ESLint
(`npm run check:comments` over `src/lib` plus the showcase's `.ts`/`e2e`/`.svelte`, including the
engine's `.svelte` sources): write the contract and the why, never the type the signature already
states, and never a paraphrase. The em dash is banned in code comments. An exported symbol keeps
its minimal one-line doc even when self-evident, since `check:reference` and
`jsdoc/require-jsdoc` want every export documented.

Developer documentation follows the Google Developer Documentation Style Guide, enforced by
Vale's vendored Google package over the published doc arms (`docs/**/*.md`; `docs/editors/**` uses
Microsoft's plainer editor voice; internal planning docs are excluded). Every published docs page
is drafted from the brief for its track in
[`docs/internal/docs-register.md`](docs/internal/docs-register.md), "Drafting brief: developer
docs" or "Drafting brief: editor docs"; read it before writing or reviewing docs prose.

Every part of the system has one sanctioned name: the "Names" section of
[`docs/internal/docs-register.md`](docs/internal/docs-register.md#names), enforced by the
`Cairn.Names`/`Cairn.NamesRetired` Vale rules.
