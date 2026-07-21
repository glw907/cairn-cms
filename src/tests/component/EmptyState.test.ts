import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import EmptyState from '../../lib/admin-toolkit/EmptyState.svelte';

/** A snippet with no render-time params, e.g. a fixed action button or a custom icon. */
function staticSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

describe('EmptyState', () => {
  it('renders the default cairn mark when no icon is given', () => {
    const screen = render(EmptyState, { heading: 'No posts yet', message: 'Stack your first one.' });
    expect(screen.container.querySelector('svg')).not.toBeNull();
  });

  it('renders a caller-supplied icon instead of the default mark', () => {
    const screen = render(EmptyState, {
      heading: 'No media yet',
      message: 'Upload an image and it shows up here.',
      icon: staticSnippet('<span data-testid="custom-icon"></span>'),
    });
    expect(screen.container.querySelector('svg')).toBeNull();
    expect(screen.container.querySelector('[data-testid="custom-icon"]')).not.toBeNull();
  });

  it('renders the heading and the muted message', () => {
    const screen = render(EmptyState, { heading: 'No posts yet', message: 'Stack your first one.' });
    expect(screen.container.textContent).toContain('No posts yet');
    expect(screen.container.textContent).toContain('Stack your first one.');
  });

  it('omits the action when not given, and renders it below the copy when given', () => {
    const bare = render(EmptyState, { heading: 'No posts yet', message: 'Stack your first one.' });
    expect(bare.container.querySelector('button')).toBeNull();

    const withAction = render(EmptyState, {
      heading: 'No posts yet',
      message: 'Stack your first one.',
      action: staticSnippet('<button type="button">New post</button>'),
    });
    expect(withAction.container.querySelector('button')?.textContent).toBe('New post');
  });
});
