# Fragments: reusable content design (2026-07-15)

Ratified in the 2026-07-15 Fable brainstorm (Geoff's calls recorded inline). Execution model:
this spec plus its plan hand off to an Opus-conducted session, which executes per `cairn-pass`
on a worktree off `main`. The plan is the handoff artifact.

## Premise check (the charter gate)

Fragments is managing markdown content, cairn's core job. It adds no actor, no auth, no domain
logic, and no open-ended collection mechanism. The 2026-05-28 content-concepts design already
locked the shape ("non-routable reusable markdown, pulled into other content via an include
directive, with no frontmatter beyond a name") and the functional spec reserved the seams for
it. This pass builds what was reserved, nothing more.

## The driver

The ASC site maintains `docs/fragment-candidates.md`: nine concrete reuse cases with canonical
wordings already converged (mooring cost, club address, storage fees, club-boat ground rules,
the life-jacket rule, camping facts, the "Contact us" page-cta closer, the class registration
path, the Discord channel vocabulary). Eight of nine are block-shaped directive clusters with
fixed content. ASC's standing policy (Geoff, 2026-07-15) duplicates freely until cairn ships
fragments, then consolidates. ASC is the first consumer and its candidates file is the
acceptance reality-check for this design.

## Ratified calls (Geoff, 2026-07-15)

1. **Live reference.** Entries include a fragment by name; every entry renders the current
   published version. Editing the fragment once updates every page on next publish/deploy.
   Not copy-at-insert.
2. **Fragments only.** No parameterized component presets. One mechanism covers all three
   seed shapes, because presentation in cairn travels as directive markup inside markdown:
   a plain-text fragment inherits local styles; a fragment whose body is a `:::facts` block
   brings its own presentation; a fragment whose body is a card or CTA cluster is a full
   component with baked content.
3. **Block-level only in v1.** No inline (mid-sentence) includes. The deferred trigger is
   filed in ROADMAP: build inline when a site converges a real inline case (ASC's Discord
   vocabulary is the watch case).
4. **Placement: fragments live near Posts and Pages.** Admin nav puts the Fragments node in
   the Content group adjacent to Posts and Pages; the conventional content directory is a
   sibling (`src/content/fragments`).

## Design

### 1. The concept

A site opts in by declaring a concept under the key `fragments` in `content:`, per the
functional spec's promise ("one key and one descriptor, with no reshape of the contract or
the normalizer"):

- **Routing:** the already-reserved `'embedded'` shorthand: non-routable, not dated, never in
  feeds, no permalink.
- **Fields:** minimal, per the locked concepts design: a required `title` text field for the
  admin list. The body is the fragment's markdown. No other frontmatter.
- **IDs:** plain slugs, no date prefix (falls out of `'embedded'`, which is not dated).
- **Label:** defaults to "Fragments" (Geoff's working vocabulary); relabelable like any
  concept.
- **Validation:** if a concept is declared under the `fragments` key with routable or dated
  routing, construction throws (the same construction-throw idiom as `navLayout`). The
  include directive resolves against this key, so its shape must hold.

### 2. The include directive

`::include{fragment="<id>"}`, a leaf directive: no body, no title, no slots, one required
`fragment` attribute carrying the fragment's id.

- **Engine built-in.** `include` joins `figure` as a reserved name the component registry
  rejects; a site never declares it.
- **Editor insertion.** The editor palette gains an "Include a fragment" entry backed by a
  picker listing the site's fragments by title (the link-picker pattern; fragment targets
  ride `EditData` the way link targets do). Picking one stamps the directive at the cursor.
- Available only when the site declares a `fragments` concept; absent otherwise (truthful
  visibility, the tidy-button principle).

### 3. Resolution

A remark-stage plugin following the `LinkResolve`/`MediaResolve` callback pattern: the engine
supplies a resolver backed by the committed content corpus; the plugin replaces each include
node with the fragment body's parsed block nodes.

- **Ordering is load-bearing.** Include resolution runs before directive stamping and before
  link/media resolution, so a fragment body containing `:::facts` blocks, `cairn:` links, or
  `media:` tokens participates fully in the rest of the pipeline. This ordering is what makes
  seed shapes 2 and 3 fall out of shape 1.
- **No nesting in v1.** Saving a fragment whose body contains `::include` is rejected at
  validation with an honest editor-voiced message. This also makes include cycles
  structurally impossible.
- **Missing fragment:** in the admin preview, a visible calm notice names the missing id; on
  the public site, the include renders nothing and the engine emits a structured log event in
  the existing vocabulary (a `render.` or equivalent event named at implementation, added to
  `docs/reference/log-events.md` in the same pass). No error string ever reaches a visitor.
- **Published corpus only.** An entry's preview and the public render both resolve includes
  from the published (`main`) corpus. A fragment's pending edits show only in that fragment's
  own preview until published. Publishing the fragment is the moment every consuming page
  updates, which is the live-reference semantics ratified above.

### 4. Manifest and guards

- Manifest entries gain an additive optional `includes` field: the fragment ids extracted
  from the entry body at manifest build, the same extraction pass shape as `links`.
- **Delete guard:** deleting a fragment with inbound includes is blocked, the `inboundLinks`
  pattern extended.
- **Usage visibility:** the fragment's edit screen shows where it is used ("Used in N
  entries", listing them), read from the manifest.

### 5. Admin surface

The concept-agnostic admin routes give fragments a list, editor, live preview, per-entry
`cairn/fragments/<id>` branch, and the deliberate publish flow with no new route machinery.
The Fragments nav node sits in the Content group adjacent to Posts and Pages (Geoff's
placement call; consistent with the taxonomy razor: authored/owned content belongs to
Content). A fragment's own preview renders its body through the site's renderer, so the
editor sees the styled result while editing.

### 6. Showcase exemplar

The showcase declares a `fragments` concept and at least one fragment included from a post
and a page, serving as the worked exemplar in docs, the e2e gate, and the admin-visual
surface for any new UI (the picker). Baselines regenerate on CI per the standing process.

### 7. Documentation

- Reference: the `fragments` concept config and the `::include` directive (new or extended
  reference page; `check:reference` and `check:reference:signatures` green).
- Guide: "Reuse content across entries" (declare the concept, author a fragment, include it,
  edit-once-updates-everywhere, the delete guard).
- Log events reference gains the missing-fragment event.
- CHANGELOG under `## Unreleased`; new subsystem and public surface, so the window sizes as
  a minor when a release is eventually cut (verify the number free at that time). Zero
  `Consumers must:` lines expected: the whole surface is additive and opt-in.
- ROADMAP: mark the reusable-content Next entry shipped when the pass lands; file the
  inline-include deferred trigger.

### 8. Testing

- Unit: the resolution plugin (splice, ordering ahead of stamp/link/media, missing id,
  nesting rejection at validation), the reserved-name rejection, manifest `includes`
  extraction, the construction throw on a mis-declared `fragments` key.
- Integration: fragments save/publish flow end to end (branch, manifest, publish), the
  delete guard, published-corpus-only preview resolution.
- Component: the picker and palette entry.
- e2e: the showcase exemplar renders the included fragment on the public page and in the
  admin preview.
- Gates: the full standing lattice (`check` 0/0, `npm test` exit 0, `check:comments`,
  `check:reference`, `check:reference:signatures`, `check:package`, `check:docs`,
  `check:snippets`, `check:surface` with the regenerated snapshot committed).

## Out of scope (deliberate)

- Parameterized component presets (no production case; the charter holds surface until a
  driver appears).
- Inline includes (deferred with a ROADMAP trigger; ASC Discord vocabulary is the watch
  case).
- Fragment-in-fragment nesting (validation-rejected in v1).
- Cross-concept include targets (the directive resolves only against the `fragments` key).
- Any ASC content migration (that is ASC's own site pass, driven by its candidates file,
  after this ships and ASC bumps).
