// cairn-cms: pins every computed value the two admin theme roots declare, read on four elements
// (the light wrapper, a light child, the dark wrapper, a dark child) against the compiled sheet,
// once bare and once under a hostile unlayered host sheet. The wrapper is a `div`, so the hostile
// `div` rule meets the theme root's own rule there; the child is a `span`, so the read also covers
// inheritance through the wrapper. A value the build truncates (a top-level comma split by the
// daisyUI theme plugin's option parser) or demotes (a declaration moved into `@layer base`, where
// an unlayered host rule outranks it) fails here, naming the property and the element.
//
// The property set is every declaration in the source's two theme roots: the plain
// `[data-theme='cairn-admin']` / `[data-theme='cairn-admin-dark']` rules and the
// `@plugin "daisyui/theme"` blocks, nested rules excluded. The committed expectations carry that
// set, and the test also fails when the source declares a root property the expectations lack.
//
// Update mode: run with `VITE_CAIRN_UPDATE_THEME_EXPECTATIONS=1` to regenerate both expectation
// files from the current compiled sheet instead of comparing against them, then review the diff.
// Vite exposes only `VITE_`-prefixed variables to a browser-mode test, hence the prefix.
import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import adminSource from '../../lib/components/cairn-admin.css?raw';
import bareExpected from '../fixtures/admin-theme-computed.json';
import hostileExpected from '../fixtures/admin-theme-computed-hostile.json';
import { renderInTheme, type Theme } from './_idiom-probe.js';

/** Computed values keyed by element, then by property. */
type Expectations = Record<string, Record<string, string>>;

const UPDATE = import.meta.env.VITE_CAIRN_UPDATE_THEME_EXPECTATIONS === '1';

/** A consumer sheet that restyles every `div`, unlayered, the way a careless host sheet would. */
const HOSTILE_HOST_CSS =
  'div { font-family: Georgia; -webkit-font-smoothing: auto; scrollbar-width: auto; color-scheme: dark }';

const THEMES: { theme: Theme; key: 'light' | 'dark' }[] = [
  { theme: 'cairn-admin', key: 'light' },
  { theme: 'cairn-admin-dark', key: 'dark' },
];

const PLUGIN_OPTION_KEYS = new Set(['name', 'default', 'prefersdark', 'root']);

/**
 * The body of the brace-matched block that opens at `open` (the index of its `{`), and the index
 * just past its closing `}`.
 */
function blockAt(css: string, open: number): { body: string; end: number } {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return { body: css.slice(open + 1, i), end: i + 1 };
    }
  }
  throw new Error(`unbalanced braces from offset ${open}`);
}

/** The property names a block body declares at its own level; nested rules are skipped whole. */
function ownDeclarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  let pending = '';
  let parens = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '{') {
      // A nested rule: its prelude is the pending text, and the whole block is skipped.
      i = blockAt(body, i).end - 1;
      pending = '';
      continue;
    }
    if (ch === ';' && parens === 0) {
      const colon = pending.indexOf(':');
      if (colon > 0) out.set(pending.slice(0, colon).trim(), pending.slice(colon + 1).trim());
      pending = '';
      continue;
    }
    pending += ch;
  }
  return out;
}

/** Every property the source's two theme roots declare, across the plain rules and plugin blocks. */
function sourceRootProperties(source: string): string[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const props = new Set<string>();
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    const prelude = css.slice(i, open).trim();
    const { body, end } = blockAt(css, open);
    const isPlainRoot = prelude === "[data-theme='cairn-admin']" || prelude === "[data-theme='cairn-admin-dark']";
    if (isPlainRoot) {
      for (const prop of ownDeclarations(body).keys()) props.add(prop);
    } else if (prelude === '@plugin "daisyui/theme"') {
      const decls = ownDeclarations(body);
      const name = decls.get('name')?.replace(/^["']|["']$/g, '');
      if (name === 'cairn-admin' || name === 'cairn-admin-dark') {
        for (const prop of decls.keys()) if (!PLUGIN_OPTION_KEYS.has(prop)) props.add(prop);
      }
    }
    i = end;
  }
  return [...props].sort();
}

/** Reads `props` on the four elements, with `hostCss` injected after the admin sheet if given. */
function readComputed(props: string[], hostCss?: string): Expectations {
  const out: Expectations = {};
  for (const { theme, key } of THEMES) {
    const { wrapper, cleanup } = renderInTheme('<span>child</span>', theme, hostCss ? { hostCss } : {});
    try {
      const child = wrapper.querySelector('span')!;
      const wrapperStyle = getComputedStyle(wrapper);
      const childStyle = getComputedStyle(child);
      out[`${key}-wrapper`] = Object.fromEntries(props.map((p) => [p, wrapperStyle.getPropertyValue(p)]));
      out[`${key}-child`] = Object.fromEntries(props.map((p) => [p, childStyle.getPropertyValue(p)]));
    } finally {
      cleanup();
    }
  }
  return out;
}

/** Every mismatch between `actual` and `expected`, as `element property: expected -> actual`. */
function differences(actual: Expectations, expected: Expectations): string[] {
  const out: string[] = [];
  for (const [element, values] of Object.entries(expected)) {
    for (const [prop, want] of Object.entries(values)) {
      const got = actual[element]?.[prop];
      if (got !== want) out.push(`${element} ${prop}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }
  }
  return out;
}

const RUNS: { name: string; file: string; expected: Expectations; hostCss?: string }[] = [
  { name: 'bare', file: 'src/tests/fixtures/admin-theme-computed.json', expected: bareExpected },
  {
    name: 'under a hostile unlayered host sheet',
    file: 'src/tests/fixtures/admin-theme-computed-hostile.json',
    expected: hostileExpected,
    hostCss: HOSTILE_HOST_CSS,
  },
];

describe('the admin theme roots compute unchanged values', () => {
  const props = sourceRootProperties(adminSource);

  it('finds the theme roots in the source', () => {
    // A parser that found nothing would pin nothing; the roots declare the palette at minimum.
    expect(props).toContain('--color-primary');
    expect(props).toContain('font-family');
  });

  describe.each(RUNS)('$name', ({ file, expected, hostCss }) => {
    it.skipIf(!UPDATE)('regenerates the expectation file (update mode)', async () => {
      await commands.writeFile(file, `${JSON.stringify(readComputed(props, hostCss), null, 2)}\n`);
    });

    it.skipIf(UPDATE)('pins every root property the source declares', () => {
      const pinned = Object.keys(expected['light-wrapper'] ?? {}).sort();
      expect(pinned).toEqual(props);
    });

    it.skipIf(UPDATE)('matches the committed expectation on all four elements', () => {
      expect(Object.keys(expected).sort()).toEqual(['dark-child', 'dark-wrapper', 'light-child', 'light-wrapper']);
      expect(differences(readComputed(props, hostCss), expected)).toEqual([]);
    });
  });
});
