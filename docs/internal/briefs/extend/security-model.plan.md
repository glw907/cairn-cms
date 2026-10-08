# Page plan: Security model

The plan for `docs/extend/security-model.md`, a concept page in the extend track. Written
2026-10-03 as the plan step of the docs page chain (stage 2a task 7c, run ahead of the task 7b
resolution), and revised the same day for the resolution run's second round (conductor ruling
2026-10-03): the accepted plan stands, changed only where a round-2 blocking finding in
`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`, "### security-model",
requires. Revised once more the same day on the structural edit's read of the plan itself: one
blocking finding (the guard used as a known term before anything defines it) and four advisories,
each disposed in the third table near the end. Revised a fourth time in the targeted close Geoff
ruled on 2026-10-03, after the plan's second structural read
(`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-2-record.md`,
"### security-model") blocked on a second concept used before its introduction, the auth channel
in the dev-backend section: both concepts, the guard and the channel, are now introduced before or
where the page first depends on them, the fourth table near the end disposes that read's findings,
and nothing the reads passed is changed. Revised a fifth time on the targeted close's own
structural read of that revision, which passed the order, the introduction, both concept
introductions, the cross-links, and the anatomy, and blocked on a third concept used as a known
term, `build()` in Render safety's first sentence: that section's second sentence now says what a
`build()` is, three advisories are taken, and the fifth table near the end disposes all four. The
drafter drafts from this plan: it is the source of the page's order, each section's claim, and each
fact's placement. The brief sits beside it at
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
  grouped as how-to guides, concepts, and external resources, with not more than 3 to 5 links in
  each group (the register's words set a ceiling, not a floor).
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
- **Rework-record round-2 findings**
  (`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`, "### security-model"): a
  blocking finding applies where this plan keeps the sentence it cites, and a finding on a sentence
  this plan drops is disposed here. The first table near the end maps all seven.
- **Resolution-run round-2 findings**
  (`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`,
  "### security-model", "Escalation findings"): four blocking findings, two from the structural read
  and two from the register read, on a page drafted from the accepted version of this plan. Two of
  the four are the same defect seen by two seats (the dropped hand-offs), and two are the
  introduction's doesn't-cover sentences. The second table near the end maps them, with the plan
  corrections the round-2 drafter asked the conductor for.
- **The structural edit of this plan (2026-10-03).** One blocking finding: the body uses the guard
  as a known term from introduction paragraph 3 through section 4, and nothing says what it is
  before section 5. The definition paragraph now names the guard, citing `f:7qqhda`, and the
  covers sentence names the admin response headers without the guard. Four advisories taken: the
  doesn't-cover sentence that pointed at the page, a forward reference by section number in
  section 5, the identity-mode logout clause placed before identity mode is introduced, and the
  density of one paragraph carrying covers, prior knowledge, and doesn't-cover together. The third
  table near the end maps all five.
- **The second structural edit of this plan, and the targeted close (Geoff, 2026-10-03).** The
  second read passed the order, the introduction's three parts, the cross-links, and the module
  types, and blocked on the auth channel: section 6 depends on `createAuthChannel`, a dev
  transport, and the channel's `deliver` and `lookup` functions, and nothing before section 11
  says what a channel is, the same defect class as the guard. Geoff's ruling for the close: start
  from the revised plan, keep everything the reads passed, and close both concepts, each
  introduced where first used or the sections reordered so it is. The guard keeps its
  introduction in the definition paragraph, now split in two on the read's density advisory. The
  channel is introduced in section 6, at its first use, in two fixed sentences linked to its own
  section, because no reorder serves it (the reason is under section 6). The read's other
  advisory, that no planned sentence carries the outline's "floors, not ceilings", is taken as
  one short sentence citing `f:y3ljm0`. The fourth table near the end maps all three.
- **The third structural edit of this plan (2026-10-03).** The read of the targeted close's
  revision passed the attacker's-path order and its stated grouping, the introduction's three
  parts, the guard's and the channel's introductions, the four outline cross-links, and the concept
  anatomy, and blocked on one more concept used before anything says what it is: Render safety's
  first sentence names "the `build()` dispatch", the section builds on `build()` three more times
  and the responsibilities list once, and no sentence said that a `build()` is site code a site
  registers for a component. The section's fixed second sentence now says so, citing `f:21by9u`
  and `f:zzbzo8` and linking the `defineComponent` reference entry. Three advisories taken: the
  session cookie's Limits glosses its "https help page" clause, section 6 sets its two refusals as
  a two-item list, and Migration notes leaves the Concepts group. The fifth table near the end maps
  all four.
- **The diagnosis** (`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`):
  the committed page reads as atoms. This plan decides what the page argues, which facts carry the
  argument, and which are detail the reference already holds.

## The argument, and the order it needs

The page argues one thing: cairn's defenses follow the attacker the owner names, an editor's
account taken through a stolen or phished sign-in link, and each defense leaves a named residual
the site carries. The body therefore walks the attacker's path through the built-in design, then
takes the two seams a site can swap in, then closes on the list of what stays with the site. Every
component section answers one reviewer's question in its first sentence, lays out the defense,
names what remains in a `### Limits of ...` subsection, and closes on a hand-off that carries the
path to the next component.

1. **Taking the account** (sections 1 to 3). The sign-in link, the browser binding that stops a
   stolen or forwarded link from being spent elsewhere, and the session cookie that carries the
   account afterwards. This is the threat position's own path, link to binding to session, so the
   reader meets the token first and the cookie last.
2. **Riding the account without holding it** (sections 4 to 6). CSRF, then the guard that runs the
   check and sets every admin response's headers, then the dev-backend flag the guard refuses as its
   first step. The round-2 structural read asked for the flag's section directly after the guard:
   the guard's first listed step is the tripwire, and its explanation now follows within a page.
   The flag's second refusal is the auth channel's, so that section introduces the channel at the
   page's first use of it, five sections ahead of the channel's own; section 6 records why no
   reorder serves that.
3. **What the account reaches** (sections 7 to 9). The access map (which screens a signed-in editor
   may reach), then render safety (what an editor's markup does to every visitor), then the GitHub
   App's reach (what the engine's own credential can write). Each widens the blast radius of one
   taken account by a step: screens, then visitors, then the repository.
4. **What changes when you replace a seam** (sections 10 and 11). Identity mode and the auth
   channel, grouped after the defaults they modify, so each refers back: identity mode moves the
   session lifetime and stops the CSRF rotation the earlier sections describe; the channel keeps an
   origin check of its own on the member routes, since the guard adds none on any route. The introduction states this two-part
   grouping, the alternative the structural read offered to the outline's inventory order, and the
   hand-off that closes section 9 marks the boundary in the body.
5. **The site's responsibilities** (section 12), opening on the "In short" verdict, then **Related
   resources** (section 13), the anatomy's ending.

Two departures from the outline's cover list, with reasons. "Logs never carry tokens or session
ids" (`f:wi766c`) is one sentence placed where the token travels, in the sign-in section, instead
of a one-paragraph section of its own: the round-2 read objected to its stranded position, and a
section holding one claim fails the anatomy's one-subtopic test. The auth channel's catalogue is
held to the reader's depth (the job read called it the heaviest section for a minority reader):
the rule, its three instances, the origin check, hashing, code generation, and the roster-oracle
limit. The channel's config obligations and challenge order are subordinated to
`docs/reference/auth-channel.md`, which states both.

### Hand-offs

Every section from Magic-link sign-in through The auth channel's threat surface closes on its
hand-off. The hand-off is the section's last sentence on the page: one sentence (section 10's
carries two links), set as its own paragraph after the last paragraph of the `### Limits of ...`
subsection, and in Access map coverage after the allowlist subsection that follows the Limits.
The round-2 page carried none of the planned turns, and the structural read and the register read
both blocked on the loss: without them the page read as the atoms the diagnosis names, nothing in
the body marked the move from the built-in design to the replaced seams, and the two seam sections
lost the links to their setup guides. The hand-offs are the mechanism that makes the order argue,
so they are not the drafter's to drop; a turn that reads as restating is fixed by rewording, never
by deletion.

**Placement.** The two seats placed the turn differently: the structural read after the Limits
subsection's content, the register read just before the Limits heading. This plan places it after
the Limits content, for three reasons. The turn passes on what the Limits subsection says remains,
so it reads the residual before it, and in the two seam sections "these risks" is the Limits
content. The next heading follows the turn directly, so the reader meets the turn where the subject
changes. Set before the Limits heading, a forward turn would sit a whole subsection away from the
heading it serves. The register read's concern, a sentence inside a Limits subsection that is not a
limit, is met by the turn's form: it opens on the residual or the reach the section leaves and
closes on its target, so it reads as the subsection's conclusion.

**Form.** A turn names its target by its heading or page title, rendered as a link, never by
position ("below", "next", "the following section"). It previews no sentence of the target section
and restates none of its own section, which is what the round-1 readers cut the earlier turns for.
It is `no-claim`, or it cites the fact its clause states; it carries no numeral or version. The
sentence for each section is fixed in that section's **Hand-off** line below, word for word, and the
drafter changes only the link syntax.

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

No heading. Eight paragraphs, reader-first, no imperative opening and no "the page" or position references. Citations live in the page's brief JSON.

1. Why the subject matters: a site built on cairn lets people with no GitHub account change published content, so security starts from how cairn identifies them. Names the Decap-style GitHub-account alternative for contrast.
2. Where cairn runs and what it is under the zero-config default: inside the site's SvelteKit app on Workers; the admin under `/admin`; magic-link sign-in; cairn is the identity system (D1 `AUTH_DB` holds roster, sessions, single-use tokens); edits reach the repo through the site's GitHub App, key held as a Worker secret.
3. Threat position: the likeliest attacker holds an editor's account via a stolen or phished link; anonymous visitors reach only the sign-in form; every `/admin` request passes the auth guard (`createAuthGuard`); Cloudflare owns Worker isolation (link).
4. Reader routing by need: evaluator, setter-up weighing one choice, developer replacing sign-in or adding a second group.
5. Defaults are floors: the `identity` option, and the auth channel; prior knowledge sentence (SvelteKit hooks, form actions, cookie attributes).
6. Four-item list of the built-in defense groups.
7. One sentence on what follows (seam surfaces, then site responsibilities).
8. Out-of-scope routing: restrict-admin-access, replace-magic-links, add-a-second-sign-in-group, configure-rendering, rotate-the-github-app-key; sanitize-floor history out of scope.

The earlier owner ruling "land as written" (2026-09-30) for paragraphs 1-2 no longer applies; those paragraphs were rewritten.

Superseded 2026-10-04 by Geoff's intro ruling (framing and reader-first intros, never an imperative opening); see docs/internal/briefs/extend/security-model.framing.md.

## Sections

Each entry carries the heading; **Takes**, the one sentence a reader keeps, which is the
section's first sentence on the page; **Draws on**, the fact ids placed here with what each
contributes; **Limits**, the facts that form the `### Limits of ...` subsection; and **Hand-off**,
the sentence the section closes on, fixed word for word (page and heading names become links),
with any subordination or cut the section carries.

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
- **Hand-off:** "A token that exists can still be spent by a browser other than the one that asked
  for it, and Browser binding for sign-in closes that path." (`no-claim`, or `f:k3gfbi` if the
  checker reads the closing clause as a claim.) The round-2 register finding on this section's old
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
- **Hand-off:** "A confirmed sign-in, bound or unbound, becomes a session, and The session cookie
  carries it on every later admin request." (`no-claim`.) Subordinated: `f:9uhscf` and `f:9pmipf`
  (the `no-pending-request` error code, its constant, and when a failed confirm reads it or
  `expired`; stated under `NO_PENDING_REQUEST_ERROR` in `docs/reference/sveltekit.md`, which the
  page links from the section body, before the Limits heading). Cut: `f:uz38ef` (the rebind is one
  `UPDATE` that either lands before the consuming `DELETE` or matches no row: the statement's race
  behavior, below the decision either reader makes, with no reference entry to carry it).

### 3. The session cookie

- **Takes:** A confirmed sign-in becomes a session cookie that carries the `__Host-` prefix on
  every https deploy, so the browser binds it to the site's origin. (`f:wzcgs3`)
- **Draws on:** `f:wzcgs3` (`__Host-` makes the browser require `Secure` and `Path=/` and forbid
  `Domain`; local http drops the prefix, since `__Host-` requires `Secure` unconditionally);
  `f:g22dnw` (one rule decides `Secure` for every cairn cookie: an `https:` request is always
  Secure whatever `PUBLIC_ORIGIN` says, a non-https request on a local host is not, and otherwise a
  configured, parseable `PUBLIC_ORIGIN` decides, with none giving false); `f:8xxe3b` (the
  magic-link logout: it reads the session id from either name form, deletes both forms of the
  session cookie and of the CSRF cookie, and clears the pending-login cookie; the fact's `identity`
  clause, the skipped row delete and the redirect to the gate's `logoutUrl`, is cited from section
  10, where identity mode is introduced, on the structural edit's advisory that this section
  carried it before either CSRF or identity mode had arrived).
- **Limits of the session cookie:** `f:g22dnw`'s residual: a route outside `/admin`, served over
  http on a non-local host under an https `PUBLIC_ORIGIN`, mints a `__Host-` cookie the browser
  discards, since the guard answers a plain-http request with its help page only on an `/admin`
  path. The closing clause cites `f:g22dnw`, whose residual sentence it is, with `f:n3k03a`, which
  states the help page's condition; the third structural read's advisory asked it to gloss the
  bare "https help page", a term The auth guard explains, and the gloss closes the forward
  dependency without a link, since the guard itself is defined in paragraph 5.
- **Hand-off:** "The cookie rides every admin request the browser sends, including a form post the
  editor never meant to send, and CSRF protection answers that post." (`no-claim`.) Subordinated:
  `f:njh87y` (the CSRF cookie shares the session cookie's `__Host-` and `Secure` derivation; stated
  under `buildCookieName` in `docs/reference/auth-crypto.md`, "The engine's own two cookies derive
  `secure` the same way"; its logout half is on the page through `f:8xxe3b`).

### 4. CSRF protection

- **Takes:** A forged form post would act with the editor's session, so every unsafe admin form
  post needs a CSRF check. SvelteKit's origin check and the guard's double-submit token both
  answer it. (`f:7rehzh`; the R4 SvelteKit 3 correction, 2026-10-07, replacing the
  rejected `f:gncd64`)
- **Draws on:** `f:7rehzh` with `f:keuj8l` (the scaffold's Vite config carries no `csrf` key, so
  SvelteKit's check runs ahead of every handle on every route, `/admin` included, and the guard adds
  its token check on every unsafe `/admin` form post; the page states it as two sentences). The why, in this order: `f:3cekcy`
  (SvelteKit's default check compares a form post's `Origin` with the app's origin, refuses a
  mismatch or an absent header, and is one global setting with no per-route exception, so the
  admin's form posts must carry a real `Origin`; link
  https://svelte.dev/docs/kit/configuration#csrf), `f:x2stjk` with `f:ix10bm` (under the Fetch
  Standard a non-`cors` request whose method is not `GET` or `HEAD` sends `Origin: null` under
  `no-referrer`, and SvelteKit's check refuses it; link https://fetch.spec.whatwg.org/), `f:ubuj1w`
  (every admin response sets `Referrer-Policy: strict-origin`, and each admin view repeats it in a
  referrer meta tag), `f:3cekcy` (SvelteKit 3 removed `csrf.checkOrigin`, leaving
  `csrf.trustedOrigins` as the only setting; link `docs/reference/supported-toolchain.md`, "The
  `checkOrigin` removal"; R4 places it directly after the one-global-setting sentence, so the Fetch
  Standard sentence is the last premise). `f:hl5asm` states that `strict-origin` keeps a same-origin
  `Origin`, so the page now says "therefore" and adds the meta-tag sentence for a site-wide
  `no-referrer`.
  The mechanism: `f:keuj8l` (an `X-Cairn-CSRF` header, when sent, decides outright, so a wrong
  header rejects instead of falling through; only a header-less request has its hidden field read;
  the header path is how a raw-body upload passes; the compare runs through `tokensMatch`, a
  length-checked constant-time compare, link `docs/reference/auth-crypto.md`; a failure renders the
  branded 403 and logs `guard.refused` with reason `csrf`). The cookie: `f:9ik061` (`HttpOnly`,
  `SameSite=Lax`, `Path=/`, a `Max-Age` matching the session's 30 days; the value rotates at a
  successful login and a logout) with `f:0vofop` (every other issue re-sets the identical value with
  a fresh `Max-Age`, so it never rotates by itself).
- **Limits of CSRF protection:** `f:ix10bm`, `f:x2stjk`, and `f:qbfriw`: the guard sets
  `strict-origin` on `/admin` responses only, so a site-wide `no-referrer` reduces every other
  same-origin form post to `Origin: null`, which SvelteKit's check refuses on the site's own forms
  and every auth channel action; the site keeps `no-referrer` off its site-wide default, and
  `cairn doctor` warns through `config.no-referrer-blanket` when it finds one (link
  `docs/reference/cli-cairn-doctor.md`). Then `f:3cekcy` with `f:ytwrgp`: an origin listed in
  `csrf.trustedOrigins` passes SvelteKit's check on `/admin` as well as every other route, and the
  doctor's `config.csrf-trusted-origins` check warns on a `'*'` or a `'null'` entry.
- **Hand-off:** "The CSRF check is one step in The auth guard's fixed order." (`no-claim`; the
  register read's wording.) Subordinated: `f:doq8s2` (the header-versus-field witness
  discrimination on the log record, stated in full on the `guard.refused` row of
  `docs/reference/log-events.md`). Cut: `f:d2jumm` and `f:gncd64`, both rejected in the container
  once SvelteKit 3 removed `csrf.checkOrigin` (reasons in the fact table). Cut: `f:9exogy`
  (re-authenticating in one tab rotates the value under another open tab's form, one 403 a reload
  clears: a usability consequence of the rotation with no security residual, and moot under
  `identity`, where the rotation never runs).

### 5. The auth guard

- **Takes:** The guard handles every admin request in a fixed order, and every refusing step before
  the session resolve logs a named `guard.refused` reason. (`f:7qqhda`)
- **Draws on:** `f:7qqhda` (the five steps as a numbered list, each with its reason:
  `dev_backend_in_prod`, `https`, `bindings`, `csrf`, then the session or identity resolve; the
  guard has no origin step); `f:n3k03a` (an `/admin` request over plain http on a non-local host gets the
  `edge.https-not-forced` help page before the CSRF check, public login paths included; a missing
  `AUTH_DB` binding fails every admin path, public ones included, with the named `bindings`
  condition instead of a raw 500; on a guarded path a missing or invalid magic-link session
  redirects with a 303 to `/admin/login` and writes no log record); `f:ubuj1w` (the headers every
  admin response carries, as a bulleted list: `nosniff`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `Referrer-Policy: strict-origin` scoped to `/admin`, the
  `Permissions-Policy` denials, `Strict-Transport-Security` with subdomain pinning as an opt-in,
  `Cache-Control: private, no-store`).
- **Limits of the admin headers:** `f:yzbvk4` (the admin sends no full Content-Security-Policy by
  design, since the defense against script in author markup is the sanitize floor Render safety
  describes; the heading is rendered as a link, never a section number, per the hand-off form
  rule), `f:72xplg` (a site that wants a CSP sets SvelteKit's `csp` option in the `sveltekit()` call in
  its Vite config, and SvelteKit adds a nonce or a hash to the inline scripts and styles it
  generates; link
  https://svelte.dev/docs/kit/configuration#csp), `f:horkxq` (the guard applies the headers,
  `Cache-Control: private, no-store` included, only to an `/admin` path, so a token issued from
  `loginLoad`, `confirmLoad`, or the shell load mounted elsewhere travels without them).
- **Hand-off:** "The guard's first step, the dev-backend tripwire, refuses a flag that must never
  reach a deployed Worker, and The dev-backend flag's two refusals state what each refusal catches
  and what it leaves open." (`no-claim`, or `f:tkpmxr` if the checker reads the flag clause as a
  claim.) Subordinated: `f:t976f1` (the rejection pages send no `Strict-Transport-Security`, and
  why; stated under `createAuthGuard` in `docs/reference/sveltekit.md`, the
  `config.includeSubDomains` paragraph, which the page links from the headers list). The identity
  half of `f:n3k03a` (every refusal the resolver produces logs `guard.refused` with reason
  `identity`; a proven email off the roster logs `auth.identity.unknown`) is cited from section 10.

### 6. The dev-backend flag's two refusals

- **Takes:** A deployed Worker must never carry the `CAIRN_DEV_BACKEND` flag, so the engine
  refuses the flag in two places, on different terms. (`f:tkpmxr`)
- **Shape** (the third structural read's pace advisory): the first sentence is the lead-in of a
  two-item list, one item per refusal. The first item is the guard's refusal. The second opens on
  the two fixed channel sentences below, then states the channel's refusal with its dev-transport
  clause, and closes on the deployed-detection rule (`f:i2udr5`). The Limits subsection follows the
  list. The list holds the channel's introduction to one item, so the section's densest stretch
  reads as two cases, and no sentence is reordered or reworded for it.
- **Draws on:** `f:tkpmxr` (both refusals read the flag from the Worker env alone;
  `createAuthGuard` refuses with a 503 on the flag alone and logs `guard.refused` with reason
  `dev_backend_in_prod`, because it mounts only in a production build and a site's dev branch
  replaces it). Then the auth channel, introduced here because this is the first sentence on the
  page that depends on it, in two fixed sentences the drafter carries word for word, link syntax
  aside, ahead of the second refusal: "The second refusal belongs to an auth channel, the seam a
  site adds for a second sign-in audience on routes the guard never covers. `createAuthChannel`
  builds a channel from functions the site supplies, among them `lookup`, which resolves a contact
  against the channel's own roster, and `deliver`, which carries a code to the contact." The first
  sentence cites `f:tkpmxr`, whose "second-audience" names the audience, and `f:2sd4if`, whose
  statement that the guard gates the `/admin` subtree supports the clause that the guard's
  admin-path handling never covers a site's member routes (R4, 2026-10-07: the rewritten
  `f:8u4iiv` no longer carries that clause),
  with "an auth channel" rendered as a link to the heading The auth channel's threat surface. The
  second cites `f:irs7fg`, which names `deliver`, `lookup`, and the rest of the config as opaque
  site functions, and `f:fslodf`, whose "roster lookup resolved a stable subject" is what `lookup`
  does, with `createAuthChannel` linked to `docs/reference/auth-channel.md`, whose lede states the
  seam in full. Then the second refusal: every channel action refuses with a 503 before any other
  work, only when the flag is set and the request counts as deployed, because the flag is the
  enable contract of a dev transport, a `deliver` that prints the code in development instead of
  sending it (`f:tkpmxr` with `f:wuwk2q`, whose printing transport is the definition; its
  roster-oracle consequence stays in section 11's Limits). Then, closing the second item,
  `f:i2udr5` (a request counts as deployed when the configured `PUBLIC_ORIGIN` names a non-local host, whatever `Host` claims; a
  local, absent, or unparseable `PUBLIC_ORIGIN` hands the answer to the request's hostname, so a
  configured origin can only move the answer toward refusing, and a deployment with no
  `PUBLIC_ORIGIN` rests on `Host`).
- **Why the channel is introduced here and not by a reorder.** The second structural edit offered
  two fixes and recommended this one. The other, moving the channel half of `f:tkpmxr` and the
  transport half of `f:irs7fg` to section 11 and keeping this section to the guard's refusal and
  the bundle residual, would leave one refusal under a heading, a restored slug, and a first
  sentence that all say two, and the outline's cover item is the two refusals together. A reorder
  cannot help either: this section must follow the guard directly (the rework-record round-2
  structural finding on the 240-line gap), and the channel's own section belongs to the
  replaced-seams group after the built-in design, so the two refusals meet the channel before its
  section whichever way the groups run. Introducing it at first use, linked forward, is Google's
  "when it's most relevant" for this page.
- **Limits of the dev-backend refusals:** `f:irs7fg` (neither refusal sees a dev-shaped transport
  deployed with the flag unset, since `deliver`, `lookup`, and the rest of the channel's config are
  opaque site functions, the functions the introduction above named; a dev-branch bundle that
  replaces the guard behind the build-time `__CAIRN_DEV_BUILD__` conditional sits outside both;
  the example site closes the transport case with a refusal inside its capture transport and the
  bundle case in CI with a `wrangler deploy --dry-run` marker scan, for itself alone).
- **Hand-off:** "A request the guard admits to a guarded path belongs to a signed-in editor, and
  Access map coverage decides which screens that editor reaches." (`no-claim`.) Cut: `f:gh73p5`
  (the flag counts only as `1` or boolean `true`, so a `true` string reads as unset: the parsing
  rule is the same on the enabling side and the refusing side, so it changes no reviewer's
  decision), `f:rv9gdc` (the example site's member dev wiring loads by dynamic import from the
  `__CAIRN_DEV_BUILD__` branch: example-site wiring that repeats the closure `f:irs7fg` already
  states in this section).

### 7. Access map coverage

- **Takes:** An access map narrows only the targets it names, so a screen or concept the map never
  mentions stays reachable to any editor-capability session. (`f:vqh4a9`)
- **Draws on:** `f:vqh4a9` (`canReach` is the one function deciding route enforcement and nav
  visibility, so the two cannot drift; the `editors` roster screen stays owner-only whatever the map
  says; link `docs/reference/core.md`, "`canReach`, `hasAccessRule`"); `f:cvv6to` (every engine
  write action gates through the map against one target, the concept id or the fixed screen
  `media`, `nav`, `settings`, or `vocabulary`, and an unmapped target admits any editor-capability
  session; one sentence, not the itemized action list, and the exceptions stay in the Limits
  subsection); `f:4q8kin` (a site's own action that opts into the map reads the other way,
  fail-closed at three ordered gates: no rule refuses, a role absent from the rule refuses except
  owner capability, and `ownerOnly` refuses a non-owner; the sentence's point is the contrast,
  engine screens open by default and opted-in site routes closed by default; link
  `docs/reference/sveltekit.md`, "`createAdminAction`").
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
- **Hand-off:** "An editor's reach also includes the markup they write, which every visitor's
  browser renders, and Render safety covers what the engine does with it." (`no-claim`; the
  register read's wording.) It is the section's last sentence, after the allowlist subsection. The
  round-2 register note on the render lead-in's equivocation is met by this turn carrying the move
  and section 8 opening on its claim; the resolution run found the turn missing, which is why it
  is fixed here word for word.

### 8. Render safety

- **Takes:** Every renderer that `createRenderer` builds runs a sanitize floor by default, seeded
  from GitHub's `defaultSchema`, before the `build()` dispatch or any later stage touches the tree.
  (`f:z3a58a`)
- **The second sentence, fixed** (the third structural read's blocking finding: `build()` was used
  as a known term here, three more times in this section, and once in The site's responsibilities,
  with no sentence on the page saying what one is): "A `build()` is the function a site registers
  for one of its own components, site-developer code that the dispatch stage runs to turn each use
  of that component in the markdown into markup." It cites `f:21by9u`, whose "registered `build()`
  component" and source comment ("running site-developer code") carry the registration and the
  trust, with `f:zzbzo8`, whose dispatch stage runs it; `build()` is rendered as a link to
  `docs/reference/core.md`, "`defineComponent`", the entry that states the function's contract (a
  hast `Element`, returned synchronously, once per rendered directive occurrence). The sentence
  names no other identifier in a code span, since neither cited bullet contains `defineComponent`
  and `check:provenance` matches a code-span identifier against the cited bullets; the entry is
  reached through the link. It sits directly after the first sentence and ahead of the nine-stage
  list, so the reader meets the term, its definition, and then its position in the order, and the
  first sentence keeps its claim and its floor-before-dispatch position, the section's load-bearing
  one. The drafter changes only the link syntax.
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
- **Hand-off:** "An editor's edits reach the repository through the engine's own credential, and
  The GitHub App's reach sets out what that credential can write." (`no-claim`.) Cut again, as the
  pilot cut it: `f:r0cv6e` (when the floor shipped is the outline's sixth out-of-scope item; the
  page states the floor as it stands, and no published page records the date, as the introduction
  entry above sets out).

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
- **Hand-off:** "Every defense of the built-in design assumes cairn's own sign-in, and a site that
  replaces it with an identity gate or adds an auth channel moves some of them." (`no-claim`.) This
  is the group turn, the one both round-2 reads named as the costliest loss: it is the only body
  sentence that marks the move from the built-in design to the seams a site replaces, and "the
  built-in design" names the group paragraph 3 of the introduction defines, so the turn refers by
  name and not by position.

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
  `Max-Age` ends; the login-moment rotation never runs, because confirm is a 404); the `identity`
  clause of `f:8xxe3b`, cited here a second time after its magic-link half in section 3 (a cairn
  logout under `identity` skips the session-row delete, still clears every cookie, and redirects
  to the gate's `logoutUrl`); the identity half of `f:n3k03a` (every refusal the resolver produces
  logs `guard.refused` with reason `identity`, and a proven email that matches no roster row logs
  `auth.identity.unknown`).
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
- **Hand-off:** "Replace magic links with Cloudflare Access sets up the gate these risks belong to,
  and the other seam a site can add, an auth channel, has a threat surface of its own." (`no-claim`;
  the first clause links `docs/extend/replace-magic-links-with-cloudflare-access.md`, as both
  round-2 reads asked, and the closing phrase links the heading The auth channel's threat surface.)
  The channel clause claims nothing about what a channel does, since the only fact for "signs the
  site's members in" is `f:8u4iiv`, whose support the earlier fact read called indirect.

### 11. The auth channel's threat surface

- **Takes:** An auth channel's sign-in form takes a contact from an unauthenticated caller, so the
  channel rests on the rule that no control keyed on the victim's identity may deny, delay, or
  destroy anything, and denial keys only on the requester. (`f:pjjo64`; the round-2 register
  rewrite. The channel itself was introduced in section 6, so this sentence states the rule the
  channel rests on, not what a channel is, and restates nothing.)
- **Draws on:** `f:pjjo64` (an identity-keyed control either escalates through a channel the site
  can act on or only logs). The rule's three instances, as a short list under a lead-in that cites
  `f:pjjo64` (the round-1 drafter found one sentence became a semicolon chain): `f:7idpoq`
  (escalation answers `challenge-required`, a retry invitation and never a hard failure, and a
  failed challenge on an escalated action answers it again), `f:k6u4g2` (eviction keys on the
  requester's own bucket, so a caller crowds out only its own pending rows), `f:e0imm6` (the spend
  ceiling never denies; crossing it logs `auth.channel.ceiling_exceeded` at error to alert the
  operator). The origin check: `f:wu8x70` (every action asserts the request's `Origin` matches the
  site's origin and the connection is https, except on a local development host, before any code,
  budget, or session logic runs, and either failure throws a plain 403 with no wire result) with
  `f:8u4iiv` (the channel keeps its own check because SvelteKit's origin check does not run under
  `vite dev` and admits any origin listed in `csrf.trustedOrigins`, and the guard adds no `Origin`
  check of its own on any route). Hashing: `f:fslodf` (identity correlates through a salted hash of the subject,
  prefixed `s:`, when a roster lookup resolved one, or of the contact, prefixed `c:`, otherwise,
  and the logs carry only the first 16 hex characters, never the raw contact) with `f:dipwmx` (the
  prefixes keep a subject-derived identity from colliding with a contact-derived one, and the
  per-deployment salt, provisioned on first use, keeps the hash from reversing against a small
  contact space). Code generation: `f:plcf5v` (a numeric code is drawn by rejection sampling over
  Web Crypto random bytes, which avoids the low-end bias a naive modulo introduces) with `f:s047l1`
  (NIST SP 800-63B requires the secrets behind authenticators to come from an approved random bit
  generator; link https://pages.nist.gov/800-63-3/sp800-63b.html). Each pair may be two sentences
  where one sentence would chain.
- **Limits of the auth channel:** `f:wuwk2q` (a dev transport that prints a code to the console is
  a roster oracle by construction, since delivery runs only for a known subject, so an
  unauthenticated caller learns whether a contact is on the roster without guessing a code; the
  same transport in a deployed Worker with observability on lands plaintext codes in Workers Logs;
  no such transport ships in engine code, and the hazard is one a site's `deliver` could introduce).
- **Hand-off:** "Add a second sign-in group builds a channel, and Config obligations states what
  each supplied function owes." (`no-claim`; links `docs/extend/add-a-second-sign-in-group.md` and
  the "Config obligations" heading of `docs/reference/auth-channel.md`, as both round-2 reads
  asked.) Subordinated: `f:ez788q` (the `normalize`, `lookup`, and `challenge` obligations; stated
  in full under "Config obligations" in `docs/reference/auth-channel.md`), `f:j254i8` (the
  challenge runs before any mint on `request` and once escalated on `confirm`, charging and
  consuming nothing; stated in the `challenge` bullet under `createAuthChannel` in
  `docs/reference/auth-channel.md`). Cut: `f:2w1yrc` (the rule's design history from three review
  rounds; the page states the rule as it is, and
  `docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md` holds the history),
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
  re-citing the fact its section placed. The round-2 page carried three items the accepted plan's
  enumeration left out though its own rule implies them (the drafter asked the conductor to
  reconcile the plan); they are in place below, so the list and the rule agree: the setup command's
  first sign-in link and any hand-seeded recovery row treated as unbound (`f:an087n`); every route
  served over https, so a `__Host-` cookie minted outside `/admin` is not discarded (`f:g22dnw`);
  the mounted guard, which adds the double-submit token on every unsafe `/admin` form post
  (`f:7rehzh`); `'*'` and `'null'` kept out of `csrf.trustedOrigins` (`f:ytwrgp`, `f:3cekcy`);
  `Referrer-Policy: no-referrer` off the site-wide default (`f:ix10bm`); SvelteKit's `csp` option
  when the site wants a Content-Security-Policy (`f:72xplg`); `loginLoad`, `confirmLoad`, and the admin shell load mounted under `/admin`, where
  the guard's headers apply (`f:horkxq`); dev transports and the `CAIRN_DEV_BACKEND` flag out of a
  deployed Worker, with a refusal inside any dev-shaped transport (`f:irs7fg`); an exhaustive map
  when the site intends an allowlist (`f:ji8xa0`, `f:8ciz2s`); the tidy and dictionary actions on a
  route carrying a `concept` parameter (`f:arr13a`); every `sanitizeSchema` callback starting from
  the schema it receives (`f:2fwybn`); `unsafeDisableSanitize` unset (`f:r7sbt1`); the output of
  every registered `build()` reviewed (`f:21by9u`); everything in the App's repository, code
  included, treated as inside the installation token's write reach (`f:l5gx1t`); under `identity`,
  only gate login methods whose email the signing-in user cannot control (`f:33upyd`), and every
  hostname that reaches the Worker behind the gate (`f:jha9f7`); the config obligations when
  building a channel, written with no code span and a link to "Config obligations" in
  `docs/reference/auth-channel.md`, since `f:ez788q` is subordinated and the item must stay
  `no-claim`.
- **Hand-off:** None; Related resources follows as the anatomy's ending.

### 13. Related resources

The anatomy's ending, grouped as the register asks, not more than 3 to 5 links a group.

- **Takes:** The following resources cover the tasks, the system, and the standards behind these
  defenses. (`no-claim`; each group's list is introduced by a complete sentence)
- **How-to guides** (five): `docs/extend/restrict-admin-access.md` (the access map),
  `docs/extend/replace-magic-links-with-cloudflare-access.md` (an identity gate),
  `docs/extend/add-a-second-sign-in-group.md` (an auth channel),
  `docs/extend/configure-rendering.md` (the renderer's options),
  `docs/extend/rotate-the-github-app-key.md` (the App's private key).
- **Concepts** (one): `docs/extend/architecture.md` (how the engine's parts and seams fit
  together). Migration notes left this group on the third structural read's advisory:
  `docs/extend/migration-notes.md` is a per-version record, not a concept page; its gloss, "for
  when the access-map warning shipped", pointed at release history, the subject paragraph 4 of the
  introduction leaves out; and the inbound link from `docs/extend/migration-notes.md:370` to the
  allowlist heading needs no reciprocal link. The register's 3 to 5 is a ceiling, and no other
  concept page the extend outline names bears on this subject, so the group holds one link. The
  earlier revisions narrowed that gloss to the access-map warning alone because the file records the
  `config.access_unmapped` warning under 0.97.0 at `:365-370` and nothing about the sanitize floor;
  that finding is why the round-2 structural rewrite could not land, and the introduction's
  doesn't-cover entry keeps it.
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
fact; each named entry was opened and read before it was named, and re-read at this revision.

| Fact | Disposition | Section, or reason |
| --- | --- | --- |
| `f:v85shm` | placed | Introduction (paragraph 1, sentences 2 and 3; owner ruling) |
| `f:u77pea` | placed | Introduction (paragraph 5, the definition) |
| `f:y3ljm0` | placed | Introduction (paragraph 6, the floor sentence and the restored sentence) |
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
| `f:an087n` | placed | Browser binding for sign-in (Limits; re-cited in The site's responsibilities) |
| `f:678law` | placed | Browser binding for sign-in (Limits) |
| `f:9uhscf` | subordinated | `docs/reference/sveltekit.md`, "`NO_PENDING_REQUEST_ERROR`": states the constant, its wire value, and that a site's own login page branches on it |
| `f:9pmipf` | subordinated | `docs/reference/sveltekit.md`, "`NO_PENDING_REQUEST_ERROR`": states the code and that it is distinct from `expired`; the entry states the cookie-less condition narrower than the code (bound rows only), filed as reference-arm friction |
| `f:uz38ef` | cut | The rebind `UPDATE`'s race behavior against the consuming `DELETE`: statement-level detail below either reader's decision, and no reference entry carries the magic-token store |
| `f:wzcgs3` | placed | The session cookie |
| `f:g22dnw` | placed | The session cookie (body and its Limits; re-cited in The site's responsibilities) |
| `f:8xxe3b` | placed | The session cookie (the magic-link logout; its `identity` clause is cited again from Identity mode's threat surface) |
| `f:njh87y` | subordinated | `docs/reference/auth-crypto.md`, "`buildCookieName`": "The engine's own two cookies derive `secure` the same way"; the logout half is on the page through `f:8xxe3b` |
| `f:gncd64` | cut | Rejected in the container: SvelteKit 3 removed `csrf.checkOrigin`, so a site sets no `csrf` config and the guard restores no Origin check; f:7rehzh and f:3cekcy state the current division of the CSRF work |
| `f:7rehzh` | placed | CSRF protection (re-cited in The site's responsibilities) |
| `f:x2stjk` | placed | CSRF protection |
| `f:ix10bm` | placed | CSRF protection (body and its Limits) |
| `f:3cekcy` | placed | CSRF protection (body and its Limits; re-cited in The site's responsibilities) |
| `f:ytwrgp` | placed | CSRF protection (Limits; re-cited in The site's responsibilities) |
| `f:keuj8l` | placed | CSRF protection |
| `f:9ik061` | placed | CSRF protection |
| `f:0vofop` | placed | CSRF protection |
| `f:qbfriw` | placed | CSRF protection (Limits) |
| `f:doq8s2` | subordinated | `docs/reference/log-events.md`, the `guard.refused` row: states the header-versus-field witness rule, the empty-header case, and the `detail` values in full |
| `f:d2jumm` | cut | Rejected in the container: SvelteKit 3 removed `csrf.checkOrigin`, so the handoff it describes is gone; the page states the removal through f:3cekcy and links docs/reference/supported-toolchain.md, The `checkOrigin` removal |
| `f:9exogy` | cut | A re-authentication in one tab rotating the CSRF value under another tab's form is a usability consequence (one 403 a reload clears) with no security residual, and moot under `identity` |
| `f:7qqhda` | placed | The auth guard (also cited by the introduction's definition sentence that names the guard, paragraph 5) |
| `f:n3k03a` | placed | The auth guard (its identity half is cited again from Identity mode's threat surface, and its https-help-page condition from The session cookie's Limits) |
| `f:ubuj1w` | placed | The auth guard (also cited in CSRF protection's body for the admin's `strict-origin` policy and its meta tag) |
| `f:hl5asm` | placed | CSRF protection (why `strict-origin` on admin responses, and the per-view meta tag against a site-wide `no-referrer`) |
| `f:yzbvk4` | placed | The auth guard (Limits) |
| `f:72xplg` | placed | The auth guard (Limits; re-cited in The site's responsibilities) |
| `f:horkxq` | placed | The auth guard (Limits; re-cited in The site's responsibilities) |
| `f:t976f1` | subordinated | `docs/reference/sveltekit.md`, "`createAuthGuard`", the `config.includeSubDomains` paragraph: states that the rejection pages and the login redirect send no `Strict-Transport-Security` and why |
| `f:tkpmxr` | placed | The dev-backend flag's two refusals |
| `f:i2udr5` | placed | The dev-backend flag's two refusals (the last sentence of the channel's list item) |
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
| `f:zzbzo8` | placed | Render safety (the nine-stage list; also cited by the fixed second sentence that says what a `build()` is) |
| `f:296ar7` | placed | Render safety |
| `f:q9yndd` | placed | Render safety |
| `f:3yzqup` | placed | Render safety |
| `f:gi3keo` | placed | Render safety |
| `f:2fwybn` | placed | Render safety (Limits) |
| `f:r7sbt1` | placed | Render safety (Limits) |
| `f:wgovy6` | placed | Render safety (Limits) |
| `f:21by9u` | placed | Render safety (Limits; also cited by the fixed second sentence that says what a `build()` is, and re-cited in The site's responsibilities) |
| `f:r0cv6e` | cut | When the sanitize floor shipped is the outline's sixth out-of-scope item, so the page states the floor as it stands (the pilot's cut, kept). No published page records the date: `docs/extend/migration-notes.md` starts at 0.86.0 and `CHANGELOG.md` at 0.22.0, while the floor shipped in v0.17.0 (git `40d466ad`), so the reason names no record, and the gap is filed in `docs/internal/docs-friction-log.md` |
| `f:kkp5bi` | placed | The GitHub App's reach |
| `f:gglwt4` | placed | The GitHub App's reach (first sentence and Limits) |
| `f:l5gx1t` | placed | The GitHub App's reach (Limits) |
| `f:fhit7f` | placed | Identity mode's threat surface (paragraph 6's hand-off sentence may cite it too) |
| `f:2glcaf` | placed | Identity mode's threat surface |
| `f:8rnym5` | placed | Identity mode's threat surface |
| `f:emrebl` | placed | Identity mode's threat surface (Limits) |
| `f:33upyd` | placed | Identity mode's threat surface (Limits) |
| `f:jha9f7` | placed | Identity mode's threat surface (Limits) |
| `f:diro7m` | cut | `hasSession` on a CSRF-refusal log record being always `false` under `identity` is a log-field detail with no decision behind it (the pilot's cut, kept) |
| `f:pjjo64` | placed | The auth channel's threat surface |
| `f:7idpoq` | placed | The auth channel's threat surface (the three-instances list) |
| `f:k6u4g2` | placed | The auth channel's threat surface (the three-instances list) |
| `f:e0imm6` | placed | The auth channel's threat surface (the three-instances list) |
| `f:wu8x70` | placed | The auth channel's threat surface (the origin check) |
| `f:8u4iiv` | placed | The auth channel's threat surface (the origin check) |
| `f:2sd4if` | placed | The dev-backend flag's two refusals (the channel's introduction: the guard gates the `/admin` subtree, so its admin-path handling never covers a site's member routes) |
| `f:fslodf` | placed | The auth channel's threat surface (hashing; its roster-lookup clause is cited again from The dev-backend flag's two refusals, where the channel is introduced) |
| `f:dipwmx` | placed | The auth channel's threat surface (hashing) |
| `f:plcf5v` | placed | The auth channel's threat surface (code generation) |
| `f:s047l1` | placed | The auth channel's threat surface (code generation; the external link) |
| `f:wuwk2q` | placed | The auth channel's threat surface (Limits; its printing transport is cited again from The dev-backend flag's two refusals as the definition of a dev transport) |
| `f:ez788q` | subordinated | `docs/reference/auth-channel.md`, "Config obligations": states the `normalize`, `lookup`, and `challenge` obligations in full |
| `f:j254i8` | subordinated | `docs/reference/auth-channel.md`, "`createAuthChannel`", the `challenge` bullet: states that the challenge is awaited before any code is minted on `request` and on an escalated `confirm`, and that a failure writes no row, charges no attempt, and consumes nothing |
| `f:2w1yrc` | cut | The rule's design history (three review rounds that failed on the same move) is history, not a defense or a residual; the page states the rule as it is and `docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md` holds the history |
| `f:d2j9cj` | cut | The example site's capture transport answering the same roster oracle, and its six demo contacts, is an example-site instance of the hazard `f:wuwk2q` states |
| `f:jud805` | cut | The absence of a pre-deploy check for migration `0004` is an operational gap for the admin track, not a defense or a residual of the binding (the pilot's cut, kept) |

## Rework-record round-2 blocking findings (2026-10-01), disposed

| Finding (seat, committed line) | Disposition |
| --- | --- |
| Structural, `:3`: the introduction never names the areas the page assesses; the attacker framing omits the channel's anonymous caller | Applies. Paragraph 3 names the areas in page order as two groups and names the channel's caller; Geoff's sentences stay |
| Structural, `:421`: the dev-backend section sits about 240 lines after the guard step that names it; Log contents sits mid-page; the grouping is unstated | Applies, with one change. Section 6 follows section 5 directly; the built-in-then-replaced grouping is stated in paragraph 3; the logs claim becomes one sentence in section 1 rather than a section moved to the end |
| Register, `:16-20`: the default-identity sentence was rewritten and grew a restatement tell | Applies. Paragraph 6 (paragraph 5 before the second read's split) restores the original sentence verbatim |
| Register, `:29-30`: the magic-link lead-in restates the anonymous surface and contradicts the introduction | Disposed by the plan. The sentence is dropped; section 1 opens on its claim |
| Register, `:58-61`: the browser-binding lead-in restates its own second sentence | Applies. Section 2's first sentence is the finding's rewrite |
| Register, `:365-368`: the channel lead-in previews the sentence that follows | Applies. Section 11's first sentence is the finding's rewrite |
| Register, `:129-130`: the CSRF lead-in is a non-sequitur | Applies. Section 4's first sentence is the finding's rewrite |

Non-blocking round-2 findings this plan takes: the out-of-scope pages named (paragraph 4); a
Limits subsection on both seam sections; the render lead-in's equivocation (section 7's hand-off
carries the turn, section 8 opens on its claim); the GitHub lead-in's scope (section 9 opens on
`f:gglwt4`); the roughly 100-column wrap on every line.

## Resolution-run round-2 blocking findings (2026-10-03), disposed

The page these findings grade was drafted from the accepted version of this plan
(`docs/extend/security-model.md` at commit `2aacb280`). Each row names the plan change that
answers it, and the plan changes nothing else.

| Finding (seat, page line) | Disposition |
| --- | --- |
| Structural, `:16-20`: the doesn't-cover list names five of the outline's six out-of-scope items and leaves out the sanitize floor's history; the Concepts gloss for Migration notes names only the access-map warning | Applies, with one correction. Paragraph 4 closes on the sixth item as a subject-stated sentence. The rewrite's claim that Migration notes records when the floor shipped cannot land, since no published page does (the file starts at 0.86.0, the floor shipped in v0.17.0); the sentence names no page, the Concepts gloss keeps the access-map warning alone (the third structural read later dropped the Concepts link itself; see the fifth table), and the gap is filed as friction |
| Structural, `:338-342`: every planned hand-off is missing, the built-in-to-seams turn above all, and the seam sections lost their setup links | Applies. "Hand-offs" fixes the rule: each section's last sentence, after the Limits content, word for word per section; the group turn closes section 9; sections 10 and 11 end on their setup links |
| Register, every section end: none of the plan's hand-offs made the draft, so the page still reads as atoms; the turn should sit just before the Limits heading | Applies, with the placement decided the other way. The turns are restored word for word; "Hand-offs" places them after the Limits content and records why, and the form rule (opens on the residual, closes on the named target, no restatement) answers the seat's reason for placing them earlier |
| Register, `:16-20`: "Configuring each defense and seam belongs to the how-to guides" is an overstated universal and a five-link inventory in prose | Applies. Paragraph 4 carries the finding's two-sentence rewrite verbatim, each guide paired with its subject |

Plan corrections the round-2 drafter asked the conductor for, taken here: the cut reason for
`f:r0cv6e` no longer names `docs/extend/migration-notes.md` as the record of when the floor shipped
(the round-2 fact read found none there); section 12's list now carries the three residual items
its own rule implied and the page already had (`f:an087n`, `f:g22dnw`, `f:horkxq`), in page order;
the Concepts gloss for Migration notes names only the access-map warning (a gloss the third
structural read later removed with its link). The hand-off lines for sections 1 to 11 are the
plan's text the page must carry, not a record of the page as drafted.

Round-2 advisories this revision leaves to the drafter's scoped redraft, since no blocking finding
requires them: the `f:cvv6to` sentence stating the gate in one sentence with the exceptions left to
the Limits subsection (section 7's **Draws on** already says so); the inline link to SvelteKit's
`csrf` option on the "SvelteKit's default check" sentence (section 4 already names it); citing
`f:kkp5bi` beside `f:gglwt4` on section 9's first sentence (the notes below allow a two-id
sentence).

## Structural edit findings on this plan (2026-10-03), disposed

The structural edit read this plan before any prose existed and returned fix: one blocking
finding and four advisories, with `npm run check:vale` at 0 errors. Each row names the plan change
that answers it; the plan changes nothing else.

| Finding (plan line) | Disposition |
| --- | --- |
| Blocking, `:182`: the guard is used as a known term in introduction paragraph 3, section 3's Limits, and section 4's first sentence, and nothing says what it is before section 5; the definition paragraph named `createAuthGuard` only as the `identity` option's home | Applies. Paragraph 5 defines the guard in one sentence citing `f:7qqhda`, linking the heading The auth guard and the `createAuthGuard` reference entry, ahead of the `identity` hand-off; the covers sentence in paragraph 3 names "the admin response headers", so the introduction uses no term before its definition; section 5 keeps its first sentence, which the definition sentence does not restate |
| Advisory, `:209`: the third doesn't-cover sentence, "the floor is described here as it stands", points at the page itself | Taken. The sentence is the subject alone, "When the sanitize floor shipped is release history."; the rationale for naming no page stands |
| Advisory, `:371`: section 5's Limits refers to the sanitize floor by section number | Taken. The reference is "the sanitize floor Render safety describes", rendered as a link, per the hand-off form rule |
| Advisory, `:306`: section 3 carries the `identity` clause of `f:8xxe3b` before identity mode is introduced | Taken. Section 3 keeps the magic-link logout; section 10 cites `f:8xxe3b` a second time for the `identity` clause, and the dispositions table records both |
| Advisory, `:178`: one paragraph carries covers, prior knowledge, and three doesn't-cover sentences with five links | Taken. Paragraph 3 carries covers and prior knowledge, paragraph 4 the doesn't-cover sentences; the definition became paragraph 5 and the platform link paragraph 6, renumbered again by the second read's split below (the definition is paragraphs 5 and 6, the platform link paragraph 7) |

## Second structural edit findings on this plan (2026-10-03), disposed

The second read of this plan
(`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-2-record.md`,
"### security-model") returned fix: one blocking finding and two advisories, with
`npm run check:vale` at 0 errors, and the order, the introduction's three parts, the cross-links,
and the module types passed. Geoff's ruling for the targeted close: keep everything the reads
passed and close both concept-before-definition findings, the guard and the channel. Each row
names the plan change that answers it; the plan changes nothing else.

| Finding (plan line) | Disposition |
| --- | --- |
| Blocking, `:262`: the plan claimed no section before 11 depends on the auth channel, and section 6 does (`createAuthChannel`, a dev transport, `deliver` and `lookup`), with only paragraph 3's covers gloss before it | Applies. The claim is gone from paragraph 6. Section 6 introduces the channel where the page first depends on it, in two fixed sentences ahead of the second refusal, linked to The auth channel's threat surface and to `docs/reference/auth-channel.md`, citing `f:tkpmxr`, `f:8u4iiv`, `f:irs7fg`, and `f:fslodf`, and the refusal sentence defines a dev transport from `f:wuwk2q`; the read's alternative, moving the channel half of `f:tkpmxr` and the transport half of `f:irs7fg` to section 11, is declined for the reason recorded under section 6 |
| Advisory, `:250`: no planned sentence carries the outline's "floors, not ceilings"; the restored sentence only implies it | Taken. Paragraph 6 opens on "The defaults are floors, not ceilings.", citing `f:y3ljm0`, ahead of the restored sentence, and the plan records why the pair is not a restatement |
| Advisory, `:244`: the definition paragraph holds four duties (the store, the restored sentence, the guard with two links, the `identity` hand-off) | Taken, as the read suggested. Paragraph 5 holds the store and the guard; paragraph 6 the floor, the restored sentence, and the hand-off; the platform link is paragraph 7, and every paragraph reference in this plan is renumbered |

## Third structural edit findings on this plan (2026-10-03), disposed

The third read of this plan, on the targeted close's revision, returned fix: one blocking finding
and three advisories, with `npm run check:vale` at 0 errors. The order and its stated grouping,
the introduction's three parts, the guard's and the channel's introductions, the four cross-links,
the concept anatomy, and the module types passed, and this revision changes none of them. Each row
names the plan change that answers it; the plan changes nothing else.

| Finding (plan line) | Disposition |
| --- | --- |
| Blocking, `:541`: Render safety's first sentence uses "the `build()` dispatch" as a known term, the section builds on `build()` three more times and the responsibilities list once, and no sentence says what a `build()` is | Applies. Section 8's second sentence, fixed text, says a `build()` is the function a site registers for one of its components, site-developer code the dispatch stage runs, citing `f:21by9u` and `f:zzbzo8` and linking `docs/reference/core.md`, "`defineComponent`"; the first sentence keeps its claim and its floor-before-dispatch position, and the definition follows it directly, ahead of the nine-stage list |
| Advisory, `:373`: the session cookie's Limits rests on "the guard's https help page", which section 5 first explains | Taken. The clause reads "since the guard answers a plain-http request with its help page only on an `/admin` path", citing `f:g22dnw` with `f:n3k03a` |
| Advisory, `:453`: section 6 carries the guard's refusal, the channel's two introducing sentences, the channel's refusal, the dev-transport definition, the deployed-detection rule, and a three-case Limits in one stretch | Taken, as the read suggested. The two refusals are a two-item list under the first sentence, the channel's introduction and refusal in the second item with the deployed-detection rule as its last sentence; no sentence is reordered or reworded |
| Advisory, `:721`: the Concepts group lists `docs/extend/migration-notes.md` for release history, the subject the introduction's paragraph 4 leaves out, and a per-version record is not a concept page | Taken. Migration notes leaves the Concepts group, which holds `docs/extend/architecture.md` alone under the register's ceiling; the introduction's paragraph 4 entry and the round-2 tables record the drop |

## R4 fix round (2026-10-07)

- Fact `f:x2stjk` retext: adds `strict-origin` to the https-to-http downgrade clause, read 2026-10-07.
- Fact `f:hl5asm` filed (`[verified]`): why `strict-origin` on admin responses and the per-view meta.
- Section 4: opening sentence split in two; the SvelteKit-check/token-check sentence split in two.
- Section 4: the `checkOrigin` removal sentence moved ahead of the Fetch Standard sentence.
- Section 4: the `strict-origin` sentence pair replaced by two sentences citing `f:hl5asm`.
- Section 4 Limits: the `strict-origin` sentence split in two, citing `f:3cekcy` as well; the
  `trustedOrigins` warning sentence names `cairn doctor` and SvelteKit's check (`f:ytwrgp`).
- Section 5 Limits: the CSP sentence says "passes ... to the `sveltekit()` call" (`f:72xplg`).
- Section 6: "only from the Worker env" (`f:tkpmxr`); the second-refusal sentence also cites `f:q7fj6p`;
  the channel's own-check sentence reads "and because the guard adds no `Origin` check".
- Section 12: the `trustedOrigins` item reads "since every listed origin passes SvelteKit's check".

## Notes for the drafter

- A sentence that synthesizes two facts cites both ids; the brief accepts an array. The sentences
  this plan marks "with" another fact are the intended multi-id sentences, and each may be two
  sentences where one would chain.
- An anatomy sentence (the introduction's paragraphs 3 and 4, each section's hand-off, the list lead-ins,
  the responsibilities verdict) carries no code span, numeral, version, or date, or it cites a fact.
- A hand-off is the section's last sentence, as its own paragraph after the Limits subsection's
  content (after the allowlist subsection in section 7), word for word from its **Hand-off** line,
  with each heading or page name rendered as a link to that heading or page. No hand-off is
  dropped; one that reads as restating is reported, never deleted.
- A fact placed in one section may be cited again from another sentence that needs it (`f:n3k03a`
  and `f:8xxe3b` from section 10; `f:7qqhda` from paragraph 5 and, optionally, `f:fhit7f` from
  paragraph 6; `f:fslodf` and `f:wuwk2q` from section 6's channel introduction;
  `f:n3k03a` from section 3's Limits gloss; the Limits facts from the responsibilities list).
- Section 6's two channel sentences and its dev-transport clause are fixed text, like each
  section's first sentence and hand-off: the drafter changes only the link syntax. They are the
  page's introduction of the channel, so no earlier sentence names a transport or a site-supplied
  channel function. The section's two refusals are a two-item list under its first sentence; the
  second item carries the two channel sentences, the channel's refusal with its dev-transport
  clause, and then the `f:i2udr5` sentence.
- Section 8's second sentence, the one that says what a `build()` is, is fixed text the same way:
  the drafter changes only the link syntax, and no earlier sentence on the page names `build()`.
- The page edits no other page. The relink pointers in the heading-policy table belong to the
  relink pass; `docs/extend/migration-notes.md:370` already resolves.
- Every link to a page this plan names in a code span becomes a relative Markdown link on the
  page; the five how-to guides are forward links the link gate accepts because the committed
  outline names them.
