// The class-token syntax the markup-family rules prefilter on. A Tailwind class is a chain of
// variant prefixes followed by the utility itself (`sm:hover:text-sm`), and every prefilter here
// used to be anchored at the start of the WHOLE token, so a responsive or state variant hid a
// utility the compiled sheet resolves identically to its unprefixed form. The admin already writes
// ~100 variant-prefixed tokens, so this is the idiom, not an edge case.
import type { StaticRuleContext } from '../../types.js';

/**
 * The utility a class token names, with its variant prefixes removed. Only a colon outside brackets
 * and parentheses separates a variant, so an arbitrary value or property that carries its own colon
 * (`text-[color:red]`, `[font-size:1.375rem]`, `supports-[display:grid]:flex`) keeps it.
 */
export function utilityBase(token: string): string {
  let base = 0;
  let depth = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ':' && depth === 0) base = i + 1;
  }
  return token.slice(base);
}

/**
 * The values the built sheet gives a class token for one CSS property, empty when the sheet
 * compiles no such declaration. A rule resolves a token's real value this way rather than reading
 * the bracket text it was written with: the compiled declaration is what ships, and it normalizes
 * the notations a source-text match treats as different values (`.4375rem` and `0.4375rem`,
 * `+7px` and `7px`, `7Px` and `7px`).
 */
export function compiledValues(
  ctx: StaticRuleContext,
  token: string,
  property: (name: string) => boolean
): string[] {
  return ctx.sheet
    .declarations(token)
    .filter((decl) => property(decl.property))
    .map((decl) => decl.value);
}
