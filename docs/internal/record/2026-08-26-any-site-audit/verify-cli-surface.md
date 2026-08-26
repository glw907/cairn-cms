# CLI surface — fresh-context verification of the ranking's verdicts

Verifier did not produce the ranking. Every quoted line below was re-read from the tree at
`/home/glw907/Projects/cairn-cms` on 2026-08-26, plus the two live adopter config files.

**Result: 47 of 50 verdicts stand. Three do not.**

| # | Item | Original | Verdict |
|---|---|---|---|
| 4 | `edge.https-forced` + `edge.hsts` | reshape (pair) | **overturned** — split: keep https-forced gating, retire hsts |
| 21 | create-cairn-site flags / state / console | keep | **overturned** — reshape; `--email`'s semantics ride the rank-46 defect |
| 46 | cost narrative | reshape | stands, evidence tightened (the preamble IS wired; contradiction is real) |

Three cross-cutting observations are recorded at the end; they qualify keeps rather than
overturning them.

---

## The three that do not stand

### Rank 4 — `edge.https-forced` + `edge.hsts` — the pair must split

The ranking read only the reference table row and concluded *"Arm A fails: both read Cloudflare
zone toggles."* **The condition registry says otherwise for one of the two.**

`src/lib/diagnostics/conditions.ts:35-42`:

```
'edge.https-not-forced': { severity: 'blocker',
  why: 'The JS-free admin sign-in posts a form, and the framework CSRF guard rejects a form POST
        whose origin scheme does not match, so an admin reached over http hits an opaque 403.' }
```

That is a cairn-owned failure mode, not a generic web-security preference: cairn's own no-JS
sign-in plus cairn's own CSRF guard produce an **opaque 403 at the sign-in form** on a zone that
does not force https. It is precisely the silent, misattributable failure a preflight exists for,
and no `curl` tells a developer that this is why their sign-in 403s. Arm A holds. Demoting it out
of the gate would remove a real check on the strength of a mis-read.

`edge.hsts` fails in the opposite direction, and harder than the ranking argued.
`conditions.ts:128-135` rates it **`severity: 'warning'`**, and its own `why` concedes the scope:
*"The admin host is covered either way, since cairn's own admin responses carry their own max-age,
so this is about every other route."* `checks-cloudflare.ts:161-171` nonetheless returns `fail()`,
which `bin.ts` turns into **exit 1**. A registry-warning condition producing a gating failure about
routes the charter assigns to the developer is the defect; the documented false-fail on a Transform
Rule is a second one on top.

Also note: **the doctor has no advisory tier.** `report.ts:8-12` is `pass | fail | skip`. "Demote
both to advisory" is not a shape the tool has, so the ranking's reshape is under-specified as well
as mis-targeted.

Replacement: **keep `edge.https-forced` as a gating check; retire `edge.hsts`.**

### Rank 21 — create-cairn-site flag set — reshape, not keep

The keep rests on this praise: *"`--yes` alone (no `--email`) declines rather than committing an
owner to a subscription unattended — an unattended flag that refuses to spend money without a
second explicit flag."* Verified verbatim at `args.mjs:29-33` and enforced at
`chapter2.mjs:680-693` (`'Turn on Cloudflare's Workers Paid plan now, so anyone besides you can
sign in?'`, with a `paid-plan-declined` terminal step).

**That flag's entire premise is the falsehood rank 46 retires.** Under the standing ruling
(Workers Paid is the baseline from first deploy, `money.mjs:32-34`), chapter 1's deploy already
commits the account. So `--yes --deploy` without `--email` deploys a site that needs Paid and never
asked, while `--email` guards a decision that was already made. Rank 46's own reshape note says
*"the prompt ORDER is part of the defect"* — and the order is expressed in these flags, which sit
in rank 21's item, not rank 46's. Nothing in the audit currently covers them.

Migration cost does not save it (churn is free until beta) and neither does absence of objection:
`version: "0.0.0"`, `npm view` 404, nobody has run it. `--dry-run`, the resume store and the local
console keep; `--email`/`--yes`/`--deploy`'s money semantics reshape with rank 46.

### Rank 46 — evidence corrected, verdict unchanged

I tried to break this one and could not. A first grep scoped to `packages/create-cairn-site/src/`
found no caller of `money.mjs` and suggested the honest copy was dead code (which would have made
the defect worse). It is not: `bin.mjs:22` imports `printCostPreamble` and `bin.mjs:379` calls it,
gated on `isFreshRun`. So the ranking's framing is exactly right — **the preamble prints, and then
`chapter.mjs:106-113` tells the same reader in the same run that "The free plan is enough; nothing
in this step costs money."** Reshape stands as written.

---

## The forty-seven that stand (verification notes)

**1 — `check:dogfood` into `cairn-audit`: retire the home.** Verified `check-package-files.mjs:170-178`
(the anti-leak gate: a module unreachable from `rules/static/index.ts` or `rules/rendered/index.ts`
is a defect, so registering is how a rule ships) and `docs/reference/cairn-audit.md:22`
(*"ships whole, as consumer product"*) and `:3` (*"the design-language audit"*). `ls scripts/checks/`
shows 30 sibling gates and **no** `check-dogfood.mjs`, so the proposed home is free.

**2 — `unlistedRoutes` as a rendered rule: retire.** `config.ts:44-51` `DEFAULT_RENDERED_PAGES` is
six `/admin/*` routes; `rendered.ts:890-901` iterates that fixed list and measures each page's own
DOM. A completeness check needs a route manifest no rendered rule receives. Both arms fail.

**3 — `skill.admin-screens` + `--fix`: retire from the doctor.** `bin.ts:40-49` installs before the
registry; `checks-local`-adjacent `check-skill.ts` hashes; `conditions.ts:196-203` rates it
`severity: 'warning'`; `docs/reference/doctor.md:90` (*"This check never fails"*) and `:169-173`
(the `@source not` hazard) both verified. A never-failing check inside a gate contract is a
category error. Re-homing to its own verb is right; the packaged skill itself is untouched.

**5 — `chip-ground-collision`: reshape, with a caveat.** `docs/reference/cairn-audit.md:216` carries
the 24-of-40 self-indictment verbatim; `rules/rendered/index.ts:6-8` records the demotion. The
verdict stands, but two qualifications: (a) *deregistering* trades a noisy signal for no signal,
so the better reshape is the filed chroma repair, not removal; (b) it sits in tension with rank 7,
which keeps two heuristics that also cannot tell a real composition from a defect. What separates
them is that this one's error rate was **measured**. That is a legitimate discriminator, but it
should be stated as the discriminator.

**6 — `form-font-parity`: reshape.** `docs/reference/cairn-audit.md:222` names all three
false-positive classes and the provisional registration; `rules/rendered/index.ts:11-13` repeats it.
Purpose is Arm A (only the engine ships the UA reset layer). Close the net before promotion.

**7 — `container-inset-asymmetry` / `field-edge-alignment`: keep.** `docs/reference/cairn-audit.md:224`
carries the `<ul class="list">` case verbatim — DaisyUI's `.list` plus an unreset UA bullet indent,
which any consumer styling an admin list hits. Arm A is thin and rests on the **harness** (rendered
geometry a consumer cannot install around a tool they did not write) more than on the rule. Correctly
advisory. Weak keep, not a failure.

**8 — `admin.mount-shape`: reshape.** `checks-local.ts:300-312` verified: `skip → pass → skip`, with
**no `fail` branch anywhere in the function**. `conditions.ts:187-195` is `severity: 'warning'`. A
check that cannot fail spends a report line to say "I could not tell."

**9 — `ai.posture-effective`: keep.** `check-posture.ts:36-42` builds `SIGNAL_POSTURES` from
`CONTENT_SIGNAL` **off the builder** rather than transcribing it, with the reason stated in place:
a drifted copy *"would make cairn's own robots.txt read here as a file some other layer wrote."*
Note the consistency test against rank 10: this check also fetches without a flag, but it fetches
**the site's own origin**, not a third party with a credential. The distinction the ranking drew
holds.

**10 — `config.tidy-key`: reshape.** Both halves verified. `checks-local.ts:225` really does reuse
`conditionId: 'config.bindings-missing'`, whose registry `why` (`conditions.ts:84`) is about a
missing `EMAIL`/`AUTH_DB` binding — so a tidy-key failure prints a remediation about wrangler
bindings. `checks-local.ts:247` calls `probeAnthropicKey` in the **default** registry, no flag,
while `--send-test` and `--probe` establish the opposite idiom for network side effects.

**11 — no `--help`: reshape.** All five verified. `doctor/assemble.ts:77` (`unknown argument`,
throw → `bin.ts` exit 2); `audit/config.ts:239` same; `media-seed/assemble.ts` same shape;
`vite/bin.ts` reads no `process.argv` at all; `create-cairn-site/src/args.mjs:16` has `version`
and no `help`, handled at `bin.mjs:350`. Arm A is unarguable — a consumer cannot add a flag to a
bin the engine ships.

**12 — `focus-parity` / `motion-band` / `reduced-motion`: keep, with the tier caveat.** Verified
`motion-band.ts:34` `tier: 'error'`, band 150-250ms at `:14-15`. See cross-cutting note C2:
all nine static rules are error tier. The keep stands on membership (the `hover:` carve-out is
only correct because cairn ships the blanket ring), but `focus-parity` and `reduced-motion` are
generic hygiene carried by their exemption, not by their substance. Thin, and correctly ranked low.

**13 — `auth.role-wiring`: keep.** The distinction against rank 8 is real and I checked it:
`checks-local.ts:379-382` has a genuine `fail` branch (`'the adapter declares custom role(s) ... is
not passed { roles }; the running guard falls back to owner/editor and resolves those roles to none'`).
Three skips, but it can go red. Keep, and it still owes the INFO reshape.

**14 — `--header`: keep.** The best model of charter constraint 3 on the surface. The engine did not
transplant ASC's `--cf-access-id`/`--cf-access-secret`; it re-derived a repeatable generic header.
Adoption confirmed in `~/Projects/aksailingclub-org/package.json`.

**15 — `CAIRN_AUDIT_COOKIES`: keep.** `rendered.ts:532-554` verified: throws on a missing `=`, on an
empty name, and on `cairn-admin-theme` (*"the rendered run owns that cookie per browser context ...
a caller override would silently invalidate the per-theme measurement"*). cairn-pub's `$comment`
quoted in the ranking is verbatim in `~/Projects/cairn-pub/cairn-audit.config.json`.

**16 — `config.csrf-disable`: reshape.** The ranking's correction to ROADMAP is **right**:
`report.ts:8-12` renders distinct `PASS`/`FAIL`/`SKIP` tags and the summary counts all three, so
"a skip is not visually distinct from a pass" is false. The live defect is the one the ranking
names: `doctor/bin.ts` sets `process.exitCode = failed > 0 ? 1 : 0`, so a skip never moves the exit
code and CI stays green.

**17 — `--send-test`: keep.** The `E_SENDER_NOT_VERIFIED` collision and the 10203/10204 pair are in
this repo's own `CLAUDE.md` durable gotcha. A configuration read cannot separate "onboarded and
propagating" from "onboarded and broken"; only a send can.

**18 — `--bucket` / wrangler resolution: keep.** `media-seed/bin.ts:12` verified importing
`readR2Buckets` from `../doctor/wrangler-config.js`. One parser, two commands. Arm A is thin;
the reuse is the protected property.

**19 — `--probe`: keep.** `check-probe.ts:95` verified:
`cairn-doctor-probe-${random}@example.invalid`, with the non-leak reasoning at `:1-6`. The safety
is a consequence of a cairn design decision a consumer could not know to rely on.

**20 — page-identity guard: keep.** `docs/reference/cairn-audit.md:175-177` verified verbatim: reads
only `<title>`, `<main>`, `[role="main"]`, *"none of them cairn-only markup"*, and a `null` landmark
on both sides counts as agreement, so the shell-less login page and a consumer's custom route both
stay auditable. The engine had `.card-shell` and `PageHeader` available and did not use them.

**22 — suppression contract: keep.** Three properties, each its own error-tier finding, and neither
meta-error suppressible. The node-resolution semantics need the `svelte/compiler` AST the tool
already holds.

**23 — `config.public-origin`: keep.** Verified: `checks-local.ts:7` imports `requireOrigin` from
`../env.js` and `:126` calls it, with the note *"requireOrigin is the runtime rule ... reusing it"*.
The CLI verdict cannot drift from the Worker's, by construction.

**24 / 25 — create-cairn-site Cloudflare and GitHub chapters: keep.** The charter question is closed
by a recorded ruling, not open. Both carry zero adoption (`absenceOfObjection: true` is doing real
work), and both keeps rest on the engine's own record rather than on any consumer evidence. That is
the correct reading of the available evidence, not a strong one.

**26 — rendered harness: keep.** Verified `rendered.ts:556-572`: Playwright is a dynamic import from
the consumer's own install, failing to a one-line install instruction, so a project that never runs
rendered mode takes no browser dependency. Both themes always, not configurable.

**27 — allowlist and rule-declared exemptions: keep.** `docs/reference/cairn-audit.md:316-322, 355`
verified, including *"Only an advisory rule can exempt itself"* and the dead verdict waiting on a
complete run. An engine that capped its own self-exemption power at advisory has answered the
who-audits-the-auditor question.

**28 — `cairn-media-seed` command / exit contract: keep.** `bin.ts` verified: bad flags and an
unresolved bucket exit 2, a failed item exits 1, the summary always prints, `process.exitCode`
throughout. The slug→shard translation is between two cairn-owned conventions.

**29 — doctor shell / report / exit codes: keep.** `bin.ts:1-7` and `report.ts` verified, including
*"An unknown conditionId is a programming error; condition() throws and the report does not paper
over it."* The condition registry gives the CLI, the runtime errors and the readiness checklist one
vocabulary.

**30 — `cairn-audit` command shape / tiers: keep, with the tier caveat.** `bin.ts:49` verified
throwing on `norms --rendered`. The praised sentence — advisory *"because each advisory rule
measures a compositional question a legitimately novel component can answer differently on purpose"*
— is exactly right for the rendered side and is contradicted by the static side, where all nine
rules gate. See C2.

**31 — doctor flags / env / three-source derivation: keep.** `bin.ts:59-68` verified importing
`readAdapterFacts` through the vite arm, *"which exists only on this bin path, never in a Worker"*.
`assemble.ts:107-114` assembles `github` only on the complete trio. Secrets are env-only.

**32 — `cairn-audit.config.json` contract: reshape.** All three reshapes verified.
(a) `config.ts:165` `renderedPages: asPathList(renderedSection.pages, ..., DEFAULT_RENDERED_PAGES)`
— replaces, never extends. **Both adopters paid the tax**, read from their live files: ASC restates
the six and adds six; cairn-pub restates the six, adds one, and writes a `$comment` explaining why.
(b) `config.ts:154` `fail('sheet must be a path')` verified. (c) the redirect trap is documented
only in a consumer's own comment.

**33 — the four error-tier rendered rules: keep.** The canvas-readback color method
(`docs/reference/cairn-audit.md:226-228`) is the reason to trust all four, and `one-filled-action`'s
exemption is structural (*"read from the live computed background"*), carrying no site's class name.

**34 — `touch-targets`: keep.** `docs/reference/cairn-audit.md:263` verified: *"on cairn's own admin,
8 of the 10 errors this rule raises clear it."* Publishing the limit that most weakens your own rule
is what lets it gate at error tier without lying.

**35 — `email.sender-onboarded`: keep, and it survives the rank-4 test.** I applied rank 4's own
objection here (this also reads a Cloudflare API) and it does not land: `checks-cloudflare.ts:89`
derives the domain from `ctx.from`, i.e. cairn's adapter `cairn.email.from`, so the check joins a
**cairn-owned input** to platform state. `conditions.ts:62-70` is `severity: 'blocker'` with
*"No editor can sign in."* Compare `edge.hsts`, `warning`, *"this is about every other route."*
That contrast is what makes the rank-4 split the right call.

**36 — `github.app`: keep.** The check walks PEM parse → JWT sign → installation token → repo read
in the sequence `src/lib/github` walks on every Publish. `gh api` proves something adjacent.

**37 — `stock-default-hazards`: keep, with the tier caveat.** `stock-default-hazards.ts:83`
`tier: 'error'` verified. The recurrence argument is sound: three independent rediscoveries of the
invisible-`.btn`-edge is evidence about **DaisyUI's defaults**, which any consumer inherits, not
about the family. See C2 for the tier.

**38 — create-cairn-site command / bake / `check:template`: keep.** `package.json:3` `"version":
"0.0.0"` and `:12` `prepack: bake-template` verified. Keep is correct on shape; the evidence base is
the engine's own record only.

**39 — `config.site-config`: reshape.** Verified live and still broken:
`checks-local.ts:138 SITE_CONFIG_PATHS = ['site.config.yaml', 'src/lib/site.config.yaml',
'src/site.config.yaml']`, while `find` returns
`packages/create-cairn-site/template/src/theme/site.config.yaml` and
`examples/showcase/src/theme/site.config.yaml`. **The engine's scaffolder and the engine's checker
disagree on 100% of scaffolded sites**, and `:155` returns a skip, which never moves the exit code.
Textbook Arm B on the doctor.

**40 — `type-scale` / `gap-scale` / `token-colors` / `grammar-boundary`: keep, with the tier caveat.**
`type-scale.ts:39` `tier: 'error'` verified, and its resolution runs through the **built admin
stylesheet**. That produces a real interaction the ranking noted only under rank 45: a consumer's own
`text-lg`, compiled by their own build, is invisible to `ctx.sheet`, so `no-uncompiled-class` fires
at error tier instead. Same one-line fix (`sheet` as a list); worth naming as a second symptom of
the same root.

**41 — the five advisory rendered rules: keep.** `weight-budget`'s region model names shapes by tag
or ARIA role, *"never by a class, so a rewritten component stays covered"*, and publishes both places
its own abstraction leaks. `norms-bands` treats an `open-question` or `ratified-drift` entry as
unbanded.

**42 — `auth.store` / `auth.role-vocabulary` / `auth.email-normalization`: keep.** Three table names,
one capability semantics and one bootstrap invariant, none reachable without engine source. The
lockout failure mode has no in-UI recovery. `auth.email-normalization` names its own hole exactly
(a hand-run `wrangler d1 execute` insert), which is the documented late-night setup path.

**43 — supported toolchain + `check:target-stack`: keep.** `scripts/checks/check-target-stack.mjs`
verified present. The `@cloudflare/workers-types ^5` note describes a failure that produces no error
on a `skipLibCheck: true` project, which is the strongest anonymous-consumer content on the page.

**44 — `config.bindings` / `config.media-bucket` / `config.observability`: keep.** `EMAIL` and
`AUTH_DB` are cairn's names by identity; the Worker looks them up by literal string, so a typo
deploys cleanly and fails at the first sign-in. `config.media-bucket` is a cross-file adapter↔wrangler
consistency check no single-file tool holds.

**45 — `no-uncompiled-class`: reshape.** `config.ts:24-27` `DEFAULT_SHEET_CANDIDATES` (falling back to
`node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css`) and `:154` `fail('sheet must be a
path')` both verified. Arm A is absolute and the rule is error tier, which is exactly why the missing
list form is worth fixing: the engine sold the `CairnAdminShell` custom-route seam and then shipped a
gate that cannot see through it.

**47 — `config.dependency-floors`: reshape, and the case is stronger than argued.**
`check-floors.ts:58` skips with *"no package-lock.json found (a pnpm or yarn lockfile is not read)"*.
Three further silent-skip paths the ranking did not name: `:68` a lockfile v1, `parseVersion` at
`:17-21` (any prerelease or build tag), and `caretFloor` at `:27-30` (any non-caret peer range).
Every one is a skip, and a skip never moves the exit code. The best-shaped mechanism in the doctor
has the widest silent-skip surface in it.

**48 — `norms` subcommand and the manifest: keep.** Verified `norms.yml` is `workflow_call` +
`workflow_dispatch` only, and `publish.yml:27-31` calls it and gates on it, so a cut cannot ship a
stale manifest while the check stays rehearsable off the publish path. The palette-relationship
storage is what makes it survive a consumer re-theme.

**49 — `publishedAt` carry-forward: keep.** `vite/internal.ts:213-217` and `carryPublishStamps` at
`:230-241` verified, including the corrupt-file degradation with its stated reason (*"regenerating
is how a site repairs a corrupt manifest"*) and the `console.warn` that announces the loss. A one-way
door with no other detector.

**50 — `cairn-manifest` command: reshape.** Both defects verified. `vite/bin.ts:7-10` really does
call `process.exit(1)`, against the note repeated verbatim in `doctor/bin.ts:1-7`, `audit/bin.ts`
and `media-seed/bin.ts`. It reads no argv. Adoption re-measured independently: **5 of 5**
(`ecxc-ski`, `907-life`, `aksailingclub-org`, `xcathletes-org`, `cairn-pub` all wire
`"cairn:manifest": "cairn-manifest"`). The evenness defect is on the one command every consumer runs.

---

## Cross-cutting

**C1 — The condition registry is a better Arm A oracle than the reference table, and the ranking
under-used it.** Rank 4 was decided on the reference row and got it backwards; the registry's `why`
and `severity` fields carry the engine-owned reasoning the reference table compresses away. Two
places where `severity` and the check's own return disagree are worth a sweep of their own:
`edge.hsts` (`warning` → `fail`), and `admin.mount-shape` / `skill.admin-screens` (`warning` →
cannot fail at all). A check whose registry severity is `warning` should not be able to move the
exit code, and one that can never fail should not occupy a gate slot. That is a single coherent
rule the doctor does not currently hold.

**C2 — All nine static rules gate at error tier, and the ranking never tested that.**
`docs/reference/cairn-audit.md:64` says so plainly: *"Nine rules run, all error tier."* Verified in
source for all nine. The tension is with the sentence rank 30 singles out for praise: advisory
*"because each advisory rule measures a compositional question a legitimately novel component can
answer differently on purpose."* A 150-250ms motion band, a seven-role type scale and a spacing
grid are compositional questions a legitimately novel admin can answer differently on purpose, and
they gate — over `DEFAULT_STATIC_SCOPE`, which includes `src/routes/admin` and `src/lib/components`,
i.e. **the consumer's own components**.

Three things stop this from overturning ranks 12, 37 and 40, and I let them stand on this basis:
the tool is opt-in (unlike the `cairnManifest` plugin, `cairn-audit` gates nothing until a consumer
wires it); the tier is documented in one sentence on the reference page; and the suppression contract
(rank 22) gives a per-finding escape that requires a written reason. But the asymmetry is real and
undiscussed: the rendered surface reasoned carefully about which questions may gate, and the static
surface gated everything. If any static rule should be advisory on an anonymous consumer's own
components, `motion-band` is the candidate, and the question deserves to be asked rather than
inherited.

**C3 — Two "absence of objection" clusters are load-bearing and should be labelled as such.**
Every `create-cairn-site` item (21, 24, 25, 38, 46) rests on a tool with `version: "0.0.0"` and a
404 on npm, and every `cairn-doctor` item rests on a command **zero** family sites wire as a script.
Rank 46 is the exception that proves it: the one create-cairn-site item with an affirmative,
measured objection is also the one that overturns a sibling item's keep (rank 21). The pattern to
expect is that the first real anonymous consumer overturns more of this cluster, not fewer.
