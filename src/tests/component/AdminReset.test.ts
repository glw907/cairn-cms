import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// The shipped sheet, the same artifact the CairnAdminShell.test.ts palette suite loads: this test
// must prove the reset that reaches a consumer, not the source file, so it loads the built dist
// output rather than compiling cairn-admin.css itself.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

// Design ratchet Task 1 (closes findings 1 and 6): the packaged admin sheet ships no user-agent
// reset, so a bare textarea renders UA monospace, a native <dialog> carries Chrome's UA border
// frame, and daisyUI's own .list container keeps the UA's 40px bullet gutter. This suite proves
// the new `base` cascade layer fixes each one against the REAL compiled sheet.
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

  it('drops the UA bullet gutter on a ul.list container', () => {
    const list = document.createElement('ul');
    list.className = 'list';
    document.body.appendChild(list);
    expect(getComputedStyle(list).paddingInlineStart).toBe('0px');
    list.remove();
  });

  it('keeps a textarea.textarea vertical-only resizable', () => {
    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    document.body.appendChild(textarea);
    expect(getComputedStyle(textarea).resize).toBe('vertical');
    textarea.remove();
  });
});
