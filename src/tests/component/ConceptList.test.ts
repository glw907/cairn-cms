import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ConceptList from '../../lib/components/ConceptList.svelte';
// The compiled sheet's text (daisyUI's real .badge/.input/.btn sizing), injected only for the
// narrow/wide extremes suite below so its bounding-box measurements reflect production control
// footprints, never the UA-default widths the source partial alone leaves (the EditPage pattern).
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

function data(over = {}) {
  // The default sort is newest-first, so the last entry (Post 12) leads page 1; the draft sits there
  // so the draft-badge assertion sees it on the default view.
  const entries = Array.from({ length: 12 }, (_, i) => ({
    id: `2026-05-${String(i + 1).padStart(2, '0')}-post-${i + 1}`,
    title: `Post ${String(i + 1).padStart(2, '0')}`,
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    draft: i === 11,
    status: 'published' as const,
    summary: null,
  }));
  const base = { conceptId: 'posts', label: 'Posts', dated: true, routable: true, entries, error: null, formError: null, publishedAll: null };
  const merged = { ...base, ...over };
  // The descriptor defaults `singular` to the label; mirror that here so an override of `label`
  // alone (e.g. Pages) carries through to the create affordances, unless a test sets `singular`.
  return { singular: merged.label, ...merged, ...over };
}

describe('ConceptList', () => {
  it('renders entries as table rows linking to their editor', async () => {
    const screen = render(ConceptList, { data: data() });
    // Newest-first, so Post 12 leads page 1.
    await expect.element(screen.getByRole('link', { name: 'Post 12' })).toHaveAttribute('href', '/admin/posts/2026-05-12-post-12');
  });

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(ConceptList, { data: data() });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
  });

  it('flags a draft row with a Hidden tag by the title', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByText('Hidden', { exact: true })).toBeInTheDocument();
  });

  it('renders the status pills as one family: shared wash and ink, New semibold, Edited the act-on tint', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'new' as const, summary: null },
      { id: 'beta', title: 'Beta', date: '2026-05-02', draft: false, status: 'edited' as const, summary: null },
      { id: 'gamma', title: 'Gamma', date: '2026-05-01', draft: false, status: 'published' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    const badge = (text: string) =>
      Array.from(screen.container.querySelectorAll('tbody .badge')).find(
        (el) => el.textContent?.trim() === text,
      );
    await expect.element(screen.getByText('New', { exact: true })).toBeInTheDocument();
    // One pill family (the emphasis ladder): New and Published share geometry and the neutral
    // wash + full ink, and differ on exactly one attribute (weight). Edited alone carries the
    // violet act-on tint, rhyming with the topbar's Publish pill. No semantic hues remain here.
    expect(badge('New')?.classList.contains('bg-base-content/[0.06]')).toBe(true);
    expect(badge('New')?.classList.contains('font-semibold')).toBe(true);
    expect(badge('Published')?.classList.contains('bg-base-content/[0.06]')).toBe(true);
    expect(badge('Published')?.classList.contains('font-medium')).toBe(true);
    expect(badge('Edited')?.classList.contains('text-primary')).toBe(true);
    expect(badge('Edited')?.classList.contains('bg-primary/10')).toBe(true);
    // The E3 tracking scale (design arc 2026-07-15): every status pill sits <= 13px semibold, so
    // all three take the semibold tracking band, never the bare 0.08em eyebrow or plain body ink.
    expect(badge('New')?.classList.contains('tracking-small-semibold')).toBe(true);
    expect(badge('Published')?.classList.contains('tracking-small-semibold')).toBe(true);
    expect(badge('Edited')?.classList.contains('tracking-small-semibold')).toBe(true);
  });

  it('composes the header and the triage bar on the F3 proximity scale', async () => {
    // The header is the page's one loose element (mb-10, the page-gap step); the triage bar
    // belongs to the card below it (mb-3, the belongs-to-its-neighbor step). Design arc
    // 2026-07-15's F3 ruling; the scale itself is documented in cairn-admin.css.
    const screen = render(ConceptList, { data: data() });
    const header = screen.container.querySelector('header')!;
    expect(header.classList.contains('mb-10')).toBe(true);
    const triageGroup = screen.container.querySelector('[role="group"][aria-label="Filter by publish state"]')!;
    const triageBar = triageGroup.parentElement!;
    expect(triageBar.classList.contains('mb-3')).toBe(true);
  });

  it('announces a publish-all flash through a persistent polite region beside the alert', async () => {
    const screen = render(ConceptList, { data: data({ publishedAll: 3 }) });
    // The always-mounted sr-only region carries the announcement (the EditPage pattern); a
    // fresh-inserted role element announces inconsistently, so the visible alert drops its role.
    const region = screen.container.querySelector('[aria-live="polite"]');
    expect(region?.textContent ?? '').toContain('Published 3 entries.');
    const alert = screen.container.querySelector('.alert-success');
    expect(alert?.textContent ?? '').toContain('Published 3 entries.');
    expect(alert?.getAttribute('role')).toBeNull();
  });

  it('re-announces a repeated identical lifecycle error in a polite live region', async () => {
    const screen = render(ConceptList, { data: data({ formError: 'Save failed.' }) });
    const region = () => screen.container.querySelectorAll('[aria-live="polite"]')[1];
    // The polite region carries the error text (the visible alert keeps its styling without a role).
    expect(region().textContent ?? '').toContain('Save failed.');
    const first = region().textContent ?? '';
    // A second submit fails the same way: a fresh data object with the identical error string. A live
    // region re-announces only when its text mutates, so the region text must change across the repeat.
    await screen.rerender({ data: data({ formError: 'Save failed.' }) });
    expect(region().textContent ?? '').toContain('Save failed.');
    expect(region().textContent).not.toBe(first);
  });

  it('hides the publish-all flash when zero entries were published', async () => {
    // A racing second admin can land first, leaving this redirect with publishedAll=0.
    const screen = render(ConceptList, { data: data({ publishedAll: 0 }) });
    expect(screen.container.textContent ?? '').not.toContain('Published 0');
  });

  it('filters rows by a search query and shows a result count', async () => {
    const screen = render(ConceptList, { data: data() });
    const search = screen.getByRole('searchbox', { name: /search/i });
    await search.fill('Post 03');
    await expect.element(screen.getByRole('link', { name: 'Post 03' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Post 01' })).not.toBeInTheDocument();
    await expect.element(screen.getByText(/1 of 12/i)).toBeInTheDocument();
  });

  it('shows a search-aware empty state when nothing matches', async () => {
    const screen = render(ConceptList, { data: data() });
    await screen.getByRole('searchbox', { name: /search/i }).fill('no such title');
    await expect.element(screen.getByText(/no posts match/i)).toBeInTheDocument();
  });

  it('shows a first-run empty state when the concept has no entries', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await expect.element(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('paginates and exposes a page-size control', async () => {
    const screen = render(ConceptList, { data: data() });
    // Default page size 10, so 12 entries paginate to two pages: page 1 shows 10 rows.
    await expect.element(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /next page/i }).click();
    await expect.element(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it('sorts by title when the Title header is toggled', async () => {
    const screen = render(ConceptList, { data: data() });
    const header = screen.getByRole('button', { name: /sort by title/i });
    await header.click(); // ascending
    await header.click(); // descending
    const links = screen.container.querySelectorAll('tbody a');
    expect(links[0].textContent).toContain('Post 12');
  });

  it('shows an inline error when listing failed', async () => {
    const screen = render(ConceptList, { data: data({ error: 'Could not load this content type from GitHub.', entries: [] }) });
    // The visible inline alert carries the error, and the polite live region also announces it, so
    // scope the assertion to the visible alert to avoid matching both.
    const visible = screen.container.querySelector('.alert-warning');
    expect(visible?.textContent ?? '').toContain('Could not load this content type from GitHub.');
  });

  it('opens a create dialog from the header New button and auto-derives the address', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).first().click();
    const title = screen.getByLabelText(/title/i);
    await title.fill('My New Post');
    await expect.element(screen.getByLabelText(/address/i)).toHaveValue('my-new-post');
  });

  it('shows a date input defaulted to today for a dated concept in the create dialog', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).first().click();
    const date = screen.getByLabelText('Date');
    await expect.element(date).toBeVisible();
    await expect.poll(() => (date.element() as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits the date input for a non-dated concept', async () => {
    const screen = render(ConceptList, { data: data({ conceptId: 'pages', label: 'Pages', dated: false, entries: [] }) });
    await screen.getByRole('button', { name: /new pages/i }).first().click();
    expect(screen.container.querySelector('input[name="date"]')).toBeNull();
  });

  it('uses a date-free address placeholder for a dated concept in the create dialog', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).first().click();
    await expect.element(screen.getByLabelText('Address')).toHaveAttribute('placeholder', 'my-entry');
  });

  // A non-routable concept has no address to give, so the create form asks for a name, matching
  // the edit screen's own Address-versus-Name treatment. Asking for an "Address" here would
  // promise the fragment a URL that the routable gate then 404s.
  it('asks for a name, not an address, when creating a non-routable entry', async () => {
    const screen = render(
      ConceptList,
      { data: data({ conceptId: 'fragments', label: 'Fragments', singular: 'fragment', dated: false, routable: false, entries: [] }) },
    );
    await screen.getByRole('button', { name: /new fragment/i }).first().click();
    await expect.element(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.container.querySelector('dialog')!.textContent ?? '').not.toMatch(/address/i);
  });

  it('offers a delete action per row', async () => {
    const screen = render(ConceptList, { data: data() });
    // Newest-first puts Post 12 on page 1.
    await expect.element(screen.getByRole('button', { name: /delete post 12/i })).toBeInTheDocument();
  });

  // The triage layer: counts per state and the filter that narrows the rows. The filter logic is
  // the contract here; Task 7 dresses the controls to the mockup.
  function triageEntries() {
    return [
      { id: 'pub-1', title: 'Published One', date: '2026-05-10', draft: false, status: 'published' as const, summary: null },
      { id: 'pub-2', title: 'Published Two', date: '2026-05-09', draft: false, status: 'published' as const, summary: null },
      { id: 'edit-1', title: 'Edited One', date: '2026-05-08', draft: false, status: 'edited' as const, summary: null },
      { id: 'new-1', title: 'New One', date: '2026-05-07', draft: false, status: 'new' as const, summary: null },
      { id: 'hidden-1', title: 'Hidden One', date: '2026-05-06', draft: true, status: 'published' as const, summary: null },
    ];
  }

  it('the triage shows exact counts per state', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    // 5 entries: 2 published, 1 edited, 1 new, 1 hidden draft (also published-status).
    // Hidden is orthogonal: the hidden-but-published row counts in BOTH Published and Hidden.
    await expect.element(screen.getByRole('button', { name: /^all/i })).toHaveTextContent('5');
    await expect.element(screen.getByRole('button', { name: /^pending edits/i })).toHaveTextContent('2');
    await expect.element(screen.getByRole('button', { name: /^published/i })).toHaveTextContent('3');
    await expect.element(screen.getByRole('button', { name: /^hidden/i })).toHaveTextContent('1');
  });

  it('Pending edits filters to new and edited rows', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    await screen.getByRole('button', { name: /^pending edits/i }).click();
    await expect.element(screen.getByRole('link', { name: 'Edited One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'New One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Published One' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Published Two' })).not.toBeInTheDocument();
  });

  it('Hidden composes with the partition (Published + Hidden = published and hidden)', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    const published = screen.getByRole('button', { name: /^published/i });
    await published.click();
    await screen.getByRole('button', { name: /^hidden/i }).click();
    // Only the published-AND-hidden row survives both axes.
    await expect.element(screen.getByRole('link', { name: 'Hidden One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Published One' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Published Two' })).not.toBeInTheDocument();
    // The Hidden toggle does not replace the partition: Published stays selected.
    await expect.element(published).toHaveAttribute('aria-pressed', 'true');
  });

  it('search narrows within the active filter', async () => {
    const entries = [
      { id: 'pub-1', title: 'Apple Published', date: '2026-05-10', draft: false, status: 'published' as const, summary: null },
      { id: 'pub-2', title: 'Banana Published', date: '2026-05-09', draft: false, status: 'published' as const, summary: null },
      { id: 'edit-1', title: 'Apple Edited', date: '2026-05-08', draft: false, status: 'edited' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    await screen.getByRole('button', { name: /^published/i }).click();
    await screen.getByRole('searchbox', { name: /search/i }).fill('Apple');
    await expect.element(screen.getByRole('link', { name: 'Apple Published' })).toBeInTheDocument();
    // Filtered out by the publish state, even though it matches the query.
    await expect.element(screen.getByRole('link', { name: 'Apple Edited' })).not.toBeInTheDocument();
    // Filtered out by the query, even though it matches the publish state.
    await expect.element(screen.getByRole('link', { name: 'Banana Published' })).not.toBeInTheDocument();
  });

  it('All is the default and shows every row', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    const all = screen.getByRole('button', { name: /^all/i });
    await expect.element(all).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('link', { name: 'Published One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Edited One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'New One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Hidden One' })).toBeInTheDocument();
  });

  it('surfaces a refused delete from the flat action result', async () => {
    const form = {
      error: 'Cannot delete 2026-05-01-post-1: 1 page links to it.',
      id: '2026-05-01-post-1',
      inboundLinks: [
        { concept: 'posts', id: '2026-05-03-post-3', title: 'Post 03', permalink: '/posts/post-3' },
      ],
    };
    const screen = render(ConceptList, { data: data(), form });
    // The visible refusal banner names the blocker count and the linking entry. It no longer carries
    // role="alert" (one polite live region announces the lifecycle errors now), so scope the assertion
    // to the .alert-error banner element rather than the alert role, which also keeps it off the
    // entry's own list row.
    const banner = screen.container.querySelector('.alert-error');
    expect(banner?.textContent ?? '').toMatch(/could not be deleted/i);
    expect(banner?.querySelector('a')?.textContent ?? '').toContain('Post 03');
  });

  // The density ruling (design arc 2026-07-15): rows are one line, so the summary stays off the
  // office list even when the entry carries one (it still serves the edit page's Details).
  it('a row stays one line: the summary never renders on the list', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'published' as const, summary: 'A short blurb.' },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    await expect.element(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.container.querySelector('[data-summary]')).toBeNull();
    expect(screen.container.textContent).not.toContain('A short blurb.');
  });

  it('a row without a summary renders no summary line', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'published' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    const row = screen.container.querySelector('tbody tr')!;
    expect(row.querySelector('[data-summary]')).toBeNull();
  });

  it('marks the active filter by more than color', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    const published = screen.getByRole('button', { name: /^published/i });
    await published.click();
    // The non-color cue: aria-pressed plus a check glyph inside the active segment.
    await expect.element(published).toHaveAttribute('aria-pressed', 'true');
    expect(published.element().querySelector('svg')).not.toBeNull();
    // An inactive segment carries no check glyph (its state is not color alone, it has no svg).
    const all = screen.getByRole('button', { name: /^all/i });
    expect(all.element().querySelector('svg')).toBeNull();
  });

  it('a hidden entry carries the Hidden tag, not a Hidden badge in the status cell', async () => {
    const entries = [
      { id: 'hidden-1', title: 'Hidden One', date: '2026-05-06', draft: true, status: 'edited' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    const row = screen.container.querySelector('tbody tr')!;
    // The status cell holds only the publish-state badge: Edited, no second Hidden pill.
    const badges = Array.from(row.querySelectorAll('.badge')).map((el) => el.textContent?.trim());
    expect(badges).toContain('Edited');
    expect(badges).not.toContain('Hidden');
    // The eye-off Hidden tag sits by the title, outside the badge set.
    await expect.element(screen.getByText('Hidden', { exact: true })).toBeInTheDocument();
  });

  it('opens the create dialog from the trailing New row', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'published' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    // Two "New Posts" affordances exist (the header button and the trailing row); the foot row is last.
    const news = screen.getByRole('button', { name: /new posts/i });
    await news.last().click();
    await expect.element(screen.getByLabelText('Title', { exact: true })).toBeVisible();
  });

  // Task 3: the singular label dresses the create affordances ("New post"), so the act of making one
  // new item reads in the singular while the collection-level copy stays plural.
  it('uses the singular label at the three create affordances', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'published' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries, singular: 'post' }) });
    // The header button and the trailing foot row both read "New post" (exact, so "New Posts"
    // never matches). getByRole name matching is case-sensitive under exact.
    const headerButton = screen.getByRole('button', { name: 'New post', exact: true }).first();
    await expect.element(headerButton).toBeInTheDocument();
    const trailingRow = screen.getByRole('button', { name: 'New post', exact: true }).last();
    await expect.element(trailingRow).toBeInTheDocument();
    // The create dialog title reads "New post" too.
    await headerButton.click();
    await expect.element(screen.getByRole('heading', { name: 'New post', exact: true })).toBeInTheDocument();
    // The collection-level copy stays plural: the page heading is the label.
    await expect.element(screen.getByRole('heading', { name: 'Posts', level: 1 })).toBeInTheDocument();
  });

  it('falls back to the plural label at the create affordances without a singular', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'published' as const, summary: null },
    ];
    // No `singular`: the create controls read "New Posts" from the label.
    const screen = render(ConceptList, { data: data({ entries, singular: undefined }) });
    await expect.element(screen.getByRole('button', { name: 'New Posts' }).first()).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'New Posts' }).last()).toBeInTheDocument();
    await screen.getByRole('button', { name: 'New Posts' }).first().click();
    await expect.element(screen.getByRole('heading', { name: 'New Posts' })).toBeInTheDocument();
  });

  it('clears the search from the no-match state', async () => {
    const screen = render(ConceptList, { data: data() });
    const search = screen.getByRole('searchbox', { name: /search/i });
    await search.fill('no such title');
    await expect.element(screen.getByText(/no posts match/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /clear search/i }).click();
    // The query clears, so every row returns.
    await expect.element(screen.getByRole('link', { name: 'Post 12' })).toBeInTheDocument();
    await expect.element(search).toHaveValue('');
  });

  // Task 3 (audit finding 8): the narrow (320) list row recomposes so the title column carries the
  // freed width, the header search never collapses to an icon and a stray letter, and the Pending
  // edits filter chip stays on one line. The compiled sheet carries daisyUI's real .table/.input/
  // .badge sizing (the EditPage phone-width pattern), so these measurements reflect production
  // footprints, not the UA-default widths the source partial alone leaves.
  describe('office composition at 320px (audit finding 8)', () => {
    let sheet: HTMLStyleElement;

    beforeAll(() => {
      document.documentElement.setAttribute('data-theme', 'cairn-admin');
      sheet = document.createElement('style');
      sheet.textContent = compiledAdminCss;
      document.head.appendChild(sheet);
    });

    afterAll(async () => {
      document.documentElement.removeAttribute('data-theme');
      sheet.remove();
      // Restore a normal-width viewport so a later test file's default layout assumptions hold.
      await page.viewport(1280, 720);
    });

    // Mirrors the office shell's own content padding (main's p-4, 16px each side), so the measured
    // columns reflect the real frame the list renders inside rather than an unconstrained test root.
    function pad320(container: HTMLElement) {
      container.style.padding = '16px';
      container.style.boxSizing = 'border-box';
      container.style.width = '320px';
    }

    it('gives the title column the majority of the row width, not the 7-10 character starve', async () => {
      await page.viewport(320, 700);
      const screen = render(ConceptList, { data: data() });
      pad320(screen.container);
      const row = screen.container.querySelector('tbody tr')!;
      // The Date column drops below sm (a hidden zero-width cell), so filter it out rather than
      // index by position: Title, Status, Delete are the three visible columns at 320.
      const cells = Array.from(row.querySelectorAll('td')).filter((c) => !c.classList.contains('hidden'));
      const rowWidth = row.getBoundingClientRect().width;
      const titleWidth = cells[0].getBoundingClientRect().width;
      const statusWidth = cells[1].getBoundingClientRect().width;
      const deleteWidth = cells[2].getBoundingClientRect().width;
      expect(titleWidth / rowWidth).toBeGreaterThan(0.5);
      expect(statusWidth).toBeLessThan(titleWidth);
      expect(deleteWidth).toBeLessThan(titleWidth);
      // The delete column keeps its w-12 footprint (the design system's fixed action column).
      const deleteHeader = screen.container.querySelector('thead th:last-child')!;
      expect(deleteHeader.className).toContain('w-12');
    });

    it('keeps the search input at full row width, never collapsing to an icon and a stray letter', async () => {
      await page.viewport(320, 700);
      const screen = render(ConceptList, { data: data() });
      pad320(screen.container);
      const input = screen.container.querySelector('input[type="search"]') as HTMLInputElement;
      // A collapsed search shrinks to a sliver (the reported "icon plus a stray S"); the full-width
      // narrow row keeps it wide enough to show its placeholder text.
      expect(input.getBoundingClientRect().width).toBeGreaterThan(200);
    });

    it('keeps the Pending edits filter chip on one line', async () => {
      await page.viewport(320, 700);
      const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
      pad320(screen.container);
      const pending = screen.getByRole('button', { name: /^pending edits/i });
      const rect = (await pending.element()).getBoundingClientRect();
      // A wrapped two-line chip roughly doubles its single-line height.
      expect(rect.height).toBeLessThanOrEqual(28);
    });
  });

  // Task 6 (audit finding 10): the mechanical polish tail. The compiled sheet carries daisyUI's
  // real .table/.badge sizing, the same reason the 320px suite above injects it.
  describe('mechanical polish tail (audit finding 10)', () => {
    let sheet: HTMLStyleElement;

    beforeAll(() => {
      sheet = document.createElement('style');
      sheet.textContent = compiledAdminCss;
      document.head.appendChild(sheet);
    });

    afterAll(async () => {
      document.documentElement.removeAttribute('data-theme');
      sheet.remove();
      // Restore a normal-width viewport so a later test file's default layout assumptions hold.
      await page.viewport(1280, 720);
    });

    it('never wraps the date column to two lines, whatever the day carries a one- or two-digit day', async () => {
      // The Date column is hidden below sm (640px) and shows at sm and up; a desktop width is
      // where the reported wrap actually happened.
      await page.viewport(1024, 720);
      document.documentElement.setAttribute('data-theme', 'cairn-admin');
      const entries = [
        { id: 'june', title: 'June entry', date: '2026-06-01', draft: false, status: 'published' as const, summary: null },
        { id: 'may', title: 'May entry', date: '2026-05-18', draft: false, status: 'published' as const, summary: null },
      ];
      const screen = render(ConceptList, { data: data({ entries }) });
      const cells = screen.container.querySelectorAll('td.tabular-nums');
      expect(cells.length).toBe(2);
      for (const cell of cells) {
        // The cell carries vertical padding regardless of line count, so height alone does not
        // signal a wrap; a Range over the text node's own rendered rects does, directly counting
        // line boxes.
        const textNode = cell.firstChild!;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        expect(range.getClientRects().length).toBe(1);
      }
    });

    it('gives the dark Published pill a fill distinct from its own card, clearing a real contrast step', async () => {
      document.documentElement.setAttribute('data-theme', 'cairn-admin-dark');
      const entries = [{ id: 'pub', title: 'Pub entry', date: '2026-05-01', draft: false, status: 'published' as const, summary: null }];
      const screen = render(ConceptList, { data: data({ entries }) });
      const badge = screen.container.querySelector('tbody .badge')!;
      const badgeBg = getComputedStyle(badge).backgroundColor;
      // Pin the exact fill: the pill family's neutral wash (base-content at 6%), not merely
      // "differs from the card" (a weak check the pre-fix near-invisible fill would also pass).
      // In dark the wash mixes the light ink over the dark card, so the pill keeps the visible
      // step the audit's finding 10 fix established.
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'color-mix(in oklab, var(--color-base-content) 6%, transparent)';
      document.body.appendChild(probe);
      const expectedBg = getComputedStyle(probe).backgroundColor;
      probe.remove();
      expect(badgeBg).toBe(expectedBg);
    });
  });
});
