import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlantedOverlay, applyScripterPlantedOverlay, EVALUATOR_DOCS_SET, VALIDATION_CONTRACT_PAGES } from '../../../scripts/docs-readers/prepare-validation.js';
import { CONTRACT_PAGES } from '../../../scripts/docs-readers/prepare-baseline.js';
import type { ContractPageSpec } from '../../../scripts/docs-readers/lib/prepare-class.js';

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

  it('throws, naming the missing target, when a planted path has no matching target in dest', () => {
    // A mistyped or misplaced plant (a path the control tree never carries) must fail loudly
    // rather than land as a stray new file.
    const dest = tmp('dest-no-target');
    const planted = tmp('planted-no-target');
    try {
      write(join(planted, 'docs/never-copied.md'), 'planted defect text\n');
      expect(() => applyPlantedOverlay(planted, dest)).toThrow(/no matching target/);
      expect(existsSync(join(dest, 'docs/never-copied.md'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws when a docsSet is given and a planted path is not one of its pages', () => {
    const dest = tmp('dest-docsset');
    const planted = tmp('planted-docsset');
    try {
      write(join(dest, 'docs/guide.md'), 'control text\n');
      write(join(planted, 'docs/guide.md'), 'planted defect text\n');
      expect(() => applyPlantedOverlay(planted, dest, ['docs/other.md'])).toThrow(/not one of the job's own docsSet pages/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('passes when a docsSet is given and every planted path is one of its pages', () => {
    const dest = tmp('dest-docsset-ok');
    const planted = tmp('planted-docsset-ok');
    try {
      write(join(dest, 'docs/guide.md'), 'control text\n');
      write(join(planted, 'docs/guide.md'), 'planted defect text\n');
      applyPlantedOverlay(planted, dest, ['docs/guide.md']);
      expect(readFileSync(join(dest, 'docs/guide.md'), 'utf8')).toBe('planted defect text\n');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });
});

describe('applyScripterPlantedOverlay', () => {
  const pages: ContractPageSpec[] = [
    { name: 'json-output', commit: 'HEAD', page: 'docs/reference/cli-cairn-json-output.md', schemas: ['docs/reference/schema/cairn-doctor.schema.json'] },
    { name: 'doctor', commit: 'HEAD', page: 'docs/reference/cli-cairn-doctor.md', schemas: ['docs/reference/schema/cairn-doctor.schema.json'] },
    { name: 'exit-codes', commit: 'HEAD', page: 'docs/reference/cli-cairn-exit-codes.md', schemas: [] },
  ];

  /** A bundle-shaped control tree, one subdirectory per page spec, each carrying its own page and schemas. */
  function writeBundle(dest: string): void {
    for (const spec of pages) {
      write(join(dest, spec.name, spec.page), `control ${spec.name} page\n`);
      for (const schema of spec.schemas) write(join(dest, spec.name, schema), `{"control":"${spec.name}"}`);
    }
  }

  it('copies a planted page into its own bundle subdirectory, leaving no top-level file', () => {
    const dest = tmp('scripter-dest');
    const planted = tmp('scripter-planted');
    try {
      writeBundle(dest);
      write(join(planted, 'docs/reference/cli-cairn-json-output.md'), 'planted json-output page\n');
      applyScripterPlantedOverlay(planted, dest, pages);
      expect(readFileSync(join(dest, 'json-output/docs/reference/cli-cairn-json-output.md'), 'utf8')).toBe('planted json-output page\n');
      expect(existsSync(join(dest, 'docs/reference/cli-cairn-json-output.md'))).toBe(false);
      // The other two subdirectories' own pages are untouched.
      expect(readFileSync(join(dest, 'doctor/docs/reference/cli-cairn-doctor.md'), 'utf8')).toBe('control doctor page\n');
      expect(readFileSync(join(dest, 'exit-codes/docs/reference/cli-cairn-exit-codes.md'), 'utf8')).toBe('control exit-codes page\n');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('copies a planted schema into every subdirectory that shares it, still with no top-level file', () => {
    const dest = tmp('scripter-dest-schema');
    const planted = tmp('scripter-planted-schema');
    try {
      writeBundle(dest);
      write(join(planted, 'docs/reference/schema/cairn-doctor.schema.json'), '{"planted":true}');
      applyScripterPlantedOverlay(planted, dest, pages);
      expect(readFileSync(join(dest, 'json-output/docs/reference/schema/cairn-doctor.schema.json'), 'utf8')).toBe('{"planted":true}');
      expect(readFileSync(join(dest, 'doctor/docs/reference/schema/cairn-doctor.schema.json'), 'utf8')).toBe('{"planted":true}');
      expect(existsSync(join(dest, 'docs/reference/schema/cairn-doctor.schema.json'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws, naming the path, when a planted file matches no bundle page or schema', () => {
    const dest = tmp('scripter-dest-mistyped');
    const planted = tmp('scripter-planted-mistyped');
    try {
      writeBundle(dest);
      write(join(planted, 'docs/reference/cli-cairn-typo.md'), 'planted defect text\n');
      expect(() => applyScripterPlantedOverlay(planted, dest, pages)).toThrow(/docs\/reference\/cli-cairn-typo\.md.*does not match/);
      for (const spec of pages) expect(existsSync(join(dest, spec.name, 'cli-cairn-typo.md'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws when a matched subdirectory’s own copy of the planted path is missing', () => {
    const dest = tmp('scripter-dest-missing-target');
    const planted = tmp('scripter-planted-missing-target');
    try {
      // A bundle built without the doctor subdirectory's own page, the shape a stale or
      // partially built control tree would carry.
      write(join(dest, 'json-output/docs/reference/cli-cairn-json-output.md'), 'control page\n');
      write(join(planted, 'docs/reference/cli-cairn-doctor.md'), 'planted defect text\n');
      expect(() => applyScripterPlantedOverlay(planted, dest, pages)).toThrow(/no matching target/);
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
