# AstroPaper — Original Manifest

This is the specification for the cairn port. It enumerates the original AstroPaper theme
exhaustively — every page, section, image, behavior, and typographic device — captured
directly from the upstream source and the live demo. It does not grade the port; it is the
checklist the port is graded against.

**Grading convention.** Verify each line against the *live demo*, not against the port's own
plan or a paraphrase of it. Replace each `[ ]` with one of:

- `[MATCHED]` — present and equivalent
- `[IMPROVED]` — present, deliberately better, and the improvement is stated
- `[DEFERRED — reason]` — knowingly not built, with the sanctioning reason named inline

**Capture provenance**

- Upstream repo: `satnaing/astro-paper`, cloned 2026-07-06, commit at time of capture is the
  tip of `main` — package.json reports `astro-paper-v6` **v6.1.0**, Astro **v6.4.2**,
  Tailwind CSS **v4.3.0**.
- Live demo: `https://astro-paper.pages.dev`, crawled 2026-07-06 with Playwright/Chromium
  (desktop UA, 1440×900 and 390×844 viewports) from `examples/showcase`'s Playwright install.
  Screenshots saved under the session scratchpad (`astropaper-shots/`), not committed.
- This is AstroPaper's **v6 rewrite**: config lives in `astro-paper.config.ts` (not the older
  `src/config.ts`/`constants.ts` shape), search is **Pagefind** (not Fuse.js — that changed at
  v6), OG images use **Satori + sharp** (not `@vercel/og`), and callouts (Obsidian-style
  `[!NOTE]` etc.) are new in v6.1. Do not port against a mental model of an older AstroPaper
  version.

---

## 1. Site-wide feature flags in effect on the demo

The demo runs `astro-paper.config.ts` with these flags — the manifest below assumes them ON;
if the port's equivalent config differs, that's a deliberate site decision, not a fidelity gap:

- [ ] `lightAndDarkMode: true` — theme toggle is present in the header.
- [ ] `dynamicOgImage: true` — posts without a frontmatter `ogImage` get a generated `/posts/<slug>/index.png`.
- [ ] `showArchives: true` — `/archives/` exists and is linked in nav.
- [ ] `showBackButton: true` — post detail pages show a "← Go back" link above the title.
- [ ] `editPost.enabled: true`, url `https://github.com/satnaing/astro-paper/edit/main/` — post detail pages show an "Edit page" link.
- [ ] `features.search: "pagefind"` — `/search/` exists and is linked in nav via a search icon.
- [ ] `posts.perPage: 4` (posts/tag listing page size), `posts.perIndex: 4` (home page's Recent Posts count), `posts.scheduledPostMargin: 15min`.
- [ ] Socials configured: github, x, linkedin, mail (in that order) — shown in header-adjacent `Socials` block on home page and in the footer.
- [ ] Share links configured: whatsapp, facebook, x, telegram, pinterest, mail (in that order) — shown on post detail pages.
- [ ] `i18n`: single locale `en`, `prefixDefaultLocale: false` — no `/en/` prefix on any URL; `dir: "ltr"`.

---

## 2. Global chrome (present on every page)

### Header
- [ ] Visually-hidden "Skip to content" link is the very first focusable element on the page (confirmed: first Tab lands on `#skip-to-content`, off-screen until focused, then appears top-left).
- [ ] Wordmark: site title "AstroPaper" as bold text, links to home, left-aligned.
- [ ] Nav order, left to right: **Posts**, **Tags**, **About**, **Archives** (icon-only on desktop ≥ sm, icon+visible label on mobile), **Search** (icon-only at all widths, label is screen-reader-only always), **theme toggle** (rightmost).
- [ ] Active-nav indicator: current top-level section gets a wavy underline (`decoration-wavy`) under its label (Posts/Tags/About) or, for icon-only items (Archives/Search), a small underline glyph beneath the icon.
- [ ] Archives and Search nav items are `<a>` styled as buttons via `LinkButton`, not plain links, sized as 32px (`size-8`) tap targets on desktop, larger on mobile.
- [ ] Header bottom border, full-bleed row above it.
- [ ] Mobile (< sm breakpoint): nav collapses behind a hamburger button (`aria-label` "Open menu"/"Close menu", `aria-expanded` toggled, icon swaps hamburger↔X). Opening it reveals an **inline expanded panel** (grid layout, pushes page content down) — not an overlay/drawer. Confirmed live: clicking the hamburger at 390px sets `aria-expanded="true"` and reveals Posts/Tags/About/Archives (with labels) then a centered icon row (search, theme).
- [ ] Header re-binds its menu-toggle listener after every Astro View Transitions navigation (`astro:after-swap`), so the menu keeps working after client-side nav as well as a hard load.

### Footer
- [ ] Order (row-reverse on desktop): social icon row (github, x, linkedin, mail — via `Socials`) on the right/top, copyright line on the left/bottom.
- [ ] Copyright line text, verified live: **"Copyright © 2026"** then, on desktop, `" | "`, then **"All rights reserved."** (the pipe separator is hidden on mobile, stacking the two phrases).
- [ ] Year is computed live (`new Date().getFullYear()`), not hardcoded.
- [ ] Footer sits at the bottom of a flex column (`mt-auto`) on short pages; that top margin is suppressed on pages whose pagination nav already supplies spacing (posts/tag listing pages beyond page 1).

### Theme toggle (exact mechanism)
- [ ] Icon swap: moon icon shown in light mode, sun icon shown in dark mode, cross-faded with a scale+rotate CSS transition, not an instant swap.
- [ ] Click toggles `data-theme="light"|"dark"` **and** a `.dark` class on `<html>`.
- [ ] Persistence key: `localStorage["theme"]` = `"light"` or `"dark"`. Confirmed live: click → `dark`, reload → still `dark`.
- [ ] No-flash-of-wrong-theme: an inline, synchronous (`is:inline`, no defer) script in `<head>` reads `localStorage` (falling back to `prefers-color-scheme: dark`) and sets `data-theme`/`.dark` **before first paint**, exposing the resolved value as `window.__theme` so the deferred toggle script doesn't re-detect.
- [ ] `<meta name="theme-color">` is filled at runtime with the page's computed background color (so mobile browser chrome matches), and its value is carried across View Transitions navigations so it doesn't flash.
- [ ] Toggle button's `aria-label` updates to the *current* theme name (`"light"`/`"dark"`) after every toggle and every View-Transitions swap (`aria-live="polite"` on the button so this is announced).
- [ ] **Live OS-preference sync**: a `matchMedia("(prefers-color-scheme: dark)")` change listener re-applies (and re-persists) the theme whenever the OS-level preference changes — even after the user has manually picked a theme. This is a real, possibly-surprising behavior of the original: an OS theme flip can silently override a prior manual choice. Port must decide deliberately whether to keep this or intentionally drop it (name the choice, don't silently diverge).

### Global color tokens (CSS custom properties, exact values)
Light (`:root`, `[data-theme="light"]`):
- [ ] `--background: #fdfdfd`
- [ ] `--foreground: #282728`
- [ ] `--accent: #006cac` (blue)
- [ ] `--accent-foreground: #ffffff`
- [ ] `--muted: #e6e6e6`
- [ ] `--muted-foreground: #6b7280`
- [ ] `--border: #ece9e9`

Dark (`[data-theme="dark"]`):
- [ ] `--background: #212737`
- [ ] `--foreground: #eaedf3`
- [ ] `--accent: #ff6b01` (orange)
- [ ] `--accent-foreground: #ffffff`
- [ ] `--muted: #343f60`
- [ ] `--muted-foreground: #afb9ca`
- [ ] `--border: #ab4b08`

- [ ] Selection color uses `--accent`/`--accent-foreground` (`::selection` styled, not browser default).
- [ ] Focus rings: dashed 2px outline in `--accent` on focus-visible for links/buttons (`focus-visible:outline-2 focus-visible:outline-dashed`), underline suppressed on focus instead of hover.
- [ ] Scrollbar: `scrollbar-width: auto`, thumb color `--muted` over transparent track (Firefox-style custom scrollbar coloring, applied globally).

---

## 3. Typography system

- [ ] **Whole-site font is a monospace/coding font** ("Google Sans Code", loaded via Astro `Font` API/Google provider, weights 300–700, italic + normal), used as the body, heading, nav, and UI font everywhere, not reserved for code blocks. This is the single most identity-defining typographic device of the theme, confirmed visually on every captured page.
- [ ] Headings are bold in the same monospace face — no separate display typeface.
- [ ] Body max content width is a fixed `max-w-3xl` column (`max-w-app`), centered, with consistent horizontal page padding (`app-layout` utility) reused by every template.
- [ ] Links inside prose: foreground-colored (not accent-colored) by default, dashed underline, switching to accent color + underline removed on hover; `wrap-break-word` so long URLs don't overflow.
- [ ] Nav-label links and card title links: accent-colored, dashed underline on hover only (underline is not always-on).
- [ ] `h3` inside prose content is italicized (a distinct in-article third-level-heading treatment).
- [ ] List markers (`li::marker`) are accent-colored.
- [ ] `hr` uses the border color token; post-detail dividers are additionally dashed (`border-dashed`).
- [ ] Images inside prose get a 1px border in the border color and are centered; an image that is lightbox-triggerable additionally gets `cursor-zoom-in` and a dashed focus outline.
- [ ] `figcaption` is dimmed (`opacity-75`).
- [ ] Tables: bordered cells (`border` + padding), header row slightly taller; the theme also ships a dedicated `ResponsiveTable` wrapper component with **three variants** used in docs posts: default (bordered), `minimal` (no borders), `striped` (zebra body rows), `striped-minimal` (zebra + no borders) — wraps the table in a horizontally-scrollable container so wide tables don't break layout on narrow screens.
- [ ] Inline `code` gets a muted background pill (`bg-muted/75`), rounded, padded; this is suppressed inside fenced/Shiki code blocks so it doesn't double up.
- [ ] Fenced code blocks (Shiki, dual light/dark themes **min-light** / **night-owl**, `defaultColor: false` so both are shipped and CSS picks the active one): bordered box, background/foreground driven by `--shiki-light-bg`/`--shiki-dark-bg` and matching `-light`/`-dark` text vars, switched by the same `[data-theme]` attribute as the rest of the site (not a separate code-theme toggle).
- [ ] Shiki transformer notations render live in the actual demo, not only inside docs about them: `[!code ++]`/`[!code --]` diff-style line markers render with a colored full-width row background and a leading `+`/`-` glyph (green add, red remove); `[!code highlight]`-style line/word highlighting renders a subtler background tint; a filename badge (`transformerFileName`) can float above a code block (```ts file="astro.config.ts"``` syntax) and, when present, the copy button repositions below it instead of overlapping.
- [ ] Blockquotes: left border in a translucent accent color, slightly dimmed text, unless the blockquote is actually a **callout** (see below), which is styled entirely differently.
- [ ] **Callouts** (Obsidian-style, `rehype-callouts`, "obsidian" visual theme, new in v6.1): a blockquote starting `> [!TYPE]` renders as a colored, icon-labeled admonition box. Full type vocabulary: `NOTE, ABSTRACT, INFO, TODO, TIP, SUCCESS, QUESTION, WARNING, FAILURE, DANGER, BUG, EXAMPLE, QUOTE`, each with its own accent color and icon; aliases exist (`HINT`/`IMPORTANT` → `TIP`, `CAUTION` → `WARNING`). Confirmed live colors: NOTE=blue, TIP=teal, WARNING=orange/amber, DANGER=red, SUCCESS=green, INFO=blue.
  - [ ] A custom title after the type replaces the default label (`[!NOTE] Did you know?`).
  - [ ] Suffixing the type with `-` makes the callout a **collapsed-by-default disclosure**; `+` makes it an **expanded-but-collapsible** disclosure. Plain (no suffix) callouts are static, not collapsible.
- [ ] **Table of contents**: authored by placing an `## Table of contents` heading in the post body (via `remark-toc`); `remark-collapse` (matching that exact heading text) wraps the generated TOC list in a native `<details>`/`<summary>` disclosure, **collapsed by default**, labeled "Open Table of contents". Confirmed live: clicking the summary expands a full nested list of the post's headings (h2–h6) as links; this is a markdown-pipeline feature, not a hand-built component, and only appears on posts that include that literal heading.
- [ ] Heading anchors: every `h2`–`h6` in rendered post content gets a client-injected `#` permalink after the heading text, hidden until the heading (or the link itself, on keyboard focus) is hovered/focused on desktop; always visible on touch/mobile widths.
- [ ] `:target` scroll offset: jumping to an in-page anchor leaves a 1rem scroll margin so the heading doesn't sit flush under the (non-sticky) top of the viewport.

---

## 4. Content model (frontmatter schema — drives every listing/detail page)

**`posts` collection** (`src/content/posts/**/*.{md,mdx}`, underscore-prefixed folders excluded from routing and used for shared assets/drafts):
- [ ] `title` (string, required)
- [ ] `description` (string, required) — doubles as card excerpt and page meta description
- [ ] `pubDatetime` (date, required)
- [ ] `modDatetime` (date, optional/nullable) — when present and later than `pubDatetime`, listings and the detail page show "Updated:" instead of the raw publish date
- [ ] `author` (string, defaults to site author)
- [ ] `featured` (boolean, optional) — routes the post into the home page's Featured section
- [ ] `draft` (boolean, optional) — excluded from all listings/feeds/sitemap in production; still visible in dev
- [ ] `tags` (string array, defaults to `["others"]`)
- [ ] `ogImage` (an optimized local image **or** a string/remote URL, optional) — falls back to a generated `/posts/<slug>/index.png` when `dynamicOgImage` is on, else the site default
- [ ] `canonicalURL` (string, optional)
- [ ] `hideEditPost` (boolean, optional) — suppresses the Edit-page link for that one post
- [ ] `timezone` (IANA string, optional) — overrides site timezone for that post's displayed date only
- [ ] A `slug` frontmatter key appears in some sample posts but is **not** in the actual Zod schema and is silently stripped — the real URL slug is derived from the file's id/path (kebab-cased directory segments + filename), not from frontmatter. A port must not treat frontmatter `slug` as load-bearing.
- [ ] Post URL nesting: subdirectories become URL path segments; an underscore-prefixed subdirectory is stripped from the URL (organizational only). Non-Latin folder/file names are kebab-cased via `lodash.kebabcase`; Latin names via `slugify`.

**`pages` collection** (`src/content/pages/*.md`, used for the About page only in this demo): `title` (required), `description`, `ogImage`, `canonicalURL` (all optional except title).

---

## 5. Templates (one entry per route)

### Home — `/`
- [ ] **Hero section**: h1 "Mingalaba" (a Burmese greeting — a real, specific string, not a placeholder) with an inline RSS-feed icon-link immediately after it (opens `/rss.xml` in a new tab, `aria-label`/`title` "RSS Feed"); two intro paragraphs (theme description; a "README" link styled as underlined text); a "Social Links:" label followed by the icon row (github, x, linkedin, mail). Bottom border under the whole hero.
- [ ] **Featured section** (only rendered if ≥1 post has `featured: true`): heading "Featured", each post rendered via `Card` with an `h3` (not `h2`) title. Bottom border under this section, but only if a Recent Posts section follows.
- [ ] **Recent Posts section** (only rendered if any non-featured posts exist): heading "Recent Posts", non-featured posts sorted newest-first, **capped to `posts.perIndex`** (4 on the demo) even if more exist.
- [ ] **"All Posts" link**, centered, with a trailing right-arrow icon, below the listings.
- [ ] Card content per post (`Card.astro`, shared with every listing page): title as a link (h2 by default, h3 in the Featured/Recent home sections), a `Datetime` row (calendar icon + date, "Updated:" prefix when modified), then the description paragraph.
- [ ] A tiny bit of session-state plumbing: visiting the home page records the home path into `sessionStorage.backUrl`, which is what post detail's "Go back" link actually navigates to (see §6).

### Posts index — `/posts/` (+ `/posts/2`, `/posts/3`, … pagination)
- [ ] Breadcrumb: "Home » Posts" on page 1; "Home » Posts (page N)" on later pages (note: lowercase "page").
- [ ] Page heading "Posts", italic subtitle "All the articles I've posted.".
- [ ] Cards, `posts.perPage` (4) per page, `h2` titles (not `h3` — the smaller heading level is a home-page-only distinction).
- [ ] Pagination control (see §6) below the list.
- [ ] Confirmed live: 5 total pages for 17 posts at 4/page.

### Individual post — `/posts/<slug>/` (and `/posts/<...nested-path>/<slug>/` for posts filed in real subdirectories)
Top to bottom:
- [ ] "← Go back" link (only if `showBackButton`), navigating to whatever URL was last recorded in `sessionStorage.backUrl` (defaults to home if nothing recorded) — so it returns to wherever the reader actually came from (a filtered tag page, a search, page 3 of the listing), not unconditionally to `/`.
- [ ] Title (`h1`), accent-colored.
- [ ] Datetime row (large size variant) + a vertical-bar separator + "Edit page" link (pencil icon; hidden on this row on narrow screens, repeated below the article on mobile) — Edit link point at `github.com/satnaing/astro-paper/edit/main/<filePath>`, suppressed per-post via `hideEditPost` or globally via config.
- [ ] Article body (prose-styled), with a **scroll progress bar** fixed to the very top of the viewport, filling left-to-right as the reader scrolls the whole document (independent of the TOC/heading structure — a raw scroll-percentage bar, accent-colored fill).
- [ ] TOC disclosure, callouts, code blocks with copy buttons, heading anchors, and the image lightbox all live inside this article body — see §3/§6 for exact mechanics.
- [ ] Dashed horizontal rule.
- [ ] Duplicate "Edit page" link (shown only on narrow screens, since the top-row one is hidden there).
- [ ] **Back-to-top control**: fixed floating round button (mobile) / sticky inline pill (desktop, backdrop-blurred), hidden until the reader scrolls past 30% of document height, then fades/slides in; a ring around the mobile button fills as a conic-gradient tracking scroll percentage; clicking scrolls the document to the top.
- [ ] Tag pills row (hash-icon + label per tag, links to `/tags/<tag>/`).
- [ ] **Share links** row, italic lead-in "Share this post:", one icon-button per configured platform, each opening the platform's share-intent URL with the *current post URL* appended — confirmed live hrefs:
  - [ ] WhatsApp: `https://wa.me/?text=<url>`
  - [ ] Facebook: `https://www.facebook.com/sharer.php?u=<url>`
  - [ ] X: `https://x.com/intent/post?url=<url>`
  - [ ] Telegram: `https://t.me/share/url?url=<url>`
  - [ ] Pinterest: `https://pinterest.com/pin/create/button/?url=<url>`
  - [ ] Mail: `mailto:?subject=See%20this%20post&body=<url>`
  - [ ] Each opens in a new tab except mail; each has an accessible title ("Share this post on X", "Share this post via email").
- [ ] Another dashed divider.
- [ ] **Adjacent-post navigation**: two-column (stacks to one column on mobile) "Previous Post"/"Next Post" links with the neighboring post's title, chronological neighbor (not tag- or category-scoped), omitted at either end of the full post list. Marked `data-pagefind-ignore` so this nav text never pollutes search results.
- [ ] View Transitions: post title carries a `view-transition-name` derived from its slugified title, so navigating from a card to its post animates the title element between the two pages (not a hard cut).

### Tags index — `/tags/`
- [ ] Breadcrumb "Home » Tags". Heading "Tags", subtitle "All the tags used in posts.".
- [ ] Flat wrapped list of every tag in use (deduplicated by slug, alphabetically sorted by slug), each rendered as a hash-icon pill linking to its tag page.
- [ ] Confirmed live tag set (16): Astro, Blog, color-schemes, configuration, ContextAPI, docs, FAQ, HeadlessCMS, JavaScript, NextJS, ReactJS, release, Styled-Components, TailwindCSS, TypeScript, and one more from the "others" default bucket if any post omits tags (none currently do on the demo).

### Individual tag — `/tags/<tag>/` (+ `/tags/<tag>/2`, … pagination)
- [ ] Breadcrumb "Home » Tags » `<tag>`" (page 1) or "Home » `<tag>` (page N)" on later pages (the "Tags" crumb is elided and folded into the tag segment once paginated — this is a real, slightly odd breadcrumb-collapsing rule in the source, worth matching exactly rather than "simplifying").
- [ ] Heading "Tag: `<tagName>`" (original-case label, not the slug), subtitle `All the articles with the tag "<tagName>".`.
- [ ] Same `Card`/pagination layout as the posts index, filtered to that tag, `posts.perPage` per page.

### Archives — `/archives/`
- [ ] Breadcrumb "Home » Archives". Heading "Archives", subtitle "All the articles I've archived.".
- [ ] Posts grouped by **publish year**, years ordered newest-first; each year heading has a superscript count of posts that year.
- [ ] Within a year, grouped further by **month** (localized month name via `Intl.DateTimeFormat`), months ordered newest-first, each with its own superscript count; months render as a two-column row (month label column + post-card column) that stacks to one column on narrow screens.
- [ ] Within a month, posts sorted newest-first by `pubDatetime` (not `modDatetime` — archives group/sort by original publish time even though cards elsewhere show "Updated").
- [ ] Confirmed live: 2026(1) → 2025(1) → 2024(4, Sep/Jul/Jan/Jan) → 2023(3) → 2022(8), 17 posts total across 5 years.
- [ ] Archives route (and its nav link) exist only when `features.showArchives` is true; when false the route rewrites to 404 and is excluded from the sitemap.

### About — `/about/`
- [ ] Renders the single `pages` collection entry `about.md` — this is real markdown content, not a hardcoded template, and a port must preserve that it's editable content rather than baked-in copy.
- [ ] Breadcrumb "Home » About". Heading "About" (from frontmatter title).
- [ ] Body: two intro paragraphs, a full-bleed hero image, two more paragraphs, an h2 "Features" with a bulleted list, an h2 "Show your support" with sponsor/star/issue links, closing line "Kyay zuu! 🙏🏼" (a real Burmese sign-off, matching the "Mingalaba" home greeting — this bilingual flourish is a deliberate personality touch of the original author, not filler).
- [ ] Hero image identity: `src/assets/images/astropaper-og.jpg` (2455×1381 JPEG), alt "Astro Paper" — an isometric collage/mockup of several site screens tiled at an angle (not a plain screenshot). **This exact file is byte-identical to `public/default-og.jpg`**, i.e. the About-page hero and the site's fallback social-share image are the same asset reused, not two different images that happen to look similar.

### Search — `/search/`
- [ ] Breadcrumb "Home » Search". Heading "Search", italic subtitle "Search any article ...".
- [ ] Powered by **Pagefind** (static, client-side, no server) via `@pagefind/default-ui`, lazy-loaded on idle (`requestIdleCallback`) rather than blocking initial page load.
- [ ] Input placeholder: "Search" (the `PagefindUI` widget's own placeholder — note the page subtitle above it says "Search any article ..." but the actual input placeholder is just "Search").
- [ ] Typing performs **live, debounced, substring/fuzzy matching** across full post body text (the article region is marked `data-pagefind-body`) — confirmed live query "astro" returns results (release-note posts, docs posts) with `<mark>`-highlighted matched terms in both result titles and body excerpts.
- [ ] No-match state: confirmed live literal message **"No results for `<query>`"**.
- [ ] The current query is mirrored into the URL as `?q=<term>` (via `history.replaceState`, no reload) as the user types — confirmed live: typing "astro" changes the URL to `/search/?q=astro`. A page loaded directly with `?q=` pre-fills the box and auto-triggers the search.
- [ ] A "Clear" control resets the input and strips the `?q=` param back off the URL.
- [ ] The adjacent-post nav and other chrome are excluded from the search index via `data-pagefind-ignore`.
- [ ] The Pagefind UI is re-styled (not left at default look) via a global `<style>` block scoped to `#pagefind-search`, remapping Pagefind's own CSS variables onto the site's `--foreground`/`--background`/`--border`/`--accent` tokens, dashed-underline result-title links, and a custom border radius — so results visually match the rest of the site rather than looking like a bolted-on widget.
- [ ] In local dev (not on the built/deployed demo), an inline warning box explains the index must be built at least once (`pnpm run build`) to see results — a dev-only affordance, not part of the production surface to port.
- [ ] The search UI persists across Astro View Transitions (`transition:persist`) rather than being torn down and reinitialized on every internal nav.

### 404 — any unmatched path
- [ ] Confirmed live HTTP status: **404** (not a soft-404 200).
- [ ] Centered composition, vertically and horizontally, no breadcrumb.
- [ ] Giant "404" in accent color, oversized (`text-9xl`).
- [ ] A literal shrug emoticon `¯\_(ツ)_/¯` (marked `aria-hidden`, decorative).
- [ ] "Page Not Found" line.
- [ ] "Go back home" link, dashed-underlined.
- [ ] Page `<title>` is "404 Not Found | AstroPaper".

---

## 6. Interactive behaviors — exact mechanics

- [ ] **Mobile nav toggle**: hamburger ↔ X icon swap, `aria-expanded`/`aria-label` (localized open/close labels) kept in sync, panel is `hidden` class toggled to `grid`, re-bound after every View Transitions swap.
- [ ] **Theme toggle**: see full mechanism in §2 (icon swap, localStorage, FOUC-prevention inline script, live OS-preference sync, theme-color meta sync across transitions).
- [ ] **Pagination**: "Prev"/"Next" text buttons with directional arrow icons, current/total page count in the middle ("`N` / `M`"), boundary buttons rendered as non-interactive disabled `<span>`s (50% opacity, `aria-disabled`) rather than removed — only rendered at all when there is more than one page.
- [ ] **Search** (Pagefind): see full mechanism in §5 Search template entry (live substring/fuzzy match, `<mark>` highlighting, URL query-param sync, no-results message, clear button, custom-styled result cards).
- [ ] **Table of contents disclosure**: native `<details>`/`<summary>`, collapsed by default, label "Open Table of contents", expands to the full nested heading outline on click — a markdown/build-time feature (remark-toc + remark-collapse), not a client-rendered scroll-spy widget. Confirmed live: no active-heading highlighting while scrolling — it is a static outline, not a scroll-spy TOC.
- [ ] **Callout collapse** (`-`/`+` suffix types): same native `<details>` disclosure pattern as the TOC, independently collapsible per callout.
- [ ] **Code-block copy button**: a "Copy" button is injected top-right of every rendered `<pre>` at runtime (not build time); clicking copies the block's text via `navigator.clipboard.writeText`, swaps the label to "Copied" for 700ms, then reverts. When the code block also has a filename badge, the button's vertical position shifts down to sit below the badge instead of overlapping it.
- [ ] **Heading anchor links**: injected client-side onto every h2–h6 in the article after render; hover/focus-reveal on desktop, always-visible on touch.
- [ ] **Scroll progress bar**: a fixed 4px bar pinned to the very top of the viewport (`z-10`), width driven by `scrollTop / (scrollHeight - clientHeight)` on every scroll event, accent-colored fill over a background-colored track. Persists across View Transitions (`data-astro-rerun` re-runs its setup script on each navigation rather than relying on stale DOM).
- [ ] **Back-to-top button**: appears once scroll position passes 30% of document height (fade + slide transition), conic-gradient ring on the mobile variant tracks exact scroll percentage, click scrolls to `(0,0)`.
- [ ] **Accessible image lightbox** (article images only, not chrome images): click or Enter/Space on a focused in-article `<img>` (skipped if the image is already wrapped in a link) opens a modal `role="dialog" aria-modal="true"` with a dimmed/blurred backdrop, a labeled close button, and the image scaled to fit the viewport.
  - [ ] Focus is trapped inside the dialog (Tab/Shift+Tab cycle within it) and returned to the trigger element on close.
  - [ ] Escape closes it; clicking the backdrop (but not while pinch-zoomed) closes it.
  - [ ] Touch support: pinch-to-zoom (two-finger), double-tap to zoom 2× and back, pan while zoomed, with clamped translation bounds.
  - [ ] Respects `prefers-reduced-motion` (skips the fade transition, removes the overlay immediately).
  - [ ] Closes automatically on an Astro View Transitions navigation (`astro:before-swap`) rather than surviving into the next page.
  - [ ] Triggerable images get `role="button"`, `tabindex="0"`, `aria-haspopup="dialog"`, and an `aria-label` of `"Zoom image: <alt>"` (or "Zoom image" if no alt) — attribute assignment is deferred a frame so it doesn't push out the LCP timing.
- [ ] **Adjacent-post nav / edit-post / back-button**: all plain links, no JS beyond back-button's session-storage read (see next item).
- [ ] **"Go back" session-storage plumbing**: the home page and every `Main`-based listing page record their own current URL into `sessionStorage.backUrl` on load; the post detail "← Go back" link reads that value at load time (and again after each View Transitions swap) and repoints its `href` there — so "go back" returns to the *actual* referring list/filter/search state, not a hardcoded home link.
- [ ] **View Transitions** (`astro:transitions` `ClientRouter`): enabled site-wide; post titles and tag links carry named transition targets so navigating into a post or tag page animates that specific element between pages instead of a hard page swap. A transitions-disabled fallback mode is configured (`astro-view-transitions-fallback: animate` meta present) for browsers without native support.

---

## 7. SEO / meta contract

Per-page, in `<head>` (base set from `Layout.astro`, article-specific additions from `PostLayout.astro`):
- [ ] `<title>`, `meta[name=title]`, `meta[name=description]`, `meta[name=author]` (site author).
- [ ] `link[rel=icon]` ×2 (svg + ico), `link[rel=canonical]`, `link[rel=sitemap]` → `/sitemap-index.xml`.
- [ ] Open Graph: `og:type` (`website` on non-post pages, **overridden to `article`** on post pages), `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (absolute URL).
- [ ] Twitter/X card: `twitter:card=summary_large_image`, plus url/title/description/image mirrors.
- [ ] `link[rel=alternate][type=application/rss+xml]` pointing at `/rss.xml`.
- [ ] `meta[name=theme-color]` — present but empty in markup, filled at runtime (see §2).
- [ ] Optional `meta[name=google-site-verification]` when `site.googleVerification` is set (it is, on the live demo).
- [ ] **Article-only additions** on post pages: `article:published_time`, `article:modified_time` (when modified), and a `application/ld+json` **schema.org `BlogPosting`** block (`headline`, `image`, `datePublished`, `dateModified`, `author` as a `Person` with `url` when a profile link is configured). Non-post pages carry **no JSON-LD** — confirmed live (`jsonLd: []` on home/posts-index).
- [ ] OG image resolution order for any page: explicit frontmatter `ogImage` → (if `dynamicOgImage` on and none set) generated `/posts/<slug>/index.png` → site-wide default (`public/default-og.jpg`, itself identical to the About-page hero image).
- [ ] `resolveDefaultOgImagePath` validates `site.ogImage` is a bare filename (rejects path traversal / slashes) — a security-relevant detail of the config surface, not user-visible, but worth preserving if the port re-implements config validation.

---

## 8. Dynamic OG image generation

- [ ] Two render paths, both Satori (JSX-like tree → SVG) + `sharp` (SVG → PNG), 1200×630, embedded "Google Sans Code" font (regular 400 + bold 700 weights fetched at request time via `astro:assets` font-file URLs):
  - [ ] **Site-default** (`/og.png`): nested double-bordered rounded rectangle, background `#fefbfb`; centered content is a large bold site title + smaller description; bottom-right corner has the site's hostname in a smaller bold label.
  - [ ] **Per-post** (`/posts/<slug>/index.png`, generated only for posts that omit an `ogImage` and only when `dynamicOgImage` is enabled): same double-border card treatment; large bold post title (top, clipped/overflow-hidden if too long); bottom row shows "by `<author>`" on the left and the site title on the right.
- [ ] Confirmed live: `/og.png` returns `200 image/png`; a post lacking a frontmatter `ogImage` (e.g. the "Adding new posts…" post) resolves its `og:image` meta to `/posts/<slug>/index.png`, a real distinct generated PNG per post, not a shared fallback.
- [ ] Per-post OG generation is skipped entirely (0 static paths) when `dynamicOgImage` is false, or for any post that already sets its own `ogImage`.

---

## 9. Machine-readable endpoints

- [ ] `/rss.xml` — `200`, `application/xml`, `@astrojs/rss`-generated `<rss version="2.0">`; one `<item>` per non-draft post (title, link, description, `pubDate` = `modDatetime ?? pubDatetime`), sorted newest-first, **no item-count cap** observed (all published posts included).
- [ ] `/sitemap-index.xml` — `200`, `application/xml`, `@astrojs/sitemap`-generated sitemap-index pointing at `sitemap-0.xml`; configured to **exclude `/archives/`** from the sitemap whenever `showArchives` is false (irrelevant on the demo, where it's true and thus included).
- [ ] `/robots.txt` — `200`, `text/plain`; body is exactly:
  ```
  User-agent: *
  Allow: /

  Sitemap: https://astro-paper.pages.dev/sitemap-index.xml
  ```
- [ ] `/og.png` — see §8.
- [ ] `/posts/<slug>/index.png` — see §8, only for qualifying posts.
- [ ] `/favicon.svg` (+ `/favicon.ico` fallback) — the Astro "A"/rocket wordmark glyph, single black path, with a `prefers-color-scheme: dark` CSS override baked into the SVG itself so the favicon adapts to OS dark mode independent of the page's own theme toggle.

---

## 10. Accessibility & keyboard affordances

- [ ] Skip-to-content link, first in tab order, visually hidden until focused, jumps to `#main-content`.
- [ ] All primary interactive chrome (menu button, theme toggle, search/archives icon-links, pagination links) carry explicit `aria-label`s distinct from any visible icon-only presentation.
- [ ] Theme toggle button is `aria-live="polite"` so its label-only state change is announced to screen readers on toggle.
- [ ] Focus-visible styling is global and consistent: dashed 2px accent outline, underline suppressed while focused (so the outline is the sole focus indicator, not fighting an underline).
- [ ] Pagination nav is a labeled landmark (`role="navigation" aria-label="Pagination Navigation"`); disabled boundary buttons use `aria-disabled` rather than being removed from the DOM.
- [ ] Breadcrumb nav has `aria-label="breadcrumb"`; the current page's crumb is `aria-current="page"`.
- [ ] Callout/TOC disclosures use native `<details>/<summary>` — full built-in keyboard support (Enter/Space to toggle, no custom JS needed for that part).
- [ ] Article images promoted to lightbox triggers get `role="button"`, `tabindex="0"`, keyboard-activatable (Enter/Space), and the lightbox itself does full focus-trap + Escape-to-close + focus-return (see §6).
- [ ] Decorative glyphs (404 shrug, hash icons, chevrons) are `aria-hidden`.
- [ ] `dir="ltr"` is set on `<html>` from config (`site.dir`), with the header's active-nav underline and several icon rotations (`rtl:rotate-180` etc.) already built to flip correctly if a site sets `dir="rtl"` — worth knowing even though the demo itself is LTR-only, since it constrains how directional icons should be authored in the port.

---

## 11. Content inventory (every post/page + its embedded image identities)

18 posts total in `src/content/posts/` (17 published + 1 draft, which is excluded from the live demo entirely — confirmed by the RSS feed's 17 `<item>` entries), plus 1 page (`about.md`). Underscore-prefixed folders (`_releases/`, `_color-schemes/`) hold real, routable posts whose folder name is stripped from the URL.

| Slug | Featured | Tags | Notable embedded media |
|---|---|---|---|
| `adding-new-posts-in-astropaper-theme` | yes | docs | figure w/ Pexels stock photo + caption+credit; a 3-tag full callout-syntax showcase (all 13 types incl. collapsible `-`/`+` and custom-title variants); Shiki diff/highlight/filename-badge demo blocks |
| `how-to-configure-astropaper-theme` | yes | configuration, docs | `ResponsiveTable` demo (property/description/remark reference table) |
| `astro-paper-v6` (Archives shows as "AstroPaper 6.0") | yes | release | `assets/AstroPaper-v6.png` hero (co-located under `_releases/assets/`) |
| `dynamic-og-image-generation-in-astropaper-blog-posts` | no | docs, release | hero is its **own generated OG image** (`/posts/…/index.png`) embedded inline as regular content — a deliberate self-referential demo of the OG feature |
| `customizing-astropaper-theme-color-schemes` | no | color-schemes, docs | (config-focused; no distinct hero image beyond inline code) |
| `predefined-color-schemes` | no | color-schemes | one screenshot per named scheme: `paper-light.png`, `kha-yan.png`, `nila.png`, `jadeite.png`, `pyit-tine-htaung.png` (light schemes), `ember.png`, `espresso.png` (dark schemes) — 7 distinct branded scheme-name images, all under `_color-schemes/assets/` |
| `how-to-add-latex-equations-in-blog-posts` | no | docs | figure w/ external Pexels equations-photo + caption+credit; live KaTeX-rendered equations |
| `how-to-integrate-giscus-comments` | no | astro, blog, docs | Giscus comments are **documented as an opt-in guide only** — not enabled on the demo itself (no giscus dependency in `package.json`); do not treat this post's subject matter as a live feature to port |
| `how-to-update-dependencies` | no | FAQ | `forrest-gump-quote.png` — a deliberate joke image ("Forrest Gump Fake Quote"), used as both the inline hero and the frontmatter `ogImage` |
| `setting-dates-via-git-hooks` | no | docs, FAQ | (no distinct image) |
| `astro-paper-v5` / `-v4` / `-v3` / `-v2` (release notes) | no | release | each embeds its own version hero (`AstroPaper-v{3,4,5}.png` under `src/assets/images/`, v2 uses an external GitHub user-content URL) plus several external GitHub-hosted screenshots/GIFs illustrating that release's specific features (e.g. v4's "back to top button", "unslugified tag names") |
| `example-draft-post` | no (draft) | TypeScript, Astro | **excluded from the live demo** — draft posts never render in production; only relevant if the port needs to demonstrate draft-hiding behavior |
| `how-do-i-develop-my-portfolio-website-blog` | no | NextJS, TailwindCSS, HeadlessCMS, Blog | reprint of an external blog post, marked as an "EXAMPLE POST" in its own description |
| `tailwind-typography` | no | TypeScript, Astro | example/filler post |
| `how-do-i-develop-my-terminal-portfolio-website-with-react` | no | JavaScript, ReactJS, ContextAPI, Styled-Components, TypeScript | external hero image (Cloudinary-hosted screenshot of the author's actual portfolio project) |
| `about` (page, not post) | — | — | `astropaper-og.jpg` hero — **byte-identical** to `public/default-og.jpg`, the site-wide fallback OG image |

- [ ] The example/docs posts function as **live documentation embedded in the theme's own content** (adding-new-post, configure-theme, color-schemes, LaTeX, Giscus, dependency-updates, git-hooks) — a port that treats "the blog" as generic filler content would miss that a meaningful fraction of the original's posts are the theme's own user manual, written in its own voice, and that's a deliberate design choice (documented explicitly on the About page: "The blog posts in this theme also serve as guides, docs or example articles").
- [ ] The five numbered release-note posts (v2–v6) are real changelog history with real external screenshot/GIF citations back to the GitHub repo — a port most likely writes new content here (its own history) rather than porting AstroPaper's specific release notes verbatim; call that out explicitly as an intentional content swap, not an omission.

---

## 12. Out-of-scope / non-features (confirm the port does *not* invent these)

- [ ] No comments system live on the demo (Giscus is opt-in documentation only, not wired up).
- [ ] No newsletter signup, no analytics banner, no cookie consent UI.
- [ ] No user accounts/auth of any kind — fully static.
- [ ] No live "predefined color scheme" switcher UI — the color-scheme variants are documented as copy-paste CSS in a blog post, not an interactive theme picker on the site itself.
- [ ] No related-posts algorithm — "adjacent" navigation is strictly chronological prev/next, not tag- or similarity-based.
- [ ] Search has no keyboard shortcut to open it (no `/` or `Cmd+K` binding observed) — it's a dedicated nav-linked page, not a command-palette overlay.
