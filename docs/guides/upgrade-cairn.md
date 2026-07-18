# Upgrade cairn

To upgrade cairn you bump the version range, read the `Consumers must:` steps for the versions
you cross, and run your own gates. The [CHANGELOG](../../CHANGELOG.md) records those steps per
version; a version with no `Consumers must:` list is a drop-in bump.

## Upgrade

1. **Bump the version range.**

   ```sh
   npm install @glw907/cairn-cms@^0.79.0
   ```

2. **Read every `Consumers must:` list between your old version and the new one** in the
   [CHANGELOG](../../CHANGELOG.md). Each breaking release states its own list, so a run from
   `0.76.0` to `0.78.2` means reading `0.78.0`'s and `0.78.2`'s lists in order. A version
   with no `Consumers must:` list changed nothing you need to act on.
3. **Apply each listed change** to your adapter, your routes, or your `wrangler.jsonc`, as that
   version's list names.
4. **Run `npx cairn-doctor`** against your site. It catches a binding, a config key, or a
   dependency floor the new version now expects that your site hasn't caught up to yet. See the
   [`cairn-doctor` reference](../reference/doctor.md) for what it checks.
5. **Run your own site's build and test gate** before you deploy. cairn's gates only exercise
   the package. They can't reach your adapter, your `render`, or your routes, so run your own
   build and tests before you deploy.

## How cairn versions

cairn is `0.x`, and until it reaches `1.0`, the number tracks scale. A minor version means a new
subsystem or public surface; everything else is a patch, whether or not it breaks you. Whether a
version breaks your site is stated in its `Consumers must:` list, not signaled by the version
number. Check the exact number that's free to publish next with `npm view
@glw907/cairn-cms versions --json` rather than assuming the next one in sequence.

That scheme lasts only through `0.x`. At `1.0`, cairn moves to compatibility SemVer: a major
version signals a breaking change, and the number finally carries the compatibility promise the
`Consumers must:` line carries now. The beta that precedes `1.0` publishes under an npm `beta`
dist-tag as `1.0.0-beta.1`, iterating `-beta.N` and still carrying a `Consumers must:` line on
any bump that breaks something, until the `1.0.0` cut. `npm install @glw907/cairn-cms` keeps
resolving to the latest `0.x` release until then.

## When something breaks anyway

Only the latest published minor gets fixes. There's no backport branch, so check `npm view
@glw907/cairn-cms version` before assuming a bug is still open. If it's open, file a GitHub
issue against [`glw907/cairn-cms`](https://github.com/glw907/cairn-cms/issues) with the version,
what you expected, and what happened. Attach the structured log record if the failure logged
one. cairn's runtime emits one for every commit, auth, and guard failure: [Log
events](../reference/log-events.md) names each event and its fields, and [Read cairn's
logs](./read-cairn-logs.md) covers querying them on a deployed Worker.

## 0.87.2: honest image dimensions and srcset (non-breaking)

A drop-in bump. Rendered managed images now carry their intrinsic `width`/`height` when the
media manifest records them, and gain an honest `srcset`/`sizes` pair when the site's
`AssetConfig` declares `transformations: true`. No consumer action; a site that post-processes
rendered `<img>` HTML should expect the new attributes. The rest of the window is gate work
inside the repo (`check:invisible-craft` coverage, two live numeric probes).

## 0.87.1: the admin polish window (non-breaking at runtime)

The invisible-craft polish pass: about thirty look-preserving refinements across the admin,
the include line rendered as an atomic chip naming its fragment, the folded-container chip,
a preview-only boundary cue on spliced fragment content, the publish blast-radius line, and
a real fix—the login and confirm pages now honor the theme cookie, so a dark-mode editor
no longer gets a light login card. No consumer action at runtime. The one type-level note:
`AdminShellData`'s public variant now carries a required `theme` member. The engine produces
that value itself, so only a site constructing the public variant by hand in TypeScript
needs to add it; neither production site does.

## 0.87.0: fragments, and the embedded-routing promise enforced

A site can now declare the reserved `fragments` concept and reuse one piece of markdown across
entries with the editor's "Include a fragment" picker. See [Reuse content across
entries](./reuse-content-across-entries.md). Opting in is additive. One thing to check before
bumping: a concept declared `routing: 'embedded'` is now genuinely non-routable, so its entries
stop resolving through `byPermalink`, prerendering through `entries()`, and appearing in
`site.all()`. If an embedded concept's entries should have public URLs, declare
`routing: 'page'` instead. If they only ever served as references or includes, you have nothing
to change, and cairn stops serving the stray URLs.

## 0.86.0: `navLayout`, the whole-sidebar seam, and the widened `navFilter`

Sites now declare `navLayout` on the adapter's `editor` group to arrange the whole admin sidebar
as one tree, mixing cairn's own screens with their own; see [Organize your admin
nav](./organize-your-admin-nav.md). It's mutually exclusive with `adminNav`, and a site that
declares neither sees no change: the sidebar renders today's default arrangement through the same
resolver.

Consumers must: nothing, for a site that declares neither `navLayout` nor a custom `navFilter`. Two
narrower changes apply if you do:

- **`AdminShellData`'s authed arm reshapes**: `customNav`, `canManageEditors` (as a nav signal),
  and `navLabel` collapse into one `nav: ResolvedNavLayout` field. Update any code that reads
  `AdminShellData`'s fields directly (no known consumer does) to the new shape.
- **A declared `navFilter` widens**: it now receives the resolved sidebar's arranged top-level
  nodes (`ResolvedLayoutNode[]`, cairn's own screens included when you declare `navLayout`), not
  just your own custom `adminNav` entries, and returns the same shape. Widen the parameter and
  return type from `ResolvedNavItem[]` to `ResolvedLayoutNode[]`; a filter that only reads an
  item's `.label` needs no other change.

Desk routes (the entry editor) also persist the sidebar at `xl` and up instead of receding it at
every width; no action needed, this changes only what renders wider than 1280px.

## 0.85.0: site-declared role vocabulary and capability levels (non-breaking)

Sites now declare their own role vocabulary instead of the two names `'owner'` and `'editor'` the
engine used to hard-code. `defineRoles` on the adapter's new `roles` member maps each of your own
role names onto one of the engine's three fixed capability levels, `owner`, `editor`, or `none` (an
authenticated identity with no engine content access); a role can also declare a `home`, the
`/admin` route it lands on. A site that declares no `roles` gets the implicit `{ owner: 'owner',
editor: 'editor' }` pair, so this release changes nothing you'd notice.

Consumers must: nothing, for an existing site. To open a larger vocabulary, declare `roles` on your
adapter with `defineRoles`, apply the `0001_roles.sql` migration the engine ships in the package
once you introduce a role name outside `owner`/`editor` (see [Configure auth and
D1](./configure-auth-and-d1.md#provision-the-d1-database) for copying it out of `node_modules`),
and augment `CairnRolesRegister` in
your `app.d.ts` if you want `locals.editor.role` narrowed to your declared names. See [the roles
reference](../reference/core.md#roles) for the full contract and [Give a role its own admin
area](./give-a-role-its-own-admin-area.md) for the worked walkthrough.

## 0.84.3: the editor lifecycle rounded out (non-breaking)

Four editor changes, no consumer action. The Publish button now shows on every entry,
resting dimmed with "Nothing new to publish" until a typed edit, a saved draft, or a new
entry gives it something to take live (it used to appear only after a save). A new
entry opens with the title typed in the create dialog and its badge reads New instead of
Published. The spellchecker knows the standard English contractions and accepts curly
apostrophes from pasted prose.

Consumers must: nothing.

## 0.84.2: the admin hang after login fixed (non-breaking)

On roughly 0.77 and later, a cold Worker isolate could wedge the whole admin for 55 minutes:
the first admin request after login canceled an in-flight GitHub token mint, and the token
cache kept serving that dead promise to every later request. 0.84.2 caches only a successfully
minted token. If editors report the browser waiting forever right after a magic-link login,
this is that bug; upgrade and redeploy.

Consumers must: nothing.

## 0.84.1: the local-dev media fix completed (non-breaking)

0.84.0's local-dev claim shipped incomplete: a second serialization site
(`writeHttpMetadata` on the returned object) still failed every `/media` read under
`vite dev`. 0.84.1 completes it, verified end-to-end on a consumer checkout, and
`cairn-media-seed` now stores each object's `Content-Type`. Upgrade straight to 0.84.1.
The `devMediaFallback` deletion note below applies as of this version.

Consumers must: nothing. Re-run `npx cairn-media-seed` after upgrading if you seeded with
0.84.0, so the stored objects gain their content types.

## 0.84.0: `cairn-media-seed` and a media route that works under `vite dev` (non-breaking)

A new bin, `cairn-media-seed`, seeds wrangler's local R2 simulator with every media-library
object from a deployed site, so local design iteration sees real images. The media delivery
route now derives plain `onlyIf` and `range` options instead of passing a `Headers` instance,
which fixes the 500 every `/media` read hit under a consumer's `vite dev`. See [the reference
page](../reference/cli-cairn-media-seed.md) and [the local design-iteration
guide](./iterate-your-design-locally.md).

Consumers must: nothing. A site that carried a dev-only `/media` fallback middleware for the
`vite dev` bug can delete it after the bump; the route works locally without it.

## 0.83.0: a `publishActions` config renders next-step links on the publish-success moment (non-breaking)

A site declares next-step links for the publish-success moment through a new `publishActions`
entry on the adapter's `editor` group, the `adminNav` grammar applied after a publish: a plain
`{label, href}` list, `href` a template string substituted with the published entry's concept and
id, optionally filtered to specific concepts. The engine validates each entry when the runtime
composes, so a blank field or an unknown concept fails the build rather than rendering a broken
link. See [the publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam).

Consumers must: nothing. `publishActions` is opt-in; a site that declares none renders the
publish-success moment exactly as it renders today.

## 0.82.1

No consumer action. Behavior notes for upgraders: the admin shell's desktop sidebar is now
`position: fixed` (no more scroll drift, and it stays open when navigating to deep custom-nav
routes like `/admin/club/events`); `adminAction` no longer requires an audit emit from a handler
that returns SvelteKit's `fail()` before mutating (a handler that writes and then rejects must
still emit); the `/ambient` augmentation now types `App.Locals.auditSink`.

## 0.82.0

No consumer action required. The release adds the admin extension surface for sites that
build their own `/admin/` screens: the `admin-fields` subpath (`SelectField`, `TextField`,
`FieldLabel`), the `OfficeList` shell in `components`, the `adminAction` wrapper and the
per-request `navFilter` dependency in `sveltekit` (also reachable through `CairnAdminDeps`),
and one-level `adminNav` sections. All additive; existing sites build unchanged.

## 0.81.0

No consumer action required. The release adds the renderer's `remarkPlugins`/`rehypePlugins`
seam, default-on table scrolling (`tableScroll: false` opts out), sitemap `extraRoutes`,
`CairnHead`'s `titleTemplate`, and the chassis/theme example structure with three ported
example themes. All additive; existing sites build unchanged.


