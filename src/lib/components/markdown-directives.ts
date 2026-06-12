// Remark-directive detection for the editor's machinery highlighting (spec: directive syntax is
// styled distinctly so an editor can tell component scaffolding from prose). Pure functions; the
// CodeMirror decoration plugin wraps them.

// A container fence: three or more colons, then an optional name, an optional [label], and
// optional {attrs}, in remark-directive order. The name is captured so the depth scan below can
// tell an opener (named) from a closer (bare colons), and the d flag records each group's span
// so fenceTokens can split the line without re-parsing. Matching is tolerant of stray
// whitespace, the same posture as the leaf form: a slightly off fence should still read as
// machinery.
const FENCE = /^\s{0,3}(:{3,})\s*([\w-]*)\s*(\[[^\]]*\])?\s*(\{[^}]*\})?\s*$/d;
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
    } else if (fence[2]) {
      open += 1;
      depths.push(open);
    } else {
      depths.push(Math.max(open, 1));
      if (open > 0) open -= 1;
    }
  }
  return depths;
}

// Tells a fence row's role apart with the FENCE name group, mirroring the depth scan's pairing
// rule: a named fence opens a container and a bare colon run closes one.
function fenceRole(line: string): 'opener' | 'closer' | null {
  const m = FENCE.exec(line);
  if (!m) return null;
  return m[2] ? 'opener' : 'closer';
}

/** The inclusive line span of one directive container. */
export interface ContainerRange {
  fromLine: number;
  toLine: number;
  depth: number;
}

/**
 * The innermost container around a caret line, as an inclusive line range, or null outside any
 * container. Works from the cached depth array without re-parsing: the caret line's own depth
 * names the container (fence rows carry the depth they delimit, so a caret on a fence belongs
 * to that fence's container), and within a container the only same-depth fences are its opener
 * and closer (nested containers sit deeper, siblings sit outside), so the nearest named fence
 * above and the nearest bare fence below bound the range. An unclosed container runs to the
 * document end.
 */
export function caretContainerRange(
  lines: string[],
  depths: (number | null)[],
  caretLine: number,
): ContainerRange | null {
  const depth = depths[caretLine] ?? null;
  if (depth === null) return null;
  let fromLine = caretLine;
  for (let i = caretLine; i >= 0; i--) {
    if (depths[i] === depth && fenceRole(lines[i]) === 'opener') {
      fromLine = i;
      break;
    }
  }
  let toLine = lines.length - 1;
  for (let i = caretLine; i < lines.length; i++) {
    if (depths[i] === depth && fenceRole(lines[i]) === 'closer') {
      toLine = i;
      break;
    }
  }
  return { fromLine, toLine, depth };
}

/** One span of a fence line, in line-local offsets: machinery (`mark`) or meaning (`label`). */
export interface FenceToken {
  from: number;
  to: number;
  kind: 'mark' | 'label';
}

/**
 * Split a fence line into machinery and meaning. The colon run, the label's brackets, and the
 * whole {attrs} group are machinery; the directive name and the label text are meaning, the
 * parts an editor reads. A bare closer is a single machinery span, and a non-fence line yields
 * no spans at all.
 */
export function fenceTokens(line: string): FenceToken[] {
  const m = FENCE.exec(line);
  if (!m?.indices) return [];
  // A group's span exists whenever the group matched: group 1 (the colons) always does on a
  // fence, and the optional groups are read only behind their own m[n] guard.
  const indices = m.indices;
  const out: FenceToken[] = [];
  const [colonFrom, colonTo] = indices[1]!;
  out.push({ from: colonFrom, to: colonTo, kind: 'mark' });
  if (m[2]) {
    const [from, to] = indices[2]!;
    out.push({ from, to, kind: 'label' });
  }
  if (m[3]) {
    const [from, to] = indices[3]!;
    out.push({ from, to: from + 1, kind: 'mark' });
    if (to - from > 2) out.push({ from: from + 1, to: to - 1, kind: 'label' });
    out.push({ from: to - 1, to, kind: 'mark' });
  }
  if (m[4]) {
    const [from, to] = indices[4]!;
    out.push({ from, to, kind: 'mark' });
  }
  return out;
}

/** Inline directive ranges (`:name[...]{...}`) within a line of text. */
export function findInlineDirectives(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const m of text.matchAll(INLINE)) {
    out.push({ from: m.index, to: m.index + m[0].length });
  }
  return out;
}
