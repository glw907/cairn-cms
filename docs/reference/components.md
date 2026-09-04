# Components (`@glw907/cairn-cms/components`)

This subpath holds the admin Svelte UI: the shell, the sign-in and confirm pages, the content list
and editor, the editors, nav, vocabulary, and welcome screens, and the dialogs and pickers those
compose. The canonical mount is one component: `CairnAdmin`, rendered from the catch-all
`/admin/[...path]` route, switches to the matching view. Every view `CairnAdmin` can render is
individually mountable here, so a site on the advanced per-route mounting reaches the same
component the single-mount facade would have rendered; `VocabularyAdmin` and `WelcomeView`
complete that seam. A general-purpose, domain-agnostic primitive lives on
[`/admin-toolkit`](./admin-toolkit.md) instead, even one this barrel's own screens compose
internally (`PageHeader`, `AdminTable`): this barrel carries the admin's own views and their
composed parts, not a reusable building block a site's custom screen would reach for on its own.
For the catch-all wiring, see
[the canonical admin mount](./admin-routes.md).

```ts
import { CairnAdmin } from '@glw907/cairn-cms/components';
```

Each component sets `data-theme="cairn-admin"` (or sits inside `CairnAdminShell`, which does), so the
Warm Stone admin theme ships as a CSS side effect of the import. The TypeScript prop types in
`src/lib/components` are the source of truth, and the export-coverage gate checks every name here
against them.

Anything built on this surface shares the shell and theme's design grammar: an emphasis ladder for
buttons and states, reserved semantic colors, a status-pill family, and a documented spacing scale.
A custom screen composed from these components and the theme's tokens uses the same tokens as the
built-in views. The shell composes its chrome at every width, and the components recompose rather
than squeeze, so a screen built from them adapts from phone to ultrawide without added per-screen
work.

---

## Page-level components

`CairnAdmin` is the one component the canonical mount renders. The view components after it are
what it switches between; a site on the advanced per-route mounting renders them directly against
the matching `/sveltekit` loads, and their snippets show that shape.

### `CairnAdmin`

Stability tier: Extension API.

```ts
let { data, form, render, registry, icons, previewMint }: {
  data: AdminData;
  form?: Record<string, unknown> | null;
  render?: SiteRender;
  registry?: ComponentRegistry;
  icons?: IconSet;
  previewMint?: boolean;
};
```

The single-mount admin page. Render it from the catch-all `/admin/[...path]` route with the
discriminated `AdminData` that `createCairnAdmin`'s load returns, and it switches `data.view` to
mount the right component: the sign-in and confirm pages, the list, edit, history, editors, and nav
views, and the `'welcome'` view, the calm signed-in screen a none-capability role with no declared
`home` lands on. It renders each view bare; the shared chrome rides the separate `/admin/+layout` shell
(see [`CairnAdminShell`](#cairnadminshell)), not `CairnAdmin`. The edit view reads its `siteName`
from `page.data.shell`. `form` forwards the route's action result to whichever view rendered, so a
blocked save reaches `EditPage` and a login outcome reaches `LoginPage` through the one prop.
`render`, `registry`, and `icons` come from the site's adapter and pass through to `EditPage` for
the preview, the insert palette, and the icon fields. `previewMint` forwards to `EditPage`, gating
whether its "Share preview" group renders (defaulting to `true` there when left unset); see
[`EditPage`](#editpage) below for the important caveat on what setting it to `false` does and does
not do. The showcase mounts it like this:

```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/components';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin {data} {form} render={cairn.rendering.render} registry={cairn.rendering.components} icons={cairn.rendering.icons} />
```

### `CairnAdminShell`

Stability tier: Extension API.

```ts
let { data, children, themeOverride }: {
  data: AdminShellData;
  children: Snippet;
  themeOverride?: 'cairn-admin' | 'cairn-admin-dark';
};
```

The exported admin chrome shell: the sidebar nav, the top bar, the command palette, and the content
slot. Mount it from a shared `/admin/+layout.svelte` so every `/admin/**` route, the engine's own
views and any custom screen a site adds, renders inside one chrome. `data` is the `AdminShellData`
the shell load (`/admin/+layout.server.ts`) returns.

`themeOverride` is the mounting seam a host outside a real admin session uses to own the shell's
theme outright: present, it wins over the shell's own resolution and suppresses both the reads that
resolution would otherwise make, the `cairn-admin-theme` cookie and the `prefers-color-scheme`
media query. It is reactive, so a host that pictures the shell in both themes updates the prop
rather than re-mounting the component. Absent, which every real admin mount leaves it, the shell
resolves its own theme exactly as it always has. Under an override the shell renders no theme
toggle at all, in the top bar or in `EditPage`'s own folded overflow control: neither reads nor
writes the theme the mounting host already owns, so there is no stray control that would flip the
shell's theme out from under the override.

`AdminShellData` is a discriminated union. A `{ public: true }` payload (the login and confirm pages)
renders the children bare with no chrome; an authed payload renders the full chrome from its
data-driven nav, user, theme, and streamed publish-all count. The discriminant gates the chrome, so a
public payload always renders bare.

The sidebar renders `data.nav`, one resolved [`ResolvedNavLayout`](./sveltekit.md#resolvednavlayout)
tree computed server-side for every site, a declared `navLayout` or, absent one, the flat
zero-config default: `nav.items` renders in order, a section through its own collapsible group
(keyed by label for the collapse cookie), a loose item as a plain list entry beside it. A site with
no declared `navLayout` gets no section at all, every item loose, since a zero-config sidebar never
reaches the size a category label earns back. `nav.fallback`, the engine screens the arrangement
never referenced, renders in the same foot band below the scroll area, Help alone in the
zero-config shape. Each item's icon resolves
from an engine screen id or a site entry's bundled icon name. See [the navLayout
seam](./sveltekit.md#the-navlayout-seam) for the full contract. For a none-capability
`user.capability` (the spec's none contract), `nav` carries no engine screen anywhere, in `items` or
`fallback`, since every engine screen refuses that session with a 403; a site's own `navLayout`
entries still render. The command palette lists every visible item in `nav`, section
children and the fallback group included, alongside its own view-site and theme-toggle commands.

At desktop widths the sidebar is persistent and scroll-independent (`position: fixed`, so it never
drifts with the page scroll), and it stays open across navigation. That includes navigation to a
site's own deep custom-nav routes like `/admin/club/events`. On an engine document-editor route (a desk route),
the sidebar persists again at `xl` (1280px and up), recedes to the toggle-controlled overlay through
the `lg`-`xl` tablet band (1024-1279px), where the editing surface takes priority on a narrower
screen, and keeps the overlay drawer below `lg` like every other route. On small viewports it's
always the overlay drawer, opened on demand and closed after a navigation.

```svelte
<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';

  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>

<CairnAdminShell data={data.shell}>
  {@render children()}
</CairnAdminShell>
```

An authed `AdminShellData` carries a `csrf` token alongside the chrome fields. `CairnAdminShell`
provides that token to its descendant forms through context, so an admin form inside the shell mounts
a bare `CsrfField` with no prop, and a custom `/admin/` screen's forms get the token the same way. See
[`CsrfField`](#csrffield) for the field itself.

When the authed payload's streamed pending set is non-empty, the topbar shows a "Publish site (N)"
button whose confirm dialog lists the held entries grouped by concept and posts the named
`?/publishAll` action to the absolute `/admin` catch-all. A null pending set (GitHub unreachable)
hides the button rather than showing a stale count.

**Attention pills.** `data.attention` (see [the attention seam](./sveltekit.md#the-attention-seam))
decorates a visible nav entry with a quiet count pill when its `href` carries a positive count; a
zero or absent count renders no pill at all, never a "0" one. A collapsed section's header shows
the sum of its visible children's own counts, computed from the same `data.attention` record the
leaf pills read, never a separate total, so the header sum and its children can never drift out of
sync; the header's pill disappears once the section opens (the item pills remain, since they carry
their own accessible names). Every count caps its display at `99+`. The count lives in the entry
link's accessible name ("Asset requests, 3 pending requests"), built from the item's `label`
(defaulting to "pending items"); the pill span itself is `aria-hidden`, so a screen reader
announces the count exactly once, through the link, not twice.

### `ConceptList`

Stability tier: Unstable API.

```ts
let { data }: { data: ListData };
```

The list screen for one content concept: the entries, the create form, and any inline errors. `data`
is the `ListData` from the list load. Each row carries a status badge from `entry.status`
(New, Edited, or Published), and an entry with `draft: true` carries a separate Hidden badge beside
it. A `?publishedAll=` redirect renders a "Published N entries." flash above the list. On the
per-route mounting it lives at `src/routes/admin/(app)/[concept]/+page.svelte`.

```svelte
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  import type { ListData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: ListData } = $props();
</script>

<ConceptList {data} />
```

### `CairnMediaLibrary`

Stability tier: Unstable API.

```ts
let { data, form }: { data: MediaLibraryData; form?: ContentFormFailure | null };
```

The admin Media Library screen, a peer of the concept lists at `/admin/media`. `data` is the
`MediaLibraryData` from `mediaLibraryLoad`: the unioned `assets`, the per-hash `usage` overlay, and
a degraded-load `error`. The resting surface is a visual contact-sheet grid (a roving-tabindex
listbox of tiles); a density toggle flips to an enriched sortable table. A toolbar row carries
search, a pick-one triage radiogroup (All, Needs alt, Unused), and the density toggle, with
client-side pagination over the full set. The single mount renders it for the `media` view inside
`CairnAdmin`. It has no per-route path `createContentRoutes` alone can wire: the load is public
(`mediaLibraryLoad`), but its actions (`?/mediaUpdate`, `?/mediaDelete`, and the rest of the
janitorial vocabulary below) are not members of `createContentRoutes`'s public return, so wiring
`src/routes/admin/(app)/media/+page.server.ts` by hand against that factory alone leaves those
posts with no matching action. [`createCairnAdmin`](./sveltekit.md#createcairnadmin) is the only
public seam that mounts them at runtime; its declared `CairnAdminRoutes` contract withdraws the
same ten actions at the type level (recovered with a spread or a cast; see the note after the
actions table in [the SvelteKit reference](./sveltekit.md#createcairnadmin)). Mounting this
component outside the single mount means composing your own `actions` record around
`createCairnAdmin`'s runtime object (see [Per-route mounting
(advanced)](./admin-routes.md#per-route-mounting-advanced)).

Activating a tile or row opens a non-modal detail slide-over: a labelled region (not a dialog), so
the library stays live behind it. It holds the large preview, the `media:` reference with a copy
button, an alt editor and a rename posting together to `?/mediaUpdate`, the where-used list grouped
published-then-branch with a link to each entry's editor, the metadata, and a Delete action. Escape
closes the slide-over and returns focus to the originating tile or row. Delete opens a two-faced
safe-delete alertdialog (a native modal `<dialog>` with no light dismiss): the in-use face names
the breaking entries and gates Delete behind a typed-slug confirmation, the orphan face is a calm
confirm, and both post to `?/mediaDelete`. `form` carries the last media action's result, so a
`MediaDeleteRefusal` re-opens the in-use face on its fresh breaking list and a `MediaUpdateFailure`
surfaces in the slide-over.

```svelte
<script lang="ts">
  import { CairnMediaLibrary } from '@glw907/cairn-cms/components';
  import type { MediaLibraryData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: MediaLibraryData } = $props();
</script>

<CairnMediaLibrary {data} />
```

### `EditPage`

Stability tier: Unstable API.

```ts
let { data, registry, render, icons, form, previewMint = true, spellcheckOverride }: {
  data: EditData & { siteName: string };
  registry?: ComponentRegistry;
  render?: SiteRender;
  icons?: IconSet;
  form?: ContentFormFailure | null;
  previewMint?: boolean;
  spellcheckOverride?: boolean;
};
```

The single-entry editor. `data` is the `EditData` from the edit load, merged with the site name.
`registry`, `render`, and `icons` come from the site's adapter: `render` powers the Preview tab,
`registry` drives the Insert block dialog, and `icons` feeds the guided form's icon fields. `form`
carries the last content action's failure as a `ContentFormFailure` (always with its `error`
summary), so a blocked save re-renders the author's edits and the broken links to fix. On the
per-route mounting it lives at `src/routes/admin/(app)/[concept]/[id]/+page.svelte`.

**`previewMint` is presentational only.** It gates whether the details sidebar's "Share preview"
group renders at all (spec part 3, "Public preview for a non-editor"): the mint and revoke controls,
the minted-link display, and the expiry line. Setting it to `false` hides that group from the
markup. It does **not** turn off the underlying `previewMint`/`previewRevoke` facade actions
(`previewMintAction`/`previewRevokeAction`, [SvelteKit](./sveltekit.md#public-preview)), which stay
mounted and carry their own full entry-scoped authorization regardless of whether this component
offers any button that posts to them. Hiding the group is a product choice about what an editor
sees on this screen, never an access-control decision: a site that wants a role unable to mint a
preview link at all should restrict the concept in its [access map](./core.md#access-map) instead.

`spellcheckOverride` is the mounting seam a host outside a real editing session uses to own the
spellcheck posture outright (the reproductions seam mounts several editing surfaces on one docs
page, where the spellcheck Worker and its wasm and dictionary fetches would otherwise run for
every one of them). Present, it wins over the author's stored per-browser preference; `false` opens
an editor that never starts the spellcheck Worker or fetches its wasm and dictionary. It also hides
the footer's Spellcheck chip and its overflow-menu equivalent below the `sm` breakpoint, rather than
leaving a control that carries no effect. Absent, which every real editing session leaves it, the
author's own stored preference and the footer toggle decide exactly as before.

The page lays out in four zones. A sticky translucent header holds a breadcrumb back to the
concept list, the entry's status badge (New, Edited, or Published, with a separate Hidden badge
when the frontmatter `draft` flag is set), a save-state indicator reading "Unsaved changes" while
the browser holds edits and "Saved" after a save lands, an overflow menu with a History link to
`/admin/<concept>/<id>/history` ([`CairnHistory`](#cairnhistory)), Delete, and, while
`data.pending`, Discard changes, and the lifecycle buttons rightmost: an outline Publish posting
to `?/publish` (rendered only while `data.pending`) and a solid Save, which sleeps while an
existing entry is clean. Both buttons sit outside the form element and tie to it through
`form="cairn-edit-form"`.

The editor column is one card holding the formatting toolbar, the CodeMirror surface, and a footer
with the word count and a Markdown help cheat sheet. When the adapter's schema declares a `title`
field, that field leaves the sidebar and renders above the card as a large borderless
document-title input. The toolbar carries an Edit block control beside Insert
block: it enables when the caret sits inside a registered component whose markdown round-trips
through the guided form losslessly, and re-opens that block into the form for editing, writing the
result back over its source span. It stays disabled with a plain reason when the caret is outside any
component or the block cannot round-trip (edit that one as markdown). The toolbar's Write/Preview
segmented tabs swap the editing surface for the rendered preview inside the same card, and the
formatting and insert controls disable while Preview shows. The preview renders inside a sandboxed iframe whose document links the site's own
stylesheets from the adapter's `preview` knob (`data.preview`), so the entry proofs in the site's
real styling without the site CSS touching the admin document; without the knob the frame renders
unstyled markup behind a one-line hint. While Preview shows, the sidebar hides and the card takes
the full content width, and a device trigger beside the Preview tab picks the frame width
(Desktop, Tablet, Phone, or Small phone), persisted per browser under the
`cairn-editor-preview-device` localStorage key.

The sidebar groups the remaining fields under three headings: Details (every other field),
Visibility (a boolean field named `draft` renders here as the Hidden toggle), and Address (the
read-only `/slug` beside a Change URL button opening the rename dialog). One feedback strip
directly under the header renders the transient flash after a save, publish, discard, or rename
redirect. The discard confirm's copy branches on `data.published`: discarding an Edited entry
restores the live version, and discarding a New one deletes the entry.

The page tracks dirtiness across the body and the sidebar fields. Leaving with unsaved edits asks
for confirmation, through a `beforeunload` prompt and a SvelteKit navigation guard, and Ctrl/Cmd+S
submits the save. Ctrl/Cmd+B and Ctrl/Cmd+I format the selection, and Ctrl/Cmd+K opens the
web-link dialog.

```svelte
<script lang="ts">
  import { EditPage } from '@glw907/cairn-cms/components';
  import type { EditData } from '@glw907/cairn-cms/sveltekit';
  import { cairn, siteConfig } from '$lib/cairn.config.js';

  let { data }: { data: EditData } = $props();
</script>

<EditPage
  data={{ ...data, siteName: siteConfig.siteName }}
  render={cairn.rendering.render}
  registry={cairn.rendering.components}
  icons={cairn.rendering.icons}
/>
```

### `CairnHistory`

Stability tier: Unstable API.

```ts
let { data }: { data: HistoryData };
```

The per-entry publish-history screen, reachable from `EditPage`'s overflow menu. `data` is the
`HistoryData` from `historyLoad`. A version is a publish: the table lists the entry's recent
publishes newest first, the top row marked Current when it's the version live on the default
branch right now. A synthetic Draft row pins above the list when the entry carries an open pending
branch; it carries no revert affordance, since a draft isn't itself a publish. When `truncated` is
set, a meta line under the "Recent versions" heading reads "Showing the most recent 25 versions."
An entry with no publish yet and no open draft renders an empty state instead of the table. On the
per-route mounting it lives at `src/routes/admin/(app)/[concept]/[id]/history/+page.svelte`.

Each publish row's own Revert button submits a small form to `?/revert`, carrying two hidden
fields: `ref`, the row's full commit sha, and `head`, `data.head`, the default branch's head sha
this page rendered against. `revertAction` re-validates both against a fresh read, so the form
carries only what the server needs to catch a stale page, never a trust of the rendered row.

```svelte
<script lang="ts">
  import { CairnHistory } from '@glw907/cairn-cms/components';
  import type { HistoryData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: HistoryData } = $props();
</script>

<CairnHistory {data} />
```

### `LoginPage`

Stability tier: Unstable API.

```ts
let { data, form }: {
  data: { siteName: string; error: string | null; csrf: string };
  form: { sent?: boolean; status?: 'sent' | 'send_error' | 'throttled' } | null;
};
```

The magic-link request screen. `data` carries the site name, an optional error, and the `csrf`
double-submit token the page renders into its form. A `sent` status (or the legacy `form.sent`
boolean) flips the page to the check-your-email state; `send_error` renders a warning that links
cannot be sent right now, and `throttled` renders a check-your-inbox hint, both above the form so
the editor can retry. The request form posts the named `?/request` action; on the per-route
mounting, register `requestAction` under that name in the unauthed
`src/routes/admin/login/+page.server.ts`.

```svelte
<script lang="ts">
  import { LoginPage } from '@glw907/cairn-cms/components';

  let { data, form } = $props();
</script>

<LoginPage {data} {form} />
```

### `ConfirmPage`

Stability tier: Unstable API.

```ts
let { data }: { data: { token: string; siteName: string; error: string | null; csrf: string } };
```

The sign-in confirm screen reached from a magic link. `data` carries the token to POST back, the
site name, an optional error for an invalid or expired link, and the `csrf` double-submit token the
page renders into its confirm form. The confirm form posts the named `?/confirm` action; on the
per-route mounting it lives at `src/routes/admin/auth/confirm/+page.svelte` against the confirm
load and a `confirm`-named action.

```svelte
<script lang="ts">
  import { ConfirmPage } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<ConfirmPage {data} />
```

### `ManageEditors`

Stability tier: Unstable API.

```ts
let { data, form }: {
  data: { editors: Editor[]; self: string; error: string | null; vocabulary: { role: string; capability: Capability }[] };
  form: { error?: string; ok?: boolean } | null;
};
```

The owner-only editors screen: the allowlist and the add, remove, and role-flip actions.
`data.editors` is the current allowlist and `data.self` is the acting owner's email, which the
anti-lockout guard uses. `data.vocabulary` is the site's declared [role vocabulary](./core.md#roles),
each name paired with its resolved capability; with the default owner/editor pair the role
control renders today's toggle unchanged, and with any larger or differently shaped vocabulary it
renders a labeled select listing every declared role with its capability shown alongside, and an
owner-capability row's badge distinguishes it from an editor- or none-capability one. `form`
carries the last action's result. Its forms post the named `?/editorAdd`, `?/editorRemove`, and
`?/editorSetRole` actions, the names `createCairnAdmin`'s actions record defines; `editorSetRole`
rejects a posted role outside the vocabulary as a form validation error. On the per-route mounting it lives
at `src/routes/admin/(app)/editors/+page.svelte` against the editors load and actions, registered
under the same names.

```svelte
<script lang="ts">
  import { ManageEditors } from '@glw907/cairn-cms/components';

  let { data, form } = $props();
</script>

<ManageEditors {data} {form} />
```

### `NavTree`

Stability tier: Unstable API.

```ts
let { data, form }: { data: NavLoadData; form?: ContentFormFailure | null };
```

The drag-to-reorder navigation editor. `data` is the `NavLoadData` from the nav load (the menu
metadata, the current tree, the page options, and the feature flags). Saving posts the named
`?/save` action, which commits the rebuilt nav to the site config; `form` carries a refused save's
`ContentFormFailure`, so a stale-edit reload or a rejected tree reapplies its message. On the
per-route mounting it lives at `src/routes/admin/(app)/nav/+page.svelte` against the nav load and a
`save`-named action.

```svelte
<script lang="ts">
  import { NavTree } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<NavTree {data} />
```

---

### `CairnTidySettings`

Stability tier: Unstable API.

```ts
let { data, form }: { data: SettingsData; form?: ContentFormFailure | null };
```

The two-tier tidy settings screen. `data` is the `SettingsData` from the settings load: the
read-only developer-tier facts (whether tidy is enabled, whether the API key is configured, and the
model), the truthful gate flag, and the resolved editor-tier `conventions`. The editor tier (the
per-convention check-and-tint toggles and the radiogroup variant choosers) renders only when tidy is
enabled and the key is present; otherwise the screen shows the honest gate note with no disabled
controls. Saving posts the named `?/settingsSave` action, which commits the conventions block to the
same committed site-config YAML the nav editor writes; `form` carries a refused save's
`ContentFormFailure`, so a stale-edit reload or a rejected conventions block reapplies its message.

```svelte
<script lang="ts">
  import { CairnTidySettings } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<CairnTidySettings {data} />
```

### `HelpHome`

Stability tier: Unstable API.

```ts
let { data }: { data: HelpData };
```

The Help home screen, the screen an author visits for getting-started progress and reference
material. `data` is the
`HelpData` from the help load: the getting-started progress derived from the committed manifest and
the open edit branches, the markdown reference rows, and the support contact. It renders the
masthead, a derived getting-started checklist (it drops away once the author finishes all three steps,
and hides per device on request), the formatting reference, and the support hand-off. `supportContact`
defaults to cairn's own hosted editor help, an adapter value overrides it, and an adapter value set to
an explicit empty string suppresses the hand-off, the self-serve state. It mounts inside
`CairnAdminShell`, so it carries no theme wrapper of its own.

```svelte
<script lang="ts">
  import { HelpHome } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<HelpHome {data} />
```

### `VocabularyAdmin`

Stability tier: Unstable API.

```ts
let { data, form }: { data: VocabularyLoadData; form?: ContentFormFailure | null };
```

The tag-vocabulary admin screen ("Tags"). `data` is the committed vocabulary, the per-value
cross-branch usage count, and the in-use-but-unlisted seed set, from the vocabulary load. It adds
a tag (a typed label derives its slug `value` live), renames a tag's label (the `value` slug stays
immutable once created), removes a zero-usage tag (a guarded, disabled control for an in-use one,
naming the count), and seeds the working copy from tags already on posts but absent from the
vocabulary. `form` carries a refused post's `ContentFormFailure`: a stale-edit reload, a rejected
add or rename, or the in-use delete refusal. A `role="status"` live region narrates the last
mutation. It mounts inside `CairnAdminShell` on `PageHeader` for its header band.

```svelte
<script lang="ts">
  import { VocabularyAdmin } from '@glw907/cairn-cms/components';
  import type { VocabularyLoadData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: VocabularyLoadData } = $props();
</script>

<VocabularyAdmin {data} />
```

### `WelcomeView`

Stability tier: Unstable API.

```ts
let { data }: { data: WelcomeData };
```

The calm, minimal signed-in screen a none-capability role with no declared `home` lands on at the
admin root. `data` carries the account's `displayName` and the site's `siteName` for the greeting
and standing line. It renders on the admin toolkit's `EmptyState`, passing `headingLevel="h1"`
since this screen renders no `PageHeader` of its own, so the greeting is the page's only heading.
It mounts inside `CairnAdminShell`, so it carries no theme wrapper or CSS of its own.

```svelte
<script lang="ts">
  import { WelcomeView } from '@glw907/cairn-cms/components';
  import type { WelcomeData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: WelcomeData } = $props();
</script>

<WelcomeView {data} />
```

---

## Composed components

`MarkdownEditor` is the authoring seam, documented as a standalone bare surface a
site can mount directly. `DeleteDialog` and `RenameDialog` mount inside `EditPage` but stay public
for a site that builds its own per-route admin surface, pairing with the same load/action names
`EditPage` uses. The snippets are minimal mounts with the real prop names.

### `MarkdownEditor`

Stability tier: Extension API for its stable props below; every other prop is `EditPage`
wiring, [documented separately as `Unstable API`](#markdowneditor-wiring-props-unstable-api).

```ts
let { value = $bindable(), name, registerEditor, completionSources = [], focusMode = false, typewriter = false, surface = 'prose', spellcheck = true, spellcheckDictionary = 'dictionary-en-us.txt', siteDictionary = [] }: {
  value: string;
  name: string;
  registerEditor?: (api: EditorApi | null) => void;
  completionSources?: CompletionSource[];
  focusMode?: boolean;
  typewriter?: boolean;
  surface?: 'prose' | 'markup';
  spellcheck?: boolean;
  spellcheckDictionary?: string;
  siteDictionary?: ReadonlyArray<string>;
};
```

The bare CodeMirror editing surface behind the `MarkdownEditor` seam, and cairn's authoring seam:
this is the frozen stable contract a site mounting the component directly can depend on across
minors. `value` is bindable, so the parent reads edits back; `name` is the hidden field the value
mirrors to for form submit. `registerEditor` hands the parent the buffer-scoped
`EditorApi` once, on mount (its member grammar is below): every editor capability (insert, selection, format,
undo, tidy, image placeholders, and the rest) is a member of that one object, which replaces the
13 retired `register*` props (11 per-capability callbacks plus the two object grants,
`registerTidy` and `registerImagePlaceholders`). `registerEditor` also delivers `null` once, from
the real `onDestroy` teardown, revoking the grant. A host holding one `editor` reference, rather
than a capability per callback, should null it out only when the revoked value is the one it still
holds, a reference compare, so an out-of-order destroy from a superseded `{#key}` instance never
clobbers a newer, already-live grant. `completionSources` wires generic CodeMirror
autocomplete, such as the internal-link source. `focusMode` fades every paragraph except the
caret's, and `typewriter` keeps the caret line vertically centered while typing. `surface` picks
the posture: `prose` (the default) sets a 72ch centered measure at a larger type step, `markup`
fills the pane densely for tables and directives. `spellcheck` turns the markdown-aware lint
underlines on (the default) or off, reconfiguring the lint compartment to empty and idling the
Worker while off. `spellcheckDictionary` names the dialect-resolved dictionary file (for example
`dictionary-en-us.txt`) the source resolves to a real asset URL and hands to the spellcheck
Worker's init. `siteDictionary` seeds the Worker's personal layer with the committed
personal-dictionary words at init, so a word another editor committed answers correct from the
first lint. All are plain reactive props, so the host owns any toggle persistence (`EditPage`
persists the writing-mode toggles per browser). CodeMirror loads only in the browser, so this
component is client-only.

The component renders no toolbar and no card chrome of its own; the host frames it. `EditPage`
composes it inside the editor card with the engine's toolbar. A site mounting `MarkdownEditor`
directly gets the plain surface and supplies its own controls through `EditorApi`'s `format`
member, since the engine's toolbar component is internal and not exported here. The surface ships
as a quiet writing surface: the self-hosted iA Writer Mono face on a centered measure, stepped
heading sizes, dimmed syntax markers, GFM parsing, depth-stepped rails on `:::` directive
machinery with a plain-language hover hint.

```svelte
<MarkdownEditor bind:value={body} name="body" registerEditor={(api) => (editor = api)} />
```

#### `EditorApi` (the `registerEditor` grant)

The buffer-scoped editing surface `registerEditor` hands the host on mount, once per mounted
editor: every capability, insertion, selection, view, history, and the format/tidy/image-placeholder
subsystems, is a member of that one object, since the host is always `EditPage`, which always
needed the whole thing anyway.

| Member | Type | What it does |
| --- | --- | --- |
| `insert` | `(text: string) => void` | Inserts text at the cursor. |
| `insertLink` | `(href: string, title: string) => void` | Inserts an inline link at the current selection. |
| `insertImage` | `(alt: string, ref: string) => void` | Inserts an inline `![alt](media:slug.hash)` image at the caret. |
| `replaceRange` | `(from: number, to: number, text: string) => void` | Overwrites a document span with new text and drops the caret after it. |
| `getSelection` | `() => string` | Returns the selected text. |
| `getSelectionRange` | `() => { from: number; to: number } \| null` | Returns the selection's document offsets, or `null` for a bare caret. |
| `selectRange` | `(from: number, to: number) => void` | Selects a document span, focuses the surface, and scrolls it into view. |
| `caretCoords` | `() => { left: number; right: number; top: number; bottom: number } \| null` | Returns the caret's viewport coordinates, or `null` before mount or when unmeasurable. |
| `focus` | `() => void` | Returns focus to the editor surface. |
| `undo` | `() => void` | Undoes the last editor transaction. |
| `format` | `(kind: FormatKind) => void` | Applies a named selection transform such as `bold`, `italic`, `h2`, `ol`, `codeblock`, or `table`. |
| `tidy` | `TidyApi` | The tidy apply API (`enter`, `acceptOne`, `rejectOne`, `acceptMany`, `rejectAll`, `exit`) driving the review surface's in-buffer decorations and its accept/reject state machine. |
| `imagePlaceholders` | `ImagePlaceholderApi` | The optimistic-placeholder API (`begin`, `progress`, `resolveTo`, `cancel`) that drives the upload loop's in-flight thumbnail and determinate progress, with no document text written until the upload resolves. |

`/components` exports `TidyApi`, `ImagePlaceholderApi`, and `FormatKind` by name, since a caller that
types a held `EditorApi` grant needs its `tidy`, `imagePlaceholders`, and `format` members named, not
just reachable through property access.

| Name | Stability | Meaning |
| --- | --- | --- |
| `TidyApi` | Extension API | The `tidy` member's type, the tidy apply API from the preceding table. Its `enter` parameter is a `Change` list, and `Change` carries no export row of its own: a caller that needs its shape reaches it as `Parameters<TidyApi['enter']>[0][number]`. |
| `ImagePlaceholderApi` | Extension API | The `imagePlaceholders` member's type, the optimistic-placeholder API from the preceding table. |
| `FormatKind` | Extension API | The `format` member's parameter type, the selection-transform name union. |

#### `MarkdownEditor` wiring props (Unstable API)

Stability tier: Unstable API.

`EditPage`'s own wiring, exposed on the component because `EditPage` composes `MarkdownEditor`
rather than wrapping it, with no stability promise across minors: a site that reaches past
`EditPage` for one of these should expect it to move or change shape. `onComponentAtCaret` and
`onMediaImageAtCaret` are the round-trip editing seams (the figure control writes back through
`EditorApi.replaceRange`); the media seams (`mediaLibrary`, `onImageIngest`) support the insert
popover and the figure control.

| Prop | Type | What it does |
| --- | --- | --- |
| `onImageIngest` | `(file: File) => void` | Fires with the first image file of a paste or drop onto the surface. The host opens the capture card with the bytes. |
| `mediaLibrary` | `Record<string, MediaLibraryEntry>` | The per-asset projection the source decoration reads to render a `media:` token as a thumbnail chip. |
| `fragmentTitles` | `Record<string, string>` | The published fragment titles the `include:` source decoration resolves a `::include{fragment="id"}` chip's label against, keyed by fragment id. A resolved include line always chips; an id absent from this map falls back to naming the chip from the raw id. |
| `onComponentAtCaret` | `(info: { name: string \| null; markdown: string; from: number; to: number } \| null) => void` | Reports the directive container under the caret whenever it changes: the opening directive's `name`, the block's `markdown`, and the document character offsets (`from`, `to`) of its inclusive line range, or `null` when the caret sits outside any container. The host resolves that block against the registry to offer an Edit-block control. |
| `onMediaImageAtCaret` | `(info: FigureAtImage \| null) => void` | Reports the media image under the caret whenever it changes: the inner `![alt](media:slug.hash)` token's exact source offsets, plus the enclosing `:::figure` block (its range, raw caption, and placement role) when the image is wrapped, or `figure: null` when it is bare, or `null` when the caret is not on a media image. The host opens the figure control over it to wrap, edit, or unwrap a figure, writing the source through `EditorApi.replaceRange`. |
| `pendingAdditions` | `Set<string>` | The caller-owned pending personal-dictionary additions set. `EditPage` commits it through the save-time dictionary action and reconciles it against the merged response. |
| `spellcheckTest` | `{ createWorker?: () => SpellWorker; assumeReady?: boolean }` | A test-only seam for the spellcheck Worker (the real wasm and dictionary assets do not load under the component test runner). Never set this outside a test; documented-unstable, and pinned there rather than joining the stable snippet above. |
| `tidyMode` | `boolean` | Makes the surface read-only while a tidy review is open, the way Preview disables the toolbar, so the author cannot edit underneath a pending review. |
| `onDiagnosticsCounts` | `(counts: DiagnosticCounts) => void` | Reports the settled spelling and style diagnostic counts on the same debounced cadence as the diagnostics-summary announcer. |
| `foldOnMount` | `boolean` | Folds every component block the moment the surface mounts. `EditPage` turns this on so an entry opens with its blocks collapsed; off by default. |
| `registry` | `ComponentRegistry` | The site's component registry. The fold pill and the gutter fold control resolve a folded block's directive name through it, reading its human `label` (falling back to the raw directive name) and the matched component's `use` line for the pill's tooltip. |

### `DeleteDialog`

Stability tier: Unstable API.

```ts
let { conceptId, id, singular, inboundLinks, inboundKind = 'link', pending = false, trigger = true, onsubmitting }: {
  conceptId: string;
  id: string;
  singular: string;
  inboundLinks: InboundLink[];
  inboundKind?: 'link' | 'include';
  pending?: boolean;
  trigger?: boolean;
  onsubmitting?: () => void;
};
```

A confirm dialog that deletes one entry, with a guard that blocks the delete while other entries
link to it. `conceptId` and `id` identify the entry and post with the confirm, `singular` names the
entry's own concept in the singular for the title and confirm prompts, for example "Post," and
`inboundLinks` is the list of entries that link here. A non-empty list shows the linkers and blocks
the delete until they are repointed; `inboundKind` picks the blocked copy family, "link" (the
default) for an entry other entries link to, "include" for a fragment the listed entries include.
Pass `pending` for an entry with unpublished edits; the confirm
copy then warns that those edits are discarded too, since the delete cascades to the entry's pending
branch. With `trigger={false}` the component renders only the dialog, no visible button, and the
exported `open()` method shows it; `EditPage`'s overflow menu drives it that way. `onsubmitting`
fires when the confirm form submits, before the document navigates; `EditPage` uses it to stand down
its unsaved-changes guard. `EditPage` composes it.

```svelte
<DeleteDialog conceptId="posts" id="2026-06-04-hello" singular="Post" inboundLinks={[]} />
```

### `RenameDialog`

Stability tier: Unstable API.

```ts
let { conceptId, id, singular, slug, trigger = true, onsubmitting }: {
  conceptId: string;
  id: string;
  singular: string;
  slug: string;
  trigger?: boolean;
  onsubmitting?: () => void;
};
```

A confirm dialog that renames one entry's slug. `conceptId` and `id` identify the entry and post
with the confirm, `singular` names the entry's own concept in the singular for the title and the
non-routable "Entries that include this X" copy (for example "Post"), and `slug` prefills the
input with the current slug. With `trigger={false}` the component renders only the dialog, no
visible button, and the exported `open()` method shows it. The sidebar's Change URL button drives
it that way. `onsubmitting` fires when the rename form submits, before the document navigates.
`EditPage` uses it to stand down its unsaved-changes guard, and composes it.

```svelte
<RenameDialog conceptId="posts" id="2026-06-04-hello" singular="Post" slug="hello" />
```

### `CsrfField`

Stability tier: Extension API.

```ts
let { token }: { token?: string };
```

A hidden double-submit field that every admin form carries so the guard's CSRF check passes. Pass
`token` directly, the way `LoginPage` and `ConfirmPage` do from their load data. Omit it inside the
authed shell, where `CairnAdminShell` provides the token through context and the field reads it from
there, which is also how a custom `/admin/` screen's forms get the token. A form that renders no
`CsrfField` fails the guard's token check, which is the intended
fail-closed signal. `EditPage`, `DeleteDialog`, `RenameDialog`, and the other authed admin forms
compose it.

The field's token survives a native form reset, the one `use:enhance` fires by default after a
successful submit: a hidden `<input>`'s `value` and `defaultValue` reflect the same underlying
`value` attribute, so the component sets `defaultValue` as a DOM property alongside `value`,
pinning that reflection explicitly rather than leaving it to Svelte's own hydration-time
default-management machinery. Hardening, not a behavior a consuming form has to opt into or a new
guarantee a test independently proves; the component carries it on its own.

```svelte
<CsrfField {token} />
```

---

## Public preview

`PreviewBanner` is the one exception to this barrel's admin-only membership rule: a design-agnostic
component for a page a site's own visitors reach, not the admin. See [Public
preview](./sveltekit.md#public-preview) for the `previewLoad` seam it pairs with, and [Share a
draft preview](../extend/share-a-draft-preview.md) for the full walkthrough.

### `PreviewBanner`

Stability tier: Extension API.

```ts
let { preview, formatExpiry }: { preview: PreviewData['preview']; formatExpiry?: (iso: string) => string };
```

A status notice for a shared preview link, driven only by the `preview` field
[`previewLoad`](./sveltekit.md#previewload) adds to its data. It renders one of two states and
nothing else: no fetch, no internal state, no interactivity. `state: 'draft'` names the expiry so
the holder knows the link ages out; `state: 'published'` reports only that the preview has ended,
since a discarded edit and a published entry both reach this state and the copy must never claim
the draft went live (false for the discard case). It links the live permalink when `preview.published`
is set, and renders no link when it's `null` (a discarded new entry, which never had a live page).
A site may ignore this component entirely and render its own banner from the same metadata; this is
only the default treatment a getting-started site mounts.

The expiry renders inside a `<time datetime>` element, formatted by default as a fixed,
locale-independent `YYYY-MM-DD HH:MM UTC` string rather than the visitor's own locale: the same
formatter runs during SSR and hydration, so a Worker whose runtime locale or timezone differs from
the browser's own cannot render two different strings and cause a hydration mismatch. Pass the
optional `formatExpiry` prop to render the expiry in a site's own fixed date vocabulary instead.

The four custom properties the component's default palette reads
(`--cairn-preview-bg`/`-fg`/`-border`/`-link`) are the site-override seam: they fall back to
literal light- and dark-mode colors switched only by `prefers-color-scheme`, the OS-level signal.
A site that themes by its own toggle (a `data-theme` attribute, a class) declares all four in its
own light root and in both its `prefers-color-scheme: dark` and its own dark selector, so the
banner follows the toggle rather than the OS preference; see [Override the banner's
palette](../extend/share-a-draft-preview.md#override-the-banners-palette) for a worked example.

```svelte
<script lang="ts">
  import { PreviewBanner } from '@glw907/cairn-cms/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
```

## Hydrate and the island boundary

A directive component can opt into client hydration with `hydrate?: boolean | 'visible'` on its
[`defineComponent`](./core.md#definecomponent) declaration. With it set, the render pipeline wraps the
component's `build()` output in an island boundary, and the live Svelte component the site registers
under the same name on [`rendering.islands`](./core.md#renderingislands-adapter-member) mounts over that
fallback in the browser. `true` mounts the island eagerly on first load and after every client-side
navigation; `'visible'` defers the mount to first intersection. The `build()` output becomes the no-JS
fallback, so make it class-driven (the sink guard strips inline `style`) and high-fidelity (it is first
paint, and a size mismatch shifts the layout on mount).

The admin editor renders a hydrate component's fallback in its preview, never the live island: the
preview frame is sandboxed, so the runtime never mounts there. The full surface, the boundary DOM
contract, and the props trust boundary live on the [islands reference](./islands.md).
