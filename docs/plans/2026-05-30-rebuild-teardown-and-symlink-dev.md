# Rebuild Teardown and Symlink Dev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tear down the merged rebuild worktree and stand up a documented, verified zero-publish symlink-dev workflow, so the upcoming site migrations onto `0.7.0` can iterate against the local cairn-cms.

**Architecture:** The `~/Projects/cairn` meta-workspace stays. An npm workspace links a local member into a dependent only when the local version satisfies the dependent's declared range. Local cairn-cms is `0.7.0` and both sites pin `0.6.0`, so the symlink cannot engage yet. This pass removes the dead rebuild worktree, proves the symlink workflow end-to-end with a reverted local experiment, and writes the runbook plus the launch-directory guidance. Each site's real move to `0.7.0` (the `renderPreview`-to-`render` rename and the delivery-surface adoption) lands in that site's own migration pass, where the symlink then engages for real.

**Tech Stack:** npm workspaces, SvelteKit/Vite dev resolution, git worktrees.

> **Run this pass from `~/Projects/cairn` (the workspace root).** Do not run it from `cairn-cms-rebuild`; Task 1 deletes that worktree, and a session anchored there would lose its cwd. Start a fresh session at the workspace root.

> **Why the symlink is blocked today.** npm workspaces symlink a member only when its version satisfies the consumer's range. The sites declare `"@glw907/cairn-cms": "0.6.0"` and the local member is `0.7.0`, which `0.6.0` does not satisfy, so npm resolves the published tarball instead of linking. Moving a site to a satisfying range (`^0.7.0`) forces the `renderPreview`-to-`render` adapter rename and a production deploy, which belongs in that site's migration pass. This pass proves the mechanism without committing any site change.

---

### Task 1: Tear down the merged rebuild worktree

**Files:** none (git plumbing only).

- [ ] **Step 1: Confirm the worktree branch is fully merged**

```bash
cd ~/Projects/cairn/cairn-cms
git merge-base --is-ancestor feat/rise-data-attr main && echo "MERGED" || echo "NOT MERGED — stop"
```

Expected: `MERGED`. If `NOT MERGED`, stop and investigate before removing anything.

- [ ] **Step 2: Remove the worktree**

```bash
git worktree remove ~/Projects/cairn/cairn-cms-rebuild
```

Expected: no output, exit 0. If it refuses for a dirty tree, inspect `git -C ~/Projects/cairn/cairn-cms-rebuild status` first and only force after confirming nothing unmerged is lost.

- [ ] **Step 3: Delete the merged branch and prune**

```bash
git branch -d feat/rise-data-attr
git worktree prune
```

Expected: `Deleted branch feat/rise-data-attr`.

- [ ] **Step 4: Verify the worktree list**

```bash
git worktree list
```

Expected: one entry, `~/Projects/cairn/cairn-cms  [main]`. The `cairn-cms-rebuild` and `cairn-public-delivery` entries are both gone.

---

### Task 2: Confirm the root-install baseline keeps site locks CI-safe

**Files:** none committed. This task is an empirical check of the workspace install behavior.

**Context:** Each site's standalone CI runs `npm ci` against the site's own committed `package-lock.json`, which must resolve cairn-cms from the registry. The STATUS gotcha is that `npm install` run *from inside a member* updates the root lock and leaves the member lock stale. A root-level install should leave the committed member locks untouched. Verify that rather than trust it.

- [ ] **Step 1: Record the current committed site locks**

```bash
cd ~/Projects/cairn
git -C ecnordic-ski rev-parse HEAD:package-lock.json
git -C 907-life rev-parse HEAD:package-lock.json
```

Expected: a blob hash per site. Note them.

- [ ] **Step 2: Run a root install and check for drift in the committed locks**

```bash
cd ~/Projects/cairn
npm install --no-audit --no-fund
git -C ecnordic-ski status --short package-lock.json package.json
git -C 907-life status --short package-lock.json package.json
```

Expected: empty output from both `git status` lines (the root install did not touch the committed member locks). If a lock shows as modified, restore it with `git -C <site> checkout -- package-lock.json` and record that the relock dance (Step 3) is mandatory before any future member-level install.

- [ ] **Step 3: Document the standalone relock dance (reference, run only when a member lock drifts)**

The dance restores a registry-resolved standalone lock for one site:

```bash
# From ~/Projects/cairn, with <site> = ecnordic-ski or 907-life
mv package.json /tmp/cairn-root-package.json
mv package-lock.json /tmp/cairn-root-lock.json
cd <site>
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund   # standalone: resolves cairn-cms from the registry
cd ..
mv /tmp/cairn-root-package.json package.json
mv /tmp/cairn-root-lock.json package-lock.json
```

- [ ] **Step 4: Verify each site's CI install path stays green**

```bash
cd ~/Projects/cairn
for s in ecnordic-ski 907-life; do
  echo "--- $s npm ci (standalone CI path) ---"
  ( cd "$s" && npm ci --no-audit --no-fund >/dev/null 2>&1 && echo "ci OK" || echo "ci FAILED" )
done
```

Expected: `ci OK` for both. A `ci FAILED` means the committed lock drifted; apply Step 3 for that site.

---

### Task 3: Prove symlink dev end-to-end, then revert

**Files (all reverted at the end of the task):**
- Modify (then revert): `907-life/package.json` (the cairn-cms range)
- Modify (then revert): `907-life/src/lib/cairn.config.ts:38` (`renderPreview` to `render`)

**Context:** This proves the workflow a real migration will use, without committing or deploying anything. 907-life is the test site because its adapter wiring is the smaller of the two.

- [ ] **Step 1: Locally point 907-life at the local cairn-cms range**

Edit `907-life/package.json`: change the dependency

```json
"@glw907/cairn-cms": "0.6.0"
```

to

```json
"@glw907/cairn-cms": "^0.7.0"
```

- [ ] **Step 2: Apply the 0.7.0 adapter rename so the config type-checks**

Edit `907-life/src/lib/cairn.config.ts` line 38: rename the property

```ts
renderPreview: renderPostHtml,
```

to

```ts
render: renderPostHtml,
```

- [ ] **Step 3: Root install and confirm the symlink engaged**

```bash
cd ~/Projects/cairn
npm install --no-audit --no-fund
ls -ld node_modules/@glw907/cairn-cms
readlink node_modules/@glw907/cairn-cms
```

Expected: `node_modules/@glw907/cairn-cms` exists and `readlink` shows it points at the local member (`cairn-cms` or `../cairn-cms`). The local member now satisfies `^0.7.0`, so npm links rather than fetches.

- [ ] **Step 4: Confirm 907-life resolves cairn-cms to the local member, not a registry copy**

```bash
cd ~/Projects/cairn/907-life
node -e "console.log(require('node:fs').realpathSync(require.resolve('@glw907/cairn-cms/package.json')))"
```

Expected: a path under `~/Projects/cairn/cairn-cms/`, proving local resolution. If it points into a `node_modules/.../cache` or a copied tarball path, the symlink did not engage; recheck Steps 1 and 3.

- [ ] **Step 5: Confirm a live local cairn-cms edit is visible to the site build**

```bash
cd ~/Projects/cairn/cairn-cms
# add a unique marker to a shipped string, e.g. a console banner in src/lib/index.ts
node -e "const f='src/lib/index.ts';const s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s+'\n// SYMLINK-DEV-PROBE\n')"
cd ~/Projects/cairn/907-life
grep -c 'SYMLINK-DEV-PROBE' node_modules/@glw907/cairn-cms/src/lib/index.ts
```

Expected: `1`. The site sees the local edit with no publish. Then remove the probe:

```bash
cd ~/Projects/cairn/cairn-cms
git checkout -- src/lib/index.ts
```

- [ ] **Step 6: Revert the 907-life experiment fully**

```bash
cd ~/Projects/cairn/907-life
git checkout -- package.json src/lib/cairn.config.ts
cd ~/Projects/cairn
npm install --no-audit --no-fund   # restore the clean, registry-resolved baseline
git -C 907-life status --short
```

Expected: clean `git status` for 907-life. Nothing from this task is committed.

---

### Task 4: Write the symlink-dev runbook and launch guidance

**Files:**
- Create: `~/Projects/cairn/cairn-cms/docs/runbooks/symlink-dev.md`
- Modify: `~/Projects/cairn/CLAUDE.md` (add a short pointer to the runbook and the launch table)

- [ ] **Step 1: Write the runbook**

Create `docs/runbooks/symlink-dev.md` covering, in plain prose with no em dashes:
- The version-coupling rule: the symlink engages only when local cairn-cms satisfies a site's declared range, so a site must be on `^0.7.0` (or later) and carry the `render` adapter property.
- The engage steps: bump the site range locally, apply the adapter rename, `npm install` at the workspace root, confirm with the `realpathSync` check from Task 3 Step 4.
- The CI-safety rule: never commit a member lock written by a root or member install that links cairn-cms; relock standalone first (the dance from Task 2 Step 3) so the committed lock stays registry-resolved.
- The launch-directory table (Step 2 below), so a reader knows where to start a session.

- [ ] **Step 2: Add the launch-directory table to the runbook**

```markdown
| Work | Start Claude in |
|------|-----------------|
| Workspace chores (this teardown, worktree or root-config edits) | `~/Projects/cairn` |
| A cairn-cms engine pass | `~/Projects/cairn/cairn-cms` |
| A site pass (ecnordic-ski / 907-life) | that site's directory |

Starting inside a repo still loads the workspace `CLAUDE.md` as a parent, and it
keeps that repo's own `.claude/` hooks, rules, and per-project memory active. The
workspace root does not load a site's `.claude/` guardrails, so reserve it for
cross-repo work.
```

- [ ] **Step 3: Point the workspace CLAUDE.md at the runbook**

Add one line under the "How to run this project" area of `~/Projects/cairn/CLAUDE.md` referencing `cairn-cms/docs/runbooks/symlink-dev.md` for local zero-publish dev and the launch-directory guidance. Keep it to a sentence; the runbook holds the detail.

- [ ] **Step 4: Pass the prose guard**

```bash
prose-guard ~/Projects/cairn/cairn-cms/docs/runbooks/symlink-dev.md
```

Expected: no violations. Fix any em dashes, banned openers, or structural flags before committing.

---

### Task 5: Update STATUS and commit the docs

**Files:**
- Modify: `~/Projects/cairn/cairn-cms/docs/STATUS.md`
- The runbook and CLAUDE.md change from Task 4

- [ ] **Step 1: Update the worktree topology in STATUS**

Edit `docs/STATUS.md`: remove the `cairn-cms-rebuild` worktree line (it is gone), and note that only the `main` checkout remains. Record that the symlink-dev runbook exists and that the symlink engages per-site at first migration to `0.7.0`.

- [ ] **Step 2: Update the next-steps list in STATUS**

Confirm the open steps read: each site migrates to `0.7.0` and onto the delivery surface in its own `site-pass` (this engages the symlink), then the next engine design (site-settings spec, then Plan 09, then Plan 10). The workspace dissolution stays deferred until cairn-cms stabilizes after the scaffolder.

- [ ] **Step 3: Commit the docs on main**

```bash
cd ~/Projects/cairn/cairn-cms
git add docs/runbooks/symlink-dev.md docs/STATUS.md docs/superpowers/plans/2026-05-30-rebuild-teardown-and-symlink-dev.md
git commit -m "docs(workspace): archive the rebuild worktree and document symlink dev"
```

The workspace `CLAUDE.md` lives outside any git repo, so its edit is not committed here. Note that in the commit body if helpful.

- [ ] **Step 4: Push main**

```bash
git push origin main
```

Expected: the push lands. No site repo deploys from this, since cairn-cms is the library.

---

## Self-Review

**Spec coverage.** The two intents from this session, archive the rebuild and keep-plus-rewire symlink dev, both map to tasks: Task 1 archives the worktree, Tasks 2 and 3 establish and prove the symlink mechanism, Task 4 documents it, Task 5 records the state. The deferred dissolution is captured in STATUS, not built here, which matches the decision.

**Placeholder scan.** Each code step carries the exact command or edit. The runbook prose in Task 4 is specified by content, not left as "write docs", and it has a prose-guard gate.

**Type consistency.** The adapter property rename is `renderPreview` to `render` everywhere it appears (Task 3 Step 2, the runbook in Task 4 Step 1). The cairn-cms range is `^0.7.0` consistently.

**Known wrinkle to watch at execution.** If Task 2 Step 2 shows the root install does modify a committed member lock, the plan still holds: apply the relock dance and treat root install as lock-unsafe in the runbook. Confirm the real behavior at execution rather than assume it.

---

## Post-mortem (2026-05-30)

**What was built.** The merged `cairn-cms-rebuild` worktree and its `feat/rise-data-attr` branch are removed, leaving the single `main` checkout. A new runbook, `docs/runbooks/symlink-dev.md`, documents the zero-publish symlink workflow with the launch-directory table, and the workspace `CLAUDE.md` points at it. STATUS records the post-teardown topology and the verified symlink mechanics.

**What was verified, with evidence.**

- Teardown: `git merge-base --is-ancestor feat/rise-data-attr main` returned merged; the worktree was removed and the branch deleted; `git worktree list` shows only `~/Projects/cairn/cairn-cms [main]`.
- Lock CI-safety (Task 2): a root `npm install` (added 87, removed 665, changed 7) left neither site's committed `package-lock.json` drifted, and standalone `npm ci` returned OK for both ecnordic-ski and 907-life.
- Symlink proof (Task 3): the end-to-end link was confirmed against 907-life. With local cairn-cms at `0.7.1`, the site on `^0.7.0`, a cleared root lock, and no site `node_modules`, `realpathSync` resolved `@glw907/cairn-cms` to `~/Projects/cairn/cairn-cms/` and a live local edit showed up through the site's resolution (probe count 1). Everything was reverted; all three repos are clean and local cairn-cms is back to `0.7.0`.

**Decisions locked / corrections to the plan.** The plan's Task 3 assumed bumping the site to `^0.7.0` plus a root install would link the local member. Two extra conditions proved necessary and are now in the runbook:

1. Local cairn-cms must run a proper version *ahead* of the published one. An exact `0.7.0` equal to the registry `0.7.0` makes npm prefer the tarball, and a prerelease (`0.7.1-dev`) does not satisfy `^0.7.0`. A plain `0.7.1` works.
2. Delete the root `package-lock.json` after the bump. An unchanged lock makes `npm install` print `up to date` and skip relinking. That lock is untracked (the workspace root is not a git repo), so regenerating it is free. A real `node_modules/@glw907/cairn-cms` inside a site also shadows the workspace link and must be removed first.

**Blockers.** None. The symlink workflow is proven and documented; it engages per-site at first migration to `^0.7.0`.

**Follow-ups.** Each site's migration pass is where the symlink actually engages and where the production deploy happens. The `[[workspace-symlink-and-next-pass]]` memory still describes the symlink as merely "off"; refresh it to point at the runbook and the two corrected conditions.
