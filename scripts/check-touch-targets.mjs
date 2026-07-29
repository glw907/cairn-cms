#!/usr/bin/env node
// cairn-cms: the 390px touch-target gate, graduated into the packaged cairn-audit engine's
// `touch-targets` rendered rule (src/lib/audit/rules/rendered/touch-targets.ts). The in-page probe
// this gate used to carry is gone; the engine's rule adds the `::before` hit-area awareness the
// script never had, so a control widened by a real inset expansion stops tripping a floor it
// already clears.
//
// The no-drift proof for the graduation, run against the showcase preview on all 18 sitemap pages:
// old raw findings 0, new raw findings 5, no finding lost in the other direction. The five are one
// delta with one cause, and it is a fail-open in the OLD implementation dying. The script exempted
// a control parked off-canvas by comparing its rect against `window.innerHeight`, which on any page
// taller than one screenful exempts everything below the fold. On the showcase styleguide at a
// 390px viewport that is every tap target on the page, so the gate reported clean while its buttons
// render at 40px and 32px, and the four allowlist rows below had gone inert without anyone
// noticing. The engine's rule compares against document coordinates, which is what the exemption
// always meant, and the four rows come back to life matching exactly the controls they were written
// for. The fifth finding is new and real (below).
//
// scripts/touch-target-allowlist.json folded into ALLOWLIST here, entry for entry: the JSON's
// {page, selector, reason} rows are already the rendered allowlist's own shape. Geoff's ruling 1
// (Task 16b) then retired all five of them at once by moving the floor to 24x24, which every
// control they named clears; the empty list below records why, and the no-drift numbers in the
// paragraph above are the 44px bar's, kept as the graduation's own history.
//
// This is a LIVE gate: it drives a real browser against a running preview server, so it needs
// BASE_URL (default http://localhost:4173, examples/showcase's `npm run preview` port) already
// answering; it is not part of `npm run check` for that reason. Run it with:
//   BASE_URL=http://localhost:4173 npm run check:touch-targets
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './repo-root.mjs';
import { resolvePages } from './live-probe-support.mjs';

const ROOT = repoRoot(import.meta.url);
const RULE_ID = 'touch-targets';

/**
 * Page+selector exemptions, the rendered allowlist's own shape. Suppressions are counted and
 * printed by the report, and an entry naming a selector no page matches is itself an error, so a
 * row that stops meaning anything says so instead of hiding.
 *
 * EMPTY BY RULING, and that is the finished state, not a gap. Geoff's ruling 1 (Task 16b) dropped
 * the enforced floor from 44x44 to WCAG 2.5.8's AA 24x24, and every row here was written against
 * the old 44px bar. Four named DaisyUI stock controls whose own documented measurement (40px, 40px,
 * 40px, 32px) clears 24x24 on both axes. The fifth, the showcase theme's tag-filter chip, is inert
 * for the same reason, from the component's own source rather than a live measurement:
 * `.tag-filter__option` declares `min-height: 2.75rem` (44px) in
 * examples/showcase/src/routes/(site)/+page.svelte, and the width the row's reason recorded as its
 * failing dimension, 43.78px, is itself well past 24px. Both axes clear the ruled floor.
 *
 * Removed rather than carried, because nothing would ever have reported them: an allowlist entry
 * goes stale only when its SELECTOR matches nothing on the page (`resolveRenderedFindings` keys
 * staleness on `selectorsSeen`, never on whether the entry suppressed a finding), and every one of
 * these selectors still renders. A row that suppresses nothing is silent forever, so leaving one to
 * be found later is leaving it to rot.
 * @type {{ page: string, selector: string, reason: string }[]}
 */
export const ALLOWLIST = [];

async function main() {
  try {
    const { DEFAULT_BASE_URL, exitCodeFor, formatReport, renderedRules, resolveConfig, runRendered } = await import(
      '../dist/audit/index.js'
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
    console.error(`check-touch-targets: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
