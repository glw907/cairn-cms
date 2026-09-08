# Proposal research, lens 7b: how figures are produced and graded

Research for `docs-standard-proposal.md` revision 2 (Opus, fresh context, 2026-09-08): the Claude Code ecosystem's diagram tooling, the published grading rules, and a recommendation for cairn. Folded into revision 2.

---

## Part 1 — Production in the Claude Code ecosystem

**Anthropic's own surface.** There is no first-party *docs*-figure skill. The two relevant built-ins are:

- `artifact-diagramming` (bundled skill, not on disk under `~/.claude/skills` or `~/.claude/plugins`; loads by name). It is a hand-authored **inline SVG** doctrine, not a diagram-as-code one, and it is close to what cairn already does. Its normative content: draw the mechanism, not its name; comparing options means drawing the difference, not two labeled boxes; label every arrow (`writes`, `invalidates`, `polls every 30s`) because an unlabeled arrow means "related somehow"; a legend only when the same encoding repeats; size by `viewBox` with CSS scaling; theme with `currentColor`, reserving one literal hue for the element carrying meaning; text at 11–13px at drawn scale; align to a shared grid ("eyeballed offsets read as noise"); one figure one claim, wrapped in `<figure>`/`<figcaption>` with `role="img"` + `aria-label`; no `<script>`, `<style>`, or `<foreignObject>` inside the SVG; "long decorative path data is a sign the drawing wants a real graphics tool". It explicitly defers the markdown lane: "a markdown-rendered page draws its diagrams in whatever fence that lane's renderer supports."
- The Artifact host renders mermaid natively (```mermaid fences, `<pre class="mermaid">`) with no library load. `frontend-design` (official marketplace plugin) is aesthetics for original UI and carries no figure guidance.
- Official marketplace: https://github.com/anthropics/claude-plugins-official — code-review, security-guidance, commit-commands, frontend-design. Nothing diagram-specific. https://code.claude.com/docs/en/discover-plugins

**Community skills and MCP servers** (all third-party, none vetted by Anthropic):

- Mermaid skills: `moai-library-mermaid`, `ccheney/robust-skills/mermaid-diagrams` (adds a decision tree for flowchart vs sequence vs ER vs class), `daymade/claude-code-skills` mermaid-tools (extracts fences from markdown, renders PNG) — https://github.com/daymade/claude-code-skills
- `veelenga/claude-mermaid` — MCP server + skill, renders in the browser with live reload as Claude iterates. https://glama.ai/mcp/servers/@veelenga/claude-mermaid
- Excalidraw: https://github.com/yctimlin/mcp_excalidraw (26 tools over stdio, auto-starts a canvas, JSON in/out, mermaid import)
- draw.io: https://www.drawio.com/docs/manual/generate/drawio-mcp-server/ (npm package, opens generated diagrams in the drawio editor)
- Comparison of the four lanes, including Penpot: https://mcp.directory/blog/drawio-vs-excalidraw-vs-mermaid-vs-penpot-skills-2026 — its conclusion is the useful one: **pick by output destination, not preference** (Confluence → drawio, GitHub → mermaid, whiteboard → Excalidraw).

**What fails when Claude produces diagrams.** The failure is layout, not syntax, and it is a property of the renderer:

- Mermaid's dagre layout produces overlapping labels, text overflowing node boundaries, and arrow crossings past roughly a dozen nodes: https://github.com/mermaid-js/mermaid/issues/7492, https://github.com/mermaid-js/mermaid/issues/3125
- "Mermaid's automatic layout can be rigid… sometimes asking the AI to 'make this part neater' doesn't yield much improvement — sometimes the first layout is as good as it gets": https://www.awesome-testing.com/2025/09/mermaid-diagrams
- Syntax correctness is separately measurable and imperfect: MermaidSeqBench https://arxiv.org/pdf/2511.14967
- The mitigation everyone lands on is the same: it is text, so a human edits the text. Which means **the render must be looked at**, and that is a grading problem, not a production one.

**Rendering targets.** GitHub renders mermaid fences natively (https://github.blog/developer-skills/github/include-diagrams-markdown-files-mermaid/), as does GitLab. Docusaurus needs `@docusaurus/theme-mermaid` (https://docusaurus.io/docs/next/api/themes/@docusaurus/theme-mermaid); Material for MkDocs uses `pymdownx.superfences` custom fences; VitePress needs `markdown-it-mermaid`; Starlight still has no official integration (https://github.com/withastro/starlight/discussions/1259). Pre-rendering to SVG is `mmdc` from `@mermaid-js/mermaid-cli` (https://github.com/mermaid-js/mermaid-cli), which takes `-t theme`, `-c config.json`, and `--cssFile` to inject a `<style>` into the emitted SVG. `svgo --multipass` is the hygiene step for shipped SVG (https://svgo.dev/).

**The trade-off, stated plainly.** Text-source (mermaid/D2/graphviz) buys diffable review, generated consistency, and near-zero authoring labor, and pays with layout you do not control — the engine decides where things go, and above ~15 nodes it decides badly. Hand-authored SVG buys exact control, on-brand palette, and guaranteed legibility at a chosen width, and pays with labor per figure and the fact that a semantic change means moving coordinates. D2's TALA engine narrows the gap (better edge routing and container nesting than dagre) but is a paid engine; open-source D2 ships dagre and ELK, and ELK is genuinely better on orthogonal routing. Graphviz still wins on large auto-laid-out graphs. https://aaronjbecker.com/posts/mermaid-vs-d2-comparing-text-to-diagram-tools/, https://diagrams.so/learn/diagram-as-code-comparison

## Part 2 — Grading in mature docs teams

**Google** (https://developers.google.com/style/images): "Use images only when they provide useful visual explanations of information that is otherwise difficult to express with words." Never images of code, text, or terminal output. Alt text ≤155 characters, full sentences or noun phrases, no "image of", **contextual not descriptive** ("Alt text should consider the context of the image, not just its content"). Complex images get short alt plus the detail in surrounding text. Captions are optional, formatted `Figure N. Description.`, always end-punctuated, never spatially referenced. SVG for diagrams (PNG only if SVG is unavailable); don't exceed column width; `srcset` for 1x/2x.

**Microsoft** (https://learn.microsoft.com/en-us/style-guide/accessibility/alternative-text): alt on every meaningful image, `alt=""` for decorative, **start by naming what the image is** (drawing, photograph, diagram, chart, screenshot), never the filename, limit 150 characters. Also https://learn.microsoft.com/en-us/style-guide/accessibility/graphics-design-media

**Kubernetes** — the most complete public diagram standard, and the closest match to the question (https://kubernetes.io/docs/contribute/style/diagram-guide/, source: https://github.com/kubernetes/website/blob/main/content/en/docs/contribute/style/diagram-guide.md):
- Standardizes on mermaid, with three sanctioned methods: **Inline** (fence in the md), **Mermaid+SVG** (render to SVG, embed via the `figure` shortcode), **External tool** (SVG only, as fallback).
- Styling is `classDef`/`class`, with a named brand hex (`#326ce5`) reused across all diagrams — one visual language, enforced by copy-paste of class definitions.
- Captioning is a three-part discipline: **diagram + caption + referral**. "You should always add a caption to each diagram." Caption is prefixed `Figure NUMBER.`, unique per page, short, punctuated, positioned **below**. The referral is in-text and must match the number, and "You should avoid using spatial references such as `..the image below..`".
- The figure shortcode requires `src`, `alt`, `class`, `caption`, with size classes `diagram-large/medium/small`.
- Tips that are effectively the grading checklist: always preview in the real site build; include a source pointer (URL, source location, or "self-documenting"); attach the SVG or source in the PR so reviewers can see it; use SVG because it stays sharp when zoomed; **"convert text to paths"** so the diagram renders identically regardless of font availability; and the closing rule in bold, "Most important, **Keep Diagrams Simple**."

**GitLab** (https://docs.gitlab.com/development/documentation/styleguide/): images "supplement the text, not replace it… the reader should not have to rely only on the illustration"; introduce every image with a lead-in sentence; alt "describes the context of the image, not the content", <155 chars, sentence case, no "Image of"; compress to ≤100 KB. Two diagram-specific rules worth stealing: **differentiate with shapes, not color**, and **no links inside diagrams** ("Links embedded in diagrams with click actions are not testable with our link checking tools"). Mermaid diagrams must carry `accTitle:` and `accDescr:` immediately after the diagram type. Vale + markdownlint run in CI.

**GOV.UK** (https://guidance.publishing.service.gov.uk/formatting-content/images/) is the strictest and diverges from everyone else: "Do not use images alone to provide information"; avoid images containing text; infographics require a plain-text version; and for charts and diagrams, **"Leave the alt text field blank"** and put the description in body text beneath the image. Worth knowing as the outer bound — it is a deliberate rejection of alt as the carrier for complex figures, consistent with W3C's own advice.

**W3C / WCAG.** The alt decision tree (https://www.w3.org/WAI/tutorials/images/decision-tree/) routes complex images and graphs to: "Include the information contained in the image elsewhere on the page" — alt is the short name, the page prose is the alternative. SC 1.1.1 Non-text Content is the requirement; **SC 1.4.10 Reflow explicitly exempts** "parts of the content which require two-dimensional layout for usage or meaning… images required for understanding (such as maps and diagrams)" from the 320 CSS px / 256 CSS px bar (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). cairn's docs-register deviation is correctly sourced.

**Mermaid's own accessibility surface** (https://mermaid.js.org/config/accessibility.html): `accTitle:` and `accDescr:` (single-line, or `accDescr { … }` multi-line) emit `<title>`/`<desc>` inside the SVG plus `aria-labelledby`/`aria-describedby` on the root, with `aria-roledescription` set to the diagram type. Supported on all diagram types.

**Mechanical review tooling that actually exists.**
- markdownlint **MD045 / no-alt-text** — fires on any image without alt; skipped when `aria-hidden` is set. https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md
- Vale is markup-aware and can scope rules to image alt text as a scope, but there is no canonical alt-text package; teams write local rules (Grafana's Writers' Toolkit is the best public example: https://grafana.com/docs/writers-toolkit/review/lint-prose/rules/, https://vale.sh/features/markup)
- axe-core catches missing/redundant alt in rendered HTML but cannot judge whether a diagram is legible.
- Nothing off-the-shelf grades a figure's *content*. Every published guide's content criteria (one idea per figure, readable labels, no orphan arrows, consistent legend) are enforced by a human reading the rendered figure in a preview build. Kubernetes says so directly; GitLab says so by requiring the SVG in the PR.

**What cairn already has, for the record.** The docs-register "Visuals" section is already at or above the standard of every guide above: it carries Google's threshold verbatim, the 150-char alt cap, the mandatory caption, the two-part text alternative (in-fence `accTitle`/`accDescr` plus the emphasis-paragraph caption), the ~15-node complexity budget, the `overflow-x: auto` containment rule, the recorded 1.4.10 deviation, and the "themed render or hand-authored SVG, never a drawing-tool screenshot" rule. `scripts/checks/check-visuals.mjs` already enforces the mechanical half over `docs/admin|editors|extend|reference`: accTitle/accDescr presence, the caption paragraph, alt presence and ≤150 chars, HTML `<img alt="">` for decorative, plus the `repro` fence schema. The uncommitted `check:figures` is only `build-site-figures.mjs --check` — a **staleness** gate (regenerated output equals committed output), nothing about the figure itself. `docs/internal/site-figures.md` documents a scratchpad harness that measured smallest rendered font size and text ink crossing its containing box, at both widths in both schemes — **that harness is not gated**, and it is the single highest-value promotion available. The two figure grades under `docs/internal/record/2026-09-04-chassis-inputs/figure-grades/` already implement a fresh-context grading form (per-device verdicts, STRUCTURAL vs COSMETIC, greyscale check for the ownership device, contrast ratios, verbatim fixes, a named verdict), which is `visual-verifier`'s method applied to a figure. And `docs/internal/record/2026-08-16-diagram-theme-harvest-findings.md` records the mermaid mechanic that makes themed mermaid expensive: measure-then-place, so any CSS reaching a label after measurement (chip padding, eyebrow tracking, `overflow-wrap: anywhere`, font substitution) shears the geometry.

## Part 3 — Recommendation for cairn (paste-ready)

### The production path

**Two lanes, and a routing rule that decides which, written down so nobody re-litigates it per figure.**

- **Mermaid fence, themed, is the default.** Every figure that is a graph — a flow, a sequence, a state machine, a dependency, a request path — is a mermaid fence in the page, rendered by cairn-pub's theme. It is diffable, it is reviewable as text in a PR, it costs almost nothing to author, and cairn already owns the themed render and the config pins that make it survive (`flowchart.subGraphTitleMargin`, `gantt.useWidth`, `fontFamily`/`fontSize` in theme variables, never in later CSS).
- **Hand-authored SVG is the exception, and it is earned, not chosen.** A figure goes to SVG when its lesson lives in *arrangement* rather than in *edges*: banding by owner, a boundary, a two-part contrast, anything where "which box contains which" is the point. Mermaid cannot express containment-as-argument, and it cannot be trusted to keep a layout stable across an edit. Both current SVG figures are exactly this case; that is the test, and it is narrow on purpose.
- **Never a third tool.** No D2, no Excalidraw, no drawio, no screenshot of a drawing app. A second text-source language buys a marginally better layout engine and costs a second theme, a second gate, and a second thing a contributor must learn. The docs-register's existing rule already says this; keep it.
- **One visual language across both lanes.** The mermaid theme's palette, the SVG figures' palette, and the site theme are one set of tokens. One stroke weight for ordinary edges and one heavier weight reserved for the subject of the figure. One typeface stack, set in mermaid's theme variables (which participate in measurement) and in the SVG source's shared `<style>`. Differentiate by shape and containment first, color second (GitLab's rule, and the greyscale check in the existing concept-figure grade proves cairn needs it).
- **Source location and rebuild, unchanged from what works.** Mermaid figures are their own source, in the page. SVG figures keep the single-source emitter: `docs/internal/site-figures.svg` → `scripts/figures/build-site-figures.mjs` → `docs/extend/assets/*.svg`, with the generated-file banner and `--check` in CI. If a third SVG figure ever arrives, the one-source rule holds; that is what prevents palette drift between the front door and the docs.
- **Claude's authoring loop.** Draft in the fence or the SVG source, render at the two widths in both schemes, **read the renders**, fix, re-render. The one thing the ecosystem is unanimous on is that the first machine layout is often the final one, so budget the read, not the retry.

### The grading path

**`check:figures` should verify mechanically, and only mechanically:**

1. **Staleness** — every shipped SVG matches what the emitter produces from source. (Already does this. Keep.)
2. **Legibility floor** — render each shipped figure at its documented read width and assert the smallest rendered text is ≥12 CSS px. Measure from the rendered DOM, never from character counts; `site-figures.md` already says so and the harness already exists in scratchpad. Promote it.
3. **Overflow** — assert no text run's ink crosses the right edge of its containing box, and no figure induces page-level horizontal scroll outside its own `overflow-x: auto` figure. This is the same probe as cairn-pub's `diagram-containment-probe.mjs`; one probe should serve both lanes.
4. **Contrast** — assert every text-on-fill pair in the figure clears 4.5:1 and every meaning-bearing stroke clears 3:1, in both schemes. The concept-figure grade found a 1.01:1 fill difference by hand; a machine should have found it.
5. **Palette containment** — assert every color literal in the SVG source resolves to a theme token, so a figure cannot drift off-brand silently.
6. **Node budget** — assert a mermaid fence stays under the register's ~15-node budget.
7. **SVG hygiene** — assert no `<script>`, no `<foreignObject>`, no external `href`, no embedded raster, and (per Kubernetes) no font dependency that a reader's machine might not have.

Alt, caption, and the text alternative stay where they already are, in `check:visuals` — do not split that contract across two gates. Keep the existing rules: alt mandatory and ≤150 chars, naming the kind first, contextual not pixel-descriptive; `alt=""` only via authored HTML; caption as the emphasis paragraph after the fence (or the `caption` key in a `repro` fence); complex diagram gets short alt plus the essential information in body prose. Extend one rule: an SVG figure's sidecar `.md` should be **checked for existence and for the three required sections**, since the shipped alt/caption/alternative for the two SVG figures currently live only in a convention.

**What a fresh-context reviewer checks** (a `figure-verifier` agent, or `visual-verifier` given a figure brief — either way, never the context that drew it):

- Does the figure's stated lesson survive the scramble test? Cover the legend: does the arrangement still teach the lesson? Scramble the arrangement: does the lesson survive? If it survives scrambling, the arrangement is carrying something else. (This is the sharpest thing in the existing concept-figure grade and it should be doctrine.)
- Greyscale the render: does the reading order still land where intended? Is the subject of the figure drawn with the heaviest ink on the canvas?
- Is any device doing double duty — a stroke style that means both "boundary" and "owned by you"?
- One idea per figure. Every arrow labeled. No orphan arrow, no node the prose never mentions. Legend only if an encoding repeats, and the legend renders the same classes the figure uses.
- Does the caption state the code-verified facts the page's contract assigns it, without restating the alt and without a spatial reference?
- Verdict form, already established: per-device MATCHED / COSMETIC / STRUCTURAL, findings ranked, verbatim fixes against the *source* file plus the rebuild command, and a named verdict. Keep it.

**The figure receipt.** Beside each figure page, the same way prose carries a read receipt: the source file and the emitter command, the widths and schemes the figure was rendered at, the measured smallest text size and the measured worst contrast pair, the reviewer's verdict and date, and one line naming the figure's single claim. `docs/internal/site-figures.md` is already 80% of this for the SVG lane; make it a per-figure section and give the mermaid lane the same. A receipt makes the next editor's job "re-measure these three numbers", not "re-derive the standard".

### Skills and plugins to install or write

- **`artifact-diagramming` (Anthropic, bundled)** — invoke it before drawing any hand-authored SVG figure. It is the closest external standard to cairn's SVG lane and it is already installed. No action beyond citing it in the register.
- **`cairn-figure` (write it, repo-scoped)** — the production skill: the routing rule (mermaid vs SVG), the token palette, the stroke/type rules, the emitter commands, the render-at-both-widths-in-both-schemes loop, and the receipt template. It is the missing half of what `visual-fidelity` does for UI ports.
- **`figure-verifier` (write it, user-scoped agent, Opus/Fable, read-only)** — the grading agent, modeled directly on `visual-verifier`'s method and on the two existing figure grades. Fresh context, never the drawer.
- **`check:figures` (finish the uncommitted script)** — the seven mechanical assertions above, sharing the containment probe with cairn-pub.
- **markdownlint MD045** — add if markdownlint runs at all in this repo; it is redundant with `check:visuals`'s alt check but costs nothing and catches images outside the four scanned arms. https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md
- **`svgo --multipass`** — as a build step in the emitter, or as a gate assertion that shipped SVG is already minimal. https://svgo.dev/
- **`@mermaid-js/mermaid-cli` (`mmdc`)** — only if figures ever need to ship pre-rendered inside the npm tarball for a consumer that does not run mermaid. Not needed while cairn-pub renders. https://github.com/mermaid-js/mermaid-cli
- **Do not install:** any community mermaid skill or MCP server. They add browser-launch dependencies and opinions cairn already has in writing, and none of them grade.

## Part 4 — Rejected options, with reasons

| Option | Why rejected |
|---|---|
| **D2 as the text-source language** | Better layout than dagre, and the good engine (TALA) is proprietary; the open-source engines (dagre/ELK) are not enough better to justify a second theme, a second gate, and a second syntax. No native rendering on GitHub. |
| **Graphviz / PlantUML** | Graphviz wins only on large auto-laid-out graphs, which the ~15-node budget forbids by design. PlantUML adds a Java dependency for nothing cairn needs. |
| **Excalidraw / draw.io / Penpot via MCP** | Output is a drawing-tool artifact, not text; it cannot be reviewed in a diff, cannot inherit theme tokens, and cannot be regenerated. The register already bans drawing-tool output, and the MCP servers add a browser-launch dependency to the docs build. |
| **Screenshots of the admin as figures** | Already banned by the register (never an image of text or a vendor UI), and it is the highest-maintenance figure kind in any docs corpus. The `repro` fence exists precisely so a live reproduction is not a screenshot. |
| **Pixel-diff CI on figures (Percy/Argos/`toHaveScreenshot`)** | The figures are deterministic generated output; a staleness check on the SVG text already catches every change, at a fraction of the cost, with a diff a human can read. A pixel baseline would add flake (font rendering across runners) and would tell you *that* something changed, not *what*. Reserve pixel diffing for the showcase's five-viewport suite, where it already lives. |
| **Alt text carrying the full description (GOV.UK's inverse: blank alt for diagrams)** | GOV.UK's blank-alt rule is defensible but conflicts with Google, Microsoft, GitLab, Kubernetes, and the existing register, and would break `check:visuals`. Keep short alt + body-text alternative, which is what the W3C decision tree actually prescribes. |
| **Figure numbering on every figure (Kubernetes' `Figure N.`)** | Kubernetes needs it because its pages cross-reference figures in prose. cairn's register already scopes numbering to pages that cross-reference, which is the right narrower rule. Do not adopt blanket numbering. |
| **A `figure-verifier` that also drew the figure** | The standing family rule, and the two existing grades confirm it earns its keep: the drawer's "matches" is never evidence. |
| **Leaving `check:figures` as a staleness check only** | Staleness is the cheapest and least valuable of the seven assertions. It cannot catch the class of defect the two hand grades actually found (invisible boundary, 1.01:1 fill difference, a label cut mid-word at 720). |

**Cost table**

| Item | Cost |
|---|---|
| Cite `artifact-diagramming` in the docs register | Small |
| Add the mermaid-vs-SVG routing rule to the register | Small |
| Commit the existing `check:figures` staleness gate as-is | Small |
| markdownlint MD045 | Small |
| `svgo --multipass` in the emitter | Small |
| Sidecar `.md` existence + three-section check | Small |
| Figure receipt template, applied to the two existing SVG figures | Small |
| Palette-token containment assertion in `check:figures` | Small |
| Node-budget assertion for mermaid fences | Small |
| SVG hygiene assertions (no script/foreignObject/external href) | Small |
| Promote the scratchpad harness to a gated legibility floor (12 px, both widths, both schemes) | Medium |
| Overflow/containment probe shared with cairn-pub | Medium |
| Contrast assertion in both schemes | Medium |
| Write the `cairn-figure` production skill | Medium |
| Write the `figure-verifier` agent | Medium |
| Per-figure receipts extended to the mermaid lane (11 diagrams) | Medium |
| Re-grade all existing figures against the finished standard | Large |
| Any second text-source diagram language | Large (and rejected) |
| Pixel-diff baselines for figures | Large (and rejected) |

**Sources:** [artifact-diagramming (bundled skill, loaded in session)], [Kubernetes diagram guide](https://kubernetes.io/docs/contribute/style/diagram-guide/) · [source](https://github.com/kubernetes/website/blob/main/content/en/docs/contribute/style/diagram-guide.md), [Google style: images](https://developers.google.com/style/images), [Microsoft: alternative text](https://learn.microsoft.com/en-us/style-guide/accessibility/alternative-text), [Microsoft: graphics, design, media](https://learn.microsoft.com/en-us/style-guide/accessibility/graphics-design-media), [GitLab documentation style guide](https://docs.gitlab.com/development/documentation/styleguide/), [GOV.UK images](https://guidance.publishing.service.gov.uk/formatting-content/images/), [W3C alt decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/), [WCAG 2.2 Reflow (1.4.10)](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Mermaid accessibility directives](https://mermaid.js.org/config/accessibility.html), [markdownlint MD045](https://github.com/DavidAnson/markdownlint/blob/main/doc/md045.md), [Vale markup-aware linting](https://vale.sh/features/markup), [Grafana Writers' Toolkit Vale rules](https://grafana.com/docs/writers-toolkit/review/lint-prose/rules/), [GitHub blog: mermaid in markdown](https://github.blog/developer-skills/github/include-diagrams-markdown-files-mermaid/), [Docusaurus theme-mermaid](https://docusaurus.io/docs/next/api/themes/@docusaurus/theme-mermaid), [Starlight mermaid discussion](https://github.com/withastro/starlight/discussions/1259), [mermaid-cli](https://github.com/mermaid-js/mermaid-cli), [SVGO](https://svgo.dev/), [Mermaid vs D2](https://aaronjbecker.com/posts/mermaid-vs-d2-comparing-text-to-diagram-tools/), [Mermaid vs D2 vs Graphviz](https://diagrams.so/learn/diagram-as-code-comparison), [mermaid C4 layout defects](https://github.com/mermaid-js/mermaid/issues/7492), [mermaid arrow-label overlap](https://github.com/mermaid-js/mermaid/issues/3125), [MermaidSeqBench](https://arxiv.org/pdf/2511.14967), [AI + mermaid practice report](https://www.awesome-testing.com/2025/09/mermaid-diagrams), [Anthropic official plugin marketplace](https://github.com/anthropics/claude-plugins-official), [Claude Code plugin discovery](https://code.claude.com/docs/en/discover-plugins), [mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw), [draw.io MCP server](https://www.drawio.com/docs/manual/generate/drawio-mcp-server/), [claude-mermaid MCP](https://glama.ai/mcp/servers/@veelenga/claude-mermaid), [daymade/claude-code-skills](https://github.com/daymade/claude-code-skills), [drawio vs Excalidraw vs Mermaid vs Penpot](https://mcp.directory/blog/drawio-vs-excalidraw-vs-mermaid-vs-penpot-skills-2026).
