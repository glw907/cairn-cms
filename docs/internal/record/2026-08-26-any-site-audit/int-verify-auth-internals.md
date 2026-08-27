# Verification: auth-internals findings (fresh context)

Verifier: fresh-context verifier, did not produce the findings. Repo `main`, clean tree.
Standards consulted: `docs/internal/code-idioms.md` (full read), `docs/internal/engine-rulings.md`
(TOC + grep), `docs/superpowers/plans/2026-08-03-auth-channel-factory.md`,
`docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md`, the four public barrels,
`docs/internal/record/`.

One standing fact that bears on all four auth-channel findings. The auth-channel plan's own
close-out (`2026-08-03-auth-channel-factory.md:410-412`) records its execution decisions as
"all spec-compatible, **none reviewed by an adversarial round, flagged for pass 2's context**",
and names the ninth `mintCode` parameter among them. So none of AUTH-01/03/04 is overturned by
a prior ruling; they are the review that plan deferred.

---

## AUTH-01 — `charge()` restates its admission predicate in the SET clause

**STANDS. Tier refactor (unchanged).**

Verified empirically rather than by reading. Ran the upsert shape under `node:sqlite`
(Node 24) with a `-999` sentinel planted in the SET's ELSE branch:

```js
ON CONFLICT(bucket) DO UPDATE SET
  count = CASE WHEN (b.count + b.prev_count * ?4) < ?5 THEN b.count + 1 ELSE -999 END
WHERE ((b.count + b.prev_count * ?4)) < ?5
```

Under cap: returns `count: 6`. At cap: returns `undefined` and the stored row is unchanged at
`count: 6`. The sentinel is never written. This proves both halves of the finding's premise:
the upsert `WHERE` is evaluated against the pre-update row, and when it is false the SET does
not run at all. Every `ELSE cairn_channel_budget.count` (store.ts:381) and `ELSE 0`
(store.ts:390) in the real statement is therefore unreachable.

The two expressions are textually distinct copies of one estimate compared against the same
`?5` (store.ts:376-391 vs store.ts:400-410). The lockstep-drift argument holds and no test can
catch a divergence, since the dead branches emit nothing observable until the two disagree.

Checked for a sanctioning ruling: no hit for `DO UPDATE`, `admission`, `belt`, or `dead branch`
in the spec or plan. `code-idioms.md` has no Storage section at all. Nothing sanctions it.

The proposed collapse is equivalent on the live path — admitted same-window gives `count + 1`,
admitted rolled-window gives `1` — so the remediation is sound. `prev_count`'s CASE is genuinely
the window roll and must stay; the finding says so.

**One sub-claim is wrong.** "It is the only interpolation in the three store modules" is false.
`src/lib/auth/store.ts:196` and `:255` interpolate `${placeholders}` (a legitimate dynamic-arity
`IN (...)` idiom), and `auth-channel/store.ts:70` interpolates `${CHANNEL_SCHEMA_VERSION}` into
the migration DDL. The bind-it-as-`?6` recommendation still holds on its own merits — it is the
only interpolation in a *request-path* statement — but the "only" framing should not survive
into the plan.

---

## AUTH-02 — duplicated GitHub transport, already drifted

**STANDS. Tier refactor (unchanged).**

Every structural claim confirmed by grep:

- `const API = 'https://api.github.com'` at `github/branches.ts:8`, `github/repo.ts:10`,
  `github/signing.ts:8`, `doctor/checks-github.ts:12`. Four copies.
- `function gitUrl(repo, suffix)` at `branches.ts:20` and `repo.ts:163`, identical bodies
  (`repo.ts`'s carries a TSDoc line, `branches.ts`'s does not).
- Two header builders: `headers(token)` (branches.ts:10) and `ghHeaders(accept, token?)`
  (repo.ts:13).
- `branchHeadSha` (branches.ts:25) and `headCommitSha` (repo.ts:168) issue the same
  `git/ref/heads/...` GET and diverge on 404 (drain-and-null vs fall through to throw) and on
  error detail (status + body text vs status alone).
- A4 ("discarded fetch bodies are drained") is violated at `repo.ts:65` and `repo.ts:84`
  (`if (res.status === 404) return null;` with no `body?.cancel()`), while `branches.ts:27-30`
  drains and explains why. `repo.ts:134` drains, so the file is internally inconsistent too.

Adversarial check. The contract split between the two readers is defensible on its own
(`branches.ts` probes a branch that may not exist; `repo.ts` reads a head that must), so
"delete `headCommitSha`" is a design call, not a bug fix — but `headCommitSha` has exactly two
call sites (`repo.ts:289`, `:294`) and both want a throw, so the collapse is cheap and the
duplication of `API`/`gitUrl`/headers is indefensible regardless. Charter A2 already sets the
precedent that near-verbatim copies converge to one helper; sweep cluster 7 (`auth-github`)
covers M1/M2/M4/N4/A5 only, so this is *not* already-filed work.

**One sub-claim is overstated.** "against E5" does not hold as written. E5 requires "the HTTP
status AND the request path"; `repo.ts:65,85,172,181` all carry a subject plus the status
(`GitHub read ${path} failed: ${res.status}`). What they lack is the response *body* text, which
the exemplar carries and E5 does not require. Fix the plan's wording: the divergence is from the
exemplar, not from the rule.

---

## AUTH-03 — comments anchored to unresolvable planning artifacts

**STANDS, but materially overstated. Revised tier: note.**

The pattern is real. Confirmed at every cited line: `factory.ts:4-6` ("(Task 3)", "(Task 4)",
"Task 1's store", "Task 5"), `factory.ts:400,597,781` ("the plan's Task 5" / "plan Task 5"),
`access.ts:187` ("R9 removed"), `access.ts:207` ("(C2 R9 and C2b)"), `dev.ts:5` ("v2 of the
design"), `credentials.ts:3` and `signing.ts:126` ("(Plan 05)").

Three corrections, all against the finding.

1. **The count is inflated roughly 2x.** An exhaustive grep for `Task N`, `Plan N`, `R<n>`,
   `C2`/`C2b`, and `v2/v3 of the design` across `auth/`, `auth-channel/`, `github/`,
   `auth-store/`, `auth-crypto/` returns **14** occurrences, not "about thirty". ("phase-3a",
   quoted in the analysis's prose, is in `code-idioms.md`, not in any source file.)

2. **"None resolves from the code" is false for most of them.** `factory.ts:1-2` *does* cite
   the spec path (`docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md`), and
   `docs/superpowers/plans/2026-08-03-auth-channel-factory.md` sits beside it with Tasks 1-5, so
   "Task 5" is one directory listing away. "Plan 05" resolves to
   `docs/superpowers/plans/2026-05-28-cairn-rebuild-05-admin-ui.md` via the numbered plan series
   CLAUDE.md already names. "C2"/"C2b" resolve to `2026-08-02-c2-breaking-window.md` and
   `2026-08-03-c2b-refusal-channel.md`. What genuinely does not resolve: the bare `R9` at
   `access.ts:187` (the token appears in 10+ unrelated docs; only the `C2 R9` form at :207
   disambiguates) and `v2 of the design` at `dev.ts:5`, whose header carries no spec path.

3. **The analysis's own counter-exemplar is broken.** It holds up `signing.ts:100` as proof
   that a resolvable citation is achievable. That comment cites
   `docs/internal/2026-07-13-admin-token-cache-poisoning.md`; the file actually lives at
   `docs/internal/record/2026-07-13-admin-token-cache-poisoning.md`. The path is stale. This
   *strengthens* the underlying case (comment anchors rot) while falsifying the specific claim.

One defect the finding does not name and should. `access.ts:187` is not merely an unresolvable
anchor, it is a broken sentence: "instead of falling back to the attacker-chosen `url.pathname`
R9 removed:". Whatever else happens to the anchors, that line needs rewriting.

Tier revised to **note**: with the count halved and most anchors resolvable in one step, this is
a bounded comment sweep touching no code shape — the same weight the analysis itself assigns to
its other comment-only items (#13 E7 clause, #14 M1 prefix).

---

## AUTH-04 — `mintCode` takes nine positional parameters

**STANDS. Tier refactor (unchanged).** The strongest of the five.

- Signature confirmed at `store.ts:186-196`: nine parameters, called positionally at
  `factory.ts:632-642`.
- Type-collision hazard confirmed: `nonceHash`, `identity`, `codeHash` are three adjacent
  `string` slots; `ttlMs` and `cooldownMs` are two adjacent `number` slots. Transposing either
  pair typechecks. The `nonceHash`/`codeHash` transposition mints a code that can never be
  opened; the TTL/cooldown transposition mis-expires. Both are silent.
- Charter **F4** is unambiguous: "New internal functions taking more than two logical inputs
  take one options object. Existing public signatures are frozen." `mintCode` postdates the
  charter (charter 2026-07-01, auth-channel 2026-08-03), is not exported from
  `auth-channel/index.ts` (which exports only `createAuthChannel`, `devDelivery`,
  `CHANNEL_SCHEMA_*` and six types), and has exactly one call site. The rule applies and the
  frozen-surface exemption does not.
- `auth/store.ts:41` `issueToken` (5 params) is confirmed absent from `auth-store/index.ts`, so
  the finding is right that it is convertible; `insertEditor` is exported and correctly left
  frozen.

Adversarial check: the plan pre-specified the positional shape (`plan:85`), but a plan is not a
ruling, and that same plan flags the ninth parameter as an unreviewed execution decision. No
entry in `engine-rulings.md` touches it.

Cosmetic: the finding's title says "three of them same-typed hashes" while the analysis body
says "two"; three is correct (`nonceHash`, `identity`, `codeHash`).

---

## AUTH-05 — no marker for which exports are frozen public surface

**STANDS as an observation, but the remediation is wrong as scoped. Revised tier: note.**

The literal claim is true: `auth/store.ts:32` `findEditor` (internal) and `:118` `listEditors`
(published) are indistinguishable at the definition site, and the same holds in `auth/crypto.ts`
between `cookieName` (published) and `sessionCookieName` (withheld).

Four things the finding does not weigh, which together move it down a tier.

1. **Both barrels already carry an explicit, named ruling.** `auth-store/index.ts:1-7` names
   `findEditor`, `issueToken`, and "session handling" as deliberately unexported and says why.
   `auth-crypto/index.ts:1-8` names the TTL constants, `SEND_COOLDOWN_MS`, and the engine's own
   cookie-name functions as deliberately withheld and says why. This is not a boundary that
   "lives only in an index file" as an accident; it is a boundary documented at its one home.
2. **`auth/store.ts:6-8` already tells the reader `/auth-store` is public surface**, in the
   module header, as part of the email-normalization invariant.
3. **No marker convention exists anywhere in the engine.** `grep -rn '@public\|@internal\|Public
   surface' src/lib` returns zero hits across seventeen public barrels. Tagging two files creates
   a new inconsistency: marker-absence would then read as "internal" in these two files and mean
   nothing in the other fifteen. This is an engine-wide convention decision or it is nothing.
4. **It duplicates the boundary into two places that must stay in lockstep** — precisely the
   hazard AUTH-01 condemns in the same report. If a marker convention is adopted, it should be
   gate-derived (generate or verify the tags from the barrels in `check:surface`) rather than
   hand-maintained.

The safety net also already works: `check:surface` is a named CI-only gate that fails on any
exported-signature change, and `docs/reference/auth-store.md` documents the published set.

Keep the finding — the "teach before, not after" argument is legitimate under the
agent-extensibility limb — but as a **note** proposing an engine-wide, gate-enforced convention,
not a two-file refactor.

---

## Summary

| id | stands | tier | note |
|----|--------|------|------|
| AUTH-01 | yes | refactor | Dead branches proven empirically; "only interpolation" sub-claim false |
| AUTH-02 | yes | refactor | All duplication confirmed; "against E5" sub-claim overstated |
| AUTH-03 | yes | note (was refactor) | ~14 sites not ~30; most anchors resolve in one step; counter-exemplar path is itself stale |
| AUTH-04 | yes | refactor | Cleanest hit; F4 applies squarely, plan flags it as unreviewed |
| AUTH-05 | yes | note (was refactor) | Barrels already rule explicitly; no such convention exists engine-wide; fix must be gate-derived |
