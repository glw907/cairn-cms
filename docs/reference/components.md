# Components (`@glw907/cairn-cms/components`)

This subpath holds the admin Svelte UI: the layout shell, the sign-in and confirm pages, the
content list and editor, the editors and nav screens, and the dialogs and pickers those compose. A
site mounts the page-level components from its admin route shims and feeds them the route data from
the matching `/sveltekit` load. The component-level pieces are composed inside `EditPage` and the
dialogs, so a site rarely mounts them by hand. The canonical route tree these components mount in is
[the admin route structure guide](../admin-route-structure.md).

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

### `ConceptList`

```ts
let { data }: { data: ListData };
```

The list screen for one content concept: the entries, the create form, and any inline errors. `data`
is the `ListData` from the list load. Mount it in
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

The single-entry editor: the markdown editor, the live preview, the component insert palette, the
link picker, and the delete and rename dialogs. `data` is the `EditData` from the edit load, merged
with the site name for the heading. `registry`, `render`, and `icons` come from the site's adapter:
`render` powers the preview pane, `registry` drives the insert palette, and `icons` feeds the guided
form's icon fields. `form` carries the last `?/save` or `?/delete` action result, so a blocked save
re-renders the author's edits and the broken links to fix. Mount it in
`src/routes/admin/(app)/[concept]/[id]/+page.svelte`.

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
  form: { sent?: boolean } | null;
};
```

The magic-link request screen. `data` carries the site name, an optional error, and the `csrf`
double-submit token the page renders into its form. `form.sent` is true once a link request was
accepted, which flips the page to the check-your-email state. Mount it in the unauthed
`src/routes/admin/login/+page.svelte` against the login load and action.

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

These mount inside `EditPage` and its dialogs, so a site does not wire them directly. They are
documented here for completeness and for a site that builds its own admin surface against the
`CairnExtension` seam. The snippets are minimal mounts with the real prop names.

### `MarkdownEditor`

```ts
let { value = $bindable(), name, registerInsert, registerInsertLink, completionSources = [] }: {
  value: string;
  name: string;
  registerInsert?: (insert: (text: string) => void) => void;
  registerInsertLink?: (insert: (href: string, title: string) => void) => void;
  completionSources?: CompletionSource[];
};
```

The CodeMirror editing surface behind the `MarkdownEditor` seam. `value` is bindable, so the parent
reads edits back; `name` is the hidden field the value mirrors to for form submit. `registerInsert`
and `registerInsertLink` hand the parent the cursor-insert callbacks the palette and the link picker
call. `completionSources` wires generic CodeMirror autocomplete, such as the internal-link source.
CodeMirror loads only in the browser, so this component is client-only. `EditPage` composes it.

```svelte
<MarkdownEditor bind:value={body} name="body" registerInsert={(fn) => (insert = fn)} />
```

### `ComponentInsertDialog`

```ts
let { registry, insert, icons }: {
  registry?: ComponentRegistry;
  insert: (text: string) => void;
  icons?: IconSet;
};
```

The insert palette: a button that opens a dialog listing the site's registered components, then
hands off to `ComponentForm` for the chosen one. `registry` is the site's component registry,
`insert` inserts the serialized markdown at the editor cursor, and `icons` feeds icon fields.
`EditPage` composes it.

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
let { linkTargets, insert }: {
  linkTargets: LinkTarget[];
  insert: (href: string, title: string) => void;
};
```

A dialog that searches the site's content and inserts a rot-proof `cairn:` internal link at the
editor cursor. `linkTargets` is the link target list the edit load ships from the committed
manifest; `insert` inserts the chosen link. `EditPage` composes it.

```svelte
<LinkPicker {linkTargets} insert={insertLinkAtCursor} />
```

### `DeleteDialog`

```ts
let { conceptId, id, label, inboundLinks }: {
  conceptId: string;
  id: string;
  label: string;
  inboundLinks: InboundLink[];
};
```

A confirm dialog that deletes one entry, with a guard that blocks the delete while other entries
link to it. `conceptId` and `id` identify the entry and post with the confirm, `label` names the
concept in the prompts, and `inboundLinks` is the list of entries that link here. A non-empty list
shows the linkers and blocks the delete until they are repointed. `EditPage` composes it.

```svelte
<DeleteDialog conceptId="posts" id="2026-06-04-hello" label="Post" inboundLinks={[]} />
```

### `RenameDialog`

```ts
let { conceptId, id, label, slug }: {
  conceptId: string;
  id: string;
  label: string;
  slug: string;
};
```

A confirm dialog that renames one entry's slug. `conceptId` and `id` identify the entry and post
with the confirm, `label` names the concept in the prompts, and `slug` prefills the input with the
current slug. `EditPage` composes it.

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
