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
