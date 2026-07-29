import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkSkillBudget,
  estimateTokens,
  SKILL_BUDGET_TOKENS
} from '../../../scripts/check-skill-budget.mjs';

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
