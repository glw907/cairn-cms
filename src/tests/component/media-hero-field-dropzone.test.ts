import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import type { ComponentProps } from 'svelte';
import MediaHeroField from '../../lib/components/MediaHeroField.svelte';
import type { MediaLibraryEntry } from '../../lib/media/library-entry.js';

const LIBRARY: Record<string, MediaLibraryEntry> = {};

const FIELD = { name: 'image', label: 'Hero image' };

async function mount(props: Partial<ComponentProps<typeof MediaHeroField>> = {}) {
  return await render(MediaHeroField, {
    field: FIELD,
    mediaLibrary: LIBRARY,
    conceptId: 'posts',
    id: 'hello',
    onuploaded: () => {},
    ondirty: () => {},
    ...props,
  });
}

// The variant-free equivalents of the dropzone button's own hover:border/hover:bg classes; the
// drag-over state toggles these exact tokens, never a new CSS rule.
const DRAG_OVER_BORDER = 'border-[color-mix(in_oklab,var(--color-primary)_45%,transparent)]';
const DRAG_OVER_BG = 'bg-[color-mix(in_oklab,var(--color-primary)_4%,transparent)]';

function classTokens(el: HTMLElement): string[] {
  return el.className.split(/\s+/).filter(Boolean);
}

describe('MediaHeroField dropzone drag-over state', () => {
  it('ondragenter sets the drag-over state', async () => {
    const screen = await mount();
    const trigger = screen.getByRole('button', { name: /add hero image/i }).element() as HTMLElement;
    expect(classTokens(trigger)).not.toContain(DRAG_OVER_BORDER);
    trigger.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    await tick();
    expect(classTokens(trigger)).toContain(DRAG_OVER_BORDER);
    expect(classTokens(trigger)).toContain(DRAG_OVER_BG);
    expect(classTokens(trigger)).not.toContain('border-base-300');
    expect(classTokens(trigger)).not.toContain('bg-base-100');
  });

  it('ondragover sets the drag-over state and calls preventDefault', async () => {
    const screen = await mount();
    const trigger = screen.getByRole('button', { name: /add hero image/i }).element() as HTMLElement;
    const event = new DragEvent('dragover', { bubbles: true, cancelable: true });
    trigger.dispatchEvent(event);
    await tick();
    expect(event.defaultPrevented).toBe(true);
    expect(classTokens(trigger)).toContain(DRAG_OVER_BORDER);
    expect(classTokens(trigger)).toContain(DRAG_OVER_BG);
    expect(classTokens(trigger)).not.toContain('border-base-300');
    expect(classTokens(trigger)).not.toContain('bg-base-100');
  });

  it('ondrop clears the drag-over state', async () => {
    const screen = await mount();
    const trigger = screen.getByRole('button', { name: /add hero image/i }).element() as HTMLElement;
    trigger.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    await tick();
    expect(classTokens(trigger)).toContain(DRAG_OVER_BORDER);
    trigger.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    await tick();
    expect(classTokens(trigger)).not.toContain(DRAG_OVER_BORDER);
    expect(classTokens(trigger)).not.toContain(DRAG_OVER_BG);
    expect(classTokens(trigger)).toContain('border-base-300');
    expect(classTokens(trigger)).toContain('bg-base-100');
  });

  it('ondragleave with a relatedTarget inside the button does not clear the state', async () => {
    const screen = await mount();
    const trigger = screen.getByRole('button', { name: /add hero image/i }).element() as HTMLElement;
    trigger.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    await tick();
    expect(classTokens(trigger)).toContain(DRAG_OVER_BORDER);
    // A child span of the button (one of the dropzone's own icon/label spans) is inside the
    // button, so leaving onto it must not flicker the drag-over paint off.
    const child = trigger.querySelector('span') as HTMLElement;
    trigger.dispatchEvent(
      new DragEvent('dragleave', { bubbles: true, cancelable: true, relatedTarget: child }),
    );
    await tick();
    expect(classTokens(trigger)).toContain(DRAG_OVER_BORDER);
    expect(classTokens(trigger)).toContain(DRAG_OVER_BG);
  });

  it('ondragleave with a relatedTarget outside the button clears the state', async () => {
    const screen = await mount();
    const trigger = screen.getByRole('button', { name: /add hero image/i }).element() as HTMLElement;
    trigger.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    await tick();
    expect(classTokens(trigger)).toContain(DRAG_OVER_BORDER);
    trigger.dispatchEvent(
      new DragEvent('dragleave', { bubbles: true, cancelable: true, relatedTarget: document.body }),
    );
    await tick();
    expect(classTokens(trigger)).not.toContain(DRAG_OVER_BORDER);
    expect(classTokens(trigger)).not.toContain(DRAG_OVER_BG);
    expect(classTokens(trigger)).toContain('border-base-300');
    expect(classTokens(trigger)).toContain('bg-base-100');
  });
});
