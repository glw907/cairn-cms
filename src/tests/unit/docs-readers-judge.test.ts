import { describe, it, expect } from 'vitest';
import { checkJudgeJobField, composeJudgePrompt, JUDGE_FIELD_UNUSED, runJudgeBatch } from '../../../scripts/docs-readers/lib/runner.js';
import { loadClasses, loadJudgePrompt } from '../../../scripts/docs-readers/lib/class-schema.js';
import { parseBatch } from '../../../scripts/docs-readers/lib/batch.js';
import { ADJUDICATOR_SCHEMA, AGREEMENT_SCHEMA, CATCH_JUDGE_SCHEMA, judgeReportSchema } from '../../../scripts/docs-readers/lib/judge-verify.js';
import type { LedgerEntry, StreamEvent } from '../../../scripts/docs-readers/lib/types.js';

const classes = loadClasses();
const baselines = {
  '2.1.280': {
    skills: [
      'batch', 'claude-api', 'code-review', 'dataviz', 'debug', 'deep-research', 'doctor', 'fewer-permission-prompts',
      'loop', 'run', 'run-skill-generator', 'schedule', 'simplify', 'update-config', 'verify', 'workflow-authoring',
    ],
    plugins: [],
  },
};

type Event = StreamEvent;

/** A clean init event a judge class's session shows. */
const INIT: Event = {
  type: 'system',
  subtype: 'init',
  tools: ['Glob', 'Grep', 'Read', 'StructuredOutput'],
  mcp_servers: [],
  model: 'claude-opus-5-5',
  apiKeySource: 'none',
  claude_code_version: '2.1.280',
  skills: baselines['2.1.280'].skills,
  plugins: [],
  agents: [],
};

/**
 * One assistant message carrying a fixed amount of counted usage.
 * @param counted - The input-token count to give the message (the only field the budget watch reads).
 */
function assistantEvent(counted = 10): Event {
  return { type: 'assistant', message: { id: 'm1', content: [], usage: { input_tokens: counted, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } };
}

/**
 * The result event a judge run ends on.
 * @param structured_output - The judge's parsed JSON output.
 */
function resultEvent(structured_output: unknown): Event {
  return { type: 'result', is_error: false, structured_output, modelUsage: { 'claude-opus-5-5': { inputTokens: 10, outputTokens: 5, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } } };
}

const okCheck: Event[] = [{ type: 'result', is_error: false, modelUsage: { haiku: { inputTokens: 100, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } } }];

/**
 * One judge batch of the given class, over fixture jobs. `job` defaults to `JUDGE_FIELD_UNUSED`,
 * the marker `checkJudgeJobField` accepts, since the runner never reads a job's own `arrival` or
 * `job` text; `arrival` stays an arbitrary placeholder for the same reason.
 */
function judgeBatchOf(ids: string[], className: string, extra: Record<string, unknown> = {}) {
  return parseBatch(
    {
      name: 'fixture-judge',
      concurrency: 1,
      budgetTokens: 1_000_000,
      jobs: ids.map((id) => ({ id, class: className, model: 'claude-opus-5-5', arrival: 'Judge this packet.', job: JUDGE_FIELD_UNUSED, docsSet: ['.'], prepared: '/dev/null' })),
      ...extra,
    },
    classes,
  );
}

/**
 * An executor that returns one fixed stream per job, ignoring the mount (buildJudgeOutcome never
 * reads the filesystem). `prompts` captures the stdin text each `run` call received, keyed by job
 * id, so a test can assert on what actually reached the container.
 */
function replayExecutor(streams: Record<string, Event[][]>) {
  const started: string[] = [];
  const prompts: Record<string, string> = {};
  const calls = new Map<string, number>();
  const ledger: LedgerEntry[] = [];
  const executor = {
    started,
    prompts,
    checkToken: async () => ({ events: okCheck, stdout: '' }),
    run: async (job: { id: string }, _decl: unknown, { prompt }: { prompt: string }) => {
      started.push(job.id);
      prompts[job.id] = prompt;
      const attempt = calls.get(job.id) ?? 0;
      calls.set(job.id, attempt + 1);
      const events = streams[job.id][Math.min(attempt, streams[job.id].length - 1)];
      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      return { events, stdout, proxyLog: [], preparedRoot: '/dev/null', canaries: ['canary-unused'], timedOut: false, aborted: false, exitCode: 0 };
    },
  };
  return { executor, ledger: { append: (e: LedgerEntry) => void ledger.push(e) }, entries: ledger };
}

describe('composeJudgePrompt', () => {
  it('names the packet index in the arrival line, then the frozen prompt, with no report request appended', () => {
    const prompt = composeJudgePrompt('catchJudge');
    expect(prompt.split('\n\n')[0]).toContain('index.json');
    expect(prompt).toContain(loadJudgePrompt('catchJudge').trim());
  });

  it('maps each of the three judge kinds to its own distinct frozen prompt', () => {
    const prompts = {
      catchJudge: composeJudgePrompt('catchJudge'),
      adjudicator: composeJudgePrompt('adjudicator'),
      agreement: composeJudgePrompt('agreement'),
    };
    expect(prompts.catchJudge).toContain(loadJudgePrompt('catchJudge').trim());
    expect(prompts.adjudicator).toContain(loadJudgePrompt('adjudicator').trim());
    expect(prompts.agreement).toContain(loadJudgePrompt('agreement').trim());
    expect(new Set(Object.values(prompts)).size).toBe(3);
  });
});

describe('checkJudgeJobField', () => {
  it('accepts the JUDGE_FIELD_UNUSED marker', () => {
    expect(checkJudgeJobField({ id: 'a', job: JUDGE_FIELD_UNUSED }, 'catchJudge')).toBeUndefined();
  });

  it('accepts job text byte-identical to the kind\'s own frozen prompt', () => {
    expect(checkJudgeJobField({ id: 'a', job: loadJudgePrompt('adjudicator') }, 'adjudicator')).toBeUndefined();
  });

  it('refuses a placeholder that is neither the marker nor the frozen prompt, naming the job', () => {
    const problem = checkJudgeJobField({ id: 'evaluator-planted-1', job: 'n/a: judge class, packet-driven' }, 'catchJudge');
    expect(problem).toContain('job evaluator-planted-1');
  });

  it('refuses one kind\'s frozen prompt sent under another kind', () => {
    const problem = checkJudgeJobField({ id: 'a', job: loadJudgePrompt('catchJudge') }, 'adjudicator');
    expect(problem).toContain('job a');
  });
});

describe('runJudgeBatch: the job field gate', () => {
  it('sends the kind\'s frozen prompt bytes on stdin for a job carrying JUDGE_FIELD_UNUSED', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [] })];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j-frozen-prompt',
      kind: 'catchJudge',
      expectedItems: { a: [] },
    });
    expect(report.verified).toBe(true);
    expect(executor.prompts.a).toContain(loadJudgePrompt('catchJudge').trim());
  });

  it('refuses the whole batch, naming the job, before any container starts, when a job carries the old placeholder', async () => {
    const { executor, ledger } = replayExecutor({});
    const batch = judgeBatchOf(['evaluator-planted-1'], 'judge-catch', {
      jobs: [{ id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', arrival: 'n/a: judge class, packet-driven', job: 'n/a: judge class, packet-driven', docsSet: ['.'], prepared: '/dev/null' }],
    });
    const run = runJudgeBatch({
      batch,
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j-placeholder-refused',
      kind: 'catchJudge',
      expectedItems: {},
    });
    await expect(run).rejects.toThrow('job evaluator-planted-1');
    expect(executor.started).toEqual([]);
  });
});

describe('judgeReportSchema', () => {
  it('picks the catch judge schema, requiring rulings[]', () => {
    expect(judgeReportSchema('catchJudge')).toBe(CATCH_JUDGE_SCHEMA);
  });
  it('picks the adjudicator schema, a discriminated union over adjudications[]', () => {
    const schema = judgeReportSchema('adjudicator') as { properties: { adjudications: { items: { oneOf: unknown[] } } } };
    expect(schema).toBe(ADJUDICATOR_SCHEMA);
    expect(schema.properties.adjudications.items.oneOf).toHaveLength(2);
  });
  it('picks the agreement schema, requiring rulings[]', () => {
    expect(judgeReportSchema('agreement')).toBe(AGREEMENT_SCHEMA);
  });
});

describe('runJudgeBatch: expectedItems coverage', () => {
  it('throws when a job carries no expectedItems entry, rather than verifying vacuously', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [] })];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const run = runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j-missing-expected',
      kind: 'catchJudge',
      expectedItems: {},
    });
    await expect(run).rejects.toThrow('expectedItems carries no entry');
  });

  it('accepts an explicit empty list, verifying a run with no rulings', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [] })];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j-empty-expected',
      kind: 'catchJudge',
      expectedItems: { a: [] },
    });
    expect(report.jobs[0].verified.ok).toBe(true);
  });
});

describe('runJudgeBatch: the catch judge', () => {
  it('completes with a verified ruling for every plant entry the packet named', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r1' }, { itemId: 'plant-2', ruling: 'missed', reason: 'r2' }] })];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j1',
      kind: 'catchJudge',
      expectedItems: { a: [{ itemId: 'plant-1' }, { itemId: 'plant-2' }] },
    });
    expect(report.stopReason).toBe('complete');
    expect(report.verified).toBe(true);
    expect(report.kind).toBe('catchJudge');
    const job = report.jobs[0];
    expect(job.verified.ok).toBe(true);
    expect(job.rulings).toEqual([
      { itemId: 'plant-1', ruling: 'caught', reason: 'r1' },
      { itemId: 'plant-2', ruling: 'missed', reason: 'r2' },
    ]);
    expect(job.attempts).toHaveLength(1);
  });

  it('is unverified, and reruns once, when one plant entry gets no ruling', async () => {
    const missing = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r1' }] })];
    const complete = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r1' }, { itemId: 'plant-2', ruling: 'missed', reason: 'r2' }] })];
    const { executor, ledger } = replayExecutor({ a: [missing, complete] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j2',
      kind: 'catchJudge',
      expectedItems: { a: [{ itemId: 'plant-1' }, { itemId: 'plant-2' }] },
    });
    const job = report.jobs[0];
    expect(job.attempts?.map((a) => [a.cause, a.final])).toEqual([
      ['initial', false],
      ['unverified', true],
    ]);
    expect(job.attempts?.[0].verified.problems.some((p) => p.includes('plant-2'))).toBe(true);
    expect(job.verified.ok).toBe(true);
  });

  it('is unverified when the same item is ruled twice', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r1' }, { itemId: 'plant-1', ruling: 'missed', reason: 'r2' }] })];
    const { executor, ledger } = replayExecutor({ a: [events, events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j3',
      kind: 'catchJudge',
      expectedItems: { a: [{ itemId: 'plant-1' }] },
    });
    const job = report.jobs[0];
    expect(job.attempts?.[0].verified.ok).toBe(false);
    expect(job.attempts?.[0].verified.problems.some((p) => p.includes('ruled 2 time'))).toBe(true);
  });
});

describe('runJudgeBatch: the adjudicator', () => {
  it('parses the discriminated union and verifies when every packet item is ruled once', async () => {
    const output = {
      adjudications: [
        { itemId: 'item-1', class: 'finding', subjectGroupId: 'g1', ruling: 'real', reason: 'matches the code' },
        { itemId: 'item-2', class: 'interpretation', reason: 'a naming choice' },
      ],
    };
    const events = [INIT, assistantEvent(), resultEvent(output)];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-adjudicator'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j4',
      kind: 'adjudicator',
      expectedItems: { a: [{ itemId: 'item-1' }, { itemId: 'item-2' }] },
    });
    const job = report.jobs[0];
    expect(job.verified.ok).toBe(true);
    expect(job.rulings).toEqual(output.adjudications);
  });
});

describe('runJudgeBatch: the agreement read', () => {
  it('is unverified when a finding item is ruled with a catch-call label', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'f-1', ruling: 'caught', reason: 'wrong label set' }] })];
    const { executor, ledger } = replayExecutor({ a: [events, events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-agreement'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j5',
      kind: 'agreement',
      expectedItems: { a: [{ itemId: 'f-1', expectedKind: 'finding' }] },
    });
    const job = report.jobs[0];
    expect(job.attempts?.[0].verified.ok).toBe(false);
    expect(job.attempts?.[0].verified.problems.some((p) => p.includes('a finding'))).toBe(true);
  });

  it('verifies a correctly labeled mix of a finding and a catch call', async () => {
    const events = [
      INIT,
      assistantEvent(),
      resultEvent({ rulings: [{ itemId: 'f-1', ruling: 'false', reason: 'answered elsewhere' }, { itemId: 'c-1', ruling: 'caught', reason: 'meets the criterion' }] }),
    ];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-agreement'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j6',
      kind: 'agreement',
      expectedItems: { a: [{ itemId: 'f-1', expectedKind: 'finding' }, { itemId: 'c-1', expectedKind: 'catchCall' }] },
    });
    expect(report.jobs[0].verified.ok).toBe(true);
  });
});

describe('runJudgeBatch: the freeze stamp', () => {
  it('stamps a gated judge report with its own kind’s expected model, never models.reader', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r1' }] })];
    const { executor, ledger } = replayExecutor({ a: [events] });
    const freeze = { tag: 'docs-reset-1b-freeze', manifestHash: 'deadbeef', chainHead: 'cafebabe', expectedModel: 'claude-opus-5-5' };
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j7',
      kind: 'catchJudge',
      expectedItems: { a: [{ itemId: 'plant-1' }] },
      freeze,
    });
    expect(report.jobs[0]).toMatchObject({ freeze: { tag: 'docs-reset-1b-freeze', manifestHash: 'deadbeef', chainHead: 'cafebabe' }, verified: { ok: true } });
  });

  it('marks a gated judge run unverified when its init model differs from the manifest', async () => {
    const events = [INIT, assistantEvent(), resultEvent({ rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r1' }] })];
    const { executor, ledger } = replayExecutor({ a: [events, events] });
    const freeze = { tag: 'docs-reset-1b-freeze', manifestHash: 'deadbeef', chainHead: 'cafebabe', expectedModel: 'fable' };
    const { report } = await runJudgeBatch({
      batch: judgeBatchOf(['a'], 'judge-catch'),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'j8',
      kind: 'catchJudge',
      expectedItems: { a: [{ itemId: 'plant-1' }] },
      freeze,
    });
    expect(report.jobs[0].attempts?.[0].verified.problems.some((p) => p.includes('init model'))).toBe(true);
  });
});
