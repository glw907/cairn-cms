// The gate's command line: every leg ends with a row, one install's failure never stops the other's
// legs, and a run that cannot mark its legs pending runs none.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main, type makeSession } from '../../../scripts/gate/gate.mjs';
import { runLeg } from '../../../scripts/gate/legs.mjs';
import { mergeGateSection, parseGateRows, recordLeg, recordPending } from '../../../scripts/gate/record.mjs';

type Deps = NonNullable<Parameters<typeof main>[2]>;
type Row = Record<string, string>;

const VERSION = '1.0.0';

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** A session with no browser behind it: installs get an empty admin context. */
const fakeSession = (() => ({
  getBrowser: async () => ({ newAdminContext: async () => ({}) }),
  creds: {},
  teardownDeps: {},
  close: async () => {},
})) as unknown as typeof makeSession;

function harness() {
  const runDir = path.join(mkdtempSync(path.join(tmpdir(), 'gate-main-')), 'run-7');
  const env = { GATE_RUN_DIR: runDir, CF_WS_CAIRN_GATE_TOKEN: 'token' };
  const events: string[] = [];
  const rows: Row[] = [];
  const pending: Array<{ legs: string[]; run: string; fresh?: boolean }> = [];
  const base: Partial<Deps> = {
    makeSession: fakeSession,
    teardownRun: async () => [],
    teardownStale: async () => [],
    recordPending: async (input) => {
      events.push('pending');
      pending.push({ legs: input.legs, run: input.run, fresh: input.fresh });
    },
    recordLeg: async ({ row }) => {
      rows.push(row);
    },
  };
  return { runDir, env, events, rows, pending, base };
}

describe('main', () => {
  it('runs group B after A1 throws, with a fail row for A1 and a skipped row for A2', async () => {
    const { runDir, env, events, rows, pending, base } = harness();
    const ran: string[] = [];
    const code = await main(['--all', '--version', VERSION], env, {
      ...base,
      // A1 goes through the real runLeg, so its row comes from the finally; the rest stand in.
      runLeg: async (ctx, legDeps) => {
        events.push(`leg ${ctx.leg}`);
        ran.push(ctx.leg);
        if (ctx.leg === 'A1') return runLeg(ctx, legDeps);
        return { pass: true, failures: [] };
      },
      legDeps: {
        runDriver: (async () => {
          throw new Error('boom');
        }) as unknown as NonNullable<Deps['legDeps']>['runDriver'],
      },
    });
    expect(code).toBe(1);
    expect(ran).toEqual(['A1', 'B1', 'B2']);
    expect(rows.find((r) => r.leg === 'A1')?.verdict).toBe('fail: boom');
    expect(rows.find((r) => r.leg === 'A2')).toMatchObject({ verdict: 'skipped: needs A1', run: path.basename(runDir) });
    expect(pending).toEqual([{ legs: ['A1', 'A2', 'B1', 'B2'], run: 'run-7', fresh: true }]);
    expect(events[0]).toBe('pending');
    expect(events.indexOf('pending')).toBeLessThan(events.indexOf('leg A1'));
  });

  it('skips the legs after a failed verdict and still runs the other install', async () => {
    const { env, rows, base } = harness();
    const ran: string[] = [];
    const code = await main(['--all', '--version', VERSION], env, {
      ...base,
      runLeg: async (ctx) => {
        ran.push(ctx.leg);
        return ctx.leg === 'B1' ? { pass: false, failures: ['x'] } : { pass: true, failures: [] };
      },
    });
    expect(code).toBe(1);
    expect(ran).toEqual(['A1', 'A2', 'B1']);
    expect(rows).toEqual([expect.objectContaining({ leg: 'B2', verdict: 'skipped: needs B1' })]);
  });

  it('returns non-zero before any leg runs when the pending write fails', async () => {
    const { env, base } = harness();
    let ran = 0;
    const code = await main(['--all', '--version', VERSION], env, {
      ...base,
      recordPending: async () => {
        throw new Error('gh is down');
      },
      runLeg: async () => {
        ran += 1;
        return { pass: true, failures: [] };
      },
    });
    expect(code).not.toBe(0);
    expect(ran).toBe(0);
  });

  it('marks exactly the named legs pending, merging into the record', async () => {
    const { env, base, pending } = harness();
    const code = await main(['--leg', 'A1', '--leg', 'A2', '--version', VERSION], env, {
      ...base,
      runLeg: async () => ({ pass: true, failures: [] }),
    });
    expect(code).toBe(0);
    expect(pending).toEqual([{ legs: ['A1', 'A2'], run: 'run-7', fresh: false }]);
  });

  it('aborts a --leg run whose pending write fails', async () => {
    const { env, base } = harness();
    let ran = 0;
    const code = await main(['--leg', 'A1', '--version', VERSION], env, {
      ...base,
      recordPending: async () => {
        throw new Error('gh is down');
      },
      runLeg: async () => {
        ran += 1;
        return { pass: true, failures: [] };
      },
    });
    expect(code).not.toBe(0);
    expect(ran).toBe(0);
  });

  it('leaves A1 pending, never the earlier pass, when the rerun dies before its row', async () => {
    const { env, base } = harness();
    let body = mergeGateSection('## Added\n\n- a thing', {
      leg: 'A1', path: '/about', url: 'https://carin-test.org/about', commit: 'abc', marker: 'm', fetched: 't', verdict: 'pass', run: 'run-1',
    });
    // A gh over one release body: view answers the current text, edit replaces it.
    const gh = async (args: string[]) => {
      if (args[1] === 'view') return { code: 0, stdout: body };
      body = readFileSync(args[args.indexOf('--notes-file') + 1], 'utf8');
      return { code: 0, stdout: '' };
    };
    const code = await main(['--leg', 'A1', '--leg', 'A2', '--version', VERSION], env, {
      ...base,
      recordPending: (input) => recordPending({ ...input, gh }),
      recordLeg: (input) => recordLeg({ ...input, gh }),
      // Dies past the finally a real runLeg would write its row in.
      runLeg: async () => {
        throw new Error('process died');
      },
    });
    expect(code).toBe(1);
    const rows = parseGateRows(body);
    expect(rows.find((r) => r.leg === 'A1')).toMatchObject({ verdict: 'pending', run: 'run-7' });
    expect(rows.find((r) => r.leg === 'A2')?.verdict).toBe('skipped: needs A1');
    expect(body).toContain('- a thing');
  });
});
