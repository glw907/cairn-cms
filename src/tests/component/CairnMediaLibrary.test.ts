import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { stringify as devalueStringify } from 'devalue';
import CairnMediaLibrary from '../../lib/components/CairnMediaLibrary.svelte';
import type { MediaLibraryEntry } from '../../lib/media/library-entry.js';
import type {
  MediaLibraryData,
  MediaUsageInfo,
  MediaReplacePreviewPlan,
  MediaReplaceFailure,
  MediaAltPreviewPlan,
  MediaAltPropagateFailure,
} from '../../lib/sveltekit/content-routes.js';
import type { MediaEntry } from '../../lib/media/manifest.js';
import * as ingest from '../../lib/components/client-ingest.js';
import { gotoCalls, gotoOptsCalls } from './app-navigation.js';

// The Replace upload step reuses the 2b ingest helpers. ESM namespaces are not configurable in the
// browser pool, so the helpers cannot be spied directly: mock the module so ingestFile and sendUpload
// are controllable per test while the pure helpers (buildUploadRequest, the failure taxonomy) stay
// real, exactly as the MediaInsertPopover suite does.
vi.mock('../../lib/components/client-ingest.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/components/client-ingest.js')>(
    '../../lib/components/client-ingest.js',
  );
  return { ...actual, ingestFile: vi.fn(), sendUpload: vi.fn() };
});

// A projected library entry keyed elsewhere by the 16-hex content hash. Defaults a fully-described,
// used asset; each test overrides the fields it exercises.
function entry(over: Partial<MediaLibraryEntry> = {}): MediaLibraryEntry {
  return {
    hash: '0123456789abcdef',
    slug: 'blue-shoes',
    ext: 'webp',
    contentType: 'image/webp',
    displayName: 'Blue shoes',
    alt: 'A pair of blue running shoes',
    width: 800,
    height: 600,
    bytes: 12345,
    createdAt: '2026-03-04T00:00:00.000Z',
    ...over,
  };
}

// A four-asset fixture spanning the cases the screen must render: a described+used asset, an
// empty-alt asset (Needs alt), an asset with no usage key (Unused), and one whose bytes are missing
// (the broken-thumbnail affordance).
const DESCRIBED_USED = entry({ hash: 'aaaa111122223333', slug: 'first-light', displayName: 'first-light', createdAt: '2026-03-04T00:00:00.000Z' });
const NEEDS_ALT = entry({ hash: 'bbbb444455556666', slug: 'valley-ridge', displayName: 'valley-ridge', alt: '', createdAt: '2026-02-18T00:00:00.000Z' });
const UNUSED = entry({ hash: 'cccc777788889999', slug: 'meadow-fence', displayName: 'meadow-fence', alt: 'A fence in a meadow', createdAt: '2026-01-22T00:00:00.000Z' });
const BROKEN = entry({ hash: 'dddd000011112222', slug: 'old-pylon', displayName: 'old-pylon', alt: '', createdAt: '2026-04-01T00:00:00.000Z' });

const ASSETS: MediaLibraryEntry[] = [DESCRIBED_USED, NEEDS_ALT, UNUSED, BROKEN];

function usageFor(count: number): MediaUsageInfo {
  return {
    count,
    entries: Array.from({ length: count }, (_, i) => ({
      concept: 'posts',
      id: `post-${i}`,
      title: `Post ${i}`,
      origin: { kind: 'published' as const },
    })),
  };
}

// DESCRIBED_USED is found in 3 entries; NEEDS_ALT in 1; UNUSED and BROKEN have no key (no references).
const USAGE: Record<string, MediaUsageInfo> = {
  [DESCRIBED_USED.hash]: usageFor(3),
  [NEEDS_ALT.hash]: usageFor(1),
};

function fixture(over: Partial<MediaLibraryData> = {}): MediaLibraryData {
  return { assets: ASSETS, usage: USAGE, error: null, flash: null, flashError: null, ...over };
}

describe('CairnMediaLibrary grid', () => {
  it('renders a roving listbox of tiles with names, alt-status glyphs, and usage markers', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    expect(screen.container.querySelector('[role="listbox"]')).not.toBeNull();
    const options = [...screen.container.querySelectorAll('[role="option"]')];
    expect(options.length).toBe(4);

    expect(screen.container.textContent ?? '').toContain('first-light');
    expect(screen.container.textContent ?? '').toContain('valley-ridge');

    // The Needs-alt tile names its status as a label, never hue alone.
    const needsAltTile = options.find((o) => /valley-ridge/.test(o.textContent ?? ''))!;
    expect(needsAltTile.textContent ?? '').toMatch(/needs alt/i);
    // The described tile carries the Described accessible name.
    const describedTile = options.find((o) => /first-light/.test(o.textContent ?? ''))!;
    expect(describedTile.querySelector('[aria-label="Described"]')).not.toBeNull();

    // The no-references tile carries the "No refs" marker; the used tile names its count. The
    // category never reads "Unused" (the rename: absence of a found reference is not proof of disuse).
    const unusedTile = options.find((o) => /meadow-fence/.test(o.textContent ?? ''))!;
    expect(unusedTile.textContent ?? '').toMatch(/no refs/i);
    expect(unusedTile.textContent ?? '').not.toMatch(/unused/i);
    expect(describedTile.textContent ?? '').toMatch(/used/i);
  });

  it('has one tabbable option (roving tabindex) and arrows move the roving focus', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options().filter((o) => o.getAttribute('tabindex') === '0').length).toBe(1);

    const first = options()[0];
    first.focus();
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[1]);
    expect(options()[1].getAttribute('tabindex')).toBe('0');
    expect(options()[0].getAttribute('tabindex')).toBe('-1');

    options()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[0]);
  });

  it('activates an option with Enter, opening the detail slide-over (not a selection)', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')];
    const first = options()[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    // Enter activates: the detail slide-over opens. aria-selected tracks the multi-select set, so a
    // bare Enter leaves every option unselected.
    await expect.poll(() => screen.container.querySelector('[role="region"]')).not.toBeNull();
    expect(options().filter((o) => o.getAttribute('aria-selected') === 'true').length).toBe(0);
  });
});

describe('CairnMediaLibrary list density', () => {
  it('flips to a real table with a sortable Added header carrying aria-sort and a usage pill', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await screen.getByRole('button', { name: /list view/i }).click();
    expect(screen.container.querySelector('table')).not.toBeNull();

    const addedHeader = [...screen.container.querySelectorAll('th')].find((th) => /added/i.test(th.textContent ?? ''))!;
    expect(addedHeader).toBeTruthy();
    expect(addedHeader.getAttribute('aria-sort')).toBeTruthy();
    expect(addedHeader.querySelector('button')).not.toBeNull();

    // The usage pill names the count and the no-reference state.
    expect(screen.container.textContent ?? '').toMatch(/found in 3/i);
    expect(screen.container.textContent ?? '').toMatch(/no references found/i);
  });

  it('sorts by Added when the header button toggles', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await screen.getByRole('button', { name: /list view/i }).click();

    const names = () => [...screen.container.querySelectorAll('tbody .cairn-ml-name')].map((el) => el.textContent?.trim());
    // Default sort is newest-first (Added descending): old-pylon (Apr) leads.
    expect(names()[0]).toBe('old-pylon');

    const addedHeader = [...screen.container.querySelectorAll('th')].find((th) => /added/i.test(th.textContent ?? ''))!;
    await (addedHeader.querySelector('button') as HTMLButtonElement).click();
    // Now ascending: meadow-fence (Jan) leads.
    await expect.poll(() => names()[0]).toBe('meadow-fence');
    expect(addedHeader.getAttribute('aria-sort')).toBe('ascending');
  });

  it('keeps a per-row delete button always visible in the table', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await screen.getByRole('button', { name: /list view/i }).click();
    const deletes = [...screen.container.querySelectorAll('tbody button')].filter((b) =>
      /delete/i.test(b.getAttribute('aria-label') ?? ''),
    );
    expect(deletes.length).toBe(4);
  });
});

describe('CairnMediaLibrary triage radiogroup', () => {
  it('is a pick-one radiogroup with aria-checked carrying live counts', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    expect(screen.container.querySelector('[role="radiogroup"]')).not.toBeNull();
    const radios = [...screen.container.querySelectorAll('[role="radio"]')];
    expect(radios.length).toBe(3);
    expect(radios.every((r) => r.hasAttribute('aria-checked'))).toBe(true);
    expect(radios.some((r) => r.hasAttribute('aria-pressed'))).toBe(false);
    // Live counts: Needs alt = 2 (NEEDS_ALT + BROKEN), No references found = 2 (UNUSED + BROKEN).
    expect(radios.find((r) => /needs alt/i.test(r.textContent ?? ''))!.textContent ?? '').toContain('2');
    expect(radios.find((r) => /no references found/i.test(r.textContent ?? ''))!.textContent ?? '').toContain('2');
    expect(radios.find((r) => /all/i.test(r.textContent ?? ''))!.getAttribute('aria-checked')).toBe('true');
  });

  it('implements the ARIA radio keyboard pattern: one tab stop, arrows move selection and focus', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const radios = () => [...screen.container.querySelectorAll<HTMLElement>('[role="radio"]')];
    // One tab stop: only the checked radio (All, by default) is tabbable.
    expect(radios().filter((r) => r.getAttribute('tabindex') === '0').length).toBe(1);
    expect(radios()[0].getAttribute('aria-checked')).toBe('true');
    expect(radios()[0].getAttribute('tabindex')).toBe('0');

    radios()[0].focus();
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    // ArrowRight moved selection AND focus to the second segment (Needs alt).
    await expect.poll(() => radios()[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios()[1]);
    expect(radios()[1].getAttribute('tabindex')).toBe('0');
    expect(radios()[0].getAttribute('tabindex')).toBe('-1');
    // The grid narrowed to the Needs-alt set, so the keyboard move actually drove the filter.
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(2);

    // End jumps to the last segment (No references found), Home back to the first.
    radios()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(radios()[2]);
    expect(radios()[2].getAttribute('aria-checked')).toBe('true');
    radios()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(radios()[0]);
    expect(radios()[0].getAttribute('aria-checked')).toBe('true');
  });

  it('filters to Needs alt and to No references found', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const radios = () => [...screen.container.querySelectorAll<HTMLElement>('[role="radio"]')];

    await radios().find((r) => /needs alt/i.test(r.textContent ?? ''))!.click();
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(2);
    let options = [...screen.container.querySelectorAll('[role="option"]')];
    expect(options.every((o) => /valley-ridge|old-pylon/.test(o.textContent ?? ''))).toBe(true);

    await radios().find((r) => /no references found/i.test(r.textContent ?? ''))!.click();
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(2);
    options = [...screen.container.querySelectorAll('[role="option"]')];
    expect(options.every((o) => /meadow-fence|old-pylon/.test(o.textContent ?? ''))).toBe(true);
  });

  it('searches across name and alt', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    // "running" appears only in the DESCRIBED_USED alt, not in any name.
    await screen.getByRole('searchbox').fill('running');
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(1);
    expect([...screen.container.querySelectorAll('[role="option"]')][0].textContent ?? '').toMatch(/first-light/);

    await screen.getByRole('searchbox').fill('meadow');
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(1);
    expect([...screen.container.querySelectorAll('[role="option"]')][0].textContent ?? '').toMatch(/meadow-fence/);
  });
});

describe('CairnMediaLibrary pagination', () => {
  it('grows the visible window with Load more and announces "Showing N of M"', async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      entry({ hash: `e${String(i).padStart(15, '0')}`, slug: `asset-${i}`, displayName: `asset-${i}` }),
    );
    const screen = render(CairnMediaLibrary, { data: fixture({ assets: many, usage: {} }) } as never);
    const visible = () => screen.container.querySelectorAll('[role="option"]').length;
    const before = visible();
    expect(before).toBeLessThan(30);

    // Target the Showing count region specifically: several polite live regions exist now (the flash
    // strip, the copy notice, the selection count), so find the status region carrying "Showing".
    const live = () =>
      [...screen.container.querySelectorAll('[role="status"][aria-live="polite"]')].find((n) =>
        /Showing/.test(n.textContent ?? ''),
      );
    expect(live()?.textContent ?? '').toMatch(new RegExp(`Showing ${before} of 30`));

    await screen.getByRole('button', { name: /load more/i }).click();
    await expect.poll(() => visible()).toBeGreaterThan(before);
    expect(live()?.textContent ?? '').toMatch(new RegExp(`Showing ${visible()} of 30`));
  });
});

describe('CairnMediaLibrary empty and broken states', () => {
  it('shows the empty-state dropzone when there are no assets, hiding triage and search', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture({ assets: [], usage: {} }) } as never);
    expect(screen.container.textContent ?? '').toMatch(/no media yet/i);
    expect(screen.container.textContent ?? '').toMatch(/drop a file/i);
    expect(screen.container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(screen.container.querySelector('[type="search"]')).toBeNull();
  });

  it('renders an inline error when data.error is set', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture({ error: 'Could not read the media library.' }) } as never);
    const alert = screen.container.querySelector('[role="alert"]');
    expect(alert?.textContent ?? '').toContain('Could not read the media library.');
  });

  it('renders the success strip for the deleted flash in a polite live region', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture({ flash: 'deleted' }) } as never);
    const strip = screen.container.querySelector('[aria-live="polite"]');
    expect(strip).not.toBeNull();
    expect(screen.container.textContent ?? '').toContain('Asset deleted.');
    // The strip never steals focus.
    expect(document.activeElement).toBe(document.body);
  });

  it('renders the success strip for the updated flash', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture({ flash: 'updated' }) } as never);
    expect(screen.container.textContent ?? '').toContain('Changes saved.');
  });

  it('renders the conflict error from flashError in the inline error treatment', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture({ flashError: 'The media manifest changed. Reload and try again.' }) } as never);
    const alert = screen.container.querySelector('[role="alert"]');
    expect(alert?.textContent ?? '').toContain('The media manifest changed. Reload and try again.');
  });

  it('lists a missing-bytes asset with a broken-image affordance once its thumbnail fails', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const brokenTile = [...screen.container.querySelectorAll('[role="option"]')].find((o) => /old-pylon/.test(o.textContent ?? ''))!;
    const img = brokenTile.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    // Dispatch the element-local error event the onerror handler listens for. No bubbling, so it
    // does not surface as a window-level unhandled error (which would fail the process).
    img.dispatchEvent(new Event('error'));
    await expect.poll(() => brokenTile.querySelector('[data-cairn-broken]')).not.toBeNull();
    expect(brokenTile.textContent ?? '').toContain('old-pylon');
  });
});

// --- Task 7: the detail slide-over and the safe-delete dialog ---

// A usage overlay with a published reference and an edit-branch reference, for the where-used tests.
function mixedUsage(): MediaUsageInfo {
  return {
    count: 2,
    entries: [
      { concept: 'posts', id: 'first-season', title: 'A season on the early tracks', origin: { kind: 'published' } },
      { concept: 'pages', id: 'about-the-trails', title: 'About the trails', origin: { kind: 'branch', branch: 'cairn/pages/about-the-trails' } },
    ],
  };
}

/** Open the first asset's slide-over by activating its tile with Enter, and return the region. */
async function openSlideOver(screen: ReturnType<typeof render>, name: RegExp) {
  const option = [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => name.test(o.textContent ?? ''))!;
  option.focus();
  option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await expect.poll(() => screen.container.querySelector('[role="region"]')).not.toBeNull();
  return screen.container.querySelector('[role="region"]') as HTMLElement;
}

describe('CairnMediaLibrary detail slide-over', () => {
  it('opens non-modal (the listbox stays in the a11y tree), Escape closes it, focus returns to the origin', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const tile = [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => /first-light/.test(o.textContent ?? ''))!;
    tile.focus();
    tile.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    const panel = await openSlideOver(screen, /first-light/);
    // Non-modal: it is a region, not a dialog, and the grid is still queryable behind it.
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-modal')).toBeNull();
    expect(screen.container.querySelector('[role="listbox"]')).not.toBeNull();
    // Focus moved into the panel (onto a control inside the region).
    await expect.poll(() => panel.contains(document.activeElement)).toBe(true);

    // Escape closes it and focus returns to the originating tile.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.poll(() => screen.container.querySelector('[role="region"]')).toBeNull();
    expect(document.activeElement).toBe(tile);
  });

  it('does not close the slide-over when Escape fires with focus in the search box (the native search clear keeps the panel)', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const panel = await openSlideOver(screen, /first-light/);

    // Move focus out of the panel and into the search input. The browser handles Escape there
    // (clearing a type="search"); the window guard must not also close the panel.
    const search = screen.container.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.focus();
    expect(panel.contains(document.activeElement)).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    // Let any reactive close cycle flush, then confirm the panel is still open, exactly as the user
    // left it (the bug would have torn the region down here).
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.container.querySelector('[role="region"]')).not.toBeNull();
    expect(document.activeElement).toBe(search);
  });

  it('groups where-used published vs branch, links each entry to its editor, names a branch, and shows the empty case', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const panel = await openSlideOver(screen, /first-light/);

    expect(panel.textContent ?? '').toContain('Published on the site');
    expect(panel.textContent ?? '').toContain('In an unpublished edit');
    expect(panel.textContent ?? '').toContain('A season on the early tracks');
    // The branch entry names its branch.
    expect(panel.textContent ?? '').toContain('cairn/pages/about-the-trails');
    // Each entry links to its editor.
    const pub = [...panel.querySelectorAll('a')].find((a) => /A season on the early tracks/.test(a.textContent ?? ''))!;
    expect(pub.getAttribute('href')).toBe('/admin/posts/first-season');
    const branch = [...panel.querySelectorAll('a')].find((a) => /About the trails/.test(a.textContent ?? ''))!;
    expect(branch.getAttribute('href')).toBe('/admin/pages/about-the-trails');

    // The empty case: an asset with no usage key shows the no-references wording, never "unused".
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.poll(() => screen.container.querySelector('[role="region"]')).toBeNull();
    const orphan = await openSlideOver(screen, /meadow-fence/);
    expect(orphan.textContent ?? '').toMatch(/no references found/i);
  });

  it('carries the media: reference and the alt editor + rename in one ?/mediaUpdate form', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const panel = await openSlideOver(screen, /first-light/);

    // The media: reference is shown.
    expect(panel.textContent ?? '').toContain('media:first-light.aaaa111122223333');

    // One update form carries the hidden hash, the display name, the slug, and the default alt.
    const form = [...panel.querySelectorAll('form')].find((f) => f.getAttribute('action') === '?/mediaUpdate')!;
    expect(form).toBeTruthy();
    expect((form.querySelector('input[name="hash"]') as HTMLInputElement).value).toBe('aaaa111122223333');
    expect((form.querySelector('input[name="displayName"]') as HTMLInputElement).value).toBe('first-light');
    expect((form.querySelector('input[name="slug"]') as HTMLInputElement).value).toBe('first-light');
    // The alt field rides a hidden input; DESCRIBED_USED has a described alt, so it seeds describe.
    expect((form.querySelector('input[name="alt"]') as HTMLInputElement).value).toBe('A pair of blue running shoes');
    // The alt editor groups two NATIVE radios under a fieldset (native radios form their own group
    // with arrow-key nav, so no role="radiogroup" is added). The legend names it; the radios share a
    // name so they are one group.
    const altFieldset = form.querySelector('fieldset')!;
    expect(altFieldset.querySelector('legend')?.textContent ?? '').toMatch(/alt/i);
    const altRadios = [...altFieldset.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
    expect(altRadios.length).toBe(2);
    expect(new Set(altRadios.map((r) => r.name)).size).toBe(1);
    expect(form.textContent ?? '').toMatch(/default for the next time/i);
  });

  it('surfaces a ?/mediaUpdate failure error in the slide-over', async () => {
    const failed = { error: 'Enter a valid slug: lowercase letters, numbers, and hyphens.' };
    const screen = render(CairnMediaLibrary, { data: fixture(), form: failed } as never);
    const panel = await openSlideOver(screen, /first-light/);
    expect(panel.querySelector('[role="alert"]')?.textContent ?? '').toContain('Enter a valid slug');
  });

  it('auto-re-opens the slide-over and shows the error on a hash-bearing non-usage failure (full-page post)', async () => {
    // The form posts full-page, so a fail() remounts with no selection. A hash-bearing failure that
    // is NOT an in-use block (a 404 "not committed", or an invalid-slug update carrying the hash)
    // must re-select the asset and open the slide-over so the error renders.
    const failed = { error: 'Enter a valid slug: lowercase letters, numbers, and hyphens.', hash: DESCRIBED_USED.hash };
    const screen = render(CairnMediaLibrary, { data: fixture(), form: failed } as never);
    // No manual open: the effect re-selects from the hash and opens the region.
    await expect.poll(() => screen.container.querySelector('[role="region"]')).not.toBeNull();
    const panel = screen.container.querySelector('[role="region"]') as HTMLElement;
    expect(panel.getAttribute('aria-label') ?? '').toContain('first-light');
    expect(panel.querySelector('[role="alert"]')?.textContent ?? '').toContain('Enter a valid slug');
    // It opened the slide-over, not the delete dialog.
    const dialog = screen.container.querySelector('dialog[role="alertdialog"]') as HTMLDialogElement;
    expect(dialog.open).toBe(false);
  });
});

describe('CairnMediaLibrary safe-delete alertdialog', () => {
  it('shows the in-use face: lists entries, gates Delete behind the typed slug, posts confirmSlug', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    await openSlideOver(screen, /first-light/);

    // Open the delete from the slide-over.
    await screen.getByRole('button', { name: /^delete$/i }).click();
    const dialog = screen.container.querySelector('dialog[role="alertdialog"]') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    await expect.poll(() => dialog.open).toBe(true);

    // The in-use face names the breaking entries, grouped.
    expect(dialog.textContent ?? '').toContain('These would break');
    expect(dialog.textContent ?? '').toContain('A season on the early tracks');
    expect(dialog.textContent ?? '').toContain('About the trails');

    // The Delete submit is gated until the typed slug matches.
    const form = [...dialog.querySelectorAll('form')].find((f) => f.getAttribute('action') === '?/mediaDelete')!;
    const submit = [...form.querySelectorAll('button')].find((b) => b.getAttribute('type') === 'submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const confirm = dialog.querySelector('#cairn-ml-confirm') as HTMLInputElement;
    confirm.value = 'first-light';
    confirm.dispatchEvent(new Event('input', { bubbles: true }));
    await expect.poll(() => submit.disabled).toBe(false);

    // The form posts hash and confirmSlug to ?/mediaDelete.
    expect((form.querySelector('input[name="hash"]') as HTMLInputElement).value).toBe('aaaa111122223333');
    await expect.poll(() => (form.querySelector('input[name="confirmSlug"]') as HTMLInputElement).value).toBe('first-light');
  });

  it('shows the orphan face: a calm confirm, no confirmSlug, Delete enabled', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await openSlideOver(screen, /meadow-fence/);
    await screen.getByRole('button', { name: /^delete$/i }).click();
    const dialog = screen.container.querySelector('dialog[role="alertdialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);

    expect(dialog.textContent ?? '').not.toContain('These would break');
    expect(dialog.textContent ?? '').toMatch(/no references found/i);
    expect(dialog.textContent ?? '').toMatch(/git history/i);

    const form = [...dialog.querySelectorAll('form')].find((f) => f.getAttribute('action') === '?/mediaDelete')!;
    expect(form.querySelector('input[name="confirmSlug"]')).toBeNull();
    expect((form.querySelector('input[name="hash"]') as HTMLInputElement).value).toBe('cccc777788889999');
    const submit = [...form.querySelectorAll('button')].find((b) => b.getAttribute('type') === 'submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('opens the dialog directly on the row-delete intent from the table', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await screen.getByRole('button', { name: /list view/i }).click();
    const rowDelete = [...screen.container.querySelectorAll<HTMLButtonElement>('tbody button')].find((b) => /delete meadow-fence/i.test(b.getAttribute('aria-label') ?? ''))!;
    rowDelete.click();
    const dialog = screen.container.querySelector('dialog[role="alertdialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);
    // No slide-over opened, just the dialog.
    expect(screen.container.querySelector('[role="region"][aria-label$="details"]')).toBeNull();
    expect(dialog.textContent ?? '').toContain('meadow-fence');
  });

  it('re-opens the in-use face on a fresh MediaDeleteRefusal with the server fresh list', async () => {
    // A stale load-time overlay says no references, but the FRESH refusal carries a breaking entry.
    const refusal = {
      error: 'Cannot delete meadow-fence: found in 1 entry.',
      hash: UNUSED.hash,
      foundIn: 1,
      usage: [{ concept: 'posts', id: 'late-edit', title: 'A late edit', origin: { kind: 'published' as const } }],
    };
    const screen = render(CairnMediaLibrary, { data: fixture(), form: refusal } as never);
    const dialog = screen.container.querySelector('dialog[role="alertdialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);
    // The in-use face with the fresh list, not the stale "no references".
    expect(dialog.textContent ?? '').toContain('These would break');
    expect(dialog.textContent ?? '').toContain('A late edit');
    const form = [...dialog.querySelectorAll('form')].find((f) => f.getAttribute('action') === '?/mediaDelete')!;
    expect((form.querySelector('input[name="hash"]') as HTMLInputElement).value).toBe(UNUSED.hash);
  });
});

// --- Task 7: the Replace flow (the two-step Replace dialog, the preview fetch, the fail-closed face) ---

// A 1x1 transparent PNG, enough bytes for an object-URL preview through the upload step.
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

// The server-owned record the upload returns and the Replace flow holds: a fresh content hash and the
// same slug as the asset being replaced (content-addressed: the name stays, the hash changes).
function newRecord(overrides: Partial<MediaEntry> = {}): MediaEntry {
  return {
    hash: 'b42e0d51aaaa0000',
    sha256: 'a'.repeat(64),
    slug: 'first-light',
    displayName: 'first-light',
    originalFilename: 'first-light-v2.png',
    alt: '',
    ext: 'webp',
    contentType: 'image/webp',
    bytes: 26100,
    width: 1600,
    height: 1067,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

// Serialize a SvelteKit form-action result the way the server does: the envelope is JSON, but its
// `data` field is a devalue-stringified string (deserialize runs devalue.parse on it). The preview
// fetch reads its body through deserialize, so its stub must speak the same dialect.
function successBody(data: unknown): string {
  return JSON.stringify({ type: 'success', status: 200, data: devalueStringify(data) });
}
function failureBody(data: unknown): string {
  return JSON.stringify({ type: 'failure', status: 503, data: devalueStringify(data) });
}

// Stub the upload step deterministically: ingestFile skips createImageBitmap, sendUpload returns the
// success envelope carrying the new record.
function stubUpload(record: MediaEntry) {
  vi.mocked(ingest.ingestFile).mockResolvedValue({
    blob: new Blob([PNG_BYTES], { type: 'image/png' }),
    contentType: 'image/png',
    width: 1,
    height: 1,
  });
  vi.mocked(ingest.sendUpload).mockResolvedValue({
    type: 'basic',
    status: 200,
    text: async () => successBody({ reference: `media:${record.slug}.${record.hash}`, record, reused: false, mismatch: false }),
  } as unknown as Response);
}

// Stub the preview fetch (the ?/mediaReplacePreview POST). The component reads res.text() through
// deserialize, so the stubbed Response returns the devalue envelope body.
function stubPreviewFetch(body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ status: 200, text: async () => body }) as unknown as Response),
  );
}

// Open the Replace dialog: open the slide-over for an asset, click "Replace image", and wait for the
// dialog to open on the upload step.
async function openReplace(screen: ReturnType<typeof render>, name: RegExp) {
  await openSlideOver(screen, name);
  const replaceButton = screen.container.querySelector<HTMLButtonElement>('[data-cairn-replace-open]')!;
  replaceButton.click();
  const dialog = screen.container.querySelector('[data-testid="cairn-replace-dialog"]') as HTMLDialogElement;
  await expect.poll(() => dialog.open).toBe(true);
  return dialog;
}

// Drive the upload step to a held record, then resolve the preview, so the dialog reaches the review
// (or fail-closed) step. Returns the dialog.
async function uploadThroughReplace(screen: ReturnType<typeof render>, name: RegExp) {
  const dialog = await openReplace(screen, name);
  const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([PNG_BYTES], 'first-light-v2.png', { type: 'image/png' });
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  return dialog;
}

const REPLACE_PLAN: MediaReplacePreviewPlan = {
  affectedCount: 2,
  entries: [
    {
      concept: 'posts',
      id: 'early-tracks',
      title: 'A season on the early tracks',
      permalink: '/posts/early-tracks',
      placements: [
        { kind: 'hero', before: 'media:first-light.aaaa111122223333', after: 'media:first-light.b42e0d51aaaa0000' },
        { kind: 'body', before: 'media:first-light.aaaa111122223333', after: 'media:first-light.b42e0d51aaaa0000' },
      ],
    },
    {
      concept: 'pages',
      id: 'the-crew',
      title: 'The crew page',
      placements: [
        { kind: 'hero', before: 'media:first-light.aaaa111122223333', after: 'media:first-light.b42e0d51aaaa0000' },
      ],
    },
  ],
  branchDelta: [
    { branch: 'cairn/posts/trailhead-notes', entries: [{ concept: 'posts', id: 'trailhead-notes' }] },
  ],
};

beforeEach(() => {
  vi.mocked(ingest.ingestFile).mockReset();
  vi.mocked(ingest.sendUpload).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CairnMediaLibrary Replace entry point and dialog', () => {
  it('places both new entry points beside Delete in the slide-over actions block', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const panel = await openSlideOver(screen, /first-light/);
    // The Replace and Push-alt entry points carry aria-haspopup="dialog" beside the Delete control.
    const replace = panel.querySelector('[data-cairn-replace-open]') as HTMLButtonElement;
    expect(replace).not.toBeNull();
    expect(replace.getAttribute('aria-haspopup')).toBe('dialog');
    expect(replace.textContent ?? '').toMatch(/replace image/i);
    expect(panel.textContent ?? '').toMatch(/push alt to placements/i);
  });

  it('opens the Replace dialog as an alertdialog on the upload step, Cancel focused', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await openReplace(screen, /first-light/);
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // The title and sub are wired to aria-labelledby / aria-describedby.
    const labelledby = dialog.getAttribute('aria-labelledby');
    const describedby = dialog.getAttribute('aria-describedby');
    expect(labelledby && dialog.querySelector(`#${labelledby}`)).toBeTruthy();
    expect(describedby && dialog.querySelector(`#${describedby}`)).toBeTruthy();
    // Step one is the upload step: the asset being replaced is named, and there is a file control.
    expect(dialog.textContent ?? '').toMatch(/first-light/);
    expect(dialog.querySelector('input[type="file"]')).not.toBeNull();
    // There is no apply button on the upload step.
    expect([...dialog.querySelectorAll('button')].some((b) => /replace in|replace \d/i.test(b.textContent ?? ''))).toBe(false);
    // Initial focus is Cancel (the destructive-confirm default).
    await expect.poll(() => (document.activeElement as HTMLElement)?.textContent?.toLowerCase()).toContain('cancel');
  });

  it('closing the dialog restores focus to the Replace entry point', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await openReplace(screen, /first-light/);
    const opener = screen.container.querySelector<HTMLButtonElement>('[data-cairn-replace-open]')!;
    // Cancel the dialog; focus returns to the entry-point button.
    const cancel = [...dialog.querySelectorAll('button')].find((b) => /^cancel$/i.test(b.textContent?.trim() ?? ''))!;
    cancel.click();
    await expect.poll(() => dialog.open).toBe(false);
    await expect.poll(() => document.activeElement).toBe(opener);
  });
});

describe('CairnMediaLibrary Replace impact review', () => {
  it('reaches the review step after upload, renders the content-hash copy, and never says the reference is unchanged', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    stubUpload(newRecord());
    stubPreviewFetch(successBody(REPLACE_PLAN));
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const dialog = await uploadThroughReplace(screen, /first-light/);

    // The preview resolved into the impact review: the affected entries are listed.
    await expect.poll(() => dialog.textContent ?? '').toContain('A season on the early tracks');
    expect(dialog.textContent ?? '').toContain('The crew page');

    // The CORRECTED content-addressed copy is present verbatim.
    expect(dialog.textContent ?? '').toMatch(/only the content hash changes/i);
    expect(dialog.textContent ?? '').toMatch(/the name first-light stays the same/i);
    // It must NEVER claim the reference is unchanged (the load-bearing rev.2 correction).
    expect(dialog.textContent ?? '').not.toMatch(/unchanged/i);

    // The report-only branch delta is named.
    expect(dialog.textContent ?? '').toContain('cairn/posts/trailhead-notes');
  });

  it('gates the apply button until the typed slug matches, and posts the replace form fields', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    stubUpload(newRecord());
    stubPreviewFetch(successBody(REPLACE_PLAN));
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const dialog = await uploadThroughReplace(screen, /first-light/);
    await expect.poll(() => dialog.textContent ?? '').toContain('A season on the early tracks');

    const form = [...dialog.querySelectorAll('form')].find((f) => f.getAttribute('action') === '?/mediaReplace')!;
    expect(form).toBeTruthy();
    const submit = [...form.querySelectorAll('button')].find((b) => b.getAttribute('type') === 'submit') as HTMLButtonElement;
    // Gated until the typed slug equals the asset slug (first-light).
    expect(submit.disabled).toBe(true);

    const confirm = dialog.querySelector('input[data-cairn-replace-confirm]') as HTMLInputElement;
    confirm.value = 'first-light';
    confirm.dispatchEvent(new Event('input', { bubbles: true }));
    await expect.poll(() => submit.disabled).toBe(false);

    // The apply form carries oldHash, newHash, confirmSlug, and the untrusted record under media.
    expect((form.querySelector('input[name="oldHash"]') as HTMLInputElement).value).toBe(DESCRIBED_USED.hash);
    expect((form.querySelector('input[name="newHash"]') as HTMLInputElement).value).toBe('b42e0d51aaaa0000');
    await expect.poll(() => (form.querySelector('input[name="confirmSlug"]') as HTMLInputElement).value).toBe('first-light');
    const media = JSON.parse((form.querySelector('input[name="media"]') as HTMLInputElement).value);
    expect(Array.isArray(media)).toBe(true);
    expect(media[0].hash).toBe('b42e0d51aaaa0000');
  });
});

describe('CairnMediaLibrary Replace fail-closed surface', () => {
  it('shows no apply button, names the branch, and offers Check usage again when the preview fails closed', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    stubUpload(newRecord());
    const failure: MediaReplaceFailure = {
      error: 'Could not read cairn/posts/trailhead-notes.',
      hash: DESCRIBED_USED.hash,
      usage: [],
      foundIn: 0,
    };
    stubPreviewFetch(failureBody(failure));
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const dialog = await uploadThroughReplace(screen, /first-light/);

    // The blocked face renders: no apply form at all (not a disabled button).
    await expect.poll(() => dialog.textContent ?? '').toMatch(/on hold|could not.*verif/i);
    expect([...dialog.querySelectorAll('form')].some((f) => f.getAttribute('action') === '?/mediaReplace')).toBe(false);
    expect([...dialog.querySelectorAll('button')].some((b) => /replace in|replace \d/i.test(b.textContent ?? ''))).toBe(false);

    // There is no typed-slug gate when nothing is safe to confirm.
    expect(dialog.querySelector('input[data-cairn-replace-confirm]')).toBeNull();

    // The specific unreadable branch from the failure error is named.
    expect(dialog.textContent ?? '').toContain('cairn/posts/trailhead-notes');

    // A quiet "Check usage again" control re-runs the scan.
    expect([...dialog.querySelectorAll('button')].some((b) => /check usage again/i.test(b.textContent ?? ''))).toBe(true);
  });

  it('falls back to a generic honest line when the failure names no branch', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    stubUpload(newRecord());
    const failure: MediaReplaceFailure = {
      error: 'Could not verify where this asset is used. Try again.',
      hash: DESCRIBED_USED.hash,
      usage: [],
      foundIn: 0,
    };
    stubPreviewFetch(failureBody(failure));
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const dialog = await uploadThroughReplace(screen, /first-light/);

    await expect.poll(() => dialog.textContent ?? '').toMatch(/on hold|could not.*verif/i);
    // No specific cairn/* branch in the failure, so the honest generic line stands in.
    expect(dialog.textContent ?? '').toMatch(/an edit branch would not load/i);
    expect([...dialog.querySelectorAll('button')].some((b) => /check usage again/i.test(b.textContent ?? ''))).toBe(true);
  });
});

describe('CairnMediaLibrary direct upload', () => {
  it('uploads a chosen file from the Upload button and refreshes', async () => {
    stubUpload(newRecord({ slug: 'trailhead', hash: 'ffff222233334444' }));
    const gotoCallsBefore = gotoCalls.length;
    const screen = render(CairnMediaLibrary, { data: fixture({ assets: [], usage: {} }) } as never);

    // The header Upload button (exact accessible name, distinct from the empty-state "Upload an
    // image" CTA) opens the native file chooser through the hidden input.
    await screen.getByRole('button', { name: /^upload$/i }).click();
    const fileInput = screen.container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([PNG_BYTES], 'trailhead.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    const dialog = screen.container.querySelector('[data-testid="cairn-library-upload-dialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);

    // Fill the capture card's name, then submit.
    const nameInput = dialog.querySelector('input') as HTMLInputElement;
    nameInput.value = 'Trailhead sign';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    const submit = [...dialog.querySelectorAll('button')].find((b) => b.getAttribute('type') === 'submit') as HTMLButtonElement;
    submit.click();

    await expect.poll(() => vi.mocked(ingest.sendUpload).mock.calls.length).toBe(1);
    expect(vi.mocked(ingest.sendUpload).mock.calls[0][0]).toBe('?/mediaLibraryUpload');
    await expect.poll(() => gotoCalls.length).toBe(gotoCallsBefore + 1);
    expect(gotoCalls[gotoCalls.length - 1]).toBe('/admin/media?uploaded=1');
    // invalidateAll: true rides alongside the flash URL, so a second upload landing on the
    // identical ?uploaded=1 URL still forces the loader to re-run rather than a no-op navigation.
    expect(gotoOptsCalls[gotoOptsCalls.length - 1]).toEqual({ invalidateAll: true });
  });

  it('accepts a dropped file on the page dropzone', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture({ assets: [], usage: {} }) } as never);
    const file = new File([PNG_BYTES], 'trailhead.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));

    const dialog = screen.container.querySelector('[data-testid="cairn-library-upload-dialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);
    // MediaCaptureCard renders (its own form, not a status/failed treatment).
    expect(dialog.querySelector('form')).not.toBeNull();
  });

  it('prevents the browser default on a page dragover carrying a file, not just on drop', async () => {
    // dataTransfer.files is empty during a real dragover (the HTML DnD spec's protected mode); only
    // dataTransfer.types is readable at that stage. A script-constructed DragEvent's DataTransfer does
    // not reproduce that restriction (items.add() populates .files too), so a plain Event with a
    // stubbed dataTransfer models the real browser shape: types carries 'Files', files does not exist.
    render(CairnMediaLibrary, { data: fixture({ assets: [], usage: {} }) } as never);
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'] }, configurable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

// --- Task 8: the Alt-propagation review modal (the three buckets, the native opt-in, the moving total) ---

// The default alt being pushed (DESCRIBED_USED carries this alt; the dialog propagates it).
const PUSHED_ALT = 'A pair of blue running shoes';

// A plan spanning all three buckets with distinct entry titles: one will-fill (a body image with no
// alt), one customized (a body image with the editor's own alt), and one decorative-skipped hero. The
// counts are the bucket totals the moving footer reads.
const ALT_PLAN: MediaAltPreviewPlan = {
  entries: [
    {
      concept: 'posts',
      id: 'early-tracks',
      title: 'A season on the early tracks',
      permalink: '/posts/early-tracks',
      placements: [{ kind: 'body', bucket: 'will-fill', before: '', after: PUSHED_ALT }],
    },
    {
      concept: 'posts',
      id: 'the-far-turn',
      title: 'The far turn',
      placements: [
        { kind: 'body', bucket: 'customized', before: 'The turn most skiers stop for.', after: 'The turn most skiers stop for.' },
      ],
    },
    {
      concept: 'pages',
      id: 'the-crew',
      title: 'The crew page',
      placements: [{ kind: 'hero', bucket: 'decorative-skipped', before: '', after: '' }],
    },
  ],
  branchDelta: [{ branch: 'cairn/posts/from-the-ridge', entries: [{ concept: 'posts', id: 'from-the-ridge' }] }],
  counts: { willFill: 1, customized: 1, decorativeSkipped: 1 },
};

// Open the Push-alt dialog: open the slide-over for an asset, click "Push alt to placements", and wait
// for the dialog to open. Mirrors openReplace.
async function openPushAlt(screen: ReturnType<typeof render>, name: RegExp) {
  await openSlideOver(screen, name);
  const button = screen.container.querySelector<HTMLButtonElement>('[data-cairn-pushalt-open]')!;
  button.click();
  const dialog = screen.container.querySelector('[data-testid="cairn-alt-dialog"]') as HTMLDialogElement;
  await expect.poll(() => dialog.open).toBe(true);
  return dialog;
}

// Open the dialog and resolve the preview, so it reaches the review state. Returns the dialog.
async function pushAltThroughPreview(screen: ReturnType<typeof render>, name: RegExp) {
  stubPreviewFetch(successBody(ALT_PLAN));
  const dialog = await openPushAlt(screen, name);
  await expect.poll(() => dialog.textContent ?? '').toContain('A season on the early tracks');
  return dialog;
}

describe('CairnMediaLibrary Push-alt dialog', () => {
  it('opens as role="dialog" (the everyday register, not alertdialog), aria-modal, labelled and described', async () => {
    stubPreviewFetch(successBody(ALT_PLAN));
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await openPushAlt(screen, /first-light/);
    expect(dialog.getAttribute('role')).toBe('dialog');
    // It is the everyday register, never the alertdialog Replace uses.
    expect(dialog.getAttribute('role')).not.toBe('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledby = dialog.getAttribute('aria-labelledby');
    const describedby = dialog.getAttribute('aria-describedby');
    expect(labelledby && dialog.querySelector(`#${labelledby}`)).toBeTruthy();
    expect(describedby && dialog.querySelector(`#${describedby}`)).toBeTruthy();
  });

  it('closing the dialog restores focus to the Push-alt entry point', async () => {
    stubPreviewFetch(successBody(ALT_PLAN));
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await openPushAlt(screen, /first-light/);
    const opener = screen.container.querySelector<HTMLButtonElement>('[data-cairn-pushalt-open]')!;
    const cancel = [...dialog.querySelectorAll('button')].find((b) => /^cancel$/i.test(b.textContent?.trim() ?? ''))!;
    cancel.click();
    await expect.poll(() => dialog.open).toBe(false);
    await expect.poll(() => document.activeElement).toBe(opener);
  });
});

describe('CairnMediaLibrary Push-alt three buckets', () => {
  it('shows the work-tuned headline, the alt being pushed once, and each entry title in its bucket', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await pushAltThroughPreview(screen, /first-light/);

    // The headline is tuned to the will-fill count.
    expect(dialog.textContent ?? '').toMatch(/fill alt on 1 placement/i);
    // The alt being pushed is shown once.
    expect(dialog.textContent ?? '').toContain(PUSHED_ALT);
    // Each bucket names its entry.
    expect(dialog.textContent ?? '').toContain('A season on the early tracks'); // will-fill
    expect(dialog.textContent ?? '').toContain('The far turn'); // customized
    expect(dialog.textContent ?? '').toContain('The crew page'); // decorative-skipped
    // The report-only branch delta is named.
    expect(dialog.textContent ?? '').toContain('cairn/posts/from-the-ridge');
  });

  it('renders the will-fill bucket with the body-vs-hero caveat beside it', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await pushAltThroughPreview(screen, /first-light/);
    // The will-fill row shows the (no alt) -> default arrow.
    expect(dialog.textContent ?? '').toMatch(/no alt/i);
    // The caveat: a body image cannot record decorative, only a hero can be skipped.
    expect(dialog.textContent ?? '').toMatch(/only a hero can be skipped/i);
  });

  it('renders the decorative-skipped bucket as listed and muted with no input', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await pushAltThroughPreview(screen, /first-light/);
    const skip = dialog.querySelector('[data-cairn-alt-skip]') as HTMLElement;
    expect(skip).not.toBeNull();
    expect(skip.textContent ?? '').toMatch(/decorative/i);
    expect(skip.textContent ?? '').toContain('The crew page');
    // The skip bucket never carries a form input.
    expect(skip.querySelector('input')).toBeNull();
  });
});

describe('CairnMediaLibrary Push-alt overwrite opt-in', () => {
  it('exposes a real native checkbox in the a11y tree, kept-before and struck was->default after', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await pushAltThroughPreview(screen, /first-light/);

    // The opt-in is a real native <input type="checkbox"> inside its label.
    const optin = dialog.querySelector('[data-cairn-alt-optin]') as HTMLInputElement;
    expect(optin).not.toBeNull();
    expect(optin.type).toBe('checkbox');
    expect(optin.closest('label')).not.toBeNull();
    expect(optin.checked).toBe(false);

    // The customized bucket: before opt-in, the row shows the existing alt plain and "kept".
    const custom = dialog.querySelector('[data-cairn-alt-custom]') as HTMLElement;
    expect(custom.textContent ?? '').toContain('The turn most skiers stop for.');
    expect(custom.textContent ?? '').toMatch(/kept/i);
    // No struck "was" before the opt-in is checked.
    expect(custom.querySelector('[data-cairn-alt-was]')).toBeNull();

    // Check the opt-in: the row flips to the struck was -> default form.
    optin.checked = true;
    optin.dispatchEvent(new Event('change', { bubbles: true }));
    await expect.poll(() => custom.querySelector('[data-cairn-alt-was]')).not.toBeNull();
    expect(custom.textContent ?? '').toContain(PUSHED_ALT);
    // "kept" is gone now that the row is overwritten.
    await expect.poll(() => /kept/i.test(custom.textContent ?? '')).toBe(false);
  });

  it('moves the committed total in the footer button and the live region when the opt-in toggles', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await pushAltThroughPreview(screen, /first-light/);

    const applyButton = () => [...dialog.querySelectorAll('button')].find((b) => /fill \d|update \d/i.test(b.textContent ?? ''))!;
    const live = dialog.querySelector('[role="status"][aria-live="polite"]') as HTMLElement;

    // Unchecked: the total is the will-fill count (1). The footer reads "Fill 1 placement".
    expect(applyButton().textContent ?? '').toMatch(/fill 1 placement/i);
    expect(live.textContent ?? '').toMatch(/writing alt to 1 placement/i);

    // Check the opt-in: the total moves to willFill + customized (2). The footer reads "Update 2".
    const optin = dialog.querySelector('[data-cairn-alt-optin]') as HTMLInputElement;
    optin.checked = true;
    optin.dispatchEvent(new Event('change', { bubbles: true }));
    await expect.poll(() => applyButton().textContent ?? '').toMatch(/update 2 placements/i);
    expect(live.textContent ?? '').toMatch(/writing alt to 2 placements/i);
  });

  it('posts the apply form to ?/mediaAltPropagate with the hash and the overwrite flag tracking the opt-in', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await pushAltThroughPreview(screen, /first-light/);

    const form = [...dialog.querySelectorAll('form')].find((f) => f.getAttribute('action') === '?/mediaAltPropagate')!;
    expect(form).toBeTruthy();
    // The hidden hash names the asset.
    expect((form.querySelector('input[name="hash"]') as HTMLInputElement).value).toBe(DESCRIBED_USED.hash);
    // Apply is always enabled (alt fill is reversible, no typed gate).
    const submit = [...form.querySelectorAll('button')].find((b) => b.getAttribute('type') === 'submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    // The overwrite flag is posted as a hidden input mirroring the opt-in; the server reads
    // form.get('overwrite') === 'on'. Before the opt-in it is empty; checking the box sets it to 'on'.
    const overwriteField = form.querySelector('input[name="overwrite"]') as HTMLInputElement;
    expect(overwriteField).not.toBeNull();
    expect(overwriteField.value).not.toBe('on');

    const optin = dialog.querySelector('[data-cairn-alt-optin]') as HTMLInputElement;
    optin.checked = true;
    optin.dispatchEvent(new Event('change', { bubbles: true }));
    await expect.poll(() => (form.querySelector('input[name="overwrite"]') as HTMLInputElement).value).toBe('on');
  });
});

describe('CairnMediaLibrary Push-alt fail-closed surface', () => {
  it('shows a blocked surface with no apply form and a Check usage again control when the preview fails closed', async () => {
    const failure: MediaAltPropagateFailure = { error: 'Could not verify where this asset is used. Try again.' };
    stubPreviewFetch(failureBody(failure));
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await openPushAlt(screen, /first-light/);

    // The blocked face: a quiet "could not verify" surface, no apply form, a re-run control.
    await expect.poll(() => dialog.textContent ?? '').toMatch(/could not.*verif|on hold/i);
    expect([...dialog.querySelectorAll('form')].some((f) => f.getAttribute('action') === '?/mediaAltPropagate')).toBe(false);
    expect([...dialog.querySelectorAll('button')].some((b) => /check usage again/i.test(b.textContent ?? ''))).toBe(true);
    // No opt-in checkbox when nothing was verified.
    expect(dialog.querySelector('input[name="overwrite"]')).toBeNull();
  });
});

// --- Pass B fix-up: focus-to-first-revealed-row on "Show all", and the Replace live region role ---

// A Replace plan with more entries than the row cap (8), so the "Show the other N entries" expander
// renders. Each entry carries one hero placement.
const REPLACE_PLAN_MANY: MediaReplacePreviewPlan = {
  affectedCount: 11,
  entries: Array.from({ length: 11 }, (_, i) => ({
    concept: 'posts',
    id: `entry-${i}`,
    title: `Entry number ${i}`,
    permalink: `/posts/entry-${i}`,
    placements: [
      { kind: 'hero' as const, before: 'media:first-light.aaaa111122223333', after: 'media:first-light.b42e0d51aaaa0000' },
    ],
  })),
  branchDelta: [],
};

// An alt plan with more will-fill placements than the row cap (8), so the will-fill "Show the other N
// placements" expander renders. Each entry contributes one will-fill body placement.
const ALT_PLAN_MANY: MediaAltPreviewPlan = {
  entries: Array.from({ length: 11 }, (_, i) => ({
    concept: 'posts',
    id: `fill-${i}`,
    title: `Fill entry ${i}`,
    permalink: `/posts/fill-${i}`,
    placements: [{ kind: 'body' as const, bucket: 'will-fill' as const, before: '', after: PUSHED_ALT }],
  })),
  branchDelta: [],
  counts: { willFill: 11, customized: 0, decorativeSkipped: 0 },
};

describe('CairnMediaLibrary "Show all" moves focus to the first revealed row', () => {
  it('Replace: clicking "Show all" focuses a revealed entry row, not the body', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    stubUpload(newRecord());
    stubPreviewFetch(successBody(REPLACE_PLAN_MANY));
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const dialog = await uploadThroughReplace(screen, /first-light/);
    await expect.poll(() => dialog.textContent ?? '').toContain('Entry number 0');

    const list = dialog.querySelector('#cairn-ml-replace-entries') as HTMLElement;
    // The capped list shows 8 of 11; the expander offers the other 3.
    expect(list.querySelectorAll('li').length).toBe(8);
    const expander = [...dialog.querySelectorAll('button')].find((b) => /show the other 3 entries/i.test(b.textContent ?? ''))!;
    expect(expander).toBeTruthy();

    expander.click();
    // The reveal mounts every row, and focus lands on the first newly revealed row (the 9th), never
    // on <body> (the bug: the activated button unmounts and drops focus).
    await expect.poll(() => list.querySelectorAll('li').length).toBe(11);
    await expect.poll(() => document.activeElement).not.toBe(document.body);
    const rows = [...list.querySelectorAll('li')];
    expect(document.activeElement).toBe(rows[8]);
  });

  it('Push-alt: clicking "Show all" focuses a revealed will-fill row, not the body', async () => {
    stubPreviewFetch(successBody(ALT_PLAN_MANY));
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const dialog = await openPushAlt(screen, /first-light/);
    await expect.poll(() => dialog.textContent ?? '').toContain('Fill entry 0');

    const list = dialog.querySelector('#cairn-ml-alt-fill') as HTMLElement;
    expect(list.querySelectorAll('li').length).toBe(8);
    const expander = [...dialog.querySelectorAll('button')].find((b) => /show the other 3 placements/i.test(b.textContent ?? ''))!;
    expect(expander).toBeTruthy();

    expander.click();
    await expect.poll(() => list.querySelectorAll('li').length).toBe(11);
    await expect.poll(() => document.activeElement).not.toBe(document.body);
    const rows = [...list.querySelectorAll('li')];
    expect(document.activeElement).toBe(rows[8]);
  });
});

describe('CairnMediaLibrary Replace review live region', () => {
  it('carries role="status" on the polite live region for a portable announcement', async () => {
    const usage = { [DESCRIBED_USED.hash]: mixedUsage() };
    stubUpload(newRecord());
    stubPreviewFetch(successBody(REPLACE_PLAN));
    const screen = render(CairnMediaLibrary, { data: fixture({ usage }) } as never);
    const dialog = await uploadThroughReplace(screen, /first-light/);
    await expect.poll(() => dialog.textContent ?? '').toContain('A season on the early tracks');

    // The review live region matches the Push-alt one: role="status" plus aria-live="polite".
    const live = [...dialog.querySelectorAll('[role="status"][aria-live="polite"]')].find((el) =>
      /replace first-light in/i.test(el.textContent ?? ''),
    );
    expect(live).toBeTruthy();
  });
});

describe('CairnMediaLibrary preview in-flight guard', () => {
  it('Push-alt: a stale preview from a prior open never clobbers the dialog reopened for another asset', async () => {
    // The first open's preview is deferred so it lands LATE, after the dialog is reopened for a second
    // asset whose own preview already resolved. Without the per-call guard the stale response would
    // overwrite the fresh plan; the guard must drop it. Each fetch call returns the next queued body.
    let resolveFirst: (body: string) => void = () => {};
    const firstBody = new Promise<string>((r) => {
      resolveFirst = r;
    });
    const ALT_PLAN_SECOND: MediaAltPreviewPlan = {
      entries: [
        {
          concept: 'posts',
          id: 'second-asset',
          title: 'The second asset entry',
          permalink: '/posts/second-asset',
          placements: [{ kind: 'body', bucket: 'will-fill', before: '', after: PUSHED_ALT }],
        },
      ],
      branchDelta: [],
      counts: { willFill: 1, customized: 0, decorativeSkipped: 0 },
    };
    const bodies: (string | Promise<string>)[] = [firstBody, successBody(ALT_PLAN_SECOND)];
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const body = bodies[call++];
        return { status: 200, text: async () => body } as unknown as Response;
      }),
    );

    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    // First open (its preview is in flight, deferred).
    const dialog = await openPushAlt(screen, /first-light/);
    const cancel = () => [...dialog.querySelectorAll('button')].find((b) => /^cancel$/i.test(b.textContent?.trim() ?? ''))!;
    cancel().click();
    await expect.poll(() => dialog.open).toBe(false);

    // Reopen for a second asset; its preview resolves immediately to the second plan.
    await openSlideOver(screen, /meadow-fence/);
    screen.container.querySelector<HTMLButtonElement>('[data-cairn-pushalt-open]')!.click();
    await expect.poll(() => dialog.open).toBe(true);
    await expect.poll(() => dialog.textContent ?? '').toContain('The second asset entry');

    // Now let the FIRST (stale) preview land. The guard drops it: the second plan stays put.
    resolveFirst(successBody(ALT_PLAN));
    await tick();
    await new Promise((r) => setTimeout(r, 30));
    expect(dialog.textContent ?? '').toContain('The second asset entry');
    expect(dialog.textContent ?? '').not.toContain('A season on the early tracks');
  });
});

describe('CairnMediaLibrary multi-select', () => {
  // The grid is an APG multiselectable listbox: focus and selection are decoupled. Space toggles the
  // focused tile, Shift+Arrow extends a range, Ctrl/Cmd+A selects every visible asset, and Escape
  // clears. The sticky action bar appears once a selection exists, with a live count.
  const grid = (screen: ReturnType<typeof render>) =>
    screen.container.querySelector('[role="listbox"]')!;
  const options = (screen: ReturnType<typeof render>) =>
    [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')];
  const selectionBar = (screen: ReturnType<typeof render>) =>
    screen.container.querySelector<HTMLElement>('[aria-label="Selection actions"]');
  // The selection-count live region is its own sr-only role=status node carrying "N selected".
  const selectionStatus = (screen: ReturnType<typeof render>) =>
    [...screen.container.querySelectorAll('[role="status"]')].find((n) =>
      /\bselected\b/i.test(n.textContent ?? ''),
    );

  it('advertises the grid as aria-multiselectable and the table as a selectable-checkbox table', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    // The grid is a real APG multiselectable listbox.
    expect(grid(screen).getAttribute('aria-multiselectable')).toBe('true');

    await screen.getByRole('button', { name: /list view/i }).click();
    const table = screen.container.querySelector('table')!;
    // The table is a plain selectable table: no grid-ism, just a per-row select checkbox. The grid
    // role with aria-multiselectable but no cell navigation was a false a11y promise; the native
    // checkbox column is the APG-correct selection signal.
    expect(table.getAttribute('aria-multiselectable')).toBeNull();
    expect(table.getAttribute('role')).toBeNull();
    const rowCheckbox = table.querySelector<HTMLInputElement>('tbody input[type="checkbox"]');
    expect(rowCheckbox).not.toBeNull();
  });

  it('toggles selection on the focused tile with Space, never opening the slide-over', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const first = options(screen)[0];
    first.focus();

    first.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await expect.poll(() => options(screen)[0].getAttribute('aria-selected')).toBe('true');
    // Space selected, it did NOT activate: no detail slide-over opened.
    expect(screen.container.querySelector('[role="region"][aria-label$="details"]')).toBeNull();
    // Focus stayed on the toggled tile.
    expect(document.activeElement).toBe(options(screen)[0]);

    // Space again toggles it back off.
    options(screen)[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await expect.poll(() => options(screen)[0].getAttribute('aria-selected')).toBe('false');
  });

  it('updates the role=status live region and shows the sticky action bar with the count', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    // No selection: no bar.
    expect(selectionBar(screen)).toBeNull();

    const opts = options(screen);
    opts[0].focus();
    opts[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await expect.poll(() => selectionBar(screen)).not.toBeNull();

    // The live region announces the count, and the bar shows it.
    await expect.poll(() => selectionStatus(screen)?.textContent ?? '').toMatch(/\b1 selected\b/i);
    expect(selectionBar(screen)!.textContent ?? '').toContain('1');

    // A second tile: the count climbs to 2 in both the status region and the bar.
    const next = options(screen)[1];
    next.focus();
    next.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await expect.poll(() => selectionStatus(screen)?.textContent ?? '').toMatch(/\b2 selected\b/i);
    expect(selectionBar(screen)!.textContent ?? '').toMatch(/2 selected/i);
  });

  it('offers a Clear in the sticky bar that empties the selection', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const first = options(screen)[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await expect.poll(() => selectionBar(screen)).not.toBeNull();

    const clear = [...selectionBar(screen)!.querySelectorAll('button')].find((b) =>
      /^clear$/i.test(b.textContent?.trim() ?? ''),
    )!;
    expect(clear).toBeTruthy();
    clear.click();
    await expect.poll(() => selectionBar(screen)).toBeNull();
    expect(options(screen).filter((o) => o.getAttribute('aria-selected') === 'true').length).toBe(0);
  });

  it('selects all visible assets with Ctrl/Cmd+A and clears the selection with Escape', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const first = options(screen)[0];
    first.focus();

    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }),
    );
    await expect.poll(
      () => options(screen).filter((o) => o.getAttribute('aria-selected') === 'true').length,
    ).toBe(4);
    expect(selectionStatus(screen)?.textContent ?? '').toMatch(/\b4 selected\b/i);

    // Escape clears the whole selection (no dialog, no slide-over open).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.poll(() => selectionBar(screen)).toBeNull();
    expect(options(screen).filter((o) => o.getAttribute('aria-selected') === 'true').length).toBe(0);
  });

  it('extends a contiguous range with Shift+Arrow from the toggle anchor', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const first = options(screen)[0];
    first.focus();
    // Anchor at index 0.
    first.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await expect.poll(() => options(screen)[0].getAttribute('aria-selected')).toBe('true');

    // Shift+ArrowRight twice: range 0..2 selected, index 3 left out.
    options(screen)[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }),
    );
    await expect.poll(() => document.activeElement).toBe(options(screen)[1]);
    options(screen)[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }),
    );
    await expect.poll(
      () => options(screen).filter((o) => o.getAttribute('aria-selected') === 'true').length,
    ).toBe(3);
    const selected = options(screen).map((o) => o.getAttribute('aria-selected'));
    expect(selected.slice(0, 3)).toEqual(['true', 'true', 'true']);
    expect(selected[3]).toBe('false');
  });

  it('exposes a native checkbox per tile that toggles selection without opening the slide-over', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const opt = options(screen)[0];
    const box = opt.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(box).toBeTruthy();
    expect(box.getAttribute('aria-label') ?? '').toMatch(/^select /i);

    box.click();
    await expect.poll(() => options(screen)[0].getAttribute('aria-selected')).toBe('true');
    expect(box.checked).toBe(true);
    // Clicking the checkbox never opens the detail region.
    expect(screen.container.querySelector('[role="region"][aria-label$="details"]')).toBeNull();
  });

  it('carries the selection into the table with a leading native checkbox column', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await screen.getByRole('button', { name: /list view/i }).click();

    const rowBoxes = [...screen.container.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')];
    expect(rowBoxes.length).toBe(4);
    expect(rowBoxes[0].getAttribute('aria-label') ?? '').toMatch(/^select /i);

    rowBoxes[0].click();
    await expect.poll(() => selectionBar(screen)).not.toBeNull();
    expect(selectionStatus(screen)?.textContent ?? '').toMatch(/\b1 selected\b/i);
  });
});

describe('CairnMediaLibrary the no-references rename', () => {
  it('names the triage facet "No references found", never "Unused"', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const radios = [...screen.container.querySelectorAll('[role="radio"]')];
    expect(radios.some((r) => /no references found/i.test(r.textContent ?? ''))).toBe(true);
    expect(radios.some((r) => /unused/i.test(r.textContent ?? ''))).toBe(false);
  });

  it('carries the raw-HTML blind-spot caveat on the No references found facet', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const radios = [...screen.container.querySelectorAll<HTMLElement>('[role="radio"]')];
    radios.find((r) => /no references found/i.test(r.textContent ?? ''))!.click();
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(2);
    // The caveat names the blind spot at the point of action: a found reference is not proof of use.
    expect(screen.container.textContent ?? '').toMatch(/raw-html|cannot see|not the same as unused/i);
  });
});

// --- Task 8: the bulk-delete alertdialog (the skip-and-report dry-run, the reversible register,
// the announced progress, and the itemized summary) ---
describe('CairnMediaLibrary bulk-delete dialog', () => {
  // Select the three assets the rev.2 mockup splits: two with no references (UNUSED, BROKEN) and one
  // still in use (DESCRIBED_USED, found in 3 entries). The selection rides the grid checkboxes.
  async function selectFor(screen: ReturnType<typeof render>) {
    const opts = [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')];
    for (const name of [/meadow-fence/, /old-pylon/, /first-light/]) {
      const box = opts.find((o) => name.test(o.textContent ?? ''))!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      box.click();
    }
    await expect.poll(() => screen.container.querySelector('[aria-label="Selection actions"]')).not.toBeNull();
  }
  const barDelete = (screen: ReturnType<typeof render>) =>
    [...screen.container.querySelector('[aria-label="Selection actions"]')!.querySelectorAll('button')].find((b) =>
      /^delete\s/i.test(b.textContent?.trim() ?? ''),
    )!;
  const bulkDialog = (screen: ReturnType<typeof render>) =>
    screen.container.querySelector('[data-testid="cairn-bulk-dialog"]') as HTMLDialogElement;

  it('opens an alertdialog with the will-delete and will-skip groups and an outcome-naming apply', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await selectFor(screen);
    barDelete(screen).click();

    const dialog = bulkDialog(screen);
    expect(dialog).not.toBeNull();
    await expect.poll(() => dialog.open).toBe(true);
    expect(dialog.getAttribute('role')).toBe('alertdialog');

    // The will-delete group lists the two no-reference assets; the will-skip group reports the in-use
    // one with its where-used and points to the single-item typed path.
    expect(dialog.textContent ?? '').toMatch(/will be deleted/i);
    expect(dialog.textContent ?? '').toContain('meadow-fence');
    expect(dialog.textContent ?? '').toContain('old-pylon');
    expect(dialog.textContent ?? '').toMatch(/will be skipped/i);
    expect(dialog.textContent ?? '').toContain('first-light');
    expect(dialog.textContent ?? '').toMatch(/3 entries/i);
    expect(dialog.textContent ?? '').toMatch(/typed confirm|open it/i);

    // The git-revert reassurance sits in the body.
    expect(dialog.textContent ?? '').toMatch(/revert/i);

    // The apply button names the outcome: 2 deletable, 1 skipped.
    const apply = [...dialog.querySelectorAll('button')].find((b) => /^delete\s+2,\s*skip\s+1$/i.test(b.textContent?.trim() ?? ''));
    expect(apply).toBeTruthy();
  });

  it('uses a plain confirm: no typed-slug input inside the bulk dialog', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await selectFor(screen);
    barDelete(screen).click();
    const dialog = bulkDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);
    // The single-delete dialog gates on a typed slug; the reversible bulk delete must not.
    expect(dialog.querySelector('input[type="text"]')).toBeNull();
    expect(dialog.querySelector('#cairn-ml-confirm')).toBeNull();
  });

  it('restores focus to the bar Delete button when the dialog is cancelled', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await selectFor(screen);
    const trigger = barDelete(screen);
    trigger.click();
    const dialog = bulkDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);

    const cancel = [...dialog.querySelectorAll('button')].find((b) => /^cancel$/i.test(b.textContent?.trim() ?? ''))!;
    cancel.click();
    await expect.poll(() => dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('renders the itemized summary (deleted count + skipped-with-reason) after the stubbed result', async () => {
    const result = {
      deleted: ['cccc777788889999', 'dddd000011112222'],
      skipped: [
        {
          hash: 'aaaa111122223333',
          reason: 'still-referenced' as const,
          usage: [
            { concept: 'posts', id: 'a', title: 'A', origin: { kind: 'published' as const } },
            { concept: 'posts', id: 'b', title: 'B', origin: { kind: 'published' as const } },
            { concept: 'posts', id: 'c', title: 'C', origin: { kind: 'published' as const } },
          ],
        },
      ],
      failed: [],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, text: async () => successBody(result) }) as unknown as Response),
    );

    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    await selectFor(screen);
    barDelete(screen).click();
    const dialog = bulkDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);

    const apply = [...dialog.querySelectorAll('button')].find((b) => /^delete\s+2,\s*skip\s+1$/i.test(b.textContent?.trim() ?? ''))!;
    apply.click();

    // The summary names 2 deleted and the skipped row with its reason and where-used.
    await expect.poll(() => dialog.textContent ?? '').toMatch(/2 deleted|done\. 2/i);
    expect(dialog.textContent ?? '').toMatch(/skipped/i);
    expect(dialog.textContent ?? '').toContain('first-light');
    expect(dialog.textContent ?? '').toMatch(/3 entries|recheck/i);
  });
});

// --- Task 9: the orphan scan surface (the on-demand scan, the fail-closed blocked state, the two
// sections, the irreversible purge typed-count confirm, the read-only broken-references readout) ---
describe('CairnMediaLibrary orphan scan surface', () => {
  // The scan modal opened from the toolbar's "Find orphaned files" office control.
  const scanDialog = (screen: ReturnType<typeof render>) =>
    screen.container.querySelector('[data-testid="cairn-orphan-dialog"]') as HTMLDialogElement;
  const findButton = (screen: ReturnType<typeof render>) =>
    [...screen.container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      /find orphaned files/i.test(b.textContent ?? ''),
    )!;

  // An OrphanScan with two orphaned bytes and one broken reference, the rev.2 fixture.
  const SCAN = {
    orphanedBytes: [
      { key: 'media/a3/a3f81c0e9b2d4f.jpg', hash: 'a3f81c0e9b2d4f00' },
      { key: 'media/77/77d20a14c6e8b1.png', hash: '77d20a14c6e8b100' },
    ],
    brokenRefs: [
      {
        hash: '0b9d77feaaaa0000',
        slug: 'map-2021',
        usage: [{ concept: 'posts', id: 'trailhead', title: 'Trailhead notes', origin: { kind: 'published' as const } }],
      },
    ],
  };

  it('runs the scan from "Find orphaned files" and shows the blocked fail-closed surface on a 503 with no purge control', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({ status: 503, text: async () => failureBody({ error: 'Could not check where files are used, so the scan was not run. Try again.' }) }) as unknown as Response,
      ),
    );

    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    findButton(screen).click();
    const dialog = scanDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);

    // The blocked surface names that the scan did not run and frames the unreadable open edit branch.
    await expect.poll(() => dialog.textContent ?? '').toMatch(/could not finish|was not run|not run/i);
    expect(dialog.textContent ?? '').toMatch(/open edit|branch/i);
    // The server's returned error message is surfaced verbatim.
    expect(dialog.textContent ?? '').toMatch(/Could not check where files are used/i);
    // There is a re-run control, and NO purge control at all (not even disabled).
    expect([...dialog.querySelectorAll('button')].some((b) => /check again|try the scan again|scan again/i.test(b.textContent ?? ''))).toBe(true);
    expect([...dialog.querySelectorAll('button')].some((b) => /purge/i.test(b.textContent ?? ''))).toBe(false);
  });

  it('posts the scan with a body so a SvelteKit form action accepts it (no body is a 415)', async () => {
    // A SvelteKit form action rejects a body-less POST with 415 Unsupported Media Type before the
    // action runs, so the scan fetch must carry a form body. Capture the init and assert a body is
    // sent (an empty FormData is enough to set the multipart content-type).
    const calls: RequestInit[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        calls.push(init ?? {});
        return { status: 200, text: async () => successBody(SCAN) } as unknown as Response;
      }),
    );

    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    findButton(screen).click();
    const dialog = scanDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);
    await expect.poll(() => calls.length).toBeGreaterThan(0);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toBeInstanceOf(FormData);
  });

  it('renders the orphaned-files section with byte-rows, an indeterminate section select-all, and a solid-danger Purge gated by the typed count', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, text: async () => successBody(SCAN) }) as unknown as Response),
    );

    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    findButton(screen).click();
    const dialog = scanDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);
    await expect.poll(() => dialog.textContent ?? '').toMatch(/orphaned files/i);

    // The two byte-rows render their R2 keys.
    expect(dialog.textContent ?? '').toContain('media/a3/a3f81c0e9b2d4f.jpg');
    expect(dialog.textContent ?? '').toContain('media/77/77d20a14c6e8b1.png');

    // The section-level select-all checkbox is indeterminate when some-but-not-all are selected.
    const selectAll = dialog.querySelector<HTMLInputElement>('input[type="checkbox"][aria-label="Select all orphaned files"]')!;
    expect(selectAll).not.toBeNull();
    const rowBoxes = [...dialog.querySelectorAll<HTMLInputElement>('[aria-label="Orphaned files"] input[type="checkbox"]')];
    expect(rowBoxes.length).toBe(2);
    // Nothing selected at open: the select-all is unchecked and not indeterminate.
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(false);
    // Select one of two: the header goes indeterminate.
    rowBoxes[0].click();
    await expect.poll(() => selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);
    // Select the second too: the header is fully checked, not indeterminate.
    rowBoxes[1].click();
    await expect.poll(() => selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);

    // The Purge control is the solid-danger fill and carries the verb "Purge", never "Delete".
    const purge = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((b) => /^purge/i.test(b.textContent?.trim() ?? ''))!;
    expect(purge).toBeTruthy();
    expect(purge.className).toMatch(/--color-error/);

    // Open the purge confirm and assert the typed-count gate: the submit is disabled until the count is typed.
    purge.click();
    await expect.poll(() => dialog.textContent ?? '').toMatch(/cannot be undone|no git history|for good/i);
    const confirmInput = dialog.querySelector<HTMLInputElement>('#cairn-ml-purge-confirm')!;
    expect(confirmInput).not.toBeNull();
    const purgeSubmit = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => /^purge\s+\d/i.test(b.textContent?.trim() ?? '') && b !== purge,
    )!;
    expect(purgeSubmit.disabled).toBe(true);
    // A wrong value keeps it disabled.
    confirmInput.value = '1';
    confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(purgeSubmit.disabled).toBe(true);
    // The exact selected count enables it.
    confirmInput.value = '2';
    confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
    await expect.poll(() => purgeSubmit.disabled).toBe(false);
  });

  it('renders the broken-references section read-only: the slug, the where-used, and no checkbox or purge/delete control', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, text: async () => successBody(SCAN) }) as unknown as Response),
    );

    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    findButton(screen).click();
    const dialog = scanDialog(screen);
    await expect.poll(() => dialog.open).toBe(true);
    await expect.poll(() => dialog.textContent ?? '').toMatch(/broken references/i);

    const brokenSection = dialog.querySelector('[data-testid="cairn-broken-refs"]') as HTMLElement;
    expect(brokenSection).not.toBeNull();
    // The broken-ref row names the manifest slug, its where-used, and the re-upload-or-remove advice.
    expect(brokenSection.textContent ?? '').toContain('map-2021');
    expect(brokenSection.textContent ?? '').toMatch(/1 entry/i);
    expect(brokenSection.textContent ?? '').toMatch(/re-upload|remove the reference/i);
    // It is READ-ONLY: no checkbox, no purge/delete control inside the section.
    expect(brokenSection.querySelector('input[type="checkbox"]')).toBeNull();
    expect([...brokenSection.querySelectorAll('button')].some((b) => /purge|delete/i.test(b.textContent ?? ''))).toBe(false);
  });
});
