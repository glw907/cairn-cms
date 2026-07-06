# The chassis restructure: one chassis, N themes, three artifacts

> Geoff's rulings (2026-07-05, all binding): the ontology is one chassis + N themes;
> "chassis" is the name (a logical directory inside a theme/site); the starting exercise
> rebuilds Waymark, 907-life, and ecxc-ski in the structure; the chassis is GENEROUS, not
> minimal — Claude's raw work is cheap, the developer's theme-building effort is the thing
> optimized, and flexibility is preserved by making every chassis default overridable
> (strong defaults with seams). The theme-building tutorial (later, with docs) is the
> boundary's acceptance test; the ecxc repair's kept-vs-replaced list is the boundary's
> evidence base.

### Task 1: Cut the boundary in the showcase
`examples/showcase` gains `src/chassis/` holding the genre-free layer: adapter/config
wiring helpers, route+delivery glue, feed/sitemap/media/robots plumbing, the token SYSTEM
(the scale/space/role machinery, not Waymark's values), the prose foundation, the
component-grammar wiring, the theme toggle mechanism, and the COMPOSITION PRIMITIVES (the
card/band/section/hero/sidebar recipes as configurable classes with documented override
seams — the generosity ruling made concrete). Everything else is the Waymark theme.
**Acceptance:** the showcase builds and renders IDENTICALLY (the CI visual suite is the
gate: baselines unchanged or CI-regen byte-equivalent); a written chassis/README states
the boundary rule ("a theme is everything that isn't chassis") and every override seam.

### Task 2: Waymark expressed as a theme
The remaining showcase code reorganizes as the explicit Waymark theme (chrome components,
home composition, theme.css values, starter component looks) consuming chassis seams only
— no reach-ins. **Acceptance:** visual suite still green; a grep gate proves no theme file
imports chassis internals (only its exported seams).

### Task 3: 907-life on the chassis
The site restructures to chassis/ + the 907 theme (its chrome, compositions, 907-theme
values). Chassis files come from the showcase's canonical copy verbatim.
**Acceptance:** full gate; the permalink crawl exact; the 13-device manifest still
verifies (computed-style spot checks); no visual change on the live-parity build.

### Task 4: ecxc-ski on the chassis, plus the sanctioned fixes
Same restructure (chassis/ + the ecxc theme). Folded in: the three plain losses from the
fidelity trial — the training-groups meter bar restored, the FAQ answers inline again, the
archives tag-filter chips + feed links restored. (The four re-expression items — heading
voice, section-header anatomy, CTA cards, blue alerts — await Geoff's sanction-or-restore
ruling and are NOT touched here.) **Acceptance:** full gate; crawl exact; the restored
devices verified against the reference crops.

### Task 5: Verify, harvest, changelog
Fresh-context verifier passes on both sites' local-parity builds; the showcase visual
suite green on CI; the chassis boundary written into the pre-beta ledger and CHANGELOG
under Unreleased (this restructure rides the pre-aksailingclub release); the
kept-vs-replaced boundary map recorded for the tutorial to follow. Deploys of the two live
sites happen ONLY after the one-check rule and Geoff's go (no visual change is expected,
which the verifier proves).

## AMENDMENT (Geoff, mid-pass): the chassis is default, not contract

An ultra-light theme builder may rebuild, ditch, or modify the chassis, or simply remove
unused elements — the chassis is site-owned code over the versioned engine API, and
SUBTRACTABILITY is therefore a design requirement, not a courtesy:

- **Organization:** one concern per file; no hidden cross-dependencies (removing the
  gallery recipe must not break the card recipe); anything load-bearing for multiple
  elements lives in an obviously-named shared file, never inside a sibling.
- **Documentation:** the chassis README maps EVERY element to its purpose, its dependents,
  and a removal note ("delete this file + these two imports; nothing else references it").
  A developer subtracting from the chassis should never need to grep for hidden couplings.
- Task 5 verifies this: pick two chassis elements, follow their removal notes verbatim in
  a scratch copy, and confirm the build stays green. A removal note that lies fails the
  pass.
