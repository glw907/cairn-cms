#!/usr/bin/env -S npx tsx
/**
 * Builds a judge packet: a mounted directory holding exactly what a catch-judge, adjudicator, or
 * agreement run is allowed to see, plus a key file outside the mount that joins the packet's
 * opaque ids back to runs, fields, and plants. Every builder here reads its inputs by allow-list,
 * never by block-list, so a field the run report added later (a model id, a run id, `modelUsage`,
 * `ruleCandidates[]`) can never reach a packet by accident.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/judge-packets.ts catch --out DIR --spec SPEC.json
 *   npx tsx scripts/docs-readers/judge-packets.ts adjudicator --out DIR --spec SPEC.json
 *   npx tsx scripts/docs-readers/judge-packets.ts agreement --out DIR --spec SPEC.json
 *
 * `--out DIR` is the packet's parent: the mounted packet lands at `DIR/packet/`, and the key file
 * at `DIR/key.json`, outside the mount so a judge's container never sees it. `--spec` is a JSON
 * file matching the kind's own input shape (below), with `outDir` omitted.
 */
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { preparePlanterExport, type CommandRunner } from './lib/prepare-class.js';
import type { ExpectedItem } from './lib/judge-verify.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Hash a string's UTF-8 bytes.
 * @param text - The text to hash.
 * @returns Its sha256, as hex.
 */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** One plant entry as a catch or held-out packet carries it: never `original`, `planted`, `proof`, or `type`. */
export interface PlantEntry {
  id: string;
  subject: string;
  criterion: string;
  nearMiss: string;
  /** The plant's own page, given only when the job spans more than one page. */
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

/** A run's raw catch fields, the allow-listed source `buildCatchFields` reads from. */
export interface RawRunFields {
  stalls?: RawBlockedEntry[];
  assumed?: RawBlockedEntry[];
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
  const stalls = (run.stalls ?? []).map((entry, i) => ({ id: nextId('stalls', i), field: 'stalls' as const, text: entry.text, blockedBy: entry.blockedBy }));
  const assumed = (run.assumed ?? []).map((entry, i) => ({ id: nextId('assumed', i), field: 'assumed' as const, text: entry.text, blockedBy: entry.blockedBy }));
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
  /** The plant's page, given only when the job spans more than one page. */
  page?: string;
  pageContent: string;
}

/** The key file a catch packet's builder writes outside the mount. */
export interface CatchPacketKey {
  kind: 'catch';
  /** Every plant's opaque id, mapped back to its real plant id. */
  plants: Record<string, { plantId: string }>;
  /** Every catch-field item's opaque id, mapped back to its source location. */
  items: Record<string, CatchFieldItemLocation>;
  /** The sha256 of every input this build read. */
  inputs: Record<string, string>;
}

/**
 * Build one catch packet: the plant entries, the planted page(s), the job text, and one run's
 * catch fields, in a fresh directory. Works the same for a development plant, a real plant, and a
 * held-out defect: none of them carry `original`, `planted`, `proof`, or `type` into the packet.
 * @returns The key file's own contents and the expected items a catch judge must rule.
 */
export function buildCatchPacket({
  outDir,
  jobText,
  plants,
  run,
}: {
  outDir: string;
  jobText: string;
  plants: readonly CatchPlantInput[];
  run: RawRunFields;
}): { key: CatchPacketKey; expected: ExpectedItem[] } {
  rmSync(outDir, { recursive: true, force: true });
  const packetDir = join(outDir, 'packet');
  mkdirSync(join(packetDir, 'pages'), { recursive: true });

  const plantEntries: PlantEntry[] = [];
  const plantKey: Record<string, { plantId: string }> = {};
  const inputs: Record<string, string> = {};
  const written = new Set<string>();
  plants.forEach((plant, i) => {
    const id = `plant-${i + 1}`;
    plantEntries.push({ id, subject: plant.subject, criterion: plant.criterion, nearMiss: plant.nearMiss, ...(plant.page ? { page: plant.page } : {}) });
    plantKey[id] = { plantId: plant.plantId };
    const pagePath = plant.page ?? 'page.md';
    if (!written.has(pagePath)) {
      written.add(pagePath);
      const dest = join(packetDir, 'pages', pagePath);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, plant.pageContent);
      inputs[`pages/${pagePath}`] = sha256(plant.pageContent);
    }
  });

  const { fields: items, key: itemKey } = buildCatchFields(run);
  writeFileSync(join(packetDir, 'job.json'), `${JSON.stringify({ text: jobText }, null, 2)}\n`);
  writeFileSync(join(packetDir, 'plants.json'), `${JSON.stringify(plantEntries, null, 2)}\n`);
  writeFileSync(join(packetDir, 'items.json'), `${JSON.stringify(items, null, 2)}\n`);
  writeFileSync(
    join(packetDir, 'index.json'),
    `${JSON.stringify({ kind: 'catch', job: 'job.json', plants: 'plants.json', items: 'items.json', pages: 'pages/' }, null, 2)}\n`,
  );
  inputs['job.json'] = sha256(jobText);

  const key: CatchPacketKey = { kind: 'catch', plants: plantKey, items: itemKey, inputs };
  writeFileSync(join(outDir, 'key.json'), `${JSON.stringify(key, null, 2)}\n`);
  return { key, expected: plantEntries.map((p) => ({ itemId: p.id })) };
}

/** The key file an adjudicator packet's builder writes outside the mount. */
export interface AdjudicatorPacketKey {
  kind: 'adjudicator';
  items: Record<string, CatchFieldItemLocation>;
  /** Item ids the mechanical harness filter (or a caller-supplied stand-in) excluded before this build. */
  excluded: string[];
  treeCommit: string;
  treeAbsent: string[];
  inputs: Record<string, string>;
}

/**
 * Build one adjudicator packet: the job text, the job's page and absent lists, one control run's
 * catch fields (minus whatever `excludedKeys` names), and the published docs tree and code at the
 * job's pinned commit. `excludedKeys` stands in for Task 7's mechanical harness filter, not yet
 * merged into this lane; its excluded items are recorded in the key file rather than dropped
 * silently.
 * @returns The key file's own contents and the expected items an adjudicator must rule.
 */
export function buildAdjudicatorPacket({
  outDir,
  jobText,
  pageList,
  absentList,
  run,
  excludedKeys = [],
  repoRoot,
  commit,
  runner,
  publishedRoots = ['docs/'],
}: {
  outDir: string;
  jobText: string;
  pageList: readonly string[];
  absentList: readonly string[];
  run: RawRunFields;
  excludedKeys?: readonly CatchFieldItemLocation[];
  repoRoot: string;
  commit: string;
  runner?: CommandRunner;
  publishedRoots?: readonly string[];
}): { key: AdjudicatorPacketKey; expected: ExpectedItem[] } {
  rmSync(outDir, { recursive: true, force: true });
  const packetDir = join(outDir, 'packet');
  mkdirSync(packetDir, { recursive: true });

  const { fields, key: itemKey } = buildCatchFields(run);
  const all = [...fields.stalls, ...fields.assumed, ...fields.diverged, ...(fields.checks ?? [])];
  const excludedLocations = new Set(excludedKeys.map((e) => `${e.field}:${e.sourceIndex}`));
  const excludedIds = Object.entries(itemKey)
    .filter(([, loc]) => excludedLocations.has(`${loc.field}:${loc.sourceIndex}`))
    .map(([id]) => id);
  const excludedIdSet = new Set(excludedIds);
  const items = all.filter((item) => !excludedIdSet.has(item.id));

  const { absent } = preparePlanterExport({ repoRoot, commit, dest: join(packetDir, 'tree'), ...(runner ? { runner } : {}) });

  writeFileSync(join(packetDir, 'job.json'), `${JSON.stringify({ text: jobText, pageList, absentList }, null, 2)}\n`);
  writeFileSync(join(packetDir, 'items.json'), `${JSON.stringify(items, null, 2)}\n`);
  writeFileSync(
    join(packetDir, 'index.json'),
    `${JSON.stringify({ kind: 'adjudicator', job: 'job.json', items: 'items.json', tree: 'tree/', publishedRoots }, null, 2)}\n`,
  );

  const key: AdjudicatorPacketKey = { kind: 'adjudicator', items: itemKey, excluded: excludedIds, treeCommit: commit, treeAbsent: absent, inputs: { 'job.json': sha256(jobText) } };
  writeFileSync(join(outDir, 'key.json'), `${JSON.stringify(key, null, 2)}\n`);
  return { key, expected: items.map((item) => ({ itemId: item.id })) };
}

/** One sampled finding the agreement read re-rules, with its resolved material (never its `primaryLabel`, `runId`, or `jobId`). */
export interface AgreementFindingInput {
  jobText: string;
  page: string;
  pageContent: string;
  item: RawRunFields;
}

/** One sampled catch call the agreement read re-rules, with its resolved material. */
export interface AgreementCatchCallInput {
  jobText: string;
  page: string;
  pageContent: string;
  plant: { subject: string; criterion: string; nearMiss: string };
  run: RawRunFields;
}

/** The key file an agreement packet's builder writes outside the mount. */
export interface AgreementPacketKey {
  kind: 'agreement';
  findings: Record<string, { resolved: true }>;
  catchCalls: Record<string, { resolved: true }>;
  treeCommit?: string;
  inputs: Record<string, string>;
}

/**
 * Build one agreement packet from the scorer's sample file (`itemId`, kind, and, for a finding,
 * its single catch-field item wrapped as `{ item: ... }` so `buildCatchFields` can allow-list it
 * the same way a catch or adjudicator packet does): never the sample's own `primaryLabel`,
 * `subjectGroupId`, `runId`, or `jobId`. `findings` and `catchCalls` resolve each sampled `itemId`
 * to its material; a caller builds them from the saved reports and plant record the sample points
 * at. A shared `tree` serves every finding, since the pass's own sample draws from one pinned
 * commit.
 * @returns The key file's own contents and the expected items the agreement read must rule.
 */
export function buildAgreementPacket({
  outDir,
  sample,
  findings,
  catchCalls,
  tree,
}: {
  outDir: string;
  sample: { findings: readonly { itemId: string }[]; catchCalls: readonly { itemId: string }[] };
  findings: Record<string, AgreementFindingInput>;
  catchCalls: Record<string, AgreementCatchCallInput>;
  tree?: { repoRoot: string; commit: string; runner?: CommandRunner };
}): { key: AgreementPacketKey; expected: ExpectedItem[] } {
  rmSync(outDir, { recursive: true, force: true });
  const packetDir = join(outDir, 'packet');
  mkdirSync(packetDir, { recursive: true });

  const expected: ExpectedItem[] = [];
  const findingKey: Record<string, { resolved: true }> = {};
  const catchCallKey: Record<string, { resolved: true }> = {};
  const inputs: Record<string, string> = {};
  const indexItems: Array<{ id: string; kind: 'finding' | 'catchCall' }> = [];

  for (const { itemId } of sample.findings) {
    const resolved = findings[itemId];
    if (!resolved) throw new Error(`agreement packet: no resolved material for finding ${itemId}`);
    const dir = join(packetDir, 'findings', itemId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'job.json'), `${JSON.stringify({ text: resolved.jobText }, null, 2)}\n`);
    writeFileSync(join(dir, 'page.md'), resolved.pageContent);
    const { fields } = buildCatchFields(resolved.item);
    writeFileSync(join(dir, 'item.json'), `${JSON.stringify(fields, null, 2)}\n`);
    inputs[`findings/${itemId}/job.json`] = sha256(resolved.jobText);
    inputs[`findings/${itemId}/page.md`] = sha256(resolved.pageContent);
    findingKey[itemId] = { resolved: true };
    expected.push({ itemId, expectedKind: 'finding' });
    indexItems.push({ id: itemId, kind: 'finding' });
  }

  for (const { itemId } of sample.catchCalls) {
    const resolved = catchCalls[itemId];
    if (!resolved) throw new Error(`agreement packet: no resolved material for catch call ${itemId}`);
    const dir = join(packetDir, 'catchCalls', itemId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'job.json'), `${JSON.stringify({ text: resolved.jobText }, null, 2)}\n`);
    writeFileSync(join(dir, 'page.md'), resolved.pageContent);
    writeFileSync(join(dir, 'plant.json'), `${JSON.stringify(resolved.plant, null, 2)}\n`);
    // Distinct ids from the outer sampled itemId, per the packet requirements: this run's own
    // items are keyed under their own opaque ids, never the itemId the sample draws on.
    const { fields } = buildCatchFields(resolved.run, `${itemId}-run`);
    writeFileSync(join(dir, 'items.json'), `${JSON.stringify(fields, null, 2)}\n`);
    inputs[`catchCalls/${itemId}/job.json`] = sha256(resolved.jobText);
    inputs[`catchCalls/${itemId}/page.md`] = sha256(resolved.pageContent);
    catchCallKey[itemId] = { resolved: true };
    expected.push({ itemId, expectedKind: 'catchCall' });
    indexItems.push({ id: itemId, kind: 'catchCall' });
  }

  let treeCommit: string | undefined;
  if (tree) {
    preparePlanterExport({ repoRoot: tree.repoRoot, commit: tree.commit, dest: join(packetDir, 'tree'), ...(tree.runner ? { runner: tree.runner } : {}) });
    treeCommit = tree.commit;
  }

  writeFileSync(join(packetDir, 'index.json'), `${JSON.stringify({ kind: 'agreement', items: indexItems, ...(tree ? { tree: 'tree/' } : {}) }, null, 2)}\n`);

  const key: AgreementPacketKey = { kind: 'agreement', findings: findingKey, catchCalls: catchCallKey, ...(treeCommit ? { treeCommit } : {}), inputs };
  writeFileSync(join(outDir, 'key.json'), `${JSON.stringify(key, null, 2)}\n`);
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
  if (kind === 'catch') {
    const { expected } = buildCatchPacket({ outDir, ...(spec as { jobText: string; plants: CatchPlantInput[]; run: RawRunFields }) });
    process.stdout.write(`wrote ${outDir} (${expected.length} plant(s))\n`);
  } else if (kind === 'adjudicator') {
    const { expected } = buildAdjudicatorPacket({ outDir, repoRoot: REPO_ROOT, ...(spec as { jobText: string; pageList: string[]; absentList: string[]; run: RawRunFields; commit: string }) });
    process.stdout.write(`wrote ${outDir} (${expected.length} item(s))\n`);
  } else {
    const { expected } = buildAgreementPacket({ outDir, ...(spec as { sample: { findings: { itemId: string }[]; catchCalls: { itemId: string }[] }; findings: Record<string, AgreementFindingInput>; catchCalls: Record<string, AgreementCatchCallInput> }) });
    process.stdout.write(`wrote ${outDir} (${expected.length} item(s))\n`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
