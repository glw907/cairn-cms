import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  codeVoiceSegments,
  extractCliFlags,
  extractCairnLines,
  resolveCairnLine,
  cairnLineFindings,
  extractEnvVars,
  extractImportedIdentifiers,
  extractFilePaths,
  extractEventOrConditionCandidates,
  logEventNames,
  conditionIds,
  toolCheckIds,
  createCairnSiteFlags,
  cairnToolFlags,
  cairnCommandFlags,
  cliFlagNames,
  parseApiSurface,
  findUnresolvedSymbols,
} from '../../../scripts/checks/check-symbols.mjs';
import { ALLOWLIST } from '../../../scripts/checks/check-symbols-allowlist.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

// Mirrors extractEnvVars' own ground truth (an unexported helper inside check-symbols.mjs): a
// SCREAMING_SNAKE_CASE token resolves against the environment-variable class when it appears
// anywhere in the source tree. There is no parseable registry for this class, unlike the other
// four, so this is the only way to prove the env-var half of the both-halves requirement without
// reaching into a private function.
function foundInSourceTree(token: string): boolean {
  const out = execSync(
    `grep -rl -- "\\b${token}\\b" src packages migrations examples/showcase scripts .github 2>/dev/null | grep -v node_modules || true`,
    { cwd: ROOT },
  )
    .toString()
    .trim();
  return out.length > 0;
}

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

describe('extractCliFlags', () => {
  it('extracts a real and a fake flag from a shell-tagged fence, both halves', () => {
    const segments = codeVoiceSegments(['```bash', 'create-cairn-site --dry-run --not-a-real-flag', '```'].join('\n'));
    const candidates = extractCliFlags(segments);
    const tokens = candidates.map((c) => c.token);
    expect(tokens).toContain('--dry-run');
    expect(tokens).toContain('--not-a-real-flag');

    const flags = createCairnSiteFlags();
    expect(flags.has('dry-run')).toBe(true);
    expect(flags.has('not-a-real-flag')).toBe(false);
  });

  it('ignores a flag-shaped token outside a shell-tagged fence', () => {
    const segments = codeVoiceSegments('inline `--dry-run` is not extracted as a CLI flag');
    expect(extractCliFlags(segments)).toEqual([]);
  });
});

describe('extractCairnLines', () => {
  it('reads a `$ `-prompted cairn line, dropping the prompt itself', () => {
    const segments = codeVoiceSegments(['```bash', '$ cairn doctor', '```'].join('\n'));
    const lines = extractCairnLines(segments);
    expect(lines).toEqual([[{ line: 2, token: 'cairn' }, { line: 2, token: 'doctor' }]]);
  });

  it('joins a continuation line, tagging each word with the line it was written on', () => {
    const segments = codeVoiceSegments(
      ['```bash', 'cairn doctor \\', '  --domain example.com', '```'].join('\n'),
    );
    const lines = extractCairnLines(segments);
    expect(lines).toEqual([
      [
        { line: 2, token: 'cairn' },
        { line: 2, token: 'doctor' },
        { line: 3, token: '--domain' },
        { line: 3, token: 'example.com' },
      ],
    ]);
  });

  it('does not read a cairn line inside a non-shell fence (Review focus 1)', () => {
    const segments = codeVoiceSegments(['```text', 'cairn doctor --not-a-real-flag', '```'].join('\n'));
    expect(extractCairnLines(segments)).toEqual([]);
  });

  it('does not read `npx cairn-audit --rendered` or `npm run cairn:manifest` as cairn lines', () => {
    const segments = codeVoiceSegments(
      ['```bash', 'npx cairn-audit --rendered', 'npm run cairn:manifest', '```'].join('\n'),
    );
    expect(extractCairnLines(segments)).toEqual([]);
  });
});

describe('resolveCairnLine', () => {
  // A synthetic map, not tool/testdata/flags.json: the real tree has no path that is a strict
  // prefix of another (Review focus 2 needs one), so the grammar is proven here against a
  // fixture built to carry that shape, independent of the tool's current command tree.
  const commandMap = new Map([
    ['cairn', new Set(['--help', '--verbose'])],
    ['cairn doctor', new Set(['--help', '--verbose', '--json'])],
    ['cairn doctor fix', new Set(['--help', '--verbose', '--force'])],
  ]);

  it('fails an unknown subcommand with no flags', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn frobnicate', '```'].join('\n')));
    const findings = resolveCairnLine(lines[0], commandMap);
    expect(findings).toEqual([{ line: 2, class: 'cairn-subcommand', token: 'frobnicate', path: 'cairn' }]);
  });

  it('fails a real flag on the wrong command', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn doctor --force', '```'].join('\n')));
    const findings = resolveCairnLine(lines[0], commandMap);
    expect(findings).toEqual([{ line: 2, class: 'cairn-flag', token: '--force', path: 'cairn doctor' }]);
  });

  it('picks the longer match on a prefix path (Review focus 2)', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn doctor fix --force', '```'].join('\n')));
    // --force belongs only to the longer path; resolving it against the shorter "cairn doctor"
    // would wrongly fail it.
    expect(resolveCairnLine(lines[0], commandMap)).toEqual([]);
  });

  it('names the continuation line a wrong flag is actually written on', () => {
    const segments = codeVoiceSegments(
      ['```bash', 'cairn doctor \\', '  --not-a-real-flag', '```'].join('\n'),
    );
    const lines = extractCairnLines(segments);
    const findings = resolveCairnLine(lines[0], commandMap);
    expect(findings).toEqual([
      { line: 3, class: 'cairn-flag', token: '--not-a-real-flag', path: 'cairn doctor' },
    ]);
  });

  it('accepts an inherited flag on a subcommand', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn doctor --verbose', '```'].join('\n')));
    expect(resolveCairnLine(lines[0], commandMap)).toEqual([]);
  });

  // A value-taking flag's value word sits right after the flag, in the same position a real
  // subcommand would occupy. `cairn doctor` has a child (`cairn doctor fix`), so the old
  // filter-first walk dropped `--json` before matching the path, then read `somewhere` as an
  // unrecognized subcommand of `cairn doctor`. The fix stops the path walk at the first flag, so
  // the word after it is never checked as a subcommand candidate.
  it('does not mistake a flag\'s value for the subcommand-position word', () => {
    const lines = extractCairnLines(
      codeVoiceSegments(['```bash', 'cairn doctor --json somewhere', '```'].join('\n')),
    );
    expect(resolveCairnLine(lines[0], commandMap)).toEqual([]);
  });
});

describe('the real cairn command map', () => {
  it('carries the root path with --version and --help', () => {
    const commandMap = cairnCommandFlags();
    expect(commandMap.get('cairn')?.has('--version')).toBe(true);
    expect(commandMap.get('cairn')?.has('--help')).toBe(true);
  });

  it('passes `cairn --version`', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn --version', '```'].join('\n')));
    expect(resolveCairnLine(lines[0], cairnCommandFlags())).toEqual([]);
  });

  it('passes `cairn help agents`: cobra\'s help command takes a command path, not a subcommand', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn help agents', '```'].join('\n')));
    expect(resolveCairnLine(lines[0], cairnCommandFlags())).toEqual([]);
  });

  it('passes `$ cairn doctor`', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', '$ cairn doctor', '```'].join('\n')));
    expect(resolveCairnLine(lines[0], cairnCommandFlags())).toEqual([]);
  });

  // Review focus: `adopt` is cobra.NoArgs and `--domain` is a real StringVar on it, so
  // `example.com` is the flag's value, not an unrecognized subcommand of `cairn adopt` (which
  // does have a real child, `cairn adopt list`, so the old bug fired here).
  it('passes `cairn adopt --domain example.com`, the flag value never read as a subcommand', () => {
    const lines = extractCairnLines(
      codeVoiceSegments(['```bash', 'cairn adopt --domain example.com', '```'].join('\n')),
    );
    expect(resolveCairnLine(lines[0], cairnCommandFlags())).toEqual([]);
  });

  // Review focus: `--color` is a real root flag that takes a value; `never` is that value, not an
  // unrecognized subcommand of the root (which does have real children, so the old bug fired here
  // too).
  it('passes `cairn --color never`, the flag value never read as a subcommand', () => {
    const lines = extractCairnLines(codeVoiceSegments(['```bash', 'cairn --color never', '```'].join('\n')));
    expect(resolveCairnLine(lines[0], cairnCommandFlags())).toEqual([]);
  });
});

describe('cairnCommandFlags guards an empty or absent input', () => {
  function scratchRoot(): string {
    return mkdtempSync(join(tmpdir(), 'cairn-command-flags-'));
  }

  it('throws when tool/testdata/flags.json is absent', () => {
    const dir = scratchRoot();
    try {
      expect(() => cairnCommandFlags(dir)).toThrow(/is missing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when the file carries no "commands" map', () => {
    const dir = scratchRoot();
    mkdirSync(join(dir, 'tool/testdata'), { recursive: true });
    writeFileSync(join(dir, 'tool/testdata/flags.json'), JSON.stringify({ target: 'make -C tool flags', flags: [] }));
    try {
      expect(() => cairnCommandFlags(dir)).toThrow(/carries no "commands" map/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('extractEnvVars', () => {
  it('extracts a real and a fake env var, both halves', () => {
    // The fake token is assembled at runtime, not written as one contiguous literal here: this
    // file itself is inside foundInSourceTree's search tree, and a literal fake token would
    // match its own occurrence in this assertion, defeating the negative half of the test.
    const fakeEnvVar = ['NOT_A', 'REAL_ENV', 'VAR_TOKEN'].join('_');
    const segments = codeVoiceSegments(`inline \`PUBLIC_ORIGIN\` and \`${fakeEnvVar}\` here`);
    const candidates = extractEnvVars(segments);
    const tokens = candidates.map((c) => c.token);
    expect(tokens).toContain('PUBLIC_ORIGIN');
    expect(tokens).toContain(fakeEnvVar);

    expect(foundInSourceTree('PUBLIC_ORIGIN')).toBe(true);
    expect(foundInSourceTree(fakeEnvVar)).toBe(false);
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
});

describe('extractFilePaths', () => {
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

  it('createCairnSiteFlags returns a non-empty set containing a known flag', () => {
    const flags = createCairnSiteFlags();
    expect(flags.size).toBeGreaterThan(0);
    expect(flags.has('dry-run')).toBe(true);
  });

  it('cairnToolFlags returns the Go tool\'s committed flag list, dashes stripped', () => {
    const flags = cairnToolFlags();
    expect(flags.size).toBeGreaterThan(0);
    expect(flags.has('expect-sites')).toBe(true);
    expect(flags.has('--expect-sites')).toBe(false);
  });

  it('cliFlagNames unions both CLIs and carries neither an invented flag', () => {
    const flags = cliFlagNames();
    expect(createCairnSiteFlags().has('expect-sites')).toBe(false);
    expect(cairnToolFlags().has('dry-run')).toBe(false);
    expect(flags.has('dry-run')).toBe(true);
    expect(flags.has('expect-sites')).toBe(true);
    expect(flags.has('no-such-flag')).toBe(false);
  });

  it('parseApiSurface returns a non-empty map containing a known export under the bare subpath', () => {
    const apiSurface = parseApiSurface();
    expect(apiSurface.size).toBeGreaterThan(0);
    expect(apiSurface.get('.')?.has('defineAdapter')).toBe(true);
  });
});

describe('the ALLOWLIST', () => {
  it('suppresses a token allowlisted under its own class key', () => {
    // '--prefix' is npm's own flag, not create-cairn-site's; it resolves against neither
    // registry, so only the allowlist keeps it from being reported.
    const flags = createCairnSiteFlags();
    expect(flags.has('prefix')).toBe(false);
    expect(ALLOWLIST.has('cli-flag:--prefix')).toBe(true);
  });

  it('does not suppress the same token under a different class key', () => {
    expect(ALLOWLIST.has('env-var:--prefix')).toBe(false);
  });
});

describe('cairnLineFindings', () => {
  // findUnresolvedSymbols' own per-file loop only ever runs over the real committed docs, which
  // are (by design) free of findings, so this is the only place the `file` attribution and the
  // composed `token` message get proven against a failing case at all.
  it('names the file and the line on a failing cairn line', () => {
    const commandMap = new Map([
      ['cairn', new Set(['--help'])],
      ['cairn doctor', new Set(['--help'])],
    ]);
    const segments = codeVoiceSegments(['prose', '```bash', 'cairn doctor --not-a-real-flag', '```'].join('\n'));
    const findings = cairnLineFindings('docs/admin/troubleshooting.md', segments, commandMap);
    expect(findings).toEqual([
      {
        file: 'docs/admin/troubleshooting.md',
        line: 3,
        class: 'cairn-flag',
        token: '--not-a-real-flag (not accepted by `cairn doctor`)',
      },
    ]);
  });

  it('returns nothing for a passing cairn line', () => {
    const commandMap = new Map([['cairn', new Set(['--version'])]]);
    const segments = codeVoiceSegments(['```bash', 'cairn --version', '```'].join('\n'));
    expect(cairnLineFindings('docs/README.md', segments, commandMap)).toEqual([]);
  });
});

describe('findUnresolvedSymbols', () => {
  // A whole-corpus scan, and it runs about 31 seconds against the published tracks, which is over
  // vitest's 30-second default. That default is nobody's budget for this test; racing it made the
  // suite fail on wall-clock rather than on a finding. The scan's own gate (`npm run check:symbols`)
  // runs the identical function outside vitest, so the ceiling here is only about not flaking.
  it('returns no findings on the real committed corpus', () => {
    expect(findUnresolvedSymbols()).toEqual([]);
  }, 120_000);
});
