// cairn-audit's stock-default-hazards rule: four stock DaisyUI patterns cairn's own recipes
// deliberately replace, each a refuted alternative on record in the admin design docs, plus one
// cairn-authored class the Tooltip primitive retires, plus three arms guarding the button patches
// cairn's own ratified button recipes now replace. Stock daisy is in-distribution for an agent
// reaching for a default; cairn's own deviations are not, so an unattended builder regresses
// toward the stock pattern unless a gate catches it. Most of the eight hazards depend on which
// OTHER attributes or classes an element carries, not on one class token in isolation, so this
// rule groups `classTokens` by their owning element (`elementStart`) and reads each element's own
// `attributes` off its `SourceNode`. The three retired-patch arms are
// advisory (`Finding.tier`, read per finding rather than inherited from this rule's own `error`
// tier); the guarded-retirement arm and every other arm here is error tier.
import { utilityBase } from './utility.js';
import type { ClassToken, ParsedComponent, SourceNode } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

const BADGE_GHOST_MESSAGE =
  'class "badge-ghost" is the stock daisyUI ghost badge, retired from cairn\'s own tree: it ' +
  'hardcodes a background/border that can match a row or card color and melt into it, and neither ' +
  'it nor the un-tuned badge-outline clears the audit\'s own 3:1 border-contrast floor. cairn\'s ' +
  'own recipe is the three ratified chip registers instead -- quiet (StatusChip\'s default, or the ' +
  'shared cairn-chip-quiet class, composed with badge) for a settled state such as Published, ' +
  'warning (StatusChip\'s `register="warning"`, or the shared cairn-chip-warning class) for a ' +
  'state needing attention, and outline (StatusChip\'s `register="outline"`, or the shared ' +
  'cairn-chip-outline class) for a transient or reversible absence ' +
  '(docs/reference/admin-toolkit.md, StatusChip\'s register rationale)';

const DROPDOWN_MESSAGE =
  'class "dropdown" here is the focus-driven daisyUI wrapper, which opens on focus-in-transit and ' +
  'ignores Escape; cairn\'s recipe is a DaisyUI v5 popover dropdown (a `popover` attribute) or an ' +
  'explicit `class:dropdown-open` state toggle, neither of which this element carries ' +
  '(docs/internal/admin-design-system.md, "Popover menu")';

const DISABLED_MESSAGE =
  'a guarded button ("cairn-btn-guarded") carries a hardcoded native "disabled", which native ' +
  'disabled is never allowed to be outside the mid-submit busy case; cairn\'s guarded-button ' +
  'pattern uses aria-disabled so the control stays focusable and its reason reaches assistive ' +
  'technology (docs/internal/admin-design-system.md, "The desk band")';

const CARD_BORDER_MESSAGE =
  'a floating card (rounded-box, bg-base-100) carries a flat "border-base-300"; cairn\'s recipe is ' +
  'var(--cairn-card-border), the theme-adaptive hairline (docs/internal/admin-design-system.md, ' +
  '"Component recipes", "Floating card")';

const GUARDED_RETIREMENT_MESSAGE =
  'class "cairn-btn-guarded" is retired; wrap the control in Tooltip for the reason text instead ' +
  'of a native title attribute (docs/reference/admin-toolkit.md, Tooltip). The class itself ' +
  'stays compiled until a later release removes it';

// The promotion version stated in every finding the three retired-patch arms below raise: the
// minor release that moves each finding out of advisory tier.
export const RETIRED_PATCH_PROMOTION_VERSION = '0.99.0';

// The utility bases (compared via utilityBase(), so a variant-prefixed patch such as
// hover:bg-[var(--cairn-ink-hover)] or sm:shadow-none is still caught) that name each retired
// button patch cairn's own ratified button recipes replaced.
const INK_OPENER_BASES = new Set(['bg-neutral', 'bg-[var(--cairn-ink-hover)]']);
const PUBLISH_TINT_BASES = new Set(['bg-primary/10']);
const SHADOW_NONE_BASES = new Set(['shadow-none']);

function inkOpenerMessage(offending: string): string {
  return (
    `class "${offending}" is the retired ink-opener patch; cairn's own recipe is the class ` +
    '"btn btn-neutral" instead (docs/internal/admin-design-system.md, "The ink story"). ' +
    `Reported at advisory tier until ${RETIRED_PATCH_PROMOTION_VERSION} promotes the finding to error`
  );
}

function publishTintMessage(offending: string): string {
  return (
    `class "${offending}" is the retired Publish-tint patch; cairn's own recipe is the class ` +
    '"btn btn-soft btn-primary" instead (docs/internal/admin-design-system.md, "Buttons"). ' +
    `Reported at advisory tier until ${RETIRED_PATCH_PROMOTION_VERSION} promotes the finding to error`
  );
}

const SHADOW_NONE_MESSAGE =
  'class "shadow-none" on a "btn" cancels a stock shadow the theme\'s own depth token already ' +
  'zeroes (docs/internal/admin-design-system.md, "Component recipes"); there is nothing to add ' +
  `in its place. Reported at advisory tier until ${RETIRED_PATCH_PROMOTION_VERSION} promotes the ` +
  'finding to error';

/**
 * The class tokens written on one element, grouped by the element's own start offset. With
 * `normalize` set to `utilityBase`, the three retired-patch arms below read each token's base, so
 * a variant-prefixed patch is caught the way `type-scale` and `gap-scale` already catch one,
 * unlike the five WATCH-noted arms above, which read the raw token.
 */
function classesByElement(
  file: ParsedComponent,
  normalize?: (token: string) => string
): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const token of file.classTokens) {
    const value = normalize ? normalize(token.value) : token.value;
    const set = map.get(token.elementStart);
    if (set) set.add(value);
    else map.set(token.elementStart, new Set([value]));
  }
  return map;
}

/** The first class token on an element whose own `utilityBase()` is one of the given bases. */
function tokenWithBase(
  file: ParsedComponent,
  elementStart: number,
  bases: ReadonlySet<string>
): ClassToken | undefined {
  return file.classTokens.find(
    (token) => token.elementStart === elementStart && bases.has(utilityBase(token.value))
  );
}

function nodeAt(file: ParsedComponent, start: number): SourceNode | undefined {
  return file.nodes.find((node) => node.start === start);
}

/** The first class token on an element matching the given name, for the finding's position. */
function tokenNamed(
  file: ParsedComponent,
  elementStart: number,
  name: string
): ClassToken | undefined {
  return file.classTokens.find(
    (token) => token.elementStart === elementStart && token.value === name
  );
}

/**
 * A finding at a class token's or an attribute's own source range. Defaults to `error`, this
 * rule's own overall tier; the retired-patch arms below pass `advisory` explicitly, since
 * `Finding.tier` is read per finding, not inherited from the rule's own declared tier.
 */
function findingAt(
  file: ParsedComponent,
  at: { start: number; end: number; line: number },
  message: string,
  tier: Finding['tier'] = 'error'
): Finding {
  return {
    ruleId: 'stock-default-hazards',
    tier,
    file: file.file,
    line: at.line,
    start: at.start,
    end: at.end,
    message,
  };
}

export const stockDefaultHazards: StaticRule = {
  id: 'stock-default-hazards',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      // WATCH: every comparison below reads the RAW token value, while type-scale and gap-scale
      // read utilityBase(), so a variant-prefixed write (sm:badge-ghost, md:border-base-300)
      // slips past this rule. The admin already writes ~100 variant-prefixed tokens. Routing
      // these through utilityBase() WIDENS the rule and may surface real findings, so it is a
      // deliberate rule-design decision, not a cleanup. Recorded 2026-07-28.
      // badge-ghost: unconditional, since the stock class itself is the hazard regardless of
      // where it renders.
      for (const token of file.classTokens) {
        if (token.value === 'badge-ghost') findings.push(findingAt(file, token, BADGE_GHOST_MESSAGE));
      }

      const byElement = classesByElement(file);
      const byElementBase = classesByElement(file, utilityBase);
      for (const [elementStart, classes] of byElement) {
        const node = nodeAt(file, elementStart);
        const attributes = node?.attributes ?? [];

        // Bare .dropdown: the class with neither a popover attribute nor an explicit
        // class:dropdown-open state toggle covering it.
        if (classes.has('dropdown')) {
          const hasPopover = attributes.some((attr) => attr.name === 'popover');
          const hasStateToggle = attributes.some((attr) => attr.name === 'class:dropdown-open');
          const token = tokenNamed(file, elementStart, 'dropdown');
          if (!hasPopover && !hasStateToggle && token) {
            findings.push(findingAt(file, token, DROPDOWN_MESSAGE));
          }
        }

        // Native disabled on a guarded button: the marker class plus a hardcoded (never a bound
        // condition) disabled attribute.
        if (classes.has('cairn-btn-guarded')) {
          const disabled = attributes.find((attr) => attr.name === 'disabled');
          if (disabled?.hardcodedTrue) findings.push(findingAt(file, disabled, DISABLED_MESSAGE));

          // The class itself is retired: the sweep it named replaces the native title attribute
          // with Tooltip everywhere, and cairn-btn-guarded's own rule (restoring pointer-events,
          // supplying the ghost fill) still has a real consumer inside cairn's own tree, so the
          // class stays compiled until a later release removes it.
          const token = tokenNamed(file, elementStart, 'cairn-btn-guarded');
          if (token) {
            findings.push(findingAt(file, token, GUARDED_RETIREMENT_MESSAGE));
          }
        }

        // Flat base-300 card border: the floating-card shell (rounded-box, bg-base-100) with a
        // flat border-base-300 rather than the theme-adaptive hairline. A dashed border is a
        // different affordance (an upload dropzone), not the card recipe, so it is excluded.
        const isFloatingCard =
          classes.has('rounded-box') && classes.has('bg-base-100') && !classes.has('border-dashed');
        if (isFloatingCard && classes.has('border-base-300')) {
          const token = tokenNamed(file, elementStart, 'border-base-300');
          if (token) findings.push(findingAt(file, token, CARD_BORDER_MESSAGE));
        }

        // The three retired-patch arms: btn only, and at most one finding per element, since
        // writing a recipe's named replacement drops the shadow-none it carried with the rest.
        const baseClasses = byElementBase.get(elementStart);
        if (baseClasses?.has('btn')) {
          const inkToken = tokenWithBase(file, elementStart, INK_OPENER_BASES);
          const tintToken = tokenWithBase(file, elementStart, PUBLISH_TINT_BASES);
          if (inkToken && !baseClasses.has('btn-neutral')) {
            const message = inkOpenerMessage(utilityBase(inkToken.value));
            findings.push(findingAt(file, inkToken, message, 'advisory'));
          } else if (tintToken && !baseClasses.has('btn-soft')) {
            const message = publishTintMessage(utilityBase(tintToken.value));
            findings.push(findingAt(file, tintToken, message, 'advisory'));
          } else {
            const shadowToken = tokenWithBase(file, elementStart, SHADOW_NONE_BASES);
            if (shadowToken) {
              findings.push(findingAt(file, shadowToken, SHADOW_NONE_MESSAGE, 'advisory'));
            }
          }
        }
      }
    }
    return findings;
  },
};
