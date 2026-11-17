import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  codeVoiceSegments,
  extractEnvVars,
  extractImportedIdentifiers,
  extractFilePaths,
  extractEventOrConditionCandidates,
  logEventNames,
  conditionIds,
  toolCheckIds,
  parseApiSurface,
  findUnresolvedSymbols,
  filesInScope,
  envVarInSourceTree,
  pathExists,
} from '../../../scripts/checks/check-symbols.mjs';
import { ALLOWLIST } from '../../../scripts/checks/check-symbols-allowlist.mjs';

describe('codeVoiceSegments', () => {
  it('extracts an inline span with its 1-based line number', () => {
    const segments = codeVoiceSegments('prose\nuse `--dry-run` here');
    expect(segments).toEqual([{ line: 2, text: '--dry-run', fenced: false, lang: null }]);
  });

  it('extracts a fenced block, tagging every line with the fence language', () => {
    const segments = codeVoiceSegments(['```bash', 'npm install', 'npm test', '```'].join('\n'));
    expect(segments).toEqual([
      { line: 2, text: 'npm install', fenced: true, lang: 'bash' },
      { line: 3, text: 'npm test', fenced: true, lang: 'bash' },
    ]);
  });

  it('tags an untagged fence with a null lang', () => {
    const segments = codeVoiceSegments(['```', 'plain', '```'].join('\n'));
    expect(segments[0].lang).toBeNull();
  });

  it('does not truncate a double-backtick span whose content contains a backtick', () => {
    const segments = codeVoiceSegments('see `` `--dry-run` `` in the CLI');
    expect(segments).toEqual([{ line: 1, text: ' `--dry-run` ', fenced: false, lang: null }]);
  });

  it('yields nothing for ordinary prose, the gate\'s main defense against over-firing', () => {
    const segments = codeVoiceSegments(
      'The commit.succeeded event fires after a save, at src/lib/commit.ts, with --dry-run unset.',
    );
    expect(segments).toEqual([]);
  });
});

describe('extractEnvVars', () => {
  it('extracts a real and a fake env var, both halves', () => {
    // The fake token is assembled at runtime, not written as one contiguous literal here: this
    // file itself is inside envVarInSourceTree's search tree, and a literal fake token would
    // match its own occurrence in this assertion, defeating the negative half of the test.
    const fakeEnvVar = ['NOT_A', 'REAL_ENV', 'VAR_TOKEN'].join('_');
    const segments = codeVoiceSegments(`inline \`PUBLIC_ORIGIN\` and \`${fakeEnvVar}\` here`);
    const candidates = extractEnvVars(segments);
    const tokens = candidates.map((c) => c.token);
    expect(tokens).toContain('PUBLIC_ORIGIN');
    expect(tokens).toContain(fakeEnvVar);

    expect(envVarInSourceTree('PUBLIC_ORIGIN')).toBe(true);
    expect(envVarInSourceTree(fakeEnvVar)).toBe(false);
  });
});

describe('extractImportedIdentifiers', () => {
  it('extracts a real and a fake export imported from the bare package, both halves', () => {
    const segments = codeVoiceSegments(
      ["```ts", "import { defineAdapter, NotARealExport } from '@glw907/cairn-cms';", "```"].join('\n'),
    );
    const candidates = extractImportedIdentifiers(segments);
    expect(candidates).toEqual([
      { line: 2, token: 'defineAdapter', subpath: '.' },
      { line: 2, token: 'NotARealExport', subpath: '.' },
    ]);

    const apiSurface = parseApiSurface();
    expect(apiSurface.get('.')?.has('defineAdapter')).toBe(true);
    expect(apiSurface.get('.')?.has('NotARealExport')).toBe(false);
  });

  it('reads a subpath import but never the dev package as a `-dev` subpath', () => {
    const segments = codeVoiceSegments(
      [
        '```ts',
        "import { createFakeR2 } from '@glw907/cairn-cms-dev';",
        "import { sveltekitThing } from '@glw907/cairn-cms/sveltekit';",
        '```',
      ].join('\n'),
    );
    const found = extractImportedIdentifiers(segments);
    expect(found.map((c) => c.subpath)).not.toContain('-dev');
    expect(found).toContainEqual({ line: 3, token: 'sveltekitThing', subpath: '/sveltekit' });
  });
});

describe('pathExists', () => {
  it('resolves a site-relative path against the scaffolded site', () => {
    const root = mkdtempSync(join(tmpdir(), 'check-symbols-path-'));
    try {
      mkdirSync(join(root, 'templates/waymark/src'), { recursive: true });
      writeFileSync(join(root, 'templates/waymark/src/access.ts'), '');
      expect(pathExists('src/access.ts', root)).toBe(true);
      expect(pathExists('src/missing.ts', root)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('extractFilePaths', () => {
  it('keeps a leading dot-directory whole and still drops a parent-relative bare name', () => {
    const tokens = extractFilePaths(
      codeVoiceSegments('see `.cairn/index.json` and `../worker-configuration.d.ts`'),
    ).map((c) => c.token);
    expect(tokens).toContain('.cairn/index.json');
    expect(tokens).not.toContain('worker-configuration.d.ts');
  });

  it('extracts a real and a fake repository path, both halves', () => {
    const segments = codeVoiceSegments(
      'see `src/lib/log/events.ts` and `src/lib/nonexistent-module.ts`',
    );
    const candidates = extractFilePaths(segments);
    const tokens = candidates.map((c) => c.token);
    expect(tokens).toContain('src/lib/log/events.ts');
    expect(tokens).toContain('src/lib/nonexistent-module.ts');
  });
});

describe('extractFilePaths, package import specifiers', () => {
  it('skips a #-prefixed specifier and still resolves a repo path', () => {
    const tokens = extractFilePaths(
      codeVoiceSegments('import from `#lib/cairn.config.js`, edit `src/lib/x.ts`'),
    ).map((c) => c.token);
    expect(tokens).not.toContain('lib/cairn.config.js');
    expect(tokens).toEqual(['src/lib/x.ts']);
  });
});

describe('extractEventOrConditionCandidates', () => {
  it('extracts a real and a fake dotted name sharing a real area, both halves', () => {
    const segments = codeVoiceSegments('the `commit.succeeded` and `commit.errored` events');
    const areas = new Set(['commit']);
    const candidates = extractEventOrConditionCandidates(segments, areas);
    const tokens = candidates.map((c) => c.token);
    expect(tokens).toContain('commit.succeeded');
    expect(tokens).toContain('commit.errored');

    const events = logEventNames();
    expect(events.has('commit.succeeded')).toBe(true);
    expect(events.has('commit.errored')).toBe(false);
  });

  it('drops a candidate whose area is not in the registry union', () => {
    const segments = codeVoiceSegments('the `nothing.here` token');
    expect(extractEventOrConditionCandidates(segments, new Set(['commit']))).toEqual([]);
  });
});

// Named regression: an earlier version of extractEventOrConditionCandidates required three or
// more dotted segments, which silently turned the class off for 40 of the 74 real log events,
// including every commit.*, entry.*, media.*, publish.*, and tidy.* name and guard.refused.
describe('the two-segment log event regression', () => {
  it('resolves a real two-segment event', () => {
    const segments = codeVoiceSegments('the `commit.succeeded` event');
    const areas = new Set(['commit']);
    const candidates = extractEventOrConditionCandidates(segments, areas);
    expect(candidates).toEqual([{ line: 1, token: 'commit.succeeded' }]);

    const events = logEventNames();
    expect(events.has('commit.succeeded')).toBe(true);
  });

  it('still fails a wrong verb on a real area', () => {
    const events = logEventNames();
    const conditions = conditionIds();
    const checkIds = toolCheckIds();
    expect(events.has('commit.errored')).toBe(false);
    expect(conditions.has('commit.errored')).toBe(false);
    expect(checkIds.has('commit.errored')).toBe(false);
  });
});

// Named regression: an earlier version resolved an imported identifier against "any subpath
// exports this name", so a real export named from the wrong cairn subpath silently passed.
describe('the export-resolves-against-its-own-subpath regression', () => {
  it('fails a real export imported from a subpath that does not carry it', () => {
    const apiSurface = parseApiSurface();
    // CairnPlatformBindings is a real export, but only under '/sveltekit', not the bare '.'
    // subpath. A resolver that fell back to "does any subpath carry this name" would wrongly
    // pass an import claiming it comes from the bare package.
    expect(apiSurface.get('/sveltekit')?.has('CairnPlatformBindings')).toBe(true);
    expect(apiSurface.get('.')?.has('CairnPlatformBindings')).toBe(false);
  });
});

describe('the registry parsers', () => {
  it('logEventNames returns a non-empty set containing a known event', () => {
    const events = logEventNames();
    expect(events.size).toBeGreaterThan(0);
    expect(events.has('commit.succeeded')).toBe(true);
    expect(events.has('guard.refused')).toBe(true);
  });

  it('conditionIds returns a non-empty set containing a known condition', () => {
    const conditions = conditionIds();
    expect(conditions.size).toBeGreaterThan(0);
    expect(conditions.has('auth.csrf-token-invalid')).toBe(true);
  });

  it('toolCheckIds returns a non-empty set containing a known check id', () => {
    const checkIds = toolCheckIds();
    expect(checkIds.size).toBeGreaterThan(0);
    expect(checkIds.has('config.bindings')).toBe(true);
  });

  it('parseApiSurface returns a non-empty map containing a known export under the bare subpath', () => {
    const apiSurface = parseApiSurface();
    expect(apiSurface.size).toBeGreaterThan(0);
    expect(apiSurface.get('.')?.has('defineAdapter')).toBe(true);
  });
});

describe('the ALLOWLIST', () => {
  it('suppresses a token allowlisted under its own class key', () => {
    // The old migration-notes path exists only inside a release tag, so the filesystem never
    // resolves it and only the allowlist keeps it from being reported.
    expect(pathExists('docs/extend/migration-notes.md')).toBe(false);
    expect(ALLOWLIST.has('file-path:docs/extend/migration-notes.md')).toBe(true);
  });

  it('does not suppress the same token under a different class key', () => {
    expect(ALLOWLIST.has('env-var:docs/extend/migration-notes.md')).toBe(false);
  });

});

// The scan scope: an optional entry (a docs directory, a front-door file) is skipped while it does
// not exist, while a required entry (the migration notes, the root README) must exist or the scan
// throws, so a vanished file can never shrink the sweep to nothing and pass.
describe('filesInScope', () => {
  function tree(files: string[]): string {
    const root = mkdtempSync(join(tmpdir(), 'cairn-symbols-scope-'));
    const all: Record<string, string> = { 'README.md': '# Repo\n', 'MIGRATION-NOTES.md': '# Notes\n' };
    for (const file of files) all[file] = '# Page\n';
    for (const [path, content] of Object.entries(all)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return root;
  }

  it('scans the migration notes and the root README when no docs page exists', () => {
    const root = tree([]);
    try {
      expect(filesInScope(root)).toEqual(['MIGRATION-NOTES.md', 'README.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('scans the admin and editors directories and the front doors once they hold pages', () => {
    const root = tree(['docs/admin/is-it-working.md', 'docs/editors/a.md', 'docs/architecture.md', 'docs/internal/x.md']);
    try {
      expect(filesInScope(root)).toEqual([
        'MIGRATION-NOTES.md',
        'README.md',
        'docs/admin/is-it-working.md',
        'docs/architecture.md',
        'docs/editors/a.md',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when a required scope entry is missing', () => {
    const root = tree([]);
    try {
      rmSync(join(root, 'MIGRATION-NOTES.md'));
      expect(() => filesInScope(root)).toThrow(/MIGRATION-NOTES\.md/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// The env-var ground truth counts source files only: generated output and installed dependencies
// are excluded at the grep walk, so a token that lives only in one of them is absent.
describe('envVarInSourceTree, generated and dependency trees', () => {
  function tree(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), 'cairn-symbols-env-'));
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return root;
  }

  it.each([
    'examples/showcase/node_modules/dep/index.js',
    'examples/showcase/.wrangler/tmp/bundle/index.js',
    'examples/showcase/.svelte-kit/output/server/index.js',
    'examples/showcase/test-results/run/trace.txt',
  ])('does not count a token found only in %s', (path) => {
    const root = tree({ [path]: 'const k = "CAIRN_ONLY_GENERATED";\n' });
    try {
      expect(envVarInSourceTree('CAIRN_ONLY_GENERATED', root)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('counts a token found in a source file beside a generated tree', () => {
    const root = tree({
      'src/lib/env.ts': 'export const k = "CAIRN_IN_SOURCE";\n',
      'examples/showcase/.wrangler/tmp/bundle/index.js': 'CAIRN_IN_SOURCE\n',
    });
    try {
      expect(envVarInSourceTree('CAIRN_IN_SOURCE', root)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('findUnresolvedSymbols', () => {
  // A whole-corpus scan, and it has run past vitest's 30-second default against the published
  // tracks. That default is nobody's budget for this test; racing it made the suite fail on
  // wall-clock rather than on a finding. The scan's own gate (`npm run check:symbols`)
  // runs the identical function outside vitest, so the ceiling here is only about not flaking.
  it('returns no findings on the real committed corpus', () => {
    expect(findUnresolvedSymbols()).toEqual([]);
  }, 120_000);
});
