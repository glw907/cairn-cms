# Styling a public component

Two paths exist, and both read contract tokens instead of literals.

- **A site's component.** A `defineComponent` declaration builds the markup, and the rules go in `prose.css` or in the component's scoped `<style>` block.
- **A built-in component.** This path belongs to the engine. The markup lives in `src/lib/public/`, styled by Tailwind utilities that compile through the sheet's `@source` line, or by a scoped `<style>` block that reads contract tokens. A rule enters `cairn-public.css` only when it styles an engine-emitted class and carries no design choice. A built-in component carries no literal and no daisyUI component class.

## Token mapping

Map each job to its token: surface `base-200` or `base-100`, hairline `card-border`, corner `rounded-box` (which reads `--radius-box`), ink `base-content`, border width `--border`. Tailwind utilities over those tokens are the preferred styling. A scoped `<style>` block that reads contract tokens is the alternative. Em-based spacing such as `p-[1em]` is sanctioned, and `public-literals` does not flag it.

## Proving a built-in component under two themes

To prove a built-in component under two themes, add a throwaway route under `examples/showcase/src/routes/(site)/` that imports it, run `npm run package`, then run `node scripts/lab/theme-fixture.mjs --arm template --probe <route> <selector>`. It reports the element's computed color and radius under Waymark and under the fixture theme. Delete the route.
