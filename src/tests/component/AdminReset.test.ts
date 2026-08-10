import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// The shipped sheet, the same artifact the CairnAdminShell.test.ts palette suite loads: this test
// must prove the reset that reaches a consumer, not the source file, so it loads the built dist
// output rather than compiling cairn-admin.css itself.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

// Design ratchet Task 1 (closes findings 1 and 6): the packaged admin sheet ships no user-agent
// reset, so a bare textarea renders UA monospace, a native <dialog> carries Chrome's UA border
// frame, and daisyUI's own .list container keeps the UA's 40px bullet gutter. This suite proves
// the new `base` cascade layer fixes each one against the REAL compiled sheet. D2 items 1 and 2
// (2026-07-31) narrowed the reset: the dialog border rule is scoped to dialog.modal so a bare
// consumer <dialog> keeps its UA border (WCAG 1.4.11), and the .list rule dropped list-style:
// none since it strips list semantics from the accessibility tree in WebKit/VoiceOver (WCAG
// 1.3.1) and was never load-bearing (.list-row's own display: grid already suppresses markers).
describe('the admin sheet base reset layer', () => {
  let sheet: HTMLStyleElement;

  beforeAll(() => {
    // documentElement stands in for the admin's data-theme wrapper: any element carrying the
    // attribute matches the scoped selectors, and this lets bare elements appended to
    // document.body sit inside the scope with no extra wrapper markup.
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    sheet = document.createElement('style');
    sheet.textContent = compiledAdminCss;
    document.head.appendChild(sheet);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    sheet.remove();
  });

  it('gives a bare textarea the same first font-family as the theme root', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const rootFamily = getComputedStyle(document.documentElement).fontFamily.split(',')[0].trim();
    const textareaFamily = getComputedStyle(textarea).fontFamily.split(',')[0].trim();
    expect(textareaFamily).toBe(rootFamily);
    textarea.remove();
  });

  it('kills the UA border frame on a native dialog.modal', () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    document.body.appendChild(dialog);
    const style = getComputedStyle(dialog);
    const hasNoBorder = style.borderStyle === 'none' || parseFloat(style.borderTopWidth) === 0;
    expect(hasNoBorder).toBe(true);
    dialog.remove();
  });

  // D2 item 2: a bare consumer <dialog> with no .modal class (a custom admin route's own
  // dialog, never one of cairn's own) must keep the UA border, since cairn's modal shape
  // (.modal-box) carries its own border in the components layer and a bare dialog has nothing
  // else to draw one (WCAG 1.4.11).
  it('leaves the UA border frame on a bare dialog with no .modal class', () => {
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    const style = getComputedStyle(dialog);
    expect(style.borderStyle).not.toBe('none');
    expect(parseFloat(style.borderTopWidth)).toBeGreaterThan(0);
    dialog.remove();
  });

  it('drops the UA bullet gutter on a ul.list container', () => {
    const list = document.createElement('ul');
    list.className = 'list';
    document.body.appendChild(list);
    expect(getComputedStyle(list).paddingInlineStart).toBe('0px');
    list.remove();
  });

  // D2 item 1: list-style: none was dropped from the .list reset since it strips list
  // semantics from the accessibility tree in WebKit/VoiceOver (WCAG 1.3.1). The component
  // project runs real headless Chromium (@vitest/browser-playwright), so this asserts the
  // rendered marker box directly: a real ::marker pseudo-element and a list-item principal
  // box, rather than only the inherited list-style-type value.
  it('renders a real marker box on a list item inside a ul.list container', () => {
    const list = document.createElement('ul');
    list.className = 'list';
    const item = document.createElement('li');
    item.textContent = 'Item';
    list.appendChild(item);
    document.body.appendChild(list);

    expect(getComputedStyle(item, '::marker').display).toBe('inline-block');
    expect(getComputedStyle(item).display).toBe('list-item');

    list.remove();
  });

  it('keeps a textarea.textarea vertical-only resizable', () => {
    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    document.body.appendChild(textarea);
    expect(getComputedStyle(textarea).resize).toBe('vertical');
    textarea.remove();
  });

  // Fix A2 item (5): scripts/build/admin-css.input.css declares the layer order up front, but a bare
  // `@layer name, name, ...;` ordering statement with no rules never survives the
  // Tailwind/lightningcss pipeline, so the statement is dropped and precedence then rides on
  // lightningcss's own emission order for the populated blocks. That order also includes an
  // undeclared `@layer properties { ... }` block (Tailwind's `--tw-*` fallback initializers), which
  // registers after every declared layer and would outrank `utilities`. build-admin-css.mjs
  // re-declares the full order explicitly, `properties` first, pinning `properties` ahead of
  // `utilities` regardless of file order.
  it('ships an explicit properties/theme/base/components/utilities layer order, first in the sheet', () => {
    expect(compiledAdminCss.startsWith('@layer properties, theme, base, components, utilities;')).toBe(
      true,
    );
  });
});
