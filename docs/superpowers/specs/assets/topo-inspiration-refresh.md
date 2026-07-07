# Topo inspiration refresh (2026-07-07)

Refreshes the three absorption bets in
[`2026-07-06-topo-design-brief.md`](../2026-07-06-topo-design-brief.md) against current
sources (VitePress/Fumadocs source and docs, current comparison writeups). All three bets
hold. No 2025/26 entrant outranks a prior on its named dimension — the field consolidated
around the same four frameworks (Docusaurus, VitePress, Starlight, Nextra) plus Fumadocs
as the rising fifth, and Fumadocs' own gap (no committed grouped-search spec) is the one
place a stated absorption needs a specific fallback, not a swap.

## Pick 1 — VitePress reading rhythm: CONFIRMED, with numbers

**Absorb these values directly:**

| property | value | source |
|---|---|---|
| prose paragraph line-height | `28px` on a `16px` base font (**1.75** ratio) | `.vp-doc p { line-height: 28px }`, theme-default/styles/components/vp-doc.css |
| body font-size / line-height | `16px` / `1.4` (root), `24px` line-height on `body` | theme-default/styles/base.css |
| content column width | **688px** | derived, not chosen for readability — see below |
| layout max-width | `1440px` | `--vp-layout-max-width` |
| sidebar width | `272px` | `--vp-sidebar-width` |
| base font stack | `'Inter', -apple-system, BlinkMacSystemFont, sans-serif, …` | `--vp-font-family-base` |
| code font-size / line-height | `0.875em` / `1.7` | `--vp-code-font-size` / `--vp-code-line-height` |

**The 688px content width is a corridor remainder, not a typographic decision.** Straight
from VitePress maintainer Kia King Ishii in the GitHub discussion that asks this exact
question (vuejs/vitepress#1646): 1440px window, minus 32px page padding each side (1376),
minus the 240px sidebar (1136), minus the 224px TOC aside (912), minus 112px content
padding each side, lands on 688px — a byproduct of stacking fixed panel widths at the
1440px breakpoint, not a chosen measure. Ishii's own words: "I do have a grid system in my
mind when I design, but I don't like them to be fixed into code" — VitePress optimizes for
visual precision at specific breakpoints over a programmatic ch-based measure.

**Verdict for Topo: absorb the effect (a calm, generous paragraph rhythm at ~1.75
line-height on Inter-class type), not the 688px number itself.** Topo already commits to
the family type scale and Figtree-class display type over Inter, and the chassis's own
prose foundation should set its measure the way VitePress arrived at its own — as a
remainder of the three-pane widths at the family's breakpoints, not a borrowed constant.
Carry forward: target **line-height ≈1.7–1.75 for prose paragraphs**, keep code blocks
noticeably tighter/smaller (VitePress: `0.875em` / `1.7`), and treat the reading column as
whatever's left after sidebar + TOC + gutters at each breakpoint, verified by eye at 1440
and 2560 per the five-viewport standard, not fixed to a foreign px value.

## Pick 2 — Fumadocs search ergonomics: CONFIRMED, with one caveat to design around

**Confirmed concrete details, from the shipped source
(`packages/base-ui/src/components/dialog/search.tsx`, `fuma-nama/fumadocs`, dev branch)
and the docs site:**

- Trigger: **⌘K / Ctrl+K**, customizable via a `hotKey` option.
- Result rows are typed (`ReactSortedResult`), not flat strings: a row's `type` is one of
  page-level or heading-level, and a heading-level row renders with a **Hash (`#`) icon**
  as its leading glyph — the same convention Starlight/Docusaurus search UIs use to signal
  "this hit is a subsection, not the page itself."
  Highlighted match text renders through a real Markdown renderer (`mdRenderer`, remark →
  rehype with `rehype-raw`), not string-splicing, so `<mark>` highlighting composes with
  inline code, bold, and custom MDX elements inside a result snippet.
  Marked text style: `text-fd-primary underline` — an underline, not just a color shift, so
  it survives on non-color-differentiated terminals/printouts too.
- The search index itself (Orama, self-hosted, static-JSON-capable) is fetched client-side
  via a `fetchClient` hook — this is what makes it feel instant on a static-first site,
  which is exactly Topo's Pagefind-based deployment shape (build-time index, no server).
- **Caveat**: neither the shipped `search.tsx` component nor the public Orama/Search-UI
  docs pages state a committed "group by section, ranked within section" contract — the
  grouping the brief describes is an emergent property of Hash-icon sub-rows following
  their parent page row in a flat sorted list, not a documented API guarantee. Topo's own
  spec should therefore state the grouping behavior explicitly (page header row, its
  matching headings indented/hash-prefixed beneath, ranked by match relevance within that
  cluster) rather than assume Fumadocs' behavior is contractually stable to build against.

**Verdict: absorb the interaction language (⌘K, instant client-fetch index, hash-icon
heading rows nested under their page, underlined-not-just-colored highlight), on top of
Pagefind rather than Orama** (Pagefind is already the anatomy-faithful-to-Starlight choice
in the brief and fits the static handbook build; Fumadocs is the UX reference, not the
runtime dependency).

## Pick 3 — Mintlify's interactive polish floor: CONFIRMED, three components specced

- **Copy button** (code blocks): Mintlify's newer "Copy page" affordance (a
  contextual-menu action that copies the whole page, aimed at pasting into an LLM context
  window) shipped in their 2025 product cycle and had a real Safari clipboard bug logged
  publicly (`mintlify/docs` discussion #847) — evidence it's genuinely used, not a mockup
  feature. The per-code-block copy icon is the older, table-stakes version (present since
  early Mintlify); for Topo the per-block button is the binding target — cross-browser
  clipboard write, hover-revealed icon, checkmark-swap on success — the whole-page-copy
  affordance is a **maybe-later**, tag it in the manifest as optional, not core.
- **Tabs**: Mintlify's tab groups auto-sync by matching title across the page (pick "npm"
  in one tab group, every other tab group with an "npm" tab switches too, opt out via
  `sync={false}`), support an optional `borderBottom` treatment for visual separation when
  panel heights vary, and accept icons per tab (Font Awesome/Lucide/URL). The
  cross-group sync is the one behavior worth lifting deliberately — it's a small but real
  quality-of-life win on a docs site with parallel install-method tabs repeated down a long
  page (exactly the handbook's shape).
- **Anchor headings**: every heading gets an automatic anchor link, appears in the TOC —
  standard, already covered by the Starlight-anatomy requirement (anchor icon on
  heading hover, `#`-prefixed permalink). No incremental Mintlify-specific detail beyond
  what the anatomy manifest already owes.

**Verdict: absorb copy-button polish (per-block, not whole-page, as the floor) and tab
cross-sync (as a nice-to-have, not a manifest-blocking item) — "without the weight" holds:
none of this requires Mintlify's React app shell or hosted-platform machinery, all three
are CSS/vanilla-JS-sized on a static build.**

## What was considered and rejected as a swap-in

- **Docusaurus** (~3M weekly downloads, still the volume leader) — rejected as a prior
  swap: its strength is versioned-docs/i18n tooling for large OSS projects, not reading
  rhythm, search feel, or interactive polish — none of Topo's three named dimensions.
- **Nextra v4** (~800K downloads) — rejected: file-system routing convenience, not a UX
  differentiator on any of the three axes; its search (Flexsearch) is noted across sources
  as scaling worse than Orama/Pagefind for larger corpora, which argues against, not for,
  swapping it in for the search bet.
- **Scalar / Fern / ReadMe / Redocly** (API-reference-first platforms) — all strong on
  interactive API playgrounds specifically, which the brief already scopes as conditional
  ("if cairn.pub's reference arm wants them," under the Fumadocs bullet, not a standalone
  bet). None displaces Fumadocs as the general reference-page-pattern source; Fumadocs
  already ships an OpenAPI/playground integration (`fumadocs-openapi`) if that arm gets
  built, so no fourth prior is needed.
- **Fern's design workflow** (AI-assisted design-in-Claude, hand-polished in a running dev
  server) is a process note about how Fern's own team designs, not a shippable pattern to
  absorb into Topo — noted and discarded.
- No 2025/26 entrant (searched broadly: GitHub trending, "documentation-theme" topic,
  Jekyll/Hugo-based themes) surfaced a theme that outranks VitePress on reading rhythm,
  Fumadocs on search ergonomics, or Mintlify on interactive-polish floor. The field is
  stable; Fumadocs itself is the one riser (10k+ GitHub stars, adopted by BetterAuth, nuqs,
  Sim Studio) but it was already the incumbent pick for its dimension, so this is
  confirmation, not a swap.

## Final pick list (unchanged from the brief, now with committed values)

1. **VitePress** — reading rhythm. Absorb the ~1.75 paragraph line-height and the
   "measure = remainder of fixed panel widths at each breakpoint" method; do not borrow
   the 688px constant itself.
2. **Fumadocs** — search ergonomics. Absorb ⌘K trigger, instant client-fetched index,
   hash-icon heading rows nested under page rows, underlined match highlighting; run it
   over Pagefind's static index, not Orama; write Topo's own grouping contract explicitly
   since Fumadocs doesn't guarantee one.
3. **Mintlify** — interactive polish floor. Absorb per-block copy-button behavior
   (hover-reveal, checkmark feedback, cross-browser clipboard) as a manifest-required item;
   absorb tab cross-group sync as a nice-to-have; anchor-link behavior is already covered
   by the Starlight-anatomy requirement.
