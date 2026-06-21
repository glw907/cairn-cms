// cairn-cms: the objective-error layer (spec 1.7). Three deterministic mechanical checks over the
// prose spans the spellcheck classifier already kept: doubled words, double spaces inside a line,
// and stray repeated punctuation. No Worker, no dictionary, no `retext` pipeline (that stays out of
// the client and remains the right tool for a future CI-side prose check). There is NO style or
// opinion linter here by decision 2; the `retext` passive/simplify/equality/readability plugins are
// never enabled. This module is pure and CodeMirror-free: text plus prose ranges in, findings (each
// a flagged range and a single-edit fix) out, so it unit-tests in node. The thin lint-source wiring
// lives in spellcheck.ts, where the findings join the spellcheck diagnostics on the same locked
// amber underline.
import type { Range } from './spellcheck.js';

/** The three objective-error kinds, each its own check. */
export type ObjectiveErrorKind = 'doubled-word' | 'double-space' | 'repeated-punct';

/** A single deterministic edit that resolves one finding: replace [from, to) with `insert`. The lint
 *  source turns this into the diagnostic's quick-fix action. */
export interface ObjectiveFix {
  from: number;
  to: number;
  insert: string;
}

/** One objective-error finding: the flagged range a reader sees underlined, the error kind, a plain
 *  message, and the one-edit fix. */
export interface ObjectiveError {
  kind: ObjectiveErrorKind;
  /** The flagged range (absolute document offsets), the span the underline covers. */
  from: number;
  to: number;
  /** A plain message naming the error, so the underline is never the only signal. */
  message: string;
  /** The deterministic fix. */
  fix: ObjectiveFix;
}

// A word for the doubled-word check, matched the same way the spellcheck extractor matches words:
// Unicode letters and digits, with an intra-word apostrophe (straight or curly) or hyphen kept so
// "it's" and "well-known" stay whole. Kept consistent with extractWords so the two surfaces agree on
// what a word is.
const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/u;

// A doubled word: a word, then whitespace (a space run or a line break), then a second word. The two
// words are compared case-insensitively in code rather than with a backreference so the comparison
// stays explicit. The WORD class is greedy to the boundary, so each side is a whole word and a repeat
// is never matched mid-word ("the theater" is not a doubled "the"). The match runs only inside one
// prose span, so two equal words separated by a skipped region never read as a doubled pair.
const DOUBLED_WORD = new RegExp(`(${WORD.source})(\\s+)(${WORD.source})`, 'gu');

// Two or more spaces NOT at the start of a line (leading indentation is markdown-significant and is
// left alone). The check is same-line only: \n is not part of the run, so a line break is never
// collapsed. The run must follow a non-whitespace character on the line, so a space run after leading
// indentation (a newline or a tab) is never flagged. A run is flagged from its second space, the
// surplus the fix removes.
const DOUBLE_SPACE = /[^\s] ( +)/g;

// Stray repeated punctuation: two or more of `!`, `?`, or `,` in a run. The period is deliberately
// excluded so an ellipsis ("...") is left alone, the most judgment-laden case. The threshold is two:
// a single mark is correct, two or more of these three is plainly a typo. A mixed run ("?!") is not
// flagged because it is a legitimate construction; only a run of one identical mark counts.
const REPEATED_PUNCT = /([!?,])\1+/g;

/** Whether two matched word strings are the same word, case-insensitively. Both are already plain
 *  word runs from the same WORD pattern, so a locale-insensitive lowercase compare is enough. */
function sameWord(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Run the three objective checks over one prose span [from, to), returning every finding with an
 *  absolute range and fix. The doubled-word check is bounded to this span so a repeat that straddles
 *  a skipped region is never matched. */
function checkSpan(text: string, from: number, to: number): ObjectiveError[] {
  const out: ObjectiveError[] = [];
  const slice = text.slice(from, to);

  // 1. Doubled words. lastIndex stepping handles overlapping triples ("the the the") by restarting
  //    the scan at the second word, so each adjacent pair is examined.
  DOUBLED_WORD.lastIndex = 0;
  let dw: RegExpExecArray | null;
  while ((dw = DOUBLED_WORD.exec(slice)) !== null) {
    const [whole, first, gap, second] = dw;
    if (gap === undefined || first === undefined || second === undefined) continue;
    if (sameWord(first, second)) {
      const matchStart = from + dw.index;
      const matchEnd = matchStart + whole.length;
      // The fix deletes the gap and the second word, leaving the first word alone.
      const fixFrom = matchStart + first.length;
      out.push({
        kind: 'doubled-word',
        from: matchStart,
        to: matchEnd,
        message: `Doubled word \`${first}\`.`,
        fix: { from: fixFrom, to: matchEnd, insert: '' },
      });
    }
    // Restart at the second word so an overlapping triple is caught as two pairs.
    DOUBLED_WORD.lastIndex = dw.index + first.length + gap.length;
  }

  // 2. Double (or more) spaces inside a line, never leading indentation. The capture group is the
  //    surplus spaces (every space past the first); the fix removes them, collapsing the run to one.
  DOUBLE_SPACE.lastIndex = 0;
  let ds: RegExpExecArray | null;
  while ((ds = DOUBLE_SPACE.exec(slice)) !== null) {
    const surplus = ds[1];
    if (surplus === undefined) continue;
    // The run begins one space after the leading non-space-non-newline character the pattern anchored
    // on, so the flagged range is the whole space run (the one kept space plus the surplus).
    const runStart = from + ds.index + 1;
    const runEnd = runStart + 1 + surplus.length;
    out.push({
      kind: 'double-space',
      from: runStart,
      to: runEnd,
      message: 'Repeated space.',
      fix: { from: runStart + 1, to: runEnd, insert: '' },
    });
  }

  // 3. Stray repeated punctuation (`!`, `?`, `,`), collapsed to one. The period is excluded so an
  //    ellipsis is never touched.
  REPEATED_PUNCT.lastIndex = 0;
  let rp: RegExpExecArray | null;
  while ((rp = REPEATED_PUNCT.exec(slice)) !== null) {
    const mark = rp[1];
    if (mark === undefined) continue;
    const runStart = from + rp.index;
    const runEnd = runStart + rp[0].length;
    out.push({
      kind: 'repeated-punct',
      from: runStart,
      to: runEnd,
      message: `Repeated \`${mark}\`.`,
      // Keep the first mark, delete the rest.
      fix: { from: runStart + 1, to: runEnd, insert: '' },
    });
  }

  return out;
}

/**
 * Every objective-error finding across the given prose spans. The spans are the same keep ranges the
 * spellcheck classifier produced (via {@link classifyProse}), so an error inside code, a URL,
 * frontmatter, or directive machinery is never flagged. Each finding carries an absolute range and a
 * single-edit fix. Deterministic and CodeMirror-free, so the unit test asserts the findings without a
 * browser or a Worker. The findings are returned in document order across the spans.
 */
export function objectiveErrors(text: string, spans: Range[]): ObjectiveError[] {
  const out: ObjectiveError[] = [];
  for (const span of spans) {
    out.push(...checkSpan(text, span.from, span.to));
  }
  out.sort((a, b) => a.from - b.from || a.to - b.to);
  return out;
}
