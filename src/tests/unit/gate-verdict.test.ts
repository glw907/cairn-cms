// The gate's reader: only four `pass` rows under one run id clear it, a row it cannot parse fails
// it with the reason, and the script runs from a checkout holding only itself and record.mjs.
import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { renderGateSection } from '../../../scripts/gate/record.mjs';
import { verdict } from '../../../scripts/gate/verdict.mjs';

const execFileAsync = promisify(execFile);
const scripts = path.resolve(__dirname, '../../../scripts/gate');
const rc3 = path.resolve(__dirname, 'fixtures/gate-pages/release-body-v0.99.0-rc.3.md');

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

const row = (leg: string, overrides: Record<string, string> = {}) => ({
  leg,
  path: '/about',
  url: 'https://carin-test.org/about',
  commit: 'abc1234',
  marker: `gate-0.99.0-rc.4-${leg}-1`,
  fetched: '2026-11-04T10:00:00.000Z',
  verdict: 'pass',
  run: 'run-1',
  ...overrides,
});
const four = (over: Record<string, Record<string, string>> = {}) => ['A1', 'A2', 'B1', 'B2'].map((leg) => row(leg, over[leg]));
const body = (rows: ReturnType<typeof row>[]) => `Notes.\n\n${renderGateSection(rows)}`;
const ghOf = (text: string) => async () => ({ code: 0, stdout: text });

describe('verdict from the release body', () => {
  it('exits 0 on four passes under one run id', async () => {
    expect(await verdict({ version: '0.99.0-rc.4', gh: ghOf(body(four())) })).toEqual({ ok: true, reasons: [] });
  });

  it('asks gh for the tagged release body', async () => {
    const calls: string[][] = [];
    await verdict({ version: '0.99.0-rc.4', gh: async (args) => (calls.push(args), { code: 0, stdout: body(four()) }) });
    expect(calls).toEqual([['release', 'view', 'v0.99.0-rc.4', '--json', 'body', '--jq', '.body']]);
  });

  const cases: [string, string][] = [
    ['three passes and a fail', body(four({ B2: { verdict: 'fail: no alert' } }))],
    ['a missing row', body(four().slice(0, 3))],
    ['a skipped row', body(four({ B2: { verdict: 'skipped: needs B1' } }))],
    ['a pending row', body(four({ A2: { verdict: 'pending' } }))],
    ['mixed run ids', body(four({ B1: { run: 'run-2' }, B2: { run: 'run-2' } }))],
    ['a duplicate leg', body([...four(), row('A1')])],
    ['a body with no ## Gate', 'Release notes only.\n'],
    ['four good rows plus a malformed one', `${body(four())}| B3 | /x | only | five | cells |\n`],
  ];
  for (const [name, text] of cases) {
    it(`exits 1 on ${name}`, async () => {
      expect((await verdict({ version: '0.99.0-rc.4', gh: ghOf(text) })).ok).toBe(false);
    });
  }

  it('names the cell count of a row it cannot parse', async () => {
    const result = await verdict({ version: 'x', gh: ghOf(`${body(four())}| B3 | /x | only | five | cells |\n`) });
    expect(result.reasons.join('\n')).toMatch(/5 cells, expected 8/);
  });

  it('exits 1 when the gh read fails', async () => {
    const result = await verdict({ version: '0.99.0-rc.4', gh: async () => ({ code: 1, stdout: '' }) });
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toMatch(/could not read release v0.99.0-rc.4/);
  });

  it('exits 1 on the captured rc.3 body, with the parse reason', async () => {
    const result = await verdict({ version: '0.99.0-rc.3', gh: ghOf(await readFile(rc3, 'utf8')) });
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/cannot parse: a row has 7 cells, expected 8/);
  });
});

describe('verdict under --file', () => {
  async function record(text: string) {
    const dir = await mkdtemp(path.join(tmpdir(), 'verdict-file-'));
    dirs.push(dir);
    const file = path.join(dir, 'record.md');
    await writeFile(file, text);
    return file;
  }

  it('accepts two run ids when each group is consistent', async () => {
    const file = await record(body(four({ B1: { run: 'run-2' }, B2: { run: 'run-2' } })));
    expect((await verdict({ version: 'x', file })).ok).toBe(true);
  });

  it('rejects a record whose A1 and A2 differ', async () => {
    const file = await record(body(four({ A2: { run: 'run-2' } })));
    expect((await verdict({ version: 'x', file })).ok).toBe(false);
  });

  it('rejects an unreadable file', async () => {
    expect((await verdict({ version: 'x', file: '/nonexistent/record.md' })).ok).toBe(false);
  });
});

describe('the sparse-checkout contract', () => {
  it('imports only node built-ins and ./record.mjs', async () => {
    for (const name of ['verdict.mjs', 'record.mjs']) {
      const source = await readFile(path.join(scripts, name), 'utf8');
      const specifiers = [...source.matchAll(/(?:from|import\()\s*'([^']+)'/g)].map((m) => m[1]);
      expect(specifiers.length).toBeGreaterThan(0);
      for (const specifier of specifiers) expect(specifier === './record.mjs' || specifier.startsWith('node:')).toBe(true);
    }
  });

  it('runs from a directory holding only the two files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'verdict-sparse-'));
    dirs.push(dir);
    for (const name of ['verdict.mjs', 'record.mjs']) await copyFile(path.join(scripts, name), path.join(dir, name));
    const file = path.join(dir, 'record.md');
    await writeFile(file, body(four()));
    const ok = await execFileAsync('node', [path.join(dir, 'verdict.mjs'), '0.99.0-rc.3', '--file', file]);
    expect(ok.stdout).toMatch(/four pass rows/);
    await writeFile(file, body(four({ A1: { verdict: 'pending' } })));
    await expect(execFileAsync('node', [path.join(dir, 'verdict.mjs'), '0.99.0-rc.3', '--file', file])).rejects.toMatchObject({ code: 1 });
  });
});
