# Theme identity pass B: right-sized engineering review

Reviewer lens: right-sized engineering (argue for cutting; also catch under-builds that let a goal
silently fail). Target: `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md` at
`4365ac34`. Line numbers refer to that file. Evidence was read from `main`: `src/lib/audit/`,
`scripts/checks/check-public-tokens.mjs`, `scripts/lab/reskin-fixture.mjs`, and the showcase
chassis and theme.

## Verdict

The spec is mostly proportionate. The export subpath, ink derivation, the moved contrast check,
the fixture theme, and the probes each trace to a stated goal, and none of them is built for a
hypothetical. No blocker. The cuts are small, and the most valuable fold is a reuse: the spec
never mentions the shipped `token-colors` rule, which already does half of `public-literals`. Two
under-builds matter more than any cut. As worded, `theme-conformance` would flag Waymark's own
tree. The resolver behind `theme-contrast` and the fixture theme's "build and render" proof are
both unbounded, and those are the pass's largest cost risks.

Proportionality, piece by piece:

| Piece | Goal it serves | Verdict |
|---|---|---|
| `theme-tokens.css` export subpath | Goal 3 (library component reads theme values), goal 1 (four re-skins) | Keep. Details in finding 8. |
| Status-ink derivation | Goals 2 and 4 (a new theme gets working inks for free) | Keep. Without it, a fixed default ink would be wrong for any non-Waymark palette. |
| `cairn-eyebrow` class | None directly; the harvest's repetition is a guidance problem | Cut (finding 5). |
| `public-literals` | Goal 3, enforcement of the implementer line | Keep the rule. Build it on `token-colors`' core (finding 1). |
| `theme-conformance` | Goals 2 and 4 | Keep. Fix the var half (finding 2). |
| `theme-contrast` moved into the audit | Goal 1 (re-skins happen in consumer repos, where only the audit runs) | Keep. Bound the resolver (finding 3). |
| Fixture theme | Goal 2 ("proves it"); the permanent guard on the principle | Keep. Bound the build proof (finding 4). |
| Three probes | Goals 3 and 4: the guidance alone suffices | Keep all three. Probe 3 needs an oracle (finding 7). |
| Guidance token-table sync test | Keeps the shipped table honest | Keep. Fix its source set (finding 9). |
| Two chains in one pass | Clock time only | Acceptable as drafted (finding 10). |

## Findings

### 1. Major: `public-literals` rebuilds a detector that already ships

**Location:** spec:121-127, 139-141.

**Defect:** `src/lib/audit/rules/static/token-colors.ts` already flags color literals (hex, rgb,
named, pure achromatic) in CSS declarations at error tier. It is not `adminOnly`, so it runs over
`DEFAULT_STATIC_SCOPE` (`config.ts:15-19`), and that scope includes `src/lib/components`, "where a
consuming site keeps its shared public components" (`config.ts:27-29`). It also already carries
the theme-file exemption mechanism, `paletteCssFiles` (`config.ts:51`). That file's header argues
explicitly against "inventing a filename special case for the second one" (`token-colors.ts:14-17`).
The spec adds a third literal detector alongside `token-colors` and `check-public-tokens.mjs` part
(a), with a hard-coded `src/theme/**/*.css` exemption. It also sets the public scope's default
roots to include `src/lib/components` (spec:117-118). A hex literal in a site's shared component
would then be reported twice: once at error by `token-colors`, once advisory by `public-literals`.
That contradicts the spec's own "one implementation of each check" (spec:140-141).

**Fold:** Build `public-literals` on `token-colors`' hazard function, extended with `oklch(`,
`oklab(`, and `hsl(` literals, absolute font sizes, `style=` values, and arbitrary-value brackets.
The exemption list should be `paletteCssFiles`, with `src/theme/**/*.css` added to its default,
and should keep the spec's finer grain: only custom-property values are exempt. Give
`src/lib/components` to exactly one of the two scopes, or have `public-literals` skip files that
`token-colors` already covers. Keep the rule id, because suppressions key on it.

**Saves:** a second hazard implementation and a second exemption mechanism, plus the
duplicate-finding bug. **Reopens:** nothing.

### 2. Major: `theme-conformance`'s var half polices vocabulary and fails on Waymark

**Location:** spec:128-132, measured against spec:36-40.

**Defect:** The rule accepts a `var(--x)` only when "the theme, `theme-tokens.css`, or daisyUI"
defines it. Waymark's own public tree reads tokens from four other sources:

- Composition tokens defined in chassis `composition.css`, not in the theme: `--cairn-card-bg`,
  `--cairn-card-radius`, `--cairn-card-padding`, `--cairn-band-*`, `--cairn-sidebar-*`,
  `--cairn-hero-gap`, `--cairn-section-gap`.
- Route-local custom properties such as `--tag-filter-radius`
  (`examples/showcase/src/routes/(site)/+page.svelte:274`).
- Tailwind's default theme namespace (`--spacing`, `--font-mono`, `--color-red-500`), which a
  designer is told they may choose (spec:125-126).
- Tailwind's `--tw-*` internals.

A theme that drops `composition.css` and defines its own tokens in a component, which spec:37-39
explicitly permits, gets findings. That turns the guard into a vocabulary check, and the governing
principle says it "never" is one. It also breaks the proof at spec:163-165 as soon as the fixture
theme uses a local token.

There is a matching under-build. `theme-tokens.css` counts as "defined" whether or not the site
imports it, so a site that skips the `Consumers must:` swap, or later drops the import, loses every
default and still passes.

**Fold:** Treat a token as defined if it is declared anywhere in the scanned tree: any CSS file in
scope, any `<style>` block, any `style="--x:…"`. It is also defined if daisyUI's key list or
Tailwind's default theme names it. `theme-tokens.css` keys count only when the site's CSS imports
the subpath. The var half then catches typos and a missing import, which is its real value.
**Alternative cut:** Drop the var half entirely. The completeness half guarantees the daisyUI keys,
and the defaults stylesheet guarantees the rest by construction. Add a one-line import-presence
check in its place. Recommendation: take the fold. It costs little and keeps typo detection.

### 3. Major: the `theme-contrast` resolver has no stated bound

**Location:** spec:133-136, 237-245.

**Defect:** "Taught to resolve `var()` and `color-mix` through culori" describes a general static
CSS custom-property evaluator. It would work across files, cascade layers, `@theme` against
`:root`, per-theme blocks, and light and dark schemes. That is the largest single piece of new
engineering in the pass, and "Open for the plan" leaves it unbounded. The only derived form the
spec introduces is the ink default, `color-mix(in oklab, var(--color-<status>) N%,
var(--color-base-content))`, one level deep over theme literals.

**Fold:** Specify the resolver's reach. It follows `var()` chains to a literal within the same
theme block plus `theme-tokens.css`, and it evaluates `color-mix(in oklab|oklch, A p%, B)`. Any
other form yields one advisory "unresolvable, not measured" finding and never a crash or a silent
pass. A rendered browser measurement is the heavier alternative: the audit's rendered runner
already resolves everything through computed style. It would make consumers run a server for a
theme check, though, so it is the wrong trade here.

**Saves:** an open-ended evaluator. **Reopens:** exotic theme expressions (relative color syntax,
nested mixes) are reported as unmeasured, never passed. That is acceptable at advisory tier.

### 4. Major: the fixture theme's "build and render" proof is unspecified and potentially the costliest standing gate

**Location:** spec:162-166.

**Defect:** `test:reskin` today is a node script that rewrites a copy of `theme.css` and runs
parsers, with no build (`reskin-fixture.mjs:17-30`). "The showcase must build and render under it
with no chassis edit" implies several new pieces: a theme-swap mechanism, a second full `vite
build` of the showcase inside a gate that runs every pass, and some render check. None of that is
named. Unbounded, it could double the showcase build cost in `test:reskin` or grow a second visual
baseline set. The "different faces" clause could also pull font assets into the repo.

**Fold:** Name the bound. Copy the showcase `src/` to a temporary directory and swap in the
fixture theme file. Run `vite build` and the public audit scope over the copy. The render proof is
at most one smoke test that the build output contains the fixture's tokens, with no screenshot
baselines. Faces use system font stacks, so no assets are needed. If a full build is too slow for
every gate, run it in CI only and keep the static half local.

**Reopens:** nothing. This scopes a proof the spec already requires.

### 5. Minor: cut the `cairn-eyebrow` class

**Location:** spec:105-112, 145-147, 181.

**Defect:** `--tracking-eyebrow` already lives in `@theme` (chassis `tokens.css:102`, and in the
spec's `theme-tokens.css` list), so Tailwind already generates a `tracking-eyebrow` utility. The
idiomatic eyebrow is `uppercase tracking-eyebrow`. The harvest's eight hand-set instances bypass
the token with their own numbers. That is a guidance miss, and the spec's own job-to-token table
already has an "eyebrow" row (spec:151). The class also lands in the chassis, which is copied at
scaffold and frozen, the exact failure the spec moves the defaults to fix (spec:75-81). A frozen
class copy on four rebuilt sites is the same drift again. Moving it into the engine instead adds a
public class to the versioned contract for one declaration pair.

**Fold:** Drop the class. The guidance table's eyebrow row reads `uppercase tracking-eyebrow`.
**Saves:** a class, a facts bullet, a reference section, and a contract entry. **Reopens:** a
designer who wants to change every eyebrow's weight or size edits each use rather than one rule.
The sites are small and are being rebuilt from Waymark, so the repetition stays low. If Geoff
values the single semantic hook, the class belongs in `theme-tokens.css`, not the copied chassis.

### 6. Minor: the "engine's public component directories" root covers nothing

**Location:** spec:117-118.

**Defect:** Outside `src/lib/components` and `src/lib/admin-toolkit`, the engine has no `.svelte`
or `.css` file that reads a theme token. `CairnHead.svelte` and the reproduction stories read none.
The clause configures a scope for components that do not exist yet.

**Fold:** Drop the clause. Record in the reference page that a future engine public component
lives under a root the public scope already covers. Probe 3 then exercises that root, which makes
probe 3 the only thing that tests goal 3 end to end.

### 7. Minor: probe 3 has no pass condition

**Location:** spec:172-175.

**Defect:** "Must render correctly under Waymark and under the fixture theme" names no oracle.
Probe 2 has one: zero public-scope findings.

**Fold:** Probe 3 passes when the public scope reports zero findings on the component, it uses
only contract tokens, and the main loop reads one screenshot per theme. Keep the probe itself. As
finding 6 shows, it is the only exercise of the library-component goal.

### 8. Minor: the export subpath is worth its seam cost, with one missing migration line

**Location:** spec:75-90, 183-185.

**Assessment:** The lighter alternative is keeping the copied `tokens.css` and adding a drift
check. That still freezes the defaults, and it adds its own surface. The contract already exists
implicitly today, because chassis CSS reads these keys. Exporting it makes the contract explicit,
and adding a key stays non-breaking (spec:88-89). This follows the daisyUI and Tailwind idiom.
Keep it.

**Under-build:** A site that does not override the status inks gets derived inks instead of its
stale copied values after the swap, so its render can shift. The migration note should name which
default values changed, not only the one-line import swap.

### 9. Minor: the guidance-table test checks the wrong source set

**Location:** spec:150-153.

**Defect:** The table's "body ink" and "card edge" rows are daisyUI keys or `@theme` keys. The
"eyebrow" row is a utility pair. Asserting that every named token "exists in `theme-tokens.css`"
fails on daisyUI keys as written.

**Fold:** Assert against `theme-tokens.css` keys plus daisyUI's key list, which is already read
for `theme-conformance`.

### 10. Minor: delivery sizing is acceptable; close the `check-public-tokens.mjs` question now

**Location:** spec:190-205, 138-141, 245.

**Assessment:** Two parallel chains buy clock time only, and clock time is not a budgeted resource.
Splitting into two passes from the start is equally defensible, since spec:203-205 already
concedes the halves are self-contained. Both chains wait on the same pass A merge, though, so a
split gains no scheduling freedom. The pre-named 80% split point covers the risk. No change is
recommended.

**Defect:** "Whether `check-public-tokens.mjs` retires or keeps a residue" is left open. After the
move, part (a) duplicates `public-literals` over the showcase. The token-resolution half
duplicates `theme-conformance`, and part (b) becomes `theme-contrast`. A kept residue is a second
implementation.

**Fold:** Decide it in the spec: retire the script. `check:public-tokens` becomes a run of the
audit's public scope over `examples/showcase` and `examples/cairn-theme`, and `reskin-fixture.mjs`
imports the contrast core from `src/lib/audit`. That leaves one implementation per check with no
plan-time decision.

## Not findings (considered and kept)

- **Three rules against one or two:** The rules could merge into one "theme" rule. Separate ids
  give suppression granularity and clear docs, and the merge saves only registry lines.
- **The fixture theme on top of the hue-rotation case:** They test different claims. The hue
  rotation checks that editing N values re-skins the theme. The fixture checks that a different
  theme needs no chassis edit.
- **Probe 2 and probe 3:** They exercise different shipped guidance (site-side `public-theme.md`
  against the engine-side implementer line). Merging them would leave one arm untested.
- **The advisory-then-error promotion:** It is standard for a new audit rule, and it costs one
  changelog line.
- **Chain 1's sync test:** It is governed by the earlier spec (spec:6-9) and out of this lens's
  reach. If the chain 1 guidance tables print from the recipe source through `cairn-audit norms`
  rather than being hand-copied, that test becomes unnecessary. This is worth a line in the plan.
