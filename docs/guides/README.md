# How-to guides

Task-oriented guides for a returning adopter. Each answers one question and links the
[reference](../reference/README.md) for the exact surface and the
[explanation](../explanation/README.md) arm for the why.

## Set up the backend

- [Set up the GitHub App](./set-up-the-github-app.md): register and install the App so saves commit as `cairn-cms[bot]`.
- [Configure auth and D1](./configure-auth-and-d1.md): stand up the magic-link auth store on D1.
- [Deploy to Cloudflare](./deploy-to-cloudflare.md): the Worker, the bindings, and the commit-is-publish loop.

## Build the site

- [Define an adapter and schema](./define-an-adapter-and-schema.md): the concepts, the slug codec, and the fields.
- [Configure rendering](./configure-rendering.md): markdown to delivered HTML, the registry, and the sanitize floor.
- [Wire the delivery surface](./wire-the-delivery-surface.md): the read model, the permalink route, the feeds, and the manifest.

## Maintain

- [Upgrade cairn](./upgrade-cairn.md): the `0.x` rename list, oldest first.
- [Read cairn's logs](./read-cairn-logs.md): turn on Workers Logs and query the diagnostic events.
