import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESERVED_CANARY_NOTE, PRESERVED_INIT_NOTE, reverifyJob, reverifyRoot } from '../../../scripts/docs-readers/reverify.js';
import type { Job, JobReport } from '../../../scripts/docs-readers/lib/types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED = join(ROOT, 'scripts/docs-readers/fixtures/prepared');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/transcripts');

/** A minimal saved JobReport, its verified block overridable. */
function savedJob(verified: Partial<JobReport['verified']> = {}): JobReport {
  return {
    id: 'j',
    class: 'docs-only',
    model: 'claude-opus-5-5',
    outcome: 'done',
    stalls: [],
    assumed: [],
    pagesRead: [],
    quotes: [],
    checks: [],
    ruleCandidates: [],
    denials: [],
    proxyBlocked: [],
    packageFetches: [],
    usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
    verified: { ok: true, init: true, canaries: true, quotes: [], problems: [], ...verified },
  };
}

/** A minimal batch Job, its docsSet and prepared overridable. */
function batchJob(overrides: Partial<Job> = {}): Job {
  return { id: 'j', class: 'docs-only', model: 'claude-opus-5-5', arrival: 'a', job: 'j', docsSet: ['docs'], timeoutMinutes: 30, ...overrides };
}

describe('reverifyRoot', () => {
  it('falls back to repoRoot when the batch job carries no prepared field', () => {
    expect(reverifyRoot(undefined, '/repo')).toBe('/repo');
  });

  it('resolves a relative prepared field against repoRoot', () => {
    expect(reverifyRoot('scripts/docs-readers/fixtures/prepared', '/repo')).toBe('/repo/scripts/docs-readers/fixtures/prepared');
  });

  it('leaves an absolute prepared field as is', () => {
    expect(reverifyRoot('/cache/prepared/site', '/repo')).toBe('/cache/prepared/site');
  });
});

describe('reverifyJob', () => {
  it('re-derives pagesRead and quotes from the saved transcript, verifying clean', () => {
    const transcriptText = readFileSync(join(FIXTURES, 'clean-docs-only.jsonl'), 'utf8');
    const result = reverifyJob({ job: savedJob(), batchJob: batchJob(), transcriptText, repoRoot: PREPARED });
    expect(result.id).toBe('j');
    expect(result.pagesRead).toEqual(['docs/guide.md', 'docs/other.md']);
    expect(result.verified).toMatchObject({ ok: true, problems: [] });
  });

  it('catches a quote that only verifies once the fixed line-span rule and cwd tracking apply', () => {
    // wrong-line's own quote is genuinely off by one line, so it still correctly fails; this
    // proves reverifyJob runs the real (fixed) verification logic, not a stale cached verdict.
    const transcriptText = readFileSync(join(FIXTURES, 'unverified-wrong-line.jsonl'), 'utf8');
    const result = reverifyJob({ job: savedJob(), batchJob: batchJob(), transcriptText, repoRoot: PREPARED });
    expect(result.verified.ok).toBe(false);
    expect(result.verified.problems).toEqual(['quote docs/guide.md:4 unverified: text starts on line 3, not 4']);
  });

  it('carries an already-failed init or canary verdict over, noting it was not re-checked', () => {
    const transcriptText = readFileSync(join(FIXTURES, 'clean-docs-only.jsonl'), 'utf8');
    const failedInit = reverifyJob({ job: savedJob({ init: false }), batchJob: batchJob(), transcriptText, repoRoot: PREPARED });
    expect(failedInit.verified.ok).toBe(false);
    expect(failedInit.verified.problems).toContain(`init: ${PRESERVED_INIT_NOTE}`);
    const failedCanary = reverifyJob({ job: savedJob({ canaries: false }), batchJob: batchJob(), transcriptText, repoRoot: PREPARED });
    expect(failedCanary.verified.ok).toBe(false);
    expect(failedCanary.verified.problems).toContain(`canary loaded: 1 canary string(s) in the transcript`);
  });
});
