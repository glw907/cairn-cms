# Components (`@glw907/cairn-cms/components`)

This subpath holds the admin Svelte UI. It spans the layout shell, the sign-in and confirm pages,
the content list and editor, the editors and nav screens, and the dialogs and pickers those
compose. The canonical mount is one component: `CairnAdmin`, rendered from the catch-all
`/admin/[...path]` route, switches every view for you. The per-view components below it stay
public as the advanced seam for a site that mounts routes by hand. For the catch-all wiring, see
[the canonical admin mount](./admin-routes.md).

```ts
import { CairnAdmin } from '@glw907/cairn-cms/components';
```

Each component sets `data-theme="cairn-admin"` (or sits inside `CairnAdminShell`, which does), so the
Warm Stone admin theme ships as a CSS side effect of the import. The TypeScript prop types in
`src/lib/components` are the source of truth, and the export-coverage gate checks every name here
against them.

---

## Page-level components

`CairnAdmin` is the one component the canonical mount renders. The view components after it are
what it switches between; a site on the advanced per-route mounting renders them directly against
the matching `/sveltekit` loads, and their snippets show that shape.

### `CairnAdmin`

Stability tier: Extension API.

```ts
let { data, form, render, registry, icons }: {
  data: AdminData;
  form?: Record<string, unknown> | null;
  render?: SiteRender;
  registry?: ComponentRegistry;
  icons?: IconSet;
};
```

The single-mount admin page. Render it from the catch-all `/admin/[...path]` route with the
discriminated `AdminData` that `createCairnAdmin`'s load returns, and it switches `data.view` to
mount the right component: the sign-in and confirm pages, and the list, edit, editors, and nav
views. It renders each view bare; the shared chrome rides the separate `/admin/+layout` shell
(see [`CairnAdminShell`](#cairnadminshell)), not `CairnAdmin`. The edit view reads its `siteName`
from `page.data.shell`. `form` forwards the route's action result to whichever view rendered, so a
blocked save reaches `EditPage` and a login outcome reaches `LoginPage` through the one prop.
`render`, `registry`, and `icons` come from the site's adapter and pass through to `EditPage` for
the preview, the insert palette, and the icon fields. The showcase mounts it like this:

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
let { data, children }: { data: AdminShellData; children: Snippet };
```

The exported admin chrome shell: the sidebar nav, the top bar, the command palette, and the content
slot. Mount it from a shared `/admin/+layout.svelte` so every `/admin/**` route, the engine's own
views and any custom screen a site adds, renders inside one chrome. `data` is the `AdminShellData`
the shell load (`/admin/+layout.server.ts`) returns.

`AdminShellData` is a discriminated union. A `{ public: true }` payload (the login and confirm pages)
renders the children bare with no chrome; an authed payload renders the full chrome from its
data-driven nav, user, theme, and streamed publish-all count. The discriminant gates the chrome, so a
public payload always renders bare.

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
`CairnAdmin`; a per-route mount lives at `src/routes/admin/(app)/media/+page.svelte`.

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
let { data, registry, render, icons, form }: {
  data: EditData & { siteName: string };
  registry?: ComponentRegistry;
  render?: SiteRender;
  icons?: IconSet;
  form?: ContentFormFailure | null;
};
```

The single-entry editor. `data` is the `EditData` from the edit load, merged with the site name.
`registry`, `render`, and `icons` come from the site's adapter: `render` powers the Preview tab,
`registry` drives the Insert block dialog, and `icons` feeds the guided form's icon fields. `form`
carries the last content action's failure as a `ContentFormFailure` (always with its `error`
summary), so a blocked save re-renders the author's edits and the broken links to fix. On the
per-route mounting it lives at `src/routes/admin/(app)/[concept]/[id]/+page.svelte`.

The page lays out in four zones. A sticky translucent header holds a breadcrumb back to the
concept list, the entry's status badge (New, Edited, or Published, with a separate Hidden badge
when the frontmatter `draft` flag is set), a save-state indicator reading "Unsaved changes" while
the browser holds edits and "Saved" after a save lands, an overflow menu with Delete and, while
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
  import { cairn } from '$lib/cairn.config.js';

  let { data }: { data: EditData } = $props();
</script>

<EditPage
  data={{ ...data, siteName: siteConfig.siteName }}
  render={cairn.rendering.render}
  registry={cairn.rendering.components}
  icons={cairn.rendering.icons}
/>
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
  data: { editors: Editor[]; self: string };
  form: { error?: string; ok?: boolean } | null;
};
```

The owner-only editors screen: the allowlist and the add and remove actions. `data.editors` is the
current allowlist and `data.self` is the acting owner's email, which the anti-lockout guard uses.
`form` carries the last action's result. Its forms post the named `?/addEditor`, `?/removeEditor`,
and `?/setRole` actions, the names `createCairnAdmin`'s actions record defines. On the per-route
mounting it lives at `src/routes/admin/(app)/editors/+page.svelte` against the editors load and
actions, registered under the same names.

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
let { data }: { data: NavLoadData };
```

The drag-to-reorder navigation editor. `data` is the `NavLoadData` from the nav load (the menu
metadata, the current tree, the page options, and the feature flags). Saving posts the named
`?/save` action, which commits the rebuilt nav to the site config. On the per-route mounting it
lives at `src/routes/admin/(app)/nav/+page.svelte` against the nav load and a `save`-named
action.

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
let { data }: { data: SettingsData };
```

The two-tier tidy settings screen. `data` is the `SettingsData` from the settings load: the
read-only developer-tier facts (whether tidy is enabled, whether the API key is configured, and the
model), the truthful gate flag, and the resolved editor-tier `conventions`. The editor tier (the
per-convention check-and-tint toggles and the radiogroup variant choosers) renders only when tidy is
enabled and the key is present; otherwise the screen shows the honest gate note with no disabled
controls. Saving posts the named `?/saveSettings` action, which commits the conventions block to the
same committed site-config YAML the nav editor writes.

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

The Help home screen, the standing place an author goes to get their bearings. `data` is the
`HelpData` from the help load: the getting-started progress derived from the committed manifest and
the open edit branches, the markdown reference rows, and the optional support contact. It renders the
masthead, a derived getting-started checklist (it drops away once the author finishes all three steps,
and hides per device on request), the formatting reference, and the support hand-off (shown only when
the adapter sets `supportContact`). It mounts inside `CairnAdminShell`, so it carries no theme wrapper
of its own.

```svelte
<script lang="ts">
  import { HelpHome } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<HelpHome {data} />
```

---

## Composed components

`MarkdownEditor` is the charter-named authoring seam, documented as a standalone bare surface a
site can mount directly. `DeleteDialog` and `RenameDialog` mount inside `EditPage` but stay public
for a site that builds its own per-route admin surface, pairing with the same load/action names
`EditPage` uses. The snippets are minimal mounts with the real prop names.

### `MarkdownEditor`

Stability tier: Extension API for its eleven stable props below; every other prop is `EditPage`
wiring, [documented separately as `Unstable API`](#markdowneditor-wiring-props-unstable-api).

```ts
let { value = $bindable(), name, registerInsert, registerFormat, completionSources = [], focusMode = false, typewriter = false, surface = 'prose', spellcheck = true, spellcheckDictionary = 'dictionary-en-us.txt', siteDictionary = [] }: {
  value: string;
  name: string;
  registerInsert?: (insert: (text: string) => void) => void;
  registerFormat?: (format: (kind: FormatKind) => void) => void;
  completionSources?: CompletionSource[];
  focusMode?: boolean;
  typewriter?: boolean;
  surface?: 'prose' | 'markup';
  spellcheck?: boolean;
  spellcheckDictionary?: string;
  siteDictionary?: ReadonlyArray<string>;
};
```

The bare CodeMirror editing surface behind the `MarkdownEditor` seam, and cairn's charter-named
authoring seam: this is the frozen stable contract a site mounting the component directly can
depend on across minors. `value` is bindable, so the parent reads edits back; `name` is the hidden
field the value mirrors to for form submit. `registerInsert` hands the parent a `(text) => void`
that inserts at the cursor, and `registerFormat` hands the parent a `(kind) => void` that applies a
named selection transform such as `bold`, `italic`, `h2`, `ol`, `codeblock`, or `table`.
`completionSources` wires generic CodeMirror autocomplete, such as the internal-link source.
`focusMode` fades every paragraph except the caret's, and `typewriter` keeps the caret line
vertically centered while typing. `surface` picks the posture: `prose` (the default) sets a 72ch
centered measure at a larger type step, `markup` fills the pane densely for tables and directives.
`spellcheck` turns the markdown-aware lint underlines on (the default) or off, reconfiguring the
lint compartment to empty and idling the Worker while off. `spellcheckDictionary` names the
dialect-resolved dictionary file (for example `dictionary-en-us.txt`) the source resolves to a real
asset URL and hands to the spellcheck Worker's init. `siteDictionary` seeds the Worker's personal
layer with the committed personal-dictionary words at init, so a word another editor committed
answers correct from the first lint. All are plain reactive props, so the host owns any toggle
persistence (`EditPage` persists the writing-mode toggles per browser). CodeMirror loads only in
the browser, so this component is client-only.

The component renders no toolbar and no card chrome of its own; the host frames it. `EditPage`
composes it inside the editor card with the engine's toolbar. A site mounting `MarkdownEditor`
directly gets the plain surface and supplies its own controls through `registerFormat`, since the
engine's toolbar component is internal and not exported here. The surface ships as a quiet
writing surface: the self-hosted iA Writer Mono face on a centered measure, stepped heading
sizes, dimmed syntax markers, GFM parsing, depth-stepped rails on `:::` directive machinery with
a plain-language hover hint.

```svelte
<MarkdownEditor bind:value={body} name="body" registerInsert={(fn) => (insert = fn)} />
```

#### `MarkdownEditor` wiring props (Unstable API)

Stability tier: Unstable API.

`EditPage`'s own wiring, exposed on the component because `EditPage` composes `MarkdownEditor`
rather than wrapping it, with no stability promise across minors: a site that reaches past
`EditPage` for one of these should expect it to move or change shape. `onComponentAtCaret` and
`registerReplaceRange` are the round-trip editing seams; the media seams (`registerInsertImage`,
`onImageIngest`, `mediaLibrary`, `onMediaImageAtCaret`) support the insert popover and the figure
control.

| Prop | Type | What it does |
| --- | --- | --- |
| `registerInsertLink` | `(insert: (href: string, title: string) => void) => void` | Hands the parent a callback that inserts an inline link. The link pickers call it. |
| `registerInsertImage` | `(insert: (alt: string, ref: string) => void) => void` | Hands the parent a callback that inserts an inline `![alt](media:slug.hash)` image at the caret. The media picker and the capture card call it. |
| `onImageIngest` | `(file: File) => void` | Fires with the first image file of a paste or drop onto the surface. The host opens the capture card with the bytes. |
| `mediaLibrary` | `Record<string, MediaLibraryEntry>` | The per-asset projection the source decoration reads to render a `media:` token as a thumbnail chip. |
| `registerCaretCoords` | `(get: () => { left: number; right: number; top: number; bottom: number } \| null) => void` | Hands the parent a getter for the caret's viewport coordinates, so the insert popover anchors to the cursor. |
| `registerFocusEditor` | `(focus: () => void) => void` | Hands the parent a callback that returns focus to the surface on close. |
| `registerImagePlaceholders` | `(api: ImagePlaceholderApi) => void` | Hands the host the optimistic-placeholder API (`begin`, `progress`, `resolveTo`, `cancel`) that drives the upload loop's in-flight thumbnail and determinate progress, with no document text written until the upload resolves. |
| `registerGetSelection` | `(get: () => string) => void` | Hands the parent a getter that returns the selected text. The web-link dialog prefills from it. |
| `registerGetSelectionRange` | `(get: () => { from: number; to: number } \| null) => void` | Hands the parent a getter that returns the selection's document offsets, or `null` for a bare caret, so the tidy host maps a selection tidy onto the exact selected span. |
| `registerTidy` | `(api: TidyApi) => void` | Hands the tidy review surface the apply API that drives its in-buffer decorations and its accept/reject state machine. |
| `registerUndo` | `(undo: () => void) => void` | Hands the parent a callback that undoes the tidy apply's whole history entry in one move, for the "Undo tidy" chip. |
| `onComponentAtCaret` | `(info: { name: string \| null; markdown: string; from: number; to: number } \| null) => void` | Reports the directive container under the caret whenever it changes: the opening directive's `name`, the block's `markdown`, and the document character offsets (`from`, `to`) of its inclusive line range, or `null` when the caret sits outside any container. The host resolves that block against the registry to offer an Edit-block control. |
| `onMediaImageAtCaret` | `(info: FigureAtImage \| null) => void` | Reports the media image under the caret whenever it changes: the inner `![alt](media:slug.hash)` token's exact source offsets, plus the enclosing `:::figure` block (its range, raw caption, and placement role) when the image is wrapped, or `figure: null` when it is bare, or `null` when the caret is not on a media image. The host opens the figure control over it to wrap, edit, or unwrap a figure, writing the source through `registerReplaceRange`. |
| `registerReplaceRange` | `(replace: (from: number, to: number, text: string) => void) => void` | Hands the parent a callback that overwrites a document span and drops the caret after it. The Edit-block dialog's Update calls it to write an edited block back over its original range. |
| `registerSelectRange` | `(select: (from: number, to: number) => void) => void` | Hands the parent a callback that selects a document span, focuses the surface, and scrolls the range into view. The publish-time needs-alt notice's jump control calls it to land the author on an image that lacks alt text. |
| `pendingAdditions` | `Set<string>` | The caller-owned pending personal-dictionary additions set. `EditPage` commits it through the save-time dictionary action and reconciles it against the merged response. |
| `spellcheckTest` | `{ createWorker?: () => SpellWorker; assumeReady?: boolean }` | A test-only seam for the spellcheck Worker (the real wasm and dictionary assets do not load under the component test runner). Never set this outside a test. |
| `tidyMode` | `boolean` | Makes the surface read-only while a tidy review is open, the way Preview disables the toolbar, so the author cannot edit underneath a pending review. |

### `DeleteDialog`

Stability tier: Unstable API.

```ts
let { conceptId, id, label, inboundLinks, pending = false, trigger = true, onsubmitting }: {
  conceptId: string;
  id: string;
  label: string;
  inboundLinks: InboundLink[];
  pending?: boolean;
  trigger?: boolean;
  onsubmitting?: () => void;
};
```

A confirm dialog that deletes one entry, with a guard that blocks the delete while other entries
link to it. `conceptId` and `id` identify the entry and post with the confirm, `label` names the
concept in the prompts, and `inboundLinks` is the list of entries that link here. A non-empty list
shows the linkers and blocks the delete until they are repointed. Pass `pending` for an entry with
unpublished edits; the confirm copy then warns that those edits are discarded too, since the delete
cascades to the entry's pending branch. With `trigger={false}` the component renders only the
dialog, no visible button, and the exported `open()` method shows it; `EditPage`'s overflow menu
drives it that way. `onsubmitting` fires when the confirm form submits, before the document
navigates; `EditPage` uses it to stand down its unsaved-changes guard. `EditPage` composes it.

```svelte
<DeleteDialog conceptId="posts" id="2026-06-04-hello" label="Post" inboundLinks={[]} />
```

### `RenameDialog`

Stability tier: Unstable API.

```ts
let { conceptId, id, label, slug, trigger = true, onsubmitting }: {
  conceptId: string;
  id: string;
  label: string;
  slug: string;
  trigger?: boolean;
  onsubmitting?: () => void;
};
```

A confirm dialog that renames one entry's slug. `conceptId` and `id` identify the entry and post
with the confirm, `label` names the concept in the prompts, and `slug` prefills the input with the
current slug. With `trigger={false}` the component renders only the dialog, no visible button, and
the exported `open()` method shows it; the sidebar's Change URL button drives it that way.
`onsubmitting` fires when the rename form submits, before the document navigates; `EditPage` uses
it to stand down its unsaved-changes guard. `EditPage` composes it.

```svelte
<RenameDialog conceptId="posts" id="2026-06-04-hello" label="Post" slug="hello" />
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

```svelte
<CsrfField {token} />
```

---

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
