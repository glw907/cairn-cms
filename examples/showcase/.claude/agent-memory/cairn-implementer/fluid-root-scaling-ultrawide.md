---
name: fluid-root-scaling-ultrawide
description: How the showcase's ultrawide root font-size clamp was computed and verified pixel-stable at its floor breakpoint.
metadata:
  type: project
---

The showcase's ultrawide posture (`examples/showcase/src/lib/site.css`, `html { font-size:
clamp(...) }`) scales the root font-size from 100% at <=1440px to ~112.5% at ~2200px, holding flat
past the cap. Because the whole theme is rem-based (the `--container-measure: 44rem` reading column
included), this one clamp grows the entire layout proportionally with no separate wide-layout
reflow. Documented in `docs/internal/public-design-system.md` under "The ultrawide posture".

**The fluid formula.** For a clamp from `minSize` to `maxSize` (in px-equivalents) between
`minViewport` and `maxViewport` (in px): `slope = (maxSize - minSize) / (maxViewport -
minViewport)`, `interceptPx = minSize - slope * minViewport`, then `clamp(minSize/16 + 'rem',
interceptPx/16 + 'rem' + (slope*100) + 'vw', maxSize/16 + 'rem')`. Round the intercept and vw
coefficient DOWN (not to nearest) so the linear part evaluated at exactly `minViewport` computes a
hair below `minSize`, guaranteeing the clamp's floor branch wins and the breakpoint is pixel-exact,
not just close. Rounding to nearest can leave the linear branch a hair ABOVE the floor at the exact
breakpoint, a sub-pixel drift that is real (if minuscule) rather than eliminated.

**Verifying a clamp floor is truly pixel-unchanged.** Comparing a fresh screenshot against
evidence captured in an earlier, separate session produced a nonzero diff (~6/255 mean, a full-image
"ghosting" pattern in a `diff.getbbox()`/`ImageChops.difference` check) that looked like a regression
at first glance. It was not: cropping and eyeballing the two images side by side showed
byte-identical text position and size. The apples-to-apples proof is `git stash` the change, rebuild
and screenshot the "before" state with the exact same script/browser/viewport as the "after" shot,
then diff those two: that comparison came back as an exact 0 (`diff.getbbox()` is `None`, max/mean
both 0). Two screenshots taken by different Playwright/Chromium invocations (different session,
possibly different bundled Chromium build or font-hinting state) are not a valid pixel-diff pair
even when the underlying render is identical; only a before/after pair from the same pipeline in the
same session proves a floor breakpoint is unchanged. `git stash` / `git stash pop` round-tripped
cleanly here with no data loss, but note it operates on the whole working tree, not just the file in
question, so stash only when the tree is otherwise clean of unrelated changes.

**No px stragglers found.** The showcase's public CSS (`theme.css`, `site.css`, `prose.css`, the
`(site)` route components) was already fully rem/em/clamp-based before this pass; the only literal
`px` values are 1-4px borders, outlines, and radii (focus rings, hairlines, backdrop-filter blur),
which are deliberately NOT part of the type/space scale and correctly stay in px regardless of root
scaling.
