// Contract v1 over the two themes that must meet it: Waymark and the options fixture. Each file
// in the theme directory matches an allowed path, every required path exists, and the theme's
// built sheets declare every required token name in each color mode and each option value.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { CONTRACT, declaredByMode, filesUnder, globRegExp, picksOf } from './theme-contract.mjs';

const ROOT = repoRoot(import.meta.url);
const THEMES = {
  waymark: path.join(ROOT, 'themes/waymark'),
  'options fixture': path.join(ROOT, 'scripts/theme/fixtures/options-theme'),
};
const COMPUTED = path.join(ROOT, 'examples/showcase/e2e/fixtures/public-theme-computed.json');

test('the required token names are the computed-fixture names minus the chassis-only ones, plus the two new roles', () => {
  const computed = JSON.parse(readFileSync(COMPUTED, 'utf8'));
  const chassisOnly = CONTRACT.tokens.chassisOnly.map((entry) => entry.name);
  for (const entry of CONTRACT.tokens.chassisOnly) assert.ok(entry.reason, `${entry.name} has a reason`);
  for (const state of Object.values(computed.states)) {
    const names = Object.keys(state.root).filter((name) => !chassisOnly.includes(name));
    assert.deepEqual(
      [...CONTRACT.tokens.required].sort(),
      [...names, '--cairn-eyebrow-case', '--cairn-scroll-cue'].sort(),
    );
  }
});

for (const [label, dir] of Object.entries(THEMES)) {
  test(`every ${label} file is an allowed contract path`, () => {
    const allowed = CONTRACT.paths.allowed.map(globRegExp);
    const strays = filesUnder(dir).filter((file) => !allowed.some((re) => re.test(file)));
    assert.deepEqual(strays, []);
  });

  test(`${label} holds every required path and each file its manifest names`, () => {
    const manifest = JSON.parse(readFileSync(path.join(dir, 'cairn-theme.json'), 'utf8'));
    const named = [
      ...manifest.fonts.flatMap((font) => font.files),
      ...manifest.screenshots.map((shot) => shot.path),
      ...manifest.options.flatMap((option) => option.values.map((v) => `options/${option.key}/${v.value}.css`)),
    ];
    const missing = [...CONTRACT.paths.required, ...named].filter((rel) => !existsSync(path.join(dir, rel)));
    assert.deepEqual(missing, []);
  });

  test(`${label} declares every required token name in each mode and option value`, () => {
    const manifest = JSON.parse(readFileSync(path.join(dir, 'cairn-theme.json'), 'utf8'));
    for (const pick of picksOf(manifest)) {
      const modes = declaredByMode(dir, manifest, pick);
      for (const [mode, declared] of Object.entries(modes)) {
        const missing = CONTRACT.tokens.required.filter((name) => !declared.has(name));
        assert.deepEqual(missing, [], `${mode} mode, options ${JSON.stringify(pick)}`);
      }
    }
  });
}

test('a generated path is never shipped in a theme directory', () => {
  for (const dir of Object.values(THEMES)) {
    for (const rel of CONTRACT.paths.generated) assert.ok(!existsSync(path.join(dir, rel)), `${dir}/${rel}`);
  }
});
