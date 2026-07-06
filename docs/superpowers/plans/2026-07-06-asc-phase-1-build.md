# ASC phase 1: the build

> Executes docs/superpowers/specs/2026-07-06-asc-phase-1-design.md (ratified 2026-07-06,
> including the club-grounds color story). The north star is the committed full example:
> docs/superpowers/specs/assets/2026-07-06-asc-home-northstar.html — the build's design
> CONTRACT, not an inspiration. The visual-fidelity method binds end to end; the chassis
> harvest banks whatever this build teaches (the 7th consumer). Production cutover is NOT
> in this plan — the build ships to dev.aksailingclub.org behind the existing Access app;
> the apex DNS change waits for Geoff after his live review.

### Task 1: The repo and scaffold
A fresh repo at ~/Projects/asc-site (private GitHub glw907/asc-site; deploy workflow per
907's pattern targeting a NEW worker `asc-site`), scaffolded from the canonical chassis on
@glw907/cairn-cms ^0.81.0. The adapter: posts (title, date, description, tags with
taxonomy: true; vocabulary: news, racing, results, education, club), pages (title),
notifications (title, body, expires — the site-declared concept; renders as the home
banner strip per the north star, expiry-aware). Wrangler: new D1 `cairn-asc-auth`
(provision via the API), EMAIL sending, the ASSETS/MEDIA_BUCKET trio per the family
pattern; secrets by name. githubApp(...) against the asc-site repo.
**Acceptance:** builds from the registry; dev-backend admin sign-in; the three concepts
in the admin.

### Task 2: Content migration
Every public page and phase-1 member guide from ~/Projects/aksailingclub-org (the Hugo
repo's content/) migrates to cairn content: pages for the stable set (education, racing,
events, join, contact-adjacent prose, governance + its subpages, the member guides),
posts for the news archive. Frontmatter mapped honestly; Hugo shortcodes inventoried and
mapped to the component grammar (each fought schema = a COMPONENT FINDING). The current
notification becomes the first notifications entry. URL contract: the live sitemap is the
reference; deltas only where the spec sanctions.
**Acceptance:** the content-parity crawl (local build vs the live sitemap) exact modulo
sanctioned deltas; every directive/shortcode renders with intent preserved.

### Task 3: The theme — the north star made real
The asc theme on the chassis: the club-grounds tokens (the story's roles; values tuned in
place), the chrome (header with the gold active-nav mark, the navy-deep closing band and
footer), the locked recipes as house styles (A1 quieting: bands mark sections, cards mark
objects, one spacing scale; B1 editorial pacing for long content — education's schedule
restructures per the calibration's B1; the C7-gold season treatment), the gentle
hover/motion keeps refined, and the real photography: the fleet and facilities shots plus
the news/hero images pulled from the live site's assets into the media library with alt
text.
**Acceptance:** the built home vs the north star, verified glance-equivalent by a fresh
verifier; education's schedule section matches B1's structure; the five-viewport matrix
composed.

### Task 4: Events from D1
The events integration as site-owned surface: verify the schema in
~/Projects/aksailingclub-sveltekit's db/ against the LIVE D1 the ops stack maintains
(read-only!); the Season home section and /events render from it with the C7-gold
taxonomy (the category field distinguishes classes/clinics from races from operations —
if the schema lacks the category, derive it by name-mapping and RECORD the gap for the
ops absorption). MembershipWorks pages embed as-is (the known constraint).
**Acceptance:** the season section renders live data correctly categorized; ops's
ownership of the data untouched.

### Task 5: Verification, the dev takeover, the harvest
The full gate + the visual-fidelity loop (fresh verifiers on every template vs the north
star and the content-parity references; the fix-verify loop until PASS); the pixel-diff
CI rider at the family widths; the permalink crawl; then DEPLOY TO dev.aksailingclub.org:
repoint the dev Workers custom domain from asc-staging to the new asc-site worker (the
Access app already covers dev; volunteers preview behind the existing login). The chassis
harvest + the ledger entries; STATUS in the new repo. **Production stays untouched.**
**Acceptance:** dev serves the new site behind Access (service-token verified); every
verifier PASS is fresh-context; the harvest is banked.
