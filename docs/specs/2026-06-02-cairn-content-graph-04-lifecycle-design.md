# Cairn content graph Plan 4: content lifecycle (delete) and the integrity guards (design)

This plan adds the content delete path and the two integrity guards that keep internal links honest at
the moment they would break. It is the fourth plan of the content-graph initiative
(`2026-06-02-cairn-content-graph-design.md`, approved), and it follows the picker (Plan 3, executed).
The initiative's single "content lifecycle and integrity guards" plan is split here: this pass takes
delete plus the guards, and rename plus the multi-file inbound rewrite move to Plan 5.

## Why split delete from rename

Rename rewrites every inbound `cairn:` link in one atomic commit to `main`, which triggers a site
deploy, so it is the highest-blast-radius operation in the whole initiative. Delete and the two guards
are contained: a delete touches one content file plus the manifest, and a guard is a read of the
manifest edge list plus a block. Isolating the multi-file rewrite to its own pass follows the
size-by-execution-efficacy practice and keeps this pass verifiable against a single content change.
The cascade-unwrap-on-delete idea (removing a deleted target's inbound links automatically) is itself a
multi-file inbound rewrite, so it moves to Plan 5 alongside rename rather than landing here.

## The posture: keep `main` always deployable

A cairn save is a commit to `main`, which auto-deploys, and the build fails closed on a dangling
`cairn:` token. Cloudflare keeps the last good deployment live, so a broken commit fails safe with no
outage, but the author's change silently never goes live. Authors are non-technical and do not watch CI,
so the only signal they will see is an in-editor one. Both guards therefore enforce in the editor and
keep every commit deployable, rather than relying on the build alone to catch a problem the author will
never notice.

This posture was grounded against the field. Sanity hard-blocks deleting a document that has incoming
references by default. Contentful shows incoming references in a sidebar and allows the delete, but its
delivery API omits an unresolved link at read time, so it has no build-fail to protect. Hugo and
Docusaurus fail the build on a broken link and have no editor. WordPress and Notion delete silently and
leave inbound links to 404. Cairn has both a build-fail backstop, which is a deliberate feature, and a
save that equals a deploy, so the patterns that tolerate a dangling link do not fit. The two postures
that fit a build-fail backstop are Sanity's block-until-clean and a cascade-unwrap, and block-until-clean
is the grounded choice that also keeps this pass contained.

## The three integrity pieces

### Inbound-link computation

A pure `inboundLinks(manifest, concept, id)` in `src/lib/content/manifest.ts` returns every entry whose
`links` edge list points at the target, as a small list carrying each linker's concept, id, title, and
permalink (enough for the dialog to name it and link to its edit page). It is the one source of truth for
"what links here", used by the delete guard now and by the deferred backlinks panel later. A self-link is
excluded. It is pure over the manifest, so it unit-tests without a backend.

### The delete guard (block-until-clean)

`editLoad` computes the current entry's inbound links from the manifest it already reads and ships them to
the edit page. The page gains a Delete control. With inbound links present, its dialog lists them, for
example "3 pages link here", each linking to its edit page, and the delete is blocked with guidance to
repoint or remove those links first. With no inbound links, the dialog is a plain confirm ("Delete this
post? This cannot be undone").

A new `deleteAction` is the authoritative gate. It re-reads the manifest and recomputes the inbound links
at commit time, which closes the load-to-delete race where a link is added between the page load and the
delete. If any inbound link exists, it refuses and returns the list, so the dialog re-renders the block.
With none, it commits the content file removal plus `removeEntry(manifest)` in one `commitFiles` commit
(a `content: null` change deletes the file, the manifest change updates the projection), then redirects to
the concept list.

### The save guard (hard-block dangling, warn draft)

`saveAction` already reads the manifest, builds the entry row, and commits content and manifest atomically.
The guard inserts before the commit. It runs `extractCairnLinks(body)` and resolves each link against the
just-read manifest, partitioning the results.

An **absent target**, one not present in the manifest at all (a hand-typed token or a since-deleted
target), hard-blocks the save. The action does not commit and returns a `fail()` carrying the broken links,
so the editor names each one in plain language and offers a one-click fix that unwraps it. The unwrap is a
pure `unwrapCairnLink` transform that strips `[text](cairn:...)` back to `text`, leaving the words and
removing only the broken link. A live text selection is never rewritten, only the broken link the guard
identified.

A **draft target**, one present in the manifest with `draft: true`, does not block. The save commits and
the saved page surfaces a warning, for example "links to 2 unpublished pages", since the link is valid and
will resolve once the target is published. This subsumes the Plan 2 draft-target follow-up at the save
layer, where a link to a draft resolves to a permalink that 404s publicly until the target ships.

The picker offers only existing targets and the delete guard prevents orphaning at the source, so the save
guard rarely fires. It is the kind, early surfacing of the same condition the build backstop catches last.

## The fold-ins

Four carried follow-ups ride along, since each is link-integrity work on the surfaces this pass already
touches.

**Bracket-escaping in link display text.** The Plan 3 picker writes an author title into the display text
of `[..](cairn:..)` unescaped, so an unbalanced bracket in a title breaks the markdown link. A pure
`escapeLinkText(text)` escapes `\`, `[`, and `]`, applied where a title becomes display text: the
`linkCompletions` apply string and the title branch of `insertInlineLink`. A live selection stays
untouched, since that is the author's own text. Tests cover a balanced title, an unbalanced title, and the
selection-wrap case.

**`parseManifest` per-entry and version guard.** The Plan 2 `parseManifest` checks only that `entries` is
an array and then casts it, and it hardcodes `version: 1`. The guards and the delete path all read the
manifest, so the parse is hardened to validate the `version` and each entry's shape, throwing a clear error
on a malformed file instead of letting a bad row through.

**Validation-failing-entry consistency.** A Plan 2 follow-up: the manifest can include a validation-failing
entry while the site index excludes it, so the preview resolves a link the build then rejects as missing.
The manifest projection and the site index are reconciled to exclude the same entries, so the preview
resolver and the build resolver never disagree on whether a target exists.

**The minor Plan 3 editor nits.** `insertLink` gains a pre-mount fallback that appends `[title](href)` to
the raw value when the editor has not finished its dynamic import, matching `insertAtCursor`.
`cairnLinkCompletionSource` skips the `[[` trigger when the cursor sits inside a fenced code block, reading
CodeMirror's syntax tree at the cursor so `matchCairnTrigger` stays pure and DOM-free. `LinkPicker`'s
section-order tiebreak sorts an unlisted concept by its display heading rather than its raw concept id.

## Where it lives in code

- `src/lib/content/manifest.ts`: `inboundLinks`, the hardened `parseManifest`.
- `src/lib/content/links.ts`: `escapeLinkText`.
- `src/lib/components/markdown-format.ts`: `unwrapCairnLink`, the `insertInlineLink` escape.
- `src/lib/components/link-completion.ts`: the escape in `linkCompletions`, the code-block skip in the source.
- `src/lib/components/LinkPicker.svelte`: the section-order tiebreak.
- `src/lib/components/MarkdownEditor.svelte`: the `insertLink` pre-mount fallback.
- `src/lib/components/EditPage.svelte` plus a delete dialog component: the Delete control and the blocking dialog.
- `src/lib/sveltekit/content-routes.ts`: `deleteAction`, the `editLoad` inbound field, the `saveAction` guard.
- The manifest projection and the site index reconciliation for validation-failing entries (the delivery and content layers).
- The relevant package and component index exports, and a minor version bump.

## Testing

- `inboundLinks`, `escapeLinkText`, `unwrapCairnLink`, and the hardened `parseManifest` are pure, so they
  unit-test directly: no inbound, one, many, cross-concept, a self-link excluded; balanced, unbalanced, and
  selection escaping; the unwrap leaving the text; a malformed entry and a bad version rejected.
- The save guard and the delete path test in the integration project, in workerd against a real miniflare
  D1 and a manifest fixture, since they read committed content and the edge list. A save linking to an
  absent target is blocked with no commit. A save linking to a draft target commits and carries the
  warning. A clean save commits. A delete with inbound links is refused with no commit. A delete with none
  removes the file and the manifest entry in one commit, asserted by the `commitFiles` call shape.
- The Delete dialog and the editor nits test as components: the dialog lists inbound links and blocks the
  confirm; the unwrap fix; the pre-mount fallback; the code-block skip.
- Validation-failing-entry consistency tests that the manifest projection and the site index exclude the
  same entry.

## Out of scope (Plan 5 and later)

Rename and the multi-file inbound rewrite are Plan 5, where the cascade-unwrap-on-delete also lands, since
both rewrite many files in one commit. The deferred initiative items stay deferred: deep links to a
heading, create-on-link, the admin link-health view, the backlinks panel (which reuses `inboundLinks`),
external-link checking, and the redirect map on rename for external inbound links.
