# What cairn is

The canonical statement of cairn's purpose and boundary. `CLAUDE.md` carries the short version; this is
the fuller why. Read it before any change that adds an abstraction, a subsystem, an actor, or new surface.

## Purpose

cairn is a lean, opinionated CMS that makes a non-technical author productive editing raw markdown on a
SvelteKit + Cloudflare site, and publishes through a GitHub App. It serves a developer who wants a
content-managed site fast, then appends their own functionality to it. cairn is a starting framework and
an admin skeleton, not a platform: it does one job well and gets out of the way.

## What cairn commits to (the opinions, as choices)

- **SvelteKit + Cloudflare, fully.** A hard dependency on the stack is the point. Islands mount via
  Svelte's own `mount()`; the engine reaches for D1/R2/Workers directly. No framework- or host-agnostic
  layer. (The full stack list and the scaffold-copy site-template direction are in the
  `cairn-scope-opinionated-stack` memory.)
- **Content is markdown in git**, a fixed set of first-class concepts (Posts, Pages). No runtime content
  database; querying is build-time over a committed manifest.
- **A small default identity, owner/editor, on magic-link**, so a content site runs with zero config.
  Owner also manages the editor roster. Auth exists only to gate the admin.
- **An admin skeleton a developer extends**, built with DaisyUI + Tailwind (the idiom custom admin screens
  follow; see `admin-design-system.md`). Public output stays design-agnostic, each site brings its own
  `render`.

## The one boundary that governs everything

**cairn owns its core job, managing markdown content and the editor/admin frame, and little else.
Everything a site needs beyond that, its own functionality, actors, auth, data, and domain logic, belongs
to the developer, and cairn serves it with a thin seam, not a built-in feature.**

This single rule adjudicates any scope question without an enumerated denylist:

- **The defaults are floors, not ceilings.** Owner/editor and magic-link are the zero-config start. A
  developer can replace the admin auth with their own framework (cairn then mints no session and reads an
  owner/editor identity through a defined hand-off) and override the default authorization through a thin
  seam. cairn ships a sensible default and a clean way to replace it, never a configurable engine for the
  general case.
- **A site's domain is the site's.** Whatever a particular system needs, members, customers, assets,
  dues, a directory, is the developer's to build on cairn, in their own routes, data, and auth. cairn
  never names or models a domain actor; it only ever knows owner/editor.
- **Seam, not feature.** When a real extension need appears, the answer is the thinnest seam that lets the
  developer build it, plus an enforced, versioned public surface so their work survives engine updates.
  cairn provides the frame; the developer provides the functionality.
- **The contract is stable.** The seams form a narrow, versioned, enforced public surface across the
  kind-based export subpaths, held by a public-surface snapshot gate plus gated Extension-API/Scaffold-API
  stability tiers (not a single `./extend` subpath; see the 2026-06-28 developer-extensibility redesign
  design); cairn evolves its internals freely behind it, so a developer's work survives ordinary updates. A
  breaking change to that surface is a deliberate, signposted major-version event, not an everyday
  occurrence. Keeping the surface narrow is what keeps that promise cheap to honor, one more reason the
  answer to a new need is the thinnest seam.

## The failure mode this resists

Over-building: speculative generality, abstraction layers, and "a developer might want…" features that
aren't cairn's job. "Out of scope" and "we don't accommodate that universe" are valid, and usually
correct, answers. Add to the engine only when it demonstrably serves the core job, and prefer the leanest
seam over a general feature. A reviewer asked to find gaps will always find some; that is not license to
build them.

One lesson behind this doc: an extensibility effort once misread "let developers extend cairn" as "cairn
should own an identity and permissions substrate," and grew a principal model, scopes, trust tiers, and
member login in the engine before it was caught and reverted. The tell was that correctness and security
reviews all passed, each checking the design within the wrong premise. So the premise check, "is this
cairn's job, and is it the leanest form?", runs before the correctness checks, on every spec.

## How the boundary is held

Machine-checkable boundaries live in gates, not prose (`check:reference`, `check:package`, the dev-fence
e2e gate, the `check:surface` public-surface snapshot). This doc and the `CLAUDE.md` block carry the conceptual
boundary a gate can't, and are meant to be read first and honored.
