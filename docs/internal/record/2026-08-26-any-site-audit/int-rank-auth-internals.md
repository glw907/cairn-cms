# Internals audit: auth, auth-channel, auth-crypto, auth-store, github

Auditor: auth-internals internals auditor. Repo at `main` (`0406f1d5`). 20 files, 3,244 lines,
all read in full.

Standards applied: `docs/internal/code-idioms.md` (the idiom charter), the TSDoc standard
(`CLAUDE.md` "Authoring", `check:comments`), the log-event vocabulary discipline, and the
three-limb bar (idiomatic SvelteKit/Svelte 5; inviting to a new developer; easy for an AI agent
to extend).

## State of the area

This is the strongest-reasoned code in the engine and among the weakest-factored. Every security
decision is correct and its "why" is written down: the store keeps only hashes, `consumeToken` is
one atomic `DELETE ... RETURNING`, `removeOwnerIfNotLast` puts the count inside the DELETE,
`tokensMatch` states its three preconditions instead of pretending to guard them, the token cache
stores a resolved token rather than an in-flight promise and cites the production incident that
taught it, and the auth-channel's no-identity-keyed-denial rule is restated at the top of the file
that would violate it. Log-event discipline is perfect: all twelve `auth.channel.*` names appear in
`docs/reference/log-events.md`. Test layout conforms to N6 and the harness rule. The shortfalls are
not in the thinking; they are in the shape. The area holds two GitHub transports that duplicate
their own URL builder, header builder, and branch-head read, and have already drifted in error text
and body-drain discipline. The most security-critical SQL statement in the codebase restates its
own admission predicate in its SET clause, where every else-branch is unreachable. A nine-parameter
positional `mintCode` call sits three lines below a `codeHash` and a `nonceHash` of identical type.
Roughly thirty comments are anchored to planning artifacts a reader cannot resolve ("Task 3",
"R9", "C2 R9 and C2b", "v2 of the design", "phase-3a"). And three sibling public subpaths that are
equally server-only enforce that in three different ways. Grade: **B**. Correctness A, comment
substance A, factoring C+. Nothing here needs re-deriving; a bounded refactor pass closes most of
it, and pre-beta is the moment.

---

## 1. `charge()` restates its admission predicate in the SET clause, where every else-branch is dead

**Tier: refactor. Limb: idiom, comprehension.**
`src/lib/auth-channel/store.ts:360-414`

The rate-limit charge is an `INSERT ... ON CONFLICT DO UPDATE SET ... WHERE <predicate>`. The
`WHERE` gates the whole update: when it is false, nothing is written. Yet the `count` assignment
re-evaluates the identical predicate:

```sql
ON CONFLICT(bucket) DO UPDATE SET
  count = CASE
    WHEN cairn_channel_budget.window_start >= ?3 THEN
      CASE
        WHEN (cairn_channel_budget.count + cairn_channel_budget.prev_count * ?4) < ?5
          THEN cairn_channel_budget.count + 1
        ELSE cairn_channel_budget.count            -- unreachable
      END
    ELSE
      CASE
        WHEN ( CASE WHEN ?3 - cairn_channel_budget.window_start = ${CHANNEL_BUDGET_WINDOW_MS}
                 THEN cairn_channel_budget.count ELSE 0 END ) * ?4 < ?5
          THEN 1
        ELSE 0                                     -- unreachable
      END
  END,
  ...
  WHERE (
    CASE
      WHEN cairn_channel_budget.window_start >= ?3
        THEN (cairn_channel_budget.count + cairn_channel_budget.prev_count * ?4)
      ELSE ( CASE WHEN ?3 - cairn_channel_budget.window_start = ${CHANNEL_BUDGET_WINDOW_MS}
               THEN cairn_channel_budget.count ELSE 0 END ) * ?4
    END
  ) < ?5
```

The two expressions are the same estimate compared against the same `?5`. On the only path where
the SET runs, the predicate is true, so `ELSE cairn_channel_budget.count` and `ELSE 0` can never be
taken. The cost is not the wasted bytes; it is that a future change to the sliding-window estimate
has to be made in two textually different places that must stay in lockstep, in the one statement
whose correctness the design's threat model rests on, with no test able to catch the drift (the
dead branches produce no observable behavior until the predicate and the SET disagree, at which
point the limiter silently miscounts). The 17 `charge()` assertions in
`src/tests/integration/auth-channel-store.test.ts` cannot distinguish the two forms.

The `prev_count` CASE is *not* a restatement (it is the window-roll logic) and must stay.

**Remediation.** Collapse `count` to the window-roll alone, letting the `WHERE` be the sole
authority on admission:

```sql
count = CASE WHEN cairn_channel_budget.window_start >= ?3
             THEN cairn_channel_budget.count + 1 ELSE 1 END,
```

Keep `prev_count` and `window_start` unchanged. Add one comment stating that the `WHERE` is the
admission gate and the SET expressions assume it. Before landing, prove the current test suite
fails against a deliberately broken `WHERE` (the falsifiable-gate rule); if it does not, that is
the second finding here.

Secondary, same statement: `${CHANNEL_BUDGET_WINDOW_MS}` is string-interpolated into SQL while
every other value is bound. It is a module constant so it is safe, but it is the only interpolation
in the three store modules and it teaches the wrong pattern to the next agent editing this file.
Bind it as `?6`.

---

## 2. `github/repo.ts` and `github/branches.ts` duplicate their transport, and have already drifted

**Tier: refactor. Limb: idiom, comprehension, agent-extensibility.**
`src/lib/github/repo.ts:10,13-21,163-174`, `src/lib/github/branches.ts:8,10-22,25-35`

Two files in one directory each define, independently:

```
src/lib/github/branches.ts:8   const API = 'https://api.github.com';
src/lib/github/repo.ts:10      const API = 'https://api.github.com';
src/lib/github/signing.ts:8    const API = 'https://api.github.com';
src/lib/doctor/checks-github.ts:12  const API = 'https://api.github.com';
```

```
src/lib/branches.ts:20   function gitUrl(repo: RepoRef, suffix: string): string {
src/lib/repo.ts:163      function gitUrl(repo: RepoRef, suffix: string): string {
```

Byte-identical bodies. Two header builders (`headers(token)` in branches.ts, `ghHeaders(accept,
token?)` in repo.ts) differ only in whether `Accept` and `Content-Type` are parameterized.

Worse, the same GitHub endpoint is read by two functions with divergent contracts:

```ts
// branches.ts:25
export async function branchHeadSha(repo, branch, token): Promise<string | null> {
  const res = await fetch(gitUrl(repo, `ref/heads/${encodeURIComponent(branch)}`), ...);
  if (res.status === 404) { await res.body?.cancel(); return null; }
  if (!res.ok) throw new Error(`GitHub ref ${branch} failed: ${res.status} ${await res.text()}`);
```

```ts
// repo.ts:168
async function headCommitSha(repo, token): Promise<string> {
  const res = await fetch(gitUrl(repo, `ref/heads/${encodeURIComponent(repo.branch)}`), ...);
  if (!res.ok) throw new Error(`GitHub ref ${repo.branch} failed: ${res.status}`);
```

Same request, three divergences: 404 handling (null vs throw), body-drain discipline (A4 honored
vs not), and error detail (status plus body vs status alone, against E5's "status AND the request
path"). The drift is not hypothetical harm; it is already present. `listMarkdown` (repo.ts:65) also
throws without draining and without the body text.

For an agent asked to "add a GitHub call", the directory offers two templates and no signal about
which is canonical. That is the one-obvious-way rule failing at the smallest possible scope.

**Remediation.** Add `src/lib/github/api.ts` owning `API`, one `gitUrl(repo, suffix)`, and one
`ghHeaders(accept, token?)`; import from both files and from `doctor/checks-github.ts`. Delete
`headCommitSha` and have `commitFiles`/`commitOnHead` call `branchHeadSha`, throwing on null at the
one call site that requires a head. Bring every `!res.ok` throw in `repo.ts` up to `branches.ts`'s
E5 form (status plus body text) and drain every discarded body per A4.

---

## 3. Roughly thirty comments are anchored to planning artifacts a reader cannot resolve

**Tier: refactor. Limb: comprehension, agent-extensibility.**
`src/lib/auth-channel/factory.ts:4-6,400,597,781`, `src/lib/auth/access.ts:187,207`,
`src/lib/auth-channel/dev.ts:5`, `src/lib/github/credentials.ts:3`, `src/lib/github/signing.ts:126`

The header of the area's largest file orients a reader against a plan's task numbering:

```ts
// src/lib/auth-channel/factory.ts:4
// fails at startup rather than at the first login. `actions.request` (Task 3), `actions.confirm`,
// `actions.logout`, `resolveSubject`, and `revokeSessions` (Task 4) are all implemented against
// Task 1's store and identity functions; Task 5 layers the optional rate limit on top.
```

Nothing in the file says which plan. The pattern repeats with identifiers that resolve nowhere a
reader can reach from the code:

```ts
// factory.ts:400   than at the spec's literal step 1: the plan's Task 5 overrides that placement deliberately,
// factory.ts:597   // same requester bucket and cannot be computed any earlier (plan Task 5). Blocked here means
// access.ts:187    // attacker-chosen `url.pathname` R9 removed: an access map never declares a rule for this key,
// access.ts:207    // halves of one authorization story (C2 R9 and C2b): both derive their default target this way,
// dev.ts:5         // dev flag, the same failure mode v2 of the design left unclosed with a two-argument signature.
// credentials.ts:3 // save action (Plan 05) stays thin and a misconfigured Worker fails by name, not with a deep
// signing.ts:126   // no network call and no secret in the result, so `/admin/healthz` (Plan 05) catches a bad
```

A new developer hits "Task 5", "R9", "C2b", "v2 of the design", "Plan 05" and has no path forward.
An agent hits the same wall and either ignores the constraint or burns a tree-wide search. The
charter already rules this way for tests (T3: "titles are present-tense sentences with no plan-task
numbers"); the same reasoning governs code comments, and the TSDoc standard's "contract and why"
means a *readable* why.

Note the contrast that proves it can be done: `signing.ts:100` cites
`docs/internal/2026-07-13-admin-token-cache-poisoning.md` by path, which resolves. So do the
`(spec docs/superpowers/specs/2026-08-03-...)` header citations in `auth-channel/store.ts:2` and
`identity.ts:1`. The failure is only the bare identifiers.

**Remediation.** Mechanical sweep over the five files. Replace each bare identifier with either the
substance ("the rate limit runs after identity derivation because its default key is the requester
bucket, which does not exist earlier") or a resolvable path. Keep `spec, <Section>` citations only
in files whose header already names the spec path; add the path to `access.ts` and `dev.ts`, which
do not. Drop the factory header's task inventory entirely: it describes construction order, not the
code as it now stands.

---

## 4. `mintCode` takes nine positional parameters, two of them same-typed hashes

**Tier: refactor. Limb: idiom, comprehension.**
`src/lib/auth-channel/store.ts:186-196`, called at `src/lib/auth-channel/factory.ts:632-642`

```ts
export async function mintCode(
  session: D1DatabaseSession,
  nonceHash: string,
  identity: string,
  codeHash: string,
  subject: string | null,
  now: number,
  ttlMs: number,
  cooldownMs: number,
  requesterBucket: string,
): Promise<boolean> {
```

Call site:

```ts
const minted = await mintCode(
  session, nonceHash, identity, codeHash, subject, now,
  limits.codeTtlMs, limits.cooldownMs, fullRequesterBucket,
);
```

Three adjacent `string` slots hold a nonce hash, an identity hash, and a code hash. Two adjacent
`number` slots hold a TTL and a cooldown. Transposing `nonceHash` and `codeHash` typechecks and
silently mints an unopenable code; transposing `codeTtlMs` and `cooldownMs` typechecks and produces
a code that expires in a minute. Charter F4 is explicit: "New internal functions taking more than
two logical inputs take one options object." This is the worst instance, but `createChannelSession`
(5), `charge` (5), `consumeCode` (4), and `auth/store.ts`'s `issueToken` (5) and `insertEditor` (5)
all sit past the line; `auth/store.ts`'s are older and frozen only where `/auth-store` re-exports
them (`insertEditor` is, `issueToken` is not).

**Remediation.** Convert `mintCode` and `charge` to one options object each (`{ nonceHash,
identity, codeHash, subject, now, ttlMs, cooldownMs, requesterBucket }`). Both are engine-internal
with a single call site apiece, so this is a two-file change with no surface impact. Do the same for
`issueToken`, which `/auth-store` deliberately does not export. Leave `insertEditor` and the other
`/auth-store` exports frozen and record why in the charter's F4 entry.

---

## 5. `auth/store.ts` and `auth/crypto.ts` carry no marker for which exports are frozen public surface

**Tier: refactor. Limb: agent-extensibility.**
`src/lib/auth/store.ts` (13 exports), `src/lib/auth-store/index.ts:8-17`,
`src/lib/auth/crypto.ts` (10 exports), `src/lib/auth-crypto/index.ts:9`

Seven of `auth/store.ts`'s functions are public npm surface, six are engine-internal, and the file
gives no sign which is which:

```ts
/** Look an email up in the allowlist. */            // internal
export async function findEditor(...)
/** The full allowlist, sorted by email. */          // PUBLIC: /auth-store
export async function listEditors(...)
```

The boundary lives two directories away, in `auth-store/index.ts`, and again in
`docs/reference/auth-store.md:10`. Same split in `auth/crypto.ts`: `cookieName`, `hashToken`,
`tokensMatch`, and the three generators are published; `sessionCookieName`, `csrfCookieName`, and
all three TTL constants are deliberately withheld, and `auth-crypto/index.ts:1-8` explains why
*there*, not here.

An agent told to change `listEditors`'s signature reads `auth/store.ts`, sees an ordinary internal
helper with one obvious call site, and ships a breaking change to four production consumer sites.
`check:surface` catches it at the gate, which is the safety net working, but the gate teaches after
the fact; the file should teach before.

**Remediation.** Two options, pick one and apply it to both files. Either add a one-line
`@public` (or `Public surface: /auth-store.`) tag to each published export's TSDoc, or split the
files into `store-internal.ts` / `store-public.ts` with the barrel re-exporting only the latter. The
tag is cheaper and greppable; prefer it, and add its presence to `check:surface`'s error message so
a violation names the convention.

---

## 6. `AuthChannelEvent` is a sixth engine event shape, and its stated reason is not the real one

**Tier: refactor. Limb: idiom, comprehension.**
`src/lib/auth-channel/factory.ts:133-156` against `src/lib/sveltekit/types.ts:64-88`

`CairnEvent` is documented as "The one structural event shape every engine load, action, and guard
helper reads ... It replaces the five separately-declared event shapes cairn carried before the C2
pass." `auth-channel` then declares a sixth, with this justification:

```ts
// factory.ts:136
 * Kept local rather than reused from `CairnEvent` (`../sveltekit/types.js`), since that type's
 * `locals` shape names the engine's own admin concepts (`cairnEditor`, `cairnAccess`) that have
 * no bearing on a second audience's login channel;
```

That reason does not hold. Every member of `CairnEvent['locals']` is optional
(`sveltekit/types.ts:82-87`), so a channel route satisfies it by supplying `locals: {}`, and a real
`RequestEvent` satisfies it structurally with no work at all. The actual reasons are two the comment
never states: `AuthChannelEvent` requires `getClientAddress()`, which `CairnEvent` lacks, and it
widens `platform` with `ctx`/`context`, which `PlatformContext<Env>` lacks. A reader who takes the
written reason at face value learns something false about the type system, and the next factory
that needs a client address will fork a seventh shape rather than fix the fifth.

**Remediation.** Add `getClientAddress(): string` to `CairnEvent` (every real kit server event has
it; making it required costs nothing and closes the fork), move the `ctx`/`context` members onto
`PlatformContext<Env>` where `resolveWaitUntil`'s reasoning already belongs, and delete
`AuthChannelEvent`, re-exporting `CairnEvent` under that name from `/auth-channel` if the public
name must be preserved. If the fork survives review on its merits, rewrite the doc comment to state
the two real reasons.

---

## 7. Three equally server-only subpaths enforce server-only in three different ways

**Tier: refactor. Limb: idiom, agent-extensibility.**
`package.json` exports, `src/lib/auth-crypto/browser.ts:4`, `src/lib/auth-channel/index.ts:1-2`,
`src/lib/auth-store/index.ts:1-2`

`/auth-crypto` ships a browser condition that fails the build at import:

```ts
// src/lib/auth-crypto/browser.ts:4
throw new Error('@glw907/cairn-cms/auth-crypto is server-only');
```

with the reason: "Every export on this subpath is Web Crypto and would otherwise run, uselessly and
dangerously, in a client bundle." `/auth-store` (raw D1 statements) and `/auth-channel` (the whole
login factory: cookies, salts, session minting) are at least as server-only, and both ship
`types` + `default` only. `auth-channel/index.ts:1` even calls itself "a server-only subpath (types
plus a default condition, no browser or svelte condition)" as if the *absence* of a condition were
the enforcement. It is not; it is the absence of enforcement.

A site that imports `listEditors` into a `+page.svelte` gets a client bundle carrying D1 statement
strings and a silent runtime `undefined` rather than the build-time refusal `/auth-crypto` gives.

**Remediation.** Add `auth-store/browser.ts` and `auth-channel/browser.ts` with the same one-line
throw, wire the `browser` condition in `package.json` exports for both, and add the assertion to
`check:package`. Record the rule in the charter: a subpath with no browser-safe export ships a
throwing browser condition.

---

## 8. Two SQL parameter-binding styles across three sibling store modules

**Tier: refactor. Limb: idiom, agent-extensibility.**
`src/lib/auth/store.ts:34`, `src/lib/auth/preview-store.ts:46`,
`src/lib/auth-channel/store.ts:101`

```sql
-- auth/store.ts:34            SELECT ... FROM editor WHERE email = ?
-- auth/preview-store.ts:46    DELETE FROM preview_tokens WHERE expires_at <= ?
-- auth-channel/store.ts:101   SELECT value FROM cairn_channel_meta WHERE key = ?1
```

Anonymous `?` in the two `auth/` stores, numbered `?1..?n` in `auth-channel/`. Both are valid D1;
one is obvious per pattern. `preview-store.ts:2` claims it "Follows the D1 access idiom in
`src/lib/auth/store.ts` exactly," which makes the third file's silent divergence the odd one out
with no note anywhere saying so.

Numbered parameters are the better default here (the `charge` statement genuinely needs to reuse
`?3` and `?5` several times, which anonymous binding cannot express) — so the convergence should run
toward `?n`, not away from it.

**Remediation.** Convert `auth/store.ts` and `auth/preview-store.ts` to numbered parameters, and add
one line to the charter under a new "Storage" heading: D1 statements bind numbered parameters.
Purely mechanical; the integration suites (`auth-store.test.ts`, `auth-cleanup.test.ts`) cover every
statement.

---

## 9. Declaration-time errors use module-name prefixes where E1 rules `cairn: `

**Tier: refactor. Limb: idiom.**
`src/lib/auth/access.ts:31-81` (10), `src/lib/auth/roles.ts:37-73` (8),
`src/lib/auth-channel/factory.ts:278-334` (7), `src/lib/auth/crypto.ts:46-53` (2)

Charter E1: config and `define*`-time errors "throw a plain `Error` whose message starts `cairn: `
and reads `<subject> <verdict>` ... Module-name prefixes ... and prefixless messages converge to
this." The area throws 27 that do not:

```ts
// access.ts:31   throw new Error(`defineAccess: key '${key}' must be an /admin-prefixed path`);
// roles.ts:37    throw new Error(`defineRoles: role '${name}' maps to unknown capability '${decl}'`);
// factory.ts:278 throw new Error(`createAuthChannel: config.${field} is required and must be a function`);
// crypto.ts:46   throw new Error(`cookieName: base "${base}" already carries a __Host- ...`);
```

Repo-wide the split is 40 `cairn: ` against 27 module-prefixed, of which every one of the 27 is in
this area or in `nav` (`navLayout:`, 9). The charter names cluster 7 (`auth-github`) as sweep work
that has not run, so this is filed rather than unknown; it is still a live shortfall, and a
developer reading two cairn error messages side by side learns two conventions.

One nuance worth deciding rather than sweeping blindly: `defineAccess:` and `defineRoles:` name the
function the developer literally called, which is more actionable than a bare `cairn: `. The
charter's own form accommodates it — `cairn: defineAccess key '/admin' may not ...` — so converge to
`cairn: ` plus the subject and keep the function name inside the subject.

**Remediation.** Prefix-rewrite the 27 messages to `cairn: <subject> <verdict>` keeping the
factory name as the subject's first word. Update the tests that assert on message text
(`auth-access.test.ts`, `auth-roles.test.ts`, `auth-channel-config.test.ts`). Then strike the E1
straggler clause from the charter, since the convergence will be complete.

---

## 10. `factory.ts` is 965 lines carrying public type surface, construction validation, and two 200-line flow bodies

**Tier: refactor. Limb: comprehension.**
`src/lib/auth-channel/factory.ts`

The file's regions: module orientation (1-35), helpers (37-131), the public type surface (133-273,
141 lines of interfaces and result unions), construction validation (275-365), two shared helpers
(367-442), then `createAuthChannel` (468-965) whose body holds `requestAction` (526-730),
`confirmAction` (740-880), `logoutAction`, `resolveSubject`, and `revokeSessions`. It is the largest
file in the area by a factor of two and 37% comment lines, so the read is long even where the code
is short.

Nothing here is wrong, and the closure-over-`limits`/`cookieBase` shape is exactly F2. But a
developer asking "what does `confirm` do on a wrong code" scrolls past 470 lines of type surface and
validation to reach it, and an agent asked to add a knob must load the whole file to find the three
places (`AuthChannelConfig['ttl']`, `ResolvedLimits`, `resolveLimits`) that must change together.
The charter took the analogous decision for `content-routes.ts` and split it; the same reasoning
applies at a third of the size because this file is the one a *site developer* reads to understand
the seam.

**Remediation.** Split into `auth-channel/config.ts` (the `AuthChannelConfig`/`AuthChannelEvent`/
`DeliverContext`/result-union surface plus `requireFn`, `resolveCookieBase`, `validateKind`,
`ClampRule`, `resolveLimit`, `ResolvedLimits`, `resolveLimits`) and `auth-channel/factory.ts` (the
helpers and `createAuthChannel`). `index.ts` re-exports from both, so the public subpath is
byte-identical and `check:surface` proves it. Co-locating the three limit declarations in one file
also puts the "add a knob" edit in one place, which is the agent-extensibility win.

---

## 11. `isLocalHost` is copied between the guard and the channel factory

**Tier: note. Limb: idiom.**
`src/lib/sveltekit/guard.ts:32`, `src/lib/auth-channel/factory.ts:59-73`

```ts
/**
 * Local development (`wrangler dev`) legitimately speaks http; a deployed host does not. Mirrors
 * `guard.ts`'s own `isLocalHost`, duplicated here rather than imported since that helper is
 * private to the admin guard and this factory serves routes outside `/admin` entirely.
 */
function isLocalHost(hostname: string): boolean {
```

The stated reason is that the original is private, which is an argument for exporting it, not for
copying it. This is the "repeated local workaround at the wrong altitude" signal: six hostname forms
enumerated twice, and the day one of them changes (a new `.local` form, an IPv6 spelling) the two
copies diverge and http is refused on one surface and allowed on the other.

**Remediation.** Move it to `src/lib/sveltekit/csrf.ts` beside `originMatches`, which both callers
already import, and import it from both. One-line change each.

---

## 12. Line width and doc-comment continuation are unenforced, and drift 90 to 195 characters

**Tier: note. Limb: comprehension.**
`src/lib/auth-channel/factory.ts:210,295` (195 and 182 chars), `src/lib/auth/crypto.ts:47` (135),
`src/lib/auth/preview-store.ts:67-72`, `src/lib/github/branches.ts:84-85`

The repo has no Prettier config, no `format` script, no ESLint `max-len`, and `.editorconfig`
records only `indent_size`. The result in this area: 20+ lines past 110 characters, several past
180, sitting beside files that wrap at 100. Doc-comment continuation drifts too:

```ts
// preview-store.ts:66-72   ("*  " continuation, two spaces)
 * Look a preview token up by its hash with no expiry predicate, for `previewLoad`'s distinct
 *  expired-versus-unknown refusal log: `findPreviewToken` already excludes an expired row (the
 *  ordinary validity check every other caller wants), so a miss there cannot by itself tell "this
```

against the single-space form everywhere else. `branches.ts:84-85` has the same doubled
continuation. Both are cosmetic alone; together they mean an agent writing here has no deterministic
signal for either, and the charter's M4 (which added `.editorconfig` precisely so a one-time sweep
would not be needed) stops short of width.

**Remediation.** Add `max_line_length = 110` to `.editorconfig` and an ESLint `max-len` at the same
number with `ignoreUrls`/`ignoreRegExpLiterals`, wired into `npm run lint`. Reflow the offenders and
normalize the two doubled continuations. Adopting Prettier outright would settle both plus every
future case, and is the stronger answer if the repo will accept the one-time diff.

---

## 13. `devDelivery` prints through `console.log`, against E7

**Tier: note. Limb: idiom.**
`src/lib/auth-channel/dev.ts:30`

```ts
console.log(`[cairn-cms auth-channel] dev delivery to ${contact}: ${code}`);
```

E7 is unqualified: "No bare `console.*` in `src/lib`. ... server code speaks through the
`src/lib/log` chokepoint. Scripts and bins print freely." This is server code in `src/lib`, not a
bin. The comment argues the case well — the whole point is to put a plaintext code in front of a
developer, and the structured channel events deliberately never carry a code or a contact — and it
is guarded by a `CAIRN_DEV_BACKEND` refusal, so the call cannot fire in production. It is the only
such call in the runtime library (the others are `log/emit.ts`, the four bins, and
`components/chrome-guard.ts`).

The defect is that the exception is argued in the file rather than carved in the charter, so the
next reviewer relitigates it and the next agent reads it as license.

**Remediation.** Add one clause to E7: a dev-only transport whose entire purpose is developer-facing
output prints directly, guarded by an env refusal, and names itself in the printed prefix. Cite
`auth-channel/dev.ts` as the exemplar. No code change.

---

## 14. `branches.ts` is the one module in the area without the M1 header prefix

**Tier: note. Limb: idiom, agent-extensibility.**
`src/lib/github/branches.ts:1`

```ts
// Branch (ref) operations for the publish workflow, over the Git Data API. A pending entry's
```

Every other one of the area's 20 files opens `// cairn-cms: ...` per M1. The content of this header
is good; only the prefix is missing. It matters more than it looks: the prefix is what makes
`grep '^// cairn-cms:' src/lib` a complete module index for an agent orienting in a cold context,
and one omission makes that index silently incomplete.

**Remediation.** Add the prefix. Then add the check to a gate — a four-line addition to
`scripts/checks/check-comments.sh` asserting every `src/lib/**/*.ts` opens with it — since the
charter's own straggler list proves prose alone does not hold this.

---

## 15. `AuthChannel.actions` reads as SvelteKit `actions` but is not

**Tier: note. Limb: idiom, comprehension.**
`src/lib/auth-channel/factory.ts:260-268`

```ts
export interface AuthChannel<Env> {
  actions: {
    /** POST handler for the `contact` form field; mints and delivers a code. */
    request: (event: AuthChannelEvent<Env>) => Promise<ChannelRequestResult>;
```

In SvelteKit 2, `actions` is a reserved concept: the named export of `+page.server.ts`, whose
handlers return data or `fail(...)`. These return plain discriminated unions and are *not*
assignable to kit's `Actions`; a site must wrap each one and map the union onto `fail()` itself. The
design is right — the site owns its form-failure shape, and the engine has no business choosing
status codes for a second audience's login page — but the name imports SvelteKit's meaning and then
contradicts it, and a SvelteKit developer's first attempt will be `export const actions =
channel.actions`, which typechecks nowhere and fails with an unhelpful message.

Charter E4 governs the engine's own route factories (`fail(status, {...} satisfies XFailure)`); this
factory is deliberately outside that rule, and nothing says so.

**Remediation.** Either rename to `handlers` and note in the doc that a site adapts each result into
its own `actions`, or keep the name and add one sentence plus a three-line wrapper example to the
`AuthChannel` doc comment and `docs/reference/auth-channel.md`. Record in the charter that E4 binds
engine route factories, not public factories a site composes into its own actions.
