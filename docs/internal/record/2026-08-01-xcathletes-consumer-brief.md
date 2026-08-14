# xcathletes consumer brief: editor provisioning and first-publish detection (2026-08-01)

Filed from the team-platform pass 1 planning session. The platform
(`xcathletes-org`, the multi-team training platform; ECXC tenant 1) is the second
admin-extension consumer after ASC, and this brief flows in the harvest protocol's
reverse direction: seams the consumer's ratified requirements need that the engine
lacks. Requirements authority:
`ecxc-ski/docs/superpowers/specs/2026-07-30-team-platform-requirements.md`.
Geoff intends a proactive engine pass; this brief is its input.

Scope check first: these are the only two gaps. Everything else the platform
touches exists as of 0.92.0 and was verified against the requirements during
planning: `CairnAdminShell` + `admin-toolkit` for coach surfaces, `navLayout`,
`defineRoles`/`defineAccess`/`bootstrapOwner` for the coach role, concepts with
categories for plans and posts, packaged auth migrations, media, and the 0.86.2
mobile recomposition. Member OTP auth, notifications, chat, and push are
platform-native by design and ask nothing of the engine.

## Seam 1: a supported programmatic editor-provisioning surface

Platform Task 5 puts roster management in a custom admin screen, and adding a
coach there must also provision that person as a cairn editor: coach surfaces
ride the magic-link shell, and Geoff seeds alone with the other coaches added
through the UI. The functions exist (`src/lib/auth/store.ts`: `insertEditor`,
`deleteEditor`, `setEditorRole`, `listEditors`, and the owner guards) but are
package-internal, consumed only by `editors-routes`; no export subpath reaches
them (verified 2026-08-01 against the 0.92.0 export map).

Ask: a supported server-only export surface (a `./auth-store` subpath or
equivalent) carrying the existing store functions under semver, with a reference
doc and a contract test. No new logic is being requested; this is an export-map
promotion of a surface the engine already trusts internally.

Timing: wanted by platform pass 1, but not blocking. The documented fallback is
the engine's own `ManageEditors` screen as a manual second step, and the retrofit
once the seam lands is one call site.

## Seam 2: first-publish detection for announce-on-publish

Requirement (ratified 2026-08-01): public team posts are a cairn content concept
with categories, and a reserved "Team Announcement" category makes a post's
first publish fan out a broadcast (push, SMS to athletes, email to adults).
Edits never re-send, and the texted link must resolve when it arrives, so the
send belongs after the deploy is live, not at the save.

The engine today has no publish lifecycle: publishing is the git commit, and
there is no first-publish stamp and no event seam (verified 2026-08-01; no
`onPublish`/lifecycle machinery, no `published_at` in the manifest).

Proposed division of labor, keeping the engine git-pure with no networking:

- The engine stamps first publish: a `published_at` written into an entry's
  manifest record when the entry first lands non-draft, immutable across later
  edits.
- The engine ships a manifest-diff helper: two manifests in, newly published
  entries out.
- The consumer owns the trigger and the sends: its deploy workflow pings a
  platform endpoint after the deploy completes, and that endpoint runs the diff
  and fans out.

Timing: this seam gates platform pass 3 (plans, schedule, broadcast), targeted
after the foundation pass. Landing it in an engine pass before then keeps the
platform's critical path clear.

## Sequencing summary

Both fit one small engine pass: one export-map promotion, one manifest field
plus helper. Seam 2 is the deadline-bearing one.
