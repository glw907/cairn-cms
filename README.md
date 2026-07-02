# cairn-cms

A CMS that lives inside your SvelteKit site and commits to git. Your editors log in with an
email link (no GitHub account, no password), write markdown in a quiet editor with a live
preview, and hit Save. You install a library, keep ownership of every route and template, and
could stop using it tomorrow without losing anything, because your content was plain markdown
in your repo the whole time.

Cairn serves two people who are usually served badly together: the developer, who gets a thin
engine with documented seams instead of a platform, and the editor, who gets a writing surface
instead of a dashboard. For a basic content-managed site, cairn plus its starter template is
close to the whole job. For a site that outgrows a basic CMS, it is a foundation that
stays out of the way while you build around it.

## What happens when an editor hits Save

Cairn doesn't write to a database. It commits the markdown to a holding branch in your repo,
one branch per entry, where the edit waits until the editor hits Publish. Publish copies the
held content to `main`, and from there your normal Cloudflare deploy takes over, the same as
if you'd pushed from a terminal. Every commit goes through a GitHub App, so the editor never
touches GitHub; they still show up as the commit author, and `cairn-cms[bot]` does the
signing. If someone else changed the file mid-edit, cairn refuses the save instead of guessing
how to merge.

The `render` function your site supplies is the only renderer cairn knows about. The editor's
preview calls it and your public pages call it, so what your editor sees is what your site
ships. Everything a visitor sees belongs to you: two production sites run this engine today
and look nothing alike.

## Is cairn right for you?

Probably, if:

- you build on SvelteKit and deploy to Cloudflare, and want to keep doing both
- someone who is not you needs to edit the site, and deserves better than raw git
- you want content in markdown files you own, not in someone's database

Probably not, if:

- you don't have (or want) a Cloudflare account—cairn is deliberately not portable and won't
  try to meet you halfway
- your team works in React or another framework; cairn is Svelte to the bone
- you need open-ended, user-defined collections; content is a fixed set of first-class
  concepts you declare up front, because the engine should have an opinion about what a
  Post is

The argued version of this list, including why each constraint exists, is
[Why cairn](./docs/explanation/why-cairn.md).

## Install

```sh
npm install @glw907/cairn-cms
```

Peer dependencies: `svelte@^5` and `@sveltejs/kit@^2.12`. Your site describes itself to the
engine in one adapter (concepts and their frontmatter fields, the GitHub target, the sender
address, your `render`), mounts the admin with a handful of files, and binds a D1 database
and an email sender in `wrangler.jsonc`. The
[tutorial](./docs/tutorial/build-your-first-cairn-site.md) walks the whole path from an empty
directory to a deployed site with a working `/admin`.

## Documentation

- [Tutorial](./docs/tutorial/build-your-first-cairn-site.md)—build your first cairn site,
  end to end.
- [Guides](./docs/guides/README.md)—task how-tos, grouped for developers and for editors.
- [Reference](./docs/reference/README.md)—one page per export, gated against the code.
- [Explanation](./docs/explanation/README.md)—the architecture and the design rules, and
  why they are the way they are.

[`examples/showcase`](./examples/showcase) is a complete consumer site wired to the engine—
the worked reference for every shape in the docs, and the starter template cairn ships.

## Status

Cairn is pre-1.0 and runs two production sites, [ecxc.ski](https://ecxc.ski) and
[907.life](https://907.life). Pin a caret range; how versions work and how to upgrade across
them is the [upgrade guide](./docs/guides/upgrade-cairn.md)'s job, and history lives in the
[CHANGELOG](./CHANGELOG.md), where every breaking entry carries a "Consumers must" line. The
project stays closely held while the core lands; there is no formal contribution process yet,
so this is not an open call for pull requests.

## Security

The [security policy](./SECURITY.md) covers the posture and how to report.

## License

[MIT](./LICENSE)
