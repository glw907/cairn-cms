# Media subsystem — fresh-context verification notes

Verifier did not produce the ranking. Every claim below was re-derived from the code at
`/home/glw907/Projects/cairn-cms` @ `main` and from the five sibling repos plus the showcase.

**Evidence base re-run.** The ranking's family-consumption table reproduces exactly (grep over
`~/Projects/{ecxc-ski,907-life,aksailingclub-org,xcathletes-org,cairn-pub}/src` plus
`examples/showcase`). `907-life` does still import `makeMediaResolver` (stale pin), as stated. No
non-family importer found. `ResolvedAssetConfig` and `MediaManifest` are exported from `/media`
and nowhere else (`src/lib/index.ts`, `/sveltekit`, `/delivery` re-export only `MediaResolve`), so
the nameability arguments rest on a verified fact.

**One material fact the ranking missed.**
`packages/create-cairn-site/template/src/theme/cairn.config.ts:368` and `:457` carry the same
duplicated pair as the showcase. The `normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' })` literal
is not a family habit that six sites happened to copy: it is what `npm create` hands **every
anonymous consumer** on day one. That converts item 4 from "the family all did the same thing"
into a defect the engine actively propagates to the exact reader the standard is calibrated on.

---

## 1. `ResolvedAssetConfig` — keep **stands**

Confirmed: zero sites name it; `config.ts:6` still calls the module engine-internal; it reaches the
surface only as `normalizeAssets`'s return, `buildMediaResolver`'s second parameter, and
`CairnRuntime.resolvedAssets` (`src/lib/content/types.ts:411`).

The ranking's own counter-argument is unsound and should not be carried forward. It says publishing
every field "invites a site to hand-construct one and bypass `normalizeAssets`'s validation." TypeScript
is structural: `buildMediaResolver(manifest, { enabled: true, bucketBinding: 'X', publicBase: '/media',
urlForm: 'slug', maxUploadBytes: 1, allowedTypes: [], variants: {}, transformations: false })` compiles
whether or not the alias is exported. Exporting the name adds no bypass that did not already exist. So
the only live objection to the keep evaporates, and the keep is firmer than the ranking rated it — not
weaker.

The affirmative ground is real and is a "cannot legally reach the surface" case, not mere convenience:
a consumer writing `function makeResolver(cfg: ResolvedAssetConfig)` around `buildMediaResolver` cannot
annotate that parameter without the name. Shipping a public function whose parameter type is unnameable
is a defect in any TS library.

`absenceOfObjection: true` is still the honest flag, and the ranking's instruction to re-test this
alongside item 4 is correct.

## 2. `mediaToken` — keep **stands**

Consumer confirmed at `aksailingclub-org/src/routes/admin/club/events/+page.server.ts:85`.

The anonymous-consumer case is stronger than "one family site does it." cairn's charter ships the
`CairnAdminShell` custom-route seam precisely so a developer builds their own admin screens over
their own data. A screen that points one of those records at an asset in cairn's media library is
the supported path, not an exotic one. Any consumer who uses the seam cairn advertises reaches this.

One correction to the ranking's reasoning, which does not change the verdict. It argues a
hand-rolled token "that is subtly wrong fails silently at render as a broken image." `mediaToken`
(`src/lib/media/reference.ts`) does no validation — it concatenates. Fed an uppercase or dotted slug
it emits the same unparseable string a template literal would. Its protection is against **grammar
drift**, not bad input: the engine owns `SLUG_RE`/`HASH_RE` and the last-dot split, and may tighten
them. That ground plus codec symmetry (shipping `parseMediaToken` without its inverse leaves the
documented round-trip guarantee unverifiable from outside) carries the keep.

## 3. `MediaManifest` — keep **stands**

Two ASC consumers confirmed (`post-cards.ts:28,43`, `home-images.ts:61,71`). Nameability is not
optional here the way it is in item 1: it is the return type of `readCommittedManifest`, which every
site calls, so the name is unavoidably in the public signature the reference page prints. Retiring
the alias would force `docs/reference/media.md` to spell `Record<string, MediaEntry>` and hand every
consumer a shape the engine owns and could re-key. A one-line alias, not a class or an interface a
site is invited to implement. No smaller shape exists.

## 4. `normalizeAssets` — reshape **stands** (with two corrections to the note)

The finding reproduces. `src/lib/content/compose.ts:53-54` normalizes `adapter.media` at compose;
`CairnRuntime.resolvedAssets` is public; and every site plus the reference page plus the scaffold
normalize a **second** re-typed literal. Nothing compares the two halves. The engine's
`media.resolver_absent` diagnostic catches a *missing* resolver, never a *diverging* config, so a
site that sets `transformations`, `publicBase`, or `urlForm` on the adapter alone gets correct
admin/upload/delivery behavior and wrong public URLs, silently. Confirmed defect class.

Correction 1 — the propagation vector. The reshapeNote credits "all six sites"; the real cause is
`packages/create-cairn-site/template/src/theme/cairn.config.ts:368`/`:457`. The scaffold seeds it.
That is the argument that makes this an any-site finding rather than a family one, and it belongs
in the note.

Correction 2 — one of the two proposed right forms does not work. "reads `runtime.resolvedAssets`"
is not available at the call site in the documented topology. The showcase composes the runtime in
`src/chassis/cairn.server.ts`, which *imports* `$theme/cairn.config.js`; having `cairn.config.ts`
import the runtime back would be a circular import. Every family repo has the same shape. The
viable form is the first one: a single hoisted media block used both by `normalizeAssets(...)` and
by the adapter's `media:` member (or `normalizeAssets(cairn.media)` with the resolver construction
moved below `defineAdapter`, safe because `render` closes over it lazily). The note should drop the
runtime alternative.

The export's signature `(assets: AssetConfig | undefined) => ResolvedAssetConfig` is right and
unchanged; the reshape is of the documented and scaffolded call form plus the doc's silence about
compose already normalizing. Membership is not in doubt.

## 5. `readCommittedManifest` — keep **stands**, and it is the weakest keep in the bucket

The ranking ranks it 5th of 7. On the evidence it is closer to 2nd-weakest, behind only
`ResolvedAssetConfig`, and the caveat it already carries is the right record.

Pressure applied: the body is one line, and the export does **not** prevent the trap it is sold on.
A consumer who reaches for `import manifest from '.../media.json'` still gets the build failure;
the export only gives the docs and the scaffold something to point at, which is close to "a
discoverability problem an export would not fix."

What saves it is one fact the ranking did not name: `parseMediaManifest` is **not** exported from
`/media` (`src/lib/media/index.ts` exports only `readCommittedManifest`, `MediaEntry`,
`MediaManifest`). A site hand-rolling the read writes `Object.values(glob)[0] as MediaManifest` —
an unchecked cast across a trust boundary, dropping the array/null/non-object guard on a file the
**engine's own admin commits**. That is an engine-owned read contract the site cannot legally
reach, which is the gate's first clause. The `Record<string, unknown>` parameter is forced by Vite
(the glob pattern must be a static literal at the call site), so the engine can never own the call
and the shape is right.

Keep, with the ranking's re-test trigger preserved: if a `cairn-doctor` check or scaffold assertion
ever makes the glob incantation impossible to get wrong, this one is re-argued.

## 6. `parseMediaToken` — keep **stands**

Verified the "cannot reach" claim at the source. `deriveHeroImage` in
`src/lib/delivery/public-routes.ts:86` is module-private; the engine's frontmatter hero projection
is available only to entries flowing through `createPublicRoutes`'s `EntryData`. A card grid over
summaries, a bespoke home layout, an OG endpoint, or an RSS enclosure holds an engine-authored
token and has no engine path to decode it. `ecxc-ski/src/theme/hero-image.ts:5` is a site
independently arriving at exactly that, and ASC hit it in three more modules. Generic consequence
of cairn's own design (frontmatter image fields plus a body-only resolver), not a family quirk.

Shape verified right: total function, `null` for a non-token, never throws, so arbitrary hrefs are
safe to feed it.

## 7. `buildMediaResolver` — keep **does NOT stand → reshape**

Membership passes, and passes strongly: it encodes the delivery-path grammar (`publicPath`, whose
naming helpers were deliberately demoted in `54541401`), the rename-safety rule, the Cloudflare
variant URL form, the transformations-off fallback, and the `imageDetail` side channel. All of it
engine-owned and not honestly hand-rollable. The engine's own hero projection only works because
the site supplies a resolver built here. None of that is in question.

The third parameter is. The ranking calls `opts?: { preset? }` "a wart, not a membership failure,"
and waves it through with "it costs nothing to leave." Two objections, one of principle and one of
fact.

Of principle: "it costs nothing to leave" is migration cost dressed as a shape argument, and the
standing ruling is explicit that inconvenience never sustains a verdict. Churn is free until beta.
Under "no accept-by-default," a parameter with no engine caller and no site caller must justify
itself affirmatively, and it does not: `grep -rn "buildMediaResolver("` over `src`, `examples`,
`packages`, `docs` and all five sibling repos returns **zero** non-test callers passing `opts`.
The engine's own use (`src/lib/sveltekit/preview.ts:246`) omits it. Only `resolve-media.test.ts:65,74`
exercises it.

Of fact, and this is what decides it: `opts.preset` is not merely unused, it silently contradicts
the function's own `imageDetail` feature. In `src/lib/render/resolve-media.ts`, `resolve()` returns
`presetUrl(path, opts.preset, resolved.variants)` when a preset and transformations are both on,
while `imageDetail()` builds `detail.srcSet` from `variantUrl(path, { width: w })` — the **bare**
path, preset ignored — and reports `detail.width`/`height` from the manifest entry's **original**
dimensions. `remarkResolveMedia` then stamps both onto the same `<img>`. A browser given a `srcset`
picks from it and discards `src`, so the preset's `fit`, `height`, `gravity`, and `quality` are
thrown away; and the intrinsic `width`/`height` attributes then describe the original asset rather
than the preset-cropped render, which reintroduces the exact layout shift `imageDetail` exists to
prevent. A consumer who reads the parameter in the reference table, uses it as documented, and
turns on `transformations` gets a preset that does nothing and dimensions that are wrong.

That is a shape defect in a documented public parameter, not a cosmetic wart. **Replacement verdict:
reshape** — keep the function, drop `opts` and its row in `docs/reference/media.md`. The two-argument
form `(manifest, resolved)` is the form every real caller already uses and the form that is
self-consistent. If a preset-limited resolver is ever genuinely wanted, it is re-derived with
`imageDetail` made preset-aware, which is a design question no current caller is waiting on.

Item 4's finding is a separate matter and is correctly scoped there: `buildMediaResolver`'s second
argument comes from a duplicated source of truth, which is `normalizeAssets`'s reshape, not this
one's.

---

## Summary

Six of seven verdicts stand. One flips.

- Stand: `ResolvedAssetConfig` (keep, on firmer ground than argued), `mediaToken` (keep, on
  grammar-drift rather than validation), `MediaManifest` (keep), `normalizeAssets` (reshape, with
  the scaffold named as the vector and the runtime alternative struck), `readCommittedManifest`
  (keep, weakest in the bucket), `parseMediaToken` (keep, strongest "cannot reach").
- Flips: `buildMediaResolver`, keep → **reshape**, on the dead-and-self-contradicting `opts.preset`
  parameter.

The ranking's closing line "Nothing retires" survives verification: no item in this bucket is a
retire on the evidence. Its line "Membership and shape both pass" for item 7 does not.
