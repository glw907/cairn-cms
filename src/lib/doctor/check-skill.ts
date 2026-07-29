// cairn-doctor: the admin-screens skill's install and freshness check. The skill ships inside
// the package (skills/cairn-admin-screens/), and a consumer's own copy under
// .claude/skills/cairn-admin-screens/ drifts from it silently unless something compares the two
// trees. This hashes both and reports fresh, missing, or stale; --fix (installSkill, called by
// the bin before the checks run) copies the packaged tree over the consumer's own so the very
// next check run reads fresh.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile as fsReadFile, writeFile as fsWriteFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';

/** Where the skill installs in a consumer repo, relative to its working directory. */
export const SKILL_INSTALL_DIR = '.claude/skills/cairn-admin-screens';

// Where the skill ships inside the package, relative to the package root.
const SKILL_SOURCE_DIR = 'skills/cairn-admin-screens';

/**
 * Hash a file tree keyed by relative path. Sorted before hashing, so an unrelated directory-walk
 *  order never changes the digest; pure, so the freshness judgment below is unit-testable
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
 * Judge a consumer's installed skill tree against the packaged one. Pure, so the three states
 *  drive from fixtures rather than a real install. Never fails: the skill is a development aid,
 *  not a deploy blocker, the same non-gating stance `admin.mount-shape` takes.
 */
export function skillFreshnessResult(
  installed: Record<string, string> | null,
  packaged: Record<string, string>
): CheckResult {
  if (installed === null) {
    return skip(
      `the admin-screens skill is not installed at ${SKILL_INSTALL_DIR}; run cairn-doctor --fix to install it`
    );
  }
  if (hashFileTree(installed) !== hashFileTree(packaged)) {
    return skip(
      `the installed admin-screens skill at ${SKILL_INSTALL_DIR} is stale; run cairn-doctor --fix to refresh it`
    );
  }
  return pass(`the admin-screens skill at ${SKILL_INSTALL_DIR} matches the packaged version`);
}

/**
 * Resolve the packaged skill's real source directory through the installed package, the same
 *  self-reference `readEnginePeers` uses for the dependency floors, so a consumer install and
 *  cairn's own dev tree both resolve correctly.
 */
export function resolveSkillSourceRoot(): string {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve('@glw907/cairn-cms/package.json');
  return join(dirname(pkgJsonPath), SKILL_SOURCE_DIR);
}

async function walkFiles(root: string, dir: string = root): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(root, full)));
    } else if (entry.isFile()) {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out;
}

/** Read the packaged skill's full file tree off the real filesystem, keyed by relative path. */
export async function readPackagedSkillFiles(): Promise<Record<string, string>> {
  const root = resolveSkillSourceRoot();
  const relPaths = await walkFiles(root);
  const files: Record<string, string> = {};
  for (const relPath of relPaths) {
    files[relPath] = await fsReadFile(join(root, relPath), 'utf8');
  }
  return files;
}

/**
 * Read a consumer's installed skill files at the same relative paths the packaged tree carries,
 *  through `ctx.readFile`. Returns null when none of them exist (nothing installed); a partial
 *  or edited set still returns its content, which naturally hashes stale against the packaged
 *  tree rather than reading as missing.
 */
export async function readInstalledSkillFiles(
  ctx: DoctorContext,
  packagedRelPaths: string[]
): Promise<Record<string, string> | null> {
  const files: Record<string, string> = {};
  let found = false;
  for (const relPath of packagedRelPaths) {
    const text = await ctx.readFile(`${SKILL_INSTALL_DIR}/${relPath}`);
    if (text !== null) {
      found = true;
      files[relPath] = text;
    }
  }
  return found ? files : null;
}

export const skillFreshness: DoctorCheck = {
  id: 'skill.admin-screens',
  conditionId: 'skill.admin-screens-stale',
  title: 'admin-screens skill',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const packaged = await readPackagedSkillFiles();
    const installed = await readInstalledSkillFiles(ctx, Object.keys(packaged));
    return skillFreshnessResult(installed, packaged);
  },
};

/**
 * Copy the packaged skill's file tree into a consumer repo, overwriting any existing copy. Real
 *  filesystem writes, so this runs only from `--fix`, never from a check's `run()`. Returns the
 *  count of files written.
 */
export async function installSkill(destRoot: string): Promise<number> {
  const packaged = await readPackagedSkillFiles();
  for (const [relPath, content] of Object.entries(packaged)) {
    const dest = join(destRoot, relPath);
    await mkdir(dirname(dest), { recursive: true });
    await fsWriteFile(dest, content, 'utf8');
  }
  return Object.keys(packaged).length;
}
