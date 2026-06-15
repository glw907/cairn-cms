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

  it('shows an inline required error on a touched-empty field and keeps Insert disabled', async () => {
    const onInsert = vi.fn();
    const screen = render(ComponentForm, { def: callout, onInsert, onBack: () => {} } as never);
    // Touch the required title by filling then clearing it, the way the incomplete state arises.
    const title = screen.getByRole('textbox', { name: /title/i });
    await title.fill('x');
    await title.fill('');
    await expect.element(screen.getByText(/title is required/i)).toBeInTheDocument();
    await expect.element(title).toHaveAttribute('aria-invalid', 'true');
    // Insert never fired and stays disabled while a required field is empty.
    await expect.element(screen.getByRole('button', { name: /^insert$/i })).toBeDisabled();
    expect(onInsert).not.toHaveBeenCalled();
  });
});

describe('ComponentForm required-field marking and Insert gating', () => {
  it('marks a required field with an asterisk and aria-required', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    const tone = screen.getByRole('combobox', { name: /tone/i });
    await expect.element(tone).toHaveAttribute('aria-required', 'true');
    // The visible asterisk sits beside the required field's label.
    expect(screen.container.querySelectorAll('[data-testid="cairn-pk-req"]').length).toBeGreaterThanOrEqual(1);
  });

  it('disables Insert while a required field is empty and enables it once filled', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    const insert = screen.getByRole('button', { name: /^insert$/i });
    await expect.element(insert).toBeDisabled();
    await screen.getByRole('combobox', { name: /tone/i }).selectOptions('note');
    await screen.getByRole('textbox', { name: /title/i }).fill('Heads up');
    await expect.element(insert).not.toBeDisabled();
  });

  it('marks required slot inputs with aria-required', async () => {
    const screen = render(ComponentForm, { def: requiredSlots, onInsert: () => {}, onBack: () => {} } as never);
    // The required inline (text) slot and the required markdown (textarea) slot both expose
    // requiredness programmatically, not only through the visible asterisk.
    await expect.element(screen.getByRole('textbox', { name: /headline/i })).toHaveAttribute('aria-required', 'true');
    await expect.element(screen.getByRole('textbox', { name: /summary/i })).toHaveAttribute('aria-required', 'true');
  });
});

const requiredSlots: ComponentDef = {
  ...base, name: 'feature', label: 'Feature',
  slots: [
    { name: 'headline', label: 'Headline', kind: 'inline', required: true },
    { name: 'summary', label: 'Summary', kind: 'markdown', required: true },
  ],
} as ComponentDef;

const repeatable: ComponentDef = {
  ...base, name: 'list', label: 'List',
  slots: [
    {
      name: 'points', label: 'Point', kind: 'repeatable',
      itemFields: [{ key: 'text', label: 'Item', type: 'text' }],
      itemLabel: (item) => (typeof item.text === 'string' ? item.text.slice(0, 12) : ''),
    },
  ],
} as ComponentDef;

describe('ComponentForm itemLabel', () => {
  it('labels a repeatable row from itemLabel and falls back to the index when it is empty', async () => {
    const screen = render(ComponentForm, { def: repeatable, onInsert: () => {}, onBack: () => {} } as never);
    const add = screen.getByRole('button', { name: /add/i });
    await add.click();
    // Empty item: itemLabel returns '', so the row falls back to the indexed label.
    await expect.element(screen.getByRole('textbox', { name: 'Point 1' })).toBeInTheDocument();
    // Once filled, the row tag reflects itemLabel's derived value.
    await screen.getByRole('textbox', { name: 'Point 1' }).fill('Adult $18');
    await expect.element(screen.getByText('Adult $18')).toBeInTheDocument();
  });
});

const previewCallout: ComponentDef = {
  ...base, name: 'callout', label: 'Callout',
  preview: { attributes: { tone: 'note' }, slots: { title: 'Sample title', body: 'Sample body' } },
  attributes: [{ key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] }],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
} as ComponentDef;

describe('ComponentForm preview seeding', () => {
  it('seeds the form from previewValues when the def declares a preview', async () => {
    const screen = render(ComponentForm, { def: previewCallout, onInsert: () => {}, onBack: () => {} } as never);
    await expect.element(screen.getByRole('textbox', { name: /title/i })).toHaveValue('Sample title');
    await expect.element(screen.getByRole('combobox', { name: /tone/i })).toHaveValue('note');
  });

  it('focuses the first field on mount', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, onBack: () => {} } as never);
    const tone = screen.getByRole('combobox', { name: /tone/i });
    await expect.element(tone).toBeInTheDocument();
    expect(document.activeElement).toBe(tone.element());
  });
});

describe('ComponentForm initial values', () => {
  it('seeds the form from initial when provided, overriding previewValues', async () => {
    const initial = {
      attributes: { tone: 'warning', pinned: true },
      slots: { title: 'Edited title', body: 'Edited body' },
    };
    const screen = render(ComponentForm, {
      def: previewCallout, onInsert: () => {}, initial,
    } as never);
    await expect.element(screen.getByRole('textbox', { name: /title/i })).toHaveValue('Edited title');
    await expect.element(screen.getByRole('combobox', { name: /tone/i })).toHaveValue('warning');
  });
});

describe('ComponentForm submit label', () => {
  it('renders the submit button with the default Insert label', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {} } as never);
    await expect.element(screen.getByRole('button', { name: /^insert$/i })).toBeInTheDocument();
  });

  it('renders the submit button with a custom submitLabel', async () => {
    const screen = render(ComponentForm, { def: callout, onInsert: () => {}, submitLabel: 'Update' } as never);
    await expect.element(screen.getByRole('button', { name: /^update$/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /^insert$/i })).not.toBeInTheDocument();
  });
});
