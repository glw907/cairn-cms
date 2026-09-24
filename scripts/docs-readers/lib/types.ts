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
}

/** A parsed batch. */
export interface Batch {
  name: string;
  concurrency: number;
  budgetTokens: number;
  jobs: Job[];
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

/** The reader's structured report. */
export interface ReaderReport {
  outcome: 'done' | 'stalled' | 'refused';
  stalls: string[];
  assumed: string[];
  quotes: Quote[];
  ruleCandidates: string[];
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

/** A job report: outcome `aborted` and `error` are the runner's, the other three the reader's. */
export interface JobReport {
  id: string;
  class: string;
  model: string;
  outcome: 'done' | 'stalled' | 'refused' | 'aborted' | 'error';
  abortReason?: string;
  stalls: string[];
  assumed: string[];
  pagesRead: string[];
  quotes: VerifiedQuote[];
  checks: unknown[];
  ruleCandidates: string[];
  denials: Denial[];
  proxyBlocked: Array<{ method?: string; target?: string; reason?: string; time?: string }>;
  packageFetches: PackageFetch[];
  usage: ReportUsage;
  verified: Verified;
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
