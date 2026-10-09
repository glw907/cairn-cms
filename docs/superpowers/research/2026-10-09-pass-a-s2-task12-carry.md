# Task 12 carry from S2 (Tasks 4, 5, 7), extracted verbatim from s2-run.json

## Task 4 (commit 4597aa49)

Facts: new f:xffr6i (admin.md); rewritten f:rn62i1, f:gepykz (extend.md); f:bw5uk0 list gained the new id; source pointers repaired on f:5iqvmt and two neighbours (extend.md) and f:lml542 (reference.md, now a declaration anchor).

Draft `Consumers may:` line: apply 0001_roles.sql (copy it from the package's migrations directory and run `wrangler d1 migrations apply <auth-db> --remote`) when declaring custom roles on a site scaffolded before the roles migration shipped; it is safe after 0004. It rebuilds editor with the engine's four columns only, so carry any column the site added across by hand. A scaffolded site created from this version already carries it.

Affected 2a pages:
The 2a extend pages under docs/extend/ are not edited. Affected pages and the facts they falsify: scaffolded-site-files.md says the scaffold's migrations are 0000, 0003, 0004 and that 0001 and 0002 are absent, which falsifies f:gepykz as it stood and the 0001-absent half of f:rn62i1. restrict-admin-access.md, step 1 of 'add the role', tells the reader to copy 0001_roles.sql into a new scaffold, where it is already present. Its failure line at about :351 says to check whether 0001 was applied remotely, which stays valid and now matches the named condition. add-a-second-sign-in-group.md has the same copy step at about :197 and the same failure advice at about :661. Both pages cite f:rn62i1. All three pages need the 2a stage to restate that the scaffold ships 0001_roles.sql and 0002_audit.sql stays opt-in.

## Task 5 (commit bad014c0)

Facts: minted f:thbxvf, f:ditn3e; rewritten f:2gtftn, f:v72g9z; source pointers repaired on f:b857di, f:bpk8gc, f:2gtftn, f:v72g9z. option-map row CairnAdminConfig.auth.branding points at f:v72g9z.

Consumers must: if alerting keys on turnstile.verify_failed reason invalid_input to catch a missing or blank Turnstile secret, key it on missing_secret instead. invalid_input now means a bad token only.
Consumers may: pass `auth.branding: { siteName }` alone to createCairnAdmin and keep the runtime sender's from and replyTo. Pass createChannelDb()'s result to a channel's resolveDb with no cast.

Affected 2a pages:
- add-a-second-sign-in-group.md: any claim that resolveDb must return a D1Database, and any claim that a missing-secret Turnstile failure logs invalid_input. Facts f:u3qhel is untouched; f:ditn3e is new.
- add-cairn-to-a-sveltekit-app.md: any claim that a supplied auth.branding replaces the default whole or drops replyTo. Falsified facts: f:2gtftn and f:v72g9z (both rewritten in the container).

Carry (reviewer note): a site that passed a full branding without replyTo, on purpose to suppress the adapter's reply-to, now inherits runtime.sender.replyTo, and branding offers no way to clear it (an explicit undefined falls back too). The drafted Consumers lines cover only the siteName-alone benefit. Task 12's Consumers must line could name this case.

## Task 7 (commit 092176c1)

Facts: updated in place, ids unchanged: f:3jpoi3 (admin.md); f:orz556, f:paotzb, f:nls26c, f:5dwnh1 (extend.md). f:qtm9y2 stays true. f:nls26c keeps naming GITHUB_APP_ID and GITHUB_APP_INSTALLATION_ID as dropped names for check:provenance.

Drafted Consumers may: line: answer 503 when loadHealth(...).ok is false, as the site-root /healthz route now does: `Response.json(health, { status: health.ok ? 200 : 503 })`. A site's catch branch should return a fixed detail and never the thrown message.
Drafted Consumers must: line (optional for the changelog author): none required for engine consumers. A scaffolded site's own .dev.vars no longer needs GITHUB_APP_ID or GITHUB_APP_INSTALLATION_ID; the old lines are harmless. A custom BackendProvider that is not github-app now reads ok: true / not-applicable from loadHealth, where it read ok: false before.

Affected 2a pages:
- `docs/extend/rotate-the-github-app-key.md`: falsified f:3jpoi3, f:5dwnh1 and f:paotzb. Its "curl /healthz" step and its failure-mode lines (`/healthz` reports the detail ...) now get a 503 status. The body is unchanged, so `curl` without `-f` still works.
- `docs/extend/scaffolded-site-files.md`: falsified f:nls26c (lines 163-164 name `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID` as in `.dev.vars.example`) and f:paotzb (line 365 area describes the route's 200 behavior).

Also noted by the implementer: examples/showcase/README.md health notes (not checked); cairn-pub's own copy of the rotation URL (confirmed read-only only); 01d-resume.txt fixture stale (filed in the friction log).

## Not filed, 2a hand-off pages (all four)
- scaffolded-site-files (Tasks 4 and 7), rotate-the-github-app-key (Task 7), restrict-admin-access (Task 4), add-a-second-sign-in-group (Tasks 4 and 5); add-cairn-to-a-sveltekit-app (Task 5) also affected.
