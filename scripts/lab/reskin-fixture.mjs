// cairn-cms: the re-skin fixture. It proves the headline B2 claim that editing only the documented N
// role values re-skins the whole surface and AA still holds, the field's only complete and gated
// re-skin recipe. Two theme cases run through the same `theme-contrast` measurement the live gate
// runs (`check:public-tokens`), read from the packaged audit in dist/audit, over the showcase's real
// import chain with the rewritten theme.css read in place of the file on disk:
//
//   1. The hue rotation. It rotates the `--color-primary` hue by a large amount in BOTH daisyUI theme
//      blocks (holding lightness and chroma, the contrast-stable recolor rule) and asserts every
//      pair in every scheme still clears AA.
//   2. The stripped inks. It deletes Waymark's four hand-tuned status inks from both daisyUI blocks,
//      so each ink falls back to the engine's derived default in cairn-public.css, and asserts every
//      pair in both schemes still clears AA. It prints that case's per-pair table.
//
// It also proves the prose reading surface has no second colour source: prose.css carries no colour
// literal, and every colour-bearing property reads a `--color-*`/`--cairn-*` token, so the prose
// re-skins from the same set at zero extra edits. That every referenced token is defined is
// `theme-conformance`'s resolution check, which `check:public-tokens` runs over the showcase.
//
// Wired as `npm run test:reskin`, which packages the engine first. It reads the showcase's installed
// engine and daisyUI, so the showcase's node_modules must be installed. Exits non-zero if either
// theme case drops or leaves unmeasured a pair, or prose holds a second colour source.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const THEME_CSS = resolve(ROOT, 'examples/showcase/src/theme/theme.css');
const PROSE_CSS = resolve(ROOT, 'examples/showcase/src/chassis/prose.css');
const SHOWCASE = resolve(ROOT, 'examples/showcase');

// A literal colour in CSS's literal colour syntaxes, the prose single-source check's own test.
// `oklch(` is matched with its trailing `c`, so the `color-mix(in oklab, <token>, ...)` colour-space
// keyword, which carries no literal, never matches. The `#hex` form matches 3, 4, 6, or 8 hex
// digits at a token boundary.
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\s*\(/;

/** The four status inks Waymark hand-tunes in each daisyUI block. */
const INK_OVERRIDE = /^[ \t]*--cairn-(?:success|warning|error|info)-ink:[^;]*;\n/gm;

// The hue rotation the fixture applies to the brand accent. A large turn (well past a hue step) makes
// the re-skin unmistakable while the contrast-stable recipe holds lightness and chroma fixed.
const HUE_ROTATION = 120;

/**
 * Rewrite the theme by rotating `--color-primary`'s hue by {@link HUE_ROTATION} in every daisyUI theme
 * block, holding lightness and chroma. This edits ONLY the documented brand-accent role, the headline
 * lever of the re-skin recipe; `--color-primary-content` and every other token are untouched, which is
 * exactly the recipe's promise. The regex matches `--color-primary:` (never `--color-primary-content:`,
 * which has more characters before the colon) and rewrites the third oklch term.
 * @param {string} css the contents of theme.css
 * @returns {{ rewritten: string, edits: number }}
 */
function rotatePrimaryHue(css) {
  let edits = 0;
  const rewritten = css.replace(
    /(--color-primary:\s*oklch\(\s*[\d.]+%?\s+[\d.]+\s+)([\d.]+)(\s*(?:\/[^)]*)?\))/g,
    (_match, head, hue, tail) => {
      edits += 1;
      const rotated = ((Number(hue) + HUE_ROTATION) % 360 + 360) % 360;
      return `${head}${rotated}${tail}`;
    },
  );
  return { rewritten, edits };
}

/**
 * Prove the prose reading surface has no second colour source: no colour literal, and every
 * colour-bearing property reads a `--color-*`/`--cairn-*` token. A line that assigns a colour property
 * yet references no such token (and is not a bare reset or keyword) is a second source.
 * @returns {string[]} the violation lines, empty when the prose reads only the tokens
 */
function checkProseSecondSource() {
  const lines = readFileSync(PROSE_CSS, 'utf8').split('\n');
  /** @type {string[]} */
  const violations = [];
  // The colour-bearing property declarations. `border`/`border-<side>` shorthands carry a colour;
  // the non-colour border longhands (radius, collapse, spacing, width, style, image) are excluded by
  // the negative lookahead, so a `border-radius: var(--radius-box)` is not mistaken for a colour.
  const colorProp = /(?:^|[\s{;])(?:color|background|background-color|border-color|(?:border|border-top|border-right|border-bottom|border-left)(?:-color)?|outline|outline-color|fill|accent-color|caret-color):(?!\s)/;
  const nonColorBorderLonghand = /(?:^|[\s{;])border-(?:radius|collapse|spacing|width|style|image):/;
  // A value that is a non-colour reset or keyword (a width-only border, transparent, inherit, etc.).
  const nonColorValue = /:\s*(?:0|none|inherit|transparent|currentColor)\s*;?\s*$/;

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (COLOR_LITERAL.test(line)) {
      violations.push(`prose.css:${i + 1}  colour literal (second source): ${line}`);
      return;
    }
    if (nonColorBorderLonghand.test(raw)) return;
    if (colorProp.test(raw) && !nonColorValue.test(raw)) {
      // The property carries a real colour; it must read a token. color-mix arguments read tokens too.
      if (!/var\(--(?:color|cairn)-/.test(raw)) {
        violations.push(`prose.css:${i + 1}  colour not from a token: ${line}`);
      }
    }
  });
  return violations;
}

/**
 * Delete Waymark's four hand-tuned status inks from both daisyUI theme blocks, so each falls back to
 * the engine's derived default.
 * @param {string} css the contents of theme.css
 * @returns {{ rewritten: string, edits: number }}
 */
function stripInks(css) {
  let edits = 0;
  const rewritten = css.replace(INK_OVERRIDE, () => {
    edits += 1;
    return '';
  });
  return { rewritten, edits };
}

/**
 * Measure theme-contrast over the showcase's import chain with `themeCss` read in place of
 * theme.css, through the packaged audit.
 * @param {any} audit the packaged audit's barrel
 * @param {string} themeCss
 */
function measure(audit, themeCss) {
  const fs = {
    /** @param {string} path */
    readText: (path) => (path === THEME_CSS ? themeCss : audit.nodeChainFs.readText(path)),
  };
  const chain = audit.loadImportChain(SHOWCASE, ['src/theme/theme.css'], fs);
  const { themes } = audit.loadDaisyThemeKeys(SHOWCASE, audit.nodePeers);
  return audit.measureThemeContrast(chain.files, themes);
}

/**
 * Report one theme case: a failing, unmeasured, or short scheme fails it.
 * @param {string} label
 * @param {any} measurement
 * @param {boolean} printTable
 * @param {(measurement: any) => string} formatContrastTable the packaged audit's table formatter
 * @returns {boolean} whether the case passed
 */
function reportCase(label, measurement, printTable, formatContrastTable) {
  if (printTable) {
    console.log('');
    console.log(formatContrastTable(measurement));
  }
  const counts = measurement.schemes.map((/** @type {any} */ scheme) => `"${scheme.name}" ${scheme.measured} of ${scheme.expected}`);
  const short = measurement.schemes.some((/** @type {any} */ scheme) => scheme.measured !== scheme.expected);
  console.log('');
  if (measurement.findings.length > 0 || short || measurement.schemes.length < 2) {
    console.error(`${label}: FAIL (${measurement.findings.length} finding(s); pairs measured per scheme: ${counts.join(', ')})`);
    for (const finding of measurement.findings) console.error(`  ${finding.message}`);
    return false;
  }
  console.log(`${label}: PASS (every pair clears AA in both sRGB and P3; pairs measured per scheme: ${counts.join(', ')})`);
  return true;
}

async function main() {
  let failed = false;
  const audit = await import('../../dist/audit/index.js');
  const original = readFileSync(THEME_CSS, 'utf8');

  // 1. The hue rotation.
  const rotated = rotatePrimaryHue(original);
  console.log(`Re-skin fixture: rotated --color-primary hue by ${HUE_ROTATION} in ${rotated.edits} theme block(s).`);
  if (rotated.edits < 2) {
    console.error(`Re-skin fixture: FAIL (expected to rotate the accent in both the light and dark block, edited ${rotated.edits}).`);
    failed = true;
  }
  if (!reportCase('Re-skin contrast (hue rotation)', measure(audit, rotated.rewritten), false, audit.formatContrastTable)) failed = true;

  // 2. The stripped inks.
  const stripped = stripInks(original);
  console.log('');
  console.log(`Re-skin fixture: stripped ${stripped.edits} hand-tuned status ink override(s) from the daisyUI blocks.`);
  if (stripped.edits !== 8) {
    console.error(`Re-skin fixture: FAIL (expected four ink overrides in each of the two blocks, stripped ${stripped.edits}).`);
    failed = true;
  }
  if (!reportCase('Re-skin contrast (stripped inks)', measure(audit, stripped.rewritten), true, audit.formatContrastTable)) failed = true;

  // 3. Prove the prose surface has no second colour source.
  const proseViolations = checkProseSecondSource();
  console.log('');
  if (proseViolations.length) {
    console.error('Prose single-source: FAIL (a prose colour does not read a token)');
    for (const v of proseViolations) console.error(`  ${v}`);
    failed = true;
  } else {
    console.log('Prose single-source: PASS (prose.css reads only --color-*/--cairn-* tokens; no second colour source)');
  }

  process.exit(failed ? 1 : 0);
}

main();
