# Why cairn

Before cairn, the small organizations I run sites for lived on WordPress, and later on static
site generators with a git-backed editor in front. WordPress was hard to manage and hard to
design in, a mass of plugins and theme customization that resisted integration with anything
else, and casual editors found its block editor confusing. The static generators, with
Sveltia in front for editing, were much cleaner to work on, and the editor problem for
non-technical users remained the hard part.

These organizations' users needed one clean, integrated place to do nearly everything outside
basic productivity work, which Google Workspace or Office 365 usually covers. And I needed the
technical side to be something I could leave alone, which is the Cloudflare choice. Cost sat
under both, because a small organization often has none to spare.

## What cairn actually does

cairn is two things at once: an editor-first, git-backed CMS, and a SvelteKit toolkit a developer
extends for their own organization. With the zero-config default, cairn is the organization's own
identity system for its editors: they sign in from an emailed link, with no GitHub account and no
password, or, behind Cloudflare Access, [sign in with your organization's Google or Microsoft
accounts](./extend/sign-in-through-your-organization.md). Either way, an editor writes in a markdown editor with a live preview rendered through
the exact function the public site uses. A save holds on a per-entry branch; a deliberate publish copies it
to the main branch with the editor as commit author, and the site deploys the way any push already
does. None of that plumbing reaches the editor.

`create-cairn-site` absorbs the mechanical cost of standing this up: it creates the GitHub App, the
repository, the Cloudflare bindings, and deploys, in one run, narrated the whole way. Getting a
git-backed CMS running by hand means wiring an OAuth flow, a repository, and a hosting account
yourself; cairn's tool does that work so the setup a non-developer runs is a handful of questions,
not a checklist of accounts to configure correctly.

The admin is also a UI toolkit. A developer's own screen, a member roster, an event calendar, a
reservation form, mounts inside the same admin, sharing cairn's components and the same sign-in, so
what gets added reads as one product to the people using it rather than a second app bolted beside
the CMS.

## Why this stack

cairn commits fully to SvelteKit, Cloudflare, and GitHub, with no layer trying to hide any of the
three. Every production cairn site I run is hosted on Cloudflare, because nothing else pairs
security-forward defaults with a free tier that actually stays free for a small site's real
traffic. SvelteKit is the framework a fixed CMS could commit to and get real leverage from: full
server rendering, first-class TypeScript, and a component model islands build on directly, with no
adapter layer trying to also support something else. GitHub is where a small organization's content
already belongs even when nobody there has used git before: every publish becomes a commit, so
history, attribution, and rollback come from tooling that already exists, rather than a content
database cairn would otherwise have to build and keep running.

None of these choices is reversible piece by piece. cairn has no abstraction layer that lets you
swap Cloudflare for another host later. GitHub is the default and the one repository provider
`create-cairn-site` wires up, but a developer can implement
[`BackendProvider`](./extend/sign-in-through-your-organization.md#a-backend-other-than-github)
against a different store; no second implementation ships with cairn today. Committing to cairn
means committing to Cloudflare and, unless you build that seam yourself, GitHub.

## The honest trade-offs

**cairn is pre-1.0, and seams still move.** The extend track's own stability section documents a
seam that moved across two separate minor releases already, inside the tier meant to stay frozen.
Until `1.0`, an upgrade is something to verify against your own code, not just install.
[Migration notes](./extend/migration-notes.md) is the per-version record.

**cairn is built for a small, coordinated editorial team, not a large or anonymous one.** The
zero-config identity model assumes one to a handful of editors who already know each other, with
two roles: owner and editor. Scaling past that, more roles, a larger or public-facing contributor
pool, is something a developer builds on cairn's auth seams
([Add a second audience](./extend/add-a-second-audience.md)), not something the default ships.

**A developer stays in the loop for anything past writing and publishing.** Editors write, publish,
and manage the media library and tag list on their own. Declaring a new content type, adding a
custom admin screen, or changing what a role can do all need someone comfortable in
[the extend track](./extend/README.md). If your organization doesn't have that person and doesn't
plan to, weigh that before you start; [What needs a developer](./admin/before-you-start.md#what-needs-a-developer)
names exactly what falls on that side of the line.

**cairn is a CMS and an admin toolkit, not a platform.** It manages markdown content and the
admin frame, and it stops there deliberately. Member signups, a roster, event registration, a
reservation calendar, anything specific to your organization, is code a developer writes on cairn's
seams. cairn ships none of it out of the box, on purpose: a general-purpose feature for every
organization's specific need would make the engine bigger and slower to build on for everyone,
including the organizations that never touch that feature.

**Setup has real moving parts, even automated.** `create-cairn-site` runs the whole process, but it
still needs a GitHub account, a Cloudflare account, a paid Cloudflare plan from the first deploy,
and possibly a domain purchase once a second person needs to sign in. None of it is complicated
with the tool driving it, but it is not a single sign-up screen.
[Before you start](./admin/before-you-start.md#what-it-costs) has the complete cost picture,
including [what a second editor needs](./admin/before-you-start.md#what-a-second-editor-needs).

**Committing to git-backed content is itself a choice.** Every publish is a commit, which is a real
feature (free history, free attribution, free rollback) and a real constraint: your content lives
in a repository your organization has to have a GitHub account to reach, even if editors themselves
never see it. If your organization already avoids GitHub entirely, that's friction worth naming
before you start, not after.

## Where this leaves you

If the trade-offs above are acceptable and the stack is one you'd choose anyway, [the admin
track](./admin/README.md) gets a default site running with no code, and [the extend
track](./extend/README.md) is where a developer takes it further. If you write for a site someone
else already set up, none of this is yours to decide; [Welcome, editors](./editors/welcome.md) is
where you actually start.
