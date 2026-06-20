# Editor copy-edit and spellcheck: design brief

This is the shared foundation for the design pass on two cairn admin-editor features: a spellcheck and a
light copy-edit ("tidy"). Every agent in the design workflow reads this first. It records the locked
decisions, the research landscape, and the technical constraints, so the technical design and the UI/UX
mockups all rest on the same facts.

## What we are building

Two features for the cairn admin editor (CodeMirror 6, Svelte 5, on a Cloudflare Worker backend). cairn
is not WYSIWYG: the markdown source is the surface and the source of truth, so both features operate on
the markdown text, not a rendered view.

1. **Spellcheck.** Catch misspelled words as the author types. Objective, local, and ON BY DEFAULT.
2. **Tidy: a light copy-edit that preserves the author's voice.** On demand, opt-in, powered by an LLM.

These are two features with different engines, trust models, and novelty. Spellcheck is a solved problem
whose work is doing it well in CodeMirror and making it markdown-aware. Tidy is the novel one, and almost
all of its design risk is in how the edit is applied and reviewed, not in the model call.

## The reference: poplar's `tidy`

poplar (a terminal email client in the same author's toolkit) has a `tidytext` feature that is the
anchor. Its design, worth inheriting:

- A single Claude call. System prompt of rules plus always-on guardrails, user message is the author's
  text, the model returns corrected text.
- The guardrails are the heart: do not rephrase, restructure, change tone or formality, expand or
  contract contractions, add or remove content, change voice, or touch code spans.
- It rewrites the whole body in one shot and shows what changed with diff highlights (an LCS that marks
  the changed runs). It is a conservative proofreader, not a rewriter.
- It has NO separate real-time spellcheck; it folds spelling into the on-demand pass.

So for cairn the spellcheck is net-new, and tidy is a port of poplar's philosophy to a web markdown
editor, adapted in scope (see the copy-edit contract below) and given a real review UI.

## Locked decisions

1. **Spellcheck is default; tidy is opt-in.** The principled reason is local versus remote. Spellcheck
   runs entirely in the browser, so it leaks nothing and costs nothing per keystroke, which makes it safe
   to default on. Tidy sends the author's content to the Anthropic API and costs tokens, so it must be a
   deliberate opt-in the site owner turns on and supplies an API key for.
2. **cairn enforces no voice.** Every cairn user has their own voice, and an author may even draft with
   AI, which is fine. cairn is not in the business of detecting or removing "AI tells" or imposing a house
   style. There is NO style or prose-opinion linter in this feature. (This workstation's own `prose-guard`
   governs how cairn's docs and code are written; it is not cairn-the-product's job.)
3. **Tidy is a light copy-edit, voice preserved.** One notch above proofreading, one notch below line
   editing. The governing rule is: fix what is wrong, leave what is a choice. The operational contract:
   - IN SCOPE: spelling, typos, doubled words, stray whitespace, plainly wrong punctuation; grammar errors
     that need a small rewording (subject-verb and pronoun agreement, tense slips, its/it's and
     their/there, a dangling modifier, faulty parallelism in a list, a comma splice or run-on fixed with
     the lightest touch); consistency harmonized to the author's OWN dominant usage and never an external
     standard (a term capitalized two ways, email versus e-mail, number style). If the author writes
     "colour" throughout, keep "colour".
   - OUT OF SCOPE (this is line editing or voice): word choice ("utilize" to "use" is taste); sentence
     structure, length, rhythm (no combining, splitting, or tightening for flow); tone, formality,
     contractions, deliberate fragments, opening conjunctions, dialect, slang; passive to active, cliches,
     weasel words, readability scores; adding, cutting, or reordering content; anything that improves
     rather than corrects.
   - SAFEGUARDS: the minimal-change principle (the smallest edit that fixes the error), harmonize to the
     author (consistency follows their usage, not a rulebook), and default to leave on anything ambiguous
     between an error and a choice.
4. **The diff-review is the safety contract, not a convenience.** Because a light copy-edit touches
   wording, the review exists so the author can confirm tidy fixed only errors and left their voice
   intact. That argues for showing deletions as well as insertions (you have to see what was removed to
   know your voice survived) and for per-change reject (a correction that strays into a voice choice can be
   waved off on its own), plus accept-all and reject-all.

## Research landscape (verified June 2026)

**Spellcheck in CodeMirror 6.** Four approaches, mostly converged:
- Browser-native (`spellcheck="true"` on the editable) is unreliable in CM6: the constant DOM
  re-rendering makes the red squiggles vanish and reappear, and native spellcheck flags code, URLs, and
  frontmatter because it cannot see markdown structure. A fallback at best.
- The canonical web path: a client-side WASM dictionary on a Web Worker plus CodeMirror decorations.
  `spellchecker-wasm` (SymSpell, ~70KB WASM plus a ~2MB English dictionary) is the demonstrated engine;
  `nspell`/Typo.js (Hunspell dictionaries) are the alternative. Mask markup to whitespace (or use the
  Lezer markdown tree) so code and links are never checked. Offline and private.
- `@codemirror/lint` is the official surfacing layer: a lint source returns diagnostics rendered as
  underlines, hover tooltips, and quick-fix actions. Quick-fix actions are exactly the correction UX
  ("replace with X", "add to dictionary", "ignore"). This is the idiomatic CM6 mechanism.
- Server-side grammar (LanguageTool) is off-brand here (a Java server) and unnecessary; tidy covers
  grammar. Skip it.
- Best-in-class spellcheck UX (Grammarly, Google Docs, VSCode Code Spell Checker): a wavy underline, then
  a popover on hover or click (and a right-click menu) carrying suggestions, "add to dictionary", and
  "ignore". The two things that matter for a CMS: a persistent personal dictionary (names, product terms,
  slugs accumulate fast) and markdown-awareness (never flag code, URLs, frontmatter keys, or cairn's own
  `media:`/`cairn:` tokens).

**Objective-error checks (not style).** A small deterministic layer can ride alongside spellcheck through
the same lint mechanism: a doubled word ("the the"), a double space, stray repeated punctuation. These are
errors, not choices, so they are safe. The `retext` ecosystem (unified/remark, which cairn already runs)
provides `retext-spell` and `retext-repeated-words` and runs in the browser, a Worker, or CI. Do NOT
enable the opinion plugins (passive, simplify, equality, readability); those enforce a voice.

**Applying an AI edit to a live document (the tidy core).** The cross-tool consensus is firm: every AI
edit appears as a visible change you can approve or reject, and nothing auto-applies (Notion suggested
edits, Lex, Cursor, Grammarly, Moment.dev). The dominant rendering is a red/green track-changes diff with
accept controls (Cursor: green add, red delete, Cmd+Y accept, Cmd+N reject). Two hard-won lessons:
serialize to Markdown and let the model go string-in/string-out (Moment.dev: "LLMs are string-in,
string-out machines, trained extensively on Markdown"; do not make it emit JSON patches), and batch the
apply, because applying many changes one at a time freezes the UI (Grammarly) or nags you to accept every
line (a top Cursor complaint).

**The simplification cairn gets.** Grammarly rebases suggestion deltas and Moment does three-way merges
because their AI runs concurrently with the author. cairn's tidy is single-author and on-demand: invoke
it, it briefly owns the buffer, review, accept or reject, done. poplar already captures the pre-tidy body
at request time. No live rebasing, which removes the hardest problem those teams faced.

## Technical constraints and the architecture to design against

- **Editor:** CodeMirror 6, Svelte 5 runes, the cairn admin shell. The admin design system (Warm Stone
  tokens, the type faces, the recipes) is in `docs/internal/admin-design-system.md`. Reuse only shipped
  tokens. Honor the a11y bar (live regions, keyboard, focus, never hue-alone, native dialogs).
- **Spellcheck:** a `@codemirror/lint` source backed by a WASM dictionary on a Web Worker, markdown-aware
  via the Lezer tree, with a correction popover (suggestions, add-to-dictionary, ignore) and a persistent
  personal dictionary. Consider storing the per-site custom dictionary as a git-committed file, consistent
  with cairn's content-in-git model. Default on, with a toggle.
- **Tidy transport:** a Cloudflare Worker admin action, because the Anthropic API key cannot ship to the
  browser. cairn already has the action plus CSRF plus Worker substrate from the media passes (the upload,
  replace-preview, and alt-preview actions use a `text/plain` POST with the CSRF token in an
  `X-Cairn-CSRF` header and parse a SvelteKit ActionResult envelope). Reuse that transport: the editor
  POSTs the body or the selection, the Worker calls Claude, returns corrected text, the client computes
  the diff and renders the review.
- **Model:** the light copy-edit needs judgment (is this an error or the author's choice, the minimal-change
  discipline, reading the author's own conventions), so default tidy to Sonnet and offer Haiku as the
  cheaper option. (poplar uses Haiku because its edit is purely mechanical.)
- **The prompt is a judgment contract,** not a checklist. It must encode the in/out boundary above, the
  minimal-change and harmonize-to-author principles, and the markdown preservation rules. It must NOT
  rephrase for style.
- **Structure and token preservation is make-or-break.** A tidy that reflows frontmatter, breaks a
  `media:`/`cairn:` token, mangles a `:::figure` directive, or edits inside a code fence is worse than no
  tidy. The result must be validated as a proofread, not a restructure, before it is offered.
- **Prompt injection:** the content being proofread is untrusted. The system prompt treats content as
  data, resists embedded "ignore previous instructions", and the "return only the corrected text" framing
  plus output validation contain it.
- **The diff-review state model:** prefer keeping the author's original in the buffer until they accept
  (the cairn preview-and-confirm idiom: publish, replace, and alt-propagation all show a preview the
  editor confirms). Insertions render as decorations, deletions as widgets (the removed text is no longer
  in the doc), accept-all applies in one batched transaction. Scope: whole-document and selection.
- **The durable record is git.** Every save and publish is a commit, so an accepted tidy is a normal diff
  in history, revertable like any edit. No separate audit log is needed.

## Out of scope for this design pass

- The `create-cairn-site` scaffolder and the media follow-ons (Pass D) are separate initiatives.
- No style/voice/prose-opinion linter (decision 2).
- Concurrent/collaborative AI editing (cairn's tidy is single-author, on-demand).

## The open design questions the mockups and critics must resolve

- The tidy review surface: in-flow inline track-changes, a companion review panel, or a focused step-in
  review mode. (The three mockup directions.)
- Per-change granularity and the accept-all/reject-all controls, and the keyboard model.
- Whether tidy carries a per-change reason or category (which would need the model to return structured
  edits rather than a rewritten string), versus a plain rewrite plus a computed diff (poplar's model).
- The spellcheck correction surface and the personal-dictionary storage.
- The opt-in and settings surface, and where the API key and the on/off toggles live.
