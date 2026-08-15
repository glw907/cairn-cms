import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';

/**
 * Locks `renderDocument`'s heading ids to GitHub's own slug algorithm.
 *
 * `rehype-slug` computes each id with `github-slugger` under the hood, so this is meant to be
 * a tautology today. The point of the test is to keep it one: every case below is a real
 * heading pulled from the published `docs/reference/`, `docs/admin/`, and `docs/extend/` corpus,
 * and its expected id is a literal, not a value computed by importing `github-slugger` at test
 * time. If the pipeline's slugging ever drifts (a `rehype-slug` upgrade, a config change), this
 * test goes red without needing to know why GitHub's algorithm changed; the in-corpus anchors the
 * published docs carry (`#section-heading` links between pages) ride on this contract holding.
 *
 * Coverage note: the published corpus carries no heading with a double quote, so that one
 * punctuation mark is not represented here. Every other stress category is a genuine heading
 * below: backticked terms, parentheses, a slash, a single quote, a colon, a period, a question
 * mark, mixed case, and a real duplicate heading.
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
      // Nothing but digits and periods: every period drops and no separator replaces it.
      markdown: '## 0.94.0',
      id: '0940',
      source: 'docs/extend/migration-notes.md',
    },
    {
      // A digit and a colon mid-heading, plus a comma before the last word.
      markdown: '## Milestone 1: a bare SvelteKit site, deployed',
      id: 'milestone-1-a-bare-sveltekit-site-deployed',
      source: 'docs/extend/build-a-site-by-hand.md',
    },
    {
      // A trailing question mark, which drops without leaving a trailing hyphen.
      markdown: '# Is it working?',
      id: 'is-it-working',
      source: 'docs/admin/is-it-working.md',
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

  it('suffixes the admin track\'s real repeated "You know it worked when" heading the way GitHub does', async () => {
    // docs/admin/own-your-domain.md closes each of its three sections with this exact heading.
    // GitHub slugs the first occurrence plain and suffixes every repeat with -1, -2, and so on,
    // which is what the page's own section links depend on.
    const { renderDocument } = createRenderer();
    const { headings } = await renderDocument(
      '## Connect your domain\n\n### You know it worked when\n\nText\n\n## Turn on sign-in email\n\n### You know it worked when\n\nText\n\n## Connect to Workers Builds\n\n### You know it worked when',
    );
    expect(headings.map((heading) => heading.id)).toEqual([
      'connect-your-domain',
      'you-know-it-worked-when',
      'turn-on-sign-in-email',
      'you-know-it-worked-when-1',
      'connect-to-workers-builds',
      'you-know-it-worked-when-2',
    ]);
  });
});
