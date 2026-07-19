# cairn-cms documentation

Cairn is an open-source content management system for the websites of small organizations, built as both a finished tool and a toolkit. It is a writing tool rather than a dashboard: the editor is built in the lineage of iA Writer, Ulysses, and Typora, and writers work in markdown with a live preview rendered through the site's own pipeline. The content lives in the organization's own repository, where every publish is a commit under the writer's name; history, attribution, and ownership come built in, and the writers never see any of it. There is nothing to run or protect: no server, no content database, no passwords. Developers extend cairn in its own idiom, as first-class SvelteKit code on documented, versioned seams, and cairn itself is an npm dependency updated like any other. The admin is also a UI toolkit, so the screens a developer adds (member signups, event registration, a reservation calendar) sit beside the built-in ones, sharing the same components and the same sign-in. Cairn is MIT-licensed open source; there is nothing to buy.

**If you write for a site built on cairn**, start with [Welcome, editors](./guides/editor-welcome.md). It's short, and it covers what you'll need. **If you're the developer**, start with [Why cairn](./explanation/why-cairn.md) to decide whether it fits, then build with the tutorial below.

## Start here

1. [Why cairn](./explanation/why-cairn.md) — what it is, who it's for, and why the stack is chosen for you.
2. [Build your first cairn site](./tutorial/build-your-first-cairn-site.md) — an empty directory to a deployed site with a working `/admin`. Keep [`examples/showcase`](../examples/showcase) open alongside; it's a complete consumer site, and every shape the docs describe appears in it wired and running.
3. After that, come back for a [guide](./guides/README.md) when a task comes up, and the [reference](./reference/README.md) while you code.

## How the docs are organized

- **[Tutorial](./tutorial/build-your-first-cairn-site.md)** teaches a first build end to end.
- **[How-to guides](./guides/README.md)** answer task questions (the GitHub App, auth and D1, the adapter, rendering, deploying, troubleshooting), with the editor-facing guides (writing, images, the media library, tags, publishing) grouped separately.
- **[Reference](./reference/README.md)** documents each package export, one page per subpath, plus the admin route contract and the log-event table. The export pages are gated against the code.
- **[Explanation](./explanation/README.md)** covers the architecture and the design rules: the security model, render safety, the content model, and the reasoning behind each. [Why cairn](./explanation/why-cairn.md) lives here too.

## Vocabulary

These words carry a precise meaning in cairn:

- **Concept** — a first-class content kind your adapter declares (Posts, Pages, or your own), a directory of markdown with a frontmatter schema.
- **Adapter** — the one place your site describes itself to the engine: concepts, the GitHub target, the sender address, your `render`.
- **Render** — your markdown-to-HTML function; the editor preview and your public pages both call it, so there is exactly one way content looks.
- **Role / capability** — your site names its own roles (owner and editor by default); each maps onto one of three capability levels the engine understands: owner (manages the editor list), editor (writes and publishes), or none (signed in, no content access).
- **Holding branch** — where a save waits (`cairn/<concept>/<id>`, one per entry) until a deliberate Publish copies it to `main`.
- **Seam** — a documented extension point (a custom admin screen, the identity hand-off, your own routes beside the engine's) with a stability promise attached.
- **Island** — an interactive Svelte component hydrated inside otherwise-static rendered content.
- **Manifest** — the committed index of your content the build verifies, so links and references stay whole.

## Project files

[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md), [CHANGELOG](../CHANGELOG.md). Maintainer-facing material (the design system, the smoke test, and superseded history) lives under [internal/](./internal/README.md).

When something breaks, start with [troubleshooting](./guides/troubleshooting.md), which maps symptoms to fixes. The [cairn-doctor](./reference/doctor.md) command checks a site's configuration, and the [structured logs](./guides/read-cairn-logs.md) record what a running site actually did.
