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
 * A batch whose every job's class is a judge class (`judge-catch`, `judge-adjudicator`, or
 * `judge-agreement`) runs through the judge path instead: the catch judge, the adjudicator, or
 * the agreement read, gated against the freeze manifest's `models.catchJudge`, `.adjudicator`, or
 * `.agreement` in place of `.reader`, with each job's expected items read from the `key.json`
 * beside its packet. A batch mixing a judge class with a reader class, or mixing two judge kinds,
 * is refused before any container starts.
 *
 * The reader token is read from `CAIRN_DOCS_READER_OAUTH_TOKEN`, or from `~/.local/secrets` when
 * that is unset, and is never printed.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeKindForClass, loadClasses, loadEgress, type JudgeKind } from './lib/class-schema.js';
import { parseBatch } from './lib/batch.js';
import { addUsage, appendLedger, ledgerTotal, readLedger, reportUsage } from './lib/ledger.js';
import { mintInstallationToken, type InstallationToken } from './lib/github-app-token.js';
import { createPodmanExecutor, ensureImage, hostCliVersion, imageId as currentImageId, podman, type TeardownResult } from './lib/podman.js';
import { REPORT_SCHEMA, runBatch, runJudgeBatch, type GatedFreeze, type JudgeBatchReport } from './lib/runner.js';
import type { ExpectedItem } from './lib/judge-verify.js';
import { sweepOrphans, writeOwnerMarker } from './lib/sweep.js';
import { findInit } from './lib/transcript.js';
import { scrub } from './lib/scrub.js';
import { gitTrackedFiles, hashFile, loadManifest, verifyTree } from './freeze.js';
import type { ScratchSiteRecord } from './lib/prepare-class.js';
import type { Batch, BatchReport, ClassDecl, InitBaseline, Job } from './lib/types.js';

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

/** A judge batch report with the same wrapper fields `FinishedReport` gives a reader's. */
export interface FinishedJudgeReport extends JudgeBatchReport {
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
 * manifest hashes, the image id, the CLI version, and this batch's own job commits, plus (since
 * neither is caught by a plain commit-vs-manifest comparison) that every job carries both a
 * pinned `commit` and a `prepared` tree, never defaulting to a live copy of the working tree, and
 * that the manifest's own frozen model for this batch's kind is not empty (an empty expected
 * model would silently disable the runner's own init-model check). A judge batch's `prepared`
 * directory (its mounted packet) must never itself carry `key.json`: that file lives beside the
 * packet, never inside its mount, and a job whose `prepared` carries it would hand the judge its
 * own answer key. A gate that passes also requires the post-freeze chain file to exist, since a
 * gated report's stamp always carries a chain head; the returned `chainHead` is taken once, here,
 * from the chain as it stands right now, since every input a batch (or a resume of it) reads must
 * already be chained before it starts, never appended mid-batch. `manifestPath` and `chainPath`
 * are the freeze manifest and the post-freeze chain file; `root` is the directory the manifest's
 * files are relative to; `imageId` and `cliVersion` are the current reader image's digest and the
 * current CLI version; `jobs` are the batch's own jobs to check; `listFiles` returns the current
 * tree's files, relative to `root`, defaulting to the real git file listing (tracked and
 * untracked, ignored paths excluded), overridable in tests; `kind` is the judge kind this batch
 * runs as, when it is a judge batch, which picks `manifest.models[kind]` over `models.reader`.
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
  kind,
}: {
  manifestPath: string;
  chainPath: string;
  root: string;
  imageId: string;
  cliVersion: string;
  jobs: readonly Pick<Job, 'id' | 'commit' | 'prepared'>[];
  listFiles?: (root: string) => string[];
  kind?: JudgeKind;
}): { ok: true; freeze: GatedFreeze } | { ok: false; problems: string[] } {
  if (!existsSync(manifestPath)) return { ok: false, problems: [`no freeze manifest at ${manifestPath}`] };
  const { manifest, hash: manifestHash } = loadManifest(manifestPath);
  const problems: string[] = [];
  const modelKey = kind ?? 'reader';
  const expectedModel = manifest.models[modelKey];
  if (!expectedModel) problems.push(`manifest models.${modelKey} is empty`);
  const commits: Record<string, string> = {};
  for (const job of jobs) {
    if (job.commit === undefined) problems.push(`job ${job.id}: a gated batch requires a pinned commit`);
    else commits[job.id] = job.commit;
    if (job.prepared === undefined) {
      problems.push(`job ${job.id}: a gated batch requires a prepared tree, never the working tree`);
    } else if (kind !== undefined && existsSync(join(job.prepared, 'key.json'))) {
      problems.push(`job ${job.id}: prepared directory ${job.prepared} carries key.json inside its own mount`);
    }
  }
  problems.push(...verifyTree({ manifest, root, imageId, cliVersion, jobs: commits, listFiles }));
  if (!existsSync(chainPath)) problems.push(`no chain file at ${chainPath}`);
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, freeze: { tag: manifest.tag, manifestHash, chainHead: hashFile(chainPath), expectedModel } };
}

/**
 * Classify a batch as a reader batch or one judge kind, from its jobs' own classes: `reader` when
 * no job's class is a judge class, one judge kind when every job's class is that same judge kind,
 * and a refusal when the batch mixes a judge class with a reader class or mixes two judge kinds.
 * A batch this refuses never starts a container.
 * @param batch - The parsed batch.
 * @param classes - The loaded class declarations, keyed by name.
 * @returns The batch's one kind, or every mixed kind found, in the batch's own job order.
 */
export function classifyBatchKind(
  batch: Batch,
  classes: Map<string, ClassDecl>,
): { ok: true; kind: 'reader' | JudgeKind } | { ok: false; problems: string[] } {
  const kinds: ('reader' | JudgeKind)[] = [];
  for (const job of batch.jobs) {
    const decl = classes.get(job.class);
    kinds.push(decl ? (judgeKindForClass(decl.name) ?? 'reader') : 'reader');
  }
  const distinct = [...new Set(kinds)];
  if (distinct.length > 1) {
    return { ok: false, problems: [`batch ${batch.name} mixes job kinds: ${distinct.join(', ')}; every job must share one reader class or one judge kind`] };
  }
  return { ok: true, kind: distinct[0] ?? 'reader' };
}

/**
 * A judge job's expected items, read from the `key.json` a judge packet's builder wrote beside
 * its mounted packet: `job.prepared` is the packet's own mount (`<dir>/packet`), and its key file
 * is `<dir>/key.json`, the sibling `checkGate` already refuses to see duplicated inside the mount.
 * Ids come from the key's own maps, never re-derived: `plants` for a catch packet, `items` for an
 * adjudicator packet, and `findings` plus `catchCalls` (labeled by kind) for an agreement packet.
 * @param preparedDir - The job's `prepared` directory (the packet mount itself, its parent's
 *  `key.json` sibling).
 * @param kind - The judge kind, which picks which of the key's maps to read.
 * @returns Every item this job's rulings must cover exactly once.
 * @throws When the key file is missing or does not parse.
 */
export function expectedItemsFromKey(preparedDir: string, kind: JudgeKind): ExpectedItem[] {
  const keyPath = join(dirname(preparedDir), 'key.json');
  if (!existsSync(keyPath)) throw new Error(`no key.json beside packet ${preparedDir} (expected at ${keyPath})`);
  const key = JSON.parse(readFileSync(keyPath, 'utf8')) as Record<string, unknown>;
  const ids = (map: unknown): string[] => (map && typeof map === 'object' ? Object.keys(map) : []);
  if (kind === 'catchJudge') return ids(key.plants).map((itemId) => ({ itemId }));
  if (kind === 'adjudicator') return ids(key.items).map((itemId) => ({ itemId }));
  return [
    ...ids(key.findings).map((itemId) => ({ itemId, expectedKind: 'finding' as const })),
    ...ids(key.catchCalls).map((itemId) => ({ itemId, expectedKind: 'catchCall' as const })),
  ];
}

/**
 * Run a batch file end to end and write its outputs.
 * The options override the output directory (`out`) and the ledger path (`ledgerFile`), both
 * defaulting under the cache root; `tokenFor` returns the token for each container, which the live
 * credential check uses to swap in an invalid token mid-batch; `batchOverride` is batch JSON to
 * run in place of the file's contents; `manifestPath` and `chainPath` override the freeze
 * manifest and chain a gated batch checks against; `resumeFrom` carries each resumed job's saved
 * attempts and pending cause through to the runner.
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
    resumeFrom,
  }: {
    out?: string;
    ledgerFile?: string;
    tokenFor?: () => string;
    batchOverride?: string;
    manifestPath?: string;
    chainPath?: string;
    resumeFrom?: Parameters<typeof runBatch>[0]['resumeFrom'];
  } = {},
): Promise<{ report: FinishedReport; outDir: string }> {
  const classes = loadClasses();
  const batch = parseBatch(batchOverride ?? readFileSync(batchFile, 'utf8'), classes);
  const baselines = JSON.parse(readFileSync(join(HERE, 'init-baseline.json'), 'utf8')) as Record<string, InitBaseline>;
  const runId = newRunId();
  const { executor, runRoot, cliVersion, image, secrets } = await setUpRun(runId, tokenFor);
  let freeze: GatedFreeze | undefined;
  if (batch.gated) {
    const gate = checkGate({ manifestPath, chainPath, root: HERE, imageId: await currentImageId(image), cliVersion, jobs: batch.jobs });
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
      resumeFrom,
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
 * Run a judge batch file end to end and write its outputs, the judge analogue of `runBatchFile`:
 * the catch judge, the adjudicator, or the agreement read, all headless. `kind` picks the report
 * schema and the manifest's frozen model for gating; each job's expected items come from the
 * `key.json` beside its own packet (`expectedItemsFromKey`), never passed in by hand.
 * @param batchFile - The batch JSON path.
 * @returns The judge batch report, with its teardown result.
 * @throws When the batch is gated and its gate check finds any drifted input, or a job's packet
 *  carries no `key.json`; no container has started by then.
 */
export async function runJudgeBatchFile(
  batchFile: string,
  kind: JudgeKind,
  {
    out,
    ledgerFile,
    tokenFor,
    batchOverride,
    manifestPath = DEFAULT_MANIFEST_PATH,
    chainPath = DEFAULT_CHAIN_PATH,
    resumeFrom,
  }: {
    out?: string;
    ledgerFile?: string;
    tokenFor?: () => string;
    batchOverride?: string;
    manifestPath?: string;
    chainPath?: string;
    resumeFrom?: Parameters<typeof runJudgeBatch>[0]['resumeFrom'];
  } = {},
): Promise<{ report: FinishedJudgeReport; outDir: string }> {
  const classes = loadClasses();
  const batch = parseBatch(batchOverride ?? readFileSync(batchFile, 'utf8'), classes);
  const baselines = JSON.parse(readFileSync(join(HERE, 'init-baseline.json'), 'utf8')) as Record<string, InitBaseline>;
  const runId = newRunId();
  const { executor, runRoot, cliVersion, image, secrets } = await setUpRun(runId, tokenFor);
  let freeze: GatedFreeze | undefined;
  if (batch.gated) {
    const gate = checkGate({ manifestPath, chainPath, root: HERE, imageId: await currentImageId(image), cliVersion, jobs: batch.jobs, kind });
    if (!gate.ok) {
      await executor.teardown().catch(() => {});
      throw new Error(`gated judge batch ${batch.name} refused to start: ${gate.problems.join('; ')}`);
    }
    freeze = gate.freeze;
  }
  const expectedItems: Record<string, ExpectedItem[]> = {};
  for (const job of batch.jobs) {
    if (job.prepared === undefined) throw new Error(`job ${job.id}: a judge job needs a prepared packet directory`);
    expectedItems[job.id] = expectedItemsFromKey(job.prepared, kind);
  }
  const outDir = out ?? join(CACHE_ROOT, 'results', `${batch.name}-${runId}`);
  const ledgerPath = ledgerFile ?? DEFAULT_LEDGER;
  log(`run ${runId}: judge batch ${batch.name} (${kind}), ${batch.jobs.length} job(s), CLI ${cliVersion}${freeze ? ', gated' : ''}`);
  let result: Awaited<ReturnType<typeof runJudgeBatch>>;
  let teardown: FinishedJudgeReport['teardown'];
  const halt = new AbortController();
  const onSignal = () => {
    log('signal received; halting the batch before teardown');
    halt.abort();
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    result = await runJudgeBatch({
      batch,
      classes,
      baselines,
      executor,
      runId,
      kind,
      expectedItems,
      secrets: secrets(),
      ledger: { append: (entry) => appendLedger(ledgerPath, entry) },
      halt: halt.signal,
      freeze,
      resumeFrom,
    });
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    teardown = await executor.teardown();
    if (halt.signal.aborted) process.exit(130);
  }
  const report: FinishedJudgeReport = { ...result.report, cliVersion, runRoot, teardown };
  report.verified = report.verified && teardown.runDirRemoved && teardown.containersLeft === 0 && teardown.networksLeft === 0;
  mkdirSync(join(outDir, 'transcripts'), { recursive: true });
  writeFileSync(join(outDir, 'report.json'), `${scrub(JSON.stringify(report, null, 2), secrets())}\n`);
  for (const [name, text] of Object.entries(result.transcripts)) {
    writeFileSync(join(outDir, 'transcripts', name), text);
  }
  log(`wrote ${outDir}`);
  return { report, outDir };
}

/** The minimal shape `jobsNeedingResume` needs from a saved report, reader or judge, never `Pick<BatchReport, 'jobs'>`. */
interface ResumableReport {
  jobs: readonly { id: string; stoppedBy?: unknown }[];
}

/**
 * The ids of every job a saved report shows left unstarted or unfinished by a batch-level stop.
 * @param report - A batch's saved report, reader or judge.
 * @returns The stopped jobs' ids, in the report's own order.
 */
export function jobsNeedingResume(report: ResumableReport): string[] {
  return report.jobs.filter((job) => job.stoppedBy !== undefined).map((job) => job.id);
}

/**
 * Each stopped job's saved attempts and pending cause, keyed by job id, in the shape `runBatch`'s
 * own `resumeFrom` takes. A job whose report carries no `attempts` (cut on its very first attempt,
 * or never started at all) resumes with none; a report saved before `pendingCause` existed
 * resumes as `initial`, the same cause a job with zero attempts would carry.
 * @param report - A batch's saved report.
 * @returns The resume input for every job `jobsNeedingResume` would name.
 */
export function resumeInputs(report: Pick<BatchReport, 'jobs'>): Parameters<typeof runBatch>[0]['resumeFrom'] {
  const result: NonNullable<Parameters<typeof runBatch>[0]['resumeFrom']> = {};
  for (const job of report.jobs) {
    if (job.stoppedBy === undefined) continue;
    result[job.id] = { attempts: job.attempts ?? [], pendingCause: job.pendingCause ?? 'initial' };
  }
  return result;
}

/**
 * The judge analogue of `resumeInputs`: each stopped job's saved attempts and pending cause, in
 * the shape `runJudgeBatch`'s own `resumeFrom` takes.
 * @param report - A judge batch's saved report.
 * @returns The resume input for every job `jobsNeedingResume` would name.
 */
export function judgeResumeInputs(report: Pick<JudgeBatchReport, 'jobs'>): Parameters<typeof runJudgeBatch>[0]['resumeFrom'] {
  const result: NonNullable<Parameters<typeof runJudgeBatch>[0]['resumeFrom']> = {};
  for (const job of report.jobs) {
    if (job.stoppedBy === undefined) continue;
    result[job.id] = { attempts: job.attempts ?? [], pendingCause: job.pendingCause ?? 'initial' };
  }
  return result;
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
  return { ...batch, jobs: batch.jobs.filter((job) => keep.has(job.id)) };
}

/**
 * Whether a run's own teardown left nothing behind.
 * @param teardown - The teardown result to check.
 * @returns Whether every condition it checks passed.
 */
function teardownClean(teardown: TeardownResult): boolean {
  return teardown.runDirRemoved && teardown.containersLeft === 0 && teardown.networksLeft === 0;
}

/**
 * Merge a resumed sub-batch's report back into the original: each resumed job's own report
 * replaces its `stoppedBy` placeholder, the token totals add, the record's own `teardown` becomes
 * the resumed run's (the more recent of the two), and the merged report is verified only when
 * every job, resumed ones included, now verifies clean and both runs' own teardown was clean.
 * @param original - The report a batch-level stop left behind.
 * @param resumed - The report from running only the jobs it stopped before starting.
 * @returns The merged report.
 */
export function mergeResumedReport(original: FinishedReport, resumed: FinishedReport): FinishedReport {
  const byId = new Map(resumed.jobs.map((job) => [job.id, job]));
  const jobs = original.jobs.map((job) => byId.get(job.id) ?? job);
  return {
    ...original,
    jobs,
    usage: reportUsage(addUsage(original.usage, resumed.usage)),
    stopReason: resumed.stopReason,
    teardown: resumed.teardown,
    verified: jobs.every((job) => job.stoppedBy === undefined && job.verified.ok) && teardownClean(original.teardown) && teardownClean(resumed.teardown),
  };
}

/**
 * The judge analogue of `mergeResumedReport`.
 * @param original - The judge report a batch-level stop left behind.
 * @param resumed - The judge report from running only the jobs it stopped before starting.
 * @returns The merged report.
 */
export function mergeResumedJudgeReport(original: FinishedJudgeReport, resumed: FinishedJudgeReport): FinishedJudgeReport {
  const byId = new Map(resumed.jobs.map((job) => [job.id, job]));
  const jobs = original.jobs.map((job) => byId.get(job.id) ?? job);
  return {
    ...original,
    jobs,
    usage: reportUsage(addUsage(original.usage, resumed.usage)),
    stopReason: resumed.stopReason,
    teardown: resumed.teardown,
    verified: jobs.every((job) => job.stoppedBy === undefined && job.verified.ok) && teardownClean(original.teardown) && teardownClean(resumed.teardown),
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
  const classes = loadClasses();
  const fullBatch = parseBatch(readFileSync(resolve(batchFile), 'utf8'), classes);
  const classification = classifyBatchKind(fullBatch, classes);
  if (!classification.ok) {
    log(classification.problems.join('; '));
    return 2;
  }
  const { kind } = classification;

  if (args.includes('--resume')) {
    const resumeDir = option(args, '--resume');
    if (!resumeDir) {
      log('usage: npx tsx scripts/docs-readers/run.ts BATCH_JSON --resume DIR');
      return 2;
    }
    const reportPath = join(resumeDir, 'report.json');
    if (kind === 'reader') {
      const original = JSON.parse(readFileSync(reportPath, 'utf8')) as FinishedReport;
      if (fullBatch.name !== original.batch) {
        log(`batch name mismatch: ${resumeDir} holds a report for "${original.batch}", but ${batchFile} names "${fullBatch.name}"`);
        return 2;
      }
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
        resumeFrom: resumeInputs(original),
      });
      const merged = mergeResumedReport(original, resumedReport);
      writeFileSync(reportPath, `${scrub(JSON.stringify(merged, null, 2), [])}\n`);
      log(`resumed ${jobIds.length} job(s); wrote ${reportPath}`);
      return merged.verified ? 0 : 1;
    }
    const original = JSON.parse(readFileSync(reportPath, 'utf8')) as FinishedJudgeReport;
    if (fullBatch.name !== original.batch) {
      log(`batch name mismatch: ${resumeDir} holds a report for "${original.batch}", but ${batchFile} names "${fullBatch.name}"`);
      return 2;
    }
    const jobIds = jobsNeedingResume(original);
    if (jobIds.length === 0) {
      log('nothing to resume: no job in the saved report carries stoppedBy');
      return original.verified ? 0 : 1;
    }
    const subBatch = buildResumeBatch(fullBatch, jobIds);
    const { report: resumedReport } = await runJudgeBatchFile(resolve(batchFile), kind, {
      out: resumeDir,
      ledgerFile,
      batchOverride: JSON.stringify(subBatch),
      resumeFrom: judgeResumeInputs(original),
    });
    const merged = mergeResumedJudgeReport(original, resumedReport);
    writeFileSync(reportPath, `${scrub(JSON.stringify(merged, null, 2), [])}\n`);
    log(`resumed ${jobIds.length} job(s); wrote ${reportPath}`);
    return merged.verified ? 0 : 1;
  }

  if (kind === 'reader') {
    const { report } = await runBatchFile(resolve(batchFile), { out: option(args, '--out'), ledgerFile });
    for (const job of report.jobs) {
      log(`${job.id}: ${job.outcome}${job.abortReason ? ` (${job.abortReason})` : ''}, verified ${job.verified.ok}, counted ${job.usage.counted}`);
    }
    log(`stopReason ${report.stopReason}; counted ${report.usage.counted}, cache read ${report.usage.cacheRead}; teardown ${JSON.stringify(report.teardown)}`);
    return report.verified ? 0 : 1;
  }
  const { report } = await runJudgeBatchFile(resolve(batchFile), kind, { out: option(args, '--out'), ledgerFile });
  for (const job of report.jobs) {
    log(`${job.id}: ${job.outcome}${job.abortReason ? ` (${job.abortReason})` : ''}, verified ${job.verified.ok}, counted ${job.usage.counted}, rulings ${job.rulings.length}`);
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
