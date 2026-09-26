/**
 * The shapes the scorer's modules share: the four reader classes, a plant's type vocabulary, and
 * the run records the catch and precision scorers consume. A run record is already resolved (its
 * catch-judge or adjudicator rulings joined back to plant or item ids, its `verified` and `opus`
 * flags set) by the assembler in `score.ts`, which is the only place a report, packet, or key file
 * is ever read; these modules score already-resolved records, never raw artifacts.
 */
import type { CatchFieldItemLocation } from '../judge-packets.js';

/** The four reader classes the bars gate over, matching `scripts/docs-readers/classes/*.json`. */
export type ClassId = 'docs-only' | 'docs-and-binary' | 'docs-and-site' | 'repository';

/** Every class id, in a fixed order, so a bundle short a class still reports one advisory entry for it. */
export const CLASS_IDS: readonly ClassId[] = ['docs-only', 'docs-and-binary', 'docs-and-site', 'repository'];

/** A plant's type, as the planter's record carries it. */
export type PlantType =
  | 'false-behavior'
  | 'contradiction'
  | 'precondition-or-ordering'
  | 'removed-step'
  | 'undefined-term'
  | 'wrong-name'
  | 'stale-path';

/** The plant types the spec counts as semantic (the rest are token types). */
export const SEMANTIC_PLANT_TYPES: ReadonlySet<PlantType> = new Set(['false-behavior', 'contradiction', 'precondition-or-ordering']);

/**
 * One plant, already joined to its class and, for a development plant, its page and line. `type`
 * and `semantic` are set for a real plant (the plant record carries them); a development plant
 * (`fixtures/dev-plants.json`) carries no type at all, so recall-by-type simply skips it.
 */
export interface PlantSpec {
  id: string;
  job: string;
  classId: ClassId;
  type?: PlantType;
  semantic?: boolean;
  /** Set for a development plant, so the on-map filter can place it against its job's path map. */
  page?: string;
  line?: number;
}

/**
 * One run's already-resolved catch-judge rulings for the plants its packet covered, keyed by plant
 * id. `verified` is the run's own `verified.ok`; an unverified run (still failing after its
 * rerun) catches nothing, applied by the catch scorer, never pre-applied here. `opus` is always set
 * explicitly by the assembler (`isVerifiedOpusRun`), never defaulted, since a wrong default would
 * silently admit a Sonnet run to an Opus-only pool.
 */
export interface CatchRunRecord {
  runId: string;
  verified: boolean;
  opus: boolean;
  catches: Record<string, 'caught' | 'missed'>;
}

/**
 * One catch-field item a precision run carries, after the harness filter and the adjudicator have
 * ruled on it. `harnessFiltered` is the mechanical filter's own exclusion, before the adjudicator
 * ever saw the item; `adjudication` is the adjudicator's classification, read only when the item
 * was not harness-filtered. A `finding` classification carries the `subjectGroupId` every item
 * sharing its subject pools under, since the counting unit is the group, not the item (spec,
 * "Scoring": "groups the run's findings by subject ... then rules each subject"). `field` is the
 * item's own source field (the adjudicator key's `items[itemId].field`), which splits a false
 * subject group into new-field (`wrong` or `missing`) and other.
 */
export interface PrecisionItem {
  itemId: string;
  harnessFiltered: boolean;
  field: CatchFieldItemLocation['field'];
  adjudication?: { class: 'finding'; subjectGroupId: string; ruling: 'real' | 'false' | 'harness' } | { class: 'interpretation' | 'notAClaim' };
}

/**
 * One control or mapping run's already-resolved precision items. `itemCount` is the run's total
 * catch-field item count before any filtering, the count an unverified run's rerun rule falls back
 * to (every item counts as a false finding, one per item, since there is no adjudicated subject
 * grouping for a run the adjudicator never got a working report from); `newFieldItemCount` is the
 * run's own `wrong[]` plus `missing[]` length, the same rerun-rule fallback restricted to the new
 * fields; `items` carries the resolved rulings and is read only when `verified`.
 */
export interface PrecisionRunRecord {
  runId: string;
  job: string;
  classId: ClassId;
  verified: boolean;
  opus: boolean;
  itemCount: number;
  newFieldItemCount: number;
  items?: PrecisionItem[];
}
