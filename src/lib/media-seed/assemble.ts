// cairn-media-seed's assembly: the flag parser, the manifest normalizer, the download URL
// derivation, and the bucket-name resolution, all pure functions so the bin stays a thin
// wrapper, the same split cairn-doctor's assemble.ts uses.
import { parseMediaManifest } from '../media/manifest.js';
import type { R2BucketEntry } from '../doctor/wrangler-config.js';

const USAGE =
  "Usage: cairn-media-seed --from <base-url> [--header 'Name: value']... [--bucket <name>]";

/** The parsed CLI flags: the deployed site to download from, any auth headers, and an optional explicit bucket name. */
export interface MediaSeedArgs {
  from: string;
  headers: Record<string, string>;
  bucket?: string;
}

/**
 * Parse the bin's argv. Throws with a usage line on a missing `--from`, an unknown flag, a
 *  flag with no value, or a `--header` that is not `Name: value`. A later `--header` for the
 *  same name overwrites an earlier one.
 */
export function parseArgs(argv: string[]): MediaSeedArgs {
  let from: string | undefined;
  let bucket: string | undefined;
  const headers: Record<string, string> = {};

  for (let i = 0; i < argv.length; ) {
    const flag = argv[i];
    if (flag === '--from' || flag === '--bucket' || flag === '--header') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${flag} needs a value\n${USAGE}`);
      }
      if (flag === '--from') from = value;
      else if (flag === '--bucket') bucket = value;
      else {
        const colon = value.indexOf(':');
        if (colon <= 0) throw new Error(`--header must be 'Name: value', got "${value}"\n${USAGE}`);
        headers[value.slice(0, colon).trim()] = value.slice(colon + 1).trim();
      }
      i += 2;
      continue;
    }
    throw new Error(`unknown argument ${flag}\n${USAGE}`);
  }

  if (from === undefined) throw new Error(`--from is required\n${USAGE}`);
  const args: MediaSeedArgs = { from, headers };
  if (bucket !== undefined) args.bucket = bucket;
  return args;
}

/** One manifest row this tool needs: the fields that build the download URL and the R2 key. */
export interface SeedItem {
  slug: string;
  hash: string;
  ext: string;
}

/**
 * Normalize a parsed `media.json` body (or `null` for a missing file) into the rows this tool
 *  seeds. A row missing `slug`, `hash`, or `ext` is dropped rather than failing the whole run,
 *  the same per-item tolerance the sync loop itself uses.
 */
export function normalizeManifest(json: unknown): SeedItem[] {
  const manifest = parseMediaManifest(json);
  const items: SeedItem[] = [];
  for (const entry of Object.values(manifest)) {
    const { slug, hash, ext } = entry as { slug?: unknown; hash?: unknown; ext?: unknown };
    if (typeof slug === 'string' && typeof hash === 'string' && typeof ext === 'string') {
      items.push({ slug, hash, ext });
    }
  }
  return items;
}

/**
 * The deployed site's public delivery URL for one manifest row: `<from>/media/<slug>.<hash>.<ext>`,
 *  the slug form the media route serves. A trailing slash on `from` is tolerated.
 */
export function downloadUrl(from: string, item: SeedItem): string {
  return `${from.replace(/\/+$/, '')}/media/${item.slug}.${item.hash}.${item.ext}`;
}

/** The delivery content types by extension, matching what the upload pipeline stores. */
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

/**
 * The content type to store with a seeded object, so local dev serves the same `Content-Type`
 *  production does (an object put with none falls back to the route's octet-stream default).
 */
export function contentTypeForExt(ext: string): string {
  return CONTENT_TYPES[ext.toLowerCase()] ?? 'application/octet-stream';
}

/** The resolved R2 bucket name, or the reason it could not be resolved. */
export type BucketResolution = { value: string } | { error: string };

/**
 * Resolve the R2 bucket name to write into: an explicit `--bucket` flag always wins; failing
 *  that, exactly one declared `r2_buckets` entry with a `bucket_name` is used; any other shape
 *  (no config, no entries, several entries, or one entry with no `bucket_name`) is an error
 *  naming `--bucket` as the fix.
 */
export function resolveBucket(
  bucketFlag: string | undefined,
  r2Buckets: R2BucketEntry[] | null
): BucketResolution {
  if (bucketFlag !== undefined) return { value: bucketFlag };
  const buckets = r2Buckets ?? [];
  if (buckets.length === 0) {
    return {
      error: 'no r2_buckets declared in wrangler.jsonc or wrangler.toml (or the file is missing); pass --bucket <name>',
    };
  }
  if (buckets.length > 1) {
    const names = buckets.map((b) => b.binding).join(', ');
    return {
      error: `wrangler config declares ${buckets.length} r2_buckets bindings (${names}); pass --bucket <name> to pick one`,
    };
  }
  const [only] = buckets;
  if (only.bucketName === undefined) {
    return {
      error: `r2_buckets binding "${only.binding}" has no bucket_name declared; pass --bucket <name>`,
    };
  }
  return { value: only.bucketName };
}
