# Engine pass before stage 2b: owner rulings (2026-10-07)

Agent-facing input to the engine-pass spec. Geoff answered these during the stage 2a close
finish, before the spec was drafted. The candidate list is `ROADMAP.md`, Now tier, "Engine
pass before stage 2b". Its source detail is the friction log at `b38ef6b3`, plus the entries
filed at `2f4ef9d8` and the F4 close review of the 2a close finish.

## Rulings (Geoff, 2026-10-07)

1. **Scope.** Asked how big the pass should be, Geoff answered verbatim: "Whatever improves that
   product, athough just becaus something made the friction log doesn't mean we actually have
   to deal with it." Each candidate item gets an explicit verdict in the spec:
   - fix in this pass;
   - decline, with the reason recorded in `docs/internal/engine-rulings.md` when the item
     is a charter or design question, so nobody re-argues it;
   - batch into the final engine batch.

   An item earns its place by improving the product. Appearing in the friction log earns it
   nothing. The charter's premise test, "is this cairn's job, and is this the leanest form?",
   runs first on every item.
2. **Signups demo.** It moves out of the scaffold and into the repository's example site
   (`examples/showcase`), which keeps it as the worked custom-admin-screen example. New sites
   start without it.
3. **Key rotation.** Add an opt-in live check that mints a real installation token with the
   deployed key and reports whether GitHub accepts it. It runs only on request, so `/healthz`
   makes no network call.
4. **Claude Code docs.** "Using Claude Code with cairn" gets its own small track, a fifth arm
   `docs/claude-code/`, for a developer working on a cairn site with Claude Code. The developer
   and editor tracks keep assuming no coding assistant. The arm's own docs stage drafts its
   pages; this pass only sets up the arm, if any setup belongs in an engine pass at all.
5. **Dev backend content.** Under `npm run dev`, the dev admin reads and edits the site's real
   content files, saving to a local stand-in instead of GitHub. This replaces the dead
   `seedContent` "has no effect yet" option.
6. **Seed content.** The scaffold keeps its seed content (`the-trail-crew.md`,
   `trail-safety-notice.md`) as Waymark's demo content. Drop the friction item that asked to
   genericize it. `check:leaks` keeps its seed-content path exception.

## Settled elsewhere (do not re-ask)

- Engine passes land on `main` and never release; one release follows stage 5 (ROADMAP,
  boundary-test entry).
- Agent guidance stays in Claude Code's format only, with no `AGENTS.md`.
- The general docs assume no coding assistant.
- Method, idiom, and architecture calls on the "decide" items belong to the spec author, decided
  from evidence and the charter. Only product forks go to Geoff.

## Overnight pipeline (Geoff, 2026-10-07: "We'll also need an adversarial review of the spec, than the plan, then an adversarial review of the plan.")

Runs unattended through the `spec-plan-review` skill at full depth:

1. Spec draft: `2026-10-07-engine-pass-pre-2b-design.md`.
2. Spec review: four lenses, one fold, a verification read, and a second fold only on a blocker or major.
3. Plan: outcome-only, at high effort. Tasks governed by an open spec fork build on the recommendation and are marked blocked until Geoff rules.
4. Plan review: three lenses, one fold, a verification read, and a second fold only on a blocker or major.

Execution waits for Geoff's spec read. Review files go to `docs/superpowers/research/`, and the conductor commits each stage on `main`.

## Fork rulings (Geoff, 2026-10-08)

Geoff's answer, verbatim: "Recomendations accepted for Fork 1 and 2. For Fork 3, ceiling at 14M."

- **Fork 1** (dev-admin save): the recommendation is accepted. Saves stay in memory, and one
  persistent DaisyUI `alert` notice shows in the admin shell when the dev backend serves the site's
  real content.
- **Fork 2** (anonymous `/healthz?live=1` mint): the recommendation is accepted. Yes, with the
  coalesced per-isolate slot and the per-caller timeout.
- **Fork 3** (pass B ceiling): 14.0M, with the 80 percent stop at 11.2M.

## Spec read (Geoff, 2026-10-08)

Geoff's answer, verbatim: "Spec is good." The spec is approved as written, and execution starts with pass A.
