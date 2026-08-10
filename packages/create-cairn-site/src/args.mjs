// Parse the create-cairn-site CLI's argv into a plain answers object. node:util's parseArgs
// does the token-level work; this module adds the flag-to-key mapping and a fail-loud error
// that names the offending flag. Node's own message already quotes that flag and distinguishes
// an unknown option from a missing or surplus value, so this wraps it rather than re-deriving
// it: scanning argv for the first dash-token names the wrong flag whenever a valid option
// precedes the bad one.
import { parseArgs as nodeParseArgs } from 'node:util';

const OPTIONS = {
  'dry-run': { type: 'boolean', default: false },
  yes: { type: 'boolean', default: false },
  name: { type: 'string' },
  tagline: { type: 'string' },
  'brand-color': { type: 'string' },
  dir: { type: 'string' },
  version: { type: 'boolean', default: false },
};

/**
 * Parse the CLI's argv into the answers the scaffold flow consumes.
 * @param {string[]} argv the argument vector, without the node/script entries
 * @returns {{ dryRun: boolean, yes: boolean, name?: string, tagline?: string, brandColor?: string, dir?: string, version: boolean }}
 *  the parsed flags; the string options are undefined, not empty, when absent
 */
export function parseArgs(argv) {
  let values;
  try {
    ({ values } = nodeParseArgs({ args: argv, options: OPTIONS, strict: true }));
  } catch (cause) {
    throw new Error(
      `create-cairn-site: ${cause.message}. See the README for the supported flags.`,
      { cause },
    );
  }
  return {
    dryRun: values['dry-run'] ?? false,
    yes: values.yes ?? false,
    name: values.name,
    tagline: values.tagline,
    brandColor: values['brand-color'],
    dir: values.dir,
    version: values.version ?? false,
  };
}
