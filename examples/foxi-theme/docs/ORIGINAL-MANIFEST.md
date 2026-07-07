# Foxi: original manifest

This is the exhaustive line-by-line inventory of the **original** Foxi theme, the artifact the
cairn port (`examples/foxi-theme`) must be checked against. It enumerates the original only. It
does not describe, inspect, or grade this repo's port; a separate verification pass grades each
line below against the port and records the verdict.

## Sources

- **Live demo**: <https://foxi.netlify.app>, crawled headless (Playwright, `playwright-core` from
  `examples/showcase/node_modules`, a real browser UA) across all twelve routes, plus
  `robots.txt`, `sitemap-index.xml`, and `sitemap-0.xml` fetched directly. The live build's page
  titles, meta descriptions, `<h1>`s, nav links, footer links, and 404 status all matched the
  upstream source byte-for-byte at crawl time (2026-07-06), so the source below is confirmed
  current.
- **Upstream repository**: `oxygenna-themes/foxi-astro-theme` (MIT), cloned shallow to the
  scratchpad and read in full: every page (`src/pages/`), every block and UI component
  (`src/components/`), every data file (`src/data/json-files/`), every config file
  (`src/config/`), the layouts, the global stylesheet, and the Tailwind config. This is the same
  upstream this port's own `README.md` and `LICENSE-FOXI` already credit and re-verify against.

## Grading legend (for the verifier, not used in this document)

- **MATCHED**: the port reproduces this line at the family responsive standard (glance-
  indistinguishable at normal viewing; theme ports carry no license to diverge on visible design).
- **IMPROVED**: the port diverges deliberately and the divergence is a strict improvement (for
  example, the family's five-viewport bar at the extremes, where a theme port's bar is beating the
  original at 320 and 2560).
- **DEFERRED-WITH-SANCTION**: the port deliberately omits or substitutes this line under a
  standing, already-recorded license (no clearance to redistribute third-party or proprietary
  art, or a structural simplification this repo's own docs already name). Every line below marked
  `[SANCTION]` is a candidate for this verdict; it is not automatically graded that way; the
  verifier confirms the substitution is faithful to what is sanctioned, not merely absent.

This document assigns no verdicts. Every checklist line below ends unmarked, for the verifier to
complete.

---

## A. Page templates (12 distinct templates)

### A1. Home (`/`)

- [ ] Route renders at `/`, SEO title "Foxi | Your Productivity Toolkit". **Grade:** _______________
- [ ] Hero band (`HomeCTA`): eyebrow chip "30K+ satisfied customers" with a 3-avatar overlapping
      group, `<h1>` "Enhance team **performance** with seamless integration", one-line subhead,
      single primary button "Get started for free" (link `/`), hero screenshot image below,
      offset downward by `translate-y-8` and shadow. **Grade:** _______________
- [ ] Feature grid band (`FeatureCards`): centered heading "Innovative tools to **transform** your
      workflow" + subhead, then a 3-column, unevenly-spanned card grid: one large card (column 1,
      full height), two stacked cards (column 2), two stacked cards (column 3): 5 cards total,
      each with its own illustration, title, subtitle, and link to `/features`. **Grade:** _______________
- [ ] Dark testimonial band (`Testimonial`, dark mode, background image `bgPosition="right"`):
      single centered blockquote (default copy "Foxi is like a rocket boost..."), attribution
      "Sheryl Sandberg, CEO, Facebook", large decorative quote glyph. **Grade:** _______________
- [ ] Four alternating highlight rows (`HightlightRows` → `TextImage`), each a two-column
      text+image band, alternating image left/right, zero vertical padding between adjacent rows
      so they read as one continuous stack:
  - [ ] Row 1, image right: "Complete Project **Visibility**". **Grade:** _______________
  - [ ] Row 2, image left: "Advanced **Automation** Tools". **Grade:** _______________
  - [ ] Row 3, image right: "**Effective** Team Collaboration". **Grade:** _______________
  - [ ] Row 4, image left: "Robust Data **Security**". **Grade:** _______________
  - [ ] Each row's image has a distinct mobile-only SVG variant swapped in under `max-width:
      1024px` via `<picture><source media>`. **Grade:** _______________
- [ ] Closing CTA band (`CTA/BasicDark`): dark card with a background image, chip notification
      "#1 Product of the Year, Product Hunt" with a badge icon, headline "Join Over 30,000
      Satisfied Users!", single primary button "Get started now!". **Grade:** _______________

### A2. Features (`/features`)

- [ ] Route renders at `/features`, SEO title "Foxi | Features to Boost Productivity & Security". **Grade:** _______________
- [ ] Page-header band: `<h1>` "Why you and your team will **love** foxi.", one-line subhead. **Grade:** _______________
- [ ] Five sticky-sidebar feature bands (`FeatureSticky`), each pinning a category title+text in a
      left sidebar (sticky on desktop, `lg:sticky lg:top-32`) against a 3-column icon-led feature
      grid on the right, alternating background tint (bands 2 and 4 tinted `neutral-50` /
      `neutral-900`):
  - [ ] Band 1 "Insightful Analytics": 7 features (Analytics category). **Grade:** _______________
  - [ ] Band 2 "Efficiency Unleashed" (tinted): 7 features (rendered from the Security-tagged
      data despite the "Efficiency Unleashed"/productivity-sounding heading; this mismatch between
      the band's own copy and the underlying category filter is in the original source verbatim). **Grade:** _______________
  - [ ] Band 3 "Ultimate Data Protection": 7 features (rendered from the Productivity-tagged
      data; same category/heading mismatch as band 2, mirrored). **Grade:** _______________
  - [ ] Band 4 "Seamless Connectivity" (tinted): 7 features (Integrations category). **Grade:** _______________
  - [ ] Band 5 "24/7 Expert Help": 10 features (Support category). **Grade:** _______________
- [ ] Closing CTA band (`CTA/BasicDark`), same component as the home page's closing CTA. **Grade:** _______________

### A3. Pricing (`/pricing`)

- [ ] Route renders at `/pricing`, SEO title "Foxi | Pricing made simple". **Grade:** _______________
- [ ] Page-header band: `<h1>` "Choose the plan that works for **your** needs", subhead "All plans
      come with a 30-day money-back guarantee.". **Grade:** _______________
- [ ] Pricing table band (`PricingColumns`): a monthly/annual toggle row (label "Bill monthly" /
      switch / label "Bill annually", annual side highlighted in primary color by default) above
      three pricing cards (Basic $19/mo, Team $29/mo featured, Enterprise $49/mo, each annual
      price paired with a hidden monthly price that cross-fades in on toggle); the middle
      (Team/"featured") card is visually distinguished with the primary brand color as its card
      background. **Grade:** _______________
- [ ] Trust-logo band (`SocialProof`): centered caption "Trusted by **50,000+** businesses" over 6
      flat, horizontally laid out real company logos. **Grade:** _______________
- [ ] "What's included" feature band (`FeatureList`): centered heading "Whats included on **all**
      foxi plans" [sic, "Whats" without an apostrophe is in the original], 4-column grid of the
      first 8 entries from the full 38-item feature dataset (unfiltered by category, in dataset
      order). **Grade:** _______________
- [ ] Dark testimonial band (`Testimonial`, second background image, `bgPosition="left"`): a
      distinct pricing-page-only quote ("Foxi isn't just an app...") attributed to "Max Widgetson,
      CEO, Widgetify Ltd". **Grade:** _______________
- [ ] Pricing FAQ band (`FAQ/Basic`, tinted `slate-50`/`neutral-900/40`): centered heading
      "Demystifying **pricing,** common queries resolved" + subhead, 5 accordion items in one
      bordered, divided card, all closed by default (this band's 5 Q&As are hand-written directly
      in the component, not sourced from `faqData.json`). **Grade:** _______________
- [ ] Closing CTA band (`CTA/BasicDark`), same component as the home page's closing CTA. **Grade:** _______________

### A4. FAQ (`/faq`)

- [ ] Route renders at `/faq`, SEO title "Foxi | Get Your Questions Answered with a Smile". **Grade:** _______________
- [ ] Page-header band: `<h1>` "Get Answers to Your **Foxi** Questions.", subhead "Find answers to
      common questions about Foxi". **Grade:** _______________
- [ ] Sticky-sidebar accordion band 1 (`FaqSticky`), title "Understanding Our Pricing Plans": 6
      accordion items filtered from `faqData.json` where `category: "pricing"`, first item open by
      default (`open: true` in the data), the rest closed. **Grade:** _______________
- [ ] Mid-page text+image band (`TextImage`, tinted `neutral-50`/`neutral-900`, extra-large
      vertical padding `lg:!py-64`, image offset absolutely on desktop): "Why Foxi's Pricing Plans
      Offer Great Value". **Grade:** _______________
- [ ] Sticky-sidebar accordion band 2 (`FaqSticky`), title "Integrations Made Easy": 6 accordion
      items filtered from `faqData.json` where `category: "integrations"`, first item open by
      default, the rest closed. **Grade:** _______________
- [ ] Closing CTA band (`CTA/BasicDark`). **Grade:** _______________
- [ ] `faqData.json`'s third category, `features` (5 items), is present in the shipped data file
      but is never filtered onto any page; it is orphaned content in the original. **Grade:** _______________

### A5. Contact (`/contact`)

- [ ] Route renders at `/contact`, SEO title "Foxi | Get in Touch with Us". **Grade:** _______________
- [ ] Contact-hero band (`ContactHero`, tinted `neutral-50`/`neutral-950/80`): two-column band,
      left side a title+text ("Get Answers to Your **Foxi** Questions." reused verbatim from the
      FAQ page's own header copy) vertically centered, right side a contact form card (First
      Name, Last Name, Email [pre-filled placeholder value `name@youremail.com`, required], Phone
      Number, Message textarea, single "Submit" button). **Grade:** _______________
- [ ] "Reason to reach out" card band (`ContactCards`, tinted `neutral-950/80`): centered heading
      "Have a Special Request? We're Here to **Help!**" + subhead, 4 icon-led cards in a row
      (Customer Support / Sales Inquiries / Feature Requests / General Feedback), each linking
      back to `/contact`. **Grade:** _______________
- [ ] Trust-logo band (`SocialProof`, tinted `neutral-950/80`), same component and logo set as the
      pricing page. **Grade:** _______________
- [ ] Closing CTA band (`CTA/BasicDark`). **Grade:** _______________

### A6. Changelog (`/changelog`)

- [ ] Route renders at `/changelog`, SEO title "Foxi | Version Updates and Improvements"; its meta
      description is copy-pasted verbatim from the `/features` page's own SEO block (the two
      pages' titles differ, but the description string is byte-identical between them in the
      original source; the mismatch is in the shipped site, not an error introduced by this
      manifest). **Grade:** _______________
- [ ] Page-header band: `<h1>` "Foxi Version Updates and **Enhancements**", subhead. **Grade:** _______________
- [ ] Vertical timeline/feed band (`BasicFeed` → `Feed`): 6 dated version entries (v1.0.1 through
      v1.0.6, newest first), each with a date rail, a dot-and-dashed-rail connector, a bold title,
      rich-text body (paragraphs and bullet lists, rendered from HTML strings in the data file),
      and a screenshot image for the 4 most recent entries (the 2 oldest entries carry no image). **Grade:** _______________
- [ ] Closing CTA band, the **light** variant (`CTA/BasicLight`, not the dark variant every other
      page closes with): plain card, no background image, a 5-star rating row with the inline
      text "30K customer ratings" set beside the stars, in place of the badge chip, headline "Join
      the Foxi Revolution!". **Grade:** _______________

### A7. Terms (`/terms`)

- [ ] Route renders at `/terms`, SEO title "Foxi | Terms of Service". **Grade:** _______________
- [ ] Page-header band: `<h1>` "Terms and Conditions: Read, Relax, **Enjoy!**", subhead. **Grade:** _______________
- [ ] Three sticky-sidebar prose bands (`StickySidebar`), each a legal-document-style section with
      a short sidebar summary on the left (sticky on desktop) and full prose (headed
      sub-sections) on the right, using the shared `.basic-text` prose styling:
  - [ ] Band 1 "Introduction" (untinted): "Welcome to Foxi", "Acceptance of Terms", "Our
      Commitment to You". **Grade:** _______________
  - [ ] Band 2 "User Accounts" (tinted `neutral-50`/`neutral-900`): "Registration", "Account
      Security", "Account Usage". **Grade:** _______________
  - [ ] Band 3 "Limitation of Liability" (untinted): "General Limitations", "Third-Party
      Services", "Maximum Liability". **Grade:** _______________
- [ ] No closing CTA band; Terms is the one marketing-adjacent page that ends directly after its
      last content band. **Grade:** _______________

### A8. Blog index (`/blog`)

- [ ] Route renders at `/blog`, SEO title "Foxi | Latest Foxi News and updates". **Grade:** _______________
- [ ] Page-header band: `<h1>` "The **Foxi** Blog. Tips, Updates & Stories", subhead. **Grade:** _______________
- [ ] Tag-navigation pill row (`TagNavigation`) above the grid: an "All" pill plus one pill per
      distinct tag across all posts, the active pill (by current path) rendered in the primary
      color, the rest neutral. **Grade:** _______________
- [ ] 3-column post-card grid (`BlogPosts` → `BlogCard`), all 6 posts, sorted newest-`pubDate`-
      first; each card: full-bleed cover image (no card padding around it), title (linked),
      byline "By {author} on {long-form date}", excerpt (the post's `description` frontmatter,
      not a body excerpt), and a row of tag pills below a divider. **Grade:** _______________

### A9. Blog post (single) (`/blog/{id}`), 6 posts

- [ ] Route renders per post at `/blog/welcome`, `/blog/mobile-app`, `/blog/security`,
      `/blog/user-feedback`, `/blog/team-collaboration`, `/blog/user-stories`; SEO title
      `"{post title} | Foxi"`. **Grade:** _______________
- [ ] Post-hero band (`BlogPostHero`, tinted `neutral-50`/`neutral-900`): breadcrumb trail (Home /
      blog / {post-id}), `<h1>` post title, byline line reading **"Written by, {author} on
      {long-form date}"** [the comma directly after "Written by" is present in the original
      source verbatim, not a typo introduced here], row of tag badges below. **Grade:** _______________
- [ ] Post body (`.post-body.basic-text.basic-text--lg`, max-width `3xl`, generous vertical
      padding): the post's own markdown content, rendered with the shared prose rules (see
      typography section D). **Grade:** _______________
- [ ] Each of the 6 posts individually:
  - [ ] "Welcome to Foxi!" (2024-04-04, author Eleni K, tags `productivity`, `announcement`), body
      opens with prose then a full-width inline image. **Grade:** _______________
  - [ ] "Foxi Mobile App Launch" (2024-04-05, author Eleni K, tags `app`, `announcement`), body
      has a "### Features" sub-heading, no inline image. **Grade:** _______________
  - [ ] "User feedback on foxi" (2024-05-05, author Eleni K, tags `productivity`, `app`). **Grade:** _______________
  - [ ] "Security Enhancements now here!" (2024-05-05, author Christos P, tags `productivity`,
      `app`), body opens with prose then an inline image. **Grade:** _______________
  - [ ] "Enhancing Team Collaboration" (2024-06-04, author Eleni K, tags `app`, `announcement`),
      body opens with an inline image, then prose. **Grade:** _______________
  - [ ] "Celebrating User Success Stories" (2024-06-04, author Eleni K, tags `reviews`,
      `announcement`), body opens with an inline image, then a "### Success Stories" sub-heading. **Grade:** _______________

### A10. Blog tags index (`/blog/tags`)

- [ ] Route renders at `/blog/tags`; unlike every other route, this page passes **no** SEO props
      (falls back to the site-wide default title/description, `configData.siteTitle` /
      `siteDescription`, which is the agency-boilerplate copy, not blog copy). **Grade:** _______________
- [ ] `<h1>` "Tags" only (no subhead text, since `Hero` is called with only a `title` prop). **Grade:** _______________
- [ ] Renders the **full, unfiltered** post grid (`BlogPosts` with all posts, not one filtered per
      tag); this route does not actually list tags or filter by tag despite its name and route. **Grade:** _______________

### A11. Blog single tag (`/blog/tags/{tag}`), one route per distinct tag

- [ ] Routes generated per tag present across all posts (`app`, `announcement`, `productivity`,
      `reviews`) at build time; SEO title `` `Foxi | posts tagges as {tag}` `` [the misspelling
      "tagges" for "tagged" is in the original source verbatim]. **Grade:** _______________
- [ ] `<h1>` `` `Foxi posts about<br><strong>{tag}</strong>` ``, subhead with a second literal
      typo, "Stay informed, stay productive with all the latest **fromFoxi**." (missing space). **Grade:** _______________
- [ ] Renders the post grid (`BlogPosts`) filtered to only the posts carrying that tag. **Grade:** _______________

### A12. 404 (`/this-page-does-not-exist` and any unmatched path)

- [ ] SEO title "Oops! Foxi Lost the Trail - Page Not Found", description in the fox/trail voice. **Grade:** _______________
- [ ] Centered, single-column layout (no header/footer chrome difference; it still renders inside
      the normal `Layout`). **Grade:** _______________
- [ ] Large custom SVG illustration (viewBox `0 0 433 338`): a magnifying glass over a circular
      "404" numeral mark plus the "PAGE NOT FOUND" wordmark rendered as vector paths, with small
      scattered plus-shaped dot decorations around it, all colored to answer light/dark mode via
      Tailwind dark-variant fill classes. **Grade:** _______________
- [ ] Single "Return to homepage" button (link `/`) with a trailing long-arrow-right icon. **Grade:** _______________
- [ ] Confirmed live: an unmatched path returns HTTP 404 with this template, not a generic host-
      level error page. **Grade:** _______________

---

## B. Site-wide chrome

### B1. Header / navigation bar

- [ ] Sticky header (`position: sticky; top: 0`), translucent white/dark background with backdrop
      blur on large screens, height `5.5rem`. **Grade:** _______________
- [ ] A CSS scroll-driven shadow fade-in (`animation-timeline: scroll()`, range `0% 20rem`, no
      JavaScript): the header gains a drop shadow as the page scrolls past the first ~20rem,
      separately tuned shadow color for light and dark mode. **Grade:** _______________
- [ ] Logo mark + "Foxi." wordmark, linking to `/`. **Grade:** _______________
- [ ] Primary nav items: Home, Pricing, Features, Resources (submenu-only, `#` href), Contact. **Grade:** _______________
- [ ] "Resources" is a click-toggled (not hover) dropdown submenu containing Blog, Changelog, FAQ,
      Terms; opens on click, closes on an outside click, chevron icon rotates 180° while open. **Grade:** _______________
- [ ] Active-page nav item is colored in the primary brand color (path-match, exact or trailing
      slash). **Grade:** _______________
- [ ] Light/dark mode toggle icon (sun/moon swap by `dark:` variant, no separate icon states to
      animate between) sitting inline in the nav. **Grade:** _______________
- [ ] Single nav action button, "Try it now" (large, primary style), which opens the sign-up modal
      rather than navigating. **Grade:** _______________
- [ ] Mobile (`<lg`): hamburger toggle button whose three bars animate into an X on open; the nav
      menu becomes a full-viewport-height (`h-dvh`) overlay panel that scrolls independently; the
      "Try it now" action bar becomes fixed to the bottom of the viewport, visible only while the
      menu is open. **Grade:** _______________

### B2. Footer

- [ ] Two-tier footer: a main tier (light gray / near-black background) and a sub-footer tier
      (slightly different gray tone, border-separated). **Grade:** _______________
- [ ] Main tier, 4-column layout on desktop (logo+about column spans wider than the nav columns):
  - [ ] Column 1: logo mark + "Foxi." wordmark (linked to `/`), one paragraph of boilerplate
      about-text (the agency-description copy, not product copy). **Grade:** _______________
  - [ ] Column 2 "Product": Features, FAQ, Pricing, Changelog, Terms. **Grade:** _______________
  - [ ] Column 3 "About us": About us (→ `/`), News (→ `/blog`), Careers (→ `/blog`) [Careers
      points at the blog, not a distinct page, in the original]. **Grade:** _______________
  - [ ] Column 4 "Get in touch": Contact, Support, Join us (all three → `/contact`). **Grade:** _______________
- [ ] Sub-footer tier, two-column row: copyright text left ("© Foxi 2024."), social icon row
      right (Facebook, Twitter/X, Discord glyphs, each linking to `/` in the original, i.e. no
      real destination URLs are wired up upstream). **Grade:** _______________

### B3. Sign-up modal

- [ ] Triggered by any element with `data-modal="signup"` (the header's "Try it now" button); a
      centered, translucent-backdrop overlay panel, dismissible by backdrop click or a close (X)
      button. **Grade:** _______________
- [ ] Title "Sign up", one line of copy, an email input, a full-width primary "Sign up" submit
      button, an "or" divider, and a full-width white/outlined "Signup with Google" button with a
      Google "G" logo icon. **Grade:** _______________

### B4. Toast

- [ ] A dismissible bottom-right toast, "Ready to go bigger?" headline, promoting Foxi Pro and
      linking out to `astro.build/themes/details/foxi-pro` and `oxygenna.com/themes`. **Grade:** _______________
- [ ] Appears 3 seconds after page load on first visit; once dismissed, stays hidden for 7 days
      (tracked via a `localStorage` timestamp), then can reappear. **Grade:** _______________

---

## C. Interactive behaviors

- [ ] **FAQ / question accordions** (native `<details>`/`<summary>`, no JavaScript): any number of
      items open simultaneously; a "+" glyph rotates 45° into an "×" on open; used on the pricing
      page's FAQ band, both FAQ-page accordion bands, and nowhere else. **Grade:** _______________
- [ ] **Pricing monthly/annual toggle**: a single checkbox-styled switch drives all three pricing
      cards at once via a small script (`PricingPlanChange`) that toggles a `pricing--monthly` /
      `pricing--annualy` class on each card by a fixed list of 3 element ids; the annual and
      monthly price blocks are both always in the DOM and cross-fade via `translate-y`/`opacity`
      transitions, not re-rendered. **Grade:** _______________
- [ ] **Light/dark mode**: three site-wide modes configured at build time (`auto`, `light`,
      `dark`; the live site ships `auto`); in `auto` mode, a small inline script reads
      `prefers-color-scheme` on first load and a `localStorage.theme` override thereafter, toggled
      by clicking the header's sun/moon icon; state persists across navigations (this is an MPA
      with Astro's View Transitions, not an SPA, so the script re-runs on every
      `astro:page-loaded`/`astro:after-swap` event). **Grade:** _______________
- [ ] **Scroll-reveal animation**: every grid `.col` element fades up (`opacity 0→1`,
      `translate-y` in) the first time it enters the viewport (`IntersectionObserver`), staggered
      by up to 12 sibling positions (delays from 50ms to 875ms); disableable by removing one root
      class. **Grade:** _______________
- [ ] **Mobile nav toggle** and **Resources dropdown** (see B1). **Grade:** _______________
- [ ] **Sign-up modal** open/close (see B3) and **toast** dismiss-and-remember (see B4). **Grade:** _______________
- [ ] **Sticky sidebars** (`FeatureSticky`, `FaqSticky`, `StickySidebar`/Terms): plain CSS
      `position: sticky` on the left column at `lg` and above; no scroll-jacking, no JS-driven
      pinning. **Grade:** _______________
- [ ] **Contact form**: client-side only in the original (`method="post"`, `novalidate`, no
      `action` wired up); native HTML5 field validation styling (`invalid:`/`peer-invalid:`
      variants) is present on every input, but there is no working submit handler upstream. **Grade:** _______________
- [ ] Blog tag pills, nav items, and footer links are plain anchors; there is no client-side
      filtering anywhere on the blog (each tag is its own statically generated route). **Grade:** _______________

---

## D. Typographic devices

- [ ] Two type families: **Inter Variable** for body text, **Outfit Variable** for all headings
      (`font-headings`), both loaded as variable fonts via `@fontsource-variable`. **Grade:** _______________
- [ ] Heading scale: `h1` 36px→60px (`text-4xl lg:text-6xl`), `h2` 30px→48px, `h3` 24px→30px, `h4`
      20px→24px, `h5` 18px→20px, `h6` 16px→18px (mobile size → `lg:` size); `h1`–`h3` are bold,
      `h4`–`h6` semibold. **Grade:** _______________
- [ ] `<strong>` inside any heading is recolored to the primary brand pink rather than just
      bolded (headings are already bold/semibold, so plain `font-weight` would be invisible). **Grade:** _______________
- [ ] Body copy default color is a cool gray (`neutral-500` light / `neutral-400` dark), not pure
      black/white, on a white/near-black (`neutral-950`) page background. **Grade:** _______________
- [ ] A `.highlight` utility class recolors inline text to the primary pink (used for standalone
      emphasis outside headings, e.g. "Trusted by **50,000+** businesses"). **Grade:** _______________
- [ ] A `.small` utility class for de-emphasized fine print (`text-sm`, muted gray). **Grade:** _______________
- [ ] Blockquotes (`.basic-text blockquote`, used in post bodies): bordered, tinted card with a
      large decorative oversized quotation-mark glyph bleeding from the top-left, rendered via a
      CSS `content: '"'` pseudo-element, not an image. **Grade:** _______________
- [ ] Prose body images (`.basic-text img`): bordered, rounded corners, and on desktop the
      containing paragraph breaks out past the text column's own margins (`lg:-mx-12`). **Grade:** _______________
- [ ] Prose list items: disc markers colored in the primary brand pink (`marker:text-primary-500`)
      rather than default black. **Grade:** _______________
- [ ] The color system is two named scales only, `primary` (brand pink, `#E2187D` at 500) and
      `neutral` (cool blue-gray), no separate "secondary"/accent hue. **Grade:** _______________
- [ ] Buttons: three sizes (`sm`/`base`/`lg`), four style variants (`primary`/`secondary`/
      `neutral`/`white`), plus `outline` and `link` variations that recolor rather than restructure
      the same base class. **Grade:** _______________
- [ ] Badges/pills (tag chips, blog tags): small rounded-rectangle chips, two color states
      (neutral gray / primary pink for "active"). **Grade:** _______________

---

## E. Images and artwork inventory (with identity)

Every distinct visual asset the original bundles, one line each. Lines marked `[SANCTION]` are
assets this port's own credits section (`README.md`) already records as licensed-for-substitution
rather than licensed-for-reproduction (product screenshots, a third party's own trademark, or
implied photography this repo has no clearance to redistribute); the verifier confirms the
substitution matches what is on record, not that the asset was reproduced.

- [ ] `public/logo.svg` / `public/favicon.svg` (byte-identical files): Foxi's own multi-tone
      faceted fox-head brand mark, used as the header logo, footer logo, and browser favicon. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/hero-01.png` (990×650 PNG): the home hero's product-screenshot
      mockup, offset below the hero copy with a drop shadow. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/cards/feature-01.svg` through `feature-05.svg` (5 distinct
      illustrated dashboard/app-window mockups, 4–17 KB each): the home page's feature-grid card
      illustrations. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/highlights/highlight-01.svg` through `highlight-04.svg`, each with
      a matching `-mobile.svg` variant (8 files total): the four illustrated app-screenshot panels
      in the home page's alternating highlight rows. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/testimonial-bg-01.webp` and `testimonial-bg-02.webp`: the two dark
      testimonial bands' background images (home page and pricing page use different ones); the
      testimonial itself implies a named person's photo/portrait that the original never actually
      shows (no avatar image accompanies either testimonial quote in the markup). **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/cta-dark-bg.png`/`.webp`: the dark CTA band's background image
      (home and features pages). **Grade:** _______________
- [ ] `src/assets/cta-light-bg.png`: present in the asset folder but not referenced by any
      component in the current source (dead asset in the original). **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/badge.svg` (a generic trophy/award-ribbon illustration, not a
      literal Product Hunt trademark): the home/features CTA's "#1 Product of the Year" chip icon. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/avatars/avatar-01.png`/`.webp` through `avatar-03` (used) and
      `avatar-04` through `avatar-10` (present but unused in the current source): the home hero's
      3-avatar "satisfied customers" chip. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/faq/faq-01.png` (1000×607 PNG, used): the FAQ page's mid-page text-
      and-image band; `faq-02.png` through `faq-05.png` are present in the asset folder but
      unreferenced by any component in the current source. **Grade:** _______________
- [ ] `[SANCTION]` `src/assets/logos/airtable-logo.svg`, `asana-logo.svg`, `basecamp-logo.svg`,
      `evernote-logo.svg`, `notion-logo.svg`, `slack-logo.svg`: the trust-logo row on the pricing
      and contact pages, each a real third party's own trademarked mark. **Grade:** _______________
- [ ] `[SANCTION]` `public/blog/post-01-cover.png` through `post-06-cover.png` (1200×800, one per
      post): the blog index/card cover images. **Grade:** _______________
- [ ] `[SANCTION]` `public/blog/post-01.png` through `post-06.png` (1200×500, one per post, save
      `mobile-app.md` which has no inline image): the blog post bodies' own inline illustrations. **Grade:** _______________
- [ ] `[SANCTION]` `public/feeds/feed-01.png` through `feed-04.png` (1200×500 each, plus an unused
      `feed-01.svg`): the changelog timeline's 4 most-recent-entry screenshots (the 2 oldest
      changelog entries carry no image in the original data). **Grade:** _______________
- [ ] `public/og.jpg` (1200×630 JPEG): the single site-wide Open Graph/Twitter-card image, reused
      identically on every page (no per-page or per-post OG image). **Grade:** _______________
- [ ] The 404 illustration (inline SVG in `src/pages/404.astro`, viewBox `0 0 433 338`): Foxi's own
      vector artwork (a magnifying glass, a circular badge, and the "PAGE NOT FOUND" wordmark
      rendered as paths), no photography or third-party mark, portable verbatim. **Grade:** _______________
- [ ] `src/icons/fb-icon.svg`, `twitter-icon.svg`, `discord-icon.svg`: the footer's three social
      glyphs, plain brand-shaped icons, portable verbatim. **Grade:** _______________
- [ ] The remaining `src/icons/*.svg` set (~45 files: bolt, rocket, shield-check, chevron-down,
      plus, chat bubbles, and so on): generic line icons used throughout `Feature`, `Accordion`,
      `Badge`, form fields, and the nav chevron; not bespoke Foxi artwork. **Grade:** _______________
- [ ] `src/assets/bg-01.png` and `src/assets/test.jpg`: present in the asset folder, unreferenced
      by any component in the current source (dead assets in the original). **Grade:** _______________

---

## F. Feeds, OG, sitemap, robots, 404

- [ ] **Sitemap**: `@astrojs/sitemap` integration, generating `/sitemap-index.xml` (one child
      sitemap, `/sitemap-0.xml`) listing all 19 prerendered routes with a trailing slash on every
      entry: `/`, `/blog/`, one entry per blog post (6), `/blog/tags/`, one entry per distinct tag
      (4), `/changelog/`, `/contact/`, `/faq/`, `/features/`, `/pricing/`, `/terms/` (confirmed
      live); the tag-index route (`/blog/tags/`) and every per-tag route are included in the
      sitemap despite `/blog/tags/`'s own page rendering the unfiltered full post grid (A10). **Grade:** _______________
- [ ] **Robots**: `/robots.txt` is a static two-line policy, `Allow: /` for all user agents, plus a
      `Sitemap:` directive pointing at `/sitemap-index.xml`. **Grade:** _______________
- [ ] **Open Graph / Twitter Card**: every page emits `og:type`, `og:url`, `og:title`,
      `og:description`, `og:image`, and the parallel `twitter:*` set (card type
      `summary_large_image`); `og:image` is always the single site-wide `/og.jpg`, never a per-
      page image. **Grade:** _______________
- [ ] **Canonical link**: every page emits `<link rel="canonical">` pointed at its own current URL. **Grade:** _______________
- [ ] **No RSS/Atom feed**: despite a UI component literally named `Feed` (used for the changelog
      timeline), the original ships no syndication feed of any kind, no `@astrojs/rss` dependency,
      and no `/rss.xml` or `/feed.xml` route; "Feed" here names only the visual list device. **Grade:** _______________
- [ ] **404**: see A12 above; confirmed live to return HTTP 404 for an arbitrary unmatched path,
      rendering the themed illustration page rather than a host-default error page. **Grade:** _______________
- [ ] **`theme-color` meta**: fixed to `#134e4a` (a dark teal) in `<head>`, which does not match
      the site's own primary brand color (`#E2187D`, a pink); this mismatch is in the original
      source verbatim. **Grade:** _______________

---

## G. Footer link inventory (complete, confirmed live)

| Link text | Destination | Column |
| --- | --- | --- |
| Foxi. (logo) | `/` | brand |
| Features | `/features` | Product |
| FAQ | `/faq` | Product |
| Pricing | `/pricing` | Product |
| Changelog | `/changelog` | Product |
| Terms | `/terms` | Product |
| About us | `/` | About us |
| News | `/blog` | About us |
| Careers | `/blog` | About us |
| Contact | `/contact` | Get in touch |
| Support | `/contact` | Get in touch |
| Join us | `/contact` | Get in touch |
| (Facebook glyph) | `/` | sub-footer, social |
| (Twitter/X glyph) | `/` | sub-footer, social |
| (Discord glyph) | `/` | sub-footer, social |

- [ ] All 15 footer links present and pointed exactly as listed above (three "Get in touch" links
      and all three social glyphs point at `/contact` and `/` respectively in the original, not
      distinct destinations; this is not a placeholder this manifest introduced). **Grade:** _______________
- [ ] Copyright line "© Foxi 2024." in the sub-footer, left-aligned against the social row. **Grade:** _______________

---

## Summary counts (for the verifier's own tracking, not a grade)

- 12 distinct page templates (A1–A12).
- 4 site-wide chrome pieces (header/nav, footer, sign-up modal, toast).
- 9 named interactive behaviors.
- 11 named typographic devices.
- 29 distinct image/artwork lines, 15 of them `[SANCTION]`.
- 3 delivery-surface lines (sitemap, robots, OG/canonical) plus the no-RSS finding and the 404
  confirmation.
- 15 footer links across 3 columns plus the brand line and 3 social glyphs.
