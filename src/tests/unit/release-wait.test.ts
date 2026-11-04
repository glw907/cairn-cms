import { describe, it, expect } from 'vitest';
import { waitForTag } from '../../../scripts/release/wait.mjs';

const NAMES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev', 'create-cairn-site'];

/** A fetch serving each package's `gate` tag from a function of the poll round. */
function registry(tagFor: (pkg: string, round: number) => string) {
  const requests: { url: string; init?: RequestInit }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    const round = Math.floor((requests.length - 1) / NAMES.length);
    const pkg = NAMES.find((n) => url.endsWith(`/${n}`))!;
    return { ok: true, json: async () => ({ 'dist-tags': { gate: tagFor(pkg, round) } }) };
  }) as unknown as typeof fetch;
  return { fetchFn, requests };
}

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

describe('waitForTag', () => {
  it('polls until a package one step behind catches up, with the no-cache option on every request', async () => {
    const { fetchFn, requests } = registry((pkg, round) =>
      pkg === 'create-cairn-site' && round < 2 ? '0.99.0-rc.3' : '0.99.0-rc.4'
    );
    const r = await waitForTag(fetchFn, { version: '0.99.0-rc.4', tag: 'gate', ...clock() });
    expect(r.ok).toBe(true);
    expect(r.next).toMatch(/^Next: /);
    expect(requests).toHaveLength(NAMES.length * 3);
    expect(requests.every((q) => q.init?.cache === 'no-store')).toBe(true);
  });

  it('times out naming each package and what its tag holds', async () => {
    const { fetchFn } = registry((pkg) => (pkg === 'create-cairn-site' ? '0.99.0-rc.3' : '0.99.0-rc.4'));
    const r = await waitForTag(fetchFn, { version: '0.99.0-rc.5', tag: 'gate', ...clock() });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        '@glw907/cairn-cms: gate holds 0.99.0-rc.4',
        '@glw907/cairn-cms-dev: gate holds 0.99.0-rc.4',
        'create-cairn-site: gate holds 0.99.0-rc.3'
      ])
    );
    expect(r.next).toMatch(/^Next: /);
  });
});
