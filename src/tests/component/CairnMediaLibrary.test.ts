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
    // The alt editor is a real radiogroup labeled as the asset default for new placements.
    const altGroup = form.querySelector('[role="radiogroup"]')!;
    expect(altGroup.getAttribute('aria-label')).toMatch(/alt/i);
    expect(form.textContent ?? '').toMatch(/default for the next time/i);
  });

  it('surfaces a ?/mediaUpdate failure error in the slide-over', async () => {
    const failed = { error: 'Enter a valid slug: lowercase letters, numbers, and hyphens.' };
    const screen = render(CairnMediaLibrary, { data: fixture(), form: failed } as never);
    const panel = await openSlideOver(screen, /first-light/);
    expect(panel.querySelector('[role="alert"]')?.textContent ?? '').toContain('Enter a valid slug');
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
    expect(screen.container.querySelector('[role="region"]')).toBeNull();
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
