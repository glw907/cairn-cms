# Page plan: `docs/extend/replace-magic-links-with-cloudflare-access.md`

Agent-facing, committed beside the brief at
`docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.json`. Written 2026-10-03
by the plan step of the docs page chain (stage 2a, task 7c) for the task 7b resolution run, and
revised twice the same day on the structural edit's findings. The first revision took the first
plan read's three findings (one blocking, on the failure path's step order; two advisory, on the
introduction's prior-knowledge paragraph and the placement of the "read instead" redirects), mapped
in "Plan read 1 findings, disposed". The second revision, for resolution run 2 (conductor ruling
2026-10-03), took the second plan read's three findings (one blocking, no step deploys the site or
places the go-live moment; two advisory, the failure path's `error` step assuming a throw the
sample's own default also produces, and the Access section's heading underselling its cache and
Wrangler steps), mapped in "Plan read 2 findings, disposed". The third revision, in the same run,
took the third plan read's four findings (one blocking, no step sets the application's policy, the
second of the two admission lists the page argues must agree; three advisory, no failure-path step
for an editor stopped at Cloudflare's block page, "the gate goes live" naming two different
moments, and a decision section ahead of the preconditions against the anatomy's order), mapped in
"Plan read 3 findings, disposed". Everything the three reads passed is kept.
The drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The structural edit seat reads it before any prose exists. Method: Google
Technical Writing Two, "Organizing large documents"
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
`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`; both plan reads and
the escalation findings under "### replace-magic-links-with-cloudflare-access" in
`docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`, and the third plan
read's findings as the revision dispatch delivered them; Cloudflare's policies page
(https://developers.cloudflare.com/cloudflare-one/access-controls/policies/), opened to confirm
it resolves before the policy step linked it; the committed page
at `bbfb6788` and the committed plan at `2aacb280`; every fact bullet named below in
`docs/internal/facts/extend.md`, `docs/internal/facts/front-door.md`,
`docs/internal/facts/admin.md`, and `docs/internal/facts/reference.md`; the reference entries named
in the dispositions table, each opened before it was named; the guard's identity branch at
`src/lib/sveltekit/guard.ts:287-313`, read to settle the `error` step; the deploy steps of
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Describe the Worker and deploy it", "Deploy the
production build and read the refusal"); the two exemplars,
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
- **Exemplar takes.** The Sanity "right tool?" callout becomes the introduction's second
  paragraph, the all-or-nothing switch and the plan cap that decide whether to stay on magic
  links, placed where the exemplar places its callout, between the opening lines and the first
  heading (the third plan read's advisory found the earlier decision section ahead of the
  preconditions, against the anatomy's order); the one "read instead" redirect among the reasons
  to stay, a site that wants only a different sign-in email, sits in the introduction with the
  other wrong-place sentences, the slot the anatomy gives it (the first plan read's advisory).
  The SvelteKit hooks take places each security trap
  in the paragraph that states the value inviting the misuse: the login-methods step carries the
  self-asserted-email trap, the CORS step carries the `X-Cairn-CSRF` trap, and the preview-URLs
  step carries the no-hostname-check trap.
- **Owner rulings (Geoff, 2026-10-01).** Every page gets an introduction per the anatomy; a task
  guide's contract alone is not one. A plan may push a fact off the page, subordinated to a named
  reference entry or cut with a reason, never dropped.
- **Round-2 findings** (`docs/superpowers/research/2026-10-01-draft-docs-2a-rework-record.md`,
  "### replace-magic-links-with-cloudflare-access"): the one blocking finding applies where this
  plan keeps the sentence it cites; a finding on a sentence this plan drops is disposed here. The
  table near the end maps every finding.
- **The three plan reads** (the first two recorded in
  `docs/superpowers/research/2026-10-03-draft-docs-2a-resolution-run-record.md`,
  "### replace-magic-links-with-cloudflare-access"; the third delivered with this revision's
  dispatch): all three blocking findings are closed, the first read's in the failure path's step
  order, the second read's by the deploy step that places the go-live moment, the third read's by
  the policy step that fills the application's admission list; the seven advisories are taken.
  Three tables near the end map them.
- **The diagnosis** (`docs/superpowers/research/2026-10-01-draft-docs-2a-page-plan-diagnosis.md`):
  the committed page reads as atoms. This plan decides what the page argues, which facts carry
  the argument, and which are detail the reference already holds.

## What the page argues, and the order it needs

The page argues one thing: under `identity`, cairn hands the whole of sign-in to the gate and
keeps only the roster lookup, so the task is making two admission lists agree on one string, the
email the resolver returns, and making the gate the only way to reach `/admin`. The two lists are
the application's policy on Cloudflare's side and the roster on cairn's (f:k40l86). Everything the
reader does falls under that argument. The roster must hold the exact address the provider will
assert, because the guard looks the string up with no cross-check (f:emrebl, f:g0206o). The
application's policy must admit every rostered editor, because an editor it stops never reaches
the Worker and leaves no cairn record to read (f:agif8l, f:k40l86). The Access application must
cover every admin path, and every setting outside it that delivers an admin response around the
gate or the guard must be closed, because the guard makes no hostname check of its own and a token
keeps verifying at the origin after the gate revokes it (f:vnm1p5, f:jha9f7, f:fe0dyh). The
verifier must turn the gate's token into that email and nothing else, because cairn ships no
verifier and checks none (f:lyaf6p, f:hilyos). The wiring is one option and one deploy, because
the guard stays a plain `Handle`, and while the application challenges `/admin` from the moment it
is saved, nothing changes in what the guard trusts until the Worker that carries the option is
uploaded (f:dwc4kp, f:9ug9mo). Verification and recovery read the two log records the guard leaves
when either list refuses at the guard, and recognize the one refusal that leaves none, the gate's
own block page (f:sbv5xj, f:fu4uis, f:hilyos, f:agif8l).

The decision input, whether to switch at all, sits in the introduction (the Sanity take, placed as
the exemplar places its callout, before the first heading), so the first heading is "Before you
begin" and the sections run in the anatomy's order. That order follows the dependency between the
parts above, and each section hands the next its input:

1. **Before you begin**, the preconditions: a magic-link site, its first owner's row, a Zero Trust
   team with the provider connected. The owner row is a precondition rather than a step, since
   identity mode cannot create it and a running magic-link site already has it (f:qhmydf).
2. **Prepare the roster**, the cairn half of the join, before any Cloudflare work. A roster
   mismatch locks an editor out the moment identity mode goes live (f:g0206o), and fixing it needs
   no Zero Trust change, so checking it first leaves the gate as the only new variable at that
   moment. The section also states the join itself, the email string, which the verifier's
   requirements rest on three sections later.
3. **Create the Access application**, every step inside Zero Trust: the application, the paths it
   covers, the policy that fills the other admission list (the third plan read's blocking
   finding: the plan argued two lists and gave the reader only one), the login methods, CORS, and
   the three values the verifier needs, the team domain, the AUD tag, and the logout address. The
   round-2 pacing finding (the config module asked for values the page had not yet located) is
   disposed by the step that collects them here.
4. **Close the exposures outside the application**, the zone's cache rules and the Worker's
   preview hostnames, two settings outside Zero Trust that can deliver an admin response around
   the gate or the guard. They follow the application because they finish the Cloudflare-side
   work before any code is written, and they stand apart from it because they live in two other
   places and the heading must say so (the second plan read's advisory on the heading that
   undersold them). The Wrangler change here is a local edit that the deploy in section 6
   carries, and the deploy step says so.
5. **Write the verifier**, which consumes those three values. Its requirements, the log-level rule
   included, precede the sample, so the sample can be read against them; the sample maps
   `jose`'s error codes to the reasons the guard logs at error, which disposes the round-2
   logical-order finding, and rethrows a failure its mapping does not name, so the literal
   `error` means one thing on this page (the second plan read's advisory on the `error` step).
6. **Wire the resolver and deploy the Worker**, two steps in one numbered list: the option in the
   hooks file, then the deploy that uploads the hooks option and the Wrangler settings together
   and is the moment identity mode goes live (the second plan read's blocking finding: the
   committed plan's edits were all local and nothing placed the go-live). The page names this
   moment apart from the earlier one, the application challenging `/admin` from its save (the
   third plan read's advisory). The explanation of what the deployed guard does differently
   follows the list, tied to it: the per-request resolve, the session lifetime that now belongs
   to the gate, and a sign-out that ends at the gate.
7. **Verify the gate**, every check by hand against the deployed site, since no tool checks the
   login redirect or the `workers.dev` exposure (f:iaqcq6).
8. **Resolve a refused sign-in**, opening on the two refusals a reader recognizes without a log
   read (the stale-tab sign-out, then the gate's block page, which leaves no cairn record), then
   keyed on the two records and every refusal reason the guard distinguishes, the request-shaped
   reasons included, pointing at `docs/extend/debug-your-site.md` when the steps run out.
9. **See also**, the anatomy's ending.

### Departures from the outline's cover order, with the reason for each

1. **"Before you switch" becomes two sections, one introduction paragraph, and one introduction
   sentence.** The all-or-nothing replacement and the free-plan cap are decision inputs, so they
   are the introduction's second paragraph, ahead of every heading (the Sanity take; the third
   plan read's advisory, which found them as a section between the introduction and the
   preconditions, an explanation module the anatomy places nowhere before the steps); the
   redirect for a site that wants only a different sign-in email is a wrong-place sentence, so it
   sits in the introduction beside the other two (the anatomy's slot; the first plan read's
   advisory); the seeded owner is a precondition with a producer to link (the anatomy's item 2
   and the round-2 `:86-89` finding); the roster emails are an action the reader performs, so
   they are the first step section.
2. **"Logout under identity and Access's token lifetime" is no section.** Its facts land where
   each is relevant (Google's lesson): the session lifetime and the sign-out redirect in the wire
   section's explanation of what the option changes (f:2glcaf, f:8xxe3b, f:q0icwk); the
   stateless-validation residual beside the verifier requirement it qualifies, with its
   consequence for an ungated hostname stated once more at the step that closes those hostnames
   (f:fe0dyh); the stale-tab refusal as the failure path's first step, where a reader meets it
   and ahead of every log read (f:ig5pn3); and a sign-out check in Verify. This disposes the
   round-2 finding on a noun-phrase heading in a task guide, and the job read's finding that the
   page ran one step into twenty lines of exposition: each explanation now opens on a sentence
   tying it to its step.
3. **"The seam is not Cloudflare-specific" is one sentence in the introduction** (f:3p8yu8), in
   the slot the anatomy gives the reader who may be in the wrong place: a site behind another
   authenticating proxy learns in the first paragraphs that the page serves it and which steps it
   substitutes.
4. **The Access application section collects the verifier's inputs.** A step to note the team
   domain and the logout address joins the AUD-tag step, so the config module step two sections
   later exports values already in hand (the round-2 `:157-158` pacing finding).
5. **"Create the Access application" splits in two.** The outline's second cover puts the cache
   rule and the preview URLs under the application, and the committed plan followed it with one
   eight-step list under one heading. The last two steps live in the zone's cache rules and the
   Worker's Wrangler configuration, outside Zero Trust, and they close a different thing: not who
   the application admits, but whether an admin response can reach a browser around the gate or
   the guard. They get their own section and heading, "Close the exposures outside the
   application", so a reader who already holds an application finds the hardening by its heading
   (Google's "headings that help users understand the subject"; the second plan read's advisory).
   The order of the outline's steps is unchanged; the policy step (departure 10) is added among
   them.
6. **The verifier's reason rule precedes the sample, and the sample maps reasons.** f:fu4uis is a
   requirement the sample then meets through a `reasonFor` helper over `jose`'s documented error
   codes, instead of a paragraph after the sample saying a better verifier would (the round-2
   `:199-204` and `:203-204` findings). The helper names no default: a failure outside its mapping
   is rethrown, so the guard logs it at error with its message, and the literal `error` on this
   page means a throw and nothing else (the second plan read's advisory on the `error` step).
7. **The deploy is a step, not an assumption.** The outline's fourth cover ends at composition via
   `sequence`, and the committed plan ended the wiring there, so every edit on the page was local
   and the Verify section probed a live hostname nothing had deployed to (the second plan read's
   blocking finding). The wire section's one bullet becomes a two-step list whose second step
   deploys the Worker and names that deploy as the moment identity mode goes live, when the
   roster check from "Prepare the roster" starts to bite (departure 11 names the moment). The
   deploy command cites f:9ug9mo, added by this plan as a carried fact, and links the tutorial's
   deploy step.
8. **The figure shows `/healthz` outside the application** (the outline's `figureNote` and the
   round-1 figure verifier). The fact the drafter lacked, f:paotzb, is added to the inventory by
   this plan as a carried fact, placed in the figure's `accDescr` and caption only.
9. **The caption carries the request's path, not the two-lists sentence.** The two-lists claim
   (f:k40l86) is stated in full once, as the roster section's first sentence (the round-2
   `:44-46, 67-68` duplication); the policy step's sub-paragraph refers back to it in one clause
   (departure 10) and the caption never does.
10. **The application's policy is a step.** The outline's second cover lists the paths, CORS, the
    cache rule, and the preview URLs, and never the policy, and the committed plan followed it,
    leaving the policy to the self-hosted guide the first step links. The page argues that two
    admission lists must agree, and the policy is the application's list, so the list the reader
    never filled was the second half of the page's own argument (the third plan read's blocking
    finding). It is step 3 of "Create the Access application", after the paths it protects and
    before the login methods that prove the emails it admits, one action: add a policy that
    admits every editor in the roster (f:agif8l for the policy deciding who reaches the
    application; Cloudflare's policies page linked for the action's name and the rule selectors,
    which no fact states, filed as a facts hole under "Friction filed"). Its sub-paragraph is the
    one back-reference to the two-lists claim: an editor the policy leaves out never reaches the
    guard, and a user it admits whom the roster lacks is refused by the guard as unknown
    ([f:agif8l, f:k40l86], one multi-id sentence). The full two-lists statement stays in the
    roster section (departure 9).
11. **Two go-live moments, named apart.** The application challenges every request to `/admin` on
    the site's hostname from the moment it is saved, magic-link editors included, and identity
    mode goes live at the deploy that carries the resolver. The committed plan called the deploy
    "the gate goes live", so the exposures section's "before the gate goes live" and the deploy's
    go-live sentence named two different moments with one phrase (the third plan read's
    advisory). The Access section's hand-off now names the first moment; the exposures section
    closes its settings "before the deploy that switches the guard to identity"; the wire
    section's deploy is "the moment identity mode goes live". The page never calls the deploy
    the gate going live. f:g0206o's own words, "the moment the gate goes live", are the fact's
    name for enabling `identity`, which the deploy does, so the deploy step cites it as such and
    the drafter's sentence names the deploy, not the phrase.
12. **The gate's block page is a failure-path step.** An editor the policy does not admit is
    stopped at Cloudflare's own page and never reaches the Worker, so neither `guard.refused` nor
    `auth.identity.unknown` is written, and a path keyed on log records finds nothing and falls
    through to `docs/extend/debug-your-site.md`, which cannot help with a cause outside the
    Worker (the third plan read's advisory). The step keys on what the reader sees, as the
    stale-tab step does, so it is the failure path's second step, ahead of every log read, and
    its remedy is the policy step's: add the editor to the application's policy ([f:agif8l,
    f:k40l86], one multi-id sentence).

### Heading policy

Every section heading is a task heading, a bare infinitive in sentence case (the register's
structure rules, Google's headings), except "Before you begin" and "See also", the Good Docs
how-to template's own section names. No page links an anchor on this page (grep over `docs/`
finds none), so no heading is fixed by an inbound link; the outline's `crossLinks` reach the page
by file alone. The committed headings "Prepare the roster", "Create the Access application",
"Write the verifier", "Verify the gate", "Resolve a refused sign-in", and "See also" stay. "Logout
and session lifetime under Access" is gone (departure 2). "Decide whether to switch" is gone: its
two paragraphs are the introduction's second paragraph (departure 1), so the first heading on the
page is "Before you begin", which is new. "Close the exposures outside the application" is new
(departure 5). "Wire the
resolver into the guard" becomes "Wire the resolver and deploy the Worker", since the section now
carries the deploy (departure 7); the tutorial's own "Describe the Worker and deploy it" is the
precedent for two actions in one task heading.

## The introduction, in Google's three parts

No heading. Opens on the default and why it exists, not an imperative contract. Citations live in the page's brief JSON.

1. Para 1: magic links are the default (email, one-time link, no GitHub account or password); zero-config because cairn is the identity system (D1 `AUTH_DB` holds roster, sessions, single-use tokens); the guard from `createAuthGuard` enforces it in server hooks and gates every `/admin` path except sign-in and its auth endpoints.
2. Para 2: why switch (editors already hold accounts in an IdP such as Google Workspace or Entra ID); Cloudflare Access in front of the Worker admits by policy; the switch adds an Access application plus a guard resolver turning the Access token into an email; roster stays in cairn (Access decides who reaches the admin, roster decides who may edit); needs a developer who can change server hooks and Zero Trust settings.
3. Para 3: costs of the switch: `identity` replaces the whole magic-link path (all editors or none; guard mints no token, sets no cookie); free Zero Trust plan user cap (link to plans page).
4. Para 4: prior knowledge (edited hooks file, Wrangler deploy, JWT verification sample read closely enough to own it); redirects: different sign-in email stays on magic links (Customize the sign-in email); another authenticating proxy writes its own `IdentityResolver` and replaces the Cloudflare steps; second population goes to Add a second sign-in group.

Superseded 2026-10-04 by Geoff's intro ruling (framing and reader-first intros, never an imperative opening); see docs/internal/briefs/extend/replace-magic-links-with-cloudflare-access.framing.md.

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
  (departure 9).

## Sections, in order

Each entry carries the heading; **Takes**, the one sentence a reader keeps, which is the
section's first sentence on the page; **Draws on**, the fact ids placed here with what each
contributes; the steps or shape; and **Hand-off**, the turn the section closes on, with any
subordination it carries.

### 1. Before you begin

- Heading: `## Before you begin`
- **Takes:** The switch starts from a site that already signs editors in by magic link, its first
  owner already in the roster, and a Zero Trust team connected to your identity provider.
  (anatomy sentence introducing the list, `no-claim`)
- **Draws on,** one bulleted precondition each, each with a link to what produces it:
  - A site whose guard signs editors in by magic link, deployed on its own hostname; link
    `docs/extend/add-cairn-to-a-sveltekit-app.md` (`no-claim`). This bullet is the page's one
    statement of the site's starting state; the introduction states the reader's knowledge, not
    the site's state, so the two never repeat each other (the first plan read's advisory).
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

### 2. Prepare the roster

- Heading: `## Prepare the roster`
- **Takes:** The Access application and cairn's roster are two admission lists that never
  reconcile automatically, and the email string the resolver returns is their only join, so every
  roster email must be the exact address the provider asserts before the deploy that switches the
  guard to identity. (f:k40l86, f:emrebl, f:g0206o, one multi-id sentence)
- **Draws on:** f:k40l86 (the application decides who reaches `/admin` at all, the roster who
  among them may edit; this is the claim's one full statement on the page), f:emrebl (the guard
  checks that the email is a non-empty string, trims and lowercases it, and looks it up with no
  cross-check of its own), f:g0206o (an alias in a roster row is refused as unknown from the
  deploy that enables `identity`, the fact's "moment the gate goes live"; the fix is the roster
  screen or `wrangler d1 execute` against `AUTH_DB`).
- **Steps,** one numbered list of two:
  1. In the roster screen, compare each editor's email with the primary address the provider
     asserts, not an alias (f:g0206o).
  2. Correct a mismatch in the roster screen or with `wrangler d1 execute` against `AUTH_DB`
     (f:g0206o).
- **Hand-off:** the other list is the application's policy, which the next section creates and
  fills.

### 3. Create the Access application

- Heading: `## Create the Access application`
- **Takes:** A self-hosted Access application admits a request to `/admin` only when it matches
  the application's policies and signs the user in through the connected provider, so the
  application must cover every admin path and take the email from a provider the signing-in user
  does not control. (f:agif8l, f:vnm1p5, f:33upyd, one multi-id sentence)
- **Draws on:** f:agif8l (self-hosted application layer in front of a Worker; only users who
  match the application's policies reach it; the connectors), f:vnm1p5 (paths covered and the
  preview path left out; most specific path first), f:k40l86 (secondary citation, its primary
  home the roster section: the policy is the application's admission list, the roster the other,
  and the guard refuses as unknown a user the policy admits whom the roster lacks), f:33upyd (a
  login method whose email the signing-in user controls lets that user sign in as any roster
  address; Access takes the email from the claim the provider returns), f:0gltjq (CORS off, since
  enabling it can make `X-Cairn-CSRF` settable cross-origin and defeat the guard's CSRF check),
  f:gs23fb (the AUD tag, separate from the application id; a verifier validates against the tag;
  it changes only when the application is deleted or recreated), f:s9s8mw (the team domain's
  form, `https://<team>.cloudflareaccess.com`), f:q0icwk (the session management page, linked as
  the source of the logout address).
- **Steps,** one numbered list, every step inside Zero Trust, location before action, one action
  a step, each explanation a short sub-paragraph under its step:
  1. In Zero Trust, create a self-hosted application for the site's hostname and connect your
     identity provider, following Cloudflare's self-hosted application guide (f:agif8l; link).
  2. In the application's paths, cover `/admin`, every path beneath it, and `/admin/__data.json`,
     SvelteKit's data-only fetch, and leave `/preview/<token>` uncovered (f:vnm1p5). Sub-paragraph:
     where paths overlap, Access applies the most specific path first (f:vnm1p5).
  3. In the application's policies, add a policy that admits every editor in the roster,
     following Cloudflare's policies page (f:agif8l for the policy deciding who reaches the
     application; link https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).
     Sub-paragraph, the one back-reference to the roster section's two-lists claim: this policy
     is the application's admission list, the one that must agree with the roster, so an editor
     it leaves out is stopped at Cloudflare's own page and never reaches the guard, and a user it
     admits whom the roster lacks is refused by the guard as unknown ([f:agif8l, f:k40l86], one
     multi-id sentence). The policy action's name and its rule selectors are Cloudflare's and no
     fact states them, so the page names them only through the link (filed as a facts hole, see
     "Friction filed"); the step is the third plan read's blocking finding, closed (departure 10).
  4. In the application's login methods, enable no method whose email claim the signing-in user
     controls (f:33upyd). Sub-paragraph, the trap beside the value (the hooks take): the guard
     admits whatever email the resolver returns once it matches a roster row, so a user who
     controls the claim can sign in as any roster address (f:33upyd); the residual risks are at
     `docs/extend/security-model.md#identity-modes-threat-surface` (`no-claim` link sentence).
  5. In the application's CORS settings, leave every setting off (f:0gltjq). Sub-paragraph: the
     `X-Cairn-CSRF` reason (f:0gltjq).
  6. In the application's **Additional settings**, copy the AUD tag (f:gs23fb). Sub-paragraph: the
     verifier validates against the tag, never the application's id, and the tag changes only when
     the application is deleted or recreated (f:gs23fb).
  7. Note the team domain, `https://<team>.cloudflareaccess.com`, and the logout address that
     Cloudflare's session management page gives (f:s9s8mw for the domain's form; the page link
     from f:q0icwk's source, https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
     No fact states the logout address itself, so the page links it and never spells it (filed as
     a facts hole, see "Friction filed").
- **Hand-off:** from the moment it is saved, the application challenges every request to `/admin`
  on the site's hostname, magic-link editors included; the guard behind it still signs them in by
  magic link until the deploy switches it to identity (departure 11); and two settings outside the
  application can still deliver an admin response around it.

### 4. Close the exposures outside the application

- Heading: `## Close the exposures outside the application`
- **Takes:** A cache rule that matches `/admin` can serve one editor's page to the next matching
  request, and an ungated `workers.dev` hostname answers `/admin` outside the application, so
  both are closed before the deploy that switches the guard to identity. (f:zt0oag, f:51uyqr, one
  multi-id sentence)
- **Draws on:** f:zt0oag (a cache rule can ignore the origin's `Cache-Control` and cache for a set
  TTL, overriding the engine's `private, no-store` so one editor's page reaches the next matching
  request), f:51uyqr (`workers_dev: false` alone leaves an existing preview URL setting alone;
  `preview_urls: false` closes it), f:jha9f7 (the guard makes no hostname check, so a hostname
  that reaches the Worker outside the gate is admitted whenever the resolver accepts the token),
  f:fe0dyh (secondary citation; its primary home is the verifier's requirements: a token issued
  before a logout or revoke keeps verifying at the origin until its `exp`, so on an ungated
  hostname the gate's revocation never bites).
- **Steps,** one numbered list of two, location before action, each explanation a short
  sub-paragraph under its step:
  1. In the zone's cache rules, confirm that no rule matches `/admin` (f:zt0oag). Sub-paragraph:
     the override and its consequence (f:zt0oag).
  2. In the Worker's Wrangler configuration, set both `workers_dev` and `preview_urls` to `false`
     (f:51uyqr). Sub-paragraph, the trap beside the value (the hooks take): Wrangler leaves an
     existing preview URL setting alone when `preview_urls` is omitted, so a site with preview
     URLs on still serves `/admin` on an ungated `workers.dev` hostname (f:51uyqr); the guard
     makes no hostname check, so it admits a request there whenever the resolver accepts the
     token it presents, and a token the gate has since revoked keeps verifying until its `exp`
     ([f:jha9f7, f:fe0dyh], one multi-id sentence). The setting takes effect at the deploy in
     "Wire the resolver and deploy the Worker" (`no-claim`, no code span, a hand-off clause).
- **Hand-off:** with the Cloudflare side closed, the code side starts from the three values you
  noted: the team domain, the AUD tag, and the logout address.

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
    in the request path (f:fe0dyh, one sentence with its qualification whole; this is the fact's
    primary home).
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
  returns `{ ok: true, email: payload.email }`. The `catch` calls `reasonFor(err)`; when it
  returns a reason, the `catch` returns `{ ok: false, reason }`, and when it returns `undefined`
  the `catch` rethrows, with a comment: rethrow a failure the mapping does not name, so the guard
  logs it at error with its message (f:fu4uis). Then the `reasonFor` helper, the site's addition,
  typed to return `string | undefined`, a `switch` on the error's `code` string: `ERR_JWT_EXPIRED`
  to `expired`; `ERR_JWT_CLAIM_VALIDATION_FAILED` to `audience` when its `claim` is `aud`,
  `issuer` when `iss`, else `invalid`; `ERR_JWKS_NO_MATCHING_KEY`,
  `ERR_JWKS_MULTIPLE_MATCHING_KEYS`, and `ERR_JWKS_TIMEOUT` to `keys`;
  `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`, `ERR_JWT_INVALID`, and `ERR_JWS_INVALID` to `invalid`;
  default `undefined`. The helper never returns the literal `error`, so under this sample the
  guard's `error` means a throw and nothing else. A comment in the code says to branch on `code`,
  never on `name`, since a minified bundle renames classes. One sentence after the code, cited,
  ties the helper to the rule: the helper maps `jose`'s error codes to the reasons the guard logs
  at error, so a wrong AUD tag or team domain alerts as a misconfigured gate rather than as a
  wave of invalid tokens, and a failure the mapping does not name reaches the log as a throw
  with its message (f:fu4uis; link `jose`'s error reference, https://github.com/panva/jose, the
  `errors` module). No prose sentence states what any `jose` code means beyond that; the mapping
  lives in the code.
- **The `label` field,** one sentence after the code: the optional `label` names the gate on the
  sign-in hand-off page and the two refusal pages, and defaults to "your organization's sign-in"
  (f:ojr3qm).
- **Hand-off:** the resolver is one option on the guard, and a deploy makes the switch.

### 6. Wire the resolver and deploy the Worker

- Heading: `## Wire the resolver and deploy the Worker`
- **Takes:** `createAuthGuard` returns a plain SvelteKit `Handle` whether or not `identity` is
  set, so the resolver goes in as one option, the guard composes through `sequence` as it did
  under magic links, and the deploy that uploads the changed Worker is the moment identity mode
  goes live. (f:dwc4kp, f:9ug9mo, one multi-id sentence)
- **Draws on:** f:gun084 (`identity` is one of the guard's four config members, beside `roles`,
  `access`, and `includeSubDomains`; the step sentence cites it), f:9ug9mo (`npx wrangler deploy`
  uploads the built Worker; the deploy step cites it), f:51uyqr (the Wrangler settings from the
  exposures section ride the same deploy; cited with f:9ug9mo in the deploy step's
  sub-paragraph), f:g0206o (the roster check starts to bite at the deploy; cited in the deploy
  step's sub-paragraph), f:4uqi5r (the guard awaits `identity.resolve` on every non-public
  `/admin` request and caches no verified identity, so the signature check runs once per request,
  including for a request that reaches the Worker without passing the gate; `resolveRateLimit`
  from `@glw907/cairn-cms/cloudflare` is best-effort back pressure a handle ahead of the guard
  can apply; link `docs/reference/cloudflare.md#resolveratelimit`), f:2glcaf (the effective
  session lifetime moves to the gate, and cairn's 30-day session no longer applies; the Access
  default and ceiling are left to Cloudflare's session management page, linked, no figure
  restated), f:8xxe3b (under `identity`, sign-out skips the session-row delete, clears every cairn
  cookie, and redirects to the gate's `logoutUrl`), f:q0icwk (Access then clears the browser's
  authorization cookie, and stops accepting that session's tokens shortly after, the figures left
  to the linked page).
- **Steps,** one numbered list of two, location before action, one action a step (the second plan
  read's blocking finding: the committed plan's single bullet left every edit local and nothing
  placed the go-live):
  1. In `src/hooks.server.ts`, pass the resolver as the guard's `identity` option (f:gun084).
     Then the hooks file, whole, showing the option beside another handle in `sequence` (the
     committed sample stands).
  2. In the project directory, build the site and deploy the Worker with `npm run build` and
     `npx wrangler deploy` (f:9ug9mo; link
     `docs/extend/add-cairn-to-a-sveltekit-app.md#describe-the-worker-and-deploy-it`, the
     tutorial's same two commands). Sub-paragraph, two sentences: this deploy carries the hooks
     option and the `workers_dev` and `preview_urls` settings from "Close the exposures outside
     the application" together ([f:9ug9mo, f:51uyqr]); it is the moment identity mode goes live,
     the guard trusting the gate's token from this request on, so an editor whose roster email
     the roster section did not correct is refused as unknown from this request on (f:g0206o,
     whose "moment the gate goes live" is this deploy; the sentence names the deploy, never the
     phrase, departure 11).
- **Explanation,** one paragraph group opening on a sentence that ties it to the steps: once the
  deployed guard carries the option, it does three things differently. The per-request resolve
  and the rate-limit hand-off (f:4uqi5r); the lifetime (f:2glcaf); the sign-out (f:8xxe3b,
  f:q0icwk). Three sentences to five, no more.
- **Hand-off:** with the site deployed, the checks below confirm each of these from outside.

### 7. Verify the gate

- Heading: `## Verify the gate`
- **Takes:** A working gate admits a rostered editor to `/admin`, sends a signed-out visitor to
  the gate's hostname, and serves nothing on an ungated hostname, and since no tool checks the
  login redirect or the `workers.dev` exposure, every check here runs by hand against the
  deployed site. (f:iaqcq6)
- **Draws on:** f:iaqcq6 (the two hand checks: the `/admin/login` redirect, the `workers.dev`
  and preview-alias probe), f:sbv5xj (a refusal leaves a `guard.refused` record with
  `reason: identity`), f:fu4uis (`auth.identity.unknown` is a separate warn event for a proven
  identity the roster does not recognize), f:8xxe3b (sign-out redirects to `logoutUrl`),
  f:51uyqr (each preview URL is probed too).
- **Steps,** one numbered list, each naming its observable result:
  1. From a browser signed in through Access as a rostered editor, open `/admin` on the deployed
     site and confirm the admin shell opens (`no-claim`).
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
- **Hand-off:** a check that fails stops at the gate's own page or leaves one of the guard's two
  records, and the next section works through both.

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
  identity-unresolved page instead of signing out), f:agif8l and f:k40l86 (an editor the
  application's policy does not admit never reaches the Worker, so no record exists, and the
  remedy is the policy; secondary citations, their primary homes the Access and roster sections).
- **Steps,** one numbered list of ordered checks, one action each, a conditional step stating its
  condition first. The two refusals a reader recognizes without a log read come first, the
  stale-tab sign-out and then the gate's own page, which leaves no cairn record (the third plan
  read's advisory; departure 12); the two records follow; then every reason the guard
  distinguishes has a conditional step, keyed on the logged reason alone, so the sequence tests
  one axis at a time (the first plan read's blocking finding on the committed plan's step 8):
  1. If the refused request was a sign-out from a tab left open, sign in through the gate again:
     the shell's logout posts to the bare `/admin`, a guarded path, so a tab whose gate session
     already ended is refused there before `logoutAction` runs (f:ig5pn3; the remedy is
     f:sbv5xj's). This step keys on what the request was, not on a logged reason, and needs no
     log read, so it precedes every log check; whatever reason a stale-tab refusal logs, it never
     routes through the `missing` path check.
  2. If the editor saw Cloudflare's block page rather than one of the guard's two refusal pages,
     the request never reached the site: in the application's policies, add the editor to the
     policy from "Create the Access application" ([f:agif8l, f:k40l86], one multi-id sentence).
     This step keys on what the reader sees, as step 1 does, and needs no log read, since the
     application stopped the request before the Worker and neither record exists; it is the most
     likely refusal right after the deploy, and without it the reader would fall through to the
     debug page, which cannot help with a cause outside the Worker.
  3. Otherwise, in Workers Logs, look for an `auth.identity.unknown` record from the refused
     request (f:fu4uis).
  4. If one appears, add or correct the editor's roster row so that it carries the address in the
     record's `email` field, the gate's confirmed address normalized; the next request succeeds
     (f:hilyos; the capped-and-normalized detail is subordinated to `docs/reference/log-events.md`,
     the `auth.identity.unknown` row and the `email` note, f:mjedcx).
  5. Otherwise, read the refusal's reason from the `detail` of the request's `guard.refused`
     record with `reason: identity` (f:sbv5xj; one action, the round-2 `:292-293` finding).
  6. If the reason is `expired`, `invalid`, or `no_email`, have the editor sign in through the
     gate again: the guard logs each at warn, below the four reasons that mark a misconfigured
     gate (f:fu4uis; the remedy is f:sbv5xj's). The three request-shaped reasons share one step
     because they share one remedy, and the step exists so that an ordinary `expired` refusal
     matches a step instead of falling through to the debug page.
  7. If the reason is `audience`, check the AUD tag in the config module against the one the
     application's **Additional settings** shows, the value step 6 of "Create the Access
     application" copied (f:fu4uis, f:gs23fb).
  8. If the reason is `issuer` or `keys`, check the team domain in the config module (f:fu4uis).
  9. If the reason is `missing`, confirm that the application's paths cover the requested path and
     that the request arrived on the primary hostname (f:fu4uis, f:vnm1p5).
  10. If the reason is `error`, the resolver threw, since the sample returns no `error` reason of
      its own and rethrows a failure its mapping does not name; read the thrown message the
      `guard.refused` record carries and fix the module (f:fu4uis for the throw logged at error;
      link the `guard.refused` row of `docs/reference/log-events.md`, which names the `error`
      field that carries the message, so the page names the field only through that link). Keyed
      on the reason alone, and true under this page's sample (the second plan read's advisory:
      the committed sample's default mapped every unmapped failure to `error`, so the word meant
      two things; the rethrow in departure 6 makes it mean one).
  11. If the refusal persists, work through `docs/extend/debug-your-site.md` (`no-claim`), the
      last step.
  The register editor's `:296-297` finding (the diagnostic covered `missing` and `invalid` only) is
  met by steps 6 to 10 together naming every reason in f:fu4uis's vocabulary: the three
  request-shaped reasons in step 6, the four misconfigured-gate reasons and `missing` in steps 7
  to 10. A site's own refusal word, which f:fu4uis also allows, is the resolver author's to
  diagnose and gets no step; step 11 catches it.
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
| Structural, `:12` [BLOCKING]: the introduction describes the page itself and fails the prior-knowledge item | Applies. Paragraph 2 states the reader's knowledge (a SvelteKit server hooks file edited, a Worker deployed with Wrangler, a JWT verification sample read); the finding's rewrite sentence, the magic-link site, is the first precondition under "Before you begin" with its link, stated once; no introduction sentence opens on the page or refers to a position |
| Structural, `:86-89`: preconditions carry no link to what produces them | Applies. "Before you begin" links `add-cairn-to-a-sveltekit-app.md` for the site, its compose section for `bootstrapOwner`, Cloudflare's `wrangler d1 execute` page, and the self-hosted application guide |
| Structural, `:157-158`: the config step exports values the page has not located | Applies. Access section step 7 collects the team domain and logout address beside step 6's AUD tag |
| Structural, `:199-204`: the sample returns `invalid` for everything, then a paragraph says a better verifier returns `audience` | Applies. The reason rule is a requirement before the sample, and the sample's `reasonFor` meets it |
| Structural, `:44-46, 67-68`: caption and roster opener both state the two-lists claim | Applies. The caption carries the request's path (f:fhit7f, f:vnm1p5, f:paotzb); f:k40l86 is stated once, in the roster section |
| Structural, `:58`: a stray stability-tier sentence in the decision section | Disposed by the plan. The sentence is dropped from the decision input, now the introduction's second paragraph; See also's reference link names the tier |
| Structural, `:242-244`: a noun-phrase heading in a task guide | Disposed by the plan. The section is dissolved (departure 2) |
| Register, `:86-89`: the `bootstrapOwner` garden path | Applies. The precondition sentence makes `bootstrapOwner` the subject and the link a parenthetical clause |
| Register, `:203-204`: the `audience` sentence restates the rule | Disposed by the plan. The sentence is gone with the sample's mapping |
| Register, `:44-46`: the caption repeats `:67-68` | Applies, as the structural row above |
| Register, `:269-270` versus `:292-293`: the failure section duplicates the verify step's sub-paragraph | Applies. Verify step 2 has no sub-paragraph; `detail` is explained once, in the failure path |
| Register, `:292-293`: a step joining find and read | Applies. Failure step 5 is one action |
| Register, `:296-297`: the diagnostic covers `missing` and `invalid` only | Applies. Step 6 covers `expired`, `invalid`, and `no_email` in one conditional step; steps 7 to 10 cover `audience`, `issuer` and `keys`, `missing`, and `error`; every reason in f:fu4uis's vocabulary has a step |
| Register, `:290-291`: flag for the claims checker | Applies. Failure step 4's "the next request succeeds" cites f:hilyos, which states it |
| Register, `:9-10`: the introduction's provider sentence | Applies. Paragraph 1's when-and-why sentence cites f:gw1oas and f:agif8l |
| Register, `:19, 298, 306, 308, 310`: links to pages not yet in the worktree | Not a change. All four slugs are in `docs/internal/outlines/extend.json`; the link gate counts them as pending |
| Fact read, `:87-89`: an unwrapped 133-character line | Applies. Every prose line wraps near 100 columns |
| Fact read, brief: the hooks-and-Zero-Trust sentence tagged `no-claim` | Not a change. The sentence is an anatomy sentence with no code span; if a code span enters it, cite `[f:dwc4kp, f:agif8l]` |
| Figure verifier, `:46`: the caption's last sentence nearly repeats the `accDescr` | Applies. The `accDescr` describes the drawing; the caption draws the consequence |
| Figure verifier, `:23`: `/healthz` missing from the diagram | Applies. f:paotzb is added as a carried fact for the figure (departure 8) |

Non-blocking round-2 findings this plan also takes: the explanation after the wire steps opens on
a tying sentence and runs five sentences at most; the `label` sentence sits with the sample that
sets it.

## Plan read 1 findings, disposed

The structural edit read the first version of this plan (2026-10-03) and returned fix, one
blocking finding and two advisory. All three were taken in the first revision and stay taken.

| Finding (plan region) | Disposition |
| --- | --- |
| [BLOCKING] Failure path: `expired`, `invalid`, and `no_email` matched no step, and the stale-tab step tested the request rather than the logged reason, so a stale-tab refusal logging `missing` reached the path check first | Taken. The stale-tab sign-out is step 1, a conditional keyed on the request and ahead of every log read (the block-page step from the third read is step 2, keyed the same way); the three request-shaped reasons have their own conditional step 6 with one remedy; steps 7 to 10 test the logged reason alone; `docs/extend/debug-your-site.md` stays the last step |
| [advisory] Introduction paragraph 2 stated the site's state, not the reader's knowledge, and repeated the first precondition | Taken. The prior-knowledge paragraph (paragraph 3 since the third revision) states the reader's knowledge with no code span (`no-claim`); the magic-link site is stated once, as the first "Before you begin" bullet with its link; the round-2 `:12` row records the move |
| [advisory] The "read instead" redirects were split between the introduction and the decision section | Taken. The rebrand-the-email redirect (the outline's cross-link) joins the introduction's wrong-place sentences; the decision input carries the all-or-nothing mechanism and the plan cap only, and since the third revision it is the introduction's second paragraph rather than a section |

## Plan read 2 findings, disposed

The structural edit read the first revision (2026-10-03, run `wf_fe61a650-884`) and returned fix,
one blocking finding and two advisory, and the run escalated on the second fix. Resolution run 2
takes all three.

| Finding (plan region) | Disposition |
| --- | --- |
| [BLOCKING] `:430-437`: no step deploys the site; the Wrangler change, the resolver module, and the hooks option are local edits, and Verify probes the live hostname and logs as if the change were live; the go-live moment is named twice and never placed | Taken. The wire section is "Wire the resolver and deploy the Worker", a two-step list: step 1 passes the resolver as `identity` in `src/hooks.server.ts`, step 2 builds and deploys the Worker (`npm run build`, `npx wrangler deploy`, f:9ug9mo, added as a carried fact, with the tutorial's deploy step linked). Step 2's sub-paragraph names the deploy as carrying the hooks option and the exposures section's Wrangler settings together, and as the moment identity mode goes live (the third read's advisory renamed it from "the gate goes live", departure 11) and the roster check from "Prepare the roster" starts to bite (f:g0206o). The hand-off reads "with the site deployed, the checks below confirm each of these from outside"; Verify step 1 opens `/admin` on the deployed site; the exposures section's Wrangler step says its setting takes effect at that deploy; the introduction's prior-knowledge paragraph adds a Worker deployed with Wrangler (departure 7) |
| [advisory] `:510-511`: the `error` step said the resolver threw, but the sample's `reasonFor` default also returned `error` for any unmapped `jose` failure, so a reader with a non-throwing `error` refusal would hunt for an exception that does not exist | Taken at the root. The sample's `reasonFor` returns `undefined` for a code it does not name and the `catch` rethrows, so the guard logs the failure at error with its message (f:fu4uis) and the literal `error` means a throw under this page's sample; the helper never returns `error` itself. Step 10 (step 9 before the third read's block-page step) is keyed on the reason alone and says so, and sends the reader to the thrown message the record carries, naming the `error` field only through the `guard.refused` row of `docs/reference/log-events.md`, which states it (departure 6). The overload itself, the guard writing `detail: "error"` for both a throw and a returned `error` reason, is filed as design friction (see "Friction filed") |
| [advisory] `:298-347`: "Create the Access application" ends with a zone cache-rule check and a Wrangler change, outside the application, so the heading undersells the section | Taken, by the split. Steps 7 and 8 become the two steps of a new section, "Close the exposures outside the application", with its own first sentence (f:zt0oag, f:51uyqr) and the no-hostname-check trap beside the Wrangler value ([f:jha9f7, f:fe0dyh]); "Create the Access application" keeps steps 1 to 6 (1 to 7 since the third revision's policy step), every one inside Zero Trust, and its first sentence now claims only what the application decides (f:agif8l, f:vnm1p5, f:33upyd). The outline's step order is unchanged (departure 5) |

## Plan read 3 findings, disposed

The structural edit read the second revision (2026-10-03, resolution run 2) and returned fix, one
blocking finding and three advisory. This third revision takes all four.

| Finding (plan region) | Disposition |
| --- | --- |
| [BLOCKING] `:366-387`: the plan argues two admission lists must agree, and the roster section hands off to "the application's" list, but no step in "Create the Access application" sets the policy that decides whom the application admits; a reader could create the application with a policy that leaves an editor out and lock that editor out at the gate | Taken. Step 3 of "Create the Access application", between the paths and the login methods, location first and one action: in the application's policies, add a policy that admits every editor in the roster (f:agif8l; Cloudflare's policies page linked). Its sub-paragraph is the one back-reference to the roster section's two-lists claim ([f:agif8l, f:k40l86]): the policy is the application's list, the one that must agree with the roster. Steps 3 to 6 are renumbered 4 to 7, and every row and constraint that named them follows (f:gs23fb step 6, f:s9s8mw and f:q0icwk step 7, f:0gltjq step 5, f:33upyd step 4; the failure path's `audience` step names step 6 as the tag's source). The roster section's hand-off names the policy. The argument paragraph states the policy half, and no fact states the action's name or the rule selectors, so the step names them only through the link (filed under "Friction filed"; departure 10) |
| [advisory] `:575-613`: every log-keyed failure step assumes the request reached the Worker; an editor the policy does not admit is stopped at Cloudflare's block page, leaves no `guard.refused` or `auth.identity.unknown` record, and falls through to `docs/extend/debug-your-site.md`, which cannot help with a cause outside the Worker | Taken. Failure step 2, a conditional keyed on what the reader sees, as step 1 is, ahead of every log read: if the editor saw Cloudflare's block page rather than one of the guard's two refusal pages, the request never reached the site, so add the editor to the application's policy ([f:agif8l, f:k40l86]). Steps 2 to 10 are renumbered 3 to 11, and every row that named them follows; the Verify section's hand-off names the gate's page beside the two records (departure 12) |
| [advisory] `:388-397, 494-495, 521-525`: "the gate goes live" named the deploy, but the application gates `/admin` from the moment it is saved, so the exposures section and the deploy step gave the reader two different go-live moments under one phrase | Taken. The Access section's hand-off states that the application challenges every request to `/admin` from the moment it is saved, magic-link editors included, and the guard still signs them in by magic link until the deploy; the roster and exposures sections close their work "before the deploy that switches the guard to identity"; the wire section's first sentence and deploy step name the deploy "the moment identity mode goes live"; the page never calls the deploy the gate going live. f:g0206o's "moment the gate goes live" is the fact's name for enabling `identity`, which the deploy does, and the deploy step cites it as such (departure 11; the drafting constraints carry the rule) |
| [advisory] `:100-103, 285-303`: "Decide whether to switch" is an explanation section between the introduction and the preconditions, against the task guide anatomy's order | Taken, by folding. The section's two paragraphs become the introduction's second paragraph, the decision input (f:v5ndhs, f:fhit7f, f:4olp4u), placed where the Sanity exemplar places its "right tool for the job?" callout, before the first heading, so the first heading after the introduction is "Before you begin" and the sections run in the anatomy's order. The sections are renumbered 1 to 9 and the heading policy records the dropped heading (departure 1) |

## Dispositions, every fact id

`carried` names the section the fact is placed under (its primary home when it is cited twice).
`subordinated` names the reference page or entry that states the fact and gives the reason; the
brief records it as a cut whose reason names the link. Each named entry was opened and read
before it was named. 37 carried (two added, f:paotzb and f:9ug9mo), 2 subordinated, 0 cut.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:v5ndhs | carried | Introduction (paragraph 2, the decision input's first sentence) |
| f:gs23fb | carried | Create the Access application (step 6); Resolve a refused sign-in (step 7) |
| f:g0206o | carried | Prepare the roster (first sentence and both steps); Wire the resolver and deploy the Worker (step 2's go-live sentence) |
| f:emrebl | carried | Prepare the roster (first sentence) |
| f:k40l86 | carried | Prepare the roster (first sentence, the claim's one full statement); Create the Access application (step 3's sub-paragraph, the one back-reference naming the policy as the application's list); Resolve a refused sign-in (step 2) |
| f:4olp4u | carried | Introduction (paragraph 2, the cap, with Cloudflare's plans page linked and no figure restated) |
| f:qhmydf | carried | Before you begin (the owner-row precondition) |
| f:zt0oag | carried | Close the exposures outside the application (first sentence; step 1) |
| f:vnm1p5 | carried | Create the Access application (first sentence; step 2); the figure caption; Resolve a refused sign-in (step 9); See also (the preview line) |
| f:0gltjq | carried | Create the Access application (step 5) |
| f:51uyqr | carried | Close the exposures outside the application (first sentence; step 2); Wire the resolver and deploy the Worker (step 2's sub-paragraph, with f:9ug9mo); Verify the gate (step 6) |
| f:iaqcq6 | carried | Verify the gate (first sentence, steps 5 and 6) |
| f:lyaf6p | carried | Write the verifier (first sentence; step 1) |
| f:42fdqq | carried | Write the verifier (requirements) |
| f:zas1dk | carried | Write the verifier (requirements) |
| f:q0icwk | carried | Wire the resolver and deploy the Worker (the sign-out sentence; figures left to the linked page); Create the Access application (step 7 links the same page for the logout address) |
| f:3p8yu8 | carried | Introduction (paragraph 3, the other-proxy sentence); Write the verifier (step 3) |
| f:agif8l | carried | Introduction (paragraph 1); Before you begin (the Zero Trust precondition); Create the Access application (first sentence, steps 1 and 3); Resolve a refused sign-in (step 2) |
| f:hilyos | carried | Write the verifier (the no-role requirement); Resolve a refused sign-in (first sentence, step 4) |
| f:fu4uis | carried | Write the verifier (the reason requirement; the rethrow comment; the sentence after the sample); Verify the gate (step 3); Resolve a refused sign-in (steps 3, 6 to 10) |
| f:ig5pn3 | carried | Resolve a refused sign-in (step 1, the conditional ahead of every log read) |
| f:fe0dyh | carried | Write the verifier (the stateless-validation requirement, with its residual in the same sentence, the primary home); Close the exposures outside the application (step 2's trap sentence, with f:jha9f7) |
| f:dwc4kp | carried | Wire the resolver and deploy the Worker (first sentence) |
| f:4uqi5r | carried | Wire the resolver and deploy the Worker (the per-request sentence; `docs/reference/cloudflare.md#resolveratelimit` linked) |
| f:33upyd | carried | Create the Access application (first sentence; step 4, the trap beside the value) |
| f:8289h7 | carried | Introduction (paragraph 1, the contract) |
| f:gw1oas | carried | Introduction (paragraph 1) |
| f:mjedcx | subordinated | `docs/reference/log-events.md`, the `auth.identity.unknown` row and the `email` note beneath the table: both state that the field is the gate's confirmed address, normalized and capped, logged after the roster lookup fails. The page's remedy step cites f:hilyos for the normalized email and links the row |
| f:2glcaf | carried | Wire the resolver and deploy the Worker (the lifetime sentence; Access's default and ceiling left to the linked session management page) |
| f:jha9f7 | carried | Close the exposures outside the application (step 2's trap sentence) |
| f:fhit7f | carried | Introduction (paragraph 2, the mechanism sentence); the figure caption |
| f:s9s8mw | carried | Write the verifier (the sample's lead-in; the team domain's form in step 2); Create the Access application (step 7, the domain's form) |
| f:pwmybh | subordinated | `docs/reference/sveltekit.md#identityresolver`, the `IdentityResolver` row: states that `logoutUrl` is validated once at `createAuthGuard`'s construction as a root-relative path or an absolute `https:` URL, or construction throws. The config module step links it; the percent-decoding and character rules are detail no step depends on |
| f:ojr3qm | carried | Write the verifier (the `label` sentence after the sample) |
| f:gun084 | carried | Wire the resolver and deploy the Worker (step 1) |
| f:8xxe3b | carried | Wire the resolver and deploy the Worker (the sign-out sentence); Verify the gate (step 4) |
| f:sbv5xj | carried | Resolve a refused sign-in (first sentence, step 5; the sign-in-again remedy in steps 1 and 6); Verify the gate (step 2) |
| f:paotzb | carried | The figure (`accDescr` and caption); added by this plan for the outline's `figureNote` |
| f:9ug9mo | carried | Wire the resolver and deploy the Worker (first sentence; step 2, the deploy command); added by this plan for the go-live step |

## Friction filed

Four entries in `docs/internal/docs-friction-log.md`, filed by this plan step on 2026-10-03, none
blocking the page. Two were filed by the first version and stand: the facts container holds no
fact for Access's logout address, so step 7 of the Access section links the session management
page and the sample imports the value from the config module without spelling it; and identity
mode has no owner bootstrap, so the first owner is a precondition seeded out of band. The third,
filed by the second revision: the guard writes `detail: "error"` on `guard.refused` both for a
resolver that threw (with the message in a separate `error` field) and for a resolver that
returned the literal `error` as its reason (no `error` field), at the same level, so the page's
sample rethrows an unmapped failure instead of defaulting to `error`, and the failure path's
`error` step holds only under that sample. The fourth, filed by this revision: the facts
container holds no fact for the Access policy itself, the action that admits and the rule
selectors a roster maps onto, so the policy step (f:agif8l, f:k40l86) names the policy's job and
links Cloudflare's policies page for the rest, spelling neither on the page. The three caveats
this page also carries (the `label` doc comment naming a retired probe condition, the stale-tab
logout refusal, and the free-form refusal reason that sets the log level) were filed on
2026-09-30 and are not refiled.

## Drafting constraints

- The introduction's first sentence is the contract; no introduction sentence opens on the page
  or names a position on it.
- Every section heading is a bare infinitive in sentence case, except "Before you begin" and "See
  also".
- Each step names its location before its action and holds one action; a conditional step states
  its condition first; a one-step procedure is a single bulleted item.
- The introduction's second paragraph carries the decision input (f:v5ndhs, f:fhit7f, f:4olp4u)
  in three sentences at most, and the first heading after the introduction is "Before you
  begin"; no explanation section precedes the preconditions.
- The Access section's policy step is one action, a policy that admits every editor in the
  roster; the action's name and the rule selectors are the linked Cloudflare policies page's and
  are spelled nowhere on the page; its sub-paragraph is the only sentence outside the roster
  section that refers to the two-lists claim.
- Two moments are named apart and never by one phrase: the application challenges `/admin` from
  the moment it is saved (the Access section's hand-off), and identity mode goes live at the
  deploy (the wire section). The page never calls the deploy "the gate going live"; the roster
  and exposures sections close their work "before the deploy that switches the guard to
  identity"; f:g0206o is cited for the deploy's refusal consequence with the deploy named, not the
  fact's phrase.
- The wire section holds two steps, the hooks option and the deploy, and names the deploy as the
  moment identity mode goes live; no step before it changes what the guard trusts, and the
  Verify section says "the deployed site" in its first check.
- The failure path gives every refusal reason the guard distinguishes a conditional step keyed on
  the logged reason alone, the three request-shaped reasons sharing one; the stale-tab sign-out is
  its first step and the gate's block page its second, both keyed on what the reader sees and
  ahead of every log read; `docs/extend/debug-your-site.md` is its last.
- The site's magic-link starting state is stated once, as the first precondition; the
  introduction states the reader's knowledge and carries every "read instead" redirect.
- An explanation that follows a step opens on a sentence tying it to the step, and no explanation
  runs past five sentences before the next step or heading.
- A vendor figure is linked, never restated: the Zero Trust user cap, Access's session duration
  default and ceiling, and the seconds after a logout before tokens stop being accepted.
- The logout address is never spelled on the page; step 7 of the Access section and the config
  module's comment point at Cloudflare's session management page.
- The sample's verification follows Cloudflare's sample; the `reasonFor` helper branches on `code`,
  returns `undefined` for a code it does not name, and never returns the literal `error`; the
  `catch` rethrows on `undefined` with its one comment; one cited sentence follows the block and
  no prose names an individual `jose` code.
- The `error` field of `guard.refused` is named only in a sentence that links the row of
  `docs/reference/log-events.md` that states it; no fact on this page carries the field.
- The two-lists claim (f:k40l86) is stated in full once, in the roster section's first sentence;
  the policy step's sub-paragraph refers back to it in one clause; the caption describes the
  request's path.
- A sentence that synthesizes facts cites them as an array; the plan's "one multi-id sentence"
  markers name the intended ones. A `cuts` list in the brief mirrors the two subordinated rows,
  each reason naming the reference link.
- Every prose line wraps near 100 columns.
- The page links the stage 2b pages it names (`add-a-second-sign-in-group`, `debug-your-site`,
  `restrict-admin-access`, `share-a-draft-preview`); docs-links counts them as pending.
