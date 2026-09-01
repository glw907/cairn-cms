import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import PageHeader from '../../lib/admin-toolkit/PageHeader.svelte';
// The mobile action width test below measures against the compiled sheet, the same reasoning
// OfficeList's own suite states: the bare component render carries no stylesheet at all, so an
// unstyled stretched action would silently pass a DOM-structure-only test without proving the
// self-start fix (ported from OfficeList, Task 9 of the 2026-09-01 conformance pass).
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

/** A snippet with no render-time params, e.g. a fixed action button. */
function staticSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

describe('PageHeader', () => {
  it('renders the title as the page h1', async () => {
    const screen = await render(PageHeader, { title: 'Posts' });
    const h1 = screen.container.querySelector('h1')!;
    expect(h1.textContent).toBe('Posts');
  });

  it('omits the eyebrow when not given, and renders it above the title when given', async () => {
    const bare = await render(PageHeader, { title: 'Posts' });
    expect(bare.container.querySelector('header')?.textContent?.trim()).toBe('Posts');

    const withEyebrow = await render(PageHeader, { title: 'Media library', eyebrow: 'Media' });
    const header = withEyebrow.container.querySelector('header')!;
    expect(header.textContent).toContain('Media');
    expect(header.textContent).toContain('Media library');
  });

  it('omits the meta line when not given, and renders it under the title when given', async () => {
    const bare = await render(PageHeader, { title: 'Posts' });
    expect(bare.container.querySelector('header p')).toBeNull();

    const withMeta = await render(PageHeader, { title: 'Media library', meta: '128 images · 4 need alt text' });
    expect(withMeta.container.querySelector('header p')?.textContent).toBe('128 images · 4 need alt text');
  });

  it('zeroes the h1/p UA margins and sets the meta role, matching OfficeList', async () => {
    // Ruling 1 (Pass 2 Task 12): PageHeader ports OfficeList's own UA-margin fix, so the
    // eyebrow-title-meta stack renders the ruled 4px gap rather than a leaked ~58px one.
    // Ruling 2: the meta line joins the meta type role (13px), not the body role (14px).
    const withMeta = await render(PageHeader, { title: 'Media library', meta: '128 images' });
    const h1 = withMeta.container.querySelector('h1')!;
    const meta = withMeta.container.querySelector('header p')!;
    expect(h1.classList.contains('m-0')).toBe(true);
    expect(meta.classList.contains('m-0')).toBe(true);
    expect(meta.classList.contains('mt-1')).toBe(true);
    expect(meta.classList.contains('type-meta')).toBe(true);
    expect(meta.classList.contains('type-body')).toBe(false);
  });

  it('omits the action slot when not given, and renders it top-right when given', async () => {
    const bare = await render(PageHeader, { title: 'Posts' });
    expect(bare.container.querySelector('button')).toBeNull();

    const withAction = await render(PageHeader, {
      title: 'Posts',
      action: staticSnippet('<button type="button">New post</button>'),
    });
    expect(withAction.container.querySelector('button')?.textContent).toBe('New post');
  });

  it('wraps the action in a self-start container, so it never stretches full-width in the row', async () => {
    // Ported from OfficeList (Task 9): the flex row default (stretch) pulls the action full-width
    // below `sm` unless it is pinned to its intrinsic content width.
    const withAction = await render(PageHeader, {
      title: 'Posts',
      action: staticSnippet('<button type="button">New post</button>'),
    });
    const button = withAction.container.querySelector('button')!;
    const wrapper = button.parentElement as HTMLElement;
    expect(wrapper.classList.contains('self-start')).toBe(true);
  });

  describe('the header-stack gaps and the mobile action width (compiled sheet)', () => {
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
      const screen = await render(PageHeader, {
        title: 'Posts',
        action: staticSnippet('<button type="button">New post</button>'),
      });
      const header = screen.container.querySelector('header')!;
      const button = screen.container.querySelector('button')!;
      const wrapper = button.parentElement as HTMLElement;
      expect(getComputedStyle(wrapper).alignSelf).toBe('flex-start');
      expect(wrapper.getBoundingClientRect().width).toBeLessThan(header.getBoundingClientRect().width);
    });

    it('zeroes the leaked child prose margins so the meta line sits ~4px under the h1 and the eyebrow sits tight above it', async () => {
      // Ported from OfficeList (Task 9 of the 2026-09-01 conformance pass): the header stack now
      // has one implementation, this component, so the measured proof of the UA-margin fix moves
      // here rather than disappearing with OfficeList's own duplicate header markup.
      await page.viewport(1440, 900);
      const screen = await render(PageHeader, { eyebrow: 'Club', title: 'Events', meta: '12 upcoming' });
      const eyebrow = screen.container.querySelector('header span')!;
      const heading = screen.container.querySelector('header h1')!;
      const meta = screen.container.querySelector('header p')!;
      const eyebrowToHeadingGap = heading.getBoundingClientRect().top - eyebrow.getBoundingClientRect().bottom;
      const headingToMetaGap = meta.getBoundingClientRect().top - heading.getBoundingClientRect().bottom;
      // Flex does not collapse child margins, so a stray UA h1/p margin used to blow the rendered
      // gap out to ~32px against the container's own gap-0.5 (2px) intent. The acceptance band is
      // 0-6px at both 1440 and 390 (the inner eyebrow/h1/meta stack does not change orientation
      // across that breakpoint, only the outer header row/column does).
      expect(eyebrowToHeadingGap).toBeGreaterThanOrEqual(0);
      expect(eyebrowToHeadingGap).toBeLessThanOrEqual(6);
      expect(headingToMetaGap).toBeGreaterThanOrEqual(0);
      expect(headingToMetaGap).toBeLessThanOrEqual(6);
    });

    it('zeroes the leaked child prose margins at the mobile width too', async () => {
      await page.viewport(390, 700);
      const screen = await render(PageHeader, { eyebrow: 'Club', title: 'Events', meta: '12 upcoming' });
      const eyebrow = screen.container.querySelector('header span')!;
      const heading = screen.container.querySelector('header h1')!;
      const meta = screen.container.querySelector('header p')!;
      const eyebrowToHeadingGap = heading.getBoundingClientRect().top - eyebrow.getBoundingClientRect().bottom;
      const headingToMetaGap = meta.getBoundingClientRect().top - heading.getBoundingClientRect().bottom;
      expect(eyebrowToHeadingGap).toBeGreaterThanOrEqual(0);
      expect(eyebrowToHeadingGap).toBeLessThanOrEqual(6);
      expect(headingToMetaGap).toBeGreaterThanOrEqual(0);
      expect(headingToMetaGap).toBeLessThanOrEqual(6);
    });
  });
});
