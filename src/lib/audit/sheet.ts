// cairn-audit's stylesheet substrate: resolve a markup class token to the declarations it actually
// produces in the built cairn-admin.css. The admin is utility-class-driven, so font sizes, gaps,
// and hover states live in class tokens rather than style blocks; a rule that only reads the AST
// sees `type-body` and learns nothing.
//
// Matching is exact on the unescaped class name, never a substring or a word boundary. `text-base`
// is the size utility and `text-base-content` is the daisyUI color utility, and reading one as the
// other has already produced two miscounts in this initiative.
//
// The parser is hand-rolled because a CSS parser would be a new runtime dependency for every
// consumer. It handles what a compiled Tailwind/DaisyUI sheet contains: comments, strings, nested
// at-rules, and escaped selectors. The shipped sheet is flattened before it is scoped, so a nested
// STYLE rule does not appear; a group whose prelude is a selector contributes no condition.

/** One declaration a class token resolves to, with the context it was declared in. */
export interface SheetDeclaration {
  property: string;
  value: string;
  /** The full selector of the rule that declares it. */
  selector: string;
  /** The enclosing at-rule preludes, outermost first. */
  conditions: string[];
}

/** One style rule of the compiled sheet. */
export interface SheetRule {
  selector: string;
  conditions: string[];
  declarations: { property: string; value: string }[];
  /** The class names the selector targets, unescaped, excluding anything it only negates. */
  classNames: string[];
  /** The class names a `:not(...)` clause in the selector excludes, unescaped. */
  negatedClassNames: string[];
  /**
   * Character offset of the selector's first non-whitespace, non-comment character in the CSS
   * text `parseSheet` was given. Meaningless for the compiled admin sheet (Task 9a's rules
   * resolve position through a markup class token instead), but load-bearing for the CSS-family
   * rules (Task 9b), which parse a component's own `<style>` block or a standalone consumer CSS
   * file and have no class token to anchor a finding to.
   */
  start: number;
  /** Character offset just past the selector text, at the rule's opening brace. */
  end: number;
}

/** The compiled admin stylesheet, queryable by class token. */
export interface CompiledSheet {
  rules: SheetRule[];
  /** Whether the sheet defines any rule targeting the exact class name. */
  has(className: string): boolean;
  /** Every declaration the exact class name resolves to, in sheet order. */
  declarations(className: string): SheetDeclaration[];
  /**
   * Whether the exact class name appears anywhere in the sheet, positively (`has`) or only as a
   * `:not(...)` exclusion target. DaisyUI's own `.menu` rules exclude `.disabled` and
   * `.menu-title` items from hover/focus purely through negation, with no rule ever declaring
   * `.disabled` positively; a markup class used this way is acknowledged by the sheet even though
   * it carries no declaration of its own.
   */
  mentions(className: string): boolean;
}

const IDENT_CHAR = /[A-Za-z0-9_-]/;
const HEX_ESCAPE = /^[0-9a-fA-F]{1,6}/;

function skipComment(css: string, index: number): number {
  const close = css.indexOf('*/', index + 2);
  return close === -1 ? css.length : close + 2;
}

function skipString(css: string, index: number): number {
  const quote = css[index];
  let i = index + 1;
  while (i < css.length) {
    if (css[i] === '\\') {
      i += 2;
      continue;
    }
    if (css[i] === quote) return i + 1;
    i++;
  }
  return css.length;
}

/** A prelude with its comments removed, so a selector commented out never reads as a rule. */
function stripComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '/' && text[i + 1] === '*') {
      i = skipComment(text, i);
      out += ' ';
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

/** From an opening brace to its match, reporting whether the block holds a nested block. */
function scanBlock(css: string, open: number): { end: number; nested: boolean } {
  let depth = 0;
  let nested = false;
  let i = open;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      i = skipComment(css, i);
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === '{') {
      depth++;
      if (depth === 2) nested = true;
      i++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) return { end: i, nested };
      i++;
      continue;
    }
    i++;
  }
  return { end: css.length, nested };
}

/** The index of the first colon outside parentheses and strings, or -1. */
function propertyBoundary(text: string): number {
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipString(text, i);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ':' && depth === 0) return i;
    i++;
  }
  return -1;
}

/** The declarations of a rule body. A `;` inside parentheses or a string is part of a value. */
function parseDeclarations(text: string): { property: string; value: string }[] {
  const out: { property: string; value: string }[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  const flush = (end: number) => {
    const decl = text.slice(start, end).trim();
    const colon = decl.length > 0 ? propertyBoundary(decl) : -1;
    if (colon > 0) {
      out.push({ property: decl.slice(0, colon).trim(), value: decl.slice(colon + 1).trim() });
    }
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '*') {
      i = skipComment(text, i);
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(text, i);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) {
      flush(i);
      i++;
      start = i;
      continue;
    }
    i++;
  }
  flush(text.length);
  return out;
}

/** Read one CSS identifier, resolving the backslash escapes a compiled utility name carries. */
function readIdent(text: string, index: number): { name: string; next: number } {
  let name = '';
  let i = index;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      const hex = HEX_ESCAPE.exec(text.slice(i + 1, i + 7));
      if (hex) {
        name += String.fromCodePoint(parseInt(hex[0], 16));
        i += 1 + hex[0].length;
        if (text[i] === ' ') i++;
        continue;
      }
      if (i + 1 >= text.length) break;
      name += text[i + 1];
      i += 2;
      continue;
    }
    if (IDENT_CHAR.test(ch) || ch.charCodeAt(0) > 127) {
      name += ch;
      i++;
      continue;
    }
    break;
  }
  return { name, next: i };
}

/** From an opening parenthesis to its match. */
function skipParens(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipString(text, i);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return text.length;
}

/**
 * The class names a selector targets. A name inside `:not(...)` is excluded: the rule applies to
 * everything the negation excludes, so it declares nothing about that class.
 */
export function selectorClassNames(selector: string): string[] {
  const names: string[] = [];
  let bracket = 0;
  let i = 0;
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === '"' || ch === "'") {
      i = skipString(selector, i);
      continue;
    }
    if (ch === '[') {
      bracket++;
      i++;
      continue;
    }
    if (ch === ']') {
      bracket--;
      i++;
      continue;
    }
    if (bracket === 0 && ch === ':' && /^:not\(/i.test(selector.slice(i))) {
      i = skipParens(selector, i + 4);
      continue;
    }
    if (bracket === 0 && ch === '.') {
      const { name, next } = readIdent(selector, i + 1);
      if (name) names.push(name);
      i = Math.max(next, i + 1);
      continue;
    }
    i++;
  }
  return names;
}

/** The class names a selector's `:not(...)` clauses exclude, the mirror image of `selectorClassNames`. */
export function negatedClassNames(selector: string): string[] {
  const names: string[] = [];
  let bracket = 0;
  let i = 0;
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === '"' || ch === "'") {
      i = skipString(selector, i);
      continue;
    }
    if (ch === '[') {
      bracket++;
      i++;
      continue;
    }
    if (ch === ']') {
      bracket--;
      i++;
      continue;
    }
    if (bracket === 0 && ch === ':' && /^:not\(/i.test(selector.slice(i))) {
      const openParen = i + 4;
      const afterClose = skipParens(selector, openParen);
      names.push(...selectorClassNames(selector.slice(openParen + 1, afterClose - 1)));
      i = afterClose;
      continue;
    }
    i++;
  }
  return names;
}

/**
 * The offset span of a prelude's meaningful text: leading/trailing whitespace and comments
 * excluded, so a rule's reported position points at the selector itself rather than at
 * whatever blank line or doc comment happens to precede it.
 */
function trimmedSpan(css: string, from: number, to: number): { start: number; end: number } {
  let start = from;
  while (start < to) {
    if (css[start] === '/' && css[start + 1] === '*') {
      start = Math.min(skipComment(css, start), to);
      continue;
    }
    if (/\s/.test(css[start])) {
      start++;
      continue;
    }
    break;
  }
  let end = to;
  while (end > start && /\s/.test(css[end - 1])) end--;
  return { start, end };
}

/**
 * Walk a stylesheet's blocks, recursing through groups and collecting the style rules.
 * `baseOffset` is the position, in the top-level string `parseSheet` was called with, that this
 * call's own `css` starts at: a nested `@media` block recurses over its own inner substring
 * (offset 0 in that substring), and every rule's `start`/`end` needs to read against the ONE
 * source `parseSheet`'s caller handed it, not against whichever nesting level produced it.
 */
function collectRules(css: string, conditions: string[], out: SheetRule[], baseOffset: number): void {
  let preludeStart = 0;
  let i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      i = skipComment(css, i);
      continue;
    }
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === ';' || ch === '}') {
      i++;
      preludeStart = i;
      continue;
    }
    if (ch === '{') {
      const prelude = stripComments(css.slice(preludeStart, i)).trim();
      const { start: preludeStartTrimmed, end: preludeEndTrimmed } = trimmedSpan(css, preludeStart, i);
      const { end, nested } = scanBlock(css, i);
      const inner = css.slice(i + 1, end);
      if (nested) {
        const inherited = prelude.startsWith('@') ? [...conditions, prelude] : conditions;
        collectRules(inner, inherited, out, baseOffset + i + 1);
      } else {
        out.push({
          selector: prelude,
          conditions,
          declarations: parseDeclarations(inner),
          classNames: prelude.startsWith('@') ? [] : selectorClassNames(prelude),
          negatedClassNames: prelude.startsWith('@') ? [] : negatedClassNames(prelude),
          start: baseOffset + preludeStartTrimmed,
          end: baseOffset + preludeEndTrimmed,
        });
      }
      i = end + 1;
      preludeStart = i;
      continue;
    }
    i++;
  }
}

/**
 * The individual selectors a comma-separated selector list names, trimmed and with parentheses
 * and bracket groups (`:not(...)`, `:global(...)`, an attribute selector) kept intact so a comma
 * inside one of those never splits a single selector in two. The CSS-family static rules use
 * this to compare one alternative of a selector list (a `:hover` clause, say) against another
 * rule's own list, so a shared selector's `:hover`/`:focus-visible` pairing can live in either
 * rule's own alternative rather than needing to repeat the whole list on both sides.
 */
export function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === '"' || ch === "'") {
      i = skipString(selector, i);
      continue;
    }
    if (ch === '(' || ch === '[') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (ch === ',' && depth === 0) {
      parts.push(selector.slice(start, i));
      i++;
      start = i;
      continue;
    }
    i++;
  }
  parts.push(selector.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** Index a compiled stylesheet for exact class-token lookup. */
export function parseSheet(css: string): CompiledSheet {
  const rules: SheetRule[] = [];
  collectRules(css, [], rules, 0);
  const index = new Map<string, SheetRule[]>();
  const negatedIndex = new Set<string>();
  for (const rule of rules) {
    for (const name of new Set(rule.classNames)) {
      const bucket = index.get(name);
      if (bucket) bucket.push(rule);
      else index.set(name, [rule]);
    }
    for (const name of rule.negatedClassNames) negatedIndex.add(name);
  }
  return {
    rules,
    has: (className) => index.has(className),
    declarations: (className) =>
      (index.get(className) ?? []).flatMap((rule) =>
        rule.declarations.map((decl) => ({
          property: decl.property,
          value: decl.value,
          selector: rule.selector,
          conditions: rule.conditions,
        }))
      ),
    mentions: (className) => index.has(className) || negatedIndex.has(className),
  };
}
