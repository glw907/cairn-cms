# Polish spec review, grounding lens

Adversarial review of `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 1 (Opus, fresh context, 2026-09-08). Folded into revision 2.

---

## Ranked findings

**1. Spec:282–287 (sequencing) — polish-A and polish-B contend on `content-routes-entry.ts`, not just "the reference pages."**
Claim: "the contended resource is the reference pages, which A touches only through generated signature text and B through prose."
Evidence: polish-B item 6 (D11) changes the two conflict refusals, which live at `src/lib/sveltekit/content-routes-entry.ts:922` and `:1013` — the exact file polish-A task 1 splits into four modules. B rebased onto A would land those edits on lines that no longer exist in a file that no longer exists.
Correction: move D11's engine string change into polish-A (it rides the split), or serialize B after A's split commit and say so.

**2. Spec:41–42, 98–105, 295–297 — "the merged return object's key order pinned by `check:surface`" is false.**
Evidence: `scripts/checks/check-surface.mjs` alphabetizes (`Object.keys(exports).sort((a,b)=>a.localeCompare(b))`) and `diffSurface` compares sorted `name: shape` lines. No path in `check-surface.mjs`, `check-surface-leaks.mjs`, or `eslint.config.js` inspects declaration order. The assertion originates in `src/lib/sveltekit/content-routes.ts:117-118`'s own comment and was carried into the exports sweep unexamined.
Correction: "`check:surface` byte-identical" is a valid acceptance for the *surface*, but the split's key-order risk is ungated. Either drop the claim or add the gate the spec assumes.

**3. Spec:41–42, 103 — "seven engine-internal importers to repoint" undercounts by four.**
Evidence: 11 non-test source importers exist. The four the sweep and spec miss: `src/lib/components/MediaBulkDeleteDialog.svelte:20`, `src/lib/reproductions/stories/media.ts:19`, `src/lib/reproductions/fixtures.ts:23`, `src/lib/reproductions/stories/publish.ts:16`. Plus ~10 test files import the same types.
Correction: eleven source importers and the test suite.

**4. Spec:98–102 — "every private helper used by exactly one cluster" is false, and one helper is in the wrong cluster.**
Evidence: `draftFromBranchHead` (`content-routes-entry.ts:357`) is called at `:739` (`historyLoad`, read) *and* `:1501` (`draftExistsFailure`, revert) — a genuine cross-cluster helper. `revertSchemaDrift` (`:287`) is listed under read but its only call site is `:1555` inside `revertAction`. `BUILTIN_FRONTMATTER_KEYS` (`:279`) is used once, at `:293` inside `revertSchemaDrift`, so it is a revert-cluster primitive, not the shared item the spec routes to a shared module.
Correction: `draftFromBranchHead` is the shared item; `revertSchemaDrift` and `BUILTIN_FRONTMATTER_KEYS` move with revert.

**5. Spec:100 — the destructive cluster's line range is wrong and the "gap" premise is wrong.**
Evidence: `renameAction` starts at `:1312` and runs to `:1487`; the destructive cluster is `1170–1487`, not `1170–1311`. `1489–1499` is `draftExistsFailure`'s doc comment. There is no unaccounted region.

**6. Spec:43–44 (decision 4) — the correction as stated mis-describes what the proposal says.**
Claim: "the Workers Paid cost begins with the second editor, not the first deploy (D1)."
Evidence: `docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md:119` says sign-in email "needs the paid plan **from the first editor who signs in**." It never says "first deploy." The tool's own gating form is `packages/create-cairn-site/src/cloudflare/chapter2.mjs:191-195` and `:680` ("so anyone besides you can sign in").
Correction: the fold is first-editor → second-editor (anyone other than the owner). "Not the first deploy" describes `docs/admin/before-you-start.md:52-54`, `create-your-site.md:39,90`, `docs/why-cairn.md:78`, and `money.mjs:32-34` — not the proposal.

**7. Spec:43–44 — "1,619 words" does not reproduce.**
Evidence: `wc -w` on the proposal = 4,314. Section A (the `why-cairn.md` replacement, lines 21–177) = 1,627–1,634 depending on boundary. The 1,619 figure is inherited from `docs/STATUS.md:79` and is not measurable from the file.

**8. Spec:9–10 — the numbering is attributed to STATUS, which carries none of it.**
Evidence: `docs/STATUS.md` numbers slices 1, 2a, 2b, 3, 4a, 4b, 5, 6, 7 and stops (`:59-60`). `docs/HISTORY.md:10` numbers chassis-A slice 8. Nothing anywhere numbers chassis-B1 as 9a, chassis-B2 as 9b, or the identity seam as 10.
Correction: the spec is *proposing* the numbering, not reading it; say so, or land it in STATUS first.

**9. Spec:63–86 — D20 is dropped silently.**
Evidence: docs-sweep finding 20 (`docs/extend/migration-notes.md:183-199`, "Five type-level changes" over four bullets) appears in no polish-B task and no disposition. Every other D1–D30 is routed; only D20 vanishes. Note polish-C item 8 edits `migration-notes.md` anyway.

**10. Spec:124–137 — A29 is dropped silently.**
Evidence: admin-sweep finding 29 — `docs/internal/admin-design-system.md:531-535`, `:128`, `:145-151`, `:565-566` name `AdminLayout.svelte`, which does not exist; the file is `src/lib/components/CairnAdminShell.svelte`. Polish-A item 6 edits `admin-design-system.md` and does not fix it. A23 (Pagination) is also unlisted, arguably covered by spec:30-32 but never said.

**11. Spec:89–94 vs 149–155 — polish-A's Shape contradicts its own item 11.**
Claim: "Reference pages change only where a JSDoc one-liner or a member doc changed the shipped `.d.ts` text, and `check:reference:signatures` proves nothing else moved."
Evidence: F9 edits `docs/reference/README.md`'s subpath list by hand; F10 retitles `docs/reference/render.md` and its README bullet. Neither is `.d.ts`-derived. This also makes `render.md` a *prose* file both A (F10) and B (D22, "`## Types` last on `render.md`") edit — the contention spec:284-286 explicitly denies.

**12. Spec:163–168 — `check:custom-surface` is missing from polish-A's gate.**
Evidence: it exists (`package.json:56`). Polish-A item 6 removes `cairn-btn-guarded` from `ShareLinkPanel`, a selector pinned as "unlayered rule 2 of 13" (`cairn-admin.css:747-750`), and item 8 fixes A17, which admin-sweep 17 says `check:custom-surface` "is supposed to fail exactly this."

**13. Spec:214–215, 222–226 — `check:figures` does not exist on `main`.**
Evidence: `git show HEAD:package.json` has no `check:figures`; it appears only in the uncommitted working tree, alongside the untracked `docs/extend/assets/` and `scripts/figures/`. `docs/STATUS.md:78-85` lists that whole set as UNCOMMITTED and awaiting Geoff's ruling.
Correction: polish-B's gate depends on unlanded work; name landing it as the task's first step.

**14. Spec:176–181 — "No engine code except two product-copy strings" is false against polish-B's own scope.**
Evidence: item 6 also changes `src/lib/components/VocabularyAdmin.svelte` at three sites (D12: `:162,220,244`). Item 9 changes `src/lib/reproductions/stories/CustomScreen.svelte:12,17,32` and its assertions in `src/tests/component/reproductions-stories.test.ts:990`. Polish-B's gate (`:222-226`) names no component or reproduction suite for the latter.

**15. Spec:222–226 — polish-B's gate omits `check:readiness`.**
Evidence: `package.json:42`. Item 2 adds the fifth router row (D10); docs-sweep:31 states `check:readiness` "passes because it gates anchors, not the router," so it is the gate that must not regress when the router changes.

**16. Spec:214 — "`check:arm-indexes` green" is not reachable from the stated work.**
Evidence: docs-sweep:98 — `check:arm-indexes` fails on the two untracked `docs/extend/assets/*.md` **and one internal file**. Item 8 moves only the two.

**17. Spec:159–161 and 219–220 — both passes claim to triage the friction log whole, and neither can.**
Evidence: `docs/internal/docs-friction-log.md` has exactly one live entry (the 2026-09-07 `extender` finding), which states "Owned by `ROADMAP.md`'s identity-seam entry; stays open until that pass ships." The "Open findings" section reads "None open." Same duplication applies to `CHANGELOG.md`, `docs/HISTORY.md`, `docs/STATUS.md`, and `ROADMAP.md`, all edited by both parallel chains and unnamed in the contention paragraph.

**18. Spec:262–264 — the OfficeList retire has more in-repo consumers than "zero production callers" implies, and one is a ratified doc statement.**
Evidence: `src/lib/reproductions/stories/CustomScreen.svelte:12,17,32`; `src/tests/component/OfficeList.test.ts`; `src/tests/component/reproductions-stories.test.ts:990`; `docs/reference/admin-toolkit.md:635,657-661`, which currently states "**`PageHeader` and `OfficeList` both stay.** They cover different shapes … never a duplicate." That sentence is the 4b ruling's published form and the spec never names retracting it.

**19. Spec:107–109 — "the `logCommitFailed` call at the old `:668` converges on the module import" is imprecise.**
Evidence: `content-routes-media.ts` has no `commit-log.js` import at all; `:668` calls `ctx.logCommitFailed(commitFields, err)` via `ContentRoutesContext` (defined `content-routes-context.ts:420`, which imports the module function at `:15`). `content-routes-entry.ts:42,1109,1591` uses a direct import.
Correction: the task must *introduce* the direct import in the media modules, not converge onto an existing one.

**20. Spec:156–157 — the `formatTimestamp` acceptance set is the spec's own invention against a CLOSED ruling row.**
Evidence: no input document (ROADMAP:~"a `formatTimestamp` widening", the exports sweep) specifies "no-seconds variant, basic offset form, lowercase `z`." The set is code-consistent — `ISO_WITH_ZONE` at `src/lib/admin-toolkit/format.ts:72` requires seconds, uppercase `Z`, and `±hh:mm`. But `audit-admin-formattimestamp` in `docs/internal/engine-rulings.md` reads `Reopens on: closed. Executed by the 4b conformance pass, Task 3`, so this is a new proposal against a closed row — the same care the spec takes for `audit-admin-officelist` (decision 8) and does not take here.

**21. Spec:12–18 vs 63–86 — "seventeen items" against 18 table rows.**
Evidence: the dispositions table carries 18 rows (spec:69–86).

**22. Spec:196 — "preconditions stated on the three pages lacking them" is two pages.**
Evidence: D13 (`share-a-draft-preview.md`) and D14 (`add-a-second-audience.md`) carry no `Precondition:` line. D4's page (`wire-the-delivery-surface.md:20`) *has* one; its defect is that it points at `define-an-adapter-and-schema.md`, which produces neither `$theme` nor `siteConfig`.

**23. Spec:185–187 — the four money pages are `docs/admin/*` plus `docs/why-cairn.md`, and one of them already carries the target form.**
Evidence: `docs/admin/before-you-start.md:52-54`, `docs/admin/create-your-site.md:39,90`, `docs/why-cairn.md:78` state the first-deploy form. `docs/admin/own-your-domain.md:93-99` already uses the second-editor form; D1's actual complaint there is `:59-60`'s "the free-until boundary from Before you start," a boundary the other page never draws.
Correction: three pages need the form changed; `own-your-domain.md` needs the cross-reference reconciled.

**24. Spec:195 — "the invite prerequisites become three" points at an unnamed page.**
Evidence: the "two things" sentence D2 cites is `docs/admin/before-you-start.md:83-84`. `docs/admin/invite-editors.md:7` carries a single combined prerequisite line, not two.

**25. Spec:3–7 and 43–44 vs STATUS — the front door is asserted as decided while the ledger still has it open.**
Evidence: `docs/STATUS.md:84-85` — "Landing path: a docs task in polish (or a small docs-only pass) **once Geoff rules on the page, its length, and the figures**," and `:78` "Waiting for Geoff's read, all UNCOMMITTED." Decision 4 records the ruling; nothing in the repo reflects it, and the spec does not name updating STATUS as part of taking it.

## Verified true

- **(5) The identity seam adds an `AuthGuardOptions` member.** `docs/superpowers/specs/2026-09-07-identity-seam-design.md:71` declares the interface, `:80` the `resolve` shape, `:260` names `AuthGuardOptions.identity` with its tier note. Polish-C item 2's rename of that bag therefore does collide with it, exactly as spec:282-283 says.
- **(6) Gate names.** All 19 other scripts the spec names exist in the committed `package.json`: `check`, `check:comments`, `check:reference`, `check:reference:signatures`, `check:surface`, `check:package`, `check:docs`, `check:snippets`, `check:transcripts`, `check:symbols`, `check:template`, `check:consumers`, `check:vale`, `check:editor-quotes`, `check:arm-indexes`, `check:rulings-format`, `test`. `check:surface -- --update` is real (`check-surface.mjs:425`).
- **(7) The release rule.** `CLAUDE.md`'s "Releases" section (default to holding; cut at a coherent initiative's natural boundary) supports "one cut after polish," and `docs/STATUS.md:17-18` and `:65` say it in those words. The `cairn-release` skill exists at `~/.claude/skills/cairn-release/SKILL.md`.
- **(8) The busy-idiom counts.** `ShareLinkPanel.svelte:184,193` are the only `aria-disabled`-for-busy sites in the tree; every other `aria-disabled` is the settled guarded state (`EditPage.svelte:1587,1870`, `VocabularyAdmin.svelte:297`, `EntryPicker.svelte:150`). Four components use state replacement, and `MediaCaptureCard.svelte` exists.
- **(2) Every F/D/A number the spec cites says what the spec says it says**, with the exceptions ranked above. F1–F21, D1–D19, D21–D30, A1–A22, A24–A28, A30 all map correctly to their tasks. The three sweeps' finding counts (21/30/30) are accurate, and "the friction log, one open entry, owned by the identity seam" is accurate.
- **(3) The ROADMAP polish bullet's seven items are all dispositioned** (ShareLinkPanel, OfficeList, `formatTimestamp`, palette live region, `logCommitFailed`, Svelte lint wiring, `createSectionAction` on signups), as are the two internals-B carries (the entry monolith, the state-reset regex) and the media monolith. Note only that `ROADMAP.md` routes the entry split as a two-way cut (a `-mutations.ts` sibling) and the spec takes four modules instead.
- **Media split geometry.** All of claim 2 holds: `content-routes-media.ts` is 1447 lines, every cluster boundary is right, `ingestAndStore` has exactly the two call sites at `:631`/`:645`, and all named module-level primitives exist including the three message constants at `:370`, `:372`, `:378`.
- **Entry file size and the read/write/revert boundaries.** 1630 lines; read `424–750`, write `751–1169` with `saveToBranch` called only at `:934`/`:954`, revert `1500–1616` with `draftExistsFailure` called only at `:1560`/`:1566`/`:1592`, `deleteEntry` called only at `:1292`/`:1303`.
- **`content-routes.ts:117-118`** does carry the key-order comment as quoted (its *claim* is what fails, per finding 2). Type re-exports are at `:30-50`, though from eight sibling modules, not only the two monoliths, and the merge is eight factory calls at `:61-68`, not two at `:59`.
