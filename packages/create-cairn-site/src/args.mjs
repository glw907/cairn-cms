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
  description: { type: 'string' },
  'brand-color': { type: 'string' },
  dir: { type: 'string' },
  version: { type: 'boolean', default: false },
  'app-name': { type: 'string' },
  org: { type: 'string' },
  'repo-name': { type: 'string' },
  github: { type: 'boolean', default: false },
  'start-over': { type: 'boolean', default: false },
  'owner-email': { type: 'string' },
  deploy: { type: 'boolean', default: false },
  'sign-in': { type: 'boolean', default: false },
};

/**
 * Parse the CLI's argv into the answers the scaffold flow consumes.
 * @param {string[]} argv the argument vector, without the node/script entries
 * @returns {{ dryRun: boolean, yes: boolean, name?: string, description?: string, brandColor?: string,
 *  dir?: string, version: boolean, appName?: string, org?: string, repoName?: string, github: boolean,
 *  startOver: boolean, ownerEmail?: string, deploy: boolean, signIn: boolean }} the parsed flags; the
 *  string options are undefined, not empty, when absent
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
  // The boolean flags carry their default in OPTIONS, so parseArgs has already filled them in.
  return {
    dryRun: values['dry-run'],
    yes: values.yes,
    name: values.name,
    description: values.description,
    brandColor: values['brand-color'],
    dir: values.dir,
    version: values.version,
    appName: values['app-name'],
    org: values.org,
    repoName: values['repo-name'],
    github: values.github,
    startOver: values['start-over'],
    ownerEmail: values['owner-email'],
    deploy: values.deploy,
    signIn: values['sign-in'],
  };
}
