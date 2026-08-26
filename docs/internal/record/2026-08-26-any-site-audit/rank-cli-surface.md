# CLI surface — retroactive any-site audit ranking

Subsystem: the four `bin` commands (`cairn-doctor`, `cairn-manifest`, `cairn-media-seed`,
`cairn-audit`), the supported-toolchain contract that rides with them, and the
`create-cairn-site` scaffolder. 50 items, ranked weakest to strongest anonymous-consumer case.

## How the gate reads on a CLI

The standing gate is written for exports. Applied to a command it reads:

**Arm A (the site cannot legally reach or patch the surface)** passes when the check or command
encodes a contract **only the engine owns and only the engine can change**: cairn's binding names,
its site-config parser, its manifest serialization, its auth-store schema, the compiled class set
of the admin stylesheet it ships, its condition registry, its norms manifest. A site cannot
re-derive any of those without reaching into engine internals, and when the engine changes one, a
site's hand-rolled copy rots silently.

Arm A **fails** when the check encodes *a third party's* published grammar — a Cloudflare zone
toggle, a SvelteKit route id, a WCAG number, a DaisyUI class name — which the site owns as much as
the engine does and which a generic tool checks as well or better. This is the same discriminator
the delivery verify pass applied to `unlistedRoutes`: *"both rules the function encodes are
SvelteKit's published grammar, not cairn's."*

**Arm B (a ratified, measured grammar has diverged)** is the native arm for `cairn-audit`: every
rule that measures the admin against the norms manifest or a recorded ruling is Arm B by
construction. It also catches the doctor checks where **the engine's own scaffolder diverged from
the engine's own checker**.

## Adoption facts, measured 2026-08-26

Measured against the six family repos, not asserted:

| Command | Adopters |
|---|---|
| `cairn-manifest` | **5 of 5 sites** wire it (`"cairn:manifest": "cairn-manifest"` in ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub) |
| `cairn-media-seed` | **1** (aksailingclub-org, and only for the Cloudflare Access case `--header` exists for) |
| `cairn-audit` | **2 config files** (aksailingclub-org, cairn-pub) |
| `cairn-doctor` | **0** wired as a script anywhere; every hit is a lockfile, a plan, or a doc |
| `create-cairn-site` | **0 anywhere. `npm view create-cairn-site` → 404. `version: "0.0.0"`.** ROADMAP: `- [ ] **create-cairn-site ships**` — still unchecked |

That last row governs every create-cairn-site verdict below. **No anonymous consumer has ever run
this tool.** Nothing in it has been proven against the bar this audit applies; its whole case is
prospective. That is not a reason to retire it, but it is a reason no item in it earns a keep on
adoption evidence, and it is decisive for the cost-narrative item.

---

# Rank 1 — `check:dogfood` proposed into `cairn-audit` (coherence C13 / R-8) — **retire the proposal**

The coherence pass wrote: *"an export the engine could use and does not is a shape defect until
argued otherwise. The mechanical half is detectable — a public export with zero `src/lib` call
sites outside its own module and zero showcase call sites — and belongs in `cairn-audit` or a
`check:dogfood` script."*

**The rule is right. `cairn-audit` is the wrong home, and this is a decline of the home, not of the
rule.** Three reasons, each independently sufficient:

1. **Subject matter.** `cairn-audit` is a *design-language* audit. The reference page says so twice:
   *"`cairn-audit` is the design-language audit"* and *"All 23 registered rules audit the `/admin`
   surface."* A rule counting call sites of a TypeScript export is neither design nor `/admin`.
2. **Audience.** The tool ships to consumers: *"`cairn-audit` ships whole, as consumer product."* A
   dogfood rule measures **the engine's own** discipline. Shipping it means every consumer installs,
   and every consumer's registry lists, a rule that can never fire in their tree.
3. **The registry gate forbids it.** `check-package-files.mjs:172-178` walks
   `rules/static/index.ts` and `rules/rendered/index.ts` and fails on any module a registry cannot
   reach. A dogfood rule would have to register, and registering ships it.

**Correct home: `scripts/checks/check-dogfood.mjs`**, beside the eighteen sibling `check:*` scripts
this repo already runs (`check:reference`, `check:surface`, `check:symbols`, `check:consumers`).
That is where every other engine-hygiene tripwire in this repo lives, it runs on every push, and it
reaches no consumer. The workstation watch-item rule is satisfied identically either way — it asks
for a tripwire, not for a particular tool.

Anonymous-consumer case: **none, in `cairn-audit`.** Rank 1.

---

# Rank 2 — `unlistedRoutes` proposed as a rendered `cairn-audit` rule — **retire the proposal**

`verify-delivery`'s rank-5 entry retired the export and floated the relocation:
*"Relocating the check into `cairn-audit`'s rendered rules is feasible (that tool does fetch a base
URL) but is a new tool feature that must clear the gate on its own merits, not a reshape of a
passing export."*

Clearing it on its own merits: **it fails.**

- **Arm A fails for the same reason it failed as an export.** The verify pass established that the
  function encodes *"SvelteKit's published grammar, not cairn's (`sitemap.ts:31-41` is two
  regexes)"*. Moving the two regexes into a rule file does not change whose grammar they are.
- **Arm B fails.** No ratified cairn grammar governs route-id parsing.
- **The subject is wrong twice over.** Sitemap completeness is not a design question, and the
  routes it would inventory are the site's **public** pages — outside the `/admin` surface all 23
  rules audit, and outside `DEFAULT_RENDERED_PAGES` (`config.ts:44-51`, six `/admin/*` entries).
- **The harness cannot do it.** Rendered mode visits a fixed page list and measures each page's own
  DOM. A completeness check needs the route *manifest*, which no rendered rule receives.

The verify pass's own two strongest sentences — *"the engine exported the cheap half"* and *"this is
not delivery output at all"* — argue for removal, and relocation is removal wearing a new hat.
Rank 2, above rank 1 only because it would at least serve a consumer if it worked.

---

# Rank 3 — `skill.admin-screens` check and `cairn-doctor --fix` — **retire from the doctor**

`bin.ts:40-49` runs `installSkill` before the check registry; `check-skill.ts` hashes the installed
tree against the packaged one; `skillFreshness` occupies one of the nineteen default check slots
(`assemble.ts:207`).

**The doctor's stated job:** *"`cairn-doctor` is the setup preflight. It probes the configuration a
deployed cairn site depends on."* A Claude Code skill is not configuration a deployed site depends
on. The reference page concedes the whole point twice: *"This check never fails; it skips with
guidance (missing or stale) rather than gating a deploy on a development aid"* and *"It never fails
the run, since the skill is a development aid, not a deploy blocker."*

**Worse, the engine's own aid creates a hazard the consumer must patch.** From the same page:

> The installed skill's own reference files quote utility class names verbatim as worked examples,
> and Tailwind v4's automatic source detection scans any non-ignored file under the project,
> `.claude/` included. Exclude `.claude/` from the site's own Tailwind build (an `@source not`
> directive, or the equivalent of a `.gitignore` exclusion for the toolchain in use) so those
> examples never compile into the site's own shipped CSS.

An anonymous consumer who runs the documented `npx cairn-doctor --fix` and does nothing else ships
dead utility classes in production CSS. A tool that hands you a footgun and a paragraph about
holding it is the wrong shape.

**And the anonymous consumer is assumed to use one specific agent harness.** `.claude/skills/` is
Claude Code's directory. A consumer using Cursor, Copilot, or no agent gets a check slot, a flag,
and a hazard, all inert.

Reshape, not deletion of the skill itself: the packaged skill is real value. Give it its own verb
(`npx cairn-skill install`), or ship it as a documented path a consumer copies. Off the deploy
preflight either way. Rank 3.

---

# Rank 4 — `edge.https-forced` + `edge.hsts` — **reshape**

Both read a Cloudflare **zone setting** through the API. Neither touches anything cairn owns.

`edge.hsts` is worse than merely generic: the reference page documents that it **false-fails a
correctly configured site**, and that cairn does not need it anyway.

> It reads that setting and nothing else, so a site adding the header another way (a Transform Rule,
> a `_headers` file, its own hook) still reports a failure here. cairn's admin responses carry their
> own `Strict-Transport-Security` max-age whatever the zone says, so a failure names the rest of the
> site rather than `/admin`.

Read that against the exit-code contract: *"1 | At least one check failed."* So a site that sets
HSTS by Transform Rule — a completely ordinary Cloudflare configuration — gets a red doctor, in CI,
forever, for a header cairn already sets itself on the only surface cairn owns. The check gates a
deploy on a question about *the rest of the site*, which by charter is the developer's domain.

**Arm A fails** (zone toggles are Cloudflare's grammar, and `cf-terraform`, the dashboard, and a
three-line `curl` all read them). **Arm B fails** (no ratified cairn grammar). The failure clause
applies: the hand-roll is small and the value is discoverability.

Reshape: demote both to advisory (report, never gate), or drop `edge.hsts` and keep
`edge.https-forced` as advisory, since an origin served over plain http genuinely breaks cairn's
`__Host-` cookie prefix — that narrower claim *is* cairn's and belongs in `config.public-origin`,
which already makes it (*"uses https, with http allowed only on `localhost`"*). Rank 4.

---

# Rank 5 — `chip-ground-collision` — **reshape**

The reference page's own verdict, quoted whole because it is the strongest self-indictment on the
surface:

> **Demoted from error to advisory** (design infrastructure Pass 3, corpus C, 2026-07-28): the
> formula has no chroma term and cannot see hue, which produced **24 false errors of 40** on the
> first consumer admin it measured, so as coded it could not serve as a consumer gate.

A 60% false-positive rate on its first real consumer contact. The demotion is honest and correct,
but a rule that reports advisories at that rate trains a reader to stop reading the advisory
section, which damages the eight advisory rules that *are* trustworthy. The evenness cost lands on
the whole tool.

The formula is engine-owned (Arm A holds: only the engine ships the palette and the recipes), and
the repair is filed. But the item as it stands today ranks near the bottom because the anonymous
consumer's experience of it is noise. Reshape: hold it out of the registry until the chroma repair
lands, rather than shipping a rule the docs say does not work. Rank 5.

---

# Rank 6 — `form-font-parity` — **reshape**

Registered provisionally, by its own registry comment (`rules/rendered/index.ts:11-13`) and the
reference page:

> **Registered provisionally at advisory**: the intended tier is error, promoted only once a CI
> re-check confirms the rendered suite is green ... Error-tier promotion also waits on the exemption
> net, which is still coarse: it misses variant-prefixed forms (`md:font-mono`, `dark:font-mono`),
> `font-serif`/`font-sans`, and Tailwind 4's `font-(family-name:--x)` shorthand, any of which would
> false-positive as a mismatch today.

The rule's *purpose* is excellent and squarely Arm A: *"this is the UA reset layer's own regression
tripwire, catching a consumer whose sheet never reached the page."* Only the engine ships that reset
layer; a consumer cannot write this check. That is why it ranks above rank 5 rather than beside it.

But three named false-positive classes, shipped, is the same defect shape as rank 5 at smaller
scale. Reshape: close the exemption net (a `font-` family-utility match that tolerates variant
prefixes is a few lines) before the promotion, and say in the report that a finding may be an
exemption miss. Rank 6.

---

# Rank 7 — `container-inset-asymmetry` and `field-edge-alignment` — **keep**

Both are geometry heuristics over arbitrary layouts, and both say so:

- `field-edge-alignment`: *"Advisory, since 'same column' is read from rendered geometry rather than
  a DOM contract, a heuristic over arbitrary layouts."*
- `container-inset-asymmetry`: *"Advisory: the threshold is judged, and a deliberately asymmetric
  layout is a real composition this rule can't tell from a defect."*

They are honest about being judgment calls, correctly tiered, and each caught a real defect on a
real consumer corpus: the staircase field at 1440px, and *"the case a consumer's corpus actually
surfaced, an unreset user-agent default: a bare `<ul class=\"list\">` keeping the 40px bullet indent
read as a 40px left inset against a 0px right one."*

**Anonymous-consumer case:** the `<ul class="list">` case is not family-shaped at all. It is
DaisyUI's `.list` plus a UA default, which any consumer styling a list in the admin hits. Arm A
holds thinly (the thresholds are calibrated against cairn's own admin, which only the engine ships).

Keep. They are the weakest *keeps* on the audit side, not failures. Rank 7.

---

# Rank 8 — `admin.mount-shape` — **reshape**

> This check never fails; it skips with guidance when it cannot see the mount, so an unconventionally
> wired site never goes red.

It is *"a heuristic text read that tolerates a renamed composer"*, looking for a `shellLoad` call
and a `CairnAdminShell` render across the `/admin` route files. When it finds them: pass. When it
does not: skip with a fix line. It has no failing state.

**Arm A holds** — the four-file mount is cairn's own contract and nobody else's. That is why it
ranks above the declines. But a check with no failing state is a documentation link wearing a check
costume, and it spends one of nineteen report lines to say "I could not tell."

Reshape: fold it into the same distinction the ROADMAP already demands of the whole report — *"make
'could not find a file to check' a result distinct from 'checked and passed' wherever the doctor
reports it."* A third status (`INFO`, or a `notes` block) serves this and `config.csrf-disable`
(rank 16) at once. Rank 8.

---

# Rank 9 — `ai.posture-effective` — **keep**

A plain `GET /robots.txt` against the deployed origin. The check is narrow by design:

> It fails on one case only: a site that declares an `aiPosture` the served file doesn't carry,
> which is a stated stance crawlers never read. A site that declares none passes, since absence is
> honest, and so does a managed layer ... prepending directives cairn didn't write, since whether
> that's wanted belongs to the zone's owner.

**Arm A passes.** `aiPosture` is a cairn adapter concept; the gap between "declared in the adapter"
and "served at the edge" is a gap only the engine can name, because only the engine knows what the
declaration was supposed to produce. A consumer cannot write this check without re-reading cairn's
adapter.

It ranks low because the failure it catches is a stated-stance mismatch, not a broken site, and
because the check needs a deployed origin to run at all — so on a fresh setup, the moment the doctor
is most useful, it skips. Keep as shipped; the narrowness is a virtue here, and the restraint about
managed layers is exactly right. Rank 9.

---

# Rank 10 — `config.tidy-key` — **reshape**

The most elaborate single check on the surface:

> When `tidy.enabled` is `true` in the site config, and a literal `ANTHROPIC_API_KEY` value is
> readable locally (typically `.dev.vars`), the doctor actively probes it with a zero-token
> Anthropic call and reports valid or invalid distinctly. When only the key's name is referenced (a
> real deployed Worker secret, invisible to any CLI) it passes on presence alone and says so; a
> network failure during the probe fails soft to an unverified pass rather than claiming the key is
> invalid.

Three outcome modes, an outbound third-party API call, and a fail-soft branch, for **an opt-in
feature that is off by default**. And note the honest admission: on a real deployed site the secret
is *"invisible to any CLI"*, so the interesting branch — the live probe — can only ever fire against
a local `.dev.vars`, which is the case the developer can check by hand in one `curl`.

**Arm A passes narrowly** (Tidy is cairn's feature, and the `tidy.enabled`-gated relationship
between the site config and the binding is cairn-owned). **The active probe half fails it**:
validating an Anthropic key is Anthropic's grammar, not cairn's.

It also shares `config.bindings-missing` as its condition id (per the reference table), so a
failure here prints a remediation written for a missing wrangler binding.

Reshape: keep the presence-and-wiring half; drop the live Anthropic call, or move it behind the same
opt-in discipline `--send-test` and `--probe` already establish for network side effects. The doctor
already has a ratified idiom for "this check touches a live third party": a flag. This check ignores
it. Rank 10.

---

# Rank 11 — No `--help` on any of the five commands — **reshape**

Verified by grep: `grep -rn "'--help'" src/lib/ packages/create-cairn-site/src/` returns **nothing**.

- `cairn-doctor --help` → `unknown argument --help` + usage, **exit 2** (`assemble.ts:77`)
- `cairn-audit --help` → `unknown argument --help` + usage, **exit 2** (`config.ts:240`)
- `cairn-media-seed --help` → same shape (`media-seed/assemble.ts`)
- `cairn-manifest --help` → **silently ignored**; it takes no argv at all (`vite/bin.ts` calls
  `writeManifest(process.cwd())` and never reads `process.argv`)
- `create-cairn-site` has `--version` (`args.mjs:16`) and no `--help`; Node's `parseArgs` with
  `strict: true` throws

**This is the purest Arm A item in the audit.** A consumer literally cannot add `--help` to a bin
the engine ships. And it is the single most likely first keystroke of a developer who just saw
`cairn-doctor` in an install log — the anonymous-consumer case needs no argument at all.

Three separate defects, not one: the flag is missing everywhere; the exit code for asking is 2, the
code reserved for *"The run couldn't start"*; and `cairn-manifest` is inconsistent with its three
siblings by ignoring argv entirely rather than rejecting it.

Reshape: `--help` on all five, printing the existing `USAGE` constant, exit 0. `cairn-manifest`
gains argv parsing that accepts `--help` and rejects everything else, matching its siblings.

It ranks 11 rather than higher only because the cost of not having it is friction, not breakage —
and the standing gate says a discoverability problem is a weak case. But this is discoverability the
consumer *cannot* fix, which is the distinction the failure clause turns on. Rank 11.

---

# Rank 12 — `focus-parity`, `motion-band`, `reduced-motion` (static) — **keep**

Three static rules over hand-authored CSS.

`motion-band` is Arm B outright: *"Every transition or animation duration lands in the admin's
`150ms` to `250ms` band"* — that band is a ratified cairn number, recorded in
`admin-design-system.md`, and only measurable against the engine's own decision.

`focus-parity` and `reduced-motion` are general web hygiene: a `:hover` needs a `:focus-visible`
sibling, and a motion declaration needs a `prefers-reduced-motion` guard. Any linter could want
those. What keeps them here is scope discipline the engine had to reason about and a consumer would
get wrong: *"Tailwind's `hover:` variant classes are deliberately out of scope: their keyboard
affordance is the admin's blanket focus ring, a real guarantee of a different shape."* That
exemption is only correct **because cairn ships the blanket ring**. A consumer writing this rule
from scratch would either flag every `hover:` class (noise) or skip the hand-authored ones (the real
gap).

Keep. Arm A holds through the exemption, not through the rule. Rank 12.

---

# Rank 13 — `auth.role-wiring` — **keep**

> When the adapter declares custom roles with `defineRoles`, `src/hooks.server.ts` passes the same
> vocabulary to `createAuthGuard({ roles })` (a heuristic text read), so a role outside owner/editor
> resolves to its declared capability instead of falling back to `none`.

**Arm A passes cleanly.** This is a two-place cairn contract — a declaration in the adapter and a
matching argument in the hook — with a silent, security-relevant failure mode: the role resolves to
`none` and an editor loses access with no error anywhere. Nothing outside the engine knows the two
places have to agree.

It ranks low only because it is a text heuristic with three skip conditions (*"The site declares no
custom roles, `src/hooks.server.ts` is not found, or the heuristic cannot read the
`createAuthGuard` call"*), so on a site that renamed its hook or passed a variable, it goes quiet on
exactly the site most likely to have gotten the wiring wrong.

Keep, and it should ride the same INFO-vs-PASS reshape as rank 8. Rank 13.

---

# Rank 14 — `cairn-media-seed --header` — **keep**

> `--header 'Name: value'` | No, repeatable | Forwarded on every download request. Repeat the flag
> for multiple headers; a later `--header` for the same name overwrites an earlier one.

**Family-originated, and visibly so.** The one adopter is aksailingclub-org, whose script is:

```
"media:seed": "cairn-media-seed --from https://dev.aksailingclub.org --header \"CF-Access-Client-Id: $ASC_ACCESS_CLIENT_ID\" --header \"CF-Access-Client-Secret: $ASC_ACCESS_CLIENT_SECRET\""
```

That is one family site's Cloudflare Access setup, and the reference page names the same case:
*"For a site behind Cloudflare Access or another auth gate."*

**The any-site case survives anyway, and it is the shape argument that saves it.** The flag is not
`--cf-access-id/--cf-access-secret`; it is a generic repeatable header. Basic auth, a staging bearer
token, a VPN gateway header, a `User-Agent` allowlist — every one of them is the same flag. Charter
constraint 3 (re-derive, never transplant) is *already satisfied*: the engine did not transplant
ASC's Access credentials into a bespoke flag, it re-derived the general form. This is the item on
the whole surface that best models what constraint 3 asks for.

Keep unchanged. `absenceOfObjection: false` — there is affirmative evidence (a live adopter with a
real gate), not merely nobody complaining. Rank 14.

---

# Rank 15 — `CAIRN_AUDIT_COOKIES` — **keep**

> Set `CAIRN_AUDIT_COOKIES` for that, the run-specific credential belonging in the environment
> rather than the config file, the same reasoning `BASE_URL` follows.

Without it the entire rendered mode is close to useless on a real site, and cairn-pub's own config
file documents exactly that trap in a `$comment` it had to write by hand:

> Run against a deployed or previewed admin with a session cookie: `BASE_URL=...
> CAIRN_AUDIT_COOKIES='__Host-cairn_session=...' npx cairn-audit --rendered`. **Without the cookie
> every page redirects to the sign-in card and the run measures that card once per entry while
> reporting zero errors.**

That is a consumer writing a warning about a silent green, in their own config file, in a tool whose
stated purpose is *"the silent green this engine exists to rule out."* The seam works; its
discoverability does not.

The two throw conditions are exactly right and are the reason this keeps rather than reshapes:

> an entry with no `=`, or an empty name, since a typo here should never produce a quietly narrower
> audit; and an entry named `cairn-admin-theme`, since the run owns that cookie itself.

**Arm A passes**: the session cookie name and the theme-cookie collision are both cairn's.

Keep the mechanism. The reshape belongs on rank 32 (the config contract), where the redirect trap
should become a harness refusal rather than a comment every consumer rediscovers. Rank 15.

---

# Rank 16 — `config.csrf-disable` — **reshape**

> `svelte.config.js` carries `checkOrigin: false` outside a comment, and `src/hooks.server.ts` (or
> `.js`) wires the cairn guard (a heuristic text read of both files).

**Arm A passes emphatically.** The CSRF handoff — cairn disabling SvelteKit's `checkOrigin` and
taking ownership in its own guard — is the single most security-load-bearing configuration contract
the engine has, and it is invisible to every generic tool.

**And it is broken in a documented, narrowed way.** From ROADMAP:

> a bare `sv create` scaffold ... **writes no `svelte.config.js` at all**, wiring the adapter inside
> `vite.config.ts`'s plugin call instead ... So this check fires its skip path on every site built
> from a current `sv create` scaffold, not an edge case; it has already fired ... the run looks
> clean while the CSRF-handoff check never executed: a silent green, the worse failure mode for a
> readiness check to have.

The ROADMAP's narrowing is important and correct: a `create-cairn-site` scaffold carries
`svelte.config.js`, so the silent skip *"reaches a hand-built or bare `sv create` site, never a
cairn scaffold. That is the harder case to notice, not the easier one."*

**One ROADMAP claim I verified and must correct.** It says *"A skip is not visually distinct from a
pass in the doctor's own report."* That is false as written. `report.ts:8-12` renders
`TAG = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP' }`, and the summary line counts the three
separately: `${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped`. The tag
*is* distinct. The real defect is narrower and still real: **a skip never changes the exit code**
(*"A skip never fails the run"*), so CI stays green and nobody reads the text.

Reshape, per the ROADMAP's own candidate: read `vite.config.ts` as well as `svelte.config.js`, and
make "could not find a file to check" a distinct result. Rank 16.

---

# Rank 17 — `cairn-doctor --send-test` — **keep**

> `--send-test <address>` sends one real email ... with the fixed subject `cairn doctor test send`.
> Receiving it proves the sending path end to end, past what the onboarding check can see. It is a
> real delivery to a real inbox, so point it at your own address and leave it off in CI.

**Arm A passes, and the durable gotcha in this repo's own `CLAUDE.md` is the proof:**

> Two surfaces, two error vocabularies; the `E_` table does not cross between them. The binding
> `env.EMAIL.send({...})` throws `E_SENDER_NOT_VERIFIED`, the same string Routing uses for an
> unverified destination, **which is how the ecxc outage hid** ... The REST send throws no `E_`
> codes: `10203` and `10204` (both HTTP 403) cover an unready sender, never onboarded or still
> propagating. **Elapsed time since onboarding is the only discriminator.**

A configuration check literally cannot distinguish "onboarded and propagating" from "onboarded and
broken." Only a real send can. That is a genuine Arm A case: the engine paid for this knowledge in a
production outage, and no anonymous consumer will pay for it again if the flag exists.

Opt-in, side-effecting, and correctly gated behind a flag with a documented warning. Keep as
shipped. Rank 17.

---

# Rank 18 — `cairn-media-seed --bucket` and the wrangler resolution — **keep**

> The command needs the R2 bucket's real name, not just its wrangler binding, since `wrangler r2
> object put` addresses a bucket by name. An explicit `--bucket` always wins. Failing that, the
> command reads `wrangler.jsonc` or `wrangler.toml`'s `r2_buckets` entries and uses the sole entry's
> `bucket_name` when there is exactly one. Any other shape ... is an error naming `--bucket` as the
> fix.

The binding-vs-name distinction is a real Cloudflare trap, and the resolution ladder handles it
without guessing: `resolveBucket` (`assemble.ts:112-124`) returns `{ error }` on zero, several, or a
nameless entry rather than picking one. Refusing to guess when several buckets exist is the right
call — a wrong guess writes real objects into the wrong bucket.

**Arm A is thin here** (reading `r2_buckets` from a wrangler file is Cloudflare's grammar), but the
reuse is exemplary: `bin.ts:12` imports `readR2Buckets` **from `../doctor/wrangler-config.js`**, so
the two commands share one parser. That is the engine's own dogfooding done right, and it is the
counterexample to coherence C13's finding. Worth naming as a protected property.

Keep unchanged. Rank 18.

---

# Rank 19 — `cairn-doctor --probe` — **keep**

The outside-in complement, and the most carefully designed thing on the doctor surface:

> The probe is **side-effect free by construction**. It submits a random non-editor address at the
> reserved `example.invalid` domain, and the engine's non-leak design answers a non-editor exactly
> like a successful send while sending no email and minting no token, so nothing lands in any inbox
> and nothing changes on the site. A `send_error` answer fails the check, which catches a deployed
> site whose send path is broken without spending a real delivery.

**This is Arm A at its strongest.** The probe is safe *only because* of a specific cairn design
decision — the non-leak equivalence between a non-editor and a successful send. A consumer writing
their own sign-in probe would either mint a real token against a real editor row or would not know
that `example.invalid` is safe. The knowledge that makes the probe harmless is engine-internal.

The `throttled` tolerance is the same quality of thinking: *"A `throttled` answer also passes, since
a re-run inside a real editor's cooldown window still proves the path."*

It ranks below the config checks only because it needs a deployed site and a `--probe` flag, so it
is absent from the default run where most consumers will meet the tool. Keep unchanged. Rank 19.

---

# Rank 20 — The post-hydration page-identity guard — **keep**

> Take a page whose settled DOM no longer matches: the run navigated to `/admin/edit/some-post` and
> the DOM that settled belongs to an unrelated 404 or a different route entirely. The runner reports
> that page unmeasurable rather than auditing it under the wrong page's identity.

This is the anti-silent-green discipline applied to the harness itself, and it gates at error tier.

**The shape is right, and this is the item that best demonstrates charter constraint 3 on the audit
side:**

> The mechanism reads only `<title>`, `<main>`, and `[role="main"]`, **none of them cairn-only
> markup**, so a consumer's own custom route and cairn's shell-less login page (which renders no
> `<main>` at all) both stay auditable: a landmark of `null` on both the SSR and the hydrated side
> counts as agreement, not as evidence of a swap.

The engine had every opportunity to key this on `.card-shell` or `PageHeader` and did not. A
consumer's custom `CairnAdminShell` route measures exactly as well as cairn's own.

**Arm A passes**: the no-JavaScript baseline context is harness machinery no consumer can install
around a tool they did not write. Keep unchanged. Rank 20.

---

# Rank 21 — `create-cairn-site` flag set, resume state store, local console — **keep**

`args.mjs` OPTIONS: `--dry-run`, `--yes`, `--name`, `--description`, `--brand-color`, `--dir`,
`--version`, `--app-name`, `--org`, `--repo-name`, `--github`, `--start-over`, `--owner-email`,
`--deploy`, `--sign-in`, `--domain`, `--email`, `--connect` — eighteen flags, plus `state.mjs`'s
resume store and `console/server.mjs`'s local browser console.

**The two hard requirements were ruled, and the flag set implements them:**

> Two hard requirements: **idempotent against a partly-provisioned account, and dry-run before it
> acts.**

`--dry-run` is threaded through every chapter (`const frame = { dryRun, log }`), and the resume
record is read per chapter (`chapter.mjs`: *"A dry run never reads the state store, and a record
this run cannot read is treated as no record at all"*).

The `--yes`/`--domain`/`--email` triple is the best-reasoned part:

> `--yes --email` turns on Workers Paid and Email Sending with no prompt; **`--yes` alone (no
> `--email`) declines rather than committing an owner to a subscription unattended.**

An unattended flag that refuses to spend money without a second explicit flag is exactly right.

Eighteen flags is a lot, and the `--connect` escape hatch (*"resumes or re-offers chapter 3 from any
step at or past `live`, ahead of whatever chapter2/chapter1 branch would otherwise claim that
step"*) is the shape of a tool whose state machine outgrew its argv. Watch it; do not reshape it now
on zero consumer evidence. Keep. Rank 21.

---

# Rank 22 — The suppression directive contract — **keep**

> Three properties make it honest, and each is its own error-tier finding when it fails:
> - **The reason is required.** A directive with no `-- <reason>` reports rather than suppresses.
> - **A directive that silences nothing is dead** and reports. An exemption that outlives its
>   finding is where the next real one hides.
> - **Neither of those errors can itself be suppressed.** A build that passes by suppression has to
>   read as one.

Plus the counting contract: *"the summary line always prints a suppression total, including when
it's zero."*

**Arm A passes.** The node-resolution semantics are not something a consumer could bolt on:

> `disable-next-line` resolves to the next syntax-tree **node**, not the next physical line ... A
> directive preceding a multi-line element covers the whole element, including an attribute several
> lines down. In a script or a CSS block, where there's no template node to attach to, it resolves
> to the next non-blank line, extended through a brace block when that line opens one.

That requires the `svelte/compiler` AST the tool already holds.

This is the most *even* sub-surface in the whole CLI audit: three properties, each its own finding,
each unsuppressable, and the same idiom mirrored in the rendered allowlist's three stale/dead/
unprobeable ids (rank 27). Protect it. Keep unchanged. Rank 22.

---

# Rank 23 — `config.public-origin` — **keep**

> `PUBLIC_ORIGIN` ... parses as a URL and uses https, with http allowed only on `localhost` or
> `127.0.0.1`. **The judgment is `requireOrigin`, the same rule the Worker applies.**

That last clause is the whole case, and it is a textbook Arm A: the check does not *reimplement* the
rule, it calls the engine's own `requireOrigin`. So the CLI verdict and the runtime verdict cannot
drift, ever, by construction. A consumer hand-rolling a `PUBLIC_ORIGIN` sanity check writes a
regex that agrees with the Worker until the Worker changes.

This is the shape coherence C13 wanted everywhere and mostly did not find (*"an export the engine
could use and does not is a shape defect"*). Here the engine used its own. Name it as a protected
property, not just a keep.

The `localhost`/`127.0.0.1` http carve-out is correct and not family-shaped: every consumer develops
locally.

Keep unchanged. Rank 23.

---

# Rank 24 — The `create-cairn-site` Cloudflare chapters — **keep**

Three chapters, 2,800 lines: chapter 1 deploys (one Worker, two D1, one R2), chapter 2 connects a
domain and turns on Email Sending, chapter 3 connects Workers Builds.

**The charter question is settled by a recorded ruling, so this is not an open scope call:**

> **The charter boundary survives the merge unchanged.** `create-cairn-site` is setup tooling a
> developer runs deliberately, so it may provision. The runtime library still must never reach for
> provisioning credentials, and folding the two tools together must not fold that line.

And the fork that produced it:

> **The design fork is SETTLED (Geoff, 2026-08-04): the same tool as the scaffolder, one
> create-a-site experience** ... a scaffolder that cannot provision has to emit a `wrangler.jsonc`
> with blank D1 and R2 identifiers for the developer to fill in by hand, while one tool writes the
> real ids it just created.

That argument is entirely an anonymous-consumer argument. Nothing in it is family-shaped. A
developer who has never seen this repo either gets real binding ids or gets a config with holes.

The honesty about what it *cannot* do is the strongest evidence of good shape:

> **Not provisionable, and it must say so with links rather than papering over it:** creating the
> API token, Email Sending onboarding (Workers Paid plus dashboard), GitHub App creation and
> installation, nameserver delegation.

Two live copy defects ride here and are already filed: the DMARC instruction
(`chapter2.mjs:801-804` prints *"add it to that [DMARC] record too"*, which names no real mechanism
— *"Cloudflare's `_dmarc` TXT record is `v=DMARC1; p=reject;`, a policy with no sender field to add
anything to"*), and the rank-46 cost narrative. Neither is a shape defect in the chapters.

Keep. Rank 24.

---

# Rank 25 — The `create-cairn-site` GitHub chapter — **keep**

*"the GitHub chapter (manifest-first own-App creation, one-trip install and authorize, repo create
with coverage verify, the no-git-binary push, the resume frame with `--start-over`, the dev shim
making bare `npm run dev` reach the local admin), proven by a recorded live e2e on a personal
account and a scratch org."*

**Arm A passes hard.** The GitHub App is not incidental to cairn — it *is* the publish mechanism.
`CLAUDE.md`: *"a deliberate Publish copies it to `main` via a **GitHub App** (committer =
`cairn-cms[bot]`, author = the editor)."* The permission set that App needs, the installation scope,
and the three credentials the Worker consumes (`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`,
`GITHUB_APP_PRIVATE_KEY_B64`) are cairn's contract end to end. An anonymous consumer creating that
App by hand from a docs page is the highest-friction step in the entire setup, and it is the step
most likely to be gotten subtly wrong (wrong permission, wrong installation scope) in a way that
fails only later, at the first Publish.

*"the no-git-binary push"* is a genuine any-site consideration: a developer on a machine without
`git` configured, or in a container, still gets a repo.

One filed first-run defect (*"the 'All repositories' requirement"* not stated at the right moment,
ROADMAP :537) is copy, not shape.

Keep. Ranks below rank 24 only because the Cloudflare chapters carry more of the setup's total
friction. Rank 25.

---

# Rank 26 — The rendered harness — **keep**

> The run fails rather than reporting clean on every shape of silent green: no rules registered, no
> pages configured, `BASE_URL` not answering, Playwright absent, or any configured page rendering
> outside 2xx, which also catches a page path that names no route.

Five named refusal conditions, all at exit 2, which the tiers section defines as *"The run couldn't
start or couldn't finish"* and insists *"is never a design verdict."*

Two decisions deserve protection:

> **Every configured page renders under both themes, always: a rule that only holds in one color
> scheme is exactly the failure mode this exists to catch.**

Not configurable. Correct — an optional dark-mode pass is an optional dark-mode bug.

> Playwright loads as a dynamic import from the consuming project's own install, printing `npm i -D
> playwright && npx playwright install chromium` when it is absent, **so a project that never runs
> rendered mode takes no browser dependency.**

That is the leanest possible seam for a heavy dependency, and it matters most to the consumer least
invested in the tool. Directly serves `CLAUDE.md`'s *"Measure INSTALL, not pack"* discipline.

> The harness never starts a server.

Right call, and consistent with the norms generator (*"the same contract the norms generator
follows"*).

**Arm A passes**: none of this is installable around a tool a consumer did not write. Keep
unchanged. Rank 26.

---

# Rank 27 — The rendered allowlist and rule-declared exemptions — **keep**

The allowlist exists because *"A live-page finding has no source line a suppression comment could
sit beside."* Three failure ids mirror the static suppression idiom:

| `rendered-allowlist-stale` | The selector matched nothing the run visited |
| `rendered-allowlist-unprobeable` | The browser refused to parse the selector. Always advisory, because unreadable is a different claim from stale |
| `rendered-allowlist-dead` | The selector still matches an element, and the entry suppressed nothing |

Two pieces of reasoning are the strongest on the audit surface:

> The dead verdict **waits on a complete run**. A rule can declare an interaction state a given page
> can't reach ... Removing an entry on that evidence would leave the next complete run gating on the
> finding the entry covers.

> **Only an advisory rule can exempt itself.** On an error-tier finding the run refuses the reason:
> the finding stays in the gating list, the exit code stands, and the report prints the refusal
> where the exemption would have gone ... **A gate any rule could quiet in one line is worth no more
> than the runs it passes.**

An engine that gave itself a self-exemption power and then capped it at advisory has answered the
"who audits the auditor" question honestly. Arm A passes (the selector-signature format is the
tool's own). Keep unchanged; protect the advisory-only cap explicitly. Rank 27.

---

# Rank 28 — `cairn-media-seed` command, exit contract, content-addressed write — **keep**

> For each manifest row with a `slug`, `hash`, and `ext`, the command downloads
> `<from>/media/<slug>.<hash>.<ext>` and writes the response body into the resolved bucket at
> `media/<hash[0:2]>/<hash>.<ext>`, **the content-addressed key the media route reads on every
> request.**

**Arm A passes decisively.** The public delivery URL shape and the internal R2 key shape are *two
different cairn-owned conventions*, and this command is the translation between them. A consumer
hand-rolling this must know both, including the two-character hash shard — engine-internal
knowledge with no external documentation source.

The exit contract is the most complete of the four bins: 0/1/2 with distinct meanings, per-failure
stderr lines (`FAILED <slug>: <message>`), and a summary that always prints
(`cairn-media-seed: <ok> synced, <failed> failed, of <total> manifest entries`).

The per-row tolerance is right and stated: *"A row missing any of those three fields is dropped
rather than failing the run. The manifest reader applies the same tolerance elsewhere."* Consistency
with the engine's own reader, not a local invention.

One weak spot: `contentTypeForExt` falls back to `application/octet-stream`
(`assemble.ts:99-101`), which is silently wrong for an unknown extension, where the run reports
success. Small; not worth a reshape.

Keep. Rank 28.

---

# Rank 29 — `cairn-doctor` shell, report, exit codes — **keep**

`bin.ts` is deliberately thin — *"A thin shell over index.ts (where the unit tests reach the logic)"*
— and one implementation note deserves protection:

> The codes go through `process.exitCode`, never `process.exit`, so a piped stdout flushes the whole
> report before the process ends.

That is a real Node hazard handled correctly here, in `cairn-audit`, and in `cairn-media-seed`, and
**not** in `cairn-manifest` (see rank 50).

The report shape is right for the job: *"Plain text, no ANSI color, so the output reads the same in
a terminal and a CI log"*, one aligned line per check, a why/fix block per failure resolved from the
condition registry, then counts. And the registry coupling is strict: *"An unknown `conditionId` is
a programming error; `condition()` throws and the report does not paper over it."*

The design commitment that makes it useful:

> A failing check never stops the run, so a single pass surfaces everything that still needs fixing.

**Arm A passes through the condition registry.** *"Each check ties to a condition in cairn's
diagnostics registry, and a failure prints that condition's why and remediation, the same text the
runtime error surfaces use."* One vocabulary across the CLI, the runtime errors, and the readiness
checklist is a coherence property only the engine can hold.

Keep. Rank 29.

---

# Rank 30 — `cairn-audit` command shape, tiers, exit codes — **keep**

Three invocations (`cairn-audit`, `--rendered`, `norms <term>`), two tiers, three exit codes.

The tier reasoning is correct and non-obvious:

> An advisory-tier finding reports and can never change the exit code, **because each advisory rule
> measures a compositional question a legitimately novel component can answer differently on
> purpose.**

That sentence is what separates a design *audit* from a design *police*, and it is what makes the
tool safe to ship to a consumer whose admin looks nothing like cairn's.

> Exit code 2 is never a design verdict. The audit reports it rather than printing a clean report it
> can't stand behind.

The `norms` subcommand's isolation is a small, real piece of good shape: `bin.ts:49` throws on
`norms --rendered` — *"pairing it with a run mode is a mistake worth naming rather than a flag worth
ignoring."*

**Arm A passes.** The tiering rests on cairn's own ratified-vs-observed distinction, which lives in
the norms manifest the engine ships.

Keep. The one gap is `--help` (rank 11) and the absence of any rule-selection flag — a consumer
cannot run one rule, which will bite as soon as somebody wants to fix `touch-targets` alone. File as
a watch, not a reshape. Rank 30.

---

# Rank 31 — `cairn-doctor` flags, env fallbacks, three-source derivation — **keep**

> Each input resolves from three places, in order: an explicit flag, the environment variable, and
> the repository the doctor runs in. The first source that yields a value wins, and derivation runs
> **lazily, only for inputs the flags and environment left missing.**

The third source is where the case lives:

> When the site's Vite config wires the `cairnManifest` plugin, the doctor **evaluates the
> configured adapter module through the site's own Vite resolution.** It reads the from-address off
> `cairn.email.from` and the repository off `cairn.backend.owner` and `cairn.backend.repo`.

`bin.ts:63-67` does exactly that, importing `readAdapterFacts` from `../vite/internal.js` with the
comment *"through the vite arm, which exists only on this bin path, never in a Worker."*

**This is Arm A at its cleanest on the doctor.** The adapter is TypeScript; reading `cairn.email.from`
out of it requires the consumer's own Vite resolution. No external tool can do it, and the payoff is
that `npx cairn-doctor` with **zero arguments** works on any correctly-wired site.

The secret discipline is right and worth protecting: *"Secrets (`CLOUDFLARE_API_TOKEN` and the
GitHub App credential trio) come only from the environment. They are never derived from the repo and
never printed."* And `contextFromEnv` assembles `github` only when the whole trio is present
(`assemble.ts:107-114`), *"so the GitHub check skips with one remediation line instead of failing on
a partial setup."*

Keep unchanged. Rank 31.

---

# Rank 32 — The `cairn-audit.config.json` contract — **reshape**

Six keys, all defaulted: *"Everything defaults, so a project with no config file gets a meaningful
run."*

**Two things are already excellent.** The scope-typo asymmetry:

> A default scan path your tree doesn't have is skipped, since the defaults span a library and a
> consumer site. A path you wrote in `static.scope` yourself fails the run when it doesn't exist: **a
> typo that quietly narrows the audit to nothing is the silent green this engine exists to rule
> out.**

Implemented as `staticScopeFromConfig` (`config.ts:79`) rather than as a filename special case. And
`static.paletteFiles` is a working, adopted seam — aksailingclub-org names
`src/theme/theme.css` and `src/chassis/tokens.css` in its own config today.

**Three reshapes, in order of severity.**

**(a) `rendered.pages` replaces rather than extends, and the docs shout about it because the shape
is wrong.**

> **Replaces the defaults, never extends them**: a config naming one page of your own audits that
> page alone, and the six core routes go unmeasured while the run still reports a clean pass.
> Restate the defaults beside your own page.

A documented trap that produces a clean report is exactly the silent green everything else in this
tool refuses. And **both adopters had to restate the six defaults by hand**: aksailingclub-org lists
the six plus six of its own; cairn-pub lists the six plus one, with a `$comment` explaining why.
Two of two consumers paid the same tax. Reshape to `rendered.extraPages` (additive), or keep
`pages` as the override and add `extraPages`.

**(b) `sheet` is a single path, so `no-uncompiled-class` cannot see a consumer's own compiled CSS.**
`config.ts:154`: `if (file.sheet !== undefined && typeof file.sheet !== 'string') fail('sheet must
be a path')`. The ASC harvest triage, item 12:

> The rule reads only the packaged sheet; the config schema (`src/lib/audit/config.ts:160`,
> `static.paletteFiles` precedent) offers no compiled-class sources, **so ASC closed a pass carrying
> six known-false-positives.**

Make it a list, exactly as `paletteFiles` and `cssFiles` already are. This is the same fix as rank
45 and should land in one edit.

**(c) The rendered-mode redirect trap** (rank 15) should be a harness refusal: if every configured
page settles on the login card, that is a silent green the run should exit 2 on, not something
cairn-pub documents in a comment.

Reshape. Rank 32.

---

# Rank 33 — `one-filled-action`, `focus-renders`, `interactive-contrast`, `viewport-overflow` — **keep**

The four error-tier rendered rules other than `touch-targets`.

**`one-filled-action`** is pure Arm B — a ratified cairn composition rule, and its surface
partitioning is reasoned from what a reader sees rather than from the DOM:

> `<header>`, `<footer>`, and `<main>` itself don't partition: a DOM boundary between a page header
> and the card beneath it removes none of the harm the rule exists to catch, same visual column,
> same first look, where a nav rail's persistent chrome genuinely reads as a different part of the
> screen.

And its exemption is structural, not nominal: *"'Filled' means the accent, read from the live
computed background, so the sanctioned ink fills are exempt by construction rather than by name."*
That is charter constraint 3 done right — no class name from any site in the rule.

**`focus-renders`** measures paint, not markup: *"compares each stop's focused paint against that
same element's resting paint, so a real outline, a `box-shadow` ring, and a ring an ancestor renders
through `:focus-within` all count, and a decorative shadow the element already carries doesn't."*
Any-site by construction.

**`interactive-contrast`** is honest about not being a WCAG rule: *"This isn't a legibility floor.
The bar is that a control isn't camouflaged against its own ground."* The opacity chain handling is
the correct direction: *"a dimmed wrapper lowers the measurement rather than raising it."*

**`viewport-overflow`** at 390 and 320 is the family responsive standard applied mechanically, and
320 is where every consumer's admin breaks first.

The shared color method is the reason to trust all four:

> Every rule that compares two colors resolves them by painting each one on a canvas in the page and
> reading the sRGB bytes back, rather than parsing color syntax ... **a parser is the one component
> in this pipeline guaranteed to be wrong about a real value.**

Keep all four unchanged. Rank 33.

---

# Rank 34 — `touch-targets` — **keep**

> Every tap target renders at least 24x24 CSS px at a 390px viewport. This is a house floor derived
> from WCAG 2.2 level AA's success criterion 2.5.8 ... **and not an implementation of it: the rule
> enforces a strict superset, so a finding is a house-bar failure and not on its own an AA
> failure.**

Ranked above rank 33 for one reason: it is the most rigorously **bounded** rule in the engine. Five
stated limits, none hidden, including the one that most weakens it:

> **Spacing.** An undersized target is exempt when a 24px-diameter circle centered on it intersects
> no other target's circle. This is the one most admin toolbars pass on, and it's the largest gap:
> **on cairn's own admin, 8 of the 10 errors this rule raises clear it.**

An engine that publishes "80% of my own findings would be exempt under the criterion I borrowed
from" is not overclaiming. Also stated: the target net excludes `textarea`/`[role="tab"]`/custom
`tabindex` controls; findings collapse per selector signature so *"A count here counts shapes, not
elements, and it isn't a remediation estimate"*; the enforced bar is 23.984375 for Chromium rect
snapping; an off-canvas skip link is exempt.

**The measurement is genuinely engine-grade and not hand-rollable:** *"the control's own box, unioned
with a qualifying `::before` inset expansion, plus every label the platform reports as activating
the control. A control passes when any one of its regions clears the floor."* Reading the platform's
own label association, not a DOM guess.

`what-touch-targets-doesnt-cover` should stay in the docs verbatim; it is the reason the rule can
gate at error tier without lying. Keep unchanged. Rank 34.

---

# Rank 35 — `email.sender-onboarded` — **keep**

> The from-domain has an enabled Email Sending subdomain on its zone.

**Arm A passes through the durable gotcha, which is this repo's most expensive piece of knowledge:**

> Onboarding is `wrangler email sending enable <domain>` with the zone's apex name; arbitrary
> recipients need Workers Paid. It writes DNS records including an apex DMARC at `p=reject`, and
> **deleting the subdomain leaves that record behind.**

Magic-link auth is cairn's front door. If the sender is not onboarded, **no editor can ever sign
in**, and the error the consumer sees is `E_SENDER_NOT_VERIFIED`, the same string Email Routing uses
for a completely different failure — *"which is how the ecxc outage hid."*

A check that resolves an ambiguity a production outage in this family could not resolve is not a
family-recurrence argument; it is a claim about the platform's error vocabulary that any consumer of
that platform inherits. The anonymous consumer hits it on day one, not on day one hundred.

Keep unchanged. Rank 35.

---

# Rank 36 — `github.app` — **keep**

> The App key parses and signs, an installation token mints, and the repository answers a read.

And the reference page's own summary of why it is shaped this way:

> The GitHub check **walks the exact chain the Worker walks on a save**, so a green check means the
> commit pipeline's credentials work, and a failure names which link broke.

**That is the strongest single sentence in the doctor's documentation**, and it is Arm A by
construction: the chain is cairn's — PEM parse → JWT sign → installation token mint → repo read —
and it exists in exactly this sequence because `src/lib/github` walks it on every Publish. A
consumer testing "does my GitHub App work" with `gh api` proves something adjacent, not the same
thing.

Three credentials, three ways to get one subtly wrong (a PEM re-wrapped by a copy-paste, an
installation id from the wrong installation, an App id vs a client id), and all three fail
identically at the first Publish, hours after setup, with the editor watching.

The skip condition is right: `contextFromEnv` builds `github` only on the complete trio, so a
partial setup skips with one remediation line instead of failing confusingly.

Keep unchanged. Rank 36.

---

# Rank 37 — `stock-default-hazards` — **keep**

> Four stock daisyUI patterns cairn's own recipes replace: `badge-ghost`, the focus-driven bare
> `.dropdown`, a native `disabled` on a guarded button, and a flat `base-300` card border. **Each
> finding names the refuted alternative and where the decision is recorded.**

**This is Arm B in its purest form on the whole surface.** Every one of the four is a recorded cairn
ruling against a specific DaisyUI default, and the finding text carries the citation. That is not a
lint rule; it is a ratified grammar enforcing itself.

**The anonymous-consumer case is unusually strong and is the reason this outranks the other statics.**
The workstation rule states the pattern:

> **A repeated local workaround is the loudest signal that something sits at the wrong altitude**:
> "this repo has patched this before" is an automatic filing trigger.

And the family measured it: *"an unselected `.btn` has no visible edge against `base-100` or
`base-200` at `--depth: 0` (**the invisible-edge mechanic already patched three times across cairn
sites**)". Three independent rediscoveries of a DaisyUI default, by people who had already fixed it
elsewhere. A consumer building a DaisyUI admin who has never heard of cairn reaches for
`badge-ghost` and a bare `.dropdown` for exactly the same reason: they are what DaisyUI's own docs
show. The recurrence here is evidence of a *DaisyUI* property, not a family property, which is the
distinction the standard's rule 2 turns on.

Keep unchanged. The ASC and xcathletes harvests ask for more rules of this exact shape (the
`tokens.css` exclude-list cross-reference, the contrast trio), which is a vote of confidence in the
shape, not a defect in it. Rank 37.

---

# Rank 38 — `create-cairn-site` command, template bake, `check:template` — **keep**

`bin.mjs` (674 lines) plus `prepack: node scripts/bake-template.mjs --to template` and the root's
`check:template` (`emit-template-dir.mjs --check`).

**The ruling that this must be a published package is entirely an anonymous-consumer argument:**

> **It ships as a published `create-*` package**, since the ruling's whole point is a single
> experience for someone who has not cloned this repo. A repo script only a cloner can run cannot be
> that.

`create-*` is npm's own convention (`npm create cairn-site`), so the anonymous consumer's first
contact costs zero prior knowledge. And the bake keeps the template honest: it is derived from
`examples/showcase`, the tree the engine's own test suite runs against, so what a consumer receives
is the tree cairn proves changes on rather than a hand-maintained copy. `check:template` fails the
gate on drift.

**The only reason this does not rank higher is that it does not exist yet.** `npm view
create-cairn-site` returns 404, `version` is `0.0.0`, and the ROADMAP item is unchecked. The
adoption evidence is zero, and two of the four recorded first-run defects
(ROADMAP :526-555) are still open, including *"`scaffold.mjs:250` prints 'Those steps arrive with
the next...'"* — copy that contradicts the tool's own behavior.

Keep. `absenceOfObjection: true` — nobody has objected because nobody has run it. Rank 38.

---

# Rank 39 — `config.site-config` — **reshape**

> `site.config.yaml` parses and its URL policy validates.

**Arm A is unambiguous, and the reference page states it precisely:**

> For the site config, the doctor **runs the engine's own parser and URL-policy validator**; whether
> each policy key names a concept the adapter declares is the one thing it cannot see, since the
> adapter is TypeScript.

Calling `parseSiteConfig` rather than reimplementing it is the `requireOrigin` pattern again (rank
23), and `checks-local.ts:157-159` documents the Contract v2 hard-error on a stale per-concept
`content:` block. A consumer cannot get this right by hand; the parser's rules change with the
engine.

**And the engine's own scaffolder diverged from the engine's own checker. Verified today, still
live:**

```
checks-local.ts:138  const SITE_CONFIG_PATHS = ['site.config.yaml', 'src/lib/site.config.yaml', 'src/site.config.yaml'];
```

```
$ find packages/create-cairn-site/template examples/showcase -name site.config.yaml
packages/create-cairn-site/template/src/theme/site.config.yaml
examples/showcase/src/theme/site.config.yaml
```

`src/theme/site.config.yaml` is in neither list. The ROADMAP filed it:

> the baked template ships it at `src/theme/site.config.yaml`, which is in none of the three, so the
> check reports **a skip rather than a pass on every scaffolded site**. `docs/reference/doctor.md:21`
> tells an admin to run the doctor from the directory holding a file that, per the candidate list,
> is never actually where the tool looks for it on their site.

**This is Arm B on the doctor**: a measured grammar (where a cairn site puts its site config) has
diverged from what the engine's own checker looks for, and it fails 100% of scaffolded sites.
Because a skip never changes the exit code, the report reads clean.

Reshape: add `src/theme/site.config.yaml` to `SITE_CONFIG_PATHS`, and derive the list from the same
constant the template bake uses so it cannot diverge again. Rank 39.

---

# Rank 40 — `type-scale`, `gap-scale`, `token-colors`, `grammar-boundary` — **keep**

The four static grammar rules. **Arm B by definition** — each measures a written token grammar the
engine ratified — and each carries a scope carve-out that is the actual engineering.

`type-scale`: *"The rule reads only Tailwind's own text-sizing namespace and the `type-*` role
utilities. A daisyUI component class carries its own size as part of the control's chrome, a
separate system with its own `btn-sm`-style modifiers."* Knowing which of two overlapping systems
owns a number is engine knowledge.

`gap-scale`: *"A bracket whose value isn't a plain length, a viewport unit or a `calc()`, expresses
geometry the spacing scale has no vocabulary for, so it falls outside the rule rather than failing
it."* Refusing to flag what the grammar cannot express is exactly right.

`token-colors`: *"no pure achromatic, a color function whose chroma or saturation is exactly zero.
`transparent` and `currentColor` are excluded: **neither names a color the palette could have
supplied**."*

`grammar-boundary` is the load-bearing one for any consumer who themes:

> CSS never redeclares a grammar token. **A site re-tunes the palette tokens freely; a grammar token
> names structure and holds across both themes.**

That single sentence is the whole palette-vs-grammar seam, mechanically enforced. It is what lets a
consumer restyle the admin without the audit turning red, and what stops them from breaking the
structural contract by accident. Only the engine can draw that line, because only the engine defines
which tokens are which.

The exact-resolution property protects all four: *"`text-base`, the size utility, and
`text-base-content`, the daisyUI color utility, never read as the same class."*

Keep unchanged. Rank 40.

---

# Rank 41 — `border-contrast`, `weight-budget`, `screen-anatomy`, `relational-spacing`, `norms-bands` — **keep**

The five substantive advisory rendered rules.

**`norms-bands` is the reason the norms manifest exists as a product rather than a document**, and
its discipline is exactly right: *"An entry the manifest flags `open-question` or `ratified-drift`
is treated as unbanded: **a number that is not settled ground truth is not a reference to measure
against.**"*

**`weight-budget`'s region model is charter constraint 3 written out longhand:**

> Each shape is named by an HTML tag or the ARIA role that means the same thing, **never by a
> class**, so a rewritten component stays covered.

And it publishes its own two consequences rather than hiding them: `PageHeader`'s caller-authored
slot is exempt because it renders inside the same `<header>`, and `Pagination`'s item-range line
does spend the budget because it sits outside its `<nav>`. An engine that names where its own
abstraction leaks is trustworthy.

**`screen-anatomy`** encodes cairn's own office/desk screen grammar, with the exemption read *"from
the drawer class the admin shell projects at SSR rather than from path depth"* — reading the
engine's own signal rather than guessing from a URL.

**`relational-spacing`** is the `--cairn-gap-*` scale checked against the relationship the markup
renders (a nested rhythm never wider than its container, per axis). Pure Arm B.

**`border-contrast`** hit-tests *"the pixel beyond each edge, not by walking the DOM, so an overlaid
badge is judged against what it sits on"*, and refuses to report a ratio it cannot stand behind
under an ancestor `opacity`.

All five keep unchanged. This group and rank 40 are the heart of what `cairn-audit` is for. Rank 41.

---

# Rank 42 — `auth.store`, `auth.role-vocabulary`, `auth.email-normalization` — **keep**

Three D1 probes sharing one skip condition.

**`auth.store`**: *"The `AUTH_DB` D1 database answers, the `editor`, `magic_token`, and `session`
tables exist, and at least one owner-capability row is present (every declared role mapped to owner
capability, `owner` when the site declares none)."*

**Arm A is total.** Three table names, one capability semantics, one bootstrap invariant — all
cairn's, none documented anywhere a consumer could find without reading engine source. And the
failure mode is the worst one a CMS has: **a correctly deployed site with an empty owner table locks
every human out of the admin permanently.** There is no recovery path through the UI, because the UI
is what you are locked out of. A preflight that catches it before the first deploy is worth the
whole doctor.

**`auth.email-normalization`** guards an invariant the runtime cannot re-check:

> Every `editor.email` is trimmed and lowercase, the invariant every write and lookup path holds; **a
> manual `wrangler d1 execute` insert is the one way to violate it.**

That names the exact hole precisely — the engine's own paths cannot produce the violation, so the
only detection point is a scan. And an admin who adds an editor by hand at 11pm (the documented
setup path in `docs/admin/`) gets a row that silently never matches at sign-in. Any-site: nothing
about typing a capitalized email address is family-shaped.

**`auth.role-vocabulary`** is *"checked by name, not resolved capability, so a role explicitly
declared `none` still counts as known"* — the right discrimination, and the natural partner to
`auth.role-wiring` (rank 13).

Keep all three unchanged. Rank 42.

---

# Rank 43 — Supported toolchain + `check:target-stack` — **keep**

`docs/reference/supported-toolchain.md` plus `scripts/checks/check-target-stack.mjs`.

**The page distinguishes two claims most projects conflate, and says so in its first paragraph:**

> cairn's `peerDependencies` are what a consumer's install resolves against. The showcase's
> `package.json` and `wrangler.jsonc` are what the engine's own test suite and its scaffolded
> template actually run on. This page names both, since they are different claims ... **Where a peer
> range admits versions older than the one CI runs, that room is untested rather than proven.**

**And the gate makes it unfalsifiable-by-neglect.** `check-target-stack.mjs` derives every
`Target today` cell from the source the number comes from and fails on disagreement, with a scoping
honesty most gates skip: *"It checks that one column only; the rest of this page is accurate as of
its last edit."* And the gate's own header states the residual risk: *"A cell can only go stale
silently if this gate stops running."*

**The `@cloudflare/workers-types ^5` note is the strongest anonymous-consumer content on the page**,
because it describes a failure that produces no error:

> Without it, a `skipLibCheck: true` project, **a common default**, silently loses every cairn-typed
> binding signature to an unresolvable-import `any`, with no red `TS2307` to flag the gap.

A consumer whose types silently become `any` will never file a bug, because nothing looks broken.
Only the engine can know this, because only the engine knows its shipped `.d.ts` imports those
names.

The `svelte ^5.56.10` floor is the same shape: *"svelte `5.56.1` miscompiles parenthesized boolean
groupings, and a consumer compiles the package's shipped `.svelte` sources directly, so a lower
floor would let a broken svelte compile a broken component."*

Keep unchanged. Rank 43.

---

# Rank 44 — `config.bindings`, `config.media-bucket`, `config.observability` — **keep**

The three wrangler-config checks, and the closest thing to a pure Arm A trio on the surface.

`config.bindings`: *"The wrangler config declares the `send_email` binding `EMAIL` and the D1
binding `AUTH_DB`."* **Those two names are cairn's, by identity.** The Worker looks them up by
literal string. A typo (`AUTH-DB`, `MAIL`) produces a config that deploys cleanly and fails at the
first sign-in, in production, with a runtime error. Nothing outside the engine knows the two names,
and no generic wrangler validation will ever check them.

`config.media-bucket`: *"The adapter's declared media R2 bucket has a matching `r2_buckets` binding
in the wrangler config."* This is a **cross-file consistency check between the TypeScript adapter
and the wrangler JSON**, which is precisely the class of contract no single-file tool can hold, and
it correctly skips when the adapter declares no bucket. Same shape as `auth.role-wiring`, done
better.

`config.observability`: *"`observability.enabled` is `true`, so Workers Logs has a sink."* Weakest of
the three on its own, but it is the check that makes the entire logging subsystem reachable —
`CLAUDE.md`'s *"the query surface is Workers Logs, which a site turns on with
`observability.enabled = true`."* A consumer who never sets it discovers it only while debugging a
production incident with no logs.

Keep all three unchanged. The one improvement is shared with rank 39: `config.tidy-key` reusing
`config.bindings-missing` as its condition id (per the reference table) muddies the remediation
text. Rank 44.

---

# Rank 45 — `no-uncompiled-class` — **reshape**

> Every class token a component's markup writes compiles into the built admin stylesheet, or is a
> name that component's own scoped `<style>` block defines. **A class that reaches neither is in the
> author's mind and absent from what ships.**

**Arm A is absolute.** The check resolves against `dist/components/cairn-admin.css` — a stylesheet
**only the engine builds and ships** (`DEFAULT_SHEET_CANDIDATES` falls back to
`node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css`, `config.ts:24-27`). No consumer
can perform this resolution. And it catches a failure class with no other detector anywhere in the
stack: a Tailwind or DaisyUI class that compiled to nothing renders as unstyled markup that a type
check, a build, and a test suite all pass.

The token model is what makes it work: *"a class written as an array, an object, a template literal,
or a `class:` directive reads the same as one written in a plain attribute, and the match is exact."*

**The whole family has independently asked for this rule to reach further, which is the rare case
where recurrence is evidence about the mechanism rather than about the family.** xcathletes:

> `collapse` is on the DaisyUI exclude list, so `class="collapse collapse-arrow"` ... compiled to
> nothing and sat inert until a screenshot read. **No build or type step flags a DaisyUI class that
> produced zero rules.**

And ASC filed the same independently (per the triage's own note: *"xcathletes filed the same
independently"*). Two sites, no coordination, same mechanism.

**Reshape (one edit, shared with rank 32b): make `sheet` a list.** ASC's harvest, item 12: *"The rule
reads only the packaged sheet; the config schema ... offers no compiled-class sources, so ASC closed
a pass carrying six known-false-positives."* Verified at `config.ts:154`: `fail('sheet must be a
path')`. A consumer whose admin components use their own compiled classes gets false errors today
with no config key to fix it, on an **error-tier** rule.

The any-site case for the list is not the family's: any consumer who extends the admin through the
`CairnAdminShell` custom-route seam — the seam cairn shipped in `0.77.0` and documents in
`docs/extend/` — writes classes compiled by their own build. The engine sold that seam and then shipped
a gate that cannot see through it.

Rank 45.

---

# Rank 46 — `create-cairn-site`'s cost narrative — **reshape (highest-priority fix on the surface)**

**Adjudicated, not inherited.** The live input says the tool promises a free deploy that fails; I
verified the current source and the contradiction is intact.

`money.mjs:32-34` (fixed, correct):

> "Cloudflare's Workers Paid plan costs $5 US per month, billed once per account, not once per site
> ... That runs your site on Cloudflare's own global network, **from the day you deploy it**."

`chapter.mjs:106-113`, the text a reader approves **at the consent moment**, unfixed:

> "The tool will now install your site's dependencies, build it, and deploy it to **Cloudflare's
> free workers.dev hosting** on your account ... **The free plan is enough; nothing in this step
> costs money.**"

`chapter2.mjs:191-196`, premised on the same falsehood:

> "It is what sends this site's sign-in email, so **it is needed once anyone other than you needs to
> sign in.** It is not a scaling upgrade."

**Ruling: Workers Paid is the baseline, stated once, up front, and every later prompt is premised on
it.** That is the standing ruling — *"A cairn site runs on Cloudflare's Workers Paid plan, $5/month,
from its first deploy"* — and `money.mjs` already implements it. The two chapters have not caught
up, so the tool contradicts itself inside one run.

**Why this is the highest-priority item despite ranking below three others on generality:** every
other defect here is discovered by someone already invested. This one is discovered by a stranger,
in the first five minutes, at the exact instant they are asked to consent, and what they discover is
that the tool lied about money. There is no recovery from that first impression.

**Three constraints on the reshape**, from the ruling and the ROADMAP:

1. **Not a copy fix.** *"`chapter2.mjs`'s `EMAIL_ADMISSION_DETAIL` and its JSDoc both depend on
   chapter 1 having established 'nothing up to here costs money', and the later 'Turn on Workers
   Paid now, so anyone besides you can sign in?' prompt is premised on Paid arriving later."* The
   prompt **order** is part of the defect.
2. **No apology, no hedge, no pitch.** *"Name the plan, the number, and what it runs on, then move
   on. No apology or hedge ('only', 'just', 'unfortunately', 'you'll need to'), no argument that the
   price is good value ... Confidence reads as brevity."*
3. **Never justify the price by the bundle measurement in reader-facing copy** — *"copy pinned to a
   number 3% over a line rots when the bundle moves."* The 3,246,163-byte figure belongs in the CI
   comment and the changelog, not in `chapter.mjs`.

**This gates the ship-or-hold call**, which is why it must be resolved rather than filed: publishing
`create-cairn-site` in this state ships a tool that breaks a promise it just made. The plan is
committed at `docs/superpowers/plans/2026-08-20-cli-cost-narrative-pass.md` and is **drafted, not
approved**; its two open questions (ask about Workers Paid before deploying rather than after; verify
the account's plan) are product forks only Geoff can answer, and Task 4 is blocked on the first.

Reshape. Rank 46.

---

# Rank 47 — `config.dependency-floors` — **reshape**

> The lockfile's resolved `svelte` and `@sveltejs/kit` versions satisfy the engine's declared peer
> ranges, **read from the installed `@glw907/cairn-cms/package.json` so the floors are declared
> once.**

**That clause is the whole item, and it is the single best-shaped mechanism in the doctor.** The
check does not carry a copy of the floors; it reads them from the engine the consumer actually has
installed. So it is correct on `0.51.0` and on `0.96.0` and on every future release with no doctor
change, and it can never disagree with `package.json`, `supported-toolchain.md`, or the peer
warning npm printed at install time. **Arm A is total** — nothing but the engine knows its own peer
ranges, and nothing but this construction keeps them true over time.

The failure it catches is severe and silent. Per rank 43: *"svelte `5.56.1` miscompiles
parenthesized boolean groupings, and a consumer compiles the package's shipped `.svelte` sources
directly."* npm's peer-range warning scrolls past during install and is never seen again; this check
is where it comes back.

**Reshape, one line in the docs and a few in the code:**

> Skips when: No `package-lock.json` exists (**a pnpm or yarn lockfile is not read**), or the
> lockfile carries no entry for a dependency.

pnpm and yarn are not exotic. A consumer on either gets a silent skip on the check that would have
caught a miscompiling compiler — and because a skip never changes the exit code, their CI is green.
Reading `pnpm-lock.yaml` and `yarn.lock` is mechanical. Failing that, the skip line should name the
lockfile it wanted, and this is another case for the INFO-vs-PASS distinction (rank 8).

Rank 47.

---

# Rank 48 — `cairn-audit norms` and the norms manifest — **keep**

> The package ships a norms manifest: **the admin's measured design norms as data.** A generator
> renders the admin screens in both themes, reads the computed styles of each semantic role, and
> derives the bands the query returns. The query exists so an agent or a developer building a new
> admin surface **reads a measured number instead of inferring one from a screenshot.**

**This is the only thing on the entire CLI surface that a consumer could not build even with
unlimited effort**, because it is a measurement of a rendering only the engine produces. Arm A is not
merely satisfied; it is the item's entire substance.

**Four properties make it the strongest keep in the subsystem.**

**(1) Provenance is a first-class field, and it can be wrong.** `ratified` vs `observed`, with
`ratified-drift` when *"a recorded decision settles this pair and the render no longer matches it."*
The check runs both ways:

> a flag or a provenance with nothing behind it fails the same way an unflagged open question does
> ... **A one-directional check can only notice a row it already knows about, which is how a settled
> ruling once left a stale `[open-question]` flag printing with no question behind it.**

**(2) It survives a consumer re-theming, by construction.** This is the property that makes it any-site
rather than cairn-only:

> The manifest stores a palette-dependent property as a relationship, never as a resolved value. A
> border color reads `var(--cairn-card-border)`, and a mixed value keeps its formula. **A site that
> re-tunes the palette therefore invalidates nothing in the manifest, and no entry teaches a number
> that site's own theme never produces.**

An anonymous consumer with a completely different palette gets a manifest that is still true. Very
few measured artifacts survive that test.

**(3) It refuses to answer emptily.** *"A term that names no role exits 2 and prints the roles that
exist. The command never returns an empty result for an unknown term, because a query that printed
nothing and exited 0 would read as a role with no norms."* And the term accepts a role id, a class
token, or a whole selector, so a developer looking at DevTools can paste what they see.

**(4) The apparatus/product boundary is drawn correctly and gated.** *"Two things stay engine-side,
both apparatus for producing the manifest the CLI ships rather than part of the audit a consumer
runs: the norms generator ... and the probe scripts."* Backed by `check-package-files.mjs:170-178`,
whose comment names the worked example: *"`vertical-metrics` is the worked example: nothing named it
in a registry, and it shipped anyway at 66.6 KB of dist."* And `norms:check` runs in the publish
workflow, so *"a release cannot ship a stale manifest"*, while deliberately staying out of `check:*`
*"those run on every push and call `npm run package` on every invocation, and a browser render in
that path would slow and destabilize every other gate."*

Keep unchanged, and protect all four properties by name. Rank 48.

---

# Rank 49 — `cairn-manifest`'s `publishedAt` carry-forward — **keep**

> One field survives the rebuild rather than coming from the corpus: each entry's `publishedAt`
> first-publish stamp. The command reads the stamps out of the file it's about to overwrite and
> merges them into the new one, dropping any stamp whose entry the corpus no longer holds.

`internal.ts:213-217`: *"The rebuild derives every row from a content file, and `publishedAt` is
manifest-owned, so merge the committed stamps back in before writing. **Without this, regenerating
would clear every one.**"*

**This is the strongest Arm A case in the entire subsystem, and it is a one-way door.** Every other
field in the manifest is derived — delete the file, regenerate, and you get it back. `publishedAt`
is derived from *history*, and history is not in the corpus. A consumer who regenerates the manifest
by any means other than this command **permanently destroys every first-publish date on their
site**, silently, with a clean exit code and a valid-looking manifest. No test catches it. No build
fails. The dates are simply gone, and no backup short of git history recovers them.

The corrupt-file branch is the right call and reasoned in place:

> A committed file that will not parse **degrades to the built output with a warning rather than
> throwing: regenerating is how a site repairs a corrupt manifest, so throwing here would leave it
> with no way out.**

That is the correct resolution of a genuine conflict between two goods (preserve the stamps, unblock
the repair), and it announces the data loss on stderr rather than swallowing it.

The scoping is exact: *"Only `publishedAt` carries over, and only onto an entry the rebuild still
produces, so a deleted entry's stamp does not come back."*

Keep unchanged. Rank 49.

---

# Rank 50 — `cairn-manifest`, the command — **reshape**

**The most-adopted CLI in the family: 5 of 5 sites wire it**, all as the same script name
(`"cairn:manifest": "cairn-manifest"`), which the reference page documents as the intended shape.

**Arm A is complete, on both halves.**

*The manifest is a build-gating engine artifact.* The `cairnManifest` plugin *"verifies the manifest
on every build and fails the build on drift, and this command regenerates the manifest to clear that
drift."* So a consumer who edits content outside the admin — the ordinary case for a developer, and
the documented one (*"Run it after you edit content outside the admin"*) — has a **broken build** and
exactly one way to fix it.

*And the regeneration cannot be hand-rolled at all*, because it runs through the consumer's own
build:

> The command loads your project's Vite config, finds the `cairnManifest()` plugin in it, and reads
> the content globs, the config module, and the manifest path off that plugin. It then evaluates the
> write-mode virtual module through your build's own resolution ... **Because the bin reuses the
> plugin's options, it regenerates with exactly the inputs the build verifies against.**

`internal.ts:196-208` does that literally: `loadConfigFromFile` from `vite`, then
`findCairnOptions(loaded.config.plugins)`. There is no second path. A consumer cannot write a
regenerator that agrees with the verifier, because agreement is achieved by *being the same code*.
This is the `requireOrigin` / `parseSiteConfig` pattern at its largest scale, and it is what the
whole surface should look like.

Both failure messages name the fix (`vite/internal.ts:199, 204`):

```
cairn-manifest: no Vite config found in <cwd>
cairn-manifest: the Vite config has no cairnManifest() plugin. Add it so the bin shares the build options.
```

The manifest-path resolution is subtle and correct: *"The manifest path is app-root-absolute (a
leading slash relative to the project), so resolve it against the Vite root, not the filesystem root
or the config-search cwd."*

**Reshape, two small evenness defects on the item every consumer touches.**

**(a) It uses `process.exit(1)` where its three siblings deliberately do not.** `vite/bin.ts:7-10`:

```js
writeManifest(process.cwd()).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

Against `doctor/bin.ts:5-7`: *"The codes go through `process.exitCode`, never `process.exit`, so a
piped stdout flushes the whole report before the process ends"* — the same note appears verbatim in
`audit/bin.ts` and `media-seed/bin.ts`. Three bins ratified the rule; the fourth, and the only one
in universal use, breaks it. In a CI job that pipes output, the error message can truncate, leaving
a consumer with a red build and no reason. One-line fix.

**(b) It reads no argv at all**, so `cairn-manifest --help`, `--verbose`, and `--typo` are all
silently accepted and ignored, where the siblings reject unknown flags with a usage line. Rides with
rank 11.

Rank 50.

---

# Summary of verdicts

| Verdict | Count | Items |
|---|---|---|
| **retire** | 3 | `check:dogfood` in cairn-audit (decline the home), `unlistedRoutes` rule (decline), `skill.admin-screens` + `--fix` (out of the doctor) |
| **reshape** | 12 | edge pair, `chip-ground-collision`, `form-font-parity`, `admin.mount-shape`, `config.tidy-key`, `--help` everywhere, `config.csrf-disable`, audit config contract, `config.site-config`, `no-uncompiled-class`, cost narrative, `config.dependency-floors`, `cairn-manifest` exit path |
| **keep** | 35 | the remainder |

## Cross-cutting findings

**F1 — Both new work items are declined into `cairn-audit` and re-homed, not rejected.** The
`check:dogfood` rule belongs in `scripts/checks/`; `unlistedRoutes` belongs nowhere. `cairn-audit`'s
subject is the admin design language, its audience is the consumer, and its registry gate
(`check-package-files.mjs:172-178`) means anything registered ships. Both proposals violate at least
two of those three.

**F2 — One reshape lands three items at once.** Making `sheet` a list (`config.ts:154`) fixes rank
45's error-tier false positives, rank 32's config gap, and ASC's six known false positives. It is
the highest ratio of value to edit on the surface.

**F3 — A three-state result (PASS / FAIL / INFO) is owed and would fix four items.** The doctor's
skip is load-bearing in four places where it means "I could not look" rather than "not applicable":
`config.csrf-disable` (16), `admin.mount-shape` (8), `auth.role-wiring` (13),
`config.dependency-floors` (47). The ROADMAP already names the fix — *"make 'could not find a file
to check' a result distinct from 'checked and passed' wherever the doctor reports it."* One change,
four items.

**F4 — The engine calling its own code is the strongest predictor of a good verdict here.**
`config.public-origin` calls `requireOrigin`; `config.site-config` calls `parseSiteConfig`;
`config.dependency-floors` reads the installed engine's peer ranges; `cairn-manifest` evaluates the
plugin's own virtual module; `cairn-media-seed` imports the doctor's `readR2Buckets`. Every one is
rank 23 or higher. This subsystem is the **counterexample** to coherence C13's finding that the
engine writes around its own exports — here it consistently does the opposite, and that is why the
CLI surface is in better health than the export surface.

**F5 — Verified correction to a filed claim.** ROADMAP states *"A skip is not visually distinct from
a pass in the doctor's own report."* False as written: `report.ts:8-12` renders distinct
`PASS`/`FAIL`/`SKIP` tags and the summary counts all three. The real and still-live defect is that a
skip never changes the exit code, so CI stays green regardless.

**F6 — The `create-cairn-site` verdicts are all provisional on a tool nobody has run.** 404 on npm,
`version: "0.0.0"`, ROADMAP item unchecked. Every one carries `absenceOfObjection: true` except the
cost narrative, which has an affirmative, measured objection. Re-audit the scaffolder after its
first real anonymous consumer; the evidence this audit could reach is the engine's own record.
