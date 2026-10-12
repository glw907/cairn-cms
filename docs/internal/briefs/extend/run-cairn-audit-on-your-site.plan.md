# Page plan: Run cairn-audit on your site

Page: `docs/extend/run-cairn-audit-on-your-site.md`. Page type: task guide. Status: new page, no
prior version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part
1), and revised the same day on the structural edit's findings (the close now ends on the CI gate,
the rendered CI step is conditional, and the browser-and-server section is renamed). The drafter drafts from this plan: it is the source of the page's order, each section's claim,
and each fact's placement. The structural edit seat reads it before any prose exists. The plan is
Google's outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`run-cairn-audit-on-your-site`: job, covers, out-of-scope list, exemplars); "The page anatomies"
and "The introduction" in `docs/internal/docs-register.md`; every fact bullet named below in
`docs/internal/facts/extend.md` and `docs/internal/facts/reference.md`; the two exemplars
(`extenders/directus-create-extension`, `operators/restic-scripting`); the reference page
`docs/reference/cairn-audit.md` ("Tiers and exit codes", "Static mode", "The static rules", "What
the motion rules don't cover", "Suppressing a finding", "Configuration", "Rendered mode",
"Auditing an authenticated admin", "The redirect-trap refusal", "The rules", "The allowlist"); the
sibling pages that link this one (`docs/extend/debug-your-site.md:30`,
`docs/extend/theme-your-public-site.md:41,500,509`, `docs/extend/scaffolded-site-files.md:68,174`,
`docs/extend/add-a-custom-admin-screen.md:547,568`); and the code and scaffold files the facts cite
(`src/lib/audit/report.ts`, `src/lib/audit/bin.ts`, `src/lib/audit/rendered.ts:110-135,332`,
`src/lib/audit/run.ts:74,96,214`, `templates/waymark/cairn-audit.config.json`,
`templates/waymark/.github/workflows/check.yml`, `templates/waymark/package.json:14-22`,
`templates/waymark/wrangler.jsonc:38-43`, `templates/waymark/src/hooks.server.ts`), plus the
engine's own rendered CI (`.github/workflows/norms.yml:62-136`) for context only.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A scaffolded site already runs half of `cairn-audit` on every push: the static pass, over the
engine's default admin roots and the two compiled admin sheets. The page turns that default into
the site's own gate. It runs the static pass once so the reader sees the report and the exit-code
rule, scopes it to the site's files, and records each deliberate exemption with a reason. It then
sets up the rendered pass (a browser, a running site, a signed-in session), scopes it to the
site's pages, and records its exemptions. It wires the audit into CI, verifies a clean run of both
passes locally, and closes on the workflow's `check` job passing: the gate the job names.
The page's one safety property, stated where the reader acts on it: an exit other than 0 or 1 is a
broken run, never a pass, and the audit refuses rather than report a clean result it cannot stand
behind.

### The order, argued

The outline's covers are an inventory. The page follows the two passes in the order the reader
sets them up, because the rendered pass costs a browser, a server, and a session that the static
pass does not, and a reader can make `check:cairn` green before installing any of them.

1. **The introduction carries the model** (cover 1's two-pass framing, `f:1md5oj` scoped,
   `f:guiavc` scoped). The reader must know a scaffolded site already runs the static pass in CI,
   or "scope the static pass" reads as setting up something new.
2. **Before you begin** names what both passes assume: the installed package, the admin's
   stylesheet peers, and, for the rendered half, an editor sign-in.
3. **Run the static pass** (cover 1, turned from exposition into a step with a check you can see,
   the Directus take). Every later section's check reads the report and the exit code, so the
   exit-code rule and the report's shape come first. The restic take lands here: an exit other than
   0 or 1 is a broken run.
4. **Scope the static pass** (cover 2) follows the first run, since the reader now has a report
   whose file count shows what the defaults covered.
5. **Suppress a static finding** (cover 5) moves up from after the rendered sections. It completes
   the static half, so a reader who stops before the browser setup still leaves with a gate that
   records its exemptions. It also matches the reference, which places suppression under "Static
   mode" and the allowlist under "Rendered mode".
6. **Install a browser and start the site** (the page-inputs rows for `f:vh5aw8`, `f:vwpewl`, and
   `f:j7fha2`'s local half) is new: the run never starts a server and the scaffold ships no
   Playwright, so a reader cannot run `check:cairn:rendered` at all before this section.
7. **Sign the rendered pass in** (cover 4) comes before scoping the rendered pass, the restic
   take: the environment variable is set before the step that needs it. The first signed run on
   the default list is also how a site whose concepts are not `posts` and `pages` meets the exit 2
   that the next section clears.
8. **Scope the rendered pass** (cover 3) follows the first signed run. The rule to keep
   `/admin/login` in a replaced list lands here, where the reader replaces the list, and it rests on
   the refusal the previous section already explained.
9. **Allowlist a rendered finding** (cover 6) completes the rendered half, as suppression completed
   the static half.
10. **Run both passes in CI** (cover 7) needs both passes scoped and exempted, so it comes after
    them. It ends on the edited workflow, not on a push: the reader pushes only once the local
    checks pass, so the push belongs to the verification section.
11. **Verify a clean run** is the anatomy's verification section (item 4) and the job's close, the
    Directus "Using Your Extension" check. Three local checks run first (static exit 0, the site
    answering at `BASE_URL`, rendered exit 0), and the fourth is the gate itself: a pushed commit
    whose `check` job passes.
12. **Diagnose a run that exits 2** is the anatomy's failure-path slot (item 5). The extend
    recovery surface, `docs/extend/debug-your-site.md`, defers audit configuration to this page
    (`docs/extend/debug-your-site.md:30`), so the map from message to section stays here. Each row
    points at the section that fixes it, so no recovery prose is restated.
13. **See also** closes the page, per the anatomy (item 6).

### Departures from the outline's covers order, with the reason for each

- Cover 1 becomes the step "Run the static pass", not an explanation section: the anatomy keeps
  explanation subordinate to steps, and the exit-code rule is needed as a check before any scoping.
  Its rendered half moves into "Install a browser and start the site".
- Cover 5 (suppress) moves up to follow cover 2, completing the static half (item 5).
- Cover 4 (sign in) moves ahead of cover 3 (scope the rendered pass), per the restic take and the
  refusal's dependence on the page list (items 7 and 8).
- A new section, "Install a browser and start the site", carries the page-inputs "filed" rows for
  `f:vh5aw8` and `f:vwpewl`.
- Cover 7's rendered half (`f:j7fha2`) splits: the dependency the reader adds lands in "Install a
  browser and start the site", and the CI browser install lands in "Run both passes in CI". The
  rendered CI step is conditional on a CI job that can reach a running site and hold a session it
  accepts, stated condition first, since no fact says where that server runs.
- The outline's close, a clean `check:cairn:rendered` run, stays as the third local check in
  "Verify a clean run", and a fourth check follows it: the workflow's `check` job passes. The job
  is to make `cairn-audit` the site's gate, and the gate is the CI job, so the page ends on it, and
  the reader pushes only after both local passes run clean.

### Exemplar takes, and where each lands

- **Directus, create an extension.** Verb-per-heading steps, each ending in a check you can see:
  every task heading starts with a bare infinitive, and every task section ends on a rerun whose
  report or exit code shows the change. The one exception is "Run both passes in CI", whose check
  (a passing `check` job) moves to "Verify a clean run" so the reader pushes after the local checks.
  The close on a visible success lands as "Verify a clean run": the clean `check:cairn:rendered`
  report, then the passing `check` job. Left behind: the Docker volume steps.
- **restic, scripting.** The environment variable stated before the step that needs it:
  `CAIRN_AUDIT_COOKIES` is set in "Sign the rendered pass in", before any rendered run reports, and
  `BASE_URL` is named in "Install a browser and start the site". The one-line rule that an
  unexpected exit is a failure lands in "Run the static pass". Left behind: the exit-code table and
  the per-command message tables; the page links `docs/reference/cairn-audit.md#tiers-and-exit-codes`
  for the codes.

### Heading policy

Task headings start with a bare infinitive. "Before you begin" and "See also" are the anatomy's
fixed headings. No page links an anchor on this page today: a search of `docs/` for
`run-cairn-audit-on-your-site.md#` returns nothing, and every inbound link, from four sibling pages,
names the page itself.
Every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** `cairn-audit` checks a site's
   admin against cairn's design system in two passes. A bare run is the static pass, which reads
   source files and the compiled admin stylesheet. `--rendered` drives a browser over live admin
   pages on a server that is already running, under both the light and the dark theme (`f:1md5oj`,
   `f:vh5aw8`, each scoped to that clause). A scaffolded site already runs the static pass on every
   push and pull request (`f:guiavc`, scoped). The audit gates on findings in two tiers, which "Run
   the static pass" sets out (named by heading).
2. **Who and why, with the contract.** The reader is the developer building an organization's site
   on cairn's seams, whose admin has grown past the defaults: their own admin screens, concepts not
   named `posts` and `pages`, or their own stylesheets. The contract sentence, inside the framing:
   scope both passes to your site's sources, stylesheets, and admin pages, sign the rendered pass
   in, record each exemption with a reason, and make the audit your CI gate. A second reader is building
   one custom admin screen and wants to audit it while they work; route them to
   `docs/extend/add-a-custom-admin-screen.md` (register, "A page may serve several readers").
3. **Prior knowledge.** npm scripts, JSON config files, a GitHub Actions workflow, and reading a
   cookie in a browser's developer tools. No cairn knowledge beyond the site's admin.
4. **What the page does not cover, with the page that does.** Every rule, flag, and config key:
   `docs/reference/cairn-audit.md`. The three public-scope theme rules in depth:
   `docs/extend/theme-your-public-site.md#resolve-an-audit-finding`. Auditing one custom screen while
   building it: `docs/extend/add-a-custom-admin-screen.md#verify-the-screen`. This sentence may name
   the pages, since scope has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording
may move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the
ids it draws on ("cited again" marks a fact whose primary home is another section); the content and
steps; and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in
passed the provenance extractor with no row).

### Before you begin

**First sentence:** Both passes need cairn installed with its stylesheet peers, and the rendered
pass also needs an editor sign-in for your admin.

**Facts:** `f:mrv24k` (scoped: a missing `daisyui` or `tailwindcss` peer fails the run). Cited
again: `f:xj180v` (the rendered pass reads a session).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- `@glw907/cairn-cms` installed in the site, which puts `cairn-audit` on the project's path. Link
  `docs/extend/scaffolded-site-files.md` for a scaffolded site and
  `docs/extend/add-cairn-to-a-sveltekit-app.md#install-the-engine-and-let-vite-compile-it` for a
  hand-built one. Name the bin claim's source as `docs/reference/cairn-audit.md` (opened and
  confirmed: its first paragraph states the package ships the bin).
- `daisyui` and `tailwindcss` installed as dev dependencies, since the run fails without either
  (`f:mrv24k`). A scaffolded site has both.
- For the rendered pass: an editor who can sign in to the admin (`f:xj180v`). No link: it is the
  site the reader is building, and the add-cairn tutorial's "Verify the dev sign-in" is the dev
  backend's, which this page does not use (see Drafting constraints).

**Hand-off:** "With those in place, run the audit once to see what it checks today."

### Run the static pass

**First sentence:** A bare `cairn-audit` run is the static pass, and it exits 1 only when an
unsuppressed error-tier finding survives.

**Facts:** `f:1md5oj`, `f:mrv24k`, `f:5y3prw`, `f:jm7f3i` (scoped: the config file is read from the
working directory; every failure to start prints `cairn-audit: <message>` and exits 2).

Content:

- One sentence (`f:1md5oj`): an advisory finding prints without changing the exit code. Link
  `docs/reference/cairn-audit.md#tiers-and-exit-codes` for the tiers and codes.
- A numbered list of two steps, one action each, the location first:
  1. In the project root, run `npm run check:cairn`. One sentence after it (`f:mrv24k`): the script
     builds the site's admin sheet, then runs the whole static registry, including the three
     public-scope rules, whose findings print as advisories. A site without the script runs
     `npx cairn-audit` from the project root (`f:jm7f3i`: the config file is read from the
     directory the command runs in).
  2. In the same shell, print the exit code with `echo $?`.
- The report's shape, two or three sentences (`f:5y3prw`): one line per unsuppressed finding
  (file and line, tier, rule id, message), a `Suppressed:` block when any finding was suppressed,
  then a summary whose count line always prints the suppressed total, zero included. One `text`
  block may show the two summary lines with placeholder counts.
- One sentence (`f:5y3prw`): the report is plain text with no machine-readable output, and its line
  shape is not yet a designed contract, so a script gates on the exit code, never on parsed lines.
- The restic one-line rule, one sentence (`f:jm7f3i`): exit 0 is clean, exit 1 is a finding at the
  gating tier, and any other exit is a broken run, never a pass. "Diagnose a run that exits 2" maps
  each message (named by heading).

**Hand-off:** "Next, point the static pass at the files your site keeps."

### Scope the static pass

**First sentence:** The static pass reads three admin roots by default, and
`cairn-audit.config.json` in the project root replaces any of its scopes with your own.

**Facts:** `f:eqsngu`, `f:t767qb`, `f:22odbz`, `f:xjp2mx`, `f:y1mjsk`, `f:1x8r1x` (scoped: the three
`adminOnly` motion rules read `static.adminScope`, and the other static rules read `static.scope`).
Cited again: `f:guiavc` (the scaffold's config names both sheets), `f:jm7f3i` (the file's location;
`--config` naming a missing file fails).

Content, in this order (a reader edits one key at a time, from the broadest to the narrowest):

- One sentence (`f:jm7f3i`): the run reads `cairn-audit.config.json` from the directory it runs
  in, and `--config <path>` names another file, which must exist.
- `static.scope` (`f:eqsngu`): the defaults are `src/routes/admin`, `src/lib/admin`, and
  `src/lib/admin-toolkit`. A configured list replaces the defaults and is never merged with them,
  and a configured root the tree lacks fails the run. So a site keeping admin components in
  `src/lib/components` lists the default roots it has plus that one, never that one alone.
- `static.adminScope` (`f:t767qb`, `f:1x8r1x` scoped): it has the same three defaults, and the three
  motion rules that read only admin roots resolve over it. A site whose admin screens live outside
  the defaults names their roots under both keys, since every other static rule reads
  `static.scope` (`f:1x8r1x` scoped, `f:eqsngu`: two keys so a site can narrow one without the
  other).
- `static.cssFiles` (`f:22odbz`): standalone CSS files, none by default, that the CSS-family rules
  read beside each component's scoped `<style>` block. One sentence states the exception as code
  has it: the three admin-only motion rules read a named file only when it lies under an admin root.
- `static.sourceScope` (`f:xjp2mx`): default `src`, the directories the `log-event-grammar` and
  `log-secret-field` rules walk for `.ts` and `.svelte` files.
- `sheet` (`f:y1mjsk`, `f:guiavc` cited): one path or a list of compiled stylesheets the class
  checks resolve against. The scaffold's config already lists the engine's packaged sheet and the
  site's `.cairn/admin.css`. A listed sheet that does not exist fails the run, naming it.
- One `json` block: a `cairn-audit.config.json` that keeps the scaffold's two `sheet` entries and
  sets `static.scope` to the default roots plus `src/lib/components`. Mark the extra root as the
  reader's own (the brief's `local` array).
- A numbered list of two steps, one action each, the location first:
  1. In `cairn-audit.config.json` in the project root, set the keys your site needs.
  2. In the project root, run `npm run check:cairn` again.
- The check, one or two sentences: the summary's file count changes with the scope, and a mistyped
  root or sheet exits 2 with a message naming the path (`f:eqsngu`, `f:y1mjsk`).
- One sentence linking `docs/reference/cairn-audit.md#configuration` for every key, the public-scope
  keys among them.

**Hand-off:** "When a finding is deliberate, record why beside the line that raises it."

### Suppress a static finding

**First sentence:** A `cairn-audit-disable-next-line` comment with a rule id and a reason suppresses
one static finding, and the report still counts it.

**Facts:** `f:wfv8qm`. Cited again: `f:5y3prw` (the `Suppressed:` block and the count line),
`f:1md5oj` (a suppressed finding leaves the exit-code math).

Content:

- One step, a single bulleted item: in the file the finding names, on the line before the flagged
  markup or rule, add `cairn-audit-disable-next-line <rule-id> -- <reason>` in an HTML comment in
  markup, or a `//` or `/* */` comment in a script or CSS (`f:wfv8qm`).
- One `svelte` block, two lines: the directive in an HTML comment above a flagged element. Use a
  rule id from the reference's static rules table and a reason that says why; mark it
  `snippet-check-skip` if the snippet gate cannot parse a fragment.
- The check, one sentence (`f:5y3prw`): rerun `npm run check:cairn`; the finding moves to the
  `Suppressed:` block and the count line counts it.
- One sentence (`f:wfv8qm`): a directive with no rule, no reason, or nothing to silence raises an
  error-tier `suppression` finding that no directive can suppress.
- One sentence linking `docs/reference/cairn-audit.md#suppressing-a-finding` for how far a
  directive reaches (opened and confirmed: it states the next-node resolution and the
  `static.sourceScope` exception).

**Hand-off:** "The rendered pass takes more setup, starting with a browser and a running site."

### Install a browser and start the site

**First sentence:** The rendered pass drives Playwright against a site that is already running, so
install the browser and start the site before the first run.

**Facts:** `f:vh5aw8`, `f:vwpewl`, `f:j7fha2` (scoped: the scaffold carries no Playwright
dependency, so the reader adds it). Cited again: `f:1md5oj` (`--rendered` runs against an
already-running server).

Content:

- One sentence (`f:j7fha2`, `f:vwpewl`): the scaffold carries no Playwright dependency, and the
  rendered run loads it from the site's own install, so a static-only site never takes it.
- A numbered list of four steps, one action each, the location first:
  1. In the project root, install Playwright and Chromium with
     `npm i -D playwright && npx playwright install chromium` (`f:vwpewl`: the command the run
     prints when Playwright is missing).
  2. In a second shell in the project root, run `npm run build`.
  3. In the same shell, run `npm run preview` (`f:vh5aw8`).
  4. In a browser, open `http://localhost:4173/admin` to check that the site answers.
- One or two sentences (`f:vh5aw8`): the run reads `BASE_URL`, default `http://localhost:4173`, the
  port the scaffold's `preview` script serves on, so a scaffolded site sets nothing. A site served
  elsewhere sets `BASE_URL` to its origin. Nothing answering there fails the run, naming the URL.
- One sentence (`f:vh5aw8`): every configured page renders under both the light and the dark theme.

**Hand-off:** "Next, give the run a signed-in session."

### Sign the rendered pass in

**First sentence:** The rendered pass reads a session cookie from `CAIRN_AUDIT_COOKIES`, and without
one it refuses with exit 2 rather than auditing the sign-in card.

**Facts:** `f:xj180v`, `f:e18694`. Cited again: `f:vsbkl6` and `f:z52s2y` (the default list
includes `/admin/login`, which is what lets the refusal fire).

Content:

- The why, one or two sentences (`f:xj180v`): without a session, every admin route redirects to the
  sign-in card, and a run would measure that card on every page. The run refuses instead, naming
  the variable. The default page list includes `/admin/login`, which the refusal needs
  (`f:z52s2y`, `f:vsbkl6`); "Scope the rendered pass" keeps it there (named by heading).
- A numbered list of four steps, one action each, the location first:
  1. In a browser, sign in to the admin at `BASE_URL`.
  2. In the browser's developer tools, copy the value of the `cairn_session` cookie, or
     `__Host-cairn_session` when the site is served over https (`f:e18694`).
  3. In the shell that runs the audit, export `CAIRN_AUDIT_COOKIES='cairn_session=<id>'`
     (`f:e18694`: Cookie-header syntax, `name=value` entries separated by `;`).
  4. In the same shell, run `npm run check:cairn:rendered`.
- The check, one sentence: the report lists findings for the configured pages and ends on the
  count line; a site whose concepts are not `posts` and `pages` sees exit 2 here, which the next
  section clears (`f:vsbkl6`, cited).
- One sentence (`f:e18694`): an entry with no `=` or an empty name throws, naming its position and
  never echoing the value, and an entry named `cairn-admin-theme` is refused, since the run sets
  that cookie for each theme.
- One sentence linking `docs/reference/cairn-audit.md#the-redirect-trap-refusal`.

**Hand-off:** "Next, point the rendered pass at the admin pages your site serves."

### Scope the rendered pass

**First sentence:** The rendered pass visits six core admin pages unless `rendered.pages` replaces
the list, and `rendered.extraPages` adds your own screens to it.

**Facts:** `f:vsbkl6`, `f:z52s2y`. Cited again: `f:xj180v`.

Content:

- One sentence (`f:vsbkl6`): the six are `/admin/posts`, `/admin/pages`, `/admin/vocabulary`,
  `/admin/media`, `/admin/editors`, and `/admin/login`.
- One sentence (`f:vsbkl6`): a page that answers outside 2xx fails the run with exit 2, so a site
  whose concepts are not named `posts` and `pages` sets `rendered.pages`.
- One sentence (`f:z52s2y`): keep `/admin/login` in a replaced list. Without it an unsigned run gets
  no refusal and reports a clean result measured against the sign-in card on every page.
  `rendered.extraPages` keeps the default list, `/admin/login` included.
- A numbered list of two steps, one action each, the location first, each conditional step with its
  condition first:
  1. If your concepts are not `posts` and `pages`, in `cairn-audit.config.json`, set
     `rendered.pages` to your concepts' list pages, the other core pages, and `/admin/login`.
  2. If your site has custom admin screens, in the same file, list their paths under
     `rendered.extraPages`.
- One `json` block showing `rendered.pages` for a site with a placeholder concept (`/admin/events`,
  the reader's own, in the brief's `local` array) beside `/admin/vocabulary`, `/admin/media`,
  `/admin/editors`, and `/admin/login`, and `rendered.extraPages` with one placeholder screen path
  (`/admin/signups`, local). A site uses one key or both as its pages need.
- The check, one sentence: rerun `npm run check:cairn:rendered` with the session still exported;
  every configured page answers, and the run reports instead of exiting 2.

**Hand-off:** "When a rendered finding is deliberate, exempt it by page and selector."

### Allowlist a rendered finding

**First sentence:** A `rendered.allowlist` entry exempts a rendered finding by page and selector,
with a required reason and an optional rule id.

**Facts:** `f:x84fah`. Cited again: `f:5y3prw` (the `Suppressed:` block).

Content:

- One sentence, the lead-in tying it to the task: a live-page finding has no source line for a
  comment, so the exemption lives in the config file. (This restates the reference's framing; the
  drafter may cut it if the first sentence already carries it.)
- One step, a single bulleted item: in `cairn-audit.config.json`, add an entry to
  `rendered.allowlist` with the finding's `page`, its `selector`, a `reason`, and its `rule`
  (`f:x84fah`).
- One `json` block with one entry, every value a placeholder the reader replaces.
- One sentence linking `docs/reference/cairn-audit.md#the-allowlist` for the selector's form (opened
  and confirmed: it states the selector is the signature a rule reports a finding under).
- One sentence (`f:x84fah`), the reason to name `rule`: an entry that stops matching becomes its own
  stale or dead finding at the named rule's tier, and at error tier when it names no rule, so an
  entry for an advisory finding names its rule.
- One sentence (`f:x84fah`): an entry whose selector cannot parse reports at advisory tier.
- The check, one sentence: rerun `npm run check:cairn:rendered`; the finding moves to the
  `Suppressed:` block (`f:5y3prw`).

**Hand-off:** "With both passes scoped and their exemptions recorded, add the audit to your workflow."

### Run both passes in CI

**First sentence:** The scaffold's workflow already runs `check:cairn` on every push, so you set its
tier and, if CI can reach a signed-in site, add the rendered step.

**Facts:** `f:guiavc`, `f:52glgy`. Cited again: `f:mrv24k` (public-scope advisories),
`f:j7fha2` (the workflow installs no browser), `f:vh5aw8` (`BASE_URL`), `f:xj180v` and `f:z52s2y`
(an unsigned step refuses).

Content, two short tasks under one heading:

- The tier, one or two sentences (`f:52glgy`): `--fail-on advisory` gates on any unsuppressed
  finding, `--fail-on error` is the default, and any other value exits 2. One sentence
  (`f:mrv24k`): the public-scope rules report as advisories, so advisory tier also gates on the
  public theme's findings.
- One step, a single bulleted item, condition first: if advisories should fail the build, in
  `.github/workflows/check.yml`, change the step to `npm run check:cairn -- --fail-on advisory`.
- The rendered step, its condition first, one or two sentences (`f:j7fha2`, `f:vh5aw8`,
  `f:xj180v`): add it only if your CI job can reach a running site and hold a session that site
  accepts. The workflow installs no browser and starts no server, so the step needs a browser
  install, a site answering at `BASE_URL`, and that session in `CAIRN_AUDIT_COOKIES`. Without that
  setup, the workflow keeps the static gate and the rendered pass runs locally, as "Verify a clean
  run" does (named by heading), so the reader is never steered into a step that exits 2.
- One sentence (`f:xj180v`, `f:z52s2y`): a rendered step without a valid session fails with exit 2
  rather than passing, as long as the page list keeps `/admin/login`.
- A numbered list of two steps under that condition, one action each, the location first; the
  list's lead-in states the condition ("If your CI job can reach a running site and hold a session
  it accepts"), as the `--fail-on advisory` step does:
  1. In `.github/workflows/check.yml`, after the install step, add a step that runs
     `npx playwright install chromium`.
  2. In the same file, add a step that runs `npm run check:cairn:rendered`, with `BASE_URL` and
     `CAIRN_AUDIT_COOKIES` read from repository secrets.
- One `yaml` fragment showing the two steps, the secret names local (the brief's `local` array),
  marked `snippet-check-skip` because it is a fragment. The section ends on this fragment, the
  edited workflow; it has no push step, since the reader pushes in "Verify a clean run" after the
  local checks pass.

**Hand-off:** "Finally, check both passes locally, then confirm the workflow passes."

### Verify a clean run

**First sentence:** A clean run exits 0 and ends on a count line with zero errors, its suppressions
still counted.

**Facts:** cited again only: `f:1md5oj`, `f:5y3prw`, `f:52glgy`, `f:vh5aw8`, `f:xj180v`,
`f:guiavc` (the workflow runs `check:cairn` on every push).

The lead-in, quoted: "Run the following checks in order." Then a numbered list, one action each,
the location first, with the result beneath each:

1. In the project root, run `npm run check:cairn`. Result: a count line reading zero errors
   (`f:5y3prw`).
2. In the same shell, print the exit code with `echo $?`. Result: `0` (`f:1md5oj`).
3. In a browser, open `BASE_URL`/admin and confirm the admin loads, with `npm run preview` still
   running in the second shell (`f:vh5aw8`).
4. In the first shell, with `CAIRN_AUDIT_COOKIES` exported, run `npm run check:cairn:rendered`.
   Result: a count line of the form `0 errors, <n> advisories, <n> suppressed` (`f:5y3prw`,
   `f:xj180v`). With `--fail-on advisory`, the advisory count is also zero (`f:52glgy`).
5. In the same shell, print the exit code with `echo $?`. Result: `0` (`f:1md5oj`).
6. From the project root, push a commit. Result: the workflow's `check` job passes; it runs the
   rendered step too if you added it (`f:guiavc`).

Each run and its exit-code print are separate steps, the same split "Run the static pass" uses.
The page's task content ends on step 6, the workflow's `check` job passing: the gate the job sets
out to build. It sits after the local checks, so the reader pushes only once both passes run
clean, and the outline's clean `check:cairn:rendered` run (steps 4 and 5) still precedes it.

**Hand-off:** "If a run breaks instead, the next section maps its message to a fix."

### Diagnose a run that exits 2

**First sentence:** A run that cannot start or finish prints `cairn-audit: <message>` and exits 2,
and the message names its cause.

**Facts:** `f:jm7f3i` (primary home is "Run the static pass"; the message prefix and exit 2 are
stated here as the table's key). Cited again: `f:eqsngu`, `f:y1mjsk`, `f:mrv24k`, `f:vwpewl`,
`f:vh5aw8`, `f:xj180v`, `f:e18694`, `f:vsbkl6`, `f:52glgy`.

Content, the anatomy's failure path (item 5):

- The lead-in, quoted: "Find the message in the following table."
- A two-column table (what the message names, the section that fixes it), no recovery prose
  restated:
  - A configured scope root that does not exist (`f:eqsngu`): "Scope the static pass".
  - A listed `sheet` that does not exist (`f:y1mjsk`): "Scope the static pass".
  - `no such config file`, from `--config` (`f:jm7f3i`): "Scope the static pass".
  - A missing `daisyui` or `tailwindcss` peer, with its install command (`f:mrv24k`): "Before you
    begin".
  - `Playwright is not installed` (`f:vwpewl`): "Install a browser and start the site".
  - The `BASE_URL` it could not reach (`f:vh5aw8`): "Install a browser and start the site".
  - `CAIRN_AUDIT_COOKIES`, from the refusal, or a malformed cookie entry (`f:xj180v`, `f:e18694`):
    "Sign the rendered pass in".
  - A page that answered outside 2xx (`f:vsbkl6`): "Scope the rendered pass".
  - A bad `--fail-on` value (`f:52glgy`): "Run both passes in CI".
- One sentence linking `docs/reference/cairn-audit.md#tiers-and-exit-codes` for the code table.

**Hand-off:** none; See also follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves
out. The extend recovery surface does not cover the audit, so no recovery link is repeated. The
introducing sentence, quoted: "The following pages cover the audit's rules and the tasks around
it." Then a bulleted list, each item's link text naming its destination:

- `docs/reference/cairn-audit.md`, every rule, flag, and config key, and the norms query.
- `docs/extend/add-a-custom-admin-screen.md`, building and auditing one custom screen.
- `docs/extend/theme-your-public-site.md#resolve-an-audit-finding`, the public-scope rules.
- `docs/extend/scaffolded-site-files.md`, the scaffold's `cairn-audit.config.json` and
  `.github/workflows/check.yml`.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The 20 fact ids this plan was
handed are all carried. `f:1x8r1x`, which the page inputs cut, is carried here scoped to one
clause. The other five page-inputs cuts stand, four of them subordinated to
`docs/reference/cairn-audit.md`.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:1md5oj | carried | Run the static pass (exit 1 only on an unsuppressed error-tier finding; advisories print; a bare run is static). Scoped in Introduction (two passes); cited again in Install a browser and start the site, Suppress a static finding, Verify a clean run |
| f:mrv24k | carried | Run the static pass (`check:cairn` builds the sheet and runs the whole registry, public-scope rules as advisories). Scoped in Before you begin (missing peer); cited again in Run both passes in CI, Diagnose a run that exits 2 |
| f:5y3prw | carried | Run the static pass (plain-text report, `Suppressed:` block, suppressed count always printed, no machine-readable output, line shape not a contract); cited again in Suppress a static finding, Allowlist a rendered finding, Verify a clean run |
| f:jm7f3i | carried | Run the static pass (config read from the working directory; `cairn-audit: <message>` and exit 2 on any failure to start); cited again in Scope the static pass (`--config` missing file) and Diagnose a run that exits 2 |
| f:eqsngu | carried | Scope the static pass (three default roots; replaces, never merges; a missing configured root fails); cited again in Diagnose a run that exits 2 |
| f:t767qb | carried | Scope the static pass (`static.adminScope` defaults; name admin roots there) |
| f:22odbz | carried | Scope the static pass (`static.cssFiles`, none by default; the admin-only motion rules read a named file only under an admin root) |
| f:xjp2mx | carried | Scope the static pass (`static.sourceScope`, default `src`, walked by the two log rules) |
| f:y1mjsk | carried | Scope the static pass (`sheet` as one path or a list; a missing listed sheet fails naming it); cited again in Diagnose a run that exits 2 |
| f:1x8r1x | carried (scoped) | Scope the static pass (the three `adminOnly` motion rules read `static.adminScope`; the others read `static.scope`), so a site names its admin roots under both keys. Its per-rule list and its `cssFiles` clause are left to `f:22odbz` and the reference |
| f:guiavc | carried | Run both passes in CI (the workflow runs `check:cairn` on every push and pull request); scoped in Introduction; cited again in Scope the static pass (the config names both sheets) and Verify a clean run (the pushed commit's `check` job) |
| f:wfv8qm | carried | Suppress a static finding (the directive, its three comment forms, the unsuppressible `suppression` finding) |
| f:vh5aw8 | carried | Install a browser and start the site (never starts a server; `BASE_URL` default; scaffold's `preview` on 4173; both themes); scoped in Introduction; cited again in Run both passes in CI, Verify a clean run, Diagnose a run that exits 2 |
| f:vwpewl | carried | Install a browser and start the site (the install command the run prints; exit 2); cited again in Diagnose a run that exits 2 |
| f:j7fha2 | carried | Install a browser and start the site (the scaffold carries no Playwright dependency); cited again in Run both passes in CI (its workflow installs no browser) |
| f:xj180v | carried | Sign the rendered pass in (the variable; the refusal, exit 2); cited again in Before you begin, Scope the rendered pass, Run both passes in CI, Verify a clean run, Diagnose a run that exits 2 |
| f:e18694 | carried | Sign the rendered pass in (Cookie-header syntax; malformed entry throws without echoing; `cairn-admin-theme` refused; `cairn_session` and `__Host-cairn_session`); cited again in Diagnose a run that exits 2 |
| f:vsbkl6 | carried | Scope the rendered pass (the six default pages; `rendered.pages` replaces; `rendered.extraPages` appends; exit 2 outside 2xx); cited again in Sign the rendered pass in, Diagnose a run that exits 2 |
| f:z52s2y | carried | Scope the rendered pass (keep `/admin/login` in a replaced list); cited again in Sign the rendered pass in, Run both passes in CI |
| f:x84fah | carried | Allowlist a rendered finding (required and optional fields; stale or dead at the rule's tier or error; unparseable at advisory) |
| f:52glgy | carried | Run both passes in CI (`--fail-on advisory`, the default, any other value exits 2); cited again in Verify a clean run, Diagnose a run that exits 2 |
| f:326755 | cut | The same-rules point belongs to `docs/extend/add-a-custom-admin-screen.md` ("Verify the screen" states it); the default static scope this page needs is carried by `f:eqsngu` |
| f:24f8gn | cut | Subordinated to `docs/reference/cairn-audit.md` "Static mode" and "What the motion rules don't cover", which state the scoped-style and class-join surfaces; the `animate-*` resolution clause is not stated there (couldNotDo; friction filed) |
| f:0w432q | cut | Subordinated to `docs/reference/cairn-audit.md` "The rules" (the `motion-reduced-delay` row, a rendered advisory under reduced-motion emulation) |
| f:54sgmg | cut | Subordinated to `docs/reference/cairn-audit.md` "The rules" (the `chip-ground-collision` row); the row does not state the `--radius-selector` detection or the skipped elements (couldNotDo; friction filed) |
| f:q07rd5 | cut | No section names the adapter's file; the audit's config is `cairn-audit.config.json` in the project root |

The page-inputs claim inventory also carried one row with no fact id, the absent prior page (no
claims), disposed as it recorded it. Its six "filed" rows (`f:5y3prw`, `f:vh5aw8`, `f:vwpewl`,
`f:e18694`, `f:z52s2y`, `f:jm7f3i`) are carried above in the sections the plan argues.

## Friction filed

The page-inputs step filed two entries on 2026-10-12 (the redirect-trap refusal depends on the
page list, `f:z52s2y`; the scaffold ships `check:cairn:rendered` it cannot run, with no CI
session, `f:j7fha2`), and this plan does not refile them. This plan filed four entries in
`docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. Engine: a `static.cssFiles` entry outside the admin roots is silently skipped by the three
   admin-only motion rules.
2. Engine: a rendered run's summary counts pages as "files scanned".
3. Engine: the engine signs its own rendered CI run in through the dev backend, a route a
   scaffolded site's preview server cannot take.
4. Docs content: `docs/reference/cairn-audit.md` leaves out three clauses this page subordinates to
   it.

## Drafting constraints

- **The brief's `local` array** takes the names the page has the reader create or supply: the
  placeholder concept route `/admin/events`, the placeholder screen path `/admin/signups`, the extra
  scope root `src/lib/components` in the example config, the CI secret names, and the placeholders
  `<id>`, `<rule-id>`, `<reason>`, `<n>`, and `<message>`.
- Never describe how a sign-in reaches the reader's inbox on a local `npm run preview`, and never
  suggest running the rendered pass against `npm run dev` or the dev backend; no fact on this page
  covers either (friction 3).
- Never claim a server started inside the CI job accepts a session copied from another server, and
  never prescribe where the CI step's server runs; state the three things the step needs and the
  exit 2 an unsigned step meets (page-inputs friction on `f:j7fha2`).
- Never quote or explain the rendered summary's "files scanned" line as a page count; quote only
  the count line (friction 2).
- Never say naming a file under `static.cssFiles` puts it under every CSS-family rule; state the
  admin-root exception (friction 1).
- Never say `--json`, a machine-readable report, or a stable line format exists; gate on the exit
  code (`f:5y3prw`). The report's line shape is not yet a designed contract (ROADMAP D8b), so the
  page may say the line format can change and claims nothing that contradicts it.
- The page names no adapter module (`f:q07rd5` is cut). A sentence that does name it says which
  site: `src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts` on the add-cairn
  tutorial's site.
- Never restate the rule list, the selector signature, the directive's reach, or the exit-code
  table; link the reference entry each section names.
- Never call the public-scope rules anything but advisories here, and give them no section; link
  `docs/extend/theme-your-public-site.md#resolve-an-audit-finding`.
- `npm run check:cairn -- --fail-on advisory` appends the flag to the script's last command,
  `cairn-audit`; write it that way, never as a flag on `npm run`.
- `cairn-audit`, `check:cairn`, `check:cairn:rendered`, `CAIRN_AUDIT_COOKIES`, `BASE_URL`, every
  config key, every rule id, and every cookie name in code spans.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of
  one step is a single bulleted item. A reference names its target by heading, never by position.
