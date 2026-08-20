// cairn-cms: the mounting context's spellcheck lever on EditPage.
//
// The editing surface checks spelling by default, which is right for a real author and wrong for a
// mounting context that renders many editors on one page (the reproductions seam): the lint plugin
// schedules its first run from its own constructor, that run reaches ensureWorker
// (spellcheck.ts:730), and the Worker fetches a wasm binary and a 1.5MB dictionary. This file pins
// both directions of the lever by counting Worker constructions, so the default stays proven live
// rather than assumed and the override is proven to cost nothing.
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as browserPage } from 'vitest/browser';
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

const schema: NamedField[] = [{ name: 'title', label: 'Title', type: 'text' }];

// Prose with an ordinary misspelling, so the lint source has real words to check and the run that
// reaches the Worker is the run a real author would trigger.
const BODY = 'The trailhead sits above the river and the aproach is steep.';

function props(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      singular: 'Post',
      fields: schema,
      frontmatter: { title: 'Hello' },
      body: BODY,
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      fragmentTargets: null,
      routable: true,
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
      tidy: {
        enabled: false,
        model: 'claude-sonnet-4-6',
        conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false },
      },
      advisories: [],
      orphanTags: [],
      siteName: 'Test Site',
    },
    ...overrides,
  };
}

// Swap the global Worker constructor for one that records its calls and speaks to nobody. The real
// constructor would start a module worker and two asset fetches, which is the cost under test.
const realWorker = globalThis.Worker;
let constructed = 0;

class CountingWorker {
  constructor() {
    constructed += 1;
  }
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
  terminate() {}
}

function countWorkers() {
  constructed = 0;
  globalThis.Worker = CountingWorker as unknown as typeof Worker;
  return () => constructed;
}

afterEach(() => {
  globalThis.Worker = realWorker;
});

/**
 * Every control that offers the spellcheck flip, by its label. Two render it: the card footer's
 * toggle and the below-sm pick in the toolbar's More popover, which mounts its extra items only
 * while the menu is open, so this opens the menu first.
 * @param container - the rendered EditPage harness's root
 * @returns one label per rendered control, footer first
 */
async function spellcheckControls(container: HTMLElement): Promise<string[]> {
  await browserPage.getByRole('button', { name: /more formatting/i }).click();
  return [...container.querySelectorAll('button')]
    .map((button) => button.textContent?.trim() ?? '')
    .filter((label) => /^spellcheck$/i.test(label));
}

describe('EditPage spellcheck override', () => {
  it('spawns the spellcheck Worker with no override, the cost the lever exists to remove', async () => {
    const workers = countWorkers();
    const page = render(EditPage, props());
    await expect.element(page.getByLabelText('Markdown source')).toBeInTheDocument();
    // The lint plugin schedules its first run on a delay, so the Worker arrives shortly after mount.
    await expect.poll(workers, { timeout: 5000 }).toBeGreaterThan(0);
  });

  it('spawns no Worker when the mounting context starts with spellcheck off', async () => {
    const workers = countWorkers();
    const page = render(EditPage, props({ spellcheckOverride: false }));
    await expect.element(page.getByLabelText('Markdown source')).toBeInTheDocument();
    // Long enough for the same scheduled run that fires above, so this is a real absence.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(workers()).toBe(0);
  });

  it('leaves the footer toggle owning the posture when no override is supplied', async () => {
    countWorkers();
    const page = render(EditPage, props());
    const toggle = page.getByRole('button', { name: /spellcheck/i });
    await expect.element(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();

    await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('cairn-editor-spellcheck')).toBe('false');
  });

  it('offers no spellcheck control at all, since the mounting context owns the posture (WCAG 4.1.2)', async () => {
    localStorage.setItem('cairn-editor-spellcheck', 'true');
    countWorkers();
    const page = render(EditPage, props({ spellcheckOverride: false }));
    await expect.element(page.getByLabelText('Markdown source')).toBeInTheDocument();
    // Both faces of the control go: the card footer's toggle and the below-sm overflow pick, which
    // is the only one a phone editor can reach. Left in place, each would announce an aria-pressed
    // state it cannot change and would overwrite the author's stored preference on the way.
    expect(await spellcheckControls(page.container)).toEqual([]);
    // The author's own preference survives untouched, which is the other half of the defect: a
    // dead toggle that still writes localStorage would lose it.
    expect(localStorage.getItem('cairn-editor-spellcheck')).toBe('true');
  });

  it('offers both spellcheck controls with no override, so the case above hides something real', async () => {
    countWorkers();
    const page = render(EditPage, props());
    await expect.element(page.getByLabelText('Markdown source')).toBeInTheDocument();
    expect(await spellcheckControls(page.container)).toEqual(['Spellcheck', 'Spellcheck']);
  });
});
