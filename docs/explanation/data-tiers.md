<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# Where each kind of state lives

cairn keeps several kinds of state, and they do not all belong in the same place. This document is
the one home for that decision. When you are placing a new kind of state, start with the rule
below. The three tiers show what already sits where, and the worked precedents record the cases
settled so far, so the next one is a lookup rather than a fresh argument.

## The governing rule

Content is the source of truth, and it lives as markdown in git. Everything else gets placed by one
test, asked in order:

1. Does the build read it to compile a page? The sites are statically generated, so anything the
   build needs must be reachable without a database. That points to git.
2. Is it derived from the content corpus? A projection of the content belongs beside the content,
   version-controlled and reconciled by the build, rather than sitting in a separate store that can
   drift.
3. Does a change need to take effect immediately, or does it need atomic semantics? Access control
   and single-use tokens need a transactional store whose change lands on the next request. That
   points to D1.
4. Is it written on every login or request, or does it expire? High-frequency, short-lived state
   with a TTL cannot sit in git. That points to D1.

A yes on 1 or 2 sends state to git. A yes on 3 or 4 sends it to D1. The two groups have not
collided, because build-time and content-derived state is the opposite category from runtime access
state. When a new kind of state seems to answer yes on both sides, that is your signal to split it.
The build-read projection goes to git and the runtime control goes to D1, which is how the link
graph and the editor allowlist already sit.

## The three tiers

**Markdown content in git.** The posts and pages, the corpus itself, the source of truth. Your
authors edit it in the admin and save to `main` through the GitHub App, or you edit it directly in
git. The build reads it through `import.meta.glob`.

**Content-derived, build-read structure in git.** Committed files the build reads and the admin
edits through the same GitHub-App commit pipeline. The YAML site-config and nav live here, and so
does the content-graph manifest, the build-verified projection carrying each entry's id, title,
permalink, and outbound links. These must be reachable at build (so a database is out), and the
build regenerates and verifies the derived ones, so they cannot silently drift from the content.

**Runtime admin state in D1.** The per-site auth store (`AUTH_DB`) holds sessions, magic tokens, and
the editor allowlist with each editor's display name and role. The engine reads it on the request
hot path, never at build, and a change to it must take effect immediately (a removed editor loses
access on the next request) under atomic invariants (single-use tokens, the
never-remove-the-last-owner rule). It is access control and ephemeral session state rather than
content, so it stays in the database.

## The decision procedure

When a new kind of state appears, run the test before reaching for a store:

- Does the build read it to compile a page? If yes, git.
- Is it computed from the content corpus? Then it goes to git too, as a build-verified projection.
- Is it access control, or must a change land immediately? That sends it to D1.
- Is it written on every login or request, or does it expire? D1 again.
- Does it answer yes on both sides? Split it. The build-read part goes to git, the runtime-control
  part to D1.

When you settle one, record the answer here as a worked precedent, and the next similar case
becomes a lookup.

## Worked precedents

**Site config and nav to git (2026-05-27).** We weighed D1 first, then moved to a git-committed YAML
file the build reads, so the sites keep compiling without a database and the structure stays
version-controlled. The edge-SSR consumption D1 would have served got dropped along the way.

**The content-graph manifest to git (content-graph initiative, 2026-06-02).** The internal-link
resolver and the build-fail backstop run at build, where a runtime D1 binding is unreachable, so the
link graph cannot live in D1 (and it is derived from content besides). It is a committed JSON
projection the build regenerates and verifies, updated atomically with each content commit. See
`docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md`.

**The editor allowlist stays in D1 (2026-06-02).** Names and roles are runtime access control, read
on the auth hot path and never at build, and a removal or a role change must land on the next
request. The allowlist sits beside the sessions and tokens it joins with, as one coherent store.
Holding it in git would gate revocation on a redeploy and split the auth model. Same test as the
link graph, opposite answer.

## Related documents

- The functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`) holds the
  system architecture and the locked stack.
- The content-graph design (`docs/superpowers/specs/2026-06-02-cairn-content-graph-design.md`) details
  the manifest and the atomic commit primitive.
- The self-owned magic-link auth model is in the functional spec's behavior section and the rebuild
  auth plan under `docs/superpowers/plans/`.
