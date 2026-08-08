import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkSkillBudget,
  checkTierMap,
  estimateTokens,
  parseTierMap,
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
