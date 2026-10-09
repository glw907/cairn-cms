import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { closeSteps, PACKAGE_PREFIX } from '../../../scripts/checks/close-prebuilt.mjs';

const PACKAGE_JSON = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('closeSteps', () => {
  const rows: { name: string; scripts: Record<string, string>; want: { label: string; command: string }[] }[] = [
    {
      name: 'drops the leading build from a component whose script starts with it',
      scripts: { 'check:close': 'npm run check:a', 'check:a': 'npm run package && node a.mjs && node b.mjs' },
      want: [{ label: 'check:a', command: 'node a.mjs && node b.mjs' }],
    },
    {
      name: 'runs a component with no build through npm, exactly as check:close spells it',
      scripts: { 'check:close': 'npm run check:b', 'check:b': 'node b.mjs' },
      want: [{ label: 'check:b', command: 'npm run check:b' }],
    },
    {
      name: 'runs a component that is not an `npm run` of this package verbatim',
      scripts: { 'check:close': 'npm --prefix examples/showcase run check' },
      want: [{ label: 'npm --prefix examples/showcase run check', command: 'npm --prefix examples/showcase run check' }],
    },
    {
      name: 'keeps check:close order across mixed components',
      scripts: {
        'check:close': 'npm run check:b && npm run check:a && npm --prefix x run y',
        'check:a': 'npm run package && node a.mjs',
        'check:b': 'node b.mjs',
      },
      want: [
        { label: 'check:b', command: 'npm run check:b' },
        { label: 'check:a', command: 'node a.mjs' },
        { label: 'npm --prefix x run y', command: 'npm --prefix x run y' },
      ],
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      expect(closeSteps(row.scripts)).toEqual(row.want);
    });
  }

  const refusals: { name: string; scripts: Record<string, string>; error: RegExp }[] = [
    { name: 'no check:close script', scripts: {}, error: /no check:close/ },
    { name: 'a component script package.json lacks', scripts: { 'check:close': 'npm run check:gone' }, error: /lacks/ },
    {
      name: 'a component that builds twice',
      scripts: { 'check:close': 'npm run check:a', 'check:a': 'npm run package && node a.mjs && npm run package' },
      error: /twice/,
    },
    {
      name: 'a component that builds somewhere other than its start',
      scripts: { 'check:close': 'npm run check:a', 'check:a': 'node a.mjs && npm run package' },
      error: /other than its start/,
    },
  ];

  for (const row of refusals) {
    it(`refuses ${row.name}`, () => {
      expect(() => closeSteps(row.scripts)).toThrow(row.error);
    });
  }
});

describe('closeSteps over the real package.json', () => {
  const steps = closeSteps(PACKAGE_JSON.scripts);
  const components = PACKAGE_JSON.scripts['check:close'].split(' && ');

  it('runs one step per check:close component, in check:close order', () => {
    const labels = components.map((component) => component.match(/^npm run (\S+)$/)?.[1] ?? component);
    expect(steps.map((step) => step.label)).toEqual(labels);
  });

  it('never rebuilds the package inside a step', () => {
    for (const step of steps) expect(step.command, step.label).not.toContain('npm run package');
  });

  it('drops the build from every component whose own script starts with it, and from nothing else', () => {
    for (const [index, component] of components.entries()) {
      const name = component.match(/^npm run (\S+)$/)?.[1];
      const body = name ? PACKAGE_JSON.scripts[name] : undefined;
      const want = body?.startsWith(PACKAGE_PREFIX) ? body.slice(PACKAGE_PREFIX.length) : component;
      expect(steps[index].command, component).toBe(want);
    }
  });

  it('finds the package-building components the runner exists to deduplicate', () => {
    const building = components.filter((component) => {
      const name = component.match(/^npm run (\S+)$/)?.[1];
      return name !== undefined && PACKAGE_JSON.scripts[name].startsWith(PACKAGE_PREFIX);
    });
    expect(building.length).toBeGreaterThan(10);
  });

  it('is reachable as the check:close:prebuilt npm script', () => {
    expect(PACKAGE_JSON.scripts['check:close:prebuilt']).toBe('node scripts/checks/close-prebuilt.mjs');
  });
});
