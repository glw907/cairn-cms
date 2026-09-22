import { describe, it, expect } from 'vitest';
import { runChecks } from '../../../scripts/checks/check-tool-release.mjs';

/**
 * Builds a stub fetch that returns the given status for every URL it is asked for, or throws
 * when status is `'throw'`.
 */
function stubFetch(status: number | 'throw') {
  return async (_url: string) => {
    if (status === 'throw') throw new Error('network unreachable');
    return { status } as Response;
  };
}

describe('runChecks', () => {
  it('fails when the tag is absent (404) even though the release check is never reached to matter', async () => {
    const fetchImpl = async (url: string) =>
      ({ status: url.includes('/git/ref/tags/') ? 404 : 200 }) as Response;
    const result = await runChecks(fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.messages.some((m) => m.includes('tag') && m.includes('not found'))).toBe(true);
  });

  it('fails when the tag is present but the release is absent (404)', async () => {
    const fetchImpl = async (url: string) =>
      ({ status: url.includes('/releases/tags/') ? 404 : 200 }) as Response;
    const result = await runChecks(fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.messages.some((m) => m.includes('release') && m.includes('not found'))).toBe(
      true,
    );
  });

  it('fails when the read itself fails, reporting it as unestablished rather than a confirmed absence', async () => {
    const result = await runChecks(stubFetch('throw'));
    expect(result.ok).toBe(false);
    expect(result.messages.every((m) => m.includes('could not read'))).toBe(true);
  });

  it('succeeds when both the tag and the release are found', async () => {
    const result = await runChecks(stubFetch(200));
    expect(result.ok).toBe(true);
  });
});
