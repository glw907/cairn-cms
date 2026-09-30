// cairn-cms: the readiness-checklist gate. It loads the condition registry from the built dist
// (the same load-from-build stance as reference-coverage.mjs), reads the admin "Is it working?"
// checklist, and pins the two together: every condition's docsAnchor must name a real heading in
// the doc, and every condition must carry a docsAnchor unless an allowlist entry here excuses it.
// Fail-closed both ways, so a renamed heading or a new condition without a checklist section goes
// RED, and the RED output is the fix worklist.
//
// It also carries a second, independent comparison against the committed shipped-anchor list
// (shipped-anchors.json): the docsAnchor fragments a released tool tag has ever printed. The live
// registry above only proves today's tree is self-consistent; a heading renamed in the same
// change as its live docsAnchor entry passes that comparison cleanly while every already-shipped
// binary keeps linking to the fragment it was built with, and a fragment link can never be
// redirected. The shipped list is append-only for exactly that reason.
//
// The checklist lives in the admin arm, which is deleted and later rebuilt (arm-state.mjs). While
// the arm holds no page, the gate runs in list mode: every live docsAnchor must be on the shipped
// list, which already carries every anchor the registry names, so a new condition cannot mint a
// fragment no checklist and no released binary agree on. Once the arm holds any page it is
// rebuilt, and the gate returns to the checklist: the page must exist, and every live and shipped
// anchor must resolve on it, so a renamed or split checklist fails instead of disarming the gate.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { headingAnchors } from './docs-links.mjs';
import { armState } from './arm-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOC = 'docs/admin/is-it-working.md';
const CONDITIONS_JS = 'dist/diagnostics/conditions.js';
const SHIPPED_ANCHORS_PATH = 'scripts/checks/shipped-anchors.json';

// Conditions deliberately absent from the checklist. An addition needs a comment naming why the
// doc cannot carry the condition.
//
// Empty: the checklist covers every condition directly, and the mechanism stays for the next
// real exception. The one entry it once carried, for the packaged skill's freshness condition,
// died along with that condition when its install moved to cairn-guidance.
const ALLOWLIST = /** @type {Set<string>} */ (new Set([]));

/**
 * Compare the registry against the checklist text. Returns one problem line per offender: a
 * condition whose docsAnchor names no heading in the doc, a docsAnchor with no `#anchor` part,
 * or a condition with no docsAnchor at all (unless allowlisted).
 * @param {{ id: string, docsAnchor?: string }[]} conditions
 * @param {string} markdownText
 * @param {Set<string>} allowlist
 * @param {string} doc Repo-relative path of the checklist; its basename is what every docsAnchor
 *   must name, so a test can point this at a fixture.
 */
export function checkReadiness(conditions, markdownText, allowlist = ALLOWLIST, doc = DOC) {
  const anchors = headingAnchors(markdownText);
  const expectedFile = doc.slice(doc.lastIndexOf('/') + 1);
  const problems = [];
  for (const c of conditions) {
    if (!c.docsAnchor) {
      if (!allowlist.has(c.id)) {
        problems.push(`${c.id}: no docsAnchor; add a checklist section or an allowlist entry with a reason`);
      }
      continue;
    }
    const hash = c.docsAnchor.indexOf('#');
    const file = hash === -1 ? c.docsAnchor : c.docsAnchor.slice(0, hash);
    const anchor = hash === -1 ? '' : c.docsAnchor.slice(hash + 1);
    if (!anchor) {
      problems.push(`${c.id}: docsAnchor "${c.docsAnchor}" carries no #anchor part`);
      continue;
    }
    // Both halves, not just the anchor. Checking the anchor alone let a docsAnchor name a file
    // that does not exist while still passing, since every id resolves against this one doc; a
    // page rename would then leave 21 wrong filenames sitting green. The Pass D rebuild moved
    // this checklist between arms, which is exactly when that silence would have cost something.
    if (file !== expectedFile) {
      problems.push(`${c.id}: docsAnchor names "${file}", but the checklist is ${expectedFile}`);
    }
    if (!anchors.has(anchor)) {
      problems.push(`${c.id}: docsAnchor "#${anchor}" matches no heading in ${DOC}`);
    }
  }
  return problems;
}

/**
 * @typedef {{ anchors: string[], defects: string[] }} ShippedAnchorListResult
 */

/**
 * Read, parse, and validate the committed shipped-anchor list. Unlike the live registry above,
 * an empty list is itself a defect: no released tag has ever shipped zero anchors, so an emptied
 * file cannot be told apart from a working one that legitimately has none.
 * @param {string} listPath
 * @param {string} root The directory `listPath`'s own message is reported relative to.
 * @returns {ShippedAnchorListResult}
 */
export function loadShippedAnchors(listPath, root) {
  const rel = relative(root, listPath);
  if (!existsSync(listPath)) {
    return { anchors: [], defects: [`${rel}: does not exist`] };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(listPath, 'utf8'));
  } catch (error) {
    return { anchors: [], defects: [`${rel}: not valid JSON (${error instanceof Error ? error.message : String(error)})`] };
  }
  // A top-level array has no `anchors` property, so it fails like an object missing the field.
  const anchorsField =
    typeof parsed === 'object' && parsed !== null ? /** @type {{ anchors?: unknown }} */ (parsed).anchors : undefined;
  if (!Array.isArray(anchorsField)) {
    return { anchors: [], defects: [`${rel}: not an object carrying an "anchors" array`] };
  }
  /** @type {string[]} */
  const anchors = [];
  /** @type {string[]} */
  const defects = [];
  anchorsField.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      defects.push(`${rel}: anchors[${i}] is not a non-empty string`);
      return;
    }
    anchors.push(entry);
  });
  if (anchors.length === 0) {
    defects.push(`${rel}: carries no anchors; a released tag always ships at least one`);
  }
  // The list is append-only and a released tag never ships the same fragment under two entries,
  // so a repeat can only be a mistake in the commit that added it.
  const seenAnchors = new Set();
  for (const entry of anchors) {
    if (seenAnchors.has(entry)) defects.push(`${rel}: anchors contains a duplicate entry "${entry}"`);
    seenAnchors.add(entry);
  }
  return { anchors, defects };
}

/**
 * Compare the shipped-anchor list against the checklist text. Returns one problem line per
 * anchor a released binary still links to that no longer resolves: a docsAnchor with no
 * `#anchor` part, one naming a file other than the checklist, or one whose anchor matches no
 * current heading.
 * @param {string[]} anchors
 * @param {string} markdownText
 * @param {string} doc Repo-relative path of the checklist; its basename is what every entry's
 *   file half must name, so a test can point this at a fixture.
 */
export function checkShippedAnchors(anchors, markdownText, doc = DOC) {
  const headingSet = headingAnchors(markdownText);
  const expectedFile = doc.slice(doc.lastIndexOf('/') + 1);
  const problems = [];
  for (const entry of anchors) {
    const hash = entry.indexOf('#');
    const file = hash === -1 ? entry : entry.slice(0, hash);
    const anchor = hash === -1 ? '' : entry.slice(hash + 1);
    if (!anchor) {
      problems.push(`shipped anchor "${entry}" carries no #anchor part`);
      continue;
    }
    if (file !== expectedFile) {
      problems.push(`shipped anchor "${entry}" names "${file}", but the checklist is ${expectedFile}`);
      continue;
    }
    if (!headingSet.has(anchor)) {
      problems.push(`shipped anchor "#${anchor}" matches no heading in ${doc}; a released binary still links to it`);
    }
  }
  return problems;
}

/**
 * The full problem list `main()` reports: the live registry/doc pairing (`checkReadiness`) plus
 * the shipped-anchor list against the same doc (`checkShippedAnchors`), in that order. Split out
 * of `main()`'s own body so a test can prove the composition itself runs the shipped-anchor half,
 * rather than only trusting that `main()` still does: an edit that wired `checkReadiness` but
 * dropped the shipped-anchor call would otherwise pass every test in this file. The shipped list's
 * own load defects (a missing or malformed `shipped-anchors.json`) are reported on their own,
 * without also running the heading comparison against a list that failed to load.
 * @param {{ id: string, docsAnchor?: string }[]} conditions
 * @param {string} markdownText
 * @param {ShippedAnchorListResult} shipped
 * @param {string} [doc]
 * @returns {string[]}
 */
export function readinessProblems(conditions, markdownText, shipped, doc = DOC) {
  const problems = checkReadiness(conditions, markdownText, ALLOWLIST, doc);
  problems.push(...shipped.defects);
  if (shipped.defects.length === 0) problems.push(...checkShippedAnchors(shipped.anchors, markdownText, doc));
  return problems;
}

/**
 * List mode's comparison: every live docsAnchor must carry an `#anchor` part, name the checklist
 * file, and appear on the shipped list. A condition with no docsAnchor fails unless allowlisted,
 * as in {@link checkReadiness}.
 * @param {{ id: string, docsAnchor?: string }[]} conditions
 * @param {string[]} anchors the shipped list's entries
 * @param {Set<string>} allowlist
 * @param {string} doc
 */
export function checkLiveAnchorsListed(conditions, anchors, allowlist = ALLOWLIST, doc = DOC) {
  const listed = new Set(anchors);
  const expectedFile = doc.slice(doc.lastIndexOf('/') + 1);
  const problems = [];
  for (const c of conditions) {
    if (!c.docsAnchor) {
      if (!allowlist.has(c.id)) {
        problems.push(`${c.id}: no docsAnchor; add a checklist section or an allowlist entry with a reason`);
      }
      continue;
    }
    const hash = c.docsAnchor.indexOf('#');
    const file = hash === -1 ? c.docsAnchor : c.docsAnchor.slice(0, hash);
    if (hash === -1 || hash === c.docsAnchor.length - 1) {
      problems.push(`${c.id}: docsAnchor "${c.docsAnchor}" carries no #anchor part`);
      continue;
    }
    if (file !== expectedFile) {
      problems.push(`${c.id}: docsAnchor names "${file}", but the checklist is ${expectedFile}`);
      continue;
    }
    if (!listed.has(c.docsAnchor)) {
      problems.push(
        `${c.id}: docsAnchor "${c.docsAnchor}" is not in ${SHIPPED_ANCHORS_PATH}, and the admin arm holds no checklist to anchor it on; a new anchor waits for the admin arm's rebuild`
      );
    }
  }
  return problems;
}

/**
 * The full problem list for the admin arm's state: list mode ({@link checkLiveAnchorsListed} plus
 * the shipped list's own load defects) while the arm is not rebuilt, and {@link readinessProblems}
 * against the checklist once it is. A rebuilt arm with no checklist page is itself the problem.
 * @param {{ id: string, docsAnchor?: string }[]} conditions
 * @param {string} adminState the admin arm's state from arm-state.mjs
 * @param {string | null} docText the checklist's text, or null when the page does not exist
 * @param {ShippedAnchorListResult} shipped
 * @returns {string[]}
 */
export function readinessProblemsForArm(conditions, adminState, docText, shipped) {
  if (adminState !== 'rebuilt') {
    if (shipped.defects.length > 0) return [...shipped.defects];
    return checkLiveAnchorsListed(conditions, shipped.anchors);
  }
  if (docText === null) {
    return [
      `${DOC} does not exist, but the admin arm holds pages; the checklist must come back with every anchor in ${SHIPPED_ANCHORS_PATH}, or this gate must be repointed at the page that carries them`,
    ];
  }
  return readinessProblems(conditions, docText, shipped);
}

async function main() {
  const distPath = resolve(ROOT, CONDITIONS_JS);
  if (!existsSync(distPath)) {
    console.error(`missing ${CONDITIONS_JS}; run "npm run package" first`);
    process.exitCode = 2;
    return;
  }
  const { allConditions } = await import(pathToFileURL(distPath).href);
  const conditions = allConditions();
  const adminState = armState(ROOT, 'admin');
  const docAbs = resolve(ROOT, DOC);
  const docText = existsSync(docAbs) ? readFileSync(docAbs, 'utf8') : null;
  const shipped = loadShippedAnchors(resolve(ROOT, SHIPPED_ANCHORS_PATH), ROOT);
  const problems = readinessProblemsForArm(conditions, adminState, docText, shipped);

  if (problems.length > 0) {
    console.error(`check-readiness: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
    return;
  }
  if (adminState === 'rebuilt') {
    console.log(`check-readiness: OK (${conditions.length} conditions, ${shipped.anchors.length} shipped anchors anchored in ${DOC})`);
  } else {
    console.log(
      `check-readiness: OK in list mode (the admin arm is ${adminState}; ${conditions.length} conditions' docsAnchors all on the ${shipped.anchors.length}-entry ${SHIPPED_ANCHORS_PATH})`
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
