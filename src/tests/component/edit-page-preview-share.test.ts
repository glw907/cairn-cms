import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { stringify as devalueStringify } from 'devalue';
// EditPage's lifecycle controls render into the one header band through the topbar context
// portal, not in a header of their own; this harness mounts EditPage joined to that band the way
// CairnAdmin/CairnAdminShell do.
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

function postProps(over = {}) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      singular: 'Post',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ] satisfies NamedField[],
      frontmatter: { title: 'Hello', date: '2026-05-01', draft: false },
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
      pending: true,
      published: false,
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
      ...over,
    },
    registry: undefined,
  };
}

/** Stub `fetch` to answer one SvelteKit action-result envelope, success or failure. */
function stubFetchOnce(envelope: { type: 'success' | 'failure'; status: number; data: unknown }) {
  const spy = () =>
    Promise.resolve({
      type: 'basic',
      status: envelope.status,
      text: async () => JSON.stringify({ ...envelope, data: devalueStringify(envelope.data) }),
    } as unknown as Response);
  vi.stubGlobal('fetch', spy);
}

async function openDetails(screen: ReturnType<typeof render>) {
  await screen.getByRole('button', { name: 'Details' }).click();
}

describe('EditPage Share preview', () => {
  it('shows the Share preview group by default (the previewMint facade key is present)', async () => {
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await expect
      .element(screen.getByRole('button', { name: 'Share preview link' }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole('button', { name: 'Revoke all links' }))
      .toBeInTheDocument();
  });

  it('hides the Share preview group when the facade key is absent', async () => {
    const screen = render(EditPage, { ...postProps(), previewMint: false });
    await openDetails(screen);
    await expect
      .element(screen.getByRole('button', { name: 'Share preview link' }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('button', { name: 'Revoke all links' }))
      .not.toBeInTheDocument();
  });

  it('mints a preview link and renders the URL and its human expiry', async () => {
    const expiresAt = Date.UTC(2026, 7, 20, 18, 30);
    stubFetchOnce({
      type: 'success',
      status: 200,
      data: { url: 'https://example.com/preview/abc123', expiresAt },
    });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    const urlField = screen.getByLabelText('Preview link');
    await expect.element(urlField).toHaveValue('https://example.com/preview/abc123');
    const expected = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(expiresAt),
    );
    await expect
      .element(screen.getByText(`Expires ${expected}.`))
      .toBeInTheDocument();
    // Focus lands on the result so a keyboard author reaches it without hunting for it.
    await expect.poll(() => document.activeElement).toBe(urlField.element());
    vi.unstubAllGlobals();
  });

  it('renders the server\'s actionable refusal on a mint failure', async () => {
    stubFetchOnce({
      type: 'failure',
      status: 400,
      data: { error: 'This entry has no unpublished draft to share. Save an edit first.' },
    });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    await expect
      .element(screen.getByText('This entry has no unpublished draft to share. Save an edit first.'))
      .toBeInTheDocument();
    await expect.element(screen.getByLabelText('Preview link')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('renders the missing-migration refusal on a mint failure', async () => {
    stubFetchOnce({
      type: 'failure',
      status: 500,
      data: { error: 'The preview_tokens table is missing. Apply migrations/0003_preview.sql to AUTH_DB, then try again.' },
    });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    await expect
      .element(screen.getByText(/Apply migrations\/0003_preview\.sql/))
      .toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('revokes and reports the count', async () => {
    stubFetchOnce({ type: 'success', status: 200, data: { count: 2 } });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Revoke all links' }).click();
    await expect.element(screen.getByText('Revoked 2 links.')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('reports the zero-count variant when nothing was outstanding', async () => {
    stubFetchOnce({ type: 'success', status: 200, data: { count: 0 } });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Revoke all links' }).click();
    await expect.element(screen.getByText('No preview links to revoke.')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('never renders a URL in the revoke result, even right after a mint', async () => {
    const expiresAt = Date.UTC(2026, 7, 20, 18, 30);
    stubFetchOnce({
      type: 'success',
      status: 200,
      data: { url: 'https://example.com/preview/abc123', expiresAt },
    });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    await expect.element(screen.getByLabelText('Preview link')).toBeInTheDocument();

    stubFetchOnce({ type: 'success', status: 200, data: { count: 1 } });
    await screen.getByRole('button', { name: 'Revoke all links' }).click();
    await expect.element(screen.getByText('Revoked 1 link.')).toBeInTheDocument();
    // The revoked link's plaintext existed once, in the mint response; the hash-only store can
    // never reconstruct it, so the panel must never keep implying it is still good.
    await expect.element(screen.getByLabelText('Preview link')).not.toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toContain('https://example.com/preview/abc123');
    vi.unstubAllGlobals();
  });

  it('never renders a stale revoke result under a freshly minted URL', async () => {
    stubFetchOnce({ type: 'success', status: 200, data: { count: 2 } });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Revoke all links' }).click();
    await expect.element(screen.getByText('Revoked 2 links.')).toBeInTheDocument();

    const expiresAt = Date.UTC(2026, 7, 20, 18, 30);
    stubFetchOnce({
      type: 'success',
      status: 200,
      data: { url: 'https://example.com/preview/fresh', expiresAt },
    });
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    await expect.element(screen.getByLabelText('Preview link')).toHaveValue('https://example.com/preview/fresh');
    // A stale "Revoked 2 links." result would imply the store is empty right under a URL that
    // says otherwise.
    await expect.element(screen.getByText('Revoked 2 links.')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('clears a stale mint refusal once a revoke succeeds', async () => {
    stubFetchOnce({
      type: 'failure',
      status: 400,
      data: { error: 'This entry has no unpublished draft to share. Save an edit first.' },
    });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    await expect
      .element(screen.getByText('This entry has no unpublished draft to share. Save an edit first.'))
      .toBeInTheDocument();

    stubFetchOnce({ type: 'success', status: 200, data: { count: 0 } });
    await screen.getByRole('button', { name: 'Revoke all links' }).click();
    await expect.element(screen.getByText('No preview links to revoke.')).toBeInTheDocument();
    await expect
      .element(screen.getByText('This entry has no unpublished draft to share. Save an edit first.'))
      .not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('clears the whole share/revoke panel when navigation lands on another entry', async () => {
    stubFetchOnce({
      type: 'success',
      status: 200,
      data: { url: 'https://example.com/preview/entry-a', expiresAt: Date.UTC(2026, 7, 20, 18, 30) },
    });
    const screen = render(EditPage, postProps());
    await openDetails(screen);
    await screen.getByRole('button', { name: 'Share preview link' }).click();
    await expect.element(screen.getByLabelText('Preview link')).toBeInTheDocument();
    vi.unstubAllGlobals();

    // SvelteKit reuses the page component across a same-route navigation (the /admin/[...path]
    // route matches both entries), so a client-side hop to entry B must not carry entry A's
    // minted preview state onto entry B's Details panel.
    await screen.rerender(postProps({ id: '2026-06-other', slug: 'other' }));
    await openDetails(screen);
    await expect.element(screen.getByLabelText('Preview link')).not.toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toContain('https://example.com/preview/entry-a');

    // The revoke side must clear the same way.
    stubFetchOnce({ type: 'success', status: 200, data: { count: 3 } });
    await screen.getByRole('button', { name: 'Revoke all links' }).click();
    await expect.element(screen.getByText('Revoked 3 links.')).toBeInTheDocument();
    vi.unstubAllGlobals();

    await screen.rerender(postProps({ id: '2026-07-third', slug: 'third' }));
    await openDetails(screen);
    await expect.element(screen.getByText('Revoked 3 links.')).not.toBeInTheDocument();
  });
});
