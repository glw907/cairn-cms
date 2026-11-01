// cairn-cms: the transitional tier-agreement check. While docs/reference still states a stability
// tier for each export, every statement must agree with the export's tag (check-tiers.mjs reads the
// tags, which are the source of truth). This file is the only link between the tier gate and the
// reference pages: when those pages go, delete it and its `check:tier-docs` wiring (package.json,
// docs-gate.mjs, close-prebuilt.mjs, and gate-table.json).
//
// Interface: `node scripts/checks/check-tier-docs.mjs`. Build `dist` first.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, docTier, enumerateExports } from './reference-coverage.mjs';
import { builtSubpaths, exportTiers } from './check-tiers.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/**
 * Compare each export's tag tier to the tier its page states. A name the page states no tier for is
 * skipped, since the reference gate owns that defect.
 * @param {{ subpath: string, name: string, tier: string | null }[]} entries
 * @param {(subpath: string, name: string) => string | null} statedTier
 * @returns {{ checked: number, failures: string[] }}
 */
export function tierDisagreements(entries, statedTier) {
  let checked = 0;
  /** @type {string[]} */
  const failures = [];
  for (const entry of entries) {
    const stated = statedTier(entry.subpath, entry.name);
    if (stated === null || stated === undefined) continue;
    checked += 1;
    if (stated !== entry.tier) {
      failures.push(
        `${entry.name} (subpath ${entry.subpath}): the reference page states ${stated} API, the tag says ${entry.tier ?? 'none'}.`,
      );
    }
  }
  return { checked, failures };
}

/**
 * The tier the reference page states for one export, or null. A /delivery name re-exported from
 * /delivery/data is documented on that page, so the /delivery page states nothing for it.
 * @returns {(subpath: string, name: string) => string | null}
 */
function referenceStatements() {
  /** @type {Map<string, { text: string, excluded: Set<string> }>} */
  const pages = new Map();
  for (const entry of CONFIG) {
    const excluded = new Set(entry.excludeDts ? enumerateExports(resolve(ROOT, entry.excludeDts)) : []);
    pages.set(entry.subpath, { text: readFileSync(resolve(ROOT, entry.page), 'utf8'), excluded });
  }
  return (subpath, name) => {
    const page = pages.get(subpath);
    if (!page || page.excluded.has(name)) return null;
    return docTier(name, page.text);
  };
}

function main() {
  const { entries } = exportTiers(builtSubpaths());
  const { checked, failures } = tierDisagreements(entries, referenceStatements());
  if (failures.length === 0) {
    console.log(`check:tier-docs: OK (${checked} tier statements agree with their tags)`);
    return;
  }
  for (const failure of failures) console.error(`check:tier-docs: ${failure}`);
  console.error(`check:tier-docs: ${failures.length} disagreement(s) across ${checked} statements`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
