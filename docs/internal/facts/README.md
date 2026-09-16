# The facts container

This directory holds agent-facing facts about cairn: one bullet per fact, each carrying its
source and a status tag. It is never shipped in the published docs arms (`docs/admin/`,
`docs/editors/`, `docs/extend/`, `docs/reference/`, `docs/why-cairn.md`), and it is not
register-graded the way those pages are; the register standard governs a page a reader opens,
this container is a working record for whoever, agent or person, next needs to verify a claim
against the code. It is the fact basis the eventual public docs draw from and check against, not
a draft of them.

## Fact format

Every fact is one bullet:

```
- <the claim>. Source: <file, symbol, line, or doc citation>. [<tag>]
```

A bullet ends with exactly one status tag, always the last thing on the bullet (never at the
start, never a second bracket anywhere else in the bullet). A qualifier, when a tag carries one,
uses the colon form only: `[tag: qualifier text]`, never a space (`[tag qualifier text]` is not
valid). A fact with a compound story (partly confirmed, partly not) still gets one tag, with the
nuance folded into that tag's own qualifier text (`[verified: the core claim traces to X; a
secondary detail was not independently re-checked]`) rather than a second bracket.

A `Source:` naming a code path resolves as `path:line` or `path:line-line`; a `Source:` naming
only a doc page or a symbol with no line is also accepted, but see the `[verified]` entry below
for what that means for the tag.

Two non-fact headings exist per file, both skipped by the gate: `## Harvest record` (the
cross-page-duplicate index, the "not harvested as a fact" notes, and the per-slice harvest
counts, merged under one heading) and `## Provenance` (the harvest and tightening narrative). A
bullet under either heading carries no `Source:`/tag requirement.

## Tag vocabulary

- **`[verified]`**: traced to a specific source file, symbol, line, or constant, and it matches
  the claim exactly. A bullet whose only source is a doc arm page, or bare "page text", is never
  `[verified]`; it is `[candidate: sourced to the page only, not traced to code]` instead, since
  the arms are frozen prose the container itself is meant to check against, not a source to trace
  facts to. A bullet whose source names code AND a page keeps `[verified]`.
- **`[docs-drift: page says "..."]`**: the code says one thing and a published doc page says
  another; the bullet records what the code actually does and quotes the page's wording so the
  drift is visible without opening the page.
- **`[external: <platform>]`**: a fact about GitHub, Cloudflare, SvelteKit, Vite, DaisyUI, or
  another platform cairn depends on but doesn't own; kept only because an implementer acts on it.
- **`[vendor: link, not a repo fact]`**: a price, plan name, or other vendor figure that lives on
  the vendor's own pricing or product page, not in this repo; the number itself is not restated
  here since a vendor changes it without telling cairn.
- **`[candidate: ...]`**: a claim that reads as plausible and is stated precisely, but was not
  independently traced to a source this pass; the qualifier says what was and wasn't checked.
- **`[rejected: ...]`**: a claim that turned out false, with the qualifier saying why; the bullet
  stays in place, tagged, so nobody re-harvests the same wrong claim later.

## Rules

- Every fact has a source. A fact with no traceable source is a `[candidate]`, never a bare
  assertion.
- A fact that contradicts the code is recorded as the code has it, tagged `[docs-drift]`, with
  the page's own wording quoted in the tag.
- An external platform fact is kept only when a site or an implementer acts on it; a platform
  detail nobody depends on is left out rather than harvested for its own sake.
- A vendor figure (a price, a plan name, a quota) gets a link or a citation, never a restated
  number, since cairn does not own it and it goes stale silently.
- A rejected fact stays as a bullet, tagged `[rejected]` with the reason, so it is not
  re-harvested as if it were still open.
- No em dash anywhere in this container; use a comma, a colon, or a new sentence instead.

## How this container grows

The three narrative doc arms (`docs/admin/`, `docs/editors/`, `docs/extend/`) and `docs/why-cairn.md`
are frozen for the finalization window: a pass that changes a public behavior files the fact
bullet here (and updates `docs/reference/` when the change touches a reference page, which stays
maintained per pass), but does not rewrite the frozen arm's own prose. The docs rebuild that
follows the site round rewrites the narrative arms from this container, once. The one sanctioned
exception is a one-line fix a page's own gate demands (a transcript floor, an editor quote, a
snippet); anything larger stays frozen and the drift is recorded here as a `[docs-drift]` bullet
instead.

A site pass that hits a hole in the facts (something it needed that wasn't recorded, or was
recorded wrong) files the hole into `docs/internal/docs-friction-log.md`'s open findings with the
site, pass, date, and engine version, rather than guessing or silently working around it; that
log's own header carries the entry shape and the triage rule. This container used to keep its own
separate intake file (`gaps.md`); it folded into the friction log at the 2026-09-15 tightening
pass so a hole in the facts is triaged the same way as every other docs finding, not a second
backlog.

A `cairn-fact` command that would automate filing a bullet here is deferred, not built: the shape
of a filed fact is still settling, and a command is worth building once a site pass has filed
around twenty facts by hand and the shape has stopped moving. Until then, adding and correcting
facts here is a manual, reviewed step, the same as editing any other doc.

## The gate

A `check:facts` gate is planned for the docs-to-facts pass, walking every file here to enforce
the grammar above: a source, exactly one vocabulary tag in colon form at the end of the bullet,
and every `path:line` pointer resolved against the real file. Once it lands it prints per-file
counts by tag on success, replacing what used to be a hand-maintained index table in this README;
until then, this grammar is enforced by review alone.
