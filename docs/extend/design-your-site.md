# Design your site

If your site came from the scaffold, it already has a design: Waymark, cairn's public reading
template, wired into a chassis of genre-free plumbing underneath it. A site built by hand from
[the deep path](./build-a-site-by-hand.md) has none of this; you bring your own theme and your
own delivery wiring from the start, and the rest of this page describes what you'd be building
toward rather than something already in your tree.

## The boundary: chassis versus theme

`src/chassis/` holds the plumbing no site skips regardless of what it looks like: content
indexing, the feed and sitemap builders, the server runtime composition, the token *system* (the
CSS custom properties every themed value plugs into), the reading-surface foundation, and the
composition primitives (card, band, section, hero, sidebar layout). Every file outside
`src/chassis/` is Waymark's own content: the concrete adapter config, the chrome components, the
color and type values, the page compositions. A theme file reaches chassis only through its
exported seams, the `$chassis` alias in TypeScript and Svelte or a relative `@import` in CSS.
cairn's own repository enforces this boundary on the showcase, the tree Waymark was baked from,
with a `check:chassis-boundary` gate; a scaffolded site inherits the boundary as a convention, not
a gate of its own.

The rule this buys you: a re-skin never touches chassis. Every design-scale key `tokens.css`
declares (`--font-*`, `--text-step-*`, `--spacing-*`, `--color-muted`, and the rest) carries a
generic default; a theme `@import`s `tokens.css` first, then redeclares the same keys with its
own numbers in a later `@theme` block, and cascade order does the override. The named DaisyUI
themes themselves, every role color and geometry value, are never declared in chassis at all;
that's entirely the theme's own choice.

## The re-skin recipe

One file owns the look: your own `src/theme/theme.css`. The committed re-skin is about fourteen
values, light and dark: rotate `--color-primary`'s hue while holding lightness and chroma for a
contrast-stable recolor, and edit the `base-100/200/300` ladder plus `base-content`. Optionally
swap the two `--font-*` tokens, retune the one type ratio, or one space-scale step. The reading
surface (`prose.css`) comes along for free at zero extra edits, since it reads the same role
tokens rather than any color of its own; a full status-color rebrand costs more, since each status
carries both a fill (in the `@plugin` block) and a matching on-surface ink
(`--cairn-{info,success,warning,error}-ink`, light and dark), and re-tuning one without the other
desyncs directive text and code-highlight colors from the fills around them.

Two CI gates hold this recipe honest on cairn's own showcase, the tree your scaffold was baked
from: `check:public-tokens` (a dual-gamut AA contrast check plus a dangling-`var()` check) and
`test:reskin` (a hue-rotated fixture theme proves AA still holds and the prose still reads from
one token source). Neither ships in a scaffolded site's own `package.json`. Check your own edit by
eye against `/styleguide` and a browser contrast checker, or copy the two scripts in from cairn's
own [`scripts/checks/`](https://github.com/glw907/cairn-cms/tree/main/scripts/checks) and
[`scripts/lab/`](https://github.com/glw907/cairn-cms/tree/main/scripts/lab) directories if you
want the same automated bar in your own CI.

## Local iteration

`/styleguide` is the live demo surface: every registered directive (callout, alert, video
facade, pull-quote, CTA, FAQ), the type scale, and the component recipes render there against
whatever `theme.css` currently holds, so a token edit shows up across the whole page in one dev
reload. Run your own dev server and iterate against that route directly rather than guessing at a
value's effect from the token declaration alone; several of the theme's relationships (the CTA's
ink, the status inks, the card border and shadow pairing) are deliberately not obvious from a
single hex value in isolation.

For a layout or composition change, `/styleguide` alone isn't enough: check it against your
site's own real entries and media too, which needs your local dev server serving real content.
A fresh clone's markdown and committed media manifest come along with the checkout, so pages
render locally right away; the pictures don't, since they live in R2, not git. Seed your local R2
simulator once per clone with [`cairn-media-seed`](../reference/cli-cairn-media-seed.md), pointed
at your deployed site:

```bash
npx cairn-media-seed --from https://your-site.com
```

Re-run it later only when the deployed library has gained objects you want locally too; it's
idempotent, so a re-run just overwrites the same keys with the same bytes. A site with nothing
deployed yet has nothing to seed: media you upload through the local `/admin` lands straight in
the local bucket.

With that done, `npm run dev` renders every page with real content and real images. Each
iteration is a small, testable change followed by a look:

1. **Make the change.** Hot module reload picks up a `theme.css` or component edit without a
   manual reload.
2. **Watch the terminal running `vite dev`.** A hot-reload failure or a console error shows there
   before it shows in the browser. For a pure style or copy tweak, that and your own eyes on the
   page are the whole check.
3. **For a structural change** (a new wrapper element, a conditional render, anything touching
   markup shape rather than just style), run the file's own test if one exists, and glance at the
   rendered DOM. A structural bug can look right at a glance and still break a state you didn't
   check.
4. **Decide.** Keep it, revert it, or iterate further. A kept change is worth its own small
   commit; commits are your undo log here, not ceremony.

Skip the full test suite, the linter, and any packaging step on every single tweak, and save that
gate for once, at the end; none of them catch a design judgment call, and running them per
iteration is the latency this loop exists to cut. Every several iterations, step back from the
element you were tuning and look at the whole page: check a narrow viewport and a wide one, since
a change that reads right in isolation can still throw off the spacing or color around it.

When the design is settled, run the site's full checks the way you would for any other change,
commit, push, and deploy as usual, then load the live site once and confirm it matches what you
saw locally.

## Extending the component model

The directive registry (`cairn.config.ts`), the chrome, the page compositions, and the
token-styled DaisyUI primitives are copy-in `.svelte` files your site owns outright, with no
version lock on how they look. Extend the registry with your own markdown-authored components,
or add a page composition of your own, the same way the showcase's own home and article views
are built. Reach for `composition.css`'s primitives (`.cairn-card`, `.cairn-band`,
`.cairn-section`, `.cairn-hero`, `.cairn-sidebar-layout`) instead of hand-rolling a card or a
two-column layout from scratch; each exposes its own `--cairn-<primitive>-*` custom properties
for a per-instance override on top of the shared tokens it defaults from.

## Subtracting a piece you don't need

The chassis is deliberately generous, not minimal, and every file in it names its real
dependents so a removal is a bounded, checkable edit rather than a guess. `feed.ts`, for
example, has exactly two dependents (the two feed routes); delete the file and those two route
bodies and nothing else changes. `content.ts` is load-bearing for six delivery routes at once
and isn't a bare deletion; a theme dropping it replaces all six routes' imports with its own
index logic in the same change. See `src/chassis/README.md` in your own repository for the full
dependents table before removing a piece: an ultra-light theme is free to rebuild, ditch, or
simplify any of it, but check the real dependents first rather than assuming.

## You know it worked when

`/styleguide` renders every directive without a dangling token, an AA contrast check against your
own edit passes in both light and dark, and the reading surface (any body of prose) carries the
same contrast and type rhythm as the rest of the page with no separate CSS of its own.
