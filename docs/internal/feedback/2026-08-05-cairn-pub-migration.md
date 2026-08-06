# cairn-pub: 0.87.4 to 0.94.0-rc.1

## 1. The walk

Site `cairn-pub` (`glw907/cairn-pub`), `0.87.4` to `0.94.0-rc.1`, pinned exactly rather than
caret-ranged. This was the second of the four, and the first to follow the [upgrade
guide](../../guides/upgrade-cairn.md) that `aksailingclub-org` wrote. The recipe held. Its eight
steps ran in order with no improvisation.

ASC, which wrote the guide, is admin-heavy and consumes four server seams. This site is
public-delivery with a thin admin. It has one custom screen, one `requireOwner` call, and a facade
mount, and it hand-rolls no action wrapper, sink, or login channel. It also renders the engine's own
docs tree at build time, out of `node_modules/@glw907/cairn-cms/docs`, which makes seven minors of
documentation part of its build output.

Lists crossed: `0.88.0` (nothing, all additive), `0.89.x` and `0.90.x` (no lists at all), `0.91.0`
and `0.91.1` (four entries between them, of which this site carried none), `0.92.0` (two, neither
carried), `0.93.0` (nothing), and `0.94.0-rc.1` (fifteen, of which this site carried two).

**Delta 1, what the guide got wrong.** Step 3 tells you to run the typechecker first because "most
of a breaking window is renames, and the compiler enumerates those faster and more completely than
you can grep." That is true of an admin-heavy consumer and misleading for a delivery-shaped one.
Seven minors and the largest breaking window cairn has shipped produced one compile error here,
`makeMediaResolver` to `buildMediaResolver`, because `app.d.ts` imports
`@glw907/cairn-cms/ambient` and the site mounts through the `createCairnAdmin` facade. Nearly every
entry in the `0.94.0-rc.1` list names an admin-side type, a route-factory member, or a refusal a
facade consumer never annotates. Step 3 is still the right first move, but its payoff scales with
how much of the admin surface you consume. A green typecheck is a fact about the site's shape, not
evidence the window was small.

Step 7 also has no branch for a site with no visual baselines, which is this one. Told to regenerate
baselines after a rendering window, such a site has nothing to regenerate and no instruction for
what to do instead. The substitute this walk used, and the one the step should name, is the rendered
audit under a session cookie plus a live before-and-after read on whatever the window moved, with
the "before" captured from the deployed site before the upgrade goes out.

**Delta 2, what the guide never mentioned.** `cairn-audit`'s `rendered.pages` **replaces** the
default page list rather than extending it. A consumer following step 8 who adds its own admin
screen writes `{"rendered": {"pages": ["/admin/signups"]}}`, drops cairn's six core routes without
being told, and gets a narrower audit that still reports a clean pass. That is the same silent green
step 8 exists to rule out, arriving through the config layer instead of a missing cookie. The
audit's own config loader names that hazard for typos ("a typo that quietly narrows the audit to
nothing is the silent green this engine exists to rule out") and does not catch this one. The config
file here restates all six defaults beside the site's own page. Either document the replace
semantics at the `rendered.pages` row, or merge instead of replacing.

Nothing in the guide anticipates a consumer that renders the docs tree. That is one site, so it is
not a step, but it is the largest piece of work in this walk and worth a sentence somewhere:
upgrading swaps `node_modules/@glw907/cairn-cms/docs` wholesale, and a site that reads it inherits
every added page, every retired page, and every reordered arm index as content work.

**First gate failure.** `npm run check`, on the `makeMediaResolver` rename, before anything else
ran. On this shape of consumer the typechecker is a short step rather than the body of the
migration, so the highest-signal event in this walk is not the first gate failure but the doctor run
below.

The failure that mattered came next, from `check:docs-links`, which is this repo's own gate and not
cairn's. The docs corpus went from 66 rendered pages to 80: fifteen added, one retired
(`reference/admin-fields`, whose subpath merged into `/admin-toolkit`, leaving the old public URL
404ing), and the tutorial stopped being a single page. `docs/README.md` now links
`./tutorial/build-a-theme.md`, and the site's loader had hard-coded one tutorial file at
`/docs/tutorial`, so the link resolved to a route that was not in the enumeration. The tutorial now
loads as an ordered arm with its own prev/next chain, its first page serving as the arm's front
door. The link policy already handled the new path; only the enumeration was behind. No typechecker
reaches the rendered corpus. A site that renders it needs a link check of its own.

**Runtime-only, past typecheck and build.** Four.

Two are pre-existing production defects on this site, surfaced by running steps 5 and 8 rather than
by the version bump. `cairn-doctor` reported `GitHub App: repo glw907/cairn-pub returned 404`. The
`cairn-cms` App authenticates and mints an installation token fine; `GET
/installation/repositories` returns `glw907/907-life` and `glw907/ecxc-ski` and not this repo, which
was never added to the installation. The live symptom is quieter than the doctor's: `/admin/posts`
renders a calm "No posts" empty state and logs `github.unreachable` at `warn` with `scope: "shell"`,
so an editor sees an empty content library rather than an unreachable backend. Meanwhile `/healthz`
reports `ok: true`, because `healthLoad` signs a dummy JWT and stops. Its scoping is deliberate and
documented in the source, but the endpoint is named `healthz` and its top-level field is `ok`, and a
site whose saves and publishes cannot commit answers both affirmatively. **The doctor caught a
defect with nothing to do with the upgrade.** Step 5 should describe it as a site health check
rather than an upgrade-compatibility check.

The second: `/admin/signups`, this site's custom-screen seam proof, returned a 500 error page to a
valid owner session and had done so since launch. `APP_DB` contained only `_cf_KV`; no migration
creating the `signups` table exists anywhere in the repo's history. The response carried HTTP 200
with the 500 body, so a status-code check read the screen as healthy, which is why nothing had
caught it. This is the live admin smoke this repo had owed since launch. Its first run found the
defect.

That defect then exposed a gap in `cairn-audit` itself. The rendered run audited `/admin/signups`
while the screen was still broken, measured the public site's error page under that route's name,
and reported the whole run at zero errors. It measured the public site's chrome because this site's
only error boundary is the public `+error.svelte`, so anything thrown inside `/admin` renders the
public page. The post-hydration page-identity guard did not fire: it compares the settled DOM
against the server-rendered response's identity, and both were the same error page, so they matched.
The guard catches a route that hydrates into different chrome and misses a route that renders an
error page consistently. The findings were legible as wrong only by reading them
(`header.site-header`, `footer.site-footer`, an accent-filled "Return to homepage").

The fourth is a behavior change with no compile-time or test-time channel at all, and it is the one
`0.94.0-rc.1` names. Before the upgrade, `/admin/login` sent `Strict-Transport-Security:
max-age=63072000; includeSubDomains`; after, `max-age=63072000`. The changelog tells you to check
your zone before deciding, and the zone check is the part worth reporting: `GET
/zones/{id}/settings/security_header` returns `403 Unauthorized to access requested resource` under
this operator token, the same 403 the ASC walk filed, where both zone checks report a permission
failure in the words a wrong setting gets. The answer had to come from measuring live response
headers instead, and it is that the zone sends no HSTS at all, so taking the new default is correct
here and no `includeSubDomains: true` is set.

One carried-forward wart, verified rather than discovered. `SiteResolver.entries()` returns paths
with no leading slash (`p.replace(/^\//, '')`), so this site's catch-all filter `e.path !== '/home'`
had never matched, and the `/home` entry it exists to exclude was enumerated, prerendered, and
404'd by the route's own load, with `handleHttpError: 'warn'` absorbing the result. Still true on
`0.94.0-rc.1`, and the window's own new code argues for fixing the consumer rather than the shape:
`markdownEntries()` reads the same slash-less `entries()` and re-adds the slash itself before every
`byPermalink` call, so the engine already treats the missing slash as the caller's business. It also
carries no equivalent of this site's `/home` exclusion, so a site whose home entry composes the root
instead of serving its own permalink has to filter the twin as well as the page.

## 2. Seam fit

**This migration consumed no new engine seam.** No table, and the absence is the result.

Nine seams arrived across the seven minors: `/auth-store`, `/auth-crypto`, `/cloudflare`,
`createSectionAction`, `createD1AuditSink`, `newlyPublishedEntries`, `markdownEntries`, `aiPosture`,
and `defineAccess`. This site adopted none. It has one audience to authenticate, no Turnstile form,
no rate-limited endpoint, no domain events, and no hand-rolled section action to replace. The one
thing it consumed that it had not before is `cairn-audit`'s `rendered.pages`, a CLI configuration
key and not an engine seam.

The fifteen `Consumers must:` entries in this window are almost entirely admin-side, which is why
this site carried two. On this site the largest breaking window cairn has shipped cost one compile
error and one behavior change. Whether that holds for a delivery-shaped consumer generally is what
the remaining two walks test.

One cross-check the ASC walk could not run: this site imports neither `/auth-crypto` nor
`/cloudflare`, and its Worker starts and serves `200` on `0.94.0-rc.1`. The [`rc.1` Workers
blocker](./2026-08-05-rc1-worker-condition-defect.md) is scoped exactly to those two subpaths, as
that document says, and a consumer adopting neither is unaffected.

## 3. Cost

Tokens: roughly 65.5M total across the session, of which 243K output and 63.7M cache reads, read off
the session transcript's own usage records at the commit that lands this file, plus 115K on top in
two subagent dispatches (a `code-simplifier` and a register review). The first walk cost 65.6M.
**The recipe did not make the second walk cheaper.**

The shape of the spend says why, and it is the more useful number. At the point the migration was
finished, deployed, and smoke-tested, the session stood at **39.2M**. The remaining 26M went on
writing this report, reviewing it against the register, and routing its findings into the guide, the
reference, the friction log, and the ROADMAP. Doing the work cost 60% of the walk and reporting on
it cost 40%, on a site whose migration cost one compile error.

Two things follow for the remaining walks. Expect the reporting half to dominate wherever the site
is small, so a site-size argument predicts the wrong total. And a cache-read-dominated session bills
the accumulated context on every turn, so the findings-routing tail is expensive precisely because
it comes last, after the transcript is at its longest. Routing each finding as it is found, rather
than in one pass at the end, is the cheaper shape and the one the third walk should try.

Human interaction points: **zero questions asked, one blocking item handed over at the end.** The
`cairn-cms` GitHub App installation has to gain `glw907/cairn-pub` before a save or publish can
commit, and adding a repository to an App installation needs a token that can modify the App. The
`gh` OAuth token is refused ("You do not have permission to modify this app on glw907") and the
stored bot PAT returns `401`. That is a genuine blocker rather than a question, and it leaves the
save-and-publish half of this repo's owed smoke unrun. The sign-in half ran clean: magic link
requested, mail read, confirmation posted, session issued, all ten admin screens rendering, and the
custom screen's own create and remove actions round-tripping against D1.

One judgment call was made and stated rather than asked: creating the missing `signups` table and
applying it to the live `APP_DB`, rather than reporting the 500 and leaving broken a screen this
same pass had audited and moved onto the new type grammar.

## 4. Where each finding went

- Step 3's "most of a breaking window is renames" reading as a promise rather than a
  shape-dependent expectation: **fixed here**, in the guide's step 3.
- Step 7 having no branch for a site with no visual baselines: **fixed here**, in the guide's step
  7, naming the cookie-carrying rendered audit plus a live before-and-after as the substitute.
- `cairn-audit`'s `rendered.pages` replacing the defaults rather than extending them: **fixed
  here**, documented at the `rendered.pages` row of the audit reference and referenced from the
  guide's step 8. The merge-instead-of-replace alternative is **filed to the friction log**, since
  it is a behavior change in the config loader rather than a doc gap.
- The docs corpus being part of a consumer's build output: **fixed here**, a paragraph in the
  guide's step 6 noting that the tarball's `docs/` tree changes with the version and instructing a
  consumer that renders it to run its own link check.
- `cairn-doctor` catching a pre-existing defect unrelated to the upgrade: **fixed here**, rewording
  step 5 to describe the doctor as a site health check.
- `/healthz` reporting `ok: true` while the App installation cannot reach the repo: **filed to the
  ROADMAP**, at the tier that owns the health surface. `healthLoad` stopping at signing is a real
  scoping decision, so the ask is a second check that mints an installation token and reads the
  repo, not a change to the existing one.
- `cairn-audit`'s page-identity guard passing a route that renders an error page consistently:
  **filed to the ROADMAP**, beside the guard. A response-status assertion on the no-JavaScript
  baseline capture is the candidate fix, since the harness already takes that capture.
- `cairn-doctor`'s two zone checks reporting a permission 403 as the same `FAIL` a wrong setting
  gets: **already filed to the friction log** by the ASC walk, with the guide carrying a warning in
  the meantime. This is the second site, on a different zone under the same operator token, which
  is the altitude signal and rules out one site's misconfigured token. Adding here: `0.94.0-rc.1`
  shipped the precedent for the fallback that entry already proposed, since `ai.posture-effective`
  answers a live-state question credential-free by reading `robots.txt`, and `edge.hsts` can read a
  response header the same way. **Filed to the friction log** as an amendment.
- `SiteResolver.entries()` returning slash-less paths, so a consumer's leading-slash filter is a
  silent no-op: **fixed in the site**, and **dropped as an engine ask**. `markdownEntries()` re-adds
  the slash at the engine's own call site, which settles the shape as the caller's business, and
  normalizing `entries()` would break every consumer filter already written against the real shape.
  The site's `docs/STATUS.md` carried this as owed upstream since Pass 3; that entry is now closed.
- `markdownEntries()` carrying no equivalent of a site's own home-entry exclusion: **dropped**, not
  an engine finding. A composed-only home entry is the site's design, and the twin can only serve
  what the resolver carries, so the filter belongs with the site that wrote the resolver's input.
- The `0.87.4`-to-`0.94.0-rc.1` window costing one compile error on a delivery-shaped consumer:
  **dropped as an engine finding**, kept as the measurement in section 2.
- The `rc.1` Workers blocker's scope, cross-checked against a consumer importing neither subpath:
  **corroborates the existing filing**, nothing new to file.
- Taking `0.94.0`'s new HSTS default rather than setting `includeSubDomains: true`: **dropped**, not
  a finding. The changelog's instruction is correct and the zone's answer made the decision.
- The tutorial-arm enumeration in this site's docs loader: **fixed in the site**, not an engine
  finding. The engine's own link policy already resolved the new path.
- `/admin/signups` returning HTTP 200 with a 500 body, and the missing `signups` table: **fixed in
  the site**, `migrations/0002_signups.sql`, applied to the live `APP_DB` and verified end to end.
  Not an engine finding.
- The GitHub App installation not carrying `glw907/cairn-pub`: **handed to Geoff**, since it needs
  browser-side App settings. Recorded in the site's `docs/STATUS.md` as the one open item.
- This site's only error boundary being the public `+error.svelte`: **filed to the site's own polish
  backlog**. It is a site-side gap, and `0.94.0`'s refusal-channel convergence now routes
  `adminAction`'s 403 to the same boundary, which makes an admin-scoped `+error.svelte` worth
  having.
- The retired `/docs/reference/admin-fields` URL now 404ing on a public docs site: **filed to the
  site's own polish backlog**. The corpus versions with the engine by design, and building redirect
  infrastructure did not belong in a migration pass.
