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

`FieldLabel` renders the inline, control-adjacent register: the label sits beside its control on
one line, muted. This is one of three label registers the admin design system distinguishes. A
custom field built outside this subpath that instead wants the label on its own line preceding the
control (a register `SelectField` and `TextField` don't offer) follows the individual-field-label
recipe documented in
[the admin design system's form-row/label register](../internal/admin-design-system.md#type).

---

### `SelectField`

Stability tier: Extension API.

```ts
let { label, name, value = $bindable(), options }: {
  label: string;
  name: string;
  value: string;
  options: SelectFieldOption[];
};
```

One labeled select in the admin idiom: DaisyUI v5's default-bordered `select`, no `-bordered`
modifier. `label` renders to the left of the control; `name` is the native form-field name, so the
select posts inside an ordinary form submit; `value` is bindable; `options` is the option list in
display order.

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
let { label, name, value = $bindable(), type = 'text', placeholder }: {
  label: string;
  name: string;
  value: string;
  type?: 'text' | 'search' | 'email' | 'url';
  placeholder?: string;
};
```

One labeled single-line text input in the same admin idiom as `SelectField`: DaisyUI v5's
default-bordered `input`, no `-bordered` modifier. `type` narrows the native input type
(`search`, `email`, `url`); it defaults to a plain text input.

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
let { label, children }: { label: string; children: Snippet };
```

The label wrapper `SelectField` and `TextField` both compose internally: a small single-line label
beside its control. Compose it directly around a bare custom control (an admin field this subpath
does not yet cover) to keep the same label rhythm.

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
