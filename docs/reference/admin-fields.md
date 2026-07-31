# Admin fields (`@glw907/cairn-cms/admin-fields`)

This subpath holds the field-renderer primitives a site's own custom `/admin/` screen composes,
such as an events or members editor. They render with the admin's own label and control rhythm,
matching the built-in content editor's fields. The set is small today: `SelectField`, `TextField`,
and `FieldLabel`. New field types land as new consumers need them.

```ts
import { SelectField, TextField, FieldLabel } from '@glw907/cairn-cms/admin-fields';
import type { SelectFieldOption } from '@glw907/cairn-cms/admin-fields';
```

The TypeScript types in `src/lib/admin-fields` are the source of truth, and the export-coverage
gate checks every name here against them.

`FieldLabel`, and the `SelectField`/`TextField` primitives that wrap it, render one of two label
registers, chosen with the `register` prop: `'inline'` or `'stacked'`. These are two of the three
label registers the admin design system distinguishes. The third, the group legend, is a
`<legend>` rather than this component.

**`register="stacked"`** is the default. It puts the label on its own line preceding the control.
Use it for any field inside a multi-column form grid: a stacked label never competes with its own
control for a shared row's width, so it never wraps at a width an inline label would.
**`register="inline"`** puts the label beside its control on one line, muted, for a genuinely
control-adjacent composition, such as a toolbar filter or a compact panel where a group legend
already scopes the control enough that a full stacked label would be excess.

> **Breaking change:** before this register existed, `FieldLabel` rendered only the inline
> register. A site that composed `FieldLabel`, `SelectField`, or `TextField` for a field inside a
> multi-column grid and now wants to keep the old inline layout must pass `register="inline"`
> explicitly. Every other call renders the new default, the stacked register, instead.

---

### `SelectField`

Stability tier: Extension API.

```ts
let { label, name, value = $bindable(), options, register }: {
  label: string;
  name: string;
  value: string;
  options: SelectFieldOption[];
  register?: 'inline' | 'stacked';
};
```

One labeled select in the admin idiom. It's DaisyUI v5's default-bordered `select`, with no
`-bordered` modifier. `label` renders to the side of the control (inline) or preceding it
(stacked). `name` is the native form-field name, so the select posts inside an ordinary form
submit. `value` is bindable. `options` is the option list in display order. `register` picks the
label register described above, defaulting to `'stacked'`.

```svelte
<script lang="ts">
  import { SelectField } from '@glw907/cairn-cms/admin-fields';

  let status = $state('open');
</script>

<SelectField label="Status" name="status" bind:value={status} options={[
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]} />
```

### `TextField`

Stability tier: Extension API.

```ts
let { label, name, value = $bindable(), type = 'text', placeholder, register }: {
  label: string;
  name: string;
  value: string;
  type?: 'text' | 'search' | 'email' | 'url';
  placeholder?: string;
  register?: 'inline' | 'stacked';
};
```

One labeled single-line text input in the same admin idiom as `SelectField`. It's DaisyUI v5's
default-bordered `input`, with no `-bordered` modifier. `type` narrows the native input type to
`search`, `email`, or `url`; it defaults to a plain text input. `register` picks the label register
described above, defaulting to `'stacked'`.

```svelte
<script lang="ts">
  import { TextField } from '@glw907/cairn-cms/admin-fields';

  let query = $state('');
</script>

<TextField label="Search" name="q" type="search" bind:value={query} />
```

### `FieldLabel`

Stability tier: Extension API.

```ts
let { label, children, register }: {
  label: string;
  children: Snippet;
  register?: 'inline' | 'stacked';
};
```

The label wrapper `SelectField` and `TextField` both compose internally. Compose it directly
around a bare custom control (an admin field this subpath does not yet cover) to keep the same
label rhythm. `register` picks the label register. `'stacked'` is the default:
the label sits on its own line preceding the control, which fills to its container. `'inline'`
puts the label beside the control on one line instead, muted, for a genuinely control-adjacent
composition. A control that's a direct child of a stacked `FieldLabel` fills the label's own
width. A control nested one level deeper, such as a compact row of two or more controls side by
side, keeps its own width instead, since the stacked register's width hook only reaches a direct
child.

```svelte
<script lang="ts">
  import { FieldLabel } from '@glw907/cairn-cms/admin-fields';
</script>

<FieldLabel label="Instructor">
  <input class="input input-sm" name="instructor" />
</FieldLabel>
```

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `SelectFieldOption` | Extension API | `interface SelectFieldOption { value: string; label: string }` | One `SelectField` option: the submitted value and its visible text. |
