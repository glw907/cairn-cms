# Internals rank: core / adapter / content

Area: `src/lib/{ambient,email,env,escape,index}.ts`, `src/lib/content/**` (31 files),
`src/lib/nav/site-config.ts`, `src/lib/design/grammar-tokens.ts`. Repo at `main`, 2026-08-26.

Audited against `docs/internal/code-idioms.md` (E/V/F/M/N/A/L/T rules), the TSDoc standard from
CLAUDE.md "Authoring", and the three bar clauses (idiomatic; comprehensible to a new developer;
extensible by an AI agent).

## State of the area

This is a strong, deliberately-written area and it clears the bar in most respects. Every module
is pure, side-effect-free, Workers-safe TypeScript with no `console.*` (E7 clean), no `any`, no
tabs, no classes outside the one sanctioned `Error` subclass family, and no framework-fighting
code; there is essentially no SvelteKit surface here to get wrong, and what does touch Kit
(`ambient.ts`, the type-only `NavLayout`/`PublishActionsConfig` imports in `types.ts`) is layered
correctly and says why in the comment. The A2 cross-branch convergence the charter called "the
strongest single reuse win" has actually landed (`cross-branch-index.ts`), and the byte-preserving
rewriters (`frontmatter-region.ts`, `references.ts`, `media-rewrite.ts`) are the best code in the
repo: exact contracts, real rationale, hard-won edge cases recorded where they bite. Test coverage
is dense (60+ unit files over this area alone).

The shortfalls are concentrated in one theme and it is the third bar clause. **The field-descriptor
union is the engine's central extension point, and it is the least defended surface in the area:**
roughly ten dispatch sites across eight files, every one of them with a `default:` arm that
silently absorbs an unknown type as plain text, no exhaustiveness guard anywhere in `src/lib`, no
union-coverage test, and no checklist. An agent adding a field type gets a green build and a broken
field. Beneath that sit the ordinary polish items: three forked dispatchers over one union inside
`frontmatter.ts`, three names for one coercion, eight copy-pasted "additive field" blocks in
`manifest.ts`, two copies of one 25-line check in `fieldset.ts`, and a `nav/site-config.ts` whose
name promises a tenth of what it holds. **Grade: B+.** Idiom and comment discipline are near the
top of what this codebase can be; comprehension is good but leaky at three or four named spots;
agent-extensibility on the one surface an agent is most likely to extend is the real gap.

---

## 1. Adding a field type is a silent, unguarded, ten-site edit

**Tier: refactor. Limb: agent-extensibility.**

`FieldDescriptor` is a fifteen-arm union (`src/lib/content/fields.ts:122-137`) and it is the
documented extension point for the whole content model. Every consumer dispatches on `.type`, and
every dispatcher terminates in a permissive fallback rather than an exhaustiveness check.

`src/lib/content/fieldset.ts:289-301`:

```ts
    default: {
      // text, textarea, datetime: a trimmed non-empty string. text and textarea also enforce the
      // string-length and pattern constraints (v1 parity); datetime stays a plain string for now,
```

`src/lib/content/frontmatter.ts:53-58`:

```ts
    default: {
      // text, textarea, number-as-string, url, email, date, datetime: a trimmed non-empty string.
      const s = String(form.get(name) ?? '').trim();
      return s === '' ? undefined : s;
    }
```

`src/lib/content/frontmatter.ts:152-156`:

```ts
      default:
        // FormData.get returns null for an absent field; normalize to an empty string so
        // a caller reading a text value never gets null.
        data[field.name] = form.get(field.name) ?? '';
```

`src/lib/content/frontmatter.ts:307-309`:

```ts
    // Every other type is a plain string input: a nullish value reads as empty, anything else
    // stringifies (a string passes through unchanged).
    else out[field.name] = value == null ? '' : String(value);
```

A grep for exhaustiveness guards over the whole library returns nothing: `assertNever`,
`satisfies never`, and a `const _x: never = field` tail are absent from `src/lib` entirely. The
files that dispatch on a field type are `content/fieldset.ts`, `content/frontmatter.ts`,
`content/references.ts`, `content/media-refs.ts`, `content/taxonomy.ts`,
`delivery/content-index.ts`, `delivery/site-resolver.ts`, `components/FieldInput.svelte`,
`components/ReferenceField.svelte`, plus the `render/component-*` family for component attributes.

Consequence for an agent: add `ColorField` to the union and a `fields.color()` constructor and the
whole engine compiles, the type checker is silent, `npm run check` is 0/0, and the field silently
round-trips as an unvalidated string with a text input. Nothing in the gates teaches the ten
follow-up edits, and `docs/extend/content-model.md` does not enumerate them either. This is the
opposite of "gates that teach".

**Remediation.** Give every `.type` dispatch a `default:` that closes over the union
(`const unreachable: never = field; throw new Error(...)`), so a new arm is a compile error at each
of the ten sites rather than a silent text fallback. Where a permissive fallback is genuinely
correct (the text/textarea/datetime group in `validateField`), name the group explicitly with
`case 'text': case 'textarea': case 'datetime':` and keep the `never` tail. Add one
`field-type-coverage.test.ts` that iterates a literal list of every `FieldDescriptor['type']` and
asserts each one is handled by `validateField`, `decodeField`, `frontmatterFromForm`, `formValues`,
and `FieldInput.svelte`. Add a "adding a field type" checklist to `docs/extend/content-model.md`
naming the sites, and cross-reference it from the `fields.ts` module header.

---

## 2. `frontmatter.ts` forks one union three ways, with divergent empty-value contracts

**Tier: refactor. Limb: idiom + comprehension.**

One 327-line module carries three separate dispatchers over `FieldDescriptor['type']`, in three
different syntactic styles, with deliberately different semantics:

- `decodeField` (`src/lib/content/frontmatter.ts:26`), a `switch`, for nested use.
- `frontmatterFromForm` (`:83`), a `switch`, for top-level use.
- `formValues` (`:269`), an `else if` chain, for the read direction.

The two decode arms disagree on the empty case, which is documented but not reconciled:

```ts
// :23-25
// Decode one field addressed by `name`, for NESTED use (object leaves, array rows). Returns undefined
// when empty so the caller omits the key; this nested contract differs from the top-level arms, which
// preserve '' / [] for back-compat.
```

The divergence is real and load-bearing. Boolean, nested (`:29`):

```ts
    case 'boolean':
      return form.get(name) === 'on' ? true : undefined;
```

Boolean, top-level (`:90-91`):

```ts
      case 'boolean':
        data[field.name] = form.get(field.name) === 'on';
```

The `image` arm is then written out twice in full, once at `:36-44` and once at `:109-127`, with
the same four sub-key reads and the same caption/decorative rules, differing only in the
`return`-vs-`data[...] =` shape. The `multiselect` arm is likewise written twice (`:30-35`,
`:93-108`).

An agent asked to fix a decode bug (a caption that fails to trim, a `decorative` that fails to
persist) will find one of the two copies and fix half the product. A new developer reading the file
cannot tell from the outside which entry point a given call site reached.

**Remediation.** Collapse to one decoder with an explicit contract flag:
`decodeField(name, field, form, { emptyAs: 'omit' | 'preserve' })`, and let `frontmatterFromForm`
be the thin top-level loop that passes `'preserve'`. Convert `formValues`'s `else if` chain to the
same `switch` style so the file has one dispatch shape. Delete `multiselectFormValue`
(`:264-266`), a one-line pass-through to `coerceStringList` that adds a name and no behavior.

---

## 3. `CairnRuntime` optionals that are always filled multiply the default site

**Tier: refactor. Limb: comprehension + agent-extensibility.**

Two runtime fields are typed optional and documented as always-present, which forces every consumer
to re-state the default:

`src/lib/content/types.ts:398-406`:

```ts
   *  Optional on the runtime so a hand-built runtime need not set it; composeRuntime always fills it,
   *  and the edit load and the action default a missing value to the same content-root path.
   */
  dictionaryPath?: string;
```

The consequence, verified by grep. `compose.ts:14` declares `const DICTIONARY_PATH =
'src/content/.cairn/dictionary.txt'`, and `sveltekit/content-routes-context.ts:346` re-states the
same literal:

```ts
    return runtime.dictionaryPath ?? 'src/content/.cairn/dictionary.txt';
```

`spellcheckDictionary` fares worse: defaulted at `compose.ts:60`, re-defaulted at
`content-routes-core.ts:1105` (`runtime.spellcheckDictionary ?? dictionaryFileForDialect(undefined)`),
and re-defaulted a third time as a literal prop default in `MarkdownEditor.svelte:180`
(`spellcheckDictionary = 'dictionary-en-us.txt'`), with a fourth copy in
`reproductions/stories/support.ts:199`.

The same "validated somewhere else" looseness applies to two more members
(`types.ts:416-427`): `navLayout` and `publishActions` are "passed through from the adapter
unvalidated", with validation deferred to admin construction. That is a defensible layering call,
but the type carries no marker for it, so a reader of `CairnRuntime` cannot tell which members are
checked and which are raw.

**Remediation.** Make `dictionaryPath` and `spellcheckDictionary` required on `CairnRuntime` and
delete the three downstream `??` defaults and the two duplicated literals; a hand-built test runtime
gets them from the existing `_content-harness.ts` factory, which is where a default belongs. For the
deferred-validation pair, mark the shape in the type rather than only in prose (e.g. a
`Raw<NavLayout>` alias or a `navLayoutRaw` name) so the two-phase contract is visible at the
declaration.

---

## 4. `manifest.ts` is five modules in one file, with eight copy-pasted additive-field blocks

**Tier: refactor. Limb: idiom + comprehension.**

561 lines carrying the entry projection, the serialize/parse codec, the diff/verify gate, the
mutation helpers (`upsertEntry`, `removeEntry`, `stampFirstPublish`), five graph-query readers
(`inboundLinks`, `inboundIncludes`, `inboundReferences`, `deriveTagUsage`), and two resolver
factories. Only `serializeManifest`/`verifyManifest`/`verifyReferences` are public; the rest is
internal, and nothing in the file separates the two.

Inside it, the same block is written four times in `parseManifest`. `src/lib/content/manifest.ts:219-238`:

```ts
    // tags is additive and optional: an entry without it parses (the field reads as absent), so a
    // manifest committed before this field still builds. When present, validate each element is a
    // string, mirroring the mediaRefs-element validation, so a hand-edited file fails loudly.
    if (e.tags !== undefined) {
      for (const tag of e.tags as unknown[]) {
        if (typeof tag !== 'string') {
          throw new Error(`cairn: content manifest tags element ${JSON.stringify(tag)} in entry ${JSON.stringify(e)} is malformed`);
        }
      }
    }
    // includes is additive and optional: an entry without it parses (the field reads as absent), so
    // a manifest committed before this field still builds. When present, validate each element is a
    // string, mirroring the tags-element validation, so a hand-edited file fails loudly.
    if (e.includes !== undefined) {
```

and four more times in `verifyManifest` (`:311-352`), one per additive key:

```ts
      if (entry.tags && c && c.tags === undefined) {
        const { tags: _dropped, ...rest } = entry;
        entry = rest;
      }
```

The same "additive and optional" rationale paragraph appears twelve times across the file (four in
the interface docs at `:27-52`, four in `parseManifest`, four in `verifyManifest`). Under the TSDoc
standard that is paraphrase-by-repetition: the rule is stated once and re-typed eleven times, so a
future fifth additive field means a fifth copy at three sites, and a reader skims all twelve.

Minor consistency drift in the same file: `keyOf` is an arrow const (`:266`) where every other
helper is a `function` declaration, and `upsertEntry` (`:413`) re-derives the identity by hand
(`e.concept === entry.concept && e.id === entry.id`) instead of calling `keyOf`.

**Remediation.** Declare `const ADDITIVE_ARRAY_KEYS = ['mediaRefs', 'references', 'tags',
'includes'] as const` once with the rationale stated once above it, then loop over it in both
`parseManifest` and `verifyManifest`; a fifth additive field becomes one array entry. Split the file
into `manifest.ts` (entry projection plus codec plus verify) and `manifest-queries.ts` (the four
inbound readers plus the two resolvers), which also separates the public codec from the internal
graph readers. Use `keyOf` inside `upsertEntry`.

---

## 5. `validateField` stacks three dispatch mechanisms on one discriminant

**Tier: refactor. Limb: idiom + comprehension.**

`src/lib/content/fieldset.ts:137-302` is a 165-line function that dispatches on `field.type` three
times in three ways: an `if` chain for the container and special arms (`:148` object, `:166` array,
`:195` boolean, `:204` multiselect, `:226` image), then a `switch` for the coerced scalars
(`:254`), then a nested `if` inside the switch's `default:` (`:293`):

```ts
    default: {
      // text, textarea, datetime: a trimmed non-empty string. ...
      if (field.type === 'text' || field.type === 'textarea') {
        const lengthError = stringLengthError(text, field, label);
```

The split has a real reason (the arms before `coerceToText` must run before the empty-first drop at
`:248-251`), but nothing in the code states the boundary, so the reason has to be reconstructed by
reading all 165 lines. The charter's "one obvious way per pattern" is not met: a developer adding an
arm has to work out which of the three layers it belongs in.

**Remediation.** Extract each container/special arm into its own named function
(`validateObjectField`, `validateArrayField`, `validateMultiselectField`, `validateImageField`),
leaving `validateField` as a single `switch` whose pre-coercion arms delegate and whose scalar arms
stay inline. Add one sentence at the top naming the boundary: arms above the line handle their own
emptiness, arms below it rely on the shared empty-first drop.

---

## 6. `checkSeoImageFields` and `checkTaxonomyMarker` are one algorithm written twice

**Tier: refactor. Limb: idiom.**

`src/lib/content/fieldset.ts:310-332` and `:340-362` are structurally identical: walk the top-level
record, collect keys whose descriptor carries a marker flag, throw when a nested object or array
carries the same flag, throw when more than one top-level key carries it. Only the discriminant
(`'image'` vs `'multiselect'`), the flag (`seo` vs `taxonomy`), and the message text differ.

```ts
function checkSeoImageFields(record: Record<string, FieldDescriptor>): void {
  const seo: string[] = [];
  for (const [key, field] of Object.entries(record)) {
    if (field.type === 'image' && field.seo === true) seo.push(`"${key}"`);
    else if (field.type === 'object') {
```

```ts
function checkTaxonomyMarker(record: Record<string, FieldDescriptor>): void {
  const marked: string[] = [];
  for (const [key, field] of Object.entries(record)) {
    if (field.type === 'multiselect' && field.taxonomy === true) marked.push(`"${key}"`);
    else if (field.type === 'object') {
```

The comment blocks above them are also near-verbatim (`:304-309`, `:334-339`), including the
sentence "there is no field-name default, since the record key is arbitrary" in both.

A third such marker (a future `primaryDate`, a `searchable`) would be a third copy.

**Remediation.** One `checkSingleTopLevelMarker(record, { type, flag, noun, nestedMessage,
duplicateMessage })` called twice. State the "top-level only, at most one" rule once in its doc
comment and delete the two duplicated rationale blocks.

---

## 7. Three names for one coercion, and a fourth that quietly disagrees

**Tier: refactor. Limb: idiom + comprehension.**

`coerceStringList` (`src/lib/content/coerce.ts:10`) is the shared scalar-or-array coercer. It is
then re-exported under two more names that add nothing:

`src/lib/content/taxonomy.ts:18-20`:

```ts
export function coerceTags(value: unknown): string[] {
  return coerceStringList(value);
}
```

`src/lib/content/frontmatter.ts:264-266`:

```ts
function multiselectFormValue(value: unknown): string[] {
  return coerceStringList(value);
}
```

Meanwhile a fourth function does the same job with different semantics.
`src/lib/content/identity.ts:36-38`:

```ts
export function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
```

`asTags` drops a lone scalar; `coerceStringList` preserves it as a one-element list. The `coerce.ts`
header states that preserving the scalar is the point ("a lone `topics: svelte` projects
`['svelte']`, which the tag-usage index relies on for its delete-safety gate"). The two are used on
parallel paths: `manifest.ts:97` reads tags with `coerceTags`, `delivery/content-index.ts:129` reads
them with `asTags`. Today that is safe only because `content-index` reads post-validate data that is
already an array; nothing states or tests that precondition, and `asTags` sits in a module whose
other two coercers (`asString`, `asDate`) are used on raw frontmatter.

**Remediation.** Delete `coerceTags` and `multiselectFormValue`; call `coerceStringList` at the four
call sites. Replace `asTags` with `coerceStringList` in `delivery/content-index.ts` and delete it, or
if the drop-scalar behavior is genuinely wanted there, rename it to say so
(`tagsFromValidatedData`) and give it a test that pins the scalar case.

---

## 8. `nav/site-config.ts` is misnamed, over-scoped, and carries three identical error classes

**Tier: refactor. Limb: comprehension.**

431 lines under `src/lib/nav/` holding: the nav tree validator, the whole `site.config.yaml` schema
and its key-boundary guard, the entire tidy copy-edit convention vocabulary (~130 lines, `:119-262`),
the spellcheck dialect map, the tag vocabulary validator, and three YAML writers. Only the first
fifth of the file is about navigation.

A new developer looking for where `tidy.conventions` is defined, or where the spellcheck dialect
resolves, will not look in `nav/`. An agent grepping the tree for "tidy" finds it in
`sveltekit/content-routes-tidy.ts` and in `nav/site-config.ts` and has to read both to learn which
owns the vocabulary.

The module also carries three `CairnError` subclasses that are byte-identical apart from the name,
all three mapping to the same condition id:

```ts
export class NavValidationError extends CairnError {      // :31
  constructor(message: string) { super('config.site-config-invalid', { message }); this.name = 'NavValidationError'; }
```
```ts
export class TidyConventionsError extends CairnError {    // :214
  constructor(message: string) { super('config.site-config-invalid', { message }); this.name = 'TidyConventionsError'; }
```
```ts
export class SiteConfigError extends CairnError {         // :286
  constructor(message: string) { super('config.site-config-invalid', { message }); this.name = 'SiteConfigError'; }
```

Only `SiteConfigError` is exported from the root barrel (`src/lib/index.ts:129`), so a consumer
catching config errors gets one name and two anonymous siblings. The charter's E2 sanctions one
named subclass; it does not sanction three that mean the same thing.

The three YAML writers each repeat the same two-line preamble (`setMenu:357-361`, `setTidy:375-379`,
`setVocabulary:424-428`):

```ts
  const doc = parseDocument(raw);
  if (doc.get('siteName') === undefined) {
    throw new SiteConfigError('Site config must be a mapping with a siteName');
  }
```

Finally, this file and `email.ts` are the two M1 stragglers in the area: neither header opens
`// cairn-cms:` (`site-config.ts:1` is `// The navigation tree and its YAML site-config.`;
`email.ts:1` is `// The email boundary.`). `design/grammar-tokens.ts:1` opens with a `/** */` block
instead of the line-comment header form.

**Remediation.** Split into `src/lib/site-config/` with `schema.ts` (`SiteConfig`,
`parseSiteConfig`, the key boundary, the writers' shared `withDocument` helper), `nav-tree.ts`
(`NavNode`, `validateNavTree`, `extractMenu`, `setMenu`), `tidy.ts` (the conventions vocabulary,
resolve/validate, `setTidy`), and `vocabulary.ts`. Collapse the three error classes to
`SiteConfigError` alone. Factor `withDocument(raw, mutate)` for the three writers. Fix the three M1
headers.

---

## 9. `defineConcept` names the concept by its label or its directory

**Tier: refactor. Limb: comprehension.**

`src/lib/content/concepts.ts:49-58`:

```ts
export function defineConcept<const C extends ConceptConfig>(concept: C): C {
  const id = concept.label ?? concept.dir;
  validateUrlPolicy(
    id,
```

A concept's id is the key it is declared under in `adapter.content`, which `defineConcept` cannot
see. So the variable named `id` is a label, or failing that a filesystem path, and every
declaration-time error message it feeds is misleading. `ConceptConfig.label` is explicitly optional
(`types.ts:78`, "defaults from the concept id when omitted"), so the path fallback is a supported
configuration, and a site that omits `label` gets:

```
cairn: concept "src/content/posts" permalink "/:category/:slug" uses unknown token ":category"
```

`src/tests/unit/define-concept.test.ts` asserts only on the message tails (`/must start with/`,
`'unknown token ":category"'`), so no test pins the subject, and the fallback is unexercised.

The same `validateUrlPolicy` runs a second time from `normalizeConcepts` (`:180`) where the real id
IS in scope, so the accurate message exists one layer up and the inaccurate one shadows it at
declaration time.

**Remediation.** Either drop the fake id and phrase declaration-time errors by their real anchor
(`cairn: the concept declared at "src/content/posts" ...`), or give `defineConcept` the id as its
first argument (`defineConcept('posts', {...})`), which also makes the reference-field
`concept:` target checkable at declaration. Add a test asserting the message subject.

---

## 10. Four inline remark pipelines with divergent plugin sets

**Tier: note. Limb: idiom.**

Four modules in this area build a mdast processor inline, per call, with three different plugin
sets, and two of them carry comments admitting they mirror a fifth copy elsewhere.

`src/lib/content/links.ts:55` and `src/lib/content/media-refs.ts:54`:

```ts
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body);
```

`src/lib/content/includes.ts:22` and `:58`:

```ts
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(body) as Root;
```

`src/lib/content/media-rewrite.ts:83-89`:

```ts
/**
 * Parse a doc with the figure-aware pipeline, so the body arm agrees with what remarkFigure renders
 *  and can see the enclosing `:::figure` container. Mirrors parseFigureDoc in markdown-format.ts.
 */
function parseFigureDoc(doc: string): Root {
```

and `:91-96`, on the ancestor walk: "Mirrors enclosingFigure in markdown-format.ts, reduced to a
boolean."

The divergence is subtle and consequential: `media-refs.ts` extracts media references without
`remarkDirective` while `media-rewrite.ts` rewrites the same references with it. Both comments claim
agreement with the other ("matching extractMediaRefs"), and today they do agree because a figure's
inner image is a real image node either way; nothing enforces that.

**Remediation.** One `content/mdast.ts` exporting two module-level frozen processors, `parseBody`
(parse + gfm) and `parseDirectiveBody` (parse + gfm + directive), plus the shared `enclosingFigure`
walk, with the reason each pipeline exists stated once. Retarget all five call sites. Constructing
the processor once per module rather than once per call is a free win on the manifest build, which
calls these per entry.

---

## 11. `validateUrlPolicy` mutates the caller's descriptor

**Tier: note. Limb: idiom + comprehension.**

`src/lib/content/concepts.ts:85-93`:

```ts
function requireDateField(id: string, pattern: string, fields: Record<string, FieldDescriptor>): void {
  const date = fields.date;
  if (!date || date.type !== 'date') {
    throw new Error(...);
  }
  date.required = true;
}
```

A function reached only from `validateUrlPolicy` writes to the site's own declared field descriptor.
The header comment states the mechanism honestly ("Fields objects are the same reference the
fieldset's validator closes over, so the mutation reaches both"), and it is idempotent, so this is
correct today. It is still a validator with a hidden write, on an object the site author holds a
reference to, executed twice (once at `defineConcept`, once at `normalizeConcepts`). Nothing in the
name `validateUrlPolicy` warns a reader, and the charter's V-rules describe validation as a
throw-or-pass predicate.

**Remediation.** Rename the pair to say what they do (`enforceUrlPolicy` / `markDateFieldRequired`),
or, better, move the coercion to where normalization already happens: have `normalizeConcepts`
produce the descriptor's `fields` array with `required: true` applied, leaving the site's own object
untouched. `namedFields` (`:11-13`) already copies each descriptor, so the copy is the natural place.

---

## 12. `advisories.ts` builds its main arm twice and drifts from its two siblings

**Tier: note. Limb: idiom.**

The A2 convergence landed well, but `advisories.ts` did not finish the move. It keeps a private
`push` that duplicates the one inside the shared builder (`advisories.ts:56-60` vs
`cross-branch-index.ts:55-59`), and it builds the same main-arm rows twice in two shapes:

```ts
export function mainAddressIndex(manifest: Manifest): AddressIndex {   // :66
  const index: AddressIndex = new Map();
  for (const entry of manifest.entries) {
    push(index, entry.permalink, { concept: entry.concept, id: entry.id, title: entry.title, source: 'main' });
```
```ts
  const mainRows: CrossBranchRow<AddressEntry>[] = manifest.entries.map((entry) => ({  // :93
    key: entry.permalink,
    entry: { concept: entry.concept, id: entry.id, title: entry.title, source: 'main' },
  }));
```

`buildAddressIndex` also takes no `opts` parameter, while its two siblings both expose
`CrossBranchIndexOptions` (`reference-index.ts:73`, `tag-usage-index.ts:67`) — defensible (this
consumer is advisory-only, E6) but asymmetric with no note saying the omission is deliberate.

Related: `UsageOrigin` (`reference-index.ts:27`) and `TagUsageOrigin` (`tag-usage-index.ts:26`) are
the identical two-arm union declared twice in the same directory, with a comment rationalizing the
copy ("so each index owns its own origin type"). The layering argument that justifies not importing
from `media/usage.ts` does not apply between two `content/` siblings.

**Remediation.** Express `mainAddressIndex` as `rowsToIndex(mainAddressRows(manifest))` so the row
shape is written once and the private `push` is deleted. Hoist the origin union into
`cross-branch-index.ts` as `CrossBranchOrigin` and import it in both indexes. Add `opts` to
`buildAddressIndex` for symmetry, or one sentence saying why it is fail-open only.

---

## 13. Micro-idiom drift: shadowed names, mixed type-import forms, test-name prefixes

**Tier: note. Limb: idiom.**

Small items, grouped because none justifies its own pass but together they are the texture a new
developer reads.

`src/lib/content/fieldset.ts:495` shadows the module's own primary export:

```ts
export function initialValues(fieldset: Fieldset, now?: Date): Record<string, unknown> {
```

inside the file that declares `export function fieldset(...)` at `:407`. Within `initialValues` the
factory is unreachable by name.

`src/lib/content/types.ts` mixes two type-import forms. Twelve imports use the top-of-file
`import type` block (`:10-26`); five use an inline `import('...')` in the member position, e.g.
`:220-221`, `:411`, `:447`, `:454`:

```ts
  resolvedAssets: import('../media/config.js').ResolvedAssetConfig;
```
```ts
  tidy?: import('../nav/site-config.js').TidyConfig;
```

Both forms are type-only and erase identically, so there is no layering reason for the split; it
reads as accretion. A reader scanning the import block for the module's dependency set gets an
incomplete answer.

`ValueOf`'s conditional chain (`fieldset.ts:66-82`) breaks its own indentation ladder at the array
arm (`:74-75` sits at the same depth as the object arm above it rather than one step deeper), which
makes a 17-line nested conditional harder to read than it needs to be.

Test file names for this directory carry three prefix conventions: `content-frontmatter.test.ts`,
`frontmatter-container-roundtrip.test.ts`, `frontmatter-reference-roundtrip.test.ts`,
`fieldset-validate.test.ts`, `fields-descriptors.test.ts`, `define-concept.test.ts`,
`advisories.test.ts`. An agent asked "where are the tests for `content/frontmatter.ts`" has to grep
three patterns.

**Remediation.** Rename the `initialValues` parameter to `schema`. Hoist the five inline
`import('...')` types into the existing `import type` block. Fix the `ValueOf` indentation. Adopt one
test-name rule for the directory (`content-<module>[-<aspect>].test.ts`) and rename to it; N6 already
covers helper prefixes, so this is the sibling rule the charter's T-section does not yet state.
