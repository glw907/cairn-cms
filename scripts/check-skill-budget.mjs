// cairn-cms: the packaged skill's always-loaded core (SKILL.md) carries a hard prose budget, not
// an aspiration (spec section 7: "within a hard token budget in the low thousands," ratified at
// 3,500 for Pass 3). Instruction-following decays well below the size of a full standard, so a
// section that quietly grows the core past this ceiling defeats the tiered-loading design the
// exemplars, craft chapter, and grader prompt exist to relieve. This estimates token count from
// character length (~4 chars/token, the common rough approximation for English prose) rather than
// pulling a tokenizer dependency into the packaged CLI for one counting check, and fails loud, by
// how much and where the detail belongs (references/), above the ceiling.
//
// This also gates the SKILL.md "Tier map" section against the real rule registries
// (src/lib/audit/rules/static/index.ts and rendered/index.ts): a retiered or renamed rule that
// forgets the doc's own table is exactly the kind of drift no reader catches, since the table
// reads as plausible prose either way.
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

/** @typedef {{ id: string, mode: 'static' | 'rendered', tier: 'error' | 'advisory' }} TierMapEntry */

/**
 * The tier-map section labels this check parses, in the order SKILL.md declares them.
 * @type {{ label: string, mode: TierMapEntry['mode'], tier: TierMapEntry['tier'] }[]}
 */
const TIER_MAP_SECTIONS = [
  { label: 'Static, error tier', mode: 'static', tier: 'error' },
  { label: 'Rendered, error tier', mode: 'rendered', tier: 'error' },
  { label: 'Rendered, advisory tier', mode: 'rendered', tier: 'advisory' },
];

/**
 * Parse SKILL.md's "Tier map" section into one entry per rule id it lists, reading each
 * section's rule ids off the backtick-quoted tokens in its paragraph. Throws when a labeled
 * section itself has gone missing, since that is a doc-structure break the budget check should
 * not silently paper over as "zero rules documented."
 * @param {string} skillText
 * @returns {TierMapEntry[]}
 */
export function parseTierMap(skillText) {
  const entries = [];
  for (const { label, mode, tier } of TIER_MAP_SECTIONS) {
    const labelIndex = skillText.indexOf(`**${label}`);
    if (labelIndex === -1) {
      throw new Error(`SKILL.md is missing the "${label}" tier-map section`);
    }
    const sectionEnd = skillText.indexOf('\n\n', labelIndex);
    const section = skillText.slice(labelIndex, sectionEnd === -1 ? undefined : sectionEnd);
    for (const match of section.matchAll(/`([a-z0-9-]+)`/g)) {
      entries.push({ id: match[1], mode, tier });
    }
  }
  return entries;
}

/**
 * Compare SKILL.md's documented tier map against the rule registries' actual ids and tiers.
 * Pure, so a disagreement fixture can drive it without touching the real doc or registries.
 * @param {TierMapEntry[]} documented
 * @param {TierMapEntry[]} actual
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function checkTierMap(documented, actual) {
  // Mode plus id, since a static and a rendered rule may legitimately share an id. The maps hold
  // the whole entry rather than its tier alone, so a problem line reads its mode and id back off
  // the entry instead of taking the composite key apart again.
  const key = (/** @type {TierMapEntry} */ e) => `${e.mode}:${e.id}`;
  const documentedByKey = new Map(documented.map((e) => [key(e), e]));
  const actualByKey = new Map(actual.map((e) => [key(e), e]));

  const problems = [];
  for (const [k, rule] of actualByKey) {
    const documentedRule = documentedByKey.get(k);
    if (documentedRule === undefined) {
      problems.push(`SKILL.md's tier map is missing the ${rule.mode} rule "${rule.id}" (registry tier: ${rule.tier})`);
    } else if (documentedRule.tier !== rule.tier) {
      problems.push(
        `SKILL.md lists the ${rule.mode} rule "${rule.id}" as ${documentedRule.tier} tier, ` +
          `but the registry has it at ${rule.tier} tier`
      );
    }
  }
  for (const [k, rule] of documentedByKey) {
    if (!actualByKey.has(k)) {
      problems.push(
        `SKILL.md's tier map lists the ${rule.mode} rule "${rule.id}" (${rule.tier} tier), ` +
          `which is not in the rule registry`
      );
    }
  }

  if (problems.length > 0) {
    return { ok: false, error: problems.join('; ') };
  }
  return { ok: true };
}

/**
 * Project one registry rule onto a tier-map entry, so the registry's own richer rule shape (a
 * `check` function, optional interaction states) narrows to just what the doc's table claims.
 * @param {{ id: string, tier: TierMapEntry['tier'] }} rule
 * @param {TierMapEntry['mode']} mode
 * @returns {TierMapEntry}
 */
function tierMapEntry(rule, mode) {
  return { id: rule.id, mode, tier: rule.tier };
}

/**
 * Build the actual tier map off the real rule registries. Imports the packaged dist build
 * (the registries compile from TypeScript under NodeNext `.js` specifiers a plain `node`
 * invocation cannot resolve against source), so this only runs after `npm run package`, which
 * `check:package` already sequences ahead of this script.
 * @param {string} root
 * @returns {Promise<TierMapEntry[]>}
 */
async function actualTierMap(root) {
  /** @type {typeof import('../src/lib/audit/rules/static/index.js')} */
  const staticModule = await import(`file://${resolve(root, 'dist/audit/rules/static/index.js')}`);
  /** @type {typeof import('../src/lib/audit/rules/rendered/index.js')} */
  const renderedModule = await import(`file://${resolve(root, 'dist/audit/rules/rendered/index.js')}`);
  return [
    ...staticModule.staticRules().map((rule) => tierMapEntry(rule, 'static')),
    ...renderedModule.renderedRules().map((rule) => tierMapEntry(rule, 'rendered')),
  ];
}

async function main() {
  const root = repoRoot(import.meta.url);
  const text = readFileSync(resolve(root, SKILL_PATH), 'utf8');
  const result = checkSkillBudget(text);
  if (!result.ok) {
    console.error(`check-skill-budget: ${result.error}`);
    process.exit(1);
  }
  console.log(`check-skill-budget: OK (${result.tokens}/${result.budget} estimated tokens)`);

  const tierMapResult = checkTierMap(parseTierMap(text), await actualTierMap(root));
  if (!tierMapResult.ok) {
    console.error(`check-skill-budget: ${tierMapResult.error}`);
    process.exit(1);
  }
  console.log('check-skill-budget: tier map matches the rule registries');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`check-skill-budget: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
