import { describe, it, expect } from 'vitest';
import { status } from '../../../scripts/release/status.mjs';

const NAMES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev', 'create-cairn-site'];

interface World {
  tagOnOrigin: boolean;
  isPrerelease: boolean;
  tags: Record<string, Record<string, string>>;
  provenance: Record<string, boolean>;
  changelog: string;
  verdictStatus: number;
}

function world(version: string, patch: Partial<World> = {}): World {
  const pre = version.includes('-');
  const tags: Record<string, Record<string, string>> = {};
  for (const n of NAMES) {
    tags[n] = pre ? { next: version, ...(n === 'create-cairn-site' ? { latest: version } : { latest: '0.98.0' }) } : { latest: version };
  }
  return {
    tagOnOrigin: true,
    isPrerelease: pre,
    tags,
    provenance: Object.fromEntries(NAMES.map((n) => [n, true])),
    changelog: `# Changelog\n\n## ${version}\n\nReleased 2026-11-01.\n`,
    verdictStatus: 0,
    ...patch
  };
}

function run(version: string, w: World) {
  const calls: string[][] = [];
  const runner = (cmd: string, args: string[]) => {
    calls.push([cmd, ...args]);
    if (cmd === 'git') return { status: 0, stdout: w.tagOnOrigin ? `abc123\trefs/tags/v${version}\n` : '' };
    if (cmd === 'gh') return { status: 0, stdout: JSON.stringify({ tagName: `v${version}`, isPrerelease: w.isPrerelease }) };
    return { status: w.verdictStatus, stdout: '' };
  };
  const fetchFn = (async (url: string) => {
    const pkg = NAMES.find((n) => url.endsWith(`/${n}`) || url.endsWith(`/${n}/${version}`))!;
    const body = url.endsWith(`/${version}`)
      ? { dist: { attestations: w.provenance[pkg] ? { provenance: { predicateType: 'slsa' } } : {} } }
      : { 'dist-tags': w.tags[pkg] };
    return { ok: true, json: async () => body };
  }) as unknown as typeof fetch;
  return { calls, result: status({ run: runner, fetchFn, changelog: w.changelog }, version) };
}

describe('release status', () => {
  const PRE = '0.99.0-rc.4';
  const STABLE = '0.99.0';

  it('passes a complete prerelease and runs the verdict', async () => {
    const { calls, result } = run(PRE, world(PRE));
    const r = await result;
    expect(r.ok).toBe(true);
    expect(r.next).toMatch(/^Next: /);
    expect(calls).toContainEqual(['node', 'scripts/gate/verdict.mjs', PRE]);
  });

  it('passes a complete stable and never runs the verdict', async () => {
    const { calls, result } = run(STABLE, world(STABLE));
    const r = await result;
    expect(r.ok).toBe(true);
    expect(r.items).not.toHaveProperty('verdict');
    expect(calls.some((c) => c.includes('scripts/gate/verdict.mjs'))).toBe(false);
  });

  const cases: [string, string, (w: World) => Partial<World>][] = [
    ['no tag on origin', 'tag', () => ({ tagOnOrigin: false })],
    ['isPrerelease false on a prerelease', 'release', () => ({ isPrerelease: false })],
    ['next behind on one package', 'distTags', (w) => ({ tags: { ...w.tags, '@glw907/cairn-cms-dev': { next: '0.99.0-rc.3', latest: '0.98.0' } } })],
    ['create-cairn-site latest behind', 'distTags', (w) => ({ tags: { ...w.tags, 'create-cairn-site': { next: PRE, latest: '0.99.0-rc.3' } } })],
    ['no provenance on one package', 'provenance', (w) => ({ provenance: { ...w.provenance, 'create-cairn-site': false } })],
    ['no CHANGELOG heading', 'changelog', () => ({ changelog: '# Changelog\n\n## 0.99.0-rc.3\n' })],
    ['verdict exit 1', 'verdict', () => ({ verdictStatus: 1 })]
  ];
  for (const [label, item, patch] of cases) {
    it(`fails and names "${item}" for ${label}`, async () => {
      const w = world(PRE);
      const r = await run(PRE, world(PRE, patch(w))).result;
      expect(r.ok).toBe(false);
      expect(r.items[item].ok).toBe(false);
      expect(r.next).toContain(item);
    });
  }

  it('fails a stable whose latest is behind', async () => {
    const w = world(STABLE);
    w.tags['@glw907/cairn-cms'] = { latest: '0.98.0' };
    const r = await run(STABLE, w).result;
    expect(r.ok).toBe(false);
    expect(r.items.distTags.detail).toContain('@glw907/cairn-cms: latest holds 0.98.0');
  });
});
