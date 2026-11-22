#!/usr/bin/env node
// The theme check. Usage:
//
//   node scripts/theme/check.mjs <themeDir> [--json] [--rules <id,id>]
//   node scripts/theme/check.mjs --catalog
//
// It runs the contract's rules over one theme directory, or over every theme
// directory under `themes/`, and prints one `check:theme: <id> pass|fail` line per theme. `--json`
// prints the verdict as one JSON document, valid against `schema/cairn-theme-check.schema.json`.
// `--rules` limits a run to the named rules. Only the `render` rule builds a site.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { runCheck } from '../checks/shared.mjs';
import { STATIC_RULES, themeContext } from './check-rules.mjs';

const ROOT = repoRoot(import.meta.url);

/** Every rule id, in the order a report lists them. */
export const RULE_IDS = [
  'manifest-schema',
  'contract-version',
  'engine-range',
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
 * @param {{ rules?: string[], pages?: string[], quick?: boolean }} [options] the rule ids to run,
 *   every rule when omitted; the routes the `render` rule loads, every route when omitted; and
 *   `quick`, which has `render` build each option's default in the light mode only
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
    const result = await run({ ...ctx, ...(pages && { pages }), ...(options.quick && { quick: true }) });
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
 * The directories of the catalog's themes, or the reasons the catalog cannot be checked. A theme is
 * a directory under `themes/`.
 * @param {string} [themesDir] the directory that holds the themes; the repository's `themes/` when omitted
 * @returns {{ dirs: { id: string, dir: string }[], problems: string[] }}
 */
export function catalogThemes(themesDir = path.join(ROOT, 'themes')) {
  const dirs = [];
  const problems = [];
  const names = readdirSync(themesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const id of names) {
    const dir = path.join(themesDir, id);
    if (existsSync(path.join(dir, 'cairn-theme.json'))) dirs.push({ id, dir });
    else problems.push(`themes/${id} has no cairn-theme.json`);
  }
  if (names.length === 0) problems.push('themes/ holds no theme');
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

/**
 * Run the check over the arguments. A text run ends through `runCheck` with its verdict line. A
 * valid `--json` run prints the document alone and sets the exit code itself, so stdout stays one
 * JSON document; a usage error or a throw goes through `runCheck` in either mode.
 * @param {string[]} args the command-line arguments after the script name
 * @returns {Promise<void>}
 */
async function main(args) {
  const json = args.includes('--json');
  const catalog = args.includes('--catalog');
  const rulesAt = args.indexOf('--rules');
  const rules = rulesAt >= 0 ? (args[rulesAt + 1] ?? '').split(',').filter(Boolean) : undefined;
  const positional = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--rules');
  if (catalog === (positional.length > 0) || (catalog && json)) {
    return runCheck('check:theme', () => ['usage: check.mjs <themeDir> [--json] [--rules <ids>]\n       check.mjs --catalog']);
  }
  if (json) {
    try {
      const result = await checkTheme(positional[0], { rules });
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.verdict === 'pass' ? 0 : 1;
    } catch (error) {
      await runCheck('check:theme', () => [`check:theme: ${error instanceof Error ? error.message : String(error)}`]);
    }
    return;
  }
  await runCheck('check:theme', async () => {
    try {
      if (!catalog) {
        const result = await checkTheme(positional[0], { rules });
        print(result);
        return result.verdict === 'pass' ? [] : [`${result.theme} failed`];
      }
      const { dirs, problems } = catalogThemes();
      const found = problems.map((problem) => `check:theme: ${problem}`);
      for (const { dir } of dirs) {
        const result = await checkTheme(dir, { rules });
        print(result);
        if (result.verdict === 'fail') found.push(`${result.theme} failed`);
      }
      return found;
    } catch (error) {
      return [`check:theme: ${error instanceof Error ? error.message : String(error)}`];
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
