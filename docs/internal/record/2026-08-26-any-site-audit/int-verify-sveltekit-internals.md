# Verification: sveltekit-internals findings (fresh context, 2026-08-26)

Verifier did not produce the findings. Each tested in both directions against the code at
`main`, against `docs/internal/code-idioms.md`, `docs/internal/engine-rulings.md`, and the
`docs/superpowers/plans/2026-07-01-code-polish-*` record.

---

## sk-01 — content-routes-core.ts is one 1,690-line closure — STANDS, tier revised to `refactor`

### Confirmed

- `createCoreActions` at `content-routes-core.ts:527`; file is 2,215 lines. Factory body ~1,690
  lines. 31 declarations nested at factory indent (finding said 30).
- The closure-free set is LARGER than the finding claimed. Mechanical check of every nested
  declaration for a reference to `ctx.` / `runtime.` / other closure bindings:

  | line | name | closes over |
  |---|---|---|
  | 659 | `collectVisibleHrefs` | nothing |
  | 706 | `withRefusalCode` | nothing |
  | 742 | `summarize` | nothing |
  | 768 | `pendingRow` | nothing |
  | 776 | `crawlEntries` | nothing |
  | 1128 | `HISTORY_LIMIT` | nothing |
  | 1135 | `commitEditorName` | nothing |
  | 1148 | `draftFromBranchHead` | nothing |
  | 1205 | `interface SaveHold` | nothing |
  | 1245 | `saveRefusal` | nothing |
  | 2079 | `draftExistsFailure` | nothing |

  11 of 31, not the 7 the finding listed. The finding under-listed its own evidence.
- The `HISTORY_LIMIT` tell is real and verbatim: the TSDoc at `content-routes-core.ts:1123-1127`
  reads *"a module constant, not a site config knob"* on a `const` declared 601 lines inside the
  factory body.
- The file already demonstrates the target shape at module scope (`resolvePreview:367`,
  `invalidIdMessage:382`, `manifestRow:392`, `BUILTIN_FRONTMATTER_KEYS:402`,
  `revertSchemaDrift:410`, `retiredContentAdvisory:430`, `commaListParam:450`, `conceptOf:455`,
  `requireEntryFromParams:469`, `isMissingTableError:479`, `clearPreviewTokens:500`,
  `missingPreviewTableFailure:516`). So the hoist is not a new idiom, it is finishing one the
  file already applies to a dozen symbols.

### Adversarial case tested

- Charter check: `code-idioms.md` "Structural decisions" sanctions the decomposition *"into
  per-domain internal modules ... each a function over one shared closure-context object"*, and
  F2 sanctions `create*` closures. Neither sanctions closure-free declarations living inside the
  closure, and the finding's remediation (more ctx-taking modules) is the same shape the charter
  named. The finding is charter-aligned, not a lint instinct against a ruling.
- Prior-measurement check: `2026-07-01-code-polish-measurements.md:364` records the decomposition
  cutting `content-routes.ts` 3,435 -> 128 lines. Real progress, and core is still the largest
  file in `src/lib/sveltekit` by 1.5x (2,215 vs media's 1,414). The finding's headline "split the
  file, not the shape" is fair for core.
- No ruling in `engine-rulings.md` or `ROADMAP.md` sanctions or defers the core file's size.
  ROADMAP carries only the `CairnMediaLibrary.svelte` split (1609), a different artifact.

### FALSIFIED sub-claim

**"`content-routes-media.ts:374-1413` repeats the shape" is wrong.** Same mechanical check over
`createMediaActions`: 13 nested declarations, 12 close over `ctx`/`runtime`, and the one that
does not (`uploadAction:601`) is a two-line wrapper over `ingestAndStore`. Every media helper and
constant is ALREADY at module scope (`MEDIA_SLUG_RE:251` through `resolveMediaBucket:360`).
Media's factory body is 13 action functions and nothing else — it is the exemplar of the shape
the finding wants, not a second instance of the defect. The remediation line "Apply the same
hoist to `content-routes-media.ts`" has no work to do.

### Tier

Revised `rewrite` -> `refactor`. Not on migration cost (that discount is barred). On kind: with
the media half falsified this is one file; the hoist is a mechanical move of 11 declarations to
a scope the same file already uses for 12 others; the split-by-surface half is the same
ctx-taking decomposition the charter already ratified and `check:surface` already proves, with
direct precedent in the 3,435 -> 128 split. Nothing is redesigned, no behavior or public surface
changes. Rank 1 is not in dispute.

---

## sk-02 — Forked per-request seam helpers — STANDS, tier `refactor` holds

### Confirmed, item by item

- `resolveBackend`: bodies byte-identical at `content-routes-context.ts:309` and
  `nav-routes.ts:43` (`return event.locals.cairnBackend ?? runtime.backend.connect(event.platform?.env ?? {});`).
  `preview.ts:375` inlines the same expression, and `preview.ts:287-288` names the other
  implementation in its own comment: *"the same `locals.cairnBackend ?? runtime.backend.connect(env)`
  seam every other engine load uses (content-routes-context.ts's `resolveBackend`)"*. Three ways,
  one of which documents that it is the third.
- `isMissingTableError`: duplicated at `content-routes-core.ts:479` and `preview.ts:161`, with
  preview's TSDoc carrying the deliberate note *"Mirrors content-routes-core.ts's own local copy;
  the check is a two-line regex, not worth sharing across a module boundary for."*
- Media-manifest read: `parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)))`
  verbatim at media `625, 677, 800, 892, 962, 1020, 1170, 1285, 1351` — exactly the nine lines
  claimed, all nine identical.
- `logCommitFailed` fork: `content-routes-core.ts:2170` calls the free import while the same file
  uses `ctx.logCommitFailed` at 1615 and `ctx.commitFailure` at 1425, 1516, 1771, 1985.
- `ingestAndStore`: re-inlines `resolveMediaBucket`'s platform cast at media `542-545`
  (`(event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {}` +
  `platformEnv[resolved.bucketBinding]`), duplicating `resolveMediaBucket:365-366`.

### The strongest evidence the finding did not cite

`commit-log.ts`'s own module header states the ruling the context then breaks:

> *"A free module, not a ContentRoutesContext method, so a factory outside the content-routes
> composition (createNavRoutes) shares the one definition instead of reimplementing it."*

`content-routes-context.ts:253` and `:263` re-declare both as `ContentRoutesContext` methods
anyway. The finding's remediation (drop them from the context so the free functions are the one
way) is not a preference; it is what the module's own header already ruled.

### Adversarial case tested

- `isMissingTableError` is the one sub-item with a written deliberate note at the call site. It is
  a note, not a docs ruling, and the charter's "Deliberately not standardized" list does not carry
  it. Weakest sub-item; the item does not depend on it.
- `2026-07-01-code-polish-measurements.md` dismisses a residual jscpd self-duplication in
  `content-routes-media.ts` (7 hits) as *"the parallel CSRF-then-session-then-commit-and-retry
  shape ... structurally inherent to the domain rather than copy-paste."* That disposition is
  about the surrounding commit frame, not the manifest-read one-liner, and it was a measurement
  note on jscpd counts, not a design exemption. A `ctx.readMediaManifest` is the same shared-helper
  idiom the charter endorses at L2 and A2. Does not defeat the item.
- `ingestAndStore`'s inline cast refuses with its own `binding_missing` reason and logs, where
  `resolveMediaBucket` returns `{error: string}` — a real behavioral difference, so that sub-item
  is a small cast duplication, not a drop-in call. Weakest half of that sub-item; noted.

Tier `refactor` correct.

---

## sk-03 — Post-action redirect query-string is an unbounded homeless contract — STANDS, `refactor`

### Confirmed

- `refusal-codes.ts` (39 lines) closes the `?error=` vocabulary and says so at line 1: *"this
  module is the whole bounded surface the query channel is still allowed to speak, so an
  attacker-crafted query value carries no meaning past this resolver."* No sibling module exists.
- Writers, all hand-assembled: core `890` (`?new=1${dateParam}${titleParam}`), `1443-1447`
  (string-concatenated `saved=1&drafts=&refs=`), `1533`, `1597`, `1618`, `1626`, `1643`, `1658`,
  `1993`, `2191-2193` (`revertRetiredFields`/`revertRetiredTags`); media `752`, `1046`, `1246`,
  `1381`, `1396`.
- Readers, three different styles: `editLoad` decodes eight params by hand (core `900, 936, 940,
  1088, 1089, 1099, 1101` plus `803` in `listLoad`); `mediaLibraryLoad` uses a seven-branch
  else-if `=== '1'` ladder (media `392-398`); `commaListParam` (core `450`) is a fourth reader
  shape used only for the revert params.
- The channel crosses into the client: `EditPage.svelte:1375-1387` (`redirectFlagList`) decodes
  `drafts` and `refs` itself, so a component owns half the contract.

### Adversarial case tested

- Only prior ruling found: `record/2026-08-14-pass-d-mining-extend.md:176-178` reviewed and
  DECLINED a docs proposal about the `?error=` closure. That is a docs-content decision about
  `explanation/security-model.md`, not a ruling that the sibling params should stay ad hoc.
- The security framing in the finding's title is thinner than the idiom framing: the sibling
  params are boolean `=== '1'` flashes and comma lists, which carry no prose to the reader, and
  `title`/`date` (core `885-890` -> `936-940`) are self-seeded into the author's own new-entry
  form and escaped by Svelte. Read this as an idiom/comprehensibility finding (bars 1-3), which is
  how the remediation is written. Not a security defect.
- `E4` in the charter governs `fail` vs `redirect(303, '?error=')` but says nothing about the
  success-flash params, so the finding fills a real charter gap rather than contradicting one.

Tier `refactor` correct.

---

## sk-04 — `requireEntryFromParams` bypassed twice; media has no equivalent — STANDS, `refactor`

### Confirmed

- `requireEntryFromParams` at `content-routes-core.ts:469`, used at 8 call sites (`1439, 1459,
  1651, 1796, 1818, 2011, 2057, 2104`).
- `editLoad` (core `895-899`) and `historyLoad` (core `1167-1171`) each reimplement the same five
  statements verbatim: `requireEditor` -> `conceptOf` -> `requireEngineAccess` -> `params.id ?? ''`
  -> `if (!isValidId(id)) throw error(400, 'Invalid entry id')`. `historyLoad`'s TSDoc at core
  `1163` says *"Guarded exactly as `editLoad`"*, naming the copy in prose. Both have `runtime` in
  closure, so substitution is direct and lossless.
- Media mirror gap: `requireEditor(event)` + `requireEngineAccess(runtime.access, editor, 'media')`
  hand-copied at media `386/387, 667/668, 777/778, 880/881, 938/939, 1012/1013, 1068/1069,
  1146/1147, 1268/1269, 1341/1342` — exactly the ten sites claimed, all identical.
- tidy/dictionary conditional gate: `content-routes-tidy.ts:118` and
  `content-routes-dictionary.ts:102` are identical code lines preceded by identical comments.

### Corrections to the evidence (not defeating)

- The tidy/dictionary comments are three lines, not five (the finding said "identical five-line
  comments"); it is 3 comment lines + 1 code line each.
- Only the access-gate half of the tidy/dictionary preamble hoists cleanly: the preceding CSRF
  check refuses with different payload types (`TidyFailure` vs `DictionaryAddFailure`). The
  finding only proposes hoisting the conditional gate, so this is a scoping note.

### Adversarial case tested

No charter or ruling exempts these. The precedent runs the other way: `requireEntryFromParams`
exists at module scope in the same file and eight actions use it, so both the bypasses and the
absent media equivalent are departures from the file's own established one-way.

Tier `refactor` correct.

---

## Summary

| id | stands | tier |
|---|---|---|
| sk-01 | yes, with the media half falsified | `rewrite` -> `refactor` |
| sk-02 | yes, strengthened by commit-log.ts's own header | `refactor` |
| sk-03 | yes, reframe from security to idiom | `refactor` |
| sk-04 | yes | `refactor` |
