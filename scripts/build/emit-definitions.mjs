// cairn-cms: writes the closed id lists in definitions/ into the schemas that name them.
// definitions/kinds.json and definitions/features.json are the one source for the kind ids and the
// feature ids; each schema carries a generated `$defs` entry per list, and every property that
// names an id refers to that entry, so no hand text sits inside the generated part.
// check-definitions.mjs regenerates into memory and fails on any byte that differs.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The schemas that carry a generated list, and the `$defs` entries each one gets. A new schema
 * that names kinds or features is appended here and nowhere else.
 */
export const TARGETS = [
  { file: 'schema/cairn-catalog-1.schema.json', defs: ['kindId'] },
  { file: 'schema/cairn-set-1.schema.json', defs: ['kindId'] },
  { file: 'schema/cairn-theme-1.schema.json', defs: ['kindId', 'featureId'] },
];

const SOURCES = { kindId: 'kinds', featureId: 'features' };

/**
 * Reads both definition files under a root.
 * @param {string} root Directory that holds `definitions/`.
 */
export function readDefinitions(root) {
  const read = (name) => JSON.parse(readFileSync(resolve(root, 'definitions', `${name}.json`), 'utf8'));
  return { kinds: read('kinds').kinds, features: read('features').features };
}

/**
 * Lists every fault in the definitions: a repeated id, a default feature that no feature entry
 * declares, and a feature that names a kind the kinds file does not list.
 * @param {{ kinds: { id: string, defaultFeatures?: string[] }[], features: { id: string, kinds?: string[] }[] }} definitions
 * @returns {string[]} One line per fault; empty when the data is sound.
 */
export function definitionProblems({ kinds, features }) {
  const problems = [];
  const repeated = (items, file, noun) => {
    const seen = new Set();
    for (const { id } of items) {
      if (seen.has(id)) problems.push(`definitions/${file}.json: ${noun} id "${id}" appears more than once`);
      seen.add(id);
    }
  };
  repeated(kinds, 'kinds', 'kind');
  repeated(features, 'features', 'feature');
  const featureIds = new Set(features.map((feature) => feature.id));
  const kindIds = new Set(kinds.map((kind) => kind.id));
  for (const kind of kinds) {
    for (const id of kind.defaultFeatures ?? []) {
      if (!featureIds.has(id)) {
        problems.push(`definitions/kinds.json: kind "${kind.id}" names default feature "${id}", which definitions/features.json doesn't list`);
      }
    }
  }
  for (const feature of features) {
    for (const id of feature.kinds ?? []) {
      if (!kindIds.has(id)) {
        problems.push(`definitions/features.json: feature "${feature.id}" names kind "${id}", which definitions/kinds.json doesn't list`);
      }
    }
  }
  return problems;
}

/**
 * One generated `$defs` entry. An empty list is `{ not: {} }`, since Ajv refuses `enum: []` and
 * `not: {}` still rejects every value.
 */
function defEntry(def, definitions) {
  const source = SOURCES[def];
  const ids = definitions[source].map((entry) => entry.id);
  const description = `Generated from definitions/${source}.json by scripts/build/emit-definitions.mjs.`;
  return ids.length === 0 ? { description, not: {} } : { description, enum: ids };
}

/**
 * Regenerates every target schema in memory, without touching disk.
 * @param {string} root Directory that holds `definitions/` and `schema/`.
 * @returns {Record<string, string>} Repo-relative schema path to its full file contents.
 */
export function buildSchemas(root) {
  const definitions = readDefinitions(root);
  const out = {};
  for (const { file, defs } of TARGETS) {
    const schema = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
    // An existing `$defs` keeps its place and its other entries; a schema with none gets it last.
    schema.$defs = schema.$defs ?? {};
    for (const def of defs) schema.$defs[def] = defEntry(def, definitions);
    out[file] = `${JSON.stringify(schema, null, 2)}\n`;
  }
  return out;
}

/**
 * Writes the regenerated schemas under a root. Refuses unsound definitions.
 * @returns {string[]} The files written.
 */
export function writeSchemas(root) {
  const problems = definitionProblems(readDefinitions(root));
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const schemas = buildSchemas(root);
  for (const [file, contents] of Object.entries(schemas)) writeFileSync(resolve(root, file), contents);
  return Object.keys(schemas);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const file of writeSchemas(ROOT)) console.log(`emit-definitions: wrote ${file}`);
}
