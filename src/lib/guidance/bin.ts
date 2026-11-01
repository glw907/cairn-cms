#!/usr/bin/env node
// cairn-guidance: install or check the package's shipped skills, review agent, and CLAUDE.md
// fragment in a consumer repo. `install` copies them into .claude/ (writing .orig beside
// anything an edit diverged from, and a MANIFEST of what it wrote). `check` reports whether the
// tree, the import line, and the gate wiring match what the package expects; it exits 0 unless
// --strict is given and the guidance tree is stale or missing. Bad flags go to stderr with exit
// 2, matching the doctor and audit bins' convention.
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { formatCheckReport, isStaleUnderStrict, runGuidanceCheck } from './check.js';
import { installGuidance, readGuidanceSource } from './install.js';

export const USAGE = `Usage: cairn-guidance <install|check> [--strict] [--dry-run]

  install   Copy the package's skills, review agent, and CLAUDE.md fragment into
            .claude/, writing <dest>.orig beside anything an edit diverged from
            and a MANIFEST of what was written. Deletes a file a previous install
            wrote and this version no longer ships only when its hash matches a
            version the package shipped; an edited file is kept and named on every run.
  --dry-run With install, print what it would write, delete, and keep, and change nothing.
  check     Report whether the installed guidance tree, the CLAUDE.md import
            line, and the gate wiring match what the package expects.
  --strict  With check, exit 1 when the guidance tree is stale or missing.
            Otherwise check always exits 0.
  --help    Print this message and exit 0.

Every write stays under .claude/; a destination outside it, or reached through a symlink, is
refused by name and the run continues. A .claude that is itself a symlink refuses every path. install never writes .claude/settings.json, the root
CLAUDE.md, package.json, or anything under .github/, and exits 0 even when it refuses or a write
fails, so read its stderr. An existing .orig is never rewritten. check reports seven lines, none
of which fails the run except the tree freshness under --strict. An unknown command or flag, or
--strict with install, exits 2.
`;

export interface GuidanceArgs {
  command: 'install' | 'check';
  strict: boolean;
  dryRun: boolean;
  help: boolean;
}

/** Parse `cairn-guidance`'s argv. Throws, with the usage line attached, on anything unexpected. */
export function parseArgs(argv: string[]): GuidanceArgs {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { command: 'check', strict: false, dryRun: false, help: true };
  }
  const [command, ...rest] = argv;
  if (command !== 'install' && command !== 'check') {
    throw new Error(`cairn-guidance: unknown command '${command ?? ''}'\n\n${USAGE}`);
  }
  const strict = rest.includes('--strict');
  const dryRun = rest.includes('--dry-run');
  const unknown = rest.filter((flag) => flag !== '--strict' && flag !== '--dry-run');
  if (unknown.length > 0) {
    throw new Error(`cairn-guidance: unknown flag '${unknown[0]}'\n\n${USAGE}`);
  }
  if (strict && command === 'install') {
    throw new Error(`cairn-guidance: --strict applies only to check\n\n${USAGE}`);
  }
  if (dryRun && command === 'check') {
    throw new Error(`cairn-guidance: --dry-run applies only to install\n\n${USAGE}`);
  }
  return { command, strict, dryRun, help: false };
}

async function main(): Promise<void> {
  let args: GuidanceArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    console.log(USAGE);
    return;
  }

  const cwd = process.cwd();

  // resolve() does not contain: a relPath carrying enough ".." segments walks the result
  // outside cwd, so every read is checked against cwd regardless of where relPath came from.
  // The write-side twin lives in install.ts's isContained.
  const readFileUnderCwd = async (relPath: string): Promise<string | null> => {
    const resolved = resolve(cwd, relPath);
    if (resolved !== cwd && !resolved.startsWith(cwd + sep)) {
      throw new Error(`cairn-guidance: refusing to read outside the project directory: ${relPath}`);
    }
    try {
      return await readFile(resolved, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  };

  const source = await readGuidanceSource();

  if (args.command === 'install') {
    const report = await installGuidance(cwd, source, { dryRun: args.dryRun });
    const verb = args.dryRun ? 'would write' : 'wrote';
    for (const path of report.written) console.log(`${verb} ${path}`);
    for (const path of report.origWritten) console.log(`${verb} ${path}`);
    for (const path of report.origPresent) console.log(`left existing ${path}`);
    for (const path of report.sourceRefused) {
      console.error(`refused packaged entry ${path}: not a regular file`);
    }
    for (const path of report.refused) {
      console.error(`refused ${path}: outside .claude/, a symlink, or not a regular file`);
    }
    for (const { path, code } of report.writeErrors) {
      console.error(`write error ${path}: ${code}`);
    }
    for (const path of report.removed) {
      console.log(`${args.dryRun ? 'would remove' : 'removed'} (no longer shipped): ${path}`);
    }
    for (const path of report.origLeft) {
      console.log(`left ${path}: the copy of an edit you made; read it, then delete it by hand`);
    }
    for (const dir of report.emptiedDirs) console.log(`removed empty directory ${dir}`);
    for (const { path, reason } of report.kept) {
      const why =
        reason === 'edited'
          ? 'edited since install'
          : reason === 'unrecognized'
            ? 'not a file this package ever shipped'
            : 'a symlink, a directory, or behind a symlink';
      console.log(`kept ${path}: ${why}; delete it by hand if you no longer need it`);
    }
    for (const dir of report.unmanaged) {
      console.log(
        `found ${dir}: an old skill with no .claude/cairn/MANIFEST to say this package wrote it; delete it by hand if you did not write it`
      );
    }
    console.log(
      '\nThe guidance tree belongs in your commit. .orig files are meant to be read and deleted, not ignored.'
    );
    return;
  }

  const report = await runGuidanceCheck(readFileUnderCwd, source);
  console.log(formatCheckReport(report));
  if (args.strict && isStaleUnderStrict(report)) {
    process.exitCode = 1;
  }
}

await main();
