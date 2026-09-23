#!/usr/bin/env -S npx tsx
/**
 * The docs-reader runner.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/run.ts BATCH_JSON [--out DIR] [--ledger FILE]
 *   npx tsx scripts/docs-readers/run.ts --probe-init [--class NAME]
 *   npx tsx scripts/docs-readers/run.ts --ledger-total [--ledger FILE]
 *
 * A batch run checks the reader token, runs every job in its own confined container, writes the
 * scrubbed batch report and transcripts under `--out`, appends usage to the ledger, and tears
 * every container, network, and per-run directory down. It exits 0 only when the batch completed,
 * every report verified, and teardown left nothing behind. `--probe-init` prints the init fields
 * a class's session shows under this CLI version, for pinning in `init-baseline.json`.
 *
 * The reader token is read from `CAIRN_DOCS_READER_OAUTH_TOKEN`, or from `~/.local/secrets` when
 * that is unset, and is never printed.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClasses, loadEgress } from './lib/class-schema.js';
import { parseBatch } from './lib/batch.js';
import { appendLedger, ledgerTotal, readLedger } from './lib/ledger.js';
import { createPodmanExecutor, ensureImage, hostCliVersion } from './lib/podman.js';
import { REPORT_SCHEMA, runBatch } from './lib/runner.js';
import { findInit } from './lib/transcript.js';
import { scrub } from './lib/scrub.js';
import type { BatchReport, InitBaseline } from './lib/types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** The neutral cache root every per-run directory, result, and ledger lives under. */
export const CACHE_ROOT = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'docs-readers');

/** A batch report with the CLI version, run root, and teardown result the CLI adds. */
export interface FinishedReport extends BatchReport {
  cliVersion: string;
  runRoot: string;
  teardown: { runDirRemoved: boolean; containersLeft: number; networksLeft: number };
}

/** The environment variable the reader token is stored under. */
const TOKEN_NAME = 'CAIRN_DOCS_READER_OAUTH_TOKEN';

/**
 * Read a secret from the environment, or from the `export NAME=value` lines of `~/.local/secrets`.
 * @param name - The variable name.
 * @returns The value, or undefined when neither source has it.
 */
export function readSecret(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const file = join(homedir(), '.local', 'secrets');
  if (!existsSync(file)) return undefined;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (match && match[1] === name) return match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return undefined;
}

/**
 * Pull a flag's value out of an argument list.
 * @param args - The command-line arguments.
 * @param flag - The flag name, such as `--out`.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * A run id that sorts by time and never names the project.
 * @returns A UTC timestamp plus six random hex digits.
 */
function newRunId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').toLowerCase();
  return `${stamp}-${randomBytes(3).toString('hex')}`;
}

/**
 * Write a line to stderr.
 * @param message - The line.
 */
function log(message: string): void {
  process.stderr.write(`docs-readers: ${message}\n`);
}

/**
 * Set up the executor for a run: the token, the CLI version, the image, and the run directory.
 * @param runId - Names the per-run directory and labels its containers.
 * @param tokenFor - Returns the token for the next container; defaults to the stored token.
 * @returns The executor, the run root, and the secret values to scrub.
 */
export async function setUpRun(runId: string, tokenFor?: () => string) {
  const stored = readSecret(TOKEN_NAME);
  if (!stored) throw new Error(`${TOKEN_NAME} is not set and not in ~/.local/secrets`);
  const cliVersion = await hostCliVersion();
  const image = await ensureImage(cliVersion, log);
  const runRoot = join(CACHE_ROOT, runId);
  mkdirSync(runRoot, { recursive: true });
  const secretValues = new Map<string, string>();
  const executor = createPodmanExecutor({
    runId,
    runRoot,
    sourceRoot: REPO_ROOT,
    image,
    egress: loadEgress(),
    token: tokenFor ?? (() => stored),
    secretValue: (name: string) => {
      const value = readSecret(name);
      if (value) secretValues.set(name, value);
      return value;
    },
  });
  return { executor, runRoot, cliVersion, secrets: () => [stored, ...secretValues.values()] };
}

/**
 * Run a batch file end to end and write its outputs.
 * The options override the output directory (`out`) and the ledger path (`ledgerFile`), both
 * defaulting under the cache root; `tokenFor` returns the token for each container, which the live
 * credential check uses to swap in an invalid token mid-batch; `batchOverride` is batch JSON to
 * run in place of the file's contents.
 * @param batchFile - The batch JSON path.
 * @returns The batch report, with its teardown result.
 */
export async function runBatchFile(
  batchFile: string,
  {
    out,
    ledgerFile,
    tokenFor,
    batchOverride,
  }: { out?: string; ledgerFile?: string; tokenFor?: () => string; batchOverride?: string } = {},
): Promise<{ report: FinishedReport; outDir: string }> {
  const classes = loadClasses();
  const batch = parseBatch(batchOverride ?? readFileSync(batchFile, 'utf8'), classes);
  const baselines = JSON.parse(readFileSync(join(HERE, 'init-baseline.json'), 'utf8')) as Record<string, InitBaseline>;
  const runId = newRunId();
  const { executor, runRoot, cliVersion, secrets } = await setUpRun(runId, tokenFor);
  const outDir = out ?? join(CACHE_ROOT, 'results', `${batch.name}-${runId}`);
  const ledgerPath = ledgerFile ?? join(CACHE_ROOT, 'ledger.jsonl');
  log(`run ${runId}: batch ${batch.name}, ${batch.jobs.length} job(s), CLI ${cliVersion}`);
  let result: Awaited<ReturnType<typeof runBatch>>;
  let teardown: FinishedReport['teardown'];
  // A killed runner halts the batch, waits for every worker to settle, and only then tears down
  // (in the finally below), so no worker starts a container after teardown has run.
  const halt = new AbortController();
  const onSignal = () => {
    log('signal received; halting the batch before teardown');
    halt.abort();
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    result = await runBatch({
      batch,
      classes,
      baselines,
      executor,
      runId,
      secrets: secrets(),
      ledger: { append: (entry) => appendLedger(ledgerPath, entry) },
      halt: halt.signal,
    });
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    teardown = await executor.teardown();
    if (halt.signal.aborted) process.exit(130);
  }
  const report: FinishedReport = { ...result.report, cliVersion, runRoot, teardown };
  report.verified = report.verified && teardown.runDirRemoved && teardown.containersLeft === 0 && teardown.networksLeft === 0;
  mkdirSync(join(outDir, 'transcripts'), { recursive: true });
  writeFileSync(join(outDir, 'report.json'), `${scrub(JSON.stringify(report, null, 2), secrets())}\n`);
  for (const [jobId, text] of Object.entries(result.transcripts)) {
    writeFileSync(join(outDir, 'transcripts', `${jobId}.jsonl`), text);
  }
  log(`wrote ${outDir}`);
  return { report, outDir };
}

/**
 * Print the init fields a class's session shows, for pinning.
 * @param className - The class to probe.
 */
async function probeInit(className: string): Promise<void> {
  const classes = loadClasses();
  const decl = classes.get(className);
  if (!decl) throw new Error(`no class named ${className}`);
  const runId = newRunId();
  const { executor } = await setUpRun(runId);
  try {
    const { events } = await executor.probeInit(decl, REPORT_SCHEMA);
    const init = findInit(events);
    if (!init) throw new Error('the probe session produced no init event');
    const pinned = { skills: [...(init.skills ?? [])].sort(), plugins: init.plugins ?? [] };
    const observed = { tools: init.tools, mcp_servers: init.mcp_servers, apiKeySource: init.apiKeySource, agents: init.agents };
    process.stdout.write(`${JSON.stringify({ [init.claude_code_version ?? 'unknown']: pinned, observed }, null, 2)}\n`);
  } finally {
    await executor.teardown();
  }
}

/**
 * The command-line entry point.
 * @param args - The arguments after the script name.
 * @returns The process exit code.
 */
async function main(args: string[]): Promise<number> {
  const ledgerFile = option(args, '--ledger') ?? join(CACHE_ROOT, 'ledger.jsonl');
  if (args.includes('--ledger-total')) {
    process.stdout.write(`${JSON.stringify(ledgerTotal(readLedger(ledgerFile)), null, 2)}\n`);
    return 0;
  }
  if (args.includes('--probe-init')) {
    await probeInit(option(args, '--class') ?? 'docs-only');
    return 0;
  }
  const batchFile = args.find((a) => !a.startsWith('--') && a !== option(args, '--out') && a !== option(args, '--ledger'));
  if (!batchFile) {
    log('usage: npx tsx scripts/docs-readers/run.ts BATCH_JSON [--out DIR] [--ledger FILE] | --probe-init [--class NAME] | --ledger-total');
    return 2;
  }
  const { report } = await runBatchFile(resolve(batchFile), { out: option(args, '--out'), ledgerFile });
  for (const job of report.jobs) {
    log(`${job.id}: ${job.outcome}${job.abortReason ? ` (${job.abortReason})` : ''}, verified ${job.verified.ok}, counted ${job.usage.counted}`);
  }
  log(`stopReason ${report.stopReason}; counted ${report.usage.counted}, cache read ${report.usage.cacheRead}; teardown ${JSON.stringify(report.teardown)}`);
  return report.verified ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      log(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
