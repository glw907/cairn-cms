import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// The import a consuming site writes, through the package subpath rather than a source path. It
// resolves the built dist through the repo's own self-link, so this spec proves the export path a
// consumer travels, not just that the component exists in-tree.
import {
  MediaPicker,
  type MediaLibraryEntry,
  type MediaSelection,
} from '@glw907/cairn-cms/admin-toolkit';

// The manifest-entry array `mediaLibraryLoad` hands back on `MediaLibraryData.assets`, which is the
// shape the prop now takes directly.
const ASSETS: MediaLibraryEntry[] = [
  {
    hash: '0123456789abcdef',
    slug: 'blue-shoes',
    ext: 'webp',
    contentType: 'image/webp',
    displayName: 'Blue shoes',
    alt: 'A pair of blue running shoes',
    width: 800,
    height: 600,
    bytes: 12345,
    createdAt: '2026-05-01T00:00:00.000Z',
  },
  {
    hash: 'fedcba9876543210',
    slug: 'red-hat',
    ext: 'webp',
    contentType: 'image/webp',
    displayName: 'Red hat',
    alt: '',
    width: 400,
    height: 400,
    bytes: 4242,
    createdAt: '2026-05-02T00:00:00.000Z',
  },
];

describe('MediaPicker through @glw907/cairn-cms/admin-toolkit', () => {
  it('renders one option per manifest entry from the array prop', async () => {
    const screen = await render(MediaPicker, { entries: ASSETS, onselect: () => {} });
    const options = screen.container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(2);
    expect(screen.container.textContent).toContain('Blue shoes');
    expect(screen.container.textContent).toContain('Red hat');
  });

  it('emits the selected entry, its media: reference, and the manifest alt', async () => {
    const onselect = vi.fn();
    const screen = await render(MediaPicker, { entries: ASSETS, onselect });
    const first = screen.container.querySelector('[role="option"]') as HTMLElement;
    first.click();
    expect(onselect).toHaveBeenCalledTimes(1);
    const selection = onselect.mock.calls[0][0] as MediaSelection;
    expect(selection.entry.hash).toBe('0123456789abcdef');
    expect(selection.ref).toBe('media:blue-shoes.0123456789abcdef');
    expect(selection.alt).toBe('A pair of blue running shoes');
  });
});
