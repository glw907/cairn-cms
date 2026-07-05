# Harvest pass 1: the confirmed engine and Waymark improvements

> The pre-beta-harvest ledger's QUEUED/CONFIRMED items, executed now so the theme ports run
> on the improved base. Beat 2 (the port-fed contract items: composed-page, album/collection,
> component-grammar breaks) follows the ports; both beats roll into the release that
> precedes the aksailingclub build. Breaking changes are PREFERRED where they make the
> contract better (Geoff); owned-site migration cost = zero weight.

### Task 1: The rehype seam, as a contract improvement
`createRenderer` gains first-class plugin composition — the options shape grows a
`rehypePlugins` (and, symmetrically, `remarkPlugins`) parameter, positioned AFTER the
engine's own steps. If the factory's current signature fights this, BREAK IT into the
better shape. Reference docs + the restyle/rendering guides updated; the two consumer
sites' local table-scroll wiring migrates to the seam (both repos, their gates).

### Task 2: Table-scroll by default
The engine's pipeline emits the scrollable-table wrapper by default (the a11y
role/tabindex/label pattern), opt-out via the new options. The showcase and both sites
DELETE their local wiring. Kills the silent two-part contract; two confirmed misses.

### Task 3: The sitemap answer
The sitemap helper accepts extra routes; a build check flags site-owned public route
directories missing from the sitemap. Both sites migrate their hand-lists.

### Task 4: CairnHead titleTemplate
An optional title template (site-name suffix convention) on the head component; both
sites' hand-built title logic migrates.

### Task 5: The flow-rhythm regression test
The prose flow system gains a computed-margin assertion (the owl-selector specificity
class of bug becomes un-shippable). Rides the aea6625 fix already landed.

### Task 6: Consolidation
Reference riders complete; CHANGELOG under Unreleased with Consumers-must lines for every
break; the ledger's entries flip to LANDED; gates + CI cycle (baselines via the regen
dispatch); the sites' follow-up migrations verified by their own gates and crawls.
