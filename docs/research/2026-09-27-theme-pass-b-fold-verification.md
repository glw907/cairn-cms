# Theme identity passes B and C: fold verification (2026-09-27)

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` at `fb13fdeb`
(703 lines), after four folds. **Method:** a fresh read with no part in the folds. Every blocker and
major in the nine reviews was traced to the spec line that closes it. Cross-section consistency was
read end to end. Load-bearing mechanisms were checked against the tree, and the two compile probes
were re-run. Findings are ranked by consequence; the spec is sound in substance, and most findings
are minor.

**Counts:** 0 blockers, 2 majors, 9 minors.

## Q1. Did each blocker and major close where the fold record says?

Yes. All three blockers and every major trace to a spec location that closes them.

| Review findings | Closed at (spec lines) |
|---|---|
| CP1 blocker (no CSS home for built-in public components) | 163-174, 238-245 |
| CP2 blocker, RK1, ID1 (pruning) | 173-174 (`@source`), 219-220 (`@theme static` rejected), 532-534 (template arm) |
| CO1 blocker, RK7 (template imports unpublished subpath) | R1 675-682, Release 651-659 (see m1 on the "no window" claim) |
| CT1 fixtures | 508-518 |
| CT2 CI demotion | 436-440 |
| CT3 token drift | 496-501 |
| CT4, CO6, EC F7 (CSS subpath ungated) | 502-507 |
| CT5, ME1, RK3, CO4, TH6 (roots, empty scope, disjoint) | 374-389, 545-546 |
| CT6, ME5, SZ4 (build observable) | 519-536, 547-550 |
| ME2 `sheet.ts` | 620-621 (task 6, first audit task) |
| ME3, RK2, CO8, ME12, SZ3 (resolver, deps) | 421-434, 442-450 |
| ME4 N population | 260-264 |
| RK4 residue list and migration | 203-205, 582-586 |
| RK5, ID2, TH2, EC F6 (layering) | 167-168, 207-221 |
| RK6, ME9, TH5, SZ2, CT9 (resolution set) | 409-418 |
| CO2 charter premise | 222-231 |
| CO3, RK9 | R2 683-688 |
| CO5, ID7, SZ1 (shared detection core) | 395-396 |
| CO7 eyebrow | cut; job-table row 464-465 |
| ID3, TH7 (spacing collision) | 190-201 |
| EC F1 (emitted-class bindings) | 175-178, 233-236 |
| EC F2, TH3 (Waymark keys in contract) | 185-188 |
| EC F3, TH1 (built-in merge) | 404-406 |
| TH4 (literal zone) | 399-402 |
| CP3 (engine components assume contract) | 238-245 |
| CP4 (the library) | 40-42 |
| CP5 (implementer line, recipe split) | 474-479, 487-492 |

The fold record's refusals (CO17, ID5, ID6, and the sub-arms of RK5, TH5, F5, F14) are reasoned.
None of them hides a defect.

## Q2 and Q3. Contradictions, pass order, and new mechanisms

### Major

**M1. The rename's acceptance grep cannot print nothing at pass B's merge.**
- **Location:** spec 131-140.
- **Defect:** the grep excludes the history dirs and `CHANGELOG.md`, but not the per-version
  records or the rulings ledger. It also matches the text pass B is required to write.
- **Evidence:** run on `main` today, the grep matches 177 files. The following cannot be rewritten
  without falsifying a record or dropping a required instruction:
  - the per-version record `docs/extend/migration-notes.md:393`, an older version's entry naming
    `dist/components/cairn-admin.css`;
  - the settled rulings' Record fields in `docs/internal/engine-rulings.md:5438,6031,6165,6293`;
  - pass B's own mandated migration note and `Consumers must:` text (spec 123-126, 603-604), which
    must name `./components` and `src/lib/components`.
- **Proposed fold:** add `':!docs/extend/migration-notes.md' ':!docs/internal/engine-rulings.md'`
  to the exclusions. State that the records keep the old paths.

**M2. Pass B's "or name that root" option is silently undone by pass C.**
- **Location:** spec 108-111 and 125-126, against 374-375 and 381-383.
- **Defect:** pass B tells a site that keeps custom admin components in `src/lib/components` to
  move them, or to name that root in `cairn-audit.config.json`. Pass C then does two things:
  - it makes `src/lib/components` a default public root;
  - it rules that "the admin static scope skips any file the public scope claims".

  A site that took the second option loses admin-rule coverage at the next release, and it gains
  public-scope findings on admin markup. Neither release's migration note says so (587-588 is
  silent).
- **Evidence:** the three passages as quoted above. No precedence rule exists for an explicitly
  configured root.
- **Proposed fold:** either drop the "or name that root" option, so pass B says move only, or state
  that a root a site names in one scope leaves the other scope's defaults. Pin that with the
  disjoint-roots test (383).

### Minor

**m1. The Release paragraph and R1 overstate "no window".**
- **Location:** spec 651-659 and 679-680.
- **Defect:** the spec says "No window opens where the template on `main` imports an unpublished
  subpath."
- **Evidence:**
  - `templates/waymark/package.json:23` pins `"@glw907/cairn-cms": "^0.97.0"`.
  - `packages/create-cairn-site/scripts/emit-template-dir.mjs:136` derives the range from the
    engine version (`^${enginePackage.version}`).
  - A pass leaves `package.json` untouched, so after pass B's merge the template imports `./admin`
    and `./public` against a range that resolves to 0.97.x until the cut re-emits it.
  - `0.98.0` and `0.99.0` are free: npm's newest version is `0.97.0`.
- **Proposed fold:** say the window runs from merge to cut. The close cuts right after merge, and
  the cut's re-emit moves the template range. R1 stays rulable either way.

**m2. R2 has two promotion triggers and no tripwire.**
- **Location:** spec 685-688.
- **Defect:** the spec says promote "at the next minor" and also "waits for each production site's
  advisory count to reach zero". Under R1's yes, the next minor is `0.99.0` itself. Nothing detects
  the zero count, which the repo's watch-item rule would make a gate or a ROADMAP entry.
- **Proposed fold:** use one trigger: "at the first minor after every production site reports
  zero". File it in ROADMAP's "Toward 1.0" tier.

**m3. The admission rule contradicts the heading keys' placement.**
- **Location:** spec 185, against 305-307 and 316-317. Also 203-205.
- **Defect:**
  - Admission says a key enters `cairn-public.css` "when an engine or chassis file reads it".
  - The heading section says the keys stay out of the engine sheet because "only chassis and
    template files read them".
  - Lines 203-205 say "the roles … leave" the chassis `tokens.css`, yet `--cairn-heading-case` is a
    `--cairn-*` role that stays there.
- **Proposed fold:** amend the admission sentence to exempt site-owned design choices (the scale,
  and heading weight and case), and list `--cairn-heading-case` in 203-205.

**m4. The radius sweep misses two literals.**
- **Location:** spec 343-352.
- **Defect:** the test "finds no `border-radius` literal outside the named exceptions". Two literals
  are neither swept nor named:
  - `chassis/prose.css:302` (`1px` on the list-marker diamond, a shape like the pill);
  - `theme/site.css:166` (`border-radius: 0`).
- **Proposed fold:** name the diamond as a third shape exception, and exempt `0`.

**m5. `PreviewBanner` has five override properties, not four.**
- **Location:** spec 244.
- **Evidence:** `src/lib/components/PreviewBanner.svelte` reads `--cairn-preview-bg`, `-border`,
  `-fg`, `-link`, and `-radius`.
- **Proposed fold:** say "five".

**m6. The Names grid disagrees with the scope defaults and one export.**
- **Location:** spec 69 and 71-72.
- **Defect:**
  - The custom public cell omits `src/lib/components`, which 374-377 makes a default public root
    for exactly that use.
  - "`./public` exports every built-in public component" is untrue of `CairnHead`
    (`src/lib/delivery/CairnHead.svelte`, exported at `./delivery/head`).
- **Proposed fold:** add the root to the grid, and narrow the rule to "every built-in public
  component that renders styled markup".

**m7. The theme-root default leaves the chassis scale ambiguous.**
- **Location:** spec 399-401 and 511.
- **Defect:** theme roots default to `src/theme`. The chassis `tokens.css` sits in the public scope
  and defines `--text-step--1: 0.85rem` and similar (lines 79-81). The fixture list flags "a literal
  custom property outside a theme root", and `rem` is an absolute font size. Read strictly, cairn's
  own tree fails on day one.
- **Proposed fold:** state that a custom-property definition is checked for color literals only,
  or add the chassis `tokens.css` to the default theme roots.

**m8. Tasks 4 and 5 cannot carry their harness checks.**
- **Location:** spec 280 and 614-628.
- **Defect:** the section promises that "each outcome carries a check". The toggle, heading,
  skip-link, and corner checks live in `test:theme-fixture`, which task 10 creates, so tasks 4 and 5
  land without them.
- **Proposed fold:** say those checks land in task 10, or move the harness ahead of task 4.

**m9. Probe 3 compares two themes in an arm that builds one.**
- **Location:** spec 548-550, against 532-534.
- **Defect:** probe 3 compares Waymark and the fixture "in the harness's template arm", but that
  arm builds only Waymark.
- **Proposed fold:** the template arm also swaps in the fixture, or probe 3 compares in the
  showcase-copy arm.

### No contradiction found

- **Pass order:** B after A, C after B, and the "no" path on R1 are consistent between Sequencing
  (642-649), Release, and R1. Pass C's tasks are in buildable dependency order: `sheet.ts` precedes
  the rules, the root export (task 5) precedes the coverage gate (task 12), and the heading keys
  (task 4) precede the conformance collision finding (task 8).
- **Names, paths, and subpaths:** `./admin`, `./public`, `./cairn-public.css`, `src/lib/admin`, and
  `src/lib/public` agree across the Names, rename, contract, guidance, and Delivery sections. The
  reference pages `admin.md`, `public.md`, and `public-css.md` are assigned consistently.
- **The parent spec:** its Release ("no publish, batches with the next consumer-facing release") is
  honored by R1, which cuts A with B. "Pass B cannot go first" (parent 578) is preserved.

### New mechanisms (Q3)

| Mechanism | Source | Check |
|---|---|---|
| `font-*` resolves the `--font-*` family before `--font-weight-*` | scratch `tw/t.mjs` | Re-run and reproduced: with both keys declared, `.font-display` and `.font-heading` emit only `font-family`. With the weight alone, `.font-heading` emits `font-weight` |
| `@theme inline` color does not recompute under a nested theme | scratch `fold/t.mjs s1.css` | Re-run and reproduced: `--color-muted` is emitted on `:root` as `var(--cairn-muted)` |
| daisyUI sets `color-scheme` per block | `theme.css:100,148` | Verified |
| `resolveTheme` falls back to `matchMedia` | `theme-toggle.ts` | Verified |
| Preview reset pins `background:#fff` | `preview-doc.ts:105` | Verified |
| `serializeComponent` and `previewValues` exist but have no public export | `component-grammar.ts:44`, `registry.ts:226` | Verified |
| F10, F11, and F12 filed in ROADMAP | ROADMAP.md 320, 336, 2135 | Verified |

No fold states a load-bearing mechanism from memory. `sr-only focus:not-sr-only` and reading
computed `color-scheme` are stock platform behavior.

## Q4. Can Geoff rule R1 and R2?

**R1: yes.**
- The trade is stated plainly on both sides: two `Consumers must:` lists, or a held branch.
- The version numbers are free.
- The trigger claim (the template goes live from `main`) is sourced in the parent spec's Release
  section.
- m1 sharpens the "no window" wording but does not change the choice.

**R2: yes, on policy.**
- The yes and no outcomes and the charter consequence are stated.
- The spec gives no estimate of each site's advisory count, but the ruling does not need one.
- m2's wording fix makes the promotion trigger unambiguous.

## Q5. Right-sizing

The growth from 245 to 703 lines is mostly real decisions and criteria from 99 review findings
and 18 walkthrough items. About 200 lines are one of three things:
- implementation detail the plan owns;
- repetition of the same decision in two or three sections;
- fold and review narration that belongs in the fold record.

A disciplined trim to about 500 lines (roughly 29% smaller) loses no decision and no acceptance
criterion.

| Section (lines) | Cut | Est. lines |
|---|---|---|
| Status 3-12 | Fold-by-fold narration. Keep "draft; awaits R1 and R2; changes in the fold record" | 8 |
| Extends and Evidence 14-29 | The erratum sentence; the evidence narration (also drops the stale caption-tracking claim) | 5 |
| Names 71-78 | 71-74 restate the grid and 106-109. Keep the docs-register task sentence | 4 |
| Rename 98-104 | The file-by-file reference list is plan work, and the acceptance grep already enforces it. Keep "run alone after A merges; adds `public.md`" | 5 |
| Admin-only scope 113-121 | The "middle root" comment rewrite is implementation. The conditional duplicates Open-for-plan 702-703. Keep one sentence | 6 |
| Consumers must 123-126 vs 106-111 vs 600-605 | The same three parts stated three times. Keep 123-126 only | 6 |
| Why the scale stays 190-201 | The three-findings argument goes to the fold record. Keep the decision, the built-in-component cost, and the README fix | 5 |
| Why in a layer 207-221 | The daisyUI emission mechanics and the rejected `@theme static`. Keep the layer, the selector, the shadow limit, and the nesting limit | 8 |
| Why the engine 222-231 | The ruling argument, whose proposed text is already in the fold record. Keep one sentence and the ruling pointer | 7 |
| Built-in public components 238-245 | "Pass B already moved it" repeats 90-96 and task 3 | 3 |
| Inks 254-273 | Relative-color-syntax aside; measurement method (plan). Keep the formula, AA as the guarantee, and Waymark's overrides | 5 |
| Walkthrough 275-368 | Each bullet narrates the bug (the friction log has it) and names line-level fixes. The `--font-weight-display` rejection (310-315) goes to the fold record. Keep outcome, constraint, and check per item | 45 |
| Guard 370-450 | Resolver internals (culori `interpolate`, "every printed digit", the prefersdark selector expansion) and detection-core detail belong in the plan and the fold record. Keep the bounds and "unmeasured, never pass" | 12 |
| Guidance 452-492 | The dotfiles commit procedure (489-492) is close-ritual process. Trim the table-row prose | 6 |
| Proof 494-558 | 527-532 and 537-540 restate the walkthrough checks a second and third time. The probe-retry process (553-554) belongs in the plan | 12 |
| Documentation 560-591 vs Delivery closes 600-605 and 635-638 | The facts and close-edit lists overlap. Keep one list per pass | 6 |
| Delivery 606-634 | The thirteen-task breakdown is plan content, and "new in the fourth fold" is narration. Keep sizing, the rename-alone rule, `sheet.ts`-first, and the harness-before-probes order | 25 |
| Release 651-659 vs R1 675-682 | The same argument twice. Keep R1 | 6 |
| Review 661-669 | Process narration; it belongs in the fold record | 8 |
| **Total** | | **about 190 to 210** |

Keep as they are: the governing principle, the Names grid, the three-part contract, the naming and
admission rules (after m3), the seam promise, the rule definitions and their fixture lists, the
equivalence and snapshot tests, the probes' pass conditions, R1 and R2, and Open for the plan.
