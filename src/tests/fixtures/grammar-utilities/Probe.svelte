<!-- A fixture for grammar-tokens.test.ts: names all ten role utilities so the Task 2 test can
     scan them into the compiled sheet. A Tailwind @utility is tree-shaken, and type-title/type-body
     have no real markup call sites yet (Tasks 3 and 4 migrate only the bracketed-literal sites, never
     the named Tailwind steps these two roles are pixel-identical to), so this fixture exists purely
     to defeat tree-shaking for the test; it renders nothing real and ships nowhere. -->
<div class="type-title type-subtitle type-body type-meta type-label type-chip">grammar type roles</div>
<div class="gap-control gap-label gap-group gap-section">grammar gap roles</div>
