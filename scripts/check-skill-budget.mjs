// cairn-cms: the packaged skill's always-loaded core (SKILL.md) carries a hard prose budget, not
// an aspiration (spec section 7: "within a hard token budget in the low thousands," ratified at
// 3,500 for Pass 3). Instruction-following decays well below the size of a full standard, so a
// section that quietly grows the core past this ceiling defeats the tiered-loading design the
// exemplars, craft chapter, and grader prompt exist to relieve. This estimates token count from
// character length (~4 chars/token, the common rough approximation for English prose) rather than
// pulling a tokenizer dependency into the packaged CLI for one counting check, and fails loud, by
// how much and where the detail belongs (references/), above the ceiling.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-root.mjs';

/** The ratified ceiling for the skill's always-loaded core (spec section 7, Pass 3). */
export const SKILL_BUDGET_TOKENS = 3500;

/** Characters per token, the rough estimator common tokenizer-size guidance uses for English prose. */
const CHARS_PER_TOKEN = 4;

const SKILL_PATH = 'skills/cairn-admin-screens/SKILL.md';

/**
 * Estimate a text's token count from its character length.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check a skill core's text against the token budget.
 * @param {string} text the SKILL.md content
 * @param {number} [budget] the ceiling in estimated tokens
 * @returns {{ ok: true, tokens: number, budget: number } | { ok: false, tokens: number, budget: number, error: string }}
 */
export function checkSkillBudget(text, budget = SKILL_BUDGET_TOKENS) {
  const tokens = estimateTokens(text);
  if (tokens > budget) {
    return {
      ok: false,
      tokens,
      budget,
      error: `SKILL.md estimates ${tokens} tokens, over the ${budget}-token budget for the always-loaded core; move detail to references/ or trim prose`
    };
  }
  return { ok: true, tokens, budget };
}

function main() {
  const root = repoRoot(import.meta.url);
  const text = readFileSync(resolve(root, SKILL_PATH), 'utf8');
  const result = checkSkillBudget(text);
  if (!result.ok) {
    console.error(`check-skill-budget: ${result.error}`);
    process.exit(1);
  }
  console.log(`check-skill-budget: OK (${result.tokens}/${result.budget} estimated tokens)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
