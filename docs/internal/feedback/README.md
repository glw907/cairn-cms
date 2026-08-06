# Migration and incident feedback

Developer-experience feedback from real site migrations and incidents, one dated file per pass,
named `YYYY-MM-DD-<site>-<topic>.md`.

Four sites cross the `0.94.0` window: `aksailingclub-org`, `cairn-pub`, `907-life`, and `ecxc-ski`.
That is the same upgrade walked four times. The comparison only works if each walk answers the same
questions. A migration fills the shape below rather than free prose, and the four files stay
readable side by side.

Write the report from the site's session and land it here. The session that migrates a site runs
from that site's own repo, which is where the evidence is. The distillate belongs in cairn. It
measures engine DX, and its reader is whoever changes the engine next. Keep the full per-task detail
in the site repo and commit the report here as a docs-only change on cairn `main`. The ecnordic
migration already split it that way; its engine-side half is
[`../dx-backlog-ecnordic-migration.md`](../dx-backlog-ecnordic-migration.md).

**Every finding leaves the report.** Fix it in the session, file it to
[the friction log](../docs-friction-log.md) or the [ROADMAP](../../../ROADMAP.md) tier where it
bites, or drop it as no longer true. Where each one went is a field below. A report that accumulates
unrouted findings is a backlog, which is the rot this repo prunes everywhere else.

## The shape

Copy these four sections. Be terse. A section with nothing to say writes "Nothing to report" and
stops; that absence is itself a result.

### 1. The walk

Record the site and repo, the version it came from, the version it went to, every `Consumers must:`
list it crossed, and whether a recipe existed. `aksailingclub-org` goes first and writes the recipe
into [`../../guides/upgrade-cairn.md`](../../guides/upgrade-cairn.md); the three after it follow
that recipe. Say which you were, because it changes what the rest of the report means.

Name the two deltas that correct the guide. What it told you to do that was wrong or unnecessary,
and what you had to do that it never mentioned. Be specific enough that someone can edit the guide
from your sentence without re-deriving it.

Name the first gate failure: where the site's gate first went red, and what fixed it. That moment is
what the engine failed to warn you about earlier, which makes it the highest-signal event in the
walk. Anything that surfaced only at runtime, past typecheck and build, gets its own line. The
engine having no compile-time channel for that break is a design finding in its own right.

### 2. Seam fit

One row per engine seam this site consumed for the first time, answering the three questions in
ruling 3 of the
[engine-harvest decisions](../../superpowers/specs/2026-08-05-engine-harvest-decisions.md).

| Seam | Fit without a workaround? | What the site hand-wrote beside it | Defaults overridden |
| --- | --- | --- | --- |

`aksailingclub-org`'s seams are `createSectionAction`, `/auth-crypto`, `/cloudflare`, and
`createD1AuditSink`. The other three sites in this window bring their own; work out which from what
the migration actually imported. A site that consumed no new seam says so. For reference, the future
xcathletes consumer is not one of the four in this window, and its row will read `publishedAt` and
`newlyPublishedEntries`, `/auth-store`, and `createAuthChannel` once that site exists.

### 3. Cost

Tokens spent, and human interaction points: every question, approval, and correction that pulled
Geoff in. A question that did not change the outcome counts, and is a defect. Both numbers should
fall across the four if the recipe is doing its job. The trend is the signal, so record them even
when they look bad.

### 4. Where each finding went

One line per finding from sections 1 and 2. Fixed here, filed to the friction log, filed to a named
ROADMAP tier, or dropped as not true. Nothing stays only in this file.
