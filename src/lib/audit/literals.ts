// cairn-audit's literal-detection core: the one place that decides whether a CSS value spells out a
// color or an absolute font size instead of reading a token. `token-colors` (the admin's error-tier
// rule) and `public-literals` (the public scope's advisory rule) both classify through it, so the
// two never disagree about what a literal is. `token-colors` keeps its own narrower verdict set
// (hex, rgb, named colors, and the achromatic function forms) by choosing which of the forms
// reported here it acts on; `public-literals` acts on every one.
//
// `transparent`, `currentColor`, and the CSS-wide keywords (`inherit`, `initial`, `unset`,
// `revert`, `revert-layer`) are not literals: each names no color choice a palette could have
// supplied instead, and none is in the named-color set below.

/** The literal forms this core recognizes. */
export type ColorForm =
  | 'hex'
  | 'rgb'
  | 'hsl'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch'
  | 'color'
  | 'named';

/** One color literal found in a value, with the phrase a finding's message uses for it. */
export interface ColorLiteral {
  form: ColorForm;
  /** The literal as written: the hex run, the function name, or the color word. */
  text: string;
  /** A noun phrase such as `a raw hex color literal`, for a message to complete. */
  description: string;
}

// The CSS Color Module 4 named-color keywords, lowercase, minus `transparent` and `currentcolor`
// (see the header comment).
const NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'grey', 'green',
  'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
]);

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_FUNCTION = /\brgba?\(/i;
const COLOR_WORD = /[a-zA-Z][a-zA-Z0-9-]*/g;
const QUOTED_STRING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const URL_CALL = /\burl\([^)]*\)/gi;

// The remaining function forms, in the order a value's first hit is reported. A word boundary
// keeps `lab(` from reading inside `oklab(`, and the required parenthesis keeps `color(` from
// reading inside `color-mix(`.
const FUNCTION_FORMS: readonly { form: ColorForm; pattern: RegExp }[] = [
  { form: 'hsl', pattern: /\bhsla?\(/i },
  { form: 'hwb', pattern: /\bhwb\(/i },
  { form: 'lab', pattern: /\blab\(/i },
  { form: 'lch', pattern: /\blch\(/i },
  { form: 'oklab', pattern: /\boklab\(/i },
  { form: 'oklch', pattern: /\boklch\(/i },
  { form: 'color', pattern: /\bcolor\(/i },
];

/** A value with its quoted strings and `url()` arguments blanked, so neither is read as a color. */
function withoutQuotedText(value: string): string {
  return value.replace(QUOTED_STRING, ' ').replace(URL_CALL, ' ');
}

/**
 * The first color literal a value carries, or null. Hex, then `rgb()`, then a named color, then
 * the other function forms, so a value carrying several reports the one `token-colors` always
 * reported first. With `skipStrings`, nothing inside a quoted string or a `url()` argument is read
 * (`content: "Issue #123"`, a quoted family name, `fill: url(#fade)`): the public scope opts in,
 * while `token-colors` keeps its verdict.
 */
export function findColorLiteral(
  value: string,
  { skipStrings = false }: { skipStrings?: boolean } = {},
): ColorLiteral | null {
  const text = skipStrings ? withoutQuotedText(value) : value;
  const hex = HEX_COLOR.exec(text);
  if (hex) return { form: 'hex', text: hex[0], description: 'a raw hex color literal' };
  const rgb = RGB_FUNCTION.exec(text);
  if (rgb) return { form: 'rgb', text: rgb[0], description: 'a raw rgb()/rgba() color literal' };
  for (const match of text.matchAll(COLOR_WORD)) {
    if (NAMED_COLORS.has(match[0].toLowerCase())) {
      return { form: 'named', text: match[0], description: `the raw named color "${match[0]}"` };
    }
  }
  for (const { form, pattern } of FUNCTION_FORMS) {
    const found = pattern.exec(text);
    if (found) return { form, text: found[0], description: `a raw ${form}() color literal` };
  }
  return null;
}

/** The arguments of the first `fn(...)` call in a value, alpha component dropped. */
function functionArgs(value: string, fn: RegExp): string[] | null {
  const match = fn.exec(value);
  if (!match) return null;
  const [main] = match[1].split('/');
  return main.trim().split(/[\s,]+/).filter((token) => token.length > 0);
}

const OKLCH_ARGS = /\boklch\(([^)]*)\)/i;
const OKLAB_ARGS = /\boklab\(([^)]*)\)/i;
const HSL_ARGS = /\bhsla?\(([^)]*)\)/i;

function isZero(token: string | undefined): boolean {
  return token !== undefined && parseFloat(token) === 0;
}

/** Whether a value expresses a color function with zero chroma or saturation: a bare gray. */
export function isPureAchromatic(value: string): boolean {
  const oklch = functionArgs(value, OKLCH_ARGS);
  if (oklch && isZero(oklch[1])) return true;
  const oklab = functionArgs(value, OKLAB_ARGS);
  if (oklab && isZero(oklab[1]) && isZero(oklab[2])) return true;
  const hsl = functionArgs(value, HSL_ARGS);
  if (hsl && isZero(hsl[1])) return true;
  return false;
}

/** The index of the parenthesis closing the one at `open`, or the last index when it never closes. */
function closingParen(value: string, open: number): number {
  let depth = 0;
  for (let i = open; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')' && --depth === 0) return i;
  }
  return value.length - 1;
}

const TOKEN_CALL = /^(var|calc|clamp|min|max)\(/i;

/**
 * A value with every token read removed: each `var()` call (fallback included), and each math
 * function (`calc`, `clamp`, `min`, `max`) that reads a `var()`. What is left is what the author
 * wrote as a literal, which is the only part an absolute-size check should judge.
 */
function withoutTokenReads(value: string): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const call = /[\w-]/.test(value[i - 1] ?? '') ? null : TOKEN_CALL.exec(value.slice(i));
    if (call) {
      const close = closingParen(value, i + call[0].length - 1);
      if (call[1].toLowerCase() === 'var' || /\bvar\(/i.test(value.slice(i, close + 1))) {
        out += ' ';
        i = close + 1;
        continue;
      }
    }
    out += value[i];
    i++;
  }
  return out;
}

const ABSOLUTE_LENGTH = /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:px|pt|rem)\b/i;

/**
 * The first absolute length in a declaration that sets a font size: `font-size` itself, or the
 * `font` shorthand, whose only lengths are the size and the line height. `px`, `pt`, and `rem` are
 * absolute; `em`, `%`, and a keyword are relative to the reading context, and a `var()` or a math
 * function over one passes. Returns null for any other property.
 */
export function findAbsoluteFontSize(property: string, value: string): string | null {
  const name = property.trim().toLowerCase();
  if (name !== 'font-size' && name !== 'font') return null;
  return ABSOLUTE_LENGTH.exec(withoutTokenReads(value))?.[0] ?? null;
}

/** The literal a declaration writes: a color, or an absolute font size. */
export interface LiteralHazard {
  kind: 'color' | 'font-size';
  /** The offending text as written. */
  text: string;
  /** A noun phrase for a finding's message. */
  description: string;
}

function sizeHazard(size: string): LiteralHazard {
  return { kind: 'font-size', text: size, description: `the absolute font size ${size}` };
}

/** The first color literal a value carries outside its quoted strings, as a hazard, or null. */
function colorHazard(value: string): LiteralHazard | null {
  const color = findColorLiteral(value, { skipStrings: true });
  return color ? { kind: 'color', text: color.text, description: color.description } : null;
}

/** The first literal one declaration carries, or null. */
export function declarationHazard(property: string, value: string): LiteralHazard | null {
  const size = findAbsoluteFontSize(property, value);
  if (size !== null) return sizeHazard(size);
  return colorHazard(value);
}

// Tailwind's type hints, which name what an arbitrary value is (`text-[length:14px]`). The hint
// is syntax around the value, never part of it.
const TYPE_HINT = /^(?:length|color|percentage|number|url|family-name|absolute-size|relative-size|line-width|image|position|shadow|angle|ratio|integer|vector|bg-size):/;
const ARBITRARY_PROPERTY = /^\[([a-zA-Z-]+|--[\w-]+):([^\]]+)\]$/;
const ARBITRARY_UTILITY = /^-?([a-z][a-z0-9-]*)-\[([^\]]+)\](?:\/.+)?$/;

/** The utility itself: the class token with its variant prefixes and important marker removed. */
function utilityOf(token: string): string {
  let depth = 0;
  let cut = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ':' && depth === 0) cut = i + 1;
  }
  return token.slice(cut).replace(/^!|!$/g, '');
}

/**
 * The literal a Tailwind arbitrary value carries, or null. Two shapes: an arbitrary property
 * (`[color:#abc]`, judged as the declaration it writes) and a utility with a bracketed value
 * (`bg-[#abc]` for any color, `text-[14px]` for a size). Only the `text-` utility sets a font
 * size, so `w-[14px]` and `p-[1rem]` pass. Tailwind's own scale (`text-sm`, `bg-red-500`) has no
 * bracket and is never read.
 */
export function arbitraryValueHazard(token: string): LiteralHazard | null {
  const utility = utilityOf(token);
  const property = ARBITRARY_PROPERTY.exec(utility);
  if (property) return declarationHazard(property[1], property[2].replace(/_/g, ' '));
  const bracket = ARBITRARY_UTILITY.exec(utility);
  if (!bracket) return null;
  const value = bracket[2].replace(TYPE_HINT, '').replace(/_/g, ' ');
  if (/^\s*['"]|\burl\(/i.test(value)) return null;
  if (bracket[1] === 'text') {
    const size = findAbsoluteFontSize('font-size', value);
    if (size !== null) return sizeHazard(size);
  }
  return colorHazard(value);
}
