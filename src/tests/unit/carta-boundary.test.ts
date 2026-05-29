import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Server-reachable engine code: everything a Worker can import. The components barrel and the
// .svelte files are client-only and excluded; Carta belongs there, not here.
const SERVER_DIRS = ['src/lib/sveltekit', 'src/lib/github', 'src/lib/auth', 'src/lib/content', 'src/lib/render'];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('Carta stays off the server', () => {
  it('no server-reachable module imports carta-md', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (/from\s+['"]carta-md['"]/.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not import carta-md', () => {
    expect(/from\s+['"]carta-md['"]/.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });
});
