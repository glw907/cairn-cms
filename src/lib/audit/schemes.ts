// cairn-audit's scheme model: what each custom property holds on the root element, per scheme, read
// statically from the site's import chain. A contrast rule measures a pair only after it knows the
// values a visitor's page resolves, so this module runs a small cascade over the stylesheets in the
// order the chain loader read them.
//
// Schemes come from the daisyUI theme blocks (`@plugin "daisyui/theme"`), never from hard-coded
// names. A block compiles the way daisyUI's own plugin compiles it, into `@layer base`: every block
// on `[data-theme="<name>"]`, the default block also on `:where(:root)`, and the `prefersdark` block
// also on `:root:not([data-theme])` under `@media (prefers-color-scheme: dark)`. A block named
// after a built-in daisyUI theme is completed from that theme's own values, as daisyUI merges it.
//
// Each scheme is measured in the root states a visitor reaches it by: the page naming it through
// `data-theme`, and, for the default block and the dark-preference block, the page naming none
// under a light or a dark OS. A secondary block's omission therefore falls back to the default
// block's `:where(:root)` value, as it does in the browser.
//
// The cascade reads a declaration's layer (`@layer theme`, `base`, `components`, `utilities`, then
// any other layer, then unlayered), its `!important`, the specificity of the selector alternative
// that matches the root, and its order. `@theme` compiles to `:root` in `@layer theme`. A selector
// matches the root only when every part of it is `:root`, `html`, `:host`, `*`, a `data-theme`
// attribute test, or a `:where()`, `:is()`, or `:not()` over those; anything else describes some
// other element. A media condition other than `prefers-color-scheme` never applies, and `@supports`
// always does. An `@import` carrying `layer()` is read as unlayered, since the loader does not
// record the modifier.
import { splitSelectorList } from './sheet.js';
import type { ChainFile } from './import-chain.js';
import type { SheetRule } from './sheet.js';

/** The root element as one state sees it: the `data-theme` it carries, and the OS color preference. */
export interface RootState {
  /** The `data-theme` value on the root, or null when it carries none. */
  theme: string | null;
  /** Whether `prefers-color-scheme: dark` matches. */
  dark: boolean;
}

/** One daisyUI theme block found in the chain. */
export interface ThemeBlock {
  name: string;
  isDefault: boolean;
  prefersDark: boolean;
  /** Whether daisyUI completes the block from the built-in theme of the same name. */
  builtIn: boolean;
  /** The chain file the block sits in. */
  file: ChainFile;
  rule: SheetRule;
}

/** One scheme: a named block and the root states that reach it. */
export interface Scheme {
  block: ThemeBlock;
  /** Each state, with a phrase naming it in a finding. */
  states: { state: RootState; label: string }[];
}

/** One custom-property declaration in the cascade. */
interface Candidate {
  property: string;
  value: string;
  important: boolean;
  /** Layer position, lowest first; unlayered sits above every layer. */
  layer: number;
  specificity: [number, number, number];
  order: number;
  applies(state: RootState): boolean;
}

/** A selector alternative that can match the root, and its specificity. */
interface RootMatcher {
  applies(state: RootState): boolean;
  specificity: [number, number, number];
}

const DAISY_THEME_BLOCK = /^@plugin\s+(["'])daisyui\/theme\1$/;
/** The daisyUI plugin options, which are not custom properties of the theme. */
const BLOCK_OPTIONS = new Set(['name', 'default', 'prefersdark', 'color-scheme', 'root']);
/** Tailwind's own layer order; any other layer sorts after these, in order of first appearance. */
const KNOWN_LAYERS = ['theme', 'base', 'components', 'utilities'];
const UNLAYERED = 1000;
const IMPORTANT = /\s*!\s*important\s*$/i;

function unquote(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(["'])(.*)\1$/, '$2');
}

function add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function compareSpecificity(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** The index just past the parenthesis matching the one at `open`, or -1. */
function closeParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** A selector list's alternatives parsed as root matchers, or null when any alternative is not one. */
function rootList(list: string): RootMatcher[] | null {
  const matchers: RootMatcher[] = [];
  for (const alternative of splitSelectorList(list)) {
    const matcher = rootMatcher(alternative);
    if (!matcher) return null;
    matchers.push(matcher);
  }
  return matchers;
}

/**
 * A compound selector that can match the root element, or null when some part of it describes
 * another element (a combinator, a class, another attribute, a pseudo-class this model does not read).
 */
export function rootMatcher(selector: string): RootMatcher | null {
  const text = selector.trim();
  const tests: ((state: RootState) => boolean)[] = [];
  let specificity: [number, number, number] = [0, 0, 0];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let match: RegExpExecArray | null;
    if ((match = /^:(?:root|host)(?![\w(-])/i.exec(rest))) {
      specificity = add(specificity, [0, 1, 0]);
      i += match[0].length;
      continue;
    }
    if (i === 0 && (match = /^html(?![\w-])/i.exec(rest))) {
      specificity = add(specificity, [0, 0, 1]);
      i += match[0].length;
      continue;
    }
    if (rest[0] === '*') {
      i += 1;
      continue;
    }
    if ((match = /^\[\s*data-theme\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([\w-]+))\s*)?\]/i.exec(rest))) {
      const wanted = match[1] ?? match[2] ?? match[3];
      tests.push(wanted === undefined ? (state) => state.theme !== null : (state) => state.theme === wanted);
      specificity = add(specificity, [0, 1, 0]);
      i += match[0].length;
      continue;
    }
    if ((match = /^:(not|is|where)\(/i.exec(rest))) {
      const open = i + match[0].length - 1;
      const end = closeParen(text, open);
      if (end === -1) return null;
      const inner = rootList(text.slice(open + 1, end - 1));
      if (!inner || inner.length === 0) return null;
      const kind = match[1].toLowerCase();
      const any = (state: RootState) => inner.some((m) => m.applies(state));
      tests.push(kind === 'not' ? (state) => !any(state) : any);
      if (kind !== 'where') {
        const widest = inner.map((m) => m.specificity).sort(compareSpecificity).at(-1) ?? [0, 0, 0];
        specificity = add(specificity, widest);
      }
      i = end;
      continue;
    }
    return null;
  }
  if (i === 0) return null;
  return { applies: (state) => tests.every((test) => test(state)), specificity };
}

/** Whether a rule's enclosing conditions hold in a state, and the layer it sits in. */
function context(conditions: string[], layerOf: (name: string) => number): { applies(state: RootState): boolean; layer: number } | null {
  let layer = UNLAYERED;
  const tests: ((state: RootState) => boolean)[] = [];
  for (const raw of conditions) {
    const condition = raw.trim();
    const layered = /^@layer\s+([\w.-]+)\s*$/i.exec(condition);
    if (layered) {
      if (layer === UNLAYERED) layer = layerOf(layered[1].split('.')[0]);
      continue;
    }
    if (/^@supports\b/i.test(condition)) continue;
    const media = /^@media\s+(.+)$/i.exec(condition);
    if (media) {
      const scheme = /^\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)$/i.exec(media[1].trim());
      if (!scheme) return null;
      const wantDark = scheme[1].toLowerCase() === 'dark';
      tests.push((state) => state.dark === wantDark);
      continue;
    }
    return null;
  }
  return { applies: (state) => tests.every((test) => test(state)), layer };
}

/** The layer rank of a layer name: Tailwind's four first, then any other in order of appearance. */
function layerRanker(): (name: string) => number {
  const others: string[] = [];
  return (name) => {
    const known = KNOWN_LAYERS.indexOf(name);
    if (known !== -1) return known;
    if (!others.includes(name)) others.push(name);
    return KNOWN_LAYERS.length + others.indexOf(name);
  };
}

/** The cascade the chain declares, and the daisyUI theme blocks in it. */
export interface ThemeCascade {
  blocks: ThemeBlock[];
  /** Every scheme, one per named block, in the order the blocks appear. */
  schemes: Scheme[];
  /** What each custom property holds on the root in a state. */
  valuesIn(state: RootState): Map<string, string>;
}

/**
 * Read the chain's custom properties into a cascade, and its daisyUI theme blocks into schemes.
 * `builtInThemes` is daisyUI's own theme object, the values a block named after a built-in theme
 * is completed from.
 */
export function readThemeCascade(files: ChainFile[], builtInThemes: Record<string, Record<string, string>>): ThemeCascade {
  const candidates: Candidate[] = [];
  const blocks: ThemeBlock[] = [];
  const layerOf = layerRanker();
  let order = 0;
  const push = (
    property: string,
    raw: string,
    layer: number,
    specificity: [number, number, number],
    applies: (state: RootState) => boolean
  ) => {
    const important = IMPORTANT.test(raw);
    candidates.push({ property, value: raw.replace(IMPORTANT, '').trim(), important, layer, specificity, order: order++, applies });
  };

  for (const file of files) {
    for (const rule of file.sheet.rules) {
      const selector = rule.selector;
      if (DAISY_THEME_BLOCK.test(selector)) {
        const option = (name: string) => rule.declarations.find((d) => d.property === name)?.value;
        const name = unquote(option('name'));
        const rootOption = unquote(option('root'));
        if (name === '' || (rootOption !== '' && rootOption !== ':root')) continue;
        const builtIn = Object.hasOwn(builtInThemes, name);
        const block: ThemeBlock = {
          name,
          isDefault: unquote(option('default')) === 'true',
          prefersDark: unquote(option('prefersdark')) === 'true',
          builtIn,
          file,
          rule,
        };
        blocks.push(block);
        const values = new Map<string, string>();
        if (builtIn) {
          for (const [key, value] of Object.entries(builtInThemes[name])) if (key.startsWith('--')) values.set(key, String(value));
        }
        for (const decl of rule.declarations) {
          if (decl.property.startsWith('--') && !BLOCK_OPTIONS.has(decl.property)) values.set(decl.property, decl.value);
        }
        const base = layerOf('base');
        // daisyUI emits the dark-preference copy first, then the block's own selector list.
        if (block.prefersDark) {
          for (const [property, value] of values) push(property, value, base, [0, 2, 0], (s) => s.theme === null && s.dark);
        }
        if (block.isDefault) {
          for (const [property, value] of values) push(property, value, base, [0, 0, 0], () => true);
        }
        for (const [property, value] of values) push(property, value, base, [0, 1, 0], (s) => s.theme === name);
        continue;
      }
      if (/^@theme\b/i.test(selector)) {
        if (/^@theme\s+(?:[\w-]+\s+)*reference\b/i.test(selector)) continue;
        const where = context(rule.conditions, layerOf);
        if (!where) continue;
        for (const decl of rule.declarations) {
          if (decl.property.startsWith('--')) push(decl.property, decl.value, layerOf('theme'), [0, 1, 0], where.applies);
        }
        continue;
      }
      if (selector.startsWith('@')) continue;
      const custom = rule.declarations.filter((d) => d.property.startsWith('--'));
      if (custom.length === 0) continue;
      const where = context(rule.conditions, layerOf);
      if (!where) continue;
      for (const alternative of splitSelectorList(selector)) {
        const matcher = rootMatcher(alternative);
        if (!matcher) continue;
        for (const decl of custom) {
          push(decl.property, decl.value, where.layer, matcher.specificity, (s) => where.applies(s) && matcher.applies(s));
        }
      }
    }
  }

  const valuesIn = (state: RootState) => {
    const winners = new Map<string, Candidate>();
    for (const candidate of candidates) {
      if (!candidate.applies(state)) continue;
      const current = winners.get(candidate.property);
      if (!current || outranks(candidate, current)) winners.set(candidate.property, candidate);
    }
    return new Map([...winners].map(([property, candidate]) => [property, candidate.value]));
  };

  return { blocks, schemes: schemesOf(blocks), valuesIn };
}

/** Whether `a` beats `b` in the cascade: importance, then layer, then specificity, then order. */
function outranks(a: Candidate, b: Candidate): boolean {
  if (a.important !== b.important) return a.important;
  // Among important declarations an earlier layer wins, and a layered one beats an unlayered one.
  if (a.layer !== b.layer) return a.important ? a.layer < b.layer : a.layer > b.layer;
  const bySpecificity = compareSpecificity(a.specificity, b.specificity);
  if (bySpecificity !== 0) return bySpecificity > 0;
  return a.order > b.order;
}

/** One scheme per named block, each with the root states that reach it. */
function schemesOf(blocks: ThemeBlock[]): Scheme[] {
  const named: ThemeBlock[] = [];
  for (const block of blocks) if (!named.some((b) => b.name === block.name)) named.push(block);
  const defaultBlock = named.find((block) => block.isDefault);
  const darkBlock = named.find((block) => block.prefersDark) ?? defaultBlock;
  return named.map((block) => {
    const states: Scheme['states'] = [{ state: { theme: block.name, dark: false }, label: `with data-theme="${block.name}"` }];
    if (block === defaultBlock) states.push({ state: { theme: null, dark: false }, label: 'with no data-theme on a light OS' });
    if (block === darkBlock) states.push({ state: { theme: null, dark: true }, label: 'with no data-theme on a dark OS' });
    return { block, states };
  });
}
