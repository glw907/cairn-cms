# cairn

An embedded CMS for SvelteKit sites on Cloudflare. Editors write markdown in the browser;
publishing is a git commit.

Cairn installs into your site as a library. An editor signs in from an emailed link—no GitHub
account, no password—and writes in an editor with a live preview of the real site. Saving
commits the markdown to a holding branch in your repo, one branch per entry, where the draft
waits. Publishing copies it to `main`, authored in the editor's name, and your site redeploys
the same as if you'd pushed from a terminal. There is no hosted service, no database, and no
account with anyone: cairn is code in your app and files in your repo.

Cairn is deliberately small. It does one job—managing markdown content and the admin where
editors write it—and it does that job well and gets out of the way. Everything else a site
needs is yours: your routes, your data, your auth, your design, served through a few
documented seams rather than absorbed as features. The stack is fixed on purpose, and
"out of scope" is an answer we use; refusing generality is what keeps the engine small enough
to trust with your site.

<!-- SCREENSHOT (paired evidence): left, the editor mid-edit with live preview; right, the
     resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as
     author. Capture at the Wayfinder design review; never substitute a stock placeholder. -->

```sh
npm install @glw907/cairn-cms
```

- **Sign-in** is an emailed link. The editor list lives in your D1 database; owners manage it
  from the admin.
- **Saving** writes to a per-entry holding branch; **publishing** is a deliberate, separate
  step. A conflicting edit is refused, never merged by guesswork.
- **Rendering** is one function your site supplies; the editor's preview and your public
  pages share it, so editors see exactly what ships.
- **Content** is a fixed set of concepts you declare—Posts and Pages out of the box, your own
  beside them—each with a typed frontmatter schema.
- **Removing cairn** leaves you a working repo of markdown. Nothing to export, nothing to
  migrate.

Whether cairn fits your project—and when it doesn't—is
[Why cairn](./docs/explanation/why-cairn.md). Start with the
[tutorial](./docs/tutorial/build-your-first-cairn-site.md): an empty directory to a deployed
site with a working admin. The [docs](./docs/README.md) cover the rest:
[guides](./docs/guides/README.md), [reference](./docs/reference/README.md),
[explanation](./docs/explanation/README.md).

Cairn is pre-1.0 and runs two production sites, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). Upgrades: [guide](./docs/guides/upgrade-cairn.md) · history:
[CHANGELOG](./CHANGELOG.md) · security: [policy](./SECURITY.md) · license: [MIT](./LICENSE)
