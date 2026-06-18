import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CairnMediaLibrary from '../../lib/components/CairnMediaLibrary.svelte';
import type { MediaLibraryEntry } from '../../lib/media/library-entry.js';
import type { MediaLibraryData, MediaUsageInfo } from '../../lib/sveltekit/content-routes.js';

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
  return { assets: ASSETS, usage: USAGE, error: null, ...over };
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

    // The unused tile carries the Unused marker; the used tile names its count.
    const unusedTile = options.find((o) => /meadow-fence/.test(o.textContent ?? ''))!;
    expect(unusedTile.textContent ?? '').toMatch(/unused/i);
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

  it('activates an option with Enter, marking it aria-selected (the open intent)', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="option"]')];
    const first = options()[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await expect.poll(() => first.getAttribute('aria-selected')).toBe('true');
    expect(options().filter((o) => o.getAttribute('aria-selected') === 'true').length).toBe(1);
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
    // Live counts: Needs alt = 2 (NEEDS_ALT + BROKEN), Unused = 2 (UNUSED + BROKEN).
    expect(radios.find((r) => /needs alt/i.test(r.textContent ?? ''))!.textContent ?? '').toContain('2');
    expect(radios.find((r) => /unused/i.test(r.textContent ?? ''))!.textContent ?? '').toContain('2');
    expect(radios.find((r) => /all/i.test(r.textContent ?? ''))!.getAttribute('aria-checked')).toBe('true');
  });

  it('filters to Needs alt and to Unused', async () => {
    const screen = render(CairnMediaLibrary, { data: fixture() } as never);
    const radios = () => [...screen.container.querySelectorAll<HTMLElement>('[role="radio"]')];

    await radios().find((r) => /needs alt/i.test(r.textContent ?? ''))!.click();
    await expect.poll(() => screen.container.querySelectorAll('[role="option"]').length).toBe(2);
    let options = [...screen.container.querySelectorAll('[role="option"]')];
    expect(options.every((o) => /valley-ridge|old-pylon/.test(o.textContent ?? ''))).toBe(true);

    await radios().find((r) => /unused/i.test(r.textContent ?? ''))!.click();
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

    const live = screen.container.querySelector('[aria-live="polite"]');
    expect(live?.textContent ?? '').toMatch(new RegExp(`Showing ${before} of 30`));

    await screen.getByRole('button', { name: /load more/i }).click();
    await expect.poll(() => visible()).toBeGreaterThan(before);
    expect(live?.textContent ?? '').toMatch(new RegExp(`Showing ${visible()} of 30`));
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
