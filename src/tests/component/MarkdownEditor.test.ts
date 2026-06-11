import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { cairnLinkCompletionSource } from '../../lib/components/link-completion.js';
import type { FormatKind } from '../../lib/components/markdown-format.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

describe('MarkdownEditor', () => {
  it('mirrors the bindable value into a hidden field named for the form', async () => {
    const screen = render(MarkdownEditor, { value: 'hello world', name: 'body' });
    await expect
      .element(screen.container.querySelector<HTMLInputElement>('input[name="body"]')!)
      .toHaveValue('hello world');
  });

  it('mounts a CodeMirror surface seeded with the value', async () => {
    const screen = render(MarkdownEditor, { value: 'mountain weather', name: 'body' });
    await expect
      .poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '')
      .toContain('mountain weather');
  });

  it('inserts text at the cursor through registerInsert and mirrors it', async () => {
    let insert: ((text: string) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: 'start',
      name: 'body',
      registerInsert: (fn: (text: string) => void) => {
        insert = fn;
      },
    });
    await expect.poll(() => typeof insert).toBe('function');
    insert!('INSERTED');
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('INSERTED');
  });

  it('inserts an inline link through registerInsertLink', async () => {
    let insertLink: ((href: string, title: string) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: 'start',
      name: 'body',
      registerInsertLink: (fn: (href: string, title: string) => void) => {
        insertLink = fn;
      },
    });
    await expect.poll(() => typeof insertLink).toBe('function');
    insertLink!('cairn:pages/about', 'About');
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('[About](cairn:pages/about)');
  });

  it('applies a markdown format through registerFormat and mirrors it', async () => {
    let format: ((kind: FormatKind) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: 'start',
      name: 'body',
      registerFormat: (fn: (kind: FormatKind) => void) => {
        format = fn;
      },
    });
    await expect.poll(() => typeof format).toBe('function');
    format!('h2');
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('## start');
  });

  it('renders no toolbar of its own; the host strip owns the controls', async () => {
    const screen = render(MarkdownEditor, { value: 'plain', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-editor')).not.toBeNull();
    expect(screen.container.querySelector('[role="toolbar"]')).toBeNull();
  });

  it('reflects an external value reassignment into the mounted editor', async () => {
    const screen = render(MarkdownEditor, { value: 'first', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '').toContain('first');
    await screen.rerender({ value: 'second', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '').toContain('second');
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('second');
  });

  it('enables spell check and decorates directive machinery', async () => {
    const doc = ['## Title', '**bold** text', ':::gallery', '::hr', 'see :icon[ski]{s=1} here'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    expect(content.getAttribute('spellcheck')).toBe('true');
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-directive-fence')).not.toBeNull();
    expect(screen.container.querySelector('.cm-line.cm-cairn-directive-leaf')).not.toBeNull();
    expect(screen.container.querySelector('.cm-cairn-directive-inline')).not.toBeNull();
  });

  it('explains the directive machinery lines through a title tooltip', async () => {
    const doc = [':::gallery', 'inside', ':::', '::hr'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-directive-fence')).not.toBeNull();
    const expected = 'Layout marker. Edit the text between these lines and leave this line as it is.';
    expect(screen.container.querySelector('.cm-line.cm-cairn-directive-fence')?.getAttribute('title')).toBe(expected);
    expect(screen.container.querySelector('.cm-line.cm-cairn-directive-leaf')?.getAttribute('title')).toBe(expected);
  });

  it('gives the editing surface a generous minimum height', async () => {
    const screen = render(MarkdownEditor, { value: 'short', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const minHeight = parseFloat(getComputedStyle(content).minHeight);
    expect(minHeight).toBeCloseTo(window.innerHeight * 0.5, 0);
  });

  it('keeps the focus indicator a quiet hairline while writing', async () => {
    // The test page loads no admin sheet, so the outline's var(--color-primary) needs a value;
    // unresolved, the declaration computes invalid and the outline silently reads "none".
    document.documentElement.style.setProperty('--color-primary', 'rgb(12, 34, 56)');
    try {
      const screen = render(MarkdownEditor, { value: 'plain prose', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
      await userEvent.click(content);
      await expect.poll(() => document.activeElement).toBe(content);
      // The focused editor draws a 1px low-alpha line, never the 2px solid primary ring:
      // browsers hold a focused text surface in keyboard modality, so a loud ring would
      // persist while typing.
      const editor = getComputedStyle(screen.container.querySelector('.cm-editor')!);
      expect(editor.outlineStyle).toBe('solid');
      expect(editor.outlineWidth).toBe('1px');
      expect(content.matches(':focus')).toBe(true);
    } finally {
      document.documentElement.style.removeProperty('--color-primary');
    }
  });

  it('passes a dark theme to CodeMirror inside the dark admin theme', async () => {
    document.body.setAttribute('data-theme', 'cairn-admin-dark');
    try {
      const screen = render(MarkdownEditor, { value: 'night text', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      // CodeMirror's dark base theme sets a white caret on the content; the light base sets black.
      const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
      await expect.poll(() => getComputedStyle(content).caretColor).toBe('rgb(255, 255, 255)');
    } finally {
      document.body.removeAttribute('data-theme');
    }
  });

  it('renders heading lines through the cairn highlight theme', async () => {
    // The test page loads no admin CSS, so --color-primary is pinned here; the cairn heading style
    // is the only one that references it, which makes the computed color discriminate our theme
    // from CodeMirror's default (which also bolds headings). The generated class names are not
    // stable, so computed style is the robust handle.
    document.documentElement.style.setProperty('--color-primary', 'rgb(12, 34, 56)');
    try {
      const screen = render(MarkdownEditor, { value: '## Title\n\nplain prose', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('Title');
      const headingThemedSpan = () => {
        const line = Array.from(screen.container.querySelectorAll<HTMLElement>('.cm-line')).find((l) =>
          (l.textContent ?? '').includes('Title'),
        );
        if (!line) return false;
        return Array.from(line.querySelectorAll<HTMLElement>('span')).some((s) => {
          const style = getComputedStyle(s);
          return style.color === 'rgb(12, 34, 56)' && style.fontWeight === '700';
        });
      };
      await expect.poll(headingThemedSpan).toBe(true);
    } finally {
      document.documentElement.style.removeProperty('--color-primary');
    }
  });

  it('offers and applies a cairn link through the [[ autocomplete', async () => {
    const targets: LinkTarget[] = [
      { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
    ];
    const screen = render(MarkdownEditor, {
      value: '',
      name: 'body',
      completionSources: [cairnLinkCompletionSource(targets)],
    });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    content.focus();
    // userEvent.keyboard treats [ as a key-descriptor opener, so a literal [ is escaped as [[.
    await userEvent.keyboard('[[[[Ab');
    // the autocomplete tooltip appears with the matching option
    await expect
      .poll(() => screen.container.querySelector('.cm-tooltip-autocomplete [role="option"]')?.textContent ?? '')
      .toContain('About Us');
    // Accept by clicking the option. CodeMirror applies a completion on the option's mousedown, which
    // a click drives deterministically. An Enter keystroke instead races CodeMirror's accept handler
    // under parallel load and can fall through to a newline; clicking proves the same seam without it.
    const option = screen.container.querySelector<HTMLElement>('.cm-tooltip-autocomplete [role="option"]')!;
    await userEvent.click(option);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('[About Us](cairn:pages/about)');
  });
});
