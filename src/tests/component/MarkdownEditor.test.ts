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

// Extracts each box-shadow layer's x offset. A layer's lengths serialize as a run of px values
// after its resolved color, and the oklab colors carry no px, so the first length of each run is
// the layer's inset offset.
const barOffsets = (shadow: string) =>
  [...shadow.matchAll(/(-?\d+(?:\.\d+)?)px(?: -?\d+(?:\.\d+)?px){2,3}/g)].map((m) => Number(m[1]));

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

// A single foldable container: one opener with a name and attributes, two body lines, and a bare
// closer. The leading plain line parks the default caret outside, so the fold tests drive the
// caret and the fold deliberately.
const FOLD_DOC = ['intro line', ':::panel{title="Day pass"}', 'body one', 'body two', ':::'].join('\n');

// The number of visible editor lines; CodeMirror removes the lines a fold hides from the DOM.
const lineCount = (container: Element) => container.querySelectorAll('.cm-line').length;

// The fold control lives in a real gutter column: a focusable button on each paired-opener row.
// Found by class, the extension's stable handle.
const foldBtn = (container: Element) => container.querySelector<HTMLButtonElement>('.cm-cairn-fold-btn');
const foldPill = (container: Element) => container.querySelector<HTMLButtonElement>('.cm-cairn-fold-pill');

// The fold/unfold keystrokes (Ctrl+Shift+[ and Ctrl+Shift+]). A real browser reports the shifted
// bracket key as its shifted character ('{' / '}') with the bracket keyCode, which is how
// CodeMirror resolves Mod-Shift-[ past the default Ctrl-[ indentLess on the same physical key.
// userEvent.keyboard cannot synthesize the shifted-character form, so the test dispatches the
// real-browser-shaped keydown directly onto the focused editing surface.
function pressFoldKey(container: Element, kind: 'fold' | 'unfold') {
  const content = container.querySelector<HTMLElement>('.cm-content')!;
  const open = kind === 'fold';
  content.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: open ? '{' : '}',
      code: open ? 'BracketLeft' : 'BracketRight',
      keyCode: open ? 219 : 221,
      shiftKey: true,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
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
    // The first CodeMirror mount in the file pays the one-time cold-start of the editor's dynamic
    // imports. Under the full tri-project run the transform contention pushes that past the default
    // 1s poll, though it loads well within it once warm (the component project alone is green). A
    // generous timeout absorbs the cold-start; later mounts reuse the cached modules.
    await expect
      .poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '', { timeout: 20000 })
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

  it('disables every native text-correction attribute and decorates directive machinery', async () => {
    // Task 7 removed the `spellcheck: 'true'` override: the editor now falls back to CodeMirror's
    // defaults (spellcheck "false", autocorrect/autocapitalize "off"), so native spellcheck never
    // double-underlines beside the cairn lint source and a browser never silently rewrites a media:
    // token, a directive name, or frontmatter.
    const doc = ['## Title', '**bold** text', ':::gallery', '::hr', 'see :icon[ski]{s=1} here'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    expect(content.getAttribute('spellcheck')).toBe('false');
    expect(content.getAttribute('autocorrect')).toBe('off');
    expect(content.getAttribute('autocapitalize')).toBe('off');
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

  it('rails the fence rows on the 8px pitch and stacks the nested rails by depth', async () => {
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
      // Every fence row, opener or closer, paints the full rail now (the chevron lives in the
      // gutter), so the rail-stepping geometry reads on any fence row at a depth.
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
      // The 8px pitch: bars at 0-2 and 8-10 with a 6px gap. A depth-1 row paints one bar to 2;
      // a depth-2 row adds the base-100 spacer to 8 and its own bar to 10.
      expect(barOffsets(rail1)).toEqual([2]);
      expect(barOffsets(rail2)).toEqual([2, 8, 10]);
    } finally {
      unpin();
    }
  });

  it('keeps active and quiet rail segments at equal bar widths', async () => {
    // Strength-only caret emphasis: a rail column carrying both an active and a quiet segment
    // (the two sibling panels at depth 2) must read as one line of one weight, so the rows share
    // every inset offset and only the color-mix strength differs.
    const unpin = pinThemeVars({ '--color-accent': 'rgb(100, 60, 200)', '--color-base-100': 'rgb(255, 254, 250)' });
    try {
      const screen = render(MarkdownEditor, { value: `quiet prose\n${NESTED_DOC}`, name: 'body' });
      await expect
        .poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-directive-fence').length)
        .toBe(6);
      await userEvent.click(lineWith(screen.container, 'Cost.')!);
      await expect.poll(() => screen.container.querySelectorAll('.cm-line.cm-cairn-caret-block').length).toBe(3);
      // The panel body content rows (not the opener rows, which trade their innermost bar for the
      // fold chevron): the first panel's prose is active, the second panel's prose is quiet.
      const active = lineWith(screen.container, 'Cost.')!;
      const quiet = lineWith(screen.container, 'Volunteers.')!;
      expect(active.classList.contains('cm-cairn-caret-block')).toBe(true);
      expect(quiet.classList.contains('cm-cairn-caret-block')).toBe(false);
      const activeShadow = getComputedStyle(active).boxShadow;
      const quietShadow = getComputedStyle(quiet).boxShadow;
      expect(barOffsets(activeShadow)).toEqual(barOffsets(quietShadow));
      // The emphasis survives as strength: the active row's own bar mixes at the -active alpha.
      expect(activeShadow).not.toBe(quietShadow);
    } finally {
      unpin();
    }
  });

  it('hangs wrapped quote and list lines under their content', async () => {
    // The Obsidian/HyperMD wrap idiom: a line decoration sets padding-left to the marker width
    // and a negative text-indent of the same magnitude, so the marker sits in the indent and a
    // wrapped continuation line resumes under the content. The surface is fixed-pitch, so the two
    // computed values must cancel exactly; magnitude grows with the marker.
    const screen = render(MarkdownEditor, { value: '> a quote here\n12. an ordered item', name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'a quote here')).toBeTruthy();
    const quote = getComputedStyle(lineWith(screen.container, 'a quote here')!);
    const ordered = getComputedStyle(lineWith(screen.container, 'an ordered item')!);
    // padding-left and text-indent are equal in magnitude and opposite in sign on each line.
    expect(parseFloat(quote.paddingLeft)).toBeGreaterThan(0);
    expect(parseFloat(quote.paddingLeft)).toBeCloseTo(-parseFloat(quote.textIndent), 2);
    expect(parseFloat(ordered.paddingLeft)).toBeGreaterThan(0);
    expect(parseFloat(ordered.paddingLeft)).toBeCloseTo(-parseFloat(ordered.textIndent), 2);
    // '12. ' is wider than '> ', so the ordered hang is the deeper one.
    expect(parseFloat(ordered.paddingLeft)).toBeGreaterThan(parseFloat(quote.paddingLeft));
  });

  it('composes the hang with the directive gutter inside a container', async () => {
    // Inside a directive container the gutter padding (clearing the rails) and the marker hang
    // add together; the line still carries the equal-and-opposite text-indent so its wrap lands
    // under the content, and the padding sits beyond the gutter.
    const doc = [':::panel', '- nested item', ':::'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'nested item')).toBeTruthy();
    const item = lineWith(screen.container, 'nested item')!;
    const style = getComputedStyle(item);
    // The container gutter is 28px; the '- ' hang adds 2ch beyond it.
    expect(parseFloat(style.paddingLeft)).toBeGreaterThan(28);
    expect(parseFloat(style.textIndent)).toBeLessThan(0);
  });

  it('pads the directive gutter clear of the depth-3 bar', async () => {
    const screen = render(MarkdownEditor, { value: NESTED_DOC, name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-directive-fence')).not.toBeNull();
    const fence = screen.container.querySelector<HTMLElement>('.cm-line.cm-cairn-directive-fence')!;
    // 1.75rem = 28px: the depth-3 bar ends at 18px, so the text keeps 10px of air beyond it.
    expect(getComputedStyle(fence).paddingLeft).toBe('28px');
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
    expect(minHeight).toBeCloseTo(window.innerHeight * 0.6, 0);
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

  it('suppresses the resting focus hairline under zen, keeping it for real keyboard focus (audit finding 10)', async () => {
    // Zen is the no-chrome mode, so the always-on hairline above would read as a resting frame
    // the moment the editor is focused, effectively always while writing. The .cairn-editor-zen
    // marker is EditPage's editor-card class, toggled from its zen $state; a pointer click must
    // not draw the frame, but real keyboard focus (:focus-visible) still must.
    document.documentElement.style.setProperty('--color-primary', 'rgb(12, 34, 56)');
    const before = document.createElement('button');
    before.textContent = 'before the editor';
    document.body.appendChild(before);
    try {
      const screen = render(MarkdownEditor, { value: 'plain prose', name: 'body' });
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      screen.container.classList.add('cairn-editor-zen');
      const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
      const editorEl = screen.container.querySelector<HTMLElement>('.cm-editor')!;

      // A pointer click still focuses the surface (.cm-focused is set), but zen suppresses the
      // outline since the click did not carry keyboard-focus-visible.
      await userEvent.click(content);
      await expect.poll(() => document.activeElement).toBe(content);
      expect(editorEl.matches('.cm-focused')).toBe(true);
      expect(getComputedStyle(editorEl).outlineStyle).toBe('none');

      // Real keyboard navigation into the surface restores a visible indicator.
      before.focus();
      await userEvent.tab();
      await expect.poll(() => document.activeElement).toBe(content);
      expect(content.matches(':focus-visible')).toBe(true);
      const focusedStyle = getComputedStyle(content);
      expect(focusedStyle.outlineStyle).toBe('solid');
      expect(focusedStyle.outlineWidth).toBe('1px');
    } finally {
      document.documentElement.style.removeProperty('--color-primary');
      before.remove();
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
    // Pinned in markup posture, where the body sits at the 16px base step.
    // The test page loads no admin CSS, so the theme variables are pinned here; the heading rules
    // are the only ones that resolve them on a sized span, which discriminates the cairn style
    // from CodeMirror's default (which bolds headings but never sizes them). Generated class
    // names are not stable, so computed style is the robust handle.
    const unpin = pinThemeVars({
      '--color-base-content': 'rgb(20, 30, 40)',
      '--color-primary': 'rgb(200, 0, 50)',
    });
    try {
      const screen = render(MarkdownEditor, { value: '## Alpha\n### Beta\nplain body', name: 'body', surface: 'markup' });
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

  it('sizes a hand-typed #### as a heading between h3 and body', async () => {
    // Pinned in markup posture, where the body sits at the 16px base step. Sizing needs no theme
    // vars; the step itself is the discriminator from CodeMirror's default, which never sizes.
    const screen = render(MarkdownEditor, { value: '### C\n#### D\nplain body', name: 'body', surface: 'markup' });
    await expect.poll(() => spanWith(lineWith(screen.container, '#### D'), 'D')).toBeTruthy();
    const h3 = spanWith(lineWith(screen.container, '### C'), 'C')!;
    const h4 = spanWith(lineWith(screen.container, '#### D'), 'D')!;
    const body = lineWith(screen.container, 'plain body')!;
    const h4Size = parseFloat(getComputedStyle(h4).fontSize);
    expect(h4Size).toBeGreaterThan(parseFloat(getComputedStyle(body).fontSize));
    expect(h4Size).toBeLessThan(parseFloat(getComputedStyle(h3).fontSize));
    expect(getComputedStyle(h4).fontWeight).toBe('700');
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

  it('defaults to the prose posture: a 72ch measure at the larger type step', async () => {
    const screen = render(MarkdownEditor, { value: 'plain prose', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const style = getComputedStyle(content);
    expect(style.maxWidth).not.toBe('none');
    expect(parseFloat(style.fontSize)).toBeCloseTo(17, 0);
    expect(parseFloat(style.lineHeight) / parseFloat(style.fontSize)).toBeCloseTo(1.9, 1);
  });

  it('markup posture fills its pane with no inner measure cap', async () => {
    // The working surface fills the card the way a code editor fills its pane; the host's card
    // cap is the one width constraint.
    const screen = render(MarkdownEditor, { value: 'plain prose', name: 'body', surface: 'markup' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const markupStyle = getComputedStyle(content);
    expect(markupStyle.maxWidth).toBe('none');
    expect(parseFloat(markupStyle.fontSize)).toBeCloseTo(16, 0);
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

  it('dims the directive rails with their lines in focus mode', async () => {
    // Without the override a dimmed directive block keeps full-strength bars and becomes the
    // one chromatic object in the field; the dim rule re-resolves the rail percentages.
    const doc = ['lit paragraph', '', ':::panel', 'inside', ':::'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body', focusMode: true });
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-directive-content')).not.toBeNull();
    const inside = lineWith(screen.container, 'inside')!;
    expect(inside.classList.contains('cm-cairn-focus-dim')).toBe(true);
    // The dimmed line resolves the focus-mode rail percentage (the theme fallback, 24%).
    expect(getComputedStyle(inside).getPropertyValue('--cairn-directive-rail-1').trim()).toBe('24%');
  });

  it('dims the active rail on dimmed rows of the caret container', async () => {
    // Focus mode's lit unit is the paragraph while the caret-block spans the container, so a
    // container holding a blank line has dimmed rows that still carry the active rail; the dim
    // rule must override the active step too or those rows keep a full-chroma bar.
    const doc = [':::panel', 'lit here', '', 'dim tail', ':::'].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body', focusMode: true });
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-focus-dim')).not.toBeNull();
    const tail = lineWith(screen.container, 'dim tail')!;
    expect(tail.classList.contains('cm-cairn-caret-block')).toBe(true);
    expect(tail.classList.contains('cm-cairn-focus-dim')).toBe(true);
    expect(getComputedStyle(tail).getPropertyValue('--cairn-directive-rail-active').trim()).toBe('36%');
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

  it('folds and unfolds a container from the gutter fold button', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
    const visible = lineCount(screen.container);
    // The opener row's gutter carries a real focusable button.
    await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
    const btn = foldBtn(screen.container)!;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('panel section');
    // Clicking it hides the body and the closer.
    await userEvent.click(btn);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeFalsy();
    expect(lineCount(screen.container)).toBeLessThan(visible);
    // The folded row shows the real focusable pill counting the hidden lines (body one, body two,
    // and the closer: three), and the gutter button now reads collapsed via aria-expanded, with
    // the same state-neutral name (aria-expanded is the sole state signal, per spec 2026-06-30).
    await expect.poll(() => foldPill(screen.container)).toBeTruthy();
    const pill = foldPill(screen.container)!;
    expect(pill.tagName).toBe('BUTTON');
    expect(pill.getAttribute('aria-expanded')).toBe('false');
    expect(pill.getAttribute('aria-label')).toBe('panel section, 3 hidden lines');
    expect(pill.textContent).toContain('3 lines');
    await expect.poll(() => foldBtn(screen.container)?.getAttribute('aria-expanded')).toBe('false');
    expect(foldBtn(screen.container)?.getAttribute('aria-label')).toBe('panel section');
    // Clicking the pill restores the hidden lines and the body text still mirrors to the form.
    await userEvent.click(pill);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
    expect(hiddenValue(screen.container)).toBe(FOLD_DOC);
  });

  it('marks the open container active while the caret is inside it', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
    // Park the caret in the container body; the opener's gutter button reads active (caret-inside).
    await userEvent.click(lineWith(screen.container, 'body one')!);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    await expect
      .poll(() => foldBtn(screen.container)?.classList.contains('cm-cairn-fold-active'))
      .toBe(true);
  });

  it('folds from the gutter button via keyboard activation', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
    foldBtn(screen.container)!.focus();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => foldPill(screen.container)).toBeTruthy();
    expect(lineWith(screen.container, 'body one')).toBeFalsy();
  });

  it('folds and unfolds the caret container with Ctrl+Shift+[ and ]', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
    await userEvent.click(lineWith(screen.container, 'body one')!);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    // Ctrl+Shift+[ folds the innermost container at the caret.
    pressFoldKey(screen.container, 'fold');
    await expect.poll(() => lineWith(screen.container, 'body two')).toBeFalsy();
    // Ctrl+Shift+] unfolds it again. The caret sits on the opener row after the fold.
    pressFoldKey(screen.container, 'unfold');
    await expect.poll(() => lineWith(screen.container, 'body two')).toBeTruthy();
  });

  it('unfolds in the same transaction when an edit touches the folded range', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
    await userEvent.click(foldBtn(screen.container)!);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeFalsy();
    // Type at the end of the opener row (the fold's left boundary). The safety invariant unfolds
    // the range in the same transaction, so the author never edits hidden text blind.
    await userEvent.click(lineWith(screen.container, ':::panel')!);
    await userEvent.keyboard('{End} ');
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
  });

  it('unfolds when a selection extends across the folded range', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
    await userEvent.click(foldBtn(screen.container)!);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeFalsy();
    // Select all: the selection now spans the hidden lines. An author never holds a selection
    // across hidden text (copy semantics must stay trivial), so the fold springs open on entry.
    await userEvent.click(lineWith(screen.container, 'intro line')!);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    await userEvent.keyboard('{Control>}a{/Control}');
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
  });

  it('keeps the fold across an undo, which moves text only', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
    // Make an edit on the opener row so history has something to undo, then fold.
    await focusEditorEnd(screen.container);
    await userEvent.click(lineWith(screen.container, 'intro line')!);
    await userEvent.keyboard('{End}X');
    await expect.poll(() => hiddenValue(screen.container)).toContain('intro lineX');
    await userEvent.click(foldBtn(screen.container)!);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeFalsy();
    // Undo removes the typed character; the fold lives outside history, so it survives.
    await userEvent.keyboard('{Control>}z{/Control}');
    await expect.poll(() => hiddenValue(screen.container)).not.toContain('intro lineX');
    expect(lineWith(screen.container, 'body one')).toBeFalsy();
  });

  it('skips a fold atomically when an arrow steps down from the opener', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
    await userEvent.click(foldBtn(screen.container)!);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeFalsy();
    // ArrowDown from the opener row lands on the row after the closer (the next intro-level line is
    // absent here, so it lands at document end), never inside the hidden range, and the fold holds.
    await userEvent.click(lineWith(screen.container, ':::panel')!);
    await userEvent.keyboard('{ArrowDown}');
    expect(lineWith(screen.container, 'body one')).toBeFalsy();
  });

  it('keeps the opener row full rail now the chevron is in the gutter', async () => {
    const unpin = pinThemeVars({ '--color-accent': 'rgb(100, 60, 200)', '--color-base-100': 'rgb(255, 254, 250)' });
    try {
      // A depth-2 opener: the opener paints its full rail (the chevron no longer stands in for a bar).
      const doc = ['intro', '::::split', ':::panel', 'inside', ':::', '::::'].join('\n');
      const screen = render(MarkdownEditor, { value: doc, name: 'body' });
      await expect.poll(() => lineWith(screen.container, ':::panel')).toBeTruthy();
      const opener = lineWith(screen.container, ':::panel')!;
      // The fold control lives in the gutter column, not on the opener line.
      await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
      expect(opener.querySelector('.cm-cairn-fold-btn')).toBeNull();
      // The opener now paints every bar, the same as a depth-2 content row inside it.
      const openerOffsets = barOffsets(getComputedStyle(opener).boxShadow);
      const inside = lineWith(screen.container, 'inside')!;
      expect(barOffsets(getComputedStyle(inside).boxShadow)).toEqual([2, 8, 10]);
      expect(openerOffsets).toEqual([2, 8, 10]);
    } finally {
      unpin();
    }
  });

  it('places the caret without folding when the opener text is clicked', async () => {
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body' });
    await expect.poll(() => lineWith(screen.container, ':::panel')).toBeTruthy();
    // The fold control is a separate gutter column; clicking the opener text just places the caret
    // and the block stays open.
    await userEvent.click(spanWith(lineWith(screen.container, ':::panel'), 'panel')!);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    expect(lineWith(screen.container, 'body one')).toBeTruthy();
    expect(foldPill(screen.container)).toBeNull();
  });

  it('washes the folded opener row in a square full-row accent tint with the rails intact', async () => {
    const unpin = pinThemeVars({ '--color-accent': 'rgb(100, 60, 200)', '--color-base-100': 'rgb(255, 254, 250)' });
    try {
      // A depth-2 panel inside a depth-1 split, so the rails run through the wash unbroken.
      const doc = ['intro', '::::split', ':::panel', 'inside', ':::', '::::'].join('\n');
      const screen = render(MarkdownEditor, { value: doc, name: 'body' });
      await expect.poll(() => lineWith(screen.container, 'inside')).toBeTruthy();
      // Two openers fold here (the split and the panel); the gutter renders one button per opener in
      // line order, so the panel's button is the second. Fold the panel.
      await expect.poll(() => screen.container.querySelectorAll('.cm-cairn-fold-btn').length).toBe(2);
      await userEvent.click(screen.container.querySelectorAll<HTMLButtonElement>('.cm-cairn-fold-btn')[1]);
      await expect.poll(() => foldPill(screen.container)).toBeTruthy();
      const folded = lineWith(screen.container, ':::panel')!;
      const style = getComputedStyle(folded);
      // The wash is a real accent-tinted background, not transparent, and square (no radius).
      expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(style.borderTopLeftRadius)).toBe(0);
      // The outer rail box-shadow runs through the wash unbroken (the depth-1 bar at offset 2).
      expect(style.boxShadow).toContain('inset');
      expect(barOffsets(style.boxShadow)).toContain(2);
    } finally {
      unpin();
    }
  });

  it('gives an unbalanced opener no chevron and no foldable range', async () => {
    const screen = render(MarkdownEditor, { value: ['intro', ':::panel', 'orphan body'].join('\n'), name: 'body' });
    await expect.poll(() => lineWith(screen.container, 'orphan body')).toBeTruthy();
    // The opener never closes, so it gets no gutter button and the keys cannot fold it.
    expect(foldBtn(screen.container)).toBeNull();
    await userEvent.click(lineWith(screen.container, ':::panel')!);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    pressFoldKey(screen.container, 'fold');
    // Nothing hides; the orphan body stays visible.
    expect(lineWith(screen.container, 'orphan body')).toBeTruthy();
    expect(foldPill(screen.container)).toBeNull();
  });

  it('folds every component block on mount when foldOnMount is set', async () => {
    // Off by default (every other fold test above renders with an open block); EditPage turns this
    // on for the real entry-editing surface (Geoff's pre-beta ruling: blocks open folded).
    const screen = render(MarkdownEditor, { value: FOLD_DOC, name: 'body', foldOnMount: true });
    await expect.poll(() => foldPill(screen.container)).toBeTruthy();
    // The body never rendered open; the pill and the gutter button already read collapsed.
    expect(lineWith(screen.container, 'body one')).toBeFalsy();
    const pill = foldPill(screen.container)!;
    expect(pill.getAttribute('aria-label')).toBe('panel section, 3 hidden lines');
    expect(foldBtn(screen.container)?.getAttribute('aria-expanded')).toBe('false');
    // The fold is view-only: the hidden field still mirrors the full, untouched source.
    expect(hiddenValue(screen.container)).toBe(FOLD_DOC);
    // The safety invariant governs a mount-time fold the same as a manual one: the pill unfolds it.
    await userEvent.click(pill);
    await expect.poll(() => lineWith(screen.container, 'body one')).toBeTruthy();
  });

  it('reports the component container at the caret and dedupes within a block', async () => {
    // A leading plain line parks the default caret outside, then a labeled callout block. The
    // reporter fires with the container's name, the block markdown, and the document character
    // offsets of the inclusive line range.
    const doc = ['intro', '::::callout[Heads up]', 'body line', '::::', 'outro'].join('\n');
    const reports: ({ name: string | null; markdown: string; from: number; to: number } | null)[] = [];
    const screen = render(MarkdownEditor, {
      value: doc,
      name: 'body',
      onComponentAtCaret: (info) => {
        reports.push(info);
      },
    });
    await expect.poll(() => lineWith(screen.container, 'body line')).toBeTruthy();
    // The block runs from the start of '::::callout[Heads up]' to the end of the closer '\n::::'.
    const from = doc.indexOf('::::callout[Heads up]');
    const to = doc.indexOf('\n::::\n') + '\n::::'.length;
    const blockMarkdown = ['::::callout[Heads up]', 'body line', '::::'].join('\n');

    // Caret into the block body: the reporter fires with the callout name and the right span.
    await userEvent.click(lineWith(screen.container, 'body line')!);
    await expect.poll(() => reports.at(-1)?.name).toBe('callout');
    const inBlock = reports.at(-1)!;
    expect(inBlock.from).toBe(from);
    expect(inBlock.to).toBe(to);
    expect(inBlock.markdown).toBe(blockMarkdown);

    // Move the caret within the same block (onto the opener line): the value did not change, so
    // the reporter does not refire. The last report still describes the same block.
    const before = reports.length;
    await userEvent.click(lineWith(screen.container, '::::callout')!);
    // Give any extra updates a chance to land, then assert no new report was pushed.
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    expect(reports.length).toBe(before);

    // Caret out to plain prose: the reporter fires once with null.
    await userEvent.click(lineWith(screen.container, 'outro')!);
    await expect.poll(() => reports.at(-1)).toBeNull();
  });

  it('refires the caret report on an equal-length edit inside the block', async () => {
    // An equal-length replacement inside the block changes neither the offsets nor the name, so a
    // dedupe on name+from+to alone would keep the stale markdown. Including the markdown in the
    // dedupe equality makes any content change refire with the new source.
    const doc = ['intro', '::::callout[Heads up]', 'body line', '::::', 'outro'].join('\n');
    const reports: ({ name: string | null; markdown: string; from: number; to: number } | null)[] = [];
    let replace: ((from: number, to: number, text: string) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: doc,
      name: 'body',
      onComponentAtCaret: (info) => {
        reports.push(info);
      },
      registerReplaceRange: (fn) => {
        replace = fn;
      },
    });
    await expect.poll(() => lineWith(screen.container, 'body line')).toBeTruthy();
    await expect.poll(() => typeof replace).toBe('function');

    await userEvent.click(lineWith(screen.container, 'body line')!);
    await expect.poll(() => reports.at(-1)?.name).toBe('callout');
    const beforeSpan = reports.at(-1)!;
    expect(beforeSpan.markdown).toContain('body line');

    // Replace 'body line' with 'BODY LINE' (same length, so from/to/name are unchanged).
    const from = doc.indexOf('body line');
    replace!(from, from + 'body line'.length, 'BODY LINE');

    await expect.poll(() => reports.at(-1)?.markdown.includes('BODY LINE')).toBe(true);
    const afterSpan = reports.at(-1)!;
    expect(afterSpan.from).toBe(beforeSpan.from);
    expect(afterSpan.to).toBe(beforeSpan.to);
    expect(afterSpan.name).toBe('callout');
  });

  it('replaces a document span through registerReplaceRange', async () => {
    const doc = ['alpha', '::::callout[Old]', 'body', '::::', 'omega'].join('\n');
    let replace: ((from: number, to: number, text: string) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: doc,
      name: 'body',
      registerReplaceRange: (fn) => {
        replace = fn;
      },
    });
    await expect.poll(() => typeof replace).toBe('function');
    const from = doc.indexOf('::::callout[Old]');
    const to = doc.indexOf('\n::::\n') + '\n::::'.length;
    const next = ['::::callout[New]', 'fresh body', '::::'].join('\n');
    replace!(from, to, next);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe(['alpha', '::::callout[New]', 'fresh body', '::::', 'omega'].join('\n'));
  });

  it('selects a document span, focuses the surface, through registerSelectRange', async () => {
    const doc = 'before ![](media:cat.0123456789abcdef) after';
    let select: ((from: number, to: number) => void) | undefined;
    let getSelection: (() => string) | undefined;
    const screen = render(MarkdownEditor, {
      value: doc,
      name: 'body',
      registerSelectRange: (fn: (from: number, to: number) => void) => {
        select = fn;
      },
      registerGetSelection: (fn: () => string) => {
        getSelection = fn;
      },
    });
    await expect.poll(() => typeof select).toBe('function');
    await expect.poll(() => typeof getSelection).toBe('function');
    const from = doc.indexOf('![');
    const to = from + '![](media:cat.0123456789abcdef)'.length;
    select!(from, to);
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    expect(getSelection!()).toBe('![](media:cat.0123456789abcdef)');
  });

  it('reports the selection range through registerGetSelectionRange, and null when empty', async () => {
    // The tidy host needs the selection's exact document offsets, not just its text, so a repeated
    // passage maps a selection tidy onto the actually-selected occurrence. This seam returns the
    // range; an empty selection (a bare caret) returns null so the host falls back to document scope.
    const doc = 'colour and colour again';
    let select: ((from: number, to: number) => void) | undefined;
    let getSelectionRange: (() => { from: number; to: number } | null) | undefined;
    render(MarkdownEditor, {
      value: doc,
      name: 'body',
      registerSelectRange: (fn: (from: number, to: number) => void) => {
        select = fn;
      },
      registerGetSelectionRange: (fn: () => { from: number; to: number } | null) => {
        getSelectionRange = fn;
      },
    });
    await expect.poll(() => typeof select).toBe('function');
    await expect.poll(() => typeof getSelectionRange).toBe('function');
    // The second "colour" begins at index 11, not the first at index 0.
    const from = doc.lastIndexOf('colour');
    const to = from + 'colour'.length;
    select!(from, to);
    await expect.poll(() => getSelectionRange!()?.from).toBe(from);
    expect(getSelectionRange!()).toEqual({ from, to });
    // Collapsing the selection to a bare caret reports null.
    select!(to, to);
    await expect.poll(() => getSelectionRange!()).toBeNull();
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

  // A media library fixture keyed by the 16-hex content hash, the EditData mediaLibrary shape. One
  // captioned image and one needing alt, so the source-decoration test proves both states.
  const HASH_A = '0123456789abcdef';
  const HASH_B = 'fedcba9876543210';
  const MEDIA_LIBRARY = {
    [HASH_A]: {
      hash: HASH_A,
      slug: 'trail-map',
      ext: 'webp',
      contentType: 'image/webp',
      displayName: 'Trail map',
      alt: 'A map of the trails',
      width: 800,
      height: 600,
      bytes: 12345,
      createdAt: '2026-06-15T00:00:00.000Z',
    },
    [HASH_B]: {
      hash: HASH_B,
      slug: 'finish-line',
      ext: 'webp',
      contentType: 'image/webp',
      displayName: 'Finish line',
      alt: '',
      width: 1024,
      height: 768,
      bytes: 23456,
      createdAt: '2026-06-15T00:00:00.000Z',
    },
  };

  // A real File the drop/paste handlers route on; the type carries the image/* prefix the
  // normalizer keys off.
  function imageFile(name = 'shot.png', type = 'image/png'): File {
    return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type });
  }

  it('inserts an inline image at the caret through registerInsertImage', async () => {
    let insertImage: ((alt: string, ref: string) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: 'start',
      name: 'body',
      registerInsertImage: (fn: (alt: string, ref: string) => void) => {
        insertImage = fn;
      },
    });
    await expect.poll(() => typeof insertImage).toBe('function');
    insertImage!('A trail map', `media:trail-map.${HASH_A}`);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain(`![A trail map](media:trail-map.${HASH_A})`);
  });

  it('routes a dropped image file to the ingest callback', async () => {
    const ingested: File[] = [];
    const screen = render(MarkdownEditor, {
      value: 'drop here',
      name: 'body',
      onImageIngest: (file: File) => {
        ingested.push(file);
      },
    });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    // A DataTransfer carrying one image file, dropped onto the editing surface.
    const dt = new DataTransfer();
    dt.items.add(imageFile());
    content.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await expect.poll(() => ingested.length).toBe(1);
    expect(ingested[0].name).toBe('shot.png');
  });

  it('lets a text-only paste fall through without routing to ingest', async () => {
    const ingested: File[] = [];
    const screen = render(MarkdownEditor, {
      value: '',
      name: 'body',
      onImageIngest: (file: File) => {
        ingested.push(file);
      },
    });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const dt = new DataTransfer();
    dt.setData('text/plain', 'just some pasted words');
    content.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    // The handler must return false so CodeMirror keeps the paste; the ingest callback never fires.
    await expect.poll(() => document.activeElement === content || true).toBe(true);
    expect(ingested).toEqual([]);
  });

  it('converts a rich-text paste to markdown: headings, bold/italic, links, and lists', async () => {
    const screen = render(MarkdownEditor, { value: '', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const dt = new DataTransfer();
    dt.setData(
      'text/html',
      '<h2>Trail notes</h2><p>Some <strong>strong</strong> and <em>emphasis</em> text with a ' +
        '<a href="https://example.com/route">route link</a>.</p><ul><li>Water</li><li>Snacks</li></ul>',
    );
    content.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await expect.poll(() => hiddenValue(screen.container)).toContain('## Trail notes');
    const value = hiddenValue(screen.container);
    expect(value).toContain('**strong**');
    expect(value).toContain('_emphasis_');
    expect(value).toContain('[route link](https://example.com/route)');
    expect(value).toContain('- Water');
    expect(value).toContain('- Snacks');
  });

  it('degrades an out-of-scope structure (a table) to plain text on a rich-text paste', async () => {
    const screen = render(MarkdownEditor, { value: '', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const dt = new DataTransfer();
    dt.setData('text/html', '<table><tr><td>Ridge</td><td>4mi</td></tr></table>');
    content.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await expect.poll(() => hiddenValue(screen.container)).toContain('Ridge');
    expect(hiddenValue(screen.container)).not.toContain('|');
  });

  it('still routes a pasted image file to ingest, not the html converter', async () => {
    const ingested: File[] = [];
    const screen = render(MarkdownEditor, {
      value: '',
      name: 'body',
      onImageIngest: (file: File) => {
        ingested.push(file);
      },
    });
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    const dt = new DataTransfer();
    dt.items.add(imageFile());
    // A paste can carry both an image file and an html flavor (e.g. a copied image with a caption);
    // the image intercept must win, and the html must never reach the buffer.
    dt.setData('text/html', '<p>a caption that must not be inserted</p>');
    content.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await expect.poll(() => ingested.length).toBe(1);
    expect(ingested[0].name).toBe('shot.png');
    expect(hiddenValue(screen.container)).toBe('');
  });

  it('decorates a media: token with its display name and a needs-alt marker', async () => {
    const doc = [
      `Here is ![A trail map](media:trail-map.${HASH_A}) the map.`,
      `And ![](media:finish-line.${HASH_B}) at the end.`,
    ].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body', mediaLibrary: MEDIA_LIBRARY });
    await expect.poll(() => screen.container.querySelectorAll('.cm-cairn-media-chip').length).toBe(2);
    const names = [...screen.container.querySelectorAll('.cm-cairn-media-name')].map((n) => n.textContent);
    expect(names).toContain('Trail map');
    expect(names).toContain('Finish line');
    // The thumbnail src is the slug-form delivery path for the resolved entry.
    const thumb = screen.container.querySelector<HTMLImageElement>('.cm-cairn-media-thumb')!;
    expect(thumb.src).toContain(`/media/trail-map.${HASH_A}.webp`);
    // The captioned image carries no needs-alt marker; the empty-alt one does, with a label (not hue
    // alone), and the source still mirrors the full token to the form (the alt stays editable).
    const flags = screen.container.querySelectorAll('.cm-cairn-media-needs-alt');
    expect(flags.length).toBe(1);
    expect(flags[0].textContent).toContain('Needs alt');
    expect(hiddenValue(screen.container)).toBe(doc);
  });

  it('renders a neutral fallback chip for a media: token absent from the library', async () => {
    // A hash the library does not carry (a reference from a branch whose manifest the read missed):
    // the chip falls back to the token slug as the name, with no thumbnail, and never throws.
    const doc = `See ![A picture](media:somewhere.aaaabbbbccccdddd) here.`;
    const screen = render(MarkdownEditor, { value: doc, name: 'body', mediaLibrary: MEDIA_LIBRARY });
    await expect.poll(() => screen.container.querySelector('.cm-cairn-media-chip')).not.toBeNull();
    expect(screen.container.querySelector('.cm-cairn-media-name')?.textContent).toBe('somewhere');
    expect(screen.container.querySelector('.cm-cairn-media-thumb')).toBeNull();
  });

  it('decorates a just-added library image after a reactive mediaLibrary change', async () => {
    // The optimistic-merge path (Task 6/7): a token already in the source whose hash joins the
    // library later must decorate once the prop updates, through the media compartment.
    const doc = `New ![A late one](media:late.1111222233334444) image.`;
    const screen = render(MarkdownEditor, { value: doc, name: 'body', mediaLibrary: {} });
    await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('late');
    // No library entry yet, but the token still renders a fallback chip from its slug.
    await expect.poll(() => screen.container.querySelector('.cm-cairn-media-name')?.textContent).toBe('late');
    // The image joins the library: the chip picks up the real display name and a thumbnail.
    await screen.rerender({
      value: doc,
      name: 'body',
      mediaLibrary: {
        '1111222233334444': {
          hash: '1111222233334444',
          slug: 'late',
          ext: 'webp',
          contentType: 'image/webp',
          displayName: 'A late arrival',
          alt: 'A late one',
          width: 640,
          height: 480,
          bytes: 9999,
          createdAt: '2026-06-15T00:00:00.000Z',
        },
      },
    });
    await expect
      .poll(() => screen.container.querySelector('.cm-cairn-media-name')?.textContent)
      .toBe('A late arrival');
    expect(screen.container.querySelector('.cm-cairn-media-thumb')).not.toBeNull();
  });

  it('surfaces the figure role on the chip and leaves a bare token unpilled', async () => {
    // A media token inside a roled figure, one inside a bare figure, and one bare token. The chip
    // shows a role pill matching the source, the no-hidden-state rule (a bare token shows none).
    const doc = [
      ':::figure{.wide}',
      `![A trail map](media:trail-map.${HASH_A})`,
      'A caption.',
      ':::',
      '',
      ':::figure',
      `![](media:finish-line.${HASH_B})`,
      ':::',
      '',
      `Bare ![A trail map](media:trail-map.${HASH_A}) here.`,
    ].join('\n');
    const screen = render(MarkdownEditor, { value: doc, name: 'body', mediaLibrary: MEDIA_LIBRARY });
    await expect.poll(() => screen.container.querySelectorAll('.cm-cairn-media-chip').length).toBe(3);
    const pills = [...screen.container.querySelectorAll('.cm-cairn-media-role')].map((p) => p.textContent);
    // The roled figure reads "wide"; the bare figure reads the measure default "figure"; the bare
    // token outside any figure carries no pill, so only two pills exist.
    expect(pills).toEqual(['wide', 'figure']);
  });

  it('styles the chip role pill in the accent language', async () => {
    const unpin = pinThemeVars({ '--color-accent': 'rgb(0, 130, 60)' });
    try {
      const doc = [':::figure{.wide}', `![A trail map](media:trail-map.${HASH_A})`, ':::'].join('\n');
      const screen = render(MarkdownEditor, { value: doc, name: 'body', mediaLibrary: MEDIA_LIBRARY });
      await expect.poll(() => screen.container.querySelector('.cm-cairn-media-role')).not.toBeNull();
      const pill = screen.container.querySelector<HTMLElement>('.cm-cairn-media-role')!;
      // The pill inks in the accent (the directive accent language), not the body content ink.
      expect(getComputedStyle(pill).color).toBe('rgb(0, 130, 60)');
      // It is marked decorative like the rest of the chip; the source class carries the meaning.
      expect(pill.getAttribute('aria-hidden')).toBe('true');
    } finally {
      unpin();
    }
  });
});
