import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ComponentInsertDialog, { insertableDefs } from '../../lib/components/ComponentInsertDialog.svelte';
import { defineComponent, defineRegistry, type ComponentDef, type ComponentValues } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import { serializeComponent } from '../../lib/render/component-grammar.js';

const base = { build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }) };
const schemaDef = defineComponent({
  ...base, name: 'callout', label: 'Callout', description: 'A highlighted note.', use: 'Call out one idea.',
  group: 'Callouts', icon: 'snowflake',
  attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note', 'warning'] }) },
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
});
const alertDef = defineComponent({
  ...base, name: 'alert', label: 'Alert', description: 'A bordered note.', use: 'Flag a caution.',
  group: 'Callouts', icon: 'leaf',
  attributes: { role: fields.select({ label: 'Role', options: ['caution'] }) },
});
const gridDef: ComponentDef = {
  ...base, name: 'grid', label: 'Grid', description: 'A responsive grid.', use: 'Lay tiles out.',
  group: 'Layout', insertTemplate: ':::grid\n:::',
} as ComponentDef;
const templateDef: ComponentDef = {
  ...base, name: 'rule', label: 'Rule', description: 'A divider.', insertTemplate: ':::rule\n:::',
} as ComponentDef;
const inertDef: ComponentDef = { ...base, name: 'inert', label: 'Inert', description: 'Nothing.' } as ComponentDef;
const hiddenDef: ComponentDef = {
  ...base, name: 'nested', label: 'Nested', description: 'Nested only.', hidden: true,
  insertTemplate: ':::nested\n:::',
} as ComponentDef;

const registry = defineRegistry({ components: [schemaDef, templateDef, inertDef] });
const icons = { snowflake: 'M1 1h2', leaf: 'M5 5h30' };

/** A registry of `n` actionable template-only defs, named c0..c(n-1). For the search threshold. */
function manyRegistry(n: number) {
  const defs: ComponentDef[] = [];
  for (let i = 0; i < n; i += 1) {
    defs.push({
      ...base, name: `c${i}`, label: `Comp ${i}`, description: `Description ${i}.`,
      insertTemplate: `:::c${i}\n:::`,
    } as ComponentDef);
  }
  return defineRegistry({ components: defs });
}

describe('insertableDefs', () => {
  it('keeps actionable defs and drops the inert one', () => {
    const out = insertableDefs(registry).map((d) => d.name);
    expect(out).toEqual(['callout', 'rule']);
  });

  it('excludes a def marked hidden, after the actionable filter', () => {
    const reg = defineRegistry({ components: [schemaDef, hiddenDef, templateDef] });
    const out = insertableDefs(reg).map((d) => d.name);
    expect(out).toEqual(['callout', 'rule']);
    expect(out).not.toContain('nested');
  });
});

describe('ComponentInsertDialog catalog', () => {
  it('lists actionable components with descriptions and omits inert ones', async () => {
    const screen = render(ComponentInsertDialog, { registry, insert: () => {}, icons } as never);
    const openBtn = screen.getByRole('button', { name: /insert block/i });
    await expect.element(openBtn).toBeInTheDocument();
    await openBtn.click();
    await expect.element(screen.getByText(/a highlighted note/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/call out one idea/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/^inert$/i)).not.toBeInTheDocument();
  });

  it('groups rows under eyebrow headings in declaration order', async () => {
    const reg = defineRegistry({ components: [schemaDef, alertDef, gridDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();

    const headings = document.querySelectorAll('[data-testid="cairn-pk-group-heading"]');
    expect([...headings].map((h) => h.textContent?.trim())).toEqual(['Callouts', 'Layout']);

    // Rows render in declaration order across the whole list.
    const rows = document.querySelectorAll('[data-testid="cairn-pk-row"]');
    const labels = [...rows].map((r) => r.querySelector('[data-testid="cairn-pk-row-label"]')?.textContent?.trim());
    expect(labels).toEqual(['Callout', 'Alert', 'Grid']);
  });

  it('renders the icon glyph beside the label from the icon set', async () => {
    const reg = defineRegistry({ components: [schemaDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    const row = document.querySelector('[data-testid="cairn-pk-row"]');
    const path = row?.querySelector('svg.ec-glyph path');
    expect(path?.getAttribute('d')).toBe(icons.snowflake);
  });

  it('renders no glyph tile when the declared icon is unresolvable', async () => {
    const ghost: ComponentDef = {
      ...base, name: 'ghost', label: 'Ghost', description: 'No glyph for this.',
      icon: 'missing', insertTemplate: ':::ghost\n:::',
    } as ComponentDef;
    const reg = defineRegistry({ components: [ghost] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    const row = document.querySelector('[data-testid="cairn-pk-row"]');
    // The icon name resolves to nothing in the set, so no empty glyph box renders.
    expect(row?.querySelector('svg.ec-glyph')).toBeNull();
  });

  it('excludes a hidden def from the rendered catalog', async () => {
    const reg = defineRegistry({ components: [schemaDef, hiddenDef, templateDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await expect.element(screen.getByText(/^Nested$/)).not.toBeInTheDocument();
    await expect.element(screen.getByText(/^Callout$/)).toBeInTheDocument();
  });

  it('caps the dialog box height per the design system', async () => {
    const reg = defineRegistry({ components: [schemaDef, alertDef, gridDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    // The box caps at 85vh via a Tailwind utility (the utilities layer beats DaisyUI's modal-box
    // 100vh; a components-layer rule would not), and the catalog body is the scroll container so the
    // header holds while the list scrolls within the cap.
    const box = document.querySelector('.modal-box');
    expect(box?.className).toMatch(/max-h-\[85vh\]/);
    expect(box?.className).toMatch(/overflow-hidden/);
    const list = document.querySelector('[data-cairn-pk-list]');
    expect(list?.className).toMatch(/overflow-y-auto/);
  });

  it('inserts a template-only def directly', async () => {
    const insert = vi.fn();
    const screen = render(ComponentInsertDialog, { registry, insert, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /rule/i }).click();
    expect(insert).toHaveBeenCalledWith(':::rule\n:::');
  });

  it('routes a schema def to the form and inserts the built markdown', async () => {
    const insert = vi.fn();
    const screen = render(ComponentInsertDialog, { registry, insert, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('warning');
    await screen.getByRole('textbox', { name: /title/i }).fill('Careful');
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(insert).toHaveBeenCalledWith(':::callout[Careful]{tone="warning"}\n:::');
  });
});

describe('ComponentInsertDialog search', () => {
  it('shows no search input below the threshold', async () => {
    const screen = render(ComponentInsertDialog, { registry: manyRegistry(8), insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await expect.element(screen.getByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the search input past the threshold and focuses it on open', async () => {
    const screen = render(ComponentInsertDialog, { registry: manyRegistry(9), insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    const box = screen.getByRole('searchbox');
    await expect.element(box).toBeInTheDocument();
    expect(document.activeElement).toBe(box.element());
  });

  it('filters rows by label and description and reports the count', async () => {
    const screen = render(ComponentInsertDialog, { registry: manyRegistry(9), insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('searchbox').fill('Comp 3');
    const rows = document.querySelectorAll('[data-testid="cairn-pk-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('[data-testid="cairn-pk-row-label"]')?.textContent?.trim()).toBe('Comp 3');
    await expect.element(screen.getByRole('status')).toHaveTextContent(/1 component/i);
  });

  it('shows a no-match state when nothing matches', async () => {
    const screen = render(ComponentInsertDialog, { registry: manyRegistry(9), insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('searchbox').fill('zzzznope');
    expect(document.querySelectorAll('[data-testid="cairn-pk-row"]').length).toBe(0);
    await expect.element(screen.getByText(/no components match/i)).toBeInTheDocument();
  });
});

const previewCallout = defineComponent({
  ...base, name: 'callout', label: 'Callout', description: 'A highlighted note.', use: 'Call out one idea.',
  group: 'Callouts', icon: 'snowflake',
  preview: { attributes: { tone: 'note' }, slots: { title: 'Sample', body: 'Body text' } },
  attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note', 'warning'] }) },
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
});
const plainForm = defineComponent({
  ...base, name: 'signup', label: 'Newsletter signup', description: 'An email capture.', use: 'Grow the list.',
  attributes: { list: fields.select({ label: 'List', required: true, options: ['news'] }) },
});

describe('ComponentInsertDialog configure step', () => {
  it('shows two panes for a preview-declaring component', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const renderFn = (md: string) => `<p>${md}</p>`;
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons, render: renderFn } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    // The preview pane mounts only in the two-pane case.
    await expect.element(screen.getByText(/^preview$/i)).toBeInTheDocument();
    expect(document.querySelector('[data-testid="cairn-pk-preview"]')).not.toBeNull();
  });

  it('stays single column for a component that declares no preview', async () => {
    const reg = defineRegistry({ components: [plainForm] });
    const renderFn = (md: string) => `<p>${md}</p>`;
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons, render: renderFn } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /newsletter signup/i }).click();
    expect(document.querySelector('[data-testid="cairn-pk-preview"]')).toBeNull();
  });

  it('shows no preview pane when no render function is threaded, even for a preview-declaring def', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    expect(document.querySelector('[data-testid="cairn-pk-preview"]')).toBeNull();
  });

  it('shows the incomplete state and disables Insert when a required field is empty', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const renderFn = (md: string) => `<p>${md}</p>`;
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons, render: renderFn } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    // Clear the seeded required title so a required region is empty.
    await screen.getByRole('textbox', { name: /title/i }).fill('');
    await expect.element(screen.getByText(/incomplete/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /^insert$/i })).toBeDisabled();
  });

  it('keeps the settle chip a silent visual cue (no live region)', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const renderFn = (md: string) => `<p>${md}</p>`;
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons, render: renderFn } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    // The chip text renders, but it is not announced: no aria-live, no role=status on it.
    const pane = document.querySelector('[data-testid="cairn-pk-preview"]')!;
    const chip = pane.querySelector('[data-testid="cairn-pk-settle"]')!;
    expect(chip).not.toBeNull();
    expect(chip.getAttribute('aria-live')).toBeNull();
    expect(chip.getAttribute('role')).toBeNull();
  });

  it('shows the render-failed surface when the adapter render throws, keeping the form', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const renderFn = () => {
      throw new Error('boom');
    };
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons, render: renderFn } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    await expect.element(screen.getByTestId('cairn-pk-preview-failed')).toBeInTheDocument();
    // The form survives, and Insert stays available (the seeded sample is valid).
    await expect.element(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /^insert$/i })).not.toBeDisabled();
  });

  it('moves focus to the first form field on pick', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const renderFn = (md: string) => `<p>${md}</p>`;
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons, render: renderFn } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    const tone = screen.getByRole('combobox', { name: /tone/i });
    await expect.element(tone).toBeInTheDocument();
    expect(document.activeElement).toBe(tone.element());
  });

  it('carries the Insert > group breadcrumb eyebrow and a Back control at the configure step', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    await expect.element(screen.getByText(/insert\s*›\s*callouts/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('Back returns to the catalog from the configure step', async () => {
    const reg = defineRegistry({ components: [previewCallout, gridDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    await screen.getByRole('button', { name: /back/i }).click();
    // The catalog rows are back.
    await expect.element(screen.getByText(/lay tiles out/i)).toBeInTheDocument();
  });
});

describe('ComponentInsertDialog keyboard', () => {
  it('ArrowDown from the search input moves focus to the first catalog row', async () => {
    const screen = render(ComponentInsertDialog, { registry: manyRegistry(9), insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    const box = screen.getByRole('searchbox');
    await expect.element(box).toBeInTheDocument();
    box.element().focus();
    await userEvent.keyboard('{ArrowDown}');
    const rows = document.querySelectorAll<HTMLButtonElement>('[data-testid="cairn-pk-row"]');
    expect(document.activeElement).toBe(rows[0]);
  });

  it('ArrowUp from the search input moves focus to the last catalog row', async () => {
    const screen = render(ComponentInsertDialog, { registry: manyRegistry(9), insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    const box = screen.getByRole('searchbox');
    await expect.element(box).toBeInTheDocument();
    box.element().focus();
    await userEvent.keyboard('{ArrowUp}');
    const rows = document.querySelectorAll<HTMLButtonElement>('[data-testid="cairn-pk-row"]');
    expect(document.activeElement).toBe(rows[rows.length - 1]);
  });

  it('moves between rows with the arrow keys and chooses on Enter', async () => {
    const insert = vi.fn();
    const reg = defineRegistry({ components: [schemaDef, gridDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();

    const rows = document.querySelectorAll<HTMLButtonElement>('[data-testid="cairn-pk-row"]');
    rows[0].focus();
    expect(document.activeElement).toBe(rows[0]);

    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[1]);

    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(rows[0]);

    // Grid is template-only, so picking it inserts directly. Move to it and press Enter.
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    expect(insert).toHaveBeenCalledWith(':::grid\n:::');
  });
});

describe('ComponentInsertDialog edit mode', () => {
  const editValues: ComponentValues = {
    attributes: { tone: 'warning' },
    slots: { title: 'Existing title' },
  };

  it('opens the configure step with the fields pre-filled from the passed values', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    screen.component.editComponent(previewCallout, editValues, { from: 10, to: 40 });
    await expect.element(screen.getByRole('textbox', { name: /title/i })).toHaveValue('Existing title');
    await expect.element(screen.getByRole('combobox', { name: /tone/i })).toHaveValue('warning');
    // No catalog row shows: edit mode skips the catalog straight to the form.
    expect(document.querySelectorAll('[data-testid="cairn-pk-row"]').length).toBe(0);
  });

  it('shows the Edit breadcrumb eyebrow and an Update primary button', async () => {
    const reg = defineRegistry({ components: [previewCallout] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    screen.component.editComponent(previewCallout, editValues, { from: 10, to: 40 });
    await expect.element(screen.getByText(/edit\s*›\s*callouts/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /^update$/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /^insert$/i })).not.toBeInTheDocument();
  });

  it('routes submit to update with the stored range and serialized markdown, then closes', async () => {
    const update = vi.fn();
    const insert = vi.fn();
    const reg = defineRegistry({ components: [previewCallout] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert, update, icons } as never);
    const range = { from: 10, to: 40 };
    screen.component.editComponent(previewCallout, editValues, range);
    await screen.getByRole('button', { name: /^update$/i }).click();
    expect(update).toHaveBeenCalledWith(range, serializeComponent(previewCallout, editValues));
    expect(insert).not.toHaveBeenCalled();
    // The dialog closed on update.
    await expect.element(screen.getByRole('combobox', { name: /tone/i })).not.toBeInTheDocument();
  });

  it('reopening the catalog after an edit is a clean Insert flow', async () => {
    const insert = vi.fn();
    const reg = defineRegistry({ components: [schemaDef, gridDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert, icons } as never);
    // Edit, close it, then open fresh for an Insert.
    screen.component.editComponent(schemaDef, editValues, { from: 1, to: 5 });
    await expect.element(screen.getByRole('button', { name: /^update$/i })).toBeInTheDocument();
    await screen.component.open();
    // The catalog is back and the configure flow inserts (not updates).
    await screen.getByRole('button', { name: /callout/i }).click();
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('warning');
    await screen.getByRole('textbox', { name: /title/i }).fill('Fresh');
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(insert).toHaveBeenCalledWith(':::callout[Fresh]{tone="warning"}\n:::');
  });
});
