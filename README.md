# cairn

An embedded CMS for SvelteKit sites on Cloudflare. Editors write markdown in the browser,
and publishing is a git commit.

Cairn installs into your site as a library. An editor signs in from an emailed link (no GitHub
account, no password) and writes in an editor with a live preview of the real site. Saving
commits the markdown to a holding branch in your repo, one branch per entry, where the draft
waits. Publishing copies it to `main`, authored in the editor's name, and your site redeploys
the same as if you'd pushed from a terminal. There is no hosted service, no database, and no
account with anyone. Cairn is code in your app and files in your repo.

I built cairn for my own sites, to solve two problems that kept arriving together. The people
who write for a small site need to edit and publish without learning git, and everything
built for them either takes the site over (a platform with your pages inside it) or takes the
content hostage (a service with your words in its database). And the developer maintaining
that site needs updates to stay cheap. A CMS you build around should never make you rebuild.
So cairn is deliberately small. Its one job is managing markdown content and the
admin where editors write it. It does that job well and gets out of the way. Everything else a site
needs is yours. Routes, data, auth, design, all of it served through a few documented seams
rather than absorbed as features. The stack is fixed on purpose (SvelteKit,
Cloudflare, GitHub, no abstractions over any of them), and "out of scope" is an answer I use
a lot. Refusing generality is what keeps the engine small enough to trust with your site, and
small enough that pulling updates never means reworking what you built around it.

<!-- SCREENSHOT (paired evidence): left, the editor mid-edit with live preview; right, the
     resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as
     author. Capture at the Wayfinder design review; never substitute a stock placeholder. -->

```sh
npm install @glw907/cairn-cms
```

- **Sign-in** is an emailed link. The editor list lives in your D1 database; owners manage it
  from the admin.
- **Saving** writes to a per-entry holding branch. **Publishing** is a deliberate, separate
  step. A conflicting edit is refused, never merged by guesswork.
- **Rendering** is one function your site supplies. The editor's preview and your public
  pages share it, so editors see exactly what ships.
- **Content** is a fixed set of concepts you declare (Posts and Pages out of the box, your
  own beside them), each with a typed frontmatter schema.
- **Removing cairn** leaves you a working repo of markdown. Nothing to export, nothing to
  migrate.

Cairn is obviously not for you if you don't have (or don't want) a Cloudflare account, if
your team works in React or another framework, or if you need open-ended user-defined
collections rather than a fixed set of declared concepts. Those aren't gaps to be fixed. They're the trade
the rest of this README is built on, argued in
[Why cairn](./docs/explanation/why-cairn.md).

Start with the
[tutorial](./docs/tutorial/build-your-first-cairn-site.md): an empty directory to a deployed
site with a working admin. The [docs](./docs/README.md) cover the rest:
[guides](./docs/guides/README.md), [reference](./docs/reference/README.md),
[explanation](./docs/explanation/README.md).

Cairn is pre-1.0 and runs two production sites, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). The [upgrade guide](./docs/guides/upgrade-cairn.md) covers
versioning, the [CHANGELOG](./CHANGELOG.md) covers history, and the
[security policy](./SECURITY.md) covers reporting. MIT [licensed](./LICENSE).
