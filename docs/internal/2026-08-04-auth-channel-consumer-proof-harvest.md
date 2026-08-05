# Harvest: the auth-channel consumer proof (pass 2)

Findings banked 2026-08-04, at the close of the pass that built the showcase `/members` fixture.
The pass's own post-mortem lives with the plan
([`../superpowers/plans/2026-08-04-auth-channel-consumer-proof.md`](../superpowers/plans/2026-08-04-auth-channel-consumer-proof.md));
this file holds what outlives it.

## 1. Engine-rendered markup depends on class names Tailwind may never emit (MECHANIC)

`src/lib/render/rehype-dispatch.ts` writes DaisyUI class names into runtime-generated HTML: a
section wrapper carries `card-body`, and a card head row carries `card-title`. The alert directive
emits `alert` and its variants. Tailwind scans source files. It never sees runtime-generated HTML,
so DaisyUI emits a component's base rules only when some **source** file happens to name the same
class.

The showcase chassis (`examples/showcase/src/chassis/tokens.css`) keeps the `card` and `alert`
families in its DaisyUI component set on purpose, and says why: the engine's directive "emits real
`card-body`/`card-title`/`alert` classes that prose.css only partially overrides, so the rest of a
theme's directive styling leans on their base declarations." Detection gating means that intent
does not hold. Those base declarations were absent from the built CSS, and `prose.css` was carrying
callout styling alone.

The failure is silent and acts at a distance. This pass added a members login page that used
`card-title` for its own heading. DaisyUI then emitted `.card-title { font-size: 1.125rem;
font-weight: 600; display: flex }`, every callout the site renders picked it up, a callout heading
wrapped onto a second line, and 26px of layout shifted down every page below it. Five visual specs
failed on pages the pass never touched.

**Why it is a mechanic, not a showcase quirk:** it recurs on any cairn site. A consuming site that
names `card-title` anywhere in its own markup silently restyles every callout in its content. A
site that never names it renders callouts without the base declarations its theme was written
against. Neither site chose either outcome.

**What this pass did:** the members pages use plain utilities, so the fixture is visually inert.
That is the conservative fix, not the resolution.

**The open question, for a deliberate design decision:** should the chassis safelist the classes
the engine emits, so a site's callout rendering stops depending on incidental source usage? The
branch's rendering is arguably the intended one and the current baseline the accident. Deciding it
changes the approved visual baseline, so it wants the visual-fidelity gate and Geoff's eyes rather
than a side effect of an unrelated pass.

**The detectable half belongs in `cairn-audit`:** a check that every class name the engine writes
into rendered HTML is either safelisted or independently styled. That is mechanically checkable,
and it is the kind of thing a consuming site should never have to rediscover.

## 2. A build-foldable gate does not survive a module boundary (MECHANIC)

`examples/showcase/src/chassis/dev-gate.ts` exported one constant and instructed every call site to
read it directly, "so the fold has one module boundary to survive, not two." One is one too many.
SvelteKit's SSR build folded the constant to `false` inside its own chunk and never propagated the
value across the boundary, so every consuming `if` and its dynamic `import()` survived. A real
`wrangler deploy --dry-run` of a default build carried the entire dev backend: the fake auth DB,
the fake R2 and Anthropic doubles, and the seed editor identity.

The code was unreachable behind the literal `false`, and the engine's 503 `dev_backend_in_prod`
tripwire still backstopped it, so nothing was exploitable. The bundle carried it anyway, and every
comment claiming otherwise was wrong.

**The fix that works:** a Vite `define`, substituted textually at each call site, so each branch
folds where it is written. Now in `examples/showcase/vite.config.ts`, documented in the dev
package's README as layer 1 of its fence, and taught in the tutorial.

**Consumer impact:** the published `@glw907/cairn-cms-dev` README taught the broken shape, so any
site that followed it ships its dev backend as dead code in the deployed Worker. The upgrade note
belongs in the changelog window whenever this releases.

## 3. A gate with no positive control rots silently

The dev-fold gate in `e2e.yml` and `scaffold.yml` grepped `.svelte-kit/cloudflare`. Under
adapter-cloudflare 7 that directory holds a loader, client assets, and prerendered HTML, and no
server code at all. The gate had been passing vacuously, including on builds with the dev backend
fully live, and its comment described an adapter that no longer exists.

Both gates now grep a `wrangler deploy --dry-run` bundle, the artifact Cloudflare actually
receives, and each carries a positive control asserting the markers ARE present in a deliberately
flagged build. A grep that can never match again now fails loudly.

**The general rule:** any gate whose passing condition is an absence needs a companion assertion
that it can still detect a presence. Absence gates decay into no-ops when the thing they inspect
moves, and nothing announces it.

## 4. A local visual run is only as canonical as its installed toolchain

The main checkout's `examples/showcase/node_modules` had drifted ahead of its committed lockfile
(tailwindcss 4.3.3 and daisyui 5.7.0 installed against a lockfile pinning 4.3.2 and 5.6.6), left by
a floating `npm install`. The drifted toolchain emitted a different `--font-sans` stack, which made
an early comparison between checkouts meaningless and briefly pointed the investigation at the
wrong cause.

The committed lockfile plus `npm ci` is what CI installs, so it is the only faithful local control.
Restoring it also required clearing a stale `.wrangler` state directory, which a newer workerd had
left in a shape the older one could not open (`table _cf_ALARM has 3 columns but 2 values were
supplied`).

**Practice:** before trusting any local visual result, confirm the installed toolchain matches the
lockfile. Before concluding a branch is innocent, run the control on a clean base rather than
reasoning from the diff.

## 5. "Pre-existing and unrelated" needs a control, not an isolation test

The Task 6 implementer reported five failing visual specs as pre-existing. Its evidence was that
removing its own new spec file left the failures unchanged, which proves only that its file was not
the cause. A control run on clean `main` passed all eleven. The branch was the cause, and the real
defect was finding 1 above.

**Practice:** the control for "did my work cause this" is the base branch, not the subtraction of
one file from the branch.
