import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedBatch } from '../../../scripts/docs-review/embed.mjs';
import { runReviewPage } from './_docs-review-vm.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TEMPLATE_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/template.html'), 'utf8');
const RUNTIME_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/runtime.mjs'), 'utf8');

const ORIGINAL_FILES = [
  { path: 'docs/a.md', markdown: '# A\n\noriginal a\n' },
  { path: 'docs/b.md', markdown: '# B\n\noriginal b\n' },
];

function embed(files: typeof ORIGINAL_FILES) {
  return embedBatch(TEMPLATE_SOURCE, RUNTIME_SOURCE, { title: 'Docs review', files });
}

function rejection(code: string): { code: string; message: string } {
  return { code, message: code };
}

describe('docs-review capability handling', () => {
  it('turns the page read-only on the first not_writer rejection, and blocks further saves', async () => {
    let calls = 0;
    const page = await runReviewPage(embed(ORIGINAL_FILES), {
      artifact: {
        publish: async () => {
          calls += 1;
          throw rejection('not_writer');
        },
      },
    });

    expect(page.__cairnDocsReview!.isReadOnly()).toBe(false);
    await page.__cairnDocsReview!.save();
    expect(page.__cairnDocsReview!.isReadOnly()).toBe(true);
    expect(calls).toBe(1);

    // Latched: a later save attempt does not even reach publish.
    await page.__cairnDocsReview!.save();
    expect(calls).toBe(1);
  });

  it('turns the page read-only on the first not_granted rejection', async () => {
    const page = await runReviewPage(embed(ORIGINAL_FILES), {
      artifact: { publish: async () => { throw rejection('not_granted'); } },
    });
    await page.__cairnDocsReview!.save();
    expect(page.__cairnDocsReview!.isReadOnly()).toBe(true);
  });

  it('stays writable through a routine rejection such as conflict', async () => {
    const page = await runReviewPage(embed(ORIGINAL_FILES), {
      artifact: { publish: async () => { throw rejection('conflict'); } },
    });
    await page.__cairnDocsReview!.save();
    expect(page.__cairnDocsReview!.isReadOnly()).toBe(false);
  });

  it('a conflict reload restores the stashed edits that did not win', async () => {
    const first = await runReviewPage(embed(ORIGINAL_FILES), {
      artifact: { publish: async () => { throw rejection('conflict'); } },
    });

    // A viewer's unsaved edit to one file.
    first.__cairnDocsReview!.getState().files[0]!.markdown = 'edited a';
    await first.__cairnDocsReview!.save();

    // The shell reloads every open view to whichever version won; simulate that it was not
    // this edit by reloading against the original, unedited batch, carrying the stash forward
    // the way sessionStorage would survive a real reload.
    const stash = first.sessionStorage.snapshot();
    const reloaded = await runReviewPage(embed(ORIGINAL_FILES), { sessionStorage: stash });

    const state = reloaded.__cairnDocsReview!.getState();
    expect(state.files.find((f) => f.path === 'docs/a.md')!.markdown).toBe('edited a');
    expect(state.files.find((f) => f.path === 'docs/b.md')!.markdown).toBe('# B\n\noriginal b\n');
  });

  it('a successful publish followed by reload restores none of the stashed edit', async () => {
    const first = await runReviewPage(embed(ORIGINAL_FILES), {
      artifact: { publish: async () => ({ version: 'v2' }) },
    });

    first.__cairnDocsReview!.getState().files[0]!.markdown = 'edited a';
    await first.__cairnDocsReview!.save();

    // The published version now embeds exactly the edited state, so the reload's embedded
    // state matches the stash: nothing differs, so nothing is restored.
    const publishedHtml = first.__cairnDocsReview!.buildDocument(first.__cairnDocsReview!.getState());
    const stash = first.sessionStorage.snapshot();
    const reloaded = await runReviewPage(publishedHtml, { sessionStorage: stash });

    const state = reloaded.__cairnDocsReview!.getState();
    expect(state.files.find((f) => f.path === 'docs/a.md')!.markdown).toBe('edited a');
    expect(state.files.find((f) => f.path === 'docs/b.md')!.markdown).toBe('# B\n\noriginal b\n');
  });
});
