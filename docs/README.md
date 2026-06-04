# cairn-cms documentation

cairn-cms runs two production sites today, [ecnordic.ski](https://ecnordic.ski) and
[907.life](https://907.life). It is `0.x` and breaks between minor versions. The author is
still working through the core-feature roadmap, and the project stays closely held until that
core lands.

These docs are organized in four arms.

- **Tutorial** teaches a first build end to end. Forthcoming in a later pass.
- **How-to guides** answer task questions: setting up the GitHub App, configuring auth and D1,
  defining an adapter, configuring rendering, wiring delivery, deploying, and upgrading.
  Forthcoming. [`upgrading.md`](./upgrading.md) is the current upgrade guide until then.
- **Reference** documents each package export, one page per subpath. See the
  [reference index](./reference/README.md).
- **Explanation** covers the architecture and the design rules.
  [`data-architecture.md`](./data-architecture.md) is the current data-tier writeup until the
  arm lands.

## Current pages

While the arms fill in, these pages are live:

- [Upgrading cairn](./upgrading.md)
- [Where each kind of state lives](./data-architecture.md)
- [Admin route structure](./admin-route-structure.md)
- [The render sanitize floor](./render-sanitize-floor.md)

## Project files

[README](../README.md), [ROADMAP](../ROADMAP.md), [SECURITY](../SECURITY.md),
[CHANGELOG](../CHANGELOG.md).
