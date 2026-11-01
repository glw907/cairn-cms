# cairn

cairn is an editor-first, git-backed content management system (CMS) for SvelteKit sites on Cloudflare, and a toolkit a developer extends for an organization. It is free, MIT-licensed code.

```
npx create-cairn-site
```

## Where to start

- **Deciding whether cairn fits?** [Why cairn](./docs/why-cairn.md) gives the trade-offs, and
  [Architecture](./docs/architecture.md) gives the shape of the system, its security model, and how it
  works with Claude Code.
- **Writing in a cairn site?** The editor help in `docs/editors` begins at its Welcome page.
- **Setting up and running a site?** The admin guide in `docs/admin` begins with Before you start.
- **Building on cairn?** Each export's doc comment, shipped in the package's type declarations,
  carries its contract, and [the packaged skills](./skills/) teach each job. A site that uses Claude
  Code imports [`claude/CLAUDE.md`](./claude/CLAUDE.md).
- **Working on cairn itself?** [CONTRIBUTING](./CONTRIBUTING.md) maps the repository and how a
  change lands.

## What cairn is

cairn's premise is that the people who write an organization's content often know what the
organization needs next. A developer who builds on the editors' admin, instead of a separate app
beside a headless CMS, can add those ideas to the same place the editors already work. A screen a
developer adds, such as a roster or an event calendar, mounts inside the admin, uses the admin's
components, and sits behind the same sign-in.

cairn ships the editor, the admin frame, and the seams. The developer writes the rest, such as
member signups, registration, or reservations. cairn models no content database and ships two roles,
owner and editor, and its public output stays design-agnostic, since each site brings its own `render`.

## Content and storage

Content is markdown, committed to the site's GitHub repository, in content types you declare
(Posts and Pages are available when a site starts, and you can add more). A save holds on a
per-entry branch. Publishing copies it to the default branch with the editor as commit author,
through a GitHub App created for the site, and the site deploys the way any push already does.
Editors sign in from an emailed link, with no GitHub account and no password, write in a markdown
editor with a live preview rendered through the exact function the public site uses, and never see
the branch or commit mechanics underneath. Content is markdown in your repository and media is in
your R2 bucket, so leaving cairn means cloning the repository and copying the bucket.

## Why this stack

cairn commits fully to SvelteKit, Cloudflare, and GitHub, with no layer trying to hide any of the
three. SvelteKit holds the public site and the admin in one app. Cloudflare runs it as one Worker,
with a database, a bucket, and mail in one account. GitHub holds the content, where the diff,
blame, and review tools of git already work. The admin is built in DaisyUI and Tailwind, the idiom a
developer's screens extend it in.

## Start a site

`create-cairn-site` scaffolds a complete starter, Waymark: a working site with a component library
already wired in, built to be restyled or replaced rather than started from a blank page. A second,
documentation-focused template, Topo, is planned but not shipped yet.

To add cairn to an existing SvelteKit app, follow
[the adopt-cairn reference](./skills/cairn-extending-a-site/references/adopt-cairn.md) in the
`cairn-extending-a-site` skill, from `npm install @glw907/cairn-cms` to a production deploy.

## Where cairn stands

cairn is pre-1.0. Its public surface is narrow and tiered, and a break before 1.0 is disclosed
in the changelog and the migration notes.

- [CHANGELOG](./CHANGELOG.md), for history.
- [Migration notes](./MIGRATION-NOTES.md), for upgrade steps.
- [Security policy](./SECURITY.md), for reporting a vulnerability.
- [License](./LICENSE), MIT.
