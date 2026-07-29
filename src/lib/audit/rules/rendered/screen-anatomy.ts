// cairn-audit's screen-anatomy rule: the mechanical floor under the office screen shape spec 6.3
// names, "One PageHeader with one h1; the primary action sits in the header slot; content sits in
// the card region." Three checks, each tied to a markup fact the admin toolkit's own recipes make
// mechanically readable rather than a class-name guess:
//
//  1. Exactly one rendered `<h1>` on the page, PageHeader's own "display-face heading"
//     (`PageHeader.svelte`'s doc comment). Zero or several is a structural anatomy break, whichever
//     component produced it.
//  2. That h1 renders inside a `<header>` landmark: PageHeader's own wrapper
//     (`<header class="mb-10 ...">…<h1 class="page-h1">`). An h1 with no header ancestor is a
//     heading PageHeader did not produce, or a header PageHeader failed to render around it.
//  3. Every ACCENT- or INK-filled, text-carrying action control inside `<main>` that sits outside
//     BOTH the header and any `.card-shell` region is a buried primary action: the "old trailing
//     foot row that duplicated" the header's own New button, the exact defect `ConceptList`'s own
//     history names (`docs/internal/admin-design-system.md`, "Office list (the concept list view)",
//     2026-07-15). "Filled" is read the same way `one-filled-action` reads it, not as "any opaque
//     background": each candidate's own computed `background-color` is compared, via the shared
//     canvas normalizer, against `--color-primary` and `--color-neutral` as THAT element inherits
//     them, the two fills the design system reserves for a loud, attention-carrying action
//     (`one-filled-action.ts`'s own header: the accent fill and "the sanctioned ink fill"). An
//     adversarial pass against the real admin demonstrated why a raw opacity floor cannot stand in
//     for this: `CairnMediaLibrary`'s "Find orphaned files" control is a quiet bordered office
//     button on `bg-base-100`, opaque but deliberately NOT a primary action (its own comment: "NEVER
//     the danger family"), and a floor keyed to opacity alone flagged it as buried. Matching the
//     two sanctioned fills exactly is what `one-filled-action` already proved catches the real
//     accent/ink cases without also catching every merely-opaque secondary control. A candidate this
//     rule cannot resolve a background OR neither theme color for is skipped, not flagged: this rule
//     proves LOCATION for a KNOWN-filled control, not fill in general, so an unresolvable color just
//     drops that one candidate from consideration.
//
//     `role="radio"` is excluded from candidacy outright: an adversarial pass against the real admin
//     also found `ListToolbar`'s own segmented publish-state and Hidden filters (both
//     `role="radiogroup"` with `role="radio"` options, one option always accent-filled via
//     `.btn-active`) firing on every office list, five false positives per theme. A radio option is
//     a SELECTION control, not an action, and the toolbar sits outside the card by design
//     (`docs/internal/admin-design-system.md`, "the toolbar belongs to the card below it"); ARIA
//     marks the distinction structurally, so reading it is not a guess. The same pass caught a
//     genuine positive alongside both false-positive classes: `VocabularyAdmin`'s own footer
//     `<form>` renders its accent-filled "Save changes" outside both the header and any card-shell,
//     a real, currently-shipped instance of the anatomy this rule polices.
//
// DESK ROUTES ARE EXEMPT (spec 6.3): an open document's own topbar-and-manuscript shape carries no
// PageHeader at all (docs/internal/admin-design-system.md, "The context model: office and desk").
// The exemption is read off the RENDER, never off the path, and that is the whole point. The first
// cut used path depth, which `CairnAdminShell.svelte`'s own comment names by name as the wrong
// signal that already caused a shipped bug: "a developer's own custom nav can route just as deep
// (a section entry like /admin/club/events) without opening a document". An adversarial pass drove
// that exactly, injecting three real anatomy defects into `/admin/posts`'s DOM and getting three
// findings under a 2-segment path and ZERO under a 3-segment one, on identical markup.
//
// The shell already projects its own concept-confirmed `isDeskRoute` into the DOM, at
// `CairnAdminShell.svelte:534-535`: the drawer carries `lg:drawer-open` on an office route and
// `xl:drawer-open` on a desk one, resolved at SSR from the same predicate. Reading that is reading
// the shell's own answer rather than re-deriving it from a path the audit cannot interpret. A page
// carrying no drawer at all is not running inside the shell, so it is office by default.
//
// A page with no `<main>` landmark at all is skipped, not flagged. `CairnAdminShell` is the only
// component that renders `<main>` (`grep '<main' src/lib/components` finds exactly one hit), so a
// page without one (`LoginPage`, the pre-auth screen) does not run inside the office/desk shell and
// carries no PageHeader anatomy to judge in the first place; this is a markup fact, not a route-name
// guess.
import { ensurePageHelpers, resolveColors } from '../../rendered.js';
import { indeterminateFinding, sameColor } from '../../color.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

/** One stray-action candidate the in-page walk found, with the raw paint data resolved after. */
interface StrayActionCandidate {
  selector: string;
  name: string;
  /** The control's own computed `background-color`, unparsed. */
  background: string;
  /** `--color-primary` as it inherits onto this control, unparsed; empty when the theme is absent. */
  accent: string;
  /** `--color-neutral` (the sanctioned ink fill) as it inherits onto this control, unparsed. */
  ink: string;
  /** Whether the control's fill arrives as a `background-image`, which no color comparison can read. */
  hasImageFill: boolean;
}

/** What the in-page walk reports about one page, or `null` when the page has no office/desk shell. */
interface ScreenAnatomySnapshot {
  /** Whether the shell rendered its desk drawer, which exempts the page from the office anatomy. */
  isDesk: boolean;
  h1Selectors: string[];
  /** The lone h1's own selector, meaningful only when `h1Selectors.length === 1`. */
  h1Selector: string;
  /** Whether the lone h1 renders inside a `<header>` landmark; `null` when there is not exactly one. */
  h1HasHeaderAncestor: boolean | null;
  hasCardRegion: boolean;
  strayCandidates: StrayActionCandidate[];
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: every
 * helper is nested and no constant is referenced from module scope.
 */
function readScreenAnatomy(): ScreenAnatomySnapshot | null {
  const mainEl = document.querySelector('main');
  if (!mainEl) return null;
  const helpers = globalThis.__cairnAudit;
  const isRendered = (el: Element) => (helpers ? helpers.isVisible(el) : true);
  const selectorFor = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());

  // The shell's own SSR answer, not a re-derivation from the path: office routes get
  // `lg:drawer-open`, desk routes `xl:drawer-open` (CairnAdminShell.svelte:534-535). A page with no
  // drawer is not running inside the shell, so it is judged as an office screen.
  const drawer = document.querySelector('.drawer');
  const isDesk = drawer !== null && !drawer.classList.contains('lg:drawer-open');

  // Scoped to `<main>`, matching every other check in this walk. A document-wide count reported a
  // false positive for a visible heading a developer's own custom shell renders beside main.
  const h1s = Array.from(mainEl.querySelectorAll('h1')).filter(isRendered);
  const h1Selectors = h1s.map(selectorFor);
  const h1Selector = h1s.length === 1 ? h1Selectors[0] : '';
  const pageHeader = h1s.length === 1 ? h1s[0].closest('header') : null;
  const h1HasHeaderAncestor = h1s.length === 1 ? pageHeader !== null : null;

  const hasCardRegion = Array.from(mainEl.querySelectorAll('.card-shell')).some(isRendered);

  // `label.btn` is daisyUI's canonical dialog and drawer opener, and cairn's own shell ships one
  // (CairnAdminShell.svelte:582). A bare `<a>` is included too, without requiring `.btn`: a
  // hand-rolled accent-filled link is exactly the buried primary action this check exists for, and
  // the fill comparison below is what filters the ordinary links back out.
  const CONTROL_SELECTOR =
    'button, [role="button"], [role="link"], a, label.btn, summary, input[type="submit"], input[type="button"]';
  const strayCandidates: StrayActionCandidate[] = [];
  for (const el of mainEl.querySelectorAll(CONTROL_SELECTOR)) {
    if (!isRendered(el)) continue;
    // Only PageHeader's own header exempts, not any `<header>` an ancestor happens to be. A nested
    // section-level `<header>` laundered a buried primary action past this check entirely.
    if (pageHeader && pageHeader.contains(el)) continue;
    if (!pageHeader && el.closest('header')) continue;
    // `closest` includes the element itself, so a control that carried `card-shell` exempted
    // ITSELF from the card-region test. The region is something a control sits inside.
    if (el.parentElement?.closest('.card-shell')) continue;
    // A radio option is a SELECTION control (which filter is active, ListToolbar's own segmented
    // publish-state and Hidden toggles), not an action, and the toolbar sits outside the card by
    // design (docs/internal/admin-design-system.md, "the toolbar belongs to the card below it").
    // ARIA marks this distinction structurally (`role="radio"` inside a `role="radiogroup"`), so
    // excluding it here is reading the accessibility tree rather than guessing at intent.
    if (el.getAttribute('role') === 'radio') continue;
    const style = getComputedStyle(el);
    const hasImageFill = style.backgroundImage !== 'none';
    // `rgba(0, 0, 0, 0)` is the one serialization Chromium gives a fully transparent computed
    // background, so this is an equality check on a canonical string, not color-syntax parsing.
    if (!hasImageFill && style.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    strayCandidates.push({
      // An unnamed control is still reported, under its selector. Dropping it was an unspecified
      // filter that let an icon-only accent button out of the audit entirely.
      selector: selectorFor(el),
      name: (el.getAttribute('aria-label') || el.textContent || '').trim() || selectorFor(el),
      background: style.backgroundColor,
      accent: style.getPropertyValue('--color-primary').trim(),
      ink: style.getPropertyValue('--color-neutral').trim(),
      hasImageFill,
    });
  }

  return { isDesk, h1Selectors, h1Selector, h1HasHeaderAncestor, hasCardRegion, strayCandidates };
}

/**
 * The office screen's mechanical anatomy floor: one PageHeader h1, the primary action in its
 * header slot, content in the card region. Advisory tier: a false positive here (a legitimate
 * screen this rule cannot special-case, such as a whole-concept empty state that deliberately
 * drops its card, `docs/internal/admin-design-system.md`'s own "Empty state" section) is a
 * candidate for a human to triage via the rendered allowlist, never a build breaker; the mechanical
 * floor is a nudge toward the recipe, not a proof the recipe was violated.
 */
export const screenAnatomy: RenderedRule = {
  id: 'screen-anatomy',
  tier: 'advisory',
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const snapshot = await ctx.page.evaluate(readScreenAnatomy);
    if (!snapshot || snapshot.isDesk) return [];

    const findings: RenderedFinding[] = [];

    if (snapshot.h1Selectors.length !== 1) {
      findings.push({
        ruleId: 'screen-anatomy',
        tier: 'advisory',
        selector: 'main',
        message:
          snapshot.h1Selectors.length === 0
            ? 'no <h1> renders on this office route; every office screen carries PageHeader\'s one ' +
              'display-face heading (docs/internal/admin-design-system.md, "The context model: office and desk").'
            : `${snapshot.h1Selectors.length} <h1> elements render on this route (expected exactly 1): ` +
              `${snapshot.h1Selectors.join(', ')}. PageHeader owns the page's one display-face heading.`,
      });
    } else if (snapshot.h1HasHeaderAncestor === false) {
      findings.push({
        ruleId: 'screen-anatomy',
        tier: 'advisory',
        selector: snapshot.h1Selector,
        message:
          `the page's one <h1> (${snapshot.h1Selector}) does not render inside a <header> landmark; ` +
          'PageHeader wraps its display-face title in <header>, so either this heading is not ' +
          "PageHeader's own or its header wrapper is missing.",
      });
    }

    if (!snapshot.hasCardRegion) {
      findings.push({
        ruleId: 'screen-anatomy',
        tier: 'advisory',
        selector: 'main',
        message:
          'this office route renders no .card-shell region inside <main>; office content composes ' +
          'inside a floating card (docs/internal/admin-design-system.md, "Floating card: card-shell card-shadow").',
      });
    }

    if (snapshot.strayCandidates.length > 0) {
      const n = snapshot.strayCandidates.length;
      const colors = await resolveColors(ctx.page, [
        ...snapshot.strayCandidates.map((candidate) => candidate.background),
        ...snapshot.strayCandidates.map((candidate) => candidate.accent),
        ...snapshot.strayCandidates.map((candidate) => candidate.ink),
      ]);
      const backgrounds = colors.slice(0, n);
      const accents = colors.slice(n, n * 2);
      const inks = colors.slice(n * 2, n * 3);

      snapshot.strayCandidates.forEach((candidate, index) => {
        const background = backgrounds[index];
        const accent = accents[index];
        const ink = inks[index];
        // A fill this rule cannot read is reported, never dropped. The first cut skipped it, and an
        // adversarial pass walked straight through the gap twice: an accent delivered as
        // `linear-gradient(var(--color-primary), var(--color-primary))` and an unthemed page where
        // `--color-primary` resolves to nothing both produced a visibly accent-filled button
        // outside header and card, and both reported clean. `one-filled-action` already answers
        // this shape with `indeterminateFinding`; so does this rule now.
        if (candidate.hasImageFill && (!background || background.a === 0)) {
          findings.push(
            indeterminateFinding(
              'screen-anatomy',
              candidate.selector,
              `this control ("${candidate.name}") paints its fill as a background-image, so no single color ` +
                `can be compared against the accent and ink fills`
            )
          );
          return;
        }
        if (!background) {
          findings.push(
            indeterminateFinding('screen-anatomy', candidate.selector, 'the browser could not resolve its background-color')
          );
          return;
        }
        if ((!accent || accent.a === 0) && (!ink || ink.a === 0)) {
          findings.push(
            indeterminateFinding(
              'screen-anatomy',
              candidate.selector,
              'neither --color-primary nor --color-neutral resolves on this control, so a filled action cannot ' +
                'be told from a quiet one here'
            )
          );
          return;
        }
        // Both sides come through the same normalizer, the same discipline `one-filled-action`
        // uses: a color the normalizer refused is a color the browser could not paint either, so a
        // missing accent or ink just means this candidate cannot be proven to match it.
        const isAccentFill = accent && accent.a > 0 && sameColor(background, accent);
        const isInkFill = ink && ink.a > 0 && sameColor(background, ink);
        if (!isAccentFill && !isInkFill) return;
        findings.push({
          ruleId: 'screen-anatomy',
          tier: 'advisory',
          selector: candidate.selector,
          message:
            `this ${isAccentFill ? 'accent' : 'ink'}-filled action ("${candidate.name}") renders ` +
            "outside both the header and any .card-shell region; a primary action belongs in PageHeader's " +
            'header slot or inside the surrounding card, never as a stray page-level control ' +
            '(the buried-primary-action defect this rule polices).',
        });
      });
    }

    return findings;
  },
};
