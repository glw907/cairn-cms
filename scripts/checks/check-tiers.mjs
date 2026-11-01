// cairn-cms: the stability-tier gate. Every public export carries exactly one tier tag in its doc
// comment: `@public` for the Extension API, `@beta` for the Unstable API, and `@scaffold` for the
// Scaffold API (a custom tag defined in tsdoc.json). The gate reads the tags from the built `dist`
// declarations, which keep doc comments, so the tag is the source of truth and travels with the
// export into the published package.
//
// An export resolves to its declaring symbol before its tags are read, so a re-export and an
// `export *` take the declaration's tier. A Svelte component's declaration is the `declare const`
// svelte-package writes from its `@component` block, so the component's tier is the tag in that
// block. An export with no tier tag, or with two different ones, fails.
//
// Interface: `node scripts/checks/check-tiers.mjs`. Build `dist` first (`npm run check:tiers` does).
import ts from 'typescript';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleExports } from './dts-exports.mjs';
import { surfaceSubpaths } from './check-surface.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** @typedef {'Extension' | 'Unstable' | 'Scaffold'} Tier */

/** The tier each tag names. @type {Record<string, Tier>} */
export const TIER_TAGS = { public: 'Extension', beta: 'Unstable', scaffold: 'Scaffold' };

/**
 * The distinct tiers the doc comments on a symbol's declarations carry.
 * @param {ts.Symbol} symbol
 * @returns {Tier[]}
 */
function tiersOf(symbol) {
  /** @type {Set<Tier>} */
  const tiers = new Set();
  for (const decl of symbol.declarations ?? []) {
    for (const tag of ts.getJSDocTags(decl)) {
      const tier = TIER_TAGS[tag.tagName.text];
      if (tier) tiers.add(tier);
    }
  }
  return [...tiers];
}

/**
 * Read the tier of every export of the given subpaths.
 * @param {{ subpath: string, dts: string }[]} subpaths
 * @returns {{ entries: { subpath: string, name: string, tier: Tier | null }[], failures: string[] }}
 */
export function exportTiers(subpaths) {
  /** @type {{ subpath: string, name: string, tier: Tier | null }[]} */
  const entries = [];
  /** @type {string[]} */
  const failures = [];
  for (const { subpath, dts } of subpaths) {
    const { checker, symbols } = moduleExports(dts);
    for (const exported of symbols) {
      const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const tiers = tiersOf(symbol);
      const tier = tiers.length === 1 ? tiers[0] : null;
      entries.push({ subpath, name: exported.name, tier });
      if (tiers.length === 0) {
        failures.push(
          `${exported.name} (subpath ${subpath}) carries no tier tag. Add @public, @beta, or @scaffold to its declaring doc comment.`,
        );
      } else if (tiers.length > 1) {
        failures.push(`${exported.name} (subpath ${subpath}) carries more than one tier: ${tiers.join(', ')}.`);
      }
    }
  }
  return { entries, failures };
}

/** The built declaration of every subpath that has one. */
export function builtSubpaths() {
  return surfaceSubpaths().map((entry) => ({ subpath: entry.subpath, dts: resolve(ROOT, entry.dts) }));
}

function main() {
  const { entries, failures } = exportTiers(builtSubpaths());
  if (failures.length === 0) {
    /** @type {Record<string, number>} */
    const counts = {};
    for (const entry of entries) counts[entry.tier ?? 'none'] = (counts[entry.tier ?? 'none'] ?? 0) + 1;
    const summary = Object.entries(counts)
      .map(([tier, count]) => `${count} ${tier}`)
      .join(', ');
    console.log(`check:tiers: OK (${entries.length} exports: ${summary})`);
    return;
  }
  for (const failure of failures) console.error(`check:tiers: ${failure}`);
  console.error(`check:tiers: ${failures.length} defect(s)`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
