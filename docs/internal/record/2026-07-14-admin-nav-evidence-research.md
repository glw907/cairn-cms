# Admin nav: the UX evidence layer (research, 2026-07-14)

The second grounding input for the admin reorganization pass (the first is the comparables
survey, `2026-07-14-admin-nav-organization-research.md`; the third its refresh,
`2026-07-14-admin-nav-comparables-refresh.md`). This one stays in the evidence layer: what
published UX/IA research actually supports about arranging an admin sidebar for
non-technical, infrequent editors. Each finding is tagged STUDY (controlled or
peer-reviewed), APPLIED (practitioner-research-org synthesis: NN/g, Baymard), or OPINION
(no cited methodology).

## 1. Task-based vs object-based navigation

The headline claim is narrower than its reputation. NN/g's task-based finding is an
intranet-specific conclusion, and the comparison it makes is task vs *department/org-chart*,
not task vs *object-noun*.

- APPLIED: [Intranet IA Trends](https://www.nngroup.com/articles/intranet-information-architecture-ia/) —
  task-based structures "better withstood organizational change" and ease learning; the
  alternative they beat is departmental silos. Scoped to intranets.
- APPLIED: [Avoid Format-Based Primary Navigation](https://www.nngroup.com/articles/format-based-navigation/) —
  format labels ("Videos", "Articles") carry no information scent; organize by topic/task.
  About content browsing, not admin tools where the nouns ARE the distinct managed objects.
- GAP: no controlled study measures verb navigation ("Write", "Manage people") against noun
  navigation ("Posts", "Members") for admin tools. Noun-based is near-universal across CMS
  admin UIs — a strong convention signal (Jakob's Law) even without an A/B study.

Supports: avoid grouping by who owns/built a thing; avoid leading with output format.
Does NOT support: verbs over nouns for admin tools. Noun grouping is not indicted.

## 2. Section headers and menu length

No primary source gives a clean "N items = add headers" threshold.

- APPLIED: [Menu-Design Checklist](https://www.nngroup.com/articles/menu-design/) and
  [Top 3 IA Questions](https://www.nngroup.com/articles/ia-questions-navigation-menus/) —
  explicitly refuse a fixed category count.
- OPINION (widely flagged as misapplied): Miller's 7±2 is a recall constraint; menus are
  recognition/scanning ([NN/g chunking](https://www.nngroup.com/articles/chunking/),
  [Walter](https://stephaniewalter.design/blog/your-menu-doesnt-need-millers-7-plus-minus-2-rule/)).
- STUDY: McDonald, Stone & Liebelt 1983
  ([SAGE](https://journals.sagepub.com/doi/10.1177/154193128302700919)) — categorical beat
  alphabetical in a 64-item menu, most when users worked from a definition rather than the
  exact label. Much longer list than a sidebar.
- STUDY (most on point): Omanson, Miller & Joseph 2014
  ([SAGE](https://journals.sagepub.com/doi/10.1177/1541931214581318)) — splitting one menu
  into two costs a measurable category decision (~600-800ms per selection), largely offset
  by faster within-group scanning for mouse menus. Grouping is a trade, not a pure win.

Supports: grouping pays only when flat-scan cost exceeds the category-decision cost — more
likely toward the mid-teens than at 6-8 items (extrapolation, not a tested threshold).

## 3. Stability vs adaptation (spatial memory)

The strongest, cleanest evidence in the set.

- STUDY: Findlater & McGrenere, CHI 2004
  ([ACM](https://dl.acm.org/doi/10.1145/985692.985704)) — static menus fastest, user-adapted
  ("adaptable") close behind, usage-adaptive slowest. Moving items breaks spatial memory.
- Interpretation for cairn: this indicts menus that rearrange for the same user based on
  behavior. It does NOT indict nav that differs by role but is stable within a role — that
  is structurally the "adaptable" condition, which performed nearly as well as static.
- GAP: no study on cross-role friction (hand-offs, one person holding two roles).
- OPINION: enterprise-blog numbers ("role-based nav cuts support tickets 40%") carry no
  methodology; disregard.

Supports: keep each user's layout fixed across sessions; never reorder by usage. Cairn's
one-tree-plus-subtractive-filters model matches the well-performing conditions.

## 4. Naming

- APPLIED: [Avoiding Confusing Category Names](https://www.nngroup.com/articles/category-names-suck/) —
  plain, familiar words beat branded/clever ones ("users skip meaningless words");
  ambiguous or overlapping labels measurably cost (the Delish "Recipes/Dinners/Summers"
  case). Validation method: card sorting/tree testing with the real audience.
- STUDY (indirect): McDonald et al. 1983 — categories help most when the user lacks the
  exact term, the normal state of a non-technical editor.

Supports: plain nouns in the editor's own vocabulary; resolve label collisions (the
Settings vs club-settings case); "Core" is engine vocabulary, not editor vocabulary.

## 5. Placement conventions

The weakest-evidenced question — convention, not study.

- APPLIED (partial): [Left-Side Vertical Navigation](https://www.nngroup.com/articles/vertical-nav/) —
  only the generic "less-important items at the bottom".
- OPINION: settings/help/account trailing below a divider is a near-universal convention in
  practitioner write-ups; no controlled comparison exists. Jakob's Law is the real (indirect)
  rationale: infrequent users benefit from the convention being followed.
- APPLIED (adjacent domain): Baymard's account-dashboard research — users visit
  settings-type areas only on specific narrow tasks; favor fewer, longer pages.

Supports (as convention, not study): content first; settings, roster, and help sink last.

## 6. Infrequent-user specifics

- STUDY: [NN/g hidden-navigation study](https://www.nngroup.com/articles/hamburger-menus/)
  (N=179, desktop+mobile) — hidden nav: discoverability down 20%+, task difficulty up 21%,
  desktop completion at least 39% slower, 5-7s extra just to engage the nav. The strongest
  quantified finding in this report, squarely on point: hiding or collapsing admin nav
  costs real time and success, and infrequent users absorb that cost worst.
- APPLIED: [Measuring learnability](https://www.nngroup.com/articles/measure-learnability/) —
  infrequent users "behave like new users each time"; design for first-time-like
  performance every visit (recognition, visible chrome).
- STUDY (foundational): recognition over recall
  ([NN/g](https://www.nngroup.com/articles/recognition-and-recall/)); menus are its classic
  case.
- APPLIED/OPINION: [Zen Mode](https://www.nngroup.com/articles/zen-mode/) — minimal-chrome
  designs disadvantage non-expert users (the grounding already used by the desk-route
  sidebar rider in the nav-layout spec).

Supports: visible beats hidden, labeled beats icon-only; nothing should require remembering
a location or gesture from last time. Consequences for cairn: the desk-route persistent
sidebar is validated; `hidden: true` is for genuinely retired doors, not decluttering; the
command palette is an escape valve, never a substitute for visible nav; collapsed-by-default
sections would fight the evidence.

## Summary

Solidly supported: hidden/collapsed nav measurably hurts; usage-adaptive reordering hurts
(stable role subtraction does not); grouping carries a real decision cost with no clean
threshold in the 6-20 range; plain familiar labels beat clever ones; task-based beats
org-chart specifically (not verbs over nouns).

Convention-backed only: settings/help/account trailing at the bottom.

Genuine gaps: verbs vs nouns for admin sidebars; cross-role consistency friction; any
numeric header threshold for short lists.
