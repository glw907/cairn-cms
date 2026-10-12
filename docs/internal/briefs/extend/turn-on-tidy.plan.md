# Page plan: Turn on tidy

Page: `docs/extend/turn-on-tidy.md`. Page type: task guide. Status: new page, no prior version on
disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The drafter
drafts from this plan: it is the source of the page's order, each section's claim, and each fact's
placement. The structural edit seat reads it before any prose exists. The plan is Google's outline
written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug `turn-on-tidy`: job,
covers, out-of-scope list, exemplars); "The page anatomies" and "The introduction" in
`docs/internal/docs-register.md`; every fact bullet named below in `docs/internal/facts/extend.md`
and `docs/internal/facts/reference.md` (`f:n8qe9y`), plus the rejected `f:38qxp3` and `f:66alqp`;
the two exemplars (`extenders/directus-create-extension`, `extenders/django-custom-management-commands`);
the reference entries each link names (`docs/reference/sveltekit.md` `createContentRoutes`, the
`ContentRoutesConfig`, `CairnAdminConfig`, `CairnPlatformBindings`, and `TidyClient` rows;
`docs/reference/core.md` "`siteConfigPath` (adapter `editor` member)", `parseSiteConfig`, and the
`TidyConfig` and `TidyConventions` rows under "Types"; `docs/reference/admin.md` `CairnTidySettings`;
`docs/reference/log-events.md`, the `tidy.*` rows; `docs/reference/admin-routes.md`, the
`/admin/settings` row); the sibling pages `docs/extend/define-an-adapter-and-schema.md` ("Mark the
tag field", "Keep adapter settings out of `site.config.yaml`"), `docs/extend/add-cairn-to-a-sveltekit-app.md`
("Write the site config and a minimal adapter", "Compose the runtime and the admin", "Wire the dev
backend"), `docs/extend/choose-an-ai-posture.md`, `docs/extend/debug-your-site.md` (no tidy row), and
`docs/extend/scaffolded-site-files.md:166` (the one inbound link, no anchor); and the code the facts
cite (`src/lib/sveltekit/content-routes-tidy.ts`, `src/lib/sveltekit/content-routes-settings.ts`,
`src/lib/sveltekit/tidy-key-probe.ts`, `src/lib/sveltekit/content-routes-context.ts:120-150`,
`src/lib/sveltekit/content-routes-entry-read.ts:496`, `src/lib/admin/CairnTidySettings.svelte`,
`templates/waymark/src/chassis/cairn.server.ts`, `templates/waymark/src/theme/site.config.yaml`,
`packages/cairn-cms-dev/src/handle.ts:198-210`). No `docs/editors/` page is on disk.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

Tidy is a switch the developer throws and a tool the editor runs. The engine owns everything between
(the prompt, the limits on a call, the structural check, the review), and the site owns four things:
the SDK package, the switch, the key, and, optionally, the model and the house style. The page's
spine is the developer's half in the order a site turns it on: three changes and a deploy, then the
two choices that have working defaults (the model and the conventions), then the editors' side of
the conventions, which lands in a file the developer owns. The `tidy` block of `createCairnAdmin`
comes last among the tasks, directly after the editors' side, so the tasks run as one unbroken
block: the call's deadline, which every site has and may change, and the optional seam for a site's
own client. The limits and the dev stub follow as the explanation a developer needs before handing
tidy over and before checking it, and the dev stub refers back to the `tidy` block the reader has
already met. Verification and the refusal table close the page, so the reader checks the whole
setup once, on the deployed site, after every choice is made.

The page serves three readers with one spine. The developer turning tidy on runs every step. The
developer whose editors report a refusal, a Tidy button that vanished, or calls that time out comes
for "Diagnose a refusal" and the three Settings states in "Verify tidy on the deployed site". The
developer who reaches Anthropic through a gateway of their own comes for "Configure the tidy call's
deadline and client". The introduction names all three by heading (register, "A page may serve
several readers").

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (`f:glluwk`): tidy is opt-in, off by default, and runs only
   when an editor triggers it on a draft; the engine supplies the prompt, the safeguards, and the
   review, and the site supplies the package, the switch, and the key. Without that split, "install a
   package, set a flag, bind a secret" reads as three unrelated chores.
2. **Before you begin** names what the steps consume: an Anthropic key, Wrangler access to the
   Worker, and the site-config file of the site the reader is changing (the two sites keep it at
   different paths, `f:em69ru`, `f:q07rd5`).
3. **Turn tidy on** (cover 2) is the main path, the Directus exemplar's take: the setup steps, ending
   in a deploy, with the check deferred to the one verification section. Cover 1 (opt-in and
   editor-triggered) is not a section: it is the introduction's model. The section ends by routing a
   reader who keeps the default model and conventions past the two variant sections to "Let editors
   change the conventions", so only the variants are skippable. The skip never reaches the
   verification: the sections after the variants hold a step the tutorial's site needs whatever
   conventions it keeps (item 6), the deadline every site has (item 7), and the limits a developer
   knows before handing tidy over (item 8).
4. **Choose a model** (cover 3) is the first variant, the Django exemplar's take ("variants after the
   main path as their own sections"). It precedes the conventions because it is developer-only (an
   editor can't change it, `f:0j54bd`) and because its rule bites at verification: an unsupported id
   surfaces only on a tidy call (`f:k3m9qa`), so the verification's tidy run is the model's check.
5. **Set the conventions** (cover 4) is the second variant. It follows the model because both are
   keys under the same `tidy` block, and it precedes the editors' section because the editors' save
   writes the very block this section defines.
6. **Let editors change the conventions** (cover 8) follows the conventions directly: the editors'
   save writes `tidy.conventions` into the site-config file, so the reader learns which file, the one
   step a hand-built site needs for it, and why a save waits for a deploy, right after defining the
   block. The outline places this cover eighth, after the safeguards and the verification; moving it
   up keeps the two writers of one block (the developer's hand edit and the editor's save) together.
   It is also where the main path resumes after the variants: editors can save conventions on
   `/admin/settings` whether or not the developer set any, so the tutorial site's
   `editor.siteConfigPath` step is on every reader's path, and a save without it answers 404.
7. **Configure the tidy call's deadline and client** (cover 9) is the last task, and every reader
   passes through it. It directly follows "Let editors change the conventions", so the tasks run as
   one contiguous block (Turn on, Choose a model, Set the conventions, Let editors change the
   conventions, Configure) with no explanation section between two tasks, and the `tidy` block is
   introduced before "Tidy in local development" refers to it. Both settings live in the one `tidy`
   block of `createCairnAdmin` (`f:w5h8rn`), so they share a section, but they reach different
   readers: the 30-second deadline and `tidy.timeoutMs` apply to every site, so the deadline comes
   first and unconditional, and the gateway condition opens only the client sub-steps that follow
   it, where a reader with no gateway and no dev stub to wire stops. The section sits ahead of the
   verification, so the page keeps one task anatomy (steps, one verification, one failure path), and
   the refusal table's timeout row points into a part of it no reader was told to skip. It needs no
   verification of its own: the verification's tidy run exercises whatever deadline and client are
   set.
8. **What tidy can change in a draft** (cover 5), the page's first explanation section, follows the
   last task and ties back to the conventions, because `f:s6av65` ties the two together: the
   conventions' prompt is what protects an author's voice, and the structural check is only a
   rewrite and injection backstop (the back-reference sentence in the section). It precedes the
   verification because two of its limits produce refusals the table lists; the section names those
   outcomes and leaves their exact messages to the table, so each message is quoted once. Its lead-in
   (the previous hand-off) ties it to the task: handing tidy to editors.
9. **Tidy in local development** (cover 7), the second explanation section, sits directly before the
   verification because it is the reason the verification runs on the deployed site: under the dev
   backend, the scaffold's tidy calls a canned stub, so a local run proves the review but never the
   key or the model (`f:mbw7mk`). Its instruction for the tutorial's site refers back to the
   `tidy.client` the reader met in "Configure the tidy call's deadline and client".
10. **Verify tidy on the deployed site** (cover 6, first half) is the anatomy's item 4: the Settings
    screen's three states, then one tidy run, since the screen probes only the key.
11. **Diagnose a refusal** (cover 6, second half) is the anatomy's item 5 and the last body section.
    The extend recovery surface has no `tidy.failed` row, so the page keeps the refusal table and
    links `docs/reference/log-events.md` for the rest (friction filed).
12. **See also** closes the page, per the anatomy (item 6).

### Departures from the outline's covers order, with the reason for each

- Cover 1 (opt-in, editor-triggered) moves into the introduction, the model the page sits in.
- Cover 8 (where conventions are stored) moves up to follow cover 4 (item 6), for the reason above.
- Cover 9 (the client seam and the deadline) moves up to directly follow cover 8 (item 7), ahead of
  covers 5 and 7, so every task, the optional one included, runs in one contiguous block before the
  explanation sections and the one verification. Within it, the outline's order
  flips: the deadline, which applies to every site, comes before the client, which applies only to a
  site with its own gateway.
- Covers 5 and 7 stay in the outline's relative order but become explanation sections between the
  last task and the verification (items 8 and 9).
- Cover 6 splits into the verification section and the failure-path section, the anatomy's items 4
  and 5 (items 10 and 11). This keeps the anatomy's fixed order: every step comes before the one
  verification, and nothing but See also follows the failure path.

### Exemplar takes, and where each lands

- **Directus, Extensions quickstart.** Setup steps, then "Using Your Extension": open the settings
  screen and see the new thing listed. It lands as "Turn tidy on" (the setup) and "Verify tidy on the
  deployed site", whose first check is the Settings screen's key-health state. Left behind: the
  Docker volume steps.
- **Django, custom management commands.** The main path first, then variants as their own sections,
  each rule stated where it bites. It lands as "Choose a model" and "Set the conventions" after the
  main path, with the unchecked-model rule beside the `tidy.model` step and the `fixes` caveat beside
  the conventions table. Left behind: the appended class reference, which stays on
  `docs/reference/`.

### Heading policy

Task headings start with a bare infinitive. "Before you begin" and "See also" are the anatomy's fixed
headings. "What tidy can change in a draft" and "Tidy in local development" are the two explanation
sections and take a noun phrase or a question-shaped noun clause. The only inbound link,
`docs/extend/scaffolded-site-files.md:166`, names the page with no anchor, so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** Tidy is an AI copy-edit that an
   editor runs on a draft from the editor's Tidy button. It is opt-in and off by default, and it
   never runs unless an editor triggers it (`f:glluwk`). The engine owns the prompt, the limits on a
   call, the structural check, and the review the editor approves; the site owns the
   `@anthropic-ai/sdk` package, the `tidy` switch in its site config, and the Anthropic key, and may
   choose the model and a house style (`f:vcthwj`, `f:avtt69`, scoped). Where Cloudflare fits, one
   clause: the key is a Worker secret, read at request time (`f:avtt69`, `f:59aion`, scoped).
2. **Who and why, with the contract.** Three readers. A developer turning tidy on for their editors
   runs every section. A developer whose editors report a refusal or a missing Tidy button comes for
   "Diagnose a refusal" and the Settings states in "Verify tidy on the deployed site". A developer who
   reaches Anthropic through a gateway of their own, or whose editors' calls run out of time, comes
   for "Configure the tidy call's deadline and client".
   Name each section by heading. The contract sentence, inside the framing: install the SDK, set the
   switch, bind the key, choose a model and conventions if the defaults don't fit, and confirm on
   `/admin/settings` and with one tidy run that tidy works on the deployed site.
3. **Prior knowledge.** Wrangler secrets, the site's committed `site.config.yaml`, and the server
   module that calls `createCairnAdmin`. No knowledge of the Anthropic API beyond holding a key.
4. **What the page does not cover, with the page that does (wrong-place routing).** How an editor
   runs tidy and works through its review belongs to the editor documentation, which has no page yet:
   name it in words, with no link (the outline's out-of-scope item). The site-config file's other
   keys, and the tag vocabulary that shares it, are on `docs/extend/define-an-adapter-and-schema.md`.
   A reader who came about AI crawlers and training, not copy-editing, wants
   `docs/extend/choose-an-ai-posture.md`. This sentence may name the page, since scope has no
   subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed
the provenance extractor with no row).

### Before you begin

**First sentence:** Tidy needs an Anthropic API key, Wrangler access to your site's Worker, and the
site-config file of the site you are changing.

**Facts:** `f:em69ru` (added, scoped: `tidy` is a top-level site-config key; the scaffold keeps the
file at `src/theme/site.config.yaml`), `f:q07rd5` (scoped: the two adapter paths, `src/theme/cairn.config.ts`
and `src/lib/cairn.config.ts`).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- An Anthropic API key. Link Anthropic's Console page for creating a key (vendor link; the drafter
  confirms the URL resolves).
- Wrangler signed in to the Cloudflare account that runs the site's Worker. Link Cloudflare's Workers
  secrets page, https://developers.cloudflare.com/workers/configuration/secrets/ (the drafter
  confirms it).
- The site-config file: `src/theme/site.config.yaml` on a scaffolded site (`f:em69ru`), and on the
  add-cairn tutorial's site the `src/lib/site.config.yaml` its "Write the site config and a minimal
  adapter" step creates; link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter`. Name the
  adapter beside it for each site (`f:q07rd5`), since "Let editors change the conventions" edits the
  tutorial site's adapter.

Claim nothing about the scaffold's shipped `tidy` block: no fact states it (friction filed).

**Hand-off (no-claim):** "With the key in hand, turn tidy on."

### Turn tidy on

**First sentence:** Tidy turns on with three changes: the optional `@anthropic-ai/sdk` package,
`tidy.enabled: true` in the site config, and an `ANTHROPIC_API_KEY` Worker secret.

**Facts:** `f:vcthwj`, `f:avtt69`, `f:59aion`, `f:ymsfzv` (scoped: the lazy import, and a site
without the package still builds), `f:p7v2xe` (scoped: an absent block or an unset `enabled` is off;
the runtime takes the block from the site config at build).

A numbered list, one action to a step, the location first, lead-in "To turn tidy on, follow these
steps:" (no-claim):

1. In the project directory, install the package: `npm install @anthropic-ai/sdk` (`f:vcthwj`). One
   sentence after the step: it is an optional peer that cairn imports only when a tidy call runs, so
   a site without it builds cleanly (`f:ymsfzv`, scoped; its refusal belongs to "Diagnose a refusal").
2. In the site-config file, add a `tidy` block with `enabled: true` (`f:avtt69`). Show the two-line
   YAML. One clause: with no `tidy` block, or with `enabled` unset, tidy stays off (`f:p7v2xe`).
3. In a terminal, run `npx wrangler secret put ANTHROPIC_API_KEY` and paste the key at the prompt
   (`f:avtt69`).
4. Commit the site config and deploy the site. One sentence after it: the runtime takes the `tidy`
   block from the site config the build imports, so the switch reaches the site with that deploy
   (`f:p7v2xe`, scoped).

After the steps, one sentence on the type check: `ANTHROPIC_API_KEY` is the one optional member of
`CairnPlatformBindings`, so a site's bindings check passes with no key bound (`f:59aion`); link
`docs/reference/sveltekit.md#cairnplatformbindings` (opened and confirmed: it says every member but
`ANTHROPIC_API_KEY` is required). Name "Verify tidy on the deployed site" as the check that catches a
missing key.

**Hand-off (no-claim):** "To keep the default model and conventions, skip to the editors' side of
the conventions; otherwise, choose a model next." Name "Let editors change the conventions" by
heading in the drafted wording. The skip passes over the two variant sections only, never the
verification (the order's items 3 and 6).

### Choose a model

**First sentence:** Tidy sends every call to `claude-sonnet-5` unless `tidy.model` names another
model, such as the cheaper, faster `claude-haiku-4-5`.

**Facts:** `f:fmv6m8`, `f:4c92fh`, `f:k3m9qa`, `f:ssdn1f`, `f:wlohtk`. Cited again: `f:0j54bd`
(the model is developer-tier, read-only on Settings).

Content:

- One step, a single bulleted item, location first: in the site-config file, set `model` under
  `tidy`, then deploy (`f:k3m9qa`). Show the YAML: `tidy:` / `enabled: true` / `model: claude-haiku-4-5`.
  One clause: unset or empty falls back to `claude-sonnet-5` (`f:k3m9qa`, `f:fmv6m8`).
- The rule where it bites, one or two sentences: the site-config parser doesn't check the id, so a
  model Anthropic rejects surfaces only on a tidy call, as a refusal that names the model and points
  at `tidy.model`, logged as `tidy.failed` with `reason: 'invalid_request'` (`f:k3m9qa`). So after
  any model change, run one tidy, as "Verify tidy on the deployed site" step 3 does. (Friction filed
  by the page inputs: the unchecked id.)
- Effort, two sentences: tidy asks for the low effort tier by default, since a proofread needs no
  extended reasoning (`f:ssdn1f`). It sends the effort setting only to models that accept it, matched
  by prefix: `claude-sonnet-5`, `claude-opus-5`, `claude-sonnet-4-6`, and `claude-opus-4-<n>` from 6
  up; for any other model, `claude-haiku-4-5` included, cairn leaves it out (`f:wlohtk`). Do not say a
  site can change the effort: no fact states a setting for it.
- One sentence: the Settings screen shows the model read-only, by a plain label such as "Claude
  Sonnet 5", so an editor sees it but can't change it (`f:0j54bd`).

**Hand-off (no-claim):** "Next, set the house style tidy applies."

### Set the conventions

**First sentence:** `tidy.conventions` adds house-style rules on top of the objective fixes every tidy
call makes, and every rule except `fixes` starts off.

**Facts:** `f:3yte99`, `f:sdz8sm`, `f:625qj8`, `f:tna81y`, `f:d2q6zt`, `f:xijdh6`, `f:jay6aq`.

Content:

- One sentence naming the objective fixes, which always run: spelling, grammar, doubled words, stray
  whitespace, capitals, and terminal punctuation (`f:3yte99`).
- One step, a single bulleted item, location first: in the site-config file, add a `conventions`
  block under `tidy` with the rules you want, then deploy. Show a short YAML example using values from
  `f:sdz8sm`, for example `oxfordComma: complex-only`, `numberStyle: under-ten`, `smartQuotes: true`.
- A table, one row per field, columns Field, Values, What tidy does. Values and defaults from
  `f:sdz8sm`; the "What tidy does" cell from `f:625qj8` and `f:tna81y`, kept short:
  - `fixes`, boolean, default `true`: see the caveat below the table (`f:d2q6zt`).
  - `oxfordComma`, `always` / `complex-only` / `never`: `complex-only` follows the AP complex-series
    rule (`f:625qj8`).
  - `numberStyle`, `under-ten` / `under-hundred` / `always-numerals`: every threshold keeps numerals
    for ages, dates, measurements, and percentages (`f:625qj8`).
  - `measurements`, `abbreviate` / `spell-out`: changes the notation only, never the measurement
    system or the number (`f:625qj8`).
  - `percent`, `sign` / `word`: the `%` sign or the word "percent" (`f:tna81y`).
  - `emDash`, `spaced` / `closed`: sets the spacing and turns a double hyphen into one em dash
    (`f:tna81y`).
  - `enDashRanges`, boolean, default `false`: turns a hyphen between two numbers into an en dash
    (`f:tna81y`).
  - `ellipsis`, `single-char` / `three-dots`: the ellipsis form (`f:tna81y`).
  - `timeFormat`, `'5 PM'` / `'5pm'` / `'5 p.m.'`: renders times as the chosen literal (`f:tna81y`).
  - `smartQuotes`, boolean, default `false`: applies the full apostrophe rule set (`f:625qj8`).
  - `brandCaps`, boolean, default `false`: corrects only names on a curated list (`f:625qj8`).
  A field the table leaves without a default stays off unless set (`f:3yte99`).
- The caveat, as a Note directly under the table: `fixes: false` doesn't stop the objective fixes;
  it changes only the Settings screen's Fixes toggle and its "Tidy will fix" summary (`f:d2q6zt`).
  (Friction filed by the page inputs.)
- Two sentences on what is not a convention: an editor's personal dictionary is its own committed
  file, `src/content/.cairn/dictionary.txt` (`f:xijdh6`), and editors add words to it from the
  spellcheck suggestion's **Add to dictionary**, not from the tidy review; regional spelling is
  `spellcheck.dialect`, a separate key, not a tidy rule (`f:jay6aq`). Link
  `docs/extend/define-an-adapter-and-schema.md#keep-adapter-settings-out-of-siteconfigyaml` for
  `spellcheck.dialect` (opened and confirmed: it states that US English is the one dictionary and
  that any other `dialect` resolves to it). Never say a word is added from the tidy review
  (`f:66alqp` is rejected).

**Hand-off (no-claim):** "Next, hand these rules to your editors."

### Let editors change the conventions

**First sentence:** An editor's save on `/admin/settings` commits `tidy.conventions` to the
site-config file, and tidy applies it only after that commit deploys.

**Facts:** `f:0j54bd`, `f:shv6wv`, `f:p7v2xe`, `f:sl0igk`, `f:b9x4lc`. Cited again: `f:q07rd5`
(the tutorial site's adapter path).

Content:

- One sentence on what the save writes: only the `tidy.conventions` block, leaving `tidy.enabled` and
  `tidy.model` as the developer set them (`f:0j54bd`).
- One sentence on which file: the one site-config file the adapter's `editor.siteConfigPath` names,
  `src/theme/site.config.yaml` by default, which the navigation editor and **Tags** also read and
  commit (`f:shv6wv`). Link `docs/reference/core.md#siteconfigpath-adapter-editor-member` (opened and
  confirmed: it states the shared file and the default) and, for the vocabulary that shares the file,
  `docs/extend/define-an-adapter-and-schema.md#mark-the-tag-field`.
- One step, for the tutorial's site only, a single bulleted item, location first, lead-in "To let
  editors change the conventions, follow this step:" (no-claim) only if the drafter keeps it as a
  list: in `src/lib/cairn.config.ts`, set `editor.siteConfigPath` to `'src/lib/site.config.yaml'`
  (`f:shv6wv`, `f:q07rd5`). One sentence after it: when no file is at that path, the save answers 404
  "Site config not found"; there is no second path it tries (`f:b9x4lc`). A scaffolded site needs no
  step: its file is at the default.
- One sentence: with tidy off, the save answers 404 "Tidy is not enabled for this site" before it
  reads anything (`f:b9x4lc`).
- One sentence on comments: a save rewrites only its own block and keeps every other key, comment, and
  key order, so a comment inside `tidy.conventions` is lost while comments elsewhere survive; keep
  notes outside that block (`f:sl0igk`).
- The deploy rule, two sentences: the save commits to the default branch as "Update tidy settings",
  while tidy calls and the Settings screen read the runtime's copy of the site config, never the
  committed file, so a saved change reaches tidy only once that commit deploys (`f:p7v2xe`). On a
  site that deploys on push to the default branch, that is the next deploy; claim nothing about the
  screen's success message (friction filed).

**Hand-off (no-claim):** "Next, set the deadline for a tidy call and, if you need one, your own
client."

### Configure the tidy call's deadline and client

**First sentence:** The `tidy` block of `createCairnAdmin` sets each tidy call's deadline and, for a
site with its own gateway, the client it calls.

No condition opens the section: the deadline applies to every site, so it comes first, and the
gateway condition opens only the client part (the order's item 7).

**Facts:** `f:w5h8rn`, `f:tcvrgk`, `f:tcadyk`. Cited again: `f:s4prb0` (scoped: the scaffold's server
module), `f:mbw7mk` (the scaffold's module already passes `tidy: { client }`).

Content, in this order:

- Where the block lives, one sentence: in the server module that calls `createCairnAdmin`, which
  takes the block as `CairnAdminConfig.tidy` and forwards it to the content routes (`f:w5h8rn`).
  Name the module per site:
  `src/chassis/cairn.server.ts` on a scaffolded site (`f:s4prb0`), and on the tutorial's site the
  module its "Compose the runtime and the admin" step creates; link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#compose-the-runtime-and-the-admin`. One clause for the
  scaffold: its module already passes `tidy: { client }`, with `client` set only under the dev gate
  (`f:mbw7mk`; the drafter confirms against `templates/waymark/src/chassis/cairn.server.ts:22-28`).
- The deadline, unconditional, two sentences then one step. The tidy action ends a call after 30
  seconds unless `tidy.timeoutMs` sets another deadline in milliseconds (`f:tcvrgk`, `f:w5h8rn`). An
  overrun becomes a retryable refusal logged as `tidy.failed` with `reason: 'timeout'`, rather than a
  platform timeout (`f:tcvrgk`); its message is in "Diagnose a refusal", not quoted here. The step,
  a single bulleted item, location first: in the server module, add `timeoutMs` to the `tidy` block,
  for example `tidy: { client, timeoutMs: 60_000 }` on the scaffold and `tidy: { timeoutMs: 60_000 }`
  on a tutorial site that passes no `tidy` block yet (`f:w5h8rn`). Claim no recommended value: no
  fact states one.
- The client, opened by its condition, one sentence: if your site reaches Anthropic through its own
  gateway, pass a `tidy.client` factory that takes `{ apiKey }` and returns a `TidyClient`
  (`f:tcadyk`). The dev stub is passed the same way, so one clause names that second user of the
  seam: a tutorial-site reader who wants it wires it as "Tidy in local development" shows. A reader
  with no gateway and no dev stub to wire stops here and goes on to "What tidy can change in a
  draft".
- One sentence on the contract: `TidyClient`'s `tidy(request, options)` resolves
  `{ corrected, refused, tokens: { input, output } }`, so the site's code never touches an Anthropic
  SDK type (`f:tcadyk`). Link `docs/reference/sveltekit.md#types` for the `TidyClient` row and
  `docs/reference/sveltekit.md#contentroutesconfig` for the block (opened and confirmed: the rows
  state the factory signature and the result shape). Claim no stability tier on the page (friction
  filed: the seam's tiers disagree).
- One sentence on the default: unset, `client` is the real Anthropic SDK client, built lazily from
  the key (`f:w5h8rn`).
- A numbered list, lead-in "To route tidy through your own client, follow these steps:" (no-claim):
  1. In the server module, write the factory (`f:tcadyk`).
  2. In the same module, pass it to `createCairnAdmin` as `tidy: { client }` (`f:tcadyk`, `f:w5h8rn`).
     One clause for the scaffold: the gateway factory replaces the dev-gated assignment outside the
     gate (`f:mbw7mk`).
  The code block shows the tutorial site's module with a factory whose `tidy` method calls the site's
  gateway, the body elided with a comment; no gateway URL or vendor shape.

**Hand-off (no-claim):** "Before editors run tidy, know what it can and can't change."

### What tidy can change in a draft

**First sentence:** Three limits bound a tidy call: a size cap before the model runs, a structural
check on what comes back, and a review in which the editor keeps or drops each change.

The previous hand-off ties this explanation to the task (handing tidy to editors), per the anatomy's
lead-in rule. No steps.

**Facts:** `f:f5548q`, `f:q412re`, `f:s6av65`, `f:noqkmx`.

Content, one or two sentences per limit. Quote no refusal message here: "Diagnose a refusal" is the
one place the page quotes them (structural edit, advisory on duplicated messages).

- The cap: a draft over roughly 24,000 characters, about 8,000 input tokens, is refused before the
  model is called, so it spends nothing, and the editor is asked to tidy a selection instead
  (`f:f5548q`).
- The structural check: before a result reaches the editor, cairn compares it with the original
  (directive structure, heading count and levels, fenced code blocks, frontmatter byte for byte, the
  `media:` references, every code span, and a bound on how far the wording diverges), and a failing
  result is discarded with the draft unchanged, so it never reaches the review (`f:q412re`,
  `f:s6av65`). One sentence on its scope, tying back to "Set the conventions": the check is a
  backstop against a rewrite or an injected instruction, not a guard on voice; the conventions'
  prompt is what protects voice (`f:s6av65`).
- The review: the proposed edit arrives as a diff, one hunk per change; objective fixes come
  pre-kept and judgment calls start undecided, and nothing is written until the editor applies the
  kept hunks, as one undo step (`f:noqkmx`). Name the editor documentation in words for the rest;
  no link.

**Hand-off (no-claim):** "To try tidy before you deploy, run it locally."

### Tidy in local development

**First sentence:** Under the dev backend, a scaffolded site's tidy calls a canned stub instead of
Anthropic, so a local run exercises the review but never your key or your model.

**Facts:** `f:mbw7mk`. Cited again: `f:s4prb0` (the scaffold's server module path).

Content:

- One or two sentences on the gate: the scaffold's `src/chassis/cairn.server.ts` builds the tidy
  client from `createFakeAnthropic` (from `@glw907/cairn-cms-dev`) only when `__CAIRN_DEV_BUILD__`
  and the dev-backend opt-in are both true, and a default production build drops that block
  (`f:mbw7mk`, `f:s4prb0`). The dev backend's handle sets a dummy `ANTHROPIC_API_KEY` so the tidy
  action doesn't refuse for a missing key (`f:mbw7mk`).
- For the tutorial's site, one sentence, an instruction only, referring back to a block the reader
  has already met: to get the same stub, gate `createFakeAnthropic()` into the `tidy.client` you met
  in "Configure the tidy call's deadline and client", the way the scaffold's module does. Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend` for the dev backend and its
  opt-in. Claim nothing about what that site does without the stub (no fact; friction filed).
- Never say the dev server always uses a stub: `f:38qxp3` is rejected for exactly that.

**Hand-off (no-claim):** "With every piece in place, check tidy on the deployed site."

### Verify tidy on the deployed site

**First sentence:** On the deployed site, `/admin/settings` checks the key, and one tidy run on a
draft checks the package and the model.

**Facts:** `f:rcoz6t`, `f:6zqexn`, `f:z2vl1z`. Cited again: `f:k3m9qa`, `f:ymsfzv` (the tidy run
catches what the probe can't), `f:0j54bd` (the read-only model label).

One sentence before the list: no command-line or `cairn doctor` check reads `ANTHROPIC_API_KEY`, so
the Settings screen is the key's only check (`f:z2vl1z`).

A numbered list, one check to a step, the location first, lead-in "To verify tidy, follow these
steps:" (no-claim):

1. In the deployed admin, open `/admin/settings`. The screen probes the key with a call that spends
   no tokens and shows one of three states (`f:rcoz6t`).
2. On the same screen, match the state in a table, columns State, What it means, What to do:
   - The conventions, with the model's label: tidy is on and the key is present and not confirmed
     invalid (`f:rcoz6t`, `f:0j54bd`). Go on to step 3.
   - "Tidy is not set up yet": tidy is off, or no key is bound. Recheck "Turn tidy on" steps 2 to 4
     (`f:rcoz6t`).
   - "Tidy's key isn't working": Anthropic rejects the bound key. Bind a working key with step 3 of
     "Turn tidy on" (`f:rcoz6t`).
   One sentence after the table: a probe that can't reach a verdict fails soft and shows the
   conventions, so the first state alone doesn't prove the key (`f:rcoz6t`), and the screen holds its
   result for ten minutes (`f:6zqexn`).
3. In an entry's draft, run Tidy once. A review with proposed changes, or a note that nothing needs
   fixing, means tidy works; a refusal sends you to "Diagnose a refusal". This run is the check for
   the package and a changed model, which the key probe doesn't test (`f:ymsfzv`, `f:k3m9qa`; claim
   nothing about how the probe treats a missing package, friction filed). The drafter states the
   success wording only from what the code shows; if no fact states the no-change outcome, say only
   "the review opens" and drop the no-change clause.

**Hand-off (no-claim):** "When a tidy call refuses, match its message in the following table."

### Diagnose a refusal

**First sentence:** Each tidy refusal names its cause in the message the editor sees, and the
following table gives each message's log record, if any, and its fix.

Do not claim which refusals log a record beyond the rows below: no fact says whether the three
pre-call refusals (rows 1 to 3) or the structural discard (row 8) log one.

**Facts:** `f:rdenuk`, `f:ymsfzv`, `f:mg0n21`, `f:n8qe9y`, `f:k3m9qa`, `f:tcvrgk`. Cited again:
`f:f5548q`, `f:s6av65`, `f:6zqexn`.

A table in the order a call meets each check (before the model, then the model's answer), so the
reader whose refusal comes first reads it first, columns Message, Cause, Log record, Fix:

1. "Tidy is not enabled for this site.": the deployed site config has no `tidy.enabled: true`
   (`f:rdenuk`). Fix: "Turn tidy on" steps 2 and 4.
2. "Tidy is not configured: the Anthropic API key is missing.": no secret is bound (`f:rdenuk`). Fix:
   "Turn tidy on" step 3.
3. "This is too long to tidy at once. Select a passage and tidy that instead.": the draft is over the
   cap (`f:rdenuk`, `f:f5548q`). Fix: the editor tidies a selection.
4. The install message ("Run npm install @anthropic-ai/sdk."), `reason: 'sdk_missing'`: the package
   isn't installed (`f:ymsfzv`). Fix: "Turn tidy on" step 1, then deploy.
5. The message telling the editor to let their site developer know, `reason: 'auth'`: Anthropic
   answered 401 or 403 (`f:mg0n21`). It isn't retryable, and the edit screen hides the Tidy button for
   the ten-minute cache window (`f:mg0n21`, `f:6zqexn`). Fix: bind a working key, then check
   `/admin/settings`.
6. The message naming the model and `tidy.model`, `reason: 'invalid_request'`: Anthropic rejected the
   model id (`f:k3m9qa`). Fix: "Choose a model".
7. "Tidy could not finish. Try again.", `reason: 'timeout'`, `'abort'`, or `'model'`: the deadline
   fired, the call was cancelled, or the model errored; these are retryable (`f:tcvrgk`, `f:n8qe9y`).
   Fix: retry; for repeated timeouts, raise `tidy.timeoutMs` (name "Configure the tidy call's deadline
   and client", whose deadline part every reader has passed through).
8. The "changed more than the wording" message, no `tidy.failed` record claimed: the structural check
   discarded the result (`f:s6av65`). Fix: none needed; the text is unchanged. Name "What tidy can
   change in a draft".

Quote exact messages only where a fact quotes them (rows 1, 2, 3, 4's install sentence, 7, 8); for
rows 5 and 6, describe the message. One sentence after the table: an empty result is also retryable
(`f:n8qe9y`), and `docs/reference/log-events.md` lists every `tidy.*` record, including a model's
refusal to edit (opened and confirmed: the `tidy.failed` row lists the six reasons and their
retryability, and `tidy.refused` and `tidy.empty` have rows). The extend recovery surface has no tidy
row (friction filed), so do not link `docs/extend/debug-your-site.md` for tidy; link its "Read the
structured logs" section only for where to find the records:
`docs/extend/debug-your-site.md#read-the-structured-logs`.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out,
with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing sentence,
"The following pages cover the pieces this page links to:" (no-claim), then a bulleted list, each
item's link text naming its destination:

- `docs/reference/sveltekit.md#createcontentroutes`, the tidy action's request and refusal shapes and
  the Settings load.
- `docs/reference/core.md#types`, the `TidyConfig` and `TidyConventions` rows.
- `docs/reference/admin.md#cairntidysettings`, the Settings screen component (friction filed: its
  entry names two states, not three; link it for the component, not the states).
- `docs/reference/log-events.md`, the `tidy.*` rows.
- `docs/extend/define-an-adapter-and-schema.md#mark-the-tag-field`, the tag vocabulary that shares
  the site-config file.
- `docs/extend/choose-an-ai-posture.md`, the other AI choice a site makes, about crawlers.

### The outline's cross-links, ruled

The stage outline's `crossLinks` name two links from this page; each has a disposition.

- **To define-an-adapter-and-schema** ("The site-config file tidy conventions share with the tag
  vocabulary"): carried, in "Let editors change the conventions" and in See also, at
  `docs/extend/define-an-adapter-and-schema.md#mark-the-tag-field`.
- **To build-the-public-routes** ("Declaring editor.nav, which also names the site-config file tidy
  writes"): dropped. Its stated reason is stale: `f:shv6wv` says `editor.siteConfigPath` names the
  file and `NavMenuConfig` no longer carries a path, so declaring `editor.nav` names no file. The
  link's surviving use, that the navigation editor commits the same site-config file, is already
  served on this page by `docs/reference/core.md#siteconfigpath-adapter-editor-member` in "Let
  editors change the conventions", which states the shared file and its default. And
  `docs/extend/build-the-public-routes.md` is not on disk, so a link to it would fail the docs link
  gate when this page lands first. The stale pair (both directions) is filed as friction for the
  outline.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. All 37 fact ids this plan was
handed are carried, several scoped; the plan adds two container facts, each scoped and named where it
lands. None is subordinated or cut: every one serves the page's job, and the reference rows the
page links restate rather than replace them.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:glluwk | carried | Introduction (opt-in, off by default, editor-triggered only) |
| f:vcthwj | carried | Turn tidy on (step 1, the optional peer); scoped in Introduction |
| f:avtt69 | carried | Turn tidy on (steps 2 and 3); scoped in Introduction |
| f:59aion | carried | Turn tidy on (the one optional binding, so the type check passes without the key); scoped in Introduction |
| f:fmv6m8 | carried | Choose a model (the default) |
| f:4c92fh | carried | Choose a model (the cheaper, faster alternative) |
| f:ssdn1f | carried | Choose a model (low effort by default) |
| f:wlohtk | carried | Choose a model (which models take effort; Haiku omitted) |
| f:k3m9qa | carried | Choose a model (unchecked id, `invalid_request` refusal); cited again in Verify tidy on the deployed site and Diagnose a refusal |
| f:3yte99 | carried | Set the conventions (objective fixes always on; only `fixes` defaults on) |
| f:sdz8sm | carried | Set the conventions (the fields, values, and defaults) |
| f:625qj8 | carried | Set the conventions (prompt semantics: `oxfordComma`, `numberStyle`, `measurements`, `smartQuotes`, `brandCaps`) |
| f:tna81y | carried | Set the conventions (prompt semantics: `percent`, `emDash`, `enDashRanges`, `ellipsis`, `timeFormat`) |
| f:d2q6zt | carried | Set the conventions (`fixes: false` changes only the screen) |
| f:xijdh6 | carried | Set the conventions (the dictionary file) |
| f:jay6aq | carried | Set the conventions (words added from spellcheck, `spellcheck.dialect`) |
| f:0j54bd | carried | Let editors change the conventions (the save writes only `tidy.conventions`); cited again in Choose a model and Verify tidy on the deployed site |
| f:shv6wv | carried | Let editors change the conventions (`editor.siteConfigPath`, shared file, default path); the outline's `editor.nav.configPath` wording is stale and is not used |
| f:p7v2xe | carried | Let editors change the conventions (save takes effect at deploy); scoped in Turn tidy on (absent block is off; build-time copy) |
| f:sl0igk | carried | Let editors change the conventions (comments outside the block survive) |
| f:b9x4lc | carried | Let editors change the conventions (404 "Site config not found", 404 when tidy is off, no fallback) |
| f:f5548q | carried | What tidy can change in a draft (the 24,000-character cap, described, not quoted); cited again in Diagnose a refusal |
| f:q412re | carried | What tidy can change in a draft (the structural checks) |
| f:s6av65 | carried | What tidy can change in a draft (backstop, not voice; the discard, described, not quoted); cited again in Diagnose a refusal, the one place its message is quoted |
| f:noqkmx | carried (scoped) | What tidy can change in a draft (diff, pre-kept objective hunks, nothing written until Apply); the Cancel and Reject detail is left to the editor documentation |
| f:mbw7mk | carried | Tidy in local development (the gated stub, the dummy key); cited again in Configure the tidy call's deadline and client |
| f:tcadyk | carried | Configure the tidy call's deadline and client (the client part: the factory and `TidyClient`'s result) |
| f:w5h8rn | carried | Configure the tidy call's deadline and client (`tidy` groups `client` and `timeoutMs`, forwarded by `createCairnAdmin`; the default client; the millisecond unit) |
| f:tcvrgk | carried | Configure the tidy call's deadline and client (the deadline part, unconditional: the 30-second deadline, `tidy.timeoutMs`, the `timeout` record); cited again in Diagnose a refusal |
| f:rcoz6t | carried | Verify tidy on the deployed site (the probe, three states, fail-soft unknown) |
| f:6zqexn | carried | Verify tidy on the deployed site (ten-minute cache); cited again in Diagnose a refusal |
| f:z2vl1z | carried | Verify tidy on the deployed site (no CLI or doctor check) |
| f:rdenuk | carried | Diagnose a refusal (the three pre-call messages, quoted only there) |
| f:ymsfzv | carried | Diagnose a refusal (`sdk_missing`, the install message); scoped in Turn tidy on (lazy import, builds without it); cited again in Verify tidy on the deployed site |
| f:mg0n21 | carried | Diagnose a refusal (401/403, `auth`, the hidden Tidy button) |
| f:n8qe9y | carried (scoped) | Diagnose a refusal (non-retryable and retryable causes, empty result retryable); the status codes are left to `docs/reference/sveltekit.md#createcontentroutes`, which states them |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths); cited again in Let editors change the conventions. Its tutorial-hooks clause is not used |
| f:em69ru | carried (added, scoped) | Before you begin (`tidy` is a site-config key; the scaffold's file at `src/theme/site.config.yaml`). Its doctor-path clause is not used |
| f:s4prb0 | carried (added, scoped) | Configure the tidy call's deadline and client (the scaffold's server module, `src/chassis/cairn.server.ts`); cited again in Tidy in local development |

Two rejected facts guard the drafter and are cited by no sentence: `f:38qxp3` (the dev server does not
always stub tidy) and `f:66alqp` (words are not added from the tidy review).

The page-inputs claim inventory's "filed" rows (`f:k3m9qa`, `f:d2q6zt`, `f:b9x4lc`, `f:p7v2xe`,
`f:w5h8rn`) are all carried in the sections the table names, and its option rows map to the same
facts: `TidyConfig.enabled` (`f:glluwk`, `f:avtt69`), `TidyConfig.model` (`f:k3m9qa`),
`TidyConfig.conventions` (`f:3yte99`), the `TidyConventions` members (`f:sdz8sm`, `f:d2q6zt`),
`SiteConfig.tidy` (`f:p7v2xe`), and `ContentRoutesConfig.tidy` (`f:w5h8rn`).

## Friction filed

The page-inputs step filed two entries on 2026-10-12 (`fixes` switches nothing; `tidy.model` is
unchecked until a tidy call), and this plan does not refile them. This plan filed eight entries in
`docs/internal/docs-friction-log.md` on 2026-10-12 (the eighth at its structural-edit revision),
none blocking the page:

1. Engine: the scaffold ships `tidy.enabled: true` with no SDK and no key, so every draft shows a Tidy
   button that refuses (and no fact states the scaffold's block).
2. Engine: the Settings probe reads a missing SDK as `unknown` and shows the working state.
3. Engine: the tidy client seam carries two stability tiers and two stated purposes.
4. Engine: a Settings save reports "saved" but changes nothing visible until a deploy.
5. Engine: the dev backend's dummy key is safe only beside the scaffold's gated fake client.
6. Docs content: `docs/extend/debug-your-site.md` has no `tidy.failed` row.
7. Docs content: `docs/reference/admin.md`'s `CairnTidySettings` entry names two Settings states, not
   three.
8. Docs content: the stage outline's `crossLinks` pair between turn-on-tidy and
   build-the-public-routes rests on `editor.nav` naming the site-config file, which `f:shv6wv` says
   it no longer does.

## Local names

The page has the reader create no new path or name; every path it names exists in the scaffold, the
tutorial's site, or the engine. The brief's `local` array stays empty.
