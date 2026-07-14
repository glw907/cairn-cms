import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
// EditPage's lifecycle controls (Save, Publish, the status badge, the overflow) render into the
// one header band through the topbar context portal, not in a header of their own. This harness
// mounts EditPage joined to that band the way CairnAdmin/CairnAdminShell do, so a standalone render
// still exercises the desk controls. The band carries data-testid="cairn-band".
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

function postProps(over = {}) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ] satisfies NamedField[],
      frontmatter: { title: 'Hello', date: '2026-05-01', draft: false },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      mediaTargets: {},
      mediaLibrary: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      publishActions: [],
      discardedFlash: false,
      preview: null,
      spellcheckDictionary: 'dictionary-en-us.txt',
      siteDictionary: [],
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      advisories: [],
      orphanTags: [],
      siteName: 'Test Site',
      ...over,
    },
    registry: undefined,
  };
}

function publishButton(screen: { container: HTMLElement }) {
  return screen.container.querySelector<HTMLButtonElement>('button[formaction="?/publish"][form="cairn-edit-form"]')!;
}

// Edits the body through the registered format seam (an empty-selection bold wrap), the same
// approach EditPage.test.ts's makeDirty helper uses, and waits for the save-state indicator to
// acknowledge the change.
async function makeDirty(screen: ReturnType<typeof render>) {
  await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
  const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
  card.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
  await expect
    .poll(() => screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '')
    .toBe('Unsaved changes');
}

describe('EditPage Publish visibility', () => {
  it('guards Publish on a clean published entry: present, aria-disabled, inert on click', async () => {
    const screen = render(EditPage, postProps());
    const publish = publishButton(screen);
    expect(publish).not.toBeNull();
    expect(publish.getAttribute('aria-disabled')).toBe('true');
    expect(publish.disabled).toBe(false);
    let submitted = false;
    const stop = (e: Event) => {
      e.preventDefault();
      submitted = true;
    };
    document.addEventListener('submit', stop, true);
    try {
      // A native DOM click, not the browser locator's: Playwright's actionability check refuses an
      // aria-disabled target as not-enabled (itself the guard's pointer/keyboard signal), so a
      // direct click is what exercises onPublishClick's own preventDefault.
      publish.click();
      expect(submitted).toBe(false);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('renders Publish actionable when edits are pending', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const publish = publishButton(screen);
    expect(publish.getAttribute('aria-disabled')).toBe(null);
  });

  it('renders Publish actionable for a brand-new entry', async () => {
    const screen = render(EditPage, postProps({ isNew: true, pending: false, published: false }));
    const publish = publishButton(screen);
    expect(publish.getAttribute('aria-disabled')).toBe(null);
  });

  it('flips a clean published entry from guarded to actionable after a body edit, and the click submits', async () => {
    const screen = render(EditPage, postProps());
    const publish = publishButton(screen);
    expect(publish.getAttribute('aria-disabled')).toBe('true');
    await makeDirty(screen);
    await expect.poll(() => publish.getAttribute('aria-disabled')).toBe(null);
    let formaction: string | null = 'unset';
    const stop = (e: SubmitEvent) => {
      e.preventDefault();
      formaction = (e.submitter as HTMLButtonElement | null)?.getAttribute('formaction') ?? null;
    };
    document.addEventListener('submit', stop, true);
    try {
      await screen.getByRole('button', { name: 'Publish' }).click();
      await expect.poll(() => formaction).toBe('?/publish');
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('keeps the sr-only default submit first among the band\'s form-owned submit buttons on a clean, guarded page', async () => {
    // The default clean state is exactly the new case: Publish now renders (guarded) even with
    // nothing pending, so the tree-order invariant (Enter saves, never publishes) must hold here
    // too, not only in the pending state the pre-existing coverage exercised.
    const screen = render(EditPage, postProps());
    const owned = Array.from(
      screen.container.querySelectorAll<HTMLButtonElement>(
        'button[type="submit"][form="cairn-edit-form"], #cairn-edit-form button[type="submit"]',
      ),
    );
    expect(owned.length).toBeGreaterThan(2);
    const fallback = owned[0];
    expect(fallback.hasAttribute('formaction')).toBe(false);
    expect(fallback.classList.contains('sr-only')).toBe(true);
  });

  it('reads the status badge as New for a brand-new never-published entry', async () => {
    const screen = render(EditPage, postProps({ isNew: true, pending: false, published: false }));
    const badge = screen.container.querySelector('.badge.badge-sm.font-medium');
    expect(badge?.textContent?.trim()).toBe('New');
    expect(badge?.classList.contains('badge-info')).toBe(true);
  });

  it('reads the status badge as Published when main matches and nothing is pending', async () => {
    const screen = render(EditPage, postProps({ pending: false, published: true }));
    const badge = screen.container.querySelector('.badge.badge-sm.font-medium');
    expect(badge?.textContent?.trim()).toBe('Published');
    expect(badge?.classList.contains('badge-ghost')).toBe(true);
  });

  it('reads the status badge as Edited for a pending branch over a published copy', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: true }));
    const badge = screen.container.querySelector('.badge.badge-sm.font-medium');
    expect(badge?.textContent?.trim()).toBe('Edited');
    expect(badge?.classList.contains('badge-warning')).toBe(true);
  });

  it('no-ops the Ctrl+Shift+S chord on a clean, guarded entry', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    let submitted = false;
    const stop = (e: Event) => {
      e.preventDefault();
      submitted = true;
    };
    document.addEventListener('submit', stop, true);
    try {
      const event = new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true, cancelable: true });
      window.dispatchEvent(event);
      expect(submitted).toBe(false);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('fires the Publish submit on Ctrl+Shift+S once a clean entry becomes dirty', async () => {
    const screen = render(EditPage, postProps());
    await makeDirty(screen);
    let formaction: string | null = 'unset';
    const stop = (e: SubmitEvent) => {
      e.preventDefault();
      formaction = (e.submitter as HTMLButtonElement | null)?.getAttribute('formaction') ?? null;
    };
    document.addEventListener('submit', stop, true);
    try {
      const event = new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true, cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      await expect.poll(() => formaction).toBe('?/publish');
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });
});
