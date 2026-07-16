import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
// EditPage's lifecycle controls render into the topbar context portal; EditPageDesk joins EditPage
// to that band the way CairnAdmin/CairnAdminShell do, the same harness the EditPage component tests use.
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

// Every v2 scalar arm under test. None is named `title` or `draft`, so all land in the Details panel.
const fields: NamedField[] = [
  { type: 'number', name: 'count', label: 'Count', integer: true, min: 0, max: 10 },
  { type: 'select', name: 'status', label: 'Status', options: ['draft', 'published'] },
  { type: 'url', name: 'site', label: 'Site' },
  { type: 'email', name: 'contact', label: 'Contact' },
  { type: 'datetime', name: 'when', label: 'When' },
  { type: 'multiselect', name: 'tags', label: 'Tags', options: ['training', 'racing'] },
  { type: 'multiselect', name: 'keywords', label: 'Keywords', creatable: true },
];

function props() {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields,
      frontmatter: {
        count: '3',
        status: 'published',
        site: 'https://example.com',
        contact: 'a@b.c',
        when: '2026-06-26T14:30',
        tags: ['training'],
        keywords: ['alpha', 'beta'],
      },
      body: 'The body.',
      title: '2026-05-hello',
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

async function openDetails(page: ReturnType<typeof render>) {
  await page.getByRole('button', { name: 'Details' }).click();
}

describe('EditPage v2 field arms', () => {
  it('renders a number input with its bounds and step', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    const count = page.getByLabelText('Count');
    await expect.element(count).toHaveAttribute('type', 'number');
    await expect.element(count).toHaveAttribute('min', '0');
    await expect.element(count).toHaveAttribute('max', '10');
    await expect.element(count).toHaveValue(3);
  });

  it('renders a select with a leading empty option and the stored value selected', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    const status = page.getByLabelText('Status');
    await expect.element(status).toHaveValue('published');
    const select = status.element() as unknown as HTMLSelectElement;
    expect(select.options[0].value).toBe('');
  });

  it('renders a url input typed as url', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    await expect.element(page.getByLabelText('Site')).toHaveAttribute('type', 'url');
  });

  it('renders an email input typed as email', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    await expect.element(page.getByLabelText('Contact')).toHaveAttribute('type', 'email');
  });

  it('renders a datetime-local input carrying the naive-local value', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    const when = page.getByLabelText('When');
    await expect.element(when).toHaveAttribute('type', 'datetime-local');
    await expect.element(when).toHaveValue('2026-06-26T14:30');
  });

  it('renders a closed multiselect as a checkbox group with the stored value checked', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    const training = page.getByRole('checkbox', { name: 'training' });
    await expect.element(training).toBeChecked();
    await expect.element(page.getByRole('checkbox', { name: 'racing' })).not.toBeChecked();
  });

  it('renders a creatable multiselect as a comma-joined text input', async () => {
    const page = render(EditPage, props());
    await openDetails(page);
    await expect.element(page.getByLabelText('Keywords')).toHaveValue('alpha, beta');
  });
});

// A single array(object) field, landing in the Details panel because it is not named title or draft.
const containerFields: NamedField[] = [
  {
    type: 'array',
    name: 'faq',
    label: 'FAQ',
    itemLabel: 'question',
    item: { type: 'object', fields: { question: { type: 'text', label: 'Question' }, answer: { type: 'textarea', label: 'Answer' } } },
  },
];

function containerProps() {
  const p = props();
  return { ...p, data: { ...p.data, fields: containerFields, frontmatter: { faq: [{ question: 'How?', answer: 'Like this.' }] } } };
}

describe('EditPage container field arms', () => {
  it('renders a RepeatableField for an array(object) field in the Details panel', async () => {
    const page = render(EditPage, containerProps());
    await openDetails(page);
    await expect.element(page.getByRole('button', { name: /add faq/i })).toBeInTheDocument();
    // The single seeded row shows its itemLabel value as the collapsed summary.
    const toggle = document.querySelector('[data-cairn-row-toggle]');
    expect(toggle).not.toBeNull();
    expect(toggle?.textContent).toContain('How?');
  });
});
