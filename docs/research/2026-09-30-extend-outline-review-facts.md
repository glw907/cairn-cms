# Extend outline review: fact placement (prefix OF)

Target: `docs/internal/outlines/extend.json` at b9013079. Lens: fact placement. Reviewer is
read-only; every proposed edit below is a `factIds` or `covers`/`outOfScope` change to the
outline JSON.

## Scripted checks

Script: `scratchpad/facts.py` (session scratchpad), which parses every `f:` bullet in
`docs/internal/facts/*.md`, joins wrapped lines, takes each bullet's last status tag, and
indexes every page's `factIds`.

1. **Orphans: none.** `extend.md` holds 814 bullets. The in-scope set (tagged `[verified]` or
   `[external]`, outside the three kept pages' sections and the harvest/provenance tail,
   including the whole `## Code sweep (2026-09-30)` section) is 714 facts. All 714 land on at
   least one page. The two `[vendor]` bullets: `f:4olp4u` is placed
   (replace-magic-links-with-cloudflare-access); `f:wxe8fc` sits in the kept
   `migration-notes` section, so it is out of scope.
2. **Uncitable citations: none.** No page cites a `[rejected]`, `[candidate]`, or
   `[docs-drift]` id. Forty cited ids live in `front-door.md` or `reference.md`, not
   `extend.md`. All are `[verified]` or `[external]`, and `check:provenance`'s
   `loadFactIndex` reads every file in `docs/internal/facts/`, so they resolve. Every page's
   `factIds` is duplicate-free. Eleven ids are cited on two pages each; each of those is
   justified except the ones named in OF-6 and OF-8.

## Findings, ranked by consequence

### OF-1 (major): security-model C12 has no fact for "the installation token's repository-wide write"

Location: `security-model.factIds`, covers bullet C12. The page's only GitHub App fact is
`f:kkp5bi` (key custody, JWT, 55-minute token cache). It says nothing about repository-wide
write reach. That claim lives only on add-cairn-to-a-sveltekit-app (`f:gglwt4`, `f:l5gx1t`),
whose outOfScope sends "the security reasoning behind the GitHub App's repository-wide write"
back to security-model. As outlined, the drafter must write C12's central claim with no
citable fact, or leave it out.
**Edit:** add `f:l5gx1t` and `f:gglwt4` to `security-model.factIds`, and keep them on
add-cairn-to-a-sveltekit-app as well. `f:l5gx1t` carries the consequence a reader acts on:
do not install the App on a repository that holds code.

### OF-2 (major): configure-media C2 depends on facts the page does not carry, and one it has nowhere

Location: `configure-media.factIds` (10 ids), covers C1 and C2. C2 names `maxUploadBytes`
"against the Worker request-body limit", `urlForm`, and "transformations with the srcset they
turn on". None of the ten ids states the `maxUploadBytes` default, the `urlForm` values, the
transform presets, or the srcset condition. Those facts exist in `reference.md`: `f:6kdagb`
(25 MB default), `f:ckuow3` (the presets), `f:wdmlys` (srcset only with transformations on
and a known width), and `f:r8vksa` (an absent block yields `{ enabled: false }`, which serves
C1). No fact anywhere states the Workers request-body limit. That limit is a Cloudflare figure
the container would tag `[vendor]`.
**Edit:** add `f:6kdagb`, `f:ckuow3`, `f:wdmlys`, and `f:r8vksa` to `configure-media.factIds`.
Move `f:db0cx6` (the media manifest row columns) there from architecture; it serves C5, and
architecture's outOfScope already sends media storage detail to this page. Then choose one
fix for C2. Either file a `[vendor: link, not a repo fact]` bullet for the Workers
request-body limit (link to Cloudflare's limits page) and cite it, or cut "against the Worker
request-body limit" from C2. Recommendation: file the vendor bullet. A reader who raises
`maxUploadBytes` needs to know that a ceiling exists.

### OF-3 (major): add-a-custom-admin-screen C3 lacks the fact that `createAdminAction` authorizes nothing by default

Location: `add-a-custom-admin-screen.factIds`, covers C3 ("createSectionAction versus
createAdminAction"). `f:xbjxit` states that `createAdminAction` runs `authorizeAdminTarget`
only when `access` is set, so without that option it authorizes nothing. It also gives the
two refusal forms and `deniedMessage`. That is the correctness trap C3 exists to warn about,
but `f:xbjxit` sits only on security-model. Security-model's C8 already has `f:4q8kin` for
the gate order.
**Edit:** move `f:xbjxit` from `security-model.factIds` to `add-a-custom-admin-screen.factIds`.

### OF-4 (major): replace-magic-links C5 and C2 lack the identity-mode facts they depend on

Location: `replace-magic-links-with-cloudflare-access.factIds`, covers C5 ("Access's token
lifetime") and C2 ("preview URLs closed"). The session lifetime under a gate (`f:2glcaf`:
Access default 24 hours, cairn's 30-day constant no longer applies) is cited only on
security-model. The page's `f:q0icwk` covers logout propagation, not session length. C2's
reason for closing workers.dev and preview URLs is `f:jha9f7`: the guard makes no hostname
check, so any hostname that reaches the Worker outside Access coverage is admitted when the
resolver accepts the token. That fact also appears only on security-model. Without it, the
page tells a reader to close preview URLs but never says why.
**Edit:** add `f:2glcaf` and `f:jha9f7` to
`replace-magic-links-with-cloudflare-access.factIds`, and keep both on security-model (C9).

### OF-5 (major): run-cairn-audit-on-your-site C2 has no fact for `static.scope`

Location: `run-cairn-audit-on-your-site.factIds` (10 ids), covers C2. The page carries
`static.sourceScope` (`f:xjp2mx`) and `sheet` (`f:y1mjsk`), but no fact on `static.scope`
itself. `reference.md`'s `f:eqsngu` covers it: the defaults, "a configured list replaces the
defaults, never merges", a missing configured root fails the run, and `static.scope` versus
`static.adminScope`. That is exactly C2's "failure when a named path is missing" for the scope
key.
**Edit:** add `f:eqsngu`, `f:t767qb` (the `static.adminScope` defaults), and `f:22odbz`
(`static.cssFiles`) to `run-cairn-audit-on-your-site.factIds`. Keep `f:t767qb` and `f:22odbz`
on add-a-custom-admin-screen too, since its C9 names them.

### OF-6 (major): add-a-second-sign-in-group lacks channel how-to facts that sit on security-model

Location: `add-a-second-sign-in-group.factIds` (23 ids) against `security-model.factIds`.
Several channel facts describe construction or runtime behavior, not threats, and C3 and C4
of the guide need them. Two are cited only on security-model: `f:1rstld` (a confirmed code
mints a session the same hashed way; `revokeSessions` ends every session for one identity) and
`f:gubeex` (channel logout destroys only that one session). `f:cf1avu` and `f:nz890r` are
cited on both pages, but they are setup facts that security-model does not need. C4 has the
guide build "from the showcase exemplar". The showcase's capture transport is a roster oracle
(`f:d2j9cj`), and its deploy-time fence is `f:rv9gdc`. A drafter copying the exemplar gets no
warning on this page.
**Edit:**
- Move `f:1rstld` and `f:gubeex` from security-model to add-a-second-sign-in-group.
- Remove `f:cf1avu` and `f:nz890r` from `security-model.factIds`; they stay on
  add-a-second-sign-in-group.
- Add `f:rv9gdc` and `f:ez788q` to add-a-second-sign-in-group, and keep both on security-model
  (C10). `f:ez788q` is the precise form of the obligations that `f:pa2hqh` states loosely.

### OF-7 (major): theme-your-public-site C4's "port your own theme onto the chassis" has thin support

Location: `theme-your-public-site.factIds`, covers C4, the bullet the owner required. The
re-skin half is well supported (`f:kt0epf`, `f:ylmc9c`, `f:kq6ud3`). The port half has only
`f:ctognq` (the composition primitives), `f:lwrqfd` (the `$chassis` seam), and `f:l2mbcj`
(where the registry and chrome live). Two facts are missing. First, a ported theme layers over
the engine's `cairn-public.css` roles: `f:s23sk0` is cited only on scaffolded-site-files,
whose C7 defers depth to this page. Second, the engine ships those defaults as one importable
asset: `reference.md`'s `f:c4nnu9`. Both are required steps in a port.
**Edit:** add `f:s23sk0` and `f:c4nnu9` to `theme-your-public-site.factIds`. `f:w6pqic` (the
derived status inks differ from an old copied `tokens.css`) is optional and helps a reader
porting an older theme.

### OF-8 (minor): heavy-page trims (security-model 89, add-a-custom-admin-screen 80, add-cairn 66)

**security-model.** Once OF-3 and OF-6 land, it carries 84 ids. The remaining weight is
coherent: three old pages were absorbed into one reader's security review. Much of the count
is near-duplicate pairs inside the page, not separate claims: `f:6lmusm`/`f:sj1kt9`,
`f:91dwrk`/`f:uz38ef`, `f:njh87y`/`f:8xxe3b`, `f:u1bjul`/`f:f39xqq`, and
`f:s32y4a`/`f:8l4wwr`. A drafter will collapse each pair into one sentence. No split is
warranted. The pairs are a fact-container tidy item, not an outline defect.

**add-a-custom-admin-screen.** The absorbed animate section brings audit-runner internals
that serve the audit page better than the screen author:
- Move `f:24f8gn` (the two motion surfaces), `f:1x8r1x` (how the runner scopes `adminOnly`
  rules), `f:0w432q` (the rendered reduced-motion advisory), and `f:54sgmg` (the
  chip-detection rule's definition) to `run-cairn-audit-on-your-site.factIds`. That page's
  C1 ("what cairn-audit checks") has little to cite.
- Keep on the screen page the rules an author trips over: `f:09g8ev`, `f:0aa9tp`,
  `f:0mbj5n`, `f:2gmjvn`, `f:2gdaks`, and `f:2c19kf`.
- Move `f:4xrx5f` (the `createAuthGuard` `roles`/`access` options) to
  `restrict-admin-access.factIds`. It duplicates `f:gun084` there, and this page's
  outOfScope already sends the access map there.

The net result is 75 ids on the screen page.

**add-cairn-to-a-sveltekit-app.** 66 ids suit a four-milestone tutorial where each fact is a
step or a trap, so no move is needed beyond the OF-1 multi-cite. `f:pg2smj` (the retired JS
doctor's `github.app` check) and `f:jzb3d0` (the removed `/components` subpath) describe
absences. They belong in upgrade history, not in a tutorial. Keep them in place so they stay
placed, and read OF-10.

### OF-9 (minor): architecture carries media detail its outOfScope sends to configure-media

Location: `architecture.factIds`. `f:69rw88` (`normalizeAssets`/`ResolvedAssetConfig`
fields) and `f:db0cx6` (media manifest row columns) are configure-media detail. `f:69rw88` is
already cited there too.
**Edit:** remove `f:69rw88` from `architecture.factIds`, and move `f:db0cx6` to configure-media
(OF-2). `f:2hnxsr` and `f:lu67dk` stay; they carry the tier-placement point C7 needs.

### OF-10 (minor): history-phrased facts invite changelog prose on present-tense pages

`f:r0cv6e` (security-model: the sanitize floor was added in `v0.17.0`), `f:2w1yrc`
(security-model: the channel rule came from three review rounds), `f:xkkt1o` (architecture:
`role` used to carry a CHECK constraint), `f:39sn8c` (screen page: the audit norms "were
10px"), `f:pg2smj`, and `f:jzb3d0` each state a past state. The page anatomies want present
tense. Each carries one usable present-tense core. A drafter that cites the bullet whole will
write version history onto a how-to or concept page.
**Edit:** no `factIds` move. Keep these ids placed, and add one line to each affected page's
outOfScope, for example "Version history of X (migration-notes, kept)", so the drafter cites
only the present-tense half. For `f:2w1yrc`, the "why" is legitimate concept content; keep it.

### OF-11 (minor): two outOfScope pointers aim at topics their target page does not carry

- `add-an-island.outOfScope` says "The render safety boundary for props (security-model)".
  Security-model carries no island fact and no covers bullet on islands. The props-untrusted
  facts (`f:jz4qka`, `f:8356mn`) sit correctly on add-an-island under C4. **Edit:** delete that
  outOfScope line.
- `configure-rendering`: `f:21by9u` (a registered `build()` can bypass every render-safety
  guarantee) is a warning the developer needs at the moment they write `build()` (C4). It sits
  only on security-model. **Edit:** add `f:21by9u` to `configure-rendering.factIds` and keep it
  on security-model (C11).

### OF-12 (minor): debug-your-site C5 has no fact behind it

C5 ("upgrade breakage: where an error's import or field name last appeared") has no fact on
the page. It is a pointer to the kept upgrade-cairn and migration-notes pages, so a
one-sentence link section is correct. **Edit:** reword C5 to "Point to upgrade-cairn and
migration-notes for errors after an upgrade (link only)" so the drafter does not invent a
lookup procedure.

## Owner forks

None. Every finding is a placement edit inside the approved page set.
