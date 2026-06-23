import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
// EditPage's lifecycle controls render into the topbar context portal; EditPageDesk joins EditPage
// to that band the way CairnAdmin/AdminLayout do, the same harness the EditPage component tests use.
import EditPage from './EditPageDesk.svelte';
import { defineFields } from '../../lib/content/schema.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

// A concept whose Details panel carries a text field with an author-facing description and a second
// text field with none. `summary` lands in the Details panel (only the field named `title` hoists to
// the document title), so opening the panel reveals its input and the rendered hint.
const schema = defineFields([
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'summary', label: 'Summary', type: 'text', description: 'Shown in search results and when the post is shared.' },
]);

function props() {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: schema.fields,
      frontmatter: { title: 'Hello', summary: 'A short summary.' },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      mediaTargets: {},
      mediaLibrary: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      discardedFlash: false,
      preview: null,
      spellcheckDictionary: 'dictionary-en-us.txt',
      siteDictionary: [],
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      siteName: 'Test Site',
    },
    registry: undefined,
  };
}

describe('edit-page field hint', () => {
  it('renders a field description under the input and associates it for assistive tech', async () => {
    const page = render(EditPage, props());
    // The Details fields live behind the slide-over; open it to reach the summary input.
    await page.getByRole('button', { name: 'Details' }).click();

    // A field with a description renders the hint and associates it.
    const hint = page.getByText('Shown in search results and when the post is shared.');
    await expect.element(hint).toBeInTheDocument();
    const summary = page.getByRole('textbox', { name: 'Summary' });
    await expect.element(summary).toHaveAttribute('aria-describedby', expect.stringContaining('summary'));

    // A field with no description renders no hint and sets no aria-describedby.
    const title = page.getByRole('textbox', { name: 'Title' });
    await expect.element(title).not.toHaveAttribute('aria-describedby');
  });
});
