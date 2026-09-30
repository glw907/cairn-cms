// cairn-cms: the showcase is the template every scaffolded site starts from, and its corner radii
// belong on the theme's roundness ladder (the `--radius-*` roles and `--cairn-focus-ring-radius`),
// so a theme that changes the ladder changes every corner. This sweep reads the showcase's theme,
// chassis, and site-route CSS, including each `.svelte` file's `<style>` block, and fails on a
// `border-radius` that carries a length literal. Three named shapes are the only exceptions, and an
// exception the sweep no longer finds fails as stale.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../lib/audit/sheet.js';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SHOWCASE = join(ROOT, 'examples/showcase');
const SWEPT_ROOTS = ['src/theme', 'src/chassis', 'src/routes/(site)'];

/** A shape is not a step on the corner ladder, so it keeps its own literal. */
interface ShapeException {
  file: string;
  value: string;
  shape: string;
}

const SHAPE_EXCEPTIONS: ShapeException[] = [
  { file: 'src/routes/(site)/+page.svelte', value: 'var(--tag-filter-radius, 999px)', shape: 'the tag filter pill' },
  { file: 'src/chassis/prose.css', value: '999px', shape: 'the video facade round button' },
  { file: 'src/chassis/prose.css', value: '1px', shape: 'the diamond marker' },
];

/** A non-zero length inside a value, so `0`, `0px`, and `var(--radius-box)` pass. */
const LENGTH_LITERAL = /(?<![\w.-])((?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vw|vh|ch|ex|pt|cm|mm|in))(?![\w-])/g;

/** Whether a radius value carries a non-zero length literal. */
function hasLiteral(value: string): boolean {
  return [...value.matchAll(LENGTH_LITERAL)].some((match) => parseFloat(match[1]) !== 0);
}

/** The CSS of a source file: the file itself, or the concatenated `<style>` blocks of a component. */
function cssOf(file: string, source: string): string {
  if (!file.endsWith('.svelte')) return source;
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** Every radius declaration value in a stylesheet, comments already dropped by the parser. */
function radiusValues(css: string): string[] {
  return parseSheet(css)
    .rules.flatMap((rule) => rule.declarations)
    .filter((declaration) => /^border(-[a-z]+)*-radius$/.test(declaration.property))
    .map((declaration) => declaration.value.trim());
}

interface Sweep {
  scanned: number;
  literals: string[];
  stale: string[];
}

/** Sweep a file map (path to source) against a set of shape exceptions. */
function sweep(files: Map<string, string>, exceptions: ShapeException[]): Sweep {
  const literals: string[] = [];
  const found = new Set<ShapeException>();
  for (const [file, source] of files) {
    for (const value of radiusValues(cssOf(file, source))) {
      if (!hasLiteral(value)) continue;
      const exception = exceptions.find((e) => e.file === file && e.value === value);
      if (exception) found.add(exception);
      else literals.push(`${file}: border-radius: ${value}`);
    }
  }
  const stale = exceptions
    .filter((e) => !found.has(e))
    .map((e) => `${e.file}: ${e.shape} (${e.value}) is no longer found`);
  return { scanned: files.size, literals, stale };
}

/** The showcase's swept files, path relative to the showcase. */
function showcaseFiles(): Map<string, string> {
  const files = new Map<string, string>();
  for (const root of SWEPT_ROOTS) {
    for (const entry of readdirSync(join(SHOWCASE, root), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !/\.(css|svelte)$/.test(entry.name)) continue;
      const path = join(entry.parentPath, entry.name);
      files.set(relative(SHOWCASE, path), readFileSync(path, 'utf8'));
    }
  }
  return files;
}

describe('template radius literals', () => {
  const files = showcaseFiles();
  const result = sweep(files, SHAPE_EXCEPTIONS);

  it(`finds no border-radius literal in the ${result.scanned} swept files beyond the named shapes`, () => {
    expect(result.scanned).toBeGreaterThan(10);
    expect(result.literals).toEqual([]);
  });

  it('finds every named shape exception, so none is stale', () => {
    expect(result.stale).toEqual([]);
  });

  it('flags a planted 3px radius in a stylesheet and in a component style block', () => {
    const planted = new Map([
      ['a.css', '.card { border-radius: 3px; }'],
      ['B.svelte', '<div></div>\n<style>\n  .x { border-radius: 0.5rem 0 0 0; }\n</style>'],
    ]);
    expect(sweep(planted, []).literals).toEqual([
      'a.css: border-radius: 3px',
      'B.svelte: border-radius: 0.5rem 0 0 0',
    ]);
  });

  it('passes zero and a ladder variable, and ignores a radius named only in a comment', () => {
    const clean = new Map([
      ['a.css', '.a { border-radius: 0; } .b { border-radius: var(--radius-box); }'],
      ['b.css', '/* border-radius: 3px; */ .c { border-radius: var(--cairn-focus-ring-radius); }'],
    ]);
    expect(sweep(clean, []).literals).toEqual([]);
  });

  it('reports a named exception the sweep no longer finds as stale', () => {
    const files = new Map([['a.css', '.a { border-radius: var(--radius-box); }']]);
    const stale = sweep(files, [{ file: 'a.css', value: '999px', shape: 'a pill' }]).stale;
    expect(stale).toEqual(['a.css: a pill (999px) is no longer found']);
  });
});
