import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { missingInstalls } from '../../../scripts/checks/close-prebuilt.mjs';
import { CHECKS } from '../../../scripts/checks/registry.mjs';
import { groupSteps, runSteps } from '../../../scripts/checks/run.mjs';

const PACKAGE_JSON = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const BASE = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/tests/unit/fixtures/check-names-base.json'), 'utf8'),
) as { builtAtBase: string[] };

type Step = { name: string; command: string; targets: string[]; words: string[]; build: boolean };
type Row = { name: string; command: string; build: boolean; buckets: string[]; groups: Record<string, number> };

/** A fixture row in the one test group `g`. */
function row(name: string, command: string, place: number, build = false): Row {
  return { name, command, build, buckets: [], groups: { g: place } };
}

/** The step a fixture row becomes when nothing narrows or extends it. */
function step(name: string, command: string, build = false): Step {
  return { name, command, targets: [], words: [], build };
}

describe('groupSteps on fixture rows', () => {
  const rows: { name: string; rows: Row[]; want: Step[] }[] = [
    {
      name: 'runs a row that builds as its command, the build left to the runner',
      rows: [row('check:a', 'node a.mjs && node b.mjs', 1, true)],
      want: [step('check:a', 'node a.mjs && node b.mjs', true)],
    },
    {
      name: 'runs a row with no build as its command',
      rows: [row('check:b', 'node b.mjs', 1)],
      want: [step('check:b', 'node b.mjs')],
    },
    {
      name: 'runs a raw-command row verbatim',
      rows: [row('check:showcase-types', 'npm --prefix examples/showcase run check', 1)],
      want: [step('check:showcase-types', 'npm --prefix examples/showcase run check')],
    },
    {
      name: 'keeps group order across mixed rows',
      rows: [row('check:a', 'node a.mjs', 2, true), row('check:y', 'npm --prefix x run y', 3), row('check:b', 'node b.mjs', 1)],
      want: [step('check:b', 'node b.mjs'), step('check:a', 'node a.mjs', true), step('check:y', 'npm --prefix x run y')],
    },
  ];

  for (const entry of rows) {
    it(entry.name, () => {
      expect(groupSteps(entry.rows, 'g', [])).toEqual(entry.want);
    });
  }

  const refusals: { name: string; rows: Row[]; names: string[]; error: RegExp }[] = [
    { name: 'a row name the group lacks', rows: [row('check:a', 'node a.mjs', 1)], names: ['check:gone'], error: /check:gone/ },
    {
      name: 'a row whose command builds at its start',
      rows: [row('check:a', 'npm run package && node a.mjs', 1)],
      names: [],
      error: /npm run package/,
    },
    {
      name: 'a row whose command builds at its end',
      rows: [row('check:a', 'node a.mjs && npm run package', 1)],
      names: [],
      error: /npm run package/,
    },
  ];

  for (const entry of refusals) {
    it(`refuses ${entry.name}`, () => {
      expect(() => groupSteps(entry.rows, 'g', entry.names)).toThrow(entry.error);
    });
  }
});

describe('the close group', () => {
  const steps = groupSteps(CHECKS, 'close', []);
  const closeNames = steps.map((entry) => entry.name);

  it('holds 34 rows with no duplicate name', () => {
    expect(steps).toHaveLength(34);
    expect(new Set(closeNames).size).toBe(34);
  });

  it('makes check:close the group runner, no longer a chain', () => {
    expect(PACKAGE_JSON.scripts['check:close']).toBe('node scripts/checks/run.mjs close');
    expect(PACKAGE_JSON.scripts['check:close:prebuilt']).toBeUndefined();
  });

  it('never rebuilds the package inside a step', () => {
    for (const entry of steps) expect(entry.command, entry.name).not.toContain('npm run package');
  });

  it('asks for the build on exactly the close rows whose script built at the base', () => {
    const building = steps.filter((entry) => entry.build).map((entry) => entry.name);
    expect(building.sort()).toEqual(BASE.builtAtBase.filter((name) => closeNames.includes(name)).sort());
  });

  it('finds the package-building rows the runner exists to deduplicate', () => {
    expect(steps.filter((entry) => entry.build).length).toBeGreaterThan(10);
  });
});

describe('check:package', () => {
  const standalone = CHECKS.find((entry) => entry.name === 'check:package');
  const inRunner = groupSteps(CHECKS, 'close', []).find((entry) => entry.name === 'check:package');

  it('still builds when run as its own npm script', () => {
    expect(PACKAGE_JSON.scripts['check:package']).toBe('node scripts/checks/run.mjs check:package');
    expect(standalone?.build).toBe(true);
  });

  it('does not build, and does not let attw pack through the prepare script, inside the runner', () => {
    expect(inRunner).toBeDefined();
    expect(inRunner?.command).not.toContain('npm run package');
    expect(inRunner?.command).not.toContain('attw --pack');
    expect(inRunner?.command).toMatch(/npm pack --ignore-scripts .*--pack-destination/);
    expect(inRunner?.command).toMatch(/attw "\$\w+"\/\*\.tgz/);
  });
});

describe('groupSteps names', () => {
  const rows = [row('check:a', 'a', 1), row('check:b', 'b', 2), row('check:c', 'c', 3)];

  it('returns every step when no name is given', () => {
    expect(groupSteps(rows, 'g', []).map((entry) => entry.name)).toEqual(['check:a', 'check:b', 'check:c']);
  });

  it('returns only the named steps, in group order whatever order the names came in', () => {
    expect(groupSteps(rows, 'g', ['check:c', 'check:a']).map((entry) => entry.name)).toEqual(['check:a', 'check:c']);
  });

  it('rejects a name that is not in the group', () => {
    expect(() => groupSteps(rows, 'g', ['check:a', 'check:nope'])).toThrow(/check:nope/);
  });

  it('rejects a name that is not in the real close group', () => {
    expect(() => groupSteps(CHECKS, 'close', ['check:made-up'])).toThrow(/check:made-up/);
  });
});

describe('runSteps', () => {
  /** A harness that records the build count and the steps it was asked to run. */
  function harness(failing: string[] = [], buildOk = true) {
    const calls = { build: 0, ran: [] as string[], out: [] as string[], err: [] as string[] };
    const options = {
      group: 'close',
      build: () => {
        calls.build += 1;
        return buildOk;
      },
      run: (entry: { name: string; command: string }) => {
        calls.ran.push(entry.name);
        return !failing.includes(entry.name);
      },
      now: (() => {
        let tick = 0;
        return () => (tick += 2500);
      })(),
      out: (line: string) => calls.out.push(line),
      err: (line: string) => calls.err.push(line),
      exists: () => true,
    };
    return { calls, options };
  }

  const steps: Step[] = [step('check:a', 'a'), step('check:b', 'b'), step('check:c', 'c')];

  it('builds once, runs every step, and exits 0 when all pass', () => {
    const { calls, options } = harness();
    expect(runSteps(steps, options)).toBe(0);
    expect(calls.build).toBe(1);
    expect(calls.ran).toEqual(['check:a', 'check:b', 'check:c']);
  });

  it('returns 1 before the build and prints both installs when svelte-package is absent', () => {
    const { calls, options } = harness();
    const exists = (path: string) => !path.endsWith('svelte-package') && !path.endsWith('showcase/node_modules');
    expect(runSteps(steps, { ...options, exists })).toBe(1);
    expect(calls.build).toBe(0);
    expect(calls.ran).toEqual([]);
    const printed = calls.err.join('\n');
    expect(printed).toContain('npm ci');
    expect(printed).toContain('npm ci --prefix examples/showcase');
  });

  it('names only the install that is missing', () => {
    expect(missingInstalls(() => true, '/r')).toEqual([]);
    expect(missingInstalls((p) => !p.endsWith('showcase/node_modules'), '/r')).toEqual([
      'npm ci --prefix examples/showcase',
    ]);
  });

  it('runs only the named steps and still builds once', () => {
    const { calls, options } = harness();
    const rows = [row('check:a', 'a', 1), row('check:b', 'b', 2), row('check:c', 'c', 3)];
    expect(runSteps(groupSteps(rows, 'g', ['check:b']), options)).toBe(0);
    expect(calls.build).toBe(1);
    expect(calls.ran).toEqual(['check:b']);
  });

  it('exits non-zero after running every other step when one fails', () => {
    const { calls, options } = harness(['check:a']);
    expect(runSteps(steps, options)).toBe(1);
    expect(calls.ran).toEqual(['check:a', 'check:b', 'check:c']);
    expect(calls.err.join('\n')).toContain('check:a');
  });

  it('runs no step and exits non-zero when the build fails', () => {
    const { calls, options } = harness([], false);
    expect(runSteps(steps, options)).toBe(1);
    expect(calls.ran).toEqual([]);
  });

  it('prints each check\'s seconds', () => {
    const { calls, options } = harness();
    runSteps(steps, options);
    const timed = calls.out.filter((line) => /^check:[abc] \d+\.\ds$/.test(line));
    expect(timed).toEqual(['check:a 2.5s', 'check:b 2.5s', 'check:c 2.5s']);
  });

  it('leaves a real failing shell step non-zero while a later real step still runs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'close-runner-'));
    try {
      const marker = join(dir, 'ran-after-failure');
      const exitCode = runSteps([step('fails', 'exit 3'), step('after', `touch "${marker}"`)], {
        group: 'close',
        build: () => true,
        out: () => {},
        err: () => {},
        exists: () => true,
      });
      expect(exitCode).toBe(1);
      expect(existsSync(marker)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
