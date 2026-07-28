// cairn-audit's markup substrate: parse a component with svelte/compiler and hand the rule engine
// the two things static rules need, the class tokens the admin's design language actually lives in
// and the template's node ranges. The parser is not an optimization over regexes, it is the
// difference between a gate that holds and one that fails open: an adversarial review proved a
// regex substrate misses single-quoted attributes, array classes, and object classes outright, and
// invents class tokens out of prose. svelte is a peer dependency, so the parser is present in every
// consumer at no dependency cost.
//
// The node list is flat and in document order because the suppression idiom (Task 8) resolves a
// directive to the first node beginning on or after the following line, then suppresses matching
// findings anywhere in that node's range. Cairn's own tree contains a multi-line element whose
// class attribute sits three lines below its directive, so a line-literal reading scores a
// correctly annotated site as two errors.
import { parse } from 'svelte/compiler';

/** One class name a component's markup references, with the position a finding prints. */
export interface ClassToken {
  /** The class name exactly as written, including any variant prefix or bracketed value. */
  value: string;
  /** Character offset of the token's first character in the component source. */
  start: number;
  /** Character offset just past the token. */
  end: number;
  /** 1-based line of `start`. */
  line: number;
}

/** One template node's identity and source range, the unit a suppression directive attaches to. */
export interface SourceNode {
  /** The svelte AST node type, for example `RegularElement`, `Comment`, or `IfBlock`. */
  type: string;
  /** Element or component name, absent on text, comments, and blocks. */
  name?: string;
  /** A comment's text, which is where a suppression directive is written. */
  data?: string;
  start: number;
  end: number;
  /** 1-based line of `start`. */
  startLine: number;
  /** 1-based line of `end`. */
  endLine: number;
}

/** A parsed component: its source, its template nodes in document order, and its class tokens. */
export interface ParsedComponent {
  /** Path as the report prints it, relative to the audited root. */
  file: string;
  source: string;
  nodes: SourceNode[];
  classTokens: ClassToken[];
}

// The svelte AST is walked structurally rather than through the published `AST` union. Two reasons:
// the walk is generic over roughly twenty node types that differ only in which key holds their
// child fragment, and svelte decorates the embedded ESTree expressions with `start`/`end` offsets
// that @types/estree does not declare. A structural shape states exactly the fields this module
// reads, and every read is guarded.
interface RawNode {
  type?: string;
  start?: number;
  end?: number;
  name?: string;
  data?: string;
  raw?: string;
  value?: unknown;
  attributes?: RawNode[];
  [key: string]: unknown;
}

// The keys that hold a template subtree. An allowlist, not a denylist: the sibling keys hold ESTree
// expressions (`test`, `expression`, `context`), which belong to the class-token walk, not the node
// list.
const FRAGMENT_KEYS = [
  'nodes',
  'fragment',
  'body',
  'consequent',
  'alternate',
  'pending',
  'then',
  'catch',
  'fallback',
];

const CLASS_DIRECTIVE_PREFIX = 'class:';

/** The offset each line of a source begins at, so a line number is a binary search. */
function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function lineOfIndex(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

/**
 * The 1-based line a source offset falls on. Single-shot: it indexes the source on every call, so
 * a bulk walk should carry the line numbers `parseComponent` already computed.
 */
export function lineAt(source: string, offset: number): number {
  return lineOfIndex(lineStarts(source), offset);
}

interface RawToken {
  value: string;
  start: number;
  end: number;
}

/** The whitespace-separated runs of a text, offset against the position the text starts at. */
function tokensIn(text: string, base: number): RawToken[] {
  const out: RawToken[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    out.push({ value: match[0], start: base + match.index, end: base + match.index + match[0].length });
  }
  return out;
}

/** The tokens of a string literal, positioned inside its quotes. */
function tokensInLiteral(node: RawNode): RawToken[] {
  if (typeof node.start !== 'number') return [];
  if (typeof node.raw === 'string' && node.raw.length >= 2) {
    return tokensIn(node.raw.slice(1, -1), node.start + 1);
  }
  if (typeof node.value === 'string') return tokensIn(node.value, node.start + 1);
  return [];
}

/**
 * The class tokens a template literal contributes. A segment glued to an interpolation is half a
 * name, the leading text- of a dynamic size utility, so it is dropped rather than reported as a
 * class the sheet never compiles.
 */
function tokensInTemplate(node: RawNode): RawToken[] {
  const quasis = Array.isArray(node.quasis) ? (node.quasis as RawNode[]) : [];
  const out: RawToken[] = [];
  quasis.forEach((quasi, index) => {
    const raw = (quasi.value as { raw?: string } | undefined)?.raw;
    if (typeof raw !== 'string' || typeof quasi.start !== 'number') return;
    const tokens = tokensIn(raw, quasi.start);
    if (tokens.length === 0) return;
    const gluedLeft = index > 0 && !/^\s/.test(raw);
    const gluedRight = index < quasis.length - 1 && !/\s$/.test(raw);
    const first = gluedLeft ? 1 : 0;
    const last = gluedRight ? tokens.length - 1 : tokens.length;
    out.push(...tokens.slice(first, Math.max(first, last)));
  });
  return out;
}

/**
 * The class tokens an expression in class position yields. Only value positions are read: a
 * conditional's test, a guard's left side, and an object value are conditions, never class names,
 * which is how the substrate stays quiet on `size === 'xs'`. An unresolvable expression (an
 * identifier, a call) contributes nothing rather than a guess.
 */
function tokensInExpression(node: RawNode | null | undefined): RawToken[] {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return [];
  const child = (key: string) => node[key] as RawNode | null | undefined;
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? tokensInLiteral(node) : [];
    case 'TemplateLiteral':
      return tokensInTemplate(node);
    case 'ArrayExpression': {
      const elements = Array.isArray(node.elements) ? (node.elements as (RawNode | null)[]) : [];
      return elements.flatMap((element) => tokensInExpression(element));
    }
    case 'ObjectExpression': {
      // The Svelte 5 object form names the class in the KEY and the condition in the value.
      const properties = Array.isArray(node.properties) ? (node.properties as RawNode[]) : [];
      return properties.flatMap((property) => {
        if (property.type !== 'Property' || property.computed === true) return [];
        const key = property.key as RawNode | undefined;
        if (!key || typeof key.start !== 'number') return [];
        if (key.type === 'Identifier' && typeof key.name === 'string') {
          return [{ value: key.name, start: key.start, end: key.start + key.name.length }];
        }
        return key.type === 'Literal' ? tokensInLiteral(key) : [];
      });
    }
    case 'ConditionalExpression':
      return [...tokensInExpression(child('consequent')), ...tokensInExpression(child('alternate'))];
    case 'LogicalExpression':
      // `cond && 'btn-active'` puts the guard on the left; `a || b` and `a ?? b` are both values.
      return node.operator === '&&'
        ? tokensInExpression(child('right'))
        : [...tokensInExpression(child('left')), ...tokensInExpression(child('right'))];
    case 'BinaryExpression':
      return node.operator === '+'
        ? [...tokensInExpression(child('left')), ...tokensInExpression(child('right'))]
        : [];
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'ParenthesizedExpression':
      return tokensInExpression(child('expression'));
    default:
      return [];
  }
}

/** The class tokens one attribute contributes, covering both the `class` prop and `class:` form. */
function tokensInAttribute(attr: RawNode): RawToken[] {
  if (attr.type === 'ClassDirective') {
    if (typeof attr.name !== 'string' || typeof attr.start !== 'number') return [];
    const start = attr.start + CLASS_DIRECTIVE_PREFIX.length;
    return [{ value: attr.name, start, end: start + attr.name.length }];
  }
  if (attr.type !== 'Attribute' || attr.name !== 'class') return [];
  const value = attr.value;
  if (value === true || value === null || value === undefined) return [];
  const parts = (Array.isArray(value) ? value : [value]) as RawNode[];
  return parts.flatMap((part) => {
    if (part.type === 'Text') {
      const text = typeof part.raw === 'string' ? part.raw : String(part.data ?? '');
      return typeof part.start === 'number' ? tokensIn(text, part.start) : [];
    }
    if (part.type === 'ExpressionTag') {
      return tokensInExpression(part.expression as RawNode | undefined);
    }
    return [];
  });
}

/** Walk the template depth first, collecting node ranges and class tokens in document order. */
function collect(
  node: RawNode,
  starts: number[],
  nodes: SourceNode[],
  tokens: ClassToken[]
): void {
  if (
    typeof node.type === 'string' &&
    node.type !== 'Fragment' &&
    typeof node.start === 'number' &&
    typeof node.end === 'number'
  ) {
    nodes.push({
      type: node.type,
      name: node.name,
      data: node.data,
      start: node.start,
      end: node.end,
      startLine: lineOfIndex(starts, node.start),
      endLine: lineOfIndex(starts, node.end),
    });
  }
  if (Array.isArray(node.attributes)) {
    for (const attr of node.attributes) {
      for (const token of tokensInAttribute(attr)) {
        tokens.push({ ...token, line: lineOfIndex(starts, token.start) });
      }
    }
  }
  for (const key of FRAGMENT_KEYS) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) collect(item as RawNode, starts, nodes, tokens);
    } else if (child && typeof child === 'object') {
      collect(child as RawNode, starts, nodes, tokens);
    }
  }
}

/**
 * Parse one component into the substrate the static rules run on. A component that does not parse
 * throws naming the file, since a syntax error is a real defect rather than a file to skip.
 */
export function parseComponent(file: string, source: string): ParsedComponent {
  let root: { fragment?: RawNode };
  try {
    // The published AST union describes the same shape this module reads structurally; the cast
    // hands the walker its own narrow view rather than twenty per-node-type narrowings.
    root = parse(source, { filename: file, modern: true }) as unknown as { fragment?: RawNode };
  } catch (err) {
    throw new Error(`${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const starts = lineStarts(source);
  const nodes: SourceNode[] = [];
  const classTokens: ClassToken[] = [];
  if (root.fragment) collect(root.fragment, starts, nodes, classTokens);
  return { file, source, nodes, classTokens };
}
