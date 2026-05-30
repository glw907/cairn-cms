import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ComponentPalette from '../../lib/components/ComponentPalette.svelte';

const registry = {
  defs: [
    { name: 'card', label: 'Card', description: 'A card', insertTemplate: ':::card\n## Title\n:::', build: (n: unknown) => n },
    { name: 'grid', label: 'Grid', description: 'A grid', insertTemplate: ':::grid\n:::', build: (n: unknown) => n },
  ],
};

describe('ComponentPalette', () => {
  it('lists registry components and inserts a template on click', async () => {
    const insert = vi.fn();
    const screen = render(ComponentPalette, { registry: registry as never, insert });
    await screen.getByRole('button', { name: /insert/i }).click();
    await screen.getByRole('button', { name: /card/i }).click();
    expect(insert).toHaveBeenCalledWith(':::card\n## Title\n:::');
  });

  it('renders nothing without a registry', async () => {
    const screen = render(ComponentPalette, { registry: undefined, insert: () => {} });
    expect(screen.container.textContent?.trim()).toBe('');
  });

  it('toggles aria-expanded on the trigger button', async () => {
    const screen = render(ComponentPalette, { registry: registry as never, insert: () => {} });
    const trigger = screen.getByRole('button', { name: /insert/i });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
