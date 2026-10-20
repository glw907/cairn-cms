# Code polish pass: surface-change wants

Filed, never done in the sweep; one batched decision at consolidation (Task 8).

1. **Action-name suffix convergence.** The media-era action handlers (`mediaBulkDelete`,
   `mediaOrphanScan`, `mediaPurgeOrphans`, `mediaReplacePreview`, `mediaReplaceApply`,
   `mediaAltPreview`, `mediaAltApply`, `addDictionaryWord`, and kin) dropped the `Action`
   suffix the core handlers carry. Renaming them touches `createContentRoutes`'s public
   return type (Unstable API tier, so allowed across minors, but still a `check:surface`
   change and a consumer-visible rename). Charter rule N2 records the convention; applying
   it here is the decision.
2. **Editor-mutation log events.** `editors-routes.ts` performs owner-gated allowlist
   mutations (add, remove, role change) with no log events, the only silent
   security-sensitive path in the route layer. Fixing it means new event names extending the
   documented vocabulary (`docs/reference/log-events.md`), which is additive design, not
   sweep work.
3. **`buildLinkResolver` rename to fit the F3 build*/create* boundary.** It returns a closure
   with its own query surface (`(ref) => permalink`), the `create*` shape per F3, not a
   `build*` pure-data producer like every other `build*` export in `delivery/` (`buildRssFeed`,
   `buildJsonFeed`, `buildSitemap`, `buildRobots`, `buildSeoMeta`, `buildSiteManifest`). The
   idiom survey names it the clearest naming outlier in the delivery subsystem
   (`docs/superpowers/plans/2026-07-01-code-polish-survey.md:333-349`) and nominates renaming
   it to `createLinkResolver`. It is exported from `@glw907/cairn-cms/delivery` and
   `/delivery/data` (`docs/reference/delivery-data.md`), so renaming it changes
   `check:surface` and `check:reference:signatures` and needs a documented `Consumers must:`
   migration at a deliberate release, not a same-behavior polish edit.

## Rulings (Geoff, 2026-07-02 — both wants approved for this pass)

1. **Action-name convergence: APPROVED, do in consolidation (Task 8).** Rename the media-era
   handlers onto the `Action` suffix (`mediaBulkDeleteAction`, `mediaOrphanScanAction`,
   `mediaPurgeOrphansAction`, `mediaReplacePreviewAction`, `mediaReplaceApplyAction`,
   `mediaAltPreviewAction`, `mediaAltApplyAction`, `addDictionaryWordAction`; audit any other
   suffix-less handler on the public return). Regenerate the surface snapshot, update the
   reference page rows and every test/caller, and carry one `Consumers must:` line in the
   changelog entry. Unstable API tier makes this legal; the unpublished window makes it cheap.
2. **Editor-mutation log events: APPROVED, do in consolidation (Task 8).** Add events for the
   owner-gated editor mutations in `editors-routes.ts` (shapes per the existing vocabulary,
   e.g. `editor.added` / `editor.removed` / `editor.role_changed`, each carrying the acting
   owner and target editor emails per the log privacy rules — no tokens, no session ids), with
   their rows added to `docs/reference/log-events.md` in the same commit.
