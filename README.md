# cairn

Cairn is my embedded CMS for SvelteKit sites on Cloudflare. It gives the people who write
for a site a browser editor with a live preview, behind an email-link sign-in, and it stores
everything they write as markdown committed to the site's own GitHub repo. Saves go to a
holding branch, one per entry. Publishing copies the entry to `main` with the editor as
commit author, and from there the site deploys like any other push. There's no hosted
service and no database anywhere in this.

I built cairn for my own sites. I host everything on Cloudflare, because nothing else does
bulletproof, security-forward hosting at almost no cost, but committing to Cloudflare limits
your choice of tools. And I wanted the people who write for a site, non-technical editors,
to get a first-class experience without learning git. Nothing I found gave me both. The
platform CMSes want to own the whole site, and the hosted ones keep your content in their
own database. So cairn is deliberately small. It manages markdown content and the admin where editors write,
and that's it. Anything else your site does, you build next to cairn, and there are
documented seams where your code has to touch the engine. The stack is fixed: SvelteKit,
Cloudflare, GitHub, no abstraction layers over any of them. "Out of scope" is an answer I
use a lot, and it's most of why the engine stays small.

SvelteKit was the easy call. Content sites are what it does best (server-rendered pages,
form actions that work before JavaScript loads), and it's the rare framework developers seem
to genuinely enjoy. Cloudflare needs more defending. Workers, D1, and R2 cover everything a
small site needs, running a small site there costs almost nothing, and the whole substrate
comes from one vendor. GitHub barely counted as a choice, since your content's history,
attribution, and deploy hooks already live there, and cairn uses them rather than rebuilding
them. [Why cairn](./docs/explanation/why-cairn.md) has the full arguments, including the
costs.

<!-- SCREENSHOT (paired evidence): the editor mid-edit with live preview, beside the
     resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as
     author. Capture at the Wayfinder design review; never substitute a stock placeholder. -->

```sh
npm install @glw907/cairn-cms
```

- Sign-in is an emailed link. The editor list is rows in your D1 database, managed from the
  admin by owners.
- Saving and publishing are separate steps. A save waits on its holding branch, and a
  conflicting edit is refused rather than merged by guesswork.
- The editor's preview and your public pages render through the same function, the one your
  site supplies. Editors see exactly what ships.
- Content is a fixed set of concepts you declare. Posts and Pages to start, others if you add
  them, each with a typed frontmatter schema.
- If you remove cairn, you're left with a repo of markdown that still builds.

Cairn is obviously not for you if you don't have (or don't want) a Cloudflare account, if
your team works in React or another framework, or if you need open-ended user-defined
collections rather than a fixed set of declared concepts. Each of those is a deliberate
choice, and [Why cairn](./docs/explanation/why-cairn.md) argues them one by one.

Start with the
[tutorial](./docs/tutorial/build-your-first-cairn-site.md): an empty directory to a deployed
site with a working admin. The [docs](./docs/README.md) cover the rest:
[guides](./docs/guides/README.md), [reference](./docs/reference/README.md),
[explanation](./docs/explanation/README.md).

Cairn is pre-1.0 and runs two production sites, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). The [upgrade guide](./docs/guides/upgrade-cairn.md) covers
versioning, the [CHANGELOG](./CHANGELOG.md) covers history, and the
[security policy](./SECURITY.md) covers reporting. MIT [licensed](./LICENSE).
