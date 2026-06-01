import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentForm from '../../lib/components/ComponentForm.svelte';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };
const callout: ComponentDef = {
  ...base, name: 'callout', label: 'Callout',
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
    { key: 'pinned', label: 'Pinned', type: 'boolean' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
} as ComponentDef;

describe('ComponentForm fields', () => {
  it('renders a labeled field for each attribute and non-repeatable slot', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    await expect.element(screen.getByRole('combobox', { name: /tone/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('checkbox', { name: /pinned/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /body/i })).toBeInTheDocument();
  });

  it('lists the select options from the schema', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    expect(screen.container.querySelectorAll('select[aria-label="Tone"] option').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onBack when Back is clicked', async () => {
    const onBack = (await import('vitest')).vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack } as never);
    await screen.getByRole('button', { name: /back/i }).click();
    expect(onBack).toHaveBeenCalled();
  });
});

const grid: ComponentDef = {
  ...base, name: 'grid', label: 'Grid',
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'points', label: 'Points', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
} as ComponentDef;

describe('ComponentForm repeatable slot', () => {
  it('adds and removes items in a repeatable slot', async () => {
    const screen = render(ComponentForm, { def: grid, onInsert: () => {}, onBack: () => {} } as never);
    await screen.getByRole('button', { name: /add item/i }).click();
    await screen.getByRole('button', { name: /add item/i }).click();
    expect(screen.container.querySelectorAll('input[aria-label="Points item"]').length).toBe(2);
    await screen.getByRole('button', { name: /remove item 1/i }).click();
    expect(screen.container.querySelectorAll('input[aria-label="Points item"]').length).toBe(1);
  });
});
