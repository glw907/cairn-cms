# cairn

An embedded CMS for SvelteKit sites on Cloudflare. Editors write markdown in the browser,
and publishing is a git commit.

Cairn installs into your site as a library. An editor signs in from an emailed link (no
GitHub account, no password) and writes in an editor with a live preview of the real site.
Saving commits the markdown to a holding branch in your repo, one branch per entry, where the
draft waits. Publishing copies it to `main`, authored in the editor's name, and your site
redeploys the same as if you'd pushed from a terminal. There's no hosted service and no
database. The CMS is code in your app, and the content is files in your repo.

I built cairn for my own sites. The people who write for a small site need to edit and
publish without learning git, and the tools built for them mostly come in two shapes:
platforms that absorb your whole site, and hosted services that keep your content in their
database. I didn't want either, and I also didn't want a CMS where pulling updates meant
reworking whatever I'd built around it. So cairn is small on purpose. It manages markdown
content and the admin where editors write it, and that's the whole job. Your routes, data,
auth, and design stay yours, reachable through a few documented seams. The stack is fixed
(SvelteKit, Cloudflare, GitHub, no abstraction layers over any of them) and I say "out of
scope" a lot. That refusal is what keeps the engine small enough to understand, and small
enough that updates don't break what you built around it.

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
