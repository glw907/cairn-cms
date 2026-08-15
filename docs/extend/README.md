# The extend track

This track is for a Svelte-fluent developer building an organization's site on cairn's seams:
declaring content, building custom admin screens, extending the publishing flow, and keeping a site
current across engine versions. You're evaluating cairn, taking over a scaffolded site, or already
building on it.

If you write content on a site someone else set up, you want [the editor track](../editors/welcome.md)
instead; nothing here assumes you've ever opened `/admin` as a writer. If you're setting up a site
and won't be writing code, start with [the admin track](../admin/README.md) and come back here once
it's live and you want to build on it.

## Before any of this: the adapter has to exist

Every page below assumes a working adapter: a site that already declares its content concepts, its
GitHub target, and a `render` function. [Define an adapter and schema](./define-an-adapter-and-schema.md)
produces one from nothing, through the deep path or the scaffolder. [Add cairn to a SvelteKit
app](./add-cairn-to-a-sveltekit-app.md) produces one inside an app you already have. Neither of
those two pages assumes the other has run; everything past this point assumes one of them has.

## The deep path

- **[Build a site by hand](./build-a-site-by-hand.md)** — every file a working cairn site needs,
  written from nothing, for a developer who wants to own each one from the start.

## Building blocks

- **[Add cairn to a SvelteKit app](./add-cairn-to-a-sveltekit-app.md)** — the GitHub App, the three
  bindings, D1 provisioning, for an app that already exists.
- **[What the scaffold wrote](./what-the-scaffold-wrote.md)** — the generated file map, for a
  developer taking over a scaffolded site.
- **[Define an adapter and schema](./define-an-adapter-and-schema.md)**
- **[Declare your own concept](./declare-your-own-concept.md)**
- **[Configure rendering](./configure-rendering.md)**
- **[Wire the delivery surface](./wire-the-delivery-surface.md)**
- **[Link content with references](./link-content-with-references.md)**
- **[Reuse content across entries](./reuse-content-across-entries.md)**
- **[Add an island](./add-an-island.md)**
- **[Migrate existing content](./migrate-existing-content.md)**

## Admin surfaces

- **[Add a custom admin screen](./add-a-custom-admin-screen.md)**
- **[Organize your admin nav](./organize-your-admin-nav.md)**
- **[Restrict admin access](./restrict-admin-access.md)**
- **[Add a second audience](./add-a-second-audience.md)** — a second audience's own login and its
  own admin area, one journey.

## Design your site

- **[Design your site](./design-your-site.md)** — own the design and delivery surface, from the
  scaffold's starting theme through your own local iteration.

## Extend the publishing flow

- **[Enable tidy](./enable-tidy.md)**
- **[Announce on publish](./announce-on-publish.md)**
- **[Share a draft preview](./share-a-draft-preview.md)**
- **[Choose an AI posture](./choose-an-ai-posture.md)**

## Operate across versions

**The stability statement.** Every export carries one of three tiers: Extension API and Scaffold
API (the frozen contracts: adapter and schema constructors, the composed runtime, the single-mount
facade, the components a site mounts directly, and the wiring a scaffold writes into a consumer's
own files), and Unstable API (importable today, no promise across minors: the piecewise per-route
factories and advanced per-view components a site uses only when it recomposes routes by hand).
Full definitions and the per-page tier markers live in [the reference index](../reference/README.md#stability-tiers).

Read the tiers as the target discipline, not a guarantee already fully in force: cairn is still
`0.x`, and a documented seam has broken across a minor version more than once (`navLayout`'s own
types moved twice, at `0.86.0` and again at `0.94.0`, both inside the Extension API tier).
[Migration notes](./migration-notes.md) is the record of exactly which versions did this. Until
`1.0`, treat every version bump as a real upgrade to verify, tier or no tier, and read
[Upgrade cairn](./upgrade-cairn.md) for the actual bump-and-verify steps.

- **[Debug your site](./debug-your-site.md)** — a symptom whose fix is a code change.
- **[Rotate the GitHub App key](./rotate-the-github-app-key.md)**
- **[Upgrade cairn](./upgrade-cairn.md)** — bump, run the doctor, read what changed.
- **[Migration notes](./migration-notes.md)** — the per-version record of what changed.

## Concepts

The system's shape, for the reasoning behind a contract rather than the contract itself:

- **[Architecture](./architecture.md)**
- **[Content model](./content-model.md)**
- **[Security model](./security-model.md)**
- **[Auth channel security model](./auth-channel-security-model.md)**
- **[Render safety](./render-safety.md)**
- **[Data tiers](./data-tiers.md)**

## Vocabulary

Eight terms carry a precise meaning across this track and the reference. Nothing else here is
jargon to avoid; these eight are jargon to use precisely, defined once here:

- **Concept.** A first-class content kind your adapter declares under `content`, Posts and Pages by
  default, or one you declare yourself. A directory of markdown files plus a `fieldset`.
- **Adapter.** The one object your site's `cairn.config.ts` builds: the concepts you declare, the
  GitHub repository commits land on, your magic-link sender, and your `render` function. The
  engine reads everything it needs from this one seam.
- **Render.** Your markdown-to-HTML function, built with `createRenderer`. The admin's live preview
  and every public page call the same one, so there is exactly one way an entry's content ever
  looks.
- **Seam.** A documented extension point, a custom admin screen, an access map, a `navLayout` tree,
  the Backend interface, carrying a stability tier and a compatibility promise, as opposed to an
  internal detail a site is not meant to reach into.
- **Island.** An interactive Svelte component your `render` hydrates inside otherwise-static
  rendered output, declared through the `IslandRegistry`.
- **Holding branch.** Where a save waits, `cairn/<concept>/<id>`, one per entry, until a
  deliberate Publish copies its content onto the default branch and a site's own deploy pipeline
  takes it live.
- **Manifest.** The committed JSON index of the corpus, one row per entry, that the admin and the
  delivery layer read instead of crawling the whole repository through the GitHub API. A build
  regenerates and verifies it; a save patches its one changed row.
- **Role / capability.** A role is a name your site defines (`owner` and `editor` by default, or
  your own vocabulary through `defineRoles`); a capability is one of the three fixed levels every
  role resolves to (`none`, `editor`, `owner`) that the engine's own gates actually check.

## For site admins too

Three reference pages serve the admin track as much as this one: [`doctor`](../reference/doctor.md)
(what `create-cairn-site` runs to verify a deploy), [`log-events`](../reference/log-events.md) (the
vocabulary [debug your site](./debug-your-site.md) and [the admin's own
troubleshooting](../admin/troubleshooting.md) both key on), and
[`supported-toolchain`](../reference/supported-toolchain.md) (the Node and platform floor a bump
assumes). If you're the one who set the site up rather than the one extending it, [is it
working?](../admin/is-it-working.md) is the equivalent of this track's `upgrade-cairn`, and
[setup recovery](../admin/setup-recovery.md) is the equivalent of `debug-your-site` for a setup step
that stalled rather than a code bug.
