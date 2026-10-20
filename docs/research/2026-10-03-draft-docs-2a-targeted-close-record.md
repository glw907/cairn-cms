# Draft docs stage 2a, task 7b targeted close record (2026-10-03)

Agent-facing. Plan: `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md`, "Execution mode", "After each run".

## Ruling

Geoff, 2026-10-03, "Targeted close": two chain runs ended 0 of 6 pilot pages accepted at the round cap, so the pages close by targeted fixes instead of a third chain run.

## Method

- Five drafted pages each took one Opus drafter fixing only their run-2 (`wf_ab29e38c-e13`) round-2 blocking findings.
- Scoped register and fact reads then covered the changed sentences.
- The final reader read (the runner's `readerPrompt`, dispatched directly) came last. Its fix took one scoped redraft and one re-test.
- security-model ran the chain alone (`wf_30959fac-694`, 14 agents, 1,663,110 subagent tokens). Plan read: fix, then accept. Round 1: S accept, R fix 4, F fix 3. Round 2: S fix 2, R fix 4, F accept. Escalated, `crossRegression` true. It then took the same targeted close.

## Final state per page (all accepted)

- architecture
  - 4 run-2 blockers fixed (:34 "these four", :109 committer, :150 R2 claim, :167 tier claim).
  - Register read fix 2 (blockers the fix introduced at :113 and :150); redraft; re-read accept.
  - Fact read accept twice. Final reader accept (advisory only).
  - Conductor ruling: "the only tier a site can replace" stands (`f:hk24xs`; identity replacement leaves D1).
- replace-magic-links-with-cloudflare-access
  - 4 run-2 blockers fixed.
  - Register fix (three moved sentences pushed bullets over 26 words) and fact fix (unsupported "Access block page" clause). Redraft re-homed the sentences.
  - Re-reads: fact accept; register fix on the :308 term ("logout or revoke" to "sign-out or a revocation"), applied as a term substitution without a further round.
  - Final reader accept. Code confirmed `IDENTITY_OPERATOR_FAULT_REASONS` (`guard.ts:114`, `:317`).
- add-a-custom-admin-screen
  - 3 run-2 blockers fixed. Register and fact accept.
  - Final reader fix 2: duplicate `D1Database` import (TS2300, confirmed in a scratch tsc run) and no CsrfField step.
  - Redraft added the step and filed `f:fers77`. Scoped reads accept.
  - Reader re-test accept: compiled in a showcase scratch copy; the control re-inserted the duplicate and saw TS2300.
- add-cairn-to-a-sveltekit-app
  - 1 run-2 blocker fixed (:7 false universal). Register and fact accept.
  - Final reader fix 2: SvelteKit 3.0.0 has been npm latest since 2026-10-01 and the engine's `^2.70` peer range rejects it (ERESOLVE); adapter owner never set.
  - Redraft pinned SvelteKit 2 and the matching adapter, gave the SvelteKit 2 tsconfig, and filed `f:skeche`, `f:ghzx9c`, `f:jzm5ef`, `f:g48ytv`, `f:thgmpz`, `f:ibis7z`.
  - Two friction entries filed (SvelteKit 3 engine major; manifest-drift error names a nonexistent `npm run cairn:manifest`).
  - Allowlist entry `'file-path:svelte-kit/tsconfig.json'` (a site-project path; accepted by the conductor and the fact read).
  - Fact read accept (reproduced ERESOLVE and the pin). Reader re-test accept (milestones 1-3 run end to end).
  - Register fix on the :828 placeholder. Conductor ruling: name no placeholder in prose ("replace the account name"), since code font conflicts with `check:provenance`. The register's own rewrites for :53, :81, :930 applied verbatim, accepted without another round.
- theme-your-public-site
  - 7 run-2 blockers fixed. Fact accept. Register fix 1 (Resolve check 2 over 26 words).
  - Final reader fix 2: dev backend off hides the editor check behind sign-in; the font swap did not name tokens or the Fontsource import.
  - Redraft filed `f:dh5f33`, `f:3v9jzj`. Scoped reads accept.
  - Reader re-test accept: real Fraunces swap on a baked Waymark, audit clean, preview follows theme in both schemes.
- security-model
  - 6 round-2 blockers after the chain. Conductor rulings:
    - "The defaults are floors, not ceilings." stays (owner-tier `f:y3ljm0`, outline covers item 1; the contrast-frame tell yields to an owner-ruled sentence).
    - The group turn is the plan's one sentence word for word.
    - The :16 list item states a purpose and is no-claim.
  - Final reader accept. Scoped register and fact reads each blocked only on :16; the fact read's own option-(a) wording was applied without another round.

## Citation corrections (this step)

- `f:f21bcz`: `templates/waymark/src/hooks.server.ts:19-27` retargeted to `:19-24`. The file ends at line 26 and the `if`/`else` logic sits at 19-24.
- `f:u893cs`: `templates/waymark/src/theme/theme.css:45-53,143-146,192-195` is now `:143-146,192-195`. Lines 45-53 are the header comment (step 6); the light inks are 143-146 and the dark inks 192-195, both already cited, so the stale range was dropped instead of duplicated.

## Environment

`/tmp` hit its 6.1G per-user quota mid-close. The conductor removed the session's scratch build directories and Node's compile cache. Later agents put scratch under `$HOME/.cache`.

## Filed out of scope

- SvelteKit 3 engine major: engine pass, needs Geoff's go on a major.
- Manifest-drift error text (`verifyManifest` names `npm run cairn:manifest`).
- Waymark template `theme.css` header comment (line 66) names `check:public-tokens`, which a scaffolded `package.json` lacks; template fix emitted from `examples/showcase`.
- The two citation retargets above (done here).

## Gate

`CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`: exit 0, 17 checks OK.
