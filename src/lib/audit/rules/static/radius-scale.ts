// cairn-audit's radius-scale rule: a sibling of type-scale and gap-scale, over the admin's ratified
// corner ladder. Every framed element resolves to one of three roles -- rounded-selector
// (chip/tag/count), rounded-field (control/button-like/thumbnail), rounded-box (panel/card/tile)
// -- so a fixed Tailwind radius, an arbitrary bracket, or the `rounded-(--x)` variable shorthand is
// a class the corner ladder has no vocabulary for, the same shape gap-scale already reads for
// spacing brackets.
//
// The rule is class-token only: it reads utilityBase() the way type-scale and gap-scale do, so a
// variant-prefixed radius (`md:rounded-lg`) is caught, but a `border-radius` literal written
// directly in a scoped `<style>` block sits outside its remit, since that literal carries no class
// token to read a role off of.
//
// Reported at advisory tier for one minor: a sweep can miss a site, and a false positive here
// (an element the corner-role table doesn't yet name) is a worse failure mode than a missed one
// while the mapping is still settling.
import { utilityBase } from './utility.js';
import type { ClassToken, ParsedComponent } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

// The promotion version stated in every finding this rule raises: the minor release that moves
// the finding out of advisory tier.
export const RADIUS_SCALE_PROMOTION_VERSION = '0.99.0';

type Role = 'selector' | 'field' | 'box';

// Longer corner names first, so a two-letter logical side (`se`, `es`) is tried before its
// single-letter prefix (`s`, `e`) would otherwise match and leave a dangling character.
const SIDE = 'tl|tr|br|bl|ss|se|es|ee|t|b|l|r|s|e';
const FIXED_SIZE = 'xs|sm|md|lg|xl|2xl|3xl|4xl';

const ROLE_TOKEN = new RegExp(`^rounded(?:-(?:${SIDE}))?-(selector|field|box)$`);
const FULL_TOKEN = /^rounded-full$/;
const NONE_TOKEN = new RegExp(`^rounded(?:-(?:${SIDE}))?-none$`);
const BRACKET_TOKEN = new RegExp(`^rounded(?:-(${SIDE}))?-\\[(.+)\\]$`);
const VAR_SHORTHAND_TOKEN = new RegExp(`^rounded(?:-(${SIDE}))?-\\((--[\\w-]+)\\)$`);
const FIXED_TOKEN = new RegExp(`^rounded(?:-(${SIDE}))?(?:-(?:${FIXED_SIZE}))?$`);

const ROLE_VAR_VALUE = /^var\(\s*--radius-(selector|field|box)\s*\)$/;
const ROLE_CUSTOM_PROP = /^--radius-(selector|field|box)$/;

const THREE_ROLE_SENTENCE =
  "cairn's corner scale is role-based -- rounded-selector for a chip/tag/count, rounded-field " +
  'for a control, rounded-box for a panel/card/tile';

// The corner-role mapping: the daisyUI class whose role the corner system fixes. Checked in this
// order, but only one is ever present on a real element in practice.
const ROLE_BY_DAISY_CLASS: Record<string, Role> = {
  badge: 'selector',
  btn: 'field',
  input: 'field',
  select: 'field',
  textarea: 'field',
  card: 'box',
  'modal-box': 'box',
  'dropdown-content': 'box',
};

function sidePart(side: string | undefined): string {
  return side ? `-${side}` : '';
}

function radiusMessage(body: string): string {
  return (
    `${body}. Reported at advisory tier until ${RADIUS_SCALE_PROMOTION_VERSION} promotes the ` +
    'finding to error'
  );
}

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

/** The role a daisyUI class on the same element fixes, checked in `ROLE_BY_DAISY_CLASS` order. */
function roleForElement(classes: Set<string>): Role | undefined {
  for (const [daisyClass, role] of Object.entries(ROLE_BY_DAISY_CLASS)) {
    if (classes.has(daisyClass)) return role;
  }
  return undefined;
}

/** The exact replacement message for an arbitrary bracket or variable-shorthand radius token. */
function arbitraryMessage(token: string, side: string | undefined, role: Role | undefined): string {
  if (role) {
    return radiusMessage(
      `class "${token}" is an arbitrary radius that already names the ratified role token; ` +
        `write the class rounded${sidePart(side)}-${role} instead`
    );
  }
  return radiusMessage(
    `class "${token}" is an arbitrary radius with no ratified role token; ${THREE_ROLE_SENTENCE}`
  );
}

/** The replacement message for a bare or fixed-size radius token. */
function fixedMessage(token: string, side: string | undefined, elementClasses: Set<string>): string {
  const role = roleForElement(elementClasses);
  if (role) {
    return radiusMessage(
      `class "${token}" is a fixed Tailwind radius; this element's own daisyUI class fixes its ` +
        `corner role to rounded${sidePart(side)}-${role}`
    );
  }
  return radiusMessage(`class "${token}" is a fixed Tailwind radius; ${THREE_ROLE_SENTENCE}`);
}

/** The one message a token raises, or `undefined` when it passes. */
function messageFor(token: string, base: string, elementClasses: Set<string>): string | undefined {
  if (ROLE_TOKEN.test(base)) return undefined;

  if (FULL_TOKEN.test(base)) {
    // Chips leave the pill: a rounded-full chip, tag, or count moves to rounded-selector, judged
    // by the co-occurring badge class rather than by shape, since a true circle (a dot, disc,
    // medallion, spinner, avatar, or switch) keeps rounded-full on purpose.
    if (!elementClasses.has('badge')) return undefined;
    return radiusMessage(
      `class "rounded-full" is the pill geometry; chips leave the pill under the new corner ` +
        'scale, so this badge element takes rounded-selector instead'
    );
  }

  if (NONE_TOKEN.test(base)) return undefined;

  const bracket = BRACKET_TOKEN.exec(base);
  if (bracket) {
    const [, side, value] = bracket;
    const role = ROLE_VAR_VALUE.exec(value.trim())?.[1] as Role | undefined;
    return arbitraryMessage(token, side, role);
  }

  const varShorthand = VAR_SHORTHAND_TOKEN.exec(base);
  if (varShorthand) {
    const [, side, customProp] = varShorthand;
    const role = ROLE_CUSTOM_PROP.exec(customProp)?.[1] as Role | undefined;
    return arbitraryMessage(token, side, role);
  }

  const fixed = FIXED_TOKEN.exec(base);
  if (fixed) return fixedMessage(token, fixed[1], elementClasses);

  return undefined;
}

export const radiusScale: StaticRule = {
  id: 'radius-scale',
  tier: 'advisory',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      const byElement = classesByElement(file);
      for (const token of file.classTokens) {
        const base = utilityBase(token.value);
        if (!base.startsWith('rounded')) continue;
        const elementClasses = byElement.get(token.elementStart) ?? new Set<string>();
        const message = messageFor(token.value, base, elementClasses);
        if (!message) continue;
        findings.push(findingAt(file, token, message));
      }
    }
    return findings;
  },
};

function findingAt(file: ParsedComponent, token: ClassToken, message: string): Finding {
  return {
    ruleId: 'radius-scale',
    tier: 'advisory',
    file: file.file,
    line: token.line,
    start: token.start,
    end: token.end,
    message,
  };
}
