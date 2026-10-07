# Framing record: Rotate the GitHub App key

Agent-facing; drives the introduction of `docs/extend/rotate-the-github-app-key.md` only; the body
follows the page plan (`docs/internal/briefs/extend/rotate-the-github-app-key.plan.md`).

Written 2026-10-07 by the framing step of the docs page chain (stage 2a). No earlier framing record
existed. Inputs read: "The introduction" and "The page anatomies" in
`docs/internal/docs-register.md`; the outline `docs/internal/outlines/extend.json` (groups, every
page's job, covers, and out-of-scope list, and the crossLinks); the arm index
`docs/extend/README.md` (the only arm index on disk besides `docs/reference/README.md`; no
`docs/README.md` exists); the page plan; every fact bullet the plan names; the pages that link in
(`docs/extend/add-cairn-to-a-sveltekit-app.md:28,939`, `docs/extend/security-model.md:50,391,516`);
and, for arrival paths, `packages/create-cairn-site/src/cloudflare/secret.mjs:23-48` and
`src/lib/diagnostics/conditions.ts:193-201`.

## Who arrives, from where, and why

1. **The scheduled rotator.** A developer who runs an organization's site on cairn and replaces
   the key because the organization rotates credentials on its own schedule; GitHub's keys never
   expire, so any schedule is the owner's choice (`f:s90j7l`, `f:ixr3ny`).
   - From: the extend index's Operate group once the page lands; `docs/extend/security-model.md`
     ("Limits of the installation token", line 391, and its How-to guides list, line 516; the
     outline's crossLink reads "Operating the key it describes"); a search.
   - Came for: a key swap with no publishing outage.
   - Knows: the site runs; Wrangler; that the App exists. From the security model, the key's
     reach and, in passing, the 55-minute token cache.
   - Lacks: that two keys can sit on the App at once and why that removes the outage; that the
     push deploys at once with no build; which signal proves that GitHub accepts the new key, and
     how long that proof takes.

2. **The exposed-key reader.** The same developer, replacing a key a copy of which may have been
   exposed. GitHub names that as the occasion for this order (`f:s90j7l`).
   - From: a search, or the security model.
   - Came for: a new key in service and the exposed one retired.
   - Knows: that the key is suspect; possibly little of how cairn uses it.
   - Lacks: that the old key stays valid until it is deleted (`f:ixr3ny`), and that the page
     deletes it only after a confirmation that cannot come sooner than 55 minutes after the push
     (`f:ejuoh6`, `f:vg42j3`). The order trades exposure time for no outage. The page answers
     this reader with that trade named and offers no faster order (friction filed, see the last
     section).

3. **The hand-built site's developer.** A developer who built the site through
   `docs/extend/add-cairn-to-a-sveltekit-app.md`.
   - From: that tutorial's bounds list (line 28) and the line after "Store the App's credentials"
     (line 939, "To replace the key later"); the crossLink reads "The later key rotation for the
     key registered here".
   - Came for: the later replacement the tutorial deferred.
   - Knows: registering the App, the App ID and Installation ID in `createGithubApp`, one encode
     form (`base64 < <file> | tr -d '\n'`), and that the `.pem` was moved outside every
     repository, so this reader likely still holds the old key's file and has a rollback.
   - Lacks: a `/healthz` route (the tutorial mounts none; Before you begin links the `loadHealth`
     entry), and this page's three encode forms, which differ from the tutorial's (friction filed
     by the plan).

4. **The scaffolded site's developer.** A developer whose site `create-cairn-site` created, App and
   deploy included (`f:kldwss`).
   - From: a search or the extend index. Not from the setup command: its closing message after
     moving the key tells a developer who loses the key to "re-run this step"
     (`packages/create-cairn-site/src/cloudflare/secret.mjs:43-46`), and neither it nor the baked
     README names this page (both filed earlier by other steps).
   - Came for: replacing a key they never handled by hand.
   - Knows: the admin and the setup run; perhaps not Wrangler's secret commands.
   - Lacks: any copy of the old key. The setup command piped it into the Worker and kept none
     (`f:olofdb`, `f:72yc97`), so this reader has no rollback, and a failed new key is recovered
     with a third key (`f:lg2ae8`). This changes what a failure costs, so the introduction says it
     before the reader starts.

5. **The reader whose key already fails.** A developer mid-rotation or after it, whose `/healthz`
   reports `ok: false`, whose admin logs `github.unreachable`, or whose publish does not complete;
   it includes a site whose Worker holds no key at all.
   - From: a search on the symptom, or back to this page mid-rotation.
   - Came for: recovery.
   - Knows: a symptom.
   - Lacks: what each signal means and whether the rollback is still open. "Recover from a failed
     key" answers this, and its first check covers a missing key (`f:5dwnh1`, `f:9xqudi`). The
     introduction names that section by heading so this reader skips ahead.

Readers likely to arrive in the wrong place:

- **Registering the App for the first time.** Belongs on
  `docs/extend/add-cairn-to-a-sveltekit-app.md#register-the-github-app`, or the setup command for
  a new scaffolded site.
- **Why the key lives only as a Worker secret, and what the App's token can write.** Belongs on
  `docs/extend/security-model.md#the-github-apps-reach`.
- **A GitHub failure with no key change** (the App uninstalled, the repository refusing a read;
  the `github.app-unreachable` condition lists these, `src/lib/diagnostics/conditions.ts:197`). No
  extend page owns this case: `debug-your-site`'s outline carries no `github.unreachable` row, and
  the condition's `docsAnchor` names the unbuilt admin page `is-it-working.md#install-the-github-app`.
  The introduction makes no promise to this reader. See "Place in the doc set".

## Background the page rests on

1. **Why rotation exists.** An App's private keys never expire and are removed only by hand
   (`f:ixr3ny`, `f:zoekqt`), so the key a site signs with stays in service until its developer
   replaces it, on demand (`f:72yc97`). GitHub names a suspected compromise as the occasion, and
   its plan is the same three moves: generate a new key, switch the app to it, delete the old one
   (`f:s90j7l`, filed by this step). A scheduled rotation is the reader's own reason, and the
   introduction states it as that, with no claim of a recommended cadence; no source states one.
   Why the default holds the key as one Worker secret is custody reasoning that belongs to the
   security model, and the introduction only routes to it.
2. **The key's job, from the rotation's angle.** The Worker holds the key as
   `GITHUB_APP_PRIVATE_KEY_B64` and signs with it whenever it needs an installation token, the
   short-lived credential that every save and publish commits with (`f:i4fg3o`, `f:kkp5bi`,
   `f:cjonmm`). Replacing the key changes which key signs the Worker's next token request, and
   nothing else on the site.
3. **Where GitHub fits.** GitHub holds the App's key list: up to 25 keys, of which it keeps only
   the public portion, removed by hand and never restored (`f:zoekqt`, `f:lg2ae8`). Two keys can
   sit on the App at once, and a new key does not invalidate the old one (`f:ixr3ny`). That
   overlap makes the order possible: generate, push, confirm, then delete (`f:ejuoh6`).
4. **Where Cloudflare fits.** The key reaches the Worker as a secret, and `wrangler secret put`
   creates and deploys a new Worker version at once (`f:86h9o6`). The Worker caches each
   installation token per isolate for 55 minutes, so a warm isolate keeps a token the old key
   minted (`f:vg42j3`). Workers Logs records only with observability on (`f:prb2os`), which is
   body material, not an introduction point.
5. **Where SvelteKit fits: deliberately absent.** The rotation changes no source file, since the
   App id and installation id stay in the adapter's `createGithubApp` call (`f:9xqudi`). It runs
   no build, since the secret write deploys by itself (`f:86h9o6`). The introduction says that
   much, because a Svelte-fluent reader expects a code change and a redeploy. The `/healthz`
   route is a SvelteKit route the scaffold ships (`f:paotzb`). It enters at Before you begin and
   Verify, not in the introduction.
6. **What the overlap costs.** The confirmation that lets the old key go cannot come sooner than
   the token cache's 55 minutes (`f:vg42j3`), and `/healthz` cannot replace it, since its check
   makes no network call (`f:5dwnh1`; body only). Both keys stay valid for at least that long
   (`f:ixr3ny`). For a scheduled rotation that is time. For an exposed key it is exposure, the
   price of no outage (`f:s90j7l`, `f:ejuoh6`).
7. **The rollback is conditional.** Until the deletion, re-pushing the old key restores signing
   with it (`f:sszb7b`). That re-push needs the old key's file, which a site the setup command
   created never kept (`f:kldwss`, `f:72yc97`). After the deletion, the recovery is a third key
   (`f:lg2ae8`).

## Place in the doc set

- **Group and neighbors.** Operate, order 24, after `debug-your-site` and before
  `run-cairn-audit-on-your-site`. The kept records `upgrade-cairn.md` and `migration-notes.md`
  share the index heading. It is the group's only page about a credential, and the extend
  track's only page that spans a vendor console (GitHub) and a CLI deploy (Wrangler) in one
  procedure. `docs/extend/README.md` lists only pages in place, so the page joins Operate when it
  lands, and the index entry's wording is the index's own.
- **What links in, and why.** The tutorial links the page twice, as the later replacement of the
  key it registers. The security model links it three times, as the operating side of the key
  whose custody and reach it explains. No reference page links in. No index lists it yet. The
  setup command's output and the scaffold's guidance do not name it.
- **What links out.** `debug-your-site` (the crossLink, "Signing failures after a rotation", from
  the recovery section); the tutorial's register, store-credentials, verify, and Email Sending
  anchors; `security-model.md#the-github-apps-reach`; `docs/reference/sveltekit.md#loadhealth`;
  `docs/reference/log-events.md`; GitHub's "Managing private keys for GitHub Apps"; and
  Cloudflare's "Secrets" and Workers Logs pages.
- **What siblings own, so the introduction words a shared idea fresh.**
  - `docs/extend/security-model.md` states the mechanism from the custody angle: its opening says
    edits reach the repository "through the site's GitHub App, never a personal account, with the
    App's private key held as a Worker secret". Its "The GitHub App's reach" says "Every save and
    publish commits through the site's GitHub App" and spells out the JWT, the short-lived token,
    the 55-minute cache, and "never written to disk ... never logged". The rotation introduction
    keeps none of that wording. It frames the key by its lifecycle (never expires, replaced by
    hand) and by what a change of key changes, and it carries no custody clause.
  - `docs/extend/add-cairn-to-a-sveltekit-app.md` ("Store the App's credentials") says "The
    private key signs the App's requests for installation tokens, so it lives only as the Worker
    secret". The rotation introduction avoids "lives only as the Worker secret". For the
    scaffolded case it says the setup command kept no copy outside the Worker. The tutorial's
    introduction steers readers to the setup command as the easier route. The rotation page has
    no easier route to name, since the setup command's key step cannot take a new key
    (`secret.mjs:25-28`), so the introduction offers none.
  - `docs/extend/architecture.md` owns the write path (holding branch, Publish, deploy). The
    introduction names save and publish only as what the installation token serves.
  - `debug-your-site` owns reading the logs in general. The introduction names no log event.
- **A coverage gap for the stage, not friction.** A GitHub failure with no key change has no
  owning page on the extend track, as the wrong-place list above records. The introduction routes
  only the plan's two out-of-scope items.

## Intro plan

Three paragraphs, then the plan's bounds (prior knowledge and what the page leaves out), kept as
the plan states them. No heading. The first sentence states the subject from the reader's
situation. It is neither an imperative nor a sentence about the page.

1. **Why the key gets replaced, and where the rotation happens.** Open on the key's lifecycle: a
   GitHub App's private key never expires, so the key a cairn site signs with stays in service
   until its developer replaces it (`f:ixr3ny`, `f:zoekqt`, `f:s90j7l`). Then the key's job in
   one sentence: the Worker holds it as `GITHUB_APP_PRIVATE_KEY_B64` and signs with it whenever it
   needs an installation token, the short-lived credential every save and publish commits with
   (`f:i4fg3o`, `f:kkp5bi`, `f:cjonmm`). Then the readers' reasons. GitHub names one occasion, a
   key that may have been exposed (`f:s90j7l`). An organization may also rotate on its own
   schedule, which is the reader's reason and carries no product claim. Then where the work
   happens: on GitHub, which holds the App's keys, and in Cloudflare, where `wrangler secret put`
   deploys the new key to the Worker at once (`f:zoekqt`, `f:86h9o6`). The App id and
   installation id in the adapter stay as they are, so no source file changes and no build runs
   (`f:9xqudi`, `f:86h9o6`).
2. **The two-key model, the order, and the contract.** An App can hold several private keys at
   once, and a new key does not invalidate the old one (`f:ixr3ny`, `f:zoekqt`). That overlap
   removes the outage: the new key is generated beside the old one, pushed to the Worker, and
   confirmed before the old key is deleted (`f:ejuoh6`). The contract sentence comes here, with
   who the page is for. A developer who can edit the site's GitHub App and deploy its Worker
   replaces the App's private key without a publishing outage, proves the new key before the old
   one goes, and recovers if the new key fails. The drafter may split it in two, but must keep
   all three outcomes. Close the paragraph on the two recoveries. Until the deletion, the old key
   still works and a failed new key can be rolled back (`f:ixr3ny`, `f:sszb7b`). After it,
   GitHub restores nothing, and the recovery is a third key (`f:lg2ae8`).
3. **What the order costs, reader by reader.** Proving the new key takes at least 55 minutes,
   since the Worker caches each installation token that long and a publish inside the window can
   run on a token the old key minted (`f:vg42j3`). State the duration and its cause only, and
   leave "per isolate" and warm versus cold to Verify. For a key that may have been exposed, that
   window is the price of no outage. GitHub accepts the old key until it is deleted, and this is
   the order GitHub itself recommends for a compromise (`f:ixr3ny`, `f:ejuoh6`, `f:s90j7l`). The
   rollback needs a copy of the old key, and a site that `create-cairn-site` created kept none
   outside the Worker, so on such a site a failed new key is recovered with a third key
   (`f:kldwss`, `f:72yc97`, `f:lg2ae8`). This is the page's first mention of the scaffolder, so it
   takes the `create-cairn-site` name. A reader whose key already fails can start at "Recover
   from a failed key", named by heading.

Then the plan's bounds, unchanged in substance (plan items 3 and 4). The page assumes a terminal
on the reader's platform, Wrangler's secret commands, and a Workers Logs query. Registering the
App the first time belongs to
`docs/extend/add-cairn-to-a-sveltekit-app.md#register-the-github-app`, or the setup command for a
scaffolded site. Why the key lives only as a Worker secret, and what the App's token can write,
belong to `docs/extend/security-model.md#the-github-apps-reach`. The bounds sentence may name the
page.

Cautions for the drafter, introduction only:

- No custody clause (on disk, logged, why a Worker secret, never a personal account): security
  model.
- No invented exposure scenario, such as a committed file or a lost laptop (Tells, "No invented
  material"), and no recommended rotation cadence, since no source states one.
- Write "at least 55 minutes", never "about an hour". Do not say whether deleting a key revokes
  tokens already minted with it, since no fact states it.
- Keep `/healthz`, `github.unreachable`, and the encode forms out of the introduction; each has
  its body section.
- Never claim that `/healthz` proves GitHub accepts a key (`f:5dwnh1`), here or anywhere.

## Departures from the plan's introduction

1. **Opening order.** The plan's item 1 opens on the mechanism (the App, the key, the JWT, the
   token). The framing opens on the key's lifecycle and moves the mechanism to the second
   sentence. The mechanism-first opening would echo the security model's opening and its "The
   GitHub App's reach". Leading with the never-expiring key also states why rotation exists, as
   the house ruling asks, before the page that performs it.
2. **The reasons rest on a fact.** The plan's item 2 named "the organization's policy" and "a copy
   of the key may have been exposed" with no fact. The exposure occasion now rests on `f:s90j7l`,
   filed by this step from GitHub's two key-management pages. The schedule stays a reader's
   reason with no product claim.
3. **The overlap's length and the exposure trade move up.** The plan keeps the token cache in
   Verify's opening. The framing adds its consequence to paragraph 3: both keys stay valid for at
   least 55 minutes (`f:vg42j3`), and for an exposed key that is the price of no outage. The
   scheduling reader and the exposed-key reader both need this before step one, and the plan's
   own "What the page argues" names the cache as the reason the confirm waits. The mechanics stay
   in Verify.
4. **The rollback is qualified.** The plan's item 1 ends "which is also what leaves a rollback".
   The framing makes the rollback conditional on a kept copy and names the scaffolded case
   (`f:kldwss`, `f:72yc97`), since that reader has no rollback and would otherwise learn it only
   at Before you begin. That precondition stays as the plan has it.
5. **The recovery reader is routed.** Paragraph 3 names "Recover from a failed key" by heading for
   a reader whose key already fails. The plan's introduction routed only out-of-scope readers.
6. **Two facts join the introduction.** `f:cjonmm` (a save commits through the installation token)
   backs "every save and publish", and it is outside the plan's fact list. `f:86h9o6` and
   `f:9xqudi` join paragraph 1 for the no-source, no-build point; the plan places them in "Push
   the new key to the Worker", where they stay.
7. **The scaffolder's first mention moves into the introduction.** Paragraph 3 and the bounds
   mention the scaffolder, so `create-cairn-site` appears first in the introduction (register,
   "Names"). Before you begin, which the plan has saying "`create-cairn-site` creates the App and
   deploys the site in one run", then says "the setup command".

Friction this step filed in `docs/internal/docs-friction-log.md`: a rotation after a suspected
compromise keeps the exposed key valid for at least 55 minutes (`f:s90j7l`, `f:ixr3ny`,
`f:ejuoh6`, `f:vg42j3`, `f:72yc97`). It does not block the page. The introduction names the trade.
