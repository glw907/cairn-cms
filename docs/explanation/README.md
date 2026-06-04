# Explanation

Understanding-oriented pages on how cairn works and why. Each page carries the design reasoning and
links the [reference](../reference/README.md) for the exact API surface.

- [Architecture](./architecture.md): the layered model, the engine/site line, the commit/publish flow, and distribution.
- [Where each kind of state lives](./data-tiers.md): the git-versus-D1 placement rule and its precedents.
- [Security model](./security-model.md): auth, the GitHub-App commit trust, render safety, and origin checks.
- [Content model](./content-model.md): fixed concepts, URL identity, schema as the source of truth, and the content graph.
