import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentInsertDialog from '../../lib/components/ComponentInsertDialog.svelte';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n };
const schemaDef: ComponentDef = {
  ...base, name: 'callout', label: 'Callout', description: 'A highlighted note.', use: 'Call out one idea.',
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] }],
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
} as ComponentDef;
const templateDef: ComponentDef = {
  ...base, name: 'rule', label: 'Rule', description: 'A divider.', insertTemplate: ':::rule\n:::',
} as ComponentDef;
const inertDef: ComponentDef = { ...base, name: 'inert', label: 'Inert', description: 'Nothing.' } as ComponentDef;

const registry = defineRegistry({ components: [schemaDef, templateDef, inertDef] });
const icons = { snowflake: 'M1 1h2' };

describe('ComponentInsertDialog', () => {
  it('lists actionable components with descriptions and omits inert ones', async () => {
    const screen = render(ComponentInsertDialog, { registry, insert: () => {}, icons } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    await expect.element(screen.getByText(/a highlighted note/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/call out one idea/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/^inert$/i)).not.toBeInTheDocument();
  });

  it('inserts a template-only def directly', async () => {
    const insert = vi.fn();
    const screen = render(ComponentInsertDialog, { registry, insert, icons } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    await screen.getByRole('button', { name: /rule/i }).click();
    expect(insert).toHaveBeenCalledWith(':::rule\n:::');
  });

  it('routes a schema def to the form and inserts the built markdown', async () => {
    const insert = vi.fn();
    const screen = render(ComponentInsertDialog, { registry, insert, icons } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    await screen.getByRole('button', { name: /callout/i }).click();
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('warning');
    await screen.getByRole('textbox', { name: /title/i }).fill('Careful');
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(insert).toHaveBeenCalledWith(':::callout[Careful]{tone="warning"}\n:::');
  });
});
