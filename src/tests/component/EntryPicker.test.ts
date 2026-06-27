import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EntryPicker from '../../lib/components/EntryPicker.svelte';
import type { LinkTarget } from '../../lib/content/manifest.js';

const targets: LinkTarget[] = [
  { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  { concept: 'posts', id: '2026-01-04-waxing', permalink: '/2026/01/waxing', title: 'Waxing Guide', date: '2026-01-04', draft: false },
  { concept: 'posts', id: '2026-02-02-draft', permalink: '/2026/02/draft', title: 'Secret Draft', date: '2026-02-02', draft: true },
];

function open(
  props: Partial<{
    targets: LinkTarget[];
    choose: (t: LinkTarget) => void;
    conceptFilter: string;
    selectedIds: string[];
  }> = {},
) {
  const picked: LinkTarget[] = [];
  const screen = render(EntryPicker, {
    targets: props.targets ?? targets,
    choose: props.choose ?? ((t) => picked.push(t)),
    conceptFilter: props.conceptFilter,
    selectedIds: props.selectedIds,
  });
  return { screen, picked };
}

describe('EntryPicker', () => {
  it('opens from the trigger and lists targets grouped with Pages first', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    expect(text).toContain('Pages');
    expect(text).toContain('Posts');
    expect(text.indexOf('Pages')).toBeLessThan(text.indexOf('Posts'));
    expect(text).toContain('About Us');
    expect(text).toContain('Waxing Guide');
  });

  it('filters by a case-insensitive title substring', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('searchbox', { name: /search/i }).fill('wax');
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Waxing Guide');
    expect(text).not.toContain('About Us');
  });

  it('fires choose with the picked target', async () => {
    const { screen, picked } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('button', { name: /About Us/ }).click();
    expect(picked).toEqual([targets[0]]);
  });

  it('narrows the list to conceptFilter', async () => {
    const { screen } = open({ conceptFilter: 'posts' });
    await screen.getByRole('button', { name: /link to page/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Waxing Guide');
    expect(text).not.toContain('About Us');
  });

  it('marks an already-selected row', async () => {
    const { screen } = open({ selectedIds: ['about'] });
    await screen.getByRole('button', { name: /link to page/i }).click();
    // A selected row exposes aria-disabled and a Selected badge, so the host can show what it holds.
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Selected');
    const aboutButton = screen.container.querySelector('button[aria-disabled="true"]')!;
    expect(aboutButton.textContent).toContain('About Us');
  });
});
