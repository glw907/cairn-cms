import { describe, it, expect, afterEach } from 'vitest';
import { renderDiagnosticMessage } from '../../lib/components/editor-suggestion-popover.js';

// Direct DOM tests for the popover's message renderer (see chrome-guard.test.ts for the same
// plain-function-over-real-DOM idiom). The full suggestion-popover.test.ts exercises the popover
// through a mounted MarkdownEditor; this file isolates the backtick-to-<code> parsing, which both
// spellcheck.ts and objective-errors.ts diagnostics rely on (both quote a single flagged word or
// token in backticks).

function host(): HTMLElement {
  const el = document.createElement('p');
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('renderDiagnosticMessage', () => {
  it('turns a backtick-quoted word into a <code> element carrying the word as its text', () => {
    const el = host();
    renderDiagnosticMessage(el, '`teh` may be misspelled.');
    const code = el.querySelector('code');
    expect(code).toBeTruthy();
    expect(code!.textContent).toBe('teh');
  });

  it('preserves the surrounding text as sibling text content', () => {
    const el = host();
    renderDiagnosticMessage(el, '`teh` may be misspelled.');
    expect(el.textContent).toBe('teh may be misspelled.');
    expect(el.querySelectorAll('code').length).toBe(1);
  });

  it('renders a message with no backticks unchanged, as plain text', () => {
    const el = host();
    renderDiagnosticMessage(el, 'Repeated space.');
    expect(el.textContent).toBe('Repeated space.');
    expect(el.querySelector('code')).toBeNull();
  });

  it('falls back to plain text on an unbalanced backtick', () => {
    const el = host();
    renderDiagnosticMessage(el, 'a stray ` backtick with no partner');
    expect(el.textContent).toBe('a stray ` backtick with no partner');
    expect(el.querySelector('code')).toBeNull();
  });

  it('falls back to plain text on an empty quoted span', () => {
    const el = host();
    renderDiagnosticMessage(el, 'an empty `` span');
    expect(el.textContent).toBe('an empty `` span');
    expect(el.querySelector('code')).toBeNull();
  });

  it('never uses innerHTML: an author-typed word with markup-like characters stays inert text', () => {
    const el = host();
    renderDiagnosticMessage(el, 'Doubled word `<b>hi</b>`.');
    const code = el.querySelector('code');
    expect(code).toBeTruthy();
    expect(code!.textContent).toBe('<b>hi</b>');
    expect(code!.querySelector('b')).toBeNull();
  });
});
