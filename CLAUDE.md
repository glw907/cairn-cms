# cairn-cms

An embedded, magic-link, GitHub-committing CMS for SvelteKit and Cloudflare, published to npm as
`@glw907/cairn-cms` (MIT). `examples/showcase` is a self-contained SvelteKit site that consumes the
package through `file:../..` and proves every change. The Go `cairn` tool in `tool/` is a separate
module with its own gate.

## Scope: read before any scope-affecting change

cairn owns its core job, managing markdown content and the editor and admin frame, and little else.
Everything a site needs beyond that, its own functionality, actors, auth, data, and domain logic,
belongs to the developer, and cairn serves it with a thin seam, not a built-in feature. The seams are a
narrow, versioned contract with every break disclosed; from 1.0, breaking it is a major-version event.
Owner and editor with magic-link sign-in are the zero-config defaults, not ceilings.

Leanness is the point. "Out of scope" is often the correct answer. Before adding an abstraction, a
subsystem, an actor, or new surface, load the `cairn-judging-scope` skill. Rulings already made live
in `docs/internal/engine-rulings.md` (`grep '^## '` is its index); read the entry before re-arguing a
settled item. Consuming sites send briefs to `docs/internal/consultations/`, and each needs a verdict
before a pass builds on it.

## Working here

- `docs/STATUS.md` holds the current state and the next action. `BACKLOG.md` holds open items,
  `ROADMAP.md` what comes next.
- Cut a worktree off `main` for each pass so `main` stays releasable. The `cairn-running-passes` skill
  has the setup command, the risk classes, and the close checklist. After each task, run
  `npm run lane:fast -- --range <base>..HEAD`. CI on the pull request carries the whole suites.
- The plugin `standards` supplies the review agents (`standards:diff-reviewer`,
  `standards:svelte-reviewer`, `standards:cloudflare-workers-reviewer`,
  `standards:web-auth-security-reviewer`, `standards:daisyui-a11y-reviewer`) and craft skills. Accept the
  folder's trust dialog and it loads. Cloud sessions get only what is committed here.
- A pass never bumps the version or publishes. It finalizes its `CHANGELOG.md` entry under
  `## Unreleased` and stops. Publishing is a separate act with two triggers: a consumer site needs the
  change now, or a coherent capability has landed. Default to holding. The `cairn-releasing` skill is
  the procedure; the path to `1.0` is in `ROADMAP.md` ("Toward 1.0").
- `tool/` is the Go tool. Load `go-conventions` for every file under it, and `golang-spf13-cobra` for
  `tool/cmd/cairn`. Its architecture is in `tool/docs/adr/0001-the-spine-is-the-product.md`.

## Skills, agents, and rules in this repo

- `cairn-judging-scope`: the scope charter and the extending-developer lens.
- `cairn-writing-engine-code`: the idiom charter and the operational traps.
- `cairn-following-admin-design`: the admin design system, behind a rule on `src/lib/admin`.
- `cairn-following-public-design`: the public theme, behind a rule on `src/lib/public`.
- `cairn-running-passes`, `cairn-releasing`: pass mechanics and the release procedure.
- `cairn-writing-docs`: the docs procedure, with the register.
- Agents: `cairn-implementer` (one task in its own worktree), `engine-triage` (consultation briefs),
  `docs-fact-checker`.
- `.claude/rules/` holds the rules that load by path.

## Documentation is a pass dimension

Every pass updates the docs for what it changed. A developer's contract is each export's doc comment,
and a developer's job is taught by the packaged skills under `skills/`: `check:options` fails on a
public option member with no doc comment, `check:tiers` on an export with no tier tag, and
`check:package` on the entry points. The published docs are two tracks under `docs/`, one reader
each: `admin/` and `editors/`, plus `why-cairn.md` for an evaluator. A page serves one track or it
is two pages.

- A pass that changes a public behavior edits the affected pages in the same PR, checked by
  `npm run check:docs-gate`. Load the `cairn-writing-docs` skill for that edit.
- A deficiency found on a published page is fixed on the page in the same pass.
- `MIGRATION-NOTES.md` (upgrade steps and per-version notes) is maintained every pass.
- A friction finding goes to `BACKLOG.md` through `/log-issue`, or is fixed in the pass that meets it.
  There is no friction log.
- cairn.pub renders the doc arms from its installed engine version, so docs on `main` go public at
  the next release and pin bump.

## Diagnosing a running site: logs first

Read the structured logs before reaching for `console.log`. The engine emits a JSON record for every
operationally meaningful event through one chokepoint, `src/lib/log/` (envelope `level`, `event`,
`timestamp`, plus event fields). The table is the `cairn-extending-a-site` skill's `references/log-events.md`. A sign-in failure points
at a send-failure or guard rejection (check `reason`); a save that does nothing points at a commit
failure (`conflict` is a stale-edit collision, `error` the GitHub failure). On Cloudflare, Workers Logs
is the query surface. Records carry an editor's email, never a token or session id; check a record
before pasting it in public. A pass that adds a diagnosable code path gives it an event in the
vocabulary, not a bare `console` call, and updates the table. `createLogger` is public from `/log`.

## Authoring

- Code comments follow TSDoc, enforced by `npm run check:comments`: write the contract and the why,
  never the type the signature states. The em dash is banned in code comments. An exported symbol
  keeps a one-line doc comment even when self-evident, since the doc comment is its published
  contract.
- Developer docs follow the Google Developer Documentation Style Guide, enforced by Vale over
  `docs/**/*.md`. `docs/editors/**` follows Microsoft's plainer voice. Draft each page from its brief in
  the `cairn-writing-docs` skill's `references/docs-register.md`, and use the sanctioned names in its "Names"
  section.
- Tests live in `src/tests/{unit,integration,component}/`; the Vitest config globs only those.

## Conditional follow-ups

Manage a follow-up by what can detect its trigger. A code condition becomes a gate, test, or hook; an
external or time trigger becomes a scheduled agent; a next-time-you-touch-X note becomes a co-located
`// WATCH:` comment; a milestone trend becomes a `ROADMAP.md` entry. Prose in a backlog is the weakest
form.

## Visual work

Any rebuild, theme port, or design migration loads the `visual-fidelity` skill first. Site rebuilds are
quite-close-and-improved; theme ports are glance-indistinguishable. Nothing deploys without a
full-page render read by the main loop's own eyes. Every family artifact meets the five-viewport bar
(320, 390, 768, 1440, 2560), gated by the showcase's CI width matrix; baselines regenerate on CI.

## Durable gotchas

The index is in the `cairn-writing-engine-code` skill's `references/durable-gotchas.md`: Cloudflare
email (`E_SENDER_NOT_VERIFIED` also means an unverified destination), the consumer engine pin
(`link:consumer`), a worktree showcase end-to-end run that proves the main checkout's engine until
reinstalled, CI baselines a local Chromium cannot reproduce, and Vite 8 parsing dist `.svelte`
TypeScript as JavaScript.
