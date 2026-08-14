# Pass T2 spike verdict: the own-App GitHub chapter against real GitHub

Task 1 of the T2 plan (`docs/superpowers/plans/2026-08-10-create-cairn-site-t2.md`). Run
2026-08-10 in one Geoff browser sitting (two rounds, about fifteen minutes total including two
mid-spike corrections), against the glw907 personal account. Every artifact the spike created
(two throwaway Apps, three private repos) was deleted in the same sitting; the repos via the
API, the Apps by hand at GitHub's App settings, which has no deletion API.

**Decision: the manifest-first own-App design STANDS.** `POST /user/repos` with the user
access token of an installed manifest-created App returns 201, so the fallback (guided browser
repo-create) stays unbuilt. Four premises came back different from the spec's reading; the
amendments are listed at the end and folded into the plan's task briefs.

## Observed results, premise by premise

Raw records: `spike-results.json` and `spike2-results.json` in the session job directory;
the durable content is below.

**(a) Manifest flow.** Conversion `201` with `slug`, `client_id`, `client_secret`, `pem`,
`webhook_secret`. Two corrections were needed to reach it:

- A signed-out admin dead-ends: the manifest is a form POST to
  `github.com/settings/apps/new`, and GitHub's login redirect replays the destination as a
  GET without the POST body, landing on "We didn't find an App Manifest for your request."
  The tool's pre-open printed line must say to sign in to GitHub first, and the recovery for
  this page is "sign in, then re-click" (the form page stays served, so re-clicking works).
- **`hook_attributes.url` is required by the manifest schema** even for an App that
  subscribes to no events. Omitting the key produces the same unhelpful "We didn't find an
  App Manifest" page, not a validation message. The manifest carries
  `hook_attributes: { url: <placeholder>, active: false }`; GitHub never calls an inactive
  hook.

**(b) One-trip install and authorize.** With `request_oauth_on_install: true`, GitHub's
install page titles itself "Install & Authorize", and the redirect delivers `code`,
`installation_id`, and `setup_action=install` together. Two browser trips, confirmed.

**(c) Callback URL and port handling.** The spec's portless-registration premise is
**refuted in one half and confirmed in the other**:

- The install redirect goes to the registered callback URL **verbatim**. A portless
  registration sends the browser to `http://127.0.0.1/callback` — port 80, which an
  unprivileged process cannot bind (`EACCES` observed on this machine). The spike only
  survived because a root-owned redirector held port 80; a real admin would meet a dead
  browser tab. GitHub's install page even prints the literal target ("Next: you'll be
  redirected to http://127.0.0.1/callback").
- With **two** registered callback URLs, ported first and portless second, the install
  redirect uses the **first** entry (observed arriving on the ported listener directly).
- **Port-only loopback leniency HOLDS for GitHub Apps** on the authorize endpoint: with the
  portless `/callback` registered, an explicit `redirect_uri` of
  `http://127.0.0.1:8977/callback` redirected cleanly. A first probe that varied the path as
  well as the port was rejected with GitHub's "Be careful!" page, which pins the rule: the
  leniency is port-only; the path must match exactly.

**(d) Repo creation via the user token, App installed.** `POST /user/repos` with
`{ private: true, auto_init: true }` → **201**. The design's central premise. The token
exchange response carries `expires_in` and `refresh_token` (user tokens expire); the
chapter's minutes-long in-memory use is unaffected, and tokens stay opaque.

**(e) Linking the repo into the installation.** The planned
`PUT /user/installations/{iid}/repositories/{rid}` is **refused for a user access token**:
403 `{ "message": "Resource not accessible by integration" }`, in both an all-repositories
and a selected-repositories install. It is also **unnecessary**: a repo created with the
App's own user token is auto-added to the installation, including under "Only select
repositories" (coverage read `covers: true` before any PUT, repo count one higher than the
selection). The load-bearing call is the **verify**:
`GET /user/installations/{iid}/repositories` listing the new repo. The
`installation-not-covering-repo` catalogue row survives for the (now theoretical)
not-covered case, whose recovery is the install page's repository selector.

**(f) The `auto_init` Git Data push shape.** All green: `GET git/ref/heads/main` 200 with
the seed sha; blob 201; full tree 201; commit-with-parent 201; `PATCH git/refs/heads/main`
200.

**(g) Status codes to pin the fake server.** Every SPIKE-marked guess in
`test/fake-github.mjs` was confirmed by observation:

| Call | Observed |
|---|---|
| Git Data reads and writes on an empty (`auto_init: false`) repo | 409 `Git Repository is empty.` (including `POST git/blobs`) |
| `POST git/refs` for an existing ref | 422 `Reference already exists` |
| Manifest conversion | 201 |
| Repo delete via user token (`DELETE /repos/{owner}/{repo}`) | 204 (teardown is automatable; used by the spike itself) |

## Amendments to the plan (folded into the task briefs)

1. **Task 6 (manifest):** `buildManifest` carries
   `hook_attributes: { url: <engine repo URL>/webhook-placeholder, active: false }`, and its
   `callback_urls` are `[<loopback url>/callback, 'http://127.0.0.1/callback']` — the run's
   bound port first, portless second. The loopback therefore binds **before** the manifest
   is built. The portless-pinned test inverts into a two-entry pin. The pre-open printed
   copy adds the sign-in-first line and its dead-end recovery.
2. **Task 7 (oauth):** unchanged, with one confirmation: `reauthorize`'s explicit
   `redirect_uri` may carry any port against the portless second entry (leniency proven),
   and its path must be exactly `/callback`.
3. **Task 8 (repo):** `linkRepoToInstallation` becomes `verifyInstallationCovers` — no PUT;
   `GET /user/installations/{iid}/repositories` must list the repo, else
   `chapterError('installation-not-covering-repo')`. The fake models the UAT PUT refusal
   (403 `Resource not accessible by integration`) and the auto-add of UAT-created repos.
4. **Task 2 (fake):** SPIKE markers resolve to the observed values above (no numeric
   changes needed); add the auto-add-on-create behavior and the PUT refusal.

## Out-of-band findings for later tasks

- The ten-second server-side API sequence between the install redirect and the response page
  read as a hang in the browser; the real chapter answers the redirect with its landing page
  immediately and runs the actions afterward, with the terminal heartbeat carrying progress
  (Tasks 9-10 already specify this; the spike makes it observed fact rather than taste).
- Port 80 is unbindable for the unprivileged tool (`EACCES`), which is why the portless
  registration can never be the primary callback path.
