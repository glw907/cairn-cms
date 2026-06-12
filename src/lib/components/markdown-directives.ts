// Remark-directive detection for the editor's machinery highlighting (spec: directive syntax is
// styled distinctly so an editor can tell component scaffolding from prose). Pure functions; the
// CodeMirror decoration plugin wraps them.

// A container fence: three or more colons, then an optional name, an optional [label], and
// optional {attrs}, in remark-directive order. The name is captured so the depth scan below can
// tell an opener (named) from a closer (bare colons). Matching is tolerant of stray whitespace,
// the same posture as the leaf form: a slightly off fence should still read as machinery.
const FENCE = /^\s{0,3}:{3,}\s*([\w-]*)\s*(\[[^\]]*\])?\s*(\{[^}]*\})?\s*$/;
const LEAF = /^\s{0,3}::[\w-]+(\[[^\]]*\])?(\{[^}]*\})?\s*$/;
const INLINE = /(?<![:\w]):[\w-]+\[[^\]]*\](\{[^}]*\})?/g;

// A fenced code block's delimiter: three or more backticks or tildes, indent-tolerant like the
// directive forms. The depth scan tracks these so a documented ::: example inside a code block
// never opens a real container.
const CODE_FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Classify a whole line as a container fence, a leaf directive, or neither. */
export function directiveLineKind(line: string): 'fence' | 'leaf' | null {
  if (FENCE.test(line)) return 'fence';
  if (LEAF.test(line)) return 'leaf';
  return null;
}

/**
 * The 1-based container depth each line sits at, or null outside any container. A named fence
 * opens a container; a bare fence closes the most recent one (colon counts are not trusted for
 * pairing, since authors vary them). An opener and its closer share the opener's depth, and a
 * line between them carries the depth of its innermost container. Lines inside a fenced code
 * block are plain content, so a documented ::: example cannot open a phantom container running
 * to end of document. Author errors are tolerated: an unmatched closer reads as depth 1 and the
 * count never goes below zero.
 */
export function fenceDepths(lines: string[]): (number | null)[] {
  const depths: (number | null)[] = [];
  let open = 0;
  // The marker character that opened the current code block, or null outside one. Only a line
  // opening with the same character closes it, so tildes inside a backtick block stay literal.
  let codeMarker: string | null = null;
  for (const line of lines) {
    const code = CODE_FENCE.exec(line);
    if (code) {
      if (codeMarker === null) codeMarker = code[1][0];
      else if (code[1][0] === codeMarker) codeMarker = null;
      depths.push(open > 0 ? open : null);
      continue;
    }
    if (codeMarker !== null) {
      depths.push(open > 0 ? open : null);
      continue;
    }
    const fence = FENCE.exec(line);
    if (!fence) {
      depths.push(open > 0 ? open : null);
    } else if (fence[1]) {
      open += 1;
      depths.push(open);
    } else {
      depths.push(Math.max(open, 1));
      if (open > 0) open -= 1;
    }
  }
  return depths;
}

/** Inline directive ranges (`:name[...]{...}`) within a line of text. */
export function findInlineDirectives(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const m of text.matchAll(INLINE)) {
    out.push({ from: m.index, to: m.index + m[0].length });
  }
  return out;
}
