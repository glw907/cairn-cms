#!/usr/bin/env node
// The theme check. Usage:
//
//   node scripts/theme/check.mjs <themeDir> [--json] [--rules <id,id>]
//   node scripts/theme/check.mjs --catalog
//
// It runs the contract's rules over one theme directory, or over every theme in
// `templates/catalog.json`, and prints one `check:theme: <id> pass|fail` line per theme. `--json`
// prints the verdict as one JSON document, valid against `schema/cairn-theme-check.schema.json`.
// `--rules` limits a run to the named rules. Only the `render` rule builds a site.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { STATIC_RULES, themeContext } from './check-rules.mjs';

const ROOT = repoRoot(import.meta.url);

/** Every rule id, in the order a report lists them. */
export const RULE_IDS = [
  'manifest-schema',
  'contract-version',
  'tokens-schema',
  'resolver-options',
  'paths-required',
  'paths-unlisted',
  'tokens-stale',
  'tokens-required',
  'render',
  'directive-styled',
  'audit',
  'fonts',
  'external-host',
];

/**
 * Run rules over one theme directory.
 * @param {string} dir the theme directory
 * @param {{ rules?: string[], pages?: string[] }} [options] the rule ids to run, every rule when
 *   omitted, and the routes the `render` rule loads, every route when omitted
 * @returns {Promise<{ schemaVersion: 1, kind: 'theme-check', theme: string, dir: string, verdict: 'pass' | 'fail', rules: string[], failures: { file: string, rule: string, message: string }[], notes: { rule: string, message: string }[] }>}
 */
export async function checkTheme(dir, options = {}) {
  const ids = options.rules ?? RULE_IDS;
  const pages = options.pages;
  const unknown = ids.filter((id) => !RULE_IDS.includes(id));
  if (unknown.length) throw new Error(`unknown rule id${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. The rules are ${RULE_IDS.join(', ')}`);
  const ctx = themeContext(dir);
  const failures = [];
  const notes = [];
  for (const id of RULE_IDS.filter((rule) => ids.includes(rule))) {
    const run = id === 'render' ? (await import('./check-render.mjs')).renderRule : STATIC_RULES[id];
    const result = await run(pages ? { ...ctx, pages } : ctx);
    const list = Array.isArray(result) ? result : result.failures;
    for (const failure of list) failures.push({ file: failure.file, rule: id, message: failure.message });
    if (!Array.isArray(result)) for (const message of result.notes) notes.push({ rule: id, message });
  }
  const id = ctx.manifest?.id ?? path.basename(ctx.dir);
  return {
    schemaVersion: 1,
    kind: 'theme-check',
    theme: String(id),
    dir: ctx.dir,
    verdict: failures.length === 0 ? 'pass' : 'fail',
    rules: RULE_IDS.filter((rule) => ids.includes(rule)),
    failures,
    notes,
  };
}

/**
 * The directories of the catalog's themes, or the reasons the catalog cannot be checked.
 * @param {string} [file] the catalog file; the engine's `templates/catalog.json` when omitted
 * @returns {{ dirs: { id: string, dir: string }[], problems: string[] }}
 */
export function catalogThemes(file = path.join(ROOT, 'templates/catalog.json')) {
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  const dirs = [];
  const problems = [];
  if (!Array.isArray(catalog.themes) || catalog.themes.length === 0) problems.push('templates/catalog.json names no theme');
  for (const entry of catalog.themes ?? []) {
    if (entry.source !== 'engine') {
      problems.push(`catalog theme "${entry.id}" has source "${entry.source}", which this check cannot read from a clone`);
      continue;
    }
    const dir = path.join(ROOT, 'themes', entry.path);
    if (existsSync(dir)) dirs.push({ id: entry.id, dir });
    else problems.push(`catalog theme "${entry.id}": ${path.relative(ROOT, dir)} is missing`);
  }
  return { dirs, problems };
}

/**
 * Print one theme's verdict line and its failures.
 * @param {Awaited<ReturnType<typeof checkTheme>>} result
 */
function print(result) {
  console.log(`check:theme: ${result.theme} ${result.verdict}`);
  for (const failure of result.failures) console.log(`  ${failure.rule}  ${failure.file}  ${failure.message}`);
  for (const note of result.notes) console.log(`  note ${note.rule}  ${note.message}`);
}

async function main(args) {
  const json = args.includes('--json');
  const catalog = args.includes('--catalog');
  const rulesAt = args.indexOf('--rules');
  const rules = rulesAt >= 0 ? (args[rulesAt + 1] ?? '').split(',').filter(Boolean) : undefined;
  const positional = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--rules');
  if (catalog === (positional.length > 0) || (catalog && json)) {
    console.error('usage: check.mjs <themeDir> [--json] [--rules <ids>]\n       check.mjs --catalog');
    return 2;
  }
  try {
    if (!catalog) {
      const result = await checkTheme(positional[0], { rules });
      if (json) console.log(JSON.stringify(result, null, 2));
      else print(result);
      return result.verdict === 'pass' ? 0 : 1;
    }
    const { dirs, problems } = catalogThemes();
    for (const problem of problems) console.log(`check:theme: ${problem}`);
    let failed = problems.length > 0;
    for (const { dir } of dirs) {
      const result = await checkTheme(dir, { rules });
      print(result);
      if (result.verdict === 'fail') failed = true;
    }
    return failed ? 1 : 0;
  } catch (error) {
    console.error(`check:theme: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
