import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { makeFakeWorker, COLD_START, WARNING_INK, pinWarningInk } from './fake-spell-worker.js';

describe('suggestion popover', () => {
  // The flat-props form MarkdownEditor's tests use (not `{ props: {...} }`): two NON-adjacent occurrences
  // of the misspelling, so an add/ignore that clears every underline is distinguishable from one that
  // clears only the caret's. The occurrences must not be adjacent: `teh teh` is a doubled word, which the
  // objective-error linter flags with a third underline that add/ignore cannot clear (the doubling is
  // independent of spelling), so it would mask the clear-to-zero assertion.
  const props = (fake: ReturnType<typeof makeFakeWorker>) => ({
    value: 'teh cat teh dog',
    name: 'body',
    spellcheck: true,
    spellcheckTest: { createWorker: fake.create, assumeReady: true },
  });

  // Open the popover by clicking the underline (which moves the caret into the diagnostic range, the
  // trigger the showTooltip StateField reads). Poll to WAIT for the async lint, then re-query to GET the
  // element (an `expect.poll().toBeTruthy()` resolves to void, so it cannot itself return the node).
  const openPopover = async (container: Element): Promise<HTMLElement> => {
    await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    await userEvent.click(container.querySelector('.cm-lintRange-info')!);
    await expect.poll(() => container.querySelector('.cairn-cm-suggest'), COLD_START).toBeTruthy();
    return container.querySelector('.cairn-cm-suggest') as HTMLElement;
  };

  it('renders no built-in lint tooltip on hover (it is suppressed by tooltipFilter)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'ten'] });
    const { container } = render(MarkdownEditor, {
      value: 'teh cat', name: 'body', spellcheck: true,
      spellcheckTest: { createWorker: fake.create, assumeReady: true },
    });
    await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    // Hover is the stock lint tooltip's trigger (see spellcheck.test.ts). Give it the hover delay, then
    // assert the stock action buttons never appear.
    await userEvent.hover(container.querySelector('.cm-lintRange-info')!);
    await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelector('.cm-diagnosticAction')).toBeNull();
    expect(container.querySelector('.cm-tooltip-lint')).toBeNull();
  });

  it('renders a recipe popover (role=group, message, action buttons) and applies a suggestion', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'ten'] });
    const { container } = render(MarkdownEditor, props(fake));
    const popover = await openPopover(container);
    expect(popover.getAttribute('role')).toBe('group');
    expect(popover.getAttribute('aria-label')).toContain('teh');
    expect([...popover.querySelectorAll('button')].map((b) => b.textContent)).toEqual(
      expect.arrayContaining(['the', 'ten', 'Add to dictionary', 'Ignore']),
    );
    await userEvent.click(popover.querySelector('button')!); // the first suggestion, "the"
    await expect
      .poll(() => container.querySelector<HTMLInputElement>('input[name="body"]')?.value, COLD_START)
      .toBe('the cat teh dog');
  });

  it('adds a word to the dictionary and clears every underline (survives relint)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    const popover = await openPopover(container);
    const add = [...popover.querySelectorAll('button')].find((b) => b.textContent === 'Add to dictionary')!;
    await userEvent.click(add);
    await expect.poll(() => fake.added.has('teh'), COLD_START).toBe(true);
    await expect.poll(() => container.querySelectorAll('.cm-lintRange-info').length, COLD_START).toBe(0);
  });

  it('ignores a word for the session and clears its underline', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    const popover = await openPopover(container);
    const ignore = [...popover.querySelectorAll('button')].find((b) => b.textContent === 'Ignore')!;
    await userEvent.click(ignore);
    await expect.poll(() => container.querySelectorAll('.cm-lintRange-info').length, COLD_START).toBe(0);
  });

  it('moves focus into the popover on Alt-Enter and restores it on Escape', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container);
    await userEvent.keyboard('{Alt>}{Enter}{/Alt}');
    await expect.poll(() => document.activeElement?.closest('.cairn-cm-suggest'), COLD_START).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement?.closest('.cm-content'), COLD_START).toBeTruthy();
  });

  it('announces availability through a polite live region when the caret enters a misspelling', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container);
    // Poll for the announcement text (the region mounts empty and fills when the caret enters the range),
    // then re-query for the element itself (a poll assertion resolves to void, not the node).
    await expect
      .poll(() => container.querySelector('[aria-live="polite"].cairn-cm-suggest-live')?.textContent, COLD_START)
      .toBeTruthy();
    const live = container.querySelector<HTMLElement>('[aria-live="polite"].cairn-cm-suggest-live')!;
    expect(live.textContent?.toLowerCase()).toContain('suggestion');
    expect(live.textContent).toContain('Alt+Enter');
  });

  it('draws the misspelling underline in the locked amber token, wavy', async () => {
    const unpin = pinWarningInk();
    try {
      const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
      const { container } = render(MarkdownEditor, props(fake));
      await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
      const mark = container.querySelector<HTMLElement>('.cm-lintRange-info')!;
      const style = getComputedStyle(mark);
      expect(style.textDecorationColor).toBe(WARNING_INK);
      expect(style.textDecorationStyle).toBe('wavy');
    } finally {
      unpin();
    }
  });
});
