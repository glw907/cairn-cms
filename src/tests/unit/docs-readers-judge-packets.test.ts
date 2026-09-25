import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  buildAdjudicatorPacket,
  buildAgreementPacket,
  buildCatchFields,
  buildCatchPacket,
  main as judgePacketsMain,
} from '../../../scripts/docs-readers/judge-packets.js';

/** A fresh scratch directory, removed by the caller. */
function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `docs-readers-judge-packets-${prefix}-`));
}

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Run one git command in a directory, returning trimmed stdout. */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** Commit every file in a fresh repository, returning the commit id. */
function commitAll(repoRoot: string): string {
  git(repoRoot, ['init', '-q']);
  git(repoRoot, ['config', 'user.email', 'source@example.com']);
  git(repoRoot, ['config', 'user.name', 'Source']);
  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', 'source commit']);
  return git(repoRoot, ['rev-parse', 'HEAD']);
}

/** Every file under a directory, as `{ path: content }`, for a whole-tree grep. */
function readTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(dir, { recursive: true }) as string[]) {
    const full = join(dir, name);
    if (lstatSync(full).isDirectory()) continue;
    out[name] = readFileSync(full, 'utf8');
  }
  return out;
}

describe('buildCatchFields', () => {
  it('allow-lists each field, giving diverged its quote, didInstead, and why', () => {
    const { fields, key } = buildCatchFields({
      stalls: [{ text: 'Could not find the timeout value.', blockedBy: null }],
      assumed: [{ text: 'Assumed the default port.', blockedBy: 'Bash(curl *)' }],
      diverged: [{ quote: { path: 'docs/guide.md', line: 4, text: 'Run the setup script.' }, didInstead: 'Ran it manually.', why: 'The script was denied.', blockedBy: 'Bash(setup.sh)' }],
      checks: [],
    });
    expect(fields.stalls).toEqual([{ id: 'item-1', field: 'stalls', text: 'Could not find the timeout value.', blockedBy: null }]);
    expect(fields.assumed).toEqual([{ id: 'item-2', field: 'assumed', text: 'Assumed the default port.', blockedBy: 'Bash(curl *)' }]);
    expect(fields.diverged).toEqual([
      {
        id: 'item-3',
        field: 'diverged',
        text: 'The script was denied.',
        blockedBy: 'Bash(setup.sh)',
        quote: { path: 'docs/guide.md', line: 4, text: 'Run the setup script.' },
        didInstead: 'Ran it manually.',
        why: 'The script was denied.',
      },
    ]);
    expect(fields.checks).toBeUndefined();
    expect(key).toEqual({
      'item-1': { field: 'stalls', sourceIndex: 0 },
      'item-2': { field: 'assumed', sourceIndex: 0 },
      'item-3': { field: 'diverged', sourceIndex: 0 },
    });
  });

  it('keeps checks[] only when the run filled it', () => {
    const { fields } = buildCatchFields({ checks: [{ text: 'A live check ran.', blockedBy: null }] });
    expect(fields.checks).toEqual([{ id: 'item-1', field: 'checks', text: 'A live check ran.', blockedBy: null }]);
  });
});

describe('buildCatchPacket', () => {
  it('drops a plant mentioned only in ruleCandidates[], and carries no model id, run id, batch name, or modelUsage', () => {
    // A saved report carries far more than RawRunFields; buildCatchFields only ever reads the
    // fields its own parameter type names, so the sentinel below, present only in ruleCandidates,
    // model, runId, batch, and modelUsage, can never reach the packet.
    const runLikeASavedReport = {
      id: 'a',
      class: 'docs-only',
      model: 'SENTINEL-MODEL-claude-opus-9-9',
      runId: 'SENTINEL-RUN-abc123',
      batch: 'SENTINEL-BATCH-validation',
      outcome: 'done',
      stalls: [{ text: 'Could not find the token TTL.', blockedBy: null }],
      assumed: [],
      diverged: [],
      checks: [],
      ruleCandidates: ['SENTINEL-RULECANDIDATE the docs never mention the token TTL'],
      modelUsage: { 'claude-opus-5-5': { inputTokens: 1, outputTokens: 2, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } },
    };
    const outDir = tmp('catch');
    try {
      const { key, expected } = buildCatchPacket({
        outDir,
        jobText: 'Find the token TTL.',
        plants: [{ plantId: 'P01', subject: 'token TTL', criterion: 'names the TTL as unstated', nearMiss: 'repeats a TTL value from the page', pageContent: '# Auth\n\nThe token lasts a while.\n' }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simulating a saved report's wider shape read off disk
        run: runLikeASavedReport as any,
      });
      expect(expected).toEqual([{ itemId: 'plant-1' }]);
      const tree: Record<string, string> = readTree(outDir);
      tree['key.json'] = JSON.stringify(key);
      const whole = Object.values(tree).join('\n');
      for (const sentinel of ['SENTINEL-MODEL', 'SENTINEL-RUN-abc123', 'SENTINEL-BATCH', 'SENTINEL-RULECANDIDATE', 'modelUsage']) {
        expect(whole, sentinel).not.toContain(sentinel);
      }
      expect(JSON.parse(tree['packet/items.json'])).not.toHaveProperty('checks');
      expect(existsSync(join(outDir, 'packet', 'pages', 'page.md'))).toBe(true);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('keeps items.json’s checks[] only when the run’s checks[] is non-empty', () => {
    const outDir = tmp('catch-checks');
    try {
      buildCatchPacket({
        outDir,
        jobText: 'Job.',
        plants: [{ plantId: 'P01', subject: 's', criterion: 'c', nearMiss: 'n', pageContent: 'page\n' }],
        run: { checks: [{ text: 'A live check ran.', blockedBy: null }] },
      });
      const items = JSON.parse(readFileSync(join(outDir, 'packet', 'items.json'), 'utf8'));
      expect(items.checks).toEqual([{ id: 'item-1', field: 'checks', text: 'A live check ran.', blockedBy: null }]);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('a held-out catch packet builds through the same function and passes the same checks', () => {
    const outDir = tmp('heldout');
    try {
      const { key, expected } = buildCatchPacket({
        outDir,
        jobText: 'Read the CLI reference and report the exit codes.',
        plants: [{ plantId: 'D01', subject: 'exit code and verdict agreement', criterion: 'says the relation is unstated', nearMiss: 'lists exit codes without naming the relation', pageContent: '# CLI JSON output\n\nThe payload carries a verdict.\n' }],
        run: { stalls: [{ text: 'Could not confirm the relation.', blockedBy: null }] },
      });
      expect(expected).toEqual([{ itemId: 'plant-1' }]);
      expect(key.plants['plant-1']).toEqual({ plantId: 'D01' });
      const whole = Object.values(readTree(outDir)).join('\n');
      for (const sentinel of ['modelUsage', 'runId', '"batch"']) expect(whole).not.toContain(sentinel);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('buildAdjudicatorPacket', () => {
  it('excludes the given items, writes the published tree with the planter exclusions applied, and names the published roots', () => {
    const repoRoot = tmp('adj-source');
    const outDir = tmp('adj-out');
    try {
      write(join(repoRoot, 'README.md'), 'root readme\n');
      write(join(repoRoot, 'docs', 'guide.md'), 'guide\n');
      write(join(repoRoot, 'docs', 'HISTORY.md'), 'rolling status, excluded from every export\n');
      write(join(repoRoot, 'src', 'lib', 'x.ts'), 'export const x = 1;\n');
      const commit = commitAll(repoRoot);

      const { key, expected } = buildAdjudicatorPacket({
        outDir,
        jobText: 'Read the guide and report any gap.',
        pageList: ['docs/guide.md'],
        absentList: [],
        run: {
          stalls: [{ text: 'Could not find the port.', blockedBy: null }],
          assumed: [{ text: 'Assumed https.', blockedBy: null }],
        },
        excludedKeys: [{ field: 'assumed', sourceIndex: 0 }],
        repoRoot,
        commit,
      });

      expect(expected).toEqual([{ itemId: 'item-1' }]);
      expect(key.excluded).toEqual(['item-2']);
      expect(existsSync(join(outDir, 'packet', 'tree', 'README.md'))).toBe(true);
      expect(existsSync(join(outDir, 'packet', 'tree', 'docs', 'HISTORY.md'))).toBe(false);
      const index = JSON.parse(readFileSync(join(outDir, 'packet', 'index.json'), 'utf8'));
      expect(index.publishedRoots).toEqual(['docs/']);
      const items = JSON.parse(readFileSync(join(outDir, 'packet', 'items.json'), 'utf8'));
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe('Could not find the port.');
    } finally {
      for (const dir of [repoRoot, outDir]) rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('buildAgreementPacket', () => {
  it('never carries primaryLabel, subjectGroupId, runId, or jobId, and names each item’s kind', () => {
    const outDir = tmp('agreement');
    try {
      const { key, expected } = buildAgreementPacket({
        outDir,
        sample: { findings: [{ itemId: 'f-1' }], catchCalls: [{ itemId: 'c-1' }] },
        findings: {
          'f-1': { jobText: 'Job text.', page: 'docs/guide.md', pageContent: 'guide content\n', item: { stalls: [{ text: 'stalled', blockedBy: null }] } },
        },
        catchCalls: {
          'c-1': {
            jobText: 'Job text.',
            page: 'docs/guide.md',
            pageContent: 'planted guide content\n',
            plant: { subject: 's', criterion: 'c', nearMiss: 'n' },
            run: { assumed: [{ text: 'assumed', blockedBy: null }] },
          },
        },
      });
      expect(expected).toEqual([
        { itemId: 'f-1', expectedKind: 'finding' },
        { itemId: 'c-1', expectedKind: 'catchCall' },
      ]);
      const whole = [...Object.values(readTree(outDir)), JSON.stringify(key)].join('\n');
      for (const forbidden of ['primaryLabel', 'subjectGroupId', 'runId', 'jobId']) expect(whole).not.toContain(forbidden);
      const index = JSON.parse(readFileSync(join(outDir, 'packet', 'index.json'), 'utf8'));
      expect(index.items).toEqual([
        { id: 'f-1', kind: 'finding' },
        { id: 'c-1', kind: 'catchCall' },
      ]);
      // The catch call's own run items carry ids distinct from the sampled itemId "c-1" itself.
      const catchCallItems = JSON.parse(readFileSync(join(outDir, 'packet', 'catchCalls', 'c-1', 'items.json'), 'utf8'));
      expect(catchCallItems.assumed[0].id).not.toBe('c-1');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('judge-packets.ts CLI', () => {
  it('builds a catch packet from a spec file', () => {
    const outDir = tmp('cli');
    const specPath = join(outDir, 'spec.json');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      specPath,
      JSON.stringify({
        jobText: 'Job.',
        plants: [{ plantId: 'P01', subject: 's', criterion: 'c', nearMiss: 'n', pageContent: 'page\n' }],
        run: { stalls: [] },
      }),
    );
    try {
      const packetDir = join(outDir, 'packet-out');
      const code = judgePacketsMain(['catch', '--out', packetDir, '--spec', specPath]);
      expect(code).toBe(0);
      expect(existsSync(join(packetDir, 'packet', 'plants.json'))).toBe(true);
      expect(existsSync(join(packetDir, 'key.json'))).toBe(true);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('refuses an unknown kind or a missing flag', () => {
    expect(judgePacketsMain(['bogus', '--out', '/tmp/x', '--spec', '/tmp/y'])).toBe(2);
    expect(judgePacketsMain(['catch'])).toBe(2);
  });
});
