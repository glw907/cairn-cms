import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExternal, linksIn } from '../../../scripts/checks/docs-links.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BATCH_PATH = join(ROOT, 'scripts/docs-readers/batches/baseline.json');

/**
 * One job entry from `baseline.json`, the fields this test reads.
 */
interface BaselineJob {
  id: string;
  docsSet: string[];
}

/**
 * Every page a given page links to that sits within "the docs set" (under `docs/`, excluding
 * `docs/internal/` and `docs/superpowers/`, neither ever part of a reader's docs set), with any
 * `#anchor` stripped and every external link dropped. Reuses `check:docs`'s own link scanner
 * (`linksIn`/`isExternal`) so this test parses a page's links the same way that gate does.
 * @param page - The page's path, relative to the repo root.
 * @returns The page's own in-docs-set link targets, deduplicated and sorted.
 */
function inDocsSetLinks(page: string): string[] {
  const text = readFileSync(join(ROOT, page), 'utf8');
  const links = new Set<string>();
  for (const { dest } of linksIn(text)) {
    if (isExternal(dest)) continue;
    const bare = dest.split('#')[0];
    if (!bare) continue; // a pure #anchor link within the same page
    const resolved = normalize(join(dirname(page), bare));
    if (!resolved.startsWith('docs/')) continue;
    if (resolved.startsWith('docs/internal/') || resolved.startsWith('docs/superpowers/')) continue;
    links.add(resolved);
  }
  return [...links].sort();
}

/**
 * Job id prefixes whose `docsSet` is checked against their own primary page's current-tree links.
 * The scripter job's three pages are each pinned to a past commit (`prepareContractPagesBundle`),
 * a fundamentally different case its own preparation tests already cover, so it is excluded here.
 */
const JOB_PRIMARY_PAGE: Record<string, string> = {
  evaluator: 'docs/why-cairn.md',
  operator: 'docs/admin/is-it-working.md',
  designer: 'docs/extend/design-your-site.md',
  extender: 'docs/extend/add-a-custom-admin-screen.md',
  'core-developer': 'CONTRIBUTING.md',
};

describe('baseline.json: docsSet covers every in-docs-set link its own page carries', () => {
  const batch = JSON.parse(readFileSync(BATCH_PATH, 'utf8')) as { jobs: BaselineJob[] };

  for (const [prefix, page] of Object.entries(JOB_PRIMARY_PAGE)) {
    const jobs = batch.jobs.filter((j) => j.id.startsWith(`${prefix}-`));

    it(`${prefix}: at least one job is present in baseline.json`, () => {
      expect(jobs.length).toBeGreaterThan(0);
    });

    it(`${prefix}: docsSet covers every in-docs-set link ${page} carries`, () => {
      const expected = inDocsSetLinks(page);
      for (const job of jobs) {
        const missing = expected.filter((p) => !job.docsSet.includes(p));
        expect(missing, `job ${job.id} is missing ${JSON.stringify(missing)}`).toEqual([]);
      }
    });

    it(`${prefix}: every run of this job shares the identical docsSet`, () => {
      const [first, ...rest] = jobs.map((j) => [...j.docsSet].sort());
      for (const other of rest) expect(other).toEqual(first);
    });
  }
});
