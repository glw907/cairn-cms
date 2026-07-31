// cairn-audit's one-filled-action rule: at most one accent-filled control competes for attention on
// any one surface. A surface is the topmost open layer (a native <dialog> or a [role="dialog"] wins
// over the page beneath it, which contributes nothing while the layer is open), partitioned further
// by the <nav> and <aside> landmarks a layer carries: a filled Publish button in <main> and a filled
// New button in <nav> are on different surfaces and both stand. This is the ratified register rule
// ("the portal's first filled button"), made mechanical.
//
// The partition RULING (Geoff, 2026-07-30, SETTLED, not re-litigated): <nav> and <aside> partition;
// the topmost open dialog layer partitions; <header>, <footer>, and <main> itself do NOT. The rule
// exists to stop two controls both claiming to be the action, and a DOM boundary between a page
// header and the card beneath it removes none of that harm, same visual column, same first look. A
// nav rail genuinely does remove it: persistent chrome, its own ground, its own spatial zone, read
// by an editor as a different part of the screen entirely. The landmark set narrowed from
// `main, nav, aside, header, footer` to `nav, aside` for exactly this reason; the topmost-open-dialog
// logic is unchanged. The consequence, applied to cairn's own screens: a filled header action above
// a filled card action is now two primaries on one surface by definition, and the fix is to demote
// the non-primary fill to ghost, never to loosen this rule to pass a screen.
//
// "Filled" means the ACCENT fill, read off the live computed style rather than a class-name guess,
// since a class scan cannot tell a real fill from a class an override later neutralizes. The
// sanctioned ink fills (the ink-opener buttons, PageHeader's ink New) are exempt by construction:
// they resolve `--color-neutral`, not `--color-primary`, so this rule never has to special-case
// them by name.
//
// Two failures an adversarial pass demonstrated, both closed here and both fixture-covered in
// browser-regressions.test.ts. The first build read the accent off a scratch element appended to
// `document.body`, but `--color-primary` is declared on the `[data-theme]` wrapper INSIDE body (the
// load-bearing rule in the admin design system), so `var(--color-primary)` was invalid at
// computed-value time and the accent resolved to `rgba(0, 0, 0, 0)`. Every accent fill went
// unseen, and every ghost button, whose background really is transparent, was flagged instead. The
// accent is now read off each control's OWN computed style, where the custom property has
// inherited, so no probe placement can desync from the element being judged. The second was a
// plain string compare against a computed color, which cannot survive a transition frame or a
// control reaching the same paint through `color-mix`; both sides now go through the shared canvas
// normalizer.
import { resolveColors } from '../../rendered.js';
import { indeterminateFinding, sameColor } from '../../color.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** One control the in-page walk found, with the two colors the rule has to compare. */
interface FilledCandidate {
  selector: string;
  surface: string;
  /** The control's own computed `background-color`, unparsed. */
  background: string;
  /** `--color-primary` as it inherits onto this control, unparsed; empty when the theme is absent. */
  accent: string;
}

/**
 * Walks the live page and reports every rendered control with the two raw colors that decide
 * whether it is accent-filled. Playwright serializes this into the page, so it stays
 * self-contained: every helper is nested and no constant is referenced from module scope. The
 * first build of this rule broke that rule four ways and threw `ReferenceError` on every page it
 * ever ran against, which is why the browser regression suite now executes it for real.
 */
function collectFilledCandidates(): FilledCandidate[] {
  const CONTROL_SELECTOR = 'button, [role="button"], a.btn, input[type="submit"], input[type="button"]';
  // Design ratchet Task 4: narrowed from `main, nav, aside, header, footer` to just the two
  // landmarks the ruling above holds actually partition. `main` and `header`/`footer` no longer
  // separate a surface, so a control's surface falls through to the layer id unless it sits inside
  // a nav or aside.
  const LANDMARK_SELECTOR = 'nav, aside';

  function isRendered(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function selectorFor(el: Element): string {
    const id = el.id ? `#${el.id}` : '';
    const classes = Array.from(el.classList).slice(0, 3).join('.');
    return `${el.tagName.toLowerCase()}${id}${classes ? `.${classes}` : ''}`;
  }

  const openLayers = Array.from(document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')).filter(
    isRendered
  );
  const layerRoot: Element = openLayers.length > 0 ? openLayers[openLayers.length - 1] : document.body;
  const layerId = openLayers.length === 0 ? 'body' : selectorFor(layerRoot);

  function surfaceFor(el: Element): string {
    const landmark = el.closest(LANDMARK_SELECTOR);
    // A landmark ABOVE the current layer (an enclosing <main> a dialog happens to be nested inside)
    // does not partition the dialog's own surface; `contains` is false for an ancestor, so this
    // falls through to the layer id in exactly that case.
    if (landmark && layerRoot.contains(landmark)) return landmark.tagName.toLowerCase();
    return layerId;
  }

  const candidates: FilledCandidate[] = [];
  for (const el of layerRoot.querySelectorAll(CONTROL_SELECTOR)) {
    if (!isRendered(el)) continue;
    const style = getComputedStyle(el);
    candidates.push({
      selector: selectorFor(el),
      surface: surfaceFor(el),
      background: style.backgroundColor,
      accent: style.getPropertyValue('--color-primary').trim(),
    });
  }
  return candidates;
}

export const oneFilledAction: RenderedRule = {
  id: 'one-filled-action',
  tier: 'error',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    const candidates = await ctx.page.evaluate(collectFilledCandidates);
    if (candidates.length === 0) return [];

    // A page carrying controls but no resolvable accent is a page this rule cannot judge. Saying so
    // beats returning an empty list, which is exactly how the first build read as clean.
    const unthemed = candidates.filter((candidate) => candidate.accent === '');
    if (unthemed.length === candidates.length) {
      return [
        indeterminateFinding(
          'one-filled-action',
          candidates[0].surface,
          'no --color-primary inherits onto any control here, so "accent-filled" has no value to compare against'
        ),
      ];
    }

    const colors = await resolveColors(ctx.page, [
      ...candidates.map((candidate) => candidate.background),
      ...candidates.map((candidate) => candidate.accent),
    ]);
    const backgrounds = colors.slice(0, candidates.length);
    const accents = colors.slice(candidates.length);

    const bySurface = new Map<string, string[]>();
    candidates.forEach((candidate, index) => {
      const background = backgrounds[index];
      const accent = accents[index];
      // A color the normalizer refused is a color the browser could not paint either, so it is not
      // the accent fill. Both sides come through the same normalizer, which is what makes treating
      // a refusal as "not accent-filled" a verdict rather than a skipped check.
      if (!background || !accent || accent.a === 0) return;
      if (!sameColor(background, accent)) return;
      const controls = bySurface.get(candidate.surface) ?? [];
      controls.push(candidate.selector);
      bySurface.set(candidate.surface, controls);
    });

    return [...bySurface.entries()]
      .filter(([, controls]) => controls.length > 1)
      .map(([surface, controls]) => ({
        ruleId: 'one-filled-action',
        tier: 'error' as const,
        selector: surface,
        message:
          `${controls.length} accent-filled controls compete on this surface (expected at ` +
          `most 1): ${controls.join(', ')}. Keep one accent fill per surface; make the rest ` +
          `outline, ghost, or the sanctioned ink fill (docs/internal/admin-design-system.md, "the ink story").`,
      }));
  },
};
