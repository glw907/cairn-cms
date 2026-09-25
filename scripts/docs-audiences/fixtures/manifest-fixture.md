# Docs exemplar corpus: manifest (fixture)

Lines cut from the real manifest (`docs/internal/record/docs-exemplars.md`), assembled to exercise
every opening-line variant, every slug form, the method-source paragraph, an indented prose false
positive, and the pinned Verdict line form (the real manifest carries no Verdict lines yet; these
are added here for the test). Every non-Verdict, non-blank line below this preamble is copied
verbatim from the real manifest.

## Editors

Root: `~/.local/share/cairn/exemplars/editors/`. The one tested source is GOV.UK's publisher guidance. It serves about 3,000 non-developer CMS publishers and was tree-tested and usability-tested in a 2026 private beta (https://insidegovuk.blog.gov.uk/2026/06/08/launching-gov-uks-new-content-and-publishing-guidance/). Every other pick is reputation only. Mozilla's KB writing guide, which Mozilla says it drew from "our research", is captured as a method source (`mozilla-kb-writing-guide/`) and is not an exemplar. SUMO articles themselves sit behind a bot challenge and could not be captured.

- **How to create and update content for GOV.UK**: https://guidance.publishing.service.gov.uk/. Local path: `govuk-publishing-guidance-home/`. Evidence: the tree test and private beta cited above.
  - **Verdict (`govuk-publishing-guidance-home/`):** kept

- **How to use Google Docs**: https://support.google.com/docs/answer/7068618. Local path: `google-docs-get-started/`. Reputation only.
  - **Verdict (`google-docs-get-started/`):** rejected (too thin for the profile)

- **Substack sign-in, two short pages**: https://support.substack.com/hc/en-us/articles/360059542452 and https://support.substack.com/hc/en-us/articles/4474505704596. Local paths: `substack-log-in/` and `substack-app-login-link/`, both Wayback captures. Reputation only.
  - **Do not copy:** the password path and the Zendesk Q&A title style.

- **Verdict (`mozilla-kb-writing-guide/`):** kept

## Designers

Captures live under `~/.local/share/cairn/exemplars/designers/<slug>/`. The shapes this reader needs are a task guide, a concept page, and a reference entry. No tutorial is included because the reader already knows CSS. No troubleshooting page is included because design failures show up on screen and read as concept gaps.

- **Create a theme (Shopify)** — https://shopify.dev/docs/storefronts/themes/getting-started/create — `designers/shopify-create-theme/` — reputation only.

## Extenders

Base path: `~/.local/share/cairn/exemplars/extenders/`. Where the rendered HTML dropped code blocks, `page.md` is the publisher's own markdown view or docs source (noted in each `meta.json` as `page_md_source`).

- **Payload: Swap in your own React components** — https://payloadcms.com/docs/custom-components/overview — `payload-custom-components/` — reputation only.

## Operators

Root: `~/.local/share/cairn/exemplars/operators/`. Evidence note: none of these pages has published outcome research. GitHub and Cloudflare publish the content models their pages follow. That is evidence of deliberate design, not of measured reader success. Everything else is reputation only.

- **Managing your personal access tokens**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens, `github-pat/`. Evidence of design: https://docs.github.com/en/contributing/style-guide-and-content-model/about-the-content-model

## Core

Root: `~/.local/share/cairn/exemplars/core/`. Shapes chosen: architecture overview, task guide (set-up and contribution flow), reference table (gates), agent-facing contributor file. Concept and tutorial shapes are left out on purpose: a core contributor needs the map and the contract, not an on-ramp.

- **rust-analyzer Architecture** — https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/docs/book/src/contributing/architecture.md — `core/rust-analyzer-architecture/` — reputation only; it is the reference implementation of the matklad essay below.
  - **Do not copy:** The crate-level granularity and Rust vocabulary. cairn maps `src/lib/` subpaths, `tool/`, `examples/showcase`, and `templates/` instead.

## Evaluators

Shapes chosen: front door / overview, three concept-page variants (scope, architecture, security model), plus a support-promise page. Evaluators do not need tasks, tutorials, or troubleshooting pages. Local root: `~/.local/share/cairn/exemplars/evaluators/`.

- **About SQLite**: https://www.sqlite.org/about.html. Local copy: `sqlite-about/`. Evidence: reputation only (widely cited as a model of plain product self-description).
