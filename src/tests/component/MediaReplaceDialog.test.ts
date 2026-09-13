// Task 6: the upload step's "working" role="status" region (MediaReplaceDialog.svelte:421) must
// mount unconditionally so a later upload still announces (WCAG 4.1.3), with only its content gated
// on replaceUpload.kind === 'working'. It announces a distinct event from the always-mounted
// sr-only review-impact region above it (:355), so both coexist rather than one duplicating the
// other.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaReplaceDialog from '../../lib/components/MediaReplaceDialog.svelte';
import * as ingest from '../../lib/components/client-ingest.js';
import type { MediaLibraryEntry } from '../../lib/media/library-entry.js';

vi.mock('../../lib/components/client-ingest.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/components/client-ingest.js')>(
    '../../lib/components/client-ingest.js',
  );
  return { ...actual, ingestFile: vi.fn(), sendUpload: vi.fn() };
});

// A 1x1 transparent PNG, enough bytes for an object-URL preview through the upload step.
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

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

async function mount() {
  const brokenHashes = new Set<string>();
  return render(MediaReplaceDialog, {
    brokenHashes,
    markBroken: (hash: string) => brokenHashes.add(hash),
    thumbSrc: () => '',
    dimensions: () => '',
    formatBytes: (bytes: number) => `${bytes} B`,
    headerLabel: 'type-body font-semibold',
  });
}

beforeEach(() => {
  vi.mocked(ingest.ingestFile).mockReset();
  vi.mocked(ingest.sendUpload).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MediaReplaceDialog: the upload step working status region', () => {
  it('mounts before any upload happens, empty, distinct from the review-impact region', async () => {
    const screen = await mount();
    const component = screen.component as unknown as { open: (asset: MediaLibraryEntry, origin?: HTMLElement | null) => void };
    component.open(entry());
    const dialog = screen.container.querySelector('[data-testid="cairn-replace-dialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);

    const regions = dialog.querySelectorAll('[role="status"]');
    // Two distinct always-mounted announcers: the sr-only review-impact line (empty, no review
    // reached yet) and the upload step's working region (empty, no upload started yet).
    expect(regions.length).toBe(2);
    for (const region of regions) {
      expect(region.textContent).toBe('');
    }
  });

  it('fills only the upload-step region, not a second one, once the upload is working', async () => {
    let resolveIngest: (v: Awaited<ReturnType<typeof ingest.ingestFile>>) => void = () => {};
    vi.mocked(ingest.ingestFile).mockReturnValue(
      new Promise((r) => {
        resolveIngest = r;
      }),
    );
    const screen = await mount();
    const component = screen.component as unknown as { open: (asset: MediaLibraryEntry, origin?: HTMLElement | null) => void };
    component.open(entry());
    const dialog = screen.container.querySelector('[data-testid="cairn-replace-dialog"]') as HTMLDialogElement;
    await expect.poll(() => dialog.open).toBe(true);

    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([PNG_BYTES], 'meadow-v2.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await expect.poll(() => dialog.querySelectorAll('[role="status"]').length).toBe(2);
    await expect.poll(() => dialog.textContent ?? '').toMatch(/preparing the new file/i);

    resolveIngest({
      blob: new Blob([PNG_BYTES], { type: 'image/png' }),
      contentType: 'image/png',
      width: 1,
      height: 1,
    });
    vi.mocked(ingest.sendUpload).mockRejectedValue(new Error('network down'));
    await expect.poll(() => dialog.querySelector('[role="alert"]')).not.toBeNull();
  });
});
