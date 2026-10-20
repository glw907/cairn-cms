# Brainstorm brief: the style guides first, the register as an overlay

Date: 2026-09-28. Input to a brainstorm Geoff runs in a fresh session. The evidence is the audit
beside this file, `2026-09-28-style-guide-sync-audit.md`; read it in full before proposing
anything. This brief carries the direction, the settled points, the open forks, and the state of
the tree.

## Direction (Geoff, 2026-09-28, verbatim)

- "We should make sure that the register and the primary style guide are well synched. The first
  order of business is to confirm that docs adhere to the appropriate style guide. The register is
  essentially an overlay on top of that, so our claude docs infra should be tuned to make that
  we're always structuring docs according to the style guide first, and never letting the register
  supplant those guidelines."
- "There _may_ be causes where the register should override the base style guide, but those should
  be noted and deliberate excepting to the base rule."
- "since we have two style guide in use (MS for users and Google for developers) the register
  documentation can address both."
- "I'm *gussing* that having the local register documetation conform to the register might help
  claude write more effecively in that register."

## Settled

- **The base guide follows the terminal.** A reader who types commands gets Google (the admin arm,
  since installing and running a site uses the setup command and the `cairn` CLI; extend;
  reference; the front door). A reader who only uses the product's UI gets Microsoft (editors).
  The current `.vale.ini` mapping stands.
- **An exception exists only by Geoff's recorded ruling.** It names the base rule it overrides and
  why. The register's current "a floor is not a ceiling" clause, which lets any writer deviate on
  evidence, goes.
- **Specs, plans, and agent-facing documents** take whatever voice works best for Claude Code; the
  standards govern public-facing writing only (Geoff, 2026-09-28; recorded in `spec-plan-review`).
  The register document is agent-facing, and the brief's fourth quote argues its most effective
  voice is the register itself.

## Open forks for Geoff

1. **The academic voice against Google's conversational tone** (audit C2). Google asks for a
   conversational voice and sentences under about 26 words; the register asks for the academic
   voice with longer, qualified sentences. Recommendation: record the academic voice as a Google
   exception on extend, reference, and the front door, with admin task steps following Google's
   plainer procedure style.
2. **The editors arm under Microsoft** (audit C3, C4). Geoff said the academic voice covers all
   documentation; Microsoft's voice is warmer and plainer and allows question headings.
   Recommendation from the audit: Microsoft unmodified for editors, keeping only the no-pitch
   keystone and the tell catalogue as the overlay.

## The audit's findings in brief

- Root cause: the register defines Google as "the Vale-enforced floor" and keeps everything Vale
  cannot grade for itself. Vale's Google package has no procedure, list, table, or notice rules,
  and the docs gate runs Vale at error level only, so the guide's structural half belongs to no
  gate and no agent.
- The 2026-09-08 docs standard had the structural rules ("Steps, numbered, one action each") and
  planned `check:headings` and `check:anatomy`; the 2026-09-26 approach spec retired them before
  they were built. The proposed design brings part of them back, which reverses part of that
  ruling.
- No page-chain prompt names Google or Microsoft; the drafter's list-cadence remedy and the
  `writing-voice` skill steer sequences into prose; both chain exemplars break the guide.
- Proposed design, strongest form first: Vale and markdownlint checks with must-fire tests; the
  base guide first in the chain's preamble and as the register editor's first lens; agent
  definitions led by "structure to the base guide first"; the register's header rewritten with
  per-guide "Recorded exceptions" tables, the register itself rewritten in its own register;
  exemplars that pass the structural checks.

## State of the tree

- The register amendments of 2026-09-28 (the academic voice in the universal contract, the
  heading rule, the task-guide anatomy) live on branch `draft-docs-0` (commits `07d5c87e`,
  `fb5238d1`), PR #91, not yet merged. Plan against that copy of `docs/internal/docs-register.md`.
- Draft docs stage 0-1 is closing on that branch; stage 2a (extend) starts after passes A, B, and C
  merge. This work should land before stage 2a drafts its first page.
- The approved AI posture page (`docs/extend/choose-an-ai-posture.md` on `draft-docs-0`) is the
  trigger: its "Resolve a posture warning" checks are prose where Google wants a numbered list
  (Geoff's comment on the review artifact, 2026-09-28). Fix it as part of this work.
- Workstation files in scope live in `~/.dotfiles` (stowed into `~/.claude`): the
  `cairn-docs-drafter` and `cairn-register-editor` agents, `workflows/docs-page-chain.js`, the
  `writing-voice` skill and its routed docs, `docs/authoring-charter.md`.
