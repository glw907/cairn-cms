# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-18, latest: DOCS-ON-SITE PIPELINE SHIPPED, v0.87.4 published, cairn.pub /docs live; next = the Topo design pass)

**THE DOCS-ON-SITE PIPELINE SHIPPED 2026-07-18 (one session: brainstorm, spec, plan,
engine, v0.87.4, site, deploy, Topo prep; Fable conducting on Geoff's authorization to
run through release without gates).** Engine (PR #5, merged): `renderDocument` +
`DocHeading` on `createRenderer` (heading collection from the final rehype tree, lazy
second processor), the GitHub-slug contract test (zero divergence; the 225 in-corpus
anchors ride on it), the published docs arms inside the npm tarball (+61 files,
allowlist-guarded `check:package`), and the `editor.supportContact` default
(`https://cairn.pub/help`; unset/explicit/empty triad documented and test-locked).
Released as **v0.87.4** (patch by the size rule, re-derived at the cut; the registry
serves it, 562 files). Site (cairn-pub, 8 commits, LIVE): the build-time loader over the
in-package docs with the link policy and full-corpus link check, `/docs` +
`/docs/[...path]` + `/help/[guide]` prerendered with TOC rail, breadcrumbs, prev/next,
lazy mermaid, and the register-clean /docs front door; verification = 40 shots, three
Opus graders (0 structural findings), register/svelte/a11y reviewers folded (real
blocker caught: mermaid died on client-side navigation; fixed with `afterNavigate`);
deployed behind main-loop render reads, live routes verified. Record: the spec, the plan
+ post-mortem (`docs/superpowers/plans/2026-07-18-docs-on-site-pipeline.md`), and the
banked Topo review (`docs/internal/2026-07-18-topo-inspiration-review.md`).

**NEXT (fresh session): the Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md`; it carries the four-system
synthesis, the devices-to-absorb table, the Starlight anatomy checklist, and section 5's
open design questions for Geoff. The ruled gate: mockup candidates go to Geoff BEFORE any
build. After Topo: the scaffolder (step 6). Resume prompt: "Open the Topo design pass:
read cairn-cms docs/internal/2026-07-18-topo-inspiration-review.md and take section 5's
open questions to Geoff, then mockup candidates." Launch in ~/Projects/cairn-cms. Check
the Fable window state at session start (the post-Fable doctrine says Opus conducts after
it closes; verify online).

**Carry-forwards (live):** NEW from this pass: mermaid diagrams near-illegible at 320/390
(candidate: a tap-to-expand treatment in the Topo pass); section-index breadcrumbs
duplicate the arm name ("Docs / Guides / Guides"); the Cloudflare API token lacks
zone-route write on the cairn.pub zone, so `wrangler deploy` exits 1 after a successful
upload (fix the token scope or scripted deploys read as failures). STANDING: the dev
backend still cannot exercise fragments and renders media tiles as "Image missing"
(ROADMAP Now seed item); eight friction-log entries await the next clearing (the seven
prior plus this pass's engine mermaid-grammar gap); `check:custom-surface` and
`check:chassis-boundary` remain CI-dark; the cairn.pub live admin smoke (Geoff's magic
link + publish round-trip) is owed; point `cairn-register-editor` at the banked register
standard.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`, and
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries).
