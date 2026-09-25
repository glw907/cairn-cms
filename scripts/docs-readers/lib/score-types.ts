/**
 * The shapes the scorer's modules share: the four reader classes, a plant's type vocabulary, and
 * the run records the catch and precision scorers consume. A run record is already resolved (its
 * catch-judge or adjudicator rulings joined back to plant or item ids, its `verified` and `opus`
 * flags set) by whoever assembles a scoring bundle; the scorer itself never reads a report,
 * packet, or key file directly.
 */

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

/** One plant a scoring bundle carries, already joined to its class and, for a development plant, its page and line. */
export interface PlantSpec {
  id: string;
  job: string;
  classId: ClassId;
  type: PlantType;
  semantic: boolean;
  /** Set for a development plant, so the on-map filter can place it against its job's path map. */
  page?: string;
  line?: number;
}

/**
 * One run's already-resolved catch-judge rulings for the plants its packet covered, keyed by plant
 * id. `verified` is the run's own `verified.ok`; an unverified run (still failing after its
 * rerun) catches nothing, applied by the catch scorer, never pre-applied here. `opus` defaults to
 * true (every gated planted run is Opus by construction); a development bundle rescoring pass 1's
 * mixed-model data sets it explicitly.
 */
export interface CatchRunRecord {
  runId: string;
  verified: boolean;
  opus?: boolean;
  catches: Record<string, 'caught' | 'missed'>;
}

/** One catch-field item a precision run carries, after the harness filter and the adjudicator have ruled on it. */
export interface PrecisionItem {
  itemId: string;
  /** True when the mechanical harness filter excluded this item before the adjudicator ever saw it. */
  harnessExcluded: boolean;
  /** The adjudicator's ruling, read only when not `harnessExcluded`. */
  ruling?: 'real' | 'false' | 'harness';
}

/**
 * One control or mapping run's already-resolved precision items. `itemCount` is the run's total
 * catch-field item count before any filtering, the count an unverified run's rerun rule falls back
 * to (every item counts as a false finding); `items` carries the resolved rulings and is read only
 * when `verified`.
 */
export interface PrecisionRunRecord {
  runId: string;
  job: string;
  classId: ClassId;
  verified: boolean;
  opus?: boolean;
  itemCount: number;
  items?: PrecisionItem[];
}
