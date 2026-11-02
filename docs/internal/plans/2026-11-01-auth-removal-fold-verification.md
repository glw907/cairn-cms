# Auth removal plan: fold verification

Verification read of the fold at `0cd71cb8e`. Line numbers are in the current plan unless a file is
named. Read only: no gate ran, since this worktree has no `node_modules`.

Count: 0 blocker, 4 major, 5 minor. No **OWNER FORK**. Each proposed fold is a line or two in the plan.

## Findings

### 1. `check:symbols` goes red at T3 on `CHANNEL_SCHEMA_SQL`

- **Severity:** major. **Tag:** `correctness`.
- **Location:** T3 `scripts/checks/check-symbols-allowlist.mjs` bullet (`:290-292`), T3 acceptance
  (`:354-356`); `MIGRATION-NOTES.md:518`; `scripts/checks/check-symbols.mjs:647,738`.
- **Defect:** the fold of mechanics 7 checked only the `file-path:` class ("`:517` is the one
  file-path hit"), and that claim is true. The `env-var` class also applies. `MIGRATION-NOTES.md:518`
  names `` `CHANNEL_SCHEMA_SQL` `` in code voice, and `envVarInSourceTree` resolves a token by grepping
  `src packages migrations examples/showcase scripts .github`. Its only hits are
  `auth-channel-migration-drift.test.ts`, `auth-channel-resolve-db-type.test.ts`,
  `worker-wait-until.test.ts:17`, and `channel-db.test.ts`, and T3 removes all four. It has no
  allowlist row. A scripted sweep of every code-voice token in the gate's scope against the tree minus
  T3's deletes found this one and no other.
- **Proposed fold:** add `'env-var:CHANNEL_SCHEMA_SQL'` with a reason to the same T3 bullet, beside the
  `file-path:` row.

### 2. T8's acceptance loop is refused as written

- **Severity:** major. **Tag:** `correctness`.
- **Location:** T8 acceptance (`:581-583`); Stops `:92-94`.
- **Defect:** this is the final form the fold didn't rerun. Run here with `<base>` as `HEAD`, the
  worktree-isolation harness refused it: "names git in a form too complex to verify". The cause is
  `git diff` inside a `for`. The T8 executor has no answer for that, and `:94` reads "Any other refusal
  stops the line", so a documentation check can stop the pass. T1's loop has no `git`, and it ran. It
  prints 15 of 17 terms on the base, as the fold record says.
- **Proposed fold:** split it, which ran here without a refusal:

  ```sh
  git diff <base> -- CHANGELOG.md > /tmp/auth-removal-changelog.diff
  ```

  ```sh
  for t in ...; do grep '^+' /tmp/auth-removal-changelog.diff | grep -q -- "$t" || echo "missing: $t"; done
  ```

  State that `<base>` here is the commit the pass started from, which "Overlap with 1b" may have moved.
  A moved `<base>` is harmless, since no task before T8 writes `CHANGELOG.md`. The unmoved one would
  count 1b's merged entry as added lines.

### 3. Narrowing Recover's step 3 to "a status other than 422" leaves the design's own 403 and 404 on the key path

- **Severity:** major. **Tag:** `correctness`.
- **Location:** T2 `rotate-the-github-app-key.md` bullet (`:208-216`), T2 acceptance (`:218-220`);
  design "What is not proved" (`:90-92`); `docs/admin/rotate-the-github-app-key.md:114-116`.
- **Defect:** the fold fixes the 422 root in the `?live=1` path, and the class and the new step are
  coherent with the page: line 74 reaches Recover, and old step 3 is the `ok: true` plus record path.
  The narrowing is not at the root, though. The design says the 422 is inferred, unprobed, and that
  GitHub may answer 404 or 403, which "point near the right fix". On the save and shell path they don't.
  A `github.unreachable` record carrying `failed: 404` or `failed: 403` still matches the narrowed step,
  which sends the owner to a rollback or a third key. Neither status is a key fault: `health.ts:84-85`
  already classes them as installation problems. So if the unproved inference misses, T2's Outcome
  ("doesn't send the owner to replace the key") fails on the very failure this pass introduces, a stale
  or uncovered `repo`. The same is true of a 5xx.
- **Proposed fold:** turn the narrowing around. Old step 3 covers status 401 alone, the one status that
  blames the key. The new step covers any other status on that record and the `detail`
  `token_request_refused`. T2's acceptance reads "no step that covers a status other than 401 links
  to...". No new class, no code.

### 4. A merge at T9 step 7 has no smoke rule, and the acceptance can't then be met

- **Severity:** major. **Tag:** `correctness`.
- **Location:** T9 head (`:593`), step 7 (`:624-626`), acceptance (`:633-634`); Stops `:75`.
- **Defect:** the fold's rerun rule covers "a fix". Step 7's merge of `origin/main` isn't one. The
  plan says to plan on that merge, and it can carry `src/lib` or `examples/showcase` changes from 1b.
  After it the head is merge plus deletion, so the smoked commit is neither the head nor its parent, and
  the "that head or its parent" acceptance is false with no standing answer. The contract fold B4
  justified the parent allowance by "that commit touches no code", which the merge breaks.
- **Proposed fold:** after step 7's merge, if `git diff --name-only <smoke-sha> HEAD` lists anything
  under `src/lib`, `examples/showcase`, or `migrations`, rerun step 5. Otherwise the PR body names the
  smoked commit and says the merge left those paths alone, and the acceptance reads "or an ancestor
  whose diff to the head touches none of those paths".

### 5. `auth.channel` in T8's loop passes on `auth-channel`

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** T8 acceptance (`:582`).
- **Defect:** the term runs as a regex, so `.` matches the hyphen, and a line reading `/auth-channel`
  satisfies it. Tested. The retired events are the item the fold added this term for, and the check
  cannot fail on their absence while `auth-channel` is present.
- **Proposed fold:** use `'auth\.channel\.'`. It behaves in the loop, tested with fold 2's form.

### 6. Setting T6's half or T7 aside leaves their acceptance false

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** Stops `:58,99`; T6 acceptance (`:529`); T8 acceptance (`:582`); T9 step 9 (`:630`).
- **Defect:** the outcome stays intact, and the sheet's may-not list holds. But with the
  `LoginRequestOutcome` half cut, T6's grep still fails on `RequestOutcome` and `form?.sent`, and T8's
  loop requires `RequestOutcome` and `tokensMatch` in lines that no longer belong. The path is 420, so
  this only matters on a set-aside.
- **Proposed fold:** one sentence in Stops: a set-aside item's terms leave T6's and T8's checks, and
  T9's verdict line says so.

### 7. T3 leaves "a channel database" in the scaffolded `wrangler.jsonc`

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** T3 showcase edit (`:301`); `examples/showcase/wrangler.jsonc:25-26`, emitted to
  `templates/waymark/wrangler.jsonc:26`.
- **Defect:** the fold widened T3's regex, and every hit of it is on a T3 or T4 list, confirmed file by
  file. This comment sits outside the `MEMBER_DB` block and the regex, ships to every scaffold, and
  names the removed concept. T3's Outcome says no reference.
- **Proposed fold:** add it to the `wrangler.jsonc` bullet: reword to "a second database sharing the
  default `migrations/`".

### 8. The 8788 branch isn't carried through step 5 or Pre-flight

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** T9 step 5 (`:605-622`); Pre-flight (`:31-33`).
- **Defect:** the answer itself holds. `BASE` at `smoke-pass3.mjs:22` is the script's only URL, and the
  `origin` header and link rewrite read it. `--inspector-port` matches `playwright.config.ts:48`.
  `PUBLIC_ORIGIN` is 4173 either way, and the script rewrites the link's host. Three loose ends remain:
  the written command and the `Ready on http://localhost:8787` check name 8787 only, nothing checks 8788
  is free, and Pre-flight doesn't name the `/tmp` copy or the `sed` redirect, while `:94` stops the line
  on any refusal. The copy's step label also still prints "8787", which belongs in the PR note.
- **Proposed fold:** in the 8788 sentence add "check 8788 with `ss` too, and confirm `Ready on
  http://localhost:8788`; the copy's first step label still says 8787". Add the copy to Pre-flight's
  line, and to the conductor's write check.

### 9. T5's "add `--local`" produces a command wrangler won't take

- **Severity:** minor. **Tag:** `correctness`.
- **Location:** T5 `adopt-cairn.md` bullet (`:440-445`).
- **Defect:** the taught command carries `--remote`. Adding `--local` gives both flags. The SQL itself
  holds: run against `0000_auth.sql`, it stores a normalized email and epoch milliseconds, and
  `store.ts:62-63` compares on the same normalization. `lower` and `trim` are ASCII-and-space only, which
  is narrower than `normalizeEmail`, and that doesn't matter for a person's own address.
- **Proposed fold:** "with `--local` in place of `--remote` for `wrangler dev`".

## Checked, no finding

**Dispositions.** Every `folded` row I traced against the plan is carried at the root, apart from
findings 1, 3, and 4. The read followed the rows behind the listed mechanisms and greps, not all of them
line by line. The refusals are true. `pass-core`'s host line, T7's review, and the Metadata
bullet hold on the reasons given. The fold record's rulings match the plan.

**Mechanisms.**

- `token_request_refused`: nothing else reads the class. `tool/` and `docs/` have no switch on the
  siblings, and the type isn't in `api-surface.md`.
- `npm run package` before emit: `bake-template.mjs:227` holds. `check:surface` runs `package` itself, so
  T3's and T5's order of the two is harmless.
- `@ts-expect-error`: the convention, in `factory-contracts.test.ts` itself, 23 uses in `src/tests`.
- `lower`, `trim`, `unixepoch`: columns and `NOT NULL` match `0000_auth.sql`. Run on SQLite. The workerd
  allowlist claim was not refetched.
- `csrf-origin.spec.ts` retarget: `form[action="?/request"]` is at `LoginPage.svelte:173`, the admin CSP
  is `frame-ancestors` alone, so a cross-host form post isn't blocked, and the file's own no-JS test
  already pins 200 from that action.
- `createFakeR2`, `probe-craft`, `error-fixture`: `createFakeR2` is a dev export through
  `index.ts`'s `export * from './fake-r2.js'`. The other two are excluded routes, absent from
  `templates/waymark`.

**Acceptance greps, on the current tree.**

| Task | Can pass after | Can fail on a wrong result |
|---|---|---|
| T1 section loop | Yes | Yes: 15 of 17 miss on the base |
| T1 `sequence(` pair | Yes: `custom-screen.md:172` is the one hit | Yes |
| T3 | Yes: the 70 hit files left after T3's deletes are each on a list, a generated output, or a named permalink | Yes |
| T4 | Yes: `SKILL.md:30`, `durable-gotchas.md:259,489,539`, all T4's | Yes |
| T5 | Yes: every hit is listed | Yes |
| T6 | Yes, unless a half is set aside (finding 6) | Yes |
| T7 | Yes | Yes |
| T8 | No as written (finding 2) | Partly (finding 5) |

"`## Unreleased` already names five" is true: `auth-channel`, `createChannelDb`, `auth-store`,
`AuthBranding`, `auth.channel`.

**New scope.** None beyond #203, which packet 20261101T150717-448700 added. The class is the one thing
the fold adds to a public union, and it sits inside that item. Everything else subtracts or corrects.

**Stops.** Each has a cheap answer. The may-not list is a superset of the sheet's. Every escalation item
leaves "nothing merges" intact. The one gap is `:94` catching a harness refusal (findings 2 and 8).

**Path.** 60 + 120 + 50 + 60 + 15 + 40 + 75 = 420, under 480. The serial sum is 490, and the pre-fold
285 is right.

**Pair disjointness.** T1 and T2: disjoint. Each emit touches only its own copy. `MANIFEST` lists paths
with no hashes, and neither task adds or removes a packaged file. T3 and T4: disjoint. T4's files aren't
emitted, and `pass-gate-tiers.md` is T3's alone.
