# Editor copy-edit and spellcheck implementation plan

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch. This worktree was rebased onto current `main` at `0.59.0`, verified:
> `package.json` reads `0.59.0`. **Pre-flight precondition: confirm `package.json` reads `0.59.0` at
> start.** Phase 1 OPENS with a
> required worker+wasm+dictionary delivery spike (Task 1) that is a go/no-go gate: nothing else in
> Phase 1 commits until it is green and the engine is settled (`spellchecker-wasm`, else the `nspell`
> fallback). The highest-blast-radius tasks are the tidy transport/prompt (Task 11), the tidy
> diff/validate cores (Tasks 12, 13), and the tidy apply-and-review surface (Tasks 14, 15): review
> these most closely and consider `model: opus` for the dispatch. Honor the cairn conventions, the
> writing-voice standard (no em dashes, plain varied sentences, no AI-tell filler), the
> worktree-edits-target-the-worktree-path rule, and the `cairn-pass` ritual. Steps are tracked with
> checkboxes (`- [ ]`).

**Goal:** Add two cairn admin-editor features on the markdown source (cairn is not WYSIWYG): a local,
markdown-aware, dialect-aware spellcheck that is ON BY DEFAULT (a `@codemirror/lint` source backed by a
WASM dictionary on a Web Worker, with a correction quick-fix popover and a git-committed personal
dictionary), and an opt-in LLM "tidy" light copy-edit that preserves the author's voice (one Claude
call behind a Worker action, a config-driven prompt, an LCS diff, output validation, and a
focused step-in review surface where the original stays until accept).

**Architecture.** Spellcheck splits across a dedicated Web Worker (the engine plus the loaded dialect
dictionary, answering `check`/`suggest`, holding the merged dialect+site+ignore set) and a main-thread
`@codemirror/lint` source that owns the Lezer walk and is the only side that touches CodeMirror. The
**Lezer tree is the single skip authority** for node kinds (code, links, HTML, emphasis markers); a
deterministic `frontmatterSpan` helper covers the `---` fence pair the grammar does not model; and
`fenceTokens` covers directive machinery (a fence-classified range wins inside a directive). One
`frontmatterSpan` helper feeds BOTH the spellcheck skip and the tidy validator so they can never
disagree. Misspellings surface as `Diagnostic`s with quick-fix actions (suggestions, add-to-dictionary,
ignore) underlining in the locked `--cairn-warning-ink`. The personal dictionary is a git-committed
per-site file (`content/.cairn/dictionary.txt`) written through a SHA-guarded commit-and-retry action.
Tidy is a Worker admin action reusing the media transport (`text/plain` POST, CSRF in `X-Cairn-CSRF`,
`redirect: manual`, `deserialize`d ActionResult) plus abort/timeout/deadline; its system prompt is a
stable always-on core plus a CONVENTIONS section emitted from the enabled toggles only (never harmonize
to the author, never guess a style); the client computes the diff (an LCS over tokens, the sole source
of positional truth), validates the result is a proofread not a restructure, and installs it through a
`registerTidy` decoration seam. Deletions render in `--cairn-error-ink` (reserved exclusively for tidy),
the original stays in the buffer until accept, accept-all lands one batched transaction. Settings are
two-tier with a visibility gate (a read-only developer strip plus an editor convention list rendered
only when tidy is enabled and the key is present), stored in the committed site-config YAML.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes; CodeMirror 6 (`@codemirror/state` compartments,
`@codemirror/view` decorations, `@codemirror/lang-markdown` Lezer tree) plus the new `@codemirror/lint`;
a Web Worker (dynamic-import loaded, the CodeMirror way) running the spike-chosen engine
(`spellchecker-wasm` SymSpell, else `nspell`) over a static dialect dictionary asset; `@anthropic-ai/sdk`
(Worker-side only, guarded by a new `server-only-deps.test.ts`); the cairn admin dispatch
(`createContentRoutes`, `createCairnAdmin`), `validateCsrfHeader` (`sveltekit/csrf.ts`), `requireSession`
(`sveltekit/guard.ts`), `commitFiles`/`CommitConflictError` (`github/repo.ts`), `parseMediaToken`
(`media/reference.ts`), `extractMediaRefs` (`content/media-refs.ts`), `fenceScan`/`fenceTokens`
(`components/markdown-directives.ts`); the doctor checks (`doctor/checks-local.ts`); DaisyUI v5 +
`cairn-admin.css` Warm Stone tokens; Vitest (unit on node + workerd integration + real-browser
component) and Playwright (showcase E2E).

**Design brief:** `docs/internal/design/2026-06-20-editor-copyedit-design-brief.md` (authoritative for
product decisions and the corrected convention set).
**Spec:** `docs/superpowers/specs/2026-06-20-cairn-editor-copyedit-design.md` (the authoritative design;
sections referenced per task).
**Technical design:** `docs/internal/design/2026-06-20-editor-copyedit-technical-design.md`.
**Approved mockups:** the editor `docs/internal/design/2026-06-20-editor-copyedit-review-mode-rev2-mockup.html`
and the settings `docs/internal/design/2026-06-20-editor-copyedit-settings-final-mockup.html`.

**Version:** a **minor** bump (a new subsystem: spellcheck + tidy). This worktree is rebased onto current
`main` at `0.59.0` and `package.json` reads `0.59.0` (verified at the start of this pass); `0.59.0` is
published, so this pass ships as **`0.60.0`**. Spellcheck is additive and on by default (note the new
default and the `spellcheck.dialect` config); tidy is additive and opt-in (note the developer-tier flag
plus the `ANTHROPIC_API_KEY` secret). The changelog entry carries the `<!-- release-size: minor -->`
marker. New dependencies: `@codemirror/lint`, `@anthropic-ai/sdk`, and the spike-chosen spellcheck engine
plus its dictionary asset. Spellcheck changes the editor's default behavior (it replaces the native
`spellcheck` attribute), so the entry states what an upgrading site sees; tidy requires the explicit
opt-in, so no site gains it without action.

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, in this worktree (rebased onto `main` at
`0.59.0`), the main
loop reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test` exit 0, plus the
reference, signature, package, docs, readiness, prose, and version gates as each applies) between
dispatches. The build follows the spec's four-phase outline, sized into tasks for single-implementer
verifiability:

- **Phase 1 (spellcheck core), Tasks 1 through 8.** Task 1 is the go/no-go delivery spike; nothing else
  in Phase 1 commits until it is green. Tasks 2 through 8 build the lint source, the Worker, the skip
  authority, the popover, the objective-error layer, and the toggle. End to end in the browser, no
  backend, additions held in memory.
- **Phase 2 (the git-committed dictionary), Task 9.** The one phase that touches the commit pipeline, so
  it is isolated.
- **Phase 3 (tidy transport and the model call), Tasks 10 and 11.** The config, the prompt builder, the
  Worker action with abort/deadline, the doctor check, the typed failures. Returns corrected text with
  no review UI yet.
- **Phase 4 (tidy diff, validation, and apply), Tasks 12 through 15.** The diff and validate pure cores,
  the apply-and-review surface, and the two-tier settings screen. The highest-risk phase, last and most
  heavily covered.
- **Cross-cutting, Tasks 16 and 17.** The showcase E2E (spike plus two round-trips) and the docs arm
  plus the version bump plus the pass-end ritual.

Review the tidy transport/prompt (Task 11), the diff/validate cores (Tasks 12, 13), and the
apply-and-review surface (Tasks 14, 15) most closely: they carry the highest blast radius (untrusted
content, the buffer-mutating apply state machine, the proofread-not-restructure backstop). Consider
`model: opus` for those dispatches.

The features are largely independent and many tasks are pure modules, so the review gate at pass end is a
good adversarial-review-`Workflow` candidate on Geoff's opt-in.

---

## Task 1 (the go/no-go gate): the worker + wasm + dictionary delivery spike

**Spec:** 1.1 (the engine, gated on a delivery spike). **This is the Phase 1 go/no-go gate. Nothing else in
Phase 1 commits until this spike is green and the engine choice is settled.** No part of the library has ever shipped a 2MB binary
asset or constructed a Web Worker (`files[]` is `["dist","src/lib","CHANGELOG.md"]`, `spellchecker-wasm`
is absent, no `new Worker`/`?worker`/`import.meta.url` construction exists in `src/`). The editor-boundary
test guards only static `@codemirror` imports; it does not prove a Worker plus a wasm module plus a 2MB
asset survives a consumer SvelteKit/Vite build under the Cloudflare adapter.

**Files:**
- Create: a minimal spike harness in `examples/showcase` (a throwaway route or page that constructs the
  Worker, loads the engine and the dictionary, and round-trips a `check` and a `suggest`); a
  `spellcheck-worker` stub sufficient to prove delivery.
- Add: the engine dependency (`spellchecker-wasm` first) and the dictionary asset to whatever delivery
  surface the spike picks.
- Create: `docs/internal/design/2026-06-20-editor-copyedit-spike-result.md` recording the outcome.

**Behavior.** End to end in the real consumer build (`examples/showcase`, which serves `dist`, so
`npm run package` first):
- Construct the spellcheck Web Worker the dynamic-import way CodeMirror is loaded, and prove it runs
  inside the showcase build, not just a unit context.
- Resolve and load the wasm module and the 2MB dictionary through the consumer build. Record the chosen
  asset-delivery mechanism (Vite `?url`/`?worker` so the consumer build resolves the assets, OR stream
  the dictionary from a Worker route on the `createMediaRoute` pattern rather than the package `files[]`),
  and write down why.
- **Ensure the spike's Web Worker module and the wasm/dictionary asset are reachable from the PACKAGED
  `dist`, not just from `src/`.** Today `files[]` is `["dist","src/lib","CHANGELOG.md"]` with no wasm or
  worker precedent, so the spike must update the package `exports`/`files[]` to ship the worker and asset, OR
  ship the dictionary via a Worker route on the `createMediaRoute` pattern. Prove it from the consumed
  package: run `npm run package` (the showcase serves `dist`), then run the showcase. `npm run package`
  precedes every showcase run in this task.
- Confirm the 2MB dictionary inflates neither the client bundle nor the Worker past concrete numeric
  thresholds, recorded number-vs-number in the spike-result doc: the showcase Worker build stays under the
  Cloudflare adapter's compressed-size limit (1 MB on the Workers Free plan, 10 MB on Paid; target under the
  Free 1 MB gzipped so the engine ships on either plan), and the editor's client chunk grows by no more than
  a stated delta ceiling (for example +50 KB gzipped over the pre-spike editor chunk, the dictionary and wasm
  delivered as fetched assets, NOT bundled into the chunk). The spike-result doc records the measured numbers
  against these thresholds; the gate is number-vs-number, not a vibe.
- Round-trip a `check` and a `suggest` against real words to prove the protocol crosses the build
  boundary.

If `spellchecker-wasm` plus a 2MB asset does not survive the build cleanly, the engine **falls back to
`nspell` behind the same Worker protocol** (slower suggestions, smaller delivery surface); record that
decision. The engine choice is the output of this spike, not an input. The spike harness may be removed
or folded into the real Worker in Task 3 once the mechanism is locked.

**Tests (write the proof first):** a showcase E2E (or a scripted showcase run) asserting the Worker
constructs, the dictionary loads, and a `check`/`suggest` round-trips in the built showcase; a recorded
bundle/Worker size readout against the budget.

**Gate:** the spike round-trips green in the built showcase, the delivery mechanism and engine are
recorded in the spike-result doc, and the size budget holds. **This is the gate for the rest of Phase 1.**

---

## Task 2: `@codemirror/lint` and the `frontmatterSpan` helper

**Spec:** 1.4 (the lint source, the single skip authority, and the frontmatter span; the missing
`@codemirror/lint` dependency and the shared `frontmatterSpan` helper). Small and enabling; the helper is
load-bearing for both features.

**Files:**
- Modify: `package.json` (add `@codemirror/lint`, peer-compatible with the pinned `^6` line).
- Create or modify: the `frontmatterSpan` helper in `src/lib/components/markdown-directives.ts` (beside the
  fence machinery) or a small sibling module.
- Test: `src/tests/unit/frontmatter-span.test.ts`.

**Behavior.**
- Add `@codemirror/lint` and confirm it resolves (it is the surfacing layer all of spellcheck rests on).
- Export `frontmatterSpan(text: string): { from: number; to: number } | null`, a pure helper that detects
  the region between a leading `---` fence and its closing `---`, reusing the line-based fence machinery
  already in `markdown-directives.ts`. This is the **single source of the frontmatter region**, used by
  BOTH the spellcheck skip (Task 4) and the tidy validator (Task 13). Verified first-hand: the base grammar
  does not parse YAML frontmatter, so there is no Lezer frontmatter node; this helper replaces that.

**Tests (write first):** text with leading frontmatter returns the span; text without returns `null`; a
body `---` (a thematic break, not a leading fence) is NOT treated as frontmatter; an unterminated leading
`---` is handled (returns `null` or the documented bound). These fixtures are the contract both the skip and
the validator share.

**Gate:** full gate green. Internal module/dependency, no reference page.

---

## Task 3: the spellcheck Web Worker

**Spec:** 1.2 (dialect awareness), 1.3 (the Web Worker split, the Worker side). The engine host off the main
thread, using the delivery mechanism Task 1 locked.

**Files:**
- Create: `src/lib/components/spellcheck-worker.ts`.
- Modify: `package.json` if the engine dependency was not already added by the spike.
- Test: `src/tests/unit/spellcheck-worker.test.ts` (the message protocol and the merged-set logic, engine
  mocked).

**Behavior.** The Worker owns the engine instance and the loaded dialect dictionary, plus the merged set
(dialect words + the personal dictionary + the session ignore list). It answers two message kinds:
- `check`: a batch of `{ id, word }` pairs returns `{ id, correct }` for each (a viewport in one round
  trip).
- `suggest`: one word returns ranked replacements (called lazily when the popover opens).
- `addWord` and `ignoreWord` update the in-memory set so a later `correct` answer already accounts for
  added and ignored words.
The dialect dictionary URL is resolved from the per-site `spellcheck.dialect` (Task 7) at startup (a map
from one declared locale to one dictionary URL, defaulting to a sensible English locale, US). Use the
asset-delivery mechanism the spike recorded. Keep the engine seam thin so `nspell` can drop in behind the
same protocol if the spike chose it.

**Tests (write first):** a `check` batch returns the right `correct` flags against a mocked engine; a
`suggest` returns the engine's ranked list; `addWord` makes a previously-incorrect word correct;
`ignoreWord` does the same for the session; the merged-set ordering (dialect, then site, then ignore) is
respected.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 4: the spellcheck lint source and the single skip authority

**Spec:** 1.4 (the main-thread side, the Lezer tree as single skip authority, the deterministic
frontmatter span, the directive and `media:` skips). The main-thread half: the only side that touches
CodeMirror.

**Files:**
- Create: `src/lib/components/spellcheck.ts`.
- Test: `src/tests/unit/spellcheck-skip.test.ts` (the skip classification and the **combined-skip
  agreement test**).

**Behavior.** A `@codemirror/lint` `linter()` source backed by the Worker (Task 3), made markdown-aware by
the Lezer tree:
- **The Lezer tree (`syntaxTree`) is the single authority for node-kind skips.** Never spellcheck:
  `InlineCode`, `FencedCode`, `CodeText`, `CodeBlock`, indented code; `URL`, link destinations, autolinks,
  link labels, reference definitions; `HTMLTag`, `HTMLBlock`; emphasis/strong markers (the markers, not the
  prose inside them).
- The `frontmatterSpan` helper (Task 2) skips the `---` fence region (slugs, dates, keys never flagged).
- `fenceTokens` skips directive machinery (the colon runs, `{attrs}` braces, the directive name); a
  fence-classified range wins inside a directive. A `[label]`'s prose and the directive body are still
  checked.
- A bare `media:` token in text is matched via `parseMediaToken` (`media/reference.ts`) so it is never
  split into "media" plus a flagged hash; a `media:` token inside an image is already caught by the URL
  skip.
- Check the prose inside everything else (paragraphs, headings, list items, blockquotes, table cells,
  emphasis/strong spans, image alt text, a link's visible text). Word extraction uses a Unicode-aware
  boundary that keeps intra-word apostrophes and hyphens, lowercases for lookup, and records each word's
  absolute range. Skip words under three characters, pure numbers, and all-caps tokens.
- Run over `view.visibleRanges` plus a margin, not the whole document. Post words to the Worker keyed by a
  monotonic latest-wins counter (the media-preview settling pattern) so an old check is dropped when a
  newer one lands.

**Tests (write first):** the skip classification over a fixture returns exactly the prose spans (code,
links, HTML, frontmatter, directive machinery, and a bare `media:` token all skipped; the body prose,
emphasis prose, alt text, and a `[label]`'s prose all kept). The **combined-skip agreement test** runs over
one fixture containing a `:::figure`, a `media:` token, frontmatter, and a code fence and asserts the three
skip mechanisms (the Lezer tree, `frontmatterSpan`, `fenceTokens`) never disagree at a boundary, the
machinery is skipped, and the body prose is kept. The latest-wins counter drops a stale check.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 5: the correction popover and the locked underline token

**Spec:** 1.5 (the correction popover: quick-fix actions, the `--cairn-warning-ink` lock, a11y). The
correction UX, for free from lint actions.

**Files:**
- Modify: `src/lib/components/spellcheck.ts` (build the `Diagnostic`s and their `actions`).
- Modify: `src/lib/components/MarkdownEditor.svelte` if the lint tooltip needs an `EditorView.theme` block
  for the Warm Stone tokens (beside the media/fold theme).
- Test: extend `src/tests/unit/spellcheck-skip.test.ts` or add a small diagnostic-building unit test;
  the rendered popover is proven in the component test (Task 8).

**Behavior.** Each misspelling becomes a `Diagnostic` with `severity: 'info'` (a quiet underline), a
message naming the word, and an `actions` array CodeMirror renders as tooltip buttons (no custom popover):
- Up to five ranked suggestions, each `apply` dispatching one replace transaction over the word's range,
  from a lazy `suggest` call.
- **Add to dictionary** posts `addWord` to the Worker (the underline clears at once), appends to the
  pending-additions set (Task 9 commits it), and re-lints so every instance clears.
- **Ignore** posts `ignoreWord` for the session only, never persisted, and re-lints.
- **The underline token is locked to `--cairn-warning-ink`** (a muted amber, the closest shipped token;
  there is no `--cairn-info-ink`). `--cairn-error-ink` red is reserved exclusively for tidy deletions, so a
  spellcheck underline and a tidy deletion are never the same color. Diagnostics are keyboard-reachable via
  CodeMirror's built-in lint commands, the actions are real focusable buttons, and the underline is never
  the only signal (the message carries the word and suggestions in text).

**Tests (write first, unit-testable parts):** a misspelled word produces a `Diagnostic` whose actions are
the suggestions plus add plus ignore in order; the diagnostic carries `severity: 'info'` and the word in
its message. (The amber underline and the rendered tooltip are asserted in the Task 8 component test.)

**Gate:** full gate green.

---

## Task 6: the objective-error layer (no style linter)

**Spec:** 1.7 (the objective-error layer: the deterministic doubled-word, double-space, repeated-punct
checks; no style/opinion linter, decision 2). A second lint source on the same mechanism, no Worker.

**Files:**
- Create: `src/lib/components/objective-errors.ts` (pure checks).
- Modify: `src/lib/components/spellcheck.ts` (run the objective source over the same extracted prose spans).
- Test: `src/tests/unit/objective-errors.test.ts`.

**Behavior.** A deterministic lint source over the **same prose spans the spellcheck source extracted** (so
a doubled word inside a code fence is never flagged):
- Doubled words ("the the", "and and", across a space or a line break); the fix deletes the second.
- Double (or more) spaces inside a line, not leading indentation; the fix collapses to one. (This is a
  same-line double-space error, distinct from sentence spacing, which the tidy convention set drops because
  it collapses in the markdown-to-HTML render.)
- Stray repeated punctuation ("!!", "??", ",,") where it is plainly an error; the fix collapses to one. The
  most judgment-laden, so it is conservative: an ellipsis is left alone and a run is flagged only past a
  clear threshold.
These underline in the same locked `--cairn-warning-ink` (an editor reads them as one "spellcheck"
surface). Three well-tested regexes over the already-extracted spans, NOT the `retext` pipeline (it stays
out of the client; it remains the right tool for a future CI-side prose check). **There is no style or
opinion linter** (the `retext` passive/simplify/equality/readability plugins are never enabled).

**Tests (write first):** doubled words across a space and a line break flag and the fix deletes the second;
a double space flags and collapses, but leading indentation does not; "!!" flags but "..." does not; a
doubled word inside a code-span input (already excluded from the prose spans) is never seen.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 7: the `spellcheck.dialect` config field and the footer toggle

**Spec:** 1.2 (the per-site dialect), 1.8 (the on/off toggle: the per-editor on/off; remove the native
text-correction attributes). Wires the spellcheck into config and the editor shell.

**Files:**
- Modify: `src/lib/nav/site-config.ts` (the committed-YAML `SiteConfig` schema gains a
  `spellcheck?: { dialect?: string }` field; this is the ONE config home, not the TS `CairnAdapter`).
- Modify: `src/lib/components/MarkdownEditor.svelte` (install the lint source in its own compartment; the
  footer `localStorage`-backed `aria-pressed` toggle `cairn-editor-spellcheck`, defaulting on; **remove all
  three native text-correction attributes from `EditorView.contentAttributes`: `spellcheck`, `autocorrect`,
  and `autocapitalize`**).
- Modify: wherever the dialect is read and handed to the Worker loader (the edit load that already hands
  `mediaLibrary` to the editor as a prop, `content-routes.ts`).
- Test: `src/tests/unit/content-routes.test.ts` or the site-config test (the dialect default); the
  toggle and the attribute removal are proven in the Task 8 component test.

**Behavior.**
- Add `spellcheck.dialect` to the committed site config, defaulting to a sensible English locale (US). The
  Worker's dictionary loader resolves the dictionary URL from it at startup, so a British site loads the
  British word list and "colour" is correct, never flagged. The dialect is declared once per site, not a
  per-word or per-editor choice, and tidy never normalizes regional spelling regardless of it.
- Spellcheck defaults on. The toggle lives in the footer environment strip, a `localStorage`-backed
  `aria-pressed` toggle in the same check-and-tint grammar as focus mode and zen. When off, the lint
  compartment reconfigures to empty, the underlines vanish, and the Worker stays idle. The objective-error
  layer follows the same toggle.
- **Remove all three native text-correction attributes** the editor currently sets on
  `contentAttributes`: `spellcheck` (the lint source replaces it; running both double-underlines),
  `autocorrect`, and `autocapitalize`. The latter two come off for token preservation: a browser autocorrect
  or autocapitalization could silently rewrite a `media:` token, a directive name, or frontmatter, so the
  surface must keep the author's exact bytes. This is the call, not a deferral.

**Tests (write first, unit parts):** the config default resolves to the documented locale; an explicit
dialect threads to the loader input. (The footer toggle, the empty-on-off compartment, and the absent
native attribute are asserted in Task 8.)

**Gate:** full gate green. If `spellcheck.dialect` is exposed in a documented config surface, update the
relevant reference and keep `check:reference` green.

---

## Task 8: spellcheck component coverage and lint-layer co-existence

**Spec:** Testing, the **Component (Playwright/Chromium)** layer (the lint co-existence test, synthesis
TD-1). The real-browser proof of the Phase 1 surface.

**Files:**
- Create: `src/tests/component/spellcheck.test.ts` (or extend the existing editor component test).
- Test target: `MarkdownEditor.svelte` mounted with spellcheck on.

**Behavior (real browser).** Mount the editor with spellcheck on (the Worker stubbed or running against a
small fixture dictionary) and assert:
- Underlines appear in `--cairn-warning-ink` on a misspelled word and NOT on a code span or a `media:`
  token.
- A suggestion action replaces the word with one transaction.
- Add to dictionary clears every instance of the word.
- The footer toggle off reconfigures the lint compartment to empty (underlines vanish) and on restores
  them; the native `spellcheck` content attribute is absent.
- **The lint-layer co-existence test** mounts the `@codemirror/lint` layer alongside the media
  `atomicRanges` and the highlight layer and proves the three decoration layers co-exist (synthesis TD-1).

**Tests:** the assertions above pass in the real browser using the existing component stubs for
`$app/forms`/`$app/state`.

**Gate:** full gate green (component project included).

---

## Task 9: the git-committed personal dictionary (Phase 2)

**Spec:** 1.6 (the personal dictionary: the layered store, the `?/addDictionaryWord` action, SHA-guarded
commit-and-retry). The one phase that touches the commit pipeline, so it is isolated.

**Files:**
- Create: `src/lib/content/site-dictionary.ts` (pure read/merge/insert-sorted).
- Modify: `src/lib/sveltekit/content-routes.ts` (`addDictionaryWord` action; `editLoad`/the edit load reads
  the file and hands it to the editor as a prop, the way `mediaLibrary` is handed in).
- Modify: `src/lib/sveltekit/cairn-admin.ts` (register `addDictionaryWord` on the actions record via
  `viewAction`).
- Modify: `src/lib/components/MarkdownEditor.svelte`/the host (the pending-additions set, the commit on a
  debounce or at save, the reconcile of the merged response).
- Test: `src/tests/unit/site-dictionary.test.ts` (pure); `src/tests/unit/content-routes-dictionary.test.ts`
  (the action over a GithubDouble); `src/tests/unit/cairn-admin-actions.test.ts` (the routing, extend).

**Behavior.**
- The three layers, checked in order: the dialect dictionary (read-only); the site dictionary file at
  `content/.cairn/dictionary.txt` (one word per line, sorted, comment lines allowed), read at editor load
  and handed in as a prop; the session ignore list (in memory only).
- The write path follows the preview-and-commit idiom: add-to-dictionary already added the word to the
  Worker's set in Task 5 (the underline cleared at once); record it in a pending-additions set and commit
  on a debounce or at save time. An add that fails to commit stays in the local set for the session,
  surfaces quietly, and re-attempts on the next save; the word is never silently dropped.
- `?/addDictionaryWord` reuses the media transport exactly: a `text/plain` POST with the CSRF token in
  `X-Cairn-CSRF`, validated with `validateCsrfHeader`, the body a small JSON `{ word }` or `{ words }`. It
  reads the current file from the default branch, inserts in sorted order if absent (idempotent, so two
  editors adding the same word collapse), and commits through the GitHub-App pipeline. **The commit is
  SHA-guarded with commit-and-retry**, reusing the `CommitConflictError` pattern in `github/repo.ts`: on a
  stale-SHA 409 it re-reads at the new head, re-merges the pending additions (the sorted insert is
  order-independent), and retries once. The optimistic local set stays regardless. The response is the
  merged word list (or a `fail` envelope) so the client reconciles its pending set.

**Tests (write first):** the pure `site-dictionary` read/merge/insert-sorted (an idempotent add, comment-line
tolerance, and the re-merge step of the retry producing the same sorted set); the action does
read-modify-write over a stub backend, the idempotent insert, and the SHA-guarded retry on a simulated
stale-SHA conflict; the action 404s outside the editor view and reaches the content action on it.

**Gate:** full gate green, including the reference/signature gates if `addDictionaryWord` is documented in
`sveltekit.md` this task (otherwise it lands with Task 17's docs arm).

---

## Task 10: the tidy config, the prompt builder, and the doctor check (Phase 3)

**Spec:** 2.2, 2.3, 2.3.1, 2.3.2, 2.8, "The corrected convention set" (the config shape, `buildTidyPrompt`,
the convention toggles, the doctor check). The pure prompt contract plus the config, before the Worker call.

**Files:**
- Modify: `src/lib/nav/site-config.ts` (the committed-YAML `SiteConfig` schema gains a
  `tidy?: { enabled?: boolean; model?: string; conventions?: {...} }` block; the `conventions` shape covers
  the corrected set; this is the ONE config home, the same type Task 7's `spellcheck.dialect` lives on, not
  the TS `CairnAdapter`).
- Create: a `buildTidyPrompt(conventions)` builder beside the action (e.g. `src/lib/sveltekit/tidy-prompt.ts`
  or a `content-routes` sibling), the stable always-on core plus the config-built CONVENTIONS section.
- Modify: `src/lib/doctor/checks-local.ts` (a config-presence check: when `tidy.enabled` is true, warn if
  `ANTHROPIC_API_KEY` appears neither as a wrangler `var` nor in `.dev.vars`, framed as "verify the secret
  is configured").
- Test: `src/tests/unit/tidy-prompt.test.ts` (the config-driven, never-harmonize behavior);
  `src/tests/unit/doctor-checks.test.ts` (the new check, extend).

**Behavior.**
- The `tidy` config block carries `enabled` (default false), `model` (default `claude-sonnet-4-6`,
  alternative `claude-haiku-4-5`), and a `conventions` block of per-convention toggles plus variants. The
  corrected set: objective fixes (default ON), the style tier (default OFF, multi-position where the spec
  says so: Oxford comma three-position, number style multi-position with exception sets, measurements,
  percent, em-dash, en-dash, ellipsis, time format), and the advanced tier (default OFF: smart quotes with
  the full apostrophe rule set, brand-caps a curated list). Sentence spacing is dropped; regional spelling is
  a locale property, not a toggle.
- `buildTidyPrompt(conventions)` follows poplar's `BuildPrompt` model: a stable always-on core (the
  guardrails, the in/out boundary, the markdown and token rules, the injection framing, the OUTPUT
  contract, verbatim from spec 2.3.1) that never changes per request, plus a CONVENTIONS section that emits
  ONE rule line per enabled convention and nothing for a disabled one. The emitted line carries the chosen
  variant and, for multi-position toggles, the faithful contextual position (the AP complex-only Oxford
  rule, the number exception sets, the apostrophe rule set, per spec 2.3.2). With nothing enabled the
  section is omitted. **tidy never harmonizes to the author and never guesses a style**; an undeclared style
  is the author's choice (stated explicitly in the prompt). This is the single largest design correction in
  the pass.
- The doctor check is a config-presence heuristic, NOT a definitive unset claim: a Worker secret is not in
  the committed wrangler config and not in anything the doctor can `readFile`, so the doctor cannot prove it
  is unset. When `tidy.enabled` is true the check warns if `ANTHROPIC_API_KEY` appears neither as a wrangler
  `var` nor in `.dev.vars` (the two places the doctor reads), framed as "verify the secret is configured".
  It pairs with the runtime `fail(503)` path (Task 11's call-time check) and an optional `--probe` live check
  that actually exercises the key. This is the engineering half of the truthful first-run surface; the
  settings suppression in Task 15 is the UX half. Reuse the existing condition family in `checks-local.ts` so
  the readiness count holds.

**Tests (write first):** `buildTidyPrompt` fixtures asserting a disabled convention emits no line, an
enabled one emits its variant line, the always-on core is present regardless, and the CONVENTIONS section
is omitted when nothing is enabled (this locks the config-driven, never-harmonize behavior); the
prompt-contract `{ input, mustNotChange, shouldFix }` cases as recorded fixtures (keep "colour", keep
"utilize", keep "fifteen" and "15" coexisting when number style is off, fix "their" to "there" only when
wrong, leave a deliberate fragment, never touch a `media:` token). Add `mustNotChange` fixtures for the
consistency classes currently unguarded, each shaped like the "fifteen and 15 may coexist" case, so no
surviving usage-count harmonization passes: with no convention enabled, "trail head" stays unchanged when
"trailhead" appears elsewhere in the input; "email" and "e-mail" keep coexisting; and a term capitalized two
ways stays unchanged when it is not on the brand-caps curated list. The doctor test asserts the
config-presence heuristic: with `tidy.enabled` true and `ANTHROPIC_API_KEY` absent from both a wrangler
`var` and `.dev.vars`, the check warns; with the key present in either, it stays silent.

**Gate:** full gate green. If the `tidy` config or the doctor check is documented this task, keep the
reference and readiness gates green (otherwise they ride Task 17).

---

## Task 11 (review closely): the tidy Worker action with abort, timeout, and deadline

**Spec:** 2.1, 2.2, 2.7, 2.8 (developer tier), 2.9. The remote call: untrusted content, the highest blast
radius on the server side. **Consider `model: opus`.**

**Files:**
- Modify: `package.json` (add `@anthropic-ai/sdk` as a Worker-side-only dependency).
- Modify: `src/lib/sveltekit/content-routes.ts` (`tidyAction` beside `mediaReplacePreview`; the typed
  failure shapes added to the `ContentFormFailure` union and re-exported as needed).
- Modify: `src/lib/sveltekit/cairn-admin.ts` (register `tidy` via `viewAction` matching the editor view;
  the component posts to `?/tidy`).
- Modify: `src/lib/sveltekit/index.ts` (re-export any new failure type that earns a reference row).
- Test: `src/tests/integration/content-routes-tidy.test.ts` (workerd pool, the Anthropic call mocked);
  a NEW, separately-named guard test `src/tests/unit/server-only-deps.test.ts` ("server-only deps stay off
  the client") that scans the `.svelte` components and the modules they statically import and asserts
  `@anthropic-ai/sdk` never appears in client-reachable code. (Do NOT reuse `editor-boundary.test.ts`: it
  guards the OPPOSITE direction, keeping client deps such as CodeMirror and DOMPurify out of server code, so
  it cannot guard a server-only dep.)

**Behavior.** `tidyAction` reuses the media transport (`text/plain` POST `?/tidy` carrying `{ text, scope }`,
CSRF in `X-Cairn-CSRF`, `redirect: 'manual'`, `deserialize`d response), with abort/timeout/deadline the
media calls did not need:
- Run `validateCsrfHeader` first, then `requireSession`.
- Read the API key and the `tidy` config through `event.platform?.env` and the site config. Refuse
  `fail(503)` (a clear reason) if disabled or the key is missing, BEFORE any model call. This is the
  fail-fast posture and the engineering half of the first-run surface.
- Bound the input; refuse `fail(413)` (a "tidy a selection instead" message) if too large, before the call.
- Build the system prompt via `buildTidyPrompt` (Task 10) and call `client.messages.create` with `model`
  from the setting, the system prompt, the author's text as the user message, a generous `max_tokens` sized
  to comfortably exceed the input token count, and adaptive thinking at its default. Read output as plain
  text.
- **Bound the Anthropic call with `AbortSignal.timeout(ms)` (or the SDK's request-timeout option) set
  shorter than the platform limit, catch the resulting abort inside the action, and return the retryable
  `fail(502)`** so a slow call becomes a clean "try again" rather than a platform timeout. The integration
  test stubs the model call to exceed the timer and asserts `fail(502)`.
- Return `{ corrected, model, usage }` as the success data, or a typed `fail(status, ...)` for every failure
  mode (spec 2.7): session-expired (the manual-redirect 303 surfaces as status-0), CSRF `fail(403)`,
  disabled/no-key `fail(503)`, too-large `fail(413)`, hang/timeout/abort `fail(502)`, model error
  `fail(502)`, refusal `fail(422)`. The action **never commits anything**; it is a pure transform request,
  so a failed tidy cannot corrupt the entry. The diff is computed on the client (Task 12), so the server
  stays a thin model-call boundary.
- The client `AbortController` (Cancel button) plus a bounded client timeout are wired in Task 14; this task
  must accept an aborted request cleanly. `@anthropic-ai/sdk` is imported only here, guarded by the new
  `server-only-deps.test.ts`.

**Tests (write first, workerd pool, Anthropic mocked):** a stub `messages.create` returning a canned
corrected string proves the success envelope shape `{ corrected, model, usage }`; CSRF-first refusal;
session refusal; the disabled/missing-key `fail(503)`; the too-large `fail(413)`; the deadline overrun
mapping to `fail(502)`; a stubbed API error to `fail(502)`; a stubbed refusal to `fail(422)`. The new
`server-only-deps.test.ts` asserts `@anthropic-ai/sdk` is not reachable from client code.

**Gate:** full gate green, including the reference/signature/package gates for any new exported failure
type (its `sveltekit.md` row).

---

## Task 12 (review closely): the tidy diff (an LCS over tokens)

**Spec:** 2.4 (poplar's `DiffRanges` model; the sole source of positional truth). A pure module; the
foundation of the review surface. **Consider `model: opus`.**

**Files:**
- Create: `src/lib/components/tidy-diff.ts`.
- Test: `src/tests/unit/tidy-diff.test.ts`.

**Behavior.** A Longest Common Subsequence diff over tokens, a small pure module, not a diff library:
- `diffTokens(original, corrected): DiffRange[]` tokenizes both strings into words plus the whitespace and
  punctuation between them, runs the LCS, and emits runs of `equal`, `inserted`, and `deleted`. Word-token
  granularity (not character) so a one-letter fix like "it's" to "its" reads as a whole-word replacement.
- Group adjacent insert and delete runs into **changes** (a deletion, an insertion, or a deletion
  immediately followed by an insertion that reads as a replacement), each carrying its original range, its
  replacement text, and a stable index. Changes are the unit the review UI accepts and rejects. The diff is
  computed against the original captured at request time; tidy is single-author and on-demand, so no
  rebasing, no three-way merge.
- **All positions and line references are computed locally from this diff against the captured original,
  never taken from the model.** The model returns only the corrected string; cairn owns every range,
  offset, and line label. This is a load-bearing constraint: this module is the sole source of positional
  truth for the review surface.

**Tests (write first):** fixtures for a one-word replacement, an insertion-only edit, a deletion-only edit,
adjacent changes grouping into one change, and a no-op (identical input yields no changes); plus a fixture
asserting every line ref and position is derived from the diff, not from any supplied count.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 13 (review closely): the tidy output validation (proofread, not restructure)

**Spec:** 2.6, 2.3.3 (the structure/frontmatter/token/code checks, the length-aware divergence backstop).
A pure module; the safety backstop against a rewrite or a successful injection. **Consider `model: opus`.**

**Files:**
- Create: `src/lib/components/tidy-validate.ts`.
- Test: `src/tests/unit/tidy-validate.test.ts`.

**Behavior.** `tidy-validate.ts` takes `(original, corrected)` and returns either the validated change set or
a typed rejection reason. A failed result is discarded with an honest message and the document is untouched.
The layers:
- **Structure preserved.** Run `fenceScan` over both and require the same sequence of directive openers and
  closers at the same depths; compare the count and level of ATX headings and the count of fenced code
  blocks. An added, removed, or relevelled heading or a changed directive structure is rejected.
- **Frontmatter byte-for-byte, via the shared `frontmatterSpan` helper** (Task 2). Compute the frontmatter
  region of both with the SAME helper the spellcheck skip uses and require them byte-for-byte equal. One
  helper feeds both, so they can never disagree.
- **Tokens intact.** Run `extractMediaRefs` (`content/media-refs.ts`) over both and require the exact same
  multiset of media hashes. An altered, dropped, or invented hash is rejected.
- **Code untouched.** Extract every code span and fenced block from both and require them identical.
- **Divergence bounded, length-aware, as a rewrite/injection backstop ONLY** (explicitly not a voice
  safeguard; the config-driven prompt protects voice). Reject a result whose changed amount exceeds a
  length-aware bound: an absolute floor (allow N changed tokens regardless of fraction, so a legitimate
  heavy proofread of a short input is not penalized) combined with the fraction for long inputs. The
  structure, token, and code checks stay exact and are the real structural backstop.
A rejection maps to the honest author-facing message ("Tidy returned a result that changed more than the
wording, so it was discarded. Your text is unchanged."), never a silent drop.

**Tests (write first), adversarial fixtures:** a broken media token rejects; an added or relevelled heading
rejects; an edit inside a code fence rejects; rewritten frontmatter rejects; a divergence past the
length-aware bound rejects; a SHORT input that is a legitimate heavy proofread PASSES (proving the absolute
floor); a clean proofread passes.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 14 (review closely): the `registerTidy` apply seam and the review surface

**Spec:** 2.5, 2.7 (edge states), 2.9. **This is where the brief puts most of tidy's design risk: the
buffer-mutating apply state machine and the review UX.** Follow the approved rev.2 mockup. **Consider
`model: opus`.**

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (a new `registerTidy` prop/seam, a tidy state field
  plus a decoration plugin in its own compartment, beside the media and fold decorations; disable the
  formatting/insert toolbar controls in tidy mode the way Preview does).
- Create: the review-surface component/logic (a native `<dialog>` review mode, e.g.
  `src/lib/components/TidyReview.svelte`, plus the host wiring that drives the `AbortController`).
- Test: extend the editor component test or create `src/tests/component/tidy-review.test.ts` (real browser,
  the action stubbed with a canned change set).

**Behavior (follow `2026-06-20-editor-copyedit-review-mode-rev2-mockup.html`).**
- **The author's original stays in the buffer until they accept.** The mechanism is a CodeMirror state field
  plus decorations in its own compartment (entering/leaving tidy is a reconfigure, not a rebuild). The state
  field holds the change list and which are still pending. Insertions render as mark decorations showing the
  new text in **`--color-positive-ink`, the locked insertion-and-addition token** (note it is
  `--color-positive-ink`, NOT `--cairn-positive-ink`, which does not exist), plus a non-color marker; the
  inserted text is decoration content, not buffer text. Deletions render as widget/strike-through decorations
  over the original run using **`--cairn-error-ink`, reserved exclusively for tidy deletions**, so the
  insertion green and the deletion red are a locked pair and the author sees exactly what tidy wants to
  remove (the safety contract).
- The decorations are driven through the new `registerTidy` seam (mirroring `registerImagePlaceholders`):
  the host hands the editor the change set and gets back an api with accept-one, reject-one, accept-all
  (accept-fixes), and reject-all.
- **Accept applies in one batched transaction.** Accept-fixes collects every kept change into a single
  `view.dispatch({ changes })`, one undoable step and one history entry. Per-change accept dispatches that
  change's replacement over its range and removes it from the pending set; reject drops it, leaving the
  original untouched. Reject-all leaves the document exactly as it was.
- The chosen review surface is the focused step-in review mode, a native `<dialog>` opened with
  `showModal()` (the focus trap, Escape, and inert background from the platform, matching the shipped Dialog
  recipe). The diff is a git-style idiom with gutter-marked `+`/`-` rows carrying glyph and color and
  strike/underline together (never hue alone). Its grafts:
  - **The safety-ranked split (decision 9).** Objective hunks (Spelling, Doubled word, Whitespace) read
    quiet, come pre-kept, and are swept by Accept-fixes. Judgment hunks (a declared normalization, a grammar
    fix that reworded) carry the distinct review-this treatment (a warning-ink left edge and a faint warm
    wash), default to undecided, and are NOT swept by Accept-fixes until confirmed each.
  - **The local category taxonomy, safety-ranked**, inferred from the diff, never a model claim (a
    single-token punctuation/whitespace diff is a typo, a repeated word is doubled, a usage count drives a
    normalization).
  - **The mandatory local because-line for every normalization/consistency hunk**, computed as pure string
    work over the buffer (count the author's own usage, or name the owner's setting), no model round trip. A
    normalization hunk that cannot show a locally-computed rationale is not offered at all.
  - **The two-region live model** (the MediaPicker discipline): one `role="status"` region for the running
    tally (kept / to-review / skipping), updated only on bulk actions and debounced, plus a second
    `aria-live="polite"` region narrating the single last action.
  - **Keyboard step-through**: `j`/`k` (or `n`/`p`) to move, `a`/`r` to accept/reject the focused hunk, `A`
    to accept all objective hunks, Escape to cancel.
  - **Context rows plus scroll-to-locus**: one unchanged context row above and below each hunk; the line-ref
    is a real "show in text" affordance that scrolls the editor underneath, dimmed (never blurred to
    unreadable).
- The genuine edge states all carry: a no-op shows a quiet "Nothing to fix" and never opens an empty review;
  the working state is cancelable and wired to the real abort (Task 11's `AbortController` plus the bounded
  timeout); a session-level "Undo tidy" is surfaced right after Apply (ordinary editor Undo covers it
  mechanically; the graft names it), dismissed on the next edit.
- **Scope is whole-document and selection.** Whole-document tidies the body; a selection tidies the selected
  range (`registerGetSelection` already exposes it), the action receives only the selected text plus a scope
  flag, the diff is computed against that text, and the changes' ranges are offset back into the full
  document. Because the prompt never harmonizes, a selection tidy is just the objective fixes plus the
  configured normalizations over the selected text.

**Tests (real browser, the action stubbed with a canned change set):** insertions render as additions and
deletions render struck-through in `--cairn-error-ink`; the original stays until accept; per-change reject
leaves the original; Accept-fixes writes in one undoable step and sweeps ONLY objective hunks (a judgment
hunk stays undecided); the two live regions behave (tally on bulk only, last-action narration on each
toggle); keyboard step-through moves and accepts/rejects; Cancel aborts; a no-op shows "Nothing to fix" and
opens no review; a validation rejection (a canned over-divergent result) shows the honest message and
dispatches no transaction.

**Gate:** full gate green (component project included).

---

## Task 15 (review closely): the two-tier settings screen

**Spec:** 2.8, decisions 6/9/10/11/12, "The corrected convention set". Follow the approved settings mockup.
The visibility gate must be truthful. **Consider `model: opus` for the gate logic.**

**Files:**
- Create: the settings component (e.g. `src/lib/components/CairnTidySettings.svelte`) and its load/save
  wiring in `content-routes.ts`. The save targets the SAME committed-YAML `SiteConfig` type Tasks 7 and 10
  use (`src/lib/nav/site-config.ts`), via the `createNavRoutes` read-modify-commit precedent in
  `src/lib/sveltekit/nav-routes.ts`: `parseSiteConfig`, validate, `commitFile` the document edited with the
  `setMenu`/`parseDocument` machinery in `src/lib/nav/site-config.ts`, and handle a stale-SHA `isConflict`.
  The load surfaces the developer-tier facts read-only and the editor-tier `tidy.conventions` config.
- Modify: `src/lib/sveltekit/cairn-admin.ts` (register the settings save action and, if a new view, the
  settings view).
- Modify: `src/lib/nav/site-config.ts` only if the settings surface needs a config shape not added in
  Task 10 (the ONE config home, never the TS `CairnAdapter`).
- Test: `src/tests/component/tidy-settings.test.ts` (real browser); the save action in
  `src/tests/unit/content-routes-settings.test.ts`.

**Behavior (follow `2026-06-20-editor-copyedit-settings-final-mockup.html`).**
- **Two tiers with a visibility gate.** The developer tier (the master switch, the API key, the model) is
  shown **read-only**: an editor sees that tidy is enabled, a key is configured, and which model runs, but
  cannot edit any of it; the literal deploy-time tokens (the secret name, the config key) go into a
  clearly-marked "For your developer" sub-block. **The model is read-only (decision 10)** (cost is an ops
  decision that travels with the key).
- The editor tier (the per-convention config) is **rendered ONLY when tidy is enabled and the key is
  present**. When tidy is not enabled, the whole editor section is **absent** (not shown disabled), replaced
  by an honest `role="region"`-labelled gate note with a read-only "what your developer needs to do"
  checklist and a "spellcheck still works" reassurance, with no teasing disabled controls in the tab order;
  the editor-side tidy toolbar control is not rendered at all.
- Each convention is the **shipped check-and-tint `aria-pressed` button (decision 11)** (no new DaisyUI
  `.toggle`); the variant choosers are the **shipped pick-one recipe** (`role="radiogroup"` over
  `role="radio"` with `aria-checked`, roving tabindex, the check glyph as the non-color cue, reusing the
  CairnMediaLibrary triage handler, never `aria-pressed` for a pick-one).
- The resting state IS the safe default: Fixes on, Style off, every variant collapsed, zero decisions asked.
  The grafted affordances: a generated plain-language summary line in a `role="status"` region (always true,
  generated from the live config); the review surface's diff vocabulary for an on-state example; at least
  one "kept as written" example (regional spelling, never normalized) in the Fixes section; a non-interactive
  "Not here yet" note naming the two deferred conventions (freeform custom instructions, heading
  capitalization) and the one-line reason both reach into voice; per-section "turn all on/off" masters and a
  quiet "reset to safe default (typos only)" control (never named a house style); an always-present
  `role="status"`/`aria-live="polite"` region carrying each section count and the summary, with
  per-keystroke variant examples `aria-hidden` so the region is not chatty.
- **Storage (decision 12): the existing committed-YAML `SiteConfig`, the ONE config home.** The save commits
  the `tidy.conventions` block (and any editor-tier field) as a block in the same site-config file Tasks 7
  and 10 use, through the GitHub-App pipeline (the `createNavRoutes` precedent), diffable and shared across
  editors. The `tidy` block is NOT a separate file under `src/content/.cairn/` (that fork is resolved here in
  favor of one config home); the save-note copy names the site-config file.

**Tests:** when tidy is disabled, the editor section and the tidy toolbar control are absent (not disabled),
the gate note renders, and no convention control is in the tab order; when enabled-with-key, the convention
list renders with check-and-tint toggles and radiogroup variant choosers; toggling a convention updates the
summary `role="status"` region; the "reset to safe default" control returns the safe resting state; the save
action commits the conventions block (over a GithubDouble) and 404s outside the settings view.

**Gate:** full gate green (component project included), plus the reference/signature gates for any new
exported settings action or type.

---

## Task 16: the showcase E2E (the spike round-trip plus the two feature round-trips)

**Spec:** Testing, the **Showcase E2E (Playwright)** layer. Prove the surfaces in a real browser against
the showcase.

**Files:**
- Modify: the showcase config/seed (`examples/showcase`) so the dialect dictionary loads (the spike's
  mechanism), a known-misspelled entry exists, and the tidy action is backed by a deterministic stubbed
  model response (the way the media E2E uses fixed bytes); the `tidy` config is enabled in the showcase with
  a stub key path so the editor tier renders.
- Create: `examples/showcase/e2e/spellcheck.spec.ts` and `examples/showcase/e2e/tidy.spec.ts`.

**Behavior.**
- The Phase 1 delivery spike (Task 1) is re-proven here as a standing E2E: the Worker constructs, the
  dictionary loads, and a `check`/`suggest` round-trips in the built showcase.
- `spellcheck.spec.ts`: open an entry, type a misspelling, see the underline (amber), apply a suggestion,
  and add a word to the dictionary (the underline clears).
- `tidy.spec.ts` (a deterministic stubbed model response): open an entry with a known error, run tidy, see
  the diff in the review dialog, accept, and confirm the corrected text saved.

**Tests:** the new specs pass in the real browser; the existing media and editor E2E specs stay green.
Rebuild `dist` (`npm run package`) before the showcase E2E (the showcase serves `dist`), and confirm the
spellcheck Worker module and the wasm/dictionary asset are reachable from the packaged `dist` (the
`exports`/`files[]` update or the Worker route Task 1 locked), so the standing spellcheck E2E exercises the
delivered package, not the `src/` tree.

**Gate:** full gate green, showcase E2E green.

---

## Task 17: docs, the version bump, and the pass-end ritual

**Spec:** "Documentation impact" (spec section near the end); the version policy.

**Files:**
- Modify: `docs/guides/` (an editor guide for using spellcheck, the personal dictionary, and running tidy
  with its review; a developer-tier setup guide for enabling tidy, the `ANTHROPIC_API_KEY` secret, the model
  choice, and the `spellcheck.dialect` and `tidy.conventions` config).
- Modify: `docs/reference/sveltekit.md` (`tidyAction` and `addDictionaryWord`, their request shapes and
  `fail` payloads).
- Modify: `docs/explanation/` (how tidy preserves voice via the config-driven prompt and the no-house-voice
  stance, the copyedit-mechanics tier; how spellcheck stays local and markdown-aware; why the durable record
  is git for both).
- Modify: `docs/reference/log-events.md` (any tidy/dictionary log events the actions emit).
- Modify: `docs/reference/doctor.md` (the same reference file the existing config/bindings checks are
  documented in): the new config-presence check that verifies the `ANTHROPIC_API_KEY` secret is configured
  when `tidy.enabled` is true, so `check:reference` has a concrete target.
- Modify: `docs/internal/admin-design-system.md` (the tidy review-mode recipe: the native-dialog step-in
  diff, the safety-ranked hunk treatment, the diff run vocabulary; confirm the settings screen reuses the
  shipped check-and-tint button and radiogroup pick-one, no new primitive).
- Modify: `CHANGELOG.md` and `docs/guides/upgrade-cairn.md` (a `0.60.0` entry with the
  `<!-- release-size: minor -->` marker; spellcheck additive and on by default, note the new default and
  `spellcheck.dialect`; tidy additive and opt-in, note the developer-tier flag plus secret; the new
  dependencies `@codemirror/lint`, `@anthropic-ai/sdk`, and the spike-chosen engine plus dictionary asset).
- Modify: `package.json` (version `0.60.0`).

Then the pass-end ritual: simplify (code-simplifier over the changed code), the review gate (suggest the
adversarial review-gate `Workflow` on Geoff's opt-in; otherwise a parallel fan-out of `svelte-reviewer`,
`daisyui-a11y-reviewer`, a focused correctness reviewer on the tidy apply/validate/transport logic, the
`cloudflare-workers` reviewer for the Worker action plus the Worker delivery surface, and `web-auth-security`
for the new action guards and the untrusted-content/injection path), the docs gates (`check:reference`,
`check:reference:signatures`, `check:package`, `check:docs`), and the tracking (the post-mortem in this
plan, STATUS on `main`, the editor-copyedit memory).

A live admin smoke is owed this pass (the first Worker call to the Anthropic API, the first dictionary
commit, the first spellcheck Worker in a real consumer build). It rides the first site cutover (no real
Worker/GitHub/Anthropic in the showcase), matching the media-pass precedent; record that disposition.

**Gate:** full gate green; the doc gates green; `check:version` (minor) green; the live-smoke disposition
recorded.

---

## Self-review (plan vs spec)

- **Spec coverage.** Spellcheck engine + delivery spike (Tasks 1, 3); `@codemirror/lint` + the shared
  `frontmatterSpan` (Task 2); the Worker split (Task 3); the lint source + single skip authority +
  combined-skip agreement (Task 4); the correction popover + the locked `--cairn-warning-ink` (Task 5); the
  objective-error layer (Task 6); the dialect config + the footer toggle + native-attribute removal (Task 7);
  the spellcheck component + lint co-existence (Task 8); the git-committed dictionary + SHA-guarded
  commit-and-retry (Task 9); the tidy config + `buildTidyPrompt` + the doctor check (Task 10); the Worker
  action + abort/timeout/deadline + typed failures (Task 11); the LCS diff as positional truth (Task 12);
  the output validation backstop (Task 13); the `registerTidy` apply seam + the focused step-in review mode +
  all grafts + scopes (Task 14); the two-tier settings + visibility gate (Task 15); the showcase E2E (Task
  16); docs + version + ritual (Task 17). All spec parts covered.
- **Phasing matches the spec.** Phase 1 = Tasks 1 through 8 (spike-gated); Phase 2 = Task 9; Phase 3 =
  Tasks 10 and 11; Phase 4 = Tasks 12 through 15; cross-cutting = Tasks 16 and 17. The spike is the explicit
  go/no-go at the top of Phase 1.
- **Type/seam consistency.** `frontmatterSpan` (Task 2) is consumed by the spellcheck skip (Task 4) and the
  tidy validator (Task 13); the Worker protocol (Task 3) is consumed by the lint source and the popover
  (Tasks 4, 5); `site-dictionary` (Task 9) by the dictionary action and the host; `buildTidyPrompt` + the
  `tidy` config (Task 10) by `tidyAction` (Task 11); `diffTokens`/changes (Task 12) by the validator (Task
  13) and the apply seam (Task 14); `tidy-validate` (Task 13) by the client flow (Task 14); `registerTidy`
  (Task 14) is the host seam the review surface and the settings-gated toolbar control sit on; the action
  names (`tidy`, `addDictionaryWord`, the settings save) match between the composer (Tasks 9, 11, 15) and the
  component posts (Tasks 9, 14, 15). The locked tokens (`--cairn-warning-ink` for every spellcheck underline,
  `--color-positive-ink` for tidy insertions/additions and the settings on-state example, and
  `--cairn-error-ink` for tidy deletions only; note it is `--color-positive-ink`, not the nonexistent
  `--cairn-positive-ink`) are consistent across Tasks 5, 6, 14, 15.
- **Review-closely tasks flagged:** Tasks 11, 12, 13, 14, 15, each with `model: opus` suggested. The highest
  blast radius is the untrusted-content Worker call (11), the positional-truth diff (12), the
  proofread-not-restructure backstop (13), the buffer-mutating apply state machine (14), and the truthful
  visibility gate (15).
- **Task sizing.** Each task is one verification surface (a pure module + its unit fixtures, one action + its
  workerd integration tests, one component surface + its real-browser tests). The two highest-risk surfaces
  (the apply state machine, the settings gate) are isolated tasks; the pure cores (diff, validate, prompt,
  skip, objective-errors, frontmatter span, site-dictionary) are separate so each lands test-first and green
  before the glue consumes it.
- **Open decisions left to the implementer (the spec permits these):** whether suggestions are fetched in
  the lint batch or lazily on first hover (Task 5, spec 1.5 allows either, simpler first cut fetches in the
  batch). This does not change the design. (The config-home and config-file-location forks are now
  RESOLVED: both `spellcheck.dialect` and `tidy` live as blocks in the committed-YAML `SiteConfig`, one
  config home, never a separate file.)

## Carry-forwards (beyond this pass)

- **The delivery spike is a genuine go/no-go.** If `spellchecker-wasm` plus a 2MB asset does not survive the
  consumer Cloudflare build, the engine falls back to `nspell` (slower suggestions, smaller delivery
  surface). This is the single largest open risk and is unresolved until Task 1 runs; the engine choice is
  the spike's output, recorded in the spike-result doc.
- **The default accept posture ships as the safety-ranked split (decision 9).** The apply primitives support
  a uniform Accept-all too, so a later pass can flip to uniform (or add an explicit-confirm step for reworded
  grammar) without a redesign.
- **The CONVENTIONS prompt lines lean on the model doing in-context house style.** The exact wording of each
  contextual position (the AP complex-only Oxford rule, the number exception sets, the apostrophe rule set)
  is locked by the `buildTidyPrompt` fixtures and an opt-in, network-gated real-model drift harness (kept out
  of the default suite so CI stays offline and deterministic); the diff-review is the backstop for a missed
  application, not a guarantee of perfect application.
- **The local category and because-line are heuristics.** A category may occasionally be absent or generic,
  and a normalization hunk with no computable rationale is suppressed rather than shown unexplained. This is
  the accepted cost of the plain string-in/string-out model contract over a structured-edit one.
- **Deferred conventions and surfaces** (a later pass or initiative): freeform custom instructions and
  heading capitalization (named in the "Not here yet" note, both reach into voice); currency redundancy and
  date-format normalization; a multi-language spellcheck story (the dialect map generalizes to it); a CI-side
  `retext` prose check (a separate surface); an inline track-changes review surface (reuses Phase 4's apply
  primitives, only the surface differs); a per-user dictionary or preference store (the committed YAML holds
  the per-site model). The `create-cairn-site` scaffolder and the media follow-ons are separate initiatives.
- **A live admin smoke is owed** (the first Anthropic Worker call, the first dictionary commit, the first
  spellcheck Worker in a real consumer build). It rides the first site cutover; record the disposition in
  Task 17.

## Post-mortem (2026-06-21)

**Built.** All 17 tasks landed test-first on `feat/editor-copyedit`, shipping as the unreleased
`0.60.0`. Spellcheck is the default: a local CodeMirror `@codemirror/lint` source backed by a Web
Worker that streams a 1.5MB en-US dictionary into the spellchecker-wasm engine, markdown-aware (the
`frontmatterSpan` and prose-classify skips), dialect-aware (`spellcheck.dialect`), with a correction
popover on the locked amber `--cairn-warning-ink` underline, an objective-error layer, and a personal
dictionary committed to git through the GitHub App pipeline. Tidy is opt-in (developer-tier
`tidy.enabled` plus the `ANTHROPIC_API_KEY` secret): a Worker action calls the Anthropic SDK with an
abort/timeout/deadline, the client diffs the result as an LCS over tokens, a validation backstop holds
the edit to a proofread (frontmatter byte-for-byte, bounded divergence), and a native-dialog step-in
review lets the author accept or reject each hunk before one transaction writes the kept set. The
two-tier settings screen reuses the shipped check-and-tint and radiogroup primitives.

**Verified (evidence).** Full gate green at the tip, run first-hand from the worktree: `npm run check`
1132 files 0/0; `npm test` 215 files / 2429 tests exit 0; `npm run package` exit 0; the showcase
Playwright E2E 30 passed (the new `spellcheck.spec.ts`, `tidy.spec.ts`, and the standing
`spellcheck-spike.spec.ts` round-trip, plus 27 existing); the doc gates `check:reference`,
`check:reference:signatures`, `check:package`, `check:docs`, and `check:version` (minor) all exit 0.

**Crash and recovery.** The laptop lost power mid-Task-16. Tasks 1 through 15 were committed; Task 16's
files were written but uncommitted. On resume the work was recovered intact and the gate run found one
failure, a test-harness bug in `spellcheck.spec.ts`: it read `--cairn-warning-ink` off
`document.documentElement`, but the admin tokens live on the `[data-theme='cairn-admin']` scope wrapper
(a load-bearing design rule), so it resolved empty. Fixed by resolving the token through a probe inside
the scope and comparing in the browser's canonical color form. The feature itself painted correctly.

**Review gate (adversarial Workflow).** Geoff opted into the multi-agent find-and-verify review over the
flat fan-out. Five dimensions (security plus the untrusted-content path, tidy correctness, Worker/wasm
delivery, Svelte reactivity, DaisyUI/a11y) raised 14 findings; the adversarial verifier confirmed 11
and refuted 3. All 11 were folded test-first (one was the same selection-offset bug surfaced by two
dimensions). The four high-value catches: a `body.indexOf(selected)` selection-offset bug that silently
corrupted an entry when the selection text repeated earlier; `numberStyle`/`measurements`/`timeFormat`
normalizations swept by Accept-fixes without confirmation (no `matchNormalization` branch, so they
defaulted to objective); a dead tidy abort signal passed in the SDK body instead of the options
argument; and a dark-theme diff-run contrast failure (2.70:1) the daisyui reviewer measured and the fix
locked to 5.89:1. The review earned its cost on a pass this size with new Worker, LLM, and
untrusted-content surfaces.

**Decisions locked.**
- The selection range is its own seam (`registerGetSelectionRange` returning `{from,to}|null`), kept
  separate from the string-returning `getSelection` that `WebLinkDialog` still consumes. Recovering a
  document offset by text search is never correct when the text can repeat.
- A config style normalization (Oxford comma, number style, measurements, time format, smart quotes,
  dashes) is a JUDGMENT hunk: it defaults to undecided and is never swept by Accept-fixes. Only an
  objective error (spelling, a plain typo) is pre-kept. The `matchNormalization` matcher is the gate.
- The tidy abort signal belongs in the SDK's second options argument; the structural `TidyClient`
  models `create(body, options)`.
- The tidy-diff tint is a locked, measured token pair in `cairn-admin.css` (both themes), not an
  ink self-mix, because a stacked tint must be measured against its real composite, dark mode included.

**Carry-forwards.**
- The live admin smoke is owed (the first real Anthropic Worker call, the first dictionary commit, the
  first spellcheck Worker in a real consumer build). It rides the first site cutover, matching the media
  precedent; the showcase has no real Worker, GitHub, or Anthropic.
- Three normalization sub-cases are deliberately unmatched and stay judgment grammar hunks (so the
  no-sweep safety invariant still holds, only the descriptive label is missed): compound spelled numbers
  (`twenty-five`), a time reshape the diff splits across hunks (`5 PM` to `5 p.m.`), and units outside
  the curated `UNIT_FORMS` set. Pass D could widen the matchers if real content shows the gap.
- The adversarial verifier refuted three of the raised findings; those were dropped, not actioned.
