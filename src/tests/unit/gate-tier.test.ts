import { afterAll, describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CREATE_CAIRN_SITE_TRIGGERS,
  PASS_CLASSES,
  TIER_GATES,
  TIER_ORDER,
  componentPlan,
  decideGate,
  e2eSpecs,
  loadContext,
  matchesPattern,
  parseArgs,
  pathBuckets,
  protectedVerdict,
  selectChecks,
  tableProblems,
} from '../../../scripts/checks/gate-tier.mjs';
import { CLOSE_COMPONENTS, closeSteps, selectSteps } from '../../../scripts/checks/close-prebuilt.mjs';
import { COMPONENT_RERUN_TRIGGERS } from '../../../scripts/test/component-rerun-triggers.mjs';
import { loadDeletionList } from '../../../scripts/checks/arm-state.mjs';
import { RERUN_TRIGGER_PATHS } from './_rerun-trigger-paths.js';

const SCRIPT = resolve(process.cwd(), 'scripts/checks/gate-tier.mjs');
const context = loadContext();
const { table } = context;

/** The static check labels a path set selects. */
const labelsFor = (...paths: string[]) => selectChecks(paths, context).labels;

describe('the table', () => {
  // One real path per pattern, so a pattern that matches nothing fails its own row. The dot
  // patterns are literal prefixes or exact paths.
  const rows: [bucket: string, pattern: string, path: string][] = [
    ['docs', 'docs/', 'docs/internal/pass-gate-tiers.md'],
    ['docs', '*.md', 'README.md'],
    ['docs', '**/*.md', 'examples/showcase/README.md'],
    ['docs', '.vale/', '.vale/tests/vale.ini'],
    ['docs', '.vale.ini', '.vale.ini'],
    ['docs', '.tellgrader.json', '.tellgrader.json'],
    ['docs', 'skills/', 'skills/cairn-consult/SKILL.md'],
    ['docs', 'claude/', 'claude/CLAUDE.md'],
    ['scripts', 'scripts/', 'scripts/checks/check-idioms.mjs'],
    ['scripts', 'src/tests/', 'src/tests/unit/gate-tier.test.ts'],
    ['scripts', '.github/', '.github/workflows/test.yml'],
    ['scripts', 'eslint.config.js', 'eslint.config.js'],
    ['scripts', 'vitest.config.ts', 'vitest.config.ts'],
    ['scripts', 'wrangler.test.jsonc', 'wrangler.test.jsonc'],
    ['showcase', 'examples/showcase/', 'examples/showcase/playwright.config.ts'],
    ['showcase', 'templates/', 'templates/waymark/package.json'],
    ['showcase', 'packages/create-cairn-site/', 'packages/create-cairn-site/package.json'],
    ['engine', 'src/lib/', 'src/lib/log/index.ts'],
    ['engine', 'scripts/build/', 'scripts/build/build-admin-css.mjs'],
    ['engine', 'packages/cairn-cms-dev/', 'packages/cairn-cms-dev/package.json'],
    ['engine', 'migrations/', 'migrations/0001_roles.sql'],
    ['engine', 'migrations-channel/', 'migrations-channel/0000_channel.sql'],
    ['engine', 'package.json', 'package.json'],
    ['engine', 'package-lock.json', 'package-lock.json'],
    ['engine', 'svelte.config.js', 'svelte.config.js'],
    ['engine', 'tsconfig.json', 'tsconfig.json'],
    ['exportSurface', 'src/lib/**/index.ts', 'src/lib/log/index.ts'],
    ['exportSurface', 'package.json', 'package.json'],
    ['exportSurface', 'scripts/checks/check-surface-leaks.json', 'scripts/checks/check-surface-leaks.json'],
    ['exportSurface', 'scripts/checks/check-surface-reexports.json', 'scripts/checks/check-surface-reexports.json'],
    ['exportSurface', 'scripts/checks/check-self-use-allowlist.json', 'scripts/checks/check-self-use-allowlist.json'],
    ['exportSurface', 'scripts/checks/check-symbols-allowlist.mjs', 'scripts/checks/check-symbols-allowlist.mjs'],
    ['exportSurface', 'docs/internal/api-surface.md', 'docs/internal/api-surface.md'],
    ['exportSurface', 'docs/internal/option-map.json', 'docs/internal/option-map.json'],
    ['exportSurface', 'skills/', 'skills/cairn-consult/SKILL.md'],
    ['exportSurface', 'claude/', 'claude/CLAUDE.md'],
  ];

  it('names a row for every bucket pattern', () => {
    for (const [bucket, patterns] of Object.entries(table.buckets)) {
      for (const pattern of patterns) {
        expect(rows.some((row) => row[0] === bucket && row[1] === pattern), `${bucket} ${pattern}`).toBe(true);
      }
    }
    expect(rows.length).toBe(Object.values(table.buckets).flat().length);
  });

  for (const [bucket, pattern, path] of rows) {
    it(`${bucket}: ${pattern} matches the real path ${path}`, () => {
      expect(existsSync(path)).toBe(true);
      expect(matchesPattern(path, pattern)).toBe(true);
      expect(pathBuckets(path, context).has(bucket)).toBe(true);
    });
  }

  it('writes every dot pattern as a literal prefix or path, never a glob', () => {
    expect(tableProblems(table)).toEqual([]);
    const bad = structuredClone(table);
    bad.buckets.docs = ['**/.vale/**'];
    expect(tableProblems(bad)).toHaveLength(1);
  });

  it('pins the no-check list to the paths no check and no test reads', () => {
    expect(table.noCheck).toEqual(['.gitattributes', 'knip.jsonc']);
  });

  it('lists the protected paths the gate rules name', () => {
    expect(table.protected).toEqual([
      'scripts/checks/gate-table.json',
      'scripts/checks/gate-tier.mjs',
      'scripts/test/component-rerun-triggers.mjs',
      '.github/ci-green.json',
      '.github/workflows/',
    ]);
  });
});

describe('static check selection', () => {
  it('selects every static check for a path no bucket places', () => {
    const picked = selectChecks(['new-root.config.js'], context);
    expect(picked.all).toBe(true);
    expect(picked.labels).toEqual(context.labels);
    expect(decideGate(['new-root.config.js']).gate.startsWith('npm run package && npm run check:close && ')).toBe(true);
  });

  it('selects no check for a path on the no-check list', () => {
    expect(labelsFor('.gitattributes', 'knip.jsonc')).toEqual([]);
    expect(decideGate(['knip.jsonc']).gate).not.toContain('check:close');
  });

  it('leaves no close component unclassified, so a new one is placed on purpose', () => {
    const unlisted = context.closeLabels.filter(
      (label) => !(label in table.checks) && !context.packagePrefixed.has(label),
    );
    expect(unlisted).toEqual([]);
    for (const label of Object.keys(table.checks)) expect(context.labels, label).toContain(label);
  });

  it('gives every package-building check the engine bucket unless the table lists it', () => {
    const inherited = [...context.packagePrefixed].filter((label) => !(label in table.checks));
    expect(inherited.length).toBeGreaterThan(0);
    for (const label of inherited) expect(labelsFor('src/lib/foo/bar.ts'), label).toContain(label);
  });

  // The six checks whose input is the export surface and its documentation.
  const distSurface = [
    'check:package',
    'check:reference',
    'check:reference:signatures',
    'check:options',
    'check:surface',
    'check:consumers',
  ];

  it('pins the dist-surface checks', () => {
    const listed = Object.keys(table.checks).filter(
      (label) => context.packagePrefixed.has(label) && !table.checks[label].includes('engine'),
    );
    expect(listed.sort()).toEqual([...distSurface].sort());
  });

  it('selects each dist-surface check for an index.ts change and not for another src/lib file', () => {
    const forIndex = labelsFor('src/lib/foo/index.ts');
    const forOther = labelsFor('src/lib/foo/bar.ts');
    for (const label of distSurface) {
      expect(forIndex, label).toContain(label);
      expect(forOther, label).not.toContain(label);
    }
  });

  it('treats a package.json exports target that is not an index.ts as the export surface too', () => {
    expect(labelsFor('src/lib/render/authoring.ts')).toContain('check:reference');
  });

  it('selects the docs checks and tellgrader for a docs page, and no package-building engine check', () => {
    const picked = labelsFor('docs/reference/core.md');
    expect(picked).toEqual(expect.arrayContaining(['check:vale', 'check:facts', 'check:tellgrader']));
    expect(picked).not.toContain('check:audit-pack');
    expect(decideGate(['docs/reference/core.md']).gate).toContain('node scripts/checks/check-tellgrader.mjs');
  });

  it('selects the checks a script file reaches through its imports, and every check for a file none reach', () => {
    expect(labelsFor('scripts/checks/check-surface.mjs')).toContain('check:surface');
    expect(labelsFor('scripts/checks/reference-coverage.mjs')).toEqual(
      expect.arrayContaining(['check:reference', 'check:surface']),
    );
    expect(selectChecks(['scripts/checks/orphaned-new-script.mjs'], context).all).toBe(true);
    expect(selectChecks(['scripts/ci/retries-notice.mjs'], context).all).toBe(false);
  });

  it('hands the runner labels it accepts', () => {
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    const steps = closeSteps(scripts);
    const picked = labelsFor('src/lib/foo/bar.ts', 'examples/showcase/package.json').filter((label) =>
      context.closeLabels.includes(label),
    );
    expect(() => selectSteps(steps, picked)).not.toThrow();
    expect(steps.map((step) => step.label)).toEqual(context.closeLabels);
    expect(CLOSE_COMPONENTS.length).toBe(context.closeLabels.length);
  });

  it('quotes a label that holds spaces', () => {
    expect(decideGate(['examples/showcase/package.json']).gate).toContain("'npm --prefix examples/showcase run check'");
  });
});

describe('the component leg', () => {
  const COMPONENT_FULL = 'npm run test:component -- --no-file-parallelism';
  const plan = (paths: string[], deleted: string[] = []) => componentPlan(paths, deleted, context);

  it('skips for a docs-only diff and says why', () => {
    expect(plan(['README.md', 'docs/reference/core.md']).mode).toBe('skip');
    expect(plan(['README.md', 'knip.jsonc']).mode).toBe('skip');
    expect(decideGate(['README.md']).gate).not.toContain('test:component');
    expect(decideGate(['README.md']).notes.join('\n')).toContain('component project skipped');
  });

  it('runs a path in docs and another bucket through the ordinary rule', () => {
    expect(plan(['skills/cairn-consult/SKILL.md']).mode).not.toBe('skip');
  });

  it('runs the whole project when the selection is empty or was not computed', () => {
    expect(plan(['src/lib/cloudflare/turnstile.ts']).mode).toBe('select');
    for (const selected of [[], null, undefined]) {
      const gate = decideGate(['src/lib/cloudflare/turnstile.ts'], { selected }).gate;
      expect(gate).toContain(` && ${COMPONENT_FULL}`);
      expect(gate).not.toContain('CAIRN_RELATED_RUN');
    }
  });

  it('runs the whole project for a diff with nothing under src/ to select from', () => {
    expect(plan(['scripts/checks/check-idioms.mjs']).mode).toBe('full');
  });

  it('runs the selected files, with the trigger switch, when the selection is not empty', () => {
    const gate = decideGate(['src/lib/content/ids.ts'], { selected: ['src/tests/component/EditPage.test.ts'] }).gate;
    expect(gate).toContain(`CAIRN_RELATED_RUN=1 ${COMPONENT_FULL} src/tests/component/EditPage.test.ts`);
  });

  it('runs the whole project when a path was deleted or renamed away under src/, and never selects from it', () => {
    const deleted = ['src/lib/log/old.ts'];
    const decided = plan(['src/lib/log/old.ts', 'src/lib/log/index.ts'], deleted);
    expect(decided.mode).toBe('full');
    expect(decided.reach).toEqual([]);
    const gate = decideGate(['src/lib/log/old.ts'], { deleted, selected: ['src/tests/component/x.test.ts'] }).gate;
    expect(gate).toContain(` && ${COMPONENT_FULL}`);
    expect(gate).not.toContain('x.test.ts');
  });

  it('keeps a deleted path out of the selection inputs for a mixed diff without a src/ delete', () => {
    expect(plan(['src/lib/log/index.ts', 'scripts/old.mjs'], ['scripts/old.mjs']).reach).toEqual(['src/lib/log/index.ts']);
  });

  it('names a real path for every rerun trigger and runs the whole project for each', () => {
    for (const glob of COMPONENT_RERUN_TRIGGERS) {
      expect(RERUN_TRIGGER_PATHS.some((path) => matchesPattern(path, glob)), glob).toBe(true);
    }
    for (const path of RERUN_TRIGGER_PATHS) {
      const decided = plan(['src/lib/log/index.ts', path]);
      expect(decided.mode, path).toBe('full');
      expect(decided.reason, path).toContain(path);
    }
  });

  it('keeps node-only test trees out of the selection inputs', () => {
    expect(plan(['src/tests/unit/gate-tier.test.ts', 'src/lib/log/index.ts']).reach).toEqual(['src/lib/log/index.ts']);
  });
});

describe('the create-cairn-site leg', () => {
  const SUITE = 'npm test -w packages/create-cairn-site';
  // One path per trigger entry.
  const scaffolding = [
    'packages/create-cairn-site/src/prompts.mjs',
    'examples/showcase/package.json',
    'scripts/build/emit-template.mjs',
    'package.json',
  ];

  it('names a row for every trigger', () => {
    for (const glob of CREATE_CAIRN_SITE_TRIGGERS) {
      expect(scaffolding.some((path) => matchesPattern(path, glob)), glob).toBe(true);
    }
  });

  for (const path of scaffolding) {
    it(`runs the suite when ${path} changes`, () => {
      expect(decideGate([path]).gate).toContain(` && ${SUITE}`);
    });
  }

  it('leaves the suite out for a library path', () => {
    expect(decideGate(['src/lib/foo/bar.ts']).gate).not.toContain(SUITE);
  });
});

describe('the e2e leg', () => {
  const AUTH = ['access-map.spec.ts', 'csrf-origin.spec.ts', 'golden-path.spec.ts'];
  const specs = (paths: string[], options: { passClass?: string | null; paint?: 'yes' | 'no' } = {}) =>
    e2eSpecs(paths, options, context);

  it('reaches every showcase spec from some map entry', () => {
    const named = new Set([
      ...table.e2e.map.flatMap((entry) => entry.specs),
      ...table.e2e.floor.specs,
      ...table.e2e.unmappedLib,
      ...table.e2e.authData,
      ...table.e2e.paint,
    ]);
    const onDisk = readdirSync('examples/showcase/e2e').filter((name) => name.endsWith('.spec.ts'));
    expect(onDisk.length).toBeGreaterThan(40);
    expect(onDisk.filter((name) => !named.has(name))).toEqual([]);
    expect([...named].filter((name) => !onDisk.includes(name))).toEqual([]);
  });

  it('selects exactly the three auth specs for an unmapped library path', () => {
    expect(specs(['src/lib/cloudflare/turnstile.ts'])).toEqual({ all: false, specs: AUTH });
  });

  it('adds the admin-visual spec for an admin component, through the floor', () => {
    expect(specs(['src/lib/admin/CairnAdminShell.svelte']).specs).toContain('admin-visual.spec.ts');
    expect(specs(['src/lib/admin-toolkit/AdminTable.svelte']).specs).toContain('admin-visual.spec.ts');
  });

  it('adds the admin-visual spec under --paint yes and not otherwise', () => {
    expect(specs(['README.md'], { paint: 'yes' }).specs).toEqual(['admin-visual.spec.ts']);
    expect(specs(['README.md']).specs).toEqual([]);
  });

  it('adds the three auth specs under auth-data and changes nothing under the other classes', () => {
    expect(specs(['README.md'], { passClass: 'auth-data' }).specs).toEqual(AUTH);
    const plain = decideGate(['src/lib/media/index.ts']).gate;
    for (const passClass of PASS_CLASSES.filter((name) => name !== 'auth-data')) {
      expect(decideGate(['src/lib/media/index.ts'], { passClass }).gate, passClass).toBe(plain);
    }
    expect(decideGate(['src/lib/media/index.ts'], { passClass: 'auth-data' }).gate).not.toBe(plain);
  });

  it('accepts each pass class and refuses an unknown one', () => {
    expect(PASS_CLASSES).toEqual(['auth-data', 'engine-logic', 'paint', 'sweep', 'docs', 'tool']);
    for (const passClass of PASS_CLASSES) expect(() => decideGate(['README.md'], { passClass })).not.toThrow();
    expect(() => decideGate(['README.md'], { passClass: 'nope' })).toThrow(/unknown --class/);
  });

  it('selects the specs a mapped directory names, and no auth default beside them', () => {
    expect(specs(['src/lib/media/upload.ts']).specs).toContain('media-slice.spec.ts');
    expect(specs(['src/lib/media/upload.ts']).specs).not.toContain('csrf-origin.spec.ts');
  });

  it('selects a changed spec itself, its snapshots included, and the whole suite for a helper or fixture', () => {
    expect(specs(['examples/showcase/e2e/tidy.spec.ts']).specs).toEqual(['tidy.spec.ts']);
    expect(specs(['examples/showcase/e2e/admin-visual.spec.ts-snapshots/x.png']).specs).toEqual(['admin-visual.spec.ts']);
    expect(specs(['examples/showcase/e2e/editor-helpers.ts']).all).toBe(true);
  });

  it('runs the whole suite for a showcase config file or a path no bucket places', () => {
    expect(specs(['examples/showcase/playwright.config.ts']).all).toBe(true);
    expect(specs(['new-root.config.js']).all).toBe(true);
  });

  it('selects no spec for docs, tests, and scripts', () => {
    expect(specs(['docs/reference/core.md', 'src/tests/unit/gate-tier.test.ts', 'scripts/checks/check-idioms.mjs'])).toEqual({
      all: false,
      specs: [],
    });
    expect(decideGate(['README.md']).gate).not.toContain('test:e2e');
  });

  it('sets the port and the no-listener guard ahead of every emitted e2e leg', () => {
    const gates = [
      decideGate(['src/lib/cloudflare/turnstile.ts']).gate,
      decideGate(['README.md'], { paint: 'yes' }).gate,
      decideGate(['examples/showcase/playwright.config.ts']).gate,
      decideGate(['README.md'], { passClass: 'auth-data' }).gate,
    ];
    for (const gate of gates) {
      const leg = gate.split(' && ').findIndex((part) => part.startsWith('export E2E_PORT=4392'));
      const parts = gate.split(' && ');
      expect(leg, gate).toBeGreaterThan(-1);
      expect(parts[leg + 1]).toBe("! ss -Htln 'sport = :4392' | grep -q .");
      expect(parts[leg + 2]).toContain('test:e2e -- --retries=0');
    }
  });

  it('carries the visual-test invert when site-visual is selected, and only then', () => {
    const invert = '--grep-invert "site home|archive page 2"';
    expect(decideGate(['examples/showcase/e2e/site-visual.spec.ts']).gate).toContain(invert);
    expect(decideGate(['examples/showcase/playwright.config.ts']).gate).toContain(invert);
    expect(decideGate(['src/lib/cloudflare/turnstile.ts']).gate).not.toContain('--grep-invert');
  });
});

describe('decideGate', () => {
  it('orders the legs: package, static checks, node projects, component, scaffold suite, e2e', () => {
    const gate = decideGate(['examples/showcase/src/routes/(site)/+page.svelte'], { selected: ['a.test.ts'] }).gate;
    const marks = [
      'npm run package',
      'npm run check:close',
      'npm run test:node-projects',
      'npm run test:component',
      'npm test -w packages/create-cairn-site',
      'export E2E_PORT=4392',
    ].map((mark) => gate.indexOf(mark));
    expect(marks.every((at) => at >= 0)).toBe(true);
    expect([...marks].sort((a, b) => a - b)).toEqual(marks);
    expect(gate.startsWith('npm run package && ')).toBe(true);
  });

  it('runs the node projects even for a docs-only diff', () => {
    expect(decideGate(['README.md']).gate).toContain('npm run test:node-projects');
  });

  it('resolves a tool-only diff to the tool gate and a mixed diff to the targeted gate then the tool gate', () => {
    expect(decideGate(['tool/internal/spine/chapter.go'])).toMatchObject({
      tier: 'tool',
      gate: 'make -C tool check',
    });
    const mixed = decideGate(['src/lib/log/index.ts', 'tool/main.go']);
    expect(mixed.tier).toBe('targeted+tool');
    expect(mixed.gate.startsWith('npm run package && ')).toBe(true);
    expect(mixed.gate.endsWith(' && make -C tool check')).toBe(true);
  });

  it('classifies the harvest deletion diff as a docs diff with no component or e2e leg', () => {
    const { deleted } = loadDeletionList(resolve(process.cwd()));
    expect(deleted.length).toBeGreaterThan(0);
    const gate = decideGate(deleted, { deleted }).gate;
    expect(gate).not.toContain('test:component');
    expect(gate).not.toContain('test:e2e');
  });

  it('adds neither ciWait nor the full local gate for a protected-path range', () => {
    const gate = decideGate(table.protected.filter((path) => !path.endsWith('/'))).gate;
    expect(gate).not.toContain('ciWait');
    expect(gate).not.toContain(TIER_GATES.full);
    expect(gate).not.toContain('test:e2e');
  });
});

describe('--pin', () => {
  it('prints each old tier string unchanged, whatever the diff', () => {
    expect(TIER_ORDER).toEqual(['docs', 'scripts', 'engine', 'admin-visual', 'full']);
    for (const tier of [...TIER_ORDER, 'tool']) {
      expect(decideGate(['src/lib/log/index.ts'], { pin: tier })).toEqual({
        tier,
        reason: 'pin',
        decidingPaths: [],
        gate: TIER_GATES[tier],
        notes: [],
      });
    }
  });

  it('beats the pass class and the paint flag', () => {
    expect(decideGate(['README.md'], { pin: 'docs', paint: 'yes', passClass: 'auth-data' }).gate).toBe(TIER_GATES.docs);
  });

  it('throws on an unknown or prototype-chain pin, never returning it as a gate', () => {
    for (const pin of ['nope', 'toString', 'constructor']) {
      expect(() => decideGate(['README.md'], { pin }), pin).toThrow(/unknown --pin tier/);
    }
  });

  it('keeps the engine string byte-identical to the one the runner has always run', () => {
    expect(TIER_GATES.engine).toBe(
      'npm run check:docs-gate && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm test -w packages/create-cairn-site',
    );
  });
});

describe('parseArgs', () => {
  it('defaults paint to no and everything else to absent', () => {
    expect(parseArgs(['--range', 'abc..HEAD'])).toEqual({
      range: 'abc..HEAD',
      paint: 'no',
      pin: null,
      passClass: null,
      protectedMode: false,
    });
  });

  it('parses every flag', () => {
    expect(
      parseArgs(['--range', 'abc..HEAD', '--paint', 'yes', '--pin', 'full', '--class', 'paint', '--protected']),
    ).toEqual({ range: 'abc..HEAD', paint: 'yes', pin: 'full', passClass: 'paint', protectedMode: true });
  });

  it('reads a --class with no value as an empty, invalid class', () => {
    expect(parseArgs(['--range', 'a..b', '--class']).passClass).toBe('');
  });

  it('returns a null range when --range is absent', () => {
    expect(parseArgs([]).range).toBeNull();
  });
});

describe('TIER_GATES', () => {
  it('names the five npm tiers and the tool tier, each with its own gate string', () => {
    for (const tier of TIER_ORDER) expect(typeof TIER_GATES[tier]).toBe('string');
    expect(TIER_GATES.tool).toBe('make -C tool check');
  });

  it('scripts and engine share the identical gate string', () => {
    expect(TIER_GATES.scripts).toBe(TIER_GATES.engine);
  });

  it('every npm tier above docs is a strict superset of the npm tier below it', () => {
    expect(TIER_GATES.scripts.startsWith(TIER_GATES.docs)).toBe(true);
    expect(TIER_GATES['admin-visual'].startsWith(TIER_GATES.scripts)).toBe(true);
    expect(TIER_GATES.full.startsWith(TIER_GATES['admin-visual'])).toBe(true);
    expect(TIER_GATES.full.length).toBeGreaterThan(TIER_GATES['admin-visual'].length);
  });

  it('the docs tier is the one docs-gate script', () => {
    expect(TIER_GATES.docs).toBe('npm run check:docs-gate');
  });

  it('the full gate runs the admin-visual spec once inside the admin-visual string, then the whole showcase suite', () => {
    expect(TIER_GATES.full).toContain('test:e2e -- admin-visual.spec.ts && npm run check:comments');
    expect(TIER_GATES.full.endsWith('npm --prefix examples/showcase run test:e2e')).toBe(true);
  });

  it('runs no npm check script twice in the full tier, since check:docs-gate already carries the docs-gate components', () => {
    const scripts = [...TIER_GATES.full.matchAll(/npm run (check:[a-z:-]+)/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    expect(new Set(scripts).size).toBe(scripts.length);
  });
});

// The full tier runs every check the CI `test` job runs that a local gate can run. The list is
// pinned against test.yml's own steps: a `run:` step (or a bounded-install `command:`) added to CI
// that the full gate neither runs nor names below fails this test.
//
// A CI command the full gate runs under another spelling names its stand-in tokens here; each
// stand-in must be a whole `&&`-separated command of the full gate.
const CI_EQUIVALENTS: Record<string, string[]> = {
  // CI spells the two Vitest runs as separate steps with the retry reporter; the gate runs the same
  // projects (serialized for the component one) without it.
  'npm run test:node-projects -- --reporter=default --reporter=github-actions --reporter=./scripts/ci/vitest-retry-reporter.mjs':
    ['npm run test:node-projects'],
  'npm run test:component -- --reporter=default --reporter=github-actions --reporter=./scripts/ci/vitest-retry-reporter.mjs':
    ['npm run test:component -- --no-file-parallelism'],
  // The same suite, reached by workspace flag instead of `--prefix`.
  'npm --prefix packages/create-cairn-site test': ['npm test -w packages/create-cairn-site'],
};

// A CI step with no local gate command, each with the reason it stays out of the tier.
const CI_NOT_LOCAL: Record<string, string> = {
  'npm ci': 'installs dependencies; the worktree already has them',
  'npm ci --prefix examples/showcase': 'installs the showcase dependencies; the showcase gates need them installed',
  'npx playwright install --with-deps chromium firefox': 'installs browsers on the CI runner',
  'npm run package': 'builds dist; every check script that needs dist builds it itself',
  'node scripts/ci/retries-notice.mjs "$RUNNER_TEMP/vitest-node-retries.json" "$RUNNER_TEMP/vitest-component-retries.json"':
    'annotates the CI run with the retried tests; the reports it reads exist only after a CI run',
  'name:Install Vale 3.23.0': 'installs Vale on the CI runner; the docs gate runs the workstation Vale',
  'name:Bake the create-cairn-site template':
    'bakes the gitignored template with an engine spec only CI can substitute; the workspace suite reads the baked copy on disk',
};

/**
 * Every `run:` step of the CI `test` job in a workflow file's text: a one-line `run: <cmd>` as
 * the command, a block `run: |` as `name:<step name>` (the block body is shell, not one command).
 * A bounded-install step's `command: <cmd>` input reads as that command, the same as a `run:`.
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
    const run = line.match(/^\s*(?:- )?(?:run|command):\s*(.+?)\s*$/);
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

// CLI integration: the empty-range and git-failure exits happen before any classification, so the
// pure functions above cannot prove them.
describe('the CLI (spawned)', () => {
  const run = (...args: string[]) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('exits non-zero with empty stdout on an empty range (HEAD..HEAD carries no diff)', () => {
    const out = run('--range', 'HEAD..HEAD');
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });

  it('exits non-zero with empty stdout when git fails on a malformed range', () => {
    const out = run('--range', 'not-a-real-ref..HEAD');
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });

  it('exits non-zero with empty stdout when --range is missing', () => {
    const out = run();
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });

  it('exits non-zero with empty stdout for an unknown class, and for a class with no value', () => {
    for (const args of [['--class', 'nope'], ['--class']]) {
      const out = run('--range', '4b825dc642cb6eb9a060e54bf8d69288fbee4904..HEAD', ...args);
      expect(out.status, args.join(' ')).not.toBe(0);
      expect(out.stdout).toBe('');
    }
  });

  // HEAD against git's empty tree exists in every clone, shallow CI checkouts included (HEAD^ does
  // not). A whole-tree diff reaches the trigger list, so no related selection runs.
  const wholeTree = `4b825dc642cb6eb9a060e54bf8d69288fbee4904..${spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim()}`;

  it('prints only the gate on stdout for a real range, the legs on stderr', () => {
    const out = run('--range', wholeTree);
    expect(out.status).toBe(0);
    expect(out.stdout.trim().split('\n')).toHaveLength(1);
    expect(out.stdout.startsWith('npm run package && ')).toBe(true);
    expect(out.stderr).toMatch(/gate-tier: targeted/);
  });

  it('prints the pinned full string byte for byte', () => {
    const out = run('--range', wholeTree, '--pin', 'full');
    expect(out.stdout).toBe(`${TIER_GATES.full}\n`);
  });

  it('exits non-zero with empty stdout for an unknown pin', () => {
    const out = run('--range', wholeTree, '--pin', 'nope');
    expect(out.status).not.toBe(0);
    expect(out.stdout).toBe('');
  });
});

// A fixture repo whose first commit carries a table with a chosen protected list. The range
// base..HEAD is what the mode reads; `touch` writes the files the second commit changes.
describe('--protected', () => {
  const git = (cwd: string, ...args: string[]) =>
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
      cwd,
      encoding: 'utf8',
    });

  /** Build a repo: a base commit with the table text (or none), then a head commit writing `edits`. */
  function fixture(baseTable: string | undefined, edits: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-gate-protected-'));
    git(dir, 'init', '-q');
    const write = (path: string, text: string) => {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), text);
    };
    write('guarded.txt', 'one\n');
    write('free.txt', 'one\n');
    if (baseTable !== undefined) write('scripts/checks/gate-table.json', baseTable);
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'base');
    const base = git(dir, 'rev-parse', 'HEAD').stdout.trim();
    for (const [path, text] of Object.entries(edits)) write(path, text);
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', 'head');
    return { dir, range: `${base}..HEAD` };
  }

  const cleanup: string[] = [];
  const make = (baseTable: string | undefined, edits: Record<string, string>) => {
    const made = fixture(baseTable, edits);
    cleanup.push(made.dir);
    return made;
  };
  afterAll(() => {
    for (const dir of cleanup) rmSync(dir, { recursive: true, force: true });
  });

  const list = JSON.stringify({ protected: ['guarded.txt'] });

  it('prints ciWait for a range that touches a protected path', () => {
    const { dir, range } = make(list, { 'guarded.txt': 'two\n' });
    expect(protectedVerdict(range, dir)).toMatchObject({ verdict: 'ciWait' });
  });

  it('prints nothing and exits 0 for a range that touches none', () => {
    const { dir, range } = make(list, { 'free.txt': 'two\n' });
    expect(protectedVerdict(range, dir)).toEqual({ verdict: 'none' });
  });

  it('still prints ciWait when the range removes the path from the list, since the list is read at the base', () => {
    const { dir, range } = make(list, {
      'guarded.txt': 'two\n',
      'scripts/checks/gate-table.json': JSON.stringify({ protected: [] }),
    });
    expect(protectedVerdict(range, dir)).toMatchObject({ verdict: 'ciWait' });
  });

  it('prints ciWait when the base has no table, or an unusable one', () => {
    for (const baseTable of [undefined, 'not json', '{}']) {
      const { dir, range } = make(baseTable, { 'free.txt': 'two\n' });
      expect(protectedVerdict(range, dir), String(baseTable)).toMatchObject({ verdict: 'ciWait' });
    }
  });

  it('reads a directory entry as a prefix', () => {
    const { dir, range } = make(JSON.stringify({ protected: ['guarded/'] }), { 'guarded/new.txt': 'x\n' });
    expect(protectedVerdict(range, dir)).toMatchObject({ verdict: 'ciWait' });
  });

  it('reports a git failure as an error', () => {
    const { dir } = make(list, { 'free.txt': 'two\n' });
    expect(protectedVerdict('no-such-ref..HEAD', dir).verdict).toBe('error');
  });

  it('prints exactly ciWait through the CLI, and the default mode never prints it', () => {
    const touching = spawnSync(
      process.execPath,
      [SCRIPT, '--range', '4b825dc642cb6eb9a060e54bf8d69288fbee4904..HEAD', '--protected'],
      { encoding: 'utf8' },
    );
    expect(touching.status).toBe(0);
    expect(touching.stdout).toBe('ciWait\n');
    const gate = spawnSync(process.execPath, [SCRIPT, '--range', '4b825dc642cb6eb9a060e54bf8d69288fbee4904..HEAD'], {
      encoding: 'utf8',
    });
    expect(gate.stdout).not.toContain('ciWait');
  });
});
