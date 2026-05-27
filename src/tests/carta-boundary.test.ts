import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// C4/M5 bundle guard: Carta pulls in Shiki, which can blow the Worker size/startup limits if it
// reaches the server. Carta is client-only. `carta-md` may be imported *only* from `.svelte`
// components (which mount the editor in the browser). No server-side `.ts` module may import it,
// or the route/auth logic would drag Shiki into the Worker bundle. This test pins that boundary.

const libDir = fileURLToPath(new URL('../lib', import.meta.url));

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return tsFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('carta server boundary (C4)', () => {
  it('no server-side .ts module imports carta-md', () => {
    const offenders = tsFiles(libDir).filter((path) => /from ['"]carta-md/.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
