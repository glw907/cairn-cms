import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKS, GROUPS } from '../../../scripts/checks/registry.mjs';

const BASE = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/tests/unit/fixtures/check-names-base.json'), 'utf8'),
) as {
  homes: Record<string, string[]>;
  close: string[];
  builtAtBase: string[];
  renamed: Record<string, string>;
};

const SCRIPTS = (
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as { scripts: Record<string, string> }
).scripts;

// The root scripts that are rows under their own names, which the held CI and the engine tier call.
const ROOT_ROWS = ['check', 'test:emit', 'test:catalog', 'test:theme'];

const renamed = (name: string) => BASE.renamed[name] ?? name;
const original = Object.fromEntries(Object.entries(BASE.renamed).map(([from, to]) => [to, from]));
const rowNames = CHECKS.map((row) => row.name);

const membersOf = (group: string) =>
  CHECKS.filter((row) => Object.hasOwn(row.groups, group)).sort((a, b) => a.groups[group] - b.groups[group]);

describe('the check registry', () => {
  it('holds every name the base homes held, and nothing they lacked but test:theme', () => {
    const homeNames = new Set(Object.values(BASE.homes).flat().map(renamed));
    const groupScripts = Object.values(GROUPS).filter((script) => script !== null);
    const missing = [...homeNames].filter((name) => !rowNames.includes(name) && !groupScripts.includes(name));
    expect(missing).toEqual([]);
    const extra = rowNames.filter((name) => !homeNames.has(name));
    expect(extra).toEqual(['test:theme']);
  });

  it('runs the close group in the base close order', () => {
    expect(membersOf('close').map((row) => original[row.name] ?? row.name)).toEqual(BASE.close);
  });

  it('builds for exactly the checks whose script built at the base', () => {
    const built = CHECKS.filter((row) => row.build).map((row) => row.name);
    expect(built.sort()).toEqual([...BASE.builtAtBase].sort());
  });

  it('gives every row in a group a distinct place, and no command builds the package', () => {
    for (const group of Object.keys(GROUPS)) {
      const places = membersOf(group).map((row) => row.groups[group]);
      expect(new Set(places).size, group).toBe(places.length);
    }
    expect(CHECKS.filter((row) => row.command.includes('npm run package')).map((row) => row.name)).toEqual([]);
  });

  it('gives every row and every group with a script exactly one run.mjs script, and no script a stray', () => {
    const runnerScripts = Object.keys(SCRIPTS).filter((name) => name.startsWith('check:') || ROOT_ROWS.includes(name));
    const targets = new Map([
      ...rowNames.map((name) => [name, name] as const),
      ...Object.entries(GROUPS).flatMap(([group, script]) => (script === null ? [] : [[script, group] as const])),
    ]);
    const strays = runnerScripts.filter((name) => SCRIPTS[name] !== `node scripts/checks/run.mjs ${targets.get(name)}`);
    expect(strays).toEqual([]);
    const unscripted = [...targets.keys()].filter((name) => !runnerScripts.includes(name));
    expect(unscripted).toEqual([]);
  });

  it('leaves the build out of every check script', () => {
    const building = Object.keys(SCRIPTS).filter(
      (name) => name.startsWith('check:') && SCRIPTS[name].includes('npm run package'),
    );
    expect(building).toEqual([]);
  });
});
