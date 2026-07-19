# Build a theme on the chassis

<!-- SKELETON (Fable, 2026-07-06): the lines for the beta-blocking tutorial. Section 1
is worked as the pattern; the remaining sections follow its shape — goal, the steps with
real commands and real file contents, what you see at each checkpoint, one "why" aside.
The acceptance test for this tutorial is the ontology itself: a reader who follows it
rebuilds Waymark's essentials from the bare chassis, proving the boundary is real. The
docs voice: the Google developer style, the register machinery before merge. -->

You build a cairn theme by putting your design on top of the chassis: the plumbing layer
every cairn site shares. By the end of this tutorial you will have built a small blog
theme from the bare chassis—the same way Waymark, the flagship theme, is built—and
you will know which files are yours and which are the chassis's.

## 1. Start from the chassis

<!-- WORKED SECTION — the pattern for all others. -->

Copy the chassis into a fresh SvelteKit app:

```bash
npx sv create my-theme-site   # SvelteKit, TypeScript, no extras
cd my-theme-site
npm install @glw907/cairn-cms
cp -r node_modules/@glw907/cairn-cms/chassis-template/* src/
```

<!-- The consolidating release ships the chassis as a copyable template; until then the
tutorial's command copies from examples/showcase/src/chassis — update at release. -->

Look at what you copied. `src/chassis/` is the plumbing: content delivery, the token
system, the prose foundation, the composition primitives. You will not edit these files
in this tutorial, but they are yours (the chassis README documents every seam and what
you may remove). Everything you build next lives in `src/theme/`, which is empty. That
emptiness is the point: **a theme is everything that isn't chassis.**

Run the dev server:

```bash
npm run dev
```

You see an unstyled page listing your (empty) content. The chassis works before your theme
exists. You'll rely on that separation every time you change your design without touching your
plumbing.

> **Why a chassis?** Every cairn site shares the same delivery, tokens, and prose
> machinery. Keeping it in one copyable, documented layer means your design work never
> tangles with plumbing, and plumbing improvements arrive without disturbing your design.

## 2. Declare your content and tokens
<!-- TODO(tutorial pass): cairn.config.ts with one posts concept; theme.css with a
5-value token story (reference the club-grounds story as the worked example of HOW to
choose); the checkpoint: styled type, your colors. -->

## 3. Build the chrome
<!-- TODO: SiteHeader/SiteFooter on the composition primitives; the checkpoint: the
band rule (bands mark sections, cards mark objects, nothing gets both). -->

## 4. Compose the home page
<!-- TODO: the featured+archive home from concept queries; the checkpoint: real entries
rendering; the one-file theme test (what Waymark keeps in src/theme). -->

## 5. The reading surface
<!-- TODO: prose.css consumption, NOT modification; one component (callout) declared in
the grammar; the checkpoint: a post with the component rendering. -->

## 6. Make it yours, and keep it responsive
<!-- TODO: the five-viewport standard as the finishing gate; the pixel-diff rider in CI;
where to go next: the theme gallery's ports as worked examples, the chassis README's
removal notes for going ultra-light. -->
