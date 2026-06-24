# create-cairn-site scaffolder (v1) design

The scaffolder is cairn's on-ramp: the initializer a developer runs to stand up a new cairn site. This
spec designs it, the deployable reference template it emits, and the dev-only package both depend on. It
supersedes the scaffolder sketch in the functional spec
([`2026-05-28-cairn-rebuild-functional-spec.md`](2026-05-28-cairn-rebuild-functional-spec.md) §3, §5,
scenarios 22-25) where the two differ, and it records the design after a four-lens adversarial review
grounded in the prior art of `create-svelte`, `create-vite`, `create-t3-app`, `create-cloudflare`,
Decap, Astro Starlight, and shadcn/ui.

## Positioning

The scaffolder is for a SvelteKit/Cloudflare developer standing up a new site, not the non-technical
editor (who never runs it). It is a co-equal product goal: standing up a cairn site should be as easy as
possible, and the architecture is shaped around scaffolding and a clean template contract, not as an
afterthought. The template it emits is the product's front door: the first code a developer reads and the
design they build their site on. So the bar is not "it compiles," it is "a developer and a designer both
want to start from this."

## Inherited locked decisions

These predate this review and stand:

- Invocation is `npm create @glw907/cairn-site` (the scoped create-package `@glw907/create-cairn-site`).
  cairn ships its own generator because `sv create` has no custom-template support.
- **Scaffold-copy:** the generator copies a template into a new repo; the new site owns its files and
  diverges freely; template updates do not propagate. The engine `@glw907/cairn-cms` stays the live
  versioned dependency that does propagate fixes.
- **Engine-fat / site-thin (hard rule):** nothing security-relevant or fix-prone lives in the copied
  layer. The site owns design tokens, the component-registry data, CSS, and thin route shims.
- **Template contract:** every template carries identical machinery and differs only in the adapter, the
  DaisyUI theme and fonts, the component registry, and the preview renderer. The contract matches the JS
  ecosystem norm (in-monorepo templates, no template engine, accepted drift with the framework dependency
  as the fix channel).
- Acceptance scenarios #22-25 (lists and scaffolds a template; the scaffolded site passes `svelte-check`
  and `vite build` with no edits beyond provisioning values; the admin shims match the contract;
  `publint` and `@arethetypeswrong/cli` pass).

## What the adversarial review changed

Four web-grounded critics (templating and maintenance, the dev backend, provisioning and scope, and a
red-team) reviewed the first design. Three reversals and a set of secondary corrections came out of it.

### Reversal 1: the dev backend ships as a separate package, not inside the engine

The first design shipped the local-dev fake-GitHub double and auth bypass inside `@glw907/cairn-cms`
behind a runtime "looks local" gate. That is CWE-489 (active debug code in a shipped package), and the
gate fails open on ordinary misconfigurations: an `http` origin is not a "local" signal on this stack
(SvelteKit's `adapter-node`, which the showcase uses, routinely runs behind a TLS-terminating proxy that
presents `http`; Cloudflare Flexible SSL does too), and "no GitHub App bindings" is satisfied by a
half-provisioned real deploy, so a botched launch yields a public admin with no auth. "Tree-shaken out"
is also false: a runtime-chosen dynamic import is opaque to tree-shaking, and the bypass would sit in
`node_modules` and every SBOM regardless.

The fix is the Decap model (the closest prior art, a git CMS whose local backend is a separate
`decap-server` package): a separate dev-only package, consumed as a `devDependency`. It keeps the entire
UX win (one blessed implementation, no hand-pasted fixtures), is more engine-fat/site-thin compliant (a
propagating package, not the copied layer), and makes the fence structural and fail-closed (a
`devDependency` is absent under `npm ci --omit=dev`, so the import throws in production instead of
bypassing).

### Reversal 2: promote the showcase to the deployable reference, do not build a second template

The first design built a new deployable template from scratch, on the premise that the showcase is a
test harness that cannot be reused. Repo inspection disproved the premise: the showcase already ships the
full public delivery surface (a `(site)` group, `feed.json`, `feed.xml`, `sitemap.xml`, `robots.txt`,
the `/media` route, real content), and the "missing" Cloudflare config already exists in the repo
(`migrations/0000_auth.sql`, `wrangler.test.jsonc`). Building a second artifact is the textbook
two-sources-of-truth hazard, and the inert copy (built by nothing on a normal CI run) is the one that
rots, with a documented body count across t3, Next, and Gatsby.

The fix is the "one artifact is example and template" pattern (Next's `examples/`, Astro's
examples-as-templates with `preferWorkspacePackages`): make the showcase the single deployable reference
and emit from it. The "promoting it ships the fakes" objection dissolves once Reversal 1 lands, because
the fakes then live in the dev package, not the showcase's committed source. The work is to factor the
showcase into a deployable core (real `adapter-cloudflare` and `wrangler.jsonc` from the existing
`.test.jsonc` shape, `app.css`, the dev backend imported from the dev package, the `test`/`spike`/demo
routes separated), dual-resolve it (`file:../..` in-repo, an npm range for a scaffolded user), and have
**CI build the scaffolded output on every commit** — the gate that prevents rot.

### Reversal 3: token-substitute scalars only; ship the rich config as owned files

The first design listed the concepts/field schema, the component registry, and the render function as
prompted, substituted variables. Those are executable TypeScript (the showcase adapter is 143 lines of
`h()` calls, SVG path data, and function bodies), and no scaffolder token-substitutes code; the closest
analog (`create-t3-app`) swaps whole files and patches only `package.json`. The fix is to ship the
adapter, registry, and render function as hand-editable starter files the new site owns (the scaffold-copy
model's whole point), and token-substitute only the ~10 scalars. The prompt set drops to a median of 4-5
answers.

### Secondary corrections (folded in)

- **Provisioning is local-first, then a doctor-verified checklist.** Emit-only stays the v1 boundary, but
  reframed: the generated output celebrates the zero-cloud local run first (`npm create` to a working
  `/admin` with no account), then a "when you are ready to go live" checklist that ends in
  `npx cairn-doctor` so the checklist is verified, not just printed. Lean on wrangler's auto-provisioning
  (ID-less bindings that `wrangler deploy` creates and writes back) to delete the error-prone
  `d1 create`/paste-id line. Classify each remaining step (auto-provisioned, automatable in v2,
  verify-with-doctor, permanently manual).
- **Ship a version stamp in v1** (a `cairn` key or `.cairn/scaffold.json` recording the create-package,
  template, and engine versions). One write, and the enabling primitive for any future upgrade path.
- **Substitute by parsing the format, not regex** (`package.json` via parse/mutate, the SQL seed and
  dotenv built programmatically with escaping, `wrangler.jsonc` placeholders valid by construction). Ship
  template dotfiles as `_gitignore` and rename on copy, or `npm pack` strips them.
- **Validators per prompt** (`@clack/prompts` `validate`): a GitHub-grammar repo owner/name, an origin
  normalized and scheme-required (security-load-bearing for the magic-link origin check), an
  RFC-shaped sender. Detect the package manager from `npm_config_user_agent` and tailor the next-steps
  output. Refuse a non-empty target.

## A standing dimension: this exercise audits the engine, DX, and docs

Building the scaffolder is the most thorough audit cairn gets, because it forces every step of standing
up a site into the open. Across all three parts, the work is dogfooded from two seats: the developer's
first hour (clone, run, customize, deploy) and the editor's first ten minutes (sign in through the dev
backend, write and publish a first post). Those walkthroughs do double duty: they confirm the template is
a useful starting point, and they surface engine rough edges, DX debt, and gaps in the developer-docs
outline. Every finding is triaged each pass into [`docs/internal/docs-friction-log.md`](../../internal/docs-friction-log.md),
[`ROADMAP.md`](../../../ROADMAP.md), and the parked docs-rewrite outline
([`2026-06-23-docs-rewrite-content-outline.md`](2026-06-23-docs-rewrite-content-outline.md)), fixed inline
only when trivial or template-level, and otherwise scheduled as a later pass. The review already seeded
this list (the `AuthEnv` root re-export, the `wrangler.jsonc`-vs-`.toml` doc inconsistency, the
`resolveMedia` plumbing, the orphaned rotate-key guide, the stale tutorial pin); it grows as the work
proceeds.

## Decomposition: three parts

The initiative is too large for one plan. It splits into three parts, each its own just-in-time plan,
sequenced by dependency.

**Sequencing and the pre-Part-B DX slot.** The parts run A, then B, then C. Part A is independent of the
engine's remaining DX warts, so it proceeds first. The template is a propagating, frozen artifact: a
workaround baked into it ships to every scaffolded site and never updates, far more costly than the same
wart in one hand-built site. So a small, targeted DX fix-up lands immediately before Part B for the known
issues the template would otherwise paper over: the `AuthEnv` root re-export (so the generated `app.d.ts`
imports cleanly), the `media.json` graceful-degrade (so the template ships no seed-an-empty-file
workaround), and the `runtime.publicMediaResolver` ergonomic (so the template wires the resolver once, not
three times; the last is sharpened by the first dogfood, so it can fall at the front of Part B). This is
the residue of the original "pre-scaffold DX before the scaffolder" decision; most of that cleanup landed
before 0.62.2, so what remains is small. Everything else batches later: the `csrf.checkOrigin`
deprecation is kit's to fix (kit#15992), the docs-outline items ride the docs rewrite, and the dogfood
walkthroughs surface more engine DX that Part B fixes as it proceeds. The principle is fix-before-bake for
the few the template emits, batch-later for the rest.

### Part A: `@glw907/cairn-cms-dev` (the dev backend)

A new dev-only workspace package. It extracts the blessed fake-GitHub double and the magic-link auth
bypass out of the engine and the showcase into one tested implementation, consumed as a `devDependency`
by the showcase, the template, and the tutorial. Fencing:

- The activation gate is SvelteKit's build-foldable `dev` from `$app/environment` AND an explicit
  `CAIRN_DEV_BACKEND=1` opt-in. The `http`-origin and binding-sniffing heuristics are deleted.
- The real auth path gains a fail-closed tripwire: it refuses to boot and logs `guard.rejected` with
  reason `dev_backend_in_prod` if the dev backend is requested in a `dev === false` build.
- The auth bypass is held to a stricter tier than the fake-GitHub mock: the mock degrades to "saves do
  not persist," the bypass is an authentication breach, so they are documented and gated as distinct
  risk tiers.

Part A lands first, on its own, with the `web-auth-security-reviewer` gate, because everything downstream
depends on it and it is the one security-sensitive change.

### Part B: the deployable `cairn-starter` template

The design-led heart. It factors the showcase into the single deployable reference (Reversal 2) and
makes it a front door worth starting from.

**The factoring.** Real `adapter-cloudflare` and `wrangler.jsonc` (from the `.test.jsonc` shape),
`app.css`, the dev backend imported from Part A's package, the `test`/`spike`/demo routes separated from
the emitted set, dual-resolution, and CI that builds the scaffolded output every commit.

**The design pass.** The broader look and every high-impact page get a `frontend-design` pass, run
through the repo's mockup-first methodology (deficiency research from the ecxc and 907 hand-migrations and
the friction log, then mockups, adversarial critique, rev.2). The high-impact pages: home, the article
(the prose showcase), the news archive, search, tag pages, the contact page, the 404, and the editor's
first-run empty state. DaisyUI and Tailwind carry the chrome and the theme system, led by editorial
typography so the reading surface reads as intentional design, not a component demo. The public theme is
the designer's own re-skin surface, structurally separate from the admin's Warm Stone.

**The tokens/theme layer is a first-class deliverable.** It is the public-side analog of the admin design
system, held to the highest polish: a coherent color system (gamut-safe oklch, AA contrast, dark mode), a
real modular type scale, a spacing rhythm, all centralized as documented tokens with a re-skin recipe
("change your brand in these N lines") and inline token docs. Whether cairn sites are easy to make
beautiful is decided here, so it earns its own quality bar and acceptance criteria.

This layer gets its own adversarial review, run separately from the visual-design critique and after it,
because the two ask different questions. The visual critique asks whether the design is good; the token
review asks whether a developer who never saw it can re-skin and extend it from the organization and the
documentation alone. It is skeptical by default about the things that fail developers on a re-skin: tokens
that are named by appearance instead of role, a value hard-coded in a component that should have read a
token, an undocumented token, a dark-mode variant that drifts from its light pair, a re-skin recipe that
misses a step, and any place the token set leaks into markup. A polished design on a tangled or
under-documented token layer still fails the developer, so this review is a gate in its own right.

**The component model follows shadcn's "you own it."** The public components are tasteful,
well-documented, site-owned files built on cairn primitives and DaisyUI, that a developer extends or
replaces rather than a black-box dependency they fight. This is exactly what scaffold-copy enables. The
directive registry (callout and friends) is shown cleanly so the render-component pattern is legible end
to end.

**The feature set.** Defaults, always present: posts and pages, a paginated news archive (on the delivery
layer's archive and feed loaders), Pagefind search behind a site-owned `CairnSearch` component, tag/topic
pages, a full SEO kit (Open Graph, Twitter cards, Article JSON-LD, canonical, a default social-share
image, favicon and web-manifest and icons), a styled 404, and real sample content (several posts and two
or three pages, one a privacy/legal stub) so the archive, tags, and search demo against real data. The
a11y floor (skip link, landmarks, focus management, dark-ready markup) is baked in. Plus four selected
options: a contact form that emails the owner via the `EMAIL` binding (the same one magic links use),
spam-protected with free Cloudflare Turnstile; Cloudflare Web Analytics (privacy-friendly, one snippet);
media on by default (a hero image and an inline figure, working locally through the dev backend's fake R2
and turning on R2 in the checklist); and a public dark-mode toggle.

**Confirm it is a useful starting point.** Beyond #22-25, the template is held to concrete criteria: the
local-first run reaches a styled public page and a working `/admin` with zero cloud in a documented small
number of commands; each customization point (site name, concepts, design tokens, components) is a single
labeled file with a doc comment a non-cairn-expert can follow; the default public design passes WCAG AA
and a taste critique; the tokens layer re-skins to a new brand by editing only the documented token set;
and the editor's empty state guides the first post. The a11y/taste/DX review gate runs against these
before it ships.

### Part C: `@glw907/create-cairn-site` (the generator)

`npm create @glw907/cairn-site` prompts for the ~10 scalars (sensible defaults, validated), copies the
template (with the `_`-prefixed dotfile renames and the `test`/`spike`/demo routes excluded), substitutes
by parsing each file format, writes the migration and the version stamp, seeds the starter content, and
prints the local-first next steps followed by the doctor-verified provisioning checklist. It runs nothing
against the cloud. The adapter, registry, and render function arrive as owned files, not prompts.

## Testing

- **Part A:** unit tests for the dev backend (the fake-GitHub behaviors, the seeding API), a test that
  the activation gate is closed in a `dev === false` build, and the `web-auth-security-reviewer` gate.
- **Part B:** CI builds the template in place (proves the committed source compiles) and builds the
  **scaffolded output** (proves substitution did not break it), across a small matrix over the
  high-variance switches (media on/off, the optional features). The showcase e2e continues to run through
  the dev backend. The a11y/taste/DX review and the dogfood walkthroughs are gates.
- **Part C:** a test scaffolds into a temp dir with fixture answers, then runs `svelte-check` and
  `vite build` on the output; unit tests cover the per-format substitution, the dotfile renames, the
  validators, and the checklist generation. `publint`/`attw` target the create-package itself.

## Deferred to v2 (recorded, not lost)

The two live-site designs as second and third templates; re-runnable additive updates and drift tooling
(the version stamp ships now to enable them); a `cairn add` sibling for extension route shims; runtime
concept CRUD; automated provisioning, with the **GitHub App manifest flow named as the first target**
(it makes the single scariest manual step automatable); and Cloudflare-native search as an opt-in a site
can add.

## Review gates

`web-auth-security-reviewer` (Part A, mandatory). Part B runs two distinct design reviews: a
**visual-design critique** of the broader look and the high-impact pages (taste, the frontend-design
direction), and, separately and after it, the **tokens/theme-layer adversarial review** of organization,
documentation, and re-skin ergonomics described above. Plus `svelte-reviewer` and `daisyui-a11y-reviewer`
(the components and the a11y floor), `cloudflare-workers-reviewer` (the contact-form action, the bindings,
the wrangler config), `/code-review`, and the developer-and-editor dogfood walkthroughs. The prose-voice
and reference gates apply to the docs each part touches.
