// cairn-audit's no-uncompiled-class rule: every class token an admin component's markup writes
// has to actually compile into the built cairn-admin.css, or be a name the component's own scoped
// <style> block defines locally. A class that reaches neither read as present in the author's mind
// and is absent from what ships: three real cases motivated this rule (the invisible Overdue chip,
// the silent ml-1/divide-y no-ops, the unstyled stats strip). Matching is exact through `sheet.ts`,
// never a substring or a word boundary, so `text-base` (the size utility) and `text-base-content`
// (the daisyUI color utility) never read as the same class.
//
// The sheet check reads `mentions`, not `has`: daisyUI's own `.menu` rules exclude `.disabled` and
// `.menu-title` items from hover/focus purely through `:not(...)` negation, with no rule ever
// declaring either class positively. A markup class used that way (EntryPicker's own
// `class:disabled` on a selected menu item) is real, working daisyUI API, not an uncompiled miss.
import type { Finding, StaticRule } from '../../types.js';

/** Every markup class token this component's own scoped `<style>` block or the built sheet never acknowledges. */
export const noUncompiledClass: StaticRule = {
  id: 'no-uncompiled-class',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      for (const token of file.classTokens) {
        if (file.styleClassNames.has(token.value)) continue;
        if (ctx.sheet.mentions(token.value)) continue;
        findings.push({
          ruleId: 'no-uncompiled-class',
          tier: 'error',
          file: file.file,
          line: token.line,
          start: token.start,
          end: token.end,
          message: `class "${token.value}" never compiles into the built admin stylesheet`,
        });
      }
    }
    return findings;
  },
};
