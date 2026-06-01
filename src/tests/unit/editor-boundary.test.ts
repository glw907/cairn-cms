// src/tests/unit/editor-boundary.test.ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Server-reachable engine code: everything a Worker can import. The .svelte components are client-only
// and excluded; the editor library belongs behind their dynamic import, not here.
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

// Matches a static `import ... from '@codemirror/...'`, `from 'codemirror'`, or the bare forms, but not
// the dynamic `import('@codemirror/...')` the editor component uses on the client.
const STATIC_EDITOR =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"](?:codemirror|@codemirror\/[^'"]+)['"]|(?:^|\s)import\s+['"](?:codemirror|@codemirror\/[^'"]+)['"]/m;

const STATIC_DOMPURIFY =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"]dompurify['"]|(?:^|\s)import\s+['"]dompurify['"]/m;

describe('CodeMirror stays off the server', () => {
  it('no server-reachable module imports a codemirror package', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (STATIC_EDITOR.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not import a codemirror package', () => {
    expect(STATIC_EDITOR.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });

  it('the editor component loads codemirror only through a dynamic import', () => {
    const source = readFileSync('src/lib/components/MarkdownEditor.svelte', 'utf8');
    expect(STATIC_EDITOR.test(source)).toBe(false);
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
