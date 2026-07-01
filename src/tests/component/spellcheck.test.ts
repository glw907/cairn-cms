import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import type { MediaLibrary } from '../../lib/media/library-entry.js';
import { makeFakeWorker, COLD_START, WARNING_INK, pinWarningInk } from './fake-spell-worker.js';

const underlines = (container: Element) =>
  Array.from(container.querySelectorAll<HTMLElement>('.cm-lintRange-info'));

const lineWith = (container: Element, text: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('.cm-line')).find((l) => (l.textContent ?? '').includes(text));

const hiddenValue = (container: Element) =>
  container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '';

describe('MarkdownEditor spellcheck (real browser)', () => {
  it('underlines a misspelled word in the warning ink but never a code span or a media token', async () => {
    const unpin = pinWarningInk();
    try {
      const { create } = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
      // The misspelled prose word, an inline code span whose contents would be "wrong" if checked, and a
      // bare media: token. The skip authority keeps the lint off the code and the media token.
      const doc = 'teh start with `teh` code and media:abcdef0123456789 done';
      const screen = render(MarkdownEditor, {
        value: doc,
        name: 'body',
        spellcheck: true,
        spellcheckTest: { createWorker: create, assumeReady: true },
      });
      // The lint settles asynchronously after mount: the source posts check, the fake answers checked
      // then suggested, and the diagnostic paints. Poll for exactly one underline.
      await expect.poll(() => underlines(screen.container).length, COLD_START).toBe(1);
      const mark = underlines(screen.container)[0]!;
      // The underline sits over the prose "teh", not the code or media token.
      expect(mark.textContent).toBe('teh');
      // The locked amber: the theme paints a wavy underline in --cairn-warning-ink.
      const style = getComputedStyle(mark);
      expect(style.textDecorationColor).toBe(WARNING_INK);
      expect(style.textDecorationStyle).toBe('wavy');
      // No underline anywhere on the code span or the media token. The single underline is the prose
      // word, proven above; assert the code chip and the media run carry no lint range.
      const codeLine = lineWith(screen.container, 'code')!;
      const codeChip = Array.from(codeLine.querySelectorAll<HTMLElement>('span')).find(
        (s) => (s.textContent ?? '').includes('teh') && s !== mark && !s.contains(mark),
      );
      // The only `.cm-lintRange-info` is the prose word; the code-span copy of "teh" is not underlined.
      expect(codeChip?.classList.contains('cm-lintRange-info')).not.toBe(true);
      expect(screen.container.textContent).toContain('media:abcdef0123456789');
    } finally {
      unpin();
    }
  });

  // The suggestion-apply and add-to-dictionary interactions used to run through @codemirror/lint's
  // built-in hover tooltip (`.cm-diagnosticAction` buttons), asserted here. This pass suppresses that
  // built-in tooltip with `tooltipFilter`; a later pass task renders cairn's own recipe popover via
  // `showTooltip` in its place and carries the equivalent coverage into `suggestion-popover.test.ts`
  // against the new popover's DOM.

  it('drops the underlines when the footer toggle goes off and restores them when it returns', async () => {
    const unpin = pinWarningInk();
    try {
      const { create } = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
      const screen = render(MarkdownEditor, {
        value: 'teh ridge',
        name: 'body',
        spellcheck: true,
        spellcheckTest: { createWorker: create, assumeReady: true },
      });
      await expect.poll(() => underlines(screen.container).length, COLD_START).toBe(1);
      // The native spellcheck attribute stays off the whole time (the cairn lint replaces it).
      const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
      expect(content.getAttribute('spellcheck')).toBe('false');
      // Toggle off: the compartment reconfigures to empty, so the underline vanishes.
      await screen.rerender({ value: 'teh ridge', name: 'body', spellcheck: false, spellcheckTest: { createWorker: create, assumeReady: true } });
      await expect.poll(() => underlines(screen.container).length).toBe(0);
      expect(content.getAttribute('spellcheck')).toBe('false');
      // Toggle back on: the bundled extension returns and the underline paints again.
      await screen.rerender({ value: 'teh ridge', name: 'body', spellcheck: true, spellcheckTest: { createWorker: create, assumeReady: true } });
      await expect.poll(() => underlines(screen.container).length, { timeout: 8000 }).toBe(1);
    } finally {
      unpin();
    }
  });

  it('co-exists with the media atomic decoration and the directive highlight without suppression (TD-1)', async () => {
    const unpin = pinWarningInk();
    try {
      const { create } = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
      // One document carrying all three decoration layers: a misspelled prose word (spellcheck lint), a
      // media image token resolved by the library (media chip + atomic ranges), and a directive
      // container with an inline directive (the highlight plugin's rails and chips).
      const hash = 'abcdef0123456789';
      const mediaLibrary: MediaLibrary = {
        [hash]: {
          hash,
          slug: 'ridge',
          ext: 'webp',
          contentType: 'image/webp',
          displayName: 'Ridge',
          alt: 'A ridge',
          width: 800,
          height: 600,
          bytes: 1024,
          createdAt: '2026-06-20T00:00:00.000Z',
        },
      };
      const doc = [
        'teh opening prose line',
        '',
        `![A ridge](media:ridge.${hash})`,
        '',
        ':::panel',
        'inside the panel with :icon[ski]{s=1} inline',
        ':::',
      ].join('\n');
      const screen = render(MarkdownEditor, {
        value: doc,
        name: 'body',
        mediaLibrary,
        spellcheck: true,
        spellcheckTest: { createWorker: create, assumeReady: true },
      });
      // The spellcheck underline paints.
      await expect.poll(() => underlines(screen.container).length, COLD_START).toBe(1);
      expect(underlines(screen.container)[0]!.textContent).toBe('teh');
      // The media chip widget renders over the resolved token (the atomic-range layer rides the same
      // matches), so the layer is live alongside the lint.
      expect(screen.container.querySelector('.cm-cairn-media-chip')).not.toBeNull();
      expect(screen.container.querySelector('.cm-cairn-media-name')?.textContent).toContain('Ridge');
      // The directive highlight layer renders: the fence rows and the inline directive chip.
      expect(screen.container.querySelector('.cm-line.cm-cairn-directive-fence')).not.toBeNull();
      expect(screen.container.querySelector('.cm-cairn-directive-inline')).not.toBeNull();
      // None of the three suppressed another: the underline still reads the prose word, and the editor
      // mirrors the full source unchanged (no layer rewrote the doc or threw).
      expect(hiddenValue(screen.container)).toBe(doc);
    } finally {
      unpin();
    }
  });
});
