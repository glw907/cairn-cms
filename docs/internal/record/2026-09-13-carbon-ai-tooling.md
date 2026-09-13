# Carbon AI tooling: what's worth bringing into cairn-cms

Survey of IBM Carbon Design System's AI-related guidance and tooling, checked against cairn's
existing toolset (skills, agent definitions, CLAUDE.md fragments, cairn-audit) and its existing
AI surface (the `tidy` copy-edit feature and `aiPosture` robots.txt field).

## 1. Carbon for AI: the AI label and explainability pattern

Carbon for AI is an extension of Carbon built to give AI-generated content in IBM products a
distinct visual identity plus transparency and trust
([carbondesignsystem.com/guidelines/carbon-for-ai](https://carbondesignsystem.com/guidelines/carbon-for-ai/)).
Its center is the **AI label**: a required embedded marker plus an explainability popover on
every AI component, so a user always has a bridge from "this looks AI-touched" to "here is how
this was built"
([web-components.carbondesignsystem.com AI Label docs](https://web-components.carbondesignsystem.com/?path=/docs/components-ai-label--overview)).
AI-variant components carry new color and style tokens so they read as visually distinct from
Core components while inheriting Core's interaction principles
([Medium, Jeannie Servaas, "Carbon for AI: Scaling New Ways of Working"](https://medium.com/carbondesign/carbon-for-ai-scaling-new-ways-of-working-fc6913624667)).

**Applies to cairn.** cairn's admin already has exactly the surface this pattern targets: the
`tidy` copy-edit feature runs a language-model pass over an editor's markdown and stages
accept/reject changes in-buffer
(`/var/home/glw907/Projects/cairn-cms/docs/reference/components.md:691`, the `TidyApi` with
`enter`/`acceptOne`/`rejectOne`/`acceptMany`/`rejectAll`/`exit`). Today that surface is styled as
an ordinary editor affordance, `CairnTidySettings`
(`/var/home/glw907/Projects/cairn-cms/docs/reference/components.md:497`), with no distinct visual
language marking a suggestion as machine-authored versus author-authored, and no
explainability affordance beyond the settings screen's static convention list. Carbon's core
claim, that AI-touched content needs a consistent, recognizable visual marker plus a path to "how
was this built," maps directly onto tidy's in-buffer decorations.

## 2. Developer-facing AI tooling from Carbon/IBM

- **Carbon MCP** (public preview,
  [carbondesignsystem.com/developing/carbon-mcp/overview](https://carbondesignsystem.com/developing/carbon-mcp/overview/),
  onboarding at
  [carbondesignsystem.com/developing/carbon-mcp/onboarding-and-setup](https://carbondesignsystem.com/developing/carbon-mcp/onboarding-and-setup/),
  tracked at
  [carbon-design-system/carbon#20855](https://github.com/carbon-design-system/carbon/issues/20855)):
  a first-party MCP server giving an assistant (Claude Code, Claude Desktop, Cursor, VS Code, IBM
  Bob) lookup access to Carbon's components, tokens, icons, pictograms, and usage guidelines, plus
  code generation conforming to Carbon spec. Usable outside IBM products in principle, but it
  teaches an agent *Carbon's* design language, not DaisyUI/Tailwind's. Not directly consumable by
  cairn since cairn's admin is DaisyUI 5, not Carbon.
- **A community-built "Carbon skill for Claude"** packaging 245 pages of Carbon's own docs
  (`@carbon/react` and `@carbon/web-components`) as an offline, auto-synced Claude Code skill
  ([carbon-design-system/carbon Discussion #22482](https://github.com/carbon-design-system/carbon/discussions/22482)).
  Not usable content-wise (wrong design system), but the *shape* is a direct precedent for
  cairn's own `cairn-admin-screens` skill and the `docs/reference/` + `check:reference` gate:
  package the engine's own reference docs as an agent-loadable, freshness-checked skill. cairn
  already does this; the precedent confirms the pattern rather than adding anything new.
- **carbon-ai-chat** (`github.com/carbon-design-system/carbon-ai-chat`, package
  [`@carbon/ai-chat` on npm](https://www.npmjs.com/package/@carbon/ai-chat), Apache-2.0): an
  open-source, framework-agnostic front-end chat widget (React and web-component builds, plus a
  companion `@carbon/ai-chat-components` primitives package), genuinely decoupled from IBM's own
  backends, but ships with IBM Telemetry collection by default. It's a full conversational-thread
  chat UI, a mismatch for cairn's job (a single-shot inline copy-edit review, not a chat surface),
  and its telemetry-by-default posture cuts against cairn's own logging discipline
  (`docs/reference/log-events.md`, no PII, structured events only). No standalone `@carbon/ai`
  package exists; the AI-labeled npm surface is this chat package and its primitives sibling.
- **`llms.txt` does exist**: [carbondesignsystem.com/llms.txt](https://carbondesignsystem.com/llms.txt)
  publishes a structured Markdown index of Carbon's docs, components, and repos for LLM
  consumption, per the [llms.txt spec](https://llmstxt.org/); the separate Carbon Components
  Svelte implementation ships its own at
  [svelte.carbondesignsystem.com/llms-full.txt](https://svelte.carbondesignsystem.com/llms-full.txt).
  Same verdict as the MCP server: it indexes Carbon's own component vocabulary, not a generic
  pattern cairn's docs need, since cairn's `docs/reference/` is already the equivalent
  agent-facing index for cairn's own surface (gated by `check:reference`).

## 3. Carbon's lint/audit tooling versus cairn-audit's rule shape

- **`stylelint-plugin-carbon-tokens`**
  (`github.com/carbon-design-system/stylelint-plugin-carbon-tokens`,
  [npm](https://www.npmjs.com/package/stylelint-plugin-carbon-tokens)): lints Sass/CSS for
  hand-authored values that should route through Carbon's `@carbon/themes`, `@carbon/colors`,
  `@carbon/layout`, `@carbon/type`, and `@carbon/motion` packages, with rules such as
  `layout-use` and `layout-token-use` flagging a raw value or malformed `calc()` where a layout
  token belongs. The project's own docs mark it a deliberate work in progress that warns rather
  than silently passing on syntax it doesn't yet recognize
  ([GitHub repo](https://github.com/carbon-design-system/stylelint-plugin-carbon-tokens)).
- **Rule-shape comparison, not code reuse.** cairn-audit's `token-colors`, `type-scale`, and
  `gap-scale` rules already do the core thing this Carbon plugin does (flag a raw literal, point
  at the token role that should replace it;
  `/var/home/glw907/Projects/cairn-cms/docs/reference/cairn-audit.md`). The one idea worth
  noting, not adopting outright, is Carbon's "warn on unrecognized syntax rather than silently
  pass" stance for a linter still growing its coverage. cairn-audit's rules are each scoped
  narrowly with an explicit stated exemption boundary (for example `gap-scale` excluding brackets
  whose value isn't a plain length/viewport-unit/`calc()`), which is the same caution expressed
  as a documented boundary instead of a runtime warning; no change needed.
- No Carbon-specific ESLint plugin surfaced in search (only unrelated `eslint-plugin-carbon`-style
  false positives for other "carbon" projects). Carbon's Figma linting is dashboard/plugin
  tooling inside Figma itself, not a CLI artifact; nothing there is portable into a CLI-based
  audit like cairn-audit.

## 4. Carbon's own use of AI in its design-system process

No primary-source account surfaced of the Carbon team using AI to build or maintain Carbon
itself (AI-assisted doc generation, AI-assisted design review, AI-assisted PR review). Searches
tried: "Carbon design system AI-assisted documentation," "IBM Carbon design system generative AI
process," "Carbon design system team AI-assisted documentation OR generative AI process blog
2026." Results returned only third-party commentary on design systems in the AI era generally
(Boldare, Eleken, F1 Studioz), not a Carbon-team publication. Carbon MCP (item 2) is the closest
public artifact, an infrastructure investment in making Carbon agent-consumable, not a published
account of using AI inside Carbon's own contribution or review pipeline.

## Recommendation

| Item | Action | Reasoning |
|---|---|---|
| Carbon for AI label + explainability pattern | **Bring in as a copied pattern**, applied to `tidy`'s in-buffer suggestions and `CairnTidySettings` | cairn already ships the exact surface (LLM-authored copy edits shown to a non-technical editor) this pattern exists for; a distinct visual marker plus an explainability affordance is a design-system-level admin recipe, on point for `docs/internal/admin-design-system.md`, not a new engine feature |
| Carbon MCP | **Ignore** | teaches an agent Carbon's own component set; cairn's admin is DaisyUI/Tailwind, so the tool has no target surface here |
| "Carbon skill for Claude" precedent | **Ignore as content, note as validation** | confirms cairn's existing `cairn-admin-screens` skill + `check:reference` gate is the right shape; nothing to change |
| carbon-ai-chat | **Ignore** | chat-widget product outside cairn's scope, and its default telemetry collection conflicts with cairn's no-PII logging stance |
| Carbon `llms.txt` | **Ignore** | indexes Carbon's own component vocabulary; cairn's `docs/reference/` plus `check:reference` already is the agent-facing index for cairn's surface |
| `stylelint-plugin-carbon-tokens` | **Watch, no action** | cairn-audit's static rules already cover the same ground (raw-value-to-token flagging) at comparable or tighter granularity; nothing new to port |
| Carbon Figma linting | **Ignore** | Figma-native, not CLI-portable, and cairn ships no Figma artifacts |
| Carbon's own AI-assisted process | **Ignore, nothing found** | no primary source exists to learn from; revisit only if IBM publishes one |
