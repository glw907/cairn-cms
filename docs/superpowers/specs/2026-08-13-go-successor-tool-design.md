# The Go successor tool (pre-design, post-1.0)

**Status: pre-design, banked for post-1.0.** Nothing here starts before the tool track
(T4d, release one, the site walk) lands and `1.0` ships. This sitting happened
2026-08-13, during T5 Task 8's DNS-propagation wait, and its purpose is to bank the
decisions while they are cheap and to hand the current track one standing input (the
"tune for the port" section, which is effective now). The full design sitting happens
when the trigger fires; the open-questions section is its agenda.

## What it is

A single downloaded Go binary, no runtime dependencies, that is both the cairn setup
engine and a standing site console. A CLI user downloads it and it orchestrates the
whole install locally: scaffold, GitHub App, repo push, Workers Builds connect, cloud
build to a live site, domain, email. The console half is a bubbletea surface over every
cairn site the machine knows: lifecycle position, parks held as ambient waits,
in-tool resume, doctor, log tailing. It succeeds the Node `create-cairn-site` CLI
rather than fronting it, and `cairn-doctor` folds in whole (Geoff, 2026-08-13): the
doctor's checks are engine knowledge and the engine is this binary, so the separate
`npx cairn-doctor` command retires with the CLI rather than surviving beside the
console's doctor view.

## Decision record (2026-08-13 sitting)

1. **The pains, from T5 Task 8's live run:** chapter position invisible under a
   scroll; subprocess noise burying the hops that matter (458 asset lines around
   three provisioning moments); waits as blank time; parks as exits with a
   copy-this-command re-entry.
2. **Relationship to T4d: successor, not replacement.** T4d ships as planned on the
   Node engine and becomes reference behavior. The TUI arrives post-1.0 and may
   absorb the console's job if it earns it.
3. **Scope: site console, not just a setup wizard, and not an operator cockpit.**
   Content and admin operations stay in the web admin (charter boundary).
4. **Node TUI considered and declined on taste, not capability.** Ink and OpenTUI
   reach bubbletea-level polish (Claude Code and opencode are the proofs), so
   capability does not decide it. What decides it: the workstation's whole Go TUI
   production system exists and is proven in poplar (elm-conventions, golden tests,
   analyzer gate), a static binary serves the no-dependencies goal, and the owner
   prefers writing Go tools.
5. **Successor engine, not protocol frontend.** The sitting first recommended a
   protocol frontend (Node engine canonical, Go TUI rendering its event stream).
   That died against the deeper question: an owner installing a cairn site does not
   inherently need Node. Hop-by-hop, the only inherently-Node steps are the local
   build and the local dev server. Chapter 3 (Workers Builds) moves building into
   the cloud, and the T4c spike proved every orchestration hop as bare REST. A
   Builds-first flow (create repo, push, connect, cloud builds and provisions, poll
   to live, sign-in row via REST) needs no wrangler and no Node. The T5 button door
   is already this architecture with a browser front; the Go tool is its power-user
   sibling. Single source of truth is preserved by succession: the Node CLI retires
   at proven parity.
6. **Distribution keeps every door.** GitHub releases and brew for the
   dependency-free path; the `npm create cairn-site` door stays via the
   esbuild/turbo pattern (platform binaries as npm `optionalDependencies`), so one
   engine serves both audiences.

## Architecture

Poplar's shape, transplanted: one process, three layers.

- **Store:** reads and writes the same per-site state records the Node tool keeps
  (`~/.config/cairn/sites`). The record format is a versioned contract from now on.
- **Background engines:** the probes the CLI cannot hold today: DNS and negative-cache
  checks, certificate issuance, the Builds watch, park re-checks. A park becomes an
  ambient state the console monitors and offers to resume, not an exit.
- **UI:** bubbletea per elm-conventions as poplar realizes them: root `App` split
  across per-concern files, feature areas as packages under `internal/ui/` (each with
  `model.go`, `msgs.go`, `keys.go`, `cmds.go`, golden tests), typed exported upward
  Msgs routed by the root, shared primitives hoisted into `uicore`, models hold state
  only, all I/O in `tea.Cmd`.

**Engine:** the chapters as the Node CLI defines them, re-ordered cloud-build-first.
GitHub App manifest flow (loopback listener plus REST), repo create and base64-blob
push, Builds connect/trigger/token (the T4c spike's REST vocabulary), D1 migrations
and the sign-in row through D1's REST query endpoint, secrets via REST, domain and
email chapters as REST peers. Where Node is present the tool offers the developer
handoff (`npm run dev`); where absent, the install still completes.

**Template:** embedded via `go:embed`, baked by cairn-cms's existing Node-side bake at
release time. The bake-couples-tree-to-publish-window rule applies to the embed
exactly as to the template repo: the embedded tree and its engine spec come from the
same release.

**Parity contract:** the Node CLI is the reference implementation. The fixture corpus
is language-neutral JSON captured from real services (the spike docs are the
provenance chain); both engines test against the same corpus. Go fakes inherit the
standing discipline: a fake must refuse what the real service refuses.

## Exclusions

No content or admin operations. No replacement of the local dev loop. No web UI (the
T4d succession question waits until T4d has lived). No start before the trigger.

## Standing input for the current track, effective now (Geoff, 2026-08-13)

The current Node path continues unchanged in function, but docs, comments, and
structure are tuned so a later Go reimplementation reads them as a spec:

- **Fixtures stay language-neutral** (JSON bodies with provenance and dates), never
  entangled with a JS test helper's shape.
- **Behavior lives in contract prose, not idiom.** Chapter and hop semantics (entry
  conditions, park shapes, refusal vocabulary, printed re-entry commands) belong in
  comments and reference docs stated as protocol, portable to any language. A future
  porter should never have to reverse-engineer a clack callback to learn a rule.
- **Keep orchestration decisions out of prompt plumbing.** The chapter state machine,
  admission allowlists, and API vocabularies stay in their own modules with the
  prompt layer as a thin consumer; that boundary is the port seam.
- **The state record is a versioned contract.** Additions are deliberate; nothing
  writes ad-hoc fields.
- **The README's chapter contracts are the port's spec.** Keep them exact; drift
  there is now drift in two tools' futures.

## Open questions for the real design sitting

The name (candidates from the family register: `blaze`, `switchback`, `signpost`);
the credential UX (token paste with prefill URLs is the proven path; whether any
OAuth flow is worth owning); the npm binary-shim mechanics; the console's v1 view
cut; the retirement criteria and window for the Node CLI; whether T4d's web surface
gets absorbed or stays sibling.
