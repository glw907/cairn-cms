# BACKLOG

> Project issue tracker. Managed by `/log-issue`.

## High

- [ ] **#51** Fail `check:facts` on an `external` fact with no URL `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  An `external` fact with no URL (`f:34wt4f`) passes `check:facts` silently. `scripts/checks/check-facts.mjs`. Record B3-7.

## Medium

- [ ] **#54** Split fact f:q07rd5, and drop plan constraints the code now settles `#improvement` `#docs` `#initiative:docs-system` *(2026-10-24)*
  `f:q07rd5` bundles a code-sourced scaffold path with tutorial paths sourced only from a docs page and an unrelated hooks note, so ruling D1 blocks a blueprint that cites it for the scaffold alone. Split it into one fact per source. Some page plans still state as constraints things the code now settles (the build error's count prefix, `parseMarkdown` and TOML); see B3-24. Record B3-30 in `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`.
- [ ] **#53** Mark a page plan and framing record superseded when its page is narrowed or trimmed `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  After the premise trim, configure-media's plan and framing record (2026-10-12) and the narrowed page's 782-line plan and 254-line framing record were mostly out of scope, and reading them cost more than they returned. Record B3-8, B3-24.
- [ ] **#50** Name a concept by its key in every concept error `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `defineConcept` names a concept in its errors by `label ?? dir` (`src/lib/content/concepts.ts:67`), while `normalizeConcepts` names it by its content-map key, so one concept shows under two names. Record B3-18.
- [ ] **#49** Add `mediaLibraryUpload` to the typed admin routes contract `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `mediaUpload` stores bytes and commits no manifest row, so a custom screen's upload resolves as missing until an entry save records it. `mediaLibraryUpload` commits the row but `CairnAdminRoutes` leaves it out (`src/lib/sveltekit/cairn-admin.ts:390`), so typed code reaches it only through a cast. Geoff, 2026-10-24: Configure media documents both paths as the code stands (the uncommitted `mediaUpload`, and `mediaLibraryUpload` reached through a cast) until this lands. When it lands, update the custom-screen upload section of `docs/extend/configure-media.md` and its blueprint in the same pass. Record B3-25.
- [ ] **#48** Honor `publicBase` and `urlForm` in the edit page's live preview `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  The live preview builds `/media/<slug>.<hash>.<ext>` paths whatever the media config says (`src/lib/admin/EditPage.svelte:1359`, `src/lib/render/resolve-media.ts:141`), so a site that moves `publicBase` gets 404 preview images unless it also keeps a `/media` route. Geoff, 2026-10-24: Configure media documents the workaround (keep a `/media` route beside the moved one) until this lands. When it lands, remove that step and its failure row from `docs/extend/configure-media.md` and its blueprint in the same pass. Record B3-25.
- [ ] **#47** Fold Reuse content across entries into Content model `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Batch 3's premise check: a scaffolded site already declares the `fragments` concept, globs it, lists it in the manifest plugin (`templates/waymark/src/theme/cairn.config.ts:137`), and forwards `resolveFragment`, as does the add-cairn tutorial's render (`add-cairn-to-a-sveltekit-app.md:333`). Define an adapter and schema now walks through adding a concept, the `fragments` routing rule included, and the include syntax is editor material. Recommended for Geoff: give Content model one "Fragments" section (the reserved concept and its `embedded` routing, resolution one pass deep and the refused nested include, the build check and the delete guard, the empty and not-found notices); move the diagnosis rows to Debug your site; retire the page. Not authored overnight; waits for Geoff's call.
- [ ] **#46** Fold Link content with references into Content model `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Batch 3's premise check: on a scaffolded site a reference field is one declaration line that the scaffold already resolves (`withReferences`, `src/chassis/entry-data.ts:30-37`) and renders (`ArticleView.svelte:56-58`), so the page's walkthrough repeats the scaffold and `delivery-data.md#resolvereferences`. Recommended for Geoff: give Content model one "Reference fields" section (the declarations and the undeclared-target throw, the picker in a sentence, the build check and the save, delete, and rename guards in order, and where a `cairn:` token is live or inert); leave Build the public routes a two-sentence note at its entry loader for a hand-built site; retire the page. Nine pages link it; the deep link is `build-the-public-routes.md:271`. Not authored overnight; waits for Geoff's call.
- [ ] **#45** Keep a renamed posts concept's feed from going empty `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Renaming the scaffold's posts concept empties its feed. The authors raised it in batch 2 and it has no backlog item (record 55).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#44** Check inbound cairn.pub links to the extend headings PR #137 renamed `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Dropping "own" changed the anchors `upload-from-your-screen`, `mint-and-revoke-from-your-admin-route`, and `port-your-theme-onto-the-chassis`. In-repo links are fixed; inbound links from cairn.pub are unchecked (record 53).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#43** Say that a local D1 needs `--local` for the `AUTH_DB` migrations `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Deploy applies the migrations with `--remote` only, so a local D1 still needs `--local` (`f:m4y3m4`). Document it or change the step (record 52).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#42** Settle the scaffold's two origins `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  The scaffold names its origin twice, a literal `https://showcase.test` and the setup-written `PUBLIC_ORIGIN` `workers.dev` URL, so a deployed site has two (record 51).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#41** Fix the stale header comment in `manifest.ts` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `src/lib/content/manifest.ts:3-4` says "save path patches one entry"; it is already in the docs friction log, unfixed (record 50).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#40** Add a `ContentRoutesConfig` heading to `docs/reference/sveltekit.md` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  The page has no such heading, so the plan's link target can't exist; the sidebar blueprint links `createCairnAdmin` instead (record 49).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#39** Give the tutorial site's layout a code source `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  No code source exists for it, and D1 removes tutorial-site claims from every page serving tutorial readers. Add a fixture or record a ruling (record 48).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`

- [ ] **#38** Make `check:facts` and `drafter check --fact` agree on a `path#Symbol` source outside `src/` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `check:facts` refuses it while `drafter check --fact` accepts it (`packages/create-cairn-site/...#applyMigrations`) (record 46).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Seen again in batch 3: a code span inside a `[verified: ...]` note passed `drafter check --fact` but failed `check:facts` as an unresolved path (drafter #71). Record B3-13.

- [ ] **#37** Correct the facts still marked `[verified]` that the code or their source contradicts, and split bundled bullets `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `f:0elmiu` (sign-in page indexed, but `LoginPage` sets `noindex`), `f:niuzzg`, `f:s4prb0` (a README source), and `f:q07rd5` (a docs source) are stale or prose-sourced. `f:q07rd5` also joins a code clause with docs-only clauses, so D1 blocks citing the code part alone (record 44, 45).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Seen again in batch 3: duplicate facts state one claim (`f:pdgkex`, `f:4mz4tp`, `f:yef4lo`; `f:fe46lo`, `f:97c6g1`), and `f:q07rd5` is `[verified]` from a docs page against ruling D1. Merge the duplicates. Record B3-16.

- [ ] **#36** Flag a plan or framing record when a fact it cites is corrected `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  Plans inherit wrong facts and nothing flags them: `f:ld6xam` reached the sidebar plan, the content model's carried about a dozen code-contradicted claims, and build-the-public-routes' plan predates D1. All four batch 2 authors hit it (record 43).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
  Seen again in batch 3: the plan inputs carried the wrong vocabulary storage path (`editor.nav.configPath`) into the outline. Record B3-16.

- [ ] **#35** Add `blueprints/**` to Vale's scope once Survey #1's check exists `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-24)*
  `check:vale` covers `docs`, `README.md`, and the showcase README only, so the empty "own" reached Geoff on two blueprints unflagged. `package.json:52` (record 41).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-batch-2-friction.md`
- [ ] **#33** Fix the `branch_gone` row in the log-events reference `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  `docs/reference/log-events.md:40` says `branch_gone` comes from discarding a never-published entry. That discard deletes the entry's link rows, so the link logs `unknown` instead; `branch_gone` needs the branch gone with the row still there, such as after a failed cleanup. Found by the share-a-draft-preview blueprint's fact check.
- [ ] **#32** Remove `RoutingRule.inFeeds` or wire it `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  `src/lib/content/types.ts:329` declares `inFeeds`, whose doc comment says it decides feed and sitemap membership. Nothing in `src/lib` has read it since the first content model (2026-05-28). The content-model page says feed membership is the site's choice and leaves the flag out.
- [ ] **#31** Reconcile the address-collision advisory with the resolver throw `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  The edit page's advisory says "Publish this one and it replaces the other at that address" (`src/lib/sveltekit/content-routes-entry-read.ts:412`), the 2026-06-23 advisory design's last-write-wins. `createSiteResolver` instead throws on the duplicate permalink (`src/lib/delivery/site-resolver.ts:86`), so the next build fails. The content-model page states both as the code has them.
- [ ] **#30** Move the three pilot blueprints to the markdown forms and drop `track: extend` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  glw907/drafter#58 gives markdown blueprints `Code:` bullets with a `/`-rooted `:source[...]` and a fence, `Figure:` bullets, and a `:::constraints` block, and makes a named `track` an error when the outline declares none, as cairn's does. `drafter check` now flags the bare fences and `track: extend` in `blueprints/docs/extend/add-a-custom-admin-screen.blueprint.md`, `architecture.blueprint.md`, and `replace-magic-links-with-cloudflare-access.blueprint.md`.
  Batch 2: an unnamed `drafter check` on main has 15 errors, all from the three pilot blueprints, and PR #134's troubleshooting blueprint adds another (`track: "admin"`, an error since drafter #58). Name both (record 40).
- [ ] **#29** Let an explicit code `Source:` override the owner-brief heading in check:facts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  A bullet re-pointed from the charter to code still failed the owner tier until it moved sections (`f:gknz29`). `scripts/checks/check-facts.mjs` (record 29).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-pilot-friction.md`
- [ ] **#21** Resolve the two fact conflicts that escalated pages at the blueprint read `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  restrict-admin-access escalated at read 2 on f:zo034s against f:p1xmp5 and f:0qb73i, and scaffolded-site-files at read 3 on f:rn62i1 (migration 0003 opt-in) against f:gepykz (0003 shipped). No pass edit made either conflict. `docs/internal/facts/`

- [ ] **#22** Correct the wrong claims outside the seven acceptance pages `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  `docs/reference/log-events.md:74` and `:83` (the `admin.action.misconfigured` reason fires only when a site hook sets `cairnEditor` without `cairnAccess`), `docs/extend/upgrade-cairn.md:101`, `docs/reference/sveltekit.md:2100`, and the doc comments at `src/lib/admin-action.ts:155-157` and `guard.ts:377`.

- [ ] **#23** Bring dispositions and links in line with the corrected facts `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  security-model's blueprint disposition at `:1522-1525` still says `admin.action.misconfigured` "fires only outside every hook's coverage" (corrected f:u78zg6 says otherwise); f:q07rd5's hooks clause goes stale once add-cairn redrafts; rotate-the-github-app-key links `scaffolded-site-files.md#devvarsexample` at `:250`, `:846`, `:1361`, and its `:1363` disposition says the scaffold ships `.dev.vars.example`.

- [ ] **#24** Update the engine's owner-editor fallback wording `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  `src/lib/conditions.ts:181` and the Go tool's `check_roles.go:29` describe the older owner-and-editor fallback; a guard with no runtime now throws (`guard.ts:181-183`). Also `install.ts:303`.

- [ ] **#25** Make the remaining non-excerptable fact pointers resolve `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  After the acceptance pass's re-anchor, 19 pointers name a directory, 18 name a path inside a dependency, and 35 are prose, so drafter can't excerpt them for the fact seat. Dotted anchors outside the seven pages remain too.

- [ ] **#26** Give `blueprints/` its own docs-gate bucket `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  A blueprint edit today selects every static check and the component suite (factsheet-cairn section 10).

- [ ] **#27** Tighten the provenance fixes' coverage `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-20)*
  Copy B3c's scaffolded-site-files sentences 152 and 225 into a fixture; the link-text blanking now hides a claim sentence's only linked name from provenance; "npm version" and "the npm docs" still read as commands. `scripts/checks/check-provenance.mjs:152-159`, `:257-266`

- [ ] **#17** Finish the rotate page's rollback re-push handler `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Rotate's read blocked three times on `rb-repush`, last on the `GITHUB_APP_PRIVATE_KEY_B64 is not configured` detail sent to a third key though it does not mean the file is the wrong key. Rotate is escalated with its bar committed. `blueprints/docs/extend/rotate-the-github-app-key.blueprint.yaml`
- [ ] **#18** Have the two drafts B3c lost to review findings carry their code items and links `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  using-claude-code-with-cairn's redrafts drop the `c-script` and `c-ci-workflow` snippet blocks; restrict-admin-access's drops the link to security-model's limits section. Both blueprints are accepted; the next run starts from them.
- [ ] **#19** Settle the outline's add-cairn branding entry and the `createAdminAction` 403 variant `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The B3c fix rounds left the add-cairn outline entry's branding line stale and did not place `createAdminAction`'s 403 refusal on debug-your-site. `blueprints/outline.yaml`
- [ ] **#9** Merge `x-fingerprint` and `x-wrong-key` into one failure row with a route to push `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  They are one failure written as two rows. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#10** Give `s-third-generate` a failure row for the key limit `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The step can meet the key limit and has no failure row for it. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#11** Add the 55-minute token bound to the rollback route `rb-fact` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The rollback route leaves out the installation-token cache bound. Related to #1. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#12** Point `s-rec-checks` at a step a reader with no key can take `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  It points at the rows of its own section and requires a state a reader with no key lacks. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#13** Give the key-rotation failures `x-third-verify`, `x-check-threw`, and `x-logs-empty` a handler the reader can act on `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Each names a fact or a verbatim lead-in as its handler, which leaves the reader no next action. The fix points them at a step, a logs step, and a link to the setup section. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#4** Fix the stale line range on fact `f:6hmgmv` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  `docs/internal/facts/extend.md:780` cites `templates/waymark/.../+page.svelte:1-15`, but the file has 13 lines. Neither `check:facts` nor `drafter check` catches it, since both skip route paths. Found by drafter F1's cairn comparison (glw907/drafter#50); land it with F2's cairn change.
- [ ] **#1** Correct the key-rotation roll-back bullet `f:sszb7b` on `main` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The bullet says re-pushing the old key restores signing with it immediately. `src/lib/github/signing.ts#createInstallationTokenCache` caches the installation token per isolate for 55 minutes, so the restore holds only for tokens minted from then on. The drafter format test (glw907/drafter#49) corrected it on a throwaway branch: patch at `~/.claude/jobs/drafter-skill-rules/ft/base-prime.format-patch`. Even corrected, the consistency read still paired it against `f:vg42j3`, so reread the wording against the cache. The roll-back section's `opens` line repeats "immediately" and needs the same fix.

## Low

- [ ] **#28** Rename the Access page's facts section to its current page name `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-22)*
  `docs/internal/facts/extend.md` still files them under `## docs/extend/sign-in-through-your-organization.md` (record 24).
  Record: `~/Projects/initiatives/docs-system/research/2026-10-22-extend-blueprints-pilot-friction.md`
  Batch 2: the sidebar page's facts still sit under `## organize-your-admin-nav.md` and an `### arrange-the-admin-sidebar` subsection too (record 42).
- [ ] **#5** Decide where the rotate page reads the logs `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The outline's `covers` line puts the logs under verifying signing, while the blueprint reads them under recovery. A call for whoever owns the outline entry. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#6** Add the rotate blueprint's missing recovery rows and notes `#feature` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Recovery rows for `health.failed` and a health-scoped `github.unreachable` event, a Windows note for `curl`, and a route for a reader with no PEM file. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#7** Stop the `use` fields of five rotate-blueprint items restating their facts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  `ver-live-result`, `rec-editor-timing`, `del-no-restore`, `third-fact`, and `rec-logs-observability`. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#8** Keep `x-editor` free-standing after a `from` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  A `from` on it made the whole read object. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#3** Read the unreachable fact pair `f:72yc97` and `f:olofdb` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The drafter format test (glw907/drafter#49) could not reach this pair and never read it. A run's "Unplaced:" warning reasoned about it.
- [ ] **#2** Confirm three fact pairs are scope differences, not conflicts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The drafter format test (glw907/drafter#49) found no defect in `f:ejuoh6` against `f:vg42j3` (the live check skips the publishing path's cache), `f:86h9o6` against `f:vg42j3` (deploy time against cache lifetime), or `f:ejuoh6` against `f:1pb077` (the 60-second per-isolate verdict is a separate cache from the 55-minute token cache). A sentence in each scoping its cache would stop the read pairing them.

## Done
- [x] **#34** Sweep the empty "own" from the Go tool, the scaffolder, the baked agent files, and developer-facing messages `#improvement` `#cairn-cms` `#initiative:cairn-docs-standard` *(2026-10-22 → 2026-10-24)*
  Follow-up to PR #137, on Geoff's packet answer: sweep everything except the admin's editor copy. Covers `tool/` (about 1,200 uses), `packages/` (about 900), the sources of the template's generated agent files (repo-root `claude/`, `skills/`, `packages/create-cairn-site/template-repo`, then `npm run emit:template`), and about 75 runtime strings (audit findings, CLI diagnostics, the tidy prompt, e2e test names, showcase content), updating the tests a message change touches. Leave editor-facing admin copy ("Your own custom rules") as it reads. Run the dangling-idiom scan after any scripted removal: PR #137 needed 14 repairs ("a second live region of its.").
  Batch 2: about 240 hits remain in `templates/waymark/.claude/**`, `README.md`, and `CLAUDE.md`, which `emit:template` bakes from repo-root `claude/`, `skills/`, and `packages/create-cairn-site/template-repo`; sweep the sources, then emit (record 54).

- [x] **#16** Re-anchor facts that cite `section-action.ts#createSectionAction.wrap` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19 → 2026-10-20)*
  f:i1dayf, f:nup3og, and f:gy2h7p cite an anchor whose excerpt reads "declaration not found", so the fact seat blocks debug-your-site on them. B3c could not edit facts. `docs/internal/facts/extend.md`
