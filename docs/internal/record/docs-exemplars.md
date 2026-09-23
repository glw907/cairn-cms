# Docs exemplar corpus: manifest

The drafters' primary input for the docs reset (spec
[`2026-09-23-docs-reset-design.md`](../../superpowers/specs/2026-09-23-docs-reset-design.md),
ruling 13 and pass 2a stage 3). Captured pages live outside the repository at
`~/.local/share/cairn/exemplars/<audience>/<slug>/` (`page.html`, `page.md`, `meta.json`); this
file keeps only the manifest. A lost capture is rebuilt from the URL here.

Built 2026-09-23 by six research agents, one per audience, against a shared brief. The editor
slice keys to the register's editor profile, which is stable. The other five key to provisional
profiles; pass 2a's corpus stage reviews them against the approved audience record rather than
rebuilding. Evidence is marked per pick; most picks rest on reputation, and the manifests say so.
Only the editor slice's GOV.UK publisher guidance has published user testing behind it.

Captures are copyrighted pages held for study; drafters imitate structure and moves and quote
sparingly. Two capture notes carry forward: where `page.md` lost code blocks, the entry or its
`meta.json` names the better source, and diagram-led pages (Every Layout, CUBE) lose their
figures in `page.md`.

## Editors

Root: `~/.local/share/cairn/exemplars/editors/`. The one tested source is GOV.UK's publisher guidance. It serves about 3,000 non-developer CMS publishers and was tree-tested and usability-tested in a 2026 private beta (https://insidegovuk.blog.gov.uk/2026/06/08/launching-gov-uks-new-content-and-publishing-guidance/). Every other pick is reputation only. Mozilla's KB writing guide, which Mozilla says it drew from "our research", is captured as a method source (`mozilla-kb-writing-guide/`) and is not an exemplar. SUMO articles themselves sit behind a bot challenge and could not be captured.

### Front door / welcome

- **How to create and update content for GOV.UK**: https://guidance.publishing.service.gov.uk/. Local path: `govuk-publishing-guidance-home/`. Evidence: the tree test and private beta cited above.
  - **Structure:** a one-line promise, then "What's new", then three featured cards (title, one-line job, action link).
  - **Moves:** each card names the reader's job ("Get help deciding which type to use") rather than a feature. The page runs about 120 words and routes the reader instead of explaining.
  - **Do not copy:** the dated what's-new block (cairn's help has no changelog reader) and the beta feedback banner.
- **WordPress Editor**: https://wordpress.com/support/wordpress-editor/. Local path: `wordpresscom-editor-overview/`. Reputation only.
  - **Structure:** what the editor is for, then pages versus posts in two sentences, then "two editing surfaces, choose the one that matches what you want to change", then how to open each.
  - **Moves:** it separates "changes the whole site's design" from "changes this one page" early. That separation is the reassurance cairn needs: the editor cannot break the design. Each surface ends in a short numbered path.
  - **Do not copy:** Site Editor, templates, plugins, and plan upsells. A cairn editor never touches design.
- **How to use Google Docs**: https://support.google.com/docs/answer/7068618. Local path: `google-docs-get-started/`. Reputation only.
  - **Structure:** a one-sentence definition, then Step 1 create, Step 2 edit (with undo), Step 3 share.
  - **Moves:** it orients through the first three things a person does, not a feature tour. Undo appears in the first editing step. A touchscreen note covers the any-device arrival.
  - **Do not copy:** the thinness. The steps say nothing about where the work goes. cairn's welcome must say what saving and publishing do.

### Task guide

- **Publish standard content types**: https://guidance.publishing.service.gov.uk/publish-update-retire-content/standard-content-types/publish-standard/. Local path: `govuk-publish-standard/`. Evidence: the GOV.UK beta cited above.
  - **Structure:** the permission you need; publish someone else's draft; urgent publish; "How long content takes to go live"; what happens after.
  - **Moves:** closest analogue in the set. It states the delay ("updates … go live in up to 5 minutes") and then answers the panic that follows: "If a page does not seem to have been updated…", with two checks the reader can run. It says who gets told ("The person who created the draft will get an email either way").
  - **Do not copy:** roles, force-publish, cache-busting URLs, and email-subscriber mechanics.
- **Schedule a post or page**: https://wordpress.com/support/schedule-a-post-or-page/. Local path: `wordpresscom-schedule-post/`. Reputation only.
  - **Structure:** outcome sentence, numbered steps, "you can confirm … by", then variants (backdate, reschedule, cancel), then "If your scheduled post does not appear".
  - **Moves:** the confirmation step tells the reader what state the entry is now in (status shows "scheduled"). Each variant is its own short section. A two-question troubleshooting tail sits on the task page itself.
  - **Do not copy:** the video embed, the timezone setting, and subscriber notifications. cairn has no scheduling.
- **Find what's changed in a file**: https://support.google.com/docs/answer/190843. Local path: `google-docs-version-history/`. Reputation only.
  - **Structure:** a one-line capability, then one H2 per verb (view, restore, copy), each a short numbered list.
  - **Moves:** every procedure starts from the same anchor ("open a document … click Last edit"), so a mid-task reader can land on any section. The preconditions sit in an **Important** box before the steps.
  - **Do not copy:** product-specific limits (Vids, Sheets rows) and the "On your computer" platform branching.

### Troubleshooting

- **Recover lost content**: https://wordpress.com/support/recover-lost-content/. Local path: `wordpresscom-recover-lost-content/`. Reputation only.
  - **Structure:** reassurance ("often still recoverable"), a do-no-harm warning, then ordered checks from most to least common, then short FAQs.
  - **Moves:** this is the fear-first model. The first instruction is "keep the editor tab open and do not refresh it", which stops the reader making things worse before they diagnose. Each check ends with what to do if it finds nothing. It names non-disasters ("a draft started as a page does not appear under Posts").
  - **Do not copy:** backups, plans, plugins, and multi-site accounts.
- **Recover your Word files and documents**: https://support.microsoft.com/en-us/word/recover-your-word-files-and-documents. Local path: `microsoft-word-recover-files/`. Reputation only; it is written to the Microsoft style guide, which is this audience's style floor.
  - **Structure:** what happens automatically, then how to choose which recovered file to keep, then delete and close.
  - **Moves:** it opens by saying the product already acted for you. It labels the choices with their risk ("Yes, I want to view these files later (safest option)"). It helps the reader choose between versions by date.
  - **Do not copy:** the OneDrive upsell tip and the file-system paths.
- **Substack sign-in, two short pages**: https://support.substack.com/hc/en-us/articles/360059542452 and https://support.substack.com/hc/en-us/articles/4474505704596. Local paths: `substack-log-in/` and `substack-app-login-link/`, both Wayback captures. Reputation only.
  - **Structure:** how the emailed link works, then "I'm not seeing the login email link – what can I do?" as a numbered checklist.
  - **Moves:** this is the direct match for a cairn sign-in link. The page states the link's limits plainly ("can only be used once and will expire after one hour"). The checks run cheapest first: spam, the email address you typed, contacts, the Gmail Promotions tab. It names when the fault lies with the email provider.
  - **Do not copy:** the password path and the Zendesk Q&A title style.

### Concept

- **Understand pages, posts, and templates**: https://wordpress.com/support/post-vs-page/. Local path: `wordpresscom-post-vs-page/`. Reputation only.
  - **Structure:** a definition sentence for all three terms, then one section each, then "Think of it this way" (content versus frame).
  - **Moves:** the answer comes first. Each term gets an example the reader already knows (About, Contact) and its visible trace (the URL shape). One closing analogy holds the model.
  - **Do not copy:** templates, custom post types, and plugin content. For cairn, "what kinds of entry this site has" is site-defined.
- **Restore a revision of a page or post**: https://wordpress.com/support/page-post-revisions/. Local path: `wordpresscom-revisions/`. Reputation only.
  - **Structure:** how autosave works, what "Saved" means, how saving differs on published content, then the revision history.
  - **Moves:** this is the model for cairn's hardest concept, that saving is not publishing. "Autosave … will not overwrite the published content. The changes will not be displayed on the site until you click Save." It quotes the on-screen status labels verbatim, so the reader can match the page to the screen.
  - **Do not copy:** the timings, local-storage mechanics, and colour-coded diff details.

### Reference entry

- **Links (text formatting)**: https://guidance.publishing.service.gov.uk/formatting-content/text-formatting/links/. Local path: `govuk-formatting-links/`. Evidence: the GOV.UK beta cited above.
  - **Structure:** the rule in one sentence, one example, then one H2 per variant (email, anchor, right-to-left).
  - **Moves:** it teaches plain-text formatting to non-developers without naming a syntax. It describes the characters ("square brackets [] … round brackets ()") and gives the one failure mode inline ("no spaces between the brackets or the link will not work").
  - **Do not copy:** the internal admin URLs. The sibling Text formatting index names "Govspeak"/"Markdown"; cairn's profile bans the syntax names.
- **Format your messages in Slack with markup**: https://slack.com/help/articles/360039953113. Local path: `slack-format-with-markup/`. Reputation only.
  - **Structure:** what changes when you type formatting marks yourself, then a two-column table (formatting, what to type).
  - **Moves:** the table is written as instructions ("Surround text with asterisks"), not as a symbol list. The "what to expect" bullets come before the table.
  - **Do not copy:** the preference toggle and code blocks.

### Gaps

- **Tutorial step:** skipped on purpose. An editor arrives mid-task, and the welcome page covers first use.
- **Tested exemplars:** outside GOV.UK there is no published user-testing evidence. WordPress.com, Google, Microsoft, Slack, and Substack are reputation only.
- **Troubleshooting for "I published but the site hasn't changed":** no strong standalone page. GOV.UK's "How long content takes to go live" section is the nearest.
- **Mozilla SUMO articles:** blocked by a client challenge. Only the writing guide was captured, via the Wayback Machine.

## Operators

Root: `~/.local/share/cairn/exemplars/operators/`. Evidence note: none of these pages has published outcome research. GitHub and Cloudflare publish the content models their pages follow. That is evidence of deliberate design, not of measured reader success. Everything else is reputation only.

### Task guide (multi-platform, setup, domain)

- **Starting Syncthing Automatically**: https://docs.syncthing.net/users/autostart.html, `syncthing-autostart/`. Reputation only.
  - **Structure:** H1, then `## Windows`, `## macOS`, `## Linux` as peer sections. Each holds its own methods (Task Scheduler / Startup folder / service; Homebrew / launchd; desktop / supervisord / systemd), and the Linux section ends with status, journal, and debugging.
  - **Moves that make it work:** Each platform gets its own native mechanism, never a translated copy of another platform's steps. Inside a platform it names the fork up front ("system service or user service") and says which reader each is for (server or desktop). Every setup ends with a check-it-worked step (`systemctl status`) and a read-the-logs step (`journalctl -e`). That maps directly onto `cairn` scheduled checks.
  - **Do not copy:** its length and the third-party-tool asides. cairn needs one recommended method per platform, with alternatives cut or linked.
- **Get started with 1Password CLI**: https://developer.1password.com/docs/cli/get-started/, `onepassword-cli-get-started/` (page.md is the site's MDX source, with the tabs intact). Reputation only.
  - **Structure:** numbered `## Step N` headings (install, turn on the integration, sign in), with Mac/Windows/Linux tabs and package-manager sub-tabs inside each step, then next steps.
  - **Moves that make it work:** the platform split lives inside a step, so the task's sequence stays shared. Requirements come first, per platform. Every install ends with a version command as the success signal. Commands sit in their own blocks, one command per block.
  - **Do not copy:** tabs, which hide equal platforms and cannot be printed. The operator profile wants three visible, equal sections. Also skip the desktop-app biometric flow.
- **Install Ghost on Ubuntu**: https://ghost.org/docs/install/ubuntu/, `ghost-install-ubuntu/` (code blocks are lost in page.md, so use page.html). Reputation only.
  - **Structure:** overview (who it is for and not for), prerequisites (stack, 1 GB server, domain), server setup, install the CLI, install, one H4 per install prompt, maintenance, "What to do if the install fails", next steps.
  - **Moves that make it work:** a hard prerequisite that must happen early is stated before step one (the DNS A record, "so that SSL can be configured"). Each interactive prompt gets its own heading, which suits the `cairn` setup command. A named recovery section covers both failure modes: a total failure (uninstall, then retry) and an interrupted run (re-run setup).
  - **Do not copy:** the VPS and NGINX stack, and the jokey closing line.
- **Custom Domains (Workers)**: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/, `cloudflare-workers-custom-domains/`. Evidence of design: https://developers.cloudflare.com/style-guide/documentation-content-strategy/content-types/how-to/
  - **Structure:** background, "Add a Custom Domain" with dashboard and config-file variants, then behavior sections (matching, certificates, www redirect, migrating from Routes).
  - **Moves that make it work:** the Caution sits before the step, not after it (for example, a conflict with existing DNS records). It offers a dashboard path and a config-as-code path for the same outcome, which fits both a volunteer and a platform team. Certificate timing is stated as a fact the reader can wait on.
  - **Do not copy:** the Worker-to-Worker and Routes-migration sections, which are developer concerns.

### Credential / token-scopes page

- **Managing your personal access tokens**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens, `github-pat/`. Evidence of design: https://docs.github.com/en/contributing/style-guide-and-content-model/about-the-content-model
  - **Structure:** about (types, limits, keeping tokens secure), create fine-grained (14 numbered steps), permission tables, create classic, delete, use on the command line.
  - **Moves that make it work:** every scope step carries a least-privilege instruction ("choose the minimal repository access"). The security section comes before creation. Pending approval, an outcome the reader might not expect, is explained right after the step that causes it. Deletion is a first-class task.
  - **Do not copy:** its length, and the two token types side by side. cairn should document one recommended token and list its exact scopes in a table.
- **Create API token (Cloudflare)**: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/, `cloudflare-create-token/`. Design evidence as above.
  - **Structure:** one numbered procedure (choose the token kind, open the dashboard, pick a template, set permissions, set resources, add optional IP and TTL limits, review, create, copy), then a verify command.
  - **Moves that make it work:** "only shown once" sits as a Warning at the copy step, before the reader leaves the page. The page ends with a verify call whose response is the success signal. A pattern to lift for `cairn`: after minting, run the check command and expect `active`. It also explains Edit and Read in one sentence each.
  - **Do not copy:** the dashboard screenshots, which go stale, and the user-token versus account-token fork unless cairn has one.

### Troubleshooting / symptom page

- **Troubleshooting custom domains and GitHub Pages**: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages, `github-pages-troubleshoot-domains/`. Evidence of design: https://docs.github.com/en/contributing/style-guide-and-content-model/troubleshooting-content-type
  - **Structure:** one H2 per symptom class (CNAME errors, DNS misconfiguration, unsupported domains, HTTPS errors, browser cache, domain taken), each holding its causes and fixes.
  - **Moves that make it work:** headings are named for what the reader sees, not for internals. It gives expected wait times ("up to an hour" for HTTPS), which stops premature re-work. It names a tool to verify with (`dig`). The one dangerous practice, wildcard DNS and the domain-takeover risk it creates, gets a Warning.
  - **Do not copy:** the "contact your DNS provider" dead end with no next step.
- **ERR_TOO_MANY_REDIRECTS**: https://developers.cloudflare.com/ssl/troubleshooting/too-many-redirects/, `cloudflare-too-many-redirects/`. Evidence of design: https://developers.cloudflare.com/style-guide/documentation-content-strategy/content-types/troubleshooting/
  - **Structure:** the exact error string as the H1, when it appears, a one-line cause, a list of common causes that link to the sections below, then one section per cause with a diagram and a fix.
  - **Moves that make it work:** the title is the literal message the reader will paste into search. The cause list doubles as a triage order. Each fix offers two options ("remove the origin redirect, or raise the mode to Full"). A small flowchart shows the loop. That diagram earns its place because a loop is hard to picture from prose.
  - **Do not copy:** the Cloudflare-specific SSL modes (link to Cloudflare for those).

### Reference entry (exit codes and JSON output, the agent half)

- **restic Scripting**: https://restic.readthedocs.io/en/stable/075_scripting.html, `restic-scripting/`. Reputation only. It is widely used as a backup-automation contract.
  - **Structure:** environment variables, then a scripted idempotency check, then an exit-code table, then JSON output (the exit-error object, single-document versus JSON-lines formats, type mapping), then per-command message tables (field, meaning, type).
  - **Moves that make it work:** a MUST rule: "If an unknown exit code is returned, then it MUST be treated as a command failure." It tags each code with the version that introduced it. Fatal errors arrive as a typed JSON object on stderr that carries the code. It states the compatibility promise for JSON: fields may be added, never broken. This is the model for `cairn --json`.
  - **Do not copy:** the "feel free to submit a pull request" gaps. cairn's contract should be complete.
- **gh help exit-codes** and **gh help formatting**: https://cli.github.com/manual/gh_help_exit-codes, https://cli.github.com/manual/gh_help_formatting, `gh-exit-codes/`, `gh-formatting/`. Reputation only.
  - **Structure:** exit codes as a four-item list. Formatting as prose on `--json`, then `--jq`, then `--template`, with examples.
  - **Moves that make it work:** it is very short. Exit codes follow the shell convention, with meanings (0, 1, 2 cancelled, 4 auth needed). Running `--json` with no fields lists the available fields, a discoverability affordance worth copying. The formatting page states that output is pretty-printed only on a TTY.
  - **Do not copy:** "a command may have more exit codes, check its docs", a hedge an agent cannot act on. Also skip Go templates.

### Gaps

- **Cost-first pages:** no exemplar states money cost before a step. Ghost lists server size and Cloudflare lists caution notes, but neither names a price. The drafter must invent the "this step costs X / cannot be undone" callout pattern from the profile.
- **Visible equal platform sections:** Syncthing is the only strong one, and 1Password uses tabs. No exemplar schedules the same CLI check on all three OSes (cron/systemd timer, launchd, Task Scheduler). Syncthing's service setup is the closest match.
- **Reading logs:** no dedicated operator log page was captured. Syncthing's journal subsection is the nearest move.
- **Outcome evidence:** none found for any pick. Concept and landing shapes were skipped as low-need for this audience.

## Designers

Captures live under `~/.local/share/cairn/exemplars/designers/<slug>/`. The shapes this reader needs are a task guide, a concept page, and a reference entry. No tutorial is included because the reader already knows CSS. No troubleshooting page is included because design failures show up on screen and read as concept gaps.

### Task guide

- **Create a theme (Shopify)** — https://shopify.dev/docs/storefronts/themes/getting-started/create — `designers/shopify-create-theme/` — reputation only.
  - **Structure:** "What you'll learn", then Requirements, then five numbered steps (init from a starter theme, dev server, push, publish), then Next steps.
  - **Moves that make it work:** The first step clones a minimal reference theme (Skeleton) rather than starting from nothing. That is the closest analog to cairn's chassis. Each step names one CLI verb and links it to its reference page, so the guide never re-documents flags. A Caution sits right beside the irreversible act (publish goes live), not in a warnings section at the top. Next steps hands off to concept pages, not more tasks.
  - **Do not copy:** The optional AI-toolkit step with its per-editor tabs, and the Chrome-only preview note. Leave out store, merchant, and Liquid vocabulary. Cairn's deploy is a git push, not a publish command.

- **Styles and CSS (Astro)** — https://docs.astro.build/en/guides/styling/ — `designers/astro-styling/` — process evidence: Astro's docs team writes pages from real support questions ("answer with documentation") and requires peer review on every PR (https://www.rainsberger.ca/blog/community-driven-astro-docs/, https://contribute.docs.astro.build/about-docs/how-we-doc/).
  - **Structure:** How styling works in components (scoped, global, variables), then external stylesheets, then cascading order, then Tailwind, preprocessors, and Markdown styling.
  - **Moves that make it work:** It shows "This CSS" and then "Compiles to this", so the reader sees the scoping mechanism instead of taking it on trust. It states the practical consequence outright ("it is okay to use low-specificity selectors like `h1 {}`"). "Cascading Order" answers the designer's real question, which rule wins when layout, component, and import all style one element. "Markdown Styling" covers content the designer does not write, which is exactly cairn's `render(md)` output.
  - **Do not copy:** The breadth. It covers every preprocessor and framework, and cairn's page should cover only the chassis stack. Link to Svelte's own docs for scoped `<style>` rather than re-explaining it.

### Concept page

- **Layouts (Astro)** — https://docs.astro.build/en/basics/layouts/ — `designers/astro-layouts/` — same Astro process evidence as above.
  - **Structure:** A definition, then "there is nothing special about a layout component", then a sample layout, Markdown layouts with the props they receive, and nesting layouts.
  - **Moves that make it work:** It demystifies before it explains: a layout is an ordinary component with a slot. One full sample layout plus the page that uses it, each captioned with its file path. It gives a bulleted list of exactly what a Markdown layout receives (`frontmatter`, `headings`, `url`), which is the contract a designer builds against. Nesting (a BaseLayout that wraps a BlogPostLayout) is shown as the scaling pattern.
  - **Do not copy:** Astro's `layout:` frontmatter key and MDX specifics. SvelteKit's `+layout.svelte` is the mechanism, so link to SvelteKit's routing docs and explain only what cairn adds.

- **Composition (Every Layout)** — https://every-layout.dev/rudiments/composition/ — `designers/every-layout-composition/` — reputation, widely cited, with a practitioner review at https://fuzzylogic.me/posts/relearn-css-layout-every-layout/. Its diagrams are not in `page.md`.
  - **Structure:** It names a principle (composition over inheritance), shows a worked counter-example (namespaced `.dialog` CSS), then introduces primitives, then "intrinsically responsive".
  - **Moves that make it work:** It shows the wrong way first, with concrete BEM code, and names the cost ("where most CSS bloat comes from"). It rebuilds the same dialog from primitives, then reuses those primitives for a form and a slide, which proves the claim by reuse. Each primitive gets a one-clause job ("space elements vertically"). It frames `@media` breakpoints as "manual overrides", a stance cairn's chassis shares.
  - **Do not copy:** The programming-language analogies (Booleans, the 26-letter alphabet). They fit a developer, not a designer. Also skip the pitch for the paid book.

- **Composition (CUBE CSS)** — https://cube.fyi/composition — `designers/cube-composition/` — reputation only. Its diagrams are not in `page.md`.
  - **Structure:** The layer's job, "why macro-level", paired "what it should do" and "what it shouldn't do" lists, then two examples (a skeleton layout, then flow and rhythm).
  - **Moves that make it work:** The should and shouldn't lists draw the boundary crisply (composition never sets colour or decoration). That is the exact line cairn's chassis primitives hold against the theme. It is short, about 550 words. The `.flow > * + *` snippet is followed by the in-context override (`--flow-space`), which shows the primitive is tunable without being forked. It swaps one component into the skeleton (a card becomes a CTA) to show the layout holds.
  - **Do not copy:** CUBE's bracket-grouping class syntax, and the "extends CSS" framing.

### Reference entry

- **Theme variables (Tailwind CSS)** — https://tailwindcss.com/docs/theme — `designers/tailwind-theme/` — reputation only.
  - **Structure:** An overview (what tokens are, and why `@theme` rather than `:root`), then a namespace table, then customizing (extend, override, custom), then usage (CSS, arbitrary values, JS), then the full default-variable reference.
  - **Moves that make it work:** Every token namespace maps to the utilities it creates in a two-column table, so the reader looks up rather than reads. Each code block carries its filename (`app.css`). A small "Why X instead of Y?" subsection pre-empts the expert's objection. The exhaustive dump of default values comes last, below the explanation.
  - **Do not copy:** Utility-class generation, which is Tailwind-specific. Cairn's public side is design-agnostic, so a cairn token page lists the chassis custom properties and what reads them.

- **Structure (Ghost themes)** — https://ghost.org/docs/themes/structure/ — `designers/ghost-themes-structure/` — reputation only. Its reader is a Handlebars theme designer, which matches this profile well.
  - **Structure:** An annotated file tree with required files marked, then one short entry per template (what it renders and what it falls back to), then required helpers, then styling.
  - **Moves that make it work:** The tree comes first, with `[required]` inline, so the minimum viable theme is visible at a glance. Each template entry states its fallback ("If not specified, `index.hbs` is used"), which answers "what if I skip this". The Styling note warns about the collision between theme CSS and post-content CSS. That warning maps directly to styling cairn's `render(md)` output.
  - **Do not copy:** Handlebars helpers, `package.json` theme config, and Ghost's contexts and routing layer.

- **clamp() (MDN)** — https://developer.mozilla.org/en-US/docs/Web/CSS/clamp — `designers/mdn-clamp/` — reputation. MDN runs user research for its Learn area (https://developer.mozilla.org/en-US/blog/curriculum-learn-web-development), not for reference pages specifically.
  - **Structure:** A Baseline badge, a one-sentence definition, "Try it", then Syntax and Parameters, Examples, Accessibility, Specifications, Browser compatibility, and See also.
  - **Moves that make it work:** The definition comes first and the parameters come second, each defined in one line. There is a dedicated Accessibility section with a testable rule (max at least 2x min, so text survives 200% zoom), linked to the WCAG criterion. The support status sits at the top. This is the model for a fluid-type-token reference entry.
  - **Do not copy:** The formal-grammar block, and the interactive "Try it" widget, which cairn's docs cannot host.

### Gaps

- **Theme port or customization walkthrough.** No external page walks a designer from a starter structure to a finished custom theme at a quality worth imitating. Shopify stops at setup, and Ghost's tutorials are blog posts. A cairn "port a theme onto the chassis" guide will lean on Shopify's step shape plus the visual-fidelity method.
- **Design-token reference for a design-agnostic system.** Tailwind's page is utility-bound, and Open Props was not evaluated.
- **Fluid type.** Utopia's writing is blog-register and the page lacks a doc shape, so it was dropped. MDN `clamp()` covers the reference half.
- **Agent half.** No exemplar is written for a coding agent that builds a theme. Shopify's AI-toolkit tabs show only that such a thing exists, and are not a model to imitate.

## Extenders

Base path: `~/.local/share/cairn/exemplars/extenders/`. Where the rendered HTML dropped code blocks, `page.md` is the publisher's own markdown view or docs source (noted in each `meta.json` as `page_md_source`).

### Concept page

- **Payload: Swap in your own React components** — https://payloadcms.com/docs/custom-components/overview — `payload-custom-components/` — reputation only.
  - **Structure:** one-paragraph premise (the admin is minimal so you can replace parts), then Defining (paths, config, import map), Building (default props, client vs server, config access, styles), Performance.
  - **Moves that make it work:** names the seam's mechanism (a path string resolved through a generated import map) before any how-to; states the default (server component) and the exact condition that flips it; lists the props every custom component receives, so an agent never reads source to find them.
  - **Do not copy:** the React Server Components and import-map machinery; the length (a concept page for cairn should stop before the performance tips).
- **Cloudflare Workers: Bindings (env)** — https://developers.cloudflare.com/workers/runtime-apis/bindings/ — `cf-workers-bindings/` — reputation only.
  - **Structure:** "What is a binding?" as capability grant, one config plus one handler example, then how changes apply, how to reach `env`, and overriding it.
  - **Moves that make it work:** defines the concept as a grant of one capability, in one sentence; the first example pairs the declaration with its use, so the reader sees both ends of the contract; shows a failing snippet (`# This would fail!`) to mark the boundary.
  - **Do not copy:** the four-language tab sets; the "Documentation Index" LLM banner.
- **shadcn/ui: Introduction** — https://ui.shadcn.com/docs — `shadcn-introduction/` — reputation only (widely cited as the model for copy-in component systems).
  - **Structure:** a one-line thesis, the problem with packaged libraries, five principles, one short section per principle.
  - **Moves that make it work:** states the ownership model up front (you own and edit the code); each section closes with a one-line example of what the principle changes in practice.
  - **Do not copy:** the bold pitch lines and "Beautiful Defaults" register (cairn's docs ban pitch); the deploy CTA. Imitate its ownership statement, not its tone.

### Task guide

- **Sanity: Create a custom Studio tool** — https://www.sanity.io/docs/studio/custom-studio-tool — `sanity-custom-tool/` — reputation only.
  - **Structure:** what a tool is, a "right tool for the job?" callout, minimal config example, typed version, how to share it.
  - **Moves that make it work:** the closest analogue to a cairn custom admin screen; required fields (`name`, `title`, `component`) are named in prose before the code; a comment in the code maps `name` to its URL; the early callout tells the reader when NOT to build one, which answers the scope question before they invest.
  - **Do not copy:** the plugin-sharing tail and Exchange pitch; `@sanity/ui` specifics.
- **Django: How to create custom django-admin commands** — https://docs.djangoproject.com/en/5.2/howto/custom-management-commands/ — `django-custom-management-commands/` — evidence: Django's how-to/topic/reference split is the standard Diátaxis example (https://idratherbewriting.com/blog/what-is-diataxis-documentation-framework).
  - **Structure:** goal plus running example (`closepoll`), directory tree showing where the file lives, full working file, then variants (optional arguments, locales, testing, overriding), then the class reference.
  - **Moves that make it work:** one running example carried through the whole page; the file-location tree comes before the code; the convention rule (modules starting with `_` are skipped) is stated where it bites; testing gets its own section.
  - **Do not copy:** the appended API reference (cairn splits that to its reference arm).
- **Directus: Extensions quickstart** — https://directus.io/docs/guides/extensions/quickstart — `directus-create-extension/` — reputation only.
  - **Structure:** set up environment, scaffold, build, see it running, next steps.
  - **Moves that make it work:** each heading is one verb step; shows the scaffold CLI prompts verbatim with answers; ends with "where you'll see it" (the running URL), so the reader can verify success.
  - **Do not copy:** Docker volume steps; the newsletter footer.

### Reference entry

- **Stripe API: Create a PaymentIntent** — https://docs.stripe.com/api/payment_intents/create — `stripe-create-paymentintent/` — evidence: industry benchmark for API reference (https://www.moesif.com/blog/best-practices/api-product-management/the-stripe-developer-experience-and-docs-teardown/).
  - **Structure:** one-line purpose, when to call it, request example, response, Returns, Parameters (name, type, required/optional, meaning, constraints).
  - **Moves that make it work:** every parameter carries type and required-ness in a fixed slot; constraints (units, minimums, formats) sit on the parameter, not in prose elsewhere; "Returns" is a one-line contract before the parameter list.
  - **Do not copy:** the enum lists that run hundreds of lines; the full response dump. Keep one realistic example.
- **SvelteKit: Hooks** — https://svelte.dev/docs/kit/hooks — `sveltekit-hooks/` — reputation only; same stack as cairn.
  - **Structure:** one-sentence definition, the three files, then one section per hook: where it goes, when it runs, a typed example, defaults, and pitfalls.
  - **Moves that make it work:** each hook opens with a "Can be added to `src/hooks.server.js`" note; states the default when unimplemented; calls out the security trap inline ("Never use them to determine whether or not a user is authorized"); a `/// file:` line opens each example.
  - **Do not copy:** the density of cross-links; the remote-function tangents.
- **Primer: Button** — https://primer.style/product/components/button/ — `primer-button/` — evidence: GitHub's design system docs are a frequent model for component-docs structure (reputation, no published study found).
  - **Structure:** one-line purpose, variants with when-to-use rules, states (loading, inactive), props table.
  - **Moves that make it work:** each variant gets a usage rule, not just a picture ("use sparingly", "never more than one"); prop descriptions carry the guidance (`disabled`: avoid, because keyboard users lose it); the accessible alternative to a harmful prop is named on the page.
  - **Do not copy:** live preview slots (lost in capture); the React-only prop types. A cairn toolkit entry would cover a Svelte component and its DaisyUI classes.

### Migration / upgrade guide

- **Astro: Upgrade to Astro v5** — https://docs.astro.build/en/guides/upgrade-to/v5/ — `astro-v5-upgrade/` — evidence: the Astro docs team publishes its upgrade-guide standard (https://contribute.docs.astro.build/upgrade-guides/about/).
  - **Structure:** upgrade command, "it may just work" note, dependency upgrades, legacy, deprecated, removed, changed defaults, known issues. Every entry has a "What should I do?" subsection.
  - **Moves that make it work:** each break gets a fixed pair (what changed, then "What should I do?"); breaks are grouped by severity (deprecated vs removed); new features are left out on purpose, per the team's rule; links to the previous version's guide for multi-hop upgrades.
  - **Do not copy:** the length (35 entries); the package-manager tab components.
- **SvelteKit: Migrating to SvelteKit v2** — https://svelte.dev/docs/kit/migrating-to-sveltekit-2 — `sveltekit-v2-migration/` — reputation only.
  - **Structure:** intro naming the automated migration command and the recommended path, then one heading per break, each worded as the change itself.
  - **Moves that make it work:** headings state the break as a fact (`path is required when setting cookies`), so the table of contents is the checklist; says which changes the codemod handles; recommends the last 1.x release first for deprecation warnings.
  - **Do not copy:** the appended 2.12 deprecation section (belongs in the next version's notes).
- **Tailwind CSS: Upgrade guide (v3 to v4)** — https://tailwindcss.com/docs/upgrade-guide — `tailwind-v4-upgrade/` — reputation only.
  - **Structure:** browser requirements up front, the upgrade tool, manual steps per build setup, then "Changes from v3" with before/after code.
  - **Moves that make it work:** the blocking requirement (browser support) is the second paragraph, with an explicit "stay on v3.4 if" off-ramp; each change shows a v3 snippet beside its v4 form; rename tables map old to new.
  - **Do not copy:** per-build-tool branches cairn does not have.

### Gaps

- No strong exemplar for an **auth or identity seam** guide (for example, Cloudflare Access sign-in replacing a default login). SvelteKit's `handle` section is the nearest, since it covers `locals` and the authorization trap.
- No exemplar written for a **coding-agent reader** as its primary audience. The llms.txt/markdown views (Cloudflare, Svelte, Sanity, Stripe) show the delivery channel, not a page shape.
- Evidence of measured outcomes exists only for Stripe and, as a published standard, Astro. The rest are reputation-only picks.

## Core

Root: `~/.local/share/cairn/exemplars/core/`. Shapes chosen: architecture overview, task guide (set-up and contribution flow), reference table (gates), agent-facing contributor file. Concept and tutorial shapes are left out on purpose: a core contributor needs the map and the contract, not an on-ramp.

### Architecture overview

- **rust-analyzer Architecture** — https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/docs/book/src/contributing/architecture.md — `core/rust-analyzer-architecture/` — reputation only; it is the reference implementation of the matklad essay below.
  - **Structure:** Bird's Eye View, Entry Points, Code Map (one heading per crate or crate group), then Cross-Cutting Concerns (stability, codegen, testing, error handling, observability).
  - **Moves that make it work:** Each code-map entry ends with a bolded **Architecture Invariant:** line that says what the module must never do ("`syntax` knows nothing about salsa or LSP"). It names symbols to search for rather than linking lines that go stale. Entry Points come before the map, so a reader knows where execution starts. Cross-cutting concerns get their own section and are not smeared across modules.
  - **Do not copy:** The crate-level granularity and Rust vocabulary. cairn maps `src/lib/` subpaths, `tool/`, `examples/showcase`, and `templates/` instead.

- **ARCHITECTURE.md (matklad)** — https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html — `core/matklad-architecture-md/` — reputation only (widely cited, and many repos have adopted the file).
  - **Structure:** A short essay on why the file exists, then rules: bird's-eye view, codemap, invariants, layer boundaries, cross-cutting concerns.
  - **Moves that make it work:** "It takes 2x more time to write a patch, but 10x more time to figure out *where*": the page states its job in terms of the reader's cost. "Only specify things that are unlikely to frequently change" is a staleness rule that fits an agent-drafted doc. Invariants are often expressed as the *absence* of something, which is hard to see from the code.
  - **Do not copy:** The essay voice. This is a model for the page's contents. It is not a page shape.

- **Architecture of SQLite** — https://www.sqlite.org/arch.html — `core/sqlite-architecture/` — reputation only.
  - **Structure:** One diagram of the pipeline, then one short section per component in pipeline order, each naming its source files.
  - **Moves that make it work:** Opens with the one sentence the whole system hangs on ("compiling SQL text into bytecode, then running that bytecode"). Sections follow the data's path, which suits cairn's save-to-branch-to-publish flow. Every component links its files.
  - **Do not copy:** The file-level links (cairn's layout moves faster than SQLite's) and the 2000s HTML-diagram style.

### Task guide (getting set up, contributing a change)

- **rustc-dev-guide: Getting Started** — https://rustc-dev-guide.rust-lang.org/getting-started.html — `core/rustc-dev-guide-getting-started/` — reputation only.
  - **Structure:** Finding help, What should I work on, Cloning and building, Bug fixes and "normal" changes, Pull requests, Other resources.
  - **Moves that make it work:** It says up front that it is "*not* intended to be comprehensive" and points to the deeper page. It gives a concrete command for finding experts (`git shortlog -n 1.68.2.. compiler/rustc_resolve/`). It separates the kinds of change, because a normal fix and a breaking change take different paths.
  - **Do not copy:** The social machinery (Zulip, triagebot, t-compiler), which cairn does not have.

- **Go Contribution Guide** — https://go.dev/doc/contribute — `core/go-contribute/` — reputation only.
  - **Structure:** Numbered steps (Step 0 through 4, then Steps 1 through 5 to send a change), then the commit-message format, the review process, and miscellaneous topics.
  - **Moves that make it work:** Numbered, imperative steps with the exact command in each. It has its own "Good commit messages" section with a real example. A "Common beginner mistakes" section shows failure up front. "Quickly testing your changes" gives a fast path apart from the full suite.
  - **Do not copy:** The length (770 lines), and the Gerrit, CLA, and Google Account steps.

- **SvelteKit CONTRIBUTING.md** — https://raw.githubusercontent.com/sveltejs/kit/main/CONTRIBUTING.md — `core/sveltekit-contributing/` — reputation only; same stack as cairn.
  - **Structure:** Preparing, Testing changes (playground, linking local changes), Code structure, Testing, Documentation changes, Sending PRs (style, changelogs, type changes), Releases.
  - **Moves that make it work:** Tells you how to prove a change against a real app (the playground, `pnpm link`). This matches cairn's `examples/showcase` and `link:consumer`. It treats doc changes and type changes as part of a PR's checklist.
  - **Do not copy:** Changesets. cairn uses a hand-kept `CHANGELOG.md` under `## Unreleased`.

### Reference table (checks and gates)

- **Firefox Source Docs: Code quality** — https://firefox-source-docs.mozilla.org/code-quality/index.html — `core/firefox-code-quality/` — reputation only.
  - **Structure:** One sentence, then tables grouped by language, with columns Tool / Has autofixes / Meta bug / More info / Upstream.
  - **Moves that make it work:** A pure lookup table with no prose between the rows. The "Has autofixes" column answers the question a contributor has when a check fails. Each row links out to that tool's own page.
  - **Do not copy:** The columns themselves. cairn's should be gate / what it guards / when it runs (per task, full gate, CI) / how to fix or where to read. Also skip the grouping by language: group by concern.

- **rustc-dev-guide: Testing with CI** — https://rustc-dev-guide.rust-lang.org/tests/ci.html — `core/rustc-dev-guide-ci/` — reputation only.
  - **Structure:** The goal of CI in one sentence, a bulleted walk from push to merge, then one section per build kind (PR, auto, try), then how to modify jobs.
  - **Moves that make it work:** It names *which* checks run *when* and why the split exists (a fast subset on each push, the full suite before merge). This is cairn's per-task gate versus full gate versus CI. It points at the one config file that is authoritative (`jobs.yml`) and does not copy the list.
  - **Do not copy:** bors, rollups, dist jobs.

- **rustc-dev-guide: Testing the compiler** — https://rustc-dev-guide.rust-lang.org/tests/intro.html — `core/rustc-dev-guide-tests-intro/` — reputation only.
  - **Structure:** One short section per kind of test (compiletest, tidy, formatting, doc link checker, and more), each with its run command.
  - **Moves that make it work:** Each check gets a paragraph that says what it guards plus the exact command to run it alone. This fits cairn's `check:*` gates, which need a sentence of purpose each, more than a table cell allows. Pair it with the Firefox table: a table to look things up, sections to explain.
  - **Do not copy:** Its depth of subpages.

### Agent-facing contributor file

- **SvelteKit AGENTS.md** — https://raw.githubusercontent.com/sveltejs/kit/main/AGENTS.md — `core/sveltekit-agents-md/` — indirect evidence: Gloaguen et al. (ETH, https://arxiv.org/abs/2602.11988) found that agents follow context files literally, and that repo-specific tooling commands are the content they actually use.
  - **Structure:** Essential commands, testing commands, a pre-submission checklist, code style examples, key packages, troubleshooting.
  - **Moves that make it work:** Every command carries its runtime and a timeout ("takes 3-4 minutes, set 8+ min timeout", "don't cancel early"). This speaks to an agent's real failure mode. The numbered pre-submission checklist is the contract. It shows the style with a snippet of real code and does not describe it.
  - **Do not copy:** The generic style snippets that restate what Prettier enforces.

- **Cloudflare workers-sdk AGENTS.md** — https://raw.githubusercontent.com/cloudflare/workers-sdk/main/AGENTS.md — `core/workers-sdk-agents-md/` — indirect evidence: its "prefer authoritative config, copies go stale" stance matches the less-is-more findings summarized at https://www.infoq.com/news/2026/03/agents-context-file-value-review/.
  - **Structure:** Start here, common commands, a repository map table (Task / Location / Notes), cross-tool rules, conventions, dependencies and security, testing.
  - **Moves that make it work:** The map is indexed by *task* ("Add a Wrangler command", then the path). It is not indexed by directory. It says outright which files are authoritative and tells the agent to run `pnpm check` instead of reading a list of rules. It puts a layering rule ("implement in Miniflare, keep integrations thin") where an agent will see it. That is cairn's engine-versus-site boundary.
  - **Do not copy:** The Cloudflare monorepo specifics.

**Gaps:** No exemplar documents a *per-task review chain* or pass-based workflow (implementer, reviewer, gate). The closest are the Go review process and the rustc CI split, so cairn's pass contract needs original drafting. No exemplar shows how to add a fact bullet or a gated doc page; Go's "Good commit messages" is the nearest shape. The evidence for every pick is reputation or indirect. No docs team has published outcome data for any of these pages.

## Evaluators

Shapes chosen: front door / overview, three concept-page variants (scope, architecture, security model), plus a support-promise page. Evaluators do not need tasks, tutorials, or troubleshooting pages. Local root: `~/.local/share/cairn/exemplars/evaluators/`.

### Front door / overview

- **About SQLite**: https://www.sqlite.org/about.html. Local copy: `sqlite-about/`. Evidence: reputation only (widely cited as a model of plain product self-description).
  - **Structure:** one-sentence definition, then short paragraphs covering the deployment model, size and footprint, reliability claims with numbers, and licensing. No headings.
  - **Moves that make it work:** the first sentence packs what the product is, how it runs, and what it costs. Each claim carries a checkable fact (byte sizes, test coverage). The license and cost answer comes early, which matters to a budget-minded board member. It never argues against a competitor.
  - **Do not copy:** the "most widely deployed" boast, which cairn cannot claim, and the unheaded wall of paragraphs. cairn's front door should use one section per read.
- **Overview (Kubernetes)**: https://kubernetes.io/docs/concepts/overview/. Local copy: `kubernetes-overview/`. Evidence: SIG Docs ran an end-user survey (https://kubernetes.io/blog/2019/10/29/kubernetes-documentation-end-user-survey/), and 70% of respondents called the docs their first stop. The survey did not measure this page specifically.
  - **Structure:** definition, then "Why you need it and what it can do", then "What Kubernetes is not", then history, then "What's next".
  - **Moves that make it work:** "What X is not" is a first-class section on the front door, and it names the adjacent jobs the product leaves to you (logging, CI, middleware) and says those are pluggable. Capabilities appear as a bold-led list, each a noun phrase plus one sentence. It ends with routed next steps.
  - **Do not copy:** the history section and the container-era evolution diagram, which are irrelevant to cairn. Also avoid the "portable, extensible" adjective stack.
- **Decap CMS overview**: https://decapcms.org/docs/intro/. Local copy: `decap-intro/`. Evidence: reputation only. It is the closest comparable product (a git-backed CMS).
  - **Structure:** definition, a short "how it works" paragraph, "Decap CMS vs. Netlify" (lineage and relationship), then links out.
  - **Moves that make it work:** it states where content lives ("in your Git repository alongside your code") in the first paragraph, which is the question an evaluator asks first. It clears up the confusing relationship with Netlify in its own short section.
  - **Do not copy:** the "friendly UI and intuitive workflows" pitch adjectives, and the thinness. The page gives an evaluator no scope, security, or cost answer.

### Concept page: scope ("appropriate uses / what it is not")

- **Appropriate Uses For SQLite**: https://www.sqlite.org/whentouse.html. Local copy: `sqlite-whentouse/`. Evidence: reputation only, though it is the canonical example cited in this brief and widely linked.
  - **Structure:** a framing paragraph ("not directly comparable ... solving a different problem"), then "Situations where SQLite works well" (bold-led entries), then "Situations where a client/server RDBMS may work better", then a three-question decision checklist.
  - **Moves that make it work:** it draws the alternative as competent and names what it is good at ("scalability, concurrency, centralization"). Bad-fit cases get as much space as good-fit ones. The page ends in a yes/no decision procedure ("Is the data separated from the application by a network? → choose client/server"), so the reader leaves with a verdict. cairn can mirror this with its own fit questions (editor count, content model, Cloudflare commitment).
  - **Do not copy:** the length of the good-fit list. cairn's list should be short and honest.
- **Tips & Caveats (Litestream)**: https://litestream.io/tips/. Local copy: `litestream-tips/`. Evidence: reputation only.
  - **Structure:** one intro sentence, then one H2 per caveat, each giving the behaviour, the consequence, and the setting that addresses it.
  - **Moves that make it work:** the "Data loss window" section states the product's own drawback with a number and no hedging. The caveats are specific enough for a reviewer to test.
  - **Do not copy:** the tuning-pragma content. This is an operator page, so keep only its candour.

### Concept page: architecture explainer ("what runs where")

- **How Tailscale works**: https://tailscale.com/blog/how-tailscale-works. Local copy: `tailscale-how-it-works/`. Evidence: widely cited as the explanation of Tailscale, including by Tailscale's own docs and many third-party guides (reputation plus citation, no measured study).
  - **Structure:** it builds the system bottom-up: data plane, then control plane, then key exchange, then NAT traversal and relays, then access control. Each layer adds one component and says what it does and does not see.
  - **Moves that make it work:** it separates the data path from the coordination path and states which servers never see your traffic. That is the question a security reviewer asks, and cairn's version is: what the Worker, D1, GitHub, and the GitHub App each hold. Diagrams show topology, not branding. The opening promises that you could build your own replacement from the page, which signals no hidden parts.
  - **Do not copy:** the first-person blog voice and the length. cairn's architecture page should be a docs page with one section per component.
- **How it works (Litestream)**: https://litestream.io/how-it-works/. Local copy: `litestream-how-it-works/`. Evidence: reputation only.
  - **Structure:** a one-paragraph summary of the mechanism, then the data lifecycle in order (WAL, LTX files, compaction, restore, retention).
  - **Moves that make it work:** it follows one unit of data from write to restore. cairn can follow one edit from draft save, to branch, to Publish, to the commit on main, to deploy. Guarantees and limits sit next to the step that creates them.
  - **Do not copy:** the file-format internals.

### Concept page: security model

- **Security model (Cloudflare Workers)**: https://developers.cloudflare.com/workers/reference/security-model/. Local copy: `cloudflare-workers-security-model/`. Evidence: reputation only. It is the platform cairn runs on, so a Cloudflare-shop reviewer will already know its register.
  - **Structure:** an architecture overview, then the two concerns reviewers raise most often (V8 bugs, Spectre), each covering the threat, the defence layers, and what remains.
  - **Moves that make it work:** it is organised around the questions reviewers actually ask, not around features. Defence in depth is argued layer by layer. It admits that mitigation "slows down" attacks rather than claiming immunity.
  - **Do not copy:** the side-channel depth. cairn should link to this page for platform isolation rather than restate it.
- **Security Principles (Syncthing)**: https://docs.syncthing.net/users/security.html. Local copy: `syncthing-security/`. Evidence: reputation only.
  - **Structure:** the stated goal, then "Information Leakage" with one subsection per network-facing component, then "In Short", then "Protecting your keys".
  - **Moves that make it work:** it lists what each component exposes, including metadata an observer can see. The "In Short" paragraph gives the reviewer's one-line verdict. It ends with the operator's own responsibilities: lost device, revoke access, key storage. cairn's version would cover magic-link email as a channel, session storage, GitHub App private key custody, and the Cloudflare Access / IdP alternative.
  - **Do not copy:** the protocol-level TLS detail.
- **Bitwarden Security Whitepaper**: https://bitwarden.com/help/bitwarden-security-white-paper/. Local copy: `bitwarden-security-whitepaper/`. Evidence: reputation only. It is an enterprise-procurement document.
  - **Structure:** auth methods (SSO, 2FA, passkeys, recovery), then access controls and roles, event logs and SIEM, hosting and infrastructure, HTTP security headers, external audits, and certifications.
  - **Moves that make it work:** it walks a large-org reviewer's checklist in the order a procurement questionnaire asks it: identity, roles, audit trail, where it runs, and independent review. A reviewer can map it straight to their form.
  - **Do not copy:** the market-threat opener ("Everyone is more connected than ever"), which is marketing leading the page, and the certifications cairn does not have. cairn should state plainly that it has no audit or certification, if that is true.

### Concept page: support and versioning promise

- **Long Term Support (SQLite)**: https://www.sqlite.org/lts.html. Local copy: `sqlite-lts/`. Evidence: reputation only.
  - **Structure:** the promise in one sentence, an honest caveat about what cannot be promised, then the practices that back the promise (bold-led).
  - **Moves that make it work:** the promise is separated from the evidence for it. It says "we cannot absolutely promise" and then says what it can promise. cairn's version would give the SemVer policy, `Consumers must:` disclosure, the seam-stability commitment from 1.0, and that it is maintained by one person.
  - **Do not copy:** the 2050 horizon or the arrow-link styling.

**Rejected:** Ghost "WordPress vs Ghost" (https://ghost.org/vs/wordpress/) was captured and then deleted. It leads with a pitch and draws WordPress as a strawman, which violates the comparison rule.

**Gaps:** no strong exemplar for a *head-to-head comparison* page that treats the alternative as competent. SQLite's scope page is the best stand-in. There is also no strong exemplar for a *data residency / what-data-lives-where* table aimed at non-enterprise readers. Tailscale plus Syncthing cover it only in part. Cloudflare's compliance pages were not captured because they are product-marketing heavy. No exemplar was found with published user research measuring that specific page. The Kubernetes survey is docs-wide.

