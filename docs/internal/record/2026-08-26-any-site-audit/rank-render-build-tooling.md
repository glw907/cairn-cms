# Render / build-tooling subsystem: any-site audit ranking

Subsystem: subpaths `/render`, `/islands`, `/vite`. Eight items, ranked weakest (1) to strongest (8)
anonymous-consumer case. Every item in `bucket-render-build-tooling.json` is argued below.

**Collisions:** none. Every item in this bucket carries `"collision": false`; no name in `/render`,
`/islands`, or `/vite` shares a name with a differing signature elsewhere in the surface.

**Cross-cutting evidence used by several items.** The three hast builders bake family CSS class names
into the engine:

- `iconSpan`: `const className = role === 'secondary' ? ['ec-icon', 'ec-icon-secondary'] : ['ec-icon'];`
  (`src/lib/render/rehype-dispatch.ts:30`)
- `cardShell`: `h('section', { className: classes }, [h('div', { className: ['card-body'] }, body)])` (:39)
- `headRow`: `children.push(h('h'+level, { className: ['card-title'] }, title)); return h('div', { className: ['ec-head'] }, children);` (:51-52)

The engine ships no CSS for any of them. `grep -rn "ec-icon\|ec-head\|card-title\|card-body" src/lib
--include=*.css` returns nothing; the only CSS file in the library is `src/lib/components/cairn-admin.css`.
The rules live on the site side, in each site's copied chassis: `examples/showcase/src/chassis/prose.css:25`
documents the grammar as `.alert > .card-body > (.ec-head > .card-title) + .alert-body`, and `:523`/`:539`
style `.prose .alert .ec-head` and `.prose .alert .ec-icon`. `ec-` is the ecxc prefix; the class grammar
reached every other site by chassis copy, not by independent derivation.

Every site that calls these helpers also imports hastscript directly (`ecxc-ski/src/theme/markdown/components.ts:22`,
`aksailingclub-org/.../components.ts:16`, `xcathletes-org/src/theme/cairn.config.ts:10`,
`examples/showcase/src/theme/cairn.config.ts:7`), so replacing a helper costs one `h()` call in a file
that already has `h` in scope.

Measured call sites across the family (`grep -rho "\b<name>(" <site>/src | wc -l`):

| helper | ecxc-ski | aksailingclub-org | xcathletes-org | cairn-pub | showcase | 907-life |
| --- | --- | --- | --- | --- | --- | --- |
| `cardShell` | 1 | 0 | 1 | 1 | 1 | 0 |
| `headRow` | 2 | 1 | 1 | 1 | 1 | 0 |
| `iconSpan` | 1 | 1 | 1 | 1 | 1 | 0 |
| `strAttr` | 17 | 10 | 15 | 15 | 15 | 0 |
| `isElement` | 4 | 4 | 0 | 0 | 0 | 0 |
| `hydrateIslands` | 0 | 2 | 1 | 1 | 1 | 0 |

The `cardShell`/`headRow` counts are almost entirely one chassis-copied `alert` component, byte-identical
across showcase, xcathletes-org, cairn-pub, and `templates/waymark`. The one site that authored its own
component set from scratch (aksailingclub-org) uses `cardShell` zero times.

**The scaffold template is the one anonymous path.** `templates/waymark` (shipped to a stranger by
`packages/create-cairn-site`) imports `cardShell, headRow, strAttr` at `templates/waymark/src/theme/cairn.config.ts:4`
and ships the matching `.ec-head`/`.ec-icon` rules in its own `src/chassis/prose.css`. That is an
engine-authored caller, not independent demand: the template can call `h()` as easily, and doing so would
put its markup grammar in the same file as the CSS that styles it instead of splitting it across two repos.

---

## Rank 1 — `cardShell`

- **surfacedAt:** `/render`
- **Signature:** `(classes: string[], body: ElementContent[]) => Element`
- **Verdict: retire**

**Provenance.** Ported from ecxc's pre-rebuild renderer, not requested by anyone.
`git log -S cardShell --oneline -- src/` bottoms out at `9ab548c3 feat(render): rehype dispatcher +
shared structural helpers` and `f22ef893 feat(render): port the rehype dispatcher and structural
helpers`; it was later relocated from the root barrel to `/render` by `fb10c9bc Add the /render
authoring subpath`. The relocation spec lists it as inherited, not new demand:
"Pass 1 narrowed the root barrel but left the component-authoring helpers (`iconSpan`, `cardShell`,
`headRow`, `rehypeDispatch`) on root" (`docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md:18`).
No consumer outside the family exists. familyOriginated: true.

**Anonymous-consumer argument.** A stranger's `build(ctx)` returns hast and they own every class name in
it. `cardShell` hands them a `<section>` whose inner `<div class="card-body">` they did not choose and
cannot change without abandoning the helper. The one thing it saves is a single `h()` call in a file that
already imports `h`. The site can reach and patch this surface completely; no grammar of ours has diverged
from it, because there is no ratified grammar for `card-body` at all (it is a DaisyUI class the chassis
happens to use).

**Both directions.** For keeping: it is tiny, it is already exported, and `templates/waymark` calls it, so
retiring costs one template edit. That case is entirely "no objection has been raised", which the standard
names as insufficient. Against: the strongest family evidence is one chassis-copied `alert` replicated
four times, and the only site that authored components independently never called it. Retire, and inline
the two-line `h()` in `templates/waymark` beside the `.card-body` rule it depends on.

---

## Rank 2 — `iconSpan`

- **surfacedAt:** `/render`
- **Signature:** `(glyphEl: Element, role?: string) => Element`
- **Verdict: retire**

**Provenance.** Same ecxc port as `cardShell` (`9ab548c3`, `f22ef893`), relocated by `fb10c9bc`. No brief
or requirement asked for it. familyOriginated: true; no outside consumer.

**Anonymous-consumer argument.** This is the most site-specific item in the bucket: the whole body is a
class-name decision (`['ec-icon']`, plus `ec-icon-secondary` for one hard-coded role string), and `ec-` is
one family site's prefix. The engine itself never depends on the class; the only occurrence in `src/lib` is
the function's own line. Worse, every site wraps it immediately rather than calling it at build sites:
`ecxc-ski/src/chassis/render.ts:17` is `return (name, role) => iconSpan(glyph(name, icons), role);` — a
one-line factory the site keeps anyway, which is the real seam. The engine-owned half of icon rendering is
`glyph(name, icons)`, which stays on the root barrel and is not in this bucket.

**Both directions.** For keeping: it pairs with engine-exported `glyph()`, so a reader may expect the wrap
to come from the engine too, and `role === 'secondary'` encodes a convention. Against: the convention is
one site's CSS vocabulary, the anonymous consumer has to restyle `.ec-icon` or fight it, and the
site-side factory that every family site already writes is the correct home for the wrap. Retire.

---

## Rank 3 — `headRow`

- **surfacedAt:** `/render`
- **Signature:** `(title: ElementContent[], icon?: Element, level?: number) => Element`
- **Verdict: retire**

**Provenance.** Newer than the other two and engine-originated: `4a9cf555 Add the headRow component head
helper`, then `29486e57 Add a configurable headRow heading level, default h2`. Its own doc comment names
the motivation as replacing an engine helper being removed: "This factors the icon-plus-heading head that a
titled component build would otherwise rebuild by hand (the shape the removed `splitHead` produced)"
(`src/lib/render/rehype-dispatch.ts:44-46`). No consumer brief asked for it; no outside consumer.
familyOriginated: true.

**Anonymous-consumer argument.** Slightly stronger than ranks 1-2 because it carries a little real logic
(optional icon, configurable heading level) and because aksailingclub-org, the site that wrote its own
components, does call it (`headRow(ctx.slot('title'), iconEl, 3)`). But it still bakes two class names the
site owns: `ec-head` on the wrapper and `card-title` on the heading. An anonymous consumer whose design has
no `.card-title` gets markup they must override in CSS or abandon. Any parameterized version that let the
caller pass those classes would be `h('div', { className }, [icon, h(tag, { className }, title)])` — that
is hastscript, which they already import.

**Both directions.** For keeping: two family sites reach for it including one independent author, and the
`level` parameter shows the shape adapting to real use rather than freezing ecxc's. Against: adaptation to
family use is not the test; a stranger cannot use the class names, and the hand-roll is three lines in a
file that already has `h`. Retire.

---

## Rank 4 — `isElement`

- **surfacedAt:** `/render`
- **Signature:** `(node: ElementContent | undefined) => node is Element`
- **Verdict: retire**

**Provenance.** Engine-internal from the beginning (`f22ef893`, `9ab548c3`), promoted to public surface as
a convenience because a site had copied it: "`isElement` (re-homed from internal; ecnordic can drop its
inlined copy)" (spec `:43`), and the same spec at `:19` records it was "dropped `isElement` entirely
(ecnordic inlined a copy)". So the recorded trigger is one family site's inlined copy. No outside
consumer. familyOriginated: true.

**Anonymous-consumer argument.** Unlike ranks 1-3 this one is design-agnostic: any component author who
walks `ctx.slot('body')` children narrows an `ElementContent` at some point, so the situation is genuinely
general. What fails is necessity, not generality. The body is
`return !!node && node.type === 'element';` (`rehype-dispatch.ts:7`) over types the site imports from
`hast` anyway, and the ecosystem already publishes `hast-util-is-element`. Two family sites use it four
times each; the other four use it zero times.

**Both directions.** For keeping: it costs nothing, its absence provably caused a copy-paste once, and a
type predicate is marginally easier to get wrong than a plain comparison. Against: "it costs nothing and
nobody objected" is the absence-of-objection case the standard rejects, the hand-roll is one line, and an
inlined one-line predicate is the correct outcome here rather than evidence of a gap. Retire.

---

## Rank 5 — `strAttr`

- **surfacedAt:** `/render`
- **Signature:** `(ctx: ComponentContext, key: string) => string | undefined`
- **Verdict: reshape**

**Provenance.** Engine-authored ergonomics, filed in the `/render` design spec and landed by
`e2193359 Add strAttr: read a string attribute off the component context`. The spec states the motivation:
"It replaces the hand-rolled `typeof ctx.attributes.x === 'string' ? ctx.attributes.x : undefined`
boilerplate that recurs in every string-reading `build()`, including the showcase config today"
(spec `:87-90`). No site brief asked for it; no outside consumer. familyOriginated: true.

**Anonymous-consumer argument.** This is the only `/render` helper with real weight of use: 10-17 call
sites per site, and 15 in the shipped `templates/waymark` scaffold. The reason is engine-imposed, not
site-specific — the engine typed the context as
`attributes: Record<string, string | boolean>` (`src/lib/render/registry.ts:40`), so every string read must
narrow away a `boolean` the engine chose to admit. An anonymous consumer authoring one directive with three
string attributes hits it three times on day one. Unlike ranks 1-4, nothing about it encodes a design
choice: no class names, no markup.

**Both directions.** For retiring: the hand-roll is one line, and the site can reach the surface freely, so
it fails the strict gate. For keeping as-is: it is the most-used helper in the subsystem. Both readings are
wrong about the shape. The tax exists because of an engine-owned object, and the engine already hands that
object to `build()` carrying accessors — `ctx.slot(name)` and `ctx.items(name)` (`registry.ts:42-44`). The
reader belongs there, as `ctx.str(key)`, beside its siblings: it removes the import, removes an export from
the public surface rather than adding one, and a developer finds it by autocompleting `ctx.` instead of
reading a reference page. **Reshape:** move onto `ComponentContext` as `ctx.str(key)` and drop the
standalone export. If the accessor cannot move onto the context for a reason this audit has not seen, the
fallback verdict is retire, not keep in the current shape.

---

## Rank 6 — `CairnManifestOptions`

- **surfacedAt:** `/vite`
- **Signature:** `{ configModule: string; content: { [x: string]: string }; manifestPath?: string }`
- **Verdict: keep**

**Provenance.** Engine-internal, born with the plugin it configures: `26fee41e Spike the cairnManifest Vite
verify mechanism, proven on the showcase build`, narrowed to today's surface by `54541401
refactor(surface)!: prune /delivery, /media, and /vite to their proven surfaces`. The `/vite` barrel records
the narrowing rule: "only the cairnManifest plugin and its options type are proven surface, since every
consumer site imports exactly these two from there" (`src/lib/vite/index.ts:2-3`). No outside consumer.
familyOriginated: true.

**Anonymous-consumer argument.** The type is already reachable through `Parameters<typeof cairnManifest>[0]`
because it appears in the exported function's signature, so the question is only whether it gets a name. It
should: a consumer who factors their build config — a shared `makeCairnPlugins(opts: CairnManifestOptions)`
across a staging and production config, or a monorepo with two cairn sites — needs to name the parameter,
and every path in it is load-bearing and non-obvious (`configModule` must be app-root-absolute, because
"Every path is app-root-absolute, the form `import.meta.glob` wants" — `docs/reference/vite.md:71`). Naming
an exported function's options interface is the TypeScript norm and strictly better than forcing a
`Parameters<>` incantation.

**Both directions.** Against keeping: a single-site consumer inlines the object literal at the one call site
and never names the type, which is what all six family configs do (`templates/waymark/vite.config.ts:38`
passes a literal). Ranked 6 rather than 8 for exactly that reason: its case is derivative of the plugin's.
For keeping: it is not new surface (it is the shape of a kept export's only argument), and withholding the
name would be a gratuitous ergonomic loss. Keep.

---

## Rank 7 — `hydrateIslands`

- **surfacedAt:** `/islands`
- **Signature:** `(islands: IslandRegistry, root?: ParentNode) => void`
- **Verdict: keep**

**Provenance.** Engine-designed capability, not a site ask: contract v2 phase 4b, specced in
`docs/superpowers/specs/2026-06-25-cairn-contract-v2-design.md` and planned in
`docs/superpowers/plans/2026-06-27-cairn-contract-v2-islands.md` ("a small Svelte-only client runtime on a
new `./islands` subpath mounts the site's live component over it"), landed by `4087c252 feat(islands): add
the ./islands client runtime`. Built consumers exist inside the family (aksailingclub-org 2 call sites,
cairn-pub 1, showcase 1) and the shipped scaffold ships an island out of the box
(`templates/waymark/src/theme/islands/Banner.svelte`, `templates/waymark/src/routes/+layout.svelte:21-25`).
No consumer outside the family. familyOriginated: true.

**Anonymous-consumer argument.** This is the clearest clause-(a) item in the bucket: the site cannot legally
reach the surface. The boundary the runtime consumes is emitted by the engine's own rehype dispatch —
`islandBoundary()` stamps `dataCairnIsland`, `dataCairnProps` (JSON of the coerced scalar attributes), and
`dataCairnHydrate` (`src/lib/render/rehype-dispatch.ts:158-169`) — and that contract is versioned with the
engine, invisible in the site's source, and changeable by the engine at any release. The concrete scenario:
a stranger sets `hydrate: 'visible'` on a `:::banner` directive and a SvelteKit root layout must mount it
after every client-side navigation. A hand-rolled scan would stack duplicate instances on the second
navigation, which is exactly what the runtime's module-level `teardown()` prevents
(`src/lib/islands/index.ts:22-33`, "the previous mounts must unmount before the next mount over the same
DOM"). Prop-parse and mount failures are isolated so one bad island cannot blank the page (`:39-52`). None
of that is derivable from the site's side.

**Both directions.** Against keeping: two of four production sites use no islands at all, the demand
originated in the engine's own design rather than a filed site requirement, and it is a whole extra
subpath. That argues about whether the `hydrate` feature earns its place, not about this export: given
`hydrate` ships, this function is the only door to it, and the shape is already right (dynamic import gated
on a non-empty registry, so a static site ships none of it — `docs/reference/islands.md:54-55`). The
extending-developer lens reached the same conclusion: "The `./islands` subpath plus `hydrateIslands` is the
right shape" (`docs/internal/extending-developer-lens.md:104`). Keep.

---

## Rank 8 — `cairnManifest`

- **surfacedAt:** `/vite`
- **Signature:** `(opts: CairnManifestOptions) => Plugin<any>`
- **Verdict: keep**

**Provenance.** Engine-internal, serving cairn's core job (managing markdown content):
`26fee41e Spike the cairnManifest Vite verify mechanism, proven on the showcase build`, extended by
`bfde5663 feat(content): fail the build on a dangling reference, wired into the manifest build`. Every
family site imports it (`ecxc-ski/vite.config.ts:3`, `907-life/vite.config.ts:3`, and the shipped
`templates/waymark/vite.config.ts:4`), and it is the one `/vite` export the surface-pruning pass kept. No
outside consumer. familyOriginated: true.

**Anonymous-consumer argument.** A stranger runs a cairn site whose content index is a committed JSON
manifest. They edit a markdown file directly in the repo, forget to regenerate the manifest, and deploy;
without this plugin the build succeeds and the live index page silently omits the post. The plugin makes
that a hard build failure. It cannot be hand-rolled at any reasonable cost: the verify runs a virtual module
inside the app's own Vite graph so `$lib`, `?raw`, and `import.meta.glob` resolve exactly as the build does,
it imports engine internals (`buildSiteManifest`, `verifyManifest`, `verifyReferences` —
`src/lib/vite/internal.ts:71-81`), it strips itself from the nested server's plugin list to avoid recursing,
and it runs in `buildStart` deliberately, "outside the prerender request lifecycle (where handleHttpError
could downgrade it)" (`src/lib/vite/internal.ts:8-10`). The manifest format is engine-owned, so this is
clause (a) squarely.

**Both directions.** Against keeping: it is a build-time surface a site could in principle replace with a
pre-build `npm run` step, and the options duplicate globs the adapter arguably knows. The second point does
not survive contact with the code — `import.meta.glob` needs literal patterns baked into the generated
source before the adapter is ever evaluated (`internal.ts:55-60`), so passing them explicitly is the honest
shape, not a leak. The first point trades a hard build failure for a step people forget, which is the exact
failure the plugin exists to catch. The shape is already lean: one plugin, one options object, and the
write/verify/derive machinery the bins share stays internal by relative import, never on this subpath
(`src/lib/vite/index.ts:4-6`). Keep.

---

## Subsystem note

The `/vite` and `/islands` halves of this bucket are clean: three of the four exports there are things a
site provably cannot build (an engine-owned manifest verify inside the app's own Vite graph; an
engine-emitted DOM boundary contract), and the fourth is one of their signatures. `/render` is the opposite.
Four of its five exports are markup wrappers carrying one family site's CSS prefix into the engine, kept
alive by a scaffold template the engine itself authors; the fifth is a workaround for a union the engine
chose, and belongs on the context object rather than as an import. Retiring the four and folding `strAttr`
into `ctx.str()` empties the `/render` subpath of value-typed helpers, which raises a follow-on question
this audit flags rather than answers: whether `/render` should continue to exist as a subpath at all once
its remaining public content is the `ComponentContext` type (audited in another bucket).
