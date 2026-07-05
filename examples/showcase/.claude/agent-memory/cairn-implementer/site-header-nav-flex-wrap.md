---
name: site-header-nav-flex-wrap
description: SiteFooter already had the flex-wrap fix; SiteHeader.svelte lacked it, causing the 320px wordmark-wrap/nav-clip defect. site-nav is a shared class name across header and footer.
metadata:
  type: project
---

The showcase's public chrome (`SiteHeader.svelte`, `SiteFooter.svelte`) both put the brand mark and
a nav in one `flex items-center justify-between` row capped at `max-w-measure`. Without `flex-wrap`
on that outer row, a flex item's default `min-width: auto` still lets it shrink toward its
min-content, and if the wordmark text has no `white-space: nowrap`, its min-content is the width of
the *longest single word*, not the full string, so the browser shrinks it down and letter-wraps the
name ("Cairn" / "Showcase") instead of moving the nav to a new line. Meanwhile the nav's own
min-content (all its items' words, unsplittable) can still exceed the leftover space, and without
`flex-wrap` that overflow just clips past the viewport edge rather than reflowing, which is exactly
the 320px defect: two-line wordmark plus an unreachable nav tail.

The fix is two `flex-wrap`s plus one `whitespace-nowrap`, no JS, no media query: `flex-wrap` on the
outer row (so the nav drops below the wordmark once the wordmark's un-wrapped width plus the nav's
own width does not fit), `flex-wrap` on the nav itself (so a nav that still overflows its own
full-width line wraps onto a further line, the fallback for more items than the showcase's four),
and `whitespace-nowrap` on the wordmark span (so it is the row that breaks, never the letters).
Verified with 7 injected nav items at 320px: 3 clean rows, no horizontal scrollbar, every link fully
in-viewport.

`SiteFooter.svelte` already carried the outer `flex-wrap` (it was the working precedent to copy),
but not `whitespace-nowrap` on its own wordmark span; that component was out of this task's file
scope (only `SiteHeader.svelte` + `site.css`) and was left alone, so a footer at an even narrower
width than tested could still show the letter-wrap. Flag if a future pass touches the footer.

**Gotcha:** both components name their nav `class="site-nav"`, so a Playwright locator
`nav.site-nav a` silently matches BOTH header and footer links on a full page. Scope tests to
`.site-header nav.site-nav a` (or `.site-footer ...`) or a bounding-box assertion measures the
wrong element (cost an hour chasing a phantom 20px-height failure that was really the footer).

**Touch-target ripple:** growing nav links to a `min-h-11` (44px, WCAG 2.5.5) touch target changes
the tallest item in the header's row from the wordmark to the nav link, which grows the whole
sticky header's real height even at desktop widths (here: ~65px to ~72px at 1280px). That drifted
the `site-visual` Playwright snapshot baselines (home + styleguide, light + dark, all four) by a few
vertical pixels globally (full-page screenshots), which is expected and must be regenerated with
`--update-snapshots` and eyeballed, not treated as a regression. It also staled a hand-tuned
`scroll-padding-top: calc(...)` in `site.css` that assumed the wordmark was the header's tallest
element; when a touch-target bump changes which element is tallest, re-anchor the calc to that new
element (here, a literal `2.75rem` matching the nav's `min-h-11`, not `var(--text-step-1)`).
