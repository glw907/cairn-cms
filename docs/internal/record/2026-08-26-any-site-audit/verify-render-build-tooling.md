# Verification pass: render / build tooling (`/render`, `/islands`, `/vite`)

Fresh-context verifier. I did not write the ranking. Every claim below was re-derived from the code
and the family checkouts, not from the ranking's text.

## Independent re-derivation of the shared evidence

- The three hast builders bake family classes: confirmed at `src/lib/render/rehype-dispatch.ts:30`
  (`['ec-icon','ec-icon-secondary']`), `:39` (`card-body`), `:51-52` (`card-title`, `ec-head`).
- The engine ships no CSS for any of them: `grep -rn "ec-icon\|ec-head\|card-title\|card-body\|ec-grid"
  src/lib --include=*.css` returns **nothing**.
- Stronger than the ranking claims: **the engine itself never calls any of the four `/render` value
  exports.** `grep -rn "cardShell\|headRow\|iconSpan\|strAttr\|isElement(" src/lib` outside
  `rehype-dispatch.ts` returns only the barrel re-export line and one comment in `src/lib/index.ts`.
  They exist solely as re-exports for site code, so clause (a) ("the site cannot legally reach or patch
  the surface") is structurally unavailable to all four.
- Call counts reproduced exactly (`grep -rho "\b<name>(" <site>/src | wc -l`): cardShell 1/0/1/1/1/0,
  headRow 2/1/1/1/1/0, iconSpan 1/1/1/1/1/0, strAttr 17/10/15/15/15/0, isElement 4/4/0/0/0/0,
  hydrateIslands 0/2/1/1/1/0 across ecxc-ski, aksailingclub-org, xcathletes-org, cairn-pub, showcase,
  907-life. `templates/waymark` matches showcase exactly (strAttr 15, the rest 1, isElement 0).
- Every git provenance claim verified with `git log -S … --reverse`: cardShell/iconSpan `f22ef893`/
  `9ab548c3`; headRow `4a9cf555` then `29486e57`; strAttr `e2193359`; hydrateIslands `4087c252`;
  cairnManifest `26fee41e`. Spec quotes at
  `docs/superpowers/specs/2026-06-05-cairn-render-authoring-surface-design.md:18`, `:43`, `:87-90` all
  read as quoted.

**New evidence the ranking did not surface, and the single most decisive fact in the bucket.**
aksailingclub-org is the one site that authored its component set from scratch, under its own `asc-`
prefix. Its hand-authored component stylesheet nevertheless contains
`../aksailingclub-org/src/theme/asc-components.css:17: .prose .asc-passage .ec-head` and `:31:
.prose .asc-passage .ec-head .ec-glyph`. That is the anonymous-consumer harm demonstrated, not
hypothesized: a site with an unrelated design vocabulary is forced to write rules against another
site's CSS prefix because the engine bakes it. It confirms ranks 1-3 independently of the
chassis-copy argument.

---

## Rank 1 — `cardShell` — verdict **retire** — STANDS

Both directions tested. For keeping: `templates/waymark/src/theme/cairn.config.ts:4` imports it, so a
stranger scaffolding a site gets it working out of the box. Against: the template is engine-authored,
its `.card-body` rules live in `templates/waymark/src/chassis/prose.css:520` (a different repo from the
markup that depends on them), and the template already imports `h` from hastscript at `:7`. The engine
never calls the helper. Body is one `h()` nesting another. No ratified grammar has diverged, because
`card-body` is a DaisyUI class the chassis happens to use, ratified nowhere.
Retire.

## Rank 2 — `iconSpan` — verdict **retire** — STANDS

I looked hard for an engine-side dependency on the class or on the `role === 'secondary'` convention.
There is none: `grep -rn "secondary" src/lib/render/*.ts` returns only the function's own two lines. The
site-side wrap is universal and identical — `return (name, role) => iconSpan(glyph(name, icons), role);`
at `ecxc-ski/src/chassis/render.ts:17`, `aksailingclub-org/src/chassis/render.ts:24`,
`templates/waymark/src/chassis/render.ts:20` — so every site already owns the seam that matters.
Retire.

**Cross-bucket flag (evenness, not a verdict change).** `glyph()` on the root barrel bakes `ec-glyph`
the same way (`src/lib/render/glyph.ts:17`), and aksailingclub's stylesheet reaches for `.ec-glyph`
above. Retiring `iconSpan` while `glyph` keeps the family prefix leaves the same defect one layer down.
The bucket that owns `glyph` should see this.

## Rank 3 — `headRow` — verdict **retire** — STANDS

The strongest keep case in the /render group, and it still fails. Tested two extra angles the ranking
did not: (1) the `level` parameter interacts with a real engine contract, since
`rehypeCollectHeadings` (`src/lib/render/collect-headings.ts`) collects every h1-h6 in the final tree
into the page TOC — but a site emitting `h('h2', …)` itself feeds that contract identically, so nothing
here is engine-owned; (2) the independent-author evidence cuts the other way once its CSS is read (see
`asc-components.css:17` above). Retire.

## Rank 4 — `isElement` — verdict **retire** — STANDS

Generality granted; necessity fails. Body is `return !!node && node.type === 'element';`
(`rehype-dispatch.ts:7`) over `hast` types every calling site imports anyway, and
`hast-util-is-element` exists upstream. The recorded trigger is one family site's inlined copy (spec
`:19`, `:43`), which is the absence-of-objection pattern the standard rejects. Note that the flagged
`absenceOfObjection: true` is accurate here and, unusually, argues *for* the ranking's verdict rather
than against it. Retire.

## Rank 5 — `strAttr` — verdict **reshape** (onto `ctx.str(key)`) — STANDS, and the feasibility
risk the reshape hedged on does not exist

The reshape carried a fallback: "if the accessor cannot move onto the context, retire." I tested that
condition and it is clear.

- `ComponentContext` is constructed in **exactly one** place in the engine
  (`rehype-dispatch.ts:178-183`); `grep -rn "\.build(" src/lib` returns one call site
  (`:184`). There is no second, preview-path context to keep in sync.
- No family site ever *constructs* a `ComponentContext`; all 40+ hits across ecxc-ski,
  aksailingclub-org, cairn-pub, showcase, and waymark are type annotations on `build` functions. Adding
  a method breaks no site code at all, not merely cheaply.
- Precedent inside the very spec that created `strAttr`: the same pass moved the icon lookup onto the
  registry object as `registry.iconField(name)` "beside `get` and `defaultIcon`" (spec `:93-95`) for
  exactly this reason. `ctx.str` beside `ctx.slot` and `ctx.items` is the house pattern, not a novelty.

The tax is engine-imposed (`attributes: Record<string, string | boolean>`, `registry.ts:40`), so the
item is not site-shaped; but it is an import a site should not need. Reshape stands.

Follow-on the audit should note but not act on here: the deeper fix would be typing `attributes` from
the component's own `FieldDescriptor` declarations so a `text` field reads as `string` with no accessor
at all. That is blocked by `build` living inside the same object literal it would infer from, so
`ctx.str` is the right answer today, not a permanent one.

## Rank 6 — `CairnManifestOptions` — verdict **keep** — STANDS, with the stated anySiteCase
downgraded

Keep-burden test applied. The ranking's headline scenario ("a monorepo with two cairn sites", a shared
`makeCairnPlugins`) is thin: I would not accept it alone, and no family site does it — all six pass an
object literal (`templates/waymark/vite.config.ts:38`, `examples/showcase/vite.config.ts:38`). The
verdict survives on the ground the ranking states second, which is the real one: **this adds no
capability.** It is the parameter type of a kept export, already structurally reachable as
`Parameters<typeof cairnManifest>[0]`, and naming an exported function's options interface is the
TypeScript norm. Withholding the name buys the surface nothing and costs an incantation. Keep.

## Rank 7 — `hydrateIslands` — verdict **keep** — STANDS

The clearest clause-(a) item in the bucket, and the claim survives reading the code. The contract it
consumes is stamped by `islandBoundary` (`rehype-dispatch.ts:158-169`: `dataCairnIsland`,
`dataCairnProps` as JSON of coerced scalars, `dataCairnHydrate`), is invisible in the site's source,
and moves with the engine. The lifecycle knowledge is not derivable site-side: module-level
`mounted`/`observers` with `teardown()` before each pass (`src/lib/islands/index.ts:22-33`), `unmount(…,
{ outro: false })` so a component with an out-transition cannot double-render against the next mount,
and per-island try/catch so one bad island leaves its fallback rather than blanking the page (`:39-52`).
anySiteCase concreteness: the scaffold ships an island (`templates/waymark/src/theme/islands/Banner.svelte`),
so a stranger meets this on day one, and the documented call site is `afterNavigate`
(`docs/reference/islands.md:45-58`). Keep.

**Shape defect to file (does not change the verdict).** The signature accepts `root: ParentNode` but
`teardown()` is module-global, so `hydrateIslands(islands, someSubtree)` unmounts islands mounted
elsewhere on the page. The parameter promises a scoping the implementation does not honor. That is a
bug in a kept export, not a membership question, but a stranger hydrating a modal's content would hit
it.

## Rank 8 — `cairnManifest` — verdict **keep** — STANDS

Tested the one objection that could have moved it: could `content` be derived from the adapter, making
the options shape a leak? A two-pass eval is *technically* possible (`readAdapterFacts`,
`internal.ts:350`, already evaluates the config module in Node), so the ranking's "does not survive
contact with the code" is slightly overstated. But the objection still fails: the site writes literal
`import.meta.glob` patterns in its own runtime module regardless
(`examples/showcase/src/chassis/content.ts:8,13,18`), because a glob pattern must be literal in the
module that runs it; the plugin's virtual module is a different module and needs its own. Explicit is
the honest shape. Everything else checks out: the verify runs in `buildStart` outside the prerender
lifecycle (`internal.ts:8-10`, `:171-177`), through a nested Vite server that inherits the consumer's
config and strips itself to avoid recursion (`:91-113`, `:131-135`), over engine-owned internals
(`buildSiteManifest`, `verifyManifest`, `verifyReferences`, `:71-81`). Clause (a). Keep.

**Residual footgun worth filing.** `buildSiteManifest` does `globRecord[descriptor.id] ?? {}`
(`src/lib/delivery/manifest.ts:20`), so a concept declared in the adapter but missing from the plugin's
`content` map yields zero entries with no error, and the committed manifest regenerates to match. A
stranger who adds a concept and forgets the glob gets a silently empty section — the exact failure
class this plugin exists to prevent, one level up from where it guards.

---

## Subsystem read

I agree with the ranking's split and reached it independently: `/vite` and `/islands` are engine-owned
mechanism a site cannot build; `/render`'s value exports are one family's markup vocabulary shipped as
engine surface. All eight verdicts stand. Two refinements (a downgraded anySiteCase on rank 6, an
overstated derivability claim on rank 8) and three new findings (the `asc-components.css` harm, the
`glyph`/`ec-glyph` evenness flag, the `hydrateIslands` root-scoping defect, the missing-glob footgun)
are recorded above.
# Fresh-context verification: render / build-tooling (`/render`, `/islands`, `/vite`)

Verifier had no hand in the ranking. Each verdict tested in both directions against the standard.
All ten provenance commits in the ranking were resolved with `git log -1` and every subject line
matches what the ranking claims. Every code line-number citation I checked resolved to the claimed
content. The ranking is factually sound; the notes below are where I pushed on it.

---

## 1. `cardShell` — verdict `retire` — **stands**

**Gate test.** Clause (a) fails: the site owns every class in its own `build()` return and can emit
the two-element shell itself. Clause (b) fails harder than the ranking states — I verified the engine
ships *no* CSS at all for `card-body` (`grep -rn "card-body" src/lib` returns only
`HelpHome.svelte`'s unrelated `.help-card-body`), so there is nothing engine-shipped for a site
grammar to have diverged *from*. `card-body` is a DaisyUI class that `templates/waymark`'s copied
chassis re-defines under `.prose .alert .card-body` (`prose.css:520`), in the site's own repo.

**Best keep case I could build, and why it fails.** The scaffold couples engine output to chassis CSS
explicitly: `templates/waymark/src/chassis/tokens.css:17` documents "cairn.config.ts's
`cardShell`/`headRow`, emits real `card-body`/`card-title`/`alert`". That is the closest thing to a
ratified grammar in the bucket. It still fails: the coupling is between two files the *site* owns
after scaffolding, and the engine is the third party baking one half of it into a published export.

**New evidence, against keeping.** The shipped teaching doc makes the case worse than the ranking
argued. `docs/extend/configure-rendering.md:57-60` hands a stranger:

```ts
cardShell(['callout'], [ headRow(ctx.slot('title')), h('div', { className: ['callout-body'] }, ...) ])
```

The stranger's `callout` CSS has no `.card-body` or `.card-title` rule, so the doc silently gives
them two classes they must discover and style, *and* the same snippet already imports `h` from
hastscript one line below. The engine's own tutorial demonstrates that the hand-roll is in scope.

---

## 2. `iconSpan` — verdict `retire` — **stands**

Confirmed at `rehype-dispatch.ts:29-32`: the entire body is a class-name decision (`['ec-icon']`,
plus `ec-icon-secondary` for the hard-coded role string `'secondary'`). `ec-` is one family site's
prefix and the engine styles it nowhere.

**Additional evidence the ranking did not use.** Two facts sharpen the retire:

1. The published reference documents the family prefix as engine API verbatim: "`iconSpan(glyphEl,
   role?)` wraps a built glyph element in an `ec-icon` span" (`docs/reference/render.md:19`).
2. The engine exports the wrapper but **not** the type of the seam every site actually keeps.
   `MakeIcon` is declared at `rehype-dispatch.ts:35` and exported from no public barrel
   (`grep -rn MakeIcon src/lib` hits only that declaration; `authoring.ts:8` does not re-export it,
   despite the design spec `:43` planning it). So the surface exports the site-specific half and
   withholds the general half. That incoherence is an argument for retiring `iconSpan`, not for
   adding `MakeIcon`.

The scaffold confirms the wrap-immediately pattern the ranking measured on the family sites:
`templates/waymark/src/chassis/render.ts:20` is `return (name, role) => iconSpan(glyph(name, icons), role);`.

---

## 3. `headRow` — verdict `retire` — **stands**

The real logic is genuine but small (`rehype-dispatch.ts:48-53`: optional icon, `level` default 2),
and it bakes `ec-head` on the wrapper and `card-title` on the heading.

**Hardest keep case: is any engine mechanism coupled to the heading it emits?** I checked, because if
`rehypeCollectHeadings` depended on component heads the engine would have a stake in the tag. It does
not: `collect-headings.ts:37-40` visits every `h1`-`h6` in the tree by tag name alone, with no class
or component coupling, so a hand-rolled `h('h2', …)` participates identically. No engine dependency
on `.ec-head` or `.card-title` exists anywhere in `src/lib`.

That closes the only clause-(a) route. Retire.

---

## 4. `isElement` — verdict `retire` — **stands**

Body is one line (`rehype-dispatch.ts:6-8`) over `hast` types the site already imports. The recorded
trigger is a family site's inlined copy (spec `:19`, `:43`), which the standard names as insufficient
on its own. `absenceOfObjection: true` is correctly flagged.

**Direction I pushed hardest.** Generality is real here (unlike ranks 1-3), so I looked for a
necessity argument: does inline `node?.type === 'element'` narrow as well as the predicate in a
consumer's `tsconfig`? It does — `type` is the discriminant of the `ElementContent` union, so TypeScript
narrows on the comparison with no predicate needed. There is no ergonomic residue to protect.

---

## 5. `strAttr` — verdict `reshape` (to `ctx.str(key)`) — **stands**, with a stronger reshape target flagged

**Feasibility of the named reshape, verified.** `ComponentContext` is constructed in exactly one
place in the engine (`rehype-dispatch.ts:178`) and nowhere in any site or template
(`grep -rn ComponentContext src/ examples/ templates/`: sites only ever *receive* it). Adding
`str(key)` beside `slot`/`items` (`registry.ts:42-44`) is therefore a pure engine-side change; only
the engine's own test helper `ctxWith` (`render-rehype-dispatch.test.ts:139`) constructs one. The
fallback clause in the reshape note is not needed.

**A better shape the ranking did not consider.** The tax exists only because `attributes` is typed
`Record<string, string | boolean>` (`registry.ts:40`) while `readAttributes`
(`rehype-dispatch.ts:83-91`) already knows each field's declared type and returns `boolean` only for
`type:'boolean'`. Since `defineComponent<const D extends ComponentDef>` already captures the literal
def, a per-def attribute type (`{ [K in keyof A]: A[K]['type'] extends 'boolean' ? boolean : string }`)
would remove the narrowing entirely rather than provide a reader for it, and the endpoint there is
`retire`, not a new accessor. That is a larger refactor and a call for the engine owner.

Either path is non-keep and the recorded verdict already carries `retire` as its fallback, so the
verdict direction is robust. Recording `stands: true` with the alternative noted.

---

## 6. `CairnManifestOptions` — verdict `keep` — **stands** (thin but adequate anySiteCase)

**Concreteness test of the stated scenario.** "A monorepo with two cairn sites / a shared
`makeCairnPlugins`" is plausible but not compelling on its own: a consumer can always write
`Parameters<typeof cairnManifest>[0]`, which resolves whether or not the interface is exported, so
the stated failure mode is an ergonomic loss, not a wall. On the stated scenario alone this keep
would be weak.

**What actually carries it.** Two things the ranking undersells:

1. It is not new surface. It is the sole parameter type of a kept export, already structurally
   reachable, already fully documented (`internal.ts:29-39`, `docs/reference/vite.md`). Retiring the
   name removes zero capability and adds zero cleanliness.
2. It is the **shared** contract between the plugin and the shipped `cairn-manifest` bin.
   `writeManifest` (`internal.ts:195-217`) reads the very same options object back off the plugin
   instance through `Symbol.for('cairn-cms.manifest-options')`, so the type names one object with two
   engine consumers, not one call site's literal.

**Shape check.** The `content: Record<string, string>` glob duplication is the one shape objection,
and it does not survive the code: `virtualSource` (`internal.ts:52-60`) bakes each pattern into
generated source via `JSON.stringify` because `import.meta.glob` requires literal patterns, evaluated
before the adapter exists. Passing them explicitly is honest, not a leak. Keep.

---

## 7. `hydrateIslands` — verdict `keep` — **stands**, with a shape defect filed

**Clause (a) verified, not assumed.** The contract the runtime consumes is engine-emitted and
invisible in site source: `islandBoundary` (`rehype-dispatch.ts:158-170`) stamps `dataCairnIsland`,
`dataCairnProps` (JSON of `serializeIslandProps`, which coerces `number` fields), and
`dataCairnHydrate`. The duplicate-mount claim is real: `mounted`/`observers` are module-level
(`islands/index.ts:18-19`) and `teardown()` runs first in every call, which is exactly what a
hand-rolled `querySelectorAll` scan would not do. The failure-isolation behavior (`mountIsland`
try/catch on `JSON.parse` and on `mount`, restoring the fallback) is likewise not derivable
site-side. This is the strongest item in the bucket.

**Defect found while testing the shape (does not overturn the verdict).** The `root` parameter and
the module-global teardown contradict each other. `docs/reference/islands.md` tells a stranger
"`root` defaults to `document`. Pass a narrower `ParentNode` to scope the scan to one region." A
consumer with two independent island regions (a persistent sidebar plus main content) who follows
that sentence gets silent breakage: the second call's `teardown()` unmounts the first region's
instances, and because `mountIsland` discarded the fallback via `node.replaceChildren()`, those
boundaries are left **empty**, not restored. That is a plausible anonymous-consumer path.

I considered whether this makes the verdict `reshape`. It does not: the fix is per-root mount
bookkeeping (or a returned disposer) behind an unchanged signature, i.e. a correctness repair inside
a shape that is otherwise right, not a different form of the export. Filed as a defect for the engine
owner, verdict `keep`.

---

## 8. `cairnManifest` — verdict `keep` — **stands** (stronger than the ranking argued)

**Concreteness of the scenario.** Confirmed: the manifest is a committed JSON file
(`DEFAULT_MANIFEST_PATH = '/src/content/.cairn/index.json'`), the verify runs in `buildStart` through
a nested Vite SSR load deliberately outside the prerender lifecycle (`internal.ts:8-10`, `:171-178`),
and `verifyReferences` is documented in-code as having no prerender backstop (`:64-66`), so this gate
is the only integrity authority for references. The "edit markdown, forget to regenerate, ship a
silently incomplete index" path is real.

**The hardest counter, and the fact that kills it.** The strongest objection is that a site could run
the shipped `cairn-doctor`/`cairn-manifest` bin as an npm `prebuild` step instead — and `prebuild`
*does* run on the Cloudflare build path, so "they'd forget" is weaker than the ranking implies. But
the bin cannot replace the plugin, because the bin **depends on** it: `writeManifest`
(`internal.ts:195-217`) loads the consumer's Vite config and throws `"cairn-manifest: the Vite config
has no cairnManifest() plugin. Add it so the bin shares the build options."` when the plugin is
absent. The plugin is the single declaration point for both the write and the verify path. Retiring
it would break a shipped bin. Keep, on firmer ground than the ranking claimed.

---

## Subsystem note (verifier's own)

The ranking's closing observation holds up: `/render`'s five value exports reduce, after this audit,
to one accessor that belongs on `ComponentContext`. I checked what would remain on the subpath if all
five leave — `authoring.ts:9` re-exports only the `ComponentContext` type, which is already exported
from the root barrel (`src/lib/index.ts:99`), from `/sveltekit` (`:179`), and from `/delivery/data`
(`:54`). So the follow-on question the ranking flags is sharper than it stated: `/render` would hold
nothing that is not already reachable from three other subpaths. That is a subpath-existence
question for the engine owner, not a per-item verdict.
