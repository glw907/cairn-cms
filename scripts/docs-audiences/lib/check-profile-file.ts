// cairn-cms: reads and checks one docs/internal/audiences/<profile>.md file end to end, the one
// entry point render-profile.ts and the schema test's real-profile loop both call, so a caller
// naming many files at once can tell which one failed without re-deriving the path itself.
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import matter from 'gray-matter';
import { validateAgainstSchema, type JsonSchema } from './profile-schema.js';
import { unresolvedExemplarIds } from './exemplar-manifest.js';

/**
 * The result of {@link checkProfileFile}: every check violation, and the parsed frontmatter when
 * there is one to hand back.
 */
export interface ProfileCheckResult {
  /** One error string per violation, each prefixed with the checked file's path; empty means the file passes every check. */
  errors: string[];
  /** The parsed frontmatter, present whenever it parsed (even if a later check on it fails); absent only when the frontmatter itself failed to parse. */
  data?: Record<string, unknown>;
}

/**
 * Reads the profile markdown file at `path`, then runs every check a profile must pass: its
 * frontmatter parses, it conforms to `schema`, its `id` matches the file's own basename, and its
 * `exemplars` ids all resolve against `manifestText`. A caller that also needs the parsed
 * frontmatter (to render it, say) reads it off the result instead of parsing the file again. A
 * frontmatter parse failure (broken YAML) short-circuits the other checks, since there is no
 * parsed data left to run them against.
 */
export function checkProfileFile(path: string, schema: JsonSchema, manifestText: string): ProfileCheckResult {
  let data: Record<string, unknown>;
  try {
    // gray-matter caches a parse by its exact input string, keyed off the module-level
    // `matter.cache` object, and the cached entry survives a parse that later throws: an
    // options object as the second argument is the only thing that skips that cache (its own
    // source consults the cache only `if (!options)`), so passing one here is required, not
    // optional, or a broken-YAML fixture already parsed once elsewhere in the same process
    // stops throwing on every later call.
    ({ data } = matter(readFileSync(resolve(path), 'utf8'), {}));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { errors: [`${path}: frontmatter does not parse: ${message}`] };
  }

  const errors = validateAgainstSchema(data, schema).map((error) => `${path}: ${error}`);

  const expectedId = basename(path, '.md');
  if (typeof data.id === 'string' && data.id !== expectedId) {
    errors.push(`${path}: id "${data.id}" does not match file name "${expectedId}"`);
  }

  if (Array.isArray(data.exemplars)) {
    errors.push(
      ...unresolvedExemplarIds(data.exemplars as string[], manifestText).map(
        (id) => `${path}: exemplar id "${id}" has no manifest entry`,
      ),
    );
  }

  return { errors, data };
}
