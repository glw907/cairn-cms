import { describe, it, expect } from 'vitest';
import { runDoctor } from '../../lib/doctor/run.js';
import { formatReport } from '../../lib/doctor/report.js';
import { condition } from '../../lib/diagnostics/index.js';
import type { CheckResult, DoctorCheck, DoctorContext } from '../../lib/doctor/types.js';

function ctx(): DoctorContext {
  return {
    cwd: '/tmp/site',
    fetch: globalThis.fetch,
    readFile: async () => null,
  };
}

function stub(id: string, result: CheckResult, conditionId = 'config.bindings-missing'): DoctorCheck {
  return {
    id,
    conditionId,
    title: `Stub ${id}`,
    run: async () => result,
  };
}

describe('runDoctor', () => {
  it('accumulates every result when a check throws mid-run', async () => {
    const checks: DoctorCheck[] = [
      stub('first', { status: 'pass', detail: 'ok' }),
      {
        id: 'second',
        conditionId: 'config.bindings-missing',
        title: 'Stub second',
        run: async () => {
          throw new Error('boom');
        },
      },
      stub('third', { status: 'skip', detail: 'no token' }),
    ];
    const { results, failed } = await runDoctor(checks, ctx());
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.check.id)).toEqual(['first', 'second', 'third']);
    expect(results[1].result.status).toBe('fail');
    expect(results[1].result.detail).toContain('boom');
    expect(failed).toBe(1);
  });

  it('counts only fail results in failed', async () => {
    const checks: DoctorCheck[] = [
      stub('a', { status: 'pass', detail: 'ok' }),
      stub('b', { status: 'skip', detail: 'absent' }),
      stub('c', { status: 'fail', detail: 'nope' }),
      stub('d', { status: 'fail', detail: 'also no' }),
    ];
    const { failed } = await runDoctor(checks, ctx());
    expect(failed).toBe(2);
  });
});

describe('formatReport', () => {
  it('prints the failing condition why and remediation from the registry', async () => {
    const { results } = await runDoctor(
      [
        stub('ok', { status: 'pass', detail: 'all good' }),
        stub('bindings', { status: 'fail', detail: 'EMAIL binding absent' }),
      ],
      ctx()
    );
    const report = formatReport(results);
    const entry = condition('config.bindings-missing');
    expect(report).toContain('FAIL');
    expect(report).toContain('EMAIL binding absent');
    expect(report).toContain(entry.why);
    expect(report).toContain(entry.remediation);
  });

  it('prints SKIP with the skip detail', async () => {
    const { results } = await runDoctor(
      [stub('skipped', { status: 'skip', detail: 'set CLOUDFLARE_API_TOKEN' })],
      ctx()
    );
    const report = formatReport(results);
    expect(report).toContain('SKIP');
    expect(report).toContain('set CLOUDFLARE_API_TOKEN');
  });

  it('ends with a summary line counting each status', async () => {
    const { results } = await runDoctor(
      [
        stub('p1', { status: 'pass', detail: 'ok' }),
        stub('p2', { status: 'pass', detail: 'ok' }),
        stub('p3', { status: 'pass', detail: 'ok' }),
        stub('f1', { status: 'fail', detail: 'bad' }),
        stub('s1', { status: 'skip', detail: 'absent' }),
        stub('s2', { status: 'skip', detail: 'absent' }),
      ],
      ctx()
    );
    const report = formatReport(results);
    expect(report.trimEnd().split('\n').at(-1)).toBe('3 passed, 1 failed, 2 skipped');
  });

  it('contains no ANSI escape sequences', async () => {
    const { results } = await runDoctor(
      [stub('f', { status: 'fail', detail: 'bad' })],
      ctx()
    );
    // eslint-disable-next-line no-control-regex
    expect(formatReport(results)).not.toMatch(/\u001b\[/);
  });

  it('throws on an unknown conditionId', async () => {
    const { results } = await runDoctor(
      [stub('mystery', { status: 'fail', detail: 'bad' }, 'no.such-condition')],
      ctx()
    );
    expect(() => formatReport(results)).toThrowError(/unknown cairn condition/);
  });
});
