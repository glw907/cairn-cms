# Facts container review: charter and per-pass cost

Lens: is a facts container cairn's job and the leanest form; what a pass pays per pass; where the
README's contract overreaches; what shipping it in the tarball costs; front-door.md against the
"cairn case DEAD" ruling. Not reviewed: bullet grammar, page-rebuild feasibility.

## Findings, ranked

1. **Shipping the container in the tarball is the one step that crosses the charter line, and the
   container's own contract forbids it.** `docs/internal/facts/README.md:4` states it "is never
   shipped"; the plan ships it as consumer-inherited surface, where the leanness test now applies.

2. **The plan produces two records of the same reference surface.** `docs/internal/facts/reference.md:5`
   onward is a per-page harvest of `docs/reference/*`, which the plan moves intact into the same
   directory: 1270 paraphrase lines beside 648K of gated pages, with no gate holding them in sync.

3. **Deleting the admin and editors arms strands the two audiences the container cannot serve.**
   `README.md:3-9` declares the container agent-facing and not register-graded; an admin with no code
   and an editor with no terminal get nothing, and cairn.pub renders empty at the pin bump.

4. **About 89 bullets in the container are page archaeology, not facts.** The `## Cross-page duplicates`
   and `## Harvest notes` sections (`admin.md:108-120`, `front-door.md:177-200`, `reference.md:1107`)
   are indexed by arm page and become unreadable the moment those pages leave the tree.

5. **The container's whole spine is headings named after pages the plan deletes** (`reference.md:5`
   `## docs/reference/admin-grammar-tokens.md`, `admin.md:104`). After the deletion a pass has no
   subject index telling it where a corrected fact belongs; it must know the old page layout.

6. **The index table is seven rows of hand-maintained counts with no gate, already drifting.**
   `README.md:72-79` claims 727 facts; tagged bullet lines count 733. Every pass must retype up to
   seven numbers, and the planned check ("source and one tag") does not check them.

7. **The six-state tag vocabulary is already applied against its own rule at birth.** `README.md:43`
   says a fact with no traceable source is a `[candidate]`; `admin.md:10,12,22,80` carry
   "Source: none found in repo" tagged `[vendor]`. A pass under pressure will skip the distinction.

8. **The vendor no-restated-number rule is broken in the same file that states it.** `README.md:49`
   forbids restating a vendor figure; `admin.md:113` restates "$5/month". The rule got skipped exactly
   where the format turned tedious, which is the per-pass cost signal.

9. **`gaps.md` opens a second complete-or-move staging area beside the friction log.** `gaps.md:23`
   copies `docs/internal/docs-friction-log.md`'s rule verbatim, and the cairn-pass step already
   mandates a whole-log triage every pass. Two logs with one rule is accretion, not leanness.

10. **Engine code points into the admin arm at runtime.** `src/lib/doctor/checks-local.ts:598` is
    emitted in a doctor finding at `:647`, and `src/lib/diagnostics/conditions.ts:22` carries 27
    `docsAnchor` values relative to `docs/admin/`. Deleting the arm orphans them on four sites.

11. **The gate saving is real but narrower than it looks.** `docs/extend` holds 74 fenced `ts` blocks
    against `docs/reference`'s 239, so `check:snippets`, `check:reference`, `check:reference:signatures`
    and `check:docs` all survive the move; only the prose gates (vale, arm-indexes, editor-quotes,
    transcripts, visuals) actually retire, and `check:facts` is added back.

12. **`front-door.md` is consistent with the DEAD ruling in content, but weakest as facts.** It harvests
    `why-cairn.md`, not the frozen cairn-case record. Five of its 42 facts are candidates
    (`front-door.md:16,33,71,126,174`), one an unverifiable owner claim; its rebuild target is voice.

## Verdict: the lightest form that still meets the goal

The container itself is not a charter violation. It is internal, exports nothing, models no actor,
and sits on the same side of the boundary the charter already drew for the Go tool: it costs a
consumer nothing. What the charter would reject is the surrounding apparatus the plan wraps around
it, and one step in particular. Ship nothing new in the tarball: keep `docs/reference/` where it is,
published and gated, since it is the only doc arm a consumer or an agent in `node_modules` actually
resolves against, and it is already the authoritative record that `facts/reference.md` merely
paraphrases. Delete `facts/reference.md` rather than move the pages beside it. Keep `admin/` and
`editors/` in the tree and the tarball until the site round produces their replacement, because
cairn.pub renders the arms and an empty docs site for four production sites is a larger cost than
the prose gates those two arms carry. Retire `extend/` into the container, which is where the real
prose weight and the real drift live, and where the reader is a developer who can read a sourced
bullet. Then cut the container's own contract to what a pass will actually honor under pressure: two
tags (`verified` and `unverified`, drift folded into the qualifier), no hand-maintained index table,
the cross-page-duplicate and harvest-note sections dropped now that they index pages that survive,
`gaps.md` folded into `docs/internal/docs-friction-log.md` under the triage rule that already exists,
and no `cairn-fact` CLI until a site pass has filed twenty facts by hand and the shape has stopped
moving. That version costs a pass less than editing the arms does today, keeps the drift corrections,
and leaves nothing for a future pass to unwind.
