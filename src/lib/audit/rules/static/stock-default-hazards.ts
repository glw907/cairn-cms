// cairn-audit's stock-default-hazards rule: four stock DaisyUI patterns cairn's own recipes
// deliberately replace, each a refuted alternative on record in the admin design docs. Stock daisy
// is in-distribution for an agent reaching for a default; cairn's own deviations are not, so an
// unattended builder regresses toward the stock pattern unless a gate catches it. Three of the four
// hazards depend on which OTHER attributes or classes an element carries, not on one class token in
// isolation, so this rule groups `classTokens` by their owning element (`elementStart`) and reads
// each element's own `attributes` off its `SourceNode`.
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

/** The class tokens written on one element, grouped by the element's own start offset. */
function classesByElement(file: ParsedComponent): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const token of file.classTokens) {
    const set = map.get(token.elementStart);
    if (set) set.add(token.value);
    else map.set(token.elementStart, new Set([token.value]));
  }
  return map;
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

/** A finding at a class token's or an attribute's own source range. */
function findingAt(
  file: ParsedComponent,
  at: { start: number; end: number; line: number },
  message: string
): Finding {
  return {
    ruleId: 'stock-default-hazards',
    tier: 'error',
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
      }
    }
    return findings;
  },
};
