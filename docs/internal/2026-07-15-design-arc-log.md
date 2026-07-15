# Admin design-refinement arc log (2026-07-15)

Working log for the exploratory arc (design-arc-queue item 3). One line per iteration:
probe, verdict, why. Distilled into the decisions record and REMOVED at settle.

Arc setup: worktree `.claude/worktrees/design-arc`, branch `admin-design-arc` off main
(71d06c50, post-0.86.1). Review surface: showcase `vite dev` at localhost:5173, Geoff
authed via minted magic link. Benchmark: the committed admin-visual baselines plus the
audit's 0.86.0 render set (copied to this session's scratchpad `audit-renders/`).
Scope: audit findings 1 / 3 / 5 / 7-partial / keming + the absorbed Typography and Color
rubric sections + the carried 320 badge-triple call. Owner constraints (2026-07-15):
nothing off-limits except the violet primary identity is FIXED. Iteration order: color
budget first, then type+keming, phone desk, affordances. Dose: standard, deepening to
composition rework on the phone desk. Release at settle: authorized ("continue to a
release").

Opening candidates: workflow wf_8358183b-26b → `design-candidates/{a-color,b-type,c-phone,d-affordances}.html`.

## Ratified picks awaiting implementation (2026-07-15, Geoff)

- **C1 (phone desk, "zen-derived band") with two modifications:** the bottom action bar
  carries Save + guarded Publish (never overflow-buried; the always-visible-Publish rule
  outranks C3's chrome numbers) and gets real breathing room: its own vertical padding
  plus env(safe-area-inset-bottom), sitting above the keyboard when open. One 48px top
  band (back, truncated title, save dot, overflow); single scrollable 44px toolbar row;
  Write/Preview + postures + modes into the overflow; badge triple = one compact status
  pill with the eye-off glyph merged in. Geoff's note: mockup buttons looked hard-smashed
  against the bottom — the inset requirement is the answer.
- **D2 (toolbar affordances, "grouped micro-eyebrows") with relabeled clusters:**
  Format (bold, italic, strike, code) / Structure (H2, H3, lists, quote, table) / Insert
  (insert+edit block, links, image, figure, Tidy). The builder's "Blocks" label collided
  with cairn's existing block = component vocabulary (Geoff: "what's a Block in this
  context?") — "block" keeps its one meaning, inside Insert. Persistent 44px "?" help
  affordance at the toolbar's right end at every width.

## Iterations

- Round 0 (candidates): wf_8358183b-26b built four compare pages in `design-candidates/`
  (A1-A3 color, K1-K4 + T1-T4 type, C1-C3 phone desk, D1-D3 affordances), all from real
  component markup + the compiled sheet, render-read by the directing context — PASS
  (C3 honestly flags its own Publish-hiding charter regression; chrome budgets 30/30/21%
  vs the 67% audit baseline). Awaiting Geoff's picks, color first.
- Iter 1 (color): Geoff picked A3 ("moving in an effective direction") — applied to real
  components: segmentTintClass goes neutral wash + semibold (recipe-wide), delete rests at
  45% ink, New is bold ink text, foot New-post link underlined subtle. KEPT (committed).
- Iter 2 (color): Geoff: Publish + New post buttons still aggressively eye-catching —
  Publish site drops solid btn-primary for the Edited-badge tint (same act-on semantic,
  the documented rhyme); header New post goes neutral btn. Verified rendered. Pending
  Geoff's eyes.
- FRICTION (file upstream at harvest): engine component edits don't reach the browser via
  `npm run package` + HMR alone — vite's client dep optimizer serves a stale pre-bundled
  shell (dist .svelte SSR reloads fire, the client bundle doesn't). The loop needs a dev
  server restart with `--force` per component-edit iteration, which breaks the
  minutes-per-turn promise of the design-iteration loop for ENGINE admin work (0.84.0's
  loop was designed for consumer-site work, where source edits HMR directly). Candidate
  fix: showcase vite config excludes the linked package from optimizeDeps, or a
  documented `design:dev` script that watches src/lib and repackages + restarts.
- Live corroboration for workstream B: the topbar site name "Cairn Showcase" kems to
  "Caim Showcase" — the rn fix must cover the site-name treatment too, not only the
  sidebar wordmark.
- Iter 3 (color, SYSTEM pass): Geoff ratified the Publish-site tint, flagged the neutral
  New post as near-invisible AND the atomistic-edit process failure. Ruled the EMPHASIS
  LADDER as one grammar: (1) ink-solid = standing openers (New post, Upload, both empty
  states), (2) violet solid = flow commits (Create, Save, Confirm, Apply, Add editor),
  (3) violet tint = pending act-on states (Edited, Publish site), (4) violet structural =
  wayfinding, (5) ink steps = utilities (delete 45% incl. media), (6) red/amber reserved.
  Selected-state family (media view toggle, IconPicker) re-expressed through
  segmentTintClass / neutral wash. Applied across ConceptList, CairnAdminShell,
  CairnMediaLibrary, IconPicker in one pass. KEPT pending Geoff's read (committed).
- Iter 4-5 (color, tunes): ink openers took the neutral token (Geoff's anchor: the avatar),
  then rest lightened to neutral/85 so hover-to-full reads (his note: mouseover visibility).
  Both KEPT (committed). Geoff: "good on color", moving to type. Color closeout still owed:
  Tidy-diff re-ink + dark chroma step (both in the picked A3 candidate; apply with measured
  contrast, no new taste needed) + extend the neutral selected-state grammar to the desk
  footer toggles (they carry a local violet pressed pair, an idiom-variance leftover).
- Iter 7-8 (density round, PROCESS RESET): Geoff's density note (too much vertical space,
  maybe drop description) answered by one-line rows + tightened padding + unified status
  pills + medium titles — but shipped as FOUR sequential single-note cycles, drawing three
  more notes (title typography, pill ink divergence, title-date void, inconsistent blacks)
  and Geoff's ruling: grouped feedback → holistic response; "lots of little atomistic edits
  is an iterative rabbit hole, and the skill shouldn't work that way." Resolution: the
  office list designed WHOLE in one pass (4a19a690): the 3xl natural-measure column, the
  two-solid ink story (--cairn-ink-hover tokens; opacity-blend dark fills banned), the one
  pill family (shared geometry + ink; one differing attribute per state), medium titles.
  Skill patched (dotfiles 69484c7): the arc's iteration unit is the ROUND, not the note.
- Iter 9 (list round 2, grouped): Geoff's four batched notes (title "off", left padding,
  foot row, page weights right) answered as one composed pass: title ranks by SIZE (16px
  medium over 15px meta), one 24px card gutter (cells joined the foot row's inset), foot
  row drops its rest underline (rule: inline links underline, row-actions don't), and the
  header rebalances by moving search into the triage row's right end (also converges the
  search-placement idiom with Media, kit finding 11). Sequencing ruled with Geoff: this
  round closes the list's detail work; C (phone desk) and D (affordances) picks come
  BEFORE further fine-grain rounds, since those axes restructure surfaces.
- Iter 10 (frame zones): the foot New-post row read as a content row — the card's frame
  zones (thead + foot) took the sidebar's gentle-band pair (0.04 rest / 0.08 hover), so
  content rows are the card's only white rows. KEPT (ed9190df).
- Iter 11 (STRUCTURAL, engine bug found by Geoff's eyes): two symptoms, one root cause —
  a small permanent vertical scroll AND a visible base-200 seam around the brand box. The
  UA's default 8px body margin: the fixed sidebar pins to the true viewport while flowing
  content offsets by the margin (measured: scrollHeight 916 vs 900; topbar at top 8, left
  232 vs sidebar right 224). Fix: body{margin:0} via the shell's svelte:head (mount-scoped,
  host untouched per the no-Preflight rule), component test pins computed margin, verified
  900/900 and seam closed. CONSUMER-VISIBLE FIX: every cairn admin had this; carry a
  CHANGELOG line at settle.
- Iter 6 (type, K4+T4 SYSTEM pass): Geoff picked K4 + T4 from the compare page. Wordmark
  1.375rem/600/normal-tracking at all three sites (shell, login, confirm); topbar site name
  drops tracking-tight (it kemmed too); nav labels + all three office tables + list-foot
  controls to 0.9375rem (15px); summary steps to 0.875rem; manuscript prose posture
  1.125rem/1.85 (editor theme + title wrapper measure basis). Design-system recipes updated
  with the K4/T4 values and the no-negative-tracking rule. Rendered: keming resolved on
  sidebar AND topbar; manuscript reads more generous. KEPT pending Geoff's read (committed).
