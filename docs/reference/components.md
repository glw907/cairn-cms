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

Each component sets `data-theme="cairn-admin"` (or sits inside `AdminLayout`, which does), so the
Warm Stone admin theme ships as a CSS side effect of the import. The TypeScript prop types in
`src/lib/components` are the source of truth, and the export-coverage gate checks every name here
against them.

---

## Page-level components

`CairnAdmin` is the one component the canonical mount renders. The view components after it are
what it switches between; a site on the advanced per-route mounting renders them directly against
the matching `/sveltekit` loads, and their snippets show that shape.

### `CairnAdmin`

```ts
let { data, form, render, registry, icons }: {
  data: AdminData;
  form?: Record<string, unknown> | null;
  render?: (md: string) => string | Promise<string>;
  registry?: ComponentRegistry;
  icons?: IconSet;
};
```

The single-mount admin page. Render it from the catch-all `/admin/[...path]` route with the
discriminated `AdminData` that `createCairnAdmin`'s load returns, and it switches `data.view` to
mount the right component: the sign-in and confirm pages bare, and the list, edit, editors, and
nav views wrapped in `AdminLayout` with the load's `layout` data. `form` forwards the route's
action result to whichever view rendered, so a blocked save reaches `EditPage` and a login
outcome reaches `LoginPage` through the one prop. `render`, `registry`, and `icons` come from the
site's adapter and pass through to `EditPage` for the preview, the insert palette, and the icon
fields. The showcase mounts it like this:

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

### `AdminLayout`

```ts
let { data, children }: { data: LayoutData; children: Snippet };
```

The authed admin shell: the sidebar nav, the top bar, and the content slot. `data` is the
`LayoutData` from the layout load (site name, signed-in user, nav concepts, active path, and
the owner capability). `CairnAdmin` wraps every authed view in it for you; on the per-route
mounting it lives at `src/routes/admin/(app)/+layout.svelte` with the page body rendered into its
default slot. Its sign-out form posts the named `?/logout` action on the current URL.

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AdminLayout } from '@glw907/cairn-cms/components';
  import type { LayoutData } from '@glw907/cairn-cms/sveltekit';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AdminLayout {data}>
  {@render children()}
</AdminLayout>
```

`LayoutData` carries a `csrf` token alongside the shell fields. `AdminLayout` provides that token to
its descendant forms through context, so an admin form inside the shell mounts `CsrfField` with no
prop. See [`CsrfField`](#csrffield) for the field itself.

When `data.pendingEntries` is non-empty, the topbar shows a "Publish site (N)" button whose confirm
dialog lists the held entries grouped by concept and posts the named `?/publishAll` action to the
current page. A null `pendingEntries` (GitHub unreachable) hides the button rather than showing a
stale count.

### `ConceptList`

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

```ts
let { data, registry, render, icons, form }: {
  data: EditData & { siteName: string };
  registry?: ComponentRegistry;
  render?: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
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

```ts
let { data }: { data: HelpData };
```

The Help home screen, the standing place an author goes to get their bearings. `data` is the
`HelpData` from the help load: the getting-started progress derived from the committed manifest and
the open edit branches, the markdown reference rows, and the optional support contact. It renders the
masthead, a derived getting-started checklist (it drops away once the author finishes all three steps,
and hides per device on request), the formatting reference, and the support hand-off (shown only when
the adapter sets `supportContact`). It mounts inside `AdminLayout`, so it carries no theme wrapper of
its own.

```svelte
<script lang="ts">
  import { HelpHome } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<HelpHome {data} />
```

---

## Composed components

These mount inside `EditPage` and its dialogs, so you don't wire them directly. They appear here
for completeness, and for a site that builds its own admin surface against the `CairnExtension`
seam. The snippets are minimal mounts with the real prop names.

### `MarkdownEditor`

```ts
let { value = $bindable(), name, registerInsert, registerInsertLink, registerInsertImage, onImageIngest, mediaLibrary = {}, registerCaretCoords, registerFocusEditor, registerImagePlaceholders, registerGetSelection, registerFormat, onComponentAtCaret, registerReplaceRange, registerSelectRange, completionSources = [], focusMode = false, typewriter = false }: {
  value: string;
  name: string;
  registerInsert?: (insert: (text: string) => void) => void;
  registerInsertLink?: (insert: (href: string, title: string) => void) => void;
  registerInsertImage?: (insert: (alt: string, ref: string) => void) => void;
  onImageIngest?: (file: File) => void;
  mediaLibrary?: Record<string, MediaLibraryEntry>;
  registerCaretCoords?: (get: () => { left: number; right: number; top: number; bottom: number } | null) => void;
  registerFocusEditor?: (focus: () => void) => void;
  registerImagePlaceholders?: (api: ImagePlaceholderApi) => void;
  registerGetSelection?: (get: () => string) => void;
  registerFormat?: (format: (kind: FormatKind) => void) => void;
  onComponentAtCaret?: (info: { name: string | null; markdown: string; from: number; to: number } | null) => void;
  onMediaImageAtCaret?: (info: FigureAtImage | null) => void;
  registerReplaceRange?: (replace: (from: number, to: number, text: string) => void) => void;
  registerSelectRange?: (select: (from: number, to: number) => void) => void;
  completionSources?: CompletionSource[];
  focusMode?: boolean;
  typewriter?: boolean;
  surface?: 'prose' | 'markup';
};
```

The bare CodeMirror editing surface behind the `MarkdownEditor` seam. `value` is bindable, so the
parent reads edits back; `name` is the hidden field the value mirrors to for form submit. The
`register*` props each hand the parent a callback into the mounted editor. `registerInsert`
inserts text at the cursor (the Insert block dialog calls it), `registerInsertLink` inserts an
inline link (the pickers call it), `registerGetSelection` returns the selected text (the web-link
dialog prefills from it), and `registerFormat` applies a named selection transform such as `bold`,
`italic`, `h2`, `ol`, `codeblock`, or `table` (the toolbar calls it). `onComponentAtCaret` and
`registerReplaceRange` are the round-trip editing seams. `onComponentAtCaret` reports the directive
container under the caret whenever it changes: the opening directive's `name`, the block's
`markdown`, and the document character offsets (`from`, `to`) of its inclusive line range, or `null`
when the caret sits outside any container. The host resolves that block against the registry to
offer an Edit-block control. `registerReplaceRange` hands the parent a `(from, to, text)` callback
that overwrites a document span and drops the caret after it, which the Edit-block dialog's Update
calls to write an edited block back over its original range. `registerSelectRange` hands the parent a
`(from, to)` callback that selects a document span, focuses the surface, and scrolls the range into
view, which the publish-time needs-alt notice's jump control calls to land the author on an image
that lacks alt text. `onMediaImageAtCaret` reports the media image under the caret whenever it
changes: the inner `![alt](media:slug.hash)` token's exact source offsets, plus the enclosing
`:::figure` block (its range, raw caption, and placement role) when the image is wrapped, or
`figure: null` when it is bare, or `null` when the caret is not on a media image. The host opens the
figure control over it to wrap, edit, or unwrap a figure, writing the source through
`registerReplaceRange`. The media seams support the insert
popover: `registerInsertImage` inserts an inline `![alt](media:slug.hash)` image at the caret (the
picker and the capture card call it), `onImageIngest` fires with the first image file of a paste or
drop onto the surface (the host opens the capture card with the bytes), and `mediaLibrary` is the
per-asset projection the source decoration reads to render a `media:` token as a thumbnail chip.
`registerCaretCoords` returns the caret's viewport coordinates so the popover anchors to the cursor,
`registerFocusEditor` returns focus to the surface on close, and `registerImagePlaceholders` hands
the host the optimistic-placeholder api (`begin`, `progress`, `resolveTo`, `cancel`) that drives the
upload loop's in-flight thumbnail and determinate progress without ever writing doc text until the
upload resolves. `completionSources` wires
generic CodeMirror autocomplete, such as the internal-link source. `focusMode` fades every
paragraph except the caret's, and `typewriter` keeps the caret line vertically centered while
typing. `surface` picks the posture: `prose` (the default) sets a 72ch centered measure at a
larger type step, `markup` fills the pane densely for tables and directives. All three are plain
reactive props, so the host owns the toggles and any persistence (`EditPage` persists them per
browser). CodeMirror loads only in the browser, so this component
is client-only.

The component renders no toolbar and no card chrome of its own; the host frames it. `EditPage`
composes it inside the editor card with the engine's toolbar. A site mounting `MarkdownEditor`
directly gets the plain surface and supplies its own controls through `registerFormat`, since the
engine's toolbar component is internal and not exported here. The surface ships as a quiet
writing surface: the self-hosted iA Writer Mono face on a centered measure, stepped heading
sizes, dimmed syntax markers, GFM parsing, depth-stepped rails on `:::` directive machinery with
a plain-language hover hint, and native browser spell check.

```svelte
<MarkdownEditor bind:value={body} name="body" registerInsert={(fn) => (insert = fn)} />
```

### `ComponentInsertDialog`

```ts
let { registry, insert, update, icons, render, preview = null, disabled = false, trigger = true }: {
  registry?: ComponentRegistry;
  insert: (text: string) => void;
  update?: (range: { from: number; to: number }, markdown: string) => void;
  icons?: IconSet;
  render?: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
  preview?: ResolvedPreview | null;
  disabled?: boolean;
  trigger?: boolean;
};
```

The insert palette: an Insert block button that opens a dialog listing the site's registered
components, then hands off to `ComponentForm` for the chosen one. The catalog groups the rows by
each def's `group` (groups in first-declared order, ungrouped rows in a leading default group), draws
each def's `icon` beside its label when the icon set resolves it, and hides any def marked `hidden`.
Past eight actionable components the catalog grows a search input that filters by label or
description, with the arrow keys roaming the rows.

A component that declares an icon attribute with `fields.icon()` can resolve a role to a default glyph.
The engine ships a fallback, `DEFAULT_ICON_BY_ROLE`, that covers the conventional admonition roles:
`note`, `tip`, `important`, `warning`, `caution`, `info`, and `danger`. The fallback names a glyph
key, so the site's IconSet must carry that key for the glyph to render. A component's own
`defaultIconByRole` overrides the engine fallback for the roles it names.

`registry` is the site's component registry, `insert` inserts the serialized markdown at the editor
cursor, and `icons` feeds icon fields. `render` is the site's design-accurate render pipeline and
`preview` is the adapter's resolved preview knob: when both are present and the chosen component
declares a `preview` sample, the configure step splits into two panes, the guided form on the left
and a live preview on the right that renders the configured directive through `render` into a
sandboxed iframe, the same path `EditPage`'s preview uses. A host that threads neither simply gets
the single-column configure step. `update` is the round-trip seam: a host that re-opens a placed
component for editing passes a `(range, markdown)` callback, and the dialog routes the form's submit
there (overwriting the stored source span) instead of through `insert`. A host that never opens edit
mode passes none. `disabled` greys the trigger. With `trigger={false}` the component renders only the
dialog and the exported `open()` method shows it; `EditPage`'s toolbar drives it that way, keeping
the dialog's own form outside the edit form. `EditPage` composes it.

The dialog also exports an `editComponent(def, values, range)` instance method that re-opens a
placed component into the same guided form for editing. It skips the catalog, seeds the form from the
parsed `values`, and stores the source `range` for the `update` callback. In this mode the header
eyebrow reads "Edit" and the form's submit button reads "Update". `EditPage`'s Edit-block control
calls it after resolving the block under the caret. The bare `open()` method drives the catalog
insert flow as before.

```svelte
<ComponentInsertDialog
  {registry}
  insert={insertAtCursor}
  {icons}
  render={cairn.rendering.render}
  preview={data.preview}
/>
```

### `ComponentForm`

```ts
let { def, icons, onInsert, values = $bindable(), incomplete = $bindable(), initial, submitLabel = 'Insert' }: {
  def: ComponentDef;
  icons?: IconSet;
  onInsert: (markdown: string) => void;
  values?: ComponentValues;
  incomplete?: boolean;
  initial?: ComponentValues;
  submitLabel?: string;
};
```

The guided form for one component definition: a field per attribute and slot, validated and
serialized to the component's markdown. `def` is the chosen `ComponentDef`, `icons` feeds icon
fields, and `onInsert` receives the serialized markdown when the form validates. The form seeds its
working values from `previewValues(def)`, so a component's declared `preview` sample fills the
fields on open. `values` binds out the live working values and `incomplete` binds out whether a
required attribute or slot is still empty, so the dialog can render the preview pane from them and
mirror the disabled Insert. `initial` seeds the working values for editing: the dialog passes the
parsed values of a placed component so the form re-opens on its real content instead of the
`previewValues` sample, and the catalog insert path leaves it unset. `submitLabel` names the submit
button and defaults to "Insert"; the dialog passes "Update" in edit mode. Back lives in the dialog
header now, not in the form, so the component takes no `onBack`. `ComponentInsertDialog` composes it.

```svelte
<ComponentForm {def} {icons} onInsert={handleInsert} bind:values bind:incomplete />
```

### `IconPicker`

```ts
let { icons, value, required, onChange, label = 'Icon' }: {
  icons: IconSet;
  value: string;
  required: boolean;
  onChange: (name: string) => void;
  label?: string;
};
```

An ARIA radiogroup that picks one glyph from the site's icon set. `icons` is the glyph name to SVG
path-data map, `value` is the selected name (or `''` for none), `required` toggles whether a None
choice is offered, and `onChange` receives the new name. `label` names the group for assistive tech.
`ComponentForm` composes it for an icon field.

```svelte
<IconPicker {icons} value={selected} required={false} onChange={(name) => (selected = name)} />
```

### `LinkPicker`

```ts
let { linkTargets, insert, disabled = false, trigger = true }: {
  linkTargets: LinkTarget[];
  insert: (href: string, title: string) => void;
  disabled?: boolean;
  trigger?: boolean;
};
```

The Link to page control: a dialog that searches the site's content and inserts a rot-proof
`cairn:` internal link at the editor cursor. `linkTargets` is the link target list the edit load
ships from the committed manifest; `insert` inserts the chosen link. `disabled` greys the trigger.
With `trigger={false}` the component renders only the dialog, and the exported `open()` method
shows it; `EditPage`'s toolbar drives it that way, keeping the dialog's search form outside the
edit form. `EditPage` composes it.

```svelte
<LinkPicker {linkTargets} insert={insertLinkAtCursor} />
```

### `DeleteDialog`

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

```ts
let { token }: { token?: string };
```

A hidden double-submit field that every admin form carries so the guard's CSRF check passes. Pass
`token` directly, the way `LoginPage` and `ConfirmPage` do from their load data. Omit it inside the
authed shell, where `AdminLayout` provides the token through context and the field reads it from
there. A form that renders no `CsrfField` fails the guard's token check, which is the intended
fail-closed signal. `EditPage`, `DeleteDialog`, `RenameDialog`, and the other authed admin forms
compose it.

```svelte
<CsrfField {token} />
```
