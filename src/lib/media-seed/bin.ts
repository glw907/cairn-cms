#!/usr/bin/env node
// cairn-media-seed: seeds wrangler's LOCAL R2 simulator with every media-library object from a
// deployed cairn site, so `vite dev` serves real media with no deploy. A thin shell over
// index.ts (where the unit tests reach the logic): parse the flags, resolve the bucket name off
// the site's wrangler config, read the committed media manifest, run the sync, print the
// summary. Bad flags or an unresolved bucket exit 2; a failed item exits 1; a clean run exits 0.
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename, sep } from 'node:path';
import { readR2Buckets } from '../doctor/wrangler-config.js';
import { normalizeManifest, parseArgs, resolveBucket, stripControlChars, USAGE } from './assemble.js';
import { seedMedia } from './run.js';
import type { SeedDeps } from './run.js';

/** Whether `candidate` is `boundary` itself or lives under it, comparing two already-resolved paths. */
function isWithin(candidate: string, boundary: string): boolean {
  return candidate === boundary || candidate.startsWith(boundary + sep);
}

/**
 * `path`'s real, symlink-resolved location. `path` need not exist yet (a temp file about to be
 *  written, a manifest that may be absent): the nearest existing ancestor is realpath'd, and any
 *  not-yet-existing trailing segments are reattached unresolved, since nothing can symlink from a
 *  path that does not exist. Lets a containment check see through a symlink planted anywhere
 *  between the nominal path and its real location, not only through a literal `..` segment.
 */
function realpathNearestAncestor(path: string): string {
  try {
    return realpathSync(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    const parent = dirname(path);
    if (parent === path) return path;
    return join(realpathNearestAncestor(parent), basename(path));
  }
}

/** The real filesystem and subprocess deps: a fresh temp dir per run, and the local wrangler CLI. */
export function realDeps(cwd: string): SeedDeps {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-media-seed-'));
  return {
    fetch: globalThis.fetch,
    writeTempFile(name, bytes) {
      const file = join(dir, name);
      // join() does not contain: a name built from a hostile manifest hash/ext (enough ".."
      // segments) walks the result outside dir. normalizeManifest already screens the manifest
      // before an item reaches here; this is defense in depth for a caller that does not.
      if (!isWithin(file, dir)) {
        throw new Error(`cairn-media-seed: refusing to write outside the temp directory: ${name}`);
      }
      // The textual check above trusts the nominal path; a symlink planted inside dir (or under
      // one of its own ancestors) can still resolve outside it at write time, so the real,
      // resolved location is checked too. dir was just created by mkdtempSync, so it exists.
      if (!isWithin(realpathNearestAncestor(file), realpathSync(dir))) {
        throw new Error(`cairn-media-seed: refusing to write outside the temp directory: ${name}`);
      }
      writeFileSync(file, bytes);
      return file;
    },
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
    putObject(bucket, key, filePath, contentType) {
      execFileSync(
        'npx',
        [
          'wrangler',
          'r2',
          'object',
          'put',
          `${bucket}/${key}`,
          '--file',
          filePath,
          '--local',
          '--content-type',
          contentType,
        ],
        { cwd, stdio: 'pipe' }
      );
    },
  };
}

async function main(): Promise<void> {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
    return;
  }

  if ('help' in args) {
    console.log(USAGE);
    return;
  }

  const cwd = process.cwd();
  const readFileUnderCwd = async (relPath: string): Promise<string | null> => {
    // resolve() does not contain: a relPath carrying enough ".." segments walks the result
    // outside cwd, so every read is checked against cwd regardless of where relPath came from.
    const resolved = resolve(cwd, relPath);
    if (!isWithin(resolved, cwd)) {
      throw new Error(`cairn-media-seed: refusing to read outside the project directory: ${relPath}`);
    }
    // The textual check above trusts the nominal path; a symlink under cwd can still resolve
    // outside it, so the real, resolved location is checked too. cwd always exists.
    if (!isWithin(realpathNearestAncestor(resolved), realpathSync(cwd))) {
      throw new Error(`cairn-media-seed: refusing to read outside the project directory: ${relPath}`);
    }
    try {
      return await readFile(resolved, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  };

  const r2Buckets = await readR2Buckets(readFileUnderCwd);
  const bucket = resolveBucket(args.bucket, r2Buckets);
  if ('error' in bucket) {
    console.error(`cairn-media-seed: ${bucket.error}`);
    process.exitCode = 2;
    return;
  }

  const manifestText = await readFileUnderCwd('src/content/.cairn/media.json');
  let manifestJson: unknown = null;
  if (manifestText !== null) {
    try {
      manifestJson = JSON.parse(manifestText);
    } catch {
      manifestJson = null;
    }
  }
  const items = normalizeManifest(manifestJson);

  const result = await seedMedia(items, args.from, args.headers, bucket.value, realDeps(cwd));
  for (const failure of result.failures) {
    // stripControlChars is defense in depth: normalizeManifest already screens the slug shape
    // that reaches seedMedia through the manifest, but a printed value gets no second chance.
    console.error(`FAILED ${stripControlChars(failure.slug)}: ${failure.message}`);
  }
  console.log(
    `cairn-media-seed: ${result.ok} synced, ${result.failed} failed, of ${result.total} manifest entries`
  );
  process.exitCode = result.failed > 0 ? 1 : 0;
}

await main();
