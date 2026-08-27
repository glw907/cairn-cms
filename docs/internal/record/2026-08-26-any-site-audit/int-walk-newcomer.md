# Cold newcomer walk — cairn-cms

Walked 2026-08-26 by a reader with no prior exposure to this codebase. Path taken in order:
`README.md` → `CLAUDE.md` → `docs/why-cairn.md` → `docs/extend/README.md` →
`docs/extend/architecture.md` → `CONTRIBUTING.md` → `src/`. Breaks are marked **BREAK n**.
Things that worked are marked **WORKS**.

---

## 1. README.md

Answers "what is this engine" in three sentences and routes five distinct readers in a
"Where to start" block. I knew inside a minute that this is a git-backed CMS whose editors
never see git, and that the admin doubles as a UI toolkit a developer mounts their own
screens into.

**WORKS.** The five-way router at the top is the best thing in the repo's front door. The
"Content and storage" paragraph front-loads the holding-branch/publish mechanic, which turns
out to be the single most load-bearing idea in the system.

Unanswered so far: where a request enters, where the code lives.

## 2. docs/why-cairn.md

Read as an evaluator. "The honest trade-offs" section names six real constraints including
"a documented seam has broken across a minor version more than once." Credibility is high.

**WORKS.** Nothing in this page contradicted anything I later found in code.

## 3. docs/extend/README.md

The track index plus a **Vocabulary** section that defines Concept, Adapter, Render, Seam,
Island, Holding branch, Manifest, Role/capability. Reading that list is the fastest
orientation in the whole repository.

**WORKS.** After the vocabulary block I could read every later doc and most module headers
without stopping. If I were shown one page from this repo, this would be it.

## 4. docs/extend/architecture.md

Two mermaid diagrams (the six functional groups over three stores; the save/publish sequence),
the six seams enumerated, the read path (direct Backend read vs. committed manifest), and a
"What stays engine-internal" section.

Four of my six questions are now answered from docs alone:
- **What is this engine** — yes.
- **Where does content live** — yes: markdown in the *site's own* repo; the engine reads one
  entry through the Backend and the whole corpus through a committed JSON manifest.
- **Where does the admin mount** — yes, in outline (`/admin/[...path]` catch-all + layout).
- **Where does auth happen** — yes, in outline (guard in `hooks.server.ts`, D1 store).

Still open: **where does a request enter** (in code), and **where would I add a field type**.

**BREAK 1** — `architecture.md:47` says the adapter sits "typically at
`src/lib/cairn.config.ts`". `define-an-adapter-and-schema.md:118` repeats it as a code
comment. But the shipped scaffold (`templates/waymark/src/theme/cairn.config.ts`,
`packages/create-cairn-site/template/src/theme/cairn.config.ts`), the showcase
(`examples/showcase/src/theme/cairn.config.ts`), and the sibling page
`what-the-scaffold-wrote.md:122-126` all put it at `src/theme/cairn.config.ts`. A developer
taking over a scaffolded site is told to open a file that does not exist. Two published pages
disagree with the code and with a third published page.

## 5. CONTRIBUTING.md

**WORKS, strongly.** Setup, the "Is this cairn's job?" premise gate, a docs-track
discriminator keyed on the *reader*, "CI is the authority on what must pass … derive the list
from those files rather than from prose", and a warning that a test path vitest does not glob
"runs zero tests and still exits 0". This is a model contributor guide.

**BREAK 2** — the Repository map gives `src/lib/` exactly one line: "the shipped library.
Public entry points are package subpaths…". That is where the map stops and the reverse
engineering starts. There is no `src/lib/README.md`, no internal architecture doc, nothing
that maps the 23 directories and ~60k lines to subsystems or shows how a request flows
through the modules. `docs/extend/architecture.md` maps *export subpaths* for a consumer; it
is not an internals map for a contributor or an agent. Every subsequent break below is
downstream of this one: I had to build the map by reading.

## 6. First look at `src/lib/`

```
admin-toolkit/ ambient.ts audit/ auth/ auth-channel/ auth-crypto/ auth-store/
cloudflare/ components/ content/ delivery/ design/ diagnostics/ doctor/ email.ts
env.ts escape.ts github/ index.ts islands/ log/ media/ media-seed/ nav/ render/
reproductions/ sveltekit/ vite/
```

**BREAK 3** — I cannot tell a public package subpath from an internal module. Cross-checking
`package.json` `exports` afterwards: 13 of these directories are public subpaths
(`sveltekit`, `components`, `admin-toolkit`, `islands`, `render`, `delivery`, `media`,
`reproductions`, `auth-store`, `auth-channel`, `auth-crypto`, `cloudflare`, `vite`) and 10 are
internal (`audit`, `auth`, `content`, `design`, `diagnostics`, `doctor`, `github`, `log`,
`media-seed`, `nav`). They are interleaved alphabetically with no signal.

The auth cluster is the worst instance. Four adjacent directories:
- `auth/` — internal, 841 LOC, the real implementation.
- `auth-channel/` — public, 1548 LOC, a real second implementation (a generic second-audience
  login factory).
- `auth-crypto/` — public, **13 LOC**, a one-line re-export of `../auth/crypto.js`.
- `auth-store/` — public, **17 LOC**, a re-export of seven functions from `../auth/store.js`.

So two of the four are export shims, one is the engine's own auth, and one is a separate
subsystem, and nothing in the layout says which is which. `CONTRIBUTING.md` states the rule
("a directory without a reference page is internal") but the rule requires a second file to
apply.

**BREAK 4** — five loose files sit beside the 23 directories: `index.ts`, `ambient.ts`,
`email.ts`, `env.ts`, `escape.ts`. `email.ts` is the magic-link email boundary and the home of
`SendMagicLink`/`EmailSender`/`AuthBranding`, all of which the root barrel re-exports as auth
surface, yet it sits outside `auth/`. `env.ts` owns `CairnEnv`, the platform-binding guard.
Their placement reads as historical rather than reasoned. (`escape.ts` earns its position: its
own header explains it is a leaf shared by two arms that must not reach into each other.)

## 7. `src/lib/index.ts` — the root barrel

Legible: grouped by subsystem, every export commented with *why it is public*.

**WORKS.** The pattern of documenting a type's membership by naming the public symbol that
references it ("`ConceptConfig.datePrefix` and `ConceptDescriptor.routing` name these") is
genuinely useful — it tells an agent whether removing an export is safe.

**BREAK 5** — the same comments are dense with references I cannot resolve: "Auth landed in
Plan 01, the content model and adapter in Plan 02, and the GitHub read-and-commit backend in
Plan 03", "the export-rule sweep, C2 breaking-window pass, R4 ruling", "Contract v2's fieldset
primitive". Counted across `src/lib`: **17 `Plan NN` references, 189 total unresolvable
process references** (`C2 breaking-window pass`, `R4 ruling`, `export-rule sweep`, `Pass C`,
`spec 2.8`, `Task 15`, `phase-3a`, `2a fetch actions`), plus **19 pointers into
`docs/superpowers/`**, a directory the npm tarball does not ship. Each of these appears exactly
where a rationale is promised. `admin-action.ts` opens "(Part C item 3 of the phase-2 design
suite)" and then "SCAFFOLD FINDING (the reference stand-in that shaped this,
aksailingclub-org's club-admin-scaffold)". There are **18 mentions of private consumer sites**
(ecxc, aksailingclub, 907.life) in the source of an MIT-licensed public package.

## 8. Where does a request enter?

Traced it in the showcase, which is the right proving ground and was easy to find.

- `examples/showcase/src/hooks.server.ts` → `createAuthGuard()` from `/sveltekit`.
- `src/routes/admin/+layout.server.ts` → `admin.shellLoad`.
- `src/routes/admin/[...path]/+page.server.ts` → `admin.load` + `admin.actions`.
- `$chassis/cairn.server.ts` → `composeRuntime({adapter, siteConfig})` then
  `createCairnAdmin(runtime, deps)`.

**WORKS.** `src/lib/sveltekit/cairn-admin.ts` is the clearest file in the repository. One
factory, one `load` that switches on a parsed view, one `actions` record, and a `viewAction`
wrapper whose TSDoc explains exactly why an unexpected throw becomes `fail(500)` rather than
SvelteKit's raw 500. `admin-dispatch.ts` is declared "the single path authority" and is a pure
function. I understood the whole admin request path from these two files.

**WORKS.** `src/lib/sveltekit/guard.ts` reads top-to-bottom as the request's own story:
dev-flag tripwire → non-admin origin check → HTTPS → bindings → CSRF → session → capability →
resolve → security headers. Each branch carries a comment saying why it sits at that position.
The `isLocalHost` helper carries "Do not make it an auth check", which is the right comment in
the right place.

**WORKS.** `src/lib/sveltekit/content-routes.ts` is a 150-line composition root that merges
five domain factories and returns a key-ordered object pinned by `check:surface`. This is how
a decomposition should be presented.

**BREAK 6** — but the five domains it merges are `content-routes-core.ts` (2215 lines),
`content-routes-media.ts` (1414), `content-routes-settings.ts` (450),
`content-routes-context.ts` (362), `content-routes-tidy.ts` (263),
`content-routes-dictionary.ts` (148). Six sibling files sharing a prefix instead of a
directory, and `-core` is a non-name: it turns out to hold `AdminShellData`, `shellLoad`,
`helpLoad`, `indexLoad`, `listLoad`, the entry CRUD, publish, rename, preview and revert. I had
to open it to learn what "core" meant.

The same prefix-as-directory pattern recurs: `src/lib/components/` is **92 flat files**
containing `editor-*.ts` (12 CodeMirror extension modules), `tidy-*.ts` (4), `media-*.ts` (3),
the admin screens, the field widgets, pure helpers, a CSS file, a fonts directory and a
spellcheck worker. `src/tests/unit/` is **290 flat files**.

## 9. Where does content live?

Answered cleanly. `src/lib/content/` (30 files) owns the model: `adapter.ts`, `concepts.ts`,
`fields.ts`, `fieldset.ts`, `frontmatter.ts`, `manifest.ts`, `ids.ts`, `links.ts`,
`references.ts`, `taxonomy.ts`. `src/lib/github/backend.ts` is the read-and-commit seam.
`cross-branch-index.ts` is the shared fan-out builder three indexes plus `media/usage.ts` use.

**WORKS.** `content/cross-branch-index.ts` opens by naming its four callers and the exact
shape they share. That header did more for my understanding than any diagram.

## 10. Where would I add a field type?

The hardest question of the six, and the only one I could not answer from reading.

**BREAK 7** — no doc covers it. `docs/extend/` has 31 pages including "Declare your own
concept", but nothing on adding a field *type*; the field vocabulary is presented as closed. It
may well be closed on purpose (that is a legitimate scope answer), but neither the docs nor the
code says so. Reconstructing it by grep, a new arm touches at least:

1. `content/fields.ts` — the interface, the `FieldDescriptor` union, the `fields.*` builder.
2. `content/fieldset.ts` (507 lines) — the validator arm.
3. `components/FieldInput.svelte` — a 15-arm `{#if field.type === …}` chain.
4. `components/ComponentForm.svelte` — a **second**, 4-arm chain over the same union
   (`boolean`, `select`, `icon`, else text), with no shared abstraction and no exhaustiveness
   check between them.
5. `render/registry.ts:234` — a hand-maintained `ATTRIBUTE_TYPES` Set literal listing ten of
   the type strings.
6. `src/lib/index.ts` — the per-arm type export.
7. `docs/reference/core.md` — or `check:reference` fails.

Nothing links these seven places to each other. Only grep for `'icon'` found them.

## 11. Auditing against `docs/internal/code-idioms.md`

CLAUDE.md calls this "the idiom charter, one obvious way per pattern" and the bar says to audit
against it.

**BREAK 8** — it is written as the to-do list of the pass that authored it, not as a standing
rule set. Rules are stated in the future tense of work not yet done: "The stragglers
(`pending.ts`, `fields.ts`, `env.ts`, two auth files) converge", "its four near-verbatim copies
… becomes **one shared helper**", "`doctor/index.ts` moves its resident logic out". It closes
with two sections that are pure process residue: "Structural decisions (this pass)" and "Sweep
clusters (Task 4 partition, riskiest first)" listing eight numbered work packages. A reader
cannot tell a rule in force from work that was planned.

I spot-checked two:
- **A2** (one shared cross-branch fan-out helper) **landed** — `content/cross-branch-index.ts`
  exists with all four callers migrated.
- **M4** (2-space indentation everywhere) **did not** — eight files still use tabs
  (`diagnostics/error.ts`, `diagnostics/conditions.ts`, `sveltekit/tidy-prompt.ts`,
  `components/{tidy-categorize,chrome-guard,editor-tidy,tidy-diff,tidy-validate}.ts`).
  `.editorconfig` exists and its own header says it "records the code-idiom charter's M4 rule
  … so an editor enforces it going forward instead of relying on a one-time sweep to hold" —
  but `.editorconfig` is advisory and no lint rule or gate enforces indentation, so the sweep
  did not hold and nothing noticed.

**BREAK 9** — **M1** ("Every module opens with a `// cairn-cms: <orientation>` header") is
violated wholesale by the one subsystem that most needs it. Of 274 `.ts` files, 16 open with no
comment at all, and **10 of those are the entire `render/` directory**:
`pipeline.ts`, `rehype-dispatch.ts`, `remark-directives.ts`, `sanitize-schema.ts`,
`component-{grammar,insert,validate,reference}.ts`, `glyph.ts`, `table-scroll.ts`.
`render/pipeline.ts` — the file defining `createRenderer`, the public render entry point —
opens cold with 23 bare imports of unified/remark/rehype plugins and no statement of what the
pipeline does or why the plugin order is what it is. This is the subsystem where a newcomer has
the least prior knowledge (unified's plugin model, hast vs mdast, the sanitize schema) and it is
the one with zero orientation.

**BREAK 10** — the `/render` public surface hides. `docs/reference/render.md` documents
`iconSpan`, `cardShell`, `headRow`, `isElement`, `strAttr` as the component-authoring toolkit.
All five are *defined* in `src/lib/render/rehype-dispatch.ts` and merely re-exported by
`render/authoring.ts`. A newcomer looking for `cardShell` opens `authoring.ts`, finds a
re-export line, and then has to guess that "rehype-dispatch" is where hast builders live. Only
grep resolves it. (`authoring.ts` itself is well documented and states its membership rule
clearly — the problem is the file the symbols actually live in.)

## 12. Barrel membership rules

**WORKS, and this is the repo's strongest agent-extensibility feature.** Every public barrel
opens with an explicit charter for what may join it and where a rejected thing goes instead:

- `/components`: "A general-purpose, domain-agnostic primitive … belongs on `/admin-toolkit`
  instead, even one this barrel's own screens compose internally."
- `/admin-toolkit`: "`TextInput`/`SelectInput` are named for the element they wrap, not
  `TextField`/`SelectField`, because the root barrel's field *descriptor* arms already own those
  names; two subpaths exporting different things under one name is the agent trap this pass
  exists to remove."
- `/auth-crypto`: "a stateful provisioning read or write belongs on `/auth-store` instead, even
  one built on the same hashes this barrel produces."
- `/islands`: "an admin screen component belongs on /components, and the render pipeline's own
  hast builders on /render."

An agent asked to add an export can decide correctly from the barrel header alone. Keep this.

## 13. Svelte 5 / SvelteKit 2 idiom

**WORKS.** Zero legacy syntax in `src/lib`: no `export let`, no `on:click`/`on:change`/
`on:submit`, no `createEventDispatcher`, no `$$props`/`$$restProps`, no `svelte/store` import.
Rune usage: 283 `$state`, 246 `$derived`, 58 `$props`, 62 `$effect`, 5 `$bindable`. The
`$derived`-to-`$effect` ratio says derivation is not being done in effects, which S1 requires.
SvelteKit control flow is uniform: 30 `throw redirect(`, 37 `throw error(`, zero bare or
returned variants.

**BREAK 11** — component size. `CairnMediaLibrary.svelte` is **3159 lines**,
`EditPage.svelte` **2920**, `MarkdownEditor.svelte` **1185**, `CairnAdminShell.svelte` 949.
`EditPage.svelte` carries 15 `$effect` blocks and `CairnMediaLibrary.svelte` 8. These are the
two screens a newcomer most wants to read (the editing surface and the media library) and
neither can be held in the head. `code-idioms.md` records the deferral ("`CairnMediaLibrary`
is NOT split this pass … filed to ROADMAP as its own future pass") with a real reason, but the
deferral is recorded in an internal doc, not at the file.

## 14. Log-event vocabulary

**WORKS.** Extracted all 39 event names emitted through `log.*()` in `src/lib` and checked each
against `docs/reference/log-events.md`: **zero undocumented**. `log/events.ts` declares the
union with the grammar rule stated in the header (`area[.subject].verb_phrase`, snake_case
reasons) and a note that renaming one is a breaking change. This is the cleanest
code-to-reference coupling in the repo and the model the rest should follow.

## 15. Reference docs at scale

**BREAK 12** — the reference pages a newcomer looks things up in are enormous and have no
in-page index. `docs/reference/sveltekit.md` is **154 KB / ~4000 lines** with 11 `##` sections
and no table of contents; `core.md` 67 KB; `admin-toolkit.md` 45 KB; `components.md` 44 KB;
`delivery-data.md` 38 KB; `cairn-audit.md` 36 KB. Finding `createSectionAction` meant scrolling
or grepping a file longer than most books' chapters. `docs/reference/README.md` indexes the
*pages*, not the symbols.

**BREAK 13** — `ROADMAP.md` sits at the repository root, is linked from `README`-adjacent
docs and from CLAUDE.md, and is **2427 lines / 202 KB** across five tier headings. A newcomer
who opens it (and every agent that reads root files) pays that cost before learning anything.
`CHANGELOG.md` is 340 KB and `docs/internal/engine-rulings.md` 431 KB; both are deliberate
append-only ledgers, but the roadmap is presented as a live planning document.

**WORKS.** `docs/STATUS.md` is 4.7 KB and holds present tense only, exactly as CLAUDE.md
requires. `docs/internal/README.md` carries a filing rule (dated artifact → `record/`, living
standard → top level) enforced by `check:arm-indexes`. That gate is the right shape.

---

## Scorecard against the three bars

**Bar 1, idiomatic Svelte 5 / SvelteKit 2.** Strong. Zero legacy syntax, uniform control flow,
runes used correctly, a real composition root, no classes. The gaps are size (two 3000-line
components) and one unenforced formatting rule.

**Bar 2, inviting to a new developer.** Strong at the docs front door, weak the moment you
open `src/`. The published tracks, the vocabulary section and CONTRIBUTING are better than most
projects ship. But there is no internals map, the directory layout does not distinguish public
from internal, one subsystem (`render/`) is undocumented, and the comments that would carry the
reasoning cite documents the reader cannot reach.

**Bar 3, easy for an AI agent to extend.** Split. The barrel membership rules, the log-event
discipline, `check:surface`/`check:reference`, and the typed seams are genuinely excellent
agent affordances — better than the human-facing equivalents. Against that, an agent asked to
add a field type must discover seven coupled edit sites by grep with no exhaustiveness check to
catch a miss, and an agent reading a comment for rationale hits an unresolvable "R4 ruling" 189
times.

**The one-line summary.** The outside of this engine is documented to a standard well above its
peers; the inside is navigable only by someone who was present when it was built.
