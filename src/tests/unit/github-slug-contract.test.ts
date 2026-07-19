import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';

/**
 * Locks `renderDocument`'s heading ids to GitHub's own slug algorithm.
 *
 * `rehype-slug` computes each id with `github-slugger` under the hood, so this is meant to be
 * a tautology today. The point of the test is to keep it one: every case below is a real
 * heading pulled from the published `docs/reference/` and `docs/tutorial/` corpus, and its
 * expected id is a literal, not a value computed by importing `github-slugger` at test time. If
 * the pipeline's slugging ever drifts (a `rehype-slug` upgrade, a config change), this test goes
 * red without needing to know why GitHub's algorithm changed; the 225 in-corpus anchors the
 * published docs carry (`#section-heading` links between pages) ride on this contract holding.
 *
 * Coverage note: `docs/reference/` and `docs/tutorial/` carry no heading with a literal `?` or a
 * double quote, so those two punctuation marks are not represented here. Every other stress
 * category the task calls for (backticked terms, parentheses, a slash, a single quote, a colon,
 * a period, mixed case, and the tutorial's real duplicate heading) is a genuine heading below.
 */
describe('the GitHub-slug contract', () => {
  const cases: Array<{ markdown: string; id: string; source: string }> = [
    {
      // A backticked path segment plus a slash inside the code span.
      markdown: '## Why `/healthz` lives at the site root',
      id: 'why-healthz-lives-at-the-site-root',
      source: 'docs/reference/admin-routes.md',
    },
    {
      // Parenthetical qualifier after the heading text.
      markdown: '## Per-route mounting (advanced)',
      id: 'per-route-mounting-advanced',
      source: 'docs/reference/admin-routes.md',
    },
    {
      // A single-quoted literal nested inside a backticked code span.
      markdown: "### Eager and `'visible'` mounting",
      id: 'eager-and-visible-mounting',
      source: 'docs/reference/islands.md',
    },
    {
      // A slash-bearing subpath inside a code span, mid-sentence.
      markdown: '## The re-exported `/delivery/data` surface',
      id: 'the-re-exported-deliverydata-surface',
      source: 'docs/reference/delivery.md',
    },
    {
      // A backticked component name leading the heading, plus a parenthetical.
      markdown: '#### `MarkdownEditor` wiring props (Unstable API)',
      id: 'markdowneditor-wiring-props-unstable-api',
      source: 'docs/reference/components.md',
    },
    {
      // Two backticked terms in one heading, nested in a parenthetical.
      markdown: '#### `supportContact` (adapter `editor` member)',
      id: 'supportcontact-adapter-editor-member',
      source: 'docs/reference/core.md',
    },
    {
      // Mixed case prose with a parenthetical qualifier, no code spans.
      markdown: '## Single-mount admin (recommended)',
      id: 'single-mount-admin-recommended',
      source: 'docs/reference/sveltekit.md',
    },
    {
      // A leading digit and a period, from the tutorial's numbered steps.
      markdown: '## 1. Start from the chassis',
      id: '1-start-from-the-chassis',
      source: 'docs/tutorial/build-a-theme.md',
    },
    {
      // A digit and a colon mid-heading.
      markdown: '## Milestone 0: What you will build',
      id: 'milestone-0-what-you-will-build',
      source: 'docs/tutorial/build-your-first-cairn-site.md',
    },
  ];

  for (const { markdown, id, source } of cases) {
    it(`slugs "${markdown.replace(/^#+\s*/, '')}" as ${id} (${source})`, async () => {
      const { renderDocument } = createRenderer();
      const { headings } = await renderDocument(markdown);
      expect(headings).toHaveLength(1);
      expect(headings[0]?.id).toBe(id);
    });
  }

  it('suffixes the tutorial\'s real duplicate "How it went" heading the way GitHub does', async () => {
    // docs/tutorial/build-your-first-cairn-site.md carries this exact heading twice: once at
    // the end of Milestone 3 (line 134) and again at the end of Milestone 9 (line 538). GitHub
    // slugs the first occurrence plain and suffixes every repeat with -1, -2, and so on.
    const { renderDocument } = createRenderer();
    const { headings } = await renderDocument(
      '## Milestone 3: Add content\n\n## How it went\n\nText\n\n## Milestone 9: Confirm the internal link\n\n## How it went',
    );
    expect(headings.map((heading) => heading.id)).toEqual([
      'milestone-3-add-content',
      'how-it-went',
      'milestone-9-confirm-the-internal-link',
      'how-it-went-1',
    ]);
  });
});
