# create-cairn-site Pass T4b.1: the live run's defect harvest

> **For agentic workers:** each task is dispatched to `cairn-implementer` (pinned Sonnet),
> test-first. The main loop reviews each diff and confirms the gate (targeted test, then
> `npm test` exit 0 in `packages/create-cairn-site`; the package has no `check` script and the
> root check does not cover it) before the next dispatch. Tasks 1 and 2 both touch
> `chapter2.mjs`, so dispatch them serially, 1 before 2. Tasks 3 and 4 are independent of both
> and of each other.

**Goal:** fix the four defects T4b's live e2e harvested, none of which its fakes could reach:
two that strand a real owner, one that misleads them, and one classification left correct only
by luck.

**Why its own pass:** each defect was found after the task that would have owned it was closed,
and the standing rule routes discovered work to the pass that first leans on it rather than
bolting it onto one in flight. T4c does not lean on any of these; owners do.

**Parent:** the T4b plan's post-mortem part three and the spike doc's "The live e2e" section
carry the evidence for every claim below. There is no separate spec; this plan's four rulings
are the design, and they are deliberately committed rather than offered as options.

## Global constraints (inherited from T4b, unchanged)

- The runtime library (`src/lib`) is untouched.
- No secret under the project directory; tokens opaque and absent from argv.
- Only `chapter2.mjs` writes `step` or calls the state store.
- Every exit prints a next step. `--dry-run` performs nothing.
- No suite touches the operator's desktop.
- Comment style: TSDoc-shaped doc blocks with `@param {type}`; the em dash is banned in
  comments and owner-facing copy.
- Owner-facing copy is calm and plain; every dollar figure or platform promise carries its date.

## The four rulings

1. **A scope failure clears the saved token; a park still keeps it.** The terminal-state rule is
   untouched. What changes: when a chapter call throws `token-scope-missing` or `token-invalid`,
   the run deletes the saved `apiToken` before the error surfaces, so the re-run the row already
   tells the owner to do actually re-collects a token instead of silently reusing the bad one.
   Additionally, an unattended run (`--yes`) that carries `CAIRN_CF_API_TOKEN` prefers it over a
   saved token when the two differ, because an operator who set the variable is expressing intent
   the saved value cannot override. Validation stays a read; the late 403 stays the legible
   failure; what goes away is the dead end.
2. **The zone hop reads before it writes**, joining the discipline every other non-idempotent
   write in the tool already follows. `ensureZone` lists zones by name first, adopts on a hit,
   and POSTs a create only on a miss. The 1061-triggered adopt stays as a second line of defense
   against races, but it stops being the only door: a 403 on the create can no longer mask a zone
   that never needed creating.
3. **The tool does not promise delivery, anywhere.** Two copy changes. The email completion keeps
   naming what was proven (Cloudflare accepted a real message from the site's own address) and
   gains the warm-up expectation: a brand-new domain takes time before receivers trust it, a
   first-day link that does not arrive usually means reputation rather than breakage, and
   `cairn-doctor --send-test` is the way to re-prove the path. No timeline is promised; the
   claim is dated. And `printLiveInfo` stops saying "Email arrives with a later chapter", which
   T4b made false; it names `--email` on a re-run instead.
4. **`10204` joins `10203` under the window classification, on purpose.** Both dotted
   identifiers (`sending_disabled`, `sender_not_configured`) describe the sender-not-ready
   family, and inside chapter 2 a send only ever runs after a successful onboard, so either code
   within `PROPAGATION_WINDOW_MS` is most plausibly settling state and either past it means
   onboarding did not take. `10204` was never observed on a just-onboarded domain (it appeared
   only on never-onboarded ones, and not consistently even there), so the test names that, per
   the house rule for unobserved conditions. The fall-through for genuinely unknown codes stays.

## File structure

```
Modified:
  src/cloudflare/prefill.mjs     env-beats-saved rule under --yes (+ .test.mjs)
  src/cloudflare/chapter2.mjs    scope-failure token clear; completion copy (+ .test.mjs)
  src/cloudflare/zone.mjs        list-first ensureZone (+ .test.mjs)
  src/cloudflare/api.mjs         SENDER_NOT_CONFIGURED_CODE export (+ .test.mjs)
  src/cloudflare/email.mjs       both codes under the window (+ .test.mjs)
  bin.mjs                        printLiveInfo copy (+ its tests)
  test/fake-cloudflare.mjs       the captured 10204 body as a scripted failure (+ .test.mjs)
  CLAUDE.md                      the email gotcha names both codes
  CHANGELOG.md                   under ## Unreleased
  docs/STATUS.md                 pass close
```

No new files, no new public surface, no state-shape change.

---

### Task 1: The saved-token lock (ruling 1)

**Files:** `src/cloudflare/prefill.mjs`, `src/cloudflare/chapter2.mjs`, both test files.

Two halves, one dispatch:

- In `ensureApiToken`, under `yes`: when `CAIRN_CF_API_TOKEN` is set and differs from the saved
  token, validate and prefer the env value, and persistence follows the existing flow (the
  caller saves what the chapter used). The interactive path is unchanged.
- In `runChapter2`: catch an error whose `catalogue.code` is `token-scope-missing` or
  `token-invalid`, delete the saved token via the existing deletion helper, then rethrow
  unchanged. The row's copy already says to create a new token and re-run; this makes the re-run
  do what the copy promises.

**Constraints.** A park (`wait` row) and a decline still keep or delete the token exactly per
T4b's terminal-state rule; this touches only the two scope-failure codes. Do not widen the catch:
an unknown act row must not cost an owner a working token.

- [ ] **Step 1: Failing tests.** A `--yes` run with a differing env token uses and saves the env
  token (fake's request log shows the new bearer); a `--yes` run with no env and a valid saved
  token still uses the saved one; a chapter call failing `token-scope-missing` leaves the re-read
  record with no `apiToken` and the raw bytes clean, while the error and exit code are unchanged;
  the same for `token-invalid`; a propagation park still keeps the token (the regression guard on
  the untouched half of the rule).
- [ ] **Step 2: Implement; suite green; commit.**

### Task 2: The copy that overclaims (ruling 3)

**Files:** `src/cloudflare/chapter2.mjs` (completion copy), `bin.mjs` (`printLiveInfo`), their
test files. Dispatch after Task 1 lands; both edit `chapter2.mjs`.

Copy requirements, in the owner's language:

- The completion keeps its provable claim and adds the expectation, shaped roughly: the test
  message was accepted by Cloudflare from `no-reply@<domain>`; a domain this new has no sending
  history yet, so the first real sign-in emails can take a while to be trusted and delivered,
  and that settles on its own as the domain sends; if a link has not arrived, that is the usual
  reason, and `npx cairn-doctor --from <addr> --send-test <you>` re-proves the path any time.
  Dated (`as of 2026-08-12`), no promised timeline, no "3,000", and the existing DMARC paragraph
  and doctor line stay.
- `printLiveInfo`'s "Email arrives with a later chapter." becomes a line naming the truth: connect
  a domain and turn on email sign-in any time by re-running with `--domain <name> --email`.

- [ ] **Step 1: Failing tests.** The completion names "accepted" rather than "delivered" or
  "sends its own" as the proven claim, carries the doctor command and the date, and does not
  promise arrival; `printLiveInfo` no longer contains "later chapter" and names both flags.
- [ ] **Step 2: Implement; suite green; commit.** Reread the whole completion block once for
  cadence; this is owner-facing prose, not a checklist of asserted substrings.

### Task 3: The zone hop's write-before-read (ruling 2)

**Files:** `src/cloudflare/zone.mjs`, `src/cloudflare/zone.test.mjs`.

`ensureZone` gains a list-by-name read ahead of the create, mirroring `ensureSendingDomain`'s
shape: a hit adopts (the existing adopt path, unchanged), a miss creates. Keep the 1061 branch as
the race guard, with a comment saying why it stays.

- [ ] **Step 1: Failing tests.** An existing zone plus a token that cannot create adopts
  successfully and issues **no** POST (the fake's request log is the proof); a missing zone still
  creates; a missing zone plus a create-refusing token still surfaces `token-scope-missing`; the
  1061 race branch still adopts when the list missed and the create collides.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 4: The second refusal code (ruling 4)

**Files:** `src/cloudflare/api.mjs`, `src/cloudflare/email.mjs`, `test/fake-cloudflare.mjs`,
their test files, `CLAUDE.md`.

- `api.mjs` exports `SENDER_NOT_CONFIGURED_CODE = 10204` beside the existing constant, doc block
  carrying the captured identifier `email.sending.error.email.sender_not_configured` and the
  caveat that it was observed only on never-onboarded domains, inconsistently.
- `email.mjs` classifies either code through the same window logic; the constants are imported,
  never copied.
- The fake gains the captured 10204 body as a scriptable failure so both codes are drivable.
- `CLAUDE.md`'s email gotcha amends "one code" to name both, staying inside the file's context
  budget (trim elsewhere in the paragraph if needed, not the facts).

- [ ] **Step 1: Failing tests.** `10204` inside the window parks as propagating and past it
  throws unavailable, boundary inclusive/exclusive like `10203`'s; the test names record the
  condition was never observed on a just-onboarded domain live; an unknown code still falls
  through to `email-send-failed`.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 5: Close the pass

- [ ] **Step 1:** `CHANGELOG.md` under `## Unreleased`: one entry for the four fixes, plain
  about which were owner-stranding. No `Consumers must:` line is needed (the tool is unpublished
  and the engine surface is untouched), and the entry says so.
- [ ] **Step 2:** Run the gates: package `npm test`; root `npm run check` and `npm test`; the
  named list (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`,
  `check:surface`, `check:comments`, `check:version`, `check:snippets`). `code-simplifier` over
  the changed code.
- [ ] **Step 3:** Post-mortem in this file; STATUS updated (T4b.1 done, next is the T4c planning
  sitting); prep the context clear per `cairn-pass`.

## Deferred, deliberately, with their homes

- **The stale-negative-resolver park** (two live reproductions): belongs to a pass owning
  `hostname.mjs`; it is a `wait` row that self-heals and never harms the site.
- **Sticky sending authorization**: a recorded platform fact, not work.
- **Reusing one long-lived e2e GitHub App**: a testing-procedure change, noted in STATUS.
- **Delivery verification**: ruling 8 stands, now with evidence.

## Self-review

Ruling 1 is Task 1; ruling 2 is Task 3; ruling 3 is Task 2; ruling 4 is Task 4. Every defect in
the post-mortem's harvest list maps to exactly one task, and each deferred item names the pass
that owns it. The two tasks sharing a file are ordered. No task adds surface, state, or an actor,
and the runtime library stays untouched, so the charter's premise check passes trivially: all
four are repairs to work the engine already claimed to do.

---

## Post-mortem (2026-08-12): all five tasks landed, plus one gate the pass had to fix first

**Every ruling shipped as written.** Ruling 1 is `603d23f4`, ruling 3 is `6e8ba609` (with a cadence
follow-up in `14bcff84`), ruling 2 is `d413334d`, ruling 4 is `c1617033`, and the simplifier pass is
`09962f52`. The package suite went 523 to 544 green, and the root engine suite, untouched by design,
still exits 0 at 5274.

### What was verified, and how

Each fix was probed by breaking it, because a passing test proves nothing about a defect it may
never have exercised.

- **Ruling 1.** Substituting the plan's literal `error.catalogue.code` for the real
  `error.cause.catalogue.code` fails 2 tests; widening the catch to every error fails the guard
  test. Both directions are covered.
- **Ruling 2.** Disabling the list-first adopt (`if (false && hit)`) fails exactly the headline
  no-POST test, which is the live defect's own shape.
- **Ruling 4.** Dropping `10204` from the family fails 4 tests; over-widening the branch to any
  code fails 3.
- **Ruling 3** is copy, so its gate is a read rather than a probe. The whole completion block was
  reread for cadence and two slips were fixed in the main loop: a subject restated across
  consecutive sentences, and "again ... again" inside one sentence.

### The finding that was not in the plan: CI was already red

The package suite **failed on arrival** in a clean worktree, at 2 tests. Both read the baked
`template/` directory, which is gitignored and produced by `prepack`, and
`.github/workflows/test.yml` had no bake step. The tests pass on any machine that has run the CLI
once and fail on every clean checkout, which is why T4b never saw it: `origin/main` sits at
`1415f48e`, so **CI has never run the merged T4b tree at all**. The merge STATUS describes as landed
is local-only.

`test.yml` now bakes before running the package suite, using the same substitution `create-site.yml`
already makes (the engine's own version for both specs, since the bake refuses a `file:` spec and a
`0.0.0` version). Verified in both directions: with `template/` deleted the suite fails at 2, and
after the exact CI command it passes at 544.

This is scope the plan did not authorize, taken because the alternative was running a full local
gate green while knowingly leaving `main` red, which is the failure the `cairn-ci-only-gates` memory
already records once.

### Ruling 3 covered four copy sites, not the two the plan enumerated

The plan named the email completion and `printLiveInfo`. A sweep for the claim found two more: the
send hop's own detail line ("proving delivery works") and `printEmailLiveInfo`, which is what a
*resuming* owner reads at a finished site. The ruling's own words are "the tool does not promise
delivery, anywhere", so all four changed. Fixing two of four would have left the pass's headline
ruling false in the copy a returning owner is most likely to see. The published docs were swept for
the same claim and carry none.

### Decisions locked in

- **A saved token is cleared only by a scope failure.** `token-scope-missing` and `token-invalid`,
  nothing else. A park, a decline, and any unrecognized act row all still keep the token, and a
  test guards each direction.
- **`runActions` rewraps.** Any code catching a catalogued error *outside* a `runStep` must read
  `error.cause.catalogue.code`, because `runner.mjs:58` wraps every hop error as
  `new Error(\`${title}: ${cause.message}\`, { cause })`. The plan's literal property path was
  wrong and the implementer corrected it against the real mechanism, which is the right instinct:
  a plan naming a concrete code shape is a claim to verify, not an instruction to follow. This is
  the same lesson T4a's Task 14 and T4b's numbering trap already recorded.
- **Read before write is now the rule for every non-idempotent Cloudflare call in this tool**, not
  a per-site choice. `ensureZone` joins `ensureSendingDomain`; the 1061 branch survives as a race
  guard with a comment saying so, so it is not deleted later as dead code.
- **The tool claims acceptance, never delivery.** A CLI can observe a 200 from Cloudflare and
  nothing beyond it, which ruling 8 predicted and the live run confirmed.

### Carried forward

- **`CLAUDE.md` is at its context ceiling**, 5997 estimated tokens against a 6000 hook threshold.
  The `10204` amendment fit only after trimming its own paragraph. The next addition to that file
  must trim before it adds; there is no headroom left to spend.
- The stale-negative-resolver park, sticky sending authorization, the one-long-lived-e2e-App
  procedure change, and delivery verification all stay deferred with the homes the plan gave them.
