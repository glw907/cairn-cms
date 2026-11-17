// cairn-cms: the site-record page's field-list gate. It walks the record schema's properties as
// dotted paths (`deploy.github.appId`) and the field table on docs/admin/site-record.md, and fails
// naming each field one has and the other lacks. A property that holds further properties is a
// group, not a field: only its leaves need a row.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCHEMA = 'schema/cairn-site-1.schema.json';
const PAGE = 'docs/admin/site-record.md';

/**
 * The dotted path of every leaf property in a schema.
 * @param {{ properties?: Record<string, any> }} node
 * @param {string} [prefix]
 * @returns {string[]}
 */
export function schemaFields(node, prefix = '') {
  const paths = [];
  for (const [key, child] of Object.entries(node.properties ?? {})) {
    const path = prefix + key;
    if (child.properties) paths.push(...schemaFields(child, `${path}.`));
    else paths.push(path);
  }
  return paths;
}

/**
 * The dotted path in the first cell of every table row that opens on a code-formatted path.
 * @param {string} markdown
 * @returns {string[]}
 */
export function pageFields(markdown) {
  const paths = [];
  for (const line of markdown.split('\n')) {
    const match = /^\|\s*`([A-Za-z][\w.]*)`\s*\|/.exec(line);
    if (match) paths.push(match[1]);
  }
  return paths;
}

/**
 * One problem line per field the schema has and the page lacks, and per row the page has and the
 * schema lacks.
 * @param {{ properties?: Record<string, any> }} schema
 * @param {string} markdown
 * @returns {string[]}
 */
export function checkSiteRecordPage(schema, markdown) {
  const inSchema = schemaFields(schema);
  const onPage = pageFields(markdown);
  const problems = [];
  for (const path of inSchema) {
    if (!onPage.includes(path)) problems.push(`${path}: in ${SCHEMA}, no row in ${PAGE}`);
  }
  for (const path of onPage) {
    if (!inSchema.includes(path)) problems.push(`${path}: a row in ${PAGE}, not in ${SCHEMA}`);
  }
  return problems;
}

function main() {
  const schema = JSON.parse(readFileSync(resolve(ROOT, SCHEMA), 'utf8'));
  const problems = checkSiteRecordPage(schema, readFileSync(resolve(ROOT, PAGE), 'utf8'));
  if (problems.length > 0) {
    console.error(`check-site-record-page: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(`check-site-record-page: OK (${schemaFields(schema).length} fields, each with a row in ${PAGE})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
