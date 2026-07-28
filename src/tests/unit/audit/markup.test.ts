import { describe, it, expect } from 'vitest';
import { lineAt, parseComponent } from '../../../lib/audit/markup.js';

/** The class token values a source yields, in document order. */
function tokens(source: string): string[] {
  return parseComponent('Fixture.svelte', source).classTokens.map((t) => t.value);
}

describe('parseComponent class tokens', () => {
  it('reads a double-quoted class attribute', () => {
    expect(tokens('<div class="card gap-section"></div>')).toEqual(['card', 'gap-section']);
  });

  // The first idiom the adversarial review proved the regex substrate fails open on: the repo
  // gate's `class\s*=\s*"([^"]*)"` never sees a single-quoted attribute at all.
  it('reads a single-quoted class attribute', () => {
    expect(tokens("<div class='card gap-section'></div>")).toEqual(['card', 'gap-section']);
  });

  it('reads array classes, taking the value side of a guard and never the condition', () => {
    expect(tokens('<div class={[\'btn\', open && \'btn-active\']}></div>')).toEqual([
      'btn',
      'btn-active',
    ]);
  });

  it('reads object classes by their keys, quoted or bare, and never their conditions', () => {
    const source = "<div class={{ 'btn-active': isActive, disabled: locked }}></div>";
    expect(tokens(source)).toEqual(['btn-active', 'disabled']);
  });

  it('reads the complete segments of a template literal', () => {
    expect(tokens('<div class={`btn ${variant}`}></div>')).toEqual(['btn']);
  });

  // A segment glued to an interpolation is half a class name, never a class name. Reporting
  // `text-` as a missing class would be a false positive on every dynamic utility in the tree.
  it('drops a template-literal segment glued to an interpolation', () => {
    expect(tokens('<div class={`text-${size} btn`}></div>')).toEqual(['btn']);
  });

  // The interpolation half of a template literal used to contribute nothing at all, so the same
  // expression audited in a mixed attribute (`class="card {...}"`) and silently escaped inside a
  // template literal. Both forms name the same classes and both are read.
  it('reads a template-literal interpolation the way it reads a mixed attribute', () => {
    const source = "<div class={`card ${big ? 'text-[30px]' : 'p-[13px]'}`}></div>";
    expect(tokens(source)).toEqual(['card', 'text-[30px]', 'p-[13px]']);
  });

  it('drops an interpolation glued to a neighbouring segment, the way it drops a glued segment', () => {
    const source = '<div class={`text-${size}px btn`}></div>';
    expect(tokens(source)).toEqual(['btn']);
  });

  // The script half of the substrate. A class named in the component's own script is as local and
  // as resolvable as one written in the attribute; leaving it unread let a class that compiles
  // nowhere ship inside a helper string with every markup rule reading the file as clean.
  it('resolves a class string a top-level const declares', () => {
    const source = [
      '<script>',
      "  const cardClass = 'card p-[13px]';",
      '</script>',
      '<div class={cardClass}></div>',
    ].join('\n');
    expect(tokens(source)).toEqual(['card', 'p-[13px]']);
  });

  it('resolves the strings a top-level helper function returns', () => {
    const source = [
      '<script>',
      '  function ftrToggleClass(pressed) {',
      "    return `ftr-toggle ${pressed ? 'text-[30px]' : 'text-muted'}`;",
      '  }',
      '</script>',
      '<button class={ftrToggleClass(true)}></button>',
    ].join('\n');
    expect(tokens(source)).toEqual(['ftr-toggle', 'text-[30px]', 'text-muted']);
  });

  it('resolves a $derived.by binding through its own returns', () => {
    const source = [
      '<script>',
      '  const statusBadge = $derived.by(() => {',
      "    if (status === 'Edited') return 'badge-warning';",
      "    return 'badge-ghost';",
      '  });',
      '</script>',
      '<span class="badge badge-sm {statusBadge}">x</span>',
    ].join('\n');
    expect(tokens(source)).toEqual(['badge', 'badge-sm', 'badge-warning', 'badge-ghost']);
  });

  it('counts one script string once however many elements use it', () => {
    const source = [
      '<script>',
      "  const cardClass = 'card';",
      '</script>',
      '<div class={cardClass}></div>',
      '<div class={cardClass}></div>',
    ].join('\n');
    expect(tokens(source)).toEqual(['card']);
  });

  it('never resolves a name the file does not declare, or one a parameter shadows', () => {
    const source = [
      '<script>',
      "  const cls = 'outer-class';",
      '  function shadowed(cls) { return cls; }',
      '  let { incoming } = $props();',
      '</script>',
      '<div class={shadowed(incoming)}></div>',
      '<div class={incoming}></div>',
    ].join('\n');
    expect(tokens(source)).toEqual([]);
  });

  it('does not loop on a binding that refers to itself', () => {
    const source = [
      '<script>',
      '  const a = b;',
      '  const b = a;',
      '</script>',
      '<div class={a}></div>',
    ].join('\n');
    expect(tokens(source)).toEqual([]);
  });

  // A spread whose object literal is written right here names its classes in this file; only a
  // spread of a value from somewhere else (`{...rest}`) is genuinely unresolvable.
  it('reads the class property of an inline spread object', () => {
    const source = "<div {...{ class: 'p-[13px] cairn-nonexistent-class' }}></div>";
    expect(tokens(source)).toEqual(['p-[13px]', 'cairn-nonexistent-class']);
  });

  it('reads a class: directive name', () => {
    expect(tokens('<div class="dropdown" class:dropdown-open={open}></div>')).toEqual([
      'dropdown',
      'dropdown-open',
    ]);
  });

  it('reads both branches of a conditional and never its comparison operand', () => {
    const source = `<span class={size === 'xs' ? 'badge-xs' : 'badge-sm'}></span>`;
    expect(tokens(source)).toEqual(['badge-xs', 'badge-sm']);
  });

  it('reads the literal parts of a mixed attribute', () => {
    const source = `<div class="card {open ? 'is-open' : ''}"></div>`;
    expect(tokens(source)).toEqual(['card', 'is-open']);
  });

  // The prose false positive the regex substrate produces: text content and comments are not
  // markup class attributes, and nothing in them is a class token.
  it('never reads prose as a class token', () => {
    const source = [
      '<!-- the white background reads wrong against the stone -->',
      '<p>the white background is not a class</p>',
      '<script>',
      "  // the white background note lives here too",
      "  const label = 'the white background';",
      '</script>',
    ].join('\n');
    expect(tokens(source)).toEqual([]);
  });

  it('reads class attributes nested inside blocks and on components', () => {
    const source = '{#if open}<Panel class="card"><b class="type-label">x</b></Panel>{/if}';
    expect(tokens(source)).toEqual(['card', 'type-label']);
  });

  it('carries each token position, so a finding can print file:line', () => {
    const source = '<div>\n  <span class="badge badge-neutral"></span>\n</div>';
    const [badge, neutral] = parseComponent('Fixture.svelte', source).classTokens;
    expect(badge.line).toBe(2);
    expect(source.slice(badge.start, badge.end)).toBe('badge');
    expect(source.slice(neutral.start, neutral.end)).toBe('badge-neutral');
  });

  it('carries the position of a token that came from an expression', () => {
    const source = "<div class={['btn']}></div>";
    const [token] = parseComponent('Fixture.svelte', source).classTokens;
    expect(source.slice(token.start, token.end)).toBe('btn');
  });

  it('carries the position of a class: directive name', () => {
    const source = '<div class:dropdown-open={open}></div>';
    const [token] = parseComponent('Fixture.svelte', source).classTokens;
    expect(source.slice(token.start, token.end)).toBe('dropdown-open');
  });
});

describe('parseComponent nodes', () => {
  // The structure Task 8's suppression resolution runs on. Cairn's EditPage document title is a
  // multi-line element: the directive sits above `<input`, and the class attribute it must
  // suppress lands two lines further down. Resolving to the next NODE covers the whole element;
  // resolving to the next LINE would leave the finding unsuppressed and the directive dead.
  const multiline = [
    '<!-- cairn-audit-disable-next-line type-scale -- the editor canvas ruling -->',
    '<input',
    '  type="text"',
    '  class="text-[30px] font-semibold"',
    '/>',
  ].join('\n');

  it('lists template nodes in document order with offsets and line numbers', () => {
    const { nodes } = parseComponent('Fixture.svelte', multiline);
    const named = nodes.filter((n) => n.type !== 'Text');
    expect(named.map((n) => n.type)).toEqual(['Comment', 'RegularElement']);
    expect(named[0].startLine).toBe(1);
    expect(named[1].startLine).toBe(2);
    expect(named[1].endLine).toBe(5);
    expect(named[1].name).toBe('input');
  });

  it('gives a comment node its text, so a directive is readable off the node list', () => {
    const [comment] = parseComponent('Fixture.svelte', multiline).nodes;
    expect(comment.type).toBe('Comment');
    expect(comment.data).toContain('cairn-audit-disable-next-line type-scale');
  });

  it('spans a multi-line element so its class token falls inside the node range', () => {
    const parsed = parseComponent('Fixture.svelte', multiline);
    const element = parsed.nodes.find((n) => n.name === 'input');
    const token = parsed.classTokens.find((t) => t.value.startsWith('text-'));
    expect(element).toBeDefined();
    expect(token).toBeDefined();
    // The token's own line is three lines below the directive; the element's range still holds it.
    expect(token!.line).toBe(4);
    expect(token!.start).toBeGreaterThanOrEqual(element!.start);
    expect(token!.end).toBeLessThanOrEqual(element!.end);
  });

  it('nests block and element children in document order', () => {
    const source = '{#if open}\n  <div class="card">\n    <b>x</b>\n  </div>\n{/if}';
    const { nodes } = parseComponent('Fixture.svelte', source);
    const shape = nodes.filter((n) => n.type !== 'Text').map((n) => n.name ?? n.type);
    expect(shape).toEqual(['IfBlock', 'div', 'b']);
  });
});

describe('lineAt', () => {
  it('numbers lines from one', () => {
    const source = 'a\nbb\nccc';
    expect(lineAt(source, 0)).toBe(1);
    expect(lineAt(source, 2)).toBe(2);
    expect(lineAt(source, source.indexOf('ccc'))).toBe(3);
  });
});

describe('parseComponent errors', () => {
  it('names the file when the component does not parse', () => {
    expect(() => parseComponent('Broken.svelte', '{#if x}')).toThrow(/Broken\.svelte/);
  });
});
