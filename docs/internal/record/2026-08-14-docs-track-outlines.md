# The four-track outlines (2026-08-14, revised at the adversarial gate)

The target state for Pass D's documentation reset, drafted against the umbrella spec's
Part 2 dispositions, the unagented setup baseline, and the tool's shipped UX; graded
against the audience profiles
([`2026-08-14-audience-profiles.md`](./2026-08-14-audience-profiles.md)); stress-tested
against the competitor review
([`2026-08-14-cms-docs-competitor-review.md`](./2026-08-14-cms-docs-competitor-review.md));
and **revised at a five-reviewer adversarial gate** (2026-08-14: one reviewer per track,
one cross-track coherence reviewer, ~60 ranked findings; the revision record at the end
lists what changed and what was declined). Pass D's target manifest (Task 2) consumes
this document as its target shape.

**This is the spec for a ground-up rebuild, not a reorganization (Geoff, 2026-08-14).**
The old guides, tutorial, and explanation pages are deleted at cutover, not repaired or
moved; the reference arm is the kept exception (machine-gated and current). Every
"absorbs X" or "the old Y" annotation below is **job provenance**, recording which old
page's job a new page covers, never an instruction to move or copy prose. The new pages
are written clean-room from the code, the recorded runs, and the specs; the old corpus
is read only by the post-bake mining sweep, which verifies any find against the code
before folding it.

**The governing ruling (Geoff, 2026-08-14): tight beats complete-looking. More does not
equal better; a smaller number of really well-written pages beats a sprawling collection
of mediocre ones.** Every page carries a one-line contract; a page that cannot state one
dies or merges. **The honest count:** 71 content pages today; 68 in this revision, while
closing ten coverage gaps the gate found. The real cuts land inside pages: the 1,127-line
upgrade page splits with its record half capped, the 668-line tutorial gets a length
bound and stops absorbing three guides wholesale, four duplicated image treatments
collapse to one home each, and the editor-welcome markup-history essay dies.

## Cross-cutting devices (revised)

- Five routes, not four, in the first screenful of both front doors: the evaluator first
  ("deciding whether cairn fits" → `why-cairn`), then editor, admin, extender,
  contributor. The admin and extender lines carry the discriminator and the default:
  "setting up a site and won't be writing code" (start here; most sites finish here)
  versus "a Svelte developer extending a site" (set the site up with the admin track
  first, then come here). One copyable `create-cairn-site` command sits above the routes.
- Admin-track narrative quotes the tool's recorded transcripts; invented output is a
  defect. **New gate:** every fenced transcript block in `docs/admin/` is compared in CI
  against a recorded run (the transcript analog of `check:snippets`); Pass D ships at
  least the fixture-comparison form.
- No stub ever ships, at page level and inside a page: no "coming soon," no unfilled
  markers, no section that names a tool state that has not been recorded.
- A fork is a decision, not prose: the two doors, the platform branches, the paid
  boundaries, and the two upgrade paths each state the choice, the price, and the
  default.
- Astro's tutorial devices wherever a reader follows steps; the live URL comes early.
- **No screenshots anywhere.** The editor track resolves its markers as live UI
  reproductions (the standing ruling: harder to build, but they won't go stale); the
  admin track links vendor dashboards and names the control instead of picturing it (the
  register standard's vendor-link rule). Each editor and admin page carries one dated
  change note in its footer, updated only when the described UI changes.
- Page anatomies, encoded in the register standard (Task 5): task guide (contract,
  preconditions with links, runnable steps, "you know it worked when," failure paths
  pointing at the recovery surface); tutorial milestone (objectives, the state the prior
  milestone produced, steps, checklist, disclosure block); reference entry (the existing
  gated template, now opening with a short narrative lede before the table); **condition
  entry** (condition id, what the check reads, what failure means, the remedy, the
  anchor it must keep); **symptom row** (what you see, the log event, what it means, the
  fix).
- The three diagnostic surfaces partition by instrument, not by phase: recovery keys on
  the tool's step names and state store, troubleshooting on observed behavior and log
  events, readiness on doctor condition ids; one identical three-line router sits at the
  top of all three.
- Reference stays rigid and gated; canonical answers live in the tree.

---

## Front door (`docs/README.md`, root `README.md`, and `docs/why-cairn.md`)

The front door's order is part of the spec: the one-sentence what-is line, the copyable
command, then the five routes, all in the first screenful; everything else below.
**`why-cairn` moves to `docs/why-cairn.md`**, a sibling of the front door (its old arm
dissolves; `check:arm-indexes` maps it to the front-door index the way the tutorial arm
maps today). It keeps the why and the honest trade-offs, and links the admin track's
fact sheet for costs rather than restating them. **The vocabulary section moves to the
extend index**: the extender and contributor need all eight terms, the admin needs
three (defined inline where the admin track first uses them), the editor none.
Root-README kills: the five positioning sections move below the command and routes; the
"scaffolder is planned" residue dies; no Diátaxis citation anywhere.

## The admin track (`docs/admin/`) — 7 pages + index

Persona: the admin profile. Register: outcome-first headers; money, prerequisites, and
the free-until boundary stated before the step that incurs them.

1. **`README.md`** (index): the five-line routing and the journey map only.
2. **`before-you-start.md`**: the single owner of the ownership and money facts: the
   asset inventory (content repo, Cloudflare account, GitHub App, domain, D1), the
   admission prices named as three, not two (Workers Paid, a payment method, **and the
   Cloudflare API token from the tool's prefilled link**, with the confirm-every-row
   warning, since a token the tool accepts can still fail later at a named permission);
   the free-until boundary ("free while you are the only person who signs in; a second
   writer's sign-in email needs the plan and a sending domain"); what needs a developer
   (including key rotation and engine updates, which live in the extend track); how each
   asset is handed to a successor, and how to leave with your content. Contract: "what
   am I getting into, what does it cost, and what stays mine?"
3. **`create-your-site.md`**: chapter 1. Opens with the two doors as a fork with stated
   price and default: the button buys a repo, bindings, and push-to-deploy with no Node
   and no terminal, and stops before the GitHub App, the owner, and any sign-in; the CLI
   is the default and finishes it, and a button-door admin still needs one machine with
   Node once. The CLI narrative quotes the recorded transcript to the finish line,
   states chapter 1's browser-moment count, and ends with **"Getting back in"**: the
   bootstrap link lasts ten minutes, and on a `workers.dev` site the way back in is
   `npx create-cairn-site --sign-in` from the machine holding the site record. The
   free-until-second-writer boundary is restated at the finish line. Contract: "from
   nothing to signed in, and how to sign in again." (The button fork's quoted flow lands
   only after the T5a' button spike records it, sequenced inside the release-one window;
   until then the fork block is written CLI-first with the button half staged on the
   spike, never shipped as a stub.)
4. **`own-your-domain.md`**: chapters 2 and 3, opening with the fork: "only want
   push-to-deploy? nothing in the domain half is required; start at Connect." The two
   chapters' tokens are named as two separate admission prices with their scope lists.
   The domain half: the domain-and-zone prerequisite before any zone step, nameservers
   and propagation in plain terms, and the existing-domain case split into the two facts
   a reader conflates (the domain cairn sends sign-in mail from, versus the
   organization's existing mail the zone must carry unchanged), with a first-class "stop
   and talk to whoever runs your DNS" branch. Browser-moment counts per chapter (two:
   one; three: two). Contract: "move the site onto a domain you own." (The modal
   existing-domain narrative requires the externally-registered live run STATUS
   carry-forward 1 still owes; the page's plan task names that run as its input or ships
   the DNS-admin branch in its place.)
5. **`is-it-working.md`**: the doctor's condition catalogue, entered from a FAIL, not
   read in order; keeps the `check:readiness` three-way contract and its 20 anchors;
   written to the condition-entry anatomy. Contract: "a check failed; here is exactly
   what it means and what fixes it."
6. **`setup-recovery.md`**: the resume table, positioned directly after the two chapter
   pages, whose every failure branch links its matching row by anchor; one row per step
   (persisted state, expiry, detection, exact re-entry, wait/act/ask classification),
   including a `--sign-in` row. Contract: "a setup step failed or was interrupted; get
   back on the path."
7. **`invite-editors.md`**: day 2, the owner's task: add and remove editors, owner
   versus editor, the sign-in mail and the test-send; opens by restating its
   precondition (the plan and a sending domain). Contract: "get your writers in."
8. **`troubleshooting.md`**: the live-site symptom table, absorbing the log-querying
   mechanics as its opening section (the old `read-cairn-logs` admin half); each row
   written to the symptom-row anatomy, and rows a developer must fix say so and point at
   the extend track's debugging page. Contract: "the site does the wrong thing; find
   the fix or find out who can."

Killed from the draft: `maintain-your-site` (key rotation is a terminal-and-`wrangler`
task and moves to the extend track; the admin update page waits until the tool grows an
upgrade verb to quote, filed to ROADMAP with the Go tool's cross-site upgrade work) and
`read-your-logs` (merged into troubleshooting; the extend track links
`reference/log-events` directly).

## The editors track (`docs/editors/`) — 7 pages + index

Persona: the editor profile. Register: Microsoft (ruling confirmed; the price is paid by
cutting, starting with editor-welcome's ~350-word markup-history essay). Track rules: no
outbound links to any other track (cairn.pub `/help` renders this track alone); the two
markdown demo headings demote below `h3` or move into fenced examples; the seventeen
`LIVE-UI` markers are inventoried in the manifest and resolve as live reproductions
before the track ships to `/help`, coordinated with the cairn-pub task.

1. **`README.md`** (index): a complete ordered list of the seven pages (the `/help`
   sidebar IS this order), written for the reader who arrived from the admin's Get-help
   link mid-problem: outcome-phrased lines, first-run pages first, and no repetition of
   the admin Help home's checklist or cheat-sheet. Order: welcome, write-in-the-editor,
   publish-and-history, when-something-goes-wrong; then add-an-image,
   manage-the-media-library, manage-your-tag-vocabulary.
2. **`welcome.md`**: orientation, now opening with signing in (the track's first
   precondition, produced by its first page). Contract: "what this editor is and how to
   get in."
3. **`write-in-the-editor.md`**: the full writing guide; gains one paragraph showing the
   `cairn:` token the link picker writes and an `::include` subsection under Components
   (its first documentation anywhere); keeps the single home of alt-text doctrine; its
   save-review-publish summary shrinks to a pointer at the publish page. Contract:
   "everything about writing and formatting a draft."
4. **`publish-and-history.md`**: save, publish, statuses, discard, delete, publish-all,
   history and restore; refusals move out. Contract: "move an entry between private and
   live, and get an old version back."
5. **`when-something-goes-wrong.md`** (new): the editor's failure surface, absorbing the
   four scattered refusal sections plus the cases documented nowhere: the sign-in link
   that never arrives (quoting the real message), the creation refusals (date field,
   address collision), the tag-not-in-vocabulary refusal, and the edit conflict, whose
   current prose contradicts the code and is rewritten from it (a refused save keeps
   your typing; the manifest files this as a fix, not a move). Contract: "the editor
   refused you or something looks broken; what happened and what to do."
6. **`add-an-image.md`**: contract: "put a picture in the draft I am writing." Formats
   and HEIC facts move to the library page and are referenced.
7. **`manage-the-media-library.md`**: contract: "work on the site's images with no
   draft open"; owns the accepted-formats and HEIC facts.
8. **`manage-your-tag-vocabulary.md`**: contract: "keep the shared tag list the whole
   site picks from," plus one sentence naming who may change it.

Killed from the draft: `links-images-and-includes` (two thirds duplicate, one third a
missing section now placed); with it, `reference/authoring-syntax.md` dies as a
move-and-kill (its entire content is author-facing; the codec and resolver contracts
already live on `reference/media.md`), and the reference arm restates itself as 23
pages.

## The extend track (`docs/extend/`) — tutorial + 23 guides + 6 concepts + index

Persona: the extender profile. Groups, each a statable story: the deep path; building
blocks; admin surfaces; design your site; extend the publishing flow; operate across
versions; concepts. The index opens building blocks with the precondition sentence
(every guide assumes the adapter exists, produced by `define-an-adapter-and-schema` or,
for an existing app, `add-cairn-to-a-sveltekit-app`), hosts the vocabulary section from
the front door, and carries a cross-track block linking the admin diagnostic pages. The
operate group opens with the stability statement: what is frozen, what is not, and that
`0.x` still breaks seams between minors, linking the reference tiers.

1. **`build-a-site-by-hand.md`**: the deep path, with a stated line budget (at most
   roughly its current 668 lines), deploy pulled into the first third (`workers.dev`
   needs no domain), toolchain drift fixed against a fresh `sv create` run, and
   credential milestones LINKING the task guides below rather than absorbing them.
2. Building blocks: **`add-cairn-to-a-sveltekit-app.md`** (new; the existing-app
   task: the GitHub App, the three bindings, D1 provisioning, at task altitude),
   **`what-the-scaffold-wrote.md`** (new; the generated-file map, one line per file,
   each linking its owning guide or reference page; the scaffolded reader's entry),
   `define-an-adapter-and-schema`, **`declare-your-own-concept.md`** (the old
   `add-authors`, retitled to the job it teaches; the concept set is extensible and
   this is its one home), `configure-rendering`, `wire-the-delivery-surface` (absorbs
   the AI-posture page's raw-markdown and content-negotiation halves, which modify
   these routes), `link-content-with-references` (slimmed to the typed reference field;
   absorbs `reference-integrity`'s practical half), `reuse-content-across-entries`,
   `add-an-island`, `migrate-existing-content`.
3. Admin surfaces: `add-a-custom-admin-screen` (absorbs `enforced-design`'s actionable
   half; the essay of record stays in `internal/`), `organize-your-admin-nav`,
   `restrict-admin-access`, **`add-a-second-audience.md`** (the old
   `add-a-login-channel` plus `give-a-role-its-own-admin-area`, one journey: a second
   audience's login and its own admin area).
4. Design your site: **`design-your-site.md`** (the old `make-waymark-your-own` plus
   `iterate-your-design-locally`, which already declared the other its worked example;
   opens by naming that Waymark arrives from the scaffold, with the deep path stating
   that a hand-built site has none).
5. Extend the publishing flow: `enable-tidy` (absorbs `editor-copyedit`, after
   verifying the editor track still answers "why doesn't spellcheck fix everything"),
   `announce-on-publish`, `share-a-draft-preview`, `choose-an-ai-posture` (slimmed to
   the posture decision).
6. Operate across versions: **`debug-your-site.md`** (new; the code-fixable symptom
   rows split out of troubleshooting, linking `admin/troubleshooting` and
   `reference/log-events`), `rotate-the-github-app-key` (from the admin track;
   platform-branched commands), `upgrade-cairn` (the short task: bump, doctor, read
   your span's `Consumers must:` lines), **`migration-notes.md`** (the per-version
   record split out of the 1,127-line page; carries `## Unreleased`, and
   `docs-links.mjs`'s pairing repoints here; the gate's contributor-facing half is
   documented in CONTRIBUTING, not in a shipped page).
7. Concepts (6): `architecture`, `content-model`, `security-model`,
   `auth-channel-security-model` (kept standalone deliberately: a security contract
   stays findable), `render-safety`, `data-tiers` (absorbs `media-storage` as its
   worked case).

Killed from the draft: `structured-fields` (its dictionary is owned by the gated
`reference/core.md` fields section, which gains the widget-and-validation table under a
narrative lede), `reference-integrity` and `enforced-design` as pages (folded as
above).

## The reference (`docs/reference/`) — 23 pages + index

One page per export subpath, four CLI pages, and the non-export contracts
(`admin-routes`, `log-events`, `admin-grammar-tokens`, `supported-toolchain`), with
stability tiers and the four gates unchanged; the index's "two pages are not
export-keyed" miscount is corrected. Changes: `authoring-syntax` dies (above); every
reference page opens with a short narrative lede before its tables (the Payload shape,
additive to the gates); and the index gains an "also for site admins" grouping naming
`doctor`, `log-events`, and `supported-toolchain`, each linked by name from its
admin-track page (`is-it-working` → doctor, `troubleshooting` → log-events,
`create-your-site` → supported-toolchain, citing rather than restating the version
facts).

## The contributor zone (`CONTRIBUTING.md` + `docs/internal/`)

`CONTRIBUTING.md` gets three named edits: the arm list and repository map updated to
the tracks; a "which track does my page go in" routing rule; and a scope paragraph
linking `what-cairn-is-and-is-not.md` above "Proposing a change," so "is my idea in
scope" is answerable before code is written. `docs/internal/README.md` becomes the
curated live index with the filing rule, **and the split is held by a gate, not a
rule**: the dated record moves to `docs/internal/record/`, and `check:arm-indexes`
gains a non-recursive `docs/internal` entry so a new top-level internal doc fails CI
until indexed or filed. The `check:docs` Unreleased pairing's contributor-facing
mechanics are documented here, beside the gates they belong to.

## Revision record (the adversarial gate, 2026-08-14)

Five reviewers (admin, editors, extend, front-door/contributor/reference, cross-track
coherence), ~60 ranked findings. Adopted wholesale: the evaluator route and
`docs/why-cairn.md`; `before-you-start.md` and the admin index demotion; the
getting-back-in section and `--sign-in` row (code-verified: the bootstrap token lives
ten minutes); the two-door fork framing with the button's staged sequencing; the
three-admission-prices block; the instrument-keyed diagnostic partition; the
`maintain-your-site` kill and `read-your-logs` merge; `when-something-goes-wrong.md`
and the conflict-prose fix (code-verified defect); the `links-images-and-includes` and
`authoring-syntax` kills; the two-tier editors index as the `/help` sidebar; the
LIVE-UI marker inventory as a ship gate; `add-cairn-to-a-sveltekit-app` and
`what-the-scaffold-wrote`; the `add-authors` reversal into
`declare-your-own-concept`; the `design-your-site` and `add-a-second-audience`
merges; the `upgrade-cairn` split; the `structured-fields`, `reference-integrity`,
and `enforced-design` folds; concepts at six; the reference narrative lede and
admin-audience grouping; the CONTRIBUTING edits and the internal-index gate; the
transcript-freshness gate; the condition-entry and symptom-row anatomies.

Declined, with reasons: merging `is-it-working` into `setup-recovery` (the resume
table is the category differentiator and keeps its own door; the shared router is the
fix); killing `manage-your-tag-vocabulary` (weak but load-bearing for `/help`
findability; it gains a contract and an actor instead); folding
`auth-channel-security-model` into the reference (a security contract stays a
findable page); splitting `own-your-domain` into two pages now (the fork-open shape
ships first; the split triggers only if the page outgrows its stated bound).
