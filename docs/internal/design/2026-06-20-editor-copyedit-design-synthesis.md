# Editor copy-edit and spellcheck: design synthesis

This is the synthesis lead's call after three adversarial critiques (UX/a11y, technical feasibility,
voice preservation) over the three tidy-review mockups. It rests on the design brief
(`2026-06-20-editor-copyedit-design-brief.md`, authoritative for product decisions) and the technical
design (`2026-06-20-editor-copyedit-technical-design.md`). The three mockups are the inline, panel, and
review directions of the same dated set.

The pass splits cleanly. Spellcheck is settled in the technical design and the critics raised only
cross-cutting engineering holes against it (the lint dependency, the frontmatter span, the wasm
delivery), all carried below. Tidy is the contested feature, and its whole risk is the review surface.
All three critics landed on the same direction, so this synthesis is short on adjudication and long on
the grafts and blockers that make the winner shippable.

## 1. Scored comparison

Scores are each critic's out-of-ten for how well the direction serves that lens. Higher is better.

| Direction | UX / a11y | Technical feasibility | Voice preservation | Mean |
|-----------|:---------:|:---------------------:|:------------------:|:----:|
| **Review** (native-dialog step-in diff) | **8** | **8** | **8** | **8.0** |
| Panel (companion slide-over) | 7 | 6 | 6 | 6.3 |
| Inline (in-flow track-changes) | 4 | 3 | 3 | 3.3 |

The three lenses are unanimous on the order, which is rare and worth stating plainly: review first by a
clear margin, panel a serviceable second, inline last and disqualified on its own terms.

What each score rests on:

- **Review (8/8/8).** The only direction whose modal semantics are correct for free. It is a native
  `<dialog>` opened with `showModal()` (review mockup line 747-748), so the focus trap, Escape, and the
  inert background come from the platform, matching the shipped Dialog recipe rather than hand-rolling
  it. The diff is a git-style idiom with gutter-marked `+`/`-` rows carrying glyph and color and
  strike/underline together (lines 821-822), so error-versus-voice reads at a glance and never-hue-alone
  is over-satisfied. Per-hunk accept/reject is the shipped segmented `aria-pressed` recipe (lines
  815-818), the same one `MediaFigureControl` and `IconPicker` use. It needs almost no new CodeMirror
  decoration machinery: apply is one batched `view.dispatch({changes})` over absolute
  ranges, the exact primitive the media and figure transforms already exercise. And it is the only
  mockup that demonstrates the safety contract end to end (Screen 4: the author rejects the consistency
  hunk *because* it was their voice choice, the rejected add strikes through to read "not taken", the
  tally re-counts).

- **Panel (7/6/6).** The safe shipped-idiom choice. It reuses the non-modal slide-over a11y contract
  verbatim (`role=region`, focus-in-on-open, return-on-close, window-Escape), and the card-as-trust-unit
  with a per-card before/after and a harmonize-to-author because-line is the single strongest trust
  affordance anywhere in the set. Its costs are structural to the two-locus model: the eye and the screen
  reader ping-pong between the card and the lit `.locus` span in the manuscript, and a copy-edit is
  judged in the flow of its sentence, which a detached before/after fragment loses. It also adds an
  under-specified live-buffer locus-highlight decoration the technical design never scoped, and its core
  controls have naming gaps (unlabeled `tabindex=0` cards, identically-named "Jump to" buttons).

- **Inline (4/3/3).** Disqualified, and the agreement across lenses is the tell. Its thesis (never leave
  the writing flow) is real for one or two fixes and hostile to a true copy-edit. It stacks a fourth
  red/green layer onto a monospace surface already carrying syntax-muting, directive rails, the code
  chip, and the media chip; it places a deletion immediately beside its insertion so a line reads as
  garbled duplicated prose; it reflows the text under the author. The UX and voice critics name the same
  disqualifier: the per-change control is `opacity:0; pointer-events:none` until `:hover` or
  `.active` (mockup lines 313-314), and a resting change exposes only a 5px `.chg-dot` with no accessible
  name (line 322). That is a WCAG 2.1.1 keyboard and 2.5.5 target-size failure on the feature's primary
  action, and it inverts the safety contract: blind "Accept all" is one click while reading each change
  is opt-in work. The technical critic adds that its apply mechanism (deletion marks plus insertion
  widgets plus control widgets plus per-change position remapping, layered on three existing decoration
  providers) is the hardest CM6 work cairn would ship and the least specified, with the technical design
  deferring it to "the mockups."

## 2. Recommended direction and the grafts

**Ship the focused step-in review mode.** It is the unanimous pick, it is correct-by-construction on the
modal semantics that the other two hand-roll, it is the cheapest to build, and it has the lowest
cognitive load and the most truthful edge states. It also matches cairn's own preview-and-confirm idiom
(publish, replace, alt-propagation all show a preview the editor confirms).

There is no direction split to resolve. The critics diverged only on which grafts to import and on a few
fixes, and where a graft carries a cost-versus-safety question I resolved it for safety, per the
tie-break rule. The grafts, with reasoning:

1. **The because-line, made mandatory for every consistency change** (from panel, all three critics named
   it; the UX critic called it the single strongest trust affordance in the set). The review mockup
   already renders it once as a `.drow.ctx` row ("You write 'trailhead' three other times in this post",
   line 858). Promote it from a one-off to a contract: a consistency or harmonization hunk that cannot
   show a locally-computed rationale is not offered at all. The voice critic is right that consistency is
   the category that most looks like a voice change, so a harmonization the author cannot see the reason
   for is one they cannot judge against their own voice. It is pure string work over the buffer (count
   the author's own usage), no model round trip.

2. **The local category taxonomy with safety-ranked weight** (from panel, refined by the voice critic).
   Keep the per-hunk category glyph-plus-label (Spelling, Grammar, Consistency, Doubled word), which the
   review mockup already has, and keep the honest note that the category is locally inferred and never a
   claim the model made (review anno line 739-742). The refinement the voice critic demands and I am
   adopting: do not render judgment categories (consistency, any grammar fix that reworded) with the same
   visual authority as objective ones (spelling, doubled word, whitespace). Objective fixes get a quiet
   neutral treatment; judgment categories get a distinct review-this treatment. See the default-posture
   decision in section 5, which is the one place this synthesis improves on the recommended mockup.

3. **Keyboard step-through** (from inline, named by the UX and technical critics). The native dialog
   gives the focus trap and Escape for free; layer the per-hunk keyboard model on top: `j`/`k` (or
   `n`/`p`) to move between hunks, `a`/`r` to accept/reject the focused one, `A` to accept all, Escape to
   cancel. It costs only key handlers on the hunk list, no decoration, and a long diff needs fast
   traversal. The voice critic adds the right wrinkle: the focused hunk's announcement should speak the
   kind plus the text and, for judgment categories, append the rationale, so a screen-reader author hears
   "consistency: trail head becomes trailhead, you write trailhead three other times" and can reject on
   that basis.

4. **Context rows plus scroll-to-locus** (from inline and panel both, named by the UX and technical
   critics as the fix for the review dialog's one real weakness). The review dialog hides the whole
   manuscript behind a blurred scrim (mockup lines 773, 924, `filter:blur(1px); opacity:.5`), so the
   author judges each change with no surrounding sentence. Add one or two unchanged context rows above
   and below each hunk in the diff body (the `.drow.ctx` style already exists), and make the line-ref a
   real "show in text" affordance that scrolls the editor underneath. This is the one piece of optional
   CM6 decoration worth importing into the review direction, and it is far cheaper than inline's full
   track-changes stack.

5. **The genuine empty/clean and working states** (from review's own Screens, kept and made a contract).
   A no-op result must never open an empty review: show the quiet "Nothing to fix" confirmation and leave
   the buffer alone. The working state must be cancelable and must wire its Cancel to a real abort (see
   the timeout blocker in section 3). The panel has a thinking state; the inline direction has neither;
   the review direction must keep both.

6. **A session-level Undo of the whole applied tidy** (from panel's resolved-card Undo, named by the
   voice critic). Apply lands the kept hunks in one transaction and one history entry, so a single
   session-scoped Undo of the entire applied tidy is cheap. An author who realizes after Apply that a
   change ate their voice reverts without hand-reconstructing. (Ordinary editor Undo already covers this
   mechanically; the graft is to surface it clearly as "Undo tidy" right after Apply, not to invent new
   machinery.)

## 3. Blockers, with fixes, grouped by what they change

Every critical and important blocker from the three critiques, deduplicated. Minor blockers are folded
into the relevant fix where they share a target. Grouped by whether the fix lands in the **technical
design** (engineering) or the **chosen mockup** (the review surface and its settings).

### 3a. Blockers that change the technical design

**TD-1 (critical, technical). `@codemirror/lint` is not a dependency.** The entire spellcheck and
objective-error surfacing layer rests on it, yet it is absent from `package.json` and missing from the
section 3.3 "deps to add" list. Verified first-hand: the dependency set is autocomplete, commands,
lang-markdown, language, state, view, plus the codemirror meta package, and `@codemirror/lint` is
ABSENT.
*Fix:* add `@codemirror/lint` to dependencies (first-party, peer-compatible with the pinned ^6 line),
list it in 3.3, and prove the `linter()` debounce and the diagnostic action/tooltip rendering in a
component test that mounts the lint layer alongside the media `atomicRanges` and the highlight layer, so
the three decoration layers are proven to co-exist.

**TD-2 (critical, technical). Frontmatter is not a Lezer node in the shipped grammar.** The design
depends on `@codemirror/lang-markdown` exposing frontmatter as a distinct node the lint source skips
(section 1.3) and on a byte-for-byte frontmatter compare via parsing (2.6). Verified first-hand: a grep
of both `@codemirror/lang-markdown/dist` and `@lezer/markdown/dist` for frontmatter/yaml returns
nothing. The base grammar does not parse YAML frontmatter without an explicit extension, so the named
skip rule does not exist and spellcheck would flag slugs and dates while the validator has no frontmatter
region to compare.
*Fix:* do not depend on a Lezer frontmatter node. Detect the frontmatter span deterministically as the
region between the leading `---` fence and its closing `---`, in a small pure helper (the line-based
fence machinery in the node-safe `markdown-directives.ts` already does this kind of work), and use that
span for both the spellcheck skip and the validator's byte-for-byte compare. Adding the
`@lezer/markdown` frontmatter extension and proving the node name in a test is the heavier alternative;
the deterministic span is lighter and reuses existing machinery.

**TD-3 (critical, technical). No precedent for shipping a 2MB dictionary or a Web Worker from this
library.** The design ships the dictionary as a package asset loaded by the Worker and runs
`spellchecker-wasm` in a dedicated Web Worker. Verified first-hand: `files[]` is
`["dist","src/lib","CHANGELOG.md"]` with no binary/wasm precedent, `spellchecker-wasm` is ABSENT from
dependencies, and there is no `new Worker` / `?worker` / `import.meta.url` Worker construction anywhere
in `src/`. The editor-boundary test guards only static `@codemirror` imports; it does not prove a Worker
plus a wasm module plus a large asset survives a consumer's SvelteKit/Vite build under the Cloudflare
adapter.
*Fix:* spike the worker-plus-wasm-plus-dictionary delivery end to end in `examples/showcase` (the real
consumer build) before committing to `spellchecker-wasm`. Document the asset delivery decision: bundle
the wasm via Vite's `?url`/`?worker` so the consumer build resolves it, or stream the dictionary from a
Worker route on the `createMediaRoute` pattern rather than `files[]`. Confirm the 2MB dictionary inflates
neither the client bundle nor the Worker size limit. Keep `nspell` named as the fallback and gate the
engine choice on this spike, not on suggestion-speed theory.

**TD-4 (critical, voice). The consistency clause in the system prompt produces voice-destroying edits.**
This is the largest voice hole and it is upstream of every surface, so it must be fixed regardless of
which mockup ships. The prompt (section 2.3) tells the model to harmonize "Number style, hyphenation, and
capitalization" to the writer's "prevailing habit", which is an editing posture, not a proofreading one,
and the brief's own out-of-scope list names number style as line editing. All three mockups demonstrate
the misfire: the inline hero edit `fifteen centimetres` to `15 cm` is both an out-of-scope number-style
change and a silent deletion of a British spelling; `email` to `e-mail` and `trail head` to `trailhead`
are the same class.
*Fix:* tighten the consistency clause to be conservative-by-default and narrow:
- Drop "number style" entirely. State in the prompt that spelled-out versus numeral is the author's
  choice and out of scope, so "fifteen" and "15" may coexist.
- Restrict harmonization to a closed set of objective inconsistencies (a term capitalized two ways, a
  compound hyphenated and closed both ways) and add an occurrence floor: only harmonize when the same
  token appears both ways in this text and one form clearly dominates. A form that appears once is not an
  inconsistency; leave it.
- Add an explicit regional-spelling guard: a regional spelling (colour, centimetres, organise) is never
  an inconsistency to fix; preserve every regional form exactly, even if it appears once.
- Reframe the homophone pairs (its/it's, their/there/they're): correct them only where the existing form
  is grammatically wrong in its sentence; a correct possessive "its" or a correct "there" must never be
  changed. (This also closes the voice critic's separate important blocker on homophones.)

**TD-5 (important, technical). Selection scope and harmonize-to-author are incoherent together.** When
scope is a selection, the model receives only the selected text, so "dominant usage within this text" is
computed over a fragment. A document that uses "colour" twelve times but whose selected paragraph
contains one "color" (a real typo) and zero "colour" reads "color" as locally dominant, and the model can
leave the typo or flip a correct minority form the wrong way. The author's voice baseline lives in the
whole document; a selection cannot see it.
*Fix (decisive, simpler-and-safer option):* for selection scope, disable harmonize-to-author entirely and
restrict the selection tidy to the document-independent fixes (spelling, typo, grammar, whitespace),
stated in the prompt as a scope flag. The alternative (send the whole document as read-only context but
return only edits within the selection) is more capable but adds prompt surface and a new failure mode;
the safe restriction wins under the tie-break rule, and a future pass can revisit if authors ask for
in-selection harmonization.

**TD-6 (important, technical). The 25% divergence bound false-rejects legitimate heavy proofreads of
short inputs.** The bound is a fixed fraction over a variable-length input. Fix three typos and a doubled
word in a 30-word selection and you are well past 25%, so the validator discards correct work and tells
the author tidy "changed more than the wording" when it did exactly its job.
*Fix:* make the guard length-aware. Combine an absolute floor (allow N changed tokens regardless of
fraction, so short inputs are not penalized) with the fraction for long inputs, or gate the fraction by
input token count. Keep the structure, token, and code checks exactly as they are (those are exact and
the real injection backstop). Tune against the prompt-contract fixtures the design already plans (3.1),
including a short-selection case.

**TD-7 (important, technical). The tidy Worker call has no timeout and no abort.** The transport reuses
the media seam's `redirect:'manual'`, which is fine for fast media calls, but a tidy call to Sonnet on a
full entry can run many seconds. The design leaves the request unbounded, offers streaming only as an
aside, and never wires the thinking-state Cancel button to an abort. A slow or hung Anthropic call leaves
the editor stuck in the thinking state.
*Fix:* add a client `AbortController` behind the Cancel button and a bounded fetch timeout. On the Worker
set a request deadline shorter than the platform limit and map a timeout to the existing retryable
`fail(502)` outcome. If entries can be long, prefer streaming the Anthropic response and assembling
server-side, or bound input hard via the existing `fail(413)` path so the call stays short.

**TD-8 (important, technical). The line-ref labels must be computed locally, never trusted from the
model.** The review hunks carry "line 9", "line 13" labels (mockup lines 813, 830). If those came from
model-reported line counts they would drift from the source.
*Fix:* compute every line ref locally from the diff against the captured original. The model returns only
the corrected string (poplar's contract); cairn owns all positions. (This is a small but load-bearing
note for the review surface specifically; it lives in the technical design because it constrains the diff
module.)

**TD-9 (minor, technical). The dictionary commit can race on the base SHA.** Two editors adding words
concurrently race on the file's base SHA; idempotent content does not prevent a stale-SHA rejection.
*Fix:* reuse the SHA-guarded commit-and-retry pattern the publish/save and media-save pipelines already
use. On a 409/stale-SHA, re-read, re-merge the pending additions (the sorted insert is already
idempotent), and retry once. Keep the optimistic local set so the underline clears regardless.

**TD-10 (minor, technical). Three spellcheck skip mechanisms must be proven to agree.** Section 1.3 mixes
a Lezer tree walk, the line-based `fenceScan`/`fenceTokens`, and a `parseMediaToken` regex, which can
disagree at boundaries.
*Fix:* make the Lezer tree the single authority for node-kind skips (code, links, HTML, emphasis) and use
the line-based fence scan only for the directive machinery the tree does not model, with a clear rule
that fence-classified ranges win inside a directive. Add the combined-skip unit test the design already
plans (3.1) over a fixture with a `:::figure`, a `media:` token, frontmatter, and a code fence.

### 3b. Blockers that change the chosen mockup (the review surface and its settings)

**MK-1 (critical, UX). Split the live regions; the tally over-announces and the per-hunk state
under-announces.** The running tally ("4 keeping / 0 skipping") is the only `role="status"` region
(mockup line 797), so every per-hunk accept/reject mutates it and re-reads the whole tally (the
clobbering the MediaPicker two-region note warns about), while nothing announces the actual state change
of the focused hunk (toggling `aria-pressed` does not reliably announce on its own).
*Fix:* mirror the shipped MediaPicker two-region discipline. Keep the tally as one `role="status"`
updated only on bulk actions and on the resolution count, and add a second `aria-live="polite"` region
that narrates the single last action ("Hunk 3, consistency, rejected"). Debounce the tally so a rapid
accept-all does not machine-gun. Pair this with the step-through graft so each `j`/`k` move speaks the
focused hunk's kind, text, and (for judgment categories) rationale.

**MK-2 (important, UX). Recover surrounding context; the blurred scrim hides the whole manuscript.** A
copy-edit decision often depends on the sentence around the change, and the hunk shows only a line-ref
plus the changed line, with the buffer blurred to `opacity:.5`.
*Fix:* this is graft 4 (section 2). Add one or two unchanged context rows above and below each hunk, make
the line-ref a real scroll-to-locus on the still-present editor, and dim rather than blur-to-unreadable.

**MK-3 (important, UX/voice). Lock one spellcheck underline token, muted, never the deletion red.** The
squiggle color is inconsistent across the three mockups and, in the inline direction, collides with the
deletion color: inline draws it in `--cairn-error-ink` (the same red as a tidy `.del`), panel in
`--cairn-warning-ink` (amber), review in error-ink at a softened alpha. The technical design (1.4) calls
for a muted tone, not the directive accent and not error red, with `severity:'info'`.
*Fix:* adopt `--cairn-warning-ink` as the single spellcheck underline token across the whole feature (it
is the closest to the spec and exists in both theme roots, verified). Reserve `--cairn-error-ink` red
exclusively for tidy deletions so the two features never speak in the same color. (There is no shipped
`--cairn-info-ink`; do not invent one. `--cairn-warning-ink` is the right muted choice and avoids a new
token.) The review mockup's softened error-ink squiggle changes to warning-ink to match.

**MK-4 (important, settings; binds every direction). Add the first-run settings state: tidy flag on, key
absent, editor control suppressed.** All three settings mockups show a fully-configured happy path (key
present, toggle on), so the prerequisite-missing state, where an editor actually gets confused, is never
shown. The brief locks tidy-off-until-key-and-flag, and the technical design (2.8) calls for a doctor
warning and a clear refusal when the flag is on but the secret is unset.
*Fix:* draw the first-run state in the chosen direction: tidy toggled on, key field empty, the Tidy
toolbar entry not rendered at all (or visibly disabled with `aria-disabled` and a name that explains
why), and an inline note pointing at the key field. Confirm the editor-side control does not render until
both the flag and the key are present, so the opt-in surface and the editor stay truthful together. The
`cairn-doctor` check (TD, section 2.8) is the engineering half of this; the mockup is the UX half.

**MK-5 (minor, UX). Render the working and clean states truthfully, and land focus on results.** Keep the
working spinner as `role="status"`, but ensure the result ("4 changes to review" or "Nothing to fix")
lands in a live region on transition and moves focus to the first hunk or the back-to-editing button. A
no-op never opens an empty review (graft 5).

**MK-6 (minor, voice). Soften the chrome's voice guarantee so it recruits the author, not lulls them.**
The settings and loading copy promise "It leaves your voice alone" as an absolute, but the consistency
behavior touches voice, so an absolute guarantee makes the author trust the output more and review it
less.
*Fix:* rewrite the copy to keep the author alert and to recruit them as the voice guardian: tidy fixes
clear errors and matches the author's own inconsistent spellings, the author should always check the
changes because a fix can cross into a choice, and any one change can be rejected. (This is product copy;
write it to the cairn voice standard, no absolute promises.)

## 4. Consolidated technical-design adjustments

The edits the critics demand to `2026-06-20-editor-copyedit-technical-design.md`, as a checklist for
whoever revises it before the build:

1. **Section 3.3 and dependencies:** add `@codemirror/lint` to the deps-to-add list and to
   `package.json` (TD-1).
2. **Sections 1.3 and 2.6:** replace the Lezer-frontmatter-node dependency with a deterministic
   frontmatter-span helper (the `---` fence pair), used by both the spellcheck skip and the validator's
   byte-for-byte compare (TD-2).
3. **Sections 1.1, 1.2, 1.5:** add a required `examples/showcase` end-to-end spike of the
   worker-plus-wasm-plus-dictionary delivery as a gate before committing to `spellchecker-wasm`; document
   the asset-delivery decision (Vite `?url`/`?worker` versus a Worker route); confirm bundle and Worker
   size; keep `nspell` as the gated fallback (TD-3).
4. **Section 2.3 (system prompt), the consistency clause:** drop number style; add the occurrence floor;
   add the regional-spelling guard; reframe the homophone pairs as fix-only-when-wrong. This one prompt
   edit does more for voice safety than any other change in the pass (TD-4).
5. **Section 2.5 (selection scope):** add a scope flag that disables harmonize-to-author for selections
   and restricts them to document-independent fixes (TD-5).
6. **Section 2.6 (divergence bound):** make the bound length-aware (absolute floor plus fraction); state
   explicitly that the divergence bound is a rewrite/injection backstop and not a voice safeguard, so the
   docs stop implying that code protects voice (TD-6, and the voice critic's minor on the same target).
7. **Sections 2.1, 2.2, 2.7:** add a client `AbortController` and a bounded fetch timeout, a Worker-side
   deadline mapping to `fail(502)`, and a hang entry in the failure-mode table; decide streaming versus a
   hard input bound for long entries (TD-7).
8. **Section 2.4 (diff) / review surface:** state that all line refs and positions are computed locally
   from the diff against the captured original, never taken from the model (TD-8).
9. **Section 1.5.1 (dictionary commit):** specify SHA-guarded commit-and-retry on a stale-SHA conflict
   (TD-9).
10. **Section 1.3 (skip mechanism):** name the Lezer tree as the single skip authority with the fence
    scan only for directive machinery, and add the combined-skip agreement test (TD-10).
11. **Section 1.4 (lint underline color):** lock `--cairn-warning-ink` as the one spellcheck underline
    token, reserving `--cairn-error-ink` for tidy deletions; note there is no `--cairn-info-ink` and none
    should be invented (MK-3).
12. **Section 2.5 (review surface primitives):** record the chosen direction (native-dialog review mode)
    and the grafts that touch the engine: the two-region live model (MK-1), the optional scroll-to-locus
    decoration plus context rows (graft 4), the keyboard step-through handlers (graft 3), the mandatory
    local because-line computation (graft 1), and the safety-ranked category posture (section 5).
13. **Section 3.2 (phasing):** fold the worker/wasm spike into Phase 1 as its gate, and add the
    track-changes-stack note to the inline carry-forward (the shared apply primitives mean a future
    inline pass can reuse Phase 4's work).

## 5. Open decisions for the human lead

These are the forks where the critics either split or where the call changes the product and belongs to
the lead, not to the implementer. My recommendation is given for each; the lead confirms or overrides.

1. **Per-change reason versus plain rewrite (the brief's open question).** *Recommendation: plain rewrite,
   with locally-computed categories and because-lines.* All three critics converged here. Keep poplar's
   model: the model returns a corrected string, cairn computes the diff, and cairn infers the category
   and the harmonize-to-author rationale locally and safely (a single-token punctuation/whitespace diff
   is a typo, a repeated word is doubled, a usage count drives the because-line). This keeps the model
   contract a plain string-in/string-out, avoids the heavier structured-edit contract the brief leans
   against, and stays honest because every label is cairn's local inference, never a model claim. The
   open part for the lead: confirm we are not asking the model for structured edits even to get
   per-change reasons, accepting that the category is a heuristic that may occasionally be absent or
   generic rather than a guaranteed label on every hunk.

2. **The default accept posture for judgment categories (the one place the synthesis improves on the
   winning mockup).** The review mockup defaults every hunk to `aria-pressed="true"` (kept), so the lazy
   path is "Accept all" and a voice-touching consistency hunk rides along unless actively rejected. The
   voice critic argues, and brief decision 3 ("default to leave on anything ambiguous") supports, that
   ambiguous hunks should not be swept in by Accept-all. *Recommendation: objective hunks (spelling,
   doubled word, whitespace) default to kept; judgment hunks (consistency, any grammar fix that reworded)
   render with the distinct review-this treatment and are NOT included in Accept-all unless individually
   confirmed.* This is a real product-behavior fork (it makes Accept-all do less by default), so it is
   the lead's call. The safer posture wins my recommendation under the tie-break rule, but it trades some
   one-click convenience, which is the lead's to weigh.

3. **Dictionary storage: git-committed file versus D1.** The technical design recommends the
   git-committed per-site file (`content/.cairn/dictionary.txt`), and no critic challenged the choice on
   its merits; the technical critic only flagged the commit-race (TD-9, fixable). *Recommendation: keep
   the git-committed file*, consistent with the content-in-git principle, diffable and shared across
   editors. Flagged here only because the brief listed it as an open question; if the lead prefers D1 for
   write-concurrency reasons, that is the moment to say so, before Phase 2.

4. **Model default: Sonnet versus Haiku.** The technical design defaults to `claude-sonnet-4-6` with
   Haiku offered, on the reasoning that a light copy-edit needs judgment (error-versus-choice,
   minimal-change, reading the author's own conventions). No critic challenged this. *Recommendation:
   keep Sonnet as the default floor*, Haiku as the per-site cheaper option. The lead's call is only
   whether the cost posture (Sonnet by default on every tidy) is right for the launch, or whether Haiku
   should be the default with Sonnet as the upgrade.

5. **Selection-scope harmonization (resolved one way here, surfaced for the lead).** TD-5 disables
   harmonize-to-author for selection scope as the simpler-and-safer option. *Recommendation: ship the
   restriction.* The lead's call is whether to instead invest in the whole-document-as-context approach
   so a selection tidy can still harmonize against the full document; that is more capable but adds
   prompt surface and a failure mode, and I judged it not worth the launch risk.

6. **The wasm/dictionary delivery, pending the spike (TD-3).** This is a go/no-go the spike answers, not
   a taste call, but the lead should know it gates the spellcheck engine choice. If the showcase spike
   shows `spellchecker-wasm` plus a 2MB asset does not survive the consumer Cloudflare build cleanly, the
   fallback is `nspell` (slower suggestions, smaller delivery surface). *Recommendation: spike first, and
   accept `nspell` if the spike is ugly*, rather than forcing the wasm path on suggestion-speed theory.
