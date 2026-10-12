# Framing record: Turn on tidy

Agent-facing; drives the introduction of `docs/extend/turn-on-tidy.md` only; the body follows the
page plan (`docs/internal/briefs/extend/turn-on-tidy.plan.md`).

## Who arrives, from where, and why

1. **The developer turning tidy on for their editors.**
   - From: the extend index's "Extend the admin" group; `docs/extend/scaffolded-site-files.md:166`,
     the one published inbound link, where `.dev.vars.example`'s empty `ANTHROPIC_API_KEY` is "read
     only when tidy is enabled"; the legacy `enable-tidy` paths, which redirect here; a search for
     cairn's AI copy-edit.
   - Came for: the setup end to end, and the two choices that have defaults (model, conventions).
   - Knows: their own site (scaffolded or built by the add-cairn tutorial), Wrangler, the
     committed site config, the server module that calls `createCairnAdmin`.
   - Lacks: what tidy needs and where each piece lives; that the engine owns everything between
     the button and the review; that a settings change reaches tidy only on a deploy. On a
     scaffolded site, that the switch is already on and only the package and the key are missing
     (`f:9y46v0`).
2. **The developer deciding whether to offer tidy at all.**
   - From: the extend index; the scaffolded-site-files `.dev.vars.example` entry; a Tidy button
     already showing in the scaffold's admin (under the dev backend it calls a stub, `f:mbw7mk`).
   - Came for: what tidy does to an author's text, where the text goes, what stays in the
     editor's hands, and what carrying it costs the site.
   - Knows: cairn's admin and editing model.
   - Lacks: the model: a copy-edit that proposes and never writes on its own, run on Anthropic
     with the site's own key, and free to leave off.
   - Served by paragraph 1 and the explanation section "What tidy can change in a draft".
3. **The developer whose editors report a refusal, a Tidy button that vanished, or a call that
   timed out.**
   - From: an editor's report (the 401/403 refusal tells the editor to let their site developer
     know, `f:mg0n21`); a `tidy.failed` record found through `docs/reference/log-events.md` or
     `docs/extend/debug-your-site.md#read-the-structured-logs` (which has no tidy row); a search
     for a refusal's text. A freshly deployed scaffolded site is the common case: its switch is on
     and no key is bound, so every click refuses with the missing-key message (`f:9y46v0`,
     `f:rdenuk`).
   - Came for: the cause and the fix of one message.
   - Knows: the message, and that tidy is on or seems to be.
   - Lacks: the message-to-cause-to-fix map; that a rejected key hides the button for the cache
     window (`f:mg0n21`); that the Settings screen proves the key and nothing else (`f:rcoz6t`).
   - Section: "Diagnose a refusal", and the Settings states in "Verify tidy on the deployed site".
4. **The developer who routes Anthropic traffic through a gateway of their own, or needs a longer
   deadline.**
   - From: the `CairnAdminConfig`, `ContentRoutesConfig`, and `TidyClient` rows in
     `docs/reference/sveltekit.md`; repeated "Tidy could not finish" refusals (the refusal table's
     timeout row points on); a search.
   - Came for: where the call's deadline and client are set, and the client's contract.
   - Knows: their server module, `createCairnAdmin`, their gateway.
   - Lacks: that this `tidy` block lives in the server module, apart from the site config's
     `tidy` block (friction filed: two `tidy` blocks); the 30-second default; the factory's
     signature and result shape (`f:w5h8rn`, `f:tcvrgk`, `f:tcadyk`).
   - Section: "Configure the tidy call's deadline and client".

Readers in the wrong place, each named with the page that serves them:

- An editor who wants to run tidy or work through its review: the editor documentation, which has
  no page yet; named in words, no link (the outline's out-of-scope item).
- A developer who came about AI crawlers or training on the public site, not a model editing
  drafts: `docs/extend/choose-an-ai-posture.md`.
- A developer looking for the site-config file's other keys, or the tag vocabulary that shares the
  file: `docs/extend/define-an-adapter-and-schema.md`.

## Background the page rests on

1. **The general model.** Tidy is an AI copy-edit that an editor runs on a draft, and it never runs
   without an editor's click (`f:glluwk`). It always fixes objective errors and applies only the
   conventions the site declares (`f:3yte99`). It proposes a diff the editor keeps or drops change
   by change, and nothing is written until Apply (`f:noqkmx`). A result that changed more than the
   wording is discarded before review (`f:q412re`, `f:s6av65`).
2. **Why the default is off** (the page turns it on, so the introduction says why it starts off).
   Each call sends the editor's text to Anthropic on the site's own key and spends tokens, so the
   design makes tidy opt-in (`f:4gnt5j`, filed by this step, `f:glluwk`). Off costs a site nothing:
   the SDK is an optional peer imported only when a call runs, so a site without it builds
   (`f:vcthwj`, `f:ymsfzv`), and the key is the one optional binding (`f:59aion`). The one
   exception a reader meets: a scaffolded site's site config already sets the switch on, with no
   package and no key, so its deployed Tidy button refuses until the setup is finished
   (`f:9y46v0`, filed by this step, `f:rdenuk`).
3. **The split.** The engine owns the prompt, the size cap (`f:f5548q`), the deadline
   (`f:tcvrgk`), the structural check (`f:q412re`), and the review (`f:noqkmx`). The site owns
   the package (`f:vcthwj`), the switch (`f:avtt69`, `f:p7v2xe`), and the key (`f:avtt69`), and may
   set the model (`f:k3m9qa`) and the conventions (`f:3yte99`).
4. **Cloudflare.** The key is a Worker secret, read from the Worker's env when a call arrives
   (`f:avtt69`, `f:4gnt5j`), and the one optional member of `CairnPlatformBindings` (`f:59aion`).
5. **GitHub and the deploy.** The switch, the model, and the conventions live in the committed
   site-config file. The runtime takes the `tidy` block at build, and an editor's save on
   `/admin/settings` commits `tidy.conventions` to the default branch, so any change, the
   developer's edit or the editor's save, reaches tidy only once its commit deploys (`f:p7v2xe`,
   `f:0j54bd`, `f:shv6wv`). The tidy call itself commits nothing (`f:4gnt5j`).
6. **SvelteKit.** The site writes no route for tidy: the action belongs to the admin routes that
   `createCairnAdmin` builds (`f:glluwk`, `f:w5h8rn`). The site's one code-side touch is a separate
   `tidy` block on its `createCairnAdmin` call, holding the deadline and an optional client
   (`f:w5h8rn`, `f:tcadyk`, `f:tcvrgk`). The introduction keeps the two `tidy` blocks apart by
   naming the file each lives in.
7. **Which site.** The introduction names no path. A sentence that does names the site: the
   site-config file is `src/theme/site.config.yaml` on a scaffolded site (`f:em69ru`) and
   `src/lib/site.config.yaml` on the add-cairn tutorial's site; the adapter is
   `src/theme/cairn.config.ts` or `src/lib/cairn.config.ts` (`f:q07rd5`); the server module is
   `src/chassis/cairn.server.ts` on a scaffolded site (`f:s4prb0`) and, on the tutorial's site,
   the module its "Compose the runtime and the admin" step creates.

Left out on purpose: Anthropic's pricing (a vendor figure, and a developer holding a key knows a
call is billed), and the Anthropic API itself beyond holding a key.

## Place in the doc set

- **Group.** "Extend the admin", third after `docs/extend/add-a-custom-admin-screen.md` and
  `docs/extend/arrange-the-admin-sidebar.md`. Those two add the site's own code to the admin frame
  (a screen, a sidebar tree) and open on that frame. This page switches on an engine feature already
  in the admin and supplies what only the site can, so its opening starts from the editor's Tidy
  button and the text it sends, not from the admin frame or cairn's seam boundary.
- **Links in.** `docs/extend/scaffolded-site-files.md:166` (the key in `.dev.vars.example`); the
  extend index; the legacy `enable-tidy` paths (the outline's redirect and the docs-links legacy
  map). The outline's crossLink from build-the-public-routes rests on a stale reason and that page
  is not on disk (the plan's friction entry).
- **What siblings own.** `docs/extend/define-an-adapter-and-schema.md` owns the site-config file's
  accepted keys (it lists `tidy`), the tag vocabulary that shares the file, and
  `spellcheck.dialect`. `docs/extend/add-cairn-to-a-sveltekit-app.md` owns the tutorial site's
  site config, server module, and dev backend. `docs/extend/choose-an-ai-posture.md` owns the other
  AI decision a site makes, which concerns crawlers reading the published site. The editors arm
  owns running tidy and the review in detail. The reference arm owns the type rows and the
  `tidy.*` log records.
- **A shared idea, worded fresh.** "AI" appears on choose-an-ai-posture as crawlers and training.
  This introduction separates the two by subject (a model editing a draft at an editor's request)
  in the routing sentence, without echoing that page's opening.

## Intro plan

Three paragraphs, then the plan's bounds. No heading. Opens on a statement about tidy, never an
imperative and never a sentence about the page.

1. **The model and why it starts off** (every reader; alone, the deciding reader). Open on what tidy
   is from the editor's side: an editor presses Tidy on a draft, a Claude model proposes
   corrections, and the editor keeps or drops each one before the draft changes (`f:glluwk`,
   `f:noqkmx`). Say what it touches: objective errors always, house conventions only as the site
   declares them, and a result that rewrote more than the wording is thrown away (`f:3yte99`,
   `f:q412re`, `f:s6av65`). Then the why: each call sends the editor's text to Anthropic on the
   site's own key, so the engine leaves tidy off until a site turns it on, and a site that leaves it
   off carries no package and needs no key (`f:4gnt5j`, `f:vcthwj`, `f:ymsfzv`, `f:59aion`). Close
   on the scaffold's exception: a scaffolded site's config already turns the switch on, without the
   package or the key, so its deployed Tidy button refuses until the setup is finished (`f:9y46v0`,
   `f:rdenuk`).
2. **The split, and where SvelteKit, Cloudflare, and GitHub fit** (the setup and the diagnosing
   readers). The engine owns everything between the button and the review: the prompt, the size
   cap, the deadline, the structural check, the review (`f:f5548q`, `f:tcvrgk`, `f:q412re`,
   `f:noqkmx`). The site supplies the `@anthropic-ai/sdk` package, the `tidy` block of its
   site-config file (the switch, and optionally the model and the conventions), and the Anthropic
   key, a Worker secret the action reads when a call arrives (`f:vcthwj`, `f:avtt69`, `f:p7v2xe`,
   `f:k3m9qa`, `f:3yte99`, `f:4gnt5j`, `f:59aion`). Because the site-config file is committed and
   the runtime takes its `tidy` block at build, a change, whether the developer's edit or an
   editor's save on `/admin/settings`, which commits to the default branch, reaches tidy only once
   that commit deploys (`f:p7v2xe`, `f:0j54bd`, `f:shv6wv`). The site writes no route for tidy; its
   server module's `createCairnAdmin` call takes a separate `tidy` block for the deadline and an
   optional client of its own (`f:w5h8rn`, `f:tcadyk`, `f:tcvrgk`). Name the file each `tidy` block
   lives in.
3. **The readers and the contract.** Name each reader's reason and the heading that answers it. A
   developer turning tidy on runs the steps through "Verify tidy on the deployed site"; the
   anatomy's one-line contract sits here: install the SDK, set the switch, bind the key, choose a
   model and conventions if the defaults don't fit, and confirm on `/admin/settings` and with one
   tidy run that tidy works on the deployed site. A developer whose editors report a refusal, a Tidy
   button that vanished, or a timeout starts at "Diagnose a refusal" and the Settings states in
   "Verify tidy on the deployed site" (`f:rdenuk`, `f:mg0n21`, `f:rcoz6t`). A developer with a
   gateway of their own, or calls that need longer, starts at "Configure the tidy call's deadline
   and client" (`f:tcadyk`, `f:w5h8rn`, `f:tcvrgk`). A developer weighing whether to offer tidy
   finds its limits in "What tidy can change in a draft" (`f:f5548q`, `f:q412re`, `f:noqkmx`).

Bounds, after the paragraphs, as the plan's introduction items 3 and 4 state them:

- **Prior knowledge.** Wrangler secrets, the site's committed `site.config.yaml`, and the server
  module that calls `createCairnAdmin`; no knowledge of the Anthropic API beyond holding a key.
- **What the page leaves out, with the page that covers it.** How an editor runs tidy and works
  through its review belongs to the editor documentation, named in words with no link. The
  site-config file's other keys and the tag vocabulary that shares it are on
  `docs/extend/define-an-adapter-and-schema.md`. AI crawlers and training on the public site are
  `docs/extend/choose-an-ai-posture.md`. This scope sentence may name the page.

## Departures from the plan's introduction

- **The scaffold's switch.** The plan's item 1 says tidy is opt-in and off by default, which a
  scaffolded reader, the one published inbound link's reader, finds untrue of their own site.
  Paragraph 1 adds that a scaffolded site's config already turns the switch on without the package
  or the key (`f:9y46v0`, filed by this step). The plan's "Claim nothing about the scaffold's
  shipped `tidy` block" note in "Before you begin" was written when no fact stated it; the body
  stays as the plan has it, and on a scaffolded site "Turn tidy on" step 2 finds the block already
  present. The structural edit seat may weigh that against the introduction.
- **Why the default is off.** The plan's item 1 carries no reason for the default; paragraph 1 adds
  it (`f:4gnt5j`, filed by this step), as "The introduction" asks of a page that changes a default.
- **GitHub and SvelteKit.** The plan's item 1 places only Cloudflare (the key). Paragraph 2 adds the
  deploy rule (`f:p7v2xe`) and the server module's separate `tidy` block (`f:w5h8rn`), the two
  places the page's later sections depend on.
- **A fourth reader.** The plan names three readers. The framing adds the developer deciding whether
  to offer tidy, served by paragraph 1 and "What tidy can change in a draft".
