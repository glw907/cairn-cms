# SvelteKit 3 upgrade spec: consistency review

Lens: consistency with ratified documents and live contracts. Target:
`docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` at `d5c2ca98`. Every finding below was
checked against the cited file at HEAD. Settled decisions (debt-free, the three opportunities, release
with 2a, consumers) are not re-argued. Counts: 2 blocker, 4 major, 7 minor, 1 owner fork (inside K3),
2 over-ceremony notes.

## Citation spot-check

| Spec citation | At HEAD | Verdict |
|---|---|---|
| `guard.ts:202-209` (Rule 2) | Rule 2 runs 203-211 | Off by one or two lines; fine |
| `guard.ts:127-150` (logoutUrl validation) | `validateLogoutUrl` docblock 126, `isSafeLogoutUrl` to 154 | Fine |
| `auth-routes.ts:293` | `event.setHeaders({ 'Referrer-Policy': 'no-referrer' })` in `confirmLoad` | Exact |
| `auth-routes.ts:474` | `throw redirect(303, event.locals.cairnIdentity?.logoutUrl ?? '/admin/login')` | Exact |
| `admin-response.ts:38` | `headers.set('Referrer-Policy', 'no-referrer')` | Exact |
| `section-action.ts:118`, `admin-action.ts:60` | Both sit in the "need no `handleError` mapping" comments | Fine |
| 62 reads across 25 files | `grep '\.platform\b' src/lib` (non-test) = 62 in 25 | Exact for `.platform`; see K1 for what it omits |
| "guard Rule 3" (double-submit) | No Rule 3; the admin token check is "Rule 1" (`guard.ts:247`) | Wrong, K9 |
| `doctor/site-config-path.json` changes | File is `{"path": "src/theme/site.config.yaml"}` | Wrong, K7 |
| "the two ROADMAP mentions" | Four entries | Wrong, K10 |

## Findings

### K1 (blocker): the public-seam break is far wider than `CairnPlatformBindings`

Location: spec:77-79, spec:161-163, spec:191-198.

The spec names one public type, "`CairnPlatformBindings` stays the public name for the binding shape",
and one Consumers-must line for site code reading `event.platform`. The published surface carries
`platform` in many more places, several under explicit keep rulings:

- `CairnEvent<Env>` has `platform?: PlatformContext<Env>` (`docs/internal/api-surface.md:183,460`;
  `docs/reference/sveltekit.md:46`). `Env` reaches every route factory only through that member
  (`AuthRoutes`, `CairnAdminRoutes`, `ContentRoutes`, `HandleInput`, `IdentityResolver`, all typed
  `CairnEvent<CairnEnv>`). With `platform` gone, `Env` becomes a phantom parameter on the whole
  extension surface unless the spec re-anchors it.
- `PlatformContext` is an Extension API export (`sveltekit.md:2019`), ruled keep
  (`engine-rulings.md`, `audit-sveltekit-platformcontext`: "reasoning about why its own App.Platform
  carrying ctx still satisfies cairn").
- `createSectionAction`'s `resolveDb(env: Env | undefined)` is documented as "deliberate and stays
  ratified unchanged" (`sveltekit.md:768-772`), and `AuthChannelConfig.resolveDb` and
  `DeliverContext<Env>` carry the same shape (`api-surface.md:182,187`; `auth-channel.md:71-85`,
  which also documents `platform.ctx.waitUntil` with `platform.context.waitUntil` as a fallback).
- The `createD1AuditSink` worked example sources `waitUntil` from `event.platform?.ctx`
  (`sveltekit.md:724-738`).
- Internal helper signatures take `{ url, platform }` (`csrfSecure`, `issueCsrfToken`,
  `csrfHeaderVerdict`, `readPublicOrigin`): `platform` appears 141 times in 39 non-test files under
  `src/lib`, so "62 reads across 25 files" undersizes S2's one atomic task.

The charter promises "every break disclosed" (`CLAUDE.md`, canonical scope), and the debt-free
decision forbids leaving `CairnEvent.platform` and `PlatformContext` as dead optional members.

Fold: add a "Public surface" subsection that rules each export: retire `CairnEvent.platform` and
`PlatformContext` (or keep with a reason), state how `Env` is anchored once `platform` is gone (for
example, `resolveDb` and `deliver` receive `cairnEnv(event)` typed as `Env`, the site's `wrangler types`
`Env`), and state where `createD1AuditSink`'s `waitUntil` comes from. Add Consumers-must lines for a
site test double or hook that builds `platform`, and for the audit-sink wiring. Add `sveltekit.md`,
`auth-channel.md`, and `core.md` to the reference list at spec:182. Add the matching ruling notes (K12).

### K2 (blocker): `originMatches` has a second caller under a keep ruling

Location: spec:98-100.

The spec deletes `originMatches` outright and hedges only `isUnsafeFormRequest` ("goes too unless
another caller remains"). At HEAD:

- `createAuthChannel` calls `originMatches` in `assertOriginAndScheme`
  (`src/lib/auth-channel/factory.ts:13,72-74`), step 1 of every member action (`:689`, `:915`,
  `:1076`). It runs for every content type and in dev, which Kit's check does not cover.
- `engine-rulings.md`, `originmatches-strict-guard` (keep): "some consumer routes have no second CSRF
  layer besides this compare, so loosening it removes their only protection."
- `isUnsafeFormRequest` still gates guard Rule 1 (`guard.ts:257`), so the hedge resolves to "stays".

Deleting `originMatches` either fails the build or strips the member channel's origin check, which
the ruling forbids.

Fold: delete only guard Rule 2's call, the `auth.csrf-origin-mismatch` condition, and its
`REASON_CONDITION.origin` entry (`condition-response.ts:17`). Keep `originMatches` for
`createAuthChannel`, and say `isUnsafeFormRequest` stays. Append a note to the ruling (K12). The
reworded `config.no-referrer-blanket` text must keep naming `createAuthChannel`, since its origin
compare still trips on a site-wide `no-referrer`.

### K3 (major, OWNER FORK): removing a doctor check id is a tool major under the frozen contract

Location: spec:98-99, spec:145-148.

`docs/reference/cli-cairn-json-output.md:496-509` ("What freezes at 1.0") lists `config.csrf-disable`
among the frozen doctor check ids and freezes "every condition id a payload can carry". It says:
"renaming or removing one is major." The spec removes `config.csrf-disable`,
`config.csrf-disable-missing`, and `auth.csrf-origin-mismatch`, and calls it "a break the tool's
changelog discloses." The tool is at `v1.1.0`, so the contract makes this `tool/v2.0.0`.

Two consequences the spec doesn't record:

1. The released `v1.1.0` doctor warns every migrated Kit 3 site to "Set csrf: { checkOrigin: false }"
   (`conditions.json:117`), which is now a Kit build error. The new tool has to release with the engine
   cut, and Consumers must carries a tool-upgrade line.
2. The `docsAnchor` fragments `non-admin-origin-rejected` and `wire-cairns-csrf-guard` sit on the
   append-only `scripts/checks/shipped-anchors.json` (facts `f:3mggl1`, `f:b66soa`), because a released
   binary prints them. The admin arm's rebuilt `is-it-working.md` still owes those two headings.
   Record this in the facts bullets so stage 4 inherits it.

Options:

- **(a) Release `tool/v2.0.0` with the engine cut (recommended).** It is honest under the contract and
  the debt-free goal. Kit 3 is already the major moment for every consumer.
- (b) Keep the three ids as tombstones that always report `skip`. The tool stays at a minor, but this is
  a shim kept only for compatibility, which the debt-free decision rules out.
- (c) Repurpose `config.csrf-disable` to fail when a stale `csrf` block remains. It keeps the id but
  changes what it means, which is a semantic break without a version signal.

### K4 (major): the segment order can't end S2 on a green commit

Location: spec:152-167.

The spec says "Each segment ends on a green commit." S1 keeps `checkOrigin: false` (moved into the Vite
plugin on Kit 2). S2 bumps to Kit 3, where `checkOrigin` is a build error, but the Referrer-Policy change
waits for S3. Between the two, admin form POSTs still send `Origin: null` under `no-referrer` and fail
Kit 3's check. S2 can go green only with an interim `trustedOrigins: ['*']`, a shim the debt-free
decision forbids.

The guard also carries a premise Kit 3 breaks. Its comment says the https help page is served "before
resolve() runs that check" (`guard.ts:213-215`), and `edge.https-not-forced` (`conditions.json:180`)
rests on the same premise. Kit 3's check runs ahead of `handle`.

Fold: run the CSRF segment before the bump. Kit 2.70's origin check also runs before `handle` and
rejects `Origin: null`, so the Referrer-Policy change, the `csrf` config deletion, and the Rule 2 removal
can land green on Kit 2 (the pre-flight confirms this on 2.70). The other option is to fold CSRF into
S2's atomic task. In either case, re-read the help-page comment and the `edge.https-not-forced` copy.

### K5 (major): three ROADMAP watches trigger on this pass and the spec names none

Location: spec:66-75, spec:200-205.

S2 edits `packages/cairn-cms-dev`. Three ROADMAP entries list "the next pass that touches
`packages/cairn-cms-dev`" as their trigger:

- `ROADMAP.md:938-946`: `devBackendHandle` overwrites the platform proxy's `APP_DB` with a fake that
  answers only the signups SQL. This bears directly on the spec's "override layered over the real
  `env`" design, which chooses whether a double shadows a binding the site already provides.
- `ROADMAP.md:872-882`: the dev backend swaps `MEDIA_BUCKET` for an in-memory fake, which hides seeded
  media.
- `ROADMAP.md:1556-1582`: the dev package mints `cairnEditor` but never `cairnAccess`.

`CLAUDE.md` (Watch items) requires a tripped trigger to be handled, not left floating.

Fold: give each entry one line in the spec: take it now, or defer it with the trigger re-armed. Decide
the `APP_DB` case inside the override design.

### K6 (major): the dev override key is called "internal" but crosses a package boundary and the showcase reads it

Location: spec:70-75.

"An override that the dev handle sets on `event.locals` (an internal, documented-as-dev-only key)"
contradicts itself, and it conflicts with existing practice:

- `@glw907/cairn-cms-dev` is a separately published package, so any key it writes for the engine to
  read is a cross-package contract. The precedent, `locals.cairnBackend`, is a documented public
  `CairnEvent.locals` key under the flat `cairn` prefix rule (`sveltekit.md:59-70`, "five optional
  keys"), held by `check:surface`.
- Showcase site code reads the dev doubles and the flag off `platform.env` today:
  `routes/test/reset-members/+server.ts:25`, `routes/test/revoke-member-session/+server.ts:24`, and
  `members/dev-wiring.ts:33-49`, which stamps `CAIRN_DEV_BACKEND`. After the change, site code that
  reads `cloudflare:workers` sees none of the doubles. "This keeps the dev package's no-cloud-accounts
  promise" therefore holds only for engine reads.

Fold: name the key (cairn-prefixed), add it as a sixth `CairnEvent.locals` member and to `/ambient`'s
`App.Locals`, and document it beside `cairnBackend`. State the promise's scope: engine reads only, or
also site reads through an exported accessor. Add a Consumers-must line for a site whose own code reads
a dev double.

### K7 (minor): `site-config-path.json` doesn't change, and the doctor's Vite-config reading is empty

Location: spec:145-148.

`tool/internal/doctor/site-config-path.json` holds only `{"path": "src/theme/site.config.yaml"}`. The
doctor's only `svelte.config.js` reader is `check_csrf.go:72`, which the spec deletes. "The Go doctor
reads config from the Vite config wherever it read `svelte.config.js`" therefore has no remaining
target.

Fold: drop both claims. The live contract change is `conditions.json` alone, plus the frozen check id
from K3.

### K8 (minor): the peer-floor line names peers cairn doesn't declare

Location: spec:139-140, spec:197.

cairn's `peerDependencies` are kit, svelte, `@cloudflare/workers-types`, `@anthropic-ai/sdk`, daisyui,
and tailwindcss. `supported-toolchain.md:49-51` says "The package declares no `vite` peer dependency."
The spec lists vite, vite-plugin-svelte, and wrangler as "peer floors". Wrangler is a template pin,
already at `^4.144.0` (`supported-toolchain.md:25`). Separately, `@glw907/cairn-cms-dev` peers on
`@sveltejs/kit` `^2.61.0`, and the spec never moves it.

Fold: cairn's peer changes are `@sveltejs/kit` `^3` and svelte `^5.57.1`. Restate the rest as consumer
floors that come from Kit's and the adapter's own peers. Add the dev package's kit peer to S2.

### K9 (minor): wrong rule number

Location: spec:101.

"guard Rule 3" doesn't exist. The double-submit check is "Rule 1 - admin" (`guard.ts:247`).

Fold: write "guard Rule 1".

### K10 (minor): the kit#15992 retirement undercounts ROADMAP

Location: spec:169-170.

"The two ROADMAP mentions": there are four entries. They are the 1.0 readiness line (`ROADMAP.md:51-53`,
"The SvelteKit `checkOrigin` removal (kit#15992) is the standing example"), the tripped-watch entry
(`:399-405`), the migration-pass entry (`:1701-1716`), and the pre-beta mitigation (`:2145-2152`). The
`CLAUDE.md` watch line (`:211`) uses kit#15992 as the "Standing example" for the external-trigger
mechanism, so it needs a replacement example, not only a deletion.

Fold: list all four ROADMAP entries and the `CLAUDE.md` example swap.

### K11 (minor): the friction ids and the tutorial pin live on the branch this pass won't edit

Location: spec:28-30, spec:188.

`f:skeche` and `f:ghzx9c` exist only on the `draft-docs-2a` worktree (its friction log `:623` and
`facts/extend.md:144`). `main` carries neither, so "Friction log: `f:skeche` and `f:ghzx9c` close"
contradicts "This pass doesn't edit that branch." STATUS also still scopes the tutorial pin into this
pass (`STATUS.md:34`, "a stopgap the upgrade pass rewrites"; the resume prompt's "In: ... the add-cairn
tutorial's pin included"). The spec's Sequencing bullet reverses that, and unlike the other settled
bullets it carries no Geoff attribution.

Fold: make the two ids' closure a 2a carry-forward, together with `facts/extend.md:144`'s stale `^2.70`
claim. Confirm the sequencing bullet at Geoff's spec read, and rewrite STATUS to match.

### K12 (minor): ruling notes owed (no verdict changes)

Location: spec, Docs and records.

Append dated notes, leaving each verdict as it stands:

- `originmatches-strict-guard`: the guard no longer calls it, and `createAuthChannel` remains the
  caller (K2).
- `audit-sveltekit-createauthguard`: its any-site case names "the CSRF authority the site handed over
  by setting checkOrigin: false".
- `audit-sveltekit-platformcontext` and `audit-sveltekit-cairnevent`: per K1's outcome.
- `dev-backend-flag-refusal`: its Shape bullet reads the flag "off `event.platform?.env`". Retiring the
  `process.env` read is consistent with the ruling, which rules predicates, not sources, and with
  `what-cairn-is-and-is-not.md:18` ("SvelteKit + Cloudflare, fully"), but the Shape text goes stale.
- `convention-auth-loud-postures`: Geoff's "The `platform` required-but-nullable convention applies
  uniformly across the CSRF/auth helpers" is mooted once the helpers drop `platform`.

Optional: the functional spec's confirm step says "The page sets `Referrer-Policy: no-referrer`"
(`2026-05-28-cairn-rebuild-functional-spec.md:228`). That spec labels itself design history with
known drift, so no erratum is required.

### K13 (minor): facts and reference lines that become false aren't listed

Location: spec:182-187.

"Facts bullets for every public-behavior change" covers new bullets. The container's fix rule also
requires correcting the bullets this pass falsifies:

- `facts/admin.md`: `f:ex1604`, `f:biealg`, and `f:4dolfa`, plus the anchor bullets `f:3mggl1` and
  `f:b66soa` (keep the anchors, mark the conditions retired; see K3).
- `facts/extend.md`: `f:ix10bm` (the guard applies `originMatches`).
- `facts/reference.md`: lines 591 and 1563.

On the reference side, `log-events.md:71` also names the `'origin'` branch, and `auth-channel.md:140`
says "The flag is read from both `platform.env` and `process.env`". The spec's grep catch-all
(`svelte.config.js`, `platform.env`, `checkOrigin`) misses `PlatformContext`, `platform.ctx`, and the
`process.env` sentence.

Fold: list these explicitly in the docs task.

## Over-ceremony, ranked by cost

- **O1: the doctor Vite-config read (spec:145-146).** After K7 it has no target. Dropping it removes a
  `tool` task's design work.
- **O2: `go-architecture-reader` on `tool/internal/doctor` (spec:177).** That package's change is
  deletion only (`check_csrf.go`, its test, goldens). A whole-package architecture read buys little.
  Run it only if `pass-core`'s close mandates it for any touched package.

The S0 spike, the S3 mutation proof, and the two security reads are proportionate, and the security
pre-read is Geoff's settled gate. None of them is flagged.
