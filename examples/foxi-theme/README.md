# Foxi, a cairn theme

A port of [Foxi](https://github.com/oxygenna-themes/foxi-astro-theme), Oxygenna's free Astro and
Tailwind CSS SaaS marketing theme, expressed as a cairn theme on the chassis
(`examples/showcase/src/chassis`, copied verbatim here at port time; see
`src/chassis/README.md`). This is port 2 of the theme-ports-1-3 pass
(`docs/superpowers/plans/2026-07-05-theme-ports-1-3.md`), and its own capability test: the
composed-page/marketing-section stress, whether a pricing table, a testimonial wall, a FAQ
accordion, and a feature grid express through cairn's chrome, composition, and token seams with
**zero engine changes**.

## Credits and attribution

Foxi's design, structure, and copy are by Oxygenna, released under the MIT license. The full
license text is reproduced in [`LICENSE-FOXI`](./LICENSE-FOXI), re-verified against the upstream
repository at port time (2026-07-06):

> Copyright (c) 2024 Oxygenna

None of Foxi's own Astro/TypeScript source is copied verbatim; every chrome component, route, and
stylesheet here is a fresh Svelte/CSS implementation of Foxi's visible design (the layout, the
type, the color roles, the interaction), built against cairn's own seams. This port's blog posts
and static marketing copy (pricing plans, FAQ answers, changelog entries, feature descriptions)
are reused from the upstream repository's own MIT-licensed content, adapted to cairn's content
model where the format differs. Each theme file that translates a specific Foxi source file names
it in its own doc comment (for example `PricingTable.svelte` names
`src/components/ui/pricing-tables/PricingTable.astro`), so the attribution travels with the code
it credits, not only this README.

Upstream: <https://github.com/oxygenna-themes/foxi-astro-theme>. Foxi's live demo is at
<https://foxi.netlify.app>.

## What this port demonstrates

Every distinct page template Foxi's own live demo ships is expressed here as a cairn composition:
the home page (hero, feature grid, testimonial, four alternating highlight rows, closing CTA), a
features listing (five category-grouped feature grids), a pricing page (a billing-toggle pricing
table with a featured tier, a trust logo row, a pricing FAQ), an FAQ page (three lead-in/accordion
bands), a contact page (a form, a row of "reason to reach out" cards), a changelog (a version
timeline), a blog index and tag filter, a single blog post, and a 404. The blog (`posts`) and the
Terms of Service page (`pages`) are cairn-managed markdown content; every marketing route (home,
features, pricing, FAQ, contact, changelog) is a hard-coded Svelte page built from this theme's own
composition components, since cairn's content model manages markdown documents, not page-builder
sections, and a pricing table or a testimonial wall is squarely the developer's own domain.

**Capability verdict:** every marketing-section device (the pricing table, the logo cloud, the FAQ
accordion, the feature grid, the testimonial band, the CTA banner, the changelog timeline) expresses
through the chassis's existing `.cairn-card`/`.cairn-band`/`.cairn-section`/`.cairn-hero` composition
primitives and DaisyUI's own components (`collapse`, `input`, `textarea`), with **zero chassis
edits** and **zero engine changes**. One primitive fought a specific layout (`.cairn-sidebar-layout`'s
fixed main-then-aside column order does not express the FAQ page's narrow-lead-in-then-wide-accordion
band, noted in that route's own comment; a plain Tailwind grid substitutes). The port also surfaced a
real, reproducible Tailwind v4 trap unrelated to cairn's own seams: declaring a custom
`--spacing-<name>` token under an key Tailwind's own named `max-w-*`/`w-*` scale also uses (`xs`,
`xl`, `2xl`) silently shadows that utility with the spacing value instead of Tailwind's built-in
container width, breaking any `max-w-xl`/`max-w-2xl` class used elsewhere in the theme; every
occurrence here was moved to the chassis's own `max-w-measure` token or a plain arbitrary value.

## Scope: what this port omits

This is a public-content-only port: it proves the theme seam, not the full site auth/commit
pipeline the showcase already proves. It ships no `/admin` mount, no D1, no R2, no email binding
(`src/chassis/README.md` documents the two chassis files this omits, `cairn.server.ts` and
`dev-gate.ts`). Foxi's own scroll-linked "sticky pin" animation on its highlight rows is rendered
here as a plain stacked section (a licensed structural simplification: a scroll-jacked animation is
not part of the static, at-rest design the family responsive standard measures), and the contact
form is presentational only (submitting it is the developer's own domain, per cairn's seam
boundary). A production site built from this port adds admin/auth back the way `examples/showcase`
does, and wires the form to its own handler.

Every "screenshot" panel on this port (the hero, the highlight rows, the blog covers, the
changelog entries) is an original `AppMockup` illustration, a schematic stand-in for Foxi's own
product photography, which this port has no clearance to redistribute; the testimonial band draws
a plain silhouette rather than a named person's photo, and the trust-logo row draws a monogram
badge per brand rather than tracing each company's own mark. Foxi's own truly decorative, non-
photographic vector art ports verbatim, since it carries no such licensing risk: the 404
illustration (`NotFoundIllustration.svelte`, from `src/pages/404.astro`), the brand mark
(`FoxiLogo.svelte`, from `public/logo.svg`) used in the header and footer, and the three footer
social-link glyphs (`SiteFooter.svelte`, from `src/icons/fb-icon.svg`, `twitter-icon.svg`, and
`discord-icon.svg`).

Every route in this port prerenders, so a request to a path with no matching page (a stale link, a
typo) has no static file of its own. Because `[...path]` is fully prerendered, SvelteKit strips it
from the runtime-routable manifest entirely: the built Worker has no route left to match against
an arbitrary bad path, so the `(site)` group's own layout never runs and its `(site)/+error.svelte`
never mounts for this case. `wrangler.jsonc`'s `assets.not_found_handling: "none"` (the explicit
default) is what lets that request reach the Worker at all, instead of Cloudflare's edge serving a
static file directly and bypassing the Worker; once the Worker runs, its bundled SvelteKit server
falls through to its own built-in default-404 handling, which renders the ROOT-level
`src/routes/+error.svelte` through a real SSR response. This works identically under `wrangler dev`
(the real `_worker.js`, assets and all) and on a live Cloudflare deployment, since both invoke the
same Worker the same way; a plain `vite preview` does not replicate the Worker/assets split at all,
so it cannot demonstrate this.

## Running it

```sh
npm install
npm run cairn:manifest   # generates src/content/.cairn/index.json
npm run dev              # or: npm run build && npm run preview
```
