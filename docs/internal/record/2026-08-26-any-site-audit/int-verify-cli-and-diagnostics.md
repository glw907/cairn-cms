# Verify pass: cli-and-diagnostics internals findings

Fresh-context verifier, 2026-08-26. Repo `/home/glw907/Projects/cairn-cms`, `main`. Source of the
findings: `int-rank-cli-and-diagnostics.md` (not authored by this verifier). Each finding was tested
in both directions against the code, `docs/internal/code-idioms.md`, `docs/internal/engine-rulings.md`,
and `docs/reference/cairn-audit.md`.

---

## cli-01 — page-helper contract is optional — **STANDS**, tier **refactor** (unchanged)

### Confirmed by measurement

- 14 rules under `src/lib/audit/rules/rendered/` (excluding `index.ts`). Eleven call
  `ensurePageHelpers`; three do not: `viewport-overflow.ts`, `one-filled-action.ts`,
  `focus-renders.ts`. Verified by `grep -rn "ensurePageHelpers" src/lib/audit/rules/rendered/`.
- The three holdouts each build a private, **unescaped** selector:
  - `viewport-overflow.ts:53-57` — `el.className` string split, no id, no escape.
  - `one-filled-action.ts:76-80` — three classes, no escape.
  - `focus-renders.ts:90-91,111` — three classes, no escape.
- `grep -rn "helpers ?" src/lib/audit/rules/rendered/ | wc -l` → **20**, across exactly the eleven
  converted rules. Local names confirmed forked three ways for one helper:
  `signature` / `selectorFor` / `sel`, and `isVisible` / `isRendered` / `isPainted`.

### The finding is *stronger* than ranked: it violates a published contract

`docs/reference/cairn-audit.md:299-301` states the allowlist contract to consumers:

> The `selector` is the signature a rule reports a finding under: a tag, then its id if it carries
> one, then up to four of its classes, **each escaped so a Tailwind class such as `lg:ml-56` stays a
> valid CSS selector**.

All three holdouts break that sentence — unescaped, and two of them cap at three classes, and
`viewport-overflow` emits no id at all. The engine ships a whole finding type for the consequence
(`unprobeableFinding`, `rendered.ts:243`), and `rendered-allowlist-unprobeable` is a documented row
in the reference table (`cairn-audit.md:315`). So an allowlist entry copied from any of the three
rules' output on a Tailwind-variant class is unprobeable by construction. This is a documented-contract
defect, not a style preference.

### Arguments against the finding, tested and rejected

- *"The ternary is required by TypeScript."* `globalThis.__cairnAudit` is typed
  `CairnAuditPageHelpers | undefined` (`rendered.ts:748-750`), so a guard is needed — but a non-null
  assertion or a throw satisfies the compiler equally. The chosen form silently substitutes a
  drifted implementation, which is the fail-open the engine refuses elsewhere.
- *"The fallback might fire."* It cannot. `runRendered` itself calls `await ensurePageHelpers(page)`
  at `rendered.ts:934`, before the allowlist probe and before any rule runs, and
  `installPageHelpers` is idempotent (`rendered.ts:757`). The per-rule `await ensurePageHelpers`
  is itself a second no-op, and the ternary is a third layer of dead defense.
- *"A ruling sanctions the three holdouts."* `engine-rulings.md:3842-3847` keeps
  `one-filled-action`, `focus-renders`, `interactive-contrast`, `viewport-overflow` — but on
  *scope* (Arm A/B), saying nothing about the signature. No ruling anywhere touches the helper
  contract.
- The repo's own code argues *for* the finding: `touch-targets.ts:137-139` carries the comment
  "This rule carried its own unescaped copy, the drift `ensurePageHelpers` exists to end."

Tier confirmed **refactor**: convert three rules, delete 20 ternaries, unify two names, add a gate.
No re-authoring of rule logic.

---

## cli-02 — `rendered.ts` monolith — **STANDS**, tier revised **rewrite → refactor**

### Confirmed by measurement

`rendered.ts` is 1,015 lines and holds six concerns, verified against the symbol map:

| Concern | Lines |
|---|---|
| Theme/state model, Playwright structural types, rule model | 23-177 |
| Allowlist finding builders + `resolveRenderedFindings` | 178-322, 451-490 |
| Page-identity guard (`capturePageIdentity`, `identitiesMatch`, `waitForHydrationSettle`, `captureSsrIdentity`, `pageIdentityMismatchFinding`) | 330-450 |
| BASE_URL, cookie parsing, Playwright loading | 493-584 |
| State application, color resolution, in-page helpers | 586-867 |
| `runRendered` | 869-1015 |

The static half splits the same concerns: `types.ts` 69, `run.ts` 94, `suppress.ts` 257,
`color.ts` 231, `config.ts` 243. Asymmetry confirmed. Duplicate `byPosition` confirmed at
`run.ts:60` and `rendered.ts:1005`.

### Corrections to the finding

- **"Two different `byPosition` functions with different semantics"** is technically true and
  practically inert: every rendered finding is minted through `positionless()`
  (`rendered.ts:187-189`), so `line` is always 0 and `a.line - b.line` in the static version yields
  the same order. The duplication is real; the semantic-divergence framing overstates it.
- Size alone is not this repo's bar — `norms.ts` (677), `markup.ts` (656), `sheet.ts` (555) are
  large single-concern substrates and are fine. The finding's argument is multi-concern, which holds.

### Why the tier drops

The remediation as written is a **move**: four new modules, the same function bodies, repointed
imports, plus one name change. Nothing is re-authored. The page-evaluated functions
(`installPageHelpers`, `probeSelectors`, `capturePageIdentity`, `resolveColorsInPage`) are
serialized by source and are already self-contained, so module location is irrelevant to them — no
technical blocker, and no rewriting. The one part that would genuinely need re-authoring,
`runRendered`'s seven-level nest, is **not in the remediation**. `refactor` is the honest tier.

---

## cli-03 — doctor re-implements its runner's error contract — **STANDS**, tier **refactor** (unchanged)

### Confirmed by measurement

- `runDoctor` (`run.ts:18-23`) catches every throw as
  `fail(err instanceof Error ? err.message : String(err))`.
- `grep -n "err instanceof Error ? err.message : String(err)" src/lib/doctor/*.ts` returns the
  byte-identical `return fail(...)` at exactly eleven sites: `checks-cloudflare.ts:110,130,180,243,278,304`;
  `checks-local.ts:128,163`; `checks-github.ts:62`; `check-probe.ts:37`; `check-send.ts:42`.
  The two legitimate exceptions the ranking excludes (`checks-github.ts:45` prefixes
  `App authentication failed:`; `check-skill.ts:129` converts to a skip) are correctly excluded.
- Each `try` wraps the whole remaining body and returns, so the wrapper adds nothing the runner
  does not already do. Read in full at `checks-cloudflare.ts:85-135` and `:205-307`.
- The D1 preamble is verbatim three times (`checks-cloudflare.ts:214-218, 262-266, 288-292`),
  including the identical skip string. `cloudflare-api.ts:10-18` already holds `NO_TOKEN`,
  `NO_FROM`, `NO_ACCOUNT` for exactly this. `types.ts:22` already defines `CheckOutcome<T>` and its
  doc comment says it exists so "Every ad hoc `{ <payload> } | { fail: CheckResult }` shape a
  multi-step check builds (resolve a zone, then read one of its settings, **then query D1**)
  converges on this one generic" — the remediation is the documented idiom, not an invention.
- `grep -c 'readWranglerConfig(ctx.readFile)'` → **9** (plus `bin.ts:67` via `readFileUnderCwd`).

### Arguments against the finding, tested

- **A5 does not sanction this.** `code-idioms.md` A5 fixes the *spelling* of catch-boundary
  stringification ("no helper"); it says nothing about whether a redundant catch should exist. A
  defender reaching for A5 is misreading it.
- **The "Deliberately not standardized" list does not cover it.** It excuses "bespoke skip messages
  … where the message is input-specific". The D1 string is one sentence copied three times and is
  not input-specific. The ranking read this correctly.
- **Real migration cost the ranking did not name:** unit tests assert the fail-on-throw at the
  *check* level, not through `runDoctor` — `doctor-check-probe.test.ts:206-213`,
  `doctor-checks-cloudflare.test.ts:150, 350, 459, 514` ("fails with the error string when the fetch
  rejects"). Deleting the wrappers requires repointing those tests to `runDoctor` or to
  `rejects.toThrow`. Under the standing ruling (migration cost never discounts a finding) this does
  not weaken it, but the remediation is ~11 source sites **plus** ~5 test sites.

### The weakest limb

The `readWranglerConfig` memoization. Ten reads of one small file per CLI run is not a cost worth a
`WeakMap`, and `ctx.readFile` is injected precisely so tests control it — memoizing behind the
injection point adds a state the fixtures must reason about. Keep the finding's first two halves at
full weight; treat the memoization as optional and prefer "resolve once in the bin and hang the
facts on `DoctorContext`" if it is done at all.

---

## cli-04 — `checks-local.ts` misnamed and stale — **STANDS (narrowed)**, tier revised **refactor → note**

### Confirmed

The header (`checks-local.ts:1-3`) enumerates five checks. The module exports **nine** DoctorChecks:
`configBindings` (14), `configMediaBucket` (33), `configObservability` (51), `configCsrfDisable` (85),
`configPublicOrigin` (110), `configSiteConfig` (149), `configTidyKey` (223), `adminMountShape` (300),
`roleWiring` (354). Four are unlisted. This is a live M1 violation ("every module opens with a header
naming its job") and it is the core of the finding. Confirmed.

`probeAnthropicKey` (`checks-local.ts:204-212`) does make a live call to `https://api.anthropic.com`
from the module named "local". Confirmed.

### Falsified: the plural/singular naming rule

The finding claims "plural `checks-*.ts` for multi-check modules, singular `check-*.ts` for one-check
modules. The convention is consistent but undiscoverable." Counted:

```
check-floors      1     checks-github      1   <-- plural, one check
check-posture     1     checks-cloudflare  6
check-probe       1     checks-local       9
check-send        1
check-skill       1
```

`checks-github.ts` exports exactly one `DoctorCheck` (`githubApp`, line 14) under a plural name, so
the count-based rule the finding wants recorded in `code-idioms.md` M2 **is not the rule the tree
follows**. The tree's actual split is by *kind*: `checks-<provider/domain>` for a domain grouping,
`check-<thing>` for one named check, several of them opt-in factories behind a flag
(`check-probe`, `check-send`). Recording the count rule would codify something false.

### Overstated: "Every read goes through the injected `ctx.readFile` is false"

Every *file* read in the module does go through `ctx.readFile`. The Anthropic call goes through
`ctx.fetch` (`checks-local.ts:247`), and the comment at `:199-202` says so explicitly: "a real live
call through ctx.fetch, never the SDK, so a test's fetch stub stands in with no real network or key."
The injection discipline the sentence asserts is intact; what is stale is the *enumeration* and the
implied local-only scope, not the injection claim.

### Pre-empted by an open ruling

`docs/internal/engine-rulings.md` carries
`audit-cli-config-tidy-key-check-and-its-active-anthropic-probe` (reshape, 2026-08-26, any-site
audit), open until executed, whose recorded shape is: *"Keep the presence-and-wiring half; **drop the
live Anthropic call** or move it behind a flag."* If that ruling executes as written, there is no
live call left to re-home, and `check-tidy-key.ts` may never need to exist. Moving the probe now
would build against a surface a standing ruling has already marked for removal.

### Net

What survives is: rewrite a stale module header to enumerate its nine checks, and revisit the file
split *after* the tidy-key ruling executes. That is a one-comment edit plus a deferred decision —
**note** tier. The two sub-claims that made it read as refactor-sized (the naming rule, the
relocation) are respectively false and pre-empted.
