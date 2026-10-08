# R6 step 1: consistency read record (2a, task 9), read-only

**Worktree:** `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/draft-docs-2a` at HEAD `c882e4b2`. No edits, no commits. Scratch probes are in `$HOME/.cache/claude-tmp/2a-run/` (`envprobe/`, `wtypes/`).

**Edit-rule key.** **[sub]** means a pure term or link substitution, so no scoped review. **[claim]** means a changed or new claim, so scoped review is needed. **[del]** means a pointer sentence is deleted: no new claim, but the brief's `sentences` still need updating.

## Pages read (15)

- **11 new pages:** `security-model`, `add-cairn-to-a-sveltekit-app`, `add-a-custom-admin-screen`, `replace-magic-links-with-cloudflare-access`, `architecture`, `theme-your-public-site`, `scaffolded-site-files`, `restrict-admin-access`, `add-a-second-sign-in-group`, `rotate-the-github-app-key`, `debug-your-site`.
- **Interim index:** `docs/extend/README.md`.
- **Kept pages:** `choose-an-ai-posture`, `migration-notes` (relevant sections), `upgrade-cairn`.

## Cross-link check against `crossLinks` in `docs/internal/outlines/extend.json`

Every outline link from the 11 pages is present. Links to 2b pages resolve as pending, which the link checker allows. Two are missing, both on kept pages:

- **`upgrade-cairn.md:126` → `debug-your-site` (relink 99, stage 2a), open.** Restore the original sentence after "...last appeared in.": "See [Debug your site](./debug-your-site.md) for a runtime symptom that only shows up after deploy." The text comes from `55bf8184:docs/extend/upgrade-cairn.md:97-98`. [sub]
- **`choose-an-ai-posture.md` → `build-the-public-routes` (relink 93)** is stage 2b. Out of scope here.

## Findings

### Carried items, verified at HEAD

**C1. `wrangler types` is given three different ways. Class: term/depth. [claim]**

- **Current state:**
  - `debug-your-site.md:340` gives `npx wrangler types --env-file .dev.vars.example`.
  - `add-a-second-sign-in-group.md:351-355` gives a plain `npx wrangler types`, after adding the secret to `.dev.vars` only (step 4, L345).
  - `upgrade-cairn.md:100` gives `wrangler types --env-file .dev.vars.example`.
  - The scaffold records `wrangler types --env-file=.dev.vars.example --include-runtime=false` (`templates/waymark/worker-configuration.d.ts:2`).
  - `src/app.d.ts:6` says to regenerate "with the command its first lines record".
- **Probe** (wrangler 4.144.0, on scratch copies of the scaffold's `wrangler.jsonc` and `.dev.vars.example`):
  - A plain run reads `.dev.vars`, so it drops `GITHUB_APP_PRIVATE_KEY_B64` and `ANTHROPIC_API_KEY`.
  - A plain run writes 16,064 lines of runtime types on top of the `@cloudflare/workers-types` reference. The recorded command writes 24 lines.
  - The recorded command picks up a name only once it is in `.dev.vars.example`.
- **One instruction for all three pages:** add the name to `.dev.vars.example` with an empty value (and the real value to `.dev.vars`), then run `npx wrangler types --env-file=.dev.vars.example --include-runtime=false`, the command that `worker-configuration.d.ts` records on its first lines.
- **Edits:**
  - `add-a-second-sign-in-group.md:345` step 4: add `TURNSTILE_SECRET=""` to `.dev.vars.example` as well as the value to `.dev.vars`.
  - `add-a-second-sign-in-group.md:351-355` step 5: replace the command and code block with the recorded command.
  - `debug-your-site.md:340`: change the command to `npx wrangler types --env-file=.dev.vars.example --include-runtime=false`.
  - `upgrade-cairn.md:100` (kept page, no brief): same command.
- **Cites:** `f:pe4vuc` plus a new fact (`[candidate]`):
  > A scaffolded site regenerates `worker-configuration.d.ts` with the command that file's second line records, `wrangler types --env-file=.dev.vars.example --include-runtime=false`: `--env-file` reads secret names from the committed `.dev.vars.example`, and `--include-runtime=false` leaves the runtime types to the `@cloudflare/workers-types` reference in `src/app.d.ts`. A plain `npx wrangler types` reads `.dev.vars` instead, so it drops any name that only `.dev.vars.example` carries, and it writes the full runtime types beside that reference (16,064 lines against 24 on the scaffold's `wrangler.jsonc`). Source: `templates/waymark/worker-configuration.d.ts:2`, `templates/waymark/src/app.d.ts:3-11`; reproduced with wrangler 4.144.0 on a scratch copy of the scaffold's `wrangler.jsonc` and `.dev.vars.example`, 2026-10-07.
- **Gap this cannot close:** a hand-built site from `add-cairn-to-a-sveltekit-app` has neither `.dev.vars.example` nor `worker-configuration.d.ts`. That page names `wrangler types` (L208) but never runs it. See friction F1.

**C2. `security-model.md:287-289` says the sidebar and routes "cannot drift apart", which is false. Class: depth. [claim]**

- Replace the sentence with:
  > [`canReach`](../reference/core.md#canreach-hasaccessrule) is the one function that the guard's route checks, the engine's screens, and the sidebar call to decide reach, yet the sidebar and the routes can still disagree. A `navLayout` site entry whose href no key matches stays visible while its route refuses, and the sidebar reads the adapter's map while `requireAccess` reads the guard's, so a map given to only one gates only that one. The `editors` roster screen stays owner-only whatever the map says.
- **Cites:** `f:vqh4a9`, `f:altcjp`.
- **Optional:** add a "Site's responsibilities" bullet after L490: "Passing the same access map to the adapter and the guard." (`f:vqh4a9`)

**C3. `add-cairn-to-a-sveltekit-app.md:532` calls `devBackendHandle()` with no options. Class: depth. [claim]**

- Add after the hooks snippet (after L538):
  > When the site later declares an access map, as [Restrict admin access](restrict-admin-access.md) does, the hooks module passes that one object to both branches, `devBackendHandle({ access })` and `createAuthGuard({ access })`, since a dev backend given no `access` leaves the map unattached and every section action refuses with `admin.action.misconfigured`.
- **Cites:** `f:u78zg6`.
- **Companion edit (`scaffolded-site-files.md:340-342`) [claim]:** "The guard receives `{ access }`..." becomes "Both handles receive `{ access }`, the `defineAccess` map in `src/access.ts`, ..." (`f:u78zg6`; `templates/waymark/src/hooks.server.ts:20,22`).

**C4. `debug-your-site.md:58` never defines `<site>`. Class: term. [claim]**

- Replace with:
  > `cairn logs <site>` reads the site's records from Workers Observability, where `<site>` is the site's id in the `cairn` CLI's registry, as `cairn sites list` prints it.
- **Cites:** `f:q9ylqa` plus a new fact (`[candidate]`):
  > `cairn logs` takes exactly one argument, a registered site id, the `id` that `cairn sites list` prints for each site the tool's registry holds; an id the registry lacks fails with `no site named "<id>"` and a pointer to `cairn sites list`. Source: `tool/cmd/cairn/logs.go:32-37,83-85`, `tool/cmd/cairn/messages.go:277,346`.

**C5. `admin.action.csrf_refused` is named at `debug-your-site.md:131-132` but has no row. Class: depth. [claim]**

- **Probe:**
  - `devBackendHandle` runs no CSRF check (`packages/cairn-cms-dev/src/handle.ts:165-182`).
  - Under the dev backend, the wrapper's own check (`src/lib/sveltekit/admin-action.ts:220-240`) is the first to refuse a post with no `CsrfField`.
  - In production, the guard refuses the same post first, with `guard.refused` reason `csrf`.
  - A route the guard never handles stops at `session_absent` first.
- **Recommended:** a new row after L156:
  > ### `admin.action.csrf_refused`
  >
  > A wrapped action logs `admin.action.csrf_refused` as a warning and answers SvelteKit's `error(403, ...)` when the post's CSRF token fails the double-submit check. The dev backend runs no CSRF check of its own, so under `npm run dev` this record is the first trace of a form that posts without a token. In production, the guard refuses the same post earlier and logs `guard.refused` with reason `csrf`. The fix is a code change that mounts `CsrfField` from `@glw907/cairn-cms/admin` in each form that posts to the action.
- **Cites:** `f:yi9vag`, `f:suk99b`, `f:fers77`, plus a new fact (`[candidate]`):
  > `devBackendHandle` runs no CSRF check, so under the dev backend a `createAdminAction`-wrapped action's own check is the first to refuse an unsafe admin post whose token is missing or wrong, logging `admin.action.csrf_refused`; behind `createAuthGuard` the guard refuses the same post first with `guard.refused` reason `csrf`. Source: `packages/cairn-cms-dev/src/handle.ts:165-182`, `src/lib/sveltekit/admin-action.ts:220-240`, `src/lib/sveltekit/guard.ts` (CSRF step, `f:7qqhda`).
- **Fallback if refused:** drop "or `admin.action.csrf_refused`" from L131-132 [del].

**C6. Reference sentences. Class: depth. [claim] (reference pages carry no briefs).**

- **`docs/reference/sveltekit.md:805-807`.** Probed with tsc 6.0.3 `--strict`: `createSectionAction` infers `Env = unknown`, and `env?.MEMBER_DB` fails with `Property 'MEMBER_DB' does not exist on type '{}'`. Replace "else it collapses to `{}` and every downstream binding read stops typechecking usefully" with "else `Env` infers as `unknown` and a binding read such as `env?.MEMBER_DB` fails to typecheck."
- **`docs/reference/auth-channel.md:37-38`.** Probed: `createAuthChannel` infers `Env = unknown` too, with the same error. Use the same replacement.
- **Code comments** at `src/lib/sveltekit/section-action.ts:147-149` and `src/lib/auth-channel/factory.ts:537,573` stay in the friction log for an engine pass, as the plan says.
- **`docs/reference/sveltekit.md:1208`.** Replace "into the same committed `src/lib/site.config.yaml` the tidy settings write" with "into the committed site-config YAML that the tidy settings write: the path `editor.nav.configPath` names, or `src/lib/site.config.yaml` when the adapter declares no nav menu". Source: `src/lib/sveltekit/content-routes-settings.ts:124,194-201`; the scaffold sets `src/theme/site.config.yaml` (`templates/waymark/src/theme/cairn.config.ts:182`). New fact (`[candidate]`), same text with that Source.
- **`docs/reference/sveltekit.md:824-827`.** Replace ": the guard never ran on this route. Only [`createAuthGuard`](#createauthguard) may write `locals.cairnEditor` and `locals.cairnAccess`, and it must be the last handle in the sequence to set them." with:
  > : a hook set `locals.cairnEditor` without attaching the map, as `devBackendHandle` does when its config carries no `access`. `createAuthGuard` attaches the map on every guarded path right after it sets the editor, so behind the guard this check never refuses; the fix passes the same map to `devBackendHandle({ access })`.

  The "only `createAuthGuard` may write" sentence is false, since `devBackendHandle` writes both fields. Cites `f:u78zg6`.
- **`docs/reference/log-events.md:80`.** Replace "(the guard never ran on this route)" with "(a hook set the editor without the map, such as `devBackendHandle` called without `access`; behind `createAuthGuard` this reason does not occur)". Cites `f:u78zg6`.

### New findings

**N1. `restrict-admin-access.md:225-254`: assigning the webmaster role fails on a scaffolded site. Class: depth. Severity high. [claim]**

- The scaffold ships no `0001_roles.sql` (`templates/waymark/migrations/` holds only 0000, 0003, and 0004).
- `0000_auth.sql:5` restricts `role` to `CHECK (role IN ('owner','editor'))`, so step 1 of "Assign the roles" (L249) fails.
- `scaffolded-site-files.md:289` points readers to this page for `0001_roles.sql`, but the page never mentions it.
- **Edit:** add a step to "Deploy the changes" before the deploy, mirroring `add-a-second-sign-in-group.md:193-203`:
  1. Copy `node_modules/@glw907/cairn-cms/migrations/0001_roles.sql` into `migrations/`.
  2. Run `npx wrangler d1 migrations apply <auth-database-name> --remote`.
- **Also add a check to "Resolve a refusal"** (after L317), mirroring `add-a-second-sign-in-group.md:656-657`: "If adding the test editor with the webmaster role fails on `/admin/editors`, apply `0001_roles.sql`; until it runs, the roster holds only owner and editor."
- **Cites:** `f:rn62i1`, `f:xkkt1o`, `f:xxtooz`, `f:nj0nfm`.

**N2. "Debug your site" pointers promise rows the page doesn't have. Class: overlap/link.**

The debug page's own scope, set at L26-32, excludes sign-in refusals, sign-in email failures, and cairn-audit.

- **`add-cairn-to-a-sveltekit-app.md:562`** ("covers the dev backend's other failures"). Replace with "[`admin.action.misconfigured`](debug-your-site.md#adminactionmisconfigured) in Debug your site covers a section action that the dev backend refuses for want of an access map." [claim] (`f:u78zg6`) This keeps the outline's add-cairn → debug link.
- **`add-cairn-to-a-sveltekit-app.md:792`** ("covers the recovery from each content failure"): delete. Each bullet already names its fix, and L711 links the `cairn-manifest` reference. [del]
- **`add-cairn-to-a-sveltekit-app.md:1106`** ("covers the recovery for each failure"): delete. Each bullet names the setting, and debug-your-site has no binding, origin, email, migration, or App rows. [del]
- **`add-cairn-to-a-sveltekit-app.md:1214`.** Replace with "When the message does not arrive, find the `auth.link.send_failed` record, whose fields the [log events](../reference/log-events.md) reference lists." [claim] (`f:4tmw56`, `f:ug1ekb`)
- **`replace-magic-links-with-cloudflare-access.md:400`.** Replace with "11. If the refusal persists, read the `guard.refused` and `auth.identity.unknown` rows of the [log events](../reference/log-events.md) reference." [claim]
- **`add-a-second-sign-in-group.md:667`.** Replace with "7. Otherwise, read the `auth.channel.*` rows of the [log events](../reference/log-events.md) reference." [claim]
- **`theme-your-public-site.md:499`.** Replace "work through [Debug your site](debug-your-site.md)" with "see [Run cairn-audit on your site](run-cairn-audit-on-your-site.md)". This is a pending 2b link, and it matches the outline crossLink theme → run-cairn-audit. [sub]
- **`rotate-the-github-app-key.md:133`.** Replace "covers that failure and reading the logs in general" with "covers reading the logs" and link to `debug-your-site.md#read-the-structured-logs`. [claim] This keeps the outline's rotate → debug link.

**N3. Hooks snippets drop the scaffold's dev branch and `roles`. Class: overlap.**

- **`add-a-custom-admin-screen.md:216-231`.** The snippet is `export const handle = sequence(createAuthGuard({ access }), wireAuditSink);`, but the scaffold's hooks file uses `let handle` with a `devBackendHandle({ access })` branch (`templates/waymark/src/hooks.server.ts:17-25`). Show the production branch as an excerpt instead, `handle = sequence(createAuthGuard({ access }), wireAuditSink);`, with a skip marker, and say the dev branch keeps `devBackendHandle({ access })`. [claim] (`f:rurhey`, `f:6quvqm`, `f:u78zg6`)
- **`replace-magic-links-with-cloudflare-access.md:286-295`.**
  - The snippet imports `./theme-handle.js`, which exists in neither the scaffold nor the showcase.
  - It also drops the dev branch.
  - L278-279 says the guard "composes through `sequence` as it did under magic links", but the scaffold never uses `sequence`.
  - **Edit:** replace the snippet with a production-branch excerpt, `handle = createAuthGuard({ access, identity: accessIdentity });`, the same excerpt shape as `restrict-admin-access.md:135-141`. Reword L278-279 to: "`createAuthGuard` returns a plain SvelteKit `Handle` whether or not `identity` is set, so the hooks module's production branch takes one more option."
  - [claim] (`f:dwc4kp`)

**N4. `add-a-second-sign-in-group.md:78-95` declares `roles` in `src/lib/cairn.config.ts`, while `restrict-admin-access.md:52-85` and the scaffold declare it in `src/access.ts`. Class: overlap. [claim]**

A site that follows both pages ends up with two vocabularies. Add after step 1 (L95):
> A site that already declares `roles`, such as in `src/access.ts` as [Restrict admin access](restrict-admin-access.md) does, adds the instructor entry to that vocabulary instead.

**N5. Term substitutions. Class: term. [sub] unless noted.**

- **`add-cairn-to-a-sveltekit-app.md:345`:** "before the allowlist lookup" becomes "before the roster lookup". "Allowlist" is the access-map term on `security-model` and `restrict-admin-access`.
- **`debug-your-site.md:76`:** "a magic-link token, a session ID, or a magic link's contents" becomes "a sign-in token, a session id, or a sign-in link's contents". This matches `security-model.md:71`, and lowercase "id" is the arm-wide form (`f:wi766c` unchanged).
- **`debug-your-site.md:267`** ("A sign-in channel logs") and **`:405`** ("the sign-in channel"): use "auth channel", the outline term defined on `add-a-second-sign-in-group`.
- **`architecture.md:136`:**
  - "its pending branch head" becomes "its holding branch head".
  - "git is one of three stores" becomes "git is one of three data tiers".
  - Optionally, L80 "three stores" becomes "three data tiers".
- **`add-cairn-to-a-sveltekit-app.md:869,905,911`:** "Installation ID" becomes "installation ID", as on `rotate-the-github-app-key.md:3,63`.
- **`replace-magic-links-with-cloudflare-access.md:14`:** "gives the guard a resolver" becomes "gives the guard an identity resolver". The outline term is defined on this page but never used.
- **`add-a-custom-admin-screen.md:148`** [claim, small]: the outline's defining page never uses the term "section action". Add: "A form action wrapped this way is a section action." (`f:lblh3u`)
- **`migration-notes.md:425`** (kept per-version record, optional): "whitelist" becomes "allowlist".

**N6. `README.md` (interim index). Class: depth/nav label.**

- Kept-page entries (L15, L31, L32) use a bare path plus a description, while new-page entries use `./` and no description. Make them uniform; for example, drop the descriptions and use the `./` form throughout. [sub]
- The empty `## Model content` heading (L11) is fine if `check-arm-indexes` needs every group; otherwise drop it until a page lands.
- L3, "the pages join their group as they land", is figurative and close to prose about the docs. Suggested rewrite: "This index lists the extend pages rebuilt so far, each under its group." [claim, low]

**N7. Alt text, captions, and nav labels: no tells found.**

- All three alt strings are 150 characters or fewer and name their kind:
  - `architecture.md:84` (101 characters)
  - `replace-magic-links-with-cloudflare-access.md:44` (143 characters)
  - `add-a-custom-admin-screen.md:297` (130 characters)
- Each figure has a caption.
- The trailing-section labels vary by page type: "Related resources" on the concept and reference pages, "See also" on the guides, "Next steps" on the tutorial. That matches the exemplars, so no action.
- The four "Show me the steps" headings follow the sanctioned Astro device (register L753).

## Notes for the implementer (relink and prune)

- **Rearm relink 11** says the rebuilt `security-model` carries a "Recovering whitelist semantics" heading. It doesn't; the heading is "Allowlist semantics from an exhaustive map".
  - `CHANGELOG.md:2472` still cites `#recovering-whitelist-semantics`.
  - So `'file-path:docs/extend/security-model.md'` (`scripts/checks/check-symbols-allowlist.mjs:125`) must stay.
- **Stale entries in `check-symbols-allowlist.mjs`:** these name content that no rebuilt page carries any more. They are prune candidates once each is checked against the gate:
  - L37: `CLUB_DB`
  - L137: `src/lib/club/section.ts`
  - L138: `ApproveDialog.svelte`
- **Stale comments only:** these name absorbed pages, so the comment needs updating, not the entry.
  - L48: `sign-in-through-your-organization.md`
  - L89-90: `enable-tidy.md`
  - L127: `design-your-site.md`
- **L136:** the `svelte-kit/tsconfig.json` entry cites add-cairn, but add-cairn no longer names that path.

## New friction (engine or tooling)

- **F1 (tooling, scaffold).** `templates/waymark/package.json:10-26` has no type-generation script. The regenerate command lives only in a generated comment (`templates/waymark/worker-configuration.d.ts:2`), and a hand-built site from `docs/extend/add-cairn-to-a-sveltekit-app.md:208` never generates the file. As a result, no single instruction serves pages written for both audiences. Fix: ship a `cf-typegen` script (Cloudflare's own C3 convention) in the scaffold, and give the hand-built tutorial the step.
- **F2 (engine, scaffold).** `templates/waymark/migrations/` omits `0001_roles.sql`, while the scaffold's `src/access.ts` invites custom roles. The first roster add of a declared role then hits the `CHECK` constraint in `migrations/0000_auth.sql:5`. Fix: ship `0001_roles.sql` in the scaffold (role validity already moved to the app layer), or make the roster add name the missing migration, as `src/lib/auth/store.ts:20-31` does for `0004`.
- **F3 (reference).** `docs/reference/log-events.md:72` says `admin.action.csrf_refused` is "the only gate a custom admin route reaches if it's ever mounted outside the guard's coverage". A route outside the guard stops at `admin.action.session_absent` first (`src/lib/sveltekit/admin-action.ts:207-211`); in practice the event fires under `devBackendHandle`. Fix: reword the row as in C5.
- **F4 (reference).** `docs/reference/` has no `cli-cairn-logs.md`, `cli-cairn-health.md`, or `cli-cairn-sites.md`. Only `cli-cairn-json-output.md:34,300,320` mentions `cairn logs <site>` and the site id, so a page that names `cairn logs <site>` has no command reference to link.
- **F5 (reference term).** `docs/reference/log-events.md:18` says "allow-listed editor" where the arm says "roster", the same collision fixed in N5 at `add-cairn-to-a-sveltekit-app.md:345`.
- **F6 (code comment, already logged).** The Env probe settles the friction log's open item at `docs-friction-log.md:269`. `src/lib/auth-channel/factory.ts:573` has the same mechanism, now probed, so all four sites read `unknown`; the comment shows `{}` only for the narrowed parameter.

## Dispositions (applied 2026-10-07)

The applier took the batch under the edit rule, with each changed page sentence's brief updated in
the same change. The scoped reviews then ran, and every blocking finding and the listed advisories
were applied before the commit. Final text is on the pages; this table gives the disposition and
any change from the proposal above.

| finding | disposition | change from the proposal, with the reason |
|---|---|---|
| C1 | applied, then revised | `add-a-second-sign-in-group` gains the `.dev.vars.example` step and runs "the command that `worker-configuration.d.ts` records", introduced as the scaffold's recorded command (fact A, A5). `debug-your-site` and `upgrade-cairn` no longer hard-code `--include-runtime=false` for every site (fact A, B1 and B2): that flag is safe only where `src/app.d.ts` references `@cloudflare/workers-types`, as the scaffold's does, and a consumer that takes runtime globals from the generated file loses them under it. The record's one-command-for-all proposal was the error. |
| C2 | applied, then split | The `navLayout` sentence split at its join into two sentences (register F5), keeping exactly what `f:vqh4a9` and `f:altcjp` state, without the register's spelled-out one-sided cases. The optional site-responsibility bullet was applied. |
| C3 | applied, then revised | Split into two sentences to hold the 26-word cap. The second now says each section action answers `fail(500)` and logs `admin.action.misconfigured`, linking the debug row (register F2), since an event is logged, not refused with. Companion `scaffolded-site-files` edit applied. |
| C4 | applied | Shortened to "the site id that `cairn sites list` prints" to stay under 26 words. |
| C5 | applied, then rewritten | New `admin.action.csrf_refused` row, rewritten to its siblings' anatomy (register F6): "fails the CSRF check" in place of the narrower double-submit wording, the warning-and-fields sentence, `devBackendHandle` named, "Behind the guard" in place of "In production", and rewrapped (fact A, A7). |
| C6 `Env` (sveltekit, auth-channel) | applied | tsc 6.0.3 probe re-run by the applier and by the fact B read. |
| C6 vocabulary path | applied, then reworded | The setup colon became "at the path ... or at ..." (fact B advisory). |
| C6 misconfigured step 3 | applied, then split | Split into four sentences under the list-item cap (register F1). |
| C6 log-events misconfigured row | applied, then reworded | The parenthetical became two sentences, naming `access_map_not_attached` as the reason that does not occur behind the guard (register F3). |
| N1 | applied, then revised | The migration steps landed in "Deploy the changes". "The scaffold's auth database" became "The site's auth database", since the hand-built tutorial applies only `0000` and `0004` too (fact A, A1). Resolve check 4 now follows checks 1 to 3's anatomy (condition, "check whether", cause, fix) and the section intro names the missing roles migration as a cause (register F7). |
| N2 add-cairn L562 | applied, then deleted | The pointer repeated the hooks-step sentence 20 lines up and followed the wrong check list; its link folded into that sentence (register F2). The outline's add-cairn to debug link holds through it. |
| N2 add-cairn L792, L1106 | applied | Both pointers deleted. |
| N2 add-cairn L1214 | applied, then reworded | "find the" became "look for an", since a message lost after the send leaves no `auth.link.send_failed` record (fact A, A6, taken over register F8's bulleted form as the more precise). |
| N2 replace-magic-links L400 | applied | |
| N2 add-a-second L667 | applied, adjusted | "the auth channel's rows" in place of `auth.channel.*`, which `check:symbols` reads as an unknown log event. |
| N2 theme L499 | applied | A pending 2b link, by the sanctioned mechanism. |
| N2 rotate L133 | applied | |
| N3 add-a-custom-admin-screen | applied, then extended | A sentence now says a scaffolded hooks file already imports some of the excerpt's names, so its imports merge into the existing ones (fact A, A8). |
| N3 replace-magic-links | applied, then reworded | The excerpt drops the duplicate `access` import (fact A, A4). The lead sentence now reads "keeps its shape and the guard takes the resolver as one more option", then "A deploy puts it into effect." (register F4, taken over fact A's A4 wording; both are correct, so the register wins). |
| N4 | applied, then reworded | "as [Restrict admin access] does in `src/access.ts`" (register F11). The brief drops `f:qlgggh` for `f:zjglk8` and `f:dbaklx` (fact A, A3) and adds `f:3z1uxv` to vouch for the `src/access.ts` path, which the provenance gate requires a cited fact to carry. |
| N5 | applied, except `migration-notes.md:425` | Refused there: the kept per-version record takes only link restoration and its own pass entry. |
| N6 | applied, adjusted | The record's "rebuilt" wording would have miscounted the kept pages; L3 reads "The extend track is being rebuilt, so this index lists only the pages in place so far, each under its group." The empty "Model content" heading was dropped, since `check-arm-indexes` does not need it. |
| N7 | no action | No tells found. |
| Notes: rearm 11 | resolved by deletion | The `'file-path:docs/extend/security-model.md'` allowlist entry and its comment were deleted: the page exists, so `check-symbols` resolves the path, and `migration-notes.md:427` already cites the rebuilt heading (fact B). |
| Notes: stale allowlist entries | applied | Six pruned (`CLUB_DB`, `svelte-kit/tsconfig.json`, `club/section.ts`, `ApproveDialog.svelte`, `members/channel.ts`, `2026-08-14-hello.md`); stale comments repointed to the rebuilt pages; `cli-flag:--env-file` and `cli-flag:--include-runtime` added as wrangler's own flags. |

Friction from this read: F1, F2, and F6 merged into existing open entries (the F1 entry now also
records the `--include-runtime=false` scope above); F3 fixed in place on
`docs/reference/log-events.md`, then split at its join (register F10); F4 and F5 filed new.

## Scoped reviews

Three scoped reviews read the changed sentences, all returning **fix**. Every fix below landed
before the commit.

**Register** (the guide lens, tellgrader floor clean on every changed line):

- F1 (blocking): `reference/sveltekit.md` check-order item 3 split into four sentences under the
  list-item cap.
- F2 (blocking): `add-cairn-to-a-sveltekit-app.md`'s misconfigured pointer deleted, its link folded
  into the hooks-step sentence.
- F3: `log-events.md` misconfigured row, ambiguous "this reason" named as `access_map_not_attached`.
- F4: `replace-magic-links` "Wire the resolver" lead, the broken "so" repaired.
- F5: `security-model.md` `navLayout` sentence split at its join (without the spelled-out cases).
- F6: debug `admin.action.csrf_refused` row matched to its siblings.
- F7: restrict Resolve check 4 reordered, and the section intro names the roles migration.
- F8: taken in fact A's A6 wording.
- F9: `reference/sveltekit.md` `bootstrapOwner` sentence split, the tutorial step named as the link.
- F10: `log-events.md` `csrf_refused` garden-path sentence split.
- F11: add-a-second N4 sentence reworded.
- F12: showcase README split, its link text the page title in place of a path.
- F13: `upgrade-cairn.md` precondition reordered, the reason first and the tiers link second.

**Fact A** (claims against the code at HEAD; C2 to C5, N1 to N5 verified clean):

- B1 (blocking): `upgrade-cairn.md` step 5 conditions `--include-runtime=false` on `app.d.ts`
  referencing `@cloudflare/workers-types`.
- B2 (blocking): `debug-your-site.md` fixed-today step 3 runs "the command its first lines
  record" and names the scaffold's command as the scaffold's case; the brief cites `f:pe4vuc` and
  `f:3ccbez`.
- A1: "The site's auth database" in place of "The scaffold's".
- A2: `restrict-admin-access.md` "The scaffold passes its map to the two hook handles and not to
  the adapter", the brief updated to cite `f:cvzb8z` and `f:u78zg6`.
- A3: the N4 brief cites retargeted (see N4 above).
- A4: replace-magic-links excerpt drops the duplicate `access` import.
- A5: add-a-second step 6 introduces the code block as the scaffold's recorded command.
- A6: taken for register F8.
- A7: debug `csrf_refused` row rewrapped.
- A8: add-a-custom-admin-screen import-merge sentence added.

**Fact B** (C6 edits, anchors, relinks, comments, map, allowlist, template; verified clean
otherwise):

- Blocking: the showcase members page comment now names the `+page.server.ts` shape "Gate the
  member area" builds.
- Blocking: the members login comment now says request and confirm sit on one page as "Build the
  login route" lays out, with logout on the members page.
- Blocking: the dead `'file-path:docs/extend/security-model.md'` allowlist entry and its comment
  deleted; `check:symbols` re-run green. The full gate then failed one unit test that pinned that
  entry (`src/tests/unit/check-symbols.test.ts`, "carries the kept migration-notes record's
  code-span path to a deleted extend page"). The test now pins the same property on the kept
  record's other retired-page path, `docs/reference/doctor.md` (`migration-notes.md:334`), which
  stays allowlisted.
- Blocking: `reference/auth-channel.md` `throttle.cooldownMs` row drops its "Limits of the auth
  channel" parenthetical (that section says nothing about the cooldown), with a friction entry.
- Blocking: `reference/auth-channel.md` "whole economic bound on guessing a code" repointed to
  `add-a-second-sign-in-group.md#write-the-channel-module`, the sentence `f:pa2hqh` backs.
- Advisory: `core.md` data-tiers sentence scoped to what the section covers.
- Advisory: `README.md` add-cairn sentence says the tutorial walks the install to a production
  deploy.
- Advisory: `reference/sveltekit.md` vocabulary-path setup colon removed.
- Advisory: `cli-cairn-media-seed.md` "Once seeded" rebound to its clause.

One fact-container imprecision surfaced and was left as it stands: `f:cvzb8z`'s clause "a map passed
only to `createAuthGuard`, as the scaffold's `src/hooks.server.ts` does" predates the scaffold
passing `{ access }` to `devBackendHandle` too. The fact's claim about the engine screens holds,
and the page sentence now also cites `f:u78zg6` for the hooks wiring. Rewording the bullet would
drop it to `[candidate]` and uncite every sentence resting on it, so the fix belongs to the next
fact read over the extend container.

## The three new facts' tags

The applier filed `f:3ccbez` `[external: Cloudflare]`, `f:22fod0` `[verified]`, and `f:m4ihla`
`[verified]` directly. The facts README's "Edits after the chain" rule asks for `[candidate]` from
an edit after the chain, retagged only by a fact read. The scoped fact A read is that fact read: it
traced all three to their sources (including the `wtypes/` probe's 16,064 and 24 line counts) and
confirmed each tag as filed.

## Relink entries, stage 2a (71)

Indices are `relink.json` `entries[]` positions, the outline's `rearms[].relinkIndex`. "R6" is
`c00cd0b4`, "Apply task 9's consistency read and relinks (2a R6)"; `relink.json` carries each
entry's restoring commit in its `restoredIn`.

| index | file | change that restored it | commit |
|---|---|---|---|
| 2 | `scripts/checks/check-arm-indexes.mjs` | arm-state driven; re-armed when the interim `docs/extend/README.md` landed | `f6cee04f` |
| 6 | `scripts/checks/check-package-files.mjs` | arm-state driven; the tarball asks for the interim index | `f6cee04f` |
| 11 | `scripts/checks/check-symbols-allowlist.mjs` | `'file-path:docs/extend/security-model.md'` deleted: the page exists and the record cites its rebuilt heading | R6 |
| 12 | `src/tests/unit/github-slug-contract.test.ts` | the Milestone 1 case marked synthetic; every other case's source asserted to exist | `f6cee04f` |
| 19 | `scripts/checks/docs-links.mjs` | `LEGACY_PATH_MAP` auth-channel-security-model to `security-model.md` | R6 |
| 21 | `scripts/checks/docs-links.mjs` | enforced-design to `add-a-custom-admin-screen.md` | R6 |
| 22 | `scripts/checks/docs-links.mjs` | media-storage to `architecture.md` | R6 |
| 23 | `scripts/checks/docs-links.mjs` | explanation/security-model to `security-model.md` | R6 |
| 24 | `scripts/checks/docs-links.mjs` | guides/add-a-custom-admin-screen to `add-a-custom-admin-screen.md` | R6 |
| 25 | `scripts/checks/docs-links.mjs` | add-a-login-channel to `add-a-second-sign-in-group.md` | R6 |
| 31 | `scripts/checks/docs-links.mjs` | configure-auth-and-d1 to `add-cairn-to-a-sveltekit-app.md` | R6 |
| 34 | `scripts/checks/docs-links.mjs` | iterate-your-design-locally to `theme-your-public-site.md` | R6 |
| 40 | `scripts/checks/docs-links.mjs` | restrict-admin-access to `restrict-admin-access.md` | R6 |
| 55 | `docs/reference/admin-routes.md` | link to `add-a-custom-admin-screen` | R6 |
| 56 | `docs/reference/auth-channel.md` | link to `security-model#the-auth-channels-threat-surface` | R6 |
| 57 | `docs/reference/auth-channel.md` | link to `security-model#the-dev-backend-flags-two-refusals` | R6 |
| 58 | `docs/reference/auth-channel.md` | link to `add-a-second-sign-in-group#write-the-channel-module` (fact B; the threat-surface section never states the bound) | R6 |
| 59 | `docs/reference/auth-channel.md` | link dropped, no 2a home; friction filed | R6 |
| 60 | `docs/reference/auth-channel.md` | link to `add-a-second-sign-in-group#provision-the-channel-database` | R6 |
| 61 | `docs/reference/auth-crypto.md` | link to `security-model#the-session-cookie` | R6 |
| 62 | `docs/reference/cli-cairn-media-seed.md` | link to `theme-your-public-site#iterate-locally`, rebound to its clause | R6 |
| 63 | `docs/reference/cli-cairn-media-seed.md` | see-also bullet to `theme-your-public-site#iterate-locally` | R6 |
| 65 | `docs/reference/core.md` | link to `architecture#data-tiers`, scoped to what it covers | R6 |
| 67 | `docs/reference/core.md` | link to `restrict-admin-access` | R6 |
| 70 | `docs/reference/log-events.md` | link to `security-model#magic-link-sign-in` | R6 |
| 71 | `docs/reference/log-events.md` | link to `security-model#access-map-coverage` | R6 |
| 76 | `docs/reference/sveltekit.md` | link to `add-a-custom-admin-screen#wire-the-audit-sink` | R6 |
| 77 | `docs/reference/sveltekit.md` | link to `add-a-custom-admin-screen#wire-the-audit-sink` | R6 |
| 78 | `docs/reference/sveltekit.md` | link to `add-a-custom-admin-screen#gate-it` | R6 |
| 79 | `docs/reference/sveltekit.md` | link to `security-model#browser-binding-for-sign-in` | R6 |
| 80 | `docs/reference/sveltekit.md` | link to `add-cairn#compose-the-runtime-and-the-admin`, reworded and split (the tutorial uses `bootstrapOwner`) | R6 |
| 87 | `README.md` | link to `add-cairn-to-a-sveltekit-app` | R6 |
| 92 | `SECURITY.md` | links to `security-model` and `architecture#data-tiers` | R6 |
| 97 | `docs/extend/upgrade-cairn.md` | link to `architecture#stability-tiers` | R6 |
| 99 | `docs/extend/upgrade-cairn.md` | the original `debug-your-site` sentence restored | R6 |
| 109 | `examples/cairn-theme/cairn.css` | comment to `theme-your-public-site` | R6 |
| 110 | `examples/cairn-theme/README.md` | link to `theme-your-public-site` | R6 |
| 111 | `examples/showcase/e2e/members.spec.ts` | comment to `add-a-second-sign-in-group` | R6 |
| 112 | `examples/showcase/src/app.d.ts` | nothing to restore: the SvelteKit 3 move (`a606fbee`) deleted the comment with `App.Platform` | R6 (recorded) |
| 113 | `examples/showcase/src/members/capture-transport.ts` | comment to `add-a-second-sign-in-group` | R6 |
| 114 | `examples/showcase/src/members/channel.ts` | comment to `add-a-second-sign-in-group` | R6 |
| 115 | `examples/showcase/src/routes/members/+page.server.ts` | comment to "Gate the member area", the shape it builds (fact B) | R6 |
| 116 | `examples/showcase/src/routes/admin/signups/+page.server.ts` | recipe to `add-a-custom-admin-screen`; template re-emitted | R6 |
| 117 | `examples/showcase/src/routes/members/login/+page.server.ts` | recipe to `add-a-second-sign-in-group` | R6 |
| 118 | `examples/showcase/src/routes/members/login/+page.server.ts` | comment to "Build the login route", request and confirm on one page (fact B) | R6 |
| 119 | `examples/showcase/src/routes/members/login/+page.svelte` | comment to `add-a-second-sign-in-group` | R6 |
| 120 | `examples/showcase/src/routes/test/last-otp/+server.ts` | comment to `security-model` "Limits of the auth channel", the only page that states the roster-oracle hazard | R6 |
| 121 | `examples/showcase/wrangler.jsonc` | comment to `add-a-second-sign-in-group` | R6 |
| 123 | `examples/showcase/README.md` | link to `add-cairn-to-a-sveltekit-app`, reworded and split | R6 |
| 125 | `examples/showcase/README.md` | link to `scaffolded-site-files` | R6 |
| 128 | `src/lib/dev-flag.ts` | comment to `security-model` "The dev-backend flag's two refusals" | R6 |
| 132 | `src/lib/reproductions/stories/CustomScreen.svelte` | comment to `add-a-custom-admin-screen` "Compose the screen from the toolkit" | R6 |
| 134 | `src/lib/reproductions/stories/site.ts` | comment to `add-a-custom-admin-screen` | R6 |
| 135 | `src/lib/sveltekit/admin-action.ts` | comment to `add-a-custom-admin-screen` | R6 |
| 136 | `src/lib/sveltekit/admin-nav.ts` | comment to `security-model` "Access map coverage" | R6 |
| 137 | `docs/internal/admin-design-system.md` | line rewritten to name "Animate the screen" in `add-a-custom-admin-screen` | R6 |
| 156 | `docs/internal/src-lib-map.md` | link to `architecture.md` ("Export map") | R6 |
| 177 | `scripts/checks/check-symbols-allowlist.mjs` | `env-var:CLUB_DB` pruned | R6 |
| 178 | `scripts/checks/check-symbols-allowlist.mjs` | `env-var:CAIRN_FIXED_TODAY` kept, `debug-your-site` still uses it | R6 (recorded) |
| 179 | `scripts/checks/check-symbols-allowlist.mjs` | jose codes comment to `replace-magic-links-with-cloudflare-access` | R6 |
| 182 | `scripts/checks/check-symbols-allowlist.mjs` | the security-model comment deleted with its entry (index 11) | R6 |
| 183 | `scripts/checks/check-symbols-allowlist.mjs` | `theme.css` comment to `theme-your-public-site` | R6 |
| 184 | `scripts/checks/check-symbols-allowlist.mjs` | `src/lib/club/section.ts` pruned | R6 |
| 185 | `scripts/checks/check-symbols-allowlist.mjs` | `ApproveDialog.svelte` pruned | R6 |
| 186 | `scripts/checks/check-symbols-allowlist.mjs` | `src/lib/today.ts` kept, `debug-your-site` still uses it | R6 (recorded) |
| 187 | `scripts/checks/check-symbols-allowlist.mjs` | `src/lib/members/channel.ts` pruned | R6 |
| 188 | `scripts/checks/check-symbols-allowlist.mjs` | `content.ts` comment to `add-cairn-to-a-sveltekit-app` | R6 |
| 190 | `scripts/checks/check-symbols-allowlist.mjs` | `2026-08-14-hello.md` pruned | R6 |
| 194 | `scripts/checks/check-symbols-allowlist.mjs` | `_worker.js` comment to `add-cairn-to-a-sveltekit-app` | R6 |
| 195 | `scripts/checks/check-symbols-allowlist.mjs` | `access-identity.ts` comment to `replace-magic-links-with-cloudflare-access` | R6 |
| 196 | `scripts/checks/check-symbols-allowlist.mjs` | `admin/__data.json` comment to `replace-magic-links-with-cloudflare-access` | R6 |

No entry is tagged `close`, and none is left open.

## Friction filed

- Merged into the open `f:pe4vuc` type-generation entry: the three pages now point at the recorded
  command, and `--include-runtime=false` is the scaffold's case only (F1).
- Merged into the open `0001_roles.sql` entry: the scaffold omits `0001` (F2).
- Merged into the open `Env` entry: both reference sentences probed and fixed, the code comments
  left for an engine pass (F6).
- New: no `cairn logs`, `cairn health`, or `cairn sites` command pages (F4).
- New: the reference arm's roster-sense "allowlist", 16 uses (F5).
- New: the rebuilt security model has no residual-risk line for the auth channel's resend
  cooldown, so `relink.json` index 59 has no 2a home (fact B).
