# Documentation Initiative Phase 4 Implementation Plan: the Guides arm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give an external adopter the task-oriented arm of the docs: seven how-to guides under `docs/guides/`, each answering one "how do I do X" task, linking the Phase 2 reference for signatures and the Phase 3 explanation arm for the why, plus an index that flips the docs-index How-to-guides line.

**Architecture:** Six new guides plus one relocated-and-refreshed guide (`upgrade-cairn`, moved from `docs/upgrading.md`) and an arm index. The seven sort into three tiers: three lean setup guides that link the authoritative ops docs (the Cloudflare/D1/GitHub-App plumbing the showcase cannot validate and P4 will scaffold), three full engine-surface guides validated against `examples/showcase`, and the relocation. The arm changes no engine code, so the gate is the docs gate (prose-guard clean, links resolve, claims cross-checked by hand), not the unit suite.

**Tech Stack:** Markdown, `prose-guard` (the writing-voice gate), `git`.

**Design spec:** `docs/superpowers/specs/2026-06-04-cairn-docs-phase-4-guides-design.md`.

---

## Conventions for this plan

**The page gate, not the engine gate.** A guide changes no engine code, so its verification is the docs gate, three checks: `prose-guard <guide>` shows no blocking tell, every relative link resolves to a real file, and the guide's steps and API claims are cross-checked by hand. The full guides additionally cross-check their worked example against `examples/showcase`. The lean guides cross-check against the engine source, the named ops doc, and the credentials and bindings model in `CLAUDE.md`. There is no automated coverage gate, because guides have no typed surface to enumerate. Do not run `npm run check` or `npm test`; this arm adds no test and changes no engine code.

**prose-guard is tiered.** The blocking hook checks em dashes, banned phrases and openers, and structural patterns on the text being written. The advisory lines (passive, tricolon, burstiness, anaphora) are sweep-only and non-blocking. The CLI `prose-guard <path>` exits 1 on any tell including advisory, so judge the gate by the absence of a blocking tell, not by the exit code. Draft clean on the first pass; do not chase the advisory lines.

**Prose.** All authored prose follows the writing-voice standard, so draft clean on the first pass. No em dashes in prose; end the sentence or use a colon, comma, or parentheses. One idea per sentence. No "not X but Y" frame, no reflexive three-item lists, no setup-colon payoff, no participial or connector openers. Vary sentence length and reread once for flat cadence before finishing. The implementer carries the full banned-construction list in its own instructions.

**The link check.** To confirm a guide's relative links resolve, run this from the repo root with the page path:

```bash
f=docs/guides/<guide>.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do
  p="${t%%#*}"; [ -z "$p" ] && continue
  [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"
done; echo "(no DANGLING line above means every relative link resolves)"
```

**The how-to format.** Every guide follows the same shape: a one-line goal at the top (what the reader accomplishes), a Prerequisites section (what must already exist and which sibling guide or the tutorial precedes it), numbered task steps, a Verify section (how the reader confirms the task worked), and a "See also" section linking the reference for the exact surface and the explanation arm for the why. A guide links a signature rather than restating it, and links the explanation arm for reasoning rather than re-explaining. Keep each guide distinct from the forthcoming Phase 5 tutorial, which teaches a first build once as a narrative; a guide answers one task for a reader who already has a site.

**Lean versus full.** The three lean setup guides (Tasks 2, 3, 7) state the goal, the numbered steps, and the verify, then link the authoritative ops doc for depth rather than duplicating it. They draw their facts from the engine source, the named ops doc, and the credentials and bindings in `CLAUDE.md`, because `examples/showcase` runs `adapter-node` and has no Worker, D1, or GitHub App loop to validate them. The three full guides (Tasks 4, 5, 6) carry a worked example checked against the showcase files named in each task.

**The relocation's transient referrer.** Task 1 moves `docs/upgrading.md` to `docs/guides/upgrade-cairn.md`. The live public referrers in `docs/README.md` (the How-to-guides line and the Current-pages "Upgrading cairn" entry) are repointed in Task 8, so a transient dangling link to the old path is expected between Task 1 and Task 8, the same within-phase pattern Phase 3 used. The phase-end ritual confirms none remain. Leave dated historical references under `docs/superpowers/` and the historical `docs/STATUS.md` entries as point-in-time records; do not rewrite history.

**Friction logging.** If writing a guide surfaces design friction (a setup step that needs too much tribal knowledge, an awkward adapter shape, a deploy flow with a sharp edge), append a short entry to `docs/internal/docs-friction-log.md` under `## Findings` (perspective `developer` or `editor`, the guide that surfaced it, a short note). If none, skip the friction file for that task.

---

### Task 1: `upgrade-cairn.md` (relocate and refresh)

**Files:**
- Rename: `docs/upgrading.md` to `docs/guides/upgrade-cairn.md`
- Modify: `docs/guides/upgrade-cairn.md` (light refresh)

**Model:** Sonnet. The page is already good. This task moves it into the arm and refreshes it lightly; it does not rewrite it.

- [ ] **Step 1: Move the file with history preserved**

```bash
mkdir -p docs/guides
git mv docs/upgrading.md docs/guides/upgrade-cairn.md
```

- [ ] **Step 2: Light refresh**

Read `docs/guides/upgrade-cairn.md` in full. It is the `0.x` rename list, one heading per breaking change, each with its "Consumers must:" action. Make only these touch-ups:
- Confirm the rename list still reads true against `CHANGELOG.md`. The list runs oldest first (currently `0.7.0` through the latest landed). If `CHANGELOG.md` carries a "Consumers must:" breaking change that postdates the last heading here, add a heading for it in the same shape (version, what changed, the "Consumers must:" action). Do not invent entries; only add one that `CHANGELOG.md` already records as breaking.
- The page uses no relative markdown links today. If the refresh adds one, make it resolve from the new `docs/guides/` location.
- Do not change the page's framing or voice beyond the touch-ups above.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/upgrade-cairn.md
f=docs/guides/upgrade-cairn.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking prose tell, and no `DANGLING` line. The `docs/README.md` references to the old `upgrading.md` path are repointed in Task 8; a transient dangling link from that file is expected until then.

- [ ] **Step 4: Commit**

```bash
git add docs/guides/upgrade-cairn.md
git commit -m "Relocate upgrading to guides/upgrade-cairn

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: `set-up-the-github-app.md` (lean)

**Page:** `docs/guides/set-up-the-github-app.md`  **Model:** Sonnet (lean: goal, steps, links).

**Source material (read before writing):** `docs/github-app-key-rotation.md` (what is stored, the PKCS#1-to-PKCS#8 conversion, why not `jose`), the repo `CLAUDE.md` "Credentials" section (the App ID, installation ID, and `GITHUB_APP_PRIVATE_KEY_B64` model, and the in-Worker `atob()` before `@octokit/auth-app`), and `src/lib` auth/GitHub-App source for the helper names (`appJwt`, `installationToken`, `commitFile`). Cross-link targets: `../reference/core.md`, `../explanation/security-model.md`, `../explanation/architecture.md`, `./configure-auth-and-d1.md`, `./deploy-to-cloudflare.md`, `../github-app-key-rotation.md`.

- [ ] **Step 1: Read the source material**

Read the source above so the registration steps, the key handling, and the helper names match the engine. Do not duplicate the key-rotation depth; this guide links it.

- [ ] **Step 2: Write the page**

Create `docs/guides/set-up-the-github-app.md` in the how-to format. Keep it lean.

- **Goal:** register and install a GitHub App so an editor's save commits to `main` as `cairn-cms[bot]`.
- **Prerequisites:** a GitHub repo for the site's content, owner access to create an App, and the site's Cloudflare Worker (links `./deploy-to-cloudflare.md`).
- **Steps (numbered, practical):** create the App (the permissions it needs: contents read/write on the content repo); generate and download the private key (GitHub issues PKCS#1); install the App on the content repo and record the installation ID; store the three credentials the Worker needs (App ID, installation ID, the base64 of the PEM as `GITHUB_APP_PRIVATE_KEY_B64`). For the key handling, link `../github-app-key-rotation.md` rather than restating the conversion. State that the Worker converts PKCS#1 to PKCS#8 in process because Web Crypto needs it.
- **Verify:** an editor save in `/admin` produces a commit authored by the editor and committed by `cairn-cms[bot]`. Point at `./configure-auth-and-d1.md` for the auth a save needs first.
- **See also:** `../reference/core.md` for `appJwt`/`installationToken`/`commitFile`, `../explanation/security-model.md` for the commit-trust reasoning, and `../github-app-key-rotation.md` for key rotation.

Confirm the helper names against `../reference/core.md` before linking specific anchors; if an anchor slug differs, link the page without the anchor rather than asserting a wrong one.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/set-up-the-github-app.md
f=docs/guides/set-up-the-github-app.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell. The only acceptable `DANGLING` lines are forward links to siblings not yet written in this phase (`./configure-auth-and-d1.md`, `./deploy-to-cloudflare.md`); they resolve once those tasks land. Every other link (the reference and explanation pages, `../github-app-key-rotation.md`) must resolve now. Cross-check the credentials model against `CLAUDE.md` and the helper names against `src/lib`.

- [ ] **Step 4: Log friction and commit**

Append any friction to `docs/internal/docs-friction-log.md` under `## Findings`. Then:

```bash
git add docs/guides/set-up-the-github-app.md docs/internal/docs-friction-log.md
git commit -m "Add the GitHub App setup guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If you added no friction entry, `git add docs/guides/set-up-the-github-app.md` alone.)

---

### Task 3: `configure-auth-and-d1.md` (lean)

**Page:** `docs/guides/configure-auth-and-d1.md`  **Model:** Sonnet (lean).

**Source material (read before writing):** `docs/admin-smoke-test.md` (the session model, the D1 session row, the local smoke), `src/lib` auth source (the D1 schema for sessions, magic tokens, and the editor allowlist; the owner/editor roles; the never-remove-the-last-owner rule), and the `CLAUDE.md` "Credentials" section (the `AUTH_DB` binding and the two real D1 database IDs as the example). Cross-link targets: `../reference/core.md`, `../explanation/security-model.md`, `../explanation/data-tiers.md`, `../admin-smoke-test.md`, `./set-up-the-github-app.md`, `./deploy-to-cloudflare.md`.

- [ ] **Step 1: Read the source material**

Read the source above so the D1 setup, the bindings, and the seed-the-first-owner step match the engine and the smoke doc.

- [ ] **Step 2: Write the page**

Create `docs/guides/configure-auth-and-d1.md` in the how-to format. Keep it lean.

- **Goal:** stand up the D1-backed magic-link auth store so an editor can log in by email.
- **Prerequisites:** a Cloudflare account with D1, the site Worker (links `./deploy-to-cloudflare.md`), and email sending configured. State in one line that the arbitrary-recipient product is the `env.EMAIL.send` object form.
- **Steps:** create the D1 database; bind it as `AUTH_DB` in `wrangler` config; apply the auth schema (the session, token, and editor tables); seed the first owner so the site is not locked out. Use the `AUTH_DB` binding name exactly. For the session model and a local smoke that mints a session by inserting a D1 row, link `../admin-smoke-test.md` rather than restating it.
- **Verify:** a magic-link login from `/admin` lands an authenticated session; the local smoke in `../admin-smoke-test.md` confirms the binding without the email loop.
- **See also:** `../reference/core.md` for the auth helpers, `../explanation/security-model.md` for the single-use-token and `__Host-` cookie design, and `../explanation/data-tiers.md` for why auth state lives in D1.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/configure-auth-and-d1.md
f=docs/guides/configure-auth-and-d1.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell. The only acceptable `DANGLING` line is the forward link `./deploy-to-cloudflare.md` (Task 7); `./set-up-the-github-app.md` exists now (Task 2). Cross-check the D1 schema and the `AUTH_DB` binding against `src/lib` and the smoke doc.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/guides/configure-auth-and-d1.md docs/internal/docs-friction-log.md
git commit -m "Add the auth and D1 setup guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/guides/configure-auth-and-d1.md` alone.)

---

### Task 4: `define-an-adapter-and-schema.md` (full)

**Page:** `docs/guides/define-an-adapter-and-schema.md`  **Model:** Opus (the worked example and the schema synthesis).

**Source material (read before writing):** `examples/showcase/src/lib/cairn.config.ts` (the real adapter: the concept set, the slug codec, the schema, the `render` method), `examples/showcase/src/lib/site.config.yaml` (the URL policy and nav the adapter pairs with), `docs/reference/core.md` sections `#### defineAdapter`, `#### defineFields`, and `### Adapter and schema`, and `docs/explanation/content-model.md` (fixed concepts, schema-as-truth). Cross-link targets: `../reference/core.md`, `../explanation/content-model.md`, `./configure-rendering.md`, `./wire-the-delivery-surface.md`.

- [ ] **Step 1: Read the source material**

Read `examples/showcase/src/lib/cairn.config.ts` so the worked example is the real showcase adapter, not an invented one. Read the two reference sections and the explanation page so the guide links them rather than restating.

- [ ] **Step 2: Write the page**

Create `docs/guides/define-an-adapter-and-schema.md` in the how-to format, with a worked example drawn from the showcase `cairn.config.ts`.

- **Goal:** define the adapter that tells cairn the site's concepts, how its slugs encode, and what fields each concept carries.
- **Prerequisites:** the package installed (`@glw907/cairn-cms`), and a sense of the site's content concepts (link `../explanation/content-model.md` for fixed concepts versus collections).
- **Steps:** create `src/lib/cairn.config.ts`; declare the concept set with `defineAdapter`; declare each concept's fields with `defineFields` (the one declaration that drives the editor form, the validator, and the inferred frontmatter type); set the slug codec and the per-concept `datePrefix`; implement the `render` method. Show the real showcase shape as the worked example. State that `defineFields` is the single source of truth, and link `../reference/core.md` for the exact signatures rather than reproducing them all.
- **Verify:** the showcase `cairn.config.ts` compiles and the `/admin` editor form renders the declared fields. Reference the showcase as the working example a reader can copy.
- **See also:** `../reference/core.md` for `defineAdapter`/`defineFields`/`defineRegistry`, `../explanation/content-model.md` for the model and the rejected `collections[]` alternative, `./configure-rendering.md` for the `render` method's pipeline, and `./wire-the-delivery-surface.md` for consuming the typed read model.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/define-an-adapter-and-schema.md
f=docs/guides/define-an-adapter-and-schema.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell. The only acceptable `DANGLING` lines are forward links `./configure-rendering.md` (Task 5) and `./wire-the-delivery-surface.md` (Task 6). Cross-check the worked example against `examples/showcase/src/lib/cairn.config.ts`; the export names (`defineAdapter`, `defineFields`) must match the real engine.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/guides/define-an-adapter-and-schema.md docs/internal/docs-friction-log.md
git commit -m "Add the adapter and schema guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/guides/define-an-adapter-and-schema.md` alone.)

---

### Task 5: `configure-rendering.md` (full)

**Page:** `docs/guides/configure-rendering.md`  **Model:** Opus (the render pipeline and the registry).

**Source material (read before writing):** `examples/showcase/src/lib/cairn.config.ts` (the `createRenderer` call and any component registry the showcase wires), `docs/reference/core.md` sections `#### createRenderer` and `### Render`, `docs/render-sanitize-floor.md` (the keep/strip/rewrite floor), and `docs/explanation/security-model.md` (the render-safety reasoning and the documented residual). Cross-link targets: `../reference/core.md`, `../explanation/security-model.md`, `../render-sanitize-floor.md`, `../explanation/content-model.md`, `./define-an-adapter-and-schema.md`.

- [ ] **Step 1: Read the source material**

Read the showcase renderer wiring and the reference render section so the worked example and the `createRenderer` options match the engine.

- [ ] **Step 2: Write the page**

Create `docs/guides/configure-rendering.md` in the how-to format.

- **Goal:** configure how author markdown becomes the HTML the site delivers.
- **Prerequisites:** an adapter with a `render` method (links `./define-an-adapter-and-schema.md`).
- **Steps:** call `createRenderer` (note it defaults to the empty registry, so a plain-prose blog needs no argument); register components if the site uses directive components; understand the sanitize floor is on by default and is extend-only; deliver the rendered HTML with `{@html}`. Show the showcase's real `createRenderer` usage. For the component `build(ctx)` contract and the directive grammar, give an overview and link `../reference/core.md`; do not reproduce the full grammar.
- **Verify:** the showcase renders a post body to HTML, and a component directive in a showcase post renders through the registry. Name the showcase post that proves it.
- **See also:** `../reference/core.md` for `createRenderer`/`defineRegistry`, `../explanation/security-model.md` for render safety and the documented attribute-sink residual, `../render-sanitize-floor.md` for the keep/strip/rewrite detail, and `../explanation/content-model.md` for where rendering sits in the content flow.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/configure-rendering.md
f=docs/guides/configure-rendering.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, and no `DANGLING` line (every cross-link target exists now: `./define-an-adapter-and-schema.md` landed in Task 4, the reference and explanation pages exist). Cross-check `createRenderer` and the registry usage against the showcase and `../reference/core.md`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/guides/configure-rendering.md docs/internal/docs-friction-log.md
git commit -m "Add the rendering configuration guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/guides/configure-rendering.md` alone.)

---

### Task 6: `wire-the-delivery-surface.md` (full)

**Page:** `docs/guides/wire-the-delivery-surface.md`  **Model:** Opus (the delivery wiring spans several files).

**Source material (read before writing):** `examples/showcase/src/lib/content.ts` (the `createSiteIndexes` content layer), `examples/showcase/src/routes/[...path]/+page.server.ts` and `+page.svelte` (the catch-all `byPermalink` route), `examples/showcase/src/routes/feed.xml/+server.ts`, `feed.json/+server.ts`, `sitemap.xml/+server.ts` (the feeds and sitemap), `examples/showcase/vite.config.ts` (the `cairnManifest()` plugin), `docs/reference/delivery.md`, `docs/reference/delivery-data.md`, `docs/reference/vite.md`, and `docs/explanation/content-model.md`. Cross-link targets: `../reference/delivery.md`, `../reference/delivery-data.md`, `../reference/vite.md`, `../explanation/content-model.md`, `./define-an-adapter-and-schema.md`.

- [ ] **Step 1: Read the source material**

Read the showcase content layer, the catch-all route, the feed servers, and the Vite config so the wiring steps match the real working surface.

- [ ] **Step 2: Write the page**

Create `docs/guides/wire-the-delivery-surface.md` in the how-to format.

- **Goal:** serve the content publicly: the typed read model, the permalink route, the feeds, and the build-time manifest wiring.
- **Prerequisites:** an adapter and a site config (links `./define-an-adapter-and-schema.md`).
- **Steps:** build the content layer with `createSiteIndexes` over the content globs (show the showcase `content.ts`); add the catch-all `[...path]` route that serves a page `byPermalink`; add the feeds and the sitemap from the delivery response helpers; wire the manifest with the `cairnManifest()` Vite plugin and the `cairn-manifest` regenerate script (note the build-time verify fails the build red on a stale manifest). Point a plain-Node import of a delivery data helper at `@glw907/cairn-cms/delivery/data`, not `/delivery`.
- **Verify:** the showcase production build exits 0, the prerendered home lists the post summaries, and a permalink resolves through the catch-all route. Name the showcase route files as the working reference.
- **See also:** `../reference/delivery.md` for the loaders and response helpers, `../reference/delivery-data.md` for the node-safe data barrel, `../reference/vite.md` for `cairnManifest`, and `../explanation/content-model.md` for the files-are-truth, manifest-is-projection model.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/wire-the-delivery-surface.md
f=docs/guides/wire-the-delivery-surface.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, and no `DANGLING` line (all targets exist now). Cross-check the wiring against the named showcase files; the entry subpaths (`/delivery`, `/delivery/data`, `/vite`) must match `package.json`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/guides/wire-the-delivery-surface.md docs/internal/docs-friction-log.md
git commit -m "Add the delivery surface guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/guides/wire-the-delivery-surface.md` alone.)

---

### Task 7: `deploy-to-cloudflare.md` (lean)

**Page:** `docs/guides/deploy-to-cloudflare.md`  **Model:** Sonnet (lean).

**Source material (read before writing):** `docs/admin-route-structure.md` (the `(app)` group, `/healthz` at the site root, the `$lib/cairn.server.ts` composer, preserving site hooks), the `CLAUDE.md` Cloudflare/Wrangler section (the deploy commands and the `CLOUDFLARE_API_TOKEN` model), and the showcase route shape for the admin and health endpoints (`examples/showcase/src/routes/healthz/+server.ts`, the `admin/(app)/` group). Cross-link targets: `../reference/sveltekit.md`, `../explanation/architecture.md`, `../admin-route-structure.md`, `./set-up-the-github-app.md`, `./configure-auth-and-d1.md`, `./wire-the-delivery-surface.md`.

- [ ] **Step 1: Read the source material**

Read the route-structure doc and the Wrangler section so the deploy steps and the route shape match the engine and the ops doc. Do not duplicate the route-structure depth; link it.

- [ ] **Step 2: Write the page**

Create `docs/guides/deploy-to-cloudflare.md` in the how-to format. Keep it lean.

- **Goal:** deploy the site Worker to Cloudflare so saves commit and the push redeploys (commit-is-publish).
- **Prerequisites:** the GitHub App (links `./set-up-the-github-app.md`), the auth store (links `./configure-auth-and-d1.md`), and the delivery surface (links `./wire-the-delivery-surface.md`).
- **Steps:** choose the SvelteKit Cloudflare adapter; set the bindings and secrets the Worker needs (`AUTH_DB`, the `EMAIL` send binding, the GitHub App credentials); add the canonical admin route shims and `/healthz` (link `../admin-route-structure.md` for the shape); deploy with `npx wrangler deploy`; confirm the push-triggered build redeploys. State the Workers Paid plus Email Sending onboarding requirement in one line.
- **Verify:** the deployed Worker serves the public site, `/admin` authenticates, and an editor save commits and triggers a redeploy.
- **See also:** `../reference/sveltekit.md` for the route factories, `../explanation/architecture.md` for the commit/publish flow, and `../admin-route-structure.md` for the canonical route shape.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/guides/deploy-to-cloudflare.md
f=docs/guides/deploy-to-cloudflare.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, and no `DANGLING` line (every sibling exists now: Tasks 2, 3, and 6 landed). Cross-check the route shape against `../admin-route-structure.md` and the deploy commands against `CLAUDE.md`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/guides/deploy-to-cloudflare.md docs/internal/docs-friction-log.md
git commit -m "Add the Cloudflare deploy guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/guides/deploy-to-cloudflare.md` alone.)

---

### Task 8: The guides index and the docs-index wiring

**Files:**
- Create: `docs/guides/README.md`
- Modify: `docs/README.md` (flip the How-to-guides line; repoint the relocated upgrade page)

**Model:** Sonnet.

- [ ] **Step 1: Write `docs/guides/README.md`**

Create it with this shape, one line per guide, grouped by the reading sequence, linking all seven:

```markdown
# How-to guides

Task-oriented guides for a returning adopter. Each answers one question and links the
[reference](../reference/README.md) for the exact surface and the
[explanation](../explanation/README.md) arm for the why.

## Set up the backend

- [Set up the GitHub App](./set-up-the-github-app.md): register and install the App so saves commit as `cairn-cms[bot]`.
- [Configure auth and D1](./configure-auth-and-d1.md): stand up the magic-link auth store on D1.
- [Deploy to Cloudflare](./deploy-to-cloudflare.md): the Worker, the bindings, and the commit-is-publish loop.

## Build the site

- [Define an adapter and schema](./define-an-adapter-and-schema.md): the concepts, the slug codec, and the fields.
- [Configure rendering](./configure-rendering.md): markdown to delivered HTML, the registry, and the sanitize floor.
- [Wire the delivery surface](./wire-the-delivery-surface.md): the read model, the permalink route, the feeds, and the manifest.

## Maintain

- [Upgrade cairn](./upgrade-cairn.md): the `0.x` rename list, oldest first.
```

- [ ] **Step 2: Flip the How-to-guides line and repoint the upgrade page in `docs/README.md`**

Read `docs/README.md` first to match the exact surrounding text. Replace the How-to-guides bullet, which currently reads approximately:

```markdown
- **How-to guides** answer task questions: setting up the GitHub App, configuring auth and D1,
  defining an adapter, configuring rendering, wiring delivery, deploying, and upgrading.
  Forthcoming. [`upgrading.md`](./upgrading.md) is the current upgrade guide until then.
```

with:

```markdown
- **How-to guides** answer task questions: setting up the GitHub App, configuring auth and D1,
  defining an adapter, configuring rendering, wiring delivery, deploying, and upgrading. See the
  [guides index](./guides/README.md).
```

Then, in the `## Current pages` list, repoint the Upgrading entry from the old path to the relocated guide. The line

```markdown
- [Upgrading cairn](./upgrading.md)
```

becomes

```markdown
- [Upgrade cairn](./guides/upgrade-cairn.md)
```

Leave the other Current-pages entries in place. If the exact wording differs from these snippets, preserve the surrounding structure and make the equivalent edit (flip the How-to-guides line to the guides index; repoint the upgrade link to `./guides/upgrade-cairn.md`).

- [ ] **Step 3: Verify the whole arm**

```bash
prose-guard docs/guides/README.md
prose-guard docs/README.md
for p in set-up-the-github-app configure-auth-and-d1 define-an-adapter-and-schema configure-rendering wire-the-delivery-surface deploy-to-cloudflare upgrade-cairn README; do test -f "docs/guides/$p.md" || echo "MISSING docs/guides/$p.md"; done
for f in docs/README.md docs/guides/*.md; do
  dir=$(dirname "$f")
  grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
done
echo "(no MISSING and no DANGLING line above means the arm is wired and resolves)"
```

Expected: no blocking tell on either README, no `MISSING` line, and no `DANGLING` line anywhere in the guides arm or the flipped `docs/README.md`. The old `upgrading.md` path no longer appears in `docs/README.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/guides/README.md docs/README.md
git commit -m "Add the guides index and flip the docs index

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task ordering

Link dependencies fix the order: **1, 2, 3, 4, 5, 6, 7, 8.** Task 1 relocates `upgrade-cairn.md` first so the index can link it. Tasks 2 through 7 are the six guides in the rough setup sequence (GitHub App, auth/D1, adapter/schema, rendering, delivery, deploy), so most cross-links point at an already-written sibling; a forward link to a not-yet-written sibling resolves once that task lands (the phase-end ritual confirms none dangle). Task 8 writes the index and flips the docs index, so it runs last.

## Phase-end ritual

After all tasks commit, before declaring the phase done:

- [ ] Confirm every guide and the index exist: `for p in set-up-the-github-app configure-auth-and-d1 define-an-adapter-and-schema configure-rendering wire-the-delivery-surface deploy-to-cloudflare upgrade-cairn README; do test -f "docs/guides/$p.md" || echo "MISSING $p"; done`.
- [ ] Run `prose-guard` across every authored page: `for f in docs/README.md docs/guides/*.md; do prose-guard "$f"; done`. No blocking tell on any (advisory lines are non-blocking).
- [ ] Confirm no dangling relative link across `docs/guides/*.md` and the flipped `docs/README.md` (the Task 8 Step 3 sweep).
- [ ] Confirm the old path is retired from the live public docs: `grep -rn "upgrading.md" docs/README.md` returns nothing (historical references under `docs/superpowers/` and `docs/STATUS.md` dated entries stay as records).
- [ ] Append any remaining design friction this phase surfaced to `docs/internal/docs-friction-log.md`.
- [ ] Update `docs/STATUS.md` to record Phase 4 landed and name Phase 5 (Tutorial) as the next action, per the `cairn-pass` ritual. Refresh the `cairn-docs-initiative` memory.
- [ ] Leave the tree clean.

## Self-review notes (already applied)

- The page gate is the docs gate (prose-guard, links, a manual accuracy cross-check), not the unit suite, because the arm changes no engine code and adds no test. This matches Phase 3's page-task gate.
- The lean/full split follows the brainstorm decision: the three backend-plumbing guides (Tasks 2, 3, 7) stay lean and link the authoritative ops doc, since `examples/showcase` runs `adapter-node` and cannot validate them and P4 will scaffold them. The three engine-surface guides (Tasks 4, 5, 6) carry a worked example validated against the showcase.
- The relocation leaves a transient dangling reference to `upgrading.md` in `docs/README.md` between Task 1 and Task 8. This is the within-phase pattern Phase 3 used; the phase-end grep confirms the old path is retired.
- The three lean guides run on Sonnet (goal, steps, links to the ops doc), the three full guides on Opus (the worked example and the synthesis), the relocate and the index on Sonnet.
- Every cross-link target is named per task, with the expected transient forward-dangles called out so the link check is unambiguous. By Task 7 every sibling exists, so Tasks 5, 6, 7, and 8 expect zero dangles.
- The arm publishes nothing and carries no version bump. The three release-gated engine candidates stay in `ROADMAP.md`, the friction log, and the project memory, separate from this docs phase.

---

## Post-mortem (executed 2026-06-04)

Phase 4 executed subagent-driven on `main`, one `cairn-implementer` per task, eight task commits
`f11b370..455b356` plus a STATUS commit `e21e475`. The three full engine-surface guides ran on Opus,
the three lean guides and the relocate and the index on Sonnet. Docs-only, so no version bump, no
publish, no review subagent, no `/admin` smoke.

**What was built.** Seven how-to guides under `docs/guides/` plus the arm index, and the docs-index
How-to-guides line flipped to point at the index. The lean guides (`set-up-the-github-app.md`,
`configure-auth-and-d1.md`, `deploy-to-cloudflare.md`) state goal, steps, and verify, then link the
authoritative ops docs, drawing their facts from the engine source and `CLAUDE.md`. The full guides
(`define-an-adapter-and-schema.md`, `configure-rendering.md`, `wire-the-delivery-surface.md`) carry a
worked example copied verbatim from the real showcase config, content, routes, and Vite plugin.
`upgrade-cairn.md` relocated from `docs/upgrading.md` with `git mv`, history preserved, no CHANGELOG
drift (the page's last heading `0.26.0` is the newest version, every recorded breaking change already
represented), no content edit.

**Gate evidence.** The page gate (the docs gate) ran per task and again at the phase end. `prose-guard`
shows no blocking tell on any of the eight authored files; advisory tells appear on two (`tricolon` on
`configure-rendering.md` and the index, `anaphora` on `define-an-adapter-and-schema.md` and the index),
all sweep-only and non-blocking. Every relative link across the arm and the flipped `docs/README.md`
resolves, with no dangling link at the phase end. `grep -n upgrading.md docs/README.md` is clean, so the
old path is retired from the live public docs (historical references under `docs/superpowers/` and dated
`docs/STATUS.md` entries stay as records). The transient forward-dangles the plan predicted (a guide
linking a sibling not yet written) all resolved once the later task landed, exactly as the task ordering
intended.

**Friction surfaced.** One finding, logged in `docs/internal/docs-friction-log.md`. Task 4's draft asked
for an adapter step setting the slug codec and per-concept `datePrefix`, but the real showcase adapter
carries neither: the URL policy and `datePrefix` live in the YAML site config, and the showcase YAML
carries only a menu, so the showcase relies on the concept defaults. The implementer wrote the step to
point at the YAML and the URL-identity explanation rather than invent adapter fields, keeping the worked
example true to the showcase. This corroborates the URL-spread finding already release-gated under the
surface-narrowing pass; it extends no backlog. No new engine candidate beyond the three release-gated
improvements.

**Decisions confirmed.** The three-tier evidence-base split (lean linking the ops docs, full validated
against the showcase, one relocate) held cleanly. Writing the full guides against the real showcase
caught the one place the plan draft drifted from the engine (the adapter slug/datePrefix step), which is
the value of validating a worked example against running code rather than against the plan.

**Next.** Phase 5 (Tutorial): brainstorm the open calls, write the plan, execute subagent-driven on
`main`. Then Phase 6 (process), then P4 (the scaffolder).
