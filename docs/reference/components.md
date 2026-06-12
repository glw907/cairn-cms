# Components (`@glw907/cairn-cms/components`)

This subpath holds the admin Svelte UI. It spans the layout shell, the sign-in and confirm pages,
the content list and editor, the editors and nav screens, and the dialogs and pickers those
compose. You mount the page-level components from your admin route shims and feed them the route
data from the matching `/sveltekit` load. The component-level pieces compose inside `EditPage` and
the dialogs, so you rarely mount them by hand. For the canonical route tree they mount in, see
[the admin route structure guide](./admin-routes.md).

```ts
import { AdminLayout, ConceptList, EditPage } from '@glw907/cairn-cms/components';
```

Each component sets `data-theme="cairn-admin"` (or sits inside `AdminLayout`, which does), so the
Warm Stone admin theme ships as a CSS side effect of the import. The TypeScript prop types in
`src/lib/components` are the source of truth, and the export-coverage gate checks every name here
against them.

---

## Page-level components

These mount directly from an admin route shim. The showcase mounts `AdminLayout`, `ConceptList`, and
`EditPage`; the snippets below come from its admin routes.

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
discriminated `AdminData` that `createCairnAdmin`'s load returns, and it mounts the right view:
the sign-in and confirm pages bare, and the list, edit, editors, and nav views inside
`AdminLayout`. `form` forwards the route's action result to whichever view rendered; `render`,
`registry`, and `icons` pass through to `EditPage`.

### `AdminLayout`

```ts
let { data, children }: { data: LayoutData; children: Snippet };
```

The authed admin shell: the sidebar nav, the top bar, and the content slot. `data` is the
`LayoutData` from the layout server load (site name, signed-in user, nav concepts, active path, and
the owner capability). Mount it in `src/routes/admin/(app)/+layout.svelte` and render the page body
into its default slot.

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
it. A `?publishedAll=` redirect renders a "Published N entries." flash above the list. Mount it in
`src/routes/admin/(app)/[concept]/+page.svelte`.

```svelte
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  import type { ListData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: ListData } = $props();
</script>

<ConceptList {data} />
```

### `EditPage`

```ts
let { data, registry, render, icons, form }: {
  data: EditData & { siteName: string };
  registry?: ComponentRegistry;
  render?: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
  icons?: IconSet;
  form?: { brokenLinks?: string[]; body?: string; inboundLinks?: InboundLink[]; renameError?: string } | null;
};
```

The single-entry editor. `data` is the `EditData` from the edit load, merged with the site name.
`registry`, `render`, and `icons` come from the site's adapter: `render` powers the Preview tab,
`registry` drives the Insert block dialog, and `icons` feeds the guided form's icon fields. `form`
carries the last `?/save` or `?/delete` action result, so a blocked save re-renders the author's
edits and the broken links to fix. Mount it in
`src/routes/admin/(app)/[concept]/[id]/+page.svelte`.

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
document-title input. The toolbar's Write/Preview segmented tabs swap the editing surface for the
rendered preview inside the same card, and the formatting and insert controls disable while
Preview shows.

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
  data={{ ...data, siteName: cairn.siteName }}
  render={cairn.render}
  registry={cairn.registry}
  icons={cairn.icons}
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
the editor can retry. Mount it in the unauthed `src/routes/admin/login/+page.svelte` against the
login load and action.

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
page renders into its confirm form. Mount it in `src/routes/admin/confirm/+page.svelte` against the
confirm load.

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
`form` carries the last action's result. Mount it in
`src/routes/admin/(app)/editors/+page.svelte` against the editors load and actions.

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
metadata, the current tree, the page options, and the feature flags). Saving commits the rebuilt nav
to the site config. Mount it in `src/routes/admin/(app)/nav/+page.svelte` against the nav load and
action.

```svelte
<script lang="ts">
  import { NavTree } from '@glw907/cairn-cms/components';

  let { data } = $props();
</script>

<NavTree {data} />
```

---

## Composed components

These mount inside `EditPage` and its dialogs, so you don't wire them directly. They appear here
for completeness, and for a site that builds its own admin surface against the `CairnExtension`
seam. The snippets are minimal mounts with the real prop names.

### `MarkdownEditor`

```ts
let { value = $bindable(), name, registerInsert, registerInsertLink, registerGetSelection, registerFormat, completionSources = [] }: {
  value: string;
  name: string;
  registerInsert?: (insert: (text: string) => void) => void;
  registerInsertLink?: (insert: (href: string, title: string) => void) => void;
  registerGetSelection?: (get: () => string) => void;
  registerFormat?: (format: (kind: FormatKind) => void) => void;
  completionSources?: CompletionSource[];
};
```

The bare CodeMirror editing surface behind the `MarkdownEditor` seam. `value` is bindable, so the
parent reads edits back; `name` is the hidden field the value mirrors to for form submit. The
`register*` props each hand the parent a callback into the mounted editor. `registerInsert`
inserts text at the cursor (the Insert block dialog calls it), `registerInsertLink` inserts an
inline link (the pickers call it), `registerGetSelection` returns the selected text (the web-link
dialog prefills from it), and `registerFormat` applies a named selection transform such as `bold`,
`italic`, `h2`, `ol`, `codeblock`, or `table` (the toolbar calls it). `completionSources` wires
generic CodeMirror autocomplete, such as the internal-link source. CodeMirror loads only in the
browser, so this component is client-only.

The component renders no toolbar and no card chrome of its own; the host frames it. `EditPage`
composes it inside the editor card with the engine's toolbar. A site mounting `MarkdownEditor`
directly gets the plain surface and supplies its own controls through `registerFormat`, since the
engine's toolbar component is internal and not exported here. The surface ships with markdown
syntax highlighting in the admin palette, an explicit highlight on `:::` directive machinery, and
native browser spell check.

```svelte
<MarkdownEditor bind:value={body} name="body" registerInsert={(fn) => (insert = fn)} />
```

### `ComponentInsertDialog`

```ts
let { registry, insert, icons, disabled = false, trigger = true }: {
  registry?: ComponentRegistry;
  insert: (text: string) => void;
  icons?: IconSet;
  disabled?: boolean;
  trigger?: boolean;
};
```

The insert palette: an Insert block button that opens a dialog listing the site's registered
components, then hands off to `ComponentForm` for the chosen one. `registry` is the site's
component registry, `insert` inserts the serialized markdown at the editor cursor, and `icons`
feeds icon fields. `disabled` greys the trigger. With `trigger={false}` the component renders only
the dialog and the exported `open()` method shows it; `EditPage`'s toolbar drives it that way,
keeping the dialog's own form outside the edit form. `EditPage` composes it.

```svelte
<ComponentInsertDialog {registry} insert={insertAtCursor} {icons} />
```

### `ComponentForm`

```ts
let { def, icons, onInsert, onBack }: {
  def: ComponentDef;
  icons?: IconSet;
  onInsert: (markdown: string) => void;
  onBack: () => void;
};
```

The guided form for one component definition: a field per attribute and slot, validated and
serialized to the component's markdown. `def` is the chosen `ComponentDef`, `icons` feeds icon
fields, `onInsert` receives the serialized markdown when the form validates, and `onBack` returns to
the picker. `ComponentInsertDialog` composes it.

```svelte
<ComponentForm {def} {icons} onInsert={handleInsert} onBack={returnToPicker} />
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
