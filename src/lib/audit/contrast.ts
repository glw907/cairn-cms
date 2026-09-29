// cairn-audit's static contrast core: resolve a theme token's value to a color without a browser,
// and measure a pair the way the public contrast floor does. Two halves.
//
// The resolver has a stated bound. It follows `var()` chains to a literal culori parses, and it
// evaluates one `color-mix()` form: two operands, `in oklab` or `in oklch`, and exactly one
// percentage. CSS mixes in premultiplied alpha, so the mix runs through culori's
// `interpolateWithPremultipliedAlpha`; plain `interpolate` darkens every mix toward `transparent`.
// Anything outside that bound (a relative color, `light-dark()`, a third operand, a hue method,
// another space) resolves to a reason instead of a color, so a caller reports it as unmeasured and
// never as a pass. Malformed input never throws.
//
// The measurement clamps both colors into sRGB and into display-p3, holding OKLCH lightness and
// hue, and takes the WCAG ratio in each. A translucent foreground is composited over its ground in
// each gamut first. A hue written explicitly, even at zero chroma, stays a real hue, which is what
// Chromium does; a color converted from another space with no chroma has a missing hue, which the
// interpolation fills from the other operand.
import { converter, interpolateWithPremultipliedAlpha, parse, toGamut, wcagLuminance } from 'culori';
import type { Color } from 'culori';

/**
 * A color the resolver produced, in the space it was parsed or mixed in: a mode tag, that mode's
 * channels, and an optional alpha. Declared here rather than re-exported from the color library,
 * which ships no type declarations of its own, so a consumer's type check never has to resolve it.
 */
export interface ResolvedColor {
  mode: string;
  alpha?: number;
  [channel: string]: number | string | undefined;
}

/** A resolution: the color, or why the expression is outside the resolver's bound. */
export type Resolution = { ok: true; color: ResolvedColor } | { ok: false; reason: string };

/** The value a custom property holds in the scheme being measured, or undefined when nothing defines it. */
export type PropertyLookup = (name: string) => string | undefined;

/** The two gamut ratios of one pair. */
export interface GamutRatios {
  srgb: number;
  p3: number;
}

const toRgb = converter('rgb');
const toP3 = converter('p3');
const clampToSrgb = toGamut('rgb', 'oklch');
const clampToP3 = toGamut('p3', 'oklch');

/** The spaces the one `color-mix()` form mixes in. */
const MIX_SPACES = new Set(['oklab', 'oklch']);

/** A `!important` flag at the end of a declared value. */
const IMPORTANT = /\s*!\s*important\s*$/i;

/** The text between an opening parenthesis and its match, or undefined when it never closes. */
function inside(text: string, open: number): { body: string; end: number } | undefined {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return undefined;
}

/** A function argument list split at its top-level commas. */
function splitArguments(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(body.slice(start).trim());
  return parts;
}

/** The expression wholly wrapped in one call to `name`, its body, or undefined when it is not that call. */
function wholeCall(expression: string, name: string): string | undefined {
  const prefix = `${name}(`;
  if (!expression.toLowerCase().startsWith(prefix)) return undefined;
  const call = inside(expression, name.length);
  if (!call || call.end !== expression.length) return undefined;
  return call.body;
}

/** One `color-mix()` operand split into its color and its optional percentage. */
function operand(text: string): { color: string; percentage?: number } | undefined {
  const leading = /^(-?[\d.]+)%\s+([\s\S]+)$/.exec(text);
  if (leading) return { color: leading[2].trim(), percentage: Number(leading[1]) };
  const trailing = /^([\s\S]+?)\s+(-?[\d.]+)%$/.exec(text);
  if (trailing) return { color: trailing[1].trim(), percentage: Number(trailing[2]) };
  return text.length > 0 ? { color: text } : undefined;
}

/** A hue folded into [0, 360), the range Chromium serializes. */
function foldHue(color: Color): Color {
  if (color.mode !== 'oklch' || typeof color.h !== 'number') return color;
  return { ...color, h: ((color.h % 360) + 360) % 360 };
}

function unmeasured(reason: string): Resolution {
  return { ok: false, reason };
}

function mix(body: string, lookup: PropertyLookup, seen: Set<string>): Resolution {
  const parts = splitArguments(body);
  if (parts.length < 3) return unmeasured(`color-mix(${body}) has fewer than two operands`);
  if (parts.length > 3) return unmeasured(`color-mix(${body}) mixes ${parts.length === 4 ? 'three' : parts.length - 1} operands; the resolver evaluates two`);
  const space = /^in\s+(.+)$/i.exec(parts[0])?.[1].trim().toLowerCase();
  if (space === undefined || !MIX_SPACES.has(space)) {
    return unmeasured(`color-mix(${body}) mixes in ${space ?? parts[0]}; the resolver evaluates only in oklab or in oklch, with no hue method`);
  }
  const first = operand(parts[1]);
  const second = operand(parts[2]);
  if (!first || !second) return unmeasured(`color-mix(${body}) has an empty operand`);
  const percentages = [first.percentage, second.percentage].filter((value) => value !== undefined);
  if (percentages.length !== 1) {
    return unmeasured(`color-mix(${body}) carries ${percentages.length === 0 ? 'no percentage' : 'two percentages'}; the resolver evaluates exactly one percentage`);
  }
  const share = percentages[0];
  if (!(share >= 0 && share <= 100)) return unmeasured(`color-mix(${body}) carries a percentage outside 0% to 100%`);
  const a = resolve(first.color, lookup, seen);
  if (!a.ok) return a;
  const b = resolve(second.color, lookup, seen);
  if (!b.ok) return b;
  // The share of the second operand: one minus the first's, whichever operand carries the number.
  const t = first.percentage !== undefined ? 1 - share / 100 : share / 100;
  const mixed = interpolateWithPremultipliedAlpha([culoriColor(a.color), culoriColor(b.color)], space)(t);
  return { ok: true, color: foldHue(mixed) };
}

function resolve(raw: string, lookup: PropertyLookup, seen: Set<string>): Resolution {
  const expression = raw.replace(IMPORTANT, '').trim();
  if (expression === '') return unmeasured('an empty value');

  const reference = wholeCall(expression, 'var');
  if (reference !== undefined) {
    const [name, ...rest] = splitArguments(reference);
    if (!/^--[\w-]+$/.test(name)) return unmeasured(`var(${reference}) names no plain custom property`);
    const fallback = rest.length > 0 ? reference.slice(reference.indexOf(',') + 1).trim() : undefined;
    if (seen.has(name)) return unmeasured(`var(${name}) is part of a var() cycle`);
    const value = lookup(name);
    if (value === undefined) {
      if (fallback !== undefined) return resolve(fallback, lookup, seen);
      return unmeasured(`var(${name}) is not defined in this scheme`);
    }
    return resolve(value, lookup, new Set([...seen, name]));
  }

  const mixBody = wholeCall(expression, 'color-mix');
  if (mixBody !== undefined) return mix(mixBody, lookup, seen);
  if (/^color-mix\(/i.test(expression)) return unmeasured(`${expression} is not a complete color-mix()`);

  if (/\(\s*from\s/i.test(expression)) return unmeasured(`${expression} is a relative color, which the resolver does not evaluate`);
  if (/^light-dark\(/i.test(expression)) return unmeasured(`${expression} is light-dark(), which the resolver does not evaluate`);
  if (/^currentcolor$/i.test(expression)) return unmeasured('currentColor takes the element\'s own color, which a static read cannot know');
  if (/var\(/i.test(expression)) return unmeasured(`${expression} reads a var() inside a color function, which the resolver does not evaluate`);
  if (/calc\(|env\(|attr\(/i.test(expression)) return unmeasured(`${expression} computes a channel, which the resolver does not evaluate`);
  const parsed = parse(expression);
  if (!parsed) return unmeasured(`${expression} is not a color literal the resolver reads`);
  return { ok: true, color: parsed };
}

/**
 * Resolve a declared value to a color: a literal, a `var()` chain ending in one, or the one
 * `color-mix()` form over either. `lookup` gives each custom property's value in the scheme being
 * measured. Never throws; an expression outside the bound resolves to its reason.
 */
export function resolveColor(expression: string, lookup: PropertyLookup): Resolution {
  try {
    return resolve(expression, lookup, new Set());
  } catch (err) {
    return unmeasured(`${expression} could not be read (${err instanceof Error ? err.message : String(err)})`);
  }
}

/**
 * culori's view of a resolved color. The two shapes are the same object; culori's declaration names
 * its channels where `ResolvedColor` leaves them to the index signature.
 */
function culoriColor(color: ResolvedColor): Color {
  return color as Color;
}

/** A string parsed, or a failure naming it. */
function asColor(value: string | ResolvedColor): Color {
  if (typeof value !== 'string') return culoriColor(value);
  const parsed = parse(value);
  if (!parsed) throw new Error(`cannot parse colour ${value}`);
  return parsed;
}

/** WCAG relative luminance of an sRGB color, each channel clipped to [0, 1] first, as a display clips it. */
function clippedLuminance(rgb: { r?: number; g?: number; b?: number }): number {
  const clip = (x: number | undefined) => Math.min(1, Math.max(0, x ?? 0));
  return wcagLuminance({ mode: 'rgb', r: clip(rgb.r), g: clip(rgb.g), b: clip(rgb.b) });
}

/** The WCAG ratio between two relative luminances. */
function ratio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A color with its alpha dropped. */
function opaque(color: Color): Color {
  return { ...color, alpha: undefined };
}

/**
 * `fg` over `bg` in one gamut: both clamped into it, `fg` composited over `bg` by its alpha in that
 * gamut's own encoded channels, and the WCAG ratio of the result against `bg`.
 */
function gamutRatio(fg: Color, bg: Color, clamp: (color: Color) => Color, into: (color: Color) => Color): number {
  const ground = into(clamp(opaque(bg)));
  const ink = into(clamp(opaque(fg)));
  const alpha = fg.alpha ?? 1;
  const blend = (channel: 'r' | 'g' | 'b') => alpha * Number(ink[channel] ?? 0) + (1 - alpha) * Number(ground[channel] ?? 0);
  const painted: Color = { mode: ground.mode, r: blend('r'), g: blend('g'), b: blend('b') };
  return ratio(clippedLuminance(toRgb(painted)), clippedLuminance(toRgb(ground)));
}

/**
 * The WCAG contrast of `fg` over `bg`, after clamping into sRGB and into display-p3. A string is
 * parsed first and throws naming itself when it is not a color. A translucent `fg` is composited
 * over `bg`; `bg` is read as opaque, since a caller composites a translucent ground first.
 */
export function dualGamutRatio(fg: string | ResolvedColor, bg: string | ResolvedColor): GamutRatios {
  const f = asColor(fg);
  const b = asColor(bg);
  return {
    srgb: gamutRatio(f, b, clampToSrgb, toRgb),
    p3: gamutRatio(f, b, clampToP3, toP3),
  };
}

/**
 * `fg` alpha-composited over an opaque `bg` in sRGB, the space a browser composites in, for a
 * translucent ground laid over the page. An opaque `fg` comes back unchanged.
 */
export function compositeOver(fg: ResolvedColor, bg: ResolvedColor): ResolvedColor {
  const alpha = fg.alpha ?? 1;
  if (alpha >= 1) return fg;
  const top = toRgb(opaque(culoriColor(fg)));
  const under = toRgb(opaque(culoriColor(bg)));
  const blend = (channel: 'r' | 'g' | 'b') => alpha * top[channel] + (1 - alpha) * under[channel];
  return { mode: 'rgb', r: blend('r'), g: blend('g'), b: blend('b') };
}
