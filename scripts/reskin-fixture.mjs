// cairn-cms: the re-skin fixture. It proves the headline B2 claim that editing only the documented N
// role values re-skins the whole surface and AA still holds, the field's only complete and gated
// re-skin recipe.
//
// It copies theme.css, rotates the `--color-primary` hue by a large amount in BOTH the light and the
// dark theme block (holding lightness and chroma, the contrast-stable recolor rule), then runs the
// SAME dual-gamut contrast check the live gate runs (imported from check-public-tokens.mjs) on the
// rewritten theme and asserts every pair still clears AA. It also proves the prose reading surface has
// no second colour source: prose.css carries no colour literal, and every colour-bearing property
// reads a `--color-*`/`--cairn-*` token, so the prose re-skins from the same set at zero extra edits.
// Finally it proves every token the prose surface and the code ramp REFERENCE is actually defined: a
// reference that reads the right NAMESPACE but no real token (a `var(--color-info-ink)` where only
// `--cairn-info-ink` exists) passes the single-source prefix match yet resolves to nothing, so the
// resolution check is what turns a dangling reference into a red gate.
//
// Wired as `npm run test:reskin`. Exits non-zero if the rotated theme drops a pair, prose holds a
// second colour source, or a referenced token has no definition.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  checkThemeContrast,
  reportContrast,
  checkTokenResolution,
  COLOR_LITERAL,
} from './check-public-tokens.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THEME_CSS = resolve(ROOT, 'examples/showcase/src/lib/theme.css');
const PROSE_CSS = resolve(ROOT, 'examples/showcase/src/lib/prose.css');

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

function main() {
  let failed = false;

  // 1. Re-skin: copy theme.css to a temp file, rotate the brand accent in the copy, then run the
  //    same contrast gate against the rewritten file read back from disk, so the fixture validates the
  //    on-disk re-skinned theme, not just an in-memory string.
  const original = readFileSync(THEME_CSS, 'utf8');
  const { rewritten, edits } = rotatePrimaryHue(original);
  const dir = mkdtempSync(join(tmpdir(), 'cairn-reskin-'));
  const fixturePath = join(dir, 'theme.reskin.css');
  writeFileSync(fixturePath, rewritten, 'utf8');

  console.log(`Re-skin fixture: rotated --color-primary hue by ${HUE_ROTATION} in ${edits} theme block(s).`);
  if (edits < 2) {
    console.error(`Re-skin fixture: FAIL (expected to rotate the accent in both the light and dark block, edited ${edits}).`);
    failed = true;
  }

  const rows = checkThemeContrast(readFileSync(fixturePath, 'utf8'));
  const contrastPassed = reportContrast(
    rows,
    (n) => `Re-skin contrast: PASS (the hue-rotated theme clears AA on all ${n} pairs in both gamuts)`,
    (n) => `Re-skin contrast: FAIL (${n} pair(s) below AA after the hue rotation)`,
  );
  if (!contrastPassed) failed = true;

  // 2. Prove the prose surface has no second colour source.
  const proseViolations = checkProseSecondSource();
  console.log('');
  if (proseViolations.length) {
    console.error('Prose single-source: FAIL (a prose colour does not read a token)');
    for (const v of proseViolations) console.error(`  ${v}`);
    failed = true;
  } else {
    console.log('Prose single-source: PASS (prose.css reads only --color-*/--cairn-* tokens; no second colour source)');
  }

  // 3. Prove every token the prose surface and the code ramp reference is defined. The single-source
  //    check above only proves a colour reads SOME `--color-*`/`--cairn-*` token; a reference to a
  //    token that no block defines reads the right namespace yet resolves to nothing. This runs against
  //    the live on-disk theme and prose (the hue rotation changes only a value, never a token name).
  const dangling = checkTokenResolution(original, readFileSync(PROSE_CSS, 'utf8'));
  console.log('');
  if (dangling.length) {
    console.error(`Token resolution: FAIL (${dangling.length} reference(s) resolve to no definition)`);
    for (const d of dangling) console.error(`  ${d.source}: var(${d.token}) is referenced but never defined`);
    failed = true;
  } else {
    console.log('Token resolution: PASS (every var(--token) in prose.css and the code ramp is defined)');
  }

  process.exit(failed ? 1 : 0);
}

main();
