// cairn-guidance: the install primitives. One tree hash decides freshness across every packaged
// tree the install copies: each directory under `skills/`, the review agent under
// `claude/agents/`, and the `claude/CLAUDE.md` fragment. The containment and `.orig` rules here
// are the write-side twin of media-seed/bin.ts's `readFileUnderCwd`.
import { createHash } from 'node:crypto';
import { constants, type Dirent, type Stats } from 'node:fs';
import { createRequire } from 'node:module';
import { lstat, mkdir, open, readdir, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

/** Where cairn-guidance writes into a consumer repo, relative to its working directory. */
export const GUIDANCE_ROOT = '.claude';

/** Where the installed CLAUDE.md fragment, version stamp, and manifest live. */
export const CAIRN_DIR = `${GUIDANCE_ROOT}/cairn`;

/** The destination path for the installed CLAUDE.md import fragment. */
export const FRAGMENT_DEST = `${CAIRN_DIR}/CLAUDE.md`;

/** The destination path for the installed package-version stamp. */
export const VERSION_DEST = `${CAIRN_DIR}/VERSION`;

/** The destination path for the write manifest a later install and `check` read. */
export const MANIFEST_DEST = `${CAIRN_DIR}/MANIFEST`;

/**
 * Hash a file tree keyed by relative path. Sorted before hashing, so an unrelated directory-walk
 *  order never changes the digest; pure, so the freshness judgment in check.ts is unit-testable
 *  without touching a real filesystem.
 */
export function hashFileTree(files: Record<string, string>): string {
  const hash = createHash('sha256');
  for (const relPath of Object.keys(files).sort()) {
    hash.update(relPath);
    hash.update('\0');
    hash.update(files[relPath]);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/**
 * Resolve a packaged subdirectory (`skills`, `claude/agents`, and so on) under the installed
 *  package's root, the same self-reference `readEnginePeers` uses for the dependency floors.
 */
export function resolveSourceRoot(relDir: string): string {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve('@glw907/cairn-cms/package.json');
  return join(dirname(pkgJsonPath), relDir);
}

/** The installed package's own version, stamped into {@link VERSION_DEST} at install. */
export function resolveInstalledVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require('@glw907/cairn-cms/package.json') as { version: string };
  return pkg.version;
}

/** The result of walking one real directory: its regular files, and any entry refused by name. */
export interface WalkResult {
  files: Record<string, string>;
  /** Relative paths refused because they are not a regular file (a symlink, a device, ...). */
  refused: string[];
}

/**
 * Walk a real directory into a flat file map, refusing by name, without following, any entry
 *  that is not a regular file. A symlink inside a compromised package could otherwise read
 *  arbitrary host content into a site's own committed guidance tree.
 */
export async function walkPackagedTree(root: string): Promise<WalkResult> {
  const files: Record<string, string> = {};
  const refused: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const relPath = relative(root, full).split(sep).join('/');
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        files[relPath] = await readFile(full, 'utf8');
      } else {
        refused.push(relPath);
      }
    }
  }

  await walk(root);
  return { files, refused };
}

/** Every directory under `skills/` the package ships, plus the entries its walk refused. */
export interface PackagedSkills {
  skills: Record<string, Record<string, string>>;
  /** Refused entries, each prefixed with the packaged path it was found under. */
  refused: string[];
}

/** One directory under `skills/` the package ships, keyed by directory name. */
export async function readPackagedSkills(): Promise<PackagedSkills> {
  const root = resolveSourceRoot('skills');
  let entries: Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return { skills: {}, refused: [] };
  }
  const skills: Record<string, Record<string, string>> = {};
  const refused: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const walked = await walkPackagedTree(join(root, entry.name));
    skills[entry.name] = walked.files;
    refused.push(...walked.refused.map((relPath) => `skills/${entry.name}/${relPath}`));
  }
  return { skills, refused };
}

/** The packaged review agent markdown files, keyed by filename under `claude/agents/`. */
export async function readPackagedAgents(): Promise<WalkResult> {
  const walked = await walkPackagedTree(resolveSourceRoot('claude/agents'));
  return { files: walked.files, refused: walked.refused.map((p) => `claude/agents/${p}`) };
}

/** The packaged `CLAUDE.md` fragment's content, or null when the package ships none yet. */
export async function readPackagedFragment(): Promise<string | null> {
  const root = resolveSourceRoot('claude');
  try {
    return await readFile(join(root, 'CLAUDE.md'), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * The packaged `check` snippets, keyed by filename under `claude/snippets/`. `check.ts` prints
 *  one of these bodies under the check:cairn script, cairn-audit.config.json, or CI workflow
 *  item when it is not present. Degrades to `{}`, the same as `readPackagedAgents`, when the
 *  directory does not exist yet.
 */
export async function readPackagedSnippets(): Promise<WalkResult> {
  const walked = await walkPackagedTree(resolveSourceRoot('claude/snippets'));
  return { files: walked.files, refused: walked.refused.map((p) => `claude/snippets/${p}`) };
}

/** Every packaged tree cairn-guidance installs, resolved against the installed package. */
export interface GuidanceSource {
  /** Skill directory name, resolved under `skills/`, mapped to its own relative path to content. */
  skills: Record<string, Record<string, string>>;
  /** Relative path under `claude/agents/`, mapped to content. */
  agents: Record<string, string>;
  /** The `claude/CLAUDE.md` fragment's content. Empty when the package ships none yet. */
  fragment: string;
  /** The installed package's own version. */
  version: string;
  /** The packaged `check` snippets, keyed by filename under `claude/snippets/`. */
  snippets: Record<string, string>;
  /**
   * Packaged entries the source walk refused because they are not regular files. Carried on the
   *  source so the install reports them: a refusal here means the package itself is malformed,
   *  which the site should see rather than silently install around.
   */
  refused: string[];
}

/** Read every packaged tree off the real filesystem, resolved against the installed package. */
export async function readGuidanceSource(): Promise<GuidanceSource> {
  const [skills, agents, fragment, snippets] = await Promise.all([
    readPackagedSkills(),
    readPackagedAgents(),
    readPackagedFragment(),
    readPackagedSnippets(),
  ]);
  return {
    skills: skills.skills,
    agents: agents.files,
    fragment: fragment ?? '',
    version: resolveInstalledVersion(),
    snippets: snippets.files,
    refused: [...skills.refused, ...agents.refused, ...snippets.refused],
  };
}

/**
 * Flatten a guidance source into destination paths relative to a consumer's working directory,
 *  each mapped to its content: `.claude/skills/<dir>/...`, `.claude/agents/...`,
 *  {@link FRAGMENT_DEST}, and {@link VERSION_DEST}.
 */
export function flattenGuidanceTree(source: GuidanceSource): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [dir, files] of Object.entries(source.skills)) {
    for (const [relPath, content] of Object.entries(files)) {
      out[`${GUIDANCE_ROOT}/skills/${dir}/${relPath}`] = content;
    }
  }
  for (const [relPath, content] of Object.entries(source.agents)) {
    out[`${GUIDANCE_ROOT}/agents/${relPath}`] = content;
  }
  out[FRAGMENT_DEST] = source.fragment;
  out[VERSION_DEST] = source.version;
  return out;
}

/**
 * True when a path names something inside `.claude/` without leaving a working directory: it is
 *  relative, and normalizing it leaves it under `.claude`. Applied both to a destination before
 *  any write and to a line read back out of a previous `MANIFEST`, which is attacker-editable and
 *  whose lines are printed as removable.
 */
export function isGuidancePath(destPath: string): boolean {
  if (isAbsolute(destPath)) return false;
  const normalized = normalize(destPath).split(sep).join('/').replace(/\/$/, '');
  return normalized === GUIDANCE_ROOT || normalized.startsWith(`${GUIDANCE_ROOT}/`);
}

/**
 * The paths a previous `MANIFEST` lists that the packaged tree no longer ships. A `MANIFEST` is an
 *  editable file in the site's own repo and these paths get printed, so a line naming anything
 *  outside `.claude/` is dropped rather than reported as removable.
 */
export function removableFromManifest(manifestText: string | null, shipped: string[]): string[] {
  if (manifestText === null) return [];
  const stillShipped = new Set(shipped);
  return manifestText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !stillShipped.has(line) && isGuidancePath(line));
}

/** True when a destination path, resolved against cwd, stays inside `<cwd>/.claude`. */
export function isContained(cwd: string, destRelPath: string): boolean {
  const root = resolve(cwd, GUIDANCE_ROOT);
  const resolved = resolve(cwd, destRelPath);
  return isGuidancePath(destRelPath) && (resolved === root || resolved.startsWith(root + sep));
}

async function readIfExists(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function lstatOrNull(absPath: string): Promise<Stats | null> {
  try {
    return await lstat(absPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw err;
  }
}

// O_NOFOLLOW is POSIX; Windows does not define it. Where it is missing the lstat of the
// destination is the whole defense, which is why that check runs on every platform and this flag
// only hardens the window between the check and the open.
const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
const OVERWRITE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | noFollow;
const CREATE_NEW_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow;

async function writeWithoutFollowing(absPath: string, content: string, flags: number): Promise<void> {
  const handle = await open(absPath, flags);
  try {
    await handle.writeFile(content, 'utf8');
  } finally {
    await handle.close();
  }
}

/**
 * Resolve one destination to the absolute path the install may write, or null to refuse it. The
 *  boundary is the real directory `<cwd>/.claude`: `cwd` is resolved with realpath first, so a
 *  project reached through a symlinked parent still installs, and every path component from
 *  `.claude` down is then lstat-ed, so a symlinked `.claude`, a symlink anywhere below it, or a
 *  directory sitting where a file belongs is refused rather than followed or repaired. A
 *  component that does not exist ends the walk: `mkdir` creates real directories from there down.
 */
async function resolveWritableDest(
  cwd: string,
  realCwd: string,
  destRelPath: string
): Promise<string | null> {
  const segments = relative(cwd, resolve(cwd, destRelPath)).split(sep).filter(Boolean);
  if (segments.length === 0) return null;
  let current = realCwd;
  for (let index = 0; index < segments.length; index += 1) {
    current = join(current, segments[index]);
    const stats = await lstatOrNull(current);
    if (stats === null) return join(realCwd, ...segments);
    if (stats.isSymbolicLink()) return null;
    const isLast = index === segments.length - 1;
    if (isLast ? !stats.isFile() : !stats.isDirectory()) return null;
  }
  return current;
}

/** What one `installGuidance` run did, for the bin to print and `check` to read back later. */
export interface InstallReport {
  /** Destinations written this run (new, or refreshed because their content changed). */
  written: string[];
  /** Destinations that already matched the packaged content; nothing written. */
  unchanged: string[];
  /** `<dest>.orig` paths written this run, preserving what an edit had diverged from. */
  origWritten: string[];
  /** `<dest>.orig` paths already present, left untouched. */
  origPresent: string[];
  /**
   * Destinations refused, by name: outside `<cwd>/.claude`, reached through a symlink, a symlink
   *  themselves, already a directory, or a `.orig` path whose recovery copy could not be made
   *  (which also refuses the destination beside it).
   */
  refused: string[];
  /**
   * Destinations whose write failed with a disk error rather than a containment refusal (an
   *  `ENOSPC`, an `EACCES`, ...), each carrying the failed write's `err.code`, or `'UNKNOWN'`
   *  when the thrown value carries none. Kept separate from {@link refused} so the bin can tell
   *  an operator to check disk space or permissions instead of the containment rules.
   */
  writeErrors: { path: string; code: string }[];
  /** Paths the previous MANIFEST listed that this run's package no longer ships. */
  removable: string[];
  /** Packaged entries the source walk refused, carried through from {@link GuidanceSource}. */
  sourceRefused: string[];
}

/**
 * Copy a guidance source into a consumer repo. Never writes outside the real directory
 *  `<cwd>/.claude`, and never through a symlink at any point of a destination's path (either is
 *  refused by name, with nothing else in that entry written and the run continuing); never
 *  clobbers an existing `.orig`, and refuses the destination too when the `.orig` beside it
 *  cannot be made, so an edit is never overwritten without its recovery copy; never deletes a
 *  path the package stopped shipping, listing it as removable instead. Writes
 *  {@link MANIFEST_DEST} every run.
 */
export async function installGuidance(cwd: string, source: GuidanceSource): Promise<InstallReport> {
  const tree = flattenGuidanceTree(source);
  const report: InstallReport = {
    written: [],
    unchanged: [],
    origWritten: [],
    origPresent: [],
    refused: [],
    writeErrors: [],
    removable: [],
    sourceRefused: [...source.refused],
  };

  const realCwd = await realpath(cwd);
  const manifestAbs = await resolveWritableDest(cwd, realCwd, MANIFEST_DEST);
  const previousManifestText = manifestAbs === null ? null : await readIfExists(manifestAbs);

  const writtenPaths = new Set<string>();
  for (const [destRelPath, content] of Object.entries(tree)) {
    if (!isContained(cwd, destRelPath)) {
      report.refused.push(destRelPath);
      continue;
    }
    const destAbs = await resolveWritableDest(cwd, realCwd, destRelPath);
    if (destAbs === null) {
      report.refused.push(destRelPath);
      continue;
    }
    const existing = await readIfExists(destAbs);
    if (existing === content) {
      writtenPaths.add(destRelPath);
      report.unchanged.push(destRelPath);
      continue;
    }
    if (existing !== null && !(await preserveOriginal(destAbs, destRelPath, existing, report))) {
      report.refused.push(destRelPath);
      continue;
    }
    await mkdir(dirname(destAbs), { recursive: true });
    try {
      await writeWithoutFollowing(destAbs, content, OVERWRITE_FLAGS);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? 'UNKNOWN';
      report.writeErrors.push({ path: destRelPath, code });
      continue;
    }
    writtenPaths.add(destRelPath);
    report.written.push(destRelPath);
  }

  report.removable = removableFromManifest(previousManifestText, Object.keys(tree));

  if (manifestAbs === null) {
    report.refused.push(MANIFEST_DEST);
    return report;
  }
  await mkdir(dirname(manifestAbs), { recursive: true });
  const manifestLines = [...writtenPaths].sort();
  await writeWithoutFollowing(manifestAbs, `${manifestLines.join('\n')}\n`, OVERWRITE_FLAGS);

  return report;
}

/**
 * Hold the first divergence at `<dest>.orig` and report whether the destination may now be
 *  overwritten. A `.orig` that already exists is left exactly as it is, since the first
 *  divergence is the one worth keeping. A symlink there is refused rather than written through,
 *  and refusing it also refuses the destination: without a recovery copy, overwriting would
 *  destroy the site's edit.
 */
async function preserveOriginal(
  destAbs: string,
  destRelPath: string,
  existing: string,
  report: InstallReport
): Promise<boolean> {
  const origAbs = `${destAbs}.orig`;
  const origRelPath = `${destRelPath}.orig`;
  const stats = await lstatOrNull(origAbs);
  if (stats?.isSymbolicLink()) {
    report.refused.push(origRelPath);
    return false;
  }
  if (stats !== null) {
    report.origPresent.push(origRelPath);
    return true;
  }
  try {
    await writeWithoutFollowing(origAbs, existing, CREATE_NEW_FLAGS);
  } catch {
    // The exclusive create lost a race, or landed on a symlink that appeared since the lstat.
    // A path that is now a plain file is someone else's copy of the same divergence; anything
    // else is refused, destination included.
    const raced = await lstatOrNull(origAbs);
    if (raced === null || !raced.isFile()) {
      report.refused.push(origRelPath);
      return false;
    }
    report.origPresent.push(origRelPath);
    return true;
  }
  report.origWritten.push(origRelPath);
  return true;
}
