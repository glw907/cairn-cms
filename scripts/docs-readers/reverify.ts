#!/usr/bin/env -S npx tsx
/**
 * Offline re-verification. Re-derives `pagesRead` and re-checks every quote from a batch's own
 * saved, scrubbed transcripts, against the CURRENT prepared trees, without re-running any reader.
 * This is what lets a verification-logic fix (`derivePagesRead`, `verifyQuote`, `effectiveCwd`)
 * be checked against an already-completed batch's real transcripts, rather than costing a fresh
 * reader run to prove.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/reverify.ts BATCH_JSON RESULTS_DIR
 *
 * `BATCH_JSON` is the batch file the results came from (its jobs carry the `docsSet` and
 * `prepared` fields the saved report itself does not); `RESULTS_DIR` is a batch output directory
 * (holding `report.json` and `transcripts/`). Writes `RESULTS_DIR/report.reverified.json`, never
 * the original, and prints each job's before and after verified status, and any problems the
 * after status carries, to stdout.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClasses } from './lib/class-schema.js';
import { parseBatch } from './lib/batch.js';
import { derivePagesRead, effectiveCwd, parseStream, readerReport, toolCalls } from './lib/transcript.js';
import { verifyReport } from './lib/verify.js';
import type { BatchReport, InitCheck, Job, JobReport } from './lib/types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** The note a re-verified job's problems carry when its init check is a carried-over verdict. */
export const PRESERVED_INIT_NOTE = 're-verify does not recheck init; carried over from the original report';

/** The note a re-verified job's problems carry when its canary check is a carried-over verdict. */
export const PRESERVED_CANARY_NOTE = 're-verify does not recheck canaries; carried over from the original report';

/**
 * The prepared tree a job's quotes resolve against: its own `prepared` field when the batch names
 * one (a `contents: "prepared"` class), or `repoRoot` itself, since a `contents: "docs-set"`
 * class's pages are copied straight from there.
 * @param prepared - The batch job's own `prepared` field.
 * @param repoRoot - The checkout a `docs-set` class's pages are copied from.
 * @returns The tree to verify quotes against.
 */
export function reverifyRoot(prepared: string | undefined, repoRoot: string): string {
  if (!prepared) return repoRoot;
  return isAbsolute(prepared) ? prepared : join(repoRoot, prepared);
}

/**
 * Re-derive one job's verified status from its saved transcript. Its init and canary verdicts are
 * carried over from the original report unchanged, since re-verification only re-runs the
 * transcript-derived parts (pages read and quote verification) a fix to that logic would change.
 * `job` is the saved report's own job entry; `batchJob` is that job's definition in the batch file
 * (its `docsSet` and `prepared`); `transcriptText` is the job's saved, scrubbed transcript;
 * `repoRoot` is the checkout a `docs-set` class's pages resolve from.
 * @returns The job's report, with `pagesRead`, `quotes`, and `verified` freshly recomputed.
 */
export function reverifyJob({
  job,
  batchJob,
  transcriptText,
  repoRoot,
}: {
  job: JobReport;
  batchJob: Job;
  transcriptText: string;
  repoRoot: string;
}): JobReport {
  const { events } = parseStream(transcriptText);
  const calls = toolCalls(events);
  const report = readerReport(events);
  const pagesRead = derivePagesRead(calls, batchJob.docsSet);
  const cwd = effectiveCwd(calls);
  const root = reverifyRoot(batchJob.prepared, repoRoot);
  const init: InitCheck = { ok: job.verified.init, problems: job.verified.init ? [] : [PRESERVED_INIT_NOTE] };
  const canariesFound: string[] = job.verified.canaries ? [] : [PRESERVED_CANARY_NOTE];
  const verified = verifyReport({ report, pagesRead, docsSet: batchJob.docsSet, root, init, canariesFound, cwd });
  return { ...job, pagesRead, quotes: verified.quotes, verified };
}

/**
 * The command-line entry point.
 * @param args - The arguments after the script name.
 * @returns The process exit code.
 */
async function main(args: string[]): Promise<number> {
  const [batchFile, resultsDir] = args;
  if (!batchFile || !resultsDir) {
    process.stderr.write('usage: npx tsx scripts/docs-readers/reverify.ts BATCH_JSON RESULTS_DIR\n');
    return 2;
  }
  const classes = loadClasses();
  const batch = parseBatch(readFileSync(resolve(batchFile), 'utf8'), classes);
  const jobsById = new Map(batch.jobs.map((j) => [j.id, j]));
  const reportPath = join(resultsDir, 'report.json');
  const original = JSON.parse(readFileSync(reportPath, 'utf8')) as BatchReport;

  const rewritten: JobReport[] = [];
  for (const job of original.jobs) {
    const batchJob = jobsById.get(job.id);
    const transcriptPath = join(resultsDir, 'transcripts', `${job.id}.jsonl`);
    if (!batchJob || !existsSync(transcriptPath)) {
      process.stdout.write(`${job.id}: SKIPPED (${!batchJob ? `not found in ${batchFile}` : 'no saved transcript'})\n`);
      rewritten.push(job);
      continue;
    }
    const before = job.verified.ok;
    const reverified = reverifyJob({ job, batchJob, transcriptText: readFileSync(transcriptPath, 'utf8'), repoRoot: REPO_ROOT });
    const after = reverified.verified.ok;
    const problems = after ? '' : `\n  ${reverified.verified.problems.join('\n  ')}`;
    process.stdout.write(`${job.id}: ${before ? 'PASS' : 'FAIL'} -> ${after ? 'PASS' : 'FAIL'}${problems}\n`);
    rewritten.push(reverified);
  }

  const outPath = join(resultsDir, 'report.reverified.json');
  writeFileSync(outPath, `${JSON.stringify({ ...original, jobs: rewritten }, null, 2)}\n`);
  process.stdout.write(`wrote ${outPath}\n`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    },
  );
}
