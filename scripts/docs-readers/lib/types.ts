/**
 * The shapes the docs-reader runner passes between its modules: class declarations, batches, the
 * `stream-json` events the CLI emits, and the job and batch reports.
 */

/** A reader-class declaration, as validated by `class-schema.ts`. */
export interface ClassDecl {
  name: string;
  description: string;
  contents: 'docs-set' | 'prepared';
  tools: string[];
  bashAllowlist: string[];
  permissionMode: 'default' | 'acceptEdits';
  env: Record<string, string>;
  secretEnv: string[];
  egress: string;
}

/** The proxy allowlists, keyed by egress class. */
export type EgressConfig = Record<string, string[]>;

/** One job in a parsed batch. */
export interface Job {
  id: string;
  class: string;
  model: string;
  arrival: string;
  job: string;
  docsSet: string[];
  prepared?: string;
  timeoutMinutes: number;
  /** Repository-relative paths this job's tree excludes, a directory given with a trailing slash. */
  absent?: string[];
  /** The commit this job's pages were pinned to. */
  commit?: string;
}

/** A parsed batch. */
export interface Batch {
  name: string;
  concurrency: number;
  budgetTokens: number;
  jobs: Job[];
  /** Whether this batch's inputs must verify against the freeze manifest before any container starts. */
  gated?: boolean;
}

/** An Anthropic API `usage` block. */
export interface ApiUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/** One model's entry in a result event's `modelUsage`. */
export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

/** A content block inside a stream message. */
export interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
  text?: string;
}

/**
 * One `stream-json` event. The CLI's events share a `type` and differ in the rest, so every other
 * field is optional and read only where its event type carries it.
 */
export interface StreamEvent {
  type: string;
  subtype?: string;
  error?: string;
  error_status?: number | null;
  is_error?: boolean;
  api_error_status?: number | null;
  message?: { id?: string; content?: ContentBlock[] | string; usage?: ApiUsage };
  /** The model id the init event reports for the session (the `system`/`init` event only). */
  model?: string;
  rate_limit_info?: { status?: string };
  permission_denials?: Array<{ tool_name: string; tool_use_id?: string; tool_input?: unknown }>;
  modelUsage?: Record<string, ModelUsage>;
  usage?: ApiUsage;
  structured_output?: unknown;
  tools?: string[];
  mcp_servers?: unknown[];
  skills?: string[];
  plugins?: unknown[];
  agents?: string[];
  apiKeySource?: string;
  claude_code_version?: string;
}

/** A tool call paired with its result. */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: { isError: boolean; text: string };
}

/** The four token counts. */
export interface Usage {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

/** The usage block a report carries: the four counts and the counted total. */
export interface ReportUsage extends Usage {
  counted: number;
}

/** A quote the reader gave. */
export interface Quote {
  path: string;
  line: number;
  text: string;
}

/** A quote as the reader's JSON gave it, before any field is trusted. */
export interface RawQuote {
  path?: unknown;
  line?: unknown;
  text?: unknown;
}

/** A quote after verification. */
export interface VerifiedQuote {
  path: string;
  line: unknown;
  text: unknown;
  ok: boolean;
  reason?: string;
  /** The first line (1-based, inclusive) the quote's own text actually matched on, when `ok`. */
  startLine?: number;
  /** The last line (1-based, inclusive) the quote's own text actually reached, when `ok`. */
  endLine?: number;
}

/** A stall or assumption entry: its text, and what blocked the reader there, when anything did. */
export interface BlockedEntry {
  text: string;
  blockedBy: string | null;
}

/** One instruction the reader followed or statement it relied on, and the decision it supported. */
export interface Step {
  quote: Quote;
  decision: string;
}

/** A step whose quote has gone through verification. */
export interface VerifiedStep {
  quote: VerifiedQuote;
  decision: string;
}

/** A place the reader did something other than what a page said, including a workaround that worked. */
export interface Diverged {
  quote: Quote;
  didInstead: string;
  why: string;
  blockedBy: string | null;
}

/** A divergence entry whose quote has gone through verification. */
export interface VerifiedDiverged {
  quote: VerifiedQuote;
  didInstead: string;
  why: string;
  blockedBy: string | null;
}

/** The reader's structured report. */
export interface ReaderReport {
  outcome: 'done' | 'stalled' | 'refused';
  stalls: BlockedEntry[];
  assumed: BlockedEntry[];
  quotes: Quote[];
  ruleCandidates: string[];
  steps: Step[];
  diverged: Diverged[];
}

/** The init check's result. */
export interface InitCheck {
  ok: boolean;
  problems: string[];
}

/** The pinned init fields for one CLI version. */
export interface InitBaseline {
  skills: string[];
  plugins: unknown[];
}

/** The `verified` block of a job report. */
export interface Verified {
  ok: boolean;
  init: boolean;
  canaries: boolean;
  quotes: VerifiedQuote[];
  steps: VerifiedStep[];
  diverged: VerifiedDiverged[];
  problems: string[];
}

/** A refused call. */
export interface Denial {
  source: 'permission' | 'unavailable-tool';
  tool: string;
  input: string;
}

/** A call that fetched cairn's own package, repository, or published docs. */
export interface PackageFetch {
  tool: string;
  input: string;
  match: string;
}

/** One egress-proxy decision record. */
export interface ProxyRecord {
  decision: string;
  method?: string;
  target?: string;
  reason?: string;
  time?: string;
}

/**
 * The fields one run attempt at a job produces: outcome `aborted` and `error` are the runner's,
 * the other three the reader's. A `JobReport`'s own top-level fields carry this shape too,
 * mirroring the final attempt, so a caller that never needs per-attempt detail reads them the
 * same way it always has.
 */
export interface RunOutcome {
  /** The model id the init event reported for this run, when the run started at all. */
  initModel?: string;
  outcome: 'done' | 'stalled' | 'refused' | 'aborted' | 'error';
  abortReason?: string;
  stalls: BlockedEntry[];
  assumed: BlockedEntry[];
  pagesRead: string[];
  quotes: VerifiedQuote[];
  steps: VerifiedStep[];
  diverged: VerifiedDiverged[];
  checks: unknown[];
  ruleCandidates: string[];
  denials: Denial[];
  proxyBlocked: Array<{ method?: string; target?: string; reason?: string; time?: string }>;
  packageFetches: PackageFetch[];
  usage: ReportUsage;
  verified: Verified;
}

/** Why one attempt at a job ran. */
export type AttemptCause = 'initial' | 'unverified' | 'crashed' | 'timedOut' | 'noReport';

/**
 * One run attempt at a job, with its own full outcome (a non-final attempt's result is kept, not
 * discarded). The runner keeps every attempt it made; exactly one is `final`.
 */
export interface Attempt extends RunOutcome {
  cause: AttemptCause;
  final: boolean;
  /** This attempt's own transcript file, relative to the results directory. */
  transcript: string;
}

/** The freeze manifest a gated batch's report was stamped against. */
export interface FreezeStamp {
  tag: string;
  manifestHash: string;
  chainHead: string;
}

/** A job report: its top-level fields mirror the final attempt (see `RunOutcome`). */
export interface JobReport extends RunOutcome {
  id: string;
  class: string;
  model: string;
  /**
   * Every attempt the runner made at this job. A fresh run's report always carries at least one
   * entry, even a single successful attempt; only a report loaded from before attempts existed
   * (the earlier saved shape) may omit it.
   */
  attempts?: Attempt[];
  /** Set when a batch-level stop left this job unstarted, naming what stopped the batch. */
  stoppedBy?: 'rateLimit' | 'auth' | 'budget';
  /** The freeze manifest this report was gated against. Set only on a gated batch's report. */
  freeze?: FreezeStamp;
}

/** One catch judge ruling for a plant item in its packet. */
export interface CatchRuling {
  itemId: string;
  ruling: 'caught' | 'missed';
  reason: string;
}

/** The catch judge's structured output: one ruling per plant item its packet carried. */
export interface CatchJudgeOutput {
  rulings: CatchRuling[];
}

/** How the adjudicator classified one catch-field item before ruling it. */
export type AdjudicationClass = 'finding' | 'interpretation' | 'notAClaim';

/** An adjudication that classified its item as a finding: it also carries the real/false/harness ruling and the subject group the finding pools under. */
export interface FindingAdjudication {
  itemId: string;
  class: 'finding';
  /** The group items sharing a subject (same page, same claimed fact) are pooled under. */
  subjectGroupId: string;
  ruling: 'real' | 'false' | 'harness';
  reason: string;
}

/** An adjudication that classified its item as an interpretation choice or not a claim at all. */
export interface NonFindingAdjudication {
  itemId: string;
  class: 'interpretation' | 'notAClaim';
  reason: string;
}

/** One adjudicator ruling for a catch-field item in its packet. */
export type Adjudication = FindingAdjudication | NonFindingAdjudication;

/** The adjudicator's structured output: one adjudication per catch-field item its packet carried. */
export interface AdjudicatorOutput {
  adjudications: Adjudication[];
}

/** One agreement read's ruling over a re-ruled finding or catch call the scorer's sample drew. */
export interface AgreementRuling {
  itemId: string;
  ruling: 'real' | 'false' | 'harness' | 'caught' | 'missed';
  reason: string;
}

/** The agreement read's structured output: one ruling per sampled item. */
export interface AgreementOutput {
  rulings: AgreementRuling[];
}

/** Why a batch stopped. */
export type StopReason = 'complete' | 'auth' | 'rateLimit' | 'budget';

/** A batch-stopping failure a transcript can show. */
export type Failure = 'auth' | 'rateLimit';

/** The executor's result for one run. */
export interface RunResult {
  events: StreamEvent[];
  stdout: string;
  proxyLog?: ProxyRecord[];
  preparedRoot: string;
  canaries?: string[];
  timedOut: boolean;
  aborted: boolean;
  exitCode?: number | null;
}

/** What the runner needs from an executor. */
export interface Executor {
  checkToken(): Promise<{ events: StreamEvent[]; stdout: string }>;
  run(
    job: Job,
    decl: ClassDecl,
    options: { signal: AbortSignal; onEvent: (event: StreamEvent) => void; prompt: string; reportSchema: object },
  ): Promise<RunResult>;
  release?(job: Job): Promise<void>;
}

/** One ledger entry. */
export interface LedgerEntry {
  batch: string;
  runId: string;
  job: string;
  model: string;
  usage: Usage;
  counted?: number;
}

/** A batch report, before the CLI adds the CLI version, run root, and teardown result. */
export interface BatchReport {
  batch: string;
  runId: string;
  stopReason: StopReason;
  budgetTokens: number;
  usage: ReportUsage;
  jobs: JobReport[];
  verified: boolean;
}
