# Prose review of the pass B and C spec (2026-09-27)

prose-voice-reviewer, against spec commit 7f902c70.

**Review of `/var/home/glw907/Projects/cairn-cms/docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`**

**Setup.** This is an internal design spec. Its closest register is `technical-doc-web.md`, but specs are not register-graded, so facts and contradictions come first and style gets a light touch. No corpus manifest was named, so I graded without one. I checked the spec against the tree at `7f902c70`, the fold record, the nine review files, the parent spec, the pass A worktree, `node_modules`, the five sibling site repos, and `npm view`.

**Scanner (`tellgrader --register docs`).** 5,575 words, 368 sentences, cadence CV 0.66, 3 tricolons, 2.15 tells per 1,000 words. It returned no `measures` object because the profile did not resolve, so the table below comes from my own reading.

| measure | value |
|---|---|
| sentences | 368 (scanner count) |
| hinged_pair_share / short_sentence_share | unavailable (no `measures` object) |
| average sentence length | about 15 words |
| longest sentence | about 55 words, the pass B `Consumers must.` sentence (L93-97) |
| paragraphs | about 57 prose blocks |
| disproportionate | the two Names table rows (L56-57), each cell 80 to 110 words. Defensible in a spec. |

**Checked and correct (no action):**
- daisyUI keys: 35 stock themes, one key set, 20 color roles plus `color-scheme`, three radii, two sizes, `--border`, `--depth`, `--noise`.
- Tailwind scale: `tailwindcss/theme.css` exists. Five of the eight `--spacing-*` names shadow container sizes.
- Pass B facts: the five `--cairn-preview-*` properties and `preview-doc.ts:105` `#fff`. Three `adminOnly` rules, and `DEFAULT_ADMIN_SCOPE` matches.
- Sites: no site's `tokens.css` has the focus-ring set (all five checked). `prose.css` reads all three radii and `--border` with no fallback.
- Figures: "15 stock themes" is sourced (review-mechanics, section 6). `0.98.0` is free (newest published is `0.97.0`).
- Charter, docs and skills: the "all 28 registered rules" line, the `design-your-site.md` quote, the Vale `Cairn.Names`/`NamesRetired` rules, `design.yml`, `examples/cairn-theme`, the skill and agent paths, and the dotfiles path all exist.

---

### Blocker

**Scanner findings.** `slop-hard` "showcase" at L57, 77, 101, 237, 306, 347, 358, 396, 398, 412, 435, 459. For whoever rules on these: every hit is the proper name of `examples/showcase`, so there is no prose rewrite to offer. They are reported as the scanner's facts.

**B1. `cairn-focus-ring` is filed as an engine-emitted class, and a planned test will fail because of it.** L142-144, L147-149, L415-418.
- L142-144 lists `cairn-focus-ring` among "the engine-emitted classes". `grep` finds it nowhere in `src/lib`. It is a chassis utility applied by theme and route markup.
- L148's registry additions leave it out.
- The Proof snapshot test (L417) asserts "every class the sheet styles is in the render registry". That test fails, or it forces an unplanned registry entry.
- Rewrite L142-144: "`@layer components` rules whose styling carries no design choice: the engine-emitted `pre.shiki` and `.cairn-tok-*` binding and the structural `.table-scroll` rule, plus the `cairn-focus-ring` class a theme's markup applies."
- Then either add `cairn-focus-ring` to L148's registry list as "a class a theme applies, styled by the engine sheet", or change L417 to "every emitted class the sheet styles".

**B2. The governing principle contradicts two of the rules it governs.** L43-44 says the guard checks "never where a token is defined". But:
- `public-literals` makes a custom-property definition legal only under a theme root (L317-320), and a fixture flags "a literal custom property outside a theme root" (L422-423).
- `theme-conformance` flags "a chassis file redeclares an engine default" (L336).

Both police location. Rewrite: "The guard polices literals, not vocabulary. It checks that a value comes from a token, never which token. A literal is legal only in a token definition under a theme root, and the site configures those roots."

**B3. Pass C's task order breaks gates the spec says stay green from the task that adds them (L456).**
- **Root export (task 5, L521).** Task 5 adds a root export, but its `core.md` entry lands in task 11. `check:reference` fails on an undocumented export, so it is red for tasks 5 through 10. Pass B already handles this correctly by adding `public.md` in the task that adds the export. Rewrite: "5. The template sweep: ..., the styleguide, its root export and that export's `core.md` entry, ..."
- **Snapshot test (task 1, L517).** Task 1 creates the snapshot test, which asserts that `public-css.md` lists every key and that every styled class is in the render registry (L416-418). Both land in task 11. Rewrite: "1. The equivalence test on today's tree, then `cairn-public.css` and its key-set snapshot. The page-sync and registry assertions join the test in task 11."

**B4. `check:template` goes red from pass C's first task.** L498-499, L530.
- `check:template` runs `emit-template-dir.mjs --check`, which fails when the committed `templates/waymark` drifts from a fresh emit.
- Tasks 1 through 5 edit emitted showcase files, but the re-emit is scheduled for task 13 and the close.
- Rewrite L530 and L498: "Each task that edits an emitted showcase file re-emits the template in the same task. Task 13 re-emits after the chassis README change."

### Warning

**W1. Waymark cannot fully move its dark values into its daisyUI blocks.** L181, L228-229.
- The claim "moves its per-scheme values into its daisyUI blocks" and "needs no hand-synced dark triple" collides with the spec's own comma limit (L182-183).
- Waymark's dark `--cairn-shadow` and dark `--color-card-border` are both per-scheme and comma-bearing (`theme.css:314-318`, `336-339`).
- Rewrite L228-229: "...and moves its per-scheme inks and muted into its daisyUI blocks. Its dark shadow and card border carry commas, so they stay in its dark `:root` blocks."
- The `cairn-public` guidance will repeat the L181 claim, so fix it there as well.

**W2. The daisyUI analogy for ink derivation is inaccurate.** L216-218.
- In `node_modules/daisyui/components/button.css`, daisyUI's hover mixes toward `#000` in both schemes, and soft mixes toward `--btn-soft-bg`/`base-100`. Neither mixes toward `base-content`.
- The formula also mixes toward `base-content`, not "toward the ink".
- Rewrite: "Mixing the fill toward `base-content` darkens it in light mode and lightens it in dark mode. This is daisyUI's own `color-mix` form, aimed at the text color."

**W3. The `site-today-export` citation overclaims.** L189-191.
- That ruling declines a date-helper export. Its reopen condition is "evidence an export fixes the discoverability failure better than the chassis copy does".
- Stale copies are a propagation failure, not a discoverability failure. Meeting that ruling's condition would also mean reopening an unrelated ruling.
- The fold record's proposed ruling text repeats the claim.
- Rewrite: "All five sites' copies froze and missed keys added since, a drift an export prevents and a copy cannot."

**W4. The "earlier spec governs" clause pins pre-rename paths.** L9-10.
- The parent spec's G2 section says pass B's rules run in "`src/lib/components`, `src/lib/admin-toolkit`".
- Read literally, "Where the two disagree, the earlier spec governs the agent path" keeps the pre-rename root.
- Rewrite: "Where the two disagree on the agent path's rules and guidance, the earlier spec governs. This spec governs names and paths."

**W5. Pass B's `Consumers must:` line misses a consumer-visible path.** L93-97.
- `templates/waymark/cairn-audit.config.json:3` names `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css` under `sheet`, and every site scaffolded from the template inherits it. `DEFAULT_SHEET_CANDIDATES` names the same path.
- The five current sites do not carry a `sheet` key.
- Add a fourth part: "...and, if your `cairn-audit.config.json` names `dist/components/cairn-admin.css` under `sheet`, change it to `dist/admin/cairn-admin.css`."

**W6. The site count is "five" in one place and "four" everywhere else.** L190 says "five" with no introduction. L27, L196, and the repo CLAUDE.md say four; the fifth is cairn-pub.
- The promotion trigger at L352 depends on "every production site", so the count matters.
- Rewrite at first use: "all five sites (the four production sites and cairn.pub)". Then state whether L352's trigger counts cairn.pub.

**W7. The stripped-inks case depends on a rule that lands later.** L442, task 2.
- The stripped-overrides standing case asserts through `theme-contrast`, which lands in task 9.
- The fold record puts this case in task 2.
- Task 2's measurement of `N` also has to evaluate `color-mix`, which culori cannot do (fold ME3) until task 9's resolver exists.
- Either say task 2 measures with Chromium computed values and the standing case lands in task 9, or move the case to task 9.

### Suggestion

- **S1. `Consumers must:` line (L487-491).** "beyond the template's" could mean the old template or the new one; say "the new template's". The line also misses `--color-muted` and `--color-card-border`: under the spec's own taxonomy (L139-141) they are not "roles", the binding, or the utility.
- **S2. Re-emit list (L498-499).** It names three files, but pass C also edits `prose.css`, `site.css`, routes, and `SiteHeader`. Say "re-emits the template".
- **S3. `equiv.mjs` attribution (L410).** `equiv.mjs` is the spike's script (`2026-09-26-theme-identity-spike.md`). Pass A's version is `admin-theme-equivalence.test.ts`. Rewrite: "(the form of pass A's `admin-theme-equivalence.test.ts`)".
- **S4. "dependency sentence" (L479).** This sentence is about gates, not dependencies. Quote it: "Neither ships in a scaffolded site's own `package.json`."
- **S5. Empty key list check (L326).** "lacks `--color-base-100` and `--radius-box`" should be "or".
- **S6. Coverage gate (L397-398).** "the styleguide's export" should be "the new root export", matching L280-281.
- **S7. Step 6 quote (L231).** "retune the ink with the fill" is quoted, but the header actually says "When you retune a status hue, retune its matching `--cairn-<status>-ink` (light AND dark)". Drop the quote marks or quote it exactly.
- **S8. `components.md` rename (L81, L100).** Name the `docs/reference/components.md` to `admin.md` rename. `check:reference` needs it, cairn.pub renders it, and today only the fold record mentions it.
- **S9. Names task (L509).** Delivery's task 1 omits the Names write-up that L62 assigns to it. Add "and the Names section".
- **S10. `.table-scroll` rule.** State whether the chassis `prose.css` drops its `.prose .table-scroll` rule (`prose.css:366`) once the engine sheet ships it.
- **S11. `sheet.ts` fix order (task 6).** The fix lands in task 6, but task 1's snapshot test parses CSS. Say whether that test uses `sheet.ts`.
- **S12. Pass A wording (L538).** "carrying theme values only" is ambiguous, since pass A also ships rules, tests, and docs. Rewrite: "with no `Consumers must:` line".
- **S13. Light-touch tells.**
  - L220 uses a contrast frame. Rewrite: "The derived ink is a default. `theme-contrast` guarantees the floor."
  - The L364-367 bullets trail into fragments ("so does `tailwindcss`"). Rewrite as one sentence: "culori moves to `dependencies`, and `daisyui` and `tailwindcss` become optional peers."
  - L257 runs to 144 characters without wrapping.
  - The F17 check (L287) has no unit, e2e, or harness label, unlike its siblings.
  - The bold lead-ins on most paragraphs work as spec navigation, so leave them.

**Verdict:** The spec reads as written by a careful spec author. Its prose is clean, with no em dashes and no connector openers. The real problems are four fact and consistency blockers (B1 to B4) that would each fail a gate or a test during execution. Fix those, and W1 and W5, before the plan is authored.