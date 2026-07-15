# Admin reorganization: the flat default and the evidence-grounded guide (design)

Ratified in brainstorm 2026-07-14, the same day the nav-layout pass began executing (this
pass runs AFTER 0.86.0 ships the `navLayout` seam and the nav-layout pass merges; it
deliberately changes what that pass deliberately preserved). Grounding inputs, all
committed: the original comparables survey
(`docs/internal/2026-07-14-admin-nav-organization-research.md`), the UX evidence layer
(`docs/internal/2026-07-14-admin-nav-evidence-research.md`), and the comparables refresh
(`docs/internal/2026-07-14-admin-nav-comparables-refresh.md`).

## 1. What the research settled

The original "task-shaped vs provenance" question dissolves under the evidence: no study
supports verb labels over noun labels for admin tools (the NN/g task-based finding beats
org-chart grouping, nothing more), and noun-based nav is universal across every comparable.
Cairn stays noun-based. What the evidence does indict: grouping by provenance (the
`navLayout` seam already kills it where it bites), section headers below ~the mid-teens of
items (a measured category-decision cost with nothing to pay it back), usage-adaptive
reordering (stable role subtraction is fine — cairn's model exactly), hidden or collapsed
nav for infrequent users (the strongest quantified finding), and engine-vocabulary labels
("Core" is our word, not an editor's).

## 2. The flat default (ratified: Geoff, 2026-07-14)

The zero-config sidebar drops the labeled, collapsible "Core" section and renders its items
flat: concepts, the site's legacy `adminNav` flat entries, Library, Tags, the nav-menu
editor (when configured), Settings, Editors (owner) — same items, same order, no header.
Legacy `adminNav` sections still render as labeled collapsible groups after the flat run.
Help stays in the divider-set foot (the resolved layout's omission-fallback slot,
unchanged). A site's declared `navLayout` is untouched by this change; it already owns its
whole arrangement.

Mechanics: the default synthesis in `resolveNavLayout` emits loose top-level nodes instead
of one `Core` section; `CairnAdminShell` already renders loose nodes as a plain list (built
by the nav-layout pass for declared trees), so this is a synthesis change, not a renderer
change. The `cairn-admin-nav-collapsed` cookie's `Core` key goes inert (harmless; sections
declared by sites still collapse by label).

Consequences owned by the pass:

- The default-synthesis unit tests and the zero-config component parity test re-pin to the
  flat shape (they are the bit-for-bit contract; this pass moves the contract on purpose).
- Zero-config admin visual baselines regenerate (a deliberate repaint of every zero-config
  admin; ecxc and 907 ride it at their next bump, ASC does not — it declares a tree).
- `docs/internal/admin-design-system.md`'s nav section records the flat default and its
  evidence base.
- Changelog: a behavior entry (no new surface). One caveat line: a `navFilter` that matches
  the literal `Core` section label sees loose items instead (no known consumer does).

## 3. The guide upgrade

`docs/guides/organize-your-admin-nav.md` (shipped by the nav-layout pass with the spec §4
principles) gains the evidence grounding and the scale tiers:

- **Nouns, not verbs**, stated as a ruling with its grounding (convention transfer; no
  contrary evidence).
- **Flat until it hurts**: no section headers below roughly 8-10 items; state honestly that
  the threshold is practitioner convergence plus the measured decision cost, not a studied
  number.
- **Group by editor workflow** when you do group (what your editors do, not where code
  lives — the survey's principle, now Sanity-corroborated).
- **Content first; settings, roster, and help sink last** (universal convention across
  every surveyed default).
- **Stable arrangement**: never rearrange per role beyond subtraction; one tree plus
  `roles` filters is the model (evidence-backed and industry-unanimous).
- **Don't over-hide**: `hidden: true` retires a door; it is not a decluttering tool, and
  the palette is an escape valve, never a substitute for visible nav (the hidden-nav
  study's numbers earn one sentence in the guide).
- **Scale tiers**: default scale (≤ ~8 items) stays flat; a site with one real domain
  section leads with it and lets the engine screens trail; ASC scale (15+, several roles)
  gets the full arrangement treatment — sections by workflow, roles-gated, settings sunk,
  collisions relabeled.

External citations go in the guide sparingly (Google style); the internal research docs
hold the full trail.

## 4. Showcase and docs riders

The showcase's declared layout (from the nav-layout pass) is reviewed against the final
guide tiers and kept unless it contradicts them; it is the exemplar, so it must practice
the guide's own advice. The design-system doc and the components reference pick up the
flat-default render. ROADMAP's reorganization entry closes with this pass.

## 5. Out of scope (ruled, now with evidence)

Verb/task relabeling of engine screens (no supporting evidence; convention against).
Per-role layout trees (re-ruled: subtraction from one tree, industry-unanimous and
spatial-memory-safe). Any auto-grouping or adaptive mechanism (directly indicted).
Greyed/disabled nav items (still ruled out; unchanged from the nav-layout spec).
Collapsed-by-default sections (fights the hidden-nav evidence). ASC's own arrangement
(its repo's sessions, against the shipped guide).

## 6. Testing shape

Unit: the default synthesis emits the flat shape (re-pinned fixture). Component: zero-config
parity test re-pinned to the flat render; declared-tree and none-session tests unchanged.
Visual: zero-config admin baselines regenerate and get render-read. The showcase e2e is
unaffected (it asserts the declared tree).

## 7. Versioning and sequencing

A behavior change with no new public surface: a patch by the 0.x scheme, numbered at the
cut. Sequencing: after the nav-layout pass merges and 0.86.0 ships (ASC's bump does not
wait for this pass). A small pass — standard cairn-pass shape on a worktree off `main`;
plan via superpowers:writing-plans when its turn arrives.
