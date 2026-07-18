#!/usr/bin/env node
// cairn-cms: the 390px touch-target probe, the second of the two numeric checks the 2026-07-17
// Waymark final design review audit banked
// (docs/internal/2026-07-17-waymark-final-design-review-audit.md). Every tap target (a link,
// button, form control, or `[role="button"]`) must render at least 44x44 CSS px at a 390px
// viewport (WCAG 2.5.8's AA target-size floor); an inline link inside running prose is exempt
// under the same success criterion, since the surrounding text carries the tappable area, not the
// link glyph alone.
//
// This is a LIVE probe: it drives a real browser against a running preview server, so it needs
// BASE_URL (default http://localhost:4173, examples/showcase's `npm run preview` port) already
// answering; it is not part of `npm run check` for that reason. Run it with:
//   BASE_URL=http://localhost:4173 npm run check:touch-targets
// Exceptions live by exact page+selector+reason in scripts/touch-target-allowlist.json beside this
// file, the same allowlist idiom check-invisible-craft.mjs's budget uses.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from './repo-root.mjs';
import { resolveBaseUrl, resolvePages, isAllowed, collectFindings } from './live-probe-support.mjs';

const ROOT = repoRoot(import.meta.url);
const ALLOWLIST_PATH = resolve(ROOT, 'scripts/touch-target-allowlist.json');
const VIEWPORT = { width: 390, height: 844 };
const TARGET_MIN = 44;

/**
 * Every tap target under 44x44 at the current viewport, evaluated in-page (Playwright serializes
 * this exact function, so it must stay self-contained: no references to anything outside its own
 * body).
 * @returns {{ selector: string, width: number, height: number, text: string }[]}
 */
function findSmallTouchTargets() {
  function signature(el) {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  }

  const findings = new Map();
  for (const el of document.querySelectorAll('a, button, [role="button"], input, select, summary')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    // WCAG 2.5.8's own exemption: an inline link inside running prose, where the surrounding text
    // carries the tappable area rather than the link glyph alone.
    if (style.display === 'inline' && el.tagName === 'A' && el.closest('article, .prose, p')) continue;
    if (rect.height < 44 || rect.width < 44) {
      const key = signature(el);
      const prior = findings.get(key);
      if (!prior || rect.height < prior.height) {
        findings.set(key, {
          selector: key,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
        });
      }
    }
  }
  return [...findings.values()];
}

async function main() {
  const baseUrl = await resolveBaseUrl();
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  const pages = await resolvePages(baseUrl, ['/about', '/styleguide']);

  // One 390px-phone context; the target-size floor is a mobile-layout concern.
  const results = await collectFindings({
    baseUrl,
    pages,
    contexts: [{ label: '', options: { viewport: VIEWPORT } }],
    evaluate: findSmallTouchTargets,
  });

  const failures = [];
  for (const { path, findings } of results) {
    for (const finding of findings) {
      if (isAllowed(allowlist, path, finding.selector)) continue;
      failures.push(`${path}: ${finding.selector} is ${finding.width}x${finding.height}px (need ${TARGET_MIN}x${TARGET_MIN}) "${finding.text}"`);
    }
  }

  if (failures.length) {
    console.error(`touch-targets: FAIL (${failures.length} target(s) under ${TARGET_MIN}x${TARGET_MIN}px at ${VIEWPORT.width}px)`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('touch-targets: PASS');
}

main().catch((err) => {
  console.error('touch-targets: crashed:', err);
  process.exit(1);
});
