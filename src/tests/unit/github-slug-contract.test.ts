import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRenderer } from '../../lib/render/pipeline.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Locks `renderDocument`'s heading ids to GitHub's own slug algorithm.
 *
 * `rehype-slug` computes each id with `github-slugger` under the hood, so this is meant to be
 * a tautology today. The point of the test is to keep it one: every case below is a real
 * heading from the published corpus, past or present, and its expected id is a literal, not a
 * value computed by importing `github-slugger` at test time. The last test holds each case to its
 * source page. A case marked `synthetic` keeps a heading shape no live page carries (the technical
 * pages it came from left the package) as a literal stress case. A source under `docs/admin/` or
 * `docs/editors/` is skipped while that directory holds no page, and must name a live page again
 * once it does. If the pipeline's slugging ever drifts (a `rehype-slug` upgrade, a config change), this
 * test goes red without needing to know why GitHub's algorithm changed; the in-corpus anchors the
 * published docs carry (`#section-heading` links between pages) ride on this contract holding.
 *
 * Coverage note: the published corpus carries no heading with a double quote, so that one
 * punctuation mark is not represented here. Every other stress category is a genuine heading
 * below: backticked terms, parentheses, a slash, a single quote, a colon, a period, a question
 * mark, mixed case, and a real duplicate heading.
 */
describe('the GitHub-slug contract', () => {
  // A case marked `synthetic` names no page: its heading shape is a stress case no live page carries,
  // so the source check skips it. Every other case must name a file that exists.
  const cases: Array<{ markdown: string; id: string; source: string; synthetic?: true }> = [
    {
      // A backticked path segment plus a slash inside the code span.
      markdown: '## Why `/healthz` lives at the site root',
      id: 'why-healthz-lives-at-the-site-root',
      source: 'retired docs/reference/admin-routes.md',
      synthetic: true,
    },
    {
      // Parenthetical qualifier after the heading text.
      markdown: '## Per-route mounting (advanced)',
      id: 'per-route-mounting-advanced',
      source: 'retired docs/reference/admin-routes.md',
      synthetic: true,
    },
    {
      // A single-quoted literal nested inside a backticked code span.
      markdown: "### Eager and `'visible'` mounting",
      id: 'eager-and-visible-mounting',
      source: 'retired docs/reference/islands.md',
      synthetic: true,
    },
    {
      // A slash-bearing subpath inside a code span, mid-sentence.
      markdown: '## The re-exported `/delivery/data` surface',
      id: 'the-re-exported-deliverydata-surface',
      source: 'retired docs/reference/delivery.md',
      synthetic: true,
    },
    {
      // A backticked component name leading the heading, plus a parenthetical.
      markdown: '#### `MarkdownEditor` wiring props (Unstable API)',
      id: 'markdowneditor-wiring-props-unstable-api',
      source: 'retired docs/reference/admin.md',
      synthetic: true,
    },
    {
      // Two backticked terms in one heading, nested in a parenthetical.
      markdown: '#### `supportContact` (adapter `editor` member)',
      id: 'supportcontact-adapter-editor-member',
      source: 'retired docs/reference/core.md',
      synthetic: true,
    },
    {
      // Mixed case prose with a parenthetical qualifier, no code spans.
      markdown: '## Single-mount admin (recommended)',
      id: 'single-mount-admin-recommended',
      source: 'retired docs/reference/sveltekit.md',
      synthetic: true,
    },
    {
      // Nothing but digits and periods: every period drops and no separator replaces it.
      markdown: '## 0.94.0',
      id: '0940',
      source: 'MIGRATION-NOTES.md',
    },
    {
      // A digit and a colon mid-heading, plus a comma before the last word. No live page carries
      // this shape, so the case is synthetic.
      markdown: '## Milestone 1: a bare SvelteKit site, deployed',
      id: 'milestone-1-a-bare-sveltekit-site-deployed',
      source: 'synthetic',
      synthetic: true,
    },
    {
      // A trailing question mark, which drops without leaving a trailing hyphen. The register bans
      // question headings, so no live page carries this shape and the case is synthetic.
      markdown: '# Is it working?',
      id: 'is-it-working',
      source: 'synthetic',
      synthetic: true,
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

  const duplicateSource = 'docs/admin/own-your-domain.md';

  it('suffixes the admin track\'s real repeated "You know it worked when" heading the way GitHub does', async () => {
    // duplicateSource closes each of its three sections with this exact heading.
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

  /** Whether a source sits in a docs directory that holds no page yet. */
  const awaitingPages = (source: string) =>
    ['docs/admin/', 'docs/editors/'].some((dir) => {
      if (!source.startsWith(dir)) return false;
      const abs = join(ROOT, dir);
      return !existsSync(abs) || !readdirSync(abs, { recursive: true, encoding: 'utf8' }).some((n) => n.endsWith('.md'));
    });

  it('pulls every case from its source page, or from a docs directory that holds no page yet', () => {
    const sources = [
      ...cases.map(({ markdown, source, synthetic }) => ({ markdown, source, synthetic })),
      { markdown: '### You know it worked when', source: duplicateSource, synthetic: undefined },
    ];
    for (const { markdown, source, synthetic } of sources) {
      if (synthetic) continue;
      if (awaitingPages(source)) continue;
      expect(existsSync(join(ROOT, source)), `${source} does not exist; repoint the case at a live page or mark it synthetic`).toBe(true);
      const lines = readFileSync(join(ROOT, source), 'utf8').split('\n');
      expect(lines, `${source} no longer carries "${markdown}"; repoint the case at a live page`).toContain(markdown);
    }
  });
});
