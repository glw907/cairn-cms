// The gate's record: the `## Gate` section is replaced in the release body, never stacked, and a
// failed read or a token-bearing URL stops the write before gh edits anything.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GATE_COLUMNS, recordLeg, mergeGateSection } from '../../../scripts/gate/record.mjs';

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
