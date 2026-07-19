# Guides

Each guide here covers one task. The guides under For developers take a site from its adapter
through deploy and day-to-day upkeep. The guides under For editors cover writing, from your first
look at the editor through publishing, images, and tags. Every developer guide assumes [Define an
adapter and schema](./define-an-adapter-and-schema.md) is already done, since every other
developer task builds on the adapter it produces.

## For developers

The first eight guides below build a site in roughly the order the
[tutorial](../tutorial/build-your-first-cairn-site.md) follows. The rest are additions you make
later, or the upkeep of a running site.

- **[Define an adapter and schema](./define-an-adapter-and-schema.md)**: declare your content,
  your GitHub target, and your render function in the one module the engine reads
- **[Configure rendering](./configure-rendering.md)**: build the render function every public
  page and the admin preview both call
- **[Configure auth and D1](./configure-auth-and-d1.md)**: provision the auth database and walk
  a magic-link sign-in end to end
- **[Set up the GitHub App](./set-up-the-github-app.md)**: create and install the App that signs
  every save and publish
- **[Deploy to Cloudflare](./deploy-to-cloudflare.md)**: mount the admin's five files and wire
  its three Cloudflare bindings
- **[Cloudflare readiness](./cloudflare-readiness.md)**: run `cairn-doctor` against your config,
  account, and credentials before a real editor signs in
- **[Wire the delivery surface](./wire-the-delivery-surface.md)**: build the catch-all route,
  feed, and sitemap that turn declared content into a site
- **[Add an island](./add-an-island.md)**: hydrate one interactive Svelte component inside
  otherwise-static rendered content
- **[Add a custom admin screen](./add-a-custom-admin-screen.md)**: add your own SvelteKit route
  under `/admin`, with no plugin API to register against
- **[Organize your admin nav](./organize-your-admin-nav.md)**: declare the whole sidebar as one
  arranged tree, mixing cairn's own screens with your own
- **[Give a role its own admin area](./give-a-role-its-own-admin-area.md)**: declare a role that
  authenticates like any editor but sees none of cairn's own content surfaces, and land it on a
  screen your site built
- **[Restrict admin access by role](./restrict-admin-access.md)**: declare which of your roles
  reaches which screen, one map that gates both the route and the sidebar
- **[Link content with references](./link-content-with-references.md)**: connect one concept's
  entries to another's with a typed reference field
- **[Reuse content across entries](./reuse-content-across-entries.md)**: declare the Fragments
  concept and include one piece of markdown in as many posts and pages as you like
- **[Declare structured fields](./structured-fields.md)**: the rest of the field vocabulary,
  every type, its editor widget, and what validation checks on save
- **[Add authors to your site](./add-authors.md)**: declare your own concept and connect it to
  Posts with the reference-field pattern
- **[Enable tidy](./enable-tidy.md)**: turn on the optional AI copy-edit and see what a tidy call
  costs
- **[Make Waymark your own](./make-waymark-your-own.md)**: re-skin the public template from one
  file through the token seam every re-skin uses, worked with the cairn theme and the template's
  own opt-in identity
- **[Iterate your design locally](./iterate-your-design-locally.md)**: seed real media into local
  R2 state and iterate a design against `vite dev`, with no deploy per tweak
- **[Read cairn's logs](./read-cairn-logs.md)**: read the structured events a running site emits,
  and find the one a symptom points at
- **[Rotate the GitHub App private key](./rotate-the-github-app-key.md)**: generate a new key
  with no window where the App can't authenticate
- **[Migrate existing content](./migrate-existing-content.md)**: map markdown from Hugo, Jekyll,
  or whatever came before onto cairn's concepts
- **[Upgrade cairn](./upgrade-cairn.md)**: bump the version range and run the doctor over the
  `Consumers must:` lines
- **[Troubleshooting](./troubleshooting.md)**: trace a symptom to its log event and the fix, for
  the day a site is already live

## For editors

- **[Welcome, editors](./editor-welcome.md)**: a short orientation before you open the editor
  for the first time
- **[Write in the editor](./write-in-the-editor.md)**: the full guide, markdown, components, the
  editor's surfaces, and the path from draft to published page
- **[Add an image](./add-an-image.md)**: bring a picture into your draft, whether chosen from
  the library or freshly uploaded, and write the caption, alt text, and hero placement it needs
- **[Publish and discard](./publish-and-discard.md)**: move an entry through save, publish, and
  discard, and read what each status means
- **[Manage the media library](./manage-the-media-library.md)**: find, upload, rename, and
  safely delete the images your site shares across every page
- **[Manage your tag vocabulary](./manage-your-tag-vocabulary.md)**: add, rename, and retire the
  tags every post draws from one shared list

Start with Welcome if you're new. It's a ten-minute read. Open Write in the editor when you have
a specific question; its table of contents takes you to the answer.
