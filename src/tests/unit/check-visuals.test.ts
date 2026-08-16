import { describe, it, expect } from 'vitest';
import { scanDocument } from '../../../scripts/checks/check-visuals.mjs';

const FILE = 'fixture.md';

describe('scanDocument: mermaid fences', () => {
  it('flags a fence missing accTitle and accDescr', () => {
    const text = [
      '```mermaid',
      'flowchart LR',
      '  a --> b',
      '```',
      '',
      '*A caption that talks about a and b in complete sentences.*',
      '',
    ].join('\n');
    const { violations, diagramCount } = scanDocument(FILE, text);
    expect(diagramCount).toBe(1);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'missing-acctitle' }),
        expect.objectContaining({ kind: 'missing-accdescr' }),
      ]),
    );
  });

  it('flags a fence whose next non-blank line is not an emphasis-paragraph caption', () => {
    const text = [
      '```mermaid',
      'flowchart LR',
      '  accTitle: Diagram of a going to b',
      '  accDescr: A goes to b.',
      '  a --> b',
      '```',
      '',
      'A caption with no emphasis markers at all.',
      '',
    ].join('\n');
    const { violations } = scanDocument(FILE, text);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'missing-caption' })]),
    );
  });

  it('flags a fence with nothing but blank lines after it', () => {
    const text = [
      '```mermaid',
      'flowchart LR',
      '  accTitle: Diagram of a going to b',
      '  accDescr: A goes to b.',
      '  a --> b',
      '```',
      '',
    ].join('\n');
    const { violations } = scanDocument(FILE, text);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'missing-caption' })]),
    );
  });

  it('passes a compliant fence: accTitle, accDescr, and an emphasis-paragraph caption', () => {
    const text = [
      '```mermaid',
      'flowchart LR',
      '  accTitle: Diagram of a going to b',
      '  accDescr: A goes to b.',
      '  a --> b',
      '```',
      '',
      '*A goes to b, the whole of the diagram stated as a complete sentence.*',
      '',
    ].join('\n');
    const { violations, diagramCount } = scanDocument(FILE, text);
    expect(diagramCount).toBe(1);
    expect(violations).toEqual([]);
  });

  it('accepts a caption paragraph wrapped across multiple lines', () => {
    const text = [
      '```mermaid',
      'flowchart LR',
      '  accTitle: Diagram of a going to b',
      '  accDescr: A goes to b.',
      '  a --> b',
      '```',
      '',
      '*A goes to b, and this sentence runs long enough that an author',
      'would wrap it onto a second line in the source file.*',
      '',
    ].join('\n');
    const { violations } = scanDocument(FILE, text);
    expect(violations).toEqual([]);
  });
});

describe('scanDocument: images', () => {
  it('flags a markdown image with empty alt text', () => {
    const text = 'See the ![](media:cat.deadbeef) figure above.\n';
    const { violations, imageCount } = scanDocument(FILE, text);
    expect(imageCount).toBe(1);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'empty-alt' })]),
    );
  });

  it('flags alt text over 150 characters', () => {
    const longAlt = 'A'.repeat(151);
    const text = `![${longAlt}](media:cat.deadbeef)\n`;
    const { violations } = scanDocument(FILE, text);
    expect(violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'alt-too-long' })]),
    );
  });

  it('passes a deliberate decorative image authored as HTML with alt=""', () => {
    const text = '<img src="/decorative.svg" alt="" />\n';
    const { violations, imageCount } = scanDocument(FILE, text);
    expect(imageCount).toBe(1);
    expect(violations).toEqual([]);
  });

  it('passes a compliant markdown image with real, short alt text', () => {
    const text = '![Diagram of a going to b, reproduced from the settings screen](media:cat.deadbeef)\n';
    const { violations, imageCount } = scanDocument(FILE, text);
    expect(imageCount).toBe(1);
    expect(violations).toEqual([]);
  });

  it('ignores markdown image syntax written inside an inline code span', () => {
    const text = 'An inline body image is written as `![alt](media:slug.hash)`.\n';
    const { violations, imageCount } = scanDocument(FILE, text);
    expect(imageCount).toBe(0);
    expect(violations).toEqual([]);
  });

  it('ignores markdown image syntax written inside a fenced code block', () => {
    const text = ['```md', '![](media:cat.deadbeef)', '```', ''].join('\n');
    const { violations, imageCount } = scanDocument(FILE, text);
    expect(imageCount).toBe(0);
    expect(violations).toEqual([]);
  });
});

describe('scanDocument: a page with no visuals at all', () => {
  it('reports zero found rather than erroring', () => {
    const { violations, diagramCount, imageCount } = scanDocument(FILE, 'Just prose, no visuals.\n');
    expect(violations).toEqual([]);
    expect(diagramCount).toBe(0);
    expect(imageCount).toBe(0);
  });
});
