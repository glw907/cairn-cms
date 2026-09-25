#!/usr/bin/env -S npx tsx
/**
 * The freeze manifest: a sha256 over every score-affecting input the docs-reader instrument
 * carries once tuning stops, so a gated batch can refuse to run against a drifted input.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/freeze.ts build --tag NAME --out FILE
 *     --image ID --cli-version VERSION
 *     --model reader=ID --model catchJudge=ID --model adjudicator=ID --model agreement=ID
 *     [--job ID=COMMIT ...] [--held-out PATH=COMMIT ...] [--seed NAME=VALUE ...]
 *   npx tsx scripts/docs-readers/freeze.ts verify --manifest FILE --image ID --cli-version VERSION
 *     [--job ID=COMMIT ...]
 *
 * `--build` and `--verify` are accepted as aliases of the `build` and `verify` subcommands, so a
 * caller that always passes flags (the plan's own `freeze.ts --verify`) does not need to know the
 * bare-word form.
 *
 * `build` hashes every file git would track under `scripts/docs-readers/` except `post-freeze/`,
 * writes the manifest, and prints its path and the sha256 of its own bytes (the value the runner
 * stamps into a gated batch's reports). `verify` recomputes the same tree hash and checks it, the
 * image id, the CLI version, and any given job commits against the manifest, printing every
 * drifted input and exiting 1 when one differs.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The tag the freeze commit carries. */
export const FREEZE_TAG = 'docs-reset-1b-freeze';

/** The frozen model ids the reader and each judge class run under. */
export interface FrozenModels {
  reader: string;
  catchJudge: string;
  adjudicator: string;
  agreement: string;
}

/** The freeze manifest: every score-affecting input, by sha256. */
export interface Manifest {
  tag: string;
  /** Every file git tracks under `scripts/docs-readers/` except `post-freeze/`, by sha256, sorted by path. */
  files: Record<string, string>;
  imageId: string;
  cliVersion: string;
  models: FrozenModels;
  /** Each job's pinned page commit, by job id. */
  jobs: Record<string, string>;
  /** The held-out defects' pre-fix pins, by page path. */
  heldOutPins: Record<string, string>;
  /** Every seed the instrument fixes; numeric text is kept as a number, anything else as a string (the agreement sample's ordering label, `docs-reset-1b-agreement`, is one). */
  seeds: Record<string, number | string>;
}

/**
 * Hash a byte buffer or string.
 * @param bytes - The content to hash.
 * @returns Its sha256, as hex.
 */
export function hashBytes(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Hash a file's bytes.
 * @param path - The file to read.
 * @returns Its sha256, as hex.
 * @throws When the file does not exist.
 */
export function hashFile(path: string): string {
  return hashBytes(readFileSync(path));
}

/**
 * Every file git would commit under a directory if asked right now, tracked or not, except
 * anything under `post-freeze/`: `--cached` alone would miss an untracked file (one a class JSON
 * loader would still read straight off disk), so this also lists `--others`, bounded by
 * `--exclude-standard` to the files git itself would not ignore. A listed path missing from disk
 * (removed from the working tree but still in the index) is dropped here, so a caller hashing
 * these paths never has to handle a path that does not exist.
 * @param root - The directory to list, normally `scripts/docs-readers`.
 * @returns Paths relative to `root`, sorted.
 */
export function gitTrackedFiles(root: string): string[] {
  const out = execFileSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  return out
    .split('\n')
    .filter((line) => line.trim() !== '')
    .filter((path) => path !== 'post-freeze' && !path.startsWith('post-freeze/'))
    .filter((path) => existsSync(join(root, path)))
    .sort();
}

/**
 * Build the manifest: hash every file `listFiles` names, relative to `root`. `tag` is the freeze
 * tag; `imageId` and `cliVersion` pin the reader image and the CLI version it bakes in; `models`
 * pins the reader's and each judge class's frozen model id; `jobs` pins each job's page commit by
 * job id; `heldOutPins` pins the held-out defects' pre-fix commits by page path; `seeds` pins
 * every seed the instrument fixes; `listFiles` returns the paths to hash, relative to `root`,
 * defaulting to {@link gitTrackedFiles}.
 * @returns The manifest, with `files` sorted by path.
 */
export function buildManifest({
  tag,
  root,
  imageId,
  cliVersion,
  models,
  jobs,
  heldOutPins,
  seeds,
  listFiles = gitTrackedFiles,
}: {
  tag: string;
  root: string;
  imageId: string;
  cliVersion: string;
  models: FrozenModels;
  jobs: Record<string, string>;
  heldOutPins: Record<string, string>;
  seeds: Record<string, number | string>;
  listFiles?: (root: string) => string[];
}): Manifest {
  const files: Record<string, string> = {};
  for (const path of [...listFiles(root)].sort()) {
    files[path] = hashFile(join(root, path));
  }
  return { tag, files, imageId, cliVersion, models, jobs, heldOutPins, seeds };
}

/**
 * Write a manifest to disk.
 * @param manifest - The manifest to serialize.
 * @param path - Where to write it.
 * @returns The sha256 of the bytes written, the value a gated batch's `freeze.manifestHash` carries.
 */
export function writeManifest(manifest: Manifest, path: string): { hash: string } {
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(path, bytes);
  return { hash: hashBytes(bytes) };
}

/**
 * Read a manifest from disk.
 * @param path - The manifest file.
 * @returns The parsed manifest and the sha256 of its raw bytes.
 * @throws When the file does not exist or does not parse.
 */
export function loadManifest(path: string): { manifest: Manifest; hash: string } {
  const text = readFileSync(path, 'utf8');
  return { manifest: JSON.parse(text) as Manifest, hash: hashBytes(text) };
}

/**
 * Check a tree, an image, a CLI version, and a batch's job commits against a manifest. `manifest`
 * is the frozen manifest to check against; `root` is the directory its files are relative to;
 * `imageId` and `cliVersion` are the current reader image's digest and the current CLI version;
 * `jobs` are the batch's own job commits to check, by job id (an omitted job is not checked);
 * `listFiles` returns the current tree's files, relative to `root`, defaulting to
 * {@link gitTrackedFiles}.
 * @returns One human-readable problem per drifted input; empty when nothing drifted.
 */
export function verifyTree({
  manifest,
  root,
  imageId,
  cliVersion,
  jobs = {},
  listFiles = gitTrackedFiles,
}: {
  manifest: Manifest;
  root: string;
  imageId: string;
  cliVersion: string;
  jobs?: Record<string, string>;
  listFiles?: (root: string) => string[];
}): string[] {
  const problems: string[] = [];
  const current = new Set(listFiles(root));
  const manifested = new Set(Object.keys(manifest.files));
  for (const path of current) {
    if (!manifested.has(path)) {
      problems.push(`file added: ${path}`);
      continue;
    }
    const hash = hashFile(join(root, path));
    if (hash !== manifest.files[path]) problems.push(`file changed: ${path}`);
  }
  for (const path of manifested) {
    if (!current.has(path)) problems.push(`file removed: ${path}`);
  }
  if (imageId !== manifest.imageId) problems.push(`image id: manifest has ${manifest.imageId}, current is ${imageId}`);
  if (cliVersion !== manifest.cliVersion) problems.push(`CLI version: manifest has ${manifest.cliVersion}, current is ${cliVersion}`);
  for (const [jobId, commit] of Object.entries(jobs)) {
    const pinned = manifest.jobs[jobId];
    if (pinned === undefined) problems.push(`job ${jobId}: not in the manifest`);
    else if (pinned !== commit) problems.push(`job ${jobId} commit: manifest has ${pinned}, batch has ${commit}`);
  }
  return problems;
}

/**
 * Parse `KEY=VALUE` pairs off repeated flag occurrences.
 * @param args - The command-line arguments.
 * @param flag - The flag to collect, such as `--job`.
 * @returns Every value, keyed by the part before its first `=`.
 */
function collectPairs(args: string[], flag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] !== flag) continue;
    const pair = args[i + 1] ?? '';
    const at = pair.indexOf('=');
    if (at === -1) continue;
    result[pair.slice(0, at)] = pair.slice(at + 1);
  }
  return result;
}

/**
 * Pull a flag's value out of an argument list.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * Turn one `--seed` value into the manifest's own seed shape: numeric text becomes a number
 * (never `NaN`, which `JSON.stringify` would otherwise silently write as `null`), and anything
 * else, blank text included, is kept as its own string.
 * @param value - The raw text after `NAME=`.
 * @returns The seed value the manifest carries.
 */
function parseSeed(value: string): number | string {
  if (value.trim() === '') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

/**
 * The command-line entry point. `--build` and `--verify` are accepted as aliases of the `build`
 * and `verify` subcommands.
 * @param args - The arguments after the script name.
 * @returns The process exit code.
 */
export function main(args: string[]): number {
  const rawMode = args[0];
  const mode = rawMode === '--build' ? 'build' : rawMode === '--verify' ? 'verify' : rawMode;
  if (mode === 'build') {
    const tag = option(args, '--tag') ?? FREEZE_TAG;
    const out = option(args, '--out');
    const imageId = option(args, '--image');
    const cliVersion = option(args, '--cli-version');
    const modelPairs = collectPairs(args, '--model');
    const models: FrozenModels = {
      reader: modelPairs.reader ?? '',
      catchJudge: modelPairs.catchJudge ?? '',
      adjudicator: modelPairs.adjudicator ?? '',
      agreement: modelPairs.agreement ?? '',
    };
    if (!out || !imageId || !cliVersion || !models.reader || !models.catchJudge || !models.adjudicator || !models.agreement) {
      process.stderr.write(
        'usage: freeze.ts build --tag NAME --out FILE --image ID --cli-version VERSION ' +
          '--model reader=ID --model catchJudge=ID --model adjudicator=ID --model agreement=ID [...]\n',
      );
      return 2;
    }
    const seeds: Record<string, number | string> = {};
    for (const [name, value] of Object.entries(collectPairs(args, '--seed'))) seeds[name] = parseSeed(value);
    const manifest = buildManifest({
      tag,
      root: HERE,
      imageId,
      cliVersion,
      models,
      jobs: collectPairs(args, '--job'),
      heldOutPins: collectPairs(args, '--held-out'),
      seeds,
    });
    const { hash } = writeManifest(manifest, resolve(out));
    process.stdout.write(`wrote ${out} (${Object.keys(manifest.files).length} files), sha256 ${hash}\n`);
    return 0;
  }
  if (mode === 'verify') {
    const manifestPath = option(args, '--manifest');
    const imageId = option(args, '--image');
    const cliVersion = option(args, '--cli-version');
    if (!manifestPath || !imageId || !cliVersion) {
      process.stderr.write('usage: freeze.ts verify --manifest FILE --image ID --cli-version VERSION [--job ID=COMMIT ...]\n');
      return 2;
    }
    const { manifest } = loadManifest(resolve(manifestPath));
    const problems = verifyTree({ manifest, root: HERE, imageId, cliVersion, jobs: collectPairs(args, '--job') });
    for (const problem of problems) process.stdout.write(`${problem}\n`);
    return problems.length > 0 ? 1 : 0;
  }
  process.stderr.write('usage: freeze.ts build|verify|--build|--verify ...\n');
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
