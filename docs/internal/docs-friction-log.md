# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is one of the four
audience tracks ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), or `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`).

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

New findings start below this line, one per finding, with its perspective and a short note.

- **contributor:** `ROADMAP.md`'s "Platform watch: Cloudflare" heading text is a machine key, not
  just a title: the `cairn Cloudflare capability review (monthly)` cloud routine (created
  2026-08-22) reads the list by that exact heading, so renaming the heading requires updating the
  routine in the same change.

## Clearings

The detail of a cleared finding lives in the pass post-mortem that cleared it and in
`docs/STATUS.md`, never here; this ledger exists only so a reader can find which pass to open. Git
history holds every pruned entry in full.

| Cleared | By | What went where |
| --- | --- | --- |
| 2026-06-28 | extensibility Plan 1 | the append-only prose accumulated through 2026-06-26, pruned |
| 2026-07-16 | the friction-triage pass | every open finding verified against the code, then shipped, filed to `ROADMAP.md` with a trigger, or pruned as already resolved |
| 2026-07-19 | the dev-backend pass | same rule |
| 2026-07-29 | the post-0.91.0 clearing | four gate tightenings shipped; the field-label weight question moved to `ROADMAP.md` |
| 2026-07-29 | the 0.91.1 hotfix pass | the ASC Assets-trial harvest, ten findings: one shipped as the hotfix, one folded into a ROADMAP entry, eight filed |
| 2026-07-30 | the design-ratchet pass | the Assets-trial BUILD harvest, six findings: five shipped (the `base` cascade layer, the exemplar compile gate, `register` on the field components, the one-filled-action ruling), one filed to Next |
| 2026-08-14 | Pass D | the setup-walk entry, five blind vantages and four classes of gap, answered by the docs rebuild's admin track and front-door task |
| 2026-08-17 | the capture pass | three live-run `create-cairn-site` defects plus one register-gate finding, all moved whole to `ROADMAP.md`'s Now tier |
| 2026-08-18 | seam Pass 1b (A8b) | six live-reproduction seam findings: one folded into the extending-developer lens, five filed across all three ROADMAP tiers |
| 2026-08-18 | seam Pass 1b (A8b) | eleven backfill findings from the unharvested 2026-08-04 to 08-16 window, filed across all three tiers; the Windows finding ruled and disclosed rather than fixed |
| 2026-08-18 | seam Pass 2 Task B0 | the cost-preamble finding, the last live one. Geoff ruled the copy hedges rather than waiting on a browser glance; `money.mjs` and two admin pages now scope the total to the confirmed figures, with a test pinning the hedge |
| 2026-08-19 | the release-debt pass | **supersedes the B0 cost ruling above.** A measured build put the deployable bundle at 3,246,163 bytes gzipped, over Cloudflare's 3 MiB Workers Free script limit, so "free, and stays free" was not a hedge to tune but a false claim. Geoff ruled Workers Paid is the expectation, stated plainly and without apology. `money.mjs`, its transcript fixture, and three admin pages now say so; the CLI's own consent prompt still does not, and is filed to `ROADMAP.md` as its own pass |
| 2026-08-22 | the aksailingclub-org 0.95.0 adoption fix pass (`15a2c979`) | five `extender` findings from a real production adoption of 0.95.0, all shipped: `previewLoad`'s static `$app/environment` import broke a raw, non-Vite Wrangler bundle of the `/sveltekit` barrel (now a dynamic import, gated by a new static-import-graph walker test over the built barrel); `previewLoad` now strips `canonical`/`og:url`/`jsonLd.url` from its `seo` instead of leaving every adopter to rediscover the strip; `PreviewBanner`'s four `--cairn-preview-*` custom properties are now documented as the site-override seam; `PreviewBanner` renders the expiry as a fixed UTC `<time>` string instead of `Intl.DateTimeFormat(undefined, ...)`, closing a possible hydration mismatch, with an optional `formatExpiry` prop; `@cloudflare/workers-types` is now a `peerDependency` at `^5`, so a `wrangler types`-only consumer's install now surfaces the requirement instead of silently losing every cairn-typed binding signature to `any` |

**Three carry-forwards were audited 2026-08-18 and judged not worth filing**, recorded here so they
are not re-mined: `packages/create-cairn-site` having neither a comment nor a type gate (the package
is plain JS by design and its own suite is the real gate, and no pass has reported a defect slipping
through), the `paid-plan-missing` mapping keyed on entitlement wording (the call site's docstring and
its test name both already state the risk and the reason), and the root `CLAUDE.md` context-headroom
note (housekeeping, outside this log's charter). STATUS shed all three at the B0 close.
