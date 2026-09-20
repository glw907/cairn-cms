# extend-1: what the gate caught, and what a later pass would be wrong to rediscover

Written at the close of chain A, task 6, after chain B (the showcase stylesheet seam) landed on
its own branch and both chains' work is captured in `docs/internal/engine-rulings.md`
(`log-export`, `stylesheet-seam`, `tooltip-primitive`, `audit-rule-advisory-first-tier`,
`batch-actions-additive`). This record is the narrative behind those rows, plus the process
lessons the ledger's own format has no room for.

## What the gate caught

**The stylesheet seam's first form defeated the engine's own responsive variants.** Both the
engine's packaged sheet and a site's own admin sheet place their utilities in Tailwind's shared
`utilities` cascade layer, at specificity `(0,1,0)`. Tailwind orders base utilities before their
responsive variants inside that layer, so once the site sheet loads after the engine's, its own
base utilities (`hidden`, `flex-col`, `gap-2`, and so on) beat the engine's `sm:` variants on
every admin screen at 640px and wider. The seam's four-line form (layer order, theme import,
utilities import with `source(none)`, one `@source` line naming the site's own admin routes)
moved 58 of the 90 admin-visual baselines the FULL gate's e2e leg checks. The fix is a fifth
line, `@source "../node_modules/@glw907/cairn-cms/dist";`, which makes the site sheet a superset
of the engine's own utility set in Tailwind's own generation order, so the engine's variants win
again. The compiled site sheet grows from roughly 1.5 KB to roughly 55 KB, the cost of that
ordering guarantee. Two things stay open past this pass, both filed to the `stylesheet-seam`
ledger row's `Reopens on:` line: an engine-owned sources file a site imports instead of naming
the dist path itself, and a static gate that proves the superset invariant rather than relying on
a human noticing 58 moved baselines.

**A source-text walk over the engine's own tree first flagged its own test files and doc
comments as dead or reasonless directives.** `cairn-audit`'s static rules read directive strings
(suppression comments) wherever the rule's own scope reaches; run over `src/lib` and
`src/tests`, the walk judged a directive string that appears inside a test fixture or a comment,
never as a live suppression, as a dead or reasonless one, at error tier: 41 findings on the
engine's own tree, none real. The fix is `suppressionsOnly`: a source-text carrier can supply
suppressions but never itself produce a `suppression` finding. No gate runs the static audit
over the engine's own tree today; a standing gate that does is a candidate for a later pass, not
shipped here.

**`log-event-grammar`'s collision arm fires on the engine's own legitimate call sites when the
audit runs over the engine repository itself.** The rule flags a log call's first-argument
literal when it collides with a name reserved by `CairnLogEvent`, which is exactly what every one
of the engine's own 154 call sites does on purpose, since the engine is the reserved list's
owner. 152 of 154 fired as advisories in that run. A consumer never scans the engine's own
`dist`, so a consumer tree is unaffected; the rule needs an owner exemption, or the engine's own
self-audit (if one ever runs) needs a scope that excludes `src/lib`, before `0.98.0` promotes the
rule to error tier. Recorded as that promotion's precondition, not as a blocker to this pass.

## What a later pass would be wrong to rediscover

**The Tooltip's placement mechanism took three iterations to land, all recorded so extend-2 does
not re-litigate the choice.** An absolute position off a mutated trigger element was tried first
and rejected: it reaches outside the trigger's own box and drifts under scroll. Fixed
viewport coordinates were tried second and rejected: a trigger inside a transformed `.modal-box`
computes viewport coordinates that no longer match the trigger's own rendered position once the
modal's own transform runs. The shipped mechanism is a native popover plus CSS anchor
positioning, with the trigger's own `anchor-name` appended rather than replaced, so a trigger that
already anchors its own popover menu keeps both names and both positioning contracts.

**The retired class's tier semantics, stated once so no later pass restates them differently.**
`cairn-btn-guarded` is advisory until `0.98.0` promotes the finding to error tier; the class
itself stays compiled until a later, separate release removes it from the sheet. Advisory tier
and compiled-until-removed are two independent facts; promoting the finding does not, by itself,
retire the class.

**The cairn-guidance report line for a surviving `cairn-btn-guarded`, recorded for extend-2.**
Extend-2's guidance layer does not need its own check for this: `cairn-audit`'s
`stock-default-hazards` rule already reports it, at the tier and message this pass shipped, on
any tree its own `static.scope` reaches, including a consumer's own admin sources. The line a
consumer's `cairn-audit` run prints today reads, with the file and line naming the real
occurrence:

```
<file>:<line>  advisory  stock-default-hazards  class "cairn-btn-guarded" is retired; wrap the control in Tooltip for the reason text instead of a native title attribute (docs/reference/admin-toolkit.md, Tooltip). Reported at advisory tier until 0.98.0 promotes the finding to error; the class itself stays compiled until a later release removes it
```

Extend-2's guidance should route a builder to this existing line (the `read-from-the-source-rule`
applied to a check that already exists) rather than authoring a second check over the same fact.

**Runner lessons for the pass-execute-chains harness itself, no code change here.** The gate-tier
probe agent quoted the classifier's stderr preamble alongside its verdict, which produced false
mismatch reports; the fix compares only the classifier's last stdout line. A workflow resume once
re-dispatched an already-accepted task instead of replaying it from cache. A status question typed
to the conductor was relayed straight into an implementer's own prompt and displaced its task,
which is why every implementer prompt now carries a contract-precedence line naming a relayed
message as not addressed to it. The classifier sends a paint-neutral task that happens to touch
`package.json` to the full gate tier, because a repo-root file carries no directory to classify
against; a refinement to the tier table, not a correctness bug, since the full tier is always a
safe superset.

**Environment notes, for the record rather than for a fix.** Three network drops and one usage
stop killed dispatches mid-task during this pass; every one resumed cleanly from committed state,
because each task commits at its own step boundaries rather than only at the end. The battery
floor tripped once at 11 percent and the run stood down cleanly rather than losing work.
