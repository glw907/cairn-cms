import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import TidyReview from '../../lib/components/TidyReview.svelte';
import { diffChanges } from '../../lib/components/tidy-diff.js';
import { resolveTidyConventions } from '../../lib/nav/site-config.js';
import type { TidyApi } from '../../lib/components/editor-tidy.js';

// The tidy review surface is real-browser: the apply seam writes through a live CodeMirror view, so the
// test mounts MarkdownEditor to obtain the real TidyApi and the undo seam, then mounts TidyReview wired
// to that api with a CANNED change set (the tidy action is not called; the diff is computed locally from
// an original/corrected pair, exactly the shape Task 13 hands the surface). The first CodeMirror mount
// pays the dynamic-import cold start, so the api-capture poll uses the generous timeout the other editor
// component tests use.
const COLD_START = { timeout: 20000 };

const hiddenValue = (container: Element) =>
  container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '';

// The fixture document. The original carries a misspelling ("accomodate"), a doubled word ("the the"),
// and a clause that a grammar reword touches; the corrected fixes the two objective errors and rewords
// the clause. The Oxford comma is added too, but no Oxford setting is enabled, so it reads as a judgment
// grammar hunk, never an objective one. Two objective hunks, one judgment hunk.
const ORIGINAL = [
  'We groom early so the lake loop can accomodate the crowd.',
  'I seen the early melt come and go.',
  'Bring a layer for the the drive home.',
].join('\n');
const CORRECTED = [
  'We groom early so the lake loop can accommodate the crowd.',
  'I have seen the early melt come and go.',
  'Bring a layer for the drive home.',
].join('\n');

const CONVENTIONS = resolveTidyConventions(undefined); // Fixes on, no normalization enabled.

// Mount MarkdownEditor, wait for the apply seam, then mount TidyReview wired to it. Returns the api, the
// undo, the editor container, and a close-spy. The two renders share the DOM (the test page body).
async function mountReview(
  original: string,
  corrected: string,
  opts: { onclose?: (applied: boolean) => void } = {},
) {
  let api: TidyApi | null = null;
  let undo: () => void = () => {};
  const editor = render(MarkdownEditor, {
    value: original,
    name: 'body',
    registerTidy: (a: TidyApi) => (api = a),
    registerUndo: (u: () => void) => (undo = u),
  });
  await expect.poll(() => api, COLD_START).not.toBeNull();
  const changes = diffChanges(original, corrected);
  api!.enter(changes);
  let closedWith: boolean | null = null;
  const review = render(TidyReview, {
    changes,
    original,
    conventions: CONVENTIONS,
    model: 'claude-sonnet-4-6',
    title: 'Getting ready for spring',
    api: api!,
    onclose: (applied: boolean) => {
      closedWith = applied;
      opts.onclose?.(applied);
    },
    onshow: () => {},
  });
  return {
    api: api!,
    undo,
    editorContainer: editor.container,
    reviewContainer: review.container,
    getClosed: () => closedWith,
  };
}

const hunkEls = (c: Element) => Array.from(c.querySelectorAll<HTMLElement>('[data-testid="tidy-hunk"]'));
const objectiveHunks = (c: Element) => hunkEls(c).filter((h) => h.dataset.objective === 'true');
const judgmentHunks = (c: Element) => hunkEls(c).filter((h) => h.dataset.objective === 'false');

describe('TidyReview (real browser)', () => {
  it('renders insertions as additions and deletions struck through in the deletion ink', async () => {
    const { reviewContainer } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    // An addition row carries the proposed text; a deletion row carries the original run to remove.
    const add = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-add"]');
    const del = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-del"]');
    expect(add?.textContent).toContain('accommodate');
    expect(del?.textContent).toContain('accomodate');
    // The locked color pair and the non-color cue ride utility classes (the admin CSS build resolves
    // them in the app; the test page loads no build, so the assertion is on the class tokens that carry
    // the intent). The insertion uses --color-positive-ink; the deletion uses --cairn-error-ink and
    // line-through, so the two never share a color and the deletion reads without hue alone.
    expect(add?.className).toContain('--color-positive-ink');
    expect(del?.className).toContain('--cairn-error-ink');
    expect(del?.className).toContain('line-through');
    // The gutter glyphs carry the +/- so the rows read without color.
    expect(reviewContainer.textContent).toContain('+');
  });

  it('leaves the document unchanged until an accept; Cancel writes nothing', async () => {
    const { editorContainer, getClosed, reviewContainer } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    // The buffer still holds the original verbatim while the review is open.
    expect(hiddenValue(editorContainer)).toBe(ORIGINAL);
    // Cancel via the footer Cancel button.
    const cancel = Array.from(reviewContainer.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Cancel',
    )!;
    cancel.click();
    await expect.poll(() => getClosed()).toBe(false);
    // The document is byte-identical: Cancel wrote nothing.
    expect(hiddenValue(editorContainer)).toBe(ORIGINAL);
  });

  it('Accept fixes then Apply writes ONLY the objective hunks in one undoable step', async () => {
    const { editorContainer, reviewContainer, undo, getClosed } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    // Two objective, one judgment.
    expect(objectiveHunks(reviewContainer).length).toBe(2);
    expect(judgmentHunks(reviewContainer).length).toBe(1);

    // Accept fixes sweeps only the objective hunks; the judgment hunk stays undecided.
    const acceptFixes = Array.from(reviewContainer.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Accept fixes',
    )!;
    await userEvent.click(acceptFixes);
    await expect
      .poll(() => judgmentHunks(reviewContainer)[0]?.dataset.disposition)
      .toBe('undecided');

    // Apply writes the kept (objective) changes.
    const apply = Array.from(reviewContainer.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Apply'),
    )!;
    await userEvent.click(apply);
    await expect.poll(() => getClosed()).toBe(true);

    // The two objective fixes landed; the judgment reword did NOT (it was never confirmed). So the
    // misspelling and the doubled word are fixed but "I seen" is untouched.
    const result = hiddenValue(editorContainer);
    expect(result).toContain('accommodate');
    expect(result).not.toContain('the the');
    expect(result).toContain('I seen the early melt'); // the unconfirmed judgment hunk was not swept

    // One undoable step: a single undo reverts the WHOLE applied tidy back to the original.
    undo();
    await expect.poll(() => hiddenValue(editorContainer)).toBe(ORIGINAL);
  });

  it('a per-change reject leaves that change out of the apply (the original stays for it)', async () => {
    const { editorContainer, reviewContainer, getClosed } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    // Reject the first objective hunk (the spelling fix).
    const firstHunk = objectiveHunks(reviewContainer)[0];
    const reject = Array.from(firstHunk.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Reject',
    )!;
    await userEvent.click(reject);
    await expect.poll(() => objectiveHunks(reviewContainer)[0]?.dataset.disposition).toBe('rejected');
    // Apply the rest.
    const apply = Array.from(reviewContainer.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Apply'),
    )!;
    await userEvent.click(apply);
    await expect.poll(() => getClosed()).toBe(true);
    // The rejected spelling fix never wrote: "accomodate" stays misspelled.
    expect(hiddenValue(editorContainer)).toContain('accomodate');
  });

  it('the two live regions behave: the action region narrates each toggle, the tally only on bulk', async () => {
    const { reviewContainer } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    const actionLive = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-action-live"]')!;
    const tallyLive = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-tally-live"]')!;
    // The action region is empty at rest; the tally region too.
    expect(actionLive.textContent).toBe('');
    expect(tallyLive.textContent).toBe('');
    // A per-hunk reject narrates in the action region but does NOT touch the tally region.
    const reject = Array.from(judgmentHunks(reviewContainer)[0].querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Reject',
    )!;
    await userEvent.click(reject);
    await expect.poll(() => actionLive.textContent).toContain('Skipped');
    expect(tallyLive.textContent).toBe(''); // unchanged by a single action
    // A bulk action (Reject all) speaks in the tally region.
    const rejectAll = Array.from(reviewContainer.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Reject all',
    )!;
    await userEvent.click(rejectAll);
    await expect.poll(() => tallyLive.textContent).toContain('skipping');
  });

  it('keyboard step-through moves the cursor and accepts/rejects the focused hunk', async () => {
    const { reviewContainer } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    const dialog = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-review"]')!;
    dialog.focus();
    // j moves the cursor down to the second hunk; r rejects it.
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    await expect.poll(() => hunkEls(reviewContainer)[1]?.dataset.disposition).toBe('rejected');
    // k moves back to the first; a accepts it (it was already kept, stays kept).
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await expect.poll(() => hunkEls(reviewContainer)[0]?.dataset.disposition).toBe('kept');
  });

  it('keyboard step-through narrates the newly-focused hunk on every move (j/k/n/p)', async () => {
    const { reviewContainer } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    const actionLive = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-action-live"]')!;
    const dialog = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-review"]')!;
    dialog.focus();
    // The region is empty at rest; a move must announce the focused hunk with the "Focused" verb.
    expect(actionLive.textContent).toBe('');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    await expect.poll(() => actionLive.textContent).toContain('Focused');
    await expect.poll(() => actionLive.textContent).toContain('Hunk 2 of 3');
    // n is the j synonym and moves on to the third hunk, announcing it.
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    await expect.poll(() => actionLive.textContent).toContain('Hunk 3 of 3');
    // k moves back to the second and announces it.
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    await expect.poll(() => actionLive.textContent).toContain('Hunk 2 of 3');
    // p is the k synonym and moves back to the first, announcing it.
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    await expect.poll(() => actionLive.textContent).toContain('Hunk 1 of 3');
  });

  it('a repeated identical action re-announces (the live region text mutates each time)', async () => {
    const { reviewContainer } = await mountReview(ORIGINAL, CORRECTED);
    await expect.poll(() => hunkEls(reviewContainer).length).toBe(3);
    const actionLive = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-action-live"]')!;
    const tallyLive = reviewContainer.querySelector<HTMLElement>('[data-testid="tidy-tally-live"]')!;
    // Reject the same hunk twice. The second identical action must still change the region text so an
    // aria-live region re-announces (a byte-identical string would be ignored by a screen reader).
    const firstHunk = judgmentHunks(reviewContainer)[0];
    const reject = Array.from(firstHunk.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Reject',
    )!;
    await userEvent.click(reject);
    await expect.poll(() => actionLive.textContent).toContain('Skipped');
    const first = actionLive.textContent;
    await userEvent.click(reject);
    await expect.poll(() => actionLive.textContent).not.toBe(first);
    // The bulk tally region also mutates on a repeated identical bulk action.
    const rejectAll = Array.from(reviewContainer.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Reject all',
    )!;
    await userEvent.click(rejectAll);
    await expect.poll(() => tallyLive.textContent).toContain('skipping');
    const firstTally = tallyLive.textContent;
    await userEvent.click(rejectAll);
    await expect.poll(() => tallyLive.textContent).not.toBe(firstTally);
  });

  it('a normalization names ONLY the config setting in its because-line', async () => {
    // Enable the Oxford comma, then feed a corrected text that adds a serial comma. The because-line
    // must name the setting and its variant, never a count of the author's own usage.
    let api: TidyApi | null = null;
    const original = 'Bring skins, a layer and a thermos.';
    const corrected = 'Bring skins, a layer, and a thermos.';
    const conv = resolveTidyConventions({ oxfordComma: 'always' });
    render(MarkdownEditor, {
      value: original,
      name: 'body',
      registerTidy: (a: TidyApi) => (api = a),
    });
    await expect.poll(() => api, COLD_START).not.toBeNull();
    const changes = diffChanges(original, corrected);
    api!.enter(changes);
    const review = render(TidyReview, {
      changes,
      original,
      conventions: conv,
      model: 'claude-sonnet-4-6',
      title: 'A post',
      api: api!,
      onclose: () => {},
      onshow: () => {},
    });
    const because = review.container.querySelector<HTMLElement>('[data-testid="tidy-because"]');
    expect(because).not.toBeNull();
    expect(because!.textContent).toContain('Oxford-comma setting');
    expect(because!.textContent).toContain('always');
    // No usage count appears: the line never says "you wrote it N times" or any digit-count phrasing.
    expect(because!.textContent).not.toMatch(/\d+ time/);
  });
});
