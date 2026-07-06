# aksailingclub.org phase 1: the gentle redesign onto cairn

**The brainstorm and the UI/UX work session are complete; the design recipes are locked
from Geoff's picks. Awaiting his ratification read of this document, then writing-plans.**

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
- **THE WORK SESSION RAN AND ITS PICKS ARE LOCKED (2026-07-06):** the show-and-tell
  ratified the narrowed diagnosis; the calibration settled the recipes. **A1 (quieted,
  bands kept):** bands mark sections, cards mark objects, nothing gets both; the welcome
  unboxed ("Ahoy!" as the heading, the welcome line opening the lede beneath it); the
  notification as a slim accent strip; content directly on bands; one spacing scale
  (large fixed inter-section rhythm, half within sections, band padding deeper than the
  inter-section gap). **B1 (editorial pacing)** is the house density style for long
  content: an at-a-glance table up front, real subheads, tightened prose — no new chrome
  (B2's day-cards were considered and not chosen). These recipes generalize site-wide as
  the theme's house style; Geoff: B1 "a significant improvement over the original."
  **Home-page additions (Geoff, same session):** the Fleet and Facilities sections are
  two-column compositions with EMPTY image columns — phase 1 completes them with real club
  photography (a fleet shot; a grounds shot), curated into the media library with alt
  text. SUGGESTED, awaiting his call: The Season's six month-boxes consolidate into a
  single quiet band listing (the B1 energy applied to events), fitting its D1-driven
  future.
- **The original work-session definition (ran as designed):** two sittings with Geoff. (1) THE SHOW-AND-TELL: curated exhibits from the
  scroll-primed captures — the news cards at their best, the chrome-stacking at its
  heaviest, the education page's full height, the responsive rough spots — so the
  diagnosis is agreed over evidence. (2) THE CALIBRATION: candidates across three page
  archetypes (home with refined cards; one long content page with the density toolkit at
  two or three intensities; one post), rendered as scrollable artifacts; Geoff's picks
  become the locked design recipes the build executes. The session's outputs ARE the
  theme's specification; everything after is implementation.

**The ratified diagnosis (the show-and-tell, Geoff 2026-07-06: "that all looks correct"):**
the site is mostly good — clean phone reflows, strong sections (the news grid is the card
treatment done right), concise governance. The busy-ness lives in exactly three places:
(1) the home page's chrome stack (three background/card layers in 900px); (2) per-SECTION
prose walls (education's day-by-day schedule; the new-member guide's top half), with the
fix already demonstrated by neighboring sections (tables, subheads, bullets); (3) the join
page's hand-off to the MembershipWorks embed, which is NOT stylable — a known constraint
that resolves when the ops absorption takes over membership functionality, not a design
task. The calibration candidates therefore target: home chrome-quieting, and the
section-density toolkit at two intensities on education's schedule.

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

## The coexistence strategy (Geoff, 2026-07-06: the early-cutover win)

Cutting the production site over to cairn EARLY, with the old ops stack still running
beside it, is the strategic shape: users and editors get the improved experience sooner,
and ops functionality then migrates BIT BY BIT rather than as one big phase-2 event.
Consequences the design carries:

- **Coexistence is a requirement, not a transition state.** The cairn site and the
  existing ops stack (ops.aksailingclub.org, its D1) run side by side for as long as the
  incremental migration takes; the events read integration must not disturb ops's
  ownership of that data.
- **Phase 2 becomes incremental ops absorption:** each ops capability (events admin, the
  directory, my-account, membership flows) moves in its own small pass onto the
  extending-developer seam, harvested and verified like every other pass in this program,
  with the old ops surface retiring piece by piece.
- The phase-1 cutover is therefore gated only on the PUBLIC site's quality, never on
  ops-migration readiness.

## Out of scope (phase boundaries)

- Phase 2+: the incremental ops absorption described above (the members directory,
  my-account, auth beyond magic-link editors, event administration), each piece its own
  pass; the reconciliation with the prior migration's D1 rides the first such pass.
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
