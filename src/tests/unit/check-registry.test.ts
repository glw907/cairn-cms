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
});
