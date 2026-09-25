/**
 * The judge agreement bar (O2): the sample draw over the two fixed pools, ordered and balanced per
 * the spec's own rule, the pooled kappa (or its raw-agreement fallback under the five-item test),
 * and applying Fable's replacement rulings to the catch and precision records the bars are then
 * computed from.
 */
import { createHash } from 'node:crypto';
import type { CatchRunRecord, PrecisionRunRecord } from './score-types.js';

/** One item a finding stratum's pool candidate carries, before any sample is drawn. */
export interface FindingPoolItem {
  itemId: string;
  runId: string;
  jobId: string;
  primaryLabel: 'real' | 'false' | 'harness';
}

/** One item a catch-call stratum's pool candidate carries, before any sample is drawn. */
export interface CatchCallPoolItem {
  itemId: string;
  runId: string;
  plantId: string;
  primaryLabel: 'caught' | 'missed';
}

/** The findings stratum's fixed label vocabulary: the adjudicator's own three rulings, never derived from what a pool happens to carry. */
const FINDING_CATEGORIES: readonly string[] = ['real', 'false', 'harness'];

/** The catch-calls stratum's fixed label vocabulary: the catch judge's own two rulings. */
const CATCH_CALL_CATEGORIES: readonly string[] = ['caught', 'missed'];

/** The agreement sample file, in the pinned shape (`docs/superpowers/research/2026-09-24-pass-1b-preflight.md`). */
export interface AgreementSampleFile {
  orderingLabel: string;
  findings: FindingPoolItem[];
  catchCalls: CatchCallPoolItem[];
  notes: string[];
}

/**
 * Sort a pool ascending by `sha256(orderingLabel + itemId)`, each item's digest computed once.
 * @param items - The items to sort.
 * @param orderingLabel - The frozen ordering label (`docs-reset-1b-agreement`).
 * @returns The items in sha256 order (a fresh array; the input is never mutated).
 */
function sortByOrder<T extends { itemId: string }>(items: readonly T[], orderingLabel: string): T[] {
  const keyed = items.map((item) => ({ item, key: createHash('sha256').update(orderingLabel + item.itemId).digest('hex') }));
  keyed.sort((a, b) => {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });
  return keyed.map(({ item }) => item);
}

/**
 * Draw one stratum's balanced sample: an even split across the stratum's own fixed label
 * vocabulary (never derived from what the pool happens to carry, so a category the pool carries
 * none of still gets its own note), each category's own pick a prefix of its sha256-ordered
 * candidates, a category short of its target drawn in full with a note, and any shortfall filled
 * from the sha256-ordered leftover pool (so the whole draw stays a prefix of the pool's own
 * ordering wherever balance does not force otherwise).
 * @param pool - The stratum's full candidate pool.
 * @param categories - The stratum's fixed label vocabulary, the split's own categories.
 * @param orderingLabel - The frozen ordering label.
 * @param want - How many items the stratum should carry (15).
 * @returns The picked items, in sha256 order, and any notes about a category absent or too small to balance.
 */
function drawStratum<T extends { itemId: string; primaryLabel: string }>(
  pool: readonly T[],
  categories: readonly string[],
  orderingLabel: string,
  want: number,
): { picked: T[]; notes: string[] } {
  const notes: string[] = [];
  if (pool.length <= want) {
    if (pool.length < want) notes.push(`pool has only ${pool.length} item(s), below the intended ${want}: drawn unbalanced`);
    return { picked: sortByOrder(pool, orderingLabel), notes };
  }
  const base = Math.floor(want / categories.length);
  const remainder = want - base * categories.length;
  const picked: T[] = [];
  const pickedIds = new Set<string>();
  let shortfall = 0;
  categories.forEach((category, index) => {
    const target = base + (index < remainder ? 1 : 0);
    const candidates = sortByOrder(
      pool.filter((item) => item.primaryLabel === category),
      orderingLabel,
    );
    if (candidates.length === 0) {
      shortfall += target;
      notes.push(`category "${category}": absent from the pool (wanted ${target}): drawn unbalanced`);
    } else if (candidates.length < target) {
      shortfall += target - candidates.length;
      notes.push(`category "${category}": pool too small to balance (had ${candidates.length}, wanted ${target}): drawn unbalanced`);
    }
    const taken = candidates.slice(0, target);
    for (const item of taken) {
      picked.push(item);
      pickedIds.add(item.itemId);
    }
  });
  if (shortfall > 0) {
    const leftover = sortByOrder(
      pool.filter((item) => !pickedIds.has(item.itemId)),
      orderingLabel,
    );
    for (const item of leftover) {
      if (picked.length >= want) break;
      picked.push(item);
    }
  }
  return { picked: sortByOrder(picked, orderingLabel), notes };
}

/**
 * Draw the agreement sample: 15 findings and 15 catch calls where each pool allows, balanced by
 * primary ruling, ordered by `sha256(orderingLabel + itemId)`. Written before any Fable ruling
 * exists. Takes the frozen ordering label, both pools, and the per-stratum target (15 by default).
 * @returns The sample file, ready to write to `agreement-sample.json`.
 */
export function drawAgreementSample({
  orderingLabel,
  findingsPool,
  catchCallsPool,
  perStratum = 15,
}: {
  orderingLabel: string;
  findingsPool: readonly FindingPoolItem[];
  catchCallsPool: readonly CatchCallPoolItem[];
  perStratum?: number;
}): AgreementSampleFile {
  const findings = drawStratum(findingsPool, FINDING_CATEGORIES, orderingLabel, perStratum);
  const catchCalls = drawStratum(catchCallsPool, CATCH_CALL_CATEGORIES, orderingLabel, perStratum);
  return { orderingLabel, findings: findings.picked, catchCalls: catchCalls.picked, notes: [...findings.notes, ...catchCalls.notes] };
}

/** One sampled item, ruled by both the original judge (the primary rater) and Fable. */
export interface RuledItem {
  itemId: string;
  primaryLabel: string;
  fableLabel: string;
}

/** How many of a rater's own labels sit outside its largest category. */
function outsideLargestCategory(labels: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  const largest = Math.max(0, ...counts.values());
  return labels.length - largest;
}

/**
 * The five-item test: each rater's own labels, within one stratum, must include at least five
 * items outside that rater's own largest category.
 * @param primaryLabels - The primary rater's labels.
 * @param fableLabels - Fable's own labels.
 * @returns True when both raters pass.
 */
export function fiveItemTestPasses(primaryLabels: readonly string[], fableLabels: readonly string[]): boolean {
  return outsideLargestCategory(primaryLabels) >= 5 && outsideLargestCategory(fableLabels) >= 5;
}

/** One stratum's own observed and chance agreement, kappa, and the five-item test's result. */
export interface StratumAgreement {
  n: number;
  po: number;
  pe: number;
  kappa: number;
  fiveItemPass: boolean;
}

/**
 * Cohen's formula for kappa from observed and chance agreement; NaN when chance agreement is total.
 * @param po - The observed agreement.
 * @param pe - The chance agreement.
 * @returns The kappa figure.
 */
function cohenKappa(po: number, pe: number): number {
  return pe < 1 ? (po - pe) / (1 - pe) : NaN;
}

/**
 * One stratum's agreement: observed agreement `po` (the share of items where the primary rater and
 * Fable agree), chance agreement `pe` (Cohen's own marginal-product sum, over this stratum's own
 * label set only, never pooled across strata), and this stratum's own kappa.
 * @param items - The stratum's ruled items.
 * @returns The stratum's agreement figures.
 */
export function computeStratumAgreement(items: readonly RuledItem[]): StratumAgreement {
  const n = items.length;
  if (n === 0) return { n: 0, po: 0, pe: 0, kappa: NaN, fiveItemPass: false };
  const agree = items.filter((item) => item.primaryLabel === item.fableLabel).length;
  const po = agree / n;
  const primaryLabels = items.map((item) => item.primaryLabel);
  const fableLabels = items.map((item) => item.fableLabel);
  const categories = new Set([...primaryLabels, ...fableLabels]);
  let pe = 0;
  for (const category of categories) {
    const p1 = primaryLabels.filter((label) => label === category).length / n;
    const p2 = fableLabels.filter((label) => label === category).length / n;
    pe += p1 * p2;
  }
  return { n, po, pe, kappa: cohenKappa(po, pe), fiveItemPass: fiveItemTestPasses(primaryLabels, fableLabels) };
}

/** The instrument-wide agreement bar's result. */
export interface AgreementResult {
  findings: StratumAgreement;
  catchCalls: StratumAgreement;
  method: 'kappa' | 'rawAgreement';
  value: number;
  pass: boolean;
  reason?: string;
}

/**
 * Compute the instrument-wide agreement bar: pooled kappa when both strata pass the five-item
 * test, averaging each stratum's own observed and chance agreement weighted by its size before
 * applying Cohen's formula once (never chance agreement over the union of the two label sets); a
 * pooled raw-agreement fallback at 85 percent otherwise. Computed entirely from the primary and
 * Fable labels; a caller applies Fable's replacements to the score afterward, never here. Takes
 * the two strata's ruled items.
 * @returns The full agreement result, both strata's own figures included.
 */
export function computeAgreement({ findings, catchCalls }: { findings: readonly RuledItem[]; catchCalls: readonly RuledItem[] }): AgreementResult {
  const findingsAgreement = computeStratumAgreement(findings);
  const catchCallsAgreement = computeStratumAgreement(catchCalls);
  const totalN = findingsAgreement.n + catchCallsAgreement.n;
  const pooledPo = totalN === 0 ? 0 : (findingsAgreement.po * findingsAgreement.n + catchCallsAgreement.po * catchCallsAgreement.n) / totalN;
  if (findingsAgreement.fiveItemPass && catchCallsAgreement.fiveItemPass) {
    const pooledPe = (findingsAgreement.pe * findingsAgreement.n + catchCallsAgreement.pe * catchCallsAgreement.n) / totalN;
    const kappa = cohenKappa(pooledPo, pooledPe);
    return { findings: findingsAgreement, catchCalls: catchCallsAgreement, method: 'kappa', value: kappa, pass: kappa >= 0.6 };
  }
  return {
    findings: findingsAgreement,
    catchCalls: catchCallsAgreement,
    method: 'rawAgreement',
    value: pooledPo,
    pass: pooledPo >= 0.85,
    reason: "a stratum's rater carried fewer than five items outside its own largest category (the five-item test), so the gate falls back to pooled raw agreement",
  };
}

/** One of Fable's replacement rulings, joined back to the run and plant or item it re-rules. */
export interface AgreementReplacement {
  kind: 'finding' | 'catchCall';
  runId: string;
  /** The plant id for a catch-call replacement, or the precision item's own id for a finding replacement. */
  refId: string;
  label: string;
}

/** One sample item, already joined to Fable's own ruling by `itemId`. */
export interface SampleFableJoin {
  itemId: string;
  fableLabel: string;
}

/**
 * Derive Fable's replacements: exactly the sample items whose Fable label differs from the
 * primary label the sample file itself carries, joined through the sample's own `runId` and
 * `plantId` (a catch call) or `runId` and `itemId` (a finding). An item Fable agreed with never
 * becomes a replacement, so the bars read the original judge's ruling for it unchanged.
 * @param sample - The agreement sample file (its own primary labels).
 * @param fableFindings - Fable's ruling per sampled finding `itemId`.
 * @param fableCatchCalls - Fable's ruling per sampled catch call `itemId`.
 * @returns Every replacement a disagreement produced.
 */
export function deriveReplacements(
  sample: Pick<AgreementSampleFile, 'findings' | 'catchCalls'>,
  fableFindings: readonly SampleFableJoin[],
  fableCatchCalls: readonly SampleFableJoin[],
): AgreementReplacement[] {
  const replacements: AgreementReplacement[] = [];
  const fableFindingByItem = new Map(fableFindings.map((f) => [f.itemId, f.fableLabel]));
  for (const finding of sample.findings) {
    const fableLabel = fableFindingByItem.get(finding.itemId);
    if (fableLabel !== undefined && fableLabel !== finding.primaryLabel) {
      replacements.push({ kind: 'finding', runId: finding.runId, refId: finding.itemId, label: fableLabel });
    }
  }
  const fableCatchCallByItem = new Map(fableCatchCalls.map((f) => [f.itemId, f.fableLabel]));
  for (const catchCall of sample.catchCalls) {
    const fableLabel = fableCatchCallByItem.get(catchCall.itemId);
    if (fableLabel !== undefined && fableLabel !== catchCall.primaryLabel) {
      replacements.push({ kind: 'catchCall', runId: catchCall.runId, refId: catchCall.plantId, label: fableLabel });
    }
  }
  return replacements;
}

/**
 * The lookup key joining a replacement to the run and plant or item it re-rules.
 * @param runId - The run the replacement re-rules.
 * @param refId - The plant or precision item within that run.
 * @returns A key no two distinct pairs share.
 */
function replacementKey(runId: string, refId: string): string {
  return `${runId}\u0000${refId}`;
}

/**
 * Apply Fable's catch-call replacements to a set of catch runs, standing for "the bars are
 * computed after those replacements". Returns fresh records; the input is never mutated.
 * @param runsByJob - Every job's catch runs.
 * @param replacements - Fable's replacement rulings.
 * @returns The catch runs with every matched plant's ruling replaced.
 */
export function applyCatchReplacements(
  runsByJob: Readonly<Record<string, readonly CatchRunRecord[]>>,
  replacements: readonly AgreementReplacement[],
): Record<string, CatchRunRecord[]> {
  const byRunPlant = new Map<string, 'caught' | 'missed'>();
  for (const replacement of replacements) {
    if (replacement.kind === 'catchCall') byRunPlant.set(replacementKey(replacement.runId, replacement.refId), replacement.label as 'caught' | 'missed');
  }
  const result: Record<string, CatchRunRecord[]> = {};
  for (const [job, runs] of Object.entries(runsByJob)) {
    result[job] = runs.map((run) => {
      const catches = { ...run.catches };
      for (const plantId of Object.keys(catches)) {
        const replaced = byRunPlant.get(replacementKey(run.runId, plantId));
        if (replaced) catches[plantId] = replaced;
      }
      return { ...run, catches };
    });
  }
  return result;
}

/**
 * Apply Fable's finding replacements to a set of precision runs: the replaced item's own subject
 * group is kept when it already had one (a subject group Fable disagreed on stays the same
 * group, just with a different ruling), and falls back to the item's own id when it did not (an
 * item Fable turned into a finding that the adjudicator itself had classified as an
 * interpretation or not a claim at all).
 * @param runs - The precision pool's runs.
 * @param replacements - Fable's replacement rulings.
 * @returns The precision runs with every matched item's ruling replaced.
 */
export function applyPrecisionReplacements(runs: readonly PrecisionRunRecord[], replacements: readonly AgreementReplacement[]): PrecisionRunRecord[] {
  const byRunItem = new Map<string, 'real' | 'false' | 'harness'>();
  for (const replacement of replacements) {
    if (replacement.kind === 'finding') byRunItem.set(replacementKey(replacement.runId, replacement.refId), replacement.label as 'real' | 'false' | 'harness');
  }
  return runs.map((run) => {
    if (!run.items) return run;
    const items = run.items.map((item) => {
      const replaced = byRunItem.get(replacementKey(run.runId, item.itemId));
      if (!replaced) return item;
      const subjectGroupId = item.adjudication?.class === 'finding' ? item.adjudication.subjectGroupId : item.itemId;
      return { ...item, harnessFiltered: false, adjudication: { class: 'finding' as const, subjectGroupId, ruling: replaced } };
    });
    return { ...run, items };
  });
}
