#!/usr/bin/env -S npx tsx
/**
 * The harness's live run, by hand outside any gate (a podman container escapes the gate's cgroup
 * cap): every operator page's read-only procedures run for real against the scratch site's own
 * checkout, and the title check runs against the real registry. `cairn doctor` reads no
 * credential (the page itself says so), so this run mints no token and uses no secret; a future
 * state-changing procedure would need `cairn <path> --help` only, still no credential to execute
 * one for real.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/harness/run-live.ts
 */
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { CACHE_ROOT } from '../run.js';
import { SCRATCH_SITE_COMMIT } from '../prepare-baseline.js';
import { loadClasses } from '../lib/class-schema.js';
import { archiveCommit, ensureScratchSiteCommit, prepareDocsAndBinary } from '../lib/prepare-class.js';
import { ensureImage, hostCliVersion } from '../lib/podman.js';
import { writeOwnerMarker } from '../lib/sweep.js';
import type { ScratchSiteRecord } from '../lib/prepare-class.js';
import { extractProcedures } from './extract.js';
import { listOperatorPages } from './pages.js';
import { runProcedures, type ExecResult, type HarnessDeps, type HarnessStep } from './run.js';
import { checkTitles, type Condition } from './titles.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const run = promisify(execFile);

/** The scratch site the docs-and-binary class's registry record is built from (`scratch-site.json`, via `run.js`'s `SCRATCH_SITE`). */
const SCRATCH_SITE = JSON.parse(readFileSync(join(REPO_ROOT, 'scripts/docs-readers/scratch-site.json'), 'utf8')) as {
  siteId: string;
  record: ScratchSiteRecord;
};

/**
 * The host environment podman runs under, the same scrub `lib/podman.ts` applies: enough for
 * rootless podman to find its storage and runtime directory, and nothing else.
 * @returns A fresh environment object.
 */
function podmanEnv(): Record<string, string> {
  const env: Record<string, string> = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '' };
  if (process.env.XDG_RUNTIME_DIR) env.XDG_RUNTIME_DIR = process.env.XDG_RUNTIME_DIR;
  return env;
}

/**
 * Run `cairn` inside the image, directly, with no AI reader in the loop: the harness's own point
 * is a literal, deterministic execution, checked in code against the command's real exit code and
 * stdout, not an agent's paraphrase of them.
 * @param image - The reader image tag (`cairn` is baked in).
 * @param prepared - The prepared directory to mount at `/reader/job`.
 * @param args - The arguments after `cairn`.
 * @returns The exit code and stdout, never throwing on a non-zero exit.
 */
async function runCairn(image: string, prepared: string, args: string[]): Promise<ExecResult> {
  try {
    const { stdout } = await run(
      'podman',
      [
        'run', '--rm', '--read-only', '--tmpfs', '/tmp', '--cap-drop=all', '--security-opt', 'no-new-privileges',
        '-v', `${prepared}:/reader/job:Z`, '-w', '/reader/job', '--unsetenv-all',
        '--env', 'PATH=/usr/local/bin:/usr/bin:/bin',
        image, 'cairn', ...args,
      ],
      { env: podmanEnv(), maxBuffer: 16 * 1024 * 1024 },
    );
    return { exitCode: 0, stdout };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string };
    return { exitCode: typeof failed.code === 'number' ? failed.code : 1, stdout: failed.stdout ?? '' };
  }
}

/**
 * Run the harness against every in-scope operator page and the real condition registry.
 * @returns The exit code: 0 when the run itself completed, whatever the pages' own findings say.
 */
async function main(): Promise<number> {
  const adminDir = join(REPO_ROOT, 'docs', 'admin');
  const pages = listOperatorPages(adminDir);
  const conditions = JSON.parse(readFileSync(join(REPO_ROOT, 'tool/internal/spine/conditions.json'), 'utf8')) as Condition[];
  const docsAndBinary = loadClasses(join(REPO_ROOT, 'scripts/docs-readers/classes')).get('docs-and-binary');
  if (!docsAndBinary) throw new Error('the docs-and-binary class declaration is missing');

  const titleFindings = pages.flatMap((page) => checkTitles(readFileSync(join(REPO_ROOT, page), 'utf8'), page, conditions));

  const scratch = join(CACHE_ROOT, `harness-live-${randomBytes(4).toString('hex')}`);
  const prepared = join(scratch, 'prepared');
  mkdirSync(scratch, { recursive: true });
  writeOwnerMarker(scratch);
  try {
    const scratchClone = join(CACHE_ROOT, 'scratch-site-repo');
    ensureScratchSiteCommit({ cloneDir: scratchClone, commit: SCRATCH_SITE_COMMIT });
    const siteExportDir = join(scratch, 'site-export');
    archiveCommit({ repoRoot: scratchClone, commit: SCRATCH_SITE_COMMIT, dest: siteExportDir });
    prepareDocsAndBinary({
      sourceRoot: REPO_ROOT,
      docsSet: pages,
      siteId: SCRATCH_SITE.siteId,
      record: SCRATCH_SITE.record,
      dest: prepared,
      siteExportDir,
    });

    const cliVersion = await hostCliVersion();
    const image = await ensureImage(cliVersion, (line) => process.stderr.write(`docs-readers: ${line}\n`));
    const deps: HarnessDeps = {
      allowlist: docsAndBinary.bashAllowlist,
      execCairn: (words) => runCairn(image, prepared, words),
      execHelp: (path) => runCairn(image, prepared, [...path, '--help']),
    };

    const results: Record<string, HarnessStep[]> = {};
    for (const page of pages) {
      const text = readFileSync(join(REPO_ROOT, page), 'utf8');
      const procedures = extractProcedures(page, text);
      results[page] = await runProcedures(procedures, deps);
    }

    process.stdout.write(`${JSON.stringify({ pages: results, titleFindings }, null, 2)}\n`);
    return 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`harness/run-live: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    },
  );
}
