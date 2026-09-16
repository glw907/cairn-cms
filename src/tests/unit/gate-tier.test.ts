import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  classifyPath,
  resolveTier,
  decideGate,
  parseArgs,
  TIER_GATES,
  TIER_ORDER,
} from '../../../scripts/checks/gate-tier.mjs';

const SCRIPT = resolve(process.cwd(), 'scripts/checks/gate-tier.mjs');

describe('classifyPath', () => {
  it('classifies a docs page, a bare markdown file, and CHANGELOG.md as docs', () => {
    expect(classifyPath('docs/admin/troubleshooting.md')).toBe('docs');
    expect(classifyPath('ROADMAP.md')).toBe('docs');
    expect(classifyPath('CHANGELOG.md')).toBe('docs');
  });

  it('classifies a check script and a test file as scripts', () => {
    expect(classifyPath('scripts/checks/check-facts.mjs')).toBe('scripts');
    expect(classifyPath('src/tests/unit/gate-tier.test.ts')).toBe('scripts');
    expect(classifyPath('examples/showcase/e2e/admin-visual.spec.ts')).toBe('scripts');
  });

  it('classifies src/lib TypeScript outside components as engine', () => {
    expect(classifyPath('src/lib/log/index.ts')).toBe('engine');
  });

  it('classifies a src/lib component and the admin stylesheet as admin-visual', () => {
    expect(classifyPath('src/lib/components/EditPage.svelte')).toBe('admin-visual');
    expect(classifyPath('src/lib/components/cairn-admin.css')).toBe('admin-visual');
  });

  it('classifies the render seam, theme/chassis CSS, a public route, and a snapshot as full', () => {
    expect(classifyPath('src/lib/render/markdown.ts')).toBe('full');
    expect(classifyPath('examples/showcase/src/chassis/tokens.css')).toBe('full');
    expect(classifyPath('examples/showcase/src/theme/site.css')).toBe('full');
    expect(classifyPath('examples/showcase/src/routes/(site)/archive/+page.svelte')).toBe('full');
    expect(classifyPath('examples/showcase/e2e/site-visual.spec.ts-snapshots/home-320.png')).toBe('full');
  });

  it('classifies a component a public page imports (showcase src/lib) as full', () => {
    expect(classifyPath('examples/showcase/src/lib/PostCard.svelte')).toBe('full');
  });

  it('returns null for a path none of the five triggers names', () => {
    expect(classifyPath('package.json')).toBeNull();
    expect(classifyPath('.github/workflows/test.yml')).toBeNull();
  });
});

describe('resolveTier', () => {
  it('resolves a docs-only diff to docs', () => {
    expect(resolveTier(['docs/why-cairn.md', 'CHANGELOG.md'])).toEqual({
      tier: 'docs',
      decidingPaths: ['docs/why-cairn.md', 'CHANGELOG.md'],
    });
  });

  it('resolves a scripts-only diff to scripts', () => {
    expect(resolveTier(['scripts/checks/check-idioms.mjs'])).toEqual({
      tier: 'scripts',
      decidingPaths: ['scripts/checks/check-idioms.mjs'],
    });
  });

  it('resolves an engine-only diff to engine', () => {
    expect(resolveTier(['src/lib/log/index.ts'])).toEqual({
      tier: 'engine',
      decidingPaths: ['src/lib/log/index.ts'],
    });
  });

  it('resolves an admin-component-only diff to admin-visual', () => {
    expect(resolveTier(['src/lib/components/EditPage.svelte'])).toEqual({
      tier: 'admin-visual',
      decidingPaths: ['src/lib/components/EditPage.svelte'],
    });
  });

  it('resolves a render-seam-only diff to full', () => {
    expect(resolveTier(['src/lib/render/markdown.ts'])).toEqual({
      tier: 'full',
      decidingPaths: ['src/lib/render/markdown.ts'],
    });
  });

  it('resolves a mixed diff to the highest tier present, naming only the deciding paths', () => {
    const result = resolveTier([
      'docs/admin/README.md',
      'src/lib/log/index.ts',
      'src/lib/components/EditPage.svelte',
    ]);
    expect(result.tier).toBe('admin-visual');
    expect(result.decidingPaths).toEqual(['src/lib/components/EditPage.svelte']);
  });

  it('treats an unclassified path as full in the overall resolution', () => {
    expect(resolveTier(['package.json'])).toEqual({ tier: 'full', decidingPaths: ['package.json'] });
  });
});

describe('decideGate', () => {
  it('reports the computed tier and its gate string with no floor or pin', () => {
    const decision = decideGate(['scripts/checks/check-idioms.mjs']);
    expect(decision).toEqual({
      tier: 'scripts',
      reason: 'computed',
      decidingPaths: ['scripts/checks/check-idioms.mjs'],
      gate: TIER_GATES.scripts,
    });
  });

  it('floors a docs diff at admin-visual when paint is yes', () => {
    const decision = decideGate(['docs/admin/README.md'], { paint: 'yes' });
    expect(decision.tier).toBe('admin-visual');
    expect(decision.reason).toBe('paint floor');
    expect(decision.gate).toBe(TIER_GATES['admin-visual']);
  });

  it('does not lower an already-higher tier when paint is yes', () => {
    const decision = decideGate(['src/lib/render/markdown.ts'], { paint: 'yes' });
    expect(decision.tier).toBe('full');
    expect(decision.reason).toBe('computed');
  });

  it('overrides the computed tier with --pin and reports reason "pin"', () => {
    const decision = decideGate(['docs/admin/README.md'], { pin: 'full' });
    expect(decision).toEqual({ tier: 'full', reason: 'pin', decidingPaths: [], gate: TIER_GATES.full });
  });

  it('pin wins even when it names a lower tier than the diff would compute', () => {
    const decision = decideGate(['src/lib/render/markdown.ts'], { pin: 'scripts' });
    expect(decision.tier).toBe('scripts');
    expect(decision.reason).toBe('pin');
  });

  it('throws on an unknown --pin tier', () => {
    expect(() => decideGate(['docs/admin/README.md'], { pin: 'nope' })).toThrow(/unknown --pin tier/);
  });
});

describe('parseArgs', () => {
  it('parses --range alone, defaulting paint to no and pin to null', () => {
    expect(parseArgs(['--range', 'abc..HEAD'])).toEqual({ range: 'abc..HEAD', paint: 'no', pin: null });
  });

  it('parses --paint and --pin alongside --range', () => {
    expect(parseArgs(['--range', 'abc..HEAD', '--paint', 'yes', '--pin', 'full'])).toEqual({
      range: 'abc..HEAD',
      paint: 'yes',
      pin: 'full',
    });
  });

  it('returns a null range when --range is absent', () => {
    expect(parseArgs([])).toEqual({ range: null, paint: 'no', pin: null });
  });
});

describe('TIER_ORDER and TIER_GATES', () => {
  it('names all five tiers, ascending severity, each with its own gate string', () => {
    expect(TIER_ORDER).toEqual(['docs', 'scripts', 'engine', 'admin-visual', 'full']);
    for (const tier of TIER_ORDER) expect(typeof TIER_GATES[tier]).toBe('string');
  });
});

// CLI integration: exercises the empty-range and git-failure exits, which decideGate alone cannot
// prove since they happen before any path classification runs.
describe('the CLI (spawned)', () => {
  it('exits non-zero with empty stdout on an empty range (HEAD..HEAD carries no diff)', () => {
    const out = spawnSync(process.execPath, [SCRIPT, '--range', 'HEAD..HEAD'], { encoding: 'utf8' });
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });

  it('exits non-zero with empty stdout when git fails on a malformed range', () => {
    const out = spawnSync(process.execPath, [SCRIPT, '--range', 'not-a-real-ref..HEAD'], {
      encoding: 'utf8',
    });
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });

  it('exits non-zero with empty stdout when --range is missing', () => {
    const out = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });

  it('prints only the gate string on stdout for a real one-commit range, plus the tier on stderr', () => {
    // Confirms the stdout/stderr split contract against a range this repo actually has: HEAD
    // against its own parent. The exact tier is not asserted, since it depends on HEAD's own
    // commit, which this task does not control.
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    const parent = spawnSync('git', ['rev-parse', `${head}^`], { encoding: 'utf8' }).stdout.trim();
    const real = spawnSync(process.execPath, [SCRIPT, '--range', `${parent}..${head}`], {
      encoding: 'utf8',
    });
    expect(real.status).toBe(0);
    expect(real.stdout.trim().length).toBeGreaterThan(0);
    expect(real.stdout.trim().split('\n')).toHaveLength(1);
    expect(real.stderr).toMatch(/gate-tier: (docs|scripts|engine|admin-visual|full)/);
  });
});
