# Extend outline review: exemplar fit (OE)

Target: `docs/internal/outlines/extend.json` at b9013079. Lens: whether each page's two exemplars
exist, come from different publishers, match the page's type and job in the capture itself, and
carry an accurate `take`. The checks read the manifest (`docs/internal/record/docs-exemplars.md`), the
captures under `~/.local/share/cairn/exemplars/`, the register's page anatomies, and the spec
rule (`2026-09-26-draft-docs-approach-design.md`, "Exemplars": the page type vocabulary is the
manifest's section headings; two per page type from different sources).

## Baseline checks (all pass)

- All 50 exemplar slots resolve to a capture on disk with `page.md`, `page.html`, and `meta.json`.
- No page pairs two captures from one publisher. The Astro-to-Astro and Cloudflare-to-Cloudflare
  pairings never co-occur on a page.
- The takes were spot-checked against the captures: the Sanity "Right tool for the job?" callout,
  Directus's closing "Using Your Extension" check, and Django's `closepoll` running example with
  its tree before the code. Also checked were Astro v5's "What should I do?" pairs,
  cf-workers-bindings's `# This would fail!` snippet, and Cloudflare create-token's "only shown
  once" warning. Each is accurate except where OE4 and OE5 say otherwise.
- The concept pages have sound pairs: architecture, scaffolded-site-files, content-model, and
  security-model. So do most task guides.

## Findings, ranked by consequence

### OE1 (major): debug-your-site is typed as a task guide, and its exemplars are symptom pages

- **Location:** `debug-your-site.pageType`, plus both `exemplars[].take`.
- **Defect:** the register names this page as a **Symptom row** page ("`admin/troubleshooting.md`,
  `extend/debug-your-site.md`": what the reader sees, the correlating log event, what it means,
  and the fix). The spec sets the page type vocabulary to the manifest headings, which gives
  "Troubleshooting / symptom page". The outline says `task guide`, so a drafter holds a task
  guide anatomy (contract, preconditions, numbered steps, a verify section) and two symptom-page
  exemplars at once. The likely result is a numbered procedure wrapped around a symptom list,
  which suits neither job. The borrowed operator captures fit the shape well; the spec lists
  extend troubleshooting as a known no-capture case, so the borrow is legitimate. Their takes
  still omit what the extend row adds and what the operator content must not bring in. Neither
  capture has a log-event slot, and both end most fixes in a dashboard or DNS action. An extend
  row ends in a code or config change.
- **Proposed edit:**
  - `pageType`: `"troubleshooting / symptom page"`.
  - Take for github-pages-troubleshoot-domains: "Take one heading per symptom named for what the
    reader sees, each holding cause and fix, and the verify-with tool named in the fix; add the
    log event each symptom correlates with, which the capture has no slot for; leave the DNS
    content and the dead-end 'contact your provider' fixes."
  - Take for cloudflare-too-many-redirects: "Take the literal error or event string as the
    heading and the cause list that doubles as a triage order; leave the SSL-mode content and
    any fix that is a dashboard setting, since each fix here is a change to the site's code or
    config."

### OE2 (major, OWNER FORK): the tutorial page has no tutorial exemplar

- **Location:** `add-cairn-to-a-sveltekit-app.exemplars` (batch `pilot`).
- **Defect:** this is the only `tutorial milestone` page, and neither exemplar is a tutorial.
  The manifest has no tutorial heading in any slice, so the page type falls outside the spec's
  vocabulary rule. The register's anatomy for this type asks for stated objectives per
  milestone, the state the prior milestone produced, a checklist before advancing, and the
  Astro "Show me the steps" disclosure block. Neither capture has any of these. Directus is a
  363-word quickstart whose one real move is the closing check. Django is a single-file how-to.
  The takes stretch both to cover milestones, and the page opens the arm's deep path in the
  pilot batch, so its shape sets the pattern for the rest.
- **Options:**
  1. Capture one Astro tutorial unit page from `docs.astro.build/en/tutorial/`. The register
     already names Astro's device, so the source is chosen. File it under a new Extenders
     "Tutorial" heading and pair it with Django (keep Django's take). Directus comes off this
     page.
  2. Keep the two task guides. Amend both takes to say the milestone structure (objectives,
     prior state, checklist, disclosure block) comes from the register anatomy, not the
     exemplars.
  3. Retype the page as a task guide. This contradicts the register's deep-path design.
- **Recommendation:** option 1. It costs one capture, and it gives the one page whose type has
  no capture a real exemplar before the pilot sets the arm's pattern. Option 2 is the fallback
  if no capture pass runs before the pilot.

### OE3 (minor): run-cairn-audit's restic take would duplicate the reference

- **Location:** `run-cairn-audit-on-your-site.exemplars[1].take`.
- **Defect:** the take says "the exit-code table a CI script branches on", while the page's
  `covers` says "the exit codes (link the reference)". Imitating the take puts a reference
  table on a task guide that the reference arm already owns. The pair also has no task-guide
  capture: rustc-dev-guide-ci is a CI explainer and restic is a reference entry. rustc's
  which-check-runs-when framing still fits the static and rendered split, so keep it; the task
  skeleton comes from the register anatomy.
- **Proposed edit:** restic take becomes "Take the environment variable stated before the step
  that needs it (CAIRN_AUDIT_COOKIES before the rendered pass) and the one-line rule that an
  unexpected exit is a failure; leave the exit-code table and per-command message tables, since
  the page links the reference for codes."

### OE4 (minor): the sveltekit-hooks take asks for a move it also tells the drafter to leave

- **Location:** `restrict-admin-access.exemplars[0].take` and
  `replace-magic-links-with-cloudflare-access.exemplars[0].take`.
- **Defect:** both takes say to take "the authorization trap stated inline" and to leave "the
  remote-function tangents". In the capture, the only authorization trap ("Never use them to
  determine whether or not a user is authorized", `page.md` line 32) sits inside the
  remote-function paragraph. A drafter either drops the move or imports remote-function content.
- **Proposed edit:** replace the clause in both takes with "Take the placement of the security
  trap, stated in the same paragraph as the value that invites the misuse (in the capture it
  sits in the remote-function paragraph; imitate its placement, not its subject)". Keep the
  rest of each take.

### OE5 (minor): rotate-the-github-app-key's pair misses the job's recovery half

- **Location:** `rotate-the-github-app-key.exemplars`.
- **Defect:** the job is "without a publishing outage, and recover if the new key fails".
  Shopify's create-a-theme contributes one move, the caution beside the irreversible act, and
  its steps are an AI-toolkit tab block and store publishing. The Directus take says "numbered
  verb steps", but Directus's headings are unnumbered, and it has no failure path. Neither
  capture models recovery. Two manifest captures fit better:
  - operators/cloudflare-create-token puts a Warning at the step where the secret shows once,
    and it ends with a verify call whose response is the success signal (the `/healthz` check).
  - operators/ghost-install-ubuntu has "What to do if the install fails", which covers both
    total failure and an interrupted run. That maps onto rollback before deletion and the
    third-key recovery after it.
- **Proposed edit:**
  - Replace shopify-create-theme with `operators/cloudflare-create-token/`. Take: "Take the
    Warning placed at the step where the secret is shown once, and the closing verify call whose
    response is the success signal; leave the dashboard screenshots and the token-kind fork."
  - Replace directus-create-extension with `operators/ghost-install-ubuntu/`. Take: "Take the
    named recovery section that separates a total failure from an interrupted run; leave the
    VPS and NGINX stack; code blocks are in page.html." The two captures come from different
    publishers.

### OE6 (minor): three captures fill 30 of the 50 slots

- **Location:** arm-wide. django-custom-management-commands sits on 13 pages,
  sanity-custom-tool on 9, and directus-create-extension on 8.
- **Defect:** Extenders has only three task-guide captures, so the reuse follows from the
  corpus, and most takes vary the running example per page. The copying risk is uniformity
  across the arm, not per-page plagiarism. Django's 13 takes nearly repeat ("one running
  example, file tree first, leave the class reference"), which pushes every task page toward
  the same tree-then-file-then-variants-then-testing skeleton. Directus is 363 words, and its
  one real move is the closing check. Meanwhile extenders/payload-custom-components, a seam page
  in the manifest, is unused.
- **Proposed edit:** on `add-an-island`, replace sanity-custom-tool (its take is only "required
  members named in prose before code") with `extenders/payload-custom-components/`. Take: "Take
  stating the default (a component renders on the server) and the exact condition that flips it
  to the client before any how-to, which maps to the static fallback versus the hydrated island;
  leave the import-map machinery and the performance section." Directus and Payload are
  different publishers. Optionally, give `configure-rendering` Payload in place of Django
  ("each custom component defined the same way; the props every component receives", mapping to
  typed attributes and slots). That drops Django to 12 and removes the repeated take from the
  page where a registry, not a file tree, is the point. Proposing no further swaps: the other
  Django placements use it for its strongest move.

## Not findings

- **replace-magic-links:** the pair is the manifest's recorded auth-seam gap. With OE4's fix,
  it is workable, since Sanity's callout carries the all-or-nothing switch. No better capture
  exists, so this is no OWNER FORK.
- **theme-your-public-site:** the manifest's designer gap anticipated leaning on Shopify's step
  shape, and the pair is sound.
- **Concept pages typed with Evaluators or Core captures** (architecture, security-model): the
  shape matches, and the extend register comes from the track brief, not the exemplar.
