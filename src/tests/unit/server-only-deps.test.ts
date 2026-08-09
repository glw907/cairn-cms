import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

// The inverse of editor-boundary: that test keeps client-only deps (CodeMirror, DOMPurify) OFF the
// server; this one keeps a SERVER-ONLY dep (@anthropic-ai/sdk) OFF the client. The SDK carries the
// Anthropic API key path and must never reach a browser bundle, so it may appear only inside the Worker
// action module. A future client import of it must fail this test.
//
// The walk starts at every .svelte component and follows its STATIC relative imports transitively (the
// edges a consumer's client bundle would pull). A dynamic `import('...')` is a code-split point, not a
// static edge, so it is not followed: that is exactly how MarkdownEditor reaches CodeMirror without
// shipping it to the server. The SDK is a bare package import, so any static `from '@anthropic-ai/sdk'`
// on a client-reachable module is the leak we guard.

// A static (non-dynamic) import of @anthropic-ai/sdk, value or type. We forbid both on the client: a
// type-only import is erased, but a client module should not even name the server SDK, and forbidding
// the bare specifier is the simplest robust rule.
const STATIC_SDK =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"]@anthropic-ai\/sdk['"]|(?:^|\s)import\s+['"]@anthropic-ai\/sdk['"]/m;

// A dynamic `import('@anthropic-ai/sdk')`, the only form allowed to reach the SDK. The immediate
// `(` is what keeps it out of STATIC_SDK above, whose two branches both require whitespace after
// `import`.
const DYNAMIC_SDK = /import\s*\(\s*['"]@anthropic-ai\/sdk['"]\s*\)/;

// A static relative VALUE import's specifier, captured from a `from '...'` clause or a side-effect
// `import '...'`. The span between `import` and `from` forbids a quote or semicolon (`[^'";]*?`) so it
// cannot jump from one statement's binding list to a later statement's `from` clause (the bug that an
// unbounded `[\s\S]*?` span causes: a value `import { x } from 'svelte'` followed by an `import type`
// would otherwise capture the type import's specifier). A dynamic `import('...')` starts with `import(`,
// ruled out by `[^('";]`. A type-only `import type { X } from '...'` is erased at compile time and
// pulls no runtime code, so the `(?!type\b)` lookahead excludes it: a component naming a server type
// does not ship the server module to the client, exactly as the editor-boundary test permits.
const STATIC_RELATIVE =
  /(?:^|\s)import\s+(?!type\b)(?:[^('";]?[^'";]*?from\s+)?['"](\.[^'"]+)['"]/g;

// Every file under `dir`, recursively, whose basename `keep` accepts.
function filesUnder(dir: string, keep: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, keep));
    else if (keep(name)) out.push(full);
  }
  return out;
}

// The seed set for the client-bundle walk: every admin component.
function componentFiles(dir: string): string[] {
  return filesUnder(dir, (name) => name.endsWith('.svelte'));
}

// Every shipped source file, whatever its extension: svelte-package ships all of src/lib, so this is
// the set a consumer's build actually resolves.
function sourceFiles(dir: string): string[] {
  return filesUnder(dir, (name) => name.endsWith('.ts') || name.endsWith('.svelte'));
}

// Resolve a relative import specifier (carrying the NodeNext `.js`/`.svelte` extension) to a real file
// on disk. A `.js` edge maps to its `.ts` source; a `.svelte` edge stays as-is; an extensionless edge
// is probed against the common source extensions. Returns null for an unresolved or external edge.
function resolveImport(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = base.endsWith('.js')
    ? [base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.svelte')]
    : base.endsWith('.svelte')
      ? [base]
      : [`${base}.ts`, `${base}.svelte`, path.join(base, 'index.ts')];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// The transitive set of modules reachable from a seed set by following static relative imports only.
function reachable(seeds: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...seeds];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(STATIC_RELATIVE)) {
      const next = resolveImport(file, match[1]!);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

describe('server-only deps stay off the client', () => {
  it('no client-reachable module statically imports @anthropic-ai/sdk', () => {
    // Seed from every component; the walk follows their static relative edges (the .ts helpers they
    // import statically, and onward), which is the graph a consumer's client bundle would pull.
    const graph = reachable(componentFiles('src/lib/components'));
    const offenders = [...graph].filter((file) => STATIC_SDK.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the SDK is reachable only from the server action module, and only dynamically', () => {
    // The whole point of the dep: it lives in content-routes-context.ts (the content-routes factory's
    // shared closure context), a Worker module no component imports statically. This asserts the
    // positive too, so the guard fails loudly if the import is ever moved somewhere a component can
    // reach (and the first assertion would then also fire).
    const importer = 'src/lib/sveltekit/content-routes-context.ts';
    expect(DYNAMIC_SDK.test(readFileSync(importer, 'utf8'))).toBe(true);
    const graph = reachable(componentFiles('src/lib/components'));
    expect(graph.has(path.resolve(importer))).toBe(false);
  });

  it('no shipped module statically imports the SDK, which is what keeps the peer optional', () => {
    // The SDK is an OPTIONAL peerDependency: a site that never tidies never installs it. That holds
    // only while nothing under src/lib names the specifier statically, since a static import (value
    // OR type) is a build-time resolution every consumer would have to satisfy. The dynamic import in
    // the module above is the one permitted form, and it fails at call time into the tidy action's
    // install-instruction refusal instead.
    //
    // This sweeps all of src/lib, so it already covers the client-reachable subgraph the first test
    // walks. That one stays because it guards a different promise (nothing in a browser bundle) and
    // fails naming the offending client-reachable module, which is the faster diagnosis.
    const offenders = sourceFiles('src/lib').filter((file) => STATIC_SDK.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
