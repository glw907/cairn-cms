import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const libDir = fileURLToPath(new URL('../../lib', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(libDir);

describe('engine isolation', () => {
  it('claims no SvelteKit routes (those are site code)', () => {
    const routeFiles = files.filter((f) => /[\\/]\+(page|layout|server|error)[.@]/.test(f));
    expect(routeFiles).toEqual([]);
  });

  it('imports only allowlisted stylesheets, so it injects no surprise global CSS', () => {
    const allow = ['./cairn-admin.css', '@rodrigodagostino/svelte-sortable-list/styles.css'];
    const cssImports = files
      .filter((f) => f.endsWith('.svelte') || f.endsWith('.ts'))
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map((m) => m[1]));
    for (const imp of cssImports) expect(allow, `unexpected CSS import ${imp}`).toContain(imp);
  });

  it('keeps the admin theme scoped to its data-theme', () => {
    const css = readFileSync(join(libDir, 'components/cairn-admin.css'), 'utf8');
    // The CSS uses single-quoted attribute values; accept either quote style.
    expect(css).toMatch(/\[data-theme=['"]cairn-admin['"]\]/);
    // No bare global selectors that would reach a site's public pages.
    expect(css).not.toMatch(/(^|\})\s*(:root|html|body|\*)\s*\{/);
  });
});
