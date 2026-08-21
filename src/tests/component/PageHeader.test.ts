import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import PageHeader from '../../lib/admin-toolkit/PageHeader.svelte';

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
});
