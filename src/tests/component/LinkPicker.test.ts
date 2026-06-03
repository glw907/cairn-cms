import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LinkPicker from '../../lib/components/LinkPicker.svelte';
import type { LinkTarget } from '../../lib/content/manifest.js';

const targets: LinkTarget[] = [
  { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  { concept: 'posts', id: '2026-01-04-waxing', permalink: '/2026/01/waxing', title: 'Waxing Guide', date: '2026-01-04', draft: false },
  { concept: 'posts', id: '2026-02-02-draft', permalink: '/2026/02/draft', title: 'Secret Draft', date: '2026-02-02', draft: true },
];

function open(props: Partial<{ linkTargets: LinkTarget[]; insert: (href: string, title: string) => void }> = {}) {
  const calls: { href: string; title: string }[] = [];
  const screen = render(LinkPicker, {
    linkTargets: props.linkTargets ?? targets,
    insert: props.insert ?? ((href, title) => calls.push({ href, title })),
  });
  return { screen, calls };
}

describe('LinkPicker', () => {
  it('opens the dialog from the trigger and lists targets grouped with Pages first', async () => {
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

  it('shows a post date and a draft badge', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('2026-01-04');
    expect(text).toContain('Draft');
  });

  it('filters by a case-insensitive title substring', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('searchbox', { name: /search/i }).fill('wax');
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Waxing Guide');
    expect(text).not.toContain('About Us');
  });

  it('inserts the cairn token for the picked target and closes', async () => {
    const { screen, calls } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('button', { name: /About Us/ }).click();
    expect(calls).toEqual([{ href: 'cairn:pages/about', title: 'About Us' }]);
    await expect.poll(() => screen.container.querySelector('dialog')!.open).toBe(false);
  });

  it('shows an empty state with no targets', async () => {
    const { screen } = open({ linkTargets: [] });
    await screen.getByRole('button', { name: /link to page/i }).click();
    expect(screen.container.querySelector('dialog')!.textContent ?? '').toMatch(/no pages or posts/i);
  });

  it('orders unlisted concepts by heading', async () => {
    const targets = [
      { concept: 'zebra', id: 'z1', permalink: '/z1', title: 'Zebra One', draft: false },
      { concept: 'apple', id: 'a1', permalink: '/a1', title: 'Apple One', draft: false },
    ];
    const screen = render(LinkPicker, { linkTargets: targets, insert: () => {} });
    await screen.getByRole('button', { name: /link to page/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    // Headings are 'Apple' and 'Zebra'; Apple sorts first.
    expect(text.indexOf('Apple')).toBeLessThan(text.indexOf('Zebra'));
  });
});
