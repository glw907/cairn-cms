# Cairn docs rewrite: content outline (proposal)

Status: proposal, uncommitted. Adversarially reviewed twice (the doc list, then
this outline), and corrected against the real code after the second review found
that the first draft trusted the CLAUDE.md and README shorthand over the type
definitions in several load-bearing spots. This is the content blueprint for the
docs rewrite, one step past the recommended doc set. It draws on the external
standards (Google developer docs, the Microsoft Learn content-type model, GitHub
community standards, npm packaging, and TypeScript and Svelte conventions), the
reviewed doc list, and what the engine actually does as of 0.60.1. It was written
without reading the existing `docs/` tree, by design; the grounding comes from
the code (`src/lib`), `package.json`, `ROADMAP.md`, and `docs/STATUS.md`.

Each doc carries a purpose line, a section outline where every section is a
one-line stub of what goes there, a length guideline, and a grounding note (the
standard skeleton plus the cairn behavior it documents).

## Two unbuilt features the rewrite must not document as shipping

These determine the structure of several docs, so they sit at the top:

- **`create-cairn-site` does not exist yet.** It's the last planned engine
  deliverable (`ROADMAP.md`), with no bin, package, or `src` reference today. The
  README quickstart, the tutorial, and the editor-corpus delivery must be written
  against the real manual mount (a `src/lib/cairn.config.ts` adapter plus
  `createCairnAdmin` over an `admin/[...path]` catch-all route, the path the
  showcase uses), with the scaffolder added as a future shortcut once it ships.
- **The `CairnExtension` and `AdminPanel` seam is reserved, not built.** The
  types exist but the dispatch route is a future plan (`types.ts`: "Reserved and
  unused in the rebuild"). The "extend the admin" how-to is therefore deferred;
  the real, built customization knobs (the directive registry, the icon set, the
  preview styling, the nav menu) are adapter config, documented in the adapter
  guide and the configuration reference.

## Length rubric

Word counts are prose only and exclude code samples and tables.

- **Stub, 30 to 150 words.** FAQ answers, a single reference entry, template
  files.
- **Short, 150 to 400 words.** A focused how-to, an editor page, a light
  concept, the security policy.
- **Medium, 400 to 900 words.** The overview, a substantial how-to, the
  contributor guide, the operate-and-diagnose guide.
- **Long, 900 to 2000 words.** The tutorial, the adapter guide, the deploy
  guide, the merged explanation.
- **Reference, sized by surface.** A per-page intro of 100 words or less, then
  per-entry prose tuned to the entry's weight. The total scales with the count
  of exports, events, or fields, not with prose ambition.

Rules that bound every doc, from the standards:

- Procedures cap at 12 numbered steps (Microsoft); chunk anything longer, one
  action per step.
- Paragraphs run 3 to 7 lines; lists hold 2 to 7 items.
- Every action step shows its command or code and the expected result (Google).
  A reference page opens with a 5 to 20 line example.
- Diagram budget: one for the overview, one for the branch-and-publish
  explanation. Avoid diagrams elsewhere.

## Cross-cutting conventions

- **Two registers.** The developer arm follows the Google and Microsoft
  developer register, which the Vale Google package already enforces over
  `docs/`. The editor corpus follows Microsoft's plain end-user register: second
  person, no unexplained jargon, and "sign in," never "log in."
- **Markdown source is the truth.** The editor docs never describe a WYSIWYG
  canvas; the preview stays read-only and the markdown is the surface.
- **Editor corpus delivery: in-admin first (decided 2026-06-23).** Author the
  editor pages once, canonically, in the plain end-user register, and deliver
  them primarily inside the admin, building on the help affordances that already
  ship (`MarkdownHelpDialog`, `ShortcutsDialog`). Because the admin knows the
  site's configuration at runtime, the in-admin help can show only the features a
  given site has enabled. A generic hosted copy on the docs site is a cheap
  secondary for maintainers who want a shareable URL. Per-site scaffolded
  tailoring is deferred until `create-cairn-site` ships. The implication for the
  rewrite: building out the admin help surface is part of the work, so the editor
  pages are help-panel content authored to fit the UI, not standalone markdown.

---

## 1. Repo-level and project-health files

### README.md

- Purpose: the npm and GitHub front door, and the only doc most registry
  visitors read. It must stand alone.
- Length: short to medium, 300 to 600 words. Anything deeper belongs in the docs
  and gets linked, not inlined.
- Sections:
  1. Name and one-line description: an embedded, magic-link,
     GitHub-committing content management system (CMS) for SvelteKit on
     Cloudflare.
  2. Badges: npm version, MIT license, CI status.
  3. Who it's for and how it differs: non-technical authors edit markdown and
     sign in by email with no GitHub account; saves commit to git through a
     GitHub App and auto-deploy; the engine is design-agnostic, so each site
     supplies an adapter (its content concepts, its GitHub and email config, its
     field schemas, and its `render` function); the stack is Cloudflare-native
     (D1, R2, Workers, email). State plainly what it isn't: not a hosted service,
     not WYSIWYG, not open-ended collections.
  4. Requirements: SvelteKit `^2.12`, Svelte `^5.56.3`, a Cloudflare Workers
     Paid plan, a GitHub App, and a D1 database.
  5. Install: the one `npm i` line.
  6. A 60-second quickstart: create `src/lib/cairn.config.ts`, mount
     `createCairnAdmin` on an `admin/[...path]` catch-all, then a pointer to the
     tutorial. A forward note that `create-cairn-site` will collapse this once it
     ships.
  7. Links: developer docs, editor help, the changelog, the license, issues.
- Grounding: npm README-as-homepage, Google README rules, and the
  lead-with-positioning pattern from the CMS survey. Documents the real install
  and mount surface and the peer floors.

### LICENSE

- Purpose: the MIT grant.
- Length: the MIT template verbatim.
- Sections: the standard text with the copyright holder and year.
- Grounding: GitHub and npm both expect it, and it ships in the tarball.

### CHANGELOG.md

- Purpose: the curated, human-readable version history, and the de facto
  migration notes until 1.0.
- Length: grows over time; each release entry is a stub to short.
- Sections:
  1. A leading note that the project follows semantic versioning and this
     format.
  2. An `Unreleased` section.
  3. Per-version blocks, newest first, under Added, Changed, Deprecated,
     Removed, Fixed, and Security.
  4. A "Consumers must" callout on any breaking change, since the package
     publishes before dependent site code.
- Grounding: Keep a Changelog 1.1.0, semantic versioning, and cairn's
  release-and-versioning practice. GitHub Releases mirror it.

### CONTRIBUTING.md

- Purpose: how to set up, test, and submit a change to the engine.
- Length: medium, 400 to 700 words.
- Sections:
  1. Prerequisites and setup: clone, `npm i`, and the `examples/showcase`
     proving ground through the `file:../..` path.
  2. The gate that must pass, matching the real scripts: `npm run check`
     (svelte-check at 0/0), `npm test`, and the `check:*` family
     (`check:package`, `check:reference`, `check:reference:signatures`,
     `check:readiness`, `check:docs`, `check:version`, `check:prose`,
     `check:comments`) plus `lint`. Point to the pass-end ritual as the
     canonical list rather than duplicating it.
  3. The test-first expectation against the suite.
  4. The branch and worktree-per-pass model that keeps `main` releasable.
  5. Commit conventions: Conventional Commits and the co-author footer.
  6. Where to ask a question.
- Grounding: GitHub contributor guidelines. Documents the real cairn gate and
  workflow.

### CODE_OF_CONDUCT.md

- Purpose: community behavioral standards.
- Length: the Contributor Covenant template verbatim.
- Sections: the Covenant text plus an enforcement contact.
- Grounding: a GitHub community standard at zero ongoing cost.

### SECURITY.md

- Purpose: how to report a vulnerability privately, and what falls in scope.
- Length: short, 150 to 300 words.
- Sections:
  1. Supported versions.
  2. How to report: GitHub private vulnerability reporting or a contact, with a
     request not to open a public issue.
  3. The scope worth naming: magic-link auth, D1 sessions, the GitHub App
     private key, and the cross-site request forgery (CSRF) guard.
  4. What to expect after a report.
- Grounding: GitHub security-policy guidance. Reflects cairn's real threat
  surface.

### Issue and pull request templates

- Purpose: structure incoming reports and changes.
- Length: a short form each.
- Sections: a bug template (version, repro, expected versus actual, any log
  event names seen); a feature template; a pull request template (what and why,
  the gate checklist, a docs-updated checkbox).
- Grounding: GitHub issue and pull request template guidance.

### Repository metadata

- Purpose: discovery on GitHub and npm.
- Length: not prose; supply the recommended values.
- Content: an About description, topics (`cms`, `sveltekit`, `cloudflare`,
  `github`, `magic-link`, `markdown`, matching the existing `package.json`
  `keywords`), and the `package.json` `description`, `homepage`, `repository`,
  and `bugs` fields, which already point at the GitHub repo.
- Grounding: GitHub topics and npm registry discovery.

---

## 2. Developer documentation

The developer arm follows the Diátaxis split (tutorial, how-to, reference,
explanation) on one docs site.

### Overview

- Purpose: orient a developer to what cairn is, what it's for, and where to go.
  This page merges the landing and the "what is cairn" overview.
- Length: medium, 500 to 800 words, one diagram.
- Sections:
  1. What cairn is and the problem it solves, from an engineering view rather
     than a pitch: a top-notch markdown authoring experience over content in your
     own git repo, edited by non-technical authors who never touch git, on
     Cloudflare.
  2. The model in one diagram: sign in by email, edit markdown, save to a
     per-entry branch, Publish to `main`, auto-deploy.
  3. Who supplies what: the engine versus the site adapter (`CairnAdapter` at
     `src/lib/cairn.config.ts`).
  4. When to use it and when not to, linking to the "is cairn right for you?"
     page for the full audience fit and the comparison table.
  5. Where to go next, routing developers to the tutorial, the deploy guide, or
     the adapter guide, and editors to the in-admin help.
- Grounding: the Microsoft Overview template and Google landing-page rules.
  Documents the whole-system shape.

### Tutorial: build your first cairn site

- Purpose: the single best end-to-end path from nothing to a published entry,
  written against the real manual mount.
- Length: long, 1200 to 2000 words, the longest doc.
- Sections:
  1. What you'll build and the prerequisites: a Cloudflare account with Workers
     Paid, a GitHub App, Node.
  2. Install the package and write a minimal `src/lib/cairn.config.ts`: a
     `siteName`, one concept under `content`, the `backend` and `sender`, and a
     `render` function.
  3. Mount the admin: a `createCairnAdmin` catch-all at `admin/[...path]`, and
     `CairnHead` in the public site's head.
  4. Wire the credentials at a high level (the GitHub App, D1, the email
     sender), each linking to the deploy guide for depth.
  5. Run locally. Flag the known rough edge: a newcomer-friendly local backend
     is a planned deliverable, not yet shipped, so state the current path
     honestly.
  6. Make and publish a first entry.
  7. Verify the commit landed and the deploy ran.
  8. Clean up and next steps. A forward note that `create-cairn-site` will later
     collapse steps 2 and 3.
- Grounding: the Microsoft Tutorial template (single best path), Diátaxis, and
  Svelte's tutorial-first onboarding.

### How-to: write a site adapter

- Purpose: implement the `CairnAdapter` contract that makes cairn work for one
  site. This is the headline developer task.
- Length: long, 1200 to 1800 words, with a code sample per member.
- Sections:
  1. Prerequisites and the adapter shape at a glance (`CairnAdapter` at
     `src/lib/cairn.config.ts`, folded by `composeRuntime` into the runtime that
     `createCairnAdmin` serves).
  2. `siteName`, `backend` (owner, repo, branch, appId, installationId), and
     `sender` (from, replyTo).
  3. The `content` concepts: `posts` and `pages` as `ConceptConfig` (dir, label,
     singular, schema, summaryFields).
  4. The field schema: declare each concept's `schema` with `defineFields` and
     the field-type union (text, textarea, date, boolean, tags, free tags,
     image).
  5. `render(md, opts?)`: the site's single renderer, called by both the preview
     and every public page, with its `stagger`, `resolve`, and `resolveMedia`
     options.
  6. The optional members: `registry` (directive components), `icons`,
     `navMenu`, `preview` (the preview-frame styling, including `byConcept`), and
     `assets` (R2 media).
  7. A note on ids and slugs: ids are the markdown filename, there is no slug
     codec, and per-concept URL policy (`permalink`, `datePrefix`) lives in the
     YAML site-config, not the adapter.
  8. Verify with `cairn-doctor`.
- Grounding: Diátaxis how-to plus the guide-and-reference pairing. Documents the
  real `CairnAdapter` interface (`src/lib/content/types.ts`).

### How-to: deploy to Cloudflare

- Purpose: stand up the full runtime for a cairn site.
- Length: long, 1200 to 1800 words, the densest operational doc. Chunk each
  provider setup as its own sub-procedure under the 12-step cap.
- Sections:
  1. Prerequisites, named explicitly: a Workers Paid plan, a GitHub
     account or org that can install a GitHub App, and a domain for the email
     sender.
  2. Provision D1 (`AUTH_DB`): create the database, then apply the auth schema,
     each as its own step with its `wrangler d1` command and expected output.
  3. Register the GitHub App and capture `appId`/`installationId` for the
     adapter `backend`; store the private key as a base64 secret (the PKCS#1 to
     PKCS#8 note).
  4. Onboard the email sender: `wrangler email sending enable <domain>`, the
     `E_SENDER_NOT_VERIFIED` gotcha, and the Workers Paid requirement.
  5. Set the bindings and secrets: `AUTH_DB`, the `EMAIL` binding, the R2 bucket
     binding if `assets` is on, the GitHub App key secret, and the Anthropic key
     if tidy is on. Note that backend and sender identity live in the adapter
     while the secrets are Worker bindings. The per-site `sync.sh` is a consumer
     convention, linked, not an engine artifact.
  6. Mount the composer and the catch-all route.
  7. Deploy and verify with `cairn-doctor --probe`.
  8. What you must keep secret: the App private key, the D1 binding, any session
     secret.
- Grounding: analogous self-hosting guides and the Microsoft how-to. Documents
  the real Cloudflare and GitHub App wiring and the adapter `backend`/`sender`
  split.

### How-to: operate and diagnose a live site

- Purpose: the day-two doc for reading what a deployed site does. This is new to
  the set.
- Length: medium, 500 to 800 words.
- Sections:
  1. Turn on Workers Logs (`observability.enabled` in `wrangler.jsonc`).
  2. The log envelope and the event families: auth, commit, entry and publish,
     config and github, guard, media, dictionary and tidy.
  3. Filter by `event` or `editor`. Call out the day-two symptoms an operator
     filters for: `media.upload_failed`, `publish.failed`, `github.unreachable`,
     a `guard.rejected` reason.
  4. Map a symptom to an event.
  5. Run `cairn-doctor` and `--probe`.
  6. What's safe to paste: records carry an editor email but never a token or
     session id.
- Grounding: cairn's structured-log surface and Microsoft troubleshooting
  guidance. Documents the real logging and doctor tooling.

### Reference: API

- Purpose: the complete public API, one page per export subpath.
- Length: reference-sized; the hand-authoring load is the whole symbol surface,
  not just intros, because no doc generator exists yet (see open notes).
- Sections:
  1. A short intro: the `exports` map is a semver contract, since removing a
     subpath or condition breaks consumers and adding one doesn't, and
     `check:reference` enforces one page per subpath.
  2. One page per public subpath: the root, `./sveltekit`, `./components`,
     `./components/spellcheck-worker`, the two `./components/spellcheck-assets/*`
     static assets, `./render`, `./delivery`, `./delivery/head`,
     `./delivery/data`, `./media`, `./vite`, and `./ambient`.
  3. Per symbol: signature, parameters, return, thrown errors, remarks, and a 5
     to 20 line example.
  4. One line on the consumer-side `moduleResolution` requirement for subpath
     types.
- Grounding: Google and Microsoft reference rules, TSDoc, and the
  exports-as-contract convention. Verified against the `package.json` `exports`
  map; matches the `check:reference` discipline.

### Reference: components

- Purpose: the props and mount contract of the components a consumer wires
  directly.
- Length: reference-sized; small once triaged.
- Sections: most of the 18 `./components` exports are internal but exported, and
  `createCairnAdmin` composes them; a consumer does not hand-mount `LoginPage`,
  `EditPage`, `ConceptList`, and the dialogs. This page covers only what a
  consumer wires or overrides directly (the `MarkdownEditor` seam, and the admin
  entry the catch-all composes), and points `CairnHead` to its real home in the
  `./delivery/head` page. The exact public subset needs a mountable-versus-
  internal triage against what `createCairnAdmin` composes; do that triage before
  writing, rather than guessing a count.
- Grounding: TypeScript and Svelte component-doc conventions. Verified against
  `src/lib/components/index.ts` (18 exports) and `src/lib/delivery/head.ts`
  (`CairnHead`).

### Reference: configuration

- Purpose: the enumerated config surface, split by where it lives.
- Length: medium to long, 700 to 1300 words, mostly tables.
- Sections:
  1. The adapter (`CairnAdapter` in `src/lib/cairn.config.ts`): every member
     with its type and contract, `siteName`, `content`, `backend`, `sender`,
     `render`, the optional manifest and dictionary paths, `registry`, `icons`,
     `navMenu`, `preview`, and `assets`.
  2. The field-declaration API: `defineFields`, the `ConceptConfig` shape (dir,
     label, singular, schema, summaryFields), and the field-type union as a
     table.
  3. The YAML site-config (a separate surface from the adapter): the nav menus,
     and the per-concept URL policy (`permalink`, `datePrefix`) via
     `parseSiteConfig`/`SiteConfig`.
  4. The preview member in detail: `stylesheets`, `bodyClass`, `containerClass`,
     and the `byConcept` overrides.
- Grounding: TypeScript and Svelte reference rules, and the Starlight
  frontmatter-reference pattern. Verified against `types.ts` and the schema and
  site-config modules.

### Reference: log events and cairn-doctor

- Purpose: the observable event contract and the readiness tooling.
- Length: table-driven, medium to long once the full surface is counted. Budget
  about 20 to 40 words per event row, grouped by family with a shared per-family
  preamble, since there are 32 events, not a handful.
- Sections:
  1. The full event table, grouped: auth (6), commit (`commit.succeeded`,
     `commit.failed`), entry and publish (`entry.published`, `entry.discarded`,
     `publish.failed`), config and github (`config.invalid`,
     `github.unreachable`), `guard.rejected`, the media family (12, from
     `media.uploaded` through `media.alt_propagated`), dictionary (2), and tidy
     (4).
  2. The reasons: `guard.rejected` carries `csrf`, `origin`, `https`, or
     `bindings`; `commit.failed` carries `conflict` (a stale-edit collision) or
     an `error` field (the GitHub failure).
  3. The `cairn-doctor` checks and exit codes (0, 1, 2), and what `--probe`
     does.
- Grounding: Microsoft reference rules. Verified against
  `src/lib/log/events.ts` (32 events) and the doctor bin. The events file names
  this reference as its kept-in-step contract, and renaming an event is a
  breaking change.

### Explanation: is cairn right for you?

- Purpose: help an evaluator decide whether to adopt cairn, honestly. This is the
  positioning page the analogous git-based CMSes lead with.
- Length: medium, 500 to 900 words, plus one comparison table.
- Sections:
  1. The problem cairn solves: a first-class markdown authoring experience over
     content committed to your own git repo, edited by non-technical authors who
     never touch git or GitHub, with no external content database and no hosted
     backend. cairn assumes Cloudflare: it runs on Workers, D1, R2, and Email, and
     does not target another host.
  2. What makes cairn distinct. The throughline is deliberate opinionation:
     cairn commits to one stack (SvelteKit and Cloudflare) and one editing model
     (markdown-first) so it can be excellent at that combination rather than
     adequate at everything. The strengths below follow from that bet, each with
     the tradeoff it carries:
     - A markdown editing experience that draws on iA Writer and kindred writing
       tools: a quiet, focused surface with live preview, not the form-driven
       editor most git-based CMSes ship. For a non-technical author it is
       friendlier than a config-driven tool like Sveltia or Decap.
     - It leans on Cloudflare's own primitives (D1, R2, Workers, Email), and
       Cloudflare is a robust platform with strong tooling. A team already
       committed to Cloudflare gets a native fit, enterprise-grade hosting at very
       low cost, and an easy path. The flip side is the hard Cloudflare assumption.
     - An opinionated, fixed content model (Posts and Pages) that keeps both the
       editor and the setup clean, which suits most content situations. The honest
       tradeoff is flexibility: a site that needs many custom or arbitrary content
       types will outgrow it, though few sites do.
     - An admin designed for extension. Today a developer customizes through the
       adapter (the directive component registry, icons, preview styling, nav) and
       builds any further surface outside the admin with the package's exports. A
       fuller in-admin seam for custom panels and actions is on the roadmap, not
       yet shipped, so keep present-tense claims to what exists.
  3. Who should use cairn: developers who prefer SvelteKit and Cloudflare and who
     support non-technical editors that need a top-notch editing environment. In
     practice that is a team running on Cloudflare that keeps its content in its
     own repo as markdown, has non-technical authors, and keeps design in the
     developers' hands. The sweet spot is a small-to-medium website,
     so the fit spans non-profits, small businesses, and larger organizations that
     need a modest site. The common draw is enterprise-grade Cloudflare hosting at
     very low cost, with an editor that stays friendly for non-technical authors.
  4. Who should not use cairn: anyone who prefers WYSIWYG or rich-text authoring
     over markdown, needs many or arbitrary content types rather than fixed
     concepts, runs a framework other than SvelteKit or a host other than
     Cloudflare (cairn assumes both), wants a hosted turnkey product, needs a
     large plugin ecosystem, or needs a stable release with a maintenance team
     behind it. cairn is 0.x, breaks between minor versions, and is
     solo-maintained; say so plainly.
  5. The honest comparison table: cairn against a focused set of genuinely
     comparable tools (Keystatic, Decap or Sveltia, TinaCMS) and one hosted
     contrast (Sanity or Contentful), across the dimensions that actually
     separate them: where content lives, how editors authenticate, the editor
     experience for a non-technical author, framework support, hosting model,
     content model, WYSIWYG, maturity and ecosystem, and cost. The table states
     where cairn loses, not only where it wins. cairn loses on framework reach
     (SvelteKit only) and maturity (0.x, solo-maintained, no plugin ecosystem),
     and it asks a real setup cost (a Workers Paid plan and a GitHub App). Two
     rows are deliberate tradeoffs rather than plain losses: no WYSIWYG (the
     markdown is the surface, by design) and the fixed content model (cleaner for
     the common case, less flexible for the rare one). cairn wins where it is
     genuinely unusual: editors need no GitHub account (magic-link email), the
     content stays as markdown in your own repo with the author preserved in git
     history, and the editing surface is a deliberately polished, iA
     Writer-inspired one, with live preview, directive highlighting, spellcheck,
     and optional AI tidy.
  6. When another tool is the better choice, naming it plainly.
- Maintenance caveat: keep the table to structural differences that rarely
  change, not a feature-by-feature grid that goes stale, and review it each
  release.
- Grounding: the Microsoft Overview and Concept templates, and the analogous-CMS
  survey. Documents cairn's real position: git-committing, magic-link, SvelteKit
  and Cloudflare, fixed concepts.

### Explanation: how cairn works

- Purpose: the mental model both audiences need, in one place. This merges the
  three explanation pages.
- Length: long, 1000 to 1600 words, but the lowest-traffic quadrant, so keep it
  tight and link the functional spec for depth.
- Sections:
  1. The branch-and-publish model, the lead: the per-entry `cairn/<concept>/<id>`
     branch, Publish copying to `main`, the GitHub App identity (committer is
     `cairn-cms[bot]`, author is the editor), publish-what-you-see, the
     sha-guarded branch delete, and auto-deploy.
  2. The auth design: why magic-link over OAuth, the single-use D1 token, the
     POST-confirm, opaque D1 session rows, owner and editor roles with the
     anti-lockout rule, and the CSRF guard with the `__Host-` double-submit
     token.
  3. The content model: fixed first-class concepts (posts and pages) rather than
     open-ended collections, filename-based ids, and the per-concept URL policy.
- Grounding: the Microsoft Concept template and Diátaxis explanation. Documents
  the three load-bearing designs.

### Troubleshooting

- Purpose: a symptom-first lookup that routes into the log-events reference. This
  page stays thin.
- Length: short to medium, 300 to 500 words, table-driven.
- Sections: a table mapping symptom to likely event to fix, drawing on the full
  event vocabulary. An author who can't sign in points at `auth.link.send_failed`
  or a `guard.rejected` reason. A save that does nothing points at
  `commit.failed`, conflict versus error. A failed publish points at
  `publish.failed` or `github.unreachable`. A broken image points at
  `media.upload_failed` or `media.delivery_failed`. Type errors after install
  point at `moduleResolution`. A consumer build that fails on a dist `.svelte`
  file points at the Vite 8 transpile step.
- Grounding: Microsoft troubleshooting. Absorbs the demoted TypeScript-notes
  content.

### Deferred developer docs

- **Extend the admin UI.** Blocked: the `CairnExtension`/`AdminPanel` seam is
  reserved and its dispatch route is a future plan. Defer until it ships; the
  real customization knobs (registry, icons, preview, navMenu) are covered in the
  adapter guide and the configuration reference.
- **Recipes cookbook.** Defer until there are at least three real recipes from
  the consumer sites.
- **Upgrade and migration guide.** Defer until near 1.0; the CHANGELOG carries
  breaking-change notes meanwhile.

---

## 3. Editor corpus

Delivery design chosen 2026-06-23 after a three-option mockup pass and a six-dimension
critique (the mockups and the critique live in `docs/internal/design/`). The corpus is
authored once in the plain end-user register and surfaced through three in-admin surfaces
that all render from one help manifest, so they cannot drift:

- A standing, plainly labeled **Help home** in the office, a real destination rather than a
  dismissible card: a single short getting-started checklist on top, a searchable reference
  library with popular topics visible at rest below, and a contact line at the foot that
  appears only when the site configures a support contact.
- A **context-aware slide-over** summoned by a standing "Help" control in the topbar and the
  desk band (and the editor footer's Markdown-help link), using the Details-panel geometry so
  it recedes on the desk and never steals manuscript width. No floating launcher.
- A **woven contextual layer**: the point-of-typing markdown coach (cairn's signature,
  fire-once, out of the manuscript column, announced once), schema-authored field hints under
  each input, and the publish-past advisory warnings.

Onboarding is one calm first-run surface: the teaching empty state carries concept-differentiated,
labeled, editable starter posts (a Post starter and a Page starter). Every surface shows only this
site's concepts and enabled features. The register is plain end-user voice, value-first, with
reassurance at save and publish, and the word "markdown" stays out of the onboarding copy. Each
page assumes the reader's own site may differ and points to the site maintainer only when a support
contact is set.

Several surfaces depend on engine seams cairn does not ship yet: a starter-content seed, per-editor
progress state, a frontmatter field-description channel, an advisory-validation channel, a
support-contact config field, the point-of-typing editor-decoration seam, and a config-aware Help
home in the shell. These are recorded in `docs/internal/docs-friction-log.md` and gate the
corresponding pieces; the prose-only pages can be written first.

### Editor welcome

- Purpose: a one-screen orientation for a content author.
- Length: stub to short, 100 to 200 words.
- Sections: what this tool is, that edits happen in the browser and go live, and
  that sign-in is by email with no GitHub account. A note that the reader's site
  may look a little different.
- Grounding: Microsoft landing in the end-user voice.

### Sign in and make your first edit

- Purpose: the fastest path to one real, published change.
- Length: short, 200 to 350 words, 10 steps or fewer.
- Sections: numbered, plain steps. Enter your email, check your inbox, select
  the link, you're in. Open an entry, edit the text, watch the preview, Save,
  then Publish.
- Grounding: the Microsoft Quickstart and the Tina editing-experience
  walkthrough. Documents the real magic-link and editor flow.

### Write and publish a post, edit a page

- Purpose: the core authoring loop.
- Length: medium, 400 to 700 words.
- Sections: choosing a concept; the editor surface (the markdown is the truth,
  the preview is read-only); the toolbar; the frontmatter fields; Save versus
  Publish; editing an existing page.
- Grounding: the Microsoft how-to and the Sveltia per-screen pattern. Documents
  the CodeMirror editor and the Save and Publish actions.

### Add an image

- Purpose: put a picture in an entry.
- Length: short, 200 to 400 words.
- Sections: the insert flow; writing alt text and why it matters; the hero image
  field; replacing an image.
- Grounding: analogous per-feature pages. Documents the media insert, figure,
  hero, and replace flows.

### What happens when you publish

- Purpose: remove the fear from the Publish button.
- Length: short, 200 to 350 words.
- Sections: drafts versus live; your edit is held safely until you Publish;
  Publish copies it to the live site; it can take a minute or two to appear.
- Grounding: the Microsoft Concept in the end-user voice. Explains the
  branch-and-publish model without the jargon.

### Undo, drafts, and fixing mistakes

- Purpose: answer the "did I break the site?" anxiety. This page is new to the
  set.
- Length: short, 250 to 400 words.
- Sections: your edits live on a separate copy until you Publish; how to discard
  an edit you don't want (match the real discard affordance and its label, which
  the writer confirms in the admin against the `entry.discarded` path); how to
  fix something after publishing (edit again, then Publish again); you can't
  break the live site just by editing; ask your site maintainer when unsure.
- Grounding: the draft and edit-state UX that Tina, Decap, and Sveltia
  foreground. Maps the branch-until-Publish behavior to author reassurance.

### Editor FAQ

- Purpose: the recurring questions that don't fit a procedure.
- Length: short overall, 30 to 60 words per answer.
- Sections: short questions and answers. The sign-in email didn't arrive (check
  spam, request again, throttling). The change isn't live (deploy latency). Can I
  undo? Do I need a GitHub account (no). Is my work saved?
- Grounding: Microsoft FAQ. Documents the real sign-in, throttle, and deploy
  behaviors.

### Glossary

- Purpose: a shared author-and-developer vocabulary.
- Status: deferred until terms proliferate. It would define publish, draft,
  branch, frontmatter, concept, and adapter.
- Grounding: the Tina glossary pattern.

---

## Open notes for the rewrite

1. **`create-cairn-site` gates three docs.** Until it ships, write the README
   quickstart, the tutorial, and the editor-corpus delivery against the manual
   mount, and mark the scaffolder path as a future shortcut.
2. **There is no newcomer local-dev backend yet.** The tutorial's "run locally"
   step depends on a fenced local backend that's planned, not shipped. Write the
   honest current path and flag the gap.
3. **No reference generator exists today.** `check:reference` is a coverage gate,
   not a TSDoc or sveld emitter, so the API and component references are
   hand-authored. Decide whether to wire a generator before the rewrite or accept
   the hand-authoring load; the length math assumes the latter.
4. **The tutorial and the deploy guide overlap on credential setup.** Keep the
   depth in the deploy guide and let the tutorial link to it.
5. **Editor-corpus delivery is decided: in-admin first.** The primary channel is
   the in-admin help surface, with a generic hosted copy as a cheap secondary and
   scaffolded per-site tailoring deferred to `create-cairn-site` (note 1). This
   adds a build task to the rewrite: the in-admin help surface itself, beyond
   authoring the pages.
