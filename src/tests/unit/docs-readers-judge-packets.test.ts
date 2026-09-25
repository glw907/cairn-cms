import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
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

  it('normalizes a pass 1 report’s plain-string stalls[]/assumed[] entries, reusing the shared loader', () => {
    const { fields } = buildCatchFields({
      stalls: ['Many linked pages were not present.'],
      assumed: ['Assumed the magic link, not a GitHub sign-in.'],
    });
    expect(fields.stalls[0]).toMatchObject({ text: 'Many linked pages were not present.', blockedBy: null });
    expect(fields.assumed[0]).toMatchObject({ text: 'Assumed the magic link, not a GitHub sign-in.', blockedBy: null });
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
  it('builds from a real batch file, report file, and a git-committed page, and traces the key to its report', () => {
    const { repoRoot, commit } = pageRepo('docs/guide.md', '# Guide\n\nThe port is 5433.\n');
    const fixturesDir = tmp('catch-src-fixtures');
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
        plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a' },
        commit,
      });
      expect(expected).toEqual([{ itemId: 'plant-1' }]);
      expect(key.report).toEqual({ path: reportPath, jobId: 'job-a', attempt: 1, runId: 'SENTINEL-RUN-abc123' });
      expect(key.plants['plant-1']).toEqual({ plantId: 'P01' });
      expect(readFileSync(join(outDir, 'packet', 'pages', 'docs', 'guide.md'), 'utf8')).toContain('5433');
      const packetTree = readTree(join(outDir, 'packet'));
      const wholePacket = Object.values(packetTree).join('\n');
      expect(wholePacket).not.toContain('SENTINEL-MODEL');
      expect(wholePacket).not.toContain('SENTINEL-BATCH');
      // key.json legitimately carries the run id for traceability, outside the mount.
      expect(key.inputs[batchPath]).toHaveLength(64);
      expect(key.inputs[reportPath]).toHaveLength(64);
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
});

describe('buildAgreementPacket', () => {
  it('never carries primaryLabel, subjectGroupId, runId, or jobId inside the mount, allow-lists the catch call’s plant, and names each finding’s concerned page', () => {
    const { repoRoot, commit } = pageRepo('docs/guide.md', 'guide content\n');
    const fixturesDir = tmp('agreement-fixtures');
    const findingBatchPath = writeBatchFixture(fixturesDir, 'finding-job', 'Job text for the finding.');
    const findingReportPath = writeReportFixtureWithSentinels(fixturesDir, 'finding-job', { stalls: [{ text: 'stalled', blockedBy: null }], assumed: [], diverged: [], checks: [] });
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
    const samplePath = join(fixturesDir, 'agreement-sample.json');
    writeJsonFixture(samplePath, { findings: [{ itemId: 'f-1' }], catchCalls: [{ itemId: 'c-1' }] });

    const outDir = tmp('agreement-out');
    try {
      const { key, expected } = buildAgreementPacket({
        outDir,
        repoRoot,
        samplePath,
        findings: { 'f-1': { batchPath: findingBatchPath, reportPath: findingReportPath, jobId: 'finding-job', page: 'docs/guide.md', commit } },
        catchCalls: { 'c-1': { batchPath: callBatchPath, reportPath: callReportPath, jobId: 'call-job', page: 'docs/guide.md', commit, plant: { kind: 'planted', id: 'P07', plantsPath } } },
      });
      expect(expected).toEqual([
        { itemId: 'f-1', expectedKind: 'finding' },
        { itemId: 'c-1', expectedKind: 'catchCall' },
      ]);
      const packetTree = readTree(join(outDir, 'packet'));
      const wholePacket = Object.values(packetTree).join('\n');
      for (const forbidden of ['primaryLabel', 'subjectGroupId', 'runId', 'jobId', 'SENTINEL-MODEL', 'SENTINEL-BATCH', 'SENTINEL-ORIGINAL', 'SENTINEL-PLANTED', 'SENTINEL-PROOF']) {
        expect(wholePacket, forbidden).not.toContain(forbidden);
      }
      const plantJson = JSON.parse(packetTree['catchCalls/c-1/plant.json']);
      expect(plantJson).toEqual({ subject: 's', criterion: 'c', nearMiss: 'n' });
      const findingJob = JSON.parse(packetTree['findings/f-1/job.json']);
      expect(findingJob).toEqual({ text: 'Job text for the finding.', pageList: ['docs/guide.md'] });
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
        findings: { 'f-1': { batchPath, reportPath, jobId: 'finding-job', page: 'docs/guide.md', commit } },
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
    writeJsonFixture(specPath, { repoRoot, batchPath, reportPath, jobId: 'job-a', plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a' }, commit });
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
