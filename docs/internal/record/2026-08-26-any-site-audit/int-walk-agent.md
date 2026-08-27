# AI-agent extension walk — cairn-cms

Date: 2026-08-26. Repo: `/home/glw907/Projects/cairn-cms` @ `1704b555`, version `0.96.0`.
Method: simulate a cold agent handed two plausible extension tasks. Record the real discovery
path, what tells the agent where to look, where structure and gates guide correctly, and where
the agent is misled or ships something green-but-wrong. Standing rulings applied: thoroughness
over sampling; migration cost never discounts a finding; pre-beta aims for the most perfect
engine.

Working tree was left clean. Two probe edits were made and reverted (`git status` clean,
verified).

---

## Orientation (what a cold agent gets for free)

Strong. This is above the norm for an OSS repo of this size:

- `CLAUDE.md` (23 KB, in-tree) states the charter, the scope boundary, the docs-as-a-pass-dimension
  rule, the admin design-system pointer, and several durable gotchas.
- `CONTRIBUTING.md` carries a **repository map with a rule per directory**, the gate policy ("CI
  is the authority; derive the list from `.github/workflows/`"), the four-track docs discriminator,
  and the test-location trap ("a path `vitest.config.ts` does not glob runs zero tests and still
  exits 0, which looks exactly like success").
- `docs/internal/code-idioms.md` is a genuine idiom charter with 40+ numbered rules, each anchored
  to a named exemplar file.
- `docs/reference/` is one page per export subpath, gated by `check:reference`.

An agent that reads those three files knows more about this codebase in five minutes than most
repos let it learn in an hour. Everything below is measured against that bar, not a lower one.

---

# TASK 1 — add a `rating` field type (1–5 stars) end to end

## 1.1 Where the agent starts

Correct first move: `docs/extend/content-model.md`. It says (line 18) a field type the builders
don't cover "is a gap to raise, not a" site-level workaround — so this is an **engine** change,
not a consumer one. Good: the boundary is stated where the agent looks.

Second move: `docs/reference/core.md` § Fields → `src/lib/content/fields.ts`. Naming carries this
cleanly. `fields.ts` is a beautiful file: a `FieldBase`, one interface per arm, one `FieldDescriptor`
union, one `fields` constructor namespace with a `const O` generic per constructor. Adding
`RatingField` + `| RatingField` + `rating: <const O …>` is obvious and takes one edit.

At that point the agent believes it is roughly a third done. It is roughly a tenth done, and
**nothing in the repo tells it so.**

## 1.2 The real fan-out

21 files dispatch on `field.type` (`grep -rn "field\.type\|f\.type\|item\.type" src/lib`).
For a new leaf the load-bearing set is:

| Site | What it does | What happens if missed |
| --- | --- | --- |
| `src/lib/content/fields.ts` | union + constructor | the only step naming makes obvious |
| `src/lib/content/fieldset.ts:289` | `validateField`'s `default:` | **silently** validates as a trimmed string |
| `src/lib/content/frontmatter.ts:52` | `decodeField`'s `default:` | **silently** decodes the form value as a string |
| `src/lib/content/frontmatter.ts:~137` | `frontmatterFromForm` switch, no `default` arm needed | falls through to the shared string path |
| `src/lib/content/frontmatter.ts:309` | `formValues`'s trailing `else` | **silently** `String(value)`s the stored value |
| `src/lib/components/FieldInput.svelte:312` | the `{:else}` arm | **silently** renders a bare text input |
| `src/lib/render/registry.ts:234` | `ATTRIBUTE_TYPES` allowlist | fails closed, with a good message (see 1.6) |
| `src/lib/components/ComponentForm.svelte:131` | `inputType` for component attrs | only if the type is directive-serializable |
| `src/lib/index.ts:60-77`, `sveltekit/index.ts:152`, `delivery/data.ts:34` | per-arm type re-exports | asymmetric surface, ungated |
| `docs/reference/core.md` × 3 places | table row, prose enumeration, Types table | stale docs, mostly ungated |
| `docs/reference/sveltekit.md`, `docs/reference/delivery-data.md` | Types tables | stale docs |
| `src/tests/unit/{fields-descriptors,fieldset-validate,content-frontmatter,content-types,fields-exports}.test.ts`, `src/tests/component/form-renderer-family-guard.test.ts` | hand-maintained per-type lists | silently under-covered |
| `CHANGELOG.md` | `## Unreleased` entry | policy, not gated |

## 1.3 Probe: what actually catches a half-added field type

I added `RatingField` (with a `max?: number`) to the union and a `fields.rating` constructor, and
touched nothing else. Then ran the full local gate.

**`npx svelte-check --tsconfig ./tsconfig.json` → exactly one error:**

```
/home/glw907/Projects/cairn-cms/src/tests/unit/content-types.test.ts:7:40
Error: Function lacks ending return statement and return type does not include 'undefined'.
====================================
svelte-check found 1 error and 0 warnings in 1 file
```

**`npx vitest run --project unit` → `Test Files 317 passed (317) / Tests 3976 passed (3976)`.**

Zero production-code errors. The only tripwire in the entire repo is a helper function inside a
*test* file (`widgetFor` in `content-types.test.ts`), whose comment explains the intent —

```ts
// A switch over the discriminant; if the union is wrong this fails to type-check under
// `npm run check`. The runtime body just proves each arm is reachable.
```

— but whose *message* names neither the union, the new arm, nor any of the four production
dispatch sites the agent still has to fix.

**Runtime probe.** With the half-added type in place I ran a throwaway unit test (since removed):

```ts
const set = fieldset({ stars: fields.rating({ label: 'Stars', max: 5 }) });
set.validate({ stars: '4000 potatoes' }, '')
// → { ok: true, data: { stars: '4000 potatoes' } }     ← PASSED

frontmatterFromForm([{ ...set.fields.stars, name: 'stars' }], form /* stars='not a number' */)
// → { stars: 'not a number' }                          ← PASSED
formValues([...], { stars: 3 })
// → { stars: '3' }                                      ← PASSED
```

A field declaring `max: 5` accepts arbitrary prose and commits it to frontmatter. The editor
renders a plain text input. This is what ships if the agent deletes the one test-file line the
compiler complained about — which is a plausible thing for an agent to do, because the error
points at a test and says the test is malformed.

## 1.4 Navigation: neither grep finds the set

The agent's two natural greps both fail, in opposite directions.

`grep -rn "NumberField" src docs` (find the sibling arm by its interface name) returns
`fields.ts`, `index.ts`, `sveltekit/index.ts`, `delivery/data.ts`, `FieldInput.svelte`, three
reference pages, and the tests. **It misses `fieldset.ts:255` and misses `frontmatter.ts`
entirely**, because those dispatch on the string literal, and `number` is handled inside
`frontmatter.ts`'s `default:` arm and so appears nowhere in that file as a token.

`grep -rn "'number'" src/lib` (find the literal) returns 33 hits, of which ~20 are
`typeof x === 'number'` noise from `media/manifest.ts`, `audit/markup.ts`, `EditPage.svelte`,
`spellcheck.ts`. Signal-to-noise is bad enough that an agent scanning results is likely to stop
at the first two real hits.

There is no third path. `grep -rn "field type" docs CONTRIBUTING.md` returns nothing actionable:
no "adding a field type" section exists in `CONTRIBUTING.md`, in `docs/internal/code-idioms.md`,
or anywhere under `docs/internal/`.

**The repo knows this class of problem exists.** `.claude/agent-memory/cairn-implementer/`
contains 262 memory files, including `adding-a-doctor-check-fanout.md`, which enumerates *exactly*
this shape for the sibling subsystem ("Adding one doctor check … reds several PINNED assertions
that must all move together, or `npm test` fails"), with a per-file checklist. That knowledge is
banked in one agent's private memory directory, invisible to a fresh agent, to a different agent
type, and to a human contributor. There is no `fields` equivalent.

## 1.5 Docs gates as teachers

Empirically measured, with `RatingField` added.

**Case A — the interface is NOT re-exported from a barrel (a defensible choice; the union member
is structurally reachable):**

```
$ node scripts/checks/reference-coverage.mjs   # → exit 0, every subpath OK
$ npm run check:reference                      # → OK . (docs/reference/core.md)
```

Green. `docs/reference/core.md` still says "the fifteen-arm union", still enumerates leaf
constructors without `rating`, and its `| Type | Renders as | Validates |` table has no row.
Vale, `check:symbols`, `check:docs`, `check:snippets` all pass, because none of them can know a
name is *missing*.

**Case B — the interface IS re-exported (matching every sibling arm):**

```
$ node scripts/checks/reference-coverage.mjs
. (docs/reference/core.md): 1 uncovered: RatingField
```

This is a **good** message: subpath, page, symbol. It does not state the required entry shape (a
row in the Types table with a Stability column), but the page carries ~100 examples, so the agent
recovers in one read. `check:reference:signatures` and `check:symbols` behave the same way.

So the docs gate fires only when the agent happens to take the more thorough of two reasonable
paths. And in **both** cases the hand-written cardinal is ungated. "fifteen" is hardcoded in:

- `docs/reference/core.md:389` — "the fifteen-arm union at a glance"
- `docs/reference/core.md:1083` — Types table cell, "One of `FieldDescriptor`'s fifteen arms"
- `docs/reference/sveltekit.md:1982` — same cell text
- `docs/reference/delivery-data.md:668` — same cell text
- `src/lib/index.ts:55` — code comment, "The field-descriptor union's fifteen arms"

`check:surface` output, run with the new arm, is structurally right and practically poor:

```
  ~ changed fields
      was: { text: <const O extends Omit<TextField, "type">>(o: O) => TextField & O; textarea: … }   ← ~2,000 chars
      now: { text: <const O extends Omit<TextField, "type">>(o: O) => TextField & O; textarea: … }   ← ~2,050 chars
…
If this change is intended, run "npm run check:surface -- --update" and commit docs/internal/api-surface.md.
```

The closing instruction is exemplary. The payload is two near-identical 2,000-character lines with
no intra-line diff; the single differing token (`rating: …`) sits mid-line. It also reported
`~ changed ArrayField` / `~ changed FieldDescriptor` on **four** subpaths, which correctly reveals
the blast radius, but it printed `RatingField` inside those expanded strings while never noting
that `RatingField` itself is not exported — the asymmetry no gate holds.

## 1.6 What guides correctly

- `fields.ts` itself: the `const O` generic pattern is uniform across all fifteen constructors,
  so the sixteenth writes itself.
- `NamedField = FieldDescriptor & { name: string }` (`content/types.ts:64`) is *derived*. A new
  arm propagates with no edit. This is the right shape and the rest of the system should match it.
- **`registry.ts:234` is the exemplar the other four dispatch sites should copy.** It is the one
  fail-closed site in the field system, and its message enumerates the legal set:

  ```
  cairn: component "x" attribute "stars" is type "rating"; a directive attribute must be a
  single-value scalar (text, textarea, number, select, url, email, date, datetime, boolean, or icon).
  ```

  An agent hitting that knows immediately what it did and what its options are. Every other
  dispatch site in the field system silently absorbs the unknown arm.
- The declaration-time guards in `fieldset.ts` (`checkSeoImageFields`, `checkTaxonomyMarker`,
  `checkContainerNesting`) follow idiom E1 exactly and all carry `cairn: <subject> <verdict>`
  messages that name the offending key and the fix. Excellent.
- `docs/reference/core.md` § Fields is genuinely good reference prose: the table, the container
  rules, the `refine`-is-synchronous rationale.

---

# TASK 2 — a "drafts overview" admin screen through the `CairnAdminShell` custom-route seam

## 2.1 Where the agent starts

Excellent. `docs/extend/README.md:46` links **[Add a custom admin screen]**, and that page
(`docs/extend/add-a-custom-admin-screen.md`) is one of the best pages in the repo. In one read
the agent gets: the filesystem shape, why a concrete route beats the catch-all, that the shell
wraps automatically, that `createAuthGuard` gates the subtree but not the screen, the
`createSectionAction` + `requireAccess` gating pair, the toolkit composition list, the audit-sink
wiring, and a "You know it worked when" section naming three observable outcomes plus the
root-layout trap. `organize-your-admin-nav.md` covers the sidebar placement, and its `navLayout`
tree validates at composition with `navLayout`-prefixed messages.

There is also a live in-repo exemplar: `examples/showcase/src/routes/admin/signups/`, covered by
`examples/showcase/e2e/custom-screen.spec.ts`, and inside `check-invisible-craft.mjs`'s
`SCAN_SCOPE` (which includes `examples/showcase/src/routes`). An agent that greps for a working
custom admin route finds it in one command.

For chrome, auth, nav, and composition, this task is **well served**. The failures are elsewhere.

## 2.2 The wall: there is no read seam onto cairn's own content

"Drafts across concepts" needs, per concept: the committed manifest rows (which carry `draft`),
plus the live `cairn/<concept>/<id>` pending branches (unpublished edits). The engine does exactly
this in `content-routes-core.ts:797 listLoad`:

```ts
const [manifestRaw, refs] = await Promise.all([
  backend.readFile(runtime.manifestPath, backend.defaultBranch),
  backend.listBranches(`${PENDING_PREFIX}${concept.id}/`),
]);
```

None of those three pieces is public:

- `parseManifest` — not exported from any subpath. `docs/reference/core.md:823` deliberately
  publishes only `serializeManifest` / `verifyManifest` / `verifyReferences`, stating "the write
  and diff side of the manifest is the engine's own save path, so only its serialize and verify
  operations stay public." The **read** side is not addressed.
- `pendingBranch` / `parsePendingBranch` (`src/lib/content/pending.ts`) — internal.
- The GitHub backend — reached only through `ctx.resolveBackend(event)`, an internal context object.
- `listLoad` *is* reachable (`ContentRoutes = ReturnType<typeof createContentRoutes>`), but its
  first two lines are `requireEditor(event)` and `conceptOf(runtime, event.params)`, so
  cross-concept use means synthesizing a fake `RequestEvent` per concept with a forged
  `params.concept`. No doc sanctions that; nothing stops it either.

The `exports` map has no `./dist/*` wildcard, so deep-import is blocked.

**The trap.** The one *reachable* option is `/delivery`'s `createContentIndex`, which is
documented, exported, and returns `ContentSummary[]` carrying a `draft: boolean` — it looks
exactly right. But `content-index.ts` takes `RawFile[]` from the site's own glob, which in a
Worker is the **deployed** corpus. A drafts screen built on it:

- shows frontmatter `draft: true` entries as of the last deploy, and
- cannot see a single unpublished `cairn/<concept>/<id>` edit — the *other*, arguably primary
  meaning of "draft" in cairn, and the one `ConceptList.svelte:82` calls "Pending edits".

That screen builds, typechecks, passes every gate, passes an e2e that seeds fixture content, and
is wrong in production. Nothing in `add-a-custom-admin-screen.md` warns about it; that page never
mentions reading cairn's content at all. Its one adjacent sentence is about *components*
("A component that renders one of cairn's own content concepts … has no place here"), which an
agent can easily read as also settling the data question in the same direction — it does not.

The vocabulary collision compounds it: "draft" means both the `draft: true` frontmatter boolean
and an unpublished pending-branch edit, and no published page disambiguates the two terms.

## 2.3 Two obvious ways to gate the action, and the exemplar teaches the wrong one

`docs/extend/add-a-custom-admin-screen.md` is unambiguous: `createSectionAction` for a section,
`adminAction` only for a one-off, `requireAccess` in the load, and "a section built on it never
calls `adminAction` directly."

`examples/showcase/src/routes/admin/signups/+page.server.ts` — the only custom admin screen in the
repo, whose own header comment calls it **"the Plan 1 extension-seam proof"** — does none of that:

```ts
export const actions: Actions = {
  create: async (event) => {
    requireOwner(event);
    const form = await event.request.formData();
    …
    if (!name || !email) return fail(400, { error: 'missing' });
```

`requireOwner` instead of `requireAccess`; a raw `formData()` read instead of `ctx.form`; no audit
call; and `fail(400, { error: 'missing' })` is the literal shape `code-idioms.md` E4 names as a
convergence target ("Ad hoc `fail(400, { error })` literals and dropped `satisfies` annotations
converge").

`createSectionAction` has a unit test (`src/tests/unit/section-action.test.ts`) but **zero
non-test call sites in the repo** and no e2e. An agent whose default instinct is "find a working
example and pattern-match it" — the dominant agent instinct — builds the shape the docs advise
against, and the e2e that covers that shape confirms it works.

This is a direct violation of the idiom charter's own headline, "one obvious way per pattern",
in the seam the extending-developer lens exists to serve.

## 2.4 The done-gate the skill mandates runs in no workflow

`skills/cairn-admin-screens/SKILL.md` defines the done-gate:

1. `npx cairn-audit` (nine static rules, all error tier),
2. `npx cairn-audit --rendered` against a running dev server, both themes (fourteen rules, five
   error tier: `one-filled-action`, `focus-renders`, `interactive-contrast`, `touch-targets`,
   `viewport-overflow`),
3. the shipped grader prompt for a novel composition.

CI runs step 1's rules only in narrowed wrappers (`check:invisible-craft` scopes to
`motion-band`/`gap-scale`/`token-colors`; `check:admin-css-classes` to `no-uncompiled-class`).

**CI never runs `cairn-audit --rendered`.** `grep -rn "rendered\|cairn-audit" .github/workflows/`
returns two prose comments and no invocation. And the two npm targets that proxy rendered rules:

```
$ grep -rn "interactive-contrast\|touch-targets" .github/workflows/ package.json
package.json:59:    "check:interactive-contrast": …
package.json:60:    "check:touch-targets": …
```

exist and run in **no workflow at all**.

CONTRIBUTING says "CI is the authority on what must pass … derive the list from those files rather
than from prose." An agent that obeys that sentence never runs the rendered audit. An agent that
obeys the skill does — but see 2.5. The two authorities disagree, and the one the agent is told to
trust is the weaker one.

## 2.5 The skill is unreachable from the repo that authors it

`skills/cairn-admin-screens/` is a strong artifact: a tier map, the screen-anatomy rule with its
traced defect, chip/facet register rules, a `norms` query workflow, a done-gate, an
"if you suppressed a finding, say so" clause, and `references/exemplar-list.md` /
`exemplar-detail.md` / `form-anatomy.md` / `craft.md` / `grader-prompt.md`.

It reaches an agent only after `cairn-doctor --fix` copies it into a **consumer's**
`.claude/skills/cairn-admin-screens/`. The engine repo has no `.claude/skills/` directory
(`find .claude -type f` → only `scheduled_tasks.lock` and 262 agent-memory files), and this
session's own skill listing does not include `cairn-admin-screens`. So the repo that authors the
admin design language is the one place an agent cannot load it.

Two consequences follow:

- Its three links to `docs/reference/cairn-audit.md` are written as
  `../../../node_modules/@glw907/cairn-cms/docs/reference/cairn-audit.md`, which from
  `skills/cairn-admin-screens/` resolves to `~/Projects/node_modules/…` — outside the repo. That
  is correct at the *installed* path and dead in-repo; the file itself sits at
  `docs/reference/cairn-audit.md`, two directories up. `check:docs` scope is `docs/` only, so
  nothing catches it.
- `docs/extend/add-a-custom-admin-screen.md` — the page an agent actually lands on for this task —
  mentions neither `cairn-admin-screens` nor `npx cairn-audit`. The skill is named only in
  `docs/reference/doctor.md` and `docs/reference/cairn-audit.md`, pages an agent building a screen
  has no reason to open. So the agent gets the composition advice with none of the done-gate.

## 2.6 A smaller contradiction

`docs/reference/admin-toolkit.md:688` and the skill's `exemplar-list.md` both rule: "A new build
reaches for `PageHeader` first; `OfficeList` stays correct where it already ships."
`add-a-custom-admin-screen.md`'s worked example composes with `OfficeList`. The guide is where a
new build starts, so the guide is where the ruling has to land.

Relatedly, the showcase exemplar renders `<PageHeader title="Signups" />` with no `action` snippet
and puts its accent-filled `btn btn-primary` in a form *below* the header, outside the card region
— the placement the skill's screen-anatomy rule names as its traced defect. Whether the rendered
`screen-anatomy` / `one-filled-action` rules would actually fire on it is unverified here, because
(per 2.4) nothing in CI runs them.

---

## Summary judgment against the three bars

**1. Clean, beautiful, idiomatic internals.** Mostly yes. `fields.ts`, the derived `NamedField`,
the declaration-time guards, the E1 error convention, the `const O` generic uniformity, and the
toolkit barrel's own naming note ("two subpaths exporting different things under one name is the
agent trap this pass exists to remove") are all first-rate. The one structural idiom failure is
that **five dispatchers over a closed discriminated union all end in a catch-all**, which is the
opposite of what a discriminated union is for, and which `registry.ts:234` already shows the fix
for inside the same subsystem.

**2. Inviting and comprehensible to a new developer.** Yes, strongly, on the paths that are
written. `CONTRIBUTING.md`'s repository map, the four-track docs discriminator, and
`add-a-custom-admin-screen.md` are better than most commercial frameworks ship. The gaps are
*unwritten* paths, not bad ones: how to add a field type, and how a custom screen reads content.

**3. Easy for an AI agent to extend.** This is where the two tasks diverge. Task 2's *chrome*
half is excellent. Task 1 and Task 2's *data* half both fail the same way: the agent completes
the discoverable part, gets a green gate run, and ships something wrong. In both cases the
knowledge that would have prevented it exists in the repo — in `.claude/agent-memory/` for the
field fan-out, in `skills/` for the admin done-gate — and in both cases it is filed where a cold
agent cannot reach it.
