import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import PageHeader from '../../lib/admin-toolkit/PageHeader.svelte';

/** A snippet with no render-time params, e.g. a fixed action button. */
function staticSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

describe('PageHeader', () => {
  it('renders the title as the page h1', () => {
    const screen = render(PageHeader, { title: 'Posts' });
    const h1 = screen.container.querySelector('h1')!;
    expect(h1.textContent).toBe('Posts');
  });

  it('omits the eyebrow when not given, and renders it above the title when given', () => {
    const bare = render(PageHeader, { title: 'Posts' });
    expect(bare.container.querySelector('header')?.textContent?.trim()).toBe('Posts');

    const withEyebrow = render(PageHeader, { title: 'Media library', eyebrow: 'Media' });
    const header = withEyebrow.container.querySelector('header')!;
    expect(header.textContent).toContain('Media');
    expect(header.textContent).toContain('Media library');
  });

  it('omits the meta line when not given, and renders it under the title when given', () => {
    const bare = render(PageHeader, { title: 'Posts' });
    expect(bare.container.querySelector('header p')).toBeNull();

    const withMeta = render(PageHeader, { title: 'Media library', meta: '128 images · 4 need alt text' });
    expect(withMeta.container.querySelector('header p')?.textContent).toBe('128 images · 4 need alt text');
  });

  it('omits the action slot when not given, and renders it top-right when given', () => {
    const bare = render(PageHeader, { title: 'Posts' });
    expect(bare.container.querySelector('button')).toBeNull();

    const withAction = render(PageHeader, {
      title: 'Posts',
      action: staticSnippet('<button type="button">New post</button>'),
    });
    expect(withAction.container.querySelector('button')?.textContent).toBe('New post');
  });
});
