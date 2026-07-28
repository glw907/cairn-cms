// cairn-audit's type-scale rule: every font-size a text-sizing markup class token resolves to,
// through the built sheet, has to come from a `--cairn-type-*` grammar token. "Seven unrelated type
// sizes" on Members is the evidence line this rule closes. Resolution runs through `sheet.ts`'s
// exact class lookup, never a substring or a word boundary: a naive match reads `text-base` (the
// size utility) as satisfied by `text-base-content` (the daisyUI color utility) sharing its prefix,
// which has already produced two miscounts in this initiative. Because the lookup is exact, that
// confusion cannot arise here either.
//
// The rule only inspects `text-*`-prefixed tokens (Tailwind's own text-sizing namespace, named
// steps and arbitrary brackets alike) plus the `type-*` role utilities themselves. DaisyUI's OWN
// component classes (`.btn`, `.alert`, `.input`, `.select`, `.badge`, `.kbd`, `.label`,
// `.checkbox`, `.textarea`, `.table`, `.menu`, `.fieldset`, ...) each carry their own baked-in
// font-size as part of the CONTROL's chrome (sized instead by daisyUI's own `btn-sm`/`input-lg`
// modifiers), a system that has nothing to do with the admin's seven-role text-content scale;
// resolving every class with ANY font-size declaration flagged all of them as violations the first
// time this rule ran against cairn's own tree.
import { GRAMMAR_TOKENS } from '../../../design/grammar-tokens.js';
import type { Finding, StaticRule } from '../../types.js';

// The grammar inventory carries both a role's size token and its paired `--leading` token; only
// the size tokens are ever the right side of a `font-size` declaration.
const TYPE_SIZE_TOKENS = new Set(
  GRAMMAR_TOKENS.filter((name) => name.startsWith('--cairn-type-') && !name.endsWith('--leading'))
);

const FONT_SIZE_TOKEN_REF = /var\(\s*(--cairn-type-[a-z-]+?)\s*(?:,[^)]*)?\)/;
const TEXT_SIZING_TOKEN = /^(text|type)-/;

export const typeScale: StaticRule = {
  id: 'type-scale',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      for (const token of file.classTokens) {
        if (!TEXT_SIZING_TOKEN.test(token.value)) continue;
        for (const decl of ctx.sheet.declarations(token.value)) {
          if (decl.property !== 'font-size') continue;
          const match = FONT_SIZE_TOKEN_REF.exec(decl.value);
          if (match && TYPE_SIZE_TOKENS.has(match[1])) continue;
          findings.push({
            ruleId: 'type-scale',
            tier: 'error',
            file: file.file,
            line: token.line,
            start: token.start,
            end: token.end,
            message: `class "${token.value}" sets font-size to "${decl.value}", which resolves to no --cairn-type-* token`,
          });
        }
      }
    }
    return findings;
  },
};
