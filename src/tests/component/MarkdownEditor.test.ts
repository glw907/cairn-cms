import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { cairnLinkCompletionSource } from '../../lib/components/link-completion.js';
import type { FormatKind } from '../../lib/components/markdown-format.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

// Reads the hidden form mirror so a test asserts what the form would submit.
const hiddenValue = (container: Element) =>
  container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '';

// Pins admin theme variables on the document root for one test; the test page loads no admin
// sheet, so an unpinned var() resolves to nothing and the declaration silently drops.
function pinThemeVars(vars: Record<string, string>): () => void {
  for (const [name, value] of Object.entries(vars)) document.documentElement.style.setProperty(name, value);
  return () => {
    for (const name of Object.keys(vars)) document.documentElement.style.removeProperty(name);
  };
}

// Finds the rendered line and token spans by text; generated highlight class names are not
// stable, so text plus computed style is the robust handle.
const lineWith = (container: Element, text: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('.cm-line')).find((l) => (l.textContent ?? '').includes(text));
const spanWith = (line: HTMLElement | undefined, text: string) =>
  line
    ? Array.from(line.querySelectorAll<HTMLElement>('span')).find((s) => (s.textContent ?? '').trim() === text)
    : undefined;

// The field-report regression document, verbatim: a labeled four-colon container holding two
// attributed panels. The directive tests share it so the depth model and the fence-line token
// treatment are proven on the same real nesting.
const NESTED_DOC = [
  '::::split[Costs & volunteers]',
  ':::panel{icon="hand-coins"}',
  "**Cost.** Training and camp are free, and money never decides who joins. Families who want to give can; donations buy gas, campground nights, and shared gear, and outfit athletes who need skis or a ride. If cost is in the way of anything, tell a coach. We won't ask about your finances.",
  ':::',
  '',
  ':::panel{icon="handshake" role="secondary"}',
  "**Volunteers.** Adults make this work, drivers most of all, since practice moves between trailheads. The [Volunteers page](/volunteers) has this summer's coaches and the jobs we need filled. You don't need a coaching certificate or a ski background.",
  ':::',
  '::::',
].join('\n');

// Clicks the surface into focus and moves the caret to the end of the document, where the
// list-continuation behaviors act. Ctrl-End is cursorDocEnd in the default keymap.
async function focusEditorEnd(container: Element) {
  const content = container.querySelector<HTMLElement>('.cm-content')!;
  await userEvent.click(content);
  await expect.poll(() => document.activeElement).toBe(content);
  await userEvent.keyboard('{Control>}{End}{/Control}');
}

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

  it('decorates every fence of a nested labeled document and steps the classes by depth', async () => {
    // The field-report regression: a labeled opener (::::split[...]) must read as machinery, not
    // prose, and the depth model must step the rails and label inks as the stack pairs the fences.
    const screen = render(MarkdownEditor, { value: NESTED_DOC, name: 'body' });
    await expect
      .poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-directive-fence').length)
      .toBe(6);
    const fences = [...screen.container.querySelectorAll('.cm-line.cm-cairn-directive-fence')];
    expect(fences.some((el) => el.textContent?.includes('::::split'))).toBe(true);
    // The split opener and its :::: closer delimit depth 1; the four panel fences delimit depth 2.
    expect(fences.filter((el) => el.classList.contains('cm-cairn-depth-1'))).toHaveLength(2);
    expect(fences.filter((el) => el.classList.contains('cm-cairn-depth-2'))).toHaveLength(4);
    // The panel prose rails at depth 2; the blank line between the panels rails at depth 1.
    expect(screen.container.querySelectorAll('.cm-line.cm-cairn-directive-content.cm-cairn-depth-2')).toHaveLength(2);
    expect(screen.container.querySelectorAll('.cm-line.cm-cairn-directive-content.cm-cairn-depth-1')).toHaveLength(1);
  });

  it('rails the fence rows without a band and stacks the nested rails by depth', async () => {
    // The rail vars carry fallbacks in the theme, but their color-mix needs --color-accent to
    // resolve or the whole declaration drops on the bare test page; the spacer layers between
    // stacked rails resolve --color-base-100 the same way. The leading plain line parks the
    // default caret outside the containers, so the rails read in their quiet state (the
    // caret-block emphasis has its own test).
    const unpin = pinThemeVars({ '--color-accent': 'rgb(100, 60, 200)', '--color-base-100': 'rgb(255, 254, 250)' });
    try {
      const screen = render(MarkdownEditor, { value: `quiet prose\n${NESTED_DOC}`, name: 'body' });
      await expect
        .poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-directive-fence').length)
        .toBe(6);
      const fence1 = screen.container.querySelector<HTMLElement>(
        '.cm-line.cm-cairn-directive-fence.cm-cairn-depth-1',
      )!;
      const fence2 = screen.container.querySelector<HTMLElement>(
        '.cm-line.cm-cairn-directive-fence.cm-cairn-depth-2',
      )!;
      const content2 = screen.container.querySelector<HTMLElement>(
        '.cm-line.cm-cairn-directive-content.cm-cairn-depth-2',
      )!;
      // No full-width band: the fence rows keep a transparent background.
      expect(getComputedStyle(fence1).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(fence2).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      // The rail: an inset box shadow shared with the content rows at the same depth, so a
      // container reads as one bracketed region.
      const rail1 = getComputedStyle(fence1).boxShadow;
      const rail2 = getComputedStyle(fence2).boxShadow;
      expect(rail1).toContain('inset');
      expect(rail2).toContain('inset');
      expect(rail2).toBe(getComputedStyle(content2).boxShadow);
      expect(rail1).not.toBe(rail2);
      // Literal nested brackets: a depth-2 row carries BOTH rail layers, its enclosing depth-1
      // bar verbatim plus a surface spacer and its own depth-2 bar stacked beside it.
      expect(rail2).toContain(rail1);
      expect(rail2.split('inset').length - 1).toBe(3);
    } finally {
      unpin();
    }
  });

  it('dims the fence machinery and inks the name and label on an opener row', async () => {
    const unpin = pinThemeVars({
      '--color-accent': 'rgb(100, 60, 200)',
      '--color-muted': 'rgb(120, 110, 100)',
      '--cairn-directive-ink-2': 'rgb(80, 40, 160)',
    });
    try {
      // The leading plain line parks the default caret outside the containers, keeping the
      // label inks in their quiet depth-stepped state.
      const screen = render(MarkdownEditor, { value: `quiet prose\n${NESTED_DOC}`, name: 'body' });
      await expect.poll(() => spanWith(lineWith(screen.container, '::::split'), '::::')).toBeTruthy();
      const opener = lineWith(screen.container, '::::split')!;
      // The colon run is machinery and recedes to the marker-muted tone.
      expect(getComputedStyle(spanWith(opener, '::::')!).color).toBe('rgb(120, 110, 100)');
      // The name and the label text are meaning and carry the accent ink (depth 1).
      expect(getComputedStyle(spanWith(opener, 'split')!).color).toBe('rgb(100, 60, 200)');
      expect(getComputedStyle(spanWith(opener, 'Costs & volunteers')!).color).toBe('rgb(100, 60, 200)');
      // A depth-2 opener's name steps to the depth-2 label ink.
      const panel = lineWith(screen.container, 'hand-coins')!;
      expect(getComputedStyle(spanWith(panel, 'panel')!).color).toBe('rgb(80, 40, 160)');
      // The label's [ ] brackets are machinery and recede with the colons, never the accent.
      expect(getComputedStyle(spanWith(opener, '[')!).color).toBe('rgb(120, 110, 100)');
      expect(getComputedStyle(spanWith(opener, ']')!).color).toBe('rgb(120, 110, 100)');
    } finally {
      unpin();
    }
  });

  it('mutes a bare closer row entirely', async () => {
    const unpin = pinThemeVars({
      '--color-accent': 'rgb(100, 60, 200)',
      '--color-muted': 'rgb(120, 110, 100)',
    });
    try {
      const screen = render(MarkdownEditor, { value: NESTED_DOC, name: 'body' });
      await expect
        .poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-directive-fence').length)
        .toBe(6);
      // The final ::::, found by exact text since the opener contains the same colon run.
      const closer = Array.from(screen.container.querySelectorAll<HTMLElement>('.cm-line')).find(
        (l) => l.textContent === '::::',
      )!;
      const spans = Array.from(closer.querySelectorAll<HTMLElement>('span'));
      expect(spans.length).toBeGreaterThan(0);
      for (const span of spans) {
        expect(getComputedStyle(span).color).toBe('rgb(120, 110, 100)');
      }
    } finally {
      unpin();
    }
  });

  it('strengthens only the caret container and follows the cursor across nesting', async () => {
    // Cursor-aware emphasis: the block the caret sits inside carries cm-cairn-caret-block on
    // every row, fence and content alike; the other containers sit quieter without it.
    const doc = ['plain intro', NESTED_DOC, 'plain outro'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-directive-fence').length).toBe(6);
    const caretRows = () => [...screen.container.querySelectorAll<HTMLElement>('.cm-line.cm-cairn-caret-block')];
    // The fresh editor's caret sits at the document start, outside any container.
    expect(caretRows()).toHaveLength(0);
    // Caret into the first panel's prose: only that panel's three rows strengthen.
    await userEvent.click(lineWith(screen.container, 'Cost.')!);
    await expect.poll(() => caretRows().length).toBe(3);
    expect(caretRows().some((l) => l.textContent?.includes('hand-coins'))).toBe(true);
    expect(caretRows().some((l) => l.textContent?.includes('::::split'))).toBe(false);
    // Caret onto the outer split's own content line (the blank between the panels): the class
    // moves to the outer container's full row span.
    const blank = [...screen.container.querySelectorAll<HTMLElement>('.cm-line')].find(
      (l) => (l.textContent ?? '') === '',
    )!;
    await userEvent.click(blank);
    await expect.poll(() => caretRows().length).toBe(9);
    expect(caretRows().some((l) => l.textContent?.includes('::::split'))).toBe(true);
    expect(caretRows().some((l) => l.textContent?.includes('plain intro'))).toBe(false);
    // Caret outside any container: no row carries the class.
    await userEvent.click(lineWith(screen.container, 'plain outro')!);
    await expect.poll(() => caretRows().length).toBe(0);
  });

  it('explains the directive machinery lines through a title tooltip', async () => {
    const doc = [':::gallery', 'inside', ':::', '::hr'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-directive-fence')).not.toBeNull();
    const expected = 'Layout marker. Edit the text between these lines and leave this line as it is.';
    expect(screen.container.querySelector('.cm-line.cm-cairn-directive-fence')?.getAttribute('title')).toBe(expected);
    expect(screen.container.querySelector('.cm-line.cm-cairn-directive-leaf')?.getAttribute('title')).toBe(expected);
  });

  it('writes in iA Writer Mono, the self-hosted editor face', async () => {
    // The test page loads no admin sheet, so the theme's --font-editor is pinned here, the same
    // theme value cairn-admin.css sets on both roots. The woff2 never loads in the test browser;
    // font-family computes from the declaration regardless, which is the seam under test.
    const unpin = pinThemeVars({ '--font-editor': "'iA Writer Mono', ui-monospace, monospace" });
    try {
      const screen = render(MarkdownEditor, { value: 'manuscript', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
      expect(getComputedStyle(content).fontFamily).toMatch(/^['"]?iA Writer Mono['"]?/);
    } finally {
      unpin();
    }
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

  it('steps the heading sizes by level and inks them in content color, not primary', async () => {
    // The test page loads no admin CSS, so the theme variables are pinned here; the heading rules
    // are the only ones that resolve them on a sized span, which discriminates the cairn style
    // from CodeMirror's default (which bolds headings but never sizes them). Generated class
    // names are not stable, so computed style is the robust handle.
    const unpin = pinThemeVars({
      '--color-base-content': 'rgb(20, 30, 40)',
      '--color-primary': 'rgb(200, 0, 50)',
    });
    try {
      const screen = render(MarkdownEditor, { value: '## Alpha\n### Beta\nplain body', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('Beta');
      await expect.poll(() => spanWith(lineWith(screen.container, 'Alpha'), 'Alpha')).toBeTruthy();
      const h2 = spanWith(lineWith(screen.container, 'Alpha'), 'Alpha')!;
      const h3 = spanWith(lineWith(screen.container, 'Beta'), 'Beta')!;
      const body = lineWith(screen.container, 'plain body')!;
      const h2Size = parseFloat(getComputedStyle(h2).fontSize);
      const h3Size = parseFloat(getComputedStyle(h3).fontSize);
      const bodySize = parseFloat(getComputedStyle(body).fontSize);
      expect(h2Size).toBeGreaterThan(h3Size);
      expect(h3Size).toBeGreaterThan(bodySize);
      // The surface reads at the standard 1rem body size; the old 0.9375rem was the cramped design.
      expect(bodySize).toBe(16);
      expect(getComputedStyle(h2).fontWeight).toBe('700');
      expect(getComputedStyle(h2).color).toBe('rgb(20, 30, 40)');
      expect(getComputedStyle(h2).color).not.toBe('rgb(200, 0, 50)');
    } finally {
      unpin();
    }
  });

  it('renders heading and emphasis markers muted, distinct from their content', async () => {
    const unpin = pinThemeVars({
      '--color-base-content': 'rgb(20, 30, 40)',
      '--color-muted': 'rgb(120, 110, 100)',
    });
    try {
      const screen = render(MarkdownEditor, { value: '## A **b**', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('A');
      const line = () => lineWith(screen.container, 'A');
      await expect.poll(() => spanWith(line(), '##')).toBeTruthy();
      const headingMark = spanWith(line(), '##')!;
      expect(getComputedStyle(headingMark).color).toBe('rgb(120, 110, 100)');
      // The quiet weight: markers shed the heading's bold along with its ink.
      expect(getComputedStyle(headingMark).fontWeight).toBe('400');
      const content = spanWith(line(), 'A')!;
      expect(getComputedStyle(content).color).toBe('rgb(20, 30, 40)');
      const emphasisMarks = Array.from(line()!.querySelectorAll<HTMLElement>('span')).filter(
        (s) => (s.textContent ?? '').trim() === '**',
      );
      expect(emphasisMarks.length).toBeGreaterThan(0);
      for (const mark of emphasisMarks) {
        expect(getComputedStyle(mark).color).toBe('rgb(120, 110, 100)');
      }
      const bold = spanWith(line(), 'b')!;
      expect(getComputedStyle(bold).color).toBe('rgb(20, 30, 40)');
    } finally {
      unpin();
    }
  });

  it('inks quote text in content ink and italic, muting only the marker', async () => {
    // Muted means machinery, never content: the > marker recedes while the quoted prose keeps
    // the full content ink, so a focused blockquote still out-inks the focus-mode dim.
    const unpin = pinThemeVars({
      '--color-base-content': 'rgb(20, 30, 40)',
      '--color-muted': 'rgb(120, 110, 100)',
    });
    try {
      const screen = render(MarkdownEditor, { value: '> wise words', name: 'body' });
      await expect.poll(() => spanWith(lineWith(screen.container, 'wise'), 'wise words')).toBeTruthy();
      const line = lineWith(screen.container, 'wise')!;
      const text = spanWith(line, 'wise words')!;
      expect(getComputedStyle(text).color).toBe('rgb(20, 30, 40)');
      expect(getComputedStyle(text).fontStyle).toBe('italic');
      expect(getComputedStyle(spanWith(line, '>')!).color).toBe('rgb(120, 110, 100)');
    } finally {
      unpin();
    }
  });

  it('carries the accent on link text and mutes the URL part', async () => {
    const unpin = pinThemeVars({
      '--color-accent': 'rgb(0, 130, 60)',
      '--color-muted': 'rgb(120, 110, 100)',
    });
    try {
      const screen = render(MarkdownEditor, { value: '[t](https://e.com)', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('e.com');
      const line = () => lineWith(screen.container, 'e.com');
      await expect.poll(() => spanWith(line(), 't')).toBeTruthy();
      expect(getComputedStyle(spanWith(line(), 't')!).color).toBe('rgb(0, 130, 60)');
      expect(getComputedStyle(spanWith(line(), 'https://e.com')!).color).toBe('rgb(120, 110, 100)');
    } finally {
      unpin();
    }
  });

  it('renders inline code as a chip in content ink, not accent', async () => {
    const unpin = pinThemeVars({
      '--cairn-code-chip': 'rgb(240, 233, 224)',
      '--color-base-content': 'rgb(20, 30, 40)',
      '--color-accent': 'rgb(0, 130, 60)',
    });
    try {
      const screen = render(MarkdownEditor, { value: 'a `code` b', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('code');
      const line = () => lineWith(screen.container, 'code');
      await expect.poll(() => spanWith(line(), 'code')).toBeTruthy();
      const chip = spanWith(line(), 'code')!;
      const chipStyle = getComputedStyle(chip);
      expect(chipStyle.backgroundColor).toBe('rgb(240, 233, 224)');
      const editorBackground = getComputedStyle(screen.container.querySelector('.cm-editor')!).backgroundColor;
      expect(chipStyle.backgroundColor).not.toBe(editorBackground);
      expect(chipStyle.color).toBe('rgb(20, 30, 40)');
      expect(chipStyle.color).not.toBe('rgb(0, 130, 60)');
    } finally {
      unpin();
    }
  });

  it('caps the content column at 70ch and centers it', async () => {
    const screen = render(MarkdownEditor, { value: 'plain prose', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    // The default browser viewport is narrower than the measure, so the host widens past it to
    // make the cap and the centering observable.
    (screen.container as HTMLElement).style.width = '64rem';
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const contentStyle = getComputedStyle(content);
    // 70ch computes to an absolute length; a probe in the same font supplies the expected value.
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.fontFamily = contentStyle.fontFamily;
    probe.style.fontSize = contentStyle.fontSize;
    probe.style.width = '70ch';
    document.body.appendChild(probe);
    try {
      const expected = probe.getBoundingClientRect().width;
      expect(parseFloat(contentStyle.maxWidth)).toBeCloseTo(expected, 0);
      // Auto horizontal margins center the capped column inside the wider scroller.
      const scroller = screen.container.querySelector<HTMLElement>('.cm-scroller')!;
      const contentRect = content.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const leftGap = contentRect.left - scrollerRect.left;
      const rightGap = scrollerRect.right - contentRect.right;
      expect(leftGap).toBeGreaterThan(0);
      expect(Math.abs(leftGap - rightGap)).toBeLessThan(2);
    } finally {
      probe.remove();
    }
  });

  it('parses strikethrough under the GFM base and renders it struck', async () => {
    // The commonmark default base has no Strikethrough node; only the GFM base does. The
    // highlight style maps tags.strikethrough to line-through, and generated class names are
    // not stable, so the computed style is the robust handle (the heading test's pattern).
    const screen = render(MarkdownEditor, { value: 'a ~~struck~~ word', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('struck');
    const struckSpan = () =>
      Array.from(screen.container.querySelectorAll<HTMLElement>('.cm-content span')).some(
        (s) =>
          (s.textContent ?? '').includes('struck') &&
          getComputedStyle(s).textDecorationLine.includes('line-through'),
      );
    await expect.poll(struckSpan).toBe(true);
  });

  it('continues a list item on Enter through the markdown keymap', async () => {
    const screen = render(MarkdownEditor, { value: '- first', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('first');
    await focusEditorEnd(screen.container);
    await userEvent.keyboard('{Enter}second');
    await expect.poll(() => hiddenValue(screen.container)).toBe('- first\n- second');
  });

  it('removes an empty list marker on Backspace through the markdown keymap', async () => {
    const screen = render(MarkdownEditor, { value: '- first\n- ', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('first');
    await focusEditorEnd(screen.container);
    // deleteMarkupBackward removes the whole marker in one keystroke, replacing it with blank
    // indentation of the same width rather than chewing it one character at a time.
    await userEvent.keyboard('{Backspace}');
    await expect.poll(() => hiddenValue(screen.container)).toBe('- first\n  ');
  });

  it('dims everything outside the caret paragraph in focus mode and follows the caret', async () => {
    const unpin = pinThemeVars({
      '--color-base-content': 'rgb(20, 30, 40)',
      '--cairn-focus-dim-ink': 'rgb(150, 140, 130)',
    });
    try {
      const doc = ['first one', 'first two', '', 'second para', '', 'third para'].join('\n');
      const screen = render(MarkdownEditor, { value: doc, name: 'body', focusMode: true });
      await expect.poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-focus-dim').length).toBe(4);
      const dimmed = (text: string) => lineWith(screen.container, text)!.classList.contains('cm-cairn-focus-dim');
      // The fresh editor's caret sits at the document start, so the opening paragraph is the lit
      // one, and the paragraph is the contiguous non-blank block, both of its lines.
      expect(dimmed('first one')).toBe(false);
      expect(dimmed('first two')).toBe(false);
      expect(dimmed('second para')).toBe(true);
      expect(dimmed('third para')).toBe(true);
      // The dim is a real ink, not a bare class: the line color resolves the per-theme variable
      // while the lit paragraph keeps the content ink.
      expect(getComputedStyle(lineWith(screen.container, 'third para')!).color).toBe('rgb(150, 140, 130)');
      expect(getComputedStyle(lineWith(screen.container, 'first one')!).color).toBe('rgb(20, 30, 40)');
      // The dim follows the caret.
      await userEvent.click(lineWith(screen.container, 'third para')!);
      await expect.poll(() => dimmed('third para')).toBe(false);
      expect(dimmed('first one')).toBe(true);
      expect(dimmed('first two')).toBe(true);
      expect(dimmed('second para')).toBe(true);
    } finally {
      unpin();
    }
  });

  it('flattens chip backgrounds on dimmed lines in focus mode', async () => {
    // Dim ink on a tinted chip measures under the 3:1 floor, so the dim arm drops the chip
    // backgrounds along with the ink: the inline-code chip, the inline directive chip, and the
    // leaf directive line all flatten while the lit paragraph keeps its chips.
    const unpin = pinThemeVars({
      '--cairn-code-chip': 'rgb(240, 233, 224)',
      '--color-accent': 'rgb(100, 60, 200)',
    });
    try {
      const doc = ['lit `chip` here', '', 'dim `code` and :icon[ski]{s=1}', '', '::hr'].join('\n');
      const screen = render(MarkdownEditor, { value: doc, name: 'body', focusMode: true });
      await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-directive-leaf')).not.toBeNull();
      await expect.poll(() => spanWith(lineWith(screen.container, 'lit'), 'chip')).toBeTruthy();
      // The caret paragraph stays lit, chips intact.
      expect(getComputedStyle(spanWith(lineWith(screen.container, 'lit'), 'chip')!).backgroundColor).toBe(
        'rgb(240, 233, 224)',
      );
      const dimLine = lineWith(screen.container, 'dim')!;
      expect(dimLine.classList.contains('cm-cairn-focus-dim')).toBe(true);
      expect(getComputedStyle(spanWith(dimLine, 'code')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      const inline = dimLine.querySelector<HTMLElement>('.cm-cairn-directive-inline')!;
      expect(getComputedStyle(inline).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      const leaf = () => screen.container.querySelector<HTMLElement>('.cm-line.cm-cairn-directive-leaf')!;
      expect(leaf().classList.contains('cm-cairn-focus-dim')).toBe(true);
      expect(getComputedStyle(leaf()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      // Caret into the leaf's paragraph: the chip background returns with the lit ink.
      await userEvent.click(leaf());
      await expect.poll(() => leaf().classList.contains('cm-cairn-focus-dim')).toBe(false);
      expect(getComputedStyle(leaf()).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    } finally {
      unpin();
    }
  });

  it('keeps both writing modes off by default', async () => {
    const screen = render(MarkdownEditor, { value: 'alpha\n\nbeta', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('beta');
    expect(screen.container.querySelector('.cm-cairn-focus-dim')).toBeNull();
    // No typewriter recentering either: an edit leaves the scroller where it was.
    await focusEditorEnd(screen.container);
    await userEvent.keyboard('x');
    await expect.poll(() => hiddenValue(screen.container)).toBe('alpha\n\nbetax');
    expect(screen.container.querySelector<HTMLElement>('.cm-scroller')!.scrollTop).toBe(0);
    expect(screen.container.querySelector('.cm-cairn-focus-dim')).toBeNull();
  });

  it('keeps editing intact with typewriter scroll enabled', async () => {
    // The recenter dispatch is queued behind each doc change; this drives that path in a real
    // browser, where a dispatch-during-update mistake or a rejected microtask would fail the run.
    const screen = render(MarkdownEditor, { value: 'line', name: 'body', typewriter: true });
    await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('line');
    await focusEditorEnd(screen.container);
    await userEvent.keyboard(' more');
    await expect.poll(() => hiddenValue(screen.container)).toBe('line more');
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
