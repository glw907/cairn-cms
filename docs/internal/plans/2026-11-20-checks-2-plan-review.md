# Plan review: `checks-2`

One `standards:plan-reviewer` read (Opus, `medium`) of the plan and executor prompt at `545e3cf38`,
code probed at `66aa3352d`, on 2026-11-20. Class `runner`, the one read before code. Verdict: not
ready, with findings 1 to 3 blocking. All eighteen are folded; the plan's "Plan review fold" maps
each to its edit.

1. `[file-list]` blocking. `templates/waymark/.claude/skills/cairn-styling-public-pages/references/checking-a-theme.md`
   is a byte-identical twin of the skill page T3b edits. `bake-template.mjs:189-208` copies it and
   `check:template` (in `close`) fails on drift. Re-emit with `npm run emit:template` in T3b.
2. `[mechanism]` blocking. `run.mjs` prints through `out(...)`, so item 2's grep never matches it.
   After the pass the grep prints 2 (`shared.mjs` and the skipped `check-chassis-boundary.mjs`):
   the design's "2 or fewer" holds unamended.
3. `[ambiguous]` blocking. Kept success lines (`check-options.mjs:393`, `check-leaks.mjs:574`,
   `docs-links.mjs:270`, `check-tiers.mjs:91`, about 15 more) have the form `<name>: OK (<count>)`
   and still match the verdict grep. Per-item lines too (`check-custom-surface.mjs:216-218`,
   `check-skill-budget.mjs:298`). Give one rule for info lines with a worked example.
4. `[mechanism]` should-fix. Four success verdicts span lines (`check-idioms.mjs:499-501`,
   `check-readiness.mjs:287-289`, `check-snippets.mjs:549-551`, `check-package-files.mjs:497-499`);
   line-based checks miss them. T4's test matches whole-file text and is shown to fail at base.
5. `[ambiguous]` should-fix. `editorQuotesReport` (`check-editor-quotes.mjs:273`) returns a verdict
   line, pinned at `check-editor-quotes.test.ts:230`.
6. `[ambiguous]` should-fix. `check-audit-pack.mjs` ends with a bare `main();` and
   `check-consumers.mjs` is top-level code with no guard.
7. `[mechanism]` should-fix. `release-cut-guard.test.ts:17,34` stubs `check-stable-source.mjs`, so
   added check 6 can't catch a lost `sha:` line. Prove it against the real script.
8. `[conflict]` should-fix. Standing answer 24 approves held-file edits the pass tables list; the
   `checks-2` row (`route-rounds.md:348`) lists none, so the `preflight.mjs` edit's authority is the
   pass's own `merge` document.
9. `[ambiguous]` should-fix. The theme check's failure path would print failure lines on both
   streams; `--catalog --json` is unplaced.
10. `[file-list]` should-fix. `npm run check:docs-gate` isn't run after the docs edits.
11. `[estimate]` should-fix. T3b carries 19 files and the docs; price it at 90. Cite the path formula's source.
12. `[stale-fact]` low. M4 says 30 `scripts/checks` scripts where the rows run 32 (31 plus the skipped);
    the edits are 35, not 33; `check-leaks.test.ts` imports the module, it doesn't spawn it.
13. `[design-gap]` low. The structure row's subprocess and file-walk helpers are dropped silently.
14. `[ambiguous]` low. Name `shared-throw.mjs`; place `check-surface --update` and
    `check-admin-prose --list`; give the extraction regex; say whether problem prefixes change.
15. `[no-answer]` low. Write the retired-form command out; say how an outside-repo hit closes.
16. `[estimate]` low. Acceptance 7 runs the `render` rule; narrow it with `--rules`.
17. `[owner-call]` low. Item 1's count and the verdict-form reconciliation are method calls, not Geoff's.
18. `[ambiguous]` low. The prompt says lane after each task; the plan says after T2, the pair, and T4.

Holds: every verbatim copy, the base counts (19, 25, 17 and 14, 43, 44, 34), the import-cycle
map, the release hook's parse, version-rise's tests, the theme viewer's JSON parse, and the
prompt's required fields.
