# Architecture

cairn is an editor-first, git-backed content management system (CMS) for SvelteKit sites on Cloudflare, installed as the npm package `@glw907/cairn-cms`. It runs inside the site's Worker, with no separate CMS server. This page gives a developer deciding whether to adopt cairn the shape of the system, its security model, the promise each export makes, and how cairn works with Claude Code.

## How it runs

A site's admin and public pages are route files in its SvelteKit app. Their load functions and form actions come from the engine's route factories, and `@sveltejs/adapter-cloudflare` builds the app into one Worker. One configuration object, the cairn adapter, passed to those factories tells the engine which concepts the site has, how to render them, and which roles it uses.

Content is markdown in the site's GitHub repository, in content types the site declares in code, which cairn calls concepts. A new site starts with Posts and Pages. The Worker uses two Cloudflare stores beside the repository: a D1 database holds the sign-in tables, and an R2 bucket holds uploaded media.

| Store | Holds |
|---|---|
| GitHub repository | The entries, the content manifest, and the media manifest |
| D1 | The editor roster, single-use sign-in tokens, and sessions, plus opt-in audit and preview-link tables |
| R2 | Uploaded media bytes, deduplicated by content hash |

## The write path

An edit reaches the live site in three steps. A save commits the edit to a holding branch for that entry. A publish copies the branch to the default branch. The publish commit triggers the site's existing deploy, whose build rebuilds and verifies the content manifest.

Every commit goes through the site's GitHub App, never a personal account, and records the editor as the author. An editor needs no GitHub account.

## The seams

cairn owns markdown content and the editor and admin frame. Everything else a site needs, such as its own actors, data, and screens, is the developer's, served through a small set of seams:

- The `content` map declares each concept's fields.
- `render` is the site's renderer, which turns markdown into the public page. Public output stays design-agnostic, so each site brings its own.
- The role list names the site's roles, and the access map narrows what each reaches. Owner and editor with magic-link sign-in are the defaults.
- The `identity` option on the auth guard replaces magic links with an outside gate, such as Cloudflare Access.
- A route file under `src/routes/admin/` renders inside the admin shell behind the same guard, and `navLayout` lists it in the sidebar. The admin toolkit, built with DaisyUI and Tailwind, supplies the components.
- `media` configures the media store.
- An auth channel signs in a second sign-in group outside `/admin`.

## Stability tiers

Every export's doc comment carries one of three tags.

| Tag | Tier | Promise |
|---|---|---|
| `@public` | Extension | cairn means to hold it frozen |
| `@scaffold` | Scaffold | cairn means to hold the wiring a scaffolded site copies frozen |
| `@beta` | Unstable | Stays importable, with no promise across minor versions |

cairn is pre-1.0, so the freeze is a goal and a break to the Extension tier can still ship in a minor release. Each break is listed in the changelog's `Consumers must:` lines and in the [migration notes](../MIGRATION-NOTES.md), and the `check:surface` snapshot gate fails on any change to an export's declared shape until a maintainer records it. From 1.0, breaking the Extension or Scaffold tier is a major-version event.

## The security model

The design assumes the likeliest attacker holds an editor's account, through a stolen or phished sign-in link. An anonymous visitor reaches nothing under `/admin` except the sign-in form and the confirm page the emailed link opens.

- **Sign-in.** A link carries a 256-bit single-use token. The engine sends it only to an address on the roster, it lives 10 minutes, and the database holds only its SHA-256 hash. The sign-in completes only in the browser that asked for it, so a link opened in another browser, or followed by a mail scanner, does nothing. A session lasts 30 days in a `__Host-` cookie over HTTPS.
- **Forged requests.** SvelteKit's origin check and the guard's double-submit token both run on every unsafe admin form post. Admin responses carry `Referrer-Policy: strict-origin`, so a sign-in token never leaves in a referrer.
- **Reach of a taken account.** A taken editor account can publish to the site, within the routes the access map gives its role. The render pipeline sanitizes author markdown by default, stripping scripts, event handlers, and `javascript:` URLs unless the site widens or disables the floor.
- **Secrets.** The GitHub App's private key is a Worker secret. It signs a JWT that GitHub exchanges for a short-lived installation token, which the Worker caches in memory and never logs. The App's Contents permission is write access to the whole installed repository, so the site's repository should hold only the site.
- **Logs.** The engine's structured logs carry an editor's email and never a token, a session id, or a link.

Replacing sign-in or adding a second sign-in group moves some of these defenses to the site. The doc comments on `createAuthChannel`, `createAuthGuard`, and the render exports carry each surface's security contract.

## Claude Code guidance

cairn ships its Claude Code guidance in the package. A site copies it into its `.claude/` folder with `npx cairn-guidance install`.

- **In the package.** Each export's contract is its doc comment in the installed type declarations, and the `--help` text of `cairn-manifest`, `cairn-media-seed`, `cairn-audit`, and `cairn-guidance` carries exit codes and flags. Four skills, `cairn-extending-a-site`, `cairn-building-admin-screens`, `cairn-styling-public-pages`, and `cairn-consulting-the-engine`, teach each job as a router over short references. A review agent, `cairn-extension-reviewer`, checks a site's extension code.
- **In a site.** `cairn-guidance install` copies the skills, the review agent, and a `CLAUDE.md` fragment into `.claude/`. It saves a file the developer edited as `<file>.orig` before refreshing it, keeps and names an edited file the package no longer ships, and `npx cairn-guidance check` reports whether the copy matches the installed package. `cairn-audit` checks a site's admin screens against the design system.
- **In this repository.** A clone carries the skills, agents, and rules for working on cairn. The `standards` plugin supplies the review agents in local sessions. Cloud sessions get only what the repository commits.
- **No MCP server.** The guidance is skill files and `--help` text that a Claude Code session reads from disk. A skill on disk also reaches agents with a fixed tool list, which an MCP server's tools do not.

An eval compared the packaged skills with the technical docs pages they replaced. It ran 18 cases, each giving a fresh Claude session one job, such as a custom admin screen, a second sign-in group, or a new content concept, in a scaffolded site or in the engine tree. File checks and a blind judge graded five trials of each case on each side. A case counts only when the old pages passed at least four of its five trials, since a case the old pages could not pass says nothing about whether the move lost anything. Sixteen cases counted. The packaged guidance passed all five trials of 15 of them and four of five on the other, using 74 percent of the tokens and 61 percent of the wall time the pages took. The run finished on 2026-11-01, and its harness is [run.mjs](../.claude/skills/cairn-writing-docs/evals/run.mjs).

## Related pages

- [Why cairn](./why-cairn.md), for the trade-offs against other setups.
- [Migration notes](../MIGRATION-NOTES.md), for each version's upgrade steps.
- [The security policy](../SECURITY.md), for reporting a vulnerability.
- [Contributing](../CONTRIBUTING.md), for changing cairn itself.
