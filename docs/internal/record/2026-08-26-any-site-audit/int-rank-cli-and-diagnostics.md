# Internals audit: CLI and diagnostics (`audit/`, `doctor/`, `media-seed/`, `vite/`, `diagnostics/`, `log/`, `cloudflare/`)

Auditor: cli-and-diagnostics internals auditor. Repo `/home/glw907/Projects/cairn-cms`, `main` at
`0406f1d5`. 74 files, 12,433 lines. Every file in the assigned list was read; the load-bearing ones
(`audit/rendered.ts`, `audit/markup.ts`, `audit/sheet.ts`, `audit/norms.ts`, the whole `doctor/`
tree, `vite/internal.ts`, `cloudflare/turnstile.ts`) were read in full.

## State of the area

This is the strongest-engineered corner of the engine and the one furthest from the Svelte/Kit idiom
bar, because almost none of it touches Svelte: the only framework surface is the `cairnManifest` Vite
plugin, which is correct and well-reasoned, and the `log`/`diagnostics` chokepoint, which is
disciplined. Judged on its own terms the area grades a **B+**: the substrates (`markup.ts`,
`sheet.ts`, `css-scope.ts`, `color.ts`, `norms.ts`) are genuinely excellent, purity is respected,
every side effect is injected, and the fail-loud stance is real rather than claimed. What holds it
back is that its two largest arms each carry a **half-finished convergence**. The rendered-rule
family declared a shared in-page helper contract, converted eleven of fourteen rules, and left three
carrying the private unescaped copies the contract exists to abolish; the doctor declared a runner
that catches throws, and left eleven per-check `try/catch` blocks that re-implement it verbatim. In
both cases the *documented* rule and the *shipped* code disagree, which is the single worst thing
for an AI agent extending this area: reading three neighbouring rules teaches three different
answers. Comprehension is the second drag. Comment density in the rendered rules runs 50-60% of
non-blank lines, and a large fraction of that mass is litigation history keyed to plan-task numbers
(`Task 16b`, `design ratchet Task 5`, `decision 9`) a newcomer cannot resolve to anything. Nothing
here is wrongly shaped enough to rewrite except `rendered.ts`, which is a 1,015-line file holding
six concerns the static half already splits into four modules.

---

## 1. The shared page-helper contract is optional, so three rules bypass it and eleven wrap it in a dead fallback under three different names

**Tier: refactor. Limb: multiple (idiom, comprehension, agent-extensibility).**

`rendered.ts` states the contract and why it exists:

```
src/lib/audit/rendered.ts:717-726
 * The measurement helpers every rendered rule shares, installed on the page rather than closed
 * over. A function handed to `page.evaluate` is serialized by source and cannot reference anything
 * outside its own body, which is why five rules each grew their own copy of "is this visible" and
 * "name this element"; the copies then drifted, and an adversarial pass demonstrated the drift as
 * shipped defects (an `sr-only` heading counted as a rendered heading, an unescaped Tailwind class
 * signature that no `querySelectorAll` could parse). Installing one implementation on `window` and
 * calling it from inside each rule's own evaluate keeps the definition single without reintroducing
 * the closure the serializer forbids.
```

Three of the fourteen registered rules never converted. `viewport-overflow` carries its own
**unescaped** signature builder and its own visibility test, and never calls `ensurePageHelpers`:

```
src/lib/audit/rules/rendered/viewport-overflow.ts:53-57
  function signature(el: Element): string {
    const cls =
      typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  }
```

```
src/lib/audit/rules/rendered/one-filled-action.ts:76-80
  function selectorFor(el: Element): string {
    const id = el.id ? `#${el.id}` : '';
    const classes = Array.from(el.classList).slice(0, 3).join('.');
    return `${el.tagName.toLowerCase()}${id}${classes ? `.${classes}` : ''}`;
  }
```

```
src/lib/audit/rules/rendered/focus-renders.ts:90-91,111
  const idPart = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList).slice(0, 3).join('.');
    selector: `${el.tagName.toLowerCase()}${idPart}${classes ? `.${classes}` : ''}`,
```

This is not cosmetic. The shared `signature` escapes identifiers precisely because Tailwind class
syntax is not a legal CSS identifier (`rendered.ts:727-733`), and the engine has a whole finding
type for the consequence:

```
src/lib/audit/rendered.ts:243-253  (unprobeableFinding)
 *   `the rendered allowlist names ${entry.selector} on ${entry.page}, but the browser refused to parse it `
 *   `as a CSS selector, so neither a match nor a staleness verdict is possible.`
```

So an allowlist entry written from a `viewport-overflow`, `one-filled-action`, or `focus-renders`
finding on any element carrying `lg:ml-56` or `max-w-[30%]` is unprobeable **by construction** —
the same defect class the escape was added to close, still reachable through three rules.

The eleven converted rules are inconsistent in the other direction. Every one repeats a defensive
fallback that cannot fire, since each awaits `ensurePageHelpers` first, and if it *did* fire it
would silently substitute a different, drifted implementation:

```
src/lib/audit/rules/rendered/weight-budget.ts:230-232
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isVisible = (el: Element) => (helpers ? helpers.isVisible(el) : true);

src/lib/audit/rules/rendered/screen-anatomy.ts:100-102
  const helpers = globalThis.__cairnAudit;
  const isRendered = (el: Element) => (helpers ? helpers.isVisible(el) : true);
  const selectorFor = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());

src/lib/audit/rules/rendered/relational-spacing.ts:147-149
  const helpers = globalThis.__cairnAudit;
  const signature = (el: Element) => (helpers ? helpers.signature(el) : el.tagName.toLowerCase());
  const isPainted = (el: Element) => (helpers ? helpers.isVisible(el) : true);
```

Twenty such ternaries across eleven files, and **one helper carries three local names**
(`isVisible` / `isRendered` / `isPainted`; `signature` / `selectorFor`). An agent grepping
`isVisible` in `rules/rendered/` finds a third of the call sites.

**Remediation.** Make the helper the only way. Convert the three holdouts to
`await ensurePageHelpers(ctx.page)` plus `globalThis.__cairnAudit`. Delete every `helpers ? … : …`
fallback and read the global directly (it is guaranteed installed by the awaited call; if that is
felt to be unsafe, throw rather than substitute a drifted implementation — silent substitution is
the fail-open this engine exists to refuse). Fix the local name per helper to `signature` and
`isVisible`. Then make it a gate: a `check:` script (or a unit test over the rules directory)
asserting no file under `rules/rendered/` declares its own `function signature`/`isVisible` and
that every rule's `check` awaits `ensurePageHelpers`. Converting this watch into a failing test is
what stops the convergence going half-done a second time.

---

## 2. `rendered.ts` is a 1,015-line grab-bag with no counterpart to the static half's module split

**Tier: rewrite (of the file layout; the code inside is sound). Limb: comprehension.**

The static half of the audit engine splits its concerns cleanly: `types.ts` (rule model, 69 lines),
`run.ts` (runner, 94), `suppress.ts` (suppression, 257), `color.ts` (arithmetic, 231),
`rules/static/index.ts` (registry, 28). The rendered half puts the same six concerns in one file,
and its header defends this on grounds that no longer hold:

```
src/lib/audit/rendered.ts:1-7
// cairn-audit's rendered runner: drive a real browser against a running admin, both themes always,
// and turn what rules find into the same AuditReport shape the static runner produces. This module
// owns the whole rendered contract, since it is the one file the harness is scoped to: the rule
// model, the Playwright surface a rule reads from, the BASE_URL and Playwright-presence checks, the
// interaction-state seam, the page+selector+reason allowlist with its staleness check, and the
// post-hydration page-identity guard...
```

"the one file the harness is scoped to" is a statement about the pass that built it, not about the
shape a reader needs. Concretely the file holds: the rendered rule model and every Playwright
structural type (23-144); five allowlist-hygiene finding builders and the pure resolver
(178-490); BASE_URL and Playwright loading (492-580); the page-identity guard (323-426); the
in-page helper install and the canvas color normalizer (626-857); and `runRendered` itself
(869-1015), whose body nests seven levels (`for pages → for themes → try → for states → try →
for rules → try`).

The asymmetry costs an agent directly. Every rule imports its *types* from `../../rendered.js`,
which is the runner; there is no `rendered/types.ts` to match `types.ts`. Two functions named
`byPosition` exist with different semantics:

```
src/lib/audit/run.ts:60-62
function byPosition(a: Finding, b: Finding): number {
  return a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file);
}

src/lib/audit/rendered.ts:1005
  const byPosition = (a: Finding, b: Finding) => (a.file === b.file ? 0 : a.file.localeCompare(b.file));
```

**Remediation.** Split into `rendered/types.ts` (the rule model plus the Playwright structural
types), `rendered/allowlist.ts` (`resolveRenderedFindings` and its five finding builders, already
pure and already separately tested), `rendered/page-helpers.ts` (`installPageHelpers`,
`ensurePageHelpers`, `resolveColors`, `probeSelectors`, `capturePageIdentity`,
`waitForHydrationSettle`), and `rendered/run.ts` (`runRendered`, `resolveBaseUrl`,
`resolveExtraCookies`, `applyState`). Keep `rendered.ts` as a re-export shim only if the rules'
import paths are not updated in the same pass; prefer updating them. Hoist the one `byPosition` to
a shared spot and give the rendered variant its own name if it must differ.

---

## 3. The doctor re-implements its own runner's error contract eleven times, and its D1 preamble three times

**Tier: refactor. Limb: idiom.**

The runner's contract is explicit:

```
src/lib/doctor/run.ts:1-2, 19-23
// The doctor's runner: every check executes, every result lands in the table. A throwing check
// records a fail and the run continues, so one broken probe never hides the rest of the picture.
    try {
      result = await check.run(ctx);
    } catch (err) {
      result = fail(err instanceof Error ? err.message : String(err));
    }
```

Eleven check bodies wrap themselves in a `try/catch` producing the byte-identical result:

```
src/lib/doctor/checks-cloudflare.ts:110, 130, 180, 243, 278, 304
src/lib/doctor/checks-local.ts:128, 163
src/lib/doctor/checks-github.ts:62
src/lib/doctor/check-probe.ts:37
src/lib/doctor/check-send.ts:42
      return fail(err instanceof Error ? err.message : String(err));
```

(`checks-github.ts:45`, which prefixes `App authentication failed:`, and `check-skill.ts:128`,
which converts to a *skip* rather than a fail, are legitimately different and stay.)

The three D1 checks additionally repeat an identical five-line preamble and an identical skip
string, while the module already has shared skip constants for its other credentials
(`NO_TOKEN`, `NO_FROM`, `NO_ACCOUNT` in `cloudflare-api.ts:10-18`):

```
src/lib/doctor/checks-cloudflare.ts:214-218 (authStore), 262-266 (roleVocabulary), 288-292 (emailNormalization)
    if (!ctx.cfToken || !ctx.cfAccountId) return NO_ACCOUNT;
    const facts = await readWranglerConfig(ctx.readFile);
    if (typeof facts?.authDbId !== 'string') {
      return skip('no AUTH_DB database_id in wrangler.jsonc or wrangler.toml');
    }
```

`code-idioms.md`'s "Deliberately not standardized" list excuses "bespoke skip messages … where the
message is input-specific"; this one is not input-specific, it is three copies of one sentence.

Nine call sites re-read and re-parse the wrangler config from disk per run
(`grep -c 'readWranglerConfig(ctx.readFile)' src/lib/doctor/*.ts` → 9), each paying a fresh
`stripJsonc` character walk for facts that cannot change mid-run.

**Remediation.** Delete the eleven bare `try/catch` wrappers and let `runDoctor` own the contract
(its doc comment already claims it). Add `const NO_AUTH_DB: CheckResult` beside `NO_ACCOUNT` in
`cloudflare-api.ts`, and a small `resolveAuthDb(ctx): Promise<CheckOutcome<string>>` helper that the
three D1 checks call, using the existing `CheckOutcome<T>` generic `types.ts:22` already defines for
exactly this. Memoize `readWranglerConfig` per context (a `WeakMap<DoctorContext, Promise<…>>`, or
resolve the facts once in the bin and hang them on `DoctorContext`).

---

## 4. `checks-local.ts` is misnamed and its header no longer describes it, and the check-module naming is forked

**Tier: refactor. Limb: comprehension.**

The header enumerates five checks; the module exports nine, and the three it omits are the three a
reader is least likely to guess live there:

```
src/lib/doctor/checks-local.ts:1-3
// The doctor's local-config checks: the wrangler bindings, the observability sink, the
// svelte.config CSRF handoff, the site-config validation, and the public origin. Every read
// goes through the injected ctx.readFile, so the tests pass fixtures and the bin passes node:fs.
```

Unlisted: `configMediaBucket` (33), `configTidyKey` (223), `adminMountShape` (300), `roleWiring`
(354). Worse, "Every read goes through the injected `ctx.readFile`" is false of the module as it
stands: the "local-config" module makes a live outbound network call to a third-party API.

```
src/lib/doctor/checks-local.ts:204-208
async function probeAnthropicKey(fetchImpl: typeof fetch, apiKey: string): Promise<'valid' | 'invalid' | 'unknown'> {
  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
```

The tree's own filing convention is network-by-provider: `checks-cloudflare.ts`, `checks-github.ts`,
`check-posture.ts`, `check-probe.ts`, `check-send.ts`. A live Anthropic probe in `checks-local.ts`
means an agent asked to "add the second live key check" has no correct place to put it and the
grep for outbound calls misses one.

The module naming itself is forked with no rule written down: plural `checks-*.ts` for multi-check
modules (`checks-local`, `checks-cloudflare`, `checks-github`), singular `check-*.ts` for
one-check modules (`check-floors`, `check-posture`, `check-probe`, `check-send`, `check-skill`).
The convention is consistent but undiscoverable, so adding a second check to `check-floors.ts`
implies a file rename an agent will not anticipate.

**Remediation.** Move `configTidyKey` and `probeAnthropicKey` into their own `check-tidy-key.ts`
(singular, one check, live network), matching `check-send.ts`. Rewrite the `checks-local.ts` header
to enumerate what it actually holds, or split `roleWiring`/`adminMountShape` into
`checks-wiring.ts` if the module is still overfull. Record the plural/singular rule in
`code-idioms.md` under Modules (M2) so the rename trigger is visible.

---

## 5. Three color-family rendered rules hand-roll the same flatten-resolve-cursor arithmetic

**Tier: refactor. Limb: idiom.**

Every rule that measures color flattens each candidate's layer colors into one array, calls
`resolveColors` once, then walks a manual cursor to slice the results back apart. Three rules, three
slightly different spellings of the same fragile index arithmetic:

```
src/lib/audit/rules/rendered/border-contrast.ts:420-428
    let cursor = 0;
    const take = (count: number) => resolved.slice(cursor, (cursor += count));
    for (const candidate of candidates) {
      const canvas = take(1)[0] ?? OPAQUE_WHITE;
      const sideColors = take(candidate.sides.length);
      const outerColors = candidate.sides.map((side) => take(side.outer.length));
      const innerColors = take(candidate.inner.length);

src/lib/audit/rules/rendered/interactive-contrast.ts:238-242
    let cursor = 1;
    for (const candidate of candidates) {
      const fg = resolved[cursor];
      const layerColors = resolved.slice(cursor + 1, cursor + 1 + candidate.layers.length);
      cursor += 1 + candidate.layers.length;

src/lib/audit/rules/rendered/chip-ground-collision.ts:284-287
    let cursor = 1;
    for (const candidate of reading.chips) {
      const colors = resolved.slice(cursor, cursor + candidate.layers.length);
      cursor += candidate.layers.length;
```

The "canvas leads the batch, bail with an indeterminate finding if it did not resolve" block is
also near-verbatim in two of them (`interactive-contrast.ts:226-235`,
`chip-ground-collision.ts:272-281`), down to the message template `the page canvas color could not
be read (…), so no <thing> on this page has a known backdrop to resolve against`.

One inconsistency rides along: two rules hardcode their tier in the finding literal
(`tier: 'error'`, `tier: 'advisory'`) while a third reads it back off its own rule object:

```
src/lib/audit/rules/rendered/chip-ground-collision.ts:330
        tier: chipGroundCollision.tier,
```

**Remediation.** Add one helper beside `resolveColors` (in the new `rendered/page-helpers.ts` from
finding 2), shaped `resolveCandidateColors(page, candidates, pick)` returning per-candidate
resolved arrays plus the canvas, so no rule holds an index. Extract the canvas-unreadable
indeterminate finding into `color.ts` next to `indeterminateFinding`. Pick one spelling for the
tier in a finding literal.

---

## 6. Permanent comments are keyed to pass-scoped identifiers a reader cannot resolve

**Tier: refactor. Limb: comprehension, agent-extensibility.**

37 comment sites across the area cite a plan task, ruling, or pass number as the authority for a
design decision, without a path a reader can open:

```
src/lib/audit/rules/rendered/touch-targets.ts:13
// The floor is 24x24, not 44x44, by Geoff's ruling (Task 16b, ruling 1). Spec 6.3 originally set

src/lib/audit/rules/rendered/chip-ground-collision.ts:245
 * DEMOTED TO ADVISORY (Task 3, ruling 3, corpus C, Geoff 2026-07-28): the formula produced 24 false

src/lib/audit/rules/rendered/container-inset-asymmetry.ts:1
// cairn-audit's container-inset-asymmetry rule: the phantom-gutter detector (design ratchet Task 5,

src/lib/doctor/checks-local.ts:30
// fails on a missing media binding (decision 9). This conditional runs only when the adapter

src/lib/doctor/checks-local.ts:199
// The zero-token key-health probe (save-500-honest-errors, Task 5), a raw fetch against the models

src/lib/audit/types.ts:45-47
   * Standalone CSS files `config.staticCssFiles` names, outside any component. Optional: Task 7's
   * markup-family rules never read it, so their fixture contexts stay unchanged; the CSS-family
   * rules (Task 9b) default it to an empty list when a caller omits it.

src/lib/diagnostics/error.ts:3
// throw-site is Pass 2 (the email send mapping); Pass 1 lands and tests the primitive.

src/lib/vite/internal.ts:11
// cairn-manifest bin uses to regenerate. See the design spec, locked decision 1.
```

"Task 16b", "decision 9", "Task 9b", "Pass 1" name nothing reachable from the tree. The good form
exists in the same area and shows what is wanted:

```
src/lib/audit/norms.ts:280
      'docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md (Ruling 2, Task 16b): …'
```

`diagnostics/error.ts:3` is worse than unresolvable, it is stale: it describes work as forthcoming
("Pass 1 lands and tests the primitive") that landed long ago.

**Remediation.** Each of these is one of three things and each has a different fix. If the reason is
durable, state the reason and delete the reference (`the floor is 24x24, WCAG 2.2 SC 2.5.8's AA
bar`). If the record matters, cite it the way `norms.ts:280` does, with a repo-relative path. If it
is a status note about a pass in flight, delete it (`error.ts:3`). Worth a mechanical sweep: grep
`Task [0-9]`, `Pass [0-9]`, `decision [0-9]`, `ruling [0-9]` over `src/lib` and resolve each hit,
then add the rule to `code-idioms.md` under Modules (a comment cites a path or states the reason,
never a bare task number).

---

## 7. The audit's internal barrel is a hand-maintained 60-symbol god export, and the engine offers no seam for the thing four gates actually do

**Tier: refactor. Limb: agent-extensibility.**

`audit/index.ts` re-exports roughly sixty symbols across nine modules, including internals like
`lineAt`, `negatedClassNames`, `composite`, and `relativeLuminance`, for a subsystem with no public
package subpath. `code-idioms.md` M2 says "Barrels exist only at public subpath entries and stay
re-export-only". Nothing inside `audit/` imports it (`bin.ts` alone does); its real consumers are
four `.mjs` gate scripts loading `dist/audit/index.js`. Because the list is maintained by hand it
is already incomplete:

```
src/lib/audit/sheet.ts:494  export function splitSelectorList(selector: string): string[]
src/lib/audit/index.ts:32   export { negatedClassNames, parseSheet, selectorClassNames } from './sheet.js';
```

`splitSelectorList` is exported from `sheet.ts` and consumed by two rules, and the barrel does not
carry it — an omission nothing detects.

The missing seam is more consequential. What every live gate wants is "run these rule ids against
these pages and give me a report", and the engine has no such entry, so each gate re-derives it:

```
scripts/checks/check-touch-targets.mjs:57-70   ≡   scripts/checks/check-interactive-contrast.mjs:38-51
    const { DEFAULT_BASE_URL, exitCodeFor, formatReport, renderedRules, resolveConfig, runRendered } = await import(
      '../../dist/audit/index.js'
    );
    const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
    const rule = renderedRules().find((candidate) => candidate.id === RULE_ID);
    if (!rule) throw new Error(`the packaged engine registers no ${RULE_ID} rule`);
    const pages = await resolvePages(baseUrl, ['/styleguide']);
    const config = resolveConfig(ROOT, { rendered: { pages, allowlist: ALLOWLIST } }, () => true);
    const report = await runRendered(config, [rule]);
```

Two byte-identical driver bodies, and `check-invisible-craft.mjs:56-74` is the static analogue with
its own `scopeReport` filter. Each gate that pins a rule id also hand-writes the
"the packaged engine registers no X rule" guard the engine should own.

**Remediation.** Give `audit/` a small named entry — `runRuleIds(config, ids)` for rendered and a
matching id filter for static — that resolves ids against the registries, throws the missing-rule
error once, and returns an `AuditReport`. Rewrite the four gate scripts against it. Then narrow
`index.ts` to that entry plus what the bin and the gates genuinely need, and make the rest reachable
only by relative path the way the rules already reach `../../sheet.js`. If the wide barrel must stay
for the tests, a unit test asserting the barrel re-exports every public symbol of its nine modules
turns the hand-maintenance into a gate.

---

## 8. `wrangler-config.ts` carries two parallel readers with two duplicated TOML mini-parsers, and it lives in the wrong module

**Tier: refactor. Limb: cleanliness.**

`readWranglerConfig` and `readR2Buckets` each open the same two files in the same order, and each
dispatches to its own jsonc and toml parser. The two TOML scanners are structurally identical:

```
src/lib/doctor/wrangler-config.ts:104 (r2EntriesFromToml)   vs   :229 (factsFromToml)
    const header = line.match(/^\s*(\[\[?[\w.]+\]?\])\s*(?:#.*)?$/);
src/lib/doctor/wrangler-config.ts:110                        vs   :236
    const kv = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
src/lib/doctor/wrangler-config.ts:113                        vs   :239
    const str = value.match(/^["'](.*)["']/)?.[1];
```

Both also carry their own `flush` closure over the `[[r2_buckets]]` section
(`:97-101` and `:223-226`), so the bucket rows are scanned twice by two implementations that must
be kept in step by hand.

The module is also filed under `doctor/` while being a shared CLI substrate: `media-seed` reaches
across for it.

```
src/lib/media-seed/bin.ts:12
import { readR2Buckets } from '../doctor/wrangler-config.js';
```

`media-seed` is not a doctor tool; the wrangler reader is not a doctor concept.

**Remediation.** Parse the wrangler config once into a single facts object that carries the R2
entries with their `bucket_name` (drop `WranglerFacts.r2Buckets: string[]` in favour of
`R2BucketEntry[]`, deriving the binding-name list at the one call site that wants it), so one
jsonc parser and one toml scanner serve both readers. Move the module out of `doctor/` to a shared
CLI home (`src/lib/wrangler/config.ts`) and repoint the doctor and media-seed imports; `doctor/`
should not be a dependency of an unrelated bin.

---

## 9. Comment mass in the rendered rules has outgrown the code, and most of the excess is adversarial-pass history

**Tier: note. Limb: comprehension.**

Measured over non-blank lines, comment share in the rule family:

```
60%  197/330  src/lib/audit/rules/rendered/touch-targets.ts
56%  243/431  src/lib/audit/rules/rendered/weight-budget.ts
52%  279/540  src/lib/audit/rules/rendered/border-contrast.ts
52%  167/322  src/lib/audit/rules/rendered/chip-ground-collision.ts
44%  175/399  src/lib/audit/rules/rendered/relational-spacing.ts
```

`border-contrast.ts` opens with 69 comment lines before its first `import`; `touch-targets.ts` with
102. Much of that is genuinely load-bearing rationale and should stay. A large share is not: it is
the record of how the decision was reached, which belongs in `docs/internal/record/`.

```
src/lib/audit/rules/rendered/border-contrast.ts:41-50
// A BORDER SEPARATES TWO SURFACES, and both are measured. The first cut measured one, the element's
// DOM PARENT chain, on the evidence that this reading reproduces the two ratified numbers. It does
// reproduce them, but only because a card's parent chain HAPPENS to be what its border is adjacent
// to. An adversarial pass measured the rendered pixels either side of 124 bordered elements per
// theme on the shipped admin and found 21 whose rule ground was not the surface painted beside the
// border at all, six of them flipping the verdict: …
```

The same shape recurs at `touch-targets.ts:86-102` ("the first build had it exactly backwards,
which an adversarial pass demonstrated three ways") and `color.ts:145-156`, whose `resolveGround`
doc comment runs forty lines and ends by describing a repair that is "Filed in ROADMAP".

The TSDoc standard this repo enforces asks for the contract and the why. A newcomer opening
`border-contrast.ts` to add a rule must read 69 lines of litigation before reaching an import, and
an agent given a context budget will truncate the file before reaching the code.

**Remediation.** Split each rule header in two: keep the contract, the floors, the named exceptions,
and the invariants a future editor must not break; move the "first cut did X, an adversarial pass
measured Y" narrative to a `docs/internal/record/` page per rule family, linked by path from the
header. Target roughly a 25-line header. `resolveGround`'s doc comment (`color.ts:135-172`) is the
same job on a function.

---

## 10. Four bins, two exit idioms and three hand-rolled argv parsers

**Tier: note. Limb: idiom, agent-extensibility.**

Three of the four bins state and follow one rule; the fourth breaks it silently:

```
src/lib/doctor/bin.ts:5-7
// stderr with exit 2; a failed check exits 1; a clean or all-skip run exits 0. The codes go
// through process.exitCode, never process.exit, so a piped stdout flushes the whole report
// before the process ends.

src/lib/audit/bin.ts:6-7
// error-tier finding exits 1; a clean run exits 0. The codes go through process.exitCode, never
// process.exit, so a piped stdout flushes the whole report first.
```

```
src/lib/vite/bin.ts:7-10
writeManifest(process.cwd()).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

`vite/bin.ts` uses `process.exit(1)` — the exact call the two siblings document as wrong, with the
stated reason (a piped stdout may not flush) — and it is also the area's only `.then`-family chain,
against `code-idioms.md` A1 ("async/await only; no `.then` chains"); `doctor/bin.ts:88` and
`media-seed/bin.ts:100` both end with `await main()`.

Separately, three bins each carry their own argv parser with three different structures and three
`USAGE` constants (`doctor/assemble.ts:51-86` with a `FLAGS` lookup table plus two special cases;
`media-seed/assemble.ts:22-51` with an inline flag triple; `audit/config.ts:213-243` with a
subcommand prefix). All three implement the same `value === undefined || value.startsWith('--')`
guard independently.

**Remediation.** Rewrite `vite/bin.ts` as `async function main()` + `await main()` with
`process.exitCode = 1`, matching its siblings. Factor the shared argv primitives (the
needs-a-value guard, the unknown-flag error with a usage line) into one small internal helper the
three parsers call, leaving each bin's flag vocabulary its own; record the bin shape in
`code-idioms.md` M2, which currently names `doctor/bin.ts` as the exemplar without stating the
`process.exitCode` rule.

---

## 11. `diagnostics/` is still tab-indented against M4 and the committed `.editorconfig`, and module headers are prefixed three ways

**Tier: note. Limb: cleanliness.**

`code-idioms.md` M4 states the rule and the `.editorconfig` records it:

```
docs/internal/code-idioms.md (M4)
- **M4.** Indentation is 2-space everywhere; the tab-indented `doctor/` tree and its test
  cluster converge, and an `.editorconfig` records it.

.editorconfig
indent_style = space
indent_size = 2
```

The doctor tree converged. `diagnostics/` did not — it is the only tab-indented code left in this
area:

```
$ grep -lP '^\t' <all 74 files in scope>
src/lib/diagnostics/conditions.ts
src/lib/diagnostics/error.ts
```

Module headers follow three different prefixes with no rule distinguishing them: `// cairn-cms:`
(the M1 form, used by `cloudflare/*`, `vite/*`), `// cairn-audit's …` / `// cairn-doctor's …` (the
subsystem-possessive form), and a bare `// The doctor's …` / `// The cairn condition registry …`.
`doctor/` alone uses two of the three (`check-skill.ts:1` "cairn-doctor:" vs `checks-local.ts:1`
"The doctor's"). No formatter is configured in the repo (no prettier config, no `format` script), so
formatting drifts by subtree: trailing commas before a closing paren appear only in `cloudflare/`
and `vite/` (7 sites), nowhere else.

**Remediation.** Re-indent the two `diagnostics/` files to spaces (mechanical, and the
`.editorconfig` already says so). Pick one header prefix and state it in M1 — the subsystem
possessive reads best for the CLI arms and matches the majority — then sweep the `doctor/`
outliers. Consider adding Prettier with a checked-in config and a `check:format` gate; without one,
every agent editing this tree invents its own answer.

---

## 12. `console.warn` in a non-bin `src/lib` module, against E7

**Tier: note. Limb: idiom.**

```
docs/internal/code-idioms.md (E7)
- **E7. No bare `console.*` in `src/lib`.** … Scripts and bins print freely.
```

```
src/lib/vite/internal.ts:236-242
  } catch {
    console.warn(
      'cairn-manifest: the committed manifest could not be read, so publish stamps were not carried forward.',
    );
    return builtSerialized;
  }
```

`internal.ts` is not a bin: it is the module the `cairnManifest` plugin ships from, so this line
executes inside a consumer's Vite build. Every other print in the area sits in a `bin.ts`
(`audit/bin.ts`, `doctor/bin.ts`, `media-seed/bin.ts`, `vite/bin.ts`) or in the `log/` chokepoint.

**Remediation.** Either return the warning to the caller (`carryPublishStamps` is pure otherwise,
and `writeManifest` is the one place that can print), or, since the plugin path has a Rollup context
available, surface it through `this.warn` in `buildStart`. Then note the bin-only exemption's exact
boundary in E7 so `internal.ts`-shaped modules are unambiguous.

---

## 13. The doctor's central result type is an anonymous structural tuple repeated at three sites

**Tier: note. Limb: comprehension.**

```
src/lib/doctor/run.ts:11-15
export async function runDoctor(
  checks: DoctorCheck[],
  ctx: DoctorContext
): Promise<{ results: { check: DoctorCheck; result: CheckResult }[]; failed: number }> {
  const results: { check: DoctorCheck; result: CheckResult }[] = [];

src/lib/doctor/report.ts:20
export function formatReport(results: { check: DoctorCheck; result: CheckResult }[]): string {
```

`types.ts` names `CheckResult`, `CheckOutcome`, `DoctorCheck`, and `DoctorContext` — every other
concept in the model — but the pairing a completed run produces, the thing the report renders and
the bin's exit code reads, has no name. Every test that builds a fixture run must spell the shape
out again.

**Remediation.** Add `export interface CheckRun { check: DoctorCheck; result: CheckResult }` and
`export interface DoctorRun { results: CheckRun[]; failed: number }` to `types.ts`, and use them in
`run.ts` and `report.ts`. Small, but it is the one named-model gap in an otherwise exemplary type
module.
