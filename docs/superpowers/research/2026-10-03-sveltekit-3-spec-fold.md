# SvelteKit 3 spec: fold record (2026-10-03)

Target: `docs/superpowers/specs/2026-10-03-sveltekit-3-upgrade-design.md` (205 lines at `2657096b`).
Reviews: `2026-10-03-sveltekit-3-spec-review-{contract,mechanics,risk,consistency}.md` (IDs C, M, R, K;
over-ceremony items carry their lens letter, e.g. C-O1). One fold agent; every finding was checked
against the repo at HEAD, the Kit 3.0.0 / adapter-cloudflare 8.0.0 sources, the installed Kit 2.70.3, or
the probe rig at `~/.cache/kit3-review/app` before disposition.

## Verification spot-checks made by the fold

- Prerender throw: `virtual-cloudflare-workers.js:18-20` (env traps) and `:97-99` (`withEnv` also throws
  without the proxy). The second fact is new: the dev handles' `withEnv` must also skip while
  `building`, because the e2e build prerenders behind `devBackendHandle`.
- `vite preview`: `preview.log` in the rig shows `ERR_UNSUPPORTED_ESM_URL_SCHEME`; kit#17271 is open.
- Kit 2.70.3 `respond.js:73-100`: the check runs before `handle`, is skipped in dev, rejects a null or
  missing Origin for form content types, and lets an absent content type through. This is what makes
  CSRF-before-the-bump land green.
- `originMatches` callers: `guard.ts:206` and `auth-channel/factory.ts:73`; `isUnsafeFormRequest` also
  at `guard.ts:257`. Rule numbering: Rule 2 at `:203`, Rule 1 at `:247`; no Rule 3.
- `kit.alias` `@deprecated` (`vite/public.d.ts:30-33`), `config_option_deprecated_alias` warning;
  `checkOrigin` deprecation text "Use `trustedOrigins: ['*']` instead" (`public.d.ts:103`).
- `redirect` accepts `{ external: string[] }` (`exports/index.js:124`).
- Kit 3 `RequestEvent` still declares `platform?: App.Platform` (`types/index.d.ts:956`).
- `site-config-path.json` is `src/theme/site.config.yaml`; the only `svelte.config` reader in `tool/`
  is `check_csrf.go`.
- `cli-cairn-json-output.md` "What freezes at 1.0" lists `config.csrf-disable`; removal is major.
- ROADMAP kit#15992 hits at `:52`, `:402`, `:1710/1716`, `:2150` (four entries); `CLAUDE.md:211`.
- `f:skeche` and `f:ghzx9c`: zero hits on `main`.
- Peers: cairn declares no vite peer; template pins already exceed vite `^8.0.12` and wrangler `^4.118`;
  the dev package peers on kit `^2.61.0`. `@sveltejs/package` 3.0.0 is on npm.
- Only `channel-db.ts` in the dev package uses `node:sqlite`; the showcase's `wrangler.jsonc` declares no
  `compatibility_flags`.

## Root resolutions of the convergent defects

- **(a) Prerender env access throws (C2, R1, M1).** No engine code touches `env` or `withEnv` while
  `building` (`$app/env`, Kit's documented build-time switch; probe-proven). The showcase build is the
  standing proof; S0 adds a prerendered route through cairn's handle. Refused sub-parts: C2's
  "accessor returns empty bindings while building" and R1's "named cairn error while building" (new
  mechanism; the adapter's own throw already names the cause, and the `building` gate removes the path).
- **(b) The locals override doesn't reach site code (R3, M3, K6).** The override is dropped. Both dev
  handles wrap `resolve` in `withEnv({ ...env, ...doubles })`, the platform's mechanism, which the probe
  showed reaching library and app reads across an `await`. K6's naming question and R3's production
  substitution seam disappear with the key.
- **(c) `originMatches`'s second caller (K2, R2, M4).** `originMatches` stays for `createAuthChannel`
  under the `originmatches-strict-guard` keep ruling; only Rule 2's call and its conditions go.
  `isUnsafeFormRequest` stays for Rule 1. Dev-cost statement narrowed accordingly.
- **(d) S2 can't end green (C1, K4).** The CSRF segment moves onto Kit 2.70, before the bump. Verified:
  Kit 2.70's default check rejects `Origin: null` before `handle`, so deleting `checkOrigin: false` with
  the Referrer-Policy change lands green on Kit 2, and no temporary `trustedOrigins` is ever committed.
  C1's interim is refused.
- **(e) `vite preview` can't host adapter 8 (M2, C4, C5, R4).** The e2e host moves to `wrangler dev`, the
  adapter's documented build-test path, as its own segment on Kit 2.70 (adapter 7 output also runs
  there), so the move lands green before the bump with unchanged baselines. S0 proves the dev-backend
  worker boots in workerd (`node:sqlite`, flag delivery). R4's vacuous admin mutation proof is answered
  by integration tests on both header sites plus a browser POST of the confirm form, whose own
  `setHeaders` reaches the browser in the dev-backend build; the mutation reverts the confirm page.
  R4's choice one (a real-guard e2e project on a seeded local D1) is refused on cost; the live smoke
  covers the guard path end to end.
- **(f) The public surface carrying `platform` (K1).** A "Public surface" table rules each export:
  `CairnPlatformBindings` keep and re-express with a type test; `CairnEvent` keeps but loses `platform`
  and its phantom `Env` parameter; `PlatformContext` retires (its keep case's reopen trigger is met);
  `resolveDb`, `DeliverContext`, and `lookup`/`verify` keep their ratified shapes, sourced from the module;
  `createD1AuditSink` keeps its signature with a new call form; `auth.channel.delivery_inline` retires.
  Each break has a Consumers must line.
- **(g) Site-wide `no-referrer` locks out admin sign-in (C9, R5, M7).** Engine-rendered admin documents
  emit `<meta name="referrer" content="strict-origin">` beside the header, which overrides a site-wide
  header, `app.html` meta placed before `%sveltekit.head%`, or zone rule. The condition and doctor remedy
  are reworded (the "safe on /admin" remedy goes); severity stays `warning` because, with the meta, the
  remaining breakage is the site's own forms, as today. Consumers must line added.
- **(h) `trustedOrigins: ['*']` detection and the doctor contract (R6, K3).** `check_csrf.go` is
  repurposed to fail on a `'*'` entry under a new check id and condition; the three old ids retire. The
  frozen-id contract makes that `tool/v2.0.0`, released with the engine cut, with a Consumers must line.
  K3's options (b) and (c) are excluded by the debt-free decision and the contract, so K3 is not a fork.

## Dispositions

### Contract lens

| ID | Disposition |
|---|---|
| C1 | Refused (interim `trustedOrigins`): resolved at the root by moving CSRF onto Kit 2.70 (resolution d; spec S3). |
| C2 | Folded with M1, R1 (resolution a): Bindings bullet "no engine code touches env while building"; S0 item 1. Empty-bindings contract refused. |
| C3 | Folded: Kit 3 API moves, subpath imports for `#chassis`/`#theme`; S4 grep-zero plus zero deprecation warnings; Consumers must `imports` line. |
| C4 | Folded with M-O1: S0 pins the real tarball via a scratch-branch probe, installs by `.tgz` outside the repo, asserts an echoed binding value, and carries per-mode stop rules. Preview arm dropped (M2). |
| C5 | Folded: S3 proofs name the cross-origin pair (127.0.0.1 vs localhost, Kit's body), the admin Save form, and the members request form. |
| C6 | Folded with R4: S3 integration test on `confirmLoad`'s header and the browser confirm POST with the mutation proof. |
| C7 | Owner fork: Ruling 1 (live smoke target). The smoke doc's POST steps sending `Origin` is folded into "Pass class and close". |
| C8 | Folded (conventional fix, not new mechanism: pins the fixture of the close proof the spec already promised): close re-runs S0's harness against the final tarball with the six pass conditions. |
| C9 | Folded with R5, M7 (resolution g): admin referrer meta; Consumers must line. |
| C10 | Folded, narrowed: today Rule 2 already refuses a form-typed POST with no Origin on non-admin paths, so only the bodyless (no Content-Type) case is new; Consumers must line for that; `custom_domain` mismatch is a facts bullet. |
| C11 | Folded: S4 names `members.spec.ts:26,177` (they break only at Kit 3, which rejects an absent content type). |
| C12 | Folded: `satisfies` type test in the Public surface table. |
| C13 | Folded: tripwire tests rewritten; flag via `.dev.vars`/`--var`, never `vars`. The optional "honor override only when flag live" is moot (no override). |
| C14 | Folded into S4's single grep-zero acceptance line. |
| C-O1 | Folded: vitest-alias and locals proofs leave S0; vitest treatment is S4 acceptance. |
| C-O2 | Folded with C8: one harness serves S0 and the close. |

### Mechanics lens

| ID | Disposition |
|---|---|
| M1 | Folded (resolution a). |
| M2 | Folded (resolution e): new S2 moves the e2e, baselines, and `norms.yml` to `wrangler dev`. Not an owner fork: option (a) is the upstream-sanctioned host, (b) loses production-build coverage and changes the CI width-matrix baselines the responsive standard gates on, (c) is a shim the debt-free decision excludes. Moving S2 onto Kit 2.70 is the fold's addition. |
| M3 | Folded (resolution b). |
| M4 | Folded (resolution c). |
| M5 | Folded: CSRF section names the token's real owners (Rule 1, `createAdminAction`, per-handler `validateCsrfHeader`) and the dev-backend reality. |
| M6 | Folded: Bindings "Tests" bullet gives per-project treatment. |
| M7 | Folded (resolution g). |
| M8 | Folded with R7's comment part: guard comment reworded, `edge.https-not-forced` copy re-read. |
| M9 | Folded: Bindings bullet constrains the module's import graph. |
| M10 | Folded: root `svelte.config.js` stays. The `@sveltejs/package` 3.0.0 major became Ruling 2 (the global rule asks Geoff before any major). |
| M-O1 | Folded with C4. |
| M-O2 | Folded with K7, K-O1: the doctor's Vite-config "port" and `site-config-path.json` claims dropped. |

### Risk lens

| ID | Disposition |
|---|---|
| R1 | Folded (resolution a); named-error sub-part refused. |
| R2 | Folded (resolution c). `originMatches` stays in `csrf.ts` rather than moving into the factory: moving it is churn without a defect. |
| R3 | Folded (resolution b). The fallback clause ("if `withEnv` doesn't survive `resolve`") is unnecessary: the probe proved it across an `await`; S0 item 2 re-proves it with the real packages. |
| R4 | Folded, choice two (resolution e); choice one refused on cost. |
| R5 | Fold 1 (admin meta) folded as new mechanism (see measures); fold 2 partly folded (reworded condition and remedy; blocker severity refused because the meta removes the admin lockout; `app.html` doctor heuristic refused, cost over risk: a non-admin 403 surfaces on first use); fold 3 replaced by integration tests asserting the meta. |
| R6 | Folded (resolution h): repurposed doctor check; Consumers must line. Warn-on-every-entry narrowed to a pass with a detail, since a non-`*` entry is a deliberate site choice. |
| R7 | Folded: cost 1 restated to cover admin paths, Workers Logs named, Kit's literal message anchored in `log-events.md`; cost 2 narrowed; guard comment reworded. |
| R8 | Folded: `waitUntil` from the module, inline branch and `delivery_inline` retire, collecting fake with flush, `DeliverContext`/`createD1AuditSink` ruled in the Public surface table (signature kept, call form changed). |
| R9 | Folded: Kit's `{ external: [origin] }` allowlist (Kit API moves). |
| R10 | Folded: grep for `platform:` in test literals (S4) and a `beforeEach` reset of the fake. |
| R11 | Folded: `withEnv` and audit-sink lines added to Consumers must; `paths.origin` behind a proxy filed as a facts bullet (Public origin), not a must, since Workers sites see the browser's URL. |
| R12 | Folded: `/preview` bullet reworded. |
| R-O1 | Folded, narrowed: the pre-dispatch security read stays (the fold changed the CSRF design after the risk lens read it) but covers only the fold's deltas; the original two questions cite the risk lens's verified non-gaps. |
| R-O2 | Folded: no test or guard is added for the verified non-gaps. |

### Consistency lens

| ID | Disposition |
|---|---|
| K1 | Folded (resolution f): Public surface section and table; reference list adds `sveltekit.md`, `auth-channel.md`, `core.md`; S4 sizing restated as 141 occurrences in 39 files. |
| K2 | Folded (resolution c), including `REASON_CONDITION.origin` and the reworded condition naming `createAuthChannel`. |
| K3 | Folded (resolution h). Not an owner fork: the frozen-id contract leaves one answer once (b) and (c) are excluded. Shipped-anchor note folded into the Doctor section and facts. |
| K4 | Folded (resolution d); help-page premise folded with M8. |
| K5 | Folded: "ROADMAP watches this pass trips" defers all three with the trigger re-armed. |
| K6 | Folded (resolution b); moot with the key gone. |
| K7 | Folded with M-O2. |
| K8 | Folded: peers restated (kit `^3`, svelte `^5.57.1`; vite, vite-plugin-svelte, wrangler as consumer floors); dev package kit peer to `^3`. |
| K9 | Folded: "Rule 1". |
| K10 | Folded: S5 lists four ROADMAP entries and the `CLAUDE.md` example swap. |
| K11 | Folded: friction ids and `facts/extend.md:144` become 2a carry-forwards. The sequencing bullet carried no Geoff attribution, so it moved out of "Settled decisions" into Design as the spec's own call, with its reason (another executor owns the 2a worktree). STATUS rewrite owed at the close (below). |
| K12 | Folded as owed errata (below); no ratified document edited. |
| K13 | Folded: Docs and records lists each falsified facts bullet and reference line, and widens the repoint grep. |
| K-O1 | Folded with M-O2. |
| K-O2 | Refused: the `go-architecture-reader` runs once per touched Go package at merge by its own agent definition; the repurposed check is new code, not deletion only. |

Counts: 57 finding IDs. Folded 54 (C2, R1, R4, R5, and R6 with refused sub-parts, as noted in their
rows); refused outright 2 (C1, K-O2); owner fork 1 (C7, Ruling 1). M10's `@sveltejs/package` major
became Ruling 2 alongside its fold.

## Owner forks considered and not raised

- **M2 (e2e host).** One architecturally correct answer (above).
- **K3 (tool v2.0.0).** One answer under the frozen contract and the debt-free decision.
- **Sequencing with 2a.** One answer under one-executor-per-worktree; recorded as the spec's call.

## Errata owed (ratified documents not edited by the fold)

- `docs/internal/engine-rulings.md`, dated notes, verdicts unchanged unless stated:
  - `originmatches-strict-guard`: the guard no longer calls it; `createAuthChannel` remains the caller.
  - `audit-sveltekit-createauthguard`: its case names the CSRF authority handed over by
    `checkOrigin: false`, which no longer exists.
  - `audit-sveltekit-platformcontext`: reopen trigger met (adapter 8 has no `App.Platform`); the spec
    retires it. The ledger needs the retire verdict recorded.
  - `audit-sveltekit-cairnevent`: `platform` member and `Env` parameter retire; the keep case holds.
  - `audit-auth-delivercontext`: shape unchanged; `waitUntil` now always the module's.
  - `audit-log-auth-channel-delivery-inline`: reopen trigger met (no deployment lacks `waitUntil`);
    the spec retires the event. The ledger needs the retire verdict recorded.
  - `audit-sveltekit-created1auditsink`: signature kept; documented call form changes.
  - `dev-backend-flag-refusal`: Shape reads the flag off `event.platform?.env`; source becomes the
    module `env`, and the `process.env` leg retires.
  - `convention-auth-loud-postures`: the `platform` required-but-nullable convention is mooted once the
    helpers drop `platform`.
- `docs/reference/sveltekit.md:768-772`: `resolveDb`'s shape "stays ratified unchanged" holds, but its
  rationale ("the engine can't conjure an absent platform") goes false; the docs task rewrites the
  sentence. Flagged because the text calls itself ratified.
- `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md:228`: the confirm step's
  "Referrer-Policy: no-referrer" becomes `strict-origin` plus the meta. CLAUDE.md names this spec the
  canonical source, so an erratum is owed even though the spec admits drift.
- `docs/reference/cli-cairn-json-output.md` frozen-id list: changes under the tool major (docs task).
- `docs/STATUS.md` (not ratified, but owed): the resume prompt's "add-cairn tutorial's pin included"
  and line 30's "a stopgap the upgrade pass rewrites" contradict the sequencing call; the close moves
  them to 2a carry-forwards.

## Measures

- **New-mechanism findings folded: 2.**
  - R5 fold 1, the admin `<meta name="referrer" content="strict-origin">`. Source: the W3C Referrer
    Policy spec and the HTML standard's `meta name=referrer`, which browsers implement as the document's
    policy override. Measured defect: the ASC harvest site that shipped site-wide `no-referrer`
    (`originmatches-strict-guard` record, `asc-harvest-triage.md:93-100`); after this pass that same
    configuration would 403 every admin sign-in with no cairn page.
  - R6, the repurposed doctor `trustedOrigins` check (existing machinery, new predicate). Source: Kit's
    own removal note recommends `trustedOrigins: ['*']` (`vite/public.d.ts:103`), so it is the path an
    upgrading site follows. Measured defect: `['*']` compiles the check off for every route
    (`vite/index.js:495`), verified in source.
- **New-mechanism findings refused: 5.** C2's empty-bindings-while-building contract; R1's named cairn
  error while building; R4 choice one (real-guard e2e on seeded local D1); R5's `app.html` doctor
  heuristic; C13's flag-gated override (moot).
- **Spec line count:** 205 before, 405 after. The growth is the Public surface table, the Doctor and
  sequencing sections, the new S2, and acceptance criteria the plan needs; the plan can lift the S3/S4
  proof lists verbatim.
- **Token-ceiling note:** the fold adds a segment (S2, the e2e host move) and makes the doctor a
  tool major. Six segments with S4 still one atomic Opus task is near the split threshold; the
  conductor should weigh cutting the pass after S3 (Kit 2.70 work: groundwork, host move, CSRF) with
  the bump, scaffold, and docs as the follow-up, each half ending green on `main`.
