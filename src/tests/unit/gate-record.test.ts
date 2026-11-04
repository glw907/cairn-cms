// The gate's record: the `## Gate` section is replaced in the release body, never stacked, and a
// failed read or a token-bearing URL stops the write before gh edits anything.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GATE_COLUMNS, recordLeg, recordPending, mergeGateSection, parseGateRows, renderGateSection } from '../../../scripts/gate/record.mjs';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

const row = (overrides: Record<string, string> = {}) => ({
  leg: 'A1',
  path: '/about',
  url: 'https://carin-test.org/about',
  commit: 'abc1234',
  marker: 'gate-0.99.0-rc.3-A1-1',
  fetched: '2026-11-03T10:00:00.000Z',
  verdict: 'pass',
  run: 'run-1',
  ...overrides,
});

/** A gh stub: `view` answers the first call, edits are recorded with the notes file's text. */
function fakeGh(view: { code: number; stdout: string }) {
  const calls: string[][] = [];
  const written: string[] = [];
  return {
    calls,
    written,
    gh: async (args: string[]) => {
      calls.push(args);
      if (args[1] === 'view') return view;
      written.push(await readFile(args[args.indexOf('--notes-file') + 1], 'utf8'));
      return { code: 0, stdout: '' };
    },
  };
}

async function notesDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'gate-record-'));
  dirs.push(dir);
  return dir;
}

describe('recordLeg', () => {
  it('writes a table with every column to the release body', async () => {
    const stub = fakeGh({ code: 0, stdout: '## Added\n\n- a thing\n' });
    await recordLeg({ version: '0.99.0-rc.3', row: row(), notesDir: await notesDir(), gh: stub.gh });
    const body = stub.written[0];
    expect(body).toContain('## Added');
    expect(body).toContain(`| ${GATE_COLUMNS.join(' | ')} |`);
    for (const cell of Object.values(row())) expect(body).toContain(cell);
    expect(stub.calls.at(-1)).toEqual(['release', 'edit', 'v0.99.0-rc.3', '--notes-file', expect.any(String)]);
  });

  it('replaces an existing Gate section, keeping other legs and what follows it', async () => {
    const existing = mergeGateSection('## Added\n\n- a thing', row({ leg: 'A1', verdict: 'fail: old' }));
    const withB = mergeGateSection(existing, row({ leg: 'B1', marker: 'gate-b' }));
    const stub = fakeGh({ code: 0, stdout: `${withB}\n## Notes\n\nafter\n` });
    await recordLeg({ version: '0.99.0-rc.3', row: row({ leg: 'A1', verdict: 'pass' }), notesDir: await notesDir(), gh: stub.gh });
    const body = stub.written[0];
    expect(body.match(/^## Gate$/gm)).toHaveLength(1);
    expect(body).not.toContain('fail: old');
    expect(body).toContain('gate-b');
    expect(body.match(/^\| A1 /gm)).toHaveLength(1);
    expect(body).toContain('## Notes');
    expect(body).toContain('after');
  });

  it('makes no edit when the read fails or the body is empty', async () => {
    for (const view of [{ code: 1, stdout: '' }, { code: 0, stdout: '  \n' }]) {
      const stub = fakeGh(view);
      await expect(recordLeg({ version: '0.99.0-rc.3', row: row(), notesDir: await notesDir(), gh: stub.gh })).rejects.toThrow(/wrote nothing/);
      expect(stub.calls.some((args) => args[1] === 'edit')).toBe(false);
    }
  });

  it('refuses a URL carrying token= before any gh call', async () => {
    const stub = fakeGh({ code: 0, stdout: 'body' });
    await expect(
      recordLeg({ version: '0.99.0-rc.3', row: row({ url: 'https://x.workers.dev/admin/auth/confirm?token=abc' }), notesDir: await notesDir(), gh: stub.gh }),
    ).rejects.toThrow(/token=/);
    expect(stub.calls).toEqual([]);
  });
});

describe('the rehearsal record file', () => {
  const never = async () => {
    throw new Error('gh must not be called under a record file');
  };

  it('creates an absent file mode 0600 holding the Gate section, with no gh call', async () => {
    const dir = await notesDir();
    const file = path.join(dir, 'r.md');
    await recordLeg({ version: '0.99.0-rc.3', row: row(), notesDir: dir, gh: never, recordFile: file });
    expect(parseGateRows(await readFile(file, 'utf8')).map((r) => r.leg)).toEqual(['A1']);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  it('gives an empty file the section instead of refusing an empty body', async () => {
    const dir = await notesDir();
    const file = path.join(dir, 'r.md');
    await writeFile(file, '');
    await recordLeg({ version: '0.99.0-rc.3', row: row(), notesDir: dir, gh: never, recordFile: file });
    expect(await readFile(file, 'utf8')).toContain('## Gate');
  });

  it('replaces only its own legs on a second run over the same file', async () => {
    const dir = await notesDir();
    const file = path.join(dir, 'r.md');
    await recordPending({ version: '0.99.0-rc.3', legs: ['A1', 'A2', 'B1', 'B2'], run: 'run-1', notesDir: dir, fresh: true, gh: never, recordFile: file });
    await recordPending({ version: '0.99.0-rc.3', legs: ['A1', 'A2'], run: 'run-2', notesDir: dir, gh: never, recordFile: file });
    await recordLeg({ version: '0.99.0-rc.3', row: row({ leg: 'A1', run: 'run-2' }), notesDir: dir, gh: never, recordFile: file });
    expect(parseGateRows(await readFile(file, 'utf8')).map((r) => [r.leg, r.verdict, r.run])).toEqual([
      ['A1', 'pass', 'run-2'],
      ['A2', 'pending', 'run-2'],
      ['B1', 'pending', 'run-1'],
      ['B2', 'pending', 'run-1'],
    ]);
  });
});

describe('the Run column', () => {
  it('round-trips eight columns through the renderer and the parser', () => {
    expect(GATE_COLUMNS).toHaveLength(8);
    expect(GATE_COLUMNS.at(-1)).toBe('Run');
    const rows = [row({ leg: 'A1', run: 'run-9' }), row({ leg: 'B2', verdict: 'fail: a; b', run: 'run-9' })];
    expect(parseGateRows(renderGateSection(rows))).toEqual(rows);
  });
});

describe('recordPending', () => {
  const legs = ['A1', 'A2', 'B1', 'B2'];

  it('replaces the whole section with pending rows for the run, keeping the rest of the body', async () => {
    const earlier = mergeGateSection('## Added\n\n- a thing', row({ leg: 'A1', run: 'old' }));
    const stub = fakeGh({ code: 0, stdout: earlier });
    await recordPending({ version: '0.99.0-rc.3', legs, run: 'run-2', notesDir: await notesDir(), fresh: true, gh: stub.gh });
    const rows = parseGateRows(stub.written[0]);
    expect(rows.map((r) => [r.leg, r.verdict, r.run])).toEqual(legs.map((leg) => [leg, 'pending', 'run-2']));
    expect(stub.written[0]).toContain('- a thing');
  });

  it('replaces only the named legs, so an earlier pass for one of them cannot stand', async () => {
    let body = mergeGateSection('## Added', row({ leg: 'A1', run: 'old' }));
    body = mergeGateSection(body, row({ leg: 'B1', run: 'old' }));
    const stub = fakeGh({ code: 0, stdout: body });
    await recordPending({ version: '0.99.0-rc.3', legs: ['A1', 'A2'], run: 'run-3', notesDir: await notesDir(), gh: stub.gh });
    const rows = parseGateRows(stub.written[0]);
    expect(rows.map((r) => [r.leg, r.verdict, r.run])).toEqual([
      ['A1', 'pending', 'run-3'],
      ['A2', 'pending', 'run-3'],
      ['B1', 'pass', 'old'],
    ]);
  });

  it('writes nothing when the read fails', async () => {
    const stub = fakeGh({ code: 1, stdout: '' });
    await expect(recordPending({ version: '0.99.0-rc.3', legs, run: 'r', notesDir: await notesDir(), gh: stub.gh })).rejects.toThrow(/wrote nothing/);
    expect(stub.calls.some((args) => args[1] === 'edit')).toBe(false);
  });
});
