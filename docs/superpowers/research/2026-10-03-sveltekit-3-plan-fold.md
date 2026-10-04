# SvelteKit 3 plan review: fold record

Target: `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md` at HEAD `164ea03b`. Reviews folded:
`2026-10-03-sveltekit-3-plan-review-contract.md` (PC1 to PC17, C-OC1 to C-OC5),
`...-mechanics.md` (PM1 to PM10, M-OC1 to M-OC3), and `...-risk.md` (PR1 to PR7, R-OC1 and R-OC2). The
three lenses each number their over-ceremony items `OC1` onward, so this record prefixes them by lens.
The spec and its Rulings were not re-argued.

Each finding was checked against the code at HEAD, the Kit 3 and adapter sources under
`~/.cache/kit3-research/`, or the showcase's installed adapter 7 before it was folded. One finding
(FA1) is the fold's own, found while verifying PC8.

## Conductor decisions applied

- **PM8:** Task 11 splits into 11a (the Kit 2.70 prep, Sonnet, `auth-data`) and 11b (the atomic
  bump, Opus). Both sit in S4. The split rule now also forbids a cut after 11a, since 11a's commit
  still peers on Kit `^2.70`. Decision 12; the Segments table; the Architecture, Models, and Worktree
  lines; Tasks 11a and 11b.
- **Over-ceremony** findings were weighed by cost. Each refusal names what the extra ceremony
  catches.
- **PR3:** Task 7 gets a full inputs list and must rule the wildcard severity. Decision 5 records the
  two checked premises.

## Dispositions

### Convergent roots (folded once)

| IDs | Disposition | Where |
|---|---|---|
| PR1, PM6, PC16 | **Folded.** The showcase App is a placeholder (`cairn.config.ts:149`), so no Save can commit. The live smoke now runs the default, flag-free build and checks first that no flag sits in `--var` or `.dev.vars`. It sets `PUBLIC_ORIGIN` by `--var` on an env-var port, and the session comes only from Geoff's confirm click. `admin-smoke-test.md` (which mints sessions by row insert) is followed only for its POST-`Origin` steps. The evidence is a Save POST that passes Kit's check and the guard's token and reaches the commit path, with its `commit.failed` at `error` quoted. PC16's own fold (name the credential source, repository, and branch cleanup) is refused as moot, since no commit can happen. | Close step 5 |
| PM3 | **Folded.** Verified: `norms.yml:55`, `:94` and `theme-fixture.mjs:66` pass the flag as an OS env var, and `curl -sf` accepts a 30x. The flag now goes only through a command-scoped `--var`, never an OS env var or any `.dev.vars`, and `preview` stays flag-free. Each flagged readiness probe requires 200 and fails on a redirect, with one quoted run against a default build. | Global constraints; Decision 3; Task 1 item 3; Task 5; Task 6; Close step 5 |
| PC4, PM4 | **Folded.** Verified hits at `norms.yml:55`, `cairn-audit.md:348`, the reading-surface post, and the transcript fixture. Both greps now match only `vite preview`, plus Task 6's broken env-prefix form, with named survivors listed. A direct check confirms each `preview` script names `wrangler dev` with no flag. `cairn-audit.md` joins Task 6's Files. | Tasks 5, 6 |
| PC7, PR2, PR6 | **Folded.** Task 5: the reset spec turns red when the reset is a no-op, and a 404-without-flag test turns red when the env check is dropped (both quoted), and each `/test/*` route keeps both refusals. Task 11a: the `process.env` retirement carries its own mutation proof. Task 11b: one quoted red run for each of nine mutations, covering PR2's four (the guard's module-`env` flag read, the factory's flag and `isDeployedHost` reads, `csrfSecure`'s `PUBLIC_ORIGIN` branch, and the import-graph negative control) and PC7's list. Factory tests use a fresh instance each. PR6's `.dev.vars` ignore check is moot because no `.dev.vars` is written; a `git ls-files` check replaces it. | Tasks 5, 11a, 11b |
| PC8 (with PR2 item 4) | **Folded.** The import-graph check gains a positive control: the walk from `./sveltekit` must reach `workers-env`. The report quotes a per-entry count, and the PR2 negative control is quoted beside it. | Task 11b |
| PC2 | **Folded.** Verified: `CairnAdminShell`'s `<svelte:head>` (`:679`) sits outside the `data.public` branch, and login and confirm render inside the shell, so metas in three components would put two on those documents. The meta now has one home, the shell. A component test covers the public and authed payloads, an e2e check counts exactly one on the login, confirm, and edit documents, and Task 9's mutations strip every cairn meta and quote the count before and after. | Decision 11; Global constraints; Tasks 8, 9 |
| PC1 | **Folded.** Verified at `dev-wiring.ts:53-63`. Once the double goes, the handle only stamps the flag, which `--var` makes redundant, and its `createChannelDb` throws under workerd. The handle retires in Task 5, and the 11b nesting test uses a test-local second handle. This departs from the spec sentence that names `membersDevHandle`, so it is recorded as Decision 10. | Decision 10; Tasks 5, 11b |
| PC9, PR5 | **Folded.** Task 10's table adds rows: `[]` passes; an unreadable value is UNCHECKED with a detail; no Vite config stays UNCHECKED, never PASS (verified `uncheckedCsrfDetail`, `check_csrf.go:13`); a remaining `svelte.config.js` is UNCHECKED with a detail pointing at the config move. The UNCHECKED status already exists, so no new condition is added. `tool/cmd/cairn/doctor_test.go` (fixture at `:47`, verified) joins the Files. | Task 10 |
| PM5 | **Folded.** Verified: `check-chassis-boundary.mjs:76` matches only `$chassis/` and relative paths. The boundary script, the chassis README rule (`:10`, `:42`, `:45`), and the dead alias map at `check-public-skill.mjs:409-414` join Task 3. Task 3 also quotes a red run on a scratch `#chassis/` reach-in and runs the check by name, since it sits only in `check:close`. | Task 3 |
| PM1 | **Folded.** Verified in the showcase's adapter 7.2.9 `files/worker.js`: `caches.default` is read first unless the request's `cache-control` carries `no-cache`. The post-delete probe in `media-library.spec.ts` now sends `Cache-Control: no-cache`, and the report quotes the red run without it. The other option, a fresh `--persist-to` directory, was not taken: it would leave the in-run cache hit in place. | Task 5 |

### Other findings

| ID | Disposition | Where |
|---|---|---|
| PM2 | **Disclosure folded:** a fact bullet, an entry in the migration record, and a `Consumers must:` line (Decision 13). Verified: adapter 8's `files/worker.js` has no `caches` use. **Remedy: owner fork, Ruling for Geoff 1.** | Decision 13; Task 13; Rulings for Geoff 1 |
| PR3 | **Folded** (conductor decision). Task 7 gets an inputs list by path (spec sections, the spec risk review's R2, R5, and R6, the Kit 3 and 2.70.3 sources, the auth modules, the three heads, and Tasks 8 to 10 with Decisions 5 and 11). It must accept or amend the severity. | Task 7 |
| PR4 | **Folded.** Decision 5 cites the two premises, Rule 1 covering login and confirm and the factory keeping `originMatches`, and routes the severity through Task 7. Task 10 requires the condition's `why` to state the exposure plainly. | Decision 5; Task 10 |
| PC3 | **Folded:** the committed generated `Env` files join 11b's Files (verified: `git ls-files` shows only `app.d.ts`). The generation input is named: a committed file that carries every required secret name and never the flag; the template's `.dev.vars.example` carries `GITHUB_APP_PRIVATE_KEY_B64`. Waymark's `Env` carries no `MEMBER_DB`. A quoted `wrangler types --check` run (flag verified in wrangler's `--help`) and a mutation that deletes a required member are added. **Refused:** a standing freshness gate in CI is new machinery with no measured staleness; the in-task check covers this pass. | Task 11b |
| PC5 | **Folded.** Past S2, ceiling pressure raises a budget question, never a split. **Refused:** ruling on whether a cut after S4 is allowed, since the spec names one cut point (after S2) and that question is settled there. | Split rule |
| PC6 | **Folded.** Verified at `hooks.server.ts:19-32`. Task 3 records the prerender count for the default build and for the flagged build, and 11b quotes both, each equal to its Task 3 counterpart. | Tasks 3, 11b |
| PC10, C-OC2 | **Folded.** Verified: no `text` import exists, and all seven `json` imports are in showcase routes. The text test and the per-call-site table are dropped, leaving one `/healthz` content-type assertion. | Task 2 |
| PC11 | **Folded.** Verified: `factory.ts:72-74` throws `cairn auth-channel: origin mismatch`, and Kit 3's `respond.js:125` produces the literal. The pair asserts Kit's exact body and never the factory's message. The same-origin half asserts the form's own success or validation state. | Task 9 |
| PC12 | **Folded.** The admin Save case is labeled a regression case, not evidence for the header or the meta. | Task 9 |
| PC13, R-OC2 | **Folded.** The class-gate override is declared in the header. Task 12's grep excludes `emit-template-dir.test.mjs` (verified at `:143`) and adds `\$lib`, `event.platform`, and `platform.env`. The finding's `\.platform\b` would match `process.platform`, which is not a binding read, so it is not used. | Header; Task 12 |
| PC14 | **Folded.** The warnings grep sits beside the build's exit 0 and a line every successful build prints. | Task 11b |
| PC15 | **Folded.** `GET /admin/login` must also show cairn's login form marker. | Task 1; Task 11b; Close step 3 |
| PC17 | **Folded, three parts.** Component stubs: `src/tests/component/` and `vitest.config.ts` join Task 2's Files and grep (verified from the stub's header). Reference snippet: quoted from the type test in Task 13. `env` typing: folded with a different form. The lens's `CairnPlatformBindings & Partial<CairnMediaBindings>` is refused, because the bucket's binding name is adapter-configured and read through `requireBucket(env, bindingName)` over a `Record<string, unknown>` (`src/lib/env.ts:98`). The Interfaces line says so, and the report states the type that call site sees. | Tasks 2, 11b, 13 |
| PM7 | **Folded.** Verified at `MediaUploadDialog.svelte:212` and Kit 2.70.3's `goto` options. Task 2 exempts the `goto` option, and 11b renames it to `refreshAll`. | Tasks 2, 11b |
| PM9 | **Folded.** Task 6's notes say `wrangler dev` rejects `--strictPort`. | Task 6 |
| PM10 | **Folded.** Verified: `e2e.yml` has no `matrix:`. Task 5's Files and Decision 3 now say "width sweep" and limit `e2e.yml` to comment and path edits. | Task 5; Decision 3 |
| PR7 | **Folded.** The `vite preview` line joins the `Consumers must:` list. | Decision 13; Task 13 |
| FA1 (fold) | **Folded.** `src/tests/unit/dist-sveltekit-app-import-boundary.test.ts` asserts that esbuild bundles `./sveltekit` with no unresolved `$app/*`, which protects a raw-esbuild consumer bundling `createD1AuditSink`. Its externals lack `cloudflare:*`. A `building` read from `$app/env` in the guard would turn it red at 11b. Spike item 4 now proves a gate form that keeps the barrel clean, with `cloudflare:*` external as Wrangler treats it. Finding none stops the pass for Geoff, because the spec names `$app/env`. 11b's Building outcome and Files follow suit. This adds an acceptance on an existing test, not new machinery. | Task 1 item 4; Task 11b; Review focus 1 |

### Over-ceremony

| ID | Disposition | What the dropped ceremony caught |
|---|---|---|
| C-OC1, R-OC1 | **Folded.** Task 6's gate is E plus its two named runs. | F's showcase e2e over a task that changes no runtime code. The S2 boundary runs F and CI on the same head. |
| C-OC3 | **Folded.** The stale-tab browser case merges into the site-wide test's stripped-meta case, which asserts Kit's literal body. | A second browser run of the same observation. |
| C-OC4, M-OC3 | **Folded.** The fresh-agent harness rerun in S0 is dropped, and 11b's run is the reproduction check (Decision 7). | A harness that depends on the spike agent's environment, now caught at 11b rather than S0. One fix in an Opus context is the accepted cost. |
| C-OC5 | **Folded.** The S5 pre-flight leaves the facts set to Task 13's own grep. | A duplicate grep. |
| M-OC1 | **Folded.** D is now `check:docs-gate && check:surface && check:rulings-format`. Verified: `docs-gate.mjs` already runs `check:docs`, `check:vale`, `check:facts`, `check:reference`, and the signatures check. | Nothing. The dropped commands re-ran checks already inside `check:docs-gate`. |
| M-OC2 | **Folded with PM3.** Spike item 3 narrows to confirming the `--var` command and a 200 from `/admin/posts`, and `.dev.vars` is not probed. | `.dev.vars` delivery, which the Global constraints now forbid. |

## Rulings for Geoff

1. **Engine-side `/media` caching through the Cache API** (PM2). This is a yes or no question; the
   recommendation is **no**, with a ROADMAP watch. The plan's "Rulings for Geoff" section carries
   the grounds and states what each answer builds.

## Measures

- **New-mechanism findings:** 0 folded, 2 not folded. PC3's standing freshness gate was refused: no
  measured staleness. PM2's engine Cache API layer goes to Geoff as Ruling for Geoff 1. Three folds
  add assertions to existing or already-planned checks rather than new machinery: PC8's positive
  control, PM5's boundary-script match, and FA1's boundary-test externals.
- **Dispositions:** 45 IDs (44 review IDs plus FA1).
  - 40 folded in full. Three of these name a refused alternative: PM1's `--persist-to`, PC13's
    `\.platform\b`, and the PC17 intersection type.
  - 4 folded with a part refused: PC3's standing gate, PC5's after-S4 cut, PC16's credential fold
    (moot), and PR6's ignore check (moot).
  - 1 disclosure folded with its remedy sent to Geoff: PM2.
  - The conductor decisions on PM8 and PR3 are applied, and are counted among the 40.
- **Plan line count:** 872 before, 1108 after.
- **Token ceiling:** 12.0M before, 12.4M after (80 percent trigger 9.6M to 9.9M).
  - Added: Task 11a as a tenth Sonnet chain (+0.55M) and the larger security-read input set
    (+0.05M).
  - Saved: Task 6's lighter gate (−0.15M) and the spike's dropped rerun and narrowed item 3
    (−0.1M).
  - 11b keeps 2.0M because 11a takes the prep slice; mechanics had sized the unsplit task near 3M.
  - The added mutation proofs fall inside the existing per-chain rate and the 1.0M fix reserve.
  - A "yes" on Ruling for Geoff 1 adds about 0.6M (Task 11c).
