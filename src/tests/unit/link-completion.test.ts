import { describe, it, expect } from 'vitest';
import { matchCairnTrigger, linkCompletions } from '../../lib/components/link-completion.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

const targets: LinkTarget[] = [
  { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  { concept: 'posts', id: '2026-01-04-waxing', permalink: '/2026/01/waxing', title: 'Waxing Guide', date: '2026-01-04', draft: false },
  { concept: 'posts', id: '2026-02-02-draft', permalink: '/2026/02/draft', title: 'A Draft Post', date: '2026-02-02', draft: true },
];

describe('matchCairnTrigger', () => {
  it('matches an open [[ and captures the query', () => {
    expect(matchCairnTrigger('see [[wax')).toEqual({ query: 'wax', from: 4 });
    expect(matchCairnTrigger('[[')).toEqual({ query: '', from: 0 });
  });
  it('does not match a closed or absent trigger', () => {
    expect(matchCairnTrigger('see [[wax]] done')).toBeNull(); // closed
    expect(matchCairnTrigger('a single [ bracket')).toBeNull();
    expect(matchCairnTrigger('no trigger here')).toBeNull();
    expect(matchCairnTrigger('[[has a\nnewline')).toBeNull(); // query stops at newline
  });
});

describe('linkCompletions', () => {
  it('filters by a case-insensitive title substring', () => {
    const labels = linkCompletions(targets, 'wax').map((c) => c.label);
    expect(labels).toEqual(['Waxing Guide']);
  });
  it('returns every target for an empty query', () => {
    expect(linkCompletions(targets, '').map((c) => c.label)).toEqual(['About Us', 'Waxing Guide', 'A Draft Post']);
  });
  it('applies the full cairn link and groups by concept', () => {
    const about = linkCompletions(targets, 'about')[0];
    expect(about.apply).toBe('[About Us](cairn:pages/about)');
    expect(about.section).toEqual({ name: 'Pages', rank: 0 });
  });
  it('marks a draft and shows a post date in the detail', () => {
    const draft = linkCompletions(targets, 'draft')[0];
    expect(draft.detail).toBe('Draft');
    const waxing = linkCompletions(targets, 'waxing')[0];
    expect(waxing.detail).toBe('2026-01-04');
    expect(waxing.section).toEqual({ name: 'Posts', rank: 1 });
  });
  it('escapes square brackets in the title for the apply text', () => {
    const t = [{ concept: 'pages', id: 'about', permalink: '/about', title: 'A [B] C', draft: false }];
    expect(linkCompletions(t, 'a')[0].apply).toBe('[A \\[B\\] C](cairn:pages/about)');
  });
});
