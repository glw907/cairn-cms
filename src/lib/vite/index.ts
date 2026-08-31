// cairn-cms: the public `/vite` barrel. Anything proposed here must be a plugin a site wires into
// its own vite.config.ts; only the cairnManifest plugin and its options type are proven surface,
// since every consumer site imports exactly these two from there. The write, verify, and derive
// machinery the plugin shares with the cairn-manifest and cairn-doctor bins lives in
// `./internal.js`, which those bins and their unit tests import by relative path, never through
// this subpath: a build-time helper that is not itself a Vite plugin belongs internal, not here.
//
// Interop carve-out (`convention-interop-carve-out`): `cairnManifest`'s config bag stays named
// `CairnManifestOptions`, not `CairnManifestConfig`. Vite's own plugin-factory convention names
// every first-party and community plugin's options type `*Options` (`vite-plugin-*`'s own
// idiom, and Vite's own bundled plugins), so a site wiring this plugin alongside every other
// entry in its `plugins: []` array reads one consistent vocabulary; the host ecosystem's
// convention wins over cairn's own `*Config` grammar on this interop surface.
export { cairnManifest } from './internal.js';
export type { CairnManifestOptions } from './internal.js';
