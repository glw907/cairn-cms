#!/usr/bin/env -S npx tsx
/**
 * The docs-reader runner.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/run.ts BATCH_JSON [--out DIR] [--ledger FILE]
 *   npx tsx scripts/docs-readers/run.ts BATCH_JSON --resume DIR
 *   npx tsx scripts/docs-readers/run.ts --probe-init [--class NAME]
 *   npx tsx scripts/docs-readers/run.ts --ledger-total [--ledger FILE]
 *
 * A batch run checks the reader token, runs every job in its own confined container, writes the
 * scrubbed batch report and transcripts under `--out`, appends usage to the ledger, and tears
 * every container, network, and per-run directory down. It exits 0 only when the batch completed,
 * every report verified, and teardown left nothing behind. A batch marked `gated` is checked
 * against the freeze manifest before any container starts, and its reports carry the stamp;
 * `--resume DIR` re-runs only the jobs a prior run there left `stoppedBy` a rate limit, an
 * authentication failure, or a budget stop, and merges the result back into that run's
 * `report.json`. `--probe-init` prints the init fields a class's session shows under this CLI
 * version, for pinning in `init-baseline.json`.
 *
 * The reader token is read from `CAIRN_DOCS_READER_OAUTH_TOKEN`, or from `~/.local/secrets` when
 * that is unset, and is never printed.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClasses, loadEgress } from './lib/class-schema.js';
import { parseBatch } from './lib/batch.js';
import { addUsage, appendLedger, ledgerTotal, readLedger, reportUsage } from './lib/ledger.js';
import { mintInstallationToken, type InstallationToken } from './lib/github-app-token.js';
import { createPodmanExecutor, ensureImage, hostCliVersion, imageId as currentImageId, podman, type TeardownResult } from './lib/podman.js';
import { REPORT_SCHEMA, runBatch, type GatedFreeze } from './lib/runner.js';
import { sweepOrphans, writeOwnerMarker } from './lib/sweep.js';
import { findInit } from './lib/transcript.js';
import { scrub } from './lib/scrub.js';
import { gitTrackedFiles, hashFile, loadManifest, verifyTree } from './freeze.js';
import type { ScratchSiteRecord } from './lib/prepare-class.js';
import type { Batch, BatchReport, InitBaseline, Job } from './lib/types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** The neutral cache root every per-run directory, result, and ledger lives under. */
export const CACHE_ROOT = join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'docs-readers');

/** The scratch site's facts: its registry record and the GitHub token scope minted for it. */
interface ScratchSiteDecl {
  siteId: string;
  installationId: number;
  githubRepositoriesForToken: string[];
  githubPermissionsForToken: Record<string, string>;
  record: ScratchSiteRecord;
}

/** The scratch site the docs-and-binary class's credentials and registry record are built from. */
export const SCRATCH_SITE: ScratchSiteDecl = JSON.parse(readFileSync(join(HERE, 'scratch-site.json'), 'utf8')) as ScratchSiteDecl;

/** The host secret name `CAIRN_CF_READ_TOKEN` maps onto: the scratch site's own account-owned, per-Worker token. */
const SCRATCH_CF_TOKEN_NAME = 'CAIRN_SCRATCH_CF_TOKEN';

/** The usage ledger's default path. */
const DEFAULT_LEDGER = join(CACHE_ROOT, 'ledger.jsonl');

/** A batch report with the CLI version, run root, and teardown result the CLI adds. */
export interface FinishedReport extends BatchReport {
  cliVersion: string;
  runRoot: string;
  teardown: TeardownResult;
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
 * A run id that sorts by time and never names the project. Built from `randomUUID()` rather than
 * `randomBytes(...).toString('hex')`, which sidesteps an svelte-check overload-resolution quirk
 * this module's own test file triggers (the same fix `lib/podman.ts`'s canary marker already
 * took).
 * @returns A UTC timestamp plus six random hex digits.
 */
function newRunId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').toLowerCase();
  return `${stamp}-${randomUUID().replace(/-/g, '').slice(0, 6)}`;
}

/**
 * Write a line to stderr.
 * @param message - The line.
 */
function log(message: string): void {
  process.stderr.write(`docs-readers: ${message}\n`);
}

/**
 * Mint the operator class's scoped GitHub installation token, from the App identity in
 * `~/.local/secrets` and the scratch site's own installation id and repository (`scratch-site.json`).
 * @returns The minted token, its expiry, and the repositories it covers.
 * @throws When the App identity is not available, or the mint itself fails.
 */
async function mintScratchGithubToken(): Promise<InstallationToken> {
  const appId = readSecret('GITHUB_APP_ID');
  const keyB64 = readSecret('GITHUB_APP_PRIVATE_KEY_B64');
  if (!appId || !keyB64) {
    throw new Error("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY_B64 must both be set to mint the operator class's scoped GitHub token");
  }
  const privateKeyPem = Buffer.from(keyB64, 'base64').toString('utf8');
  return mintInstallationToken({
    appId,
    privateKeyPem,
    installationId: SCRATCH_SITE.installationId,
    repositories: SCRATCH_SITE.githubRepositoriesForToken,
    permissions: SCRATCH_SITE.githubPermissionsForToken,
  });
}

/**
 * How long before a minted installation token's own expiry `operatorSecretResolver` re-mints
 * rather than hand out a token that could expire mid-job: GitHub mints these for one hour, but
 * Task 4's batches (several jobs, each with its own timeout) can outlive that, so a token handed
 * out with minutes left could expire while a job is still running.
 */
const GITHUB_TOKEN_REMINT_MARGIN_MS = 10 * 60 * 1000;

/**
 * One minted token, cached against the promise that produced it: `expiresAtMs` is undefined until
 * that promise resolves, which is what keeps two calls racing the same in-flight mint from ever
 * starting a second one.
 */
interface CachedGithubToken {
  promise: Promise<InstallationToken>;
  expiresAtMs?: number;
}

/**
 * Mint with one bounded retry: a transient failure (a network blip, a slow App token exchange)
 * gets one immediate second attempt before the caller sees a rejection.
 * @param mint - The mint function to attempt.
 * @returns The minted token.
 * @throws The second attempt's error, when both attempts fail.
 */
async function mintWithRetry(mint: () => Promise<InstallationToken>): Promise<InstallationToken> {
  try {
    return await mint();
  } catch {
    return await mint();
  }
}

/**
 * Build the operator class's secret resolver: `CAIRN_CF_READ_TOKEN` maps onto the scratch site's
 * own Cloudflare token, and `CAIRN_GH_READ_TOKEN` mints a GitHub installation token, caching it
 * until it is within `GITHUB_TOKEN_REMINT_MARGIN_MS` of its own expiry, at which point the next
 * call mints a fresh one; the check-and-mint decision runs with no `await` in between, so two
 * calls racing the same in-flight or about-to-expire mint always share one mint, never two. A
 * mint gets one bounded retry before it is allowed to fail, and a mint that fails even after that
 * retry is never left cached: the next call starts a fresh mint rather than replaying the same
 * rejection forever, and the job that asked for the token during the failed mint fails cleanly.
 * Every other name falls through to a plain `readSecret` lookup, the mapping every other class's
 * secretEnv already relied on. `now` and `mint` are overridden in tests.
 * @returns A secret resolver for `createPodmanExecutor`.
 */
export function operatorSecretResolver({
  now = () => Date.now(),
  mint = mintScratchGithubToken,
}: { now?: () => number; mint?: () => Promise<InstallationToken> } = {}): (name: string) => Promise<string | undefined> {
  let cached: CachedGithubToken | undefined;
  return async (name: string) => {
    if (name === 'CAIRN_CF_READ_TOKEN') return readSecret(SCRATCH_CF_TOKEN_NAME);
    if (name === 'CAIRN_GH_READ_TOKEN') {
      const expiringSoon = cached?.expiresAtMs !== undefined && cached.expiresAtMs - now() < GITHUB_TOKEN_REMINT_MARGIN_MS;
      if (!cached || expiringSoon) {
        const promise = mintWithRetry(mint);
        const entry: CachedGithubToken = { promise };
        cached = entry;
        promise
          .then((token) => {
            if (cached === entry) entry.expiresAtMs = Date.parse(token.expiresAt);
          })
          .catch(() => {
            if (cached === entry) cached = undefined;
          });
      }
      return (await cached.promise).token;
    }
    return readSecret(name);
  };
}

/**
 * Set up the executor for a run: a startup sweep, the token, the CLI version, the image, and the
 * run directory.
 * @param runId - Names the per-run directory and labels its containers.
 * @param tokenFor - Returns the token for the next container; defaults to the stored token.
 * @returns The executor, the run root, the ensured image tag, and the secret values to scrub.
 */
export async function setUpRun(runId: string, tokenFor?: () => string) {
  const stored = readSecret(TOKEN_NAME);
  if (!stored) throw new Error(`${TOKEN_NAME} is not set and not in ~/.local/secrets`);
  const swept = await sweepOrphans({ cacheRoot: CACHE_ROOT, podman });
  if (swept.containersRemoved.length > 0 || swept.networksRemoved.length > 0 || swept.dirsRemoved.length > 0) {
    log(`startup sweep: removed ${swept.containersRemoved.length} container(s), ${swept.networksRemoved.length} network(s), ${swept.dirsRemoved.length} stale dir(s)`);
  }
  const cliVersion = await hostCliVersion();
  const image = await ensureImage(cliVersion, log);
  const runRoot = join(CACHE_ROOT, runId);
  mkdirSync(runRoot, { recursive: true });
  writeOwnerMarker(runRoot);
  const secretValues = new Map<string, string>();
  const resolveOperatorSecret = operatorSecretResolver();
  const executor = createPodmanExecutor({
    runId,
    runRoot,
    sourceRoot: REPO_ROOT,
    image,
    egress: loadEgress(),
    token: tokenFor ?? (() => stored),
    secretValue: async (name: string) => {
      const value = await resolveOperatorSecret(name);
      if (value) secretValues.set(name, value);
      return value;
    },
  });
  return { executor, runRoot, cliVersion, image, secrets: () => [stored, ...secretValues.values()] };
}

/** Where the freeze manifest and the post-freeze chain live, under this script's own directory. */
const DEFAULT_MANIFEST_PATH = join(HERE, 'post-freeze', 'manifest.json');
const DEFAULT_CHAIN_PATH = join(HERE, 'post-freeze', 'chain.jsonl');

/**
 * Check a gated batch against the freeze manifest before any container starts: every file the
 * manifest hashes, the image id, the CLI version, and this batch's own job commits. A gate that
 * passes also requires the post-freeze chain file to exist, since a gated report's stamp always
 * carries a chain head. `manifestPath` and `chainPath` are the freeze manifest and the
 * post-freeze chain file, whose bytes become the stamp's chain head; `root` is the directory the
 * manifest's files are relative to; `imageId` and `cliVersion` are the current reader image's
 * digest and the current CLI version; `jobs` are the batch's own job commits to check, by job id;
 * `listFiles` returns the current tree's files, relative to `root`, defaulting to the real
 * git-tracked-file listing, overridable in tests.
 * @returns Every drifted input's name when the gate refuses; the freeze stamp to run under
 *  otherwise.
 */
export function checkGate({
  manifestPath,
  chainPath,
  root,
  imageId,
  cliVersion,
  jobs,
  listFiles = gitTrackedFiles,
}: {
  manifestPath: string;
  chainPath: string;
  root: string;
  imageId: string;
  cliVersion: string;
  jobs: Record<string, string>;
  listFiles?: (root: string) => string[];
}): { ok: true; freeze: GatedFreeze } | { ok: false; problems: string[] } {
  if (!existsSync(manifestPath)) return { ok: false, problems: [`no freeze manifest at ${manifestPath}`] };
  const { manifest, hash: manifestHash } = loadManifest(manifestPath);
  const problems = verifyTree({ manifest, root, imageId, cliVersion, jobs, listFiles });
  if (!existsSync(chainPath)) problems.push(`no chain file at ${chainPath}`);
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, freeze: { tag: manifest.tag, manifestHash, chainHead: hashFile(chainPath), expectedModel: manifest.models.reader } };
}

/**
 * Run a batch file end to end and write its outputs.
 * The options override the output directory (`out`) and the ledger path (`ledgerFile`), both
 * defaulting under the cache root; `tokenFor` returns the token for each container, which the live
 * credential check uses to swap in an invalid token mid-batch; `batchOverride` is batch JSON to
 * run in place of the file's contents; `manifestPath` and `chainPath` override the freeze
 * manifest and chain a gated batch checks against.
 * @param batchFile - The batch JSON path.
 * @returns The batch report, with its teardown result.
 * @throws When the batch is gated and its gate check finds any drifted input; no container has
 *  started by then.
 */
export async function runBatchFile(
  batchFile: string,
  {
    out,
    ledgerFile,
    tokenFor,
    batchOverride,
    manifestPath = DEFAULT_MANIFEST_PATH,
    chainPath = DEFAULT_CHAIN_PATH,
  }: {
    out?: string;
    ledgerFile?: string;
    tokenFor?: () => string;
    batchOverride?: string;
    manifestPath?: string;
    chainPath?: string;
  } = {},
): Promise<{ report: FinishedReport; outDir: string }> {
  const classes = loadClasses();
  const batch = parseBatch(batchOverride ?? readFileSync(batchFile, 'utf8'), classes);
  const baselines = JSON.parse(readFileSync(join(HERE, 'init-baseline.json'), 'utf8')) as Record<string, InitBaseline>;
  const runId = newRunId();
  const { executor, runRoot, cliVersion, image, secrets } = await setUpRun(runId, tokenFor);
  let freeze: GatedFreeze | undefined;
  if (batch.gated) {
    const jobs = Object.fromEntries(batch.jobs.filter((j) => j.commit !== undefined).map((j) => [j.id, j.commit as string]));
    const gate = checkGate({ manifestPath, chainPath, root: HERE, imageId: await currentImageId(image), cliVersion, jobs });
    if (!gate.ok) {
      await executor.teardown().catch(() => {});
      throw new Error(`gated batch ${batch.name} refused to start: ${gate.problems.join('; ')}`);
    }
    freeze = gate.freeze;
  }
  const outDir = out ?? join(CACHE_ROOT, 'results', `${batch.name}-${runId}`);
  const ledgerPath = ledgerFile ?? DEFAULT_LEDGER;
  log(`run ${runId}: batch ${batch.name}, ${batch.jobs.length} job(s), CLI ${cliVersion}${freeze ? ', gated' : ''}`);
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
      freeze,
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
  for (const [name, text] of Object.entries(result.transcripts)) {
    writeFileSync(join(outDir, 'transcripts', name), text);
  }
  log(`wrote ${outDir}`);
  return { report, outDir };
}

/**
 * The ids of every job a saved report shows left unstarted by a batch-level stop.
 * @param report - A batch's saved report.
 * @returns The stopped jobs' ids, in the report's own order.
 */
export function jobsNeedingResume(report: Pick<BatchReport, 'jobs'>): string[] {
  return report.jobs.filter((job) => job.stoppedBy !== undefined).map((job) => job.id);
}

/**
 * The subset of a batch that carries only the given job ids, in the full batch's own order and
 * carrying its own name, concurrency, budget, and gating.
 * @param batch - The full parsed batch a stopped run was given.
 * @param jobIds - The ids to keep.
 * @returns The narrowed batch.
 */
export function buildResumeBatch(batch: Batch, jobIds: readonly string[]): Batch {
  const keep = new Set(jobIds);
  return { ...batch, jobs: batch.jobs.filter((job: Job) => keep.has(job.id)) };
}

/**
 * Merge a resumed sub-batch's report back into the original: each resumed job's own report
 * replaces its `stoppedBy` placeholder, the token totals add, and the merged report is verified
 * only when every job, resumed ones included, now verifies clean.
 * @param original - The report a batch-level stop left behind.
 * @param resumed - The report from running only the jobs it stopped before starting.
 * @returns The merged report.
 */
export function mergeResumedReport<T extends BatchReport>(original: T, resumed: BatchReport): T {
  const byId = new Map(resumed.jobs.map((job) => [job.id, job]));
  const jobs = original.jobs.map((job) => byId.get(job.id) ?? job);
  return {
    ...original,
    jobs,
    usage: reportUsage(addUsage(original.usage, resumed.usage)),
    stopReason: resumed.stopReason,
    verified: jobs.every((job) => job.stoppedBy === undefined && job.verified.ok),
  };
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
  const ledgerFile = option(args, '--ledger') ?? DEFAULT_LEDGER;
  if (args.includes('--ledger-total')) {
    process.stdout.write(`${JSON.stringify(ledgerTotal(readLedger(ledgerFile)), null, 2)}\n`);
    return 0;
  }
  if (args.includes('--probe-init')) {
    await probeInit(option(args, '--class') ?? 'docs-only');
    return 0;
  }
  const batchFile = args.find(
    (a) => !a.startsWith('--') && a !== option(args, '--out') && a !== option(args, '--ledger') && a !== option(args, '--resume'),
  );
  if (!batchFile) {
    log(
      'usage: npx tsx scripts/docs-readers/run.ts BATCH_JSON [--out DIR] [--ledger FILE] | BATCH_JSON --resume DIR | --probe-init [--class NAME] | --ledger-total',
    );
    return 2;
  }
  if (args.includes('--resume')) {
    const resumeDir = option(args, '--resume');
    if (!resumeDir) {
      log('usage: npx tsx scripts/docs-readers/run.ts BATCH_JSON --resume DIR');
      return 2;
    }
    const reportPath = join(resumeDir, 'report.json');
    const original = JSON.parse(readFileSync(reportPath, 'utf8')) as FinishedReport;
    const classes = loadClasses();
    const fullBatch = parseBatch(readFileSync(resolve(batchFile), 'utf8'), classes);
    const jobIds = jobsNeedingResume(original);
    if (jobIds.length === 0) {
      log('nothing to resume: no job in the saved report carries stoppedBy');
      return original.verified ? 0 : 1;
    }
    const subBatch = buildResumeBatch(fullBatch, jobIds);
    const { report: resumedReport } = await runBatchFile(resolve(batchFile), {
      out: resumeDir,
      ledgerFile,
      batchOverride: JSON.stringify(subBatch),
    });
    const merged = mergeResumedReport(original, resumedReport);
    writeFileSync(reportPath, `${scrub(JSON.stringify(merged, null, 2), [])}\n`);
    log(`resumed ${jobIds.length} job(s); wrote ${reportPath}`);
    return merged.verified ? 0 : 1;
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
