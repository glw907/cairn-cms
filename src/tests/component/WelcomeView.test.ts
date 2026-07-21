import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WelcomeView from '../../lib/components/WelcomeView.svelte';
import type { WelcomeData } from '../../lib/sveltekit/content-routes.js';

function data(over: Partial<WelcomeData> = {}): WelcomeData {
  return { displayName: 'Ada', siteName: 'North Ridge Nordic', ...over };
}

describe('WelcomeView', () => {
  it('renders the greeting and the account-standing copy through the admin toolkit', async () => {
    // The admin-toolkit organization pass's T7 adoption sweep: WelcomeView re-expresses on the
    // toolkit's own EmptyState (the recipe this screen itself originated per the adoption map),
    // rather than a bespoke copy of the centered first-run fill.
    render(WelcomeView, { data: data() });
    await expect.element(page.getByText('Welcome, Ada')).toBeInTheDocument();
    await expect
      .element(page.getByText(/check with whoever administers North Ridge Nordic/))
      .toBeInTheDocument();
  });

  it('carries no create action, unlike a populated EmptyState first-run screen', async () => {
    const screen = render(WelcomeView, { data: data() });
    expect(screen.container.querySelector('button')).toBeNull();
    expect(screen.container.querySelector('a')).toBeNull();
  });
});
