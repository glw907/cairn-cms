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
const SESSION_NOTICE = 'Your session ended. Sign in again in a new tab, then save. Your text is still here.';

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
/** The visible notice strip's message; the screen-reader live region repeats it, so it is not the one to read. */
const notice = (screen: Screen) =>
  screen.container.querySelector('.alert-warning > span')?.textContent?.trim() ?? '';
/** The assertive live region's raw text, nonce mark included. */
const assertive = (screen: Screen) =>
  screen.container.querySelector('[aria-live="assertive"]')?.textContent ?? '';
/** Whether the editing surface accepts typing. */
const editorWritable = (screen: Screen) =>
  screen.container.querySelector('.cm-content')?.getAttribute('contenteditable') === 'true';
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

  it('treats a redirect to the sign-in page as an ended session, with a new-tab sign-in link', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    const typed = bodyValue(screen);

    settleEnhance({ type: 'redirect', status: 303, location: '/admin/login' });
    await expect.poll(() => notice(screen)).toBe(SESSION_NOTICE);

    const link = screen.container.querySelector<HTMLAnchorElement>('.alert-warning a')!;
    expect(link.textContent?.trim()).toBe('Sign in');
    expect(link.href).toBe(`${location.origin}/admin/login`);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    expect(assertive(screen).replace(/\u200b/g, '')).toBe(SESSION_NOTICE);
    expect(applyActionCalls).toEqual([]);
    expect(bodyValue(screen)).toBe(typed);
    expect(saveState(screen)).toBe('Unsaved changes');
    expect(saveButton(screen).disabled).toBe(false);
  });

  it('keeps the generic notice and offers no sign-in link for an error result', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);
    expect(screen.container.querySelector('.alert-warning a')).toBeNull();
  });

  it('holds the editor read-only while the request is in flight, and writable again after a failure', async () => {
    const screen = await render(EditPage, props());
    await makeDirty(screen);
    expect(editorWritable(screen)).toBe(true);
    saveButton(screen).click();
    await expect.poll(() => enhanceRuns.length).toBe(1);
    await expect.poll(() => editorWritable(screen)).toBe(false);

    settleEnhance({ type: 'failure', status: 500, data: { error: 'Could not save.' } });
    await expect.poll(() => editorWritable(screen)).toBe(true);
  });

  it('gives the caret back to an author who saved from the keyboard when the save fails', async () => {
    const screen = await render(EditPage, props());
    await makeDirty(screen);
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    content.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }));
    await expect.poll(() => enhanceRuns.length).toBe(1);
    // Precondition: the read-only surface gave up focus while the request ran.
    await expect.poll(() => content.contains(document.activeElement)).toBe(false);

    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => content.contains(document.activeElement)).toBe(true);
  });

  it('clears the working state and the leave-guard bypass when the page is restored from the back-forward cache', async () => {
    // Calling the registered beforeunload handler directly, as EditPage.test.ts does: dispatching a
    // real one on window makes the vitest browser orchestrator treat the test page as unloading.
    const handlers: EventListener[] = [];
    const originalAdd = window.addEventListener;
    const callOriginal = originalAdd.bind(window) as (type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => void;
    window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'beforeunload' && typeof fn === 'function') handlers.push(fn);
      callOriginal(type, fn, opts);
    }) as typeof window.addEventListener;
    let screen: Screen;
    try {
      screen = await render(EditPage, props({ pending: true }));
      await expect.poll(() => handlers.length).toBe(1);
    } finally {
      window.addEventListener = originalAdd;
    }
    const leaveBlocked = () => {
      const event = new Event('beforeunload', { cancelable: true });
      handlers[0](event);
      return event.defaultPrevented;
    };

    await submitSave(screen);
    expect(saveButton(screen).disabled).toBe(true);
    // The discard form's submit handler is what sets the leave-guard bypass. A synthetic submit
    // event runs that handler without sending the form.
    const discardForm = screen.container.querySelector<HTMLFormElement>('form[action="?/discard"]')!;
    discardForm.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    // A pageshow that is not a cache restore changes nothing.
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    await new Promise((r) => setTimeout(r, 50));
    expect(saveButton(screen).disabled).toBe(true);
    expect(publishButton(screen).disabled).toBe(true);

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    await expect.poll(() => saveButton(screen).disabled).toBe(false);
    expect(saveButton(screen).textContent).not.toContain('Saving');
    expect(publishButton(screen).disabled).toBe(false);
    expect(leaveBlocked()).toBe(true);
  });

  it.each([
    ['publishedFlash', { saved: false, publishedFlash: true }],
    ['discardedFlash', { saved: false, discardedFlash: true }],
    ['renamed', { saved: false, renamed: true }],
  ])('drops the %s strip from the original load after a failure in place', async (_flag, over) => {
    const screen = await render(EditPage, props(over));
    // Precondition: the strip the page loaded with is up.
    expect(screen.container.querySelector('.cairn-feedback')).not.toBeNull();
    await submitSave(screen);
    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);
    expect(screen.container.querySelector('.cairn-feedback')).toBeNull();
  });

  it('stands an earlier refusal down while the newer notice shows, and announces the notice', async () => {
    const screen = await render(EditPage, { ...props(), form: { error: 'An earlier refusal.' } });
    // Precondition: the earlier attempt's message is on screen and in the assertive region.
    expect(screen.container.querySelector('.alert-error')?.textContent).toContain('An earlier refusal.');
    await submitSave(screen);
    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);

    expect(screen.container.querySelector('.alert-error')).toBeNull();
    expect(assertive(screen).replace(/\u200b/g, '')).toBe(NOTICE);
  });

  it('stands an earlier broken-link list down while the newer notice shows', async () => {
    const form = { error: 'Broken links.', brokenLinks: ['/admin/posts/gone'] };
    const screen = await render(EditPage, { ...props(), form });
    expect(screen.container.querySelector('.alert-error')?.textContent).toContain('/admin/posts/gone');
    await submitSave(screen);
    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);

    expect(screen.container.querySelector('.alert-error')).toBeNull();
    expect(assertive(screen).replace(/\u200b/g, '')).toBe(NOTICE);
  });

  it('re-announces an identical failure by changing the assertive text', async () => {
    const screen = await render(EditPage, props());
    await submitSave(screen);
    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);
    const first = assertive(screen);

    saveButton(screen).click();
    await expect.poll(() => enhanceRuns.length).toBe(2);
    settleEnhance({ type: 'error', status: 0, error: new Error('Failed to fetch') });
    await expect.poll(() => notice(screen)).toBe(NOTICE);
    await expect.poll(() => saveButton(screen).disabled).toBe(false);

    expect(assertive(screen).replace(/\u200b/g, '')).toBe(NOTICE);
    expect(assertive(screen)).not.toBe(first);
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
