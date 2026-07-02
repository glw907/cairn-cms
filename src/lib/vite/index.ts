// cairn-cms: the public `/vite` barrel. Only the cairnManifest plugin and its options type are
// proven surface: every consumer site imports exactly these two from vite.config.ts. The write,
// verify, and derive machinery the plugin shares with the cairn-manifest and cairn-doctor bins lives
// in `./internal.js`, which those bins and their unit tests import by relative path, never through
// this subpath.
export { cairnManifest } from './internal.js';
export type { CairnManifestOptions } from './internal.js';
