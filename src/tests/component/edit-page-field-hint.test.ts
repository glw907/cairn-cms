import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
// EditPage's lifecycle controls render into the topbar context portal; EditPageDesk joins EditPage
// to that band the way CairnAdmin/CairnAdminShell do, the same harness the EditPage component tests use.
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

// A concept whose Details panel carries a text field with author-facing help and a second text field
// with none. `summary` lands in the Details panel (only the field named `title` hoists to the
// document title), so opening the panel reveals its input and the rendered hint.
const schema: NamedField[] = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'summary', label: 'Summary', type: 'text', help: 'Shown in search results and when the post is shared.' },
];

// A concept whose Details panel carries two date fields with distinct names and non-overlapping
// labels: one with no help (so it falls back to the built-in publish-clarity default) and one whose
// site copy overrides it. Neither is named `title` or `draft`, so both land in the panel.
const dateSchema: NamedField[] = [
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'deadline', label: 'Deadline', type: 'date', help: 'Custom date help.' },
];

function props() {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: schema,
      frontmatter: { title: 'Hello', summary: 'A short summary.' },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      fragmentTargets: null,
      routable: true,
      mediaTargets: {},
      mediaLibrary: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      publishActions: [],
      discardedFlash: false,
      preview: null,
      spellcheckDictionary: 'dictionary-en-us.txt',
      siteDictionary: [],
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      advisories: [],
      orphanTags: [],
      siteName: 'Test Site',
    },
    registry: undefined,
  };
}

function dateProps() {
  const base = props();
  return {
    ...base,
    data: {
      ...base.data,
      fields: dateSchema,
      frontmatter: { date: '2026-05-01', deadline: '2026-05-08' },
    },
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

  it('gives a date field with no description a built-in publish-clarity default that site copy overrides', async () => {
    const page = render(EditPage, dateProps());
    // The Details fields live behind the slide-over; open it to reach the date inputs.
    await page.getByRole('button', { name: 'Details' }).click();

    // A date field with no description shows the built-in publish-clarity default.
    const dateDefault = page.getByText('Sets the date for this post. Publishing is a separate step you choose.');
    await expect.element(dateDefault).toBeInTheDocument();
    const dateInput = page.getByLabelText('Date');
    await expect.element(dateInput).toHaveAttribute('aria-describedby', expect.stringContaining('date'));

    // A date field with a description shows the site's copy, not the default.
    await expect.element(page.getByText('Custom date help.')).toBeInTheDocument();
  });
});
