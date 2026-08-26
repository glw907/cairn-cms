# ASC consumer-harvest triage: the late-August rounds (2026-08-26)

Adversarial triage of the four aksailingclub-org harvest documents from the 2026-08-22
through 2026-08-26 passes, at Geoff's direction: no in-by-default stance, and an item
reaches the engine only if the site hand-rolling it was the wrong end state, never merely
inconvenient. Every engine-level claim was verified against `main` at `0d500e4f` on
2026-08-26; verified locations are cited per item.

Sources, and their disposition:

- `aksailingclub-org/docs/2026-08-22-events-admin-harvest-findings.md` — staging file
  (carries the paste-then-delete protocol). **Delete after the ASC `email-announce` branch
  settles**; its substance is reproduced here.
- `aksailingclub-org/docs/2026-08-22-events-redesign-harvest-findings.md` — same protocol,
  same disposition.
- `aksailingclub-org/docs/2026-08-24-assets-register-harvest-findings.md` — same protocol,
  same disposition.
- `aksailingclub-org/docs/2026-08-25-email-announce-harvest-findings.md` — **stays in ASC.**
  It carries no staging protocol and holds ASC's own deferred site-side debt (items 6–30 of
  that doc); only its engine-level items are folded here.

The deletions did not run at triage time: the ASC repo sat on the in-flight `email-announce`
branch with warm uncommitted work (the harvest doc itself untracked) and live workerd
processes, the one-executor rule's stand-down signal. Whoever closes that branch deletes the
three staging files as part of the close.

Destinations: the survivors are queued in two pass plans,
`docs/superpowers/plans/2026-08-26-toolkit-seams-pass.md` (behavior) and
`docs/superpowers/plans/2026-08-26-harvest-detection-pass.md` (detection and docs), and are
tracked as live entries in `docs/internal/docs-friction-log.md` until those passes ship.

## The adversarial test

An item survives when the site **cannot legally reach or patch the surface** (engine-owned
CSS, an unexported component, a component's internal event contract), or when a **ratified,
measured grammar has diverged from what the engine ships**. It fails when the hand-roll was
small, domain-shaped, or a discoverability problem an export would not fix.

## Survivors: engine behavior (toolkit-seams pass)

1. **Export the media picker seam** (events-admin 1). `MediaPicker.svelte` and
   `MediaInsertPopover.svelte` exist in `src/lib/components/` but `index.ts` exports
   neither; `mediaLibraryEntry`/`MediaLibraryEntry` are declared internal
   (`src/lib/media/library-entry.ts:11`). No legal import path exists, so ASC rebuilt a
   picker field (`HeroImageField.svelte`) over `readCommittedManifest`, and two ASC stores
   carried "picker seam not wired" comments since pass 2.1. The strongest item in the batch.
2. **StatusChip register reconciliation** (events-admin 12, assets 1, email-announce 5).
   The engine's `register` prop (`bounded`/`quiet`) already concedes the mechanic, but
   `StatusChip.svelte:106` still renders the 6px tone dot Geoff's 2026-08-24 owner probe
   ruled illegible toolkit-wide, and the warning-tint and outline registers are missing.
   ASC's three-register grammar survived three consumer screens unmodified with 26
   canvas-readback measurements (`admin-chip-registers.css`,
   `verify-chip-registers.mjs`), the evidence threshold the assets harvest itself set.
   Absorbing retires ASC's override sheet and the household desk's hand-rolled chip.
3. **ExpandableRow contract fixes, two of four filed** (events-admin 2 and 11): the ~24px
   trigger hit target and an interactive-summary-cell escape. Both live inside a component
   whose event contract consumers cannot patch; today they ship `svelte-ignore`'d
   `stopPropagation` wrappers.
4. **ToolbarDisclosure extraction** (events-admin 7). The four disclosure mechanics
   (`aria-expanded`, `aria-controls`, focus-in, Escape-plus-return) exist proven inside
   `ListToolbar`'s overflow menu; the one consumer that hand-copied them missed all four on
   the first pass.
5. **CsrfField must survive the enhance reset** (events-admin 4). The field renders an
   unbound hidden input (`src/lib/components/CsrfField.svelte`), so a successful
   `use:enhance` submit resets it blank and the next submit 403s against cairn's own guard.
   One repo hit it twice (email compose July, events row form August). The engine makes its
   own field immune rather than policing every consumer form.
6. **Admin-sheet checkbox edge** (email-announce 31). Unchecked `.checkbox` measured
   1.50:1 light / 1.75:1 dark against the 3:1 WCAG 1.4.11 floor, in CSS the engine ships;
   third member of the faint-control-edge family (`.btn` already in agent memory). Sites
   can only patch by overriding engine CSS.
7. **Admin status text vocabulary** (email-announce 4). `text-success`/`text-warning`
   compile to nothing in admin scope and the sheet offers no non-error status tint, so two
   dead utilities shipped silently. The admin design system is cairn's own.
8. **Scoped toolkit list reset** (email-announce 35, events-admin 5, corroborated by
   xcathletes' independent `role="list"` finding). The blanket ask fails against the
   engine's standing ruling (`cairn-admin.css:468`: no `list-style: none`, semantics strip
   in WebKit; the admin wrapper hosts rendered markdown). The scoped form survives:
   padding-only reset inside `.toolkit-*` containers where markdown never renders, plus a
   detection rule (below).
9. **`isUniqueViolation` in `/cloudflare`** (assets 2). Borderline, survives: the
   cause-chain walk encodes workerd platform behavior (SQLite text hiding on
   `error.cause`), four ASC copies now disagree with three weaker than the hardened fourth,
   and `/cloudflare` is the established home for helpers of this size.
10. **Focus-ring split, verify-then-fix** (events-admin 6, second half). Reported: field
    `:focus` reads a near-black `--input-color` ring while `.btn` gets a primary-toned
    `:focus-visible`, patched site-side with `!important`. Not yet confirmed engine-side;
    the task verifies whether the split originates in the packaged sheet and unifies the
    token if so.

## Survivors: detection and docs (harvest-detection pass)

11. **Keep the CSRF guard strict; detect the misconfiguration instead** (email-announce 1).
    Verified: `originMatches` is a strict compare (`src/lib/sveltekit/csrf.ts:23`), so a
    blanket `Referrer-Policy: no-referrer` makes plain same-origin POSTs carry
    `Origin: null` and 403. Do not loosen the guard: ASC's own security review notes routes
    whose only CSRF layer is the origin check. The engine's share is a doctor rule
    (`src/lib/doctor/checks-local.ts`, beside the existing CSRF-handoff check) flagging a
    site-wide `no-referrer`, plus a documented guard constraint prescribing
    `strict-origin-when-cross-origin` as the site default.
12. **`no-uncompiled-class` needs site-stylesheet registration** (email-announce 3). The
    rule reads only the packaged sheet; the config schema
    (`src/lib/audit/config.ts:160`, `static.paletteFiles` precedent) offers no
    compiled-class sources, so ASC closed a pass carrying six known-false-positives.
13. **New cairn-audit rules for the mechanically detectable mechanics**: stripe/edge-trim
    parity clash (assets 3), `font: inherit` clobbering font utilities (assets 4), the
    bare-tag compound the hover/focus-parity check skips (events-redesign 2), a DaisyUI
    dead-class cross-reference against the exclude list (xcathletes filed the same
    independently), a Tailwind-classed `<ul>` without `role="list"` in admin scope, and the
    panel-width overflow rule for tables carrying forms (events-admin 3, failed at its
    third consumer).
14. **Verify the oklch contrast fix reached every rendered rule** (events-admin 10).
    `interactive-contrast.ts:21` documents the `rgb()`-only parser trap, so the engine
    partly knows; the falsifiable-gates standard wants each rendered contrast rule proven
    to red on an oklch surface.
15. **Chassis and docs items**: the smooth-scroll triple with a header-height token and
    `PUBLIC_ORIGIN` as the only origin source (events-redesign 1 and 8, chassis, since
    public output is design-agnostic by charter); the fixed-clock env seam pattern for
    date-dependent baselines (events-redesign 6, testing docs); the dialog-form failure
    recipe and the load-when-panel-opens convention (assets 5, events-admin 9, documented
    recipes until a second consumer justifies a primitive).

## Ruled out: the hand-roll was proper (do not re-litigate without new evidence)

- **Copy-to-clipboard control** (events-redesign 4): generic web widget on the
  design-agnostic public side. Chassis recipe at most.
- **`siteToday(timeZone)` export** (events-redesign 5): a few lines of `Intl`; the same
  repo failed to reuse its own first copy, so the failure is discoverability, which an npm
  export solves no better than the chassis carrying it once.
- **Per-entry dead-body declaration** (events-redesign 3): one entry on one site; the
  proper site fix is deleting the husk page and holding the title in site config. Revisit
  only on recurrence.
- **SQLite-backed D1 test tier** (events-admin 8): real family pain, but a second test
  harness is large surface for a lean package; the sites can share a harness module. "Out
  of scope" is the charter's sanctioned answer.
- **ExpandableRow `colspan` incident-row variant** (email-announce 25): one consumer,
  structurally a different widget. Watch for a second consumer.
- **Warning button tier** (email-announce 2): a family-register design question, held for
  Geoff; neither side invents it.
- **Blanket admin list reset** (email-announce 35 as filed): fails the standing a11y
  ruling at `cairn-admin.css:468`; superseded by the scoped form (survivor 8).
- **Small toolkit idiom notes, below the bar** (email-announce 32 and 33): a labeled-group
  switcher idiom and a static variant of the `computeCountLine` live-region idiom. Noted;
  they ride along only if a task already touches those surfaces.

Everything in the email-announce doc's site-side sections (items 6–30) is ASC domain work,
correctly filed there, including the operationally urgent site-side CSRF remedy (member
sign-in 403s on ASC dev under the blanket `no-referrer` header; the fix is ASC's header
scoping, already prescribed by its own security review).
