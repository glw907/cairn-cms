# Admin UI/UX audit (2026-07-15)

The ranked, verified deficiency list the 2026-07-15 audit brief contracts for
(`docs/internal/2026-07-15-admin-ux-audit-brief.md`). Grading rubric: the design charter and its
calibration in `docs/internal/admin-design-system.md` (iA Writer anchor in spirit, the ASC-volunteer
archetype, professional/restrained/slightly-academic voice, a phone is a full writing device).

Method as briefed: the 0.86.0 render set (28 full-page PNGs, showcase admin, captured 2026-07-14),
eight fresh-context single-lens critique agents, then main-loop triage that refuted weak findings
against the renders and the committed visual baselines rather than counting votes. Refuted claims are
recorded in the appendix so they do not resurface.

## Routing key

- **ARC** — the design-refinement arc: color and type system work, iterated locally with Geoff's eyes
  per round (the design-iteration-economics memory). Not a one-shot pass.
- **REORG** — folds into the admin reorganization pass's plan as a nav/sidebar-adjacent rider
  (spec: `docs/superpowers/specs/2026-07-14-admin-reorganization-design.md`).
- **PAPERCUTS** — a small follow-up refinement pass: mechanical fixes, copy, and layout defects that
  need no design ruling.
- **KIT** — input to the component-kit design (ROADMAP Next).

## Ranked findings

Ranked by charter weight (editor-facing beats developer-facing, material beats cosmetic) and edit
cost. Seeded findings from the brief are ranked in place, marked (seeded).

### 1. The phone desk fails the "full writing device" calibration — MATERIAL, high confidence

The charter's phone calibration is the widest gap the audit found. Pixel-measured on the renders:

- **Keyboard-open chrome burden.** At 390×500 (`edit-390-h500.png`, the open-keyboard case), the
  first line of manuscript appears at y=334: 67% of the viewport is chrome (band, title, three
  toolbar rows, Write/Preview row) before any of the editor's own text. Roughly five monospace lines
  survive as the writing window.
- **Touch targets under the floor.** Save/Publish pills measure 32 CSS px tall and the Write/Preview
  tabs 31 px against the 44 px guideline, at every phone width (`edit-390.png`).
- **Reach.** Save, Publish, and the theme toggle live exclusively top-right, the classic
  one-handed dead zone, with no phone-native alternative at any width.
- **Toolbar and footer overflow.** The toolbar wraps to three glyph rows and still clips its last
  control at the right edge with no overflow affordance (`edit-390.png`); the footer strip truncates
  "Markup" mid-word to "Marku", wraps "Focus mode" to two lines, clips "Typewriter" at 390 and drops
  it entirely at 320, and pushes the Markdown help link off-frame, exactly the label an icon-confused
  phone writer needs (`edit-320.png`, `edit-390.png`).

Zen at 390 is the standout counter-example: near-zero chrome, a calm manuscript, genuinely close to
the anchor. The phone desk's fix direction likely borrows from it.

**Routing:** ARC for the composition question (what a phone desk is designed to be, including reach
and the chrome budget); PAPERCUTS for the mechanical overflow and truncation defects.

### 2. Desk-band layout collisions at narrow widths — MATERIAL bugs, high confidence

Two rendering defects, consistent across `edit-320.png`, `edit-390.png`, and both height variants,
post-hydration (so not capture artifacts):

- The theme toggle overlaps the Save/Publish buttons: astride the Publish pill at 320, crowding the
  Save edge at 390.
- A small square glyph renders on top of the word "Published" in the status badge
  ("Publ□hed") at every phone width.

Reproduce live and fix; the phone band needs a deliberate narrow-width composition (what collapses,
what moves to the overflow) rather than a squeezed desktop row.

**Routing:** PAPERCUTS (bug class; verify by live repro at 320/390 first).

### 3. (seeded) The color system is over budget — MATERIAL, high confidence

Geoff's grade, corroborated with counts. The seeded "six competing accent moments" on the posts list
undercounts: `posts-1440.png` carries 13 saturated instances (5 purple: active nav, All-filter tab,
Publish site, New Posts button, New Posts footer link; 6 always-on red delete icons; 2 blue New
badges). The busiest surface in the admin is Tidy settings (`settings-1440.png`): ~26 accent moments,
dominated by eight red-strikethrough/green diff pairs that read as a code-review tool on the screen
where a volunteer configures their most trust-dependent writing aid. Across one session an editor
meets five semantic hues (purple, red, blue, amber, green). Two specific contributors worth their own
rulings:

- **The always-on red delete column** on every list row is the loudest repeated element on the
  first screen an editor lands on. It is a deliberate recipe ("always-visible delete"), so changing
  it is a design ruling, not a bug fix: candidates are a quieter resting treatment or row-hover
  reveal.
- **Dark mode amplifies** the same accents against the near-black canvas; there is no per-mode
  desaturation step.

**Routing:** ARC. This is the arc's first workstream: an accent budget per screen, the delete-column
ruling, the Tidy-diff palette, and the dark-mode compensation, iterated with Geoff.

### 4. (seeded) Sidebar complexity beyond the flat default — MATERIAL, high confidence

The ratified reorganization spec already drops the default sections; the audit isolates what
complexity remains after that:

- **Up to seven type treatments** in one 224px rail: tracked eyebrows, regular nav labels,
  bold+purple active labels, the bordered CMS chip, the display-face profile name, small muted
  email/role lines, bold Sign out.
- **~14 icon-shaped marks** including two near-identical document glyphs adjacent (Posts, Pages).
- **The active item stacks three signals** (tint pill, weight change, color change), which makes the
  sidebar's own state one more popping-color moment (interacts with finding 3).
- **A three-zone foot** (Help row, three-line profile card, Sign out) stacks three dividers and six
  lines of text where the eye should rest.
- **Chevron chrome** persists on any site-declared section after the default flattens.

**Routing:** ARC (updated at the reorganization plan, plan-locked call 2: every slice here is a
taste call or infeasible mechanically — concepts share one default glyph by design — so none rode
the pass; the flat default itself shipped there).

### 5. (seeded) Base type size — hedged, route to the arc

The renders neither confirm nor refute Geoff's hedge; chrome runs mostly at `text-sm` and the
manuscript at 1rem mono / 1.0625rem prose posture. Per the brief, verify against the anchor's
generosity rather than assume.

**Routing:** ARC (type-scale workstream, with the keming item in finding 10).

### 6. (seeded) Zen at xl retains the sidebar — decide: zen should recede everything — MATERIAL, decision

Confirmed in `edit-zen-1440.png`: the full rail (brand tile, both groups, profile block) stays up
while zen drops the topbar. The audit's recommendation: **zen recedes the sidebar too.** The charter's
anchor argues a full-focus escape drops everything; zen is an explicit, reversible editor choice, so
the hidden-chrome evidence against default-hidden nav does not apply; and zen at 390 (where the
sidebar is already an overlay) is the mode's strongest render. The desk rider's xl-persist logic
stays for the non-zen desk.

**Routing:** REORG rider (small: the zen flag already drops the topbar through the same layout).

### 7. (seeded) Editor approachability for the volunteer — MATERIAL, high confidence

Corroborated with specifics:

- Of ~16 toolbar controls, only Tidy carries a text label. Two glyphs are ambiguous even to fluent
  users (the insert-block mosaic, the arrow-into-box), and two image-ish glyphs sit in the same row.
- The guarded Figure control renders so faint it reads as a rendering gap rather than a disabled
  control (`edit-1440.png`, `edit-2560.png`, both themes).
- Footer jargon: "Markup" and "0 issues" are developer vocabulary in the volunteer's resting view.
- The help affordances invert on phone: the Markdown help link is off-frame at 390 and Help sits
  behind the hamburger, so help is least discoverable exactly where icons are least labeled.

**Routing:** ARC for the icon/label/help-affordance design (it interacts with the phone desk);
PAPERCUTS for the Figure-control visibility and the footer wording.

### 8. Office screens are unbroken, not composed, at the extremes — MATERIAL, high confidence

- **2560:** the office content area has no max-width; list rows stretch a ~65% dead band between
  title and date (`posts-2560.png`). The desk already caps its manuscript (~49rem, verified), so the
  office pages are the gap.
- **320:** the title column starves (7–10 characters plus ellipsis) while the status pill and delete
  column keep full desktop width; the topbar search collapses to an icon plus a stray "S"; the
  "Pending edits" filter chip wraps to two lines inside the segmented group (`posts-320.png`).
- **Palette at 390** sits flush against the viewport top with no inset (neither a centered card nor
  the sanctioned bottom sheet), and its input carries a heavy black outline that reads as a UA
  default rather than the admin's focus language (`palette-390.png`).

**Routing:** PAPERCUTS (office max-width, narrow list recomposition, search affordance, palette
inset/focus).

### 9. Voice: jargon leaks and register drift against the calibrated voice — MATERIAL, cheap

The 2026-07-15 calibration (professional, restrained, slightly academic) supersedes the warmer voice
some strings were authored under. Confirmed on renders:

- **Developer vocabulary reaching editors:** "before it lands", "Saving commits your choices to the
  site config", "the key rides in an Anthropic Worker secret", the "No refs" badge (beside the
  spelled-out "No references found" filter on the same screen), "Markup", "0 issues".
- **Chatty register:** "Find your way around" / "get your bearings", "Stuck on something?",
  "Not here yet" / "held back for now", the recurring product-personification tic ("cairn leaves
  your style alone").
- **"New Posts"** on the button, footer row, and dialog: the engine already resolves a `singular`
  label (`ConceptList.svelte:190`) — the showcase never declares one, so the label falls back to the
  plural. Fix the showcase exemplar; consider whether the default should warn.

**Routing:** PAPERCUTS (one copy sweep against the calibration, plus the showcase `singular`
declaration). The Help-page headings ride the same sweep.

### 10. Polish tail — COSMETIC, cherry-pick

- (seeded) **Wordmark keming**: "Cairn" reads "Caim" at the brand size/weight, systemic across every
  render including login. Targeted fix (letterspacing/size/weight of the rn pair) in the ARC's type
  workstream.
- **Dark-mode Published pill** nearly vanishes into the dark row; the one badge treatment without a
  dark counterpart (`posts-1440-dark.png`). Verify contrast, fix in PAPERCUTS.
- **Unlabeled green check** on media tiles: glyph-only status whose meaning (described? used?) is
  opaque; the design system's own rule is glyph-plus-label (`media-1440.png`).
- **Toolbar wrap fragility**: the Write/Preview capsule sits inline in the committed 1440 baseline
  but wraps to its own row in this render set; the row is at its width budget and font-metric
  sensitive.
- Date column wraps two-line for May dates while June fits; the media card title truncates only on
  the card whose badge is wider ("Needs alt"); the Add-editor button sits a few px taller than its
  row inputs; the "HIGHER RISK" pill is more alarmed than its own body copy; zen's manuscript keeps
  a visible violet frame in the no-chrome mode and shows an "Esc" hint on touch; the ⌘K hint is
  meaningless on touch.

**Routing:** PAPERCUTS, except the keming item (ARC).

### 11. Idiom variance across engine screens, and the kit inventory — MATERIAL (developer-facing)

The engine's own screens disagree on the patterns a developer would copy (confirmed by direct
comparison of `posts-1440.png`, `media-1440.png`, `editors-1440.png`, `settings-1440.png`,
`help-1440.png`):

- **Page header, five ways.** Posts: no eyebrow, action beside the h1. Media: eyebrow + h1 + stats
  prose, action at eyebrow level. Editors: no header action at all (Add editor is a form row below
  the table). Settings: h1 + paragraph, action in the page foot. Help: eyebrow + h1, repeated as a
  sub-header idiom no other screen uses.
- **Counts, three ways:** filter-tab badges (Posts), stats prose (Media), trailing status pills on
  subheadings (Settings).
- **Search placement, two ways:** in the header row (Posts) vs a separate toolbar row (Media).
- **Single-use patterns with no confirming second instance:** the On/Off toggle pill (Settings), the
  breadcrumb detail chrome (edit route).

The kit's first deliverable is therefore convergence: pick the canonical header, count, and toolbar
recipes and re-express the engine's own screens in them, then ship the components. Inventory the kit
must cover, from what the screens actually use: page header, section sub-header, list/table shell,
tile-grid card, toolbar row, segmented filter group, status pill (with a color-to-meaning legend),
primary action, form row, toggle, empty state, auth card, detail-route chrome.

**Routing:** KIT (ROADMAP Next entry already gates the kit on this audit).

## Refuted findings (recorded so they do not resurface)

1. **"The sidebar stays light in dark mode, creating a hard seam."** False: `posts-1440-dark.png`
   shows the sidebar fully dark.
2. **"The light-mode 1440 edit header is missing all desk controls."** Capture artifact: the desk
   band mounts client-side and the capture fired pre-hydration; the committed baseline
   (`admin-edit-page-1440-linux.png`) shows the full band.
3. **"The editor manuscript is uncapped at 2560."** False: the ~49rem cap holds, centered
   (`edit-2560.png`).
4. **"The Hidden filter outside the pill group is an inconsistency."** Documented design intent (an
   orthogonal axis, not a fourth partition segment). Kept only as a discoverability note.
5. **"edit-320.png captured as a desktop render."** False (confused with `edit-2560.png`); the file
   is a mobile layout, though it measures ~342 CSS px, slightly over target.
6. **Media badge hues overcounted:** the "No refs"/"used" pills are neutral; only "Needs alt"
   carries the amber ink.

## Render-set gaps (for the next capture run)

The showcase's custom Signups screen was not captured, so the bolted-on-vs-native judgment the kit
needs has no render; capture it next run. The 1440 edit capture fired pre-hydration (wait for the
desk band before shooting). The 320 edit capture measured ~342 px.

## Next actions (per the brief)

1. `superpowers:writing-plans` for the reorganization pass, folding the REORG riders (findings 4
   and 6) into the ratified spec's plan.
2. The PAPERCUTS pass follows as its own small pass (findings 2, 7-partial, 8, 9, 10).
3. The ARC (findings 1, 3, 5, 7-partial, keming) runs as fully local design iteration with Geoff,
   per the design-iteration-economics memory.
4. The KIT design (finding 11) proceeds on the ROADMAP Next entry, now unblocked by this audit.
