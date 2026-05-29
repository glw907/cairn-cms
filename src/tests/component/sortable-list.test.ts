import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { sortItems } from '@rodrigodagostino/svelte-sortable-list';
import SortableProbe from './SortableProbe.svelte';

describe('svelte-sortable-list under Svelte 5', () => {
  it('mounts a sortable list and renders its items', async () => {
    const screen = render(SortableProbe);
    await expect.element(screen.getByText('Alpha')).toBeInTheDocument();
    await expect.element(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('sortItems moves an item from one index to another', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(sortItems(items, 0, 2).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });
});
