import { describe, it, expect } from 'vitest';
import { parseBatch, DEFAULT_TIMEOUT_MINUTES } from '../../../scripts/docs-readers/lib/batch.js';
import { loadClasses } from '../../../scripts/docs-readers/lib/class-schema.js';

const classes = loadClasses();

const docsJob = {
  id: 'evaluator-1',
  class: 'docs-only',
  model: 'claude-opus-5-5',
  arrival: 'You are weighing whether to adopt the system.',
  job: 'Decide whether it fits a two-person team.',
  docsSet: ['docs/why-cairn.md', 'docs/admin/'],
};

const batch = (jobs: unknown[], extra: Record<string, unknown> = {}) => ({
  name: 'baseline',
  concurrency: 2,
  budgetTokens: 500000,
  jobs,
  ...extra,
});

describe('parseBatch', () => {
  it('accepts a valid batch from JSON text, normalizing docs-set paths and filling the timeout', () => {
    const parsed = parseBatch(JSON.stringify(batch([docsJob])), classes);
    expect(parsed.jobs[0].docsSet).toEqual(['docs/why-cairn.md', 'docs/admin']);
    expect(parsed.jobs[0].timeoutMinutes).toBe(DEFAULT_TIMEOUT_MINUTES);
    expect(parsed.concurrency).toBe(2);
  });

  it('rejects an undeclared class, a repeated id, and a docs-set path that climbs out', () => {
    const bad = batch([
      docsJob,
      { ...docsJob },
      { ...docsJob, id: 'other', class: 'operator' },
      { ...docsJob, id: 'escape', docsSet: ['../secrets.md'] },
    ]);
    expect(() => parseBatch(bad, classes)).toThrow(/id "evaluator-1" repeats/);
    expect(() => parseBatch(bad, classes)).toThrow(/class "operator" is not declared/);
    expect(() => parseBatch(bad, classes)).toThrow(/relative and stay inside the tree/);
  });

  it('rejects an absolute docs-set path and an empty docs set', () => {
    expect(() => parseBatch(batch([{ ...docsJob, docsSet: ['/etc/passwd'] }]), classes)).toThrow(/stay inside the tree/);
    expect(() => parseBatch(batch([{ ...docsJob, docsSet: [] }]), classes)).toThrow(/docsSet must be a non-empty array/);
  });

  it('requires a prepared directory for a prepared-contents class, and accepts an optional one for a docs-set class', () => {
    const repoJob = { ...docsJob, id: 'core-1', class: 'repository', docsSet: ['CONTRIBUTING.md'] };
    expect(() => parseBatch(batch([repoJob]), classes)).toThrow(/needs a prepared directory/);
    expect(parseBatch(batch([{ ...repoJob, prepared: '/tmp/export' }]), classes).jobs[0].prepared).toBe('/tmp/export');
    // A docs-set class job carries no prepared field at all by default, and copies from sourceRoot.
    expect(parseBatch(batch([docsJob]), classes).jobs[0].prepared).toBeUndefined();
    // Given one, a docs-set class job keeps it, to copy its docs set from there instead.
    expect(parseBatch(batch([{ ...docsJob, prepared: '/tmp/x' }]), classes).jobs[0].prepared).toBe('/tmp/x');
    expect(() => parseBatch(batch([{ ...docsJob, prepared: '   ' }]), classes)).toThrow(/prepared directory, when given, must be a non-empty string/);
  });

  it('rejects a missing budget, a zero concurrency, an unknown field, and an empty job text', () => {
    expect(() => parseBatch(batch([docsJob], { budgetTokens: 0 }), classes)).toThrow(/budgetTokens/);
    expect(() => parseBatch(batch([docsJob], { concurrency: 0 }), classes)).toThrow(/concurrency/);
    expect(() => parseBatch(batch([{ ...docsJob, extra: true }]), classes)).toThrow(/unknown field "extra"/);
    expect(() => parseBatch(batch([{ ...docsJob, job: '  ' }]), classes)).toThrow(/job must be a non-empty string/);
  });
});
