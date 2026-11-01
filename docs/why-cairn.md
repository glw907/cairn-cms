# Why cairn

Before cairn, the small organizations I run sites for lived on WordPress, and later on static site generators with a git-backed editor in front. WordPress was hard to manage and hard to design in, a mass of plugins and theme customization that resisted integration with anything else, and casual editors found its block editor confusing. The static site generators were much cleaner technically, but the problem of editing for non-technical people remained. The aim was a clean place for editors to write, and a site that is dependable and cheap for the person who runs it.

Today, cairn is an editor-first, git-backed content management system (CMS) for SvelteKit sites hosted on Cloudflare. It is also a toolkit that a developer extends into the organization's admin. It was first framed for small organizations. Since a site can replace the default sign-in with its identity provider, cairn also suits larger organizations, especially ones already committed to Cloudflare.

If you write for a site built on cairn, the editor help begins at Welcome to the editor. Nothing on this page is needed for writing.

This page is for someone deciding whether cairn fits, most often a developer who builds and maintains sites for an organization. It covers the bargain cairn offers, the stack it commits to and what that stack costs, the choice of markdown, how the docs are kept accurate, what a site costs to run, and where the project stands. It assumes a general familiarity with web development and git. The setup guide covers setting up a site. Building on the engine belongs to each export's doc comment and the packaged skills, which [Architecture](./architecture.md) describes.

## What cairn offers

A new site works as a CMS before anyone writes code. Editors sign in from a link emailed to them, with no GitHub account and no password. They write markdown in a plain-text editor beside a live preview, which the same render function that draws the public pages produces. A save holds the edit on a branch for that entry. Publishing copies it to the site's default branch through the site's GitHub App, with the editor recorded as the commit's author, and the site's existing deploy carries it live. The default roles are owner and editor, and an owner also manages who may sign in.

The admin is also where a developer adds the organization's screens. A route under `src/routes/admin/` renders inside the admin shell and sits behind the same sign-in guard as the engine's screens. It can compose from the admin toolkit, which is built with DaisyUI and Tailwind, as the admin is. Editors and staff then work in one admin, with the organization's screens beside the engine's.

The following are the kinds of things a developer builds on those seams:

- A `staff` role that signs in by the same emailed link and lands on a screen made for it.
- A members area with a separate login, built with `createAuthChannel`, outside `/admin`.
- A screen that lists signups from a database the site provisions.
- Screens for events, reservations, or rosters.

Each of these is the developer's code. The engine ships two roles, owner and editor. A site declares any others and writes the code behind them. The engine also supplies the access map, the custom-route seam, and the second sign-in mechanism. The default magic-link sign-in can be replaced as well, as the `cairn-extending-a-site` skill's [Cloudflare Access reference](../skills/cairn-extending-a-site/references/cloudflare-access.md) describes.

## The stack

The engine depends on its stack outright, with no layer that would let it run on another framework or host. Each part below has a reason:

- SvelteKit holds the public site and the admin in one app, so a custom screen is an ordinary route with load functions and form actions.
- Cloudflare runs the app as one Worker, with a D1 database for sign-in, an R2 bucket for media, and its email service for sign-in links, so hosting, data, media, and mail sit in one account and one bill.
- GitHub holds the content in the site's repository, and the GitHub App commits each publish, because the diff, blame, and review tools of git already work on text files.
- DaisyUI gives the admin a stock component vocabulary, so a developer's screens use documented classes in place of a private design language.

## Trade-offs against other setups

A competent team often builds an organization's site another way. A managed CMS host bundles hosting, a database, and backups, and puts a visual editor in front, with a theme and plugin market and a labor market of people who know it. A dedicated membership product handles registration, renewals, a member directory, and bulk mail as configuration rather than code. That setup brings mature editorial features, a relational content database, tools that can each be replaced independently, and specialist vendors who support their products.

Next to that, cairn collapses several of those concerns into one app on one platform, and that shape has costs. Each of the following costs comes with the fact that offsets it:

- Extending cairn means custom code written by a developer, with no plugin market. The code starts from `create-cairn-site`, the documented seams, and the agent skills that ship in the package.
- Content is files, so relational queries, reporting, and full-text search are the developer's job at build or request time. A committed manifest indexes every entry, so a build can list and filter entries without reading each file.
- One platform account is one vendor for hosting, data, media, and mail. The same account is one bill, and with the GitHub repository it is all a successor needs access to.
- Editors learn markdown syntax, where a rich-text editor needs none. The live preview shows the result as they type. A site can also turn on tidy, an AI copy-edit; see the skill's [tidy reference](../skills/cairn-extending-a-site/references/tidy-and-ai-posture.md).

Neither shape is the better one in general. The right choice depends on whether the organization has a developer and wants its tools in one place.

## Markdown as the content format

Markdown is plain text, so git's diff, blame, and review work on content the way they work on code. A file stays readable without cairn, in any editor or on GitHub. Each file's frontmatter holds its structured fields, typed by its concept's declaration.

A site's render pipeline with no blocks registered still renders plain markdown, GitHub-flavored tables, `cairn:` links between entries, and `media:` image references. Beyond that, a site declares its blocks with `defineComponent`, so the block vocabulary differs from one cairn site to the next. The blocks, the `cairn:` link targets, and the `media:` scheme are pre-1.0 surface, and other markdown tools do not understand them.

Moving existing content in is a project. No importer ships with cairn, and the skill's [migration reference](../skills/cairn-extending-a-site/references/migrate-content.md) walks through the conversion script a developer writes.

## Docs held to the code

Each export's contract is its doc comment, shipped in the package's type declarations, so a site's installed engine carries the contract for the version it runs. The packaged skills teach each job, and they ship in the same package. A change to a public export updates its comment in the same pull request, and continuous integration fails the build when any of the following checks fails:

- Every public export carries a stability tag, and every public option member has a doc comment.
- A snapshot of the public surface matches the built declarations, so a break cannot ship unrecorded.
- Every code sample in a skill reference typechecks against the built package, except a fragment marked with a stated reason.
- Every relative link and anchor on a published page resolves, and every code-voice name on one exists in the source.

These checks hold names, tags, samples, and links to the code. None of them reads a sentence for meaning. A claim that stops being true with no rename behind it passes the gate, and only a reviewer reading the page against the code finds it. The contributor side of this process is in [Contributing to cairn](../CONTRIBUTING.md).

## Where cairn stands

The engine is pre-1.0 and changes often. Its seams form a narrow, versioned public surface, and the tiers and snapshot gate above detect and disclose every break in the changelog's `Consumers must:` list and in the migration notes. Before 1.0, a break can arrive in a minor release. From 1.0, breaking the surface is a major-version event.

The content stays yours. Every entry is a markdown file in your repository and every image is in your R2 bucket, so leaving cairn means cloning the repository and copying the bucket's contents from your Cloudflare account. Blocks, `cairn:` links, and `media:` references mean nothing to another markdown tool, so a move also means converting those. The accounts that hold the site are yours too.

## What a site costs

cairn is free, MIT-licensed code. A site's running cost is its Cloudflare account. The Workers Paid plan costs $5 a month and a cairn site needs it from its first deploy ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), as of 2026-08-11). A domain name costs about $10 to $15 a year for the common endings, and only if you connect your own. The database, the storage bucket, and the GitHub repository cost nothing at a small site's size. The admin guide's Before you start page gives the full list with its dates.

## Pages by reader

- Editor help, for anyone who writes in the admin.
- Set up and run a cairn site, with no code.
- [Architecture](./architecture.md), for a developer who wants the shape of the system, its security model, and how it works with Claude Code.
- [Contributing](../CONTRIBUTING.md), for a developer who changes cairn itself.
