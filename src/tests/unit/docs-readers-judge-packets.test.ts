import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertNewFieldItemCounts,
  buildAdjudicatorPacket,
  buildAgreementPacket,
  buildCatchFields,
  buildCatchPacket,
  buildCatchPacketFromResolved,
  publishedRootsFromPackageJson,
  resolveRunSource,
  main as judgePacketsMain,
} from '../../../scripts/docs-readers/judge-packets.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** A fresh scratch directory, removed by the caller. */
function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `docs-readers-judge-packets-${prefix}-`));
}

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Write a value as pretty-printed JSON, creating its parent directories. */
function writeJsonFixture(file: string, value: unknown): void {
  write(file, JSON.stringify(value, null, 2));
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

/** A tiny git repo holding one committed page, for git-show-based page reads. */
function pageRepo(pagePath: string, content: string): { repoRoot: string; commit: string } {
  const repoRoot = tmp('pages');
  write(join(repoRoot, pagePath), content);
  return { repoRoot, commit: commitAll(repoRoot) };
}

/** A batch.json fixture holding one job's text, at a path `buildCatchPacket`'s `batchPath` can read. */
function writeBatchFixture(dir: string, jobId: string, jobText: string): string {
  const path = join(dir, 'batch.json');
  writeJsonFixture(path, { name: 'fixture', jobs: [{ id: jobId, job: jobText }] });
  return path;
}

/**
 * A report.json fixture holding one job's run, its own `runId` and each job's `model`, `batch`
 * echo, and `ruleCandidates[]` filled with sentinels the packet must never carry inside its mount.
 */
function writeReportFixtureWithSentinels(dir: string, jobId: string, runFields: Record<string, unknown>): string {
  const path = join(dir, 'report.json');
  writeJsonFixture(path, {
    batch: 'SENTINEL-BATCH-validation',
    runId: 'SENTINEL-RUN-abc123',
    jobs: [{ id: jobId, model: 'SENTINEL-MODEL-claude-opus-9-9', modelUsage: { 'claude-opus-5-5': { inputTokens: 1 } }, ...runFields }],
  });
  return path;
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

const SENTINELS = ['SENTINEL-MODEL', 'SENTINEL-BATCH', 'SENTINEL-RULECANDIDATE', 'modelUsage'];

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

  it('refuses a checks[] entry with no text, rather than serializing the entry whole', () => {
    expect(() => buildCatchFields({ checks: [{ blockedBy: null, someOtherField: 'x' }] })).toThrow(/checks\[0\]/);
  });

  it('normalizes a pass 1 report’s plain-string stalls[]/assumed[] entries, reusing the shared loader', () => {
    const { fields } = buildCatchFields({
      stalls: ['Many linked pages were not present.'],
      assumed: ['Assumed the magic link, not a GitHub sign-in.'],
    });
    expect(fields.stalls[0]).toMatchObject({ text: 'Many linked pages were not present.', blockedBy: null });
    expect(fields.assumed[0]).toMatchObject({ text: 'Assumed the magic link, not a GitHub sign-in.', blockedBy: null });
  });

  it('allow-lists wrong[] and missing[], each under its own field name with no blockedBy, ids assigned after checks', () => {
    const { fields, key } = buildCatchFields({
      checks: [{ text: 'A live check ran.', blockedBy: null }],
      wrong: [{ quote: { path: 'docs/guide.md', line: 4, text: 'The port is 5432.' }, pageSays: 'The port is 5432.', actual: 'The port is 5433.', evidence: 'The config file sets PORT=5433.' }],
      missing: [{ quote: { path: 'docs/guide.md', line: 9, text: 'Restart the service.' }, needed: 'How to roll back a failed restart.', evidence: 'The job needed a rollback step and none is given.' }],
    });
    expect(fields.wrong).toEqual([
      {
        id: 'item-2',
        field: 'wrong',
        text: 'The config file sets PORT=5433.',
        blockedBy: null,
        quote: { path: 'docs/guide.md', line: 4, text: 'The port is 5432.' },
        pageSays: 'The port is 5432.',
        actual: 'The port is 5433.',
        evidence: 'The config file sets PORT=5433.',
      },
    ]);
    expect(fields.missing).toEqual([
      {
        id: 'item-3',
        field: 'missing',
        text: 'The job needed a rollback step and none is given.',
        blockedBy: null,
        quote: { path: 'docs/guide.md', line: 9, text: 'Restart the service.' },
        needed: 'How to roll back a failed restart.',
        evidence: 'The job needed a rollback step and none is given.',
      },
    ]);
    expect(key).toEqual({
      'item-1': { field: 'checks', sourceIndex: 0 },
      'item-2': { field: 'wrong', sourceIndex: 0 },
      'item-3': { field: 'missing', sourceIndex: 0 },
    });
  });
});

describe('assertNewFieldItemCounts', () => {
  it('passes when the composed items include every wrong[]/missing[] entry the source run carries', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the array lengths matter to this check
    const run = { wrong: [{}, {}], missing: [{}] } as any;
    expect(() => assertNewFieldItemCounts(run, [{ field: 'wrong' }, { field: 'wrong' }, { field: 'missing' }])).not.toThrow();
  });

  it('refuses a composed item list missing one of the source run’s wrong[] entries', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the array lengths matter to this check
    const run = { wrong: [{}, {}], missing: [] } as any;
    expect(() => assertNewFieldItemCounts(run, [{ field: 'wrong' }])).toThrow(/wrong\[\] item\(s\)/);
  });

  it('refuses a composed item list missing one of the source run’s missing[] entries', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the array lengths matter to this check
    const run = { wrong: [], missing: [{}, {}] } as any;
    expect(() => assertNewFieldItemCounts(run, [{ field: 'missing' }])).toThrow(/missing\[\] item\(s\)/);
  });
});

describe('resolveRunSource, on the real pass 1 fixture', () => {
  it('normalizes plain-string stalls[]/assumed[] off scripts/docs-readers/fixtures/saved-reports/pass1-trimmed.json', () => {
    const reportPath = join(ROOT, 'scripts/docs-readers/fixtures/saved-reports/pass1-trimmed.json');
    const resolved = resolveRunSource({ reportPath, jobId: 'evaluator-planted-1' });
    expect(resolved.runFields.stalls?.[0]).toMatchObject({ blockedBy: null });
    expect(typeof (resolved.runFields.stalls?.[0] as { text: string }).text).toBe('string');
    expect(resolved.runFields.assumed?.length).toBeGreaterThan(0);
    expect(resolved.attempt).toBe(1);
  });
});

describe('resolveRunSource: attempt selection and stoppedBy', () => {
  /** A report.json fixture with an explicit attempts[] array, for the final-attempt tests. */
  function writeAttemptsReportFixture(dir: string, jobId: string, job: Record<string, unknown>): string {
    const path = join(dir, 'report.json');
    writeJsonFixture(path, { batch: 'fixture', runId: 'r1', jobs: [{ id: jobId, model: 'claude-opus-5-5', ...job }] });
    return path;
  }

  it('selects the attempt marked final: true, not merely the last entry in attempts[]', () => {
    const dir = tmp('resolve-run-final');
    try {
      const reportPath = writeAttemptsReportFixture(dir, 'job-a', {
        attempts: [
          { cause: 'initial', final: false, transcript: 't1', stalls: [{ text: 'first attempt, not final', blockedBy: null }], assumed: [], diverged: [], checks: [] },
          { cause: 'unverified', final: true, transcript: 't2', stalls: [{ text: 'second attempt, final', blockedBy: null }], assumed: [], diverged: [], checks: [] },
        ],
      });
      const resolved = resolveRunSource({ reportPath, jobId: 'job-a' });
      expect(resolved.attempt).toBe(2);
      expect(resolved.runFields.stalls?.[0]).toMatchObject({ text: 'second attempt, final' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses a job that carries stoppedBy, which has no final attempt', () => {
    const dir = tmp('resolve-run-stopped');
    try {
      const reportPath = writeAttemptsReportFixture(dir, 'job-a', { stoppedBy: 'rateLimit', pendingCause: 'initial' });
      expect(() => resolveRunSource({ reportPath, jobId: 'job-a' })).toThrow(/stoppedBy/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('buildCatchPacketFromResolved (the documented fixture escape hatch)', () => {
  const REPORT_TRACE = { path: 'fixture-report.json', jobId: 'fixture-job', attempt: 1, runId: 'fixture-run' };

  it('drops a plant mentioned only in ruleCandidates[], and carries no model id, batch name, or modelUsage inside the mount', () => {
    const runLikeASavedReport = {
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
      const { key, expected } = buildCatchPacketFromResolved({
        outDir,
        jobText: 'Find the token TTL.',
        plants: [{ plantId: 'P01', subject: 'token TTL', criterion: 'names the TTL as unstated', nearMiss: 'repeats a TTL value from the page', page: 'auth.md', pageContent: '# Auth\n\nThe token lasts a while.\n' }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simulating a saved report's wider shape read off disk
        run: runLikeASavedReport as any,
        report: REPORT_TRACE,
      });
      expect(expected).toEqual([{ itemId: 'plant-1' }]);
      const packetTree = readTree(join(outDir, 'packet'));
      const wholePacket = Object.values(packetTree).join('\n');
      for (const sentinel of SENTINELS) expect(wholePacket, sentinel).not.toContain(sentinel);
      expect(JSON.parse(packetTree['items.json'])).not.toHaveProperty('checks');
      expect(existsSync(join(outDir, 'packet', 'pages', 'auth.md'))).toBe(true);
      expect(key.report).toEqual(REPORT_TRACE);
      expect(key.builtFrom).toBe('fixture');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('keeps items.json’s checks[] only when the run’s checks[] is non-empty', () => {
    const outDir = tmp('catch-checks');
    try {
      buildCatchPacketFromResolved({
        outDir,
        jobText: 'Job.',
        plants: [{ plantId: 'P01', subject: 's', criterion: 'c', nearMiss: 'n', page: 'page.md', pageContent: 'page\n' }],
        run: { checks: [{ text: 'A live check ran.', blockedBy: null }] },
        report: REPORT_TRACE,
      });
      const items = JSON.parse(readFileSync(join(outDir, 'packet', 'items.json'), 'utf8'));
      expect(items.checks).toEqual([{ id: 'item-1', field: 'checks', text: 'A live check ran.', blockedBy: null }]);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('rejects an absolute or ".."-bearing page path', () => {
    const outDir = tmp('catch-unsafe-page');
    try {
      expect(() =>
        buildCatchPacketFromResolved({
          outDir,
          jobText: 'Job.',
          plants: [{ plantId: 'P01', subject: 's', criterion: 'c', nearMiss: 'n', page: '/etc/passwd', pageContent: 'x' }],
          run: {},
          report: REPORT_TRACE,
        }),
      ).toThrow(/must be relative/);
      expect(() =>
        buildCatchPacketFromResolved({
          outDir,
          jobText: 'Job.',
          plants: [{ plantId: 'P01', subject: 's', criterion: 'c', nearMiss: 'n', page: '../outside.md', pageContent: 'x' }],
          run: {},
          report: REPORT_TRACE,
        }),
      ).toThrow(/must not contain/);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('writes a single-page job’s page under its real relative path, not a placeholder', () => {
    const outDir = tmp('catch-real-path');
    try {
      buildCatchPacketFromResolved({
        outDir,
        jobText: 'Job.',
        plants: [{ plantId: 'P01', subject: 's', criterion: 'c', nearMiss: 'n', page: 'docs/admin/is-it-working.md', pageContent: 'content\n' }],
        run: {},
        report: REPORT_TRACE,
      });
      expect(existsSync(join(outDir, 'packet', 'pages', 'docs', 'admin', 'is-it-working.md'))).toBe(true);
      const plants = JSON.parse(readFileSync(join(outDir, 'packet', 'plants.json'), 'utf8'));
      // A single-page job's plant entry omits `page`, since there is only one page in the packet.
      expect(plants[0]).not.toHaveProperty('page');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('buildCatchPacket (source-based)', () => {
  it('reads the planted page from the planted root, never the pinned commit’s original text', () => {
    // The pinned commit holds the ORIGINAL page (port 5432); the planted root holds the PLANTED
    // page the reader actually saw (port 5433, the plant). git show at the pinned commit alone
    // would return the original text, hiding the plant entirely.
    const { repoRoot, commit } = pageRepo('docs/guide.md', '# Guide\n\nThe port is 5432.\n');
    const fixturesDir = tmp('catch-src-fixtures');
    const plantedRoot = join(fixturesDir, 'planted', 'job-a');
    write(join(plantedRoot, 'docs/guide.md'), '# Guide\n\nThe port is 5433.\n');
    const batchPath = writeBatchFixture(fixturesDir, 'job-a', 'Find the port.');
    const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'job-a', {
      stalls: [],
      assumed: [{ text: 'Assumed 5432, since the guide’s 5433 looked wrong.', blockedBy: null }],
      diverged: [],
      checks: [],
      ruleCandidates: ['SENTINEL-RULECANDIDATE'],
    });
    const criteriaPath = join(fixturesDir, 'dev-plants.json');
    writeJsonFixture(criteriaPath, [{ id: 'P01', page: 'docs/guide.md', line: 4, subject: 'port', criterion: 'names the port as wrong', nearMiss: 'repeats 5433' }]);
    const indexPath = join(fixturesDir, 'dev-plants-index.json');
    writeJsonFixture(indexPath, [{ id: 'P01', job: 'job-a', page: 'docs/guide.md', line: 4 }]);
    const outDir = tmp('catch-src-out');
    try {
      const { key, expected } = buildCatchPacket({
        outDir,
        repoRoot,
        batchPath,
        reportPath,
        jobId: 'job-a',
        plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a', plantedRoot },
        commit,
      });
      expect(expected).toEqual([{ itemId: 'plant-1' }]);
      expect(key.report).toEqual({ path: reportPath, jobId: 'job-a', attempt: 1, runId: 'SENTINEL-RUN-abc123' });
      expect(key.builtFrom).toBe('sources');
      expect(key.plants['plant-1']).toEqual({ plantId: 'P01' });
      // The packet carries the PLANTED text (5433), not the pinned commit's original (5432).
      const pageInPacket = readFileSync(join(outDir, 'packet', 'pages', 'docs', 'guide.md'), 'utf8');
      expect(pageInPacket).toContain('5433');
      expect(pageInPacket).not.toContain('5432');
      const packetTree = readTree(join(outDir, 'packet'));
      const wholePacket = Object.values(packetTree).join('\n');
      expect(wholePacket).not.toContain('SENTINEL-MODEL');
      expect(wholePacket).not.toContain('SENTINEL-BATCH');
      // key.json legitimately carries the run id for traceability, outside the mount, and the
      // planted page's own real filesystem path among its hashed inputs.
      expect(key.inputs[batchPath]).toHaveLength(64);
      expect(key.inputs[reportPath]).toHaveLength(64);
      expect(key.inputs[join(plantedRoot, 'docs/guide.md')]).toHaveLength(64);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('throws, naming the missing path, when a plant’s page is absent from the planted root (the builder never reads an unplanted page)', () => {
    const { repoRoot, commit } = pageRepo('docs/other.md', '# Other\n\nUnplanted, original text.\n');
    const fixturesDir = tmp('catch-missing-fixtures');
    const plantedRoot = join(fixturesDir, 'planted', 'job-a'); // exists, but never gets docs/other.md
    mkdirSync(plantedRoot, { recursive: true });
    const batchPath = writeBatchFixture(fixturesDir, 'job-a', 'Job.');
    const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'job-a', { stalls: [], assumed: [], diverged: [], checks: [] });
    const criteriaPath = join(fixturesDir, 'dev-plants.json');
    writeJsonFixture(criteriaPath, [{ id: 'P01', page: 'docs/other.md', line: 1, subject: 's', criterion: 'c', nearMiss: 'n' }]);
    const indexPath = join(fixturesDir, 'dev-plants-index.json');
    writeJsonFixture(indexPath, [{ id: 'P01', job: 'job-a', page: 'docs/other.md', line: 1 }]);
    const outDir = tmp('catch-missing-out');
    try {
      expect(() =>
        buildCatchPacket({
          outDir,
          repoRoot,
          batchPath,
          reportPath,
          jobId: 'job-a',
          plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a', plantedRoot },
          commit,
        }),
      ).toThrow(join(plantedRoot, 'docs/other.md'));
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('builds a held-out packet from a fixture criteria entry and a page read at its own pinned commit, with the same sentinel guarantees as a planted run', () => {
    const { repoRoot, commit } = pageRepo('docs/reference/cli-cairn-json-output.md', '# CLI JSON output\n\nThe payload carries a verdict.\n');
    const fixturesDir = tmp('heldout-src-fixtures');
    const batchPath = writeBatchFixture(fixturesDir, 'scripter-heldout', 'Read the CLI reference and report the exit codes.');
    const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'scripter-heldout', {
      stalls: [{ text: 'Could not confirm the relation.', blockedBy: null }],
      assumed: [],
      diverged: [],
      checks: [],
      ruleCandidates: ['SENTINEL-RULECANDIDATE the docs never mention the relation'],
    });
    const criteriaPath = join(fixturesDir, 'heldout.json');
    writeJsonFixture(criteriaPath, [
      { id: 'D01', page: 'docs/reference/cli-cairn-json-output.md', commit, subject: 'exit code and verdict agreement', criterion: 'says the relation is unstated', nearMiss: 'lists exit codes without naming the relation' },
    ]);
    const outDir = tmp('heldout-src-out');
    try {
      const { key, expected } = buildCatchPacket({
        outDir,
        repoRoot,
        batchPath,
        reportPath,
        jobId: 'scripter-heldout',
        plants: { kind: 'heldout', criteriaPath, ids: ['D01'] },
        commit: 'unused-because-heldout-overrides',
      });
      expect(expected).toEqual([{ itemId: 'plant-1' }]);
      expect(key.plants['plant-1']).toEqual({ plantId: 'D01' });
      const packetTree = readTree(join(outDir, 'packet'));
      const wholePacket = Object.values(packetTree).join('\n');
      for (const sentinel of SENTINELS) expect(wholePacket, sentinel).not.toContain(sentinel);
      expect(readFileSync(join(outDir, 'packet', 'pages', 'docs', 'reference', 'cli-cairn-json-output.md'), 'utf8')).toContain('verdict');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('publishedRootsFromPackageJson', () => {
  it('derives only the docs-prefixed files[] entries at the pinned commit, never CHANGELOG.md or a non-docs entry', () => {
    const repoRoot = tmp('pkg-roots');
    write(
      join(repoRoot, 'package.json'),
      JSON.stringify({ files: ['dist', 'migrations', 'CHANGELOG.md', 'docs/README.md', 'docs/why-cairn.md', 'docs/reference', 'docs/admin'] }),
    );
    const commit = commitAll(repoRoot);
    try {
      expect(publishedRootsFromPackageJson(repoRoot, commit)).toEqual(['docs/README.md', 'docs/why-cairn.md', 'docs/reference', 'docs/admin']);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('buildAdjudicatorPacket', () => {
  it('excludes the given items, derives the published roots from package.json, and prunes the tree to those roots plus the code', () => {
    const repoRoot = tmp('adj-source');
    write(join(repoRoot, 'package.json'), JSON.stringify({ files: ['docs/README.md', 'docs/reference', 'CHANGELOG.md'] }));
    write(join(repoRoot, 'README.md'), 'root readme\n');
    write(join(repoRoot, 'docs', 'README.md'), 'published docs readme\n');
    write(join(repoRoot, 'docs', 'reference', 'log.md'), 'published reference page\n');
    write(join(repoRoot, 'docs', 'admin', 'guide.md'), 'NOT published: docs/admin is not in files[]\n');
    write(join(repoRoot, 'docs', 'HISTORY.md'), 'rolling status, excluded from every export\n');
    write(join(repoRoot, 'src', 'lib', 'x.ts'), 'export const x = 1;\n');
    const commit = commitAll(repoRoot);

    const fixturesDir = tmp('adj-fixtures');
    const batchPath = writeBatchFixture(fixturesDir, 'job-a', 'Read the guide and report any gap.');
    const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'job-a', {
      stalls: [{ text: 'Could not find the port.', blockedBy: null }],
      assumed: [{ text: 'Assumed https.', blockedBy: null }],
      diverged: [],
      checks: [],
    });
    const outDir = tmp('adj-out');
    try {
      const { key, expected } = buildAdjudicatorPacket({
        outDir,
        repoRoot,
        batchPath,
        reportPath,
        jobId: 'job-a',
        pageList: ['docs/README.md'],
        absentList: [],
        excludedKeys: [{ field: 'assumed', sourceIndex: 0 }],
        commit,
      });

      expect(expected).toEqual([{ itemId: 'item-1' }]);
      expect(key.excluded).toEqual(['item-2']);
      expect(key.report).toEqual({ path: reportPath, jobId: 'job-a', attempt: 1, runId: 'SENTINEL-RUN-abc123' });
      expect(key.builtFrom).toBe('sources');
      expect(existsSync(join(outDir, 'packet', 'tree', 'README.md'))).toBe(true);
      expect(existsSync(join(outDir, 'packet', 'tree', 'src', 'lib', 'x.ts'))).toBe(true);
      expect(existsSync(join(outDir, 'packet', 'tree', 'docs', 'README.md'))).toBe(true);
      expect(existsSync(join(outDir, 'packet', 'tree', 'docs', 'reference', 'log.md'))).toBe(true);
      // docs/admin and docs/HISTORY.md are both absent: neither is a published root.
      expect(existsSync(join(outDir, 'packet', 'tree', 'docs', 'admin'))).toBe(false);
      expect(existsSync(join(outDir, 'packet', 'tree', 'docs', 'HISTORY.md'))).toBe(false);
      const index = JSON.parse(readFileSync(join(outDir, 'packet', 'index.json'), 'utf8'));
      expect(index.publishedRoots).toEqual(['docs/README.md', 'docs/reference']);
      const items = JSON.parse(readFileSync(join(outDir, 'packet', 'items.json'), 'utf8'));
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe('Could not find the port.');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('builds from the real smoke-2a fixture, carrying its wrong[] and missing[] items under their own field names and no ruleCandidates[] entry', () => {
    const reportPath = join(ROOT, 'scripts/docs-readers/fixtures/saved-reports/smoke-2a.json');
    const smokeReport = JSON.parse(readFileSync(reportPath, 'utf8')) as { jobs: Array<{ id: string; ruleCandidates?: string[] }> };
    const ruleCandidates = smokeReport.jobs.find((j) => j.id === 'scripter-control-1')?.ruleCandidates ?? [];
    expect(ruleCandidates.length).toBeGreaterThan(0);

    const repoRoot = tmp('smoke-adj-repo');
    write(join(repoRoot, 'package.json'), JSON.stringify({ files: ['docs/README.md'] }));
    write(join(repoRoot, 'docs', 'README.md'), 'readme\n');
    const commit = commitAll(repoRoot);
    const fixturesDir = tmp('smoke-adj-fixtures');
    const batchPath = writeBatchFixture(fixturesDir, 'scripter-control-1', 'Job text for the scripter control run.');
    const outDir = tmp('smoke-adj-out');
    try {
      buildAdjudicatorPacket({ outDir, repoRoot, batchPath, reportPath, jobId: 'scripter-control-1', pageList: [], absentList: [], commit });
      const items = JSON.parse(readFileSync(join(outDir, 'packet', 'items.json'), 'utf8')) as Array<{ field: string }>;
      expect(items.filter((item) => item.field === 'wrong')).toHaveLength(5);
      expect(items.filter((item) => item.field === 'missing')).toHaveLength(4);
      const wholePacket = Object.values(readTree(join(outDir, 'packet'))).join('\n');
      for (const candidate of ruleCandidates) expect(wholePacket).not.toContain(candidate);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('a wrong[]-only or missing[]-only report reaches every packet kind under its own field name', () => {
  const CASES: Array<{ field: 'wrong' | 'missing'; run: Record<string, unknown> }> = [
    {
      field: 'wrong',
      run: { wrong: [{ quote: { path: 'docs/guide.md', line: 4, text: 'The port is 5432.' }, pageSays: 'The port is 5432.', actual: 'The port is 5433.', evidence: 'The config sets 5433.' }] },
    },
    {
      field: 'missing',
      run: { missing: [{ quote: { path: 'docs/guide.md', line: 3, text: 'The port is 5432.' }, needed: 'How to roll back a failed restart.', evidence: 'No rollback step is given.' }] },
    },
  ];

  for (const { field, run } of CASES) {
    it(`builds catch, adjudicator, and agreement packets carrying the ${field}[] item under "${field}"`, () => {
      const { repoRoot, commit } = pageRepo('docs/guide.md', '# Guide\n\nThe port is 5432.\n');
      const fixturesDir = tmp(`${field}-only-fixtures`);
      const batchPath = writeBatchFixture(fixturesDir, 'job-a', 'Find the port.');
      const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'job-a', { stalls: [], assumed: [], diverged: [], checks: [], ...run });
      const criteriaPath = join(fixturesDir, 'dev-plants.json');
      writeJsonFixture(criteriaPath, [{ id: 'P01', page: 'docs/guide.md', line: 4, subject: 'port', criterion: 'names the port as wrong', nearMiss: 'repeats 5433' }]);
      const indexPath = join(fixturesDir, 'dev-plants-index.json');
      writeJsonFixture(indexPath, [{ id: 'P01', job: 'job-a', page: 'docs/guide.md', line: 4 }]);
      const plantedRoot = join(fixturesDir, 'planted', 'job-a');
      write(join(plantedRoot, 'docs/guide.md'), '# Guide\n\nThe port is 5432.\n');

      const catchOut = tmp(`${field}-only-catch`);
      const adjOut = tmp(`${field}-only-adj`);
      const agreementOut = tmp(`${field}-only-agreement`);
      try {
        buildCatchPacket({
          outDir: catchOut,
          repoRoot,
          batchPath,
          reportPath,
          jobId: 'job-a',
          plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a', plantedRoot },
          commit,
        });
        const catchItems = JSON.parse(readFileSync(join(catchOut, 'packet', 'items.json'), 'utf8')) as Record<string, Array<{ field: string }>>;
        expect(catchItems[field]).toHaveLength(1);

        buildAdjudicatorPacket({ outDir: adjOut, repoRoot, batchPath, reportPath, jobId: 'job-a', pageList: ['docs/guide.md'], absentList: [], commit, publishedRoots: ['docs/guide.md'] });
        const adjItems = JSON.parse(readFileSync(join(adjOut, 'packet', 'items.json'), 'utf8')) as Array<{ field: string }>;
        expect(adjItems.filter((item) => item.field === field)).toHaveLength(1);

        const samplePath = join(fixturesDir, 'agreement-sample.json');
        writeJsonFixture(samplePath, { findings: [{ itemId: 'f-1' }], catchCalls: [] });
        buildAgreementPacket({
          outDir: agreementOut,
          repoRoot,
          samplePath,
          findings: { 'f-1': { batchPath, reportPath, jobId: 'job-a', field, sourceIndex: 0, page: 'docs/guide.md', commit } },
          catchCalls: {},
        });
        const agreementItem = JSON.parse(readFileSync(join(agreementOut, 'packet', 'findings', 'f-1', 'item.json'), 'utf8'));
        expect(agreementItem.field).toBe(field);
      } finally {
        rmSync(repoRoot, { recursive: true, force: true });
        rmSync(fixturesDir, { recursive: true, force: true });
        rmSync(catchOut, { recursive: true, force: true });
        rmSync(adjOut, { recursive: true, force: true });
        rmSync(agreementOut, { recursive: true, force: true });
      }
    });
  }
});

describe('buildAgreementPacket', () => {
  it('never carries primaryLabel, subjectGroupId, runId, or jobId inside the mount, allow-lists the catch call’s plant, samples one finding item and names its concerned page and the job’s full pageList', () => {
    const { repoRoot, commit } = pageRepo('docs/guide.md', 'guide content\n');
    const fixturesDir = tmp('agreement-fixtures');
    const findingBatchPath = join(fixturesDir, 'finding-batch.json');
    writeJsonFixture(findingBatchPath, { name: 'fixture', jobs: [{ id: 'finding-job', job: 'Job text for the finding.', docsSet: ['docs/guide.md', 'docs/other.md'] }] });
    // Several catch-field items on the run: the sample draws exactly one (assumed[0]), by field and sourceIndex.
    const findingReportPath = writeReportFixtureWithSentinels(fixturesDir, 'finding-job', {
      stalls: [{ text: 'stalled', blockedBy: null }],
      assumed: [{ text: 'the sampled item', blockedBy: null }, { text: 'a second, unsampled item', blockedBy: null }],
      diverged: [],
      checks: [],
    });
    const callBatchPath = join(fixturesDir, 'call-batch.json');
    writeJsonFixture(callBatchPath, { name: 'fixture', jobs: [{ id: 'call-job', job: 'Job text for the catch call.' }] });
    const callReportPath = join(fixturesDir, 'call-report.json');
    writeJsonFixture(callReportPath, {
      batch: 'SENTINEL-BATCH-2', runId: 'SENTINEL-RUN-2',
      jobs: [{ id: 'call-job', model: 'SENTINEL-MODEL-2', stalls: [], assumed: [{ text: 'assumed', blockedBy: null }], diverged: [], checks: [] }],
    });
    const plantsPath = join(fixturesDir, 'plants.json');
    writeJsonFixture(plantsPath, [
      { id: 'P07', job: 'call-job', page: 'docs/guide.md', line: 1, type: 'false-behavior', semantic: true, subject: 's', original: 'SENTINEL-ORIGINAL', planted: 'SENTINEL-PLANTED', proof: 'SENTINEL-PROOF', criterion: 'c', nearMiss: 'n' },
    ]);
    const callPlantedRoot = join(fixturesDir, 'planted', 'call-job');
    write(join(callPlantedRoot, 'docs/guide.md'), 'guide content\n');
    // The sample, in its pinned shape: every field the pool draws, sentinel-valued, none of which
    // the packet may carry (the builder reads only itemId off each entry).
    const samplePath = join(fixturesDir, 'agreement-sample.json');
    writeJsonFixture(samplePath, {
      orderingLabel: 'docs-reset-1b-agreement',
      findings: [{ itemId: 'f-1', runId: 'SENTINEL-SAMPLE-RUNID', jobId: 'SENTINEL-SAMPLE-JOBID', primaryLabel: 'SENTINEL-SAMPLE-LABEL' }],
      catchCalls: [{ itemId: 'c-1', runId: 'SENTINEL-SAMPLE-RUNID', jobId: 'SENTINEL-SAMPLE-JOBID', primaryLabel: 'SENTINEL-SAMPLE-LABEL' }],
      notes: [],
    });

    const outDir = tmp('agreement-out');
    try {
      const { key, expected } = buildAgreementPacket({
        outDir,
        repoRoot,
        samplePath,
        findings: { 'f-1': { batchPath: findingBatchPath, reportPath: findingReportPath, jobId: 'finding-job', field: 'assumed', sourceIndex: 0, page: 'docs/guide.md', commit } },
        catchCalls: { 'c-1': { batchPath: callBatchPath, reportPath: callReportPath, jobId: 'call-job', page: 'docs/guide.md', plantedRoot: callPlantedRoot, plant: { kind: 'planted', id: 'P07', plantsPath } } },
      });
      expect(expected).toEqual([
        { itemId: 'f-1', expectedKind: 'finding' },
        { itemId: 'c-1', expectedKind: 'catchCall' },
      ]);
      const packetTree = readTree(join(outDir, 'packet'));
      const wholePacket = Object.values(packetTree).join('\n');
      for (const forbidden of [
        'primaryLabel',
        'subjectGroupId',
        'runId',
        'jobId',
        'SENTINEL-MODEL',
        'SENTINEL-BATCH',
        'SENTINEL-ORIGINAL',
        'SENTINEL-PLANTED',
        'SENTINEL-PROOF',
        'SENTINEL-SAMPLE-RUNID',
        'SENTINEL-SAMPLE-JOBID',
        'SENTINEL-SAMPLE-LABEL',
      ]) {
        expect(wholePacket, forbidden).not.toContain(forbidden);
      }
      const plantJson = JSON.parse(packetTree['catchCalls/c-1/plant.json']);
      expect(plantJson).toEqual({ subject: 's', criterion: 'c', nearMiss: 'n' });
      // Exactly the one sampled item, never the run's other assumed[] entry or its stalls[].
      const findingItem = JSON.parse(packetTree['findings/f-1/item.json']);
      expect(findingItem).toMatchObject({ field: 'assumed', text: 'the sampled item' });
      const findingJob = JSON.parse(packetTree['findings/f-1/job.json']);
      expect(findingJob).toEqual({ text: 'Job text for the finding.', pageList: ['docs/guide.md', 'docs/other.md'], page: 'docs/guide.md' });
      const index = JSON.parse(packetTree['index.json']);
      expect(index.items).toEqual([
        { id: 'f-1', kind: 'finding', page: 'docs/guide.md' },
        { id: 'c-1', kind: 'catchCall' },
      ]);
      // The catch call's own run items carry ids distinct from the sampled itemId "c-1" itself.
      const catchCallItems = JSON.parse(packetTree['catchCalls/c-1/items.json']);
      expect(catchCallItems.assumed[0].id).not.toBe('c-1');
      expect(key.findings['f-1'].report).toEqual({ path: findingReportPath, jobId: 'finding-job', attempt: 1, runId: 'SENTINEL-RUN-abc123' });
      expect(key.catchCalls['c-1'].plantId).toBe('P07');
      expect(key.builtFrom).toBe('sources');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('reads the catch call’s planted page from the planted root, never the pinned commit’s original', () => {
    const { repoRoot } = pageRepo('docs/guide.md', 'original, unplanted text\n');
    const fixturesDir = tmp('agreement-planted-fixtures');
    const plantedRoot = join(fixturesDir, 'planted', 'call-job');
    write(join(plantedRoot, 'docs/guide.md'), 'planted text the reader actually saw\n');
    const callBatchPath = join(fixturesDir, 'call-batch.json');
    writeJsonFixture(callBatchPath, { name: 'fixture', jobs: [{ id: 'call-job', job: 'Job text.' }] });
    const callReportPath = join(fixturesDir, 'call-report.json');
    writeJsonFixture(callReportPath, { batch: 'fixture', runId: 'r1', jobs: [{ id: 'call-job', model: 'claude-opus-5-5', stalls: [], assumed: [{ text: 'assumed', blockedBy: null }], diverged: [], checks: [] }] });
    const plantsPath = join(fixturesDir, 'plants.json');
    writeJsonFixture(plantsPath, [{ id: 'P07', job: 'call-job', page: 'docs/guide.md', line: 1, subject: 's', criterion: 'c', nearMiss: 'n' }]);
    const samplePath = join(fixturesDir, 'agreement-sample.json');
    writeJsonFixture(samplePath, { orderingLabel: 'docs-reset-1b-agreement', findings: [], catchCalls: [{ itemId: 'c-1' }], notes: [] });

    const outDir = tmp('agreement-planted-out');
    try {
      buildAgreementPacket({
        outDir,
        repoRoot,
        samplePath,
        findings: {},
        catchCalls: { 'c-1': { batchPath: callBatchPath, reportPath: callReportPath, jobId: 'call-job', page: 'docs/guide.md', plant: { kind: 'planted', id: 'P07', plantsPath }, plantedRoot } },
      });
      const pageInPacket = readFileSync(join(outDir, 'packet', 'catchCalls', 'c-1', 'page.md'), 'utf8');
      expect(pageInPacket).toContain('planted text');
      expect(pageInPacket).not.toContain('original, unplanted');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('states the published roots in the packet index whenever a tree is given', () => {
    const { repoRoot, commit } = pageRepo('docs/guide.md', 'guide content\n');
    write(join(repoRoot, 'package.json'), JSON.stringify({ files: ['docs/README.md'] }));
    write(join(repoRoot, 'docs', 'README.md'), 'readme\n');
    git(repoRoot, ['add', '-A']);
    git(repoRoot, ['commit', '-q', '-m', 'add package.json']);
    const treeCommit = git(repoRoot, ['rev-parse', 'HEAD']);

    const fixturesDir = tmp('agreement-tree-fixtures');
    const batchPath = writeBatchFixture(fixturesDir, 'finding-job', 'Job text.');
    const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'finding-job', { stalls: [{ text: 'stalled', blockedBy: null }], assumed: [], diverged: [], checks: [] });
    const samplePath = join(fixturesDir, 'agreement-sample.json');
    writeJsonFixture(samplePath, { findings: [{ itemId: 'f-1' }], catchCalls: [] });

    const outDir = tmp('agreement-tree-out');
    try {
      buildAgreementPacket({
        outDir,
        repoRoot,
        samplePath,
        findings: { 'f-1': { batchPath, reportPath, jobId: 'finding-job', field: 'stalls', sourceIndex: 0, page: 'docs/guide.md', commit } },
        catchCalls: {},
        tree: { commit: treeCommit },
      });
      const index = JSON.parse(readFileSync(join(outDir, 'packet', 'index.json'), 'utf8'));
      expect(index.publishedRoots).toEqual(['docs/README.md']);
      expect(existsSync(join(outDir, 'packet', 'tree', 'docs', 'README.md'))).toBe(true);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

describe('judge-packets.ts CLI', () => {
  it('builds a catch packet from a source-based spec file', () => {
    const { repoRoot, commit } = pageRepo('docs/guide.md', 'guide content\n');
    const fixturesDir = tmp('cli-fixtures');
    const batchPath = writeBatchFixture(fixturesDir, 'job-a', 'Job.');
    const reportPath = writeReportFixtureWithSentinels(fixturesDir, 'job-a', { stalls: [], assumed: [], diverged: [], checks: [] });
    const criteriaPath = join(fixturesDir, 'dev-plants.json');
    writeJsonFixture(criteriaPath, [{ id: 'P01', page: 'docs/guide.md', line: 1, subject: 's', criterion: 'c', nearMiss: 'n' }]);
    const indexPath = join(fixturesDir, 'dev-plants-index.json');
    writeJsonFixture(indexPath, [{ id: 'P01', job: 'job-a', page: 'docs/guide.md', line: 1 }]);
    const specPath = join(fixturesDir, 'spec.json');
    const plantedRoot = join(fixturesDir, 'planted', 'job-a');
    write(join(plantedRoot, 'docs/guide.md'), 'guide content\n');
    writeJsonFixture(specPath, { repoRoot, batchPath, reportPath, jobId: 'job-a', plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a', plantedRoot }, commit });
    const packetDir = join(fixturesDir, 'packet-out');
    try {
      const code = judgePacketsMain(['catch', '--out', packetDir, '--spec', specPath]);
      expect(code).toBe(0);
      expect(existsSync(join(packetDir, 'packet', 'plants.json'))).toBe(true);
      expect(existsSync(join(packetDir, 'key.json'))).toBe(true);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
      rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('refuses an unknown kind or a missing flag', () => {
    expect(judgePacketsMain(['bogus', '--out', '/tmp/x', '--spec', '/tmp/y'])).toBe(2);
    expect(judgePacketsMain(['catch'])).toBe(2);
  });
});
