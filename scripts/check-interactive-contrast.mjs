#!/usr/bin/env node
// cairn-cms: the interactive color-vs-background probe, one of the two numeric checks the
// 2026-07-17 Waymark final design review audit banked
// (docs/internal/2026-07-17-waymark-final-design-review-audit.md). Every interactive text element
// (a link, a button, a form control, or anything styled with `cursor: pointer`) gets its computed
// text color contrasted against its own composited background; a ratio below 1.5 means the text
// reads as nearly invisible against its own ground, the ecxc invisible-CTA lesson (a control that
// technically renders but reads as blank until hovered or selected). This is deliberately looser
// than the WCAG text-contrast floor (4.5/3.0): it is not proving legibility, only that the control
// is not accidentally camouflaged against itself.
//
// This is a LIVE probe: it drives a real browser against a running preview server, so it needs
// BASE_URL (default http://localhost:4173, examples/showcase's `npm run preview` port) already
// answering; it is not part of `npm run check` for that reason. Run it with:
//   BASE_URL=http://localhost:4173 npm run check:interactive-contrast
// Exceptions live by exact page+selector+reason in scripts/interactive-contrast-allowlist.json
// beside this file, the same allowlist idiom check-invisible-craft.mjs's budget uses.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-root.mjs';
import { resolveBaseUrl, resolvePages, isAllowed, collectFindings } from './live-probe-support.mjs';

const ROOT = repoRoot(import.meta.url);
const ALLOWLIST_PATH = resolve(ROOT, 'scripts/interactive-contrast-allowlist.json');
const RATIO_FLOOR = 1.5;
// A fixed desktop viewport keeps the measured element set stable across runs; the audit that
// seeded this gate measured at 1440.
const VIEWPORT = { width: 1440, height: 900 };

/**
 * Every interactive text element on the current page whose own text color barely clears its
 * composited background, evaluated in-page (Playwright serializes this exact function, so it must
 * stay self-contained: no references to anything outside its own body).
 * @returns {{ selector: string, ratio: number, text: string, color: string, background: string }[]}
 */
function findInvisibleInteractiveText() {
  /**
   * @param {string} value a CSS `rgb()`/`rgba()` computed-style string
   * @returns {{ r: number, g: number, b: number, a: number } | null}
   */
  function parseColor(value) {
    const m = value.match(/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  /** Alpha-composite `fg` over `bg`, both `{ r, g, b, a }`. */
  function composite(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 255, g: 255, b: 255, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  }
  /** The effective background an element paints on, composited from the root down its ancestor
   *  chain (a transparent element shows whatever is behind it). */
  function effectiveBackground(el) {
    let bg = { r: 255, g: 255, b: 255, a: 0 };
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(n);
    for (const n of chain.reverse()) {
      const c = parseColor(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) bg = composite(c, bg);
    }
    return bg.a === 0 ? { r: 255, g: 255, b: 255, a: 1 } : bg;
  }
  function luminance(c) {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }
  function contrastRatio(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  function signature(el) {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  }

  const findings = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let el = walker.nextNode();
  while (el) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const isInteractive = el.matches('a, button, [role="button"], input, select, textarea, summary') || style.cursor === 'pointer';
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (
      isInteractive &&
      hasOwnText &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    ) {
      const fg = parseColor(style.color);
      if (fg) {
        const bg = effectiveBackground(el);
        const ratio = contrastRatio(composite(fg, bg), bg);
        if (ratio < RATIO_FLOOR) {
          const key = signature(el);
          findings.set(key, {
            selector: key,
            ratio: Number(ratio.toFixed(2)),
            text: el.textContent.trim().slice(0, 60),
            color: style.color,
            background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          });
        }
      }
    }
    el = walker.nextNode();
  }
  return [...findings.values()];
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  const pages = await resolvePages(baseUrl, ['/about', '/styleguide']);

  // Both schemes, since a control camouflaged against its own ground can differ light vs dark.
  const results = await collectFindings({
    baseUrl,
    pages,
    contexts: [
      { label: 'light', options: { colorScheme: 'light', viewport: VIEWPORT } },
      { label: 'dark', options: { colorScheme: 'dark', viewport: VIEWPORT } },
    ],
    evaluate: findInvisibleInteractiveText,
  });

  const failures = [];
  for (const { label, path, findings } of results) {
    for (const finding of findings) {
      if (isAllowed(allowlist, path, finding.selector)) continue;
      failures.push(
        `${label} ${path}: ${finding.selector} ratio ${finding.ratio} (color ${finding.color} on ${finding.background}) "${finding.text}"`,
      );
    }
  }

  if (failures.length) {
    console.error(`interactive-contrast: FAIL (${failures.length} interactive element(s) below ratio ${RATIO_FLOOR})`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('interactive-contrast: PASS');
}

main().catch((err) => {
  console.error('interactive-contrast: crashed:', err);
  process.exit(1);
});
