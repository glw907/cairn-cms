# cairn-cms documentation

cairn-cms is an embedded, magic-link, GitHub-committing CMS for SvelteKit sites on
Cloudflare. It runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions, and the project
stays closely held while the author works through the core roadmap.

## First visit

If you're new, this order works:

1. Read [Architecture](./explanation/architecture.md). It gives you the mental model: the
   engine/site line, what a save actually does, and where your code stops and the engine
   starts.
2. Do the tutorial, [Build your first cairn site](./tutorial/build-your-first-cairn-site.md).
   It goes from an empty directory to a deployed site with a working `/admin`.
3. Keep [`examples/showcase`](../examples/showcase) open alongside. It is a complete consumer
   site, and every shape the docs describe appears in it wired and running.
4. After that, come back for a [guide](./guides/README.md) when a task comes up, and the
   [reference](./reference/README.md) while you code.

## The four arms

- **[Tutorial](./tutorial/build-your-first-cairn-site.md)** teaches a first build end to end.
- **[How-to guides](./guides/README.md)** answer task questions: setting up the GitHub App,
  configuring auth and D1, defining an adapter, configuring rendering, wiring delivery,
  deploying, rotating the App key, and upgrading.
- **[Reference](./reference/README.md)** documents each package export, one page per subpath,
  plus the admin route contract and the log-event table.
- **[Explanation](./explanation/README.md)** covers the architecture and the design rules,
  including the security model and render safety.

## Project files

[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md),
[CHANGELOG](../CHANGELOG.md). Maintainer-facing material (the design system, the smoke test,
DX feedback, and superseded history) lives under [internal/](./internal/README.md).
