# Verify: AI-agent extension walk findings

Fresh-context verification, 2026-08-26, repo `/home/glw907/Projects/cairn-cms` at `ea4fc45a`,
tree clean. Each finding tested in both directions against the code, `docs/internal/code-idioms.md`,
`docs/internal/engine-rulings.md`, the `record/` docs, `CONTRIBUTING.md`, and the workflows.

**Summary: three of four stand (AGT-01 at a revised tier), one falls.** AGT-02's load-bearing
claim is falsified by the code: every piece of the "missing" read seam is a public, documented
export, and the API it calls a trap is neither exported nor documented.

I confirmed the walk's probe was real and reverted: `scratchpad/fields.ts.bak` is byte-identical
to the current `src/lib/content/fields.ts` (`diff` empty), and `scratchpad/probe.test.ts` is the
truncated leftover of the throwaway test.

---

## AGT-01 — field-type dispatchers all end in a catch-all — **STANDS** (tier: rewrite → **refactor**)

### Confirmed

All four named catch-alls are exactly as described, read directly:

- `src/lib/content/fieldset.ts:287` `default:` — comment "text, textarea, datetime: a trimmed
  non-empty string"; anything not in the switch returns `{ value: text, issues: [] }`.
- `src/lib/content/frontmatter.ts:52` `decodeField` `default:` — "a trimmed non-empty string".
- `src/lib/content/frontmatter.ts:308` trailing `else out[field.name] = value == null ? '' : String(value)`.
- `src/lib/components/FieldInput.svelte:311` `{:else}` — "The plain single-line text input arm".
- Plus `ComponentForm.svelte:131` `inputType` `default: return 'text'`, which the remediation
  already names.

Structural proof, stronger than the walk's empirical one: `grep -rn "never|assertNever|_exhaustive"
src/lib` returns **only prose comments and mapped-type `never`s** (`fieldset.ts:99-105` key
filtering, `preview.ts:151` / `audit/config.ts:102` `: never` return annotations on throwing
helpers). There is no `assertNever`, no `const _: never` tail, and no exhaustive
`Record<FieldDescriptor['type'], …>` anywhere in the library. A sixteenth arm therefore produces
no type error at any production site **by construction**, not merely in one observed run. I did
not need to re-run `svelte-check` to establish this.

The only tripwire is in a test: `src/tests/unit/content-types.test.ts:7` `widgetFor`, a
`default`-less switch whose failure surfaces as "Function lacks ending return statement" — a
message naming neither the union, the new arm, nor any production site. Confirmed by reading.

`registry.ts:234` `ATTRIBUTE_TYPES` is confirmed as the one fail-closed site, with the enumerating
message quoted verbatim in the finding. Confirmed.

### Where I argued against it

- **Is the permissive default a sanctioned decision?** I read all 195 lines of `code-idioms.md`.
  Its E/V/F/M/N/A/L/T/S sections are silent on exhaustiveness and on `default:` arms, and the
  "Deliberately not standardized" list (five items) does not include it. `engine-rulings.md`
  carries nothing sanctioning it either — and in fact **cuts the other way**: ruling at
  `engine-rulings.md:918` keeps `FieldDescriptor` public precisely because "a site writing a
  generic renderer over its own schema switches on it, and **exhaustiveness tells it when the
  engine adds a type**." The repo's own recorded reasoning treats exhaustiveness as the value the
  union exists to deliver. No sanctioning ruling exists; one adjacent ruling supports the finding.
- **Private memory that reads as sanction.** `.claude/agent-memory/cairn-implementer/fielddescriptor-union-add-test-switch.md`
  says "The src/lib + src/lib/delivery sites all have string-falling defaults and **need no arm**;
  the test switch is the only exhaustive one that breaks." That is one agent's working note, not a
  repo ruling, and it is filed where nothing can review it. It documents the trap rather than
  blessing it. It does not defeat the finding.
- **Is the arm count right?** No, mildly. `grep -rn "field\.type|f\.type|item\.type" src/lib -l`
  returns **19** files, not 21. And most of those are single-type *filters*
  (`references.ts` `=== 'reference'`, `media-refs.ts` `!== 'image'`), where a `never` tail is
  neither applicable nor desirable. The real exhaustive-dispatch surface is the five sites the
  finding names plus `coerceToText`. Smaller than implied; unguarded at every one.

### Tier

**Revised rewrite → refactor.** The remediation is additive and mechanical: one exported helper
plus explicit string-leaf arms at five sites. Nothing is restructured. This also matches the
independently-verified sibling finding — `int-verify-core-adapter-content.md` §1
(`field-type-union-unguarded`) is the same defect, verified there and left at `refactor`. AGT-01
should be folded into it rather than carried as a second item; its contribution is the *runtime*
consequence (a `rating` field accepting `'4000 potatoes'`) and the `ComponentForm.svelte` site.

---

## AGT-02 — no public read seam onto cairn's own content — **DOES NOT STAND** (rewrite → **note**)

The finding's central factual claims are false. I checked each against the export barrels, the
`exports` map, and the reference pages.

### Falsified

1. **"`parseManifest` is exported from no subpath."** It is public:
   `src/lib/delivery/data.ts:83` → `export { parseManifest } from '../content/manifest.js';`,
   and `./delivery/data` is a declared subpath in `package.json`'s `exports`. It is documented at
   `docs/reference/delivery-data.md:553` at **Extension API** stability, with a worked example
   that is close to the exact use the finding calls impossible:
   ```ts
   import { parseManifest, type Manifest } from '@glw907/cairn-cms/delivery/data';
   async function readDeployedManifest(): Promise<Manifest> {
     return parseManifest(await fetchManifestFile());
   }
   ```
   The walk read `docs/reference/core.md:823` (which correctly says the root barrel publishes only
   serialize/verify) and concluded the read side is nowhere. It is on the delivery arm.
2. **"`createContentIndex` is documented, exported."** It is **neither**. `grep -rn
   "createContentIndex" docs/reference/` returns nothing, and it appears in no barrel — only
   `src/lib/delivery/site-indexes.ts:11` imports it internally. The public, documented builder is
   `createSiteIndexes` (`delivery-data.md:29`), and its signature takes `globs: SiteGlobs<A>` with
   documentation that says outright "Vite needs the literal glob at the call site, so the engine
   cannot glob on the site's behalf." A build-time glob is transparently the built corpus. The
   "looks exactly right, is silently wrong" trap framing rests on an API surface that does not exist.
3. **"The backend is reached only via the internal `ctx.resolveBackend(event)`."** The whole chain
   is public and documented:
   - `githubApp` is a value export from the root barrel (`src/lib/index.ts:124`).
   - `Backend`, `BackendProvider`, `GithubAppProvider`, `BackendCommit` are exported as types from
     both `.` (`index.ts:125`) and `./sveltekit` (`sveltekit/index.ts:133`), and documented at
     `core.md:1037-1039` at Extension API: `Backend` is "the live, connected content store …
     **read**, commit, and branch operations over files", `BackendProvider` "`connect(env)`s to a
     live `Backend`".
   - `CairnEnv` is exported from both barrels.
   - `Backend` carries `readFile(path, ref)` and `listBranches(prefix)` (`github/backend.ts:30,39`).
   - `manifestPath` is the site's own documented config value (`docs/reference/vite.md:49,67,76`).
   - The pending-branch grammar `cairn/<concept>/<id>` is documented publicly in at least three
     places: `docs/extend/README.md:116`, `docs/extend/architecture.md:110`,
     `docs/reference/sveltekit.md:987`.

   A custom admin screen can therefore write, with public API only:
   `cairn.backend.connect(env).listBranches('cairn/')` plus `.readFile(manifestPath, 'main')` fed
   to `parseManifest`. That is precisely the drafts overview the finding says is unreachable. No
   forged `RequestEvent`, no deep import.

### What survives

Two smaller, real things, neither at rewrite tier:

- `docs/extend/add-a-custom-admin-screen.md` says nothing about reading cairn's own content
  (confirmed: `grep -n "draft"` on that page returns nothing). The pieces are public but
  unassembled and unsignposted from the page a builder lands on. A "Reading cairn's own content"
  section pointing at `backend.connect` + `parseManifest` + the `cairn/` prefix is worth writing.
- The word "draft" carries two senses (frontmatter `draft: true`, per `content-index.ts:106`;
  and an unpublished pending-branch edit, which `ConceptList.svelte` calls "Pending edits"), and
  no published page disambiguates them. A real, cheap docs fix.

`pendingBranch` / `parsePendingBranch` being internal is correct and defensible: they are
four-line string helpers over a grammar already published in prose.

**Verdict: does not stand as written.** The residue is a `note`-tier docs item, not a missing seam.

---

## AGT-03 — the rendered done-gate runs in no CI workflow — **STANDS** (tier: refactor, unchanged)

### Confirmed

- `grep -rn "cairn-audit|rendered" .github/workflows/` returns exactly two prose comments
  (`design.yml:41`, `norms.yml:44`) and **no invocation**. Confirmed.
- `skills/cairn-admin-screens/SKILL.md:85-92` defines the three-step done-gate with step 2
  `npx cairn-audit --rendered`, both themes, against a running dev server. The five rendered
  error-tier rules are listed verbatim at `SKILL.md:30-31`. Confirmed.
- `check:interactive-contrast` and `check:touch-targets` (`package.json:59-60`) appear in no
  workflow; the only other in-repo mentions are CHANGELOG history and the scripts' own headers.
  Confirmed.
- The static-wrapper narrowing is confirmed at the source: `check-invisible-craft.mjs` scopes to
  motion-band/gap-scale/token-colors, `check-admin-css-classes.mjs:24` `RULE_IDS =
  ['no-uncompiled-class']`. `test.yml:69-70` runs those two and nothing else from the audit engine.
- `CONTRIBUTING.md:66-67` says "CI is the authority on what must pass … derive the list from those
  files rather than from prose." Confirmed verbatim.
- `norms.yml` does prove the pattern: it builds the showcase, serves it at :4173, waits on
  `/admin/posts`, and runs a check — everything a rendered-audit job would need.

### Where I argued against it

- **Is the skill even addressed to this repo's CI?** Partly not. `SKILL.md`'s frontmatter scopes
  it to "a screen inside **a cairn site's** /admin", and it reaches an agent only after
  `cairn-doctor --fix` installs it into a consumer's `.claude/skills/`. Its done-gate is an
  author-time gate for a consumer's screen against the author's own dev server. So "the two
  authorities disagree and the agent is pointed at the weaker one" is partly a category error:
  `CONTRIBUTING.md` governs contributing to the engine, the skill governs building in a consumer
  site. **The underlying gap survives the correction**: the engine's own admin screens are held to
  five error-tier rendered rules by nothing, anywhere.
- **Are the two npm targets really "orphaned"?** No — and the finding's word choice is wrong.
  `scripts/checks/check-interactive-contrast.mjs:18-21` records the decision explicitly: "This is
  a LIVE gate: it drives a real browser against a running preview server, so it needs BASE_URL …
  already answering; **it is not part of `npm run check` for that reason**." That is a deliberate
  exclusion from the hot path, not an oversight. `norms.yml:11-15` records the same reasoning for
  itself, then goes on to run a browser render in its own workflow anyway — which is exactly why
  the hot-path rationale does not extend to "no workflow at all." The remediation stands; delete
  the word "orphaned."
- **Sub-count error.** The finding says "four of the nine static error-tier rules run nowhere."
  It is **five**: CI covers no-uncompiled-class, motion-band, gap-scale, token-colors (4 of 9), so
  type-scale, stock-default-hazards, grammar-boundary, focus-parity, and reduced-motion run
  nowhere. Off by one in the finding's favour of understatement.

**Verdict: stands at `refactor`.** Reframe from "the two authorities disagree" to "five error-tier
rendered rules and five error-tier static rules gate nothing in the engine's own CI, and
`norms.yml` already proves the job shape is affordable."

---

## AGT-04 — no discoverable anchor for the field-type fan-out — **STANDS** (tier: refactor, unchanged)

### Confirmed

- **Grep 1 fails as described.** `grep -rn "NumberField" src docs` returns `fields.ts`,
  `index.ts`, `sveltekit/index.ts`, `delivery/data.ts`, `FieldInput.svelte`, three reference pages,
  `api-surface.md`, `engine-rulings.md`, two test files, and four planning docs. It returns
  **neither `fieldset.ts` nor `frontmatter.ts`** — the two silent-degradation sites. Confirmed by
  running it.
- **Grep 2 fails as described, worse than claimed.** `grep -rn "'number'" src/lib` returns 33
  hits, of which **25** (not "roughly 20") contain `typeof`. Signal-to-noise is 8/33.
- **No third path.** `grep -rni "adding a field type|add a field type|new field type"` over
  `CONTRIBUTING.md`, `docs/internal/`, and `docs/extend/` returns nothing. Confirmed.
- **The private-memory claim is confirmed and stronger than stated.**
  `.claude/agent-memory/cairn-implementer/` holds 262 files. Beyond
  `adding-a-doctor-check-fanout.md` (which does carry the per-file checklist quoted, including the
  pinned-count bumps), there is a **field-specific one**:
  `fielddescriptor-union-add-test-switch.md`, whose description reads "Adding a FieldDescriptor
  union member breaks an exhaustive switch in a TEST file **the src-only grep misses**." The repo
  has already discovered this exact navigation failure, written it down, and filed it where no
  cold agent, no other agent type, and no human contributor can read it. The neighbouring files
  `cairnruntime-required-field-fanout.md`, `date-token-permalink-required-field-fanout.md`, and
  `entrysummary-summary-fanout.md` show the same shape recurring across four subsystems.

### Where I argued against it

- **Is a fan-out checklist cairn's job, or would it rot?** `code-idioms.md`'s own header answers:
  "This is a standing pass dimension: a pass that changes an idiom updates this file, the same as
  a reference page." A numbered idiom is a maintained artifact by the repo's own rule, so the rot
  objection does not hold.
- **Is it redundant once AGT-01 lands?** Partly, and the finding says so itself. The compiler will
  name the four code sites. It will not name the three barrel re-exports, the hardcoded cardinal
  "fifteen" in five files (`core.md:389`, `core.md:1083`, `sveltekit.md:1982`,
  `delivery-data.md:668`, `index.ts:55` — I spot-checked; all real), the Types-table cells, the
  `ATTRIBUTE_TYPES` decision, or the six per-type test lists. The docs half is not absorbed.
- **Does `CONTRIBUTING.md`'s repository map cover it?** It maps directories to rules, not
  cross-cutting fan-outs. It does not.

**Verdict: stands at `refactor`.** The strongest single remediation is promoting the two
`*-fanout` memories out of `.claude/agent-memory/` into `CONTRIBUTING.md` or `code-idioms.md`,
since the knowledge is already written and only mis-filed.
