import { describe, it, expect } from 'vitest';
import { deriveGettingStarted } from '../../lib/content/getting-started.js';
import type { Manifest } from '../../lib/content/manifest.js';

const empty: Manifest = { version: 1, entries: [] };
const entry = (concept: string, id: string) => ({ id, concept, title: id, permalink: '/' + id, draft: false, links: [] });

describe('deriveGettingStarted', () => {
  it('an empty site is 0 of 3, all steps not done', () => {
    expect(deriveGettingStarted(empty, [])).toEqual({ wrotePost: false, publishedPost: false, createdPage: false, doneCount: 0, total: 3 });
  });
  it('a post written but not published counts the first step only', () => {
    const r = deriveGettingStarted(empty, [{ concept: 'posts', id: '2026-01-hello' }]);
    expect(r.wrotePost).toBe(true);
    expect(r.publishedPost).toBe(false);
    expect(r.doneCount).toBe(1);
  });
  it('a published post counts wrote and published', () => {
    const r = deriveGettingStarted({ version: 1, entries: [entry('posts', 'p1')] as Manifest['entries'] }, []);
    expect(r.wrotePost).toBe(true);
    expect(r.publishedPost).toBe(true);
    expect(r.createdPage).toBe(false);
    expect(r.doneCount).toBe(2);
  });
  it('a page (published or pending) counts the page step', () => {
    expect(deriveGettingStarted({ version: 1, entries: [entry('pages', 'about')] as Manifest['entries'] }, []).createdPage).toBe(true);
    expect(deriveGettingStarted(empty, [{ concept: 'pages', id: 'about' }]).createdPage).toBe(true);
  });
});
