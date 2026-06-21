import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import type { SpellWorker } from '../../lib/components/spellcheck.js';
import type { MediaLibrary } from '../../lib/media/library-entry.js';

// The real wasm and dictionary assets resolve through `import.meta.url` and do not load under the
// vitest browser dev server, and the 1.5MB dictionary is slow, so the spellcheck component layer drives
// a deterministic fake Worker through MarkdownEditor's `spellcheckTest` seam. The fake speaks the same
// inbound/outbound protocol the real worker does (init/ready, check/checked, suggest/suggested,
// addWord). It marks one chosen word wrong and everything else right, answers suggest with a canned
// ranked list, and after an addWord marks that word right so a re-lint clears its underline.

interface FakeWorkerConfig {
  /** The lowercased words the engine treats as misspelled, until added to the personal set. */
  wrong: string[];
  /** The ranked suggestions a suggest round-trip returns for any word. */
  suggestions: string[];
  /** When true the fake posts a `ready` message after init, so the lint source waits for it the way it
   *  waits for the real worker. When false the test passes `assumeReady` instead. */
  announceReady?: boolean;
}

/** Build a fake SpellWorker plus a handle to read what it recorded. The worker answers on the same
 *  message listener the lint source registers, so the source's seq matching and re-lint run unchanged. */
function makeFakeWorker(config: FakeWorkerConfig): { create: () => SpellWorker; added: Set<string> } {
  const added = new Set<string>();
  const wrong = new Set(config.wrong.map((w) => w.toLowerCase()));
  const listeners = new Set<(event: MessageEvent) => void>();

  const post = (data: unknown) => {
    const event = { data } as MessageEvent;
    for (const listener of listeners) listener(event);
  };

  const isCorrect = (word: string) => added.has(word.toLowerCase()) || !wrong.has(word.toLowerCase());

  const worker: SpellWorker = {
    postMessage(message: unknown) {
      const msg = message as {
        type?: string;
        seq?: number;
        words?: { id: number; word: string }[];
        word?: string;
      };
      if (msg.type === 'init') {
        if (config.announceReady) queueMicrotask(() => post({ type: 'ready' }));
        return;
      }
      if (msg.type === 'check') {
        const results = (msg.words ?? []).map((w) => ({ id: w.id, correct: isCorrect(w.word) }));
        queueMicrotask(() => post({ type: 'checked', seq: msg.seq, results }));
        return;
      }
      if (msg.type === 'suggest') {
        queueMicrotask(() => post({ type: 'suggested', seq: msg.seq, word: msg.word, suggestions: config.suggestions }));
        return;
      }
      if (msg.type === 'addWord' && typeof msg.word === 'string') {
        added.add(msg.word.toLowerCase());
        return;
      }
    },
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };

  return { create: () => worker, added };
}

// The locked spellcheck underline color: the theme overrides `.cm-lintRange-info` to a wavy underline
// in var(--cairn-warning-ink). The test page loads no admin sheet, so the var is pinned here, the same
// value cairn-admin.css sets; an unpinned var() drops the declaration and the color reads as the
// inherited text color.
const WARNING_INK = 'rgb(180, 120, 20)';
function pinWarningInk(): () => void {
  document.documentElement.style.setProperty('--cairn-warning-ink', WARNING_INK);
  return () => document.documentElement.style.removeProperty('--cairn-warning-ink');
}

// The first CodeMirror mount pays the one-time cold-start of the editor's dynamic imports; under the
// full tri-project run the transform contention pushes that past the default 1s poll. The generous
// timeout absorbs it, matching MarkdownEditor.test.ts.
const COLD_START = { timeout: 20000 };

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

  it('replaces the word with one transaction when a suggestion action fires', async () => {
    const unpin = pinWarningInk();
    try {
      const { create } = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'tea'] });
      const screen = render(MarkdownEditor, {
        value: 'teh trail',
        name: 'body',
        spellcheck: true,
        spellcheckTest: { createWorker: create, assumeReady: true },
      });
      await expect.poll(() => underlines(screen.container).length, COLD_START).toBe(1);
      // Open the hover tooltip over the underline and click the first suggestion. The lint hover
      // renders the diagnostic actions as `.cm-diagnosticAction` buttons; the first is the top
      // suggestion "the".
      const mark = underlines(screen.container)[0]!;
      await userEvent.hover(mark);
      const action = () =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('.cm-diagnosticAction')).find(
          (b) => b.textContent === 'the',
        );
      await expect.poll(action, { timeout: 5000 }).toBeTruthy();
      await userEvent.click(action()!);
      // The replace lands as one transaction: "teh" becomes "the", the misspelling is gone, the rest of
      // the line is intact.
      await expect.poll(() => hiddenValue(screen.container)).toBe('the trail');
    } finally {
      unpin();
    }
  });

  it('clears every instance of a word added to the dictionary', async () => {
    const unpin = pinWarningInk();
    try {
      const { create, added } = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
      // The misspelling appears twice, so both underline before the add and both must clear after.
      const screen = render(MarkdownEditor, {
        value: 'teh first line\nteh second line',
        name: 'body',
        spellcheck: true,
        spellcheckTest: { createWorker: create, assumeReady: true },
      });
      await expect.poll(() => underlines(screen.container).length, COLD_START).toBe(2);
      // Hover the first underline and click Add to dictionary.
      await userEvent.hover(underlines(screen.container)[0]!);
      const addBtn = () =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('.cm-diagnosticAction')).find(
          (b) => b.textContent === 'Add to dictionary',
        );
      await expect.poll(addBtn, { timeout: 5000 }).toBeTruthy();
      await userEvent.click(addBtn()!);
      // The source posts addWord (the fake now answers "teh" correct) and re-lints; both underlines
      // clear and the word is in the personal set.
      await expect.poll(() => added.has('teh'), { timeout: 8000 }).toBe(true);
      await expect.poll(() => underlines(screen.container).length, { timeout: 8000 }).toBe(0);
    } finally {
      unpin();
    }
  });

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
