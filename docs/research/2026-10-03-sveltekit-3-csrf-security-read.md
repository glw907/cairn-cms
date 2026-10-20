# SvelteKit 3 pass: CSRF security read (Task 7)

Date: 2026-10-05. Reviewer: `web-auth-security-reviewer` (Opus 5.5, high effort), read-only, at
HEAD `59c11065` on branch `sveltekit-3`. Conductor-recorded. Overall: **proceed with amendments**,
no halt. The amendments are written into the plan in the same commit as this record.

## A. Kit 2.70 ordering and retiring guard Rule 2: accept

Kit 2.70 (`node_modules/@sveltejs/kit/src/runtime/server/respond.js:73-100`) and Kit 3
(`respond.js:98-133` plus `csrf.js:37-43`) run the same check inside `internal_respond`, ahead of
`handle`, skipped only under `__SVELTEKIT_DEV__`. Kit's check covers every request class Rule 2
(`guard.ts:205-208`) caught:

- Content type: `csrf.ts:8-12,87-91` covers urlencoded, multipart, and text/plain; Kit covers those
  plus its binary form type on both versions, and Kit 3 adds an absent content type. On 2.70 an
  absent type passes both Rule 2 and Kit, so nothing regresses.
- Origin: Rule 2 compared `event.url.origin`; Kit 2.70 compares the same value; Kit 3 compares
  `paths.origin || url.origin`.
- Method: the same set.

Kit misses three classes Rule 2 caught, each covered: `vite dev` (spec accepted cost 2;
`createAuthChannel` keeps its own check); origins in `trustedOrigins` (Rule 2 ignored the list; see
C); and a Kit 2.70 site that keeps `checkOrigin: false`, contained by the split rule (S3 never
reaches `main` without S4), the no-release constraint, and Kit 3 turning `checkOrigin` into a build
error (`core/config/options.js:94`, `removed()` at `:319`). Kit's refusal is an opaque 403 with no
cairn log event (spec accepted cost 1), not a security gap.

## B. The admin referrer meta: amend Task 8 and Decision 11

Holds: a document meta overrides the header policy (spec Evidence). The Svelte compiler hoists a
component's `$.head(...)` above its children regardless of template position (the reviewer compiled
a test component with the worktree's Svelte), so a site meta in its root `+layout.svelte` lands first
and cairn's later meta wins; only `app.html` after `%sveltekit.head%`, or a component rendered inside
the shell, can override it. Under `strict-origin` the confirm page's subresources, POST, and 303 send
only the origin, and HTTPS to HTTP sends nothing; the login, confirm, and shell heads load no
third-party resources; the session id is never in a URL. `/preview/[token]` sits under `(site)`,
outside the shell, and keeps `no-referrer`.

Fails: Decision 11's premise that every `/admin/**` route renders inside the shell. `LoginPage` and
`ConfirmPage` are public exports (`src/lib/admin/index.ts:15-16`), and the advanced per-route
mounting lets a site mount one in its own shell (`docs/reference/admin-routes.md:291-299`). There
the pages carry no meta, and a site-wide `no-referrer` brings back the R5 lockout. It fails closed
(nothing leaks), but editors cannot sign in.

Amendment taken: each view owns its meta. `LoginPage` and `ConfirmPage` emit it in their own heads;
the shell emits it only for its authed views. The reviewer proposed a shell-provided context flag;
the conductor took the leaner form, since the shell's public branch renders the route's page through
`children()` and so never needs to emit the meta itself. Every admin document still carries exactly
one.

## C. The doctor's `trustedOrigins` check: amend Task 10

Finding (high): `'null'` acts as a wildcard. Kit compares the raw Origin string (Kit 3 `csrf.js:42`;
Kit 2.70 `respond.js:87`), and nothing validates the entries (`options.js:95`, a plain string array).
`trustedOrigins: ['null']` admits every opaque-origin POST, which any attacker can produce from a
sandboxed iframe or a `data:` page, and it is the obvious wrong fix for this pass's `Origin: null`
403 under `no-referrer`. Amendment taken: `'null'` fails under the same condition as `'*'`, with a
detail naming the entry; an `http://` entry for a non-local host says it admits a network attacker
on that origin.

Severity: accept `warning`. Both of Decision 5's premises hold:

1. Rule 1 covers every admin form POST, the public ones included: `guard.ts:257` runs after
   `isAdminPath` (`:205`) and before `isPublicAdminPath` (`:287`). A POST without a form content type
   is refused by Kit as a form action with a 415 (`actions.js:251`), and the raw endpoints check
   `validateCsrfHeader` themselves (`content-routes-media-ingest.ts:109`, `-dictionary.ts:99`,
   `-media-metadata.ts:218,420`, `-tidy.ts:116`). A cross-origin page cannot send
   `x-sveltekit-formdata` without a preflight. So under `'*'` the admin keeps today's posture.
2. `createAuthChannel` keeps `originMatches` (`factory.ts:72-74`, `csrf.ts:94-96`).

Editor sessions exist only on admin paths (`guard.ts:205-210`, `:342-363`), so `'*'` exposes only
the site's own forms, matching the retired `config.csrf-disable-missing`'s `warning`
(`conditions.json:113-114`). The condition's `why` gains a sentence on member-session site actions
and sibling subdomains.

## Low findings (none gates S3)

- Admin error documents render the root `+error.svelte` outside the shell and carry no meta; they
  have no forms, and the guard's header still applies.
- Removing a referrer meta does not revert the policy, so a tab that client-navigates from the admin
  to a public page keeps `strict-origin`. Benign.
- Remote images in the editor preview now receive `Referer: <origin>/`, origin only.
- The confirm page still embeds the raw token as a hidden field (`ConfirmPage.svelte:77`), so a
  scanner that parses and submits forms can consume it. Unchanged by this pass.
- On Kit 3 a site that sets `paths.origin` passes Kit's check, but `createAuthChannel`'s
  `originMatches` still compares `event.url.origin`, so member login there keeps failing as today.
  Folded into Task 13's `paths.origin` facts bullet.
