import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaPicker from '../../lib/components/MediaPicker.svelte';
import CairnMediaLibrary from '../../lib/components/CairnMediaLibrary.svelte';
import MediaHeroField from '../../lib/components/MediaHeroField.svelte';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { MEDIA_BASE_CONTEXT_KEY } from '../../lib/components/media-base-context.js';
import type { MediaLibraryEntry } from '../../lib/media/library-entry.js';
import type { MediaLibraryData } from '../../lib/sveltekit/content-routes.js';

// The base a mounting context injects. It is the reproductions module's own fixture base, the first
// caller of this seam, so the assertions below read like the real injection rather than a stub.
const INJECTED = '/repro-assets';

const HASH = '0123456789abcdef';

function entry(over: Partial<MediaLibraryEntry> = {}): MediaLibraryEntry {
  return {
    hash: HASH,
    slug: 'first-light',
    ext: 'webp',
    contentType: 'image/webp',
    displayName: 'First light',
    alt: 'Dawn light over the groomed tracks',
    width: 1600,
    height: 900,
    bytes: 54321,
    createdAt: '2026-03-04T00:00:00.000Z',
    ...over,
  };
}

const LIBRARY: Record<string, MediaLibraryEntry> = { [HASH]: entry() };

/** The mount options for a component under an injected media base. */
function withBase(props: Record<string, unknown>) {
  return { props, context: new Map<unknown, unknown>([[MEDIA_BASE_CONTEXT_KEY, INJECTED]]) };
}

/** Every thumbnail path the mounted surface rendered, as pathnames (the src attribute is absolute). */
function thumbPaths(container: HTMLElement, selector = 'img'): string[] {
  return [...container.querySelectorAll<HTMLImageElement>(selector)]
    .map((img) => img.getAttribute('src') ?? '')
    .filter((src) => src.includes(HASH));
}

const HERO_PROPS = {
  field: { name: 'image', label: 'Hero image' },
  mediaLibrary: LIBRARY,
  conceptId: 'posts',
  id: 'hello',
  value: { src: `media:first-light.${HASH}`, alt: 'Dawn light over the groomed tracks', caption: '' },
  onuploaded: () => {},
  ondirty: () => {},
};

const LIBRARY_DATA: MediaLibraryData = { assets: [entry()], usage: {}, error: null, flash: null };

const EDITOR_DOC = `Here is ![A trail map](media:first-light.${HASH}) the map.`;

describe('the media public base is injectable through context', () => {
  it('renders MediaPicker option thumbnails under the injected base', async () => {
    const screen = render(
      MediaPicker,
      withBase({ library: LIBRARY, onselect: () => {} }) as never,
    );
    const paths = thumbPaths(screen.container);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toBe(`${INJECTED}/first-light.${HASH}.webp`);
  });

  it('renders CairnMediaLibrary tile thumbnails under the injected base', async () => {
    const screen = render(CairnMediaLibrary, withBase({ data: LIBRARY_DATA }) as never);
    const paths = thumbPaths(screen.container);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toBe(`${INJECTED}/first-light.${HASH}.webp`);
  });

  it('renders the MediaHeroField resting thumbnail under the injected base', async () => {
    const screen = render(MediaHeroField, withBase(HERO_PROPS) as never);
    const paths = thumbPaths(screen.container);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toBe(`${INJECTED}/first-light.${HASH}.webp`);
  });

  it('renders the editor media chip thumbnail under the injected base', async () => {
    const screen = render(
      MarkdownEditor,
      withBase({ value: EDITOR_DOC, name: 'body', mediaLibrary: LIBRARY }) as never,
    );
    await expect
      .poll(() => screen.container.querySelectorAll('.cm-cairn-media-thumb').length)
      .toBe(1);
    const chip = screen.container.querySelector<HTMLImageElement>('.cm-cairn-media-thumb')!;
    expect(chip.getAttribute('src')).toBe(`${INJECTED}/first-light.${HASH}.webp`);
  });
});

describe('the media public base defaults to /media with no provider (the real admin mount)', () => {
  it('keeps MediaPicker option thumbnails under /media', async () => {
    const screen = render(MediaPicker, { library: LIBRARY, onselect: () => {} } as never);
    expect(thumbPaths(screen.container)[0]).toBe(`/media/first-light.${HASH}.webp`);
  });

  it('keeps CairnMediaLibrary tile thumbnails under /media', async () => {
    const screen = render(CairnMediaLibrary, { data: LIBRARY_DATA } as never);
    expect(thumbPaths(screen.container)[0]).toBe(`/media/first-light.${HASH}.webp`);
  });

  it('keeps the MediaHeroField resting thumbnail under /media', async () => {
    const screen = render(MediaHeroField, HERO_PROPS as never);
    expect(thumbPaths(screen.container)[0]).toBe(`/media/first-light.${HASH}.webp`);
  });

  it('keeps the editor media chip thumbnail under /media', async () => {
    const screen = render(MarkdownEditor, {
      value: EDITOR_DOC,
      name: 'body',
      mediaLibrary: LIBRARY,
    } as never);
    await expect
      .poll(() => screen.container.querySelectorAll('.cm-cairn-media-thumb').length)
      .toBe(1);
    const chip = screen.container.querySelector<HTMLImageElement>('.cm-cairn-media-thumb')!;
    expect(chip.getAttribute('src')).toBe(`/media/first-light.${HASH}.webp`);
  });
});
