# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is `developer` (the
integrator building and deploying a site), `editor` (the non-technical author working in `/admin`),
`maintainer`, or `operator`.

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

## Open findings

The log was cleared 2026-07-16; new findings start fresh below this line.

- **The dev backend cannot exercise fragments at all** (developer; invisible-craft pass,
  2026-07-17). The fake GitHub store ships `fragmentTargets: []`, so on `vite dev` the fragment
  picker is empty and the include chip's title resolution can only fall back to the id; the
  on-disk showcase fragment (`src/content/fragments/trail-safety-notice.md`) never reaches the
  fake manifest. Local design iteration on any fragments surface is blind. Fix belongs in
  `packages/cairn-cms-dev`'s seed (a fragments row wired like the media seed).
- **Every media-library tile renders the "Image missing" state on `vite dev`** (developer;
  invisible-craft pass, 2026-07-17). The dev backend seeds R2 bytes per `SEED_MEDIA_KEYS`, yet
  no thumbnail resolves in the browser, so optical review of real thumbnails is impossible
  locally. Pre-existing (visible in renders before the pass's first change); likely a key or
  route mismatch between the seeded objects and the thumbnail URLs the tiles request.
- **`check:custom-surface` and `check:chassis-boundary` are CI-dark** (developer; found while
  wiring `check:invisible-craft`, 2026-07-17). Both exist as npm scripts but no workflow runs
  them, so their budgets only hold when someone runs them by hand. Decide whether each joins
  `test.yml` the way `check:cm-internals` and the new gate do.
- **The media chip shares the fence gap the include chip just closed** (developer; the pass-end
  review, 2026-07-17). `editor-media.ts` chips a `media:` token written inside a fenced code
  block (a documented example) the same way `editor-include.ts` did before its fix; `fenceScan`
  now carries `inCode` per line, so the gate is one condition away. `figureRoleAtLine` in
  `markdown-directives.ts` also still reads the first `{...}` group anywhere on the line, the
  unanchored-brace bug `openerTitleAttr` was cured of. Both untouched by the fold-in on scope
  discipline; fix together next time the media decorations are open.
- **`remark-figure` promotes a caption only for `media:` tokens** (developer; Waymark final
  review T1, 2026-07-17). A figure over a raw external URL renders its trailing text as a plain
  sibling `<p>`, not a `<figcaption>`, so caption styling silently forks by source type; the
  showcase's prose.css now matches both shapes, but every other theme would hit the same fork.
  Candidate: promote uniformly in the engine's figure step.
- **`glyph.ts` icons are fill-only; a line-shaped subpath paints nothing** (developer; Waymark
  final review T1, 2026-07-17). The flag glyph's pole is a bare line with no closed area, so a
  fill-only renderer drops it and the standalone icon read as an ~14x8px smudge. The showcase
  scopes a `stroke: currentColor` fix to the standalone case; the engine icon set should either
  close its subpaths or paint stroke+fill.
- **`site.config.yaml`'s `menus:` key is dead config** (developer; Waymark final review T3,
  2026-07-17). The chrome components hardcode their nav arrays; the parsed `menus` reaches
  nothing. Wire it or remove the key from the schema, since a config key that silently does
  nothing is the loud-boundary posture's opposite.
- **The engine's `heroImage` projection resolves `media:` tokens only** (developer; Waymark
  final review T3, 2026-07-17). A frontmatter hero with a raw external `image.src` renders
  nothing without a template-level fallback (the showcase now carries one). Decide whether the
  projection should hand raw URLs through.
- **The admin editor's preview iframe dynamically loads the public theme.css** (developer;
  Waymark final review T4d, 2026-07-17). The public stylesheet has a second, separately-hashed
  consumer inside the admin; anyone pruning or splitting the public CSS needs to know the
  preview inherits it (the one-renderer contract's CSS shadow).
- **The `sizes` breakpoints the engine emits are generic constants** (developer; Waymark final
  review T4b, 2026-07-17). 800px/1200px match the built-in preset magnitudes, not any theme's
  actual measure; a mismatch costs only srcset-candidate efficiency, but a theme with a very
  different measure may eventually want a seam.
- **The cairn-theme application docs describe a wrapper import that no real site uses**
  (developer; cairn.pub Phase 1, 2026-07-18). The theme README and `make-waymark-your-own.md`
  say "add one import line directly after your theme.css import," implying a wrapper sheet
  that imports both; every real application (the ecxc/907 ports, cairn-pub's reset) appends
  `@import './cairn.css';` at `theme.css`'s tail instead, and a literal trailing `@import`
  is spec-invalid CSS that only works because Vite inlines it at build time. Pick one
  documented form and make it the one the ports actually use.
