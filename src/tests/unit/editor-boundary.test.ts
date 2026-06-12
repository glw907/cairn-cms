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

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (name.endsWith('.ts') || name.endsWith('.svelte')) out.push(full);
  }
  return out;
}

// Matches a static `import ... from '@codemirror/...'`, `from 'codemirror'`, or the bare forms, but not
// the dynamic `import('@codemirror/...')` the editor component uses on the client.
const STATIC_EDITOR =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"](?:codemirror|@codemirror\/[^'"]+)['"]|(?:^|\s)import\s+['"](?:codemirror|@codemirror\/[^'"]+)['"]/m;

const STATIC_DOMPURIFY =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"]dompurify['"]|(?:^|\s)import\s+['"]dompurify['"]/m;

// Matches a static VALUE import of a codemirror or lezer package within one statement (no quote
// or semicolon may intervene before the from clause, so the lazy span cannot jump statements).
// A type-only `import type` is erased at compile time and stays legal anywhere.
const STATIC_EDITOR_VALUE =
  /(?:^|\s)import\s+(?!type\b)[^'";]*?from\s+['"](?:codemirror|@codemirror\/[^'"]+|@lezer\/[^'"]+)['"]|(?:^|\s)import\s+['"](?:codemirror|@codemirror\/[^'"]+|@lezer\/[^'"]+)['"]/m;

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

  // The two component modules MarkdownEditor reaches only through dynamic imports; they alone
  // may import @codemirror/* statically.
  const DYNAMIC_ONLY = ['editor-highlight.ts', 'editor-modes.ts'];

  it('only the dynamically-imported editor modules statically import an editor package', () => {
    // EditPage imports the component .ts helpers statically and a consumer's server bundle
    // follows those edges, so a value import of @codemirror/* or @lezer/* anywhere but the
    // dynamically-imported editor modules leaks CodeMirror onto the server.
    const offenders: string[] = [];
    for (const file of tsFiles('src/lib/components')) {
      if (DYNAMIC_ONLY.includes(path.basename(file))) continue;
      if (STATIC_EDITOR_VALUE.test(readFileSync(file, 'utf8'))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('the editor modules are reached only through dynamic imports', () => {
    // MarkdownEditor.svelte loads them via `await import('./editor-highlight.js')` and
    // `await import('./editor-modes.js')`, which carry no `from` clause; any `from '...'` edge
    // is a static one that would pull the module (and its codemirror imports) into every
    // importer's bundle.
    const offenders: string[] = [];
    for (const file of sourceFiles('src/lib')) {
      const source = readFileSync(file, 'utf8');
      for (const name of DYNAMIC_ONLY) {
        const stem = name.replace(/\.ts$/, '');
        if (source.includes(`from './${stem}`) || source.includes(`from '../components/${stem}`)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
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
