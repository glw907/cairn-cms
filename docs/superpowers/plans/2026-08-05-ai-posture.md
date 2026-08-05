# The AI-posture pass

> **For agentic workers:** execute with `cairn-pass` plus per-task `cairn-implementer` dispatches
> from an Opus 5 session, on a fresh worktree `.claude/worktrees/ai-posture` (branch `ai-posture`,
> off `main`). The main loop reviews each diff and confirms the full gate between dispatches. Tasks
> specify outcomes, constraints, and acceptance criteria; the implementer writes the code test-first
> against them. Tell every dispatch to run its gates in the foreground.

**Authority:** the design spec
[`2026-08-05-ai-posture-design.md`](../specs/2026-08-05-ai-posture-design.md). Read it in full
before the first dispatch, including its "Three corrections to this pass's own inputs" section,
which overturns two things the ROADMAP still asserts.

**Goal:** a site states an AI posture, cairn emits what that posture implies, and the doctor reports
what the deployed site is *actually* doing, so the gap between a stated posture and an effective one
becomes visible instead of silent. After this pass, the four migration sessions can each adopt a
posture, and `0.94.0-rc.1` can be cut.

**All four open decisions are confirmed (Geoff, 2026-08-05)**, recorded in the spec's "Decisions,
confirmed" section: markdown serving stays in the pass, the HSTS default drops `includeSubDomains`,
`llms.txt` does not ship, and the probe stays black-box only. One addition rode the confirmation:
the guide carries the `Accept: text/markdown` negotiation recipe as zone config (a Transform Rule
rewriting to the `.md` twin), with Cloudflare's managed "Markdown for Agents" named as the
zero-config variant. Task 7 carries it. Nothing gates Task 1.

**Sequencing:** this pass lands before the RC cut and before the four site migrations. It rides the
same unpublished window as C2, C2b, and the auth-channel work. Nothing here is published on its own.

## Global constraints (every task)

- **The CI gate list, pasted from `.github/workflows/test.yml` (copy this block into every dispatch;
  do not retype it):** `npm ci`, `npm run check`, `npm test`, `check:package`, `check:reference`,
  `check:reference:signatures`, `check:surface`, `check:custom-surface`, `check:chassis-boundary`,
  `check:cm-internals`, `check:invisible-craft`, `check:admin-css-classes`, `check:readiness`,
  `check:docs`, `check:arm-indexes`, `check:snippets`, `check:prose`, `check:version`,
  `check:dev-package`, `check:consumers`, showcase `check`, `check:comments`. Per-task dispatches run
  the targeted tests plus `npm run check` and `npm test`; the CI-only four (`check:comments`,
  `check:reference:signatures`, `check:surface`, `check:snippets`) run at pass end and in any task
  touching what they gate. The last pass dropped `check:consumers` by retyping this list from memory
  and a real consumer-facing collision survived four tasks; that is why the block is pasted.
- **Worktree showcase gotcha:** `examples/showcase/node_modules` symlinks back to the main checkout,
  so before trusting any showcase check or e2e in the worktree, run a from-scratch `npm install` in
  the worktree's showcase to repoint both `file:` deps. `pretest:e2e` already repackages the library.
- **The honesty constraint is a build requirement, not a docs nicety.** No string this pass writes,
  in config doc comments, in the doctor's output, in the guide, or in the reference, may read as
  "blocks AI training." Declining is a request that named crawlers say they honor. Any prose making
  a claim about crawler behavior cites the first-party page that supports it.
- **Unset posture changes nothing.** Every task preserves byte-identical output for a site that sets
  no `aiPosture`. Four sites are on this engine and none of them has stated a posture.
- **Every claim about a crawler token is verified against that operator's own documentation** at
  implementation time. A token no first-party page documents does not ship, however widely repeated.

## File map

| Path | Responsibility |
|---|---|
| `src/lib/delivery/ai-crawlers.ts` | The crawler table: token, operator, category, first-party citation, reviewed date. |
| `src/lib/delivery/robots.ts` | `buildRobots` gains the optional `posture`. |
| `src/lib/delivery/responses.ts` | `robotsResponse` passes `posture` through; `markdownResponse` joins it. |
| `src/lib/content/types.ts` | `CairnAdapter.aiPosture`, and the `AiPosture` type. |
| `src/lib/delivery/public-routes.ts` | The markdown path enumerator, with the `noindex` exclusion. |
| `src/lib/delivery/CairnHead.svelte` | The `rel="alternate" type="text/markdown"` link. |
| `src/lib/doctor/check-posture.ts` | The live robots.txt probe and its three cases. |
| `src/lib/doctor/assemble.ts` | Registers the check; derives `aiPosture` off the adapter. |
| `src/lib/sveltekit/admin-response.ts` | HSTS without `includeSubDomains` unless opted in. |
| `src/lib/doctor/checks-cloudflare.ts:140` | The zone-HSTS check reconciled with what the engine emits. |
| `examples/showcase/src/routes/robots.txt/+server.ts` | Passes the showcase's posture. |
| `examples/showcase/src/routes/…` (shape set by Task 3) | The markdown route. |
| `docs/guides/choose-an-ai-posture.md` | The guide. |
| `docs/reference/delivery.md`, `docs/reference/sveltekit.md` | Reference for every new export. |
| `docs/tutorial/build-your-first-cairn-site.md` | The setup-path moment. |
| `CHANGELOG.md`, `ROADMAP.md`, `docs/guides/upgrade-cairn.md` | The tracking arm. |

---

### Task 1: The posture type, the crawler table, and the robots emitter

**Files:** create `src/lib/delivery/ai-crawlers.ts` and its unit test; modify
`src/lib/delivery/robots.ts`, `src/lib/delivery/responses.ts`, `src/lib/delivery/data.ts`,
`src/lib/content/types.ts`.

**Interfaces produced (later tasks consume these exact names):**
`type AiPosture = 'invite' | 'decline'`, exported from the delivery data subpath and referenced by
`CairnAdapter.aiPosture?: AiPosture`. `buildRobots(opts: { sitemapUrl: string; disallow?: string[];
posture?: AiPosture }): string`. `robotsResponse` takes the same options object.
`AI_CRAWLERS: readonly AiCrawler[]` where `AiCrawler` is `{ token: string; operator: string;
category: 'training'; citation: string }`, plus an exported `AI_CRAWLERS_REVIEWED` date string.

**Outcome:** a site states `decline` and its robots.txt carries one `Disallow: /` group per training
token plus `Content-Signal: ai-train=no`; states `invite` and it carries an affirmative
`Content-Signal` and no `Disallow`; states nothing and the file is byte-identical to today's.

**Constraints:** `posture` is optional everywhere and defaults to nothing, never to a stance. The
table carries training tokens only; Googlebot, OAI-SearchBot, and Claude-SearchBot are search and are
deliberately absent, with a comment saying so, since disallowing them costs a site its search
presence for no training benefit. The starting set, to be verified token by token against first-party
docs and trimmed if any fails: Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot,
Google-Extended, GPTBot, meta-externalagent. Bytespider publishes no compliance commitment; it stays
in the table (a request costs nothing) but its record says so and the guide repeats it. The existing
`disallow` paths still emit under every posture. `Content-Signal` syntax follows Cloudflare's
published form, cited in the module comment.

**Acceptance:** a test proves an unset posture yields output byte-identical to the current
`buildRobots` (capture today's output as the fixture before changing anything); tests cover the
`decline` and `invite` shapes; a structural test asserts every table record carries a non-empty
first-party `citation` URL and that the table exports a reviewed date, so a future addition cannot
land uncited; `check:reference` and `check:surface` are run and the surface snapshot regenerated with
`--update` and committed. `npm run check` 0/0 and `npm test` exit 0.

---

### Task 2: The doctor's live posture probe

**Files:** create `src/lib/doctor/check-posture.ts` and its unit test; modify
`src/lib/doctor/assemble.ts`.

**Interfaces consumed:** `AiPosture` and `AI_CRAWLERS` from Task 1.
**Interfaces produced:** `postureEffective`, a `DoctorCheck` constant registered in
`defaultChecks()`; `DoctorContext` gains `aiPosture?: AiPosture`, derived off the adapter.

**Outcome:** `cairn-doctor` fetches the deployed origin's live `/robots.txt` and reports the site's
actual posture, flagging the three cases in the spec: no stance stated, a stance the live site
contradicts, and a managed layer overriding what cairn emitted.

**Constraints:** a plain GET, no credential, which is what lets it sit in `defaultChecks()` rather
than behind a flag; it must never require a Cloudflare token. Origin resolution copies
`liveProbeCheck` exactly (wrangler vars beat the environment, `check-probe.ts:25-27`) and skips with a
remediation line naming the missing input when none resolves. `aiPosture` is derived through
`adapterFacts()` alongside `roles` and `mediaBucketBinding` in `deriveMissingInputs`, following that
function's existing "only when still missing, failure leaves it absent" discipline. The managed-layer
case is detected by the served file carrying a second `User-agent: *` group or `Content-Signal`
directives cairn did not write. The report names the Cloudflare dashboard as where to look for cause
and does not claim to know the cause; specifically it must not assert why a zone is configured as it
is, because that is unreadable from here. A network failure is a skip with the reason, not a fail: a
doctor run offline must not report a posture problem.

**Acceptance:** unit tests drive the check through an injected `fetch` against fixtures of real
served files, including the two-group managed-prepend shape measured on 907.life (cairn's own output
surviving beneath Cloudflare's injection) and the clean single-group shape from ecxc.ski; each of the
three cases is asserted distinctly, as is the offline skip and the no-origin skip. `npm run check`
0/0, `npm test` exit 0, `check:reference` green.

---

### Task 3: Markdown serving, engine side

**Files:** modify `src/lib/delivery/public-routes.ts`, `src/lib/delivery/responses.ts`,
`src/lib/delivery/data.ts`, `src/lib/delivery/CairnHead.svelte`; tests alongside.

**Interfaces consumed:** nothing from Tasks 1 and 2.
**Interfaces produced:** `markdownResponse(opts: { body: string }): Response` returning
`text/markdown; charset=utf-8`. `createPublicRoutes` returns an added `markdownEntries(): { path:
string }[]` and an added `markdownLoad(event: { url: URL }): Promise<{ body: string }>`, alongside
today's `entryLoad` and `entries`.

**Step one, before any implementation: determine the route shape by experiment.** Establish against
SvelteKit 2 in the showcase whether a `.md` suffix on the content URL is expressible as a valid route
that does not collide with the existing `(site)/[...path]/+page`. Prefer the suffix. Fall back to a
`/md/<path>` prefix if it is not expressible. Record which, and the evidence, in the task report;
later tasks and the docs depend on the answer. Do not guess this from memory.

**Outcome:** the engine can enumerate and serve a raw-markdown twin of every routable entry, and the
site wires it in one small prerendered route (Task 4).

**Constraints:** `markdownLoad` serves the entry's stored body, not rendered HTML, which is the whole
point: cairn stores markdown natively where an HTML-first CMS must reconstruct it. `markdownEntries`
excludes any entry whose frontmatter `robots` field contains `noindex` (read through the existing
`readSeoFields`, `seo-fields.ts:14`), so a page asking not to be indexed does not acquire a
machine-readable twin; two related surfaces must not be able to disagree. A miss throws 404 through
`error()`, matching `entryLoad`. `CairnHead` emits the alternate link only when the site passes the
twin's URL, so a site that has not wired the route emits nothing.

**Acceptance:** tests prove the enumeration excludes `noindex` entries and includes ordinary ones;
that `markdownLoad` returns the stored body unrendered; that a miss 404s; that `markdownResponse`
sets `text/markdown; charset=utf-8`; and **that no `cairn/*` branch content can reach the route**,
asserted directly rather than argued, since a pending edit reaching a public file is a disclosure
bug. `check:reference`, `check:reference:signatures`, and `check:surface` run with the snapshot
regenerated and committed, since this changes an exported function's return shape.

---

### Task 4: Markdown serving, showcase wiring and the measured content type

**Files:** create the showcase markdown route at the shape Task 3 determined; modify
`examples/showcase/src/routes/(site)/[...path]/+page.svelte` or the head wiring for the alternate
link; add an e2e spec.

**Interfaces consumed:** `markdownResponse`, `markdownEntries`, `markdownLoad` from Task 3.

**Outcome:** the showcase serves a markdown twin for every entry, prerendered, and the content type
that reaches the wire is measured and recorded.

**Constraints:** the route is prerendered, like every other public route. This is not incidental: it
is what structurally closes the pending-branch disclosure hazard, because the build runs against
committed `main` content and there is no request path by which a `cairn/*` branch reaches it. Say
that in a route comment so a later editor does not switch it to runtime SSR without understanding
what that would open.

**The measurement is the deliverable, not a formality.** The audit established that the prerendered
static-asset path re-derives content types and drops the charset the engine set, which is why
cairn's deliberate `charset=utf-8` on the feed and sitemap reaches none of the four live sites. So
`markdownResponse` setting `text/markdown` is a claim about the origin, not about a deployed site.
Build the showcase and measure what is actually served for a markdown path. Record the measured value
in the task report whatever it is. If the static-asset layer will not serve `text/markdown`, that is
a finding to write down in the pass notes and carry to the guide, not something to work around
silently.

**Acceptance:** an e2e spec fetches a markdown twin and asserts the body is the stored markdown
rather than HTML; the measured content type is pasted into the task report; the alternate link is
present in the rendered head and points at the twin that exists; the showcase's own `check` and a
from-scratch consumer build are green (reinstall the worktree showcase first, per the global
constraints).

---

### Task 5: The HSTS rider

**Files:** modify `src/lib/sveltekit/admin-response.ts`, `src/lib/doctor/checks-cloudflare.ts`
(around `:140`); tests alongside.

**Outcome:** an editor visiting `/admin` no longer pins the site's apex and every sibling subdomain
to HTTPS for two years by default. A site that wants domain-wide pinning opts in.

**Constraints:** `max-age` stays: the admin surface is the one place the engine has standing to
insist on HTTPS. `includeSubDomains` is emitted only when the site opts in. The opt-in reaches
`applySecurityHeaders` through the same composed-runtime path the function's existing callers use;
do not invent a second configuration channel for one header. The zone-HSTS check at
`checks-cloudflare.ts:140` currently reports a zone's HSTS as failing while the engine has already
hard-pinned that zone's editors, so the two are reconciled here: the check's output must not
contradict what the engine itself emits.

**Acceptance:** tests assert the default header carries `max-age` and not `includeSubDomains`, and
that the opt-in restores it; a test covers the reconciled doctor check. `CHANGELOG.md` gains a
`Consumers must:` line stating the concrete action for a site that wants the previous behavior, since
this is a behavior change on four deployed sites. `npm run check` 0/0, `npm test` exit 0.

---

### Task 6: The setup path

**Files:** modify `docs/tutorial/build-your-first-cairn-site.md` and the getting-started scaffold;
create the standing input for the scaffolder pass under `docs/internal/`.

**Outcome:** a developer setting up a cairn site meets the posture choice as a deliberate decision,
with both directions and their real consequences present, at the moment they are already making
decisions. The ROADMAP calls this the half that matters and the one most likely to be skipped.

**Constraints:** the tutorial raises the question once and does not nag. It presents both directions
honestly, including that they are not equally achievable: a site can decline credibly, and no site
can make crawlers arrive. It states that leaving the posture unset is a legitimate choice, because
absence is honest and a fabricated default is what produced the estate split. Neither the tutorial
nor the scaffold sets a posture on the reader's behalf. The scaffolder is not built and stays last in
the queue, so its share is written down as a standing input for that pass to consume rather than
pretended into existence here; the internal doc names exactly what the scaffolder must surface.

**Acceptance:** `check:docs` green (no dead links or stale anchors), `check:snippets` green if any
fenced `ts` block changed, Vale clean on the error tier over the tutorial. The scaffold's emitted
tree still passes `scaffold.yml`'s gate.

---

### Task 7: The guide, the reference, and the tracking arm

**Files:** create `docs/guides/choose-an-ai-posture.md`; modify `docs/reference/delivery.md`,
`docs/reference/sveltekit.md`, `docs/guides/read-cairn-logs.md` if the doctor output changed there,
`CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, `ROADMAP.md`,
`docs/internal/docs-friction-log.md`.

**Outcome:** the posture, the Cloudflare interaction, and an honest account of what each direction
buys, plus every new export documented and the roadmap left true.

**Constraints:** the guide follows the register standard at `docs/internal/docs-register.md` and the
Google package under Vale. It must carry, in substance: declining is a request that named crawlers
say they honor, not enforcement; `ChatGPT-User` and `Perplexity-User` are exempt from robots.txt by
their operators' own first-party design, so a fully declining site can still be fetched live when
someone asks an assistant about it; nothing is retroactive, since blocking CCBot does not withdraw
published Common Crawl dumps and no robots line untrains a model; and the only layer with teeth is
Cloudflare AI Crawl Control, which is the developer's infrastructure and not the engine's to
configure. It states why `llms.txt` is absent, with the evidence, so the omission does not read as an
oversight. Where the guide notes that no comparable tool reports effective state, it says this is
narrowness paying off rather than insight: cairn is Cloudflare-specific by design, so it can reason
about an edge layer a host-agnostic framework cannot identify.

**The guide also carries the negotiation recipe (ruled 2026-08-05):** a Cloudflare Transform Rule
matching `Accept: text/markdown` on content paths and rewriting to the `.md` twin's path before
cache lookup, so the twin is cached under its own key. Cloudflare's managed "Markdown for Agents"
feature is named as the zero-config variant, with the distinction stated: it reconstructs markdown
from HTML, where the twin is true source. The recipe says plainly that no training crawler
documents sending this header, so it serves live agent fetchers; the crawling work is done by the
twins, the alternate link, and not being edge-blocked. The rule expression in the recipe is written
against Cloudflare's current Rules-language docs and cited, not recalled.

**The ROADMAP is a pass dimension.** Mark the AI-posture entry done and remove it from the live
tiers. Prune the stale `llms.txt` delivery-view entry, which the research contradicts. Correct the
entry's "no API endpoint or dashboard field exposes AI Crawl Control's per-crawler bucket state"
claim, which is no longer safe to assert now that blocking writes a WAF custom rule; record that the
read was attempted and returned `Authentication error` on all four zones, so the next pass does not
re-derive it. Remove the HSTS item from the audit's rides-this-window bucket.

**Acceptance:** all four doc gates green by name (`check:reference`, `check:reference:signatures`,
`check:package`, `check:docs`), plus `check:snippets` and `check:prose`. `grep -rn` across `docs/` and
`README.md` finds no reference to a name this pass removed or renamed. The changelog window carries
the HSTS `Consumers must:` line and an entry for every behavior change, including ones needing no
consumer action.

---

### Task 8: The watch routine and pass close

**Outcome:** the two external triggers are watched by something that can actually fire, and the pass
closes clean.

**Constraints:** both triggers are external or time-based, so both become a scheduled cloud agent
through the `schedule` skill rather than a backlog line someone must remember to reread. That is this
repo's own watch-items doctrine, and prose in a backlog is explicitly the weakest form. The routine
watches **2026-09-15**, Cloudflare's mixed-purpose-crawler default change, which reaches backward
into existing "Block AI bots" configurations with no in-dashboard notice, and it watches the crawler
table for staleness as bots appear and rename. It pings only when a condition trips. The
machine-detectable half already rides in the suite from Task 1 and is not duplicated here.

**Pass close:** run the `cairn-pass` consolidation ritual in order. Dispatch
`code-simplifier:code-simplifier` over the code this pass changed. Run the full local gate plus the
CI-only four by name. Fan out the review subagents matching what the pass touched:
`cloudflare-workers-reviewer` (the doctor's fetch path and the security header),
`web-auth-security-reviewer` (the HSTS change), `svelte-reviewer` (the head link and the route).
**Read the raw findings, not just each reviewer's verdict**: the last pass's gate returned zero
survivors on a diff carrying three real defects, and the orchestrator found them by reading the
findings directly. Finalize the `CHANGELOG.md` entry under `## Unreleased`. **Do not bump the version
and do not publish**; the window holds. Append the post-mortem to this plan, update `docs/STATUS.md`
on `main` with the next action, refresh the relevant memory, and prep the context clear with the
exact resume prompt and launch directory.

---

## Self-review (run at write time)

**Spec coverage.** Posture config → Task 1. Decline emitter and crawler table → Task 1. Invite
signals → Task 1. Markdown serving → Tasks 3 and 4. Per-entry `noindex` consistency → Task 3. The
disclosure hazard → Tasks 3 and 4. The measured content type → Task 4. The doctor probe and its three
cases → Task 2. The HSTS rider and the doctor reconciliation → Task 5. The setup path and the
scaffolder standing input → Task 6. The guide with the negotiation recipe, the reference, the
`llms.txt` explanation, the ROADMAP prune and the corrections → Task 7. The watch routine → Task 8. Every acceptance criterion in
the spec maps to a task's acceptance block.

**Placeholders.** None. The one deliberately undetermined item, the markdown route's exact shape, is
undetermined *by design* with a named experiment, a stated preference, a named fallback, and a
requirement to record the evidence, because guessing a SvelteKit route shape from memory is how a
dispatch gets wasted.

**Type consistency.** `AiPosture` is defined once in Task 1 and consumed by that exact name in Tasks
2, 3, and 7. `buildRobots`'s options object is the same shape in Task 1 and in `robotsResponse`.
`markdownEntries`, `markdownLoad`, and `markdownResponse` are named identically in Tasks 3 and 4.
`AI_CRAWLERS` and `AI_CRAWLERS_REVIEWED` are consumed by those names in Tasks 2 and 8.

**Sizing.** Eight tasks, six deliverables. The spec's "Pass size" section records why the natural cut
was rejected and names markdown serving as the cut point if it outgrows Tasks 3 and 4. If a third
task split becomes necessary during execution, propose splitting the pass rather than the task.
