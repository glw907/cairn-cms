# Internals-C Pass Implementation Plan (audit remediation, slice 7: coherence)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute.js`. Steps use checkbox syntax for tracking.
> **Runs only after internals-B merges** (ratified ordering). Reconcile every anchor
> against post-B `main` at dispatch; the B splits move several files this plan sweeps.
> Round-1 three-lens review folded 2026-09-03; the two findings that reshaped this plan:
> the harness parallelizes TASKS, not steps (so the big sweeps are now split into
> independent tasks), and two "mechanical" sweeps were behavioral (the exit-idiom
> conversion is control flow; the exhaustiveness targets are reachable generic fallbacks).

**Goal:** land the coherence layer the any-site audit proved missing: type-level
exhaustiveness over `FieldDescriptor` without changing any arm's behavior, an enforcing
`check:idioms` gate born green, the `ec-*` → `cairn-*` emitted-class rename, the
`as never` test-cast retirement, truthful module headers, the internals map with the
public/internal boundary marked, and the two reconciliations routed at the internals
close.

**Architecture:** coherence work is sweeps plus one new gate. Each gate rule lands in the
same task as the sweep that makes the tree conform, with a stated self-exclusion for the
gate's own rule literals, so the gate is born green including on itself. Behavioral
surface change is exactly ONE: the `ec-*` class rename (a `Consumers must:` event in the
already-batching window). The csrf reconciliation deliberately changes NO behavior (the
review showed the process-env fallback would break the doctor probe's cross-check, flip
Secure cookies on LAN dev hosts, and invalidate sessions on TLS-terminated deploys — the
shared reader is adopted at platform depth only, with the divergence documented).

**Tech stack:** TypeScript, Svelte 5, `scripts/checks/*` gate estate, vitest.

**Spec:** `docs/internal/record/2026-08-26-any-site-audit/int-coherence.md` (the thirteen,
:70-379), `int-walk-newcomer.md`, the internals-B docket's ratified defaults (3, 4, 5) and
routed-at-close items; anchors verified 2026-09-03 against `ed586ee0` and re-verified at
dispatch against post-B `main`.

**Token ceiling:** 6.5M (13 tasks; re-rated at the fold from 5.5M/10 after the sweep
restructuring). **Checkpoint interval:** every four tasks (checkpoints at 4, 8, 12).
**Execution:** workflow mode; dependencies are explicit per task — `check:idioms` (Task 2)
precedes every task that adds a rule to it (3a, 3b, 6c). **Worktree:**
`.claude/worktrees/internals-c` off post-B `main`, from-scratch showcase `npm ci` before
any e2e.

## Ruled inputs (recorded; no task re-derives them)

- **Exhaustiveness (ratified default 5; mechanism ruled here, honesty from the review):**
  `FieldDescriptor` is a closed 15-arm union (`content/fields.ts:122-137`) originating in
  site config, so exhaustiveness is TYPE-LEVEL. The five dispatch defaults are NOT dead
  ends — each is a reachable generic fallback absorbing the arms the explicit cases skip
  (e.g. `frontmatter.ts:52-56` handles text, textarea, number-as-string, url, email,
  date, datetime; replacing it with a throw is data loss on save). The change is
  therefore enumerate-then-guard: make every absorbed arm an explicit case with its
  current behavior, and only the true remainder hits the guard. Template render paths
  keep a runtime generic fallback (a throw there escapes the `adminAction` wrapper,
  `cairn-admin.ts:189-196`, and bricks the edit screen); their exhaustiveness is
  type-only. `render/registry.ts:234` stays the fail-closed exemplar for INPUT
  validation; these five are dispatchers over already-validated values, a different
  posture, and the ledger row records both.
- **Formatter (ratified default 4, measured):** 2-space dominates (354/381 files); the
  eight tab stragglers are enumerated in Task 2. Enforcement is indentation only;
  Prettier adoption is out of scope (whole-tree rewrap is the opposite of least-churn).
- **`ec-*` (ratified default 3):** rename to `cairn-*`. The namespace REALITY (security
  lens): `cairn-*` is a SHARED namespace — the admin sheet already owns ~60 `cairn-*`
  classes (`cairn-type-*`, `cairn-chip-*`, ...) and `cairn-icon-label` sits one hyphen
  from the new `cairn-icon`. The documented rule is therefore registration, not
  partition: emitted-markup classes are enumerated in `render.md`, admin-sheet classes
  live in the admin design system, and a new name on either side checks the other's
  list. No `[class*=]` selectors exist anywhere, admin re-declarations are
  Svelte-scoped, and the preview iframe is `srcdoc`-sandboxed, so exact-match semantics
  make the shared namespace safe.
- **`as never` (docket sizing):** full retirement — 862 casts / 91 files, minus Task 5's
  five heaviest (263), leaves 599 across 86 files, swept as three independent
  per-directory tasks.
- **Recorded drops from the thirteen's other halves (round-2 triage: docket item 10
  demands the full re-enumeration land or drop, never fade):** (a) the `$app/state`
  plain-object test stub (finding 9's third half) → polish, reopen on a reactivity bug
  traced to the stub; (b) the aggregate gate-list target and the docs corpus declared
  five ways (finding 10) → polish, reopen when the by-name ritual list next drifts from
  `test.yml` (the pass-end lists here and in B are the interim mitigation);
  (c) finding 6's seven hand-maintained lists beyond the one fixed in Task 7 → polish's
  whole-surface read, reopen on the next list-drift defect. The other halves this plan
  DOES take: `unstubGlobals` (Task 5 Step 3), the dead lab script (Task 2 Step 3), the
  `toolkit-*` defectors and unnamed literal (Task 4 Step 2), the audit barrel gap
  (Task 7 Step 3).
- **csrf reconciliation (routed at close; review-ruled):** ONE shared
  `readPublicOrigin` with TWO documented consultation depths. `isDeployedHost` keeps
  the dual read (the tripwire is inert on adapter-node without it); `csrfSecure`
  consumes the shared reader at PLATFORM depth only, preserving: the doctor probe's
  external cross-check invariant (`check-probe.ts:50-58` — the cookie name must derive
  from the probed origin's own scheme, never a separately-resolved PUBLIC_ORIGIN), the
  csrf unit suite's determinism (`csrf.test.ts:135-142` would flip on any machine with
  the var exported), LAN-dev http hosts (a process-env https origin would mint a Secure
  cookie the browser drops — the permanent-403 class `csrf.test.ts:174-177` closed), and
  live sessions on TLS-terminated deploys (the shared `secure` input renames BOTH
  cookies, `auth/crypto.ts:13-27`). The monotonicity fact worth recording: platform-env
  is read first and https requests short-circuit `true`, so no fallback could ever
  DOWNGRADE Secure; the divergence is consultation depth, not direction.

## Global constraints

- `check:surface` unchanged except Task 9's conditional regeneration; no public export
  added or removed except as Task 4 states.
- Sweeps rewrite comments and whitespace, never code behavior; any behavioral step says
  so and is test-first (Task 1 and Task 2 are behavioral by this definition and are
  written that way).
- Gate rules land with their conforming sweep; each new rule states its self-exclusion
  (the gate's own file assembles its rule literals so it cannot match itself, and gate
  fixtures live under `scripts/checks/fixtures/`, outside every rule's scope).
- No comment stating a security invariant is deleted or weakened by any sweep; the named
  must-preserve list rides Task 3a.
- The six CI-only gates BY NAME at pass end: `check:comments`,
  `check:reference:signatures`, `check:surface`, `check:snippets`, `check:transcripts`,
  `check:symbols` — plus the newborn `check:idioms` and `check:cm-internals`.

---

### Task 1: Exhaustiveness — enumerate, then guard (independent)

**Files:**
- Create: `src/lib/content/unreachable.ts` (co-located with the union it guards — not a
  seventh loose root file) + unit test
- Modify: `src/lib/content/frontmatter.ts` (`decodeField` default :52-56;
  `frontmatterFromForm` default :152-155), `src/lib/content/fieldset.ts`
  (`validateField`'s `default:` at **:294-304** — the earlier :253-259 cite was the
  pre-switch coercion), `src/lib/components/FieldInput.svelte` (`{:else}` :312),
  `src/lib/components/ComponentForm.svelte` (dispatch `{:else}` :267), one-line
  deliberate-no-op notes at the four partial sites (`content/references.ts:55-58`,
  `delivery/site-resolver.ts:167-168`, `components/ReferenceField.svelte:38-39`, the
  `required || boolean` carve-outs), `docs/internal/engine-rulings.md` (the ruling row)

**Interfaces:**
- Produces: `unreachable(value: never, context: string): never`.

- [ ] **Step 1 (characterization first):** for each of the five dispatchers, write or
  extend tests covering ALL 15 arms at that site, pinning today's output per arm —
  including every arm the generic default currently absorbs. This is the safety net the
  review demanded; it must be green on HEAD before any dispatcher changes.
- [ ] **Step 2:** rewrite each dispatcher: every absorbed arm becomes an explicit case
  with its current behavior (the compiler enumerates them once the default is removed);
  the `.ts` dispatchers end in `default: unreachable(field, '<site>')`; the two template
  `{:else}` branches KEEP their generic-input rendering as the final explicit arm list's
  fallback and gain type-only exhaustiveness (a `satisfies never` assertion in the
  script block, outside the render path).
- [ ] **Step 3:** the characterization suite passes UNCHANGED post-rewrite (the
  acceptance test of zero behavior change). Then the mutation check: add a scratch
  sixteenth arm locally, confirm `npm run check` fails at all five sites, revert.
- [ ] **Step 4:** ledger row (type-level mechanism, the validated-value posture vs
  registry.ts's input posture, the template-fallback exception) — run
  `check:rulings-format` by name (CI-only, exit-ratcheted, has bitten before);
  partial-site notes; full gate; commit.

**Acceptance criteria:** the characterization tests are byte-stable across the rewrite;
the sixteenth-arm experiment fails closed at all five sites; no runtime throw is
reachable for any real arm; the four partial sites carry their notes.

### Task 2: `check:idioms` born green — indentation, exit idiom, gate identity (independent)

**Files:**
- Create: `scripts/checks/check-idioms.mjs` + tests + fixtures under
  `scripts/checks/fixtures/idioms/`
- Modify: the eight tab-indented files
  (`src/lib/components/{tidy-diff,tidy-validate,tidy-categorize,chrome-guard,editor-tidy}.ts`,
  `src/lib/sveltekit/tidy-prompt.ts`, `src/lib/diagnostics/{conditions,error}.ts`);
  **the 18 files / ~40 sites in `scripts/checks/` calling `process.exit(`** (the earlier
  "twelve" undercounted; grounding lens enumerated); gate self-identity output
  spellings; `.editorconfig` (claim becomes true); `package.json` + CI wiring

**Interfaces:**
- Produces: `check:idioms` with three rules and two distinct scopes (round-2 triage: the
  earlier "both rules share that scope" sentence contradicted itself) — leading-tab
  indentation banned in `src/lib` + `scripts` (`*.ts`/`*.svelte`/`*.mjs`; verified born
  green outside the eight swept files); `process.exit(` banned in **`scripts/checks/*.mjs`
  ONLY** (do not widen into `scripts/lab|build|test/`, five files outside this task's
  inventory); one self-identity spelling per gate under `scripts/checks/`.
  Self-exclusion stated in the gate: its rule literals are assembled
  (`'process.' + 'exit('`), and `scripts/checks/fixtures/` is outside scope.

- [ ] **Step 1 (the conversion is control flow, not an exit code — security lens):**
  enumerate and classify every `process.exit(` site: (a) failure exits →
  `process.exitCode = 1` PLUS a `return`/flow guard wherever the exit was doing
  early-return duty — `check-package-files.mjs:365-405` has SIX such early exits whose
  naive conversion falls through to a final "OK" line, silently disabling the gate that
  holds the tarball's worker/browser export condition; (b) distinct codes preserved —
  `check-readiness.mjs:72` keeps exit code 2 AND gains a flow guard (the next statement
  `await import(distPath)` throws on the just-proven-absent file);
  `reference-coverage.mjs`'s exit 2 likewise; (c) `process.exit(failed ? 1 : 0)`
  ternaries and success short-circuits (`check-admin-prose.mjs:247`,
  `check-cm-internals.mjs:69`, `check-dev-package.mjs:64`, `check-snippets.mjs:434`,
  `check-consumers.mjs:67`, `check-chassis-boundary.mjs:141`) each get the
  flow-preserving form.
- [ ] **Step 2 (proof per converted gate):** for each converted gate, run it once against
  a fixture that makes it FAIL and confirm a red exit code — the acceptance the review
  demanded, since "no `process.exit(` remains" is satisfied perfectly by a silently
  disabled gate.
- [ ] **Step 3:** the indentation sweep (verify `git diff -w` is empty), the identity
  spellings; `.editorconfig` needs NO edit (round-2 verified it already declares
  2-space repo-wide; its claim becomes true by the gate existing — say so in the gate's
  header). Delete the dead `scripts/lab/migrate-allowlist.mjs` (round-2: present,
  unreferenced, and invisible to knip's entry-point treatment of `scripts/**/*.mjs`).
  Write and wire the gate; born green on the real tree. Full gate; commit.

**Acceptance criteria:** every converted gate proven red-on-failure by fixture;
`check-readiness` still distinguishes exit 2; `git diff -w` empty for the indentation
files; `check:idioms` green including over its own file.

### Task 3a: Comment-register purge, half one (depends on Task 2)

**Files:**
- Modify: `src/lib/sveltekit/`, `src/lib/auth*/`, `src/lib/content/`,
  `src/lib/delivery/` comment sites carrying pass-scoped process references,
  `docs/superpowers/` pointers, or consumer-site names (re-enumerate at dispatch; the
  audit counted 179 + 19 + 18 across all of `src/lib`)

**Interfaces:** none new.

- [ ] **Step 1:** enumerate this half's hits. Partition per the ruled scheme: rationale
  survives → reword to the rationale (or a ledger slug); citation-only → delete;
  consumer names → generic descriptions.
  **Must-preserve (security lens): `src/lib/sveltekit/admin-action.ts:6-11`** — it
  matches the purge patterns AND states the CSRF defense-in-depth architecture (the
  guard verifies the double-submit token on every unsafe `/admin/**` POST before any
  route code; the inline check at :236 is defense-in-depth, not the sole gate). The
  reworded comment must preserve the guard's primacy and the DiD framing in substance.
  General rule for the whole purge: no comment stating a security invariant is deleted;
  invariants survive rewording.
- [ ] **Step 2:** sweep; `npm run check:comments` green; full gate; commit.

**Acceptance criteria:** zero purge-pattern hits in this half's directories; every
rewritten comment still true against the code (diff-reviewer verifies a sample);
`admin-action.ts`'s DiD statement intact in substance.

### Task 3b: Comment-register purge, half two, and the register rules (depends on 2 and 3a)

**Files:**
- Modify: the remaining `src/lib` directories (`components/`, `audit/`, `render/`,
  `media*/`, `doctor/`, `log/`, root files); `scripts/checks/check-idioms.mjs`

**Interfaces:**
- Produces: three register rules in `check:idioms`, scoped to `src/lib` comments (kept in
  this gate, not the ESLint plugin, deliberately: ESLint does not parse `.svelte`, and
  the register must hold uniformly across `.ts` and `.svelte` — the leaner-home question
  the review raised, answered in the gate's header): ban `docs/superpowers/` paths; ban
  the pass-scoped process-reference patterns; ban consumer-site hostnames **by shape**
  (a bare production hostname literal in a comment), NOT by enumerating the private
  hostnames into a public repo's gate file (security lens).

- [ ] **Step 1:** sweep this half under the same partition and must-preserve rules.
- [ ] **Step 2:** land the three rules (fixtures under `scripts/checks/fixtures/idioms/`);
  born green; full gate; commit.

**Acceptance criteria:** zero purge-pattern hits across all of `src/lib`; the hostname
rule matches by shape with no private hostname in the rule data; gate green.

### Task 4: `ec-*` → `cairn-*` (depends on Tasks 1 and 3b; the pass's one consumer-facing change)

**Files:**
- Modify: `src/lib/render/glyph.ts`, `src/lib/render/rehype-dispatch.ts` (emission),
  `src/lib/components/ComponentInsertDialog.svelte:486`, `IconPicker.svelte:107`,
  `MediaPicker.svelte:274` (scoped re-declarations), `docs/reference/render.md`,
  **`examples/showcase/src/chassis/prose.css`** (the exact chassis path — this is a
  CHASSIS change, the seed every theme copy descends from, gated by
  `check:chassis-boundary` and read by `check-public-tokens.mjs`), the e2e locator,
  `src/tests/unit/__snapshots__/render-pipeline-snapshot.test.ts.snap` (regenerated),
  `src/tests/unit/render-rehype-dispatch.test.ts` (10 hits),
  `src/tests/unit/render-glyph.test.ts` (2), `render-pipeline-snapshot.test.ts` (1),
  `src/tests/component/ComponentInsertDialog.test.ts` (keys on the classes),
  **`templates/waymark/src/chassis/prose.css` via `npm run emit:template`** (round-2
  triage: the baked template is generated wholesale from the showcase and carries 14
  `ec-*` hits; `check:template` runs in CI and fails on divergence — re-emit, never
  hand-edit), `CHANGELOG.md`, `docs/extend/migration-notes.md`,
  `docs/internal/engine-rulings.md` (appended annotations on `audit-render-iconspan`
  :3905-3916 and `audit-render-headrow` :3918-3929 — round-2 triage: these are OPEN
  rulings whose execution is owned by the CHASSIS pass, not history rows; the annotation
  states the class vocabulary those helpers bake was renamed here, so the chassis
  re-homing re-teaches `cairn-*` names)

**Interfaces:**
- Produces: emitted classes `cairn-head`, `cairn-icon`, `cairn-icon-secondary`,
  `cairn-glyph`, `cairn-grid`. `render.md` documents the full emitted list and the
  REGISTRATION rule from the header ruling (shared `cairn-*` namespace, two registered
  sides), explicitly noting `cairn-icon-label` is an admin-sheet neighbor, not an
  emitted class.

- [ ] **Step 1:** failing render tests asserting the new names; rename at the emission
  sites and scoped re-declarations; snapshot regenerated; green.
- [ ] **Step 2:** chassis selectors, the template re-emit, e2e locator, the three render
  test files; docs (`render.md`, CHANGELOG with the `Consumers must:` line naming the
  five exact old → new selectors AND the chassis propagation path — the four production
  sites carry `ec-*` in their own chassis copies and queue the rename in their own
  passes; migration-notes; ledger annotations). **Also fold the namespace-registration
  stragglers finding 11 of the audit names** (`int-coherence.md:343-347`): the two
  `toolkit-*` defectors and the ten-site unnamed class literal get registered or renamed
  per the same registration rule this task documents. Full gate including
  `check:chassis-boundary`, `check:public-tokens`, `check:template`, and
  `check:rulings-format` by name; commit.

**Acceptance criteria:** `grep -rEn '\bec-(icon|icon-secondary|glyph|head|grid)\b'` over
the tree — `templates/` included, post-re-emit — (excluding `docs/internal/history`,
`docs/internal/record`, `docs/superpowers`, and the annotated ledger rows) returns
nothing; showcase CI visual suite and `check:template` green; the namespace rule as
documented matches the ruled registration form.

**Dependencies (round-2 triage: the "independent" labels hid three file contentions):**
Task 4 runs AFTER Task 1 (both append to `engine-rulings.md`) and AFTER Task 3b (which
sweeps `components/`, where Task 4 edits three files); Task 7 runs AFTER Task 4 (Task 7
headers the ten `render/*.ts` files Task 4 edits two of).

### Task 5: The typed test-event builder (independent)

**Files:**
- Create: **`src/tests/helpers/test-event.ts`** exporting **`testEvent`** (path and name
  pinned; Task 6 consumes them verbatim) + its unit test
- Modify: the five heaviest cast files (`component/CairnMediaLibrary.test.ts` 73,
  `unit/cairn-admin-actions.test.ts` 51, `integration/content-routes-revert.test.ts` 50,
  `unit/content-routes-edit.test.ts` 47, `integration/content-routes-preview.test.ts` 42)

**Interfaces:**
- Produces: `testEvent(overrides?)` returning a real `CairnEvent`-shaped value (params,
  locals, platform.env, request, cookies) with typed partial overrides — no `as never`,
  no `any`. Its doc comment states the erasure hazard it replaces.

- [ ] **Step 1:** inventory the five files' cast shapes; build + test the builder.
- [ ] **Step 2:** convert the five files (263 casts); suites green with assertions
  unweakened (diff-reviewer checks deleted casts took no assertions with them).
- [ ] **Step 3 (the test-infra rider round-2 surfaced from audit finding 9's other
  half):** enable `unstubGlobals: true` in the vitest config (87 `vi.stubGlobal` sites
  currently pair with `vi.restoreAllMocks`, which does NOT restore globals — a live
  cross-test leakage hazard); run the full suite and fix any test that was silently
  depending on a leaked stub. Test-first in the sense that the config flip IS the test:
  a suite green under `unstubGlobals` proves the leakage is gone. Full gate; commit.

**Acceptance criteria:** zero `as never` in the five files; suite counts unchanged or
higher; builder name/path exactly as pinned.

### Tasks 6a / 6b / 6c: The `as never` retirement, three independent sweeps (each depends on Task 5; 6c also on Task 2)

**Files:** 6a: `src/tests/unit/` remainder. 6b: `src/tests/integration/` remainder.
6c: `src/tests/component/` remainder + `scripts/checks/check-idioms.mjs` (the rule).

**Interfaces:** consume `testEvent` verbatim.

- [ ] **Step 1 (each):** sweep the directory's files, each conversion running its own
  file's suite.
- [ ] **Step 2 (6c only, last to land):** repo-wide zero confirmed; the gate rule bans
  `as never` under `src/tests` with a per-line escape hatch
  (`// idioms-allow: as-never — <reason>`) for deliberate negative-path tests that feed
  a runtime guard an off-union value (hygiene lens: an absolute-zero grep leaves no room
  for exactly the tests Task 1 writes); born green. Full gate per task; commit each.

**Acceptance criteria:** `grep -rn "as never" src/tests` returns only annotated lines
(target: zero unannotated); suite counts monotonically non-decreasing; the three tasks'
file sets are disjoint by directory.

### Task 7: Truthful headers and self-licensing duplication comments (depends on 3a/3b AND Task 4)

**Files:**
- Modify: the ~12 contradicted headers (int-coherence.md :163-182; `admin-icons.ts`
  exemplar), the 10 headerless `render/*.ts` files (M1 headers written from the post-B
  code), the 34 duplication-precedent comments (:107-120), the `logCommitFailed`
  call-style unification (post-B home of the old `content-routes-core.ts:1672`/`:2249`
  sites; verified safe — `ctx.logCommitFailed` is a bare re-export of the module
  function, `content-routes-context.ts:420` → `commit-log.ts:33` — preserve `:1672`'s
  third argument `'publish.failed'`, which selects the event name)

- [ ] **Step 1:** re-enumerate both lists against the post-B tree; lying headers become
  true (fix the header, not the code; a header mismatch revealing a real defect goes to
  the conductor, never a silent fix).
- [ ] **Step 2:** duplication comments: ruled exception → cite the slug; unruled and
  one-import-line collapsible → collapse; otherwise reword to the actual tradeoff.
  Unify `logCommitFailed` onto the module-import style.
- [ ] **Step 3:** `render/`'s ten M1 headers. One barrel-truth fix rides here (round-2,
  from audit finding 6's list drift): `audit/index.ts` is missing the
  `splitSelectorList` export that `audit/sheet.ts:513` declares — add it and its
  reference row (`check:reference` will demand the doc). Full gate; commit.

**Acceptance criteria:** every touched header states something the code does; no comment
cites a sibling copy as sole license; `render/` fully headered; the `'publish.failed'`
argument intact; the audit barrel matches its modules' exports.

### Task 8: The internals map and the boundary signal (independent of 1-7; after B)

**Files:**
- Create: **`docs/internal/src-lib-map.md`** (NOT `src/lib/README.md` — `svelte-package`
  copies non-source `src/lib` files into `dist`, so a contributor map would ship in the
  public tarball; hygiene lens caught this and `check:package` would not)
- Modify: `CONTRIBUTING.md` and the repo `README.md` dev section (pointers), the four
  docs disagreeing on `cairn.config.ts`'s location (the scaffold's `src/theme/` is
  truth), `docs/internal/docs-friction-log.md` if writing surfaces friction

- [ ] **Step 1:** write the map to the walk's ten asks: the ~23 `src/lib` directories
  mapped to subsystems with the public/internal split MARKED per directory (derived from
  `package.json`'s real export map, not asserted); the request flow traced
  (`cairn-admin.ts` → `admin-dispatch.ts` → `guard.ts` → `content-routes.ts`); the five
  loose root files placed (now six with `dev-flag.ts`; explain each); the post-B
  `content-routes-*` sibling pattern; `/render` definition vs re-export homes;
  "where would I add a field type" answered by Task 1's now-enforced dispatcher list.
- [ ] **Step 2:** the config-location fix in all four docs; `check:docs` green; register
  review; full gate; commit.

**Acceptance criteria:** the walk's six orienting questions answerable from the map
without grep; all four docs agree on `src/theme/cairn.config.ts`; the boundary marking
matches the export map mechanically; nothing new ships under `src/lib`.

### Task 9: The two routed reconciliations (independent)

**Files:**
- Modify: `src/lib/dev-flag.ts:58` (**`readPublicOrigin` already exists with the dual
  read — the change is exporting it**, grounding lens), `src/lib/sveltekit/csrf.ts:34,
  63-75`, `scripts/checks/check-surface-leaks.mjs:233-244`
- Test: csrf unit suite (new cases), check-surface-leaks unit suite

**Interfaces:**
- Produces: `readPublicOrigin(platformEnv: unknown): string | undefined` exported (real
  signature; the dual read stays as-is for `isDeployedHost`). `csrfSecure` consumes the
  shared reader **at platform depth only, via an explicit
  `depth: 'platform-only'` option on the reader** — round-2 triage struck the
  empty-object-floor form: `readPublicOrigin` falls through to `process.env`
  UNCONDITIONALLY when the platform read yields nothing (`dev-flag.ts:58-67`), so an
  empty-object argument suppresses nothing; only the option form is structural. NO
  behavior change (the header's ruled input carries the four reasons: probe invariant,
  suite determinism, LAN-dev cookies, session invalidation). Both functions' docs record
  the two depths and the monotonicity fact (platform-first + https short-circuit ⇒ no
  fallback can downgrade Secure). **One line lands in the docs and the docket close-out:
  the consultation-depth divergence PERSISTS BY DESIGN; retirement trigger: `csrfSecure`
  starts running on adapter-node in a production site** (the routed item's substance
  stays open and visible rather than retiring as "reconciled").
- The F-1 `/components` skip (`check-surface-leaks.mjs:233-244`): derive the subpath's
  type-export list mechanically from the components barrel + dist declarations so the
  enumerated-exports premise is gate-verified; if the two-model structure genuinely
  cannot reach it, record WHY with the concrete blocked shape AND record the accepted
  limitation explicitly (component-prop-only types stay invisible to the leak gate —
  security lens: an accepted limitation, stated as one, not as a comment fix). The
  routing pointer was corrected to internals-C by B Task 14.

- [ ] **Step 1:** csrf tests FIRST, environment-stubbed (`vi.stubEnv('PUBLIC_ORIGIN')`
  around every case so the suite is deterministic regardless of the runner's shell):
  platform-set behavior unchanged; platform-unset + process-set does NOT flip
  `csrfSecure` (the depth suppression pinned); https short-circuit unchanged. Land the
  export and the platform-depth consumption; the existing suite green UNCHANGED (now a
  true criterion).
- [ ] **Step 2:** the leak-model derivation or its recorded limitation; gate suite
  green; snapshot regenerated only if moved. Full gate; commit.

**Acceptance criteria:** one shared reader; `csrfSecure`'s observable behavior identical
on every input (suite-proven, env-stubbed); the doctor probe untouched and its
cross-check test (`doctor-check-probe.test.ts:118`) unchanged; the `/components` premise
either gate-verified or recorded as an accepted limitation.

### Task 10: Exemplar drift, the monolith line, records (last)

**Files:**
- Modify: the `createSectionAction` docs (verify the call-site count — the audit
  measured zero non-test callers; reposition or demote per what the docs claim TODAY,
  and route the showcase half to chassis inputs either way), `ROADMAP.md`
  (`content-routes-media.ts` at **1,447** lines recorded as the remaining tracked
  monolith; shipped coherence items leave the tiers), the chassis-inputs record

- [ ] **Step 1:** the `createSectionAction` verification and doc fix; chassis routing.
- [ ] **Step 2:** ROADMAP; full gate; commit.

**Acceptance criteria:** docs teach the sanctioned shape; ROADMAP's monolith accounting
matches the tree; chassis inputs carry the showcase half.

---

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier; reviewer fan-out — `svelte-reviewer` (Task 1's template arms, Task 4's
components), `web-auth-security-reviewer` (Task 9 AND Task 3a's must-preserve sweep —
mandatory), the standing cleanliness-and-beauty review, `daisyui-a11y-reviewer` only if
Task 4 touched rendered semantics (it must not); the six CI-only gates BY NAME
(`check:comments`, `check:reference:signatures`, `check:surface`, `check:snippets`,
`check:transcripts`, `check:symbols`) plus `check:idioms`, `check:cm-internals`,
`check:chassis-boundary`, `check:public-tokens`; from-scratch consumer proof (Task 4's
rename is what the e2e must see); whole-log friction triage; STATUS/HISTORY/ROADMAP;
post-mortem here; both budgets scored.

## What this pass hands forward

- **Chassis:** the showcase exemplar realization; the standing chassis mandate in full;
  the four consumer sites' chassis-copy `ec-*` renames ride their own site passes.
- **Polish:** unchanged list plus whatever the sweeps surface.
- **Release:** the window holds; ONE cut after polish, carrying this pass's
  `Consumers must:` line (`ec-*`) and internals' `formatTimestamp` line.
