# Draft docs 2a onto the SvelteKit 3 main: merge map (prep, 2026-10-06)

Read-only prep by the SvelteKit 3 pass's closing session, from a scratch clone (the real branches were untouched). Recommendation: 2a MERGES `main` in once (5 conflicted files) rather than rebasing, which re-conflicts on `docs/internal/facts/extend.md` at about 12 of its commits. Re-run the conflict listing against the real post-merge `main` before acting: this map was made against `sveltekit-3` at `802965aa` and `main` at `f0a94c0f`.

# Rebase map: draft-docs-2a onto main after the SvelteKit 3 pass

Scratch clone: ~/.cache/prep-2a-rebase/repo (branches trial-merge, trial-main, trial are throwaway; helper data in w/).

## 1. Merge base and counts
- draft-docs-2a = 9ca04531; sveltekit-3 = 802965aa; merge base = fc5f8b28 ("docs: note the approved extend page titles in STATUS"), an ancestor of main.
- 2a-only commits: 73 (counted from base). kit3-only: 71. `main` (f0a94c0f) is 55 ahead of the base and 27 ahead of sveltekit-3 (STATUS, friction log, register, plan/spec research); kit3 will merge into it.
- The rebase replays 73 commits (the log lists 72 that git replays after dropping the merge commit 3e19de2a).

## 2. Textual conflicts
`git rebase sveltekit-3` stops at commit 6 of 72 (86fd134c) and would stop again at every later 2a commit touching the same bullets (list below), so it was aborted and `git merge --no-commit sveltekit-3` used for the full set.

| File | 2a commits touching it (each re-conflicts in a rebase) | Nature |
|---|---|---|
| docs/internal/facts/extend.md (6 hunks) | 86fd134c (first stop), b9013079, 5d8776c7, f6cee04f, 297c0282, a0213cc3, 0d8b55be, 6e5f54e6, 2aacb280, bf156175, 7675dd82, 9ca04531 | Both retagged/edited the same bullets. Hunks: (1) f:jbt2hh; (2) f:dzmj90 e5hqn3 e8dr5r em69ru ew4uk7 exxsvk f21bcz (2a re-sourced lines, Task 13 retagged e5hqn3 rejected and shifted lines); (3) f:ubuj1w yzbvk4 kkp5bi (2a added metas/token-cache text; Task 13 changed no-referrer to strict-origin and line numbers; kkp5bi 2a-wording and Task 13 differ); (4) f:keuj8l n3k03a tkpmxr; (5) f:72xplg v85shm (ours) vs 72xplg yw90zn ju2l4b f3zp4n (theirs); (6) f:16cx9j qtm9y2 (ours) vs qtm9y2 1stlyv (theirs). Hunks 5 and 6 differ in which ids exist per side, so v85shm and 16cx9j need a decision (2a-only or retired by Task 13?). Resolve by taking Task 13's bullet and re-applying 2a's own retag only where 2a's change still holds. |
| docs/internal/facts/admin.md (1 hunk) | 0d8b55be | Both rewrote f:c0iqug, f:8x6xqz, f:jk30dz, f:67pwmj (Task 13 retired config.csrf-disable-missing for config.csrf-trusted-origins-wildcard; 2a settled the committer fact differently from Task 13's wording; line-number shifts). |
| docs/internal/facts/reference.md (1 hunk) | 98f0c17e/297c0282 | f:xg1per: 2a has `^2.70`/`^5.56.10`, Task 13 has `^3`/`^5.57.1`. Take Task 13. |
| package.json (1 hunk) | 14297445 | 2a adds `check:options` to `check:close`; Task 13 appends `&& tsc -p src/tests/types/tsconfig.json` to `check`. Combine both. |
| (auto-merged, no conflict) docs/extend/migration-notes.md, docs/internal/docs-friction-log.md, docs-register.md, CLAUDE.md, ROADMAP.md, facts/editors.md, facts/front-door.md | | Disjoint hunks against sveltekit-3. |

Against main itself (sveltekit-3 plus 27 main-only commits): one more conflict, docs/internal/docs-register.md (main 00d7ce44 "add the introduction section to the developer drafting brief" vs 2a's 6e5f54e6 "adopt page introductions and endings"; both edit the Tutorial / Tutorial milestone bullets and a later "page plan rule" paragraph at ~L1030). Confirm what main's wording supersedes before taking either side.

## 3. Semantic drift
Cited ids: 431 distinct across 2a's docs/extend/*.md and briefs/extend/*. Task 13 retired no id (in base, absent on kit3: none), but changed 46 cited bullets (text or source lines); 61 cited ids exist only on 2a (the code-sweep and 2a-added bullets), absent from kit3 by design.

Task 13 changed these cited ids (page in parentheses; "rej" = retagged [rejected]):
- security-model: f:d2jumm (rej; also add-cairn), f:gncd64 (rej; also add-cairn), f:7qqhda (guard order loses origin step), f:ubuj1w (referrer-policy now strict-origin), f:yzbvk4, f:diro7m, f:keuj8l, f:b3l3t0, f:3cekcy (checkOrigin deprecation removed), f:72xplg (csp), f:g22dnw, f:tkpmxr, f:gh73p5 (platform.env/process.env now Worker env only), f:ix10bm, f:qbfriw, f:rv9gdc, f:xg1per via architecture.
- add-cairn: f:e5hqn3 (rej), f:xyizai, f:f21bcz, f:jbt2hh, f:7bch04, f:979v0a, f:n52h8f (App.Platform gone), f:txgoyy, f:vvgpr5 (Env from wrangler types).
- add-a-custom-admin-screen: f:07efts, f:3j02dk, f:68h31z, f:esp93u, f:jra92k, f:xgy3iu, f:onqm6k (platform.env), f:qlgggh (svelte.config.js), f:qtm9y2 (/md param).
- replace-magic-links: f:iaqcq6, f:paotzb, f:sbv5xj (line shifts).
- theme-your-public-site: f:lwrqfd (`$`->`#` alias), f:f21bcz.
- architecture: f:xg1per.
- choose-an-ai-posture: f:65atya, f:gnlib7, f:tno8hh.
2a-added facts that still state Kit 2 facts: f:g48ytv (Kit 2 tsconfig form), f:jzm5ef (Kit 2 pin, adapter ^7), f:skeche (`^2.70` ERESOLVE), f:ghzx9c (Kit 3 is npm latest; `$app/tsconfig`), f:j0ut9n (svelte.config.js; cited by add-cairn, architecture, security-model), f:ppqu4v (`$app/environment`; cited by architecture). Every id above needs a fact-read pass; check:facts re-verifies source lines.

Claims on the six pages needing a Kit 3 rewrite (grep, line numbers on 2a):
- add-cairn-to-a-sveltekit-app (1251 lines): L54 `svelte.config.js` aside; L60-64, 83-87 pin SvelteKit 2 and `@sveltejs/kit@^2.70 adapter-cloudflare@^7`; L90-109 SvelteKit 2 `./.svelte-kit/tsconfig.json` form (Kit 3 uses `$app/tsconfig`, `$lib` imports at L417-445, 759-760 become `#lib`); L477, 512, 709 `csrf: { checkOrigin: false }` (removed in Kit 3, delete the block; `trustedOrigins: ['*']` is wrong); L229 ambient types and `App.Locals`/`App.Platform` wording.
- security-model: L154, 476 `csrf.checkOrigin` / `svelte.config.js`; L160, 184-187, 217, 478 `no-referrer` for admin (now `strict-origin` with header and meta); L167 link to anchor `reference/supported-toolchain.md#the-checkorigin-deprecation`, which is now `## The checkOrigin removal` (broken); L231 `svelte.config.js` for csp; L245 `platform.env` and `process.env` (Worker env only now).
- add-a-custom-admin-screen: L149-165, 212 `App.Platform['env']` and `platform.waitUntil` (use `Env` from wrangler types and `cloudflare:workers`).
- theme-your-public-site: L282 `$chassis` alias (now `#chassis`; `#theme`).
- replace-magic-links-with-cloudflare-access: L290 `$lib/access-identity.js` (now `#lib`).
- architecture: L61 mentions no framework binding; low risk, plus f:ppqu4v `$app/environment` (now `$app/env` in loadPreview). No `vite preview` mention on any page (migration-notes covers it).
- Also on kit3: docs/extend/choose-an-ai-posture.md L61-62 still imports `$chassis`/`$theme` (CHANGELOG says `#chassis`, `#theme`); it exists on main, not a 2a page, but 2a's links to it.
- Link check: of ../reference anchors on the six pages, only the-checkorigin-deprecation is gone (identityresolver survives as an `<a id>`).
- Gate drift in 2a infrastructure: docs/internal/outlines/extend.json L274, L1060, L1365 (`examples/showcase/svelte.config.js`, deleted on kit3), L3433 cite checkOrigin/no-referrer behavior. scripts/checks (check-tool-heuristics, tool-check-ids) still name `config.csrf-disable`; Task 13 changed the doctor ids, so those 2a-side scripts may need updating (not run).

## 4. Carry-forward status
| Item | draft-docs-2a | sveltekit-3 |
|---|---|---|
| add-cairn tutorial's Kit 2 pin | present (docs/extend/add-cairn-to-a-sveltekit-app.md L60-109) | not on this branch (page does not exist there; migration-notes carries the Kit 3 steps) |
| f:skeche | present, facts/extend.md:144 | absent (never existed there) |
| f:ghzx9c | present, facts/extend.md:145 | absent |
| facts/extend.md:144 `^2.70` claim (skeche) | present | absent; `^2.70` survives only in historical facts f:sjo4cx (0.96.0 record) and old records |
| Other `^2.70` on 2a | docs/reference/supported-toolchain.md L22,30,34; facts/admin.md:75 (f:01tx08); reference.md:1539 (f:xg1per); package.json L221,282; templates/waymark/package.json:34; extend/migration-notes.md:557 | fixed on kit3 except historical records (HISTORY, migration-notes 0.96.0 entry, f:sjo4cx) |
Also stale on 2a after rebase: f:jzm5ef and f:g48ytv (Kit 2 pin and tsconfig form), plus plan/framing/json briefs for add-cairn (plan.md L183-191, L827-932 carry rows for ghzx9c, skeche, jzm5ef, g48ytv) and docs-friction-log.md L623-630.

## 5. Chain check
- `cmp ~/.claude/workflows/docs-page-chain.js /var/home/glw907/.dotfiles/claude/.claude/workflows/docs-page-chain.js`: identical (SAME), 115117 bytes.
- Framing stage present: 73 `framing` matches, including `framingModel` option and "The framing step" section (L9-12, 24, 47).
