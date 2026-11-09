#!/usr/bin/env node
// Packs the `cairn` binary into one npm package per platform, plus the `create-cairn-site`
// launcher that depends on them (the optional-dependencies pattern esbuild uses). The platform
// manifests are generated here and never committed: each carries the `os` and `cpu` npm checks
// before it installs, so a manifest that disagreed with its binary would install a program the
// machine cannot run. The script reads every binary's executable header and refuses a mismatch.
//
//   node scripts/release/pack-platforms.mjs --version 1.2.0 --binaries tool/dist/platforms --out tarballs
//
// `--binaries` holds one directory per target, `<os>-<cpu>/cairn` (`cairn.exe` on Windows), with
// the os and cpu in Node's spelling. `--targets` limits the run to some of the six; the default is
// all six, and a missing one fails. Prints `{ launcher, platforms }` as JSON: the tarball paths.
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** The six platforms the launcher ships, in Node's `process.platform`-`process.arch` spelling. */
export const TARGETS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-arm64', 'win32-x64'];

/** The platform package's name for a target. */
export const platformPackage = (target) => `@glw907/cairn-${target}`;

/**
 * The target key for a Node platform and architecture, or null when the launcher ships no binary
 * for it.
 * @param {string} os `process.platform`
 * @param {string} cpu `process.arch`
 */
export function platformKey(os, cpu) {
  const key = `${os}-${cpu}`;
  return TARGETS.includes(key) ? key : null;
}

const ELF_MACHINES = { 0x3e: 'x64', 0xb7: 'arm64' };
const MACHO_CPUS = { 0x01000007: 'x64', 0x0100000c: 'arm64' };
const PE_MACHINES = { 0x8664: 'x64', 0xaa64: 'arm64' };

/**
 * Reads the os and cpu an executable was built for from its header: ELF, 64-bit little-endian
 * Mach-O, or PE. Throws on anything else, a script included.
 * @param {Buffer} header the file's first bytes (4 KiB is enough)
 * @returns {{ os: string, cpu: string }}
 */
export function binaryTarget(header) {
  const bad = () => new Error('not a Linux, macOS, or Windows executable of a supported cpu');
  if (header.length >= 20 && header.readUInt32BE(0) === 0x7f454c46) {
    const cpu = ELF_MACHINES[header.readUInt16LE(18)];
    if (cpu) return { os: 'linux', cpu };
  } else if (header.length >= 8 && header.readUInt32BE(0) === 0xcffaedfe) {
    const cpu = MACHO_CPUS[header.readUInt32LE(4)];
    if (cpu) return { os: 'darwin', cpu };
  } else if (header.length >= 0x40 && header.readUInt16BE(0) === 0x4d5a) {
    const at = header.readUInt32LE(0x3c);
    if (header.length >= at + 6 && header.toString('latin1', at, at + 4) === 'PE\0\0') {
      const cpu = PE_MACHINES[header.readUInt16LE(at + 4)];
      if (cpu) return { os: 'win32', cpu };
    }
  }
  throw bad();
}

/** The manifest of one platform package. */
export function platformManifest(target, version) {
  const [os, cpu] = target.split('-');
  return {
    name: platformPackage(target),
    version,
    description: `The cairn command line tool for ${os} on ${cpu}. Installed by create-cairn-site.`,
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/glw907/cairn-cms.git',
      directory: 'tool',
    },
    os: [os],
    cpu: [cpu],
    files: ['bin'],
  };
}

function pack(dir, out) {
  const name = execFileSync('npm', ['pack', '--ignore-scripts', '--silent', '--pack-destination', out], {
    cwd: dir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
    .trim()
    .split('\n')
    .pop();
  return path.join(out, name);
}

/**
 * Packs the platform packages and the launcher.
 * @returns {{ launcher: string, platforms: Record<string, string> }}
 */
export function packPlatforms({ version, binaries, targets = TARGETS, out }) {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`--version ${version} is not a semver version`);
  const stage = mkdtempSync(path.join(tmpdir(), 'pack-platforms-'));
  const staged = {};
  try {
    for (const target of targets) {
      if (!TARGETS.includes(target)) throw new Error(`${target} is not one of ${TARGETS.join(', ')}`);
      const name = target.startsWith('win32') ? 'cairn.exe' : 'cairn';
      const source = path.join(binaries, target, name);
      let header;
      try {
        header = readFileSync(source).subarray(0, 4096);
      } catch {
        throw new Error(`${target}: no binary at ${source}`);
      }
      const built = binaryTarget(header);
      if (`${built.os}-${built.cpu}` !== target) {
        throw new Error(`${target}: the binary at ${source} was built for ${built.os}-${built.cpu}`);
      }
      const dir = path.join(stage, target);
      mkdirSync(path.join(dir, 'bin'), { recursive: true });
      copyFileSync(source, path.join(dir, 'bin', name));
      chmodSync(path.join(dir, 'bin', name), 0o755);
      writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify(platformManifest(target, version), null, 2)}\n`);
      staged[target] = dir;
    }

    const launcherDir = path.join(stage, 'launcher');
    mkdirSync(launcherDir);
    const source = path.join(root, 'packages/create-cairn-site');
    for (const file of ['bin.mjs', 'README.md']) copyFileSync(path.join(source, file), path.join(launcherDir, file));
    const manifest = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8'));
    manifest.version = version;
    manifest.optionalDependencies = Object.fromEntries(TARGETS.map((t) => [platformPackage(t), version]));
    writeFileSync(path.join(launcherDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    mkdirSync(out, { recursive: true });
    const platforms = {};
    for (const [target, dir] of Object.entries(staged)) platforms[target] = pack(dir, out);
    return { launcher: pack(launcherDir, out), platforms };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: {
        version: { type: 'string' },
        binaries: { type: 'string' },
        targets: { type: 'string' },
        out: { type: 'string' },
      },
    });
    for (const required of ['version', 'binaries', 'out']) {
      if (!values[required]) throw new Error(`--${required} is required`);
    }
    const result = packPlatforms({
      version: values.version,
      binaries: path.resolve(values.binaries),
      targets: values.targets ? values.targets.split(',') : TARGETS,
      out: path.resolve(values.out),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (err) {
    process.stderr.write(`pack-platforms: ${err.message}\n`);
    process.exit(1);
  }
}
