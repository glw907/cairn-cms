import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import MediaHeroField from '../../lib/components/MediaHeroField.svelte';

// A small projected library keyed by 16-hex hash, the shape EditData.mediaLibrary carries (the merged
// committed-plus-uploaded projection the picker and the resting thumbnail both resolve against).
function libEntry(over: Partial<Record<string, unknown>> = {}) {
  return {
    hash: '0123456789abcdef',
    slug: 'first-light',
    ext: 'webp',
    contentType: 'image/webp',
    displayName: 'First light',
    alt: 'Dawn light over the groomed tracks',
    width: 1600,
    height: 900,
    bytes: 54321,
    ...over,
  };
}

const LIBRARY = {
  '0123456789abcdef': libEntry(),
  fedcba9876543210: libEntry({
    hash: 'fedcba9876543210',
    slug: 'valley-ridge',
    displayName: 'Valley ridge',
    alt: '',
  }),
};

const FIELD = { name: 'image', label: 'Hero image' };

function mount(props: Record<string, unknown> = {}) {
  return render(MediaHeroField, {
    field: FIELD,
    mediaLibrary: LIBRARY,
    conceptId: 'posts',
    id: 'hello',
    onuploaded: () => {},
    ondirty: () => {},
    ...props,
  } as never);
}

/** The visible field text, excluding the always-rendered dialog (which holds the chooser markup). */
function restingText(container: HTMLElement): string {
  let text = '';
  for (const node of Array.from(container.children)) {
    if (node.tagName.toLowerCase() === 'dialog') continue;
    text += ` ${node.textContent ?? ''}`;
  }
  return text;
}

/** Read the three hidden inputs the field writes for the decode arm to read on save. */
function hiddenValues(container: HTMLElement) {
  const get = (suffix: string) =>
    (container.querySelector(`input[type="hidden"][name="image.${suffix}"]`) as HTMLInputElement | null)
      ?.value ?? null;
  return { src: get('src'), alt: get('alt'), caption: get('caption') };
}

describe('MediaHeroField resting state', () => {
  it('renders the resting row from a described value: thumbnail, name, Described chip, caption preview', async () => {
    const screen = mount({
      value: {
        src: 'media:first-light.0123456789abcdef',
        alt: 'Dawn light over the groomed tracks',
        caption: 'First light on the tracks.',
      },
    });
    // One row at rest: the resolved thumbnail src is the bare delivery path.
    const img = screen.container.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toContain('/media/first-light.0123456789abcdef.webp');
    // The display name from the library entry.
    expect(screen.container.textContent ?? '').toMatch(/first light/i);
    // The alt-status chip reads Described (a glyph plus a label, never hue alone).
    expect(screen.container.textContent ?? '').toMatch(/described/i);
    // The caption preview shows beneath the row.
    expect(screen.container.textContent ?? '').toMatch(/first light on the tracks/i);
  });

  it('reads Needs alt for an empty alt on a non-decorative hero', async () => {
    const screen = mount({
      value: { src: 'media:valley-ridge.fedcba9876543210', alt: '' },
    });
    // The resting row is the markup outside the dialog (which always renders the chooser).
    const row = restingText(screen.container);
    expect(row).toMatch(/needs alt/i);
    expect(row).not.toMatch(/described/i);
  });

  it('reads Decorative for an explicitly decorative hero', async () => {
    const screen = mount({
      value: { src: 'media:first-light.0123456789abcdef', alt: '', caption: '' },
      decorative: true,
    });
    const row = restingText(screen.container);
    expect(row).toMatch(/decorative/i);
    expect(row).not.toMatch(/needs alt/i);
  });

  it('seeds the hidden inputs from the initial value', async () => {
    const screen = mount({
      value: {
        src: 'media:first-light.0123456789abcdef',
        alt: 'Dawn light over the groomed tracks',
        caption: 'First light on the tracks.',
      },
    });
    const { src, alt, caption } = hiddenValues(screen.container);
    expect(src).toBe('media:first-light.0123456789abcdef');
    expect(alt).toBe('Dawn light over the groomed tracks');
    expect(caption).toBe('First light on the tracks.');
  });
});

describe('MediaHeroField empty state', () => {
  it('shows the dropzone and the unify line, with no hidden src value', async () => {
    const screen = mount();
    await expect.element(screen.getByRole('button', { name: /add a hero image/i })).toBeInTheDocument();
    expect(screen.container.textContent ?? '').toMatch(/shown when the post is shared/i);
    expect(hiddenValues(screen.container).src).toBe('');
  });

  it('opens the chooser dialog showing upload and the picker', async () => {
    const screen = mount();
    await screen.getByRole('button', { name: /add a hero image/i }).click();
    await tick();
    // The chooser leads with an upload control and the library combobox below.
    await expect.element(screen.getByRole('button', { name: /choose a file/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

describe('MediaHeroField pick and confirm', () => {
  it('picks a library asset, describes it, sets a caption, and confirms into the hidden inputs', async () => {
    const ondirty = vi.fn();
    const screen = mount({ ondirty });
    await screen.getByRole('button', { name: /add a hero image/i }).click();
    await tick();
    // Pick the alt-bearing asset; the placement view seeds Describe with the manifest alt.
    await screen.getByRole('option', { name: /first light/i }).click();
    await tick();
    // The describe alt input prefills from the manifest alt.
    const altInput = screen.getByRole('textbox', { name: /alt|description/i });
    await expect.element(altInput).toHaveValue('Dawn light over the groomed tracks');
    await altInput.fill('Dawn over the tracks');
    // Set a caption.
    await screen.getByRole('textbox', { name: /caption/i }).fill('A half hour before the lot fills.');
    // Confirm.
    await screen.getByRole('button', { name: /use this image/i }).click();
    await tick();

    const { src, alt, caption } = hiddenValues(screen.container);
    // The inner media: ref is unchanged from the picked record.
    expect(src).toBe('media:first-light.0123456789abcdef');
    expect(alt).toBe('Dawn over the tracks');
    expect(caption).toBe('A half hour before the lot fills.');
    expect(ondirty).toHaveBeenCalled();
  });

  it('confirms a decorative pick with an empty alt hidden input', async () => {
    const screen = mount();
    await screen.getByRole('button', { name: /add a hero image/i }).click();
    await tick();
    await screen.getByRole('option', { name: /valley ridge/i }).click();
    await tick();
    await screen.getByRole('radio', { name: /decorative/i }).click();
    await screen.getByRole('button', { name: /use this image/i }).click();
    await tick();

    const { src, alt } = hiddenValues(screen.container);
    expect(src).toBe('media:valley-ridge.fedcba9876543210');
    expect(alt).toBe('');
  });
});

describe('MediaHeroField remove', () => {
  it('clears the hidden src and marks dirty', async () => {
    const ondirty = vi.fn();
    const screen = mount({
      value: { src: 'media:first-light.0123456789abcdef', alt: 'Dawn light', caption: 'x' },
      ondirty,
    });
    await screen.getByRole('button', { name: /^edit$/i }).click();
    await tick();
    await screen.getByRole('button', { name: /remove/i }).click();
    await tick();
    expect(hiddenValues(screen.container).src).toBe('');
    expect(ondirty).toHaveBeenCalled();
    // The empty dropzone returns.
    await expect.element(screen.getByRole('button', { name: /add a hero image/i })).toBeInTheDocument();
  });
});

describe('MediaHeroField is the persistent field', () => {
  it('renders without an editor instance (not a contextual toolbar)', async () => {
    // No editor prop, no caret seam: the field stands on its own as a details-panel field.
    const screen = mount();
    expect(screen.container.querySelector('input[type="hidden"][name="image.src"]')).not.toBeNull();
  });
});

describe('MediaHeroField needs-alt signal', () => {
  it('reports needsAlt true for a hero with an empty alt', async () => {
    const onneedsaltchange = vi.fn();
    mount({
      value: { src: 'media:valley-ridge.fedcba9876543210', alt: '' },
      onneedsaltchange,
    });
    await tick();
    expect(onneedsaltchange).toHaveBeenCalledWith(true);
  });

  it('reports needsAlt false for a described hero', async () => {
    const onneedsaltchange = vi.fn();
    mount({
      value: { src: 'media:first-light.0123456789abcdef', alt: 'Dawn light over the tracks' },
      onneedsaltchange,
    });
    await tick();
    expect(onneedsaltchange).toHaveBeenCalledWith(false);
    expect(onneedsaltchange).not.toHaveBeenCalledWith(true);
  });

  it('reports needsAlt false for a decorative hero', async () => {
    const onneedsaltchange = vi.fn();
    mount({
      value: { src: 'media:first-light.0123456789abcdef', alt: '' },
      decorative: true,
      onneedsaltchange,
    });
    await tick();
    expect(onneedsaltchange).toHaveBeenCalledWith(false);
    expect(onneedsaltchange).not.toHaveBeenCalledWith(true);
  });

  it('reports needsAlt false for an empty field (no hero)', async () => {
    const onneedsaltchange = vi.fn();
    mount({ onneedsaltchange });
    await tick();
    expect(onneedsaltchange).toHaveBeenCalledWith(false);
  });

  it('re-reports needsAlt false after an empty-alt hero gains a description', async () => {
    const onneedsaltchange = vi.fn();
    const screen = mount({
      value: { src: 'media:valley-ridge.fedcba9876543210', alt: '' },
      onneedsaltchange,
    });
    await tick();
    expect(onneedsaltchange).toHaveBeenLastCalledWith(true);
    // Open Add, describe it, confirm: the committed status flips to described.
    await screen.getByRole('button', { name: /^add$/i }).click();
    await tick();
    await screen.getByRole('radio', { name: /describe/i }).click();
    await tick();
    await screen.getByRole('textbox', { name: /alt|description/i }).fill('Valley ridge at dusk');
    await screen.getByRole('button', { name: /use this image/i }).click();
    await tick();
    expect(onneedsaltchange).toHaveBeenLastCalledWith(false);
  });
});

describe('MediaHeroField focusAlt remediation', () => {
  it('opens the dialog and moves focus into the alt text input', async () => {
    const screen = mount({
      value: { src: 'media:valley-ridge.fedcba9876543210', alt: '' },
    });
    await tick();
    // The exported focusAlt() opens the dialog and lands the author on the alt input.
    (screen.component as { focusAlt: () => void }).focusAlt();
    await tick();
    await tick();
    const altInput = screen.container.querySelector(
      'input[aria-label="Alt text description"]',
    ) as HTMLInputElement | null;
    expect(altInput).not.toBeNull();
    expect(document.activeElement).toBe(altInput);
  });
});
