# Workspace flatten and Claude infrastructure Implementation Plan

> **For agentic workers:** This is a stateful filesystem and git operation, not a code feature. Execute it
> INLINE with `superpowers:executing-plans` in a single session, not subagent-driven (per-task subagents
> reset their working directory and cannot share the live move state). **Launch the executing session from
> `~/Projects` (the parent), never from inside `~/Projects/cairn/`, because the final task deletes that
> directory and a session pinned inside it would lose its shell.** Steps use checkbox (`- [ ]`) syntax.

**Goal:** Flatten the three cairn repos into standalone siblings under `~/Projects/`, point the sites at the
npm registry, migrate and consolidate the per-project Claude memory to the new working-directory keys, and
give each repo a self-sufficient `CLAUDE.md`.

**Architecture:** A plain `mv` carries each repo's `.git`, `.claude`, and untracked files, so history and
config survive. The sites already pin `@glw907/cairn-cms` by version range, so a clean standalone
`npm install` resolves it from the registry once the workspace symlink is gone. Per-project memory is keyed
by the working-directory path, so each repo's memory moves to its new key and the fragmented cairn memory
consolidates.

**Tech Stack:** bash, git, npm, the SvelteKit/Cloudflare site toolchains, the Claude Code memory and config
files under `~/.claude`.

**Source spec:** `docs/superpowers/specs/2026-06-04-workspace-flatten-and-claude-infra-design.md`.

**Pre-flight reminder:** Before editing any doc or `CLAUDE.md`, read `~/.claude/docs/prose-voice.md`. The
`prose-guard` hook rejects a whole file on a violation, so draft clean. No em dashes, one idea per sentence.

---

### Task 1: Pre-flight safety checks and baseline capture

Confirm the starting state is safe to move and record it, so a later step can be verified or reversed.

**Files:** none (read-only checks plus a scratch note you keep in the session).

- [ ] **Step 1: Confirm each repo's git state**

```bash
for r in cairn-cms ecnordic-ski 907-life; do
  echo "== $r =="; git -C ~/Projects/cairn/$r branch --show-current
  git -C ~/Projects/cairn/$r status --short | head
  echo "ahead/behind origin: $(git -C ~/Projects/cairn/$r rev-list --left-right --count @{upstream}...HEAD 2>/dev/null || echo n/a)"
done
```
Expected: `cairn-cms` on `main` with a clean tree and local commits ahead of origin (the unpushed DX work, which the move preserves). `ecnordic-ski` on `main`, clean, 0/0. `907-life` on `main`, with only untracked `static/fonts/*.woff2` showing.

- [ ] **Step 2: Confirm cairn-cms has no extra worktrees**

```bash
git -C ~/Projects/cairn/cairn-cms worktree list
```
Expected: only the `main` checkout at `~/Projects/cairn/cairn-cms`. If a stray worktree exists, stop and resolve it first.

- [ ] **Step 3: Record the memory key inventory**

```bash
for k in -home-glw907-Projects-cairn -home-glw907-Projects-cairn-cairn-cms \
         -home-glw907-Projects-cairn-907-life -home-glw907-Projects-907-life \
         -home-glw907-Projects-ecnordic-ski; do
  d=~/.claude/projects/$k/memory
  echo "$k: $(ls "$d"/*.md 2>/dev/null | wc -l) files"
done
```
Expected: meta 38, cairn-cairn-cms 14, cairn-907-life 2, 907-life 10, ecnordic-ski 14 (counts include each `MEMORY.md`). Note the numbers; Task 7 reconciles against them.

No commit (read-only).

---

### Task 2: Remove 907's unused font files

The seventeen untracked `.woff2` files under `907-life/static/fonts/` are unreferenced strays. Confirm they
are still unreferenced, then delete them.

**Files:**
- Delete: `~/Projects/cairn/907-life/static/fonts/{AlegreyaSans,CormorantGaramond,ETBook,Iosevka,iAWriter}*.woff2`

- [ ] **Step 1: Re-confirm the fonts are unreferenced**

```bash
cd ~/Projects/cairn/907-life
grep -rniE "AlegreyaSans|CormorantGaramond|ETBook|Iosevka|iAWriter" src static app.html svelte.config.js 2>/dev/null | grep -vi node_modules
```
Expected: no output. The site's `@font-face` rules in `src/app.css` use `Karla`, `Spectral`, and
`MonaspaceNeon` only. If anything prints, stop and reassess before deleting.

- [ ] **Step 2: Delete the unused fonts**

```bash
cd ~/Projects/cairn/907-life
rm -f static/fonts/AlegreyaSans-*.woff2 static/fonts/CormorantGaramond-*.woff2 \
      static/fonts/ETBook-*.woff2 static/fonts/Iosevka-*.woff2 static/fonts/iAWriter*.woff2
git status --short
```
Expected: the seventeen files are gone, and `git status` is clean (they were untracked, so nothing to
commit). The tracked `Karla`, `Spectral`, and `MonaspaceNeon` fonts remain.

No commit (the deleted files were never tracked).

---

### Task 3: cairn-cms in-repo content changes (before the move)

Make the `cairn-cms` documentation changes while the meta files are still in place to derive from. Commit
them in `cairn-cms` on `main`. These are docs-only commits.

**Files:**
- Create: `~/Projects/cairn/cairn-cms/CLAUDE.md`
- Delete: `~/Projects/cairn/cairn-cms/docs/runbooks/symlink-dev.md`
- Move into repo: `~/Projects/cairn/cairn-dx-feedback-2026-06-04.md` to `~/Projects/cairn/cairn-cms/docs/cairn-dx-feedback-2026-06-04.md`
- Modify: `~/Projects/cairn/cairn-cms/docs/STATUS.md` (top orientation lines)

- [ ] **Step 1: Read the meta CLAUDE.md to derive cairn-cms's own**

```bash
cat ~/Projects/cairn/CLAUDE.md
```
The meta file describes the whole workspace. `cairn-cms` needs its own, scoped to the library and free of
the workspace and symlink framing.

- [ ] **Step 2: Write `cairn-cms/CLAUDE.md`**

Create `~/Projects/cairn/cairn-cms/CLAUDE.md`. Keep it under 200 lines. Carry forward from the meta file
only what a `cairn-cms` session needs: what cairn-cms is (the embedded magic-link, GitHub-committing CMS for
SvelteKit/Cloudflare sites), how to run the rebuild (the functional spec path, the numbered plan series, the
`cairn-pass` skill, executing plans on a worktree off `main`), the tooling (the `cairn-implementer` and the
four reviewer agents, the subagent-model note, the Cloudflare MCP), the durable Cloudflare email gotcha, and
the credentials block (GitHub App id/installation/key, the two D1 AUTH_DB ids). Drop the meta-workspace
framing, the three-subdir layout, the `npm workspaces` symlink description, and any reference to consumer
sites living beside it. State that cairn-cms is now a standalone repo at `~/Projects/cairn-cms` whose
consumers install it from the npm registry, and that its own development proves changes against
`examples/showcase`. Write it in plain voice with no em dashes. Run `prose-guard CLAUDE.md` and fix any
flagged line by rewriting for human cadence.

- [ ] **Step 3: Retire the symlink-dev runbook**

```bash
cd ~/Projects/cairn/cairn-cms
git rm docs/runbooks/symlink-dev.md
grep -rn "symlink-dev" docs/ CLAUDE.md 2>/dev/null
```
Remove any reference the grep surfaces (for example in STATUS.md or another doc), so no link dangles. The
registry-consumer flow is the standard SvelteKit story and needs no runbook.

- [ ] **Step 4: Relocate the DX feedback doc into the repo**

```bash
cd ~/Projects/cairn/cairn-cms
git mv ../cairn-dx-feedback-2026-06-04.md docs/cairn-dx-feedback-2026-06-04.md 2>/dev/null \
  || { mv ../cairn-dx-feedback-2026-06-04.md docs/cairn-dx-feedback-2026-06-04.md; git add docs/cairn-dx-feedback-2026-06-04.md; }
```
The doc lives at the meta root and is untracked, so the fallback branch moves it in and stages it. The
`cairn-dx-pass-sequence` memory names it by the workspace-root path; Task 7 fixes the memory, so just note it
here.

- [ ] **Step 5: Update STATUS.md orientation for the new path**

In `~/Projects/cairn/cairn-cms/docs/STATUS.md`, update only the durable orientation that names the old
location or the symlink-dev workflow. Add a short top note that cairn-cms now lives at `~/Projects/cairn-cms`
as a standalone repo, its consumer sites install it from the registry, and the symlink-dev workspace is
retired. Do not rewrite the rolling "Where the work is" history. Keep prose clean.

- [ ] **Step 6: Verify and commit**

```bash
cd ~/Projects/cairn/cairn-cms
prose-guard CLAUDE.md && prose-guard docs/STATUS.md
git add CLAUDE.md docs/STATUS.md docs/cairn-dx-feedback-2026-06-04.md
git status --short
git commit -m "Add standalone cairn-cms CLAUDE.md; retire symlink-dev runbook; relocate DX feedback"
```
Expected: `prose-guard` clean (an advisory anaphora tell on a long file is acceptable and does not block).
The commit includes the new `CLAUDE.md`, the `git rm` of the runbook, the moved feedback doc, and the STATUS
edit.

---

### Task 4: Move ecnordic-ski to ~/Projects and install standalone

**Files:** the whole `ecnordic-ski` directory moves; `node_modules` and `package-lock.json` are regenerated.

- [ ] **Step 1: Move the directory**

```bash
mv ~/Projects/cairn/ecnordic-ski ~/Projects/ecnordic-ski
ls -d ~/Projects/ecnordic-ski/.git ~/Projects/ecnordic-ski/.claude
```
Expected: both paths exist (history and config travelled).

- [ ] **Step 2: Reinstall standalone from the registry**

```bash
cd ~/Projects/ecnordic-ski
rm -rf node_modules
npm install
node -e "console.log('cairn-cms resolved:', require('@glw907/cairn-cms/package.json').version)"
```
Expected: `npm install` succeeds and the resolved `@glw907/cairn-cms` version is a published one (`0.24.0` or
lower satisfying `^0.21.0`), pulled from the registry rather than a workspace symlink. If `npm install` fails
because the committed `package-lock.json` pins an unpublished version, regenerate it: `rm package-lock.json
&& npm install`, then confirm the resolved version is published.

- [ ] **Step 3: Verify the site builds standalone**

```bash
cd ~/Projects/ecnordic-ski
npm run check && npm run build
```
Expected: `check` passes and the build exits 0. If a `package-lock.json` change was needed in Step 2, commit
it:
```bash
git add package-lock.json && git commit -m "Relock cairn-cms from the registry after leaving the workspace"
```
If the lock did not change, no commit is needed.

---

### Task 5: Move 907-life to ~/Projects and install standalone

**Files:** the whole `907-life` directory moves; `node_modules` and `package-lock.json` are regenerated.

- [ ] **Step 1: Move the directory**

```bash
mv ~/Projects/cairn/907-life ~/Projects/907-life
ls -d ~/Projects/907-life/.git ~/Projects/907-life/.claude
```
Expected: both paths exist.

- [ ] **Step 2: Reinstall standalone from the registry**

```bash
cd ~/Projects/907-life
rm -rf node_modules
npm install
node -e "console.log('cairn-cms resolved:', require('@glw907/cairn-cms/package.json').version)"
```
Expected: `npm install` succeeds and the resolved `@glw907/cairn-cms` is published (`0.24.0` satisfying
`^0.24.0`). Apply the same `rm package-lock.json && npm install` fallback as Task 4 if an unpublished pin
blocks the install.

- [ ] **Step 3: Verify the site builds standalone**

```bash
cd ~/Projects/907-life
npm run check && npm run build
```
Expected: `check` passes and the build exits 0 with the unused fonts already gone (Task 2). Commit a
`package-lock.json` change only if Step 2 produced one, with the same message as Task 4 Step 3.

---

### Task 6: Move cairn-cms to ~/Projects and install standalone

The plan and spec live inside `cairn-cms`, so they move with it. The executing session holds the plan in
context, so the path change does not interrupt execution.

**Files:** the whole `cairn-cms` directory moves; `node_modules` is regenerated.

- [ ] **Step 1: Move the directory**

```bash
mv ~/Projects/cairn/cairn-cms ~/Projects/cairn-cms
ls -d ~/Projects/cairn-cms/.git ~/Projects/cairn-cms/examples/showcase
git -C ~/Projects/cairn-cms log --oneline -1
```
Expected: the paths exist and the latest commit is the Task 3 docs commit, confirming history and the
just-made changes travelled.

- [ ] **Step 2: Reinstall and verify the engine gate**

```bash
cd ~/Projects/cairn-cms
rm -rf node_modules
npm install
npm run check
npm test
```
Expected: `check` reports 0 errors and 0 warnings, and `npm test` exits 0. `cairn-cms` has no external
workspace dependency (it is the package), and `examples/showcase` resolves it through the relative
`file:../..` path, which the move preserves. The harmless showcase `ERR_MODULE_NOT_FOUND` line the root
`check` logs is not counted.

No commit (no tracked files changed in this task).

---

### Task 7: Migrate and consolidate the per-project memory

Move each memory file to the key of the repo it is about, deduplicate, drop the obsolete symlink memories,
and rebuild each destination `MEMORY.md` index. This operates on files under `~/.claude/projects`, outside
any git repo, and is reversible by moving the files back.

Key shorthands used below:
- `META` = `~/.claude/projects/-home-glw907-Projects-cairn/memory`
- `CMS_OLD` = `~/.claude/projects/-home-glw907-Projects-cairn-cairn-cms/memory`
- `C907_OLD` = `~/.claude/projects/-home-glw907-Projects-cairn-907-life/memory`
- `CMS_NEW` = `~/.claude/projects/-home-glw907-Projects-cairn-cms/memory`
- `ECN` = `~/.claude/projects/-home-glw907-Projects-ecnordic-ski/memory`
- `NINE07` = `~/.claude/projects/-home-glw907-Projects-907-life/memory`

- [ ] **Step 1: Create the new cairn-cms memory key directory**

```bash
mkdir -p ~/.claude/projects/-home-glw907-Projects-cairn-cms/memory
```

- [ ] **Step 2: Move the cairn-cms engine and cross-cutting memories into the new key**

Move every file from `META` into `CMS_NEW` EXCEPT the two that route elsewhere or are obsolete:
- `ecnordic-cairn-0.21-migration.md` routes to `ECN` (Step 4), so do not move it here.
- `cairn-symlink-dev-mechanics.md` is obsolete once the workspace is gone, so delete it (Step 6), do not move it.

```bash
META=~/.claude/projects/-home-glw907-Projects-cairn/memory
CMS_NEW=~/.claude/projects/-home-glw907-Projects-cairn-cms/memory
cd "$META"
for f in *.md; do
  case "$f" in
    MEMORY.md|ecnordic-cairn-0.21-migration.md|cairn-symlink-dev-mechanics.md) continue;;
    *) mv "$f" "$CMS_NEW"/;;
  esac
done
```
This carries the cairn engine memories (the rebuild, content-graph, delivery, schema, render, auth, DX, url,
component-registry, image-gallery, and the like) and the cross-cutting development memories
(`claude-infra-pre-pass-done`, `clear-context-before-implementing-plans`, `geoff-autonomy-and-context-handoff`,
`npm-publishing-constraints`, `subagent-model-strategy`) into the cairn-cms key, where the user does most of
this work.

- [ ] **Step 3: Merge the direct cairn-cms key, deduplicating against what just moved**

`CMS_OLD` holds 13 memories already scoped to cairn-cms. Move each into `CMS_NEW`, but some collide with files
moved in Step 2 and need a dedup decision:
- `cairn-rebuild-initiative.md` exists in both. Compare the two and keep the more complete and recent one,
  then discard the other.
- `subagent-model-strategy.md` (moved in Step 2) and `subagent-model-assignment.md` (in `CMS_OLD`) cover the
  same topic. Read both. If one subsumes the other, keep that one and discard the duplicate, otherwise keep
  both since they describe different facets (the strategy versus the per-agent assignment).
- `workspace-symlink-and-next-pass.md` describes the now-retired symlink workflow. If it is purely about the
  symlink dev loop, delete it as obsolete. If it carries a still-relevant "next pass" pointer, keep the
  relevant part.

```bash
CMS_OLD=~/.claude/projects/-home-glw907-Projects-cairn-cairn-cms/memory
CMS_NEW=~/.claude/projects/-home-glw907-Projects-cairn-cms/memory
cd "$CMS_OLD"
for f in *.md; do
  [ "$f" = MEMORY.md ] && continue
  if [ -e "$CMS_NEW/$f" ]; then
    echo "COLLISION (decide): $f"
  else
    mv "$f" "$CMS_NEW"/
  fi
done
```
Resolve each printed collision by hand per the rules above, then move or discard accordingly.

- [ ] **Step 4: Route the site-specific memory to its site key**

```bash
META=~/.claude/projects/-home-glw907-Projects-cairn/memory
ECN=~/.claude/projects/-home-glw907-Projects-ecnordic-ski/memory
C907_OLD=~/.claude/projects/-home-glw907-Projects-cairn-907-life/memory
NINE07=~/.claude/projects/-home-glw907-Projects-907-life/memory
mv "$META"/ecnordic-cairn-0.21-migration.md "$ECN"/ 2>/dev/null || echo "already moved or absent"
ls "$C907_OLD"
mv "$C907_OLD"/907-cairn-workspace-orientation.md "$NINE07"/ 2>/dev/null || true
```
After moving, read the moved 907 file and either update it for the new standalone path or delete it if it is
purely workspace-orientation that no longer applies.

- [ ] **Step 5: Rebuild each destination MEMORY.md index**

Each key's `MEMORY.md` is the one-line-per-memory index loaded each session. Rebuild three of them. Use the
existing index format, a bulleted markdown link to the file followed by a short hook on the same line.
- `CMS_NEW/MEMORY.md`: create it (the key is new). For every `*.md` in `CMS_NEW`, add one pointer line. Reuse
  the hook text from the old `META/MEMORY.md` and `CMS_OLD/MEMORY.md` where it exists, and write a short hook
  for any without one. Update any pointer whose memory was renamed or merged in Step 3.
- `ECN/MEMORY.md`: append a pointer line for the moved `ecnordic-cairn-0.21-migration.md`, deduping if the
  existing index (which has a `cairn-cms-initiative.md` entry) already references the same migration.
- `NINE07/MEMORY.md`: append a pointer line for the moved 907 memory if it was kept.

Keep each `MEMORY.md` to one line per memory, no frontmatter, no memory bodies, and no em dashes in the
hooks per the standing rule.

- [ ] **Step 6: Fix cross-memory links and drop the obsolete entries**

```bash
META=~/.claude/projects/-home-glw907-Projects-cairn/memory
CMS_NEW=~/.claude/projects/-home-glw907-Projects-cairn-cms/memory
ECN=~/.claude/projects/-home-glw907-Projects-ecnordic-ski/memory
NINE07=~/.claude/projects/-home-glw907-Projects-907-life/memory
rm -f "$META"/cairn-symlink-dev-mechanics.md
grep -rln "cairn-symlink-dev-mechanics\|symlink-dev-mechanics" "$CMS_NEW" "$ECN" "$NINE07" 2>/dev/null
```
Edit any file the grep finds so the dangling `[[cairn-symlink-dev-mechanics]]` link is removed or repointed.
Also scan `CMS_NEW` for any `[[link]]` whose target moved to a site key (for example a link to
`[[ecnordic-cairn-0.21-migration]]`). A cross-key link does not resolve, so reword it to a plain mention.

- [ ] **Step 7: Empty the drained source keys**

```bash
META=~/.claude/projects/-home-glw907-Projects-cairn/memory
CMS_OLD=~/.claude/projects/-home-glw907-Projects-cairn-cairn-cms/memory
C907_OLD=~/.claude/projects/-home-glw907-Projects-cairn-907-life/memory
for d in "$META" "$CMS_OLD" "$C907_OLD"; do echo "== $d =="; ls "$d"; done
rm -f "$META"/MEMORY.md "$CMS_OLD"/MEMORY.md "$C907_OLD"/MEMORY.md
```
Expected before the `rm`: each drained directory holds only its old `MEMORY.md`. Removing the stale
`MEMORY.md` keeps an orphaned index from loading if that path is ever revisited. Leave the now-empty
directories in place; Claude Code ignores an empty memory directory.

- [ ] **Step 8: Verify the consolidation**

```bash
CMS_NEW=~/.claude/projects/-home-glw907-Projects-cairn-cms/memory
ECN=~/.claude/projects/-home-glw907-Projects-ecnordic-ski/memory
NINE07=~/.claude/projects/-home-glw907-Projects-907-life/memory
echo "cairn-cms key: $(ls "$CMS_NEW"/*.md | wc -l) files"
echo "ecnordic key: $(ls "$ECN"/*.md | wc -l) files"
echo "907 key: $(ls "$NINE07"/*.md | wc -l) files"
grep -c "^- \[" "$CMS_NEW"/MEMORY.md
```
Expected: `CMS_NEW` holds the consolidated cairn-cms memories plus its `MEMORY.md`, the site keys grew by
their moved entries, and `CMS_NEW/MEMORY.md` has one pointer line per memory file. No git commit (this is
outside any repo).

---

### Task 8: Trim cross-repo framing from the site CLAUDE.md files

Each site's `CLAUDE.md` travelled intact. Remove the lines that assumed the shared workspace, so each reads
as a standalone repo.

**Files:**
- Modify: `~/Projects/ecnordic-ski/CLAUDE.md`
- Modify: `~/Projects/907-life/CLAUDE.md`

- [ ] **Step 1: Trim ecnordic-ski/CLAUDE.md**

```bash
grep -niE "cairn-cms/docs/PLAN|cairn-pass|workspace|monorepo|\.\./" ~/Projects/ecnordic-ski/CLAUDE.md
```
Reword or drop the line that points at `cairn-pass` or `cairn-cms/docs/PLAN.md` for cairn-cms work (the site
no longer sits beside cairn-cms). Keep the site-pass and site-development guidance. The site still consumes
`@glw907/cairn-cms` from the registry, so a one-line note that it pins the published package is fine.

- [ ] **Step 2: Trim 907-life/CLAUDE.md**

```bash
grep -niE "cairn-cms/|cairn-pass|workspace|monorepo|\.\./|symlink" ~/Projects/907-life/CLAUDE.md
```
Apply the same trim. Drop or reword any line that assumed the workspace or pointed at cairn-cms internals,
keep the site's own development guidance, and note registry consumption if useful.

- [ ] **Step 3: Verify prose and commit each site**

```bash
cd ~/Projects/ecnordic-ski && prose-guard CLAUDE.md && git add CLAUDE.md && git commit -m "Decouple CLAUDE.md from the cairn workspace"
cd ~/Projects/907-life && prose-guard CLAUDE.md && git add CLAUDE.md && git commit -m "Decouple CLAUDE.md from the cairn workspace"
```
Expected: `prose-guard` clean on each (advisory anaphora does not block), one docs commit per site.

---

### Task 9: Verify and apply the optional agent enhancements

The research suggested two Claude Code mechanisms. Verify each against the live tool before relying on it,
since the source report was wrong on several config specifics. Apply only what checks out.

**Files (only if confirmed):** the recurring agent definitions under `~/.claude/agents/`.

- [ ] **Step 1: Locate the recurring agents**

```bash
ls ~/.claude/agents/ 2>/dev/null
grep -l "cairn-implementer\|reviewer" ~/.claude/agents/*.md 2>/dev/null
```
Expected: the user-scoped `cairn-implementer` and the four reviewer agents
(`svelte-reviewer`, `cloudflare-workers-reviewer`, `web-auth-security-reviewer`, `daisyui-a11y-reviewer`).
These are global, so the repo move did not touch them.

- [ ] **Step 2: Verify the `memory:` agent-frontmatter feature exists**

Check the live docs or the `/agents` help for a supported `memory:` frontmatter field (the research claimed
`memory: project` gives an agent cross-session knowledge). Use the `claude-code-guide` agent or
`code.claude.com/docs/en/sub-agents` to confirm the field name and accepted values on version 2.1.162.

- [ ] **Step 3: Apply `memory: project` only if confirmed**

If Step 2 confirms the field, add `memory: project` to the frontmatter of the four reviewer agents and the
`cairn-implementer`, so they accumulate review and implementation patterns across passes. If Step 2 does not
confirm it, skip this and record in the post-mortem that the feature was unverified and not applied. Do not
guess at a frontmatter key.

- [ ] **Step 4: Note the rules and Opus-4.8 facts (no change required)**

Record in the post-mortem that `.claude/rules/*.md` with `paths:` frontmatter is the lever if any `CLAUDE.md`
later grows past 200 lines (none does today), and that the Opus 4.8 tools (`/fast`, `ultracode` with
`/workflows`, the effort levels) are available for the user's own use. No file change.

No commit unless Step 3 edited an agent file. If it did, commit it where those agents live (the dotfiles
checkout if `~/.claude` is one, otherwise leave the edit in place and note it).

---

### Task 10: Delete the drained ~/Projects/cairn wrapper

Only the wrapper directory and its workspace artifacts remain. Confirm that, then remove it. This is the one
irreversible step, so it runs last and behind a dry-run.

**Files:**
- Delete: `~/Projects/cairn/` (the wrapper, holding the meta `package.json`, `node_modules`,
  `package-lock.json`, `CLAUDE.md`, `.claude/`, and any leftover).

- [ ] **Step 1: Dry-run list what remains**

```bash
ls -la ~/Projects/cairn/
find ~/Projects/cairn -maxdepth 2 -name .git 2>/dev/null
```
Expected: the three repos are GONE from `~/Projects/cairn/`. What remains is only the meta `package.json`,
`package-lock.json`, `node_modules/`, `CLAUDE.md`, `.claude/`, and possibly a leftover lock. There must be NO
`.git` directory and NO repo content. If any repo directory is still present, stop and move it first.

- [ ] **Step 2: Confirm the session is not standing inside the target**

```bash
pwd
```
Expected: the working directory is `~/Projects` or the home directory, NOT `~/Projects/cairn`. If it is
inside `~/Projects/cairn`, `cd ~/Projects` before the next step, or the removal will fail or strand the
shell.

- [ ] **Step 3: Remove the wrapper**

```bash
rm -rf ~/Projects/cairn
ls -d ~/Projects/cairn 2>/dev/null && echo "STILL PRESENT (investigate)" || echo "removed"
```
Expected: `removed`.

No commit (the wrapper was not a git repo).

---

### Task 11: Final verification

Confirm the end state across all three repos and the memory.

**Files:** none (read-only).

- [ ] **Step 1: Confirm the flat topology**

```bash
ls -d ~/Projects/cairn-cms ~/Projects/ecnordic-ski ~/Projects/907-life
ls -d ~/Projects/cairn 2>/dev/null && echo "WRAPPER STILL PRESENT" || echo "wrapper gone"
```
Expected: the three sibling repos exist and the wrapper is gone.

- [ ] **Step 2: Confirm each repo gate from its new location**

```bash
cd ~/Projects/cairn-cms && npm run check >/dev/null 2>&1 && echo "cairn-cms check OK" || echo "cairn-cms check FAIL"
cd ~/Projects/ecnordic-ski && npm run build >/dev/null 2>&1 && echo "ecnordic build OK" || echo "ecnordic build FAIL"
cd ~/Projects/907-life && npm run build >/dev/null 2>&1 && echo "907 build OK" || echo "907 build FAIL"
```
Expected: all three report OK. A fuller gate already ran in Tasks 4 to 6, so this is the post-teardown
re-confirmation.

- [ ] **Step 3: Confirm the memory loads at the new keys**

```bash
for k in -home-glw907-Projects-cairn-cms -home-glw907-Projects-ecnordic-ski -home-glw907-Projects-907-life; do
  echo "$k: $(ls ~/.claude/projects/$k/memory/*.md 2>/dev/null | wc -l) files, MEMORY.md $( [ -f ~/.claude/projects/$k/memory/MEMORY.md ] && echo present || echo MISSING)"
done
```
Expected: each key holds its consolidated memories with a present `MEMORY.md`.

- [ ] **Step 4: Confirm the sites resolve cairn-cms from the registry**

```bash
for s in ecnordic-ski 907-life; do
  echo "$s: $(node -e "console.log(require('$HOME/Projects/$s/node_modules/@glw907/cairn-cms/package.json').version)")"
  ls -la ~/Projects/$s/node_modules/@glw907/cairn-cms | head -1
done
```
Expected: each prints a published version (`0.24.0` or lower per its range) and the path is a real directory,
not a symlink into a workspace.

- [ ] **Step 5: Write the post-mortem**

Append a post-mortem to this plan file (now at `~/Projects/cairn-cms/docs/superpowers/plans/`) recording what
moved, the verification evidence, the memory consolidation result (counts before and after, any dedup or
obsolete deletions), whether the `memory:` agent feature was confirmed and applied, and any deviation. Then
update `~/Projects/cairn-cms/docs/STATUS.md` if anything material changed. Commit in cairn-cms:
```bash
cd ~/Projects/cairn-cms && git add docs/superpowers/plans/2026-06-04-workspace-flatten-and-claude-infra.md docs/STATUS.md
git commit -m "Record the workspace-flatten post-mortem"
```

---

## Self-review notes

- **Spec coverage.** Workstream 1 (move and decouple) is Tasks 2, 4, 5, 6, 10. Workstream 2 (memory) is
  Task 7. Workstream 3 (config and best-practice alignment) is Tasks 3, 8, 9. Verification is Tasks 1 and 11.
  Font removal is Task 2. The runbook retirement and feedback relocation are Task 3. Every spec section maps
  to a task.
- **Sequencing safety.** The destructive teardown (Task 10) runs last, behind a dry-run and a `pwd` check,
  and the plan's header pins the executing session to `~/Projects` so deleting `~/Projects/cairn` cannot
  strand the shell. Every prior step is reversible by moving a directory or a memory file back.
- **Registry resolution.** Tasks 4 and 5 verify the sites resolve a published cairn-cms version and carry an
  explicit fallback (`rm package-lock.json && npm install`) for the case where a committed lock pins an
  unpublished version from the workspace symlink era.
- **No placeholders.** Each step carries the exact command and the expected result. The two judgment-bound
  steps (the memory dedup in Task 7 Step 3, the optional agent feature in Task 9) state the decision rule and
  the verification rather than a guess.
- **Memory routing is explicit.** Task 7 names every source key, the routing rule, the collisions to resolve
  by hand, and the obsolete entries to delete, so the executor sorts by the table rather than re-deriving it.

## Execution handoff

This is a stateful filesystem operation, so the recommended method is inline execution with
`superpowers:executing-plans` in a fresh session launched from `~/Projects`, not subagent-driven. Launch the
session from `~/Projects` (not inside `~/Projects/cairn/`), since Task 10 deletes that directory. Read this
plan into context at the start. It moves with cairn-cms during Task 6, but an inline executor holds it in
context, so the path change does not interrupt the run.

---

## Post-mortem (2026-06-04, executed inline with executing-plans)

The plan ran end to end in one session launched from `~/Projects`. All eleven tasks landed.

### What moved

The three repos are now standalone siblings under `~/Projects/`: `cairn-cms`, `ecnordic-ski`, and
`907-life`. A plain `mv` carried each repo's `.git`, `.claude`, and untracked files, so history and
config survived. The `~/Projects/cairn/` wrapper (its meta `package.json`, `node_modules`, lockfile,
`CLAUDE.md`, and `.claude/`) was deleted last, behind a dry-run that confirmed no `.git` remained.

### Verification evidence

- **Topology:** the three sibling repos exist and the wrapper is gone.
- **Gates from the new locations:** cairn-cms `npm run check` 0 errors 0 warnings and `npm test`
  exit 0 (113 files, 655 tests); ecnordic `npm run check` 0/0 and `npm run build` exit 0; 907
  `npm run check` 0/0 and `npm run build` exit 0. All re-confirmed after the wrapper teardown.
- **Registry resolution:** ecnordic resolves `@glw907/cairn-cms` `0.21.0` and 907 resolves `0.24.0`,
  each a real directory in the site's own `node_modules`, not a workspace symlink. Both lockfiles
  were untouched by the move, so no relock was needed.

### Memory consolidation

The per-project memory moved to the working-directory keys. Counts before: meta key 36 memories,
`cairn-cairn-cms` 13, `cairn-907-life` 1, `ecnordic-ski` 12, `907-life` 8. After: the `cairn-cms`
key holds 45 memories, `ecnordic-ski` 13, `907-life` 9, each with a rebuilt `MEMORY.md` at full
one-pointer-per-memory parity. The three drained source keys (`-cairn`, `-cairn-cairn-cms`,
`-cairn-907-life`) are emptied.

Judgment calls resolved by hand:
- `cairn-rebuild-initiative.md` collided. The meta key held a large, stale progress log (it
  described Plan 01 as the latest work and named the `rebuild` worktree); the `cairn-cairn-cms` key
  held a concise pointer that had intentionally moved status to `docs/STATUS.md` on 2026-05-30. Kept
  the pointer, discarded the stale log.
- `subagent-model-strategy.md` and `subagent-model-assignment.md` cover different facets (the
  decision philosophy versus the per-agent assignment), so both were kept. The strategy memory's
  mechanism paragraph was stale (it claimed `.bashrc` forced sonnet and a workspace `settings.json`
  restored `inherit`); it was rewritten to the current reality, where `.bashrc` sets `inherit`
  directly and there is no workspace.
- `cairn-types-node-hoist-gotcha.md` was updated. Its prescribed fix (restore the workspace hoist)
  is obsolete, so it now records the permanent fix applied this pass.
- `workspace-symlink-and-next-pass.md` and `cairn-symlink-dev-mechanics.md` were deleted as
  obsolete. `907-cairn-workspace-orientation.md` was rewritten and renamed to
  `907-cairn-orientation.md` for the standalone path, keeping its Pass 16/17 roadmap.
- All migration-caused dangling wikilinks were repaired (the deleted symlink memories and the
  cross-key links to the routed ecnordic and 907 memories). The remaining unresolved links are
  pre-existing danglers and false positives (a `[[send_email]]` TOML binding, literal `[[wikilink]]`
  examples), out of scope.

### The `memory:` agent feature (Task 9)

Verified against the official subagents documentation (updated 2026-06-03) via the
`claude-code-guide` agent: `memory:` is a real, supported subagent frontmatter field on Claude Code
2.1.162, accepting `user`, `project`, or `local`. The verification surfaced a caveat the source
report missed: setting `memory:` force-enables Read, Write, and Edit on the agent. The four reviewer
agents are deliberately read-only, so applying it would break that posture. Applied `memory: project`
to `cairn-implementer` only (it already has Write/Edit) with a memory-maintenance instruction in its
body, and skipped the four reviewers. The change lives in the dotfiles checkout
(`~/.dotfiles/claude/.claude/agents/`) and takes effect at the next session start. The Opus 4.8 tools
(`/fast`, `ultracode` with `/workflows`, the effort levels) and `.claude/rules/*.md` with `paths:`
frontmatter remain available levers, with no change required today.

### Deviations from the plan

- **`@types/node` (Tasks 4 and 5).** Both sites' `npm run check` failed standalone with
  "Cannot find module 'node:fs'" errors in their test files. The meta-workspace root had hoisted
  `@types/node` (pulled in transitively, never declared) into a shared `node_modules`, where each
  site's `svelte-check` resolved it. Standalone, that crutch is gone. The fix was to declare
  `@types/node` (`^24`, matching the Node 24 runtime) as a devDependency in each site (ecnordic
  `b3207ea`, 907 `a5fae78`). A memory already documented this hoist gotcha; its workspace-restore fix
  was obsolete, so it was updated to the permanent fix.
- **Stale doc facts.** The meta `CLAUDE.md` and the functional spec both predate the `0.9.0`
  editor swap and describe a Carta editor; the user flagged it. The current editor is CodeMirror 6
  behind the `MarkdownEditor` seam. The new `cairn-cms/CLAUDE.md` and the refreshed `README.md` carry
  the correct facts. The lesson: derive durable orientation from the live repo and `STATUS.md`, not
  from the spec or the meta `CLAUDE.md`, both of which predate later passes.
- **Broken-paths sweep (user request, mid-run).** A full sweep confirmed zero old-location
  references in any operational file (code, CI workflows, `wrangler` config, `package.json`) across
  the three repos, so they are fully operational from the new locations. The durable, forward-facing
  docs were refreshed: the front-door `README.md` (it was a `0.4.x` artifact describing Carta,
  better-auth, drizzle peers, and the meta-workspace), all three `CLAUDE.md` files, both site
  `.claude/rules/development-workflow.md` files, and the STATUS top orientation. The superseded
  `PLAN.md` and `ARCHITECTURE.md` (already labeled history in `CLAUDE.md` and `README.md`), the
  dated and archived executed-plan files, and STATUS rolling history keep their original paths as
  point-in-time records.

### Follow-ups

- The sites' own `docs/STATUS.md` and `docs/architecture.md` still describe the meta-workspace and
  use `../cairn-cms` relative paths. Those paths resolve (the repos remain siblings), and the docs
  are each site's own rolling record, so a future `site-pass` should refresh them rather than this
  infra pass.
- The `cairn-implementer` agent body still carries a stale `carta-md` client-only note and a
  `rebuild`-branch assumption; both predate the CodeMirror swap and the merge to `main`. A future
  agent-tooling pass should refresh them in the dotfiles checkout.
