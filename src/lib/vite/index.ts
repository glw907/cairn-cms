// cairn-cms: the public `/vite` barrel. Anything proposed here must be a plugin a site wires into
// its own vite.config.ts; only the cairnManifest plugin and its options type are proven surface,
// since every consumer site imports exactly these two from there. The write, verify, and derive
// machinery the plugin shares with the cairn-manifest and cairn-doctor bins lives in
// `./internal.js`, which those bins and their unit tests import by relative path, never through
// this subpath: a build-time helper that is not itself a Vite plugin belongs internal, not here.
export { cairnManifest } from './internal.js';
export type { CairnManifestOptions } from './internal.js';
