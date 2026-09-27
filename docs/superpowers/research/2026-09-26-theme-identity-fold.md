# Theme identity spec: fold record

Target: `docs/superpowers/specs/2026-09-26-theme-identity-design.md` at `2776dfa3`, revised in place.
Inputs: the four lens reviews (`2026-09-26-theme-identity-review-{contract,mechanics,risk,consistency}.md`),
the spike (`2026-09-26-theme-identity-spike.md`), and the owner's six rulings in the arc log.

Finding IDs carry a lens prefix: **CT** contract, **MX** mechanics, **RK** risk, **CS** consistency.
Each ID has one disposition. A duplicate across lenses is folded once, and the row lists every ID.

## Counts

59 finding IDs: contract 11, mechanics 15, risk 15, consistency 18 (including fork F1).

| Disposition | Count |
|---|---|
| Folded | 57 |
| Refused | 1 (MX-m6) |
| Owner fork, already ruled | 1 standalone (CS-F1, ruling 2), plus 8 fork halves inside folded findings (rulings 1, 3, 4, 5, 6) |
| New owner fork | 1 (R1, a revision of ruling 1's authoring detail) |

## Root fix: the layer blocker

**MX-B1, RK-B1, CS-B1, MX-M4.** One root across all four lenses: daisyUI
compiles its components into `@layer utilities` sublayers, so lever 3's `@layer components` home cannot
win. Folded into the new Architecture section: the `cairn-idiom` sublayer with the pinned order, the
three conditions every rule meets (full state set, narrow selector, variables first), the
renders-and-loses-to-a-utility test per rule, the amended load-bearing layer rule, the
`check:custom-surface` category, and the disposition of pinned rules 10 to 14. The fork each lens
raised on the home is ruling 1; the sublayer is also the dominant answer on the evidence (unlayered
beats markup utilities, components loses to daisyUI), so the spec records why rather than asking.

## Dispositions

| IDs | Disposition | Where |
|---|---|---|
| MX-B1, RK-B1, CS-B1 | Folded (root fix); fork halves are ruling 1 | Architecture |
| MX-M4 | Folded | Architecture, "Gates and the pinned rules"; Proof gate list |
| MX-M1, RK-M1 | Folded | Material: lift as `--btn-shadow` in cairn-idiom, same in every state, tested; modal repair moved and tested; the false "depth 0 removes achromatic shadows" claim removed |
| MX-M2, CS-M1 | Folded; the stock-versus-tinted fork is ruling 4 | Buttons, "Soft primary states" (full state set, `--btn-fg` pinned) |
| MX-M3, RK-M3, CS-M2 | Folded | Buttons, "The selected segment": supersedes rules 10 and 12, keys on the four active forms (the second fold added `[aria-current]`), keeps the state hairline in both themes, 3:1 measure in Proof, "segmented control" naming |
| CT-m3, MX-m1, RK-M2 | Folded | Buttons, plain `btn`: enumerated exclusions, explicit hover, never `--btn-color`; focus-ring 3:1 in Proof |
| MX-M5, CS-m9 | Folded | Architecture, "One compiler, every component" (full compile makes the switch, `alert-info`, and the radius utilities ship) plus the presence test |
| MX-M6 | Folded | The switch: three checked forms, 9999px track and knob, color variants excluded |
| CT-M3 | Folded | Acceptance G1: the fixture screen and its spec |
| CT-M2, CS-M3, RK-m5 | Folded | Alerts: success row, per-root ink tokens, error reuses the locked quiet-danger triple, bare `.alert` unchanged, nested link in Proof |
| MX-m7 | Folded | Success row (Alerts); tracking (Buttons); the missed radius sites (Corners) |
| CT-M1, MX-m4, CS-m1 | Folded; the document-title fork is ruling 6 | Type and icons: `PageHeader.svelte:59`, `type-title font-[550]`, grep post-condition |
| CT-m5, MX-m2, RK-m1 | Folded | Type and icons: `svg.lucide[stroke-width='2']` in cairn-idiom, WATCH comment. CT-m5 placed the rule in `@layer components`; the components cap is full at 19/19, so it takes the sublayer, where it works equally |
| CS-m10 | Folded as an execution choice, the vendor-context alternative declined | Type and icons. Lucide's `setLucideContext` reaches only icons instantiated under the provider from the same module instance; the CSS rule reaches a developer's icons from any Lucide build under the admin root, which G1 needs |
| MX-m3 | Folded; the fork is ruling 5 | Type and icons, inline SVGs |
| CT-M4 | Folded | Header: the probe's PNG captures are committed in `docs/internal/record/2026-09-26-theme-identity/` (in `ea7b2575`); the verifier grades against them |
| CT-M5 | Folded | Markup sweep post-condition; pass B promotes it to shipped rules |
| CT-m1, RK-m6 | Folded | Starter: edit the showcase, `emit:template`, `check:template`; Release: the starter is live on merge |
| CT-m2 | Folded | Corners: structural zeros stay |
| CT-m4, CS-m8 | Folded | Buttons, "Button type": tracking follows weight |
| CT-m6 | Folded | Proof: browser-resolved contrast on the fixture |
| MX-m5, RK-m7 | Folded | Starter: file (`theme.css`), layer (`site-theme` sublayer), scope (`var(--btn-color, hairline)`); `test:reskin` in Proof |
| MX-m6 | **Refused** | `color-mix` is Baseline 2023 and the admin already depends on it in rules 10 and 13; writing a deliberate non-mix fallback for every soft and alert rule costs more than the risk of a pre-2023 engine opening `/admin` |
| MX-m8 | Folded | Corners, concentric: `--radius-field` on the padded `dropdown-content menu` panel, proven by test |
| RK-M4, CS-M4 | Folded | Proof, "The audit's own data": `RATIFIED_NORMS`, `norms:generate`, `norms:check`, the `chip-ground-collision` re-key, the before-and-after rendered run; kept in pass A (Delivery) |
| RK-M5 | Folded; the fork is not raised, because the selector step was shown in the round 2 probe (settled) | Density: every field- and selector-sized family, the 320 and 390 checks, the rendered rules, the alignment test |
| RK-M6 | Folded; sequencing is ruling 3 | Delivery; Documentation (freeze rule re-read at plan time) |
| RK-m2 | Folded | Corners: true circles by shape |
| RK-m3 | Folded | Corners: token with literal fallback in toolkit components |
| RK-m4 | Folded | Proof: named input to the settle audit |
| RK-m8 | Folded | Proof gate list; Scope and Proof note on the preview pane |
| CS-m2 | Folded | Corners inventory: 33, the missed sites; Markup sweep: the two badge `border-transparent` sites |
| CS-m3 | Folded | Buttons, "Padding" states the `btn-sm` reading and why; arc-log line owed (errata) |
| CS-m4 | Folded | Density: control density, font-size grade stays open |
| CS-m5 | Folded | Corners: cites Geoff's round 4 "never zero" |
| CS-m6 | Folded | Material: "pulls the stock lever" |
| CS-m7 | Folded | Corners: the one-family grammar holds |
| CS-M5 | Folded | Starter: pass A takes the `theme.css` half of the ROADMAP item; ROADMAP edit owed (errata) |
| CS-M6 | Folded | Documentation points at the errata below |
| CS-F1 | Ruling 2 | Starter, hairline outlines; public-design-system erratum below |

Every ID is covered: CT-M1 to M5, CT-m1 to m6; MX-B1, MX-M1 to M6, MX-m1 to m8; RK-B1, RK-M1 to M6,
RK-m1 to m8; CS-B1, CS-M1 to M6, CS-m1 to m10, CS-F1.

## Rulings section

One entry, **R1**: whether the theme roots are authored as `@plugin "daisyui/theme"` blocks (ruling 1's
detail) or stay hand-written. The spike surfaced four conditions ruling 1 did not have: silent comma
truncation, demotion to `@layer base`, the raw partial losing its palette, and no capability gained
under scoping. The spec recommends keeping the hand-written roots with a variable-completeness test,
and states what each answer changes. The second fold added **R2**, a yes/no confirmation of the full
compile's size cost and the calendar exclusion (see "Second fold").

## Errata owed to ratified documents

The pass fixes these; this fold did not edit them.

- `docs/internal/admin-design-system.md`:
  - `:36-42` charter calibration lists "the pill family" among inherited grammars.
  - `:75-86` the load-bearing "Scoped overrides go in `@layer components`" rule (amend to the three homes).
  - `:80` and `:394` claim a violet `.btn-primary` lift that never rendered; the lift is now warm.
  - `:264` / `:272` page-heading recipe `text-2xl font-bold`; the code is `type-title`.
  - `:368-378` the Active nav recipe's "`--depth` set to `1` ... do not write a cancel rule".
  - `:391` brand mark `rounded-xl`; it moves to `rounded-box`.
  - `:652-677` the segmented-control section (rule 10 superseded, hairline now both themes).
  - `:1278-1282` the versioned seam lists only `--radius-field` and `--radius-box`; add `--radius-selector`.
  - `:1320-1348` the starter template section.
  - Pre-existing drift to fix while there: `:659-660` gives `ring-base-content/20` (code is `/55`);
    `:1301-1303` says "two unlayered forced workarounds" (fourteen, thirteen after this pass); `:1327`
    gives the starter path as `src/lib/theme.css` (it is `src/theme/theme.css`).
- `docs/internal/public-design-system.md:257-261`: the never-cross-over line; geometry and edge grammar
  are now shared (ruling 2). Also `:26-29` and `:75-76` on starter geometry.
- `docs/reference/components.md:25-26`: "a status-pill family".
- `docs/reference/cairn-audit.md:455-468`: the `border-radius 16px ... ratified` example.
- `ROADMAP.md:880-885`: the Waymark citation item; pass A takes the `theme.css` cites, so narrow it to
  the `site.css` and `prose.css` cites. File the rules 1 to 9 move as a later ratchet shrink.
- `docs/internal/record/2026-09-26-theme-identity-arc-log.md`: one line recording that `--btn-p
  0.875rem` applies at `btn-sm` (CS-m3), and a note that the round 1 lift could not have come from the
  shipped rule (MX-M1).

## Deviations from the fold brief, with reasons

- The brief placed "regenerating the norms manifest and its ratified radii" with the pass B guidance.
  The spec keeps that regeneration, and the `chip-ground-collision` re-key, in pass A. `norms:check`
  runs in CI and fails the moment the radii change, and every pass boundary must sit on a green gate.
  Pass B keeps what `cairn-audit norms` prints.
- This fold accepted the full compile's size cost and excluded calendar. Ruling 1 had left the cost
  to the owner, so the second fold withdrew that acceptance and put it to the owner as R2.
- The brief's one-sentence model says "every daisyUI component available". The spec keeps the
  sentence verbatim and states the two limits right after it: calendar is excluded, and responsive
  variants compile only where cairn's markup uses them.

## Not settled here

- R1 and R2 await Geoff.
- Three values are left to measurement in the plan: the soft primary's active step, the dark lift
  value, and the light selected-segment hairline. The plain button's hover step is proposed and graded
  at the before-and-after.
- The modal's warm shadow has been ratified in the design system but has never rendered. The spec
  treats it as implementing a ratified decision and puts it in Geoff's before-and-after, not in a fork.

## Second fold

Input: `docs/superpowers/research/2026-09-26-theme-identity-fold-verification.md` (0 blockers, 2
majors, 10 minors). Each finding was checked against daisyUI 5.7.44 and @lucide/svelte 1.47.0 in
`node_modules` before it was folded. The same fold renamed the sublayer.

| ID | Disposition | Where |
|---|---|---|
| M1 | Folded. Verified: `button.css` keys active on `[aria-current]:not([aria-current=false],[aria-current=""])`. | Architecture, "Full state set"; Buttons, the plain `btn` exclusions and the selected-segment keys; G1 fixture gains an `aria-current="page"` segment, and its spec asserts it renders selected |
| M2 | Folded as R2, a yes/no confirmation after R1, recommended yes, with the spike's size table | Rulings, R2; the "Accepted." sentence, the Architecture opener, the Status line, the facts bullet, and pass A now defer to R2 |
| Rename | `cairn-theme` becomes `cairn-idiom` in the spec and this record. The pin reads `@layer utilities.daisyui, utilities.cairn-idiom;`. "The cairn theme" already names `examples/cairn-theme/`, and the names convention gives each part one name (`docs-register.md`, "Names"). This also settles m9's naming half. | Throughout; one line in the arc log's rulings section |
| m1 | Folded. The corrected pattern was probed: it matches bare, sized, arbitrary, and side forms, and no token class, `rounded-full`, or structural zero | Markup sweep, post-condition |
| m2 | Folded. Verified: `.alert`'s `border-color` is unnested in `@layer utilities` | Variables list gains `--alert-border-color`; a note under the sublayer names the unnested declarations (`.alert`, `.kbd`, `.collapse`) |
| m3 | Folded. Verified in `buildLucideIconNode.js` | Type and icons: any rendered stroke of exactly 2 is retuned, explicit `strokeWidth={2}` and size-24 `absoluteStrokeWidth` included; `2.01` or a scoped exception keeps a deliberate 2px |
| m4 | Folded | The switch: the off-state 3:1 is now a Proof measurement, not a claim; Proof lists the unchecked track edge and knob |
| m5 | Owed to the plan | The selected-segment rule's color-variant, outline, and dash exclusions, and the `BtnActiveDarkGround.test.ts` rewrite keeping its color-variant and `text-error` assertions |
| m6 | Folded | Gates and the pinned rules: rules 10 to 12 retire; the guarded-button rule stays unlayered; decision 4 is timing-scoped (CS-B1) |
| m7 | Folded | Delivery: both passes touch `src/lib/audit` (`chip-ground-collision.ts`, `norms.ts`); safe because B runs strictly after A merges |
| m8 | Folded | R1: plugin blocks buy idiom alignment; consumers never author the roots |
| m9 | Naming half folded by the rename. The hairline half is owed to the plan | Seed light's selected-segment hairline from the locked `ring-base-content/55` mix (`segmented-control.ts:10-24`), or state why it differs |
| m10 | Folded | This record's CT-M4 row |

Owed to the plan: m5, and m9's hairline half. The verification's "checked and sound" details (the
starter rule's own state set and its `badge-outline` half) stay with the plan item the spec already
names.
