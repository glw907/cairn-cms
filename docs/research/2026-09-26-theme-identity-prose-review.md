# Prose review: theme identity design spec at `dc66584d`

Reviewer: `prose-voice-reviewer` (Opus 5.5), 2026-09-26. Audience: implementing and planning agents;
the spec is not register-graded, so it is judged on implementer clarity and facts. Sources checked:
the spike, the fold record, the fold verification, the arc log, `docs/internal/engine-rulings.md`,
and the tree.

Facts verified: every named path, anchor, script, test, token, and audit rule exists except
`check:skill-budget` (finding 11). No source under `src/lib`, `examples/showcase`, or `scripts`
changed since `2776dfa3`. Goal quotes are verbatim. The daisyUI 5.7.44 active forms, the unnested
declarations, 580 of 649 classes, 217 to 580, the size table, the gzip and brotli deltas, the 18-entry
allowlist, rule 10's locked value, `PageHeader.svelte:59`, `ConceptList.svelte:325`, and the starter
radii all match their sources.

## Blockers

1. `:139`: the amended layer rule still calls the theme roots unlayered. Under D1 the plugin blocks
   land in `@layer base` (spike Condition A); only the plain root rule stays unlayered. Replace with:
   "Unlayered: the plain theme-root rule on the two `[data-theme]` selectors, which holds cairn's own
   tokens and the non-custom declarations (D1), the box-sizing and reduced-motion resets, and pinned
   rules 1 to 9. The `@plugin "daisyui/theme"` blocks are not a cairn home: daisyUI emits them into
   `@layer base`."
2. `:149-153`, `:248-256`, `:562-571`: two fold hand-offs to the plan are missing (fold record
   `:152`, `:156`, `:159`). m5: the selected-segment exclusions (color variants, `btn-outline`,
   `btn-dash`) and keeping `BtnActiveDarkGround.test.ts`'s color-variant and `text-error` assertions.
   m9: seed light's hairline from the locked `ring-base-content/55` (`segmented-control.ts:10-24`).
   Also, rule 11 keys only on `.btn-active` while the segment now keys on four forms. Add three
   "Open for the plan" items covering the exclusions, whether rule 11 widens to the four forms, and
   the hairline seed.
3. `:481-483`, `:6-7`: the D1/D2 owner quote and decisions exist only in the spec. Append a
   "Decisions after review" line to the arc log with the verbatim quote, and a "Superseded: R1 and R2
   were decided as D1 and D2 in the spec at dc66584d" line to the fold record's "Not settled here".
4. `:487-506`: D1 overstates the split. It removes truncation, confines demotion to daisyUI's own
   variables, and the test change (not the split) fixes the raw partial; "no capability gained" is
   not a hazard. Say that daisyUI's variables are demoted to `@layer base` and why that is accepted.
   The build assertion must run with and without a hostile unlayered host sheet (the spike's
   `equiv.mjs` form). Restore the dropped constraints: oklch literals free of single quotes
   (`grammar-tokens`, `role-layer-contrast` read source text), and the `src` imports in
   `CairnAdminShell`, `LoginPage`, and `ConfirmPage`. The plugin blocks carry exactly the keys of
   daisyUI's theme object, including `color-scheme`; `--color-positive-ink` belongs in the plain rule.

## Warnings

5. `:530-531`, `:38`: "243 KB raw, more than half the growth" is wrong (46% of raw growth; the D2
   growth excludes calendar). Replace with "Alone it adds 243,525 unminified bytes, about as much as
   the other 64 modules together (257,518)", and "costs 243 KB raw" with "adds 243 KB unminified".
6. `:526`: relabel the row "Full spike (theme blocks, all components minus calendar, the sublayer)".
7. `:167-169`: decision 4 is misquoted. Quote "No unlayered override of the four components (`.modal`,
   `.drawer`, `.collapse`, `.btn`)" and state the timing-scoped reading (CS-B1) as a reading the plan
   records in the rulings ledger or files.
8. `:3-5`, `:68`, `:481`: the provenance is misstated. The spike and the fold verification reopened
   two details of ruling 1; neither is "beyond" it.
9. `:456-462`: add the design-system rule "Verify visuals on the showcase, not in component tests"
   (`admin-design-system.md:104-107`), which D1 makes stale.
10. `:510-511`: replace the unsupported closing claims with "daisyUI's own variables then sit in
    daisyUI's documented theme format, and cairn's tokens sit in cairn's own rule beside them."
11. `:411`: `check:skill-budget` is not an npm script; write "`check:package` (which runs
    `check-skill-budget.mjs`) stays green."

## Suggestions

12. `:218-219`: add `megamenu` and `otp` to the field-sized list.
13. `:333`: widen the regex size group to `(xs|sm|md|lg|xl|2xl|3xl|4xl)`.
14. `:213`: attribute "never zero" to the round 4 verdict in the arc log, not as a quote.
15. `:497`: name `--cairn-shadow` instead of "the shadow pair".
16. `:529`: drop "and cached" (unmeasured).
17. Style: `:102` setup-colon payoff (rewrite given), `:131` flourish (cut), `:540` over-long line
    (rewrap).

Scanner: `tellgrader --register docs` reported 8 hard hits, all the directory name "showcase"; no
rewrite recommended for an agent-facing spec.

Verdict: the facts are sound; four gaps would mislead a plan author (findings 1 to 4).
