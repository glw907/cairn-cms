# Front-door concept figure: the argument (brief for adversarial review)

Ratified by Geoff, 2026-09-04, across one brainstorm sitting. This is the argument the
figure makes; the drawing is downstream of it.

## Purpose and reader

A concept figure on the cairn.pub front door for a brand-new technical reader, for whom the
idea is hard to explain in words. It must make them see how the parts fit together and why
the structure makes sense. The reader is a developer (or a technically fluent lead) choosing
how a small organisation, a club or nonprofit or small business with non-technical editors,
runs its website and its own organisational tools.

## The lesson

cairn is both a working out-of-the-box CMS and an extensible admin tool. The figure teaches
this by contrast between two competent shapes, neither graded, each with advantages and
drawbacks stated in the same factual voice. The eye should recover, before reading: two
systems and several vendors on one side against one app, one repository, one platform on the
other; and that both sides carry advantages and drawbacks.

## Panel A, the traditional shape (a steel man)

Generic roles in the artwork; the caption names the examples (WordPress with MembershipWorks;
the bundled-platform variant such as Wild Apricot).

- A hosted CMS site (a WordPress site on a hosting provider).
- Beside it, a bundled membership platform that already does members, events, email to
  members, and a member-facing portal in its own interface.
- A payments provider for dues.
- A DNS registrar.
- Organisational mail (Google Workspace).

Drawn as two systems the same people use: two logins; the member record living in the
platform rather than with the site; the portal in the platform's look and the website in the
CMS's; an integration between them; two non-interacting databases; two authentication
systems; several accounts.

Advantages, stated as facts: mature editorial features out of the box; a mature membership
product with events, email, and a portal built in; each part replaceable independently;
specialist vendors; configuration and plugins rather than code.

Costs, stated as facts: two interfaces and two logins for the same people; the member record
outside the site; the integration to maintain; duplicated data; several accounts and bills;
potentially fragile integrations; awkward and duplicated interfaces for users.

## Why git-managed content (the question a reader will ask: why not a database?)

The content is markdown files in the site's own GitHub repository, not rows in a content
database. The argument, stated as facts:

- Every change is a commit with an author and a message; history, diff, review, and rollback
  are git's, not a feature the CMS has to build. An editor's save lands on a per-entry
  branch (`cairn/<concept>/<id>`) and publish copies it to `main`, so drafts and the live
  site are branches, not flags in a table.
- Backup and portability come free: the content is plain files in a repository the
  organisation owns, readable without cairn, restorable by clone, movable to any other
  markdown-reading tool.
- Content and code share one repository and one deploy: a push to `main` deploys the site,
  so a content change and a design change ride the same path and the same review.
- There is no content database to host, back up, migrate, or secure; the only database in
  the picture (D1) holds sign-in sessions, and the organisation's own data if it chooses.
- Editors never touch git: they sign in by email and write in `/admin`; commits are made on
  their behalf by the site's GitHub App, attributed to them.
- Developers get everything git gives code: pull requests on content, blame, bisect, CI.

Drawbacks, in the same voice:

- Files are not a relational store: cross-entry queries, reporting, and aggregate views
  are the developer's job at build or request time, not a query away.
- Full-text search is not built in; a site adds it (a build-time index, or a service).
- Binary assets do not belong in git at scale; media lives in R2, so the content is split
  across two stores by design.
- Concurrent edits to one entry are serialised by the per-entry branch; a busy newsroom
  with many editors on one document is not the shape cairn is built for.
- Very large corpora (tens of thousands of entries) push build and index times; cairn's
  fixed concepts (posts, pages) are sized for an organisation's site, not a publisher's.

### And why markdown

The file format is the other half of the same choice. Markdown is plain text, so git's
line-based diff, blame, and review work on content the way they work on code; a change reads
as a change. It is readable and writable without any tool, so the content outlives cairn and
any editor. It is the most widely read text format by coding agents and language models, so
agent-assisted content and site work operates on the same files. The format is stable, so a
file written today reads the same in a decade. Structured fields ride in frontmatter, and
richer pieces (a callout, a figure, an embed) are named directives cairn's component grammar
renders, so the file stays plain while the page does not.

Drawbacks: editors write markdown, with live preview and the editor's tidy pass, not a
WYSIWYG page builder; complex layouts (multi-column pages, tables with merged cells, ad hoc
design per page) are the developer's components, not the editor's drag and drop; and a
format that is plain text puts the burden of structure on the frontmatter schema the
developer defines.

### Why no page builder is a feature, not only a cost

The absence of a WYSIWYG page builder is stated above as a drawback. It is also, for an
organisation's site, an advantage, and the argument is made from facts rather than taste:

- Content and design are separate by construction. An editor writes what the page says;
  the site's theme decides how every page looks. No editor can break the layout, put a
  heading in the wrong size, or drift the site off its design one page at a time, because
  the file carries no layout.
- A page builder stores layout inside the content (block markup, shortcodes, builder JSON),
  which ties the content to that builder and makes a change of builder or theme a migration
  of every page. Markdown with frontmatter carries no builder.
- The editor's job stays small and learnable: headings, emphasis, links, lists, images, and
  the site's named directives, with live preview. The site's designer owns the rest.
- The public record on builders supports the point without adjectives: WordPress's block
  editor (Gutenberg) shipped in 2018, and the Classic Editor plugin that restores the
  previous editor has remained among the most installed WordPress plugins for years, with
  the block editor's own plugin listing carrying a low user rating (the evidence file cites
  the current numbers). An organisation choosing a site today is choosing the editing model
  its editors will live with.

The counterweight stays honest: a site that needs editors to compose bespoke layouts per
page (a magazine, a landing-page factory) wants a builder, and cairn is not for it.


## Panel B, the cairn shape

- One SvelteKit app, the site's own codebase: the public site (the site's theme and render);
  cairn's `/admin` mounted inside it (editors sign in by email, write markdown with live
  preview, media library; the admin frame built in DaisyUI on Tailwind); the site's own admin
  screens beside it through documented seams.
- Custom member management and a custom announcements screen as screens inside the same
  admin: one login (the same magic-link editor session), one member record, announcements
  sent through Cloudflare Email Sending.
- Content is markdown files in the site's own GitHub repository: history, review, and backup
  come from git; a save is a commit on a `cairn/<concept>/<id>` branch made by the site's
  GitHub App; publish copies it to `main`.
- The whole app runs as one Cloudflare Worker, and one Cloudflare account supplies what Panel
  A assembles from several vendors: hosting and the CDN edge, D1 for the sign-in store (and
  available for the site's own data), R2 for media, Email Sending for magic links and
  announcements, TLS and edge security as platform defaults, Workers Builds for the deploy
  from the repository (the scaffold's default path; a site may deploy with wrangler instead).
  DNS can sit at Cloudflare, so no registrar box.
- Two honest retained outside parties, drawn identically in both panels: a payments provider
  and organisational mail.
- The stack is visible: SvelteKit; DaisyUI on Tailwind for the admin frame; D1.

Advantages (carried by shape and by fact, never adjectives): one app, one repository, one
platform; one login and one interface for editors and members; one member record; one
deploy; edge security and TLS as platform defaults.

Drawbacks, stated with the same weight as Panel A's advantages:

1. Extending cairn means writing custom code. The site's own screens, theme, and public site
   are code a developer writes and maintains, where Panel A offers configuration, plugins,
   and a mature membership product.
2. Content is files, so relational queries and reporting are the developer's job.
3. One platform account is one vendor.

Each drawback gets a factual counterweight bound to it in the artwork, never a grading word.
For the first: the custom code is scaffolded (`create-cairn-site` emits a working site with a
starting theme and chassis; the admin seams are documented; the engine ships one agent skill (`cairn-admin-screens`)
in the npm package); every piece is a widely documented technology (SvelteKit, markdown in git,
a Worker with D1 and R2); GitHub and Cloudflare both publish agent tooling for management and
development; so agent-assisted development works against known ground.

## The core argument (caption, in prose)

Before coding agents, cairn's custom-code model suited few teams: a site that needs member
management had to write it. With coding agents working against documented, widely used
pieces and vendor-published agent tooling, that custom code is a smaller lift, and the result
is one app with one interface for the organisation's people at a lower development cost than
integrating separate products. The caption points explicitly at the counterweight sub-label
it explains, so the link between the drawback and the change in time is unmistakable.

## Register constraints

No pitch words, no adjectives that grade either side, no vendor names in the artwork, every
statement verifiable as a general fact, no em dashes. The traditional side is a competent
setup a good team would build, never a strawman; good systems combine several of these tools
well.
