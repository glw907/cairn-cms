# Framing record: Define an adapter and schema

Agent-facing; drives the introduction of `docs/extend/define-an-adapter-and-schema.md` only; the
body follows the page plan (`docs/internal/briefs/extend/define-an-adapter-and-schema.plan.md`).
Written 2026-10-12 by the framing step of the docs page chain (stage 2b part 1).

## Who arrives, from where, and why

1. **The developer on a scaffolded site who wants another kind of content (the job's reader).**
   - From: `docs/extend/scaffolded-site-files.md`'s `src/theme/` section ("covers changing the
     concepts"), the arm index's "Model content" group, or a search for `defineConcept`.
   - Came for: adding a concept, or changing the fields, address, or tags of the `posts` or `pages`
     concept the scaffold ships.
   - Knows: SvelteKit; their own `src/theme/cairn.config.ts`, which already declares `posts`,
     `pages`, and `fragments`, a `createGithubApp` backend, and `email: { from }` (`f:u4cfvv`).
   - Lacks: that a concept is wired in three files, not one, and that the third omission fails
     silently (`f:n5d65u`, `f:7az6m2`); which adapter groups are documented on other pages.
2. **The developer on the add-cairn tutorial's site, growing its minimal adapter.**
   - From: `docs/extend/add-cairn-to-a-sveltekit-app.md`, three times: its intro's list ("covers
     every adapter option", line 25), the milestone-3 sentence "For every other adapter option"
     (line 341), and its closing list ("grows the minimal adapter").
   - Came for: the adapter beyond the tutorial's minimal one, and later the production backend and
     sender.
   - Knows: wrote `src/lib/cairn.config.ts`, `parseSiteConfig`, `createSiteIndexes`, and the
     `cairnManifest` plugin, and met their two failure modes in the tutorial.
   - Lacks: that the page's steps use the scaffold's paths, with the hand-built site's difference
     named per section (`f:q07rd5`); that its Tags and Settings screens need `editor.siteConfigPath`
     (`f:shv6wv`, friction entry "The site config has two homes"). Arrives expecting every adapter
     option, so the intro has to route the groups other pages own (rendering, media, roles and
     access, `navLayout`) before the reader looks for them in the body.
3. **The content-model reader moving from the model to the declaration.**
   - From: `docs/extend/content-model.md`, its intro's bounds list ("Writing the adapter and a
     concept's declaration"), its "Save-time validation" hand-off (cross-field checks and behavior
     hooks, line 128), and its see-also.
   - Came for: the syntax, the wiring, and the two check hooks.
   - Knows: what a concept, a fieldset, routing, and an entry's identity are.
   - Lacks: the `defineAdapter` shape, the glob registrations, and how to verify.
4. **The developer who was about to build a custom admin screen for markdown.**
   - From: `docs/extend/add-a-custom-admin-screen.md:6` and `:571` ("declares a concept in its
     adapter instead of building a screen").
   - Came for: confirmation that another kind of markdown content is a concept, not a route.
   - Knows: SvelteKit routes and the custom-screen seam.
   - Lacks: possibly the content model; the prior-knowledge link to content-model serves them.
   - Backing: adding a concept is an edit to the `content` map that forks nothing (`f:6a32oy`).
5. **The developer filling in the production backend and sender (conditional).**
   - From: `docs/extend/architecture.md:21` ("Each adapter field"), a hand-built site moving off the
     dev backend, or a search for `createGithubApp` and its `owner` or `appId`.
   - Came for: where the GitHub App's identity and the sender address go, and whether either is a
     secret.
   - Knows: has registered a GitHub App, or is about to.
   - Lacks: that the identity is non-secret and the private key stays a Worker secret (`f:twcsgm`),
     and that sending needs Cloudflare Email Sending onboarded for the domain (`f:z7lprs`).
   - Wrong place for: registering the App (the tutorial's "Register the GitHub App") and rotating
     its key (`docs/extend/rotate-the-github-app-key.md`); the body's backend section links both.
6. **The developer migrating markdown from another system.**
   - From: migrate-existing-content (not on disk), whose out-of-scope list names this page for
     "Declaring the target concepts".
   - Came for: declaring the concepts a migration script writes into.
   - Lacks: the field builders and the wiring. Their reason is reader 1's (add a kind of content),
     so the intro gives them no separate clause.
7. **The developer configuring tidy or the tag vocabulary.**
   - From: turn-on-tidy (not on disk), whose outline cross-link names "The site-config file tidy
     conventions share with the tag vocabulary".
   - Came for: where that YAML file lives and what it accepts.
   - Lacks: `editor.siteConfigPath` and its default (`f:shv6wv`), and that the file refuses the
     adapter's groups (`f:9sba8e`, `f:em69ru`). The intro names the which-file question in one
     clause; "Mark the tag field" and "Keep adapter settings out of `site.config.yaml`" answer it.
8. **The developer with a failing build, from a search.**
   - From: a search for `expected input to be a string or buffer`, a `createSiteIndexes` throw, or
     `content.field_unmarked`.
   - Came for: the cause and the fix.
   - Lacks: the three-file wiring. The contract sentence's last clause (confirming that the
     declaration typechecks and builds) tells them the page reaches failure; "Diagnose a failed
     check" answers it.
9. **Readers in the wrong place, and the page each belongs on.**
   - Wants what a concept, routing, or an entry's identity is: `docs/extend/content-model.md`.
   - Wants the `rendering` group: `docs/extend/configure-rendering.md`.
   - Wants roles or the access map: `docs/extend/restrict-admin-access.md`.
   - Wants `navLayout`: `docs/extend/arrange-the-admin-sidebar.md`.
   - Wants the `media` group: `docs/extend/configure-media.md`.
   - Wants reference fields: `docs/extend/link-content-with-references.md`.
   - Wants SvelteKit's `adapter` option (the Cloudflare adapter in `vite.config.ts`): not this page;
     the tutorial's "Create the project on the Cloudflare adapter" sets it. The intro's
     disambiguating clause serves this reader without a link.

## Background the page rests on

1. **One object.** A site's adapter is one `defineAdapter` call whose four required groups hold its
   concepts (`content`), the GitHub repository its commits land on (`backend`, built by
   `createGithubApp`), the sign-in email's sender (`email`), and its renderer (`rendering`), with
   five optional groups beside them (`f:2zytgf`, `f:hkh101`). Every route factory, admin screen, and
   delivery helper reads its behavior from that object, and the engine hard-codes no concept,
   directory, or field (`f:4esdoz`). This is why the page reads as one job: everything site-specific
   the engine needs, the site writes here.
2. **Concepts are keys, and adding one forks nothing.** A concept is one key of the `content` map,
   declared with `defineConcept` over a `dir` and a `fields` fieldset (`f:5eum60`). Adding one is an
   edit to that map, not a change to the engine (`f:6a32oy`). The scaffold's adapter is a working
   declaration to grow, not a blank to fill (`f:u4cfvv`). "Neither name is reserved" (`f:r03vis`)
   stays in the body's "Add a concept": content-model's intro already says it.
3. **Why a concept spans three files.** Vite resolves an `import.meta.glob` pattern only where it is
   written as a literal at the call site, so the engine cannot glob a concept's directory from the
   adapter; `createSiteIndexes` throws at build for a declared concept with no glob (`f:4mz4tp`).
   The site writes the glob twice: in the content index module for `createSiteIndexes`, and in the
   `cairnManifest` plugin's `content` option, keyed by concept id (`f:n5d65u`, `f:fj28xs`). The
   intro carries the why; the silent omission (`f:7az6m2`) stays in the body's Caution.
4. **SvelteKit's place.** The adapter is a module of the site's SvelteKit app. `defineAdapter`
   narrows its return type, so the site's code reads declared fields with their types and no cast
   (`f:68w9k9`). `npm run check` runs `svelte-kit sync` and `svelte-check`, which typecheck the
   declared fields, and `npm run build` runs `vite build` (`f:a98mnn`). Content-model's intro
   already says the fieldset becomes the type the site's code reads, so the intro states the
   narrowing as the reason no cast is needed, not as a list of what a declaration decides.
5. **The word "adapter".** SvelteKit has its own adapter: on a scaffolded site the `adapter` key in
   the `sveltekit()` call in `vite.config.ts` is `@sveltejs/adapter-cloudflare` (`f:xyizai`), and
   on an `sv create` project the same inline call holds it (`f:ifuvcl`). The page has the reader edit
   `vite.config.ts` (the `cairnManifest` glob), where both meet, and the reader is Svelte-fluent and
   knows SvelteKit's sense first. One clause in the intro relates the two. Friction filed.
6. **GitHub's place.** The `backend` group names the repository commits land on (`f:2zytgf`); its
   identity values are non-secret, and the private key stays out of the adapter as the Worker secret
   `GITHUB_APP_PRIVATE_KEY_B64` (`f:twcsgm`).
7. **Cloudflare's place.** Cloudflare touches this page only through the sender, whose domain must be
   onboarded to Cloudflare Email Sending (`f:z7lprs`), and the Worker secret (`f:twcsgm`). Left out
   on purpose: D1, R2, and `wrangler.jsonc`. The adapter groups this page covers name no binding,
   the media group's bucket is configure-media's, and the tutorial and the scaffold own the
   bindings. The intro says nothing about them.
8. **Two kinds of site.** The adapter module is `src/theme/cairn.config.ts` on a scaffolded site and
   `src/lib/cairn.config.ts` on the add-cairn tutorial's site (`f:q07rd5`). The intro names both
   kinds of site without a path. It may name the file by its bare name, `cairn.config.ts`, which
   both sites share and which therefore names neither; any path says which site it means, and "Start
   from the adapter file" owns both paths. The `#theme` and `#lib` import specifiers never appear
   in the intro (they go only in fenced code, `ROADMAP.md:1027-1029`).
9. **Two configuration files.** Beside the adapter, a site keeps a YAML site config, the file
   `editor.siteConfigPath` names (default `src/theme/site.config.yaml`), which holds the tag
   vocabulary (`f:shv6wv`). `parseSiteConfig` refuses the adapter's groups there, naming
   `cairn.config.ts` as their home, and accepts only its own top-level keys (`f:9sba8e`,
   `f:em69ru`). Readers 2 and 7 meet both files.

## Place in the doc set

- **Group and neighbors.** Second in "Model content", after content-model and before
  configure-rendering, link-content-with-references, reuse-content-across-entries, configure-media,
  and migrate-existing-content. It is the group's one page about the adapter as a whole; each later
  page in the group configures one part of it.
- **Links in, and why.** content-model (from the model to the declaration; the check hooks);
  add-cairn-to-a-sveltekit-app (the minimal adapter grows here; "every adapter option");
  scaffolded-site-files (changing the concepts in `cairn.config.ts`); architecture ("Each adapter
  field"); add-a-custom-admin-screen (a concept instead of a screen); turn-on-tidy and
  migrate-existing-content when they land.
- **Links out.** configure-rendering, restrict-admin-access, arrange-the-admin-sidebar, and
  build-the-public-routes (the outline's cross-links), plus configure-media,
  link-content-with-references, and content-model in the bounds. Two inbound links promise more
  than the page holds ("every adapter option", "Each adapter field"); the page reaches every group
  through one link, so the bounds list that names each group's page answers them, and no friction
  was filed.
- **What siblings own, and the openings to avoid.**
  - content-model opens on every entry being a markdown file, says a concept is declared in the
    adapter, that posts and pages are not reserved, and lists what a declaration decides (form,
    checks, type, address, manifest). This intro does not restate that list or the reserved-names
    line.
  - architecture states "A cairn site declares one adapter, a single `CairnAdapter` object" and that
    the engine hard-codes no concept, directory, or field. This intro draws on the same fact
    (`f:4esdoz`) but words it from the reader's editing situation, what the reader writes and where,
    not as a statement about the seam map.
  - add-cairn-to-a-sveltekit-app builds a minimal adapter as one milestone step; this intro does not
    re-narrate that.
  - reuse-content-across-entries and configure-media open on their own subjects (a shared passage,
    where an image lives); no overlap.

## Intro plan

Three paragraphs, then the plan's bounds (prior knowledge, then what the page leaves out). The
opening is a statement about the subject from the reader's situation: never an imperative, never a
sentence about the page.

1. **The model, from above.** Open on a statement: whatever a cairn site declares about itself, the
   engine reads from one object, the `defineAdapter` call in the site's `cairn.config.ts` (bare
   filename; no path). Its four required groups, one clause each: the site's concepts, the GitHub
   repository its commits land on, the sign-in email's sender, and its renderer, with optional
   groups beside them (`f:2zytgf`, `f:hkh101`). The engine hard-codes no concept, directory, or field
   (`f:4esdoz`), which is why this file is where a site's content is defined. One clause relating the
   name to the reader's own: this adapter is not SvelteKit's adapter, the Cloudflare adapter set in
   `vite.config.ts` (`f:xyizai`, `f:ifuvcl`).
   Facts: `f:2zytgf`, `f:hkh101`, `f:4esdoz`, `f:xyizai`, `f:ifuvcl`.
2. **A concept and its three files, then the contract.** A concept is one key of the adapter's
   `content` map (`f:5eum60`), and adding one is an edit to that map, not to the engine (`f:6a32oy`).
   The why: Vite reads an `import.meta.glob` pattern only where it is written out literally, so a
   concept's markdown reaches the build through globs the site writes in two more files, its content
   index module and the `cairnManifest` plugin in `vite.config.ts` (`f:4mz4tp`, `f:n5d65u`,
   `f:fj28xs`). Adding a kind of content is therefore one job across three files. The declared
   fields come back as typed reads in the site's SvelteKit code, with no cast (`f:68w9k9`). Then the
   anatomy's one-line contract, in second person: write the `defineAdapter` call, add a concept with
   its fields, address, and tag field, add checks and options of your own, and confirm that the
   declaration typechecks and builds (`f:a98mnn`).
   Facts: `f:5eum60`, `f:6a32oy`, `f:4mz4tp`, `f:n5d65u`, `f:fj28xs`, `f:68w9k9`, `f:a98mnn`.
3. **Who comes, and why.** Each reason in a clause or a short sentence, the reader learning early
   that the page answers it:
   - On a scaffolded site, the adapter already declares posts, pages, and fragments with a backend
     and a sender (`f:u4cfvv`), and the reason to open it is to add a kind of content or change a
     concept's fields, address, or tags.
   - On a site built by hand with the add-cairn tutorial, the reason is to grow that tutorial's
     minimal adapter; the steps follow the scaffold, and the hand-built site's difference is named
     where one exists (`f:q07rd5`; name both kinds of site, no paths). This later sentence may name
     the page, since it bounds scope.
   - A developer about to build a custom admin screen for another kind of markdown declares a
     concept instead (`f:6a32oy`, cited again).
   - The backend's identity values and the sender address go in once the site has a GitHub App and a
     sender domain onboarded to Cloudflare Email Sending, and neither is a secret (`f:twcsgm`,
     `f:z7lprs`). State the condition first; the body's section is skippable.
   - Whether a setting belongs in the adapter or in the site's YAML site config, which holds the tag
     vocabulary and refuses the adapter's groups (`f:shv6wv`, `f:9sba8e`, `f:em69ru`). One clause.
   Facts: `f:u4cfvv`, `f:q07rd5`, `f:6a32oy`, `f:twcsgm`, `f:z7lprs`, `f:shv6wv`, `f:9sba8e`,
   `f:em69ru`.

Then the plan's bounds, unchanged:

- **Prior knowledge:** TypeScript literal types, Vite's `import.meta.glob`, and YAML, and the content
  model, the intro's one link to `docs/extend/content-model.md`, which is also the route for a reader
  who wants what a concept, routing, or an entry's identity is.
- **Left out, each with its page:** what routing and identity mean (content-model, named, no second
  link); reference fields (`docs/extend/link-content-with-references.md`); the `rendering` group
  (`docs/extend/configure-rendering.md`); roles and the access map
  (`docs/extend/restrict-admin-access.md`); `navLayout` (`docs/extend/arrange-the-admin-sidebar.md`);
  the `media` group (`docs/extend/configure-media.md`). This list is what answers reader 2's "every
  adapter option".

Constraints the drafter keeps in the intro: no path for the adapter file (bare `cairn.config.ts`
only); no import specifier; no `editor.nav.configPath`; no restatement of content-model's
what-a-declaration-decides list or of "neither name is reserved"; and the word "adapter" alone
always means the engine's object, with SvelteKit's named as the Cloudflare adapter.

## Departures from the plan's introduction

1. **Added: the SvelteKit-adapter clause** in paragraph 1 (`f:xyizai`, `f:ifuvcl`). The plan does
   not mention it. The page sends the reader into `vite.config.ts`, where SvelteKit's `adapter` key
   sits beside the `cairnManifest` plugin, and a Svelte-fluent reader knows that sense first.
2. **Added: the why behind the two extra files** (`f:4mz4tp`, `f:fj28xs`) and the no-fork framing
   (`f:4esdoz`, `f:6a32oy`), and the narrowed type as SvelteKit's place (`f:68w9k9`). The plan's
   item 1 scoped only `f:2zytgf`, `f:5eum60`, and `f:n5d65u`; the register asks the intro for why the
   thing exists and where SvelteKit fits.
3. **Added: two reasons to the plan's item 2**, the custom-screen alternative (reader 4, from
   `docs/extend/add-a-custom-admin-screen.md:6`) and the adapter-versus-YAML question (readers 2
   and 7), and the backend-and-sender reason now states its condition and that neither value is a
   secret (`f:twcsgm`, `f:z7lprs`).
4. **Kept unchanged:** the plan's three introduction parts, its contract sentence, its single
   content-model link, its out-of-scope list, and its rule that the intro names the two kinds of site
   without their paths.
