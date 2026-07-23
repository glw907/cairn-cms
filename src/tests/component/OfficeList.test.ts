import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { page } from 'vitest/browser';
import OfficeList from '../../lib/components/OfficeList.svelte';
// The header-stack margin fix and the mobile action self-start fix are both Tailwind utility
// classes; the compiled sheet carries the real cascade the tests below measure against (the
// bare component render has no stylesheet at all, so an unstyled UA h1/p margin would silently
// pass a DOM-structure-only test without proving the CSS fix).
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

const rows = createRawSnippet(() => ({ render: () => '<table><tbody><tr><td>a row</td></tr></tbody></table>' }));
const action = createRawSnippet(() => ({ render: () => '<button type="button">New event</button>' }));

describe('OfficeList', () => {
  it('renders the eyebrow, title, subtitle, action, and the card content', async () => {
    const screen = render(OfficeList, {
      eyebrow: 'Club',
      title: 'Events',
      subtitle: '12 upcoming',
      action,
      children: rows,
    });
    await expect.element(screen.getByText('Club')).toBeInTheDocument();
    await expect.element(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    await expect.element(screen.getByText('12 upcoming')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'New event' })).toBeInTheDocument();
    await expect.element(screen.getByText('a row')).toBeInTheDocument();
  });

  it('omits the eyebrow and subtitle entirely when neither is passed', async () => {
    const screen = render(OfficeList, { title: 'Events', children: rows });
    await expect.element(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.container.querySelector('header p')).toBeNull();
    expect(screen.container.querySelector('header span')).toBeNull();
  });

  describe('header stack gaps and the mobile action width (C1, compiled sheet)', () => {
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

    it('zeroes the leaked child prose margins so the subtitle sits ~4px under the h1 and the eyebrow sits tight above it', async () => {
      await page.viewport(1440, 900);
      const screen = render(OfficeList, {
        eyebrow: 'Club',
        title: 'Events',
        subtitle: '12 upcoming',
        children: rows,
      });
      const eyebrow = screen.container.querySelector('header span')!;
      const heading = screen.container.querySelector('header h1')!;
      const subtitle = screen.container.querySelector('header p')!;
      const eyebrowToHeadingGap = heading.getBoundingClientRect().top - eyebrow.getBoundingClientRect().bottom;
      const headingToSubtitleGap = subtitle.getBoundingClientRect().top - heading.getBoundingClientRect().bottom;
      // Flex does not collapse child margins, so a stray UA h1/p margin used to blow the rendered
      // gap out to ~32px against the container's own gap-0.5 (2px) intent. The acceptance band is
      // 0-6px at both 1440 and 390 (the inner eyebrow/h1/subtitle stack does not change orientation
      // across that breakpoint, only the outer header row/column does).
      expect(eyebrowToHeadingGap).toBeGreaterThanOrEqual(0);
      expect(eyebrowToHeadingGap).toBeLessThanOrEqual(6);
      expect(headingToSubtitleGap).toBeGreaterThanOrEqual(0);
      expect(headingToSubtitleGap).toBeLessThanOrEqual(6);
    });

    it('zeroes the leaked child prose margins at the mobile width too', async () => {
      await page.viewport(390, 700);
      const screen = render(OfficeList, {
        eyebrow: 'Club',
        title: 'Events',
        subtitle: '12 upcoming',
        children: rows,
      });
      const eyebrow = screen.container.querySelector('header span')!;
      const heading = screen.container.querySelector('header h1')!;
      const subtitle = screen.container.querySelector('header p')!;
      const eyebrowToHeadingGap = heading.getBoundingClientRect().top - eyebrow.getBoundingClientRect().bottom;
      const headingToSubtitleGap = subtitle.getBoundingClientRect().top - heading.getBoundingClientRect().bottom;
      expect(eyebrowToHeadingGap).toBeGreaterThanOrEqual(0);
      expect(eyebrowToHeadingGap).toBeLessThanOrEqual(6);
      expect(headingToSubtitleGap).toBeGreaterThanOrEqual(0);
      expect(headingToSubtitleGap).toBeLessThanOrEqual(6);
    });

    it('pins the header action to intrinsic width instead of stretching full-width below sm', async () => {
      await page.viewport(390, 700);
      const screen = render(OfficeList, { title: 'Events', action, children: rows });
      const header = screen.container.querySelector('header')!;
      const wrapper = screen.getByRole('button', { name: 'New event' }).element().parentElement as HTMLElement;
      expect(getComputedStyle(wrapper).alignSelf).toBe('flex-start');
      expect(wrapper.getBoundingClientRect().width).toBeLessThan(header.getBoundingClientRect().width);
    });
  });
});
