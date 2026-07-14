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

## Task 4: New-entry create flow correctness (added mid-pass from live ecxc report)

Three reported symptoms on creating a new post, two root causes.

Root cause A: `createAction` (`content-routes-core.ts` ~512) collects the create
dialog's `title` but drops it. It validates, derives the id from the slug, and redirects
to `?new=1` carrying only the id. So the new-doc `editLoad` seeds the title field from
the schema default (blank), and `EditData.title` falls back to the id. Symptoms: the
editor's title field opens blank, and the breadcrumb shows the address (id) rather than
the title (which read as "correct in the top bar" because the id looks like the typed
title).

Root cause B: the `status` derived in `EditPage.svelte` (~931) returns `'Published'`
whenever `!data.pending`. A brand-new never-saved entry is `pending: false, published:
false`, so it wrongly reads "Published"; it should read "New".

Outcome:

- Thread the typed title through create. `createAction` redirects with
  `?new=1&title=<encodeURIComponent(rawTitle)>` (the raw title before slugification; it
  may differ from the slug when the author set an explicit address). `editLoad`, when
  `isNew`, reads the `title` search param and layers it into `loadFrontmatter` over the
  schema defaults and under any parsed frontmatter (a blank new doc has none); an
  empty/whitespace param is ignored. The id and address are unchanged. `EditData.title`
  reads from the seeded `loadFrontmatter` (not `parsed.frontmatter`), so the breadcrumb
  and the `sr-only` h1 show the real title. On first Save the existing `name="title"`
  field posts that value; no create-time file write is added (the reserve-address model
  holds).
- Fix the status derived: `data.pending ? (data.published ? 'Edited' : 'New') : (data.published ? 'Published' : 'New')`. A new entry reads "New" (badge-info), matching ConceptList's vocabulary.

Not in scope (a design question raised separately, not a bug): whether the address
should live-track title edits in the editor after creation. The address is committed at
create time; live rename-on-type carries collision and history implications. Once the
title displays correctly, the breadcrumb shows the title and the confusion resolves.

Also fold in the two optional review nits on Task 1:

- Add a Ctrl+Shift+S chord test (the guard moved from `!data.pending` to
  `!publishActionable`): the chord no-ops when guarded, and calls the form's submit
  through the Publish submitter when actionable.

Tests:

- `content-routes-list.test.ts`: the existing `createAction` redirect assertions now
  expect the `&title=` param; a new-doc `editLoad` with `?new=1&title=Hello%20World`
  seeds `frontmatter.title` and `EditData.title` to `Hello World`, not the id. Update
  `cairn-admin-actions.test.ts:199`'s exact-redirect assertion for the param.
- A component test (EditPage or the desk harness): the status badge reads "New" for a
  new entry (`pending:false, published:false, isNew:true`), "Published" for
  `published:true, pending:false`, "Edited" for `pending:true, published:true`.
- The chord test above.

## Exit

`npm run check` 0/0, `npm test` exit 0, `check:comments`, `check:prose`, doc gates,
reviewer fan-out (svelte-reviewer, daisyui-a11y-reviewer), code-simplifier, then merge
to `main`. Release follows separately (`cairn-release`): Geoff wants this published and
all three consumer sites (ecxc, 907-life, aksailingclub-org) bumped and deployed.
