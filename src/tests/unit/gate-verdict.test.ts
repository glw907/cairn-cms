// The gate's reader: one `pass` row per leg, `scripted` at the release's own commit, `naive` and
// `owner` at commits with no rerun-path change up to it, a row it cannot parse failing with the
// reason, and the script running from a checkout holding only itself and record.mjs.
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

const RELEASE = 'fff0000aaaa';
const row = (leg: string, overrides: Record<string, string> = {}) => ({
  leg,
  commit: RELEASE,
  engine: '0.99.0-rc.4',
  tool: '2.0.0-rc.4',
  verdict: 'pass',
  run: '2611091200',
  ...overrides,
});
const three = (over: Record<string, Record<string, string>> = {}) => ['naive', 'scripted', 'owner'].map((leg) => row(leg, over[leg]));
const body = (rows: ReturnType<typeof row>[]) => `Notes.\n\n${renderGateSection(rows)}`;

/** A gh stub answering the release view with `text` and each compare from `compares`, keyed by the base commit. */
function ghOf(text: string, compares: Record<string, string[] | 'error'> = {}) {
  const calls: string[][] = [];
  const gh = async (args: string[]) => {
    calls.push(args);
    if (args[0] === 'api') {
      const base = args[1].split('/compare/')[1].split('...')[0];
      const files = compares[base];
      if (files === undefined || files === 'error') return { code: 1, stdout: '' };
      return { code: 0, stdout: JSON.stringify({ status: 'ahead', files }) };
    }
    return { code: 0, stdout: text };
  };
  return { gh, calls };
}
const run = (text: string, compares: Record<string, string[] | 'error'> = {}) => verdict({ version: '0.99.0-rc.4', releaseCommit: RELEASE, gh: ghOf(text, compares).gh });

describe('verdict from the release body', () => {
  it('passes three pass rows at the release commit with no compare', async () => {
    const stub = ghOf(body(three()));
    expect(await verdict({ version: '0.99.0-rc.4', releaseCommit: RELEASE, gh: stub.gh })).toEqual({ ok: true, reasons: [] });
    expect(stub.calls).toEqual([['release', 'view', 'v0.99.0-rc.4', '--json', 'body', '--jq', '.body']]);
  });

  it('passes naive and owner at earlier commits when the diff holds no rerun path, scripted at the release', async () => {
    const text = body(three({ naive: { commit: 'aaa1111' }, owner: { commit: 'bbb2222' } }));
    const result = await run(text, { aaa1111: ['src/lib/a.ts', 'CHANGELOG.md'], bbb2222: ['docs/editors/x.md'] });
    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it('fails when scripted is at an earlier commit', async () => {
    const result = await run(body(three({ scripted: { commit: 'ccc3333' } })));
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/scripted passed at ccc3333/);
  });

  it('fails naming naive when a tool-only change under tool/internal/setup follows its row on the same engine version', async () => {
    const text = body(three({ naive: { commit: 'aaa1111' } }));
    const result = await run(text, { aaa1111: ['tool/internal/setup/steps.go'] });
    expect(result.ok).toBe(false);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toMatch(/^naive passed at aaa1111, and tool\/internal\/setup\/steps\.go changed/);
  });

  it('names each missing leg', async () => {
    const result = await run(body([row('scripted')]));
    expect(result.reasons).toEqual(['missing row for naive', 'missing row for owner']);
  });

  it('fails closed on a compare it cannot read or that lists 300 files', async () => {
    const text = body(three({ naive: { commit: 'aaa1111' }, owner: { commit: 'bbb2222' } }));
    const many = Array.from({ length: 300 }, (_, i) => `docs/editors/${i}.md`);
    const result = await run(text, { aaa1111: 'error', bbb2222: many });
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons[0]).toMatch(/^naive: could not read the compare/);
    expect(result.reasons[1]).toMatch(/^owner: .*300 files/);
  });

  const cases: [string, string][] = [
    ['two passes and a fail', body(three({ owner: { verdict: 'fail: other' } }))],
    ['a pending row', body(three({ naive: { verdict: 'pending' } }))],
    ['a duplicate leg', body([...three(), row('naive')])],
    ['a body with no ## Gate', 'Release notes only.\n'],
    ['three good rows plus a malformed one', `${body(three())}| B3 | /x | only | five | cells |\n`],
    ['a row naming no commit', body(three({ owner: { commit: '-' } }))],
  ];
  for (const [name, text] of cases) {
    it(`fails on ${name}`, async () => {
      expect((await run(text)).ok).toBe(false);
    });
  }

  it('names the cell count of a row it cannot parse', async () => {
    expect((await run(`${body(three())}| B3 | /x | only | five | cells |\n`)).reasons.join('\n')).toMatch(/5 cells, expected 6/);
  });

  it('fails when the gh read fails', async () => {
    const result = await verdict({ version: '0.99.0-rc.4', releaseCommit: RELEASE, gh: async () => ({ code: 1, stdout: '' }) });
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toMatch(/could not read release v0.99.0-rc.4/);
  });

  it('fails on the captured rc.3 body, with the parse reason', async () => {
    const result = await run(await readFile(rc3, 'utf8'));
    expect(result.ok).toBe(false);
    expect(result.reasons.join('\n')).toMatch(/cannot parse: a row has 7 cells, expected 6/);
  });
});

describe('verdict under --file', () => {
  it('reads a local record and rejects an unreadable file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'verdict-file-'));
    dirs.push(dir);
    const file = path.join(dir, 'record.md');
    await writeFile(file, body(three()));
    expect((await verdict({ version: 'x', releaseCommit: RELEASE, file })).ok).toBe(true);
    expect((await verdict({ version: 'x', releaseCommit: RELEASE, file: '/nonexistent/record.md' })).ok).toBe(false);
  });
});

describe('the sparse-checkout contract', () => {
  it('imports only node built-ins and ./record.mjs', async () => {
    for (const name of ['verdict.mjs', 'record.mjs']) {
      const source = await readFile(path.join(scripts, name), 'utf8');
      const specifiers = [...source.matchAll(/^import\b[^;]*?\bfrom\s*'([^']+)'|\bimport\('([^']+)'\)/gm)].map((m) => m[1] ?? m[2]);
      expect(specifiers.length).toBeGreaterThan(0);
      for (const specifier of specifiers) expect(specifier === './record.mjs' || specifier.startsWith('node:')).toBe(true);
    }
  });

  it('runs from a directory holding only the two files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'verdict-sparse-'));
    dirs.push(dir);
    for (const name of ['verdict.mjs', 'record.mjs']) await copyFile(path.join(scripts, name), path.join(dir, name));
    const file = path.join(dir, 'record.md');
    await writeFile(file, body(three()));
    const args = [path.join(dir, 'verdict.mjs'), '0.99.0-rc.4', '--file', file, '--commit', RELEASE];
    const ok = await execFileAsync('node', args);
    expect(ok.stdout).toMatch(/one pass row per leg/);
    await writeFile(file, body(three({ naive: { verdict: 'pending' } })));
    await expect(execFileAsync('node', args)).rejects.toMatchObject({ code: 1 });
  });
});
