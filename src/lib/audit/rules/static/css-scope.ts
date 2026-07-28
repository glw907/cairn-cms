// The shared iteration surface for cairn-audit's CSS-family static rules (token-colors,
// grammar-boundary, focus-parity, motion-band, reduced-motion): every CSS rule a component's own
// scoped <style> block or a config-named consumer CSS file declares, each carrying the absolute
// position (offset into the FULL file source, not the extracted style-block text) a Finding and
// the suppression idiom both need. A rule's own check() never touches the filesystem or re-parses
// CSS text itself; it reads this one generator and stays a pure function of the run's context.
//
// This generator does not itself know about a declared palette site (`config.paletteCssFiles`,
// config.ts): a palette declaration site still carries real structure (a transition, a selector)
// every other CSS-family rule legitimately polices, so only the one rule whose hazard model the
// declaration site trips, token-colors, filters it out of its own check.
import { parseSheet } from '../../sheet.js';
import type { SheetRule } from '../../sheet.js';
import type { StaticRuleContext } from '../../types.js';

/** One CSS rule found in the CSS-family scope, positioned against the file it came from. */
export interface CssScopeRule {
  /** Path as the report prints it, relative to the audited root. */
  file: string;
  /** The full source `rule.start`/`rule.end` are offsets into: the component file, or the CSS file. */
  source: string;
  /** The parsed rule, its `start`/`end` already absolute against `source`. */
  rule: SheetRule;
}

/**
 * Every CSS rule in the CSS-family scope, one at a time: each parsed component's own scoped
 * `<style>` block, and every standalone file `ctx.cssFiles` names. A component with no `<style>`
 * block, or a run with no named consumer CSS files, contributes nothing from that half; neither
 * is an error.
 */
export function* cssScopeRules(ctx: StaticRuleContext): Generator<CssScopeRule> {
  for (const file of ctx.files) {
    if (!file.styleBlock) continue;
    const base = file.styleBlock.start;
    for (const rule of parseSheet(file.styleBlock.source).rules) {
      yield {
        file: file.file,
        source: file.source,
        rule: { ...rule, start: rule.start + base, end: rule.end + base },
      };
    }
  }
  for (const cssFile of ctx.cssFiles ?? []) {
    for (const rule of parseSheet(cssFile.source).rules) {
      yield { file: cssFile.file, source: cssFile.source, rule };
    }
  }
}
