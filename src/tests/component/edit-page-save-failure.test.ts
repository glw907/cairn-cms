import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import { applyActionCalls, enhanceRuns, resetEnhance, settleEnhance } from './_app-forms.js';

// The edit form submits through the enhanced path, so a failed save answers in place instead of
// replacing the page. These tests drive the component with the answers a server or a failed fetch
// would give, through the $app/forms stand-in. The real document reload a successful save ends in,
// and the dictionary commit that must land before the request, are covered by the showcase e2e
// (edit-save-failure.spec.ts), where a real browser and a real kit run them.

const NOTICE = 'That did not go through. Your text is still here; try again.';

function props(over = {}) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      singular: 'Post',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] satisfies NamedField[],
      frontmatter: { title: 'Hello' },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: true,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [],
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
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      advisories: [],
      orphanTags: [],
      siteName: 'Test Site',
      ...over,
    },
    registry: undefined,
  };
}

type Screen = Awaited<ReturnType<typeof render>>;

const saveSelector =
  '[data-testid="cairn-band"] button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)';
const saveButton = (screen: Screen) => screen.container.querySelector<HTMLButtonElement>(saveSelector)!;
const publishButton = (screen: Screen) =>
  screen.container.querySelector<HTMLButtonElement>('button[formaction^="?/publish"]')!;
const saveState = (screen: Screen) =>
  screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '';
/** The visible notice strip's text; the screen-reader live region repeats it, so it is not the one to read. */
const notice = (screen: Screen) => screen.container.querySelector('.alert-warning')?.textContent?.trim() ?? '';
const bodyValue = (screen: Screen) =>
  screen.container.querySelector<HTMLInputElement>('input[name="body"]')!.value;

/** Dirty the body with a toolbar chord, and wait for the indicator to notice. */
async function makeDirty(screen: Screen) {
  await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
  const card = screen.container.querySelector('[role="toolbar"]')!.closest('.card-shell')!;
  card.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
  await expect.poll(() => saveState(screen)).toBe('Unsaved changes');
}

/** Dirty the page, press Save, and wait until the stand-in kit has "sent" the request. */
async function submitSave(screen: Screen) {
  await makeDirty(screen);
  saveButton(screen).click();
  await expect.poll(() => enhanceRuns.length).toBe(1);
}

describe('EditPage failed submit', () => {
  beforeEach(() => resetEnhance());

  it('keeps the writing and the Saved flash off after a server failure, and applies the failure in place', async () => {
    const screen = await render(EditPage, props());
    // Precondition: the page opened from ?saved=1 with the flash up.
    expect(screen.container.querySelector('.cairn-feedback')).not.toBeNull();
    await submitSave(screen);
    const typed = bodyValue(screen);
    expect(saveButton(screen).textContent).toContain('Saving');

    const failure = { type: 'failure', status: 500, data: { error: 'Could not save.' } };
    settleEnhance(failure);
    await expect.poll(() => applyActionCalls.length).toBe(1);

    expect(applyActionCalls[0]).toBe(failure);
    expect(screen.container.querySelector('.cairn-feedback')).toBeNull();
    expect(saveState(screen)).toBe('Unsaved changes');
    expect(bodyValue(screen)).toBe(typed);
    expect(saveButton(screen).textContent).not.toContain('Saving');
    expect(saveButton(screen).disabled).toBe(false);
    expect(publishButton(screen).disabled).toBe(false);
  });

  it('shows its own message for a failure that carries no text of its own', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    settleEnhance({ type: 'failure', status: 500, data: {} });
    await expect.poll(() => notice(screen)).toBe(NOTICE);
  });

  it('reads an echoed body as unsaved, not as the new baseline', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    const typed = bodyValue(screen);
    settleEnhance({ type: 'failure', status: 409, data: { error: 'Edited elsewhere.', body: typed } });
    await expect.poll(() => applyActionCalls.length).toBe(1);

    // The kit puts the failure's data on the page as `form`; the editor's text is the echoed body.
    await screen.rerender({ form: { error: 'Edited elsewhere.', body: typed } });
    expect(bodyValue(screen)).toBe(typed);
    expect(saveState(screen)).toBe('Unsaved changes');
    expect(screen.container.querySelector('.cairn-feedback')).toBeNull();
  });

  it('keeps the writing after an error result and never hands it to applyAction', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    const typed = bodyValue(screen);

    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);

    expect(applyActionCalls).toEqual([]);
    expect(bodyValue(screen)).toBe(typed);
    expect(saveState(screen)).toBe('Unsaved changes');
    expect(screen.container.querySelector('.cairn-feedback')).toBeNull();
    expect(saveButton(screen).disabled).toBe(false);
  });

  it('treats a redirect to somewhere other than this concept (the login page) as a failure', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    const typed = bodyValue(screen);

    settleEnhance({ type: 'redirect', status: 303, location: `${location.origin}/admin/login` });
    await expect.poll(() => notice(screen)).toBe(NOTICE);

    expect(applyActionCalls).toEqual([]);
    expect(bodyValue(screen)).toBe(typed);
    expect(saveState(screen)).toBe('Unsaved changes');
  });

  it('re-enables Publish and keeps the text after a failed publish', async () => {
    const screen = await render(EditPage, props({ pending: true }));
    await makeDirty(screen);
    const typed = bodyValue(screen);
    publishButton(screen).click();
    await expect.poll(() => enhanceRuns.length).toBe(1);
    expect(enhanceRuns[0].action).toBe('?/publish');
    expect(publishButton(screen).textContent).toContain('Publishing');

    settleEnhance({ type: 'failure', status: 500, data: { error: 'Could not publish.' } });
    await expect.poll(() => applyActionCalls.length).toBe(1);

    expect(publishButton(screen).textContent).not.toContain('Publishing');
    expect(publishButton(screen).disabled).toBe(false);
    expect(bodyValue(screen)).toBe(typed);
  });

  it('flags the Publish working state for a new entry whose action carries &new=1', async () => {
    const screen = await render(EditPage, props({ isNew: true, saved: false }));
    publishButton(screen).click();
    await expect.poll(() => enhanceRuns.length).toBe(1);
    expect(enhanceRuns[0].action).toBe('?/publish&new=1');
    expect(publishButton(screen).textContent).toContain('Publishing');
    expect(saveButton(screen).textContent).not.toContain('Saving');
  });
});
