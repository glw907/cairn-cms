# Editor publish visibility and contraction spellcheck

Two editor defects Geoff reported from live ecxc use, 2026-07-13. Branch
`editor-publish-visibility`, worktree `.claude/worktrees/publish-visibility`.

## Grounding

A nine-agent survey of comparable CMS editors (WordPress/Gutenberg, Ghost, Craft 5,
Statamic 5, Kirby 5, Decap, Sanity Studio, Contentful, plus an accessibility-pattern
sweep) settled the design. Six of eight keep the publish action permanently visible;
only Kirby and Decap hide it until a draft exists, which is cairn's current behavior.
Nothing-new-to-publish states are disabled-but-present (WordPress, Sanity, Contentful)
or an enabled no-op (Ghost, Craft); nobody hides the control. Sanity and Contentful
keep the label constant ("Publish", never "Update"), which matches cairn's vocabulary
(status badges, "Publish site (N)", the publish guide). Delete stays out of the primary
toolbar everywhere except Decap, so cairn's overflow placement stands unchanged. The
accessibility research (APG toolbar example, Carbon's rejected disabled+tooltip
anti-pattern, GOV.UK button guidance) converges on `aria-disabled` over native
`disabled` for a temporarily inapplicable control: focusable, discoverable, reason
attached. cairn already owns this pattern: the figure control's guarded button
(`aria-disabled`, `cairn-btn-guarded`, opacity/cursor utilities, stateful label).

The backend needs no change: the publish action is already publish-what-you-see
(`content-routes-core.ts` ~905): it validates and holds the posted form exactly like
save, then copies that content to `main` atomically, regardless of prior branch state.

## Task 1: Publish always visible in the desk band

`src/lib/components/EditPage.svelte` (the desk band snippet, the chord handler, the
`tidyEnabled`-style deriveds).

Outcome:

- The Publish button renders unconditionally in the lifecycle pair: outline, left of
  solid Save, after the `sr-only` default submit (that button MUST stay first in the
  actions cluster so Enter in a single-line field saves, never publishes; see the desk
  band recipe in `docs/internal/admin-design-system.md`).
- Publish is actionable when there is anything to take live: `dirty || data.pending ||
  data.isNew`. Otherwise it is guarded, not hidden and not natively disabled: the
  figure-control pattern (`aria-disabled="true"`, the `cairn-btn-guarded` marker so the
  tooltip survives DaisyUI 5.6's pointer-events kill, dimmed with opacity/cursor
  utilities, never `.btn-disabled`). The guarded state carries the reason: title and
  stateful accessible name "Nothing new to publish". A guarded click must not submit
  the form (the click handler prevents it; `aria-disabled` alone blocks nothing).
- Native `disabled` remains only for `busy` (mid-submit), the one case the a11y
  guidance sanctions.
- The label stays "Publish" in every state.
- The Ctrl+Shift+S chord guard moves from `!data.pending` to the same actionable
  condition, and the `publishButton` ref comment updates (it now always exists).
- Existing behavior that must not regress: Save stays the single solid primary and
  keeps its `disabled={busy || (!dirty && !data.isNew)}` posture; the overflow menu,
  Discard gating, and tidy control are untouched.

Tests (component project, alongside the existing `edit-page-*.test.ts` suites):

- A clean published entry shows Publish guarded: present, `aria-disabled="true"`,
  focusable, and a click fires no submit.
- A pending entry shows Publish actionable; a clean published entry becomes actionable
  after a body edit (the dirty path).
- The actions cluster's first form-owned submit is still the `sr-only` default.

## Task 2: Contractions pass spellcheck

Two independent gaps, both fixed at their own layer:

- **Dictionary coverage.** `src/lib/components/spellcheck-assets/dictionary-en-us.txt`
  (a SymSpell frequency list) carries `it's`, `can't`, `we'll`, `won't`, `let's`,
  `I'm`, but is missing the rest of the standard contraction set: `you've`, `you'll`,
  `you're`, `you'd`, `I've`, `I'll`, `I'd`, `we've`, `we're`, `we'd`, `they're`,
  `they've`, `they'll`, `they'd`, `he's`, `he'll`, `he'd`, `she's`, `she'll`, `she'd`,
  `isn't`, `aren't`, `wasn't`, `weren't`, `doesn't`, `don't` (verify), `didn't`,
  `hasn't`, `haven't`, `hadn't`, `wouldn't`, `couldn't`, `shouldn't`, `mustn't`,
  `needn't`, `that's`, `that'll`, `there's`, `there'll`, `here's`, `what's`, `what'll`,
  `who's`, `who'll`, `where's`, `when's`, `why's`, `how's`, `y'all`, `ma'am`,
  `o'clock`, `'em` is out of scope. Append each missing one with frequency `300000`
  (the value the existing `we'll` carries). Check presence case-insensitively before
  appending; no duplicates.
- **Apostrophe normalization.** The extraction regex
  (`WORD` in `spellcheck.ts`) already captures curly-apostrophe words (U+2019), but the
  dictionary holds straight-quote forms only, so pasted smart-quote prose fails lookup
  even for covered words. Normalize U+2019 to U+0027 at the handler boundary in
  `spellcheck-worker.ts`: one helper applied in `isCorrect` (before the engine check
  and the personal/ignore set lookups), in `addWord`, and in `ignoreWord`, alongside
  the existing lowercasing. `suggest` normalizes the same way. Diagnostic ranges are
  untouched (normalization affects the lookup key only).

Tests (extend `src/tests/unit/spellcheck-worker.test.ts`, which already drives the
handler with a fake engine, plus a dictionary-content assertion):

- `you've`, `doesn't`, `they're` answer correct through the real dictionary asset (a
  node-side read of the asset file asserting the appended entries exist is acceptable
  if wiring the wasm engine in node is disproportionate).
- A curly-quote word (`we’ll`) answers correct via the handler when the engine knows
  the straight form; `addWord` with a curly form answers a later straight-form check.

## Task 3: Docs and changelog (main loop)

- `docs/guides/publish-and-discard.md`: rewrite the "appears only on an entry that has
  unpublished changes waiting" sentence to the always-visible model and the guarded
  state's meaning.
- `docs/internal/admin-design-system.md`: the desk band recipe names the always-visible
  Publish and its guarded state.
- `CHANGELOG.md` under `## Unreleased`: both changes, behavior entries, no
  `Consumers must:` (no consumer action needed; say so).
- `docs/guides/upgrade-cairn.md`: the per-version behavior note at the next cut.
- Gates: the four doc gates plus `check:prose` (new UI string "Nothing new to
  publish").

## Exit

`npm run check` 0/0, `npm test` exit 0, `check:comments`, `check:prose`, doc gates,
reviewer fan-out (svelte-reviewer, daisyui-a11y-reviewer), code-simplifier, then merge
to `main`. Release follows separately (`cairn-release`): Geoff wants this published and
all three consumer sites (ecxc, 907-life, aksailingclub-org) bumped and deployed.
