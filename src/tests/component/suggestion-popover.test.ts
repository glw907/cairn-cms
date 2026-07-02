import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { makeFakeWorker, COLD_START, WARNING_INK, pinWarningInk } from './_fake-spell-worker.js';

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

  it('moves focus into the popover on Alt-Enter and restores it on Escape (WCAG 1.4.13, dismissable)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container);
    await userEvent.keyboard('{Alt>}{Enter}{/Alt}');
    await expect.poll(() => document.activeElement?.closest('.cairn-cm-suggest'), COLD_START).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement?.closest('.cm-content'), COLD_START).toBeTruthy();
  });

  it('dismisses the ambient popover on Escape with focus still in .cm-content, and reappears at the next diagnostic (WCAG 1.4.13, dismissable)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container); // clicks the first underline: caret in range, focus in .cm-content
    expect(document.activeElement?.closest('.cm-content')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => container.querySelector('.cairn-cm-suggest'), COLD_START).toBeNull();
    // Stays hidden while the caret is unmoved, even across a beat that a background lint effect
    // (a relint under a resting caret) could otherwise use to resurface it.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(container.querySelector('.cairn-cm-suggest')).toBeNull();
    // Moving the caret to the other misspelling shows the popover again.
    const underlines = container.querySelectorAll('.cm-lintRange-info');
    await userEvent.click(underlines[underlines.length - 1]!);
    await expect.poll(() => container.querySelector('.cairn-cm-suggest'), COLD_START).toBeTruthy();
  });

  it('does not steal focus when the popover appears (WCAG 1.4.13, no focus theft)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container); // clicks the underline, which focuses the content
    expect(document.activeElement?.closest('.cairn-cm-suggest')).toBeNull();
    expect(document.activeElement?.closest('.cm-content')).toBeTruthy();
  });

  it('keeps the popover mounted across an unrelated background reconfigure (WCAG 1.4.13, persistent)', async () => {
    // An unrelated background effect (the media library compartment reconfiguring on a prop change)
    // dispatches a transaction with an effect but no doc or selection change, the same shape a stale
    // background lint effect takes. The caret never leaves the diagnostic range, so the popover must
    // stay the SAME mounted node, not merely reappear.
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const withImage = {
      ...props(fake),
      value: 'teh cat teh dog ![pic](media:unrelated.aaaabbbbccccdddd)',
      mediaLibrary: {},
    };
    const screen = render(MarkdownEditor, withImage);
    const popover = await openPopover(screen.container);
    await screen.rerender({
      ...withImage,
      mediaLibrary: {
        aaaabbbbccccdddd: {
          hash: 'aaaabbbbccccdddd',
          slug: 'unrelated',
          ext: 'webp',
          contentType: 'image/webp',
          displayName: 'An unrelated image',
          alt: 'Unrelated',
          width: 640,
          height: 480,
          bytes: 1234,
          createdAt: '2026-06-30T00:00:00.000Z',
        },
      },
    });
    // Confirm the reconfigure actually dispatched (not a no-op): the fallback chip's name updates to
    // the library's display name once the entry joins.
    await expect.poll(() => screen.container.querySelector('.cm-cairn-media-name')?.textContent, COLD_START).toBe(
      'An unrelated image',
    );
    expect(screen.container.querySelector('.cairn-cm-suggest')).toBe(popover);
  });

  it('agrees with the announcer on one diagnostic when a spelling and an objective finding overlap (WCAG 1.4.13, overlapping)', async () => {
    // "teh teh" is a doubled word (the objective-error linter) AND its first occurrence is itself a
    // misspelling (spellcheck), so the caret lands inside two overlapping diagnostics at once.
    // forEachDiagnostic documents no ordering contract, so the expected winner is derived from what
    // actually renders, never a hardcoded emission order.
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, {
      value: 'teh teh cat dog', name: 'body', spellcheck: true,
      spellcheckTest: { createWorker: fake.create, assumeReady: true },
    });
    await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    await userEvent.click(container.querySelector('.cm-lintRange-info')!);
    await expect.poll(() => container.querySelector('.cairn-cm-suggest'), COLD_START).toBeTruthy();
    const popovers = container.querySelectorAll('.cairn-cm-suggest');
    expect(popovers.length).toBe(1);
    const popoverMessage = popovers[0]!.getAttribute('aria-label');
    expect(popoverMessage).toBeTruthy();
    const live = container.querySelector<HTMLElement>('[aria-live="polite"].cairn-cm-suggest-live')!;
    await expect.poll(() => live.textContent, COLD_START).toContain(popoverMessage);
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
