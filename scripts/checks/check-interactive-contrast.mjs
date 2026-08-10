#!/usr/bin/env node
// cairn-cms: the interactive color-vs-background gate, graduated into the packaged cairn-audit
// engine's `interactive-contrast` rendered rule
// (src/lib/audit/rules/rendered/interactive-contrast.ts). The in-page probe this gate used to carry
// is gone, and with it the `rgb()`-only color parser at its center, which an adversarial pass
// demonstrated could not read a single one of cairn's oklch palette values: every themed candidate
// failed to parse and was dropped, so this gate had plausibly been passing VACUOUSLY, and its empty
// allowlist was the tell. The engine resolves colors by painting them on a canvas and reading the
// sRGB bytes back, so the browser answers the question no regex could.
//
// The no-drift proof for the graduation, run against the showcase preview on all 18 sitemap pages
// in both themes: old raw findings 0, new raw findings 0, zero deltas in either direction. Zero
// against zero is a weak proof on its own, so the detection half is proven by the engine's own
// browser regression suite
// (src/tests/unit/audit/rules/rendered/browser-regressions.test.ts), which drives real Chromium
// against the exact inputs the old implementation reported clean.
//
// This is a LIVE gate: it drives a real browser against a running preview server, so it needs
// BASE_URL (default http://localhost:4173, examples/showcase's `npm run preview` port) already
// answering; it is not part of `npm run check` for that reason. Run it with:
//   BASE_URL=http://localhost:4173 npm run check:interactive-contrast
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { resolvePages } from './live-probe-support.mjs';

const ROOT = repoRoot(import.meta.url);
const RULE_ID = 'interactive-contrast';

/**
 * Page+selector exemptions, the rendered allowlist's own shape. Empty, as
 * scripts/interactive-contrast-allowlist.json was when it folded in here: this gate has never had a
 * ratified exception. An entry naming a selector no page matches is reported as stale rather than
 * quietly doing nothing, so an empty list stays honest.
 * @type {{ page: string, selector: string, reason: string }[]}
 */
export const ALLOWLIST = [];

async function main() {
  try {
    const { DEFAULT_BASE_URL, exitCodeFor, formatReport, renderedRules, resolveConfig, runRendered } = await import(
      '../../dist/audit/index.js'
    );
    const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
    const rule = renderedRules().find((candidate) => candidate.id === RULE_ID);
    if (!rule) throw new Error(`the packaged engine registers no ${RULE_ID} rule`);

    const pages = await resolvePages(baseUrl, ['/styleguide']);
    const config = resolveConfig(ROOT, { rendered: { pages, allowlist: ALLOWLIST } }, () => true);
    const report = await runRendered(config, [rule]);
    console.log(formatReport(report));
    process.exitCode = exitCodeFor(report);
  } catch (err) {
    console.error(`check-interactive-contrast: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
