# Docs friction log

Writing a doc is also a design review. This file collects the design friction that documenting and
building cairn surfaces, so a rough edge becomes a tracked candidate for work instead of a lost
observation. Triage feeds `ROADMAP.md` and `docs/STATUS.md`; this repo keeps no separate backlog file.
A finding here does not block the doc that found it.

Record each finding with its perspective and a short note. The perspective is `developer` (the
integrator building and deploying a site), `editor` (the non-technical author working in `/admin`),
`maintainer`, or `operator`.

This log holds only live findings and the tombstones below. Resolved findings are pruned here once
shipped; their detail lives in the per-plan post-mortems and `docs/STATUS.md`, the homes for shipped
history. The append-only prose that accumulated through 2026-06-26 was pruned on 2026-06-28
(extensibility Plan 1), and the full backlog was cleared on 2026-07-16 by the friction-triage pass:
every open finding was verified against the code and then either shipped, filed into `ROADMAP.md`
with its trigger, or found already resolved and pruned. Git history holds the full record of both
clearings.

## Tombstones (decided, do not resurface)

- **Point-of-typing writing coach.** KILLED 2026-06-26. The help-shell adversarial review discarded it
  as the Clippy pattern. Do not re-propose a per-keystroke formatting coach.
- **`runtime.publicMediaResolver`.** DROPPED 2026-06-24. An adversarial review, verified first-hand,
  found it inverts the prerender/Worker boundary and that the "three wire-points" was a miscount of two,
  both prerender-side and already sharing one `cairn.config` export. The real wart (silently broken
  public images) is fixed instead by the `media.resolver_absent` warn event at `createPublicRoutes`
  construction. Do not re-propose the runtime member.
- **`CairnMediaLibrary`'s dormant "type facet" (a hidden Images/Documents filter).** RESOLVED
  2026-07-20, admin-toolkit review-fixes round. The pass's T8 drift-hunt had filed this as a live
  open finding, attributing the facet's absence to T6's `ListToolbar` re-expression; `git log`/`git
  show` on `CairnMediaLibrary.svelte` instead confirm the facet was removed three weeks earlier, in
  the 2026-06-28 charter-adherence pass (`23abe438`, "the speculative Media Library type-facet is
  removed"), as inert scaffolding for a second stored asset type that has never existed. T6 never
  carried it forward because it was already gone at the branch point. The delivery route is still
  image-only today, so the charter's "we don't accommodate that universe" stands: do not re-add it
  speculatively. `ListToolbarFilter`'s `promoted: false` seam covers the same hidden-until-needed
  shape if a real second asset type ever ships.

## Open findings

The log was cleared 2026-07-16, 2026-07-19 (the dev-backend pass), and 2026-07-29 (the
post-0.91.0 clearing): every open finding was verified against the code and then either
shipped, filed into `ROADMAP.md` with its trigger, or found already resolved and pruned.
The 2026-07-29 clearing shipped four gate tightenings the Pass 2 entries had proposed (the
safelist count assertion, `norms:check` riding the e2e workflow after the 0.91.0 cut proved
the staleness window bites, `check:version` reading the `## Unreleased` window, and the
upgrade-guide/CHANGELOG Unreleased-heading parity check), moved the field-label weight
question (cairn 500 vs the consumer ruling's 600) into ROADMAP as a future design ruling,
and pruned the rest as filed, closed in-pass, shipped (the rendered-allowlist `rule` field;
the own-tree error tier cleared by Pass 3), or resolved by the 24x24 ruling (the 43.78px
tag-filter chip clears the ratified floor; the gate's own header documents it as inert).
Git history holds the full record of all three clearings. The 2026-07-29 ASC Assets-trial
harvest (ten findings across two batches, staged in the consumer repo while a cairn worktree
held live workerd) was folded at the 0.91.1 hotfix pass under the same complete-or-move rule:
finding 1, the 0.91.0 shipped-sheet regression, shipped as the hotfix itself; the
status-flattening finding folded into ROADMAP's standing kit entry with the upstream issue
repointed from the closed kit#12533 to the open kit#12987; and the other eight were verified
and filed into `ROADMAP.md` (the reachable-vocabulary contract, the audit's missing path
filter, the `.ts`-module scan blind spot, the 12px role gap, the doctor's bare-403 zone
reads, the identity-guard/non-2xx hole, the mismatched rendered-summary totals, and the
CodeMirror decoration throw on a consumer edit desk). The same harvest disproved the ASC
edit-desk hydration defect the STATUS carry-forwards had held (corpus C had configured
cairn's internal route shape, which 404s on ASC's single-mount admin; the real desks proved
hydration-clean across 24 runs). The 2026-07-30 Assets-trial BUILD harvest (six findings from
the pass that rebuilt `/admin/club/assets` and `/admin/club/asset-requests` under the
design-capture trial's control conditions, a different staging file from the 2026-07-29
harvest above) was folded at the design-ratchet pass under the same rule. Findings 1 and 6 (the
packaged admin sheet ships no user-agent reset, so a bare `textarea` rendered the browser's
monospace default and daisyUI's `.list` kept the UA's 40px bullet gutter) shipped as the pass's
`base` cascade layer (Task 1). Finding 2 (`form-anatomy.md`'s own worked example prescribed
`gap-x-6 gap-y-4`, which never compiled) shipped as a standing compile gate over the skill's own
reference exemplars, plus a labeled safelist addition (Task 2). Finding 3 (the stacked field
register that already worked inside the package was never exported) shipped as
`register: 'inline' | 'stacked'` on `FieldLabel`/`TextField`/`SelectField`, `'stacked'` now the
default (Task 3, a deliberate breaking change, ratified by Geoff 2026-07-30). Finding 4
(`one-filled-action` and the grader prompt disagreed about what one surface is) was ruled and
shipped: the partition narrows to `nav`/`aside` plus the topmost open dialog layer, and the dark
theme's `.btn-active` selected state gains a visible lightness step (Task 4). Finding 5 (daisyUI
pins every `.list-row` child to `grid-row-start: 1`, so overriding the container's
`grid-template-columns` alone does nothing) is the one finding this pass deliberately did not
repair; it files as a live entry in `ROADMAP.md`'s Next tier with the harvest's own measurement,
since site-side overrides exist and the engine-side repair needs its own design. The pass also
lands the grammar-ladder doctrine the harvest's pattern argued for, in
`docs/explanation/enforced-design.md`: every composition claim gets either a component or a
check, prose alone being the demonstrated failure mode. New findings start fresh below this
line.

- **`developer`: `CairnAdmin`'s `form` prop is typed as a failure envelope, but SvelteKit hands it
  whatever the last action returned, successes included.** `ContentFormFailure` (the prop's
  declared shape) is an intersection of only the content actions' `fail()` payloads; SvelteKit's
  generated `ActionData` unions every action's awaited return regardless of arm, and the
  assignment type-checks today only because every failure-payload field name happens to differ
  from every success-payload field name. C2b's refusal-channel pass hit this directly: sharpening
  every `fail()` from `ActionFailure<unknown>` to a precise `ActionFailure<T>` turned that
  previously-masked union into a real structural check, and `TidyResult.usage` (token counts)
  collided with `MediaDeleteRefusal.usage` (where-used rows), failing every consumer's
  `svelte-check` on upgrade until the field renamed to `TidyResult.tokens`. A new action whose
  success payload shares a field name with any action's failure payload reproduces this, with no
  warning until a consumer's own build. A type-level assertion in the library's own suite
  (`src/tests/component/CairnAdmin.test.ts`) now catches a same-repo recurrence at compile time,
  but the structural gap in the prop's own type is unrepaired. Candidate fix: type `form` to model
  both arms honestly, for example a discriminated union or a generic keyed by the last action name,
  rather than one merged failure-shaped intersection.

- **`developer`: four of the admin's non-enhanced forms lose their working (in-progress) state on
  any refused submit, and only `EditPage` echoes it back.** `NavTree` (a drag-reordered tree),
  `VocabularyAdmin` (in-progress renames/adds), `CairnTidySettings` (an edited conventions block),
  and `ConceptList`'s create dialog (the typed title/slug/date) all reset to their last-loaded state
  on a `fail()`, since none uses `use:enhance` and a plain POST re-renders a fresh document; only
  `EditPage` survives this because its own `SaveFailure` echoes the posted body back. Found by the
  C2b review round (a11y Warning 7, WCAG 3.3.7 Redundant Entry, new in 2.2); C2b itself fixed the
  misleading NavTree comment that claimed otherwise but left the behavior as found, since restoring
  the working state on all four screens is a larger, deliberately scoped change (either `use:enhance`
  across the four forms, which also changes their live-region/focus behavior, or echoing the posted
  payload back on each failure type). Candidate fix: pick one mechanism and apply it uniformly rather
  than case-by-case.

- **`editor`: a refused submit is announced `aria-live="polite"` on five admin screens, while
  `EditPage` treats the same class of message as assertive, and no screen moves focus to the
  refusal.** `NavTree`, `CairnTidySettings`, `VocabularyAdmin`, `ConceptList`, and `ManageEditors`
  route their refusal through a `sr-only` `aria-live="polite"` region; `EditPage` gives a refused
  submit its own assertive region. An error answering a user-initiated submit should interrupt
  (WCAG 3.3.1/4.1.3, ARIA APG), and separately, since these forms have no `use:enhance`, the
  refusal arrives as part of a freshly parsed document rather than a live DOM mutation, which is a
  known-unreliable trigger for AT announcement timing; moving focus to the banner (`tabindex="-1"`,
  `role="alert"`, an effect-driven `.focus()`) would fix both the announcement reliability and
  WCAG 2.4.3 in one mechanism. Found by the C2b review round (a11y Warnings 4-6). Candidate fix:
  give each of the five screens an assertive region matching `EditPage`'s, and move focus to the
  rendered banner on a refusal.

- **`editor`: `editLoad`'s `?new=1` create-dialog seed (`?title=`) renders an attacker-crafted query
  value as the entry's heading and title field to a signed-in editor.** `/admin/posts/anything?new=1&title=<text>`
  seeds `EditData.frontmatter.title`/`EditData.title` from the raw query string, unbounded; the
  sibling `?date=` field is correctly regex-bounded right beside it. Svelte escapes the render, so
  this is not XSS, but it is a form field and heading rendering arbitrary attacker text to a session
  that clicked a crafted link, pre-existing and outside the C2b refusal-channel diff (found by the
  C2b review round, security MEDIUM 5). Candidate fix: bound `title` the way `date` already is (a
  length cap plus a conservative character class), or move the create dialog's typed title into a
  short-lived server-side hold instead of the URL.

- **`editor`: a rename's 409 conflict lists every open branch's `concept/id`, including one an
  access-map role cannot reach.** `content-routes-core.ts`'s conflict-branch index for the rename
  refusal builds from every open `cairn/*` branch with no `canReach` filter, unlike
  `publishAllAction`'s own index for the same underlying data, which does filter. A role denied a
  concept still learns that concept has an in-progress, unpublished entry and its id. Pre-existing,
  outside the C2b refusal-channel diff (found by the C2b review round, security LOW 9). Candidate
  fix: filter the conflict-branch index through `canReach(runtime.access, editor, row.concept)` the
  way `publishAllAction` already does, collapsing an unreachable branch to a bare count.

- **`editor`: a refused save preserves the body but discards frontmatter field edits.** Found by the
  C2b main-loop visual read, not by a gate or a reviewer. Converting the save refusal from a
  `?error=` redirect to `fail(400, SaveFailure)` was meant to stop discarding an editor's work, and
  it half succeeds: `SaveFailure` carries `body`, so the prose survives, and `EditPage` reseeds it
  through `form?.body ?? data.body`. Every frontmatter field reloads from the stored record instead.
  Observed directly: clearing Title and saving re-renders with the alert and the body intact, and
  the Title reverted to its committed value. The realistic cost is larger than the test case
  suggests, since an editor who retitles an entry, adds a tag that fails taxonomy validation, and
  saves loses the retitle while keeping the prose. This is strictly better than the pre-C2b
  behavior, where the redirect discarded everything, so it is an incomplete improvement rather than
  a regression. Candidate fix: carry the submitted frontmatter on `SaveFailure` alongside `body` and
  reseed the fields from it, which also makes the failure shape honest about what it holds.

- **`developer`: `createAuthChannel`'s `ttl` config bag bundles more than durations.** Its name reads
  as a bag of lifetimes, and five of its nine fields are exactly that (`codeTtlMs`, `cooldownMs`,
  `sessionTtlMs`, plus the two length/count fields `codeLength` and `attemptCap` that aren't
  durations either). The other four, `requesterCap`, `identityCeiling`, `escalationThreshold`, and
  `liveRowCap`, are plain per-hour counts and a row cap with no time unit at all. The shape is
  spec-faithful: the design's own "Defaults and clamps" table groups every numeric knob together on
  purpose, since they're all clamped construction-time overrides with the same validation shape
  (`resolveLimit`), and splitting them into a `ttl` bag plus a separate `limits` bag would be two
  config surfaces to document and remember instead of one. Still odd to write in the reference page
  as `ttl?: { requesterCap?: number; ... }` with a straight face. No candidate fix proposed; noted
  for whoever next touches this surface, since the field carries no behavior of its own to change,
  only a name a future config redesign might reconsider.

- **`developer`: the markdown twin's route shape had no documented answer and had to be settled by
  experiment against SvelteKit 2.** A `.md`-suffixed rest route (`(site)/[...path=md]`) needs a
  param matcher (`src/params/md.ts`) that claims only a segment ending `.md`, coexisting with the
  existing `(site)/[...path]` catch-all with no collision between the two. Nothing in SvelteKit's
  own docs states that a suffix condition on a rest parameter is expressible this way, or that route
  resolution prefers the more specific matcher over the plain catch-all once it is. The AI-posture
  pass's design spec named this a deliberate unknown and required the plan to determine it by
  experiment rather than guess from memory (`docs/superpowers/plans/2026-08-05-ai-posture.md`, Task
  3), which is exactly this friction, now settled for cairn's own code but still undocumented
  upstream. `examples/showcase/src/params/md.ts` and
  `examples/showcase/src/routes/(site)/[...path=md]/+server.ts` are the working shape; [Wire the
  delivery surface](../guides/wire-the-delivery-surface.md#serve-a-raw-markdown-twin-of-every-entry)
  now documents it so a consumer doesn't have to re-derive it.

- **`developer`: Cloudflare's static-asset layer re-derives a served file's content type from its
  extension, so the engine's own `charset` header survives for some extensions and not others, and
  a local `vite preview` measurement disagrees with what a deployed site actually serves.** cairn's
  `markdownResponse` sets `Content-Type: text/markdown; charset=utf-8`, and that charset reaches the
  wire under `wrangler dev` because Cloudflare's own extension table carries a charset for `.md`;
  the equivalent deliberate header on the `.xml` sitemap and feed responses does not survive,
  because Cloudflare's table carries no charset for `.xml`. A developer who measures locally with
  `vite preview` instead sees a third answer again, `text/markdown` with no charset at all, since
  `vite preview` and Cloudflare's static-asset layer derive the header differently for the same
  built file. [Choose an AI posture](../guides/choose-an-ai-posture.md#serve-raw-markdown-alongside-your-pages)
  now states the measured value and which tool to trust, but the underlying inconsistency, an
  origin header surviving or not by extension, invisible until measured against the real edge, is a
  rough edge in the platform this engine sits on rather than something cairn's own response builders
  can smooth over.

- **`developer`: a site that wants to decline a crawler token cairn has verified no first-party
  documentation for, ByteDance's `Bytespider` being the live example, has no first-class cairn seam
  for it.** `robotsResponse`'s `disallow` option adds a path under the blanket `User-agent: *`
  group, disallowing it for every crawler rather than naming one token, so it is not really the
  right tool for declining a single bot. [Choose an AI posture](../guides/choose-an-ai-posture.md)
  names the two available workarounds, that option or Cloudflare's edge controls, and says plainly
  that neither is a clean fit: the first disallows the wrong scope and the second is out of the
  engine's reach by design. No candidate fix proposed here; cairn's citation discipline (a token
  with no first-party backing doesn't ship) is the point, and a seam that made an uncited disallow
  group easy to write would cut against that discipline rather than serve it.

- **`operator`: `cairn-doctor`'s two zone checks report a Cloudflare API permission failure with
  the same `FAIL` and the same remediation text a genuinely wrong zone setting gets.** The
  `always_use_https` and `security_header` checks read the zone settings API, and an API token
  without Zone Settings Read gets a 403 back. Both checks then print `read returned 403` inside a
  `FAIL` whose `Fix` paragraph tells the operator to go turn the setting on, which on the site that
  hit this was already on: `http://` on both hosts redirects to `https://`, verified with a plain
  `curl -I`, while the doctor run said Always Use HTTPS had failed. An operator who trusts the
  output changes a correct setting, or worse, believes their zone is unprotected. The measurement
  the check wants is available without any API permission at all, since the redirect and the
  `Strict-Transport-Security` header are both observable from an unauthenticated request, so the
  candidate fix is either to fall back to that observation on a 403 or to report a permission
  failure as its own outcome, distinct from a failing setting. Found on the `aksailingclub-org`
  `0.94.0-rc.1` migration (see [that report](./feedback/2026-08-05-aksailingclub-org-migration.md)),
  where both of the run's only two failures were this.

  **Second site, same 403** (`cairn-pub`, see [that
  report](./feedback/2026-08-05-cairn-pub-migration.md)), which is the altitude signal. Two of that
  run's three failures were this pair, on a different zone under the same operator token, so the
  403 is the standard outcome rather than one site's misconfigured token. It also cost real work
  downstream: `0.94.0-rc.1` asks a consumer to check whether the zone sends `includeSubDomains`
  before deciding on `createAuthGuard({ includeSubDomains })`, and the check that would answer that
  is one of the two returning 403, so the answer had to come from reading live response headers by
  hand. The same release shipped the precedent for the fix in this repo's own tree:
  `ai.posture-effective` answers a live-state question with a credential-free `GET /robots.txt`
  against the deployed origin. `edge.hsts` can read `Strict-Transport-Security` off a plain
  response the same way, and `edge.always-https` can follow an `http://` request.

- **`developer`: `createD1AuditSink` cannot join a caller's `db.batch()`, so an operation whose
  audit row has to be atomic with the write it describes still hand-rolls its own insert.** The
  sink is fire-and-forget by contract. It returns before the insert settles and hands the caller
  nothing to compose with, which is exactly what makes it safe to call from `adminAction` and
  fail-open, and it is also what puts it out of reach of a transaction. On `aksailingclub-org`, the
  first site to adopt it, four operations (the season rollover, the signup statements, two
  enrollment writes) correctly kept their own insert, because a batch is the only way to make the
  audit row and the write it describes succeed or fail together. Candidate fix: export the
  statement half the sink already composes, a builder returning the bound `D1PreparedStatement` for
  a record, so a caller can push it into its own batch and still get the packaged column mapping
  and truncation; the sink itself then becomes that builder plus the fire-and-forget dispatch. Not
  proposed as urgent, since the admin path the seam was built for fits without a workaround and the
  hand-rolled inserts beside it are correct. The same need from a second consumer site is the
  altitude signal that turns it into engine work. Found on the `aksailingclub-org` `0.94.0-rc.1`
  migration (see [that report](./feedback/2026-08-05-aksailingclub-org-migration.md)).

- **`developer`: the design spec's "reverted content is validated" paragraph names link/include
  drift as a revert advisory, but the shipped advisory covers only retired fields and retired
  vocabulary tags.** [The design spec](../superpowers/specs/2026-08-06-history-revert-preview-design.md)
  (Part 2, "Reverted content is validated, warn-not-refuse") lists three things an old version can
  carry that the current schema no longer recognizes: retired frontmatter fields, removed
  vocabulary values, and "links or includes to since-deleted targets." `revertSchemaDrift` in
  `content-routes-core.ts` builds only the first two into `retiredContentAdvisory`; a reverted
  version whose body links or `::include`s a target deleted since that version was published gets
  no warning at revert time, and the dangling reference surfaces only at the next build's
  `verifyReferences` gate or as a live 404 if the editor publishes without rebuilding locally
  first. The scope-out was deliberate for this pass, not an oversight: `revertAction` already
  reuses save's `draftLinks`/`referenceWarnings` machinery for the *current* manifest, and wiring
  the same body-link and reference-edge scan against the *reverted* version's own content, before
  the branch exists to scan, was judged a larger, separable change. Candidate fix: run the same
  `extractReferenceEdges`/body-link scan save already does against the parsed old version inside
  `revertAction`, folding any absent or draft target into the same advisory channel, the next time
  an editor hits this in practice.

- **`developer`: `cairn-audit`'s `rendered.pages` replaces the default page list rather than
  merging with it, so a consumer that adds one screen of its own quietly stops auditing cairn's
  six core routes.** `loadConfig` passes `DEFAULT_RENDERED_PAGES` as the fallback for an absent
  key, which is the ordinary shape for a config default and the wrong one here: the six defaults
  are cairn's own screens, which a consumer mounts and does not own, while the pages a consumer
  writes are additions beside them. Nothing in the run says the six went unmeasured, and the exit
  code is clean, which is the silent green this tool's own config loader is otherwise strict
  about ("a typo that quietly narrows the audit to nothing"). The reference now documents the
  replace semantics, which closes the surprise; the candidate fix behind it is to merge the two
  lists and give a consumer an explicit opt-out for the rare case where it means to audit its own
  screens alone. Weigh that against a consumer that deliberately narrows a run for speed, which
  merging would take away. Found on the `cairn-pub` `0.94.0-rc.1` migration (see [that
  report](./feedback/2026-08-05-cairn-pub-migration.md)).

- **[developer] `token-colors` reads a self-palette public component as 16 hazards.**
  `PreviewBanner` mounts on public pages where neither `cairn-admin.css` nor Tailwind may
  exist, so it deliberately carries its own fallback palette, and the gate needed 17
  co-located suppressions to accept that. The question worth an answer: should a component
  that declares (or consumes by fallback) its own `--cairn-*` palette be a declared palette
  site, the standing exclusion `cairn-admin.css` and `theme.css` already get, rather than a
  suppression cluster? Raised by the code-simplifier on the preview pass, 2026-08-07.

- **`developer`: `FieldLabel`'s own `@component` block says nothing about the row it sits in,
  even though the vertical-alignment pass's whole finding is that the row is where this
  composition goes wrong.** `FieldRow` (`/admin-toolkit`) now ships the fix, an `items-end` row for
  a stacked field beside a bare control, but `FieldLabel` itself, the component a developer opens
  first when composing that row, carries no pointer to it. A developer reads `FieldLabel`'s doc,
  composes a plain `flex items-center` row around it and a bare button, and gets the same
  12.5px-offset defect ASC hit twice in one repo, with nothing in the component they are looking at
  to warn them off. The vertical-alignment pass's task 2 deliberately left `FieldLabel`'s block
  untouched (a judgment call, not an oversight: the plan's global constraints bar changing
  `FieldLabel`'s markup, and the doc addition is a smaller, separable edit than the plan's own
  scope). Candidate fix: one sentence in `FieldLabel`'s `@component` block, pointing at `FieldRow`
  for a row that mixes it with a bare control.

- **[developer, admin] The setup docs were walked cold from five vantages, and the findings are a
  Pass D work list, not a doc-by-doc polish.** The record, with every finding evidenced by
  `file:line` and ranked by how many independent walks raised it, is
  [`2026-08-unagented-setup-baseline.md`](./2026-08-unagented-setup-baseline.md); read it there
  rather than restating it here. Four classes need a decision Pass D cannot duck. **Prerequisites
  arrive last**: a domain, a Cloudflare zone, `wrangler login`, a GitHub account with owner access
  on the target repo, and the Workers Paid plan for arbitrary-recipient email are each stated at
  the step that needs them, so a reader meets an unbudgeted decision after nine milestones of
  work. **The tutorial has drifted from its own toolchain**: current `sv create` sets the adapter
  in `vite.config.ts`, so the `svelte.config.js` edit at milestone 1 is a no-op that
  `adapter-auto` silently overrides, and the same drift breaks doctor's `config.csrf-disable`
  text heuristic. Two walkers reproduced this live. **Troubleshooting is scoped to live sites**,
  which `guides/README.md:72` states outright, so the entire setup phase has no recovery surface;
  every symptom in the table keys on a runtime log event. **The front door buries the first
  command** behind five sections of positioning, and `docs/README.md:10` tells the reader to keep
  `examples/showcase` open, which a reader who arrived through the README's own quickstart does
  not have. Smaller items in the record: `base64 -w0` is GNU-only and fails on macOS, `.dev.vars`
  is missing from the scaffold's `.gitignore`, the GitHub App guide's three visual aids are
  unfilled `<!-- SCREENSHOT: -->` comments, and `PUBLIC_ORIGIN` disagrees with `ORIGIN` on which
  localhost port is meant.

- **[developer] `SiteConfig`'s doc comment says unknown keys are ignored; the parser throws on
  them.** `src/lib/nav/site-config.ts:75` reads "Unknown keys are ignored so the file can grow
  without an engine change," and the interface carries an `[key: string]: unknown` index signature
  that says the same thing. Fifty lines later, `KNOWN_TOP_LEVEL_KEYS` (`:293`) and the check at
  `:337` throw `unrecognized key` on anything not in the set. The strict behavior looks deliberate,
  since it catches a typo and an adapter setting written into the wrong file, and it has its own
  `ADAPTER_MISPLACEMENTS` table for exactly that. So the comment and the index signature are the
  stale half. This is not academic: it is what let the scaffolder ship a `tagline:` key that broke
  every scaffolded site's build, since the shape a reader consults says the key would be ignored.
  Fix the comment and weigh dropping the index signature, which advertises openness the parser does
  not honor.

- **[developer] `create-cairn-site` hardening candidates from the T2 review's unverified tail.**
  The T2 pass-close adversarial review confirmed and fixed six findings; these unverified ones
  survived a first read as plausible and small, parked here rather than fixed blind
  (`docs/superpowers/plans/2026-08-10-create-cairn-site-t2.md` post-mortem has the full list):
  the loopback receiver accepts any pathname hit without validating it looks like the expected
  redirect and never re-arms after a bogus hit consumes a wait; `verifyInstallationCovers`
  ignores the response status (an auth failure reads as "not covered") and does not paginate past
  the first page; the state store's only copy of the App PEM is written non-atomically with a
  brief mode window; the shipped CLI honors `CAIRN_GITHUB_API_BASE`/`WEB_BASE` unconditionally,
  which a hostile environment could point at another host (weigh gating the seams on
  `NODE_ENV=test` or documenting them as a deliberate operator surface); several inner error
  messages still leak raw HTTP verbs and status codes into admin-facing copy; and `bin.mjs` has
  no test file, so its resume wiring is proven only by the T2 live e2e. Triage when T3 touches
  these files.
