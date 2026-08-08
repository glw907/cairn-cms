// Emit a deployable cairn-starter template from examples/showcase. The showcase is the single
// source (Reversal 2); this script copies it out, drops the paths the emission manifest excludes,
// and rewrites the workspace-relative engine/dev dependency specs to a packaged engine. CI runs it
// against npm-packed tarballs to prove the scaffolded output still builds (the rot gate). Part C's
// generator reuses the manifest and this transform.
//
// Path exclusion (.cairn-template.json) cannot reach a line inside a kept file, so a second pass,
// marker-based line stripping, runs after the copy. A start/end marker pair is matched as a
// substring of a line, so any comment form carries it: `// cairn-template:exclude-start`, a
// JSONC `//`, a shell `#`, `<!-- cairn-template:exclude-start -->`, or `/* cairn-template:exclude-start */`.
// Every line from the start marker through the end marker, inclusive, is dropped. The pass is
// fail-loud by design: an unterminated start, a nested start, or an end with no start throws,
// naming the file, because a silently dropped end marker would truncate the rest of the file.
import { cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { walk } from '../walk-files.mjs';

const EXCLUDE_START = 'cairn-template:exclude-start';
const EXCLUDE_END = 'cairn-template:exclude-end';

/**
 * Strip marker-delimited blocks from a file's content. Every line from a start marker through
 * its matching end marker, inclusive, is dropped; a line outside any block passes through
 * unchanged. Defensive no-ops, so the function is safe to call on any file the post-copy pass
 * walks: content with no start marker returns unchanged, and content carrying a NUL byte (the
 * post-copy pass's own binary signal) returns unchanged rather than risk a lossy rewrite.
 * @param {string} content the file's text
 * @param {string} filePath the file's path, named in a thrown error
 * @returns {string} the content with every marked block removed
 */
export function stripMarkedBlocks(content, filePath) {
  if (content.includes('\0')) return content;
  const lines = content.split('\n');
  const kept = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.includes(EXCLUDE_START)) {
      if (inBlock) throw new Error(`stripMarkedBlocks: nested ${EXCLUDE_START} in ${filePath}`);
      inBlock = true;
      continue;
    }
    if (line.includes(EXCLUDE_END)) {
      if (!inBlock) {
        throw new Error(
          `stripMarkedBlocks: ${EXCLUDE_END} with no matching ${EXCLUDE_START} in ${filePath}`,
        );
      }
      inBlock = false;
      continue;
    }
    if (inBlock) continue;
    kept.push(line);
  }
  if (inBlock) throw new Error(`stripMarkedBlocks: unterminated ${EXCLUDE_START} in ${filePath}`);
  return kept.join('\n');
}

/**
 * Apply stripMarkedBlocks over every file under `dir`. Reads each file's raw bytes first and
 * skips (leaves untouched) any file containing a NUL byte, so a binary asset is never decoded as
 * utf8; among the rest, only a file whose content contains a start marker is rewritten.
 * @param {string} dir the emitted tree's root
 * @returns {Promise<void>}
 */
async function stripMarkedBlocksInTree(dir) {
  for (const filePath of walk(dir, () => true)) {
    const buffer = await readFile(filePath);
    if (buffer.includes(0)) continue;
    const content = buffer.toString('utf8');
    if (!content.includes(EXCLUDE_START)) continue;
    await writeFile(filePath, stripMarkedBlocks(content, filePath));
  }
}

/**
 * Rewrite the emitted package.json: rename, repoint the engine and dev-backend specs.
 * @param {Record<string, any>} pkg the parsed showcase package.json
 * @param {{ name: string, engineSpec: string, devSpec: string }} opts the scaffolded site name,
 *  and the specs to install @glw907/cairn-cms and @glw907/cairn-cms-dev from
 */
export function transformPackageJson(pkg, { name, engineSpec, devSpec }) {
  const out = structuredClone(pkg);
  out.name = name;
  if (out.dependencies?.['@glw907/cairn-cms']) out.dependencies['@glw907/cairn-cms'] = engineSpec;
  if (out.devDependencies?.['@glw907/cairn-cms-dev']) out.devDependencies['@glw907/cairn-cms-dev'] = devSpec;
  return out;
}

/**
 * True when rel is an excluded path or sits under an excluded directory.
 * @param {string} rel
 * @param {string[]} exclude
 */
export function isExcluded(rel, exclude) {
  const norm = rel.split(path.sep).join('/');
  return exclude.some((ex) => norm === ex || norm.startsWith(ex + '/'));
}

/**
 * Emit the template tree.
 * @param {{ from: string, to: string, engineSpec: string, devSpec: string, name?: string }} opts
 *  `from` is the showcase dir, `to` the target dir (must not exist or be empty), and
 *  `engineSpec`/`devSpec`/`name` pass through to transformPackageJson
 * @returns {Promise<string>} the emitted tree's root (`opts.to`)
 */
export async function emitTemplate({ from, to, engineSpec, devSpec, name = 'cairn-site' }) {
  const manifest = JSON.parse(await readFile(path.join(from, '.cairn-template.json'), 'utf8'));
  const exclude = manifest.exclude ?? [];
  // node_modules, the build outputs, and the wrangler/playwright caches are all gitignored generated
  // artifacts; the manifest file itself is consumed by the emitter, not shipped.
  const alwaysSkip = ['node_modules', '.svelte-kit', 'build', '.wrangler', 'test-results', 'playwright-report', '.cairn-template.json'];
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  await cp(from, to, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(from, src);
      if (rel === '') return true;
      const top = rel.split(path.sep)[0];
      if (alwaysSkip.includes(top)) return false;
      return !isExcluded(rel, exclude);
    },
  });
  const pkg = JSON.parse(await readFile(path.join(from, 'package.json'), 'utf8'));
  await writeFile(
    path.join(to, 'package.json'),
    JSON.stringify(transformPackageJson(pkg, { name, engineSpec, devSpec }), null, 2) + '\n',
  );
  // The lockfile is showcase-specific (file:../.. paths); the emitted site resolves fresh on
  // install. force ignores its absence, so no existence check is needed.
  await rm(path.join(to, 'package-lock.json'), { force: true });
  await stripMarkedBlocksInTree(to);
  return to;
}

// CLI: node scripts/emit-template.mjs <to> <engineSpec> <devSpec> [name]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [to, engineSpec, devSpec, name] = process.argv.slice(2);
  if (!to || !engineSpec || !devSpec) {
    console.error('usage: emit-template.mjs <to> <engineSpec> <devSpec> [name]');
    process.exit(1);
  }
  const from = path.join(path.dirname(new URL(import.meta.url).pathname), '../..', 'examples', 'showcase');
  await emitTemplate({ from, to, engineSpec, devSpec, name });
  console.log(`emitted template to ${to}`);
}
