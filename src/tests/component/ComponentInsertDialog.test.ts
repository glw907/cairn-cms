import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import ComponentInsertDialog, { insertableDefs } from '../../lib/components/ComponentInsertDialog.svelte';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n };
const schemaDef: ComponentDef = {
  ...base, name: 'callout', label: 'Callout', description: 'A highlighted note.', use: 'Call out one idea.',
  group: 'Callouts', icon: 'snowflake',
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
} as ComponentDef;
const alertDef: ComponentDef = {
  ...base, name: 'alert', label: 'Alert', description: 'A bordered note.', use: 'Flag a caution.',
  group: 'Callouts', icon: 'leaf',
  attributes: [{ key: 'role', label: 'Role', type: 'select', options: ['caution'] }],
} as ComponentDef;
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

  it('excludes a hidden def from the rendered catalog', async () => {
    const reg = defineRegistry({ components: [schemaDef, hiddenDef, templateDef] });
    const screen = render(ComponentInsertDialog, { registry: reg, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert block/i }).click();
    await expect.element(screen.getByText(/^Nested$/)).not.toBeInTheDocument();
    await expect.element(screen.getByText(/^Callout$/)).toBeInTheDocument();
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

describe('ComponentInsertDialog keyboard', () => {
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
