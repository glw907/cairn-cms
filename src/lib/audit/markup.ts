// cairn-audit's markup substrate: parse a component with svelte/compiler and hand the rule engine
// the two things static rules need, the class tokens the admin's design language actually lives in
// and the template's node ranges. The parser is not an optimization over regexes, it is the
// difference between a gate that holds and one that fails open: an adversarial review proved a
// regex substrate misses single-quoted attributes, array classes, and object classes outright, and
// invents class tokens out of prose. svelte is a peer dependency, so the parser is present in every
// consumer at no dependency cost.
//
// The node list is flat and in document order because the suppression idiom resolves a
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
  /**
   * The start offset of the element or component node that owns this token's `class` attribute.
   * A co-occurrence rule (does this element also carry `popover`, does it also carry
   * `rounded-box`) groups tokens by this key rather than by source proximity, which a nested
   * child's own class attribute would otherwise pollute.
   */
  elementStart: number;
}

/** One attribute or `class:` directive an element or component node carries. */
export interface ElementAttribute {
  /** The attribute name as written; a `class:` directive is recorded as `class:<name>`. */
  name: string;
  /**
   * Whether the value is unconditionally on: a boolean shorthand (`disabled`) or a literal
   * `true` (`disabled={true}`). A bound condition (`disabled={busy}`) is not, since it can read
   * false at runtime; a rule that only cares whether a hazard is REACHABLE, not merely named,
   * reads this rather than the attribute's raw presence.
   */
  hardcodedTrue: boolean;
  start: number;
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
  /** The node's own attributes and `class:` directives, present on an element or component node. */
  attributes?: ElementAttribute[];
  /**
   * The end offset of the nearest enclosing element or block, absent at the top level. Suppression
   * resolution reads it so a directive whose own parent holds nothing after it reads as dead rather
   * than walking out of that parent and silently attaching to the next element in the file.
   */
  parentEnd?: number;
}

/** A parsed component: its source, its template nodes in document order, and its class tokens. */
export interface ParsedComponent {
  /** Path as the report prints it, relative to the audited root. */
  file: string;
  source: string;
  nodes: SourceNode[];
  classTokens: ClassToken[];
  /**
   * Every class name the component's own scoped `<style>` block defines as a selector.
   * Svelte-scoped to the component, not the admin sheet's job: a markup reference to one of
   * these is never a compiled-sheet miss, the same exclusion `check-admin-css-classes.mjs`
   * already drew by regex over the raw `<style>` text; this substrate reads it off the
   * `svelte/compiler`'s own structured CSS AST instead.
   */
  styleClassNames: Set<string>;
  /**
   * The component's own scoped `<style>` block: its raw CSS text and the offset its first
   * character sits at in `source`. Absent when the component carries no `<style>` block. The
   * CSS-family static rules (token-colors, grammar-boundary, focus-parity, motion-band,
   * reduced-motion) parse this text with `sheet.ts`'s own selector/declaration parser and add
   * this offset back onto every position it returns, so a finding's line points at the actual
   * CSS in the component's source rather than at an offset local to the extracted text.
   */
  styleBlock?: { source: string; start: number };
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

// The component's own top-level script bindings, the other half of the class-token substrate. A
// class string is as often named in the script as written in the attribute, in a const or in a
// helper the attribute calls, and an identifier used to contribute nothing at all: cairn's own tree
// carried a class inside one of those helper strings that compiles nowhere, exactly the silent
// no-op no-uncompiled-class exists to catch, while the whole markup rule family read the file as
// clean. Resolution is local and syntactic. A binding from a prop, an import, or a function
// parameter stays unresolvable, which is the honest answer for a value this file does not contain.
interface ScriptScope {
  /** A top-level value binding's initializer expressions, runes unwrapped. */
  values: Map<string, RawNode[]>;
  /** A top-level function's return expressions, with the parameter names they may shadow. */
  functions: Map<string, { expressions: RawNode[]; params: string[] }>;
}

/** A resolution in progress: the file's bindings, and the names that must not resolve inside it. */
interface Resolution {
  scope: ScriptScope;
  /** Names currently being resolved (a cycle) or shadowed by a parameter (a value we lack). */
  blocked: Set<string>;
}

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

// The runes that wrap a value the markup then uses as a class. `$derived.by` wraps a function whose
// returns are the value; the rest wrap the expression directly.
const VALUE_RUNES = new Set(['$derived', '$state', '$state.raw']);
const DERIVED_BY = '$derived.by';

/** A callee's dotted name (`helper`, `$derived.by`), or null when it is not a plain reference. */
function calleeName(callee: RawNode | null | undefined): string | null {
  if (!callee || typeof callee !== 'object') return null;
  if (callee.type === 'Identifier') return typeof callee.name === 'string' ? callee.name : null;
  if (callee.type === 'MemberExpression' && callee.computed !== true) {
    const object = callee.object as RawNode | undefined;
    const property = callee.property as RawNode | undefined;
    if (
      object?.type === 'Identifier' &&
      typeof object.name === 'string' &&
      property?.type === 'Identifier' &&
      typeof property.name === 'string'
    ) {
      return `${object.name}.${property.name}`;
    }
  }
  return null;
}

/** Every expression a function body can return, skipping the bodies of functions nested inside it. */
function collectReturns(node: unknown, out: RawNode[], depth: number): void {
  if (!node || typeof node !== 'object' || depth > 40) return;
  const raw = node as RawNode;
  if (typeof raw.type === 'string' && FUNCTION_TYPES.has(raw.type)) return;
  if (raw.type === 'ReturnStatement' && raw.argument) out.push(raw.argument as RawNode);
  for (const key in raw) {
    if (key === 'loc' || key === 'parent') continue;
    const value = raw[key];
    if (Array.isArray(value)) {
      for (const item of value) collectReturns(item, out, depth + 1);
    } else if (value && typeof value === 'object') {
      collectReturns(value, out, depth + 1);
    }
  }
}

/** What a function contributes: the expressions it returns, and the parameter names it binds. */
function functionValue(fn: RawNode): { expressions: RawNode[]; params: string[] } {
  const params = (Array.isArray(fn.params) ? (fn.params as RawNode[]) : []).flatMap((param) =>
    param?.type === 'Identifier' && typeof param.name === 'string' ? [param.name] : []
  );
  const body = fn.body as RawNode | undefined;
  if (!body) return { expressions: [], params };
  if (body.type !== 'BlockStatement') return { expressions: [body], params };
  const expressions: RawNode[] = [];
  collectReturns(body, expressions, 0);
  return { expressions, params };
}

/** A value binding's initializer expressions, with a value rune's own wrapper removed. */
function valueExpressions(init: RawNode | null | undefined): RawNode[] {
  if (!init || typeof init !== 'object') return [];
  if (init.type === 'CallExpression') {
    const name = calleeName(init.callee as RawNode | undefined);
    const args = Array.isArray(init.arguments) ? (init.arguments as RawNode[]) : [];
    if (name !== null && VALUE_RUNES.has(name) && args.length === 1) return valueExpressions(args[0]);
    if (name === DERIVED_BY && args.length === 1) return functionValue(args[0]).expressions;
    return [init];
  }
  return [init];
}

/** Record one top-level statement's bindings, following an `export` through to its declaration. */
function declare(statement: RawNode, scope: ScriptScope): void {
  if (statement.type === 'ExportNamedDeclaration') {
    const declaration = statement.declaration as RawNode | undefined;
    if (declaration) declare(declaration, scope);
    return;
  }
  if (statement.type === 'FunctionDeclaration') {
    const id = statement.id as RawNode | undefined;
    if (id?.type === 'Identifier' && typeof id.name === 'string') {
      scope.functions.set(id.name, functionValue(statement));
    }
    return;
  }
  if (statement.type !== 'VariableDeclaration') return;
  const declarators = Array.isArray(statement.declarations)
    ? (statement.declarations as RawNode[])
    : [];
  for (const declarator of declarators) {
    const id = declarator.id as RawNode | undefined;
    if (id?.type !== 'Identifier' || typeof id.name !== 'string') continue;
    const init = declarator.init as RawNode | null | undefined;
    if (init && typeof init.type === 'string' && FUNCTION_TYPES.has(init.type)) {
      scope.functions.set(id.name, functionValue(init));
    } else {
      scope.values.set(id.name, valueExpressions(init));
    }
  }
}

/** The top-level bindings of a component's module and instance scripts. */
function collectScope(programs: (RawNode | undefined)[]): ScriptScope {
  const scope: ScriptScope = { values: new Map(), functions: new Map() };
  for (const program of programs) {
    const body = Array.isArray(program?.body) ? (program.body as RawNode[]) : [];
    for (const statement of body) declare(statement, scope);
  }
  return scope;
}

/** A resolution that blocks one more set of names, for a step further into the binding graph. */
function blocking(res: Resolution, names: string[]): Resolution {
  return { scope: res.scope, blocked: new Set([...res.blocked, ...names]) };
}

/** The raw text of a template literal's quasi at an index, empty when there is none. */
function quasiText(quasi: RawNode | undefined): string {
  const raw = (quasi?.value as { raw?: string } | undefined)?.raw;
  return typeof raw === 'string' ? raw : '';
}

/**
 * The class tokens a template literal contributes, from its static segments and from its
 * interpolations alike. A segment or an interpolation glued to its neighbour is half a name, the
 * leading text- of a dynamic size utility, so it is dropped rather than reported as a class the
 * sheet never compiles; a whitespace-separated interpolation carries whole class names and is read
 * like any other expression in class position.
 */
function tokensInTemplate(node: RawNode, res: Resolution): RawToken[] {
  const quasis = Array.isArray(node.quasis) ? (node.quasis as RawNode[]) : [];
  const expressions = Array.isArray(node.expressions) ? (node.expressions as RawNode[]) : [];
  const out: RawToken[] = [];
  for (let index = 0; index < quasis.length; index++) {
    const quasi = quasis[index];
    const raw = quasiText(quasi);
    if (typeof quasi.start === 'number') {
      const tokens = tokensIn(raw, quasi.start);
      if (tokens.length > 0) {
        const gluedLeft = index > 0 && !/^\s/.test(raw);
        const gluedRight = index < quasis.length - 1 && !/\s$/.test(raw);
        const first = gluedLeft ? 1 : 0;
        const last = gluedRight ? tokens.length - 1 : tokens.length;
        out.push(...tokens.slice(first, Math.max(first, last)));
      }
    }
    const expression = expressions[index];
    if (!expression) continue;
    // The interpolation between this segment and the next. An empty neighbouring segment glues only
    // when another interpolation sits on its far side; at the start or the end of the template there
    // is nothing to glue to.
    const after = quasiText(quasis[index + 1]);
    const openLeft = raw === '' ? index === 0 : /\s$/.test(raw);
    const openRight = after === '' ? index + 1 === quasis.length - 1 : /^\s/.test(after);
    if (openLeft && openRight) out.push(...tokensInExpression(expression, res));
  }
  return out;
}

/**
 * The class tokens an expression in class position yields. Only value positions are read: a
 * conditional's test, a guard's left side, and an object value are conditions, never class names,
 * which is how the substrate stays quiet on `size === 'xs'`. An identifier or a call resolves
 * through the component's own top-level script bindings; one this file does not declare (a prop, an
 * import, a parameter) contributes nothing rather than a guess.
 */
function tokensInExpression(node: RawNode | null | undefined, res: Resolution): RawToken[] {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') return [];
  const child = (key: string) => node[key] as RawNode | null | undefined;
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? tokensInLiteral(node) : [];
    case 'TemplateLiteral':
      return tokensInTemplate(node, res);
    case 'ArrayExpression': {
      const elements = Array.isArray(node.elements) ? (node.elements as (RawNode | null)[]) : [];
      return elements.flatMap((element) => tokensInExpression(element, res));
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
      return [
        ...tokensInExpression(child('consequent'), res),
        ...tokensInExpression(child('alternate'), res),
      ];
    case 'LogicalExpression':
      // `cond && 'btn-active'` puts the guard on the left; `a || b` and `a ?? b` are both values.
      if (node.operator === '&&') return tokensInExpression(child('right'), res);
      return [...tokensInExpression(child('left'), res), ...tokensInExpression(child('right'), res)];
    case 'BinaryExpression':
      // Concatenation joins two halves of a class string; every other operator is a comparison.
      if (node.operator !== '+') return [];
      return [...tokensInExpression(child('left'), res), ...tokensInExpression(child('right'), res)];
    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'ParenthesizedExpression':
      return tokensInExpression(child('expression'), res);
    case 'Identifier': {
      const name = node.name;
      if (typeof name !== 'string' || res.blocked.has(name)) return [];
      const values = res.scope.values.get(name);
      if (!values) return [];
      const next = blocking(res, [name]);
      return values.flatMap((value) => tokensInExpression(value, next));
    }
    case 'CallExpression': {
      const name = calleeName(child('callee'));
      if (name === null || res.blocked.has(name)) return [];
      const fn = res.scope.functions.get(name);
      if (!fn) return [];
      const next = blocking(res, [name, ...fn.params]);
      return fn.expressions.flatMap((expression) => tokensInExpression(expression, next));
    }
    default:
      return [];
  }
}

/**
 * The class tokens a spread attribute's own object literal contributes. Only the inline form is
 * resolvable: `{...rest}` from a parent is a value this file does not contain, while
 * `{...{ class: '...' }}` names its classes right here and used to be dropped before the expression
 * was ever examined.
 */
function tokensInSpread(attr: RawNode, res: Resolution): RawToken[] {
  const expression = attr.expression as RawNode | undefined;
  if (expression?.type !== 'ObjectExpression') return [];
  const properties = Array.isArray(expression.properties)
    ? (expression.properties as RawNode[])
    : [];
  return properties.flatMap((property) => {
    if (property.type !== 'Property' || property.computed === true) return [];
    const key = property.key as RawNode | undefined;
    const named =
      (key?.type === 'Identifier' && key.name === 'class') ||
      (key?.type === 'Literal' && key.value === 'class');
    return named ? tokensInExpression(property.value as RawNode | undefined, res) : [];
  });
}

/** The class tokens one attribute contributes, covering both the `class` prop and `class:` form. */
function tokensInAttribute(attr: RawNode, res: Resolution): RawToken[] {
  if (attr.type === 'ClassDirective') {
    if (typeof attr.name !== 'string' || typeof attr.start !== 'number') return [];
    const start = attr.start + CLASS_DIRECTIVE_PREFIX.length;
    return [{ value: attr.name, start, end: start + attr.name.length }];
  }
  if (attr.type === 'SpreadAttribute') return tokensInSpread(attr, res);
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
      return tokensInExpression(part.expression as RawNode | undefined, res);
    }
    return [];
  });
}

/** Whether an `Attribute` node's value is unconditionally on: a shorthand or a literal `true`. */
function isHardcodedTrue(value: unknown): boolean {
  if (value === true) return true;
  if (value === null || typeof value !== 'object') return false;
  const tag = value as RawNode;
  if (tag.type !== 'ExpressionTag') return false;
  const expr = tag.expression as RawNode | undefined;
  return !!expr && expr.type === 'Literal' && expr.value === true;
}

/** One node's own attributes and `class:` directives, the substrate a co-occurrence rule reads. */
function attributesOf(node: RawNode, starts: number[]): ElementAttribute[] {
  if (!Array.isArray(node.attributes)) return [];
  const out: ElementAttribute[] = [];
  for (const attr of node.attributes) {
    if (typeof attr.start !== 'number' || typeof attr.end !== 'number') continue;
    if (attr.type === 'ClassDirective' && typeof attr.name === 'string') {
      out.push({
        name: `${CLASS_DIRECTIVE_PREFIX}${attr.name}`,
        hardcodedTrue: false,
        start: attr.start,
        end: attr.end,
        line: lineOfIndex(starts, attr.start),
      });
      continue;
    }
    if (attr.type === 'Attribute' && typeof attr.name === 'string') {
      out.push({
        name: attr.name,
        hardcodedTrue: isHardcodedTrue(attr.value),
        start: attr.start,
        end: attr.end,
        line: lineOfIndex(starts, attr.start),
      });
    }
  }
  return out;
}

/** What one walk of a component's template writes into, assembled once by `parseComponent`. */
interface Collector {
  starts: number[];
  nodes: SourceNode[];
  tokens: ClassToken[];
  resolution: Resolution;
  /** The `start:end:value` of each token already recorded, so one script string counts once. */
  seen: Set<string>;
}

/** Walk the template depth first, collecting node ranges and class tokens in document order. */
function collect(node: RawNode, into: Collector, parentEnd: number | undefined): void {
  const { starts, nodes, tokens } = into;
  if (
    typeof node.type === 'string' &&
    node.type !== 'Fragment' &&
    typeof node.start === 'number' &&
    typeof node.end === 'number'
  ) {
    const attributes = attributesOf(node, starts);
    nodes.push({
      type: node.type,
      name: node.name,
      data: node.data,
      start: node.start,
      end: node.end,
      startLine: lineOfIndex(starts, node.start),
      endLine: lineOfIndex(starts, node.end),
      attributes: attributes.length > 0 ? attributes : undefined,
      parentEnd,
    });
  }
  if (Array.isArray(node.attributes)) {
    const elementStart = typeof node.start === 'number' ? node.start : -1;
    for (const attr of node.attributes) {
      for (const token of tokensInAttribute(attr, into.resolution)) {
        // A class string declared once in the script and used at several call sites is one place
        // to fix, not one per call site, so an identical source range counts once. It keeps its
        // FIRST owning element, which is the element a co-occurrence rule reads it against.
        const key = `${token.start}:${token.end}:${token.value}`;
        if (into.seen.has(key)) continue;
        into.seen.add(key);
        tokens.push({ ...token, line: lineOfIndex(starts, token.start), elementStart });
      }
    }
  }
  // A Fragment carries no range of its own, so its children inherit the enclosing element's or
  // block's end rather than reading as top level.
  const childParentEnd =
    node.type === 'Fragment' || typeof node.end !== 'number' ? parentEnd : node.end;
  for (const key of FRAGMENT_KEYS) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) collect(item as RawNode, into, childParentEnd);
    } else if (child && typeof child === 'object') {
      collect(child as RawNode, into, childParentEnd);
    }
  }
}

/** The class names a component's own scoped `<style>` block defines, read off the CSS AST. */
function collectStyleClassNames(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const raw = node as RawNode;
  if (raw.type === 'ClassSelector' && typeof raw.name === 'string') out.add(raw.name);
  for (const key in raw) {
    const value = raw[key];
    if (Array.isArray(value)) {
      for (const item of value) collectStyleClassNames(item, out);
    } else if (value && typeof value === 'object') {
      collectStyleClassNames(value, out);
    }
  }
}

/** The shape of svelte/compiler's own `css` root node this module reads: the raw text span. */
interface RawStyle {
  content?: { start?: number; end?: number };
}

/** The shape of a `<script>` root node this module reads: its ESTree program. */
interface RawScript {
  content?: RawNode;
}

/**
 * Parse one component into the substrate the static rules run on. A component that does not parse
 * throws naming the file, since a syntax error is a real defect rather than a file to skip.
 */
export function parseComponent(file: string, source: string): ParsedComponent {
  let root: { fragment?: RawNode; css?: RawStyle; instance?: RawScript; module?: RawScript };
  try {
    // The published AST union describes the same shape this module reads structurally; the cast
    // hands the walker its own narrow view rather than twenty per-node-type narrowings.
    root = parse(source, { filename: file, modern: true }) as unknown as {
      fragment?: RawNode;
      css?: RawStyle;
      instance?: RawScript;
      module?: RawScript;
    };
  } catch (err) {
    throw new Error(`${file}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const starts = lineStarts(source);
  const nodes: SourceNode[] = [];
  const classTokens: ClassToken[] = [];
  const scope = collectScope([root.module?.content, root.instance?.content]);
  if (root.fragment) {
    collect(
      root.fragment,
      {
        starts,
        nodes,
        tokens: classTokens,
        resolution: { scope, blocked: new Set() },
        seen: new Set(),
      },
      undefined
    );
  }
  const styleClassNames = new Set<string>();
  if (root.css) collectStyleClassNames(root.css, styleClassNames);
  const content = root.css?.content;
  const styleBlock =
    typeof content?.start === 'number' && typeof content?.end === 'number'
      ? { source: source.slice(content.start, content.end), start: content.start }
      : undefined;
  return { file, source, nodes, classTokens, styleClassNames, styleBlock };
}
