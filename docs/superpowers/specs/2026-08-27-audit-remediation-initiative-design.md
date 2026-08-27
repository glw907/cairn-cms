# The any-site audit remediation: initiative design

Ratified by Geoff 2026-08-27 in the toolkit-seams close session. This document frames the
initiative; the per-item rulings live in `docs/internal/engine-rulings.md` and the audit record
(`docs/internal/record/2026-08-26-any-site-audit.md`), and are deliberately not restated here.
Each slice below gets its own just-in-time plan through the standing two-round adversarial
review (`engine-triage` against the ledger, then a pre-approval round), executed in a fresh
session on its own worktree.

## The slices, in order

**R0 — CSRF guard hardening (short pass, first).** Two changes from the toolkit-seams security
review's diagnosis of the consumer 403 incidents: the CSRF cookie moves from `SameSite=Strict`
to `SameSite=Lax` (the session cookie is already Lax; a double-submit token gains nothing from
Strict, and Strict is what makes the magic-link confirm-load re-mint invalidate other tabs),
and the guard's csrf rejection records gain a non-sensitive `detail` discriminator
(`no-cookie | no-token | mismatch`) plus the log-events reference row, so the next incident is
diagnosable from Workers Logs. Evidence and the full mechanism: the friction-log entry dated
2026-08-27. Small, independent, live incident class: it goes first.

**R1 — the 94 retires.** Deletion-heavy and mostly mechanical: the 53 route-factory retires
from the over-applied R4 closure rule, the undogfooded admin-toolkit field tier (`SelectInput`,
`SelectInputOption`, `TextInput`; `FieldLabel` stays), and the remainder per the ledger's
retire entries. Retire-first is the ratified ordering because deletions shrink every downstream
slice: the coherence families are then ruled against survivors, and the docs drift-hunt (grep
the whole `docs/` tree per removed name) runs once. Each retire closes its ledger entry; the
`Consumers must:` lines accumulate in the open window.

**Seam session — the custom-screen content-read decision (design, not a pass).** The audit's
biggest held design question is ruled in a dedicated brainstorm with Geoff BEFORE R2 is
planned, because the ruling shapes the routes/admin reshapes. Output: a short spec or a ledger
ruling R2's plan cites.

**R2 — conventions and reshapes.** The seven structural coherence families define the target
conventions (canonical export home; one parameter-bag convention; one factory-return mechanism;
verb rules beyond the factory verbs; no bare-noun functions; one "what happened" idiom;
narrowing `ContentRoutes` and re-deriving the R4 closure, which re-tests adapter's ~22
C2_READDED keeps and the three closure leaks), and the 57 reshapes execute against them in the
same slice so no signature is touched twice. Includes the coupled pair (`defineAccess` accepts
`undefined` roles, which reopens and retires `DEFAULT_ROLES`) and the auth family's
`createSectionAction` authorization asymmetry. Expect the planning round to split R2 in two
(rule-and-reshape the auth and CLI families first, then the cross-surface conformance sweep);
that split is the plan's call, not this document's.

**R3 — internals.** The ten rewrite-tier findings: the five monolith splits (`EditPage`,
`CairnMediaLibrary`, `content-routes-core`, `audit/rendered.ts`, the `MarkdownEditor` 33-prop
seam collapsing onto `registerEditor(api)`), the `FieldDescriptor` exhaustiveness idiom, the
coherence-thirteen (idiom-charter gate, pass-scoped comment purge, `ec-*` out of emitted
markup, the `as never` test casts, the formatter decision), and the newcomer walk's `src/lib`
internals map. Runs after the surface settles so nothing splits twice. Mostly
consumer-invisible; emitted-markup and rename items ride the window.

**R4 — the chassis improvement round.** `examples/showcase` improves against the changed
engine, per the standing ROADMAP entry (review half done: 14 findings, none rewrite-tier;
rank 1 is the never-executing paginated archive and its build-gate exception).

## The publish ruling

**One cut, after R4.** Geoff's call, superseding the after-R2 recommendation: the whole
remediation, surface and internals and chassis, ships in a single release with one
`Consumers must:` list. `main` stays releasable throughout (every slice merges green and holds
unpublished); the already-open window (toolkit-seams, harvest-detection) rolls into the same
cut. Consequence to honor in every slice: nothing may land that would force an early cut (a
consumer-blocking fix belongs in a patch off the last published tag if one is ever needed).

## Budget and process notes

Every slice plan's header states a token ceiling that covers the WHOLE pass, chains plus
ritual (the toolkit-seams lesson: its 2.4M chain ceiling met a ~4.3M pass). Fresh session per
slice; this session's artifacts (this spec, STATUS, the ledger) are the handoff. The
consultation protocol applies as usual: a consuming-site pass that arrives mid-initiative
consults against the moving surface, and the ledger stays the single record.
