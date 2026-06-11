// cairn-cms: the readiness-checklist gate. It loads the condition registry from the built dist
// (the same load-from-build stance as reference-coverage.mjs), reads the Cloudflare readiness
// checklist, and pins the two together: every condition's docsAnchor must name a real heading in
// the doc, and every condition must carry a docsAnchor unless an allowlist entry here excuses it.
// Fail-closed both ways, so a renamed heading or a new condition without a checklist section goes
// RED, and the RED output is the fix worklist.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { headingAnchors } from './docs-links.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = 'docs/guides/cloudflare-readiness.md';
const CONDITIONS_JS = 'dist/diagnostics/conditions.js';

// Conditions deliberately absent from the checklist. Empty today: every registry entry points at
// a section (the runtime-only conditions share the doc's closing "Runtime conditions" section).
// An addition needs a comment naming why the doc cannot carry the condition.
const ALLOWLIST = /** @type {Set<string>} */ (new Set());

/**
 * Compare the registry against the checklist text. Returns one problem line per offender: a
 * condition whose docsAnchor names no heading in the doc, a docsAnchor with no `#anchor` part,
 * or a condition with no docsAnchor at all (unless allowlisted).
 * @param {{ id: string, docsAnchor?: string }[]} conditions
 * @param {string} markdownText
 * @param {Set<string>} allowlist
 */
export function checkReadiness(conditions, markdownText, allowlist = ALLOWLIST) {
  const anchors = headingAnchors(markdownText);
  const problems = [];
  for (const c of conditions) {
    if (!c.docsAnchor) {
      if (!allowlist.has(c.id)) {
        problems.push(`${c.id}: no docsAnchor; add a checklist section or an allowlist entry with a reason`);
      }
      continue;
    }
    const hash = c.docsAnchor.indexOf('#');
    const anchor = hash === -1 ? '' : c.docsAnchor.slice(hash + 1);
    if (!anchor) {
      problems.push(`${c.id}: docsAnchor "${c.docsAnchor}" carries no #anchor part`);
    } else if (!anchors.has(anchor)) {
      problems.push(`${c.id}: docsAnchor "#${anchor}" matches no heading in ${DOC}`);
    }
  }
  return problems;
}

async function main() {
  const distPath = resolve(ROOT, CONDITIONS_JS);
  if (!existsSync(distPath)) {
    console.error(`missing ${CONDITIONS_JS}; run "npm run package" first`);
    process.exit(2);
  }
  const { allConditions } = await import(pathToFileURL(distPath).href);
  const conditions = allConditions();
  const problems = checkReadiness(conditions, readFileSync(resolve(ROOT, DOC), 'utf8'));
  if (problems.length > 0) {
    console.error(`check-readiness: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-readiness: OK (${conditions.length} conditions anchored in ${DOC})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
