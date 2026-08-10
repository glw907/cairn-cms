// Parse the create-cairn-site CLI's argv into a plain answers object. node:util's parseArgs
// does the token-level work; this module adds the flag-to-key mapping and a fail-loud error
// that names the offending flag, since the raw ERR_PARSE_ARGS_UNKNOWN_OPTION message is not
// guaranteed to carry it in every Node release.
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
    const flag = argv.find((token) => token.startsWith('-')) ?? '(unknown)';
    throw new Error(
      `create-cairn-site: unrecognized option ${flag}. Run with --version to check the install, or see the README for the supported flags.`,
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
