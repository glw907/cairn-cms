// cairn-cms: the target-stack gate. `docs/reference/supported-toolchain.md` names an exact
// version for every part of the stack a cairn site depends on, so a developer or an agent reading
// the page gets a real target rather than a stale guess. This gate is what keeps that promise
// honest: it derives each expected value from the same source the number actually comes from (the
// root package.json's own version, engines, and peer ranges; the showcase's package.json and
// wrangler.jsonc, the source the public template is emitted from) and fails when the page's table
// disagrees. A cell can only go stale silently if this gate stops running.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PAGE_PATH = resolve(ROOT, 'docs/reference/supported-toolchain.md');

/**
 * Pull the `Target today` cell for a named row out of the target-stack table. The row label is
 * matched literally against the table's first column, so a prose rewrite of the row's other cells
 * cannot silently detach the check from the row it names. Markdown emphasis around the label itself
 * is not stripped; a label passed here must appear in the table exactly as written.
 * @param {string} pageText the page's raw Markdown
 * @param {string} label the row's exact first-column text, for example "Node, on your machine"
 * @returns {string} the row's `Target today` cell, with inline code spans and emphasis stripped
 */
export function targetCell(pageText, label) {
  const rowPattern = new RegExp(
    `^\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|([^|]*)\\|`,
    'm'
  );
  const match = pageText.match(rowPattern);
  if (!match) {
    throw new Error(`check-target-stack: no table row found for "${label}"`);
  }
  return match[1].trim().replace(/^`|`$/g, '');
}

/**
 * Strip `//` line comments from a JSONC source, leaving everything else, including strings that
 * contain a literal `//` inside quotes, untouched. wrangler.jsonc carries no block comments today,
 * so this narrow pass is enough to make `JSON.parse` accept it.
 * @param {string} jsoncText raw JSONC text
 * @returns {string} JSON text
 */
export function stripJsonComments(jsoncText) {
  return jsoncText
    .split('\n')
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i - 1] !== '\\') inString = !inString;
        if (!inString && char === '/' && line[i + 1] === '/') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

/**
 * Compute every expected `Target today` value from the sources the page's table claims to reflect.
 * @param {{ root?: string }} [options]
 * @returns {Record<string, string>} row label to expected cell text
 */
export function expectedTargets({ root = ROOT } = {}) {
  const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  // examples/showcase is the source the public Waymark template is emitted from
  // (packages/create-cairn-site/scripts/emit-template-dir.mjs), so it, not the generated
  // templates/waymark/ copy, is what "the template source" means here.
  const templatePkg = JSON.parse(readFileSync(resolve(root, 'examples/showcase/package.json'), 'utf8'));
  const wranglerJsonc = readFileSync(resolve(root, 'examples/showcase/wrangler.jsonc'), 'utf8');
  const wrangler = JSON.parse(stripJsonComments(wranglerJsonc));

  return {
    'The cairn package': rootPkg.version,
    'Node, on your machine': rootPkg.engines.node,
    'SvelteKit': rootPkg.peerDependencies['@sveltejs/kit'],
    'Svelte': rootPkg.peerDependencies.svelte,
    'Wrangler': templatePkg.devDependencies.wrangler,
    '`@sveltejs/adapter-cloudflare`': templatePkg.devDependencies['@sveltejs/adapter-cloudflare'],
    'The Workers `compatibility_date`': wrangler.compatibility_date,
    'TypeScript': templatePkg.devDependencies.typescript
  };
}

/**
 * Compare the page's table against the expected values, in one pass.
 * @param {string} pageText the page's raw Markdown
 * @param {Record<string, string>} expected row label to expected cell text
 * @returns {string[]} one message per mismatched row, empty when every row matches
 */
export function checkTargetStack(pageText, expected) {
  const errors = [];
  for (const [label, expectedValue] of Object.entries(expected)) {
    const actual = targetCell(pageText, label);
    if (actual !== expectedValue) {
      errors.push(`"${label}": table says "${actual}", source says "${expectedValue}"`);
    }
  }
  return errors;
}

function main() {
  const pageText = readFileSync(PAGE_PATH, 'utf8');
  const expected = expectedTargets();
  const errors = checkTargetStack(pageText, expected);
  if (errors.length > 0) {
    console.error('check-target-stack: the target-stack table has drifted from its sources:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`check-target-stack: OK (${Object.keys(expected).length} rows match)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
