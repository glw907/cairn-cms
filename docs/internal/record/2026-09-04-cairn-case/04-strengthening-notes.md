# Strengthening notes for the cairn case, round 2 fold (Geoff, 2026-09-04)

Fold these with evidence-round-2.md into the case document before the round-2 review.

1. The size ratio stays, and it is reframed as developer comfort in two halves: (a) the
   increment, what one more capability costs, section by section from the ASC enumeration
   (the 90-line sign-ups screen plus a 9-line migration at the small end; the members and
   events sections at the large end), each set against the engine it leans on; (b) what the
   developer never writes: the carried modules by name and line count (auth and sessions,
   CSRF and the guard, the editor and preview, the publish path, the admin design system
   and toolkit, the gates and tests). The sentence the pair supports: a developer adding a
   capability is spared the hardest kind of work and pays a measured, conventional
   increment. The whole-layer ratio remains beneath as the size record, with the "small
   fraction" correction intact.

2. Infrastructure interaction is low-impact, stated from the tree: the scaffold writes the
   Worker configuration (`wrangler.jsonc` with the D1, R2, and email bindings), the
   migrations, and the doctor's checks; the GitHub App install and the Cloudflare
   connection are guided steps in `create-cairn-site` (pre-release; cite its chapters);
   Workers Builds deploys from a push to `main` (optional; wrangler otherwise). The
   developer's contact with infrastructure is a short documented list, tagged [verifiable]
   against `docs/extend/what-the-scaffold-wrote.md` and the showcase config.

3. Security and hosting: state the facts behind "enterprise-class" without the phrase. The
   site runs on Cloudflare's global edge with TLS, DDoS protection, and the WAF that its
   largest customers use, as platform defaults, with the free-plan WAF subset and the Email
   Sending paid-plan beta caveats carried [verifiable: Cloudflare docs URLs from
   evidence.md]. GitHub holds the content with its access controls, App-scoped
   permissions, and audit history [verifiable: GitHub docs]. Where the second evidence pass
   supplies independent data on the edge's scale or incident record, cite it, including
   the 2025-11-18 outage as the honest counter.

4. The ASC consolidation case stays the lead of the extensibility subsection; the increment
   and the never-written list sit under it; the ratio under that.

5. The downside stated with equal weight: a cairn site is fully tied to these decisions.
   Content lives in GitHub, the site runs on Cloudflare, the app is SvelteKit, the admin is
   DaisyUI on Tailwind; a change of any one is a migration, and the platform's pricing,
   limits, and incidents are the site's. Give the counterweights only where they are facts:
   the content is plain markdown files in a repository the organisation owns (portable by
   clone); the app is standard SvelteKit with an adapter (deployable elsewhere with work the
   document should not minimise); the engine is MIT and on npm. Do not soften the tie; the
   register wants the reader to see it and decide.
