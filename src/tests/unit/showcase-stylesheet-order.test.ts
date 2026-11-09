// The showcase's public pages and its editor preview link four sheets, and the cascade depends on
// their order: the theme's sheets first, then the site's theme-options, then its overrides, so a
// site's file always wins over the theme it chose.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const SHOWCASE = resolve(import.meta.dirname, '../../../examples/showcase/src');
const ORDER = ['#theme/theme.css?url', '#theme/site.css?url', '#site/theme-options.css?url', '#site/overrides.css?url'];

/** The specifier each `?url` import binds to its local name, as the source spells them. */
function urlImports(source: string): Map<string, string> {
  const byName = new Map<string, string>();
  for (const m of source.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.css\?url)'/g)) byName.set(m[1]!, m[2]!);
  return byName;
}

function linkedSheets(file: string): string[] {
  const source = readFileSync(resolve(SHOWCASE, file), 'utf8');
  const names = urlImports(source);
  return [...source.matchAll(/<link rel="stylesheet" href=\{(\w+)\}/g)].map((m) => names.get(m[1]!) ?? `unbound:${m[1]}`);
}

describe('the stylesheet cascade', () => {
  it.each(['routes/(site)/+layout.svelte', 'routes/+error.svelte'])('%s links theme, site, theme-options, overrides in order', (file) => {
    expect(linkedSheets(file)).toEqual(ORDER);
  });

  it("the preview's stylesheets list the same four in the same order", () => {
    const source = readFileSync(resolve(SHOWCASE, 'site/cairn.config.ts'), 'utf8');
    const names = urlImports(source);
    const list = /preview:\s*\{\s*stylesheets:\s*\[([^\]]+)\]/.exec(source);
    expect(list).not.toBeNull();
    const sheets = list![1]!.split(',').map((s) => names.get(s.trim()) ?? `unbound:${s.trim()}`);
    expect(sheets).toEqual(ORDER);
  });
});
