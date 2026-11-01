import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CLOSE_COMPONENTS,
  PACKAGE_PREFIX,
  closeSteps,
  runClose,
  selectSteps,
} from '../../../scripts/checks/close-prebuilt.mjs';

const PACKAGE_JSON = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

type Step = { label: string; command: string };

describe('closeSteps', () => {
  const rows: { name: string; scripts: Record<string, string>; components: string[]; want: Step[] }[] = [
    {
      name: 'drops the leading build from a component whose script starts with it',
      scripts: { 'check:a': 'npm run package && node a.mjs && node b.mjs' },
      components: ['npm run check:a'],
      want: [{ label: 'check:a', command: 'node a.mjs && node b.mjs' }],
    },
    {
      name: 'runs a component with no build through npm, exactly as the list spells it',
      scripts: { 'check:b': 'node b.mjs' },
      components: ['npm run check:b'],
      want: [{ label: 'check:b', command: 'npm run check:b' }],
    },
    {
      name: 'runs a component that is not an `npm run` of this package verbatim',
      scripts: {},
      components: ['npm --prefix examples/showcase run check'],
      want: [{ label: 'npm --prefix examples/showcase run check', command: 'npm --prefix examples/showcase run check' }],
    },
    {
      name: 'keeps list order across mixed components',
      scripts: { 'check:a': 'npm run package && node a.mjs', 'check:b': 'node b.mjs' },
      components: ['npm run check:b', 'npm run check:a', 'npm --prefix x run y'],
      want: [
        { label: 'check:b', command: 'npm run check:b' },
        { label: 'check:a', command: 'node a.mjs' },
        { label: 'npm --prefix x run y', command: 'npm --prefix x run y' },
      ],
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      expect(closeSteps(row.scripts, row.components)).toEqual(row.want);
    });
  }

  const refusals: { name: string; scripts: Record<string, string>; components: string[]; error: RegExp }[] = [
    { name: 'a component script package.json lacks', scripts: {}, components: ['npm run check:gone'], error: /lacks/ },
    {
      name: 'a component that builds twice',
      scripts: { 'check:a': 'npm run package && node a.mjs && npm run package' },
      components: ['npm run check:a'],
      error: /twice/,
    },
    {
      name: 'a component that builds somewhere other than its start',
      scripts: { 'check:a': 'node a.mjs && npm run package' },
      components: ['npm run check:a'],
      error: /other than its start/,
    },
  ];

  for (const row of refusals) {
    it(`refuses ${row.name}`, () => {
      expect(() => closeSteps(row.scripts, row.components)).toThrow(row.error);
    });
  }
});

describe('the exported component list', () => {
  const steps = closeSteps(PACKAGE_JSON.scripts);

  it('holds 40 components with no duplicate label', () => {
    expect(CLOSE_COMPONENTS).toHaveLength(40);
    expect(new Set(steps.map((step) => step.label)).size).toBe(40);
  });

  it('makes check:close the runner, no longer a chain', () => {
    expect(PACKAGE_JSON.scripts['check:close']).toBe('node scripts/checks/close-prebuilt.mjs');
    expect(PACKAGE_JSON.scripts['check:close:prebuilt']).toBeUndefined();
  });

  it('never rebuilds the package inside a step', () => {
    for (const step of steps) expect(step.command, step.label).not.toContain('npm run package');
  });

  it('drops the build from every component whose own script starts with it, and from nothing else', () => {
    for (const [index, component] of CLOSE_COMPONENTS.entries()) {
      const name = component.match(/^npm run (\S+)$/)?.[1];
      const body = name ? PACKAGE_JSON.scripts[name] : undefined;
      const want = body?.startsWith(PACKAGE_PREFIX) ? body.slice(PACKAGE_PREFIX.length) : component;
      expect(steps[index].command, component).toBe(want);
    }
  });

  it('finds the package-building components the runner exists to deduplicate', () => {
    const building = CLOSE_COMPONENTS.filter((component) => {
      const name = component.match(/^npm run (\S+)$/)?.[1];
      return name !== undefined && PACKAGE_JSON.scripts[name].startsWith(PACKAGE_PREFIX);
    });
    expect(building.length).toBeGreaterThan(10);
  });
});

describe('check:package', () => {
  const standalone = PACKAGE_JSON.scripts['check:package'];
  const inRunner = closeSteps(PACKAGE_JSON.scripts).find((step) => step.label === 'check:package');

  it('still builds when run as its own npm script', () => {
    expect(standalone.startsWith(PACKAGE_PREFIX)).toBe(true);
  });

  it('does not build, and does not let attw pack through the prepare script, inside the runner', () => {
    expect(inRunner).toBeDefined();
    expect(inRunner?.command).not.toContain('npm run package');
    expect(inRunner?.command).not.toContain('attw --pack');
    expect(inRunner?.command).toMatch(/npm pack --ignore-scripts .*--pack-destination/);
    expect(inRunner?.command).toMatch(/attw "\$\w+"\/\*\.tgz/);
  });
});

describe('selectSteps', () => {
  const steps: Step[] = [
    { label: 'check:a', command: 'a' },
    { label: 'check:b', command: 'b' },
    { label: 'check:c', command: 'c' },
  ];

  it('returns every step when no name is given', () => {
    expect(selectSteps(steps, [])).toEqual(steps);
  });

  it('returns only the named steps, in list order whatever order the names came in', () => {
    expect(selectSteps(steps, ['check:c', 'check:a']).map((step) => step.label)).toEqual(['check:a', 'check:c']);
  });

  it('rejects a name that is not in the list', () => {
    expect(() => selectSteps(steps, ['check:a', 'check:nope'])).toThrow(/check:nope/);
  });

  it('rejects a name that is not in the real component list', () => {
    expect(() => selectSteps(closeSteps(PACKAGE_JSON.scripts), ['check:made-up'])).toThrow(/check:made-up/);
  });
});

describe('runClose', () => {
  /** A harness that records the build count and the steps it was asked to run. */
  function harness(failing: string[] = [], buildOk = true) {
    const calls = { build: 0, ran: [] as string[], out: [] as string[], err: [] as string[] };
    const options = {
      build: () => {
        calls.build += 1;
        return buildOk;
      },
      run: (step: Step) => {
        calls.ran.push(step.label);
        return !failing.includes(step.label);
      },
      now: (() => {
        let tick = 0;
        return () => (tick += 2500);
      })(),
      out: (line: string) => calls.out.push(line),
      err: (line: string) => calls.err.push(line),
    };
    return { calls, options };
  }

  const steps: Step[] = [
    { label: 'check:a', command: 'a' },
    { label: 'check:b', command: 'b' },
    { label: 'check:c', command: 'c' },
  ];

  it('builds once, runs every step, and exits 0 when all pass', () => {
    const { calls, options } = harness();
    expect(runClose(steps, options)).toBe(0);
    expect(calls.build).toBe(1);
    expect(calls.ran).toEqual(['check:a', 'check:b', 'check:c']);
  });

  it('runs only the named steps and still builds once', () => {
    const { calls, options } = harness();
    expect(runClose(selectSteps(steps, ['check:b']), options)).toBe(0);
    expect(calls.build).toBe(1);
    expect(calls.ran).toEqual(['check:b']);
  });

  it('exits non-zero after running every other step when one fails', () => {
    const { calls, options } = harness(['check:a']);
    expect(runClose(steps, options)).toBe(1);
    expect(calls.ran).toEqual(['check:a', 'check:b', 'check:c']);
    expect(calls.err.join('\n')).toContain('check:a');
  });

  it('runs no step and exits non-zero when the build fails', () => {
    const { calls, options } = harness([], false);
    expect(runClose(steps, options)).toBe(1);
    expect(calls.ran).toEqual([]);
  });

  it('prints each check\'s seconds', () => {
    const { calls, options } = harness();
    runClose(steps, options);
    const timed = calls.out.filter((line) => /^check:[abc] \d+\.\ds$/.test(line));
    expect(timed).toEqual(['check:a 2.5s', 'check:b 2.5s', 'check:c 2.5s']);
  });

  it('leaves a real failing shell step non-zero while a later real step still runs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'close-runner-'));
    try {
      const marker = join(dir, 'ran-after-failure');
      const exitCode = runClose(
        [
          { label: 'fails', command: 'exit 3' },
          { label: 'after', command: `touch "${marker}"` },
        ],
        { build: () => true, out: () => {}, err: () => {} },
      );
      expect(exitCode).toBe(1);
      expect(existsSync(marker)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
