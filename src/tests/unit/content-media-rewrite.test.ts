import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Image } from 'mdast';
import { fillAltForHash, repointMediaRef } from '../../lib/content/media-rewrite.js';
import { parseMarkdown } from '../../lib/content/frontmatter.js';
import { parseMediaToken } from '../../lib/media/reference.js';

const OLD = 'aaaa1111aaaa1111';
const NEW_TOKEN = 'media:harbor.bbbb2222bbbb2222';

/** Read the alt of the first body image whose url parses to `hash`, via the same mdast parse the
 *  transform uses, so a body escaping round-trip is checked through a real parser. */
function bodyAltForHash(markdown: string, hash: string): string | undefined {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  let alt: string | undefined;
  visit(tree, 'image', (node: Image) => {
    if (alt !== undefined) return;
    const ref = parseMediaToken(node.url);
    if (ref?.hash === hash) alt = node.alt ?? '';
  });
  return alt;
}

describe('repointMediaRef', () => {
  it('repoints a slugged body image and leaves the alt and prose byte-identical', () => {
    const md = 'Before.\n\n![A cairn](media:summit.aaaa1111aaaa1111)\n\nAfter.\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe('Before.\n\n![A cairn](media:harbor.bbbb2222bbbb2222)\n\nAfter.\n');
    expect(out.placements).toEqual([
      { kind: 'body', before: 'media:summit.aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
  });

  it('repoints a bare-hash body image', () => {
    const md = '![alt](media:aaaa1111aaaa1111)\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe('![alt](media:harbor.bbbb2222bbbb2222)\n');
    expect(out.placements).toEqual([
      { kind: 'body', before: 'media:aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
  });

  it('repoints a figure-wrapped image and leaves the :::figure wrapper bytes untouched', () => {
    const md =
      'Intro.\n\n:::figure{.wide}\n![A waymark](media:waymark.aaaa1111aaaa1111)\n\nA caption.\n:::\n\nOutro.\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(
      'Intro.\n\n:::figure{.wide}\n![A waymark](media:harbor.bbbb2222bbbb2222)\n\nA caption.\n:::\n\nOutro.\n',
    );
    expect(out.placements).toEqual([
      { kind: 'figure', before: 'media:waymark.aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
  });

  it('repoints the frontmatter hero src only and leaves every other frontmatter byte unchanged', () => {
    const md =
      '---\ntitle: A post\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: A summit view\ndate: 2026-06-18\n---\n\nBody.\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(
      '---\ntitle: A post\nimage:\n  src: media:harbor.bbbb2222bbbb2222\n  alt: A summit view\ndate: 2026-06-18\n---\n\nBody.\n',
    );
    expect(out.placements).toEqual([
      { kind: 'hero', before: 'media:summit.aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
  });

  it('repoints both a hero and a body image of the same hash and reports two placements', () => {
    const md =
      '---\nimage:\n  src: media:hero.aaaa1111aaaa1111\n  alt: Hero\n---\n\n![inline](media:inline.aaaa1111aaaa1111)\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(
      '---\nimage:\n  src: media:harbor.bbbb2222bbbb2222\n  alt: Hero\n---\n\n![inline](media:harbor.bbbb2222bbbb2222)\n',
    );
    expect(out.placements).toEqual([
      { kind: 'hero', before: 'media:hero.aaaa1111aaaa1111', after: NEW_TOKEN },
      { kind: 'body', before: 'media:inline.aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
  });

  it('leaves the markdown byte-for-byte unchanged for a non-matching hash', () => {
    const md =
      '---\nimage:\n  src: media:hero.cccc3333cccc3333\n---\n\n![inline](media:inline.dddd4444dddd4444)\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(md);
    expect(out.placements).toEqual([]);
  });

  it('leaves a malformed media reference untouched', () => {
    const md = '![bad](media:NOTHEX)\n\n![worse](media:.x)\n\n![ugly](media:a.b.aaaa1111aaaa1111.zz)\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(md);
    expect(out.placements).toEqual([]);
  });

  it('does not touch a media: token sitting in a code span or fence', () => {
    const md = 'Inline `media:summit.aaaa1111aaaa1111` and\n\n```\nmedia:summit.aaaa1111aaaa1111\n```\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(md);
    expect(out.placements).toEqual([]);
  });

  it('repoints multiple body images of the same hash and keeps every other byte exact', () => {
    const md =
      '![one](media:one.aaaa1111aaaa1111)\n\nmiddle prose\n\n![two](media:two.aaaa1111aaaa1111)\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(
      '![one](media:harbor.bbbb2222bbbb2222)\n\nmiddle prose\n\n![two](media:harbor.bbbb2222bbbb2222)\n',
    );
    expect(out.placements).toEqual([
      { kind: 'body', before: 'media:one.aaaa1111aaaa1111', after: NEW_TOKEN },
      { kind: 'body', before: 'media:two.aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
  });

  // Bug 3: a plain-text frontmatter field that mentions the hash must not be rewritten. Only the
  // image-field `src:` line carries a repointable token; a `title:`/`description:` value does not.
  it('rewrites the hero src token but leaves the same hash in a title text field byte-unchanged', () => {
    const md =
      '---\ntitle: "see media:summit.aaaa1111aaaa1111"\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: A summit\n---\n\nBody.\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(
      '---\ntitle: "see media:summit.aaaa1111aaaa1111"\nimage:\n  src: media:harbor.bbbb2222bbbb2222\n  alt: A summit\n---\n\nBody.\n',
    );
    expect(out.placements).toEqual([
      { kind: 'hero', before: 'media:summit.aaaa1111aaaa1111', after: NEW_TOKEN },
    ]);
    expect(parseMarkdown(out.markdown).frontmatter.title).toBe('see media:summit.aaaa1111aaaa1111');
  });

  // Bug 3 partner case: a token in a text field with no image field at all is never rewritten.
  it('leaves a media token in a description text field untouched when there is no image src', () => {
    const md = '---\ndescription: "ref media:summit.aaaa1111aaaa1111 here"\n---\n\nBody.\n';
    const out = repointMediaRef(md, OLD, NEW_TOKEN);
    expect(out.markdown).toBe(md);
    expect(out.placements).toEqual([]);
  });
});

const DEFAULT_ALT = 'A summit at dawn';

describe('fillAltForHash', () => {
  it('fills an empty body alt and reports a will-fill body placement, byte-exact', () => {
    const md = 'Before.\n\n![](media:summit.aaaa1111aaaa1111)\n\nAfter.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe('Before.\n\n![A summit at dawn](media:summit.aaaa1111aaaa1111)\n\nAfter.\n');
    expect(out.placements).toEqual([
      { kind: 'body', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  it('reports a custom body alt as customized and leaves it unchanged when not overwriting', () => {
    const md = '![A hand-written alt](media:summit.aaaa1111aaaa1111)\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(md);
    expect(out.placements).toEqual([
      { kind: 'body', bucket: 'customized', before: 'A hand-written alt', after: 'A hand-written alt' },
    ]);
  });

  it('overwrites a custom body alt when overwrite is true and reports customized', () => {
    const md = '![A hand-written alt](media:summit.aaaa1111aaaa1111)\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: true });
    expect(out.markdown).toBe('![A summit at dawn](media:summit.aaaa1111aaaa1111)\n');
    expect(out.placements).toEqual([
      { kind: 'body', bucket: 'customized', before: 'A hand-written alt', after: DEFAULT_ALT },
    ]);
  });

  it('never touches a decorative hero, under either overwrite value', () => {
    const md =
      '---\ntitle: A post\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: ""\n  decorative: true\ndate: 2026-06-18\n---\n\nBody.\n';
    const keep = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(keep.markdown).toBe(md);
    expect(keep.placements).toEqual([
      { kind: 'hero', bucket: 'decorative-skipped', before: '', after: '' },
    ]);
    const force = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: true });
    expect(force.markdown).toBe(md);
    expect(force.placements).toEqual([
      { kind: 'hero', bucket: 'decorative-skipped', before: '', after: '' },
    ]);
  });

  it('fills an empty hero alt and changes only the alt line', () => {
    const md =
      '---\ntitle: A post\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: ""\ndate: 2026-06-18\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(
      '---\ntitle: A post\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: "A summit at dawn"\ndate: 2026-06-18\n---\n\nBody.\n',
    );
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  it('inserts an alt key for a hero that omitted one, right after src', () => {
    const md = '---\ntitle: A post\nimage:\n  src: media:summit.aaaa1111aaaa1111\ndate: 2026-06-18\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(
      '---\ntitle: A post\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: "A summit at dawn"\ndate: 2026-06-18\n---\n\nBody.\n',
    );
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  it('overwrites a custom hero alt only when overwriting, byte-exact otherwise', () => {
    const md =
      '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: A custom hero alt\n---\n\nBody.\n';
    const keep = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(keep.markdown).toBe(md);
    expect(keep.placements).toEqual([
      { kind: 'hero', bucket: 'customized', before: 'A custom hero alt', after: 'A custom hero alt' },
    ]);
    const force = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: true });
    expect(force.markdown).toBe(
      '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: "A summit at dawn"\n---\n\nBody.\n',
    );
    expect(force.placements).toEqual([
      { kind: 'hero', bucket: 'customized', before: 'A custom hero alt', after: DEFAULT_ALT },
    ]);
  });

  it('fills an empty figure-wrapped image alt and reports kind figure', () => {
    const md =
      'Intro.\n\n:::figure{.wide}\n![](media:waymark.aaaa1111aaaa1111)\n\nA caption.\n:::\n\nOutro.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(
      'Intro.\n\n:::figure{.wide}\n![A summit at dawn](media:waymark.aaaa1111aaaa1111)\n\nA caption.\n:::\n\nOutro.\n',
    );
    expect(out.placements).toEqual([
      { kind: 'figure', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  it('reports all three buckets for a mixed entry and changes only the empty body alt', () => {
    const md =
      '---\nimage:\n  src: media:hero.aaaa1111aaaa1111\n  alt: ""\n  decorative: true\n---\n\n' +
      '![](media:one.aaaa1111aaaa1111)\n\nmiddle\n\n![Kept alt](media:two.aaaa1111aaaa1111)\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(
      '---\nimage:\n  src: media:hero.aaaa1111aaaa1111\n  alt: ""\n  decorative: true\n---\n\n' +
        '![A summit at dawn](media:one.aaaa1111aaaa1111)\n\nmiddle\n\n![Kept alt](media:two.aaaa1111aaaa1111)\n',
    );
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'decorative-skipped', before: '', after: '' },
      { kind: 'body', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
      { kind: 'body', bucket: 'customized', before: 'Kept alt', after: 'Kept alt' },
    ]);
  });

  it('leaves the markdown byte-for-byte unchanged for a non-matching hash', () => {
    const md =
      '---\nimage:\n  src: media:hero.cccc3333cccc3333\n  alt: ""\n---\n\n![](media:inline.dddd4444dddd4444)\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(md);
    expect(out.placements).toEqual([]);
  });

  it('round-trips a body alt with brackets through escapeLinkText', () => {
    const alt = 'A cat [striped] resting';
    const md = '![](media:summit.aaaa1111aaaa1111)\n';
    const out = fillAltForHash(md, OLD, alt, { overwrite: false });
    expect(out.markdown).toBe('![A cat \\[striped\\] resting](media:summit.aaaa1111aaaa1111)\n');
    expect(bodyAltForHash(out.markdown, OLD)).toBe(alt);
  });

  it('round-trips a hero alt with a colon through the JSON-quoted scalar', () => {
    const alt = 'A cat: striped, "boxed"';
    const md = '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: ""\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, alt, { overwrite: false });
    const reread = parseMarkdown(out.markdown).frontmatter.image as { alt: string };
    expect(reread.alt).toBe(alt);
  });

  // Bug 1b: the hash also appears in a `note:` text value above the hero. The fill must anchor on
  // the structural `src:` line, fill the real hero alt, and leave the note byte-untouched. The old
  // indexOf(src) anchored on the note line and produced invalid YAML (a stray top-level alt).
  it('fills the hero alt when the same hash is mentioned in a note text field, valid YAML', () => {
    const md =
      '---\nnote: "from media:summit.aaaa1111aaaa1111 shoot"\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: ""\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(
      '---\nnote: "from media:summit.aaaa1111aaaa1111 shoot"\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: "A summit at dawn"\n---\n\nBody.\n',
    );
    const fm = parseMarkdown(out.markdown).frontmatter;
    expect(fm.note).toBe('from media:summit.aaaa1111aaaa1111 shoot');
    expect((fm.image as { alt: string }).alt).toBe(DEFAULT_ALT);
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  // Bug 1a: two image fields referencing the same hash with the same src string. Both empty alts must
  // fill into distinct spans and the output must be valid YAML. The old indexOf(src) gave both
  // iterations the same offset, so the two splices clobbered each other.
  it('fills two image fields that share one hash and produces valid YAML', () => {
    const md =
      '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: ""\nogImage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: ""\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(
      '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: "A summit at dawn"\nogImage:\n  src: media:summit.aaaa1111aaaa1111\n  alt: "A summit at dawn"\n---\n\nBody.\n',
    );
    const fm = parseMarkdown(out.markdown).frontmatter;
    expect((fm.image as { alt: string }).alt).toBe(DEFAULT_ALT);
    expect((fm.ogImage as { alt: string }).alt).toBe(DEFAULT_ALT);
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
      { kind: 'hero', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  // Bug 1d: a deeper-nested child between src and alt in the mapping. The same-indent walk used to
  // stop at the nested block and miss the existing alt, inserting a duplicate alt (duplicated key).
  it('overwrites an existing hero alt that sits below a nested child, no duplicate key', () => {
    const md =
      '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  focus:\n    x: 1\n  alt: Old alt\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: true });
    expect(out.markdown).toBe(
      '---\nimage:\n  src: media:summit.aaaa1111aaaa1111\n  focus:\n    x: 1\n  alt: "A summit at dawn"\n---\n\nBody.\n',
    );
    const fm = parseMarkdown(out.markdown).frontmatter;
    expect((fm.image as { alt: string }).alt).toBe(DEFAULT_ALT);
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'customized', before: 'Old alt', after: DEFAULT_ALT },
    ]);
  });

  // Bug 1c: a flow-style hero has no `src:` line to anchor on, so it is reported from the gray-matter
  // read but never spliced. The old insert branch appended a spurious top-level alt and corrupted it.
  it('reports a flow-style hero but does not corrupt it (unanchorable shape)', () => {
    const md =
      '---\nimage: { src: media:summit.aaaa1111aaaa1111, alt: "" }\n---\n\nBody.\n';
    const out = fillAltForHash(md, OLD, DEFAULT_ALT, { overwrite: false });
    expect(out.markdown).toBe(md);
    expect(parseMarkdown(out.markdown).frontmatter).toBeTruthy();
    expect(out.placements).toEqual([
      { kind: 'hero', bucket: 'will-fill', before: '', after: DEFAULT_ALT },
    ]);
  });

  // Bug 2: an overwrite of a custom body alt that itself contains `](` and `![`. The naive forward
  // scan for `](` landed inside the alt and corrupted the image. The span must come from the node
  // geometry (alt is `[nodeFrom+2, the `](` before the url)`).
  it('overwrites a body alt containing bracket delimiters without corrupting the image', () => {
    const md = '![a \\]( b ![x](y)](media:summit.aaaa1111aaaa1111)\n';
    const out = fillAltForHash(md, OLD, 'New alt', { overwrite: true });
    expect(out.markdown).toBe('![New alt](media:summit.aaaa1111aaaa1111)\n');
    expect(bodyAltForHash(out.markdown, OLD)).toBe('New alt');
    // `before` is the parser's already-unescaped alt (the nested ![x](y) flattens to its text).
    expect(out.placements).toEqual([
      { kind: 'body', bucket: 'customized', before: 'a ]( b x', after: 'New alt' },
    ]);
  });
});
