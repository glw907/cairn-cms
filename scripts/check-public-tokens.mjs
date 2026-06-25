// cairn-cms: the public-theme token gate (the bar's colour and accessibility CI-mechanical checks).
// Two checks, both must pass for the gate to pass:
//
//   (a) No literals. A showcase component (`.svelte`) or the prose reading surface (`prose.css`) must
//       carry no literal colour and no hard-coded absolute font-size; every colour reads a DaisyUI
//       role utility or a `--color-*`/`--cairn-*` token, and every type size reads a `--cairn-step-*`
//       token. theme.css is the token DEFINITION layer, so its oklch literals are correct and it is
//       excluded entirely. A violation anywhere else fails with the file, line, and offending text.
//
//   (b) Dual-gamut AA contrast. Every text-bearing role/`-content` and on-surface-ink pair, parsed
//       out of theme.css for both the light and the dark theme, must clear WCAG AA after clamping into
//       BOTH sRGB and display-p3; if either gamut drops below the threshold the pair fails. This is
//       strictly more than DaisyUI's sRGB-only check and proves a re-skin stays legible on wide-gamut
//       screens. The contrast core and the theme parser are exported so the re-skin fixture
//       (reskin-fixture.mjs) measures AA exactly the same way.
//
// Wired as `npm run check:public-tokens`. Exits non-zero on any literal violation or any failing pair.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, converter, toGamut, wcagLuminance } from 'culori';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOWCASE_SRC = resolve(ROOT, 'examples/showcase/src');
const THEME_CSS = resolve(ROOT, 'examples/showcase/src/lib/theme.css');

// ============================================================================
// (a) The no-literals grep.
// ============================================================================

// A literal colour in any of CSS's literal colour syntaxes. `oklch(` is matched with its trailing `c`
// so the legitimate `color-mix(in oklab, <token>, ...)` colour-space keyword (which carries no literal)
// is NOT flagged. A `var(--...)` reference and a DaisyUI/Tailwind semantic utility carry no literal and
// so never match. The `#hex` form matches 3, 4, 6, or 8 hex digits at a token boundary.
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\s*\(/;

// A hard-coded ABSOLUTE font-size: a Tailwind arbitrary text-size utility whose bracket holds a bare
// px or rem number (matched by ARBITRARY_FONT_SIZE), or a `font-size:` declaration whose value is an
// absolute length literal (FONT_SIZE_DECL). The named type-step tokens are the allowed type layer: a
// `font-size: var(--cairn-step-N)`, and the length-utility form that wraps a token rather than a bare
// number, both read the scale and are not flagged. A relative em / percent / ch multiplier scales off
// the token-driven context rather than escaping the fluid scale (the inline-code chip at 0.88em), so
// it is not an absolute-size violation; the bar's two examples are both absolute, which this follows.
//
// The pattern literals below are written so Tailwind's content scanner does not extract them as
// candidate utility classes (a complete arbitrary-value token in a comment would otherwise be
// compiled into the admin sheet); each character class keeps the regex from reading as a real class.
const ARBITRARY_FONT_SIZE = /text-\[[0-9.]+(?:px|rem|pt|cm|in|pc|q)\]/;
const FONT_SIZE_DECL = /font-size:\s*[^;]*\b[0-9.]+(?:px|rem|pt|cm|in|pc|q)\b/;

/**
 * Every `.svelte` file and `prose.css` under a directory, recursively. theme.css is the token
 * definition layer and is excluded by name (it is the one file allowed to hold oklch literals).
 * @param {string} dir
 * @returns {string[]}
 */
function scannedFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...scannedFiles(full));
    } else if ((name.endsWith('.svelte') || name === 'prose.css') && name !== 'theme.css') {
      out.push(full);
    }
  }
  return out;
}

/**
 * Scan one file for a literal colour or a hard-coded absolute font-size, returning a violation per
 * matching line. The whole line is reported as the offending text so the location is unambiguous.
 * @param {string} file an absolute path
 * @returns {{ file: string, line: number, rule: string, text: string }[]}
 */
function scanFile(file) {
  /** @type {{ file: string, line: number, rule: string, text: string }[]} */
  const violations = [];
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const rel = relative(ROOT, file);
    if (COLOR_LITERAL.test(line)) {
      violations.push({ file: rel, line: i + 1, rule: 'literal colour', text: line.trim() });
    }
    if (ARBITRARY_FONT_SIZE.test(line) || FONT_SIZE_DECL.test(line)) {
      violations.push({ file: rel, line: i + 1, rule: 'hard-coded font-size', text: line.trim() });
    }
  });
  return violations;
}

/**
 * The no-literals check over every scanned showcase file. Pure: returns the violations, does not exit.
 * @returns {{ file: string, line: number, rule: string, text: string }[]}
 */
export function checkNoLiterals() {
  return scannedFiles(SHOWCASE_SRC).flatMap(scanFile);
}

// ============================================================================
// (b) The dual-gamut AA contrast check.
// ============================================================================

const toRgb = converter('rgb');
// Gamut clampers that hold oklch lightness and hue and reduce chroma until the colour fits the target
// gamut. Clamping in oklch preserves the designed lightness, which is what drives WCAG luminance.
const clampToSrgb = toGamut('rgb', 'oklch');
const clampToP3 = toGamut('p3', 'oklch');

/**
 * The WCAG relative luminance of an sRGB colour, each channel clipped to [0, 1] first. A colour
 * outside sRGB (legal in p3) yields sRGB coordinates that can exceed the unit range; a real display
 * clips them, so luminance reads off the clipped render, not the raw conversion.
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {number}
 */
function clippedLuminance(rgb) {
  const clip = (/** @type {number} */ x) => Math.min(1, Math.max(0, x));
  return wcagLuminance({ mode: 'rgb', r: clip(rgb.r), g: clip(rgb.g), b: clip(rgb.b) });
}

/**
 * The WCAG contrast ratio between two relative luminances.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function contrastRatio(a, b) {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The dual-gamut WCAG contrast of a foreground over a background, both as oklch strings: the ratio
 * after clamping into sRGB, and the ratio after clamping into display-p3.
 * @param {string} fg
 * @param {string} bg
 * @returns {{ srgb: number, p3: number }}
 */
export function dualGamutRatio(fg, bg) {
  const f = parse(fg);
  const b = parse(bg);
  if (!f) throw new Error(`cannot parse colour ${fg}`);
  if (!b) throw new Error(`cannot parse colour ${bg}`);
  const srgb = contrastRatio(
    clippedLuminance(toRgb(clampToSrgb(f))),
    clippedLuminance(toRgb(clampToSrgb(b))),
  );
  const p3 = contrastRatio(
    clippedLuminance(toRgb(clampToP3(f))),
    clippedLuminance(toRgb(clampToP3(b))),
  );
  return { srgb, p3 };
}

/**
 * Read one custom property's oklch value out of a CSS block body. Returns null when absent, so a
 * caller reports a missing token rather than silently skipping a pair.
 * @param {string} block
 * @param {string} prop the property name without the leading `--`
 * @returns {string | null}
 */
function readOklch(block, prop) {
  const escaped = prop.replace(/-/g, '\\-');
  const m = block.match(new RegExp(`--${escaped}:\\s*(oklch\\([^;]*\\))`));
  return m ? m[1].trim() : null;
}

/**
 * The body of the `@plugin "daisyui/theme"` block whose `name:` matches. theme.css carries two such
 * blocks (the light `cairn` and the dark `cairn-dark`); this isolates one.
 * @param {string} css
 * @param {string} name
 * @returns {string}
 */
function daisyThemeBlock(css, name) {
  const re = /@plugin\s+"daisyui\/theme"\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (new RegExp(`name:\\s*"${name}"`).test(m[1])) return m[1];
  }
  throw new Error(`theme block "${name}" not found in theme.css`);
}

/**
 * The first `:root { ... }` block body: the constant tokens and the light on-surface inks.
 * @param {string} css
 * @returns {string}
 */
function rootBlock(css) {
  const m = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!m) throw new Error(':root block not found in theme.css');
  return m[1];
}

/**
 * The `@media (prefers-color-scheme: dark) { :root { ... } }` body: the dark on-surface inks.
 * @param {string} css
 * @returns {string}
 */
function darkMediaRoot(css) {
  const m = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\n\s*\}/);
  if (!m) throw new Error('dark prefers-color-scheme :root block not found in theme.css');
  return m[1];
}

// The role tokens read from each daisyUI theme block, and the on-surface ink tokens read from the
// :root / dark-media blocks. The pairs below reference these names.
const ROLE_TOKENS = [
  'color-base-100',
  'color-base-content',
  'color-primary',
  'color-primary-content',
  'color-secondary',
  'color-secondary-content',
  'color-neutral',
  'color-neutral-content',
  'color-success',
  'color-success-content',
  'color-warning',
  'color-warning-content',
  'color-error',
  'color-error-content',
  'color-info',
  'color-info-content',
];
const INK_TOKENS = [
  'cairn-muted',
  'cairn-success-ink',
  'cairn-warning-ink',
  'cairn-error-ink',
  'cairn-info-ink',
];

/**
 * Parse theme.css into the two themes' colour tokens. Each theme carries its role tokens (the daisyUI
 * block) and its on-surface inks (light inks on :root, dark inks under the prefers-color-scheme media
 * query), so a pair measures against the right base.
 * @param {string} css the contents of theme.css
 * @returns {{ light: Record<string, string>, dark: Record<string, string> }}
 */
export function parseThemeTokens(css) {
  const lightRoles = daisyThemeBlock(css, 'cairn');
  const darkRoles = daisyThemeBlock(css, 'cairn-dark');
  const rootInks = rootBlock(css);
  const darkInks = darkMediaRoot(css);

  /** @param {string} roleBlock @param {string} inkBlock */
  function collect(roleBlock, inkBlock) {
    /** @type {Record<string, string>} */
    const out = {};
    for (const name of ROLE_TOKENS) {
      const v = readOklch(roleBlock, name);
      if (!v) throw new Error(`missing role token --${name}`);
      out[name] = v;
    }
    for (const name of INK_TOKENS) {
      const v = readOklch(inkBlock, name);
      if (!v) throw new Error(`missing ink token --${name}`);
      out[name] = v;
    }
    return out;
  }

  return { light: collect(lightRoles, rootInks), dark: collect(darkRoles, darkInks) };
}

/**
 * The text-bearing pairs for one theme, each with its AA threshold. `base-100` is the page paper for
 * on-surface text; every `-content` token is checked on its own fill, where it is actually painted.
 * `primary on base-100` doubles as the focus ring (3:1 non-text) and is gated at the stricter 4.5.
 * @param {Record<string, string>} t a theme's tokens from {@link parseThemeTokens}
 * @returns {{ label: string, fg: string, bg: string, threshold: number }[]}
 */
export function themePairs(t) {
  const base = t['color-base-100'];
  return [
    { label: 'base-content on base-100', fg: t['color-base-content'], bg: base, threshold: 4.5 },
    { label: 'muted ink on base-100', fg: t['cairn-muted'], bg: base, threshold: 4.5 },
    { label: 'success ink on base-100', fg: t['cairn-success-ink'], bg: base, threshold: 4.5 },
    { label: 'warning ink on base-100', fg: t['cairn-warning-ink'], bg: base, threshold: 4.5 },
    { label: 'error ink on base-100', fg: t['cairn-error-ink'], bg: base, threshold: 4.5 },
    { label: 'info ink on base-100', fg: t['cairn-info-ink'], bg: base, threshold: 4.5 },
    { label: 'primary on base-100 (link/ring)', fg: t['color-primary'], bg: base, threshold: 4.5 },
    { label: 'primary-content on primary', fg: t['color-primary-content'], bg: t['color-primary'], threshold: 4.5 },
    { label: 'secondary-content on secondary', fg: t['color-secondary-content'], bg: t['color-secondary'], threshold: 4.5 },
    { label: 'neutral-content on neutral', fg: t['color-neutral-content'], bg: t['color-neutral'], threshold: 4.5 },
    { label: 'success-content on success', fg: t['color-success-content'], bg: t['color-success'], threshold: 4.5 },
    { label: 'warning-content on warning', fg: t['color-warning-content'], bg: t['color-warning'], threshold: 4.5 },
    { label: 'error-content on error', fg: t['color-error-content'], bg: t['color-error'], threshold: 4.5 },
    { label: 'info-content on info', fg: t['color-info-content'], bg: t['color-info'], threshold: 4.5 },
  ];
}

/**
 * Run the dual-gamut contrast check over both themes parsed from a theme.css string. One row per
 * pair (theme, label, the two ratios, the threshold, pass). Pure: no I/O, never exits, so the re-skin
 * fixture reuses it on a rewritten theme.
 * @param {string} css the contents of theme.css
 * @returns {{ theme: string, label: string, srgb: number, p3: number, threshold: number, pass: boolean }[]}
 */
export function checkThemeContrast(css) {
  const themes = parseThemeTokens(css);
  /** @type {{ theme: string, label: string, srgb: number, p3: number, threshold: number, pass: boolean }[]} */
  const rows = [];
  /** @type {[string, Record<string, string>][]} */
  const ordered = [
    ['light', themes.light],
    ['dark', themes.dark],
  ];
  for (const [name, tokens] of ordered) {
    for (const pair of themePairs(tokens)) {
      const { srgb, p3 } = dualGamutRatio(pair.fg, pair.bg);
      rows.push({
        theme: name,
        label: pair.label,
        srgb,
        p3,
        threshold: pair.threshold,
        pass: srgb >= pair.threshold && p3 >= pair.threshold,
      });
    }
  }
  return rows;
}

/**
 * Format the contrast rows as an aligned console table. The re-skin fixture prints the same shape, so
 * a developer reads one table whether the run is the live theme or the rewritten one.
 * @param {ReturnType<typeof checkThemeContrast>} rows
 * @returns {string}
 */
export function formatContrastTable(rows) {
  const head = `${'THEME'.padEnd(6)} ${'PAIR'.padEnd(34)} ${'sRGB'.padStart(7)} ${'P3'.padStart(7)}  AA   RESULT`;
  const body = rows.map(
    (r) =>
      `${r.theme.padEnd(6)} ${r.label.padEnd(34)} ${r.srgb.toFixed(2).padStart(7)} ${r.p3.toFixed(2).padStart(7)}  ${r.threshold.toFixed(1)}  ${r.pass ? 'PASS' : 'FAIL'}`,
  );
  return [head, ...body].join('\n');
}

// ============================================================================
// Runner.
// ============================================================================

function main() {
  let failed = false;

  // (a) No literals.
  const violations = checkNoLiterals();
  if (violations.length) {
    console.error('No-literals check: FAIL');
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.text}`);
    }
    failed = true;
  } else {
    console.log('No-literals check: PASS (no literal colour or hard-coded font-size in components or prose.css)');
  }

  // (b) Dual-gamut AA contrast.
  const css = readFileSync(THEME_CSS, 'utf8');
  const rows = checkThemeContrast(css);
  console.log('');
  console.log(formatContrastTable(rows));
  const failures = rows.filter((r) => !r.pass);
  if (failures.length) {
    console.error('');
    console.error(`Contrast check: FAIL (${failures.length} pair(s) below AA in at least one gamut)`);
    for (const r of failures) {
      console.error(`  ${r.theme} ${r.label}: sRGB ${r.srgb.toFixed(2)}, P3 ${r.p3.toFixed(2)} (need ${r.threshold.toFixed(1)})`);
    }
    failed = true;
  } else {
    console.log('');
    console.log(`Contrast check: PASS (${rows.length} pairs clear AA in both sRGB and P3)`);
  }

  process.exit(failed ? 1 : 0);
}

// Run only when invoked directly, so reskin-fixture.mjs can import the exports without triggering it.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
