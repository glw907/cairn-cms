/**
 * The post-freeze chain: an append-only, hash-linked ledger of every artifact a later
 * instrument-validation step reads after the freeze (path maps, recomputed thresholds, the
 * planted batch file, each planted tree's digest, the plant record, each batch's results index,
 * and each judge batch's rulings). Each entry names the artifact's path, the sha256 of its bytes
 * at the time it was chained, the commit that carries it, and the sha256 of the previous line's
 * own raw bytes (`null` for the genesis entry). An entry is never rewritten; a replaced artifact
 * gets a new entry, and the earlier one stays in the file, so `latestEntry` is the one a reader
 * trusts.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** One artifact's entry in the chain: its path, the sha256 of its bytes, the commit that carries it, and the sha256 of the previous line's own bytes. */
export interface ChainEntry {
  path: string;
  sha256: string;
  commit: string;
  prior: string | null;
}

/** The fields `appendEntry` needs from a caller; `prior` is computed from the file's own last line. */
export type ChainEntryInput = Pick<ChainEntry, 'path' | 'sha256' | 'commit'>;

/** One broken link the chain's own hash linkage failed at. */
export interface BrokenLink {
  line: number;
  reason: string;
}

/** One path whose latest chain entry does not match the file on disk. */
export interface FileMismatch {
  path: string;
  reason: string;
}

/** `verifyChain`'s result: every linkage break and every path whose file drifted from its latest entry. */
export interface VerifyResult {
  ok: boolean;
  brokenLinks: BrokenLink[];
  fileMismatches: FileMismatch[];
}

/**
 * The sha256 hex digest of a string or buffer's bytes.
 * @param data - The bytes to hash.
 * @returns The digest, lowercase hex.
 */
function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * The sha256 hex digest of a file's bytes.
 * @param path - The file to hash.
 * @returns The digest, lowercase hex.
 */
export function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

/**
 * A chain file's raw lines, one per entry, in file order. A missing file has no lines, and a
 * trailing newline never yields a spurious empty final line.
 * @param chainFile - The chain file's path.
 * @returns Each entry's own raw JSON line, unparsed.
 */
function readRawLines(chainFile: string): string[] {
  if (!existsSync(chainFile)) return [];
  const content = readFileSync(chainFile, 'utf8');
  if (content === '') return [];
  const lines = content.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

/**
 * Every entry a chain file carries, parsed, in file order.
 * @param chainFile - The chain file's path.
 * @returns The entries, oldest first.
 */
export function readChain(chainFile: string): ChainEntry[] {
  return readRawLines(chainFile).map((line) => JSON.parse(line) as ChainEntry);
}

/**
 * Append one entry to a chain file, computing its `prior` from the sha256 of the file's own
 * current last line (`null` when the file is empty or missing, the genesis case). The file is
 * created when it does not yet exist. An existing line is never read back and rewritten; this
 * only ever adds a new line.
 * @param chainFile - The chain file's path.
 * @param input - The new entry's path, sha256, and carrying commit.
 * @returns The entry as appended, `prior` included.
 */
export function appendEntry(chainFile: string, input: ChainEntryInput): ChainEntry {
  const lines = readRawLines(chainFile);
  const prior = lines.length === 0 ? null : sha256(lines[lines.length - 1]);
  const entry: ChainEntry = { path: input.path, sha256: input.sha256, commit: input.commit, prior };
  appendFileSync(chainFile, `${JSON.stringify(entry)}\n`);
  return entry;
}

/**
 * Verify a chain file's own hash linkage, and check each path's latest entry against the file on
 * disk under `root`. A path with no file at that location counts as a mismatch, named the same as
 * a hash difference.
 * @param chainFile - The chain file's path.
 * @param root - The directory each entry's `path` is resolved against to find its artifact.
 * @returns Every broken link and every path whose file drifted from its latest entry; `ok` when
 * both lists are empty.
 */
export function verifyChain(chainFile: string, root: string): VerifyResult {
  const lines = readRawLines(chainFile);
  const entries = lines.map((line) => JSON.parse(line) as ChainEntry);
  const brokenLinks: BrokenLink[] = [];
  entries.forEach((entry, index) => {
    const expectedPrior = index === 0 ? null : sha256(lines[index - 1]);
    if (entry.prior !== expectedPrior) {
      brokenLinks.push({ line: index + 1, reason: `entry for "${entry.path}" at line ${index + 1} carries prior "${String(entry.prior)}", expected "${String(expectedPrior)}"` });
    }
  });
  const latestByPath = new Map<string, ChainEntry>();
  for (const entry of entries) latestByPath.set(entry.path, entry);
  const fileMismatches: FileMismatch[] = [];
  for (const [path, entry] of latestByPath) {
    const target = resolve(root, path);
    if (!existsSync(target)) {
      fileMismatches.push({ path, reason: `no file found at "${target}"` });
      continue;
    }
    const actual = hashFile(target);
    if (actual !== entry.sha256) fileMismatches.push({ path, reason: `hash on disk "${actual}" does not match chain entry "${entry.sha256}"` });
  }
  return { ok: brokenLinks.length === 0 && fileMismatches.length === 0, brokenLinks, fileMismatches };
}

/**
 * A path's latest entry: the last one the chain carries for it. An earlier, superseded entry
 * stays in the file but is never returned here.
 * @param chainFile - The chain file's path.
 * @param path - The artifact path to look up.
 * @returns The latest entry, or undefined when the path has none.
 */
export function latestEntry(chainFile: string, path: string): ChainEntry | undefined {
  let latest: ChainEntry | undefined;
  for (const entry of readChain(chainFile)) if (entry.path === path) latest = entry;
  return latest;
}

/**
 * The chain prefix length a report's `chainHead` identifies: the count of leading lines whose
 * bytes, concatenated with each line's own trailing newline, hash to `head`. Because `chainHead`
 * is taken at the moment a gated batch starts, this is how the scorer finds which entries postdate
 * a report that read the chain: any entry beyond the returned length was appended after.
 * @param chainFile - The chain file's path.
 * @param head - The sha256 to match against a growing prefix of the file's bytes.
 * @returns The number of leading lines that prefix hashes to.
 * @throws When no prefix of the file matches `head`.
 */
export function chainPrefixLength(chainFile: string, head: string): number {
  const lines = readRawLines(chainFile);
  let bytes = '';
  for (let index = 0; index < lines.length; index += 1) {
    bytes += `${lines[index]}\n`;
    if (sha256(bytes) === head) return index + 1;
  }
  throw new Error(`no chain prefix in "${chainFile}" matches head "${head}"`);
}
