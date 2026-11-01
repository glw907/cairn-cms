# cairn

cairn is an embedded, magic-link, GitHub-committing CMS for SvelteKit sites on Cloudflare.

```
npx create-cairn-site
```

## Where to start

- **Looking up a contract?** Each export's doc comment, shipped in the package's type
  declarations, carries its full contract.
- **Building a site with Claude Code?** [The packaged skills](./skills/) teach each job, and
  [`claude/CLAUDE.md`](./claude/CLAUDE.md) is the guidance a site imports.
- **Working on cairn itself?** [CONTRIBUTING](./CONTRIBUTING.md) maps the repository and how a
  change lands.

## What cairn is

cairn is two things built as one: an editor-first, git-backed content management system, and a
SvelteKit toolkit a developer extends for their organization. The premise is that the people
who write an organization's content are often the same people who know what the organization needs
next, and that a developer who builds directly on the editors' admin surface, rather than a
separate app bolted onto a headless CMS, ships those ideas faster. The admin is a UI toolkit as
much as an editor: a developer's screen, a member roster, an event calendar, a reservation
form, mounts inside the same admin and shares its components and its sign-in, so what gets added
reads as one product to the people using it, not a second app beside cairn.

A developer builds those extras on cairn's seams: member signups, rosters, event and program
registration, reservations, whatever a small organization's site needs beyond content. cairn
ships none of it. It ships the frame, the editor, and the documented seams a developer builds on.

## Content and storage

Content is markdown, committed to the site's GitHub repository, organized as a fixed set of
concepts you declare (Posts and Pages are available out of the box, and you can add more).
A save holds on a per-entry branch; publishing copies it to the main branch with the editor as
commit author, through a GitHub App created for the site, and the site deploys the way any push
already does. Editors sign in from an emailed link, with no GitHub account and no password, write
in a markdown editor with a live preview rendered through the exact function the public site uses,
and never see any of the branch or commit mechanics underneath.

## Why this stack

cairn commits fully to SvelteKit, Cloudflare, and GitHub, with no layer trying to hide any of the
three, and the admin itself is built in DaisyUI and Tailwind, the idiom a developer's screens
extend it in.

## Getting started

`create-cairn-site` scaffolds a complete starter, Waymark: a working site with a component library
already wired in, built to be restyled or replaced rather than started from a blank page. A second,
documentation-focused template, Topo, is planned but not shipped yet.

Already have a SvelteKit app and want to add cairn to it instead?
[The adopt-cairn reference](./skills/cairn-extending-a-site/references/adopt-cairn.md) in the
`cairn-extending-a-site` skill walks the install, from `npm install @glw907/cairn-cms` to a
production deploy.

## Where cairn stands

cairn is pre-1.0. Content stays yours regardless of what happens to cairn: it's markdown in your
repository, and leaving is a matter of cloning it.

History is in the [CHANGELOG](./CHANGELOG.md), upgrade steps are in the
[migration notes](./MIGRATION-NOTES.md), security reporting goes through the [policy](./SECURITY.md), and the
license is [MIT](./LICENSE).
