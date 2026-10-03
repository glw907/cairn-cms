# Page plan: `docs/extend/replace-magic-links-with-cloudflare-access.md`

Agent-facing, committed beside the brief at
`docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.json`. Written 2026-10-03
by the plan step of the docs page chain (stage 2a, task 7c) for the task 7b resolution run, and
revised the same day on the structural edit's findings (one blocking, on the failure path's
step order; two advisory, on the introduction's prior-knowledge paragraph and the placement of
the "read instead" redirects; all three taken, mapped in the table "Structural edit findings,
disposed"). The drafter drafts from this plan: it is the source of the page's order, each
section's claim, and each fact's placement. The structural edit seat reads it before any prose
exists. Method: Google Technical Writing Two, "Organizing large documents"
(https://developers.google.com/tech-writing/two/large-docs), the outline as the document's
narrative, with information introduced where it is most relevant to the reader; the page type's
anatomy is the task guide in `docs/internal/docs-register.md`, "The page anatomies".

Page type: task guide. Job (`docs/internal/outlines/extend.json`, slug
`replace-magic-links-with-cloudflare-access`): replace the magic link with your organization's
identity provider by putting Cloudflare Access in front of `/admin` and writing the resolver that
turns its token into a roster email, for a Svelte-fluent web developer building an organization's
site on cairn's seams.

Inputs read: the page's entry and the owner rulings in
`docs/superpowers/research/2026-09-30-draft-docs-2a-pilot-job-read.md`; the page's round-2
findings and the `/healthz` note under "Not conflicts" in
`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`;
`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`; the committed page at
`bbfb6788`; every fact bullet named below in `docs/internal/facts/extend.md`,
`docs/internal/facts/front-door.md`, `docs/internal/facts/admin.md`, and
`docs/internal/facts/reference.md`; the reference entries named in the dispositions table, each
opened before it was named; the two exemplars,
`/var/home/glw907/.local/share/cairn/exemplars/extenders/sveltekit-hooks/page.md` (the handle
section's locals contract, and the security trap stated in the same paragraph as the value that
invites the misuse) and
`/var/home/glw907/.local/share/cairn/exemplars/extenders/sanity-custom-tool/page.md` (the early
"right tool for the job?" callout).

## What binds this plan

- **Anatomy** (task guide): an introduction that states the task, when and why, who for, and the
  page to read instead, with a one-line contract as its first sentence, in Google's three parts;
  preconditions, each with a link to what produces it; steps as numbered lists, one action a
  step, the location named before the action, a one-step procedure as a single bullet; a
  verification section headed with a bare infinitive that names the observable result; failure
  paths that point at `docs/extend/debug-your-site.md`; a see-also section that does not repeat
  the recovery link. Explanation stays subordinate to the steps and opens with a sentence tying it
  to the task.
- **Exemplar takes.** The Sanity "right tool?" callout becomes the first section, the
  all-or-nothing switch and the plan cap that decides whether to stay on magic links; the one
  "read instead" redirect among the reasons to stay, a site that wants only a different sign-in
  email, sits in the introduction with the other wrong-place sentences, the slot the anatomy
  gives it (the structural edit's advisory). The SvelteKit hooks take places each
  security trap in the paragraph that states the value inviting the misuse: the login-methods
  step carries the self-asserted-email trap, the preview-URLs step carries the no-hostname-check
  trap, and the CORS step carries the `X-Cairn-CSRF` trap.
- **Owner rulings (Geoff, 2026-10-01).** Every page gets an introduction per the anatomy; a task
  guide's contract alone is not one. A plan may push a fact off the page, subordinated to a named
  reference entry or cut with a reason, never dropped.
- **Round-2 findings** (`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`,
  "### replace-magic-links-with-cloudflare-access"): the one blocking finding applies where this
  plan keeps the sentence it cites; a finding on a sentence this plan drops is disposed here. The
  table near the end maps every finding.
- **The diagnosis** (`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`):
  the committed page reads as atoms. This plan decides what the page argues, which facts carry
  the argument, and which are detail the reference already holds.

## What the page argues, and the order it needs

The page argues one thing: under `identity`, cairn hands the whole of sign-in to the gate and
keeps only the roster lookup, so the task is making two admission lists agree on one string, the
email the resolver returns, and making the gate the only way to reach `/admin`. Everything the
reader does falls under that argument. The roster must hold the exact address the provider will
assert, because the guard looks the string up with no cross-check (f:emrebl, f:g0206o). The Access
application must cover every admin path, and every hostname that bypasses it must be closed,
because the guard makes no hostname check of its own (f:vnm1p5, f:jha9f7). The verifier must turn
the gate's token into that email and nothing else, because cairn ships no verifier and checks
none (f:lyaf6p, f:hilyos). The wiring is one option, because the guard stays a plain `Handle`
(f:dwc4kp). Verification and recovery read the two log records the guard leaves when either list
refuses (f:sbv5xj, f:fu4uis, f:hilyos).

The order follows the dependency between those parts, and each section hands the next its input:

1. **Decide whether to switch**, first, because the switch is all-or-nothing and the free plan
   caps who can use it, so a reader who would rather stay on magic links learns it before any
   step (the Sanity take). The reader who only wants a different sign-in email is already
   redirected by the introduction's wrong-place sentences.
2. **Before you begin**, the preconditions: a magic-link site, its first owner's row, a Zero Trust
   team with the provider connected. The owner row is a precondition rather than a step, since
   identity mode cannot create it and a running magic-link site already has it (f:qhmydf).
3. **Prepare the roster**, the cairn half of the join, before any Cloudflare work. A roster
   mismatch locks an editor out the moment the gate goes live (f:g0206o), and fixing it needs no
   Zero Trust change, so checking it first leaves the gate as the only new variable at go-live.
   The section also states the join itself, the email string, which the verifier's requirements
   rest on three sections later.
4. **Create the Access application**, which ends with the reader holding the three values the
   verifier needs: the team domain, the AUD tag, and the logout address. The round-2 pacing finding
   (the config module asked for values the page had not yet located) is disposed by adding the
   step that collects them here.
5. **Write the verifier**, which consumes those three values. Its requirements, the log-level rule
   included, precede the sample, so the sample can be read against them; the sample maps
   `jose`'s error codes to the reasons the guard logs at error, which disposes the round-2
   logical-order finding.
6. **Wire the resolver into the guard**, one option in the hooks file, followed by what changes
   once it is set, as explanation tied to the step: the per-request resolve, the session lifetime
   that now belongs to the gate, and a sign-out that ends at the gate.
7. **Verify the gate**, every check by hand, since no tool checks the login redirect or the
   `workers.dev` exposure (f:iaqcq6).
8. **Resolve a refused sign-in**, opening on the one refusal a reader recognizes without a log
   read (the stale-tab sign-out), then keyed on the two records and every refusal reason the
   guard distinguishes, the request-shaped reasons included, pointing at
   `docs/extend/debug-your-site.md` when the steps run out.
9. **See also**, the anatomy's ending.

### Departures from the outline's cover order, with the reason for each

1. **"Before you switch" becomes three sections and one introduction sentence.** The
   all-or-nothing replacement and the free-plan cap are decision inputs, so they open the page
   (the Sanity take); the redirect for a site that wants only a different sign-in email is a
   wrong-place sentence, so it sits in the introduction beside the other two (the anatomy's slot;
   the structural edit's advisory); the seeded owner is a precondition with a producer to link
   (the anatomy's item 2 and the round-2 `:86-89` finding); the roster emails are an action the
   reader performs, so they are the first step section.
2. **"Logout under identity and Access's token lifetime" is no section.** Its facts land where
   each is relevant (Google's lesson): the session lifetime and the sign-out redirect in the wire
   section's explanation of what the option changes (f:2glcaf, f:8xxe3b, f:q0icwk); the
   stateless-validation residual beside the verifier requirement it qualifies (f:fe0dyh); the
   stale-tab refusal as the failure path's first step, where a reader meets it and ahead of every
   log read (f:ig5pn3); and a sign-out check in Verify. This disposes the round-2 finding on a
   noun-phrase heading in a task guide, and the job read's finding that the page ran one step
   into twenty lines of exposition: each explanation now opens on a sentence tying it to its
   step.
3. **"The seam is not Cloudflare-specific" is one sentence in the introduction** (f:3p8yu8), in
   the slot the anatomy gives the reader who may be in the wrong place: a site behind another
   authenticating proxy learns in the first paragraphs that the page serves it and which steps it
   substitutes.
4. **The Access application section collects the verifier's inputs.** A step to note the team
   domain and the logout address joins the AUD-tag step, so the config module step three sections
   later exports values already in hand (the round-2 `:157-158` pacing finding).
5. **The verifier's reason rule precedes the sample, and the sample maps reasons.** f:fu4uis is a
   requirement the sample then meets through a `reasonFor` helper over `jose`'s documented error
   codes, instead of a paragraph after the sample saying a better verifier would (the round-2
   `:199-204` and `:203-204` findings).
6. **The figure shows `/healthz` outside the application** (the outline's `figureNote` and the
   round-1 figure verifier). The fact the drafter lacked, f:paotzb, is added to the inventory by
   this plan as a carried fact, placed in the figure's `accDescr` and caption only.
7. **The caption carries the request's path, not the two-lists sentence.** The two-lists claim
   (f:k40l86) is stated once, as the roster section's first sentence (the round-2 `:44-46, 67-68`
   duplication).

### Heading policy

Every section heading is a task heading, a bare infinitive in sentence case (the register's
structure rules, Google's headings), except "Before you begin" and "See also", the Good Docs
how-to template's own section names. No page links an anchor on this page (grep over `docs/`
finds none), so no heading is fixed by an inbound link; the outline's `crossLinks` reach the page
by file alone. The committed headings "Decide whether to switch", "Prepare the roster", "Create
the Access application", "Write the verifier", "Wire the resolver into the guard", "Verify the
gate", "Resolve a refused sign-in", and "See also" stay. "Logout and session lifetime under
Access" is gone (departure 2). "Before you begin" is new.

## The introduction, in Google's three parts

Four paragraphs under the title, no heading, then the figure. Google's three parts arrive as
statements about the task and the reader's site, never about the page: no sentence opens on the
page or refers to a position (the register's "page describing itself" tell, the round-2 blocking
finding at `:12`).

**Paragraph 1: what the subject covers, and when and why.** The contract is the first sentence:
replace cairn's magic-link sign-in with your organization's identity provider by putting a
Cloudflare Access application in front of `/admin` and giving the guard a resolver that turns the
Access token into a roster email (f:8289h7). Then when and why: a site makes the switch when its
editors already hold accounts in the organization's identity provider, such as Google Workspace or
Microsoft Entra ID, and should sign in to the admin with them (f:gw1oas); Access admits only the
users who match its application's policies and signs them in through the connected provider
(f:agif8l). Then who: the work spans the site's server hooks and the account's Zero Trust
settings, so it takes a developer who can change both (an anatomy sentence, `no-claim`; it carries
no code span, so the round-2 fact-read note on its tag needs no citation, and the drafter may
cite `[f:dwc4kp, f:agif8l]` if a code span enters it).

**Paragraph 2: what prior knowledge the reader has, then the wrong-place sentences.** The
knowledge is stated about the reader, not about the page or the site: the steps assume you have
edited a SvelteKit server hooks file and can read a JWT verification sample closely enough to own
the code it becomes (`no-claim`, no code span; the structural edit's advisory, which found the
earlier paragraph stating the site's state in place of the reader's knowledge). The site's state,
a guard that already signs editors in by magic link, is a precondition, so the page states it
once, as the first bullet under "Before you begin" with its link to
`docs/extend/add-cairn-to-a-sveltekit-app.md`, and not here (the advisory's duplication note; the
round-2 `:12` rewrite sentence moves there whole). Then the wrong-place sentences, three. A site
that wants only a different sign-in email keeps magic links and follows
`docs/extend/add-cairn-to-a-sveltekit-app.md#customize-the-sign-in-email` instead (`no-claim`;
the outline's cross-link, moved here from the decision section on the structural edit's
advisory, so every "read instead" sits in the anatomy's slot). The guard's `identity` option
takes any `IdentityResolver`, so a site behind a different authenticating reverse proxy writes
the same kind of resolver for that proxy's token and substitutes its own gate for the Cloudflare
steps (f:3p8yu8; link `docs/reference/sveltekit.md#identityresolver`). A site that needs a second
population with its own sign-in, beside editors who keep magic links, follows
`docs/extend/add-a-second-sign-in-group.md` instead (`no-claim`).

**Paragraph 3: what the subject does not cover.** Two sentences stated as subjects, each naming
its page: the threat analysis of running the guard with `identity` is "Identity mode's threat
surface" at `docs/extend/security-model.md#identity-modes-threat-surface`; setting up magic-link
sign-in itself is `docs/extend/add-cairn-to-a-sveltekit-app.md`. Both `no-claim`.

**Paragraph 4: the figure**, described below, with its caption.

## The figure

The committed mermaid diagram stays (figure verifier: earns its place) with one addition and a new
caption.

- **Nodes and edges:** browser; the Access application subgraph holding policies and the AUD tag;
  the Worker subgraph holding the guard (which calls `identity.resolve`), the roster lookup by
  email, the admin shell, the preview route, and a new health node. Edges: browser to policies
  for `/admin`; policies to guard carrying `Cf-Access-Jwt-Assertion`; guard to roster to shell;
  browser to preview for `/preview/<token>`; browser to health for `/healthz`, the added edge
  (f:paotzb).
- **`accTitle` and `accDescr`:** the description names every node and edge in order, ending with
  the two routes that reach the Worker without passing the application. It describes the drawing;
  the caption draws the consequence, so the two never share a sentence (the round-2 figure
  verifier's near-duplicate note).
- **Caption,** two sentences, cited: one admin request passes the application's policies, then the
  guard, which verifies the token through `identity.resolve` and looks the proven email up in the
  roster (f:fhit7f); `/preview/<token>` and `/healthz` reach the Worker without passing the
  application (f:vnm1p5, f:paotzb). The caption does not say the two lists never reconcile
  (departure 7).

## Sections, in order

Each entry carries the heading; **Takes**, the one sentence a reader keeps, which is the
section's first sentence on the page; **Draws on**, the fact ids placed here with what each
contributes; the steps or shape; and **Hand-off**, the turn the section closes on, with any
subordination it carries.

### 1. Decide whether to switch

- Heading: `## Decide whether to switch`
- **Takes:** Setting `createAuthGuard`'s `identity` option replaces the whole magic-link path, so
  every editor signs in through the gate or none does. (f:v5ndhs; link
  `docs/reference/sveltekit.md#createauthguard`)
- **Draws on:** f:fhit7f (under `identity` the guard mints no token, creates no session, and sets
  no session cookie; `identity.resolve` reads the gate's proof, and the guard looks the proven
  email up as it would a magic-link session's email), one sentence, the mechanism the
  all-or-nothing consequence follows from. Then the reason to stay that is a decision input
  rather than a redirect: the free Cloudflare Zero Trust plan caps the number of users who
  authenticate through Access, so a larger editorial team needs a paid plan, with the cap itself
  left to Cloudflare's Zero Trust plans page, linked, no figure restated (f:4olp4u). The
  rebrand-the-email redirect is not here; it is the introduction's first wrong-place sentence
  (the structural edit's advisory), so this section carries only the mechanism and the cap.
- **Shape:** two short paragraphs: the first sentence and the mechanism, then the cap. The
  committed stability-tier sentence is dropped; the reference link in See also names the tier
  (the round-2 `:58` finding, disposed by the plan).
- **Hand-off:** the switch starts from three things already in place.

### 2. Before you begin

- Heading: `## Before you begin`
- **Takes:** The switch starts from a site that already signs editors in by magic link, its first
  owner already in the roster, and a Zero Trust team connected to your identity provider.
  (anatomy sentence introducing the list, `no-claim`)
- **Draws on,** one bulleted precondition each, each with a link to what produces it:
  - A site whose guard signs editors in by magic link, deployed on its own hostname; link
    `docs/extend/add-cairn-to-a-sveltekit-app.md` (`no-claim`). This bullet is the page's one
    statement of the site's starting state; the introduction states the reader's knowledge, not
    the site's state, so the two never repeat each other (the structural edit's advisory).
  - The first owner's row in `AUTH_DB`. Identity mode cannot create it: `bootstrapOwner`, which
    `docs/extend/add-cairn-to-a-sveltekit-app.md#compose-the-runtime-and-the-admin` sets, lives
    only in the magic-link routes, which the `identity` branch never reaches, so a site that has
    not completed a magic-link sign-in seeds the row with `create-cairn-site` or with
    `wrangler d1 execute` against `AUTH_DB` (f:qhmydf; link Cloudflare's `wrangler d1 execute`
    page, https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute). The sentence
    is restructured so the link title is not the subject of a relative clause (the round-2
    register finding on the garden path).
  - A Cloudflare Zero Trust team with your identity provider connected; Google Workspace and
    Microsoft Entra ID each have a dedicated connector, and Cloudflare's one-time PIN is a
    separate login method (f:agif8l; link Cloudflare's self-hosted application guide,
    https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/).
- **Hand-off:** the roster is the half of the join you control in cairn, so it comes first.

### 3. Prepare the roster

- Heading: `## Prepare the roster`
- **Takes:** The Access application and cairn's roster are two admission lists that never
  reconcile automatically, and the email string the resolver returns is their only join, so every
  roster email must be the exact address the provider asserts before the gate goes live.
  (f:k40l86, f:emrebl, f:g0206o, one multi-id sentence)
- **Draws on:** f:k40l86 (the application decides who reaches `/admin` at all, the roster who
  among them may edit), f:emrebl (the guard checks that the email is a non-empty string, trims and
  lowercases it, and looks it up with no cross-check of its own), f:g0206o (an alias in a roster
  row is refused as unknown the moment the gate goes live; the fix is the roster screen or
  `wrangler d1 execute` against `AUTH_DB`).
- **Steps,** one numbered list of two:
  1. In the roster screen, compare each editor's email with the primary address the provider
     asserts, not an alias (f:g0206o).
  2. Correct a mismatch in the roster screen or with `wrangler d1 execute` against `AUTH_DB`
     (f:g0206o).
- **Hand-off:** the other list is the application's, which the next section creates and closes
  around.

### 4. Create the Access application

- Heading: `## Create the Access application`
- **Takes:** A self-hosted Access application admits a request to `/admin` only when it matches
  the application's policies, so the application must cover every admin path, and every other
  way to reach the Worker's `/admin` must be closed. (f:agif8l, f:vnm1p5, f:jha9f7)
- **Draws on:** f:agif8l (self-hosted application layer in front of a Worker; the connectors),
  f:vnm1p5 (paths covered and the preview path left out; most specific path first), f:33upyd (a
  login method whose email the signing-in user controls lets that user sign in as any roster
  address; Access takes the email from the claim the provider returns), f:0gltjq (CORS off, since
  enabling it can make `X-Cairn-CSRF` settable cross-origin and defeat the guard's CSRF check),
  f:gs23fb (the AUD tag, separate from the application id; a verifier validates against the tag;
  it changes only when the application is deleted or recreated), f:s9s8mw (the team domain's
  form, `https://<team>.cloudflareaccess.com`), f:q0icwk (the session management page, linked as
  the source of the logout address), f:zt0oag (a cache rule can ignore the origin's
  `Cache-Control` and cache for a set TTL, overriding the engine's `private, no-store` so one
  editor's page reaches the next matching request), f:51uyqr (`workers_dev: false` alone leaves
  an existing preview URL setting alone; `preview_urls: false` closes it), f:jha9f7 (the guard
  makes no hostname check, so a hostname that reaches the Worker outside the gate is admitted
  whenever the resolver accepts the token).
- **Steps,** one numbered list, location before action, one action a step, each explanation a
  short sub-paragraph under its step:
  1. In Zero Trust, create a self-hosted application for the site's hostname and connect your
     identity provider, following Cloudflare's self-hosted application guide (f:agif8l; link).
  2. In the application's paths, cover `/admin`, every path beneath it, and `/admin/__data.json`,
     SvelteKit's data-only fetch, and leave `/preview/<token>` uncovered (f:vnm1p5). Sub-paragraph:
     where paths overlap, Access applies the most specific path first (f:vnm1p5).
  3. In the application's login methods, enable no method whose email claim the signing-in user
     controls (f:33upyd). Sub-paragraph, the trap beside the value (the hooks take): the guard
     admits whatever email the resolver returns once it matches a roster row, so a user who
     controls the claim can sign in as any roster address (f:33upyd); the residual risks are at
     `docs/extend/security-model.md#identity-modes-threat-surface` (`no-claim` link sentence).
  4. In the application's CORS settings, leave every setting off (f:0gltjq). Sub-paragraph: the
     `X-Cairn-CSRF` reason (f:0gltjq).
  5. In the application's **Additional settings**, copy the AUD tag (f:gs23fb). Sub-paragraph: the
     verifier validates against the tag, never the application's id, and the tag changes only when
     the application is deleted or recreated (f:gs23fb).
  6. Note the team domain, `https://<team>.cloudflareaccess.com`, and the logout address that
     Cloudflare's session management page gives (f:s9s8mw for the domain's form; the page link
     from f:q0icwk's source, https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
     No fact states the logout address itself, so the page links it and never spells it (filed as
     a facts hole, see "Friction filed").
  7. In the zone's cache rules, confirm that no rule matches `/admin` (f:zt0oag). Sub-paragraph:
     the override and its consequence (f:zt0oag).
  8. In the Worker's Wrangler configuration, set both `workers_dev` and `preview_urls` to `false`
     (f:51uyqr). Sub-paragraph, the trap beside the value: Wrangler leaves an existing preview
     URL setting alone when `preview_urls` is omitted, so a site with preview URLs on still
     serves `/admin` on an ungated `workers.dev` hostname (f:51uyqr), and the guard makes no
     hostname check, so it admits a request on any hostname whenever the resolver accepts the
     token it presents (f:jha9f7).
- **Hand-off:** the verifier needs the three values you noted: the team domain, the AUD tag, and
  the logout address.

### 5. Write the verifier

- Heading: `## Write the verifier`
- **Takes:** The verifier is code you write and own, since cairn ships no OpenID Connect client
  and doesn't depend on `jose`, so TypeScript checks the resolver's shape and nothing in cairn
  checks the verification it performs. (f:lyaf6p)
- **Draws on,** the requirements as a bulleted list introduced by a complete sentence, each item
  one requirement with its reason:
  - It reads the `Cf-Access-Jwt-Assertion` header, since Access doesn't guarantee the
    `CF_Authorization` cookie and a browser can set that cookie by hand (f:42fdqq).
  - It checks the signature against the team's `/cdn-cgi/access/certs` keys and the `iss` and
    `aud` claims; the validation is stateless with no revocation step, so a token issued before a
    logout or revoke keeps verifying at the origin until its `exp`, and Access enforces the cutoff
    in the request path (f:fe0dyh, one sentence with its qualification whole).
  - It requires `type` to be `app`, the application token rather than the `org` global session
    token, and refuses a token with no `email` claim, which also refuses a service token
    (f:zas1dk).
  - It returns the email and, optionally, a display name, never a role: the guard takes the role
    from the roster row and uses the resolver's name only when the roster's is empty (f:hilyos).
  - Its refusal reason names the failure: the guard logs `audience`, `issuer`, `keys`, and
    `error` at error, since each marks a misconfigured gate that would refuse the whole roster,
    and every other reason at warn (f:fu4uis). A resolver that throws is refused and logged at
    error (f:fu4uis).
- **Steps,** one numbered list of three:
  1. In the site's project, install `jose` (f:lyaf6p).
  2. In the site's project, create a config module exporting the team domain, the AUD tag, and the
     logout address you noted (f:s9s8mw for the domain's form). The `logoutUrl` contract is
     subordinated: the sentence that names the export links
     `docs/reference/sveltekit.md#identityresolver`, which states that `createAuthGuard` validates
     it once at construction as a root-relative path or an absolute `https:` URL and throws
     otherwise (f:pwmybh subordinated).
  3. In the site's project, create a resolver module that exports an `IdentityResolver` meeting
     the requirements above (f:3p8yu8).
- **The sample,** after step 3, with a lead-in of one sentence: the following module is
  illustrative and adapted from Cloudflare's Validate JWTs sample, which stays the authoritative
  reference for the verification (f:s9s8mw; link
  https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).
  The code, `src/lib/access-identity.ts`: import `createRemoteJWKSet` and `jwtVerify` from `jose`
  and `IdentityResolver` from `@glw907/cairn-cms/sveltekit`; import `audTag`, `logoutUrl`, and
  `teamDomain` from the config module; build the key set over `${teamDomain}/cdn-cgi/access/certs`;
  export the resolver with `label`, `logoutUrl`, and `resolve`, which reads the
  `cf-access-jwt-assertion` header and returns `{ ok: false, reason: 'missing' }` without one,
  calls `jwtVerify(token, JWKS, { issuer: teamDomain, audience: audTag })`, returns `invalid` when
  `payload.type !== 'app'`, returns `no_email` when `payload.email` is not a non-empty string, and
  returns `{ ok: true, email: payload.email }`; the `catch` returns `{ ok: false, reason:
  reasonFor(err) }`. Then the `reasonFor` helper, the site's addition, a `switch` on the error's
  `code` string: `ERR_JWT_EXPIRED` to `expired`; `ERR_JWT_CLAIM_VALIDATION_FAILED` to `audience`
  when its `claim` is `aud`, `issuer` when `iss`, else `invalid`; `ERR_JWKS_NO_MATCHING_KEY`,
  `ERR_JWKS_MULTIPLE_MATCHING_KEYS`, and `ERR_JWKS_TIMEOUT` to `keys`;
  `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`, `ERR_JWT_INVALID`, and `ERR_JWS_INVALID` to `invalid`;
  default `error`. A comment in the code says to branch on `code`, never on `name`, since a
  minified bundle renames classes. One sentence after the code, cited, ties the helper to the
  rule: the helper maps `jose`'s error codes to the reasons the guard logs at error, so a wrong
  AUD tag or team domain alerts as a misconfigured gate rather than as a wave of invalid tokens
  (f:fu4uis; link `jose`'s error reference, https://github.com/panva/jose, the `errors` module).
  No prose sentence states what any `jose` code means beyond that; the mapping lives in the code.
- **The `label` field,** one sentence after the code: the optional `label` names the gate on the
  sign-in hand-off page and the two refusal pages, and defaults to "your organization's sign-in"
  (f:ojr3qm).
- **Hand-off:** the resolver is one option on the guard.

### 6. Wire the resolver into the guard

- Heading: `## Wire the resolver into the guard`
- **Takes:** `createAuthGuard` returns a plain SvelteKit `Handle` whether or not `identity` is
  set, so the resolver goes in as one option and the guard composes through `sequence` as it did
  under magic links. (f:dwc4kp)
- **Draws on:** f:gun084 (`identity` is one of the guard's four config members, beside `roles`,
  `access`, and `includeSubDomains`; the step sentence cites it), f:4uqi5r (the guard awaits
  `identity.resolve` on every non-public `/admin` request and caches no verified identity, so
  the signature check runs once per request, including for a request that reaches the Worker
  without passing the gate; `resolveRateLimit` from `@glw907/cairn-cms/cloudflare` is best-effort
  back pressure a handle ahead of the guard can apply; link
  `docs/reference/cloudflare.md#resolveratelimit`), f:2glcaf (the effective session lifetime moves
  to the gate, and cairn's 30-day session no longer applies; the Access default and ceiling are
  left to Cloudflare's session management page, linked, no figure restated), f:8xxe3b (under
  `identity`, sign-out skips the session-row delete, clears every cairn cookie, and redirects to
  the gate's `logoutUrl`), f:q0icwk (Access then clears the browser's authorization cookie, and
  stops accepting that session's tokens shortly after, the figures left to the linked page).
- **Step,** a single bulleted item: in `src/hooks.server.ts`, pass the resolver as the guard's
  `identity` option (f:gun084). Then the hooks file, whole, showing the option beside another
  handle in `sequence` (the committed sample stands).
- **Explanation,** one paragraph group opening on a sentence that ties it to the step: once the
  option is set, the guard does three things differently. The per-request resolve and the
  rate-limit hand-off (f:4uqi5r); the lifetime (f:2glcaf); the sign-out (f:8xxe3b, f:q0icwk).
  Three sentences to five, no more.
- **Hand-off:** the checks below confirm each of these from outside.

### 7. Verify the gate

- Heading: `## Verify the gate`
- **Takes:** A working gate admits a rostered editor to `/admin`, sends a signed-out visitor to
  the gate's hostname, and serves nothing on an ungated hostname, and since no tool checks the
  login redirect or the `workers.dev` exposure, every check here runs by hand. (f:iaqcq6)
- **Draws on:** f:iaqcq6 (the two hand checks: the `/admin/login` redirect, the `workers.dev`
  and preview-alias probe), f:sbv5xj (a refusal leaves a `guard.refused` record with
  `reason: identity`), f:fu4uis (`auth.identity.unknown` is a separate warn event for a proven
  identity the roster does not recognize), f:8xxe3b (sign-out redirects to `logoutUrl`),
  f:51uyqr (each preview URL is probed too).
- **Steps,** one numbered list, each naming its observable result:
  1. From a browser signed in through Access as a rostered editor, open `/admin` and confirm the
     admin shell opens (`no-claim`).
  2. In Workers Logs, confirm that the request left no `guard.refused` record with
     `reason: identity` (f:sbv5xj; link `docs/reference/log-events.md`). No sub-paragraph here:
     what `detail` carries is explained once, in the failure path (the round-2 `:269-270` versus
     `:292-293` duplication).
  3. In the same logs, confirm that the request left no `auth.identity.unknown` record
     (f:fu4uis).
  4. From the admin, sign out and confirm that the browser lands on the gate's logout address
     (f:8xxe3b).
  5. From a signed-out client, send an unauthenticated `GET` to the primary hostname's
     `/admin/login` and confirm that the redirect lands on the gate's hostname (f:iaqcq6).
  6. Send an unauthenticated `GET` to `/admin` on `<worker-name>.<subdomain>.workers.dev` and on
     each preview URL and confirm that no response comes from the Worker (f:iaqcq6, f:51uyqr).
- **Hand-off:** a check that fails leaves one of two records, and the next section reads them.

### 8. Resolve a refused sign-in

- Heading: `## Resolve a refused sign-in`
- **Takes:** The guard shows the identity-unresolved page when the resolver refuses the request or
  throws, and the unknown-identity page when a proven email matches no roster row, and each leaves
  one log record that names the cause. (f:sbv5xj, f:hilyos)
- **Draws on:** f:sbv5xj (the `auth.identity-unresolved` condition; `guard.refused` with
  `reason: identity` carries the refusal's reason in `detail`), f:hilyos (the unknown-identity
  page; `auth.identity.unknown` carries the normalized email; adding the row lets the very next
  request succeed), f:fu4uis (the reason vocabulary and its levels; a resolver that throws logs
  at error), f:gs23fb (the AUD tag is what `audience` points at), f:vnm1p5 (what `missing` points
  at: a path the application does not cover), f:ig5pn3 (the shell's logout posts to the bare
  `/admin`, a guarded path, so a stale tab whose gate session ended is refused with the
  identity-unresolved page instead of signing out).
- **Steps,** one numbered list of ordered checks, one action each, a conditional step stating its
  condition first. The one refusal a reader recognizes without a log read comes first; the two
  records follow; then every reason the guard distinguishes has a conditional step, keyed on the
  logged reason alone, so the sequence tests one axis at a time (the structural edit's blocking
  finding on the committed plan's step 8):
  1. If the refused request was a sign-out from a tab left open, sign in through the gate again:
     the shell's logout posts to the bare `/admin`, a guarded path, so a tab whose gate session
     already ended is refused there before `logoutAction` runs (f:ig5pn3; the remedy is
     f:sbv5xj's). This step keys on what the request was, not on a logged reason, and needs no
     log read, so it precedes every log check; whatever reason a stale-tab refusal logs, it never
     routes through the `missing` path check.
  2. Otherwise, in Workers Logs, look for an `auth.identity.unknown` record from the refused
     request (f:fu4uis).
  3. If one appears, add or correct the editor's roster row so that it carries the address in the
     record's `email` field, the gate's confirmed address normalized; the next request succeeds
     (f:hilyos; the capped-and-normalized detail is subordinated to `docs/reference/log-events.md`,
     the `auth.identity.unknown` row and the `email` note, f:mjedcx).
  4. Otherwise, read the refusal's reason from the `detail` of the request's `guard.refused`
     record with `reason: identity` (f:sbv5xj; one action, the round-2 `:292-293` finding).
  5. If the reason is `expired`, `invalid`, or `no_email`, have the editor sign in through the
     gate again: the guard logs each at warn, below the four reasons that mark a misconfigured
     gate (f:fu4uis; the remedy is f:sbv5xj's). The three request-shaped reasons share one step
     because they share one remedy, and the step exists so that an ordinary `expired` refusal
     matches a step instead of falling through to the debug page.
  6. If the reason is `audience`, check the AUD tag in the config module against the application's
     **Additional settings** (f:fu4uis, f:gs23fb).
  7. If the reason is `issuer` or `keys`, check the team domain in the config module (f:fu4uis).
  8. If the reason is `missing`, confirm that the application's paths cover the requested path and
     that the request arrived on the primary hostname (f:fu4uis, f:vnm1p5).
  9. If the reason is `error`, the resolver threw; read the record's message and fix the module
     (f:fu4uis).
  10. If the refusal persists, work through `docs/extend/debug-your-site.md` (`no-claim`), the
      last step.
  The register editor's `:296-297` finding (the diagnostic covered `missing` and `invalid` only) is
  met by steps 5 to 9 together naming every reason in f:fu4uis's vocabulary: the three
  request-shaped reasons in step 5, the four misconfigured-gate reasons and `missing` in steps 6
  to 9. A site's own refusal word, which f:fu4uis also allows, is the resolver author's to
  diagnose and gets no step; step 10 catches it.
- **Closing sentence:** the `docs/reference/log-events.md` reference lists the fields of both
  records (`no-claim`).
- **Hand-off:** See also.

## Ending

### 9. See also

The anatomy's ending: related how-to guides, concept pages, and the limitations the page leaves
out, with the recovery link not repeated.

- Heading: `## See also`
- **Takes:** The following pages cover the seams and limits around identity mode. (`no-claim`,
  the list's introducing sentence)
- **Links,** one line each, five:
  - `docs/extend/security-model.md#identity-modes-threat-surface` records the risks the gate
    leaves open.
  - `docs/extend/restrict-admin-access.md` narrows which roster roles reach which admin screens.
  - `docs/extend/share-a-draft-preview.md` sets up the `/preview/<token>` route the application
    leaves uncovered (f:vnm1p5, the one cited line).
  - `docs/extend/add-a-second-sign-in-group.md` signs a second population in beside the editors.
  - `docs/reference/sveltekit.md#createauthguard` states the `identity` option, the three types it
    names, and their stability tier (the home of the dropped stability sentence).

## Round-2 findings, disposed

| Finding (seat, committed line) | Disposition |
| --- | --- |
| Structural, `:12` [BLOCKING]: the introduction describes the page itself and fails the prior-knowledge item | Applies. Paragraph 2 states the reader's knowledge (a SvelteKit server hooks file edited, a JWT verification sample read); the finding's rewrite sentence, the magic-link site, is the first precondition under "Before you begin" with its link, stated once; no introduction sentence opens on the page or refers to a position |
| Structural, `:86-89`: preconditions carry no link to what produces them | Applies. "Before you begin" links `add-cairn-to-a-sveltekit-app.md` for the site, its compose section for `bootstrapOwner`, Cloudflare's `wrangler d1 execute` page, and the self-hosted application guide |
| Structural, `:157-158`: the config step exports values the page has not located | Applies. Access section step 6 collects the team domain and logout address beside step 5's AUD tag |
| Structural, `:199-204`: the sample returns `invalid` for everything, then a paragraph says a better verifier returns `audience` | Applies. The reason rule is a requirement before the sample, and the sample's `reasonFor` meets it |
| Structural, `:44-46, 67-68`: caption and roster opener both state the two-lists claim | Applies. The caption carries the request's path (f:fhit7f, f:vnm1p5, f:paotzb); f:k40l86 is stated once, in the roster section |
| Structural, `:58`: a stray stability-tier sentence in the decision section | Disposed by the plan. The sentence is dropped; See also's reference link names the tier |
| Structural, `:242-244`: a noun-phrase heading in a task guide | Disposed by the plan. The section is dissolved (departure 2) |
| Register, `:86-89`: the `bootstrapOwner` garden path | Applies. The precondition sentence makes `bootstrapOwner` the subject and the link a parenthetical clause |
| Register, `:203-204`: the `audience` sentence restates the rule | Disposed by the plan. The sentence is gone with the sample's mapping |
| Register, `:44-46`: the caption repeats `:67-68` | Applies, as the structural row above |
| Register, `:269-270` versus `:292-293`: the failure section duplicates the verify step's sub-paragraph | Applies. Verify step 2 has no sub-paragraph; `detail` is explained once, in the failure path |
| Register, `:292-293`: a step joining find and read | Applies. Failure step 4 is one action |
| Register, `:296-297`: the diagnostic covers `missing` and `invalid` only | Applies. Step 5 covers `expired`, `invalid`, and `no_email` in one conditional step; steps 6 to 9 cover `audience`, `issuer` and `keys`, `missing`, and `error`; every reason in f:fu4uis's vocabulary has a step |
| Register, `:290-291`: flag for the claims checker | Applies. Failure step 3's "the next request succeeds" cites f:hilyos, which states it |
| Register, `:9-10`: the introduction's provider sentence | Applies. Paragraph 1's when-and-why sentence cites f:gw1oas and f:agif8l |
| Register, `:19, 298, 306, 308, 310`: links to pages not yet in the worktree | Not a change. All four slugs are in `docs/internal/outlines/extend.json`; the link gate counts them as pending |
| Fact read, `:87-89`: an unwrapped 133-character line | Applies. Every prose line wraps near 100 columns |
| Fact read, brief: the hooks-and-Zero-Trust sentence tagged `no-claim` | Not a change. The sentence is an anatomy sentence with no code span; if a code span enters it, cite `[f:dwc4kp, f:agif8l]` |
| Figure verifier, `:46`: the caption's last sentence nearly repeats the `accDescr` | Applies. The `accDescr` describes the drawing; the caption draws the consequence |
| Figure verifier, `:23`: `/healthz` missing from the diagram | Applies. f:paotzb is added as a carried fact for the figure (departure 6) |

Non-blocking round-2 findings this plan also takes: the explanation after the wire step opens on
a tying sentence and runs five sentences at most; the `label` sentence sits with the sample that
sets it.

## Structural edit findings, disposed

The structural edit read the first version of this plan (2026-10-03) and returned fix, one
blocking finding and two advisory. All three are taken.

| Finding (plan region) | Disposition |
| --- | --- |
| [BLOCKING] Failure path: `expired`, `invalid`, and `no_email` matched no step, and the stale-tab step tested the request rather than the logged reason, so a stale-tab refusal logging `missing` reached the path check first | Taken. The stale-tab sign-out is step 1, a conditional keyed on the request and ahead of every log read; the three request-shaped reasons have their own conditional step 5 with one remedy; steps 6 to 9 test the logged reason alone; `docs/extend/debug-your-site.md` stays the last step |
| [advisory] Introduction paragraph 2 stated the site's state, not the reader's knowledge, and repeated the first precondition | Taken. Paragraph 2 states the reader's knowledge with no code span (`no-claim`); the magic-link site is stated once, as the first "Before you begin" bullet with its link; the round-2 `:12` row records the move |
| [advisory] The "read instead" redirects were split between the introduction and the decision section | Taken. The rebrand-the-email redirect (the outline's cross-link) joins the introduction's wrong-place sentences; "Decide whether to switch" carries the all-or-nothing mechanism and the plan cap only |

## Dispositions, every fact id

`carried` names the section the fact is placed under (its primary home when it is cited twice).
`subordinated` names the reference page or entry that states the fact and gives the reason; the
brief records it as a cut whose reason names the link. Each named entry was opened and read
before it was named. 36 carried (one added, f:paotzb), 2 subordinated, 0 cut.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:v5ndhs | carried | Decide whether to switch (first sentence) |
| f:gs23fb | carried | Create the Access application (step 5); Resolve a refused sign-in (step 6) |
| f:g0206o | carried | Prepare the roster (first sentence and both steps) |
| f:emrebl | carried | Prepare the roster (first sentence) |
| f:k40l86 | carried | Prepare the roster (first sentence); stated once on the page |
| f:4olp4u | carried | Decide whether to switch (the cap, with Cloudflare's plans page linked and no figure restated) |
| f:qhmydf | carried | Before you begin (the owner-row precondition) |
| f:zt0oag | carried | Create the Access application (step 7) |
| f:vnm1p5 | carried | Create the Access application (step 2); the figure caption; Resolve a refused sign-in (step 8); See also (the preview line) |
| f:0gltjq | carried | Create the Access application (step 4) |
| f:51uyqr | carried | Create the Access application (step 8); Verify the gate (step 6) |
| f:iaqcq6 | carried | Verify the gate (first sentence, steps 5 and 6) |
| f:lyaf6p | carried | Write the verifier (first sentence; step 1) |
| f:42fdqq | carried | Write the verifier (requirements) |
| f:zas1dk | carried | Write the verifier (requirements) |
| f:q0icwk | carried | Wire the resolver into the guard (the sign-out sentence; figures left to the linked page); Create the Access application (step 6 links the same page for the logout address) |
| f:3p8yu8 | carried | Introduction (paragraph 2, the other-proxy sentence); Write the verifier (step 3) |
| f:agif8l | carried | Introduction (paragraph 1); Before you begin (the Zero Trust precondition); Create the Access application (first sentence, step 1) |
| f:hilyos | carried | Write the verifier (the no-role requirement); Resolve a refused sign-in (first sentence, step 3) |
| f:fu4uis | carried | Write the verifier (the reason requirement; the sentence after the sample); Verify the gate (step 3); Resolve a refused sign-in (steps 2, 5 to 9) |
| f:ig5pn3 | carried | Resolve a refused sign-in (step 1, the conditional ahead of every log read) |
| f:fe0dyh | carried | Write the verifier (the stateless-validation requirement, with its residual in the same sentence) |
| f:dwc4kp | carried | Wire the resolver into the guard (first sentence) |
| f:4uqi5r | carried | Wire the resolver into the guard (the per-request sentence; `docs/reference/cloudflare.md#resolveratelimit` linked) |
| f:33upyd | carried | Create the Access application (step 3, the trap beside the value) |
| f:8289h7 | carried | Introduction (paragraph 1, the contract) |
| f:gw1oas | carried | Introduction (paragraph 1) |
| f:mjedcx | subordinated | `docs/reference/log-events.md`, the `auth.identity.unknown` row and the `email` note beneath the table: both state that the field is the gate's confirmed address, normalized and capped, logged after the roster lookup fails. The page's remedy step cites f:hilyos for the normalized email and links the row |
| f:2glcaf | carried | Wire the resolver into the guard (the lifetime sentence; Access's default and ceiling left to the linked session management page) |
| f:jha9f7 | carried | Create the Access application (first sentence; step 8's trap sentence) |
| f:fhit7f | carried | Decide whether to switch (the mechanism sentence); the figure caption |
| f:s9s8mw | carried | Write the verifier (the sample's lead-in; the team domain's form in step 2); Create the Access application (step 6, the domain's form) |
| f:pwmybh | subordinated | `docs/reference/sveltekit.md#identityresolver`, the `IdentityResolver` row: states that `logoutUrl` is validated once at `createAuthGuard`'s construction as a root-relative path or an absolute `https:` URL, or construction throws. The config module step links it; the percent-decoding and character rules are detail no step depends on |
| f:ojr3qm | carried | Write the verifier (the `label` sentence after the sample) |
| f:gun084 | carried | Wire the resolver into the guard (the step sentence) |
| f:8xxe3b | carried | Wire the resolver into the guard (the sign-out sentence); Verify the gate (step 4) |
| f:sbv5xj | carried | Resolve a refused sign-in (first sentence, step 4; the sign-in-again remedy in steps 1 and 5); Verify the gate (step 2) |
| f:paotzb | carried | The figure (`accDescr` and caption); added by this plan for the outline's `figureNote` |

## Friction filed

Two entries in `docs/internal/docs-friction-log.md`, filed by this plan step on 2026-10-03, neither
blocking the page: the facts container holds no fact for Access's logout address, so step 6 of
the Access section links the session management page and the sample imports the value from the
config module without spelling it; and identity mode has no owner bootstrap, so the first owner is
a precondition seeded out of band. The three caveats this page also carries (the `label` doc
comment naming a retired probe condition, the stale-tab logout refusal, and the free-form refusal
reason that sets the log level) were filed on 2026-09-30 and are not refiled.

## Drafting constraints

- The introduction's first sentence is the contract; no introduction sentence opens on the page
  or names a position on it.
- Every section heading is a bare infinitive in sentence case, except "Before you begin" and "See
  also".
- Each step names its location before its action and holds one action; a conditional step states
  its condition first; a one-step procedure is a single bulleted item.
- The failure path gives every refusal reason the guard distinguishes a conditional step keyed on
  the logged reason alone, the three request-shaped reasons sharing one; the stale-tab sign-out is
  its first step, ahead of every log read; `docs/extend/debug-your-site.md` is its last.
- The site's magic-link starting state is stated once, as the first precondition; the
  introduction states the reader's knowledge and carries every "read instead" redirect.
- An explanation that follows a step opens on a sentence tying it to the step, and no explanation
  runs past five sentences before the next step or heading.
- A vendor figure is linked, never restated: the Zero Trust user cap, Access's session duration
  default and ceiling, and the seconds after a logout before tokens stop being accepted.
- The logout address is never spelled on the page; step 6 of the Access section and the config
  module's comment point at Cloudflare's session management page.
- The sample's verification follows Cloudflare's sample; the `reasonFor` helper branches on `code`
  and carries its mapping in code, with one cited sentence after the block and no prose about
  individual `jose` codes.
- The two-lists claim (f:k40l86) appears once, in the roster section's first sentence; the
  caption describes the request's path.
- A sentence that synthesizes facts cites them as an array; the plan's "one multi-id sentence"
  markers name the intended ones. A `cuts` list in the brief mirrors the two subordinated rows,
  each reason naming the reference link.
- Every prose line wraps near 100 columns.
- The page links the stage 2b pages it names (`add-a-second-sign-in-group`, `debug-your-site`,
  `restrict-admin-access`, `share-a-draft-preview`); docs-links counts them as pending.
