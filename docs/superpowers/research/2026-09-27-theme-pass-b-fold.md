# Theme identity pass B: review fold record (2026-09-27)

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`, folded from `main`
at `ed2b7955`. The parent spec (`2026-09-26-theme-identity-design.md`) was not edited. The fold
changes no meaning in it, so no erratum is owed.

**Inputs:** the nine lens reviews (`2026-09-27-theme-pass-b-review-*.md`) and the ecosystem survey.
**Method:** each finding was checked against the tree or the reviewers' scratch evidence before it
was folded. Every new mechanism in the revised spec is quoted from a review's evidence or proven
below. Duplicates across lenses fold once, and each row lists every ID.

**ID prefixes:** CT contract, ME mechanics, RK risk, CO consistency, ID idiom, TH theming (M1 to M7
are TH1 to TH7, m1 to m5 are TH8 to TH12), CP component, SZ sizing, EC ecosystems (F1 to F9).

## Counts

- **Findings:** 99.
- **Folded:** 91.
- **Refused:** 3 (CO17, ID5, ID6). Two folded findings also had one sub-arm refused (RK5, TH5).
- **Owner rulings:** 5 findings (RK7, CO1, RK9, CO3, CP4), feeding R1, R2, and R4. R3 and R5 come
  from the conductor's scope decisions and from the fold's own growth.

## New evidence produced by the fold

**`@theme inline` does not make a derived `@theme` color recompute under a nested theme.** A compile
against the reviewers' installed Tailwind 4.3.3 (`/tmp/claude-1000/-var-home-glw907-Projects-cairn-cms/45069231-c4a9-4525-8b03-929b05217141/scratchpad/fold/t.mjs`, inputs `s1.css` to
`s3.css`) put `@theme inline { --color-muted: var(--cairn-muted); }` beside
`@layer theme { :root, [data-theme] { --cairn-muted: … } }`. The utility `text-muted` compiled to
`color: var(--cairn-muted)` and would recompute. But `--color-muted` itself was emitted on `:root`
as `var(--cairn-muted)`, so a `var(--color-muted)` reader inherits the root's computed value. Adding
a second `[data-theme]` declaration of `--color-muted` inside the engine layer would beat a theme's
`@theme` override on `html[data-theme]`. The spec therefore states the nesting limit for the two
`@theme` colors instead of inventing a mechanism. The same output shows Tailwind passing a
hand-written `@layer theme { :root, [data-theme] { … } }` block through intact under its declared
`@layer theme, base, components, utilities` order.

**Mechanisms the spec relies on, and their proof:**

| Mechanism | Proof |
|---|---|
| `@theme` in a package export generates utilities; a later theme `@theme` wins | ME "verified sound" (fake-package build, CLI and Vite) |
| `@source` in a package sheet resolves relative to itself | `src/lib/admin-sources.css` header and its shipped use; Tailwind docs quoted in ID1 |
| A scanned `var(--x)` or class keeps an `@theme` key emitted; unscanned engine source does not | RK1 and CP2 compile runs; ID1 quotes Tailwind's "only used CSS variables" |
| `@theme static` is dropped by a later ordinary `@theme` | RK1, ID1, CP2 compile runs |
| Unlayered and `@layer base` overrides beat `@layer theme` | ID2 compile output (`@layer theme, base, components, utilities`) and CSS cascade layers |
| `[data-theme]` redeclaration recomputes a derived value; `:root`-only does not | ME `nested.mjs` (Chromium) |
| daisyUI emits block custom properties on the dark-preference and `[data-theme]` selectors, in `@layer base` | ID2 quotes `daisyui/theme/index.js` |
| A comma-separated value splits in a daisyUI block | TH2 compile probe |
| A block named after a built-in theme is completed by merge | ME10 and TH1 quote `theme/index.js`; TH1 compile |
| `daisyui/theme/object` is a declared export with one key set across 35 themes | ME "verified sound" |
| culori `interpolate(…, 'oklab')` matches Chromium `color-mix` | ME "verified sound" |
| culori cannot parse `color-mix` or `var()` | ME3 |
| Optional peer dependencies are an existing package pattern | `package.json` `peerDependenciesMeta` (`@anthropic-ai/sdk`) |
| `cairn-guidance install` ships every directory under `skills/` | `src/lib/guidance/install.ts:99-108` |
| Every packaged `SKILL.md` has a 3,500-token budget | `scripts/checks/check-skill-budget.mjs` |

## Design calls made in the fold (Claude's, per the delegation)

- **The stylesheet is `@glw907/cairn-cms/public.css`.** Once the export holds rules as well as
  defaults, `theme-tokens.css` misnames it. `theme.css` would collide with every site's own
  `src/theme/theme.css`. `public.css` names the charter's public side and pairs with the admin export.
- **The design scale stays site-owned (conductor decision 2).** I chose leaving the `@theme` scale
  in the chassis over renaming the colliding steps. It keeps the engine contract smaller: no scale
  keys, no stock-key redefinitions, and no pruning exposure for the scale. It still serves the
  library goal: engine components read roles, radii, and daisyUI sizes, and chassis components read
  the scale. Renaming five of eight steps would break `gap-m`-style markup across four sites for a
  contract the engine does not need to own. `--text-step--2` is therefore not a contract key, and it
  was not added.
- **The engine public directory is `src/lib/public/`.** `src/lib/components` is the admin, and the
  review found no other home. `PreviewBanner` moves there, which gives the directory a real member.
- **Emitted-class rules (conductor decision 1).** Every emitted class is named in the registry.
  The engine sheet styles the ones whose styling carries no design choice: the code-block binding,
  `cairn-focus-ring`, and `.table-scroll`'s structural rule. Placement geometry, glyphs, and grids
  stay the theme's, as `site.css` and `prose.css` style them today. Moving those would repeat
  Drupal's Classy freeze (EC F1c).
- **`cairn-focus-ring` becomes a plain `@layer components` rule.** Its seven uses are bare classes
  with no variant, so the `@utility` form buys nothing. A plain rule is never pruned. The
  equivalence test covers its computed focus outline.
- **The absolute-font-size line is `px`, `pt`, and `rem`.** Each bypasses the type scale. The root
  element's `font-size` is exempt by rule, not by suppression, since it defines `rem`. A counted
  suppression on every Waymark-derived site would be noise.
- **Named colors are literals, and CSS-wide keywords are not.** This matches `token-colors`.
- **Waymark's per-scheme values move into its daisyUI blocks (ID2 point 4).** Waymark is the file
  four sites re-skin from, and the hand-synced dark triple is the largest cairn-specific cost a
  designer pays (TH2). The equivalence test makes the move provably render-neutral.

## Dispositions

### Contract and criteria

| ID | Finding | Disposition |
|---|---|---|
| CT1 | No failing fixtures | Folded: Proof, per-rule fixture list |
| CT2 | Advisory demotes the CI gate | Folded with RK9 context: Tiers (repo fails from day one), `check:public-tokens` successor, overlay kept, gates list |
| CT3 | Baselines blind to token drift | Folded: computed-token equivalence test |
| CT4 | `check:reference` cannot gate CSS | Folded with CO6, EC F7: standalone key-set snapshot and page-sync test |
| CT5 | Public scope can match nothing; probe 2 vacuous | Folded with ME1, RK3, CO4, TH6, SZ6: named roots, empty-scope error, probe 2 scanned count |
| CT6 | No observable for build and render | Folded with ME5, SZ4, SZ7: `test:theme-fixture` assertions, probe 3 pass condition |
| CT7 | Guidance-table test set and zero rows | Folded with CP6, SZ9: coverage gate resolves through the conformance set; empty parse fails |
| CT8 | Conformance passes on empty blocks or key list | Folded: key-list guard, no-block finding, daisyUI keys seeded only for complete blocks |
| CT9 | Tailwind variables missing from resolution | Folded with RK6, EC F3: `tailwindcss/theme.css`, `--tw-`, fixtures both ways |
| CT10 | Inks on `:root`; no standing N check; scheme model | Folded with ME11, RK8, ID2, TH2: `:root, [data-theme]`, stripped-overrides case, scheme model |
| CT11 | Ink claim false; `color-scheme` missing | Folded with CO11: claim corrected, `color-scheme` in the key list, migration names changed values |
| CT12 | Literal syntaxes; fixed exemption; probe re-run | Folded with EC F4: syntaxes enumerated, configurable theme roots, one re-run then escalate |

### Mechanics

| ID | Finding | Disposition |
|---|---|---|
| ME1 | Roots wrong; double-fire with `token-colors`; no exclude | Folded: default roots, `exclude`, one scope per file. The engine root is named in the showcase config, since the audit runs from the showcase |
| ME2 | `sheet.ts` fuses comments into names | Folded: chain 2 task 4, the first audit task |
| ME3 | culori cannot resolve as stated; scheme model | Folded with SZ3, CO8, RK2: bounded resolver, scheme model, culori runtime dependency |
| ME4 | N measured on the wrong population and ground | Folded: measurement population and three grounds; contrast pairs on all three |
| ME5 | Fixture build has no mechanism | Folded: `test:theme-fixture` |
| ME6 | Default muted fails AA | Folded: muted measured like the inks; claim corrected |
| ME7 | `public-literals` flags `site.css`'s clamp | Folded: root-element `font-size` exemption |
| ME8 | `markup.ts` misses mixed `style=` and `style:` | Folded: task 5 substrate |
| ME9 | Resolution sources incomplete | Folded with TH5, SZ2: declared-anywhere set, non-literal names skipped, `sheet.ts` parse |
| ME10 | Built-in names; wrong rationale; per-block message | Folded with TH1: built-in merge, corrected rationale, message names the case |
| ME11 | Derived ink stale under nested theme | Folded (see CT10) |
| ME12 | `daisyui` import undeclared | Folded with CO8: optional peers (`daisyui`, `tailwindcss`), named failure, pack smoke test |
| ME13 | Chains share more files | Folded with CO15: four shared files named |

### Upgrade and failure risk

| ID | Finding | Disposition |
|---|---|---|
| RK1 | Tailwind prunes engine-read defaults | Folded with ID1, CP1, CP2, EC F1: `public.css` with `@source` over `src/lib/public/`; `@theme static` rejection recorded; template-arm build proof |
| RK2 | culori devDependency crashes the shipped audit | Folded (see ME3); pack smoke test |
| RK3 | Roots overlap admin, omit chassis | Folded (see CT5); `src/chassis` is a default root |
| RK4 | Chassis residue list drops rules; migration not one line | Folded: residue list complete, rules moved, `Consumers must:` moves site-added keys first, `paletteFiles` named. The `--text-step--2` side signal was not taken, since the scale is site-owned |
| RK5 | Unlayered defaults beat layered overrides | Folded with ID2, TH2, EC F6: `@layer theme`. Sub-arm refused: a conformance flag for a `--cairn-*` key in `@theme` costs a rule arm for a placement error the `cairn-site` placement rule already prevents |
| RK6 | Resolve set false positives and false pass | Folded (see CT9, ME9); import-chain credit and the two migration findings |
| RK7 | Template imports an unpublished subpath | Owner ruling R1 |
| RK8 | Nested `data-theme` inherits the page's ink | Folded (see CT10) |
| RK9 | Promotion unanchored | Owner ruling R2, which carries the zero-advisory-count gate |
| RK10 | Partial migration cancels derivation | Folded: the "chassis redeclares an engine default" finding |

### Consistency

| ID | Finding | Disposition |
|---|---|---|
| CO1 | Template live on merge with an unpublished import | Owner ruling R1 |
| CO2 | No charter premise check | Folded: premise paragraph; proposed ruling below |
| CO3 | Error tier gates a site's own design | Owner ruling R2; the charter "all 28 rules" amendment folded into Documentation |
| CO4 | `src/lib/components` in both scopes | Folded (see CT5) |
| CO5 | `public-literals` overlaps `token-colors` | Folded with ID7, SZ1: shared core, one path-list seam, one scope per file |
| CO6 | New surface ungated | Folded (see CT4) |
| CO7 | `cairn-eyebrow` home; namespace rule | Folded: class cut (conductor decision 3); binding and focus-ring home is `public.css`; README namespace rule updated |
| CO8 | Undeclared runtime dependencies | Folded (see ME3, ME12) |
| CO9 | Three documents missing | Folded: chassis README, `public-design-system.md`, `design-your-site.md`, wider re-emit |
| CO10 | Parser against the audit's canvas method | Folded: why static is sound here, rendered backstop, coverage limits |
| CO11 | Ink claim false | Folded (see CT11) |
| CO12 | `--flow-space` breaks naming | Folded: the one grandfathered unprefixed role |
| CO13 | Docs resume wrong under split | Folded: "after the public theme contract merges" |
| CO14 | Reports uncommitted; eyebrow count | Folded: Evidence now rests only on reproduced claims; eyebrow claim cut |
| CO15 | Shared files unnamed | Folded (see ME13) |
| CO16 | Implementer definition in dotfiles | Folded: close's conductor commits in dotfiles, `claude-tooling-sync verify`, line quoted in report |
| CO17 | `Consumers must:` describes an optional swap | Refused: `PreviewBanner`'s migration makes an engine component depend on `public.css`, so the import is required |
| CO18 | "Sections 1 to 4" unnumbered | Folded: status line rewritten |

### Idiom

| ID | Finding | Disposition |
|---|---|---|
| ID1 | Unused `@theme` variables pruned | Folded (see RK1) |
| ID2 | Unlayered defaults beat the daisyUI block | Folded (see RK5, CT10), including Waymark's move into its daisyUI blocks |
| ID3 | Spacing names hijack container sizing | Folded as a design call, not an owner fork: the scale stays site-owned (option C of TH7) |
| ID4 | Engine redefines Tailwind stock keys | Folded: the engine redefines none; the chassis keeps them as the site's choice |
| ID5 | Name by utility mapping; move inks, shadow, caption into Tailwind namespaces | Refused in part. The rule's principle is adopted in the Naming paragraph. The renames are refused: an `@theme` key cannot recompute under a nested theme (fold evidence above), and the inks must. `--cairn-caption-tracking` left the contract anyway |
| ID6 | Keep `cairn-eyebrow` as an engine `@utility` | Refused: the harvest count did not reproduce, and `uppercase tracking-eyebrow` already works (conductor decision 3) |
| ID7 | `public-literals` re-implements `token-colors` | Folded (see CO5) |

### Ease of theming

| ID | Finding | Disposition |
|---|---|---|
| TH1 | Conformance rejects the built-in merge | Folded (see ME10); fast path in `cairn-site` |
| TH2 | Defaults beat the daisyUI block; nesting | Folded (see RK5); shadow stays in `:root`; fixture has a nested region |
| TH3 | Seven Waymark-only keys in the contract | Folded with EC F2: admission rule, CTA set and caption tracking stay in Waymark, reader asserted by the snapshot test |
| TH4 | `public-literals` polices location | Folded as option A (conductor decision 5), demoted from owner fork: definitions legal under any theme root, zone configurable, units and keywords defined, escapes documented |
| TH5 | Resolution flags designer vocabulary | Folded (see ME9); fallback skip. Sub-arm refused: reading daisyUI's compiled CSS for component variables. A designer sets those, which counts as a declaration, and a rare unset read takes a fallback or a suppression |
| TH6 | Roots overlap admin | Folded (see CT5); disjoint-roots test |
| TH7 | Spacing collision | Folded (see ID3); README count corrected to five |
| TH8 | Shadow and CTA defaults wrong in dark | Folded: shadow mixes `black`; CTA moot under the admission rule |
| TH9 | Cut `cairn-eyebrow` | Folded: cut; eyebrow row in the job table |
| TH10 | Theme names wired into four files | Folded: touchpoints listed in `cairn-site`; fixture keeps the names |
| TH11 | Replacement `prose.css` floor | Folded: emitted-class registry and `cairn-site`'s replacement list; README directive-class sentence corrected |
| TH12 | Chassis outside scope | Folded: `src/chassis` is a default root |

### Ease of adding a themed component

| ID | Finding | Disposition |
|---|---|---|
| CP1 | No CSS home for engine public components | Folded (see RK1): `public.css` holds the rules |
| CP2 | Pruning | Folded (see RK1); template-arm proof, probe 3 in the template arm |
| CP3 | May engine components assume the contract? | Folded as a design call (conductor decision 11b), demoted from owner fork: yes, and `PreviewBanner` migrates as a named task |
| CP4 | "The library" ambiguous | Owner ruling R4 |
| CP5 | Implementer line points at the wrong page; recipe split | Folded: one recipe home in `cairn-site`, routing line, reworded implementer line |
| CP6 | Table test cannot pass | Folded (see CT7) |
| CP7 | `@utility` eyebrow pruned | Folded: moot, class cut |
| CP8 | Site path works; recipe should separate paths | Folded: the recipe names both paths |

### Right-sized engineering

| ID | Finding | Disposition |
|---|---|---|
| SZ1 | `public-literals` rebuilds `token-colors` | Folded (see CO5) |
| SZ2 | Conformance polices vocabulary; missing-import false pass | Folded (see ME9, RK6) |
| SZ3 | Resolver unbounded | Folded (see ME3) |
| SZ4 | Build proof unbounded | Folded: temp copy, system fonts, no new baselines, CI-first |
| SZ5 | Cut `cairn-eyebrow` | Folded (see TH9) |
| SZ6 | Engine directory names nothing | Folded differently: the directory is now named and holds `PreviewBanner`, so it covers a real file |
| SZ7 | Probe 3 has no pass condition | Folded (see CT6) |
| SZ8 | Migration note omits changed values | Folded: the `Consumers must:` line and migration notes name them |
| SZ9 | Table test source set | Folded (see CT7) |
| SZ10 | Settle `check-public-tokens.mjs` | Folded: retired; successor script. Its sizing verdict is superseded by the fold's growth, raised as R5 |

### Theme ecosystems

| ID | Finding | Disposition |
|---|---|---|
| EC F1 | Emitted-markup bindings unplaced and unnamed; copy-on-purpose unstated | Folded (see RK1): third contract part, registry additions, "What stays copied" paragraph |
| EC F2 | Waymark chrome tokens in the contract | Folded (see TH3) |
| EC F3 | Conformance rejects documented idioms | Folded (see CT9, TH1) |
| EC F4 | Literal boundary underdefined | Folded (see CT12, TH4) |
| EC F5 | Changed-default policy unstated | Folded: seam-promise paragraph |
| EC F6 | Override depends on import order | Folded (see RK5); `@theme` order sentence |
| EC F7 | Reference window untested | Folded (see CT4) |
| EC F8 | Static resolution limits | Folded (see CO10) |
| EC F9 | Guidance omits the theme generator | Folded: `cairn-site` fast path |

The ecosystems lens's own six refusals are kept: style variations, a Starlight component override
map, a versioned token schema, a DTCG JSON source, multi-theme composition rules, and shipping
`prose.css` in the engine.

## Owner rulings raised

- **R1.** Cut the release (pass A with pass B, `0.98.0`) at pass B's merge. Recommend yes. From
  RK7 and CO1.
- **R2.** `public-literals` stays advisory on consumers permanently; `theme-conformance` and
  `theme-contrast` are promoted to error at the next minor, once each production site's advisory
  count is zero. Recommend yes. From CO3 and RK9.
- **R3.** Fold the `cairn-site` skill into pass B. Recommend yes. From the conductor's scope change.
- **R4.** "The library" means both the engine and the chassis component set. Recommend yes. From CP4.
- **R5.** Keep one pass with two chains now that chain 2 is about eleven tasks. Recommend yes. Raised
  by the fold, since the pass grew by about four tasks and pass sizing is the conductor's to raise.

Demoted from owner forks, because each has one clearly correct answer or is a delegated design call:
ID3 and TH7 (the spacing remedy), TH4 (the literal zone), CP3 (engine components may assume the
contract), and the culori-versus-browser choice in ME3.

## Proposed engine ruling (the pass records it; this fold does not edit the ledger)

```markdown
## public-css-export: engine-shipped public stylesheet of role defaults and emitted-class rules  (accept, 2026-09-27, theme identity pass B spec)

- **Verdict:** accept. The defaults are the value half of a contract the engine already owns
  (the classes it emits into public markup and the tokens those classes and the chassis read),
  and all five sites' copied defaults went stale, which is the evidence `site-today-export`
  names for an export beating a chassis copy.
- **Reopens on:** evidence that sites diverge from the engine defaults more often than they
  track them, or a key in the stylesheet that no engine or chassis file reads.
- **Record:** [theme identity pass B spec](../superpowers/specs/2026-09-27-theme-identity-pass-b-design.md)
  and [its review fold](../superpowers/research/2026-09-27-theme-pass-b-fold.md).
```

## Owed edits outside this fold

- `docs/internal/what-cairn-is-and-is-not.md`, the "all 28 registered rules audit the `/admin`
  surface" line: the pass amends it to name the public scope, worded per R2's answer.
- `docs/internal/engine-rulings.md`: the entry above, recorded by the pass, with
  `check:rulings-format` green.
- `~/.dotfiles/claude/.claude/agents/cairn-implementer.md`: the one-line addition, made at the close.

## Second fold (owner decisions, 2026-09-27)

Geoff settled these in the brainstorm on 2026-09-27. The fold applied them to the spec, which now
covers passes B and C.

- **R3 and R4 confirmed.** The `cairn-public` skill is folded in, and "the library" means both
  built-in and custom public components. Both now sit in the spec body as decisions.
- **R5 resolved as a split.** The old R5 is gone, and the two remaining rulings are renumbered: R1
  is release ordering, and R2 is the public rules' tier.
- **Names.** A new Names section carries the two-axis grid (admin or public, built-in or custom),
  with each cell's home, rulebook, audit scope, and guidance. The noun stays "component", "site"
  keeps its one meaning, and "custom admin screen" stays the name for a whole route. Pass B's first
  task writes the names into `docs/internal/docs-register.md` with Vale enforcement.
- **Skill rename.** `cairn-site` became `cairn-public` everywhere in the spec.
- **Stylesheet name.** The engine public sheet is `src/lib/public/cairn-public.css`, exported as
  `@glw907/cairn-cms/cairn-public.css`. It pairs with `cairn-admin.css`, and the prefix avoids a
  collision with a site's own files.
- **Admin rename.** `src/lib/components/` becomes `src/lib/admin/`, `./components` becomes
  `./admin`, and `cairn-admin.css` moves with it. `./admin-toolkit` keeps its name. The rename is a
  breaking change with no alias, carries one `Consumers must:` line, and ships in the same release
  as the `cairn-public.css` import. It is pass B's first task, run alone after pass A merges, with
  the full gate green and a named grep for leftover references as its acceptance.
- **Knock-on naming.** "Engine public component" became "built-in public component", "chassis or
  site component" became "custom public component", and `docs/reference/components.md` became
  `admin.md`. The guard's default admin root is now `src/lib/admin`.
- **Two passes.** Pass B is the rename plus the admin agent path, about six tasks, with probe 1 at
  its close. Pass C is one public theme, about eleven tasks, with probes 2 and 3 at its close. The
  one-pass, two-chain framing, the split point, and the shared-files bullet are gone. Each pass's
  close owns its own shared-file edits and skill-budget reconcile.
- **Sequencing and release.** Both plans are authored together after pass A's segment D, for one
  approval sitting. Execution runs B after A merges and C after B merges. Draft documentation
  resumes after pass C merges. R1 attaches to pass C and now proposes cutting A, B, and C together.

Found while folding, left for the owner or the plan:

- `PreviewBanner` is a built-in public component, but its export sits on the admin barrel, which
  the rename makes `./admin`. The spec keeps it there, as the barrel's one documented exception.
- The rename edits `templates/waymark`'s preview route import. From pass B's merge until the cut,
  the template on `main` imports `./admin`, which no published version exports. R1 names this
  window.
- The audit's default admin root is also a consumer's default. Renaming it moves a site's default
  admin component root from `src/lib/components` to `src/lib/admin`, so a site's
  `src/lib/components` falls outside both default scopes. The migration notes carry it.

## Third fold (conductor decisions, 2026-09-27)

The conductor decided the three conflicts the second fold surfaced, as design calls under Geoff's
delegation. The fold applied them to the spec.

- **`PreviewBanner` gets a public export in pass B.** Pass B's rename task moves `PreviewBanner`
  to `src/lib/public/` and exports it from a new `@glw907/cairn-cms/public` subpath. That barrel is
  where every built-in public component exports from. `cairn-public.css` stays the stylesheet
  subpath. `./admin` carries no public component, so the barrel-exception wording is gone.
- **The template's import changes once.** The template's and the showcase's preview routes import
  `PreviewBanner` from `./public` in the same rename task.
- **Pass C no longer moves the file.** Pass C's task 3 migrates only `PreviewBanner`'s styling to
  tokens. Task 9 documents it on `public.md` instead of `admin.md`, and the facts bullet names its
  token styling.
- **A new reference page.** Pass B adds `docs/reference/public.md`, which `check:reference` needs
  for the new subpath.
- **Names grid.** The built-in public component cell names the `./public` export. A new paragraph
  states that each surface has its own barrel and where a site's custom admin components live.
- **Rename acceptance.** It now requires the `./public` export, the two preview routes importing
  from it, and no `PreviewBanner` under `src/lib/admin`. The leftover-reference grep is pass B's
  acceptance only, since pass C's public scope names `src/lib/components` again on purpose.
- **Release ordering (R1 rewritten).** Both passes change what the template imports, and the
  template goes live from `main` on merge. R1 now asks whether to cut at each pass's merge: `0.98.0`
  at pass B (passes A and B) and `0.99.0` at pass C. The recommendation is yes. The alternative
  holds pass B unmerged and cuts once at pass C's merge, with pass C built on pass B's branch. The
  version numbers stay proposals, to verify with `npm view` before promising.
- **Release knock-ons.** The Release paragraph states the trigger for both merges. Pass B's close
  cuts its release under the recommended answer, and pass C's close cuts under either answer. The
  sentence that shipped the rename in the same release as `cairn-public.css` is gone. Sequencing
  names the "no" path.
- **Admin scope defaults.** The admin static scope's defaults become `src/routes/admin`,
  `src/lib/admin`, and `src/lib/admin-toolkit`. The convention is stated: a site's custom admin
  components live under `src/lib/admin` or `src/routes/admin`.
- **Public scope defaults.** The public scope's defaults become `src/theme`, `src/chassis`,
  `src/routes` minus `src/routes/admin`, `src/lib/public`, and `src/lib/components`. A missing
  default root is skipped. The empty-scope error now fires only when the whole scope matches no
  files, which keeps the two rules consistent. The two default sets stay disjoint.
- **Showcase root.** The spec now says why the showcase config still names the engine's
  `src/lib/public/`: the audit runs from the showcase, so the default root resolves there.
- **Consumers must.** Pass B's line has three parts: the `./admin` import, `PreviewBanner` from
  `./public`, and moving custom admin components out of `src/lib/components` or naming that root
  in `cairn-audit.config.json`. Pass B's close carries the same three items into the migration
  notes and the `cairn-audit.md` reference page.

This fold resolves the three items listed under "Found while folding" in the second fold.

## Fourth fold (designer walkthrough, 2026-09-27)

**Input:** [`2026-09-27-theme-designer-friction-log.md`](2026-09-27-theme-designer-friction-log.md),
a designer agent's re-skin of a scratch showcase copy to a dark-first theme plus a new
`event-card` directive. The conductor decided the dispositions. Each item was checked against the
tree at `3e76c41d` before it was folded, and the log's line citations reproduced. Pass C grows from
about eleven tasks to about thirteen. The two new tasks are 4 (the heading levers and the toggle)
and 5 (the template sweep), so the old tasks 4 to 11 are now 6 to 13.

**New evidence produced by this fold.** A compile against the installed Tailwind 4.3.3 (scratch
`tw/t.mjs`) showed that the `font-*` utility resolves the `--font-*` family namespace before
`--font-weight-*`. With `--font-display` and `--font-weight-display` both declared, `font-display`
emits only `font-family`, and the same holds for `heading`. That settled the key name below.

- **F3, folded (pass C task 4).** Verified: `resolveTheme` (`src/chassis/theme-toggle.ts:27-29`)
  falls back to `matchMedia`, and daisyUI sets `color-scheme` in each theme block
  (`theme.css:100,148`). The fallback reads the root's computed `color-scheme`, and the fixture
  harness asserts the toggle's first click under a light OS. The theme names move into one
  exported config under `src/theme`, the two touchpoints that cannot import it are named there and
  in `cairn-public`, and a unit test asserts the names agree.
- **F2, folded with F3.** The log's workaround, a fifth touchpoint in `app.html`'s no-cookie branch, is
  made unnecessary by the computed-scheme fallback, and the rest are named in one config.
- **F4, folded (pass C task 4).** Verified: literal `600` at `prose.css:79,102,115` and in scoped
  title rules, `font-semibold` in `SiteHeader.svelte:101` and the home and archive routes. The keys
  are `--font-weight-heading` in the chassis `@theme` (Tailwind's `--font-weight-*` namespace,
  generating `font-heading`) and `--cairn-heading-case`, a chassis role, since `text-transform` has
  no Tailwind namespace. `--font-weight-display` was rejected on the measured collision with
  Waymark's `--font-display` face. `theme-conformance` gains a finding for a `--font-<name>` face
  beside a `--font-weight-<name>` weight. Both keys stay in the chassis, not in `cairn-public.css`,
  under the admission rule. The fixture sets `800` and `uppercase`, and the harness asserts both
  computed values on three headings.
- **F7, folded (pass C task 3).** Verified: `preview-doc.ts:105` pins `background:#fff`, and the
  showcase paints its ground on `.cairn-site-shell`. The reset reads
  `var(--color-base-100, #fff)`, which fixes stale chassis copies too. A showcase e2e under Waymark
  dark asserts the preview frame's `body` background. The risk lens's "no change is needed"
  (review-risk.md) checked token reach, not the ground, so this corrects it.
- **F6, folded (pass C task 5).** Verified: `-top-xl` at `(site)/+layout.svelte:74`. The template
  uses `sr-only focus:not-sr-only` or another scale-independent idiom. The harness asserts hidden
  until focus at the fixture's tight scale.
- **F5, folded (pass C task 5).** Verified: the five `border-radius: 2px` focus corners the log
  lists, plus `archive/[page]/+page.svelte:108` and `prose.css:154`, and `--tag-filter-radius: 999px` declared in the route's scoped
  style, where a theme cannot reach it. The corners read `--cairn-focus-ring-radius`. The tag pill
  and `prose.css:639`'s video facade button stay full-round as documented shape exceptions. The
  pill reads `var(--tag-filter-radius, 999px)` with no scoped declaration, so a theme's root value
  reaches it. A unit test sweeps for radius literals outside the named exceptions.
  **Refused arm:** a `border-radius` arm on `public-literals`. A radius literal is often a
  legitimate shape, the rule polices color and font size by design, and the template test covers
  cairn's own files.
- **F8, folded (pass C task 5).** Verified: the kit is a hand-written string in
  `styleguide/+page.server.ts`, and `serializeComponent` and `previewValues` are internal
  (`src/lib/render/component-grammar.ts:44`, `registry.ts:226`), exported from no subpath. The
  styleguide renders one sample per registry entry from its `preview`, which needs one new root
  export. `cairn-public`'s coverage gate walks the registry through the same export. The false
  "auto-themes with your system" sentence (`styleguide/+page.svelte:156`) is corrected. The export
  is new public surface: additive, documented on `core.md`, and carried in the facts.
- **F17, folded (pass C task 5).** Verified: `docs/internal/` and "Verdict 7" appear in the emitted
  `templates/waymark` copies of `theme.css`, `site.css`, and `prose.css`. The references are
  scrubbed at the showcase source, and `check:template` gains a failing fixture for both strings.
  The fold was cheap because task 5 already edits the same template files.
- **F14, split.** The role is real, but it is a rule role, not a text ground: the chassis reads
  `base-300` only for borders, rules, and the flourish fill (`prose.css:227,401,424,436`), and no
  text paints on it. **Folded:** a rules row in `cairn-public`'s job-to-token table naming
  `base-300` as the rule and border color, never a text ground. **Refused:** adding `base-300` to
  `theme-contrast`'s text pairs, since a text pair on a ground that carries no text measures
  nothing. `base-200` is already a measured ground.
- **F1, folded through F3 and F4.** The two moves the log found missing from the recipe (heading
  case and weight, the default scheme) are now rows in `cairn-public`'s table.
  `design-your-site.md` stays under the freeze rule, fixed only where pass C makes it wrong.
- **F9, F13, F15, F16: no change.** The log tags each as already addressed by the spec (CP8 and
  TH11, `theme-contrast`, the public scope, and `@layer theme`). The fold confirmed each against
  the spec text.
- **F18, refused.** `vite preview` serving stale hashes after a rebuild is Vite behavior, not
  cairn's, and the design loop documents `vite dev`.
- **F10, F11, F12: not folded into the spec,** since each is an engine defect outside theming.
  F12 (the Insert path fusing the closing fence) and F10 (`configure-rendering.md:107`'s
  `::callout` example) are filed under `ROADMAP.md`'s Now. F11 was already filed under Next, as
  item 3 of "Component-system gaps surfaced by the starter set", for the flag glyph only. The fold
  amended that entry with the `snowflake` glyph, the silent `IconSet` doc, and the leanest fix, in
  place of a duplicate.
- **Third-fold note, `DEFAULT_ADMIN_SCOPE`, folded (pass B, rename task).** Verified: the list is
  `src/routes/admin` and `src/lib/admin-toolkit` (`config.ts:32`), read by the three `adminOnly`
  motion rules. It gains `src/lib/admin` only if the plan confirms those rules already pass on the
  engine's admin components, else it stays unchanged and the gap is filed. Also listed under
  "Open for the plan".
- **Third-fold note, the "middle root" comment, folded (pass B, rename task).** Verified: the
  comment at `config.ts:27-31` calls `src/lib/components` the static scope's middle root, though it
  is the last. The rename rewrites it.
- **Proof and acceptance.** The fixture theme gains the heading, pill, and tight-spacing values,
  and `test:theme-fixture` carries the toggle, heading, skip-link, and corner checks. A new Proof
  bullet lists the checks outside the harness. The facts and reference-page lists gain the new
  behaviors and the root export.
