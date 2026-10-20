# Documentation Initiative Phase 5 Implementation Plan: the Tutorial arm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** write the learning-oriented arm of the docs, one tutorial page that carries a newcomer from an empty directory to a first working cairn site running locally, touching the full current feature set, then prove the page reproduces by building its target site from the steps.

**Architecture:** A single page, `docs/tutorial/build-your-first-cairn-site.md`, written across five sequential milestone-writing tasks plus a wiring task and a build-and-run reproduction task. The site it builds is small in content (two posts, one page) and wide in feature surface, mirroring `examples/showcase` at a smaller scale so the showcase is the answer key. Five tasks write the page in build order, one flips the docs index, and the last scaffolds the tutorial's target site in a throwaway directory and runs a real build to prove a newcomer who follows the page lands a working site. The arm changes no engine code, so the per-page gate is the docs gate, and the capstone adds a build-and-run reproduction on top.

**Tech Stack:** Markdown, `prose-guard` (the writing-voice gate), `git`, plus Node, npm, and Vite for the capstone reproduction.

**Design spec:** `docs/superpowers/specs/2026-06-04-cairn-docs-phase-5-tutorial-design.md`.

---

## Conventions for this plan

**The page gate, not the engine gate.** The writing tasks change no engine code, so each one's verification is the docs gate, three checks: `prose-guard <page>` shows no blocking tell, every relative link resolves to a real file, and every code block is cross-checked by hand against the corresponding `examples/showcase` file or pattern. Do not run `npm run check` or `npm test` for the writing tasks. The capstone task (Task 6) adds the build-and-run reproduction, which runs a real `vite build` against a throwaway site, and that is the only task that runs a build.

**prose-guard is tiered.** The blocking hook checks em dashes, banned phrases and openers, and structural patterns on the text being written. The advisory lines (passive, tricolon, burstiness, anaphora, soft tells) are sweep-only and non-blocking. The CLI `prose-guard <path>` exits 1 on any tell including advisory, so judge the gate by the absence of a blocking tell, not by the exit code. Draft clean on the first pass; do not chase the advisory lines.

**Prose.** All authored prose follows the writing-voice standard, so draft clean on the first pass. No em dashes in prose; end the sentence or use a colon, comma, or parentheses. One idea per sentence. No "not X but Y" frame, no reflexive three-item lists, no setup-colon payoff, no participial or connector openers. Vary sentence length and openings, and reread once for flat cadence before finishing. The tutorial voice is teach-once: second person, confidence-building, no troubleshooting digressions or alternative-path asides. The implementer carries the full banned-construction list in its own instructions.

**The link check.** To confirm the page's relative links resolve, run this from the repo root:

```bash
f=docs/tutorial/build-your-first-cairn-site.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do
  p="${t%%#*}"; [ -z "$p" ] && continue
  [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"
done; echo "(no DANGLING line above means every relative link resolves)"
```

Every cross-link target the page uses already exists (the Phase 2 reference pages, the Phase 3 explanation pages, the Phase 4 guides, and the named ops docs), so each writing task expects zero dangling links. The one exception is the docs-index flip in Task 7, which repoints `docs/README.md`.

**The tutorial format.** One page, milestone sections in build order under H2 headings, numbered or prose steps inside each milestone. Each milestone links the matching Phase 4 guide and the Phase 2 reference rather than reproducing signatures, and links the Phase 3 explanation arm for the why rather than re-explaining. The tutorial stays distinct from the Phase 4 guides: a guide answers one task for a reader who already has a site, while the tutorial is one continuous narrative for a newcomer building their first site.

**The locked running example.** Every task uses these exact names so the page stays coherent across implementers. Adapt the shapes from `examples/showcase`, do not invent API.

- Site name: `Field Notes`.
- Two fixed concepts, mirroring the showcase: `posts` (dir `src/content/posts`, dated, `datePrefix: 'day'` set in the YAML url policy) and `pages` (dir `src/content/pages`, non-dated).
- `posts` schema fields: `title` (text, required), `date` (date, required), `description` (textarea, feeds the summary and the SEO head). `summaryFields: ['description']`.
- `pages` schema fields: `title` (text, required), `description` (textarea).
- Content files: `src/content/posts/2026-05-01-first-trail.md` (title "First trail on the ridge"), `src/content/posts/2026-05-15-packing-list.md` (title "A weekend packing list"), and `src/content/pages/about.md` (title "About Field Notes"). The packing-list post links to the first-trail post with a `cairn:posts/2026-05-01-first-trail` token and carries the callout component.
- One custom component, `callout`, mirroring the showcase callout: `name: 'callout'`, a `tone` select attribute (`note`, `warning`), an `icon` attribute (`type: 'icon'`), a required inline `title` slot, and a markdown `body` slot. Include a one-glyph `IconSet` so the admin icon picker is exercised. Drop the showcase callout's repeatable `points` slot to keep the tutorial focused, and add a one-line pointer that the showcase callout also shows a repeatable slot.
- The dev-backend environment flag: `CAIRN_DEV_BACKEND=1`.
- The dev editor identity: email `you@example.com`, display name `You`, role `owner`.
- The published package the tutorial tells readers to install: `@glw907/cairn-cms` (latest, currently `0.26.0`).

**The dev-backend fencing rule.** The dev backend is a copy-paste fixture that bypasses authentication and fakes commits. Every place the tutorial introduces it must fence it loudly in prose: dev only, never set the flag in production, it installs an auth bypass and a fake GitHub. This mirrors the showcase's `SHOWCASE_FAKE_BACKEND` mechanism with the generic `CAIRN_DEV_BACKEND` name.

**Friction logging.** If writing a milestone surfaces design friction, append a short entry to `docs/internal/docs-friction-log.md` under `## Findings` (perspective `developer` or `editor`, the milestone that surfaced it, a short note). The known candidate is the missing first-class local admin dev mode the dev-backend fixture works around; log it once when Task 5 introduces the fixture. If a task surfaces none, skip the friction file for that task.

---

### Task 1: Page skeleton and milestones 0 through 3 (intro, create project, adapter and schema, content)

**Page:** `docs/tutorial/build-your-first-cairn-site.md` (create)  **Model:** Opus (establishes the page and locks the running example in prose).

This task creates the page, writes the top matter and the first four milestones, and locks the running example so later tasks match it.

**Source material (read before writing):**
- `examples/showcase/src/lib/cairn.config.ts` (the real adapter shape: `defineAdapter`, the `content` map, `defineFields`, `summaryFields`, `backend`, `sender`, `render`, `navMenu`, `registry`, `icons`).
- `examples/showcase/src/lib/site.config.yaml` (the url policy and the menu, where `datePrefix` lives).
- `examples/showcase/package.json` (the SvelteKit toolchain versions and the scripts a consumer carries).
- `examples/showcase/src/content/posts/2026-01-15-hello.md` and `src/content/pages/about.md` (the content file shape: frontmatter plus body).
- `docs/guides/define-an-adapter-and-schema.md` (the Phase 4 guide this milestone links).
- `docs/reference/core.md` sections `#### defineAdapter` and `#### defineFields`, and `docs/explanation/content-model.md`.

- [ ] **Step 1: Read the source material**

Read the source above so the adapter and schema in the worked example match the engine, and the content files match the real frontmatter shape.

- [ ] **Step 2: Write the page top matter and milestones 0 through 3**

Create `docs/tutorial/build-your-first-cairn-site.md` with:
- A title and a one-paragraph framing: this teaches a newcomer to build a first cairn site, called `Field Notes`, running locally, and it links the guides for production tasks and the reference for signatures.
- **Milestone 0, What you will build and prerequisites.** Describe the end state (a small blog with two posts and one page, custom components, internal links, feeds, and a working admin editor running locally). State prerequisites (Node, npm, a terminal, basic SvelteKit familiarity). Link `../explanation/architecture.md` and `../explanation/content-model.md` for the why. State plainly that the `create-cairn-site` scaffolder is forthcoming, so this tutorial wires the project by hand for now.
- **Milestone 1, Create the project.** A fresh SvelteKit app, then `npm install @glw907/cairn-cms`, then Tailwind and DaisyUI set up the way the showcase configures them. Show the real commands and the config the showcase carries.
- **Milestone 2, Define the adapter and schema.** Create `src/lib/cairn.config.ts` with `defineAdapter` and the locked `Field Notes` concepts and fields. Show the worked example. State that `defineFields` is the single source of truth for the editor form, the validator, and the inferred frontmatter type, and link `../reference/core.md` for the signatures and `../guides/define-an-adapter-and-schema.md` for the task guide. Note the slug codec and `datePrefix` live in the YAML url policy, set in milestone 6, not on the adapter.
- **Milestone 3, Add content.** Create the two posts and the one page as markdown files with the locked names and frontmatter. Keep bodies short. Do not yet add the internal link or the callout, since those land in milestones 4 and 5.

Each milestone links its Phase 4 guide and Phase 2 reference rather than restating signatures.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/tutorial/build-your-first-cairn-site.md
f=docs/tutorial/build-your-first-cairn-site.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, and no `DANGLING` line (every target exists now). Cross-check the adapter, the schema, and the content frontmatter against `examples/showcase`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/tutorial/build-your-first-cairn-site.md docs/internal/docs-friction-log.md
git commit -m "Add the tutorial: project setup, adapter, schema, content

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If you added no friction entry, `git add docs/tutorial/build-your-first-cairn-site.md` alone.)

---

### Task 2: Milestones 4 and 5 (configure rendering, add a custom component)

**Page:** `docs/tutorial/build-your-first-cairn-site.md` (modify)  **Model:** Opus (the render pipeline and the component synthesis).

**Source material (read before writing):**
- `examples/showcase/src/lib/cairn.config.ts` (the `createRenderer`/`defineRegistry` wiring and the `callout` component shape).
- `docs/reference/core.md` sections `#### createRenderer`, `#### defineRegistry`, and `#### Component-author helpers`, and `docs/render-sanitize-floor.md`.
- `docs/guides/configure-rendering.md` (the Phase 4 guide this milestone links).
- `docs/explanation/security-model.md` (render safety, for the sanitize-floor link).

- [ ] **Step 1: Read the source material**

Read the showcase renderer wiring and the callout so the worked example matches the engine.

- [ ] **Step 2: Write milestones 4 and 5**

Append to the page:
- **Milestone 4, Configure rendering.** Add `createRenderer` to the adapter's `render` method (note it defaults to the empty registry, so a plain-prose blog needs no registry argument, then explain that `Field Notes` adds one in the next milestone). State the sanitize floor is on by default and is extend-only. Show delivering rendered HTML with `{@html}`. Link `../reference/core.md#createrenderer`, `../render-sanitize-floor.md`, and `../guides/configure-rendering.md`.
- **Milestone 5, Add a custom component.** Build the locked `callout` component with `defineRegistry`, register it on the adapter, and author it in the packing-list post through the directive grammar. Include the one-glyph `IconSet` and the `icon` attribute so the admin icon picker has something to pick. Show the `build(ctx)` shape mirroring the showcase callout, and link `../reference/core.md#defineregistry` and `#### Component grammar and insertion` for the grammar rather than reproducing it. Add the one-line pointer that the showcase callout also demonstrates a repeatable slot.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/tutorial/build-your-first-cairn-site.md
f=docs/tutorial/build-your-first-cairn-site.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, no `DANGLING` line. Cross-check `createRenderer`, `defineRegistry`, and the callout `build` against `examples/showcase/src/lib/cairn.config.ts`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/tutorial/build-your-first-cairn-site.md docs/internal/docs-friction-log.md
git commit -m "Add the tutorial: rendering and a custom component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/tutorial/build-your-first-cairn-site.md` alone.)

---

### Task 3: Milestones 6 and 7 (wire the delivery surface, add the nav menu)

**Page:** `docs/tutorial/build-your-first-cairn-site.md` (modify)  **Model:** Opus (the delivery wiring spans several files).

**Source material (read before writing):**
- `examples/showcase/src/lib/content.ts` (the `createSiteIndexes` content layer).
- `examples/showcase/src/routes/[...path]/+page.server.ts` and `+page.svelte` (the permalink route), `src/routes/+page.server.ts` and `+page.svelte` (the home list), `src/routes/feed.xml/+server.ts`, `feed.json/+server.ts`, `sitemap.xml/+server.ts`, `robots.txt/+server.ts`.
- `examples/showcase/vite.config.ts` (the `cairnManifest()` plugin) and `examples/showcase/package.json` (the `cairn:manifest` script).
- `examples/showcase/src/lib/site.config.yaml` (the url policy with `datePrefix` and the menu).
- `docs/reference/delivery.md`, `docs/reference/delivery-data.md`, `docs/reference/vite.md`, `docs/reference/core.md` (`#### parseSiteConfig`, `#### extractMenu`, `#### validateNavTree`).
- `docs/guides/wire-the-delivery-surface.md` (the Phase 4 guide this milestone links).

- [ ] **Step 1: Read the source material**

Read the showcase content layer, the routes, the feeds, the Vite config, and the YAML so the wiring matches the real working surface.

- [ ] **Step 2: Write milestones 6 and 7**

Append to the page:
- **Milestone 6, Wire the delivery surface.** Build the content layer with `createSiteIndexes` (`src/lib/content.ts`), add the home list reading summaries and the concept stamp, add the `[...path]` catch-all that serves a page `byPermalink`, add the RSS and JSON feeds, the sitemap, and robots from the delivery response helpers, and wire the manifest with the `cairnManifest()` Vite plugin plus the `cairn:manifest` regenerate script. Set the YAML url policy here, including `datePrefix: 'day'` for posts, so the dated permalink and the page permalink differ. Note the build-time verify fails the build red on a stale manifest, and point a plain-Node import of a delivery data helper at `@glw907/cairn-cms/delivery/data`. Link `../reference/delivery.md`, `../reference/delivery-data.md`, `../reference/vite.md`, and `../guides/wire-the-delivery-surface.md`.
- **Milestone 7, Add the nav menu.** Add the `primary` menu to `src/lib/site.config.yaml` (home, the about page) and explain it is read at build time and edited through the admin nav tree, which milestone 8 exercises. Link `../reference/core.md` for `parseSiteConfig`/`extractMenu` and `../explanation/content-model.md` for the url-identity model.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/tutorial/build-your-first-cairn-site.md
f=docs/tutorial/build-your-first-cairn-site.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, no `DANGLING` line. Cross-check the wiring against the named showcase files; the entry subpaths (`/delivery`, `/delivery/data`, `/vite`) must match `package.json`.

- [ ] **Step 4: Log friction and commit**

```bash
git add docs/tutorial/build-your-first-cairn-site.md docs/internal/docs-friction-log.md
git commit -m "Add the tutorial: the delivery surface and the nav menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no friction entry, `git add docs/tutorial/build-your-first-cairn-site.md` alone.)

---

### Task 4: Milestones 8 and 9 (run the admin locally, the internal-link capstone)

**Page:** `docs/tutorial/build-your-first-cairn-site.md` (modify)  **Model:** Opus (the dev backend, the route shims, and the admin loop).

This is the heaviest writing task. It introduces the dev backend, wires the admin route shims, walks the full author loop, and confirms the internal link resolves.

**Source material (read before writing):**
- `examples/showcase/src/lib/fake-github.ts` (the fake-GitHub fetch double mechanism).
- `examples/showcase/src/hooks.server.ts` (the env-flag-gated fake-editor install).
- `examples/showcase/src/routes/admin/**` (every `+layout.server.ts`, `+page.server.ts`, and `+layout.svelte` shim, including the `(app)` group and the `mintToken: () => 'dev-token'` deps).
- `docs/admin-route-structure.md` (the `(app)` group, the `$lib/cairn.server.ts` composer, `/healthz`, preserving site hooks).
- `docs/reference/sveltekit.md` (`createContentRoutes`, `createAuthRoutes`, `createNavRoutes`, `createAuthGuard`, `healthLoad`) and `docs/reference/components.md` (`MarkdownEditor`, `ComponentInsertDialog`, `LinkPicker`, `IconPicker`).
- `docs/guides/configure-auth-and-d1.md` and `docs/guides/set-up-the-github-app.md` (the production backend this milestone hands off to).

- [ ] **Step 1: Read the source material**

Read the dev fixture, the hooks, the admin shims, and the route-structure doc so the dev backend and the admin wiring match the validated showcase.

- [ ] **Step 2: Write milestones 8 and 9**

Append to the page:
- **Milestone 8, Run the admin locally with the dev backend.** First, copy the dev-backend fixture as provided scaffolding: a fake-GitHub fetch double (`src/lib/dev-github.ts`, mirroring `fake-github.ts`) and a fake-editor `src/hooks.server.ts` gated by `CAIRN_DEV_BACKEND=1`, with the locked dev editor identity. Fence it loudly per the dev-backend fencing rule. Then wire the admin route shims (the `(app)` group, the `$lib/cairn.server.ts` composer, the layout/list/edit/nav shims) as labeled copy-paste blocks, each with a one-line explanation and a link to `../admin-route-structure.md`, passing `mintToken: () => 'dev-token'`. Add `/healthz` at the site root. Then walk the author loop: start `CAIRN_DEV_BACKEND=1 npm run dev`, open `/admin`, log in (bypassed), edit the packing-list post, insert the `callout` through the component dialog (and pick its icon), run the link-picker search to add the `cairn:` link to the first-trail post, save, and see the commit recorded by the dev GitHub. Hand off to `../guides/configure-auth-and-d1.md`, `../guides/set-up-the-github-app.md`, and `../guides/deploy-to-cloudflare.md` for the real backend, stating the deploy guide swaps in the real GitHub App and D1 auth and drops the flag.
- **Milestone 9, Confirm the internal link and regenerate the manifest.** Run `npm run cairn:manifest`, then load the packing-list post in the public site and confirm the `cairn:` link resolves to the first-trail permalink. Explain the manifest is the build-verified projection that keeps internal links rot-proof, and link `../reference/core.md` (`#### cairn: link helpers`) and `../explanation/content-model.md` (the content graph).

- [ ] **Step 3: Verify**

```bash
prose-guard docs/tutorial/build-your-first-cairn-site.md
f=docs/tutorial/build-your-first-cairn-site.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, no `DANGLING` line. Cross-check the dev fixture against `fake-github.ts` and `hooks.server.ts`, and the admin shims against `examples/showcase/src/routes/admin/**` and `../admin-route-structure.md`.

- [ ] **Step 4: Log friction and commit**

Log the missing-first-class-local-admin-dev-mode finding here if no prior task logged it.

```bash
git add docs/tutorial/build-your-first-cairn-site.md docs/internal/docs-friction-log.md
git commit -m "Add the tutorial: the local admin loop and internal links

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Milestone 10 (where to go next)

**Page:** `docs/tutorial/build-your-first-cairn-site.md` (modify)  **Model:** Sonnet (the closing pointers are mechanical).

- [ ] **Step 1: Write milestone 10**

Append the closing milestone:
- **Milestone 10, Where to go next.** Point the reader at the four backend and deploy guides to go live (`../guides/set-up-the-github-app.md`, `../guides/configure-auth-and-d1.md`, `../guides/wire-the-delivery-surface.md`, `../guides/deploy-to-cloudflare.md`), the explanation arm for the why (`../explanation/README.md`), and the reference for the full surface (`../reference/README.md`). Restate in one line that the dev backend is dev only and the deploy guides replace it. Keep it short.

- [ ] **Step 2: Verify**

```bash
prose-guard docs/tutorial/build-your-first-cairn-site.md
f=docs/tutorial/build-your-first-cairn-site.md; dir=$(dirname "$f")
grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
```

Expected: no blocking tell, no `DANGLING` line.

- [ ] **Step 3: Commit**

```bash
git add docs/tutorial/build-your-first-cairn-site.md
git commit -m "Add the tutorial: where to go next

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Build-and-run reproduction (the acceptance proof)

**Files:** none committed under the throwaway site; this task proves the page reproduces and records the evidence.  **Model:** Opus (judgment on toolchain and on any page correction the build forces).

This task follows the tutorial literally in a throwaway directory, builds the result, and drives the dev admin loop where practical. A step the build proves wrong is a page defect: fix the page, recommit the relevant milestone, and rerun.

- [ ] **Step 1: Scaffold the target site from the tutorial steps**

In a throwaway directory outside the repo (for example `/tmp/field-notes`), follow milestones 1 through 9 exactly as written: create the SvelteKit app, install `@glw907/cairn-cms` (the published `0.26.0`; if a step needs a fix only on `main`, fall back to a local `npm pack` tarball of this repo and record that the published package could not reproduce it), add the adapter, schema, content, renderer, component, delivery wiring, nav, the dev backend, and the admin shims. Do not commit the throwaway site.

- [ ] **Step 2: Run the build**

```bash
cd /tmp/field-notes
npm run cairn:manifest
npm run build
```

Expected: `npm run build` exits 0 and the home page prerenders with the two post summaries. Capture the result as evidence.

- [ ] **Step 3: Drive the dev admin loop where practical**

```bash
cd /tmp/field-notes
CAIRN_DEV_BACKEND=1 npm run dev
```

Open `/admin`, confirm the editor loads, insert the `callout`, run the link-picker search, save, and confirm the dev GitHub records the commit. If the interactive loop is impractical to fully drive headless, confirm the admin routes compile and serve, and record what was and was not exercised. Note that this is the one place the engine runs through a real build rather than a unit test.

- [ ] **Step 4: Fold any page corrections back**

If any step failed, fix the page so the steps reproduce, recommit the affected milestone with a clear message, and rerun steps 2 and 3 until the build is green. Record the corrections in the commit body.

- [ ] **Step 5: Record the reproduction evidence**

Append a short "Reproduction" note to `docs/internal/docs-friction-log.md` under `## Findings` (perspective `developer`, the tutorial, the build result and anything that did not reproduce) so the proof is durable. Then:

```bash
git add docs/internal/docs-friction-log.md
git commit -m "Record the tutorial build-and-run reproduction result

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Flip the docs index

**Files:** Modify `docs/README.md` (the Tutorial line and a Current-pages entry).  **Model:** Sonnet.

- [ ] **Step 1: Flip the Tutorial line and add the Current-pages entry**

Read `docs/README.md` first to match the surrounding text. Replace the Tutorial bullet, which currently reads approximately:

```markdown
- **Tutorial** teaches a first build end to end. Forthcoming in a later pass.
```

with:

```markdown
- **Tutorial** teaches a first build end to end. See [Build your first cairn site](./tutorial/build-your-first-cairn-site.md).
```

Then add a Current-pages entry for the tutorial, matching the list's existing shape:

```markdown
- [Build your first cairn site](./tutorial/build-your-first-cairn-site.md)
```

If the exact wording differs, preserve the surrounding structure and make the equivalent edit.

- [ ] **Step 2: Verify the whole arm**

```bash
prose-guard docs/README.md
prose-guard docs/tutorial/build-your-first-cairn-site.md
test -f docs/tutorial/build-your-first-cairn-site.md || echo "MISSING tutorial page"
for f in docs/README.md docs/tutorial/build-your-first-cairn-site.md; do
  dir=$(dirname "$f")
  grep -oE '\]\((\.{1,2}/[^)]+)\)' "$f" | sed -E 's/^\]\(//; s/\)$//' | while read -r t; do p="${t%%#*}"; [ -z "$p" ] && continue; [ -e "$dir/$p" ] || echo "DANGLING: $f -> $t"; done
done
echo "(no MISSING and no DANGLING line above means the arm is wired and resolves)"
```

Expected: no blocking tell on either file, no `MISSING` line, no `DANGLING` line, and the "Forthcoming" wording gone from the Tutorial line.

- [ ] **Step 3: Commit**

```bash
git add docs/README.md
git commit -m "Flip the docs index to the live tutorial

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task ordering

Build order fixes the sequence: **1, 2, 3, 4, 5, 6, 7.** Tasks 1 through 5 write the single page in milestone order, each extending the page the prior task wrote, so the page stays coherent and the running example carries forward. Task 6 reproduces the finished page by building its target site and folds any correction back into the page. Task 7 flips the docs index last, after the page is written and proven. The page links only targets that already exist, so every writing task expects zero dangling links; only Task 7 touches `docs/README.md`.

## Phase-end ritual

After all tasks commit, before declaring the phase done:

- [ ] Confirm the page exists: `test -f docs/tutorial/build-your-first-cairn-site.md || echo MISSING`.
- [ ] Run `prose-guard` on the page and `docs/README.md`. No blocking tell on either (advisory lines are non-blocking).
- [ ] Confirm no dangling relative link across the page and the flipped `docs/README.md` (the Task 7 Step 2 sweep).
- [ ] Confirm the docs index no longer says the tutorial is forthcoming: `grep -n "Forthcoming" docs/README.md` returns nothing for the Tutorial line.
- [ ] Confirm the build-and-run reproduction passed and its evidence is recorded in `docs/internal/docs-friction-log.md`.
- [ ] Append any remaining design friction this phase surfaced to `docs/internal/docs-friction-log.md`.
- [ ] Update `docs/STATUS.md` to record Phase 5 landed and name Phase 6 (the process phase) as the next action, per the `cairn-pass` ritual. Refresh the `cairn-docs-initiative` memory.
- [ ] Leave the tree clean (the throwaway site lives outside the repo and is not committed).

## Self-review notes (already applied)

- The page gate is the docs gate (prose-guard, links, a manual accuracy cross-check against `examples/showcase`), not the unit suite, for the five writing tasks, matching Phases 3 and 4. The capstone adds the build-and-run reproduction the spec chose, the one task that runs a real build.
- The running example is locked in the Conventions section, so the five sequential writing tasks keep one page coherent (the site name, the concepts and fields, the content files, the callout shape, the dev flag, and the dev editor identity all match across tasks).
- The dev-backend fixture is fenced loudly everywhere it appears, mirroring the showcase's `SHOWCASE_FAKE_BACKEND` mechanism, and the missing first-class local admin dev mode is logged once as friction for P4.
- Every cross-link target exists before the page links it (the Phase 2 reference, the Phase 3 explanation, the Phase 4 guides, the named ops docs), so the writing tasks expect zero dangling links; only Task 7 repoints `docs/README.md`.
- The three release-gated engine improvements stay in `ROADMAP.md`, the friction log, and the project memory, separate from this docs phase. The arm publishes nothing and carries no version bump.
- The four full-synthesis writing tasks run on Opus, the closing-pointers task and the docs-index flip on Sonnet, the reproduction on Opus.

---

## Post-mortem (executed 2026-06-04)

Phase 5 landed on `main` in ten commits, `b46bbeb..cd64cff`. It ran subagent-driven, one `cairn-implementer` per task: Tasks 1, 2, 3, 4, and 6 on Opus, Tasks 5 and 7 on Sonnet, matching the plan's model assignment. The single page `docs/tutorial/build-your-first-cairn-site.md` now carries milestones 0 through 10, and `docs/README.md` points at it as the live tutorial.

**What was built.** The page teaches a newcomer to build `Field Notes` from an empty directory to a working local site, in build order: create the project, define the adapter and schema, add content, configure rendering, add the `callout` component, wire the delivery surface, add the nav menu, run the admin locally through the fenced `CAIRN_DEV_BACKEND` fixture, confirm the rot-proof `cairn:` internal link, and where to go next. The running example stayed coherent across the five sequential writing tasks because the Conventions section locked every name. Two friction entries were logged: the missing first-class local admin dev mode (Task 4, the candidate the dev-backend fixture works around) and the reproduction note (Task 6).

**What was verified.** The docs gate ran per writing task and again at phase end: no blocking prose tell on the page or the flipped index, every relative link resolves, and each worked example was cross-checked by hand against `examples/showcase`. No `npm run check`, `npm test`, review subagent, or `/admin` smoke applied, since the arm changes no engine code. The capstone (Task 6) is the proof that matters: it followed the finished page literally in a throwaway `/tmp/field-notes` on the published `@glw907/cairn-cms@0.26.0` with no `main` tarball fallback, and `npm run cairn:manifest` plus `npm run build` exit 0, the home prerenders both post summaries, the packing-list page renders the callout and the resolved internal link `/2026/05/01/first-trail`, and `npm run check` is 0/0. The admin loop was driven headless: `/healthz`, the posts list, the editor, and the nav editor all serve, and a save commits through the dev GitHub.

**Corrections the build forced.** The reproduction was not a rubber stamp. It folded back real page defects as commit `1eef926` so a newcomer actually succeeds: the composer's `mintToken` had to be `async` (the signature returns `Promise<string>`), the dev-GitHub fixture had to grow to answer the Git Data API atomic-commit path because the save commits through `commitFiles`, and several project-setup pieces a registry consumer needs but the symlinked showcase hides had to be added (`@types/node`, the `App.Locals.editor` declaration, deleting the SvelteKit skeleton's default `static/robots.txt`, and a `prerender.handleHttpError: 'warn'` policy for the uncrawled feed and robots routes). One cross-task forward-reference was fixed earlier as `2cb0fed` (milestone 3 pointed the internal link at milestone 4; it lands in milestone 8 through the link picker).

**Finding escalated beyond the docs phase.** The reproduction surfaced that `examples/showcase/src/lib/fake-github.ts` is stale: it answers only single-file `PUT /contents`, but the engine's content save commits through the atomic `commitFiles` Git Data API (`POST git/trees`, `POST git/commits`, `PATCH git/refs/heads`). The showcase golden-path E2E (`examples/showcase/e2e/golden-path.spec.ts`) drives a real save and asserts on `/test/last-commit`, so it would not be answered by the current double. Playwright E2E is not part of `npm test`, which is how the gap stayed masked. This is an engine-adjacent showcase concern, separate from the docs arm, logged as a backlog issue and carried in STATUS for a follow-up that runs the E2E and updates the double if confirmed.

**Carry-forwards.** All friction this phase points at the P4 scaffolder: emit the project-setup pieces and a working, fenced local dev backend so a newcomer never pastes a fixture the engine's commit path has since outgrown. The three release-gated engine improvements (surface-narrowing, render attribute-sink hardening, URL-model consolidation) stand unchanged. The next docs phase is Phase 6, the process phase that bakes docs into the pass ritual, the last phase of the documentation initiative.
