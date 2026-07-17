# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(currently `STATUS-archive-2026-05-to-2026-07.md` and `STATUS-archive-2026-07-02-to-2026-07-16.md`),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-16, latest: 0.87.0 PUBLISHED — fragments plus the friction-triage window; the friction log is CLEARED; next = ASC consumes fragments in its own session, or the design-arc queue)

**0.87.0 IS PUBLISHED (release v0.87.0, publish run 29552392697 green, OIDC verified; `npm view`
serves 0.87.0 on latest).** The cut rolled the fragments window plus a same-day friction-triage
pass on the `friction-triage` branch (Geoff's directive: the release includes every valid
friction-log item, and the log ends the pass CLEAR). One `Consumers must:` line rides the window
(the embedded-routing enforcement; neither production site is affected).

**The friction-log triage, in numbers:** ~25 open findings verified against the code by a
three-agent read fan-out. Eleven were already resolved (shipped by earlier passes but never
pruned), ten shipped in this pass, and the rest moved to ROADMAP with their triggers (conflict-
draft preservation, image/reference required-visibility, URL-identity home, EngineScreenId
narrowing, `$schema` carve-in, the scaffolder trio folded onto the scaffolder entry). The log now
holds only tombstones. GitHub private vulnerability reporting is ENABLED (the repo went public
2026-07-03; the SECURITY.md finding's own prescribed action).

**What shipped beyond fragments:** the fold-pill identity ("Callout · 12 lines" from the registry
label, `use`-line tooltip, include ids at label strength — from a Fable design brief on Geoff's
folded-components question; the chip/WYSIWYG-adjacent treatments filed to the polish arc), the
save-path SiteConfigError redirect (visible parser message, not a raw 500), the closed-multiselect
"Choose at least one." client signal, hint-id scoping, the suggestion-popover backtick styling,
`SettingsData`/`VocabularyLoadData` barrel exports, the `replyTo` wire, four test-hygiene fixes
(golden-path direct nav, `pretest:e2e` repackage hook, fold-on-mount timeouts, palette-inset
computed-style pin), the media-smoke curl appendix, and four fragments UX fixes from a Fable
adversarial review (the list delete-refusal copy family, the standing "Included in" Details group,
the picker empty state, the nameless-include notice).

**Gates at close:** check 0/0 (1381 files), 3600 tests exit 0, custom-surface PASS both trees,
comments/reference/signatures/docs/package all OK, branch CI e2e green (run 29552074341), and a
17-agent review workflow (four lenses, three adversarial refuters per finding) that confirmed 2
findings (both fixed: the fail(400) silent no-op regression — its own catch was this pass's — and
the stale fold tooltip) and refuted 2.

**NEXT (fresh session, GEOFF-IN-THE-LOOP): the INVISIBLE-CRAFT POLISH PASS** (design-arc queue
item 4; Geoff chose it 2026-07-17). Not to be confused with the 0.86.2 design-refinement arc,
which absorbed only the brief's Typography and Color sections and explicitly carried this pass
forward in its settle section. The rubric is
docs/internal/2026-07-15-admin-resolved-polish-brief.md (spacing/rhythm, depth, motion, feedback,
forms, micro-details); the pass also owns the weight-only pressed-cue advisory and the 2026-07-16
fragments riders on the ROADMAP Next entry (preview boundary cue on included content, the publish
blast-radius line, include-line atomic delete, the folded-chip question). Iterate fully local
against the showcase admin with Geoff's eyes per round (notes are probes; ceremony once at
settle). Resume prompt: "Start the admin invisible-craft polish pass with me: read
docs/internal/2026-07-15-admin-resolved-polish-brief.md, docs/internal/admin-design-system.md,
the ROADMAP Next polish entry (it carries the fragments riders), and the
cairn-admin-design-arc-queue + design-iteration-economics memories; iterate locally against the
showcase admin." Launch inside ~/Projects/cairn-cms.

**PARALLEL, in ASC's own session:** the ASC consolidation consumes fragments (its
docs/fragment-candidates.md holds nine ready cases; navLayout addition + content migration there).

**Also this pass-close:** the STATUS archive rule is enforced again as of 2026-07-17 (the
accumulated entries moved to `docs/internal/history/STATUS-archive-2026-07-02-to-2026-07-16.md`),
and the friction log is CLEAR with a standing complete-or-move rule.
