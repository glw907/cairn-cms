# cairn

An embedded CMS for SvelteKit sites on Cloudflare: your writers edit markdown in the browser,
and publishing is a git commit to your repo.

<!-- SCREENSHOT: the editor pane with live preview, mid-edit on a showcase page.
     Captured at the Wayfinder review; do not substitute a placeholder image. -->

```sh
npm install @glw907/cairn-cms
```

- **Writers sign in from an email link.** No accounts to manage, no passwords, no GitHub.
- **Markdown with a live preview of the real site.** The preview renders through your own
  `render` function, so editors see exactly what ships.
- **Save holds, Publish ships.** Drafts wait on a per-entry branch; a deliberate Publish
  commits to `main` and your normal deploy takes over.
- **Your design, untouched.** Cairn renders nothing on the public site; every route,
  template, and byte of CSS stays yours.
- **Content is markdown files in your repo.** No database, no export problem, nothing to
  migrate away from. Stop using cairn tomorrow and you keep everything.

For developers who want the people they build for to edit and publish on their own, without
giving up SvelteKit, Cloudflare, or git as the source of truth. Whether it fits your
project, and honestly when it doesn't, is [Why cairn](./docs/explanation/why-cairn.md).

**Get started:** the [tutorial](./docs/tutorial/build-your-first-cairn-site.md) goes from an
empty directory to a deployed site with a working admin. The [docs](./docs/README.md) cover
the rest: [guides](./docs/guides/README.md), [reference](./docs/reference/README.md), and
[explanation](./docs/explanation/README.md).

Cairn is pre-1.0 and runs two production sites, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). Versioning and upgrades:
[upgrade guide](./docs/guides/upgrade-cairn.md) · history: [CHANGELOG](./CHANGELOG.md) ·
security: [policy](./SECURITY.md) · license: [MIT](./LICENSE)
