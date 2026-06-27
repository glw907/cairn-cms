import { describe, it, expect } from 'vitest';
import { rewriteFrontmatterReference } from '../../lib/content/references.js';
import { parseMarkdown } from '../../lib/content/frontmatter.js';

const doc = (fm: string) => `---\n${fm}\n---\nBody text mentioning author elsewhere.\n`;

describe('rewriteFrontmatterReference', () => {
  it('rewrites a scalar reference value', () => {
    expect(
      rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', 'jane-smith'),
    ).toBe(doc('author: jane-smith'));
  });

  it('rewrites one element of a flow array', () => {
    expect(
      rewriteFrontmatterReference(doc('related: [a-post, b-post]'), 'related', 'b-post', 'c-post'),
    ).toBe(doc('related: [a-post, c-post]'));
  });

  it('rewrites one item of a block sequence', () => {
    expect(
      rewriteFrontmatterReference(
        doc('related:\n  - a-post\n  - b-post'),
        'related',
        'b-post',
        'c-post',
      ),
    ).toBe(doc('related:\n  - a-post\n  - c-post'));
  });

  it('re-quotes a YAML-keyword newId so it reparses as a string', () => {
    const out = rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', 'true');
    expect(out).toBe(doc("author: 'true'"));
    expect(parseMarkdown(out).frontmatter.author).toBe('true'); // the STRING, not boolean true
  });

  it('re-quotes a numeric and a date-shaped newId', () => {
    expect(
      parseMarkdown(
        rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', '123'),
      ).frontmatter.author,
    ).toBe('123');
    expect(
      typeof parseMarkdown(
        rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', '2026-01-02'),
      ).frontmatter.author,
    ).toBe('string');
    expect(
      typeof parseMarkdown(
        rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', '2026'),
      ).frontmatter.author,
    ).toBe('string');
  });

  it('leaves a plain id bare (no over-quoting churn)', () => {
    expect(
      rewriteFrontmatterReference(doc('author: jane-doe'), 'author', 'jane-doe', 'jane-smith'),
    ).toBe(doc('author: jane-smith'));
  });

  it('preserves CRLF', () => {
    expect(
      rewriteFrontmatterReference(
        '---\r\nauthor: jane-doe\r\n---\r\nBody\r\n',
        'author',
        'jane-doe',
        'jane-smith',
      ),
    ).toBe('---\r\nauthor: jane-smith\r\n---\r\nBody\r\n');
  });

  it('does not rewrite an id inside an inline comment', () => {
    expect(
      rewriteFrontmatterReference(
        doc('author: old-author # mentions jane-doe'),
        'author',
        'jane-doe',
        'X',
      ),
    ).toBe(doc('author: old-author # mentions jane-doe'));
  });

  it('does not bleed past the colon anchor into a sibling prefix key', () => {
    const before = doc('author: jane-doe\nauthored-by: jane-doe');
    expect(rewriteFrontmatterReference(before, 'author', 'jane-doe', 'jane-smith')).toBe(
      doc('author: jane-smith\nauthored-by: jane-doe'),
    );
  });

  it('preserves a leading BOM and is a no-op on a BOM-only no-frontmatter input', () => {
    const BOM = '﻿';
    expect(
      rewriteFrontmatterReference(
        BOM + doc('author: jane-doe'),
        'author',
        'jane-doe',
        'jane-smith',
      ),
    ).toBe(BOM + doc('author: jane-smith'));
    expect(rewriteFrontmatterReference(BOM + 'No frontmatter.\n', 'author', 'a', 'b')).toBe(
      BOM + 'No frontmatter.\n',
    );
  });

  it('does not touch a substring id, an absent field, or no-frontmatter', () => {
    expect(rewriteFrontmatterReference(doc('author: post-2'), 'author', 'post', 'X')).toBe(
      doc('author: post-2'),
    );
    expect(rewriteFrontmatterReference(doc('title: Hi'), 'author', 'a', 'b')).toBe(doc('title: Hi'));
    expect(rewriteFrontmatterReference('No frontmatter.\n', 'author', 'a', 'b')).toBe(
      'No frontmatter.\n',
    );
  });
});
