// cairn-cms: hold the editor/toolbar story's transcribed icon paths to the real lucide artwork.
//
// A story module is TypeScript with no markup, so `editor/toolbar` builds the Insert group through
// createRawSnippet and writes each glyph's SVG path data as a string. The real toolbar renders the
// same glyphs as @lucide/svelte components, so the two are the same drawing kept in two places, and
// a lucide release that redraws an icon moves one of them silently. The reproduction would then
// show an Insert group that no longer matches the toolbar a reader has open beside it, which is
// exactly the drift a live reproduction exists to prevent.
//
// @lucide/svelte ships Svelte components rather than importable data, so the artwork is read off
// disk: each icon file carries its `iconNode` as a JSON array literal, and every path in it must
// appear verbatim in the story source.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STORY_SOURCE = resolve(process.cwd(), 'src/lib/reproductions/stories/editor.ts');
const LUCIDE_ICONS = resolve(process.cwd(), 'node_modules/@lucide/svelte/dist/icons');

/** The lucide icons `editor/toolbar` transcribes, in the order the Insert group renders them. */
const TRANSCRIBED = ['blocks', 'link', 'file-symlink', 'image', 'sparkles'];

/** Every `d` attribute in one icon's `iconNode`, the part a redraw actually changes. */
function iconPaths(name: string): string[] {
  const file = resolve(LUCIDE_ICONS, `${name}.svelte`);
  const found = readFileSync(file, 'utf8').match(/const iconNode = (\[[\s\S]*?\]);/);
  if (!found) throw new Error(`no iconNode in ${name}.svelte; lucide changed its component shape`);
  const node = JSON.parse(found[1]) as [string, Record<string, string>][];
  return node.filter(([, attrs]) => 'd' in attrs).map(([, attrs]) => attrs.d);
}

describe('editor/toolbar transcribed icons', () => {
  // A package layout change would otherwise make every assertion below pass vacuously.
  it('finds the lucide icon files it reads', () => {
    expect(existsSync(LUCIDE_ICONS), LUCIDE_ICONS).toBe(true);
    for (const name of TRANSCRIBED) {
      expect(existsSync(resolve(LUCIDE_ICONS, `${name}.svelte`)), name).toBe(true);
    }
  });

  it('transcribes every path verbatim from the installed lucide artwork', () => {
    const source = readFileSync(STORY_SOURCE, 'utf8');
    for (const name of TRANSCRIBED) {
      const paths = iconPaths(name);
      expect(paths.length, `${name} declares at least one path`).toBeGreaterThan(0);
      for (const d of paths) {
        expect(source.includes(d), `${name}: story is missing lucide's path "${d}"`).toBe(true);
      }
    }
  });
});
