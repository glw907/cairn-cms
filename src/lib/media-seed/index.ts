// cairn-media-seed's barrel: the flag parser, the manifest and bucket resolution, and the sync
// loop, behind one import path for the bin and its tests. Internal only, like cairn-doctor's
// barrel: no public package subpath exports it.
export {
  parseArgs,
  normalizeManifest,
  contentTypeForExt,
  downloadUrl,
  resolveBucket,
  USAGE,
} from './assemble.js';
export type { MediaSeedArgs, MediaSeedHelpArgs, SeedItem, BucketResolution } from './assemble.js';
export { seedMedia } from './run.js';
export type { SeedDeps, SeedFailure, SeedResult } from './run.js';
