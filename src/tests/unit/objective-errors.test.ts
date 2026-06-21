import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import type { Tree } from '@lezer/common';
import { objectiveErrors } from '../../lib/components/objective-errors.js';
import { classifyProse, type Range } from '../../lib/components/spellcheck.js';

// The unit drives the PURE objective checks: text plus prose spans in, findings (range + fix) out.
// No CodeMirror lint source, no DOM. For the code-exclusion test it composes classifyProse the same
// way the lint source does, so the proof that an in-code error never surfaces runs end to end.
function treeOf(doc: string): Tree {
  const state = EditorState.create({ doc, extensions: [markdownLanguage] });
  return syntaxTree(state);
}

// The whole document as one prose span, for the checks that do not depend on the skip authority.
function wholeSpan(doc: string): Range[] {
  return [{ from: 0, to: doc.length }];
}

describe('objectiveErrors: doubled words', () => {
  it('flags a doubled word across a space and the fix deletes the second occurrence', () => {
    const doc = 'I saw the the dog.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    const doubled = errors.find((e) => e.kind === 'doubled-word');
    expect(doubled).toBeDefined();
    // The flagged range covers the repeated pair so the underline names the whole error.
    expect(doc.slice(doubled!.from, doubled!.to)).toBe('the the');
    // The fix deletes the second word plus the separating whitespace, leaving one "the".
    const fixed =
      doc.slice(0, doubled!.fix.from) + doubled!.fix.insert + doc.slice(doubled!.fix.to);
    expect(fixed).toBe('I saw the dog.');
  });

  it('flags a doubled word across a line break too', () => {
    const doc = 'a sentence ending and\nand starting again here';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    const doubled = errors.find((e) => e.kind === 'doubled-word');
    expect(doubled).toBeDefined();
    expect(doc.slice(doubled!.from, doubled!.to)).toBe('and\nand');
    const fixed =
      doc.slice(0, doubled!.fix.from) + doubled!.fix.insert + doc.slice(doubled!.fix.to);
    expect(fixed).toBe('a sentence ending and starting again here');
  });

  it('matches the repeated word case-insensitively', () => {
    const doc = 'The The matter is settled.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    expect(errors.some((e) => e.kind === 'doubled-word')).toBe(true);
  });

  it('does not flag two different adjacent words', () => {
    const doc = 'the cat sat on the mat.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    expect(errors.some((e) => e.kind === 'doubled-word')).toBe(false);
  });
});

describe('objectiveErrors: double spaces inside a line', () => {
  it('flags a double space inside a line and the fix collapses it to one', () => {
    const doc = 'a sentence  with two spaces.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    const space = errors.find((e) => e.kind === 'double-space');
    expect(space).toBeDefined();
    const fixed = doc.slice(0, space!.fix.from) + space!.fix.insert + doc.slice(space!.fix.to);
    expect(fixed).toBe('a sentence with two spaces.');
  });

  it('does not flag leading indentation', () => {
    const doc = 'first line\n    indented body line follows.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    expect(errors.some((e) => e.kind === 'double-space')).toBe(false);
  });
});

describe('objectiveErrors: stray repeated punctuation', () => {
  it('flags "!!" and the fix collapses it to one', () => {
    const doc = 'What a surprise!! Really.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    const punct = errors.find((e) => e.kind === 'repeated-punct');
    expect(punct).toBeDefined();
    const fixed = doc.slice(0, punct!.fix.from) + punct!.fix.insert + doc.slice(punct!.fix.to);
    expect(fixed).toBe('What a surprise! Really.');
  });

  it('flags "??" and ",," but leaves an ellipsis alone', () => {
    const doc = 'wait?? then,, and finally...';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    const punct = errors.filter((e) => e.kind === 'repeated-punct');
    // Both the question marks and the commas are flagged; the period run is not.
    expect(punct.length).toBe(2);
    for (const e of punct) {
      expect(doc.slice(e.from, e.to)).not.toContain('.');
    }
  });

  it('never flags a run of periods (the ellipsis exemption)', () => {
    const doc = 'one moment.... then more.';
    const errors = objectiveErrors(doc, wholeSpan(doc));
    expect(errors.some((e) => e.kind === 'repeated-punct')).toBe(false);
  });
});

describe('objectiveErrors: the prose-span exclusion (the key contract)', () => {
  it('never sees a doubled word inside a code fence', () => {
    // The doubled "the the" lives only inside the fenced code body, which classifyProse drops.
    const doc =
      'A clean paragraph here.\n\n' +
      '```js\n' +
      'const x = the the; // not prose, never flagged\n' +
      '```\n\n' +
      'Another clean paragraph.\n';
    const tree = treeOf(doc);
    const spans = classifyProse(doc, tree, 0, doc.length);
    const errors = objectiveErrors(doc, spans);
    // The in-code doubled word is excluded from the prose spans, so no doubled-word finding exists,
    // and no finding's range reaches into the code fence.
    expect(errors.some((e) => e.kind === 'doubled-word')).toBe(false);
    const codeStart = doc.indexOf('```js');
    const codeEnd = doc.indexOf('```', codeStart + 3) + 3;
    for (const e of errors) {
      const overlapsCode = e.from < codeEnd && e.to > codeStart;
      expect(overlapsCode).toBe(false);
    }
  });

  it('still flags a doubled word that lives in real prose', () => {
    const doc =
      'A paragraph with the the doubled word.\n\n' + '```\ncode body\n```\n';
    const tree = treeOf(doc);
    const spans = classifyProse(doc, tree, 0, doc.length);
    const errors = objectiveErrors(doc, spans);
    expect(errors.some((e) => e.kind === 'doubled-word')).toBe(true);
  });
});
