# aksailingclub.org phase 1: the gentle redesign onto cairn

**DRAFT — the brainstorm is still open; nothing here is ratified.** A working synthesis of
the conversation so far, revised as it continues.

Drafted during the 2026-07-06 brainstorm (Geoff + the main loop; the Fable-native format).
The highest bar of the ladder: a real member base. The full visual-fidelity method binds.

## What this is

The club's public site rebuilt on cairn (`@glw907/cairn-cms` >= 0.81.0, the chassis
structure), preserving what works — the palette, fonts, iconography, information
architecture, and basic layout — while fixing the four named issues: complex CSS, busy
pages, uneven responsiveness, and heavy card use. Phase 2 (the functional member pages and
the admin/members migration on the extending-developer seam) and phase 3 (the handbook on
Topo) are scoped here only as boundaries.

## Locked decisions

- **Fresh start; mine the prior work.** A new repo scaffolds from the chassis. The prior
  SvelteKit migration (`aksailingclub-sveltekit`: the dev shell, the D1 members database,
  the handbook work) is an evidence base for phase 2, not a foundation to build on.
- **Phase-1 content line: guides in, functional out.** Every static member guide migrates
  as cairn content; the directory, my-account, and anything data/auth-driven waits for
  phase 2 behind a small "coming soon" surface.
- **Concepts: posts, pages, notifications.** Posts carry news, results, and recaps with a
  curated tag vocabulary. Pages hold the stable content. Notifications are a site-declared
  concept (title, short body, expiry) rendering as the home banner.
- **Events are D1 data, not content.** The public calendar reads the club's D1 as a
  site-owned route beside cairn (the charter's build-outside mode). Event administration
  stays in the existing ops stack until phase 2. The schema is verified from the prior
  migration's `db/` at plan time.
- **Editors: Geoff as owner plus a short volunteer allowlist**, magic-link. The admin
  experience is their whole interface and gets polish attention.

## The design language: a content-density system

Cards are refined, not removed (Geoff: "cards aren't inherently a problem"):

- **Subtler:** lighter chrome — reduced border/shadow/radius stacking, no cards inside
  cards, quieter surfaces.
- **Selective:** cards where they earn their place — true objects (the news cards, which
  work well and stay essentially as-is; event rows; notifications) and deliberate rhythm
  breaks in long content.
- **The wall of text is the significant enemy.** This is a content-heavy site; long pages
  (education, guides, governance) get an explicit density strategy: section bands, asides
  and glosses, callouts, two-up groupings, and in-page TOCs on the longest pages — the
  component vocabulary the ecxc training page proves, tuned to ASC's voice.
- **The UI/UX work session (a first-class phase-1 stage, between the device catalogue and
  any build):** two sittings with Geoff. (1) THE SHOW-AND-TELL: curated exhibits from the
  scroll-primed captures — the news cards at their best, the chrome-stacking at its
  heaviest, the education page's full height, the responsive rough spots — so the
  diagnosis is agreed over evidence. (2) THE CALIBRATION: candidates across three page
  archetypes (home with refined cards; one long content page with the density toolkit at
  two or three intensities; one post), rendered as scrollable artifacts; Geoff's picks
  become the locked design recipes the build executes. The session's outputs ARE the
  theme's specification; everything after is implementation.

Responsiveness meets the family five-viewport standard (320/390/768/1440/2560, composed at
the extremes). The CSS complexity collapses into the chassis token system and composition
primitives; the theme layer carries ASC's palette, faces, and iconography.

## Method, staging, cutover

- The device catalogue from the 146 live-site captures precedes any build (the
  visual-fidelity method end to end: reference-first, fresh-context verifier loops,
  the one-check rule, the pixel-diff CI rider, the chassis harvest — this is the chassis's
  seventh consumer and improves it per the standing doctrine).
- During development the cairn build serves at **dev.aksailingclub.org** (replacing the
  migration shell on that hostname), Access-protected as today, so volunteers preview
  behind the existing login. The service-token machinery for non-interactive verification
  already exists (the `asc-cloudflare-access` memory).
- **Cutover is a DNS change** (apex to the new worker; full Cloudflare access is in hand),
  gated on Geoff's explicit go per the member-facing rule, with the GCE origin retiring
  after a soak period.

## Out of scope (phase boundaries)

- Phase 2: the members directory, my-account, auth beyond magic-link editors, the admin/
  members migration onto the extending-developer seam, event administration, and the
  reconciliation with the asc-ops dashboards and the prior migration's D1.
- Phase 3: handbook.aksailingclub.org on Topo (after Topo exists).
- The Blowfish origin site's decommissioning rides the cutover's soak, not this spec.

## Acceptance (phase 1 is done when)

- Every public page and phase-1 guide serves from the cairn build with the permalink
  contract intact (the live sitemap is the reference; sanctioned redirects only).
- The design reads as the club's site (glance test by members' standards), with the four
  issues demonstrably addressed and the mockup-gate calibration applied.
- The five-viewport matrix passes; the pixel-diff rider is in the site's CI.
- Volunteers can sign in by magic link and edit posts, pages, and notifications; the
  events calendar renders from D1.
- Geoff's before/after approval precedes the cutover DNS change.
