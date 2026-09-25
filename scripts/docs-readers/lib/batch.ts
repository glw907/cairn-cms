/**
 * Batch-file parsing. A batch names its jobs, a concurrency limit, and a token budget; every job
 * names its class, its reader model, the job text and arrival state it is given on stdin, and its
 * docs set (the pages the job is about, which are also the pages its quotes must cover).
 */
import { isAbsolute, normalize } from 'node:path';
import type { Batch, ClassDecl, Job } from './types.js';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const BATCH_FIELDS = ['name', 'concurrency', 'budgetTokens', 'jobs', 'gated'];
const JOB_FIELDS = ['id', 'class', 'model', 'arrival', 'job', 'docsSet', 'prepared', 'timeoutMinutes', 'absent', 'commit'];

/** The per-job wall-clock limit when a job does not set one. */
export const DEFAULT_TIMEOUT_MINUTES = 30;

/**
 * Check that a path stays inside the tree it is relative to.
 * @param path - A path from a batch file.
 * @returns True when the path is relative and never climbs out.
 */
function isContainedRelative(path: unknown): boolean {
  if (typeof path !== 'string' || path.trim() === '' || isAbsolute(path)) return false;
  const clean = normalize(path);
  return clean !== '..' && !clean.startsWith('../');
}

/**
 * Parse and validate a batch.
 * @param raw - The batch JSON text, or an already-parsed object.
 * @param classes - The loaded class declarations, keyed by name.
 * @returns The batch with defaults filled and docs-set paths normalized.
 * @throws With every problem found, when the batch is invalid.
 */
export function parseBatch(raw: unknown, classes: Map<string, ClassDecl>): Batch {
  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const problems: string[] = [];
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('batch: not an object');
  }
  const batch = parsed as Record<string, unknown>;
  for (const key of Object.keys(batch)) {
    if (!BATCH_FIELDS.includes(key)) problems.push(`unknown batch field "${key}"`);
  }
  if (typeof batch.name !== 'string' || !ID_PATTERN.test(batch.name)) problems.push('name must be a lowercase slug');
  if (!Number.isInteger(batch.concurrency) || (batch.concurrency as number) < 1) problems.push('concurrency must be a positive integer');
  if (!Number.isInteger(batch.budgetTokens) || (batch.budgetTokens as number) < 1) problems.push('budgetTokens must be a positive integer');
  if (!Array.isArray(batch.jobs) || batch.jobs.length === 0) {
    problems.push('jobs must be a non-empty array');
  }
  if (batch.gated !== undefined && typeof batch.gated !== 'boolean') problems.push('gated, when given, must be a boolean');
  const seen = new Set<string>();
  const jobs = (Array.isArray(batch.jobs) ? (batch.jobs as unknown[]) : []).map((item, index) => {
    const where = `job ${index + 1}`;
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      problems.push(`${where}: not an object`);
      return item as Job;
    }
    const job = item as Record<string, unknown>;
    for (const key of Object.keys(job)) {
      if (!JOB_FIELDS.includes(key)) problems.push(`${where}: unknown field "${key}"`);
    }
    if (typeof job.id !== 'string' || !ID_PATTERN.test(job.id)) problems.push(`${where}: id must be a lowercase slug`);
    else if (seen.has(job.id)) problems.push(`${where}: id "${job.id}" repeats`);
    else seen.add(job.id);
    const decl = classes.get(String(job.class));
    if (!decl) problems.push(`${where}: class "${job.class}" is not declared`);
    for (const field of ['model', 'arrival', 'job']) {
      const value = job[field];
      if (typeof value !== 'string' || value.trim() === '') problems.push(`${where}: ${field} must be a non-empty string`);
    }
    if (!Array.isArray(job.docsSet) || job.docsSet.length === 0) {
      problems.push(`${where}: docsSet must be a non-empty array`);
    } else if (!job.docsSet.every(isContainedRelative)) {
      problems.push(`${where}: every docsSet path must be relative and stay inside the tree`);
    }
    if (decl?.contents === 'prepared' && (typeof job.prepared !== 'string' || job.prepared.trim() === '')) {
      problems.push(`${where}: class "${decl.name}" needs a prepared directory`);
    }
    // A docs-set class job's `prepared` is optional: when given, it names a directory to copy the
    // job's own docs set from instead of the run's own sourceRoot; when omitted, the job copies
    // from sourceRoot as it always has. Either way the field, when present, must be a real path,
    // not a blank string.
    if (decl?.contents === 'docs-set' && job.prepared !== undefined && (typeof job.prepared !== 'string' || job.prepared.trim() === '')) {
      problems.push(`${where}: class "${decl.name}"'s prepared directory, when given, must be a non-empty string`);
    }
    const timeout = job.timeoutMinutes;
    if (timeout !== undefined && !(typeof timeout === 'number' && timeout > 0)) {
      problems.push(`${where}: timeoutMinutes must be a positive number`);
    }
    if (job.absent !== undefined && (!Array.isArray(job.absent) || !job.absent.every(isContainedRelative))) {
      problems.push(`${where}: absent, when given, must be an array of relative paths that stay inside the tree`);
    }
    if (job.commit !== undefined && (typeof job.commit !== 'string' || job.commit.trim() === '')) {
      problems.push(`${where}: commit, when given, must be a non-empty string`);
    }
    return {
      ...job,
      docsSet: Array.isArray(job.docsSet) ? job.docsSet.map((p) => (typeof p === 'string' ? normalize(p).replace(/\/$/, '') : p)) : job.docsSet,
      timeoutMinutes: timeout ?? DEFAULT_TIMEOUT_MINUTES,
    } as Job;
  });
  if (problems.length > 0) throw new Error(`batch: ${problems.join('; ')}`);
  return { ...(batch as unknown as Batch), jobs };
}
