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

  it('classifies a shared admin-toolkit component as admin-visual', () => {
    expect(classifyPath('src/lib/admin-toolkit/OfficeList.svelte')).toBe('admin-visual');
  });

  it('matches each rule by path prefix only, not by a substring anywhere in the path', () => {
    // "admin-toolkit" contains "tool" but classifies on its own admin-visual prefix; "docs/tool/"
    // sits under docs/ so stays docs, never the standalone tool tier; "tooling/" is not "tool/"
    // so classifyPath finds no match and the caller-side unclassified default (full) applies.
    expect(classifyPath('src/lib/admin-toolkit/x.ts')).toBe('admin-visual');
    expect(classifyPath('docs/tool/x.md')).toBe('docs');
    expect(classifyPath('tooling/x.go')).toBeNull();
    expect(decideGate(['tooling/x.go']).tier).toBe('full');
  });

  it('classifies the render seam, theme/chassis CSS, a public route, and a snapshot as full', () => {
    expect(classifyPath('src/lib/render/markdown.ts')).toBe('full');
    expect(classifyPath('examples/showcase/src/chassis/tokens.css')).toBe('full');
    expect(classifyPath('examples/showcase/src/theme/site.css')).toBe('full');
    expect(classifyPath('examples/showcase/src/routes/(site)/archive/+page.svelte')).toBe('full');
    expect(classifyPath('examples/showcase/e2e/site-visual.spec.ts-snapshots/home-320.png')).toBe('full');
  });

  it('returns null for a path none of the five triggers names, including a showcase src/lib path (the directory does not exist; a public-page component there would fall to the caller-side full default)', () => {
    expect(classifyPath('package.json')).toBeNull();
    expect(classifyPath('.github/workflows/test.yml')).toBeNull();
    expect(classifyPath('examples/showcase/src/lib/PostCard.svelte')).toBeNull();
    expect(classifyPath('templates/waymark/src/hooks.server.ts')).toBeNull();
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

  it('treats a non-tool unclassified path as full even alongside tool/** in the diff (resolveTier itself is unaware of the tool tier; decideGate is the one that splits tool/** off first)', () => {
    expect(resolveTier(['package.json', 'tool/main.go'])).toEqual({
      tier: 'full',
      decidingPaths: ['package.json', 'tool/main.go'],
    });
  });

  it('treats an unclassified showcase src/lib path as full too, with no dedicated rule for it', () => {
    expect(resolveTier(['examples/showcase/src/lib/PostCard.svelte'])).toEqual({
      tier: 'full',
      decidingPaths: ['examples/showcase/src/lib/PostCard.svelte'],
    });
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

  it('throws on a prototype-chain pin like "toString", never returning it as a gate', () => {
    expect(() => decideGate(['docs/admin/README.md'], { pin: 'toString' })).toThrow(/unknown --pin tier/);
  });

  it('throws on a prototype-chain pin like "constructor"', () => {
    expect(() => decideGate(['docs/admin/README.md'], { pin: 'constructor' })).toThrow(/unknown --pin tier/);
  });

  it('does not resolve to the tool tier when both npmPaths and toolPaths are empty', () => {
    // Pins the prior (pre-fix) behavior for an empty path list: resolveTier([]) has no path to
    // rank, so TIER_ORDER[Math.max(...[])] is undefined and TIER_GATES[undefined] is undefined.
    const decision = decideGate([]);
    expect(decision).toEqual({ tier: undefined, reason: 'computed', decidingPaths: [], gate: undefined });
  });

  it('resolves a tool-only diff to the tool tier and its standalone gate string', () => {
    const decision = decideGate(['tool/internal/spine/chapter.go']);
    expect(decision).toEqual({
      tier: 'tool',
      reason: 'computed',
      decidingPaths: ['tool/internal/spine/chapter.go'],
      gate: 'make -C tool check',
    });
  });

  it('counts a tool/**/*.md path as tool, not docs', () => {
    const decision = decideGate(['tool/docs/getting-started.md']);
    expect(decision.tier).toBe('tool');
    expect(decision.gate).toBe('make -C tool check');
  });

  it('resolves a mixed tool and npm diff to "<npm tier>+tool" and runs both gate strings', () => {
    const decision = decideGate(['src/lib/log/index.ts', 'tool/internal/spine/chapter.go']);
    expect(decision.tier).toBe('engine+tool');
    expect(decision.reason).toBe('computed');
    expect(decision.decidingPaths).toEqual(['src/lib/log/index.ts', 'tool/internal/spine/chapter.go']);
    expect(decision.gate).toBe(`${TIER_GATES.engine} && make -C tool check`);
  });

  it('applies the paint floor to the npm half of a mixed diff, then still appends the tool gate', () => {
    const decision = decideGate(['scripts/checks/check-idioms.mjs', 'tool/main.go'], { paint: 'yes' });
    expect(decision.tier).toBe('admin-visual+tool');
    expect(decision.reason).toBe('paint floor');
    expect(decision.gate).toBe(`${TIER_GATES['admin-visual']} && make -C tool check`);
  });

  it('does not apply the paint floor to a tool-only diff, since paint is an npm-admin concept', () => {
    const decision = decideGate(['tool/main.go'], { paint: 'yes' });
    expect(decision.tier).toBe('tool');
    expect(decision.reason).toBe('computed');
    expect(decision.gate).toBe('make -C tool check');
  });

  it('accepts --pin tool and prints its gate string', () => {
    const decision = decideGate(['docs/admin/README.md'], { pin: 'tool' });
    expect(decision).toEqual({ tier: 'tool', reason: 'pin', decidingPaths: [], gate: 'make -C tool check' });
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

  it('scripts and engine share the identical gate string', () => {
    expect(TIER_GATES.scripts).toBe(TIER_GATES.engine);
  });

  it('every npm tier above docs is a strict superset of the npm tier below it', () => {
    expect(TIER_GATES.scripts.startsWith(TIER_GATES.docs)).toBe(true);
    expect(TIER_GATES.scripts.length).toBeGreaterThan(TIER_GATES.docs.length);
    expect(TIER_GATES['admin-visual'].startsWith(TIER_GATES.scripts)).toBe(true);
    expect(TIER_GATES['admin-visual'].length).toBeGreaterThan(TIER_GATES.scripts.length);
    expect(TIER_GATES.full.startsWith(TIER_GATES['admin-visual'])).toBe(true);
    expect(TIER_GATES.full.length).toBeGreaterThan(TIER_GATES['admin-visual'].length);
  });

  it('the tool gate stands outside the npm superset chain, sharing no prefix with any npm tier', () => {
    expect(TIER_GATES.tool).toBe('make -C tool check');
    expect(TIER_GATES.full.startsWith(TIER_GATES.tool)).toBe(false);
    expect(TIER_GATES.docs.startsWith(TIER_GATES.tool)).toBe(false);
  });

  it('the docs gate names every docs-tier check, including check:reference:signatures', () => {
    expect(TIER_GATES.docs).toBe(
      'npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts',
    );
  });

  it('the full gate runs the admin-visual spec once inside the admin-visual string, then the whole showcase suite', () => {
    expect(TIER_GATES.full).toContain('test:e2e -- admin-visual.spec.ts && npm run check:comments');
    expect(TIER_GATES.full.endsWith('npm --prefix examples/showcase run test:e2e')).toBe(true);
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

  it('prints only the gate string on stdout for a real range, plus the tier on stderr', () => {
    // Confirms the stdout/stderr split contract against a range this repo always has: HEAD against
    // git's empty tree, which exists in every clone, shallow CI checkouts included (HEAD^ does
    // not). The exact tier is not asserted; a whole-tree diff resolves to full, and that is fine.
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    const parent = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
    const real = spawnSync(process.execPath, [SCRIPT, '--range', `${parent}..${head}`], {
      encoding: 'utf8',
    });
    expect(real.status).toBe(0);
    expect(real.stdout.trim().length).toBeGreaterThan(0);
    expect(real.stdout.trim().split('\n')).toHaveLength(1);
    expect(real.stderr).toMatch(/gate-tier: (docs|scripts|engine|admin-visual|full)/);
  });
});
