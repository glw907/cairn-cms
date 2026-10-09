import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { matchesGlob, resolve } from 'node:path';
import {
  classifyPath,
  resolveTier,
  decideGate,
  parseArgs,
  relatedGate,
  CREATE_CAIRN_SITE_TRIGGERS,
  TIER_GATES,
  TIER_ORDER,
} from '../../../scripts/checks/gate-tier.mjs';
import { COMPONENT_RERUN_TRIGGERS } from '../../../scripts/test/component-rerun-triggers.mjs';
import { loadDeletionList } from '../../../scripts/checks/arm-state.mjs';

const SCRIPT = resolve(process.cwd(), 'scripts/checks/gate-tier.mjs');

describe('classifyPath', () => {
  it('classifies a docs page, a bare markdown file, and CHANGELOG.md as docs', () => {
    expect(classifyPath('docs/reference/core.md')).toBe('docs');
    expect(classifyPath('ROADMAP.md')).toBe('docs');
    expect(classifyPath('CHANGELOG.md')).toBe('docs');
  });

  it('classifies a check script and a test file as scripts', () => {
    expect(classifyPath('scripts/checks/check-facts.mjs')).toBe('scripts');
    expect(classifyPath('src/tests/unit/gate-tier.test.ts')).toBe('scripts');
    expect(classifyPath('examples/showcase/e2e/admin-visual.spec.ts')).toBe('scripts');
  });

  it('classifies a create-cairn-site workspace file as scripts, the Node-only tier that runs its own test suite', () => {
    expect(classifyPath('packages/create-cairn-site/src/prompts.mjs')).toBe('scripts');
    expect(classifyPath('packages/create-cairn-site/src/prompts.test.mjs')).toBe('scripts');
  });

  it('classifies src/lib TypeScript outside components as engine', () => {
    expect(classifyPath('src/lib/log/index.ts')).toBe('engine');
  });

  it('classifies a src/lib component and the admin stylesheet as admin-visual', () => {
    expect(classifyPath('src/lib/admin/EditPage.svelte')).toBe('admin-visual');
    expect(classifyPath('src/lib/admin/cairn-admin.css')).toBe('admin-visual');
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
    expect(classifyPath('src/lib/public/PreviewBanner.svelte')).toBe('full');
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
    expect(resolveTier(['docs/reference/render.md', 'CHANGELOG.md'])).toEqual({
      tier: 'docs',
      decidingPaths: ['docs/reference/render.md', 'CHANGELOG.md'],
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
    expect(resolveTier(['src/lib/admin/EditPage.svelte'])).toEqual({
      tier: 'admin-visual',
      decidingPaths: ['src/lib/admin/EditPage.svelte'],
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
      'docs/reference/README.md',
      'src/lib/log/index.ts',
      'src/lib/admin/EditPage.svelte',
    ]);
    expect(result.tier).toBe('admin-visual');
    expect(result.decidingPaths).toEqual(['src/lib/admin/EditPage.svelte']);
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
    const decision = decideGate(['docs/reference/README.md'], { paint: 'yes' });
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
    const decision = decideGate(['docs/reference/README.md'], { pin: 'full' });
    expect(decision).toEqual({ tier: 'full', reason: 'pin', decidingPaths: [], gate: TIER_GATES.full });
  });

  it('pin wins even when it names a lower tier than the diff would compute', () => {
    const decision = decideGate(['src/lib/render/markdown.ts'], { pin: 'scripts' });
    expect(decision.tier).toBe('scripts');
    expect(decision.reason).toBe('pin');
  });

  it('throws on an unknown --pin tier', () => {
    expect(() => decideGate(['docs/reference/README.md'], { pin: 'nope' })).toThrow(/unknown --pin tier/);
  });

  it('throws on a prototype-chain pin like "toString", never returning it as a gate', () => {
    expect(() => decideGate(['docs/reference/README.md'], { pin: 'toString' })).toThrow(/unknown --pin tier/);
  });

  it('throws on a prototype-chain pin like "constructor"', () => {
    expect(() => decideGate(['docs/reference/README.md'], { pin: 'constructor' })).toThrow(/unknown --pin tier/);
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
    const decision = decideGate(['docs/reference/README.md'], { pin: 'tool' });
    expect(decision).toEqual({ tier: 'tool', reason: 'pin', decidingPaths: [], gate: 'make -C tool check' });
  });
});

describe('parseArgs', () => {
  it('parses --range alone, defaulting paint to no and pin to null', () => {
    expect(parseArgs(['--range', 'abc..HEAD'])).toEqual({
      range: 'abc..HEAD',
      paint: 'no',
      pin: null,
      related: false,
    });
  });

  it('parses --paint and --pin alongside --range', () => {
    expect(parseArgs(['--range', 'abc..HEAD', '--paint', 'yes', '--pin', 'full'])).toEqual({
      range: 'abc..HEAD',
      paint: 'yes',
      pin: 'full',
      related: false,
    });
  });

  it('parses --related as a bare flag', () => {
    expect(parseArgs(['--range', 'abc..HEAD', '--related']).related).toBe(true);
  });

  it('returns a null range when --range is absent', () => {
    expect(parseArgs([])).toEqual({ range: null, paint: 'no', pin: null, related: false });
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

  it('the scripts gate runs the create-cairn-site workspace test suite root `npm test` never reaches', () => {
    expect(TIER_GATES.scripts).toContain('npm test -w packages/create-cairn-site');
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

  it('the docs tier is the one docs-gate script', () => {
    expect(TIER_GATES.docs).toBe('npm run check:docs-gate');
  });

  it('the full gate runs the admin-visual spec once inside the admin-visual string, then the whole showcase suite', () => {
    expect(TIER_GATES.full).toContain('test:e2e -- admin-visual.spec.ts && npm run check:comments');
    expect(TIER_GATES.full.endsWith('npm --prefix examples/showcase run test:e2e')).toBe(true);
  });

  it('the engine gate runs the node projects, then the serialized component run, then the create-cairn-site suite', () => {
    expect(TIER_GATES.engine).toContain(
      'npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site',
    );
    expect(TIER_GATES.engine.endsWith('npm test -w packages/create-cairn-site')).toBe(true);
  });

  it('runs no npm check script twice in the full tier, since check:docs-gate already carries the docs-gate components', () => {
    const scripts = [...TIER_GATES.full.matchAll(/npm run (check:[a-z:-]+)/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    expect(new Set(scripts).size).toBe(scripts.length);
  });
});

// The full tier runs every check the CI `test` job runs that a local gate can run. The list is
// pinned against test.yml's own steps: a `run:` step added to CI that the full gate neither runs
// nor names below fails this test.
//
// A CI command the full gate runs under another spelling names its stand-in tokens here; each
// stand-in must be a whole `&&`-separated command of the full gate.
const CI_EQUIVALENTS: Record<string, string[]> = {
  // `npm test` is the node projects plus the component project; the gate serializes the component run.
  'npm test': ['npm run test:node-projects', 'npm run test:component -- --no-file-parallelism'],
  // The same suite, reached by workspace flag instead of `--prefix`.
  'npm --prefix packages/create-cairn-site test': ['npm test -w packages/create-cairn-site'],
};

// A CI step with no local gate command, each with the reason it stays out of the tier.
const CI_NOT_LOCAL: Record<string, string> = {
  'npm ci': 'installs dependencies; the worktree already has them',
  'npm ci --prefix examples/showcase': 'installs the showcase dependencies; the showcase gates need them installed',
  'npx playwright install --with-deps chromium firefox': 'installs browsers on the CI runner',
  'npm run package': 'builds dist; every check script that needs dist builds it itself',
  'name:Install Vale 3.23.0': 'installs Vale on the CI runner; the docs gate runs the workstation Vale',
  'name:Bake the create-cairn-site template':
    'bakes the gitignored template with an engine spec only CI can substitute; the workspace suite reads the baked copy on disk',
};

/**
 * Every `run:` step of the CI `test` job in a workflow file's text: a one-line `run: <cmd>` as
 * the command, a block `run: |` as `name:<step name>` (the block body is shell, not one command).
 * Steps of any other job are not read, and a step's name never carries over to the next step.
 * @param text - The workflow file's contents.
 * @returns The `test` job's run steps, in file order.
 */
function ciStepsOf(text: string): string[] {
  const steps: string[] = [];
  let inTestJob = false;
  let stepIndent: number | null = null;
  let name = '';
  for (const line of text.split('\n')) {
    const job = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (job) {
      inTestJob = job[1] === 'test';
      stepIndent = null;
      name = '';
      continue;
    }
    if (!inTestJob) continue;
    const item = line.match(/^(\s*)- /);
    if (item) {
      stepIndent ??= item[1].length;
      if (item[1].length === stepIndent) name = '';
    }
    const named = line.match(/^\s*(?:- )?name:\s*(.+?)\s*$/);
    if (named) name = named[1];
    const run = line.match(/^\s*(?:- )?run:\s*(.+?)\s*$/);
    if (!run) continue;
    steps.push(run[1] === '|' ? `name:${name}` : run[1]);
  }
  return steps;
}

/**
 * Every `run:` step of the CI `test` job.
 * @returns The `test` job's run steps of `.github/workflows/test.yml`.
 */
function ciSteps(): string[] {
  return ciStepsOf(readFileSync(resolve(process.cwd(), '.github/workflows/test.yml'), 'utf8'));
}

describe('the CI step parser', () => {
  const workflow = [
    'name: test',
    'jobs:',
    '  test:',
    '    steps:',
    '      - name: Named block',
    '        run: |',
    '          echo one',
    '      - run: |',
    '          echo unnamed',
    '      - run: npm run check',
    '  later:',
    '    steps:',
    '      - run: npm run only-in-later-job',
  ].join('\n');

  it('reads only the test job, so a second job adds no step', () => {
    expect(ciStepsOf(workflow)).not.toContain('npm run only-in-later-job');
  });

  it('keys an unnamed block step by an empty name, never the previous step\'s name', () => {
    expect(ciStepsOf(workflow)).toEqual(['name:Named block', 'name:', 'npm run check']);
  });
});

describe('the full tier against CI', () => {
  const gateCommands = new Set(TIER_GATES.full.split(' && '));

  it('reads a non-trivial set of steps from test.yml', () => {
    expect(ciSteps().length).toBeGreaterThan(20);
  });

  it('runs every check the CI test job runs, or names why a local gate cannot', () => {
    const missing = ciSteps().filter((step) => {
      if (gateCommands.has(step) || step in CI_NOT_LOCAL) return false;
      const stand = CI_EQUIVALENTS[step];
      return !(stand && stand.every((cmd) => gateCommands.has(cmd)));
    });
    expect(missing).toEqual([]);
  });

  it('names no CI step that test.yml has dropped', () => {
    const steps = new Set(ciSteps());
    for (const key of [...Object.keys(CI_EQUIVALENTS), ...Object.keys(CI_NOT_LOCAL)]) {
      expect(steps.has(key), key).toBe(true);
    }
  });

  it('runs check:dev-package', () => {
    expect(gateCommands.has('npm run check:dev-package')).toBe(true);
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

// The harvest deletes every page on the deletion list at once. That diff names only docs paths, so
// it runs the docs gate, whose arm-aware checks (arm-state.mjs) are what prove the empty arms.
describe('the harvest deletion diff', () => {
  it('classifies the deletion of every deletion-list page to the docs tier', () => {
    const { deleted } = loadDeletionList(resolve(process.cwd()));
    expect(deleted.length).toBeGreaterThan(0);
    expect(decideGate(deleted)).toMatchObject({ tier: 'docs', gate: TIER_GATES.docs });
  });
});

// Related mode's legs, spelled out as literals so a change to any leg in the script fails here.
const STATIC =
  'npm run check:close:prebuilt && npm run check:tool-heuristics && npm run test:emit && npm --prefix examples/showcase run test:unit';
const NODE = 'npm run test:node-projects';
const COMPONENT_FULL = 'npm run test:component -- --no-file-parallelism';
const COMPONENT_RELATED =
  'node scripts/test/contained.mjs npx vitest related --run --project component --no-file-parallelism';
const CREATE_CAIRN_SITE = 'npm test -w packages/create-cairn-site';

describe('decideGate without --related', () => {
  // Every tier and option shape the runner and older plans pass; none of them may move.
  const shapes: { paths: string[]; opts: { paint?: 'yes' | 'no'; pin?: string | null } }[] = [
    { paths: ['docs/reference/core.md'], opts: {} },
    { paths: ['scripts/checks/check-idioms.mjs'], opts: {} },
    { paths: ['src/lib/log/index.ts'], opts: {} },
    { paths: ['src/lib/admin/EditPage.svelte'], opts: {} },
    { paths: ['src/lib/render/markdown.ts'], opts: {} },
    { paths: ['tool/main.go'], opts: {} },
    { paths: ['src/lib/log/index.ts', 'tool/main.go'], opts: {} },
    { paths: ['docs/reference/core.md'], opts: { paint: 'yes' } },
    ...[...TIER_ORDER, 'tool'].map((pin) => ({ paths: ['src/lib/log/index.ts'], opts: { pin } })),
  ];

  for (const { paths, opts } of shapes) {
    it(`leaves ${paths.join(', ')} ${JSON.stringify(opts)} unchanged`, () => {
      const plain = decideGate(paths, opts);
      expect(decideGate(paths, { ...opts, related: false })).toEqual(plain);
      expect(plain).not.toHaveProperty('related');
      const base = plain.tier.replace(/\+tool$/, '');
      const want = plain.tier.endsWith('+tool') ? `${TIER_GATES[base]} && make -C tool check` : TIER_GATES[plain.tier];
      expect(plain.gate).toBe(want);
    });
  }

  it('keeps the engine string byte-identical to the one the runner has always run', () => {
    expect(TIER_GATES.engine).toBe(
      'npm run check:docs-gate && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site',
    );
  });
});

describe('decideGate with --related', () => {
  const rows: { name: string; paths: string[]; opts?: { pin?: string; paint?: 'yes'; deleted?: string[] }; gate: string }[] = [
    {
      name: 'a one-file src/lib change runs its related component tests and fails on an empty selection',
      paths: ['src/lib/log/index.ts'],
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} --no-passWithNoTests src/lib/log/index.ts`,
    },
    {
      name: 'a component-test-only change runs that test, and an empty selection is not a src/lib failure',
      paths: ['src/tests/component/EditPage.test.ts'],
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} src/tests/component/EditPage.test.ts`,
    },
    {
      name: 'a node-test-only change runs no component command',
      paths: ['src/tests/unit/gate-tier.test.ts'],
      gate: `${STATIC} && ${NODE}`,
    },
    {
      name: 'a scripts-only change runs no component command',
      paths: ['scripts/checks/check-idioms.mjs'],
      gate: `${STATIC} && ${NODE}`,
    },
    {
      name: 'a mixed src/lib and test change passes every component-reachable path, docs and node tests left out',
      paths: ['src/lib/log/index.ts', 'src/tests/component/EditPage.test.ts', 'src/tests/unit/log.test.ts', 'CHANGELOG.md'],
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} --no-passWithNoTests src/lib/log/index.ts src/tests/component/EditPage.test.ts`,
    },
    {
      name: 'a deleted path stays out of the related file list',
      paths: ['src/lib/log/old.ts', 'src/tests/component/EditPage.test.ts'],
      opts: { deleted: ['src/lib/log/old.ts'] },
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} src/tests/component/EditPage.test.ts`,
    },
    {
      name: 'a path with shell metacharacters is quoted as one word',
      paths: ['src/tests/component/(group)/x.test.ts'],
      opts: { pin: 'engine' },
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} 'src/tests/component/(group)/x.test.ts'`,
    },
    {
      name: 'a create-cairn-site change adds its suite',
      paths: ['packages/create-cairn-site/src/prompts.mjs'],
      gate: `${STATIC} && ${NODE} && ${CREATE_CAIRN_SITE}`,
    },
    {
      name: 'a pinned engine tier narrows the same way',
      paths: ['docs/reference/core.md', 'src/lib/log/index.ts'],
      opts: { pin: 'engine' },
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} --no-passWithNoTests src/lib/log/index.ts`,
    },
    {
      name: 'a mixed engine and tool diff narrows the npm half and still runs the tool gate',
      paths: ['src/lib/log/index.ts', 'tool/main.go'],
      gate: `${STATIC} && ${NODE} && ${COMPONENT_RELATED} --no-passWithNoTests src/lib/log/index.ts && make -C tool check`,
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      expect(decideGate(row.paths, { ...row.opts, related: true }).gate).toBe(row.gate);
    });
  }

  it('reports the component mode and the forcing paths', () => {
    expect(decideGate(['src/lib/log/index.ts'], { related: true }).related).toEqual({ component: 'related', forcing: [] });
    expect(decideGate(['scripts/checks/check-idioms.mjs'], { related: true }).related).toEqual({
      component: 'none',
      forcing: [],
    });
  });

  // Tiers outside scripts and engine keep their own string under the flag.
  const untouched: { paths: string[]; opts?: { pin?: string; paint?: 'yes' } }[] = [
    { paths: ['docs/reference/core.md'] },
    { paths: ['src/lib/admin/EditPage.svelte'] },
    { paths: ['src/lib/render/markdown.ts'] },
    { paths: ['tool/main.go'] },
    { paths: ['src/lib/log/index.ts'], opts: { paint: 'yes' } },
    { paths: ['src/lib/log/index.ts'], opts: { pin: 'full' } },
  ];

  for (const { paths, opts } of untouched) {
    it(`leaves ${paths.join(', ')} ${JSON.stringify(opts ?? {})} on its own tier string`, () => {
      expect(decideGate(paths, { ...opts, related: true })).toEqual(decideGate(paths, opts));
    });
  }
});

describe('relatedGate fallbacks', () => {
  // One path per COMPONENT_RERUN_TRIGGERS entry; each runs the whole component project.
  const forcing = [
    'src/lib/admin/EditPage.svelte',
    'src/lib/admin-toolkit/AdminTable.svelte',
    'scripts/build/build-admin-css.mjs',
    'scripts/build/admin-css.input.css',
    'migrations/0001_init.sql',
    'wrangler.test.jsonc',
    'vitest.config.ts',
    'svelte.config.js',
    'src/tests/types/tsconfig.json',
    'package.json',
    'package-lock.json',
    'src/tests/component/_setup.ts',
    'src/tests/helpers/test-event.ts',
    'src/tests/component/fixtures/admin-table-baseline.html',
  ];

  it('names a row for every trigger, so dropping one fails its row', () => {
    for (const glob of COMPONENT_RERUN_TRIGGERS) {
      expect(forcing.some((path) => matchesGlob(path, glob)), glob).toBe(true);
    }
  });

  for (const path of forcing) {
    it(`runs the whole component project when ${path} changes`, () => {
      const result = relatedGate(['src/lib/log/index.ts', path]);
      expect(result.component).toBe('full');
      expect(result.forcing).toEqual([path]);
      expect(result.gate.startsWith(`${STATIC} && ${NODE} && ${COMPONENT_FULL}`)).toBe(true);
      expect(result.gate).not.toContain('vitest related');
    });
  }

  // One path per CREATE_CAIRN_SITE_TRIGGERS entry; each adds the create-cairn-site suite.
  const scaffolding = [
    'packages/create-cairn-site/src/prompts.mjs',
    'examples/showcase/e2e/admin.spec.ts',
    'scripts/build/emit-template.mjs',
    'package.json',
  ];

  it('names a row for every create-cairn-site trigger', () => {
    for (const glob of CREATE_CAIRN_SITE_TRIGGERS) {
      expect(scaffolding.some((path) => matchesGlob(path, glob)), glob).toBe(true);
    }
  });

  for (const path of scaffolding) {
    it(`runs the create-cairn-site suite when ${path} changes`, () => {
      expect(relatedGate([path]).gate.endsWith(` && ${CREATE_CAIRN_SITE}`)).toBe(true);
    });
  }

  it('runs no create-cairn-site suite for a templates/ path alone, which the bake writes but never reads', () => {
    expect(relatedGate(['templates/waymark/src/hooks.server.ts']).gate).toBe(`${STATIC} && ${NODE}`);
  });

  it('feeds the same trigger list to Vitest as forceRerunTriggers', () => {
    const config = readFileSync(resolve(process.cwd(), 'vitest.config.ts'), 'utf8');
    expect(config).toContain("from './scripts/test/component-rerun-triggers.mjs'");
    expect(config).toMatch(/forceRerunTriggers: FORCE_RERUN_TRIGGERS/);
  });
});
