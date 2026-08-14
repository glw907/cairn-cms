# The Go successor tool (pre-design, post-1.0)

**Status: pre-design. AMENDED 2026-08-13 by a second sitting, which moved the start date
in.** The first sitting happened during T5 Task 8's DNS-propagation wait and banked the
decisions while they were cheap, on the assumption that nothing here started before the
tool track (T4d, release one, the site walk) landed and `1.0` shipped. The second sitting,
during T4d execution, settled multi-site scope, the name, and the repo home (decisions 7
through 9), and **the dashboard half now starts once T4d closes** rather than post-1.0,
since it has no dependency on the moving Node reference. The provisioning half still waits
for T4d, the `go:embed` bake for release one, and the upgrade verbs for ROADMAP P9. The
"tune for the port" section remains effective now. **The full design sitting is still owed
and is Fable's**, run through `superpowers:brainstorming`; the open-questions section is
its agenda.

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

## Multi-site scope, the name, and where it lives (Geoff, 2026-08-13, second sitting)

Settled during T4d execution, in conversation. These are decisions, not open questions; the
open-questions section below carries what they left unresolved.

7. **The tool is multi-site, and the goal is a dashboard plus a provisioning tool with a polished
   bubbletea interface.** Three scopes, decreasing in obviousness. Multi-site *addressing* is
   nearly free, since `~/.config/cairn/sites` is already a registry and only the verbs are
   single-site today. The *dashboard* is assembly rather than new logic, because each chapter's
   confirm step already is a health check (`confirmHostname` answers whether the domain serves; the
   Builds trigger read answers whether push-to-deploy is wired). *Cross-site upgrades and installs*
   do a job nothing else does: four consumer sites sit on four different `0.x` carets, and in `0.x`
   a caret admits only its own minor, so each moves only by deliberate migration.
8. **Upgrades push, all the way through.** An initial stage-never-push recommendation was
   overturned on the evidence: the tool already pushes (chapter 3 pushes the scaffold and rides the
   build), and of 98 `Consumers must:` lines, 40 say "nothing" and most of the rest are mechanical
   renames on an import line. What earns the push is a **local build gate before it** (the gate that
   caught the T5a rehearsal failure), an **ordered rollout that stops on the first failure**, a
   **rollback verb shipped in the same pass** as the upgrade verb, and **classifying the
   judgment-bearing `Consumers must:` lines** rather than skipping them. The member-facing site gets
   a pull request instead of a direct push; the rest push straight through. This depends on the
   changelog contract becoming machine-readable, filed as ROADMAP P9 and owed before the beta cut.
9. **The name is `cairn`, and it lives in this repo, not its own.** Subcommands carry the purpose,
   the `gh` and `wrangler` shape; `cairnctl` was the runner-up. A bare `cairn` launches the TUI when
   stdout is a terminal and prints help when it is not, reusing T4d's own interactive gate. **Every
   TUI action needs an equivalent subcommand**, or that action can never be scripted, put in a cron,
   or run over ssh, which is exactly when a four-site upgrade wants it. On the repo question, the
   deciding argument is that **parity is a continuous property and a repo boundary demotes it from a
   CI gate to a prose watch item**; two further couplings already cross that line (the `go:embed`
   template comes from the Node-side bake under bake-couples-tree-to-publish-window, and the upgrade
   verb parses this repo's changelog). The separate-repo case is all ergonomics, each item solved by
   path filters and a tag prefix, and `packages/create-cairn-site` already proves a second toolchain
   here. The asymmetry settles it: in-repo then extracting via `git filter-repo` is cheap and
   lossless, while starting separate and discovering parity rot is expensive and silent. **Named
   extraction triggers:** the Node CLI retires at proven parity, or the tool grows a consumer that is
   not a cairn-cms site.

**Sequencing, because the Node reference is still moving.** The dashboard half has no parity
dependency and can start once T4d closes. The provisioning half waits for T4d to land, since T4d
rewrites the exact vocabulary a port would encode (`hostname-propagating` split into
records-absent and resolver-lagging, the hold-loop wait and park semantics, the console contract).
The `go:embed` bake waits for release one. The upgrade verbs wait on P9.

**The HUD is empty without adopt, so adopt is feature one.** `~/.config/cairn/sites/` holds one
record today and it is a scratch site; all four production consumers predate `create-cairn-site`
and have no state record, so a day-one launch shows a single scratch row. This revives the
adopt-existing-repo path that T5b deferred and whose `--connect` probe was retired as never
runnable. Adopt splits into two tiers, which makes it shippable in stages. **Adopt-to-watch** needs
only readable or discoverable facts (account id, worker name, zone, repo) and gets a site into the
HUD immediately. **Adopt-to-manage** needs the site's GitHub App client and webhook secrets, which
are believed to be write-once and unreadable after creation, so it likely costs a secret rotation
and a browser trip per site. Verify that platform claim against the current GitHub API at design
time rather than inheriting it.

**Two standing cautions.** Blast radius grows: each state record holds a live Cloudflare API token,
a GitHub client secret, and a webhook secret, so one process reading all of them across every site
is a much larger target than a one-run scaffolder, and each check should prefer the narrowest
credential that answers it and degrade honestly when a token cannot. And a dashboard would not have
caught 907-life's month-long push-to-deploy outage, which failed by nobody looking; that case argues
for a scheduled routine as the tripwire, with the dashboard as what you open once it fires.

**TUI polish.** poplar's chassis carries most of it (`uicore` primitives, golden tests, the analyzer
gate, elm-conventions), so invoke `bubbletea-design` and `elm-conventions` when the work starts. What
decides whether a TUI looks good is width degradation and alignment rather than palette: 80 / 120 /
160 columns is the terminal's version of the family's five-viewport bar, and a site-health table is
exactly the layout that breaks at 80. Never encode status as color alone, since terminal themes vary
and the tool does not own the background; pair each state with a glyph. Golden tests make the polish
a gate rather than an eyeball check.

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

The name is settled (`cairn`, decision 9), leaving: the credential UX (token paste
with prefill URLs is the proven path; whether any OAuth flow is worth owning); the
npm binary-shim mechanics; the retirement criteria and window for the Node CLI; and
whether T4d's web surface gets absorbed or stays sibling, which the multi-site
decision softens, since at different scopes the two are the same view rather than
competitors.

The second sitting added five, and the last is the hardest:

- **The v1 view cut.** Which dashboard views ship first, and what a site's row shows
  when it is healthy and boring.
- **What "health" means per site, concretely.** Which checks run, and what each
  degrades to when a token cannot answer it. A check that silently reports fine
  because it lacked a scope is worse than no check.
- **The upgrade verb's UX.** How a judgment-bearing `Consumers must:` line gets
  surfaced and resolved without dropping the operator into four repos by hand.
- **How much of the web admin's Warm Stone identity crosses a medium with no type
  control**, given both surfaces will be open at once on the same sites. A shared
  palette adapted to terminal constraints would make them read as one product; going
  fully native-terminal is also defensible. Cheaper to decide once than to drift into.
- **The credential model.** Two directions pull against each other. Keep the per-site
  records and accept that a launch loads the union of the estate's credentials,
  scoping each check as narrowly as it can go. Or mint a separate read-only credential
  for the watch half, so provisioning secrets are not loaded just to answer whether a
  site is serving. The second is cleaner and it adds a credential to mint per site,
  which is exactly the friction this tool exists to remove.
