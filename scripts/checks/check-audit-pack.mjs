// cairn-cms: the cairn-audit pack smoke test. It proves the shipped audit runs from a real install of
// the packed engine, the way a consumer gets it, with the optional peers absent and then present.
//
// A symlinked or in-repo node_modules would hide exactly the failure this guards: a runtime import
// (culori, for the contrast rule) left in devDependencies works in the repo and crashes a consumer's
// audit. So the check packs the engine (run `npm run package` first; the npm script does), installs
// the tarball with production dependencies and no peers into an empty directory under the OS temp
// directory, outside the repository so Node's upward resolution cannot reach the repo's
// node_modules, then adds svelte alone, since the audit parses components with `svelte/compiler`
// and every consumer site already has it. It runs the installed bin there three times:
//
//   1. The full registry with no daisyUI or Tailwind installed: a nonzero exit and the named
//      missing-peer message, with no stack trace.
//   2. An admin-only `--rule` selection with no peers: a clean run, since the peers load only when a
//      selected rule needs them.
//   3. The full registry after installing daisyUI and Tailwind explicitly: a clean run with a
//      nonzero scanned count.
//
// Before the runs it verifies the installed dist/audit against the tarball by content hash (npm's
// cache can serve a stale copy of a tarball with the same name), and fails when daisyUI already
// resolves from the install directory. After them it fails when any installed dist .d.ts names
// culori, whose types a consumer cannot resolve. The temporary directories are removed on exit.
//
// Wired as `npm run check:audit-pack`. Needs the network for the registry dependencies.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACKAGE = '@glw907/cairn-cms';

/**
 * The minimal site the runs audit: one complete daisyUI block that imports the engine's public
 * stylesheet, and one admin page with nothing to flag. Without a public file the run would stop at
 * the public scope's empty-scope error, and without an admin file at the static scan's "matched no
 * files" error, before either reached peer resolution.
 */
const FIXTURE = {
  'package.json': JSON.stringify({ name: 'cairn-audit-pack-site', private: true, type: 'module' }, null, 2),
  'src/theme/theme.css': [
    '@import "tailwindcss";',
    '@import "@glw907/cairn-cms/cairn-public.css";',
    '',
    '@plugin "daisyui/theme" {',
    '  name: "packcheck";',
    '  default: true;',
    '  prefersdark: false;',
    '  color-scheme: light;',
    '  --color-base-100: oklch(98.4% 0 0);',
    '  --color-base-200: oklch(96.4% 0 0);',
    '  --color-base-300: oklch(90.8% 0 0);',
    '  --color-base-content: oklch(25% 0 0);',
    '  --color-primary: oklch(45% 0.1 248);',
    '  --color-primary-content: oklch(99% 0.01 248);',
    '  --color-secondary: oklch(50% 0.02 75);',
    '  --color-secondary-content: oklch(99% 0.005 75);',
    '  --color-accent: oklch(52% 0.07 235);',
    '  --color-accent-content: oklch(99% 0.01 235);',
    '  --color-neutral: oklch(27% 0.013 72);',
    '  --color-neutral-content: oklch(97% 0.003 75);',
    '  --color-info: oklch(55% 0.1 235);',
    '  --color-info-content: oklch(99% 0.01 235);',
    '  --color-success: oklch(54% 0.12 150);',
    '  --color-success-content: oklch(99% 0.01 150);',
    '  --color-warning: oklch(80% 0.13 78);',
    '  --color-warning-content: oklch(28% 0.05 78);',
    '  --color-error: oklch(58% 0.19 27);',
    '  --color-error-content: oklch(99% 0.01 27);',
    '  --radius-selector: 0.25rem;',
    '  --radius-field: 0.375rem;',
    '  --radius-box: 0.5rem;',
    '  --size-selector: 0.25rem;',
    '  --size-field: 0.25rem;',
    '  --border: 1px;',
    '  --depth: 0;',
    '  --noise: 0;',
    '}',
    '',
  ].join('\n'),
  'src/routes/admin/+page.svelte': '<p>Pack check</p>\n',
};

/** The admin-only rules run 2 selects: neither reads the public scope, so neither needs a peer. */
const ADMIN_RULES = ['no-uncompiled-class', 'token-colors'];

/** A failure the report names; thrown so the cleanup still runs. */
class CheckFailure extends Error {}

/**
 * Every file under a directory, as paths relative to it.
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full).map((path) => join(entry.name, path)) : [entry.name];
  });
}

/**
 * The SHA-256 of a file.
 * @param {string} path
 * @returns {string}
 */
function hash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Run npm with the given arguments in a directory, throwing a named failure with its output.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function npm(args, cwd) {
  const result = spawnSync('npm', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new CheckFailure(`npm ${args.join(' ')} failed (exit ${result.status}):\n${result.stdout}${result.stderr}`);
  }
  return result.stdout;
}

/**
 * Run the installed audit bin in the site directory.
 * @param {string} site
 * @param {string[]} args
 * @returns {{ status: number | null, output: string }}
 */
function audit(site, args) {
  const bin = join(site, 'node_modules', PACKAGE, 'dist/audit/bin.js');
  const result = spawnSync(process.execPath, [bin, ...args], { cwd: site, encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}`.trim() };
}

/**
 * The scanned-file count a report's summary line states, or 0 when it states none.
 * @param {string} output
 * @returns {number}
 */
function scannedCount(output) {
  const match = /(\d+) files? scanned/.exec(output);
  return match ? Number(match[1]) : 0;
}

/**
 * Whether a daisyUI module resolves from the site directory.
 * @param {string} site
 * @returns {boolean}
 */
function daisyResolves(site) {
  try {
    createRequire(join(site, 'package.json')).resolve('daisyui/theme/object');
    return true;
  } catch {
    return false;
  }
}

/**
 * The version of a package the repository has installed, so run 3 installs the peers the engine
 * itself is tested against.
 * @param {string} name
 * @returns {string}
 */
function repoVersion(name) {
  return JSON.parse(readFileSync(join(ROOT, 'node_modules', name, 'package.json'), 'utf8')).version;
}

function main() {
  const work = mkdtempSync(join(tmpdir(), 'cairn-audit-pack-'));
  const cleanup = () => rmSync(work, { recursive: true, force: true });
  try {
    // Pack the already-built engine. `--ignore-scripts` skips `prepare`, which would rebuild dist.
    const packDir = join(work, 'pack');
    mkdirSync(packDir);
    const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', packDir], ROOT));
    const tarball = join(packDir, packed[0].filename);
    console.log(`Packed ${relative(work, tarball)} (${packed[0].entryCount} files).`);

    const extracted = join(work, 'extracted');
    mkdirSync(extracted);
    execFileSync('tar', ['-xzf', tarball, '-C', extracted]);

    const site = join(work, 'site');
    for (const [path, text] of Object.entries(FIXTURE)) {
      mkdirSync(dirname(join(site, path)), { recursive: true });
      writeFileSync(join(site, path), text);
    }
    npm(['install', tarball, '--omit=peer', '--omit=dev', '--no-audit', '--no-fund'], site);
    const svelte = `svelte@${repoVersion('svelte')}`;
    npm(['install', svelte, '--omit=peer', '--omit=dev', '--no-audit', '--no-fund'], site);
    console.log(`Installed the tarball into ${site} with production dependencies, no peers, and ${svelte}.`);

    // The installed dist/audit must be the pack's, byte for byte.
    const packedAudit = join(extracted, 'package/dist/audit');
    const installedAudit = join(site, 'node_modules', PACKAGE, 'dist/audit');
    const packedFiles = walk(packedAudit).sort();
    const installedFiles = walk(installedAudit).sort();
    if (packedFiles.length === 0) throw new CheckFailure('the tarball carries no dist/audit files');
    if (packedFiles.join('\n') !== installedFiles.join('\n')) {
      throw new CheckFailure('the installed dist/audit file list differs from the tarball\'s');
    }
    const stale = packedFiles.filter((path) => hash(join(packedAudit, path)) !== hash(join(installedAudit, path)));
    if (stale.length > 0) throw new CheckFailure(`the installed dist/audit differs from the tarball in ${stale.join(', ')}`);
    console.log(`Verified ${packedFiles.length} installed dist/audit files against the tarball by SHA-256.`);

    if (daisyResolves(site) || existsSync(join(site, 'node_modules/tailwindcss'))) {
      throw new CheckFailure('daisyui or tailwindcss is already installed before the no-peers run, so it proves nothing');
    }

    // Run 1: the full registry without the peers.
    const full = audit(site, []);
    console.log(`\nRun 1, the full registry with no peers (exit ${full.status}):\n${full.output}`);
    if (full.status === 0) throw new CheckFailure('run 1 exited 0 with no daisyui installed');
    if (!/daisyui is not installed[\s\S]*npm install --save-dev daisyui/.test(full.output)) {
      throw new CheckFailure('run 1 did not print the named missing-peer message for daisyui');
    }
    if (/^\s+at\s/m.test(full.output)) throw new CheckFailure('run 1 printed a stack trace');

    // Run 2: an admin-only selection without the peers.
    const admin = audit(site, ADMIN_RULES.flatMap((id) => ['--rule', id]));
    console.log(`\nRun 2, ${ADMIN_RULES.join(' and ')} with no peers (exit ${admin.status}):\n${admin.output}`);
    if (admin.status !== 0 || !/0 errors, 0 advisories/.test(admin.output)) {
      throw new CheckFailure('run 2 did not run clean');
    }

    // Run 3: the full registry with the peers installed explicitly.
    const peers = [`daisyui@${repoVersion('daisyui')}`, `tailwindcss@${repoVersion('tailwindcss')}`];
    npm(['install', ...peers, '--omit=peer', '--omit=dev', '--no-audit', '--no-fund'], site);
    const withPeers = audit(site, []);
    console.log(`\nRun 3, the full registry with ${peers.join(' and ')} (exit ${withPeers.status}):\n${withPeers.output}`);
    if (withPeers.status !== 0 || !/0 errors, 0 advisories/.test(withPeers.output)) {
      throw new CheckFailure('run 3 did not run clean');
    }
    if (scannedCount(withPeers.output) === 0) throw new CheckFailure('run 3 scanned no files');

    // No shipped declaration may name culori.
    const dist = join(site, 'node_modules', PACKAGE, 'dist');
    const naming = walk(dist)
      .filter((path) => path.endsWith('.d.ts'))
      .filter((path) => readFileSync(join(dist, path), 'utf8').includes('culori'));
    if (naming.length > 0) throw new CheckFailure(`installed declarations name culori: ${naming.join(', ')}`);
    console.log('\nNo installed dist .d.ts names culori.');

    console.log('\ncheck:audit-pack: PASS');
  } catch (err) {
    console.error(`\ncheck:audit-pack: FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
