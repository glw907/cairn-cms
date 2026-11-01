import { describe, it, expect } from 'vitest';
import { fastLaneLines, runFastLane } from '../../../scripts/checks/fast-lane.mjs';

describe('fastLaneLines', () => {
  it('returns each non-empty line of the classifier output', () => {
    expect(fastLaneLines({ status: 0, stdout: 'npm run check\n\nnpm run test:component\n' })).toEqual({
      lines: ['npm run check', 'npm run test:component'],
    });
  });

  it('fails when the classifier prints nothing, which is the case that once passed as a green lane', () => {
    expect(fastLaneLines({ status: 0, stdout: '' })).toEqual({ error: 'the classifier printed no legs' });
    expect(fastLaneLines({ status: 0, stdout: '  \n\n' })).toEqual({ error: 'the classifier printed no legs' });
  });

  it('fails when the classifier exits non-zero, whatever it printed', () => {
    const result = fastLaneLines({ status: 1, stdout: 'npm run check\n' });
    expect(result).toEqual({ error: 'the classifier exited 1' });
  });
});

describe('runFastLane', () => {
  const ok = { status: 0, stdout: 'leg one\nleg two\n' };

  it('runs the legs in order and returns 0 when all pass', () => {
    const ran: string[] = [];
    const code = runFastLane('main..HEAD', {
      classify: () => ok,
      run: (line: string) => (ran.push(line), 0),
    });
    expect(code).toBe(0);
    expect(ran).toEqual(['leg one', 'leg two']);
  });

  it('stops at the first failing leg and returns its exit code', () => {
    const ran: string[] = [];
    const code = runFastLane('main..HEAD', {
      classify: () => ok,
      run: (line: string) => (ran.push(line), line === 'leg one' ? 3 : 0),
    });
    expect(code).toBe(3);
    expect(ran).toEqual(['leg one']);
  });

  it('returns non-zero without running anything when the classifier prints nothing', () => {
    const ran: string[] = [];
    const code = runFastLane('main..HEAD', {
      classify: () => ({ status: 0, stdout: '' }),
      run: (line: string) => (ran.push(line), 0),
    });
    expect(code).not.toBe(0);
    expect(ran).toEqual([]);
  });
});
