# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it. A hole in `docs/internal/facts/` (something a
pass needed and didn't find, found wrong, or found only as an unverified `[candidate]`) is filed
here too, the same as any other finding.

Record each finding with its perspective and a short note. The perspective is one of the five
audience profiles ([`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)): `editor`
(the non-technical author working in `/admin`), `admin` (the technical non-developer who sets up
and runs the default site; `operator` retired into this tag 2026-08-14), `extender` (the
Svelte-fluent developer building on cairn's seams; formerly tagged `developer`), `contributor`
(the engine contributor working on cairn itself; formerly tagged `maintainer`), or `scripter`
(anyone automating against `cairn`, a person writing a script or an agent; the profile the
2026-08-14 record's dated note added for the three tool contract pages under
`docs/reference/`).

Open findings sit in three groups by who clears them (Geoff, 2026-10-08). **Engine** entries feed
the docs-stage boundary test and are cleared by it at each stage close, riding `ROADMAP.md`'s
batched engine friction entry or an engine pass. **Docs content** is any way a page fails its
reader: a wrong claim, a missing working example, step, or failure case, too much or too little
detail for the task, content in the wrong track or page or unfindable from where a reader looks, or
drift since writing. The filing test is whether the reader can finish the page's job from the
page. The pass that meets a small docs item fixes it on the page to its track's brief, except on an
arm whose stage is in flight or a page the running plan freezes, where it is filed here or in the
facts container; a larger docs rework moves to a `ROADMAP.md` row in the tier where it bites.
**Repo tooling** is gates, scripts, fixtures, and tooling comments: a pass that meets a small
tooling item fixes it there, and anything larger moves to a `ROADMAP.md` row in the tier where it
bites.

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in git, PR bodies, and `docs/STATUS.md`, the homes for shipped
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

New findings start in the group they belong to, one per finding, with its perspective and a short note.

### Engine

- **`extender`.** A component's `build` reads `ctx.attributes.<key>` and gets `undefined` at runtime for a key the component def never declared, with no type error and no warning, because `attributes` is a plain `Record`. Fix: document that a build may read only declared attributes, or warn in dev when it reads an undeclared key (found by the ecnordic 0.21 migration, 2026-07; verified against `src/lib/render/registry.ts` on 2026-10-11).

### Docs content

- **`extender`.** A `cairn:` token resolves content concepts only, not a hand-built SvelteKit route, and no published page says so: `cairn:pages/crewlab` works, but a link to a `+page.svelte` route has no manifest id and dangles. State the constraint where the internal-link grammar is described, and check that the editor link picker offers only real content targets (found by the ecnordic 0.21 migration, 2026-07; no page found stating it on 2026-10-11).

### Repo tooling

- **`contributor`.** `packages/create-cairn-site/test/fixtures/transcripts/01c-resume.txt` and `01d-resume.txt` still show the two-database provisioning lines, and `01-create-cairn-site.txt` (line 9) still prints the old two-database cost preamble; the scaffold prints neither. They are recorded captures, so only a live re-capture changes them (found by the engine pass B session, 2026-10-10).
- **`contributor`.** A plan that fixes a task's gate string bypasses the classifier, and the fixed string can omit the type check. The gate economy pass's Task 4a ran a plan-fixed light gate with no `npm run check`, so four `svelte-check` implicit-any errors in `scripts/ci/retries-notice.mjs` reached CI (the test job went red on `d2c5164d`, 2026-10-10) and were fixed under Task 3 (`8695229d`). The classifier would have added `check` for a scripts diff. Found by the gate economy pass conductor, 2026-10-10.
- **`contributor`.** A caught red's record names no failing step, so a replay cannot tell which gate leg would have caught it. The gate economy replay's miss-rate floor of 24 items carried failure descriptions that disagreed with the CI logs on 5 of 24 items, and each row had to be re-read from `gh run view --log-failed`. A one-line `failing step` field per caught red in the PR body's score or the CI record would make the next replay a read (found by the gate economy pass conductor, 2026-10-10).
