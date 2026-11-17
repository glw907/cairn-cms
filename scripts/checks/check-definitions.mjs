// cairn-cms: the definitions drift gate. The closed kind and feature lists live in definitions/,
// and the schemas carry generated copies (see scripts/build/emit-definitions.mjs). This
// regenerates the schemas into memory and fails on the first byte that differs from a committed
// file, so an edit to definitions/ that forgets to regenerate is a red gate.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchemas, definitionProblems, readDefinitions } from '../build/emit-definitions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Checks the definitions and every schema generated from them.
 * @param {string} root Directory that holds `definitions/` and `schema/`.
 * @returns {string[]} One line per problem; empty when everything matches.
 */
export function checkDefinitions(root) {
  const problems = definitionProblems(readDefinitions(root));
  if (problems.length > 0) return problems;
  for (const [file, expected] of Object.entries(buildSchemas(root))) {
    if (!existsSync(resolve(root, file)) || readFileSync(resolve(root, file), 'utf8') !== expected) {
      problems.push(`${file}: does not match definitions/; run "node scripts/build/emit-definitions.mjs" and commit the result`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkDefinitions(ROOT);
  if (problems.length > 0) {
    console.error(`check-definitions: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
  } else {
    console.log('check-definitions: OK (4 schemas and 2 Go copies match definitions/)');
  }
}
