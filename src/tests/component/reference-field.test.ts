import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from './EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

// An author reference (single) to a page, and a related reference array to posts. Neither is named
// `title` or `draft`, so both land in the Details slide-over where the reference editor arm lives.
const fields: NamedField[] = [
  { type: 'reference', name: 'author', label: 'Author', concept: 'pages' },
  { type: 'array', name: 'related', label: 'Related', item: { type: 'reference', label: '', concept: 'posts' } },
];

// The site's link targets, the same projection editLoad ships on EditData.linkTargets.
const linkTargets: LinkTarget[] = [
  { concept: 'pages', id: 'jane-doe', permalink: '/team/jane-doe', title: 'Jane Doe', draft: false },
  { concept: 'pages', id: 'john-roe', permalink: '/team/john-roe', title: 'John Roe', draft: false },
  { concept: 'posts', id: 'a-post', permalink: '/blog/a-post', title: 'A Post', date: '2026-01-01', draft: false },
  { concept: 'posts', id: 'b-post', permalink: '/blog/b-post', title: 'B Post', date: '2026-02-01', draft: false },
];

function props(frontmatter: Record<string, unknown>) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields,
      frontmatter,
      body: 'The body.',
      title: '2026-05-hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets,
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
      advisories: [],
      siteName: 'Test Site',
    },
    registry: undefined,
  };
}

async function openDetails(page: ReturnType<typeof render>) {
  await page.getByRole('button', { name: 'Details' }).click();
}

function hiddenInputs(page: ReturnType<typeof render>, name: string): HTMLInputElement[] {
  return [...page.container.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)];
}

describe('ReferenceField editor arm', () => {
  it('renders a single reference resolved to its target title and emits a hidden input', async () => {
    const page = render(EditPage, props({ author: 'jane-doe' }));
    await openDetails(page);
    // The combobox trigger shows the resolved title, not the bare id (the picker dialog also lists the
    // title, so scope the assertion to the trigger button by its field-label accessible name).
    const trigger = page.getByRole('button', { name: 'Author' });
    await expect.element(trigger).toHaveTextContent('Jane Doe');
    const inputs = hiddenInputs(page, 'author');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe('jane-doe');
  });

  it('changes the single reference on pick, setting the hidden input to the new id', async () => {
    const page = render(EditPage, props({ author: 'jane-doe' }));
    await openDetails(page);
    // Open the picker scoped to pages, then pick John Roe.
    await page.getByRole('button', { name: /author/i }).click();
    await page.getByRole('button', { name: /John Roe/ }).click();
    const inputs = hiddenInputs(page, 'author');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe('john-roe');
  });

  it('renders an array reference as chips with one hidden input per id', async () => {
    const page = render(EditPage, props({ related: ['a-post', 'b-post'] }));
    await openDetails(page);
    // The chips carry the resolved titles (the picker dialog lists them too, so read the chips by
    // their remove-control accessible names, which name the resolved title).
    await expect.element(page.getByRole('button', { name: 'Remove A Post' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Remove B Post' })).toBeInTheDocument();
    const inputs = hiddenInputs(page, 'related');
    expect(inputs.map((i) => i.value)).toEqual(['a-post', 'b-post']);
  });

  it('appends a hidden input when an array id is added through the picker', async () => {
    const page = render(EditPage, props({ related: ['a-post'] }));
    await openDetails(page);
    await page.getByRole('button', { name: /add related/i }).click();
    await page.getByRole('button', { name: /B Post/ }).click();
    const inputs = hiddenInputs(page, 'related');
    expect(inputs.map((i) => i.value)).toEqual(['a-post', 'b-post']);
  });

  it('drops the hidden input when a chip is removed', async () => {
    const page = render(EditPage, props({ related: ['a-post', 'b-post'] }));
    await openDetails(page);
    await page.getByRole('button', { name: /remove A Post/i }).click();
    const inputs = hiddenInputs(page, 'related');
    expect(inputs.map((i) => i.value)).toEqual(['b-post']);
  });
});
