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

// Matches static `import ... from 'carta-md'` and bare `import 'carta-md'` but not dynamic
// `import('carta-md')`, which is the safe client-only usage allowed in sanitize.ts and components.
const STATIC_CARTA = /(?:^|\s)import\s[^(][\s\S]*?from\s+['"]carta-md['"]|(?:^|\s)import\s+['"]carta-md['"]/m;

// Matches static `import ... from 'dompurify'` and bare `import 'dompurify'` but not the dynamic
// `await import('dompurify')` inside sanitize.ts, which is the allowed client-side-only path.
const STATIC_DOMPURIFY = /(?:^|\s)import\s[^(][\s\S]*?from\s+['"]dompurify['"]|(?:^|\s)import\s+['"]dompurify['"]/m;

describe('Carta stays off the server', () => {
  it('no server-reachable module imports carta-md', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (STATIC_CARTA.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not import carta-md', () => {
    expect(STATIC_CARTA.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });
});

describe('DOMPurify stays off the server', () => {
  it('no server-reachable module statically imports dompurify', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (STATIC_DOMPURIFY.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not statically import dompurify', () => {
    expect(STATIC_DOMPURIFY.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });
});
