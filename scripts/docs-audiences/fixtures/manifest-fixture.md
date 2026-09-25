# Docs exemplar corpus: manifest (fixture)

Lines cut from the real manifest (`docs/internal/record/docs-exemplars.md`), assembled to exercise
every opening-line variant, every slug form, the method-source paragraph, an indented prose false
positive, and the pinned Verdict line form (the real manifest carries no Verdict lines yet; these
are added here for the test).

## Editors

Root: `~/.local/share/cairn/exemplars/editors/`. The one tested source is GOV.UK's publisher guidance. Mozilla's KB writing guide, which Mozilla says it drew from "our research", is captured as a method source (`mozilla-kb-writing-guide/`) and is not an exemplar.

- **How to create and update content for GOV.UK**: https://guidance.publishing.service.gov.uk/. Local path: `govuk-publishing-guidance-home/`. Evidence: the tree test and private beta cited above.
  - **Do not copy:** the dated what's-new block (cairn's help has no changelog reader) and the beta feedback banner.
  - **Verdict (`govuk-publishing-guidance-home/`):** kept
- **Substack sign-in, two short pages**: https://support.substack.com/hc/en-us/articles/360059542452 and https://support.substack.com/hc/en-us/articles/4474505704596. Local paths: `substack-log-in/` and `substack-app-login-link/`, both Wayback captures. Reputation only.
  - **Do not copy:** the password path and the Zendesk Q&A title style. cairn maps `src/lib/` subpaths, `tool/`, and `examples/showcase` instead.
  - **Verdict (`substack-log-in/`):** rejected (too thin for the profile)
- **How to use Google Docs**: https://support.google.com/docs/answer/7068618. Local path: `google-docs-get-started/`. Reputation only.
  - **Do not copy:** the thinness.
- **Verdict (`mozilla-kb-writing-guide/`):** kept

## Designers

Captures live under `~/.local/share/cairn/exemplars/designers/<slug>/`. The shapes this reader needs are a task guide, a concept page, and a reference entry.

- **Create a theme (Shopify)** — https://shopify.dev/docs/storefronts/themes/getting-started/create — `designers/shopify-create-theme/` — reputation only.
  - **Moves that make it work:** The first step clones a minimal reference theme (Skeleton) rather than starting from nothing.

## Extenders

Base path: `~/.local/share/cairn/exemplars/extenders/`. Where the rendered HTML dropped code blocks, `page.md` is the publisher's own markdown view or docs source.

- **Payload: Swap in your own React components** — https://payloadcms.com/docs/custom-components/overview — `payload-custom-components/` — reputation only.
  - **Do not copy:** the React Server Components and import-map machinery.

## Evaluators

Shapes chosen: front door / overview, three concept-page variants (scope, architecture, security model), plus a support-promise page. Local root: `~/.local/share/cairn/exemplars/evaluators/`.

- **About SQLite**: https://www.sqlite.org/about.html. Local copy: `sqlite-about/`. Evidence: reputation only (widely cited as a model of plain product self-description).
  - **Do not copy:** the "most widely deployed" boast, which cairn cannot claim.
