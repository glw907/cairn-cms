import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlantedOverlay, EVALUATOR_DOCS_SET, VALIDATION_CONTRACT_PAGES } from '../../../scripts/docs-readers/prepare-validation.js';
import { CONTRACT_PAGES } from '../../../scripts/docs-readers/prepare-baseline.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** A fresh scratch directory, removed by the caller. */
function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `docs-readers-prepare-validation-${prefix}-`));
}

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
}

describe('applyPlantedOverlay', () => {
  it('copies every planted file onto its matching path, leaving an untouched control file alone', () => {
    const dest = tmp('dest');
    const planted = tmp('planted');
    try {
      write(join(dest, 'docs/guide.md'), 'control text\n');
      write(join(dest, 'docs/other.md'), 'unrelated control text\n');
      write(join(planted, 'docs/guide.md'), 'planted defect text\n');
      applyPlantedOverlay(planted, dest);
      expect(readFileSync(join(dest, 'docs/guide.md'), 'utf8')).toBe('planted defect text\n');
      expect(readFileSync(join(dest, 'docs/other.md'), 'utf8')).toBe('unrelated control text\n');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('recurses into nested planted directories', () => {
    const dest = tmp('dest-nested');
    const planted = tmp('planted-nested');
    try {
      write(join(dest, 'docs/reference/schema/a.schema.json'), '{"version":1}');
      write(join(planted, 'docs/reference/schema/a.schema.json'), '{"version":2}');
      applyPlantedOverlay(planted, dest);
      expect(readFileSync(join(dest, 'docs/reference/schema/a.schema.json'), 'utf8')).toBe('{"version":2}');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws when the planted directory does not exist', () => {
    const dest = tmp('dest-missing');
    try {
      expect(() => applyPlantedOverlay(join(dest, 'no-such-planted-dir'), dest)).toThrow(/does not exist/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('throws when the planted directory exists but holds no files', () => {
    const dest = tmp('dest-empty');
    const planted = tmp('planted-empty');
    try {
      mkdirSync(join(planted, 'docs'), { recursive: true });
      expect(() => applyPlantedOverlay(planted, dest)).toThrow(/is empty/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });
});

describe('EVALUATOR_DOCS_SET', () => {
  it('matches batches/baseline.json’s own evaluator job docsSet', () => {
    const baseline = JSON.parse(readFileSync(join(ROOT, 'scripts/docs-readers/batches/baseline.json'), 'utf8')) as {
      jobs: Array<{ id: string; docsSet: string[] }>;
    };
    const evaluatorJob = baseline.jobs.find((job) => job.id === 'evaluator-1');
    expect(evaluatorJob).toBeDefined();
    expect([...EVALUATOR_DOCS_SET].sort()).toEqual([...(evaluatorJob?.docsSet ?? [])].sort());
  });
});

describe('VALIDATION_CONTRACT_PAGES', () => {
  it('pins every one of the baseline’s contract pages to HEAD, keeping every other field', () => {
    expect(VALIDATION_CONTRACT_PAGES).toHaveLength(CONTRACT_PAGES.length);
    for (const [index, spec] of VALIDATION_CONTRACT_PAGES.entries()) {
      expect(spec.commit).toBe('HEAD');
      expect(spec.name).toBe(CONTRACT_PAGES[index].name);
      expect(spec.page).toBe(CONTRACT_PAGES[index].page);
      expect(spec.schemas).toEqual(CONTRACT_PAGES[index].schemas);
    }
  });
});
