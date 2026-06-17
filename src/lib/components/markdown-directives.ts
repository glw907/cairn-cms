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

/**
 * The directive name from a container opener line (`:::callout{...}` -> `callout`,
 * `::::cta[Book]` -> `cta`), or null when the line is not a named container opener. Reads the
 * same FENCE match the scan uses: group 2 is the name, empty on a bare closer, so a closer or a
 * non-fence line returns null.
 */
export function directiveOpenerName(line: string): string | null {
  const m = FENCE.exec(line);
  return m && m[2] ? m[2] : null;
}

/** Classify a whole line as a container fence, a leaf directive, or neither. */
export function directiveLineKind(line: string): 'fence' | 'leaf' | null {
  if (FENCE.test(line)) return 'fence';
  if (LEAF.test(line)) return 'leaf';
  return null;
}

/** One pass over the document: each line's container depth alongside its fence role. */
export interface FenceScan {
  /** The 1-based container depth per line, or null outside any container. */
  depths: (number | null)[];
  /** Whether a line opened or closed a container, or null for everything else. A fence-shaped
   *  line the code-block tracking disowned is null too, so the role array is the one source of
   *  truth for pairing and no caller re-parses a line the scan already judged. */
  roles: ('opener' | 'closer' | null)[];
}

/**
 * Scan the document's container structure in one pass. A named fence opens a container; a bare
 * fence closes the most recent one (colon counts are not trusted for pairing, since authors
 * vary them). An opener and its closer share the opener's depth, and a line between them
 * carries the depth of its innermost container. Lines inside a fenced code block are plain
 * content, so a documented ::: example cannot open a phantom container running to end of
 * document. Author errors are tolerated: an unmatched closer reads as depth 1 and the count
 * never goes below zero.
 */
export function fenceScan(lines: string[]): FenceScan {
  const depths: (number | null)[] = [];
  const roles: ('opener' | 'closer' | null)[] = [];
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
      roles.push(null);
      continue;
    }
    if (codeMarker !== null) {
      depths.push(open > 0 ? open : null);
      roles.push(null);
      continue;
    }
    const fence = FENCE.exec(line);
    if (!fence) {
      depths.push(open > 0 ? open : null);
      roles.push(null);
    } else if (fence[2]) {
      open += 1;
      depths.push(open);
      roles.push('opener');
    } else {
      depths.push(Math.max(open, 1));
      roles.push('closer');
      if (open > 0) open -= 1;
    }
  }
  return { depths, roles };
}

/** The depth half of {@link fenceScan}, for callers that need no roles. */
export function fenceDepths(lines: string[]): (number | null)[] {
  return fenceScan(lines).depths;
}

/** The inclusive line span of one directive container. */
export interface ContainerRange {
  fromLine: number;
  toLine: number;
  depth: number;
}

/**
 * The innermost container around a caret line, as an inclusive line range, or null outside any
 * container. Works from the cached scan without re-parsing: the caret line's own depth names
 * the container (fence rows carry the depth they delimit, so a caret on a fence belongs to
 * that fence's container), and within a container the only same-depth real fences are its
 * opener and closer (nested containers sit deeper, siblings sit outside), so the nearest
 * opener above and the nearest closer below bound the range. The scan's roles already disown a
 * fence-shaped line inside a code block, so a documented example can never clip the range. An
 * unclosed container runs to the document end.
 */
export function caretContainerRange(scan: FenceScan, caretLine: number): ContainerRange | null {
  const { depths, roles } = scan;
  const depth = depths[caretLine] ?? null;
  if (depth === null) return null;
  let fromLine = caretLine;
  for (let i = caretLine; i >= 0; i--) {
    if (depths[i] === depth && roles[i] === 'opener') {
      fromLine = i;
      break;
    }
  }
  let toLine = depths.length - 1;
  for (let i = caretLine; i < depths.length; i++) {
    if (depths[i] === depth && roles[i] === 'closer') {
      toLine = i;
      break;
    }
  }
  return { fromLine, toLine, depth };
}

/**
 * Every paired directive container in the document, as inclusive line ranges. Walks the scan's
 * roles with a stack: an opener pushes its line, a closer pops the nearest open one and emits the
 * pair at the opener's depth. The ranges come back in close order, so an inner container precedes
 * the outer that holds it, which is exactly the order a fold consumer wants (folding the innermost
 * first). An unbalanced opener is left on the stack and never emitted (a half-typed fence earns no
 * fold range, the safety invariant), and a stray closer with nothing open is dropped. The scan
 * already disowns a fence-shaped line inside a code block (its role is null), so a documented
 * example can neither open nor close a range. This is the sole source of fold ranges.
 */
export function containerRanges(scan: FenceScan): ContainerRange[] {
  const { depths, roles } = scan;
  const out: ContainerRange[] = [];
  const stack: number[] = [];
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'opener') {
      stack.push(i);
    } else if (roles[i] === 'closer') {
      const fromLine = stack.pop();
      if (fromLine === undefined) continue;
      out.push({ fromLine, toLine: i, depth: depths[fromLine] ?? 1 });
    }
  }
  return out;
}

/** The closed placement-role set for the reserved `figure` directive, mirroring remark-figure.ts.
 *  A class outside this set is the measure default, never passed through as a role. */
const FIGURE_ROLES = new Set(['center', 'wide', 'full']);

// The directive `{attrs}` brace, and the `.class` shorthands inside it. mdast-util-directive folds
// every `.class` into a space-joined node.attributes.class, and remark-figure honors a role only when
// that whole value is exactly one closed-set name. The chip reads the opener line directly (the
// editor has no mdast), so it collects all class shorthands and applies the same exactly-one rule, so
// a multi-class brace reads as the measure default on the chip exactly as it renders.
const ATTR_BRACE = /\{([^}]*)\}/;
const CLASS_SHORTHAND = /\.([\w-]+)/g;
const CLASS_ATTR = /class\s*=\s*"([^"]*)"/;

/** The figure placement role for a media token sitting on `lineIndex`, derived from the editor's
 *  line scan without a remark parse (the chip rebuild runs on every doc and viewport change).
 *
 *  Returns the closed-set role (`center`/`wide`/`full`) when the innermost container holding the
 *  line is a `:::figure` carrying exactly that one class, `'figure'` for a figure with no role (the
 *  measure default), an out-of-set class, or more than one class, and null when the line sits in no
 *  container or in a non-figure one. A bare media token earns no role pill (the no-hidden-state rule:
 *  the visible decoration and the source agree, including the multi-class case remark-figure ignores).
 *  Robust to a half-typed or unpaired fence, since {@link caretContainerRange} already disowns
 *  fence-shaped lines inside code blocks and runs an unclosed container to the end.
 */
export function figureRoleAtLine(
  scan: FenceScan,
  lines: string[],
  lineIndex: number,
): 'center' | 'wide' | 'full' | 'figure' | null {
  const container = caretContainerRange(scan, lineIndex);
  if (!container) return null;
  const opener = lines[container.fromLine] ?? '';
  if (directiveOpenerName(opener) !== 'figure') return null;
  const brace = ATTR_BRACE.exec(opener)?.[1] ?? '';
  // mdast folds both the `.class` shorthand and an explicit `class="a b"` into one class value, so
  // collect from both to mirror what remark-figure reads off node.attributes.class.
  const classes = [...brace.matchAll(CLASS_SHORTHAND)].map((m) => m[1]);
  const explicit = CLASS_ATTR.exec(brace)?.[1];
  if (explicit) classes.push(...explicit.split(/\s+/).filter(Boolean));
  // remark-figure keeps the role only when the whole class value is one closed-set name; a multi-class
  // or out-of-set brace renders as the measure default, so the pill reads `figure` to match.
  return classes.length === 1 && FIGURE_ROLES.has(classes[0])
    ? (classes[0] as 'center' | 'wide' | 'full')
    : 'figure';
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

// The marker prefix of a quote or list line: leading indentation, the marker itself, and the one
// space after it. A task checkbox (`[ ]`/`[x]`) extends a bullet's marker. Ordered markers vary in
// width (a two-digit number is wider than a bullet), so the width is read from the match, never
// assumed. The anchored alternatives mirror the markers the highlight pass styles.
const MARKER = /^(\s*)(?:[-*+](?: \[[ xX]\])?|\d+[.)]|>) /;

/**
 * The marker prefix of a line (indentation plus marker plus its trailing space), or null when the
 * line carries no quote or list marker. The hanging-indent decoration uses the prefix length, in
 * fixed-pitch chars, to wrap continuation lines under the content rather than under the marker.
 */
export function markerPrefix(line: string): string | null {
  const m = MARKER.exec(line);
  return m ? m[0] : null;
}

/** Inline directive ranges (`:name[...]{...}`) within a line of text. */
export function findInlineDirectives(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const m of text.matchAll(INLINE)) {
    out.push({ from: m.index, to: m.index + m[0].length });
  }
  return out;
}
