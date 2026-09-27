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
