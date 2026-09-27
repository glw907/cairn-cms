# Theme identity pass B spec: consistency review

**Target:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` (main, `4365ac34`).
**Lens:** consistency with the ratified record: the theme identity spec, the pass A plan
(`theme-identity-a`), `engine-rulings.md`, the charter, `public-design-system.md`, the chassis
README, the repo `CLAUDE.md`, and ROADMAP's "One public theme" entry. I spot-checked each citation
and factual claim against the tree.
**Reviewer:** Opus 5.5, high effort, read-only except this file.

## Summary

Chain 1 restates the parent spec faithfully. Its scope, advisory tier, recipe source, sync test,
and probe all match the parent's "G2" and "Pass B" text. Chain 2 checks out on most facts. The
`./admin-sources.css` export exists. All five sites' `src/chassis/tokens.css` lack both the
focus-ring set and `--cairn-caption-tracking`. `prose.css` reads the three radii and `--border`
with no fallback. `check-public-tokens.mjs` matches only literal `oklch(` and uses culori. No file
uses relative color syntax.

The consistency problems are in chain 2, where it meets the release model, the charter, the
rulings, and the audit's existing scopes. One is a blocker. The template would go live on merge
importing a subpath that no published version has.

| # | Severity | Short name |
|---|---|---|
| 1 | blocker | The template goes live on merge importing an unpublished subpath |
| 2 | major | No charter premise check, and three rulings point the other way |
| 3 | major, OWNER FORK | Public-scope rules promoted to error gate a site's own public design |
| 4 | major | The public scope's `src/lib/components` root is already in the admin static scope |
| 5 | major | `public-literals` overlaps the shipped `token-colors` rule and its `paletteFiles` seam |
| 6 | major | The "new public surface" promise has no gate; `check:reference` does not cover CSS subpaths |
| 7 | major | `cairn-eyebrow` has no settled home and contradicts the chassis `cairn-*` namespace rule |
| 8 | major | The shipped audit gains undeclared runtime dependencies (culori, daisyUI's theme object) |
| 9 | minor | Three documents the pass makes wrong are missing from "Documentation and records" |
| 10 | minor | `theme-contrast` resolves colors with a parser, against the audit's recorded method |
| 11 | minor | "Every default reproduces today's value" is false for the ink defaults |
| 12 | minor | `--flow-space` breaks the spec's own naming rule |
| 13 | minor | The draft-docs resume trigger is wrong under the named split |
| 14 | minor | The evidence reports are not committed, and the eyebrow count does not reproduce |
| 15 | minor | Chain 2 has shared files the Delivery section does not name |
| 16 | minor | The `cairn-implementer` definition lives in the dotfiles repo |
| 17 | minor | The `Consumers must:` line describes an optional swap |
| 18 | minor | "Sections 1 to 4" names sections the document does not number |

## Findings

### 1. blocker: the template goes live on merge importing an unpublished subpath

- **Location:** spec `:79-86` (the chassis imports the engine defaults), `:185-186` (re-emit to
  `templates/waymark`), `:213-214` (no publish).
- **Defect:** chain 2 changes the chassis `tokens.css` to import the new subpath, and
  `emit:template` bakes that change into `templates/waymark`. The parent spec's Release section
  says "The starter half goes live on merge: the Deploy button and the setup command read
  `templates/waymark` from `main`" (`2026-09-26-theme-identity-design.md:583-584`). The template
  depends on `"@glw907/cairn-cms": "^0.97.0"` (`templates/waymark/package.json:23`). The emit
  script sets that range from the engine's own version (`emit-template-dir.mjs:136`), and
  `npm view` reports `0.97.0` as the latest published version. No published version exports the
  new subpath. Between pass B's merge and the next cut, every newly scaffolded or Deploy-button
  site fails its first CSS build. Pass A's starter change carries CSS values only, so it has no
  such problem.
- **Proposed fold:** name the ordering in Delivery and Release. Options:
  - (a) Cut the release at pass B's merge. This is `CLAUDE.md` release trigger 1, since the
    template is a consumer that needs the change now.
  - (b) Hold the chassis import swap in a follow-up that lands with the cut. The showcase would
    import the engine defaults while the template keeps the copied file. `check:template`'s
    byte identity forbids that split unless the bake gains a substitution.
  - (c) Merge pass B only at the cut.

  Recommend (a) or (c). Either way the spec states which, since "no publish" and "goes live on
  merge" cannot both hold for this change.

### 2. major: no charter premise check, and three rulings point the other way

- **Location:** spec `:75-89` ("Why the defaults move into the engine").
- **Defect:** the charter says "Public output stays design-agnostic, each site brings its own
  `render`" (`what-cairn-is-and-is-not.md`, "What cairn commits to"). It also requires "the
  premise check ... runs before the correctness checks, on every spec." The ledger has moved
  public-side vocabulary out of the engine and into the chassis several times:
  - `copy-to-clipboard-control`: "a chassis recipe at most, never an engine export."
  - `site-today-export`: declined because "an npm export solves [discoverability] no better than
    the chassis carrying it once". It reopens on "evidence an export fixes the discoverability
    failure better than the chassis copy does."
  - `audit-render-headrow`, `-cardshell`, and `-iconspan`: re-homed to the chassis under the
    "site-owned code over the versioned engine API" model.

  Chain 2 moves the other way, making public design defaults an engine export. The stale-copy
  evidence (five of five sites missing keys) is exactly the reopen evidence `site-today-export`
  names, so the move is defensible. The spec never makes that argument or cites these entries.
- **Proposed fold:** add a short premise paragraph. It argues that the defaults are the value
  half of a contract the engine already owns: the `.cairn-tok-*` class contract, the directive
  classes, and the tokens `prose.css` reads. It cites the stale-copy evidence as the reopen
  condition for these rulings. The close then records a new `engine-rulings.md` entry (accept)
  with its own "Reopens on" line, and `check:rulings-format` stays green.

### 3. major, OWNER FORK: public-scope rules promoted to error gate a site's own public design

- **Location:** spec `:116-141`, especially `:138-139` ("promotion to error at the next minor").
- **Defect:** the charter justifies shipping `cairn-audit` whole because "all 28 registered rules
  audit the `/admin` surface, and a consumer's admin IS cairn's admin toolkit." `config.ts:27-31`
  keeps motion rules off a site's shared components on the same grounds: reading that root
  "would gate a site's own public design." A public scope over `src/routes` and `src/theme`, at
  error tier, polices the developer's own domain. That covers a one-off literal in an
  illustration's `style=` or an arbitrary `text-[#abc]` on a marketing page. The spec's principle
  ("a floor, never a ceiling") applies to the theme contract. It does not cover forbidding
  literals in a developer's own markup, which is a ceiling on that markup.
- **Options:**
  - (a) Public-scope rules stay advisory permanently. `theme-conformance` and `theme-contrast`
    alone are promoted, since they protect cairn's own parts (prose, directives, code ramp).
  - (b) Promote all three as drafted, and amend the charter's `cairn-audit` bullet to say the
    audit now also covers the public theme contract.
  - (c) Make the public scope opt-in through config.
- **Recommendation:** (a), plus a one-line charter amendment for the new public scope. Whichever
  is chosen, the charter bullet's "all 28 rules audit `/admin`" rationale needs an update in the
  same pass.

### 4. major: the public scope's `src/lib/components` root is already in the admin static scope

- **Location:** spec `:116-119`.
- **Defect:** `DEFAULT_STATIC_SCOPE` is `['src/routes/admin', 'src/lib/admin-toolkit',
  'src/lib/components']` (`src/lib/audit/config.ts:15-19`). Its comment says the middle root is
  "where a consuming site keeps its shared public components" (`:27-30`). Every non-`adminOnly`
  static rule already runs there, including `type-scale` (admin `--cairn-type-*` grammar),
  `gap-scale`, `grammar-boundary`, and `token-colors`. So a site's public component that
  correctly uses `text-step-1` or `gap-m` is already exposed to admin grammar rules. Adding the
  same root to a public scope means one file answers to two contradictory grammars. In cairn's
  own tree, `src/lib/components` is the admin component directory, so "the engine's public
  component directories" (`:118`) resolves to nothing public (finding 7 in part). The engine
  ships no public visual component today. Its only non-admin `.svelte` files are `CairnHead` and
  the reproductions.
- **Proposed fold:** the spec states the scope partition. Either `src/lib/components` leaves
  `DEFAULT_STATIC_SCOPE` (a consumer-visible default change that needs a changelog line), or the
  admin-grammar rules become `adminOnly`. It also names what "the engine's public component
  directories" are, or drops the clause.

### 5. major: `public-literals` overlaps the shipped `token-colors` rule and its `paletteFiles` seam

- **Location:** spec `:121-127`, `:139-141` ("There is one implementation of each check").
- **Defect:** `token-colors` (`src/lib/audit/rules/static/token-colors.ts`) already flags a CSS
  declaration spelling a color as hex, `rgb()`, a named color, or a pure achromatic. It exempts
  declared palette files through `static.paletteFiles` (`config.ts:40-51`, `:222`), which "a
  site names its own theme file" to use. `public-literals` restates the literal check and invents
  a second exemption (`src/theme/**/*.css`, custom-property values only). That conflicts with the
  spec's own "one implementation of each check," and the idiom lens asks where the spec invents
  what the stack already has.
- **Proposed fold:** build `public-literals` as a public-scope extension of `token-colors`'s
  literal detection, adding chromatic `oklch(` and absolute font sizes. Reuse `paletteFiles` as
  the exemption mechanism, narrowed to custom-property values if that narrowing is wanted. Or
  state why a separate rule is required.

### 6. major: the "new public surface" promise has no gate; `check:reference` does not cover CSS subpaths

- **Location:** spec `:88-89`, `:145-148` ("`check:reference` gates it").
- **Defect:** `reference-coverage.mjs` enumerates exports from the built `.d.ts` files, and no
  script besides `check-symbols-allowlist.mjs` names `admin-sources.css`. The existing CSS subpath
  has no page of its own. `docs/reference/README.md:66` links it to a section of `cairn-audit.md`.
  So `check:reference` cannot gate a CSS key list. The charter says "Machine-checkable boundaries
  live in gates, not prose" and names the `check:surface` snapshot as the holder of the seam
  promise. Under the draft, renaming a `theme-tokens.css` key would pass every gate. That breaks
  the disclosure the spec promises at `:88-89`.
- **Proposed fold:** add a gate. Either `check:surface` snapshots the subpath's key list, or a
  test asserts that the reference page lists every key in `theme-tokens.css` with its default and
  fails on drift in either direction. Reword `:148` to name that gate.

### 7. major: `cairn-eyebrow` has no settled home and contradicts the chassis `cairn-*` namespace rule

- **Location:** spec `:105-112`, `:145-147`, `:181-182`.
- **Defect:** `:107` says "The chassis gains one class." The chassis is site-owned, copied code
  (chassis README, "Subtracting an element"). Yet `:146-147` documents the class on the engine
  subpath's reference page, and `:181-182` files a facts bullet for it as a public behavior. If
  the class lives in the copied chassis, it freezes exactly as `:76-79` says copied defaults do,
  and the engine reference cannot promise it. The chassis README's namespace rule also says
  `cairn-*` is "a class the engine or a chassis file defines and a theme only ever colors through
  tokens, never restyles the structure of." The draft instead says "A theme restyles the class
  like any other rule" (`:109-110`).
- **Proposed fold:** decide the home. The engine's `theme-tokens.css` makes the class an engine
  export, so the file name should be reconsidered. The chassis keeps it off the reference page and
  out of facts. Then amend the README namespace rule, or restate `:109-110` to fit it. The same
  question applies, less sharply, to `@utility cairn-focus-ring` and the `pre.shiki` and
  `.cairn-tok-*` bindings. The spec moves their tokens to the engine but is silent on the rules
  that read them.

### 8. major: the shipped audit gains undeclared runtime dependencies

- **Location:** spec `:62-63`, `:128-136`.
- **Defect:** `culori` is a devDependency only, and no file under `src/lib/audit` imports culori
  or daisyUI today. Moving `theme-contrast` into the shipped `cairn-audit` bin makes culori a
  runtime dependency. `theme-conformance` reads the key list "from daisyUI's own theme object,
  the same source pass A's completeness test uses." That test runs in cairn's dev tree, and
  `daisyui` is also only a devDependency. In a consumer the audit would resolve the consumer's
  daisyUI, which the package does not declare. The workstation policy treats a brand-new
  dependency as a design question for the pass that needs it.
- **Proposed fold:** add both to "Open for the plan" as design calls, or decide them here. For
  culori: a runtime dependency, or bundled into `dist`. For the daisyUI key list: resolved from
  the consumer's `daisyui` with a declared peer range, or snapshotted at build time as generated
  data with a sync test.

### 9. minor: three documents the pass makes wrong are missing from "Documentation and records"

- **Location:** spec `:179-186`.
- **Defect:** three documents describe the model the pass replaces, and the spec lists none of
  them:
  - `examples/showcase/src/chassis/README.md`: the `tokens.css` row, "The token system"
    paragraph (defaults read "a DaisyUI role directly"), and the namespace rule.
  - `docs/internal/public-design-system.md`: the load-bearing rule "Re-skinning a status hue means
    retuning BOTH the fill ... AND the matching `--cairn-<status>-ink`."
  - `docs/extend/design-your-site.md:22-47`: "Every design-scale key `tokens.css` declares ...
    carries a generic default," the ink-retune warning, and "Neither ships in a scaffolded site's
    own `package.json`."

  Under the `CLAUDE.md` freeze rule, a deficiency on a frozen narrative page is fixed on the page
  in the same pass and lands as a facts bullet. The re-emitted template also carries the chassis
  `tokens.css` change, not only the `theme.css` header (`:185-186`).
- **Proposed fold:** add these three to the close's list (or to chain 2's last task), and widen
  the re-emit sentence.

### 10. minor: `theme-contrast` resolves colors with a parser, against the audit's recorded method

- **Location:** spec `:133-136`.
- **Defect:** the ledger's keep on the error-tier rendered rules
  (`audit-cli-one-filled-action-focus-renders-interactive-contrast-viewpor`) rests on
  canvas-readback "since 'a parser is the one component in this pipeline guaranteed to be wrong
  about a real value'." The draft extends a static parser to `var()` chains and `color-mix`.
- **Proposed fold:** one sentence explaining why static resolution is sound here: a
  token-to-token resolution over theme files, with no cascade or computed style. Or name a
  rendered check of the public `/styleguide` as the backstop.

### 11. minor: "Every default reproduces today's value" is false for the ink defaults

- **Location:** spec `:160-161` against `:93-99`.
- **Defect:** today's chassis ink defaults are `var(--color-<status>)` (`tokens.css:123-126`).
  The draft changes them to `color-mix(...)`. The Waymark render still holds, because Waymark
  hand-sets all four inks in both schemes (`theme.css:267-270`, `:309-312`, `:332-335`), but the
  sentence as written is untrue.
- **Proposed fold:** "Every default reproduces today's value except the four ink defaults, which
  Waymark overrides."

### 12. minor: `--flow-space` breaks the spec's own naming rule

- **Location:** spec `:67-73`.
- **Defect:** `:72-73` says "`--cairn-*` for cairn's roles," with no aliases. `--flow-space` sits
  in the `:root` roles list at `:68-69` without the prefix.
- **Proposed fold:** name it as the one grandfathered exception, or classify it with the
  `@theme` scale.

### 13. minor: the draft-docs resume trigger is wrong under the named split

- **Location:** spec `:203-205` against `:210-211`.
- **Defect:** ROADMAP (`:883-887`) sequences the public theme before draft docs resume. If the
  80% split makes chain 2 pass C, "Draft documentation resumes after pass B merges" would resume
  docs before the contract settles. Pass A's decision 12 reading ("after pass B merges, which
  completes the whole theme identity initiative") has the same gap.
- **Proposed fold:** "resumes after the public theme contract merges (pass B, or pass C under
  the split)."

### 14. minor: the evidence reports are not committed, and the eyebrow count does not reproduce

- **Location:** spec `:14-16`, `:108-109`.
- **Defect:** the harvest and chassis-inventory reports cited as evidence are not under
  `docs/superpowers/research/`. The ecosystem survey and pass A's spike are. The stale-copy claim
  reproduces. The claim "eight hand-set eyebrow instances across three sites, most bypassing the
  existing token" does not reproduce from a plain grep:
  - All five sites use `tracking-eyebrow` or `var(--tracking-eyebrow)`, about 25 uses in all,
    with aksailingclub-org alone at 10.
  - Literal uppercase tracking appears in at least ecxc-ski, 907-life, and cairn-pub.

  The count may be right under a definition the report holds, but the spec gives no definition.
- **Proposed fold:** commit both reports beside the survey and cite their paths, or state the
  count's definition.

### 15. minor: chain 2 has shared files the Delivery section does not name

- **Location:** spec `:199-201`.
- **Defect:** the draft names the audit rule registry as the one file both chains touch. Chain 2
  also adds `skills/cairn-extend/references/public-theme.md`, which needs an index line in
  `skills/cairn-extend/SKILL.md`. That index is the only route by which an agent finds the file.
  Chain 1 edits the same skill's `daisyui-first.md` and likely `SKILL.md`. Both chains also
  change `check:package`'s skill budget, and both likely touch `src/lib/audit/config.ts` (the
  public scope) and the fixture tree.
- **Proposed fold:** list `SKILL.md` and `config.ts` as shared, with one owner each, or move
  their edits to the close.

### 16. minor: the `cairn-implementer` definition lives in the dotfiles repo

- **Location:** spec `:154-156`.
- **Defect:** `~/.claude/agents/cairn-implementer.md` resolves to
  `~/.dotfiles/claude/.claude/agents/cairn-implementer.md`, outside this repo. Unlike
  `claude/agents/cairn-extension-reviewer.md`, it does not ship. The pass's diff review and gate
  cannot see that edit.
- **Proposed fold:** name the dotfiles commit as a close step, verified by
  `claude-tooling-sync verify`.

### 17. minor: the `Consumers must:` line describes an optional swap

- **Location:** spec `:183-184`.
- **Defect:** by `:88-89`, adding keys is not breaking. A site that keeps its copied `tokens.css`
  keeps rendering, so the swap is optional. `Consumers must:` lists required steps. The
  finding 1 fold may change this: if the template imports the engine subpath, the required step
  is the version bump.
- **Proposed fold:** "Consumers must: nothing." Put the swap in migration notes as a recommended
  step, with the reason (new engine keys reach the site).

### 18. minor: "Sections 1 to 4" names sections the document does not number

- **Location:** spec `:3`.
- **Defect:** the document's sections are unnumbered, so "Sections 1 to 4 were approved" does not
  say which parts carry approval.
- **Proposed fold:** name the approved headings.

## Checked and consistent

- Chain 1 (`:46-52`) against the parent's G2 (`:390-424`) and the "Pass B" bullet (`:568-570`),
  including the advisory tier, the recipe source, the norms print, the sync test, and the probe.
- The dependency on pass A's segment D and merge. It matches pass A's `:1016` (the fixture as
  pass B's input) and task 11's `theme.css` edits.
- Release batching with pass A. It is consistent with pass A decision 11 (`0.98.0` minor), apart
  from the ordering problem in finding 1.
- ROADMAP "One public theme" (`:866-887`): all three gaps are addressed, and the sequencing
  matches.
- Every cited file and export exists: the `./admin-sources.css` export (`package.json`), the
  `test:reskin` import of the contrast core, the `check-public-tokens.mjs` parser shape, the
  unguarded radius and `--border` reads in `prose.css`, and the `color-mix` use across the
  chassis.
