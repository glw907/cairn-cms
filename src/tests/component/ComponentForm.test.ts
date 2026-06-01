import { describe, it, expect, vi } from 'vitest';
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
    expect(screen.container.querySelectorAll('select option').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onBack when Back is clicked', async () => {
    const onBack = (await import('vitest')).vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack } as never);
    await screen.getByRole('button', { name: /back/i }).click();
    expect(onBack).toHaveBeenCalled();
  });

  it('names a flat field by its visible label without a redundant aria-label', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    // The textbox is found by its visible <label> text, proving the for/id pairing names it.
    const title = screen.getByRole('textbox', { name: 'Title' });
    await expect.element(title).toBeInTheDocument();
    // No redundant aria-label: the visible label is the sole accessible-name source.
    await expect.element(title).not.toHaveAttribute('aria-label');
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
    expect(screen.container.querySelectorAll('input[aria-label^="Points "]').length).toBe(2);
    await screen.getByRole('button', { name: /remove item 1/i }).click();
    expect(screen.container.querySelectorAll('input[aria-label^="Points "]').length).toBe(1);
  });

  it('gives each repeatable item input a 1-based indexed accessible name', async () => {
    const screen = render(ComponentForm, { def: grid, onInsert: () => {}, onBack: () => {} } as never);
    const add = screen.getByRole('button', { name: /add item/i });
    await add.click();
    await add.click();
    await expect.element(screen.getByRole('textbox', { name: 'Points 1' })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: 'Points 2' })).toBeInTheDocument();
  });

  it('keeps repeatable item values in order after a mid-list removal', async () => {
    const screen = render(ComponentForm, { def: grid, onInsert: () => {}, onBack: () => {} } as never);
    const add = screen.getByRole('button', { name: /add item/i });
    await add.click();
    await add.click();
    await add.click();
    const inputs = () => screen.container.querySelectorAll<HTMLInputElement>('input[aria-label^="Points "]');
    await screen.getByRole('textbox', { name: 'Points 1' }).fill('a');
    await screen.getByRole('textbox', { name: 'Points 2' }).fill('b');
    await screen.getByRole('textbox', { name: 'Points 3' }).fill('c');
    // Capture the third item's DOM node before removal. With a stable per-item key the "c" node
    // survives the splice unchanged; an index key reuses node positions, so the node that held
    // "c" is destroyed and the value identity does not follow the data.
    const cNodeBefore = inputs()[2];
    await screen.getByRole('button', { name: /remove item 2/i }).click();
    const remaining = inputs();
    expect(remaining.length).toBe(2);
    expect(remaining[0].value).toBe('a');
    expect(remaining[1].value).toBe('c');
    // The surviving "c" input is the same DOM node it was before, proving identity followed data.
    expect(remaining[1]).toBe(cNodeBefore);
  });
});

describe('ComponentForm submit', () => {
  it('inserts serialized markdown when valid', async () => {
    const onInsert = vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert, onBack: () => {} } as never);
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('note');
    await screen.getByRole('textbox', { name: /title/i }).fill('Heads up');
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(onInsert).toHaveBeenCalledWith(':::callout[Heads up]{tone="note"}\n:::');
  });

  it('shows inline errors and does not insert when required fields are empty', async () => {
    const onInsert = vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert, onBack: () => {} } as never);
    await screen.getByRole('button', { name: /^insert$/i }).click();
    expect(onInsert).not.toHaveBeenCalled();
    await expect.element(screen.getByText(/tone is required/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/title is required/i)).toBeInTheDocument();
    await expect
      .element(screen.getByRole('combobox', { name: /tone/i }))
      .toHaveAttribute('aria-invalid', 'true');
  });
});
