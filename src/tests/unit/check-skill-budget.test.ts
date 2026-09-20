import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  checkAllSkillBudgets,
  checkSkillBudget,
  checkTierMap,
  discoverSkillFiles,
  distRulesAvailable,
  estimateTokens,
  parseTierMap,
  shouldCheckTierMap,
  SKILL_BUDGET_TOKENS
} from '../../../scripts/checks/check-skill-budget.mjs';
import { staticRules } from '../../lib/audit/rules/static/index.js';
import { renderedRules } from '../../lib/audit/rules/rendered/index.js';

// spec section 7: the packaged skill's always-loaded core carries "a hard token budget in the low
// thousands." The plan ratifies the number as 3,500. This is the counting check: a pure function
// the CLI and this suite both drive, so the real shipped SKILL.md is gated the same way a fixture
// is.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('estimateTokens', () => {
  it('estimates roughly four characters per token', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('rounds a partial token up', () => {
    expect(estimateTokens('abcde')).toBe(2);
  });
});

describe('checkSkillBudget', () => {
  it('passes text comfortably under the budget', () => {
    const result = checkSkillBudget('a short skill core', 3500);
    expect(result).toEqual({ ok: true, tokens: 5, budget: 3500 });
  });

  it('fails naming the fix when the estimated token count exceeds the budget', () => {
    const overBudget = 'x'.repeat((3500 + 100) * 4);
    const result = checkSkillBudget(overBudget, 3500);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.tokens).toBe(3600);
    expect(result.error).toContain('token budget');
    expect(result.error).toContain('references/');
  });

  it('enforces the real packaged SKILL.md against the ratified 3,500-token budget', () => {
    const text = readFileSync(
      resolve(ROOT, 'skills/cairn-admin-screens/SKILL.md'),
      'utf8'
    );
    const result = checkSkillBudget(text, SKILL_BUDGET_TOKENS);
    expect(result.ok).toBe(true);
  });
});

// checkAllSkillBudgets glob-discovers every skills/*/SKILL.md under a root and budgets each one
// whole; these fixtures prove the discovery and the per-skill failure both name the right file.
describe('discoverSkillFiles and checkAllSkillBudgets', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot() {
    const dir = mkdtempSync(join(tmpdir(), 'check-skill-budget-'));
    tmpDirs.push(dir);
    return dir;
  }

  function writeSkill(root: string, name: string, text: string) {
    const skillDir = join(root, 'skills', name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), text);
  }

  it('discovers one SKILL.md path per skill directory, sorted', () => {
    const root = fixtureRoot();
    writeSkill(root, 'zebra-skill', 'short');
    writeSkill(root, 'alpha-skill', 'short');
    expect(discoverSkillFiles(root)).toEqual([
      'skills/alpha-skill/SKILL.md',
      'skills/zebra-skill/SKILL.md'
    ]);
  });

  it('fails naming a fixture skill whose SKILL.md is over budget', () => {
    const root = fixtureRoot();
    writeSkill(root, 'over-budget', 'x'.repeat((SKILL_BUDGET_TOKENS + 100) * 4));
    writeSkill(root, 'under-budget', 'a short skill core');
    const { ok, results } = checkAllSkillBudgets(root);
    expect(ok).toBe(false);
    const over = results.find((r) => r.path === 'skills/over-budget/SKILL.md');
    expect(over?.ok).toBe(false);
    const under = results.find((r) => r.path === 'skills/under-budget/SKILL.md');
    expect(under?.ok).toBe(true);
  });

  it('a fixture skill with no tier map passes budget when it is not cairn-admin-screens', () => {
    const root = fixtureRoot();
    writeSkill(root, 'plain-skill', 'a short skill core with no tier map section at all');
    const { ok } = checkAllSkillBudgets(root);
    expect(ok).toBe(true);
    expect(shouldCheckTierMap('skills/plain-skill/SKILL.md')).toBe(false);
    expect(shouldCheckTierMap('skills/cairn-admin-screens/SKILL.md')).toBe(true);
  });
});

// The tier map only runs after `npm run package`, since it imports the compiled dist rule
// registries; distRulesAvailable is the pure predicate main() uses to print a notice and exit 0
// instead, rather than failing a fresh checkout that has not packaged yet.
describe('distRulesAvailable', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('is false for a root with no dist/ build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'check-skill-budget-dist-'));
    tmpDirs.push(dir);
    expect(distRulesAvailable(dir)).toBe(false);
  });

  // The unit suite must pass without a prior `npm run package`, following the same
  // skip-until-built pattern as doctor-bin.test.ts's "packaged bin" suite, so this only runs
  // (via skipIf) when a build has already produced the dist file.
  it.skipIf(!distRulesAvailable(ROOT))('is true for the real repo root after npm run package', () => {
    expect(distRulesAvailable(ROOT)).toBe(true);
  });
});

function actualTierMap() {
  return [
    ...staticRules().map((rule) => ({ id: rule.id, mode: 'static' as const, tier: rule.tier })),
    ...renderedRules().map((rule) => ({ id: rule.id, mode: 'rendered' as const, tier: rule.tier })),
  ];
}

describe('parseTierMap', () => {
  it('reads the real SKILL.md tier-map section into one entry per documented rule id', () => {
    const text = readFileSync(resolve(ROOT, 'skills/cairn-admin-screens/SKILL.md'), 'utf8');
    const entries = parseTierMap(text);
    expect(entries).toContainEqual({ id: 'no-uncompiled-class', mode: 'static', tier: 'error' });
    expect(entries).toContainEqual({ id: 'one-filled-action', mode: 'rendered', tier: 'error' });
    expect(entries).toContainEqual({ id: 'screen-anatomy', mode: 'rendered', tier: 'advisory' });
  });

  it('throws when a labeled tier-map section is missing, rather than reporting zero rules', () => {
    expect(() => parseTierMap('no tier map here')).toThrowError(/Static, error tier/);
  });
});

describe('checkTierMap', () => {
  it('agrees when the real SKILL.md tier map exactly matches the real rule registries', () => {
    const text = readFileSync(resolve(ROOT, 'skills/cairn-admin-screens/SKILL.md'), 'utf8');
    const result = checkTierMap(parseTierMap(text), actualTierMap());
    expect(result).toEqual({ ok: true });
  });

  it('fails naming a rule the registry carries but the doc omits', () => {
    const documented = actualTierMap().filter((e) => e.id !== 'gap-scale');
    const result = checkTierMap(documented, actualTierMap());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('missing the static rule "gap-scale"');
  });

  it('fails naming a rule the doc claims at the wrong tier', () => {
    const documented = actualTierMap().map((e) =>
      e.id === 'chip-ground-collision' ? { ...e, tier: 'error' as const } : e
    );
    const result = checkTierMap(documented, actualTierMap());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('"chip-ground-collision" as error tier');
    expect(result.error).toContain('registry has it at advisory tier');
  });

  it('fails naming a rule the doc lists that the registry no longer carries', () => {
    const documented = [
      ...actualTierMap(),
      { id: 'retired-rule', mode: 'static' as const, tier: 'error' as const },
    ];
    const result = checkTierMap(documented, actualTierMap());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.error).toContain('"retired-rule"');
    expect(result.error).toContain('not in the rule registry');
  });
});
