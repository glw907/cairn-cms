# cairn

**Your writers get a magic link. Your repo gets the commit.**

Cairn is an embedded CMS for SvelteKit sites on Cloudflare: editors write markdown in the
browser, and every publish is a git commit to your repo, authored in their name. An editor
signs in from an emailed link—no GitHub account, no password—and their saves wait on a
per-entry branch until a deliberate Publish commits to `main` and your site redeploys, the
same as if you'd pushed from a terminal. Unlike a hosted headless CMS there is no service, no
database, and no vendor account; unlike form-based git CMSes, markdown is the writing
surface, not an implementation detail. We built cairn on two convictions that rarely ship
together: writers deserve a real editor, and developers deserve to keep owning their site.

<!-- SCREENSHOT (paired evidence): left, the editor mid-edit with live preview; right, the
     resulting GitHub commit showing cairn-cms[bot] as committer and the editor's name as
     author. One image proving both halves of the pitch. Capture at the Wayfinder design
     review; never substitute a stock placeholder. -->

```sh
npm install @glw907/cairn-cms
```

- **One renderer, yours.** Your site supplies `render`; the editor's live preview and your
  public pages run the same pipeline, so editors see exactly what ships.
- **Save holds, Publish ships.** One branch per entry; a conflicting edit is refused, never
  merged by guesswork.
- **Nothing rendered for you.** Cairn owns `/admin` and stays out of your public site; every
  route, template, and byte of CSS is yours.
- **Concepts, not collections.** Posts and Pages out of the box, your own declared beside
  them, each with a typed frontmatter schema.
- **Leave anytime.** Your content was markdown files in your repo the whole time.

For developers who want the people they build for to publish on their own, without giving up
SvelteKit, Cloudflare, or git as the source of truth. Whether cairn fits your project—and
when it doesn't—is [Why cairn](./docs/explanation/why-cairn.md).

Start with the [tutorial](./docs/tutorial/build-your-first-cairn-site.md): an empty directory
to a deployed site with a working admin. The [docs](./docs/README.md) cover the rest:
[guides](./docs/guides/README.md), [reference](./docs/reference/README.md),
[explanation](./docs/explanation/README.md).

Cairn is pre-1.0 and runs two production sites, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). Upgrades: [guide](./docs/guides/upgrade-cairn.md) · history:
[CHANGELOG](./CHANGELOG.md) · security: [policy](./SECURITY.md) · license: [MIT](./LICENSE)
