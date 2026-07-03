# cairn-cms documentation

Cairn is a small system that gives a website a writing room. The people who write for the site sign in from a link in their email, edit in the browser with a live preview, and publish when they're ready. The site's developer keeps everything as ordinary files on infrastructure they control. There are no accounts to administer and no database to run. Nothing a writer does can break the site.

**If you write for a site built on cairn**, start with [Welcome, editors](./guides/editor-welcome.md). It's short, and it covers what you'll need. **If you're the developer**, start with [Why cairn](./explanation/why-cairn.md) to decide whether it fits, then build with the tutorial below.

## Start here

1. [Why cairn](./explanation/why-cairn.md) — what it is, who it's for, and why the stack is chosen for you.
2. [Build your first cairn site](./tutorial/build-your-first-cairn-site.md) — an empty directory to a deployed site with a working `/admin`. Keep [`examples/showcase`](../examples/showcase) open alongside; it's a complete consumer site, and every shape the docs describe appears in it wired and running.
3. After that, come back for a [guide](./guides/README.md) when a task comes up, and the [reference](./reference/README.md) while you code.

## The four arms

- **[Tutorial](./tutorial/build-your-first-cairn-site.md)** teaches a first build end to end.
- **[How-to guides](./guides/README.md)** answer task questions, grouped **for developers** (the GitHub App, auth and D1, the adapter, rendering, delivery, deploying, migrating existing content, troubleshooting) and **for editors** (writing, images, the media library, tags, publishing).
- **[Reference](./reference/README.md)** documents each package export, one page per subpath, plus the admin route contract and the log-event table. Every page is gated against the code.
- **[Explanation](./explanation/README.md)** covers the architecture and the design rules: the security model, render safety, the content model, and the reasoning behind each. [Why cairn](./explanation/why-cairn.md) lives here too.

## Vocabulary

Eight words the docs use precisely:

- **Concept** — a first-class content kind your adapter declares (Posts, Pages, or your own), a directory of markdown with a frontmatter schema.
- **Adapter** — the one place your site describes itself to the engine: concepts, the GitHub target, the sender address, your `render`.
- **Render** — your markdown-to-HTML function; the editor preview and your public pages both call it, so there is exactly one way content looks.
- **Owner / editor** — the two roles: owners manage the editor list; editors write and publish.
- **Holding branch** — where a save waits (`cairn/<concept>/<id>`, one per entry) until a deliberate Publish copies it to `main`.
- **Seam** — a documented extension point (a custom admin screen, the identity hand-off, your own routes beside the engine's) with a stability promise attached.
- **Island** — an interactive Svelte component hydrated inside otherwise-static rendered content.
- **Manifest** — the committed index of your content the build verifies, so links and references stay whole.

## Project files

[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md), [CHANGELOG](../CHANGELOG.md). Maintainer-facing material (the design system, the smoke test, and superseded history) lives under [internal/](./internal/README.md).
