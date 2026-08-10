// The exact-string, fail-loud substitution pass. It personalizes the baked Waymark template
// with the answered name, tagline, and brand color. Every target string below is verified
// against the real showcase (examples/showcase/src/theme/), not the plan's stale guess at a
// root-level site.config.yaml with a single --color-primary line: the template's actual layout
// has both files under src/theme/, and theme.css carries four brand declarations (a light and a
// dark block, each with a primary and a primary-content token), not one. A target that goes
// missing here means the showcase moved without this module following, so every lookup throws
// naming the file and the missing string rather than silently doing nothing: that throw is the
// rot gate against showcase drift, not an edge case to soften.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_CONFIG_RELATIVE = 'src/theme/site.config.yaml';
const THEME_CSS_RELATIVE = 'src/theme/theme.css';

const SITE_NAME_LINE = 'siteName: Waymark';

// The theme file's own re-skin recipe (its header comment) says: rotate the hue only, hold the
// lightness and chroma, so both the light and dark blocks keep the contrast they were tuned
// for. Matching each declaration's L and C individually (rather than replacing a fixed literal)
// is what lets one hue value drive all four lines without hardcoding their L/C here a second
// time, which would silently drift from the template's own numbers.
const OKLCH_DECLARATION = /(--color-primary(?:-content)?:[ \t]*oklch\([^%\n]+%[ \t]+\S+[ \t]+)(\d+(?:\.\d+)?)([ \t]*\);)/g;

/**
 * Convert one sRGB channel (0-255) to linear light, the first step of the CSS Color 4
 * sRGB-to-OKLCH conversion.
 * @param {number} c the channel value, 0-255
 * @returns {number} the linear-light channel value, 0-1
 */
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Convert a hex color to its OKLCH hue in degrees, via the CSS Color 4 sRGB to OKLab to OKLCH
 * pipeline. Only the hue is needed here since the substitution rotates hue and holds L/C.
 * @param {string} hex a `#rgb` or `#rrggbb` color, with or without the leading `#`
 * @returns {number} the hue in degrees, `[0, 360)`
 */
export function hexToOklchHue(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a hex color: ${hex}`);
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(h.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m2 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m2 + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m2 - 0.8086757660 * s;
  return ((Math.atan2(B, A) * 180 / Math.PI) % 360 + 360) % 360;
}

/**
 * Format a hue value for insertion into theme.css: at most two decimals, trailing zeros
 * trimmed, so `264.05` and `142.5` both read cleanly rather than as `264.050` or `142.50`.
 * @param {number} hue the hue in degrees
 * @returns {string} the formatted hue
 */
function formatHue(hue) {
  return String(Math.round(hue * 100) / 100);
}

/**
 * Resolve a brandColor answer to an OKLCH hue in degrees. Accepts a hex color, an
 * `oklch(...)` string (its third component is taken as the hue), or a bare number in
 * `[0, 360]`.
 * @param {string} brandColor the answered brand color
 * @returns {number} the resolved hue in degrees
 */
export function resolveHue(brandColor) {
  const trimmed = brandColor.trim();
  const oklchMatch = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+([\d.]+)\s*\)$/i.exec(trimmed);
  if (oklchMatch) return Number(oklchMatch[1]);
  // A bare digit string is always a hue, never a hex triplet: "120" and "248" are valid hues
  // that also happen to parse as three-digit hex, so the '#' prefix is what disambiguates a
  // hex color from a number, not the character class alone.
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^#/.test(trimmed)) return hexToOklchHue(trimmed);
  throw new Error(`brandColor is not a hex color, an oklch(...) string, or a bare number: ${brandColor}`);
}

/**
 * Replace the first occurrence of an exact target string in file content, throwing when it is
 * not found. The throw names both the file and the missing string, which is the whole point of
 * this pass: a silent no-op here would ship an unpersonalized field instead of surfacing that
 * the template moved out from under it.
 * @param {string} content the file's current content
 * @param {string} target the exact substring to find
 * @param {string} replacement the string to put in its place
 * @param {string} relativePath the file's path, relative to the scaffold root, named in the error
 * @returns {string} the content with the first occurrence of target replaced
 */
function replaceExact(content, target, replacement, relativePath) {
  const index = content.indexOf(target);
  if (index === -1) {
    throw new Error(`substitute: expected to find "${target}" in ${relativePath}, but it is missing`);
  }
  return content.slice(0, index) + replacement + content.slice(index + target.length);
}

/**
 * Read a target file, throwing a message that names it when it does not exist.
 * @param {string} absolutePath the file's absolute path
 * @param {string} relativePath the file's path, relative to the scaffold root, named in the error
 * @returns {Promise<string>} the file's content
 */
async function readTarget(absolutePath, relativePath) {
  try {
    return await readFile(absolutePath, 'utf8');
  } catch (cause) {
    if (cause.code === 'ENOENT') {
      throw new Error(`substitute: expected to find ${relativePath}, but it is missing`);
    }
    throw cause;
  }
}

/**
 * Personalize a scaffolded site: the display name and optional tagline in
 * `src/theme/site.config.yaml`, and (only when a brand color is given) the hue of all four
 * `--color-primary`/`--color-primary-content` declarations in `src/theme/theme.css`. Every
 * lookup is exact-string and fails loud, naming the file and the missing string, so the
 * template drifting out from under this module surfaces immediately rather than shipping a
 * scaffold with unpersonalized fields.
 * @param {string} dir the scaffold root
 * @param {{ name: string, tagline?: string, brandColor?: string }} answers the collected answers
 * @returns {Promise<string[]>} the repo-relative paths this pass changed
 */
export async function applySubstitutions(dir, { name, tagline, brandColor }) {
  const changed = [];

  const siteConfigPath = path.join(dir, SITE_CONFIG_RELATIVE);
  let siteConfig = await readTarget(siteConfigPath, SITE_CONFIG_RELATIVE);
  siteConfig = replaceExact(siteConfig, SITE_NAME_LINE, `siteName: ${name}`, SITE_CONFIG_RELATIVE);
  if (tagline) {
    siteConfig = replaceExact(
      siteConfig,
      `siteName: ${name}\n`,
      `siteName: ${name}\ntagline: ${tagline}\n`,
      SITE_CONFIG_RELATIVE,
    );
  }
  await writeFile(siteConfigPath, siteConfig);
  changed.push(SITE_CONFIG_RELATIVE);

  if (brandColor) {
    const themeCssPath = path.join(dir, THEME_CSS_RELATIVE);
    const themeCss = await readTarget(themeCssPath, THEME_CSS_RELATIVE);
    const hue = formatHue(resolveHue(brandColor));
    let replacements = 0;
    const rotated = themeCss.replace(OKLCH_DECLARATION, (_match, prefix, _oldHue, suffix) => {
      replacements += 1;
      return `${prefix}${hue}${suffix}`;
    });
    if (replacements === 0) {
      throw new Error(
        `substitute: expected to find a --color-primary declaration in ${THEME_CSS_RELATIVE}, but it is missing`,
      );
    }
    await writeFile(themeCssPath, rotated);
    changed.push(THEME_CSS_RELATIVE);
  }

  return changed;
}
