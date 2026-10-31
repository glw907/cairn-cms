# Why cairn

Before cairn, the small organizations I run sites for lived on WordPress, and later on static site generators with a git-backed editor in front. WordPress was hard to manage and hard to design in, a mass of plugins and theme customization that resisted integration with anything else, and casual editors found its block editor confusing. The static site generators were much cleaner technically, but the problem of editing for non-technical people remained. The aim behind cairn was to give an organization's editors one clean place to work, and to give the person who runs the site something dependable and inexpensive to operate.

Today, cairn is an editor-first, git-backed content management system (CMS) for SvelteKit sites hosted on Cloudflare. It is also a toolkit that a developer extends into the organization's admin. It was first framed for small organizations. Since a site can replace the default sign-in with its identity provider, cairn also suits larger organizations, especially ones already committed to Cloudflare.

This page is for someone deciding whether cairn fits, most often a developer who builds and maintains sites for an organization. It covers the bargain cairn offers, the stack it commits to and what that stack costs, the choice of markdown, how the docs are kept accurate, and where the project stands. It assumes a general familiarity with web development and git. Setting up a site belongs to the [admin track](./admin/README.md), and building on the engine belongs to the [extend track](./extend/README.md). If you write for a site built on cairn, the editor help begins at [Welcome to the editor](./editors/welcome.md), and nothing on this page is needed for writing.

## What cairn offers

A new site works as a CMS before anyone writes code. Editors sign in from a link emailed to them, with no GitHub account and no password. They write markdown in a plain-text editor beside a live preview, which the same render function that draws the public pages produces. A save holds the edit on a branch for that entry. Publishing copies it to the site's main branch through the site's GitHub App, with the editor recorded as the commit's author, and the site's existing deploy carries it live. The default roles are owner and editor, and an owner also manages who may sign in.

The admin is also where a developer adds the organization's screens. A route under `src/routes/admin/` renders inside the admin shell and sits behind the same sign-in guard as the engine's screens. It can compose from the admin toolkit, which is built with DaisyUI and Tailwind, the same classes the admin uses. The people who use the site therefore learn one admin idiom, and every screen the organization adds lives inside it.

The following are the kinds of things a developer builds on those seams:

- A `staff` role that signs in by the same emailed link and lands on a screen made for it.
- A members area with a separate login, built with `createAuthChannel`, outside `/admin`.
- A screen that lists signups from a database the site provisions.
- Screens for events, reservations, or rosters.

Each of these is the developer's code. The engine supplies the role vocabulary, the access map, the custom-route seam, and the second sign-in mechanism, and it models no actor beyond owner and editor. The default magic-link sign-in can be replaced as well, as [Replace magic links with Cloudflare Access](./extend/replace-magic-links-with-cloudflare-access.md) describes.

## The stack

The engine depends on its stack outright, with no layer that would let it run on another framework or host. The following list gives the reason for each part:

- SvelteKit holds the public site and the admin in one app, so a custom screen is an ordinary route with load functions and form actions.
- Cloudflare runs that app as one Worker, with a D1 database for sign-in, an R2 bucket for media, and its email service for sign-in links.
- GitHub holds the content in the site's repository, and the GitHub App commits each publish.
- DaisyUI gives the admin a stock component vocabulary, so a developer's screens use documented classes in place of a private design language.

## Trade-offs against other setups

A competent team often builds an organization's site another way. A managed CMS host bundles hosting, a database, and backups, and puts a visual editor in front, with a theme and plugin market and a labor market of people who know it. A dedicated membership product handles registration, renewals, a member directory, and bulk mail as configuration rather than code. That setup brings mature editorial features, a relational content database, tools that can each be replaced independently, and specialist vendors who support their products.

Next to that, cairn collapses several of those concerns into one app on one platform, and that shape has costs. Each of the following costs comes with the fact that offsets it:

- Extending cairn means custom code written by a developer, with no plugin market. The code starts from the setup command, `create-cairn-site`, documented seams, and agent skills that ship in the package.
- Content is files, so relational queries, reporting, and full-text search are the developer's job at build or request time. A committed manifest indexes every entry, so listing pages never crawl the repository.
- One platform account is one vendor for hosting, data, media, and mail. The same account is one bill and one place to grant a successor access.
- Editors learn markdown syntax, where a rich-text editor asks nothing of them. The live preview shows the result as they type, and a site can turn on an AI copy-edit, [tidy](./extend/turn-on-tidy.md).

Neither shape is the better one in general. They distribute the same work differently, and the right choice depends on whether the organization has a developer and wants its tools in one place.

## Markdown as the content format

Markdown is plain text, so git's diff, blame, and review work on content the way they work on code. A file stays readable without cairn, in any editor or on GitHub. Structured fields live in each file's frontmatter, typed by the fields its concept declares.

A site's render pipeline with no blocks registered still renders plain markdown, GitHub-flavored tables, `cairn:` links between entries, and `media:` image references. Beyond that, a site declares its blocks with `defineComponent`, so the block vocabulary differs from one cairn site to the next. The blocks, the `cairn:` link targets, and the `media:` scheme are pre-1.0 surface, and other markdown tools do not understand them. In another markdown tool, the prose renders and those references do not.

Moving existing content in is a project. No importer ships with cairn, and [Migrate existing content](./extend/migrate-existing-content.md) builds the conversion script a developer writes.

## Docs held to the code

The docs ship inside the npm package, so a site's installed engine carries the docs for the version it runs, and cairn.pub renders them from its installed engine version. The docs change in the same pull request as the code they describe. Continuous integration runs a docs gate that fails when any of the following checks fails:

- Every export has an entry on its reference page, and each function's documented signature matches its real type.
- Every public option is documented on a reference page, excluded with a stated reason, or marked pending against the page meant to document it.
- Every relative link and anchor resolves.
- Every code-voice name on a published page, such as an export, a flag, or a path, exists in the source.
- Every code sample on a reference or guide page typechecks against the built package.

These checks hold names, signatures, options, and links to the code. None of them reads a sentence for meaning. A claim that stops being true with no rename behind it passes the gate, and only a reviewer reading the page against the code finds it. The contributor side of this process is in [Contributing to cairn](../CONTRIBUTING.md).

## Where cairn stands

The engine is pre-1.0 and changes often. Its seams form a narrow, versioned public surface, and every export carries a stability tier that states what it promises across versions. A snapshot gate detects any change to that surface, and every breaking change is disclosed in the changelog's `Consumers must:` list and in the migration notes. Before 1.0, a break can arrive in a minor release. From 1.0, breaking the surface is a major-version event.

The content stays yours. Every entry is a markdown file in your repository, and leaving cairn means cloning that repository and copying the media bucket's contents from your Cloudflare account. The accounts that hold the site are yours too, and [Before you start](./admin/before-you-start.md) states what a site costs to run and what you end up owning.

## Pages by reader

Each track of the docs serves one reader:

- [Set up and run a cairn site](./admin/README.md), for the person who sets up and runs a site without writing code.
- [Editor help](./editors/README.md), for anyone who writes in the admin.
- [Extend](./extend/README.md), for a developer who builds on cairn's seams.
- [Reference](./reference/README.md), one page per export subpath and CLI command.
- [Claude Code](./claude-code/README.md), for working on a cairn site with Claude Code.
