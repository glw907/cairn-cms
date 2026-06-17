# Plan: media Phase 3b, the hero frontmatter image field

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch, and upshifts a dispatch (`model: opus`) only for the high-blast tasks
> the plan flags. Honor the cairn conventions and the `cairn-pass` ritual. Steps are tracked with
> checkboxes (`- [ ]`).

**Goal:** Give a Post or Page a hero image set in frontmatter as a nested `image: { src, alt, caption }`
object, set through the 2b picker in the details slide-over, resolved at delivery, and unified with the
SEO social-card image so a concept sets one image once.

**Architecture:** `image` is a new built-in `FrontmatterField` variant decoded, validated, and typed end
to end on the data side, never mutated in place. A frontmatter `media:` reference resolves in the delivery
read path through an injected resolver into a separate `heroImage` projection (the on-disk token stays
canonical). The SEO head reads that resolved projection as the `og:image`, with `resolveImageUrl` hardened
against an unresolved token. The editor renders the field as a one-row resting state that opens the 2b
chooser dialog to edit. The site template owns the hero layout.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, the cairn content contract (`defineFields`/`defineAdapter`),
gray-matter (frontmatter serialize), the 2b media stack (`MediaPicker`, `MediaCaptureCard`, the `media:`
codec, `makeMediaResolver`), the delivery layer (`readSeoFields`, `resolveImageUrl`, `entryLoad`), Vitest
(unit + real-browser component), Playwright (the showcase E2E).

Source spec: `docs/superpowers/specs/2026-06-16-cairn-media-3b-hero-field-design.md` (the adversarially
reviewed design, with the contract each task must meet). The polished visual contract is
`docs/internal/design/2026-06-16-media-3b-hero-mockup.html`. Umbrella: the gallery spec
`docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`. Builds on the bundled media release
(`0.57.0`), which must be published before this pass executes.

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on a fresh feature worktree off `main` (off
the published `0.57.0` tip; one worktree per pass), the main loop reviewing each diff and clearing the
full gate (`npm run check` 0/0, `npm test` exit 0, the reference, signature, package, docs, readiness,
prose, and version gates) between dispatches. Effort: high.

Tasks 1, 3, and 5 are high-blast-radius: review closely and upshift to `model: opus` if the logic warrants.
Task 1 (the field-type data contract) is the discriminated-union variant plus the decode, read-back,
validate, and type-inference arms; the technical critique confirmed the standard one-variant-plus-decode-
plus-validate count undercounts here, and that `formValues` corrupts a nested object to `'[object Object]'`
without a dedicated arm. Task 3 (the delivery resolution) is the injected resolver and the no-mutate
`heroImage` projection; the critique confirmed frontmatter resolution has no home in the delivery layer
today. Task 5 (the editor hero field) is the resting-row plus edit-dialog UI and the 2b component reuse.

Tasks 8 (the polish) and 9 (the pass-end, whose adversarial review-gate workflow needs Geoff's "use a
workflow" opt-in) run in the main loop. The mockup step (the polished synthesis) is already done.

Build-dependency order: Task 1 (the field type) before 5, 6, 7. Task 2 (the `resolveImageUrl` guard) is
independent, do it early. Task 3 (resolution) before Task 4 (the SEO read consumes the resolved
projection). Task 5 (editor) before Task 6 (the needs-alt frontmatter signal lives in the same surface)
and Task 7 (the E2E drives the field).

A note on the version: 3b is additive but changes behavior (a new field type, the SEO unify, the
`resolveImageUrl` guard), so it is a new minor after `0.57.0`. Bump and cut it at pass-end per the release
process; do not bump mid-pass.

---

## Task 1 (high-blast, main loop reviews closely): the `image` field-type data contract

Spec: "The field type and the editor round-trip" (the touch-point list), locked decisions 1, 2, 4. The
editor render arm is Task 5; this task is the data side end to end.

**Files:**
- Modify: `src/lib/content/types.ts` (add the `ImageField` variant to the `FrontmatterField` union)
- Modify: `src/lib/content/schema.ts` (map `type: 'image'` in `FieldValue`/`InferFields` to the object shape)
- Modify: `src/lib/content/frontmatter.ts` (`frontmatterFromForm`: the decode arm)
- Modify: `src/lib/content/validate.ts` (`validateFields`: the validate arm)
- Modify: `src/lib/sveltekit/content-routes.ts` (`formValues`: the read-back arm, around line 437)
- Modify: `src/lib/content/concepts.ts` or the `defineFields`/`defineAdapter` site (the at-most-one-SEO-image guard)
- Test: `src/tests/unit/frontmatter.test.ts`, `src/tests/unit/validate.test.ts`,
  `src/tests/unit/content-routes.test.ts` (extend the relevant existing suites; use the nearest if a name differs)

Define the field shape and thread it through every arm. The `media:` value submits and stores as three
sub-fields under one key.

- The union variant in `types.ts`: an `ImageField extends FieldBase { type: 'image' }` (FieldBase already
  carries `name`, `label`, `required?`). Add an optional `seo?: boolean` (the field that feeds the social
  card; see Task 4). Add `ImageField` to the `FrontmatterField` union and update the union's doc comment.
  The stored value type is `{ src: string; alt: string; caption?: string }`.
- The decode arm in `frontmatterFromForm`: for `type: 'image'`, read the submitted sub-fields named
  `<field.name>.src`, `<field.name>.alt`, `<field.name>.caption`; assemble `{ src, alt }` plus `caption`
  only when non-empty; omit the whole key entirely when `src` is empty (no hero). The alt is stored
  verbatim (it is not markdown, so no escaping like the body alt needs).
- The read-back arm in `formValues` (around line 437): the default arm does
  `typeof value === 'string' ? value : value == null ? '' : String(value)`, which turns the object into
  `'[object Object]'`. Add an arm for an image field that returns the stored object as-is (the editor
  component reads `.src`/`.alt`/`.caption`), so opening an existing entry round-trips rather than
  corrupting it.
- The validate arm in `validateFields`: for `type: 'image'`, when the value is an object with a non-empty
  string `src`, normalize to `{ src, alt: alt ?? '' }` plus `caption` only when a non-empty string; drop
  the key when `src` is empty or the value is absent. Never fail validation on an empty `alt` (alt is debt).
  A malformed value (a string, or an object missing `src`) drops the key, never throws.
- The type inference in `schema.ts`: map `type: 'image'` in `FieldValue`/`InferFields` to
  `{ src: string; alt: string; caption?: string } | undefined`, so `Infer<schema>['image']?.src` typechecks.
- The SEO-image guard in `defineFields` or `defineAdapter`: throw when a concept declares more than one
  `image` field with `seo: true` (or, by the default rule, more than one image field named `image`); a
  clear error naming the concept. (Task 4 reads this flag.)

**Tests:**
- `frontmatterFromForm` assembles `{ src, alt, caption }` from the sub-fields; omits caption when empty;
  omits the whole key when `src` is empty.
- `formValues` returns the stored object unchanged for an image field (not `'[object Object]'`); a unit
  test asserts the round-trip `frontmatterFromForm` then `formValues` is stable.
- `validateFields` normalizes a valid object, never requires alt, and drops a malformed value without
  throwing.
- A gray-matter round-trip: `serializeMarkdown({ image: { src: 'media:a.0123456789abcdef', alt: 'x' } }, '')`
  then `parseMarkdown` returns the same object (the `media:` token survives quoting; an absent caption
  stays absent).
- `defineFields`/`defineAdapter` throws when two SEO image fields are declared on one concept.

**Gate:** the targeted tests green, the full gate (check 0/0, test exit 0, reference/signature/package/docs).

---

## Task 2: harden `resolveImageUrl` against an unresolved `media:` token

Spec: "The SEO unify" (the `resolveImageUrl` hardening), open risk 2. This is a small, pure, independent
safety fix; do it early.

**Files:**
- Modify: `src/lib/delivery/seo-fields.ts` (`resolveImageUrl`)
- Test: `src/tests/unit/seo-fields.test.ts` (or the nearest delivery test)

`new URL('media:photo.<hash>', origin).href` returns the token verbatim (verified) because `media:` is a
valid URL scheme, so an unresolved token would ship as `<meta property="og:image" content="media:...">`.
Harden `resolveImageUrl` so a value whose resolved scheme is not `http` or `https` returns `undefined`
rather than the token. Keep the existing behavior for a real absolute, protocol-relative, or root-relative
URL. Add a short comment naming the `media:`-token failure mode this guards.

**Tests:**
- `resolveImageUrl('media:photo.0123456789abcdef', 'https://x.test')` returns `undefined` (not the token).
- A root-relative path (`/media/a.hash.webp`) still anchors to the origin and returns an `https://` URL.
- An absolute `https://` URL passes through; a `javascript:` or other non-http scheme returns `undefined`.

**Gate:** full gate green.

---

## Task 3 (high-blast, main loop reviews closely): the delivery frontmatter-media resolution

Spec: "The delivery resolution," locked decision 5, open risk 1. The on-disk token stays canonical;
resolution is a separate projection.

**Files:**
- Modify: `src/lib/delivery/public-routes.ts` (`createPublicRoutes`/`entryLoad`: accept an injected
  `MediaResolve` in the deps; compute the `heroImage` projection)
- Modify: `src/lib/delivery/data.ts` and/or the entry-data type (add the `heroImage` projection field to
  the entry data the loader returns)
- Modify: `src/lib/content/concepts.ts` or wherever the concept's `fields` are reachable at read time (to
  find the declared `image` field by name and type)
- Test: `src/tests/unit/public-routes.test.ts` (or the nearest delivery/integration test)

The delivery read path has no media resolver today (the body resolver only visits mdast image nodes). Give
frontmatter resolution an explicit home:

- Add an optional `resolveMedia?: MediaResolve` to the public-routes deps (the type from
  `src/lib/render/resolve-media.ts`). A site builds it from its committed `media.json` exactly as it builds
  the body `publicMediaResolver` (the showcase wiring in Task 7 shows the call site).
- In `entryLoad`, for each declared `image`-type field on the concept whose stored value has a `media:`
  `src`, resolve `src` through `parseMediaToken` plus the injected resolver to a delivery path, and expose
  a derived `heroImage: { url, absoluteUrl, alt, caption }` on the returned entry data (key it by field
  name if more than one image field is possible; the single hero is the common case). `url` is the
  root-relative `/media/<slug>.<hash>.<ext>`; `absoluteUrl` is that anchored to the site origin (reuse
  `resolveImageUrl` with the origin the loader already has). Carry `alt` and `caption` from the stored
  object.
- Do not mutate `entry.frontmatter`: `entry.frontmatter.image.src` stays the `media:` token. The projection
  is additive. When media is off or the ref does not resolve, `heroImage` is `undefined` (no throw).

**Tests:**
- A loaded entry with `image: { src: 'media:a.0123456789abcdef', alt: 'x', caption: 'y' }` and a resolver
  that maps the hash produces `heroImage.url === '/media/a.0123456789abcdef.webp'` (or the slug path) and
  `heroImage.absoluteUrl` is the origin-anchored `https://` form, with `alt`/`caption` carried.
- `entry.frontmatter.image.src` is still the `media:` token after the load (not mutated).
- An unresolved hash (or media off) yields `heroImage === undefined`, no throw.

**Gate:** full gate green (the integration layer runs in workerd; confirm the loader test runs there if
that is where entry-load tests live).

---

## Task 4: the SEO unify (read the structured field as the social card)

Spec: "The SEO unify," locked decision 3. Depends on Task 2 (the guard) and Task 3 (the resolved projection).

**Files:**
- Modify: `src/lib/delivery/seo-fields.ts` (`readSeoFields`/`SeoFields`: read the structured `image`)
- Modify: `src/lib/delivery/seo.ts` (the head builder, if it needs the resolved URL and the alt threaded in)
- Test: `src/tests/unit/seo-fields.test.ts` (extend)

Extend `readSeoFields` so the social-card image comes from the SEO-flagged image field:
- When the entry's `image` field is the structured object, take the resolved `heroImage.absoluteUrl` (from
  Task 3) as the social image and carry `image.alt` as the `twitter:image:alt`. The loader passes the
  resolved projection in, or `readSeoFields` is given the resolved value; keep the read pure (it already
  takes `frontmatter: Record<string, unknown>`, so thread the resolved hero alongside, or read it from the
  entry data the head builder has).
- When `image` is a bare string, keep the current behavior (the existing `resolveImageUrl` path), so a site
  on the old string field is unchanged (back-compat).
- The field feeding the social card is the `seo`-flagged image field (Task 1), defaulting to the field
  named `image`. A concept with no SEO image field emits no `og:image`.

**Tests:**
- An entry with a structured `image` and a resolved `heroImage` emits `og:image` = the absolute resolved
  URL and `twitter:image:alt` = the alt.
- An entry with a bare-string `image` still emits `og:image` = the origin-anchored string (back-compat).
- An entry whose only image field is not SEO-flagged (and not named `image`) emits no `og:image`.
- An unresolved structured hero emits no `og:image` (the Task 2 guard plus the `undefined` projection).

**Gate:** full gate green.

---

## Task 5 (high-blast, main loop reviews closely): the editor hero field

Spec: "The field type and the editor round-trip" (the editor render arm), the polished mockup. cairn stays
markdown-first: the field edits structured data; the dialog reuses the 2b components.

**Files:**
- Create: `src/lib/components/MediaHeroField.svelte` (the field: resting row plus the edit dialog)
- Modify: the frontmatter-field rendering in `src/lib/components/EditPage.svelte` (find where `data.fields`
  renders each `FrontmatterField` by `type`; add the `image` arm rendering `MediaHeroField` with hidden
  inputs named `<field.name>.src`/`.alt`/`.caption` so the decode arm reads them)
- Modify: `MediaHeroField` reuses `src/lib/components/MediaPicker.svelte` and
  `src/lib/components/MediaCaptureCard.svelte`; wire the chosen `{ alt, ref }` into the field state, not the
  editor body (the 2b `registerInsertImage` host wiring is the reference for the component API)
- Test: `src/tests/component/MediaHeroField.test.ts`

Build `MediaHeroField` per the polished mockup (`2026-06-16-media-3b-hero-mockup.html`):
- Props: the field descriptor (`name`, `label`), the initial value (`{ src, alt, caption } | undefined`),
  and the `mediaLibrary` projection (for the resolved thumbnail, reusing the 2b library entry shape).
- Resting state when `src` is set: one row at sibling weight (the resolved thumbnail, the name, an
  alt-status chip [Described in `--color-positive-ink`, Needs alt in `--cairn-warning-ink`, or Decorative,
  each a glyph plus a label, never hue alone], and an Edit control), with the caption shown beneath as a
  read-only preview. Empty state: a slim labeled dropzone ("Add a hero image") plus one plain unify line.
- Edit/Add/Replace opens a headless `<dialog class="modal">` (the Dialog recipe, mounted outside the edit
  form) holding the chooser (`MediaPicker` upload plus combobox) and, after a pick, the capture surface (a
  16:9 preview of the resolved image, the describe-or-decorative alt radiogroup reusing `MediaCaptureCard`'s
  model, the caption input, Replace/Remove as quiet text controls beneath the preview). Confirming sets the
  field's hidden inputs; nothing commits until the entry's Save. Drop the body-insert Name field; a hero
  references an already-named library asset.
- The hidden inputs (`<field.name>.src`/`.alt`/`.caption`) carry the value so the form submit reaches the
  Task 1 decode arm. Mark a field edit dirty the way the other details fields do (the `fieldsDirty` flag).
- Keyboard and a11y: the dialog gets the native focus trap and Escape; the alt radiogroup is keyboard
  operable with `aria-checked`; the resting controls are reachable; the alt-status chip carries a glyph.

**Tests (real browser):**
- The field renders the resting row from an existing value (thumbnail, name, the right alt-status chip,
  the caption preview), one row at rest.
- The empty state shows the dropzone; opening it shows the chooser dialog.
- Choosing describe vs decorative and confirming sets the hidden inputs to the expected `{ src, alt,
  caption }`; the inner `media:` ref is unchanged from the picked record.
- The component is the persistent field, not a contextual toolbar; no `@codemirror` import leaks (the
  editor-boundary test covers the module set).

**Gate:** full gate green, the editor-boundary test green, the prose gate (the field's copy) green.

---

## Task 6: the needs-alt frontmatter signal

Spec: "The needs-alt surface, extended to the hero," open risk 5. The body scanner stays unchanged.

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (the needs-alt notice: add the hero signal and a row whose
  action focuses the hero alt input)
- Modify: `src/lib/components/MediaHeroField.svelte` (expose a way for the host to focus the alt input, for
  example a bindable focus method or an id the notice targets)
- Test: `src/tests/component/MediaHeroField.test.ts` (extend), `src/tests/unit` if a pure hero-needs-alt
  predicate is added

The 2b `findMediaImagesNeedingAlt` is body-parse-only and returns body offsets; a frontmatter hero has no
body offset, so do not route it through that scanner. Instead:
- Compute the hero needs-alt signal from the form state: an `image` field present with a non-empty `src`
  and an empty or whitespace `alt` (and not marked decorative). Keep it a small pure predicate if practical.
- Add a distinct row to the needs-alt notice for the hero, whose action focuses the hero's alt input (open
  the field's edit dialog to the alt control, or focus the resting alt affordance), never `selectRange`
  (which is a body offset). The headline count sums the body hits and the hero signal.
- The notice stays non-blocking (the 2b stance): it never stops a save or a Publish.

**Tests:**
- A hero with empty alt contributes to the needs-alt count; a described or decorative hero does not.
- The hero notice row's action focuses the hero alt input (assert focus moves into the field, not the body).
- The body scanner's existing behavior and tests are unchanged.

**Gate:** full gate green.

---

## Task 7: the showcase vertical slice and the E2E

Spec: Verification.

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts` (declare an `image` field on a concept; wire the
  delivery `resolveMedia` into the public-routes deps, mirroring `publicMediaResolver`)
- Modify: the showcase concept schema and a template that renders the hero from `heroImage`
  (`examples/showcase/src/routes/(site)/[...path]/+page.svelte` or the concept's page)
- Create or modify: `examples/showcase/e2e/media-hero.spec.ts`
- Modify: `examples/showcase/src` SEO wiring only if needed (the head already builds from `readSeoFields`)

Extend the showcase behind `SHOWCASE_FAKE_BACKEND=1` (reuse the 2b fake R2 and fake-github, the seeded
post, the real decodable PNG). In a fresh post (the `media-figure.spec.ts` isolation pattern): set a hero
through the field (open the dialog, upload or pick, write alt and caption, confirm). Assert the editor's
hidden inputs and the saved frontmatter carry `image: { src: media:..., alt, caption }`. Saving commits the
nested frontmatter plus `media.json` (assert both in the fake-github recorder). Load the public page and
assert the hero renders (the template's `<img src="/media/...">` from `heroImage.url`) and the document head
carries `<meta property="og:image">` with the absolute resolved URL. Keep the 2b and 3a E2E specs green.

**Tests:** the E2E green in a real browser; the standing engine gate green.

**Gate:** the showcase E2E suite green (one worker), `npm run check` 0/0, `npm test` exit 0.

---

## Task 8 (main loop): the frontend-design polish pass

Spec: Verification (the polish note).

With the hero field rendering in the showcase admin in both themes, run the `frontend-design` polish over
the real rendered field against the polished mockup (`2026-06-16-media-3b-hero-mockup.html`) and the
editor-shell gold standard: the resting row, the empty dropzone, the edit dialog with the 16:9 preview, the
alt-status chip, in both themes. Fold refinements into `MediaHeroField` and confirm the alt-status chip and
the needs-alt ink hold contrast in both themes.

**Gate:** full gate green after any fold-in.

---

## Task 9 (main loop): pass-end ritual

Simplify (code-simplifier over the pass's changed code), the review gate (the relevant reviewers in
parallel: `svelte-reviewer`, `daisyui-a11y-reviewer`, plus a render/delivery-correctness pass over the
resolution and the SEO unify; the `web-auth-security-reviewer` is not needed, since no auth changes;
suggest the adversarial review-gate workflow for Geoff's opt-in), the live admin smoke if proportionate
(the field is presentation plus a delivery read; the E2E plus both-theme captures may cover it, the 2b/3a
judgment), the docs arm (a hero guide section, the editor and admin-design-system docs for the hero field,
the reference for the `image` field type and the `seo` flag, the explanation arm for the unify and the
resolve-don't-mutate rule, the changelog entry for the new field type plus the SEO unify plus the
`resolveImageUrl` hardening as a behavior change, the upgrade-guide entry for declaring the field plus the
optional string-to-structured migration, the three doc gates), the version bump to the next minor after
`0.57.0`, and the tracking (the post-mortem in this plan, STATUS on `main`, the gallery memory). Cut the
release per the release process (`gh release create`), Geoff's call.

---

## Carry-forward (into Phase 3c and beyond)

- **Phase 3c (the gallery component):** a site-defined registry component with ordered tiles referencing
  library assets, each with its own alt and caption; gallery-from-library first, gallery-with-bulk-upload
  after the batch-coalesced ingest (2b open risk 5). Reuses the caption-plus-alt model.
- **The social-card crop variant:** when transforms are on, the SEO head could request a 1200x630 social
  variant of the hero through the Cloudflare Images transform URL. Deferred from 3b (transforms off by
  default).
- **A second image field per concept (a `cover` separate from the social `image`):** the field type and
  the resolution key by field name already allow it, and the SEO `seo` flag picks which feeds the social
  card. No further work needed unless a concept wants it.
- **Delivery resolution honors a renamed `seo`-flagged field.** `deriveHeroImage` resolves the `image`
  key today (the back-compat SEO default). The schema layer validates a renamed `seo: true` hero (e.g.
  `cover`) and the editor renders it, but delivery does not yet resolve a non-`image` key, since the
  field declarations are not reachable in the delivery read path. The review gate flagged this as a
  cross-layer mismatch; it is harmless now (every consumer uses `image`) and documented in
  `deriveHeroImage`. Closing it means threading the concept's SEO image field name into the delivery
  deps (per-concept, since `createPublicRoutes` is global). Bundle with the second-image-field work.
- **Persist the decorative choice in frontmatter.** A decorative hero commits `alt: ''`, the same as a
  left-blank hero, so on reload it reads as needs-alt (the editor cannot tell them apart). This matches
  the 2b body-image model (decorative and blank both commit empty alt). A future pass could add a
  `decorative: true` sub-key to the stored object so the choice survives a reload; the `MediaHeroField`
  `decorative` prop seam is already in place for it.

---

## Post-mortem (landed 2026-06-17)

**What was built.** The frontmatter hero image field, end to end. A Post or Page carries a hero as a
nested `image: { src, alt, caption }` object, a new built-in `image` `FrontmatterField` variant threaded
through every arm (the union + `seo?` flag, the `FieldValue`/`InferFields` type map to `ImageValue`, the
`frontmatterFromForm` decode, the `formValues` read-back that the default arm would have stringified to
`'[object Object]'`, the `validateFields` normalize + required-on-`src` enforcement, and the
at-most-one-SEO-image guard in `defineFields`). The delivery read path takes an injected `resolveMedia`
and derives a `heroImage` projection (`url`, `absoluteUrl`, `alt`, `caption`) without mutating
`entry.frontmatter` (the `media:` token stays canonical). The SEO head reads the resolved hero as the
`og:image` + `twitter:image:alt`, with `resolveImageUrl` hardened to reject a non-http(s) result so an
unresolved token never ships as a tag. `MediaHeroField.svelte` is the editor field: a one-row resting
state, an empty dropzone, and a native-`<dialog>` chooser + placement view reusing `MediaPicker` and
the `MediaCaptureCard` alt model. The needs-alt notice extends to the hero from form state (no body
offset). The showcase declares the field, wires the resolver, renders the hero, and migrates the seeded
hello post; a new `media-hero.spec.ts` proves the field round-trip and the public render.

**Verified (evidence, first-hand).** Full gate green at the tip: `npm run check` 975 files 0/0; `npm test`
185 files / 1957 tests exit 0 (the first run hit the documented `@vitest/browser` rpc-closed teardown
flake; a clean re-run confirmed 1957/1957 exit 0); the showcase Playwright E2E 16 passed in a real
browser (the new `media-hero.spec.ts` plus the unchanged 2b/3a/golden specs); `check:reference`,
`check:package`, `check:docs` (62 files), and prose all green. Nine plan tasks, the code-simplifier pass,
a three-reviewer gate, and the docs arm.

**Review gate.** Three parallel reviewers (svelte, daisyui-a11y, an Opus delivery/data-contract
correctness pass). One CRITICAL: `--color-positive-ink` was referenced by the Described chip but lived
only in the mockup, never carried into `cairn-admin.css`, so the chip fell back to body ink; fixed by
defining the locked-pair token in both themes (light ~4.9:1, dark ~7:1 on base-100). Two IMPORTANTs:
the alt radiogroup had no `name`, so native arrow-key navigation was broken (fixed with a
component-unique name the decode arm ignores); and `required` was unenforced on the image arm against
its non-optional inferred type (fixed to enforce on `src`, alt stays debt). The Opus pass and svelte
reviewer both flagged the delivery-resolves-only-`image`-key limitation, now documented and carried
forward. Minors folded (the `heroNeedsAlt` record invariant comment). The E2E itself caught a real
reactive loop in the needs-alt `$effect` during Task 7 (a fresh host callback identity re-fired the
effect, which re-rendered the host); fixed by reading the signal reactively and calling the callback
through `untrack`. The component tests had missed it because they mount with a stable callback.

**Decisions locked.** The hero is a structured nested-object field, not a string; resolution is a
derived projection that never mutates the on-disk token; one image serves both the lead and the social
card via the `seo`-flagged field (default `image`); alt is debt, never a save block; the editor field
carries no `<form>` (name-less dialog inputs + named hidden inputs) to stay legal inside the edit form;
the field replicates the `MediaCaptureCard` alt model rather than mounting it (nested-form rule + the
dropped name field). Version held at `0.57.0`: the bundling decision (STATUS + the pass directive)
supersedes the plan's pre-bundling "bump to the next minor" note; the whole media stack ships in one
release when Phase 3 is complete. Live admin smoke deferred to the first site cutover (presentation +
a delivery read, covered by the E2E and the both-theme token reasoning), matching the 2b/3a judgment.
