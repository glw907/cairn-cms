#!/usr/bin/env -S npx tsx
/**
 * Builds a judge packet: a mounted directory holding exactly what a catch-judge, adjudicator, or
 * agreement run is allowed to see, plus a key file outside the mount that joins the packet's
 * opaque ids back to runs, fields, and plants. A production builder reads every input from its own
 * source (a saved report, a batch file, a criteria or plant record, a page at its pinned commit
 * via `git show`), never from pre-extracted content a caller hands it, and records each source's
 * path and sha256, the run id, the job id, and the attempt in the key file, so a later step can
 * trace any item back to where it came from. Every builder reads its inputs by allow-list, never
 * by block-list, so a field the run report added later (a model id, a run id, `modelUsage`,
 * `ruleCandidates[]`) can never reach a packet by accident.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/judge-packets.ts catch --out DIR --spec SPEC.json
 *   npx tsx scripts/docs-readers/judge-packets.ts adjudicator --out DIR --spec SPEC.json
 *   npx tsx scripts/docs-readers/judge-packets.ts agreement --out DIR --spec SPEC.json
 *
 * `--out DIR` is the packet's parent: the mounted packet lands at `DIR/packet/`, and the key file
 * at `DIR/key.json`, outside the mount so a judge's container never sees it. `--spec` is a JSON
 * file matching the kind's own source-spec shape (below), with `outDir` omitted; `repoRoot`
 * defaults to this checkout when the spec omits it.
 */
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { preparePlanterExport, spawnRunner, type CommandRunner } from './lib/prepare-class.js';
import { toBlockedEntries } from './lib/transcript.js';
import type { ExpectedItem } from './lib/judge-verify.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const decoder = new TextDecoder('utf-8');

/**
 * Hash a string's UTF-8 bytes.
 * @param text - The text to hash.
 * @returns Its sha256, as hex.
 */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Hash a file's own bytes, reading it fresh.
 * @param path - The file to hash.
 * @returns Its sha256, as hex.
 */
function sha256File(path: string): string {
  return sha256(readFileSync(path, 'utf8'));
}

/**
 * Write a value as pretty-printed JSON with a trailing newline.
 * @param path - The file to write.
 * @param value - The value to serialize.
 */
function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Reject a plant or claim page path the packet must never write outside its own `pages/` tree: no
 * absolute path, and no `..` segment.
 * @param page - A page path from a plant or claim source.
 * @throws When the path is absolute or climbs out of the tree.
 */
function assertSafeRelativePagePath(page: string): void {
  if (isAbsolute(page)) throw new Error(`page path "${page}" must be relative, never absolute`);
  if (page.split('/').includes('..')) throw new Error(`page path "${page}" must not contain ".."`);
}

/**
 * A saved batch report, a job id inside it, and which attempt to read: the source for one run's
 * catch fields, never pre-extracted content. `attempt` is 1-based and defaults to the job's final
 * attempt (or its own top-level fields, for a saved report from before `attempts[]` existed).
 */
export interface RunSource {
  reportPath: string;
  jobId: string;
  attempt?: number;
}

/** One run source, resolved: its allow-listed catch fields, plus the traceability the key file records. */
export interface ResolvedRunSource {
  runFields: RawRunFields;
  runId: string;
  attempt: number;
  reportHash: string;
}

/**
 * Read one job's catch fields out of a saved batch report, at the given (or final) attempt.
 * Reuses `toBlockedEntries`, the same normalizer `lib/transcript.ts` uses for a saved report's
 * `stalls[]`/`assumed[]`, so a pass 1 report's plain-string entries carry their text through
 * instead of resolving to nothing.
 * @returns The run's allow-listed fields and its traceability.
 * @throws When the report holds no such job, or no such attempt.
 */
export function resolveRunSource({ reportPath, jobId, attempt }: RunSource): ResolvedRunSource {
  const raw = readFileSync(reportPath, 'utf8');
  const report = JSON.parse(raw) as { runId?: unknown; jobs?: unknown };
  const jobs = Array.isArray(report.jobs) ? (report.jobs as Record<string, unknown>[]) : [];
  const job = jobs.find((j) => j.id === jobId);
  if (!job) throw new Error(`report ${reportPath}: no job "${jobId}"`);
  const attempts = Array.isArray(job.attempts) ? (job.attempts as Record<string, unknown>[]) : undefined;
  let attemptNumber: number;
  let fields: Record<string, unknown>;
  if (attempts && attempts.length > 0) {
    attemptNumber = attempt ?? attempts.length;
    const found = attempts[attemptNumber - 1];
    if (!found) throw new Error(`report ${reportPath}: job "${jobId}" has no attempt ${attemptNumber}`);
    fields = found;
  } else {
    attemptNumber = attempt ?? 1;
    fields = job;
  }
  return {
    runFields: {
      stalls: toBlockedEntries(fields.stalls),
      assumed: toBlockedEntries(fields.assumed),
      diverged: Array.isArray(fields.diverged) ? (fields.diverged as RawDivergedEntry[]) : [],
      checks: Array.isArray(fields.checks) ? (fields.checks as unknown[]) : [],
    },
    runId: typeof report.runId === 'string' ? report.runId : '',
    attempt: attemptNumber,
    reportHash: sha256(raw),
  };
}

/**
 * Read one job's own text out of a batch file (a saved report never echoes it back).
 * @param batchPath - The batch JSON the job came from.
 * @param jobId - The job id whose text to read.
 * @returns The job's text and the batch file's own hash.
 * @throws When the batch holds no such job.
 */
function resolveJobText(batchPath: string, jobId: string): { text: string; hash: string } {
  const raw = readFileSync(batchPath, 'utf8');
  const batch = JSON.parse(raw) as { jobs?: unknown };
  const jobs = Array.isArray(batch.jobs) ? (batch.jobs as Record<string, unknown>[]) : [];
  const job = jobs.find((j) => j.id === jobId);
  if (!job || typeof job.job !== 'string') throw new Error(`batch ${batchPath}: no job "${jobId}" carrying job text`);
  return { text: job.job, hash: sha256(raw) };
}

/**
 * Read one page's content at a pinned commit, via `git show`, never the working tree.
 * @param repoRoot - The checkout to read from.
 * @param commit - The pinned commit id.
 * @param page - The page's repository-relative path.
 * @param runner - The command runner; overridden in tests.
 * @returns The page's content and its own hash.
 * @throws When `git show` fails.
 */
function readPageAtCommit(repoRoot: string, commit: string, page: string, runner: CommandRunner = spawnRunner): { content: string; hash: string } {
  const result = runner('git', ['show', `${commit}:${page}`], { cwd: repoRoot });
  if (result.status !== 0) throw new Error(`git show ${commit}:${page} failed: ${result.stderr}`);
  const content = decoder.decode(result.stdout);
  return { content, hash: sha256(content) };
}

/**
 * The published docs roots at a pinned commit: the `docs`-prefixed entries of `package.json`'s own
 * `files` array, read from that commit, never hard-coded. `CHANGELOG.md` and every other
 * non-`docs/` entry (`dist`, `migrations`, `skills`, `claude`, ...) do not count.
 * @param repoRoot - The checkout to read from.
 * @param commit - The pinned commit id.
 * @param runner - The command runner; overridden in tests.
 * @returns Each published root, in `package.json`'s own order.
 * @throws When `git show` fails, or `package.json` carries no `files` array.
 */
export function publishedRootsFromPackageJson(repoRoot: string, commit: string, runner: CommandRunner = spawnRunner): string[] {
  const result = runner('git', ['show', `${commit}:package.json`], { cwd: repoRoot });
  if (result.status !== 0) throw new Error(`git show ${commit}:package.json failed: ${result.stderr}`);
  const pkg = JSON.parse(decoder.decode(result.stdout)) as { files?: unknown };
  const files = Array.isArray(pkg.files) ? pkg.files.filter((f): f is string => typeof f === 'string') : [];
  return files.filter((f) => f === 'docs' || f.startsWith('docs/'));
}

/**
 * Prune an exported tree's `docs/` subtree down to exactly the published roots: a file or
 * directory that is not itself a published root, and does not sit on the path to one, is removed.
 * Everything outside `docs/` (the code, under the planter-export exclusions already applied) is
 * untouched.
 * @param treeDir - The exported tree's root.
 * @param publishedRoots - The roots to keep, repository-relative.
 */
function pruneUnpublishedDocs(treeDir: string, publishedRoots: readonly string[]): void {
  const docsDir = join(treeDir, 'docs');
  if (!existsSync(docsDir)) return;
  const isExactRoot = (rel: string) => publishedRoots.includes(rel);
  const isAncestorOfRoot = (rel: string) => publishedRoots.some((root) => root === rel || root.startsWith(`${rel}/`));
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const childRel = `${rel}/${name}`;
      if (isExactRoot(childRel)) continue;
      if (statSync(full).isDirectory()) {
        if (isAncestorOfRoot(childRel)) walk(full, childRel);
        else rmSync(full, { recursive: true, force: true });
      } else {
        rmSync(full, { force: true });
      }
    }
  };
  walk(docsDir, 'docs');
}

/**
 * Where one job's plants come from: a development plant, joined to its own criterion by id, never
 * by page (`fixtures/dev-plants.json`'s and `prompts/criteria/dev-plants.json`'s path forms
 * differ for the scripter's bundle jobs); a held-out defect, named by its explicit ids; or a real
 * plant record, filtered to one job.
 */
export type JobPlantSource =
  | { kind: 'dev'; criteriaPath: string; indexPath: string; jobId: string }
  | { kind: 'heldout'; criteriaPath: string; ids: readonly string[] }
  | { kind: 'planted'; plantsPath: string; jobId: string };

/** One development or real plant record's id, page, and (for a held-out defect) its own pre-fix commit. */
interface PlantRef {
  id: string;
  page: string;
  commit?: string;
}

/**
 * The ids and pages this job's plants carry, from whichever source names them.
 * @param source - Where this job's plants are listed.
 * @returns Each plant's id, page, and, for a held-out defect, its own commit.
 */
function resolveJobPlantRefs(source: JobPlantSource): PlantRef[] {
  if (source.kind === 'dev') {
    const index = JSON.parse(readFileSync(source.indexPath, 'utf8')) as Array<{ id: string; job: string; page: string }>;
    return index.filter((entry) => entry.job === source.jobId).map((entry) => ({ id: entry.id, page: entry.page }));
  }
  if (source.kind === 'heldout') {
    const criteria = JSON.parse(readFileSync(source.criteriaPath, 'utf8')) as Array<{ id: string; page: string; commit: string }>;
    const byId = new Map(criteria.map((entry) => [entry.id, entry]));
    return source.ids.map((id) => {
      const entry = byId.get(id);
      if (!entry) throw new Error(`heldout criteria ${source.criteriaPath}: no entry "${id}"`);
      return { id, page: entry.page, commit: entry.commit };
    });
  }
  const plants = JSON.parse(readFileSync(source.plantsPath, 'utf8')) as Array<{ id: string; job: string; page: string }>;
  return plants.filter((entry) => entry.job === source.jobId).map((entry) => ({ id: entry.id, page: entry.page }));
}

/**
 * One plant or defect's `subject`, `criterion`, and `nearMiss`, by id.
 * @param path - The criteria or plant record file.
 * @param id - The plant or defect id.
 * @returns The three fields, and nothing else from the record (never `original`, `planted`, `proof`, or `type`).
 * @throws When the file carries no entry with that id.
 */
function readCriterionById(path: string, id: string): { subject: string; criterion: string; nearMiss: string } {
  const entries = JSON.parse(readFileSync(path, 'utf8')) as Array<{ id: string; subject: string; criterion: string; nearMiss: string }>;
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error(`criteria ${path}: no entry "${id}"`);
  return { subject: entry.subject, criterion: entry.criterion, nearMiss: entry.nearMiss };
}

/**
 * Every plant a job's catch packet must carry, fully resolved: the criterion, joined by id, and
 * the page content, read at the packet's pinned commit (or, for a held-out defect, its own).
 * @param source - The job's plant source.
 * @param repoRoot - The checkout to read pages from.
 * @param defaultCommit - The commit a plant without its own override reads its page at.
 * @param runner - The command runner; overridden in tests.
 * @returns Every plant, ready for the packet, and the sha256 of every source file and page this
 *  read.
 */
function resolvePlantsForJob(
  source: JobPlantSource,
  repoRoot: string,
  defaultCommit: string,
  runner: CommandRunner = spawnRunner,
): { plants: CatchPlantInput[]; inputs: Record<string, string> } {
  const refs = resolveJobPlantRefs(source);
  const inputs: Record<string, string> = {};
  const criteriaPath = source.kind === 'planted' ? source.plantsPath : source.criteriaPath;
  inputs[criteriaPath] = sha256File(criteriaPath);
  if (source.kind === 'dev') inputs[source.indexPath] = sha256File(source.indexPath);
  const plants: CatchPlantInput[] = refs.map((ref) => {
    const { subject, criterion, nearMiss } = readCriterionById(criteriaPath, ref.id);
    const commit = ref.commit ?? defaultCommit;
    const { content, hash } = readPageAtCommit(repoRoot, commit, ref.page, runner);
    inputs[`page@${commit}:${ref.page}`] = hash;
    return { plantId: ref.id, subject, criterion, nearMiss, page: ref.page, pageContent: content };
  });
  return { plants, inputs };
}

/**
 * Where one agreement item's single plant comes from: a development plant or a held-out defect
 * (its criterion read from the frozen criteria file), or a real plant (read from the plant
 * record). Unlike `JobPlantSource`, this names one id directly, since an agreement item is one
 * sampled catch call, not a whole job's worth.
 */
export type SinglePlantSource = { id: string } & ({ kind: 'dev' | 'heldout'; criteriaPath: string } | { kind: 'planted'; plantsPath: string });

/**
 * One plant or defect's criterion, by its single-plant source.
 * @param source - Which single plant or defect to read.
 * @returns The three fields, and the criteria file's own path (for the key file's `inputs`).
 */
function resolveSinglePlantCriterion(source: SinglePlantSource): { subject: string; criterion: string; nearMiss: string; sourcePath: string } {
  const path = source.kind === 'planted' ? source.plantsPath : source.criteriaPath;
  return { ...readCriterionById(path, source.id), sourcePath: path };
}

/** One plant entry as a catch or held-out packet carries it: never `original`, `planted`, `proof`, or `type`. */
export interface PlantEntry {
  id: string;
  subject: string;
  criterion: string;
  nearMiss: string;
  /** The plant's own page, given only when the job's plants span more than one page. */
  page?: string;
}

/** One catch-field item, allow-listed from a run's `stalls[]`, `assumed[]`, `diverged[]`, or `checks[]`. */
export interface CatchFieldItem {
  id: string;
  field: 'stalls' | 'assumed' | 'diverged' | 'checks';
  text: string;
  blockedBy: string | null;
  quote?: { path: string; line: number; text: string };
  didInstead?: string;
  why?: string;
}

/** A run's catch-field items, grouped by field; `checks` is present only when the run filled it. */
export interface RunCatchFields {
  stalls: CatchFieldItem[];
  assumed: CatchFieldItem[];
  diverged: CatchFieldItem[];
  checks?: CatchFieldItem[];
}

/** One `stalls[]`/`assumed[]` entry, in the shape a saved report or a live run carries. */
export interface RawBlockedEntry {
  text: string;
  blockedBy: string | null;
}

/** One `diverged[]` entry, in the shape a saved report or a live run carries. */
export interface RawDivergedEntry {
  quote: { path: string; line: unknown; text: unknown };
  didInstead: string;
  why: string;
  blockedBy: string | null;
}

/**
 * A run's raw catch fields, the allow-listed source `buildCatchFields` reads from. `stalls[]` and
 * `assumed[]` accept a plain string too, the shape a report saved before those fields carried
 * `blockedBy` used; `buildCatchFields` normalizes either form.
 */
export interface RawRunFields {
  stalls?: ReadonlyArray<RawBlockedEntry | string>;
  assumed?: ReadonlyArray<RawBlockedEntry | string>;
  diverged?: RawDivergedEntry[];
  checks?: unknown[];
}

/** Where one opaque catch-field item id came from in the source run, recorded in the key file. */
export interface CatchFieldItemLocation {
  field: 'stalls' | 'assumed' | 'diverged' | 'checks';
  sourceIndex: number;
}

/**
 * Turn a run's raw catch fields into opaque-id'd, allow-listed packet items. `ruleCandidates[]`,
 * `outcome`, `pagesRead`, `denials`, `usage`, `modelUsage`, the model, and the run and batch names
 * never reach this function's input shape at all, so they cannot leak by omission here.
 * @param run - The run's raw `stalls[]`, `assumed[]`, `diverged[]`, and `checks[]`.
 * @param idPrefix - The opaque id prefix, distinct per packet section.
 * @returns The allow-listed fields, and the key mapping each opaque id back to its source location.
 */
export function buildCatchFields(run: RawRunFields, idPrefix = 'item'): { fields: RunCatchFields; key: Record<string, CatchFieldItemLocation> } {
  const key: Record<string, CatchFieldItemLocation> = {};
  let n = 0;
  const nextId = (field: CatchFieldItemLocation['field'], sourceIndex: number): string => {
    n += 1;
    const id = `${idPrefix}-${n}`;
    key[id] = { field, sourceIndex };
    return id;
  };
  const normalizedStalls = toBlockedEntries(run.stalls ?? []);
  const normalizedAssumed = toBlockedEntries(run.assumed ?? []);
  const stalls = normalizedStalls.map((entry, i) => ({ id: nextId('stalls', i), field: 'stalls' as const, text: entry.text, blockedBy: entry.blockedBy }));
  const assumed = normalizedAssumed.map((entry, i) => ({ id: nextId('assumed', i), field: 'assumed' as const, text: entry.text, blockedBy: entry.blockedBy }));
  const diverged = (run.diverged ?? []).map((entry, i) => ({
    id: nextId('diverged', i),
    field: 'diverged' as const,
    text: entry.why,
    blockedBy: entry.blockedBy,
    quote: { path: entry.quote.path, line: Number(entry.quote.line), text: String(entry.quote.text) },
    didInstead: entry.didInstead,
    why: entry.why,
  }));
  const rawChecks = run.checks ?? [];
  const checks = rawChecks.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const text = typeof e.text === 'string' ? e.text : JSON.stringify(entry);
    const blockedBy = typeof e.blockedBy === 'string' ? e.blockedBy : null;
    return { id: nextId('checks', i), field: 'checks' as const, text, blockedBy };
  });
  return { fields: { stalls, assumed, diverged, ...(checks.length > 0 ? { checks } : {}) }, key };
}

/** One plant this packet documents, plus the page content it was planted on (as the reader saw it). */
export interface CatchPlantInput {
  /** The real plant or held-out defect id (`P01`, `D01`, ...), recorded only in the key file. */
  plantId: string;
  subject: string;
  criterion: string;
  nearMiss: string;
  /** The plant's own page, its real repository-relative path (never a placeholder), so a report's own quotes resolve against it. */
  page: string;
  pageContent: string;
}

/** Which report, job, attempt, and run a packet's catch fields trace back to. */
export interface ReportTrace {
  path: string;
  jobId: string;
  attempt: number;
  runId: string;
}

/** The key file a catch packet's builder writes outside the mount. */
export interface CatchPacketKey {
  kind: 'catch';
  report: ReportTrace;
  /** Every plant's opaque id, mapped back to its real plant id. */
  plants: Record<string, { plantId: string }>;
  /** Every catch-field item's opaque id, mapped back to its source location. */
  items: Record<string, CatchFieldItemLocation>;
  /** The sha256 of every input this build read. */
  inputs: Record<string, string>;
}

/**
 * Build one catch packet from already-resolved content: the plant entries, the planted page(s),
 * the job text, and one run's catch fields, in a fresh directory. This is the low-level escape
 * hatch `buildCatchPacket` itself calls after resolving its sources; a fixture in a test that does
 * not want to spin up a real report, batch, or git commit for every case may call it directly, but
 * a production caller always goes through `buildCatchPacket`. Works the same for a development
 * plant, a real plant, and a held-out defect: none of them carry `original`, `planted`, `proof`,
 * or `type` into the packet. `report` is the report path, job id, attempt, and run id this
 * packet's fields trace to; `extraInputs` folds extra source hashes (a batch file, a criteria
 * file, a page at a commit) into the key's `inputs`, alongside the job text this function hashes
 * itself.
 * @returns The key file's own contents and the expected items a catch judge must rule.
 */
export function buildCatchPacketFromResolved({
  outDir,
  jobText,
  plants,
  run,
  report,
  extraInputs = {},
}: {
  outDir: string;
  jobText: string;
  plants: readonly CatchPlantInput[];
  run: RawRunFields;
  report: ReportTrace;
  extraInputs?: Record<string, string>;
}): { key: CatchPacketKey; expected: ExpectedItem[] } {
  rmSync(outDir, { recursive: true, force: true });
  const packetDir = join(outDir, 'packet');
  mkdirSync(join(packetDir, 'pages'), { recursive: true });

  const distinctPages = new Set(plants.map((p) => p.page)).size;
  const plantEntries: PlantEntry[] = [];
  const plantKey: Record<string, { plantId: string }> = {};
  const inputs: Record<string, string> = { ...extraInputs };
  const written = new Set<string>();
  plants.forEach((plant, i) => {
    assertSafeRelativePagePath(plant.page);
    const id = `plant-${i + 1}`;
    plantEntries.push({ id, subject: plant.subject, criterion: plant.criterion, nearMiss: plant.nearMiss, ...(distinctPages > 1 ? { page: plant.page } : {}) });
    plantKey[id] = { plantId: plant.plantId };
    if (!written.has(plant.page)) {
      written.add(plant.page);
      const dest = join(packetDir, 'pages', plant.page);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, plant.pageContent);
      inputs[`pages/${plant.page}`] = sha256(plant.pageContent);
    }
  });

  const { fields: items, key: itemKey } = buildCatchFields(run);
  writeJson(join(packetDir, 'job.json'), { text: jobText });
  writeJson(join(packetDir, 'plants.json'), plantEntries);
  writeJson(join(packetDir, 'items.json'), items);
  writeJson(join(packetDir, 'index.json'), { kind: 'catch', job: 'job.json', plants: 'plants.json', items: 'items.json', pages: 'pages/' });
  inputs['job.json'] = sha256(jobText);

  const key: CatchPacketKey = { kind: 'catch', report, plants: plantKey, items: itemKey, inputs };
  writeJson(join(outDir, 'key.json'), key);
  return { key, expected: plantEntries.map((p) => ({ itemId: p.id })) };
}

/**
 * Build one catch packet, reading every input from its own source: the job's text from `batchPath`,
 * one run's catch fields from `reportPath` (at `attempt`, default final), and every plant's
 * criterion and page content from `plants`, at `commit` unless a held-out entry overrides it.
 * @returns The key file's own contents and the expected items a catch judge must rule.
 */
export function buildCatchPacket({
  outDir,
  repoRoot,
  batchPath,
  reportPath,
  jobId,
  attempt,
  plants,
  commit,
  runner,
}: {
  outDir: string;
  repoRoot: string;
  batchPath: string;
  reportPath: string;
  jobId: string;
  attempt?: number;
  plants: JobPlantSource;
  commit: string;
  runner?: CommandRunner;
}): { key: CatchPacketKey; expected: ExpectedItem[] } {
  const { text: jobText, hash: batchHash } = resolveJobText(batchPath, jobId);
  const run = resolveRunSource({ reportPath, jobId, attempt });
  const { plants: resolvedPlants, inputs: plantInputs } = resolvePlantsForJob(plants, repoRoot, commit, runner);
  return buildCatchPacketFromResolved({
    outDir,
    jobText,
    plants: resolvedPlants,
    run: run.runFields,
    report: { path: reportPath, jobId, attempt: run.attempt, runId: run.runId },
    extraInputs: { [batchPath]: batchHash, [reportPath]: run.reportHash, ...plantInputs },
  });
}

/** The key file an adjudicator packet's builder writes outside the mount. */
export interface AdjudicatorPacketKey {
  kind: 'adjudicator';
  report: ReportTrace;
  items: Record<string, CatchFieldItemLocation>;
  /** Item ids the mechanical harness filter (`harness-filter.ts`, or a caller-supplied stand-in before it merges) excluded before this build. */
  excluded: string[];
  treeCommit: string;
  treeAbsent: string[];
  inputs: Record<string, string>;
}

/**
 * Build one adjudicator packet, reading every input from its own source: the job's text from
 * `batchPath`, one control run's catch fields from `reportPath` (minus whatever `excludedKeys`
 * names, standing in for `harness-filter.ts` before it merges into this lane), and the published
 * docs tree and code at `commit`. The published roots are the `docs`-prefixed entries of
 * `package.json`'s own `files` array at `commit` (`publishedRootsFromPackageJson`), never
 * hard-coded; `publishedRoots` overrides the derivation, for a test that does not want a real
 * `package.json` at its fixture commit. The tree is pruned to exactly those roots plus the code.
 * @returns The key file's own contents and the expected items an adjudicator must rule.
 */
export function buildAdjudicatorPacket({
  outDir,
  repoRoot,
  batchPath,
  reportPath,
  jobId,
  attempt,
  pageList,
  absentList,
  excludedKeys = [],
  commit,
  runner,
  publishedRoots,
}: {
  outDir: string;
  repoRoot: string;
  batchPath: string;
  reportPath: string;
  jobId: string;
  attempt?: number;
  pageList: readonly string[];
  absentList: readonly string[];
  excludedKeys?: readonly CatchFieldItemLocation[];
  commit: string;
  runner?: CommandRunner;
  publishedRoots?: readonly string[];
}): { key: AdjudicatorPacketKey; expected: ExpectedItem[] } {
  const { text: jobText, hash: batchHash } = resolveJobText(batchPath, jobId);
  const run = resolveRunSource({ reportPath, jobId, attempt });
  const roots = publishedRoots ?? publishedRootsFromPackageJson(repoRoot, commit, runner);

  rmSync(outDir, { recursive: true, force: true });
  const packetDir = join(outDir, 'packet');
  mkdirSync(packetDir, { recursive: true });

  const { fields, key: itemKey } = buildCatchFields(run.runFields);
  const all = [...fields.stalls, ...fields.assumed, ...fields.diverged, ...(fields.checks ?? [])];
  const excludedLocations = new Set(excludedKeys.map((e) => `${e.field}:${e.sourceIndex}`));
  const excludedIds = Object.entries(itemKey)
    .filter(([, loc]) => excludedLocations.has(`${loc.field}:${loc.sourceIndex}`))
    .map(([id]) => id);
  const excludedIdSet = new Set(excludedIds);
  const items = all.filter((item) => !excludedIdSet.has(item.id));

  const { absent } = preparePlanterExport({ repoRoot, commit, dest: join(packetDir, 'tree'), ...(runner ? { runner } : {}) });
  pruneUnpublishedDocs(join(packetDir, 'tree'), roots);

  writeJson(join(packetDir, 'job.json'), { text: jobText, pageList, absentList });
  writeJson(join(packetDir, 'items.json'), items);
  writeJson(join(packetDir, 'index.json'), { kind: 'adjudicator', job: 'job.json', items: 'items.json', tree: 'tree/', publishedRoots: roots });

  const key: AdjudicatorPacketKey = {
    kind: 'adjudicator',
    report: { path: reportPath, jobId, attempt: run.attempt, runId: run.runId },
    items: itemKey,
    excluded: excludedIds,
    treeCommit: commit,
    treeAbsent: absent,
    inputs: { [batchPath]: batchHash, [reportPath]: run.reportHash },
  };
  writeJson(join(outDir, 'key.json'), key);
  return { key, expected: items.map((item) => ({ itemId: item.id })) };
}

/** One sampled finding the agreement read re-rules: its report, job, attempt, and the page its claim concerns, at its own pinned commit. */
export interface AgreementFindingSource {
  batchPath: string;
  reportPath: string;
  jobId: string;
  attempt?: number;
  page: string;
  commit: string;
}

/** One sampled catch call the agreement read re-rules: its report, job, attempt, its concerned page, and the plant it names. */
export interface AgreementCatchCallSource {
  batchPath: string;
  reportPath: string;
  jobId: string;
  attempt?: number;
  page: string;
  commit: string;
  plant: SinglePlantSource;
}

/** The key file an agreement packet's builder writes outside the mount. */
export interface AgreementPacketKey {
  kind: 'agreement';
  findings: Record<string, { report: ReportTrace }>;
  catchCalls: Record<string, { report: ReportTrace; plantId: string }>;
  treeCommit?: string;
  inputs: Record<string, string>;
}

/**
 * Build one agreement packet from the scorer's sample file (`itemId`, kind, and, for a finding,
 * the primary ruling this build never reads: `findings`/`catchCalls` name only which item to
 * resolve, not what it was ruled), plus the same report, batch, criteria, and page sources every
 * other packet reads from. Never the sample's own `primaryLabel`, `subjectGroupId`, `runId`, or
 * `jobId`. A shared `tree`, when given, serves every finding, built at its own commit with the
 * planter-export exclusions and pruned to that commit's published roots
 * (`publishedRootsFromPackageJson`), which the packet index then states.
 * @returns The key file's own contents and the expected items the agreement read must rule.
 */
export function buildAgreementPacket({
  outDir,
  repoRoot,
  samplePath,
  findings,
  catchCalls,
  tree,
  runner,
}: {
  outDir: string;
  repoRoot: string;
  samplePath: string;
  findings: Record<string, AgreementFindingSource>;
  catchCalls: Record<string, AgreementCatchCallSource>;
  tree?: { commit: string };
  runner?: CommandRunner;
}): { key: AgreementPacketKey; expected: ExpectedItem[] } {
  const sampleRaw = readFileSync(samplePath, 'utf8');
  const sample = JSON.parse(sampleRaw) as { findings: readonly { itemId: string }[]; catchCalls: readonly { itemId: string }[] };

  rmSync(outDir, { recursive: true, force: true });
  const packetDir = join(outDir, 'packet');
  mkdirSync(packetDir, { recursive: true });

  const expected: ExpectedItem[] = [];
  const findingKey: Record<string, { report: ReportTrace }> = {};
  const catchCallKey: Record<string, { report: ReportTrace; plantId: string }> = {};
  const inputs: Record<string, string> = { [samplePath]: sha256(sampleRaw) };
  const indexItems: Array<{ id: string; kind: 'finding' | 'catchCall'; page?: string }> = [];

  for (const { itemId } of sample.findings) {
    const src = findings[itemId];
    if (!src) throw new Error(`agreement packet: no resolved source for finding ${itemId}`);
    assertSafeRelativePagePath(src.page);
    const run = resolveRunSource({ reportPath: src.reportPath, jobId: src.jobId, attempt: src.attempt });
    const { text: jobText, hash: batchHash } = resolveJobText(src.batchPath, src.jobId);
    const { content: pageContent, hash: pageHash } = readPageAtCommit(repoRoot, src.commit, src.page, runner);
    const dir = join(packetDir, 'findings', itemId);
    mkdirSync(dir, { recursive: true });
    writeJson(join(dir, 'job.json'), { text: jobText, pageList: [src.page] });
    writeFileSync(join(dir, 'page.md'), pageContent);
    const { fields } = buildCatchFields(run.runFields);
    writeJson(join(dir, 'item.json'), fields);
    inputs[src.batchPath] = batchHash;
    inputs[src.reportPath] = run.reportHash;
    inputs[`page@${src.commit}:${src.page}`] = pageHash;
    findingKey[itemId] = { report: { path: src.reportPath, jobId: src.jobId, attempt: run.attempt, runId: run.runId } };
    expected.push({ itemId, expectedKind: 'finding' });
    indexItems.push({ id: itemId, kind: 'finding', page: src.page });
  }

  for (const { itemId } of sample.catchCalls) {
    const src = catchCalls[itemId];
    if (!src) throw new Error(`agreement packet: no resolved source for catch call ${itemId}`);
    assertSafeRelativePagePath(src.page);
    const run = resolveRunSource({ reportPath: src.reportPath, jobId: src.jobId, attempt: src.attempt });
    const { text: jobText, hash: batchHash } = resolveJobText(src.batchPath, src.jobId);
    const { content: pageContent, hash: pageHash } = readPageAtCommit(repoRoot, src.commit, src.page, runner);
    const { subject, criterion, nearMiss, sourcePath } = resolveSinglePlantCriterion(src.plant);
    const dir = join(packetDir, 'catchCalls', itemId);
    mkdirSync(dir, { recursive: true });
    writeJson(join(dir, 'job.json'), { text: jobText });
    writeFileSync(join(dir, 'page.md'), pageContent);
    // Allow-listed to the three fields a plant entry ever carries: never original, planted, proof, or type.
    writeJson(join(dir, 'plant.json'), { subject, criterion, nearMiss });
    // Distinct ids from the outer sampled itemId, per the packet requirements: this run's own
    // items are keyed under their own opaque ids, never the itemId the sample draws on.
    const { fields } = buildCatchFields(run.runFields, `${itemId}-run`);
    writeJson(join(dir, 'items.json'), fields);
    inputs[src.batchPath] = batchHash;
    inputs[src.reportPath] = run.reportHash;
    inputs[`page@${src.commit}:${src.page}`] = pageHash;
    inputs[sourcePath] = sha256File(sourcePath);
    catchCallKey[itemId] = { report: { path: src.reportPath, jobId: src.jobId, attempt: run.attempt, runId: run.runId }, plantId: src.plant.id };
    expected.push({ itemId, expectedKind: 'catchCall' });
    indexItems.push({ id: itemId, kind: 'catchCall' });
  }

  let treeCommit: string | undefined;
  let publishedRoots: string[] | undefined;
  if (tree) {
    preparePlanterExport({ repoRoot, commit: tree.commit, dest: join(packetDir, 'tree'), ...(runner ? { runner } : {}) });
    publishedRoots = publishedRootsFromPackageJson(repoRoot, tree.commit, runner);
    pruneUnpublishedDocs(join(packetDir, 'tree'), publishedRoots);
    treeCommit = tree.commit;
  }

  writeJson(join(packetDir, 'index.json'), { kind: 'agreement', items: indexItems, ...(tree ? { tree: 'tree/', publishedRoots } : {}) });

  const key: AgreementPacketKey = { kind: 'agreement', findings: findingKey, catchCalls: catchCallKey, ...(treeCommit ? { treeCommit } : {}), inputs };
  writeJson(join(outDir, 'key.json'), key);
  return { key, expected };
}

/**
 * Pull a flag's value out of an argument list.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * The command-line entry point.
 * @param args - The arguments after the script name.
 * @returns The process exit code.
 */
export function main(args: string[]): number {
  const kind = args[0];
  const out = option(args, '--out');
  const specPath = option(args, '--spec');
  if (!out || !specPath || (kind !== 'catch' && kind !== 'adjudicator' && kind !== 'agreement')) {
    process.stderr.write('usage: judge-packets.ts catch|adjudicator|agreement --out DIR --spec SPEC.json\n');
    return 2;
  }
  const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8')) as Record<string, unknown>;
  const outDir = resolve(out);
  const repoRoot = typeof spec.repoRoot === 'string' ? spec.repoRoot : REPO_ROOT;
  if (kind === 'catch') {
    const { expected } = buildCatchPacket({
      outDir,
      repoRoot,
      ...(spec as unknown as { batchPath: string; reportPath: string; jobId: string; attempt?: number; plants: JobPlantSource; commit: string }),
    });
    process.stdout.write(`wrote ${outDir} (${expected.length} plant(s))\n`);
  } else if (kind === 'adjudicator') {
    const { expected } = buildAdjudicatorPacket({
      outDir,
      repoRoot,
      ...(spec as unknown as {
        batchPath: string;
        reportPath: string;
        jobId: string;
        attempt?: number;
        pageList: string[];
        absentList: string[];
        excludedKeys?: CatchFieldItemLocation[];
        commit: string;
        publishedRoots?: string[];
      }),
    });
    process.stdout.write(`wrote ${outDir} (${expected.length} item(s))\n`);
  } else {
    // tree is wired explicitly from the spec, never implicit: an agreement packet with no tree
    // in its spec gets no tree/, the same as buildAgreementPacket's own default.
    const { expected } = buildAgreementPacket({
      outDir,
      repoRoot,
      ...(spec as unknown as {
        samplePath: string;
        findings: Record<string, AgreementFindingSource>;
        catchCalls: Record<string, AgreementCatchCallSource>;
        tree?: { commit: string };
      }),
    });
    process.stdout.write(`wrote ${outDir} (${expected.length} item(s))\n`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
