# How-to guides

Task-oriented guides for a returning adopter. Each answers one question and links the
[reference](../reference/README.md) for the exact surface and the
[explanation](../explanation/README.md) arm for the why.

## Set up the backend

- [Set up the GitHub App](./set-up-the-github-app.md): register and install the App so saves commit as `cairn-cms[bot]`.
- [Configure auth and D1](./configure-auth-and-d1.md): stand up the magic-link auth store on D1.
- [Deploy to Cloudflare](./deploy-to-cloudflare.md): the Worker, the bindings, and the publish-and-deploy loop.
- [Cloudflare readiness](./cloudflare-readiness.md): every account and zone delta a cairn site needs, in setup order, with `cairn doctor` as the automated pass.

## Build the site

- [Define an adapter and schema](./define-an-adapter-and-schema.md): the concepts, the slug codec, and the fields.
- [Configure rendering](./configure-rendering.md): markdown to delivered HTML, the registry, and the sanitize floor.
- [Wire the delivery surface](./wire-the-delivery-surface.md): the read model, the permalink route, the feeds, and the manifest.
- [Link content with references](./link-content-with-references.md): declare a reference field, pick a target in the editor, and render the resolved target.
- [Enable tidy and the editor copy-edit](./enable-tidy.md): the spellcheck dialect, turning tidy on with the `ANTHROPIC_API_KEY` secret, and the convention config.

## Edit content

- [Write in the editor](./write-in-the-editor.md): the toolbar, links, layout blocks, Preview, and saving, from an editor's seat.
- [Add an image](./add-an-image.md): paste, drag, or insert an image, write its alt text, and publish it with the post.
- [Manage the media library](./manage-the-media-library.md): find an image, read where it is used, fix its name and default alt, and delete it safely.
- [Publish and discard](./publish-and-discard.md): the editor-facing flow, from a held save to the live site.

## Maintain

- [Upgrade cairn](./upgrade-cairn.md): the `0.x` rename list, oldest first.
- [Read cairn's logs](./read-cairn-logs.md): turn on Workers Logs and query the diagnostic events.
