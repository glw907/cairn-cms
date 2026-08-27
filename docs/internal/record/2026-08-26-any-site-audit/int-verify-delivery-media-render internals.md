# Verification — delivery / media / render / islands / reproductions internals

Fresh-context verification of the five ranked findings in
`int-rank-delivery-media-render.md`. Each tested in both directions against the code, against
`docs/internal/code-idioms.md`, and against the standing rulings in
`docs/internal/engine-rulings.md` (notably the 2026-08-26 any-site surface audit, whose render
verdicts land squarely on two of these findings).

Verdicts: 1 STANDS (narrowed), 2 STANDS, 3 STANDS, 4 STANDS, 5 DROPS.

---

## 1. `ec-class-prefix-in-public-render` — STANDS, narrowed. Tier: refactor (unchanged).

**Confirmed literally.** `src/lib/render/glyph.ts:17` `className: ['ec-glyph']`;
`src/lib/render/rehype-dispatch.ts:30` `['ec-icon','ec-icon-secondary']`, `:52` `['ec-head']`,
`:62` `['ec-grid']`. Published at `docs/reference/render.md:20`. Three admin components
re-declare `.ec-glyph` with the apologetic comment ("ec-glyph is the public render pipeline's own
class"): `IconPicker.svelte:101`, `ComponentInsertDialog.svelte:478`, `MediaPicker.svelte:267`.
The contradiction with `highlight.ts:15-17`'s written `.cairn-tok-*` class contract is real, and
every other engine-emitted class obeys it (`cairn-place-*`, `cairn-broken-link`,
`cairn-broken-media`, `cairn-tok-*`, `cairn-roles`).

**Argued against.** No ruling sanctions `ec-`. The one thing close to a sanction is the opposite:
the 2026-08-26 any-site audit already flagged it (`record/2026-08-26-any-site-audit/
verify-render-build-tooling.md:57-58` raised `glyph`/`ec-glyph` as an unresolved "cross-bucket
evenness flag"). So this finding is not novel, but it is also not superseded.

**What the rulings DO change: the scope.** `engine-rulings.md:2920/2927/2934` retire `cardShell`,
`iconSpan`, and `headRow` outright ("open until executed; the remediation pass closes it"). Those
three own `ec-icon`, `ec-icon-secondary`, and `ec-head`, so that half of the rename evaporates when
the retire lands — renaming them first would be work thrown away. `markFirstList`/`ec-grid` is
internal (`authoring.ts:3` names it internal; `render-exports.test.ts:26` asserts it is not
exported) and has no caller in `src/lib` at all, only tests.

**The live residue is `ec-glyph`, and it is the strongest instance.** `glyph` is ruled **keep**
(`engine-rulings.md:612`), is on the root barrel, and stamps `ec-glyph` on every rendered icon of
every cairn site. The shipped showcase chassis — the starting chassis every new theme copies —
carries a dozen `.ec-glyph` rules (`examples/showcase/src/chassis/prose.css:546, 559, 572, 578,
628, 708, 759, 810, …`), and aksailingclub's stylesheet reaches for it too. A developer must write
`.ec-glyph` with no way to learn what `ec` means, and 1.0 freezes it.

**Revision to the remediation, not the verdict.** Rename `ec-glyph` → `cairn-glyph` across
`glyph.ts`, the three admin components, the tests, `docs/reference/render.md`, and the showcase
chassis CSS, with one `Consumers must:` line. Sequence it with (or after) the `cardShell`/
`iconSpan`/`headRow` retire so the `ec-icon`/`ec-head` half is deleted rather than renamed.

---

## 2. `dead-siteconfig-parameter` — STANDS. Tier: refactor (unchanged).

**Confirmed literally.** `site-descriptors.ts:13-15` is `export function siteDescriptors(adapter,
siteConfig) { void siteConfig; return normalizeConcepts(adapter.content); }`, with the doc comment
saying it is "retained for API stability". `site-indexes.ts:39,43` and `manifest.ts:18,21` each
take `config: SiteConfig` and use it for nothing but forwarding — verified by grepping every
`config` occurrence in both files (site-indexes: the import, the parameter, the forward; manifest:
the import, the doc line, the parameter, the forward). Published at
`docs/reference/delivery-data.md`; `examples/showcase/src/chassis/entry-data.ts:11` and
`content.ts:24` construct one to satisfy it, as does `src/lib/vite/internal.ts:79`.

**Argued against.** Two candidate sanctions, both fail. (a) `code-idioms.md` F4 says "Existing
public signatures are frozen" — but F4 governs the *options-object* conversion rule, not the
retention of a parameter the function documents as dead, and the charter predates the churn-free
ruling. (b) `engine-rulings.md:2836` rules `siteDescriptors` **keep** — that verdict is about
membership on the public surface, and its own record says the opposite about the parameter.

**Independently corroborated.** The any-site audit reached the same conclusion twice:
`record/2026-08-26-any-site-audit/rank-delivery.md:852` ("Against, and it should be fixed: the
`siteConfig` parameter is dead … that parameter should be dropped rather than preserved") and
`:1108` ("Two vestigial parameters … the standing ruling says stability is not a reason to keep a
wrong shape before beta"). That doc also names a second instance the finding misses:
`PublicRoutesConfig.assetsEnabled`, which changes no behavior and is absent from the reference
page. Worth folding into the same remediation.

---

## 3. `fake-async-component-grammar` — STANDS. Tier: refactor (unchanged).

**Confirmed literally.** Five `async` functions, zero real awaits:
`component-grammar.ts:147` `parseComponent` (body: `return valuesFromRoot(findComponentRoot(...))`),
`:180` `componentRoundTripSafety`, `:210` `parseComponentWithRawKeys`,
`component-validate.ts:14` `validateComponent`, `component-insert.ts:15` `buildComponentInsert`.
Every `await` in the three files awaits another of the five (`:198`, `:199`,
`component-validate.ts:15`, `component-insert.ts:17`). `unified().parse()` is synchronous and
`schema.validate(...)` at `component-validate.ts:19` is called without an await, so nothing in the
chain is or could become a promise today.

**The call-site cost is real and larger than the finding claims.** `EditPage.svelte:893-928` is not
just a `.then` — it is ~20 lines of comment plus a `SeqArbiter` latest-wins guard plus a live
`caretComponent !== current` re-check plus a `.catch` fallback, all of which the in-code comment
justifies by "componentRoundTripSafety is async, so a slow check could resolve after a newer caret
move". Make the function synchronous and the arbiter, the belt-and-suspenders caret re-read, the
`.catch`, and the A1 `.then` violation all collapse into a direct assignment. This is the strongest
evidence for the finding, and it is stronger than the version filed.

**Argued against.** No comment, ruling, or record anywhere claims the async is deliberate
future-proofing, and the churn-free-until-beta ruling refuses that argument regardless. One
mitigating fact worth recording: none of the five is on a public subpath (absent from
`src/lib/index.ts`, `render/authoring.ts`, `components/index.ts`, and all of `docs/reference/`), so
this is an internal signature change with no `Consumers must:` line — cheaper than the finding
assumes.

---

## 4. `two-directive-typings-two-plugin-signatures` — STANDS. Tier: refactor (unchanged).

**Confirmed literally, both forks.**
*Directive nodes:* `remark-figure.ts:10` imports `ContainerDirective` and uses it at `:78`;
`remark-directives.ts:2` imports `ContainerDirective`/`LeafDirective`/`TextDirective` and then does
not use them in its helpers, casting `node: unknown` at `:7` and `:14` and doing ad-hoc
`(child as { type?: string })` / `(child as { name: string })` casts at `:94-97`;
`component-grammar.ts:68-78` hand-rolls a local `DirectiveNode` interface plus casts at `:76`,
`:97-98`, and elsewhere.
*Plugin signatures:* `collect-headings.ts:37` and `table-scroll.ts:49` type `(tree: Root)`;
`resolve-links.ts:20-23` and `resolve-media.ts:189-192` type `(tree: unknown)` and then write
`visit(tree as Parameters<typeof visit>[0], …)`.

**Argued against, and the counter-argument fails.** The plausible defense is that the mdast side
cannot be typed the way the hast side is. `remark-figure.ts:77` disproves it inside the same
directory: it is an mdast plugin typed `(tree: Root, file: VFile)` with mdast's `Root`. The second
defense is `remark-figure.ts:22-23`'s in-code convention note ("this mirrors the local cast idiom
in remark-directives.ts") — but that note covers only the `HastData` (`data.hName`/`hProperties`)
cast, which is a genuine gap in the shipped mdast `Data` type, not the `tree: unknown` or the
`DirectiveNode` duplication. `resolve-shared.ts`'s `ResolvableNode` is a deliberate structural type
spanning Link and Image, and `markNodeBroken` takes it structurally, so typing the visit callback
against mdast's real `Link`/`Image` still satisfies it. Nothing in `code-idioms.md` or
`engine-rulings.md` addresses plugin or node typing at all, so there is no ruling to defer to and
M-series precedent ("one obvious way per pattern") points the other way.

**Note for the remediation.** `resolve-include.ts:78`'s `as unknown as RootContent` (an hName-only
paragraph) is the one cast with a real ecosystem justification and should survive, as the finding
already says.

---

## 5. `authoring-toolkit-inside-dispatcher` — DROPS.

Two independent reasons, either sufficient.

**(a) The central evidence is false.** `src/lib/render/authoring.ts` is not "one line". It opens
with a seven-line `// cairn-cms:` M1 header that does exactly the job the finding says is missing:
it names the file as the component-authoring toolkit for `@glw907/cairn-cms/render`, states that
the curation is deliberate, names the internal helpers held back by name ("strProp, markFirstList,
dataAttrProp stay internal"), records that `rehypeDispatch` is deliberately omitted and why, and
sets the admission rule for anything proposed there. It also exports `ComponentContext`. The
public/internal line is therefore carried by a written contract at the barrel, not "only by which
names authoring.ts happens to re-export". A newcomer asking "where do the hast builders live" reads
that header and is told. The residual true fact — `rehype-dispatch.ts` opens on a bare import with
no M1 header — is already finding 6 in the same document, so nothing is lost by dropping this one.

**(b) The remediation contradicts a standing ruling made in this same audit round.** Of the five
symbols the finding proposes to rehouse in a new `hast-builders.ts`, four are ruled **retire** and
one **reshape**: `cardShell` (`engine-rulings.md:2920`), `iconSpan` (`:2927`), `headRow` (`:2934`),
`isElement` (`:2941`), and `strAttr` (`:2948`, reshape — "Move the reader onto ComponentContext as
`ctx.str(key)` … and drop the standalone export"). All five are marked "open until executed; the
remediation pass closes it." Building a new file to house symbols already ruled out of existence is
work thrown away, and after the ruling lands the `/render` subpath carries essentially only
`ComponentContext`, at which point the organizational complaint dissolves on its own. The two
internal survivors (`strProp`, `markFirstList`) do not justify a file.

Per the standing instruction, a finding that pattern-matches a generic organization instinct but
ignores a repo ruling does not stand.
