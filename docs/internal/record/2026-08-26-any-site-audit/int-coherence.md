# Whole-codebase coherence: does `src/` read as one designed codebase?

Reader: whole-codebase coherence, cairn-cms `main` @ `1704b555` / `0406f1d5`. Inputs: eleven area
rankings (`int-rank-*.md`), the cold newcomer walk, the AI-agent extension walk. Every measurement
below was re-run against the tree; the counts in this file are mine, not inherited.

---

## The verdict

**`src/` reads as one codebase that was designed twice and swept once.**

The design vocabulary is real and unusually good. There is a charter (`docs/internal/code-idioms.md`,
40+ numbered rules each anchored to a named exemplar), a barrel-membership rule per public subpath
that tells an agent where a rejected export goes instead, a log-event grammar with zero undocumented
events, `check:reference` / `check:surface` / `check:package` gating the public edge, and comments
that state contract and rationale rather than paraphrasing code. Eleven independent area readers
converged on the same sentence: *the thinking is A-grade, the factoring is not.* Nine of the eleven
graded B or B+ for the same reason.

What no single area could see is that the shortfalls are **not eleven local problems that happen to
rhyme**. They are one mechanism, running eleven times. The mechanism is this:

> A rule is stated in prose, a sweep converts most of the tree, the survivors acquire a comment
> explaining why *they* are the exception, and nothing in CI can tell the difference. The next
> author reads two neighbours and finds two defensible answers.

Every finding below is that mechanism at a different altitude. The measurement that proves it is
not anecdote: **the repo runs 27 bespoke `check:` gates, and not one of them enforces a single rule
of its own idiom charter.** Every rule that would make `src/` one codebase — M1 module headers, M4
indentation, S1 runes, S3 extract-repeated-idioms, S4 error surfacing, E1 error prefixes, E4 failure
families, E7 no bare console, A1 no `.then`, A5 catch stringification, T3 test titles, T5 test
queries, N5 name grammar — is honour-system prose, and every one of them is violated in shipped code
behind a green gate.

The second thing invisible per-area: **the survivors have started teaching each other.** 34 comments
in `src/lib` and `examples/showcase/src` justify a duplication by naming the sibling copy it mirrors.
That is not eleven independent lapses; it is a citation chain. `auth-channel/factory.ts` explains why
it copies `guard.ts`'s `isLocalHost`; the showcase's `test/last-otp/+server.ts` then cites *that
comment* as precedent for a third and fourth copy. `render/remark-figure.ts` records "this mirrors
the local cast idiom in `remark-directives.ts`" — turning a workaround into a convention by writing
it down. Duplication with a footnote reads as design, which is precisely why nine area readers each
called their instance "defensible in isolation".

The result splits cleanly by audience:

- **Idiomatic Svelte 5 / SvelteKit 2** — genuinely strong, and the most coherent dimension in the
  repo. Zero legacy syntax anywhere in `src/lib` (no `export let`, no `on:`, no
  `createEventDispatcher`, no `svelte/store`); 283 `$state` / 246 `$derived` / 62 `$effect`, a ratio
  that says derivation is not being done in effects; uniform `throw redirect(` / `throw error(`.
  The framework is not being fought. The failures here are size and two isolated prop-sync effects.
- **Inviting to a new developer** — strong at the front door, weak the moment `src/` opens. The
  published doc tracks, the vocabulary section, and `CONTRIBUTING.md` are better than most commercial
  frameworks ship. Behind them: no internals map, a directory listing that does not distinguish
  public from internal, 127 of 274 modules with no orientation header, and roughly a dozen headers
  that state something the code contradicts.
- **Easy for an AI agent to extend** — the most split of the three, and the split is diagnostic.
  The barrel charters, `check:surface`, `check:reference`, and the log-event discipline are *better*
  agent affordances than the human-facing equivalents. Against that, the agent walk proved that a
  half-added field type passes `svelte-check` and 3,976 unit tests with one error, in a test file,
  whose message names neither the union nor any of the four production sites still to fix. The
  engine's central extension point has no exhaustiveness guard anywhere: `grep -rn 'assertNever\|:
  never =\|satisfies never' src/lib` returns **0**.

Grade at the whole-codebase altitude: **B**. Not because any area is weak — none is — but because
`src/` currently costs a stranger the price of eleven local conventions rather than one.

---

## What no single area ranker could see

### 1. The charter is prose, and the gate estate proves the repo knows better

Each area found "rule X is violated here". Laid side by side, the same eight rules are violated in
every area, which is not a per-area lapse but a missing enforcement layer:

| Charter rule | Violations found | Enforced by |
| --- | --- | --- |
| M1 module headers | 127 of 274 files; 3 competing prefixes | nothing |
| M4 2-space indent | 8 files; no formatter exists at all | `.editorconfig` (advisory) |
| S3 extract repeated idioms | 12+ live instances (below) | nothing |
| S4 error surfacing | 7 hand copies of one ZWSP live-region trick | nothing |
| E1 `cairn: ` error prefix | 40 conforming, 27 module-prefixed, 3 `cairn reproductions: ` | nothing |
| E7 no bare `console.*` | 3 in non-bin `src/lib` modules | nothing |
| T3 no plan numbers in titles | ~40 test titles, 174 test comments | nothing |
| T5 role-first queries | 189 `querySelector` calls in one component test | nothing |

The charter also cannot be read as a rule set. It is written in the future tense of the pass that
authored it — "The stragglers (`pending.ts`, `fields.ts`, `env.ts`, two auth files) converge", "its
four near-verbatim copies … becomes **one shared helper**" — and closes with "Sweep clusters (Task 4
partition, riskiest first)" listing eight numbered work packages. A reader cannot tell a rule in
force from work that was planned and never ran. Spot-checked: A2 (one cross-branch fan-out helper)
landed; M4 did not, and `.editorconfig`'s own header claims it "records the … rule … so an editor
enforces it going forward instead of relying on a one-time sweep to hold" — an enforcement claim
`.editorconfig` cannot make good on.

This is the single highest-leverage finding in the audit, because it is the mechanism that produced
most of the others, and because this repo is demonstrably excellent at turning a rule into a failing
test. It has done it 27 times. It has never done it for itself.

### 2. Duplication has become self-licensing

Twelve half-finished convergences, one per area, all with the identical signature: a shared helper
exists, is documented as the one way, and is bypassed by call sites that each carry a comment
explaining the bypass.

| Helper / rule | Bypasses | The comment that licenses it |
| --- | --- | --- |
| `ensurePageHelpers` (audit rendered) | 3 rules never call it; 11 wrap it in a dead fallback under 3 names | — |
| `runDoctor`'s catch contract | 11 per-check `try/catch` re-implementations | — |
| S4 live-region announcer | 7 copies citing 3 *different* exemplars | "(the ConceptList discipline)" / "(the MediaPicker discipline)" / "(the NavTree/ConceptList discipline)" |
| `admin-icons.ts` barrel | 40 direct `@lucide/svelte/icons/*` imports, 12 for glyphs the barrel exports | header: "Components import from here" |
| `resolveBackend` | 3 copies in `sveltekit/` | `preview.ts`: "the same seam every other engine load uses (`content-routes-context.ts`'s `resolveBackend`)" — while not calling it |
| `isMissingTableError` | 3 copies | "Mirrors `content-routes-core.ts`'s own local copy; … not worth sharing across a module boundary for" |
| `isLocalHost` | 5 copies (engine ×2, showcase ×3) | `factory.ts`: "duplicated here rather than imported since that helper is private"; showcase: "the same duplication `factory.ts`'s own `isLocalHost` documents" |
| media-manifest read | 9 verbatim copies + a 10th private spelling | — |
| `scripts/repo-root.mjs` | 19 hand-rolled `ROOT` constants | module header: "in one place instead of restated per file" |
| `scripts/walk-files.mjs` | 9 hand-rolled walks, 5 named `walkMarkdown` with 3 capability levels | header: "One walk, one place to fix a traversal bug" |
| `arbitrateChecked` / `createRequestGuard` | two exported latest-wins arbiters with inverted polarity | both TSDoc'd, neither names the other |
| toolkit segmented control | 4 screens hand-roll `segmentTintClass` with a different active treatment | `ListToolbar`: "for a screen-specific view control this component has no vocabulary for" |

`grep -rniE '(mirrors|duplicated here|rather than imported|not worth sharing|same duplication)'`
over `src/lib` + `examples/showcase/src` returns **34** hits. Each is locally reasonable. Together
they are a house style, and the chain crosses four areas: `guard.ts` → `auth-channel/factory.ts` →
showcase `test/*` (three more copies) is one lineage, `remark-directives.ts` → `remark-figure.ts` →
`component-grammar.ts` is another. The cost is that "there is a shared helper for this" has stopped
being decidable by reading a neighbour.

### 3. Five files hold the product's centre; one of them is tracked

```
3159  src/lib/components/CairnMediaLibrary.svelte     ← the only one on ROADMAP
2920  src/lib/components/EditPage.svelte              ← the product's centrepiece
2215  src/lib/sveltekit/content-routes-core.ts        ← lines 527-2215 are ONE closure
1414  src/lib/sveltekit/content-routes-media.ts       ← one factory, lines 374-1413
1185  src/lib/components/MarkdownEditor.svelte        ← 33 props, 13 imperative `register*`
1015  src/lib/audit/rendered.ts                       ← 6 concerns the static half splits into 5 modules
 965  src/lib/auth-channel/factory.ts
 949  src/lib/components/CairnAdminShell.svelte       ← 8 independent concerns
```

`ROADMAP.md:1609` files the `CairnMediaLibrary` split and argues it well: *"It is the file a
code-reading stranger will judge the repo by."* Every word of that entry applies verbatim to
`EditPage.svelte` at 93% of the size, to `content-routes-core.ts`, and to `CairnAdminShell.svelte`,
and none of the three is filed. `content-routes-core.ts` is the sharpest instance because the
charter *records the decision that produced it*: "`content-routes.ts` decomposes, bounded." The
split ran on the file and not on the shape — 30 declarations now live inside one 1,690-line closure,
including a constant whose own doc comment calls it "a module constant, not a site config knob"
while sitting 600 lines inside a function body.

The unevenness is not only vertical. The same tree that ships 100-line modules in `content/`,
`delivery/`, and `media/` uses **filename prefixes where directories belong**, at three altitudes:
`content-routes-{core,media,settings,context,tidy,dictionary}.ts` (six siblings, `-core` a non-name
holding shell + list + CRUD + publish + rename + preview + revert); `src/lib/components/` (82 flat
files carrying `editor-*` ×12, `tidy-*` ×4, `media-*` ×3, screens, widgets, a CSS file, a worker);
`src/tests/unit/` (282 flat files whose prefixes reconstruct `src/lib`'s directory tree by hand,
while `src/tests/unit/audit/` demonstrates the mirrored layout that would fix it).

### 4. Roughly a dozen headers state something the code contradicts

Each area found one or two. The list is only alarming assembled:

- `admin-icons.ts`: "Components import from here" — 40 imports bypass it.
- `dialog-origin.ts`: "shared by every admin dialog" — one consumer.
- `typed-confirm.ts`: "shared by every destructive admin dialog" — one consumer.
- `CairnAdminShell.svelte:59`: "**Every** chrome read below goes through `shell`" — the template
  reads `data` directly six times.
- `CairnAdminShell.svelte:503`: the drawer trap uses "the same fallback `MediaInsertPopover`'s trap
  uses" — the popover's forward branch has no container check at all.
- `chassis/public-routes.ts`: "Both … import this **ONE** binding, so a site can never drift the two
  routes apart" — a third consumer hand-rolls seven of nine fields and drops two.
- `showcase test/last-otp/+server.ts`: "Duplicated in the two sibling routes" — there are three.
- `doctor/checks-local.ts`: header names five checks (module exports nine) and claims "Every read
  goes through the injected `ctx.readFile`" while the module makes a live Anthropic API call.
- `render/component-grammar.ts:36`: documents a `{% name %}` directive syntax cairn does not have —
  the string appears exactly once in the repository, in that comment.
- `media-upload-outcome.ts`: "the single outcome **the popover** acts on" — two callers.
- `pagination-window.ts` / `list-toolbar.ts`: both justify their existence by "preserving the
  'exported from module context' contract a consumer imports against" — `package.json` exposes no
  path by which a consumer could hold that contract.
- `FieldInput.svelte:271`: calls Svelte's `ownership_invalid_mutation` warning "benign" — teaching
  the next reader that framework ownership warnings are noise.

A missing header costs a reader a file read. A false one costs them the read *plus* the wrong
conclusion, and it is the class that survives sweeps, because a sweep looks for absence.

### 5. The comment register is pass-scoped, and it ships

Measured over `src/lib`: **179** references to a plan task, ruling, pass, or phase
(`Plan NN`, `Task N`, `Pass N`, `C2`, `R9`, `phase-3a`); **19** pointers into `docs/superpowers/`,
a directory the npm tarball does not ship; **18** named mentions of private consumer sites (ecxc,
aksailingclub, 907.life) in the source of an MIT-licensed public package. Add ~40 test titles and
174 test comments in the same register.

Every one of the eleven areas flagged this independently, which is what makes it a register rather
than a lapse. Three sub-shapes are worth separating, because they need different fixes:

- **Unresolvable authority.** "The floor is 24x24, not 44x44, by Geoff's ruling (Task 16b, ruling 1)"
  — the reason is durable (WCAG 2.2 SC 2.5.8) and should replace the citation. `audit/norms.ts:280`
  shows the good form: a repo-relative path plus the ruling number.
- **Comment archaeology.** Three `admin-toolkit` blocks document what an *earlier version of the
  comment* said, so a reader parses a diff to find the live rule. `FieldRow.svelte:21` opens by
  stating that nothing prompted the component's existence.
- **Stale status.** `diagnostics/error.ts:3` describes work as forthcoming ("Pass 1 lands and tests
  the primitive") that landed long ago.

The project ledger rule in `CLAUDE.md` already settles where this belongs — `docs/HISTORY.md` and the
per-pass post-mortems. The rule was applied to `STATUS.md` and never to the code comments, which are
read far more often.

### 6. There is no exhaustiveness idiom, and ten hand-maintained lists stand in for one

`grep -rn 'assertNever\|: never =\|satisfies never' src/lib` → **0**.

The consequence is proven, not theorised: the agent walk added `RatingField` to the fifteen-arm
union plus a constructor, touched nothing else, and got `svelte-check` clean of production errors
and 3,976 passing tests. The single failure was a helper *inside a test file*, whose message names
neither the union, the new arm, nor any of the four production dispatch sites still to fix. Five
dispatchers over a closed discriminated union all terminate in a catch-all that silently treats the
unknown arm as a trimmed string; the resulting field accepted `'4000 potatoes'` for a `max: 5` rating
and committed it to frontmatter. `render/registry.ts:234` is the one fail-closed site in the whole
field system and its message enumerates the legal set — the exemplar exists, inside the same
subsystem, and four siblings do the opposite.

The same shape recurs wherever a set must be enumerated twice, and it is always hand-maintained and
always ungated:

- tidy conventions: six unlinked parallel lists (config type, key union, three switches, a settings
  screen's rows, plus two summary clauses in that screen).
- `EditPage`'s same-route reseed: 17 assignments against 76 `$state` declarations; `uploadedRecords`
  is already missing, and a same-route link hop carries entry A's media records into entry B's save.
- `audit/index.ts`: ~60 hand-listed re-exports, already missing `splitSelectorList`.
- `cairn-admin.ts:249`: `anyView` is `authedViews` plus two literals, written out separately.
- `manifest.ts`: the "additive and optional" rule stated once and re-typed eleven times.
- `editor-boundary.test.ts`: `DYNAMIC_ONLY` encodes a seven-file fork rather than a principle.
- the cardinal "fifteen" hardcoded in five places, three of them published reference pages.

### 7. The public/internal boundary is excellent at the barrel and invisible one line below it

The barrel headers are the repo's single best agent affordance, and they should be kept verbatim:
`/components` states that a domain-agnostic primitive belongs on `/admin-toolkit` instead;
`/admin-toolkit` explains why `TextInput` is not named `TextField` ("two subpaths exporting different
things under one name is the agent trap this pass exists to remove"); `/auth-crypto` routes a
stateful read to `/auth-store`. An agent can decide correctly from the header alone.

Below that line there is no marker at all:

- `src/lib/` lists 13 public subpath directories and 10 internal ones interleaved alphabetically
  with no signal. The auth cluster is the worst case: `auth/` (internal, 841 LOC, the real
  implementation), `auth-channel/` (public, 1548 LOC, a second implementation), `auth-crypto/`
  (public, **13 LOC**, a re-export), `auth-store/` (public, **17 LOC**, a re-export).
- `auth/store.ts` has 13 exports; 7 are frozen npm surface and 6 are internal, and the file says
  nothing. The boundary lives two directories away.
- `render/authoring.ts` is the whole public authoring API and is a one-line re-export from
  `rehype-dispatch.ts`, where the five public builders sit interleaved with the island serializer.
- `reproductions/index.ts` is a public barrel carrying 60 lines of interface, the registry, and a
  lookup function, against M2's "barrels stay re-export-only".
- `audit/index.ts` is a 60-symbol god barrel for a subsystem with no public subpath.
- `MediaResolve` is declared in `render/` and published on `/media`.

The gate that would teach this exists for exports and not for the tier below: `check:surface` caught
the agent walk's asymmetric field export, and nothing anywhere gates a **component prop** — three
props on `MarkdownEditor`, the engine's flagship public seam, are documented nowhere.

### 8. The exemplar tier teaches a different codebase than the docs do

An agent's dominant instinct is to find a working example and pattern-match it. In this repo the
working examples systematically disagree with the guidance:

- `docs/extend/add-a-custom-admin-screen.md` is unambiguous: `createSectionAction` for a section,
  `requireAccess` in the load, "a section built on it never calls `adminAction` directly."
  `examples/showcase/src/routes/admin/signups/+page.server.ts` — the repo's only custom admin
  screen, self-described as "the Plan 1 extension-seam proof" — uses `requireOwner`, a raw
  `formData()` read, no audit call, and `fail(400, { error: 'missing' })`, the literal shape E4
  names as a convergence target. `createSectionAction` has **zero non-test call sites** and no e2e;
  the discouraged shape has one.
- The showcase's paginated archive (~270 lines across two routes) cannot render with the shipped
  14-post corpus, and buys a named `handleUnseenRoutes` exception in `svelte.config.js` to stay
  green. Two theme components (464 lines) are imported by nothing, and both use the props idiom S1
  retired. `composition.css`'s primitive set is unused by its own README's admission — including
  `.cairn-site-shell`, whose fix the showcase's own `site.css` then hand-rolls with a comment saying
  so.
- The showcase has no unit test project, so `paginateArchive`, `isBannerExpired` (a fail-closed rule
  two independent code paths must agree on), and `isAdminHref` (which the prerender crawler's
  correctness depends on) are asserted nowhere — and this tree is the starting copy every next theme
  receives.
- `skills/cairn-admin-screens/` defines a three-step done-gate. CI runs step 1 in narrowed wrappers,
  never runs `cairn-audit --rendered`, and the two npm targets that proxy rendered rules
  (`check:interactive-contrast`, `check:touch-targets`) run in **no workflow at all**. Meanwhile
  `CONTRIBUTING.md` instructs the reader to treat CI as the authority. The two authorities disagree
  and the agent is told to trust the weaker one.

### 9. The test estate has four naming conventions and one type-erasure habit

Cross-project, the same component's tests are named four ways (`EditPage.test.ts`,
`EditPage-insert.test.ts`, `edit-page-advisories.test.ts`, `rulings.border-contrast.test.ts`), and
`src/tests/unit` is 282 flat files whose prefixes hand-reconstruct `src/lib`'s directory tree while
`src/tests/unit/audit/` demonstrates the mirrored layout.

The sharper defect is **827 `as never` casts across 89 test files**, which erase exactly the
structural contracts `CairnEvent` was created to make checkable — its own doc block says "typing it
here makes the seam a checked contract rather than a cast". `src/tests/integration/auth-guard.test.ts:19`
is the counter-exemplar: the same event, annotated, no cast. Thirteen such annotations exist against
827 casts. An agent that adds a member to `CairnEvent` or renames a component prop gets zero compile
feedback from 89 files.

Two more estate-level shapes: the `$app/state` stub is a plain object, so a component that correctly
reads `page.url` inside a `$derived` and one that snapshots it at mount are indistinguishable under
68 component test files; and `vi.stubGlobal` (87 sites) is paired with `vi.restoreAllMocks` (the
wrong teardown) at most of them, with `unstubGlobals` not enabled.

### 10. The gate estate is the repo's strength and is itself uneven

27 `check:` targets, decomposed into pure functions driven by unit tests rather than shelled out —
this is genuinely better than most projects manage. The incoherence is in the seams:

- No aggregate target. The authoritative list lives only in `.github/workflows/test.yml`, which
  `CONTRIBUTING.md` institutionalises ("derive the list from those files rather than from prose")
  and which project memory records as having shipped `main` red three times.
- Two exit idioms: `process.exit(1)` in 12 gates, `process.exitCode = 1` in 9. Three bins document
  why the first is wrong (a piped stdout may not flush) and `vite/bin.ts` uses it anyway.
- Four spellings of a gate's own identity in its own output (`check:consumers OK`,
  `check-arm-indexes: OK`, `chassis-boundary: FAIL`, `admin-copy prose gate:`), so a CI log line
  cannot be mapped to a target mechanically.
- The published-docs corpus is declared five times in four orders and already disagrees:
  `check-symbols` scans `docs/why-cairn.md` and both READMEs, `check-snippets` does not.
- `knip.jsonc` treats `scripts/**/*.mjs` as entry points, so no script can ever be reported dead —
  and one dead script (`migrate-allowlist.mjs`, referencing `AUTH_KV` and `better-auth`, an
  architecture cairn abandoned) is still in the tree describing itself as current.

### 11. Engine-emitted names use four prefix conventions in one namespace

The engine writes down a class contract in `render/highlight.ts:15`: "the engine owns the token class
names; the site owns the colors", mirrored by the `.cairn-place-*` figure contract. `N5` fixes admin
element ids to `cairn-<component>-<element>`. Against that:

- `cairn-*` — `cairn-broken-link`, `cairn-place-*`, `cairn-tok-*`, `cairn-fragment-boundary`,
  `data-cairn-island`. The declared convention.
- `ec-*` — `ec-glyph`, `ec-icon`, `ec-icon-secondary`, `ec-head`, `ec-grid`, 18 sites. `ec` is a
  consumer site's initials. It is published in `docs/reference/render.md`, and has leaked back into
  three admin components that re-declare `.ec-glyph` locally with an apologetic comment. At 1.0 this
  freezes into a public API that nothing in the engine can explain.
- `toolkit-*` — eleven scoped classes in `admin-toolkit`, with two defectors (`status-chip*`,
  and the bare, collision-shaped `page-h1`).
- one class literal, `type-label font-semibold uppercase tracking-[0.08em] text-muted`, written out
  in ten places under two local names (`headerLabel`, `col`), one of them with a comment
  ("matching the concept list") that is a hand-maintained cross-reference standing in for a symbol.

### 12. No formatter arbitrates the tree

There is no Prettier config, no `format` script, no ESLint `max-len`, and `.editorconfig` records
only `indent_style`/`indent_size` — advisory to editors, invisible to CI. The measured drift: 8
tab-indented files in `src/` (five of them the tidy cluster, one a load-bearing editor module),
line widths from 90 to 195 characters inside one file, two doc-comment continuation styles, and
trailing-comma-before-paren appearing only in `cloudflare/` and `vite/`. Five of the eleven areas
filed their local instance of this; the finding is that the arbiter does not exist, so each area is
right and none can fix it locally.

### 13. The knowledge that would prevent the failures is filed where a cold reader cannot reach it

- There is no `src/lib/README.md` and no internals architecture doc. `CONTRIBUTING.md`'s repository
  map gives `src/lib/` one line. `docs/extend/architecture.md` maps *export subpaths* for a
  consumer; it is not an internals map. Every navigation break in the newcomer walk is downstream
  of this one.
- The field-type fan-out is *already documented* — for the sibling subsystem — in
  `.claude/agent-memory/cairn-implementer/adding-a-doctor-check-fanout.md`, one of 262 files in one
  agent's private memory directory, invisible to a fresh agent, to a different agent type, and to a
  human contributor.
- `skills/cairn-admin-screens/` reaches an agent only after `cairn-doctor --fix` copies it into a
  *consumer's* tree. The engine repo has no `.claude/skills/`, so the repo that authors the admin
  design language is the one place an agent cannot load it — and its three internal links resolve
  outside the repo.
- `docs/extend/architecture.md:47` and `define-an-adapter-and-schema.md:118` place the adapter at
  `src/lib/cairn.config.ts`; the scaffold, the template, the showcase, and a third published page
  all put it at `src/theme/cairn.config.ts`. A developer taking over a scaffolded site is told to
  open a file that does not exist.
- `ROADMAP.md` is 2,427 lines / 202 KB at the repository root, read by every agent that reads root
  files; `docs/reference/sveltekit.md` is 154 KB with eleven `##` sections and no table of contents.

---

## What to keep, exactly as it is

A coherence review that only lists defects mis-states the repo. These are the things that already
make `src/` one codebase, and any remediation must not disturb them:

1. **The barrel membership charters.** An agent asked to add an export can decide correctly from the
   header alone, including where a rejected thing goes instead. Nothing else in the repo does this.
2. **The log-event vocabulary.** 39 event names emitted, zero undocumented, the grammar rule stated
   in `log/events.ts`'s header, renaming declared a breaking change. This is the model every other
   code-to-reference coupling should copy.
3. **`sveltekit/cairn-admin.ts`, `admin-dispatch.ts`, `guard.ts`, `content-routes.ts`.** One factory,
   one path authority, a guard that reads top-to-bottom as the request's own story, and a 150-line
   composition root. Both walks independently named these as the clearest files in the repo.
4. **`content/fields.ts` and the derived `NamedField`.** The `const O` generic is uniform across all
   fifteen constructors, so the sixteenth writes itself, and `NamedField = FieldDescriptor & { name:
   string }` propagates a new arm with no edit. That is the shape the rest of the field system should
   match.
5. **`content/cross-branch-index.ts`.** Opens by naming its four callers and the exact shape they
   share. The A2 convergence is the one that actually landed, and the header is why.
6. **The Svelte 5 discipline.** Zero legacy syntax, `$derived` doing the deriving, `untrack` at
   one-time seeds with the reason written down, keyed `{#each}` with the key choice justified,
   `$props.id()` where hydration stability matters. This dimension needs enforcement, not redesign.
7. **The declaration-time guards.** `fieldset.ts`'s `checkSeoImageFields` / `checkTaxonomyMarker` /
   `checkContainerNesting` and `registry.ts:234`'s fail-closed attribute check all name the offending
   key and the fix. They are the exemplars the catch-all dispatchers should be converted toward.

---

## The one-line summary

The engine's outside is documented to a standard well above its peers; the inside is one codebase
in vocabulary and eleven in enforcement, and every gap between them is a rule this repo already
knows how to make into a failing test.
