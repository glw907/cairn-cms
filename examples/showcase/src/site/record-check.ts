// The build-time check of `cairn-site.json`, run by the plugin in `vite.config.ts` before
// `cairn.config.ts` loads. Ajv generates code with `new Function`, which a Worker refuses, so this
// module belongs to the build and never to the Worker bundle.
import { existsSync, readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

/**
 * Check a site record against its schema.
 * @param recordFile absolute path of the site's `cairn-site.json`
 * @param schemaFile absolute path of the engine's `cairn-site-1.schema.json`
 * @returns one line naming the first problem, or `undefined` when the record is valid
 */
export function checkSiteRecord(recordFile: string, schemaFile: string): string | undefined {
  if (!existsSync(recordFile)) return `cairn-site.json: not found at ${recordFile}`;
  let record: unknown;
  try {
    record = JSON.parse(readFileSync(recordFile, 'utf8'));
  } catch (error) {
    return `cairn-site.json: not valid JSON (${error instanceof Error ? error.message : String(error)})`;
  }
  const schema = JSON.parse(readFileSync(schemaFile, 'utf8')) as object;
  const validate = new Ajv2020({ allErrors: false, strict: false }).compile(schema);
  if (validate(record)) return undefined;
  const first = validate.errors?.[0];
  if (first === undefined) return 'cairn-site.json: does not match its rules';
  // Ajv reports a missing or unknown key at its parent, so the key joins the path here.
  const key =
    first.keyword === 'required'
      ? (first.params as { missingProperty: string }).missingProperty
      : first.keyword === 'additionalProperties'
        ? (first.params as { additionalProperty: string }).additionalProperty
        : '';
  const field = [...first.instancePath.split('/').filter(Boolean), ...(key === '' ? [] : [key])].join('.');
  return `cairn-site.json: ${field === '' ? '(root)' : field} ${first.message ?? 'is invalid'}`;
}
