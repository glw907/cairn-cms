# Pass D Task 9: mining the extender slice

Read 2026-08-14, before the cutover deletes `docs/guides/`, `docs/tutorial/`, and
`docs/explanation/`. Scope: the extender-facing half of the old corpus — 22 old guides, both
tutorial pages, and all 12 explanation pages (roughly 7,400 lines) — against the 31 pages of
`docs/extend/`, with `docs/reference/` treated as surviving and therefore as a valid home for
any fact the new extend pages don't carry. Every find below was verified against the current
source tree, not against the old page's authority.

**Overall judgment: the rebuild lost very little, and what it lost is concentrated in three
places.** The explanation arm's reasoning survived better than expected: the new concept pages
re-derive most of it, and `docs/reference/core.md` absorbed nearly all of the old
`content-model` and `structured-fields` facts (the permalink validation, the one-level nesting
cap, the fieldset contract). The old `upgrade-cairn.md`'s 1127→131 collapse is a correct
de-duplication against `CHANGELOG.md`, not a loss. The three real clusters are: (1) the
hand-build path lost two load-bearing `vite.config.ts` lines and one footgun warning, so a
reader following `build-a-site-by-hand.md` verbatim gets a site that fails to build and carries
no content manifest; (2) `add-a-login-channel.md` was merged into a much shorter page and its
operational footguns went with it, three of which current source comments still name by pointing
at the doomed guide; (3) a scatter of design rationale — the markdown-versus-WYSIWYG case, the
tidy structural validator's guarantee, the login flow's enumeration posture — that no code
comment carries. Separately, the planned `iterate-your-design-locally` → `design-your-site.md`
merge did not actually happen, which is a gate-invisible gap rather than a mining find.

The declined list at the bottom is longer than the finds list, and that is the honest shape of
this sweep.

---

## Ranked finds

### Tier 1 — a reader following the new docs verbatim gets a broken result

| # | Old page | The fact or rationale | Code citation proving it true today | New page | Proposed addition |
|---|---|---|---|---|---|
| 1 | `tutorial/build-your-first-cairn-site.md:505-516` | `ssr: { noExternal: ['@glw907/cairn-cms'] }` is required in a consumer's Vite config. The package's `svelte` export condition points at `dist`, and the shipped `.svelte` files deliberately keep `lang="ts"` so the Svelte compiler can parse the markup's TypeScript. Externalizing the package means the consumer's Svelte plugin never processes them. | `package.json:79-123` (the `svelte` conditions); `scripts/build/transpile-dist-svelte.mjs:1-19` (the `lang="ts"` tag stays, on purpose); `examples/showcase/vite.config.ts:49` with its own comment | `extend/build-a-site-by-hand.md` | Add `ssr: { noExternal: ['@glw907/cairn-cms'] }` to the Milestone 2 `vite.config.ts` block, with one sentence: the engine ships Svelte source in `dist`, so Vite has to process it rather than externalize it. |
| 2 | `tutorial/build-your-first-cairn-site.md:613-649` | The `cairnManifest()` Vite plugin, and the `cairn-manifest` CLI to regenerate after any hand-edit to content outside the admin. The new hand-build never wires the plugin at all, so a hand-built site has no manifest, no build-time link verification, and a `cairn-doctor` run that silently degrades. | `examples/showcase/vite.config.ts:35-45` (the plugin as the scaffolded tree wires it); `docs/reference/vite.md:21-51`; `docs/reference/doctor.md:26,59-63` (the doctor reads the plugin's config and degrades without it); `docs/extend/what-the-scaffold-wrote.md:24` confirms the scaffolded path has it | `extend/build-a-site-by-hand.md` | Add the `cairnManifest({ configModule, content, manifestPath })` plugin to Milestone 3's Vite config, plus the `cairn:manifest` script and the "run it after editing content by hand" rule. |
| 3 | `tutorial/build-your-first-cairn-site.md:564` | Name `__CAIRN_DEV_BUILD__` literally at each call site, never through a shared exported constant. Vite substitutes the name as a literal into each module's text; a shared constant folds inside its own chunk and does not propagate across the module boundary, so the branch survives and **the dev backend ships in the deployed Worker**. | `examples/showcase/vite.config.ts:5-12`, which states exactly this in its own doc comment | `extend/build-a-site-by-hand.md` | Add the warning under the `define` block in Milestone 2: the flag must be named directly in the branch, since a shared constant leaves the dev-backend import in the production bundle. |

These three belong together. `build-a-site-by-hand.md` is the only page in the whole new corpus
that shows a complete `vite.config.ts` (`add-cairn-to-a-sveltekit-app.md` covers credentials and
bindings only, never code wiring), so there is no second page a reader could recover them from.

### Tier 2 — a fact, guarantee, or footgun genuinely absent, with real consequences

| # | Old page | The fact or rationale | Code citation | New page | Proposed addition |
|---|---|---|---|---|---|
| 4 | `guides/add-a-login-channel.md:14-98` | Provisioning a channel's D1 database needs its own `migrations_dir`, distinct from the site's `migrations/`, or `wrangler d1 migrations apply` runs the engine's auth migrations against the channel database and vice versa. Plus the exact schema statement to copy. `docs/reference/auth-channel.md:181` still says "see Add a login channel for the exact statement" — a pointer into a page about to be deleted. | `src/lib/auth-channel/store.ts:30-64` (`CHANNEL_SCHEMA_SQL`, byte-pinned by test); `docs/reference/auth-channel.md:178-184` (verified: the dangling pointer is live) | `extend/add-a-second-audience.md` | Add a "Provision the schema" step: `wrangler d1 create`, the separate-`migrations_dir` warning, and the copy-verbatim instruction — and repoint `auth-channel.md:181` at it. |
| 5 | `explanation/editor-copyedit.md:46-53` | Tidy's structural backstop, stated as a guarantee: before a proposal reaches the author, cairn proves the result is a proofread and not a restructure. Four checks are exact — directive opener/closer structure, heading count and levels, fenced-code-block count, byte-for-byte frontmatter, the `media:` hash multiset, and every code span. A failure discards the whole result and leaves the buffer untouched. Also the rationale: voice is protected by the prompt, never by a check, because code cannot verify voice. | `src/lib/components/tidy-validate.ts:1-11` (the module's own statement of the four exact checks plus the one fuzzy divergence bound), `:22-31` (the typed rejection reasons), `:39` (`TIDY_REJECTION_MESSAGE`). Confirmed absent from `extend/enable-tidy.md`, `editors/write-in-the-editor.md`, and all of `docs/reference/`. | `extend/enable-tidy.md` | Add a short "What Tidy can't do to your document" section carrying the exact checks and the discard-and-leave-untouched promise. This is the strongest reason a site owner would trust turning Tidy on, and nothing else in the corpus states it. |
| 6 | `guides/restrict-admin-access.md:124-132` | Restricting the `media` screen in the access map also breaks the inline image picker for any role editing an image-bearing concept, since the picker calls the same access-gated endpoint. | `src/lib/sveltekit/content-routes-media.ts:503-507`, whose comment calls it "the documented media-picker landmine" — a name coined by the guide now losing its referent | `extend/restrict-admin-access.md` | One callout: a role that edits an image-bearing concept needs `media` reachable, or its picker breaks. |
| 7 | `explanation/reference-integrity.md:36-73` and `guides/link-content-with-references.md:89,91` | Three linked behaviors the new reference page doesn't cover: the reference index unions **two arms**, main's manifest and every open `cairn/*` branch (reconstructing the one edited file from the branch name), so an unpublished draft's edge still blocks a delete; **rename refuses outright** when a *different* still-open branch holds an inbound edge, naming the blocking editors; and a **save never blocks on a reference** to a missing or draft target (warning only), while a body `cairn:` link to a missing target *does* hard-block the save. | `src/lib/content/reference-index.ts:7-12,52-65` (the two arms and `strict`); `src/lib/sveltekit/content-routes-core.ts:1852-1864` (the rename refusal and its message); `:1211,1375-1384` (`referenceWarnings`, pushed when `!target \|\| target.draft`, never blocking); `:298` (a body link *does* block) | `extend/link-content-with-references.md` | Add a short "What blocks and what only warns" section covering all three. Independently found by two sweepers. |
| 8 | `explanation/security-model.md:37-41` | The magic-link request path is deliberately non-enumerating: an unknown address gets the byte-identical `{ status: 'sent', sent: true }` a known one gets. The one exception is deliberate and stated as a trade — a repeat request inside the cooldown returns a distinct `throttled` status, which *does* reveal allowlist membership, accepted in exchange for not flooding a real editor's inbox. | `src/lib/sveltekit/auth-routes.ts:44` ("so the common case never leaks allowlist membership"), `:123-124` (unknown editor returns `sent`), `:126-129` ("This reveals editor membership, the deliberate relaxed-non-leak posture") | `extend/security-model.md` | Add two sentences to "Sign-in: magic links, not passwords". The new page names the cooldown but never states either half of this posture, and the deliberate leak is exactly the kind of thing a security reviewer needs told rather than discovered. |
| 9 | `guides/add-a-login-channel.md:320-343,344-354` | Two operational footguns for a channel's dev transport: a capture-delivery transport plus its readback route is a **roster oracle by construction** (it answers, for any input, whether that input is a known member); and wrapping `devDelivery` or a capture transport inside a deployed Worker with observability on lands plaintext one-time codes in Workers Logs, since cairn logs through `console`. | `examples/showcase/src/routes/test/last-otp/+server.ts:2-6` (the comment cites this rule and names the doomed guide as its source); `src/lib/auth-channel/dev.ts:20`; `docs/reference/log-events.md:3` | `extend/auth-channel-security-model.md` | Add both as a short "The dev transport is not a dev-only risk" note. |
| 10 | `guides/announce-on-publish.md:136-152` | Two `publishedAt` re-stamp cases the new page dropped, keeping only the rename case: a **hide-then-republish** of a years-old entry re-stamps with today's date (the second publish sees `prior.draft === true` and reads as a fresh transition), and a **delete-then-recreate** under the same id also re-stamps fresh. A routine Hidden-checkbox toggle can therefore re-announce old content. | `src/lib/content/manifest.ts:433-439` (`stampFirstPublish`), `:442-444` (`removeEntry` drops the row) | `extend/announce-on-publish.md` | Add both alongside the existing rename note. |
| 11 | `explanation/content-model.md:70-73` and `:60-64` | Two defaults the new corpus states nowhere: a concept's **default permalink** is `/:slug` when the concept is named `pages` and `/<concept-id>/:slug` otherwise, and **`datePrefix` defaults to `day`**. `reference/core.md` documents that a bad permalink throws, but never what an omitted one resolves to. | `src/lib/content/concepts.ts:66-68` (`defaultPermalink`), `:190` (`datePrefix: policy.datePrefix ?? 'day'`), `:132` (the doc comment stating both) | `docs/reference/core.md` (the `defineConcept` section) | One sentence naming both defaults. Reference-arm territory, not an extend page. |
| 12 | `explanation/content-model.md:65-68` | An entry's date is **never re-derived from the filename's date prefix**; the engine reads it from the entry's own `date` frontmatter field. The prefix only affects the slug. This is why a dated permalink pattern makes the `date` field structurally required. | `src/lib/content/identity.ts:58` (`const date = asDate(frontmatter.date)`); `src/lib/content/concepts.ts:77-80` | `extend/content-model.md` | One sentence in "An entry's id is its filename". The new page says the prefix is stripped for the slug but never says where the date itself comes from, which is the part a migrating developer gets wrong. |
| 13 | `guides/upgrade-cairn.md:247-253` | `verifyTurnstile(token, secret, opts)` takes the secret second. A hand-rolled predecessor that took `(token, ip, secret)` compiles fine after a naive swap-in, since all three parameters are strings, then fails closed on every submission with no typecheck and no mocked-siteverify test catching it. | `src/lib/cloudflare/turnstile.ts:81-85` (signature confirmed); confirmed absent from `CHANGELOG.md` and `docs/reference/cloudflare.md` | `docs/reference/cloudflare.md` (the `verifyTurnstile` entry) | One warning line under the signature. Never made it into the changelog, so the collapse against `CHANGELOG.md` genuinely dropped it. |
| 14 | `guides/rotate-the-github-app-key.md:44-49,78-85` | Two rotation facts: a site that also runs `wrangler dev` must write the new key's base64 into `.dev.vars` too, since local dev reads that file rather than the deployed secret; and **before** step 6 deletes the old key, service can be restored at any moment by re-pushing the old key's base64, which decouples "restore the site" from "debug the new key". | The new page's own "If something goes wrong" (`extend/rotate-the-github-app-key.md:94-100`) covers only the post-deletion case; `.dev.vars` appears nowhere in the new corpus alongside `GITHUB_APP_PRIVATE_KEY_B64` | `extend/rotate-the-github-app-key.md` | Two sentences: the `.dev.vars` line in step 3, and the pre-deletion rollback in the troubleshooting section. |
| 15 | `guides/add-a-login-channel.md:288-313` | Testing a channel against a real D1-shaped double uses `packages/cairn-cms-dev`'s `createChannelDb`, which needs `node:sqlite` — unflagged only from Node 22.13 — and throws a named error below that floor. `@glw907/cairn-cms-dev` still has no reference page. | `packages/cairn-cms-dev/src/channel-db.ts:11-13` (`NODE_SQLITE_FLOOR = '22.13.0'`), `:29-37` | `extend/add-a-second-audience.md` | A "Prove it" note naming `createChannelDb` and the Node 22.13 floor. |
| 16 | `guides/enable-tidy.md:98-112` | Three numbers: the input cap is 24,000 characters (~6k input tokens), refused with `fail(413)` before the model is ever called; the key-health probe result caches for 10 minutes; local dev injects a stubbed Anthropic client so building and testing never reach the real API. | `src/lib/sveltekit/content-routes-tidy.ts:38-42` (verified: the cap and its rationale); `src/lib/sveltekit/tidy-key-health.ts:19` (`TTL_MS = 10 * 60 * 1000`); `examples/showcase/src/chassis/cairn.server.ts:12` | `extend/enable-tidy.md` | A short "what a run costs and what it refuses" note. The new page's "You know it worked when" already alludes to "the body too long" without ever naming the bound. |
| 17 | `explanation/security-model.md:122-126` | The GitHub App's installation token can write to **any** path in the repository it's installed on. cairn's confinement to the declared concept directories is enforced by its own code at the call site, not by GitHub's permission model, so installing the App on a repository that also holds things cairn shouldn't touch widens the risk more than a dedicated content repository would. | `docs/extend/add-cairn-to-a-sveltekit-app.md:24-27` confirms `Contents: Read and write` is repository-wide and the only permission; `docs/admin/create-your-site.md:33-34` notes GitHub never lets an App's permissions be reduced afterward | `extend/add-cairn-to-a-sveltekit-app.md` | One sentence at the install step. This is precisely the page where a developer installs the App on a repository that already exists, so the warning has a real addressee; the scaffolded path creates a dedicated repository and never faces it. |
| 18 | `guides/migrate-existing-content.md:53-58,85-88,94-108` | Three migration facts (all from the content/delivery sweep): a filename whose date precision mismatches the concept's `datePrefix` **leaks a digit into the slug rather than failing** (`2024-03-15-my-trip.md` under `datePrefix: 'month'` slugs to `15-my-trip`); an id outside the lowercase-hyphen shape still serves its page but is invisible to `cairn:` links and to the rename and delete guards; and media migration is absent entirely — old image URLs pass through the render pipeline unchanged, adopting into the library is optional and strictly one asset at a time, with no bulk-import path. | `src/lib/content/ids.ts:44-58` (`DATE_PREFIX_RE.month` strips only `YYYY-MM-`), `:6` (`ID_RE`); `src/lib/content/links.ts:28`; `src/lib/render/resolve-media.ts:181` ("A non-media src and a malformed token pass through"); `src/lib/sveltekit/content-routes-media.ts` (upload commits one record at a time; only delete has a bulk path) | `extend/migrate-existing-content.md` | The `datePrefix` mismatch as a worked example, the id-shape warning, and a short "Bringing in media" section. |

### Tier 3 — marginal, and I would not block the cutover on any of them

| # | Old page | The fact | Verified against | Why marginal |
|---|---|---|---|---|
| 19 | `explanation/architecture.md:97-103` | Publish deletes the holding branch **only** when its head still matches the commit publish just made; a concurrent save leaves the entry pending rather than losing the edit. | `src/lib/sveltekit/content-routes-core.ts:1507-1513` | Already documented at `docs/reference/sveltekit.md:991`, which survives. Reported only because `extend/architecture.md`'s write path reads as if the delete were unconditional. |
| 20 | `explanation/security-model.md:95-104` | An access-map key deeper than a dynamic route segment can never literally match it, so `requireAccess` and `createSectionAction` refuse that shape outright (403, owner included) rather than admitting through the shallower key. | `src/lib/sveltekit/guard.ts:242-245` | The *behavior* is in `extend/security-model.md`'s `requireAccess` sentence; only the dynamic-segment *reason* for it is gone. Verified real, low blast radius. |
| 21 | `explanation/architecture.md:59-63` | A role your config no longer declares still authenticates and still signs in; it just resolves to `none` capability. Fails closed without locking the person out. | `src/lib/auth/roles.ts:79-88`, whose doc comment states exactly this | A genuine edge case, but one a site hits only when pruning a role vocabulary. |
| 22 | `tutorial/build-your-first-cairn-site.md:376-396,430-437` | Parse `site.config.yaml` in its own small module rather than in `cairn.config.ts`, because a client script importing `cairn.config.ts` ships the whole adapter to every visitor for the sake of a nav array. Also: a nav node's `url` is optional, and a node with only a `label` is a grouping header a flat menu must filter out. | `docs/extend/what-the-scaffold-wrote.md:43` shows the scaffold does split them, so the practice survives; the *reason* does not. The nav grouping fact appears nowhere in the new corpus. | The new hand-build deliberately puts `parseSiteConfig` inside `cairn.config.ts`, which reads as a considered simplification. The grouping-node half is the more real of the two. |
| 23 | `guides/organize-your-admin-nav.md:153-198` | The cited UX rationale behind the nav defaults: nouns not verbs, the ~8-10-item flat-versus-sectioned threshold, content before settings, "don't over-hide" — each backed by a source (Omanson, Miller & Joseph 2014; the NN/g hidden-navigation study's 20%+ discoverability drop). | `src/lib/sveltekit/admin-nav.ts:177` confirms cairn enforces structure only and no aesthetic policy, which is the premise the dropped section states | The new page is deliberately mechanics-only in the extend register. Restoring citations is a register decision, not a defect. See the whole-new-page flags below. |
| 24 | `guides/structured-fields.md:183-186` | A concept may declare at most one `seo: true` image and at most one `taxonomy: true` field; a second of either throws at the `fieldset()` call. | `src/lib/content/fieldset.ts:329-330,360` (explicit throw messages) | `reference/core.md:433-440` already documents the container-nesting throws and the no-`seo`-inside-a-container rule; this is one adjacent sentence in a section that is otherwise thorough. |

---

## Finds that would justify a whole new page rather than an addition

Two, both of which the brief asks me to name explicitly so they become roadmap entries rather
than pages:

1. **The markdown-versus-WYSIWYG case, and the competitor comparison** (old
   `explanation/why-cairn.md:43-69`). The new `docs/why-cairn.md` carries the trade-offs and the
   stack commitment but never justifies markdown at all, and drops the tool-by-tool comparison
   (Sveltia, Decap, Keystatic, the hosted headless services, WordPress) entirely — including its
   strongest argument, that a config-driven dashboard has nowhere for a site's growth to go, so
   the newsletter editor and the membership coordinator end up in two different tools. The
   academic case (Scribe, TeX, SGML, Coombs/Renear/DeRose 1987, Wilson et al., Healy) survives
   in the published corpus **nowhere**: `grep` finds it only in the doomed page, the doomed
   `guides/editor-welcome.md`, and internal planning docs. It also has its own landed plan
   (`docs/superpowers/plans/2026-07-03-markdown-academic-case.md`), so it was deliberate work,
   not incidental prose. Whether this is a loss or a deliberate scope cut is a judgment for
   whoever owns the front door — the outline said `why-cairn` "keeps the why and the honest
   trade-offs", which is ambiguous about which why. I flag it as the single largest body of
   rationale about to be deleted with no successor, and as page-shaped rather than
   sentence-shaped.

2. **The real-content local-iteration loop** (old `guides/iterate-your-design-locally.md`). The
   target manifest at `docs/internal/record/2026-08-14-pass-d-target-manifest.md:105` says
   `design-your-site.md` "merges `make-waymark-your-own` and `iterate-your-design-locally`". The
   first merge happened; **the second did not**. `extend/design-your-site.md`'s "Local
   iteration" section covers only editing tokens against `/styleguide`; the seed-real-media →
   `vite dev` → small-change-and-watch → structural-DOM-check → ship-once loop is absent. Two
   surviving reference pages still link to the doomed guide expecting it
   (`docs/reference/cli-cairn-media-seed.md:8,79`). This is a planned merge that silently didn't
   execute, and no gate can see it.

A third, smaller candidate: the old `guides/make-waymark-your-own.md:36-100` worked re-skin
against `examples/cairn-theme/` (the Fraunces swap, the `data-flourish` gestures, the
leading-`@import` ordering rule Vite's leniency masks, the "a serif reads legible one type-scale
step lower than a sans" lesson). `examples/cairn-theme/README.md:5-12` still points at the
doomed guide for "the full walkthrough". That is one subsection of `design-your-site.md`, not a
page.

---

## Cutover hygiene surfaced by this sweep (not content loss)

Recording these because Task 9 was the only pass that read both sides:

- **134 references into the three doomed arms remain in surviving files** (`docs/reference/`,
  `docs/README.md`, `src/`, `examples/`, `CHANGELOG.md`). `npm run check:docs`
  (`scripts/checks/docs-links.mjs`) will catch the markdown half loudly, and the target manifest
  §3 already plans the legacy-path map for it. Three that sit **outside** `docs/` and are
  therefore outside that gate's reach, and which the manifest does not name:
  `examples/cairn-theme/README.md:9`, `src/lib/diagnostics/conditions.ts:23`, and
  `src/lib/sveltekit/admin-action.ts:202` (both source comments naming `docs/guides/` paths).
- `src/tests/unit/github-slug-contract.test.ts` carries `source: 'docs/tutorial/...'` labels and
  a doc comment describing its corpus. It uses inline literals, so it will **not** go red at
  cutover; its provenance labels just stop being true. Worth a one-line comment fix, not a
  blocker.
- `docs/reference/auth-channel.md:181` points at `add-a-login-channel.md` "for the exact
  statement" of `CHANNEL_SCHEMA_SQL`. Repointing it is coupled to find #4: there is currently
  nowhere else for it to point.

---

## Checked and deliberately declined

Ordered roughly by how much of the old corpus each line accounts for.

**The explanation arm**

- `explanation/architecture.md` in full, except finds #17, #19, #21. The layered model, the
  subpath split, the holding-branch pipeline, one-renderer-for-preview-and-public, the
  three-store split, and the distribution note are all re-expressed equivalently across
  `extend/architecture.md`, `extend/data-tiers.md`, and `extend/README.md`'s stability section.
- `explanation/architecture.md:47-54`, the `parseSiteConfig` cross-key rejection (a key belonging
  on the adapter appearing in the YAML throws, and the reverse). Verified live at
  `src/lib/nav/site-config.ts:312-336`, and **already documented** at
  `docs/reference/core.md:723`. Declined.
- `explanation/content-model.md`'s field-vocabulary reasoning: why `fields.*` names closed types
  rather than accepting any JSON, why containers nest exactly one level (`FieldInput` recurses
  once), the `InferFieldset` worked example. The *facts* all survive in
  `docs/reference/core.md:410-440,484-487`. The *rationale* is genuinely gone, but it is
  rationale for a constraint a developer meets as a thrown error with a clear message, which is
  the cheapest possible way to learn it. Declined as low-consequence.
- `explanation/content-model.md:92-95`, the rationale for deriving a URL from the filename rather
  than storing a slug field. New `extend/content-model.md:23-30` makes the same point in one
  sentence ("There is no separate slug codec"). Rewording, not loss.
- `explanation/data-tiers.md` in full, except that its **organizing rule differs** from the new
  page's. The old rule was two questions ("does it want a past?", then "does it have a draft
  state distinct from live?"); the new rule is "what has to read it, and how fast". Both are
  defensible; the new page's version is the more useful one for a developer siting their own
  data. The one fact the old rule carried that the new page doesn't — that config commits
  straight to `main` behind an expected-head check, with no holding branch, because a nav label
  has no draft state — is a behavior a site never wires by hand. Declined.
- `explanation/data-tiers.md:52-69`, the D1 transactional guarantees (single-statement token
  consumption, the last-owner count folded into the `DELETE`'s `WHERE`, live session-to-editor
  join so a demotion takes effect on the next request). All three are stated in
  `extend/security-model.md` and `extend/data-tiers.md`, the last one in the old
  `security-model.md`'s own words. Declined.
- `explanation/security-model.md`'s boundary table, CSRF double-submit contract, response
  hardening, commit-credential separation, sanitize-floor summary, and log-redaction stance: all
  present, several in more detail, in `extend/security-model.md`. Declined.
- `explanation/security-model.md:57-65`, the `?error=` link-crafting closure. Verified still
  true and **already documented** at `docs/reference/sveltekit.md:387` ("These three sites, and
  only these three, carry a bounded internal code on `?error=`"). Declined.
- `explanation/render-safety.md` in full. The new page is better: same two-pass structure, same
  allowlist extensions, same `unsafeDisableSanitize` posture, and it adds the `srcSet`/`sizes`
  admission and the `className` per-tag-override detail the old page omitted. The islands
  section the new page drops is preserved at `docs/reference/islands.md:122-127` and
  `extend/add-an-island.md:61`. Declined.
- `explanation/reference-integrity.md`, everything except find #7. Storing only the id, taking
  the target concept from the descriptor rather than the frontmatter, the `concept/id` key pair,
  the byte-preserving rewrite, delete-refuses, and `verifyReferences` as the build backstop are
  all in `extend/link-content-with-references.md`. The page was killed on purpose and most of it
  landed. Declined.
- `explanation/media-storage.md` in full. Killed on purpose; content-addressing, dedup, the
  rename-safety property, and the why-not-git argument all live in `extend/data-tiers.md:48-65`.
  Declined.
- `explanation/enforced-design.md` in full. Killed on purpose. It is an argument about building
  admin screens with coding agents, and it is preserved in
  `docs/internal/admin-design-system.md` and the design-arc logs, which survive. It was always
  closer to an internal design memo than to developer documentation. Declined.
- `explanation/editor-copyedit.md`, everything except find #5: local-versus-remote deciding the
  default, tidy's remit stopping at wording, propose-never-apply, style-never-inferred, the
  committed dictionary. The behavioral halves are all in `extend/enable-tidy.md` and
  `editors/write-in-the-editor.md`. Declined.

**The tutorial arm**

- `tutorial/build-your-first-cairn-site.md:26-39`, the `svelte.config.js` adapter instructions.
  **Known stale, declined on sight.** A current `sv create` (0.17.0) emits no such file; the new
  `build-a-site-by-hand.md:30-51` corrects this explicitly and well.
- The rest of the old tutorial's milestone structure, adapter declaration, content-file shape,
  renderer wiring, component registration, delivery surface, admin mount, and deploy: all
  re-expressed in `build-a-site-by-hand.md`, generally more accurately (the new page's
  `bootstrapOwner`, the doctor `config.csrf-disable-missing` skip caveat, and the placeholder-
  credentials `<details>` are all improvements with no old-page equivalent). Declined.
- `tutorial/build-a-theme.md` in full. It is a **skeleton**: one worked section and five
  `<!-- TODO -->` stubs, carrying a stale note that the chassis template doesn't exist yet.
  `extend/design-your-site.md` is strictly better. Nothing to salvage. Declined.
- The old tutorial's `aiPosture` digression (`:355-359`). Fully covered by
  `extend/choose-an-ai-posture.md`. Declined.

**The guides arm**

- `guides/structured-fields.md` in full except find #24: the per-type constraint tables, the
  container caps, no-reference-inside-a-container, no dot in a field key, `boolean.required`
  having no effect, `icon` falling back to a text input. All in `docs/reference/core.md:307-440`.
  The page was killed on purpose and its content is intact in the reference arm. Declined.
- `guides/upgrade-cairn.md`'s per-version ledger, essentially in full. Spot-checked 0.94.0's
  breaking sweep, 0.93.0, 0.86.0, the 0.84.2 "admin hangs 55 minutes after login" bug
  (`CHANGELOG.md:2229-2237`), 0.87.4's Get Help default (`:1816-1823`), and the rc.1/rc.2
  `browser`/`worker`-condition Worker-startup defect (`:940-955`): every one is present in
  `CHANGELOG.md` in **more** detail and better organized than the old prose ledger. The
  1127→131 collapse is correct. Declined, with find #13 as the one exception.
- Every `upgrade-cairn.md` entry for 0.81.0-0.83.0. `CHANGELOG.md:368-369` states a live
  consumer floor of `^0.84.4`; `extend/migration-notes.md` correctly starts there. Declined as
  pre-floor history.
- `guides/upgrade-cairn.md:118-121`, the admin type-grammar adoption recipe (run `cairn-audit`,
  match a `type-scale` finding's resolved size to a named role, rename, re-run; "265 of 298
  findings were pure renames" on the first consumer admin measured). `CHANGELOG.md:1560-1562`
  names this guide as that content's home, so it does go dark. Declined from the ranked list
  because it serves cairn's own admin-toolkit adopters rather than the extend audience, and
  `docs/reference/admin-grammar-tokens.md` is a reasonable home if anyone wants it —
  noted here so the decision is on the record rather than accidental.
- `guides/upgrade-cairn.md:262-271`, checking for a pre-existing hand-rolled `audit_log` table
  before applying `migrations/0002_audit.sql`. Verified against the migration's own comment,
  which states no site has applied it yet. Forward-looking, not an active gap. Declined.
- `guides/add-a-custom-admin-screen.md` in full: the `requireSession`/`requireEditor`/
  `requireOwner` contracts, the none-capability passthrough, the two-places access-map wiring,
  `createSectionAction` composing `adminAction`, the `waitUntil` "Illegal invocation" audit-sink
  gotcha, and audit-on-refusal. All present in `extend/add-a-custom-admin-screen.md` and
  `docs/reference/sveltekit.md:442-450,594-625`. Declined.
- `guides/organize-your-admin-nav.md`'s mechanics: `collapsed` versus cookie precedence, `roles`
  as visibility rather than enforcement, `attention` badges, omission-falls-back versus
  hidden-is-explicit. All present. Declined.
- `guides/restrict-admin-access.md` except find #6: the two-places wiring footgun, the
  unmatched-target-refuses-everyone contract, deny-at-the-route-not-the-nav doctrine. All
  present. Declined.
- `guides/give-a-role-its-own-admin-area.md` in full. Merged correctly into
  `extend/add-a-second-audience.md` Path A; the `0001_roles.sql` `CHECK`-constraint fact it
  leaned on now lives at `extend/data-tiers.md:32`. Declined.
- `guides/add-a-login-channel.md`'s security core: origin-and-scheme checked first, the salted
  and prefixed `correlationId`, rejection-sampled code drawing, `challenge-required` escalation
  semantics, `revokeSessions`. All present, often near-verbatim, in
  `extend/auth-channel-security-model.md` and `docs/reference/auth-channel.md`. Declined.
- `guides/share-a-draft-preview.md` in full: the migration, the mount-inside-the-layout-group
  rule, credential-shaped-emission suppression, mint and revoke, the branch-lifecycle table, and
  the cache and rate-limit notes. The new page tracks the old almost exactly. Declined.
- `guides/choose-an-ai-posture.md` in full: the crawler table, `Content-Signal` mechanics, the
  user-triggered-fetch exemption, the `llms.txt` rationale, and the Cloudflare-edge-is-the-real-
  enforcement framing. The new page is shorter and drops no verifiable fact. Declined.
- `guides/add-an-island.md` in full: eager-versus-`'visible'` mounting, fallback-as-first-paint,
  sandboxed-preview verification. Restated, often more precisely. Declined.
- `guides/configure-rendering.md` and `guides/wire-the-delivery-surface.md`: the tag-filtering
  walkthrough (`extractVocabulary`, `ContentIndex.byTag`/`allTags`) is the only substantial
  dropped prose, and its API is documented in `docs/reference/delivery-data.md`. Declined.
- `guides/reuse-content-across-entries.md`: the `include.missing` event and the preview-degrades-
  versus-build-throws split live at `docs/reference/log-events.md:46-47`. Declined.
- `guides/make-waymark-your-own.md`'s token-seam mechanics (the two `@plugin` blocks, the one
  `@theme` block, `check:public-tokens`, `test:reskin`) are preserved in
  `extend/design-your-site.md`'s "chassis versus theme" and "re-skin recipe". Only the worked
  example is gone, flagged above. Declined.
- `guides/iterate-your-design-locally.md`'s "Ship once" gate (`npm run check`, the suite, deploy,
  verify live matches local) and its five-viewport reference: generic practice, and the viewport
  standard is family-wide doctrine carried in `CLAUDE.md` and the `visual-fidelity` skill.
  Folded into the whole-page flag instead. Declined as a standalone.
- The old `why-cairn.md`'s two smaller rationales: "a host-abstraction layer would be the biggest
  single abstraction in the codebase, and every abstraction cairn doesn't carry is code that
  can't break" (the Cloudflare lock-in argument), and "the admin skeleton is the one place the
  idiom is fixed: extending it means Tailwind's idiom or none, since there's no theming API to
  point it at another system". The new page states the *conclusion* of both. The DaisyUI half is
  the more useful loss, since "there is no theming API" is a hard constraint a developer would
  otherwise go looking for. Declined as one-sentence-shaped, but note it if the front door gets
  another pass.

---

## Unverified — do not fold

Three items came in from the sweep that I could not ground in current source. Recording them so
nobody re-discovers them and folds them on the old page's authority:

1. **Foreign-key migration ordering** (`guides/add-a-custom-admin-screen.md:484-490`). Plausible
   general D1 behavior, but cairn's own migrations carry no `REFERENCES` clause anywhere in
   `migrations/*.sql`, so there is nothing in this codebase it demonstrably applies to.
2. **The kit#12533 `curl` status-200 caveat** (`guides/restrict-admin-access.md:142-147`), on a
   streamed sibling load masking a rejection's status code. Mechanism plausible, but the current
   streamed pending-count load could not be matched to it cheaply.
3. **The D1 read-replication caveat for a channel database**
   (`guides/add-a-login-channel.md:236-243`). The general mechanism (replicas, first-primary
   bookmark routing) is already documented for the audit sink at
   `docs/reference/sveltekit.md:578-584`; the channel-specific application is an inference from
   that, not an independently verified fact.

---

## One live defect in the new corpus, found in passing

Not a mining find, but verified and worth fixing before the cutover ships:
**`SiteRender` takes a single object argument**, and two doc pages call it with two positional
arguments.

- Signature: `src/lib/content/types.ts:215-221` — `export type SiteRender = (input: { body; concept?; frontmatter?; resolve?; resolveMedia?; resolveFragment? }) => ...`
- Wrong call, twice: `docs/extend/wire-the-delivery-surface.md:156` and
  `docs/reference/delivery-data.md:273`, both
  `await cairn.rendering.render(posts.byId(p.id)!.body, { resolve })`.

The second lives in the **surviving** reference arm, so this outlives the cutover either way.
Both should read `render({ body: ..., resolve })`. The engine's own snippet gate did not catch
it, which is worth a look on its own.
