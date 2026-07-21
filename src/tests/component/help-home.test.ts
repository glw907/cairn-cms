import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import HelpHome from '../../lib/components/HelpHome.svelte';
import { markdownReference } from '../../lib/components/markdown-reference.js';
import type { HelpData } from '../../lib/sveltekit/content-routes.js';

// The full nine everyday reference rows the load forwards; the component curates by group.
const REFERENCE = markdownReference;

function fixture(over: Partial<HelpData> = {}): HelpData {
  return {
    gettingStarted: {
      wrotePost: true,
      publishedPost: false,
      createdPage: false,
      doneCount: 1,
      total: 3,
    },
    reference: REFERENCE,
    supportContact: 'help@example.org',
    ...over,
  };
}

describe('HelpHome', () => {
  it('renders its masthead through the admin toolkit', async () => {
    // The admin-toolkit organization pass's T7 adoption sweep: the masthead renders through
    // PageHeader; the section sub-headers below stay their own recipe this wave.
    const screen = render(HelpHome, { data: fixture() });
    const header = screen.container.querySelector('header.mb-10');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Help');
    expect(header?.textContent).toContain('If you need more, the get-help section below names who to ask.');
  });

  it('renders the masthead, the 1-of-3 progress with a Done tag, the reference table, and the email hand-off', async () => {
    render(HelpHome, { data: fixture() });

    await expect
      .element(page.getByRole('heading', { name: 'Find formatting help and get your site set up.' }))
      .toBeInTheDocument();
    await expect.element(page.getByText('1 of 3 done', { exact: false })).toBeInTheDocument();
    // Step 1 is done, so it shows the visible "Done" tag (exact, to skip the "of 3 done" count).
    await expect.element(page.getByText('Done', { exact: true })).toBeInTheDocument();
    // The reference tables expose their real column headers (one per reading column).
    await expect
      .element(page.getByRole('columnheader', { name: 'What it makes' }).first())
      .toBeInTheDocument();
    await expect.element(page.getByText('A link to one of your pages')).toBeInTheDocument();
    // The support hand-off is a mailto link whose accessible name names email.
    const email = page.getByRole('link', { name: /Email/ });
    await expect
      .element(email)
      .toHaveAttribute('href', expect.stringContaining('mailto:help@example.org'));
  });

  it('renders the hosted-help default as a Get help link', async () => {
    render(HelpHome, { data: fixture({ supportContact: 'https://cairn.pub/help' }) });

    const link = page.getByRole('link', { name: /Get help/ });
    await expect.element(link).toBeInTheDocument();
    await expect.element(link).toHaveAttribute('href', 'https://cairn.pub/help');
  });

  it('renders the self-serve get-help line and no email link when supportContact is unset', async () => {
    render(HelpHome, {
      data: fixture({
        supportContact: undefined,
        gettingStarted: {
          wrotePost: false,
          publishedPost: false,
          createdPage: false,
          doneCount: 0,
          total: 3,
        },
      }),
    });

    await expect
      .element(
        page.getByText('Check the formatting guide above, or ask whoever set up your site.'),
      )
      .toBeInTheDocument();
    // No mailto control to a blank contact.
    expect(page.getByRole('link', { name: /Email/ }).elements().length).toBe(0);
  });

  it('omits the whole getting-started section at 3 of 3 while the reference table still renders', async () => {
    render(HelpHome, {
      data: fixture({
        gettingStarted: {
          wrotePost: true,
          publishedPost: true,
          createdPage: true,
          doneCount: 3,
          total: 3,
        },
      }),
    });

    expect(page.getByRole('heading', { name: 'Your first steps' }).elements().length).toBe(0);
    await expect
      .element(page.getByRole('columnheader', { name: 'What it makes' }).first())
      .toBeInTheDocument();
  });
});
