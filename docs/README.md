# cairn-cms documentation

cairn is an embedded, magic-link CMS for SvelteKit sites on Cloudflare, publishing through a
GitHub App.

```
npx create-cairn-site
```

## Where to start

- **Deciding whether cairn fits?** [Why cairn](./why-cairn.md) covers the reasoning, the stack,
  and the honest trade-offs.
- **Writing for a site built on cairn?** [Welcome, editors](./editors/welcome.md) starts with
  signing in.
- **Setting up a site and won't be writing code?** [The admin track](./admin/README.md) takes you
  from nothing to a live, running site with zero code. Most sites finish here.
- **A Svelte developer extending a site?** Set the site up with the admin track first, then come
  back to [the extend track](./extend/README.md) for custom content, admin screens, and everything
  else past the default.
- **Working on cairn itself?** [CONTRIBUTING](../CONTRIBUTING.md) maps the repository and how a
  change lands.

## What cairn is

cairn is two things built as one: an editor-first, git-backed content management system, and a
SvelteKit toolkit a developer extends for their own organization. Content lives as markdown in the
organization's own repository, where every publish is a commit under the writer's name; history,
attribution, and rollback come from git itself, and the writer never sees any of it. The admin is
also a toolkit: a developer's own screen, a roster, an event calendar, a reservation form, mounts
inside the same admin and shares its components and its sign-in, so what gets built next reads as
one product rather than a second app bolted on beside the CMS.

## Superseded pages

Three older sections still sit in this repository and in the published package while the new
tracks replace them: [the hand-build tutorial](./tutorial/build-your-first-cairn-site.md), [the
theme tutorial](./tutorial/build-a-theme.md), the guides, and the explanation pages. Nobody
maintains them now. Where one of them disagrees with a track listed earlier, trust the track.
The next release drops them.

## Project files

[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md),
[CHANGELOG](../CHANGELOG.md). The engine's own internal planning and design records, for
contributors, live under [internal/](./internal/README.md).
