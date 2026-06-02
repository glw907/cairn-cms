# cairn Render-Safety Design

**Date:** 2026-06-02
**Status:** Approved (brainstorm settled with the user 2026-06-02)
**Supersedes nothing.** Closes the render-safety gap the auth-hardening review gate escalated.

## Problem

The reference delivery render path emits raw author HTML and `javascript:` URIs into the published
page with no sanitize floor. `src/lib/render/pipeline.ts` composes `unified()` with
`remarkRehype({ allowDangerousHtml: true })`, `rehype-raw`, and `rehype-stringify`, and the showcase
delivers the result through Svelte `{@html}`. Author markdown that carries a `<script>`, an `onerror`
attribute, or a `[link](javascript:...)` reaches every visitor's browser verbatim. The
`web-auth-security-reviewer` surfaced this at the 2026-06-02 auth-hardening gate as the failing
render-safety verification item. The auth pass had deferred a `/admin` CSP on the stated ground that
render safety was the real XSS control, and that control turned out to be absent on the reference path.

The realistic threat is a compromised editor account or a paste-from-the-web mistake, not anonymous
public input. Editors are an owner-curated allowlist committing through the GitHub App with history.
That lowers the likelihood without changing the failure mode: any editor, or anyone who takes over an
editor's session, can run script in every visitor's browser.

## Threat model and the camp cairn belongs to

A competitive survey (WordPress, Ghost, GitHub, Hugo, markdown-it, marked, rehype-sanitize, Astro,
Eleventy, Gatsby, MDX, Decap) splits these systems into two camps by who authors the content.

The trusted-content static-site generators (Astro, Eleventy, Gatsby, MDX, Hugo with `unsafe = true`,
Ghost) do not sanitize, on the explicit assumption that the author is the developer editing their own
repository. The authors-but-filtered systems (WordPress, GitHub) allowlist-sanitize by default, because
the person typing is not the developer and may be careless or hostile.

Cairn's content lands in git, but it is authored by non-technical people through a web CMS, not by the
site's developers. The threat model is the authors-but-filtered camp. The user-model analog is
WordPress, whose `wp_kses` allowlist runs by default and whose `unfiltered_html` capability gates a full
bypass behind trusted roles. The architectural analog, Decap CMS, is a weak guide here: it sanitizes
nothing at build and only optionally sanitizes its editor preview, so it leaves exactly cairn's gap
open.

Within cairn's camp the dominant override posture is an extend-only allowlist (WordPress `kses` with the
`wp_kses_allowed_html` filter, GitHub's html-pipeline, the rehype-sanitize "spread `defaultSchema` and
add what you need" pattern). The full-disable switch (Hugo `unsafe`, markdown-it `html: true`, marked)
belongs to the trusted-content camp, not to cairn's.

## Decisions locked

1. **A sanitize floor ships on by default, inside `createRenderer`.** The gap exists because the
   reference path had no floor, so safe-by-default is the requirement. Every site that builds its render
   through `createRenderer` is covered without wiring anything.
2. **Posture is extend-only.** A site extends the allowlist for the benign HTML its content uses. It
   cannot weaken the core strip of scripts, event handlers, and `javascript:`/`data:` URLs through normal
   config. A developer-only, code-level disable hatch exists for a site whose content is fully
   developer-controlled, matching WordPress `unfiltered_html` and rehype-sanitize's replaceable schema.
   Editors never see this control.
3. **Raw HTML stays allowed and is sanitized, not dropped.** Real site content uses benign raw HTML: an
   in-page `<nav>` table of contents and `<a class="download-link" target="_blank">` CTAs in ecnordic, a
   `<details><summary>` disclosure in 907. Dropping raw HTML would break live content, so the floor
   cleans it rather than escaping it.
4. **Role-gated bypass is deferred.** WordPress needs per-role `unfiltered_html` because it has an open
   author population and many tiers. Cairn's owner/editor model over a small vetted set gets the safety
   from extend-only alone. A later refinement only if a real need appears.
5. **CSP stays a documented site-level recommendation, not engine code.** The floor is the primary
   control. A public-page CSP is defense-in-depth that lives in the site's response headers or
   `svelte.config`, spans the library/site boundary, and is the site's to set. Same reasoning the auth
   pass used to defer the `/admin` CSP.

## Architecture

### Pipeline placement: sanitize before the dispatch

The render pipeline gains one step, `rehype-sanitize`, placed after `rehype-raw` and before
`rehypeDispatch`:

```
remarkParse
  -> remarkGfm
  -> remarkDirective, remarkDirectiveStamp
  -> remarkRehype({ allowDangerousHtml: true })
  -> rehypeRaw
  -> rehypeSanitize(schema)      <-- new
  -> rehypeDispatch(registry)
  -> rehypeSlug
  -> rehypeStringify
```

The placement is the load-bearing choice. The untrusted surface is the author markdown: raw HTML, link
and image URLs, and the slot bodies inside a component directive such as `:::callout`. The component
shells come from the site's own `build(ctx)`, which runs in `rehypeDispatch` after the floor and is
trusted code, not author input.

Sanitizing before the dispatch cleans exactly the author content and leaves the trusted `build()` output
untouched. Three consequences follow. The schema never has to enumerate the open-ended set of elements,
classes, and attributes a site's `build()` might emit. The inline SVG icons that a site's `build()`
produces never meet the sanitizer, so cairn avoids SVG-allowlist fragility. And a component's slot
children, which are author markdown, are sanitized before the shell wraps them, which is the behavior we
want.

Sanitize must run after `rehype-raw`, since the rehype documentation is explicit that the floor belongs
"after the last unsafe thing" and that `rehype-raw` plus stringify with no sanitize is the XSS footgun.
`rehype-slug` runs after the floor, so its heading ids are engine-generated and trusted.

`rehype-sanitize` operates on the hast tree and needs no DOM, so the floor runs identically at build time
in the Worker or Node and in the browser preview. This is simpler than the current DOMPurify pass, which
needs a DOM and so loads through a browser-only dynamic import.

### The schema: `defaultSchema` extended, markers derived from the registry

The floor starts from `hast-util-sanitize`'s `defaultSchema`, the GitHub-lineage allowlist that
WordPress and GitHub also descend from. It already strips scripts, inline event handlers, and dangerous
URL protocols on `href` and `src`, keeping `http`, `https`, `mailto`, and the other safe schemes, so
`javascript:` and `data:` are removed.

Cairn extends that default with two additions:

- **The directive markers**, so the dispatch still reads its stamps after the floor. The fixed markers
  are `dataPrimitive`, `dataSlot`, `dataIcon`, `dataRole`, and `dataRise`. The per-attribute markers are
  `dataAttr<Key>` for each declared component attribute (for example `dataAttrTone`). These are derived
  from the registry that `createRenderer` already holds, so the schema permits exactly the markers in
  play and nothing more. The marker attributes are inert data attributes, never a script vector.
- **The benign author tags** real content uses: `nav`, `details`, and `summary`, plus `class`, `target`,
  and `rel` on anchors.

A site extends the allowlist further through a renderer option (see the API below). The starting point
is always the cairn default, so an extension adds and never subtracts the safe core.

### Anchor hardening

The current DOMPurify pass forces `rel="noopener noreferrer"` on any anchor with `target="_blank"`, to
prevent reverse-tabnabbing. `hast-util-sanitize` runs no per-node hook, so the floor pairs the sanitize
step with a tiny rehype transform that sets `rel="noopener noreferrer"` on every `target="_blank"`
anchor. The behavior survives the move off DOMPurify and now applies to delivery, not only the preview.

### Preview and delivery collapse to one floor

The admin preview in `src/lib/components/EditPage.svelte` already renders through the adapter's
`render(md)`, which is the same `createRenderer` pipeline as delivery, then runs a second DOMPurify pass
(`sanitizePreviewHtml`) on the result. Once the floor lives in the pipeline, that second pass is
redundant. It is also a liability: a separate policy in a different library drifts from the real page,
and if it is stricter than the delivery floor the preview lies by showing less than the published page
renders.

So the DOMPurify preview pass and the `dompurify` dependency are removed. Preview safety rides on the one
pipeline floor, and the preview becomes a faithful mirror of the published page. Its one DOMPurify
behavior worth keeping, the `target="_blank"` rel hardening, is preserved by the anchor-hardening step
above, which now covers both surfaces.

## API: the override seam

`RendererOptions` gains the extend seam and the developer-only disable hatch. The site composes its
renderer in its adapter, so both live where the developer already calls `createRenderer`.

```ts
export interface RendererOptions {
  stagger?: boolean;
  /**
   * Extend the sanitize allowlist. Receives cairn's default schema (hast-util-sanitize defaultSchema
   * plus the directive markers and the common benign tags) and returns the schema to use. Add to the
   * allowlist for the benign HTML a site's content needs. Start from the argument so the dangerous
   * strip is preserved.
   */
  sanitizeSchema?: (defaults: Schema) => Schema;
  /**
   * Developer-only escape hatch: disable the sanitize floor entirely. This reintroduces the XSS vector
   * the floor closes, so it is only for a site whose content is fully developer-controlled. It is a
   * code-level adapter decision, never an editor-facing setting.
   */
  unsafeDisableSanitize?: boolean;
}
```

Normal use is `sanitizeSchema`, the extend-only path. The loud `unsafeDisableSanitize` flag is the
deliberate full bypass. A site that returns a hand-built schema from `sanitizeSchema` rather than
extending the argument is making the same deliberate choice, which the option name and its documentation
steer away from.

## Units

The plan decomposes into these units, each independently testable.

1. **The sanitize floor in the pipeline.** Add `rehype-sanitize` after `rehype-raw` and before the
   dispatch in `createRenderer`. Build the cairn default schema from `defaultSchema` plus the
   registry-derived directive markers and the benign author tags. Wire the `sanitizeSchema` extend
   option and the `unsafeDisableSanitize` hatch.
2. **Anchor hardening.** A small rehype transform that sets `rel="noopener noreferrer"` on
   `target="_blank"` anchors, composed with the floor.
3. **Preview unification.** Remove the `sanitizePreviewHtml` DOMPurify pass from `EditPage.svelte` and
   delete `src/lib/render/sanitize.ts` and the `dompurify` dependency. The preview renders through the
   already-floored pipeline.
4. **Docs.** A delivery-docs note recommending a public-page CSP as defense-in-depth, with the floor
   named as the primary control and the render-safety contract stated for a migrating site.
5. **Version bump.** A minor bump, batched into the next publish that rolls the unpublished window.

## Testing

- **Floor unit tests:** a `<script>` is stripped, an `onerror` attribute is stripped, a `javascript:`
  href is neutralized, a `data:` href is neutralized, and the `target="_blank"` rel hardening is applied.
- **Benign-survival tests:** an author `<nav>` table of contents, a `<details><summary>`, and an
  `<a class="download-link" target="_blank">` survive the floor with their structure intact.
- **Marker-preservation regression:** the showcase `callout` still renders to its full
  `<aside class="callout ...">` markup with title, body, and points through the floor. This proves the
  before-dispatch placement preserves the directive markers and that a component's slot children are
  sanitized without breaking the shell.
- **Extend-seam test:** a `sanitizeSchema` that adds a tag admits that tag while the core strip still
  removes a script.
- **End-to-end:** the showcase production prerender stays green, including the existing feed, sitemap,
  and catch-all checks.

## Versioning

Removing the internal DOMPurify preview pass and the `dompurify` dependency is an internal change, and
the render output for clean content is unchanged, so the surface is additive. It bumps a minor to
`0.17.0`, unpublished until the next release step, which rolls the unpublished `0.16.0` window into one
publish. Sites pin the published range when they migrate.

## Out of scope

- A public-page CSP coded into the engine. It stays a documented site-level recommendation.
- Role-gated `unfiltered_html` equivalents. Deferred until a real need appears.
- The guard's own 303 login-redirect skipping the admin security headers, a latent low-impact
  follow-up carried from the auth-hardening pass.
