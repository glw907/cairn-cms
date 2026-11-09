// The gate's record: the `## Gate` section is replaced in the release body, never stacked, a failed
// read or a token-bearing URL stops the write before gh edits anything, and `carry` moves the naive
// and owner rows forward only across a diff that touches no rerun path.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  GATE_COLUMNS,
  RERUN_PATHS,
  carry,
  changedFiles,
  mergeGateSection,
  parseGateRows,
  recordLeg,
  recordPending,
  renderGateSection,
  rerunPathsTouched,
} from '../../../scripts/gate/record.mjs';

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

const row = (overrides: Record<string, string> = {}) => ({
  leg: 'naive',
  commit: 'abc1234',
  engine: '0.99.0-rc.4',
  tool: '2.0.0-rc.4',
  verdict: 'pass',
  run: '2611091200',
  ...overrides,
});

/** A gh stub: `view` answers the first call, edits are recorded with the notes file's text, and `api` answers a compare. */
function fakeGh(view: { code: number; stdout: string }, compare?: { code: number; stdout: string }) {
  const calls: string[][] = [];
  const written: string[] = [];
  return {
    calls,
    written,
    gh: async (args: string[]) => {
      calls.push(args);
      if (args[0] === 'api') return compare ?? { code: 1, stdout: '' };
      if (args[1] === 'view') return view;
      written.push(await readFile(args[args.indexOf('--notes-file') + 1], 'utf8'));
      return { code: 0, stdout: '' };
    },
  };
}
const compareOf = (files: string[], status = 'ahead') => ({ code: 0, stdout: JSON.stringify({ status, files }) });

async function notesDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'gate-record-'));
  dirs.push(dir);
  return dir;
}

describe('recordLeg', () => {
  it('writes a table with every column to the release body', async () => {
    const stub = fakeGh({ code: 0, stdout: '## Added\n\n- a thing\n' });
    await recordLeg({ version: '0.99.0-rc.4', row: row(), notesDir: await notesDir(), gh: stub.gh });
    const body = stub.written[0];
    expect(body).toContain('## Added');
    expect(body).toContain(`| ${GATE_COLUMNS.join(' | ')} |`);
    for (const cell of Object.values(row())) expect(body).toContain(cell);
    expect(stub.calls.at(-1)).toEqual(['release', 'edit', 'v0.99.0-rc.4', '--notes-file', expect.any(String)]);
  });

  it('replaces an existing Gate section, keeping other legs and what follows it', async () => {
    const existing = mergeGateSection('## Added\n\n- a thing', row({ leg: 'naive', verdict: 'fail: old' }));
    const withOwner = mergeGateSection(existing, row({ leg: 'owner', commit: 'def5678' }));
    const stub = fakeGh({ code: 0, stdout: `${withOwner}\n## Notes\n\nafter\n` });
    await recordLeg({ version: '0.99.0-rc.4', row: row({ leg: 'naive', verdict: 'pass' }), notesDir: await notesDir(), gh: stub.gh });
    const body = stub.written[0];
    expect(body.match(/^## Gate$/gm)).toHaveLength(1);
    expect(body).not.toContain('fail: old');
    expect(body).toContain('def5678');
    expect(body.match(/^\| naive /gm)).toHaveLength(1);
    expect(body).toContain('## Notes');
    expect(body).toContain('after');
  });

  it('lists the legs in the release rule order', () => {
    const text = renderGateSection([row({ leg: 'owner' }), row({ leg: 'naive' }), row({ leg: 'scripted' })]);
    expect(parseGateRows(text).map((r) => r.leg)).toEqual(['naive', 'scripted', 'owner']);
  });

  it('makes no edit when the read fails or the body is empty', async () => {
    for (const view of [{ code: 1, stdout: '' }, { code: 0, stdout: '  \n' }]) {
      const stub = fakeGh(view);
      await expect(recordLeg({ version: '0.99.0-rc.4', row: row(), notesDir: await notesDir(), gh: stub.gh })).rejects.toThrow(/wrote nothing/);
      expect(stub.calls.some((args) => args[1] === 'edit')).toBe(false);
    }
  });

  it('refuses a cell carrying token= before any gh call', async () => {
    const stub = fakeGh({ code: 0, stdout: 'body' });
    await expect(recordLeg({ version: '0.99.0-rc.4', row: row({ run: 'x?token=abc' }), notesDir: await notesDir(), gh: stub.gh })).rejects.toThrow(/token=/);
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
    await recordLeg({ version: '0.99.0-rc.4', row: row(), notesDir: dir, gh: never, recordFile: file });
    expect(parseGateRows(await readFile(file, 'utf8')).map((r) => r.leg)).toEqual(['naive']);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  it('replaces only its own legs on a second run over the same file', async () => {
    const dir = await notesDir();
    const file = path.join(dir, 'r.md');
    await recordPending({ version: '0.99.0-rc.4', legs: ['naive', 'scripted', 'owner'], run: 'run-1', notesDir: dir, fresh: true, gh: never, recordFile: file });
    await recordPending({ version: '0.99.0-rc.4', legs: ['naive', 'scripted'], run: 'run-2', notesDir: dir, gh: never, recordFile: file });
    await recordLeg({ version: '0.99.0-rc.4', row: row({ leg: 'naive', run: 'run-2' }), notesDir: dir, gh: never, recordFile: file });
    expect(parseGateRows(await readFile(file, 'utf8')).map((r) => [r.leg, r.verdict, r.run])).toEqual([
      ['naive', 'pass', 'run-2'],
      ['scripted', 'pending', 'run-2'],
      ['owner', 'pending', 'run-1'],
    ]);
  });
});

describe('the table', () => {
  it('round-trips the six columns, commit and versions included', () => {
    expect(GATE_COLUMNS).toEqual(['Leg', 'Commit', 'Engine', 'Tool', 'Verdict', 'Run']);
    const rows = [row({ leg: 'naive' }), row({ leg: 'scripted', verdict: 'fail: a; b | c' })];
    expect(parseGateRows(renderGateSection(rows))).toEqual(rows);
  });
});

describe('the rerun paths', () => {
  it('match each listed pattern and miss neighbours', () => {
    const hits = [
      'tool/internal/setup/steps.go',
      'tool/internal/setup/loopback/pages/consent.html',
      'tool/internal/providers/cloudflare_write.go',
      'tool/internal/secrets/keyring.go',
      'tool/internal/ui/newview/failure.go',
      'tool/cmd/cairn/new.go',
      'tool/cmd/cairn/new_agent.go',
      'tool/cmd/cairn/help_agents.go',
      'packages/create-cairn-site/bin.mjs',
      'templates/waymark/package.json',
      'scripts/build/setup-overlay/.github/workflows/deploy.yml',
      'plugins/cairn/skills/x/SKILL.md',
      'README.md',
      'docs/admin/setup.md',
    ];
    const misses = ['tool/internal/render/json.go', 'tool/cmd/cairn/doctor.go', 'tool/cmd/cairn/sub/new.go', 'docs/editors/a.md', 'src/lib/x.ts', 'examples/showcase/README.md', 'CHANGELOG.md'];
    expect(RERUN_PATHS).toHaveLength(12);
    expect(rerunPathsTouched(hits)).toEqual(hits);
    expect(rerunPathsTouched(misses)).toEqual([]);
  });
});

describe('changedFiles', () => {
  it('asks the compare API and returns the files', async () => {
    const stub = fakeGh({ code: 0, stdout: '' }, compareOf(['a.ts']));
    expect(await changedFiles(stub.gh, 'abc1234', 'def5678')).toEqual({ ok: true, files: ['a.ts'] });
    expect(stub.calls[0].slice(0, 2)).toEqual(['api', 'repos/glw907/cairn-cms/compare/abc1234...def5678']);
  });

  it('makes no call for one commit named twice, abbreviated or not', async () => {
    const stub = fakeGh({ code: 0, stdout: '' });
    expect(await changedFiles(stub.gh, 'abc1234', 'abc1234def')).toEqual({ ok: true, files: [] });
    expect(stub.calls).toEqual([]);
  });

  it('fails closed on a listing of 300 files, a read error, a diverged base, and garbage', async () => {
    const many = Array.from({ length: 300 }, (_, i) => `f${i}.ts`);
    for (const compare of [compareOf(many), { code: 1, stdout: '' }, compareOf(['a'], 'diverged'), { code: 0, stdout: 'not json' }]) {
      const result = await changedFiles(fakeGh({ code: 0, stdout: '' }, compare).gh, 'abc1234', 'def5678');
      expect(result.ok).toBe(false);
    }
  });
});

describe('carry', () => {
  const body = () => {
    let text = '## Added\n\n- a thing';
    for (const leg of ['naive', 'scripted', 'owner']) text = mergeGateSection(text, row({ leg, commit: leg === 'scripted' ? 'ccc3333' : 'abc1234' }));
    return text;
  };

  it('copies the naive and owner rows forward across a diff with no rerun path, leaving scripted', async () => {
    const stub = fakeGh({ code: 0, stdout: body() }, compareOf(['src/lib/x.ts', 'CHANGELOG.md']));
    const carried = await carry({ version: '0.99.0-rc.4', from: 'abc1234', to: 'def5678', notesDir: await notesDir(), gh: stub.gh });
    expect(carried).toEqual(['naive', 'owner']);
    const rows = parseGateRows(stub.written[0]);
    expect(rows.map((r) => [r.leg, r.commit])).toEqual([
      ['naive', 'def5678'],
      ['scripted', 'ccc3333'],
      ['owner', 'def5678'],
    ]);
    expect(stub.written[0]).toContain('- a thing');
  });

  it('refuses a rerun-path diff naming the file, and writes nothing', async () => {
    const stub = fakeGh({ code: 0, stdout: body() }, compareOf(['src/lib/x.ts', 'tool/internal/setup/steps.go']));
    await expect(carry({ version: '0.99.0-rc.4', from: 'abc1234', to: 'def5678', notesDir: await notesDir(), gh: stub.gh })).rejects.toThrow(/tool\/internal\/setup\/steps\.go/);
    expect(stub.calls.some((args) => args[1] === 'edit')).toBe(false);
  });

  it('refuses when no naive or owner row sits at the from commit', async () => {
    const stub = fakeGh({ code: 0, stdout: body() }, compareOf([]));
    await expect(carry({ version: '0.99.0-rc.4', from: 'zzz9999', to: 'def5678', notesDir: await notesDir(), gh: stub.gh })).rejects.toThrow(/no naive or owner pass row/);
  });

  it('works on a rehearsal file with no release read', async () => {
    const dir = await notesDir();
    const file = path.join(dir, 'r.md');
    await writeFile(file, body());
    const gh = async (args: string[]) => (args[0] === 'api' ? compareOf(['README.md.bak']) : { code: 1, stdout: '' });
    await carry({ version: 'x', from: 'abc1234', to: 'def5678', notesDir: dir, gh, recordFile: file });
    expect(parseGateRows(await readFile(file, 'utf8')).map((r) => r.commit)).toEqual(['def5678', 'ccc3333', 'def5678']);
  });
});
