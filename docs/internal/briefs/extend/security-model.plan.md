# Page plan: Security model

The plan for `docs/extend/security-model.md`, a concept page in the extend track. Written
2026-10-03 as the plan step of the docs page chain (stage 2a task 7c, run ahead of the task 7b
resolution). The drafter drafts from this plan: it is the source of the page's order, each
section's claim, and each fact's placement. The brief sits beside it at
`docs/internal/briefs/extend/security-model.json`. The plan is Google's outline written down
(Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs).

## What binds this plan

- **The job** (`docs/internal/outlines/extend.json`, slug `security-model`): "Assess what cairn
  defends and what it leaves to you: the sign-in and session design, CSRF, the access map's
  limits, the render pipeline's sanitizing, the GitHub App's reach, and the residual risks of each
  seam you replace. For a Svelte-fluent web developer assessing cairn before adopting it, and for
  one about to replace its sign-in or access rules."
- **Two readers.** The evaluator reads the built-in defenses end to end before adopting. The
  replacer reads the two seam sections (identity mode, the auth channel) against the defaults they
  change. The order below serves the evaluator first and groups the replacer's material after it.
- **Anatomy** (`docs/internal/docs-register.md`, "The page anatomies", concept page): an
  introduction in Google's three parts that states the subject and never describes the page
  itself; a definition of the concept; one subtopic per section; a related-resources ending
  grouped as how-to guides, concepts, and external resources, 3 to 5 links each.
- **Exemplar takes.** From the Cloudflare Workers security model
  (`~/.local/share/cairn/exemplars/evaluators/cloudflare-workers-security-model/page.md`):
  organize around the questions a reviewer asks, each section carrying the threat, the defense
  layers, and what remains; link out for platform isolation. From Syncthing's security principles
  (`~/.local/share/cairn/exemplars/evaluators/syncthing-security/page.md`): one section per exposed
  component, the "In short" verdict, and the closing list of the operator's own responsibilities.
- **Owner rulings (Geoff, 2026-09-30 and 2026-10-01).** The introduction's first two paragraphs
  land as written in `docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md`, "The
  two introductions for task 7b", with the threat position cited as `f:v85shm`. A plan may push a
  fact off the page: subordinated to a named reference entry, or cut with a reason, never dropped.
- **Round-2 findings** (`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`,
  "### security-model"): a blocking finding applies where this plan keeps the sentence it cites,
  and a finding on a sentence this plan drops is disposed here. The table near the end maps all
  seven.
- **The diagnosis** (`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`):
  the committed page reads as atoms. This plan decides what the page argues, which facts carry the
  argument, and which are detail the reference already holds.

## The argument, and the order it needs

The page argues one thing: cairn's defenses follow the attacker the owner names, an editor's
account taken through a stolen or phished sign-in link, and each defense leaves a named residual
the site carries. The body therefore walks the attacker's path through the built-in design, then
takes the two seams a site can swap in, then closes on the list of what stays with the site. Every
component section answers one reviewer's question in its first sentence, lays out the defense, and
ends on a `### Limits of ...` subsection that names what remains.

1. **Taking the account** (sections 1 to 3). The sign-in link, the browser binding that stops a
   stolen or forwarded link from being spent elsewhere, and the session cookie that carries the
   account afterwards. This is the threat position's own path, link to binding to session, so the
   reader meets the token first and the cookie last.
2. **Riding the account without holding it** (sections 4 to 6). CSRF, then the guard that runs the
   check and sets every admin response's headers, then the dev-backend flag the guard refuses as its
   first step. The round-2 structural read asked for the flag's section directly after the guard:
   the guard's first listed step is the tripwire, and its explanation now follows within a page.
3. **What the account reaches** (sections 7 to 9). The access map (which screens a signed-in editor
   may reach), then render safety (what an editor's markup does to every visitor), then the GitHub
   App's reach (what the engine's own credential can write). Each widens the blast radius of one
   taken account by a step: screens, then visitors, then the repository.
4. **What changes when you replace a seam** (sections 10 and 11). Identity mode and the auth
   channel, grouped after the defaults they modify, so each refers back: identity mode moves the
   session lifetime and stops the CSRF rotation the earlier sections describe; the channel mirrors
   the guard's origin check on routes the guard never covers. The introduction states this two-part
   grouping, the alternative the structural read offered to the outline's inventory order.
5. **The site's responsibilities** (section 12), opening on the "In short" verdict, then **Related
   resources** (section 13), the anatomy's ending.

Two departures from the outline's cover list, with reasons. "Logs never carry tokens or session
ids" (`f:wi766c`) is one sentence placed where the token travels, in the sign-in section, instead
of a one-paragraph section of its own: the round-2 read objected to its stranded position, and a
section holding one claim fails the anatomy's one-subtopic test. The auth channel's catalogue is
held to the reader's depth (the job read called it the heaviest section for a minority reader):
the rule, its three instances in one sentence, the origin check, hashing, code generation, and the
roster-oracle limit. The channel's config obligations and challenge order are subordinated to
`docs/reference/auth-channel.md`, which states both.

### Heading policy

Headings are noun phrases in sentence case: the register's heading rule on the Google base
(`docs/internal/docs-register.md`, "Structure": a concept heading is a noun phrase with no
leading -ing word, never a question or a teaser; Geoff killed three "What ..." headings on
2026-09-28), and `Cairn.Headings` warns on an -ing lead. The outline suggests sentence headings
for four sections so restored links reuse old slugs. This plan keeps the old slug wherever a noun
phrase already carries it and otherwise names the new target for the relink pass
(`docs/internal/outlines/extend.json`, relink indexes 57, 61, 71, 79, and 136, all
`restoredBy: security-model`; none of those pointers is restored yet, and the relink action says
to point at the heading that now carries the content).

| Old slug | Heading on this page | Slug |
| --- | --- | --- |
| `#sign-in-binds-to-the-browser-that-asked` | Browser binding for sign-in | `#browser-binding-for-sign-in` |
| `#the-session-cookie` | The session cookie | unchanged |
| `#what-the-dev-backend-flags-two-refusals-leave-open` | The dev-backend flag's two refusals | `#the-dev-backend-flags-two-refusals` |
| `#an-access-map-is-not-a-whitelist` | Access map coverage | `#access-map-coverage` |
| `#recovering-whitelist-semantics` | Allowlist semantics from an exhaustive map | `#allowlist-semantics-from-an-exhaustive-map` |

The last row keeps the committed heading rather than the outline's "Recovering whitelist
semantics": the suggested heading opens on an -ing word, and `docs/extend/migration-notes.md:370`
has linked `#allowlist-semantics-from-an-exhaustive-map` since the pilot's carry commit
`a0213cc3`, so the kept heading needs no edit to another page. Two headings are fixed by live
inbound links and stay verbatim: "The session cookie" and "Identity mode's threat surface"
(`docs/extend/replace-magic-links-with-cloudflare-access.md` links
`#identity-modes-threat-surface` three times).

Every component section with a residual ends in a `### Limits of <component>` subsection, so a
skimmer separates what cairn defends from what it leaves to the site by heading alone (the job
read found that mechanism-named headings hid that line). Both seam sections take the same
subsection, so the pattern is even (a round-2 non-blocking finding).

## Introduction

Five paragraphs under the title, no heading. Google's three parts arrive as statements about the
subject, never about the page: outside Geoff's two paragraphs, no sentence opens on the page or
refers to a position.

**Paragraphs 1 and 2, verbatim (owner ruling).**

> cairn signs in a site's editors and commits their edits, so its security design decides who can
> change the site. It assumes the likeliest attacker holds an editor's account, through a stolen or
> phished sign-in link. An anonymous visitor reaches nothing behind `/admin` except the sign-in form.
>
> Each section below takes one component cairn exposes, says what cairn defends, and names the
> risk it leaves to the site. The page ends with the responsibilities that stay with the site. Read
> it before you replace cairn's sign-in or access rules, and again before you ship.

Brief: sentence 1 is `no-claim`; sentences 2 and 3 cite `f:v85shm` (its key phrase, "likeliest
attacker holds an editor's account", sits in sentence 2, so `check:provenance` requires the
citation); paragraph 2's three sentences are anatomy sentences, `no-claim`. Paragraph 2 describes
the page and refers to position, which the register's tell forbids; the owner's text stands over
the tell here, and the drafter changes no word of either paragraph.

**Paragraph 3: what the subject covers, what the reader brings, what sits elsewhere.** One
paragraph with three duties, in this order.

- *Covers.* Name the areas in page order, as the subject's two groups: the built-in design (the
  sign-in link and its browser binding, the session cookie, CSRF and the guard's response headers,
  the dev-backend flag's refusals, the access map's coverage, the render pipeline's sanitizing, and
  the GitHub App's reach) and then the residual surface of the two seams a site can replace or add,
  an identity gate in place of magic links and an auth channel that signs the site's own members in
  from an anonymous form. This answers the round-2 structural finding that the introduction never
  named the areas, states the grouping the same finding asked for, and widens the attacker framing
  to the channel's anonymous caller without touching Geoff's sentence.
- *Prior knowledge.* Weighing these defenses takes working knowledge of SvelteKit hooks, form
  actions, and cookie attributes.
- *Doesn't cover.* Configuring each seam belongs to its own guide, each named and linked:
  the access map (`docs/extend/restrict-admin-access.md`), Access as the gate
  (`docs/extend/replace-magic-links-with-cloudflare-access.md`), building a channel
  (`docs/extend/add-a-second-sign-in-group.md`), the renderer's options
  (`docs/extend/configure-rendering.md`), and rotating the App key
  (`docs/extend/rotate-the-github-app-key.md`). When the sanitize floor shipped is a record in
  `docs/extend/migration-notes.md`; this page states the floor as it is. Each is stated as a
  subject ("Configuring the access map belongs to ..."), never as "see below".

These are anatomy sentences (`no-claim`), so they carry no code span, numeral, or version that
`check:provenance` would read as an extractable fact.

**Paragraph 4: the definition** (the anatomy's "a definition of the concept follows"). Under the
zero-config default cairn is the identity system for a site's editors, since its D1 store,
`AUTH_DB`, holds the roster, the sessions, and the single-use sign-in tokens (`f:u77pea`). Then
the original sentence the round-2 register read asked to restore, verbatim: "A developer can
replace those defaults, the owner and editor roles and magic-link sign-in, with their own auth
framework, after which cairn mints no session and reads an owner or editor identity through a
defined hand-off." (`f:y3ljm0`; a sentence anywhere on the page that uses its key phrase "floors,
not ceilings" must cite `f:y3ljm0`). Then the hand-off named: the `identity` option on
`createAuthGuard`, which reads the proof of identity an external gate supplies (`f:u77pea`
supports the gate replacing session resolution when a site configures one; the sentence may also
cite `f:fhit7f`, whose full statement lives in section 10). No channel sentence here: the channel
is introduced by its own section's first sentence, and no earlier section depends on it (the
round-2 fact read found the committed channel sentence's citation only indirect).

**Paragraph 5: platform isolation, linked out** (the Cloudflare take). "The isolation of the
Worker that runs the engine belongs to Cloudflare, and the Workers security model describes it."
Link https://developers.cloudflare.com/workers/reference/security-model/ ; `no-claim`.

## Sections

Each entry carries the heading; **Takes**, the one sentence a reader keeps, which is the
section's first sentence on the page; **Draws on**, the fact ids placed here with what each
contributes; **Limits**, the facts that form the `### Limits of ...` subsection; and **Hand-off**,
the turn the section closes on, with any subordination or cut it carries.

### 1. Magic-link sign-in

- **Takes:** A sign-in link carries a single-use token that reaches only a roster address, lives
  ten minutes, and sits in the store as a hash. (`f:u1bjul`, `f:f39xqq`)
- **Draws on:** `f:u1bjul` (256-bit token, SHA-256 at rest, emailed to `/admin/auth/confirm`,
  roster-only, atomic consume, a new request replaces the earlier row, a removed editor's session
  stops on the next request); `f:f39xqq` (10 minutes, 30 days, once per minute; named constants no
  adapter option loosens); `f:8l4wwr` (the request action never returns a token, the link travels
  only by email to the requested address, and the most a requester does to another address is
  replace or rebind its live token); `f:wi766c` (no log record carries a token, a session id, or a
  link's contents; link `docs/reference/log-events.md`); `f:s32y4a` (an address off the roster gets
  the same `sent` answer, so the common case reveals no roster membership).
- **Limits of the non-enumerating answer:** `f:s32y4a` (a repeat request inside the one-minute
  cooldown returns `throttled`, which reveals membership), `f:z0296p` (a deliberate relaxation,
  traded for sending no second email to an editor who presses the button again).
- **Hand-off:** A token that exists can still be spent by a browser other than the one that asked
  for it, which the next section closes. The round-2 register finding on this section's old
  lead-in (it restated the anonymous surface and contradicted the introduction) is disposed by the
  plan: the sentence is dropped, and the section opens on its claim.

### 2. Browser binding for sign-in

- **Takes:** A bound sign-in completes only in the browser that requested it, and a confirm from
  any other browser refuses without consuming the token. (`f:k3gfbi`; the round-2 register rewrite,
  one sentence, no restatement)
- **Draws on:** `f:k3gfbi` (the two threats the binding answers: a login CSRF, where an attacker
  puts a link requested for a roster address before an editor's browser, and a scanner burn);
  `f:6lmusm` (the `cairn_login_pending` cookie and the nonce-hash compare inside the consuming
  `DELETE`); `f:sj1kt9` (the cookie's attributes and one-hour life; the nonce means something only
  while a live token row carries its hash, so a cookie that outlives the row grants nothing);
  `f:qep9a9` (the binding alone would be a lockout, an attacker re-posting the form once a minute
  keeping the token bound to their browser, which is why a throttled re-request rebinds);
  `f:91dwrk` (last-requester-wins; the rebind skips an expired or unbound row).
- **Limits of the browser binding:** `f:5iqvmt` (a row with no binding still matches a cookie-less
  confirm), `f:an087n` (where unbound rows come from: an engine before migration `0004`, the setup
  command's bootstrap insert, a hand-seeded recovery row), `f:678law` (the forwarded-token
  residual: a rebind inside the cooldown makes a forwarded token work in the rebinder's browser;
  outside it the request destroys the forwarded one).
- **Hand-off:** A confirmed sign-in becomes a session, carried by the cookie the next section
  describes. Subordinated: `f:9uhscf` and `f:9pmipf` (the `no-pending-request` error code, its
  constant, and when a failed confirm reads it or `expired`; stated under `NO_PENDING_REQUEST_ERROR`
  in `docs/reference/sveltekit.md`, which the page links from the Limits subsection). Cut:
  `f:uz38ef` (the rebind is one `UPDATE` that either lands before the consuming `DELETE` or matches
  no row: the statement's race behavior, below the decision either reader makes, with no reference
  entry to carry it).

### 3. The session cookie

- **Takes:** A confirmed sign-in becomes a session cookie that carries the `__Host-` prefix on
  every https deploy, so the browser binds it to the site's origin. (`f:wzcgs3`)
- **Draws on:** `f:wzcgs3` (`__Host-` makes the browser require `Secure` and `Path=/` and forbid
  `Domain`; local http drops the prefix, since `__Host-` requires `Secure` unconditionally);
  `f:g22dnw` (one rule decides `Secure` for every cairn cookie: an `https:` request is always
  Secure whatever `PUBLIC_ORIGIN` says, a non-https request on a local host is not, and otherwise a
  configured, parseable `PUBLIC_ORIGIN` decides, with none giving false); `f:8xxe3b` (logout reads
  the session id from either name form, deletes both forms of the session and the CSRF cookie,
  clears the pending-login cookie, and under `identity` skips the row delete and redirects to the
  gate's `logoutUrl`).
- **Limits of the session cookie:** `f:g22dnw`'s residual: a route outside `/admin`, served over
  http on a non-local host under an https `PUBLIC_ORIGIN`, mints a `__Host-` cookie the browser
  discards, since only an `/admin` path gets the guard's https help page.
- **Hand-off:** The cookie rides every admin request, including a form post the editor never meant
  to send. Subordinated: `f:njh87y` (the CSRF cookie shares the session cookie's `__Host-` and
  `Secure` derivation; stated under `buildCookieName` in `docs/reference/auth-crypto.md`, "Both
  cookies route through this one derivation"; its logout half is on the page through `f:8xxe3b`).

### 4. CSRF protection

- **Takes:** A forged form post would act with the editor's session, so every unsafe admin form
  post needs a CSRF check, and cairn runs that check in the guard in place of SvelteKit's.
  (`f:gncd64`; the round-2 register rewrite)
- **Draws on:** `f:gncd64` (the site sets `csrf: { checkOrigin: false }` in `svelte.config.js`;
  the guard enforces an Origin-independent double-submit check on every unsafe `/admin` form post
  and restores an equivalent strict Origin check on every other route). The why, in this order:
  `f:x2stjk` (under the Fetch Standard a non-`cors` request whose method is not `GET` or `HEAD`
  sends `Origin: null` under `no-referrer`, the policy every admin response sets; link
  https://fetch.spec.whatwg.org/), `f:ix10bm` (the guard's origin check is a strict equality, so
  `Origin: null` fails it with the branded `auth.csrf-origin-mismatch` page; `no-referrer` is set on
  `/admin` responses only), `f:3cekcy` (SvelteKit's default check compares the same header and is
  one global setting with no per-route exception, so the site hands the admin's CSRF authority to
  the guard by turning it off everywhere; link https://svelte.dev/docs/kit/configuration#csrf).
  The mechanism: `f:keuj8l` (an `X-Cairn-CSRF` header, when sent, decides outright, so a wrong
  header rejects instead of falling through; only a header-less request has its hidden field read;
  the header path is how a raw-body upload passes; the compare runs through `tokensMatch`, a
  length-checked constant-time compare, link `docs/reference/auth-crypto.md`; a failure renders the
  branded 403 and logs `guard.refused` with reason `csrf`). The cookie: `f:9ik061` (`HttpOnly`,
  `SameSite=Lax`, `Path=/`, a `Max-Age` matching the session's 30 days; the value rotates at a
  successful login and a logout) with `f:0vofop` (every other issue re-sets the identical value with
  a fresh `Max-Age`, so it never rotates by itself).
- **Limits of CSRF protection:** `f:ix10bm` and `f:qbfriw`: the Origin check the guard restores
  outside `/admin` refuses a form post the policy reduces to `Origin: null`, so the site keeps
  `no-referrer` off its site-wide default, and `cairn doctor` warns through
  `config.no-referrer-blanket` when it finds one (link `docs/reference/cli-cairn-doctor.md`).
- **Hand-off:** The CSRF check is one step in the guard's fixed order, which the next section lays
  out. Subordinated: `f:doq8s2` (the header-versus-field witness discrimination on the log record,
  stated in full on the `guard.refused` row of `docs/reference/log-events.md`), `f:d2jumm` (the
  `checkOrigin` deprecation since SvelteKit 2.61 and its tracking; stated in
  `docs/reference/supported-toolchain.md`, "The `checkOrigin` deprecation", which the page links
  from the `checkOrigin` sentence). Cut: `f:9exogy` (re-authenticating in one tab rotates the value
  under another open tab's form, one 403 a reload clears: a usability consequence of the rotation
  with no security residual, and moot under `identity`, where the rotation never runs).

### 5. The auth guard

- **Takes:** The guard handles every admin request in a fixed order, and every refusing step before
  the session resolve logs a named `guard.refused` reason. (`f:7qqhda`)
- **Draws on:** `f:7qqhda` (the six steps as a numbered list, each with its reason:
  `dev_backend_in_prod`, `origin`, `https`, `bindings`, `csrf`, then the session or identity
  resolve); `f:n3k03a` (an `/admin` request over plain http on a non-local host gets the
  `edge.https-not-forced` help page before the CSRF check, public login paths included; a missing
  `AUTH_DB` binding fails every admin path, public ones included, with the named `bindings`
  condition instead of a raw 500; on a guarded path a missing or invalid magic-link session
  redirects with a 303 to `/admin/login` and writes no log record); `f:ubuj1w` (the headers every
  admin response carries, as a bulleted list: `nosniff`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `Referrer-Policy: no-referrer` scoped to `/admin`, the
  `Permissions-Policy` denials, `Strict-Transport-Security` with subdomain pinning as an opt-in,
  `Cache-Control: private, no-store`).
- **Limits of the admin headers:** `f:yzbvk4` (the admin sends no full Content-Security-Policy by
  design, since the defense against script in author markup is the sanitize floor section 8
  describes), `f:72xplg` (a site that wants a CSP configures `kit.csp` in `svelte.config.js`, where
  SvelteKit adds a nonce or a hash to the inline scripts and styles it generates; link
  https://svelte.dev/docs/kit/configuration#csp), `f:horkxq` (the guard applies the headers,
  `Cache-Control: private, no-store` included, only to an `/admin` path, so a token issued from
  `loginLoad`, `confirmLoad`, or the shell load mounted elsewhere travels without them).
- **Hand-off:** The first step in the order is the dev-backend tripwire, which the next section
  explains. Subordinated: `f:t976f1` (the rejection pages send no `Strict-Transport-Security`, and
  why; stated under `createAuthGuard` in `docs/reference/sveltekit.md`, the
  `config.includeSubDomains` paragraph, which the page links from the headers list). The identity
  half of `f:n3k03a` (every refusal the resolver produces logs `guard.refused` with reason
  `identity`; a proven email off the roster logs `auth.identity.unknown`) is cited from section 10.

### 6. The dev-backend flag's two refusals

- **Takes:** A deployed Worker must never carry the `CAIRN_DEV_BACKEND` flag, so the engine
  refuses the flag in two places, on different terms. (`f:tkpmxr`)
- **Draws on:** `f:tkpmxr` (both refusals read the flag from `platform.env` and `process.env`;
  `createAuthGuard` refuses with a 503 on the flag alone and logs `guard.refused` with reason
  `dev_backend_in_prod`, because it mounts only in a production build and a site's dev branch
  replaces it; every `createAuthChannel` action refuses with a 503 before any other work, only
  when the flag is set and the request counts as deployed, because the flag is a dev transport's
  enable contract; link `docs/reference/auth-channel.md`); `f:i2udr5` (a request counts as
  deployed when the configured `PUBLIC_ORIGIN` names a non-local host, whatever `Host` claims; a
  local, absent, or unparseable `PUBLIC_ORIGIN` hands the answer to the request's hostname, so a
  configured origin can only move the answer toward refusing, and a deployment with no
  `PUBLIC_ORIGIN` rests on `Host`).
- **Limits of the dev-backend refusals:** `f:irs7fg` (neither refusal sees a dev-shaped transport
  deployed with the flag unset, since `deliver`, `lookup`, and the rest of the channel's config are
  opaque site functions; a dev-branch bundle that replaces the guard behind the build-time
  `__CAIRN_DEV_BUILD__` conditional sits outside both; the example site closes the transport case
  with a refusal inside its capture transport and the bundle case in CI with a
  `wrangler deploy --dry-run` marker scan, for itself alone).
- **Hand-off:** A request the guard admits to a guarded path belongs to a signed-in editor, and the
  access map decides what that editor may reach. Cut: `f:gh73p5` (the flag counts only as `1` or
  boolean `true`, so a `true` string reads as unset: the parsing rule is the same on the enabling
  side and the refusing side, so it changes no reviewer's decision), `f:rv9gdc` (the example site's
  member dev wiring loads by dynamic import from the `__CAIRN_DEV_BUILD__` branch: example-site
  wiring that repeats the closure `f:irs7fg` already states in this section).

### 7. Access map coverage

- **Takes:** An access map narrows only the targets it names, so a screen or concept the map never
  mentions stays reachable to any editor-capability session. (`f:vqh4a9`)
- **Draws on:** `f:vqh4a9` (`canReach` is the one function deciding route enforcement and nav
  visibility, so the two cannot drift; the `editors` roster screen stays owner-only whatever the map
  says; link `docs/reference/core.md`, "`canReach`, `hasAccessRule`"); `f:cvv6to` (every engine
  write action gates through the map against one target, the concept id or the fixed screen
  `media`, `nav`, `settings`, or `vocabulary`, and an unmapped target admits any editor-capability
  session; one sentence, not the itemized action list); `f:4q8kin` (a site's own action that opts
  into the map reads the other way, fail-closed at three ordered gates: no rule refuses, a role
  absent from the rule refuses except owner capability, and `ownerOnly` refuses a non-owner; the
  sentence's point is the contrast, engine screens open by default and opted-in site routes closed
  by default; link `docs/reference/sveltekit.md`, "`createAdminAction`").
- **Limits of access map coverage:** `f:ji8xa0` (the site-wide publish spans every concept, makes
  no single access call, and any editor-capability session can post it; it filters the pending
  entries by `canReach` per concept, so a narrowed concept publishes nothing for that session and
  an unnamed concept publishes as it would with no map), `f:arr13a` (the tidy and dictionary actions
  run their check only on a route carrying a `concept` parameter), `f:8ciz2s`
  (`validateAccessComposition` does not throw for a partial map; it logs `config.access_unmapped`
  naming the targets a map leaves unmapped when it covers some, but not all, of the concept ids and
  fixed screens).
- **### Allowlist semantics from an exhaustive map.** Two sentences closing the section: a map
  behaves as an allowlist only when it names every concept id and every fixed engine screen, the
  coverage whose absence `config.access_unmapped` reports (`f:ji8xa0`, `f:8ciz2s`), and even then a
  tidy or dictionary action mounted on a route without a `concept` parameter stays open
  (`f:arr13a`); link `docs/extend/restrict-admin-access.md` for the steps. The heading keeps the
  slug `docs/extend/migration-notes.md:370` links.
- **Hand-off:** An editor's reach includes the markup they write, which every visitor's browser
  renders. (The round-2 register note on the render lead-in's equivocation is met by moving this
  turn here and opening section 8 on its claim.)

### 8. Render safety

- **Takes:** Every renderer that `createRenderer` builds runs a sanitize floor by default, seeded
  from GitHub's `defaultSchema`, before the `build()` dispatch or any later stage touches the tree.
  (`f:z3a58a`)
- **Draws on:** `f:z3a58a` (the floor strips `<script>` tags, inline event-handler attributes, and
  `javascript:` and `data:` URLs; link `docs/reference/core.md`, "`createRenderer`"); `f:zzbzo8`
  (the fixed nine-stage order as a numbered list; the two positions that carry the argument are the
  floor before the dispatch and the sink guard after it); `f:296ar7` (raw HTML in markdown is parsed
  into elements rather than escaped, then cleaned to the same allowlist as directive-authored
  content); `f:q9yndd` (what the built schema admits beyond GitHub's: cairn's directive markers as
  inert data attributes, a few structural tags, `className` on any element, `srcSet` and `sizes` on
  `img`, and the inert `cairn:` scheme on `href`; `javascript:` and `data:` stay stripped
  regardless); `f:3yzqup` (every anchor with `target="_blank"` has its `rel` forced, `noopener
  noreferrer` by default, after highlighting and ahead of the sink guard); `f:gi3keo` (the sink
  guard runs over the fully built tree, strips every `on*` attribute and inline `style`,
  scheme-checks every URL-bearing property against the same list, and removes no `build()`-emitted
  `<script>`, `<style>`, or `iframe srcdoc`).
- **Limits of render safety:** `f:2fwybn` (`sanitizeSchema` is additive by contract, not by
  enforcement: a callback that admits `<script>` lets author script through the floor and the sink
  guard removes no script element, while a `javascript:` or `data:` URL stays stripped because the
  sink guard's scheme list comes from GitHub's schema and never from the site's), `f:r7sbt1`
  (`unsafeDisableSanitize` is a code-level switch on the renderer config, never an admin toggle,
  and removes both the floor and the sink guard), `f:wgovy6` (with it set, `rehype-raw` still
  parses author HTML, so a `<script>` or an `onerror` handler any editor, or anyone holding an
  editor's session, writes reaches the HTML the public pages serve to every visitor), `f:21by9u` (a
  registered `build()` can bypass every protection by rendering trusted literal markup outside the
  sanitized tree, since the protections stop at the boundary of what `createRenderer` produced).
- **Hand-off:** An editor's edits reach the repository through the engine's own credential, whose
  reach the next section sets out. Cut again, as the pilot cut it: `f:r0cv6e` (when the floor
  shipped is out of scope; `docs/extend/migration-notes.md` holds the record).

### 9. The GitHub App's reach

- **Takes:** Every save and publish commits through the site's GitHub App, so the App's
  permissions set what its private key and installation token can write. (`f:gglwt4`)
- **Draws on:** `f:kkp5bi` (publishing authenticates as the App, never a personal account; the
  private key is one Worker secret that signs a JWT to mint a short-lived installation token,
  cached per isolate for 55 minutes and re-minted on a miss, never written to disk in the deployed
  runtime and never logged).
- **Limits of the installation token:** `f:gglwt4` and `f:l5gx1t` in one sentence (the Contents
  permission at read and write is repository-wide, the token can write any path in the installed
  repository, and only engine code confines writes to the declared content directories), then the
  consequence (a repository that also holds code or other teams' content puts that content inside
  the token's write reach); link `docs/extend/rotate-the-github-app-key.md` for operating the key.
- **Hand-off:** Every defense so far assumes cairn's own sign-in; a site that replaces it moves
  some of them, which the two seam sections take in turn.

### 10. Identity mode's threat surface

Heading fixed by inbound links (see Heading policy).

- **Takes:** A site that replaces magic-link sign-in with an identity gate leaves every sign-in
  defense to the gate, and cairn's part in sign-in reduces to the roster lookup. (`f:fhit7f`)
- **Draws on:** `f:fhit7f` (the `identity` option on `createAuthGuard` replaces the whole built-in
  sign-in path, so no token is minted, no session is created, and no session cookie is set;
  `identity.resolve` reads the gate's proof, and the guard looks the proven email up exactly as it
  looks up a magic-link session's email; link `docs/reference/sveltekit.md`, "`createAuthGuard`");
  `f:2glcaf` (the effective session lifetime moves to the gate, and cairn's 30-day constant no
  longer applies); `f:8rnym5` (no cairn step rotates the CSRF value under `identity`, so a change
  of gate identity in one browser keeps the value until a cairn logout deletes the cookie or its
  `Max-Age` ends; the login-moment rotation never runs, because confirm is a 404); the identity half
  of `f:n3k03a` (every refusal the resolver produces logs `guard.refused` with reason `identity`,
  and a proven email that matches no roster row logs `auth.identity.unknown`).
- **Limits of identity mode:** `f:emrebl` (the only join between the gate and the roster is the
  email string the resolver returns; the guard rejects an empty string, trims, lowercases, and looks
  the email up with no cross-check, so cairn cannot tell a directory-asserted address from a
  self-asserted one), `f:33upyd` (a gate login method whose email the signing-in user controls lets
  that user sign in as any roster address they assert; Access takes the email from the claim the
  identity provider returns, which the provider's email claim setting selects, link
  https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/generic-oidc/),
  `f:jha9f7` (the guard makes no hostname check under `identity`, so a hostname that reaches the
  Worker outside the gate's coverage is admitted whenever the resolver accepts the presented
  token).
- **Hand-off:** `docs/extend/replace-magic-links-with-cloudflare-access.md` sets up the gate these
  risks belong to; the other seam a site adds signs its own members in, and takes the next section.

### 11. The auth channel's threat surface

- **Takes:** An auth channel's sign-in form takes a contact from an unauthenticated caller, so the
  channel rests on the rule that no control keyed on the victim's identity may deny, delay, or
  destroy anything, and denial keys only on the requester. (`f:pjjo64`; the round-2 register
  rewrite)
- **Draws on:** `f:pjjo64` (an identity-keyed control either escalates through a channel the site
  can act on or only logs). The rule's three instances in one sentence citing all three ids:
  `f:7idpoq` (escalation answers `challenge-required`, a retry invitation and never a hard failure,
  and a failed challenge on an escalated action answers it again), `f:k6u4g2` (eviction keys on the
  requester's own bucket, so a caller crowds out only its own pending rows), `f:e0imm6` (the spend
  ceiling never denies; crossing it logs `auth.channel.ceiling_exceeded` at error to alert the
  operator). The origin check in one sentence: `f:wu8x70` (every action asserts the request's
  `Origin` matches the site's origin and the connection is https, except on a local development
  host, before any code, budget, or session logic runs, and either failure throws a plain 403 with
  no wire result) with `f:8u4iiv` (the check mirrors the guard's rule because the guard's admin-path
  handling never covers a site's member routes, where it restores only the framework's origin check
  for unsafe form posts). Hashing in one sentence: `f:fslodf` (identity correlates through a salted
  hash of the subject, prefixed `s:`, when a roster lookup resolved one, or of the contact,
  prefixed `c:`, otherwise, and the logs carry only the first 16 hex characters, never the raw
  contact) with `f:dipwmx` (the prefixes keep a subject-derived identity from colliding with a
  contact-derived one, and the per-deployment salt, provisioned on first use, keeps the hash from
  reversing against a small contact space). Code generation in one sentence: `f:plcf5v` (a numeric
  code is drawn by rejection sampling over Web Crypto random bytes, which avoids the low-end bias a
  naive modulo introduces) with `f:s047l1` (NIST SP 800-63B requires the secrets behind
  authenticators to come from an approved random bit generator; link
  https://pages.nist.gov/800-63-3/sp800-63b.html).
- **Limits of the auth channel:** `f:wuwk2q` (a dev transport that prints a code to the console is
  a roster oracle by construction, since delivery runs only for a known subject, so an
  unauthenticated caller learns whether a contact is on the roster without guessing a code; the
  same transport in a deployed Worker with observability on lands plaintext codes in Workers Logs;
  no such transport ships in engine code, and the hazard is one a site's `deliver` could introduce).
- **Hand-off:** `docs/extend/add-a-second-sign-in-group.md` builds a channel, and "Config
  obligations" in `docs/reference/auth-channel.md` states what each supplied function owes.
  Subordinated: `f:ez788q` (the `normalize`, `lookup`, and `challenge` obligations; stated in full
  under "Config obligations" in `docs/reference/auth-channel.md`), `f:j254i8` (the challenge runs
  before any mint on `request` and once escalated on `confirm`, charging and consuming nothing;
  stated in the `challenge` bullet under `createAuthChannel` in `docs/reference/auth-channel.md`).
  Cut: `f:2w1yrc` (the rule's design history from three review rounds; the page states the rule as
  it is, and `docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md` holds the history),
  `f:d2j9cj` (the example site's capture transport answering the same oracle, and its six demo
  contacts: an instance of the hazard `f:wuwk2q` states, specific to the example site).

## Ending

### 12. The site's responsibilities

The Syncthing take: the "In short" verdict as the first sentence, then the closing list of the
site's own responsibilities. The job read found the committed list works; it stays the last body
section.

- **Takes:** In short, cairn keeps an editor's sign-in hard to take and confines what a taken
  session reaches, and the following responsibilities stay with the site. (anatomy sentence,
  `no-claim`)
- **The list,** one item per residual the Limits subsections named, in page order, each item
  re-citing the fact its section placed: `csrf: { checkOrigin: false }` plus the mounted guard
  (`f:gncd64`); `Referrer-Policy: no-referrer` off the site-wide default (`f:ix10bm`); an exhaustive
  map when the site intends an allowlist (`f:ji8xa0`, `f:8ciz2s`); the tidy and dictionary actions
  on a route carrying a `concept` parameter (`f:arr13a`); under `identity`, only gate login methods
  whose email the signing-in user cannot control (`f:33upyd`), and every hostname that reaches the
  Worker behind the gate (`f:jha9f7`); dev transports and the `CAIRN_DEV_BACKEND` flag out of a
  deployed Worker, with a refusal inside any dev-shaped transport (`f:irs7fg`); the config
  obligations when building a channel, written with no code span and a link to "Config
  obligations" in `docs/reference/auth-channel.md`, since `f:ez788q` is subordinated and the item
  must stay `no-claim`; every `sanitizeSchema` callback starting from the schema it receives
  (`f:2fwybn`); `unsafeDisableSanitize` unset (`f:r7sbt1`); the output of every registered `build()`
  reviewed (`f:21by9u`); everything in the App's repository, code included, treated as inside the
  installation token's write reach (`f:l5gx1t`); `kit.csp` when the site wants a
  Content-Security-Policy (`f:72xplg`).
- **Hand-off:** Related resources.

### 13. Related resources

The anatomy's ending, grouped as the register asks, 3 to 5 links a group.

- **Takes:** The following resources cover the tasks, the system, and the standards behind these
  defenses. (`no-claim`; each group's list is introduced by a complete sentence)
- **How-to guides** (five): `docs/extend/restrict-admin-access.md` (the access map),
  `docs/extend/replace-magic-links-with-cloudflare-access.md` (an identity gate),
  `docs/extend/add-a-second-sign-in-group.md` (an auth channel),
  `docs/extend/configure-rendering.md` (the renderer's options),
  `docs/extend/rotate-the-github-app-key.md` (the App's private key).
- **Concepts** (two): `docs/extend/architecture.md` (how the engine's parts and seams fit
  together), `docs/extend/migration-notes.md` (when the sanitize floor and the access-map warning
  shipped).
- **External resources** (four): the Workers security model
  (https://developers.cloudflare.com/workers/reference/security-model/, the Worker's isolation);
  the Fetch Standard (https://fetch.spec.whatwg.org/, when a browser sends `Origin: null`); NIST
  SP 800-63B (https://pages.nist.gov/800-63-3/sp800-63b.html, the random generation of authenticator
  secrets); SvelteKit's CSP configuration (https://svelte.dev/docs/kit/configuration#csp). RFC 6797
  leaves the list with `f:t976f1`'s subordination; the SvelteKit `csrf` option stays an inline link
  in section 4.

## Dispositions

One row per fact id the plan disposes: 73 placed, 8 subordinated, 6 cut, and the pilot's 3 cuts
disposed again. "Subordinated" is a cut whose reason names the reference entry that states the
fact; each named entry was opened and read before it was named.

| Fact | Disposition | Section, or reason |
| --- | --- | --- |
| `f:v85shm` | placed | Introduction (paragraph 1, sentences 2 and 3; owner ruling) |
| `f:u77pea` | placed | Introduction (paragraph 4, the definition) |
| `f:y3ljm0` | placed | Introduction (paragraph 4, the restored sentence) |
| `f:u1bjul` | placed | Magic-link sign-in |
| `f:f39xqq` | placed | Magic-link sign-in |
| `f:8l4wwr` | placed | Magic-link sign-in |
| `f:wi766c` | placed | Magic-link sign-in (one sentence; link `docs/reference/log-events.md`) |
| `f:s32y4a` | placed | Magic-link sign-in (body and its Limits) |
| `f:z0296p` | placed | Magic-link sign-in (Limits) |
| `f:k3gfbi` | placed | Browser binding for sign-in |
| `f:6lmusm` | placed | Browser binding for sign-in |
| `f:sj1kt9` | placed | Browser binding for sign-in |
| `f:qep9a9` | placed | Browser binding for sign-in |
| `f:91dwrk` | placed | Browser binding for sign-in |
| `f:5iqvmt` | placed | Browser binding for sign-in (Limits) |
| `f:an087n` | placed | Browser binding for sign-in (Limits) |
| `f:678law` | placed | Browser binding for sign-in (Limits) |
| `f:9uhscf` | subordinated | `docs/reference/sveltekit.md`, "`NO_PENDING_REQUEST_ERROR`": states the constant, its wire value, and that a site's own login page branches on it |
| `f:9pmipf` | subordinated | `docs/reference/sveltekit.md`, "`NO_PENDING_REQUEST_ERROR`": states the code and that it is distinct from `expired`; the entry states the cookie-less condition narrower than the code (bound rows only), filed as reference-arm friction |
| `f:uz38ef` | cut | The rebind `UPDATE`'s race behavior against the consuming `DELETE`: statement-level detail below either reader's decision, and no reference entry carries the magic-token store |
| `f:wzcgs3` | placed | The session cookie |
| `f:g22dnw` | placed | The session cookie (body and its Limits) |
| `f:8xxe3b` | placed | The session cookie |
| `f:njh87y` | subordinated | `docs/reference/auth-crypto.md`, "`buildCookieName`": "Both cookies route through this one derivation"; the logout half is on the page through `f:8xxe3b` |
| `f:gncd64` | placed | CSRF protection |
| `f:x2stjk` | placed | CSRF protection |
| `f:ix10bm` | placed | CSRF protection (body and its Limits) |
| `f:3cekcy` | placed | CSRF protection |
| `f:keuj8l` | placed | CSRF protection |
| `f:9ik061` | placed | CSRF protection |
| `f:0vofop` | placed | CSRF protection |
| `f:qbfriw` | placed | CSRF protection (Limits) |
| `f:doq8s2` | subordinated | `docs/reference/log-events.md`, the `guard.refused` row: states the header-versus-field witness rule, the empty-header case, and the `detail` values in full |
| `f:d2jumm` | subordinated | `docs/reference/supported-toolchain.md`, "The `checkOrigin` deprecation": states the 2.61 deprecation in favor of `trustedOrigins`, that it is not removed, and that cairn's admin CSRF ownership depends on disabling it |
| `f:9exogy` | cut | A re-authentication in one tab rotating the CSRF value under another tab's form is a usability consequence (one 403 a reload clears) with no security residual, and moot under `identity` |
| `f:7qqhda` | placed | The auth guard |
| `f:n3k03a` | placed | The auth guard (its identity half is cited again from Identity mode's threat surface) |
| `f:ubuj1w` | placed | The auth guard |
| `f:yzbvk4` | placed | The auth guard (Limits) |
| `f:72xplg` | placed | The auth guard (Limits; re-cited in The site's responsibilities) |
| `f:horkxq` | placed | The auth guard (Limits) |
| `f:t976f1` | subordinated | `docs/reference/sveltekit.md`, "`createAuthGuard`", the `config.includeSubDomains` paragraph: states that the rejection pages and the login redirect send no `Strict-Transport-Security` and why |
| `f:tkpmxr` | placed | The dev-backend flag's two refusals |
| `f:i2udr5` | placed | The dev-backend flag's two refusals |
| `f:irs7fg` | placed | The dev-backend flag's two refusals (Limits) |
| `f:gh73p5` | cut | The flag's truthiness rule (`1` or boolean `true` only) is the same on the enabling and the refusing side, so it changes no reviewer's decision |
| `f:rv9gdc` | cut | The example site's dev wiring loading by dynamic import repeats the example-site closure `f:irs7fg` already states in the same section |
| `f:vqh4a9` | placed | Access map coverage |
| `f:cvv6to` | placed | Access map coverage |
| `f:4q8kin` | placed | Access map coverage |
| `f:ji8xa0` | placed | Access map coverage (Limits and the allowlist subsection) |
| `f:arr13a` | placed | Access map coverage (Limits and the allowlist subsection) |
| `f:8ciz2s` | placed | Access map coverage (Limits and the allowlist subsection) |
| `f:z3a58a` | placed | Render safety |
| `f:zzbzo8` | placed | Render safety |
| `f:296ar7` | placed | Render safety |
| `f:q9yndd` | placed | Render safety |
| `f:3yzqup` | placed | Render safety |
| `f:gi3keo` | placed | Render safety |
| `f:2fwybn` | placed | Render safety (Limits) |
| `f:r7sbt1` | placed | Render safety (Limits) |
| `f:wgovy6` | placed | Render safety (Limits) |
| `f:21by9u` | placed | Render safety (Limits) |
| `f:r0cv6e` | cut | When the sanitize floor shipped is out of scope for this page; `docs/extend/migration-notes.md` holds the record (the pilot's cut, kept) |
| `f:kkp5bi` | placed | The GitHub App's reach |
| `f:gglwt4` | placed | The GitHub App's reach (first sentence and Limits) |
| `f:l5gx1t` | placed | The GitHub App's reach (Limits) |
| `f:fhit7f` | placed | Identity mode's threat surface (the introduction's hand-off sentence may cite it too) |
| `f:2glcaf` | placed | Identity mode's threat surface |
| `f:8rnym5` | placed | Identity mode's threat surface |
| `f:emrebl` | placed | Identity mode's threat surface (Limits) |
| `f:33upyd` | placed | Identity mode's threat surface (Limits) |
| `f:jha9f7` | placed | Identity mode's threat surface (Limits) |
| `f:diro7m` | cut | `hasSession` on a CSRF-refusal log record being always `false` under `identity` is a log-field detail with no decision behind it (the pilot's cut, kept) |
| `f:pjjo64` | placed | The auth channel's threat surface |
| `f:7idpoq` | placed | The auth channel's threat surface (the three-instances sentence) |
| `f:k6u4g2` | placed | The auth channel's threat surface (the three-instances sentence) |
| `f:e0imm6` | placed | The auth channel's threat surface (the three-instances sentence) |
| `f:wu8x70` | placed | The auth channel's threat surface (the origin sentence) |
| `f:8u4iiv` | placed | The auth channel's threat surface (the origin sentence) |
| `f:fslodf` | placed | The auth channel's threat surface (the hashing sentence) |
| `f:dipwmx` | placed | The auth channel's threat surface (the hashing sentence) |
| `f:plcf5v` | placed | The auth channel's threat surface (the code-generation sentence) |
| `f:s047l1` | placed | The auth channel's threat surface (the code-generation sentence; the external link) |
| `f:wuwk2q` | placed | The auth channel's threat surface (Limits) |
| `f:ez788q` | subordinated | `docs/reference/auth-channel.md`, "Config obligations": states the `normalize`, `lookup`, and `challenge` obligations in full |
| `f:j254i8` | subordinated | `docs/reference/auth-channel.md`, "`createAuthChannel`", the `challenge` bullet: states that the challenge is awaited before any mint on `request` and on an escalated `confirm`, and that a failure writes no row, charges no attempt, and consumes nothing |
| `f:2w1yrc` | cut | The rule's design history (three review rounds that failed on the same move) is history, not a defense or a residual; the page states the rule as it is and `docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md` holds the history |
| `f:d2j9cj` | cut | The example site's capture transport answering the same roster oracle, and its six demo contacts, is an example-site instance of the hazard `f:wuwk2q` states |
| `f:jud805` | cut | The absence of a pre-deploy check for migration `0004` is an operational gap for the admin track, not a defense or a residual of the binding (the pilot's cut, kept) |

## Round-2 blocking findings, disposed

| Finding (seat, committed line) | Disposition |
| --- | --- |
| Structural, `:3`: the introduction never names the areas the page assesses; the attacker framing omits the channel's anonymous caller | Applies. Paragraph 3 names the areas in page order as two groups and names the channel's caller; Geoff's sentences stay |
| Structural, `:421`: the dev-backend section sits about 240 lines after the guard step that names it; Log contents sits mid-page; the grouping is unstated | Applies, with one change. Section 6 follows section 5 directly; the built-in-then-replaced grouping is stated in paragraph 3; the logs claim becomes one sentence in section 1 rather than a section moved to the end |
| Register, `:16-20`: the default-identity sentence was rewritten and grew a restatement tell | Applies. Paragraph 4 restores the original sentence verbatim |
| Register, `:29-30`: the magic-link lead-in restates the anonymous surface and contradicts the introduction | Disposed by the plan. The sentence is dropped; section 1 opens on its claim |
| Register, `:58-61`: the browser-binding lead-in restates its own second sentence | Applies. Section 2's first sentence is the finding's rewrite |
| Register, `:365-368`: the channel lead-in previews the sentence that follows | Applies. Section 11's first sentence is the finding's rewrite |
| Register, `:129-130`: the CSRF lead-in is a non-sequitur | Applies. Section 4's first sentence is the finding's rewrite |

Non-blocking round-2 findings this plan takes: the out-of-scope pages named (paragraph 3); a
Limits subsection on both seam sections; the render lead-in's equivocation (section 7's hand-off
carries the turn, section 8 opens on its claim); the GitHub lead-in's scope (section 9 opens on
`f:gglwt4`); the roughly 100-column wrap on every line.

## Notes for the drafter

- A sentence that synthesizes two facts cites both ids; the brief accepts an array. The sentences
  this plan marks "in one sentence" are the intended multi-id sentences.
- An anatomy sentence (the introduction's paragraph 3, each section's hand-off, the list lead-ins,
  the responsibilities verdict) carries no code span, numeral, version, or date, or it cites a fact.
- A fact placed in one section may be cited again from another sentence that needs it (`f:n3k03a`
  from section 10; `f:fhit7f` from paragraph 4; the Limits facts from the responsibilities list).
- The page edits no other page. The relink pointers in the heading-policy table belong to the
  relink pass; `docs/extend/migration-notes.md:370` already resolves.
- Every link to a page this plan names in a code span becomes a relative Markdown link on the
  page; the five how-to guides are forward links the link gate accepts because the committed
  outline names them.
