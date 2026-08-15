# Pass D Task 9 mining: the editor audience

## Summary

I read the eight editor-facing pages of the old corpus (`docs/guides/editor-welcome.md`,
`write-in-the-editor.md`, `publish-and-discard.md`, `add-an-image.md`,
`manage-the-media-library.md`, `manage-your-tag-vocabulary.md`, the editor-facing half of
`enable-tidy.md`, and `docs/reference/authoring-syntax.md`, about 1,180 lines) against the eight
pages of the new `docs/editors/` track (about 660 lines), then verified every candidate against
the admin components, `content-routes-core.ts`, `content-routes-media.ts`, `content-routes-tidy.ts`,
and the render pipeline.

The rebuild lost less than the size difference suggests. Most of the old corpus's bulk was register
violations the new track bans on purpose: the holding-branch model, a branch-and-deploy mermaid
diagram, a 400-word essay on markdown's history from Scribe to iA Writer, and a component catalogue
that belongs to whoever's site it is. The new track is also more accurate: it corrects two
confidently-worded old paragraphs that the code contradicts (below, in the declined list).

Nineteen things are genuinely absent, and the shape of the loss is consistent. The new track is
excellent on the paths an editor walks daily and thinner on three seams: **controls the old pages
documented and the new ones skipped entirely** (the hero image, media bulk delete, the preview
device widths), **refusal and notice strings** that `when-something-goes-wrong.md` promises to quote
exhaustively but does not, and **two authoring syntaxes** (footnotes, escaping) that are absent from
the new track *and* from the in-editor cheat sheet, which is the only other place an editor could
find them. Finds 1 through 8 are worth folding. Finds 9 through 13 are real but smaller. Finds 14
through 19 are marginal and I say so.

`authoring-syntax.md`, flagged as the highest-risk page in the slice, absorbed cleanly. Its three
syntaxes are all covered: `cairn:` and `::include` in `editors/write-in-the-editor.md` (as "leave it
as is" tokens, which is the right depth for an author who never types them), and the developer half
in `reference/media.md`. One rule from it did not survive, and it is find 2.

## Finds

| # | Old page and line | The fact | Code proving it true | Belongs on | Proposed addition |
| --- | --- | --- | --- | --- | --- |
| 1 | `add-an-image.md:118-135` | Every post or page can carry a **hero image**: a lead picture set from the Details panel, which also becomes the card a social network shows when someone shares the entry. It has its own dialog with a 16:9 preview, its own alt-or-decorative choice, and a caption. The new track never mentions it. | `src/lib/components/MediaHeroField.svelte:3-4` ("the persistent details-panel field that sets a concept's lead picture, the one image that both leads the page and becomes the social card"), `:21-25` (the at-rest row and the empty dropzone), `:29` (the 16:9 crop preview) | `editors/add-an-image.md`, new section; cross-linked from `write-in-the-editor.md` Details | "Open Details to set the entry's lead picture. It shows at the top of the page and is also what appears when someone shares the entry on a social site, so it gets its own preview showing the shape it will be cropped to." |
| 2 | `authoring-syntax.md:60-61` | A fragment cannot include another fragment. Attempting it does not degrade quietly: **the save is refused** with "A fragment can't include another fragment." | `src/lib/sveltekit/content-routes-core.ts:1300`; the render-side backstop at `src/lib/render/resolve-include.ts:12-13` names it "the engine's save-time nesting rejection" | `editors/when-something-goes-wrong.md`, save-refused section | "**\"A fragment can't include another fragment.\"** You put an Include into a fragment's own text. Take it out and write the text directly instead." |
| 3 | `publish-and-discard.md:56` | History reaches back **25 published versions**, not forever, and the list restarts at a rename, so it cannot see past one. The new page says "Every publish is kept as a version you can return to," which overstates what the screen shows. | `content-routes-core.ts:1113` (`const HISTORY_LIMIT = 25`), `:1173-1174` (the truncation flag), `CairnHistory.svelte:87` (renders "Showing the most recent 25 versions."), `CairnHistory.svelte:5-6` (the rename restart) | `editors/publish-and-history.md`, "Getting an earlier version back" | "The list shows your 25 most recent publishes, and says so when there are more. If you changed the entry's address at some point, the list starts from that change. For anything further back, ask your site developer." |
| 4 | `publish-and-discard.md:58` | Reverting to a version written before a change to the entry's fields or tags **silently drops what no longer fits**. The editor warns on the draft: "This version predates a change to this content type: ... no longer belong to it. Saving keeps only what the current form shows." | `content-routes-core.ts:417-430` (the exact message), `:411-415` (it rides both `revertAction` and `editLoad`) | `editors/publish-and-history.md` revert section, and quoted in `when-something-goes-wrong.md` | "If the old version used a tag or a field your site has since dropped, the draft says so. Saving keeps only what the form in front of you shows, so check it before you publish." |
| 5 | `manage-the-media-library.md:125-137` | The library supports **selecting many images and deleting them together**: Space toggles the focused tile, Shift with an arrow extends a range, Ctrl (Cmd) plus A takes everything visible, and an action bar appears with a count. A bulk delete never force-deletes an image still in use; it skips those and names them. The new page documents only single delete. | `CairnMediaLibrary.svelte:10-16` (the multiselect model and the reversible bulk Delete), `content-routes-media.ts:756-775` (skip-and-report, never force; the whole batch refuses if usage cannot be verified) | `editors/manage-the-media-library.md`, new section after "Deleting an image" | "To clear out several at once, select them (Space on a tile, Shift and an arrow for a run, Ctrl+A for everything showing) and use the Delete button in the bar that appears. Anything still in use is skipped and named rather than deleted." |
| 6 | `enable-tidy.md:107-108` | Tidy **refuses a draft over roughly 24,000 characters**: "This is too long to tidy at once. Select a passage and tidy that instead." | `content-routes-tidy.ts:45` (`MAX_TIDY_CHARS = 24_000`), `:118-119` (the refusal and its exact text) | `editors/write-in-the-editor.md` Tidy paragraph, and `when-something-goes-wrong.md` | "**\"This is too long to tidy at once. Select a passage and tidy that instead.\"** Your draft is past what Tidy takes in one go. Select a section and run it on that." |
| 7 | `publish-and-discard.md:20` | A save whose text links to a page **you have written but not yet published** goes through, with a notice: "Saved. Note: this page links to unpublished pages (X), which will 404 until published." A link to a page that does not exist at all is refused instead, which the new page does cover. | `content-routes-core.ts:1353-1364` (absent blocks, draft warns), `:1427-1428` (the notice rides the redirect), `EditPage.svelte:1969` and `:1974` (the two exact strings) | `editors/when-something-goes-wrong.md`, save section | "**\"Saved. Note: this page links to unpublished pages...\"** Your save went through. The page you linked to isn't live yet, so readers hit a dead end until you publish that one too." |
| 8 | `write-in-the-editor.md:194` | Every `:::` block **opens folded**, collapsed to a single line, so a block-heavy entry reads as prose first. Touching one with your cursor or your typing unfolds it, so text is never edited unseen. The margin control, and Ctrl+Shift+[ / ], fold and unfold by hand. | `editor-folding.ts:504` (`foldOnMount`, "an entry opens with its [blocks folded]"), `:14` ("an author never edits, deletes, or fails to see hidden text") | `editors/write-in-the-editor.md`, "Layout blocks" | "Blocks open collapsed to one line, so a long entry reads as writing first. Click the control in the margin, or just put your cursor in one, and it opens." |
| 9 | `write-in-the-editor.md:190` | Preview carries a **device-width selector**: Desktop, Tablet (768px), Phone (390px), Small phone (320px), so you can check the phone layout without a phone. The choice is remembered in your browser. | `preview-doc.ts:43-48` (the four widths), `EditPage.svelte:378-388` (the per-browser preference) | `editors/write-in-the-editor.md`, "The screen" | "The Preview tab has a width control: check the entry as a phone or a tablet shows it, not only as a desktop does." |
| 10 | `add-an-image.md:106-111` | **Marking a picture in your text decorative does not stick.** Reload the entry and it reads as needing alt text again. A hero image's decorative choice does stick. Leaving it is safe; the flag is only a checklist item. | `MediaHeroField.svelte:15-19` (the asymmetry, stated exactly: "markdown alt has no slot for it, so a decorative body image still reads as needs-alt on reload") | `editors/write-in-the-editor.md`, Images | "A picture in your text that you marked decorative reads as needing alt text again the next time you open the entry. Nothing is wrong; there's nowhere in the text to record the choice. Leave it." |
| 11 | `write-in-the-editor.md:288` | The amber underline **flags more than spelling**. Three mechanical slips get the same mark, each with a one-click fix: a doubled word ("the the"), a double space inside a line, and repeated punctuation. Nothing about phrasing or style is ever flagged. | `objective-errors.ts:1-3` (the three checks), `:12` (the kinds), `:4-5` (the deliberate no-style-opinion rule) | `editors/write-in-the-editor.md`, "Spelling and style" | "The same underline also catches a doubled word, a double space, and stray repeated punctuation, each with a one-click fix. It never comments on your phrasing." |
| 12 | `write-in-the-editor.md:43` | **Pasting from Word, Google Docs, or a web page keeps the formatting**: headings, bold, italic, links, and both kinds of list arrive already marked. Everything else (a table, an image, a quote, code, strikethrough) arrives as plain words. | `paste-html-to-markdown.ts:1-9` (the exact list of what converts and the plain-text fallback for everything else), `:11-13` (built to tolerate real word-processor markup) | `editors/write-in-the-editor.md`, after "The screen" | "Paste from a word processor and your headings, bold, italic, links, and lists come across already formatted. Anything else arrives as plain text for you to mark up." |
| 13 | `write-in-the-editor.md:307`, `:395` | **The draft won't take typing while a Tidy review is open**, and the same on the Preview tab. It is the editor protecting a decision in progress, not a fault. | `MarkdownEditor.svelte:698-701` (`EditorState.readOnly` plus `editable: false` under a tidy review), `EditPage.svelte:372-374` (the insert controls disable in both states) | `editors/write-in-the-editor.md` Tidy, or `when-something-goes-wrong.md` | "While a Tidy review is open you can't type in the draft, the same as on the Preview tab. Finish the review, or Reject all, and typing comes back." |
| 14 | `enable-tidy.md:125-129` | **The Tidy button can vanish.** When your site's AI connection breaks, the editor hides the button rather than leave it there to fail. It reappears on its own within about ten minutes of the fix. Marginal: nothing an editor can act on, but it reads as a bug. | `tidy-key-health.ts:1-7` ("a dead key hides the Tidy button entirely (truthful visibility)"), `:13-18` (`TTL_MS = 10 * 60 * 1000`) | `editors/when-something-goes-wrong.md` | "**The Tidy button isn't there any more.** Something broke in your site's connection to the copy-edit service. The button comes back on its own once it's fixed. Tell your site owner." |
| 15 | `write-in-the-editor.md:168-178` | **Footnotes work.** `The race was decided on handicap.[^1]` with `[^1]: Under the 2025 table.` on its own line gathers the notes at the foot of the published page and links each one both ways. Absent from the new track *and* from the in-editor cheat sheet, so it is documented nowhere. Grounded on the dependency contract rather than a test, which is why it ranks here. | `src/lib/render/pipeline.ts:143` (`.use(remarkGfm)`, which enables GFM footnotes), `src/lib/render/sanitize-schema.ts:29` (the schema handles `data-footnote-backref`, which only exists once footnotes render); absent from `markdown-reference.ts:14-30` | `editors/write-in-the-editor.md`, after Links | "For a footnote, put `[^1]` where the mark goes and `[^1]: the note` on its own line. The published page collects them at the bottom." |
| 16 | `write-in-the-editor.md:180-183` | **A backslash cancels a formatting mark**: `\*not italic\*` renders with its asterisks. The fix for text that keeps turning italic when you meant an asterisk. Also documented nowhere: not in the new track, not in the cheat sheet. | Standard `remark-parse` behavior via `pipeline.ts:143`; absent from `markdown-reference.ts:14-30` | `editors/write-in-the-editor.md` | "If a character keeps being read as formatting, put a backslash in front of it: `\\*` gives you a plain asterisk." |
| 17 | `manage-your-tag-vocabulary.md` / rename flow | Two rename refusals the new page does not quote, on a page that promises to quote every message: **"Leave the date out of the address."** and **"Could not verify references. Try again."** Marginal: both are self-explanatory. | `content-routes-core.ts:1819`, `:1849` | `editors/when-something-goes-wrong.md`, renaming section | Add both as quoted lines with a one-clause gloss. |
| 18 | `add-an-image.md:33-34`, `manage-the-media-library.md:47-48` | **Uploading the same picture twice keeps one copy** and the editor says so briefly. Marginal reassurance, not a control. | `content-routes-media.ts:559-561` (identical bytes skip the put), `:240` (the `reused` flag), `media-upload-outcome.ts:26` | `editors/add-an-image.md` | "Adding a picture your site already has doesn't make a second copy; it reuses the one that's there." |
| 19 | `write-in-the-editor.md:336` | Two small reassurances: the editor **warns before you navigate away from unsaved changes** ("You have unsaved changes. Leave anyway?"), and a **command palette** opens anywhere in the admin with Ctrl+K. Both marginal; the palette is one unexplained row in the in-app shortcuts sheet. | `EditPage.svelte:258-269` (the navigation guard), `editor-shortcuts.ts:19` and `:36` (the palette rides `CairnAdminShell`'s Ctrl+K) | `editors/write-in-the-editor.md` | "The editor stops you if you try to leave with unsaved changes." |

## Checked and declined

The declined list is the audit trail for the deletion. Each entry is something the old pages carry
that I read, weighed, and decided against folding.

### Declined because the old page is wrong

- **"Deleting an image never destroys its history... a developer can bring one back later"**
  (`manage-the-media-library.md:122-123`). Code-contradicted. A single delete commits the manifest
  row removal and then calls `store.delete(objectKey)` on the stored bytes
  (`content-routes-media.ts:749-750`). Only the record is recoverable in git; the picture is gone.
  The **new page is the correct one** ("Deleting removes the picture itself... Nobody can put it
  back for you afterward"). Do not fold the old reassurance; it would restore a false one.
- **"Your unsaved typing isn't kept, so reapply your changes onto the reloaded version"**
  (`publish-and-discard.md:80`) and its stronger form, "Select all of your draft and copy it
  somewhere safe... Then reload the entry" (`write-in-the-editor.md:391`). This is the known
  code-contradicted case. Every save refusal carries the draft body back to the page
  (`content-routes-core.ts:1291`, `:1300`, `:1310`, all `saveRefusal(message, body)`), so the text
  is still on screen. The new page's "Despite what this says, don't reload the page" is right, and
  is the better instruction.
- **"An id the site cannot resolve is left as plain text rather than a dead link"**
  (`authoring-syntax.md:20`). The sanitize floor admits the `cairn:` protocol so an unresolved token
  "survives the floor in its inert token form (a visible unresolved-link signal)"
  (`sanitize-schema.ts:39-42`). Not plain text. Moot for the editors track either way, since the
  save refuses a link to a missing page before it can reach a reader.

### Declined as out of the editors track's register

- The **holding branch** model in every form: `cairn/<concept>/<id>`, "the site's main line of
  content", the Save-to-branch-to-Publish mermaid diagram, "your site's deploy process picks up the
  change and rebuilds", "if you ever see the name in a log or a GitHub notification"
  (`publish-and-discard.md:18`, `:26-38`). Banned vocabulary. The new track's "Save keeps your work,
  privately / Publish makes it live" is the whole model an editor needs and the whole model that is
  true for them.
- The **markdown history essay**: Gruber 2004, Aaron Swartz, Scribe, TeX, SGML, Coombs/Renear/DeRose
  in *CACM* 1987, iA Writer, Ulysses, Bear (`editor-welcome.md:52-56`, ~400 words). Teaches nothing
  about the tool. The new track's "plain text with some light formatting marks mixed in, sometimes
  called markdown" is the whole necessary claim.
- The **Cloudflare and open-source framing**, "roughly 20% of all internet traffic", the roles
  essay, and the Posts-versus-pages essay (`editor-welcome.md:5-27`). Pitch and orientation, not
  facts about controls. The new welcome deliberately opens at the sign-in step.
- The **component catalogue**: callout, alert, icon, video, pull quote, CTA, FAQ, banner, with their
  attribute syntax (`write-in-the-editor.md:223-264`, ~40 lines). Site-defined, not cairn's; the
  starter set is the showcase's choice. The new page's "Your developer or designer sets these up" is
  correct, and it does carry the two load-bearing rules (edit inside freely, leave the `:::` lines
  alone) plus the pencil-icon form.
- **Tidy's developer half** from `enable-tidy.md`: the SDK peer dependency, the `site.config.yaml`
  block, `ANTHROPIC_API_KEY`, `cairn-doctor`, model choice, per-token pricing, the conventions
  settings screen. Developer-facing throughout. Its editor-facing facts are finds 6, 13, and 14.
- Everything in `authoring-syntax.md` about `createRenderer`, `buildLinkResolver`,
  `parseMediaToken`, `mediaToken`, the production build's throw on a dangling include, and
  `include`/`figure` as reserved directive names. Developer-facing; already carried by
  `reference/media.md` and the render docs.
- The **`media:<slug>.<hash>` token shape** and the old instruction to hand-type alt text between
  the `![]` brackets (`add-an-image.md:92-103`). Genuinely absorbed: the new track routes alt
  through the capture card and the needs-alt flag, so an editor never touches the token. The
  developer-facing codec is in `reference/media.md`.

### Declined as already covered, in the docs or in the app

- The **full keyboard-shortcut tables** (`write-in-the-editor.md:313-345`). The in-editor sheet
  (Ctrl+/) renders from `editor-shortcuts.ts`, the single source. The new page points at it and
  says the keys are never required, which is the same claim `editor-shortcuts.ts:46` makes. Copying
  the table into docs would only drift.
- **Markdown syntax tables** for bold, italic, strikethrough, inline code, headings, all three list
  kinds, quotes, rules, tables, and code fences (`write-in-the-editor.md:47-166`, ~120 lines). Every
  one is on the toolbar and in the in-app cheat sheet (`markdown-reference.ts:14-30`). Footnotes and
  escaping are the two that are in neither, and they are finds 15 and 16.
- **The `[[` typed link trigger** (`write-in-the-editor.md:136`). Real (`link-completion.ts:1`,
  `:49-51`) but already in the cheat sheet as `[[page-name]]` (`markdown-reference.ts:21`). The new
  page describes only the toolbar path, which is the path it should teach.
- **Tag slug derivation** ("Snow Report" becomes `snow-report`, by lowercasing and hyphenating)
  (`manage-your-tag-vocabulary.md:30-33`). The new page's "As you type, a short stored form of it
  appears below the field" shows the editor the answer live, which beats the rule.
- **What a retired tag leaves behind on a post mid-edit** (`manage-your-tag-vocabulary.md:60-69`).
  A genuinely narrow window: a post open with a tag checked but never saved. The new page's "Tags
  already on your posts, but not on this list" section covers the visible consequence.
- **Where-used, Replace, and Push-alt** in the media library. All three are in the new page, with
  the typed-confirmation gates and the "shown before anything is applied" review intact.
- **Share preview link**, its single showing, its expiry, and Revoke all. Covered, and better: it is
  on the new `publish-and-history.md` where the old corpus had it on a separate guide.
- **Session expiry, the sign-in rate limit, the 10-minute link, the enumeration-safe "check your
  email" message.** All in the new `welcome.md` and `when-something-goes-wrong.md`, several of them
  more precisely than the old corpus stated them.

### Declined as too small to be worth a line

- An animated GIF keeps its animation (`add-an-image.md:31`).
- The upload places a placeholder at the cursor and swaps it when the upload finishes; a failure
  leaves the draft untouched with a Retry button (`add-an-image.md:32-36`). The new error page
  covers the outcomes an editor must act on.
- The media picker adds file-kind filter chips when a library holds more than images
  (`add-an-image.md:20-21`). Site-dependent.
- The Save button disables itself when there is nothing new to store
  (`publish-and-discard.md:18`). Real (`EditPage.svelte:184-185`), but the new page already
  explains the same posture for Publish, which is the button that matters.
- "Up to five suggestions" in the spelling popover and Alt+Enter to open it
  (`write-in-the-editor.md:286`). Real (`spellcheck.ts:216`, `editor-suggestion-popover.ts:219`),
  but the count is trivia and the chord is in the in-app sheet.
- The non-blocking address-collision advisory at edit load
  (`content-routes-core.ts:998-1022`). Never blocks anything; the blocking version is quoted on the
  new page.
