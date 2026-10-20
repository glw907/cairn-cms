# cairn media gallery, Phase 3b: the hero frontmatter image field

Date: 2026-06-16. Status: designed and approved (Geoff, 2026-06-16) after a Workflow fan-out (three
divergent UI mockups) and two adversarial Opus critics, one on the UI/UX and one on the technical
design. The technical critic found real holes in the first sketch; this spec is the reshaped design that
closes them. It is the second slice of Phase 3 "placements," after 3a (the inline figure), and stays
under the umbrella gallery spec (`2026-06-15-cairn-media-gallery-design.md`).

## Summary

3b gives a Post or Page a hero image: a lead picture set in frontmatter, separate from the body. An
author sets it in the editor's details slide-over through the same 2b picker and capture flow, with the
same alt model. The value is a nested object, `image: { src, alt, caption }`, where `src` is a 2b
`media:` reference, `alt` is the screen-reader description, and `caption` is an optional line the site
template may show. One image serves two jobs: it leads the page (the template renders it) and it is the
social-card image (the engine's SEO head emits it as `og:image`). The site template owns the hero
layout, so the field carries no placement role.

This slice reuses the caption-plus-alt-plus-picker model 3a and 2b designed, and it unifies the new hero
field with the existing string `image` SEO field, so a concept sets one image, once.

## What this is not

cairn stays markdown-first and not WYSIWYG (the `cairn-not-wysiwyg-best-markdown` memory). The hero is a
frontmatter field, so a form is the right surface, but the field still edits structured data the author
can read in the committed frontmatter, never a drag-and-resize canvas. The hero render on the page is the
site template's, not cairn's: 3b ships the field, the resolved data, and the social-card wiring, never a
hero layout or a placement role. Float, alignment, and width are not part of a hero (those were the 3a
inline-figure concern, and a hero has a designed slot instead).

## The design exploration and what it settled

A Workflow built three divergent mockups of the editor field: A, the hero as a consistent inline field
at sibling weight; B, a prominent lead-image card pinned above the panel; C, the 2b chooser echoed inline.
An adversarial UI critic judged them against the gold-standard details panel and chose A, because the
gold standard already carries a plain "Social image" field in its flat field stack and the hero is the
product evolution of exactly that field. B inverted the panel's hierarchy (a field card floating above the
panel's own eyebrow) and drifted into generic-uploader aesthetics (on-image control pills with unguaranteed
contrast); C contradicted the 2b surface model (it pinned the whole chooser open inline) and imported two
body-insert artifacts a frontmatter field has no use for (a re-editable Name field and a per-field Done
commit). The polished design (`docs/internal/design/2026-06-16-media-3b-hero-mockup.html`) takes A's
altitude and surface model, grafts C's one-row settled resting state, and grafts B's one good idea (a real
16:9 crop preview) but confines it to the edit surface.

A separate adversarial technical critic ran the proposed engine design through the real code and found
three confirmed blockers. Two were verified first-hand here (the `resolveImageUrl` token pass-through and
the `formValues` object stringify); the third (frontmatter resolution has no home in the delivery layer)
is confirmed by the code structure. They are locked into the design below as required hardening rather than
left for the build to discover.

## Locked decisions

1. **The carrier is a nested-object frontmatter value, `image: { src: media:slug.hash, alt, caption }`.**
   `src` is a 2b `media:` reference; `alt` is the screen-reader description; `caption` is optional. The
   nested object groups the three related values, scales to a second image field without prefix soup, and
   reads cleanly when hand-edited. It round-trips cleanly through the gray-matter serialize and parse the
   save path already uses (the `media:` token auto-quotes, an empty caption omits, a bare-string `image`
   still parses).

2. **`image` is a built-in field type, a new variant of the `FrontmatterField` union.** A concept declares
   it through `defineFields` exactly like `text` or `date`. It is engine-owned (the `media:` codec, the
   picker, and the resolver are all engine), not the site `FieldTypeDef` extension seam. Adding it touches
   more than the usual two arms, and the plan must hit every one (see "The field type" below).

3. **One image, both uses (the SEO unify).** The hero field is the single image a concept sets. The
   engine's SEO head reads its resolved URL as the `og:image` and `twitter:image`. A bare string `image`
   field still works (back-compat), and a site can still set an explicit SEO image to override. Which field
   feeds the social card is an explicit, declared choice, never name-magic (see "The SEO unify" below).

4. **Alt is debt, never a save block** (the 2b stance, the `cairn-image-gallery-initiative-placement`
   memory). Setting a hero never blocks a save. A hero with empty alt is counted by the needs-alt notice,
   which the editor extends to frontmatter. Decorative stays an explicit choice. Alt and caption are
   distinct: alt is for screen readers, the caption is shown to everyone.

5. **The on-disk frontmatter is never mutated in place by resolution.** The committed `image.src` stays the
   canonical `media:` token. Resolution to a delivery URL is a separate derived projection, so the token's
   rename-stability is never destroyed and a re-serialize never writes a resolved URL back to git.

6. **The site template owns the hero layout.** 3b adds no render step and no placement role. The template
   reads the resolved hero and lays it out however it wants.

## The pieces

### 1. The field type and the editor round-trip

`image` joins the `FrontmatterField` discriminated union in `src/lib/content/types.ts` as
`ImageField { type: 'image'; name; label; required? }`. The CLAUDE.md note that a field type is "one
variant plus one decode arm plus one validate arm" undercounts for a structured field. The plan must hit
every touch point, or the field is silently dropped or mistyped:

- The union variant in `types.ts`.
- The decode arm in `frontmatterFromForm` (`src/lib/content/frontmatter.ts`) assembles
  `{ src, alt, caption }` from the submitted sub-fields, omits an empty caption, and omits the whole
  `image` key when `src` is empty (no hero). The default arm reads a single string and is wrong here.
- The read-back arm in `formValues` (`src/lib/sveltekit/content-routes.ts`) projects the stored object to
  its sub-field inputs. The default arm is `typeof value === 'string' ? value : value == null ? '' :
  String(value)`, which turns a nested object into the literal `'[object Object]'` (verified), corrupting
  an existing hero the moment its entry is opened.
- The validate arm in `validateFields` (`src/lib/content/validate.ts`) normalizes the object (omit an empty
  caption, omit the key when `src` is empty, never require `alt`). Without it the default string arm drops
  the object from the normalized data and the field never reaches git.
- The type inference (`FieldValue` and `InferFields` in `schema.ts`) maps `type: 'image'` to the object
  shape, or a typed read of `entry.image.src` is a type error.
- The editor render arm, the hero field component in the details slide-over.

The editor field follows the polished mockup. At rest, when a hero is set, it is one row at sibling weight:
a small thumbnail, the name, an alt-status chip (Described, Needs alt in `--cairn-warning-ink`, or
Decorative, each a glyph plus a label, never hue alone), and an Edit control, with the caption shown
beneath as a read-only preview. Empty, it is a slim dropzone ("Add a hero image") at the weight of a
sibling field, with one plain line stating the image is also the social card. Add, Replace, or Edit opens
the 2b chooser as a centered dialog (upload first, the `MediaPicker` combobox below). After a pick or an
upload, the capture surface shows a real 16:9 preview of the crop, the describe-or-decorative alt choice
(the 2b `MediaCaptureCard` model), and the caption; Replace and Remove are quiet text controls beneath the
preview, never floated on the image. The dialog reuses `MediaPicker` and `MediaCaptureCard`; the only new
wiring is that the chosen `media:` reference, alt, and caption flow into the field's hidden form inputs
instead of into the editor body. Confirming the dialog sets the field; nothing commits to git until the
entry's own Save, so the field has no per-field commit of its own.

### 2. The delivery resolution

A frontmatter `media:` reference has no resolution home today. The body resolver (`remarkResolveMedia`)
only visits mdast `image` nodes in the rendered body, and the delivery read path
(`createPublicRoutes` and `entryLoad`, the feed and manifest builders) carries no media manifest and no
resolver. The proposed "the read path resolves it" was a hand-wave the critic caught.

3b gives it an explicit home: the delivery read path takes an injected `MediaResolve` in its deps, built
by the site from its committed `media.json` exactly as the site already builds the body
`publicMediaResolver`. The read path resolves a declared `image`-field reference to its delivery URL and
exposes it as a separate derived projection on the entry data, for example
`heroImage: { url, absoluteUrl, alt, caption }` computed in `entryLoad`. The on-disk
`entry.frontmatter.image.src` stays the canonical `media:` token (locked decision 5); the template reads
`heroImage.url` (root-relative for an `<img>`), and the SEO head reads `heroImage.absoluteUrl`. One
resolved value cannot serve both the root-relative `<img>` and the absolute `og:image`, so the projection
carries both. This mirrors the existing `ContentSummary.tags` versus `frontmatter.tags` split the codebase
already documents.

### 3. The SEO unify

`readSeoFields` (`src/lib/delivery/seo-fields.ts`) reads a string `image` today and `resolveImageUrl`
anchors it to the origin. 3b extends the read to the structured field: when `image` is the nested object,
take `heroImage.absoluteUrl` (the resolved, origin-anchored URL) as the social-card image and `image.alt`
as the `twitter:image:alt`; when `image` is a bare string, keep the current behavior (back-compat).

`resolveImageUrl` must be hardened. `new URL('media:photo.<hash>', origin).href` returns the token verbatim
rather than throwing, because `media:` is a valid URL scheme (verified), so an unresolved token would ship
as `<meta property="og:image" content="media:photo.<hash>">` to production with no build failure and no
log. The fix is to reject a value whose scheme is `media:` (or any non-http or non-https) and return
undefined, so a still-unresolved reference degrades to no social image rather than a poisoned tag.
Resolution always runs before the SEO read, so a correctly wired site never hits this, and the guard is the
backstop.

Which field feeds the social card is explicit, not name-magic on the literal key `image`. The image field
descriptor carries an optional `seo?: true` flag, and the field so marked feeds the `og:image`. For
back-compat the field named `image` is treated as `seo: true` by default. A concept may declare at most one
SEO image field, and `defineFields` or `defineAdapter` validates this, so a site that names its hero
`cover` and expects a social card gets a clear error rather than a silent empty `og:image`.

### 4. The needs-alt surface, extended to the hero

The 2b scanner `findMediaImagesNeedingAlt` parses the body and returns body source offsets, and the edit
page's notice rows jump to a body offset through `selectRange`. A frontmatter hero has no body offset, so
it cannot reuse the scanner or the offset-keyed row. 3b computes the hero needs-alt signal separately from
the form state (an `image` field present with a `src` and an empty `alt`) and adds a distinct notice row
whose action focuses the hero's alt input, not a body range. The body scanner stays unchanged; the headline
count sums the two.

## Engine and contract changes

- A new built-in `image` `FrontmatterField` variant, with its decode, read-back, validate, type-inference,
  and render arms.
- An injected `MediaResolve` on the delivery read path, and a derived `heroImage` projection on the entry
  data, leaving `entry.frontmatter` unchanged (the canonical token stays).
- `readSeoFields` reads the structured `image` field (resolved) plus the back-compat string; the field
  feeding the social card is the explicit `seo`-flagged one, defaulting to the field named `image`.
- `resolveImageUrl` rejects a `media:` or non-http scheme, a behavior change that makes a still-unresolved
  reference degrade to no image rather than a broken tag.
- The needs-alt notice gains a frontmatter-hero signal in the editor, separate from the body scanner.

No new public component is added. The `media:` codec, the delivery route, the picker, and the capture card
are unchanged. The render output is unchanged (no hero render step; the template owns it). The consumer
action is the same as the bundled media release (wire the R2 bucket and the `/media` route), plus the
optional migration of a string `image` SEO field to the structured field.

## Accessibility

Alt and caption are distinct and both kept: alt is the screen-reader description, the caption is shown to
everyone. Alt is debt, surfaced by the needs-alt notice, never a block. The describe-or-decorative choice
is a radiogroup, and a decorative hero is an explicit choice. The edit dialog is a real modal (focus trap,
Escape, labelled), and the resting field's controls are keyboard-reachable. The alt-status chip carries a
glyph and a label, never hue alone (WCAG 1.4.1). The needs-alt row focuses the actual alt input.

## Verification

The standing gate holds: `npm run check` 0/0, `npm test` exit 0, the reference, signature, package, docs,
readiness, and version gates green. Unit tests for: the decode arm (assemble the object, omit empty
caption, omit on empty src), the read-back arm (round-trip an existing object without `'[object Object]'`),
the validate arm (normalize, never require alt), the delivery resolution (a declared image ref resolves to
url and absoluteUrl, an unresolved ref degrades), `resolveImageUrl` rejecting a `media:` token, and
`readSeoFields` reading both the structured field and the back-compat string. Component tests for the hero
field (empty, set-at-rest one row, the edit dialog with the 16:9 preview, alt debt, decorative, the
needs-alt chip). A showcase E2E extends the slice: set a hero, it resolves, the page renders it and the
head carries the `og:image`, and Save commits the nested frontmatter. The build carries the
`frontend-design` mockup (done, the polished synthesis) and a polish pass over the real rendered field.

## Documentation dimension

A guide section on the hero image (extending the add-an-image guide or a new short guide); the editor
reference and the admin-design-system doc for the hero field recipe; the reference for the new `image`
field type and the `seo` flag; the explanation arm for the unify and the resolve-don't-mutate rule; the
changelog entry (the new field type, the SEO unify, the `resolveImageUrl` hardening as a behavior change)
and the upgrade-guide entry (declaring the field, the optional string-to-structured migration). The three
doc gates pass.

## Deferred

- A social-card crop variant. The `og:image` ideally is a 1200x630 crop. With Cloudflare Images transforms
  on, the SEO head could request a social variant of the hero. Transforms are off by default, so 3b ships
  the full hero URL as the `og:image`; the crop variant is a later refinement.
- The gallery component (Phase 3c). Multiple ordered images with their own alt and caption is 3c, not a
  multi-value hero field.
- A hero on a concept that is not a Post or Page. The field is available to any concept that declares it;
  no concept is forced to.

## Open risks carried into the build

1. **The resolution home and ordering.** Frontmatter resolution must run in the delivery read path before
   the SEO read, with the manifest injected. The build confirms the injected resolver reaches both the page
   data and the head builder, and that `entry.frontmatter` is never mutated.
2. **The `resolveImageUrl` hardening.** The guard must reject a `media:` or non-http scheme and is tested
   with a bare token, so an unresolved reference can never ship as a social tag.
3. **The editor three-input round-trip.** The decode, the `formValues` read-back, and the render arm must
   agree, and opening then saving an unchanged hero must leave the committed object byte-stable.
4. **The explicit SEO binding and its validation.** At most one SEO image field per concept, validated at
   `defineFields` or `defineAdapter`, with the `image`-named default for back-compat.
5. **The needs-alt frontmatter seam.** The hero signal is computed from form state, not the body scanner,
   and its row focuses the alt input.
