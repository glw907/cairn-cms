# Polish inputs: the docs cover-to-cover sweep

Read-only sweep dispatched 2026-09-08 during polish planning (Opus, fresh context, one track per reader), against `main` at `f3f24b9f`. Findings are inputs to the polish spec.

---

Both verification agents are back. Here is the full read.

## 1. Ranked findings (30)

**Blocking or actively misleading**

1. **`docs/admin/before-you-start.md:52-53`** (+ `docs/admin/create-your-site.md:90`, `docs/why-cairn.md:78`) — "Cloudflare's Workers Paid plan, $5 a month… from your first deploy." The tool says the opposite: `packages/create-cairn-site/src/scaffold.mjs:248-250` ("sending sign-in email to anyone but yourself **also** needs Workers Paid"), `src/cloudflare/chapter2.mjs:680` asks to enable it at the *email* step, and `src/cloudflare/catalogue.mjs:541-551` says declining leaves the site "still working." `docs/admin/own-your-domain.md:59-60` then calls that step "the free-until boundary from Before you start" — a boundary Before you start never draws. **Reader:** the operator, who is told to spend $5/mo before they need to. **Standard:** admin counterpart question (cost revealed correctly, before the step that incurs it); every factual claim literally true. **Fix:** make Workers Paid a second-editor cost in all four places; keep the tool's `costPreamble` wording aligned or fix `money.mjs:32-34` too.

2. **`docs/admin/before-you-start.md:83-84`** — "Adding an editor… takes two things beyond what your site already has: a domain of your own connected, and Cloudflare's Email Sending turned on." It takes three; `docs/admin/invite-editors.md:7` names Workers Paid as the gate, and `catalogue.mjs:555-566` refuses onboarding without it. **Reader:** operator. **Standard:** prerequisites stated before the step. **Fix:** make it three things and link the Workers Paid paragraph.

3. **`docs/extend/reuse-content-across-entries.md:71`** — "Fragments need no fields of their own beyond a title; the admin gives every concept one for free." `src/lib/components/EditPage.svelte:1372,1797` renders a title input only when the fieldset declares a field named `title`; the page's own snippet at `:20-26` declares `fields: defineFieldset({})`, so the frontmatter it shows at `:76-78` could never be typed. Compare `examples/showcase/src/theme/cairn.config.ts:142-144`, which declares it. **Reader:** developer following the guide. **Standard:** snippets typecheck and run. **Fix:** add `title: fields.text({ required: true })` and delete the "for free" sentence.

4. **`docs/extend/wire-the-delivery-surface.md:20`** — `import { cairn, siteConfig } from '$theme/cairn.config.js'`. The page's precondition points only at `define-an-adapter-and-schema.md`, which sets up neither the `$theme` alias nor a `siteConfig` export; both appear only in `build-a-site-by-hand.md:223,270-277`, a different section of the README's reading order. **Reader:** developer on the "building blocks" path. **Standard:** preconditions stated with links to whatever produces them. **Fix:** name the real dependency in the precondition line.

5. **`docs/admin/is-it-working.md:42`** — the transcript prints `FAIL Zone HSTS`, a check that no longer exists: no `title: 'Zone HSTS'` anywhere in `src/lib/doctor/`, and `checks-cloudflare.ts:111-114` folded it into `Always Use HTTPS` (whose remediation now says "keep HSTS on"). The surrounding prose at `:24` and `:62-66` says "three zone-derived checks"; there are two. The jump list (`:124-159`) has no `Zone HSTS` row, so an operator seeing that line finds nothing. **Reader:** operator. **Standard:** a transcript traces to a recorded run of the *current* tool. **Fix:** re-record `03-doctor-credentialed.txt` (and `02-doctor-bare.txt`, whose `8 passed, 0 failed, 11 skipped` total the page quotes at `:26` is also stale), then correct "three" to "two".

6. **`docs/admin/troubleshooting.md:14`** — "run `npx cairn-doctor` and check the `config.observability-off` row." The doctor never prints condition ids; `docs/admin/is-it-working.md:68-69` says so in as many words. The row is titled `Workers Logs sink`. **Reader:** operator, who scans output for a string that cannot appear. **Standard:** a step the reader can actually follow. **Fix:** name the printed title, link the id.

7. **`docs/extend/build-a-site-by-hand.md:664-669`** — claims `config.csrf-disable-missing` "reports a skip, not a pass" on this tree. `src/lib/doctor/checks-local.ts:95-121` reads `vite.config.ts` as well as `svelte.config.js`, and this walkthrough writes both `csrf.checkOrigin: false` and `createAuthGuard()`, so the check passes. **Reader:** developer who then chases a non-problem. **Fix:** state that the check covers `vite.config.ts` and that this tree passes.

8. **`docs/extend/what-the-scaffold-wrote.md:96`** — "the tree above is complete." Running `scripts/build/emit-template.mjs` shows the scaffold also writes `vitest.config.ts` and five `*.test.ts` files (`src/chassis/archive.test.ts`, `date.test.ts`, `render.test.ts`, `src/theme/components/admin-link.test.ts`, `src/theme/islands/banner-expiry.test.ts`); `bake-template.mjs`'s prune list strips only the Playwright half. **Reader:** developer taking over a scaffolded site, the page's whole premise. **Fix:** add them, or scope the claim.

9. **`docs/extend/data-tiers.md:29`** — "Five tables across four migrations, each migration beyond the first opt-in." `migrations/0004_login_nonce.sql` is a fifth and is not opt-in: `docs/extend/add-cairn-to-a-sveltekit-app.md:103-109` calls it one of "the two every site needs," and `src/lib/auth/store.ts:26` throws `auth.store-unmigrated` without it. **Reader:** developer wiring D1 by hand, who ships a site nobody can sign in to. **Fix:** update the count, name `nonce_hash`, drop "opt-in beyond the first".

10. **`docs/admin/is-it-working.md:353` vs `:149-152`** — the section says "Five related conditions," and `auth.store-unmigrated` (`:367`) is the fifth, but the router jump list carries only the other four. `check:readiness` passes because it gates anchors, not the router. **Reader:** operator matching a condition id to a section. **Fix:** add the fifth row.

11. **`docs/editors/when-something-goes-wrong.md:34-42`** — the doc has to contradict the product twice: "This file changed since you opened it. **Reload** and reapply your edits" → "Despite what this says, don't reload the page," and "Your edits are saved. **Reload** and publish again" → "Select Publish again." **Reader:** an editor mid-conflict, the worst moment to be told the screen is lying. **Standard:** the fear behind the task answered before the mechanics; a doc should not paper over product copy. **Fix:** an engine copy change (drop "Reload" from both refusals), then simplify the doc. This is an audit-ledger item, not a docs edit.

12. **`docs/editors/manage-your-tag-vocabulary.md:26,32,38`** — "every **post** already carrying that tag", "a tag with no **posts** using it", "tags already on your **posts**". The index is per entry across concepts (`src/lib/content/tag-usage-index.ts:54`, "the manifest's per-entry tags"), and every other editors page says "entry". The UI carries the same defect (`src/lib/components/VocabularyAdmin.svelte:162,220,244`). **Reader:** an editor on a site whose Pages carry tags, who sees a count that disagrees with the word. **Standard:** one term, one meaning. **Fix:** "entries" in both doc and component copy.

13. **`docs/extend/share-a-draft-preview.md`** — no `Precondition:` line, yet `:38-39` imports `site, ORIGIN` from `$lib/content.js`, defined only in `wire-the-delivery-surface.md:31,51`. Siblings (`define-an-adapter-and-schema.md:6`, `configure-rendering.md:6`, `restrict-admin-access.md:163`) all state one. **Fix:** add the line.

14. **`docs/extend/add-a-second-audience.md`** — same: no `Precondition:` despite assuming a declared adapter and a working migration flow. **Fix:** point at `define-an-adapter-and-schema.md`.

**Structural and consistency**

15. **`docs/extend/*.md`, page openers** — 11 pages open with a bold `**Contract:**` (`add-a-custom-admin-screen`, `add-an-island`, `add-cairn-to-a-sveltekit-app`, `configure-rendering`, `declare-your-own-concept`, `define-an-adapter-and-schema`, `link-content-with-references`, `migrate-existing-content`, `reuse-content-across-entries`, `what-the-scaffold-wrote`, `wire-the-delivery-surface`); ten equivalent task guides open with a bare sentence (`announce-on-publish`, `choose-an-ai-posture`, `enable-tidy`, `organize-your-admin-nav`, `restrict-admin-access`, `rotate-the-github-app-key`, `share-a-draft-preview`, `upgrade-cairn`, `add-a-second-audience`, `design-your-site`). **Reader:** the extend skimmer, who cannot rely on a scan pattern. **Standard:** task-guide anatomy, "a one-line contract". **Fix:** put `**Contract:**` on every task guide; leave the six concept pages bare.

16. **`docs/extend/assets/cairn-concept.md`, `docs/extend/assets/cairn-site-anatomy.md`** — writer-facing figure-copy specs ("149 characters", "## Text alternative") living inside a published arm that `package.json:193` ships wholesale, so they reach the tarball and cairn.pub as if they were extend pages. `npm run check:arm-indexes` is red on both. Untracked in git, so this is arriving work, not landed. **Standard:** every published page belongs to exactly one track; this one serves the writer, not the developer. **Fix:** move under `docs/internal/`, or exclude `docs/extend/assets/*.md` from `files` and the arm index.

17. **`docs/extend/security-model.md:233-234`** — "`process.env` (an adapter-node OS variable)" uses "adapter" for `@sveltejs/adapter-node`, colliding with the term the track's own Vocabulary (`docs/extend/README.md:105-107`) defines as the `cairn.config.ts` object. **Standard:** product terms used precisely. **Fix:** name the package: `` `@sveltejs/adapter-node`'s own OS variable ``.

18. **`docs/extend/README.md:14-22`** — the second heading is "Before any of this: the adapter has to exist" and uses *adapter*, *concepts*, and *render* before the Vocabulary that defines them at `:98-124`. **Reader:** an evaluator arriving from npm, who meets three product terms undefined. **Fix:** move Vocabulary above "The deep path", or link forward from `:16`.

19. **`docs/extend/wire-the-delivery-surface.md:37-43`** — introduces a literal `ORIGIN` constant with no reference to `PUBLIC_ORIGIN`, which the reader set in `add-cairn-to-a-sveltekit-app.md:132-133` and which `security-model.md` makes load-bearing for the guard. No answer to "must these agree?" **Fix:** one sentence distinguishing them.

20. **`docs/extend/migration-notes.md:183-199`** — "Five type-level changes" over four bullets. **Fix:** five bullets, or reword the count.

21. **`README.md:68`** — "runs in production on two sites today". `CLAUDE.md` states "Four production sites depend on the package, each on its own version range." One of the two is stale. **Reader:** evaluator weighing maturity. **Fix:** reconcile; if the other two are not public, say "two public sites" rather than "two sites".

22. **`docs/reference/render.md:13`** — `## Types` sits before `## Emitted classes`; every sibling that carries both puts Types last (`core.md:1032`, `media.md:151`, `cloudflare.md:182`, `auth-store.md:210`, `auth-channel.md:234`, `delivery-data.md:532`, `sveltekit.md:1934`, `admin-toolkit.md:886`). **Standard:** reference-entry anatomy, consistent across siblings. **Fix:** move Types to the end.

23. **`docs/reference/cli-cairn-manifest.md:49`** — `## Exit behavior` where the CLI siblings use `## Exit codes` (`cli-cairn-media-seed.md:67`, `doctor.md:131`, `cairn-audit.md:36`). **Fix:** rename.

24. **Second person in reference prose** — `cli-cairn-manifest.md:46` ("your `vite.config.ts`"), `cli-cairn-media-seed.md:13` ("objects you want locally"), `doctor.md:143` ("let you branch… if you want"), `sveltekit.md:618,620` ("a row your site code writes", "Log the event yourself if you want"), `auth-channel.md:219` ("only if you can't run the migration runner"). **Standard:** `docs-register.md:311-315`, "dry contract prose, third person". **Fix:** recast each in third person.

25. **`docs/reference/log-events.md:73`** — "not because `detail` is sensitive but to avoid duplication". Banned contrast frame. **Fix:** "Because `admin.action.audited` already logged the full record, this omits `detail`."

26. **`docs/admin/is-it-working.md:311`** — "so your site's content **concepts** can't be resolved at all", in the operator-facing "what it means" prose (not an Ask-a-developer block). "concept" is on the admin track's banned list. (`:361`'s "auth schema" is inside a developer block and is fine.) **Fix:** "the settings that define what your site publishes".

27. **`docs/admin/is-it-working.md:53-58`** — the page discloses that its transcript predates `INFO` and `UNCHECKED` and shows old dependency versions (`:39` prints svelte 5.56.9 while `:325` prescribes `^5.56.10`). Honest, but the disclosure is now three paragraphs of apology for a stale fixture. **Fix:** re-record with finding 5 and delete `:53-58`.

28. **`docs/extend/add-cairn-to-a-sveltekit-app.md:112-120`** — `0002_audit.sql`'s different `migrations_dir` requirement lands two sentences after two other migrations are described as going into "this same `migrations/` directory". **Reader:** a copy-pasting developer. **Fix:** front-load the distinction.

29. **`docs/reference/reproductions.md:286,316`** — "simply doesn't supply that member", "simply declares no height". Minimizing filler in contract prose. **Fix:** delete both.

30. **`docs/editors/README.md:4`** — "If you came from the **Get help** link inside the editor". `src/lib/components/HelpHome.svelte:277` uses "Get help" as a section eyebrow; the link itself reads "Find help at…" under the heading "Ask the person who set up your site", and its target is only `https://cairn.pub/help` when the site hasn't overridden `supportContact` (`src/lib/content/compose.ts:18`). **Reader:** an editor checking they're in the right place. **Fix:** describe the arrival by the section, not a link label that doesn't exist.

## 2. How each track read

**admin.** Reads well page to page, and the recovery triad (`is-it-working` / `setup-recovery` / `troubleshooting`) routes cleanly with a matching three-line router at the top of each. What a reader stumbles on first is money: `before-you-start` says Workers Paid starts at the first deploy, `own-your-domain` calls the email step "the free-until boundary," and nothing reconciles them — the one decision an operator makes before touching a terminal is the one the track answers twice.

**editors.** The strongest track by a distance: no outbound links, no terminal, no banned vocabulary, 31 UI quotes gated by `check:editor-quotes`, and every number I checked (10-minute link, 30-day session, 25-entry history, the full toolbar keymap) matches source. The first stumble is not a docs defect: `when-something-goes-wrong` has to tell the reader to ignore two of the editor's own refusal messages, which is a product-copy fix wearing a documentation costume.

**extend.** Contract-first where it commits to the form, and the vocabulary section is genuinely load-bearing — but half the task guides don't use the `**Contract:**` opener, so the shape a skimmer learns on page one doesn't hold on page five. The first real stumble is preconditions: a reader who follows the README's own "building blocks" ordering hits `wire-the-delivery-surface`'s `$theme` import with no page having produced it, and `share-a-draft-preview` and `add-a-second-audience` state no precondition at all.

**reference.** Dry, gated, and consistent; all 24 pages carry a real narrative lede, no page degrades into a task guide, and the export surface is held by four gates rather than by prose. The stumbles are cosmetic: one page orders `## Types` against eight siblings, one CLI page names its exit section differently from the other three, and second person leaks into six sentences.

**Front door.** `README.md` carries exactly the register's five routes in the required order with the command above them; `docs/README.md` inserts a sixth (reference) before contributor, an undocumented deviation. `why-cairn.md` is the strongest page in the repo and its trade-off section is honest — except that it repeats the first-deploy cost error at `:78`.

## 3. Checked and found clean

- `check:vale` — 0 errors across 734 files. `check:transcripts` — 4 blocks, all grounded. `check:editor-quotes` — 31 quotes grounded. `check:prose` — 50 components clean. `check:figures` — both SVGs up to date.
- `check:docs` — 4 broken links, all in `docs/internal/record/`, none in a published track. Every relative link and `#anchor` in `docs/extend`, `docs/admin`, `docs/editors`, `docs/reference` resolves. No inbound link points at a moved section.
- Condition registry: all 23 ids in `src/lib/diagnostics/conditions.ts` appear in `is-it-working.md`, and all 21 doctor check titles in `src/lib/doctor/` appear in its jump list.
- CLI surface: every flag documented for `create-cairn-site` (`--dir`, `--sign-in`, `--connect`, `--start-over`, `--owner-email`, `--yes`, `--domain`, `--email`) and `cairn-doctor` (`--from`, `--repo`, `--send-test`, `--probe`, `--fix`, `--help`) exists in `args.mjs` / `assemble.ts:33-58`.
- Editor track: zero outbound cross-track links, zero banned vocabulary (repo/commit/branch/deploy/frontmatter/GitHub/Cloudflare/H2), zero code fences or terminal commands. Every quoted timing and limit verified against `auth/crypto.ts:64,67`, `content-routes-entry.ts:337`, `EditorToolbar.svelte:84-121`, `EditPage.svelte:1279-1298`.
- Admin track vocabulary: only two engine-term leaks in nine pages (findings 26 and the benign `:361`).
- Import surface: every `@glw907/cairn-cms/*` subpath used anywhere in the docs exists in `package.json` exports, and every named import across all 33 extend pages resolves to a real barrel export.
- Version history: the `0.86.0` / `0.94.0` seam-break claims in `extend/README.md:73-77` and `why-cairn.md:52-55` match `CHANGELOG.md:2329,4017` and `migration-notes.md:210,253`.
- Em-dash use is confined to index-list separators in four README-style pages; no elaborative-tail rhythm anywhere. No pitch words, participial openers, or setup-colon triads in any track.
- `check:symbols` fails on `docs/reference/reproductions.md:55` (`dist/reproductions/manifest.js`) only because `dist/` isn't built in this checkout — not a doc defect. `check:arm-indexes` fails on the two untracked `docs/extend/assets/*.md` (finding 16) and one internal file.

Findings 3, 4, 7, 8, 9, 13, 14, 17, 19, 20, 28 come from the extend-track verification chain with the source citations shown; the rest I read and verified directly.
