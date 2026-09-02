import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { page } from 'vitest/browser';
import OfficeList from '../../lib/admin-toolkit/OfficeList.svelte';
// The header band now composes PageHeader (Task 9 of the 2026-09-01 conformance pass), so the
// compiled sheet proves the composed markup carries PageHeader's own rhythm classes, not a
// second, drifted copy of them.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

const rows = createRawSnippet(() => ({ render: () => '<table><tbody><tr><td>a row</td></tr></tbody></table>' }));
const action = createRawSnippet(() => ({ render: () => '<button type="button">New event</button>' }));

describe('OfficeList', () => {
  it('renders the eyebrow, title, meta, action, and the card content', async () => {
    const screen = await render(OfficeList, {
      eyebrow: 'Club',
      title: 'Events',
      meta: '12 upcoming',
      action,
      children: rows,
    });
    await expect.element(screen.getByText('Club')).toBeInTheDocument();
    await expect.element(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    await expect.element(screen.getByText('12 upcoming')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'New event' })).toBeInTheDocument();
    await expect.element(screen.getByText('a row')).toBeInTheDocument();
  });

  it('omits the eyebrow and meta line entirely when neither is passed', async () => {
    const screen = await render(OfficeList, { title: 'Events', children: rows });
    await expect.element(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.container.querySelector('header p')).toBeNull();
    expect(screen.container.querySelector('header span')).toBeNull();
  });

  it('renders its header band as PageHeader, one office-header implementation (Task 9 collapse)', async () => {
    const screen = await render(OfficeList, { eyebrow: 'Club', title: 'Events', meta: '12 upcoming', children: rows });
    const header = screen.container.querySelector('header')!;
    const stack = header.querySelector(':scope > div')!;
    const heading = screen.container.querySelector('header h1')!;
    const meta = screen.container.querySelector('header p')!;
    // PageHeader's own rhythm: mb-10 header offset, gap-0.5 inner stack, meta at type-meta, and
    // the page-h1 class PageHeader's own scoped text-wrap: balance style targets. None of these
    // classes exist on OfficeList's old, retired header markup, so their presence here is proof
    // OfficeList composes PageHeader rather than a second copy of it.
    expect(header.classList.contains('mb-10')).toBe(true);
    expect(stack.classList.contains('gap-0.5')).toBe(true);
    expect(meta.classList.contains('type-meta')).toBe(true);
    expect(meta.classList.contains('type-body')).toBe(false);
    expect(heading.classList.contains('page-h1')).toBe(true);
  });

  describe('the action alignment survives composition (C1, compiled sheet)', () => {
    let sheet: HTMLStyleElement;

    beforeAll(() => {
      // The compiled sheet's utility classes are all scoped under the [data-theme='cairn-admin']
      // selector (DaisyUI's theme gating), so nothing in it matches without the attribute set.
      document.documentElement.setAttribute('data-theme', 'cairn-admin');
      sheet = document.createElement('style');
      sheet.textContent = compiledAdminCss;
      document.head.appendChild(sheet);
    });

    afterAll(async () => {
      document.documentElement.removeAttribute('data-theme');
      sheet.remove();
      await page.viewport(1280, 720);
    });

    it('pins the header action to intrinsic width instead of stretching full-width below sm', async () => {
      await page.viewport(390, 700);
      const screen = await render(OfficeList, { title: 'Events', action, children: rows });
      const header = screen.container.querySelector('header')!;
      const wrapper = screen.getByRole('button', { name: 'New event' }).element().parentElement as HTMLElement;
      expect(getComputedStyle(wrapper).alignSelf).toBe('flex-start');
      expect(wrapper.getBoundingClientRect().width).toBeLessThan(header.getBoundingClientRect().width);
    });
  });
});
