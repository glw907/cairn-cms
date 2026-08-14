# Admin hang after login: the installation-token cache holds a dead promise

**Resolved 2026-07-13.** The cache now stores only a resolved token value (the second fix
direction below), never the in-flight mint promise, so a canceled mint has nothing left in the
cache to be served. The regression test pinning this is "never serves an unsettled in-flight
mint to a later caller" in `src/tests/unit/github-token-cache.test.ts`.

Reported from ecxc.ski, 2026-07-13, with live production evidence. This is the bug behind two
symptoms previously recorded as separate facts: the magic-link confirm flow hanging the browser
on the deployed ecxc Worker, and the "content-list GitHub round trip hangs in this sandbox"
note in ecxc's rebuild and 0.84.1-upgrade records. The sandbox note was a misdiagnosis. The
hang reproduces in production workerd, and the engine causes it.

## Symptom

An editor completes the magic-link confirm on a deployed site. The token confirms, the session
row is created, and the browser then waits on "Waiting for ecxc.ski..." indefinitely. The
address bar still shows the confirm URL, because the navigation never commits. Retrying the
link yields the expired-token page (the first click did consume it).

## The live evidence

Captured with `wrangler tail` during a real login on the deployed `ecxc` Worker
(cairn 0.84.1), 2026-07-13 13:52 AKDT:

```
13:52:43.050 GET  /admin/auth/confirm?token=...   -> 200 ok
13:52:45.036 POST /admin/auth/confirm?/confirm    -> 303 ok   (auth.token.confirmed, auth.session.created)
13:52:45.188 GET  /admin                          -> 307 ok   (36 ms wall, 7 ms CPU)
13:52:45.284 GET  /admin/posts                    -> no status, outcome "canceled"
```

The `/admin/posts` invocation never produces a response. Its `canceled` outcome is reported
minutes later, when the editor abandons the tab. CPU time is near zero: the request is waiting,
not working. Every earlier hop is healthy, including both D1 writes and the email send. An
invalid-token confirm POST returns its 303 in about one second, so the confirm machinery itself
is fine.

## Mechanism

Three pieces interact. Each is fine alone.

1. **The module-global installation-token cache holds the in-flight promise**
   (`src/github/signing.ts`, `createInstallationTokenCache`, shipped v0.17.0). The cache
   stores `{ token: mint(creds), expiresAt: now + 55 min }` at call time and evicts only via
   `entry.token.catch(...)`. A promise that never settles is served to every caller in the
   isolate for 55 minutes.

2. **The admin shell starts an unawaited GitHub call on every authed `/admin/**` request**
   (`shellPayload` in `src/sveltekit/content-routes-core.ts`, streamed `pendingEntries`;
   the shared `/admin/+layout.server.ts` shellLoad landed in the chrome-relocation refactor,
   commit `4490895`, after v0.76.0). The `.catch` on that chain degrades a *rejected* GitHub
   call to null. A call that never settles is not caught by anything.

3. **The bare `/admin` view redirects immediately** (`indexRedirect`, 307 to the first
   concept's list). SvelteKit runs the layout load and the page load concurrently; the page
   load's redirect wins and the streamed layout promise is abandoned. The 307 response
   completes in tens of milliseconds while the mint fetch it triggered is still in flight.
   When the invocation ends, workerd cancels the outstanding subrequest.

The sequence on a cold isolate: `GET /admin` starts the mint through the cache and answers 307
before the mint settles. The runtime cancels the mint's fetch, and in practice the cached
promise then never settles (had it rejected, the eviction hook would have cleared it; the
observed cross-request, zero-CPU, indefinite hang shows it does not). One hundred milliseconds
later, `GET /admin/posts` hits the same isolate, gets a cache hit on the dead promise, and
awaits it forever. The list load is awaited before the response starts, so the browser gets
nothing at all. Every later admin request in that isolate does the same until the entry
expires or the isolate recycles.

The precise settle behavior of a canceled subrequest's promise under workerd (never settles
versus rejects late) is the one link verified only by observation. A regression test should
pin it: simulate a mint promise that never settles and assert the cache does not serve it
across a deadline.

## Why this looked like an environment quirk

The local admin smoke recipe walks the same order: mint a session, `GET /admin`, observe the
307, then open the content list. That first hop poisons the dev-server isolate exactly as it
poisons production, so the content list hung locally too, and the hang was recorded as a
wrangler/workerd sandbox limitation (a plain-Node replay of the JWT sign-and-exchange worked,
which reinforced the wrong conclusion; Node cancels nothing). ecxc 0.62.2's deployed admin
worked because the pre-shellLoad admin started no GitHub work on the redirecting bare
`/admin`; the trigger shipped with the layout-split chrome, so consumers on roughly 0.77+
are exposed. 907.life is on ^0.81.0 and carries the same combination.

## Discriminating predictions (untested)

Both fall out of the mechanism and are cheap to check while verifying a fix:

- Navigating directly to `/admin/posts` on a cold isolate works: the list load awaits the same
  mint, the request stays open until it settles, and the cache ends up holding a good token.
  The isolate is then healthy for the cache TTL, including `/admin` itself.
- The hang requires entering through a redirecting or fast-returning admin view first. Any
  authed view that awaits the backend before responding cannot poison the cache.

## Fix directions (engine's call)

- Tie the streamed `pendingEntries` chain to the invocation with the platform's `waitUntil`
  so an early response no longer cancels the mint. This addresses the abandonment at its
  source and keeps the streamed-shell design.
- Cache the resolved token value rather than the in-flight promise (set the entry only after
  a successful mint). Cross-request coalescing on a shared pending promise is exactly the
  hazard under workerd's per-request cancellation; a duplicate mint on a cold isolate is
  cheap by comparison.
- Defense in depth: race cache reads against a deadline and evict on timeout, so one dead
  entry can never wedge an isolate for 55 minutes; the shell's degrade-to-null then actually
  fires, and the list load fails loud instead of hanging silently.
