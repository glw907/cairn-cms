# cairn-implementer memory index

- [SiteHeader nav flex-wrap fix](site-header-nav-flex-wrap.md): the 320px wordmark-wrap/nav-clip defect; SiteFooter had the outer flex-wrap precedent; `site-nav` class collides between header/footer in Playwright locators; a touch-target bump changes the header's tallest element and drifts scroll-padding-top + site-visual baselines.
- [Fluid root scaling (ultrawide)](fluid-root-scaling-ultrawide.md): the clamp() formula (round down, not nearest, so the floor breakpoint is pixel-exact); a cross-session screenshot diff is not proof of a regression, only a same-session before/after git-stash pair is.
