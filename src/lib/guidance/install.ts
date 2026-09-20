// cairn-guidance: the install primitives. Generalizes doctor/check-skill.ts's tree-hash approach
// (the one prior consumer, the admin-screens skill, task 1b retires) over a list of packaged
// trees instead of one: every directory under `skills/`, the review agent under `claude/agents/`,
// and the `claude/CLAUDE.md` fragment. The containment and `.orig` rules here are the write-side
// twin of doctor/bin.ts's `readFileUnderCwd`.
import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { createRequire } from 'node:module';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

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
 * Resolve a directory under the installed package's root, the same self-reference
 *  `readEnginePeers` uses for the dependency floors, generalized from one hardcoded skill
 *  directory to any packaged subdirectory (`skills`, `claude/agents`, and so on).
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

/** One directory under `skills/` the package ships, keyed by directory name. */
export async function readPackagedSkills(): Promise<Record<string, Record<string, string>>> {
  const root = resolveSourceRoot('skills');
  let entries: Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return {};
  }
  const skills: Record<string, Record<string, string>> = {};
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const { files } = await walkPackagedTree(join(root, entry.name));
    skills[entry.name] = files;
  }
  return skills;
}

/** The packaged review agent markdown files, keyed by filename under `claude/agents/`. */
export async function readPackagedAgents(): Promise<Record<string, string>> {
  const { files } = await walkPackagedTree(resolveSourceRoot('claude/agents'));
  return files;
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
}

/** Read every packaged tree off the real filesystem, resolved against the installed package. */
export async function readGuidanceSource(): Promise<GuidanceSource> {
  const [skills, agents, fragment] = await Promise.all([
    readPackagedSkills(),
    readPackagedAgents(),
    readPackagedFragment(),
  ]);
  return { skills, agents, fragment: fragment ?? '', version: resolveInstalledVersion() };
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

/** True when a destination path, resolved against cwd, stays inside `<cwd>/.claude`. */
export function isContained(cwd: string, destRelPath: string): boolean {
  const root = resolve(cwd, GUIDANCE_ROOT);
  const resolved = resolve(cwd, destRelPath);
  return resolved === root || resolved.startsWith(root + sep);
}

async function readIfExists(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function pathExists(absPath: string): Promise<boolean> {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
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
  /** Destinations refused because they resolved outside `<cwd>/.claude`. */
  refused: string[];
  /** Paths the previous MANIFEST listed that this run's package no longer ships. */
  removable: string[];
}

/**
 * Copy a guidance source into a consumer repo. Never writes outside `<cwd>/.claude` (a
 *  destination that would resolve outside it is refused by name and nothing else in that entry
 *  is written); never clobbers an existing `.orig`; never deletes a path the package stopped
 *  shipping, listing it as removable instead. Writes {@link MANIFEST_DEST} every run.
 */
export async function installGuidance(cwd: string, source: GuidanceSource): Promise<InstallReport> {
  const tree = flattenGuidanceTree(source);
  const report: InstallReport = {
    written: [],
    unchanged: [],
    origWritten: [],
    origPresent: [],
    refused: [],
    removable: [],
  };

  const previousManifestText = await readIfExists(resolve(cwd, MANIFEST_DEST));
  const previousManifest = previousManifestText
    ? previousManifestText.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];

  const writtenPaths = new Set<string>();
  for (const [destRelPath, content] of Object.entries(tree)) {
    if (!isContained(cwd, destRelPath)) {
      report.refused.push(destRelPath);
      continue;
    }
    writtenPaths.add(destRelPath);
    const destAbs = resolve(cwd, destRelPath);
    const existing = await readIfExists(destAbs);
    if (existing === content) {
      report.unchanged.push(destRelPath);
      continue;
    }
    if (existing !== null) {
      const origAbs = `${destAbs}.orig`;
      if (await pathExists(origAbs)) {
        report.origPresent.push(`${destRelPath}.orig`);
      } else {
        await mkdir(dirname(origAbs), { recursive: true });
        await writeFile(origAbs, existing, 'utf8');
        report.origWritten.push(`${destRelPath}.orig`);
      }
    }
    await mkdir(dirname(destAbs), { recursive: true });
    await writeFile(destAbs, content, 'utf8');
    report.written.push(destRelPath);
  }

  report.removable = previousManifest.filter((path) => !writtenPaths.has(path));

  const manifestAbs = resolve(cwd, MANIFEST_DEST);
  await mkdir(dirname(manifestAbs), { recursive: true });
  const manifestLines = [...writtenPaths].sort();
  await writeFile(manifestAbs, `${manifestLines.join('\n')}\n`, 'utf8');

  return report;
}
