// Emit the public Waymark template into `templates/waymark/` at the repo root, from this package's
// own bake output plus the repo-only overlay (README, LICENSE, .dev.vars.example, the .gitignore
// negation). The tree is generated wholesale: every emit regenerates it, so a hand edit survives at
// most one run, and `--check` fails when the committed tree and a fresh emit disagree.
//
// This replaces the cross-repo sync that pushed the same tree to glw907/cairn-waymark-template.
// Cloudflare's Deploy button and C3's --template both accept a subdirectory, so the template no
// longer needs a repo of its own, and the drift tripwire becomes an ordinary in-repo gate: no push
// credential, no second copy, and a red run lands on the change that caused it.
//
// The template must stay OUTSIDE the root package.json's `packages/*` workspace glob. Cloudflare
// treats the subdirectory as the root of the repository it creates and requires the application be
// fully isolated within it; a workspace member has no lockfile of its own, since npm hoists to the
// root, so `packages/` would break that isolation.
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { bake } from './bake-template.mjs';
import { walk } from '../../../scripts/walk-files.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(packageDir, '../..');

/** The overlay skeleton this package ships beside the bake, versioned with the tool. */
export const OVERLAY_DIR = path.join(packageDir, 'template-repo');

/** Where the composed template lands, repo-relative. */
export const TEMPLATE_DIR = 'templates/waymark';

// The overlay's own merge-rule table. Every overlay file replaces its bake counterpart outright
// except a path listed here, which is merged instead. Today this holds exactly one entry: the
// .gitignore negation must land after the bake's own `.dev.vars.*` line, or the negation is a
// no-op. A future overlay file (for example a keyed package.json merge) adds a row here rather
// than a special case buried in the apply loop.
const OVERLAY_MERGE_RULES = { '.gitignore': 'append' };

/**
 * Apply the overlay onto a baked tree, replacing each overlay file's bake counterpart outright
 * except a path named in `OVERLAY_MERGE_RULES`, which is merged instead of replaced.
 * @param {string} sourceDir the baked tree, mutated in place
 * @param {string} overlayDir the overlay directory to apply
 * @returns {Promise<void>}
 */
export async function applyOverlay(sourceDir, overlayDir) {
  for (const overlayFile of walk(overlayDir, () => true)) {
    const relativePath = path.relative(overlayDir, overlayFile);
    const destPath = path.join(sourceDir, relativePath);
    const overlayContent = await readFile(overlayFile, 'utf8');
    await mkdir(path.dirname(destPath), { recursive: true });
    const rule = OVERLAY_MERGE_RULES[relativePath] ?? 'replace';
    if (rule === 'replace') {
      await writeFile(destPath, overlayContent);
      continue;
    }
    let base = '';
    try {
      base = await readFile(destPath, 'utf8');
    } catch {
      // No baked counterpart to append after; the overlay content stands alone.
    }
    const separator = base === '' || base.endsWith('\n') ? '' : '\n';
    await writeFile(destPath, base + separator + overlayContent);
  }
}

/**
 * Compose the template tree (bake plus overlay) into a scratch directory.
 * @param {{ engineSpec: string, devSpec: string, overlayDir?: string }} options
 * @returns {Promise<string>} the scratch directory holding the composed tree
 */
export async function composeTemplate({ engineSpec, devSpec, overlayDir = OVERLAY_DIR }) {
  const scratch = await mkdtemp(path.join(tmpdir(), 'cairn-waymark-'));
  await bake({ to: scratch, engineSpec, devSpec });
  await applyOverlay(scratch, overlayDir);
  return scratch;
}

/**
 * Read every file in a tree into a path-keyed map, so two trees can be compared without shelling
 * out to git (which would only see files git already tracks). The template is text throughout, so
 * the utf8 decode is lossless; a binary asset entering the showcase would be compared through its
 * decoding rather than its bytes.
 * @param {string} root the directory to read
 * @returns {Promise<Map<string, string>>} relative path to file contents
 */
async function readTree(root) {
  const entries = new Map();
  for (const file of walk(root, () => true)) {
    entries.set(path.relative(root, file), await readFile(file, 'utf8'));
  }
  return entries;
}

/**
 * Compare a freshly composed tree against the committed one.
 * @param {string} fresh the composed tree
 * @param {string} committed the tree in the repo
 * @returns {Promise<string[]>} one line per difference, empty when the trees match
 */
export async function diffTrees(fresh, committed) {
  const freshFiles = await readTree(fresh);
  const committedFiles = await readTree(committed);
  const differences = [];
  for (const [relativePath, content] of freshFiles) {
    if (!committedFiles.has(relativePath)) {
      differences.push(`missing from the repo: ${relativePath}`);
    } else if (committedFiles.get(relativePath) !== content) {
      differences.push(`differs: ${relativePath}`);
    }
  }
  for (const relativePath of committedFiles.keys()) {
    if (!freshFiles.has(relativePath)) {
      differences.push(`not produced by the bake: ${relativePath}`);
    }
  }
  return differences.sort();
}

// CLI: node scripts/emit-template-dir.mjs [--engine-spec <spec>] [--dev-spec <spec>] [--check]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'engine-spec': { type: 'string' },
      'dev-spec': { type: 'string' },
      check: { type: 'boolean', default: false },
    },
  });

  const enginePackage = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  // Both specs default to the engine's own version, the substitution the bake's callers already
  // make: the two packages publish in lockstep, so one number governs both.
  const defaultSpec = `^${enginePackage.version}`;
  const engineSpec = values['engine-spec'] ?? defaultSpec;
  const devSpec = values['dev-spec'] ?? defaultSpec;

  const destination = path.join(repoRoot, TEMPLATE_DIR);
  const scratch = await composeTemplate({ engineSpec, devSpec });

  try {
    if (values.check) {
      const differences = await diffTrees(scratch, destination);
      if (differences.length === 0) {
        console.log(`emit-template-dir: OK (${TEMPLATE_DIR} matches a fresh bake)`);
      } else {
        console.log(`emit-template-dir: ${TEMPLATE_DIR} has drifted from a fresh bake`);
        for (const line of differences) console.log(`  ${line}`);
        console.log('Run `npm run emit:template` and commit the result.');
        // Setting the code rather than exiting outright lets the scratch cleanup below run; a
        // process.exit here would skip the finally and leave the temp tree behind.
        process.exitCode = 1;
      }
    } else {
      await rm(destination, { recursive: true, force: true });
      await cp(scratch, destination, { recursive: true });
      console.log(`emit-template-dir: wrote ${TEMPLATE_DIR} (engine ${engineSpec}, dev ${devSpec})`);
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
