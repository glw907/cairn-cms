/**
 * Parsing and verification for the three judge kinds' structured output: the catch judge, the
 * adjudicator, and the agreement read. A judge's report is the same "one JSON object per run"
 * shape a reader's is, but its content is a list of rulings, not a reader's catch fields, so it
 * gets its own schema per kind and its own verification rule: every packet item ruled exactly
 * once, with no ruling left over and, for the agreement read, no ruling in the wrong label set.
 */
import { findResult } from './transcript.js';
import type { JudgeKind } from './class-schema.js';
import type { Adjudication, AdjudicatorOutput, AgreementOutput, AgreementRuling, CatchJudgeOutput, CatchRuling, InitCheck, StreamEvent } from './types.js';

/**
 * One packet item a judge batch expects a ruling for. `expectedKind` matters only for the
 * agreement read, which must never answer a finding with a catch-call label or the reverse.
 */
export interface ExpectedItem {
  itemId: string;
  expectedKind?: 'finding' | 'catchCall';
}

/** A judge's parsed rulings, whichever of the three shapes its kind returns. */
export type JudgeRulings = CatchRuling[] | Adjudication[] | AgreementRuling[];

/** The JSON schema for the catch judge's structured output: one ruling per plant entry. */
export const CATCH_JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    rulings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          ruling: { type: 'string', enum: ['caught', 'missed'] },
          reason: { type: 'string' },
        },
        required: ['itemId', 'ruling', 'reason'],
      },
    },
  },
  required: ['rulings'],
};

/**
 * The JSON schema for the adjudicator's structured output: a discriminated union over
 * `adjudications[]`, a `finding` branch that requires `subjectGroupId` and `ruling` and an
 * `interpretation`/`notAClaim` branch that forbids both.
 */
export const ADJUDICATOR_SCHEMA = {
  type: 'object',
  properties: {
    adjudications: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              class: { const: 'finding' },
              subjectGroupId: { type: 'string' },
              ruling: { type: 'string', enum: ['real', 'false', 'harness'] },
              reason: { type: 'string' },
            },
            required: ['itemId', 'class', 'subjectGroupId', 'ruling', 'reason'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              class: { type: 'string', enum: ['interpretation', 'notAClaim'] },
              reason: { type: 'string' },
            },
            required: ['itemId', 'class', 'reason'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['adjudications'],
};

/**
 * The JSON schema for the agreement read's structured output: one ruling per sampled item, in
 * either label set (the packet, not the schema, is what distinguishes a finding from a catch
 * call).
 */
export const AGREEMENT_SCHEMA = {
  type: 'object',
  properties: {
    rulings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          ruling: { type: 'string', enum: ['real', 'false', 'harness', 'caught', 'missed'] },
          reason: { type: 'string' },
        },
        required: ['itemId', 'ruling', 'reason'],
      },
    },
  },
  required: ['rulings'],
};

/**
 * The JSON schema a judge kind's structured report must match.
 * @param kind - Which of the three judges is running.
 * @returns The schema for the CLI's `--json-schema` flag.
 */
export function judgeReportSchema(kind: JudgeKind): object {
  if (kind === 'catchJudge') return CATCH_JUDGE_SCHEMA;
  if (kind === 'adjudicator') return ADJUDICATOR_SCHEMA;
  return AGREEMENT_SCHEMA;
}

/**
 * Whether a value is a non-blank string.
 * @param value - Any parsed JSON value.
 * @returns True for a string with visible content.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Parse the catch judge's raw `rulings[]`, rejecting the whole output on the first entry missing
 * a required field or carrying the wrong ruling word.
 * @param raw - The parsed `structured_output` object.
 * @returns The typed output, or undefined when any entry fails to parse.
 */
function parseCatchOutput(raw: Record<string, unknown>): CatchJudgeOutput | undefined {
  if (!Array.isArray(raw.rulings)) return undefined;
  const rulings: CatchRuling[] = [];
  for (const entry of raw.rulings) {
    if (entry === null || typeof entry !== 'object') return undefined;
    const e = entry as Record<string, unknown>;
    if (!isNonEmptyString(e.itemId) || (e.ruling !== 'caught' && e.ruling !== 'missed') || typeof e.reason !== 'string') return undefined;
    rulings.push({ itemId: e.itemId, ruling: e.ruling, reason: e.reason });
  }
  return { rulings };
}

/**
 * Parse the adjudicator's raw `adjudications[]`, honoring the discriminated union: a `finding`
 * entry must carry `subjectGroupId` and a `real`/`false`/`harness` ruling; an
 * `interpretation`/`notAClaim` entry must carry neither.
 * @param raw - The parsed `structured_output` object.
 * @returns The typed output, or undefined when any entry fails to parse.
 */
function parseAdjudicatorOutput(raw: Record<string, unknown>): AdjudicatorOutput | undefined {
  if (!Array.isArray(raw.adjudications)) return undefined;
  const adjudications: Adjudication[] = [];
  for (const entry of raw.adjudications) {
    if (entry === null || typeof entry !== 'object') return undefined;
    const e = entry as Record<string, unknown>;
    if (!isNonEmptyString(e.itemId) || typeof e.reason !== 'string') return undefined;
    if (e.class === 'finding') {
      if (!isNonEmptyString(e.subjectGroupId) || (e.ruling !== 'real' && e.ruling !== 'false' && e.ruling !== 'harness')) return undefined;
      adjudications.push({ itemId: e.itemId, class: 'finding', subjectGroupId: e.subjectGroupId, ruling: e.ruling, reason: e.reason });
    } else if (e.class === 'interpretation' || e.class === 'notAClaim') {
      adjudications.push({ itemId: e.itemId, class: e.class, reason: e.reason });
    } else {
      return undefined;
    }
  }
  return { adjudications };
}

/** Every label the agreement read may return, across both its label sets. */
const AGREEMENT_LABELS = new Set(['real', 'false', 'harness', 'caught', 'missed']);

/**
 * Parse the agreement read's raw `rulings[]`.
 * @param raw - The parsed `structured_output` object.
 * @returns The typed output, or undefined when any entry fails to parse.
 */
function parseAgreementOutput(raw: Record<string, unknown>): AgreementOutput | undefined {
  if (!Array.isArray(raw.rulings)) return undefined;
  const rulings: AgreementRuling[] = [];
  for (const entry of raw.rulings) {
    if (entry === null || typeof entry !== 'object') return undefined;
    const e = entry as Record<string, unknown>;
    if (!isNonEmptyString(e.itemId) || typeof e.ruling !== 'string' || !AGREEMENT_LABELS.has(e.ruling) || typeof e.reason !== 'string') return undefined;
    rulings.push({ itemId: e.itemId, ruling: e.ruling as AgreementRuling['ruling'], reason: e.reason });
  }
  return { rulings };
}

/**
 * The judge's structured output, when it returned one of the right shape for its kind.
 * @param events - The parsed stream.
 * @param kind - Which of the three judges produced `events`.
 * @returns The parsed output, or undefined when the run gave none or the wrong shape.
 */
export function judgeOutput(events: StreamEvent[], kind: JudgeKind): CatchJudgeOutput | AdjudicatorOutput | AgreementOutput | undefined {
  const raw = findResult(events)?.structured_output;
  if (!raw || typeof raw !== 'object') return undefined;
  const output = raw as Record<string, unknown>;
  if (kind === 'catchJudge') return parseCatchOutput(output);
  if (kind === 'adjudicator') return parseAdjudicatorOutput(output);
  return parseAgreementOutput(output);
}

/**
 * The rulings list out of a parsed judge output, whichever kind it is.
 * @param output - A parsed judge output.
 * @param kind - The judge kind it came from.
 * @returns The output's own rulings array, under whichever key its kind uses.
 */
export function rulingsOf(output: CatchJudgeOutput | AdjudicatorOutput | AgreementOutput, kind: JudgeKind): JudgeRulings {
  if (kind === 'adjudicator') return (output as AdjudicatorOutput).adjudications;
  return (output as CatchJudgeOutput | AgreementOutput).rulings;
}

/** The verified block a judge job report carries: no quotes or pages, only the ruling coverage. */
export interface JudgeVerified {
  ok: boolean;
  init: boolean;
  canaries: boolean;
  problems: string[];
}

/**
 * The label set one ruling word belongs to.
 * @param ruling - A ruling word from a judge's output.
 * @returns The label set, or undefined when the word matches neither (a parse failure already
 *  caught this, so callers only reach this on a word `AGREEMENT_LABELS` allows).
 */
function labelKind(ruling: string): 'finding' | 'catchCall' | undefined {
  if (ruling === 'real' || ruling === 'false' || ruling === 'harness') return 'finding';
  if (ruling === 'caught' || ruling === 'missed') return 'catchCall';
  return undefined;
}

/**
 * Decide whether a judge job's rulings are verified: every expected item ruled exactly once, no
 * ruling for an item outside the packet, and, for the agreement read, no ruling whose label set
 * does not match the sampled item's own kind. `output` is the judge's parsed structured output, or
 * undefined when it gave none or the wrong shape; `kind` is the judge kind; `expected` names every
 * item this packet requires a ruling for; `init` is the init check's result; `canariesFound` lists
 * the canary strings the transcript showed.
 * @returns The `verified` block for the job report.
 */
export function verifyJudgeRulings({
  output,
  kind,
  expected,
  init,
  canariesFound,
}: {
  output: CatchJudgeOutput | AdjudicatorOutput | AgreementOutput | undefined;
  kind: JudgeKind;
  expected: readonly ExpectedItem[];
  init: InitCheck;
  canariesFound: string[];
}): JudgeVerified {
  const problems: string[] = [];
  if (!init.ok) problems.push(...init.problems.map((p) => `init: ${p}`));
  if (canariesFound.length > 0) problems.push(`canary loaded: ${canariesFound.length} canary string(s) in the transcript`);
  if (!output) {
    problems.push('no structured ruling output');
    return { ok: false, init: init.ok, canaries: canariesFound.length === 0, problems };
  }
  const rulings = rulingsOf(output, kind);
  const counts = new Map<string, number>();
  for (const r of rulings) counts.set(r.itemId, (counts.get(r.itemId) ?? 0) + 1);
  const expectedIds = new Set(expected.map((e) => e.itemId));
  for (const item of expected) {
    const count = counts.get(item.itemId) ?? 0;
    if (count === 0) problems.push(`item ${item.itemId}: no ruling`);
    else if (count > 1) problems.push(`item ${item.itemId}: ruled ${count} time(s), exactly one required`);
  }
  for (const r of rulings) {
    if (!expectedIds.has(r.itemId)) problems.push(`item ${r.itemId}: ruled, but is not in the packet`);
  }
  if (kind === 'agreement') {
    const wantedKind = new Map(expected.map((e) => [e.itemId, e.expectedKind]));
    // Safe: rulingsOf(output, 'agreement') always returns AgreementRuling[], though its static
    // return type stays the shared union (rulingsOf is generic over all three kinds).
    for (const r of rulings as AgreementRuling[]) {
      const wanted = wantedKind.get(r.itemId);
      const got = labelKind(r.ruling);
      if (wanted && got && wanted !== got) {
        problems.push(`item ${r.itemId}: ruled "${r.ruling}", a ${got} label, but the sampled item is a ${wanted}`);
      }
    }
  }
  return { ok: problems.length === 0, init: init.ok, canaries: canariesFound.length === 0, problems };
}
