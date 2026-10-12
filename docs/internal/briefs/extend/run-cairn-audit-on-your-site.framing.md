# Framing record: Run cairn-audit on your site

Agent-facing; drives the introduction of `docs/extend/run-cairn-audit-on-your-site.md` only; the
body follows the page plan (`docs/internal/briefs/extend/run-cairn-audit-on-your-site.plan.md`).

## Who arrives, from where, and why

1. **The scaffolded-site owner turning the shipped audit into a real gate.**
   - From: `docs/extend/scaffolded-site-files.md` (its related-work list and its
     `cairn-audit.config.json` section send "the config in depth" here; its scripts table and its
     `check.yml` section say `check:cairn:rendered` cannot run as shipped), or the extend index's
     Operate group.
   - Came for: what the config's keys do, and how to make both audit scripts run.
   - Knows: the scaffold's files, and that `check:cairn` already runs in CI.
   - Lacks: what the defaults cover, that the rendered pass needs Playwright, a running site, and a
     signed-in session, and the exit-code rule.
2. **The developer whose admin has outgrown the defaults** (custom screens, concepts not named
   `posts` and `pages`, components or stylesheets outside the default roots).
   - From: `docs/extend/add-a-custom-admin-screen.md`, "Verify the screen" (it says this page sets
     up a rendered run for a custom screen) and its See also (rendered runs, suppressions,
     allowlists).
   - Came for: putting their own screens and concept pages in the rendered pass, and scoping the
     static pass to where their files live.
   - Knows: `npm run check:cairn` over `src/routes/admin`, the two tiers, that `--rendered` exists.
   - Lacks: `rendered.pages` and `rendered.extraPages`; that on a site whose concepts are not
     `posts` and `pages` the rendered pass exits 2 on the default page list (`f:vsbkl6`); the
     sign-in; the allowlist.
3. **The theme developer with a public-scope finding that persists.**
   - From: `docs/extend/theme-your-public-site.md`, "Resolve an audit finding" step 4 ("If a
     finding persists, see ..."), and the same page's introduction and See also (the outline
     crossLink: running the public-scope rules as a gate).
   - Came for: what to do with a finding the theme keeps on purpose, and how to make the public
     rules fail the build.
   - Knows: the three public-scope rules, `npx cairn-audit --rule ...`, the rule rows in the
     reference.
   - Lacks: that those findings are advisories that never change the exit code by default
     (`f:mrv24k`); the suppression directive and its required reason (`f:wfv8qm`); `--fail-on
     advisory` (`f:52glgy`). The rule-by-rule fixes stay on the theme page.
4. **The developer whose run broke.**
   - From: `docs/extend/debug-your-site.md`'s introduction (it defers audit configuration here), a
     red CI log with a `cairn-audit: <message>` line, or a search on that message.
   - Came for: what the message means and what fixes it.
   - Knows: their CI and the site's logs.
   - Lacks: that exit 2 is a run that broke, not a finding (`f:jm7f3i`), and which setup piece each
     message names. Served by "Diagnose a run that exits 2".
5. **The developer wiring the audit into other tooling** (a CI annotation step, a dashboard).
   - From: a search, or the flag list in `docs/reference/cairn-audit.md`.
   - Came for: a machine-readable report.
   - Knows: CI scripting.
   - Lacks: that none exists. The report is plain text with no `--json`, and its line shape is not
     yet a designed contract (ROADMAP D8b), so tooling gates on the exit code (`f:5y3prw`). The
     introduction tells them so early; the page offers the exit code, nothing more.
6. **A site built by hand** (the add-cairn tutorial's site), arriving from the index or a search.
   - Came for: running the audit on a site without the scaffold's audit files.
   - Knows: the engine wiring.
   - Lacks: the `daisyui` and `tailwindcss` peers the run needs (`f:mrv24k`, "Before you begin"),
     and the scripts. With no `cairn-audit.config.json` the audit runs on its defaults
     (`f:jm7f3i`), and the package puts `cairn-audit` on the path (`f:h2wtin`). The plan's CI
     section assumes the scaffold's workflow, so the introduction promises a hand-built site no CI
     step of its own.

Readers in the wrong place, each with the page they belong on:

- Building one custom screen and auditing it while they work:
  `docs/extend/add-a-custom-admin-screen.md#verify-the-screen`.
- Asking what a rule means or how to clear its finding: `docs/reference/cairn-audit.md`; for the
  three public-scope rules, `docs/extend/theme-your-public-site.md#resolve-an-audit-finding`.
- Looking for the audit trail of admin actions (the `audit_log` table a site's audit sink writes,
  `f:wnvqlz`), a different record that shares the word:
  `docs/extend/add-a-custom-admin-screen.md#wire-the-audit-sink`.

## Background the page rests on

- **What the audit is for.** A site's admin is cairn's own admin toolkit plus what the site adds,
  so conformance to cairn's design system is what the audit measures, and it ships whole as a
  consumer product; three rules check the site's public files instead, at advisory tier on a site
  (`f:xh2mwb`, `f:mrv24k`). This is why a site makes it a gate: the site's additions answer to the
  same design system as the engine's screens. The owner-tier key phrase is "ships whole, as
  consumer product"; a sentence that uses it cites `f:xh2mwb`. State no rule counts.
- **Two passes.** A bare run is the static pass over source files and the compiled admin
  stylesheet; `--rendered` drives a browser over live admin pages on a site that is already
  running, under the light and the dark theme (`f:1md5oj`, `f:vh5aw8`, `f:guiavc`). Findings come
  in two tiers, and only an unsuppressed error-tier finding exits 1 by default (`f:1md5oj`).
- **The verdict is the exit code (D8b).** The report is plain text for a person, with no `--json`
  or other machine-readable output, and its line shape is not yet a designed contract, so the line
  format can change on an engine update (`f:5y3prw`, filed `[verified]`; ROADMAP D8b sits at
  `ROADMAP.md:1099-1101` in this worktree). Every finding line does print its rule id and `--rule
  <id>` selects by it, so the page never says findings lack stable ids or codes; it says only that
  the line format is not yet a contract.
- **Where a scaffolded site starts.** The static half already runs: the scaffold's GitHub Actions
  workflow runs `check:cairn` on every push and pull request, and its config names both compiled
  admin sheets (`f:guiavc`), over the default admin roots (`f:eqsngu`). The rendered half ships as
  `check:cairn:rendered`, which cannot run as shipped: no Playwright dependency and no browser
  install in CI (`f:j7fha2`), and without a session the run refuses with exit 2 (`f:xj180v`).
- **Why the rendered defaults are what they are.** The default page list names the engine's core
  admin pages and `/admin/login` (`f:vsbkl6`); `/admin/login` is there because the redirect-trap
  refusal needs it, and the refusal exists because an unsigned run would otherwise measure the
  sign-in card on every page and report clean (`f:z52s2y`, `f:xj180v`). This is body material
  ("Sign the rendered pass in", "Scope the rendered pass"); the introduction does not argue it.
- **SvelteKit.** The static pass reads the site's Svelte components under the admin roots, their
  markup and scoped `<style>` blocks, and the admin sheet the scaffold compiles with Tailwind and
  daisyUI (`f:eqsngu`, `f:22odbz`, `f:mrv24k`). The rendered pass loads the built app from
  `npm run build` and `npm run preview` (`f:vh5aw8`).
- **Cloudflare.** It enters only through the preview server: the scaffold's `preview` script is
  `wrangler dev` on port 4173, the default `BASE_URL` (`f:vh5aw8`), and a site served over https
  names its session cookie `__Host-cairn_session` (`f:e18694`). The deploy is left out on purpose:
  the setup command's Workers Builds trigger deploys every push to the default branch and runs only
  `npm run build` and `npx wrangler deploy` (`f:qca0t0`, `f:jtl15v`), so the audit is no part of
  the deploy. The page calls the audit the site's gate only as the workflow's `check` job on each
  push and pull request, and claims nothing about a deploy waiting for it (friction filed).
- **GitHub.** The gate lives in the scaffold's GitHub Actions workflow (`f:guiavc`). A rendered
  step there is conditional: the workflow installs no browser and starts no server, and the step
  needs a session the site accepts (`f:j7fha2`, `f:vh5aw8`, `f:xj180v`). Branch protection, the
  GitHub setting that would hold a merge on the check, is left out: no fact covers it and it is
  GitHub's, not cairn's.
- **The adapter module.** The introduction names no adapter file; it speaks of the site's
  concepts. `f:q07rd5` stays cut. A sentence that does name the file says which site:
  `src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts` on the add-cairn
  tutorial's site (`f:q07rd5`).

## Place in the doc set

- **Group and neighbors.** Operate, in `docs/extend/README.md`, beside Upgrade cairn, Migration
  notes, Debug your site, and Rotate the GitHub App key. It is the extend track's one home for
  configuring the audit site-wide.
- **What links in, and why.** Four siblings defer here by page name, never by anchor:
  `docs/extend/scaffolded-site-files.md:68,174` (the config in depth),
  `docs/extend/theme-your-public-site.md:41,500,509` (running the public rules as a gate; a
  persisting finding), `docs/extend/add-a-custom-admin-screen.md:547,568` (a rendered run for a
  custom screen; whole-site configuration), and `docs/extend/debug-your-site.md:30` (audit
  configuration is outside the recovery surface). Outbound, per the outline:
  `docs/reference/cairn-audit.md` (every rule, flag, key, and exit code) and
  `docs/extend/add-a-custom-admin-screen.md` (the screen-level audit while building).
- **What the siblings own, so the introduction words shared ideas fresh.**
  - `add-a-custom-admin-screen.md` opens on cairn's content-versus-developer boundary and says
    `cairn-audit` applies the engine's rules to everything under `src/routes/admin`; its Verify
    section states the advisory exit-code rule and the bare-versus-`--rendered` split. This
    introduction frames the same two passes from the whole site's admin and the design system,
    not from one screen, and repeats none of those sentences.
  - `theme-your-public-site.md` opens on cairn's admin-versus-public styling split and introduces
    the three public-scope rules as the theme's check. This introduction mentions them once, as the
    audit's advisory-tier public checks, and routes rule-level fixes back to that page.
  - `scaffolded-site-files.md` describes `check.yml`, the scripts, and `cairn-audit.config.json` as
    files. This introduction starts from what those files leave undone (the rendered half), not
    from a file tour.
  - `debug-your-site.md` is the extend recovery surface and does not cover the audit, so the page
    keeps its own failure-path section, which the introduction names for a reader whose run broke.
  - `docs/reference/cairn-audit.md` owns the exit-code table and the rule list; the introduction
    restates neither and links the reference in the bounds list.

## Intro plan

Three paragraphs under the H1, then the plan's bounds lists. The introduction opens on a statement
about the subject from the reader's situation, never an imperative and never a sentence about the
page.

1. **The model and why it exists.** Open on the site's admin: it is cairn's admin toolkit with the
   site's own additions in it (its screens, its stylesheets, the list pages of its own concepts),
   and `cairn-audit` measures all of it against cairn's design system, while three of its rules
   check the public theme instead, at advisory tier (`f:xh2mwb`, `f:mrv24k`, `f:vsbkl6`). Then the
   two passes: a bare run is the static pass over source files and the compiled admin stylesheet,
   and `--rendered` drives a browser over live admin pages on a site that is already running,
   under the light and the dark theme (`f:1md5oj`, `f:vh5aw8`, `f:guiavc`). Findings come in two
   tiers, which "Run the static pass" sets out (named by heading). Close on the verdict: the exit
   code is what a CI job or a script reads, since the report is plain text for a person, with no
   machine-readable output and a line format that can still change (`f:1md5oj`, `f:5y3prw`). This
   one clause serves reader 5; the full statement stays in "Run the static pass". No rule counts,
   no exit-code table, no claim that findings lack ids.
2. **Where a site starts, and the contract.** A scaffolded site already runs the static pass in its
   GitHub Actions workflow on every push and pull request, over the default admin roots and both
   compiled admin sheets (`f:guiavc`, `f:eqsngu`). The rendered half ships only as
   `check:cairn:rendered`, which cannot run as shipped: the site has no Playwright and the workflow
   installs no browser (`f:j7fha2`), and an unsigned run refuses (`f:xj180v`). The contract
   sentence, inside this framing: make the audit the site's gate by scoping both passes to the
   site's sources, stylesheets, and admin pages, signing the rendered pass in, recording each
   exemption with its reason, and running the audit in the workflow's `check` job. Then one
   sentence for reader 6: the steps follow a scaffolded site; a site without its scripts runs
   `npx cairn-audit` in their place, and a site with no `cairn-audit.config.json` runs on the
   defaults (`f:jm7f3i`, `f:h2wtin`). The gate is the check on each push and pull request; say
   nothing about deploys or branch protection.
3. **Each reader's reason, with the section that answers it** (one clause each, sections named by
   heading):
   - A site whose concepts are not named `posts` and `pages`: the rendered pass exits 2 on the
     default page list until `rendered.pages` names the site's own, in "Scope the rendered pass"
     (`f:vsbkl6`).
   - Custom admin screens join the rendered pass through `rendered.extraPages`, in the same section
     (`f:vsbkl6`).
   - A public-theme finding that persists after the theme page's checks is an advisory, which fails
     a run only under `--fail-on advisory`, and one the theme keeps on purpose is suppressed with a
     recorded reason ("Suppress a static finding", "Run both passes in CI") (`f:mrv24k`,
     `f:52glgy`, `f:wfv8qm`).
   - A run that stops with `cairn-audit: <message>` and exits 2 broke rather than found something,
     and "Diagnose a run that exits 2" maps each message to its fix (`f:jm7f3i`).

Then the plan's bounds, kept as the plan words them (items 3 and 4 of its introduction):

- **Prior knowledge:** npm scripts, JSON config files, a GitHub Actions workflow, and reading a
  cookie in a browser's developer tools; no cairn knowledge beyond the site's admin.
- **Not covered, with the page that covers it:** every rule, flag, and config key
  (`docs/reference/cairn-audit.md`); the three public-scope rules in depth
  (`docs/extend/theme-your-public-site.md#resolve-an-audit-finding`); auditing one custom screen
  while building it (`docs/extend/add-a-custom-admin-screen.md#verify-the-screen`); and, added
  here, the audit trail of admin actions, a separate record that shares the word
  (`docs/extend/add-a-custom-admin-screen.md#wire-the-audit-sink`, `f:wnvqlz`). This list may name
  the pages, since scope has no subject-first form.

## Departures from the plan's introduction

- **The why is backed and leads.** The plan's item 1 says the audit checks the admin against
  cairn's design system with no fact behind the clause. Paragraph 1 rests it on `f:xh2mwb` (the
  site's admin is cairn's toolkit, so design conformance is what ships) and makes it the reason a
  site gates on the audit.
- **The verdict clause moves forward.** The plan states the plain-text, no-machine-readable-output
  limit only in "Run the static pass". Paragraph 1 carries one clause of it so reader 5 learns at
  once that the page offers the exit code and no parseable report; the body keeps the full
  statement.
- **The rendered half's starting state joins the static half's.** The plan's item 1 names only the
  static pass already in CI. Paragraph 2 adds that `check:cairn:rendered` cannot run as shipped
  (`f:j7fha2`, `f:xj180v`), since that gap is why readers 1 and 2 arrive, and adds the hand-built
  site's one sentence (`f:jm7f3i`, `f:h2wtin`).
- **Several readers in place of one.** The plan's item 2 names one reader (a developer whose admin
  outgrew the defaults) and routes one more. Paragraph 3 names four reasons, per the register's
  ruling that each reader learns early whether the page answers them. The plan's routed reader
  (one custom screen while building) stays routed, in the not-covered list, where the plan's item
  4 already puts it.
- **One more wrong-place route.** The not-covered list gains the audit trail (`f:wnvqlz`), since
  the custom-screen page uses both "audit trail" and `cairn-audit` and a search on "audit" can
  land here.
