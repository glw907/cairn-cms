#!/usr/bin/env node
// cairn-media-seed: seeds wrangler's LOCAL R2 simulator with every media-library object from a
// deployed cairn site, so `vite dev` serves real media with no deploy. A thin shell over
// index.ts (where the unit tests reach the logic): parse the flags, resolve the bucket name off
// the site's wrangler config, read the committed media manifest, run the sync, print the
// summary. Bad flags or an unresolved bucket exit 2; a failed item exits 1; a clean run exits 0.
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readR2Buckets } from '../doctor/wrangler-config.js';
import { normalizeManifest, parseArgs, resolveBucket } from './assemble.js';
import { seedMedia } from './run.js';
import type { SeedDeps } from './run.js';

/** The real filesystem and subprocess deps: a fresh temp dir per run, and the local wrangler CLI. */
function realDeps(cwd: string): SeedDeps {
  const dir = mkdtempSync(join(tmpdir(), 'cairn-media-seed-'));
  return {
    fetch: globalThis.fetch,
    writeTempFile(name, bytes) {
      const file = join(dir, name);
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

  const cwd = process.cwd();
  const readFileUnderCwd = async (relPath: string): Promise<string | null> => {
    try {
      return await readFile(resolve(cwd, relPath), 'utf8');
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
    console.error(`FAILED ${failure.slug}: ${failure.message}`);
  }
  console.log(
    `cairn-media-seed: ${result.ok} synced, ${result.failed} failed, of ${result.total} manifest entries`
  );
  process.exitCode = result.failed > 0 ? 1 : 0;
}

await main();
