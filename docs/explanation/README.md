# Explanation

Understanding-oriented pages on how cairn works and why. Each page carries the design reasoning and
links the [reference](../reference/README.md) for the exact API surface.

- [Architecture](./architecture.md): the layered model, the engine/site line, the commit/publish flow, and distribution.
- [Where each kind of state lives](./data-tiers.md): the git-versus-D1 placement rule and its precedents.
- [Security model](./security-model.md): auth, the GitHub-App commit trust, render safety, and origin checks.
- [Content model](./content-model.md): fixed concepts, URL identity, schema as the source of truth, and the content graph.
- [Reference integrity](./reference-integrity.md): how reference fields stay rename-safe, delete-protected, and build-verified, and why each gate refuses rather than guesses.
- [Media storage](./media-storage.md): why media bytes live in R2 with a logical reference in git, content-hash identity, and on-demand transforms.
- [The editor copy-edit](./editor-copyedit.md): why spellcheck stays local and markdown-aware, how tidy preserves voice with no house style, and why git is the durable record for both.
