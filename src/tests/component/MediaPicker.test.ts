import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaPicker from '../../lib/components/MediaPicker.svelte';

// A small projected library keyed by 16-hex hash, the shape EditData.mediaLibrary carries.
function entry(over: Partial<Record<string, unknown>> = {}) {
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
    ...over,
  };
}

const IMAGES_ONLY = {
  '0123456789abcdef': entry(),
  fedcba9876543210: entry({
    hash: 'fedcba9876543210',
    slug: 'red-hat',
    ext: 'webp',
    contentType: 'image/webp',
    displayName: 'Red hat',
    alt: '',
    width: 400,
    height: 400,
  }),
};

const MIXED_TYPES = {
  ...IMAGES_ONLY,
  aaaabbbbccccdddd: entry({
    hash: 'aaaabbbbccccdddd',
    slug: 'report',
    ext: 'pdf',
    contentType: 'application/pdf',
    displayName: 'Annual report',
    alt: '',
    width: null,
    height: null,
  }),
};

describe('MediaPicker combobox a11y', () => {
  it('holds focus in the input while arrow keys move aria-activedescendant over option rows', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    const input = screen.container.querySelector('input[role="combobox"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    const listbox = screen.container.querySelector(`#${listboxId}`);
    expect(listbox?.getAttribute('role')).toBe('listbox');

    input.focus();
    expect(document.activeElement).toBe(input);

    // No active descendant before the first ArrowDown, or the first option is active; either way an
    // ArrowDown lands on a real option and a second ArrowDown advances it.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    const first = input.getAttribute('aria-activedescendant');
    expect(first).toBeTruthy();
    expect(screen.container.querySelector(`#${first}`)?.getAttribute('role')).toBe('option');
    // Focus never left the input during navigation.
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    const second = input.getAttribute('aria-activedescendant');
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect(document.activeElement).toBe(input);

    // ArrowUp moves it back.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await Promise.resolve();
    expect(input.getAttribute('aria-activedescendant')).toBe(first);
    expect(document.activeElement).toBe(input);
  });

  it('moves only the narration region (not the count) as ArrowDown advances, with the per-row announce text', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    const live = [...screen.container.querySelectorAll('[aria-live]')];
    expect(live.length).toBeGreaterThanOrEqual(2);
    // The count region is the role="status" live region; the narration region is the other one.
    const countRegion = live.find((el) => el.getAttribute('role') === 'status')!;
    const narrationRegion = live.find((el) => el.getAttribute('role') !== 'status')!;
    expect(countRegion).toBeTruthy();
    expect(narrationRegion).toBeTruthy();

    const input = screen.container.querySelector('input[role="combobox"]') as HTMLInputElement;
    input.focus();

    // On mount activeIndex is -1, so the narration region is empty while the count region is filled.
    const countBefore = countRegion.textContent ?? '';
    expect((narrationRegion.textContent ?? '').trim()).toBe('');
    expect(countBefore).toMatch(/2 images/i);

    // Move 1: index 0 is "Blue shoes" (alt-set), narrated as "Blue shoes, 1 of 2".
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    const narrationOne = (narrationRegion.textContent ?? '').trim();
    expect(narrationOne).toBe('Blue shoes, 1 of 2');
    expect(narrationOne).not.toContain('needs alt text');
    // Separation: the count region text did not change as the narration moved.
    expect(countRegion.textContent ?? '').toBe(countBefore);

    // Move 2: index 1 is "Red hat" (alt-empty), narrated with the needs-alt suffix and the position.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    const narrationTwo = (narrationRegion.textContent ?? '').trim();
    expect(narrationTwo).toContain(', needs alt text');
    expect(narrationTwo).toContain('2 of 2');
    // A second in-range move changed the narration again; the count still did not.
    expect(narrationTwo).not.toBe(narrationOne);
    expect(countRegion.textContent ?? '').toBe(countBefore);
  });
});

describe('MediaPicker search', () => {
  it('narrows by display name', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    const input = screen.container.querySelector('input[role="combobox"]') as HTMLInputElement;
    await screen.getByRole('combobox').fill('red');
    const options = screen.container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toMatch(/red hat/i);
    void input;
  });

  it('narrows by alt text', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    // "running" appears only in the blue shoes alt, not in any display name.
    await screen.getByRole('combobox').fill('running');
    const options = screen.container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toMatch(/blue shoes/i);
  });
});

describe('MediaPicker empty results', () => {
  it('keeps the listbox (with its id) rendered so aria-controls resolves on a no-match query', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    const input = screen.container.querySelector('input[role="combobox"]') as HTMLInputElement;
    await screen.getByRole('combobox').fill('nothingmatchesthisquery');
    // No option rows, but the listbox container still exists and aria-controls still resolves to it.
    expect(screen.container.querySelectorAll('[role="option"]').length).toBe(0);
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    const listbox = screen.container.querySelector(`#${listboxId}`);
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute('role')).toBe('listbox');
    // The no-match copy is reachable, and aria-expanded drops to false (no popup to navigate).
    expect(listbox?.textContent ?? '').toMatch(/nothing matches/i);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('MediaPicker rows', () => {
  it('carries a thumbnail with the delivery-path src, the name, and a needs-alt flag for an alt-empty asset', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    // The alt-empty fixture is "Red hat".
    const options = [...screen.container.querySelectorAll('[role="option"]')];
    const redHat = options.find((o) => /red hat/i.test(o.textContent ?? ''))!;
    expect(redHat).toBeTruthy();
    const img = redHat.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    // The bare delivery path: /media/<slug>.<hash>.<ext>.
    expect(img.getAttribute('src')).toContain('/media/red-hat.fedcba9876543210.webp');
    // The thumbnail is decorative.
    expect(img.getAttribute('alt')).toBe('');
    // The needs-alt flag is a label, not hue alone.
    expect(redHat.textContent ?? '').toMatch(/needs alt/i);

    // The alt-bearing fixture has no needs-alt flag.
    const blueShoes = options.find((o) => /blue shoes/i.test(o.textContent ?? ''))!;
    expect((blueShoes.textContent ?? '').toLowerCase()).not.toContain('needs alt');
  });
});

describe('MediaPicker selection', () => {
  it('emits the media: reference and the prefilled alt on Enter', async () => {
    const onselect = vi.fn();
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect } as never);
    const input = screen.container.querySelector('input[role="combobox"]') as HTMLInputElement;
    await screen.getByRole('combobox').fill('blue');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    expect(onselect).toHaveBeenCalledTimes(1);
    const sel = onselect.mock.calls[0][0];
    expect(sel.ref).toBe('media:blue-shoes.0123456789abcdef');
    expect(sel.alt).toBe('A pair of blue running shoes');
    expect(sel.entry.hash).toBe('0123456789abcdef');
  });

  it('emits on a row click', async () => {
    const onselect = vi.fn();
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect } as never);
    const options = [...screen.container.querySelectorAll('[role="option"]')];
    const redHat = options.find((o) => /red hat/i.test(o.textContent ?? '')) as HTMLElement;
    redHat.click();
    await Promise.resolve();
    expect(onselect).toHaveBeenCalledTimes(1);
    const sel = onselect.mock.calls[0][0];
    expect(sel.ref).toBe('media:red-hat.fedcba9876543210');
    expect(sel.alt).toBe('');
  });
});

describe('MediaPicker type facet', () => {
  it('stays hidden with one stored content type', async () => {
    const screen = render(MediaPicker, { library: IMAGES_ONLY, onselect: () => {} } as never);
    expect(screen.container.querySelector('[data-testid="cairn-mp-facet"]')).toBeNull();
  });

  it('appears with two distinct top-level content types', async () => {
    const screen = render(MediaPicker, { library: MIXED_TYPES, onselect: () => {} } as never);
    expect(screen.container.querySelector('[data-testid="cairn-mp-facet"]')).not.toBeNull();
  });
});
