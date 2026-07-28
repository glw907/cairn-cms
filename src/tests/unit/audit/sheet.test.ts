import { describe, it, expect } from 'vitest';
import { parseSheet } from '../../../lib/audit/sheet.js';

describe('parseSheet', () => {
  it('resolves a class token to its declarations', () => {
    const sheet = parseSheet('.type-body { font-size: var(--cairn-type-body); line-height: 1.25rem }');
    expect(sheet.declarations('type-body')).toEqual([
      {
        property: 'font-size',
        value: 'var(--cairn-type-body)',
        selector: '.type-body',
        conditions: [],
      },
      { property: 'line-height', value: '1.25rem', selector: '.type-body', conditions: [] },
    ]);
  });

  // The miscount this initiative has already made twice: `text-base` is the size utility and
  // `text-base-content` is the daisyUI color utility. A word-boundary substring match reads one
  // as the other, so class-token matching is exact or it is wrong.
  it('matches a class token exactly, never as a prefix of a longer token', () => {
    const sheet = parseSheet(
      '.text-base { font-size: 1rem } .text-base-content { color: var(--color-base-content) }'
    );
    expect(sheet.declarations('text-base')).toEqual([
      { property: 'font-size', value: '1rem', selector: '.text-base', conditions: [] },
    ]);
    expect(sheet.declarations('text-base-content')).toEqual([
      {
        property: 'color',
        value: 'var(--color-base-content)',
        selector: '.text-base-content',
        conditions: [],
      },
    ]);
  });

  it('reports a class the sheet never defines as absent', () => {
    const sheet = parseSheet('.text-base-content { color: red }');
    expect(sheet.has('text-base-content')).toBe(true);
    expect(sheet.has('text-base')).toBe(false);
    expect(sheet.declarations('text-base')).toEqual([]);
  });

  it('unescapes a selector so the logical class name matches the markup token', () => {
    const sheet = parseSheet(
      '.sm\\:table-cell { display: table-cell } .text-\\[0\\.75rem\\] { font-size: .75rem } .text-base-content\\/60 { color: red }'
    );
    expect(sheet.has('sm:table-cell')).toBe(true);
    expect(sheet.has('text-[0.75rem]')).toBe(true);
    expect(sheet.has('text-base-content/60')).toBe(true);
    expect(sheet.has('text-base-content')).toBe(false);
  });

  it('reads a class out of a compound and scoped selector', () => {
    const sheet = parseSheet(
      ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) .btn.btn-primary:hover { color: red }"
    );
    expect(sheet.has('btn')).toBe(true);
    expect(sheet.has('btn-primary')).toBe(true);
    expect(sheet.has('cairn-admin')).toBe(false);
  });

  it('records the enclosing at-rule conditions of a declaration', () => {
    const sheet = parseSheet(
      '@layer utilities { @media (min-width: 40rem) { .md\\:flex { display: flex } } }'
    );
    expect(sheet.declarations('md:flex')).toEqual([
      {
        property: 'display',
        value: 'flex',
        selector: '.md\\:flex',
        conditions: ['@layer utilities', '@media (min-width: 40rem)'],
      },
    ]);
  });

  it('never registers a class a selector only negates', () => {
    const sheet = parseSheet('.menu li:not(.menu-title, .disabled) { padding: 1px }');
    expect(sheet.has('menu')).toBe(true);
    expect(sheet.has('menu-title')).toBe(false);
    expect(sheet.has('disabled')).toBe(false);
  });

  // daisyUI's own `.menu` rules exclude `.disabled` and `.menu-title` items from hover/focus
  // purely through `:not(...)` negation, with no rule anywhere declaring either class
  // positively. `mentions` is the broader existence check a rule reads to recognize this as real,
  // working daisyUI API rather than an uncompiled class.
  it('mentions a class a selector only negates, unlike has', () => {
    const sheet = parseSheet('.menu li:not(.menu-title, .disabled) { padding: 1px }');
    expect(sheet.mentions('disabled')).toBe(true);
    expect(sheet.mentions('menu-title')).toBe(true);
    expect(sheet.mentions('menu')).toBe(true);
    expect(sheet.mentions('nowhere')).toBe(false);
  });

  it('reads through comments and quoted content without losing a rule', () => {
    const sheet = parseSheet(
      '/* .commented-out { color: red } */ .real::after { content: "} .fake {" } .after { color: blue }'
    );
    expect(sheet.has('commented-out')).toBe(false);
    expect(sheet.has('fake')).toBe(false);
    expect(sheet.has('real')).toBe(true);
    expect(sheet.declarations('after')).toEqual([
      { property: 'color', value: 'blue', selector: '.after', conditions: [] },
    ]);
  });

  it('survives keyframes and property at-rules without inventing class names', () => {
    const sheet = parseSheet(
      '@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } @property --tw-leading { syntax: "*"; inherits: false } .spin { animation: spin 1s }'
    );
    expect(sheet.has('spin')).toBe(true);
    expect(sheet.declarations('spin')).toEqual([
      { property: 'animation', value: 'spin 1s', selector: '.spin', conditions: [] },
    ]);
  });

  it('keeps a declaration value that carries its own colons and parentheses intact', () => {
    const sheet = parseSheet(
      '.bg-tile { background: url("data:image/svg+xml;base64,AA"); color: color-mix(in oklab, red 50%, blue) }'
    );
    expect(sheet.declarations('bg-tile').map((d) => d.value)).toEqual([
      'url("data:image/svg+xml;base64,AA")',
      'color-mix(in oklab, red 50%, blue)',
    ]);
  });
});
